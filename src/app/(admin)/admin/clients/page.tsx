import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

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
          Liste de tous les praticiens inscrits
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {!clients || clients.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-4 text-gray-500">Aucun client inscrit</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-gray-500">
                    <th className="px-6 py-3 font-medium">Nom</th>
                    <th className="px-6 py-3 font-medium">Email</th>
                    <th className="px-6 py-3 font-medium">Téléphone</th>
                    <th className="px-6 py-3 font-medium">Cabinet</th>
                    <th className="px-6 py-3 font-medium">Statut</th>
                    <th className="px-6 py-3 font-medium">Inscrit le</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {clients.map((client) => (
                    <tr key={client.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium">
                        Dr {client.prenom} {client.nom}
                      </td>
                      <td className="px-6 py-4 text-sm">{client.email}</td>
                      <td className="px-6 py-4 text-sm">
                        {client.telephone || "—"}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {(client.cabinet as any)?.nom || "—"}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={client.actif ? "success" : "danger"}>
                          {client.actif ? "Actif" : "Inactif"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(client.created_at).toLocaleDateString("fr-FR")}
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
