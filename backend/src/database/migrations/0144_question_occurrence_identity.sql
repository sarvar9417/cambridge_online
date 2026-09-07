-- Canonical Cambridge question identity with source occurrence provenance.
--
-- A Cambridge question may be printed unchanged in multiple official paper
-- variants. The question content is stored once in questions; every official
-- appearance is retained here as a source occurrence. Equivalence is never
-- inferred by this migration: only explicitly source-verified paper pairs may
-- be registered in source_paper_equivalences.

CREATE TABLE IF NOT EXISTS public.source_paper_equivalences (
  source_paper_id uuid PRIMARY KEY REFERENCES public.source_papers(id) ON DELETE RESTRICT,
  canonical_source_paper_id uuid NOT NULL REFERENCES public.source_papers(id) ON DELETE RESTRICT,
  equivalence_kind text NOT NULL DEFAULT 'exact_content'
    CHECK (equivalence_kind IN ('exact_content')),
  verified_at timestamptz NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (source_paper_id <> canonical_source_paper_id)
);

CREATE INDEX IF NOT EXISTS source_paper_equivalences_canonical_idx
  ON public.source_paper_equivalences(canonical_source_paper_id);

CREATE TABLE IF NOT EXISTS public.question_source_occurrences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  source_paper_id uuid NOT NULL REFERENCES public.source_papers(id) ON DELETE RESTRICT,
  mark_scheme_source_paper_id uuid REFERENCES public.source_papers(id) ON DELETE RESTRICT,
  source_path text NOT NULL,
  display_ref text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  equivalence_basis text NOT NULL DEFAULT 'primary_source'
    CHECK (equivalence_basis IN ('primary_source','source_verified_exact')),
  verified_at timestamptz,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Deliberately not a FK: after a verified merge this preserves the identity
  -- of the removed legacy duplicate question row for audit/history tracing.
  legacy_question_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(source_paper_id,source_path),
  UNIQUE(question_id,source_paper_id,source_path)
);

CREATE UNIQUE INDEX IF NOT EXISTS question_source_occurrences_primary_question_uidx
  ON public.question_source_occurrences(question_id)
  WHERE is_primary;

CREATE INDEX IF NOT EXISTS question_source_occurrences_question_idx
  ON public.question_source_occurrences(question_id);
CREATE INDEX IF NOT EXISTS question_source_occurrences_source_paper_idx
  ON public.question_source_occurrences(source_paper_id);
CREATE INDEX IF NOT EXISTS question_source_occurrences_ms_source_paper_idx
  ON public.question_source_occurrences(mark_scheme_source_paper_id)
  WHERE mark_scheme_source_paper_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.validate_source_paper_equivalence_v1()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  v_source public.source_papers%ROWTYPE;
  v_canonical public.source_papers%ROWTYPE;
BEGIN
  SELECT * INTO STRICT v_source FROM public.source_papers WHERE id=NEW.source_paper_id;
  SELECT * INTO STRICT v_canonical FROM public.source_papers WHERE id=NEW.canonical_source_paper_id;

  IF v_source.kind<>v_canonical.kind
     OR v_source.syllabus_id<>v_canonical.syllabus_id
     OR v_source.component_id<>v_canonical.component_id
     OR v_source.year<>v_canonical.year
     OR v_source.series<>v_canonical.series THEN
    RAISE EXCEPTION
      'source_paper_equivalence_scope_mismatch source=% canonical=%',
      NEW.source_paper_id,NEW.canonical_source_paper_id;
  END IF;

  IF v_source.variant=v_canonical.variant THEN
    RAISE EXCEPTION
      'source_paper_equivalence_same_variant source=% canonical=% variant=%',
      NEW.source_paper_id,NEW.canonical_source_paper_id,v_source.variant;
  END IF;

  IF NEW.equivalence_kind<>'exact_content' THEN
    RAISE EXCEPTION 'unsupported_source_paper_equivalence_kind:%',NEW.equivalence_kind;
  END IF;

  NEW.updated_at:=now();
  RETURN NEW;
END
$function$;

DROP TRIGGER IF EXISTS source_paper_equivalences_validate_v1
  ON public.source_paper_equivalences;
CREATE TRIGGER source_paper_equivalences_validate_v1
BEFORE INSERT OR UPDATE ON public.source_paper_equivalences
FOR EACH ROW EXECUTE FUNCTION public.validate_source_paper_equivalence_v1();

CREATE OR REPLACE FUNCTION public.validate_question_source_occurrence_v1()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  v_q_source uuid;
  v_qp public.source_papers%ROWTYPE;
  v_ms public.source_papers%ROWTYPE;
BEGIN
  SELECT source_paper_id INTO STRICT v_q_source
  FROM public.questions WHERE id=NEW.question_id;

  SELECT * INTO STRICT v_qp
  FROM public.source_papers WHERE id=NEW.source_paper_id;

  IF v_qp.kind<>'QP'::paper_kind THEN
    RAISE EXCEPTION 'question_occurrence_source_must_be_qp:%',NEW.source_paper_id;
  END IF;

  IF NEW.mark_scheme_source_paper_id IS NOT NULL THEN
    SELECT * INTO STRICT v_ms
    FROM public.source_papers WHERE id=NEW.mark_scheme_source_paper_id;
    IF v_ms.kind<>'MS'::paper_kind
       OR v_ms.syllabus_id<>v_qp.syllabus_id
       OR v_ms.component_id<>v_qp.component_id
       OR v_ms.year<>v_qp.year
       OR v_ms.series<>v_qp.series
       OR v_ms.variant<>v_qp.variant THEN
      RAISE EXCEPTION
        'question_occurrence_ms_source_mismatch qp=% ms=%',
        NEW.source_paper_id,NEW.mark_scheme_source_paper_id;
    END IF;
  END IF;

  IF NEW.is_primary THEN
    IF NEW.source_paper_id<>v_q_source THEN
      RAISE EXCEPTION
        'question_occurrence_primary_source_mismatch question=% occurrence_source=% question_source=%',
        NEW.question_id,NEW.source_paper_id,v_q_source;
    END IF;
    IF NEW.equivalence_basis<>'primary_source' THEN
      RAISE EXCEPTION 'question_occurrence_primary_basis_invalid:%',NEW.equivalence_basis;
    END IF;
  ELSE
    IF NEW.source_paper_id=v_q_source THEN
      RAISE EXCEPTION
        'question_occurrence_nonprimary_cannot_repeat_primary_source question=% source=%',
        NEW.question_id,NEW.source_paper_id;
    END IF;
    IF NEW.equivalence_basis<>'source_verified_exact' OR NEW.verified_at IS NULL THEN
      RAISE EXCEPTION 'question_occurrence_nonprimary_requires_verified_exact:%',NEW.id;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.source_paper_equivalences e
      WHERE e.source_paper_id=NEW.source_paper_id
        AND e.canonical_source_paper_id=v_q_source
        AND e.equivalence_kind='exact_content'
    ) THEN
      RAISE EXCEPTION
        'question_occurrence_missing_source_equivalence source=% canonical=%',
        NEW.source_paper_id,v_q_source;
    END IF;
  END IF;

  NEW.updated_at:=now();
  RETURN NEW;
END
$function$;

DROP TRIGGER IF EXISTS question_source_occurrences_validate_v1
  ON public.question_source_occurrences;
CREATE TRIGGER question_source_occurrences_validate_v1
BEFORE INSERT OR UPDATE ON public.question_source_occurrences
FOR EACH ROW EXECUTE FUNCTION public.validate_question_source_occurrence_v1();

-- Known source-equivalent papers must not be re-imported as a second set of
-- canonical question rows. The importer must attach occurrences to the already
-- canonical question tree instead. This is intentionally fail-closed.
CREATE OR REPLACE FUNCTION public.guard_question_verified_equivalent_source_v1()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  v_canonical uuid;
BEGIN
  SELECT canonical_source_paper_id INTO v_canonical
  FROM public.source_paper_equivalences
  WHERE source_paper_id=NEW.source_paper_id
    AND equivalence_kind='exact_content';

  IF v_canonical IS NOT NULL THEN
    RAISE EXCEPTION
      'verified_equivalent_source_requires_occurrence_mapping source=% canonical=%',
      NEW.source_paper_id,v_canonical;
  END IF;

  RETURN NEW;
END
$function$;

DROP TRIGGER IF EXISTS questions_guard_verified_equivalent_source_v1
  ON public.questions;
CREATE TRIGGER questions_guard_verified_equivalent_source_v1
BEFORE INSERT OR UPDATE OF source_paper_id ON public.questions
FOR EACH ROW EXECUTE FUNCTION public.guard_question_verified_equivalent_source_v1();

-- Backfill every existing source-backed QP question as its primary occurrence.
-- MS provenance is paired from the same natural paper identity when available.
INSERT INTO public.question_source_occurrences(
  question_id,source_paper_id,mark_scheme_source_paper_id,
  source_path,display_ref,is_primary,equivalence_basis,
  verified_at,evidence,legacy_question_id
)
SELECT
  q.id,q.source_paper_id,ms_source.id,
  q.path,q.display_ref,true,'primary_source',
  NULL,
  jsonb_build_object('backfill','0144_question_occurrence_identity'),
  q.id
FROM public.questions q
JOIN public.source_papers qp ON qp.id=q.source_paper_id AND qp.kind='QP'::paper_kind
LEFT JOIN LATERAL (
  SELECT ms.id
  FROM public.source_papers ms
  WHERE ms.kind='MS'::paper_kind
    AND ms.syllabus_id=qp.syllabus_id
    AND ms.component_id=qp.component_id
    AND ms.year=qp.year
    AND ms.series=qp.series
    AND ms.variant=qp.variant
  ORDER BY ms.created_at,ms.id
  LIMIT 1
) ms_source ON true
ON CONFLICT(source_paper_id,source_path) DO NOTHING;

-- Fail closed: all QP-backed questions must have exactly one primary occurrence
-- and the primary occurrence must preserve their current source/path identity.
DO $$
DECLARE
  v_missing integer;
  v_bad integer;
BEGIN
  SELECT count(*) INTO v_missing
  FROM public.questions q
  JOIN public.source_papers sp ON sp.id=q.source_paper_id AND sp.kind='QP'::paper_kind
  WHERE NOT EXISTS (
    SELECT 1 FROM public.question_source_occurrences o
    WHERE o.question_id=q.id AND o.is_primary
  );

  SELECT count(*) INTO v_bad
  FROM public.question_source_occurrences o
  JOIN public.questions q ON q.id=o.question_id
  WHERE o.is_primary
    AND (o.source_paper_id<>q.source_paper_id OR o.source_path<>q.path);

  IF v_missing<>0 OR v_bad<>0 THEN
    RAISE EXCEPTION
      'question_occurrence_backfill_failed missing_primary=% bad_primary=%',
      v_missing,v_bad;
  END IF;
END $$;
