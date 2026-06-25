
-- 1) Vincular conta de login a ficha de aluno
ALTER TABLE public.alunos
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS alunos_user_id_idx ON public.alunos(user_id);

-- 2) Helpers
CREATE OR REPLACE FUNCTION public.aluno_id_of(_uid uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.alunos WHERE user_id = _uid LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_personal_of_aluno(_uid uuid, _aluno_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.alunos WHERE id = _aluno_id AND personal_id = _uid)
$$;

-- 3) handle_new_user: novo cadastro vira ALUNO por padrão
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email))
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'aluno')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.permissoes (user_id, modulo, can_view, can_create, can_edit, can_delete)
  SELECT NEW.id, m::public.app_module, false, false, false, false
  FROM unnest(ARRAY['dashboard','alunos','anamnese','avaliacoes','treinos','exercicios','nutricao','metas','fotos','permissoes']) AS m
  ON CONFLICT (user_id, modulo) DO NOTHING;

  -- Alunos veem apenas seus próprios dados (acessíveis via rotas específicas)
  UPDATE public.permissoes SET can_view = true
   WHERE user_id = NEW.id
     AND modulo IN ('dashboard','treinos','avaliacoes','metas','fotos','nutricao');

  RETURN NEW;
END;
$$;

-- 4) RLS de alunos: incluir leitura para o próprio aluno
DROP POLICY IF EXISTS "aluno reads own row" ON public.alunos;
CREATE POLICY "aluno reads own row" ON public.alunos
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Estender RLS de tabelas filhas para o próprio aluno
DROP POLICY IF EXISTS "aluno reads own anamnese" ON public.anamneses;
CREATE POLICY "aluno reads own anamnese" ON public.anamneses
  FOR SELECT TO authenticated
  USING (aluno_id = public.aluno_id_of(auth.uid()));

DROP POLICY IF EXISTS "aluno reads own avaliacoes" ON public.avaliacoes_fisicas;
CREATE POLICY "aluno reads own avaliacoes" ON public.avaliacoes_fisicas
  FOR SELECT TO authenticated
  USING (aluno_id = public.aluno_id_of(auth.uid()));

DROP POLICY IF EXISTS "aluno reads own treinos" ON public.treinos;
CREATE POLICY "aluno reads own treinos" ON public.treinos
  FOR SELECT TO authenticated
  USING (aluno_id = public.aluno_id_of(auth.uid()));

DROP POLICY IF EXISTS "aluno reads own treino exercicios" ON public.treino_exercicios;
CREATE POLICY "aluno reads own treino exercicios" ON public.treino_exercicios
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.treinos t WHERE t.id = treino_id AND t.aluno_id = public.aluno_id_of(auth.uid())));

DROP POLICY IF EXISTS "aluno reads own planos" ON public.planos_alimentares;
CREATE POLICY "aluno reads own planos" ON public.planos_alimentares
  FOR SELECT TO authenticated
  USING (aluno_id = public.aluno_id_of(auth.uid()));

DROP POLICY IF EXISTS "aluno reads own refeicoes" ON public.refeicoes;
CREATE POLICY "aluno reads own refeicoes" ON public.refeicoes
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.planos_alimentares p WHERE p.id = plano_id AND p.aluno_id = public.aluno_id_of(auth.uid())));

DROP POLICY IF EXISTS "aluno reads own metas" ON public.metas;
CREATE POLICY "aluno reads own metas" ON public.metas
  FOR SELECT TO authenticated
  USING (aluno_id = public.aluno_id_of(auth.uid()));

DROP POLICY IF EXISTS "aluno reads own fotos" ON public.fotos_evolucao;
CREATE POLICY "aluno reads own fotos" ON public.fotos_evolucao
  FOR SELECT TO authenticated
  USING (aluno_id = public.aluno_id_of(auth.uid()));

-- 5) Admin RPCs
CREATE OR REPLACE FUNCTION public.admin_set_role(_target uuid, _role public.app_role)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem alterar papéis';
  END IF;
  DELETE FROM public.user_roles WHERE user_id = _target;
  INSERT INTO public.user_roles (user_id, role) VALUES (_target, _role);
END; $$;

CREATE OR REPLACE FUNCTION public.admin_transfer_aluno(_aluno_id uuid, _new_personal uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem transferir alunos';
  END IF;
  UPDATE public.alunos SET personal_id = _new_personal WHERE id = _aluno_id;
END; $$;

-- 6) PRODUTOS
CREATE TABLE IF NOT EXISTS public.produtos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('avaliacao','plano')),
  nome text NOT NULL,
  duracao_meses integer NOT NULL DEFAULT 0,
  preco_centavos integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.produtos TO authenticated;
GRANT ALL ON public.produtos TO service_role;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "produtos read all auth" ON public.produtos;
CREATE POLICY "produtos read all auth" ON public.produtos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "produtos admin write" ON public.produtos;
CREATE POLICY "produtos admin write" ON public.produtos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_produtos_updated BEFORE UPDATE ON public.produtos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7) VENDAS
CREATE TABLE IF NOT EXISTS public.vendas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  personal_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  produto_id uuid NOT NULL REFERENCES public.produtos(id),
  valor_centavos integer NOT NULL,
  data_venda date NOT NULL DEFAULT CURRENT_DATE,
  inicio_vigencia date NOT NULL DEFAULT CURRENT_DATE,
  fim_vigencia date,
  status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','cancelado','expirado')),
  forma_pagamento text,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vendas_personal_idx ON public.vendas(personal_id);
CREATE INDEX IF NOT EXISTS vendas_aluno_idx ON public.vendas(aluno_id);
CREATE INDEX IF NOT EXISTS vendas_data_idx ON public.vendas(data_venda);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendas TO authenticated;
GRANT ALL ON public.vendas TO service_role;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vendas personal scope" ON public.vendas;
CREATE POLICY "vendas personal scope" ON public.vendas FOR ALL TO authenticated
  USING (personal_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (personal_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "vendas aluno read" ON public.vendas;
CREATE POLICY "vendas aluno read" ON public.vendas FOR SELECT TO authenticated
  USING (aluno_id = public.aluno_id_of(auth.uid()));

CREATE TRIGGER trg_vendas_updated BEFORE UPDATE ON public.vendas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.vendas_set_fim_vigencia()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE d integer;
BEGIN
  IF NEW.fim_vigencia IS NULL THEN
    SELECT duracao_meses INTO d FROM public.produtos WHERE id = NEW.produto_id;
    IF COALESCE(d,0) > 0 THEN
      NEW.fim_vigencia := (NEW.inicio_vigencia + (d || ' months')::interval)::date;
    END IF;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_vendas_fim ON public.vendas;
CREATE TRIGGER trg_vendas_fim BEFORE INSERT OR UPDATE ON public.vendas
  FOR EACH ROW EXECUTE FUNCTION public.vendas_set_fim_vigencia();

-- 8) METAS FINANCEIRAS
CREATE TABLE IF NOT EXISTS public.metas_financeiras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  personal_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  mes integer NOT NULL CHECK (mes BETWEEN 1 AND 12),
  ano integer NOT NULL,
  valor_centavos integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (personal_id, mes, ano)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.metas_financeiras TO authenticated;
GRANT ALL ON public.metas_financeiras TO service_role;
ALTER TABLE public.metas_financeiras ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "metas fin scope" ON public.metas_financeiras;
CREATE POLICY "metas fin scope" ON public.metas_financeiras FOR ALL TO authenticated
  USING (personal_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR personal_id IS NULL)
  WITH CHECK (personal_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_metas_fin_updated BEFORE UPDATE ON public.metas_financeiras
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 9) AGENDA
CREATE TABLE IF NOT EXISTS public.agenda_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  personal_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  aluno_id uuid REFERENCES public.alunos(id) ON DELETE SET NULL,
  tipo text NOT NULL DEFAULT 'outro' CHECK (tipo IN ('avaliacao','consultoria','renovacao','reuniao','outro')),
  titulo text NOT NULL,
  inicio timestamptz NOT NULL,
  fim timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'agendado' CHECK (status IN ('agendado','confirmado','concluido','cancelado')),
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS agenda_personal_idx ON public.agenda_eventos(personal_id);
CREATE INDEX IF NOT EXISTS agenda_inicio_idx ON public.agenda_eventos(inicio);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agenda_eventos TO authenticated;
GRANT ALL ON public.agenda_eventos TO service_role;
ALTER TABLE public.agenda_eventos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "agenda personal scope" ON public.agenda_eventos;
CREATE POLICY "agenda personal scope" ON public.agenda_eventos FOR ALL TO authenticated
  USING (personal_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (personal_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "agenda aluno read" ON public.agenda_eventos;
CREATE POLICY "agenda aluno read" ON public.agenda_eventos FOR SELECT TO authenticated
  USING (aluno_id = public.aluno_id_of(auth.uid()));
CREATE TRIGGER trg_agenda_updated BEFORE UPDATE ON public.agenda_eventos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 10) SEED de produtos
INSERT INTO public.produtos (tipo, nome, duracao_meses, preco_centavos)
SELECT * FROM (VALUES
  ('avaliacao','Avaliação Física Personalizada', 0, 15000),
  ('plano','Plano Mensal Personalizado', 1, 25000),
  ('plano','Plano Trimestral Personalizado', 3, 67500),
  ('plano','Plano Semestral Personalizado', 6, 120000),
  ('plano','Plano Anual Personalizado', 12, 220000)
) AS v(tipo, nome, duracao_meses, preco_centavos)
WHERE NOT EXISTS (SELECT 1 FROM public.produtos);
