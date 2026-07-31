-- Papel Nutricionista + vínculo por aluno (personal e nutricionista distintos,
-- cada um só enxerga/edita o que é seu; anamnese e avaliação física ficam
-- compartilhadas entre os dois quando atendem o mesmo aluno).

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'nutricionista';

ALTER TABLE public.alunos ADD COLUMN IF NOT EXISTS nutricionista_id uuid REFERENCES auth.users(id);
CREATE INDEX IF NOT EXISTS idx_alunos_nutricionista ON public.alunos(nutricionista_id);

-- alunos: visível/editável por quem é o personal OU o nutricionista do aluno
DROP POLICY IF EXISTS "personal manages own alunos" ON public.alunos;
CREATE POLICY "personal or nutricionista manage alunos" ON public.alunos FOR ALL TO authenticated
  USING (personal_id = auth.uid() OR nutricionista_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (personal_id = auth.uid() OR nutricionista_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- planos_alimentares / refeicoes viram módulo exclusivo do nutricionista
ALTER TABLE public.planos_alimentares RENAME COLUMN personal_id TO nutricionista_id;

DROP POLICY IF EXISTS "Personal gerencia planos" ON public.planos_alimentares;
CREATE POLICY "Nutricionista gerencia planos" ON public.planos_alimentares FOR ALL TO authenticated
  USING (nutricionista_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (nutricionista_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Personal gerencia refeicoes" ON public.refeicoes;
CREATE POLICY "Nutricionista gerencia refeicoes" ON public.refeicoes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.planos_alimentares p WHERE p.id = plano_id AND (p.nutricionista_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.planos_alimentares p WHERE p.id = plano_id AND (p.nutricionista_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));

-- anamneses / avaliacoes_fisicas: continuam "de quem criou" (personal_id),
-- mas também visíveis/editáveis pelo nutricionista designado do mesmo aluno.
DROP POLICY IF EXISTS "personal manages own anamneses" ON public.anamneses;
CREATE POLICY "personal or nutricionista manage anamneses" ON public.anamneses FOR ALL TO authenticated
  USING (
    personal_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.alunos a WHERE a.id = anamneses.aluno_id AND a.nutricionista_id = auth.uid())
  )
  WITH CHECK (
    personal_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.alunos a WHERE a.id = anamneses.aluno_id AND a.nutricionista_id = auth.uid())
  );

DROP POLICY IF EXISTS "personal manages own avaliacoes" ON public.avaliacoes_fisicas;
CREATE POLICY "personal or nutricionista manage avaliacoes" ON public.avaliacoes_fisicas FOR ALL TO authenticated
  USING (
    personal_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.alunos a WHERE a.id = avaliacoes_fisicas.aluno_id AND a.nutricionista_id = auth.uid())
  )
  WITH CHECK (
    personal_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.alunos a WHERE a.id = avaliacoes_fisicas.aluno_id AND a.nutricionista_id = auth.uid())
  );
