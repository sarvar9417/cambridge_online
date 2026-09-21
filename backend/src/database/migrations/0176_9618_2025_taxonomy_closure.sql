-- 0176_9618_2025_taxonomy_closure.sql
-- Close the remaining low-confidence taxonomy mappings in the 2025 9618 corpus.
--
-- Source basis:
--   * official Cambridge 2025 M/J QP/MS rows for 9618/12, 9618/21, 9618/23
--   * source-backed historical taxonomy catalog 9618-2024-2025
--   * direct manual review of the relevant question and mark-scheme tasks
--
-- No LO identity is changed in this migration: the existing mappings are
-- semantically supported by the source. Conservative confidence values are
-- promoted after manual review. One already-correct primary DBMS subtopic link
-- (9618/12/M/J/25 Q5(c)(ii)) is also promoted.
--
-- Question wording, LaTeX, marks, mark schemes, assets, dependencies and source
-- identity are not changed.

DO $$
DECLARE
  v_papers integer;
  v_questions integer;
  v_low_edges integer;
  v_bad integer;
BEGIN
  WITH expected(component,variant,qp_sha,ms_sha) AS (
    VALUES
      (1,2,'607722293452744ee7107b7365cac73664d51e0eb0f7487587d038e22467826e','0b0c41c4a7930853aaaaa00729d4ffd3a3e971948800220344c6ae6a31ec957a'),
      (2,1,'1406c7743c70dd196c5ed82c533fb39dc124e13919d4e0c9efebb497460a04da','cc0ce7f995d039ebed35955a41a87d3d09f6e25470afcf0868f8af897ac9486b'),
      (2,3,'598eed30b0b8138239f5173655d0579126227ea4d371402c9220e9b020c716ea','13b90d3db85a32157de8c2c7af9dd35f4ee92157b8bd129566d895330f7de419')
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
     AND qp.year=2025
     AND qp.series='MJ'::exam_series
     AND qp.variant=e.variant
     AND qp.kind='QP'::paper_kind
     AND qp.sha256=e.qp_sha
     AND qp.page_count IS NOT NULL
     AND nullif(btrim(coalesce(qp.source_url,'')),'') IS NOT NULL
    JOIN public.source_papers ms
      ON ms.syllabus_id=sy.id
     AND ms.component_id=c.id
     AND ms.year=2025
     AND ms.series='MJ'::exam_series
     AND ms.variant=e.variant
     AND ms.kind='MS'::paper_kind
     AND ms.sha256=e.ms_sha
     AND ms.page_count IS NOT NULL
     AND nullif(btrim(coalesce(ms.source_url,'')),'') IS NOT NULL
  )
  SELECT count(*) INTO v_papers FROM resolved;

  IF v_papers<>3 THEN
    RAISE EXCEPTION '0176 exact QP/MS source gate failed: resolved=% expected=3',v_papers;
  END IF;

  WITH curated(display_ref,primary_code,bump_primary,rationale) AS (
    VALUES
      ('9618/12/M/J/25 Q5(c)(ii)','8.2',true,'Source asks for DBMS mechanisms supporting data integrity; the mark scheme credits validation, referential integrity, cascading actions and normalisation.'),
      ('9618/21/M/J/25 Q2(b)(i)','11.1',false,'Source asks the candidate to identify a value suitable for replacement by a constant, directly exercising constants in programming basics.'),
      ('9618/21/M/J/25 Q2(b)(iii)','12.3',false,'Source asks why tried/tested library routines reduce programming errors, directly addressing fault avoidance.'),
      ('9618/21/M/J/25 Q3','11.1',false,'Source requires pseudocode from structured English using declaration, input/output, selection and repetition.'),
      ('9618/23/M/J/25 Q1(a)(i)','11.3',false,'Source asks for reasons to modularise code using procedures/functions/subroutines.'),
      ('9618/23/M/J/25 Q1(a)(ii)','11.3',false,'Source asks for the distinction between local and global variables in structured programming terminology.'),
      ('9618/23/M/J/25 Q1(a)(iii)','11.3',false,'Source asks for benefits of local variables in modular/structured programming.'),
      ('9618/23/M/J/25 Q1(b)','11.1',false,'Source requires completing pseudocode expressions using built-in functions and logical/arithmetic expression syntax.'),
      ('9618/23/M/J/25 Q5','11.3',false,'Source requires a parameterised Parity() module using a loop and IF logic; both structured-programming and construct mappings are source-supported.'),
      ('9618/23/M/J/25 Q7(a)(ii)','11.1',false,'Source requires a pseudocode condition comparing day-of-week values.'),
      ('9618/23/M/J/25 Q7(b)(ii)','11.1',false,'Source requires pseudocode expressions using substring, conversion and date-construction functions.')
  ), resolved AS (
    SELECT x.*,q.id question_id,q.source_paper_id,
           qs.subtopic_id,qs.confidence primary_confidence,qs.set_by,
           st.code actual_primary_code
    FROM curated x
    JOIN public.questions q
      ON q.display_ref=x.display_ref
     AND q.status='approved'
     AND q.marks IS NOT NULL
    JOIN public.source_papers sp
      ON sp.id=q.source_paper_id
     AND sp.kind='QP'::paper_kind
     AND sp.year=2025
     AND sp.series='MJ'::exam_series
    JOIN public.syllabi sy
      ON sy.id=sp.syllabus_id
     AND sy.code='9618'
     AND sy.version_label='2024-2025'
    JOIN public.question_subtopics qs
      ON qs.question_id=q.id
     AND qs.is_primary
    JOIN public.subtopics st
      ON st.id=qs.subtopic_id
     AND st.code=x.primary_code
  )
  SELECT count(*) INTO v_questions FROM resolved;

  IF v_questions<>11 THEN
    RAISE EXCEPTION '0176 curated question gate failed: resolved=% expected=11',v_questions;
  END IF;

  SELECT count(*) INTO v_bad
  FROM public.questions q
  JOIN public.source_papers sp ON sp.id=q.source_paper_id
  JOIN public.syllabi sy ON sy.id=sp.syllabus_id
  WHERE q.display_ref='9618/12/M/J/25 Q5(c)(ii)'
    AND sy.code='9618'
    AND sy.version_label='2024-2025'
    AND NOT EXISTS (
      SELECT 1 FROM public.question_subtopics qs
      JOIN public.subtopics st ON st.id=qs.subtopic_id
      WHERE qs.question_id=q.id
        AND qs.is_primary
        AND st.code='8.2'
        AND qs.confidence<0.95
    );

  IF v_bad<>0 THEN
    RAISE EXCEPTION '0176 DBMS primary-subtopic precondition failed';
  END IF;

  WITH expected(display_ref,lo_code) AS (
    VALUES
      ('9618/21/M/J/25 Q2(b)(i)','11.1-lo-02'),
      ('9618/21/M/J/25 Q2(b)(iii)','12.3-lo-01'),
      ('9618/21/M/J/25 Q3','9.2-lo-03'),
      ('9618/21/M/J/25 Q3','9.2-lo-04'),
      ('9618/23/M/J/25 Q1(a)(i)','11.3-lo-02'),
      ('9618/23/M/J/25 Q1(a)(ii)','11.3-lo-04'),
      ('9618/23/M/J/25 Q1(a)(iii)','11.3-lo-04'),
      ('9618/23/M/J/25 Q1(b)','11.1-lo-04'),
      ('9618/23/M/J/25 Q5','11.2-lo-01'),
      ('9618/23/M/J/25 Q5','11.2-lo-03'),
      ('9618/23/M/J/25 Q7(a)(ii)','11.1-lo-04'),
      ('9618/23/M/J/25 Q7(b)(ii)','11.1-lo-04')
  ), resolved AS (
    SELECT q.id question_id,lo.id lo_id,qlo.confidence
    FROM expected e
    JOIN public.questions q ON q.display_ref=e.display_ref
    JOIN public.source_papers sp
      ON sp.id=q.source_paper_id
     AND sp.kind='QP'::paper_kind
     AND sp.year=2025
     AND sp.series='MJ'::exam_series
    JOIN public.syllabi sy
      ON sy.id=sp.syllabus_id
     AND sy.code='9618'
     AND sy.version_label='2024-2025'
    JOIN public.learning_objectives lo ON lo.code=e.lo_code
    JOIN public.subtopics st ON st.id=lo.subtopic_id
    JOIN public.topics t
      ON t.id=st.topic_id
     AND t.syllabus_id=sp.syllabus_id
    JOIN public.question_learning_objectives qlo
      ON qlo.question_id=q.id
     AND qlo.lo_id=lo.id
  )
  SELECT count(*) INTO v_low_edges
  FROM resolved
  WHERE confidence<0.95;

  IF v_low_edges<>12 THEN
    RAISE EXCEPTION '0176 low-LO identity gate failed: resolved=% expected=12',v_low_edges;
  END IF;
END $$;

-- Record durable before/after evidence for all eleven reviewed questions.
WITH curated(display_ref,primary_code,bump_primary,rationale) AS (
  VALUES
    ('9618/12/M/J/25 Q5(c)(ii)','8.2',true,'Source asks for DBMS mechanisms supporting data integrity; the mark scheme credits validation, referential integrity, cascading actions and normalisation.'),
    ('9618/21/M/J/25 Q2(b)(i)','11.1',false,'Source asks the candidate to identify a value suitable for replacement by a constant, directly exercising constants in programming basics.'),
    ('9618/21/M/J/25 Q2(b)(iii)','12.3',false,'Source asks why tried/tested library routines reduce programming errors, directly addressing fault avoidance.'),
    ('9618/21/M/J/25 Q3','11.1',false,'Source requires pseudocode from structured English using declaration, input/output, selection and repetition.'),
    ('9618/23/M/J/25 Q1(a)(i)','11.3',false,'Source asks for reasons to modularise code using procedures/functions/subroutines.'),
    ('9618/23/M/J/25 Q1(a)(ii)','11.3',false,'Source asks for the distinction between local and global variables in structured programming terminology.'),
    ('9618/23/M/J/25 Q1(a)(iii)','11.3',false,'Source asks for benefits of local variables in modular/structured programming.'),
    ('9618/23/M/J/25 Q1(b)','11.1',false,'Source requires completing pseudocode expressions using built-in functions and logical/arithmetic expression syntax.'),
    ('9618/23/M/J/25 Q5','11.3',false,'Source requires a parameterised Parity() module using a loop and IF logic; both structured-programming and construct mappings are source-supported.'),
    ('9618/23/M/J/25 Q7(a)(ii)','11.1',false,'Source requires a pseudocode condition comparing day-of-week values.'),
    ('9618/23/M/J/25 Q7(b)(ii)','11.1',false,'Source requires pseudocode expressions using substring, conversion and date-construction functions.')
), resolved AS (
  SELECT x.*,q.id question_id,q.status::text old_status,q.stem_md,q.source_paper_id,
         sp.series,sp.variant,sp.sha256 qp_sha,sp.source_url qp_url,c.number component,
         qs.subtopic_id primary_subtopic_id,qs.confidence primary_confidence,qs.set_by primary_set_by,
         ms.sha256 ms_sha,ms.source_url ms_url
  FROM curated x
  JOIN public.questions q
    ON q.display_ref=x.display_ref
   AND q.status='approved'
   AND q.marks IS NOT NULL
  JOIN public.source_papers sp
    ON sp.id=q.source_paper_id
   AND sp.kind='QP'::paper_kind
   AND sp.year=2025
   AND sp.series='MJ'::exam_series
  JOIN public.syllabi sy
    ON sy.id=sp.syllabus_id
   AND sy.code='9618'
   AND sy.version_label='2024-2025'
  JOIN public.components c ON c.id=sp.component_id
  JOIN public.question_subtopics qs
    ON qs.question_id=q.id
   AND qs.is_primary
  JOIN public.subtopics st
    ON st.id=qs.subtopic_id
   AND st.code=x.primary_code
  JOIN public.source_papers ms
    ON ms.kind='MS'::paper_kind
   AND ms.syllabus_id=sp.syllabus_id
   AND ms.component_id=sp.component_id
   AND ms.year=sp.year
   AND ms.series=sp.series
   AND ms.variant=sp.variant
), states AS (
  SELECT r.*,
    (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'lo_id',lo.id,'code',lo.code,'confidence',qlo.confidence
      ) ORDER BY lo.code),'[]'::jsonb)
      FROM public.question_learning_objectives qlo
      JOIN public.learning_objectives lo ON lo.id=qlo.lo_id
      WHERE qlo.question_id=r.question_id
    ) old_los,
    (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'lo_id',lo.id,
        'code',lo.code,
        'confidence',CASE WHEN qlo.confidence<0.95 THEN 1.0 ELSE qlo.confidence END
      ) ORDER BY lo.code),'[]'::jsonb)
      FROM public.question_learning_objectives qlo
      JOIN public.learning_objectives lo ON lo.id=qlo.lo_id
      WHERE qlo.question_id=r.question_id
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
  r.question_id,r.source_paper_id,'manual-source-audit-0176-2025-closure',
  md5(concat_ws('|',r.question_id::text,r.old_status,coalesce(r.stem_md,''),r.old_los::text)),
  r.old_status,
  r.primary_subtopic_id,r.primary_code,r.primary_confidence,r.primary_set_by,r.old_los,
  r.primary_subtopic_id,r.primary_code,
  CASE WHEN r.bump_primary THEN 1.0 ELSE r.primary_confidence END,
  r.new_los,
  jsonb_build_object(
    'method','manual official QP/MS + source-backed historical syllabus-catalog review',
    'question_ref',r.display_ref,
    'reason',r.rationale,
    'taxonomy_identity_preserved',true,
    'question_status_preserved',true
  ),
  jsonb_build_object(
    'source_backed',true,
    'qualification','9618',
    'syllabus_version','2024-2025',
    'series',r.series::text,'component',r.component,'variant',r.variant,
    'qp_sha256',r.qp_sha,'qp_source_url',r.qp_url,
    'ms_sha256',r.ms_sha,'ms_source_url',r.ms_url,
    'taxonomy_catalog','backend/src/database/catalogs/9618-2024-2025.json',
    'taxonomy_source_hierarchy','backend/src/database/catalogs/README.md'
  )
FROM states r
WHERE NOT EXISTS (
  SELECT 1 FROM public.question_taxonomy_review_history h
  WHERE h.question_id=r.question_id
    AND h.review_tag='manual-source-audit-0176-2025-closure'
);

-- Promote only the explicitly reviewed low-confidence LO edges.
WITH expected(display_ref,lo_code) AS (
  VALUES
    ('9618/21/M/J/25 Q2(b)(i)','11.1-lo-02'),
    ('9618/21/M/J/25 Q2(b)(iii)','12.3-lo-01'),
    ('9618/21/M/J/25 Q3','9.2-lo-03'),
    ('9618/21/M/J/25 Q3','9.2-lo-04'),
    ('9618/23/M/J/25 Q1(a)(i)','11.3-lo-02'),
    ('9618/23/M/J/25 Q1(a)(ii)','11.3-lo-04'),
    ('9618/23/M/J/25 Q1(a)(iii)','11.3-lo-04'),
    ('9618/23/M/J/25 Q1(b)','11.1-lo-04'),
    ('9618/23/M/J/25 Q5','11.2-lo-01'),
    ('9618/23/M/J/25 Q5','11.2-lo-03'),
    ('9618/23/M/J/25 Q7(a)(ii)','11.1-lo-04'),
    ('9618/23/M/J/25 Q7(b)(ii)','11.1-lo-04')
), resolved AS (
  SELECT q.id question_id,lo.id lo_id
  FROM expected e
  JOIN public.questions q ON q.display_ref=e.display_ref
  JOIN public.source_papers sp
    ON sp.id=q.source_paper_id
   AND sp.kind='QP'::paper_kind
   AND sp.year=2025
   AND sp.series='MJ'::exam_series
  JOIN public.syllabi sy
    ON sy.id=sp.syllabus_id
   AND sy.code='9618'
   AND sy.version_label='2024-2025'
  JOIN public.learning_objectives lo ON lo.code=e.lo_code
  JOIN public.subtopics st ON st.id=lo.subtopic_id
  JOIN public.topics t
    ON t.id=st.topic_id
   AND t.syllabus_id=sp.syllabus_id
)
UPDATE public.question_learning_objectives qlo
SET confidence=1.0
FROM resolved r
WHERE qlo.question_id=r.question_id
  AND qlo.lo_id=r.lo_id
  AND qlo.confidence<0.95;

-- Promote the one remaining low-confidence primary subtopic.
WITH resolved AS (
  SELECT q.id question_id,qs.subtopic_id
  FROM public.questions q
  JOIN public.source_papers sp ON sp.id=q.source_paper_id
  JOIN public.syllabi sy ON sy.id=sp.syllabus_id
  JOIN public.question_subtopics qs ON qs.question_id=q.id AND qs.is_primary
  JOIN public.subtopics st ON st.id=qs.subtopic_id
  WHERE q.display_ref='9618/12/M/J/25 Q5(c)(ii)'
    AND sy.code='9618'
    AND sy.version_label='2024-2025'
    AND st.code='8.2'
    AND qs.confidence<0.95
)
UPDATE public.question_subtopics qs
SET confidence=1.0,
    set_by='manual-source-audit-0176'
FROM resolved r
WHERE qs.question_id=r.question_id
  AND qs.subtopic_id=r.subtopic_id
  AND qs.is_primary;

DO $$
DECLARE
  v_history integer;
  v_low_primary integer;
  v_low_lo integer;
  v_promoted integer;
BEGIN
  SELECT count(*) INTO v_history
  FROM public.question_taxonomy_review_history
  WHERE review_tag='manual-source-audit-0176-2025-closure';

  IF v_history<>11 THEN
    RAISE EXCEPTION '0176 review history postcondition failed: rows=% expected=11',v_history;
  END IF;

  SELECT count(*) INTO v_low_primary
  FROM public.questions q
  JOIN public.source_papers sp ON sp.id=q.source_paper_id
  JOIN public.syllabi sy ON sy.id=sp.syllabus_id
  WHERE sy.code='9618'
    AND sy.version_label='2024-2025'
    AND sp.kind='QP'::paper_kind
    AND sp.year=2025
    AND q.status='approved'
    AND q.marks IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.question_subtopics qs
      WHERE qs.question_id=q.id AND qs.is_primary AND coalesce(qs.confidence,0)<0.95
    );

  SELECT count(*) INTO v_low_lo
  FROM public.questions q
  JOIN public.source_papers sp ON sp.id=q.source_paper_id
  JOIN public.syllabi sy ON sy.id=sp.syllabus_id
  WHERE sy.code='9618'
    AND sy.version_label='2024-2025'
    AND sp.kind='QP'::paper_kind
    AND sp.year=2025
    AND q.status='approved'
    AND q.marks IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.question_learning_objectives qlo
      WHERE qlo.question_id=q.id AND coalesce(qlo.confidence,0)<0.95
    );

  IF v_low_primary<>0 OR v_low_lo<>0 THEN
    RAISE EXCEPTION '0176 2025 taxonomy closure failed: low_primary=% low_lo=%',v_low_primary,v_low_lo;
  END IF;

  SELECT count(*) INTO v_promoted
  FROM public.questions q
  JOIN public.question_subtopics qs ON qs.question_id=q.id AND qs.is_primary
  JOIN public.subtopics st ON st.id=qs.subtopic_id
  WHERE q.display_ref='9618/12/M/J/25 Q5(c)(ii)'
    AND st.code='8.2'
    AND qs.confidence=1.0
    AND qs.set_by='manual-source-audit-0176';

  IF v_promoted<>1 THEN
    RAISE EXCEPTION '0176 DBMS primary promotion failed: rows=% expected=1',v_promoted;
  END IF;
END $$;
