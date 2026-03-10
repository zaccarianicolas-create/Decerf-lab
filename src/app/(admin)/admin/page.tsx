import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  Package,
  MessageSquare,
  CreditCard,
  TrendingUp,
  Clock,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";

export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Vérifier admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") redirect("/dashboard");

  // Stats
  const { count: totalClients } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "dentiste");

  const { count: totalCommandes } = await supabase
    .from("commandes")
    .select("id", { count: "exact", head: true });

  const { count: commandesEnCours } = await supabase
    .from("commandes")
    .select("id", { count: "exact", head: true })
    .in("statut", ["en_attente", "acceptee", "en_cours", "controle_qualite"]);

  const { data: recentCommandes } = await supabase
    .from("commandes")
    .select("*, dentiste:profiles!dentiste_id(nom, prenom)")
    .order("created_at", { ascending: false })
    .limit(10);

  // Chiffre d'affaires
  const { data: paiements } = await supabase
    .from("paiements")
    .select("montant")
    .eq("statut", "paye");
  const ca = paiements?.reduce((sum, p) => sum + Number(p.montant), 0) || 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Administration DECERF LAB
        </h1>
        <p className="text-sm text-gray-500">Vue d&apos;ensemble du laboratoire</p>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Clients</p>
              <p className="text-2xl font-bold">{totalClients || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100">
              <Package className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Commandes totales</p>
              <p className="text-2xl font-bold">{totalCommandes || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-100">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">En cours</p>
              <p className="text-2xl font-bold">{commandesEnCours || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Chiffre d&apos;affaires</p>
              <p className="text-2xl font-bold">{formatPrice(ca)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dernières commandes */}
      <Card>
        <CardHeader>
          <CardTitle>Dernières commandes</CardTitle>
        </CardHeader>
        <CardContent>
          {!recentCommandes || recentCommandes.length === 0 ? (
            <p className="py-4 text-center text-gray-500">
              Aucune commande
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-gray-500">
                    <th className="pb-3 font-medium">Numéro</th>
                    <th className="pb-3 font-medium">Dentiste</th>
                    <th className="pb-3 font-medium">Patient</th>
                    <th className="pb-3 font-medium">Statut</th>
                    <th className="pb-3 font-medium">Montant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentCommandes.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="py-3 font-medium text-blue-600">
                        {c.numero}
                      </td>
                      <td className="py-3 text-sm">
                        Dr {(c.dentiste as any)?.prenom} {(c.dentiste as any)?.nom}
                      </td>
                      <td className="py-3 text-sm">{c.patient_ref || "—"}</td>
                      <td className="py-3 text-sm capitalize">
                        {c.statut.replace("_", " ")}
                      </td>
                      <td className="py-3 text-sm font-medium">
                        {formatPrice(c.montant_total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
