"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  User,
  Building2,
  Phone,
  Mail,
  Shield,
  Users,
  Briefcase,
  CheckCircle2,
  XCircle,
  Edit,
  Save,
  X,
} from "lucide-react";

const STATUT_LABELS: Record<string, { label: string; color: string }> = {
  en_attente: { label: "En attente", color: "border-amber-200 bg-amber-50 text-amber-700" },
  acceptee: { label: "Acceptée", color: "border-blue-200 bg-blue-50 text-blue-700" },
  en_cours: { label: "En cours", color: "border-indigo-200 bg-indigo-50 text-indigo-700" },
  controle_qualite: { label: "Contrôle qualité", color: "border-purple-200 bg-purple-50 text-purple-700" },
  terminee: { label: "Terminée", color: "border-green-200 bg-green-50 text-green-700" },
  expediee: { label: "Expédiée", color: "border-teal-200 bg-teal-50 text-teal-700" },
  livree: { label: "Livrée", color: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  annulee: { label: "Annulée", color: "border-red-200 bg-red-50 text-red-700" },
};

export function ClientDetail({
  client: initialClient,
  patients,
  commandes,
}: {
  client: any;
  patients: any[];
  commandes: any[];
}) {
  const supabase = createClient();
  const [client, setClient] = useState(initialClient);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nom: client.nom,
    prenom: client.prenom,
    telephone: client.telephone || "",
    numero_inami: client.numero_inami || "",
  });

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update(form)
      .eq("id", client.id);

    if (!error) {
      setClient({ ...client, ...form });
      setEditing(false);
    }
    setSaving(false);
  };

  const toggleStatut = async () => {
    const newStatut = client.statut_compte === "approuve" ? "rejete" : "approuve";
    const { error } = await supabase
      .from("profiles")
      .update({ statut_compte: newStatut, actif: newStatut === "approuve" })
      .eq("id", client.id);

    if (!error) {
      setClient({ ...client, statut_compte: newStatut, actif: newStatut === "approuve" });
    }
  };

  const travauxEnCours = commandes.filter(
    (c) => !["terminee", "livree", "annulee"].includes(c.statut)
  ).length;
  const travauxTermines = commandes.filter((c) =>
    ["terminee", "livree"].includes(c.statut)
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/clients"
          className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            Dr {client.prenom} {client.nom}
          </h1>
          <p className="text-sm text-gray-500">Fiche client détaillée</p>
        </div>
        <div className="flex items-center gap-2">
          {client.statut_compte === "approuve" ? (
            <Badge variant="success">Actif</Badge>
          ) : client.statut_compte === "en_attente" ? (
            <Badge className="border-amber-200 bg-amber-50 text-amber-700">
              En attente
            </Badge>
          ) : (
            <Badge variant="danger">Inactif</Badge>
          )}
          <Button variant="outline" size="sm" onClick={toggleStatut}>
            {client.statut_compte === "approuve" ? (
              <>
                <XCircle className="mr-1.5 h-3.5 w-3.5" /> Désactiver
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Approuver
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="mx-auto mb-1 h-5 w-5 text-sky-500" />
            <p className="text-2xl font-bold text-gray-900">{patients.length}</p>
            <p className="text-xs text-gray-500">Patients</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Briefcase className="mx-auto mb-1 h-5 w-5 text-indigo-500" />
            <p className="text-2xl font-bold text-gray-900">{commandes.length}</p>
            <p className="text-xs text-gray-500">Total travaux</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Briefcase className="mx-auto mb-1 h-5 w-5 text-amber-500" />
            <p className="text-2xl font-bold text-gray-900">{travauxEnCours}</p>
            <p className="text-xs text-gray-500">En cours</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Briefcase className="mx-auto mb-1 h-5 w-5 text-green-500" />
            <p className="text-2xl font-bold text-gray-900">{travauxTermines}</p>
            <p className="text-xs text-gray-500">Terminés</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Profil */}
        <Card className="lg:col-span-1">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-semibold text-gray-900">
                <User className="h-4 w-4 text-sky-600" />
                Informations
              </h2>
              {!editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
                >
                  <Edit className="h-4 w-4" />
                </button>
              ) : (
                <div className="flex gap-1">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-lg p-1.5 text-green-600 hover:bg-green-50"
                  >
                    <Save className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      setEditing(false);
                      setForm({
                        nom: client.nom,
                        prenom: client.prenom,
                        telephone: client.telephone || "",
                        numero_inami: client.numero_inami || "",
                      });
                    }}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {editing ? (
              <div className="space-y-3">
                <Input
                  label="Prénom"
                  value={form.prenom}
                  onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                />
                <Input
                  label="Nom"
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                />
                <Input
                  label="Téléphone"
                  value={form.telephone}
                  onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                />
                <Input
                  label="N° INAMI/RIZIV"
                  value={form.numero_inami}
                  onChange={(e) =>
                    setForm({ ...form, numero_inami: e.target.value })
                  }
                />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span>{client.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span>{client.telephone || "—"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Shield className="h-4 w-4 text-gray-400" />
                  <span>INAMI : {client.numero_inami || "Non renseigné"}</span>
                </div>
                {client.cabinet && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-gray-400" />
                    <span>{client.cabinet.nom}</span>
                  </div>
                )}
                <div className="mt-3 border-t border-gray-100 pt-3 text-xs text-gray-400">
                  Inscrit le{" "}
                  {new Date(client.created_at).toLocaleDateString("fr-FR")}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Patients list */}
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <h2 className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
              <Users className="h-4 w-4 text-sky-600" />
              Patients ({patients.length})
            </h2>

            {patients.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">
                Aucun patient enregistré
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="pb-2 pr-4 font-medium">Référence</th>
                      <th className="pb-2 pr-4 font-medium">Nom</th>
                      <th className="pb-2 pr-4 font-medium">Date naiss.</th>
                      <th className="pb-2 font-medium">Sexe</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {patients.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="py-2 pr-4 font-mono text-xs text-sky-600">
                          {p.reference}
                        </td>
                        <td className="py-2 pr-4">
                          {p.prenom} {p.nom}
                        </td>
                        <td className="py-2 pr-4 text-gray-500">
                          {p.date_naissance
                            ? new Date(p.date_naissance).toLocaleDateString("fr-FR")
                            : "—"}
                        </td>
                        <td className="py-2 text-gray-500">{p.sexe || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Travaux */}
      <Card>
        <CardContent className="p-6">
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
            <Briefcase className="h-4 w-4 text-sky-600" />
            Historique des travaux ({commandes.length})
          </h2>

          {commandes.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">
              Aucun travail enregistré
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 pr-4 font-medium">N°</th>
                    <th className="pb-2 pr-4 font-medium">Patient</th>
                    <th className="pb-2 pr-4 font-medium">Type(s)</th>
                    <th className="pb-2 pr-4 font-medium">Statut</th>
                    <th className="pb-2 pr-4 font-medium">Priorité</th>
                    <th className="pb-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {commandes.map((c) => {
                    const st = STATUT_LABELS[c.statut] || {
                      label: c.statut,
                      color: "",
                    };
                    return (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="py-2 pr-4">
                          <Link
                            href={`/admin/travaux/${c.id}`}
                            className="font-mono text-xs text-sky-600 hover:underline"
                          >
                            {c.numero}
                          </Link>
                        </td>
                        <td className="py-2 pr-4 text-gray-700">
                          {c.patient
                            ? `${c.patient.prenom} ${c.patient.nom}`
                            : c.patient_ref || "—"}
                        </td>
                        <td className="py-2 pr-4 text-gray-500">
                          {c.items
                            ?.map((i: any) =>
                              i.type_travail?.replace(/_/g, " ")
                            )
                            .join(", ") || "—"}
                        </td>
                        <td className="py-2 pr-4">
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${st.color}`}
                          >
                            {st.label}
                          </span>
                        </td>
                        <td className="py-2 pr-4">
                          {c.priorite === "urgente" || c.priorite === "express" ? (
                            <Badge variant="danger">{c.priorite}</Badge>
                          ) : (
                            <span className="text-xs text-gray-400">Normale</span>
                          )}
                        </td>
                        <td className="py-2 text-gray-500">
                          {new Date(c.created_at).toLocaleDateString("fr-FR")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
