"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
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
  Archive,
  ShieldOff,
  Clock,
} from "lucide-react";
import { NotesCliniquesPanel, type ClinicalNote } from "./notes-panel";
import { PatientTimeline } from "./timeline";

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
  factures,
  notes,
}: {
  patient: any;
  commandes: any[];
  factures: any[];
  notes: ClinicalNote[];
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
    telephone: patient.telephone || "",
    email: patient.email || "",
    allergies: patient.allergies || "",
    antecedents: patient.antecedents || "",
    traitements_en_cours: patient.traitements_en_cours || "",
    contre_indications: patient.contre_indications || "",
    medecin_traitant: patient.medecin_traitant || "",
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
        telephone: form.telephone || null,
        email: form.email || null,
        allergies: form.allergies || null,
        antecedents: form.antecedents || null,
        traitements_en_cours: form.traitements_en_cours || null,
        contre_indications: form.contre_indications || null,
        medecin_traitant: form.medecin_traitant || null,
      })
      .eq("id", patient.id);

    if (!error) {
      setPatient({ ...patient, ...form });
      setEditing(false);
    }
    setSaving(false);
  };

  const runAction = async (action: "archive" | "restore" | "anonymize") => {
    const labels: Record<typeof action, string> = {
      archive: "Archiver ce patient ?",
      restore: "Réactiver ce patient ?",
      anonymize:
        "Anonymiser définitivement ce patient ? Cette action est irréversible.",
    };
    if (!confirm(labels[action])) return;
    const res = await fetch(`/api/dashboard/patients/${patient.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) window.location.reload();
  };

  const certificats = commandes.flatMap((c: any) => c.certificats || []);

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
        <div className="flex gap-2">
          {patient.archived_at ? (
            <Button size="sm" variant="outline" onClick={() => runAction("restore")}>
              Réactiver
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => runAction("archive")}>
              <Archive className="mr-1 h-4 w-4" />
              Archiver
            </Button>
          )}
          {!patient.anonymized_at && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => runAction("anonymize")}
            >
              <ShieldOff className="mr-1 h-4 w-4" />
              Anonymiser
            </Button>
          )}
        </div>
      </div>

      {(patient.archived_at || patient.anonymized_at) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          {patient.anonymized_at
            ? `Patient anonymisé le ${new Date(patient.anonymized_at).toLocaleDateString("fr-FR")}.`
            : `Patient archivé le ${new Date(patient.archived_at).toLocaleDateString("fr-FR")}.`}
        </div>
      )}

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
                        telephone: patient.telephone || "",
                        email: patient.email || "",
                        allergies: patient.allergies || "",
                        antecedents: patient.antecedents || "",
                        traitements_en_cours: patient.traitements_en_cours || "",
                        contre_indications: patient.contre_indications || "",
                        medecin_traitant: patient.medecin_traitant || "",
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
                <Input
                  label="Téléphone"
                  value={form.telephone}
                  onChange={(e) =>
                    setForm({ ...form, telephone: e.target.value })
                  }
                />
                <Input
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm({ ...form, email: e.target.value })
                  }
                />
                <Input
                  label="Médecin traitant"
                  value={form.medecin_traitant}
                  onChange={(e) =>
                    setForm({ ...form, medecin_traitant: e.target.value })
                  }
                />
                {(
                  [
                    ["allergies", "Allergies"],
                    ["antecedents", "Antécédents"],
                    ["traitements_en_cours", "Traitements en cours"],
                    ["contre_indications", "Contre-indications"],
                    ["notes", "Notes générales"],
                  ] as const
                ).map(([k, label]) => (
                  <div key={k}>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      {label}
                    </label>
                    <textarea
                      value={(form as Record<string, string>)[k]}
                      onChange={(e) =>
                        setForm({ ...form, [k]: e.target.value })
                      }
                      rows={2}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                ))}
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
                {patient.telephone && (
                  <div>
                    <p className="text-xs text-gray-400">Téléphone</p>
                    <p className="font-medium">{patient.telephone}</p>
                  </div>
                )}
                {patient.email && (
                  <div>
                    <p className="text-xs text-gray-400">Email</p>
                    <p className="font-medium">{patient.email}</p>
                  </div>
                )}
                {patient.medecin_traitant && (
                  <div>
                    <p className="text-xs text-gray-400">Médecin traitant</p>
                    <p className="font-medium">{patient.medecin_traitant}</p>
                  </div>
                )}
                {patient.allergies && (
                  <div>
                    <p className="text-xs text-red-500">Allergies</p>
                    <p className="text-gray-700">{patient.allergies}</p>
                  </div>
                )}
                {patient.antecedents && (
                  <div>
                    <p className="text-xs text-gray-400">Antécédents</p>
                    <p className="text-gray-700">{patient.antecedents}</p>
                  </div>
                )}
                {patient.traitements_en_cours && (
                  <div>
                    <p className="text-xs text-gray-400">Traitements en cours</p>
                    <p className="text-gray-700">
                      {patient.traitements_en_cours}
                    </p>
                  </div>
                )}
                {patient.contre_indications && (
                  <div>
                    <p className="text-xs text-amber-600">Contre-indications</p>
                    <p className="text-gray-700">
                      {patient.contre_indications}
                    </p>
                  </div>
                )}
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

      <Card>
        <CardContent className="p-6">
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
            <Clock className="h-4 w-4 text-sky-600" />
            Historique complét
          </h2>
          <PatientTimeline
            commandes={commandes}
            certificats={certificats}
            factures={factures}
            notes={notes}
          />
        </CardContent>
      </Card>

      <NotesCliniquesPanel patientId={patient.id} initialNotes={notes} />
    </div>
  );
}
