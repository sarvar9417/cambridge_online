-- 9618/31/M/J/21 Q7 visual-consumption guard.
select q.id question_id,q.display_ref,'vf_mj21_31_q7_consumption_regressed' finding
from questions q
where q.id in (
 '1a9bf2b4-514f-4b19-9791-ab46fd16e803'::uuid,
 'bb3a2b07-f25b-4374-a9b3-6569ec28571a'::uuid,
 '5f3dd926-cd1a-4a6c-9319-b3aa8a8d0cd2'::uuid
)
and (
  not exists (
    select 1 from jsonb_array_elements(q.content_json->'blocks') b
    join question_assets qa on qa.id::text=b->>'assetId'
    where b->>'type'='asset' and qa.kind='diagram' and qa.source_page=9
      and qa.svg_markup=qa.content_md
      and qa.svg_markup like '<svg%<image href="data:image/png;base64,%'
  )
  or (q.id='1a9bf2b4-514f-4b19-9791-ab46fd16e803'::uuid and not exists (
    select 1 from jsonb_array_elements(q.content_json->'blocks') b
    where b->>'type'='asset' and b->>'assetId'='6b3173d3-a222-4510-9735-e63bc677dcd1'
  ))
  or (q.id='5f3dd926-cd1a-4a6c-9319-b3aa8a8d0cd2'::uuid and exists (
    select 1 from jsonb_array_elements(q.content_json->'blocks') b
    where b->>'type'='asset' and b->>'assetId'='18002b52-06a7-4e04-a08b-26dbdc062cee'
  ))
);