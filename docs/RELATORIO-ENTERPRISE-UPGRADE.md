# Relatório Enterprise-Upgrade — ARIÉS

**Projeto:** ARIÉS (Arianny Pro Suite) — SaaS para personal trainers
**Stack:** TanStack Start + React 19 + TanStack Query + Supabase + Three.js
**Branch:** `refactor/enterprise-upgrade` · baseline `6d94bc6`
**Escopo:** 23 commits · 53 arquivos · +4.341 / −1.843 linhas
**Regra inviolável (cumprida):** identidade visual preservada — paleta preto/dourado, logo, tipografia (Playfair + Inter), sensação *luxury*.
**Gate de verificação:** `tsc --noEmit` + `npm run build` verdes em cada onda.

O trabalho foi executado em **6 fases**, em ondas pequenas, cada uma verificada e commitada isoladamente.

---

## 1. Sumário Executivo

| Fase | Tema | Status |
|---|---|---|
| F1 | Baseline | ✅ |
| F2 | Segurança base (rate-limit, CSP, headers, RLS) | ✅ |
| F3 | Camada de dados centralizada | ✅ |
| F4 | UX premium (skeleton/empty/erro/transição) | ✅ |
| F5 | Validação & Segurança (Zod + OWASP) | ✅ |
| F6 | Performance & Escalabilidade | ✅ |

Achado relevante da auditoria: o **Módulo 3D (prioridade alta) já cumpria a diretriz** — pintura direta na malha (vertex colors + skin weights + bone mapping), lesão `#F97316`, músculo azul, **sem marcadores em esfera**. Nenhuma alteração necessária no core do 3D.

---

## 2. Relatório de Auditoria

| # | Problema | Impacto | Prioridade | Resolução |
|---|---|---|---|---|
| 1 | Acesso a dados disperso: cada tela montava queries/mutations Supabase inline | Manutenção difícil, cache inconsistente, refresh quebrado em pontos | **Alta** | F3 — 13 módulos em `src/lib/queries/*` + fábrica `qk` |
| 2 | Dashboard não atualizava após criar/excluir aluno (query-key inconsistente) | Bug funcional visível | **Alta** | F3 (commit `267269b`) |
| 3 | Lista de alunos sem paginação (carregava tudo) | Não escala | **Alta** | F3 — paginação + busca no servidor |
| 4 | UX de carregamento inconsistente: spinners ou nada; telas "piscavam vazio" durante o load | Percepção amadora | **Alta** | F4 — skeleton + EmptyState + ErrorState em todas as telas com dados |
| 5 | Sem transição entre telas | Sensação estática | Média | F4 — `page-enter` global no AppShell |
| 6 | `avaliacaoSchema` desatualizado (nomes errados) e sem uso | Validação central inconsistente | Média | F5 — corrigido e aplicado |
| 7 | Escritas financeiras sem validação de faixa (valor podia ser negativo/absurdo) | Integridade de dados financeiros | Média | F5 — guardas na camada de dados |
| 8 | `QueryClient` sem defaults → `staleTime:0` + refetch no foco | Rede/CPU/re-render desperdiçados em toda navegação | **Alta** | F6 — defaults sensatos |
| 9 | `recharts` no chunk da rota de evolução (~111 kB gz) | Carga pesada de uma rota | Média | F6 — code-split lazy |
| 10 | `index` (entry) com 609 kB (180 kB gz) | Carga inicial | Média | **Recomendação** (precisa bundle-visualizer) |
| 11 | Stats financeiras agregadas no cliente (carrega todas as vendas) | Escalabilidade do financeiro | Média | **Recomendação** (agregação server-side) |
| 12 | Refino de precisão anatômica do 3D | Polimento | Baixa | **Recomendação** (core já atende) |

---

## 3. Relatório de Refatoração

### F2 — Segurança base (`c077f65`, `a14f16c`)
- Headers de segurança + CSP; correção de RLS aberto em `custom_field_valores`.
- Rate-limit e segredo dedicado no webhook público de lembrete de vencimento.

### F3 — Camada de dados (`bcba1a3` → `2642375`, 13 commits)
Toda leitura/escrita de entidade saiu das telas para **hooks tipados** em `src/lib/queries/*`, com fábrica central de query-keys (`qk`), optimistic updates nas exclusões e invalidação por prefixo.

Novos módulos: `alunos`, `exercicios`, `avaliacoes`, `dashboard`, `mensagens`, `portal`, `agenda`, `treinos`, `aluno-modulos`, `financeiro`, `permissoes`, `customizacao`, `query-keys`.

Resultado: **nenhuma rota em `_authenticated` importa o cliente Supabase** (só auth/sessão e o webhook server-side usam, corretamente).

### F4 — UX premium (`a137871` → `8e47bd1`, 6 commits)
- Kit: `ErrorState` (retry), `page-enter` (transição global, respeita `prefers-reduced-motion`), skeletons reutilizáveis (`Card/Rows/Stats/Detail/CardGrid`).
- Aplicado em todas as telas com dados: skeleton no load, `EmptyState` elegante, `ErrorState` com retry.
- Corrigido o "flash de vazio" durante o carregamento em mensagens, portal do aluno e detalhe de avaliação.
- Decisões: nutrição e dashboard-do-aluno mantidos *nav/interactive-first* (skeleton pioraria a UX); vazios por-view da agenda preservados (semântica de calendário).

### F5 — Validação & Segurança (`d1d53b9`)
- `avaliacaoSchema` corrigido (campos reais + `.passthrough()`) e aplicado na nova avaliação.
- Guardas de integridade financeira (faixa/obrigatoriedade) na camada de dados — defesa para todos os chamadores.

### F6 — Performance (`c9a45bc`)
- `QueryClient`: `staleTime: 30s`, `refetchOnWindowFocus: false`, `retry: 1`.
- `recharts` extraído para chunk lazy (`EvolucaoChart`).

---

## 4. Relatório de Performance (antes → depois)

### Runtime — refetches
| Item | Antes | Depois |
|---|---|---|
| `staleTime` | 0 (refetch a cada navegação) | 30 s |
| Refetch no foco da janela | ligado (refetch de tudo) | desligado |
| Retries por query | 3 (erro demora ~5 s+) | 1 (erro imediato → ErrorState) |

A camada F3 invalida explicitamente em cada mutação, então o cache continua correto sem refetch agressivo.

### Bundle — code-split do recharts (medido no build)
| Rota de evolução | Antes | Depois |
|---|---|---|
| Chunk da rota | 400 kB (111 kB gz) | **7,7 kB (3 kB gz)** |
| `recharts` | embutido na rota | chunk lazy próprio (108 kB gz), só ao renderizar o gráfico |

### Mapa do bundle (cliente, gzip)
- `index` (entry/vendor core): **180 kB** — alvo de otimização futura.
- `styles.css`: 17 kB.
- Chunks por rota: em geral 2–10 kB gz (route-split). 3D e PDF já lazy.

### Já otimizado no baseline
Route-split por tela · 3D (`Body3D`) e PDF (`@react-pdf`) carregados sob demanda · imagens com `loading="lazy"` · lista de alunos paginada no servidor · contexts globais de baixa rotação (não trocar por Zustand — não são gargalo).

---

## 5. Relatório de Segurança (OWASP Top 10)

A base já era forte (F2 + baseline). A auditoria confirmou e a F5 fechou os gaps de validação.

| OWASP 2021 | Situação | Evidência |
|---|---|---|
| A01 Broken Access Control | ✅ | RLS no Supabase + `requireSupabaseAuth` + `assertAdmin()`/`has_role` nas server functions + proteção anti-auto-exclusão |
| A02 Cryptographic Failures | ✅ | Auth/tokens geridos pelo Supabase; segredos em env; HTTPS |
| A03 Injection | ✅ | Queries parametrizadas (Supabase, sem SQL cru no cliente) + validação Zod |
| A04 Insecure Design | ✅ | Defesa em profundidade: RLS + validação de input no servidor (`inputValidator`) + validação no cliente |
| A05 Security Misconfiguration | ✅ | CSP + headers de segurança (F2) |
| A06 Vulnerable Components | ⚠️ | Dependências razoavelmente atuais — **recomendar `npm audit` periódico** |
| A07 Identity/Auth Failures | ✅/⚠️ | Auth Supabase + rate-limit no webhook — **recomendar rate-limit nos endpoints de auth** |
| A08 Data Integrity Failures | ✅ | `inputValidator` Zod nas server fns + guardas de integridade financeira (F5) |
| A09 Logging & Monitoring | ✅/⚠️ | `audit_log` nas operações admin + captura de erro — **recomendar observabilidade mais ampla** |
| A10 SSRF | ✅ | OCR recebe *data URL* (não URL arbitrária); gateway de IA é fixo |

### XSS / CSRF
- **XSS:** React escapa por padrão. Os 2 `dangerouslySetInnerHTML` são seguros — script de tema **estático** (`__root.tsx`) e CSS gerado pelo shadcn (`chart.tsx`); nenhum recebe input de usuário.
- **CSRF:** mitigado — as server functions autenticam por **bearer token** (header `Authorization`), não por cookie de sessão.

### Corrigido nesta rodada (F5)
- Validação central da avaliação física (Zod).
- Faixa/obrigatoriedade em vendas, metas e produtos na camada de dados.

---

## 6. Recomendações Futuras

**Escalabilidade (próximo passo de maior valor)**
1. **Agregação financeira no servidor:** hoje o dashboard/financeiro carrega todas as vendas para somar no cliente. Criar uma *view*/RPC Postgres (`receita_mensal`, `receita_anual`, `top_alunos`) para escalar a milhares de vendas por tenant.
2. **Índices de DB** nas colunas quentes: `vendas(personal_id, data_venda)`, `avaliacoes_fisicas(aluno_id, data_avaliacao)`, `agenda(personal_id, inicio)`, `treino_exercicios(treino_id)`.
3. **Constraints `CHECK` no banco** (defesa final): `valor_centavos > 0`, faixas de peso/altura — complementam a validação de aplicação.

**Performance**
4. Rodar um **bundle-visualizer** sobre o chunk `index` (180 kB gz) para identificar o que dá para adiar/dividir (ex.: `@supabase/supabase-js`).
5. Medir **Lighthouse** em produção (não foi possível neste ambiente) para confirmar metas (>90).

**Qualidade & Operação**
6. **Testes:** não há suíte. Adicionar Vitest (unidade nos `calculos/` e schemas) + Playwright (fluxos críticos: nova avaliação, venda, login).
7. **Lint/format:** baseline tem violações de Prettier/ESLint não impostas. Opcional: padronizar e adicionar gate em CI (hoje o gate é `tsc`).
8. **Observabilidade:** evoluir do reporte de erro atual para uma solução com alertas (ex.: Sentry).
9. **Rate-limit em auth** (login/reset) além do webhook.

**3D (polimento, baixa prioridade)**
10. A diretriz já está cumprida. Para precisão anatômica fina (pintar só o músculo, não toda a zona de influência do osso), seria necessário **máscaras de vértice por músculo** no asset GLB — trabalho dependente de modelagem, com validação visual. Recomendado apenas se houver demanda.

---

*Relatório gerado ao fim da fase F6. Fases F1–F6 entregues, verificadas (tsc + build) e commitadas; identidade da marca preservada integralmente.*
