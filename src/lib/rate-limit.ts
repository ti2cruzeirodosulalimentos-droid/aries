// Rate limiter simples em memória (janela fixa). Adequado para 1 processo (VPS).
// Em múltiplas instâncias/edge, usar store compartilhado (Redis) ou limitar no
// proxy (Caddy/Cloudflare).
type Entry = { count: number; resetAt: number };
const buckets = new Map<string, Entry>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const e = buckets.get(key);
  if (!e || e.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  e.count += 1;
  if (e.count > limit) return { ok: false, retryAfter: Math.ceil((e.resetAt - now) / 1000) };
  return { ok: true, retryAfter: 0 };
}

/** IP do cliente a partir dos headers de proxy (x-forwarded-for / x-real-ip). */
export function clientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

// Limpeza periódica das janelas expiradas (evita crescer indefinidamente).
const timer = setInterval(() => {
  const now = Date.now();
  for (const [k, e] of buckets) if (e.resetAt <= now) buckets.delete(k);
}, 60_000);
(timer as { unref?: () => void }).unref?.();
