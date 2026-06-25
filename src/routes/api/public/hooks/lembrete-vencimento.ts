import { createFileRoute } from "@tanstack/react-router";

// Cron-disparado: percorre campanhas ativas e gera registros em mensagens_enviadas
// para alunos cujo plan_expires_at = hoje + dias_antes.
export const Route = createFileRoute("/api/public/hooks/lembrete-vencimento")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey");
        if (!apikey || apikey !== process.env.SUPABASE_PUBLISHABLE_KEY) {
          return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: campanhas, error: cErr } = await supabaseAdmin
          .from("campanhas_vencimento")
          .select("id, dias_antes, canal, template_id, ativo, mensagens_templates(corpo, assunto)")
          .eq("ativo", true);
        if (cErr) return new Response(JSON.stringify({ error: cErr.message }), { status: 500 });

        const hoje = new Date();
        let total = 0;
        const detalhes: Array<{ campanha: string; alunos: number }> = [];

        for (const c of campanhas ?? []) {
          const alvo = new Date(hoje);
          alvo.setDate(alvo.getDate() + (c.dias_antes ?? 0));
          const alvoStr = alvo.toISOString().slice(0, 10);

          const { data: alunos } = await supabaseAdmin
            .from("alunos")
            .select("id, full_name, whatsapp, email, plan_expires_at")
            .eq("plan_expires_at", alvoStr);

          const tpl = c.mensagens_templates as { corpo?: string; assunto?: string } | null;
          const corpo = tpl?.corpo ?? "";
          const assunto = tpl?.assunto ?? "Lembrete ARIÉS";

          const rows = (alunos ?? []).map((a) => {
            const dias = c.dias_antes ?? 0;
            const venc = a.plan_expires_at ?? "";
            const body = corpo
              .replace(/\{nome\}/g, a.full_name ?? "")
              .replace(/\{dias\}/g, String(dias))
              .replace(/\{vencimento\}/g, venc);
            return {
              aluno_id: a.id,
              template_id: c.template_id,
              campanha_id: c.id,
              canal: c.canal,
              destinatario: c.canal === "email" ? a.email : a.whatsapp,
              corpo: c.canal === "email" ? `${assunto}\n\n${body}` : body,
              status: "pendente",
            };
          });
          if (rows.length) {
            await supabaseAdmin.from("mensagens_enviadas").insert(rows);
            total += rows.length;
            detalhes.push({ campanha: c.id, alunos: rows.length });
          }
        }
        return Response.json({ ok: true, total, detalhes, ts: new Date().toISOString() });
      },
    },
  },
});
