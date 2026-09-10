-- Reconcile Chapter 2 Past Paper taxonomy and expand only source-audited
-- historical compatibility pools.
--
-- Safety rules:
--   * 2026 corrections are pinned to canonical 9618/MJ/Paper 1 display refs;
--   * historical fixes remove only the adjudicated old objective edge;
--   * one mixed bus/Ethernet question receives two exact current targets;
--   * compatibility is added only for historical objective pools reviewed here;
--   * LAN/WAN and internet-hardware pools remain intentionally unresolved where
--     source mappings still require further adjudication.

DO $$
DECLARE
  v_current_questions integer;
  v_historical_questions integer;
BEGIN
  WITH refs(display_ref) AS (VALUES
    ('9618/13/M/J/26 Q3(c)(ii)'),
    ('9618/12/M/J/26 Q6(d)'),
    ('9618/13/M/J/26 Q3(c)(iii)'),
    ('9618/11/M/J/26 Q7(a)'),
    ('9618/11/M/J/26 Q7(b)(i)'),
    ('9618/11/M/J/26 Q7(b)(ii)'),
    ('9618/11/M/J/26 Q7(c)(i)'),
    ('9618/11/M/J/26 Q7(c)(ii)')
  )
  SELECT count(*) INTO v_current_questions
  FROM refs r
  JOIN public.questions q ON q.display_ref=r.display_ref
  JOIN public.source_papers sp ON sp.id=q.source_paper_id
  JOIN public.syllabi s ON s.id=sp.syllabus_id
  JOIN public.components c ON c.id=q.component_id
  WHERE s.code='9618' AND sp.kind='QP'::paper_kind
    AND sp.year=2026 AND sp.series='MJ'::exam_series AND c.number=1;
  IF v_current_questions<>8 THEN
    RAISE EXCEPTION '0165 current identity gate failed: rows=% expected=8',v_current_questions;
  END IF;

  WITH refs(display_ref) AS (VALUES
    ('9618/12/O/N/22 Q10(b)(i)'),
    ('9618/11/M/J/21 Q4(c)(ii)'),
    ('9618/12/O/N/21 Q3(b)(ii)'),
    ('9618/12/O/N/22 Q10(b)(ii)'),
    ('9618/12/M/J/23 Q1(e)')
  )
  SELECT count(*) INTO v_historical_questions
  FROM refs r
  JOIN public.questions q ON q.display_ref=r.display_ref
  JOIN public.source_papers sp ON sp.id=q.source_paper_id
  JOIN public.syllabi s ON s.id=sp.syllabus_id
  JOIN public.components c ON c.id=q.component_id
  WHERE s.code='9618' AND sp.kind='QP'::paper_kind
    AND sp.year BETWEEN 2021 AND 2023 AND c.number=1;
  IF v_historical_questions<>5 THEN
    RAISE EXCEPTION '0165 historical identity gate failed: rows=% expected=5',v_historical_questions;
  END IF;
END $$;

-- Eight 2026 direct-mapping corrections. Q7(b)(i) is first moved to topology;
-- Ethernet is added as a second current target below because the mark scheme
-- explicitly awards both bus-topology and Ethernet/CSMA-CD content.
WITH corrections(display_ref,old_code,new_code) AS (VALUES
  ('9618/13/M/J/26 Q3(c)(ii)','2.1.13','2.1.6'),
  ('9618/12/M/J/26 Q6(d)','2.1.14','2.1.6'),
  ('9618/13/M/J/26 Q3(c)(iii)','2.1.14','2.1.6'),
  ('9618/11/M/J/26 Q7(a)','2.1.2','2.1.4'),
  ('9618/11/M/J/26 Q7(b)(i)','2.1.2','2.1.5'),
  ('9618/11/M/J/26 Q7(b)(ii)','2.1.2','2.1.5'),
  ('9618/11/M/J/26 Q7(c)(i)','2.1.2','2.1.14'),
  ('9618/11/M/J/26 Q7(c)(ii)','2.1.2','2.1.14')
), resolved AS (
  SELECT q.id question_id,old_lo.id old_lo_id,new_lo.id new_lo_id
  FROM corrections x
  JOIN public.questions q ON q.display_ref=x.display_ref
  JOIN public.source_papers sp ON sp.id=q.source_paper_id
  JOIN public.syllabi ps ON ps.id=sp.syllabus_id
  JOIN public.components c ON c.id=q.component_id
  JOIN public.learning_objectives old_lo ON old_lo.code=x.old_code
  JOIN public.subtopics old_st ON old_st.id=old_lo.subtopic_id
  JOIN public.topics old_t ON old_t.id=old_st.topic_id
  JOIN public.syllabi old_s ON old_s.id=old_t.syllabus_id
  JOIN public.learning_objectives new_lo ON new_lo.code=x.new_code
  JOIN public.subtopics new_st ON new_st.id=new_lo.subtopic_id
  JOIN public.topics new_t ON new_t.id=new_st.topic_id
  JOIN public.syllabi new_s ON new_s.id=new_t.syllabus_id
  WHERE ps.code='9618' AND sp.kind='QP'::paper_kind
    AND sp.year=2026 AND sp.series='MJ'::exam_series AND c.number=1
    AND old_s.code='9618' AND old_s.version_label='2026-2028'
    AND new_s.code='9618' AND new_s.version_label='2026-2028'
), deleted AS (
  DELETE FROM public.question_learning_objectives qlo
  USING resolved r
  WHERE qlo.question_id=r.question_id AND qlo.lo_id=r.old_lo_id
  RETURNING qlo.question_id
)
INSERT INTO public.question_learning_objectives(question_id,lo_id,confidence)
SELECT question_id,new_lo_id,1.0 FROM resolved
ON CONFLICT(question_id,lo_id) DO UPDATE SET confidence=EXCLUDED.confidence;

-- Mixed bus + Ethernet question: retain topology and add exact Ethernet target.
WITH resolved AS (
  SELECT q.id question_id,lo.id lo_id
  FROM public.questions q
  JOIN public.source_papers sp ON sp.id=q.source_paper_id
  JOIN public.syllabi ps ON ps.id=sp.syllabus_id
  JOIN public.components c ON c.id=q.component_id
  JOIN public.learning_objectives lo ON lo.code='2.1.10'
  JOIN public.subtopics st ON st.id=lo.subtopic_id
  JOIN public.topics t ON t.id=st.topic_id
  JOIN public.syllabi s ON s.id=t.syllabus_id
  WHERE q.display_ref='9618/11/M/J/26 Q7(b)(i)'
    AND ps.code='9618' AND sp.year=2026 AND sp.series='MJ'::exam_series AND c.number=1
    AND s.code='9618' AND s.version_label='2026-2028'
)
INSERT INTO public.question_learning_objectives(question_id,lo_id,confidence)
SELECT question_id,lo_id,1.0 FROM resolved
ON CONFLICT(question_id,lo_id) DO UPDATE SET confidence=EXCLUDED.confidence;

-- Historical source-pool corrections that otherwise contaminate currently live
-- or newly enabled compatibility edges.
WITH corrections(display_ref,old_code,new_code) AS (VALUES
  ('9618/12/O/N/22 Q10(b)(i)','2.1-lo-08','2.1-lo-11'),
  ('9618/11/M/J/21 Q4(c)(ii)','2.1-lo-13','2.1-lo-10'),
  ('9618/12/O/N/21 Q3(b)(ii)','2.1-lo-12','2.1-lo-13'),
  ('9618/12/O/N/22 Q10(b)(ii)','2.1-lo-17','2.1-lo-13'),
  ('9618/12/M/J/23 Q1(e)','2.1-lo-17','2.1-lo-05')
), resolved AS (
  SELECT q.id question_id,old_lo.id old_lo_id,new_lo.id new_lo_id
  FROM corrections x
  JOIN public.questions q ON q.display_ref=x.display_ref
  JOIN public.source_papers sp ON sp.id=q.source_paper_id
  JOIN public.syllabi ps ON ps.id=sp.syllabus_id
  JOIN public.components c ON c.id=q.component_id
  JOIN public.learning_objectives old_lo ON old_lo.code=x.old_code
  JOIN public.subtopics old_st ON old_st.id=old_lo.subtopic_id
  JOIN public.topics old_t ON old_t.id=old_st.topic_id
  JOIN public.syllabi old_s ON old_s.id=old_t.syllabus_id
  JOIN public.learning_objectives new_lo ON new_lo.code=x.new_code
  JOIN public.subtopics new_st ON new_st.id=new_lo.subtopic_id
  JOIN public.topics new_t ON new_t.id=new_st.topic_id
  JOIN public.syllabi new_s ON new_s.id=new_t.syllabus_id
  WHERE ps.code='9618' AND sp.kind='QP'::paper_kind AND c.number=1
    AND sp.year BETWEEN 2021 AND 2023
    AND old_s.code='9618' AND old_s.version_label='2021-2023'
    AND new_s.code='9618' AND new_s.version_label='2021-2023'
), deleted AS (
  DELETE FROM public.question_learning_objectives qlo
  USING resolved r
  WHERE qlo.question_id=r.question_id AND qlo.lo_id=r.old_lo_id
  RETURNING qlo.question_id
)
INSERT INTO public.question_learning_objectives(question_id,lo_id,confidence)
SELECT question_id,new_lo_id,1.0 FROM resolved
ON CONFLICT(question_id,lo_id) DO UPDATE SET confidence=EXCLUDED.confidence;

-- Source-audited compatibility. Codes absent from one historical syllabus
-- version simply produce no edge; no synthetic objective is created.
WITH curated(target_code,source_code,relation,rationale) AS (VALUES
  ('2.1.1','2.1-lo-01','equivalent','Networking-device purpose/benefits scope is preserved.'),
  ('2.1.3','2.1-lo-05','subtopic_compatible','Client-server and peer-to-peer model characteristics remain inside the current model objective.'),
  ('2.1.5','2.1-lo-08','equivalent','Network-topology characteristics/benefits/drawbacks remain inside bus/star/mesh/hybrid scope.'),
  ('2.1.6','2.1-lo-04','equivalent','Cloud-computing use, benefits and drawbacks remain current cloud scope.'),
  ('2.1.7','2.1-lo-09','subtopic_compatible','Wired/wireless differences are part of the combined current wired/wireless objective.'),
  ('2.1.7','2.1-lo-10','subtopic_compatible','Wired/wireless benefits and drawbacks are part of the combined current wired/wireless objective.'),
  ('2.1.8','2.1-lo-11','subtopic_compatible','Purpose of LAN-support hardware is part of current LAN-hardware scope.'),
  ('2.1.8','2.1-lo-12','subtopic_compatible','Selecting LAN-support hardware is part of current LAN-hardware scope.'),
  ('2.1.9','2.1-lo-13','equivalent','Router role/function wording is preserved.'),
  ('2.1.10','2.1-lo-14','equivalent','Ethernet collision detection/avoidance scope is preserved.'),
  ('2.1.11','2.1-lo-20','equivalent','Bit-streaming scope is preserved.'),
  ('2.1.12','2.1-lo-15','equivalent','Internet versus WWW distinction is preserved.'),
  ('2.1.14','2.1-lo-17','equivalent','IP addressing, including current source-backed subnetting/private/static addressing, remains in IP scope.'),
  ('2.1.15','2.1-lo-19','subtopic_compatible','DNS URL-to-IP resolution is part of the combined current URL/DNS objective.')
), resolved AS (
  SELECT target_lo.id target_lo_id,source_lo.id source_lo_id,c.relation,
         'chapter2-compatibility-0165-audited: '||c.rationale AS evidence
  FROM curated c
  JOIN public.learning_objectives target_lo ON target_lo.code=c.target_code
  JOIN public.subtopics target_st ON target_st.id=target_lo.subtopic_id
  JOIN public.topics target_t ON target_t.id=target_st.topic_id
  JOIN public.syllabi target_s ON target_s.id=target_t.syllabus_id
    AND target_s.code='9618' AND target_s.version_label='2026-2028'
  JOIN public.learning_objectives source_lo ON source_lo.code=c.source_code
  JOIN public.subtopics source_st ON source_st.id=source_lo.subtopic_id
  JOIN public.topics source_t ON source_t.id=source_st.topic_id
  JOIN public.syllabi source_s ON source_s.id=source_t.syllabus_id
    AND source_s.code='9618' AND source_s.version_label IN ('2021-2023','2024-2025')
  WHERE target_st.code='2.1' AND source_st.code='2.1'
)
INSERT INTO public.learning_objective_compatibility(target_lo_id,source_lo_id,relation,evidence)
SELECT target_lo_id,source_lo_id,relation,evidence FROM resolved
ON CONFLICT(target_lo_id,source_lo_id) DO UPDATE
SET relation=EXCLUDED.relation,evidence=EXCLUDED.evidence;

DO $$
DECLARE
  v_current_new integer;
  v_current_old integer;
  v_mixed_dual integer;
  v_historical_new integer;
  v_historical_old integer;
  v_edges integer;
BEGIN
  WITH corrections(display_ref,old_code,new_code) AS (VALUES
    ('9618/13/M/J/26 Q3(c)(ii)','2.1.13','2.1.6'),
    ('9618/12/M/J/26 Q6(d)','2.1.14','2.1.6'),
    ('9618/13/M/J/26 Q3(c)(iii)','2.1.14','2.1.6'),
    ('9618/11/M/J/26 Q7(a)','2.1.2','2.1.4'),
    ('9618/11/M/J/26 Q7(b)(i)','2.1.2','2.1.5'),
    ('9618/11/M/J/26 Q7(b)(ii)','2.1.2','2.1.5'),
    ('9618/11/M/J/26 Q7(c)(i)','2.1.2','2.1.14'),
    ('9618/11/M/J/26 Q7(c)(ii)','2.1.2','2.1.14')
  ), current_los AS (
    SELECT lo.id,lo.code FROM public.learning_objectives lo
    JOIN public.subtopics st ON st.id=lo.subtopic_id
    JOIN public.topics t ON t.id=st.topic_id
    JOIN public.syllabi s ON s.id=t.syllabus_id
    WHERE s.code='9618' AND s.version_label='2026-2028'
  ), resolved AS (
    SELECT q.id question_id,old_lo.id old_lo_id,new_lo.id new_lo_id
    FROM corrections x
    JOIN public.questions q ON q.display_ref=x.display_ref
    JOIN current_los old_lo ON old_lo.code=x.old_code
    JOIN current_los new_lo ON new_lo.code=x.new_code
  )
  SELECT
    count(*) FILTER(WHERE EXISTS(SELECT 1 FROM public.question_learning_objectives qlo WHERE qlo.question_id=r.question_id AND qlo.lo_id=r.new_lo_id AND qlo.confidence=1.0)),
    count(*) FILTER(WHERE EXISTS(SELECT 1 FROM public.question_learning_objectives qlo WHERE qlo.question_id=r.question_id AND qlo.lo_id=r.old_lo_id))
  INTO v_current_new,v_current_old FROM resolved r;
  IF v_current_new<>8 OR v_current_old<>0 THEN
    RAISE EXCEPTION '0165 current postcondition failed: new=% old=%',v_current_new,v_current_old;
  END IF;

  SELECT count(*) INTO v_mixed_dual
  FROM public.questions q
  JOIN public.question_learning_objectives qlo ON qlo.question_id=q.id AND qlo.confidence=1.0
  JOIN public.learning_objectives lo ON lo.id=qlo.lo_id
  JOIN public.subtopics st ON st.id=lo.subtopic_id
  JOIN public.topics t ON t.id=st.topic_id
  JOIN public.syllabi s ON s.id=t.syllabus_id
  WHERE q.display_ref='9618/11/M/J/26 Q7(b)(i)'
    AND s.code='9618' AND s.version_label='2026-2028'
    AND lo.code IN ('2.1.5','2.1.10');
  IF v_mixed_dual<>2 THEN
    RAISE EXCEPTION '0165 mixed bus/Ethernet postcondition failed: rows=% expected=2',v_mixed_dual;
  END IF;

  WITH corrections(display_ref,old_code,new_code) AS (VALUES
    ('9618/12/O/N/22 Q10(b)(i)','2.1-lo-08','2.1-lo-11'),
    ('9618/11/M/J/21 Q4(c)(ii)','2.1-lo-13','2.1-lo-10'),
    ('9618/12/O/N/21 Q3(b)(ii)','2.1-lo-12','2.1-lo-13'),
    ('9618/12/O/N/22 Q10(b)(ii)','2.1-lo-17','2.1-lo-13'),
    ('9618/12/M/J/23 Q1(e)','2.1-lo-17','2.1-lo-05')
  ), historical_los AS (
    SELECT lo.id,lo.code FROM public.learning_objectives lo
    JOIN public.subtopics st ON st.id=lo.subtopic_id
    JOIN public.topics t ON t.id=st.topic_id
    JOIN public.syllabi s ON s.id=t.syllabus_id
    WHERE s.code='9618' AND s.version_label='2021-2023'
  ), resolved AS (
    SELECT q.id question_id,old_lo.id old_lo_id,new_lo.id new_lo_id
    FROM corrections x
    JOIN public.questions q ON q.display_ref=x.display_ref
    JOIN historical_los old_lo ON old_lo.code=x.old_code
    JOIN historical_los new_lo ON new_lo.code=x.new_code
  )
  SELECT
    count(*) FILTER(WHERE EXISTS(SELECT 1 FROM public.question_learning_objectives qlo WHERE qlo.question_id=r.question_id AND qlo.lo_id=r.new_lo_id AND qlo.confidence=1.0)),
    count(*) FILTER(WHERE EXISTS(SELECT 1 FROM public.question_learning_objectives qlo WHERE qlo.question_id=r.question_id AND qlo.lo_id=r.old_lo_id))
  INTO v_historical_new,v_historical_old FROM resolved r;
  IF v_historical_new<>5 OR v_historical_old<>0 THEN
    RAISE EXCEPTION '0165 historical postcondition failed: new=% old=%',v_historical_new,v_historical_old;
  END IF;

  SELECT count(*) INTO v_edges
  FROM public.learning_objective_compatibility c
  JOIN public.learning_objectives target_lo ON target_lo.id=c.target_lo_id
  JOIN public.subtopics target_st ON target_st.id=target_lo.subtopic_id
  JOIN public.topics target_t ON target_t.id=target_st.topic_id
  JOIN public.syllabi target_s ON target_s.id=target_t.syllabus_id
  JOIN public.learning_objectives source_lo ON source_lo.id=c.source_lo_id
  JOIN public.subtopics source_st ON source_st.id=source_lo.subtopic_id
  JOIN public.topics source_t ON source_t.id=source_st.topic_id
  JOIN public.syllabi source_s ON source_s.id=source_t.syllabus_id
  WHERE target_s.code='9618' AND target_s.version_label='2026-2028'
    AND source_s.code='9618' AND source_s.version_label IN ('2021-2023','2024-2025')
    AND c.evidence LIKE 'chapter2-compatibility-0165-audited:%';
  IF v_edges<>27 THEN
    RAISE EXCEPTION '0165 compatibility postcondition failed: edges=% expected=27',v_edges;
  END IF;
END $$;
