-- 9618/12/M/J/21 Q5(d) explicit source-page guard.
select q.id question_id,'vf_mj21_12_q5d_source_page_regressed' finding
from questions q
where q.id='bc3a617b-3e41-4fa0-88db-4b5d3f360153'::uuid
and not exists (
  select 1 from jsonb_array_elements(q.content_json->'blocks') b
  join question_assets qa on qa.id::text=b->>'assetId'
  where b->>'type'='asset'
    and qa.id='e5e6713d-3d48-40c2-9ed1-3d64cf36faf2'::uuid
    and qa.source_page=11
    and qa.crop_status='ready'
    and (b->'source'->>'page')::int=11
);