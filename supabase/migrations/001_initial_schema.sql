-- =============================================================================
-- SimuRep / Virtual Lab — Supabase (PostgreSQL) initial schema
-- Run in: Supabase Dashboard → SQL Editor → New query → Paste → Run
-- =============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- ENUMS (match frontend types in src/app/types/)
-- -----------------------------------------------------------------------------

CREATE TYPE user_role AS ENUM ('student', 'instructor');

CREATE TYPE lab_template_id AS ENUM (
  'strategy-planning',
  'production-planning',
  'line-balancing'
);

CREATE TYPE lab_status AS ENUM ('draft', 'active');

CREATE TYPE progress_level AS ENUM (
  'joined',
  'level1_active',
  'level1_complete',
  'level2_active',
  'level2_complete',
  'waiting_l3',
  'level3_active',
  'level3_complete'
);

CREATE TYPE level3_session_status AS ENUM ('idle', 'waiting', 'live', 'ended');

CREATE TYPE scenario_difficulty AS ENUM ('intro', 'standard', 'advanced', 'world_cup');

CREATE TYPE nashama_rank AS ENUM (
  'Factory Trainee',
  'Nashama Line Coordinator',
  'Production Supervisor',
  'Lean Manufacturing Specialist',
  'Nashama Industrial Engineering Expert'
);

-- -----------------------------------------------------------------------------
-- A) USERS — extends Supabase Auth (auth.users)
-- -----------------------------------------------------------------------------

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role user_role NOT NULL DEFAULT 'student',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_role ON public.profiles (role);
CREATE INDEX idx_profiles_email ON public.profiles (email);

-- Auto-create profile on signup (optional — enable when Auth is wired)
CREATE OR REPLACE FUNCTION public.handle_new_user ()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'student')
  );
  RETURN NEW;
END;
$$;

-- Uncomment when using Supabase Auth:
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- -----------------------------------------------------------------------------
-- D) SCENARIOS — tasks, cycle time, precedence (game content)
-- -----------------------------------------------------------------------------

CREATE TABLE public.scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_name TEXT NOT NULL,
  template_id lab_template_id NOT NULL DEFAULT 'line-balancing',
  cycle_time_sec INTEGER NOT NULL CHECK (cycle_time_sec > 0),
  workstation_cost_coins INTEGER NOT NULL DEFAULT 100,
  difficulty scenario_difficulty NOT NULL DEFAULT 'standard',
  -- Narrative / UI (maps to ScenarioDefinition)
  title TEXT NOT NULL,
  product_name TEXT,
  context TEXT,
  objectives TEXT,
  analysis_guidance TEXT,
  key_metrics JSONB NOT NULL DEFAULT '[]'::JSONB,
  -- Template-specific params
  production_planning JSONB, -- { H, D, S, pattern }
  is_builtin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_scenarios_template ON public.scenarios (template_id);

CREATE TABLE public.scenario_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES public.scenarios (id) ON DELETE CASCADE,
  task_id TEXT NOT NULL, -- e.g. t_cut_panels, n3_fabric
  task_name TEXT NOT NULL,
  duration_sec INTEGER NOT NULL CHECK (duration_sec > 0),
  category TEXT, -- Cutting, Sewing, Quality Check, Packing
  sequence_order INTEGER NOT NULL DEFAULT 1,
  UNIQUE (scenario_id, task_id)
);

CREATE INDEX idx_scenario_tasks_scenario ON public.scenario_tasks (scenario_id, sequence_order);

CREATE TABLE public.task_precedence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES public.scenarios (id) ON DELETE CASCADE,
  task_id TEXT NOT NULL,
  depends_on_task_id TEXT NOT NULL,
  UNIQUE (scenario_id, task_id, depends_on_task_id)
);

CREATE INDEX idx_task_precedence_scenario ON public.task_precedence (scenario_id);

-- -----------------------------------------------------------------------------
-- INSTRUCTOR CLASSES (organizational — maps to InstructorClass)
-- -----------------------------------------------------------------------------

CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_classes_instructor ON public.classes (instructor_id);

-- -----------------------------------------------------------------------------
-- LABS — instructor-created lab + PIN (maps to Lab in classes.ts)
-- -----------------------------------------------------------------------------

CREATE TABLE public.labs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes (id) ON DELETE CASCADE,
  instructor_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  scenario_id UUID REFERENCES public.scenarios (id) ON DELETE SET NULL,
  template_id lab_template_id NOT NULL,
  session_pin CHAR(6) NOT NULL UNIQUE, -- 6-digit PIN students enter
  status lab_status NOT NULL DEFAULT 'draft',
  feedback_from_instructor TEXT,
  -- Full lab config snapshot (scenario + lineBalancing + productionPlanning)
  lab_config JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT labs_pin_format CHECK (session_pin ~ '^[0-9]{6}$')
);

CREATE INDEX idx_labs_class ON public.labs (class_id);
CREATE INDEX idx_labs_pin ON public.labs (session_pin);
CREATE INDEX idx_labs_instructor ON public.labs (instructor_id);

-- -----------------------------------------------------------------------------
-- B) LAB SESSIONS — runtime multiplayer state (maps to LabLiveSession)
-- One row per lab while students are connected; PIN = labs.session_pin
-- -----------------------------------------------------------------------------

CREATE TABLE public.lab_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id UUID NOT NULL UNIQUE REFERENCES public.labs (id) ON DELETE CASCADE,
  session_pin CHAR(6) NOT NULL UNIQUE REFERENCES public.labs (session_pin) ON DELETE CASCADE,
  instructor_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  scenario_id UUID REFERENCES public.scenarios (id) ON DELETE SET NULL,
  level3_status level3_session_status NOT NULL DEFAULT 'idle',
  level3_started BOOLEAN NOT NULL DEFAULT FALSE,
  level3_started_at TIMESTAMPTZ,
  level3_ended_at TIMESTAMPTZ,
  current_stage TEXT DEFAULT 'level1', -- level1 | level2 | level3 | ended
  -- Denormalized counters (updated by triggers or backend jobs)
  total_students INTEGER NOT NULL DEFAULT 0,
  waiting_students INTEGER NOT NULL DEFAULT 0,
  active_students INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lab_sessions_pin ON public.lab_sessions (session_pin);
CREATE INDEX idx_lab_sessions_lab ON public.lab_sessions (lab_id);

-- -----------------------------------------------------------------------------
-- STUDENT ENROLLMENTS — joined via PIN (maps to StudentJoinedEntry)
-- -----------------------------------------------------------------------------

CREATE TABLE public.student_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id UUID NOT NULL REFERENCES public.labs (id) ON DELETE CASCADE,
  session_pin CHAR(6) NOT NULL REFERENCES public.labs (session_pin) ON DELETE CASCADE,
  student_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  -- Anonymous browser player until auth is linked
  player_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  class_id UUID NOT NULL REFERENCES public.classes (id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (lab_id, player_id)
);

CREATE INDEX idx_enrollments_lab ON public.student_enrollments (lab_id);
CREATE INDEX idx_enrollments_student ON public.student_enrollments (student_id);
CREATE INDEX idx_enrollments_pin ON public.student_enrollments (session_pin);

-- -----------------------------------------------------------------------------
-- C) STUDENT PROGRESS — per student per lab (all levels)
-- -----------------------------------------------------------------------------

CREATE TABLE public.student_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL UNIQUE REFERENCES public.student_enrollments (id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  lab_id UUID NOT NULL REFERENCES public.labs (id) ON DELETE CASCADE,
  session_pin CHAR(6) NOT NULL REFERENCES public.labs (session_pin) ON DELETE CASCADE,
  player_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  current_level SMALLINT NOT NULL DEFAULT 1 CHECK (current_level BETWEEN 1 AND 3),
  progress progress_level NOT NULL DEFAULT 'joined',
  level1_completed BOOLEAN NOT NULL DEFAULT FALSE,
  level2_completed BOOLEAN NOT NULL DEFAULT FALSE,
  level3_completed BOOLEAN NOT NULL DEFAULT FALSE,
  is_waiting_level3 BOOLEAN NOT NULL DEFAULT FALSE,
  -- Level 1 metrics (balancing)
  balance_efficiency_pct NUMERIC(5, 2),
  idle_time_sec NUMERIC(10, 2),
  workstation_count INTEGER,
  efficiency_pct NUMERIC(5, 2),
  min_stations INTEGER,
  overloaded_stations INTEGER,
  all_tasks_assigned BOOLEAN,
  level1_assignment JSONB, -- { stationIds, assignment map, loads }
  -- Level 2 metrics (flow)
  flow_efficiency_pct NUMERIC(5, 2),
  transportation_waste INTEGER,
  backtracking_count INTEGER,
  total_transfers INTEGER,
  flow_station_path INTEGER[],
  -- Level 3 metrics (World Cup)
  final_score NUMERIC(8, 2),
  idle_time_reduction_pct NUMERIC(5, 2),
  waste_reduction_pct NUMERIC(5, 2),
  workstation_score_pct NUMERIC(5, 2),
  speed_score_pct NUMERIC(5, 2),
  engineering_rank nashama_rank,
  completion_time_sec INTEGER,
  leaderboard_position INTEGER,
  rank INTEGER, -- numeric rank 1, 2, 3...
  score NUMERIC(8, 2), -- alias / live total during L3
  completion_time TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_student_progress_lab ON public.student_progress (lab_id);
CREATE INDEX idx_student_progress_pin ON public.student_progress (session_pin);
CREATE INDEX idx_student_progress_waiting ON public.student_progress (lab_id, is_waiting_level3)
  WHERE is_waiting_level3 = TRUE;
CREATE INDEX idx_student_progress_leaderboard ON public.student_progress (lab_id, final_score DESC NULLS LAST);

-- -----------------------------------------------------------------------------
-- LEVEL SUBMISSIONS — audit trail (each POST /levelN/submit)
-- -----------------------------------------------------------------------------

CREATE TABLE public.level_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_progress_id UUID NOT NULL REFERENCES public.student_progress (id) ON DELETE CASCADE,
  lab_id UUID NOT NULL REFERENCES public.labs (id) ON DELETE CASCADE,
  session_pin CHAR(6) NOT NULL,
  player_id TEXT NOT NULL,
  level SMALLINT NOT NULL CHECK (level BETWEEN 1 AND 3),
  metrics JSONB NOT NULL DEFAULT '{}'::JSONB,
  assignment_snapshot JSONB,
  recommended_solution JSONB, -- backend-generated optimal layout
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_level_submissions_lab_level ON public.level_submissions (lab_id, level, submitted_at DESC);

-- -----------------------------------------------------------------------------
-- SESSION PLAYERS — real-time presence (maps to LabLivePlayer + Socket.IO room)
-- Supabase Realtime can broadcast changes on this table
-- -----------------------------------------------------------------------------

CREATE TABLE public.session_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_session_id UUID NOT NULL REFERENCES public.lab_sessions (id) ON DELETE CASCADE,
  lab_id UUID NOT NULL REFERENCES public.labs (id) ON DELETE CASCADE,
  session_pin CHAR(6) NOT NULL,
  player_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  progress progress_level NOT NULL DEFAULT 'joined',
  total_score NUMERIC(8, 2),
  balance_efficiency_pct NUMERIC(5, 2),
  flow_efficiency_pct NUMERIC(5, 2),
  idle_time_reduction_pct NUMERIC(5, 2),
  waste_reduction_pct NUMERIC(5, 2),
  workstation_score_pct NUMERIC(5, 2),
  speed_score_pct NUMERIC(5, 2),
  engineering_rank nashama_rank,
  completion_seconds INTEGER,
  finished_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (lab_session_id, player_id)
);

CREATE INDEX idx_session_players_lab ON public.session_players (lab_id);
CREATE INDEX idx_session_players_score ON public.session_players (lab_id, total_score DESC NULLS LAST);

-- -----------------------------------------------------------------------------
-- LEADERBOARD — final + cached rankings per lab session
-- -----------------------------------------------------------------------------

CREATE TABLE public.leaderboard_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id UUID NOT NULL REFERENCES public.labs (id) ON DELETE CASCADE,
  session_pin CHAR(6) NOT NULL,
  player_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  position INTEGER NOT NULL,
  total_score NUMERIC(8, 2) NOT NULL,
  balance_efficiency_pct NUMERIC(5, 2),
  flow_efficiency_pct NUMERIC(5, 2),
  waste_reduction_pct NUMERIC(5, 2),
  completion_seconds INTEGER,
  engineering_rank nashama_rank,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (lab_id, player_id)
);

CREATE INDEX idx_leaderboard_lab_position ON public.leaderboard_entries (lab_id, position);

-- -----------------------------------------------------------------------------
-- ANALYTICS SNAPSHOTS — instructor dashboard aggregates (optional cache)
-- -----------------------------------------------------------------------------

CREATE TABLE public.class_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id UUID NOT NULL REFERENCES public.labs (id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes (id) ON DELETE CASCADE,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  avg_efficiency_pct NUMERIC(5, 2),
  avg_idle_time_sec NUMERIC(10, 2),
  avg_flow_efficiency_pct NUMERIC(5, 2),
  avg_transportation_waste NUMERIC(8, 2),
  overload_frequency_pct NUMERIC(5, 2),
  common_mistakes JSONB DEFAULT '[]'::JSONB,
  leaderboard_snapshot JSONB DEFAULT '[]'::JSONB,
  UNIQUE (lab_id, computed_at)
);

-- -----------------------------------------------------------------------------
-- HELPER: refresh lab_session counters from student_progress
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.refresh_lab_session_counts (p_lab_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total INTEGER;
  v_waiting INTEGER;
  v_active INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total FROM public.student_progress WHERE lab_id = p_lab_id;
  SELECT COUNT(*) INTO v_waiting FROM public.student_progress
    WHERE lab_id = p_lab_id AND is_waiting_level3 = TRUE;
  SELECT COUNT(*) INTO v_active FROM public.student_progress
    WHERE lab_id = p_lab_id AND progress IN ('level3_active', 'level1_active', 'level2_active');

  UPDATE public.lab_sessions
  SET
    total_students = v_total,
    waiting_students = v_waiting,
    active_students = v_active,
    updated_at = NOW()
  WHERE lab_id = p_lab_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.student_progress_before_save ()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  NEW.last_seen_at := NOW();
  NEW.is_waiting_level3 := (NEW.progress = 'waiting_l3');
  IF NEW.progress IN ('level1_complete', 'level2_active', 'level2_complete', 'waiting_l3', 'level3_active', 'level3_complete') THEN
    NEW.level1_completed := TRUE;
  END IF;
  IF NEW.progress IN ('level2_complete', 'waiting_l3', 'level3_active', 'level3_complete') THEN
    NEW.level2_completed := TRUE;
  END IF;
  IF NEW.progress = 'level3_complete' THEN
    NEW.level3_completed := TRUE;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.student_progress_after_change ()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.refresh_lab_session_counts (NEW.lab_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_student_progress_before
  BEFORE INSERT OR UPDATE ON public.student_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.student_progress_before_save();

CREATE TRIGGER trg_student_progress_counts
  AFTER INSERT OR UPDATE ON public.student_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.student_progress_after_change();

-- -----------------------------------------------------------------------------
-- ROW LEVEL SECURITY (baseline — tighten per route when backend is added)
-- -----------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenario_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_precedence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.level_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_analytics ENABLE ROW LEVEL SECURITY;

-- Profiles: users read/update own row
CREATE POLICY profiles_select_own ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Scenarios: readable by all authenticated; builtin always readable
CREATE POLICY scenarios_read ON public.scenarios FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY scenario_tasks_read ON public.scenario_tasks FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY task_precedence_read ON public.task_precedence FOR SELECT TO authenticated USING (TRUE);

-- Classes: instructor owns
CREATE POLICY classes_instructor_all ON public.classes FOR ALL
  USING (instructor_id = auth.uid()) WITH CHECK (instructor_id = auth.uid());

-- Labs: instructor owns; students can read lab by PIN join (via service role or RPC)
CREATE POLICY labs_instructor_all ON public.labs FOR ALL
  USING (instructor_id = auth.uid()) WITH CHECK (instructor_id = auth.uid());

-- Lab sessions: instructor manages; students read own session
CREATE POLICY lab_sessions_instructor ON public.lab_sessions FOR ALL
  USING (instructor_id = auth.uid()) WITH CHECK (instructor_id = auth.uid());

-- Student progress: student sees own; instructor sees lab's students
CREATE POLICY student_progress_student ON public.student_progress FOR SELECT
  USING (student_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.labs l WHERE l.id = lab_id AND l.instructor_id = auth.uid()
  ));

-- Enable Realtime for multiplayer tables (run in dashboard or via API)
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.session_players;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.lab_sessions;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.student_progress;
