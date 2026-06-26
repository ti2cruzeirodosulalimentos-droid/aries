import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { qk } from "@/lib/query-keys";
import { ajustarItem, type Template, type AjusteNivel } from "@/lib/treinos/templates";

const LETRAS = ["A", "B", "C", "D", "E"] as const;

// treinos/exercicios não estão nos tipos gerados do Supabase → cast pontual.
const db = supabase as any;

export interface TreinoRow {
  id: string;
  letra: string;
  nome: string;
  objetivo: string | null;
  ordem: number;
  treino_exercicios: { count: number }[];
}

/** Fichas de treino de um aluno (com contagem de exercícios). */
export function useTreinosList(alunoId: string) {
  return useQuery({
    queryKey: qk.treinos.byAluno(alunoId),
    queryFn: async () => {
      const { data, error } = await db
        .from("treinos")
        .select("id, letra, nome, objetivo, ordem, treino_exercicios(count)")
        .eq("aluno_id", alunoId)
        .order("letra");
      if (error) throw error;
      return (data ?? []) as TreinoRow[];
    },
  });
}

/** Cria uma ficha (letra) e devolve o id. Navegação/erro ficam no componente. */
export function useCriarTreino(alunoId: string, personalId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (letra: string) => {
      const { data, error } = await db
        .from("treinos")
        .insert({
          aluno_id: alunoId,
          personal_id: personalId,
          letra,
          nome: `Treino ${letra}`,
          ordem: LETRAS.indexOf(letra as (typeof LETRAS)[number]),
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.treinos.byAluno(alunoId) }),
  });
}

/** Exclui uma ficha — optimista na lista do aluno. */
export function useExcluirTreino(alunoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (treinoId: string) => {
      const { error } = await db.from("treinos").delete().eq("id", treinoId);
      if (error) throw error;
    },
    onMutate: async (treinoId: string) => {
      await qc.cancelQueries({ queryKey: qk.treinos.byAluno(alunoId) });
      const prev = qc.getQueryData<TreinoRow[]>(qk.treinos.byAluno(alunoId));
      qc.setQueryData<TreinoRow[]>(qk.treinos.byAluno(alunoId), (old) =>
        (old ?? []).filter((t) => t.id !== treinoId),
      );
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.treinos.byAluno(alunoId), ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.treinos.byAluno(alunoId) }),
  });
}

/** Aplica um template profissional, ajustando volume/descanso ao nível do aluno. */
export function useAplicarTemplate(alunoId: string, personalId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ tpl, nivel }: { tpl: Template; nivel: AjusteNivel }) => {
      const atuais = qc.getQueryData<TreinoRow[]>(qk.treinos.byAluno(alunoId)) ?? [];
      const usadas = new Set(atuais.map((t) => t.letra));

      // 1. busca todos os exercícios necessários por nome
      const nomes = Array.from(new Set(tpl.treinos.flatMap((t) => t.itens.map((i) => i.nome))));
      const { data: exs, error: exErr } = await db.from("exercicios").select("id, nome").in("nome", nomes);
      if (exErr) throw exErr;
      const mapa = new Map<string, string>();
      (exs ?? []).forEach((e: any) => mapa.set(e.nome, e.id));

      const faltando = nomes.filter((n) => !mapa.has(n));
      if (faltando.length) {
        toast.warning(`${faltando.length} exercício(s) não encontrado(s) na biblioteca e foram ignorados.`);
      }

      // 2. cria treinos e seus exercícios (com ajuste por nível)
      for (const t of tpl.treinos) {
        if (usadas.has(t.letra)) {
          toast.info(`Treino ${t.letra} já existe — pulado.`);
          continue;
        }
        const { data: novoTreino, error: tErr } = await db
          .from("treinos")
          .insert({
            aluno_id: alunoId,
            personal_id: personalId,
            letra: t.letra,
            nome: t.nome,
            objetivo: t.objetivo,
            ordem: LETRAS.indexOf(t.letra as (typeof LETRAS)[number]),
          })
          .select("id")
          .single();
        if (tErr) throw tErr;

        const itens = t.itens
          .map((it, idx) => {
            const exId = mapa.get(it.nome);
            if (!exId) return null;
            const ajustado = ajustarItem(it, nivel);
            return {
              treino_id: novoTreino.id,
              exercicio_id: exId,
              ordem: idx + 1,
              series: ajustado.series,
              repeticoes: ajustado.repeticoes,
              descanso_seg: ajustado.descanso_seg,
              metodo: ajustado.metodo ?? null,
              carga: ajustado.carga_sugerida ?? null,
            };
          })
          .filter(Boolean);

        if (itens.length) {
          const { error: iErr } = await db.from("treino_exercicios").insert(itens);
          if (iErr) throw iErr;
        }
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.treinos.byAluno(alunoId) }),
  });
}

// Estrutura devolvida pelo OCR (extractTreinoFromImage) já filtrada p/ letras novas.
export interface FotoExercicio {
  nome: string;
  series: number;
  repeticoes: string;
  descanso_seg: number;
  carga?: string;
  observacao?: string;
}
export interface FotoTreino {
  letra: string;
  nome: string;
  objetivo?: string;
  exercicios: FotoExercicio[];
}

/** Persiste treinos extraídos de uma foto: garante exercícios na biblioteca e insere as fichas. */
export function useImportTreinosFromFoto(alunoId: string, personalId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (novos: FotoTreino[]) => {
      // garante exercícios na biblioteca (cria os que faltam)
      const nomes = Array.from(new Set(novos.flatMap((t) => t.exercicios.map((e) => e.nome))));
      const { data: existentes } = await db.from("exercicios").select("id, nome").in("nome", nomes);
      const mapa = new Map<string, string>();
      (existentes ?? []).forEach((e: any) => mapa.set(e.nome, e.id));
      const faltam = nomes.filter((n) => !mapa.has(n));
      if (faltam.length) {
        const { data: criados } = await db
          .from("exercicios")
          .insert(faltam.map((n) => ({ nome: n, grupo_muscular: "Outro", created_by: personalId, is_publico: false })))
          .select("id, nome");
        (criados ?? []).forEach((e: any) => mapa.set(e.nome, e.id));
      }

      for (const t of novos) {
        const { data: novoTreino, error: tErr } = await db
          .from("treinos")
          .insert({
            aluno_id: alunoId,
            personal_id: personalId,
            letra: t.letra,
            nome: t.nome || `Treino ${t.letra}`,
            objetivo: t.objetivo,
            ordem: LETRAS.indexOf(t.letra as (typeof LETRAS)[number]),
          })
          .select("id")
          .single();
        if (tErr) throw tErr;
        const itens = t.exercicios
          .map((it, idx) => ({
            treino_id: novoTreino.id,
            exercicio_id: mapa.get(it.nome)!,
            ordem: idx + 1,
            series: it.series,
            repeticoes: it.repeticoes,
            descanso_seg: it.descanso_seg,
            carga: it.carga || null,
            observacao: it.observacao || null,
          }))
          .filter((i) => i.exercicio_id);
        if (itens.length) await db.from("treino_exercicios").insert(itens);
      }
      return novos.length;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.treinos.byAluno(alunoId) });
      qc.invalidateQueries({ queryKey: qk.exercicios.all });
    },
  });
}

// ─── Editor de ficha (detalhe + itens) ───────────────────────────────────────

export interface TreinoExercicioRow {
  id: string;
  ordem: number;
  series: number | null;
  repeticoes: string | null;
  carga: string | null;
  descanso_seg: number | null;
  metodo: string | null;
  observacoes: string | null;
  exercicio: { id: string; nome: string; grupo_muscular: string; equipamento: string | null } | null;
}

/** Dados da ficha (cabeçalho). */
export function useTreino(treinoId: string) {
  return useQuery({
    queryKey: qk.treinos.detail(treinoId),
    queryFn: async () => {
      const { data, error } = await db.from("treinos").select("*").eq("id", treinoId).single();
      if (error) throw error;
      return data;
    },
  });
}

/** Exercícios de uma ficha, ordenados. */
export function useTreinoExercicios(treinoId: string) {
  return useQuery({
    queryKey: qk.treinos.exercicios(treinoId),
    queryFn: async () => {
      const { data, error } = await db
        .from("treino_exercicios")
        .select("id, ordem, series, repeticoes, carga, descanso_seg, metodo, observacoes, exercicio:exercicios(id, nome, grupo_muscular, equipamento)")
        .eq("treino_id", treinoId)
        .order("ordem");
      if (error) throw error;
      return (data ?? []) as TreinoExercicioRow[];
    },
  });
}

/** Atualiza cabeçalho da ficha (nome/objetivo/observações). */
export function useSalvarTreino(treinoId: string, alunoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: { nome?: string; objetivo?: string; observacoes?: string }) => {
      const { error } = await db.from("treinos").update(patch).eq("id", treinoId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.treinos.detail(treinoId) });
      qc.invalidateQueries({ queryKey: qk.treinos.byAluno(alunoId) });
    },
  });
}

/** Adiciona um exercício ao final da ficha. */
export function useAdicionarExercicio(treinoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (exercicioId: string) => {
      const atuais = qc.getQueryData<TreinoExercicioRow[]>(qk.treinos.exercicios(treinoId)) ?? [];
      const ordem = atuais.length + 1;
      const { error } = await db.from("treino_exercicios").insert({
        treino_id: treinoId, exercicio_id: exercicioId, ordem, series: 3, repeticoes: "10-12", descanso_seg: 60,
      });
      if (error) throw error;
    },
    // invalida todo o namespace treinos → atualiza itens + contagem na lista do aluno
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.treinos.all }),
  });
}

/** Edita um item da ficha aplicando limites de segurança nos campos numéricos. */
export function useAtualizarItem(treinoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId, patch }: { itemId: string; patch: Record<string, any> }) => {
      // Bounds: séries 1-20, repetições texto curto, carga 0-1000kg, descanso 0-600s
      const clean: Record<string, any> = { ...patch };
      if ("series" in clean) clean.series = Math.min(20, Math.max(1, Number(clean.series) || 1));
      if ("carga" in clean && clean.carga != null && clean.carga !== "") {
        const c = Number(clean.carga);
        clean.carga = Number.isFinite(c) ? Math.min(1000, Math.max(0, c)) : null;
      }
      if ("descanso_seg" in clean && clean.descanso_seg != null && clean.descanso_seg !== "") {
        const d = Number(clean.descanso_seg);
        clean.descanso_seg = Number.isFinite(d) ? Math.min(600, Math.max(0, d)) : null;
      }
      if (typeof clean.repeticoes === "string") clean.repeticoes = clean.repeticoes.trim().slice(0, 30);
      if (typeof clean.observacoes === "string") clean.observacoes = clean.observacoes.trim().slice(0, 500);
      const { error } = await db.from("treino_exercicios").update(clean).eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.treinos.exercicios(treinoId) }),
  });
}

/** Remove um item — optimista na lista de itens. */
export function useRemoverItem(treinoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await db.from("treino_exercicios").delete().eq("id", itemId);
      if (error) throw error;
    },
    onMutate: async (itemId: string) => {
      await qc.cancelQueries({ queryKey: qk.treinos.exercicios(treinoId) });
      const prev = qc.getQueryData<TreinoExercicioRow[]>(qk.treinos.exercicios(treinoId));
      qc.setQueryData<TreinoExercicioRow[]>(qk.treinos.exercicios(treinoId), (old) =>
        (old ?? []).filter((i) => i.id !== itemId),
      );
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.treinos.exercicios(treinoId), ctx.prev);
    },
    // ao assentar, invalida namespace inteiro (atualiza contagem na lista do aluno)
    onSettled: () => qc.invalidateQueries({ queryKey: qk.treinos.all }),
  });
}

/** Troca a ordem de dois itens adjacentes. */
export function useMoverItem(treinoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId, direction }: { itemId: string; direction: -1 | 1 }) => {
      const itens = qc.getQueryData<TreinoExercicioRow[]>(qk.treinos.exercicios(treinoId)) ?? [];
      const idx = itens.findIndex((i) => i.id === itemId);
      const swap = itens[idx + direction];
      if (!swap) return;
      await db.from("treino_exercicios").update({ ordem: swap.ordem }).eq("id", itemId);
      await db.from("treino_exercicios").update({ ordem: itens[idx].ordem }).eq("id", swap.id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.treinos.exercicios(treinoId) }),
  });
}

// Item da execução: exercício com mídia/instruções p/ o modo tutorial.
export interface TreinoExecItem {
  id: string;
  ordem: number;
  series: number | null;
  repeticoes: string | null;
  carga: string | null;
  descanso_seg: number | null;
  metodo: string | null;
  observacoes: string | null;
  exercicio: {
    id: string;
    nome: string;
    grupo_muscular: string;
    equipamento: string | null;
    gif_url: string | null;
    imagem_url: string | null;
    instrucoes: string | null;
    nivel: string | null;
  } | null;
}

/** Itens da ficha com mídia/instruções, para o modo de execução (tutorial). */
export function useTreinoExec(treinoId: string) {
  return useQuery({
    queryKey: qk.treinos.exec(treinoId),
    queryFn: async () => {
      const { data, error } = await db
        .from("treino_exercicios")
        .select("id, ordem, series, repeticoes, carga, descanso_seg, metodo, observacoes, exercicio:exercicios(id, nome, grupo_muscular, equipamento, gif_url, imagem_url, instrucoes, nivel)")
        .eq("treino_id", treinoId)
        .order("ordem");
      if (error) throw error;
      return (data ?? []) as TreinoExecItem[];
    },
  });
}

/** Biblioteca completa de exercícios para o seletor (cacheada por prefixo "exercicios"). */
export function useExerciciosPicker() {
  return useQuery({
    queryKey: qk.exercicios.picker,
    queryFn: async () => {
      const { data, error } = await db
        .from("exercicios")
        .select("id, nome, grupo_muscular, equipamento, gif_url, imagem_url, nivel")
        .order("grupo_muscular")
        .order("nome");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}
