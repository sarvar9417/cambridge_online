-- 9618 LaTeX source-wording review candidates.
--
-- Read-only. This intentionally reports candidates rather than declaring an
-- error automatically. The original Cambridge QP remains authoritative.
--
-- The audit catches a narrow but important class of fidelity issue: LaTeX text
-- that introduces bridge prose such as "accompanying source-backed visual"
-- even though the source-backed Markdown/structured blocks do not contain that
-- wording. Visual/table/code content belongs in ordered structured blocks and
-- question_assets; it must not be replaced by invented explanatory prose.

with candidates as (
  select
    q.id as question_id,
    q.source_paper_id,
    q.display_ref,
    q.path,
    q.status,
    q.body_format,
    q.stem_latex,
    q.context_latex,
    q.stem_md,
    q.context_md,
    q.content_json,
    sp.year,
    sp.series,
    c.number as component,
    sp.variant,
    sp.source_url,
    sp.sha256,
    sp.page_count,
    concat_ws(
      E'\n',
      coalesce(q.stem_md, ''),
      coalesce(q.context_md, ''),
      coalesce(q.content_json::text, '')
    ) as source_backed_text
  from questions q
  join source_papers sp on sp.id = q.source_paper_id
  join syllabi s on s.id = sp.syllabus_id
  join components c on c.id = sp.component_id
  where s.code = '9618'
    and sp.kind = 'QP'
    and q.marks is not null
    and q.body_format = 'latex'
    and nullif(btrim(coalesce(q.stem_latex, '')), '') is not null
)
select
  year,
  series::text as series,
  component,
  variant,
  display_ref,
  path,
  status::text as status,
  source_url,
  sha256,
  page_count,
  stem_latex,
  stem_md,
  case
    when coalesce(stem_latex, '') ~* 'source[- ]backed visual'
      then 'invented_source_backed_visual_phrase'
    when coalesce(stem_latex, '') ~* 'accompanying pseudocode block'
      then 'invented_pseudocode_bridge_phrase'
    when coalesce(stem_latex, '') ~* 'accompanying tables?'
      then 'invented_table_bridge_phrase'
    when coalesce(stem_latex, '') ~* 'accompanying 8-bit register'
      then 'invented_register_bridge_phrase'
    when coalesce(stem_latex, '') ~* 'accompanying asset'
      then 'invented_asset_bridge_phrase'
    when coalesce(stem_latex, '') ~* 'accompanying diagram'
      then 'invented_diagram_bridge_phrase'
    when coalesce(stem_latex, '') ~* 'accompanying monospaced output'
      then 'invented_output_bridge_phrase'
    else 'source_wording_review'
  end as review_reason
from candidates
where coalesce(stem_latex, '') ~*
        '(source[- ]backed visual|accompanying (tables?|pseudocode block|8-bit register|asset|diagram|monospaced output))'
  and source_backed_text !~*
        '(source[- ]backed visual|accompanying (tables?|pseudocode block|8-bit register|asset|diagram|monospaced output))'
order by year, series, component, variant, path;
