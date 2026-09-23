-- Regression guard for source-required Q3(b) instruction-set context.
-- Returns zero rows only when the page-7 source-backed instruction table is
-- present in the independent Q3(b) canonical content.

select
  q.display_ref,
  q.id as question_id,
  'missing_source_required_instruction_set_context'::text as finding
from questions q
where q.id = '6b1f48a6-22ba-4522-a8a4-33c41bcfa9ee'::uuid
  and not exists (
    select 1
    from jsonb_array_elements(coalesce(q.content_json->'blocks','[]'::jsonb)) b(value)
    join question_assets qa
      on qa.id::text = b.value->>'assetId'
    where b.value->>'type' = 'asset'
      and qa.id = 'f9483ad1-7672-4b18-bd0c-cb6b21507950'::uuid
      and qa.source_page = 7
      and qa.content_hash = 'd65ce640e4e7ad1e8adc1fafb7cddbfa9f2f57e90b1428a195eab5c2718b6d3a'
  );
