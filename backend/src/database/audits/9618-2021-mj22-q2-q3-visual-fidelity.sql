-- 9618/22/M/J/21 Q2-Q3 source-geometry/consumption guard.
select qa.id,q.display_ref,'vf_mj21_22_q2_q3_storage_precedence_regressed' finding
from question_assets qa join questions q on q.id=qa.question_id
where qa.id in (
 'eff606e9-f3af-4a3e-977d-9b46f54c8981'::uuid,
 '95dbed94-647a-498f-b4c1-69ff53855cd1'::uuid,
 '59b271ba-5fad-4792-a5af-d634781c99de'::uuid,
 'ab3b5765-07d8-47e9-a56a-4a2f74bb3cb7'::uuid,
 '5741e618-ff35-42fe-ad9c-a95633ab9820'::uuid,
 'ab5f8f19-907e-4d4e-a666-a6aeaecfdf4d'::uuid,
 '2e2a10ec-3d1c-4a87-8d69-cf0f02015e2c'::uuid
)
and (qa.storage_path is not null or qa.source_bbox is not null or qa.crop_status is distinct from 'not_needed')
union all
select q.id,q.display_ref,'vf_mj21_22_q2_q3_asset_consumption_regressed'
from questions q
where q.id in (
 '89882f23-c818-4ad3-a333-93b1f9a1f390'::uuid,
 'de1b76d7-2528-4064-a1d0-075849c3f10d'::uuid,
 '60d4dacd-2903-4dfc-85fa-c16f2bde7670'::uuid,
 '849dfd23-9c6f-4019-bb51-f5c9ccc3c84a'::uuid,
 '414afc4d-8fa9-4589-a2b3-60ba935d4923'::uuid,
 '72b8d766-3585-486a-8285-975f837a4e17'::uuid
)
and not exists (
  select 1 from jsonb_array_elements(q.content_json->'blocks') b
  where b->>'type'='asset'
);