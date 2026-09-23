-- 9618/22/M/J/21 Q5(b) pseudocode consumption guard.
select q.id,q.display_ref,'vf_mj21_22_q5b_pseudocode_consumption_regressed' finding
from questions q
where q.id in (
 'f82d36b4-2977-43c3-a992-b09da91cf72d'::uuid,
 '73cd8595-aca5-4660-9303-c41fa91c9b96'::uuid
)
and not exists (
  select 1 from jsonb_array_elements(q.content_json->'blocks') b
  join question_assets qa on qa.id::text=b->>'assetId'
  where b->>'type'='asset'
    and qa.id='c48c8039-7ce7-403d-9435-90f1cfd6d276'::uuid
    and qa.source_page=8
    and qa.storage_path is null
    and qa.svg_markup like '%viewBox="0 0 930 525"%'
);