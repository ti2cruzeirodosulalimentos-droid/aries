-- Banco de alimentos estruturado + itens de refeição com cálculo automático
-- de calorias/macros (quantidade * valores por porção-base do alimento).

CREATE TABLE public.alimentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- null = alimento padrão do sistema
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'Outro',
  unidade TEXT NOT NULL DEFAULT 'g',
  porcao_base NUMERIC NOT NULL DEFAULT 100,
  kcal NUMERIC NOT NULL DEFAULT 0,
  proteina_g NUMERIC NOT NULL DEFAULT 0,
  carboidrato_g NUMERIC NOT NULL DEFAULT 0,
  gordura_g NUMERIC NOT NULL DEFAULT 0,
  fibra_g NUMERIC,
  sodio_mg NUMERIC,
  is_publico BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alimentos TO authenticated;
GRANT ALL ON public.alimentos TO service_role;
ALTER TABLE public.alimentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read alimentos" ON public.alimentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert alimentos" ON public.alimentos FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "owner updates alimentos" ON public.alimentos FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "owner deletes alimentos" ON public.alimentos FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_alimentos_categoria ON public.alimentos(categoria);
CREATE TRIGGER update_alimentos_updated_at BEFORE UPDATE ON public.alimentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.refeicao_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  refeicao_id UUID NOT NULL REFERENCES public.refeicoes(id) ON DELETE CASCADE,
  alimento_id UUID NOT NULL REFERENCES public.alimentos(id) ON DELETE RESTRICT,
  quantidade NUMERIC NOT NULL DEFAULT 100,
  ordem INT NOT NULL DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.refeicao_itens TO authenticated;
GRANT ALL ON public.refeicao_itens TO service_role;
ALTER TABLE public.refeicao_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nutricionista gerencia itens" ON public.refeicao_itens FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.refeicoes r JOIN public.planos_alimentares p ON p.id = r.plano_id
    WHERE r.id = refeicao_id AND (p.nutricionista_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.refeicoes r JOIN public.planos_alimentares p ON p.id = r.plano_id
    WHERE r.id = refeicao_id AND (p.nutricionista_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ));
CREATE INDEX idx_refeicao_itens_refeicao ON public.refeicao_itens(refeicao_id);

-- Seed: alimentos padrão do sistema (created_by NULL), cobrindo as categorias
-- do plano. Valores por porção-base indicada (aproximados, tipo TACO/USDA).
INSERT INTO public.alimentos (nome, categoria, unidade, porcao_base, kcal, proteina_g, carboidrato_g, gordura_g, fibra_g, sodio_mg) VALUES
('Banana', 'Frutas', 'g', 100, 89, 1.1, 22.8, 0.3, 2.6, 1),
('Maçã', 'Frutas', 'g', 100, 52, 0.3, 13.8, 0.2, 2.4, 1),
('Laranja', 'Frutas', 'g', 100, 47, 0.9, 11.8, 0.1, 2.4, 0),
('Mamão', 'Frutas', 'g', 100, 43, 0.5, 10.8, 0.3, 1.7, 8),
('Abacaxi', 'Frutas', 'g', 100, 50, 0.5, 13.1, 0.1, 1.4, 1),
('Morango', 'Frutas', 'g', 100, 32, 0.7, 7.7, 0.3, 2, 1),
('Uva', 'Frutas', 'g', 100, 69, 0.7, 18.1, 0.2, 0.9, 2),
('Manga', 'Frutas', 'g', 100, 60, 0.8, 15, 0.4, 1.6, 1),
('Melancia', 'Frutas', 'g', 100, 30, 0.6, 7.6, 0.2, 0.4, 1),
('Abacate', 'Frutas', 'g', 100, 160, 2, 8.5, 14.7, 6.7, 7),
('Peito de Frango Grelhado', 'Carnes', 'g', 100, 165, 31, 0, 3.6, 0, 74),
('Carne Bovina (Patinho)', 'Carnes', 'g', 100, 148, 22, 0, 6, 0, 60),
('Tilápia', 'Carnes', 'g', 100, 96, 20.1, 0, 1.7, 0, 52),
('Salmão', 'Carnes', 'g', 100, 208, 20, 0, 13, 0, 59),
('Ovo', 'Carnes', 'unidade', 1, 70, 6, 0.6, 5, 0, 70),
('Atum Enlatado (água)', 'Carnes', 'g', 100, 116, 25.5, 0, 1, 0, 250),
('Carne Suína (Lombo)', 'Carnes', 'g', 100, 143, 21, 0, 6, 0, 55),
('Peito de Peru', 'Carnes', 'g', 100, 135, 24, 0, 3.5, 0, 70),
('Brócolis', 'Legumes', 'g', 100, 34, 2.8, 6.6, 0.4, 2.6, 33),
('Cenoura', 'Legumes', 'g', 100, 41, 0.9, 9.6, 0.2, 2.8, 69),
('Batata Doce', 'Legumes', 'g', 100, 86, 1.6, 20.1, 0.1, 3, 55),
('Batata Inglesa', 'Legumes', 'g', 100, 77, 2, 17, 0.1, 2.2, 6),
('Arroz Branco Cozido', 'Legumes', 'g', 100, 130, 2.7, 28.2, 0.3, 0.4, 1),
('Arroz Integral Cozido', 'Legumes', 'g', 100, 123, 2.6, 25.8, 1, 1.8, 5),
('Feijão Carioca Cozido', 'Legumes', 'g', 100, 76, 4.8, 13.6, 0.5, 8.5, 2),
('Aveia em Flocos', 'Legumes', 'g', 100, 389, 16.9, 66.3, 6.9, 10.6, 2),
('Alface', 'Legumes', 'g', 100, 15, 1.4, 2.9, 0.2, 1.3, 28),
('Tomate', 'Legumes', 'g', 100, 18, 0.9, 3.9, 0.2, 1.2, 5),
('Abobrinha', 'Legumes', 'g', 100, 17, 1.2, 3.1, 0.3, 1, 2),
('Espinafre', 'Legumes', 'g', 100, 23, 2.9, 3.6, 0.4, 2.2, 79),
('Quinoa Cozida', 'Legumes', 'g', 100, 120, 4.4, 21.3, 1.9, 2.8, 7),
('Pão Francês', 'Industrializados', 'unidade', 1, 150, 4.6, 28.6, 1.5, 1.6, 290),
('Pão Integral (fatia)', 'Industrializados', 'unidade', 1, 70, 3, 12, 1, 1.9, 130),
('Macarrão Cozido', 'Industrializados', 'g', 100, 158, 5.8, 30.9, 0.9, 1.8, 6),
('Queijo Mussarela', 'Industrializados', 'g', 100, 280, 22, 2.2, 20, 0, 620),
('Requeijão', 'Industrializados', 'g', 100, 264, 9.6, 3.3, 24, 0, 460),
('Leite Integral', 'Industrializados', 'ml', 100, 61, 3.2, 4.8, 3.3, 0, 40),
('Iogurte Natural', 'Industrializados', 'g', 100, 61, 3.5, 4.7, 3.3, 0, 46),
('Chocolate Amargo 70%', 'Industrializados', 'g', 100, 546, 7.8, 45.9, 31.3, 10.9, 20),
('Whey Protein (dose)', 'Suplementos', 'g', 30, 120, 24, 3, 1.5, 0, 50),
('Creatina (dose)', 'Suplementos', 'g', 5, 0, 0, 0, 0, 0, 0),
('Albumina (dose)', 'Suplementos', 'g', 30, 108, 24, 1.5, 0, 0, 130),
('Barra de Proteína', 'Suplementos', 'unidade', 1, 200, 20, 20, 7, 5, 180),
('Água de Coco', 'Bebidas', 'ml', 100, 19, 0.7, 3.7, 0.2, 1.1, 105),
('Suco de Laranja Natural', 'Bebidas', 'ml', 100, 45, 0.7, 10.4, 0.2, 0.2, 1),
('Café (sem açúcar)', 'Bebidas', 'ml', 100, 2, 0.1, 0, 0, 0, 2),
('Refrigerante', 'Bebidas', 'ml', 100, 42, 0, 10.6, 0, 0, 5);
