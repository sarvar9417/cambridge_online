-- 0187_9618_2026_mj42_taxonomy_closure.sql
-- Source-backed taxonomy closure for Cambridge 9618/42/M/J/26.
-- QP SHA256: ead73d2f389cd10d7e25b16488b7dbb8744a159fc726dbc910c6684d01c48210
-- MS SHA256: 3fca3093a0d5631552eb8edecdac406850f26526b4624dd0979f50dbcbc137dd
-- Official syllabus: Cambridge 9618 syllabus for 2026, Drive 1PvTiGuvynVCkW283YHHIRA5UZGjRrDRw
--
-- All 24 approved scoring leaves are manually adjudicated against the QP,
-- published MS, official syllabus, and source-reviewed 2025 Paper 4 precedents.
-- Question wording, LaTeX, marks, MS content, assets and source identity are untouched.

DO $$
DECLARE v_qp uuid; v_ms uuid; v_leaves int; v_edges int;
BEGIN
  SELECT qp.id,ms.id INTO v_qp,v_ms
  FROM public.syllabi sy
  JOIN public.components c ON c.syllabus_id=sy.id AND c.number=4
  JOIN public.source_papers qp ON qp.syllabus_id=sy.id AND qp.component_id=c.id
    AND qp.kind='QP'::paper_kind AND qp.year=2026 AND qp.series='MJ'::exam_series AND qp.variant=2
    AND qp.sha256='ead73d2f389cd10d7e25b16488b7dbb8744a159fc726dbc910c6684d01c48210'
    AND qp.page_count=12 AND nullif(btrim(coalesce(qp.source_url,'')),'') IS NOT NULL
  JOIN public.source_papers ms ON ms.syllabus_id=sy.id AND ms.component_id=c.id
    AND ms.kind='MS'::paper_kind AND ms.year=qp.year AND ms.series=qp.series AND ms.variant=qp.variant
    AND ms.sha256='3fca3093a0d5631552eb8edecdac406850f26526b4624dd0979f50dbcbc137dd'
    AND ms.page_count=41 AND nullif(btrim(coalesce(ms.source_url,'')),'') IS NOT NULL
  WHERE sy.code='9618' AND sy.version_label='2026-2028';

  IF v_qp IS NULL OR v_ms IS NULL THEN
    RAISE EXCEPTION '0187 exact 9618/42/M/J/26 QP/MS source gate failed';
  END IF;

  SELECT count(*) INTO v_leaves
  FROM public.questions
  WHERE source_paper_id=v_qp AND status='approved' AND marks IS NOT NULL;

  SELECT count(*) INTO v_edges
  FROM public.question_learning_objectives qlo
  JOIN public.questions q ON q.id=qlo.question_id
  WHERE q.source_paper_id=v_qp AND q.status='approved' AND q.marks IS NOT NULL;

  IF v_leaves<>24 OR v_edges<>24 THEN
    RAISE EXCEPTION '0187 precondition failed leaves=% edges=% expected=24/24',v_leaves,v_edges;
  END IF;
END $$;

WITH paper AS (
  SELECT qp.id qp_id,qp.syllabus_id,qp.sha256 qp_sha,qp.source_url qp_url,
         ms.sha256 ms_sha,ms.source_url ms_url
  FROM public.syllabi sy
  JOIN public.components c ON c.syllabus_id=sy.id AND c.number=4
  JOIN public.source_papers qp ON qp.syllabus_id=sy.id AND qp.component_id=c.id
    AND qp.kind='QP'::paper_kind AND qp.year=2026 AND qp.series='MJ'::exam_series AND qp.variant=2
    AND qp.sha256='ead73d2f389cd10d7e25b16488b7dbb8744a159fc726dbc910c6684d01c48210'
  JOIN public.source_papers ms ON ms.syllabus_id=sy.id AND ms.component_id=c.id
    AND ms.kind='MS'::paper_kind AND ms.year=qp.year AND ms.series=qp.series AND ms.variant=qp.variant
    AND ms.sha256='3fca3093a0d5631552eb8edecdac406850f26526b4624dd0979f50dbcbc137dd'
  WHERE sy.code='9618' AND sy.version_label='2026-2028'
), tp(display_ref,new_primary) AS (
  VALUES
    ('9618/42/M/J/26 Q1(a)','20.1'),
    ('9618/42/M/J/26 Q1(b)(i)','20.1'),
    ('9618/42/M/J/26 Q1(b)(ii)','20.1'),
    ('9618/42/M/J/26 Q1(b)(iii)','20.1'),
    ('9618/42/M/J/26 Q1(c)(i)','19.1'),
    ('9618/42/M/J/26 Q1(c)(ii)','19.1'),
    ('9618/42/M/J/26 Q1(c)(iii)','19.1'),

    ('9618/42/M/J/26 Q2(a)(i)','20.1'),
    ('9618/42/M/J/26 Q2(a)(ii)','20.1'),
    ('9618/42/M/J/26 Q2(a)(iii)','20.1'),
    ('9618/42/M/J/26 Q2(b)(i)','20.2'),
    ('9618/42/M/J/26 Q2(b)(ii)','20.2'),
    ('9618/42/M/J/26 Q2(c)(i)','20.1'),
    ('9618/42/M/J/26 Q2(c)(ii)','20.1'),
    ('9618/42/M/J/26 Q2(d)(i)','20.1'),
    ('9618/42/M/J/26 Q2(d)(ii)','20.1'),

    ('9618/42/M/J/26 Q3(a)','19.1'),
    ('9618/42/M/J/26 Q3(b)(i)','19.1'),
    ('9618/42/M/J/26 Q3(b)(ii)','19.1'),
    ('9618/42/M/J/26 Q3(b)(iii)','19.1'),
    ('9618/42/M/J/26 Q3(b)(iv)','19.1'),
    ('9618/42/M/J/26 Q3(c)(i)','19.1'),
    ('9618/42/M/J/26 Q3(c)(ii)','19.1'),
    ('9618/42/M/J/26 Q3(c)(iii)','19.1')
), tl(display_ref,lo_code) AS (
  VALUES
    ('9618/42/M/J/26 Q1(a)','20.1.1'),
    ('9618/42/M/J/26 Q1(b)(i)','20.1.1'),
    ('9618/42/M/J/26 Q1(b)(ii)','20.1.1'),
    ('9618/42/M/J/26 Q1(b)(iii)','20.1.1'),
    ('9618/42/M/J/26 Q1(c)(i)','19.1.2'),
    ('9618/42/M/J/26 Q1(c)(ii)','19.1.2'),
    ('9618/42/M/J/26 Q1(c)(iii)','19.1.2'),

    ('9618/42/M/J/26 Q2(a)(i)','20.1.1'),
    ('9618/42/M/J/26 Q2(a)(ii)','20.1.1'),
    ('9618/42/M/J/26 Q2(a)(iii)','20.1.1'),
    ('9618/42/M/J/26 Q2(b)(i)','20.2.1'),
    ('9618/42/M/J/26 Q2(b)(i)','20.2.4'),
    ('9618/42/M/J/26 Q2(b)(ii)','20.2.1'),
    ('9618/42/M/J/26 Q2(c)(i)','20.1.1'),
    ('9618/42/M/J/26 Q2(c)(ii)','20.1.1'),
    ('9618/42/M/J/26 Q2(d)(i)','20.1.1'),
    ('9618/42/M/J/26 Q2(d)(ii)','20.1.1'),

    ('9618/42/M/J/26 Q3(a)','19.1.4'),
    ('9618/42/M/J/26 Q3(b)(i)','19.1.4'),
    ('9618/42/M/J/26 Q3(b)(ii)','19.1.4'),
    ('9618/42/M/J/26 Q3(b)(iii)','19.1.4'),
    ('9618/42/M/J/26 Q3(b)(iv)','19.1.4'),
    ('9618/42/M/J/26 Q3(c)(i)','19.1.3'),
    ('9618/42/M/J/26 Q3(c)(ii)','19.1.3'),
    ('9618/42/M/J/26 Q3(c)(iii)','19.1.3')
), state AS (
  SELECT q.id question_id,q.source_paper_id,q.status::text old_status,q.stem_md,
         old_st.id old_primary_id,old_st.code old_primary_code,
         qs.confidence old_primary_confidence,qs.set_by old_primary_set_by,
         new_st.id new_primary_id,tp.new_primary,
         p.syllabus_id,p.qp_sha,p.qp_url,p.ms_sha,p.ms_url
  FROM tp
  JOIN paper p ON true
  JOIN public.questions q ON q.display_ref=tp.display_ref
    AND q.source_paper_id=p.qp_id
    AND q.status='approved'
    AND q.marks IS NOT NULL
  JOIN public.question_subtopics qs ON qs.question_id=q.id AND qs.is_primary
  JOIN public.subtopics old_st ON old_st.id=qs.subtopic_id
  JOIN public.subtopics new_st ON new_st.code=tp.new_primary
  JOIN public.topics nt ON nt.id=new_st.topic_id AND nt.syllabus_id=p.syllabus_id
), final_state AS (
  SELECT s.*,
    (SELECT jsonb_agg(
      jsonb_build_object('lo_id',lo.id,'code',lo.code,'confidence',qlo.confidence)
      ORDER BY lo.code)
     FROM public.question_learning_objectives qlo
     JOIN public.learning_objectives lo ON lo.id=qlo.lo_id
     WHERE qlo.question_id=s.question_id) old_los,
    (SELECT jsonb_agg(
      jsonb_build_object('lo_id',lo.id,'code',lo.code,'confidence',1.0)
      ORDER BY lo.code)
     FROM tl
     JOIN public.learning_objectives lo ON lo.code=tl.lo_code
     JOIN public.subtopics st ON st.id=lo.subtopic_id
     JOIN public.topics t ON t.id=st.topic_id AND t.syllabus_id=s.syllabus_id
     JOIN public.questions q2 ON q2.id=s.question_id AND q2.display_ref=tl.display_ref) new_los
  FROM state s
)
INSERT INTO public.question_taxonomy_review_history(
  question_id,source_paper_id,review_tag,old_hash,old_status,
  old_primary_subtopic_id,old_primary_subtopic_code,old_primary_confidence,old_primary_set_by,old_los,
  new_primary_subtopic_id,new_primary_subtopic_code,new_primary_confidence,new_los,
  evidence,source_provenance
)
SELECT
  question_id,source_paper_id,'manual-source-audit-0187-2026-mj42',
  md5(concat_ws('|',question_id::text,old_status,coalesce(stem_md,''),old_los::text)),
  old_status,
  old_primary_id,old_primary_code,old_primary_confidence,old_primary_set_by,old_los,
  new_primary_id,new_primary,1.0,new_los,
  jsonb_build_object(
    'method','manual QP/MS + official 2026 syllabus + reviewed 2025 Paper 4 precedent',
    'question_status_preserved',true
  ),
  jsonb_build_object(
    'source_backed',true,'qualification','9618','syllabus_version','2026-2028',
    'qp_filename','9618_s26_qp_42.pdf','qp_sha256',qp_sha,'qp_source_url',qp_url,
    'ms_filename','9618_s26_ms_42.pdf','ms_sha256',ms_sha,'ms_source_url',ms_url,
    'syllabus_source_url','https://drive.google.com/file/d/1PvTiGuvynVCkW283YHHIRA5UZGjRrDRw/view',
    'precedent','2025 source-reviewed Paper 4 sorting/file/OOP/ADT mappings'
  )
FROM final_state s
WHERE NOT EXISTS (
  SELECT 1 FROM public.question_taxonomy_review_history h
  WHERE h.question_id=s.question_id
    AND h.review_tag='manual-source-audit-0187-2026-mj42'
);

WITH p AS (
  SELECT qp.id
  FROM public.source_papers qp
  JOIN public.syllabi sy ON sy.id=qp.syllabus_id
  JOIN public.components c ON c.id=qp.component_id
  WHERE sy.code='9618' AND sy.version_label='2026-2028'
    AND c.number=4
    AND qp.kind='QP'::paper_kind
    AND qp.year=2026 AND qp.series='MJ'::exam_series AND qp.variant=2
    AND qp.sha256='ead73d2f389cd10d7e25b16488b7dbb8744a159fc726dbc910c6684d01c48210'
)
DELETE FROM public.question_learning_objectives qlo
USING public.questions q,p
WHERE qlo.question_id=q.id
  AND q.source_paper_id=p.id
  AND q.status='approved'
  AND q.marks IS NOT NULL;

WITH tl(display_ref,lo_code) AS (
  VALUES
    ('9618/42/M/J/26 Q1(a)','20.1.1'),
    ('9618/42/M/J/26 Q1(b)(i)','20.1.1'),
    ('9618/42/M/J/26 Q1(b)(ii)','20.1.1'),
    ('9618/42/M/J/26 Q1(b)(iii)','20.1.1'),
    ('9618/42/M/J/26 Q1(c)(i)','19.1.2'),
    ('9618/42/M/J/26 Q1(c)(ii)','19.1.2'),
    ('9618/42/M/J/26 Q1(c)(iii)','19.1.2'),
    ('9618/42/M/J/26 Q2(a)(i)','20.1.1'),
    ('9618/42/M/J/26 Q2(a)(ii)','20.1.1'),
    ('9618/42/M/J/26 Q2(a)(iii)','20.1.1'),
    ('9618/42/M/J/26 Q2(b)(i)','20.2.1'),
    ('9618/42/M/J/26 Q2(b)(i)','20.2.4'),
    ('9618/42/M/J/26 Q2(b)(ii)','20.2.1'),
    ('9618/42/M/J/26 Q2(c)(i)','20.1.1'),
    ('9618/42/M/J/26 Q2(c)(ii)','20.1.1'),
    ('9618/42/M/J/26 Q2(d)(i)','20.1.1'),
    ('9618/42/M/J/26 Q2(d)(ii)','20.1.1'),
    ('9618/42/M/J/26 Q3(a)','19.1.4'),
    ('9618/42/M/J/26 Q3(b)(i)','19.1.4'),
    ('9618/42/M/J/26 Q3(b)(ii)','19.1.4'),
    ('9618/42/M/J/26 Q3(b)(iii)','19.1.4'),
    ('9618/42/M/J/26 Q3(b)(iv)','19.1.4'),
    ('9618/42/M/J/26 Q3(c)(i)','19.1.3'),
    ('9618/42/M/J/26 Q3(c)(ii)','19.1.3'),
    ('9618/42/M/J/26 Q3(c)(iii)','19.1.3')
), p AS (
  SELECT qp.id,qp.syllabus_id
  FROM public.source_papers qp
  JOIN public.syllabi sy ON sy.id=qp.syllabus_id
  JOIN public.components c ON c.id=qp.component_id
  WHERE sy.code='9618' AND sy.version_label='2026-2028'
    AND c.number=4
    AND qp.kind='QP'::paper_kind
    AND qp.year=2026 AND qp.series='MJ'::exam_series AND qp.variant=2
    AND qp.sha256='ead73d2f389cd10d7e25b16488b7dbb8744a159fc726dbc910c6684d01c48210'
), r AS (
  SELECT q.id question_id,lo.id lo_id
  FROM tl
  JOIN p ON true
  JOIN public.questions q ON q.display_ref=tl.display_ref AND q.source_paper_id=p.id
  JOIN public.learning_objectives lo ON lo.code=tl.lo_code
  JOIN public.subtopics st ON st.id=lo.subtopic_id
  JOIN public.topics t ON t.id=st.topic_id AND t.syllabus_id=p.syllabus_id
)
INSERT INTO public.question_learning_objectives(question_id,lo_id,confidence)
SELECT question_id,lo_id,1.0
FROM r
ON CONFLICT(question_id,lo_id) DO UPDATE SET confidence=1.0;

WITH p AS (
  SELECT qp.id
  FROM public.source_papers qp
  JOIN public.syllabi sy ON sy.id=qp.syllabus_id
  JOIN public.components c ON c.id=qp.component_id
  WHERE sy.code='9618' AND sy.version_label='2026-2028'
    AND c.number=4
    AND qp.kind='QP'::paper_kind
    AND qp.year=2026 AND qp.series='MJ'::exam_series AND qp.variant=2
    AND qp.sha256='ead73d2f389cd10d7e25b16488b7dbb8744a159fc726dbc910c6684d01c48210'
)
DELETE FROM public.question_subtopics qs
USING public.questions q,p
WHERE qs.question_id=q.id
  AND q.source_paper_id=p.id
  AND q.status='approved'
  AND q.marks IS NOT NULL
  AND qs.is_primary;

WITH tp(display_ref,new_primary) AS (
  VALUES
    ('9618/42/M/J/26 Q1(a)','20.1'),('9618/42/M/J/26 Q1(b)(i)','20.1'),
    ('9618/42/M/J/26 Q1(b)(ii)','20.1'),('9618/42/M/J/26 Q1(b)(iii)','20.1'),
    ('9618/42/M/J/26 Q1(c)(i)','19.1'),('9618/42/M/J/26 Q1(c)(ii)','19.1'),('9618/42/M/J/26 Q1(c)(iii)','19.1'),
    ('9618/42/M/J/26 Q2(a)(i)','20.1'),('9618/42/M/J/26 Q2(a)(ii)','20.1'),('9618/42/M/J/26 Q2(a)(iii)','20.1'),
    ('9618/42/M/J/26 Q2(b)(i)','20.2'),('9618/42/M/J/26 Q2(b)(ii)','20.2'),
    ('9618/42/M/J/26 Q2(c)(i)','20.1'),('9618/42/M/J/26 Q2(c)(ii)','20.1'),
    ('9618/42/M/J/26 Q2(d)(i)','20.1'),('9618/42/M/J/26 Q2(d)(ii)','20.1'),
    ('9618/42/M/J/26 Q3(a)','19.1'),('9618/42/M/J/26 Q3(b)(i)','19.1'),
    ('9618/42/M/J/26 Q3(b)(ii)','19.1'),('9618/42/M/J/26 Q3(b)(iii)','19.1'),
    ('9618/42/M/J/26 Q3(b)(iv)','19.1'),('9618/42/M/J/26 Q3(c)(i)','19.1'),
    ('9618/42/M/J/26 Q3(c)(ii)','19.1'),('9618/42/M/J/26 Q3(c)(iii)','19.1')
), p AS (
  SELECT qp.id,qp.syllabus_id
  FROM public.source_papers qp
  JOIN public.syllabi sy ON sy.id=qp.syllabus_id
  JOIN public.components c ON c.id=qp.component_id
  WHERE sy.code='9618' AND sy.version_label='2026-2028'
    AND c.number=4
    AND qp.kind='QP'::paper_kind
    AND qp.year=2026 AND qp.series='MJ'::exam_series AND qp.variant=2
    AND qp.sha256='ead73d2f389cd10d7e25b16488b7dbb8744a159fc726dbc910c6684d01c48210'
), r AS (
  SELECT q.id question_id,st.id subtopic_id
  FROM tp
  JOIN p ON true
  JOIN public.questions q ON q.display_ref=tp.display_ref AND q.source_paper_id=p.id
  JOIN public.subtopics st ON st.code=tp.new_primary
  JOIN public.topics t ON t.id=st.topic_id AND t.syllabus_id=p.syllabus_id
)
INSERT INTO public.question_subtopics(question_id,subtopic_id,is_primary,weight,confidence,set_by)
SELECT question_id,subtopic_id,true,1.0,1.0,'manual-source-audit-0187'
FROM r
ON CONFLICT(question_id,subtopic_id)
DO UPDATE SET is_primary=true,weight=1.0,confidence=1.0,set_by='manual-source-audit-0187';

DO $$
DECLARE
  v_qp uuid; v_history int; v_edges int; v_primary int; v_low_p int; v_low_lo int;
  v_sort int; v_file int; v_generic int; v_add int;
BEGIN
  SELECT qp.id INTO v_qp
  FROM public.source_papers qp
  JOIN public.syllabi sy ON sy.id=qp.syllabus_id
  JOIN public.components c ON c.id=qp.component_id
  WHERE sy.code='9618' AND sy.version_label='2026-2028'
    AND c.number=4
    AND qp.kind='QP'::paper_kind
    AND qp.year=2026 AND qp.series='MJ'::exam_series AND qp.variant=2
    AND qp.sha256='ead73d2f389cd10d7e25b16488b7dbb8744a159fc726dbc910c6684d01c48210';

  SELECT count(*) INTO v_history
  FROM public.question_taxonomy_review_history h
  JOIN public.questions q ON q.id=h.question_id
  WHERE q.source_paper_id=v_qp
    AND h.review_tag='manual-source-audit-0187-2026-mj42';

  SELECT count(*) INTO v_edges
  FROM public.question_learning_objectives qlo
  JOIN public.questions q ON q.id=qlo.question_id
  WHERE q.source_paper_id=v_qp AND q.status='approved' AND q.marks IS NOT NULL;

  SELECT count(*) INTO v_primary
  FROM public.question_subtopics qs
  JOIN public.questions q ON q.id=qs.question_id
  WHERE q.source_paper_id=v_qp AND q.status='approved' AND q.marks IS NOT NULL AND qs.is_primary;

  SELECT count(*) INTO v_low_p
  FROM public.questions q
  WHERE q.source_paper_id=v_qp AND q.status='approved' AND q.marks IS NOT NULL
    AND EXISTS(SELECT 1 FROM public.question_subtopics qs
               WHERE qs.question_id=q.id AND qs.is_primary AND coalesce(qs.confidence,0)<0.95);

  SELECT count(*) INTO v_low_lo
  FROM public.questions q
  WHERE q.source_paper_id=v_qp AND q.status='approved' AND q.marks IS NOT NULL
    AND EXISTS(SELECT 1 FROM public.question_learning_objectives qlo
               WHERE qlo.question_id=q.id AND coalesce(qlo.confidence,0)<0.95);

  SELECT count(*) INTO v_sort
  FROM public.questions q
  JOIN public.question_learning_objectives qlo ON qlo.question_id=q.id AND qlo.confidence=1.0
  JOIN public.learning_objectives lo ON lo.id=qlo.lo_id
  WHERE q.source_paper_id=v_qp
    AND q.display_ref IN ('9618/42/M/J/26 Q1(c)(i)','9618/42/M/J/26 Q1(c)(ii)','9618/42/M/J/26 Q1(c)(iii)')
    AND lo.code='19.1.2';

  SELECT count(*) INTO v_file
  FROM public.questions q
  JOIN public.question_learning_objectives qlo ON qlo.question_id=q.id AND qlo.confidence=1.0
  JOIN public.learning_objectives lo ON lo.id=qlo.lo_id
  WHERE q.source_paper_id=v_qp AND q.display_ref='9618/42/M/J/26 Q2(b)(i)'
    AND lo.code IN ('20.2.1','20.2.4');

  SELECT count(*) INTO v_generic
  FROM public.questions q
  JOIN public.question_subtopics qs ON qs.question_id=q.id AND qs.is_primary
  JOIN public.subtopics st ON st.id=qs.subtopic_id
  JOIN public.question_learning_objectives qlo ON qlo.question_id=q.id AND qlo.confidence=1.0
  JOIN public.learning_objectives lo ON lo.id=qlo.lo_id
  WHERE q.source_paper_id=v_qp AND q.display_ref='9618/42/M/J/26 Q1(b)(ii)'
    AND st.code='20.1' AND lo.code='20.1.1';

  SELECT count(*) INTO v_add
  FROM public.questions q
  JOIN public.question_learning_objectives qlo ON qlo.question_id=q.id AND qlo.confidence=1.0
  JOIN public.learning_objectives lo ON lo.id=qlo.lo_id
  WHERE q.source_paper_id=v_qp
    AND q.display_ref IN ('9618/42/M/J/26 Q3(c)(i)','9618/42/M/J/26 Q3(c)(ii)','9618/42/M/J/26 Q3(c)(iii)')
    AND lo.code='19.1.3';

  IF v_history<>24 OR v_edges<>25 OR v_primary<>24 OR v_low_p<>0 OR v_low_lo<>0
     OR v_sort<>3 OR v_file<>2 OR v_generic<>1 OR v_add<>3 THEN
    RAISE EXCEPTION
      '0187 closure failed history=% edges=% primary=% low_primary=% low_lo=% sort=% file=% generic=% add=%',
      v_history,v_edges,v_primary,v_low_p,v_low_lo,v_sort,v_file,v_generic,v_add;
  END IF;
END $$;
