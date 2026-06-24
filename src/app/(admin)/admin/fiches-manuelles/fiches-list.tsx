"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  ClipboardList,
  User,
  Calendar,
  ArrowRight,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";

type FicheItem = {
  type_travail?: string;
  materiau?: string;
  teinte?: string;
  notes?: string;
};

type Fiche = {
  id: string;
  numero: string;
  titre: string;
  statut: string;
  priorite: string;
  date_echeance: string | null;
  items: FicheItem[];
  created_at: string;
  patient: { id: string; reference: string; nom: string; prenom: string } | null;
  dentiste: { id: string; nom: string; prenom: string } | null;
  assignee: { id: string; nom: string; prenom: string } | null;
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
  basse: "bg-gray-50 text-gray-500 border-gray-200",
  normale: "bg-sky-50 text-sky-700 border-sky-200",
  haute: "bg-orange-50 text-orange-700 border-orange-200",
  urgente: "bg-red-50 text-red-700 border-red-200",
};

export function FichesManuellsList({
  initialFiches,
  patients,
  collaborateurs,
}: {
  initialFiches: Fiche[];
  patients: Patient[];
  collaborateurs: Collab[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filterStatut, setFilterStatut] = useState("all");
  const [filterPrio, setFilterPrio] = useState("all");
  const [showCreate, setShowCreate] = useState(false);

  // Create form state
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [patientId, setPatientId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [priorite, setPriorite] = useState("normale");
  const [dateEcheance, setDateEcheance] = useState("");
  const [items, setItems] = useState<FicheItem[]>([{ type_travail: "", materiau: "", teinte: "", notes: "" }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const filtered = useMemo(() => {
    return initialFiches.filter((f) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        f.titre.toLowerCase().includes(q) ||
        f.numero.toLowerCase().includes(q) ||
        f.patient?.nom?.toLowerCase().includes(q) ||
        f.patient?.prenom?.toLowerCase().includes(q) ||
        false;
      const matchStatut = filterStatut === "all" || f.statut === filterStatut;
      const matchPrio = filterPrio === "all" || f.priorite === filterPrio;
      return matchSearch && matchStatut && matchPrio;
    });
  }, [initialFiches, search, filterStatut, filterPrio]);

  const addItem = () =>
    setItems((prev) => [...prev, { type_travail: "", materiau: "", teinte: "", notes: "" }]);

  const updateItem = (i: number, key: keyof FicheItem, val: string) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [key]: val } : it)));

  const removeItem = (i: number) =>
    setItems((prev) => prev.filter((_, idx) => idx !== i));

  const handleCreate = async () => {
    if (!titre.trim()) { setError("Le titre est requis."); return; }
    setSaving(true); setError("");
    const res = await fetch("/api/admin/fiches-manuelles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titre: titre.trim(),
        description: description.trim() || null,
        patient_id: patientId || null,
        assignee_id: assigneeId || null,
        priorite,
        date_echeance: dateEcheance || null,
        items: items.filter((it) => it.type_travail),
        statut: "brouillon",
      }),
    });
    setSaving(false);
    if (res.ok) {
      const data = await res.json();
      router.push(`/admin/fiches-manuelles/${data.id}`);
    } else {
      const json = await res.json().catch(() => ({}));
      setError((json as any).error || "Erreur");
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fiches manuelles</h1>
          <p className="mt-1 text-sm text-gray-500">
            Ordres de travail internes sans commande client
          </p>
        </div>
        <Button
          onClick={() => setShowCreate((v) => !v)}
          className="gap-1.5 bg-sky-600 hover:bg-sky-700"
        >
          <Plus className="h-4 w-4" />
          Nouvelle fiche
        </Button>
      </div>

      {/* Formulaire rapide de création */}
      {showCreate && (
        <Card className="mb-6 border-sky-200 bg-sky-50/40">
          <CardContent className="p-5 space-y-4">
            <h2 className="font-semibold text-gray-800">Nouvelle fiche de travail</h2>

            {error && (
              <p className="rounded-lg bg-red-50 p-2 text-sm text-red-600">{error}</p>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Titre <span className="text-red-500">*</span>
                </label>
                <Input
                  value={titre}
                  onChange={(e) => setTitre(e.target.value)}
                  placeholder="ex: Réparation prothèse partielle"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Description optionnelle…"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Patient (optionnel)</label>
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
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Assigné à</label>
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">— Non assigné —</option>
                  {collaborateurs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nom} {c.prenom}
                      {c.role_labo ? ` · ${c.role_labo}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Priorité</label>
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
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Date d'échéance</label>
                <Input
                  type="date"
                  value={dateEcheance}
                  onChange={(e) => setDateEcheance(e.target.value)}
                />
              </div>
            </div>

            {/* Items */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Travaux à réaliser</label>
                <button
                  type="button"
                  onClick={addItem}
                  className="text-xs text-sky-600 hover:underline"
                >
                  + Ajouter
                </button>
              </div>
              <div className="space-y-2">
                {items.map((item, i) => (
                  <div key={i} className="grid grid-cols-4 gap-2 rounded-lg border border-gray-200 bg-white p-2">
                    <select
                      value={item.type_travail}
                      onChange={(e) => updateItem(i, "type_travail", e.target.value)}
                      className="rounded border border-gray-200 px-2 py-1 text-xs"
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
                      value={item.materiau ?? ""}
                      onChange={(e) => updateItem(i, "materiau", e.target.value)}
                      placeholder="Matériau"
                      className="text-xs"
                    />
                    <Input
                      value={item.teinte ?? ""}
                      onChange={(e) => updateItem(i, "teinte", e.target.value)}
                      placeholder="Teinte"
                      className="text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Suppr.
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreate(false)}>
                Annuler
              </Button>
              <Button
                onClick={handleCreate}
                disabled={saving}
                className="bg-sky-600 hover:bg-sky-700"
              >
                {saving ? "Création…" : "Créer la fiche"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtres */}
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher…"
            className="pl-9"
          />
        </div>
        <select
          value={filterStatut}
          onChange={(e) => setFilterStatut(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="all">Tous les statuts</option>
          {Object.entries(STATUT_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={filterPrio}
          onChange={(e) => setFilterPrio(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="all">Toutes priorités</option>
          <option value="urgente">Urgente</option>
          <option value="haute">Haute</option>
          <option value="normale">Normale</option>
          <option value="basse">Basse</option>
        </select>
      </div>

      {/* Stats rapides */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {Object.entries(STATUT_LABELS).map(([k, v]) => {
          const n = initialFiches.filter((f) => f.statut === k).length;
          return (
            <button
              key={k}
              onClick={() => setFilterStatut(k === filterStatut ? "all" : k)}
              className={cn(
                "rounded-lg border px-3 py-2 text-center transition-colors",
                filterStatut === k
                  ? "border-sky-300 bg-sky-100"
                  : "border-gray-200 bg-white hover:bg-gray-50"
              )}
            >
              <p className="text-xl font-bold text-gray-900">{n}</p>
              <p className="text-xs text-gray-500">{v}</p>
            </button>
          );
        })}
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12">
            <ClipboardList className="h-10 w-10 text-gray-300" />
            <p className="text-gray-500">Aucune fiche manuelle trouvée.</p>
            <Button
              size="sm"
              onClick={() => setShowCreate(true)}
              className="bg-sky-600 hover:bg-sky-700"
            >
              <Plus className="mr-1 h-4 w-4" />
              Créer la première fiche
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((fiche) => (
            <Link key={fiche.id} href={`/admin/fiches-manuelles/${fiche.id}`}>
              <Card className="cursor-pointer transition-shadow hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="text-xs font-mono text-gray-400">{fiche.numero}</span>
                        <Badge className={cn("border text-xs", STATUT_COLORS[fiche.statut] || "bg-gray-100 text-gray-700")}>
                          {STATUT_LABELS[fiche.statut] || fiche.statut}
                        </Badge>
                        <Badge className={cn("border text-xs", PRIO_COLORS[fiche.priorite] || "bg-gray-100 text-gray-700")}>
                          {fiche.priorite}
                        </Badge>
                      </div>
                      <p className="font-semibold text-gray-900 truncate">{fiche.titre}</p>
                      <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-500">
                        {fiche.patient && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {fiche.patient.nom} {fiche.patient.prenom} ({fiche.patient.reference})
                          </span>
                        )}
                        {fiche.assignee && (
                          <span className="flex items-center gap-1">
                            <Wrench className="h-3 w-3" />
                            {fiche.assignee.nom} {fiche.assignee.prenom}
                          </span>
                        )}
                        {fiche.date_echeance && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(fiche.date_echeance).toLocaleDateString("fr-FR")}
                          </span>
                        )}
                        {(fiche.items || []).length > 0 && (
                          <span>
                            {fiche.items.length} travail{fiche.items.length > 1 ? "x" : ""}
                            {" · "}
                            {fiche.items.map((it) => it.type_travail?.replace(/_/g, " ")).filter(Boolean).join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-gray-400 mt-1" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
