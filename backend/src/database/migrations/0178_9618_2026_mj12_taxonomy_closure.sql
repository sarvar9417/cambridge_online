-- 0178_9618_2026_mj12_taxonomy_closure.sql
-- Source-backed closure of Cambridge 9618/12/M/J/26 taxonomy.
--
-- Evidence:
--   QP 9618_s26_qp_12.pdf
--     SHA-256 7f5625eb0e81c56fe770949a4254452f58753b92d6540c7b39cec031da448ffd
--   MS 9618_s26_ms_12.pdf
--     SHA-256 23703287e6f7f128e8176bad82b3f81d31cd602e7849107b3afcac026766fca2
--   Cambridge International AS & A Level Computer Science 9618 syllabus for 2026
--     Drive file 1PvTiGuvynVCkW283YHHIRA5UZGjRrDRw
--
-- All 28 approved scoring leaves are adjudicated. The repair corrects
-- objective identities where the existing conservative classifier selected a
-- neighbouring objective; it also records legitimate multi-objective coverage
-- for Q2(c)(i), Q2(c)(ii) and Q5(b). Q5(b) becomes primarily bit manipulation
-- because two of its three marks assess binary shifts.
--
-- No question wording, LaTeX, marks, mark-scheme content, assets, source
-- identity or dependencies are changed.

DO $$
DECLARE
  v_qp uuid;
  v_ms uuid;
  v_leaves integer;
  v_lo_edges integer;
BEGIN
  SELECT qp.id,ms.id INTO v_qp,v_ms
  FROM public.syllabi sy
  JOIN public.components c ON c.syllabus_id=sy.id AND c.number=1
  JOIN public.source_papers qp
    ON qp.syllabus_id=sy.id AND qp.component_id=c.id
   AND qp.kind='QP'::paper_kind
   AND qp.year=2026 AND qp.series='MJ'::exam_series AND qp.variant=2
   AND qp.sha256='7f5625eb0e81c56fe770949a4254452f58753b92d6540c7b39cec031da448ffd'
   AND qp.page_count=16
   AND nullif(btrim(coalesce(qp.source_url,'')),'') IS NOT NULL
  JOIN public.source_papers ms
    ON ms.syllabus_id=sy.id AND ms.component_id=c.id
   AND ms.kind='MS'::paper_kind
   AND ms.year=qp.year AND ms.series=qp.series AND ms.variant=qp.variant
   AND ms.sha256='23703287e6f7f128e8176bad82b3f81d31cd602e7849107b3afcac026766fca2'
   AND ms.page_count=17
   AND nullif(btrim(coalesce(ms.source_url,'')),'') IS NOT NULL
  WHERE sy.code='9618' AND sy.version_label='2026-2028';

  IF v_qp IS NULL OR v_ms IS NULL THEN
    RAISE EXCEPTION '0178 exact 9618/12/M/J/26 QP/MS source gate failed';
  END IF;

  SELECT count(*) INTO v_leaves
  FROM public.questions q
  WHERE q.source_paper_id=v_qp AND q.status='approved' AND q.marks IS NOT NULL;

  SELECT count(*) INTO v_lo_edges
  FROM public.question_learning_objectives qlo
  JOIN public.questions q ON q.id=qlo.question_id
  WHERE q.source_paper_id=v_qp AND q.status='approved' AND q.marks IS NOT NULL;

  IF v_leaves<>28 OR v_lo_edges<>28 THEN
    RAISE EXCEPTION '0178 Paper12 precondition failed: leaves=% lo_edges=% expected=28/28',v_leaves,v_lo_edges;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.questions q
    WHERE q.source_paper_id=v_qp AND q.status='approved' AND q.marks IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.question_subtopics qs
        WHERE qs.question_id=q.id AND qs.is_primary AND qs.confidence<0.95
      )
  ) THEN
    RAISE EXCEPTION '0178 Paper12 primary-confidence precondition drifted';
  END IF;
END $$;

-- Record the complete before/after taxonomy state for all 28 leaves.
WITH paper AS (
  SELECT qp.id qp_id,qp.syllabus_id,qp.sha256 qp_sha,qp.source_url qp_url,
         ms.sha256 ms_sha,ms.source_url ms_url
  FROM public.syllabi sy
  JOIN public.components c ON c.syllabus_id=sy.id AND c.number=1
  JOIN public.source_papers qp
    ON qp.syllabus_id=sy.id AND qp.component_id=c.id
   AND qp.kind='QP'::paper_kind AND qp.year=2026
   AND qp.series='MJ'::exam_series AND qp.variant=2
   AND qp.sha256='7f5625eb0e81c56fe770949a4254452f58753b92d6540c7b39cec031da448ffd'
  JOIN public.source_papers ms
    ON ms.syllabus_id=sy.id AND ms.component_id=c.id
   AND ms.kind='MS'::paper_kind AND ms.year=qp.year
   AND ms.series=qp.series AND ms.variant=qp.variant
   AND ms.sha256='23703287e6f7f128e8176bad82b3f81d31cd602e7849107b3afcac026766fca2'
  WHERE sy.code='9618' AND sy.version_label='2026-2028'
), target_primary(display_ref,new_primary,rationale) AS (
  VALUES
    ('9618/12/M/J/26 Q1(a)','1.2','Pixel definition is part of bitmap-image encoding terminology.'),
    ('9618/12/M/J/26 Q1(b)','1.2','Image resolution and screen resolution are bitmap-image terminology in the syllabus guidance.'),
    ('9618/12/M/J/26 Q1(c)','1.2','Bitmap file-header contents are part of bitmap-image encoding.'),
    ('9618/12/M/J/26 Q1(d)(i)','1.2','Minimum bit depth is determined from the number of colours in the bitmap.'),
    ('9618/12/M/J/26 Q1(d)(ii)','1.3','The task explicitly applies lossless RLE compression to the supplied bitmap.'),
    ('9618/12/M/J/26 Q2(a)','6.2','The task explicitly assesses verification methods during data entry.'),
    ('9618/12/M/J/26 Q2(b)','6.2','The task explicitly applies validation methods to a date-of-birth field.'),
    ('9618/12/M/J/26 Q2(c)(i)','6.1','The task assesses a virus as a security threat and a method that restricts the risk.'),
    ('9618/12/M/J/26 Q2(c)(ii)','6.1','The task assesses a hacker as a security threat and a method that restricts the risk.'),
    ('9618/12/M/J/26 Q3(a)','8.1','The task asks for cardinality/relationships among database entities.'),
    ('9618/12/M/J/26 Q3(b)(i)','8.3','The task requires diagnosing and correcting SQL DDL statements.'),
    ('9618/12/M/J/26 Q3(b)(ii)','8.3','The task requires an SQL DML query over two tables.'),
    ('9618/12/M/J/26 Q3(c)','8.2','The task assesses DBMS tools/features including the data dictionary, schema, access rights and developer interface.'),
    ('9618/12/M/J/26 Q4(a)','1.2','The task asks what sampling rate means in sound representation.'),
    ('9618/12/M/J/26 Q4(b)','1.2','The task asks for effects of changing sampling resolution.'),
    ('9618/12/M/J/26 Q5(a)','1.1','The task converts between denary, unsigned binary, hexadecimal and BCD representations.'),
    ('9618/12/M/J/26 Q5(b)','4.3','Two of three marks assess logical/cyclic binary shifts; the remaining mark assesses two''s-complement representation.'),
    ('9618/12/M/J/26 Q6(a)','3.1','The task asks why the device is an embedded system.'),
    ('9618/12/M/J/26 Q6(b)','3.1','The task distinguishes a monitoring system from a control system.'),
    ('9618/12/M/J/26 Q6(c)','3.1','The task asks for RAM/ROM differences.'),
    ('9618/12/M/J/26 Q6(d)','2.1','The task discusses benefits/drawbacks of cloud storage.'),
    ('9618/12/M/J/26 Q7(a)(i)','5.1','The task asks for process-management tasks of an OS.'),
    ('9618/12/M/J/26 Q7(a)(ii)','5.1','The task asks for memory-management tasks of an OS.'),
    ('9618/12/M/J/26 Q7(a)(iii)','5.1','The task explains the performance benefit of defragmentation utility software.'),
    ('9618/12/M/J/26 Q7(b)(i)','5.2','The task asks how IDE debugging tools are used.'),
    ('9618/12/M/J/26 Q7(b)(ii)','5.2','The task asks why a language may be partially compiled and partially interpreted.'),
    ('9618/12/M/J/26 Q8(a)','3.2','The task requires completion of a logic-circuit truth table.'),
    ('9618/12/M/J/26 Q8(b)','3.2','The task requires a logic statement/expression from a truth table.')
), target_lo(display_ref,lo_code) AS (
  VALUES
    ('9618/12/M/J/26 Q1(a)','1.2.1'),
    ('9618/12/M/J/26 Q1(b)','1.2.1'),
    ('9618/12/M/J/26 Q1(c)','1.2.1'),
    ('9618/12/M/J/26 Q1(d)(i)','1.2.1'),
    ('9618/12/M/J/26 Q1(d)(ii)','1.3.3'),
    ('9618/12/M/J/26 Q2(a)','6.2.3'),
    ('9618/12/M/J/26 Q2(b)','6.2.2'),
    ('9618/12/M/J/26 Q2(c)(i)','6.1.3'),
    ('9618/12/M/J/26 Q2(c)(i)','6.1.4'),
    ('9618/12/M/J/26 Q2(c)(ii)','6.1.3'),
    ('9618/12/M/J/26 Q2(c)(ii)','6.1.4'),
    ('9618/12/M/J/26 Q3(a)','8.1.3'),
    ('9618/12/M/J/26 Q3(b)(i)','8.3.5'),
    ('9618/12/M/J/26 Q3(b)(ii)','8.3.6'),
    ('9618/12/M/J/26 Q3(c)','8.2.2'),
    ('9618/12/M/J/26 Q4(a)','1.2.6'),
    ('9618/12/M/J/26 Q4(b)','1.2.7'),
    ('9618/12/M/J/26 Q5(a)','1.1.3'),
    ('9618/12/M/J/26 Q5(b)','1.1.2'),
    ('9618/12/M/J/26 Q5(b)','4.3.1'),
    ('9618/12/M/J/26 Q6(a)','3.1.2'),
    ('9618/12/M/J/26 Q6(b)','3.1.8'),
    ('9618/12/M/J/26 Q6(c)','3.1.5'),
    ('9618/12/M/J/26 Q6(d)','2.1.6'),
    ('9618/12/M/J/26 Q7(a)(i)','5.1.2'),
    ('9618/12/M/J/26 Q7(a)(ii)','5.1.2'),
    ('9618/12/M/J/26 Q7(a)(iii)','5.1.3'),
    ('9618/12/M/J/26 Q7(b)(i)','5.2.4'),
    ('9618/12/M/J/26 Q7(b)(ii)','5.2.3'),
    ('9618/12/M/J/26 Q8(a)','3.2.4'),
    ('9618/12/M/J/26 Q8(b)','3.2.5')
), resolved AS (
  SELECT tp.*,q.id question_id,q.status::text old_status,q.stem_md,q.source_paper_id,
         old_st.id old_primary_id,old_st.code old_primary_code,
         qs.confidence old_primary_confidence,qs.set_by old_primary_set_by,
         new_st.id new_primary_id,p.syllabus_id,p.qp_sha,p.qp_url,p.ms_sha,p.ms_url
  FROM target_primary tp
  JOIN paper p ON true
  JOIN public.questions q
    ON q.display_ref=tp.display_ref AND q.source_paper_id=p.qp_id
   AND q.status='approved' AND q.marks IS NOT NULL
  JOIN public.question_subtopics qs ON qs.question_id=q.id AND qs.is_primary
  JOIN public.subtopics old_st ON old_st.id=qs.subtopic_id
  JOIN public.subtopics new_st ON new_st.code=tp.new_primary
  JOIN public.topics nt ON nt.id=new_st.topic_id AND nt.syllabus_id=p.syllabus_id
), states AS (
  SELECT r.*,
    (
      SELECT jsonb_agg(jsonb_build_object('lo_id',lo.id,'code',lo.code,'confidence',qlo.confidence) ORDER BY lo.code)
      FROM public.question_learning_objectives qlo
      JOIN public.learning_objectives lo ON lo.id=qlo.lo_id
      WHERE qlo.question_id=r.question_id
    ) old_los,
    (
      SELECT jsonb_agg(jsonb_build_object('lo_id',lo.id,'code',lo.code,'confidence',1.0) ORDER BY lo.code)
      FROM target_lo tl
      JOIN public.learning_objectives lo ON lo.code=tl.lo_code
      JOIN public.subtopics st ON st.id=lo.subtopic_id
      JOIN public.topics t ON t.id=st.topic_id AND t.syllabus_id=r.syllabus_id
      WHERE tl.display_ref=r.display_ref
    ) new_los
  FROM resolved r
)
INSERT INTO public.question_taxonomy_review_history(
  question_id,source_paper_id,review_tag,old_hash,old_status,
  old_primary_subtopic_id,old_primary_subtopic_code,old_primary_confidence,old_primary_set_by,old_los,
  new_primary_subtopic_id,new_primary_subtopic_code,new_primary_confidence,new_los,
  evidence,source_provenance
)
SELECT
  s.question_id,s.source_paper_id,'manual-source-audit-0178-2026-mj12',
  md5(concat_ws('|',s.question_id::text,s.old_status,coalesce(s.stem_md,''),s.old_los::text)),
  s.old_status,
  s.old_primary_id,s.old_primary_code,s.old_primary_confidence,s.old_primary_set_by,s.old_los,
  s.new_primary_id,s.new_primary,1.0,s.new_los,
  jsonb_build_object(
    'method','manual official QP/MS + official Cambridge 9618 syllabus 2026 review',
    'question_ref',s.display_ref,'reason',s.rationale,'question_status_preserved',true
  ),
  jsonb_build_object(
    'source_backed',true,'qualification','9618','syllabus_version','2026-2028',
    'qp_filename','9618_s26_qp_12.pdf','qp_sha256',s.qp_sha,'qp_source_url',s.qp_url,
    'ms_filename','9618_s26_ms_12.pdf','ms_sha256',s.ms_sha,'ms_source_url',s.ms_url,
    'syllabus_filename','9618 Computer Science Syllabus 2026.pdf',
    'syllabus_source_url','https://drive.google.com/file/d/1PvTiGuvynVCkW283YHHIRA5UZGjRrDRw/view'
  )
FROM states s
WHERE NOT EXISTS (
  SELECT 1 FROM public.question_taxonomy_review_history h
  WHERE h.question_id=s.question_id AND h.review_tag='manual-source-audit-0178-2026-mj12'
);

-- Replace the 28 one-edge classifier output with the 31 source-reviewed edges.
WITH paper AS (
  SELECT qp.id
  FROM public.source_papers qp
  JOIN public.syllabi sy ON sy.id=qp.syllabus_id
  JOIN public.components c ON c.id=qp.component_id
  WHERE sy.code='9618' AND sy.version_label='2026-2028'
    AND c.number=1 AND qp.kind='QP'::paper_kind
    AND qp.year=2026 AND qp.series='MJ'::exam_series AND qp.variant=2
    AND qp.sha256='7f5625eb0e81c56fe770949a4254452f58753b92d6540c7b39cec031da448ffd'
)
DELETE FROM public.question_learning_objectives qlo
USING public.questions q,paper p
WHERE qlo.question_id=q.id
  AND q.source_paper_id=p.id
  AND q.status='approved'
  AND q.marks IS NOT NULL;

WITH target_lo(display_ref,lo_code) AS (
  VALUES
    ('9618/12/M/J/26 Q1(a)','1.2.1'),('9618/12/M/J/26 Q1(b)','1.2.1'),
    ('9618/12/M/J/26 Q1(c)','1.2.1'),('9618/12/M/J/26 Q1(d)(i)','1.2.1'),
    ('9618/12/M/J/26 Q1(d)(ii)','1.3.3'),('9618/12/M/J/26 Q2(a)','6.2.3'),
    ('9618/12/M/J/26 Q2(b)','6.2.2'),('9618/12/M/J/26 Q2(c)(i)','6.1.3'),
    ('9618/12/M/J/26 Q2(c)(i)','6.1.4'),('9618/12/M/J/26 Q2(c)(ii)','6.1.3'),
    ('9618/12/M/J/26 Q2(c)(ii)','6.1.4'),('9618/12/M/J/26 Q3(a)','8.1.3'),
    ('9618/12/M/J/26 Q3(b)(i)','8.3.5'),('9618/12/M/J/26 Q3(b)(ii)','8.3.6'),
    ('9618/12/M/J/26 Q3(c)','8.2.2'),('9618/12/M/J/26 Q4(a)','1.2.6'),
    ('9618/12/M/J/26 Q4(b)','1.2.7'),('9618/12/M/J/26 Q5(a)','1.1.3'),
    ('9618/12/M/J/26 Q5(b)','1.1.2'),('9618/12/M/J/26 Q5(b)','4.3.1'),
    ('9618/12/M/J/26 Q6(a)','3.1.2'),('9618/12/M/J/26 Q6(b)','3.1.8'),
    ('9618/12/M/J/26 Q6(c)','3.1.5'),('9618/12/M/J/26 Q6(d)','2.1.6'),
    ('9618/12/M/J/26 Q7(a)(i)','5.1.2'),('9618/12/M/J/26 Q7(a)(ii)','5.1.2'),
    ('9618/12/M/J/26 Q7(a)(iii)','5.1.3'),('9618/12/M/J/26 Q7(b)(i)','5.2.4'),
    ('9618/12/M/J/26 Q7(b)(ii)','5.2.3'),('9618/12/M/J/26 Q8(a)','3.2.4'),
    ('9618/12/M/J/26 Q8(b)','3.2.5')
), paper AS (
  SELECT qp.id,qp.syllabus_id
  FROM public.source_papers qp
  JOIN public.syllabi sy ON sy.id=qp.syllabus_id
  JOIN public.components c ON c.id=qp.component_id
  WHERE sy.code='9618' AND sy.version_label='2026-2028'
    AND c.number=1 AND qp.kind='QP'::paper_kind
    AND qp.year=2026 AND qp.series='MJ'::exam_series AND qp.variant=2
    AND qp.sha256='7f5625eb0e81c56fe770949a4254452f58753b92d6540c7b39cec031da448ffd'
), resolved AS (
  SELECT q.id question_id,lo.id lo_id
  FROM target_lo x
  JOIN paper p ON true
  JOIN public.questions q ON q.display_ref=x.display_ref AND q.source_paper_id=p.id
  JOIN public.learning_objectives lo ON lo.code=x.lo_code
  JOIN public.subtopics st ON st.id=lo.subtopic_id
  JOIN public.topics t ON t.id=st.topic_id AND t.syllabus_id=p.syllabus_id
)
INSERT INTO public.question_learning_objectives(question_id,lo_id,confidence)
SELECT question_id,lo_id,1.0 FROM resolved
ON CONFLICT(question_id,lo_id) DO UPDATE SET confidence=1.0;

-- Move Q5(b)'s primary taxonomy from 1.1 to 4.3; all other primary identities stay.
WITH paper AS (
  SELECT qp.id,qp.syllabus_id
  FROM public.source_papers qp
  JOIN public.syllabi sy ON sy.id=qp.syllabus_id
  JOIN public.components c ON c.id=qp.component_id
  WHERE sy.code='9618' AND sy.version_label='2026-2028'
    AND c.number=1 AND qp.kind='QP'::paper_kind
    AND qp.year=2026 AND qp.series='MJ'::exam_series AND qp.variant=2
    AND qp.sha256='7f5625eb0e81c56fe770949a4254452f58753b92d6540c7b39cec031da448ffd'
), target AS (
  SELECT q.id question_id,st.id new_subtopic_id
  FROM paper p
  JOIN public.questions q ON q.source_paper_id=p.id AND q.display_ref='9618/12/M/J/26 Q5(b)'
  JOIN public.subtopics st ON st.code='4.3'
  JOIN public.topics t ON t.id=st.topic_id AND t.syllabus_id=p.syllabus_id
)
DELETE FROM public.question_subtopics qs
USING target t
WHERE qs.question_id=t.question_id AND qs.is_primary;

WITH paper AS (
  SELECT qp.id,qp.syllabus_id
  FROM public.source_papers qp
  JOIN public.syllabi sy ON sy.id=qp.syllabus_id
  JOIN public.components c ON c.id=qp.component_id
  WHERE sy.code='9618' AND sy.version_label='2026-2028'
    AND c.number=1 AND qp.kind='QP'::paper_kind
    AND qp.year=2026 AND qp.series='MJ'::exam_series AND qp.variant=2
    AND qp.sha256='7f5625eb0e81c56fe770949a4254452f58753b92d6540c7b39cec031da448ffd'
), target AS (
  SELECT q.id question_id,st.id new_subtopic_id
  FROM paper p
  JOIN public.questions q ON q.source_paper_id=p.id AND q.display_ref='9618/12/M/J/26 Q5(b)'
  JOIN public.subtopics st ON st.code='4.3'
  JOIN public.topics t ON t.id=st.topic_id AND t.syllabus_id=p.syllabus_id
)
INSERT INTO public.question_subtopics(question_id,subtopic_id,is_primary,weight,confidence,set_by)
SELECT question_id,new_subtopic_id,true,1.0,1.0,'manual-source-audit-0178'
FROM target
ON CONFLICT(question_id,subtopic_id)
DO UPDATE SET is_primary=true,weight=1.0,confidence=1.0,set_by='manual-source-audit-0178';

-- Promote every reviewed primary link on the paper.
WITH paper AS (
  SELECT qp.id
  FROM public.source_papers qp
  JOIN public.syllabi sy ON sy.id=qp.syllabus_id
  JOIN public.components c ON c.id=qp.component_id
  WHERE sy.code='9618' AND sy.version_label='2026-2028'
    AND c.number=1 AND qp.kind='QP'::paper_kind
    AND qp.year=2026 AND qp.series='MJ'::exam_series AND qp.variant=2
    AND qp.sha256='7f5625eb0e81c56fe770949a4254452f58753b92d6540c7b39cec031da448ffd'
)
UPDATE public.question_subtopics qs
SET confidence=1.0,set_by='manual-source-audit-0178'
FROM public.questions q,paper p
WHERE qs.question_id=q.id AND qs.is_primary
  AND q.source_paper_id=p.id AND q.status='approved' AND q.marks IS NOT NULL
  AND qs.confidence<0.95;

DO $$
DECLARE
  v_qp uuid;
  v_history integer;
  v_low_primary integer;
  v_low_lo integer;
  v_edges integer;
  v_bad integer;
BEGIN
  SELECT qp.id INTO v_qp
  FROM public.source_papers qp
  JOIN public.syllabi sy ON sy.id=qp.syllabus_id
  JOIN public.components c ON c.id=qp.component_id
  WHERE sy.code='9618' AND sy.version_label='2026-2028'
    AND c.number=1 AND qp.kind='QP'::paper_kind
    AND qp.year=2026 AND qp.series='MJ'::exam_series AND qp.variant=2
    AND qp.sha256='7f5625eb0e81c56fe770949a4254452f58753b92d6540c7b39cec031da448ffd';

  SELECT count(*) INTO v_history
  FROM public.question_taxonomy_review_history h
  JOIN public.questions q ON q.id=h.question_id
  WHERE q.source_paper_id=v_qp AND h.review_tag='manual-source-audit-0178-2026-mj12';

  SELECT count(*) INTO v_edges
  FROM public.question_learning_objectives qlo
  JOIN public.questions q ON q.id=qlo.question_id
  WHERE q.source_paper_id=v_qp AND q.status='approved' AND q.marks IS NOT NULL;

  SELECT count(*) INTO v_low_primary
  FROM public.questions q
  WHERE q.source_paper_id=v_qp AND q.status='approved' AND q.marks IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.question_subtopics qs
                WHERE qs.question_id=q.id AND qs.is_primary AND coalesce(qs.confidence,0)<0.95);

  SELECT count(*) INTO v_low_lo
  FROM public.questions q
  WHERE q.source_paper_id=v_qp AND q.status='approved' AND q.marks IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.question_learning_objectives qlo
                WHERE qlo.question_id=q.id AND coalesce(qlo.confidence,0)<0.95);

  IF v_history<>28 OR v_edges<>31 OR v_low_primary<>0 OR v_low_lo<>0 THEN
    RAISE EXCEPTION '0178 Paper12 closure failed: history=% edges=% low_primary=% low_lo=%',
      v_history,v_edges,v_low_primary,v_low_lo;
  END IF;

  SELECT count(*) INTO v_bad
  FROM public.questions q
  JOIN public.question_subtopics qs ON qs.question_id=q.id AND qs.is_primary
  JOIN public.subtopics st ON st.id=qs.subtopic_id
  WHERE q.source_paper_id=v_qp AND q.display_ref='9618/12/M/J/26 Q5(b)'
    AND (st.code<>'4.3' OR qs.confidence<>1.0);

  IF v_bad<>0 THEN
    RAISE EXCEPTION '0178 Q5(b) primary postcondition failed';
  END IF;

  SELECT count(*) INTO v_bad
  FROM (
    VALUES
      ('9618/12/M/J/26 Q2(c)(i)'::text,'6.1.3'::text),
      ('9618/12/M/J/26 Q2(c)(i)','6.1.4'),
      ('9618/12/M/J/26 Q2(c)(ii)','6.1.3'),
      ('9618/12/M/J/26 Q2(c)(ii)','6.1.4'),
      ('9618/12/M/J/26 Q5(b)','1.1.2'),
      ('9618/12/M/J/26 Q5(b)','4.3.1')
  ) x(display_ref,lo_code)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.questions q
    JOIN public.question_learning_objectives qlo ON qlo.question_id=q.id AND qlo.confidence=1.0
    JOIN public.learning_objectives lo ON lo.id=qlo.lo_id AND lo.code=x.lo_code
    WHERE q.source_paper_id=v_qp AND q.display_ref=x.display_ref
  );

  IF v_bad<>0 THEN
    RAISE EXCEPTION '0178 multi-objective postcondition failed: missing=%',v_bad;
  END IF;
END $$;
