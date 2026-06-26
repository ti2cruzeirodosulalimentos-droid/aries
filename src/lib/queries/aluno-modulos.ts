import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { qk } from "@/lib/query-keys";

// Vários módulos por-aluno usam tabelas fora dos tipos gerados → cast pontual.
const db = supabase as any;

// ─── Cabeçalho do aluno (nome + foto) ────────────────────────────────────────
export function useAlunoBasic(alunoId: string) {
  return useQuery({
    queryKey: qk.alunoBasic(alunoId),
    queryFn: async () => {
      const { data } = await supabase.from("alunos").select("full_name, photo_url").eq("id", alunoId).single();
      return data;
    },
  });
}

// ─── Anamnese (registro único, mais recente) ─────────────────────────────────
export function useAnamnese(alunoId: string) {
  return useQuery({
    queryKey: qk.anamnese.byAluno(alunoId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("anamneses")
        .select("*")
        .eq("aluno_id", alunoId)
        .order("data_anamnese", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveAnamnese(alunoId: string, personalId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ values, existingId }: { values: Record<string, any>; existingId?: string }) => {
      if (!personalId) throw new Error("Sessão expirada");
      const payload = {
        ...values,
        aluno_id: alunoId,
        personal_id: personalId,
        data_anamnese: values.data_anamnese ?? new Date().toISOString().slice(0, 10),
      };
      if (existingId) {
        const { error } = await db.from("anamneses").update(payload).eq("id", existingId);
        if (error) throw error;
      } else {
        const { error } = await db.from("anamneses").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.anamnese.byAluno(alunoId) }),
  });
}

// ─── Metas ───────────────────────────────────────────────────────────────────
export function useMetas(alunoId: string) {
  return useQuery({
    queryKey: qk.metas.byAluno(alunoId),
    queryFn: async () => {
      const { data, error } = await db.from("metas").select("*").eq("aluno_id", alunoId).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export function useCreateMeta(alunoId: string, personalId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Record<string, any>) => {
      const { error } = await db.from("metas").insert({
        aluno_id: alunoId,
        personal_id: personalId,
        tipo: values.tipo,
        descricao: values.descricao,
        unidade: values.unidade ?? null,
        valor_inicial: values.valor_inicial ?? null,
        valor_atual: values.valor_atual ?? values.valor_inicial ?? null,
        valor_alvo: values.valor_alvo,
        data_alvo: values.data_alvo ?? null,
        observacoes: values.observacoes ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.metas.byAluno(alunoId) }),
  });
}

export function useUpdateMeta(alunoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ mId, patch }: { mId: string; patch: Record<string, any> }) => {
      const { error } = await db.from("metas").update(patch).eq("id", mId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.metas.byAluno(alunoId) }),
  });
}

export function useRemoveMeta(alunoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (mId: string) => {
      const { error } = await db.from("metas").delete().eq("id", mId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.metas.byAluno(alunoId) }),
  });
}

// ─── Nutrição (plano ativo + refeições) ──────────────────────────────────────
export function usePlanoAtivo(alunoId: string) {
  return useQuery({
    queryKey: qk.nutricao.plano(alunoId),
    queryFn: async () => {
      const { data, error } = await db
        .from("planos_alimentares")
        .select("*")
        .eq("aluno_id", alunoId)
        .eq("ativo", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useRefeicoes(planoId?: string) {
  return useQuery({
    queryKey: qk.nutricao.refeicoes(planoId),
    enabled: !!planoId,
    queryFn: async () => {
      const { data, error } = await db.from("refeicoes").select("*").eq("plano_id", planoId).order("ordem");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

/** Salva o plano ativo. `planoId` definido → update; senão insert. Devolve o id. */
export function useSavePlano(alunoId: string, personalId: string | undefined, planoId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      const clamp = (n: any, lo: number, hi: number) => {
        if (n == null || n === "") return null;
        const x = Number(n);
        return Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : null;
      };
      const clean: Record<string, any> = {
        ...payload,
        nome: typeof payload.nome === "string" ? payload.nome.trim().slice(0, 100) : payload.nome,
        kcal_alvo: clamp(payload.kcal_alvo, 500, 6000),
        proteina_g: clamp(payload.proteina_g, 0, 500),
        carbo_g: clamp(payload.carbo_g, 0, 1000),
        gordura_g: clamp(payload.gordura_g, 0, 400),
        observacoes: typeof payload.observacoes === "string" ? payload.observacoes.trim().slice(0, 2000) : payload.observacoes,
      };
      if (!clean.nome || clean.nome.length < 2) throw new Error("Nome do plano obrigatório (mín. 2 caracteres)");
      if (planoId) {
        const { error } = await db.from("planos_alimentares").update(clean).eq("id", planoId);
        if (error) throw error;
        return planoId;
      }
      const { data, error } = await db
        .from("planos_alimentares")
        .insert({ ...clean, aluno_id: alunoId, personal_id: personalId })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.nutricao.plano(alunoId) }),
  });
}

export function useAddRefeicao(planoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const atuais = qc.getQueryData<any[]>(qk.nutricao.refeicoes(planoId)) ?? [];
      const ordem = atuais.length + 1;
      const nomes = ["Café da Manhã", "Lanche da Manhã", "Almoço", "Lanche da Tarde", "Jantar", "Ceia"];
      const { error } = await db.from("refeicoes").insert({
        plano_id: planoId, ordem, nome: nomes[ordem - 1] ?? `Refeição ${ordem}`, horario: "", descricao: "",
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.nutricao.refeicoes(planoId) }),
  });
}

export function useUpdateRefeicao(planoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, any> }) => {
      const clean: Record<string, any> = { ...patch };
      if (typeof clean.nome === "string") clean.nome = clean.nome.trim().slice(0, 80);
      if (typeof clean.descricao === "string") clean.descricao = clean.descricao.trim().slice(0, 2000);
      if (typeof clean.horario === "string") {
        const m = clean.horario.match(/^(\d{1,2}):(\d{2})$/);
        clean.horario = m ? `${m[1].padStart(2, "0")}:${m[2]}` : clean.horario.slice(0, 5);
      }
      if ("kcal" in clean && clean.kcal != null && clean.kcal !== "") {
        const k = Number(clean.kcal);
        clean.kcal = Number.isFinite(k) ? Math.min(3000, Math.max(0, k)) : null;
      }
      const { error } = await db.from("refeicoes").update(clean).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.nutricao.refeicoes(planoId) }),
  });
}

export function useRemoveRefeicao(planoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("refeicoes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.nutricao.refeicoes(planoId) }),
  });
}

// ─── Evolução (série de avaliações físicas) ──────────────────────────────────
export function useEvolucao<T = any>(alunoId: string) {
  return useQuery({
    queryKey: qk.evolucao.byAluno(alunoId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("avaliacoes_fisicas")
        .select("id, data_avaliacao, peso, percentual_gordura, massa_magra, massa_gorda, imc, circ_cintura, circ_quadril")
        .eq("aluno_id", alunoId)
        .order("data_avaliacao", { ascending: true });
      if (error) throw error;
      return (data ?? []) as T[];
    },
  });
}

// ─── Fotos de evolução (Storage + tabela) ────────────────────────────────────
const FOTOS_BUCKET = "evolucao-fotos";

export function useFotos(alunoId: string) {
  return useQuery({
    queryKey: qk.fotos.byAluno(alunoId),
    queryFn: async () => {
      const { data, error } = await db
        .from("fotos_evolucao")
        .select("*")
        .eq("aluno_id", alunoId)
        .order("data_foto", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export function useRemoveFoto(alunoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (foto: { id: string; storage_path: string }) => {
      await supabase.storage.from(FOTOS_BUCKET).remove([foto.storage_path]);
      const { error } = await db.from("fotos_evolucao").delete().eq("id", foto.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.fotos.byAluno(alunoId) }),
  });
}

export interface UploadFotoInput {
  data_foto: string;
  peso: string;
  observacoes: string;
  entries: [string, File][]; // [angulo, arquivo]
}

export function useUploadFotos(alunoId: string, personalId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data_foto, peso, observacoes, entries }: UploadFotoInput) => {
      for (const [angulo, file] of entries) {
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `${personalId}/${alunoId}/${data_foto}-${angulo}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from(FOTOS_BUCKET).upload(path, file, { upsert: false });
        if (upErr) throw upErr;
        const { error: insErr } = await db.from("fotos_evolucao").insert({
          aluno_id: alunoId, personal_id: personalId, data_foto, angulo, storage_path: path,
          peso: peso ? Number(peso) : null, observacoes: observacoes || null,
        });
        if (insErr) throw insErr;
      }
      return entries.length;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.fotos.byAluno(alunoId) }),
  });
}

/** URL assinada (1h) de um objeto do bucket de fotos. */
export function useSignedUrl(path: string | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!path) { setUrl(null); return; }
    let cancel = false;
    supabase.storage.from(FOTOS_BUCKET).createSignedUrl(path, 3600).then(({ data }) => {
      if (!cancel) setUrl(data?.signedUrl ?? null);
    });
    return () => { cancel = true; };
  }, [path]);
  return url;
}
