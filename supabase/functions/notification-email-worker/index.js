import { processNotificationEmails } from "../../../src/lib/notification-email-worker.mjs";

const env = globalThis.Deno.env;
globalThis.Deno.serve(async (request) => {
  const secret = env.get("NOTIFICATION_WORKER_SECRET");
  if (request.method !== "POST" || !secret || request.headers.get("x-worker-secret") !== secret) return new Response("Unauthorized", { status: 401 });
  const apiKey = env.get("RESEND_API_KEY");
  if (!apiKey) return new Response("Email provider not configured", { status: 503 });
  const options = await request.json().catch(() => ({}));
  if (options?.dry_run === true) return Response.json({ configured: true, dry_run: true });
  const base = env.get("SUPABASE_URL");
  const service = env.get("SUPABASE_SERVICE_ROLE_KEY");
  const rpc = async (name, args) => {
    const response = await fetch(`${base}/rest/v1/rpc/${name}`, { method: "POST", headers: {
      "Content-Type": "application/json", apikey: service, Authorization: `Bearer ${service}`,
    }, body: JSON.stringify(args) });
    if (!response.ok) throw new Error(`Database operation failed (${response.status})`);
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  };
  const send = async (body, key) => {
    const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: {
      "Content-Type": "application/json", Authorization: `Bearer ${apiKey}`, "Idempotency-Key": key,
    }, body: JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || `Email provider error (${response.status})`);
    return result;
  };
  try {
    const result = await processNotificationEmails({ rpc, send,
      resolveImages: async (paths) => {
        const urls = {};
        for (const path of paths) {
          const response = await fetch(`${base}/storage/v1/object/sign/annonces/${path}`, { method: "POST", headers: { "Content-Type": "application/json", apikey: service, Authorization: `Bearer ${service}` }, body: JSON.stringify({ expiresIn: 604800 }) });
          if (!response.ok) throw new Error("Announcement image unavailable");
          const data = await response.json();
          urls[path] = `${base}/storage/v1${data.signedURL}`;
        }
        return urls;
      },
      appUrl: env.get("APP_URL") || "https://www.decerf-lab.be",
      from: env.get("EMAIL_FROM") || "DECERF LAB <noreply@notifications.decerf-lab.be>",
    });
    return Response.json(result);
  } catch {
    return new Response("Notification processing failed", { status: 500 });
  }
});