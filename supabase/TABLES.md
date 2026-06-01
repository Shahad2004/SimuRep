# SimuRep — Supabase tables and attributes

Source: `migrations/001_initial_schema.sql` (+ `002_seed_builtin_scenarios.sql` for built-in scenario data).

---

## Custom enums

| Enum | Values |
|------|--------|
| `user_role` | `student`, `instructor` |
| `lab_template_id` | `strategy-planning`, `production-planning`, `line-balancing` |
| `lab_status` | `draft`, `active` |
| `progress_level` | `joined`, `level1_active`, `level1_complete`, `level2_active`, `level2_complete`, `waiting_l3`, `level3_active`, `level3_complete` |
| `level3_session_status` | `idle`, `waiting`, `live`, `ended` |
| `scenario_difficulty` | `intro`, `standard`, `advanced`, `world_cup` |
| `nashama_rank` | `Factory Trainee`, `Nashama Line Coordinator`, `Production Supervisor`, `Lean Manufacturing Specialist`, `Nashama Industrial Engineering Expert` |

---

## `auth.users` (Supabase Auth)

Managed by Supabase Auth, not in `001_initial_schema.sql`. Linked from `profiles.id`.

| Column | Type | Notes |
|--------|------|--------|
| `id` | UUID | Primary key |
| `email` | text | |
| … | | Other Auth columns (see Supabase docs) |

---

## `profiles`

Extends `auth.users` for app users.

| Column | Type | Constraints / default |
|--------|------|------------------------|
| `id` | UUID | PK, FK → `auth.users(id)` ON DELETE CASCADE |
| `name` | TEXT | NOT NULL |
| `email` | TEXT | NOT NULL, UNIQUE |
| `role` | `user_role` | NOT NULL, default `student` |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `NOW()` |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default `NOW()` |

---

## `scenarios`

Game / lab scenario definitions.

| Column | Type | Constraints / default |
|--------|------|------------------------|
| `id` | UUID | PK, default `gen_random_uuid()` |
| `scenario_name` | TEXT | NOT NULL |
| `template_id` | `lab_template_id` | NOT NULL, default `line-balancing` |
| `cycle_time_sec` | INTEGER | NOT NULL, CHECK > 0 |
| `workstation_cost_coins` | INTEGER | NOT NULL, default 100 |
| `difficulty` | `scenario_difficulty` | NOT NULL, default `standard` |
| `title` | TEXT | NOT NULL |
| `product_name` | TEXT | |
| `context` | TEXT | |
| `objectives` | TEXT | |
| `analysis_guidance` | TEXT | |
| `key_metrics` | JSONB | NOT NULL, default `[]` |
| `production_planning` | JSONB | `{ H, D, S, pattern }` |
| `is_builtin` | BOOLEAN | NOT NULL, default FALSE |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `NOW()` |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default `NOW()` |

---

## `scenario_tasks`

Tasks belonging to a scenario.

| Column | Type | Constraints / default |
|--------|------|------------------------|
| `id` | UUID | PK, default `gen_random_uuid()` |
| `scenario_id` | UUID | NOT NULL, FK → `scenarios(id)` ON DELETE CASCADE |
| `task_id` | TEXT | NOT NULL (e.g. `t_cut_panels`) |
| `task_name` | TEXT | NOT NULL |
| `duration_sec` | INTEGER | NOT NULL, CHECK > 0 |
| `category` | TEXT | e.g. Cutting, Sewing |
| `sequence_order` | INTEGER | NOT NULL, default 1 |
| | | UNIQUE (`scenario_id`, `task_id`) |

---

## `task_precedence`

Task dependency rules per scenario.

| Column | Type | Constraints / default |
|--------|------|------------------------|
| `id` | UUID | PK, default `gen_random_uuid()` |
| `scenario_id` | UUID | NOT NULL, FK → `scenarios(id)` ON DELETE CASCADE |
| `task_id` | TEXT | NOT NULL |
| `depends_on_task_id` | TEXT | NOT NULL |
| | | UNIQUE (`scenario_id`, `task_id`, `depends_on_task_id`) |

---

## `classes`

Instructor organizational groups.

| Column | Type | Constraints / default |
|--------|------|------------------------|
| `id` | UUID | PK, default `gen_random_uuid()` |
| `instructor_id` | UUID | NOT NULL, FK → `profiles(id)` ON DELETE CASCADE |
| `name` | TEXT | NOT NULL |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `NOW()` |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default `NOW()` |

---

## `labs`

Instructor-created lab + 6-digit PIN.

| Column | Type | Constraints / default |
|--------|------|------------------------|
| `id` | UUID | PK, default `gen_random_uuid()` |
| `class_id` | UUID | NOT NULL, FK → `classes(id)` ON DELETE CASCADE |
| `instructor_id` | UUID | NOT NULL, FK → `profiles(id)` ON DELETE CASCADE |
| `scenario_id` | UUID | FK → `scenarios(id)` ON DELETE SET NULL |
| `template_id` | `lab_template_id` | NOT NULL |
| `session_pin` | CHAR(6) | NOT NULL, UNIQUE, 6 digits |
| `status` | `lab_status` | NOT NULL, default `draft` |
| `feedback_from_instructor` | TEXT | |
| `lab_config` | JSONB | NOT NULL, default `{}` (scenario, lineBalancing, productionPlanning) |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `NOW()` |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default `NOW()` |

---

## `lab_sessions`

Runtime multiplayer session per lab.

| Column | Type | Constraints / default |
|--------|------|------------------------|
| `id` | UUID | PK, default `gen_random_uuid()` |
| `lab_id` | UUID | NOT NULL, UNIQUE, FK → `labs(id)` ON DELETE CASCADE |
| `session_pin` | CHAR(6) | NOT NULL, UNIQUE, FK → `labs(session_pin)` ON DELETE CASCADE |
| `instructor_id` | UUID | NOT NULL, FK → `profiles(id)` ON DELETE CASCADE |
| `scenario_id` | UUID | FK → `scenarios(id)` ON DELETE SET NULL |
| `level3_status` | `level3_session_status` | NOT NULL, default `idle` |
| `level3_started` | BOOLEAN | NOT NULL, default FALSE |
| `level3_started_at` | TIMESTAMPTZ | |
| `level3_ended_at` | TIMESTAMPTZ | |
| `current_stage` | TEXT | default `level1` |
| `total_students` | INTEGER | NOT NULL, default 0 |
| `waiting_students` | INTEGER | NOT NULL, default 0 |
| `active_students` | INTEGER | NOT NULL, default 0 |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `NOW()` |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default `NOW()` |

---

## `student_enrollments`

Student joined a lab via PIN.

| Column | Type | Constraints / default |
|--------|------|------------------------|
| `id` | UUID | PK, default `gen_random_uuid()` |
| `lab_id` | UUID | NOT NULL, FK → `labs(id)` ON DELETE CASCADE |
| `session_pin` | CHAR(6) | NOT NULL, FK → `labs(session_pin)` ON DELETE CASCADE |
| `student_id` | UUID | FK → `profiles(id)` ON DELETE SET NULL |
| `player_id` | TEXT | NOT NULL (anonymous browser id until auth) |
| `display_name` | TEXT | NOT NULL |
| `class_id` | UUID | NOT NULL, FK → `classes(id)` ON DELETE CASCADE |
| `joined_at` | TIMESTAMPTZ | NOT NULL, default `NOW()` |
| | | UNIQUE (`lab_id`, `player_id`) |

---

## `student_progress`

Per-student progress for one lab (all levels).

| Column | Type | Constraints / default |
|--------|------|------------------------|
| `id` | UUID | PK, default `gen_random_uuid()` |
| `enrollment_id` | UUID | NOT NULL, UNIQUE, FK → `student_enrollments(id)` ON DELETE CASCADE |
| `student_id` | UUID | FK → `profiles(id)` ON DELETE SET NULL |
| `lab_id` | UUID | NOT NULL, FK → `labs(id)` ON DELETE CASCADE |
| `session_pin` | CHAR(6) | NOT NULL, FK → `labs(session_pin)` ON DELETE CASCADE |
| `player_id` | TEXT | NOT NULL |
| `display_name` | TEXT | NOT NULL |
| `current_level` | SMALLINT | NOT NULL, default 1, CHECK 1–3 |
| `progress` | `progress_level` | NOT NULL, default `joined` |
| `level1_completed` | BOOLEAN | NOT NULL, default FALSE |
| `level2_completed` | BOOLEAN | NOT NULL, default FALSE |
| `level3_completed` | BOOLEAN | NOT NULL, default FALSE |
| `is_waiting_level3` | BOOLEAN | NOT NULL, default FALSE |
| `balance_efficiency_pct` | NUMERIC(5,2) | Level 1 / 3 |
| `idle_time_sec` | NUMERIC(10,2) | Level 1 |
| `workstation_count` | INTEGER | Level 1 |
| `efficiency_pct` | NUMERIC(5,2) | Level 1 |
| `min_stations` | INTEGER | Level 1 |
| `overloaded_stations` | INTEGER | Level 1 |
| `all_tasks_assigned` | BOOLEAN | Level 1 |
| `level1_assignment` | JSONB | Level 1 snapshot |
| `flow_efficiency_pct` | NUMERIC(5,2) | Level 2 |
| `transportation_waste` | INTEGER | Level 2 |
| `backtracking_count` | INTEGER | Level 2 |
| `total_transfers` | INTEGER | Level 2 |
| `flow_station_path` | INTEGER[] | Level 2 |
| `final_score` | NUMERIC(8,2) | Level 3 |
| `idle_time_reduction_pct` | NUMERIC(5,2) | Level 3 |
| `waste_reduction_pct` | NUMERIC(5,2) | Level 3 |
| `workstation_score_pct` | NUMERIC(5,2) | Level 3 |
| `speed_score_pct` | NUMERIC(5,2) | Level 3 |
| `engineering_rank` | `nashama_rank` | Level 3 |
| `completion_time_sec` | INTEGER | Level 3 |
| `leaderboard_position` | INTEGER | Level 3 |
| `rank` | INTEGER | Level 3 (1, 2, 3…) |
| `score` | NUMERIC(8,2) | Level 3 live total |
| `completion_time` | TIMESTAMPTZ | Level 3 |
| `last_seen_at` | TIMESTAMPTZ | NOT NULL, default `NOW()` |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `NOW()` |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default `NOW()` |

---

## `level_submissions`

Audit trail for each level submit (API).

| Column | Type | Constraints / default |
|--------|------|------------------------|
| `id` | UUID | PK, default `gen_random_uuid()` |
| `student_progress_id` | UUID | NOT NULL, FK → `student_progress(id)` ON DELETE CASCADE |
| `lab_id` | UUID | NOT NULL, FK → `labs(id)` ON DELETE CASCADE |
| `session_pin` | CHAR(6) | NOT NULL |
| `player_id` | TEXT | NOT NULL |
| `level` | SMALLINT | NOT NULL, CHECK 1–3 |
| `metrics` | JSONB | NOT NULL, default `{}` |
| `assignment_snapshot` | JSONB | |
| `recommended_solution` | JSONB | backend optimal layout |
| `submitted_at` | TIMESTAMPTZ | NOT NULL, default `NOW()` |

---

## `session_players`

Real-time presence / live scores (Realtime-friendly).

| Column | Type | Constraints / default |
|--------|------|------------------------|
| `id` | UUID | PK, default `gen_random_uuid()` |
| `lab_session_id` | UUID | NOT NULL, FK → `lab_sessions(id)` ON DELETE CASCADE |
| `lab_id` | UUID | NOT NULL, FK → `labs(id)` ON DELETE CASCADE |
| `session_pin` | CHAR(6) | NOT NULL |
| `player_id` | TEXT | NOT NULL |
| `display_name` | TEXT | NOT NULL |
| `progress` | `progress_level` | NOT NULL, default `joined` |
| `total_score` | NUMERIC(8,2) | |
| `balance_efficiency_pct` | NUMERIC(5,2) | |
| `flow_efficiency_pct` | NUMERIC(5,2) | |
| `idle_time_reduction_pct` | NUMERIC(5,2) | |
| `waste_reduction_pct` | NUMERIC(5,2) | |
| `workstation_score_pct` | NUMERIC(5,2) | |
| `speed_score_pct` | NUMERIC(5,2) | |
| `engineering_rank` | `nashama_rank` | |
| `completion_seconds` | INTEGER | |
| `finished_at` | TIMESTAMPTZ | |
| `joined_at` | TIMESTAMPTZ | NOT NULL, default `NOW()` |
| `last_seen_at` | TIMESTAMPTZ | NOT NULL, default `NOW()` |
| | | UNIQUE (`lab_session_id`, `player_id`) |

---

## `leaderboard_entries`

Final / cached rankings per lab.

| Column | Type | Constraints / default |
|--------|------|------------------------|
| `id` | UUID | PK, default `gen_random_uuid()` |
| `lab_id` | UUID | NOT NULL, FK → `labs(id)` ON DELETE CASCADE |
| `session_pin` | CHAR(6) | NOT NULL |
| `player_id` | TEXT | NOT NULL |
| `display_name` | TEXT | NOT NULL |
| `position` | INTEGER | NOT NULL |
| `total_score` | NUMERIC(8,2) | NOT NULL |
| `balance_efficiency_pct` | NUMERIC(5,2) | |
| `flow_efficiency_pct` | NUMERIC(5,2) | |
| `waste_reduction_pct` | NUMERIC(5,2) | |
| `completion_seconds` | INTEGER | |
| `engineering_rank` | `nashama_rank` | |
| `submitted_at` | TIMESTAMPTZ | NOT NULL, default `NOW()` |
| | | UNIQUE (`lab_id`, `player_id`) |

---

## `class_analytics`

Optional cached aggregates for instructor dashboard.

| Column | Type | Constraints / default |
|--------|------|------------------------|
| `id` | UUID | PK, default `gen_random_uuid()` |
| `lab_id` | UUID | NOT NULL, FK → `labs(id)` ON DELETE CASCADE |
| `class_id` | UUID | NOT NULL, FK → `classes(id)` ON DELETE CASCADE |
| `computed_at` | TIMESTAMPTZ | NOT NULL, default `NOW()` |
| `avg_efficiency_pct` | NUMERIC(5,2) | |
| `avg_idle_time_sec` | NUMERIC(10,2) | |
| `avg_flow_efficiency_pct` | NUMERIC(5,2) | |
| `avg_transportation_waste` | NUMERIC(8,2) | |
| `overload_frequency_pct` | NUMERIC(5,2) | |
| `common_mistakes` | JSONB | default `[]` |
| `leaderboard_snapshot` | JSONB | default `[]` |
| | | UNIQUE (`lab_id`, `computed_at`) |

---

## Table list (quick reference)

| # | Table |
|---|--------|
| 1 | `profiles` |
| 2 | `scenarios` |
| 3 | `scenario_tasks` |
| 4 | `task_precedence` |
| 5 | `classes` |
| 6 | `labs` |
| 7 | `lab_sessions` |
| 8 | `student_enrollments` |
| 9 | `student_progress` |
| 10 | `level_submissions` |
| 11 | `session_players` |
| 12 | `leaderboard_entries` |
| 13 | `class_analytics` |

Plus Supabase **`auth.users`** (not in `public` schema).

---

## Related files

- `migrations/001_initial_schema.sql` — DDL source of truth
- `migrations/002_seed_builtin_scenarios.sql` — seed data for built-in scenarios
- `SCHEMA.md` — architecture, mappings, and setup notes
