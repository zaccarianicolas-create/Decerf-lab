"use client";

import { useState } from "react";
import Link from "next/link";
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
  Plus,
  Receipt,
  UserCog,
  FileText,
} from "lucide-react";

type Dentiste = {
  id: string;
  nom: string;
  prenom: string;
  sans_compte?: boolean;
};

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

export function AdminPatientDetail({
  patient: initialPatient,
  commandes,
  factures,
  notes,
  dentistes,
}: {
  patient: any;
  commandes: any[];
  factures: any[];
  notes: any[];
  dentistes: Dentiste[];
}) {
  const [patient, setPatient] = useState(initialPatient);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reassigning, setReassigning] = useState(false);
  const [newDentiste, setNewDentiste] = useState<string>(
    patient.dentiste_id || ""
  );
  const [form, setForm] = useState({
    nom: patient.nom ?? "",
    prenom: patient.prenom ?? "",
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
    const res = await fetch(`/api/admin/patients/${patient.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      setPatient({ ...patient, ...form });
      setEditing(false);
    }
  };

  const reassign = async () => {
    if (!confirm("Réassigner ce patient à un nouveau dentiste ? L'historique des commandes reste lié au dentiste d'origine.")) return;
    const res = await fetch(`/api/admin/patients/${patient.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dentiste_id: newDentiste || null }),
    });
    if (res.ok) window.location.reload();
  };

  const runAction = async (action: "archive" | "restore" | "anonymize") => {
    const labels: Record<typeof action, string> = {
      archive: "Archiver ce patient ?",
      restore: "Réactiver ce patient ?",
      anonymize:
        "Anonymiser définitivement ce patient ? Cette action est irréversible.",
    };
    if (!confirm(labels[action])) return;
    const res = await fetch(`/api/admin/patients/${patient.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) window.location.reload();
  };

  const newCommandeHref = `/admin/commandes/nouvelle?dentiste_id=${
    patient.dentiste_id ?? ""
  }&patient_id=${patient.id}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/patients"
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
        <div className="flex flex-wrap gap-2">
          <Link
            href={newCommandeHref}
            className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700"
          >
            <Plus className="h-4 w-4" />
            Nouveau travail
          </Link>
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
        {/* Colonne gauche */}
        <div className="space-y-6 lg:col-span-1">
          {/* Infos */}
          <Card>
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
                      onClick={() => setEditing(false)}
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
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
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
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
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
                        ? new Date(patient.date_naissance).toLocaleDateString("fr-FR")
                        : "—"}
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
                            : "—"}
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
                      <p className="text-xs text-gray-400">Traitements</p>
                      <p className="text-gray-700">{patient.traitements_en_cours}</p>
                    </div>
                  )}
                  {patient.contre_indications && (
                    <div>
                      <p className="text-xs text-amber-600">Contre-indications</p>
                      <p className="text-gray-700">{patient.contre_indications}</p>
                    </div>
                  )}
                  {patient.notes && (
                    <div>
                      <p className="text-xs text-gray-400">Notes</p>
                      <p className="text-gray-700">{patient.notes}</p>
                    </div>
                  )}
                  <div className="border-t border-gray-100 pt-3 text-xs text-gray-400">
                    Créé le {new Date(patient.created_at).toLocaleDateString("fr-FR")}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Réassignation */}
          <Card>
            <CardContent className="p-6">
              <h2 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
                <UserCog className="h-4 w-4 text-sky-600" />
                Dentiste référent
              </h2>
              <div className="mb-3 text-sm">
                {patient.dentiste ? (
                  <div>
                    <p className="font-medium">
                      Dr {patient.dentiste.prenom} {patient.dentiste.nom}
                    </p>
                    {patient.dentiste.sans_compte && (
                      <span className="inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                        Sans compte
                      </span>
                    )}
                    {patient.dentiste.cabinet?.nom && (
                      <p className="text-xs text-gray-500">
                        {patient.dentiste.cabinet.nom}
                      </p>
                    )}
                  </div>
                ) : (
                  <span className="inline-block rounded bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                    Patient orphelin
                  </span>
                )}
              </div>
              <select
                value={newDentiste}
                onChange={(e) => setNewDentiste(e.target.value)}
                className="mb-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">— Aucun (orphelin) —</option>
                {dentistes.map((d) => (
                  <option key={d.id} value={d.id}>
                    Dr {d.prenom} {d.nom}
                    {d.sans_compte ? " (sans compte)" : ""}
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                variant="outline"
                onClick={reassign}
                disabled={newDentiste === (patient.dentiste_id || "")}
                className="w-full"
              >
                Réassigner
              </Button>
              <p className="mt-2 text-[11px] text-gray-500">
                L'historique des travaux/factures reste lié au dentiste d'origine.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Colonne droite */}
        <div className="space-y-6 lg:col-span-2">
          {/* Travaux */}
          <Card>
            <CardContent className="p-6">
              <h2 className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
                <Briefcase className="h-4 w-4 text-sky-600" />
                Travaux ({commandes.length})
              </h2>
              {commandes.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-500">
                  Aucun travail
                </p>
              ) : (
                <div className="space-y-3">
                  {commandes.map((c) => {
                    const st = STATUT_LABELS[c.statut] || {
                      label: c.statut,
                      color: "",
                    };
                    const hasCert = c.certificats && c.certificats.length > 0;
                    return (
                      <Link
                        key={c.id}
                        href={`/admin/travaux/${c.id}`}
                        className="block rounded-lg border border-gray-200 p-4 hover:bg-gray-50"
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
                              Dr {c.dentiste?.prenom} {c.dentiste?.nom}
                              {c.dentiste?.sans_compte ? " (sans compte)" : ""}
                              {" · "}
                              {new Date(c.created_at).toLocaleDateString("fr-FR")}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
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
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Factures */}
          <Card>
            <CardContent className="p-6">
              <h2 className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
                <Receipt className="h-4 w-4 text-sky-600" />
                Factures ({factures.length})
              </h2>
              {factures.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-500">
                  Aucune facture
                </p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {factures.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between py-2 text-sm"
                    >
                      <div>
                        <p className="font-mono text-xs text-sky-600">
                          {f.numero}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(f.date_emission || f.created_at).toLocaleDateString("fr-FR")}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {Number(f.montant_ttc).toFixed(2)} €
                        </p>
                        <p className="text-xs text-gray-500">{f.statut}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes cliniques */}
          <Card>
            <CardContent className="p-6">
              <h2 className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
                <FileText className="h-4 w-4 text-sky-600" />
                Notes cliniques ({notes.length})
              </h2>
              {notes.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-500">
                  Aucune note clinique
                </p>
              ) : (
                <div className="space-y-3">
                  {notes.map((n: any) => (
                    <div
                      key={n.id}
                      className="rounded-lg border border-gray-200 p-3 text-sm"
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <span className="rounded bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700">
                          {n.type}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(n.date_note).toLocaleDateString("fr-FR")}
                        </span>
                      </div>
                      {n.titre && (
                        <p className="font-medium text-gray-900">{n.titre}</p>
                      )}
                      <p className="whitespace-pre-wrap text-gray-700">
                        {n.contenu}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
