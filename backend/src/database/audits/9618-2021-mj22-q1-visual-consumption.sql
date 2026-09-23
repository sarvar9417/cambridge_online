-- 9618/22/M/J/21 Q1 source-table consumption guard.
with expected(question_id,asset_id,page_no) as (
 values
 ('2d9f1454-be42-4c94-b879-791e2d332c3b'::uuid,'0eb0e882-1670-4754-89a3-d8d0cde3c959'::uuid,2),
 ('608831b3-528b-4742-ac15-8e31684c0a97'::uuid,'f557f53c-3607-43be-80e6-fb4d8240f6a5'::uuid,2),
 ('608831b3-528b-4742-ac15-8e31684c0a97'::uuid,'dec74de2-2f8a-4ce3-be54-f0c6b7f661bb'::uuid,2),
 ('67090c04-40c7-41df-8afe-6bbcbc69f342'::uuid,'328786c3-3c85-42fa-b597-b3b6f2476850'::uuid,2)
)
select e.asset_id,q.display_ref,'vf_mj21_22_q1_source_table_consumption_regressed' finding
from expected e join questions q on q.id=e.question_id
where not exists (
  select 1 from jsonb_array_elements(q.content_json->'blocks') b
  where b->>'type'='asset'
    and b->>'assetId'=e.asset_id::text
    and (b->'source'->>'page')::int=e.page_no
);