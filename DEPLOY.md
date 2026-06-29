# Deploy do ARIÉS na VPS (Hostinger) — modo convivência

⚠️ **Esta VPS já roda outro projeto** (`nf-erp-demo`, com Caddy nas portas **80/443**).
Por isso o ARIÉS sobe **isolado, numa porta separada (8090)**, **sem tocar** no que já existe.

- Backend: **Supabase gerenciado (free)**.
- App: **servidor Node** em Docker, publicado em `:8090` (sem Caddy próprio).
- CI/CD: **push na `main` → GitHub Actions → VPS atualiza sozinha**.

Dados: `187.127.32.134` · Ubuntu 24.04 · 8 GB · Docker **já instalado**.

---

## 0. No Supabase (1 min — senão o login não fecha)

Dashboard → **Authentication → URL Configuration**:
- **Site URL:** `http://187.127.32.134:8090`
- **Redirect URLs:** adicione `http://187.127.32.134:8090/**`

(Quando tiver domínio/HTTPS, troque por `https://seu-dominio` — ver passo 6.)

---

## 1. Publicar no GitHub (no seu PC)

Crie um repositório **vazio e privado** no github.com e:
```bash
git remote add origin https://github.com/SEU_USUARIO/SEU_REPO.git
git push -u origin main
```

---

## 2. Subir o app na VPS (uma vez)

Conecte (Terminal da Hostinger ou `ssh root@187.127.32.134`):
```bash
# Docker já existe nesta VPS — NÃO reinstalar.
git clone https://github.com/SEU_USUARIO/SEU_REPO.git /opt/aries
cd /opt/aries
cp .env.example .env
nano .env     # cole as chaves do Supabase (publishable no VITE_*, secret no SERVICE_ROLE)

# libera só a porta do ARIÉS (não mexe nas 80/443 do outro projeto)
ufw allow 8090

docker compose up -d --build
```

Acesse no PC e no **celular**: **http://187.127.32.134:8090**

> Conferir que não quebrou o ERP: `curl -I http://localhost:80` (deve seguir respondendo) e `docker ps` (os `nf-erp-demo-*` continuam de pé).
> Se a porta 8090 estiver ocupada, defina `APP_PORT=8095` no `.env` e suba de novo.

---

## 3. Criar seu admin e testar no celular

O e-mail padrão do Supabase é limitado (pode não chegar). Jeito mais confiável, **sem depender de e-mail**:

1. Supabase → **Authentication → Users → Add user** → e-mail + senha + marque **"Auto Confirm User"** → Create.
2. Supabase → **SQL Editor** → rode (troque o e-mail) pra virar admin:
   ```sql
   insert into public.user_roles (user_id, role)
   select id, 'admin' from auth.users where email = 'admin@aries.app'
   on conflict do nothing;
   ```
3. Logue com esse e-mail/senha em `http://187.127.32.134:8090`.

> Alternativa por CLI (`scripts/create-admin.mjs`): só funciona onde houver Node + `npm i @supabase/supabase-js` (não roda dentro do container de runtime, que não tem node_modules).

---

## 4. Atualização automática via GitHub (uma vez)

**4.1** Gere uma chave SSH só pro deploy e instale a pública na VPS:
```bash
ssh-keygen -t ed25519 -f deploy_key -N ""
ssh-copy-id -i deploy_key.pub root@187.127.32.134
```
**4.2** GitHub → repo → Settings → Secrets and variables → Actions:
| Secret | Valor |
|---|---|
| `VPS_HOST` | `187.127.32.134` |
| `VPS_USER` | `root` |
| `VPS_SSH_KEY` | conteúdo do arquivo **`deploy_key`** (chave PRIVADA) |

Pronto — o workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) faz `git pull && docker compose up -d --build` a cada push na `main`.

---

## 5. Dia a dia

```bash
git push origin main            # → deploy automático na VPS
# na VPS, se precisar:
cd /opt/aries && docker compose logs -f app
docker compose restart app
```

---

## 6. (Opcional, depois) HTTPS + domínio bonito

Como o Caddy do `nf-erp-demo` já controla 80/443, o caminho limpo é **adicionar um site no Caddy que já existe** apontando pro ARIÉS — sem subir outro proxy. Isso exige:
1. um domínio/subdomínio apontando pro IP da VPS (ex.: `aries.seudominio.com`);
2. um bloco novo no Caddyfile do ERP: `aries.seudominio.com { reverse_proxy 172.17.0.1:8090 }` e recarregar o Caddy.

⚠️ Mexe na config do outro projeto — **me chame quando chegar aqui** que eu te passo o bloco exato depois de ver o Caddyfile do `nf-erp-demo` (`docker compose -f <dir-do-erp> ...`), pra não arriscar derrubar o ERP.

---

## Problemas comuns
- **Login falha:** revise o passo 0 (URLs no Supabase = `http://187.127.32.134:8090`).
- **Porta ocupada:** mude `APP_PORT` no `.env`.
- **Recursos admin / OCR:** exigem `SUPABASE_SERVICE_ROLE_KEY` (e `LOVABLE_API_KEY` p/ OCR) no `.env`.
- **Nunca** rode aqui nada que prenda 80/443 — é do `nf-erp-demo`.
