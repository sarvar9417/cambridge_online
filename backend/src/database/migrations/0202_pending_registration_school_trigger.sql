-- Make open-registration school scoping durable at the database boundary.
--
-- A stale application instance must not create another invisible tenant-less
-- pending registration while a deployment is rolling out. The rule remains
-- fail-closed when more than one distinct school has an active owner.

CREATE OR REPLACE FUNCTION public.scope_pending_registration_school_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  v_school_id uuid;
BEGIN
  IF NEW.school_id IS NOT NULL OR NEW.status IS DISTINCT FROM 'pending'::user_status THEN
    RETURN NEW;
  END IF;

  SELECT CASE
    WHEN count(DISTINCT school_id)=1 THEN max(school_id::text)::uuid
    ELSE NULL::uuid
  END
  INTO v_school_id
  FROM public.users
  WHERE role='owner'::user_role
    AND status='active'::user_status
    AND is_active=true
    AND school_id IS NOT NULL;

  IF v_school_id IS NOT NULL THEN
    NEW.school_id:=v_school_id;
  END IF;
  RETURN NEW;
END
$function$;

DROP TRIGGER IF EXISTS users_scope_pending_registration_school_v1 ON public.users;
CREATE TRIGGER users_scope_pending_registration_school_v1
BEFORE INSERT ON public.users
FOR EACH ROW
WHEN (NEW.school_id IS NULL AND NEW.status='pending'::user_status)
EXECUTE FUNCTION public.scope_pending_registration_school_v1();

REVOKE ALL ON FUNCTION public.scope_pending_registration_school_v1()
  FROM PUBLIC,anon,authenticated;
