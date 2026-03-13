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
  Briefcase,
  Edit,
  Save,
  X,
  FileCheck,
  Download,
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

export function PatientDetail({
  patient: initialPatient,
  commandes,
}: {
  patient: any;
  commandes: any[];
}) {
  const supabase = createClient();
  const [patient, setPatient] = useState(initialPatient);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nom: patient.nom,
    prenom: patient.prenom,
    date_naissance: patient.date_naissance || "",
    sexe: patient.sexe || "",
    notes: patient.notes || "",
  });

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("patients")
      .update({
        ...form,
        date_naissance: form.date_naissance || null,
        sexe: form.sexe || null,
        notes: form.notes || null,
      })
      .eq("id", patient.id);

    if (!error) {
      setPatient({ ...patient, ...form });
      setEditing(false);
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/patients"
          className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            {patient.prenom} {patient.nom}
          </h1>
          <p className="font-mono text-sm text-sky-600">{patient.reference}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Patient info */}
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
                        nom: patient.nom,
                        prenom: patient.prenom,
                        date_naissance: patient.date_naissance || "",
                        sexe: patient.sexe || "",
                        notes: patient.notes || "",
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
                  onChange={(e) =>
                    setForm({ ...form, prenom: e.target.value })
                  }
                />
                <Input
                  label="Nom"
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                />
                <Input
                  label="Date de naissance"
                  type="date"
                  value={form.date_naissance}
                  onChange={(e) =>
                    setForm({ ...form, date_naissance: e.target.value })
                  }
                />
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Sexe
                  </label>
                  <select
                    value={form.sexe}
                    onChange={(e) =>
                      setForm({ ...form, sexe: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  >
                    <option value="">Non renseigné</option>
                    <option value="M">Masculin</option>
                    <option value="F">Féminin</option>
                    <option value="X">Autre</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Notes
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={(e) =>
                      setForm({ ...form, notes: e.target.value })
                    }
                    rows={3}
                    placeholder="Allergies, remarques..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs text-gray-400">Date de naissance</p>
                  <p className="font-medium">
                    {patient.date_naissance
                      ? new Date(patient.date_naissance).toLocaleDateString(
                          "fr-FR"
                        )
                      : "Non renseignée"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Sexe</p>
                  <p className="font-medium">
                    {patient.sexe === "M"
                      ? "Masculin"
                      : patient.sexe === "F"
                        ? "Féminin"
                        : patient.sexe === "X"
                          ? "Autre"
                          : "Non renseigné"}
                  </p>
                </div>
                {patient.notes && (
                  <div>
                    <p className="text-xs text-gray-400">Notes</p>
                    <p className="text-gray-700">{patient.notes}</p>
                  </div>
                )}
                <div className="border-t border-gray-100 pt-3 text-xs text-gray-400">
                  Créé le{" "}
                  {new Date(patient.created_at).toLocaleDateString("fr-FR")}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Travaux */}
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <h2 className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
              <Briefcase className="h-4 w-4 text-sky-600" />
              Travaux ({commandes.length})
            </h2>

            {commandes.length === 0 ? (
              <div className="py-8 text-center">
                <Briefcase className="mx-auto h-10 w-10 text-gray-300" />
                <p className="mt-3 text-sm text-gray-500">
                  Aucun travail pour ce patient
                </p>
                <Link href="/dashboard/commandes/nouvelle">
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 gap-2"
                  >
                    Nouvelle commande
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {commandes.map((c) => {
                  const st = STATUT_LABELS[c.statut] || {
                    label: c.statut,
                    color: "",
                  };
                  const hasCert = c.certificats && c.certificats.length > 0;
                  return (
                    <div
                      key={c.id}
                      className="rounded-lg border border-gray-200 p-4 hover:bg-gray-50"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-mono text-xs text-sky-600">
                            {c.numero}
                          </p>
                          <p className="mt-1 text-sm text-gray-700">
                            {c.items
                              ?.map((i: any) =>
                                i.type_travail?.replace(/_/g, " ")
                              )
                              .join(", ") || "—"}
                          </p>
                          <p className="mt-1 text-xs text-gray-400">
                            {new Date(c.created_at).toLocaleDateString(
                              "fr-FR"
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${st.color}`}
                          >
                            {st.label}
                          </span>
                          {hasCert && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                              <FileCheck className="h-3 w-3" />
                              Certificat
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
