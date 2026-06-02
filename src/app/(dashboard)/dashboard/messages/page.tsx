import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { MessengerDentiste } from "./messenger-dentiste";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: conversations } = await supabase
    .from("conversations")
    .select("id, titre, commande_id, derniere_activite, commande:commandes(numero)")
    .eq("dentiste_id", user.id)
    .order("derniere_activite", { ascending: false });

  const { data: unread } = await supabase
    .from("messages")
    .select("conversation_id, lu")
    .eq("lu", false)
    .neq("auteur_id", user.id);

  const unreadMap: Record<string, number> = {};
  for (const m of unread ?? []) {
    unreadMap[(m as any).conversation_id] =
      (unreadMap[(m as any).conversation_id] || 0) + 1;
  }

  // Charge tous les profils admin/dentiste pour afficher les noms
  const admin = createAdminClient();
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
          Échangez en temps réel avec le laboratoire.
        </p>
      </div>
      <MessengerDentiste
        initialConversations={(conversations as any[]) ?? []}
        unreadMap={unreadMap}
        currentUserId={user.id}
        authorsMap={authorsMap}
      />
    </div>
  );
}
