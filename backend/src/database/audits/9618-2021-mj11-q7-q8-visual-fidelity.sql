-- Q7(b)(ii) + Q8 source-table fidelity guard.
with required(question_id,asset_id,page_no,viewbox) as (
 values
 ('15f5674e-b6cf-4386-89e6-8f50a604e948'::uuid,'17eb0daa-5410-45db-8843-633f7fb02272'::uuid,15,'0 0 244 198'),
 ('62e94632-92d3-435f-8ea2-61e8a003d6be'::uuid,'168599f4-5cee-4993-a3b4-d7cecea66c43'::uuid,16,'0 0 850 202')
)
select r.asset_id,'vf_q7_q8_source_table_regressed' finding
from required r
where not exists (
  select 1 from questions q cross join lateral jsonb_array_elements(q.content_json->'blocks') b
  where q.id=r.question_id and b->>'type'='asset' and b->>'assetId'=r.asset_id::text
)
or not exists (
  select 1 from question_assets qa
  where qa.id=r.asset_id and qa.source_page=r.page_no and qa.svg_markup like '%'||r.viewbox||'%'
);