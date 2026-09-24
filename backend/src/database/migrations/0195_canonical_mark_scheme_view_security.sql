-- The canonical mark-scheme selector is an internal server-side view.
--
-- A regular view executes with its owner's privileges by default. On Supabase,
-- that allowed Data API roles with an inherited SELECT grant to bypass RLS on
-- the underlying mark-scheme tables and read unreleased guidance directly.

ALTER VIEW public.canonical_mark_schemes
  SET (security_invoker = true);

REVOKE ALL PRIVILEGES ON TABLE public.canonical_mark_schemes
  FROM PUBLIC, anon, authenticated;
