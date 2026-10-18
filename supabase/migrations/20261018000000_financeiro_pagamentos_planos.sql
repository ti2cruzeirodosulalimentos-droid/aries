-- Financeiro: pendente/pago, plano do aluno (cobrança automática todo período), plano que inclui avaliação
-- e lançamentos avulsos.
--
-- Rode os 4 BLOCOS abaixo, em ordem, um de cada vez, no SQL Editor do Supabase (é tudo idempotente).
-- Rode ANTES de publicar o app novo: o app antigo continua funcionando com o banco já migrado
-- (vendas novas nascem "pago", como antes); o app novo é que depende destas colunas.
--
-- Regras:
--  * vendas.pagamento_status: 'pendente' | 'pago'. O que já existe vira 'pago' (recebido na data da venda).
--  * Avaliação individual e mensalidade nascem 'pendente'; o personal marca como pago.
--  * assinaturas = plano do aluno. gerar_mensalidades() cria a cobrança de cada período (idempotente).
--  * produtos.avaliacao_a_cada_meses = o plano inclui 1 avaliação a cada N meses. Dentro da cota, a avaliação
--    não gera cobrança (valor 0, coberta_por_plano); a que passar da cota é cobrada normalmente.

-- ==== BLOCO 1: tabelas e colunas ====

ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS avaliacao_a_cada_meses integer;
ALTER TABLE public.produtos DROP CONSTRAINT IF EXISTS produtos_avaliacao_a_cada_meses_check;
ALTER TABLE public.produtos ADD CONSTRAINT produtos_avaliacao_a_cada_meses_check
  CHECK (avaliacao_a_cada_meses IS NULL OR avaliacao_a_cada_meses BETWEEN 1 AND 24);

CREATE TABLE IF NOT EXISTS public.assinaturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  personal_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  produto_id uuid NOT NULL REFERENCES public.produtos(id),
  valor_centavos integer NOT NULL CHECK (valor_centavos > 0 AND valor_centavos <= 100000000),
  inicio date NOT NULL DEFAULT CURRENT_DATE,
  dia_vencimento smallint NOT NULL DEFAULT 1 CHECK (dia_vencimento BETWEEN 1 AND 31),
  fim date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT assinaturas_fim_check CHECK (fim IS NULL OR fim >= inicio)
);
CREATE INDEX IF NOT EXISTS assinaturas_aluno_idx ON public.assinaturas (aluno_id);
CREATE INDEX IF NOT EXISTS assinaturas_personal_idx ON public.assinaturas (personal_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assinaturas TO authenticated;
GRANT ALL ON public.assinaturas TO service_role;
ALTER TABLE public.assinaturas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "assinaturas personal scope" ON public.assinaturas;
CREATE POLICY "assinaturas personal scope" ON public.assinaturas FOR ALL TO authenticated
  USING (personal_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK ((personal_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
              AND EXISTS (SELECT 1 FROM public.alunos al WHERE al.id = assinaturas.aluno_id));
DROP TRIGGER IF EXISTS trg_assinaturas_updated ON public.assinaturas;
CREATE TRIGGER trg_assinaturas_updated BEFORE UPDATE ON public.assinaturas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.vendas
  ADD COLUMN IF NOT EXISTS pagamento_status text NOT NULL DEFAULT 'pago',
  ADD COLUMN IF NOT EXISTS pago_em date,
  ADD COLUMN IF NOT EXISTS assinatura_id uuid REFERENCES public.assinaturas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS competencia date;
ALTER TABLE public.vendas DROP CONSTRAINT IF EXISTS vendas_pagamento_status_check;
ALTER TABLE public.vendas ADD CONSTRAINT vendas_pagamento_status_check CHECK (pagamento_status IN ('pendente', 'pago'));
CREATE UNIQUE INDEX IF NOT EXISTS vendas_assinatura_competencia_unica ON public.vendas (assinatura_id, competencia);
CREATE INDEX IF NOT EXISTS vendas_pendentes_idx ON public.vendas (data_venda) WHERE pagamento_status = 'pendente';

ALTER TABLE public.avaliacoes_fisicas
  ADD COLUMN IF NOT EXISTS coberta_por_plano boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS assinatura_id uuid REFERENCES public.assinaturas(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.lancamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  personal_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  aluno_id uuid REFERENCES public.alunos(id) ON DELETE SET NULL,
  tipo text NOT NULL DEFAULT 'entrada' CHECK (tipo IN ('entrada', 'saida')),
  descricao text NOT NULL CHECK (char_length(btrim(descricao)) BETWEEN 1 AND 200),
  valor_centavos integer NOT NULL CHECK (valor_centavos > 0 AND valor_centavos <= 100000000),
  data_lancamento date NOT NULL DEFAULT CURRENT_DATE,
  pagamento_status text NOT NULL DEFAULT 'pago' CHECK (pagamento_status IN ('pendente', 'pago')),
  pago_em date,
  forma_pagamento text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lancamentos_personal_data_idx ON public.lancamentos (personal_id, data_lancamento);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lancamentos TO authenticated;
GRANT ALL ON public.lancamentos TO service_role;
ALTER TABLE public.lancamentos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lancamentos personal scope" ON public.lancamentos;
CREATE POLICY "lancamentos personal scope" ON public.lancamentos FOR ALL TO authenticated
  USING (personal_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK ((personal_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
              AND (lancamentos.aluno_id IS NULL OR EXISTS (SELECT 1 FROM public.alunos al WHERE al.id = lancamentos.aluno_id)));

-- ==== BLOCO 2: pendente/pago (gatilhos) ====

-- o que já existe foi recebido na data da venda (feito antes do gatilho existir)
UPDATE public.vendas SET pago_em = data_venda WHERE pagamento_status = 'pago' AND pago_em IS NULL;

CREATE OR REPLACE FUNCTION public.vendas_ajusta_pagamento()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.pagamento_status = 'pago' THEN
    IF NEW.pago_em IS NULL THEN
      NEW.pago_em := CASE WHEN TG_OP = 'INSERT' THEN COALESCE(NEW.data_venda, CURRENT_DATE) ELSE CURRENT_DATE END;
    END IF;
  ELSE
    NEW.pago_em := NULL;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_vendas_pagamento ON public.vendas;
CREATE TRIGGER trg_vendas_pagamento BEFORE INSERT OR UPDATE ON public.vendas
  FOR EACH ROW EXECUTE FUNCTION public.vendas_ajusta_pagamento();

CREATE OR REPLACE FUNCTION public.lancamentos_ajusta_pagamento()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.pagamento_status = 'pago' THEN
    IF NEW.pago_em IS NULL THEN
      NEW.pago_em := CASE WHEN TG_OP = 'INSERT' THEN COALESCE(NEW.data_lancamento, CURRENT_DATE) ELSE CURRENT_DATE END;
    END IF;
  ELSE
    NEW.pago_em := NULL;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_lancamentos_pagamento ON public.lancamentos;
CREATE TRIGGER trg_lancamentos_pagamento BEFORE INSERT OR UPDATE ON public.lancamentos
  FOR EACH ROW EXECUTE FUNCTION public.lancamentos_ajusta_pagamento();
DROP TRIGGER IF EXISTS trg_lancamentos_updated ON public.lancamentos;
CREATE TRIGGER trg_lancamentos_updated BEFORE UPDATE ON public.lancamentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==== BLOCO 3: avaliação (cobertura pelo plano + cobrança pendente) ====

-- Vale 1 avaliação a cada N meses por plano: coberta se o aluno tem plano com avaliação incluída na data
-- e nenhuma avaliação coberta nos últimos N meses (a janela é aberta no começo: exatamente N meses depois já vale).
CREATE OR REPLACE FUNCTION public.avaliacao_cobertura(p_aluno uuid, p_data date DEFAULT CURRENT_DATE)
RETURNS TABLE (coberta boolean, motivo text, assinatura_id uuid, plano text, a_cada_meses integer, proxima_livre date)
LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE
  s_id uuid; s_nome text; s_n integer; ult date;
BEGIN
  SELECT a.id, p.nome, p.avaliacao_a_cada_meses
    INTO s_id, s_nome, s_n
    FROM public.assinaturas a
    JOIN public.produtos p ON p.id = a.produto_id
   WHERE a.aluno_id = p_aluno
     AND a.inicio <= p_data AND (a.fim IS NULL OR a.fim >= p_data)
   ORDER BY (p.avaliacao_a_cada_meses IS NULL), p.avaliacao_a_cada_meses, a.inicio DESC
   LIMIT 1;

  IF s_id IS NULL THEN
    RETURN QUERY SELECT false, 'sem_plano'::text, NULL::uuid, NULL::text, NULL::integer, NULL::date;
    RETURN;
  END IF;
  IF s_n IS NULL THEN
    RETURN QUERY SELECT false, 'plano_sem_avaliacao'::text, s_id, s_nome, NULL::integer, NULL::date;
    RETURN;
  END IF;

  SELECT max(f.data_avaliacao) INTO ult
    FROM public.avaliacoes_fisicas f
   WHERE f.aluno_id = p_aluno AND f.coberta_por_plano
     AND f.data_avaliacao <= p_data
     AND f.data_avaliacao > (p_data - make_interval(months => s_n))::date;

  IF ult IS NULL THEN
    RETURN QUERY SELECT true, 'incluida'::text, s_id, s_nome, s_n, NULL::date;
  ELSE
    RETURN QUERY SELECT false, 'cota_usada'::text, s_id, s_nome, s_n, (ult + make_interval(months => s_n))::date;
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.avaliacao_define_valor()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_coberta boolean; v_assinatura uuid;
BEGIN
  NEW.coberta_por_plano := false;
  NEW.assinatura_id := NULL;
  BEGIN
    SELECT c.coberta, c.assinatura_id INTO v_coberta, v_assinatura
      FROM public.avaliacao_cobertura(NEW.aluno_id, NEW.data_avaliacao) c;
    IF COALESCE(v_coberta, false) THEN
      NEW.coberta_por_plano := true;
      NEW.assinatura_id := v_assinatura;
      NEW.valor_centavos := 0;
      RETURN NEW;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'avaliacao_define_valor: cobertura pelo plano nao verificada (aluno %): %', NEW.aluno_id, SQLERRM;
  END;
  NEW.valor_centavos := COALESCE((SELECT valor_avaliacao_centavos FROM public.config_financeiro LIMIT 1), 0);
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.avaliacao_gera_venda()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_produto uuid;
BEGIN
  IF NEW.coberta_por_plano OR COALESCE(NEW.valor_centavos, 0) <= 0 THEN
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
      (aluno_id, personal_id, produto_id, valor_centavos, data_venda, inicio_vigencia, status, pagamento_status, observacao, avaliacao_id)
    VALUES
      (NEW.aluno_id, NEW.personal_id, v_produto, NEW.valor_centavos, NEW.data_avaliacao, NEW.data_avaliacao, 'ativo', 'pendente',
       'Gerado automaticamente pela avaliação de ' || to_char(NEW.data_avaliacao, 'DD/MM/YYYY'), NEW.id)
    ON CONFLICT (avaliacao_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'avaliacao_gera_venda: nao foi possivel lancar o financeiro da avaliacao %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END; $$;

-- Excluir a avaliação cancela só a cobrança ainda PENDENTE; o que já foi pago continua (dinheiro recebido).
CREATE OR REPLACE FUNCTION public.avaliacao_cancela_venda()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.vendas
     SET status = 'cancelado',
         observacao = COALESCE(observacao || ' — ', '') || 'avaliação removida'
   WHERE avaliacao_id = OLD.id AND status = 'ativo' AND pagamento_status = 'pendente';
  RETURN OLD;
END; $$;

-- ==== BLOCO 4: mensalidade automática ====

-- Cria a cobrança (pendente) de cada período dos planos dos alunos, do início até o mês atual.
-- Idempotente (unique assinatura+competência); cobrança cancelada não volta. Recupera no máximo 12 meses atrasados.
CREATE OR REPLACE FUNCTION public._gerar_mensalidades(p_hoje date, p_personal uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  a record;
  mes date; due date; k integer; n integer; novos integer := 0;
  mes_atual date := date_trunc('month', p_hoje::timestamp)::date;
BEGIN
  FOR a IN
    SELECT s.id, s.aluno_id, s.personal_id, s.produto_id, s.valor_centavos, s.inicio, s.dia_vencimento, s.fim,
           GREATEST(COALESCE(p.duracao_meses, 1), 1) AS per
      FROM public.assinaturas s
      JOIN public.produtos p ON p.id = s.produto_id
     WHERE s.inicio <= (mes_atual + interval '1 month' - interval '1 day')::date
       AND (p_personal IS NULL OR s.personal_id = p_personal)
  LOOP
    k := 0;
    LOOP
      mes := (date_trunc('month', a.inicio::timestamp) + make_interval(months => k * a.per))::date;
      EXIT WHEN mes > mes_atual;
      IF mes >= (mes_atual - interval '12 months')::date THEN
        due := mes + (LEAST(a.dia_vencimento, EXTRACT(day FROM (mes + interval '1 month' - interval '1 day'))::integer) - 1);
        IF due >= a.inicio AND (a.fim IS NULL OR due <= a.fim) THEN
          INSERT INTO public.vendas
            (aluno_id, personal_id, produto_id, valor_centavos, data_venda, inicio_vigencia, status, pagamento_status,
             observacao, assinatura_id, competencia)
          VALUES
            (a.aluno_id, a.personal_id, a.produto_id, a.valor_centavos, due, due, 'ativo', 'pendente',
             'Mensalidade ' || to_char(mes, 'MM/YYYY'), a.id, mes)
          ON CONFLICT (assinatura_id, competencia) DO NOTHING;
          GET DIAGNOSTICS n = ROW_COUNT;
          novos := novos + n;
        END IF;
      END IF;
      k := k + 1;
    END LOOP;
  END LOOP;
  RETURN novos;
END; $$;
REVOKE ALL ON FUNCTION public._gerar_mensalidades(date, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._gerar_mensalidades(date, uuid) TO service_role;

-- O app chama ao abrir o Financeiro: gera só o que é do usuário (admin: de todos).
CREATE OR REPLACE FUNCTION public.gerar_mensalidades()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN 0;
  END IF;
  RETURN public._gerar_mensalidades(CURRENT_DATE, CASE WHEN public.has_role(auth.uid(), 'admin') THEN NULL ELSE auth.uid() END);
END; $$;
REVOKE ALL ON FUNCTION public.gerar_mensalidades() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gerar_mensalidades() TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
