import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { MessagesPanel } from "./messages-panel";

export default async function AdminMessagesPage() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Charger les conversations avec le dernier message et le dentiste
  const { data: conversations } = await admin
    .from("conversations")
    .select(
      `
      *,
      dentiste:profiles!conversations_dentiste_id_fkey(id, nom, prenom, email, avatar_url),
      commande:commandes(numero)
    `
    )
    .order("derniere_activite", { ascending: false });

  // Compteur de messages non lus par conversation
  const { data: unreadCounts } = await admin
    .from("messages")
    .select("conversation_id, lu")
    .eq("lu", false)
    .neq("auteur_id", user.id);

  const unreadMap: Record<string, number> = {};
  if (unreadCounts) {
    for (const msg of unreadCounts) {
      unreadMap[msg.conversation_id] =
        (unreadMap[msg.conversation_id] || 0) + 1;
    }
  }

  // Charger tous les dentistes pour créer de nouvelles conversations
  const { data: dentistes } = await admin
    .from("profiles")
    .select("id, nom, prenom, email")
    .eq("role", "dentiste")
    .eq("actif", true)
    .eq("statut_compte", "approuve")
    .order("nom");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
        <p className="text-sm text-gray-500">
          Conversations avec les praticiens
        </p>
      </div>

      <MessagesPanel
        initialConversations={conversations ?? []}
        unreadMap={unreadMap}
        currentUserId={user.id}
        dentistes={dentistes ?? []}
      />
    </div>
  );
}
