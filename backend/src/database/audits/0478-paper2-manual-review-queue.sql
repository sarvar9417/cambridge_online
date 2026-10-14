-- Read-only source-backed 0478 Paper 2 expert review queue.
-- A needs_review status reflects nontrivial taxonomy and/or source-fidelity
-- uncertainty. Do NOT auto-approve based on extraction confidence alone.
SELECT q.id AS question_id, q.display_ref,sp.year,sp.series,sp.variant,
       q.marks,q.answer_kind::text,q.status::text,
       round(q.extract_confidence::numeric,4) extraction_confidence,
       st.code subtopic,st.title subtopic_title,lo.code lo_code,lo.text lo_text,
       qp.source_url qp_pdf, ms_sp.source_url ms_pdf,
       q.content_json->'blocks'->0->'source'->>'page' qp_page,
       qp.sha256 qp_sha256,
       left(q.stem_md,6000) question_text,
       left(ms.guidance_md,7000) mark_scheme_text,
       case
         when length(trim(coalesce(q.stem_md,'')))<20 THEN 'P0_MISSING_STEM'
         when q.answer_kind::text in ('diagram','table') THEN 'P1_VERIFY_SOURCE_VISUAL'
         when q.answer_kind::text in ('pseudocode','code') THEN 'P2_VERIFY_CODE_AND_LO'
         when q.marks between 1 and 3 THEN 'P3_SHORT_SOURCE_AND_LO_REVIEW'
         else 'P4_MANUAL_TAXONOMY_AND_MARK_SCHEME_REVIEW'
       end review_queue,
       'Await independent official QP/MS and syllabus LO verification' AS required_evidence
FROM public.questions q
JOIN public.source_papers qp ON qp.id=q.source_paper_id AND qp.kind='QP'
JOIN public.syllabi sy ON sy.id=qp.syllabus_id AND sy.code='0478'
JOIN public.components c ON c.id=qp.component_id AND c.number=2
LEFT JOIN public.source_papers ms_sp
 ON ms_sp.kind='MS' AND ms_sp.syllabus_id=qp.syllabus_id
 AND ms_sp.component_id=qp.component_id AND ms_sp.year=qp.year
 AND ms_sp.series=qp.series AND ms_sp.variant=qp.variant
LEFT JOIN public.question_subtopics qs ON qs.question_id=q.id AND qs.is_primary
LEFT JOIN public.subtopics st ON st.id=qs.subtopic_id
LEFT JOIN public.question_learning_objectives qlo ON qlo.question_id=q.id
LEFT JOIN public.learning_objectives lo ON lo.id=qlo.lo_id
LEFT JOIN public.mark_schemes ms ON ms.question_id=q.id
WHERE q.marks>0 AND q.status='needs_review'
ORDER BY review_queue,qp.year DESC,qp.series,qp.variant,q.display_ref;