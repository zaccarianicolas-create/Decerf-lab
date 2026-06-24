"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Article = {
  id: string;
  nom: string;
  unite: string;
  quantite_stock?: number | null;
  seuil_alerte?: number | null;
};

type Commande = { id: string; numero: string };
type Fiche = { id: string; numero: string; titre: string };

const TYPE_OPTIONS = [
  { value: "entree", label: "Entrée" },
  { value: "sortie", label: "Sortie" },
  { value: "consommation", label: "Consommation" },
  { value: "casse", label: "Casse" },
  { value: "ajustement_positif", label: "Ajustement +" },
  { value: "ajustement_negatif", label: "Ajustement -" },
];

export function StockMovementPanel({
  articles,
  commandes = [],
  fiches = [],
  fixedArticleId = null,
  fixedCommandeId = null,
  fixedFicheId = null,
  title = "Nouveau mouvement",
  refreshOnSuccess = true,
}: {
  articles: Article[];
  commandes?: Commande[];
  fiches?: Fiche[];
  fixedArticleId?: string | null;
  fixedCommandeId?: string | null;
  fixedFicheId?: string | null;
  title?: string;
  refreshOnSuccess?: boolean;
}) {
  const router = useRouter();
  const [articleId, setArticleId] = useState(fixedArticleId || articles[0]?.id || "");
  const [typeMouvement, setTypeMouvement] = useState("consommation");
  const [quantite, setQuantite] = useState("");
  const [motif, setMotif] = useState("");
  const [commandeId, setCommandeId] = useState(fixedCommandeId || "");
  const [ficheId, setFicheId] = useState(fixedFicheId || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedArticle = useMemo(
    () => articles.find((a) => a.id === articleId) || null,
    [articles, articleId]
  );

  const handleSubmit = async () => {
    if (!articleId) return setError("Choisis un article.");
    if (!quantite || Number(quantite) <= 0) return setError("Quantité invalide.");
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/stock/mouvements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        article_id: articleId,
        type_mouvement: typeMouvement,
        quantite: Number(quantite),
        motif: motif || null,
        commande_id: commandeId || null,
        fiche_manuelle_id: ficheId || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError((json as any)?.error || "Erreur lors du mouvement");
      return;
    }
    setQuantite("");
    setMotif("");
    if (!fixedCommandeId) setCommandeId("");
    if (!fixedFicheId) setFicheId("");
    if (refreshOnSuccess) router.refresh();
  };

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500">
            Enregistre une entrée, une sortie ou une consommation liée à un travail.
          </p>
        </div>

        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

        {!fixedArticleId && (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Article</label>
            <select
              value={articleId}
              onChange={(e) => setArticleId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">— Sélectionner —</option>
              {articles.map((article) => (
                <option key={article.id} value={article.id}>
                  {article.nom} ({article.unite})
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedArticle && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
            Stock actuel: <span className="font-semibold text-gray-900">{selectedArticle.quantite_stock ?? 0}</span> {selectedArticle.unite}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Type</label>
            <select
              value={typeMouvement}
              onChange={(e) => setTypeMouvement(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              {TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Quantité</label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={quantite}
              onChange={(e) => setQuantite(e.target.value)}
              placeholder="0"
            />
          </div>
        </div>

        {!fixedCommandeId && commandes.length > 0 && (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Commande liée (optionnel)</label>
            <select
              value={commandeId}
              onChange={(e) => setCommandeId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">— Aucune —</option>
              {commandes.map((commande) => (
                <option key={commande.id} value={commande.id}>
                  {commande.numero}
                </option>
              ))}
            </select>
          </div>
        )}

        {!fixedFicheId && fiches.length > 0 && (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Fiche manuelle liée (optionnel)</label>
            <select
              value={ficheId}
              onChange={(e) => setFicheId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">— Aucune —</option>
              {fiches.map((fiche) => (
                <option key={fiche.id} value={fiche.id}>
                  {fiche.numero} · {fiche.titre}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Motif</label>
          <textarea
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="Contexte du mouvement"
          />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={saving || !articleId || !quantite}
          className="w-full bg-sky-600 hover:bg-sky-700"
        >
          {saving ? "Enregistrement…" : "Enregistrer le mouvement"}
        </Button>
      </CardContent>
    </Card>
  );
}
