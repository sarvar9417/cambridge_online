-- Canonical question/source-occurrence integrity audit.
--
-- A source-verified exact Cambridge variant must not own a second physical
-- questions tree. Its official references are retained in
-- question_source_occurrences and point to the one canonical tree.

DO $$
DECLARE
  v_physical_on_equivalent integer;
  v_bad_occurrence_state integer;
  v_path_mismatch integer;
BEGIN
  SELECT count(*) INTO v_physical_on_equivalent
  FROM public.source_paper_equivalences e
  JOIN public.source_papers sp ON sp.id=e.source_paper_id
  WHERE e.equivalence_kind='exact_content'
    AND sp.kind='QP'::paper_kind
    AND EXISTS(SELECT 1 FROM public.questions q WHERE q.source_paper_id=e.source_paper_id);

  SELECT count(*) INTO v_bad_occurrence_state
  FROM public.question_source_occurrences o
  LEFT JOIN public.source_paper_equivalences e
    ON e.source_paper_id=o.source_paper_id
   AND e.canonical_source_paper_id=(SELECT q.source_paper_id FROM public.questions q WHERE q.id=o.question_id)
   AND e.equivalence_kind='exact_content'
  WHERE o.equivalence_basis='source_verified_exact'
    AND (o.is_primary OR e.source_paper_id IS NULL);

  SELECT count(*) INTO v_path_mismatch
  FROM public.source_paper_equivalences e
  JOIN public.source_papers sp ON sp.id=e.source_paper_id AND sp.kind='QP'::paper_kind
  WHERE e.equivalence_kind='exact_content'
    AND (
      EXISTS(
        SELECT o.source_path
        FROM public.question_source_occurrences o
        WHERE o.source_paper_id=e.source_paper_id
        EXCEPT
        SELECT q.path
        FROM public.questions q
        WHERE q.source_paper_id=e.canonical_source_paper_id
      )
      OR EXISTS(
        SELECT q.path
        FROM public.questions q
        WHERE q.source_paper_id=e.canonical_source_paper_id
        EXCEPT
        SELECT o.source_path
        FROM public.question_source_occurrences o
        WHERE o.source_paper_id=e.source_paper_id
      )
    );

  IF v_physical_on_equivalent<>0 OR v_bad_occurrence_state<>0 OR v_path_mismatch<>0 THEN
    RAISE EXCEPTION
      'question occurrence equivalence audit failed physical_on_equivalent=% bad_occurrence_state=% path_mismatch=%',
      v_physical_on_equivalent,v_bad_occurrence_state,v_path_mismatch;
  END IF;
END $$;

-- Diagnostic report: exact source-equivalent papers and their retained occurrence
-- counts. This is the expected post-canonicalization state, not a duplicate list.
SELECT
  s.code AS syllabus_code,
  c.number AS component,
  src.year,
  src.series::text AS series,
  src.variant AS source_variant,
  canon.variant AS canonical_variant,
  e.source_paper_id,
  e.canonical_source_paper_id,
  (SELECT count(*) FROM public.question_source_occurrences o WHERE o.source_paper_id=e.source_paper_id) AS source_occurrences,
  (SELECT count(*) FROM public.questions q WHERE q.source_paper_id=e.canonical_source_paper_id) AS canonical_questions,
  e.verified_at,
  e.evidence
FROM public.source_paper_equivalences e
JOIN public.source_papers src ON src.id=e.source_paper_id AND src.kind='QP'::paper_kind
JOIN public.source_papers canon ON canon.id=e.canonical_source_paper_id
JOIN public.syllabi s ON s.id=src.syllabus_id
JOIN public.components c ON c.id=src.component_id
WHERE e.equivalence_kind='exact_content'
ORDER BY src.year,src.series,c.number,src.variant;

-- Unverified physical duplicates remain review candidates only. Do not merge them
-- without original-source QP + MS verification.
WITH normalized AS (
  SELECT
    q.id,q.source_paper_id,q.display_ref,s.code AS syllabus_code,c.number AS component,
    sp.year,sp.series::text AS series,sp.variant,
    md5(jsonb_build_object(
      'stem_md',q.stem_md,'context_md',q.context_md,'marks',q.marks,
      'answer_kind',q.answer_kind,'answer_lines',q.answer_lines,
      'assets',coalesce((SELECT jsonb_agg(jsonb_build_object(
        'kind',qa.kind,'content_hash',qa.content_hash,'content_md',qa.content_md,
        'sort_order',qa.sort_order
      ) ORDER BY qa.sort_order,qa.id) FROM question_assets qa WHERE qa.question_id=q.id),'[]'::jsonb)
    )::text) AS content_hash
  FROM questions q
  JOIN source_papers sp ON sp.id=q.source_paper_id
  JOIN syllabi s ON s.id=sp.syllabus_id
  JOIN components c ON c.id=q.component_id
  WHERE q.marks IS NOT NULL
), groups AS (
  SELECT content_hash,count(*) occurrence_count
  FROM normalized
  GROUP BY content_hash
  HAVING count(*)>1
)
SELECT g.content_hash,g.occurrence_count,
       jsonb_agg(jsonb_build_object(
         'questionId',n.id,'sourcePaperId',n.source_paper_id,'displayRef',n.display_ref,
         'syllabus',n.syllabus_code,'component',n.component,'year',n.year,
         'series',n.series,'variant',n.variant
       ) ORDER BY n.year,n.series,n.component,n.variant,n.display_ref) AS review_candidates
FROM groups g
JOIN normalized n ON n.content_hash=g.content_hash
WHERE NOT EXISTS(
  SELECT 1 FROM source_paper_equivalences e WHERE e.source_paper_id=n.source_paper_id
)
GROUP BY g.content_hash,g.occurrence_count
ORDER BY g.occurrence_count DESC,g.content_hash;
