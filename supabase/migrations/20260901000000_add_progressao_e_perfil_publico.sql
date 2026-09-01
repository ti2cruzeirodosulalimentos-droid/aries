-- Progressão de carga: registro das séries realmente executadas pelo aluno
-- (o que já existia — treino_exercicios — é só o planejado pelo personal).
CREATE TABLE public.treino_execucoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  exercicio_id uuid NOT NULL REFERENCES public.exercicios(id) ON DELETE CASCADE,
  treino_id uuid REFERENCES public.treinos(id) ON DELETE SET NULL,
  data date NOT NULL DEFAULT CURRENT_DATE,
  serie_numero int NOT NULL,
  carga_kg numeric,
  reps_realizadas int,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_treino_execucoes_aluno_ex ON public.treino_execucoes(aluno_id, exercicio_id, data DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.treino_execucoes TO authenticated;
GRANT ALL ON public.treino_execucoes TO service_role;
ALTER TABLE public.treino_execucoes ENABLE ROW LEVEL SECURITY;

-- Personal (dono do aluno) e admin gerenciam tudo.
CREATE POLICY "personal gerencia execucoes" ON public.treino_execucoes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.alunos a WHERE a.id = aluno_id AND (a.personal_id = auth.uid() OR public.has_role(auth.uid(),'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.alunos a WHERE a.id = aluno_id AND (a.personal_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));

-- Aluno registra e vê as próprias execuções (ele quem usa o modo "executar treino" no próprio celular).
CREATE POLICY "aluno gerencia proprias execucoes" ON public.treino_execucoes FOR ALL TO authenticated
  USING (aluno_id = public.aluno_id_of(auth.uid()))
  WITH CHECK (aluno_id = public.aluno_id_of(auth.uid()));

-- Perfil público do personal (página tipo linktree, divulgação nas redes).
-- Leitura pública passa por server function com service-role — sem policy de
-- anon aqui, o acesso não-autenticado nunca toca a tabela diretamente.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS public_slug text UNIQUE,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS especialidades text,
  ADD COLUMN IF NOT EXISTS contato_whatsapp text,
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  ADD CONSTRAINT public_slug_format CHECK (public_slug IS NULL OR public_slug ~ '^[a-z0-9-]{3,40}$');
