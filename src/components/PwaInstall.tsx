import { useEffect, useState } from "react";
import { Download, Share } from "lucide-react";
import { toast } from "sonner";

/** Evento beforeinstallprompt (não tipado no lib.dom padrão). */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/**
 * Botão "Instalar aplicativo".
 * - Android/Chrome/Edge: usa o prompt nativo (beforeinstallprompt) — só dispara em HTTPS.
 * - iPhone (Safari): ensina o passo Compartilhar → Adicionar à Tela de Início.
 * Sempre que o app já estiver instalado (standalone), o botão some.
 */
export function PwaInstall() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const ios = isIOS();

  useEffect(() => {
    if (typeof window === "undefined") return;

    // registra o service worker (necessário para o prompt de instalação; só em contexto seguro)
    if ("serviceWorker" in navigator && window.isSecureContext) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    setInstalled(isStandalone());

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      toast.success("App instalado! Abra pelo ícone na tela inicial.");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;
  // No iPhone sempre mostra (instrução manual). Nos demais, só quando o navegador permitir.
  if (!ios && !deferred) return null;

  async function handleClick() {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
      return;
    }
    // iOS
    toast("Como instalar no iPhone", {
      description: "Toque em Compartilhar (o quadrado com seta ↑) e depois em “Adicionar à Tela de Início”.",
      icon: <Share className="size-4" />,
      duration: 8000,
    });
  }

  return (
    <button
      onClick={handleClick}
      className="mb-2 flex w-full items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
    >
      <Download className="size-4" /> Instalar aplicativo
    </button>
  );
}
