-- 9618/11/O/N/21 Q1(a) + Q3 visual-consumption regression guard.
with expected(question_id,asset_id,page_no) as (
 values
 ('f66f8981-5864-451d-95d1-2ffc3fbeeeaf'::uuid,'4bcd60da-6a8e-401c-9924-768f7b19e310'::uuid,2),
 ('87c13534-7d5e-47d8-8643-b5bf6ad06818'::uuid,'f6bd669a-7cef-4ed0-9c83-19da365815ef'::uuid,4),
 ('388c1587-f564-4b0c-99b5-9b20c0d5a5f6'::uuid,'1130f16d-e7e8-4cd6-a076-54cec6067c0b'::uuid,4),
 ('388c1587-f564-4b0c-99b5-9b20c0d5a5f6'::uuid,'b9cf5182-49fd-4929-9509-1b05b264aa84'::uuid,4),
 ('717680df-4a3e-4184-b51d-eba2f037f241'::uuid,'0a0770fc-504a-4025-b562-315d055f10c3'::uuid,4),
 ('717680df-4a3e-4184-b51d-eba2f037f241'::uuid,'6a586df3-fa92-4d34-9824-68a36dd115da'::uuid,5)
)
select e.asset_id,q.display_ref,'vf_on21_11_q1_q3_visual_consumption_regressed' finding
from expected e
join questions q on q.id=e.question_id
left join question_assets qa on qa.id=e.asset_id
where qa.id is null
   or qa.question_id is distinct from e.question_id
   or qa.source_page is distinct from e.page_no
   or qa.crop_status is distinct from 'ready'
   or qa.storage_path is null
   or not exists (
     select 1 from jsonb_array_elements(q.content_json->'blocks') b
     where b->>'type'='asset'
       and b->>'assetId'=e.asset_id::text
       and (b->'source'->>'page')::int=e.page_no
   );