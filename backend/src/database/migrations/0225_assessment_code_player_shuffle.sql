-- 0225: Opt-in per-player shuffled question and option ordering.
-- Existing attempts remain in original order, preserving previously saved A-D answers.
ALTER TABLE public.assessment_code_players
  ADD COLUMN IF NOT EXISTS shuffle_version smallint NOT NULL DEFAULT 0
    CHECK (shuffle_version IN (0,1));
COMMENT ON COLUMN public.assessment_code_players.shuffle_version IS
  '0=legacy canonical order, 1=server-deterministic per-player question and option order keyed by token hash; never retroactively migrate existing attempts.';
