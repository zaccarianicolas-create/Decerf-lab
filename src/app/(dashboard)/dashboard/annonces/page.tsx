import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AnnoncesFeed } from "@/components/annonces-feed";

export default async function DentistAnnoncesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <div className="space-y-6"><h1 className="text-2xl font-bold">Annonces du laboratoire</h1><AnnoncesFeed userId={user.id} history /></div>;
}