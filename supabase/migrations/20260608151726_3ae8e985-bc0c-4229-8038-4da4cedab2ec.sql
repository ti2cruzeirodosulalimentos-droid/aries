
-- Biblioteca de exercícios
CREATE TABLE public.exercicios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  grupo_muscular TEXT NOT NULL,
  equipamento TEXT,
  instrucoes TEXT,
  video_url TEXT,
  imagem_url TEXT,
  is_publico BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercicios TO authenticated;
GRANT ALL ON public.exercicios TO service_role;
ALTER TABLE public.exercicios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver exercicios publicos ou proprios" ON public.exercicios FOR SELECT TO authenticated
  USING (is_publico = true OR created_by = auth.uid());
CREATE POLICY "Criar exercicios" ON public.exercicios FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "Editar proprios exercicios" ON public.exercicios FOR UPDATE TO authenticated
  USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "Deletar proprios exercicios" ON public.exercicios FOR DELETE TO authenticated
  USING (created_by = auth.uid());
CREATE TRIGGER update_exercicios_updated_at BEFORE UPDATE ON public.exercicios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Treinos (fichas A-E)
CREATE TABLE public.treinos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  personal_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  aluno_id UUID NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  letra TEXT NOT NULL,
  nome TEXT,
  objetivo TEXT,
  observacoes TEXT,
  ordem INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.treinos TO authenticated;
GRANT ALL ON public.treinos TO service_role;
ALTER TABLE public.treinos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Personal gerencia seus treinos" ON public.treinos FOR ALL TO authenticated
  USING (personal_id = auth.uid()) WITH CHECK (personal_id = auth.uid());
CREATE TRIGGER update_treinos_updated_at BEFORE UPDATE ON public.treinos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_treinos_aluno ON public.treinos(aluno_id);

-- Exercícios dentro de cada treino
CREATE TABLE public.treino_exercicios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  treino_id UUID NOT NULL REFERENCES public.treinos(id) ON DELETE CASCADE,
  exercicio_id UUID NOT NULL REFERENCES public.exercicios(id) ON DELETE RESTRICT,
  ordem INT NOT NULL DEFAULT 0,
  series INT,
  repeticoes TEXT,
  carga TEXT,
  descanso_seg INT,
  metodo TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.treino_exercicios TO authenticated;
GRANT ALL ON public.treino_exercicios TO service_role;
ALTER TABLE public.treino_exercicios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Personal gerencia exercicios do treino" ON public.treino_exercicios FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.treinos t WHERE t.id = treino_id AND t.personal_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.treinos t WHERE t.id = treino_id AND t.personal_id = auth.uid()));
CREATE TRIGGER update_treino_exercicios_updated_at BEFORE UPDATE ON public.treino_exercicios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_treino_exercicios_treino ON public.treino_exercicios(treino_id);

-- Seed da biblioteca de exercícios (públicos, created_by null)
INSERT INTO public.exercicios (nome, grupo_muscular, equipamento, is_publico) VALUES
-- Peito
('Supino Reto com Barra','Peito','Barra',true),
('Supino Inclinado com Halteres','Peito','Halteres',true),
('Supino Declinado','Peito','Barra',true),
('Crucifixo Reto','Peito','Halteres',true),
('Crucifixo Inclinado','Peito','Halteres',true),
('Crossover Polia Alta','Peito','Polia',true),
('Crossover Polia Baixa','Peito','Polia',true),
('Peck Deck','Peito','Máquina',true),
('Flexão de Braço','Peito','Peso Corporal',true),
('Supino Máquina','Peito','Máquina',true),
-- Costas
('Puxada Frontal','Costas','Polia',true),
('Puxada Atrás','Costas','Polia',true),
('Remada Curvada','Costas','Barra',true),
('Remada Cavalinho','Costas','Máquina',true),
('Remada Unilateral com Halter','Costas','Halter',true),
('Remada Baixa','Costas','Polia',true),
('Barra Fixa','Costas','Peso Corporal',true),
('Pulldown','Costas','Polia',true),
('Levantamento Terra','Costas','Barra',true),
('Hiperextensão','Costas','Banco',true),
-- Pernas
('Agachamento Livre','Pernas','Barra',true),
('Leg Press 45º','Pernas','Máquina',true),
('Cadeira Extensora','Pernas','Máquina',true),
('Mesa Flexora','Pernas','Máquina',true),
('Cadeira Flexora','Pernas','Máquina',true),
('Stiff','Pernas','Barra',true),
('Afundo','Pernas','Halteres',true),
('Hack Machine','Pernas','Máquina',true),
('Cadeira Adutora','Pernas','Máquina',true),
('Cadeira Abdutora','Pernas','Máquina',true),
('Búlgaro','Pernas','Halteres',true),
('Passada','Pernas','Halteres',true),
('Panturrilha em Pé','Panturrilha','Máquina',true),
('Panturrilha Sentado','Panturrilha','Máquina',true),
('Panturrilha no Leg Press','Panturrilha','Máquina',true),
-- Ombros
('Desenvolvimento com Halteres','Ombros','Halteres',true),
('Desenvolvimento Militar','Ombros','Barra',true),
('Elevação Lateral','Ombros','Halteres',true),
('Elevação Frontal','Ombros','Halteres',true),
('Crucifixo Invertido','Ombros','Halteres',true),
('Encolhimento','Ombros','Halteres',true),
('Arnold Press','Ombros','Halteres',true),
('Desenvolvimento Máquina','Ombros','Máquina',true),
('Face Pull','Ombros','Polia',true),
-- Bíceps
('Rosca Direta','Bíceps','Barra',true),
('Rosca Alternada','Bíceps','Halteres',true),
('Rosca Martelo','Bíceps','Halteres',true),
('Rosca Scott','Bíceps','Barra W',true),
('Rosca Concentrada','Bíceps','Halter',true),
('Rosca 21','Bíceps','Barra',true),
('Rosca Polia','Bíceps','Polia',true),
-- Tríceps
('Tríceps Pulley','Tríceps','Polia',true),
('Tríceps Corda','Tríceps','Polia',true),
('Tríceps Testa','Tríceps','Barra W',true),
('Tríceps Francês','Tríceps','Halter',true),
('Tríceps Mergulho','Tríceps','Banco',true),
('Tríceps Coice','Tríceps','Halter',true),
('Supino Fechado','Tríceps','Barra',true),
-- Abdômen
('Abdominal Supra','Abdômen','Peso Corporal',true),
('Abdominal Infra','Abdômen','Peso Corporal',true),
('Abdominal Oblíquo','Abdômen','Peso Corporal',true),
('Prancha','Abdômen','Peso Corporal',true),
('Prancha Lateral','Abdômen','Peso Corporal',true),
('Abdominal na Polia','Abdômen','Polia',true),
('Elevação de Pernas','Abdômen','Barra Fixa',true),
('Russian Twist','Abdômen','Anilha',true),
-- Glúteos
('Elevação Pélvica','Glúteos','Barra',true),
('Coice na Polia','Glúteos','Polia',true),
('Glúteo 4 Apoios','Glúteos','Caneleira',true),
('Abdução de Quadril','Glúteos','Máquina',true),
('Agachamento Sumô','Glúteos','Halter',true),
('Cadeira Glúteo','Glúteos','Máquina',true),
-- Cardio
('Esteira','Cardio','Esteira',true),
('Bicicleta Ergométrica','Cardio','Bike',true),
('Elíptico','Cardio','Elíptico',true),
('Escada','Cardio','Escada',true),
('Corda Naval','Cardio','Corda',true),
('Burpee','Cardio','Peso Corporal',true);
