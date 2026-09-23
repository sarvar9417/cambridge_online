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
    or coalesce(${a}.content_md,'') ~* '^\\s*<svg(?:\\s|>)'
    or coalesce(${a}.svg_markup,'') ~* '^\\s*<svg(?:\\s|>)'
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
    join question_assets qa on qa.question_id=svc.id
    where qa.kind in ('diagram','image')
      and not ${renderableVisualAssetSql('qa')}
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
