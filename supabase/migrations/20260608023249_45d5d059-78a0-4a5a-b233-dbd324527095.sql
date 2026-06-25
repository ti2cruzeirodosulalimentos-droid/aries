
-- Anamneses
CREATE TABLE public.anamneses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  personal_id uuid NOT NULL,
  -- Histórico clínico
  doencas_cronicas text,
  cirurgias text,
  medicamentos text,
  lesoes text,
  alergias text,
  historico_familiar text,
  -- Hábitos
  fumante boolean DEFAULT false,
  alcool text,
  qualidade_sono text,
  horas_sono numeric(3,1),
  nivel_stress text,
  alimentacao text,
  hidratacao_litros numeric(3,1),
  -- Atividade
  pratica_atividade boolean DEFAULT false,
  atividade_descricao text,
  tempo_inatividade text,
  experiencia_musculacao text,
  -- Objetivos
  objetivo_principal text,
  objetivo_secundario text,
  prazo_objetivo text,
  motivacao text,
  -- PAR-Q
  parq_dor_peito boolean DEFAULT false,
  parq_tontura boolean DEFAULT false,
  parq_problema_osseo boolean DEFAULT false,
  parq_pressao_alta boolean DEFAULT false,
  parq_medicamento_pressao boolean DEFAULT false,
  parq_problema_cardiaco boolean DEFAULT false,
  parq_outras_razoes boolean DEFAULT false,
  parq_observacoes text,
  -- Outros
  observacoes_gerais text,
  assinatura_aluno text,
  data_anamnese date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.anamneses TO authenticated;
GRANT ALL ON public.anamneses TO service_role;
ALTER TABLE public.anamneses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "personal manages own anamneses" ON public.anamneses
  FOR ALL TO authenticated
  USING (personal_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (personal_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_anamneses_aluno ON public.anamneses(aluno_id);
CREATE TRIGGER update_anamneses_updated_at BEFORE UPDATE ON public.anamneses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Avaliações Físicas
CREATE TABLE public.avaliacoes_fisicas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  personal_id uuid NOT NULL,
  data_avaliacao date NOT NULL DEFAULT CURRENT_DATE,
  -- Antropometria básica
  peso numeric(5,2),
  altura numeric(4,2),
  idade integer,
  genero text, -- 'masculino' | 'feminino'
  -- Sinais vitais
  pressao_sistolica integer,
  pressao_diastolica integer,
  fc_repouso integer,
  -- Circunferências (cm)
  circ_pescoco numeric(5,2),
  circ_ombro numeric(5,2),
  circ_torax numeric(5,2),
  circ_cintura numeric(5,2),
  circ_abdomen numeric(5,2),
  circ_quadril numeric(5,2),
  circ_braco_d numeric(5,2),
  circ_braco_e numeric(5,2),
  circ_antebraco_d numeric(5,2),
  circ_antebraco_e numeric(5,2),
  circ_coxa_d numeric(5,2),
  circ_coxa_e numeric(5,2),
  circ_panturrilha_d numeric(5,2),
  circ_panturrilha_e numeric(5,2),
  -- Dobras cutâneas (mm)
  dobra_peitoral numeric(5,2),
  dobra_axilar_media numeric(5,2),
  dobra_triceps numeric(5,2),
  dobra_subescapular numeric(5,2),
  dobra_abdominal numeric(5,2),
  dobra_suprailiaca numeric(5,2),
  dobra_coxa numeric(5,2),
  -- Protocolo & resultados calculados
  protocolo text, -- 'jp3' | 'jp7' | 'obesos'
  densidade_corporal numeric(7,5),
  percentual_gordura numeric(5,2),
  massa_gorda numeric(5,2),
  massa_magra numeric(5,2),
  peso_ideal_min numeric(5,2),
  peso_ideal_max numeric(5,2),
  imc numeric(5,2),
  imc_classificacao text,
  rcq numeric(4,3),
  rcq_classificacao text,
  -- Outros
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.avaliacoes_fisicas TO authenticated;
GRANT ALL ON public.avaliacoes_fisicas TO service_role;
ALTER TABLE public.avaliacoes_fisicas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "personal manages own avaliacoes" ON public.avaliacoes_fisicas
  FOR ALL TO authenticated
  USING (personal_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (personal_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_avaliacoes_aluno ON public.avaliacoes_fisicas(aluno_id);
CREATE INDEX idx_avaliacoes_data ON public.avaliacoes_fisicas(aluno_id, data_avaliacao DESC);
CREATE TRIGGER update_avaliacoes_updated_at BEFORE UPDATE ON public.avaliacoes_fisicas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
