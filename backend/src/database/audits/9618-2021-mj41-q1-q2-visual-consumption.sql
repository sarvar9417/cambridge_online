-- 9618/41/M/J/21 Q1 + Q2(c) visual-consumption guard.
with q1_assets(asset_id) as (
 values
 ('461f38c9-5188-44bf-8ba6-d5a73b4bade2'::uuid),
 ('6013530e-b53c-4e7b-8875-d786b51c7535'::uuid),
 ('f581ae72-01cf-44ad-ab92-ed75ece1a1d9'::uuid),
 ('64fdb4f5-7582-4812-9f45-531315e780cd'::uuid),
 ('a616b7d4-cc17-4291-9f24-047f42fb1c67'::uuid),
 ('2805b382-bd01-4218-97e8-6ad6ee2315bf'::uuid),
 ('40e0fc35-f34e-414e-ae76-7cda94d855e7'::uuid)
)
select qa.id asset_id,'vf_mj21_41_q1_source_crop_regressed' finding
from q1_assets e join question_assets qa on qa.id=e.asset_id
where qa.source_page<>2
   or qa.crop_status is distinct from 'ready'
   or qa.content_md is null
   or qa.svg_markup is distinct from qa.content_md
   or qa.svg_markup not like '<svg%<image href="data:image/png;base64,%'
   or qa.content_hash is distinct from encode(digest(qa.svg_markup,'sha256'),'hex')
union all
select '3e8838b9-fbd2-4777-b7b0-535808545b36'::uuid,'vf_mj21_41_q2c_pseudocode_consumption_regressed'
where not exists (
  select 1 from questions q cross join lateral jsonb_array_elements(q.content_json->'blocks') b
  where q.id='eb5576d8-8198-4436-9e54-cdb9f2de2318'::uuid
    and b->>'type'='asset'
    and b->>'assetId'='3e8838b9-fbd2-4777-b7b0-535808545b36'
    and (b->'source'->>'page')::int=7
);