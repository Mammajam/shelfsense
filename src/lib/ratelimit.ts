// Best-effort in-memory sliding-window limiter. On serverless each instance keeps its own counts,
// so this bounds casual abuse and runaway loops rather than guaranteeing a global cap.
const hits = new Map<string, number[]>();
const MAX_KEYS = 5000;

export interface Limit {
  limit: number;
  windowMs: number;
}

export function rateLimit(key: string, { limit, windowMs }: Limit, now = Date.now()) {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return { ok: false, retryAfter: Math.max(1, Math.ceil((recent[0] + windowMs - now) / 1000)) };
  }
  recent.push(now);
  if (hits.size >= MAX_KEYS && !hits.has(key)) hits.clear();
  hits.set(key, recent);
  return { ok: true, retryAfter: 0 };
}

export function clientKey(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return fwd || request.headers.get("x-real-ip") || "unknown";
}

/** Default: 10 requests per 10 minutes per client per route (override with RATE_LIMIT_PER_10MIN). */
export const DEFAULT_LIMIT: Limit = {
  limit: Number(process.env.RATE_LIMIT_PER_10MIN) || 10,
  windowMs: 10 * 60 * 1000,
};

/** Returns a 429 Response if the caller is over the limit, otherwise null. */
export function limitResponse(request: Request, route: string): Response | null {
  const r = rateLimit(`${route}:${clientKey(request)}`, DEFAULT_LIMIT);
  if (r.ok) return null;
  return Response.json(
    { error: `Rate limit reached. Please try again in ${r.retryAfter} seconds.` },
    { status: 429, headers: { "Retry-After": String(r.retryAfter) } },
  );
}
