
CREATE SCHEMA IF NOT EXISTS private;

-- Recreate has_role in the private (non-exposed) schema
CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Only authenticated/service_role invoke it via RLS policies
REVOKE EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

-- Repoint existing policies to the private version
DROP POLICY IF EXISTS "admins see all roles" ON public.user_roles;
DROP POLICY IF EXISTS "admins manage roles" ON public.user_roles;

CREATE POLICY "admins see all roles" ON public.user_roles
  FOR SELECT USING (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins manage roles" ON public.user_roles
  FOR ALL USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

-- Repoint any other policies that referenced public.has_role
DO $$
DECLARE
  r record;
  new_qual text;
  new_check text;
  stmt text;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname, cmd, permissive, roles, qual, with_check
    FROM pg_policies
    WHERE (qual LIKE '%has_role%' OR with_check LIKE '%has_role%')
      AND schemaname = 'public'
      AND NOT (tablename = 'user_roles' AND policyname IN ('admins see all roles','admins manage roles'))
  LOOP
    new_qual := replace(coalesce(r.qual, ''), 'has_role(', 'private.has_role(');
    new_check := replace(coalesce(r.with_check, ''), 'has_role(', 'private.has_role(');
    -- strip any stale schema prefix duplication
    new_qual := replace(new_qual, 'public.private.has_role(', 'private.has_role(');
    new_check := replace(new_check, 'public.private.has_role(', 'private.has_role(');

    EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);

    stmt := format('CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s',
      r.policyname, r.schemaname, r.tablename,
      r.permissive, r.cmd, array_to_string(r.roles, ','));
    IF new_qual <> '' THEN stmt := stmt || format(' USING (%s)', new_qual); END IF;
    IF new_check <> '' THEN stmt := stmt || format(' WITH CHECK (%s)', new_check); END IF;
    EXECUTE stmt;
  END LOOP;
END $$;

-- Now safe to drop the public-schema version
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
