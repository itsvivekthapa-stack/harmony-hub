
-- Roles enum
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles table (separate for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role security definer
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','super_admin')
  );
$$;

-- Arrangements table
CREATE TABLE public.arrangements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  note TEXT,
  file_url TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('image','pdf')),
  arrangement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN NOT NULL DEFAULT false,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.arrangements ENABLE ROW LEVEL SECURITY;
CREATE INDEX arrangements_active_idx ON public.arrangements(is_active);
CREATE INDEX arrangements_date_idx ON public.arrangements(arrangement_date DESC);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Single active arrangement trigger
CREATE OR REPLACE FUNCTION public.enforce_single_active_arrangement()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_active = true THEN
    UPDATE public.arrangements SET is_active = false WHERE id <> NEW.id AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER arrangements_single_active
AFTER INSERT OR UPDATE OF is_active ON public.arrangements
FOR EACH ROW WHEN (NEW.is_active = true)
EXECUTE FUNCTION public.enforce_single_active_arrangement();

-- Auto profile + first user becomes super admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE user_count INT;
BEGIN
  INSERT INTO public.profiles (id, display_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)), NEW.email);

  SELECT count(*) INTO user_count FROM public.user_roles;
  IF user_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin');
  ELSE
    -- Subsequent signups get plain admin role (admin invites only allowed via super admin in app)
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies
-- Profiles
CREATE POLICY "Profiles: own select" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_admin(auth.uid()));
CREATE POLICY "Profiles: own update" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id);

-- User roles
CREATE POLICY "Roles: select own or admin" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "Roles: super admin insert" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "Roles: super admin update" ON public.user_roles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "Roles: super admin delete" ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'));

-- Arrangements: public read, admin write
CREATE POLICY "Arrangements: public read" ON public.arrangements FOR SELECT
  USING (true);
CREATE POLICY "Arrangements: admin insert" ON public.arrangements FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Arrangements: admin update" ON public.arrangements FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()));
CREATE POLICY "Arrangements: admin delete" ON public.arrangements FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('arrangements','arrangements', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Arrangement files: public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'arrangements');
CREATE POLICY "Arrangement files: admin upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'arrangements' AND public.is_admin(auth.uid()));
CREATE POLICY "Arrangement files: admin update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'arrangements' AND public.is_admin(auth.uid()));
CREATE POLICY "Arrangement files: admin delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'arrangements' AND public.is_admin(auth.uid()));
