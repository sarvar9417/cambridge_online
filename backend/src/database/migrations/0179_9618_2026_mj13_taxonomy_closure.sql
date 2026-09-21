-- 0179_9618_2026_mj13_taxonomy_closure.sql
-- Source-backed taxonomy closure for Cambridge 9618/13/M/J/26.
-- QP SHA256: 7765f3cbe5a098ad57f7ace8396a02f5cc1c979e6bd7b72d7248bb36a79de817
-- MS SHA256: 6f0e5cccc1c236715d60544e058e3620c96e0e29bc51d60c271622c3927ddbcb
-- Syllabus source: Cambridge 9618 syllabus for 2026, Drive 1PvTiGuvynVCkW283YHHIRA5UZGjRrDRw

DO $$
DECLARE
  v_qp uuid; v_ms uuid; v_leaves int; v_edges int;
BEGIN
  SELECT qp.id,ms.id INTO v_qp,v_ms
  FROM public.syllabi sy
  JOIN public.components c ON c.syllabus_id=sy.id AND c.number=1
  JOIN public.source_papers qp ON qp.syllabus_id=sy.id AND qp.component_id=c.id
    AND qp.kind='QP'::paper_kind AND qp.year=2026 AND qp.series='MJ'::exam_series AND qp.variant=3
    AND qp.sha256='7765f3cbe5a098ad57f7ace8396a02f5cc1c979e6bd7b72d7248bb36a79de817'
    AND qp.page_count=16 AND nullif(btrim(coalesce(qp.source_url,'')),'') IS NOT NULL
  JOIN public.source_papers ms ON ms.syllabus_id=sy.id AND ms.component_id=c.id
    AND ms.kind='MS'::paper_kind AND ms.year=qp.year AND ms.series=qp.series AND ms.variant=qp.variant
    AND ms.sha256='6f0e5cccc1c236715d60544e058e3620c96e0e29bc51d60c271622c3927ddbcb'
    AND ms.page_count=16 AND nullif(btrim(coalesce(ms.source_url,'')),'') IS NOT NULL
  WHERE sy.code='9618' AND sy.version_label='2026-2028';

  IF v_qp IS NULL OR v_ms IS NULL THEN
    RAISE EXCEPTION '0179 exact QP/MS source gate failed';
  END IF;

  SELECT count(*) INTO v_leaves FROM public.questions
  WHERE source_paper_id=v_qp AND status='approved' AND marks IS NOT NULL;

  SELECT count(*) INTO v_edges
  FROM public.question_learning_objectives qlo
  JOIN public.questions q ON q.id=qlo.question_id
  WHERE q.source_paper_id=v_qp AND q.status='approved' AND q.marks IS NOT NULL;

  IF v_leaves<>29 OR v_edges<>29 THEN
    RAISE EXCEPTION '0179 precondition failed leaves=% edges=%',v_leaves,v_edges;
  END IF;
END $$;

WITH paper AS (
  SELECT qp.id qp_id,qp.syllabus_id,qp.sha256 qp_sha,qp.source_url qp_url,
         ms.sha256 ms_sha,ms.source_url ms_url
  FROM public.syllabi sy
  JOIN public.components c ON c.syllabus_id=sy.id AND c.number=1
  JOIN public.source_papers qp ON qp.syllabus_id=sy.id AND qp.component_id=c.id
    AND qp.kind='QP'::paper_kind AND qp.year=2026 AND qp.series='MJ'::exam_series AND qp.variant=3
    AND qp.sha256='7765f3cbe5a098ad57f7ace8396a02f5cc1c979e6bd7b72d7248bb36a79de817'
  JOIN public.source_papers ms ON ms.syllabus_id=sy.id AND ms.component_id=c.id
    AND ms.kind='MS'::paper_kind AND ms.year=qp.year AND ms.series=qp.series AND ms.variant=qp.variant
    AND ms.sha256='6f0e5cccc1c236715d60544e058e3620c96e0e29bc51d60c271622c3927ddbcb'
  WHERE sy.code='9618' AND sy.version_label='2026-2028'
), tp(display_ref,new_primary) AS (
  VALUES
  ('9618/13/M/J/26 Q1','6.2'),('9618/13/M/J/26 Q2(a)','3.2'),('9618/13/M/J/26 Q2(b)','3.2'),
  ('9618/13/M/J/26 Q3(a)','1.2'),('9618/13/M/J/26 Q3(b)(i)','1.2'),('9618/13/M/J/26 Q3(b)(ii)','1.2'),
  ('9618/13/M/J/26 Q3(c)(i)','1.3'),('9618/13/M/J/26 Q3(c)(ii)','2.1'),('9618/13/M/J/26 Q3(c)(iii)','2.1'),
  ('9618/13/M/J/26 Q4(a)','8.1'),('9618/13/M/J/26 Q4(b)','8.1'),('9618/13/M/J/26 Q4(c)(i)','8.3'),
  ('9618/13/M/J/26 Q4(c)(ii)','8.3'),('9618/13/M/J/26 Q5(a)(i)','5.1'),('9618/13/M/J/26 Q5(a)(ii)','5.1'),
  ('9618/13/M/J/26 Q5(b)(i)','5.1'),('9618/13/M/J/26 Q5(b)(ii)','5.1'),('9618/13/M/J/26 Q5(c)(i)','5.1'),
  ('9618/13/M/J/26 Q5(c)(ii)','5.1'),('9618/13/M/J/26 Q6(a)','1.1'),('9618/13/M/J/26 Q6(b)','1.1'),
  ('9618/13/M/J/26 Q6(c)','1.1'),('9618/13/M/J/26 Q6(d)','1.1'),('9618/13/M/J/26 Q7(a)','4.2'),
  ('9618/13/M/J/26 Q7(b)','4.3'),('9618/13/M/J/26 Q7(c)','4.3'),('9618/13/M/J/26 Q8(a)','3.1'),
  ('9618/13/M/J/26 Q8(b)','3.1'),('9618/13/M/J/26 Q8(c)','3.1')
), tl(display_ref,lo_code) AS (
  VALUES
  ('9618/13/M/J/26 Q1','6.2.2'),('9618/13/M/J/26 Q1','6.2.3'),
  ('9618/13/M/J/26 Q2(a)','3.2.4'),('9618/13/M/J/26 Q2(b)','3.2.6'),
  ('9618/13/M/J/26 Q3(a)','1.2.6'),('9618/13/M/J/26 Q3(b)(i)','1.2.1'),
  ('9618/13/M/J/26 Q3(b)(ii)','1.2.2'),('9618/13/M/J/26 Q3(c)(i)','1.3.3'),
  ('9618/13/M/J/26 Q3(c)(ii)','2.1.6'),('9618/13/M/J/26 Q3(c)(iii)','2.1.6'),
  ('9618/13/M/J/26 Q4(a)','8.1.7'),('9618/13/M/J/26 Q4(b)','8.1.3'),
  ('9618/13/M/J/26 Q4(c)(i)','8.3.5'),('9618/13/M/J/26 Q4(c)(ii)','8.3.6'),
  ('9618/13/M/J/26 Q5(a)(i)','5.1.2'),('9618/13/M/J/26 Q5(a)(ii)','5.1.2'),
  ('9618/13/M/J/26 Q5(b)(i)','5.1.3'),('9618/13/M/J/26 Q5(b)(ii)','5.1.3'),
  ('9618/13/M/J/26 Q5(c)(i)','5.1.4'),('9618/13/M/J/26 Q5(c)(ii)','5.1.4'),
  ('9618/13/M/J/26 Q6(a)','1.1.3'),('9618/13/M/J/26 Q6(b)','1.1.4'),
  ('9618/13/M/J/26 Q6(c)','1.1.3'),('9618/13/M/J/26 Q6(d)','1.1.2'),
  ('9618/13/M/J/26 Q7(a)','4.2.6'),('9618/13/M/J/26 Q7(b)','4.3.2'),
  ('9618/13/M/J/26 Q7(c)','4.3.1'),('9618/13/M/J/26 Q8(a)','3.1.7'),
  ('9618/13/M/J/26 Q8(b)','3.1.3'),('9618/13/M/J/26 Q8(c)','3.1.4')
), state AS (
  SELECT q.id question_id,q.source_paper_id,q.status::text old_status,q.stem_md,
         os.id old_primary_id,os.code old_primary_code,qs.confidence old_primary_confidence,qs.set_by old_primary_set_by,
         ns.id new_primary_id,tp.new_primary,p.syllabus_id,p.qp_sha,p.qp_url,p.ms_sha,p.ms_url
  FROM tp JOIN paper p ON true
  JOIN public.questions q ON q.display_ref=tp.display_ref AND q.source_paper_id=p.qp_id AND q.status='approved' AND q.marks IS NOT NULL
  JOIN public.question_subtopics qs ON qs.question_id=q.id AND qs.is_primary
  JOIN public.subtopics os ON os.id=qs.subtopic_id
  JOIN public.subtopics ns ON ns.code=tp.new_primary
  JOIN public.topics nt ON nt.id=ns.topic_id AND nt.syllabus_id=p.syllabus_id
), final_state AS (
  SELECT s.*,
    (SELECT jsonb_agg(jsonb_build_object('lo_id',lo.id,'code',lo.code,'confidence',qlo.confidence) ORDER BY lo.code)
     FROM public.question_learning_objectives qlo JOIN public.learning_objectives lo ON lo.id=qlo.lo_id
     WHERE qlo.question_id=s.question_id) old_los,
    (SELECT jsonb_agg(jsonb_build_object('lo_id',lo.id,'code',lo.code,'confidence',1.0) ORDER BY lo.code)
     FROM tl JOIN public.learning_objectives lo ON lo.code=tl.lo_code
     JOIN public.subtopics st ON st.id=lo.subtopic_id
     JOIN public.topics t ON t.id=st.topic_id AND t.syllabus_id=s.syllabus_id
     JOIN public.questions q2 ON q2.id=s.question_id AND q2.display_ref=tl.display_ref) new_los
  FROM state s
)
INSERT INTO public.question_taxonomy_review_history(
  question_id,source_paper_id,review_tag,old_hash,old_status,
  old_primary_subtopic_id,old_primary_subtopic_code,old_primary_confidence,old_primary_set_by,old_los,
  new_primary_subtopic_id,new_primary_subtopic_code,new_primary_confidence,new_los,evidence,source_provenance
)
SELECT question_id,source_paper_id,'manual-source-audit-0179-2026-mj13',
  md5(concat_ws('|',question_id::text,old_status,coalesce(stem_md,''),old_los::text)),
  old_status,old_primary_id,old_primary_code,old_primary_confidence,old_primary_set_by,old_los,
  new_primary_id,new_primary,1.0,new_los,
  jsonb_build_object('method','manual official QP/MS + official Cambridge 9618 syllabus 2026 review','question_status_preserved',true),
  jsonb_build_object('source_backed',true,'qualification','9618','syllabus_version','2026-2028',
    'qp_sha256',qp_sha,'qp_source_url',qp_url,'ms_sha256',ms_sha,'ms_source_url',ms_url,
    'syllabus_source_url','https://drive.google.com/file/d/1PvTiGuvynVCkW283YHHIRA5UZGjRrDRw/view')
FROM final_state s
WHERE NOT EXISTS (
  SELECT 1 FROM public.question_taxonomy_review_history h
  WHERE h.question_id=s.question_id AND h.review_tag='manual-source-audit-0179-2026-mj13'
);

WITH p AS (
  SELECT qp.id FROM public.source_papers qp
  JOIN public.syllabi sy ON sy.id=qp.syllabus_id
  JOIN public.components c ON c.id=qp.component_id
  WHERE sy.code='9618' AND sy.version_label='2026-2028' AND c.number=1
    AND qp.kind='QP'::paper_kind AND qp.year=2026 AND qp.series='MJ'::exam_series AND qp.variant=3
    AND qp.sha256='7765f3cbe5a098ad57f7ace8396a02f5cc1c979e6bd7b72d7248bb36a79de817'
)
DELETE FROM public.question_learning_objectives qlo
USING public.questions q,p
WHERE qlo.question_id=q.id AND q.source_paper_id=p.id AND q.status='approved' AND q.marks IS NOT NULL;

WITH tl(display_ref,lo_code) AS (
  VALUES
  ('9618/13/M/J/26 Q1','6.2.2'),('9618/13/M/J/26 Q1','6.2.3'),
  ('9618/13/M/J/26 Q2(a)','3.2.4'),('9618/13/M/J/26 Q2(b)','3.2.6'),
  ('9618/13/M/J/26 Q3(a)','1.2.6'),('9618/13/M/J/26 Q3(b)(i)','1.2.1'),('9618/13/M/J/26 Q3(b)(ii)','1.2.2'),
  ('9618/13/M/J/26 Q3(c)(i)','1.3.3'),('9618/13/M/J/26 Q3(c)(ii)','2.1.6'),('9618/13/M/J/26 Q3(c)(iii)','2.1.6'),
  ('9618/13/M/J/26 Q4(a)','8.1.7'),('9618/13/M/J/26 Q4(b)','8.1.3'),('9618/13/M/J/26 Q4(c)(i)','8.3.5'),('9618/13/M/J/26 Q4(c)(ii)','8.3.6'),
  ('9618/13/M/J/26 Q5(a)(i)','5.1.2'),('9618/13/M/J/26 Q5(a)(ii)','5.1.2'),('9618/13/M/J/26 Q5(b)(i)','5.1.3'),
  ('9618/13/M/J/26 Q5(b)(ii)','5.1.3'),('9618/13/M/J/26 Q5(c)(i)','5.1.4'),('9618/13/M/J/26 Q5(c)(ii)','5.1.4'),
  ('9618/13/M/J/26 Q6(a)','1.1.3'),('9618/13/M/J/26 Q6(b)','1.1.4'),('9618/13/M/J/26 Q6(c)','1.1.3'),('9618/13/M/J/26 Q6(d)','1.1.2'),
  ('9618/13/M/J/26 Q7(a)','4.2.6'),('9618/13/M/J/26 Q7(b)','4.3.2'),('9618/13/M/J/26 Q7(c)','4.3.1'),
  ('9618/13/M/J/26 Q8(a)','3.1.7'),('9618/13/M/J/26 Q8(b)','3.1.3'),('9618/13/M/J/26 Q8(c)','3.1.4')
), p AS (
  SELECT qp.id,qp.syllabus_id FROM public.source_papers qp
  JOIN public.syllabi sy ON sy.id=qp.syllabus_id
  JOIN public.components c ON c.id=qp.component_id
  WHERE sy.code='9618' AND sy.version_label='2026-2028' AND c.number=1
    AND qp.kind='QP'::paper_kind AND qp.year=2026 AND qp.series='MJ'::exam_series AND qp.variant=3
    AND qp.sha256='7765f3cbe5a098ad57f7ace8396a02f5cc1c979e6bd7b72d7248bb36a79de817'
), r AS (
  SELECT q.id question_id,lo.id lo_id
  FROM tl JOIN p ON true JOIN public.questions q ON q.display_ref=tl.display_ref AND q.source_paper_id=p.id
  JOIN public.learning_objectives lo ON lo.code=tl.lo_code
  JOIN public.subtopics st ON st.id=lo.subtopic_id JOIN public.topics t ON t.id=st.topic_id AND t.syllabus_id=p.syllabus_id
)
INSERT INTO public.question_learning_objectives(question_id,lo_id,confidence)
SELECT question_id,lo_id,1.0 FROM r
ON CONFLICT(question_id,lo_id) DO UPDATE SET confidence=1.0;

WITH p AS (
  SELECT qp.id,qp.syllabus_id FROM public.source_papers qp
  JOIN public.syllabi sy ON sy.id=qp.syllabus_id JOIN public.components c ON c.id=qp.component_id
  WHERE sy.code='9618' AND sy.version_label='2026-2028' AND c.number=1
    AND qp.kind='QP'::paper_kind AND qp.year=2026 AND qp.series='MJ'::exam_series AND qp.variant=3
    AND qp.sha256='7765f3cbe5a098ad57f7ace8396a02f5cc1c979e6bd7b72d7248bb36a79de817'
), r AS (
  SELECT q.id question_id,st.id subtopic_id
  FROM p JOIN public.questions q ON q.source_paper_id=p.id
    AND q.display_ref IN ('9618/13/M/J/26 Q7(b)','9618/13/M/J/26 Q7(c)')
  JOIN public.subtopics st ON st.code='4.3' JOIN public.topics t ON t.id=st.topic_id AND t.syllabus_id=p.syllabus_id
)
DELETE FROM public.question_subtopics qs USING r
WHERE qs.question_id=r.question_id AND qs.is_primary;

WITH p AS (
  SELECT qp.id,qp.syllabus_id FROM public.source_papers qp
  JOIN public.syllabi sy ON sy.id=qp.syllabus_id JOIN public.components c ON c.id=qp.component_id
  WHERE sy.code='9618' AND sy.version_label='2026-2028' AND c.number=1
    AND qp.kind='QP'::paper_kind AND qp.year=2026 AND qp.series='MJ'::exam_series AND qp.variant=3
    AND qp.sha256='7765f3cbe5a098ad57f7ace8396a02f5cc1c979e6bd7b72d7248bb36a79de817'
), r AS (
  SELECT q.id question_id,st.id subtopic_id
  FROM p JOIN public.questions q ON q.source_paper_id=p.id
    AND q.display_ref IN ('9618/13/M/J/26 Q7(b)','9618/13/M/J/26 Q7(c)')
  JOIN public.subtopics st ON st.code='4.3' JOIN public.topics t ON t.id=st.topic_id AND t.syllabus_id=p.syllabus_id
)
INSERT INTO public.question_subtopics(question_id,subtopic_id,is_primary,weight,confidence,set_by)
SELECT question_id,subtopic_id,true,1.0,1.0,'manual-source-audit-0179' FROM r
ON CONFLICT(question_id,subtopic_id)
DO UPDATE SET is_primary=true,weight=1.0,confidence=1.0,set_by='manual-source-audit-0179';

WITH p AS (
  SELECT qp.id FROM public.source_papers qp
  JOIN public.syllabi sy ON sy.id=qp.syllabus_id JOIN public.components c ON c.id=qp.component_id
  WHERE sy.code='9618' AND sy.version_label='2026-2028' AND c.number=1
    AND qp.kind='QP'::paper_kind AND qp.year=2026 AND qp.series='MJ'::exam_series AND qp.variant=3
    AND qp.sha256='7765f3cbe5a098ad57f7ace8396a02f5cc1c979e6bd7b72d7248bb36a79de817'
)
UPDATE public.question_subtopics qs SET confidence=1.0,set_by='manual-source-audit-0179'
FROM public.questions q,p
WHERE qs.question_id=q.id AND qs.is_primary AND q.source_paper_id=p.id
  AND q.status='approved' AND q.marks IS NOT NULL AND qs.confidence<0.95;

DO $$
DECLARE
  v_qp uuid; v_history int; v_edges int; v_low_p int; v_low_lo int; v_bad int;
BEGIN
  SELECT qp.id INTO v_qp
  FROM public.source_papers qp JOIN public.syllabi sy ON sy.id=qp.syllabus_id
  JOIN public.components c ON c.id=qp.component_id
  WHERE sy.code='9618' AND sy.version_label='2026-2028' AND c.number=1
    AND qp.kind='QP'::paper_kind AND qp.year=2026 AND qp.series='MJ'::exam_series AND qp.variant=3
    AND qp.sha256='7765f3cbe5a098ad57f7ace8396a02f5cc1c979e6bd7b72d7248bb36a79de817';

  SELECT count(*) INTO v_history FROM public.question_taxonomy_review_history h
  JOIN public.questions q ON q.id=h.question_id
  WHERE q.source_paper_id=v_qp AND h.review_tag='manual-source-audit-0179-2026-mj13';

  SELECT count(*) INTO v_edges FROM public.question_learning_objectives qlo
  JOIN public.questions q ON q.id=qlo.question_id
  WHERE q.source_paper_id=v_qp AND q.status='approved' AND q.marks IS NOT NULL;

  SELECT count(*) INTO v_low_p FROM public.questions q
  WHERE q.source_paper_id=v_qp AND q.status='approved' AND q.marks IS NOT NULL
    AND EXISTS(SELECT 1 FROM public.question_subtopics qs WHERE qs.question_id=q.id AND qs.is_primary AND coalesce(qs.confidence,0)<0.95);

  SELECT count(*) INTO v_low_lo FROM public.questions q
  WHERE q.source_paper_id=v_qp AND q.status='approved' AND q.marks IS NOT NULL
    AND EXISTS(SELECT 1 FROM public.question_learning_objectives qlo WHERE qlo.question_id=q.id AND coalesce(qlo.confidence,0)<0.95);

  SELECT count(*) INTO v_bad
  FROM public.questions q JOIN public.question_subtopics qs ON qs.question_id=q.id AND qs.is_primary
  JOIN public.subtopics st ON st.id=qs.subtopic_id
  WHERE q.source_paper_id=v_qp
    AND q.display_ref IN ('9618/13/M/J/26 Q7(b)','9618/13/M/J/26 Q7(c)')
    AND (st.code<>'4.3' OR qs.confidence<>1.0);

  IF v_history<>29 OR v_edges<>30 OR v_low_p<>0 OR v_low_lo<>0 OR v_bad<>0 THEN
    RAISE EXCEPTION '0179 closure failed history=% edges=% low_primary=% low_lo=% bad=%',
      v_history,v_edges,v_low_p,v_low_lo,v_bad;
  END IF;
END $$;
