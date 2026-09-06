-- Past-paper source fidelity v2 audit
--
-- Detects failure modes that the original visual/structure findings could miss:
--   * prose/ASCII stored under diagram/image kind with no real SVG or source crop;
--   * semantic table assets still referenced as generic image/asset blocks;
--   * canonical asset ids that no longer resolve to question_assets;
--   * legacy/null canonical content in otherwise answerable QP leaves.
--
-- Run read-only against production after every source repair/backfill.
-- Zero is the release target for the unresolved_* columns within the selected
-- syllabus/year range, except rows deliberately recorded as manual-only.

with recursive qp_scope as (
  select
    q.id,
    q.parent_id,
    q.path,
    q.display_ref,
    q.stem_md,
    q.context_md,
    q.content_json,
    q.content_version,
    q.status,
    sp.id as source_paper_id,
    sp.year,
    sp.series::text as series,
    c.number as component,
    sp.variant,
    s.code as syllabus_code
  from questions q
  join source_papers sp on sp.id = q.source_paper_id and sp.kind = 'QP'
  join syllabi s on s.id = sp.syllabus_id
  join components c on c.id = sp.component_id
  where s.code in ('0478','9618')
    and sp.year between 2021 and 2026
    and q.marks is not null
),
asset_scope as (
  select
    q.syllabus_code,q.year,q.series,q.component,q.variant,q.path,q.display_ref,
    q.content_json,
    qa.id as asset_id,
    qa.kind::text as asset_kind,
    qa.alt_text,
    qa.storage_path,
    qa.content_md,
    qa.source_page,
    qa.source_bbox,
    qa.crop_status::text as crop_status,
    (qa.content_md ~* '^\\s*<svg(?:\\s|>)') as has_inline_svg,
    (qa.source_page is not null and qa.source_bbox is not null) as has_source_crop
  from qp_scope q
  join question_assets qa on qa.question_id = q.id
),
canonical_asset_refs as (
  select
    q.id as question_id,
    q.syllabus_code,q.year,q.series,q.component,q.variant,q.path,q.display_ref,
    block.value->>'assetId' as asset_id,
    block.value->>'kind' as canonical_kind
  from qp_scope q
  cross join lateral jsonb_array_elements(coalesce(q.content_json->'blocks','[]'::jsonb)) block(value)
  where block.value->>'type' = 'asset'
),
canonical_tables as (
  select q.id as question_id
  from qp_scope q
  where exists (
    select 1
    from jsonb_array_elements(coalesce(q.content_json->'blocks','[]'::jsonb)) block(value)
    where block.value->>'type' = 'table'
  )
),
findings as (
  -- A text description of a diagram is evidence for repair, not a renderable visual.
  select
    'unresolved_flattened_visual'::text as finding,
    a.syllabus_code,a.year,a.series,a.component,a.variant,a.path,a.display_ref,
    a.asset_id::text as asset_id,
    a.asset_kind as detail
  from asset_scope a
  where a.asset_kind in ('diagram','image')
    and not a.has_inline_svg
    and a.storage_path is null
    and not a.has_source_crop

  union all

  -- A table exists semantically in question_assets but canonical content still
  -- points to it as a generic asset/image instead of a structured table block.
  select
    'unresolved_table_not_structured',
    a.syllabus_code,a.year,a.series,a.component,a.variant,a.path,a.display_ref,
    a.asset_id::text,
    coalesce(a.alt_text,'table')
  from asset_scope a
  join qp_scope q on q.display_ref = a.display_ref
  where a.asset_kind = 'table'
    and a.content_md like '%|%'
    and not exists (select 1 from canonical_tables t where t.question_id = q.id)

  union all

  -- A canonical asset block must resolve to a concrete DB asset row.
  select
    'unresolved_canonical_asset_reference',
    r.syllabus_code,r.year,r.series,r.component,r.variant,r.path,r.display_ref,
    r.asset_id,
    coalesce(r.canonical_kind,'asset')
  from canonical_asset_refs r
  left join question_assets qa on qa.id::text = r.asset_id
  where qa.id is null

  union all

  select
    'unresolved_legacy_content',
    q.syllabus_code,q.year,q.series,q.component,q.variant,q.path,q.display_ref,
    null::text,
    coalesce(q.status::text,'')
  from qp_scope q
  where q.content_json is null or q.content_version is distinct from 1
),
summary as (
  select
    syllabus_code,
    finding,
    count(*)::int as count
  from findings
  group by syllabus_code,finding
)
select jsonb_build_object(
  'summary', coalesce((
    select jsonb_agg(to_jsonb(summary) order by syllabus_code,finding)
    from summary
  ), '[]'::jsonb),
  'examples', coalesce((
    select jsonb_agg(to_jsonb(x) order by syllabus_code,year,series,component,variant,path,finding)
    from (
      select *
      from findings
      order by syllabus_code,year,series,component,variant,path,finding
      limit 250
    ) x
  ), '[]'::jsonb)
) as past_paper_source_fidelity_v2;
