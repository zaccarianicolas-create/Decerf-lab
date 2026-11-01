import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type LabChatAuthor = {
  id: string;
  nom: string | null;
  prenom: string | null;
  avatar_url: string | null;
  role: string | null;
};

export type LabChatContact = {
  id: string;
  nom: string | null;
  prenom: string | null;
  role: "admin" | "technicien" | "dentiste";
};

export type LabChatConversation = {
  id: string;
  titre: string | null;
  commande_id: string | null;
  dentiste_id: string | null;
  private_user_low: string | null;
  private_user_high: string | null;
  derniere_activite: string;
  dentiste: LabChatAuthor | null;
};

export async function getLabMessengerData(expectedRole: "admin" | "technicien") {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles")
    .select("role, actif, actif_collaborateur, statut_compte")
    .eq("id", user.id).maybeSingle();
  if (profile?.role !== expectedRole || !profile.actif || profile.statut_compte !== "approuve"
    || (expectedRole === "technicien" && !profile.actif_collaborateur)) {
    redirect("/compte-en-attente");
  }

  const [conversationsResult, unreadResult, contactsResult] = await Promise.all([
    supabase.from("conversations")
      .select("id, titre, commande_id, dentiste_id, private_user_low, private_user_high, derniere_activite")
      .order("derniere_activite", { ascending: false }),
    supabase.rpc("get_chat_unread_counts"),
    admin.from("profiles").select("id, nom, prenom, role, actif_collaborateur")
      .in("role", ["dentiste", "admin", "technicien"])
      .eq("actif", true).eq("statut_compte", "approuve").neq("id", user.id).order("nom"),
  ]);
  const error = conversationsResult.error || unreadResult.error || contactsResult.error;
  if (error) throw new Error(error.message);
  const conversations = conversationsResult.data ?? [];
  const contacts: LabChatContact[] = (contactsResult.data ?? [])
    .filter((contact) => contact.role !== "technicien" || contact.actif_collaborateur)
    .map((contact) => ({
      id: contact.id, nom: contact.nom, prenom: contact.prenom,
      role: contact.role as LabChatContact["role"],
    }));
  const messagesResult = conversations.length
    ? await supabase.from("messages").select("auteur_id").in("conversation_id", conversations.map((conversation) => conversation.id))
    : { data: [], error: null };
  if (messagesResult.error) throw new Error(messagesResult.error.message);
  const profileIds = [...new Set([
    user.id, ...contacts.map((contact) => contact.id),
    ...(messagesResult.data ?? []).map((message) => message.auteur_id),
    ...conversations.flatMap((conversation) => [conversation.dentiste_id, conversation.private_user_low, conversation.private_user_high].filter((value): value is string => Boolean(value))),
  ])];
  const { data: authors, error: authorsError } = await admin.from("profiles")
    .select("id, nom, prenom, avatar_url, role").in("id", profileIds);
  if (authorsError) throw new Error(authorsError.message);
  const authorsMap: Record<string, LabChatAuthor> = Object.fromEntries((authors ?? []).map((author) => [author.id, author]));
  const unreadMap: Record<string, number> = {};
  for (const row of unreadResult.data ?? []) unreadMap[row.conversation_id] = Number(row.unread_count);

  return {
    currentUserId: user.id,
    initialConversations: conversations.map((conversation): LabChatConversation => ({
      ...conversation,
      dentiste: conversation.dentiste_id ? authorsMap[conversation.dentiste_id] ?? null : null,
    })),
    contacts,
    authorsMap,
    unreadMap,
  };
}