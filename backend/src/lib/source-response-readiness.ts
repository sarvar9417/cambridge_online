import { completeInlineSvg, renderableVisualAssetSql, portableVisualReady, type PortableVisualLike } from './source-visual-readiness.js';

const IDENTIFIER=/^[a-z_][a-z0-9_]*$/i;
const identifier=(value:string)=>{if(!IDENTIFIER.test(value))throw new Error('unsafe_sql_identifier');return value};

const RESPONSE_CUE_SQL=[
  '(copy[[:space:]]+and[[:space:]]+)?complete[[:space:]]+(the[[:space:]]+)?(following[[:space:]]+)?(table|truth[[:space:]]+table|diagram|figure|stack|queue|grid|k[- ]?map)',
  'complete[[:space:]]+(the[[:space:]]+)?[^.]{0,80}(column|cells?)[[:space:]]+(in[[:space:]]+)?(the[[:space:]]+)?table',
  'write[^.]{0,120}(answers?|values?|results?)[^.]*(in|into)[[:space:]]+(the[[:space:]]+)?table',
  '(place|put)[^.]{0,100}(tick|cross)[^.]{0,100}(table|grid|boxes?)',
  '(draw|join|connect|match|label)[^.]{0,180}(line|diagram|figure|symbol|boxes?|items?|statements?|nodes?|gate)',
  '(show|give)[^.]{0,120}(changing[[:space:]]+)?contents[^.]{0,80}(stack|queue)',
].join('|');

const RESPONSE_CUE_RE=new RegExp([
  '\\b(?:(?:copy\\s+and\\s+)?complete)\\s+(?:the\\s+)?(?:following\\s+)?(?:table|truth\\s+table|diagram|figure|stack|queue|grid|k[- ]?map)\\b',
  '\\bcomplete\\s+(?:the\\s+)?[^.]{0,80}\\b(?:column|cells?)\\b\\s+(?:in\\s+)?(?:the\\s+)?table\\b',
  '\\bwrite\\b[^.]{0,120}\\b(?:answers?|values?|results?)\\b[^.]*\\b(?:in|into)\\s+(?:the\\s+)?table\\b',
  '\\b(?:place|put)\\b[^.]{0,100}\\b(?:tick|cross)\\b[^.]{0,100}\\b(?:table|grid|boxes?)\\b',
  '\\b(?:draw|join|connect|match|label)\\b[^.]{0,180}\\b(?:line|diagram|figure|symbol|boxes?|items?|statements?|nodes?|gate)\\b',
  '\\b(?:show|give)\\b[^.]{0,120}\\b(?:changing\\s+)?contents\\b[^.]{0,80}\\b(?:stack|queue)\\b',
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
    const ready=kind==='table'?Boolean(asset.url)||completeInlineSvg(asset.contentMd):portableVisualReady(asset);
    if(['table','diagram','image'].includes(kind)&&ready)return true;
  }
  return assets.some((asset)=>{
    const kind=String(asset.kind??'').toLowerCase();
    const ready=kind==='table'?Boolean(asset.url)||completeInlineSvg(asset.contentMd):portableVisualReady(asset);
    return ['table','diagram','image'].includes(kind)&&ready;
  });
}

export function portableResponseInteractionIntegrity(
  content:unknown,
  assets:Array<PortableVisualLike&{id?:string|null;kind?:string|null}>,
){
  return !responseInteractionRequired(content)||portableResponseInteractionReady(content,assets);
}
