-- VF-E-000004 regression guard. Zero rows means Q3(b)'s page-9 trace table
-- preserves Cambridge's two-level "Memory address" grouped header.

select q.id as question_id,q.display_ref,
       'vf_e_000004_trace_table_grouped_header_regressed'::text as finding
from questions q
join source_papers sp on sp.id=q.source_paper_id
where q.id='6b1f48a6-22ba-4522-a8a4-33c41bcfa9ee'::uuid
  and (
    sp.sha256 is distinct from 'd73fa3294ec38a62d756742887a1bfc99909a2135ea86ac4a6713915fc305453'
    or not exists (
      select 1
      from jsonb_array_elements(coalesce(q.content_json->'blocks','[]'::jsonb)) b(value)
      where b.value->>'type'='table'
        and b.value->>'kind'='selection_grid'
        and (b.value#>>'{source,page}')::integer=9
        and b.value->'headerRows' @> '[[{"text":"Memory address","column":2,"colSpan":4}],[{"text":"365","column":2},{"text":"366","column":3},{"text":"367","column":4},{"text":"368","column":5}]]'::jsonb
    )
  );
