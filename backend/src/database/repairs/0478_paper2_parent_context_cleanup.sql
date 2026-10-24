-- One-shot guarded DML repair for 0478 Paper 2. NO DDL, no approvals.
-- Source: already stored structured PDF transcription with matching source SHA,
-- same immutable source-paper UUID, and a source-tail or opening anchor confirming the leaf prompt.
-- Retains IDs, source, display refs, context, taxonomy, marks, all mark schemes,
-- and question review status. Logs original and replacement text for reversal.
WITH eligible AS MATERIALIZED (
  SELECT
    q.id, q.source_paper_id, q.stem_md AS old_stem, q.context_md,
    q.display_ref, q.status::text AS old_status, sp.sha256,
    cleaned.canonical
  FROM public.questions q
  JOIN public.source_papers sp ON sp.id=q.source_paper_id AND sp.kind='QP'
  JOIN public.syllabi s ON s.id=sp.syllabus_id AND s.code='0478'
  JOIN public.components c ON c.id=sp.component_id AND c.number=2
  CROSS JOIN LATERAL (
    SELECT string_agg(trim(b->>'text'), E'\n\n' ORDER BY ord) AS canonical
    FROM jsonb_array_elements(COALESCE(q.content_json->'blocks','[]'::jsonb))
         WITH ORDINALITY z(b,ord)
    WHERE b->>'type'='text' AND nullif(trim(b->>'text'),'') IS NOT NULL
  ) cleaned
  WHERE q.marks>0
    AND upper(COALESCE(q.stem_md,'')) LIKE '%DO NOT WRITE IN THIS MARGIN%'
    AND q.content_json->'source'->>'paperId'=sp.id::text
    AND q.content_json->'source'->>'sha256'=sp.sha256
    AND length(trim(COALESCE(cleaned.canonical,'')))>=20
    AND upper(cleaned.canonical) NOT LIKE '%DO NOT WRITE IN THIS MARGIN%'
    AND cleaned.canonical NOT LIKE '%'||chr(65533)||'%'
    AND (
      position(right(lower(regexp_replace(cleaned.canonical,'[^[:alnum:]]','','g')),32)
        in lower(regexp_replace(q.stem_md,'[^[:alnum:]]','','g')))>0
      OR position(left(lower(regexp_replace(cleaned.canonical,'[^[:alnum:]]','','g')),16)
        in lower(regexp_replace(q.stem_md,'[^[:alnum:]]','','g')))>0
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.question_source_repair_history h
      WHERE h.question_id=q.id AND h.repair_tag='0478-paper2-source-json-parent-context-clean-2026-10-14'
    )
),
history AS (
  INSERT INTO public.question_source_repair_history
    (question_id, source_paper_id, repair_tag, source_sha256,
     old_hash, new_hash, old_stem_md, old_context_md, old_display_ref,
     new_stem_md, new_context_md, new_display_ref)
  SELECT id, source_paper_id, '0478-paper2-source-json-parent-context-clean-2026-10-14',
         sha256,
         md5(COALESCE(old_stem,'')||chr(31)||COALESCE(context_md,'')||chr(31)||COALESCE(display_ref,'')),
         md5(COALESCE(canonical,'')||chr(31)||COALESCE(context_md,'')||chr(31)||COALESCE(display_ref,'')),
         old_stem, context_md, display_ref, canonical, context_md, display_ref
  FROM eligible
  RETURNING question_id
),
repaired AS (
  UPDATE public.questions q
  SET stem_md=e.canonical, updated_at=now()
  FROM eligible e JOIN history h ON h.question_id=e.id
  WHERE q.id=e.id AND q.stem_md=e.old_stem
  RETURNING q.id
)
SELECT (SELECT count(*) FROM eligible) eligible,
       (SELECT count(*) FROM history) logged,
       (SELECT count(*) FROM repaired) repaired,
       (SELECT count(*) FROM eligible WHERE old_status='needs_review') review_status_retained,
       (SELECT count(*) FROM eligible WHERE old_status='approved') approved_status_retained;