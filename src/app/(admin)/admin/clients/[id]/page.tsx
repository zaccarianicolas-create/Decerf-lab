import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect, notFound } from "next/navigation";
import { ClientDetail } from "./client-detail";

export default async function AdminClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch client profile
  const { data: client } = await admin
    .from("profiles")
    .select("*, cabinet:cabinets(*)")
    .eq("id", id)
    .single();

  if (!client) notFound();

  // Fetch client's patients
  const { data: patients } = await admin
    .from("patients")
    .select("*")
    .eq("dentiste_id", id)
    .order("created_at", { ascending: false });

  // Fetch client's commandes (travaux)
  const { data: commandes } = await admin
    .from("commandes")
    .select("*, patient:patients(nom, prenom, reference), items:commande_items(*)")
    .eq("dentiste_id", id)
    .order("created_at", { ascending: false });

  return (
    <ClientDetail
      client={client}
      patients={patients ?? []}
      commandes={commandes ?? []}
    />
  );
}
