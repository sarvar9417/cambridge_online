-- 9618/21/M/J/21 Q1-Q2 visual consumption guard.
with required(question_id,asset_id,page_no) as (
 values
 ('41a269dd-ea89-4c6b-b49a-519a67ae3e74'::uuid,'ba8d9f75-4ea5-40d9-a98d-f84e9345ad89'::uuid,2),
 ('9f233bc1-533a-4bc8-9b26-104691f7c633'::uuid,'e52b93b5-1767-4484-92c2-42fe050a1001'::uuid,2),
 ('c0f58766-e2f3-445a-97da-86827ffdcc54'::uuid,'8df0f70a-fc95-4218-af24-94e2335fa4ed'::uuid,4),
 ('f70b5181-5c23-4b7d-8020-e3d19f0c847f'::uuid,'2bb16eec-53da-4834-add0-7f88ee50a823'::uuid,5)
)
select r.asset_id,q.display_ref,'vf_mj21_21_q1_q2_consumption_regressed' finding
from required r
join questions q on q.id=r.question_id
where not exists (
  select 1 from jsonb_array_elements(q.content_json->'blocks') b
  where b->>'type'='asset' and b->>'assetId'=r.asset_id::text
    and (b->'source'->>'page')::int=r.page_no
)
union all
select qa.id,q.display_ref,'vf_mj21_21_q2a_inline_source_crop_regressed'
from question_assets qa join questions q on q.id=qa.question_id
where qa.id='8df0f70a-fc95-4218-af24-94e2335fa4ed'::uuid
and (qa.svg_markup is distinct from qa.content_md
     or qa.svg_markup not like '<svg%<image href="data:image/png;base64,%');