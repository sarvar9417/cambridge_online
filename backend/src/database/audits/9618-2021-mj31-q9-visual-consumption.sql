-- 9618/31/M/J/21 Q9(c) source-table consumption guard.
select q.id question_id,'vf_mj21_31_q9_table_consumption_regressed' finding
from questions q
where q.id='10e7993d-ae05-4ddd-905c-82489b505a70'::uuid
and (
  not exists (
    select 1 from jsonb_array_elements(q.content_json->'blocks') b
    where b->>'type'='asset' and b->>'assetId'='2a004f84-7155-4189-b3cb-bd8e11bfb326'
  )
  or not exists (
    select 1 from question_assets qa
    where qa.id='2a004f84-7155-4189-b3cb-bd8e11bfb326'::uuid
      and qa.source_page=12
      and qa.svg_markup like '%Program code example%'
      and qa.svg_markup like '%Programming paradigm%'
      and qa.content_hash=encode(digest(qa.svg_markup,'sha256'),'hex')
  )
);