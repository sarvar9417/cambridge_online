-- 0177_9618_2026_mj11_taxonomy_closure.sql
-- Source-backed closure of Cambridge 9618/11/M/J/26 taxonomy.
--
-- Evidence reviewed:
--   QP 9618_s26_qp_11.pdf
--     SHA-256 17ad7576cf687fbcc3c8912523852e55a0836736b84077255c10d3e97a80a5d0
--   MS 9618_s26_ms_11.pdf
--     SHA-256 770b536d04daea335f382b7ec8a2ab69efc266d478b1b95fea25a2d0e1f8cf91
--   Cambridge International AS & A Level Computer Science 9618 syllabus for 2026
--     Drive source 1PvTiGuvynVCkW283YHHIRA5UZGjRrDRw
--
-- The migration adjudicates every one of the 29 approved scoring leaves on
-- Paper 11. It corrects twelve LO identities, moves Q4(d)(i)/(ii) from the
-- database-concepts subtopic to Data Integrity 6.2, and source-reviews the
-- remaining mappings. Question/LaTeX/MS/asset/dependency content is untouched.

DO $$
DECLARE
  v_qp uuid;
  v_ms uuid;
  v_questions integer;
  v_lo_edges integer;
BEGIN
  SELECT qp.id,ms.id INTO v_qp,v_ms
  FROM public.syllabi sy
  JOIN public.components c
    ON c.syllabus_id=sy.id AND c.number=1
  JOIN public.source_papers qp
    ON qp.syllabus_id=sy.id
   AND qp.component_id=c.id
   AND qp.kind='QP'::paper_kind
   AND qp.year=2026
   AND qp.series='MJ'::exam_series
   AND qp.variant=1
   AND qp.sha256='17ad7576cf687fbcc3c8912523852e55a0836736b84077255c10d3e97a80a5d0'
   AND qp.page_count=16
   AND nullif(btrim(coalesce(qp.source_url,'')),'') IS NOT NULL
  JOIN public.source_papers ms
    ON ms.syllabus_id=sy.id
   AND ms.component_id=c.id
   AND ms.kind='MS'::paper_kind
   AND ms.year=qp.year
   AND ms.series=qp.series
   AND ms.variant=qp.variant
   AND ms.sha256='770b536d04daea335f382b7ec8a2ab69efc266d478b1b95fea25a2d0e1f8cf91'
   AND ms.page_count=17
   AND nullif(btrim(coalesce(ms.source_url,'')),'') IS NOT NULL
  WHERE sy.code='9618'
    AND sy.version_label='2026-2028';

  IF v_qp IS NULL OR v_ms IS NULL THEN
    RAISE EXCEPTION '0177 exact 9618/11/M/J/26 QP/MS source gate failed';
  END IF;

  WITH curated(display_ref,old_primary,new_primary,rationale) AS (
    VALUES
      ('9618/11/M/J/26 Q1(a)(i)','1.1','1.1','Unicode conversion table directly assesses internal character representation.'),
      ('9618/11/M/J/26 Q1(a)(ii)','1.1','1.1','ASCII/Unicode comparison directly assesses character-set representation.'),
      ('9618/11/M/J/26 Q1(b)','1.1','1.1','Two''s-complement to denary conversion is number representation conversion.'),
      ('9618/11/M/J/26 Q1(c)','1.1','1.1','Task explicitly requires binary subtraction.'),
      ('9618/11/M/J/26 Q1(d)','1.1','1.1','Task explicitly compares binary and decimal prefixes.'),
      ('9618/11/M/J/26 Q2(a)','5.2','5.2','Task asks why language translators are needed.'),
      ('9618/11/M/J/26 Q2(b)','5.2','5.2','Task compares interpreter benefits with a compiler.'),
      ('9618/11/M/J/26 Q2(c)','5.2','5.2','Assembler is another language translator.'),
      ('9618/11/M/J/26 Q2(d)','7.1','7.1','Task identifies software licence types.'),
      ('9618/11/M/J/26 Q3(a)','4.2','4.2','Task traces assembly instruction sequences and accumulator state.'),
      ('9618/11/M/J/26 Q3(b)(i)','4.3','4.3','Task requires a bitwise operation that clears the accumulator.'),
      ('9618/11/M/J/26 Q3(b)(ii)','4.3','4.3','Task directly performs a logical binary shift.'),
      ('9618/11/M/J/26 Q3(c)','4.2','4.2','Task identifies, describes and exemplifies an addressing mode.'),
      ('9618/11/M/J/26 Q4(a)','8.1','8.1','Task uses relational-database terminology: relationships, primary keys and foreign keys.'),
      ('9618/11/M/J/26 Q4(b)','8.3','8.3','Task requires writing an SQL query joining tables and aggregating data.'),
      ('9618/11/M/J/26 Q4(c)(i)','8.3','8.3','ALTER TABLE ADD is a DDL task.'),
      ('9618/11/M/J/26 Q4(c)(ii)','8.3','8.3','UPDATE SET WHERE is a DML task.'),
      ('9618/11/M/J/26 Q4(d)(i)','8.1','6.2','Task directly asks how validation and verification protect data integrity.'),
      ('9618/11/M/J/26 Q4(d)(ii)','8.1','6.2','Task asks why validated and verified data may still be incorrect.'),
      ('9618/11/M/J/26 Q5(a)','1.2','1.2','Task asks how bitmap image data are encoded.'),
      ('9618/11/M/J/26 Q5(b)','1.2','1.2','Drawing object/property/drawing list are vector-encoding concepts.'),
      ('9618/11/M/J/26 Q5(c)','1.2','1.2','Task requires justifying bitmap versus vector for a given use.'),
      ('9618/11/M/J/26 Q6(a)','3.2','3.2','Task requires construction of logic expressions from a circuit.'),
      ('9618/11/M/J/26 Q6(b)','3.2','3.2','Task requires construction of a NAND truth table.'),
      ('9618/11/M/J/26 Q7(a)','2.1','2.1','Task asks for thin-client characteristics.'),
      ('9618/11/M/J/26 Q7(b)(i)','2.1','2.1','Task combines bus topology with Ethernet/CSMA-CD transmission.'),
      ('9618/11/M/J/26 Q7(b)(ii)','2.1','2.1','Task asks for drawbacks of bus topology.'),
      ('9618/11/M/J/26 Q7(c)(i)','2.1','2.1','Task asks about a static private IP address.'),
      ('9618/11/M/J/26 Q7(c)(ii)','2.1','2.1','Subnetting is assessed in the IP-address/network context.')
  ), resolved AS (
    SELECT x.*,q.id question_id,qs.confidence primary_confidence,
           st.code actual_primary
    FROM curated x
    JOIN public.questions q
      ON q.display_ref=x.display_ref
     AND q.source_paper_id=v_qp
     AND q.status='approved'
     AND q.marks IS NOT NULL
    JOIN public.question_subtopics qs
      ON qs.question_id=q.id AND qs.is_primary
    JOIN public.subtopics st
      ON st.id=qs.subtopic_id AND st.code=x.old_primary
  )
  SELECT count(*) INTO v_questions
  FROM resolved
  WHERE primary_confidence<0.95;

  IF v_questions<>29 THEN
    RAISE EXCEPTION '0177 Paper 11 question/primary identity gate failed: rows=% expected=29',v_questions;
  END IF;

  WITH curated(display_ref,old_code,new_code) AS (
    VALUES
      ('9618/11/M/J/26 Q1(a)(i)','1.1.7','1.1.7'),
      ('9618/11/M/J/26 Q1(a)(ii)','1.1.7','1.1.7'),
      ('9618/11/M/J/26 Q1(b)','1.1.7','1.1.3'),
      ('9618/11/M/J/26 Q1(c)','1.1.4','1.1.4'),
      ('9618/11/M/J/26 Q1(d)','1.1.1','1.1.1'),
      ('9618/11/M/J/26 Q2(a)','5.2.1','5.2.1'),
      ('9618/11/M/J/26 Q2(b)','5.2.1','5.2.2'),
      ('9618/11/M/J/26 Q2(c)','5.2.1','5.2.1'),
      ('9618/11/M/J/26 Q2(d)','7.1.4','7.1.4'),
      ('9618/11/M/J/26 Q3(a)','4.2.5','4.2.4'),
      ('9618/11/M/J/26 Q3(b)(i)','4.3.2','4.3.3'),
      ('9618/11/M/J/26 Q3(b)(ii)','4.3.2','4.3.1'),
      ('9618/11/M/J/26 Q3(c)','4.2.6','4.2.6'),
      ('9618/11/M/J/26 Q4(a)','8.1.4','8.1.3'),
      ('9618/11/M/J/26 Q4(b)','8.3.3','8.3.6'),
      ('9618/11/M/J/26 Q4(c)(i)','8.3.6','8.3.5'),
      ('9618/11/M/J/26 Q4(c)(ii)','8.3.6','8.3.6'),
      ('9618/11/M/J/26 Q4(d)(i)','8.1.1','6.2.1'),
      ('9618/11/M/J/26 Q4(d)(ii)','8.1.1','6.2.1'),
      ('9618/11/M/J/26 Q5(a)','1.2.5','1.2.1'),
      ('9618/11/M/J/26 Q5(b)','1.2.5','1.2.4'),
      ('9618/11/M/J/26 Q5(c)','1.2.5','1.2.5'),
      ('9618/11/M/J/26 Q6(a)','3.2.5','3.2.5'),
      ('9618/11/M/J/26 Q6(b)','3.2.2','3.2.2'),
      ('9618/11/M/J/26 Q7(a)','2.1.4','2.1.4'),
      ('9618/11/M/J/26 Q7(b)(i)','2.1.10','2.1.10'),
      ('9618/11/M/J/26 Q7(b)(i)','2.1.5','2.1.5'),
      ('9618/11/M/J/26 Q7(b)(ii)','2.1.5','2.1.5'),
      ('9618/11/M/J/26 Q7(c)(i)','2.1.14','2.1.14'),
      ('9618/11/M/J/26 Q7(c)(ii)','2.1.14','2.1.14')
  ), resolved AS (
    SELECT x.*,q.id question_id,old_lo.id old_lo_id,new_lo.id new_lo_id
    FROM curated x
    JOIN public.questions q
      ON q.display_ref=x.display_ref
     AND q.source_paper_id=v_qp
     AND q.status='approved'
     AND q.marks IS NOT NULL
    JOIN public.learning_objectives old_lo ON old_lo.code=x.old_code
    JOIN public.subtopics old_st ON old_st.id=old_lo.subtopic_id
    JOIN public.topics old_t ON old_t.id=old_st.topic_id
    JOIN public.syllabi old_sy
      ON old_sy.id=old_t.syllabus_id
     AND old_sy.code='9618'
     AND old_sy.version_label='2026-2028'
    JOIN public.question_learning_objectives qlo
      ON qlo.question_id=q.id AND qlo.lo_id=old_lo.id
    JOIN public.learning_objectives new_lo ON new_lo.code=x.new_code
    JOIN public.subtopics new_st ON new_st.id=new_lo.subtopic_id
    JOIN public.topics new_t ON new_t.id=new_st.topic_id
    JOIN public.syllabi new_sy
      ON new_sy.id=new_t.syllabus_id
     AND new_sy.id=old_sy.id
  )
  SELECT count(*) INTO v_lo_edges FROM resolved;

  IF v_lo_edges<>30 THEN
    RAISE EXCEPTION '0177 Paper 11 LO identity gate failed: rows=% expected=30',v_lo_edges;
  END IF;
END $$;

-- Durable history is recorded before any taxonomy edges are changed.
WITH curated_q(display_ref,old_primary,new_primary,rationale) AS (
  VALUES
    ('9618/11/M/J/26 Q1(a)(i)','1.1','1.1','Unicode conversion table directly assesses internal character representation.'),
    ('9618/11/M/J/26 Q1(a)(ii)','1.1','1.1','ASCII/Unicode comparison directly assesses character-set representation.'),
    ('9618/11/M/J/26 Q1(b)','1.1','1.1','Two''s-complement to denary conversion is number representation conversion.'),
    ('9618/11/M/J/26 Q1(c)','1.1','1.1','Task explicitly requires binary subtraction.'),
    ('9618/11/M/J/26 Q1(d)','1.1','1.1','Task explicitly compares binary and decimal prefixes.'),
    ('9618/11/M/J/26 Q2(a)','5.2','5.2','Task asks why language translators are needed.'),
    ('9618/11/M/J/26 Q2(b)','5.2','5.2','Task compares interpreter benefits with a compiler.'),
    ('9618/11/M/J/26 Q2(c)','5.2','5.2','Assembler is another language translator.'),
    ('9618/11/M/J/26 Q2(d)','7.1','7.1','Task identifies software licence types.'),
    ('9618/11/M/J/26 Q3(a)','4.2','4.2','Task traces assembly instruction sequences and accumulator state.'),
    ('9618/11/M/J/26 Q3(b)(i)','4.3','4.3','Task requires a bitwise operation that clears the accumulator.'),
    ('9618/11/M/J/26 Q3(b)(ii)','4.3','4.3','Task directly performs a logical binary shift.'),
    ('9618/11/M/J/26 Q3(c)','4.2','4.2','Task identifies, describes and exemplifies an addressing mode.'),
    ('9618/11/M/J/26 Q4(a)','8.1','8.1','Task uses relational-database terminology: relationships, primary keys and foreign keys.'),
    ('9618/11/M/J/26 Q4(b)','8.3','8.3','Task requires writing an SQL query joining tables and aggregating data.'),
    ('9618/11/M/J/26 Q4(c)(i)','8.3','8.3','ALTER TABLE ADD is a DDL task.'),
    ('9618/11/M/J/26 Q4(c)(ii)','8.3','8.3','UPDATE SET WHERE is a DML task.'),
    ('9618/11/M/J/26 Q4(d)(i)','8.1','6.2','Task directly asks how validation and verification protect data integrity.'),
    ('9618/11/M/J/26 Q4(d)(ii)','8.1','6.2','Task asks why validated and verified data may still be incorrect.'),
    ('9618/11/M/J/26 Q5(a)','1.2','1.2','Task asks how bitmap image data are encoded.'),
    ('9618/11/M/J/26 Q5(b)','1.2','1.2','Drawing object/property/drawing list are vector-encoding concepts.'),
    ('9618/11/M/J/26 Q5(c)','1.2','1.2','Task requires justifying bitmap versus vector for a given use.'),
    ('9618/11/M/J/26 Q6(a)','3.2','3.2','Task requires construction of logic expressions from a circuit.'),
    ('9618/11/M/J/26 Q6(b)','3.2','3.2','Task requires construction of a NAND truth table.'),
    ('9618/11/M/J/26 Q7(a)','2.1','2.1','Task asks for thin-client characteristics.'),
    ('9618/11/M/J/26 Q7(b)(i)','2.1','2.1','Task combines bus topology with Ethernet/CSMA-CD transmission.'),
    ('9618/11/M/J/26 Q7(b)(ii)','2.1','2.1','Task asks for drawbacks of bus topology.'),
    ('9618/11/M/J/26 Q7(c)(i)','2.1','2.1','Task asks about a static private IP address.'),
    ('9618/11/M/J/26 Q7(c)(ii)','2.1','2.1','Subnetting is assessed in the IP-address/network context.')
), curated_lo(display_ref,old_code,new_code) AS (
  VALUES
    ('9618/11/M/J/26 Q1(a)(i)','1.1.7','1.1.7'),
    ('9618/11/M/J/26 Q1(a)(ii)','1.1.7','1.1.7'),
    ('9618/11/M/J/26 Q1(b)','1.1.7','1.1.3'),
    ('9618/11/M/J/26 Q1(c)','1.1.4','1.1.4'),
    ('9618/11/M/J/26 Q1(d)','1.1.1','1.1.1'),
    ('9618/11/M/J/26 Q2(a)','5.2.1','5.2.1'),
    ('9618/11/M/J/26 Q2(b)','5.2.1','5.2.2'),
    ('9618/11/M/J/26 Q2(c)','5.2.1','5.2.1'),
    ('9618/11/M/J/26 Q2(d)','7.1.4','7.1.4'),
    ('9618/11/M/J/26 Q3(a)','4.2.5','4.2.4'),
    ('9618/11/M/J/26 Q3(b)(i)','4.3.2','4.3.3'),
    ('9618/11/M/J/26 Q3(b)(ii)','4.3.2','4.3.1'),
    ('9618/11/M/J/26 Q3(c)','4.2.6','4.2.6'),
    ('9618/11/M/J/26 Q4(a)','8.1.4','8.1.3'),
    ('9618/11/M/J/26 Q4(b)','8.3.3','8.3.6'),
    ('9618/11/M/J/26 Q4(c)(i)','8.3.6','8.3.5'),
    ('9618/11/M/J/26 Q4(c)(ii)','8.3.6','8.3.6'),
    ('9618/11/M/J/26 Q4(d)(i)','8.1.1','6.2.1'),
    ('9618/11/M/J/26 Q4(d)(ii)','8.1.1','6.2.1'),
    ('9618/11/M/J/26 Q5(a)','1.2.5','1.2.1'),
    ('9618/11/M/J/26 Q5(b)','1.2.5','1.2.4'),
    ('9618/11/M/J/26 Q5(c)','1.2.5','1.2.5'),
    ('9618/11/M/J/26 Q6(a)','3.2.5','3.2.5'),
    ('9618/11/M/J/26 Q6(b)','3.2.2','3.2.2'),
    ('9618/11/M/J/26 Q7(a)','2.1.4','2.1.4'),
    ('9618/11/M/J/26 Q7(b)(i)','2.1.10','2.1.10'),
    ('9618/11/M/J/26 Q7(b)(i)','2.1.5','2.1.5'),
    ('9618/11/M/J/26 Q7(b)(ii)','2.1.5','2.1.5'),
    ('9618/11/M/J/26 Q7(c)(i)','2.1.14','2.1.14'),
    ('9618/11/M/J/26 Q7(c)(ii)','2.1.14','2.1.14')
), paper AS (
  SELECT qp.id qp_id,qp.sha256 qp_sha,qp.source_url qp_url,
         ms.sha256 ms_sha,ms.source_url ms_url,qp.syllabus_id
  FROM public.syllabi sy
  JOIN public.components c ON c.syllabus_id=sy.id AND c.number=1
  JOIN public.source_papers qp
    ON qp.syllabus_id=sy.id AND qp.component_id=c.id
   AND qp.kind='QP'::paper_kind AND qp.year=2026
   AND qp.series='MJ'::exam_series AND qp.variant=1
   AND qp.sha256='17ad7576cf687fbcc3c8912523852e55a0836736b84077255c10d3e97a80a5d0'
  JOIN public.source_papers ms
    ON ms.syllabus_id=sy.id AND ms.component_id=c.id
   AND ms.kind='MS'::paper_kind AND ms.year=qp.year
   AND ms.series=qp.series AND ms.variant=qp.variant
   AND ms.sha256='770b536d04daea335f382b7ec8a2ab69efc266d478b1b95fea25a2d0e1f8cf91'
  WHERE sy.code='9618' AND sy.version_label='2026-2028'
), resolved AS (
  SELECT cq.*,q.id question_id,q.status::text old_status,q.stem_md,q.source_paper_id,
         old_st.id old_primary_id,qs.confidence old_primary_confidence,qs.set_by old_primary_set_by,
         new_st.id new_primary_id,p.qp_sha,p.qp_url,p.ms_sha,p.ms_url,p.syllabus_id
  FROM curated_q cq
  JOIN paper p ON true
  JOIN public.questions q
    ON q.display_ref=cq.display_ref AND q.source_paper_id=p.qp_id
   AND q.status='approved' AND q.marks IS NOT NULL
  JOIN public.question_subtopics qs ON qs.question_id=q.id AND qs.is_primary
  JOIN public.subtopics old_st ON old_st.id=qs.subtopic_id AND old_st.code=cq.old_primary
  JOIN public.topics old_t ON old_t.id=old_st.topic_id AND old_t.syllabus_id=p.syllabus_id
  JOIN public.subtopics new_st ON new_st.code=cq.new_primary
  JOIN public.topics new_t ON new_t.id=new_st.topic_id AND new_t.syllabus_id=p.syllabus_id
), states AS (
  SELECT r.*,
    (
      SELECT jsonb_agg(jsonb_build_object(
        'lo_id',lo.id,'code',lo.code,'confidence',qlo.confidence
      ) ORDER BY lo.code)
      FROM public.question_learning_objectives qlo
      JOIN public.learning_objectives lo ON lo.id=qlo.lo_id
      WHERE qlo.question_id=r.question_id
    ) old_los,
    (
      SELECT jsonb_agg(jsonb_build_object(
        'lo_id',new_lo.id,'code',cl.new_code,'confidence',1.0
      ) ORDER BY cl.new_code)
      FROM curated_lo cl
      JOIN public.learning_objectives new_lo ON new_lo.code=cl.new_code
      JOIN public.subtopics nst ON nst.id=new_lo.subtopic_id
      JOIN public.topics nt ON nt.id=nst.topic_id AND nt.syllabus_id=r.syllabus_id
      WHERE cl.display_ref=r.display_ref
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
  s.question_id,s.source_paper_id,'manual-source-audit-0177-2026-mj11',
  md5(concat_ws('|',s.question_id::text,s.old_status,coalesce(s.stem_md,''),s.old_los::text)),
  s.old_status,
  s.old_primary_id,s.old_primary,s.old_primary_confidence,s.old_primary_set_by,s.old_los,
  s.new_primary_id,s.new_primary,1.0,s.new_los,
  jsonb_build_object(
    'method','manual official QP/MS + official Cambridge 9618 syllabus 2026 review',
    'question_ref',s.display_ref,
    'reason',s.rationale,
    'question_status_preserved',true
  ),
  jsonb_build_object(
    'source_backed',true,
    'qualification','9618',
    'syllabus_version','2026-2028',
    'qp_filename','9618_s26_qp_11.pdf',
    'qp_sha256',s.qp_sha,'qp_source_url',s.qp_url,
    'ms_filename','9618_s26_ms_11.pdf',
    'ms_sha256',s.ms_sha,'ms_source_url',s.ms_url,
    'syllabus_filename','9618 Computer Science Syllabus 2026.pdf',
    'syllabus_source_url','https://drive.google.com/file/d/1PvTiGuvynVCkW283YHHIRA5UZGjRrDRw/view'
  )
FROM states s
WHERE NOT EXISTS (
  SELECT 1 FROM public.question_taxonomy_review_history h
  WHERE h.question_id=s.question_id
    AND h.review_tag='manual-source-audit-0177-2026-mj11'
);

-- Delete only LO edges whose source-reviewed target is a different objective.
WITH corrections(display_ref,old_code,new_code) AS (
  VALUES
    ('9618/11/M/J/26 Q1(b)','1.1.7','1.1.3'),
    ('9618/11/M/J/26 Q2(b)','5.2.1','5.2.2'),
    ('9618/11/M/J/26 Q3(a)','4.2.5','4.2.4'),
    ('9618/11/M/J/26 Q3(b)(i)','4.3.2','4.3.3'),
    ('9618/11/M/J/26 Q3(b)(ii)','4.3.2','4.3.1'),
    ('9618/11/M/J/26 Q4(a)','8.1.4','8.1.3'),
    ('9618/11/M/J/26 Q4(b)','8.3.3','8.3.6'),
    ('9618/11/M/J/26 Q4(c)(i)','8.3.6','8.3.5'),
    ('9618/11/M/J/26 Q4(d)(i)','8.1.1','6.2.1'),
    ('9618/11/M/J/26 Q4(d)(ii)','8.1.1','6.2.1'),
    ('9618/11/M/J/26 Q5(a)','1.2.5','1.2.1'),
    ('9618/11/M/J/26 Q5(b)','1.2.5','1.2.4')
), paper AS (
  SELECT qp.id,qp.syllabus_id
  FROM public.source_papers qp
  JOIN public.syllabi sy ON sy.id=qp.syllabus_id
  JOIN public.components c ON c.id=qp.component_id
  WHERE sy.code='9618' AND sy.version_label='2026-2028'
    AND c.number=1 AND qp.kind='QP'::paper_kind
    AND qp.year=2026 AND qp.series='MJ'::exam_series AND qp.variant=1
    AND qp.sha256='17ad7576cf687fbcc3c8912523852e55a0836736b84077255c10d3e97a80a5d0'
), resolved AS (
  SELECT q.id question_id,old_lo.id old_lo_id
  FROM corrections x
  JOIN paper p ON true
  JOIN public.questions q ON q.display_ref=x.display_ref AND q.source_paper_id=p.id
  JOIN public.learning_objectives old_lo ON old_lo.code=x.old_code
  JOIN public.subtopics st ON st.id=old_lo.subtopic_id
  JOIN public.topics t ON t.id=st.topic_id AND t.syllabus_id=p.syllabus_id
)
DELETE FROM public.question_learning_objectives qlo
USING resolved r
WHERE qlo.question_id=r.question_id AND qlo.lo_id=r.old_lo_id;

-- Upsert all 30 source-reviewed LO edges at reviewed confidence 1.00.
WITH curated(display_ref,target_code) AS (
  VALUES
    ('9618/11/M/J/26 Q1(a)(i)','1.1.7'),
    ('9618/11/M/J/26 Q1(a)(ii)','1.1.7'),
    ('9618/11/M/J/26 Q1(b)','1.1.3'),
    ('9618/11/M/J/26 Q1(c)','1.1.4'),
    ('9618/11/M/J/26 Q1(d)','1.1.1'),
    ('9618/11/M/J/26 Q2(a)','5.2.1'),
    ('9618/11/M/J/26 Q2(b)','5.2.2'),
    ('9618/11/M/J/26 Q2(c)','5.2.1'),
    ('9618/11/M/J/26 Q2(d)','7.1.4'),
    ('9618/11/M/J/26 Q3(a)','4.2.4'),
    ('9618/11/M/J/26 Q3(b)(i)','4.3.3'),
    ('9618/11/M/J/26 Q3(b)(ii)','4.3.1'),
    ('9618/11/M/J/26 Q3(c)','4.2.6'),
    ('9618/11/M/J/26 Q4(a)','8.1.3'),
    ('9618/11/M/J/26 Q4(b)','8.3.6'),
    ('9618/11/M/J/26 Q4(c)(i)','8.3.5'),
    ('9618/11/M/J/26 Q4(c)(ii)','8.3.6'),
    ('9618/11/M/J/26 Q4(d)(i)','6.2.1'),
    ('9618/11/M/J/26 Q4(d)(ii)','6.2.1'),
    ('9618/11/M/J/26 Q5(a)','1.2.1'),
    ('9618/11/M/J/26 Q5(b)','1.2.4'),
    ('9618/11/M/J/26 Q5(c)','1.2.5'),
    ('9618/11/M/J/26 Q6(a)','3.2.5'),
    ('9618/11/M/J/26 Q6(b)','3.2.2'),
    ('9618/11/M/J/26 Q7(a)','2.1.4'),
    ('9618/11/M/J/26 Q7(b)(i)','2.1.10'),
    ('9618/11/M/J/26 Q7(b)(i)','2.1.5'),
    ('9618/11/M/J/26 Q7(b)(ii)','2.1.5'),
    ('9618/11/M/J/26 Q7(c)(i)','2.1.14'),
    ('9618/11/M/J/26 Q7(c)(ii)','2.1.14')
), paper AS (
  SELECT qp.id,qp.syllabus_id
  FROM public.source_papers qp
  JOIN public.syllabi sy ON sy.id=qp.syllabus_id
  JOIN public.components c ON c.id=qp.component_id
  WHERE sy.code='9618' AND sy.version_label='2026-2028'
    AND c.number=1 AND qp.kind='QP'::paper_kind
    AND qp.year=2026 AND qp.series='MJ'::exam_series AND qp.variant=1
    AND qp.sha256='17ad7576cf687fbcc3c8912523852e55a0836736b84077255c10d3e97a80a5d0'
), resolved AS (
  SELECT q.id question_id,lo.id lo_id
  FROM curated x
  JOIN paper p ON true
  JOIN public.questions q ON q.display_ref=x.display_ref AND q.source_paper_id=p.id
  JOIN public.learning_objectives lo ON lo.code=x.target_code
  JOIN public.subtopics st ON st.id=lo.subtopic_id
  JOIN public.topics t ON t.id=st.topic_id AND t.syllabus_id=p.syllabus_id
)
INSERT INTO public.question_learning_objectives(question_id,lo_id,confidence)
SELECT question_id,lo_id,1.0 FROM resolved
ON CONFLICT(question_id,lo_id)
DO UPDATE SET confidence=GREATEST(public.question_learning_objectives.confidence,EXCLUDED.confidence);

-- Two questions are genuinely Data Integrity (6.2), not Database Concepts (8.1).
WITH refs(display_ref) AS (
  VALUES
    ('9618/11/M/J/26 Q4(d)(i)'),
    ('9618/11/M/J/26 Q4(d)(ii)')
), paper AS (
  SELECT qp.id,qp.syllabus_id
  FROM public.source_papers qp
  JOIN public.syllabi sy ON sy.id=qp.syllabus_id
  JOIN public.components c ON c.id=qp.component_id
  WHERE sy.code='9618' AND sy.version_label='2026-2028'
    AND c.number=1 AND qp.kind='QP'::paper_kind
    AND qp.year=2026 AND qp.series='MJ'::exam_series AND qp.variant=1
    AND qp.sha256='17ad7576cf687fbcc3c8912523852e55a0836736b84077255c10d3e97a80a5d0'
), targets AS (
  SELECT q.id question_id,new_st.id new_subtopic_id
  FROM refs r
  JOIN paper p ON true
  JOIN public.questions q ON q.display_ref=r.display_ref AND q.source_paper_id=p.id
  JOIN public.subtopics new_st ON new_st.code='6.2'
  JOIN public.topics nt ON nt.id=new_st.topic_id AND nt.syllabus_id=p.syllabus_id
)
DELETE FROM public.question_subtopics qs
USING targets t
WHERE qs.question_id=t.question_id AND qs.is_primary;

WITH refs(display_ref) AS (
  VALUES
    ('9618/11/M/J/26 Q4(d)(i)'),
    ('9618/11/M/J/26 Q4(d)(ii)')
), paper AS (
  SELECT qp.id,qp.syllabus_id
  FROM public.source_papers qp
  JOIN public.syllabi sy ON sy.id=qp.syllabus_id
  JOIN public.components c ON c.id=qp.component_id
  WHERE sy.code='9618' AND sy.version_label='2026-2028'
    AND c.number=1 AND qp.kind='QP'::paper_kind
    AND qp.year=2026 AND qp.series='MJ'::exam_series AND qp.variant=1
    AND qp.sha256='17ad7576cf687fbcc3c8912523852e55a0836736b84077255c10d3e97a80a5d0'
), targets AS (
  SELECT q.id question_id,new_st.id new_subtopic_id
  FROM refs r
  JOIN paper p ON true
  JOIN public.questions q ON q.display_ref=r.display_ref AND q.source_paper_id=p.id
  JOIN public.subtopics new_st ON new_st.code='6.2'
  JOIN public.topics nt ON nt.id=new_st.topic_id AND nt.syllabus_id=p.syllabus_id
)
INSERT INTO public.question_subtopics(question_id,subtopic_id,is_primary,weight,confidence,set_by)
SELECT question_id,new_subtopic_id,true,1.0,1.0,'manual-source-audit-0177'
FROM targets
ON CONFLICT(question_id,subtopic_id)
DO UPDATE SET is_primary=true,weight=1.0,confidence=1.0,set_by='manual-source-audit-0177';

-- Every other Paper 11 primary mapping was correct; promote it after review.
WITH paper AS (
  SELECT qp.id
  FROM public.source_papers qp
  JOIN public.syllabi sy ON sy.id=qp.syllabus_id
  JOIN public.components c ON c.id=qp.component_id
  WHERE sy.code='9618' AND sy.version_label='2026-2028'
    AND c.number=1 AND qp.kind='QP'::paper_kind
    AND qp.year=2026 AND qp.series='MJ'::exam_series AND qp.variant=1
    AND qp.sha256='17ad7576cf687fbcc3c8912523852e55a0836736b84077255c10d3e97a80a5d0'
)
UPDATE public.question_subtopics qs
SET confidence=1.0,set_by='manual-source-audit-0177'
FROM public.questions q,paper p
WHERE qs.question_id=q.id
  AND qs.is_primary
  AND q.source_paper_id=p.id
  AND q.status='approved'
  AND q.marks IS NOT NULL
  AND qs.confidence<0.95;

DO $$
DECLARE
  v_qp uuid;
  v_history integer;
  v_leaves integer;
  v_low_primary integer;
  v_low_lo integer;
  v_bad integer;
BEGIN
  SELECT qp.id INTO v_qp
  FROM public.source_papers qp
  JOIN public.syllabi sy ON sy.id=qp.syllabus_id
  JOIN public.components c ON c.id=qp.component_id
  WHERE sy.code='9618' AND sy.version_label='2026-2028'
    AND c.number=1 AND qp.kind='QP'::paper_kind
    AND qp.year=2026 AND qp.series='MJ'::exam_series AND qp.variant=1
    AND qp.sha256='17ad7576cf687fbcc3c8912523852e55a0836736b84077255c10d3e97a80a5d0';

  SELECT count(*) INTO v_history
  FROM public.question_taxonomy_review_history h
  JOIN public.questions q ON q.id=h.question_id
  WHERE q.source_paper_id=v_qp
    AND h.review_tag='manual-source-audit-0177-2026-mj11';

  SELECT count(*) INTO v_leaves
  FROM public.questions q
  WHERE q.source_paper_id=v_qp AND q.status='approved' AND q.marks IS NOT NULL;

  SELECT count(*) INTO v_low_primary
  FROM public.questions q
  WHERE q.source_paper_id=v_qp AND q.status='approved' AND q.marks IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.question_subtopics qs
      WHERE qs.question_id=q.id AND qs.is_primary AND coalesce(qs.confidence,0)<0.95
    );

  SELECT count(*) INTO v_low_lo
  FROM public.questions q
  WHERE q.source_paper_id=v_qp AND q.status='approved' AND q.marks IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.question_learning_objectives qlo
      WHERE qlo.question_id=q.id AND coalesce(qlo.confidence,0)<0.95
    );

  IF v_history<>29 OR v_leaves<>29 OR v_low_primary<>0 OR v_low_lo<>0 THEN
    RAISE EXCEPTION
      '0177 Paper11 closure failed: history=% leaves=% low_primary=% low_lo=%',
      v_history,v_leaves,v_low_primary,v_low_lo;
  END IF;

  SELECT count(*) INTO v_bad
  FROM (
    VALUES
      ('9618/11/M/J/26 Q1(b)'::text,'1.1.7'::text,'1.1.3'::text),
      ('9618/11/M/J/26 Q2(b)','5.2.1','5.2.2'),
      ('9618/11/M/J/26 Q3(a)','4.2.5','4.2.4'),
      ('9618/11/M/J/26 Q3(b)(i)','4.3.2','4.3.3'),
      ('9618/11/M/J/26 Q3(b)(ii)','4.3.2','4.3.1'),
      ('9618/11/M/J/26 Q4(a)','8.1.4','8.1.3'),
      ('9618/11/M/J/26 Q4(b)','8.3.3','8.3.6'),
      ('9618/11/M/J/26 Q4(c)(i)','8.3.6','8.3.5'),
      ('9618/11/M/J/26 Q4(d)(i)','8.1.1','6.2.1'),
      ('9618/11/M/J/26 Q4(d)(ii)','8.1.1','6.2.1'),
      ('9618/11/M/J/26 Q5(a)','1.2.5','1.2.1'),
      ('9618/11/M/J/26 Q5(b)','1.2.5','1.2.4')
  ) x(display_ref,old_code,new_code)
  WHERE EXISTS (
    SELECT 1
    FROM public.questions q
    JOIN public.question_learning_objectives qlo ON qlo.question_id=q.id
    JOIN public.learning_objectives lo ON lo.id=qlo.lo_id AND lo.code=x.old_code
    WHERE q.display_ref=x.display_ref AND q.source_paper_id=v_qp
  )
  OR NOT EXISTS (
    SELECT 1
    FROM public.questions q
    JOIN public.question_learning_objectives qlo
      ON qlo.question_id=q.id AND qlo.confidence=1.0
    JOIN public.learning_objectives lo ON lo.id=qlo.lo_id AND lo.code=x.new_code
    WHERE q.display_ref=x.display_ref AND q.source_paper_id=v_qp
  );

  IF v_bad<>0 THEN
    RAISE EXCEPTION '0177 corrected LO postcondition failed: bad=%',v_bad;
  END IF;

  SELECT count(*) INTO v_bad
  FROM public.questions q
  JOIN public.question_subtopics qs ON qs.question_id=q.id AND qs.is_primary
  JOIN public.subtopics st ON st.id=qs.subtopic_id
  WHERE q.source_paper_id=v_qp
    AND q.display_ref IN ('9618/11/M/J/26 Q4(d)(i)','9618/11/M/J/26 Q4(d)(ii)')
    AND (st.code<>'6.2' OR qs.confidence<>1.0);

  IF v_bad<>0 THEN
    RAISE EXCEPTION '0177 Data Integrity primary-subtopic postcondition failed: bad=%',v_bad;
  END IF;
END $$;
