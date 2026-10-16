-- Toda avaliação física gera automaticamente um lançamento no financeiro (vendas),
-- pelo preço fixo do produto de avaliação ativo no catálogo (Financeiro > Produtos).

-- 1) Vínculo venda <-> avaliação. O índice único garante no máximo 1 lançamento por
--    avaliação (NULL não conflita, então vendas comuns continuam livres).
ALTER TABLE public.vendas
  ADD COLUMN IF NOT EXISTS avaliacao_id uuid REFERENCES public.avaliacoes_fisicas(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS vendas_avaliacao_unica ON public.vendas (avaliacao_id);

-- 2) Ao criar uma avaliação, lança a venda pelo preço atual do produto de avaliação.
--    Se não houver produto ativo (ou preço zero), a avaliação salva normalmente, sem lançamento.
--    Qualquer erro no lançamento vira WARNING: nunca impede de salvar a avaliação.
CREATE OR REPLACE FUNCTION public.avaliacao_gera_venda()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_produto uuid;
  v_preco integer;
BEGIN
  SELECT id, preco_centavos INTO v_produto, v_preco
    FROM public.produtos
   WHERE tipo = 'avaliacao' AND ativo
   ORDER BY created_at DESC
   LIMIT 1;

  IF v_produto IS NULL OR COALESCE(v_preco, 0) <= 0 THEN
    RETURN NEW;
  END IF;

  BEGIN
    INSERT INTO public.vendas
      (aluno_id, personal_id, produto_id, valor_centavos, data_venda, inicio_vigencia, status, observacao, avaliacao_id)
    VALUES
      (NEW.aluno_id, NEW.personal_id, v_produto, v_preco, NEW.data_avaliacao, NEW.data_avaliacao, 'ativo',
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

-- 3) Se a data da avaliação for editada, a data do lançamento acompanha.
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

-- 4) Se a avaliação for excluída, o lançamento é cancelado (não apagado: fica no
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
