"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Profile = {
  nom: string | null;
  prenom: string | null;
  role_labo: string | null;
};

type Assignation = {
  id: string;
  role: "responsable" | "aide" | "qualite" | "finition";
  assigned_at: string;
  commande: {
    id: string;
    numero: string;
    statut: string;
    statut_paiement: string;
    date_livraison: string | null;
    patient_ref: string | null;
    patient: { prenom: string | null; nom: string | null } | null;
  } | null;
};

type Tache = {
  id: string;
  titre: string;
  description: string | null;
  statut: "a_faire" | "en_cours" | "fait" | "bloque";
  priorite: "basse" | "normale" | "haute" | "urgente";
  due_date: string | null;
  commande: { id: string; numero: string; patient_ref: string | null } | null;
};

const STATUT_COLORS: Record<Tache["statut"], string> = {
  a_faire: "bg-gray-100 text-gray-700",
  en_cours: "bg-amber-100 text-amber-700",
  fait: "bg-green-100 text-green-700",
  bloque: "bg-red-100 text-red-700",
};

const PRIORITE_COLORS: Record<Tache["priorite"], string> = {
  basse: "bg-gray-100 text-gray-700",
  normale: "bg-sky-100 text-sky-700",
  haute: "bg-orange-100 text-orange-700",
  urgente: "bg-red-100 text-red-700",
};

export function AtelierClient({
  profile,
  assignations,
  taches,
}: {
  profile: Profile;
  assignations: Assignation[];
  taches: Tache[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const setStatut = (id: string, statut: Tache["statut"]) => {
    startTransition(async () => {
      await fetch(`/api/taches/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut }),
      });
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Atelier · {profile.prenom} {profile.nom}
        </h1>
        {profile.role_labo && (
          <p className="text-sm text-gray-500 capitalize">{profile.role_labo}</p>
        )}
      </div>

      <Card>
        <CardContent className="space-y-3 p-4">
          <h2 className="text-sm font-semibold text-gray-900">
            Mes commandes assignées ({assignations.length})
          </h2>
          {assignations.length === 0 ? (
            <p className="text-sm text-gray-500">Aucune commande assignée.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {assignations.map((a) => {
                const c = a.commande;
                if (!c) return null;
                return (
                  <div
                    key={a.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {c.numero}
                      </p>
                      <p className="text-xs text-gray-500">
                        {c.patient?.prenom} {c.patient?.nom}
                        {c.patient_ref ? ` · ${c.patient_ref}` : ""}
                        {c.date_livraison
                          ? ` · livraison ${new Date(c.date_livraison).toLocaleDateString("fr-FR")}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-sky-100 text-sky-700">{a.role}</Badge>
                      <Badge className="bg-gray-100 text-gray-700 capitalize">
                        {c.statut?.replace(/_/g, " ")}
                      </Badge>
                      <Link
                        href={`/atelier/commandes/${c.id}`}
                        className="text-xs text-sky-600 hover:underline"
                      >
                        Ouvrir
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-4">
          <h2 className="text-sm font-semibold text-gray-900">
            Mes tâches ({taches.length})
          </h2>
          {taches.length === 0 ? (
            <p className="text-sm text-gray-500">Aucune tâche.</p>
          ) : (
            <div className="space-y-2">
              {taches.map((t) => (
                <div
                  key={t.id}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-100 p-3"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {t.titre}
                    </p>
                    {t.commande && (
                      <p className="text-xs text-gray-500">
                        {t.commande.numero}
                        {t.commande.patient_ref
                          ? ` · ${t.commande.patient_ref}`
                          : ""}
                      </p>
                    )}
                    {t.description && (
                      <p className="mt-1 text-xs text-gray-600">{t.description}</p>
                    )}
                  </div>
                  <Badge className={PRIORITE_COLORS[t.priorite]}>
                    {t.priorite}
                  </Badge>
                  {t.due_date && (
                    <span className="text-xs text-gray-500">
                      {new Date(t.due_date).toLocaleDateString("fr-FR")}
                    </span>
                  )}
                  <select
                    value={t.statut}
                    onChange={(e) =>
                      setStatut(t.id, e.target.value as Tache["statut"])
                    }
                    disabled={pending}
                    className={`rounded border border-gray-200 px-2 py-1 text-xs ${STATUT_COLORS[t.statut]}`}
                  >
                    <option value="a_faire">À faire</option>
                    <option value="en_cours">En cours</option>
                    <option value="fait">Fait</option>
                    <option value="bloque">Bloqué</option>
                  </select>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
