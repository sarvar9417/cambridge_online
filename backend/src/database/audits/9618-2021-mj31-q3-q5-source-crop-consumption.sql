-- 9618/31/M/J/21 Q3(a)/Q5(a) source-crop consumption guard.
with expected(question_id,asset_id,page_no) as (
 values
 ('8e93bf90-81e9-4774-94cd-c4962f8b684a'::uuid,'b5b75f06-38fe-4cfe-a3d3-b69d6f383fe1'::uuid,5),
 ('c578883e-cf70-4854-90a9-8cc8774456a2'::uuid,'7b517ea2-5050-4614-ab10-87ad9fb72ed9'::uuid,7)
)
select e.asset_id,q.display_ref,'vf_mj21_31_source_crop_consumption_regressed' finding
from expected e
join questions q on q.id=e.question_id
join question_assets qa on qa.id=e.asset_id
where qa.question_id is distinct from e.question_id
   or qa.source_page is distinct from e.page_no
   or qa.crop_status is distinct from 'ready'
   or qa.storage_path is null
   or not exists (
     select 1 from jsonb_array_elements(q.content_json->'blocks') b
     where b->>'type'='asset'
       and b->>'assetId'=e.asset_id::text
       and (b->'source'->>'page')::int=e.page_no
   );