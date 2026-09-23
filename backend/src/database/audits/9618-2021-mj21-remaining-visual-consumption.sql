-- 9618/21/M/J/21 remaining shared-source consumption guard.
with required(question_id,asset_id,page_no) as (
 values
 ('caa9027e-2771-4668-916c-81ab7cd1cfa2'::uuid,'2f6ee126-5c8a-4dd8-9b75-e5dff29ecb3a',10),
 ('80f257e7-6b54-4258-afad-694a7cc997dd'::uuid,'2f6ee126-5c8a-4dd8-9b75-e5dff29ecb3a',10),
 ('3024fdbc-88c3-4d8f-b151-f24702335126'::uuid,'2f6ee126-5c8a-4dd8-9b75-e5dff29ecb3a',10),
 ('02920b31-6fb1-480c-b718-82435784454d'::uuid,'ccf30e72-7c67-4c55-8685-0be996254514',18),
 ('02920b31-6fb1-480c-b718-82435784454d'::uuid,'2b8795f4-12c7-4ef0-980c-f5163b147347',18)
)
select r.question_id,r.asset_id,'vf_mj21_21_remaining_shared_source_regressed' finding
from required r
where not exists (
  select 1 from questions q
  cross join lateral jsonb_array_elements(q.content_json->'blocks') b
  where q.id=r.question_id
    and b->>'type'='asset'
    and b->>'assetId'=r.asset_id
    and (b->'source'->>'page')::int=r.page_no
);