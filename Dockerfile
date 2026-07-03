# syntax=docker/dockerfile:1

# ─── Build ─────────────────────────────────────────────────────────────────
# Imagem completa (tem build tools caso alguma dep precise compilar).
FROM node:22-bookworm AS build
WORKDIR /app

# Instala dependências primeiro (cache de camada).
# npm install (não ci) tolera pequenas defasagens do package-lock.json.
COPY package*.json ./
RUN npm install --no-audit --no-fund

# Código do app.
COPY . .

# As VITE_* são embutidas no bundle do CLIENTE no momento do build,
# por isso vêm como build args (e não como env de runtime).
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PROJECT_ID
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID \
    VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY

# Fora do sandbox Lovable → nitro usa o preset node-server (vite.config.ts)
# e gera .output/server/index.mjs com as deps já empacotadas.
RUN npm run build

# ─── Runtime ───────────────────────────────────────────────────────────────
# Imagem slim: só precisa do .output (deps já vêm bundladas pelo nitro).
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=build /app/.output ./.output

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
