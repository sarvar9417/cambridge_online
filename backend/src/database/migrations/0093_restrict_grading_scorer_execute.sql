-- The scorer is a SECURITY DEFINER trigger function. It is invoked by the
-- database trigger on grading_points and is not a public RPC. PostgreSQL grants
-- EXECUTE on new functions to PUBLIC by default, which made this function
-- callable through Supabase Data API roles despite being an internal trigger.
-- Trigger execution is unaffected by revoking direct EXECUTE from API roles.

REVOKE EXECUTE ON FUNCTION public.recompute_grading_point_awards() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.recompute_grading_point_awards() FROM anon;
REVOKE EXECUTE ON FUNCTION public.recompute_grading_point_awards() FROM authenticated;
