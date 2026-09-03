-- 0097_curate_9618_bitmap_vector_choice_checkpoint.sql
-- Close the only empty exact historical LO checkpoint used by the Hodder
-- Chapter 1 lesson without broadening the lesson query to a whole subtopic.
--
-- Source reviewed leaf:
--   9618/12/O/N/21 Q5(b)(i)
--   "Describe two differences between a vector graphic and a bitmap image."
--
-- The approved mark scheme explicitly awards representation, scaling/
-- pixelation, file-size and compression differences.  The existing 1.2-lo-01
-- mapping is therefore retained, while 1.2-lo-03 is added as a second reviewed
-- LO because those comparison properties are the evidence used to decide
-- whether bitmap or vector representation is appropriate for a task.
--
-- Historical taxonomy only: every target ID is resolved through the source
-- paper's own syllabus version. Question wording, source references and mark
-- scheme content are never rewritten.

DO $$
DECLARE
  v_question_id uuid;
  v_source_paper_id uuid;
  v_primary_subtopic_id uuid;
  v_primary_confidence numeric;
  v_primary_set_by text;
  v_target_lo_id uuid;
  v_old_los jsonb;
  v_source_provenance jsonb;
  v_count integer;
BEGIN
  SELECT q.id, q.source_paper_id
  INTO v_question_id, v_source_paper_id
  FROM questions q
  JOIN source_papers sp ON sp.id=q.source_paper_id
  JOIN syllabi sy ON sy.id=sp.syllabus_id
  JOIN components c ON c.id=q.component_id
  WHERE q.display_ref='9618/12/O/N/21 Q5(b)(i)'
    AND sy.code='9618'
    AND sy.version_label IN ('2021-2023','2024-2025')
    AND sp.kind='QP'
    AND sp.year=2021
    AND sp.series::text='ON'
    AND sp.variant=2
    AND c.number=1
    AND q.status='needs_review'
    AND q.marks=4
    AND lower(coalesce(q.stem_md,'')) LIKE '%vector graphic%'
    AND lower(coalesce(q.stem_md,'')) LIKE '%bitmap image%'
    AND lower(coalesce(q.stem_md,'')) LIKE '%differences%';

  IF v_question_id IS NULL THEN
    RAISE EXCEPTION '0097 source leaf precondition failed';
  END IF;

  SELECT qs.subtopic_id, qs.confidence, qs.set_by
  INTO v_primary_subtopic_id, v_primary_confidence, v_primary_set_by
  FROM question_subtopics qs
  JOIN subtopics st ON st.id=qs.subtopic_id
  WHERE qs.question_id=v_question_id
    AND qs.is_primary
    AND st.code='1.2';

  IF v_primary_subtopic_id IS NULL THEN
    RAISE EXCEPTION '0097 expected primary historical subtopic 1.2';
  END IF;

  SELECT count(*) INTO v_count
  FROM question_learning_objectives qlo
  JOIN learning_objectives lo ON lo.id=qlo.lo_id
  WHERE qlo.question_id=v_question_id
    AND lo.code='1.2-lo-01';
  IF v_count<>1 THEN
    RAISE EXCEPTION '0097 expected existing 1.2-lo-01 mapping, found %',v_count;
  END IF;

  SELECT count(*) INTO v_count
  FROM question_learning_objectives qlo
  JOIN learning_objectives lo ON lo.id=qlo.lo_id
  WHERE qlo.question_id=v_question_id
    AND lo.code='1.2-lo-03';
  IF v_count<>0 THEN
    RAISE EXCEPTION '0097 expected 1.2-lo-03 to be absent before curation, found %',v_count;
  END IF;

  SELECT lo.id INTO v_target_lo_id
  FROM source_papers sp
  JOIN topics t ON t.syllabus_id=sp.syllabus_id
  JOIN subtopics st ON st.topic_id=t.id AND st.code='1.2'
  JOIN learning_objectives lo ON lo.subtopic_id=st.id AND lo.code='1.2-lo-03'
  WHERE sp.id=v_source_paper_id;

  IF v_target_lo_id IS NULL THEN
    RAISE EXCEPTION '0097 could not resolve historical 1.2-lo-03 through source syllabus';
  END IF;

  SELECT count(*) INTO v_count
  FROM mark_schemes ms
  WHERE ms.question_id=v_question_id
    AND ms.status='approved'
    AND ms.max_marks=4
    AND lower(coalesce(ms.guidance_md,'')) LIKE '%bitmap%'
    AND lower(coalesce(ms.guidance_md,'')) LIKE '%vector%'
    AND lower(coalesce(ms.guidance_md,'')) LIKE '%pixelat%';
  IF v_count<>1 THEN
    RAISE EXCEPTION '0097 expected one approved source-backed bitmap/vector mark scheme, found %',v_count;
  END IF;

  SELECT count(*) INTO v_count FROM question_dependencies WHERE question_id=v_question_id;
  IF v_count<>0 THEN
    RAISE EXCEPTION '0097 expected no question dependencies, found %',v_count;
  END IF;

  SELECT count(*) INTO v_count FROM question_assets WHERE question_id=v_question_id;
  IF v_count<>0 THEN
    RAISE EXCEPTION '0097 expected no leaf assets, found %',v_count;
  END IF;

  SELECT h.source_provenance
  INTO v_source_provenance
  FROM question_taxonomy_review_history h
  WHERE h.question_id=v_question_id
    AND coalesce((h.source_provenance->>'source_backed')::boolean,false)
  ORDER BY h.applied_at DESC
  LIMIT 1;

  IF v_source_provenance IS NULL THEN
    RAISE EXCEPTION '0097 requires prior source-backed review provenance';
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'lo_id',lo.id,
    'code',lo.code,
    'confidence',qlo.confidence
  ) ORDER BY lo.code),'[]'::jsonb)
  INTO v_old_los
  FROM question_learning_objectives qlo
  JOIN learning_objectives lo ON lo.id=qlo.lo_id
  WHERE qlo.question_id=v_question_id;

  INSERT INTO question_taxonomy_review_history(
    question_id,
    source_paper_id,
    review_tag,
    old_hash,
    old_status,
    old_primary_subtopic_id,
    old_primary_subtopic_code,
    old_primary_confidence,
    old_primary_set_by,
    old_los,
    new_primary_subtopic_id,
    new_primary_subtopic_code,
    new_primary_confidence,
    new_los,
    evidence,
    source_provenance
  ) VALUES (
    v_question_id,
    v_source_paper_id,
    'manual-source-audit-0097',
    md5(concat_ws('|',v_question_id::text,'needs_review',coalesce((SELECT stem_md FROM questions WHERE id=v_question_id),''),v_old_los::text)),
    'needs_review',
    v_primary_subtopic_id,
    '1.2',
    v_primary_confidence,
    v_primary_set_by,
    v_old_los,
    v_primary_subtopic_id,
    '1.2',
    0.99,
    v_old_los || jsonb_build_array(jsonb_build_object(
      'lo_id',v_target_lo_id,
      'code','1.2-lo-03',
      'confidence',0.99
    )),
    jsonb_build_object(
      'method','manual source + approved mark-scheme review',
      'reason','Bitmap/vector differences provide direct decision evidence for choosing an appropriate representation for a task.',
      'checkpoint','Hodder Chapter 1 bitmap vs vector choice',
      'mark_scheme_evidence',jsonb_build_array('representation','scaling/pixelation','file size','compression')
    ),
    v_source_provenance
  );

  INSERT INTO question_learning_objectives(question_id,lo_id,confidence)
  VALUES (v_question_id,v_target_lo_id,0.99);

  UPDATE question_subtopics
  SET confidence=GREATEST(coalesce(confidence,0),0.99),
      set_by='manual-source-audit-0097'
  WHERE question_id=v_question_id AND is_primary;

  -- This leaf was review-gated by taxonomy, not by source or mark-scheme
  -- integrity.  The manual review above resolves that gate.
  UPDATE questions
  SET status='approved',
      updated_at=now()
  WHERE id=v_question_id AND status='needs_review';

  SELECT count(*) INTO v_count
  FROM questions q
  JOIN question_learning_objectives qlo ON qlo.question_id=q.id
  JOIN learning_objectives lo ON lo.id=qlo.lo_id
  JOIN source_papers sp ON sp.id=q.source_paper_id
  JOIN syllabi sy ON sy.id=sp.syllabus_id
  WHERE q.id=v_question_id
    AND q.status='approved'
    AND lo.id=v_target_lo_id
    AND lo.code='1.2-lo-03'
    AND qlo.confidence>=0.99
    AND sy.code='9618'
    AND sy.version_label IN ('2021-2023','2024-2025')
    AND sp.year BETWEEN 2021 AND 2025;
  IF v_count<>1 THEN
    RAISE EXCEPTION '0097 postcondition failed for curated leaf';
  END IF;

  SELECT count(distinct q.id) INTO v_count
  FROM questions q
  JOIN question_learning_objectives qlo ON qlo.question_id=q.id
  JOIN learning_objectives lo ON lo.id=qlo.lo_id
  JOIN source_papers sp ON sp.id=q.source_paper_id
  JOIN syllabi sy ON sy.id=sp.syllabus_id
  WHERE sy.code='9618'
    AND sy.version_label IN ('2021-2023','2024-2025')
    AND sp.year BETWEEN 2021 AND 2025
    AND q.status='approved'
    AND q.marks IS NOT NULL
    AND lo.code='1.2-lo-03';
  IF v_count<1 THEN
    RAISE EXCEPTION '0097 expected at least one approved 1.2-lo-03 checkpoint question';
  END IF;
END $$;
