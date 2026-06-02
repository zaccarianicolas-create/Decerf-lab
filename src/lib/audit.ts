import { createAdminClient } from "@/lib/supabase/admin";

export type AuditEntry = {
  actor_id?: string | null;
  actor_role?: string | null;
  action: string;
  entity_type?: string | null;
  entity_id?: string | null;
  metadata?: Record<string, unknown>;
  ip?: string | null;
  user_agent?: string | null;
};

/**
 * Écrit une entrée d'audit. Best-effort : ne lève jamais d'erreur pour
 * ne pas casser le flux métier qui l'appelle.
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("audit_logs").insert({
      actor_id: entry.actor_id ?? null,
      actor_role: entry.actor_role ?? null,
      action: entry.action,
      entity_type: entry.entity_type ?? null,
      entity_id: entry.entity_id ?? null,
      metadata: entry.metadata ?? {},
      ip: entry.ip ?? null,
      user_agent: entry.user_agent ?? null,
    });
  } catch (err) {
    console.error("[audit] failed to log entry", err);
  }
}

export function extractRequestMeta(req: Request): {
  ip: string | null;
  user_agent: string | null;
} {
  const headers = req.headers;
  const ip =
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    null;
  const user_agent = headers.get("user-agent") || null;
  return { ip, user_agent };
}
