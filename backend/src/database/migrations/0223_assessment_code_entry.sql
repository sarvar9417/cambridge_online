-- 0223: Guest entry by six-digit classroom test code, with server-only answers.
-- Existing Assessment Center tests and enrolled student attempts are preserved.
CREATE TABLE IF NOT EXISTS public.assessment_code_sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 test_id uuid NOT NULL REFERENCES public.assessment_center_tests(id) ON DELETE CASCADE,
 school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
 host_id uuid NOT NULL REFERENCES public.users(id),
 code text NOT NULL UNIQUE CHECK (code ~ '^[0-9]{6}$'),
 status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
 closed_at timestamptz
);
CREATE INDEX IF NOT EXISTS assessment_code_sessions_host_idx ON public.assessment_code_sessions(host_id,created_at DESC);
CREATE TABLE IF NOT EXISTS public.assessment_code_players (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 session_id uuid NOT NULL REFERENCES public.assessment_code_sessions(id) ON DELETE CASCADE,
 nickname text NOT NULL CHECK (char_length(btrim(nickname)) BETWEEN 2 AND 48),
 token_hash text NOT NULL UNIQUE CHECK (length(token_hash)=64),
 started_at timestamptz NOT NULL DEFAULT now(),
 deadline_at timestamptz NOT NULL,
 submitted_at timestamptz,
 score integer,
 max_score integer
);
CREATE UNIQUE INDEX IF NOT EXISTS assessment_code_players_name_idx
 ON public.assessment_code_players(session_id,lower(btrim(nickname)));
CREATE INDEX IF NOT EXISTS assessment_code_players_session_idx ON public.assessment_code_players(session_id,started_at);
CREATE TABLE IF NOT EXISTS public.assessment_code_answers (
 player_id uuid NOT NULL REFERENCES public.assessment_code_players(id) ON DELETE CASCADE,
 question_id uuid NOT NULL REFERENCES public.assessment_center_questions(id) ON DELETE CASCADE,
 choice_index integer NOT NULL CHECK (choice_index BETWEEN 0 AND 3),
 answered_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(player_id,question_id)
);
ALTER TABLE public.assessment_code_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_code_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_code_answers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.assessment_code_sessions,public.assessment_code_players,
 public.assessment_code_answers FROM PUBLIC;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
   REVOKE ALL ON public.assessment_code_sessions,public.assessment_code_players,
     public.assessment_code_answers FROM anon;
 END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
   REVOKE ALL ON public.assessment_code_sessions,public.assessment_code_players,
     public.assessment_code_answers FROM authenticated;
 END IF;
END $$;
COMMENT ON TABLE public.assessment_code_players IS
 'Guest names and SHA256 token hashes: never expose tokens or answer keys except through trusted server endpoints.';

