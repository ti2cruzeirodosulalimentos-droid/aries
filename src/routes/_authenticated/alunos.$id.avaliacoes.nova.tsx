import { createFileRoute } from "@tanstack/react-router";
import { AvaliacaoForm } from "@/components/AvaliacaoForm";

export const Route = createFileRoute("/_authenticated/alunos/$id/avaliacoes/nova")({
  component: NovaAvaliacao,
});

function NovaAvaliacao() {
  const { id } = Route.useParams();
  return <AvaliacaoForm alunoId={id} />;
}
