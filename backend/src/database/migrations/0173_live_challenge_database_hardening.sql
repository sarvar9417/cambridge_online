-- Cover the remaining learning-evidence foreign keys and pin trigger function
-- name resolution. Live Challenge tables remain server-only through the RLS
-- and grant boundary established by the earlier migrations.

CREATE INDEX IF NOT EXISTS live_exam_learning_evidence_session_question_fk_idx
  ON live_exam_learning_evidence (session_question_id);
CREATE INDEX IF NOT EXISTS live_exam_learning_evidence_learning_objective_fk_idx
  ON live_exam_learning_evidence (learning_objective_id);
CREATE INDEX IF NOT EXISTS live_exam_learning_evidence_subtopic_fk_idx
  ON live_exam_learning_evidence (subtopic_id);

ALTER FUNCTION public.enforce_live_exam_peer_review_integrity()
  SET search_path = public, pg_temp;
ALTER FUNCTION public.audit_live_exam_teacher_override()
  SET search_path = public, pg_temp;
ALTER FUNCTION public.persist_live_exam_learning_evidence()
  SET search_path = public, pg_temp;
ALTER FUNCTION public.guard_approved_9618_structured_content_source_host_v1()
  SET search_path = public, pg_temp;
