import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AnnoncesEditor } from "./annonces-editor";

export const dynamic = "force-dynamic";

export default async function AdminAnnoncesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data, error } = await supabase.from("lab_annonces").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return <AnnoncesEditor initial={data ?? []} userId={user.id} />;
}