-- Cambridge 9618 2021-2025 Question Bank export readiness gate.
-- Run after migrations. Raises on any condition that can silently hide a
-- supplied question or produce an incomplete PDF/DOCX worksheet.
DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n
  FROM questions q JOIN source_papers sp ON sp.id=q.source_paper_id
  WHERE sp.kind='QP'::paper_kind AND sp.year BETWEEN 2021 AND 2025
    AND q.marks>0 AND nullif(trim(coalesce(q.stem_md,'')),'') IS NULL;
  IF n<>0 THEN RAISE EXCEPTION 'export gate: % mark-bearing leaves have blank stems',n; END IF;

  SELECT count(*) INTO n
  FROM questions q JOIN source_papers sp ON sp.id=q.source_paper_id
  WHERE sp.kind='QP'::paper_kind AND sp.year BETWEEN 2021 AND 2025
    AND q.marks>0 AND q.status IN ('approved','needs_review');
  IF n<>2985 THEN RAISE EXCEPTION 'export gate: searchable staff corpus is %, expected 2985',n; END IF;

  SELECT count(*) INTO n
  FROM questions q JOIN source_papers sp ON sp.id=q.source_paper_id
  WHERE sp.kind='QP'::paper_kind AND sp.year BETWEEN 2021 AND 2025
    AND q.marks>0
    AND NOT EXISTS(SELECT 1 FROM question_subtopics qs WHERE qs.question_id=q.id AND qs.is_primary);
  IF n<>0 THEN RAISE EXCEPTION 'export gate: % leaves lack primary taxonomy',n; END IF;

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
  FROM mark_schemes ms
  JOIN questions q ON q.id=ms.question_id
  JOIN source_papers sp ON sp.id=q.source_paper_id
  WHERE sp.kind='QP'::paper_kind AND sp.year BETWEEN 2021 AND 2025 AND q.marks>0
    AND NOT EXISTS(SELECT 1 FROM mark_scheme_points msp WHERE msp.mark_scheme_id=ms.id);
  IF n<>0 THEN RAISE EXCEPTION 'export gate: % mark schemes have no exportable points',n; END IF;

  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='exports' AND column_name='file_format')
     OR NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='exports' AND column_name='request_payload') THEN
    RAISE EXCEPTION 'export gate: selection export schema columns are missing';
  END IF;

  SELECT count(*) INTO n FROM schema_migrations
  WHERE name IN ('0078_selection_export_payload.sql','0079_make_2021_mj11_q2a_exportable.sql');
  IF n<>2 THEN RAISE EXCEPTION 'export gate: application migration ledger has %/2 Question Bank export migrations',n; END IF;
END $$;

SELECT
  count(*) FILTER(WHERE q.marks>0) AS mark_bearing_leaves,
  count(*) FILTER(WHERE q.marks>0 AND q.status IN ('approved','needs_review')) AS staff_searchable_leaves,
  (SELECT count(*) FROM question_assets qa JOIN questions aq ON aq.id=qa.question_id JOIN source_papers asp ON asp.id=aq.source_paper_id WHERE asp.kind='QP'::paper_kind AND asp.year BETWEEN 2021 AND 2025) AS assets,
  (SELECT count(*) FROM question_assets qa JOIN questions aq ON aq.id=qa.question_id JOIN source_papers asp ON asp.id=aq.source_paper_id WHERE asp.kind='QP'::paper_kind AND asp.year BETWEEN 2021 AND 2025 AND nullif(trim(coalesce(qa.content_md,'')),'') IS NOT NULL) AS renderable_assets,
  (SELECT count(*) FROM mark_schemes ms JOIN questions mq ON mq.id=ms.question_id JOIN source_papers msp ON msp.id=mq.source_paper_id WHERE msp.kind='QP'::paper_kind AND msp.year BETWEEN 2021 AND 2025 AND mq.marks>0) AS mark_schemes,
  (SELECT count(*) FROM schema_migrations WHERE name IN ('0078_selection_export_payload.sql','0079_make_2021_mj11_q2a_exportable.sql')) AS export_migrations_ledgered
FROM questions q JOIN source_papers sp ON sp.id=q.source_paper_id
WHERE sp.kind='QP'::paper_kind AND sp.year BETWEEN 2021 AND 2025;
