-- Q4(c) source-table visual regression guard.
with required(question_id,asset_id,page_no,viewbox) as (
 values
 ('560c749b-567d-4f45-9ef4-7cc67d4c25e3'::uuid,'a6403741-7948-46e6-9c22-c96acb8711d5'::uuid,11,'0 0 850 205'),
 ('b0304966-4b2b-4a9d-9bb8-b4ba34b7740d'::uuid,'29e7c51c-1a27-46f7-a122-b629f0985bd5'::uuid,12,'0 0 263 76')
)
select r.asset_id,'vf_q4_source_table_regressed' finding
from required r
where not exists (
  select 1 from questions q cross join lateral jsonb_array_elements(q.content_json->'blocks') b
  where q.id=r.question_id and b->>'type'='asset' and b->>'assetId'=r.asset_id::text
)
or not exists (
  select 1 from question_assets qa
  where qa.id=r.asset_id and qa.source_page=r.page_no and qa.svg_markup like '%'||r.viewbox||'%'
);