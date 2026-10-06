-- Close the remaining verified shared-context visual gaps after detector v6.
-- Reuse source-backed assets from the same SHA-pinned Cambridge QP; do not duplicate visuals.
DO $repair$
DECLARE
  v_q public.questions%ROWTYPE;
  v_sp public.source_papers%ROWTYPE;
  v_asset record;
  v_blocks jsonb;
BEGIN
  -- 9618/21/M/J/22 Q4(b): carry the verified page-6 stack context into the leaf
  -- before the page-7 task/answer diagram.
  SELECT * INTO v_q FROM public.questions
  WHERE display_ref='9618/21/M/J/22 Q4(b)' ORDER BY updated_at DESC,id LIMIT 1;
  IF FOUND THEN
    SELECT * INTO v_sp FROM public.source_papers
    WHERE id=v_q.source_paper_id AND kind='QP'::paper_kind;
    IF v_sp.sha256 IS NULL
       OR lower(v_q.content_json->'source'->>'sha256')<>lower(v_sp.sha256) THEN
      RAISE EXCEPTION 'Q4(b) source provenance mismatch';
    END IF;

    SELECT qa.id,qa.alt_text,qa.source_page INTO v_asset
    FROM public.questions owner
    JOIN public.question_assets qa ON qa.question_id=owner.id
    WHERE owner.source_paper_id=v_q.source_paper_id
      AND owner.display_ref='9618/21/M/J/22 Q4(a)'
      AND qa.kind::text='table'
      AND qa.source_page=6
      AND coalesce(qa.alt_text,'') ~* 'current stack'
      AND (
        nullif(btrim(coalesce(qa.storage_path,'')),'') IS NOT NULL
        OR coalesce(qa.content_md,'') ~* '^[[:space:]]*(<[?]xml[^>]*[?]>[[:space:]]*)?<svg([[:space:]]|>)'
        OR coalesce(qa.svg_markup,'') ~* '^[[:space:]]*(<[?]xml[^>]*[?]>[[:space:]]*)?<svg([[:space:]]|>)'
      )
    ORDER BY qa.sort_order,qa.id LIMIT 1;

    IF v_asset.id IS NULL THEN
      RAISE EXCEPTION 'Q4(b) verified shared stack asset missing';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_q.content_json->'blocks') b
      WHERE b->>'assetId'=v_asset.id::text
    ) THEN
      SELECT jsonb_agg(x.block ORDER BY x.sort_key) INTO v_blocks
      FROM (
        SELECT b.block,(b.ordinality*2)::numeric sort_key
        FROM jsonb_array_elements(v_q.content_json->'blocks')
          WITH ORDINALITY b(block,ordinality)
        UNION ALL
        SELECT jsonb_build_object(
          'type','asset','kind','image','assetId',v_asset.id::text,
          'altText',v_asset.alt_text,
          'source',jsonb_build_object('page',v_asset.source_page)
        ),3::numeric
      ) x;

      PERFORM public.set_question_structured_content_v1(
        v_q.id,v_sp.id,lower(v_sp.sha256),
        jsonb_set(v_q.content_json,'{blocks}',v_blocks,false)
      );
    END IF;
  END IF;

  -- 9618/22/O/N/23 Q3(a): its verified linked-list visual existed but was
  -- positioned after the task. Move it immediately after the source cue.
  SELECT * INTO v_q FROM public.questions
  WHERE display_ref='9618/22/O/N/23 Q3(a)' ORDER BY updated_at DESC,id LIMIT 1;
  IF FOUND THEN
    SELECT * INTO v_sp FROM public.source_papers
    WHERE id=v_q.source_paper_id AND kind='QP'::paper_kind;
    IF v_sp.sha256 IS NULL
       OR lower(v_q.content_json->'source'->>'sha256')<>lower(v_sp.sha256) THEN
      RAISE EXCEPTION 'Q3(a) source provenance mismatch';
    END IF;

    SELECT qa.id,qa.alt_text,qa.source_page INTO v_asset
    FROM public.question_assets qa
    WHERE qa.question_id=v_q.id
      AND qa.kind::text='diagram'
      AND qa.source_page=6
      AND coalesce(qa.alt_text,'') ~* 'linked-list|linked list'
      AND (
        nullif(btrim(coalesce(qa.storage_path,'')),'') IS NOT NULL
        OR coalesce(qa.content_md,'') ~* '^[[:space:]]*(<[?]xml[^>]*[?]>[[:space:]]*)?<svg([[:space:]]|>)'
        OR coalesce(qa.svg_markup,'') ~* '^[[:space:]]*(<[?]xml[^>]*[?]>[[:space:]]*)?<svg([[:space:]]|>)'
      )
    ORDER BY qa.sort_order,qa.id LIMIT 1;

    IF v_asset.id IS NULL THEN
      RAISE EXCEPTION 'Q3(a) verified linked-list asset missing';
    END IF;

    SELECT jsonb_agg(x.block ORDER BY x.sort_key) INTO v_blocks
    FROM (
      SELECT b.block,(b.ordinality*2)::numeric sort_key
      FROM jsonb_array_elements(v_q.content_json->'blocks')
        WITH ORDINALITY b(block,ordinality)
      WHERE NOT (
        b.block->>'type'='asset'
        AND b.block->>'assetId'=v_asset.id::text
      )
      UNION ALL
      SELECT jsonb_build_object(
        'type','asset','kind','diagram','assetId',v_asset.id::text,
        'altText',v_asset.alt_text,
        'source',jsonb_build_object('page',v_asset.source_page)
      ),3::numeric
    ) x;

    PERFORM public.set_question_structured_content_v1(
      v_q.id,v_sp.id,lower(v_sp.sha256),
      jsonb_set(v_q.content_json,'{blocks}',v_blocks,false)
    );
  END IF;

  -- 9618/22/O/N/23 Q3(b): the page-6 context repeats Q3(a)'s source visual.
  -- Reference that verified same-paper asset before Q3(b)'s own page-7 diagram.
  SELECT * INTO v_q FROM public.questions
  WHERE display_ref='9618/22/O/N/23 Q3(b)' ORDER BY updated_at DESC,id LIMIT 1;
  IF FOUND THEN
    SELECT * INTO v_sp FROM public.source_papers
    WHERE id=v_q.source_paper_id AND kind='QP'::paper_kind;
    IF v_sp.sha256 IS NULL
       OR lower(v_q.content_json->'source'->>'sha256')<>lower(v_sp.sha256) THEN
      RAISE EXCEPTION 'Q3(b) source provenance mismatch';
    END IF;

    SELECT qa.id,qa.alt_text,qa.source_page INTO v_asset
    FROM public.questions owner
    JOIN public.question_assets qa ON qa.question_id=owner.id
    WHERE owner.source_paper_id=v_q.source_paper_id
      AND owner.display_ref='9618/22/O/N/23 Q3(a)'
      AND qa.kind::text='diagram'
      AND qa.source_page=6
      AND coalesce(qa.alt_text,'') ~* 'linked-list|linked list'
      AND (
        nullif(btrim(coalesce(qa.storage_path,'')),'') IS NOT NULL
        OR coalesce(qa.content_md,'') ~* '^[[:space:]]*(<[?]xml[^>]*[?]>[[:space:]]*)?<svg([[:space:]]|>)'
        OR coalesce(qa.svg_markup,'') ~* '^[[:space:]]*(<[?]xml[^>]*[?]>[[:space:]]*)?<svg([[:space:]]|>)'
      )
    ORDER BY qa.sort_order,qa.id LIMIT 1;

    IF v_asset.id IS NULL THEN
      RAISE EXCEPTION 'Q3(b) verified shared linked-list asset missing';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_q.content_json->'blocks') b
      WHERE b->>'assetId'=v_asset.id::text
    ) THEN
      SELECT jsonb_agg(x.block ORDER BY x.sort_key) INTO v_blocks
      FROM (
        SELECT b.block,(b.ordinality*2)::numeric sort_key
        FROM jsonb_array_elements(v_q.content_json->'blocks')
          WITH ORDINALITY b(block,ordinality)
        UNION ALL
        SELECT jsonb_build_object(
          'type','asset','kind','diagram','assetId',v_asset.id::text,
          'altText',v_asset.alt_text,
          'source',jsonb_build_object('page',v_asset.source_page)
        ),3::numeric
      ) x;

      PERFORM public.set_question_structured_content_v1(
        v_q.id,v_sp.id,lower(v_sp.sha256),
        jsonb_set(v_q.content_json,'{blocks}',v_blocks,false)
      );
    END IF;
  END IF;
END
$repair$;
