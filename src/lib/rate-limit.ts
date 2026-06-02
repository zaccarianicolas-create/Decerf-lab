/**
 * Rate limiter en mémoire (fenêtre glissante simple).
 * Suffisant pour 1 instance ; pour multi-instance, brancher Upstash Redis.
 *
 * Usage :
 *   const rl = await rateLimit(request, { key: "rgpd", limit: 5, windowMs: 60_000 });
 *   if (!rl.ok) return rl.response;
 */
import { NextRequest, NextResponse } from "next/server";

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "anonymous";
}

export async function rateLimit(
  request: NextRequest,
  opts: { key: string; limit: number; windowMs: number; by?: "ip" | "user"; userId?: string }
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const id =
    opts.by === "user" && opts.userId ? opts.userId : clientIp(request);
  const k = `${opts.key}:${id}`;
  const now = Date.now();

  // Cleanup occasionnel
  if (buckets.size > MAX_BUCKETS) {
    for (const [bk, bv] of buckets) if (bv.resetAt < now) buckets.delete(bk);
  }

  const cur = buckets.get(k);
  if (!cur || cur.resetAt < now) {
    buckets.set(k, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true };
  }
  if (cur.count >= opts.limit) {
    const retry = Math.max(1, Math.ceil((cur.resetAt - now) / 1000));
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Trop de requêtes, réessayez plus tard." },
        {
          status: 429,
          headers: {
            "Retry-After": String(retry),
            "X-RateLimit-Limit": String(opts.limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.ceil(cur.resetAt / 1000)),
          },
        }
      ),
    };
  }
  cur.count += 1;
  return { ok: true };
}
