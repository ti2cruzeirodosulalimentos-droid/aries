import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Trash2, Save, Download, Loader2, Settings2, Tag, Calculator, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  upsertCustomField, deleteCustomField,
  upsertCategoria, deleteCategoria,
  upsertProtocolo, deleteProtocolo,
  exportBackup,
} from "@/lib/customizacao.functions";

export const Route = createFileRoute("/_authenticated/admin/customizacao")({
  component: CustomizacaoPage,
});

function CustomizacaoPage() {
  const { isAdmin, loading } = usePermissions();
  if (loading) return <div className="p-6">Carregando…</div>;
  if (!isAdmin) return <div className="p-6 text-destructive">Acesso restrito a administradores.</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Settings2 className="size-6 text-primary" /> Customização ARIÉS</h1>
        <p className="text-sm text-muted-foreground">Cadastre tudo do jeito que você quiser. Apenas administradores têm acesso.</p>
      </div>

      <Tabs defaultValue="anamnese" className="space-y-4">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full">
          <TabsTrigger value="anamnese"><FileText className="size-3.5 mr-1" /> Anamnese</TabsTrigger>
          <TabsTrigger value="avaliacao"><FileText className="size-3.5 mr-1" /> Avaliação</TabsTrigger>
          <TabsTrigger value="categorias"><Tag className="size-3.5 mr-1" /> Categorias</TabsTrigger>
          <TabsTrigger value="protocolos"><Calculator className="size-3.5 mr-1" /> Protocolos</TabsTrigger>
          <TabsTrigger value="backup"><Download className="size-3.5 mr-1" /> Backup</TabsTrigger>
        </TabsList>

        <TabsContent value="anamnese"><CustomFieldsPanel contexto="anamnese" /></TabsContent>
        <TabsContent value="avaliacao"><CustomFieldsPanel contexto="avaliacao" /></TabsContent>
        <TabsContent value="categorias"><CategoriasPanel /></TabsContent>
        <TabsContent value="protocolos"><ProtocolosPanel /></TabsContent>
        <TabsContent value="backup"><BackupPanel /></TabsContent>
      </Tabs>
    </div>
  );
}

function CustomFieldsPanel({ contexto }: { contexto: "anamnese" | "avaliacao" }) {
  const qc = useQueryClient();
  const upsert = useServerFn(upsertCustomField);
  const remove = useServerFn(deleteCustomField);
  const { data: items = [] } = useQuery({
    queryKey: ["custom_fields", contexto],
    queryFn: async () => {
      const { data } = await supabase.from("custom_fields").select("*").eq("contexto", contexto).order("ordem");
      return data ?? [];
    },
  });

  const [draft, setDraft] = useState<any>({ label: "", tipo: "texto", opcoes: [], obrigatorio: false, ordem: 0, ativo: true, subgrupo: "" });

  const saveM = useMutation({
    mutationFn: async (payload: any) => upsert({ data: { ...payload, contexto } }),
    onSuccess: () => { toast.success("Salvo"); qc.invalidateQueries({ queryKey: ["custom_fields", contexto] }); setDraft({ label: "", tipo: "texto", opcoes: [], obrigatorio: false, ordem: 0, ativo: true, subgrupo: "" }); },
    onError: (e: any) => toast.error(e.message),
  });
  const delM = useMutation({
    mutationFn: async (id: string) => remove({ data: { id } }),
    onSuccess: () => { toast.success("Removido"); qc.invalidateQueries({ queryKey: ["custom_fields", contexto] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="luxury-card p-4 space-y-3">
        <p className="font-semibold">Novo campo personalizado</p>
        <div className="grid gap-3 md:grid-cols-2">
          <div><Label>Pergunta/Rótulo *</Label><Input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} /></div>
          <div>
            <Label>Tipo *</Label>
            <Select value={draft.tipo} onValueChange={(v) => setDraft({ ...draft, tipo: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="texto">Texto curto</SelectItem>
                <SelectItem value="textarea">Texto longo</SelectItem>
                <SelectItem value="numero">Número</SelectItem>
                <SelectItem value="escolha">Múltipla escolha</SelectItem>
                <SelectItem value="escala">Escala (0-10)</SelectItem>
                <SelectItem value="booleano">Sim / Não</SelectItem>
                <SelectItem value="data">Data</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Subgrupo (opcional)</Label><Input placeholder="Ex: Composição, Estilo de vida…" value={draft.subgrupo} onChange={(e) => setDraft({ ...draft, subgrupo: e.target.value })} /></div>
          <div><Label>Ordem</Label><Input type="number" value={draft.ordem} onChange={(e) => setDraft({ ...draft, ordem: Number(e.target.value) || 0 })} /></div>
          {draft.tipo === "escolha" && (
            <div className="md:col-span-2">
              <Label>Opções (uma por linha)</Label>
              <Textarea rows={3} value={(draft.opcoes || []).join("\n")} onChange={(e) => setDraft({ ...draft, opcoes: e.target.value.split("\n").filter(Boolean) })} />
            </div>
          )}
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={draft.obrigatorio} onCheckedChange={(c) => setDraft({ ...draft, obrigatorio: !!c })} /> Obrigatório</label>
        </div>
        <Button disabled={!draft.label || saveM.isPending} onClick={() => saveM.mutate(draft)}>
          {saveM.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Adicionar campo
        </Button>
      </div>

      <div className="luxury-card overflow-hidden">
        {items.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Nenhum campo personalizado ainda.</p>
        ) : items.map((it: any, i: number) => (
          <div key={it.id} className={`p-3 flex items-center gap-3 ${i > 0 ? "border-t border-border" : ""}`}>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{it.label} {it.obrigatorio && <span className="text-destructive">*</span>}</p>
              <p className="text-xs text-muted-foreground">{it.tipo} {it.subgrupo ? `· ${it.subgrupo}` : ""}</p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => delM.mutate(it.id)}><Trash2 className="size-4 text-destructive" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoriasPanel() {
  const qc = useQueryClient();
  const upsert = useServerFn(upsertCategoria);
  const remove = useServerFn(deleteCategoria);
  const { data: items = [] } = useQuery({
    queryKey: ["exercicio_categorias"],
    queryFn: async () => {
      const { data } = await supabase.from("exercicio_categorias").select("*").order("ordem");
      return data ?? [];
    },
  });
  const [draft, setDraft] = useState<any>({ nome: "", cor: "#3B82F6", icone: "", ordem: 0, ativo: true });
  const saveM = useMutation({
    mutationFn: async (p: any) => upsert({ data: p }),
    onSuccess: () => { toast.success("Salvo"); qc.invalidateQueries({ queryKey: ["exercicio_categorias"] }); setDraft({ nome: "", cor: "#3B82F6", icone: "", ordem: 0, ativo: true }); },
    onError: (e: any) => toast.error(e.message),
  });
  const delM = useMutation({
    mutationFn: async (id: string) => remove({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exercicio_categorias"] }),
  });
  return (
    <div className="space-y-4">
      <div className="luxury-card p-4 grid gap-3 md:grid-cols-[1fr_120px_140px_auto] items-end">
        <div><Label>Nome da categoria</Label><Input value={draft.nome} onChange={(e) => setDraft({ ...draft, nome: e.target.value })} placeholder="Funcional ARIÉS" /></div>
        <div><Label>Cor</Label><Input type="color" value={draft.cor} onChange={(e) => setDraft({ ...draft, cor: e.target.value })} /></div>
        <div><Label>Ícone (emoji)</Label><Input value={draft.icone} onChange={(e) => setDraft({ ...draft, icone: e.target.value })} placeholder="💪" /></div>
        <Button disabled={!draft.nome || saveM.isPending} onClick={() => saveM.mutate(draft)}><Plus className="size-4" /> Adicionar</Button>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {items.map((it: any) => (
          <div key={it.id} className="luxury-card p-3 flex items-center gap-3">
            <div className="size-8 rounded-md flex items-center justify-center text-lg" style={{ background: it.cor + "22", color: it.cor }}>{it.icone || "•"}</div>
            <div className="flex-1"><p className="font-medium">{it.nome}</p></div>
            <Button size="sm" variant="ghost" onClick={() => delM.mutate(it.id)}><Trash2 className="size-4 text-destructive" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProtocolosPanel() {
  const qc = useQueryClient();
  const upsert = useServerFn(upsertProtocolo);
  const remove = useServerFn(deleteProtocolo);
  const { data: items = [] } = useQuery({
    queryKey: ["protocolos_avaliacao"],
    queryFn: async () => {
      const { data } = await supabase.from("protocolos_avaliacao").select("*").order("created_at");
      return data ?? [];
    },
  });
  const [draft, setDraft] = useState<any>({ nome: "", descricao: "", genero: "ambos", dobras_necessarias: [], formula: { tipo: "jp-like", constantes: { a: 1.10938, b: 0.0008267, c: 0.0000016, d: 0.0002574 } }, ativo: true });
  const saveM = useMutation({
    mutationFn: async (p: any) => upsert({ data: p }),
    onSuccess: () => { toast.success("Protocolo salvo"); qc.invalidateQueries({ queryKey: ["protocolos_avaliacao"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const delM = useMutation({ mutationFn: async (id: string) => remove({ data: { id } }), onSuccess: () => qc.invalidateQueries({ queryKey: ["protocolos_avaliacao"] }) });

  const DOBRAS_OPCOES = ["peitoral", "axilar_media", "triceps", "subescapular", "abdominal", "suprailiaca", "coxa"];

  return (
    <div className="space-y-4">
      <div className="luxury-card p-4 space-y-3">
        <p className="font-semibold">Novo protocolo</p>
        <div className="grid gap-3 md:grid-cols-2">
          <div><Label>Nome</Label><Input value={draft.nome} onChange={(e) => setDraft({ ...draft, nome: e.target.value })} /></div>
          <div>
            <Label>Gênero</Label>
            <Select value={draft.genero} onValueChange={(v) => setDraft({ ...draft, genero: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ambos">Ambos</SelectItem>
                <SelectItem value="masculino">Masculino</SelectItem>
                <SelectItem value="feminino">Feminino</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2"><Label>Descrição</Label><Textarea rows={2} value={draft.descricao} onChange={(e) => setDraft({ ...draft, descricao: e.target.value })} /></div>
          <div className="md:col-span-2">
            <Label>Dobras necessárias</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {DOBRAS_OPCOES.map((d) => {
                const active = draft.dobras_necessarias.includes(d);
                return (
                  <button key={d} type="button"
                    onClick={() => setDraft({ ...draft, dobras_necessarias: active ? draft.dobras_necessarias.filter((x: string) => x !== d) : [...draft.dobras_necessarias, d] })}
                    className={`px-3 py-1 rounded-full text-xs border ${active ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}
                  >{d}</button>
                );
              })}
            </div>
          </div>
          <div className="md:col-span-2">
            <Label>Constantes da fórmula (densidade = a − b·S + c·S² − d·idade)</Label>
            <div className="grid grid-cols-4 gap-2 mt-1">
              {["a", "b", "c", "d"].map((k) => (
                <Input key={k} type="number" step="any" placeholder={k}
                  value={draft.formula.constantes[k]}
                  onChange={(e) => setDraft({ ...draft, formula: { ...draft.formula, constantes: { ...draft.formula.constantes, [k]: Number(e.target.value) } } })} />
              ))}
            </div>
          </div>
        </div>
        <Button disabled={!draft.nome || saveM.isPending} onClick={() => saveM.mutate(draft)}><Save className="size-4" /> Salvar protocolo</Button>
      </div>

      <div className="grid gap-2">
        {items.map((it: any) => (
          <div key={it.id} className="luxury-card p-3 flex items-center gap-3">
            <div className="flex-1">
              <p className="font-medium">{it.nome} <span className="text-xs text-muted-foreground">· {it.genero}</span></p>
              <p className="text-xs text-muted-foreground">{(it.dobras_necessarias || []).join(", ")}</p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => delM.mutate(it.id)}><Trash2 className="size-4 text-destructive" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function BackupPanel() {
  const exp = useServerFn(exportBackup);
  const [running, setRunning] = useState(false);
  async function handleExport() {
    setRunning(true);
    try {
      const data = await exp();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `aries-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Backup gerado");
    } catch (e: any) {
      toast.error(e.message);
    } finally { setRunning(false); }
  }
  return (
    <div className="luxury-card p-6 text-center space-y-4">
      <Download className="size-10 text-primary mx-auto" />
      <p className="font-semibold">Exporta toda a configuração customizada</p>
      <p className="text-sm text-muted-foreground">Inclui campos personalizados, categorias e protocolos. Útil para backup ou para replicar em outro ambiente.</p>
      <Button onClick={handleExport} disabled={running}>{running ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} Baixar backup .json</Button>
    </div>
  );
}
