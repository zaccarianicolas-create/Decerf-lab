import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Package,
  MessageSquare,
  Plus,
  Clock,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import { getStatusLabel, getStatusColor, formatDate } from "@/lib/utils";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Récupérer le profil
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Statistiques commandes
  const { data: commandes } = await supabase
    .from("commandes")
    .select("id, statut, montant_total, created_at, numero, patient_ref, priorite")
    .eq("dentiste_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const { count: totalCommandes } = await supabase
    .from("commandes")
    .select("id", { count: "exact", head: true })
    .eq("dentiste_id", user.id);

  const { count: commandesEnCours } = await supabase
    .from("commandes")
    .select("id", { count: "exact", head: true })
    .eq("dentiste_id", user.id)
    .in("statut", ["en_attente", "acceptee", "en_cours", "controle_qualite"]);

  const { count: messagesNonLus } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("lu", false)
    .neq("auteur_id", user.id);

  return (
    <div>
      {/* En-tête */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Bonjour, Dr {profile?.prenom} {profile?.nom}
          </h1>
          <p className="text-sm text-gray-500">
            Bienvenue sur votre espace DECERF LAB
          </p>
        </div>
        <Link href="/dashboard/commandes/nouvelle">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nouvelle commande
          </Button>
        </Link>
      </div>

      {/* Statistiques */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total commandes</p>
              <p className="text-2xl font-bold text-gray-900">
                {totalCommandes || 0}
              </p>
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
              <p className="text-2xl font-bold text-gray-900">
                {commandesEnCours || 0}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Terminées</p>
              <p className="text-2xl font-bold text-gray-900">
                {(totalCommandes || 0) - (commandesEnCours || 0)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100">
              <MessageSquare className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Messages non lus</p>
              <p className="text-2xl font-bold text-gray-900">
                {messagesNonLus || 0}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dernières commandes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Dernières commandes</CardTitle>
          <Link href="/dashboard/commandes">
            <Button variant="ghost" size="sm">
              Voir tout
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {!commandes || commandes.length === 0 ? (
            <div className="py-8 text-center">
              <Package className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-4 text-sm text-gray-500">
                Aucune commande pour le moment
              </p>
              <Link href="/dashboard/commandes/nouvelle" className="mt-4 block">
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Créer ma première commande
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-sm text-gray-500">
                    <th className="pb-3 font-medium">Numéro</th>
                    <th className="pb-3 font-medium">Patient</th>
                    <th className="pb-3 font-medium">Statut</th>
                    <th className="pb-3 font-medium">Priorité</th>
                    <th className="pb-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {commandes.map((commande) => (
                    <tr key={commande.id} className="hover:bg-gray-50">
                      <td className="py-3">
                        <Link
                          href={`/dashboard/commandes/${commande.id}`}
                          className="font-medium text-blue-600 hover:text-blue-500"
                        >
                          {commande.numero}
                        </Link>
                      </td>
                      <td className="py-3 text-sm text-gray-700">
                        {commande.patient_ref || "—"}
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(commande.statut)}`}
                        >
                          {getStatusLabel(commande.statut)}
                        </span>
                      </td>
                      <td className="py-3">
                        <Badge
                          variant={
                            commande.priorite === "urgente"
                              ? "danger"
                              : commande.priorite === "express"
                                ? "warning"
                                : "default"
                          }
                        >
                          {commande.priorite}
                        </Badge>
                      </td>
                      <td className="py-3 text-sm text-gray-500">
                        {formatDate(commande.created_at)}
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
