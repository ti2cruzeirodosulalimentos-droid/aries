import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Apenas administradores");
}

const CustomFieldInput = z.object({
  id: z.string().uuid().optional(),
  contexto: z.enum(["anamnese", "avaliacao"]),
  subgrupo: z.string().optional().nullable(),
  label: z.string().min(1),
  tipo: z.enum(["texto", "textarea", "numero", "escolha", "escala", "booleano", "data"]),
  opcoes: z.array(z.string()).default([]),
  obrigatorio: z.boolean().default(false),
  ordem: z.number().int().default(0),
  ativo: z.boolean().default(true),
});

export const upsertCustomField = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => CustomFieldInput.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { id, ...rest } = data;
    const payload = { ...rest, opcoes: rest.opcoes };
    const q = id
      ? context.supabase.from("custom_fields").update(payload).eq("id", id).select("*").single()
      : context.supabase.from("custom_fields").insert(payload).select("*").single();
    const { data: row, error } = await q;
    if (error) throw error;
    await context.supabase.from("audit_log").insert({ user_id: context.userId, acao: id ? "update" : "create", entidade: "custom_fields", entidade_id: row.id, detalhes: payload });
    return row;
  });

export const deleteCustomField = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("custom_fields").delete().eq("id", data.id);
    if (error) throw error;
    await context.supabase.from("audit_log").insert({ user_id: context.userId, acao: "delete", entidade: "custom_fields", entidade_id: data.id });
    return { ok: true };
  });

const CategoriaInput = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().min(1),
  cor: z.string().default("#3B82F6"),
  icone: z.string().nullable().optional(),
  ordem: z.number().int().default(0),
  ativo: z.boolean().default(true),
});

export const upsertCategoria = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => CategoriaInput.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { id, ...rest } = data;
    const q = id
      ? context.supabase.from("exercicio_categorias").update(rest).eq("id", id).select("*").single()
      : context.supabase.from("exercicio_categorias").insert(rest).select("*").single();
    const { data: row, error } = await q;
    if (error) throw error;
    return row;
  });

export const deleteCategoria = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("exercicio_categorias").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

const ProtocoloInput = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().min(1),
  descricao: z.string().nullable().optional(),
  genero: z.enum(["masculino", "feminino", "ambos"]).default("ambos"),
  dobras_necessarias: z.array(z.string()).default([]),
  formula: z.record(z.string(), z.any()).default({}),
  ativo: z.boolean().default(true),
});

export const upsertProtocolo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ProtocoloInput.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { id, ...rest } = data;
    const q = id
      ? context.supabase.from("protocolos_avaliacao").update(rest).eq("id", id).select("*").single()
      : context.supabase.from("protocolos_avaliacao").insert(rest).select("*").single();
    const { data: row, error } = await q;
    if (error) throw error;
    return row;
  });

export const deleteProtocolo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("protocolos_avaliacao").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const exportBackup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const [fields, cats, protos] = await Promise.all([
      context.supabase.from("custom_fields").select("*"),
      context.supabase.from("exercicio_categorias").select("*"),
      context.supabase.from("protocolos_avaliacao").select("*"),
    ]);
    return {
      versao: 1,
      exportado_em: new Date().toISOString(),
      custom_fields: fields.data ?? [],
      exercicio_categorias: cats.data ?? [],
      protocolos_avaliacao: protos.data ?? [],
    };
  });
