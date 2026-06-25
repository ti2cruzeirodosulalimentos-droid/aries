-- Add 'admin' to app_role enum if missing
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'admin' AND enumtypid = 'public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'admin';
  END IF;
END $$;

-- Module enum
DO $$ BEGIN
  CREATE TYPE public.app_module AS ENUM (
    'dashboard','alunos','anamnese','avaliacoes','treinos','exercicios','nutricao','metas','fotos','permissoes'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Permissions table
CREATE TABLE IF NOT EXISTS public.permissoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  modulo public.app_module NOT NULL,
  can_view boolean NOT NULL DEFAULT true,
  can_create boolean NOT NULL DEFAULT true,
  can_edit boolean NOT NULL DEFAULT true,
  can_delete boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, modulo)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.permissoes TO authenticated;
GRANT ALL ON public.permissoes TO service_role;

ALTER TABLE public.permissoes ENABLE ROW LEVEL SECURITY;

-- Permission check function
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _modulo public.app_module, _acao text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v boolean;
BEGIN
  IF public.has_role(_user_id, 'admin') THEN RETURN true; END IF;
  SELECT CASE _acao
    WHEN 'view' THEN can_view
    WHEN 'create' THEN can_create
    WHEN 'edit' THEN can_edit
    WHEN 'delete' THEN can_delete
    ELSE false END INTO v
  FROM public.permissoes WHERE user_id = _user_id AND modulo = _modulo;
  RETURN COALESCE(v, false);
END; $$;

-- RLS policies
DROP POLICY IF EXISTS "Users can view own permissions" ON public.permissoes;
CREATE POLICY "Users can view own permissions" ON public.permissoes
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage permissions" ON public.permissoes;
CREATE POLICY "Admins manage permissions" ON public.permissoes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Updated_at trigger
DROP TRIGGER IF EXISTS trg_permissoes_updated ON public.permissoes;
CREATE TRIGGER trg_permissoes_updated BEFORE UPDATE ON public.permissoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default permissions for new users (extend handle_new_user)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'personal')
  ON CONFLICT DO NOTHING;
  INSERT INTO public.permissoes (user_id, modulo, can_view, can_create, can_edit, can_delete)
  SELECT NEW.id, m::public.app_module, true, true, true,
    CASE WHEN m = 'permissoes' THEN false ELSE true END
  FROM unnest(ARRAY['dashboard','alunos','anamnese','avaliacoes','treinos','exercicios','nutricao','metas','fotos','permissoes']) AS m
  ON CONFLICT (user_id, modulo) DO NOTHING;
  -- For 'permissoes' module, default to no access
  UPDATE public.permissoes SET can_view=false, can_create=false, can_edit=false, can_delete=false
  WHERE user_id = NEW.id AND modulo = 'permissoes';
  RETURN NEW;
END; $$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing users
INSERT INTO public.permissoes (user_id, modulo, can_view, can_create, can_edit, can_delete)
SELECT u.id, m::public.app_module, true, true, true,
  CASE WHEN m = 'permissoes' THEN false ELSE true END
FROM auth.users u
CROSS JOIN unnest(ARRAY['dashboard','alunos','anamnese','avaliacoes','treinos','exercicios','nutricao','metas','fotos','permissoes']) AS m
ON CONFLICT (user_id, modulo) DO NOTHING;

UPDATE public.permissoes SET can_view=false, can_create=false, can_edit=false, can_delete=false
WHERE modulo = 'permissoes' AND user_id NOT IN (SELECT user_id FROM public.user_roles WHERE role = 'admin');

-- Allow authenticated users to read profiles for the admin panel listing
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR id = auth.uid());

-- Same for user_roles
DROP POLICY IF EXISTS "Admins view all roles" ON public.user_roles;
CREATE POLICY "Admins view all roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));