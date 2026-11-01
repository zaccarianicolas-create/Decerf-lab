import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NotificationsPanel } from "@/app/(dashboard)/dashboard/profil/notifications-panel";

export default async function AtelierParametresPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Mes paramètres</h1>
      <NotificationsPanel userId={user.id} />
    </div>
  );
}