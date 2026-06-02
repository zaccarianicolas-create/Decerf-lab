import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CollaborateursPanel } from "./collaborateurs-panel";

export const dynamic = "force-dynamic";

export default async function CollaborateursPage() {
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

  const { data: collaborateurs } = await admin
    .from("profiles")
    .select(
      "id, nom, prenom, email, telephone, role_labo, actif_collaborateur, created_at"
    )
    .eq("role", "technicien")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Collaborateurs du laboratoire
        </h1>
        <p className="text-sm text-gray-500">
          Invitez des techniciens / prothésistes et gérez leurs rôles internes.
          Aucune information de rémunération n&apos;est stockée.
        </p>
      </div>
      <CollaborateursPanel initial={collaborateurs ?? []} />
    </div>
  );
}
