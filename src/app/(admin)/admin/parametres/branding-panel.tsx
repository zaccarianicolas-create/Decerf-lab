"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";

type ParamValue = string | number | boolean | null | undefined;
type Params = Record<string, ParamValue>;

export function BrandingPanel({ initial }: { initial: Params | null }) {
  const [form, setForm] = useState<Params>(initial ?? {});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const setField = (k: string, v: ParamValue) => setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    setMsg(null);
    const res = await fetch("/api/admin/parametres", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    setSaving(false);
    setMsg(res.ok ? "Paramètres enregistrés" : `Erreur : ${json.error ?? ""}`);
    if (res.ok && json.parametres) setForm(json.parametres);
  };

  const sections: { title: string; fields: { k: string; label: string; type?: string; full?: boolean }[] }[] =
    [
      {
        title: "Identité",
        fields: [
          { k: "nom_labo", label: "Nom du laboratoire" },
          { k: "titulaire_legal", label: "Nom légal du titulaire" },
          { k: "forme_juridique", label: "Forme juridique" },
          { k: "numero_entreprise", label: "N° d’entreprise (BCE/KBO)" },
          { k: "tva_numero", label: "N° TVA" },
          { k: "numero_agrement", label: "N° d'agrément" },
          { k: "site_web", label: "Site web" },
        ],
      },
      {
        title: "Coordonnées",
        fields: [
          { k: "adresse", label: "Adresse", full: true },
          { k: "code_postal", label: "Code postal" },
          { k: "ville", label: "Ville" },
          { k: "pays", label: "Pays" },
          { k: "telephone", label: "Téléphone" },
          { k: "email_contact", label: "Email contact", type: "email" },
          { k: "horaires", label: "Horaires", full: true },
        ],
      },
      {
        title: "Réseaux sociaux",
        fields: [
          { k: "reseau_facebook_url", label: "Facebook", type: "url" },
          { k: "reseau_instagram_url", label: "Instagram", type: "url" },
          { k: "reseau_linkedin_url", label: "LinkedIn", type: "url" },
          { k: "reseau_x_url", label: "X (Twitter)", type: "url" },
        ],
      },
      {
        title: "Bancaire",
        fields: [
          { k: "iban", label: "IBAN" },
          { k: "bic", label: "BIC" },
          { k: "conditions_paiement", label: "Conditions de paiement", full: true },
        ],
      },
      {
        title: "Numérotation & TVA",
        fields: [
          { k: "prefixe_facture", label: "Préfixe facture" },
          { k: "prefixe_certificat", label: "Préfixe certificat" },
          { k: "prefixe_devis", label: "Préfixe devis" },
          { k: "taux_tva_defaut", label: "Taux TVA par défaut (%)", type: "number" },
        ],
      },
    ];

  return (
    <div className="space-y-6">
      {msg && (
        <div
          className={`rounded-lg p-3 text-sm ${
            msg.startsWith("Erreur") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
          }`}
        >
          {msg}
        </div>
      )}

      {sections.map((sec) => (
        <Card key={sec.title}>
          <CardHeader>
            <CardTitle>{sec.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {sec.fields.map((f) => (
                <div key={f.k} className={f.full ? "md:col-span-2" : ""}>
                  <Input
                    label={f.label}
                    type={f.type || "text"}
                    value={String(form[f.k] ?? "")}
                    onChange={(e) => setField(f.k, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader>
          <CardTitle>Régime de TVA du laboratoire</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-gray-900">Activer la franchise de TVA</p>
              <p className="mt-1 text-xs text-gray-500">
                Activée : les nouveaux brouillons sont exonérés, quel que soit le taux des services. Désactivée : les taux du catalogue s’appliquent. Vérifiez le régime et sa mention avec votre comptable.
              </p>
            </div>
            <input
              type="checkbox"
              checked={String(form.regime_tva ?? "franchise") === "franchise"}
              onChange={(e) => setField("regime_tva", e.target.checked ? "franchise" : "normal")}
              className="h-4 w-4 shrink-0"
              aria-label="Activer la franchise de TVA"
            />
          </label>
          <Input
            label="Taux TVA normal / de repli (%)"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={Number(form.taux_tva_defaut ?? 21)}
            onChange={(e) => setField("taux_tva_defaut", Number(e.target.value))}
          />
          {form.regime_tva !== "normal" && (
            <>
              <div>
                <label htmlFor="mention_franchise_tva" className="mb-1 block text-sm font-medium text-gray-700">
                  Mention de franchise portée sur les factures
                </label>
                <textarea
                  id="mention_franchise_tva"
                  value={String(form.mention_franchise_tva ?? "Régime particulier de franchise des petites entreprises")}
                  onChange={(e) => setField("mention_franchise_tva", e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mentions légales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(
            [
              ["mentions_legales_facture", "Mentions légales sur factures"],
              ["mentions_legales_certificat", "Mentions légales sur certificats"],
            ] as const
          ).map(([k, label]) => (
            <div key={k}>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {label}
              </label>
              <textarea
                value={String(form[k] ?? "")}
                onChange={(e) => setField(k, e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fonctionnalités stock</CardTitle>
        </CardHeader>
        <CardContent>
          <label className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-gray-900">Activer la gestion des lots stock</p>
              <p className="text-xs text-gray-500">
                Si désactivé, la sélection de lot est masquée dans les mouvements de stock.
              </p>
            </div>
            <input
              type="checkbox"
              checked={Boolean(form.gestion_lots_stock_active ?? true)}
              onChange={(e) => setField("gestion_lots_stock_active", e.target.checked)}
              className="h-4 w-4"
            />
          </label>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} isLoading={saving}>
          <Save className="mr-1 h-4 w-4" /> Enregistrer
        </Button>
      </div>
    </div>
  );
}
