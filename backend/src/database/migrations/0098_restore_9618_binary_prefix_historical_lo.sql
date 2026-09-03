-- 0098_restore_9618_binary_prefix_historical_lo.sql
-- Restore the historical 9618 binary/decimal-prefix objective that was omitted
-- from the normalized 2021-2025 learning-objective catalogue.
--
-- Official Cambridge 9618 syllabus wording (2021-2023 and 2024-2025):
--   Show understanding of binary magnitudes and the difference between
--   binary prefixes and decimal prefixes
--
-- The migration is deliberately additive:
-- - historical question wording/source refs are untouched;
-- - the existing broad 1.1-lo-01 mappings are preserved;
-- - direct prefix questions receive a second, exact reviewed LO mapping;
-- - question review status is not promoted here;
-- - the restored historical LO is explicitly equivalent to current 1.1.1.

DO $$
DECLARE
  v_count integer;
  v_objective constant text :=
    'Show understanding of binary magnitudes and the difference between binary prefixes and decimal prefixes';
BEGIN
  SELECT count(*) INTO v_count
  FROM subtopics st
  JOIN topics t ON t.id=st.topic_id
  JOIN syllabi sy ON sy.id=t.syllabus_id
  WHERE sy.code='9618'
    AND sy.version_label IN ('2021-2023','2024-2025')
    AND st.code='1.1';

  IF v_count<>2 THEN
    RAISE EXCEPTION '0098 expected exactly two historical 9618/1.1 subtopics, found %',v_count;
  END IF;

  INSERT INTO learning_objectives(subtopic_id,code,text,sort_order)
  SELECT st.id,'1.1-lo-00',v_objective,0
  FROM subtopics st
  JOIN topics t ON t.id=st.topic_id
  JOIN syllabi sy ON sy.id=t.syllabus_id
  WHERE sy.code='9618'
    AND sy.version_label IN ('2021-2023','2024-2025')
    AND st.code='1.1'
  ON CONFLICT (subtopic_id,code) DO NOTHING;

  SELECT count(*) INTO v_count
  FROM learning_objectives lo
  JOIN subtopics st ON st.id=lo.subtopic_id
  JOIN topics t ON t.id=st.topic_id
  JOIN syllabi sy ON sy.id=t.syllabus_id
  WHERE sy.code='9618'
    AND sy.version_label IN ('2021-2023','2024-2025')
    AND st.code='1.1'
    AND lo.code='1.1-lo-00'
    AND lo.text=v_objective
    AND lo.sort_order=0;

  IF v_count<>2 THEN
    RAISE EXCEPTION '0098 historical prefix LO restore failed, exact rows=%',v_count;
  END IF;

  WITH curated(display_ref) AS (
    VALUES
      ('9618/11/O/N/21 Q1(a)'),
      ('9618/13/O/N/21 Q1(a)'),
      ('9618/11/M/J/22 Q1(a)'),
      ('9618/11/M/J/23 Q3(d)(i)'),
      ('9618/12/O/N/23 Q3(a)'),
      ('9618/12/M/J/24 Q7(a)'),
      ('9618/13/M/J/24 Q1(a)'),
      ('9618/11/O/N/24 Q1(a)')
  ), resolved AS (
    SELECT
      q.id question_id,
      q.source_paper_id,
      q.display_ref,
      q.status,
      q.stem_md,
      sy.version_label,
      qs.subtopic_id primary_subtopic_id,
      qs.confidence primary_confidence,
      qs.set_by primary_set_by,
      lo.id target_lo_id,
      (
        SELECT coalesce(jsonb_agg(jsonb_build_object(
          'lo_id',old_lo.id,
          'code',old_lo.code,
          'confidence',qlo.confidence
        ) ORDER BY old_lo.code),'[]'::jsonb)
        FROM question_learning_objectives qlo
        JOIN learning_objectives old_lo ON old_lo.id=qlo.lo_id
        WHERE qlo.question_id=q.id
      ) old_los
    FROM curated c
    JOIN questions q ON q.display_ref=c.display_ref
    JOIN source_papers sp ON sp.id=q.source_paper_id
    JOIN syllabi sy ON sy.id=sp.syllabus_id
    JOIN components component ON component.id=q.component_id AND component.number=1
    JOIN question_subtopics qs ON qs.question_id=q.id AND qs.is_primary
    JOIN subtopics primary_st ON primary_st.id=qs.subtopic_id AND primary_st.code='1.1'
    JOIN topics target_topic ON target_topic.syllabus_id=sp.syllabus_id
    JOIN subtopics target_st ON target_st.topic_id=target_topic.id AND target_st.code='1.1'
    JOIN learning_objectives lo ON lo.subtopic_id=target_st.id AND lo.code='1.1-lo-00'
    WHERE sy.code='9618'
      AND sy.version_label IN ('2021-2023','2024-2025')
      AND sp.kind='QP'
      AND sp.year BETWEEN 2021 AND 2025
      AND q.marks IS NOT NULL
  )
  SELECT count(*) INTO v_count FROM resolved;

  IF v_count<>8 THEN
    RAISE EXCEPTION '0098 expected eight exact prefix source leaves, resolved %',v_count;
  END IF;

  WITH curated(display_ref) AS (
    VALUES
      ('9618/11/O/N/21 Q1(a)'),
      ('9618/13/O/N/21 Q1(a)'),
      ('9618/11/M/J/22 Q1(a)'),
      ('9618/11/M/J/23 Q3(d)(i)'),
      ('9618/12/O/N/23 Q3(a)'),
      ('9618/12/M/J/24 Q7(a)'),
      ('9618/13/M/J/24 Q1(a)'),
      ('9618/11/O/N/24 Q1(a)')
  )
  SELECT count(*) INTO v_count
  FROM curated c
  JOIN questions q ON q.display_ref=c.display_ref
  WHERE lower(coalesce(q.stem_md,'')) ~ '(kibi|mebi|gibi|tebi|kilobyte|megabyte|gigabyte|terabyte)';

  IF v_count<>8 THEN
    RAISE EXCEPTION '0098 semantic prefix guard failed, matched %/8',v_count;
  END IF;

  WITH curated(display_ref) AS (
    VALUES
      ('9618/11/O/N/21 Q1(a)'),
      ('9618/13/O/N/21 Q1(a)'),
      ('9618/11/M/J/22 Q1(a)'),
      ('9618/11/M/J/23 Q3(d)(i)'),
      ('9618/12/O/N/23 Q3(a)'),
      ('9618/12/M/J/24 Q7(a)'),
      ('9618/13/M/J/24 Q1(a)'),
      ('9618/11/O/N/24 Q1(a)')
  ), resolved AS (
    SELECT
      q.id question_id,
      q.source_paper_id,
      q.display_ref,
      q.status,
      q.stem_md,
      sy.version_label,
      qs.subtopic_id primary_subtopic_id,
      qs.confidence primary_confidence,
      qs.set_by primary_set_by,
      lo.id target_lo_id,
      (
        SELECT coalesce(jsonb_agg(jsonb_build_object(
          'lo_id',old_lo.id,
          'code',old_lo.code,
          'confidence',qlo.confidence
        ) ORDER BY old_lo.code),'[]'::jsonb)
        FROM question_learning_objectives qlo
        JOIN learning_objectives old_lo ON old_lo.id=qlo.lo_id
        WHERE qlo.question_id=q.id
      ) old_los
    FROM curated c
    JOIN questions q ON q.display_ref=c.display_ref
    JOIN source_papers sp ON sp.id=q.source_paper_id
    JOIN syllabi sy ON sy.id=sp.syllabus_id
    JOIN question_subtopics qs ON qs.question_id=q.id AND qs.is_primary
    JOIN subtopics primary_st ON primary_st.id=qs.subtopic_id AND primary_st.code='1.1'
    JOIN topics target_topic ON target_topic.syllabus_id=sp.syllabus_id
    JOIN subtopics target_st ON target_st.topic_id=target_topic.id AND target_st.code='1.1'
    JOIN learning_objectives lo ON lo.subtopic_id=target_st.id AND lo.code='1.1-lo-00'
    WHERE sy.code='9618'
      AND sy.version_label IN ('2021-2023','2024-2025')
  )
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
  )
  SELECT
    r.question_id,
    r.source_paper_id,
    'manual-source-audit-0098',
    md5(concat_ws('|',r.question_id::text,r.status,coalesce(r.stem_md,''),r.old_los::text)),
    r.status,
    r.primary_subtopic_id,
    '1.1',
    r.primary_confidence,
    r.primary_set_by,
    r.old_los,
    r.primary_subtopic_id,
    '1.1',
    greatest(coalesce(r.primary_confidence,0),0.99),
    r.old_los || jsonb_build_array(jsonb_build_object(
      'lo_id',r.target_lo_id,
      'code','1.1-lo-00',
      'confidence',0.99
    )),
    jsonb_build_object(
      'method','manual official-syllabus + source-question review',
      'reason','Question directly assesses binary/decimal storage magnitudes or prefixes omitted from the historical normalized LO catalogue.',
      'official_objective',v_objective,
      'question_ref',r.display_ref,
      'status_preserved',true
    ),
    jsonb_build_object(
      'source_backed',true,
      'qualification','9618',
      'historical_syllabus_version',r.version_label,
      'source_type','Cambridge official syllabus and question paper',
      'official_objective',v_objective
    )
  FROM resolved r
  WHERE NOT EXISTS (
    SELECT 1
    FROM question_taxonomy_review_history h
    WHERE h.question_id=r.question_id
      AND h.review_tag='manual-source-audit-0098'
  );

  WITH curated(display_ref) AS (
    VALUES
      ('9618/11/O/N/21 Q1(a)'),
      ('9618/13/O/N/21 Q1(a)'),
      ('9618/11/M/J/22 Q1(a)'),
      ('9618/11/M/J/23 Q3(d)(i)'),
      ('9618/12/O/N/23 Q3(a)'),
      ('9618/12/M/J/24 Q7(a)'),
      ('9618/13/M/J/24 Q1(a)'),
      ('9618/11/O/N/24 Q1(a)')
  )
  INSERT INTO question_learning_objectives(question_id,lo_id,confidence)
  SELECT q.id,lo.id,0.99
  FROM curated c
  JOIN questions q ON q.display_ref=c.display_ref
  JOIN source_papers sp ON sp.id=q.source_paper_id
  JOIN syllabi sy ON sy.id=sp.syllabus_id
  JOIN topics t ON t.syllabus_id=sp.syllabus_id
  JOIN subtopics st ON st.topic_id=t.id AND st.code='1.1'
  JOIN learning_objectives lo ON lo.subtopic_id=st.id AND lo.code='1.1-lo-00'
  WHERE sy.code='9618'
    AND sy.version_label IN ('2021-2023','2024-2025')
  ON CONFLICT (question_id,lo_id)
  DO UPDATE SET confidence=greatest(question_learning_objectives.confidence,excluded.confidence);

  INSERT INTO learning_objective_compatibility(target_lo_id,source_lo_id,relation,evidence)
  SELECT current_lo.id,historical_lo.id,'equivalent',
         'official-9618-wording-match: binary magnitudes and binary-vs-decimal prefixes'
  FROM learning_objectives current_lo
  JOIN subtopics current_st ON current_st.id=current_lo.subtopic_id AND current_st.code='1.1'
  JOIN topics current_topic ON current_topic.id=current_st.topic_id
  JOIN syllabi current_sy ON current_sy.id=current_topic.syllabus_id
    AND current_sy.code='9618'
    AND current_sy.version_label='2026-2028'
  CROSS JOIN learning_objectives historical_lo
  JOIN subtopics historical_st ON historical_st.id=historical_lo.subtopic_id AND historical_st.code='1.1'
  JOIN topics historical_topic ON historical_topic.id=historical_st.topic_id
  JOIN syllabi historical_sy ON historical_sy.id=historical_topic.syllabus_id
    AND historical_sy.code='9618'
    AND historical_sy.version_label IN ('2021-2023','2024-2025')
  WHERE current_lo.code='1.1.1'
    AND historical_lo.code='1.1-lo-00'
  ON CONFLICT (target_lo_id,source_lo_id) DO NOTHING;

  SELECT count(*) INTO v_count
  FROM question_learning_objectives qlo
  JOIN learning_objectives lo ON lo.id=qlo.lo_id
  JOIN subtopics st ON st.id=lo.subtopic_id
  JOIN topics t ON t.id=st.topic_id
  JOIN syllabi sy ON sy.id=t.syllabus_id
  JOIN questions q ON q.id=qlo.question_id
  WHERE sy.code='9618'
    AND sy.version_label IN ('2021-2023','2024-2025')
    AND st.code='1.1'
    AND lo.code='1.1-lo-00'
    AND q.display_ref IN (
      '9618/11/O/N/21 Q1(a)',
      '9618/13/O/N/21 Q1(a)',
      '9618/11/M/J/22 Q1(a)',
      '9618/11/M/J/23 Q3(d)(i)',
      '9618/12/O/N/23 Q3(a)',
      '9618/12/M/J/24 Q7(a)',
      '9618/13/M/J/24 Q1(a)',
      '9618/11/O/N/24 Q1(a)'
    )
    AND qlo.confidence>=0.99;

  IF v_count<>8 THEN
    RAISE EXCEPTION '0098 exact prefix mapping postcondition failed, mapped %/8',v_count;
  END IF;

  SELECT count(distinct q.id) INTO v_count
  FROM questions q
  JOIN question_learning_objectives qlo ON qlo.question_id=q.id
  JOIN learning_objectives lo ON lo.id=qlo.lo_id
  JOIN subtopics st ON st.id=lo.subtopic_id
  JOIN topics t ON t.id=st.topic_id
  JOIN syllabi sy ON sy.id=t.syllabus_id
  JOIN source_papers sp ON sp.id=q.source_paper_id
  WHERE sy.code='9618'
    AND sy.version_label IN ('2021-2023','2024-2025')
    AND st.code='1.1'
    AND lo.code='1.1-lo-00'
    AND q.status='approved'
    AND q.marks IS NOT NULL
    AND sp.kind='QP'
    AND sp.year BETWEEN 2021 AND 2025;

  IF v_count<2 THEN
    RAISE EXCEPTION '0098 expected at least two approved exact prefix checkpoint leaves, found %',v_count;
  END IF;

  SELECT count(*) INTO v_count
  FROM learning_objective_compatibility compat
  JOIN learning_objectives target_lo ON target_lo.id=compat.target_lo_id
  JOIN learning_objectives source_lo ON source_lo.id=compat.source_lo_id
  JOIN subtopics source_st ON source_st.id=source_lo.subtopic_id
  JOIN topics source_topic ON source_topic.id=source_st.topic_id
  JOIN syllabi source_sy ON source_sy.id=source_topic.syllabus_id
  WHERE target_lo.code='1.1.1'
    AND source_lo.code='1.1-lo-00'
    AND compat.relation='equivalent'
    AND source_sy.code='9618'
    AND source_sy.version_label IN ('2021-2023','2024-2025');

  IF v_count<>2 THEN
    RAISE EXCEPTION '0098 expected two exact prefix compatibility rows, found %',v_count;
  END IF;
END $$;
