-- 9618 LaTeX conversion coverage, paper by paper.
--
-- Read-only. The original QP/MS rows remain the source of truth; this report
-- measures reviewed question-level LaTeX, browser structured content, and
-- LaTeX-authored visual assets with compiled SVG output.

with qp as (
  select
    sp.id,
    sp.syllabus_id,
    sp.component_id,
    sp.year,
    sp.series,
    sp.variant,
    sp.storage_path,
    sp.sha256,
    sp.page_count,
    c.number as component,
    s.code as syllabus_code,
    exists (
      select 1
      from source_papers ms
      where ms.syllabus_id = sp.syllabus_id
        and ms.component_id = sp.component_id
        and ms.year = sp.year
        and ms.series = sp.series
        and ms.variant = sp.variant
        and ms.kind = 'MS'
    ) as has_mark_scheme
  from source_papers sp
  join syllabi s on s.id = sp.syllabus_id
  join components c on c.id = sp.component_id
  where s.code = '9618'
    and sp.kind = 'QP'
    and sp.year between 2021 and 2026
),
question_stats as (
  select
    q.source_paper_id,
    count(*)::int as question_nodes,
    count(*) filter (where q.marks is not null)::int as leaf_questions,
    count(*) filter (
      where q.marks is not null
        and nullif(btrim(coalesce(q.stem_latex, '')), '') is not null
    )::int as leaves_with_stem_latex,
    count(*) filter (
      where q.marks is not null and q.body_format = 'latex'
    )::int as latex_body_leaves,
    count(*) filter (
      where nullif(btrim(coalesce(q.context_latex, '')), '') is not null
    )::int as nodes_with_context_latex,
    count(*) filter (where q.marks is not null and q.content_json is not null)::int as structured_leaves,
    count(*) filter (where q.marks is not null and q.content_version = 1)::int as structured_v1_leaves,
    count(*) filter (where q.marks is not null and q.status = 'approved')::int as approved_leaves,
    count(*) filter (where q.marks is not null and q.status = 'needs_review')::int as needs_review_leaves
  from questions q
  group by q.source_paper_id
),
block_stats as (
  select
    q.source_paper_id,
    count(*) filter (where block.value->>'type' = 'math')::int as math_blocks,
    count(*) filter (
      where block.value->>'type' = 'math'
        and nullif(btrim(block.value->>'latex'), '') is not null
    )::int as latex_math_blocks,
    count(*) filter (where block.value->>'type' = 'table')::int as structured_table_blocks,
    count(*) filter (where block.value->>'type' = 'asset')::int as structured_asset_blocks
  from questions q
  cross join lateral jsonb_array_elements(
    case
      when jsonb_typeof(q.content_json->'blocks') = 'array' then q.content_json->'blocks'
      else '[]'::jsonb
    end
  ) as block(value)
  group by q.source_paper_id
),
asset_stats as (
  select
    q.source_paper_id,
    count(qa.id)::int as assets,
    count(qa.id) filter (where qa.kind in ('diagram','image'))::int as visual_assets,
    count(qa.id) filter (
      where nullif(btrim(coalesce(qa.latex_source, '')), '') is not null
    )::int as latex_authored_assets,
    count(qa.id) filter (
      where nullif(btrim(coalesce(qa.svg_markup, '')), '') is not null
    )::int as compiled_svg_assets,
    count(qa.id) filter (
      where qa.kind in ('diagram','image')
        and nullif(btrim(coalesce(qa.latex_source, '')), '') is not null
        and nullif(btrim(coalesce(qa.svg_markup, '')), '') is not null
    )::int as latex_visuals_ready,
    count(qa.id) filter (
      where qa.kind in ('diagram','image')
        and nullif(btrim(coalesce(qa.storage_path, '')), '') is null
        and nullif(btrim(coalesce(qa.svg_markup, '')), '') is null
        and coalesce(qa.content_md, '') !~* '^\s*<svg(?:\s|>)'
    )::int as unresolved_visual_assets
  from questions q
  left join question_assets qa on qa.question_id = q.id
  group by q.source_paper_id
)
select
  qp.year,
  qp.series::text as series,
  qp.component,
  qp.variant,
  case when qp.variant between 1 and 3 then 'canonical' else 'legacy_or_noncanonical' end as source_class,
  qp.has_mark_scheme,
  qp.page_count,
  coalesce(qs.question_nodes, 0) as question_nodes,
  coalesce(qs.leaf_questions, 0) as leaf_questions,
  coalesce(qs.leaves_with_stem_latex, 0) as leaves_with_stem_latex,
  coalesce(qs.latex_body_leaves, 0) as latex_body_leaves,
  coalesce(qs.nodes_with_context_latex, 0) as nodes_with_context_latex,
  coalesce(qs.structured_leaves, 0) as structured_leaves,
  coalesce(qs.structured_v1_leaves, 0) as structured_v1_leaves,
  coalesce(bs.math_blocks, 0) as math_blocks,
  coalesce(bs.latex_math_blocks, 0) as latex_math_blocks,
  coalesce(bs.structured_table_blocks, 0) as structured_table_blocks,
  coalesce(bs.structured_asset_blocks, 0) as structured_asset_blocks,
  coalesce(ast.assets, 0) as assets,
  coalesce(ast.visual_assets, 0) as visual_assets,
  coalesce(ast.latex_authored_assets, 0) as latex_authored_assets,
  coalesce(ast.compiled_svg_assets, 0) as compiled_svg_assets,
  coalesce(ast.latex_visuals_ready, 0) as latex_visuals_ready,
  coalesce(ast.unresolved_visual_assets, 0) as unresolved_visual_assets,
  coalesce(qs.approved_leaves, 0) as approved_leaves,
  coalesce(qs.needs_review_leaves, 0) as needs_review_leaves,
  qp.storage_path,
  qp.sha256
from qp
left join question_stats qs on qs.source_paper_id = qp.id
left join block_stats bs on bs.source_paper_id = qp.id
left join asset_stats ast on ast.source_paper_id = qp.id
order by qp.year, qp.series, qp.component, qp.variant;
