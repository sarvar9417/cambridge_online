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
  const cue=`(
    ${normalized} ~ '(^|[[:space:]])(complete|fill in|fill)[^.!?]{0,140}(table|grid|truth table|trace table|karnaugh map|k-map)'
    or ${normalized} ~ '(draw|join|connect|match)[^.!?]{0,140}(line|arrow|box|item|statement|description|term|layer|method)'
    or ${normalized} ~ '(complete|show)[^.!?]{0,140}(state of (the )?(stack|queue)|stack|queue)'
    or (
      ${q}.answer_kind='diagram'
      and ${normalized} ~ '(complete|draw|show|label)[^.!?]{0,160}(diagram|flowchart|circuit|tree|graph|map|stack|queue)'
    )
  )`;
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
