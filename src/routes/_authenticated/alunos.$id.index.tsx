import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AlunoForm, type AlunoFormValues } from "@/components/AlunoForm";

export const Route = createFileRoute("/_authenticated/alunos/$id/")({
  component: AlunoEdit,
});

function AlunoEdit() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["aluno-full", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("alunos").select("*").eq("id", id).single();
      if (error) throw error;
      return data as AlunoFormValues;
    },
  });
  if (isLoading || !data) {
    return <div className="grid h-40 place-items-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }
  return <AlunoForm mode="edit" initial={data} />;
}
