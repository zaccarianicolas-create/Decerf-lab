"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, AlertTriangle, Activity, Boxes } from "lucide-react";
import { StockMovementPanel } from "@/components/stock/stock-movement-panel";

type Article = {
  id: string;
  nom: string;
  categorie: string;
  unite: string;
  gestion_lots: boolean;
  quantite_stock: number;
  seuil_alerte: number;
  emplacement: string | null;
  actif: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type Lot = {
  id: string;
  article_id: string;
  numero_lot: string;
  fournisseur?: string | null;
  date_reception?: string | null;
  date_peremption?: string | null;
  quantite_initiale: number;
  quantite_restante: number;
  cout_unitaire?: number | null;
  actif: boolean;
  notes?: string | null;
  created_at: string;
};

type Mouvement = {
  id: string;
  type_mouvement: string;
  quantite: number;
  quantite_avant: number;
  quantite_apres: number;
  motif: string | null;
  lot?: { id: string; numero_lot: string; date_peremption?: string | null } | null;
  commande?: { id: string; numero: string } | null;
  fiche_manuelle?: { id: string; numero: string; titre: string } | null;
  protocole_instance?: { id: string; titre: string } | null;
  created_at: string;
};

type Commande = { id: string; numero: string };
type Fiche = { id: string; numero: string; titre: string };
type ProtocoleInstance = { id: string; titre: string; statut?: string | null };

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
  lots,
  mouvements,
  commandes,
  fiches,
  protocoleInstances,
  lotsFeatureEnabled,
}: {
  article: Article;
  lots: Lot[];
  mouvements: Mouvement[];
  commandes: Commande[];
  fiches: Fiche[];
  protocoleInstances: ProtocoleInstance[];
  lotsFeatureEnabled: boolean;
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
  const [gestionLots, setGestionLots] = useState(article.gestion_lots);

  const [lotNumero, setLotNumero] = useState("");
  const [lotFournisseur, setLotFournisseur] = useState("");
  const [lotDateReception, setLotDateReception] = useState("");
  const [lotDatePeremption, setLotDatePeremption] = useState("");
  const [lotQuantiteInitiale, setLotQuantiteInitiale] = useState("");
  const [lotCoutUnitaire, setLotCoutUnitaire] = useState("");
  const [lotNotes, setLotNotes] = useState("");
  const [lotSaving, setLotSaving] = useState(false);
  const [lotError, setLotError] = useState("");

  const under = article.quantite_stock <= article.seuil_alerte;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const soonDate = new Date(today);
  soonDate.setDate(soonDate.getDate() + 30);

  const expiredLots = lots.filter((lot) => {
    if (!lot.date_peremption || lot.quantite_restante <= 0) return false;
    return new Date(lot.date_peremption) < today;
  });

  const expiringSoonLots = lots.filter((lot) => {
    if (!lot.date_peremption || lot.quantite_restante <= 0) return false;
    const exp = new Date(lot.date_peremption);
    return exp >= today && exp <= soonDate;
  });

  const saveArticle = async () => {
    setSaving(true);
    const res = await fetch(`/api/admin/stock/articles/${article.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nom: nom.trim(),
        categorie,
        unite,
        gestion_lots: lotsFeatureEnabled ? gestionLots : false,
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

  const createLot = async () => {
    setLotError("");
    if (!lotNumero.trim()) return setLotError("Numéro de lot requis.");
    if (!lotQuantiteInitiale || Number(lotQuantiteInitiale) <= 0) {
      return setLotError("Quantité initiale invalide.");
    }
    setLotSaving(true);
    const res = await fetch("/api/admin/stock/lots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        article_id: article.id,
        numero_lot: lotNumero.trim(),
        fournisseur: lotFournisseur || null,
        date_reception: lotDateReception || null,
        date_peremption: lotDatePeremption || null,
        quantite_initiale: Number(lotQuantiteInitiale),
        cout_unitaire: lotCoutUnitaire ? Number(lotCoutUnitaire) : null,
        notes: lotNotes || null,
      }),
    });
    setLotSaving(false);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setLotError((json as any)?.error || "Erreur création lot");
      return;
    }
    setLotNumero("");
    setLotFournisseur("");
    setLotDateReception("");
    setLotDatePeremption("");
    setLotQuantiteInitiale("");
    setLotCoutUnitaire("");
    setLotNotes("");
    router.refresh();
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
            {(editing ? gestionLots : article.gestion_lots) && lotsFeatureEnabled && (
              <Badge className="border-amber-200 bg-amber-50 text-amber-700">Lot</Badge>
            )}
            {under && (
              <Badge className="gap-1 border-red-200 bg-red-50 text-red-700">
                <AlertTriangle className="h-3 w-3" />
                Sous seuil
              </Badge>
            )}
            {lotsFeatureEnabled && expiredLots.length > 0 && (
              <Badge className="border-red-200 bg-red-50 text-red-700">
                {expiredLots.length} lot(s) périmé(s)
              </Badge>
            )}
            {lotsFeatureEnabled && expiredLots.length === 0 && expiringSoonLots.length > 0 && (
              <Badge className="border-amber-200 bg-amber-50 text-amber-700">
                {expiringSoonLots.length} lot(s) ≤ 30j
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
              <div className="sm:col-span-2">
                <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={gestionLots}
                    onChange={(e) => setGestionLots(e.target.checked)}
                    disabled={!lotsFeatureEnabled}
                  />
                  Traçabilité par lot
                </label>
                {!lotsFeatureEnabled && (
                  <p className="mt-1 text-xs text-amber-600">Désactivé dans Paramètres.</p>
                )}
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
          {lotsFeatureEnabled && article.gestion_lots && expiredLots.length > 0 && (
            <Card className="border-red-200 bg-red-50/60">
              <CardContent className="space-y-3 p-5">
                <h2 className="text-lg font-semibold text-red-700">
                  Lots périmés à traiter ({expiredLots.length})
                </h2>
                <p className="text-sm text-red-700">
                  Ces lots ont encore du stock restant. Action recommandée: isoler physiquement,
                  décider du sort (destruction/retour/dérogation) et tracer un mouvement d'ajustement.
                </p>
                <div className="space-y-2">
                  {expiredLots.map((lot) => (
                    <div key={lot.id} className="rounded-lg border border-red-200 bg-white p-3 text-sm">
                      <p className="font-medium text-gray-900">Lot {lot.numero_lot}</p>
                      <p className="text-gray-600">
                        Stock restant: {lot.quantite_restante} {article.unite}
                        {" · "}
                        Péremption: {lot.date_peremption ? new Date(lot.date_peremption).toLocaleDateString("fr-FR") : "—"}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {lotsFeatureEnabled && article.gestion_lots && expiredLots.length === 0 && expiringSoonLots.length > 0 && (
            <Card className="border-amber-200 bg-amber-50/60">
              <CardContent className="space-y-2 p-5">
                <h2 className="text-lg font-semibold text-amber-700">
                  Lots bientôt périmés ({expiringSoonLots.length})
                </h2>
                <p className="text-sm text-amber-700">
                  Priorise ces lots en consommation (FEFO) pour réduire le risque de perte.
                </p>
              </CardContent>
            </Card>
          )}

          {article.gestion_lots && lotsFeatureEnabled && (
            <Card>
              <CardContent className="space-y-4 p-5">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <Boxes className="h-4 w-4 text-sky-600" />
                  Lots
                </h2>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">N° lot</label>
                    <Input value={lotNumero} onChange={(e) => setLotNumero(e.target.value)} placeholder="LOT-2026-001" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Fournisseur</label>
                    <Input value={lotFournisseur} onChange={(e) => setLotFournisseur(e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Date réception</label>
                    <Input type="date" value={lotDateReception} onChange={(e) => setLotDateReception(e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Date péremption</label>
                    <Input type="date" value={lotDatePeremption} onChange={(e) => setLotDatePeremption(e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Quantité initiale</label>
                    <Input type="number" min="0.01" step="0.01" value={lotQuantiteInitiale} onChange={(e) => setLotQuantiteInitiale(e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Coût unitaire</label>
                    <Input type="number" min="0" step="0.0001" value={lotCoutUnitaire} onChange={(e) => setLotCoutUnitaire(e.target.value)} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-gray-700">Notes lot</label>
                    <textarea value={lotNotes} onChange={(e) => setLotNotes(e.target.value)} rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                  </div>
                </div>

                {lotError && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{lotError}</div>}
                <div className="flex justify-end">
                  <Button onClick={createLot} disabled={lotSaving} className="bg-sky-600 hover:bg-sky-700">
                    {lotSaving ? "Création…" : "Créer le lot"}
                  </Button>
                </div>

                {lots.length === 0 ? (
                  <p className="text-sm text-gray-400">Aucun lot.</p>
                ) : (
                  <div className="space-y-2">
                    {lots.map((lot) => (
                      <div key={lot.id} className="rounded-lg border border-gray-100 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-medium text-gray-900">{lot.numero_lot}</p>
                          <div className="flex flex-wrap items-center gap-2">
                            {lot.date_peremption && new Date(lot.date_peremption) < today && lot.quantite_restante > 0 ? (
                              <Badge className="border-red-200 bg-red-50 text-red-700">Périmé</Badge>
                            ) : lot.date_peremption && new Date(lot.date_peremption) <= soonDate && lot.quantite_restante > 0 ? (
                              <Badge className="border-amber-200 bg-amber-50 text-amber-700">≤ 30j</Badge>
                            ) : (
                              <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">OK</Badge>
                            )}
                            <Badge className="border-gray-200 bg-gray-50 text-gray-700">
                              {lot.quantite_restante} / {lot.quantite_initiale} {article.unite}
                            </Badge>
                          </div>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          {lot.date_peremption ? `Exp: ${new Date(lot.date_peremption).toLocaleDateString("fr-FR")}` : "Sans péremption"}
                          {lot.fournisseur ? ` · ${lot.fournisseur}` : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-5">
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900">
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
                          <Badge className="border-gray-200 bg-gray-50 text-gray-700">
                            {TYPE_LABELS[movement.type_mouvement] || movement.type_mouvement}
                          </Badge>
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
                        {movement.lot && <Badge className="border-amber-200 bg-amber-50 text-amber-700">Lot {movement.lot.numero_lot}</Badge>}
                        {movement.commande && <Badge className="border-gray-200 bg-white text-gray-700">Commande {movement.commande.numero}</Badge>}
                        {movement.fiche_manuelle && <Badge className="border-gray-200 bg-white text-gray-700">Fiche {movement.fiche_manuelle.numero}</Badge>}
                        {movement.protocole_instance && <Badge className="border-indigo-200 bg-indigo-50 text-indigo-700">Protocole {movement.protocole_instance.titre}</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <StockMovementPanel
            articles={[article]}
            lots={lotsFeatureEnabled ? lots : []}
            lotsEnabled={lotsFeatureEnabled}
            commandes={commandes}
            fiches={fiches}
            protocoleInstances={protocoleInstances}
            fixedArticleId={article.id}
            title="Nouveau mouvement sur cet article"
          />
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="space-y-3 p-5">
              <h2 className="text-lg font-semibold text-gray-900">Résumé</h2>
              <p className="text-sm text-gray-600">Emplacement : {article.emplacement || "Non renseigné"}</p>
              <p className="text-sm text-gray-600">Seuil d’alerte : {article.seuil_alerte} {article.unite}</p>
              <p className="text-sm text-gray-600">
                Traçabilité lot : {!lotsFeatureEnabled ? "Désactivée (paramètres)" : article.gestion_lots ? "Oui" : "Non"}
              </p>
              <p className="text-sm text-gray-600">Statut : {article.actif ? "Actif" : "Inactif"}</p>
              {article.notes && <p className="whitespace-pre-wrap text-sm text-gray-600">{article.notes}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <h2 className="mb-3 text-lg font-semibold text-gray-900">Traceabilité</h2>
              <p className="text-sm text-gray-600">
                Les mouvements peuvent être liés à une commande, une fiche manuelle et une instance protocole.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
