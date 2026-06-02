import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type OrthoEtape = {
  id: string;
  numero: number;
  label: string | null;
  date_prevue: string | null;
  date_realisee: string | null;
  statut: "prevu" | "en_cours" | "termine" | "saute";
  notes: string | null;
};

export type OrthoReadonlyData = {
  type_traitement: string | null;
  plan_traitement: string | null;
  nb_aligneurs: number;
  etape_courante: number;
  date_debut: string | null;
  date_fin_prevue: string | null;
  date_fin_reelle: string | null;
  notes: string | null;
  etapes: OrthoEtape[];
};

const TRAITEMENT_LABEL: Record<string, string> = {
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

export function OrthoReadonly({ data }: { data: OrthoReadonlyData }) {
  const progression =
    data.nb_aligneurs > 0
      ? Math.min(100, Math.round((data.etape_courante / data.nb_aligneurs) * 100))
      : 0;

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Suivi orthodontique</h3>
          <p className="text-sm text-gray-500">
            Plan, progression et étapes communiquées par le laboratoire.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
          <div>
            <p className="text-xs text-gray-500">Type</p>
            <p className="font-medium text-gray-900">
              {data.type_traitement ? TRAITEMENT_LABEL[data.type_traitement] || data.type_traitement : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Aligneurs</p>
            <p className="font-medium text-gray-900">{data.nb_aligneurs || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Étape courante</p>
            <p className="font-medium text-gray-900">{data.etape_courante}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Début</p>
            <p className="font-medium text-gray-900">
              {data.date_debut ? new Date(data.date_debut).toLocaleDateString("fr-FR") : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Fin prévue</p>
            <p className="font-medium text-gray-900">
              {data.date_fin_prevue
                ? new Date(data.date_fin_prevue).toLocaleDateString("fr-FR")
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Fin réelle</p>
            <p className="font-medium text-gray-900">
              {data.date_fin_reelle
                ? new Date(data.date_fin_reelle).toLocaleDateString("fr-FR")
                : "—"}
            </p>
          </div>
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
            {data.etape_courante} / {data.nb_aligneurs || "–"} étapes ({progression}%)
          </p>
        </div>

        {data.plan_traitement && (
          <div>
            <p className="text-xs font-medium text-gray-600">Plan de traitement</p>
            <p className="whitespace-pre-line text-sm text-gray-800">{data.plan_traitement}</p>
          </div>
        )}

        {data.notes && (
          <div>
            <p className="text-xs font-medium text-gray-600">Notes</p>
            <p className="whitespace-pre-line text-sm text-gray-800">{data.notes}</p>
          </div>
        )}

        <div className="rounded-xl border border-gray-200">
          <div className="border-b border-gray-200 px-3 py-2 text-sm font-medium text-gray-700">
            Étapes
          </div>
          {data.etapes.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-gray-500">
              Aucune étape enregistrée.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {data.etapes.map((etape) => (
                <li key={etape.id} className="space-y-1 p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700">
                      Étape {etape.numero}
                    </span>
                    {statutBadge(etape.statut)}
                    {etape.label && <span className="font-medium text-gray-800">{etape.label}</span>}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 md:grid-cols-3">
                    <div>
                      Prévue:{" "}
                      {etape.date_prevue
                        ? new Date(etape.date_prevue).toLocaleDateString("fr-FR")
                        : "—"}
                    </div>
                    <div>
                      Réalisée:{" "}
                      {etape.date_realisee
                        ? new Date(etape.date_realisee).toLocaleDateString("fr-FR")
                        : "—"}
                    </div>
                  </div>
                  {etape.notes && (
                    <p className="text-xs text-gray-600">{etape.notes}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
