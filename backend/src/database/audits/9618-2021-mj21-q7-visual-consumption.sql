-- 9618/21/M/J/21 Q7 source-table consumption guard.
with expected(question_id,asset_id,page_no) as (
 values
 ('f64b25c4-94af-4c1d-b6a8-18bb46749033'::uuid,'ccf30e72-7c67-4c55-8685-0be996254514'::uuid,18),
 ('f64b25c4-94af-4c1d-b6a8-18bb46749033'::uuid,'2b8795f4-12c7-4ef0-980c-f5163b147347'::uuid,18),
 ('f64b25c4-94af-4c1d-b6a8-18bb46749033'::uuid,'b61c44c7-db80-4961-851c-ec43b6ed0ad7'::uuid,20),
 ('96ec265b-3abe-4a57-836c-6af9a3ae39b6'::uuid,'ccf30e72-7c67-4c55-8685-0be996254514'::uuid,18),
 ('96ec265b-3abe-4a57-836c-6af9a3ae39b6'::uuid,'2b8795f4-12c7-4ef0-980c-f5163b147347'::uuid,18),
 ('96ec265b-3abe-4a57-836c-6af9a3ae39b6'::uuid,'2f994a47-68f7-4f48-8e75-cbd9fde81cd7'::uuid,21)
)
select e.asset_id,q.display_ref,'vf_mj21_21_q7_source_table_consumption_regressed' finding
from expected e join questions q on q.id=e.question_id
where not exists (
  select 1 from jsonb_array_elements(q.content_json->'blocks') b
  where b->>'type'='asset' and b->>'assetId'=e.asset_id::text
    and (b->'source'->>'page')::int=e.page_no
)
union all
select qa.id,q.display_ref,'vf_mj21_21_q7_full_page_svg_regressed'
from question_assets qa join questions q on q.id=qa.question_id
where qa.id in (
 'ccf30e72-7c67-4c55-8685-0be996254514'::uuid,
 '2b8795f4-12c7-4ef0-980c-f5163b147347'::uuid,
 'b61c44c7-db80-4961-851c-ec43b6ed0ad7'::uuid,
 '2f994a47-68f7-4f48-8e75-cbd9fde81cd7'::uuid
)
and qa.svg_markup like '%viewBox="0 0 612 792"%';