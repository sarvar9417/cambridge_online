-- 9618 2023 strict corpus closure audit.
--
-- This audit is intentionally stricter than the 2021/2022 closure checks.
-- It prevents a paper from being marked READY while OCR-hostile source visuals
-- remain only as generic image crops. Reproducible tables, diagrams, code and
-- pseudocode must have reviewed LaTeX authoring source and a compiled SVG.
-- A source image may remain raster only when it has been explicitly reviewed as
-- irreducible and marked crop_status = 'source_image_required'.
--
-- It also blocks visual duplication where stem_latex embeds a table/array/TikZ
-- while content_json separately references an asset for the same leaf.

with params as (
  select '9618'::text as syllabus_code, 2023::int as audit_year
),
qp as (
  select
    sp.id,
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
    coalesce(eq.canonical_source_paper_id, sp.id) as effective_source_paper_id,
    case when eq.source_paper_id is null then 'content_owner' else 'exact_equivalent' end as source_class,
    eq.equivalence_kind,
    exists (
      select 1
      from source_papers ms
      where ms.syllabus_id = sp.syllabus_id
        and ms.component_id = sp.component_id
        and ms.year = sp.year
        and ms.series = sp.series
        and ms.variant = sp.variant
        and ms.kind = 'MS'
    ) as has_mark_scheme_source,
    exists (
      select 1
      from source_papers ms
      where ms.syllabus_id = sp.syllabus_id
        and ms.component_id = sp.component_id
        and ms.year = sp.year
        and ms.series = sp.series
        and ms.variant = sp.variant
        and ms.kind = 'MS'
        and nullif(btrim(coalesce(ms.sha256,'')),'') is not null
        and ms.page_count is not null
        and nullif(btrim(coalesce(ms.source_url,'')),'') is not null
    ) as mark_scheme_source_metadata_complete
  from source_papers sp
  join syllabi s on s.id = sp.syllabus_id
  join components c on c.id = sp.component_id
  join params p on p.syllabus_code = s.code and p.audit_year = sp.year
  left join source_paper_equivalences eq
    on eq.source_paper_id = sp.id
   and eq.equivalence_kind = 'exact_content'
  where sp.kind = 'QP'
    and sp.series in ('MJ','ON')
    and sp.variant between 1 and 3
),
question_stats as (
  select
    qp.id,
    count(q.id) filter (where q.marks is not null)::int as leaves,
    coalesce(sum(q.marks) filter (where q.marks is not null),0)::int as qp_marks,
    count(q.id) filter (where q.marks is not null and q.status='approved')::int as approved_leaves,
    count(q.id) filter (where q.marks is not null and q.content_version=1 and q.content_json is not null)::int as structured_v1_leaves,
    count(q.id) filter (
      where q.marks is not null
        and nullif(btrim(coalesce(q.stem_latex,'')),'') is not null
        and q.body_format='latex'
    )::int as latex_ready_leaves,
    count(q.id) filter (
      where q.marks is not null
        and (select count(*) from question_subtopics qs where qs.question_id=q.id and qs.is_primary)=1
    )::int as primary_subtopic_leaves,
    count(q.id) filter (
      where q.marks is not null
        and exists (select 1 from question_learning_objectives qlo where qlo.question_id=q.id)
    )::int as lo_mapped_leaves,
    count(q.id) filter (
      where q.marks is not null
        and exists (select 1 from question_subtopics qs where qs.question_id=q.id and qs.is_primary and coalesce(qs.confidence,0)<0.95)
    )::int as low_confidence_primary_subtopics,
    count(q.id) filter (
      where q.marks is not null
        and exists (select 1 from question_learning_objectives qlo where qlo.question_id=q.id and coalesce(qlo.confidence,0)<0.95)
    )::int as low_confidence_los,
    count(q.id) filter (
      where q.marks is not null
        and q.content_json->'source'->>'paperId'=qp.effective_source_paper_id::text
        and q.content_json->'source'->>'sha256'=(select sha256 from source_papers where id=qp.effective_source_paper_id)
    )::int as source_pinned_leaves,
    count(q.id) filter (
      where q.marks is not null
        and coalesce(q.stem_latex,'') ~* '(accompanying|source-backed|provided as|shown in the accompanying)'
    )::int as bridge_wording_leaves,
    count(q.id) filter (
      where q.marks is not null
        and q.content_json @> '{"blocks":[{"type":"asset"}]}'::jsonb
        and coalesce(q.stem_latex,'') ~* '\\begin\{(array|tabular|tikzpicture)\}'
    )::int as embedded_visual_duplication_leaves
  from qp
  left join questions q on q.source_paper_id=qp.effective_source_paper_id
  group by qp.id,qp.effective_source_paper_id
),
mark_scheme_stats as (
  select
    qp.id,
    count(ms.id) filter (where q.marks is not null and ms.status='approved')::int as approved_schemes,
    count(ms.id) filter (where q.marks is not null and ms.status<>'approved')::int as nonapproved_schemes,
    coalesce(sum(ms.max_marks) filter (where q.marks is not null and ms.status='approved'),0)::int as ms_marks
  from qp
  left join questions q on q.source_paper_id=qp.effective_source_paper_id
  left join mark_schemes ms on ms.question_id=q.id
  group by qp.id
),
asset_stats as (
  select
    qp.id,
    count(qa.id)::int as assets,
    count(qa.id) filter (where qa.kind in ('table','diagram','pseudocode','code'))::int as reproducible_assets,
    count(qa.id) filter (
      where qa.kind in ('table','diagram','pseudocode','code')
        and nullif(btrim(coalesce(qa.latex_source,'')),'') is null
    )::int as reproducible_assets_missing_latex,
    count(qa.id) filter (
      where qa.kind in ('table','diagram','pseudocode','code')
        and nullif(btrim(coalesce(qa.svg_markup,'')),'') is null
    )::int as reproducible_assets_missing_svg,
    count(qa.id) filter (where qa.kind='image')::int as source_image_assets,
    count(qa.id) filter (
      where qa.kind='image'
        and coalesce(qa.crop_status,'') <> 'source_image_required'
    )::int as unreviewed_source_image_assets,
    count(qa.id) filter (where qa.source_page is null)::int as assets_missing_source_page,
    count(qa.id) filter (where qa.crop_error is not null)::int as crop_errors
  from qp
  left join questions q on q.source_paper_id=qp.effective_source_paper_id
  left join question_assets qa on qa.question_id=q.id
  group by qp.id
),
per_paper as (
  select
    qp.series::text as series,
    qp.component,
    qp.variant,
    qp.source_class,
    qp.page_count,
    qp.total_marks,
    qp.has_mark_scheme_source,
    qp.mark_scheme_source_metadata_complete,
    coalesce(qs.leaves,0) as leaves,
    coalesce(qs.qp_marks,0) as qp_marks,
    coalesce(ms.approved_schemes,0) as approved_schemes,
    coalesce(ms.nonapproved_schemes,0) as nonapproved_schemes,
    coalesce(ms.ms_marks,0) as ms_marks,
    coalesce(qs.approved_leaves,0) as approved_leaves,
    coalesce(qs.structured_v1_leaves,0) as structured_v1_leaves,
    coalesce(qs.latex_ready_leaves,0) as latex_ready_leaves,
    coalesce(qs.primary_subtopic_leaves,0) as primary_subtopic_leaves,
    coalesce(qs.lo_mapped_leaves,0) as lo_mapped_leaves,
    coalesce(qs.low_confidence_primary_subtopics,0) as low_confidence_primary_subtopics,
    coalesce(qs.low_confidence_los,0) as low_confidence_los,
    coalesce(qs.source_pinned_leaves,0) as source_pinned_leaves,
    coalesce(qs.bridge_wording_leaves,0) as bridge_wording_leaves,
    coalesce(qs.embedded_visual_duplication_leaves,0) as embedded_visual_duplication_leaves,
    coalesce(ast.assets,0) as assets,
    coalesce(ast.reproducible_assets,0) as reproducible_assets,
    coalesce(ast.reproducible_assets_missing_latex,0) as reproducible_assets_missing_latex,
    coalesce(ast.reproducible_assets_missing_svg,0) as reproducible_assets_missing_svg,
    coalesce(ast.source_image_assets,0) as source_image_assets,
    coalesce(ast.unreviewed_source_image_assets,0) as unreviewed_source_image_assets,
    coalesce(ast.assets_missing_source_page,0) as assets_missing_source_page,
    coalesce(ast.crop_errors,0) as crop_errors,
    case
      when qp.source_url is null or nullif(btrim(qp.sha256),'') is null or qp.page_count is null then 'QP_SOURCE_METADATA_INCOMPLETE'
      when not qp.has_mark_scheme_source then 'MARK_SCHEME_SOURCE_MISSING'
      when not qp.mark_scheme_source_metadata_complete then 'MS_SOURCE_METADATA_INCOMPLETE'
      when coalesce(qs.leaves,0)=0 then 'QUESTION_CORPUS_MISSING'
      when coalesce(qs.qp_marks,0)<>qp.total_marks then 'QP_MARK_TOTAL_MISMATCH'
      when coalesce(ms.approved_schemes,0)<>coalesce(qs.leaves,0) or coalesce(ms.ms_marks,0)<>qp.total_marks or coalesce(ms.nonapproved_schemes,0)>0 then 'MARK_SCHEME_REVIEW_PENDING'
      when coalesce(qs.approved_leaves,0)<>coalesce(qs.leaves,0) then 'QUESTION_REVIEW_PENDING'
      when coalesce(qs.structured_v1_leaves,0)<>coalesce(qs.leaves,0) then 'STRUCTURED_CONTENT_INCOMPLETE'
      when coalesce(qs.latex_ready_leaves,0)<>coalesce(qs.leaves,0) then 'LATEX_INCOMPLETE'
      when coalesce(qs.primary_subtopic_leaves,0)<>coalesce(qs.leaves,0) then 'PRIMARY_SUBTOPIC_INCOMPLETE'
      when coalesce(qs.lo_mapped_leaves,0)<>coalesce(qs.leaves,0) then 'LEARNING_OBJECTIVE_INCOMPLETE'
      when coalesce(qs.low_confidence_primary_subtopics,0)>0 or coalesce(qs.low_confidence_los,0)>0 then 'TAXONOMY_REVIEW_PENDING'
      when coalesce(qs.source_pinned_leaves,0)<>coalesce(qs.leaves,0) then 'SOURCE_PROVENANCE_INCOMPLETE'
      when coalesce(qs.bridge_wording_leaves,0)>0 then 'SOURCE_WORDING_REVIEW'
      when coalesce(qs.embedded_visual_duplication_leaves,0)>0 then 'VISUAL_DUPLICATION_REVIEW'
      when coalesce(ast.assets_missing_source_page,0)>0 or coalesce(ast.crop_errors,0)>0 then 'ASSET_PROVENANCE_INCOMPLETE'
      when coalesce(ast.unreviewed_source_image_assets,0)>0 then 'VISUAL_SOURCE_REVIEW_PENDING'
      when coalesce(ast.reproducible_assets_missing_latex,0)>0 then 'VISUAL_LATEX_INCOMPLETE'
      when coalesce(ast.reproducible_assets_missing_svg,0)>0 then 'VISUAL_SVG_INCOMPLETE'
      else 'READY'
    end as closure_state
  from qp
  left join question_stats qs on qs.id=qp.id
  left join mark_scheme_stats ms on ms.id=qp.id
  left join asset_stats ast on ast.id=qp.id
)
select * from per_paper
order by case series when 'MJ' then 1 else 2 end, component, variant;
