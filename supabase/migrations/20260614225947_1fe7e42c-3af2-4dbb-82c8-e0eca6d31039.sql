
-- ===== ANAMNESES — campos extras =====
ALTER TABLE public.anamneses
  ADD COLUMN IF NOT EXISTS objetivo_principal_tipo text,
  ADD COLUMN IF NOT EXISTS ja_treinou boolean,
  ADD COLUMN IF NOT EXISTS gosta_treinar text,
  ADD COLUMN IF NOT EXISTS nao_gosta_treinar text,
  ADD COLUMN IF NOT EXISTS liberacao_medica boolean,
  ADD COLUMN IF NOT EXISTS faixa_sono text,
  ADD COLUMN IF NOT EXISTS faixa_agua text,
  ADD COLUMN IF NOT EXISTS dias_treino_semana integer,
  ADD COLUMN IF NOT EXISTS horario_preferido text,
  ADD COLUMN IF NOT EXISTS satisfacao_corporal integer,
  ADD COLUMN IF NOT EXISTS maior_dificuldade text,
  ADD COLUMN IF NOT EXISTS motivo_procura text,
  ADD COLUMN IF NOT EXISTS ja_desistiu text,
  ADD COLUMN IF NOT EXISTS regiao_desenvolver text,
  ADD COLUMN IF NOT EXISTS regiao_desconforto text,
  ADD COLUMN IF NOT EXISTS nivel_motivacao integer;

-- ===== AVALIAÇÕES FÍSICAS — bilaterais, diâmetros, vo2, neuromotores, postural =====
ALTER TABLE public.avaliacoes_fisicas
  ADD COLUMN IF NOT EXISTS circ_antebraco_relax_d numeric,
  ADD COLUMN IF NOT EXISTS circ_antebraco_relax_e numeric,
  ADD COLUMN IF NOT EXISTS circ_braco_relax_d numeric,
  ADD COLUMN IF NOT EXISTS circ_braco_relax_e numeric,
  ADD COLUMN IF NOT EXISTS circ_braco_contr_d numeric,
  ADD COLUMN IF NOT EXISTS circ_braco_contr_e numeric,
  ADD COLUMN IF NOT EXISTS circ_coxa_prox_d numeric,
  ADD COLUMN IF NOT EXISTS circ_coxa_prox_e numeric,
  ADD COLUMN IF NOT EXISTS circ_coxa_medial_d numeric,
  ADD COLUMN IF NOT EXISTS circ_coxa_medial_e numeric,
  ADD COLUMN IF NOT EXISTS circ_coxa_distal_d numeric,
  ADD COLUMN IF NOT EXISTS circ_coxa_distal_e numeric,
  ADD COLUMN IF NOT EXISTS diametro_punho numeric,
  ADD COLUMN IF NOT EXISTS diametro_umero numeric,
  ADD COLUMN IF NOT EXISTS diametro_femur numeric,
  ADD COLUMN IF NOT EXISTS vo2_protocolo text,
  ADD COLUMN IF NOT EXISTS vo2_distancia numeric,
  ADD COLUMN IF NOT EXISTS vo2_fc_final integer,
  ADD COLUMN IF NOT EXISTS vo2_resultado numeric,
  ADD COLUMN IF NOT EXISTS vo2_classificacao text,
  ADD COLUMN IF NOT EXISTS neuro_preensao_d numeric,
  ADD COLUMN IF NOT EXISTS neuro_preensao_e numeric,
  ADD COLUMN IF NOT EXISTS neuro_sentar_alcancar numeric,
  ADD COLUMN IF NOT EXISTS neuro_abdominal_1min integer,
  ADD COLUMN IF NOT EXISTS neuro_flexao_1min integer,
  ADD COLUMN IF NOT EXISTS neuro_salto_vertical numeric,
  ADD COLUMN IF NOT EXISTS postural jsonb DEFAULT '{}'::jsonb;

-- ===== CAMPANHAS DE VENCIMENTO =====
CREATE TABLE IF NOT EXISTS public.campanhas_vencimento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  dias_antes integer NOT NULL,
  canal text NOT NULL DEFAULT 'whatsapp',
  template_id uuid REFERENCES public.mensagens_templates(id) ON DELETE SET NULL,
  ativo boolean NOT NULL DEFAULT true,
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.campanhas_vencimento TO authenticated;
GRANT ALL ON public.campanhas_vencimento TO service_role;
ALTER TABLE public.campanhas_vencimento ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campanhas admin/personal manage" ON public.campanhas_vencimento;
CREATE POLICY "campanhas admin/personal manage" ON public.campanhas_vencimento
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'personal'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'personal'));

CREATE TRIGGER update_campanhas_vencimento_updated_at
  BEFORE UPDATE ON public.campanhas_vencimento
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== MENSAGENS ENVIADAS (auditoria) =====
CREATE TABLE IF NOT EXISTS public.mensagens_enviadas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid REFERENCES public.alunos(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.mensagens_templates(id) ON DELETE SET NULL,
  campanha_id uuid REFERENCES public.campanhas_vencimento(id) ON DELETE SET NULL,
  canal text NOT NULL,
  destinatario text,
  corpo text,
  status text DEFAULT 'gerado',
  enviado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mensagens_enviadas TO authenticated;
GRANT ALL ON public.mensagens_enviadas TO service_role;
ALTER TABLE public.mensagens_enviadas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mensagens_enviadas admin/personal" ON public.mensagens_enviadas;
CREATE POLICY "mensagens_enviadas admin/personal" ON public.mensagens_enviadas
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'personal'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'personal'));
