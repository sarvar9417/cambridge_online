-- 9618 2022 corpus closure audit.
--
-- Read-only and source-equivalence aware. Exact-content variants are checked
-- through their verified canonical content owner instead of being treated as
-- empty papers. Original QP/MS source rows still remain independently present.
--
-- IMPORTANT: a bare trailing number is NOT treated as a PDF page artifact here.
-- Tables, K-maps and test grids legitimately end in values such as 5 or 10.
-- Page/footer cleanup is therefore gated only on explicit footer/copyright
-- markers; source/task-block comparisons are performed during corpus review.

with params as (
  select '9618'::text as syllabus_code, 2022::int as audit_year
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
    eq.evidence as equivalence_evidence,
    exists (
      select 1
      from source_papers ms
      where ms.syllabus_id = sp.syllabus_id
        and ms.component_id = sp.component_id
        and ms.year = sp.year
        and ms.series = sp.series
        and ms.variant = sp.variant
        and ms.kind = 'MS'
    ) as has_mark_scheme_source
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
    count(q.id) filter (where q.marks is not null and q.status = 'approved')::int as approved_leaves,
    count(q.id) filter (where q.marks is not null and q.content_version = 1 and q.content_json is not null)::int as structured_v1_leaves,
    count(q.id) filter (
      where q.marks is not null
        and nullif(btrim(coalesce(q.stem_latex,'')),'') is not null
        and q.body_format = 'latex'
    )::int as latex_ready_leaves,
    count(q.id) filter (where q.marks is not null and q.command_word is not null)::int as command_word_leaves,
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
        and exists (
          select 1 from question_subtopics qs
          where qs.question_id=q.id and qs.is_primary and coalesce(qs.confidence,0)<0.95
        )
    )::int as low_confidence_primary_subtopics,
    count(q.id) filter (
      where q.marks is not null
        and exists (
          select 1 from question_learning_objectives qlo
          where qlo.question_id=q.id and coalesce(qlo.confidence,0)<0.95
        )
    )::int as low_confidence_los,
    count(q.id) filter (
      where q.marks is not null
        and q.content_json->'source'->>'paperId'=qp.effective_source_paper_id::text
        and nullif(q.content_json->'source'->>'sha256','') is not null
    )::int as source_pinned_leaves,
    count(q.id) filter (
      where q.marks is not null
        and coalesce(q.stem_latex,'') ~* '(accompanying|source-backed|provided as|shown in the accompanying)'
    )::int as bridge_wording_leaves,
    count(q.id) filter (
      where q.marks is not null
        and coalesce(q.stem_md,'') ~* '(BLANK PAGE|Permission to reproduce|Cambridge Assessment International Education Copyright|www\.cambridgeinternational\.org|University of Cambridge Local Examinations Syndicate)'
    )::int as explicit_pdf_artifact_leaves
  from qp
  left join questions q on q.source_paper_id=qp.effective_source_paper_id
  group by qp.id, qp.effective_source_paper_id
),
mark_scheme_stats as (
  select
    qp.id,
    count(ms.id) filter (where q.marks is not null and ms.status='approved')::int as approved_schemes,
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
    count(qa.id) filter (where qa.kind in ('diagram','image'))::int as visual_assets,
    count(qa.id) filter (where nullif(btrim(coalesce(qa.latex_source,'')),'') is not null)::int as latex_authored_assets,
    count(qa.id) filter (where nullif(btrim(coalesce(qa.svg_markup,'')),'') is not null)::int as compiled_svg_assets,
    count(qa.id) filter (
      where qa.kind in ('diagram','image')
        and nullif(btrim(coalesce(qa.storage_path,'')),'') is null
        and nullif(btrim(coalesce(qa.svg_markup,'')),'') is null
        and coalesce(qa.content_md,'') !~* '^\s*<svg(?:\s|>)'
    )::int as unresolved_visual_assets
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
    qp.equivalence_kind,
    qp.page_count,
    qp.has_mark_scheme_source,
    qp.total_marks,
    coalesce(qs.leaves,0) as leaves,
    coalesce(qs.qp_marks,0) as qp_marks,
    coalesce(ms.approved_schemes,0) as approved_schemes,
    coalesce(ms.ms_marks,0) as ms_marks,
    coalesce(qs.approved_leaves,0) as approved_leaves,
    coalesce(qs.structured_v1_leaves,0) as structured_v1_leaves,
    coalesce(qs.latex_ready_leaves,0) as latex_ready_leaves,
    coalesce(qs.command_word_leaves,0) as command_word_leaves,
    coalesce(qs.primary_subtopic_leaves,0) as primary_subtopic_leaves,
    coalesce(qs.lo_mapped_leaves,0) as lo_mapped_leaves,
    coalesce(qs.source_pinned_leaves,0) as source_pinned_leaves,
    coalesce(qs.low_confidence_primary_subtopics,0) as low_confidence_primary_subtopics,
    coalesce(qs.low_confidence_los,0) as low_confidence_los,
    coalesce(qs.bridge_wording_leaves,0) as bridge_wording_leaves,
    coalesce(qs.explicit_pdf_artifact_leaves,0) as explicit_pdf_artifact_leaves,
    coalesce(ast.assets,0) as assets,
    coalesce(ast.visual_assets,0) as visual_assets,
    coalesce(ast.latex_authored_assets,0) as latex_authored_assets,
    coalesce(ast.compiled_svg_assets,0) as compiled_svg_assets,
    coalesce(ast.unresolved_visual_assets,0) as unresolved_visual_assets,
    qp.id as source_paper_id,
    qp.effective_source_paper_id,
    qp.source_url,
    qp.sha256,
    case
      when qp.source_url is null or nullif(btrim(qp.sha256),'') is null or qp.page_count is null then 'SOURCE_METADATA_INCOMPLETE'
      when not qp.has_mark_scheme_source then 'MARK_SCHEME_SOURCE_MISSING'
      when coalesce(qs.leaves,0)=0 then 'QUESTION_CORPUS_MISSING'
      when coalesce(qs.qp_marks,0)<>qp.total_marks then 'QP_MARK_TOTAL_MISMATCH'
      when coalesce(ms.approved_schemes,0)<>coalesce(qs.leaves,0) or coalesce(ms.ms_marks,0)<>qp.total_marks then 'MARK_SCHEME_MISMATCH'
      when coalesce(qs.approved_leaves,0)<>coalesce(qs.leaves,0) then 'REVIEW_PENDING'
      when coalesce(qs.structured_v1_leaves,0)<>coalesce(qs.leaves,0) then 'STRUCTURED_CONTENT_INCOMPLETE'
      when coalesce(qs.latex_ready_leaves,0)<>coalesce(qs.leaves,0) then 'LATEX_INCOMPLETE'
      when coalesce(qs.command_word_leaves,0)<>coalesce(qs.leaves,0) then 'COMMAND_WORD_INCOMPLETE'
      when coalesce(qs.primary_subtopic_leaves,0)<>coalesce(qs.leaves,0) then 'PRIMARY_SUBTOPIC_INCOMPLETE'
      when coalesce(qs.lo_mapped_leaves,0)<>coalesce(qs.leaves,0) then 'LEARNING_OBJECTIVE_INCOMPLETE'
      when coalesce(qs.low_confidence_primary_subtopics,0)>0 or coalesce(qs.low_confidence_los,0)>0 then 'TAXONOMY_REVIEW_PENDING'
      when coalesce(qs.source_pinned_leaves,0)<>coalesce(qs.leaves,0) then 'SOURCE_PROVENANCE_INCOMPLETE'
      when coalesce(qs.bridge_wording_leaves,0)>0 then 'SOURCE_WORDING_REVIEW'
      when coalesce(qs.explicit_pdf_artifact_leaves,0)>0 then 'PDF_EXTRACTION_ARTIFACTS'
      when coalesce(ast.unresolved_visual_assets,0)>0 then 'VISUALS_UNRESOLVED'
      else 'READY'
    end as closure_state
  from qp
  left join question_stats qs on qs.id=qp.id
  left join mark_scheme_stats ms on ms.id=qp.id
  left join asset_stats ast on ast.id=qp.id
)
select *
from per_paper
order by case series when 'MJ' then 1 else 2 end, component, variant;
