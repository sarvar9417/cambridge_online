-- Columns the live database already carries but the Drizzle definitions did not
-- declare, so the new stack could not see them.
--
-- This matters: 84 of the 104 questions in the bank hold their text in
-- `stem_latex`, not `stem_md`. Reading only `stem_md` made that content
-- invisible and made validation rule V17 report an empty stem for every one of
-- them. Everything here is IF NOT EXISTS so the file is a no-op against the
-- adopted database and correct against a database built from 0001 onwards.

DO $$ BEGIN
  CREATE TYPE content_format AS ENUM ('markdown', 'latex');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE user_status AS ENUM ('pending', 'active', 'suspended');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Question and mark scheme text authored under the KaTeX contract: `$...$` is
-- maths, everything outside it is prose.
ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS stem_latex text,
  ADD COLUMN IF NOT EXISTS context_latex text,
  ADD COLUMN IF NOT EXISTS body_format content_format NOT NULL DEFAULT 'markdown';

ALTER TABLE mark_schemes
  ADD COLUMN IF NOT EXISTS guidance_latex text,
  ADD COLUMN IF NOT EXISTS body_format content_format NOT NULL DEFAULT 'markdown';

ALTER TABLE mark_scheme_points
  ADD COLUMN IF NOT EXISTS text_latex text;

ALTER TABLE mark_scheme_levels
  ADD COLUMN IF NOT EXISTS descriptor_latex text,
  ADD COLUMN IF NOT EXISTS indicative_content_latex text;

-- `latex_source` is the editable TikZ master; `svg_markup` is what actually
-- renders, because KaTeX cannot draw a diagram.
ALTER TABLE question_assets
  ADD COLUMN IF NOT EXISTS latex_source text,
  ADD COLUMN IF NOT EXISTS svg_markup text;

-- Byte size and content hash of a cropped asset. V11 checks the size and V22
-- uses the hash to spot one figure copied onto several siblings; without these
-- stored, both rules could only ever run during a pipeline pass and never
-- against the stored bank.
ALTER TABLE question_assets
  ADD COLUMN IF NOT EXISTS size_bytes int,
  ADD COLUMN IF NOT EXISTS content_hash text;

-- Self-service registration lifecycle: an account is created 'pending' and a
-- teacher activates it by assigning a class and group.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS status user_status NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES users,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

ALTER TABLE enrollments
  ADD COLUMN IF NOT EXISTS group_id uuid;
