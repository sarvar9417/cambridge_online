-- Register the live Hodder 9618 glossary curation fields in the reproducible
-- source schema. Existing records remain available; do not erase reviewed data.
-- Status and evidence are separate: a visible definition need not be verified.
ALTER TABLE public.glossary_terms
  ADD COLUMN IF NOT EXISTS is_official_key_term boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS official_key_term_page integer,
  ADD COLUMN IF NOT EXISTS official_key_term_section text,
  ADD COLUMN IF NOT EXISTS is_glossary_visible boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS definition_evidence_status text NOT NULL DEFAULT 'supplementary_source_screened';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid='public.glossary_terms'::regclass
      AND conname='glossary_definition_evidence_status_check'
  ) THEN
    ALTER TABLE public.glossary_terms
      ADD CONSTRAINT glossary_definition_evidence_status_check
      CHECK (definition_evidence_status IN (
        'official_textbook_definition',
        'supplementary_source_screened',
        'supplementary_manual_review_required',
        'supplementary_targeted_verified'
      ));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid='public.glossary_terms'::regclass
      AND conname='glossary_terms_nonblank_learning_content_check'
  ) THEN
    ALTER TABLE public.glossary_terms
      ADD CONSTRAINT glossary_terms_nonblank_learning_content_check
      CHECK (length(btrim(term))>0 AND length(btrim(definition_en))>0);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_glossary_official_by_subtopic
  ON public.glossary_terms(subtopic_id) WHERE is_official_key_term=true;
CREATE INDEX IF NOT EXISTS idx_glossary_visible_terms_by_subtopic
  ON public.glossary_terms(subtopic_id,term) WHERE is_glossary_visible=true;

CREATE OR REPLACE VIEW public.hodder_official_key_terms WITH (security_invoker=true) AS
SELECT id,subtopic_id,term,definition_en,definition_uz,example_md,source_ref,status,
       is_official_key_term,official_key_term_page,official_key_term_section
  FROM public.glossary_terms WHERE is_official_key_term=true;

CREATE OR REPLACE VIEW public.hodder_visible_glossary WITH (security_invoker=true) AS
SELECT id,subtopic_id,term,definition_en,definition_uz,example_md,source_ref,status,
       is_official_key_term,is_glossary_visible,definition_evidence_status,
       official_key_term_page,official_key_term_section
  FROM public.glossary_terms WHERE is_glossary_visible=true;

COMMENT ON COLUMN public.glossary_terms.definition_evidence_status IS
'Evidence status for a definition, independent of review_status. A source-screened definition has not passed expert verification.';
COMMENT ON COLUMN public.glossary_terms.is_glossary_visible IS
'Controls inclusion in the source-backed glossary catalogue and practice banks.';
