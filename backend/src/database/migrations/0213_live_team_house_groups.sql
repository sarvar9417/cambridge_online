-- Optional team/house assignment for Live Challenge gamification.
-- Academic marks, evidence and mastery remain individual; this column is only
-- a stable session-scoped grouping key used by the leaderboard/read models.

ALTER TABLE public.live_exam_participants
  ADD COLUMN competition_group smallint;

ALTER TABLE public.live_exam_participants
  ADD CONSTRAINT live_exam_participants_competition_group_check
  CHECK (competition_group IS NULL OR competition_group BETWEEN 1 AND 8);

CREATE INDEX live_exam_participants_session_competition_group_idx
  ON public.live_exam_participants(session_id,competition_group)
  WHERE left_at IS NULL AND competition_group IS NOT NULL;
