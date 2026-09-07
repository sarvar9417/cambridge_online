-- Cambridge 9618 Question Bank export readiness gate.
-- Scope is the official/source-backed QP corpus (source_url IS NOT NULL), not
-- development/demo seed papers. Raises on anything that can hide a searchable
-- question or silently produce an incomplete PDF/DOCX worksheet.
--
-- Export rendering supports two canonical asset forms:
--   1) inline content_md (tables/SVG/text), or
--   2) private PNG storage paths materialized at export time by export-assets.ts.
-- A private storage crop is therefore not "non-renderable" merely because its
-- content_md is blank. In production we also prove every referenced Supabase
-- object exists in durable storage.
--
-- Search/export quality checks operate on canonical physical questions once.
-- Per-paper 75-mark completeness operates on official source occurrences so an
-- exact equivalent variant remains complete after its duplicate tree is removed.
DO $$
DECLARE n integer; total_leaves integer; searchable_leaves integer;
BEGIN
  SELECT count(*) INTO total_leaves
  FROM questions q
  JOIN source_papers sp ON sp.id=q.source_paper_id
  JOIN syllabi s ON s.id=sp.syllabus_id
  WHERE sp.kind='QP'::paper_kind AND s.code='9618' AND sp.source_url IS NOT NULL AND q.marks>0;

  SELECT count(*) INTO searchable_leaves
  FROM questions q
  JOIN source_papers sp ON sp.id=q.source_paper_id
  JOIN syllabi s ON s.id=sp.syllabus_id
  WHERE sp.kind='QP'::paper_kind AND s.code='9618' AND sp.source_url IS NOT NULL
    AND q.marks>0 AND q.status IN ('approved','needs_review');
  IF searchable_leaves<>total_leaves THEN
    RAISE EXCEPTION 'export gate: searchable staff corpus is %, source-backed leaves are %',searchable_leaves,total_leaves;
  END IF;

  SELECT count(*) INTO n
  FROM questions q JOIN source_papers sp ON sp.id=q.source_paper_id JOIN syllabi s ON s.id=sp.syllabus_id
  WHERE sp.kind='QP'::paper_kind AND s.code='9618' AND sp.source_url IS NOT NULL
    AND q.marks>0 AND nullif(trim(coalesce(q.stem_md,'')),'') IS NULL;
  IF n<>0 THEN RAISE EXCEPTION 'export gate: % mark-bearing leaves have blank stems',n; END IF;

  SELECT count(*) INTO n
  FROM questions q JOIN source_papers sp ON sp.id=q.source_paper_id JOIN syllabi s ON s.id=sp.syllabus_id
  WHERE sp.kind='QP'::paper_kind AND s.code='9618' AND sp.source_url IS NOT NULL
    AND q.marks>0
    AND NOT EXISTS(SELECT 1 FROM question_subtopics qs WHERE qs.question_id=q.id AND qs.is_primary);
  IF n<>0 THEN RAISE EXCEPTION 'export gate: % source-backed leaves lack primary taxonomy',n; END IF;

  SELECT count(*) INTO n
  FROM question_assets qa
  JOIN questions q ON q.id=qa.question_id
  JOIN source_papers sp ON sp.id=q.source_paper_id
  JOIN syllabi s ON s.id=sp.syllabus_id
  WHERE sp.kind='QP'::paper_kind AND s.code='9618' AND sp.source_url IS NOT NULL
    AND nullif(trim(coalesce(qa.content_md,'')),'') IS NULL
    AND (
      nullif(trim(coalesce(qa.storage_path,'')),'') IS NULL
      OR qa.storage_path !~ '^supabase://[^/]+/.+'
    );
  IF n<>0 THEN RAISE EXCEPTION 'export gate: % required assets have neither inline content nor a valid private storage path',n; END IF;

  IF to_regclass('storage.objects') IS NOT NULL THEN
    EXECUTE $storage_check$
      SELECT count(*)
      FROM question_assets qa
      JOIN questions q ON q.id=qa.question_id
      JOIN source_papers sp ON sp.id=q.source_paper_id
      JOIN syllabi s ON s.id=sp.syllabus_id
      LEFT JOIN storage.objects o
        ON o.bucket_id=split_part(replace(qa.storage_path,'supabase://',''),'/',1)
       AND o.name=regexp_replace(replace(qa.storage_path,'supabase://',''),'^[^/]+/','')
      WHERE sp.kind='QP'::paper_kind AND s.code='9618' AND sp.source_url IS NOT NULL
        AND nullif(trim(coalesce(qa.content_md,'')),'') IS NULL
        AND qa.storage_path ~ '^supabase://[^/]+/.+'
        AND o.id IS NULL
    $storage_check$ INTO n;
    IF n<>0 THEN RAISE EXCEPTION 'export gate: % private asset storage objects are missing',n; END IF;
  END IF;

  SELECT count(*) INTO n
  FROM question_dependencies qd
  JOIN questions q ON q.id=qd.question_id
  JOIN source_papers sp ON sp.id=q.source_paper_id
  JOIN syllabi s ON s.id=sp.syllabus_id
  LEFT JOIN questions target ON target.id=qd.depends_on_id
  WHERE sp.kind='QP'::paper_kind AND s.code='9618' AND sp.source_url IS NOT NULL
    AND q.marks>0 AND target.id IS NULL;
  IF n<>0 THEN RAISE EXCEPTION 'export gate: % dependency targets are missing',n; END IF;

  SELECT count(*) INTO n
  FROM mark_schemes ms
  JOIN questions q ON q.id=ms.question_id
  JOIN source_papers sp ON sp.id=q.source_paper_id
  JOIN syllabi s ON s.id=sp.syllabus_id
  WHERE sp.kind='QP'::paper_kind AND s.code='9618' AND sp.source_url IS NOT NULL AND q.marks>0
    AND NOT EXISTS(SELECT 1 FROM mark_scheme_points msp WHERE msp.mark_scheme_id=ms.id)
    AND NOT EXISTS(SELECT 1 FROM mark_scheme_levels msl WHERE msl.mark_scheme_id=ms.id);
  IF n<>0 THEN RAISE EXCEPTION 'export gate: % mark schemes have no exportable points/levels',n; END IF;

  SELECT count(*) INTO n FROM (
    SELECT sp.id,coalesce(sum(q.marks),0) total
    FROM source_papers sp
    JOIN syllabi s ON s.id=sp.syllabus_id
    LEFT JOIN question_source_occurrences occ ON occ.source_paper_id=sp.id
    LEFT JOIN questions q ON q.id=occ.question_id AND q.marks>0
    WHERE sp.kind='QP'::paper_kind AND s.code='9618' AND sp.source_url IS NOT NULL
    GROUP BY sp.id HAVING coalesce(sum(q.marks),0)<>75
  ) bad_qp;
  IF n<>0 THEN RAISE EXCEPTION 'export gate: % source-backed QPs are not 75 marks',n; END IF;

  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='exports' AND column_name='file_format')
     OR NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='exports' AND column_name='request_payload') THEN
    RAISE EXCEPTION 'export gate: selection export schema columns are missing';
  END IF;

  SELECT count(*) INTO n FROM schema_migrations
  WHERE name IN ('0078_selection_export_payload.sql','0079_make_2021_mj11_q2a_exportable.sql');
  IF n<>2 THEN RAISE EXCEPTION 'export gate: application migration ledger has %/2 Question Bank export migrations',n; END IF;
END $$;

SELECT
  count(*) FILTER(WHERE q.marks>0) AS source_backed_mark_bearing_leaves,
  count(*) FILTER(WHERE q.marks>0 AND q.status IN ('approved','needs_review')) AS staff_searchable_leaves,
  (SELECT count(*)
   FROM question_assets qa
   JOIN questions aq ON aq.id=qa.question_id
   JOIN source_papers asp ON asp.id=aq.source_paper_id
   JOIN syllabi ass ON ass.id=asp.syllabus_id
   WHERE ass.code='9618' AND asp.kind='QP'::paper_kind AND asp.source_url IS NOT NULL) AS assets,
  (SELECT count(*)
   FROM question_assets qa
   JOIN questions aq ON aq.id=qa.question_id
   JOIN source_papers asp ON asp.id=aq.source_paper_id
   JOIN syllabi ass ON ass.id=asp.syllabus_id
   WHERE ass.code='9618' AND asp.kind='QP'::paper_kind AND asp.source_url IS NOT NULL
     AND (nullif(trim(coalesce(qa.content_md,'')),'') IS NOT NULL OR qa.storage_path ~ '^supabase://[^/]+/.+')) AS renderable_assets,
  (SELECT count(*)
   FROM mark_schemes ms
   JOIN questions mq ON mq.id=ms.question_id
   JOIN source_papers msp ON msp.id=mq.source_paper_id
   JOIN syllabi mss ON mss.id=msp.syllabus_id
   WHERE mss.code='9618' AND msp.kind='QP'::paper_kind AND msp.source_url IS NOT NULL AND mq.marks>0) AS mark_schemes,
  (SELECT count(*) FROM schema_migrations WHERE name IN ('0078_selection_export_payload.sql','0079_make_2021_mj11_q2a_exportable.sql')) AS export_migrations_ledgered
FROM questions q
JOIN source_papers sp ON sp.id=q.source_paper_id
JOIN syllabi s ON s.id=sp.syllabus_id
WHERE s.code='9618' AND sp.kind='QP'::paper_kind AND sp.source_url IS NOT NULL;
