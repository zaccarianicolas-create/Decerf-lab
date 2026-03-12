import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { ProtocolesManager } from "./protocoles-manager";

export default async function AdminProtocolesPage() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: protocoles } = await admin
    .from("protocoles")
    .select("*")
    .order("ordre", { ascending: true });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Protocoles</h1>
        <p className="text-sm text-gray-500">
          Procédures et protocoles du laboratoire
        </p>
      </div>

      <ProtocolesManager initialProtocoles={protocoles ?? []} />
    </div>
  );
}
