import { renderableVisualAssetSql, portableVisualReady, type PortableVisualLike } from './source-visual-readiness.js';

const IDENTIFIER=/^[a-z_][a-z0-9_]*$/i;
const identifier=(value:string)=>{if(!IDENTIFIER.test(value))throw new Error('unsafe_sql_identifier');return value};

const RESPONSE_CUE_SQL=[
  '(complete|fill([[:space:]]+in)?|populate|finish).{0,180}(table|truth[[:space:]]+table|diagram|figure|stack|queue|grid|k[- ]?map|map|box|cell)',
  '(table|truth[[:space:]]+table|diagram|figure|stack|queue|grid|k[- ]?map).{0,180}(complete|fill([[:space:]]+in)?|missing)',
  '(place|put|write).{0,100}(tick|cross|answer|value|label).{0,120}(table|grid|box|cell|diagram)',
  '(draw|join|connect|match|label).{0,180}(line|diagram|figure|symbol|box|item|statement|node|gate)',
  '(show|give).{0,120}(changing[[:space:]]+)?contents.{0,80}(stack|queue)',
].join('|');

const RESPONSE_CUE_RE=new RegExp([
  String.raw`\\b(?:complete|fill(?:\\s+in)?|populate|finish)\\b[\\s\\S]{0,180}\\b(?:table|truth\\s+table|diagram|figure|stack|queue|grid|k[- ]?map|map|box|cell)\\b`,
  String.raw`\\b(?:table|truth\\s+table|diagram|figure|stack|queue|grid|k[- ]?map)\\b[\\s\\S]{0,180}\\b(?:complete|fill(?:\\s+in)?|missing)\\b`,
  String.raw`\\b(?:place|put|write)\\b[\\s\\S]{0,100}\\b(?:tick|cross|answer|value|label)\\b[\\s\\S]{0,120}\\b(?:table|grid|box|cell|diagram)\\b`,
  String.raw`\\b(?:draw|join|connect|match|label)\\b[\\s\\S]{0,180}\\b(?:line|diagram|figure|symbol|box|item|statement|node|gate)\\b`,
  String.raw`\\b(?:show|give)\\b[\\s\\S]{0,120}\\b(?:changing\\s+)?contents\\b[\\s\\S]{0,80}\\b(?:stack|queue)\\b`,
].join('|'),'i');

export function questionResponseInteractionRequiredSql(questionAlias='q'){
  const q=identifier(questionAlias);
  return `(
    ${q}.content_version=1
    and ${q}.content_json is not null
    and exists(
      select 1
      from jsonb_array_elements(coalesce(${q}.content_json->'blocks','[]'::jsonb)) response_cue
      where response_cue->>'type'='text'
        and lower(regexp_replace(coalesce(response_cue->>'text',''),'[[:space:]]+',' ','g')) ~ '${RESPONSE_CUE_SQL}'
    )
  )`;
}

export function questionResponseInteractionReadySql(questionAlias='q'){
  const q=identifier(questionAlias);
  const renderable=renderableVisualAssetSql('response_asset');
  return `(
    exists(
      select 1
      from jsonb_array_elements(coalesce(${q}.content_json->'blocks','[]'::jsonb)) response_block
      where (
        response_block->>'type'='matching'
        or (
          response_block->>'type'='table'
          and jsonb_array_length(coalesce(response_block->'editableCells','[]'::jsonb))>0
        )
        or (
          response_block->>'type'='answer_area'
          and response_block->>'kind' in ('drawing','table_cells')
        )
      )
    )
    or exists(
      select 1
      from jsonb_array_elements(coalesce(${q}.content_json->'blocks','[]'::jsonb)) response_block
      join question_assets response_asset on response_asset.id::text=response_block->>'assetId'
      where response_block->>'type'='asset'
        and response_asset.kind in ('table','diagram','image')
        and ${renderable}
    )
    or exists(
      select 1
      from question_assets response_asset
      where response_asset.question_id=${q}.id
        and response_asset.kind in ('table','diagram','image')
        and ${renderable}
    )
  )`;
}

export function questionResponseInteractionIntegritySql(questionAlias='q'){
  return `(not ${questionResponseInteractionRequiredSql(questionAlias)} or ${questionResponseInteractionReadySql(questionAlias)})`;
}

type StructuredBlockLike=Record<string,unknown>;
type StructuredContentLike={version?:unknown;blocks?:unknown};

function blocks(value:unknown):StructuredBlockLike[]{
  if(!value||typeof value!=='object')return[];
  const candidate=value as StructuredContentLike;
  if(candidate.version!==1||!Array.isArray(candidate.blocks))return[];
  return candidate.blocks.filter((block):block is StructuredBlockLike=>Boolean(block)&&typeof block==='object');
}

export function responseInteractionRequired(content:unknown){
  return blocks(content).some((block)=>block.type==='text'&&RESPONSE_CUE_RE.test(String(block.text??'')));
}

export function portableResponseInteractionReady(
  content:unknown,
  assets:Array<PortableVisualLike&{id?:string|null;kind?:string|null}>,
){
  const rows=blocks(content);
  if(rows.some((block)=>
    block.type==='matching'
    || (block.type==='table'&&Array.isArray(block.editableCells)&&block.editableCells.length>0)
    || (block.type==='answer_area'&&['drawing','table_cells'].includes(String(block.kind)))
  ))return true;

  const byId=new Map(assets.filter((asset)=>asset.id).map((asset)=>[asset.id!,asset] as const));
  for(const block of rows){
    if(block.type!=='asset'||typeof block.assetId!=='string')continue;
    const asset=byId.get(block.assetId);
    if(!asset)continue;
    const kind=String(asset.kind??'').toLowerCase();
    if(['table','diagram','image'].includes(kind)&&portableVisualReady(asset))return true;
  }
  return assets.some((asset)=>{
    const kind=String(asset.kind??'').toLowerCase();
    return ['table','diagram','image'].includes(kind)&&portableVisualReady(asset);
  });
}

export function portableResponseInteractionIntegrity(
  content:unknown,
  assets:Array<PortableVisualLike&{id?:string|null;kind?:string|null}>,
){
  return !responseInteractionRequired(content)||portableResponseInteractionReady(content,assets);
}
