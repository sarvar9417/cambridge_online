-- Structural provenance guard for source-backed crops in 9618/12/M/J/21.
-- This is NOT a visual pass. It ensures the reviewed paper/question/page/storage
-- associations remain stable while literal product-surface evidence is pending.

with expected(question_id,asset_id,page_no,requires_storage,expected_hash) as (
 values
 ('8400195d-5d35-4930-8f60-17206554b370'::uuid,'d0359a72-8bc2-4292-bfa7-b8acf2cbee39'::uuid,3,true,'371d23303ea515b8d6d59ff3bbad2a4d0b2783093c11b86163082eb02fd6df36'),
 ('6df87ea2-c4c9-444d-b438-60dc054db9b4'::uuid,'0a4f2cb9-811b-4048-8227-967d4bb38cd9'::uuid,4,true,'0b4368fc611e0ea6f36d4410ce7f8447739821bb0f98df6efa9bd014b78d0a87'),
 ('78e2c3a5-35bc-4a31-9239-7178aa898227'::uuid,'086cc71a-9c6a-44a4-86f5-c6286cd9d067'::uuid,5,true,'44d3efe7d1efd1289a3fd1c3da214cc90aece48cb27f9a9b578f5593b7c6f22f'),
 ('aa4a2e34-73b2-478b-b9ee-7c18f4a5ad03'::uuid,'95ecf9c8-6cd4-4c53-9667-92f5766ba93a'::uuid,7,true,'eb32475dafc61a515cb4d066bcf527260892e6b1095a2ca0d4b327f1869d01af'),
 ('4be22251-7774-475b-9e08-5d1a9e424f69'::uuid,'6115db6b-68bc-4575-ae6c-0bf71d2423b3'::uuid,8,true,'24bb8f59390795a3c2e2f4940ddce7dd20802ed94338eaf972c819f44ba428cd'),
 ('acafb303-cb30-4e60-9991-da801de878a6'::uuid,'2aa387ee-2917-46aa-8a12-8095f6c52a2b'::uuid,8,true,'24bb8f59390795a3c2e2f4940ddce7dd20802ed94338eaf972c819f44ba428cd'),
 ('4e10e888-c899-4cdf-8a18-b293c275d9e0'::uuid,'e42684a4-bb83-43bb-b6ba-2e0c6418afde'::uuid,8,true,'24bb8f59390795a3c2e2f4940ddce7dd20802ed94338eaf972c819f44ba428cd'),
 ('bc3a617b-3e41-4fa0-88db-4b5d3f360153'::uuid,'e5e6713d-3d48-40c2-9ed1-3d64cf36faf2'::uuid,11,true,'313e0c7bc3d6d80f37478ff185219b343656940918f06291a9cf850fa5f8ec33')
)
select e.asset_id,q.display_ref,'vf_mj21_12_source_crop_provenance_regressed' finding
from expected e
left join questions q on q.id=e.question_id
left join question_assets qa on qa.id=e.asset_id
left join source_papers sp on sp.id=q.source_paper_id
where q.id is null
   or qa.id is null
   or qa.question_id is distinct from e.question_id
   or sp.id is distinct from '77905939-ac1e-441e-b68a-386f22dfcd3d'::uuid
   or sp.sha256 is distinct from '63c51bb1e39c8795d3dae421cf4e2a79c82a823fcfbdd817c2041b6c6c052eb1'
   or qa.source_page is distinct from e.page_no
   or qa.crop_status is distinct from 'ready'
   or (e.requires_storage and qa.storage_path is null)
   or qa.source_bbox is null
   or qa.content_hash is distinct from e.expected_hash
   or not exists (
     select 1 from jsonb_array_elements(coalesce(q.content_json->'blocks','[]'::jsonb)) b
     where b->>'type'='asset'
       and b->>'assetId'=e.asset_id::text
       and (b->'source'->>'page')::int=e.page_no
   );