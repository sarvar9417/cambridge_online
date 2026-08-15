-- The live database inherited these two indexes from an older migration line.
-- Migration 0023 declares equivalent canonical indexes under the repository's
-- current names, leaving two identical indexes on each column/predicate.
-- Keep the 0023 names and remove only the legacy duplicates.
DROP INDEX IF EXISTS public.enrollments_group_id_idx;
DROP INDEX IF EXISTS public.groups_class_id_idx;
