import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, User, ClipboardList, Activity, Dumbbell, Apple, Target, Camera, TrendingUp, MessageCircle, Lock, Unlock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { adminDisableAccount, adminEnableAccount } from "@/lib/admin.functions";
import { renderTemplate, whatsappLink, mailtoLink } from "@/routes/_authenticated/mensagens";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/alunos/$id")({
  head: () => ({ meta: [{ title: "Aluno — ARIÉS" }] }),
  component: AlunoLayout,
});

function AlunoLayout() {
  const { id } = Route.useParams();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const qc = useQueryClient();
  const [sendOpen, setSendOpen] = useState(false);

  const { data: aluno } = useQuery({
    queryKey: ["aluno", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alunos")
        .select("id, full_name, photo_url, status, goal, plan_expires_at, whatsapp, phone, email, user_id")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const disableFn = useServerFn(adminDisableAccount);
  const enableFn = useServerFn(adminEnableAccount);

  const toggleStatus = useMutation({
    mutationFn: async () => {
      const novoStatus = aluno?.status === "inativo" ? "ativo" : "inativo";
      const { error } = await supabase.from("alunos").update({ status: novoStatus }).eq("id", id);
      if (error) throw error;
      // Bloqueia/desbloqueia login se houver vínculo de conta
      if (aluno?.user_id) {
        try {
          if (novoStatus === "inativo") await disableFn({ data: { targetUserId: aluno.user_id } });
          else await enableFn({ data: { targetUserId: aluno.user_id } });
        } catch (e) {
          // continua: status do aluno foi atualizado, mas avisa
          toast.warning(`Status atualizado, mas não bloqueou login: ${(e as Error).message}`);
        }
      }
      return novoStatus;
    },
    onSuccess: (novoStatus) => {
      toast.success(novoStatus === "inativo" ? "Aluno inativado e login bloqueado" : "Aluno reativado");
      qc.invalidateQueries({ queryKey: ["aluno", id] });
      qc.invalidateQueries({ queryKey: ["alunos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const tabs = [
    { to: `/alunos/${id}`, label: "Dados", icon: User, exact: true },
    { to: `/alunos/${id}/anamnese`, label: "Anamnese", icon: ClipboardList },
    { to: `/alunos/${id}/avaliacoes`, label: "Avaliação", icon: Activity },
    { to: `/alunos/${id}/evolucao`, label: "Evolução", icon: TrendingUp },
    { to: `/alunos/${id}/treinos`, label: "Treinos", icon: Dumbbell },
    { to: `/alunos/${id}/nutricao`, label: "Nutrição", icon: Apple },
    { to: `/alunos/${id}/metas`, label: "Metas", icon: Target },
    { to: `/alunos/${id}/fotos`, label: "Fotos", icon: Camera },
  ];

  const isInativo = aluno?.status === "inativo";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link to="/alunos" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="size-4" /> Voltar para alunos
      </Link>

      <div className="luxury-card flex items-center gap-4 p-5 flex-wrap">
        {aluno?.photo_url ? (
          <img src={aluno.photo_url} alt={aluno.full_name} className="size-16 rounded-full border border-primary/40 object-cover" />
        ) : (
          <div className="size-16 rounded-full bg-secondary grid place-items-center text-primary font-display text-xl">
            {aluno?.full_name?.[0] ?? "?"}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[10px] uppercase tracking-[0.3em] text-primary">Aluno</p>
            {isInativo && (
              <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-destructive">
                Inativo · login bloqueado
              </span>
            )}
          </div>
          <h1 className="font-display text-2xl font-semibold truncate">{aluno?.full_name ?? "Carregando..."}</h1>
          {aluno?.goal ? <p className="text-xs text-muted-foreground truncate mt-1">Objetivo: {aluno.goal}</p> : null}
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setSendOpen(true)} disabled={isInativo}>
            <MessageCircle className="size-4" /> Enviar mensagem
          </Button>
          <Button
            variant="outline" size="sm"
            className={isInativo ? "text-emerald-400 border-emerald-400/40" : "text-destructive border-destructive/40"}
            onClick={() => {
              const acao = isInativo ? "Reativar" : "Inativar (bloquear acesso de)";
              if (confirm(`${acao} ${aluno?.full_name}?`)) toggleStatus.mutate();
            }}
            disabled={toggleStatus.isPending}
          >
            {isInativo ? <><Unlock className="size-4" /> Reativar</> : <><Lock className="size-4" /> Inativar</>}
          </Button>
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto border-b border-border">
        {tabs.map((t) => {
          const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
          const Icon = t.icon;
          return (
            <Link
              key={t.to}
              to={t.to}
              className={`flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm transition border-b-2 ${
                active ? "border-primary text-primary font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="size-4" /> {t.label}
            </Link>
          );
        })}
      </nav>

      <Outlet />

      {sendOpen && aluno && (
        <EnviarMensagemModal aluno={aluno} onClose={() => setSendOpen(false)} />
      )}
    </div>
  );
}

type AlunoMsg = {
  full_name: string; whatsapp: string | null; phone: string | null; email: string | null;
  plan_expires_at: string | null;
};

function EnviarMensagemModal({ aluno, onClose }: { aluno: AlunoMsg; onClose: () => void }) {
  const { data: templates } = useQuery({
    queryKey: ["mensagens-templates"],
    queryFn: async () => {
      const { data } = await supabase.from("mensagens_templates")
        .select("id,nome,canal,assunto,corpo")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  const [selectedId, setSelectedId] = useState<string>("");
  const [corpo, setCorpo] = useState("");
  const [assunto, setAssunto] = useState("");

  const vars = {
    nome: aluno.full_name.split(" ")[0],
    vencimento: aluno.plan_expires_at ? aluno.plan_expires_at.split("-").reverse().join("/") : "—",
    dias: aluno.plan_expires_at
      ? String(Math.max(0, Math.ceil((new Date(aluno.plan_expires_at).getTime() - Date.now()) / 86400000)))
      : "—",
    personal: "ARIÉS",
  };

  function pick(id: string) {
    setSelectedId(id);
    const t = templates?.find((x) => x.id === id);
    if (t) {
      setCorpo(renderTemplate(t.corpo, vars));
      setAssunto(renderTemplate(t.assunto ?? "", vars));
    }
  }

  const whatsapp = aluno.whatsapp || aluno.phone || "";
  const email = aluno.email || "";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={onClose}>
      <div className="luxury-card w-full max-w-lg p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display text-xl">Enviar mensagem</h3>
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground">Template</label>
          <select className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={selectedId} onChange={(e) => pick(e.target.value)}>
            <option value="">— escolher template —</option>
            {templates?.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground">Assunto (e-mail)</label>
          <input className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={assunto} onChange={(e) => setAssunto(e.target.value)} />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground">Mensagem</label>
          <textarea rows={5} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={corpo} onChange={(e) => setCorpo(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap justify-end pt-2 border-t border-border">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          <a href={whatsapp ? whatsappLink(whatsapp, corpo) : "#"} target="_blank" rel="noreferrer"
            onClick={(e) => { if (!whatsapp) { e.preventDefault(); toast.error("Aluno sem WhatsApp cadastrado"); } }}>
            <Button className="bg-emerald-600 text-white hover:bg-emerald-500" disabled={!corpo}>
              WhatsApp
            </Button>
          </a>
          <a href={email ? mailtoLink(email, assunto || "Mensagem ARIÉS", corpo) : "#"}
            onClick={(e) => { if (!email) { e.preventDefault(); toast.error("Aluno sem e-mail cadastrado"); } }}>
            <Button disabled={!corpo}>E-mail</Button>
          </a>
        </div>
      </div>
    </div>
  );
}
