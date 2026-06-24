"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, AlertTriangle, Activity, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { StockMovementPanel } from "@/components/stock/stock-movement-panel";

type Article = {
  id: string;
  nom: string;
  categorie: string;
  unite: string;
  quantite_stock: number;
  seuil_alerte: number;
  emplacement: string | null;
  actif: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type Mouvement = {
  id: string;
  type_mouvement: string;
  quantite: number;
  quantite_avant: number;
  quantite_apres: number;
  motif: string | null;
  commande?: { id: string; numero: string } | null;
  fiche_manuelle?: { id: string; numero: string; titre: string } | null;
  created_at: string;
};

type Commande = { id: string; numero: string };
type Fiche = { id: string; numero: string; titre: string };

const CATEGORIES: Record<string, string> = {
  materiau: "Matériau",
  consommable: "Consommable",
  emballage: "Emballage",
  instrument: "Instrument",
  autre: "Autre",
};

const TYPE_LABELS: Record<string, string> = {
  entree: "Entrée",
  sortie: "Sortie",
  consommation: "Consommation",
  casse: "Casse",
  ajustement_positif: "Ajustement +",
  ajustement_negatif: "Ajustement -",
};

export function StockDetail({
  article,
  mouvements,
  commandes,
  fiches,
}: {
  article: Article;
  mouvements: Mouvement[];
  commandes: Commande[];
  fiches: Fiche[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nom, setNom] = useState(article.nom);
  const [categorie, setCategorie] = useState(article.categorie);
  const [unite, setUnite] = useState(article.unite);
  const [seuilAlerte, setSeuilAlerte] = useState(String(article.seuil_alerte ?? 0));
  const [emplacement, setEmplacement] = useState(article.emplacement || "");
  const [notes, setNotes] = useState(article.notes || "");

  const under = article.quantite_stock <= article.seuil_alerte;

  const saveArticle = async () => {
    setSaving(true);
    const res = await fetch(`/api/admin/stock/articles/${article.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nom: nom.trim(),
        categorie,
        unite,
        seuil_alerte: Number(seuilAlerte || 0),
        emplacement: emplacement || null,
        notes: notes || null,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setEditing(false);
      router.refresh();
    }
  };

  const deleteArticle = async () => {
    if (!confirm(`Supprimer l'article ${article.nom} ?`)) return;
    const res = await fetch(`/api/admin/stock/articles/${article.id}`, {
      method: "DELETE",
    });
    if (res.ok) router.push("/admin/stock");
  };

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
        <Link href="/admin/stock" className="flex items-center gap-1 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4" />
          Stock
        </Link>
        <span>/</span>
        <span className="font-mono text-gray-700">{article.nom}</span>
      </div>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex flex-wrap gap-2">
            <Badge className="border-gray-200 bg-gray-50 text-gray-700">
              {CATEGORIES[article.categorie] || article.categorie}
            </Badge>
            {under && (
              <Badge className="gap-1 border-red-200 bg-red-50 text-red-700">
                <AlertTriangle className="h-3 w-3" />
                Sous seuil
              </Badge>
            )}
            {!article.actif && <Badge className="border-gray-200 bg-gray-100 text-gray-500">Inactif</Badge>}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{article.nom}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {article.quantite_stock} {article.unite} disponibles
          </p>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button variant="outline" onClick={() => setEditing(false)}>Annuler</Button>
              <Button onClick={saveArticle} disabled={saving} className="bg-sky-600 hover:bg-sky-700">
                {saving ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setEditing(true)}>Modifier</Button>
              <Button variant="outline" onClick={deleteArticle} className="border-red-200 text-red-600 hover:bg-red-50">
                Supprimer
              </Button>
            </>
          )}
        </div>
      </div>

      {editing && (
        <Card className="mb-6 border-sky-200 bg-sky-50/40">
          <CardContent className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">Nom</label>
                <Input value={nom} onChange={(e) => setNom(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Catégorie</label>
                <select value={categorie} onChange={(e) => setCategorie(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                  {Object.entries(CATEGORIES).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Unité</label>
                <Input value={unite} onChange={(e) => setUnite(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Seuil d’alerte</label>
                <Input type="number" min="0" step="0.01" value={seuilAlerte} onChange={(e) => setSeuilAlerte(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Emplacement</label>
                <Input value={emplacement} onChange={(e) => setEmplacement(e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardContent className="p-5">
              <h2 className="mb-3 text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Activity className="h-4 w-4 text-sky-600" />
                Historique des mouvements
              </h2>
              {mouvements.length === 0 ? (
                <p className="text-sm text-gray-400">Aucun mouvement enregistré.</p>
              ) : (
                <div className="space-y-2">
                  {mouvements.map((movement) => (
                    <div key={movement.id} className="rounded-lg border border-gray-100 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className="border-gray-200 bg-gray-50 text-gray-700">{TYPE_LABELS[movement.type_mouvement] || movement.type_mouvement}</Badge>
                          <span className="text-sm font-medium text-gray-900">{movement.quantite}</span>
                          <span className="text-sm text-gray-500">{article.unite}</span>
                        </div>
                        <p className="text-xs text-gray-400">
                          {new Date(movement.created_at).toLocaleString("fr-FR")}
                        </p>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        {movement.quantite_avant} → {movement.quantite_apres}
                      </p>
                      {movement.motif && <p className="mt-1 text-sm text-gray-600">{movement.motif}</p>}
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
                        {movement.commande && (
                          <Badge className="border-gray-200 bg-white text-gray-700">
                            Commande {movement.commande.numero}
                          </Badge>
                        )}
                        {movement.fiche_manuelle && (
                          <Badge className="border-gray-200 bg-white text-gray-700">
                            Fiche {movement.fiche_manuelle.numero}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <StockMovementPanel
            articles={[article]}
            commandes={commandes}
            fiches={fiches}
            fixedArticleId={article.id}
            title="Nouveau mouvement sur cet article"
          />
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="p-5 space-y-3">
              <h2 className="text-lg font-semibold text-gray-900">Résumé</h2>
              <p className="text-sm text-gray-600">Emplacement : {article.emplacement || "Non renseigné"}</p>
              <p className="text-sm text-gray-600">Seuil d’alerte : {article.seuil_alerte} {article.unite}</p>
              <p className="text-sm text-gray-600">Statut : {article.actif ? "Actif" : "Inactif"}</p>
              {article.notes && <p className="text-sm text-gray-600 whitespace-pre-wrap">{article.notes}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <h2 className="mb-3 text-lg font-semibold text-gray-900">Traceabilité</h2>
              <p className="text-sm text-gray-600">
                Les mouvements peuvent être reliés à une commande ou à une fiche manuelle pour suivre la consommation par travail.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
