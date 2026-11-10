-- Private, practice-only Interactive Games run history.
-- These client-reported exercises are NOT official grades or evidence of mastery.
-- Free-text responses are deliberately not collected; only glossary UUIDs and
-- first-attempt outcomes are stored for targeted follow-up practice.
CREATE TABLE IF NOT EXISTS public.interactive_game_practice_runs (
  id uuid PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  course_code text NOT NULL CHECK (course_code IN ('9618', '0478')),
  game_kind text NOT NULL CHECK (game_kind IN (
    'match-up','flash-cards','speaking-cards','spin-wheel',
    'open-box','quiz','find-the-match','anagram'
  )),
  selected_scopes jsonb NOT NULL CHECK (jsonb_typeof(selected_scopes) = 'array'),
  attempts jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(attempts) = 'array'),
  correct_first_attempts integer NOT NULL DEFAULT 0 CHECK (correct_first_attempts BETWEEN 0 AND 500),
  incorrect_first_attempts integer NOT NULL DEFAULT 0 CHECK (incorrect_first_attempts BETWEEN 0 AND 500),
  reviewed_count integer NOT NULL DEFAULT 0 CHECK (reviewed_count BETWEEN 0 AND 500),
  duration_seconds integer NOT NULL DEFAULT 0 CHECK (duration_seconds BETWEEN 0 AND 86400),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (jsonb_array_length(attempts) <= 500),
  CHECK (jsonb_array_length(selected_scopes) BETWEEN 1 AND 100)
);
CREATE INDEX IF NOT EXISTS interactive_game_practice_student_recent_idx
  ON public.interactive_game_practice_runs (student_id, course_code, created_at DESC);
ALTER TABLE public.interactive_game_practice_runs ENABLE ROW LEVEL SECURITY;
-- Access is exclusively via the authenticated application backend's trusted
-- PostgreSQL connection. No direct Supabase Data API access for public roles.
REVOKE ALL ON public.interactive_game_practice_runs FROM PUBLIC, anon, authenticated;
COMMENT ON TABLE public.interactive_game_practice_runs IS
  'Self-reported formative practice history, never official assessment or CEFR/mastery evidence.';
