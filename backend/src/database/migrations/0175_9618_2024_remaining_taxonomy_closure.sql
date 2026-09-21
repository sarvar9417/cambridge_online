-- 0175_9618_2024_remaining_taxonomy_closure.sql
-- Close the remaining low-confidence taxonomy mappings in the 2024 9618 corpus.
--
-- Source basis:
--   * exact official Cambridge QP/MS source rows for six papers
--   * source-backed historical taxonomy catalog 9618-2024-2025
--   * direct manual review of the question tasks and matching mark-scheme rows
--
-- Corrected false-positive LO mappings:
--   9618/41/M/J/24 Q1(d)(iii): 19.1-lo-05 -> 19.1-lo-04
--   9618/41/M/J/24 Q1(e)(iii): 19.1-lo-05 -> 19.1-lo-02
--   9618/42/M/J/24 Q3(c)(iii): 19.1-lo-05 -> 19.1-lo-07
--
-- Six O/N Paper 4 OOP leaves also have their already-correct primary 20.1
-- subtopic confidence promoted after source review.
--
-- No question wording, LaTeX, marks, mark-scheme content, source identity,
-- dependencies, assets, or unrelated taxonomy edges are rewritten.

DO $$
DECLARE
  v_papers integer;
  v_targets integer;
  v_bad integer;
BEGIN
  WITH expected(series,component,variant,qp_sha,ms_sha) AS (
    VALUES
      ('MJ'::exam_series,4,1,'e96ebfa553a7960fc510be38f2f0aeaacc5031c18d8bd7ea1d0712eb58f8dfc3','5bbcb30c30d13ab20970a4ae4f8e7f0bcf79faa6fc00f8f770530b6aa4c0ce26'),
      ('MJ'::exam_series,4,2,'a0e625893eecdbb50535abcca92ced97d47cfa9beed02fa0bf6af186c7a0252b','09c2788dcdf20692d0036e927fd872be886bbe8e7081ee1fe6c2a36c02f9f679'),
      ('ON'::exam_series,3,1,'2679dc897568988e4a63a1679900e353a0e8484a5589d5a8944be3c6c50d3c19','ce0106f1b96bffceaa06249893d6b24d40e9d06a98656d136e29e03e78c8d0d7'),
      ('ON'::exam_series,3,2,'94438657867c9301845ef932a8cbc09abb70b41cbf675764c030db8c0b529be8','5cda9c53cbe573c36fd3bbb999c8e2756a16c35b713a6dfcb217c6fd0554955a'),
      ('ON'::exam_series,4,1,'2c91c43abd658b2b985cf2063909faa0873b7ae1f11596233662f4702a2b01c7','efa60c884ce1ce9383de3c03214eb43bd001e7bfbeb03ff3dc9550e22b027e5d'),
      ('ON'::exam_series,4,2,'714d785ed06744a0fdb69c0a33488cfd9a6ad6fe9ae7a8ad9d7d4da54bb76480','f0048b6d46754e49d4ad24b7820b6e9372b581b96c98066a6858ab814316d425')
  ), resolved AS (
    SELECT e.*,qp.id qp_id,ms.id ms_id
    FROM expected e
    JOIN public.syllabi sy
      ON sy.code='9618' AND sy.version_label='2024-2025'
    JOIN public.components c
      ON c.syllabus_id=sy.id AND c.number=e.component
    JOIN public.source_papers qp
      ON qp.syllabus_id=sy.id
     AND qp.component_id=c.id
     AND qp.year=2024
     AND qp.series=e.series
     AND qp.variant=e.variant
     AND qp.kind='QP'::paper_kind
     AND qp.sha256=e.qp_sha
     AND qp.page_count IS NOT NULL
     AND nullif(btrim(coalesce(qp.source_url,'')),'') IS NOT NULL
    JOIN public.source_papers ms
      ON ms.syllabus_id=sy.id
     AND ms.component_id=c.id
     AND ms.year=2024
     AND ms.series=e.series
     AND ms.variant=e.variant
     AND ms.kind='MS'::paper_kind
     AND ms.sha256=e.ms_sha
     AND ms.page_count IS NOT NULL
     AND nullif(btrim(coalesce(ms.source_url,'')),'') IS NOT NULL
  )
  SELECT count(*) INTO v_papers FROM resolved;

  IF v_papers<>6 THEN
    RAISE EXCEPTION '0175 exact QP/MS source gate failed: resolved=% expected=6',v_papers;
  END IF;

  WITH curated(display_ref,old_code,new_code,primary_code,bump_primary,rationale) AS (
    VALUES
      ('9618/41/M/J/24 Q1(d)(i)','19.1-lo-04','19.1-lo-04','19.1',false,'Source explicitly requires program code implementing BubbleSort().'),
      ('9618/41/M/J/24 Q1(d)(ii)','19.1-lo-04','19.1-lo-04','19.1',false,'Source extends the same BubbleSort implementation by calling it and outputting the sorted data.'),
      ('9618/41/M/J/24 Q1(d)(iii)','19.1-lo-05','19.1-lo-04','19.1',false,'Source test is the evidence step for the immediately preceding BubbleSort implementation, not an ADT description task.'),
      ('9618/41/M/J/24 Q1(e)(i)','19.1-lo-02','19.1-lo-02','19.1',false,'Source explicitly requires program code implementing an iterative BinarySearch().'),
      ('9618/41/M/J/24 Q1(e)(ii)','19.1-lo-02','19.1-lo-02','19.1',false,'Source extends the same BinarySearch implementation by calling it and outputting the return value.'),
      ('9618/41/M/J/24 Q1(e)(iii)','19.1-lo-05','19.1-lo-02','19.1',false,'Source test is the evidence step for the immediately preceding BinarySearch implementation, not an ADT description task.'),
      ('9618/42/M/J/24 Q3(c)(iii)','19.1-lo-05','19.1-lo-07','19.1',false,'Source test is the evidence step for IterativeInsertion(), whose preceding parts implement insertion into the data structure; it is not a descriptive ADT question.'),
      ('9618/31/O/N/24 Q7(b)','15.2-lo-04','15.2-lo-04','15.2',false,'Source requires completion of a Karnaugh map.'),
      ('9618/31/O/N/24 Q7(c)','15.2-lo-04','15.2-lo-04','15.2',false,'Source requires grouping cells in a Karnaugh map to obtain an optimal sum-of-products.'),
      ('9618/32/O/N/24 Q6(b)','15.2-lo-04','15.2-lo-04','15.2',false,'Source requires completion of a Karnaugh map.'),
      ('9618/32/O/N/24 Q6(c)','15.2-lo-04','15.2-lo-04','15.2',false,'Source requires grouping cells in a Karnaugh map to obtain an optimal sum-of-products.'),
      ('9618/41/O/N/24 Q2(a)(i)','20.1-lo-05','20.1-lo-05','20.1',true,'Source requires declaration of an OOP class, private attributes and constructor.'),
      ('9618/41/O/N/24 Q2(a)(ii)','20.1-lo-05','20.1-lo-05','20.1',true,'Source requires OOP getter methods for the class attributes.'),
      ('9618/41/O/N/24 Q2(c)(i)','20.1-lo-05','20.1-lo-05','20.1',true,'Source requires declaration of a second OOP class with constructor and getter methods.'),
      ('9618/41/O/N/24 Q2(c)(ii)','20.1-lo-05','20.1-lo-05','20.1',false,'Source requires creating and storing Fence objects after validating constructor input.'),
      ('9618/42/O/N/24 Q1(a)(i)','20.1-lo-05','20.1-lo-05','20.1',true,'Source requires declaration of EventItem with private attributes and constructor.'),
      ('9618/42/O/N/24 Q1(a)(ii)','20.1-lo-05','20.1-lo-05','20.1',true,'Source requires OOP getter methods for EventItem.'),
      ('9618/42/O/N/24 Q1(c)','20.1-lo-05','20.1-lo-05','20.1',true,'Source requires declaration of Character with private attributes, constructor and getter method.')
  ), resolved AS (
    SELECT
      x.*,
      q.id question_id,
      q.source_paper_id,
      sp.series,
      c.number component,
      sp.variant,
      qs.subtopic_id primary_subtopic_id,
      qs.confidence primary_confidence,
      qs.set_by primary_set_by,
      old_lo.id old_lo_id,
      old_qlo.confidence old_lo_confidence,
      new_lo.id new_lo_id,
      (
        SELECT count(*)
        FROM public.question_learning_objectives all_qlo
        WHERE all_qlo.question_id=q.id
      ) lo_count
    FROM curated x
    JOIN public.questions q
      ON q.display_ref=x.display_ref
     AND q.status='approved'
     AND q.marks IS NOT NULL
    JOIN public.source_papers sp
      ON sp.id=q.source_paper_id
     AND sp.kind='QP'::paper_kind
     AND sp.year=2024
    JOIN public.syllabi paper_s
      ON paper_s.id=sp.syllabus_id
     AND paper_s.code='9618'
     AND paper_s.version_label='2024-2025'
    JOIN public.components c
      ON c.id=sp.component_id
    JOIN public.question_subtopics qs
      ON qs.question_id=q.id
     AND qs.is_primary
    JOIN public.subtopics primary_st
      ON primary_st.id=qs.subtopic_id
     AND primary_st.code=x.primary_code
    JOIN public.question_learning_objectives old_qlo
      ON old_qlo.question_id=q.id
    JOIN public.learning_objectives old_lo
      ON old_lo.id=old_qlo.lo_id
     AND old_lo.code=x.old_code
    JOIN public.learning_objectives new_lo
      ON new_lo.code=x.new_code
    JOIN public.subtopics new_st
      ON new_st.id=new_lo.subtopic_id
     AND new_st.code=x.primary_code
    JOIN public.topics new_t
      ON new_t.id=new_st.topic_id
     AND new_t.syllabus_id=sp.syllabus_id
  )
  SELECT count(*) INTO v_targets
  FROM resolved
  WHERE lo_count=1
    AND old_lo_confidence<0.95
    AND (
      NOT bump_primary
      OR primary_confidence<0.95
    );

  IF v_targets<>18 THEN
    RAISE EXCEPTION '0175 curated taxonomy identity gate failed: resolved=% expected=18',v_targets;
  END IF;

  WITH required(code,text) AS (
    VALUES
      ('19.1-lo-02','Write algorithms to implement a binary and linear search.'),
      ('19.1-lo-04','Write algorithms to implement an insertion and bubble sort.'),
      ('19.1-lo-07','Write algorithms to insert items into a stack, a queue, a linked list and a binary tree.'),
      ('15.2-lo-04','Describe the use of, and use a Karnaugh map (K-map).'),
      ('20.1-lo-05','Write program code to solve problems by designing appropriate classes and making use of OOP techniques.')
  )
  SELECT count(*) INTO v_bad
  FROM required r
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.learning_objectives lo
    JOIN public.subtopics st ON st.id=lo.subtopic_id
    JOIN public.topics t ON t.id=st.topic_id
    JOIN public.syllabi sy ON sy.id=t.syllabus_id
    WHERE lo.code=r.code
      AND lo.text=r.text
      AND sy.code='9618'
      AND sy.version_label='2024-2025'
  );

  IF v_bad<>0 THEN
    RAISE EXCEPTION '0175 target LO wording gate failed: bad=%',v_bad;
  END IF;
END $$;

-- Durable before/after audit history for all eighteen adjudicated leaves.
WITH curated(display_ref,old_code,new_code,primary_code,bump_primary,rationale) AS (
  VALUES
    ('9618/41/M/J/24 Q1(d)(i)','19.1-lo-04','19.1-lo-04','19.1',false,'Source explicitly requires program code implementing BubbleSort().'),
    ('9618/41/M/J/24 Q1(d)(ii)','19.1-lo-04','19.1-lo-04','19.1',false,'Source extends the same BubbleSort implementation by calling it and outputting the sorted data.'),
    ('9618/41/M/J/24 Q1(d)(iii)','19.1-lo-05','19.1-lo-04','19.1',false,'Source test is the evidence step for the immediately preceding BubbleSort implementation, not an ADT description task.'),
    ('9618/41/M/J/24 Q1(e)(i)','19.1-lo-02','19.1-lo-02','19.1',false,'Source explicitly requires program code implementing an iterative BinarySearch().'),
    ('9618/41/M/J/24 Q1(e)(ii)','19.1-lo-02','19.1-lo-02','19.1',false,'Source extends the same BinarySearch implementation by calling it and outputting the return value.'),
    ('9618/41/M/J/24 Q1(e)(iii)','19.1-lo-05','19.1-lo-02','19.1',false,'Source test is the evidence step for the immediately preceding BinarySearch implementation, not an ADT description task.'),
    ('9618/42/M/J/24 Q3(c)(iii)','19.1-lo-05','19.1-lo-07','19.1',false,'Source test is the evidence step for IterativeInsertion(), whose preceding parts implement insertion into the data structure; it is not a descriptive ADT question.'),
    ('9618/31/O/N/24 Q7(b)','15.2-lo-04','15.2-lo-04','15.2',false,'Source requires completion of a Karnaugh map.'),
    ('9618/31/O/N/24 Q7(c)','15.2-lo-04','15.2-lo-04','15.2',false,'Source requires grouping cells in a Karnaugh map to obtain an optimal sum-of-products.'),
    ('9618/32/O/N/24 Q6(b)','15.2-lo-04','15.2-lo-04','15.2',false,'Source requires completion of a Karnaugh map.'),
    ('9618/32/O/N/24 Q6(c)','15.2-lo-04','15.2-lo-04','15.2',false,'Source requires grouping cells in a Karnaugh map to obtain an optimal sum-of-products.'),
    ('9618/41/O/N/24 Q2(a)(i)','20.1-lo-05','20.1-lo-05','20.1',true,'Source requires declaration of an OOP class, private attributes and constructor.'),
    ('9618/41/O/N/24 Q2(a)(ii)','20.1-lo-05','20.1-lo-05','20.1',true,'Source requires OOP getter methods for the class attributes.'),
    ('9618/41/O/N/24 Q2(c)(i)','20.1-lo-05','20.1-lo-05','20.1',true,'Source requires declaration of a second OOP class with constructor and getter methods.'),
    ('9618/41/O/N/24 Q2(c)(ii)','20.1-lo-05','20.1-lo-05','20.1',false,'Source requires creating and storing Fence objects after validating constructor input.'),
    ('9618/42/O/N/24 Q1(a)(i)','20.1-lo-05','20.1-lo-05','20.1',true,'Source requires declaration of EventItem with private attributes and constructor.'),
    ('9618/42/O/N/24 Q1(a)(ii)','20.1-lo-05','20.1-lo-05','20.1',true,'Source requires OOP getter methods for EventItem.'),
    ('9618/42/O/N/24 Q1(c)','20.1-lo-05','20.1-lo-05','20.1',true,'Source requires declaration of Character with private attributes, constructor and getter method.')
), resolved AS (
  SELECT
    x.*,
    q.id question_id,
    q.status::text old_status,
    q.stem_md,
    q.source_paper_id,
    sp.series,
    sp.variant,
    sp.sha256 qp_sha,
    sp.source_url qp_url,
    c.number component,
    qs.subtopic_id primary_subtopic_id,
    qs.confidence primary_confidence,
    qs.set_by primary_set_by,
    old_lo.id old_lo_id,
    old_qlo.confidence old_lo_confidence,
    new_lo.id new_lo_id,
    ms.id ms_source_id,
    ms.sha256 ms_sha,
    ms.source_url ms_url
  FROM curated x
  JOIN public.questions q
    ON q.display_ref=x.display_ref
   AND q.status='approved'
   AND q.marks IS NOT NULL
  JOIN public.source_papers sp
    ON sp.id=q.source_paper_id
   AND sp.kind='QP'::paper_kind
   AND sp.year=2024
  JOIN public.syllabi paper_s
    ON paper_s.id=sp.syllabus_id
   AND paper_s.code='9618'
   AND paper_s.version_label='2024-2025'
  JOIN public.components c ON c.id=sp.component_id
  JOIN public.question_subtopics qs
    ON qs.question_id=q.id
   AND qs.is_primary
  JOIN public.subtopics primary_st
    ON primary_st.id=qs.subtopic_id
   AND primary_st.code=x.primary_code
  JOIN public.question_learning_objectives old_qlo ON old_qlo.question_id=q.id
  JOIN public.learning_objectives old_lo
    ON old_lo.id=old_qlo.lo_id
   AND old_lo.code=x.old_code
  JOIN public.learning_objectives new_lo ON new_lo.code=x.new_code
  JOIN public.subtopics new_st
    ON new_st.id=new_lo.subtopic_id
   AND new_st.code=x.primary_code
  JOIN public.topics new_t
    ON new_t.id=new_st.topic_id
   AND new_t.syllabus_id=sp.syllabus_id
  JOIN public.source_papers ms
    ON ms.kind='MS'::paper_kind
   AND ms.syllabus_id=sp.syllabus_id
   AND ms.component_id=sp.component_id
   AND ms.year=sp.year
   AND ms.series=sp.series
   AND ms.variant=sp.variant
), old_state AS (
  SELECT
    r.*,
    (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'lo_id',lo.id,
        'code',lo.code,
        'confidence',qlo.confidence
      ) ORDER BY lo.code),'[]'::jsonb)
      FROM public.question_learning_objectives qlo
      JOIN public.learning_objectives lo ON lo.id=qlo.lo_id
      WHERE qlo.question_id=r.question_id
    ) old_los
  FROM resolved r
)
INSERT INTO public.question_taxonomy_review_history(
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
  'manual-source-audit-0175-2024-remaining',
  md5(concat_ws('|',r.question_id::text,r.old_status,coalesce(r.stem_md,''),r.old_los::text)),
  r.old_status,
  r.primary_subtopic_id,
  r.primary_code,
  r.primary_confidence,
  r.primary_set_by,
  r.old_los,
  r.primary_subtopic_id,
  r.primary_code,
  CASE WHEN r.bump_primary THEN 1.0 ELSE r.primary_confidence END,
  jsonb_build_array(jsonb_build_object(
    'lo_id',r.new_lo_id,
    'code',r.new_code,
    'confidence',1.0
  )),
  jsonb_build_object(
    'method','manual official QP/MS + source-backed historical syllabus-catalog review',
    'question_ref',r.display_ref,
    'old_lo_code',r.old_code,
    'new_lo_code',r.new_code,
    'reason',r.rationale,
    'question_status_preserved',true
  ),
  jsonb_build_object(
    'source_backed',true,
    'qualification','9618',
    'syllabus_version','2024-2025',
    'series',r.series::text,
    'component',r.component,
    'variant',r.variant,
    'qp_sha256',r.qp_sha,
    'qp_source_url',r.qp_url,
    'ms_sha256',r.ms_sha,
    'ms_source_url',r.ms_url,
    'taxonomy_catalog','backend/src/database/catalogs/9618-2024-2025.json',
    'taxonomy_source_hierarchy','backend/src/database/catalogs/README.md'
  )
FROM old_state r
WHERE NOT EXISTS (
  SELECT 1
  FROM public.question_taxonomy_review_history h
  WHERE h.question_id=r.question_id
    AND h.review_tag='manual-source-audit-0175-2024-remaining'
);

-- Remove only the three adjudicated false-positive LO edges.
WITH corrections(display_ref,old_code) AS (
  VALUES
    ('9618/41/M/J/24 Q1(d)(iii)','19.1-lo-05'),
    ('9618/41/M/J/24 Q1(e)(iii)','19.1-lo-05'),
    ('9618/42/M/J/24 Q3(c)(iii)','19.1-lo-05')
), resolved AS (
  SELECT q.id question_id,lo.id old_lo_id
  FROM corrections x
  JOIN public.questions q ON q.display_ref=x.display_ref
  JOIN public.source_papers sp ON sp.id=q.source_paper_id
  JOIN public.syllabi sy
    ON sy.id=sp.syllabus_id
   AND sy.code='9618'
   AND sy.version_label='2024-2025'
  JOIN public.learning_objectives lo ON lo.code=x.old_code
  JOIN public.subtopics st ON st.id=lo.subtopic_id
  JOIN public.topics t
    ON t.id=st.topic_id
   AND t.syllabus_id=sp.syllabus_id
)
DELETE FROM public.question_learning_objectives qlo
USING resolved r
WHERE qlo.question_id=r.question_id
  AND qlo.lo_id=r.old_lo_id;

-- Upsert all eighteen reviewed targets to confidence 1.00.
WITH curated(display_ref,target_code) AS (
  VALUES
    ('9618/41/M/J/24 Q1(d)(i)','19.1-lo-04'),
    ('9618/41/M/J/24 Q1(d)(ii)','19.1-lo-04'),
    ('9618/41/M/J/24 Q1(d)(iii)','19.1-lo-04'),
    ('9618/41/M/J/24 Q1(e)(i)','19.1-lo-02'),
    ('9618/41/M/J/24 Q1(e)(ii)','19.1-lo-02'),
    ('9618/41/M/J/24 Q1(e)(iii)','19.1-lo-02'),
    ('9618/42/M/J/24 Q3(c)(iii)','19.1-lo-07'),
    ('9618/31/O/N/24 Q7(b)','15.2-lo-04'),
    ('9618/31/O/N/24 Q7(c)','15.2-lo-04'),
    ('9618/32/O/N/24 Q6(b)','15.2-lo-04'),
    ('9618/32/O/N/24 Q6(c)','15.2-lo-04'),
    ('9618/41/O/N/24 Q2(a)(i)','20.1-lo-05'),
    ('9618/41/O/N/24 Q2(a)(ii)','20.1-lo-05'),
    ('9618/41/O/N/24 Q2(c)(i)','20.1-lo-05'),
    ('9618/41/O/N/24 Q2(c)(ii)','20.1-lo-05'),
    ('9618/42/O/N/24 Q1(a)(i)','20.1-lo-05'),
    ('9618/42/O/N/24 Q1(a)(ii)','20.1-lo-05'),
    ('9618/42/O/N/24 Q1(c)','20.1-lo-05')
), resolved AS (
  SELECT q.id question_id,lo.id lo_id
  FROM curated x
  JOIN public.questions q ON q.display_ref=x.display_ref
  JOIN public.source_papers sp
    ON sp.id=q.source_paper_id
   AND sp.kind='QP'::paper_kind
   AND sp.year=2024
  JOIN public.syllabi sy
    ON sy.id=sp.syllabus_id
   AND sy.code='9618'
   AND sy.version_label='2024-2025'
  JOIN public.learning_objectives lo ON lo.code=x.target_code
  JOIN public.subtopics st ON st.id=lo.subtopic_id
  JOIN public.topics t
    ON t.id=st.topic_id
   AND t.syllabus_id=sp.syllabus_id
)
INSERT INTO public.question_learning_objectives(question_id,lo_id,confidence)
SELECT question_id,lo_id,1.0
FROM resolved
ON CONFLICT(question_id,lo_id)
DO UPDATE SET confidence=GREATEST(public.question_learning_objectives.confidence,EXCLUDED.confidence);

-- Promote only the six primary OOP subtopic links that were themselves below
-- the closure threshold. The already-0.96 Q2(c)(ii) link is intentionally left
-- untouched.
WITH refs(display_ref) AS (
  VALUES
    ('9618/41/O/N/24 Q2(a)(i)'),
    ('9618/41/O/N/24 Q2(a)(ii)'),
    ('9618/41/O/N/24 Q2(c)(i)'),
    ('9618/42/O/N/24 Q1(a)(i)'),
    ('9618/42/O/N/24 Q1(a)(ii)'),
    ('9618/42/O/N/24 Q1(c)')
), resolved AS (
  SELECT q.id question_id
  FROM refs r
  JOIN public.questions q ON q.display_ref=r.display_ref
  JOIN public.source_papers sp
    ON sp.id=q.source_paper_id
   AND sp.kind='QP'::paper_kind
   AND sp.year=2024
  JOIN public.syllabi sy
    ON sy.id=sp.syllabus_id
   AND sy.code='9618'
   AND sy.version_label='2024-2025'
)
UPDATE public.question_subtopics qs
SET confidence=1.0,
    set_by='manual-source-audit-0175'
FROM resolved r
WHERE qs.question_id=r.question_id
  AND qs.is_primary
  AND qs.confidence<0.95;

DO $$
DECLARE
  v_history integer;
  v_low_primary integer;
  v_low_lo integer;
  v_stale integer;
  v_missing integer;
  v_promoted_primary integer;
BEGIN
  SELECT count(*) INTO v_history
  FROM public.question_taxonomy_review_history h
  WHERE h.review_tag='manual-source-audit-0175-2024-remaining';

  IF v_history<>18 THEN
    RAISE EXCEPTION '0175 review history postcondition failed: rows=% expected=18',v_history;
  END IF;

  SELECT count(*) INTO v_low_primary
  FROM public.questions q
  JOIN public.source_papers sp ON sp.id=q.source_paper_id
  JOIN public.syllabi sy ON sy.id=sp.syllabus_id
  WHERE sy.code='9618'
    AND sy.version_label='2024-2025'
    AND sp.kind='QP'::paper_kind
    AND sp.year=2024
    AND q.status='approved'
    AND q.marks IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.question_subtopics qs
      WHERE qs.question_id=q.id
        AND qs.is_primary
        AND coalesce(qs.confidence,0)<0.95
    );

  SELECT count(*) INTO v_low_lo
  FROM public.questions q
  JOIN public.source_papers sp ON sp.id=q.source_paper_id
  JOIN public.syllabi sy ON sy.id=sp.syllabus_id
  WHERE sy.code='9618'
    AND sy.version_label='2024-2025'
    AND sp.kind='QP'::paper_kind
    AND sp.year=2024
    AND q.status='approved'
    AND q.marks IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.question_learning_objectives qlo
      WHERE qlo.question_id=q.id
        AND coalesce(qlo.confidence,0)<0.95
    );

  IF v_low_primary<>0 OR v_low_lo<>0 THEN
    RAISE EXCEPTION
      '0175 2024 taxonomy closure failed: low_primary=% low_lo=%',
      v_low_primary,v_low_lo;
  END IF;

  SELECT count(*) INTO v_stale
  FROM (
    VALUES
      ('9618/41/M/J/24 Q1(d)(iii)'::text,'19.1-lo-05'::text),
      ('9618/41/M/J/24 Q1(e)(iii)'::text,'19.1-lo-05'::text),
      ('9618/42/M/J/24 Q3(c)(iii)'::text,'19.1-lo-05'::text)
  ) x(display_ref,old_code)
  JOIN public.questions q ON q.display_ref=x.display_ref
  JOIN public.question_learning_objectives qlo ON qlo.question_id=q.id
  JOIN public.learning_objectives lo
    ON lo.id=qlo.lo_id
   AND lo.code=x.old_code;

  IF v_stale<>0 THEN
    RAISE EXCEPTION '0175 stale false-positive mappings remain: %',v_stale;
  END IF;

  SELECT count(*) INTO v_missing
  FROM (
    VALUES
      ('9618/41/M/J/24 Q1(d)(iii)'::text,'19.1-lo-04'::text),
      ('9618/41/M/J/24 Q1(e)(iii)'::text,'19.1-lo-02'::text),
      ('9618/42/M/J/24 Q3(c)(iii)'::text,'19.1-lo-07'::text)
  ) x(display_ref,new_code)
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.questions q
    JOIN public.question_learning_objectives qlo
      ON qlo.question_id=q.id
     AND qlo.confidence=1.0
    JOIN public.learning_objectives lo
      ON lo.id=qlo.lo_id
     AND lo.code=x.new_code
    WHERE q.display_ref=x.display_ref
  );

  IF v_missing<>0 THEN
    RAISE EXCEPTION '0175 corrected target mappings missing: %',v_missing;
  END IF;

  SELECT count(*) INTO v_promoted_primary
  FROM public.questions q
  JOIN public.question_subtopics qs
    ON qs.question_id=q.id
   AND qs.is_primary
  JOIN public.subtopics st
    ON st.id=qs.subtopic_id
   AND st.code='20.1'
  WHERE q.display_ref IN (
    '9618/41/O/N/24 Q2(a)(i)',
    '9618/41/O/N/24 Q2(a)(ii)',
    '9618/41/O/N/24 Q2(c)(i)',
    '9618/42/O/N/24 Q1(a)(i)',
    '9618/42/O/N/24 Q1(a)(ii)',
    '9618/42/O/N/24 Q1(c)'
  )
    AND qs.confidence=1.0
    AND qs.set_by='manual-source-audit-0175';

  IF v_promoted_primary<>6 THEN
    RAISE EXCEPTION '0175 primary OOP promotion failed: rows=% expected=6',v_promoted_primary;
  END IF;
END $$;
