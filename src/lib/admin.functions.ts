import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Admin disables a user's login (bans permanently) while preserving all related data.
 * Removes user_roles entries so the user cannot escalate, but keeps alunos/vendas/treinos rows.
 */
export const adminDisableAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ targetUserId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Apenas administradores podem excluir contas");
    if (data.targetUserId === context.userId) throw new Error("Você não pode excluir a própria conta");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Remove acessos
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.targetUserId);
    await supabaseAdmin.from("permissoes").delete().eq("user_id", data.targetUserId);

    // Desativa o login (mantém auth.users + relação intacta)
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.targetUserId, {
      ban_duration: "876000h", // ~100 anos
    });
    if (error) throw error;

    return { ok: true };
  });

/**
 * Reativa uma conta previamente banida.
 */
export const adminEnableAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ targetUserId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Apenas administradores");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.targetUserId, { ban_duration: "none" });
    if (error) throw error;
    return { ok: true };
  });

/**
 * Vincula o cadastro de um aluno (feito pelo personal/nutricionista antes de
 * ele ter conta) à conta de login que o próprio aluno criou depois — casando
 * pelo e-mail. Não move nenhum dado: só define alunos.user_id, e o histórico
 * inteiro (anamnese, avaliações, treinos, fotos) já fica visível pra ele,
 * porque tudo é ligado ao aluno_id, que não muda.
 */
export const linkAlunoAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ alunoId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    // RLS do próprio contexto do chamador já garante que só quem é
    // personal_id/nutricionista_id/admin desse aluno consegue lê-lo aqui.
    const { data: aluno, error: alunoErr } = await context.supabase
      .from("alunos")
      .select("id, email, user_id, full_name")
      .eq("id", data.alunoId)
      .single();
    if (alunoErr || !aluno) throw new Error("Aluno não encontrado ou sem permissão");
    if (!aluno.email) throw new Error("Este aluno não tem e-mail cadastrado — adicione o e-mail primeiro (deve ser o mesmo que ele vai usar pra criar a conta).");
    if (aluno.user_id) throw new Error("Este aluno já tem uma conta vinculada.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const alvo = aluno.email.trim().toLowerCase();
    let matched: { id: string } | null = null;
    for (let page = 1; page <= 20 && !matched; page++) {
      const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw error;
      matched = list.users.find((u) => u.email?.toLowerCase() === alvo) ?? null;
      if (list.users.length < 200) break;
    }
    if (!matched) {
      throw new Error(`Nenhuma conta encontrada com o e-mail ${aluno.email}. O aluno precisa criar a conta (mesmo e-mail do cadastro) antes de vincular.`);
    }

    const { error: updErr } = await supabaseAdmin.from("alunos").update({ user_id: matched.id }).eq("id", data.alunoId);
    if (updErr) throw updErr;
    return { ok: true, email: aluno.email };
  });

/**
 * OCR: extrai treinos ABCDE de uma foto de ficha usando IA visão (Gemini).
 * Retorna estrutura JSON pronta para inserir como treinos + treino_exercicios.
 */
const TreinoItem = z.object({
  letra: z.enum(["A", "B", "C", "D", "E"]),
  nome: z.string().default(""),
  objetivo: z.string().optional().default(""),
  exercicios: z.array(z.object({
    nome: z.string(),
    series: z.number().int().min(1).max(20).default(3),
    repeticoes: z.string().default("10-12"),
    descanso_seg: z.number().int().min(0).max(600).default(60),
    carga: z.string().optional().default(""),
    observacao: z.string().optional().default(""),
  })),
});

export const extractTreinoFromImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ imageDataUrl: z.string().min(20) }).parse(input),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY não configurada");

    const systemPrompt = `Você é um especialista em musculação. Analise a foto da ficha de treino e extraia TODOS os treinos (A, B, C, D, E quando existirem) com seus exercícios.

Para cada exercício, identifique: nome (padronize em português, ex: "Supino reto com barra"), número de séries (inteiro), faixa de repetições (string ex: "10-12" ou "12"), descanso em segundos (estimar 60 para hipertrofia, 90-120 para força, 30 para resistência), carga sugerida (se visível na ficha) e observação opcional.

Responda APENAS com JSON válido no formato:
{"treinos":[{"letra":"A","nome":"Peito e Tríceps","objetivo":"Hipertrofia","exercicios":[{"nome":"Supino reto","series":4,"repeticoes":"10-12","descanso_seg":60,"carga":"","observacao":""}]}]}

Não inclua texto fora do JSON. Se algum dado não estiver claro, use os defaults (3 séries, 10-12 reps, 60s descanso).`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Extraia os treinos desta ficha:" },
              { type: "image_url", image_url: { url: data.imageDataUrl } },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const txt = await response.text();
      if (response.status === 429) throw new Error("Limite de uso da IA atingido. Tente novamente em instantes.");
      if (response.status === 402) throw new Error("Créditos da IA esgotados. Adicione créditos no workspace.");
      throw new Error(`IA falhou (${response.status}): ${txt.slice(0, 200)}`);
    }

    const json = await response.json();
    const content = json?.choices?.[0]?.message?.content ?? "{}";
    let parsed: unknown;
    try {
      parsed = typeof content === "string" ? JSON.parse(content) : content;
    } catch {
      throw new Error("IA retornou resposta inválida. Tente outra foto mais nítida.");
    }

    const result = z.object({ treinos: z.array(TreinoItem) }).safeParse(parsed);
    if (!result.success) throw new Error("Não foi possível interpretar a ficha. Tente uma foto mais nítida.");
    return result.data;
  });
