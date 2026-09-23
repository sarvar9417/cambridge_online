-- Q2(b) source-table consumption guard.
select q.id question_id,'vf_mj21_21_q2b_table_consumption_regressed' finding
from questions q
where q.id='f70b5181-5c23-4b7d-8020-e3d19f0c847f'::uuid
and (
  not exists (
    select 1 from jsonb_array_elements(q.content_json->'blocks') b
    where b->>'type'='asset'
      and b->>'assetId'='2bb16eec-53da-4834-add0-7f88ee50a823'
      and (b->'source'->>'page')::int=5
  )
  or not exists (
    select 1 from jsonb_array_elements(q.content_json->'blocks') b
    where b->>'type'='answer_area' and b->>'kind'='lines'
  )
);