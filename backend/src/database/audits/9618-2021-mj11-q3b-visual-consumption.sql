-- Page-8/page-9 Q3(b) literal visual-consumption guard.
-- Zero rows means source geometry is represented by the canonical visual assets
-- instead of being flattened back into generic structured tables.

with q as (
  select id,content_json from questions
  where id='6b1f48a6-22ba-4522-a8a4-33c41bcfa9ee'::uuid
),
refs as (
  select b.value
  from q cross join lateral jsonb_array_elements(q.content_json->'blocks') b(value)
  where b.value->>'type'='asset'
),
expected(asset_id,page_no) as (
  values
  ('8649e01d-0211-4558-a541-bbed3279c6ae'::uuid,8),
  ('1894154b-5802-47ca-a2d2-2ee9dc63f6f5'::uuid,8),
  ('c43ee7fc-9486-4302-a9c9-b48f51f34a33'::uuid,9)
)
select e.asset_id,'vf_q3b_visual_asset_consumption_regressed'::text as finding
from expected e
where not exists (
  select 1 from refs r
  where r.value->>'assetId'=e.asset_id::text
    and (r.value->'source'->>'page')::int=e.page_no
)
or not exists (
  select 1 from question_assets qa
  where qa.id=e.asset_id and qa.source_page=e.page_no and qa.svg_markup is not null
);
