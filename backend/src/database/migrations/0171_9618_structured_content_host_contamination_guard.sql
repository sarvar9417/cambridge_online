-- Remove source-host watermark/footer contamination from approved 9618 structured
-- question content without changing canonical stem/context, source provenance or assets.
--
-- The 2026 supplied PDFs include host/trace footer text in their text layer. Some
-- source-complete content_json text blocks therefore contained that footer between
-- legitimate source sections. We remove only the trace/footer segment and preserve
-- legitimate text before and after it. A fail-closed trigger prevents re-approval of
-- 9618 structured content that still exposes these host artefacts.

CREATE TEMP TABLE _9618_structured_content_sanitize ON COMMIT DROP AS
WITH candidates AS (
  SELECT q.id, q.content_json AS before_content_json
  FROM public.questions q
  JOIN public.source_papers sp ON sp.id=q.source_paper_id
  WHERE q.status='approved'
    AND q.marks IS NOT NULL
    AND q.display_ref LIKE '9618/%'
    AND sp.kind='QP'
    AND sp.year=2026
    AND q.content_json IS NOT NULL
    AND (
      lower(q.content_json::text) LIKE '%papacambridge%'
      OR lower(q.content_json::text) LIKE '%trace id: pc-%'
      OR lower(q.content_json::text) LIKE '%re-uploading, mirroring or re-hosting%'
      OR lower(q.content_json::text) LIKE '%licensed for hosting on papacambridge.com only%'
    )
), rebuilt AS (
  SELECT c.id,
         c.before_content_json,
         jsonb_set(
           c.before_content_json,
           '{blocks}',
           COALESCE((
             SELECT jsonb_agg(
               CASE
                 WHEN e.block ? 'text' THEN
                   jsonb_set(
                     e.block,
                     '{text}',
                     to_jsonb(
                       regexp_replace(
                         regexp_replace(
                           e.block->>'text',
                           '(?s)Trace ID:\s*PC-[A-Z0-9]+.*?\*\s*[0-9]+\s*\*\s*DFD',
                           '',
                           'g'
                         ),
                         '(?s)Trace ID:\s*PC-[A-Z0-9]+.*$',
                         '',
                         'g'
                       )
                     ),
                     false
                   )
                 ELSE e.block
               END
               ORDER BY e.ord
             )
             FROM jsonb_array_elements(c.before_content_json->'blocks') WITH ORDINALITY AS e(block,ord)
           ), '[]'::jsonb),
           false
         ) AS after_content_json
  FROM candidates c
)
SELECT id,before_content_json,after_content_json
FROM rebuilt
WHERE before_content_json IS DISTINCT FROM after_content_json;

INSERT INTO public.audit_log(action,ref_table,ref_id,before,after)
SELECT
  '9618_structured_content_host_contamination_sanitize_v1',
  'questions',
  s.id,
  jsonb_build_object('content_json',s.before_content_json),
  jsonb_build_object('content_json',s.after_content_json)
FROM _9618_structured_content_sanitize s;

UPDATE public.questions q
SET content_json=s.after_content_json
FROM _9618_structured_content_sanitize s
WHERE q.id=s.id;

CREATE OR REPLACE FUNCTION public.guard_approved_9618_structured_content_source_host_v1()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_text text;
BEGIN
  IF NEW.status='approved'
     AND NEW.display_ref LIKE '9618/%'
     AND NEW.content_json IS NOT NULL THEN
    v_text := lower(NEW.content_json::text);
    IF v_text LIKE '%papacambridge%'
       OR v_text LIKE '%trace id: pc-%'
       OR v_text LIKE '%re-uploading, mirroring or re-hosting%'
       OR v_text LIKE '%licensed for hosting on papacambridge.com only%'
       OR v_text LIKE '%downloaded from papacambridge%' THEN
      RAISE EXCEPTION 'approved_9618_structured_content_contains_source_host_artifact:%', NEW.display_ref;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_approved_9618_structured_content_source_host_v1
ON public.questions;

CREATE TRIGGER trg_guard_approved_9618_structured_content_source_host_v1
BEFORE INSERT OR UPDATE OF content_json,status ON public.questions
FOR EACH ROW
EXECUTE FUNCTION public.guard_approved_9618_structured_content_source_host_v1();
