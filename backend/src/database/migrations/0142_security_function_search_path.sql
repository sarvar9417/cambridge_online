-- Pin trigger-function name resolution to trusted schemas.
--
-- Supabase security lint flags functions with a caller-controlled mutable
-- search_path because an object with the same unqualified name could otherwise
-- be resolved from an unexpected schema. These three functions are SECURITY
-- INVOKER trigger functions; pinning public + pg_temp preserves their current
-- behaviour while removing that resolution ambiguity.

ALTER FUNCTION public.backfill_published_submissions_on_enrolment_v1()
  SET search_path TO 'public', 'pg_temp';

ALTER FUNCTION public.enforce_user_identity_security_v1()
  SET search_path TO 'public', 'pg_temp';

ALTER FUNCTION public.redact_user_purge_audit_v1()
  SET search_path TO 'public', 'pg_temp';

DO $$
DECLARE
  v_missing text[];
BEGIN
  SELECT array_agg(expected.name ORDER BY expected.name)
  INTO v_missing
  FROM (VALUES
    ('backfill_published_submissions_on_enrolment_v1'),
    ('enforce_user_identity_security_v1'),
    ('redact_user_purge_audit_v1')
  ) AS expected(name)
  WHERE NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public'
      AND p.proname=expected.name
      AND pg_get_function_identity_arguments(p.oid)=''
      AND p.proconfig @> ARRAY['search_path=public, pg_temp']::text[]
  );

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'security search_path hardening failed for functions: %',v_missing;
  END IF;
END $$;
