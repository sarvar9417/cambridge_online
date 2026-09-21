-- 0174_9618_2024_mj11_taxonomy_closure.sql
-- Close the remaining low-confidence taxonomy mappings on Cambridge 9618/11/M/J/24.
--
-- Source basis:
--   * official Cambridge question paper 9618_s24_qp_11.pdf
--   * official Cambridge mark scheme 9618_s24_ms_11.pdf
--   * source-backed historical taxonomy catalog 9618-2024-2025
--
-- Two existing LO mappings are corrected:
--   Q1(a): truth table -> identify correct logic statement
--          3.2-lo-05 "Construct a truth table."
--          -> 3.2-lo-06 "Construct a logic expression."
--   Q2(c)(ii): principal operation of solid-state flash memory
--          3.1-lo-01 "Explain the difference between primary and secondary storage."
--          -> 3.1-lo-06 "Describe the principal operations of a range of hardware devices."
--
-- The other twenty mappings are retained after direct QP/MS + syllabus-catalog
-- review and promoted from conservative 0.93 confidence to 1.00.
--
-- Question wording, marks, source identity, LaTeX, mark schemes, dependencies
-- and primary subtopics are not changed.

DO $$
DECLARE
  v_source_paper_id uuid;
  v_source_sha text;
  v_source_url text;
  v_ms_source_id uuid;
  v_ms_sha text;
  v_ms_url text;
  v_resolved integer;
  v_bad integer;
BEGIN
  SELECT sp.id,sp.sha256,sp.source_url
    INTO v_source_paper_id,v_source_sha,v_source_url
  FROM public.source_papers sp
  JOIN public.syllabi sy ON sy.id=sp.syllabus_id
  JOIN public.components c ON c.id=sp.component_id
  WHERE sy.code='9618'
    AND sy.version_label='2024-2025'
    AND sp.kind='QP'::paper_kind
    AND sp.year=2024
    AND sp.series='MJ'::exam_series
    AND c.number=1
    AND sp.variant=1
    AND sp.sha256='2e39e6c2ee1e65d621df71b4b7fbe41a16f1e4ed8e252fb1612a6d14b13de063';

  IF v_source_paper_id IS NULL THEN
    RAISE EXCEPTION '0174 exact 9618/11/M/J/24 source paper gate failed';
  END IF;

  SELECT ms.id,ms.sha256,ms.source_url
    INTO v_ms_source_id,v_ms_sha,v_ms_url
  FROM public.source_papers ms
  JOIN public.source_papers qp ON qp.id=v_source_paper_id
  WHERE ms.kind='MS'::paper_kind
    AND ms.syllabus_id=qp.syllabus_id
    AND ms.component_id=qp.component_id
    AND ms.year=qp.year
    AND ms.series=qp.series
    AND ms.variant=qp.variant
    AND nullif(btrim(coalesce(ms.sha256,'')),'') IS NOT NULL
    AND ms.page_count IS NOT NULL
    AND nullif(btrim(coalesce(ms.source_url,'')),'') IS NOT NULL;

  IF v_ms_source_id IS NULL THEN
    RAISE EXCEPTION '0174 exact 9618/11/M/J/24 mark-scheme source gate failed';
  END IF;

  WITH curated(display_ref,old_code,new_code,rationale) AS (
    VALUES
      ('9618/11/M/J/24 Q1(a)','3.2-lo-05','3.2-lo-06','The source asks the candidate to identify the correct logic statement from a supplied truth table; this assesses constructing/deriving a logic expression, not constructing the truth table.'),
      ('9618/11/M/J/24 Q1(b)','3.2-lo-04','3.2-lo-04','The source explicitly asks for a logic circuit from a logic expression.'),
      ('9618/11/M/J/24 Q2(b)','3.1-lo-10','3.1-lo-10','The source asks the candidate to distinguish and justify monitoring versus control.'),
      ('9618/11/M/J/24 Q2(c)(i)','3.1-lo-01','3.1-lo-01','The source assesses which data is held in primary memory in contrast with the stated secondary storage context.'),
      ('9618/11/M/J/24 Q2(c)(ii)','3.1-lo-01','3.1-lo-06','The source explicitly asks about the principal operation of a solid-state flash storage device: NAND/NOR gates, transistors, floating gate and control gate.'),
      ('9618/11/M/J/24 Q2(c)(iii)','3.1-lo-07','3.1-lo-07','The source explicitly asks how the device uses a buffer.'),
      ('9618/11/M/J/24 Q2(d)','1.2-lo-05','1.2-lo-05','The source changes sample rate and asks for effects on the system.'),
      ('9618/11/M/J/24 Q3(a)','5.2-lo-02','5.2-lo-02','The source asks why an interpreter is beneficial for debugging in the given situation.'),
      ('9618/11/M/J/24 Q3(b)','5.2-lo-02','5.2-lo-02','The source asks why a compiler/executable is appropriate for distribution.'),
      ('9618/11/M/J/24 Q4(a)','4.2-lo-05','4.2-lo-05','The source requires dry-running assembly instructions and reporting ACC contents.'),
      ('9618/11/M/J/24 Q4(b)','4.3-lo-03','4.3-lo-03','The source requires applying AND/XOR/OR bit manipulation to register values.'),
      ('9618/11/M/J/24 Q5(a)','2.1-lo-05','2.1-lo-05','The source asks for roles/characteristics of client and server devices.'),
      ('9618/11/M/J/24 Q5(b)','6.2-lo-03','6.2-lo-03','The source asks how parity verifies data during transfer.'),
      ('9618/11/M/J/24 Q5(c)(i)','6.1-lo-03','6.1-lo-03','The source asks how a firewall protects customer data.'),
      ('9618/11/M/J/24 Q6(a)','8.1-lo-05','8.1-lo-05','The source asks the candidate to create a 3NF database design.'),
      ('9618/11/M/J/24 Q6(b)','8.2-lo-02','8.2-lo-02','The source asks for DBMS features: data dictionary and logical schema.'),
      ('9618/11/M/J/24 Q6(c)(i)','8.3-lo-02','8.3-lo-02','The source asks the candidate to write SQL DDL altering a table and adding a foreign key.'),
      ('9618/11/M/J/24 Q6(c)(ii)','8.3-lo-02','8.3-lo-02','The source asks the candidate to write SQL DML/query code with COUNT and GROUP BY.'),
      ('9618/11/M/J/24 Q7','1.1-lo-02','1.1-lo-02','The source directly requires binary addition.'),
      ('9618/11/M/J/24 Q8(a)','2.1-lo-08','2.1-lo-08','The source asks the candidate to identify bus/star/mesh topology characteristics.'),
      ('9618/11/M/J/24 Q8(b)(i)','2.1-lo-17','2.1-lo-17','The source asks why a router requires a public IP address.'),
      ('9618/11/M/J/24 Q8(b)(ii)','2.1-lo-17','2.1-lo-17','The source asks for IPv4/IPv6 addressing differences within IP-address use.')
  ), resolved AS (
    SELECT
      x.*,
      q.id question_id,
      q.status::text question_status,
      q.source_paper_id,
      qs.subtopic_id primary_subtopic_id,
      st.code primary_subtopic_code,
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
     AND q.source_paper_id=v_source_paper_id
     AND q.status='approved'
     AND q.marks IS NOT NULL
    JOIN public.question_subtopics qs
      ON qs.question_id=q.id
     AND qs.is_primary
    JOIN public.subtopics st ON st.id=qs.subtopic_id
    JOIN public.question_learning_objectives old_qlo
      ON old_qlo.question_id=q.id
    JOIN public.learning_objectives old_lo
      ON old_lo.id=old_qlo.lo_id
     AND old_lo.code=x.old_code
    JOIN public.subtopics old_st ON old_st.id=old_lo.subtopic_id
    JOIN public.topics old_t ON old_t.id=old_st.topic_id
    JOIN public.syllabi old_s
      ON old_s.id=old_t.syllabus_id
     AND old_s.code='9618'
     AND old_s.version_label='2024-2025'
    JOIN public.learning_objectives new_lo
      ON new_lo.code=x.new_code
    JOIN public.subtopics new_st
      ON new_st.id=new_lo.subtopic_id
     AND new_st.code=st.code
    JOIN public.topics new_t ON new_t.id=new_st.topic_id
    JOIN public.syllabi new_s
      ON new_s.id=new_t.syllabus_id
     AND new_s.code='9618'
     AND new_s.version_label='2024-2025'
  )
  SELECT count(*) INTO v_resolved
  FROM resolved
  WHERE lo_count=1
    AND old_lo_confidence<0.95;

  IF v_resolved<>22 THEN
    RAISE EXCEPTION '0174 curated mapping identity gate failed: resolved=% expected=22',v_resolved;
  END IF;

  WITH required(code,text) AS (
    VALUES
      ('3.2-lo-06','Construct a logic expression.'),
      ('3.1-lo-06','Describe the principal operations of a range of hardware devices.')
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
    RAISE EXCEPTION '0174 corrected target LO wording gate failed: bad=%',v_bad;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.question_taxonomy_review_history h
    JOIN public.questions q ON q.id=h.question_id
    WHERE q.source_paper_id=v_source_paper_id
      AND h.review_tag='manual-source-audit-0174-mj24-11'
  ) THEN
    -- Idempotent re-runs are allowed only if all postconditions already hold.
    NULL;
  END IF;
END $$;

-- Record durable before/after evidence before changing the objective edges.
WITH curated(display_ref,old_code,new_code,rationale) AS (
  VALUES
    ('9618/11/M/J/24 Q1(a)','3.2-lo-05','3.2-lo-06','The source asks the candidate to identify the correct logic statement from a supplied truth table; this assesses constructing/deriving a logic expression, not constructing the truth table.'),
    ('9618/11/M/J/24 Q1(b)','3.2-lo-04','3.2-lo-04','The source explicitly asks for a logic circuit from a logic expression.'),
    ('9618/11/M/J/24 Q2(b)','3.1-lo-10','3.1-lo-10','The source asks the candidate to distinguish and justify monitoring versus control.'),
    ('9618/11/M/J/24 Q2(c)(i)','3.1-lo-01','3.1-lo-01','The source assesses which data is held in primary memory in contrast with the stated secondary storage context.'),
    ('9618/11/M/J/24 Q2(c)(ii)','3.1-lo-01','3.1-lo-06','The source explicitly asks about the principal operation of a solid-state flash storage device: NAND/NOR gates, transistors, floating gate and control gate.'),
    ('9618/11/M/J/24 Q2(c)(iii)','3.1-lo-07','3.1-lo-07','The source explicitly asks how the device uses a buffer.'),
    ('9618/11/M/J/24 Q2(d)','1.2-lo-05','1.2-lo-05','The source changes sample rate and asks for effects on the system.'),
    ('9618/11/M/J/24 Q3(a)','5.2-lo-02','5.2-lo-02','The source asks why an interpreter is beneficial for debugging in the given situation.'),
    ('9618/11/M/J/24 Q3(b)','5.2-lo-02','5.2-lo-02','The source asks why a compiler/executable is appropriate for distribution.'),
    ('9618/11/M/J/24 Q4(a)','4.2-lo-05','4.2-lo-05','The source requires dry-running assembly instructions and reporting ACC contents.'),
    ('9618/11/M/J/24 Q4(b)','4.3-lo-03','4.3-lo-03','The source requires applying AND/XOR/OR bit manipulation to register values.'),
    ('9618/11/M/J/24 Q5(a)','2.1-lo-05','2.1-lo-05','The source asks for roles/characteristics of client and server devices.'),
    ('9618/11/M/J/24 Q5(b)','6.2-lo-03','6.2-lo-03','The source asks how parity verifies data during transfer.'),
    ('9618/11/M/J/24 Q5(c)(i)','6.1-lo-03','6.1-lo-03','The source asks how a firewall protects customer data.'),
    ('9618/11/M/J/24 Q6(a)','8.1-lo-05','8.1-lo-05','The source asks the candidate to create a 3NF database design.'),
    ('9618/11/M/J/24 Q6(b)','8.2-lo-02','8.2-lo-02','The source asks for DBMS features: data dictionary and logical schema.'),
    ('9618/11/M/J/24 Q6(c)(i)','8.3-lo-02','8.3-lo-02','The source asks the candidate to write SQL DDL altering a table and adding a foreign key.'),
    ('9618/11/M/J/24 Q6(c)(ii)','8.3-lo-02','8.3-lo-02','The source asks the candidate to write SQL DML/query code with COUNT and GROUP BY.'),
    ('9618/11/M/J/24 Q7','1.1-lo-02','1.1-lo-02','The source directly requires binary addition.'),
    ('9618/11/M/J/24 Q8(a)','2.1-lo-08','2.1-lo-08','The source asks the candidate to identify bus/star/mesh topology characteristics.'),
    ('9618/11/M/J/24 Q8(b)(i)','2.1-lo-17','2.1-lo-17','The source asks why a router requires a public IP address.'),
    ('9618/11/M/J/24 Q8(b)(ii)','2.1-lo-17','2.1-lo-17','The source asks for IPv4/IPv6 addressing differences within IP-address use.')
), paper AS (
  SELECT sp.id source_paper_id,sp.sha256 qp_sha,sp.source_url qp_url,sp.syllabus_id
  FROM public.source_papers sp
  JOIN public.syllabi sy ON sy.id=sp.syllabus_id
  JOIN public.components c ON c.id=sp.component_id
  WHERE sy.code='9618' AND sy.version_label='2024-2025'
    AND sp.kind='QP'::paper_kind AND sp.year=2024
    AND sp.series='MJ'::exam_series AND c.number=1 AND sp.variant=1
    AND sp.sha256='2e39e6c2ee1e65d621df71b4b7fbe41a16f1e4ed8e252fb1612a6d14b13de063'
), ms_source AS (
  SELECT ms.id,ms.sha256,ms.source_url
  FROM paper p
  JOIN public.source_papers qp ON qp.id=p.source_paper_id
  JOIN public.source_papers ms
    ON ms.kind='MS'::paper_kind
   AND ms.syllabus_id=qp.syllabus_id
   AND ms.component_id=qp.component_id
   AND ms.year=qp.year AND ms.series=qp.series AND ms.variant=qp.variant
), resolved AS (
  SELECT
    x.*,
    q.id question_id,
    q.status::text old_status,
    q.stem_md,
    q.source_paper_id,
    qs.subtopic_id primary_subtopic_id,
    st.code primary_subtopic_code,
    qs.confidence primary_confidence,
    qs.set_by primary_set_by,
    old_lo.id old_lo_id,
    old_qlo.confidence old_lo_confidence,
    new_lo.id new_lo_id,
    p.qp_sha,p.qp_url,
    ms.id ms_source_id,ms.sha256 ms_sha,ms.source_url ms_url
  FROM curated x
  JOIN paper p ON true
  JOIN ms_source ms ON true
  JOIN public.questions q
    ON q.display_ref=x.display_ref
   AND q.source_paper_id=p.source_paper_id
   AND q.status='approved'
   AND q.marks IS NOT NULL
  JOIN public.question_subtopics qs ON qs.question_id=q.id AND qs.is_primary
  JOIN public.subtopics st ON st.id=qs.subtopic_id
  JOIN public.question_learning_objectives old_qlo ON old_qlo.question_id=q.id
  JOIN public.learning_objectives old_lo ON old_lo.id=old_qlo.lo_id AND old_lo.code=x.old_code
  JOIN public.learning_objectives new_lo ON new_lo.code=x.new_code
  JOIN public.subtopics new_st ON new_st.id=new_lo.subtopic_id AND new_st.code=st.code
  JOIN public.topics new_t ON new_t.id=new_st.topic_id
  JOIN public.syllabi new_s ON new_s.id=new_t.syllabus_id
    AND new_s.code='9618' AND new_s.version_label='2024-2025'
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
  'manual-source-audit-0174-mj24-11',
  md5(concat_ws('|',r.question_id::text,r.old_status,coalesce(r.stem_md,''),r.old_los::text)),
  r.old_status,
  r.primary_subtopic_id,
  r.primary_subtopic_code,
  r.primary_confidence,
  r.primary_set_by,
  r.old_los,
  r.primary_subtopic_id,
  r.primary_subtopic_code,
  r.primary_confidence,
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
    'qp_filename','9618_s24_qp_11.pdf',
    'qp_sha256',r.qp_sha,
    'qp_source_url',r.qp_url,
    'ms_filename','9618_s24_ms_11.pdf',
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
    AND h.review_tag='manual-source-audit-0174-mj24-11'
);

-- Remove only the two adjudicated false-positive objective edges.
WITH corrections(display_ref,old_code,new_code) AS (
  VALUES
    ('9618/11/M/J/24 Q1(a)','3.2-lo-05','3.2-lo-06'),
    ('9618/11/M/J/24 Q2(c)(ii)','3.1-lo-01','3.1-lo-06')
), resolved AS (
  SELECT q.id question_id,old_lo.id old_lo_id
  FROM corrections x
  JOIN public.questions q ON q.display_ref=x.display_ref
  JOIN public.source_papers sp ON sp.id=q.source_paper_id
  JOIN public.syllabi sy ON sy.id=sp.syllabus_id
    AND sy.code='9618' AND sy.version_label='2024-2025'
  JOIN public.learning_objectives old_lo ON old_lo.code=x.old_code
  JOIN public.subtopics old_st ON old_st.id=old_lo.subtopic_id
  JOIN public.topics old_t ON old_t.id=old_st.topic_id AND old_t.syllabus_id=sp.syllabus_id
)
DELETE FROM public.question_learning_objectives qlo
USING resolved r
WHERE qlo.question_id=r.question_id
  AND qlo.lo_id=r.old_lo_id;

-- Upsert the twenty retained mappings and two corrected mappings at reviewed
-- confidence 1.00. Targets are resolved through the source paper's own syllabus.
WITH curated(display_ref,target_code) AS (
  VALUES
    ('9618/11/M/J/24 Q1(a)','3.2-lo-06'),
    ('9618/11/M/J/24 Q1(b)','3.2-lo-04'),
    ('9618/11/M/J/24 Q2(b)','3.1-lo-10'),
    ('9618/11/M/J/24 Q2(c)(i)','3.1-lo-01'),
    ('9618/11/M/J/24 Q2(c)(ii)','3.1-lo-06'),
    ('9618/11/M/J/24 Q2(c)(iii)','3.1-lo-07'),
    ('9618/11/M/J/24 Q2(d)','1.2-lo-05'),
    ('9618/11/M/J/24 Q3(a)','5.2-lo-02'),
    ('9618/11/M/J/24 Q3(b)','5.2-lo-02'),
    ('9618/11/M/J/24 Q4(a)','4.2-lo-05'),
    ('9618/11/M/J/24 Q4(b)','4.3-lo-03'),
    ('9618/11/M/J/24 Q5(a)','2.1-lo-05'),
    ('9618/11/M/J/24 Q5(b)','6.2-lo-03'),
    ('9618/11/M/J/24 Q5(c)(i)','6.1-lo-03'),
    ('9618/11/M/J/24 Q6(a)','8.1-lo-05'),
    ('9618/11/M/J/24 Q6(b)','8.2-lo-02'),
    ('9618/11/M/J/24 Q6(c)(i)','8.3-lo-02'),
    ('9618/11/M/J/24 Q6(c)(ii)','8.3-lo-02'),
    ('9618/11/M/J/24 Q7','1.1-lo-02'),
    ('9618/11/M/J/24 Q8(a)','2.1-lo-08'),
    ('9618/11/M/J/24 Q8(b)(i)','2.1-lo-17'),
    ('9618/11/M/J/24 Q8(b)(ii)','2.1-lo-17')
), resolved AS (
  SELECT q.id question_id,lo.id lo_id
  FROM curated x
  JOIN public.questions q ON q.display_ref=x.display_ref
  JOIN public.source_papers sp ON sp.id=q.source_paper_id
  JOIN public.syllabi paper_s ON paper_s.id=sp.syllabus_id
    AND paper_s.code='9618' AND paper_s.version_label='2024-2025'
  JOIN public.learning_objectives lo ON lo.code=x.target_code
  JOIN public.subtopics st ON st.id=lo.subtopic_id
  JOIN public.topics t ON t.id=st.topic_id AND t.syllabus_id=sp.syllabus_id
  WHERE sp.kind='QP'::paper_kind
    AND sp.year=2024 AND sp.series='MJ'::exam_series AND sp.variant=1
)
INSERT INTO public.question_learning_objectives(question_id,lo_id,confidence)
SELECT question_id,lo_id,1.0
FROM resolved
ON CONFLICT(question_id,lo_id)
DO UPDATE SET confidence=GREATEST(public.question_learning_objectives.confidence,EXCLUDED.confidence);

DO $$
DECLARE
  v_reviewed integer;
  v_low integer;
  v_bad_old integer;
  v_bad_new integer;
BEGIN
  SELECT count(*) INTO v_reviewed
  FROM public.questions q
  JOIN public.source_papers sp ON sp.id=q.source_paper_id
  JOIN public.syllabi sy ON sy.id=sp.syllabus_id
  JOIN public.components component ON component.id=sp.component_id
  JOIN public.question_taxonomy_review_history h
    ON h.question_id=q.id
   AND h.review_tag='manual-source-audit-0174-mj24-11'
  WHERE sy.code='9618' AND sy.version_label='2024-2025'
    AND sp.kind='QP'::paper_kind
    AND sp.year=2024 AND sp.series='MJ'::exam_series AND sp.variant=1
    AND component.number=1
    AND q.marks IS NOT NULL;

  IF v_reviewed<>22 THEN
    RAISE EXCEPTION '0174 review-history postcondition failed: reviewed=% expected=22',v_reviewed;
  END IF;

  SELECT count(*) INTO v_low
  FROM public.questions q
  JOIN public.source_papers sp ON sp.id=q.source_paper_id
  JOIN public.syllabi sy ON sy.id=sp.syllabus_id
  JOIN public.components component ON component.id=sp.component_id
  WHERE sy.code='9618' AND sy.version_label='2024-2025'
    AND sp.kind='QP'::paper_kind
    AND sp.year=2024 AND sp.series='MJ'::exam_series AND sp.variant=1
    AND component.number=1
    AND q.marks IS NOT NULL
    AND q.status='approved'
    AND EXISTS (
      SELECT 1
      FROM public.question_learning_objectives qlo
      WHERE qlo.question_id=q.id
        AND coalesce(qlo.confidence,0)<0.95
    );

  IF v_low<>0 THEN
    RAISE EXCEPTION '0174 low-confidence LO postcondition failed: remaining=%',v_low;
  END IF;

  SELECT count(*) INTO v_bad_old
  FROM public.questions q
  JOIN public.question_learning_objectives qlo ON qlo.question_id=q.id
  JOIN public.learning_objectives lo ON lo.id=qlo.lo_id
  WHERE (q.display_ref='9618/11/M/J/24 Q1(a)' AND lo.code='3.2-lo-05')
     OR (q.display_ref='9618/11/M/J/24 Q2(c)(ii)' AND lo.code='3.1-lo-01');

  IF v_bad_old<>0 THEN
    RAISE EXCEPTION '0174 stale false-positive mappings remain: %',v_bad_old;
  END IF;

  SELECT count(*) INTO v_bad_new
  FROM (
    VALUES
      ('9618/11/M/J/24 Q1(a)'::text,'3.2-lo-06'::text),
      ('9618/11/M/J/24 Q2(c)(ii)'::text,'3.1-lo-06'::text)
  ) x(display_ref,target_code)
  LEFT JOIN public.questions q ON q.display_ref=x.display_ref
  LEFT JOIN public.question_learning_objectives qlo
    ON qlo.question_id=q.id AND qlo.confidence=1.0
  LEFT JOIN public.learning_objectives lo
    ON lo.id=qlo.lo_id AND lo.code=x.target_code
  WHERE lo.id IS NULL;

  IF v_bad_new<>0 THEN
    RAISE EXCEPTION '0174 corrected mapping postcondition failed: missing=%',v_bad_new;
  END IF;
END $$;
