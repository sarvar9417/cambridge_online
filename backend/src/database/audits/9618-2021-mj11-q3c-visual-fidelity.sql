-- Q3(c) source-geometry and instruction-layout regression guard.

with required(question_id,asset_id,page_no) as (
  values
  ('65a578cd-6296-4167-a467-108db756924e'::uuid,'b8bf030d-017b-4577-a9eb-15547cc6638c'::uuid,10),
  ('65a578cd-6296-4167-a467-108db756924e'::uuid,'9ad478a9-6db1-4571-b99b-ec2aa0484cf0'::uuid,10),
  ('18a43ef1-5579-4f3a-bd74-e983e85ba3f2'::uuid,'e6d89739-5797-42ce-9b13-abc43e526d8a'::uuid,10)
)
select r.asset_id,'vf_q3c_visual_consumption_regressed'::text finding
from required r
where not exists (
  select 1 from questions q
  cross join lateral jsonb_array_elements(q.content_json->'blocks') b
  where q.id=r.question_id and b->>'type'='asset' and b->>'assetId'=r.asset_id::text
)
or not exists (
  select 1 from question_assets qa
  where qa.id=r.asset_id and qa.source_page=r.page_no and qa.svg_markup like '%viewBox="0 0 520 66"%'
)
union all
select q.id,'vf_q3c_instruction_layout_regressed'
from questions q
where q.id in (
  '65a578cd-6296-4167-a467-108db756924e'::uuid,
  '18a43ef1-5579-4f3a-bd74-e983e85ba3f2'::uuid
)
and not exists (
  select 1 from jsonb_array_elements(q.content_json->'blocks') b
  where b->>'type'='code' and b->>'text' in ('LSL #2','LSR #3')
);