-- VF-E-000003 source-crop provenance guard for 9618/11/M/J/21 Q2(a).
-- Zero rows means the active matching diagram still points at the reviewed
-- original-source crop with exact paper/page ownership.

with target as (
  select
    qa.id,
    qa.storage_path,
    qa.crop_status,
    qa.source_page,
    qa.source_bbox,
    q.id question_id,
    q.source_paper_id,
    sp.sha256
  from question_assets qa
  join questions q on q.id=qa.question_id
  join source_papers sp on sp.id=q.source_paper_id
  where qa.id='1e91f11f-37f0-43d3-afbb-64f1c7efda3c'::uuid
)
select
  t.id as asset_id,
  'vf_e_000003_source_crop_provenance_regressed'::text as finding
from target t
where t.question_id is distinct from '6342a928-068e-4758-8ba3-d0d9e91e72df'::uuid
   or t.source_paper_id is distinct from 'fab329b3-9fbc-43ac-938b-5d83c815a1e5'::uuid
   or t.sha256 is distinct from 'd73fa3294ec38a62d756742887a1bfc99909a2135ea86ac4a6713915fc305453'
   or t.source_page is distinct from 5
   or t.crop_status is distinct from 'ready'
   or t.storage_path is null
   or t.source_bbox is null
   or not exists (
     select 1
     from questions q
     cross join lateral jsonb_array_elements(coalesce(q.content_json->'blocks','[]'::jsonb)) b(value)
     where q.id=t.question_id
       and b.value->>'type'='asset'
       and b.value->>'assetId'=t.id::text
   );
