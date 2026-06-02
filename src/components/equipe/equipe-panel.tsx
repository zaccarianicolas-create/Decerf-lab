"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users, ListChecks, Trash2, Plus } from "lucide-react";

export type Collaborateur = {
  id: string;
  nom: string | null;
  prenom: string | null;
  role_labo: string | null;
};

export type Assignation = {
  id: string;
  technicien_id: string;
  role: "responsable" | "aide" | "qualite" | "finition";
  technicien?: Collaborateur | null;
};

export type Tache = {
  id: string;
  titre: string;
  description: string | null;
  assignee_id: string | null;
  statut: "a_faire" | "en_cours" | "fait" | "bloque";
  priorite: "basse" | "normale" | "haute" | "urgente";
  due_date: string | null;
};

const ROLE_LABELS: Record<Assignation["role"], string> = {
  responsable: "Responsable",
  aide: "Aide",
  qualite: "Qualité",
  finition: "Finition",
};

const STATUT_LABELS: Record<Tache["statut"], string> = {
  a_faire: "À faire",
  en_cours: "En cours",
  fait: "Fait",
  bloque: "Bloqué",
};

const STATUT_COLORS: Record<Tache["statut"], string> = {
  a_faire: "bg-gray-100 text-gray-700",
  en_cours: "bg-amber-100 text-amber-700",
  fait: "bg-green-100 text-green-700",
  bloque: "bg-red-100 text-red-700",
};

export function EquipePanel({
  commandeId,
  collaborateurs,
  initialAssignations,
  initialTaches,
}: {
  commandeId: string;
  collaborateurs: Collaborateur[];
  initialAssignations: Assignation[];
  initialTaches: Tache[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [techToAdd, setTechToAdd] = useState("");
  const [roleToAdd, setRoleToAdd] =
    useState<Assignation["role"]>("responsable");
  const [newTask, setNewTask] = useState({
    titre: "",
    assignee_id: "",
    priorite: "normale" as Tache["priorite"],
    due_date: "",
  });

  const refresh = () => router.refresh();

  const assign = () => {
    if (!techToAdd) return;
    startTransition(async () => {
      await fetch(`/api/admin/commandes/${commandeId}/assignations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ technicien_id: techToAdd, role: roleToAdd }),
      });
      setTechToAdd("");
      refresh();
    });
  };

  const unassign = (id: string) => {
    startTransition(async () => {
      await fetch(
        `/api/admin/commandes/${commandeId}/assignations?assignation_id=${id}`,
        { method: "DELETE" }
      );
      refresh();
    });
  };

  const createTask = () => {
    if (!newTask.titre.trim()) return;
    startTransition(async () => {
      await fetch(`/api/admin/commandes/${commandeId}/taches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titre: newTask.titre,
          assignee_id: newTask.assignee_id || null,
          priorite: newTask.priorite,
          due_date: newTask.due_date || null,
        }),
      });
      setNewTask({
        titre: "",
        assignee_id: "",
        priorite: "normale",
        due_date: "",
      });
      refresh();
    });
  };

  const updateTask = (id: string, patch: Record<string, unknown>) => {
    startTransition(async () => {
      await fetch(`/api/taches/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      refresh();
    });
  };

  const deleteTask = (id: string) => {
    startTransition(async () => {
      await fetch(`/api/taches/${id}`, { method: "DELETE" });
      refresh();
    });
  };

  const techName = (id: string | null) => {
    if (!id) return "—";
    const c = collaborateurs.find((x) => x.id === id);
    return c ? `${c.prenom ?? ""} ${c.nom ?? ""}`.trim() : id.slice(0, 8);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Users className="h-4 w-4 text-sky-600" />
            Équipe assignée
          </h3>

          <div className="flex flex-wrap gap-2">
            {initialAssignations.length === 0 && (
              <p className="text-xs text-gray-500">
                Aucun collaborateur assigné.
              </p>
            )}
            {initialAssignations.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs"
              >
                <span className="font-medium text-sky-800">
                  {techName(a.technicien_id)}
                </span>
                <span className="text-sky-600">· {ROLE_LABELS[a.role]}</span>
                <button
                  type="button"
                  onClick={() => unassign(a.id)}
                  className="text-sky-500 hover:text-red-600"
                  disabled={pending}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-end gap-2 border-t border-gray-100 pt-3">
            <select
              value={techToAdd}
              onChange={(e) => setTechToAdd(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="">— Collaborateur —</option>
              {collaborateurs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.prenom} {c.nom}
                  {c.role_labo ? ` (${c.role_labo})` : ""}
                </option>
              ))}
            </select>
            <select
              value={roleToAdd}
              onChange={(e) =>
                setRoleToAdd(e.target.value as Assignation["role"])
              }
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              {(
                ["responsable", "aide", "qualite", "finition"] as const
              ).map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              onClick={assign}
              disabled={pending || !techToAdd}
              className="bg-sky-600 hover:bg-sky-700"
            >
              <Plus className="mr-1 h-3 w-3" />
              Assigner
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <ListChecks className="h-4 w-4 text-sky-600" />
            Tâches internes
          </h3>

          <div className="space-y-2">
            {initialTaches.length === 0 && (
              <p className="text-xs text-gray-500">Aucune tâche.</p>
            )}
            {initialTaches.map((t) => (
              <div
                key={t.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-100 p-2"
              >
                <span className="flex-1 text-sm font-medium text-gray-900">
                  {t.titre}
                </span>
                <Badge className={STATUT_COLORS[t.statut]}>
                  {STATUT_LABELS[t.statut]}
                </Badge>
                <select
                  value={t.statut}
                  onChange={(e) =>
                    updateTask(t.id, { statut: e.target.value })
                  }
                  className="rounded border border-gray-200 px-2 py-1 text-xs"
                >
                  {(["a_faire", "en_cours", "fait", "bloque"] as const).map(
                    (s) => (
                      <option key={s} value={s}>
                        {STATUT_LABELS[s]}
                      </option>
                    )
                  )}
                </select>
                <select
                  value={t.assignee_id ?? ""}
                  onChange={(e) =>
                    updateTask(t.id, { assignee_id: e.target.value || null })
                  }
                  className="rounded border border-gray-200 px-2 py-1 text-xs"
                >
                  <option value="">Non assigné</option>
                  {collaborateurs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.prenom} {c.nom}
                    </option>
                  ))}
                </select>
                {t.due_date && (
                  <span className="text-xs text-gray-500">
                    Échéance : {new Date(t.due_date).toLocaleDateString("fr-FR")}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => deleteTask(t.id)}
                  className="text-red-500 hover:text-red-700"
                  disabled={pending}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-end gap-2 border-t border-gray-100 pt-3">
            <Input
              placeholder="Titre de la tâche"
              value={newTask.titre}
              onChange={(e) =>
                setNewTask({ ...newTask, titre: e.target.value })
              }
              className="flex-1 min-w-[200px]"
            />
            <select
              value={newTask.assignee_id}
              onChange={(e) =>
                setNewTask({ ...newTask, assignee_id: e.target.value })
              }
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="">Assigner à…</option>
              {collaborateurs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.prenom} {c.nom}
                </option>
              ))}
            </select>
            <select
              value={newTask.priorite}
              onChange={(e) =>
                setNewTask({
                  ...newTask,
                  priorite: e.target.value as Tache["priorite"],
                })
              }
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="basse">Basse</option>
              <option value="normale">Normale</option>
              <option value="haute">Haute</option>
              <option value="urgente">Urgente</option>
            </select>
            <Input
              type="date"
              value={newTask.due_date}
              onChange={(e) =>
                setNewTask({ ...newTask, due_date: e.target.value })
              }
            />
            <Button
              size="sm"
              onClick={createTask}
              disabled={pending || !newTask.titre.trim()}
              className="bg-sky-600 hover:bg-sky-700"
            >
              <Plus className="mr-1 h-3 w-3" />
              Ajouter
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
