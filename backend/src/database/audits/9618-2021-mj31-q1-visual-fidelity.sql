-- 9618/31/M/J/21 Q1 floating-point source-visual guard.
with expected(question_id,asset_id,page_no) as (
 values
 ('49b375c2-4379-495d-9cb6-e918c944f580'::uuid,'254fc26a-eea6-4003-93df-8e672059b652'::uuid,2),
 ('54ed9dcb-f599-4552-90e3-b2e117e7ab3a'::uuid,'9971714f-54ba-4e1f-a867-f9c3b73078c7'::uuid,2),
 ('0518d0c8-88b0-4581-8b38-826ddd84f45c'::uuid,'ff6fde4e-566a-4d78-9127-18b4dfea1d9c'::uuid,3)
)
select e.asset_id,q.display_ref,'vf_mj21_31_q1_visual_consumption_regressed' finding
from expected e join questions q on q.id=e.question_id
where not exists (
  select 1 from jsonb_array_elements(q.content_json->'blocks') b
  join question_assets qa on qa.id::text=b->>'assetId'
  where b->>'type'='asset'
    and qa.id=e.asset_id
    and qa.source_page=e.page_no
    and qa.svg_markup like '%Floating point mantissa and exponent boxes%'
    and qa.content_hash=encode(digest(qa.svg_markup,'sha256'),'hex')
);