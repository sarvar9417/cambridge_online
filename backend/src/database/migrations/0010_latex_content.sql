-- LaTeX authoring for questions, mark schemes and diagrams.
--
-- Question and mark scheme text is authored in LaTeX so that binary/hex notation,
-- formulae, truth tables and pseudocode keep their exam typography. The rendering
-- contract is KaTeX: `*_latex` columns hold the editable master, and diagrams keep
-- their TikZ source next to a rendered SVG that KaTeX cannot produce itself.

CREATE TYPE content_format AS ENUM ('markdown', 'latex');

ALTER TABLE questions
  ADD COLUMN stem_latex text,
  ADD COLUMN context_latex text,
  ADD COLUMN body_format content_format NOT NULL DEFAULT 'markdown',
  ADD CONSTRAINT questions_latex_body_present
    CHECK (body_format <> 'latex' OR stem_latex IS NOT NULL OR context_latex IS NOT NULL);

ALTER TABLE mark_schemes
  ADD COLUMN guidance_latex text,
  ADD COLUMN body_format content_format NOT NULL DEFAULT 'markdown';

ALTER TABLE mark_scheme_points
  ADD COLUMN text_latex text;

ALTER TABLE mark_scheme_levels
  ADD COLUMN descriptor_latex text,
  ADD COLUMN indicative_content_latex text;

-- Diagrams: `latex_source` is the editable TikZ/pgfplots master, `svg_markup` is
-- what students and the PDF export actually render. Either may be absent while a
-- diagram is still being authored.
ALTER TABLE question_assets
  ADD COLUMN latex_source text,
  ADD COLUMN svg_markup text;
