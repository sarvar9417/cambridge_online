-- Source-equivalent Cambridge question occurrence audit.
--
-- This report intentionally groups identical QUESTION CONTENT across different
-- official source papers. These are not deletion candidates: each row preserves
-- a distinct Cambridge source occurrence (variant/year/series/ref).
--
-- Use this to understand why the Question Bank can contain identical-looking
-- content while the source corpus is still correct.

WITH normalized AS (
  SELECT
    q.id,
    q.source_paper_id,
    q.display_ref,
    s.code AS syllabus_code,
    c.number AS component,
    sp.year,
    sp.series::text AS series,
    sp.variant,
    md5(
      jsonb_build_object(
        'stem_md', q.stem_md,
        'context_md', q.context_md,
        'command_word', q.command_word,
        'marks', q.marks,
        'ao', q.ao,
        'answer_kind', q.answer_kind,
        'answer_lines', q.answer_lines,
        'stem_latex', q.stem_latex,
        'context_latex', q.context_latex,
        'body_format', q.body_format,
        'content_blocks', COALESCE((
          SELECT jsonb_agg((block.elem - 'source' - 'assetId' - 'altText') ORDER BY block.ord)
          FROM jsonb_array_elements(COALESCE(q.content_json->'blocks', '[]'::jsonb))
            WITH ORDINALITY AS block(elem, ord)
        ), '[]'::jsonb),
        'assets', COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'kind', qa.kind,
              'content_hash', qa.content_hash,
              'content_md', qa.content_md,
              'latex_source', qa.latex_source,
              'svg_markup', qa.svg_markup,
              'sort_order', qa.sort_order
            )
            ORDER BY qa.sort_order, qa.content_hash
          )
          FROM question_assets qa
          WHERE qa.question_id = q.id
        ), '[]'::jsonb),
        'mark_schemes', COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'scheme_type', ms.scheme_type,
              'max_marks', ms.max_marks,
              'guidance_md', ms.guidance_md,
              'guidance_latex', ms.guidance_latex,
              'body_format', ms.body_format
            )
            ORDER BY ms.scheme_type::text, ms.max_marks, COALESCE(ms.guidance_md, '')
          )
          FROM mark_schemes ms
          WHERE ms.question_id = q.id
        ), '[]'::jsonb)
      )::text
    ) AS content_hash
  FROM questions q
  JOIN source_papers sp ON sp.id = q.source_paper_id
  JOIN syllabi s ON s.id = sp.syllabus_id
  JOIN components c ON c.id = q.component_id
  WHERE q.marks IS NOT NULL
), groups AS (
  SELECT
    content_hash,
    count(*) AS occurrence_count,
    count(DISTINCT source_paper_id) AS paper_count,
    count(DISTINCT syllabus_code) AS syllabus_count,
    count(DISTINCT component) AS component_count,
    count(DISTINCT year) AS year_count,
    count(DISTINCT series) AS series_count,
    count(DISTINCT variant) AS variant_count
  FROM normalized
  GROUP BY content_hash
  HAVING count(*) > 1
)
SELECT
  g.content_hash,
  g.occurrence_count,
  CASE
    WHEN g.syllabus_count = 1
     AND g.component_count = 1
     AND g.year_count = 1
     AND g.series_count = 1
     AND g.variant_count > 1
      THEN 'official_same_session_cross_variant'
    ELSE 'review_required'
  END AS classification,
  jsonb_agg(
    jsonb_build_object(
      'question_id', n.id,
      'source_paper_id', n.source_paper_id,
      'display_ref', n.display_ref,
      'syllabus', n.syllabus_code,
      'component', n.component,
      'year', n.year,
      'series', n.series,
      'variant', n.variant
    )
    ORDER BY n.year, n.series, n.component, n.variant, n.display_ref
  ) AS occurrences
FROM groups g
JOIN normalized n ON n.content_hash = g.content_hash
GROUP BY g.content_hash, g.occurrence_count, g.syllabus_count,
         g.component_count, g.year_count, g.series_count, g.variant_count
ORDER BY g.occurrence_count DESC, g.content_hash;
