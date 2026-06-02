"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  addOrthoEtape,
  deleteOrthoEtape,
  updateOrthoEtape,
  upsertOrtho,
} from "./ortho-actions";

type OrthoTraitement =
  | "aligneurs"
  | "contention"
  | "appareil_amovible"
  | "gouttiere"
  | "autre";

type OrthoEtape = {
  id: string;
  numero: number;
  label: string | null;
  date_prevue: string | null;
  date_realisee: string | null;
  statut: "prevu" | "en_cours" | "termine" | "saute";
  notes: string | null;
};

type OrthoDossier = {
  id?: string;
  commande_id: string;
  commande_item_id?: string | null;
  type_traitement: OrthoTraitement;
  plan_traitement: string | null;
  nb_aligneurs: number;
  etape_courante: number;
  date_debut: string | null;
  date_fin_prevue: string | null;
  date_fin_reelle: string | null;
  notes: string | null;
  etapes: OrthoEtape[];
};

const TRAITEMENT_LABEL: Record<OrthoTraitement, string> = {
  aligneurs: "Aligneurs",
  contention: "Contention",
  appareil_amovible: "Appareil amovible",
  gouttiere: "Gouttière",
  autre: "Autre",
};

function statutBadge(statut: OrthoEtape["statut"]) {
  if (statut === "termine") return <Badge variant="success">Terminée</Badge>;
  if (statut === "en_cours") return <Badge variant="info">En cours</Badge>;
  if (statut === "saute") return <Badge variant="danger">Sautée</Badge>;
  return <Badge variant="warning">Prévue</Badge>;
}

export function OrthoPanel({
  commandeId,
  initialDossier,
}: {
  commandeId: string;
  initialDossier: OrthoDossier;
}) {
  const [dossier, setDossier] = useState<OrthoDossier>(initialDossier);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [newEtapeNumero, setNewEtapeNumero] = useState<number>(
    Math.max(0, ...dossier.etapes.map((e) => e.numero)) + 1
  );
  const [newEtapeLabel, setNewEtapeLabel] = useState("");
  const [newEtapeDate, setNewEtapeDate] = useState("");

  const update = <K extends keyof OrthoDossier>(key: K, value: OrthoDossier[K]) => {
    setDossier({ ...dossier, [key]: value });
  };

  const updateEtape = (id: string, patch: Partial<OrthoEtape>) => {
    setDossier({
      ...dossier,
      etapes: dossier.etapes.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    });
  };

  const saveDossier = () => {
    setError(null);
    startTransition(async () => {
      const result = await upsertOrtho({
        commande_id: commandeId,
        commande_item_id: dossier.commande_item_id || null,
        type_traitement: dossier.type_traitement,
        plan_traitement: dossier.plan_traitement,
        nb_aligneurs: dossier.nb_aligneurs,
        etape_courante: dossier.etape_courante,
        date_debut: dossier.date_debut,
        date_fin_prevue: dossier.date_fin_prevue,
        date_fin_reelle: dossier.date_fin_reelle,
        notes: dossier.notes,
      });

      if (result.error) {
        setError(result.error);
      } else if (result.id) {
        setDossier({ ...dossier, id: result.id });
      }
    });
  };

  const addEtape = () => {
    if (!dossier.id) {
      setError("Enregistrez le dossier ortho avant d'ajouter des étapes.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await addOrthoEtape({
        ortho_id: dossier.id!,
        commande_id: commandeId,
        numero: newEtapeNumero,
        label: newEtapeLabel || null,
        date_prevue: newEtapeDate || null,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      const tempId = `tmp-${Date.now()}`;
      setDossier({
        ...dossier,
        etapes: [
          ...dossier.etapes,
          {
            id: tempId,
            numero: newEtapeNumero,
            label: newEtapeLabel || null,
            date_prevue: newEtapeDate || null,
            date_realisee: null,
            statut: "prevu" as const,
            notes: null,
          },
        ].sort((a, b) => a.numero - b.numero),
      });
      setNewEtapeNumero(newEtapeNumero + 1);
      setNewEtapeLabel("");
      setNewEtapeDate("");
    });
  };

  const saveEtape = (etape: OrthoEtape) => {
    setError(null);
    startTransition(async () => {
      const result = await updateOrthoEtape({
        etape_id: etape.id,
        commande_id: commandeId,
        label: etape.label,
        date_prevue: etape.date_prevue,
        date_realisee: etape.date_realisee,
        statut: etape.statut,
        notes: etape.notes,
      });

      if (result.error) setError(result.error);
    });
  };

  const removeEtape = (etape: OrthoEtape) => {
    setError(null);
    startTransition(async () => {
      const result = await deleteOrthoEtape({
        etape_id: etape.id,
        commande_id: commandeId,
      });

      if (result.error) {
        setError(result.error);
        return;
      }
      setDossier({
        ...dossier,
        etapes: dossier.etapes.filter((e) => e.id !== etape.id),
      });
    });
  };

  const progression =
    dossier.nb_aligneurs > 0
      ? Math.min(100, Math.round((dossier.etape_courante / dossier.nb_aligneurs) * 100))
      : 0;

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Suivi orthodontique</h3>
            <p className="text-sm text-gray-500">
              Plan de traitement, jeux d&apos;aligneurs et étapes de suivi.
            </p>
          </div>
          <Button size="sm" onClick={saveDossier} isLoading={isPending}>
            Enregistrer le dossier
          </Button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Type de traitement
            </label>
            <select
              value={dossier.type_traitement}
              onChange={(e) =>
                update("type_traitement", e.target.value as OrthoTraitement)
              }
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              {Object.entries(TRAITEMENT_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Nombre d&apos;aligneurs
            </label>
            <input
              type="number"
              min={0}
              max={200}
              value={dossier.nb_aligneurs}
              onChange={(e) => update("nb_aligneurs", Number(e.target.value || 0))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Étape courante
            </label>
            <input
              type="number"
              min={0}
              value={dossier.etape_courante}
              onChange={(e) => update("etape_courante", Number(e.target.value || 0))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Début</label>
            <input
              type="date"
              value={dossier.date_debut || ""}
              onChange={(e) => update("date_debut", e.target.value || null)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Fin prévue
            </label>
            <input
              type="date"
              value={dossier.date_fin_prevue || ""}
              onChange={(e) => update("date_fin_prevue", e.target.value || null)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Fin réelle
            </label>
            <input
              type="date"
              value={dossier.date_fin_reelle || ""}
              onChange={(e) => update("date_fin_reelle", e.target.value || null)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Plan de traitement
          </label>
          <textarea
            value={dossier.plan_traitement || ""}
            onChange={(e) => update("plan_traitement", e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Notes</label>
          <textarea
            value={dossier.notes || ""}
            onChange={(e) => update("notes", e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </div>

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="text-xs text-gray-600">Progression</p>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-2 rounded-full bg-sky-600 transition-all"
              style={{ width: `${progression}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {dossier.etape_courante} / {dossier.nb_aligneurs || "–"} étapes ({progression}%)
          </p>
        </div>

        <div className="rounded-xl border border-gray-200">
          <div className="border-b border-gray-200 px-3 py-2 text-sm font-medium text-gray-700">
            Étapes de suivi
          </div>
          <div className="divide-y divide-gray-100">
            {dossier.etapes.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-gray-500">
                Aucune étape enregistrée.
              </p>
            )}
            {dossier.etapes.map((etape) => (
              <div key={etape.id} className="space-y-2 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700">
                    Étape {etape.numero}
                  </span>
                  {statutBadge(etape.statut)}
                  <input
                    placeholder="Libellé"
                    value={etape.label || ""}
                    onChange={(e) => updateEtape(etape.id, { label: e.target.value })}
                    className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-gray-500">
                      Prévue
                    </label>
                    <input
                      type="date"
                      value={etape.date_prevue || ""}
                      onChange={(e) =>
                        updateEtape(etape.id, { date_prevue: e.target.value || null })
                      }
                      className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-gray-500">
                      Réalisée
                    </label>
                    <input
                      type="date"
                      value={etape.date_realisee || ""}
                      onChange={(e) =>
                        updateEtape(etape.id, { date_realisee: e.target.value || null })
                      }
                      className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-gray-500">
                      Statut
                    </label>
                    <select
                      value={etape.statut}
                      onChange={(e) =>
                        updateEtape(etape.id, {
                          statut: e.target.value as OrthoEtape["statut"],
                        })
                      }
                      className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                    >
                      <option value="prevu">Prévue</option>
                      <option value="en_cours">En cours</option>
                      <option value="termine">Terminée</option>
                      <option value="saute">Sautée</option>
                    </select>
                  </div>
                  <div className="flex items-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => saveEtape(etape)}
                      isLoading={isPending}
                    >
                      Sauver
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => removeEtape(etape)}
                    >
                      Supprimer
                    </Button>
                  </div>
                </div>
                <textarea
                  placeholder="Notes"
                  value={etape.notes || ""}
                  onChange={(e) => updateEtape(etape.id, { notes: e.target.value })}
                  rows={1}
                  className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                />
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-end gap-2 border-t border-gray-200 p-3">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-gray-500">N°</label>
              <input
                type="number"
                min={1}
                value={newEtapeNumero}
                onChange={(e) => setNewEtapeNumero(Number(e.target.value || 1))}
                className="w-20 rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-[11px] font-medium text-gray-500">
                Libellé
              </label>
              <input
                type="text"
                value={newEtapeLabel}
                onChange={(e) => setNewEtapeLabel(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-gray-500">
                Date prévue
              </label>
              <input
                type="date"
                value={newEtapeDate}
                onChange={(e) => setNewEtapeDate(e.target.value)}
                className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
              />
            </div>
            <Button size="sm" onClick={addEtape} isLoading={isPending}>
              Ajouter
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
