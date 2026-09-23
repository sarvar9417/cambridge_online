-- Q7 source-table consumption guard.
with required(question_id,asset_id,page_no) as (
 values
 ('02920b31-6fb1-480c-b718-82435784454d'::uuid,'ccf30e72-7c67-4c55-8685-0be996254514',18),
 ('02920b31-6fb1-480c-b718-82435784454d'::uuid,'2b8795f4-12c7-4ef0-980c-f5163b147347',18),
 ('f64b25c4-94af-4c1d-b6a8-18bb46749033'::uuid,'ccf30e72-7c67-4c55-8685-0be996254514',18),
 ('f64b25c4-94af-4c1d-b6a8-18bb46749033'::uuid,'2b8795f4-12c7-4ef0-980c-f5163b147347',18),
 ('f64b25c4-94af-4c1d-b6a8-18bb46749033'::uuid,'b61c44c7-db80-4961-851c-ec43b6ed0ad7',20),
 ('96ec265b-3abe-4a57-836c-6af9a3ae39b6'::uuid,'ccf30e72-7c67-4c55-8685-0be996254514',18),
 ('96ec265b-3abe-4a57-836c-6af9a3ae39b6'::uuid,'2b8795f4-12c7-4ef0-980c-f5163b147347',18),
 ('96ec265b-3abe-4a57-836c-6af9a3ae39b6'::uuid,'2f994a47-68f7-4f48-8e75-cbd9fde81cd7',21)
)
select r.question_id,r.asset_id,'vf_mj21_21_q7_asset_consumption_regressed' finding
from required r
where not exists (
  select 1 from questions q
  cross join lateral jsonb_array_elements(q.content_json->'blocks') b
  where q.id=r.question_id
    and b->>'type'='asset'
    and b->>'assetId'=r.asset_id
    and (b->'source'->>'page')::int=r.page_no
);