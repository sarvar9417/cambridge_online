-- 9618/12/M/J/21 Q3(a) source drawing-area regression guard.
select q.id question_id,'vf_mj21_12_q3a_drawing_area_regressed' finding
from questions q
where q.id='e9bf31ba-6fa9-41c7-978c-1d25e43a3c1b'::uuid
and (
  exists (select 1 from jsonb_array_elements(q.content_json->'blocks') b where b->>'type'='answer_area')
  or not exists (
    select 1 from jsonb_array_elements(q.content_json->'blocks') b
    join question_assets qa on qa.id::text=b->>'assetId'
    where b->>'type'='asset'
      and qa.id='e4d7e967-08df-476a-8042-f1c14aea4896'::uuid
      and qa.source_page=5
      and qa.svg_markup like '%viewBox="0 0 950 475"%'
  )
);