import { createMiddleware } from "@tanstack/react-start";

const isProd = process.env.NODE_ENV === "production";

// CSP aplicada só em produção (em dev quebraria o HMR/eval do Vite).
// 'unsafe-inline' em script/style é necessário pelo script de tema (no-flash) e
// pelos estilos inline do shadcn/Tailwind; endurecer depois com nonce.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob: https://*.supabase.co",
  "font-src 'self' data:",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "worker-src 'self' blob:",
  "upgrade-insecure-requests",
].join("; ");

/** Aplica headers de segurança (OWASP) em todas as respostas. */
export const securityHeaders = createMiddleware().server(async ({ next }) => {
  const result = await next();
  // O resultado pode ser um Response puro ou um objeto { response }.
  const response =
    result instanceof Response
      ? result
      : ((result as { response?: Response })?.response ?? null);
  if (response instanceof Response) {
    try {
      const h = response.headers;
      h.set("X-Content-Type-Options", "nosniff");
      h.set("X-Frame-Options", "DENY");
      h.set("Referrer-Policy", "strict-origin-when-cross-origin");
      h.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
      h.set("Cross-Origin-Opener-Policy", "same-origin");
      if (isProd) {
        h.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
        h.set("Content-Security-Policy", CONTENT_SECURITY_POLICY);
      }
    } catch {
      // headers imutáveis em alguns casos — não quebra a resposta.
    }
  }
  return result;
});
