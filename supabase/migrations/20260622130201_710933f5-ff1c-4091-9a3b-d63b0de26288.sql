
-- Etapa 4 — Segurança: lockdown de funções SECURITY DEFINER e RLS permissivo

-- 1) Revogar EXECUTE em funções privilegiadas/triggers
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_set_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_transfer_aluno(uuid, uuid) FROM PUBLIC, anon;
-- admin_* permanecem executáveis por authenticated (já validam papel internamente)
GRANT EXECUTE ON FUNCTION public.admin_set_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_transfer_aluno(uuid, uuid) TO authenticated;

-- Funções usadas em policies (has_role/has_permission/is_personal_of_aluno/aluno_id_of)
-- precisam permanecer executáveis pelo planner. Mantemos default (PUBLIC) — são apenas leituras controladas.

-- 2) Endurecer RLS de custom_field_valores: restringir a admin OU personal dono do registro
DROP POLICY IF EXISTS "auth manage own custom_field_valores" ON public.custom_field_valores;

CREATE POLICY "cfv read"
  ON public.custom_field_valores FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (contexto = 'aluno' AND public.is_personal_of_aluno(auth.uid(), registro_id))
    OR (contexto = 'aluno' AND registro_id = public.aluno_id_of(auth.uid()))
  );

CREATE POLICY "cfv write"
  ON public.custom_field_valores FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR (contexto = 'aluno' AND public.is_personal_of_aluno(auth.uid(), registro_id))
  );

CREATE POLICY "cfv update"
  ON public.custom_field_valores FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (contexto = 'aluno' AND public.is_personal_of_aluno(auth.uid(), registro_id))
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR (contexto = 'aluno' AND public.is_personal_of_aluno(auth.uid(), registro_id))
  );

CREATE POLICY "cfv delete"
  ON public.custom_field_valores FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (contexto = 'aluno' AND public.is_personal_of_aluno(auth.uid(), registro_id))
  );
