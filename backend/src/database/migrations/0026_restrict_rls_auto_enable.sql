-- The database has a SECURITY DEFINER event-trigger helper that automatically
-- enables RLS on newly created public tables. Event-trigger execution does not
-- require API roles to have EXECUTE on the underlying function, and exposing a
-- SECURITY DEFINER function through public/anon/authenticated creates an
-- unnecessary privilege-escalation surface.
--
-- Keep ownership/execution with postgres for the event trigger itself and remove
-- direct API-role execution.
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM service_role;
