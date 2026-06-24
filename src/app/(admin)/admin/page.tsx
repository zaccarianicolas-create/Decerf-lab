import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  Package,
  MessageSquare,
  TrendingUp,
  Clock,
  AlertCircle,
  Bell,
  TriangleAlert,
  ShieldAlert,
  Mail,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

const ACTIVE_STATUSES = ["en_attente", "acceptee", "en_cours", "controle_qualite"];
const CLOSED_STATUSES = ["terminee", "expediee", "livree", "annulee"];

export default async function AdminPage() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Vérifier admin via service role
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") redirect("/dashboard");

  // Stats (via admin client pour éviter RLS)
  const { count: totalClients } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "dentiste")
    .eq("statut_compte", "approuve");

  const { count: inscriptionsEnAttente } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "dentiste")
    .eq("statut_compte", "en_attente");

  const { count: totalCommandes } = await admin
    .from("commandes")
    .select("id", { count: "exact", head: true });

  const { count: commandesEnCours } = await admin
    .from("commandes")
    .select("id", { count: "exact", head: true })
    .in("statut", ACTIVE_STATUSES);

  const { count: commandesUrgentes } = await admin
    .from("commandes")
    .select("id", { count: "exact", head: true })
    .in("statut", ACTIVE_STATUSES)
    .in("priorite", ["urgente", "express"]);

  const { count: paiementsEnAttente } = await admin
    .from("paiements")
    .select("id", { count: "exact", head: true })
    .eq("statut", "en_attente");

  const { count: messagesNonLus } = await admin
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("lu", false)
    .neq("auteur_id", user.id);

  const { count: contactsNonTraites } = await admin
    .from("contact_messages")
    .select("id", { count: "exact", head: true })
    .eq("traite", false);

  const { count: rgpdEnAttente } = await admin
    .from("rgpd_requests")
    .select("id", { count: "exact", head: true })
    .neq("statut", "traitee");

  const todayIso = new Date().toISOString().slice(0, 10);

  const { count: lotsPerimes } = await admin
    .from("stock_lots")
    .select("id", { count: "exact", head: true })
    .gt("quantite_restante", 0)
    .lt("date_peremption", todayIso);

  const { data: stockRows } = await admin
    .from("stock_articles")
    .select("id, quantite_stock, seuil_alerte")
    .eq("actif", true);

  const stockSousSeuil =
    stockRows?.filter((row: any) => Number(row.quantite_stock) <= Number(row.seuil_alerte)).length || 0;

  const { data: commandesRetardData } = await admin
    .from("commandes")
    .select("id, date_livraison, statut")
    .not("statut", "in", `(${CLOSED_STATUSES.join(",")})`)
    .lt("date_livraison", todayIso);

  const commandesEnRetard = commandesRetardData?.length || 0;

  const { data: recentCommandes } = await admin
    .from("commandes")
    .select("*, dentiste:profiles!dentiste_id(nom, prenom)")
    .order("created_at", { ascending: false })
    .limit(10);

  // Chiffre d'affaires
  const { data: paiements } = await admin
    .from("paiements")
    .select("montant")
    .eq("statut", "paye");
  const ca = paiements?.reduce((sum, p) => sum + Number(p.montant), 0) || 0;

  const alertes = [
    {
      label: "Messages non lus",
      value: messagesNonLus || 0,
      href: "/admin/messages",
      icon: MessageSquare,
      tone: "text-sky-700 bg-sky-50 border-sky-200",
    },
    {
      label: "Contacts non traités",
      value: contactsNonTraites || 0,
      href: "/admin/messages",
      icon: Mail,
      tone: "text-indigo-700 bg-indigo-50 border-indigo-200",
    },
    {
      label: "Commandes en retard",
      value: commandesEnRetard,
      href: "/admin/commandes",
      icon: TriangleAlert,
      tone: "text-rose-700 bg-rose-50 border-rose-200",
    },
    {
      label: "Lots périmés avec stock",
      value: lotsPerimes || 0,
      href: "/admin/stock",
      icon: ShieldAlert,
      tone: "text-red-700 bg-red-50 border-red-200",
    },
    {
      label: "Articles sous seuil",
      value: stockSousSeuil,
      href: "/admin/stock",
      icon: Package,
      tone: "text-amber-700 bg-amber-50 border-amber-200",
    },
    {
      label: "Demandes RGPD à traiter",
      value: rgpdEnAttente || 0,
      href: "/admin/journal",
      icon: Bell,
      tone: "text-violet-700 bg-violet-50 border-violet-200",
    },
  ];

  const totalNotifications = alertes.reduce((sum, a) => sum + a.value, 0);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Administration DECERF LAB
        </h1>
        <p className="text-sm text-gray-500">Vue d&apos;ensemble du laboratoire</p>
      </div>

      {/* Alerte inscriptions en attente */}
      {(inscriptionsEnAttente ?? 0) > 0 && (
        <Link href="/admin/clients">
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 transition-colors hover:bg-amber-100">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <p className="text-sm font-medium text-amber-800">
              {inscriptionsEnAttente} inscription{(inscriptionsEnAttente ?? 0) > 1 ? "s" : ""} en attente de validation
            </p>
          </div>
        </Link>
      )}

      {/* Stats */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
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
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-100">
              <TriangleAlert className="h-6 w-6 text-rose-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Retards</p>
              <p className="text-2xl font-bold">{commandesEnRetard}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100">
              <AlertCircle className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Urgentes/Express</p>
              <p className="text-2xl font-bold">{commandesUrgentes || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100">
              <ShieldAlert className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Lots périmés</p>
              <p className="text-2xl font-bold">{lotsPerimes || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100">
              <Package className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Stock sous seuil</p>
              <p className="text-2xl font-bold">{stockSousSeuil}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-100">
              <MessageSquare className="h-6 w-6 text-cyan-700" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Messages non lus</p>
              <p className="text-2xl font-bold">{messagesNonLus || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100">
              <Bell className="h-6 w-6 text-emerald-700" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Paiements en attente</p>
              <p className="text-2xl font-bold">{paiementsEnAttente || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-sky-600" />
            Centre de notifications opérationnelles
          </CardTitle>
          <BadgePill count={totalNotifications} />
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {alertes.map((alerte) => (
              <Link
                key={alerte.label}
                href={alerte.href}
                className={`rounded-lg border p-4 transition-colors hover:bg-gray-50 ${alerte.tone}`}
              >
                <div className="mb-1 flex items-center gap-2">
                  <alerte.icon className="h-4 w-4" />
                  <p className="text-sm font-medium">{alerte.label}</p>
                </div>
                <p className="text-2xl font-bold">{alerte.value}</p>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

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

function BadgePill({ count }: { count: number }) {
  return (
    <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
      {count} action{count > 1 ? "s" : ""}
    </span>
  );
}
