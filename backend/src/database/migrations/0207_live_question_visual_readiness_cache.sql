-- Cache the expensive source-visual readiness check used by Live Challenge.
--
-- Correctness rule:
--   * the cache is trusted only while the singleton state row is clean;
--   * any Question Bank question/asset mutation marks the cache dirty;
--   * Live selection falls back to the existing fail-closed recursive guard
--     whenever the cache is dirty.
--
-- This keeps source-fidelity correctness authoritative while removing repeated
-- recursive JSON/asset scans from the normal teacher builder path.

CREATE TABLE public.live_question_visual_readiness (
  question_id uuid PRIMARY KEY REFERENCES public.questions(id) ON DELETE CASCADE,
  has_visual boolean NOT NULL,
  visual_ready boolean NOT NULL,
  computed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.live_question_visual_readiness_state (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  dirty boolean NOT NULL DEFAULT true,
  dirty_at timestamptz NOT NULL DEFAULT now(),
  refreshed_at timestamptz,
  algorithm_version text,
  row_count integer NOT NULL DEFAULT 0 CHECK (row_count >= 0)
);

INSERT INTO public.live_question_visual_readiness_state(singleton,dirty,row_count)
VALUES (true,true,0)
ON CONFLICT(singleton) DO NOTHING;

ALTER TABLE public.live_question_visual_readiness ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_question_visual_readiness_state ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.live_question_visual_readiness,
  public.live_question_visual_readiness_state
  FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.mark_live_question_visual_readiness_dirty()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.live_question_visual_readiness_state
  SET dirty=true,
      dirty_at=now()
  WHERE singleton=true;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS questions_live_visual_readiness_dirty ON public.questions;
CREATE TRIGGER questions_live_visual_readiness_dirty
AFTER INSERT OR UPDATE OR DELETE ON public.questions
FOR EACH STATEMENT
EXECUTE FUNCTION public.mark_live_question_visual_readiness_dirty();

DROP TRIGGER IF EXISTS question_assets_live_visual_readiness_dirty ON public.question_assets;
CREATE TRIGGER question_assets_live_visual_readiness_dirty
AFTER INSERT OR UPDATE OR DELETE ON public.question_assets
FOR EACH STATEMENT
EXECUTE FUNCTION public.mark_live_question_visual_readiness_dirty();

COMMENT ON TABLE public.live_question_visual_readiness IS
  'Server-only cache of the exact Live source-visual guard. Trusted only when live_question_visual_readiness_state.dirty=false.';

COMMENT ON TABLE public.live_question_visual_readiness_state IS
  'Singleton freshness gate for Live visual-readiness cache. Question or question_asset writes invalidate the cache fail-closed.';
