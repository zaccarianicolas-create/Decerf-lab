"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Upload, Save } from "lucide-react";

type Params = Record<string, any>;

export function BrandingPanel({ initial }: { initial: Params | null }) {
  const supabase = createClient();
  const [form, setForm] = useState<Params>(initial ?? {});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const logoInput = useRef<HTMLInputElement>(null);
  const sigInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initial) setForm(initial);
  }, [initial]);

  const setField = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const upload = async (file: File, kind: "logo" | "signature") => {
    const path = `${kind}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("branding").upload(path, file, {
      upsert: true,
      cacheControl: "3600",
    });
    if (error) {
      setMsg(`Erreur upload : ${error.message}`);
      return;
    }
    const { data } = supabase.storage.from("branding").getPublicUrl(path);
    setField(kind === "logo" ? "logo_url" : "signature_url", data.publicUrl);
  };

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

      <Card>
        <CardHeader>
          <CardTitle>Logo & signature</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {(["logo", "signature"] as const).map((k) => {
            const url = form[k === "logo" ? "logo_url" : "signature_url"];
            const ref = k === "logo" ? logoInput : sigInput;
            return (
              <div key={k} className="space-y-2">
                <p className="text-sm font-medium capitalize text-gray-700">{k}</p>
                {url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={url}
                    alt={k}
                    className="h-28 rounded-lg border border-gray-200 bg-white object-contain p-2"
                  />
                ) : (
                  <div className="flex h-28 items-center justify-center rounded-lg border border-dashed border-gray-300 text-xs text-gray-400">
                    Aucun fichier
                  </div>
                )}
                <input
                  ref={ref}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) upload(f, k);
                  }}
                />
                <Button size="sm" variant="outline" onClick={() => ref.current?.click()}>
                  <Upload className="mr-1 h-4 w-4" /> Choisir un fichier
                </Button>
              </div>
            );
          })}
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Couleur primaire
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.couleur_primaire || "#0284c7"}
                onChange={(e) => setField("couleur_primaire", e.target.value)}
                className="h-10 w-16 cursor-pointer rounded border border-gray-200"
              />
              <Input
                value={form.couleur_primaire || ""}
                onChange={(e) => setField("couleur_primaire", e.target.value)}
                className="flex-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

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
                    value={form[f.k] ?? ""}
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
                value={form[k] ?? ""}
                onChange={(e) => setField(k, e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          ))}
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
