/**
 * Reporter d'erreurs ultra-léger (Sentry-compatible).
 * Si SENTRY_DSN n'est pas défini, envoie en console.
 * Évite la dépendance lourde pour cette V1 ; à remplacer plus tard par @sentry/nextjs.
 */
const DSN = process.env.SENTRY_DSN;
const ENV = process.env.NODE_ENV || "development";

type Ctx = Record<string, unknown>;

export function reportError(err: unknown, ctx?: Ctx) {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  const payload = {
    timestamp: new Date().toISOString(),
    env: ENV,
    message,
    stack,
    ctx,
  };
  if (!DSN) {
    // Dev : console.error structuré
    console.error("[error]", payload);
    return;
  }
  // Production : envoi best-effort sans bloquer le handler
  fetch(DSN, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {
    /* swallow */
  });
}

export function logInfo(event: string, ctx?: Ctx) {
  if (ENV === "production" && !ctx?.always) return;
  console.log("[info]", event, ctx ?? {});
}
