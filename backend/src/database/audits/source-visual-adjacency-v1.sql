-- 9618 learner-facing source visual adjacency audit.
--
-- Mirrors the Live Challenge/source-visual v6 contract from
-- backend/src/lib/source-visual-readiness.ts. Run read-only after source repair
-- or structured-content ingestion. Release target: blocked_leaves = 0.
WITH RECURSIVE scope AS (
  SELECT q.id,q.display_ref,q.parent_id
  FROM questions q
  JOIN source_papers sp ON sp.id=q.source_paper_id AND sp.kind='QP'::paper_kind
  JOIN syllabi sy ON sy.id=sp.syllabus_id
  WHERE sy.code='9618'
    AND sp.year BETWEEN 2021 AND 2026
    AND q.marks IS NOT NULL
    AND q.status IN ('approved','needs_review')
),
nodes AS (
  SELECT s.id leaf_id,s.display_ref leaf_ref,s.id node_id,s.parent_id
  FROM scope s
  UNION ALL
  SELECT n.leaf_id,n.leaf_ref,p.id,p.parent_id
  FROM nodes n
  JOIN questions p ON p.id=n.parent_id
),
blocked_nodes AS (
  SELECT DISTINCT
    n.leaf_id,n.leaf_ref,source_node.id node_id,source_node.display_ref node_ref
  FROM nodes n
  JOIN questions source_node ON source_node.id=n.node_id
  WHERE (
    source_node.content_version=1
    AND source_node.content_json IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements(
        coalesce(source_node.content_json->'blocks','[]'::jsonb)
      ) block
      LEFT JOIN question_assets qa ON qa.id::text=block->>'assetId'
      WHERE block->>'type'='asset'
        AND block->>'kind' IN ('diagram','image','flowchart','logic_circuit')
        AND (
          qa.id IS NULL
          OR (
            qa.kind IN ('diagram','image')
            AND NOT (
              nullif(btrim(coalesce(qa.storage_path,'')),'') IS NOT NULL
              OR coalesce(qa.content_md,'') ~*
                '^[[:space:]]*(<[?]xml[^>]*[?]>[[:space:]]*)?<svg([[:space:]]|>)'
              OR coalesce(qa.svg_markup,'') ~*
                '^[[:space:]]*(<[?]xml[^>]*[?]>[[:space:]]*)?<svg([[:space:]]|>)'
            )
          )
        )
    )
  ) OR (
    source_node.content_version=1
    AND source_node.content_json IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements(
        coalesce(source_node.content_json->'blocks','[]'::jsonb)
      ) WITH ORDINALITY AS cue(block,ordinality)
      WHERE cue.block->>'type'='text'
        AND lower(regexp_replace(
          coalesce(cue.block->>'text',''),'[[:space:]]+',' ','g'
        )) ~ (
             'following[[:space:]]+((vector|logic|state[- ]transition|class|e-?r|entity[- ]relationship)[[:space:]]+)?(logo|diagram|figure|flowchart|graph|circuit|image|chart|shape|screen[[:space:]]+image|screenshot)'
          || '|(the|this|given)[[:space:]]+(diagram|figure|flowchart|graph|circuit|image|chart|shape|screen[[:space:]]+image)[[:space:]]+(shows?|showing|represents?|contains?|illustrates?)'
          || '|(logo|diagram|figure|flowchart|graph|circuit|image|chart|shape)[[:space:]]+(is[[:space:]]+shown|are[[:space:]]+shown|illustrated|given|provided|below|above)'
          || '|(shown|illustrated|given|provided)[[:space:]]+(below|above|in[[:space:]]+the[[:space:]]+question[[:space:]]+)?(logo|diagram|figure|flowchart|graph|circuit|image|chart|shape)'
          || '|(study|examine|refer[[:space:]]+to|using)[[:space:]]+(the[[:space:]]+)?(logo|diagram|figure|flowchart|graph|circuit|image|chart|shape)'
          || '|(for|using|from)[[:space:]]+this[[:space:]]+logo'
          || '|example[[:space:]]+from[[:space:]]+(the|this)[[:space:]]+logo'
        )
        AND lower(regexp_replace(
          coalesce(cue.block->>'text',''),'[[:space:]]+',' ','g'
        )) !~ '(take|capture|provide|submit)[[:space:]]+(a[[:space:]]+)?screenshot'
        AND lower(regexp_replace(
          coalesce(cue.block->>'text',''),'[[:space:]]+',' ','g'
        )) !~ 'truth[[:space:]]+table.{0,100}(logic[[:space:]]+)?circuit[[:space:]]+(is[[:space:]]+)?shown'
        AND NOT EXISTS (
          SELECT 1
          FROM jsonb_array_elements(
            coalesce(source_node.content_json->'blocks','[]'::jsonb)
          ) WITH ORDINALITY AS nxt(block,ordinality)
          LEFT JOIN question_assets qa ON qa.id::text=nxt.block->>'assetId'
          WHERE nxt.ordinality=cue.ordinality+1
            AND (
              nxt.block->>'type'='table'
              OR (
                nxt.block->>'type'='asset'
                AND qa.kind='table'
                AND (
                  nullif(btrim(coalesce(qa.storage_path,'')),'') IS NOT NULL
                  OR nullif(btrim(coalesce(qa.content_md,'')),'') IS NOT NULL
                  OR coalesce(qa.svg_markup,'') ~*
                    '^[[:space:]]*(<[?]xml[^>]*[?]>[[:space:]]*)?<svg([[:space:]]|>)'
                )
              )
              OR (
                nxt.block->>'type'='asset'
                AND nxt.block->>'kind'
                  IN ('diagram','image','flowchart','logic_circuit')
                AND qa.kind IN ('diagram','image')
                AND (
                  nullif(btrim(coalesce(qa.storage_path,'')),'') IS NOT NULL
                  OR coalesce(qa.content_md,'') ~*
                    '^[[:space:]]*(<[?]xml[^>]*[?]>[[:space:]]*)?<svg([[:space:]]|>)'
                  OR coalesce(qa.svg_markup,'') ~*
                    '^[[:space:]]*(<[?]xml[^>]*[?]>[[:space:]]*)?<svg([[:space:]]|>)'
                )
              )
            )
        )
    )
  ) OR (
    (source_node.content_json IS NULL
      OR source_node.content_version IS DISTINCT FROM 1)
    AND EXISTS (
      SELECT 1
      FROM question_assets visual
      WHERE visual.question_id=source_node.id
        AND visual.kind IN ('diagram','image')
    )
    AND NOT EXISTS (
      SELECT 1
      FROM question_assets qa
      WHERE qa.question_id=source_node.id
        AND qa.kind IN ('diagram','image')
        AND (
          nullif(btrim(coalesce(qa.storage_path,'')),'') IS NOT NULL
          OR coalesce(qa.content_md,'') ~*
            '^[[:space:]]*(<[?]xml[^>]*[?]>[[:space:]]*)?<svg([[:space:]]|>)'
          OR coalesce(qa.svg_markup,'') ~*
            '^[[:space:]]*(<[?]xml[^>]*[?]>[[:space:]]*)?<svg([[:space:]]|>)'
        )
    )
  )
)
SELECT jsonb_build_object(
  'scopedLeaves',(SELECT count(*) FROM scope),
  'blockedLeaves',count(DISTINCT leaf_id),
  'blockers',coalesce(
    jsonb_agg(
      jsonb_build_object('leaf',leaf_ref,'node',node_ref)
      ORDER BY leaf_ref,node_ref
    ) FILTER (WHERE leaf_id IS NOT NULL),
    '[]'::jsonb
  )
) AS source_visual_adjacency_v1
FROM blocked_nodes;
