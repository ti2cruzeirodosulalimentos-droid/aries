import { useEffect, type ReactNode } from "react";

/** Janela sobre a tela, no mesmo visual das outras do Financeiro (fecha com Esc ou clicando fora). */
export function Modal({
  title, onClose, children, maxWidth = "max-w-md",
}: { title: string; onClose: () => void; children: ReactNode; maxWidth?: string }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 px-4 py-8" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`luxury-card w-full ${maxWidth} max-h-[90vh] space-y-4 overflow-y-auto p-5`}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-xl">{title}</h3>
        {children}
      </div>
    </div>
  );
}

export const SELECT_CLASS = "h-11 w-full rounded-md bg-input/60 px-3 text-sm";
