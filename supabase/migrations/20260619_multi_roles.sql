-- Support multi-roles per user
-- Adds a roles text[] column; keeps role (primary) in sync via trigger.

ALTER TABLE public.profiles
  ADD COLUMN roles text[] NOT NULL DEFAULT '{}';

-- Populate from existing single role
UPDATE public.profiles SET roles = ARRAY[role];

-- Trigger: when roles is updated, sync role = roles[1] (SQL 1-indexed)
CREATE OR REPLACE FUNCTION public.sync_primary_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.roles IS NOT NULL AND array_length(NEW.roles, 1) > 0 THEN
    NEW.role := NEW.roles[1];
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_primary_role ON public.profiles;
CREATE TRIGGER trg_sync_primary_role
  BEFORE UPDATE OF roles ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_primary_role();

-- Update handle_new_user so new invitations also populate roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'closer');
  INSERT INTO public.profiles (id, email, full_name, role, roles)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    v_role,
    ARRAY[v_role]
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Helper: return all roles of the current user
CREATE OR REPLACE FUNCTION public.get_my_roles()
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT roles FROM public.profiles WHERE id = auth.uid();
$$;
