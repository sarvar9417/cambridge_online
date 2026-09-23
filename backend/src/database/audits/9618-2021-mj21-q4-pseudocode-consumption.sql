-- Q4 exact pseudocode visual-consumption guard.
with q(id) as (values
 ('6e4f1c76-7cc2-44cd-b277-aa6358b52d42'::uuid),
 ('caa9027e-2771-4668-916c-81ab7cd1cfa2'::uuid),
 ('80f257e7-6b54-4258-afad-694a7cc997dd'::uuid),
 ('3024fdbc-88c3-4d8f-b151-f24702335126'::uuid)
)
select q.id,'vf_mj21_21_q4_code_consumption_regressed' finding
from q
where not exists (
  select 1 from questions qq
  cross join lateral jsonb_array_elements(qq.content_json->'blocks') b
  where qq.id=q.id
    and b->>'type'='asset'
    and b->>'assetId'='2f6ee126-5c8a-4dd8-9b75-e5dff29ecb3a'
    and (b->'source'->>'page')::int=10
);