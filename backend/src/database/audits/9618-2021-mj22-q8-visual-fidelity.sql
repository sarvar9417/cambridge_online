-- 9618/22/M/J/21 Q8 source-table and answer-area fidelity guard.
select q.id,q.display_ref,'vf_mj21_22_q8_shared_context_regressed' finding
from questions q
where q.id in (
 '877b366c-6051-4a2d-907a-815b00e15995'::uuid,
 '17ecdd6f-9391-4195-bea8-554a3cc70cb3'::uuid
)
and (
 (select count(*) from jsonb_array_elements(q.content_json->'blocks') b
  where b->>'type'='asset'
    and b->>'assetId' in (
      'a5267372-035f-4088-bfb7-2ebcf9749eaa',
      '8e65dbbe-96e4-417c-807e-a9c4beb74a46'
    )) <> 2
 or not exists (
   select 1 from jsonb_array_elements(q.content_json->'blocks') b
   where b->>'type'='answer_area'
     and (
       (q.id='877b366c-6051-4a2d-907a-815b00e15995'::uuid and (b->>'lines')::int=21)
       or
       (q.id='17ecdd6f-9391-4195-bea8-554a3cc70cb3'::uuid and (b->>'lines')::int=28)
     )
 )
)
union all
select qa.id,q.display_ref,'vf_mj21_22_q8_full_page_svg_regressed'
from question_assets qa join questions q on q.id=qa.question_id
where qa.id in (
 'a5267372-035f-4088-bfb7-2ebcf9749eaa'::uuid,
 '8e65dbbe-96e4-417c-807e-a9c4beb74a46'::uuid
)
and qa.svg_markup like '%viewBox="0 0 612 792"%';