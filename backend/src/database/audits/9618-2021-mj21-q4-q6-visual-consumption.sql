-- 9618/21/M/J/21 Q4/Q6 visual consumption and crop guard.
select q.id question_id,'vf_mj21_21_q4_pseudocode_consumption_regressed' finding
from questions q
where q.id='6e4f1c76-7cc2-44cd-b277-aa6358b52d42'::uuid
and not exists (
  select 1 from jsonb_array_elements(q.content_json->'blocks') b
  where b->>'type'='asset'
    and b->>'assetId'='2f6ee126-5c8a-4dd8-9b75-e5dff29ecb3a'
    and (b->'source'->>'page')::int=10
)
union all
select qa.id,'vf_mj21_21_q6_shared_crop_regressed'
from question_assets qa
where qa.id='3af22c1d-c6f9-42be-b536-ead6f656dd65'::uuid
and (
  qa.source_page is distinct from 16
  or qa.crop_status is distinct from 'ready'
  or qa.source_bbox is distinct from '[153,154,1542,538]'::jsonb
  or qa.storage_path is distinct from (
    select storage_path from question_assets where id='6a79c482-fda1-4652-8fef-6b9d1712f96f'::uuid
  )
);