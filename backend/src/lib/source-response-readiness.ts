const IDENTIFIER=/^[a-z_][a-z0-9_]*$/i;

function identifier(value:string){
  if(!IDENTIFIER.test(value))throw new Error('unsafe_sql_identifier');
  return value;
}

const TABLE_RESPONSE_CUE_SQL=[
  'complete[[:space:]]+(the[[:space:]]+|this[[:space:]]+|following[[:space:]]+)?(trace[[:space:]]+|truth[[:space:]]+)?table',
  'complete[[:space:]]+(the[[:space:]]+)?answer[[:space:]]+column[[:space:]]+in[[:space:]]+(the[[:space:]]+)?following[[:space:]]+table',
  'trace[[:space:]]+(the[[:space:]]+)?(program|algorithm).{0,80}table',
  'write.{0,80}answers?[[:space:]]+in[[:space:]]+(the[[:space:]]+)?table',
  'fill(ing)?[[:space:]]+in.{0,60}(table|missing)',
  'complete[[:space:]]+(the[[:space:]]+)?k[- ]?map',
].join('|');

const MATCHING_RESPONSE_CUE_SQL=[
  'match[[:space:]]+(each|the)',
  'draw[[:space:]]+(a[[:space:]]+)?line.{0,80}(match|connect|link)',
  '(connect|link)[[:space:]]+(each|the).{0,80}(box|statement|description|term|item)',
].join('|');

const STACK_WORKSPACE_CUE_SQL=[
  'show[[:space:]]+(the[[:space:]]+)?changing[[:space:]]+contents[[:space:]]+of[[:space:]]+(the[[:space:]]+|this[[:space:]]+)?stack',
  'complete[[:space:]]+(the[[:space:]]+|this[[:space:]]+|following[[:space:]]+)?diagram.{0,100}stack',
  'complete[[:space:]]+(the[[:space:]]+|this[[:space:]]+|following[[:space:]]+)?stack',
].join('|');

export function questionOnlineResponseIntegritySql(questionAlias='q'){
  const q=identifier(questionAlias);
  const text=`lower(regexp_replace(coalesce(${q}.context_md,'')||' '||coalesce(${q}.stem_md,''),'[[:space:]]+',' ','g'))`;
  const stackCue=`(${text} ~ '${STACK_WORKSPACE_CUE_SQL}')`;
  const tableCue=`(${text} ~ '${TABLE_RESPONSE_CUE_SQL}')`;
  const matchingCue=`(${text} ~ '${MATCHING_RESPONSE_CUE_SQL}')`;
  const tableReady=`exists(
    select 1
    from jsonb_array_elements(coalesce(${q}.content_json->'blocks','[]'::jsonb)) response_block
    where response_block->>'type'='table'
      and jsonb_typeof(response_block->'editableCells')='array'
      and jsonb_array_length(response_block->'editableCells')>0
  )`;
  const matchingReady=`exists(
    select 1
    from jsonb_array_elements(coalesce(${q}.content_json->'blocks','[]'::jsonb)) response_block
    where response_block->>'type'='matching'
  )`;

  // Stack-changing tasks have a dedicated interactive stack workspace even
  // when the source drawing itself is not encoded as a semantic table. All
  // other high-confidence table/matching tasks must have source-backed response
  // geometry. This prevents a generic textarea from masquerading as a faithful
  // Cambridge answer surface.
  return `(
    ${q}.content_version=1
    and ${q}.content_json is not null
    and (not ${tableCue} or ${stackCue} or ${tableReady})
    and (not ${matchingCue} or ${matchingReady})
  )`;
}

export type ResponseReadinessIssue='missing_editable_table'|'missing_matching_structure';

export function inspectResponseReadiness(input:{
  stem?:string|null;
  context?:string|null;
  contentJson?:unknown;
}):ResponseReadinessIssue[] {
  const text=`${input.context??''} ${input.stem??''}`.replace(/\s+/g,' ').toLowerCase();
  const stackCue=/show (?:the )?changing contents of (?:the |this )?stack|complete (?:the |this |following )?(?:diagram.{0,100})?stack/.test(text);
  const tableCue=/complete (?:the |this |following )?(?:trace |truth )?table|complete (?:the )?answer column in (?:the )?following table|trace (?:the )?(?:program|algorithm).{0,80}table|write.{0,80}answers? in (?:the )?table|fill(?:ing)? in.{0,60}(?:table|missing)|complete (?:the )?k[- ]?map/.test(text);
  const matchingCue=/match (?:each|the)|draw (?:a )?line.{0,80}(?:match|connect|link)|(?:connect|link) (?:each|the).{0,80}(?:box|statement|description|term|item)/.test(text);
  const blocks=input.contentJson&&typeof input.contentJson==='object'&&Array.isArray((input.contentJson as {blocks?:unknown}).blocks)
    ?(input.contentJson as {blocks:Array<Record<string,unknown>>}).blocks
    :[];
  const tableReady=blocks.some((block)=>block.type==='table'&&Array.isArray(block.editableCells)&&block.editableCells.length>0);
  const matchingReady=blocks.some((block)=>block.type==='matching');
  const issues:ResponseReadinessIssue[]=[];
  if(tableCue&&!stackCue&&!tableReady)issues.push('missing_editable_table');
  if(matchingCue&&!matchingReady)issues.push('missing_matching_structure');
  return issues;
}
