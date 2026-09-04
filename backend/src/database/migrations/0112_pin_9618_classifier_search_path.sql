-- Security hardening: these deterministic classifier functions do not need a
-- caller-controlled search_path. Pin it so object resolution cannot be changed by
-- the invoking role/session.

ALTER FUNCTION public.classify_9618_subtopic_rule(integer, text)
  SET search_path TO public, pg_temp;

ALTER FUNCTION public.classify_9618_lo_rule(text, text)
  SET search_path TO public, pg_temp;
