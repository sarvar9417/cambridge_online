-- 0095_curate_9618_taxonomy_source_audit.sql
-- Source-backed semantic corrections found by reconciling the supplied 2021-2025
-- Cambridge question papers with the historical 9618 taxonomy and the Cambridge
-- 2021 Scheme of Work / 2026 syllabus.
--
-- Deliberately narrow: only mappings with direct syllabus-semantic or exact-
-- duplicate evidence are changed. Ambiguous Algorithm Design vs Structured
-- Programming cases remain review-gated rather than being force-promoted.

DO $$
DECLARE
  v_count integer;
BEGIN
  CREATE TEMP TABLE _taxonomy_fix (
    display_ref text PRIMARY KEY,
    target_subtopic text NOT NULL,
    target_lo text NOT NULL,
    move_primary boolean NOT NULL DEFAULT false,
    reason text NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO _taxonomy_fix(display_ref, target_subtopic, target_lo, move_primary, reason) VALUES
    ('9618/12/M/J/21 Q2(b)',       '7.1',  '7.1-lo-05', false, 'AI application/use'),
    ('9618/12/M/J/22 Q8',          '7.1',  '7.1-lo-05', true,  'AI application was incorrectly primary 6.1 Data Security'),
    ('9618/12/O/N/22 Q9',          '7.1',  '7.1-lo-06', false, 'social impact of facial-recognition AI'),
    ('9618/13/O/N/22 Q8(b)',       '7.1',  '7.1-lo-06', false, 'economic impact of AI'),
    ('9618/11/M/J/23 Q4(c)',       '7.1',  '7.1-lo-05', false, 'AI application/use'),
    ('9618/12/M/J/23 Q7(d)',       '7.1',  '7.1-lo-05', false, 'AI speech-recognition application'),
    ('9618/13/M/J/23 Q3(b)',       '7.1',  '7.1-lo-05', false, 'AI autofocus/facial-recognition application'),
    ('9618/11/M/J/24 Q5(c)(ii)',   '7.1',  '7.1-lo-05', true,  'AI facial recognition was incorrectly primary 6.1 Data Security'),
    ('9618/11/O/N/24 Q6',          '7.1',  '7.1-lo-05', true,  'AI number-plate recognition was incorrectly primary 6.1 Data Security'),
    ('9618/11/M/J/25 Q4(a)',       '7.1',  '7.1-lo-05', true,  'AI customer recognition was incorrectly primary 6.1 Data Security'),
    ('9618/23/M/J/22 Q2',          '12.3', '12.3-lo-07', false, 'types of program maintenance'),
    ('9618/13/M/J/21 Q5(c)',       '3.1',  '3.1-lo-10', false, 'same refrigerator control-v-monitoring item as 9618/11/M/J/21 Q5(c)'),
    ('9618/13/O/N/24 Q3',          '3.1',  '3.1-lo-10', false, 'automatic braking: identify/justify control rather than monitoring'),
    ('9618/33/O/N/22 Q12(b)(i)',   '19.1', '19.1-lo-10', false, 'Big O complexity; duplicate of variant 31'),
    ('9618/33/O/N/22 Q12(b)(ii)',  '19.1', '19.1-lo-10', false, 'Big O complexity; duplicate of variant 31'),
    ('9618/33/O/N/22 Q6(a)',       '17.1', '17.1-lo-02', false, 'private key/asymmetric encryption; duplicate of variant 31'),
    ('9618/31/O/N/22 Q10(a)',      '15.1', '15.1-lo-01', false, 'RISC/CISC characteristics, not pipelining/registers'),
    ('9618/33/O/N/22 Q10(a)',      '15.1', '15.1-lo-01', false, 'RISC/CISC characteristics');

  SELECT count(*) INTO v_count
  FROM _taxonomy_fix f
  JOIN questions q ON q.display_ref = f.display_ref
  JOIN source_papers sp ON sp.id = q.source_paper_id AND sp.kind = 'QP'
  JOIN syllabi sy ON sy.id = sp.syllabus_id AND sy.code = '9618'
  WHERE sp.year BETWEEN 2021 AND 2025 AND q.marks > 0;
  IF v_count <> 18 THEN
    RAISE EXCEPTION '0095 expected 18 source-backed question leaves, found %', v_count;
  END IF;

  -- Resolve taxonomy through topics so the target stays in the source paper's
  -- historical syllabus version rather than a same-code subtopic from 2026.
  SELECT count(*) INTO v_count
  FROM _taxonomy_fix f
  JOIN questions q ON q.display_ref = f.display_ref
  JOIN source_papers sp ON sp.id = q.source_paper_id
  JOIN topics t ON t.syllabus_id = sp.syllabus_id
  JOIN subtopics st ON st.topic_id = t.id AND st.code = f.target_subtopic
  JOIN learning_objectives lo ON lo.subtopic_id = st.id AND lo.code = f.target_lo;
  IF v_count <> 18 THEN
    RAISE EXCEPTION '0095 could not resolve all 18 target historical subtopic/LO pairs (found %)', v_count;
  END IF;

  SELECT count(*) INTO v_count
  FROM _taxonomy_fix f
  JOIN questions q ON q.display_ref = f.display_ref
  JOIN question_subtopics qs ON qs.question_id = q.id AND qs.is_primary
  JOIN subtopics st ON st.id = qs.subtopic_id
  WHERE f.move_primary AND st.code = '6.1';
  IF v_count <> 4 THEN
    RAISE EXCEPTION '0095 expected four AI leaves still primary 6.1 before repair, found %', v_count;
  END IF;

  UPDATE question_subtopics qs
  SET subtopic_id = target.id,
      weight = 1.00,
      confidence = 0.99,
      set_by = 'manual-source-audit-0095'
  FROM questions q
  JOIN _taxonomy_fix f ON f.display_ref = q.display_ref AND f.move_primary
  JOIN source_papers sp ON sp.id = q.source_paper_id
  JOIN topics t ON t.syllabus_id = sp.syllabus_id
  JOIN subtopics target ON target.topic_id = t.id AND target.code = f.target_subtopic
  WHERE qs.question_id = q.id AND qs.is_primary;

  SELECT count(*) INTO v_count
  FROM _taxonomy_fix f
  JOIN questions q ON q.display_ref = f.display_ref
  JOIN question_learning_objectives qlo ON qlo.question_id = q.id;
  IF v_count <> 18 THEN
    RAISE EXCEPTION '0095 expected one existing LO per curated leaf (18 rows), found %', v_count;
  END IF;

  DELETE FROM question_learning_objectives qlo
  USING questions q, _taxonomy_fix f
  WHERE q.display_ref = f.display_ref AND qlo.question_id = q.id;

  INSERT INTO question_learning_objectives(question_id, lo_id, confidence)
  SELECT q.id, lo.id, 0.99
  FROM _taxonomy_fix f
  JOIN questions q ON q.display_ref = f.display_ref
  JOIN source_papers sp ON sp.id = q.source_paper_id
  JOIN topics t ON t.syllabus_id = sp.syllabus_id
  JOIN subtopics st ON st.topic_id = t.id AND st.code = f.target_subtopic
  JOIN learning_objectives lo ON lo.subtopic_id = st.id AND lo.code = f.target_lo;

  UPDATE question_subtopics qs
  SET confidence = GREATEST(COALESCE(qs.confidence, 0), 0.99),
      set_by = 'manual-source-audit-0095'
  FROM questions q, _taxonomy_fix f, subtopics st
  WHERE q.display_ref = f.display_ref
    AND qs.question_id = q.id
    AND qs.is_primary
    AND st.id = qs.subtopic_id
    AND st.code = f.target_subtopic;

  SELECT count(*) INTO v_count
  FROM _taxonomy_fix f
  JOIN questions q ON q.display_ref = f.display_ref
  JOIN question_subtopics qs ON qs.question_id = q.id AND qs.is_primary
  JOIN subtopics st ON st.id = qs.subtopic_id AND st.code = f.target_subtopic
  JOIN question_learning_objectives qlo ON qlo.question_id = q.id
  JOIN learning_objectives lo ON lo.id = qlo.lo_id AND lo.code = f.target_lo
  WHERE qlo.confidence >= 0.99;
  IF v_count <> 18 THEN
    RAISE EXCEPTION '0095 postcondition expected 18 corrected primary+LO mappings, found %', v_count;
  END IF;
END $$;
