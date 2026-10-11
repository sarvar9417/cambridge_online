-- Source-backed structured response repairs and fail-closed audit.
--
-- These repairs are deliberately narrow. Every inserted response block is
-- backed by an original Cambridge QP layout already present in the corpus.
-- Broader candidates are recorded as blocking findings instead of guessed.

-- 9618/11/M/J/25 Q1(b): the logic circuit was referenced, but the source-faithful
-- truth-table answer grid existed only as an orphan asset. Add semantic cells so
-- learner clients can enter answers directly in the table.
UPDATE public.questions q
SET content_json=jsonb_set(
  q.content_json,
  '{blocks}',
  coalesce(q.content_json->'blocks','[]'::jsonb) || jsonb_build_array(
    jsonb_build_object(
      'type','table','kind','truth_table',
      'headers',jsonb_build_array('A','B','C','Working space','X'),
      'rows',jsonb_build_array(
        jsonb_build_array('0','0','0',null,null),
        jsonb_build_array('0','0','1',null,null),
        jsonb_build_array('0','1','0',null,null),
        jsonb_build_array('0','1','1',null,null),
        jsonb_build_array('1','0','0',null,null),
        jsonb_build_array('1','0','1',null,null),
        jsonb_build_array('1','1','0',null,null),
        jsonb_build_array('1','1','1',null,null)
      ),
      'editableCells',(
        select jsonb_agg(jsonb_build_array(r,c) order by r,c)
        from generate_series(0,7) r cross join (values(3),(4)) columns(c)
      ),
      'source',jsonb_build_object('page',3)
    )
  )
)
WHERE q.display_ref='9618/11/M/J/25 Q1(b)'
  AND q.content_version=1
  AND NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(coalesce(q.content_json->'blocks','[]'::jsonb)) b
    WHERE b->>'type'='table'
  );

-- 9618/31/M/J/21 Q3(a): official QP says “Draw one line to connect each ...”.
-- Preserve the original visual while adding a keyboard/touch-accessible
-- equivalent matching model.
UPDATE public.questions q
SET content_json=jsonb_set(
  q.content_json,'{blocks}',
  coalesce(q.content_json->'blocks','[]'::jsonb) || jsonb_build_array(
    jsonb_build_object(
      'type','matching','mode','single',
      'left',jsonb_build_array(
        jsonb_build_object('id','multi_tasking','text','Multi-tasking'),
        jsonb_build_object('id','paging','text','Paging'),
        jsonb_build_object('id','interrupt_handling','text','Interrupt handling'),
        jsonb_build_object('id','scheduling','text','Scheduling'),
        jsonb_build_object('id','virtual_memory','text','Virtual memory')
      ),
      'right',jsonb_build_array(
        jsonb_build_object('id','d1','text','Using secondary storage to simulate additional main memory'),
        jsonb_build_object('id','d2','text','Managing the processes running on the CPU'),
        jsonb_build_object('id','d3','text','Managing the execution of many programs that appear to run at the same time'),
        jsonb_build_object('id','d4','text','Locating non-contiguous blocks of data and relocating them'),
        jsonb_build_object('id','d5','text','Transferring control to another routine when a service is required'),
        jsonb_build_object('id','d6','text','Reading/writing same-size blocks of data from/to secondary storage when required')
      ),
      'source',jsonb_build_object('page',5)
    )
  )
)
WHERE q.display_ref='9618/31/M/J/21 Q3(a)'
  AND q.content_version=1
  AND NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(coalesce(q.content_json->'blocks','[]'::jsonb)) b
    WHERE b->>'type'='matching'
  );

-- 9618/12/M/J/23 Q3(a): source explicitly allows one or more lines, therefore
-- this is a multi-match block rather than a single-choice surrogate.
UPDATE public.questions q
SET content_json=jsonb_set(
  q.content_json,'{blocks}',
  coalesce(q.content_json->'blocks','[]'::jsonb) || jsonb_build_array(
    jsonb_build_object(
      'type','matching','mode','multiple',
      'left',jsonb_build_array(
        jsonb_build_object('id','object_code','text','generates object code'),
        jsonb_build_object('id','read_source','text','reads the source code one line at a time'),
        jsonb_build_object('id','remove_whitespace','text','removes white space'),
        jsonb_build_object('id','symbol_table','text','adds labels to the symbol table')
      ),
      'right',jsonb_build_array(
        jsonb_build_object('id','first','text','first pass'),
        jsonb_build_object('id','second','text','second pass')
      ),
      'source',jsonb_build_object('page',8)
    )
  )
)
WHERE q.display_ref='9618/12/M/J/23 Q3(a)'
  AND q.content_version=1
  AND NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(coalesce(q.content_json->'blocks','[]'::jsonb)) b
    WHERE b->>'type'='matching'
  );

-- RPN stack questions: the original answer canvases are sequences of five-cell
-- vertical stacks. Their orphan source assets describe the exact number of
-- snapshots, so model those snapshots directly instead of forcing a textarea.
WITH repairs(display_ref,source_page,snapshots,labels) AS (
  VALUES
    ('9618/31/O/N/25 Q8(c)',8,9,ARRAY['d','a','b','+','*','c','a','-','/']::text[]),
    ('9618/32/O/N/25 Q8(c)',8,9,ARRAY['c','a','/','b','d','-','*','b','+']::text[]),
    ('9618/33/O/N/25 Q7(c)',6,11,ARRAY['c','a','-','b','d','+','*','b','c','+','/']::text[])
)
UPDATE public.questions q
SET content_json=jsonb_set(
  q.content_json,'{blocks}',
  coalesce(q.content_json->'blocks','[]'::jsonb) || jsonb_build_array(
    jsonb_build_object(
      'type','stack',
      'snapshots',r.snapshots,
      'depth',5,
      'labels',to_jsonb(r.labels),
      'source',jsonb_build_object('page',r.source_page)
    )
  )
)
FROM repairs r
WHERE q.display_ref=r.display_ref
  AND q.content_version=1
  AND NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(coalesce(q.content_json->'blocks','[]'::jsonb)) b
    WHERE b->>'type'='stack'
  );

-- Refresh previous structured-response findings for this detector version.
UPDATE public.validation_findings
SET resolved_at=coalesce(resolved_at,now()),
    resolution=coalesce(resolution,'Superseded by STRUCTURED_RESPONSE_FIDELITY_V1 audit')
WHERE rule_code IN (
  'STRUCTURED_RESPONSE_TABLE_MISSING',
  'STRUCTURED_RESPONSE_MATCHING_MISSING',
  'STRUCTURED_RESPONSE_STACK_MISSING',
  'STRUCTURED_RESPONSE_DRAWING_MISSING'
) AND resolved_at IS NULL;

-- High-confidence remaining gaps are fail-closed. The source is not guessed:
-- reviewers repair these from the original QP, then resolve the finding.
WITH corpus AS (
  SELECT
    q.id,q.answer_kind::text answer_kind,coalesce(q.stem_md,'') stem,q.content_json,
    EXISTS(
      SELECT 1 FROM jsonb_array_elements(coalesce(q.content_json->'blocks','[]'::jsonb)) b
      WHERE b->>'type'='table'
        AND jsonb_array_length(coalesce(b->'editableCells','[]'::jsonb))>0
    ) has_editable_table,
    EXISTS(
      SELECT 1 FROM jsonb_array_elements(coalesce(q.content_json->'blocks','[]'::jsonb)) b
      WHERE b->>'type'='matching'
    ) has_matching,
    EXISTS(
      SELECT 1 FROM jsonb_array_elements(coalesce(q.content_json->'blocks','[]'::jsonb)) b
      WHERE b->>'type'='stack'
    ) has_stack,
    EXISTS(
      SELECT 1 FROM jsonb_array_elements(coalesce(q.content_json->'blocks','[]'::jsonb)) b
      WHERE b->>'type'='answer_area' AND b->>'kind'='drawing'
    ) has_drawing,
    EXISTS(
      SELECT 1 FROM public.question_assets qa
      WHERE qa.question_id=q.id AND qa.kind='table'
        AND coalesce(qa.alt_text,'') ~* '(blank|answer|trace|tick|complete|empty|truth table|result)'
    ) has_answer_table_asset
  FROM public.questions q
  JOIN public.source_papers sp ON sp.id=q.source_paper_id
  JOIN public.syllabi sy ON sy.id=sp.syllabus_id
  WHERE sy.code='9618' AND q.status='approved' AND q.marks>0
), candidates AS (
  SELECT id,'STRUCTURED_RESPONSE_TABLE_MISSING' rule_code,
         'The source requires a table/grid response, but no editable canonical table is available.' message,
         jsonb_build_object('answerKind',answer_kind,'detector','structured-response-v1') details
  FROM corpus
  WHERE answer_kind='table' AND NOT has_editable_table
    AND (stem ~* '(complete|fill|tick|trace|show .*contents|write .*table|enter)' OR has_answer_table_asset)

  UNION ALL

  SELECT id,'STRUCTURED_RESPONSE_MATCHING_MISSING',
         'The source asks the learner to connect/match items, but no canonical matching block is available.',
         jsonb_build_object('answerKind',answer_kind,'detector','structured-response-v1')
  FROM corpus
  WHERE stem ~* '(draw (one|a|the|one or more) line|connect each|match each|link each)' AND NOT has_matching

  UNION ALL

  SELECT id,'STRUCTURED_RESPONSE_STACK_MISSING',
         'The source requires stack-state completion, but no canonical stack workspace is available.',
         jsonb_build_object('answerKind',answer_kind,'detector','structured-response-v1')
  FROM corpus
  WHERE stem ~* '(changing contents of the stack|show .*stack|stack as .*evaluated)' AND NOT has_stack

  UNION ALL

  SELECT id,'STRUCTURED_RESPONSE_DRAWING_MISSING',
         'The source requires a drawing/diagram response, but no canonical drawing answer area is available.',
         jsonb_build_object('answerKind',answer_kind,'detector','structured-response-v1')
  FROM corpus
  WHERE answer_kind='diagram' AND stem ~* '(draw|complete|label|connect)' AND NOT has_drawing
)
INSERT INTO public.validation_findings(rule_code,severity,ref_table,ref_id,message,details)
SELECT c.rule_code,'error'::finding_severity,'questions',c.id,c.message,c.details
FROM candidates c
WHERE NOT EXISTS (
  SELECT 1 FROM public.validation_findings vf
  WHERE vf.rule_code=c.rule_code AND vf.ref_table='questions' AND vf.ref_id=c.id AND vf.resolved_at IS NULL
);

-- Any content repair or new finding invalidates the Live readiness cache through
-- existing statement-level source-table triggers. Live will use the dynamic,
-- fail-closed gate until the cache is explicitly refreshed.
