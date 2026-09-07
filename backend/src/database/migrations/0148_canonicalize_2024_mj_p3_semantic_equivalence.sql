-- Canonicalize Cambridge 9618/33/M/J/24 onto 9618/31/M/J/24.
--
-- Original Google Drive QP/MS sources were re-verified after the first exact-raster
-- pass deliberately left this pair unmerged. The official PDFs use different
-- scanner/margin/vertical layout, but the assessed question content is equivalent:
--
-- - semantic QP text is identical after removing Cambridge paper identity,
--   barcode/margin and scanner-layout artefacts;
-- - all four source visuals used by the persisted question tree were compared
--   directly from the original QP pages and contain the same academic content;
-- - the MS semantic content is identical after removing the 9618/31 vs 9618/33
--   page header identity;
-- - both persisted trees have the same 40 paths, 29 assessed leaves, 75 marks,
--   29 mark schemes and equivalent taxonomy/LO coverage;
-- - the source tree has no assignment, answer, selection or flashcard references.
--
-- This is therefore exact QUESTION CONTENT equivalence, not byte/raster identity
-- of the surrounding PDF document. Official source provenance remains preserved
-- through question_source_occurrences.

DO $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT public.merge_verified_equivalent_source_paper_v1(
    '9618',3,2024,'MJ',3,1,
    jsonb_build_object(
      'sourceVerified',true,
      'verificationMethod','drive_qp_semantic_content_plus_visual_asset_equivalence_plus_ms_content_exact',
      'comparatorVersion','canonical-source-equivalence-v2',
      'qpCanonicalFile','9618_s24_qp_31.pdf',
      'qpSourceFile','9618_s24_qp_33.pdf',
      'msCanonicalFile','9618_s24_ms_31.pdf',
      'msSourceFile','9618_s24_ms_33.pdf',
      'qpSemanticTextExact',true,
      'qpVisualAssetsEquivalent',true,
      'qpDocumentLayoutExact',false,
      'layoutDifference','official margin/barcode/vertical layout only; assessed content and source visuals are equivalent',
      'msSemanticContentExact',true,
      'verifiedOn','2026-09-07'
    )
  ) INTO v_result;

  IF coalesce(v_result->>'status','') NOT IN ('merged','already_merged') THEN
    RAISE EXCEPTION '2024 M/J Paper 3 canonicalization returned unexpected state: %',v_result;
  END IF;
END $$;

-- Fail closed on the expected post-merge state.
DO $$
DECLARE
  v_source_physical integer;
  v_occurrences integer;
  v_canonical_physical integer;
BEGIN
  SELECT count(*) INTO v_source_physical
  FROM public.questions q
  JOIN public.source_papers sp ON sp.id=q.source_paper_id
  JOIN public.syllabi s ON s.id=sp.syllabus_id
  JOIN public.components c ON c.id=sp.component_id
  WHERE s.code='9618' AND c.number=3 AND sp.year=2024
    AND sp.series='MJ'::exam_series AND sp.variant=3 AND sp.kind='QP'::paper_kind;

  SELECT count(*) INTO v_occurrences
  FROM public.question_source_occurrences o
  JOIN public.source_papers sp ON sp.id=o.source_paper_id
  JOIN public.syllabi s ON s.id=sp.syllabus_id
  JOIN public.components c ON c.id=sp.component_id
  WHERE s.code='9618' AND c.number=3 AND sp.year=2024
    AND sp.series='MJ'::exam_series AND sp.variant=3 AND sp.kind='QP'::paper_kind
    AND NOT o.is_primary AND o.equivalence_basis='source_verified_exact';

  SELECT count(*) INTO v_canonical_physical
  FROM public.questions q
  JOIN public.source_papers sp ON sp.id=q.source_paper_id
  JOIN public.syllabi s ON s.id=sp.syllabus_id
  JOIN public.components c ON c.id=sp.component_id
  WHERE s.code='9618' AND c.number=3 AND sp.year=2024
    AND sp.series='MJ'::exam_series AND sp.variant=1 AND sp.kind='QP'::paper_kind;

  IF v_source_physical<>0 OR v_occurrences<>40 OR v_canonical_physical<>40 THEN
    RAISE EXCEPTION
      '2024 M/J P3 canonicalization incomplete source_physical=% occurrences=% canonical_physical=%',
      v_source_physical,v_occurrences,v_canonical_physical;
  END IF;
END $$;
