import { createFileRoute } from "@tanstack/react-router";
import { useAluno } from "@/lib/queries/alunos";
import { AlunoForm, type AlunoFormValues } from "@/components/AlunoForm";

export const Route = createFileRoute("/_authenticated/alunos/$id/")({
  component: AlunoEdit,
});

function AlunoEdit() {
  const { id } = Route.useParams();
  const { data, isLoading } = useAluno(id);
  if (isLoading || !data) {
    return <div className="grid h-40 place-items-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }
  return <AlunoForm mode="edit" initial={data as AlunoFormValues} />;
}
