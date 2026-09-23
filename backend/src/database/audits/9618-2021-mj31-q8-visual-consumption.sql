-- 9618/31/M/J/21 Q8(b) visual/pseudocode regression guard.
select q.id question_id,'vf_mj21_31_q8_visual_consumption_regressed' finding
from questions q
where q.id='d9873fb0-1ae6-4f63-a5b2-ae4a9bcbf095'::uuid
and (
  not exists (select 1 from jsonb_array_elements(q.content_json->'blocks') b where b->>'type'='asset' and b->>'assetId'='8d33a297-e052-4469-adbf-ffa79718097e')
  or not exists (select 1 from jsonb_array_elements(q.content_json->'blocks') b where b->>'type'='asset' and b->>'assetId'='5c0b58cb-b5d2-43f1-8406-cb27bc990877')
  or not exists (select 1 from jsonb_array_elements(q.content_json->'blocks') b where b->>'type'='answer_area' and (b->'source'->>'page')::int=11 and (b->>'lines')::int>=18)
  or not exists (select 1 from question_assets qa where qa.id='8d33a297-e052-4469-adbf-ffa79718097e'::uuid and qa.svg_markup like '%Sorted Score and Name arrays%' and qa.content_hash=encode(digest(qa.svg_markup,'sha256'),'hex'))
  or not exists (select 1 from question_assets qa where qa.id='5c0b58cb-b5d2-43f1-8406-cb27bc990877'::uuid and qa.svg_markup like '%YearSize%' and qa.svg_markup like '%ENDWHILE%' and qa.content_hash=encode(digest(qa.svg_markup,'sha256'),'hex'))
);