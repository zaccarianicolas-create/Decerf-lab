import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { getStatusLabel, getStatusColor, formatDate, formatPrice } from "@/lib/utils";

export default async function CommandesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: commandes } = await supabase
    .from("commandes")
    .select("*")
    .eq("dentiste_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mes commandes</h1>
          <p className="text-sm text-gray-500">
            Gérez et suivez vos commandes de travaux
          </p>
        </div>
        <Link href="/dashboard/commandes/nouvelle">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nouvelle commande
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          {!commandes || commandes.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-gray-500">Aucune commande</p>
              <Link href="/dashboard/commandes/nouvelle" className="mt-4 block">
                <Button size="sm">Créer une commande</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-sm text-gray-500">
                    <th className="px-6 py-3 font-medium">Numéro</th>
                    <th className="px-6 py-3 font-medium">Patient</th>
                    <th className="px-6 py-3 font-medium">Statut</th>
                    <th className="px-6 py-3 font-medium">Priorité</th>
                    <th className="px-6 py-3 font-medium">Montant</th>
                    <th className="px-6 py-3 font-medium">Date souhaitée</th>
                    <th className="px-6 py-3 font-medium">Créée le</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {commandes.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <Link
                          href={`/dashboard/commandes/${c.id}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {c.numero}
                        </Link>
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
                        {c.date_souhaitee
                          ? formatDate(c.date_souhaitee)
                          : "—"}
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
