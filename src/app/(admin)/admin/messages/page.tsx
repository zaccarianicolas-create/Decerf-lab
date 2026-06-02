import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { MessengerAdmin } from "./messenger-admin";

export const dynamic = "force-dynamic";

export default async function AdminMessagesPage() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: conversations } = await admin
    .from("conversations")
    .select(
      `
      *,
      dentiste:profiles!conversations_dentiste_id_fkey(id, nom, prenom, avatar_url, role),
      commande:commandes(numero)
    `
    )
    .order("derniere_activite", { ascending: false });

  const { data: unread } = await admin
    .from("messages")
    .select("conversation_id, lu")
    .eq("lu", false)
    .neq("auteur_id", user.id);

  const unreadMap: Record<string, number> = {};
  for (const m of unread ?? []) {
    unreadMap[(m as any).conversation_id] =
      (unreadMap[(m as any).conversation_id] || 0) + 1;
  }

  const { data: dentistes } = await admin
    .from("profiles")
    .select("id, nom, prenom, email")
    .eq("role", "dentiste")
    .eq("actif", true)
    .eq("statut_compte", "approuve")
    .order("nom");

  const { data: allProfiles } = await admin
    .from("profiles")
    .select("id, nom, prenom, avatar_url, role");

  const authorsMap = Object.fromEntries(
    (allProfiles ?? []).map((p: any) => [p.id, p])
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Messagerie</h1>
        <p className="text-sm text-gray-500">
          Conversations en temps réel avec les praticiens.
        </p>
      </div>
      <MessengerAdmin
        initialConversations={(conversations as any[]) ?? []}
        unreadMap={unreadMap}
        currentUserId={user.id}
        dentistes={(dentistes as any[]) ?? []}
        authorsMap={authorsMap}
      />
    </div>
  );
}
