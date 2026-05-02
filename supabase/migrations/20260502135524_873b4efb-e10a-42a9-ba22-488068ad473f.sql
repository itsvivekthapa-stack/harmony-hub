
-- Ensure auth trigger exists (recreate idempotently)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ensure single-active-arrangement trigger exists
DROP TRIGGER IF EXISTS arrangements_single_active ON public.arrangements;
CREATE TRIGGER arrangements_single_active
AFTER INSERT OR UPDATE OF is_active ON public.arrangements
FOR EACH ROW WHEN (NEW.is_active = true)
EXECUTE FUNCTION public.enforce_single_active_arrangement();

-- Ensure profiles updated_at trigger
DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Public RPC to check whether initial setup is needed.
-- Anon-safe, returns boolean only — does NOT leak any user data.
CREATE OR REPLACE FUNCTION public.setup_required()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles)
     AND NOT EXISTS (SELECT 1 FROM auth.users);
$$;
GRANT EXECUTE ON FUNCTION public.setup_required() TO anon, authenticated;

-- Activity logs table
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email TEXT,
  action TEXT NOT NULL,
  target TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS activity_logs_created_idx ON public.activity_logs (created_at DESC);

DROP POLICY IF EXISTS "Activity: admin read" ON public.activity_logs;
CREATE POLICY "Activity: admin read" ON public.activity_logs FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Activity: admin insert" ON public.activity_logs;
CREATE POLICY "Activity: admin insert" ON public.activity_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) AND (actor_id = auth.uid() OR actor_id IS NULL));
