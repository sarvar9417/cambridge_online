-- 0224: Measured on-screen question engagement for PIN-based classroom assessments.
-- This migration is additive: historical attempts stay intact and cannot acquire
-- invented historical per-question times.
ALTER TABLE public.assessment_code_players
  ADD COLUMN IF NOT EXISTS current_question_id uuid REFERENCES public.assessment_center_questions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_focus_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_contact_at timestamptz,
  ADD COLUMN IF NOT EXISTS finish_reason text
    CHECK (finish_reason IN ('submitted','time_expired','teacher_closed'));

CREATE TABLE IF NOT EXISTS public.assessment_code_question_activity (
  player_id uuid NOT NULL REFERENCES public.assessment_code_players(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.assessment_center_questions(id) ON DELETE RESTRICT,
  first_opened_at timestamptz NOT NULL DEFAULT now(),
  last_opened_at timestamptz NOT NULL DEFAULT now(),
  focused_ms bigint NOT NULL DEFAULT 0 CHECK (focused_ms >= 0),
  visit_count integer NOT NULL DEFAULT 1 CHECK (visit_count >= 0),
  first_answered_at timestamptz,
  last_answered_at timestamptz,
  answer_changes integer NOT NULL DEFAULT 0 CHECK (answer_changes >= 0),
  PRIMARY KEY(player_id,question_id)
);
CREATE INDEX IF NOT EXISTS assessment_code_activity_question_idx
 ON public.assessment_code_question_activity(question_id);

ALTER TABLE public.assessment_code_question_activity ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.assessment_code_question_activity FROM PUBLIC;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
   REVOKE ALL ON public.assessment_code_question_activity FROM anon;
 END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
   REVOKE ALL ON public.assessment_code_question_activity FROM authenticated;
 END IF;
END $$;

COMMENT ON COLUMN public.assessment_code_question_activity.focused_ms IS
 'Measured server-bounded on-screen time reported through visible-page heartbeats. Not proof of attention; no historical backfill.';
COMMENT ON COLUMN public.assessment_code_players.finish_reason IS
 'Submission category. Historical records predating 0224 remain NULL.';
