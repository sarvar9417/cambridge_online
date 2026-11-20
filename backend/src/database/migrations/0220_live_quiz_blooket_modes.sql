-- Source-backed classroom quiz expansion. The migration is intentionally additive:
-- previously played Classic rooms and their immutable answer rows remain valid.
ALTER TABLE public.live_quiz_rooms
  ADD COLUMN IF NOT EXISTS game_mode text NOT NULL DEFAULT 'classic'
    CHECK (game_mode IN ('classic','treasure')),
  ADD COLUMN IF NOT EXISTS duration_seconds integer NOT NULL DEFAULT 420
    CHECK (duration_seconds BETWEEN 60 AND 1800),
  ADD COLUMN IF NOT EXISTS ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS allow_late_join boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_correctness boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS random_names boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS treasure_goal integer NOT NULL DEFAULT 10000
    CHECK (treasure_goal BETWEEN 1000 AND 1000000),
  ADD COLUMN IF NOT EXISTS question_order text NOT NULL DEFAULT 'random'
    CHECK (question_order IN ('random','ordered','mastery')),
  ADD COLUMN IF NOT EXISTS incorrect_penalty_seconds integer NOT NULL DEFAULT 2
    CHECK (incorrect_penalty_seconds IN (0,2,5,10)),
  ADD COLUMN IF NOT EXISTS dragon_pool integer NOT NULL DEFAULT 0 CHECK (dragon_pool >= 0);

ALTER TABLE public.live_quiz_players
  ADD COLUMN IF NOT EXISTS next_turn integer NOT NULL DEFAULT 0 CHECK (next_turn >= 0),
  ADD COLUMN IF NOT EXISTS question_started_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS blocked_until timestamptz;

CREATE TABLE IF NOT EXISTS public.live_quiz_treasure_attempts (
  player_id uuid NOT NULL REFERENCES public.live_quiz_players(id) ON DELETE CASCADE,
  turn_index integer NOT NULL CHECK (turn_index BETWEEN 0 AND 499),
  question_index integer NOT NULL CHECK (question_index BETWEEN 0 AND 29),
  choice_index integer NOT NULL CHECK (choice_index BETWEEN 0 AND 3),
  correct boolean NOT NULL,
  elapsed_ms integer NOT NULL CHECK (elapsed_ms >= 0),
  reward_type text CHECK (reward_type IN ('gold','double','triple','empty','take','swap','dragon','dragon_treasure','none')),
  reward_amount integer NOT NULL DEFAULT 0,
  reward_target_id uuid REFERENCES public.live_quiz_players(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  answered_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id,turn_index)
);
CREATE INDEX IF NOT EXISTS live_quiz_treasure_attempt_player_idx
  ON public.live_quiz_treasure_attempts(player_id,question_index,answered_at);

ALTER TABLE public.live_quiz_treasure_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.live_quiz_treasure_attempts FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
    REVOKE ALL ON public.live_quiz_treasure_attempts FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
    REVOKE ALL ON public.live_quiz_treasure_attempts FROM authenticated;
  END IF;
END $$;
COMMENT ON TABLE public.live_quiz_treasure_attempts IS
  'Server-validated self-paced quiz attempts and sealed treasure rewards. Guest access is API-token scoped.';
