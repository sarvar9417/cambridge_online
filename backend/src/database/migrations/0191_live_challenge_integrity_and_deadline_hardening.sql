-- Additive Live Challenge hardening. Existing assessment snapshots remain
-- immutable; these guards protect future writers and retries at the database boundary.

CREATE OR REPLACE FUNCTION public.validate_live_exam_answer_integrity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  question_session_id uuid;
  participant_session_id uuid;
  question_marks numeric;
BEGIN
  SELECT leq.session_id, leq.marks INTO question_session_id, question_marks
  FROM live_exam_questions leq WHERE leq.id = NEW.session_question_id;
  SELECT lep.session_id INTO participant_session_id
  FROM live_exam_participants lep WHERE lep.id = NEW.participant_id;
  IF question_session_id IS NULL OR participant_session_id IS NULL
     OR question_session_id <> participant_session_id THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'live_answer_session_mismatch';
  END IF;
  IF NEW.final_score IS NOT NULL AND (NEW.final_score < 0 OR NEW.final_score > question_marks) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'live_answer_score_exceeds_marks';
  END IF;
  IF (NEW.final_score IS NULL) <> (NEW.score_source IS NULL) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'live_answer_score_source_mismatch';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS live_exam_answers_integrity ON live_exam_answers;
CREATE TRIGGER live_exam_answers_integrity
BEFORE INSERT OR UPDATE OF session_question_id, participant_id, final_score, score_source
ON live_exam_answers FOR EACH ROW EXECUTE FUNCTION public.validate_live_exam_answer_integrity();

CREATE OR REPLACE FUNCTION public.validate_live_exam_review_integrity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  answer_question_id uuid;
  answer_session_id uuid;
  review_session_id uuid;
  question_marks numeric;
BEGIN
  SELECT lea.session_question_id, leq.session_id, leq.marks
    INTO answer_question_id, answer_session_id, question_marks
  FROM live_exam_answers lea JOIN live_exam_questions leq ON leq.id = lea.session_question_id
  WHERE lea.id = NEW.answer_id;
  SELECT leq.session_id INTO review_session_id FROM live_exam_questions leq
  WHERE leq.id = NEW.session_question_id;
  IF answer_question_id IS NULL OR answer_question_id <> NEW.session_question_id
     OR answer_session_id IS NULL OR answer_session_id <> review_session_id THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'live_review_session_mismatch';
  END IF;
  IF NEW.awarded_marks IS NOT NULL AND (NEW.awarded_marks < 0 OR NEW.awarded_marks > question_marks) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'live_review_score_exceeds_marks';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS live_exam_reviews_integrity ON live_exam_reviews;
CREATE TRIGGER live_exam_reviews_integrity
BEFORE INSERT OR UPDATE OF session_question_id, answer_id, awarded_marks
ON live_exam_reviews FOR EACH ROW EXECUTE FUNCTION public.validate_live_exam_review_integrity();

CREATE OR REPLACE FUNCTION public.validate_live_exam_review_point_integrity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE point_marks numeric;
BEGIN
  SELECT (point.value->>'marks')::numeric INTO point_marks
  FROM live_exam_reviews ler JOIN live_exam_questions leq ON leq.id = ler.session_question_id
  CROSS JOIN LATERAL jsonb_array_elements(coalesce(leq.mark_scheme_snapshot->'points','[]'::jsonb)) point(value)
  WHERE ler.id = NEW.review_id AND (point.value->>'id')::uuid = NEW.mark_scheme_point_id;
  IF point_marks IS NULL OR NEW.awarded_marks < 0 OR NEW.awarded_marks > point_marks THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'live_review_point_score_exceeds_marks';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS live_exam_review_points_integrity ON live_exam_review_points;
CREATE TRIGGER live_exam_review_points_integrity
BEFORE INSERT OR UPDATE OF review_id, mark_scheme_point_id, awarded_marks
ON live_exam_review_points FOR EACH ROW EXECUTE FUNCTION public.validate_live_exam_review_point_integrity();

ALTER TABLE live_exam_answers
  ADD CONSTRAINT live_exam_answers_score_submission_check
  CHECK (final_score IS NULL OR submitted_at IS NOT NULL),
  ADD CONSTRAINT live_exam_answers_score_source_check
  CHECK ((final_score IS NULL AND score_source IS NULL) OR (final_score IS NOT NULL AND score_source IS NOT NULL)),
  ADD CONSTRAINT live_exam_answers_moderation_pair_check
  CHECK ((moderated_by IS NULL) = (moderated_at IS NULL));

ALTER TABLE live_exam_reviews
  ADD CONSTRAINT live_exam_reviews_award_submission_check
  CHECK (awarded_marks IS NULL OR submitted_at IS NOT NULL),
  ADD CONSTRAINT live_exam_reviews_moderation_pair_check
  CHECK ((moderated_by IS NULL) = (moderated_at IS NULL));

CREATE UNIQUE INDEX IF NOT EXISTS live_exam_events_session_version_unique
  ON live_exam_events (session_id, session_version);

ALTER FUNCTION public.enforce_live_exam_peer_review_integrity() SET search_path = public, pg_temp;
ALTER FUNCTION public.audit_live_exam_teacher_override() SET search_path = public, pg_temp;
ALTER FUNCTION public.persist_live_exam_learning_evidence() SET search_path = public, pg_temp;
ALTER FUNCTION public.guard_approved_9618_structured_content_source_host_v1() SET search_path = public, pg_temp;
