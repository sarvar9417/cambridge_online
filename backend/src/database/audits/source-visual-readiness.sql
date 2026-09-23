-- Cambridge source visual readiness audit
-- Read-only. Safe to run against production.
--
-- Source-faithful student delivery accepts only:
--   1) storage-backed source asset
--   2) complete SVG in content_md
--   3) complete SVG in svg_markup
--
-- latex_source is intentionally classified as recoverable, not renderable:
-- it must be compiled and verified before student delivery.

with visual_assets as (
  select
    qa.id asset_id,
    qa.question_id,
    q.display_ref,
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
      when coalesce(qa.content_md,'') ~* '^\s*<svg(?:\s|>)' then 'content_svg'
      when coalesce(qa.svg_markup,'') ~* '^\s*<svg(?:\s|>)' then 'svg_markup'
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
  count(distinct question_id) question_count,
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

-- Detailed unresolved queue.
with unresolved as (
  select
    qa.id asset_id,
    q.display_ref,
    qa.kind::text kind,
    qa.source_page,
    qa.source_bbox,
    qa.crop_status,
    qa.crop_error,
    nullif(btrim(coalesce(qa.latex_source,'')),'') is not null has_latex_source,
    sp.storage_path paper_storage_path,
    sp.source_url,
    case
      when nullif(btrim(coalesce(qa.latex_source,'')),'') is not null
        and nullif(btrim(coalesce(sp.storage_path,'')),'') is not null
        and qa.source_page is not null then 'recoverable_from_latex'
      when nullif(btrim(coalesce(sp.storage_path,'')),'') is not null
        and qa.source_page is not null then 'source_crop_needed'
      else 'manual_review'
    end recovery_class
  from question_assets qa
  join questions q on q.id=qa.question_id
  left join source_papers sp on sp.id=q.source_paper_id
  where qa.kind in ('diagram','image')
    and nullif(btrim(coalesce(qa.storage_path,'')),'') is null
    and not (coalesce(qa.content_md,'') ~* '^\s*<svg(?:\s|>)')
    and not (coalesce(qa.svg_markup,'') ~* '^\s*<svg(?:\s|>)')
)
select *
from unresolved
order by recovery_class,display_ref,asset_id;
