-- VF-E-000005 regression guard. Zero rows means Q4(c)(ii) contains only
-- source-visible Wired/Wireless option rows and no invented header labels.

select q.id as question_id,q.display_ref,
       'vf_e_000005_invented_option_headers_regressed'::text as finding
from questions q
where q.id='b0304966-4b2b-4a9d-9bb8-b4ba34b7740d'::uuid
  and not exists (
    select 1
    from jsonb_array_elements(coalesce(q.content_json->'blocks','[]'::jsonb)) b(value)
    where b.value->>'type'='table'
      and b.value->>'kind'='tick_grid'
      and (b.value#>>'{source,page}')::integer=12
      and b.value->'headers'='[]'::jsonb
      and b.value->'rows'='[["Wired",null],["Wireless",null]]'::jsonb
  );
