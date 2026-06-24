"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  User,
  Calendar,
  Wrench,
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Save,
  X,
  Plus,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type FicheItem = {
  type_travail?: string;
  materiau?: string;
  teinte?: string;
  dents?: string[];
  notes?: string;
};

type Event = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  created_at: string;
  creator?: { id: string; nom: string; prenom: string } | null;
};

type Fiche = {
  id: string;
  numero: string;
  titre: string;
  description: string | null;
  statut: string;
  priorite: string;
  date_echeance: string | null;
  notes_internes: string | null;
  items: FicheItem[];
  created_at: string;
  updated_at: string;
  patient: { id: string; reference: string; nom: string; prenom: string; telephone?: string | null } | null;
  dentiste: { id: string; nom: string; prenom: string; email?: string; telephone?: string | null } | null;
  assignee: { id: string; nom: string; prenom: string; role_labo?: string | null } | null;
  creator: { id: string; nom: string; prenom: string } | null;
  events: Event[];
};

type Patient = { id: string; reference: string; nom: string; prenom: string };
type Collab = { id: string; nom: string; prenom: string; role_labo?: string | null };

const STATUT_LABELS: Record<string, string> = {
  brouillon: "Brouillon",
  en_cours: "En cours",
  controle_qualite: "Contrôle qualité",
  terminee: "Terminée",
  annulee: "Annulée",
};

const STATUT_COLORS: Record<string, string> = {
  brouillon: "bg-gray-100 text-gray-700 border-gray-200",
  en_cours: "bg-blue-50 text-blue-700 border-blue-200",
  controle_qualite: "bg-yellow-50 text-yellow-700 border-yellow-200",
  terminee: "bg-green-50 text-green-700 border-green-200",
  annulee: "bg-red-50 text-red-600 border-red-200",
};

const PRIO_COLORS: Record<string, string> = {
  basse: "bg-gray-50 text-gray-500",
  normale: "bg-sky-50 text-sky-700",
  haute: "bg-orange-50 text-orange-700",
  urgente: "bg-red-50 text-red-700",
};

const STATUTS_FLOW = ["brouillon", "en_cours", "controle_qualite", "terminee"];

export function FicheManuelleDetail({
  fiche,
  patients,
  collaborateurs,
}: {
  fiche: Fiche;
  patients: Patient[];
  collaborateurs: Collab[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Editable fields
  const [titre, setTitre] = useState(fiche.titre);
  const [description, setDescription] = useState(fiche.description || "");
  const [patientId, setPatientId] = useState(fiche.patient?.id || "");
  const [assigneeId, setAssigneeId] = useState(fiche.assignee?.id || "");
  const [priorite, setPriorite] = useState(fiche.priorite);
  const [dateEcheance, setDateEcheance] = useState(fiche.date_echeance || "");
  const [notesInternes, setNotesInternes] = useState(fiche.notes_internes || "");
  const [items, setItems] = useState<FicheItem[]>(fiche.items || []);
  const [statut, setStatut] = useState(fiche.statut);

  const addItem = () =>
    setItems((prev) => [...prev, { type_travail: "", materiau: "", teinte: "", notes: "" }]);
  const updateItem = (i: number, key: keyof FicheItem, val: string) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [key]: val } : it)));
  const removeItem = (i: number) =>
    setItems((prev) => prev.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    if (!titre.trim()) { setError("Le titre est requis."); return; }
    setSaving(true); setError("");
    const res = await fetch(`/api/admin/fiches-manuelles/${fiche.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titre: titre.trim(),
        description: description.trim() || null,
        patient_id: patientId || null,
        assignee_id: assigneeId || null,
        priorite,
        date_echeance: dateEcheance || null,
        notes_internes: notesInternes.trim() || null,
        items: items.filter((it) => it.type_travail),
        statut,
      }),
    });
    setSaving(false);
    if (res.ok) { setEditing(false); router.refresh(); }
    else {
      const json = await res.json().catch(() => ({}));
      setError((json as any).error || "Erreur");
    }
  };

  const changeStatut = async (s: string) => {
    await fetch(`/api/admin/fiches-manuelles/${fiche.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut: s }),
    });
    router.refresh();
  };

  const handleDelete = async () => {
    if (!confirm(`Supprimer la fiche ${fiche.numero} définitivement ?`)) return;
    await fetch(`/api/admin/fiches-manuelles/${fiche.id}`, { method: "DELETE" });
    router.push("/admin/fiches-manuelles");
  };

  const currentStep = STATUTS_FLOW.indexOf(fiche.statut);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2">
        <Link
          href="/admin/fiches-manuelles"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Fiches manuelles
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm text-gray-700 font-mono">{fiche.numero}</span>
      </div>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge className={cn("border text-sm px-2 py-0.5", STATUT_COLORS[fiche.statut] || "bg-gray-100 text-gray-700")}>
              {STATUT_LABELS[fiche.statut] || fiche.statut}
            </Badge>
            <Badge className={cn("text-sm px-2 py-0.5", PRIO_COLORS[fiche.priorite] || "")}>
              Priorité : {fiche.priorite}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{fiche.titre}</h1>
          {fiche.description && (
            <p className="mt-1 text-sm text-gray-500">{fiche.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button variant="outline" onClick={() => { setEditing(false); setError(""); }}>
                <X className="mr-1 h-4 w-4" />
                Annuler
              </Button>
              <Button onClick={handleSave} disabled={saving} className="bg-sky-600 hover:bg-sky-700">
                <Save className="mr-1 h-4 w-4" />
                {saving ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Edit3 className="mr-1 h-4 w-4" />
                Modifier
              </Button>
              <Button
                variant="outline"
                onClick={handleDelete}
                className="border-red-200 text-red-600 hover:bg-red-50"
              >
                <Trash2 className="mr-1 h-4 w-4" />
                Supprimer
              </Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      {/* Workflow barre */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-1">
            {STATUTS_FLOW.map((s, i) => (
              <button
                key={s}
                onClick={() => !editing && changeStatut(s)}
                className={cn(
                  "flex-1 rounded-lg py-2 text-xs font-medium transition-colors",
                  i <= currentStep
                    ? "bg-sky-600 text-white"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                )}
              >
                {STATUT_LABELS[s]}
              </button>
            ))}
            <button
              onClick={() => !editing && changeStatut("annulee")}
              className={cn(
                "rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                fiche.statut === "annulee"
                  ? "bg-red-500 text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600"
              )}
            >
              Annulée
            </button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Col gauche — infos principales */}
        <div className="lg:col-span-2 space-y-5">
          {/* Travaux */}
          <Card>
            <CardContent className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 flex items-center gap-1.5">
                  <ClipboardList className="h-4 w-4 text-sky-600" />
                  Travaux à réaliser
                </h2>
                {editing && (
                  <button onClick={addItem} className="text-xs text-sky-600 hover:underline">
                    + Ajouter
                  </button>
                )}
              </div>
              {items.length === 0 ? (
                <p className="text-sm text-gray-400">Aucun travail défini.</p>
              ) : (
                <div className="space-y-2">
                  {items.map((item, i) =>
                    editing ? (
                      <div key={i} className="grid grid-cols-4 gap-2 rounded-lg border border-gray-200 p-2">
                        <select
                          value={item.type_travail || ""}
                          onChange={(e) => updateItem(i, "type_travail", e.target.value)}
                          className="col-span-1 rounded border border-gray-200 px-2 py-1 text-xs"
                        >
                          <option value="">Type…</option>
                          <option value="couronne">Couronne</option>
                          <option value="bridge">Bridge</option>
                          <option value="inlay_onlay">Inlay/Onlay</option>
                          <option value="facette">Facette</option>
                          <option value="prothese_amovible">Prothèse amovible</option>
                          <option value="prothese_complete">Prothèse complète</option>
                          <option value="implant">Implant</option>
                          <option value="orthodontie">Orthodontie</option>
                          <option value="gouttiere">Gouttière</option>
                          <option value="autre">Autre</option>
                        </select>
                        <Input
                          value={item.materiau || ""}
                          onChange={(e) => updateItem(i, "materiau", e.target.value)}
                          placeholder="Matériau"
                          className="text-xs"
                        />
                        <Input
                          value={item.teinte || ""}
                          onChange={(e) => updateItem(i, "teinte", e.target.value)}
                          placeholder="Teinte"
                          className="text-xs"
                        />
                        <button onClick={() => removeItem(i)} className="text-xs text-red-500 hover:underline">
                          Suppr.
                        </button>
                        <Input
                          value={item.notes || ""}
                          onChange={(e) => updateItem(i, "notes", e.target.value)}
                          placeholder="Notes…"
                          className="col-span-4 text-xs"
                        />
                      </div>
                    ) : (
                      <div key={i} className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
                        <Wrench className="h-4 w-4 text-sky-500 shrink-0" />
                        <div>
                          <span className="font-medium text-gray-800 text-sm">
                            {item.type_travail?.replace(/_/g, " ") || "—"}
                          </span>
                          {(item.materiau || item.teinte) && (
                            <span className="ml-2 text-xs text-gray-500">
                              {[item.materiau, item.teinte].filter(Boolean).join(" · ")}
                            </span>
                          )}
                          {item.notes && (
                            <p className="mt-0.5 text-xs text-gray-400">{item.notes}</p>
                          )}
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes internes */}
          <Card>
            <CardContent className="p-5">
              <h2 className="mb-3 font-semibold text-gray-900">Notes internes</h2>
              {editing ? (
                <textarea
                  value={notesInternes}
                  onChange={(e) => setNotesInternes(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Notes internes…"
                />
              ) : fiche.notes_internes ? (
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{fiche.notes_internes}</p>
              ) : (
                <p className="text-sm text-gray-400">Aucune note.</p>
              )}
            </CardContent>
          </Card>

          {/* Timeline événements */}
          <Card>
            <CardContent className="p-5">
              <h2 className="mb-4 font-semibold text-gray-900 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-sky-600" />
                Historique
              </h2>
              {(fiche.events || []).length === 0 ? (
                <p className="text-sm text-gray-400">Aucun événement enregistré.</p>
              ) : (
                <ol className="relative ml-3 border-l border-gray-200 space-y-4">
                  {[...fiche.events]
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map((ev) => (
                      <li key={ev.id} className="ml-4">
                        <div className="absolute -left-1.5 h-3 w-3 rounded-full border border-white bg-sky-400" />
                        <p className="text-xs text-gray-400">
                          {new Date(ev.created_at).toLocaleString("fr-FR")}
                          {ev.creator && ` · ${ev.creator.prenom} ${ev.creator.nom}`}
                        </p>
                        <p className="text-sm text-gray-700">
                          {ev.type === "statut_change"
                            ? `Statut → ${STATUT_LABELS[(ev.payload as any).statut] || (ev.payload as any).statut}`
                            : ev.type}
                        </p>
                      </li>
                    ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Col droite — méta */}
        <div className="space-y-5">
          {/* Priorité & échéance */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Priorité</p>
                {editing ? (
                  <select
                    value={priorite}
                    onChange={(e) => setPriorite(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="basse">Basse</option>
                    <option value="normale">Normale</option>
                    <option value="haute">Haute</option>
                    <option value="urgente">Urgente</option>
                  </select>
                ) : (
                  <Badge className={cn("text-sm px-2", PRIO_COLORS[fiche.priorite] || "")}>
                    {fiche.priorite}
                  </Badge>
                )}
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Échéance</p>
                {editing ? (
                  <Input
                    type="date"
                    value={dateEcheance}
                    onChange={(e) => setDateEcheance(e.target.value)}
                  />
                ) : fiche.date_echeance ? (
                  <p className="text-sm text-gray-800 flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-gray-400" />
                    {new Date(fiche.date_echeance).toLocaleDateString("fr-FR")}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400">Non définie</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Patient */}
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Patient</p>
              {editing ? (
                <select
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">— Sans patient —</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nom} {p.prenom} ({p.reference})
                    </option>
                  ))}
                </select>
              ) : fiche.patient ? (
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100">
                    <User className="h-4 w-4 text-sky-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {fiche.patient.nom} {fiche.patient.prenom}
                    </p>
                    <p className="text-xs text-gray-500">{fiche.patient.reference}</p>
                    {fiche.patient.telephone && (
                      <p className="text-xs text-gray-500">{fiche.patient.telephone}</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400">Aucun patient lié</p>
              )}
            </CardContent>
          </Card>

          {/* Assigné */}
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Assigné à</p>
              {editing ? (
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">— Non assigné —</option>
                  {collaborateurs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nom} {c.prenom}{c.role_labo ? ` · ${c.role_labo}` : ""}
                    </option>
                  ))}
                </select>
              ) : fiche.assignee ? (
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100">
                    <Wrench className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {fiche.assignee.nom} {fiche.assignee.prenom}
                    </p>
                    {fiche.assignee.role_labo && (
                      <p className="text-xs text-gray-500">{fiche.assignee.role_labo}</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400">Non assigné</p>
              )}
            </CardContent>
          </Card>

          {/* Créé par */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Créé par</p>
                <p className="text-sm text-gray-700 mt-0.5">
                  {fiche.creator
                    ? `${fiche.creator.prenom} ${fiche.creator.nom}`
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Créé le</p>
                <p className="text-sm text-gray-700 mt-0.5">
                  {new Date(fiche.created_at).toLocaleString("fr-FR")}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Modifié le</p>
                <p className="text-sm text-gray-700 mt-0.5">
                  {new Date(fiche.updated_at).toLocaleString("fr-FR")}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
