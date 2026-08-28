-- Cambridge 9618 2021-2025 Question Bank export readiness gate.
-- Run after migrations. Raises on any condition that can silently produce an
-- incomplete worksheet from an approved mark-bearing question.
DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n
  FROM questions q JOIN source_papers sp ON sp.id=q.source_paper_id
  WHERE sp.kind='QP'::paper_kind AND sp.year BETWEEN 2021 AND 2025
    AND q.marks>0 AND nullif(trim(coalesce(q.stem_md,'')),'') IS NULL;
  IF n<>0 THEN RAISE EXCEPTION 'export gate: % mark-bearing leaves have blank stems',n; END IF;

  SELECT count(*) INTO n
  FROM question_assets qa
  JOIN questions q ON q.id=qa.question_id
  JOIN source_papers sp ON sp.id=q.source_paper_id
  WHERE sp.kind='QP'::paper_kind AND sp.year BETWEEN 2021 AND 2025
    AND q.marks>0
    AND qa.storage_path IS NOT NULL
    AND nullif(trim(coalesce(qa.content_md,'')),'') IS NULL;
  IF n<>0 THEN RAISE EXCEPTION 'export gate: % required assets are storage-only/non-renderable',n; END IF;

  SELECT count(*) INTO n
  FROM question_dependencies qd
  JOIN questions q ON q.id=qd.question_id
  JOIN source_papers sp ON sp.id=q.source_paper_id
  LEFT JOIN questions target ON target.id=qd.depends_on_id
  WHERE sp.kind='QP'::paper_kind AND sp.year BETWEEN 2021 AND 2025
    AND q.marks>0 AND target.id IS NULL;
  IF n<>0 THEN RAISE EXCEPTION 'export gate: % dependency targets are missing',n; END IF;

  SELECT count(*) INTO n
  FROM questions q
  JOIN source_papers sp ON sp.id=q.source_paper_id
  WHERE sp.kind='QP'::paper_kind AND sp.year BETWEEN 2021 AND 2025
    AND q.marks>0 AND q.status='approved'
    AND NOT EXISTS(SELECT 1 FROM question_subtopics qs WHERE qs.question_id=q.id AND qs.is_primary);
  IF n<>0 THEN RAISE EXCEPTION 'export gate: % approved leaves lack primary taxonomy',n; END IF;
END $$;

SELECT
  count(*) FILTER(WHERE q.marks>0) AS mark_bearing_leaves,
  count(*) FILTER(WHERE q.marks>0 AND q.status='approved') AS approved_leaves,
  (SELECT count(*) FROM question_assets qa JOIN questions aq ON aq.id=qa.question_id JOIN source_papers asp ON asp.id=aq.source_paper_id WHERE asp.kind='QP'::paper_kind AND asp.year BETWEEN 2021 AND 2025) AS assets,
  (SELECT count(*) FROM question_assets qa JOIN questions aq ON aq.id=qa.question_id JOIN source_papers asp ON asp.id=aq.source_paper_id WHERE asp.kind='QP'::paper_kind AND asp.year BETWEEN 2021 AND 2025 AND nullif(trim(coalesce(qa.content_md,'')),'') IS NOT NULL) AS renderable_assets,
  (SELECT count(*) FROM question_dependencies qd JOIN questions dq ON dq.id=qd.question_id JOIN source_papers dsp ON dsp.id=dq.source_paper_id WHERE dsp.kind='QP'::paper_kind AND dsp.year BETWEEN 2021 AND 2025) AS dependencies
FROM questions q JOIN source_papers sp ON sp.id=q.source_paper_id
WHERE sp.kind='QP'::paper_kind AND sp.year BETWEEN 2021 AND 2025;
