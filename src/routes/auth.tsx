import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Mail, Lock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect } from "react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Acesso — ARIÉS" },
      { name: "description", content: "Entre na plataforma ARIÉS." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) navigate({ to: "/dashboard", replace: true });
  }, [user, authLoading, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bem-vindo de volta!");
        navigate({ to: "/dashboard", replace: true });
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}/dashboard`,
          },
        });
        if (error) throw error;
        toast.success("Conta criada! Você já pode entrar.");
        setMode("login");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Enviamos um link de recuperação para seu e-mail.");
        setMode("login");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/dashboard",
      });
      if (result.error) throw result.error;
      if (result.redirected) return;
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao entrar com Google");
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-dvh overflow-hidden bg-background">
      {/* Ambient gold glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, color-mix(in oklab, var(--gold) 18%, transparent), transparent 70%), radial-gradient(40% 30% at 100% 100%, color-mix(in oklab, var(--gold) 10%, transparent), transparent 70%)",
        }}
      />
      <div className="relative mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12">
        <div className="mb-10 flex justify-center">
          <Logo size={56} />
        </div>

        <div className="luxury-card rounded-2xl p-7">
          <div className="mb-6 space-y-1 text-center">
            <h1 className="font-display text-2xl font-semibold">
              {mode === "login" && <>Acesso <span className="gold-text">Premium</span></>}
              {mode === "signup" && <>Criar <span className="gold-text">conta</span></>}
              {mode === "forgot" && <>Recuperar <span className="gold-text">acesso</span></>}
            </h1>
            <p className="text-sm text-muted-foreground">
              {mode === "login" && "Entre para gerenciar seus alunos"}
              {mode === "signup" && "Cadastre-se como Personal Trainer"}
              {mode === "forgot" && "Enviaremos um link para o seu e-mail"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome completo</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="Seu nome"
                  className="h-11 bg-input/60"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="voce@email.com"
                  className="h-11 bg-input/60 pl-10"
                />
              </div>
            </div>
            {mode !== "forgot" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Senha</Label>
                  {mode === "login" && (
                    <button
                      type="button"
                      onClick={() => setMode("forgot")}
                      className="text-xs text-primary hover:underline"
                    >
                      Esqueci
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="••••••••"
                    className="h-11 bg-input/60 pl-10"
                  />
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="mt-2 h-11 w-full bg-primary font-semibold text-primary-foreground hover:opacity-90 gold-glow"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> :
                mode === "login" ? "Entrar" : mode === "signup" ? "Criar conta" : "Enviar link"}
            </Button>
          </form>

          {mode !== "forgot" && (
            <>
              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                  ou
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogle}
                disabled={loading}
                className="h-11 w-full gold-border bg-transparent hover:bg-accent/10"
              >
                <svg viewBox="0 0 24 24" className="size-4">
                  <path fill="#EA4335" d="M12 5c1.6 0 3 .5 4.2 1.6l3.1-3.1C17.5 1.7 14.9.7 12 .7 7.4.7 3.4 3.3 1.4 7.1l3.7 2.9C6 7.2 8.8 5 12 5z"/>
                  <path fill="#4285F4" d="M23.3 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.4c-.3 1.5-1.1 2.7-2.4 3.6l3.7 2.9c2.2-2 3.6-5 3.6-8.7z"/>
                  <path fill="#FBBC05" d="M5.1 14.3a7.3 7.3 0 0 1 0-4.6L1.4 6.8a12 12 0 0 0 0 10.4l3.7-2.9z"/>
                  <path fill="#34A853" d="M12 23.3c3.2 0 5.9-1.1 7.8-2.9l-3.7-2.9c-1 .7-2.4 1.1-4.1 1.1-3.2 0-5.9-2.2-6.9-5.1l-3.7 2.9C3.4 20.7 7.4 23.3 12 23.3z"/>
                </svg>
                Continuar com Google
              </Button>
            </>
          )}

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "login" && (
              <>Não tem conta?{" "}
                <button onClick={() => setMode("signup")} className="font-semibold text-primary hover:underline">
                  Criar agora
                </button>
              </>
            )}
            {mode === "signup" && (
              <>Já tem conta?{" "}
                <button onClick={() => setMode("login")} className="font-semibold text-primary hover:underline">
                  Entrar
                </button>
              </>
            )}
            {mode === "forgot" && (
              <button onClick={() => setMode("login")} className="font-semibold text-primary hover:underline">
                Voltar ao login
              </button>
            )}
          </div>
        </div>

        <p className="mt-8 text-center text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          ARIÉS · Transformando metas em resultados
        </p>
      </div>
    </div>
  );
}
