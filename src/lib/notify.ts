import { toast } from "sonner";

/**
 * Toasts padronizados para mutações.
 * Uso:
 *   useMutation({
 *     mutationFn: ...,
 *     onSuccess: () => notify.saved(),
 *     onError: (e) => notify.error(e),
 *   })
 */
export const notify = {
  saved: (msg = "Salvo com sucesso") => toast.success(msg),
  deleted: (msg = "Removido com sucesso") => toast.success(msg),
  created: (msg = "Criado com sucesso") => toast.success(msg),
  info: (msg: string, description?: string) => toast(msg, { description }),
  warn: (msg: string) => toast.warning(msg),
  error: (err: unknown, fallback = "Ocorreu um erro. Tente novamente.") => {
    const message =
      err instanceof Error
        ? err.message
        : typeof err === "string"
          ? err
          : fallback;
    toast.error(message || fallback);
  },
};
