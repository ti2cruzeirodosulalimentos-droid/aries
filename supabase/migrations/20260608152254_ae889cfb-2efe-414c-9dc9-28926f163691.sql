
-- Planos alimentares
CREATE TABLE public.planos_alimentares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  personal_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  aluno_id UUID NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT 'Plano Alimentar',
  objetivo TEXT,
  kcal_alvo NUMERIC,
  proteina_g NUMERIC,
  carboidrato_g NUMERIC,
  gordura_g NUMERIC,
  agua_litros NUMERIC,
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planos_alimentares TO authenticated;
GRANT ALL ON public.planos_alimentares TO service_role;
ALTER TABLE public.planos_alimentares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Personal gerencia planos" ON public.planos_alimentares FOR ALL TO authenticated
  USING (personal_id = auth.uid()) WITH CHECK (personal_id = auth.uid());
CREATE TRIGGER update_planos_alimentares_updated_at BEFORE UPDATE ON public.planos_alimentares
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_planos_alimentares_aluno ON public.planos_alimentares(aluno_id);

-- Refeições
CREATE TABLE public.refeicoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plano_id UUID NOT NULL REFERENCES public.planos_alimentares(id) ON DELETE CASCADE,
  ordem INT NOT NULL DEFAULT 0,
  nome TEXT NOT NULL,
  horario TEXT,
  descricao TEXT,
  kcal NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.refeicoes TO authenticated;
GRANT ALL ON public.refeicoes TO service_role;
ALTER TABLE public.refeicoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Personal gerencia refeicoes" ON public.refeicoes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.planos_alimentares p WHERE p.id = plano_id AND p.personal_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.planos_alimentares p WHERE p.id = plano_id AND p.personal_id = auth.uid()));
CREATE TRIGGER update_refeicoes_updated_at BEFORE UPDATE ON public.refeicoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_refeicoes_plano ON public.refeicoes(plano_id);

-- Metas
CREATE TABLE public.metas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  personal_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  aluno_id UUID NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  unidade TEXT,
  valor_inicial NUMERIC,
  valor_atual NUMERIC,
  valor_alvo NUMERIC,
  data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  data_alvo DATE,
  status TEXT NOT NULL DEFAULT 'em_andamento',
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.metas TO authenticated;
GRANT ALL ON public.metas TO service_role;
ALTER TABLE public.metas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Personal gerencia metas" ON public.metas FOR ALL TO authenticated
  USING (personal_id = auth.uid()) WITH CHECK (personal_id = auth.uid());
CREATE TRIGGER update_metas_updated_at BEFORE UPDATE ON public.metas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_metas_aluno ON public.metas(aluno_id);

-- Fotos de evolução
CREATE TABLE public.fotos_evolucao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  personal_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  aluno_id UUID NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  data_foto DATE NOT NULL DEFAULT CURRENT_DATE,
  angulo TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  peso NUMERIC,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fotos_evolucao TO authenticated;
GRANT ALL ON public.fotos_evolucao TO service_role;
ALTER TABLE public.fotos_evolucao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Personal gerencia fotos" ON public.fotos_evolucao FOR ALL TO authenticated
  USING (personal_id = auth.uid()) WITH CHECK (personal_id = auth.uid());
CREATE TRIGGER update_fotos_evolucao_updated_at BEFORE UPDATE ON public.fotos_evolucao
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_fotos_evolucao_aluno ON public.fotos_evolucao(aluno_id, data_foto);
