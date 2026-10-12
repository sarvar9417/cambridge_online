-- Source-backed audit of online answer surfaces for Cambridge structured-response tasks.
-- This does not rewrite question content. It exposes high-confidence mismatches
-- so Question Bank review and Live/assignment guards can fail closed until the
-- original paper layout is reconstructed semantically.

CREATE OR REPLACE VIEW public.question_response_readiness_audit_v1
WITH (security_invoker=true)
AS
WITH evidence AS (
  SELECT
    q.id question_id,
    q.display_ref,
    s.code syllabus_code,
    q.status::text status,
    q.answer_kind::text answer_kind,
    lower(regexp_replace(coalesce(q.context_md,'')||' '||coalesce(q.stem_md,''),'[[:space:]]+',' ','g')) source_text,
    q.content_version,
    q.content_json
  FROM public.questions q
  JOIN public.source_papers sp ON sp.id=q.source_paper_id AND sp.kind='QP'
  JOIN public.syllabi s ON s.id=sp.syllabus_id
  WHERE q.marks IS NOT NULL
), flags AS (
  SELECT e.*,
    source_text ~ (
      'complete[[:space:]]+(the[[:space:]]+|this[[:space:]]+|following[[:space:]]+)?(trace[[:space:]]+|truth[[:space:]]+)?table'
      ||'|complete[[:space:]]+(the[[:space:]]+)?answer[[:space:]]+column[[:space:]]+in[[:space:]]+(the[[:space:]]+)?following[[:space:]]+table'
      ||'|trace[[:space:]]+(the[[:space:]]+)?(program|algorithm).{0,80}table'
      ||'|write.{0,80}answers?[[:space:]]+in[[:space:]]+(the[[:space:]]+)?table'
      ||'|fill(ing)?[[:space:]]+in.{0,60}(table|missing)'
      ||'|complete[[:space:]]+(the[[:space:]]+)?k[- ]?map'
    ) requires_editable_table,
    source_text ~ (
      'show[[:space:]]+(the[[:space:]]+)?changing[[:space:]]+contents[[:space:]]+of[[:space:]]+(the[[:space:]]+|this[[:space:]]+)?stack'
      ||'|complete[[:space:]]+(the[[:space:]]+|this[[:space:]]+|following[[:space:]]+)?diagram.{0,100}stack'
      ||'|complete[[:space:]]+(the[[:space:]]+|this[[:space:]]+|following[[:space:]]+)?stack'
    ) stack_workspace_supported,
    source_text ~ (
      'match[[:space:]]+(each|the)'
      ||'|draw[[:space:]]+(a[[:space:]]+)?line.{0,80}(match|connect|link)'
      ||'|(connect|link)[[:space:]]+(each|the).{0,80}(box|statement|description|term|item)'
    ) requires_matching,
    EXISTS(
      SELECT 1
      FROM jsonb_array_elements(coalesce(e.content_json->'blocks','[]'::jsonb)) block
      WHERE block->>'type'='table'
        AND jsonb_typeof(block->'editableCells')='array'
        AND jsonb_array_length(block->'editableCells')>0
    ) has_editable_table,
    EXISTS(
      SELECT 1
      FROM jsonb_array_elements(coalesce(e.content_json->'blocks','[]'::jsonb)) block
      WHERE block->>'type'='matching'
    ) has_matching
  FROM evidence e
)
SELECT
  question_id,display_ref,syllabus_code,status,answer_kind,
  requires_editable_table,stack_workspace_supported,requires_matching,
  has_editable_table,has_matching,
  (
    content_version=1
    AND content_json IS NOT NULL
    AND (NOT requires_editable_table OR stack_workspace_supported OR has_editable_table)
    AND (NOT requires_matching OR has_matching)
  ) response_ready,
  array_remove(ARRAY[
    CASE WHEN requires_editable_table AND NOT stack_workspace_supported AND NOT has_editable_table
      THEN 'missing_editable_table' END,
    CASE WHEN requires_matching AND NOT has_matching
      THEN 'missing_matching_structure' END
  ]::text[],NULL) issue_codes
FROM flags;

REVOKE ALL ON public.question_response_readiness_audit_v1 FROM anon,authenticated;

COMMENT ON VIEW public.question_response_readiness_audit_v1 IS
  'Server-only high-confidence audit of whether Cambridge structured-response tasks have a usable online answer surface.';
