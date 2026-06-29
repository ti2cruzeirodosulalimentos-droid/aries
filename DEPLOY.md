# Deploy do ARIÉS na VPS (Hostinger) + atualização via GitHub

Backend: **Supabase gerenciado (free)** — nada muda nele.
App: **servidor Node** rodando em Docker, atrás do **Caddy** (HTTPS automático).
CI/CD: **push na `main` → GitHub Actions → VPS atualiza sozinha**.

Dados desta VPS: `187.127.32.134` · hostname grátis `srv1783148.hstgr.cloud` · Ubuntu 24.04 · 8 GB.

---

## 0. No Supabase (1 minuto, evita login quebrado)

Dashboard → **Authentication → URL Configuration**:
- **Site URL:** `https://srv1783148.hstgr.cloud`
- **Redirect URLs:** adicione `https://srv1783148.hstgr.cloud/**`

(Sem isso, login por e-mail/OAuth e reset de senha falham no domínio novo.)

---

## 1. Preparar a VPS (uma vez)

Conecte: `ssh root@187.127.32.134`

```bash
# Docker + Compose
curl -fsSL https://get.docker.com | sh

# Firewall: libera SSH, HTTP e HTTPS
ufw allow 22 && ufw allow 80 && ufw allow 443 && ufw --force enable

# Clona o projeto em /opt/aries
git clone <SEU_REPO_GIT> /opt/aries
cd /opt/aries
```

> No painel da Hostinger, confirme em **Regras de firewall** que 80 e 443 estão liberadas também (lá estava "0").

---

## 2. Variáveis de ambiente (uma vez)

```bash
cd /opt/aries
cp .env.production.example .env
nano .env   # preencha as chaves do Supabase (publishable + secret)
```

> O `.env` fica só na VPS — não é versionado. As `VITE_*` entram no build; as `SUPABASE_SERVICE_ROLE_KEY` etc. são runtime.

---

## 3. Primeiro deploy

```bash
cd /opt/aries
docker compose up -d --build
```

Acesse: **https://srv1783148.hstgr.cloud** (o Caddy emite o certificado na 1ª vez, ~30s).
Teste no celular pelo mesmo endereço (está público na internet).

> Quer testar só por IP antes do DNS/HTTPS? No `Caddyfile`, troque o hostname por `:80` e use `http://187.127.32.134`.

---

## 4. Atualização automática via GitHub (uma vez)

**4.1 — Gere uma chave SSH só pro deploy (na sua máquina ou na VPS):**
```bash
ssh-keygen -t ed25519 -f deploy_key -N ""
# adiciona a PÚBLICA na VPS:
ssh-copy-id -i deploy_key.pub root@187.127.32.134   # ou cole deploy_key.pub em ~/.ssh/authorized_keys
```

**4.2 — No GitHub → repositório → Settings → Secrets and variables → Actions → New secret:**
| Secret | Valor |
|---|---|
| `VPS_HOST` | `187.127.32.134` |
| `VPS_USER` | `root` |
| `VPS_SSH_KEY` | conteúdo do arquivo **`deploy_key`** (a chave PRIVADA inteira) |

Pronto. O workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) já está no repo.

---

## 5. Dia a dia

```bash
git push origin main      # → Actions conecta na VPS, faz git pull + rebuild + restart
```

Acompanhe em **GitHub → aba Actions**.

---

## Comandos úteis (na VPS)

```bash
cd /opt/aries
docker compose logs -f app      # logs do app
docker compose logs -f caddy    # logs/HTTPS do proxy
docker compose ps               # status
docker compose restart app      # reinicia só o app
docker compose up -d --build    # rebuild manual
```

## Problemas comuns
- **HTTPS não sobe:** confirme que o hostname aponta pro IP e que 80/443 estão abertas (firewall Hostinger + ufw).
- **Login falha:** revise o passo 0 (URLs no Supabase).
- **Build estourou memória:** improvável com 8 GB; se ocorrer, `docker builder prune`.
- **Recursos admin (inativar conta, OCR):** exigem `SUPABASE_SERVICE_ROLE_KEY` (e `LOVABLE_API_KEY` p/ OCR) no `.env`.
