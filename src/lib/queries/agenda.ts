import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { qk } from "@/lib/query-keys";

export interface Evento {
  id: string;
  titulo: string;
  tipo: string;
  inicio: string;
  fim: string;
  status: string;
  aluno_id: string | null;
  personal_id: string;
  observacao: string | null;
  alunos: { full_name: string } | null;
}

/** Eventos da agenda dentro de um intervalo (ISO). */
export function useAgendaEventos(uid: string | undefined, startISO: string, endISO: string) {
  return useQuery({
    queryKey: qk.agenda.range(uid, startISO, endISO),
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agenda_eventos")
        .select("*, alunos(full_name)")
        .gte("inicio", startISO)
        .lte("inicio", endISO)
        .order("inicio");
      if (error) throw error;
      return (data ?? []) as Evento[];
    },
  });
}

export interface EventoUpsert {
  id?: string;
  personal_id: string;
  titulo: string;
  tipo: string;
  status: string;
  inicio: string;
  fim: string;
  aluno_id: string | null;
  observacao: string | null;
}

export function useUpsertEvento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: EventoUpsert) => {
      if (id) {
        const { error } = await supabase.from("agenda_eventos").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("agenda_eventos").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.agenda.all });
      qc.invalidateQueries({ queryKey: qk.dashboard.all });
    },
  });
}

export function useDeleteEvento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("agenda_eventos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.agenda.all });
      qc.invalidateQueries({ queryKey: qk.dashboard.all });
    },
  });
}

/** Lista enxuta (id + nome) p/ selects. Compartilha prefixo "alunos" → invalida junto. */
export function useAlunosMin() {
  return useQuery({
    queryKey: qk.alunos.min,
    queryFn: async () => {
      const { data } = await supabase.from("alunos").select("id, full_name").order("full_name");
      return data ?? [];
    },
  });
}
