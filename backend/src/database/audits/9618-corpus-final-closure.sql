-- Cambridge 9618 final corpus closure audit.
--
-- Read-only. This is the canonical per-paper closure report for the final
-- 2021-2026 past-paper corpus recovery programme.
--
-- Source truth remains the original Cambridge QP/MS. Verified exact-content
-- source variants are evaluated through their canonical content owner while
-- retaining their own source-paper and occurrence provenance.
--
-- Important design decisions:
--   * variant 0 / other non-canonical legacy rows are excluded;
--   * canonical mark-scheme integrity is tested through canonical_mark_schemes;
--   * MS source verification requires an audit against the selected MS current
--     source row and current SHA, not merely the latest historical audit row;
--   * only structured asset references used by question content are release
--     blockers. Historical orphan asset rows are audited separately;
--   * low taxonomy confidence is a review gate, never auto-promoted.
--
-- Final closure baseline (2026-09-20):
--   2021: 22/22 READY
--   2022: 24/24 READY
--   2023: 24/24 READY
--   2024: 24/24 READY
--   2025: 24/24 READY
--   2026 M/J: 12/12 READY
--   Total official QP occurrences: 130/130 READY
--   Unique approved scoring leaves: 2773
--   Low-confidence primary subtopic mappings: 0
--   Low-confidence LO mappings: 0
--
-- Source-equivalence note:
--   109 papers own physical canonical question trees; 21 verified exact-content
--   variants are represented through source occurrences against a canonical owner.
--   The legacy 2026 M/J component-1 variant=0 row is intentionally excluded.

with qp as (
  select
    sp.id as source_paper_id,
    sp.syllabus_id,
    sp.component_id,
    sp.year,
    sp.series,
    sp.variant,
    sp.sha256,
    sp.page_count,
    sp.source_url,
    c.number as component,
    c.total_marks,
    coalesce(eq.canonical_source_paper_id,sp.id) as effective_source_paper_id,
    case
      when eq.source_paper_id is null then 'content_owner'
      else 'exact_equivalent'
    end as source_class,
    (
      select ms.id
      from source_papers ms
      where ms.kind='MS'
        and ms.syllabus_id=sp.syllabus_id
        and ms.component_id=sp.component_id
        and ms.year=sp.year
        and ms.series=sp.series
        and ms.variant=sp.variant
      order by ms.created_at,ms.id
      limit 1
    ) as ms_source_paper_id
  from source_papers sp
  join syllabi sy on sy.id=sp.syllabus_id and sy.code='9618'
  join components c on c.id=sp.component_id
  left join source_paper_equivalences eq
    on eq.source_paper_id=sp.id
   and eq.equivalence_kind='exact_content'
  where sp.kind='QP'
    and sp.year between 2021 and 2026
    and sp.variant between 1 and 3
),
question_health as (
  select
    qp.source_paper_id,
    count(q.id) filter (where q.marks is not null)::int as leaves,
    coalesce(sum(q.marks) filter (where q.marks is not null),0)::int as qp_marks,
    count(q.id) filter (
      where q.marks is not null and q.status='approved'
    )::int as approved,
    count(q.id) filter (
      where q.marks is not null
        and q.body_format='latex'
        and nullif(btrim(coalesce(q.stem_latex,'')),'') is not null
    )::int as latex_ready,
    count(q.id) filter (
      where q.marks is not null
        and q.content_json is not null
        and q.content_version=1
    )::int as structured_ready,
    count(q.id) filter (
      where q.marks is not null
        and (
          select count(*)
          from question_subtopics x
          where x.question_id=q.id and x.is_primary
        )=1
    )::int as primary_mapped,
    count(q.id) filter (
      where q.marks is not null
        and exists (
          select 1
          from question_subtopics x
          where x.question_id=q.id
            and x.is_primary
            and coalesce(x.confidence,0)<0.95
        )
    )::int as low_subtopic,
    count(q.id) filter (
      where q.marks is not null
        and exists (
          select 1
          from question_learning_objectives x
          where x.question_id=q.id
        )
    )::int as lo_mapped,
    count(q.id) filter (
      where q.marks is not null
        and exists (
          select 1
          from question_learning_objectives x
          where x.question_id=q.id
            and coalesce(x.confidence,0)<0.95
        )
    )::int as low_lo
  from qp
  left join questions q on q.source_paper_id=qp.effective_source_paper_id
  group by qp.source_paper_id
),
mark_scheme_health as (
  select
    qp.source_paper_id,
    count(q.id) filter (where q.marks is not null)::int as leaves,
    count(q.id) filter (
      where q.marks is not null
        and cms.id is not null
        and cms.status='approved'
        and cms.max_marks=q.marks
    )::int as canonical_ms_ok,
    count(q.id) filter (
      where q.marks is not null
        and cms.id is not null
        and exists (
          select 1
          from mark_scheme_points p
          where p.mark_scheme_id=cms.id
        )
    )::int as ms_with_points,
    count(q.id) filter (
      where q.marks is not null
        and cms.id is not null
        and exists (
          select 1
          from mark_scheme_source_audits a
          join source_papers src on src.id=cms.source_paper_id
          where a.mark_scheme_id=cms.id
            and a.source_paper_id=cms.source_paper_id
            and a.source_sha256=src.sha256
            and a.result='verified'
        )
    )::int as ms_source_verified
  from qp
  left join questions q on q.source_paper_id=qp.effective_source_paper_id
  left join canonical_mark_schemes cms on cms.question_id=q.id
  group by qp.source_paper_id
),
asset_refs as (
  select
    qp.source_paper_id,
    q.id as question_id,
    case
      when b.block->>'assetId' ~* '^[0-9a-f-]{36}$'
        then (b.block->>'assetId')::uuid
      else null
    end as asset_id
  from qp
  join questions q
    on q.source_paper_id=qp.effective_source_paper_id
   and q.marks is not null
  cross join lateral jsonb_array_elements(
    case
      when jsonb_typeof(q.content_json->'blocks')='array'
        then q.content_json->'blocks'
      else '[]'::jsonb
    end
  ) b(block)
  where b.block->>'type'='asset'
),
asset_health as (
  select
    ar.source_paper_id,
    count(*)::int as refs,
    count(*) filter (where qa.id is null)::int as missing,
    count(*) filter (
      where qa.id is not null
        and nullif(btrim(coalesce(qa.svg_markup,qa.content_md,'')),'') is null
        and nullif(btrim(coalesce(qa.storage_path,'')),'') is null
    )::int as unrenderable
  from asset_refs ar
  left join question_assets qa on qa.id=ar.asset_id
  group by ar.source_paper_id
),
dependency_health as (
  select
    qp.source_paper_id,
    count(*)::int as dependencies,
    count(*) filter (where target.id is null)::int as missing_targets,
    count(*) filter (
      where d.strength='required'
        and (
          target.id is null
          or target.status::text not in ('approved','needs_review')
        )
    )::int as required_unavailable
  from qp
  join questions q
    on q.source_paper_id=qp.effective_source_paper_id
   and q.marks is not null
  join question_dependencies d on d.question_id=q.id
  left join questions target on target.id=d.depends_on_id
  group by qp.source_paper_id
),
occurrence_health as (
  select
    qp.source_paper_id,
    count(distinct o.question_id)::int as occurrence_leaves
  from qp
  join questions q
    on q.source_paper_id=qp.effective_source_paper_id
   and q.marks is not null
  join question_source_occurrences o
    on o.question_id=q.id
   and o.source_paper_id=qp.source_paper_id
  group by qp.source_paper_id
),
per_paper as (
  select
    qp.year,
    qp.series::text as series,
    qp.component,
    qp.variant,
    qp.source_class,
    qp.source_paper_id,
    qp.effective_source_paper_id,
    qp.total_marks,
    qp.page_count as qp_page_count,
    qp.sha256 as qp_sha256,
    qp.source_url as qp_source_url,
    ms.page_count as ms_page_count,
    ms.sha256 as ms_sha256,
    ms.source_url as ms_source_url,
    coalesce(qh.leaves,0) as leaves,
    coalesce(qh.qp_marks,0) as qp_marks,
    coalesce(qh.approved,0) as approved,
    coalesce(qh.latex_ready,0) as latex_ready,
    coalesce(qh.structured_ready,0) as structured_ready,
    coalesce(qh.primary_mapped,0) as primary_mapped,
    coalesce(qh.low_subtopic,0) as low_subtopic,
    coalesce(qh.lo_mapped,0) as lo_mapped,
    coalesce(qh.low_lo,0) as low_lo,
    coalesce(msh.canonical_ms_ok,0) as canonical_ms_ok,
    coalesce(msh.ms_with_points,0) as ms_with_points,
    coalesce(msh.ms_source_verified,0) as ms_source_verified,
    coalesce(ah.refs,0) as asset_refs,
    coalesce(ah.missing,0) as missing_assets,
    coalesce(ah.unrenderable,0) as unrenderable_assets,
    coalesce(dh.dependencies,0) as dependencies,
    coalesce(dh.missing_targets,0) as missing_dependency_targets,
    coalesce(dh.required_unavailable,0) as required_dependency_unavailable,
    coalesce(oh.occurrence_leaves,0) as occurrence_leaves,
    case
      when qp.sha256 is null
        or qp.page_count is null
        or qp.source_url is null
        then 'QP_SOURCE_METADATA_INCOMPLETE'
      when qp.ms_source_paper_id is null
        then 'MS_SOURCE_MISSING'
      when ms.sha256 is null
        or ms.page_count is null
        or ms.source_url is null
        then 'MS_SOURCE_METADATA_INCOMPLETE'
      when coalesce(qh.leaves,0)=0
        then 'QUESTION_TREE_MISSING'
      when coalesce(qh.qp_marks,0)<>qp.total_marks
        then 'QP_MARK_TOTAL_MISMATCH'
      when coalesce(qh.approved,0)<>coalesce(qh.leaves,0)
        then 'QUESTION_REVIEW_PENDING'
      when coalesce(qh.latex_ready,0)<>coalesce(qh.leaves,0)
        then 'LATEX_INCOMPLETE'
      when coalesce(qh.structured_ready,0)<>coalesce(qh.leaves,0)
        then 'STRUCTURED_CONTENT_INCOMPLETE'
      when coalesce(msh.canonical_ms_ok,0)<>coalesce(qh.leaves,0)
        or coalesce(msh.ms_with_points,0)<>coalesce(qh.leaves,0)
        or coalesce(msh.ms_source_verified,0)<>coalesce(qh.leaves,0)
        then 'MARK_SCHEME_INTEGRITY'
      when coalesce(qh.primary_mapped,0)<>coalesce(qh.leaves,0)
        or coalesce(qh.lo_mapped,0)<>coalesce(qh.leaves,0)
        then 'TAXONOMY_INCOMPLETE'
      when coalesce(qh.low_subtopic,0)>0
        or coalesce(qh.low_lo,0)>0
        then 'TAXONOMY_REVIEW_PENDING'
      when coalesce(ah.missing,0)>0
        or coalesce(ah.unrenderable,0)>0
        then 'ASSET_REFERENCE_BROKEN'
      when coalesce(dh.missing_targets,0)>0
        or coalesce(dh.required_unavailable,0)>0
        then 'DEPENDENCY_BROKEN'
      when coalesce(oh.occurrence_leaves,0)<>coalesce(qh.leaves,0)
        then 'SOURCE_OCCURRENCE_INCOMPLETE'
      else 'READY'
    end as closure_state
  from qp
  left join question_health qh on qh.source_paper_id=qp.source_paper_id
  left join mark_scheme_health msh on msh.source_paper_id=qp.source_paper_id
  left join asset_health ah on ah.source_paper_id=qp.source_paper_id
  left join dependency_health dh on dh.source_paper_id=qp.source_paper_id
  left join occurrence_health oh on oh.source_paper_id=qp.source_paper_id
  left join source_papers ms on ms.id=qp.ms_source_paper_id
)
select *
from per_paper
order by
  year,
  case series when 'MJ' then 1 when 'ON' then 2 else 3 end,
  component,
  variant;
