import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getStatusLabel, getStatusColor, formatDate, formatPrice } from "@/lib/utils";

export default async function AdminCommandesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: commandes } = await supabase
    .from("commandes")
    .select("*, dentiste:profiles!dentiste_id(nom, prenom, email)")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Toutes les commandes
        </h1>
        <p className="text-sm text-gray-500">
          Gérez et suivez toutes les commandes du laboratoire
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {!commandes || commandes.length === 0 ? (
            <p className="py-12 text-center text-gray-500">
              Aucune commande
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-gray-500">
                    <th className="px-6 py-3 font-medium">Numéro</th>
                    <th className="px-6 py-3 font-medium">Dentiste</th>
                    <th className="px-6 py-3 font-medium">Patient</th>
                    <th className="px-6 py-3 font-medium">Statut</th>
                    <th className="px-6 py-3 font-medium">Priorité</th>
                    <th className="px-6 py-3 font-medium">Montant</th>
                    <th className="px-6 py-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {commandes.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-blue-600">
                        {c.numero}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        Dr {(c.dentiste as any)?.prenom}{" "}
                        {(c.dentiste as any)?.nom}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {c.patient_ref || "—"}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(c.statut)}`}
                        >
                          {getStatusLabel(c.statut)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          variant={
                            c.priorite === "urgente"
                              ? "danger"
                              : c.priorite === "express"
                                ? "warning"
                                : "default"
                          }
                        >
                          {c.priorite}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">
                        {formatPrice(c.montant_total)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(c.created_at)}
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
