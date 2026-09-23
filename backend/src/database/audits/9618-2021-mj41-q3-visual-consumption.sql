-- 9618/41/M/J/21 Q3 source-crop consumption guard.
with expected(question_id,asset_id) as (
 values
 ('3c257568-2dc8-4c0f-b8c7-a105485f32cd'::uuid,'d12876d0-63a9-40b6-89a4-0c7e1deb24f3'::uuid),
 ('aac0d6cf-0f24-4c06-9553-ee328d8b7921'::uuid,'0608c7f8-5f6b-4112-99a7-721e8be71bb6'::uuid),
 ('4af034c8-2d6a-4f3b-a801-88642a466bac'::uuid,'b3e88fe7-f097-4e2b-abc8-1cb5c577ddeb'::uuid),
 ('78d36be0-edfe-4532-b384-b6bf414fb39b'::uuid,'b4673c03-8d77-4082-b29d-3c605d55a811'::uuid),
 ('7889c360-86d8-4fc5-a521-c5f31e2e24a6'::uuid,'14d5334b-5604-40f7-bbbd-b4b719797a86'::uuid),
 ('3135f8da-14d7-4b14-8d11-cbae31906aeb'::uuid,'de06635d-3898-439b-9ed6-5bfd5b361728'::uuid),
 ('2663074a-e597-4a19-b2db-3e464c502c72'::uuid,'89e271cf-b2e4-400f-b281-aad5fee9bdad'::uuid)
)
select e.asset_id,q.display_ref,'vf_mj21_41_q3_source_crop_consumption_regressed' finding
from expected e
join questions q on q.id=e.question_id
left join question_assets qa on qa.id=e.asset_id
where qa.id is null
   or qa.question_id is distinct from e.question_id
   or qa.source_page is distinct from 8
   or qa.crop_status is distinct from 'ready'
   or qa.storage_path is null
   or not exists (
     select 1 from jsonb_array_elements(q.content_json->'blocks') b
     where b->>'type'='asset'
       and b->>'assetId'=e.asset_id::text
       and (b->'source'->>'page')::int=8
   )
   or exists (
     select 1 from jsonb_array_elements(q.content_json->'blocks') b
     where b->>'type'='text'
       and b->>'text' like '%question : STRING%constructor()%getPoints()%'
   );