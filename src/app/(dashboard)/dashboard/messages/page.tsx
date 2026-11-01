import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { MessengerDentiste } from "./messenger-dentiste";

export const dynamic = "force-dynamic";

export default async function MessagesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const isEmbed =
    resolvedSearchParams?.embed === "1" ||
    (Array.isArray(resolvedSearchParams?.embed) &&
      resolvedSearchParams?.embed?.includes("1"));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: conversations, error: conversationsError } = await supabase
    .from("conversations")
    .select("id, titre, commande_id, derniere_activite, commande:commandes(numero)")
    .eq("dentiste_id", user.id)
    .order("derniere_activite", { ascending: false });

  if (conversationsError) throw new Error(conversationsError.message);
  const admin = createAdminClient();
  const { data: allProfiles, error: authorsError } = await admin
    .from("profiles")
    .select("id, nom, prenom, avatar_url, role")
    .or(`role.eq.admin,role.eq.technicien,id.eq.${user.id}`);
  if (authorsError) throw new Error(authorsError.message);

  const authorsMap = Object.fromEntries(
    (allProfiles ?? []).map((profile) => [profile.id, profile])
  );

  return (
    <div className={isEmbed ? "h-full" : ""}>
      {!isEmbed && (
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Messages · DECERF LAB</h1>
        </div>
      )}
      <MessengerDentiste
        initialConversations={conversations ?? []}
        currentUserId={user.id}
        authorsMap={authorsMap}
        isEmbed={Boolean(isEmbed)}
      />
    </div>
  );
}
