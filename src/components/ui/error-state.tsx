import { AlertTriangle, RotateCw } from "lucide-react";

type ErrorStateProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
};

/** Estado de erro premium para falhas de carregamento de dados (com retry opcional). */
export function ErrorState({
  title = "Não foi possível carregar",
  description = "Houve uma falha ao buscar os dados. Verifique a conexão e tente novamente.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="luxury-card grid place-items-center rounded-2xl px-6 py-14 text-center"
    >
      <AlertTriangle className="mb-3 size-10 text-destructive" aria-hidden="true" />
      <h3 className="font-display text-xl">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg gold-border px-4 text-sm font-semibold transition hover:border-primary/50 hover:bg-primary/10"
        >
          <RotateCw className="size-4" /> Tentar novamente
        </button>
      ) : null}
    </div>
  );
}
