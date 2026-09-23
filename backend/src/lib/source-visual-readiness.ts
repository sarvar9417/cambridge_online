const IDENTIFIER=/^[a-z_][a-z0-9_]*$/i;

function identifier(value:string){
  if(!IDENTIFIER.test(value))throw new Error('unsafe_sql_identifier');
  return value;
}

/**
 * SQL predicate for a browser/source-faithful visual asset.
 *
 * A visual is renderable only when it has a stored source object or a complete
 * SVG in one of the two canonical source columns. Prose/ASCII placeholders do
 * not count as visuals.
 */
export function renderableVisualAssetSql(alias='qa'){
  const a=identifier(alias);
  return `(
    nullif(btrim(coalesce(${a}.storage_path,'')),'') is not null
    or coalesce(${a}.content_md,'') ~* '^\\s*(<\\?xml[^>]*>\\s*)?<svg(?:\\s|>)'
    or coalesce(${a}.svg_markup,'') ~* '^\\s*(<\\?xml[^>]*>\\s*)?<svg(?:\\s|>)'
  )`;
}

/**
 * Candidate-level integrity guard. It walks the question ancestry because
 * Cambridge subparts routinely depend on a diagram/table owned by a parent.
 *
 * The fragment is TRUE only when no visual asset in that source context is
 * unresolved. This is intentionally fail-closed for student delivery.
 */
export function questionVisualIntegritySql(questionAlias='q'){
  const q=identifier(questionAlias);
  const renderable=renderableVisualAssetSql('qa');
  return `not exists(
    with recursive source_visual_chain as (
      select ${q}.id,${q}.parent_id
      union all
      select parent.id,parent.parent_id
      from source_visual_chain child
      join questions parent on parent.id=child.parent_id
    )
    select 1
    from source_visual_chain svc
    join questions source_node on source_node.id=svc.id
    where (
      source_node.content_version=1
      and source_node.content_json is not null
      and exists(
        select 1
        from jsonb_array_elements(coalesce(source_node.content_json->'blocks','[]'::jsonb)) block
        left join question_assets qa on qa.id::text=block->>'assetId'
        where block->>'type'='asset'
          and block->>'kind' in ('diagram','image','flowchart','logic_circuit')
          and (qa.id is null or not ${renderable})
      )
    ) or (
      (source_node.content_json is null or source_node.content_version is distinct from 1)
      and exists(
        select 1 from question_assets visual
        where visual.question_id=source_node.id
          and visual.kind in ('diagram','image')
      )
      and not exists(
        select 1 from question_assets qa
        where qa.question_id=source_node.id
          and qa.kind in ('diagram','image')
          and ${renderable}
      )
    )
  )`;
}

export type PortableVisualLike={
  kind?:string|null;
  url?:string|null;
  contentMd?:string|null;
};

/** Runtime equivalent of the SQL readiness rule for already-materialized DTOs. */
export function completeInlineSvg(value:string|null|undefined){
  const text=(value??'').trim().replace(/^<\?xml[^>]*\?>\s*/i,'');
  return /^<svg(?:\s|>)/i.test(text)&&/<\/svg>\s*$/i.test(text);
}

export function portableVisualReady(asset:PortableVisualLike){
  const kind=(asset.kind??'').toLowerCase();
  if(kind!=='diagram'&&kind!=='image')return true;
  return Boolean(asset.url)||completeInlineSvg(asset.contentMd);
}

type PortableVisualAsset=PortableVisualLike&{id?:string|null};
type StructuredContentLike={version?:unknown;blocks?:unknown};

function structuredVisualIds(content:unknown){
  if(!content||typeof content!=='object')return null;
  const candidate=content as StructuredContentLike;
  if(candidate.version!==1||!Array.isArray(candidate.blocks))return null;
  const ids=new Set<string>();
  for(const block of candidate.blocks){
    if(!block||typeof block!=='object')continue;
    const row=block as Record<string,unknown>;
    if(row.type!=='asset'||!['diagram','image','flowchart','logic_circuit'].includes(String(row.kind)))continue;
    if(typeof row.assetId==='string')ids.add(row.assetId);
  }
  return ids;
}

/**
 * Validate the visuals that the canonical structured question actually
 * references. Legacy DTOs without structured content require at least one
 * renderable visual when visual assets are present. Stale, unreferenced repair
 * rows therefore cannot block an otherwise source-complete question.
 */
export function portableQuestionVisualReady(content:unknown,assets:PortableVisualAsset[]){
  const referenced=structuredVisualIds(content);
  if(referenced){
    const byId=new Map(assets.filter((asset)=>asset.id).map((asset)=>[asset.id!,asset] as const));
    for(const id of referenced){
      const asset=byId.get(id);
      if(!asset||!portableVisualReady(asset))return false;
    }
    return true;
  }
  const visuals=assets.filter((asset)=>['diagram','image'].includes((asset.kind??'').toLowerCase()));
  return !visuals.length||visuals.some(portableVisualReady);
}
