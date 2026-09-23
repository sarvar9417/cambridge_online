-- Regression guard for source-required Q3(b) instruction-set context.
-- Zero rows only when the post-0195 asset is owned by Q3(b) and explicitly
-- referenced in Q3(b) structured content in source order.

select
  q.display_ref,
  q.id as question_id,
  'missing_source_required_instruction_set_context'::text as finding
from questions q
where q.id='6b1f48a6-22ba-4522-a8a4-33c41bcfa9ee'::uuid
  and not exists (
    select 1
    from jsonb_array_elements(coalesce(q.content_json->'blocks','[]'::jsonb)) b(value)
    join question_assets qa on qa.id::text=b.value->>'assetId'
    where b.value->>'type'='asset'
      and qa.id='f9483ad1-7672-4b18-bd0c-cb6b21507950'::uuid
      and qa.question_id=q.id
      and qa.source_page=7
      and qa.source_bbox='[89,286,1565,1549]'::jsonb
      and qa.content_hash='3eb93fb3af37767404486d5f5188fef371cdb870f886d6f12eb7bf39a116fef3'
  );
