import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ClientsTable } from "./clients-table";

export default async function AdminClientsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: clients } = await supabase
    .from("profiles")
    .select("*, cabinet:cabinets(*)")
    .eq("role", "dentiste")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Gestion des clients</h1>
        <p className="text-sm text-gray-500">
          Validez les inscriptions et gérez les praticiens
        </p>
      </div>

      <ClientsTable initialClients={clients ?? []} />
    </div>
  );
}
