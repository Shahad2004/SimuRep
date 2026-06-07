-- Optional columns for API wiring (run in Supabase SQL Editor if not applied)
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS client_id TEXT;
ALTER TABLE public.session_players ADD COLUMN IF NOT EXISTS character_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_classes_instructor_client
  ON public.classes (instructor_id, client_id)
  WHERE client_id IS NOT NULL;
