-- Read-only production audit queries used for Lesson Studio Chapters 1, 13 and 7.
-- These queries do not modify corpus data.

-- Structured-content coverage for target chapter learning objectives.
SELECT s.code AS syllabus,
       count(DISTINCT q.id) AS questions,
       count(DISTINCT q.id) FILTER (WHERE q.content_json IS NOT NULL) AS structured
FROM questions q
JOIN source_papers sp ON sp.id=q.source_paper_id
JOIN syllabi s ON s.id=sp.syllabus_id
JOIN question_learning_objectives qlo ON qlo.question_id=q.id
JOIN learning_objectives lo ON lo.id=qlo.lo_id
WHERE q.status='approved'
  AND q.marks IS NOT NULL
  AND s.code IN ('9618','0478')
  AND (
    (s.code='9618' AND (lo.code LIKE '1.%' OR lo.code LIKE '13.%'))
    OR
    (s.code='0478' AND (
      lo.code LIKE '7-lo-%'
      OR lo.code LIKE '2.1.1-lo-%'
      OR lo.code LIKE '2.1.2-lo-%'
    ))
  )
GROUP BY s.code
ORDER BY s.code;

-- Source-paper inventory by syllabus/year/kind.
SELECT s.code,sp.year,sp.kind,count(*) AS papers
FROM source_papers sp
JOIN syllabi s ON s.id=sp.syllabus_id
WHERE s.code IN ('9618','0478')
GROUP BY s.code,sp.year,sp.kind
ORDER BY s.code,sp.year,sp.kind;

-- 9618 review-pending mark-scheme source-audit status for Chapters 1 and 13.
WITH target_q AS (
  SELECT DISTINCT q.id
  FROM questions q
  JOIN question_learning_objectives qlo ON qlo.question_id=q.id
  JOIN learning_objectives lo ON lo.id=qlo.lo_id
  JOIN source_papers qp ON qp.id=q.source_paper_id
  JOIN syllabi s ON s.id=qp.syllabus_id
  WHERE s.code='9618'
    AND q.status='approved'
    AND q.marks IS NOT NULL
    AND qp.year BETWEEN 2021 AND 2025
    AND (lo.code LIKE '1.%' OR lo.code LIKE '13.%')
), latest AS (
  SELECT DISTINCT ON (a.mark_scheme_id)
         a.mark_scheme_id,a.result,a.evidence,a.audited_at
  FROM mark_scheme_source_audits a
  ORDER BY a.mark_scheme_id,a.audited_at DESC
)
SELECT ms.status,
       count(*) AS total,
       count(*) FILTER (WHERE latest.result='verified') AS audited_verified,
       count(*) FILTER (
         WHERE latest.result='verified'
           AND coalesce((latest.evidence->>'strict')::boolean,false)
       ) AS strict_verified,
       count(*) FILTER (WHERE latest.result='needs_review') AS audited_needs_review,
       count(*) FILTER (WHERE latest.mark_scheme_id IS NULL) AS not_audited
FROM target_q tq
JOIN mark_schemes ms ON ms.question_id=tq.id
LEFT JOIN latest ON latest.mark_scheme_id=ms.id
GROUP BY ms.status
ORDER BY ms.status;
