import { createFileRoute } from "@tanstack/react-router";
import { AvaliacaoForm } from "@/components/AvaliacaoForm";

export const Route = createFileRoute("/_authenticated/alunos/$id/avaliacoes/$avalId/editar")({
  component: EditarAvaliacao,
});

function EditarAvaliacao() {
  const { id, avalId } = Route.useParams();
  return <AvaliacaoForm alunoId={id} avalId={avalId} />;
}
