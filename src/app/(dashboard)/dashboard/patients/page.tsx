import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PatientsList } from "./patients-list";

export default async function DashboardPatientsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: patients } = await supabase
    .from("patients")
    .select("*")
    .eq("dentiste_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Mes patients</h1>
        <p className="text-sm text-gray-500">
          Gérez vos patients et consultez leur historique de travaux
        </p>
      </div>
      <PatientsList initialPatients={patients ?? []} />
    </div>
  );
}
