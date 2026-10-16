-- Valor da avaliação direto na própria avaliação (sem cadastrar produto) + lançamento
-- automático no financeiro. Substitui a regra de 20261016000000_avaliacao_gera_financeiro.sql,
-- que buscava o preço num produto do catálogo. Este arquivo sozinho já deixa tudo
-- funcionando (pode ser rodado com ou sem o anterior; não rode o anterior depois dele).

-- 1) Valor padrão da avaliação: uma linha só, definida pelo admin em Financeiro.
CREATE TABLE IF NOT EXISTS public.config_financeiro (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  valor_avaliacao_centavos integer NOT NULL DEFAULT 0
    CHECK (valor_avaliacao_centavos BETWEEN 0 AND 100000000),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.config_financeiro TO authenticated;
GRANT ALL ON public.config_financeiro TO service_role;
ALTER TABLE public.config_financeiro ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "config_financeiro read all auth" ON public.config_financeiro;
CREATE POLICY "config_financeiro read all auth" ON public.config_financeiro
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "config_financeiro admin write" ON public.config_financeiro;
CREATE POLICY "config_financeiro admin write" ON public.config_financeiro FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP TRIGGER IF EXISTS trg_config_financeiro_updated ON public.config_financeiro;
CREATE TRIGGER trg_config_financeiro_updated BEFORE UPDATE ON public.config_financeiro
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Valor inicial: o preço do produto de avaliação que já existia no catálogo; se não houver,
-- R$ 150,00 (o valor do catálogo original). Depois é só ajustar em Financeiro.
INSERT INTO public.config_financeiro (id, valor_avaliacao_centavos)
SELECT true, COALESCE(
  (SELECT preco_centavos FROM public.produtos WHERE tipo = 'avaliacao' AND ativo ORDER BY created_at DESC LIMIT 1),
  15000)
ON CONFLICT (id) DO NOTHING;

-- 2) Cada avaliação guarda o seu valor. NULL = avaliação anterior a esta regra (sem valor registrado).
ALTER TABLE public.avaliacoes_fisicas
  ADD COLUMN IF NOT EXISTS valor_centavos integer CHECK (valor_centavos IS NULL OR valor_centavos >= 0);

-- 3) Vínculo venda <-> avaliação. O índice único garante no máximo 1 lançamento por
--    avaliação (NULL não conflita, então vendas comuns continuam livres).
ALTER TABLE public.vendas
  ADD COLUMN IF NOT EXISTS avaliacao_id uuid REFERENCES public.avaliacoes_fisicas(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS vendas_avaliacao_unica ON public.vendas (avaliacao_id);

-- 4) Ao criar a avaliação, o banco grava nela o valor padrão. Quem salva não escolhe o valor
--    (o que vier no insert é ignorado), então nenhuma avaliação escapa do financeiro.
CREATE OR REPLACE FUNCTION public.avaliacao_define_valor()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.valor_centavos := COALESCE((SELECT valor_avaliacao_centavos FROM public.config_financeiro LIMIT 1), 0);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_avaliacao_define_valor ON public.avaliacoes_fisicas;
CREATE TRIGGER trg_avaliacao_define_valor BEFORE INSERT ON public.avaliacoes_fisicas
  FOR EACH ROW EXECUTE FUNCTION public.avaliacao_define_valor();

-- 5) Depois de criada, lança a venda com o valor da avaliação. Valor zero = sem cobrança
--    (nada é lançado). O produto "avaliacao" do catálogo é só a categoria do lançamento:
--    se não existir, é criado aqui — ninguém precisa cadastrar. Qualquer erro vira
--    WARNING: nunca impede de salvar a avaliação.
CREATE OR REPLACE FUNCTION public.avaliacao_gera_venda()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_produto uuid;
BEGIN
  IF COALESCE(NEW.valor_centavos, 0) <= 0 THEN
    RETURN NEW;
  END IF;

  BEGIN
    SELECT id INTO v_produto
      FROM public.produtos
     WHERE tipo = 'avaliacao'
     ORDER BY ativo DESC, created_at ASC
     LIMIT 1;

    IF v_produto IS NULL THEN
      INSERT INTO public.produtos (tipo, nome, duracao_meses, preco_centavos, ativo)
      VALUES ('avaliacao', 'Avaliação Física Personalizada', 0, NEW.valor_centavos, true)
      RETURNING id INTO v_produto;
    END IF;

    INSERT INTO public.vendas
      (aluno_id, personal_id, produto_id, valor_centavos, data_venda, inicio_vigencia, status, observacao, avaliacao_id)
    VALUES
      (NEW.aluno_id, NEW.personal_id, v_produto, NEW.valor_centavos, NEW.data_avaliacao, NEW.data_avaliacao, 'ativo',
       'Gerado automaticamente pela avaliação de ' || to_char(NEW.data_avaliacao, 'DD/MM/YYYY'), NEW.id)
    ON CONFLICT (avaliacao_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'avaliacao_gera_venda: nao foi possivel lancar o financeiro da avaliacao %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_avaliacao_gera_venda ON public.avaliacoes_fisicas;
CREATE TRIGGER trg_avaliacao_gera_venda AFTER INSERT ON public.avaliacoes_fisicas
  FOR EACH ROW EXECUTE FUNCTION public.avaliacao_gera_venda();

-- 6) Se a data da avaliação for editada, a data do lançamento acompanha.
CREATE OR REPLACE FUNCTION public.avaliacao_sincroniza_venda()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.vendas
     SET data_venda = NEW.data_avaliacao,
         inicio_vigencia = NEW.data_avaliacao
   WHERE avaliacao_id = NEW.id AND status = 'ativo';
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_avaliacao_sincroniza_venda ON public.avaliacoes_fisicas;
CREATE TRIGGER trg_avaliacao_sincroniza_venda AFTER UPDATE OF data_avaliacao ON public.avaliacoes_fisicas
  FOR EACH ROW WHEN (OLD.data_avaliacao IS DISTINCT FROM NEW.data_avaliacao)
  EXECUTE FUNCTION public.avaliacao_sincroniza_venda();

-- 7) Se a avaliação for excluída, o lançamento é cancelado (não apagado: fica no
--    histórico e deixa de contar na receita).
CREATE OR REPLACE FUNCTION public.avaliacao_cancela_venda()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.vendas
     SET status = 'cancelado',
         observacao = COALESCE(observacao || ' — ', '') || 'avaliação removida'
   WHERE avaliacao_id = OLD.id AND status = 'ativo';
  RETURN OLD;
END; $$;

DROP TRIGGER IF EXISTS trg_avaliacao_cancela_venda ON public.avaliacoes_fisicas;
CREATE TRIGGER trg_avaliacao_cancela_venda BEFORE DELETE ON public.avaliacoes_fisicas
  FOR EACH ROW EXECUTE FUNCTION public.avaliacao_cancela_venda();

-- Faz a API (PostgREST) enxergar a tabela e a coluna novas sem esperar.
NOTIFY pgrst, 'reload schema';
