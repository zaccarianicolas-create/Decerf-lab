import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ContactsInbox } from "./contacts-inbox";

export const dynamic = "force-dynamic";

export default async function AdminContactsPage({ searchParams }: { searchParams: Promise<{ vue?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await createAdminClient().from("profiles").select("role, actif, statut_compte").eq("id",user.id).maybeSingle();
  if (profile?.role !== "admin" || !profile.actif || profile.statut_compte !== "approuve") redirect("/dashboard");
  const { data, error } = await supabase.from("contact_messages")
    .select("id, nom, email, telephone, sujet, message, traite, created_at, read_at, traite_at")
    .order("created_at", { ascending: false }).limit(500);
  if (error) throw new Error(error.message);
  return <ContactsInbox initial={data ?? []} initialFilter={["unread","pending","treated","all"].includes(params.vue || "") ? params.vue : "pending"} />;
}