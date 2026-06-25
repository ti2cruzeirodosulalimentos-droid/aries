
CREATE TABLE public.mensagens_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  canal text NOT NULL CHECK (canal IN ('whatsapp','email','ambos')) DEFAULT 'whatsapp',
  assunto text,
  corpo text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mensagens_templates TO authenticated;
GRANT ALL ON public.mensagens_templates TO service_role;

ALTER TABLE public.mensagens_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners gerenciam seus templates"
ON public.mensagens_templates FOR ALL TO authenticated
USING (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_mensagens_templates_updated
BEFORE UPDATE ON public.mensagens_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Templates de exemplo (seed) para todos os personals/admins existentes
INSERT INTO public.mensagens_templates (owner_id, nome, canal, assunto, corpo)
SELECT ur.user_id,
       'Lembrete de treino',
       'whatsapp',
       NULL,
       'Olá {nome}! 💪 Lembrete do seu treino de hoje. Bora forjar a melhor versão de você? — Equipe ARIÉS'
FROM public.user_roles ur
WHERE ur.role IN ('personal','admin')
ON CONFLICT DO NOTHING;

INSERT INTO public.mensagens_templates (owner_id, nome, canal, assunto, corpo)
SELECT ur.user_id,
       'Renovação de plano',
       'ambos',
       'Seu plano ARIÉS está vencendo',
       'Oi {nome}, seu plano vence em {dias} dias ({vencimento}). Vamos renovar e manter a evolução? — ARIÉS'
FROM public.user_roles ur
WHERE ur.role IN ('personal','admin')
ON CONFLICT DO NOTHING;
