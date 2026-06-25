# Controle absoluto + Bonecos 3D ARIÉS

## Já corrigido nesta rodada
- **Altura**: agora aceita `1.75` ou `175` (auto-converte) e mostra aviso se fora da faixa 1.00–2.40 m.
- **Suprailíaca**: passa a aparecer SEMPRE no formulário de dobras (não some mais no JP3 masculino). Asterisco marca as obrigatórias do protocolo.

---

## Bloco 1 — Bonecos 3D reais (Three.js)

Instalar `three`, `@react-three/fiber`, `@react-three/drei`.

Criar `src/components/3d/`:
- `Body3D.tsx` — boneco humanoide low-poly (mesh paramétrica masc/fem), rotação por arrasto, zoom por pinça, iluminação cinemática.
- `MuscleHighlighter.tsx` — destaca grupos musculares (peito, costas, quadríceps, etc) com cor pulsante.
- `PosturalMarker3D.tsx` — marca pontos clicáveis nas regiões e sincroniza com checklist (substitui o SVG atual).

**Uso nas 4 telas:**
1. **Avaliação Postural** — boneco 3D rotacionável substituindo o SVG; clique em região alterna anomalia.
2. **Exercícios** — campo `musculos_alvo[]` (texto), boneco mostra os músculos pintados.
3. **Treinos ABCDE** — resumo no topo do dia mostra silhueta com os grupos do treino em destaque.
4. **Evolução** — boneco com heatmap das medidas (verde = reduziu, vermelho = aumentou) comparando 1ª vs última avaliação.

**Performance:** lazy load via `React.lazy` + `Suspense` (chunk separado, ~400KB gz só carrega ao abrir tela com 3D). Fallback SVG enquanto carrega.

---

## Bloco 2 — Admin total (cadastrar tudo)

### 2.1 Migration — 4 tabelas novas + 1 enum estendido
```text
custom_fields            — campos extras por contexto (anamnese|avaliacao)
  contexto, label, tipo (texto|numero|escolha|escala|booleano|data),
  opcoes jsonb, obrigatorio, ordem, ativo
custom_field_valores     — respostas
  custom_field_id, registro_id (anamnese ou avaliacao), valor jsonb
exercicio_categorias     — categorias próprias de exercícios
  nome, cor, icone, ordem
protocolos_avaliacao     — protocolos próprios
  nome, formula (jsonb: dobras necessárias, equação densidade), genero, ativo
```
+ FK `exercicios.categoria_id` (nullable) referenciando `exercicio_categorias`.
+ Todas com **RLS admin-only** via `has_role(auth.uid(),'admin')` para escrita; leitura liberada para `authenticated`.
+ GRANTs completos.

### 2.2 Tela `/admin/customizacao` (somente admin)
4 abas:
- **Campos da Anamnese** — CRUD visual: arrastar para reordenar, definir tipo, opções, obrigatoriedade.
- **Campos da Avaliação** — idem, com escolha de submenu (composição, perímetros, etc).
- **Categorias de Exercícios** — nome + cor + ícone, drag-and-drop.
- **Protocolos** — editor de fórmula: escolher dobras necessárias e equação de densidade (template JP-like preenchido).

### 2.3 Renderização dinâmica
- `<CustomFieldsSection contexto="anamnese" registroId={x} />` injetado no fim do form de anamnese e de cada submenu da avaliação.
- Componente `<DynamicField/>` para cada tipo.

### 2.4 Menu Admin
Item "Customização" no AppShell visível apenas se `isAdmin`.

---

## Implementação técnica (resumo)

```text
src/
├── components/3d/
│   ├── Body3D.tsx              (Three.js + R3F)
│   ├── MuscleHighlighter.tsx
│   ├── PosturalMarker3D.tsx
│   └── index.ts (lazy exports)
├── components/admin/
│   ├── CustomFieldsManager.tsx
│   ├── CategoriasManager.tsx
│   ├── ProtocolosManager.tsx
│   └── DynamicField.tsx
├── lib/customizacao.functions.ts  (server fns admin-only)
├── routes/_authenticated/admin.customizacao.tsx
└── routes/_authenticated/alunos.$id.avaliacoes.nova.tsx (integra 3D postural + custom fields)
supabase/migrations/<ts>_customizacao_e_3d.sql
```

---

## 3 melhorias bônus que vou incluir
1. **Backup/Restore JSON**: admin exporta TODA a configuração (campos, categorias, protocolos) num arquivo `.json` e importa em outro ambiente.
2. **Audit log**: tabela `audit_log` registra quem criou/editou/excluiu o quê (admin vê histórico completo).
3. **Modo "Personalizar para este aluno"**: campos extras podem ser marcados como visíveis só para alunos específicos (ex: pergunta de gestante só aparece para gestantes).

---

## Atenção
- O 3D real adiciona ~400KB ao bundle das telas onde é usado (lazy, não afeta carregamento inicial).
- Em celulares muito antigos pode cair pra ~30fps; o fallback SVG continua disponível via toggle "modo leve" nas preferências.
- A migration cria 4 tabelas + colunas — irreversível sem nova migration, então confirmação é importante.

Pronto pra executar tudo de uma vez?
