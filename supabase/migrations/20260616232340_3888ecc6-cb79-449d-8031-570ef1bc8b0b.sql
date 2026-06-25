
-- Custom fields para Anamnese e Avaliação
CREATE TABLE public.custom_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contexto text NOT NULL CHECK (contexto IN ('anamnese','avaliacao')),
  subgrupo text,
  label text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('texto','textarea','numero','escolha','escala','booleano','data')),
  opcoes jsonb DEFAULT '[]'::jsonb,
  obrigatorio boolean NOT NULL DEFAULT false,
  ordem int NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.custom_fields TO authenticated;
GRANT ALL ON public.custom_fields TO service_role;
ALTER TABLE public.custom_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read custom_fields" ON public.custom_fields FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write custom_fields" ON public.custom_fields FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.custom_field_valores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_field_id uuid NOT NULL REFERENCES public.custom_fields(id) ON DELETE CASCADE,
  registro_id uuid NOT NULL,
  contexto text NOT NULL,
  valor jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (custom_field_id, registro_id)
);
CREATE INDEX cf_valores_registro_idx ON public.custom_field_valores(registro_id, contexto);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_field_valores TO authenticated;
GRANT ALL ON public.custom_field_valores TO service_role;
ALTER TABLE public.custom_field_valores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage own custom_field_valores" ON public.custom_field_valores FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Categorias de exercícios
CREATE TABLE public.exercicio_categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  cor text DEFAULT '#3B82F6',
  icone text,
  ordem int NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.exercicio_categorias TO authenticated;
GRANT ALL ON public.exercicio_categorias TO service_role;
ALTER TABLE public.exercicio_categorias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read exercicio_categorias" ON public.exercicio_categorias FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write exercicio_categorias" ON public.exercicio_categorias FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

ALTER TABLE public.exercicios ADD COLUMN IF NOT EXISTS categoria_id uuid REFERENCES public.exercicio_categorias(id) ON DELETE SET NULL;
ALTER TABLE public.exercicios ADD COLUMN IF NOT EXISTS musculos_alvo text[] DEFAULT '{}';

-- Protocolos de avaliação custom
CREATE TABLE public.protocolos_avaliacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  genero text CHECK (genero IN ('masculino','feminino','ambos')) DEFAULT 'ambos',
  dobras_necessarias text[] NOT NULL DEFAULT '{}',
  formula jsonb NOT NULL DEFAULT '{}'::jsonb,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.protocolos_avaliacao TO authenticated;
GRANT ALL ON public.protocolos_avaliacao TO service_role;
ALTER TABLE public.protocolos_avaliacao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read protocolos" ON public.protocolos_avaliacao FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write protocolos" ON public.protocolos_avaliacao FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Audit log
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  acao text NOT NULL,
  entidade text NOT NULL,
  entidade_id uuid,
  detalhes jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read audit" ON public.audit_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "auth insert audit" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Triggers updated_at
CREATE TRIGGER tg_cf_updated BEFORE UPDATE ON public.custom_fields FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER tg_cfv_updated BEFORE UPDATE ON public.custom_field_valores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER tg_ec_updated BEFORE UPDATE ON public.exercicio_categorias FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER tg_pa_updated BEFORE UPDATE ON public.protocolos_avaliacao FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
