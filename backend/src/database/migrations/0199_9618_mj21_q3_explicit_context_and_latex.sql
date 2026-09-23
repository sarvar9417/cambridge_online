-- VF-E-000001 follow-up after canonical migration 0195.
-- Keep Q3(b)'s page-7 instruction table in explicit structured source order and
-- make the dormant LaTeX representation render literal angle brackets instead
-- of OT1 texttt angle-glyph substitutions. The source-faithful SVG/hash from
-- 0195 remains authoritative and unchanged.

DO $$
DECLARE
  v_question uuid := '6b1f48a6-22ba-4522-a8a4-33c41bcfa9ee'::uuid;
  v_asset uuid := 'f9483ad1-7672-4b18-bd0c-cb6b21507950'::uuid;
  v_source uuid := 'fab329b3-9fbc-43ac-938b-5d83c815a1e5'::uuid;
  v_source_sha text := 'd73fa3294ec38a62d756742887a1bfc99909a2135ea86ac4a6713915fc305453';
  v_svg_hash text := '3eb93fb3af37767404486d5f5188fef371cdb870f886d6f12eb7bf39a116fef3';
  v_blocks jsonb;
  v_block jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM questions q
    JOIN source_papers sp ON sp.id=q.source_paper_id
    JOIN question_assets qa ON qa.id=v_asset AND qa.question_id=q.id
    WHERE q.id=v_question
      AND q.path='3.b'
      AND sp.id=v_source
      AND sp.sha256=v_source_sha
      AND qa.source_page=7
      AND qa.source_bbox='[89,286,1565,1549]'::jsonb
      AND qa.content_hash=v_svg_hash
      AND qa.svg_markup LIKE '<svg%'
  ) THEN
    RAISE EXCEPTION 'vf_e_000001_canonical_0195_poststate_missing';
  END IF;

  UPDATE question_assets
  SET latex_source=replace(
        replace(latex_source,'<address>','\textless address\textgreater'),
        '<register>','\textless register\textgreater'
      )
  WHERE id=v_asset
    AND latex_source IS NOT NULL
    AND (latex_source LIKE '%<address>%' OR latex_source LIKE '%<register>%');

  SELECT content_json->'blocks' INTO v_blocks
  FROM questions
  WHERE id=v_question
  FOR UPDATE;

  IF v_blocks IS NULL OR jsonb_typeof(v_blocks)<>'array' THEN
    RAISE EXCEPTION 'vf_e_000001_q3b_blocks_missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_blocks) b(value)
    WHERE b.value->>'type'='asset' AND b.value->>'assetId'=v_asset::text
  ) THEN
    v_block=jsonb_build_object(
      'type','asset',
      'kind','table',
      'assetId',v_asset::text,
      'altText','Cambridge instruction set table used by Q3(b)',
      'source',jsonb_build_object('page',7,'bbox','[89,286,1565,1549]'::jsonb)
    );

    UPDATE questions
    SET content_json=jsonb_set(
          content_json,
          '{blocks}',
          (
            SELECT jsonb_agg(value ORDER BY ord)
            FROM (
              SELECT value,ordinality::numeric ord
              FROM jsonb_array_elements(v_blocks) WITH ORDINALITY e(value,ordinality)
              UNION ALL
              SELECT v_block,1.5::numeric
            ) ordered
          ),
          false
        ),
        updated_at=now()
    WHERE id=v_question;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM questions q
    CROSS JOIN LATERAL jsonb_array_elements(coalesce(q.content_json->'blocks','[]'::jsonb)) b(value)
    JOIN question_assets qa ON qa.id::text=b.value->>'assetId'
    WHERE q.id=v_question
      AND b.value->>'type'='asset'
      AND qa.id=v_asset
      AND qa.question_id=v_question
      AND qa.source_page=7
      AND qa.content_hash=v_svg_hash
      AND qa.latex_source LIKE '%\textless address\textgreater%'
      AND qa.latex_source LIKE '%\textless register\textgreater%'
  ) THEN
    RAISE EXCEPTION 'vf_e_000001_q3b_explicit_context_postcondition_failed';
  END IF;
END $$;
