import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ImageUp, Loader2, Save, Trash2, Copy, Globe } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useMyProfile, useUpdateMyProfile } from "@/lib/queries/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "") // remove acentos (ex: "João" -> "joao")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export const Route = createFileRoute("/_authenticated/minha-marca")({
  head: () => ({ meta: [{ title: "Minha Marca — ARIÉS" }] }),
  component: MinhaMarca,
});

const DEFAULT_BRAND = "PERSONAL ARIANNY PRO";

function MinhaMarca() {
  const { user } = useAuth();
  const { data: profile, isLoading } = useMyProfile(user?.id);
  const update = useUpdateMyProfile(user?.id);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [brandName, setBrandName] = useState<string | null>(null);
  const [slug, setSlug] = useState<string | null>(null);
  const [bio, setBio] = useState<string | null>(null);
  const [especialidades, setEspecialidades] = useState<string | null>(null);
  const [whatsapp, setWhatsapp] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState<boolean | null>(null);

  const logoUrl = profile?.logo_url ?? null;
  const nomeAtual = brandName ?? profile?.brand_name ?? "";
  const slugAtual = slug ?? profile?.public_slug ?? "";
  const bioAtual = bio ?? profile?.bio ?? "";
  const especialidadesAtual = especialidades ?? profile?.especialidades ?? "";
  const whatsappAtual = whatsapp ?? profile?.contato_whatsapp ?? "";
  const publicoAtivo = isPublic ?? profile?.is_public ?? false;
  const linkPublico = slugAtual ? `${typeof window !== "undefined" ? window.location.origin : ""}/p/${slugAtual}` : "";

  async function handleLogo(file: File) {
    if (!user) return;
    if (file.size > 3 * 1024 * 1024) { toast.error("Imagem muito grande (máx 3MB)"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${user.id}/logo.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("logos").upload(path, file, { upsert: true, cacheControl: "3600" });
      if (upErr) throw upErr;
      const { data: signed, error: signErr } = await supabase.storage
        .from("logos").createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signErr) throw signErr;
      update.mutate({ logo_url: signed.signedUrl }, {
        onSuccess: () => toast.success("Logo atualizada"),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no upload");
    } finally {
      setUploading(false);
    }
  }

  function removerLogo() {
    if (!confirm("Remover a logo? Os PDFs voltam a usar o nome de marca em texto.")) return;
    update.mutate({ logo_url: null }, { onSuccess: () => toast.success("Logo removida") });
  }

  function salvarNome() {
    update.mutate({ brand_name: nomeAtual.trim() || null }, {
      onSuccess: () => toast.success("Nome de marca salvo"),
      onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
    });
  }

  function salvarPerfilPublico() {
    const slugLimpo = slugify(slugAtual);
    if (publicoAtivo && !slugLimpo) { toast.error("Defina um link antes de ativar o perfil público"); return; }
    update.mutate(
      {
        public_slug: slugLimpo || null,
        bio: bioAtual.trim() || null,
        especialidades: especialidadesAtual.trim() || null,
        contato_whatsapp: whatsappAtual.trim() || null,
        is_public: publicoAtivo,
      },
      {
        onSuccess: () => { setSlug(slugLimpo); toast.success("Perfil público salvo"); },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Não foi possível salvar — o link pode já estar em uso"),
      },
    );
  }

  function copiarLink() {
    navigator.clipboard.writeText(linkPublico).then(() => toast.success("Link copiado")).catch(() => toast.error("Não foi possível copiar"));
  }

  if (isLoading) return <div className="p-6 text-muted-foreground">Carregando…</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-[10px] uppercase tracking-[0.3em] text-primary">Personalização</p>
        <h1 className="font-display text-3xl font-semibold">Minha Marca</h1>
        <p className="text-sm text-muted-foreground mt-1">
          A logo e o nome definidos aqui aparecem na capa de todos os PDFs (avaliações, evolução e treinos) que você gerar.
        </p>
      </div>

      <div className="luxury-card p-6 space-y-5">
        <div>
          <Label className="mb-2 block">Logo</Label>
          <div className="flex items-center gap-5 flex-wrap">
            <div className="size-28 rounded-xl gold-border bg-secondary grid place-items-center overflow-hidden shrink-0">
              {logoUrl ? <img src={logoUrl} alt="Logo" className="size-full object-contain p-2" /> : <ImageUp className="size-8 text-muted-foreground/40" />}
            </div>
            <div className="flex flex-col gap-2">
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogo(f); }} />
              <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading} className="gold-border">
                {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImageUp className="size-4" />} {logoUrl ? "Trocar logo" : "Enviar logo"}
              </Button>
              {logoUrl ? (
                <Button variant="ghost" size="sm" onClick={removerLogo} className="text-destructive hover:bg-destructive/10">
                  <Trash2 className="size-4" /> Remover
                </Button>
              ) : null}
              <p className="text-xs text-muted-foreground">PNG, JPG, WEBP ou SVG · fundo transparente fica melhor · máx. 3MB</p>
            </div>
          </div>
        </div>

        <div>
          <Label htmlFor="brand_name" className="mb-2 block">Nome de marca (texto no topo da capa)</Label>
          <div className="flex gap-2">
            <Input id="brand_name" value={nomeAtual} onChange={(e) => setBrandName(e.target.value)} placeholder={DEFAULT_BRAND} />
            <Button onClick={salvarNome} disabled={update.isPending} className="bg-primary text-primary-foreground shrink-0">
              {update.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Salvar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Deixe em branco para usar "{DEFAULT_BRAND}".</p>
        </div>
      </div>

      <div className="luxury-card p-6 space-y-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-display text-lg font-semibold flex items-center gap-2"><Globe className="size-4 text-primary" /> Perfil Público</h2>
            <p className="text-sm text-muted-foreground mt-1">Uma página sua pra divulgar no Instagram, WhatsApp ou onde quiser.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Label htmlFor="is_public" className="text-xs text-muted-foreground">{publicoAtivo ? "Ativo" : "Inativo"}</Label>
            <Switch id="is_public" checked={publicoAtivo} onCheckedChange={(v) => setIsPublic(v)} />
          </div>
        </div>

        <div>
          <Label htmlFor="slug" className="mb-2 block">Link</Label>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">{typeof window !== "undefined" ? window.location.origin : ""}/p/</span>
            <Input id="slug" value={slugAtual} onChange={(e) => setSlug(e.target.value)} placeholder="seu-nome" className="max-w-[220px]" />
          </div>
          {linkPublico && publicoAtivo ? (
            <button type="button" onClick={copiarLink} className="mt-2 inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
              <Copy className="size-3" /> {linkPublico}
            </button>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">Só letras minúsculas, números e hífen. Ex: joao-personal</p>
          )}
        </div>

        <div>
          <Label htmlFor="especialidades" className="mb-2 block">Especialidades</Label>
          <Input id="especialidades" value={especialidadesAtual} onChange={(e) => setEspecialidades(e.target.value)} placeholder="Hipertrofia, Emagrecimento, Reabilitação" />
          <p className="text-xs text-muted-foreground mt-1">Separe por vírgula — aparecem como tags no seu perfil.</p>
        </div>

        <div>
          <Label htmlFor="bio" className="mb-2 block">Sobre você</Label>
          <Textarea id="bio" rows={3} value={bioAtual} onChange={(e) => setBio(e.target.value)} placeholder="Personal trainer há 8 anos, especialista em emagrecimento e hipertrofia..." />
        </div>

        <div>
          <Label htmlFor="whatsapp" className="mb-2 block">WhatsApp de contato</Label>
          <Input id="whatsapp" value={whatsappAtual} onChange={(e) => setWhatsapp(e.target.value)} placeholder="5511999999999" />
          <p className="text-xs text-muted-foreground mt-1">Com DDI e DDD, só números — vira um botão "Falar no WhatsApp" no seu perfil.</p>
        </div>

        <Button onClick={salvarPerfilPublico} disabled={update.isPending} className="bg-primary text-primary-foreground">
          {update.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Salvar perfil público
        </Button>
      </div>

      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Pré-visualização da capa</p>
        <div className="rounded-2xl p-8 bg-[#0A0A0A] border border-[#2A2417] flex flex-col items-center text-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="h-16 object-contain" />
          ) : (
            <p className="text-[#D4AF37] text-sm tracking-[0.3em] font-bold">{(nomeAtual || DEFAULT_BRAND).toUpperCase()}</p>
          )}
          <p className="text-[#9A9A9A] text-[10px] tracking-[0.4em]">RELATÓRIO PREMIUM</p>
        </div>
      </div>
    </div>
  );
}
