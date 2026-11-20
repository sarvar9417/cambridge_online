-- Teacher-hosted, guest-joined formative quiz rooms.
-- All database access is through the trusted application API. Room PINs are
-- discovery identifiers only: participants get a separate random bearer secret.
CREATE TABLE IF NOT EXISTS public.live_quiz_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  pin text NOT NULL CHECK (pin ~ '^[0-9]{6}$'),
  course_code text NOT NULL CHECK (course_code IN ('9618','0478')),
  scopes jsonb NOT NULL CHECK (jsonb_typeof(scopes)='array'),
  questions jsonb NOT NULL CHECK (jsonb_typeof(questions)='array' AND jsonb_array_length(questions) BETWEEN 4 AND 30),
  question_seconds integer NOT NULL CHECK (question_seconds IN (10,15,20,30)),
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','active','review','finished')),
  question_index integer NOT NULL DEFAULT -1,
  question_started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS live_quiz_active_pin_idx ON public.live_quiz_rooms (pin)
  WHERE status IN ('waiting','active','review');
CREATE INDEX IF NOT EXISTS live_quiz_host_history_idx ON public.live_quiz_rooms (host_id,created_at DESC);

CREATE TABLE IF NOT EXISTS public.live_quiz_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.live_quiz_rooms(id) ON DELETE CASCADE,
  nickname text NOT NULL CHECK (length(trim(nickname)) BETWEEN 2 AND 24),
  avatar text NOT NULL CHECK (avatar IN ('🦊','🐼','🦁','🐯','🐸','🐨','🐙','🦄')),
  token_hash text NOT NULL CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  score integer NOT NULL DEFAULT 0 CHECK (score >= 0),
  streak integer NOT NULL DEFAULT 0 CHECK (streak >= 0),
  correct_count integer NOT NULL DEFAULT 0 CHECK (correct_count >= 0),
  joined_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS live_quiz_player_name_idx
  ON public.live_quiz_players(room_id,lower(nickname));
CREATE UNIQUE INDEX IF NOT EXISTS live_quiz_player_token_idx ON public.live_quiz_players(token_hash);
CREATE INDEX IF NOT EXISTS live_quiz_player_room_idx ON public.live_quiz_players(room_id);

CREATE TABLE IF NOT EXISTS public.live_quiz_answers (
  player_id uuid NOT NULL REFERENCES public.live_quiz_players(id) ON DELETE CASCADE,
  question_index integer NOT NULL CHECK (question_index BETWEEN 0 AND 29),
  choice_index integer NOT NULL CHECK (choice_index BETWEEN 0 AND 3),
  correct boolean NOT NULL,
  points integer NOT NULL CHECK (points BETWEEN 0 AND 1000),
  elapsed_ms integer NOT NULL CHECK (elapsed_ms >= 0),
  answered_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id,question_index)
);

ALTER TABLE public.live_quiz_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_quiz_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_quiz_answers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.live_quiz_rooms, public.live_quiz_players, public.live_quiz_answers FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
    REVOKE ALL ON public.live_quiz_rooms, public.live_quiz_players, public.live_quiz_answers FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
    REVOKE ALL ON public.live_quiz_rooms, public.live_quiz_players, public.live_quiz_answers FROM authenticated;
  END IF;
END $$;
COMMENT ON TABLE public.live_quiz_rooms IS 'Formative teacher-hosted quiz rooms; answers and keys are private to the trusted server.';
COMMENT ON TABLE public.live_quiz_players IS 'Nickname-based guest participants; access-token hashes, never raw tokens.';
COMMENT ON TABLE public.live_quiz_answers IS 'One immutable first submission per player and question; missed questions derive from absent rows.';
