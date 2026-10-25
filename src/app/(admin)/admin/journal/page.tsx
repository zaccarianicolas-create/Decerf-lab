import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { JournalPanel } from "./journal-panel";

export const dynamic = "force-dynamic";

export default async function JournalPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/dashboard");

  const [{ data: logs }, { data: requests }] = await Promise.all([
    admin
      .from("audit_logs")
      .select(
        "id, created_at, actor_id, actor_role, action, entity_type, entity_id, metadata, ip"
      )
      .order("created_at", { ascending: false })
      .limit(200),
    admin
      .from("rgpd_requests")
      .select(
        "id, created_at, user_id, type, statut, message, reponse, traite_at"
      )
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const auditEntries = (logs ?? []) as Array<{
    actor_id: string | null;
    metadata: Record<string, unknown> | null;
  }>;
  const privacyRequests = (requests ?? []) as Array<{ user_id: string | null }>;
  const userIds = Array.from(new Set([
    ...auditEntries.flatMap((entry) => {
      const before = entry.metadata?.before as Record<string, unknown> | undefined;
      const after = entry.metadata?.after as Record<string, unknown> | undefined;
      return [entry.actor_id, before?.assignee_id, after?.assignee_id]
        .filter((id): id is string => typeof id === "string" && id.length > 0);
    }),
    ...privacyRequests
      .map((request) => request.user_id)
      .filter((id): id is string => typeof id === "string" && id.length > 0),
  ]));

  let profilesMap: Record<string, { nom: string | null; prenom: string | null; email: string | null }> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, nom, prenom, email")
      .in("id", userIds);
    profilesMap = Object.fromEntries(
      ((profiles ?? []) as Array<{ id: string; nom: string | null; prenom: string | null; email: string | null }>)
        .map((profile) => [profile.id, { nom: profile.nom, prenom: profile.prenom, email: profile.email }])
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Journal & Conformité
        </h1>
        <p className="text-sm text-gray-500">
          Audit logs des actions sensibles et demandes RGPD des praticiens.
        </p>
      </div>
      <JournalPanel
        logs={logs ?? []}
        requests={requests ?? []}
        profilesMap={profilesMap}
      />
    </div>
  );
}
