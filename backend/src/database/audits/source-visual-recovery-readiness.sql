-- Source visual recovery readiness audit.
-- Read-only. Safe to run before/after migration 0194.
--
-- Canonical readiness:
--   renderable := storage_path OR complete inline SVG in content_md OR complete SVG in svg_markup
--   unresolved := kind diagram/image AND not renderable
--
-- This audit intentionally does not count prose placeholders as visuals.

\echo '1) Visual asset readiness by question status'
select
  q.status::text as question_status,
  count(*) filter (
    where qa.kind::text in ('diagram','image')
  ) as visual_assets,
  count(*) filter (
    where qa.kind::text in ('diagram','image')
      and (
        nullif(btrim(coalesce(qa.storage_path,'')),'') is not null
        or coalesce(qa.content_md,'') ~* '^[[:space:]]*(<[?]xml[^>]*[?]>[[:space:]]*)?<svg([[:space:]]|>)'
        or coalesce(qa.content_md,'') ~* '^[[:space:]]*`{3}(svg|xml)[[:space:]]*(<[?]xml[^>]*[?]>[[:space:]]*)?<svg([[:space:]]|>)'
        or coalesce(qa.svg_markup,'') ~* '^[[:space:]]*(<[?]xml[^>]*[?]>[[:space:]]*)?<svg([[:space:]]|>)'
      )
  ) as renderable_visual_assets,
  count(*) filter (
    where qa.kind::text in ('diagram','image')
      and not (
        nullif(btrim(coalesce(qa.storage_path,'')),'') is not null
        or coalesce(qa.content_md,'') ~* '^[[:space:]]*(<[?]xml[^>]*[?]>[[:space:]]*)?<svg([[:space:]]|>)'
        or coalesce(qa.content_md,'') ~* '^[[:space:]]*`{3}(svg|xml)[[:space:]]*(<[?]xml[^>]*[?]>[[:space:]]*)?<svg([[:space:]]|>)'
        or coalesce(qa.svg_markup,'') ~* '^[[:space:]]*(<[?]xml[^>]*[?]>[[:space:]]*)?<svg([[:space:]]|>)'
      )
  ) as unresolved_visual_assets
from question_assets qa
join questions q on q.id=qa.question_id
where qa.kind::text in ('diagram','image')
group by q.status::text
order by q.status::text;

\echo '2) Exact unresolved asset inventory'
select
  qa.id as asset_id,
  q.id as question_id,
  q.display_ref,
  q.status::text as question_status,
  qa.kind::text as asset_kind,
  qa.source_page,
  qa.alt_text,
  qa.crop_status,
  qa.crop_error,
  sp.storage_path as source_paper_storage_path,
  sp.source_url,
  sp.sha256 as source_paper_sha256
from question_assets qa
join questions q on q.id=qa.question_id
join source_papers sp on sp.id=q.source_paper_id
where qa.kind::text in ('diagram','image')
  and not (
    nullif(btrim(coalesce(qa.storage_path,'')),'') is not null
    or coalesce(qa.content_md,'') ~* '^[[:space:]]*(<[?]xml[^>]*[?]>[[:space:]]*)?<svg([[:space:]]|>)'
    or coalesce(qa.content_md,'') ~* '^[[:space:]]*`{3}(svg|xml)[[:space:]]*(<[?]xml[^>]*[?]>[[:space:]]*)?<svg([[:space:]]|>)'
    or coalesce(qa.svg_markup,'') ~* '^[[:space:]]*(<[?]xml[^>]*[?]>[[:space:]]*)?<svg([[:space:]]|>)'
  )
order by
  case q.status::text when 'approved' then 0 else 1 end,
  q.display_ref,
  qa.sort_order,
  qa.id;

\echo '3) Approved graded leaves whose ancestry still contains an unresolved visual'
with recursive approved_leaf as (
  select q.id as leaf_id,q.id as node_id,q.parent_id
  from questions q
  where q.status='approved' and q.marks is not null
), chain as (
  select * from approved_leaf
  union all
  select c.leaf_id,p.id,p.parent_id
  from chain c
  join questions p on p.id=c.parent_id
), unresolved as (
  select distinct c.leaf_id,qa.id as asset_id,owner.display_ref as asset_owner_ref
  from chain c
  join question_assets qa on qa.question_id=c.node_id
  join questions owner on owner.id=qa.question_id
  where qa.kind::text in ('diagram','image')
    and not (
      nullif(btrim(coalesce(qa.storage_path,'')),'') is not null
      or coalesce(qa.content_md,'') ~* '^[[:space:]]*(<[?]xml[^>]*[?]>[[:space:]]*)?<svg([[:space:]]|>)'
      or coalesce(qa.content_md,'') ~* '^[[:space:]]*`{3}(svg|xml)[[:space:]]*(<[?]xml[^>]*[?]>[[:space:]]*)?<svg([[:space:]]|>)'
      or coalesce(qa.svg_markup,'') ~* '^[[:space:]]*(<[?]xml[^>]*[?]>[[:space:]]*)?<svg([[:space:]]|>)'
    )
)
select leaf.display_ref as learner_question_ref,u.asset_id,u.asset_owner_ref
from unresolved u
join questions leaf on leaf.id=u.leaf_id
order by leaf.display_ref,u.asset_id;

\echo '4) Approved structured content that explicitly references an unresolved visual asset'
with referenced as (
  select
    q.id as leaf_id,
    q.display_ref as leaf_ref,
    block->>'assetId' as asset_id
  from questions q
  cross join lateral jsonb_array_elements(coalesce(q.content_json->'blocks','[]'::jsonb)) block
  where q.status='approved'
    and q.marks is not null
    and block->>'type'='asset'
), unresolved as (
  select qa.id
  from question_assets qa
  where qa.kind::text in ('diagram','image')
    and not (
      nullif(btrim(coalesce(qa.storage_path,'')),'') is not null
      or coalesce(qa.content_md,'') ~* '^[[:space:]]*(<[?]xml[^>]*[?]>[[:space:]]*)?<svg([[:space:]]|>)'
      or coalesce(qa.content_md,'') ~* '^[[:space:]]*`{3}(svg|xml)[[:space:]]*(<[?]xml[^>]*[?]>[[:space:]]*)?<svg([[:space:]]|>)'
      or coalesce(qa.svg_markup,'') ~* '^[[:space:]]*(<[?]xml[^>]*[?]>[[:space:]]*)?<svg([[:space:]]|>)'
    )
)
select r.leaf_ref,r.asset_id
from referenced r
join unresolved u on u.id::text=r.asset_id
order by r.leaf_ref,r.asset_id;

\echo '5) Release gate: approved unresolved visual count must be zero after 0194'
select count(*) as approved_unresolved_visual_assets
from question_assets qa
join questions q on q.id=qa.question_id
where q.status='approved'
  and qa.kind::text in ('diagram','image')
  and not (
    nullif(btrim(coalesce(qa.storage_path,'')),'') is not null
    or coalesce(qa.content_md,'') ~* '^[[:space:]]*(<[?]xml[^>]*[?]>[[:space:]]*)?<svg([[:space:]]|>)'
    or coalesce(qa.content_md,'') ~* '^[[:space:]]*`{3}(svg|xml)[[:space:]]*(<[?]xml[^>]*[?]>[[:space:]]*)?<svg([[:space:]]|>)'
    or coalesce(qa.svg_markup,'') ~* '^[[:space:]]*(<[?]xml[^>]*[?]>[[:space:]]*)?<svg([[:space:]]|>)'
  );
