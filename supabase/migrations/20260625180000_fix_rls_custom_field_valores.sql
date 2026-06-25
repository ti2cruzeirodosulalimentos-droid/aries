-- =============================================================================
-- Segurança: corrige RLS aberto de custom_field_valores.
-- Antes: FOR ALL TO authenticated USING (true) WITH CHECK (true) → qualquer
-- usuário autenticado lia/escrevia valores de QUALQUER conta.
-- Agora: escopo pelo dono do registro (anamnese/avaliação): personal dono,
-- o próprio aluno (leitura) ou admin.
-- =============================================================================
DROP POLICY IF EXISTS "auth manage own custom_field_valores" ON public.custom_field_valores;

-- Leitura: personal dono, o próprio aluno, ou admin.
CREATE POLICY "cfv select scoped" ON public.custom_field_valores
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (contexto = 'anamnese' AND EXISTS (
          SELECT 1 FROM public.anamneses a
          WHERE a.id = registro_id
            AND (a.personal_id = auth.uid() OR a.aluno_id = public.aluno_id_of(auth.uid()))))
    OR (contexto = 'avaliacao' AND EXISTS (
          SELECT 1 FROM public.avaliacoes_fisicas av
          WHERE av.id = registro_id
            AND (av.personal_id = auth.uid() OR av.aluno_id = public.aluno_id_of(auth.uid()))))
  );

-- Escrita (insert/update/delete): só o personal dono ou admin.
CREATE POLICY "cfv modify scoped" ON public.custom_field_valores
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (contexto = 'anamnese' AND EXISTS (
          SELECT 1 FROM public.anamneses a
          WHERE a.id = registro_id AND a.personal_id = auth.uid()))
    OR (contexto = 'avaliacao' AND EXISTS (
          SELECT 1 FROM public.avaliacoes_fisicas av
          WHERE av.id = registro_id AND av.personal_id = auth.uid()))
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR (contexto = 'anamnese' AND EXISTS (
          SELECT 1 FROM public.anamneses a
          WHERE a.id = registro_id AND a.personal_id = auth.uid()))
    OR (contexto = 'avaliacao' AND EXISTS (
          SELECT 1 FROM public.avaliacoes_fisicas av
          WHERE av.id = registro_id AND av.personal_id = auth.uid()))
  );
