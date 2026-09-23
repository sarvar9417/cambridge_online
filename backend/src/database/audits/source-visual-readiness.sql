-- Cambridge source visual readiness audit
-- Read-only. Safe to run against production.
--
-- Source-faithful student delivery accepts only:
--   1) storage-backed source asset
--   2) complete SVG in content_md
--   3) complete SVG in svg_markup
--
-- SVG may legally start with an XML declaration. latex_source is recoverable
-- provenance, not by itself a browser-ready visual.
--
-- IMPORTANT: question_assets is an append/repair history. Stale unreferenced
-- visual rows are inventory debt, but they do not make a canonical structured
-- question incomplete. Student-impact checks therefore follow content_json
-- asset references instead of counting every historical asset row.

-- 1) Full visual-asset inventory.
with visual_assets as (
  select
    qa.id asset_id,
    qa.question_id,
    q.display_ref,
    q.status::text question_status,
    qa.kind::text kind,
    qa.storage_path,
    qa.content_md,
    qa.svg_markup,
    qa.latex_source,
    qa.source_page,
    qa.source_bbox,
    qa.crop_status,
    qa.crop_error,
    q.source_paper_id,
    sp.storage_path paper_storage_path,
    sp.source_url,
    sp.page_count,
    case
      when nullif(btrim(coalesce(qa.storage_path,'')),'') is not null then 'storage_backed'
      when coalesce(qa.content_md,'') ~* '^\s*(<\?xml[^>]*>\s*)?<svg(?:\s|>)' then 'content_svg'
      when coalesce(qa.svg_markup,'') ~* '^\s*(<\?xml[^>]*>\s*)?<svg(?:\s|>)' then 'svg_markup'
      when nullif(btrim(coalesce(qa.latex_source,'')),'') is not null
        and nullif(btrim(coalesce(sp.storage_path,'')),'') is not null
        and qa.source_page is not null then 'recoverable_from_latex'
      when nullif(btrim(coalesce(sp.storage_path,'')),'') is not null
        and qa.source_page is not null then 'source_crop_needed'
      else 'manual_review'
    end readiness
  from question_assets qa
  join questions q on q.id=qa.question_id
  left join source_papers sp on sp.id=q.source_paper_id
  where qa.kind in ('diagram','image')
)
select
  readiness,
  count(*) asset_count,
  count(distinct question_id) owner_question_count,
  count(distinct source_paper_id) source_paper_count
from visual_assets
group by readiness
order by case readiness
  when 'storage_backed' then 1
  when 'content_svg' then 2
  when 'svg_markup' then 3
  when 'recoverable_from_latex' then 4
  when 'source_crop_needed' then 5
  else 6
end;

-- 2) Canonical structured-content delivery gate.
-- This is the metric that answers: "Can an approved student-facing question
-- render every visual it explicitly references?"
with referenced as (
  select
    q.id question_id,
    q.display_ref,
    q.status::text question_status,
    q.source_paper_id,
    block->>'assetId' asset_id,
    block->>'kind' structured_kind
  from questions q
  cross join lateral jsonb_array_elements(coalesce(q.content_json->'blocks','[]'::jsonb)) block
  where q.content_version=1
    and block->>'type'='asset'
    and block->>'kind' in ('diagram','image','flowchart','logic_circuit')
), resolved as (
  select
    r.*,
    qa.id resolved_asset_id,
    qa.kind::text db_kind,
    qa.storage_path,
    qa.content_md,
    qa.svg_markup,
    qa.latex_source,
    qa.source_page,
    qa.source_bbox,
    qa.crop_status,
    qa.crop_error,
    sp.storage_path paper_storage_path,
    sp.source_url
  from referenced r
  left join question_assets qa on qa.id::text=r.asset_id
  left join source_papers sp on sp.id=r.source_paper_id
)
select
  count(*) referenced_visual_blocks,
  count(*) filter(where question_status='approved') approved_referenced_visual_blocks,
  count(*) filter(where resolved_asset_id is null) missing_asset_rows,
  count(*) filter(
    where resolved_asset_id is not null
      and nullif(btrim(coalesce(storage_path,'')),'') is null
      and not(coalesce(content_md,'') ~* '^\s*(<\?xml[^>]*>\s*)?<svg(?:\s|>)')
      and not(coalesce(svg_markup,'') ~* '^\s*(<\?xml[^>]*>\s*)?<svg(?:\s|>)')
  ) unresolved_referenced_visuals,
  count(*) filter(
    where question_status='approved'
      and resolved_asset_id is not null
      and nullif(btrim(coalesce(storage_path,'')),'') is null
      and not(coalesce(content_md,'') ~* '^\s*(<\?xml[^>]*>\s*)?<svg(?:\s|>)')
      and not(coalesce(svg_markup,'') ~* '^\s*(<\?xml[^>]*>\s*)?<svg(?:\s|>)')
  ) unresolved_approved_referenced_visuals
from resolved;

-- 3) Detailed canonical unresolved queue.
with referenced as (
  select
    q.id question_id,
    q.display_ref,
    q.status::text question_status,
    q.source_paper_id,
    block->>'assetId' asset_id,
    block->>'kind' structured_kind
  from questions q
  cross join lateral jsonb_array_elements(coalesce(q.content_json->'blocks','[]'::jsonb)) block
  where q.content_version=1
    and block->>'type'='asset'
    and block->>'kind' in ('diagram','image','flowchart','logic_circuit')
)
select
  r.display_ref,
  r.question_status,
  r.asset_id,
  r.structured_kind,
  qa.kind::text db_kind,
  qa.source_page,
  qa.source_bbox,
  qa.crop_status,
  qa.crop_error,
  nullif(btrim(coalesce(qa.latex_source,'')),'') is not null has_latex_source,
  sp.storage_path paper_storage_path,
  sp.source_url
from referenced r
left join question_assets qa on qa.id::text=r.asset_id
left join source_papers sp on sp.id=r.source_paper_id
where qa.id is null
   or (
     nullif(btrim(coalesce(qa.storage_path,'')),'') is null
     and not(coalesce(qa.content_md,'') ~* '^\s*(<\?xml[^>]*>\s*)?<svg(?:\s|>)')
     and not(coalesce(qa.svg_markup,'') ~* '^\s*(<\?xml[^>]*>\s*)?<svg(?:\s|>)')
   )
order by r.question_status,r.display_ref,r.asset_id;

-- 4) Historical/orphan visual rows that are not browser-ready and are not
-- referenced by their owner's canonical structured content. These are cleanup
-- candidates, not student-delivery blockers.
with orphan_unready as (
  select
    qa.id asset_id,
    q.display_ref owner_display_ref,
    q.status::text owner_status,
    qa.kind::text kind,
    qa.source_page,
    qa.crop_status,
    nullif(btrim(coalesce(qa.latex_source,'')),'') is not null has_latex_source,
    sp.source_url
  from question_assets qa
  join questions q on q.id=qa.question_id
  left join source_papers sp on sp.id=q.source_paper_id
  where qa.kind in ('diagram','image')
    and nullif(btrim(coalesce(qa.storage_path,'')),'') is null
    and not(coalesce(qa.content_md,'') ~* '^\s*(<\?xml[^>]*>\s*)?<svg(?:\s|>)')
    and not(coalesce(qa.svg_markup,'') ~* '^\s*(<\?xml[^>]*>\s*)?<svg(?:\s|>)')
    and not exists (
      select 1
      from jsonb_array_elements(coalesce(q.content_json->'blocks','[]'::jsonb)) block
      where block->>'type'='asset' and block->>'assetId'=qa.id::text
    )
)
select *
from orphan_unready
order by owner_status,owner_display_ref,asset_id;
