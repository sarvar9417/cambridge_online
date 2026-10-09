/**
 * Cheap response-surface readiness gate.
 *
 * This deliberately answers a narrower question than visual fidelity:
 * can the candidate actually enter the kind of response the source paper
 * requires? Table/diagram questions must have either a semantic response
 * structure or a source-backed visual that the shared response editor can use.
 */
export function questionResponseIntegritySql(questionAlias='q') {
  const blocks=`coalesce(${questionAlias}.content_json->'blocks','[]'::jsonb)`;
  const semanticTable=`exists(
    select 1
    from jsonb_array_elements(${blocks}) response_block
    where response_block->>'type'='table'
      and jsonb_array_length(coalesce(response_block->'editableCells','[]'::jsonb))>0
  )`;
  const drawingArea=`exists(
    select 1
    from jsonb_array_elements(${blocks}) response_block
    where response_block->>'type'='answer_area'
      and response_block->>'kind' in ('drawing','table_cells')
  )`;
  const referencedAsset=`exists(
    select 1
    from jsonb_array_elements(${blocks}) response_block
    join question_assets response_asset
      on response_asset.id::text=response_block->>'assetId'
    where response_block->>'type'='asset'
      and response_asset.kind in ('table','diagram','image')
      and (
        nullif(btrim(coalesce(response_asset.storage_path,'')),'') is not null
        or nullif(btrim(coalesce(response_asset.content_md,'')),'') is not null
        or nullif(btrim(coalesce(response_asset.svg_markup,'')),'') is not null
      )
  )`;
  const ownedAsset=`exists(
    select 1
    from question_assets response_asset
    where response_asset.question_id=${questionAlias}.id
      and response_asset.kind in ('table','diagram','image')
      and (
        nullif(btrim(coalesce(response_asset.storage_path,'')),'') is not null
        or nullif(btrim(coalesce(response_asset.content_md,'')),'') is not null
        or nullif(btrim(coalesce(response_asset.svg_markup,'')),'') is not null
      )
  )`;
  const normalizedStem=`lower(regexp_replace(coalesce(${questionAlias}.stem_md,''), E'\\\\s+', ' ', 'g'))`;
  const stackWorkspace=`${normalizedStem} ~
    '(changing contents of (the )?stack|complete .*stack|state of .*stack|rpn expression.*stack|stack.*rpn expression)'`;
  const literalTableRequired=`${normalizedStem} ~
    '(complete (the |this |following )?table|fill (in |out )?(the |this |following )?table|write .*answers?.* in (the )?table|table provided|table below|following table|parity block check.*circle the bit)'`;
  const existingDiagramRequired=`${normalizedStem} ~
    '(complete (the |this |following )?(diagram|figure|chart)|label (the |this |following )?(diagram|figure|chart)|add .* to (the )?(diagram|figure|chart)|circle .* bit|mark .* on (the )?(diagram|figure|chart))'`;
  const usableSourceSurface=`(${semanticTable} or ${drawingArea} or ${referencedAsset} or ${ownedAsset})`;

  return `(
    (not (${literalTableRequired}) or ${stackWorkspace} or ${usableSourceSurface})
    and
    (not (${existingDiagramRequired}) or ${drawingArea} or ${referencedAsset} or ${ownedAsset})
  )`;
}
