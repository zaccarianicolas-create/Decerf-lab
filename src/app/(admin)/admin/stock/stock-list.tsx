"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, AlertTriangle, Box, ChevronRight } from "lucide-react";
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

type Commande = { id: string; numero: string };
type Fiche = { id: string; numero: string; titre: string };

const CATEGORIES: Record<string, string> = {
  materiau: "Matériau",
  consommable: "Consommable",
  emballage: "Emballage",
  instrument: "Instrument",
  autre: "Autre",
};

export function StockList({
  initialArticles,
  commandes,
  fiches,
}: {
  initialArticles: Article[];
  commandes: Commande[];
  fiches: Fiche[];
}) {
  const [articles, setArticles] = useState(initialArticles);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [nom, setNom] = useState("");
  const [categorie, setCategorie] = useState("materiau");
  const [unite, setUnite] = useState("piece");
  const [seuilAlerte, setSeuilAlerte] = useState("0");
  const [emplacement, setEmplacement] = useState("");
  const [notes, setNotes] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return articles.filter((article) => {
      if (!q) return true;
      return (
        article.nom.toLowerCase().includes(q) ||
        article.categorie.toLowerCase().includes(q) ||
        (article.emplacement || "").toLowerCase().includes(q)
      );
    });
  }, [articles, search]);

  const lowStock = articles.filter((article) => article.quantite_stock <= article.seuil_alerte).length;

  const resetForm = () => {
    setNom("");
    setCategorie("materiau");
    setUnite("piece");
    setSeuilAlerte("0");
    setEmplacement("");
    setNotes("");
  };

  const createArticle = async () => {
    if (!nom.trim()) return setError("Le nom est requis.");
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/stock/articles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nom: nom.trim(),
        categorie,
        unite,
        seuil_alerte: Number(seuilAlerte || 0),
        emplacement: emplacement || null,
        notes: notes || null,
        actif: true,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError((json as any)?.error || "Erreur lors de la création");
      return;
    }
    const data = await res.json();
    setArticles((prev) => [data, ...prev]);
    resetForm();
    setShowCreate(false);
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock du laboratoire</h1>
          <p className="mt-1 text-sm text-gray-500">
            Articles, seuils d’alerte et mouvements tracés au labo uniquement.
          </p>
        </div>
        <Button onClick={() => setShowCreate((v) => !v)} className="gap-1.5 bg-sky-600 hover:bg-sky-700">
          <Plus className="h-4 w-4" />
          Nouvel article
        </Button>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-400">Articles actifs</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{articles.filter((a) => a.actif).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-400">Sous seuil</p>
            <p className="mt-1 text-2xl font-bold text-red-600">{lowStock}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-400">Total articles</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{articles.length}</p>
          </CardContent>
        </Card>
      </div>

      {showCreate && (
        <Card className="mb-6 border-sky-200 bg-sky-50/40">
          <CardContent className="space-y-4 p-5">
            <h2 className="font-semibold text-gray-900">Créer un article</h2>
            {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">Nom</label>
                <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex: Blocs zircone A2" />
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
                <Input value={unite} onChange={(e) => setUnite(e.target.value)} placeholder="piece" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Seuil d’alerte</label>
                <Input type="number" min="0" step="0.01" value={seuilAlerte} onChange={(e) => setSeuilAlerte(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Emplacement</label>
                <Input value={emplacement} onChange={(e) => setEmplacement(e.target.value)} placeholder="Armoire B / tiroir 3" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Annuler</Button>
              <Button onClick={createArticle} disabled={saving} className="bg-sky-600 hover:bg-sky-700">
                {saving ? "Création…" : "Créer"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mb-4 relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un article, une catégorie ou un emplacement" className="pl-9" />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {filtered.map((article) => {
          const under = article.quantite_stock <= article.seuil_alerte;
          return (
            <Link key={article.id} href={`/admin/stock/${article.id}`}>
              <Card className="group cursor-pointer transition-shadow hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Badge className="border-gray-200 bg-gray-50 text-gray-700">{CATEGORIES[article.categorie] || article.categorie}</Badge>
                        {under && (
                          <Badge className="border-red-200 bg-red-50 text-red-700 gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Sous seuil
                          </Badge>
                        )}
                        {!article.actif && <Badge className="border-gray-200 bg-gray-100 text-gray-500">Inactif</Badge>}
                      </div>
                      <h2 className="truncate font-semibold text-gray-900">{article.nom}</h2>
                      <p className="mt-1 text-sm text-gray-500">
                        <span className="font-medium text-gray-900">{article.quantite_stock}</span> {article.unite}
                        {article.seuil_alerte > 0 ? ` · seuil ${article.seuil_alerte}` : ""}
                      </p>
                      {article.emplacement && <p className="mt-1 text-xs text-gray-400">{article.emplacement}</p>}
                    </div>
                    <ChevronRight className="mt-1 h-5 w-5 text-gray-300 group-hover:text-sky-500" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
            <Box className="h-10 w-10 text-gray-300" />
            <p className="text-gray-500">Aucun article trouvé.</p>
          </CardContent>
        </Card>
      )}

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <StockMovementPanel
          articles={articles}
          commandes={commandes}
          fiches={fiches}
          title="Enregistrer un mouvement rapide"
        />
        <Card>
          <CardContent className="p-5">
            <h3 className="mb-3 text-lg font-semibold text-gray-900">Rappels</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Les sorties et consommations réduisent automatiquement le stock.</li>
              <li>• Le trigger bloque les mouvements si le stock passe sous zéro.</li>
              <li>• Les articles sous seuil apparaissent en alerte dans la liste.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
