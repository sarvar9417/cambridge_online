-- Keep official class mastery on its own Cambridge syllabus. 0478 Paper 2
-- challenges may be held in existing 9618 classes as formative sessions, but
-- MUST NOT write 0478 evidence into 9618 learning objectives/mastery.
--
-- Apply only through the normal reviewed migration pipeline.

CREATE OR REPLACE FUNCTION public.live_session_evidence_syllabus_matches_v1(
  p_class_id uuid,p_settings jsonb
) RETURNS boolean
LANGUAGE sql STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.classes c
    JOIN public.syllabi sy ON sy.id=c.syllabus_id
    WHERE c.id=p_class_id
      AND coalesce(nullif(p_settings->>'syllabusCode',''),sy.code)=sy.code
  )
$$;

REVOKE ALL ON FUNCTION public.live_session_evidence_syllabus_matches_v1(uuid,jsonb) FROM PUBLIC;
DO $migration$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN
    GRANT EXECUTE ON FUNCTION public.live_session_evidence_syllabus_matches_v1(uuid,jsonb) TO service_role;
  END IF;
END
$migration$;

DROP TRIGGER IF EXISTS live_exam_finish_learning_evidence ON public.live_exam_sessions;
CREATE TRIGGER live_exam_finish_learning_evidence
AFTER UPDATE OF status ON public.live_exam_sessions
FOR EACH ROW
WHEN (
  NEW.status='finished'
  AND OLD.status IS DISTINCT FROM NEW.status
  AND NEW.settings->>'practiceMode' IS NULL
  AND public.live_session_evidence_syllabus_matches_v1(NEW.class_id,NEW.settings)
)
EXECUTE FUNCTION public.persist_live_exam_learning_evidence();

COMMENT ON FUNCTION public.live_session_evidence_syllabus_matches_v1(uuid,jsonb)
IS 'Only publish formal Live Challenge mastery when session syllabus matches class syllabus. Historical sessions without settings.syllabusCode remain backward compatible.';
