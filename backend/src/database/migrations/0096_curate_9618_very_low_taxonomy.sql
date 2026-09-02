-- 0096_curate_9618_very_low_taxonomy.sql
-- Manual source review of every remaining primary 9618 mapping below 0.72 confidence.
--
-- Result of review:
--   * 4 leaves move to a different primary subtopic (three pure algorithm-design
--     questions to 9.2, one nested-IF rewrite to 11.2).
--   * 5 Structured Programming leaves keep 11.3 but correct the LO because their
--     procedures take no parameters (11.3-lo-01, not parameter LO 11.3-lo-03).
--   * 14 leaves are source-confirmed as already correct and only receive reviewed
--     confidence/provenance.
--
-- Targets always resolve through the source paper's historical syllabus.

DO $$
DECLARE
  v_count integer;
BEGIN
  CREATE TEMP TABLE _review (
    display_ref text PRIMARY KEY,
    target_subtopic text NOT NULL,
    target_lo text NOT NULL,
    move_primary boolean NOT NULL DEFAULT false,
    reason text NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO _review(display_ref,target_subtopic,target_lo,move_primary,reason) VALUES
    ('9618/21/M/J/21 Q5',  '11.3','11.3-lo-01',false,'Sort() is a parameterless procedure'),
    ('9618/22/M/J/21 Q4',  '9.2', '9.2-lo-02', true, 'detailed algorithm description; no procedure/function'),
    ('9618/22/M/J/21 Q6',  '11.3','11.3-lo-03',false,'CountVowels() takes a string parameter'),
    ('9618/23/M/J/21 Q5',  '11.3','11.3-lo-01',false,'Sort() is a parameterless procedure'),
    ('9618/22/M/J/22 Q6',  '11.3','11.3-lo-03',false,'Parse() takes a string parameter'),
    ('9618/21/O/N/22 Q3',  '9.2', '9.2-lo-02', true, 'describe search algorithm steps without pseudocode'),
    ('9618/21/O/N/22 Q5',  '11.3','11.3-lo-01',false,'Summarise() is a parameterless procedure'),
    ('9618/22/O/N/22 Q5',  '11.2','11.2-lo-01',true, 'rewrite nested IF structure with simplified conditions'),
    ('9618/23/O/N/22 Q3',  '9.2', '9.2-lo-02', true, 'describe sequence-processing algorithm without pseudocode'),
    ('9618/21/M/J/23 Q4',  '11.3','11.3-lo-03',false,'Replace() takes three parameters'),
    ('9618/21/M/J/23 Q6',  '11.3','11.3-lo-01',false,'Mix() uses global arrays and takes no parameters'),
    ('9618/22/M/J/23 Q4',  '11.3','11.3-lo-03',false,'GetNum() takes two parameters'),
    ('9618/22/M/J/23 Q6',  '11.3','11.3-lo-03',false,'Square() takes an integer parameter'),
    ('9618/23/M/J/23 Q4',  '11.3','11.3-lo-03',false,'MakeString() takes two parameters'),
    ('9618/23/O/N/23 Q6',  '11.3','11.3-lo-03',false,'TestNum() takes a string parameter'),
    ('9618/21/O/N/24 Q2',  '11.3','11.3-lo-01',false,'Tick() is a parameterless procedure'),
    ('9618/22/O/N/24 Q4',  '11.3','11.3-lo-03',false,'Timer() is called with two arguments'),
    ('9618/23/O/N/24 Q6',  '11.3','11.3-lo-03',false,'AdjustClock() takes a year parameter'),
    ('9618/11/O/N/22 Q8',  '2.1', '2.1-lo-14',false,'CSMA/CD collision detection on Ethernet bus'),
    ('9618/13/M/J/21 Q8',  '3.2', '3.2-lo-02',false,'identify logic-gate functions'),
    ('9618/12/M/J/22 Q7',  '3.2', '3.2-lo-05',false,'construct truth table from logic expression'),
    ('9618/13/O/N/22 Q3',  '5.1', '5.1-lo-02',false,'OS management tasks'),
    ('9618/11/O/N/22 Q2',  '6.1', '6.1-lo-03',false,'security controls and threat prevention');

  SELECT count(*) INTO v_count
  FROM _review r
  JOIN questions q ON q.display_ref=r.display_ref
  JOIN source_papers sp ON sp.id=q.source_paper_id AND sp.kind='QP'
  JOIN syllabi sy ON sy.id=sp.syllabus_id AND sy.code='9618'
  JOIN question_subtopics qs ON qs.question_id=q.id AND qs.is_primary
  WHERE sp.year BETWEEN 2021 AND 2025 AND q.marks>0 AND qs.confidence<0.72;
  IF v_count<>23 THEN
    RAISE EXCEPTION '0096 expected all 23 remaining <0.72 primary mappings, found %',v_count;
  END IF;

  SELECT count(*) INTO v_count
  FROM _review r
  JOIN questions q ON q.display_ref=r.display_ref
  JOIN source_papers sp ON sp.id=q.source_paper_id
  JOIN topics t ON t.syllabus_id=sp.syllabus_id
  JOIN subtopics st ON st.topic_id=t.id AND st.code=r.target_subtopic
  JOIN learning_objectives lo ON lo.subtopic_id=st.id AND lo.code=r.target_lo;
  IF v_count<>23 THEN
    RAISE EXCEPTION '0096 could not resolve all 23 historical target mappings (found %)',v_count;
  END IF;

  SELECT count(*) INTO v_count FROM _review WHERE move_primary;
  IF v_count<>4 THEN
    RAISE EXCEPTION '0096 expected exactly four primary-subtopic moves, found %',v_count;
  END IF;

  UPDATE question_subtopics qs
  SET subtopic_id=target.id,
      weight=1.00,
      confidence=0.99,
      set_by='manual-source-audit-0096'
  FROM questions q
  JOIN _review r ON r.display_ref=q.display_ref AND r.move_primary
  JOIN source_papers sp ON sp.id=q.source_paper_id
  JOIN topics t ON t.syllabus_id=sp.syllabus_id
  JOIN subtopics target ON target.topic_id=t.id AND target.code=r.target_subtopic
  WHERE qs.question_id=q.id AND qs.is_primary;

  -- Each of the reviewed leaves currently carries one classifier-selected LO.
  SELECT count(*) INTO v_count
  FROM _review r JOIN questions q ON q.display_ref=r.display_ref
  JOIN question_learning_objectives qlo ON qlo.question_id=q.id;
  IF v_count<>23 THEN
    RAISE EXCEPTION '0096 expected one existing LO on each reviewed leaf, found %',v_count;
  END IF;

  DELETE FROM question_learning_objectives qlo
  USING questions q,_review r
  WHERE q.display_ref=r.display_ref AND qlo.question_id=q.id;

  INSERT INTO question_learning_objectives(question_id,lo_id,confidence)
  SELECT q.id,lo.id,0.99
  FROM _review r
  JOIN questions q ON q.display_ref=r.display_ref
  JOIN source_papers sp ON sp.id=q.source_paper_id
  JOIN topics t ON t.syllabus_id=sp.syllabus_id
  JOIN subtopics st ON st.topic_id=t.id AND st.code=r.target_subtopic
  JOIN learning_objectives lo ON lo.subtopic_id=st.id AND lo.code=r.target_lo;

  UPDATE question_subtopics qs
  SET confidence=0.99,
      set_by='manual-source-audit-0096'
  FROM questions q,_review r,subtopics st
  WHERE q.display_ref=r.display_ref
    AND qs.question_id=q.id AND qs.is_primary
    AND st.id=qs.subtopic_id AND st.code=r.target_subtopic;

  SELECT count(*) INTO v_count
  FROM _review r
  JOIN questions q ON q.display_ref=r.display_ref
  JOIN question_subtopics qs ON qs.question_id=q.id AND qs.is_primary
  JOIN subtopics st ON st.id=qs.subtopic_id AND st.code=r.target_subtopic
  JOIN question_learning_objectives qlo ON qlo.question_id=q.id
  JOIN learning_objectives lo ON lo.id=qlo.lo_id AND lo.code=r.target_lo
  WHERE qs.confidence>=0.99 AND qlo.confidence>=0.99;
  IF v_count<>23 THEN
    RAISE EXCEPTION '0096 postcondition expected 23 reviewed mappings, found %',v_count;
  END IF;

  SELECT count(*) INTO v_count
  FROM questions q
  JOIN source_papers sp ON sp.id=q.source_paper_id
  JOIN syllabi sy ON sy.id=sp.syllabus_id AND sy.code='9618'
  JOIN question_subtopics qs ON qs.question_id=q.id AND qs.is_primary
  WHERE sp.kind='QP' AND sp.year BETWEEN 2021 AND 2025 AND q.marks>0 AND qs.confidence<0.72;
  IF v_count<>0 THEN
    RAISE EXCEPTION '0096 expected zero remaining <0.72 primary mappings, found %',v_count;
  END IF;
END $$;
