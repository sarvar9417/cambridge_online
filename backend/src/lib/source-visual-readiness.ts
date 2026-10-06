const IDENTIFIER=/^[a-z_][a-z0-9_]*$/i;

function identifier(value:string){
  if(!IDENTIFIER.test(value))throw new Error('unsafe_sql_identifier');
  return value;
}

const SOURCE_PRESENT_VISUAL_CUE_SQL = [
  'following[[:space:]]+((vector|logic|state[- ]transition|class|e-?r|entity[- ]relationship)[[:space:]]+)?(logo|diagram|figure|flowchart|graph|circuit|image|chart|shape|screen[[:space:]]+image|screenshot)',
  '(the|this|given)[[:space:]]+(diagram|figure|flowchart|graph|circuit|image|chart|shape|screen[[:space:]]+image)[[:space:]]+(shows?|showing|represents?|contains?|illustrates?)',
  '(logo|diagram|figure|flowchart|graph|circuit|image|chart|shape)[[:space:]]+(is[[:space:]]+shown|are[[:space:]]+shown|illustrated|given|provided|below|above)',
  '(shown|illustrated|given|provided)[[:space:]]+(below|above|in[[:space:]]+the[[:space:]]+question[[:space:]]+)?(logo|diagram|figure|flowchart|graph|circuit|image|chart|shape)',
  '(study|examine|refer[[:space:]]+to|using)[[:space:]]+(the[[:space:]]+)?(logo|diagram|figure|flowchart|graph|circuit|image|chart|shape)',
  '(for|using|from)[[:space:]]+this[[:space:]]+logo',
  'example[[:space:]]+from[[:space:]]+(the|this)[[:space:]]+logo',
].join('|');

const SOURCE_PRESENT_VISUAL_CUE_RE = new RegExp([
  String.raw`\bfollowing\s+(?:(?:vector|logic|state[- ]transition|class|e-?r|entity[- ]relationship)\s+)?(?:logo|diagram|figure|flowchart|graph|circuit|image|chart|shape|screen\s+image|screenshot)\b`,
  String.raw`\b(?:the|this|given)\s+(?:diagram|figure|flowchart|graph|circuit|image|chart|shape|screen\s+image)\s+(?:shows?|showing|represents?|contains?|illustrates?)\b`,
  String.raw`\b(?:logo|diagram|figure|flowchart|graph|circuit|image|chart|shape)\s+(?:is\s+shown|are\s+shown|illustrated|given|provided|below|above)\b`,
  String.raw`\b(?:shown|illustrated|given|provided)\s+(?:(?:below|above|in\s+the\s+question)\s+)?(?:logo|diagram|figure|flowchart|graph|circuit|image|chart|shape)\b`,
  String.raw`\b(?:study|examine|refer\s+to|using)\s+(?:the\s+)?(?:logo|diagram|figure|flowchart|graph|circuit|image|chart|shape)\b`,
  String.raw`\b(?:for|using|from)\s+this\s+logo\b`,
  String.raw`\bexample\s+from\s+(?:the|this)\s+logo\b`,
].join('|'),'i');

function normalizedCueText(value:unknown){
  return typeof value==='string'?value.replace(/\s+/g,' ').trim():'';
}

function isSourcePresentVisualCue(value:unknown){
  const text=normalizedCueText(value);
  if(!text)return false;
  if(/\b(?:take|capture|provide|submit)\s+(?:a\s+)?screenshot\b/i.test(text))return false;
  if(/\btruth\s+table.{0,100}(?:logic\s+)?circuit\s+(?:is\s+)?shown\b/i.test(text))return false;
  return SOURCE_PRESENT_VISUAL_CUE_RE.test(text);
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
  const direct="^[[:space:]]*(<[?]xml[^>]*[?]>[[:space:]]*)?<svg([[:space:]]|>)";
  const fenced="^[[:space:]]*`{3}(svg|xml)[[:space:]]*(<[?]xml[^>]*[?]>[[:space:]]*)?<svg([[:space:]]|>)";
  return `(
    nullif(btrim(coalesce(${a}.storage_path,'')),'') is not null
    or coalesce(${a}.content_md,'') ~* '${direct}'
    or coalesce(${a}.content_md,'') ~* '${fenced}'
    or coalesce(${a}.svg_markup,'') ~* '${direct}'
  )`;
}

/**
 * SQL predicate for any canonical asset block that the browser can render
 * without inventing source content. Historical v1 rows can point at semantic
 * table/code assets through a generic image-shaped block, so readiness must
 * follow the referenced question_assets row rather than the block label alone.
 */
export function renderableCanonicalAssetSql(alias='qa'){
  const a=identifier(alias);
  const visual=renderableVisualAssetSql(a);
  const semanticTable=`(
    nullif(btrim(coalesce(${a}.content_md,'')),'') is not null
    and coalesce(${a}.content_md,'') like '%|%'
  )`;
  const semanticCode=`nullif(btrim(coalesce(${a}.content_md,'')),'') is not null`;
  return `(
    (${a}.kind in ('diagram','image') and ${visual})
    or (${a}.kind='table' and (${visual} or ${semanticTable}))
    or (${a}.kind in ('pseudocode','code') and (${visual} or ${semanticCode}))
  )`;
}

/** Visual-integrity failure predicate for one question/context node. */
export function sourceVisualBlockerSql(questionAlias='source_node'){
  const node=identifier(questionAlias);
  const renderable=renderableVisualAssetSql('qa');
  const canonicalAssetReady=renderableCanonicalAssetSql('qa');
  const nextRenderable=renderableVisualAssetSql('next_qa');
  const nextCanonicalAssetReady=renderableCanonicalAssetSql('next_qa');
  return `(
    ${node}.content_version=1
    and ${node}.content_json is not null
    and exists(
      select 1
      from jsonb_array_elements(coalesce(${node}.content_json->'blocks','[]'::jsonb)) block
      left join question_assets qa on qa.id::text=block->>'assetId'
      where block->>'type'='asset'
        and (
          qa.id is null
          or not ${canonicalAssetReady}
        )
    )
  ) or (
    ${node}.content_version=1
    and ${node}.content_json is not null
    and exists(
      select 1
      from jsonb_array_elements(coalesce(${node}.content_json->'blocks','[]'::jsonb))
        with ordinality as cue(block,ordinality)
      where cue.block->>'type'='text'
        and lower(regexp_replace(coalesce(cue.block->>'text',''),'[[:space:]]+',' ','g')) ~ '${SOURCE_PRESENT_VISUAL_CUE_SQL}'
        and lower(regexp_replace(coalesce(cue.block->>'text',''),'[[:space:]]+',' ','g')) !~ '(take|capture|provide|submit)[[:space:]]+(a[[:space:]]+)?screenshot'
        and lower(regexp_replace(coalesce(cue.block->>'text',''),'[[:space:]]+',' ','g')) !~ 'truth[[:space:]]+table.{0,100}(logic[[:space:]]+)?circuit[[:space:]]+(is[[:space:]]+)?shown'
        and not exists(
          select 1
          from jsonb_array_elements(coalesce(${node}.content_json->'blocks','[]'::jsonb))
            with ordinality as next(block,ordinality)
          left join question_assets next_qa on next_qa.id::text=next.block->>'assetId'
          where next.ordinality=cue.ordinality+1
            and (
              next.block->>'type'='table'
              or (
                next.block->>'type'='asset'
                and ${nextCanonicalAssetReady}
              )
            )
        )
    )
  ) or (
    (${node}.content_json is null or ${node}.content_version is distinct from 1)
    and exists(
      select 1 from question_assets visual
      where visual.question_id=${node}.id
        and visual.kind in ('diagram','image')
    )
    and not exists(
      select 1 from question_assets qa
      where qa.question_id=${node}.id
        and qa.kind in ('diagram','image')
        and ${renderable}
    )
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
    join questions source_node on source_node.id=svc.id
    where ${sourceVisualBlockerSql('source_node')}
  )`;
}

export type PortableVisualLike={
  kind?:string|null;
  url?:string|null;
  contentMd?:string|null;
};

/** Runtime equivalent of the SQL readiness rule for already-materialized DTOs. */
export function extractCompleteInlineSvg(value:string|null|undefined){
  let text=(value??'').replace(/^\uFEFF/,'').trim();
  const fenced=text.match(/^```(?:svg|xml)\s*\r?\n([\s\S]*?)\r?\n```\s*$/i);
  if(fenced)text=fenced[1]!.trim();
  text=text.replace(/^<\?xml[^>]*\?>\s*/i,'');
  return /^<svg(?:\s|>)/i.test(text)&&/<\/svg>\s*$/i.test(text)?text:null;
}

export function completeInlineSvg(value:string|null|undefined){
  return extractCompleteInlineSvg(value)!==null;
}

export function sourceVisualDataUrl(value:string|null|undefined){
  const svg=extractCompleteInlineSvg(value);
  return svg?`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`:null;
}

export function portableVisualReady(asset:PortableVisualLike){
  const kind=(asset.kind??'').toLowerCase();
  if(kind!=='diagram'&&kind!=='image')return true;
  return Boolean(asset.url)||completeInlineSvg(asset.contentMd);
}

function semanticTableReady(value:string|null|undefined){
  const rows=(value??'')
    .split(/\r?\n/)
    .map((line)=>line.trim())
    .filter((line)=>line.includes('|'))
    .map((line)=>line.replace(/^\|/,'').replace(/\|$/,'').split('|'));
  return rows.some((cells)=>cells.length>1);
}

export function portableCanonicalAssetReady(asset:PortableVisualLike){
  const kind=(asset.kind??'').toLowerCase();
  if(kind==='diagram'||kind==='image')return portableVisualReady(asset);
  if(kind==='table')return Boolean(asset.url)||completeInlineSvg(asset.contentMd)||semanticTableReady(asset.contentMd);
  if(kind==='pseudocode'||kind==='code')return Boolean(asset.url)||completeInlineSvg(asset.contentMd)||Boolean(asset.contentMd?.trim());
  return false;
}

type PortableVisualAsset=PortableVisualLike&{id?:string|null};
type StructuredContentLike={version?:unknown;blocks?:unknown};

function structuredAssetIds(content:unknown){
  if(!content||typeof content!=='object')return null;
  const candidate=content as StructuredContentLike;
  if(candidate.version!==1||!Array.isArray(candidate.blocks))return null;
  const ids=new Set<string>();
  for(const block of candidate.blocks){
    if(!block||typeof block!=='object')continue;
    const row=block as Record<string,unknown>;
    if(row.type!=='asset')continue;
    if(typeof row.assetId==='string')ids.add(row.assetId);
  }
  return ids;
}

function structuredVisualCueMissing(content:unknown,assets:PortableVisualAsset[]){
  if(!content||typeof content!=='object')return false;
  const candidate=content as StructuredContentLike;
  if(candidate.version!==1||!Array.isArray(candidate.blocks))return false;
  const blocks=candidate.blocks as unknown[];
  const byId=new Map(assets.filter((asset)=>asset.id).map((asset)=>[asset.id!,asset] as const));
  for(let index=0;index<blocks.length;index+=1){
    const block=blocks[index];
    if(!block||typeof block!=='object')continue;
    const row=block as Record<string,unknown>;
    if(row.type!=='text'||!isSourcePresentVisualCue(row.text))continue;
    const next=blocks[index+1];
    if(!next||typeof next!=='object')return true;
    const nextRow=next as Record<string,unknown>;
    if(nextRow.type==='table')continue;
    if(nextRow.type!=='asset'||!['table','diagram','image','flowchart','logic_circuit'].includes(String(nextRow.kind)))return true;
    const assetId=typeof nextRow.assetId==='string'?nextRow.assetId:null;
    const asset=assetId?byId.get(assetId):undefined;
    if(!asset)return true;
    const assetKind=(asset.kind??'').toLowerCase();
    if(!portableCanonicalAssetReady(asset))return true;
  }
  return false;
}

/**
 * Validate the visuals that the canonical structured question actually
 * references. Canonical text that explicitly introduces a printed visual must
 * be immediately followed by a structured/source-backed visual representation.
 * Legacy DTOs without structured content require at least one renderable visual
 * when visual assets are present.
 */
export function portableQuestionVisualReady(content:unknown,assets:PortableVisualAsset[]){
  if(structuredVisualCueMissing(content,assets))return false;
  const referenced=structuredAssetIds(content);
  if(referenced){
    const byId=new Map(assets.filter((asset)=>asset.id).map((asset)=>[asset.id!,asset] as const));
    for(const id of referenced){
      const asset=byId.get(id);
      if(!asset||!portableCanonicalAssetReady(asset))return false;
    }
    return true;
  }
  const visuals=assets.filter((asset)=>['diagram','image'].includes((asset.kind??'').toLowerCase()));
  return !visuals.length||visuals.some(portableVisualReady);
}
