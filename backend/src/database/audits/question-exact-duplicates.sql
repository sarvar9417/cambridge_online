-- Exact Cambridge question duplicate audit.
--
-- IMPORTANT: source-equivalent questions from different official Cambridge
-- variants are NOT duplicate ingestion rows. They are separate source
-- occurrences and must remain addressable by their own source paper/ref.
--
-- This audit only flags candidates that are redundant inside the SAME source
-- paper after comparing the complete portable body plus assets, mark scheme,
-- taxonomy and learning-objective mappings.

WITH canonical AS (
  SELECT
    q.id,
    q.source_paper_id,
    q.path,
    q.display_ref,
    q.sort_order,
    md5(
      jsonb_build_object(
        'parent_path', parent.path,
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
        'content_json', q.content_json,
        'content_version', q.content_version,
        'assets', COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'kind', qa.kind,
              'storage_path', qa.storage_path,
              'content_md', qa.content_md,
              'alt_text', qa.alt_text,
              'sort_order', qa.sort_order,
              'source_page', qa.source_page,
              'latex_source', qa.latex_source,
              'svg_markup', qa.svg_markup,
              'size_bytes', qa.size_bytes,
              'content_hash', qa.content_hash,
              'source_bbox', qa.source_bbox,
              'crop_status', qa.crop_status,
              'crop_error', qa.crop_error
            )
            ORDER BY qa.sort_order, qa.storage_path, qa.content_hash
          )
          FROM question_assets qa
          WHERE qa.question_id = q.id
        ), '[]'::jsonb),
        'mark_schemes', COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'source_paper_id', ms.source_paper_id,
              'scheme_type', ms.scheme_type,
              'max_marks', ms.max_marks,
              'guidance_md', ms.guidance_md,
              'guidance_latex', ms.guidance_latex,
              'body_format', ms.body_format,
              'status', ms.status
            )
            ORDER BY ms.source_paper_id, ms.scheme_type::text, ms.max_marks,
              COALESCE(ms.guidance_md, '')
          )
          FROM mark_schemes ms
          WHERE ms.question_id = q.id
        ), '[]'::jsonb),
        'subtopics', COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'subtopic_id', qs.subtopic_id,
              'is_primary', qs.is_primary,
              'weight', qs.weight,
              'confidence', qs.confidence,
              'set_by', qs.set_by
            )
            ORDER BY qs.subtopic_id
          )
          FROM question_subtopics qs
          WHERE qs.question_id = q.id
        ), '[]'::jsonb),
        'learning_objectives', COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'lo_id', qlo.lo_id,
              'confidence', qlo.confidence
            )
            ORDER BY qlo.lo_id
          )
          FROM question_learning_objectives qlo
          WHERE qlo.question_id = q.id
        ), '[]'::jsonb)
      )::text
    ) AS canonical_hash
  FROM questions q
  LEFT JOIN questions parent ON parent.id = q.parent_id
  WHERE q.marks IS NOT NULL
), duplicate_groups AS (
  SELECT source_paper_id, canonical_hash, count(*) AS row_count
  FROM canonical
  GROUP BY source_paper_id, canonical_hash
  HAVING count(*) > 1
)
SELECT
  c.source_paper_id,
  d.canonical_hash,
  d.row_count,
  jsonb_agg(
    jsonb_build_object(
      'id', c.id,
      'path', c.path,
      'display_ref', c.display_ref,
      'sort_order', c.sort_order
    )
    ORDER BY c.sort_order, c.path, c.id
  ) AS rows
FROM duplicate_groups d
JOIN canonical c
  ON c.source_paper_id = d.source_paper_id
 AND c.canonical_hash = d.canonical_hash
GROUP BY c.source_paper_id, d.canonical_hash, d.row_count
ORDER BY c.source_paper_id, min(c.sort_order), d.canonical_hash;

-- Any duplicate official reference is an integrity failure even if one row is a
-- non-mark-bearing hierarchy container. Every source occurrence must have its
-- own unambiguous display reference.
SELECT display_ref, count(*) AS row_count, array_agg(id ORDER BY id) AS question_ids
FROM questions
GROUP BY display_ref
HAVING count(*) > 1
ORDER BY display_ref;
