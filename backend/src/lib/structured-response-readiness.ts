const IDENTIFIER=/^[a-z_][a-z0-9_]*$/i;
function identifier(value:string){
  if(!IDENTIFIER.test(value))throw new Error('unsafe_sql_identifier');
  return value;
}

/**
 * High-confidence guard for questions whose Cambridge response is inherently
 * spatial/structured. A plain textarea is not considered an adequate response
 * surface for table completion, matching/linking, stack/queue state or
 * diagram-completion tasks.
 */
export function questionStructuredResponseIntegritySql(questionAlias='q'){
  const q=identifier(questionAlias);
  const normalized=`lower(regexp_replace(coalesce(${q}.stem_md,''),'[[:space:]]+',' ','g'))`;
  const tableCue=`${normalized} ~ '(complete|fill[[:space:]]+in|fill)([[:space:]]+(the|this|following|a))?[[:space:]]+(truth[[:space:]]+table|trace[[:space:]]+table|table|grid|karnaugh[[:space:]]+map|k-map)'`;
  const matchingCue=`(
    ${normalized} ~ '(^|[[:space:]])draw([[:space:]]+(one|two|the|this|each|appropriate))?[[:space:]]+lines?([[:space:]]|$)'
    or ${normalized} ~ '(^|[[:space:]])(join|connect|match)[[:space:]]+each([[:space:]]|$)'
  )`;
  const stackCue=`(
    ${normalized} ~ 'show[[:space:]]+the[[:space:]]+changing[[:space:]]+contents[[:space:]]+of[[:space:]]+the[[:space:]]+stack'
    or ${normalized} ~ '(complete|show)([[:space:]]+the)?[[:space:]]+state[[:space:]]+of[[:space:]]+[^[:space:]]*(stack|queue)'
  )`;
  const diagramCue=`(
    (
      ${q}.answer_kind='diagram'
      and ${normalized} ~ '(^|[[:space:]])(complete|draw|show|label)([[:space:]]+(one|two|the|this|following|loops?|appropriate|lines?))[^.!?]{0,160}(diagram|flowchart|circuit|tree|graph|map|k-map|stack|queue)'
    )
    or ${normalized} ~ '(^|[[:space:]])draw([[:space:]]+(a|the))?[[:space:]]+(structure[[:space:]]+chart|flowchart)([[:space:]]|[.!?]|$)'
  )`;
  const cue=`(${tableCue} or ${matchingCue} or ${stackCue} or ${diagramCue})`;
  const surface=`(
    ${q}.content_version=1
    and ${q}.content_json is not null
    and exists(
      select 1
      from jsonb_array_elements(coalesce(${q}.content_json->'blocks','[]'::jsonb)) response_block
      where (
        response_block->>'type'='table'
        and jsonb_array_length(coalesce(response_block->'editableCells','[]'::jsonb))>0
      )
      or response_block->>'type'='matching'
      or (
        response_block->>'type'='answer_area'
        and response_block->>'kind' in ('table_cells','drawing')
      )
    )
  )`;
  return `(not ${cue} or ${surface})`;
}
