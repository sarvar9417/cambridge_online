-- Physical cleanup of source-verified exact 9618 paper variants.
--
-- Verification was performed against the original Google Drive QPs. Question body
-- pages were compared after Cambridge header/footer masking using both extracted
-- text and rendered raster pixels. MS equivalence is backed by the source-section
-- hashes produced by the historical source audit; 2021 M/J Paper 1 was additionally
-- checked directly against both original MS PDFs.
--
-- Deliberately excluded candidates:
--   2021 O/N Paper 4 variants 41/42: MS matches but QP body differs.
--   2024 M/J Paper 3 variants 31/33: QP body differs.

DO $$
DECLARE
  e jsonb;
BEGIN
  -- 2021 May/June Paper 1: direct QP + direct MS exact verification.
  PERFORM public.merge_verified_equivalent_source_paper_v1(
    '9618',1,2021,'MJ',3,1,
    jsonb_build_object(
      'sourceVerified',true,
      'verificationMethod','drive_qp_text_and_raster_plus_ms_source_exact',
      'comparatorVersion','canonical-source-equivalence-v1',
      'qpCanonicalFile','9618_s21_qp_11.pdf','qpSourceFile','9618_s21_qp_13.pdf',
      'msCanonicalFile','9618_s21_ms_11.pdf','msSourceFile','9618_s21_ms_13.pdf',
      'qpBodyTextExact',true,'qpBodyRasterExact',true,'msExact',true,
      'verifiedOn','2026-09-07'
    )
  );

  -- Shared evidence shape for source QP raster/text + source-audited MS equality.
  e:=jsonb_build_object(
    'sourceVerified',true,
    'verificationMethod','drive_qp_body_text_and_raster_exact_plus_ms_source_section_hash_exact',
    'comparatorVersion','canonical-source-equivalence-v1',
    'qpBodyTextExact',true,'qpBodyRasterExact',true,'msSourceSectionHashExact',true,
    'verifiedOn','2026-09-07'
  );

  PERFORM public.merge_verified_equivalent_source_paper_v1('9618',2,2021,'MJ',3,1,e||jsonb_build_object('qpCanonicalFile','9618_s21_qp_21.pdf','qpSourceFile','9618_s21_qp_23.pdf'));
  PERFORM public.merge_verified_equivalent_source_paper_v1('9618',3,2021,'MJ',2,1,e||jsonb_build_object('qpCanonicalFile','9618_s21_qp_31.pdf','qpSourceFile','9618_s21_qp_32.pdf'));
  PERFORM public.merge_verified_equivalent_source_paper_v1('9618',3,2021,'MJ',3,1,e||jsonb_build_object('qpCanonicalFile','9618_s21_qp_31.pdf','qpSourceFile','9618_s21_qp_33.pdf'));
  PERFORM public.merge_verified_equivalent_source_paper_v1('9618',4,2021,'MJ',2,1,e||jsonb_build_object('qpCanonicalFile','9618_s21_qp_41.pdf','qpSourceFile','9618_s21_qp_42.pdf'));
  PERFORM public.merge_verified_equivalent_source_paper_v1('9618',4,2021,'MJ',3,1,e||jsonb_build_object('qpCanonicalFile','9618_s21_qp_41.pdf','qpSourceFile','9618_s21_qp_43.pdf'));

  PERFORM public.merge_verified_equivalent_source_paper_v1('9618',1,2021,'ON',3,1,e||jsonb_build_object('qpCanonicalFile','9618_w21_qp_11.pdf','qpSourceFile','9618_w21_qp_13.pdf'));
  PERFORM public.merge_verified_equivalent_source_paper_v1('9618',2,2021,'ON',3,1,e||jsonb_build_object('qpCanonicalFile','9618_w21_qp_21.pdf','qpSourceFile','9618_w21_qp_23.pdf'));
  PERFORM public.merge_verified_equivalent_source_paper_v1('9618',3,2021,'ON',2,1,e||jsonb_build_object('qpCanonicalFile','9618_w21_qp_31.pdf','qpSourceFile','9618_w21_qp_32.pdf'));

  PERFORM public.merge_verified_equivalent_source_paper_v1('9618',3,2022,'MJ',3,1,e||jsonb_build_object('qpCanonicalFile','9618_s22_qp_31.pdf','qpSourceFile','9618_s22_qp_33.pdf'));
  PERFORM public.merge_verified_equivalent_source_paper_v1('9618',4,2022,'MJ',3,1,e||jsonb_build_object('qpCanonicalFile','9618_s22_qp_41.pdf','qpSourceFile','9618_s22_qp_43.pdf'));
  PERFORM public.merge_verified_equivalent_source_paper_v1('9618',3,2022,'ON',3,1,e||jsonb_build_object('qpCanonicalFile','9618_w22_qp_31.pdf','qpSourceFile','9618_w22_qp_33.pdf'));
  PERFORM public.merge_verified_equivalent_source_paper_v1('9618',4,2022,'ON',3,1,e||jsonb_build_object('qpCanonicalFile','9618_w22_qp_41.pdf','qpSourceFile','9618_w22_qp_43.pdf'));

  PERFORM public.merge_verified_equivalent_source_paper_v1('9618',3,2023,'MJ',3,1,e||jsonb_build_object('qpCanonicalFile','9618_s23_qp_31.pdf','qpSourceFile','9618_s23_qp_33.pdf'));
  PERFORM public.merge_verified_equivalent_source_paper_v1('9618',4,2023,'MJ',3,1,e||jsonb_build_object('qpCanonicalFile','9618_s23_qp_41.pdf','qpSourceFile','9618_s23_qp_43.pdf'));
  PERFORM public.merge_verified_equivalent_source_paper_v1('9618',3,2023,'ON',3,1,e||jsonb_build_object('qpCanonicalFile','9618_w23_qp_31.pdf','qpSourceFile','9618_w23_qp_33.pdf'));
  PERFORM public.merge_verified_equivalent_source_paper_v1('9618',4,2023,'ON',3,1,e||jsonb_build_object('qpCanonicalFile','9618_w23_qp_41.pdf','qpSourceFile','9618_w23_qp_43.pdf'));

  PERFORM public.merge_verified_equivalent_source_paper_v1('9618',4,2024,'MJ',3,1,e||jsonb_build_object('qpCanonicalFile','9618_s24_qp_41.pdf','qpSourceFile','9618_s24_qp_43.pdf'));

  -- 2024 O/N P3 is visually exact in the original QPs. The embedded text layers
  -- differ non-semantically, so raster equality is the authoritative QP evidence.
  PERFORM public.merge_verified_equivalent_source_paper_v1(
    '9618',3,2024,'ON',3,1,
    e || jsonb_build_object(
      'verificationMethod','drive_qp_body_raster_exact_plus_ms_source_section_hash_exact',
      'qpCanonicalFile','9618_w24_qp_31.pdf','qpSourceFile','9618_w24_qp_33.pdf',
      'qpBodyTextExact',false,'qpBodyRasterExact',true,
      'textLayerNote','non-semantic PDF text-layer variation; rendered question body is pixel-exact'
    )
  );
  PERFORM public.merge_verified_equivalent_source_paper_v1('9618',4,2024,'ON',3,1,e||jsonb_build_object('qpCanonicalFile','9618_w24_qp_41.pdf','qpSourceFile','9618_w24_qp_43.pdf'));
END $$;

-- Fail closed: every verified source QP must now be occurrence-only, while each
-- official occurrence path is represented exactly once.
DO $$
DECLARE
  v_physical integer;
  v_bad_state integer;
BEGIN
  SELECT count(*) INTO v_physical
  FROM public.source_paper_equivalences e
  JOIN public.source_papers sp ON sp.id=e.source_paper_id
  JOIN public.syllabi s ON s.id=sp.syllabus_id
  WHERE s.code='9618' AND sp.kind='QP'::paper_kind AND e.equivalence_kind='exact_content'
    AND EXISTS(SELECT 1 FROM public.questions q WHERE q.source_paper_id=sp.id);

  SELECT count(*) INTO v_bad_state
  FROM public.question_source_occurrences o
  JOIN public.source_paper_equivalences e ON e.source_paper_id=o.source_paper_id
  JOIN public.source_papers sp ON sp.id=o.source_paper_id
  JOIN public.syllabi s ON s.id=sp.syllabus_id
  WHERE s.code='9618' AND sp.kind='QP'::paper_kind AND e.equivalence_kind='exact_content'
    AND (o.is_primary OR o.equivalence_basis<>'source_verified_exact');

  IF v_physical<>0 OR v_bad_state<>0 THEN
    RAISE EXCEPTION 'verified 9618 canonicalization incomplete physical=% bad_occurrence_state=%',v_physical,v_bad_state;
  END IF;
END $$;
