-- 9618 LaTeX conversion coverage, paper by paper.
--
-- Read-only. The original QP/MS rows remain the source of truth.
--
-- Important: a source paper can be a verified exact-content equivalent of a
-- canonical content owner. Such a source row intentionally has no duplicated
-- question tree. Coverage therefore follows source_paper_equivalences instead
-- of treating every zero-question source row as missing work.

with qp as (
  select
    sp.id,
    sp.syllabus_id,
    sp.component_id,
    sp.year,
    sp.series,
    sp.variant,
    sp.storage_path,
    sp.source_url,
    sp.sha256,
    sp.page_count,
    c.number as component,
    s.code as syllabus_code,
    eq.canonical_source_paper_id,
    eq.equivalence_kind,
    coalesce(eq.canonical_source_paper_id, sp.id) as effective_qp_id,
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
  left join source_paper_equivalences eq
    on eq.source_paper_id = sp.id
   and eq.equivalence_kind = 'exact_content'
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
    count(*) filter (
      where q.marks is not null
        and q.content_json is not null
        and q.content_version = 1
    )::int as structured_v1_leaves,
    count(*) filter (where q.marks is not null and q.status = 'approved')::int as approved_leaves,
    count(*) filter (where q.marks is not null and q.status = 'needs_review')::int as needs_review_leaves,
    count(*) filter (
      where q.marks is not null
        and q.body_format = 'latex'
        and coalesce(q.stem_latex, '') ~*
          '(source[- ]backed visual|accompanying (tables?|pseudocode block|8-bit register|asset|diagram|monospaced output))'
        and concat_ws(
          E'\n',
          coalesce(q.stem_md, ''),
          coalesce(q.context_md, ''),
          coalesce(q.content_json::text, '')
        ) !~*
          '(source[- ]backed visual|accompanying (tables?|pseudocode block|8-bit register|asset|diagram|monospaced output))'
    )::int as latex_source_wording_review_leaves
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
),
rollout as (
  select
    qp.*,
    coalesce(local_qs.question_nodes, 0) as local_question_nodes,
    coalesce(qs.question_nodes, 0) as effective_question_nodes,
    coalesce(qs.leaf_questions, 0) as leaf_questions,
    coalesce(qs.leaves_with_stem_latex, 0) as leaves_with_stem_latex,
    coalesce(qs.latex_body_leaves, 0) as latex_body_leaves,
    coalesce(qs.nodes_with_context_latex, 0) as nodes_with_context_latex,
    coalesce(qs.structured_leaves, 0) as structured_leaves,
    coalesce(qs.structured_v1_leaves, 0) as structured_v1_leaves,
    coalesce(qs.approved_leaves, 0) as approved_leaves,
    coalesce(qs.needs_review_leaves, 0) as needs_review_leaves,
    coalesce(qs.latex_source_wording_review_leaves, 0) as latex_source_wording_review_leaves,
    coalesce(bs.math_blocks, 0) as math_blocks,
    coalesce(bs.latex_math_blocks, 0) as latex_math_blocks,
    coalesce(bs.structured_table_blocks, 0) as structured_table_blocks,
    coalesce(bs.structured_asset_blocks, 0) as structured_asset_blocks,
    coalesce(ast.assets, 0) as assets,
    coalesce(ast.visual_assets, 0) as visual_assets,
    coalesce(ast.latex_authored_assets, 0) as latex_authored_assets,
    coalesce(ast.compiled_svg_assets, 0) as compiled_svg_assets,
    coalesce(ast.latex_visuals_ready, 0) as latex_visuals_ready,
    coalesce(ast.unresolved_visual_assets, 0) as unresolved_visual_assets
  from qp
  left join question_stats local_qs on local_qs.source_paper_id = qp.id
  left join question_stats qs on qs.source_paper_id = qp.effective_qp_id
  left join block_stats bs on bs.source_paper_id = qp.effective_qp_id
  left join asset_stats ast on ast.source_paper_id = qp.effective_qp_id
)
select
  year,
  series::text as series,
  component,
  variant,
  case
    when variant not between 1 and 3 then 'legacy_or_noncanonical'
    when canonical_source_paper_id is not null then 'exact_equivalent'
    else 'content_owner'
  end as source_class,
  equivalence_kind,
  effective_qp_id as effective_source_paper_id,
  has_mark_scheme,
  page_count,
  local_question_nodes,
  effective_question_nodes,
  leaf_questions,
  leaves_with_stem_latex,
  latex_body_leaves,
  nodes_with_context_latex,
  structured_leaves,
  structured_v1_leaves,
  math_blocks,
  latex_math_blocks,
  structured_table_blocks,
  structured_asset_blocks,
  assets,
  visual_assets,
  latex_authored_assets,
  compiled_svg_assets,
  latex_visuals_ready,
  unresolved_visual_assets,
  approved_leaves,
  needs_review_leaves,
  latex_source_wording_review_leaves,
  case
    when variant not between 1 and 3 then 'LEGACY_NONCANONICAL'
    when sha256 is null or not has_mark_scheme then 'SOURCE_INCOMPLETE'
    when leaf_questions = 0 then 'QUESTION_TREE_MISSING'
    when latex_body_leaves = 0 then 'LATEX_NOT_STARTED'
    when latex_body_leaves < leaf_questions
      or leaves_with_stem_latex < leaf_questions then 'LATEX_IN_PROGRESS'
    when structured_v1_leaves < leaf_questions then 'STRUCTURED_CONTENT_INCOMPLETE'
    when unresolved_visual_assets > 0 then 'VISUALS_UNRESOLVED'
    when latex_source_wording_review_leaves > 0 then 'SOURCE_WORDING_REVIEW'
    when approved_leaves < leaf_questions
      or needs_review_leaves > 0 then 'REVIEW_PENDING'
    when canonical_source_paper_id is not null then 'EXACT_EQUIVALENT_READY_CANDIDATE'
    else 'LATEX_READY_CANDIDATE'
  end as rollout_state,
  storage_path,
  source_url,
  sha256
from rollout
order by year, series, component, variant;
