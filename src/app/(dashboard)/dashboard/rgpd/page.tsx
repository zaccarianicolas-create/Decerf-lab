import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RgpdPanel } from "./rgpd-panel";

export const dynamic = "force-dynamic";

export default async function RgpdPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: requests } = await supabase
    .from("rgpd_requests")
    .select("id, type, statut, message, reponse, created_at, traite_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-2 text-2xl font-semibold text-gray-900">
        Vos données personnelles
      </h1>
      <p className="mb-6 text-sm text-gray-500">
        Conformément au RGPD, vous pouvez à tout moment exporter vos données,
        demander une rectification ou la suppression de votre compte.
      </p>
      <RgpdPanel requests={requests ?? []} />
    </div>
  );
}
