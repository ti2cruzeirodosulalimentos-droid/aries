import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AlunoForm } from "@/components/AlunoForm";

export const Route = createFileRoute("/_authenticated/alunos/novo")({
  head: () => ({ meta: [{ title: "Novo Aluno — ARIÉS" }] }),
  component: NovoAluno,
});

function NovoAluno() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link to="/alunos" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="size-4" /> Voltar
      </Link>
      <div>
        <p className="text-[10px] uppercase tracking-[0.3em] text-primary">Cadastro</p>
        <h1 className="mt-1 font-display text-3xl font-semibold">Novo Aluno</h1>
      </div>
      <AlunoForm mode="create" />
    </div>
  );
}
