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

  const userIds = Array.from(
    new Set([
      ...((logs ?? []).map((l: any) => l.actor_id).filter(Boolean) as string[]),
      ...((requests ?? []).map((r: any) => r.user_id).filter(Boolean) as string[]),
    ])
  );

  let profilesMap: Record<string, { nom: string | null; prenom: string | null; email: string | null }> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, nom, prenom, email")
      .in("id", userIds);
    profilesMap = Object.fromEntries(
      (profiles ?? []).map((p: any) => [p.id, { nom: p.nom, prenom: p.prenom, email: p.email }])
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
