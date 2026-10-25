"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ArrowLeft, Paperclip } from "lucide-react";
import Link from "next/link";
import { FILE_BUCKET, detectFileKind, getScanFormat, isPreviewable3D } from "@/lib/commande-files";

type Client = {
  id: string;
  nom: string;
  prenom: string;
  email: string | null;
  sans_compte?: boolean;
};

type PatientLite = {
  id: string;
  reference: string;
  nom: string;
  prenom: string;
};

type Item = {
  service_labo_id: string;
  item_label: string;
  options_selectionnees: string[];
  type_travail: string;
  description: string;
  dents: string;
  materiau: string;
  teinte: string;
  mode_fabrication: string;
  quantite: number;
  prix_unitaire: number;
};

type CatalogOption = { id: string; nom: string; prix_ht: number };
type CatalogService = {
  id: string;
  nom: string;
  categorie: string;
  type_travail: string | null;
  prix_base_ht: number | null;
  options: CatalogOption[];
};

const EMPTY_ITEM: Item = {
  service_labo_id: "",
  item_label: "",
  options_selectionnees: [],
  type_travail: "couronne",
  description: "",
  dents: "",
  materiau: "",
  teinte: "",
  mode_fabrication: "",
  quantite: 1,
  prix_unitaire: 0,
};

function AdminNouvelleCommandeInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isPaperOrder = searchParams.get("source") === "papier";
  const [supabase] = useState(() => createClient());
  const [clients, setClients] = useState<Client[]>([]);
  const [patients, setPatients] = useState<PatientLite[]>([]);
  const [services, setServices] = useState<CatalogService[]>([]);
  const [dentisteId, setDentisteId] = useState<string>(
    searchParams.get("dentiste_id") || ""
  );
  const [patientId, setPatientId] = useState<string>(
    searchParams.get("patient_id") || ""
  );
  const [patientRef, setPatientRef] = useState("");
  const [priorite, setPriorite] = useState("normale");
  const [dateLivraison, setDateLivraison] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<Item[]>([{ ...EMPTY_ITEM }]);
  const [proofFiles, setProofFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, nom, prenom, email, sans_compte")
        .eq("role", "dentiste")
        .eq("actif", true)
        .order("nom");
      setClients((data as Client[]) ?? []);
    })();
  }, [supabase]);

  useEffect(() => {
    (async () => {
      const [serviceResult, tariffResult, optionResult] = await Promise.all([
        supabase
          .from("services_labo")
          .select("id, nom, categorie, type_travail")
          .eq("actif", true)
          .order("ordre"),
        supabase.from("service_tarifs").select("service_id, prix_base_ht"),
        supabase
          .from("service_options")
          .select("id, service_id, nom, prix_ht, ordre")
          .eq("actif", true)
          .order("ordre"),
      ]);
      const tariffByService = new Map(
        (tariffResult.data ?? []).map((tariff) => [tariff.service_id, Number(tariff.prix_base_ht)])
      );
      const optionsByService = new Map<string, CatalogOption[]>();
      for (const option of optionResult.data ?? []) {
        const serviceOptions = optionsByService.get(option.service_id) ?? [];
        serviceOptions.push({ id: option.id, nom: option.nom, prix_ht: Number(option.prix_ht) });
        optionsByService.set(option.service_id, serviceOptions);
      }
      setServices((serviceResult.data ?? []).map((service) => ({
        ...service,
        prix_base_ht: tariffByService.get(service.id) ?? null,
        options: optionsByService.get(service.id) ?? [],
      })) as CatalogService[]);
    })();
  }, [supabase]);

  useEffect(() => {
    (async () => {
      let query = supabase
        .from("patients")
        .select("id, reference, nom, prenom")
        .eq("actif", true)
        .order("nom");
      if (dentisteId) {
        query = query.or(
          `dentiste_id.eq.${dentisteId},dentiste_id.is.null`
        );
      } else {
        query = query.is("dentiste_id", null);
      }
      const { data } = await query;
      setPatients((data as PatientLite[]) ?? []);
    })();
  }, [supabase, dentisteId]);

  const updateItem = (idx: number, patch: Partial<Item>) =>
    setItems((p) => p.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const total = items.reduce(
    (sum, item) => {
      const service = services.find((entry) => entry.id === item.service_labo_id);
      const optionsTotal = service?.options
        .filter((option) => item.options_selectionnees.includes(option.id))
        .reduce((subtotal, option) => subtotal + option.prix_ht, 0) ?? 0;
      return sum + Number(item.quantite || 0) * (Number(item.prix_unitaire || 0) + optionsTotal);
    },
    0
  );

  const submit = async () => {
    if (!dentisteId) {
      setError("Sélectionnez un client");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/commandes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dentiste_id: dentisteId,
        patient_id: patientId || null,
        patient_ref: patientRef || null,
        priorite,
        date_livraison: dateLivraison || null,
        notes: notes || null,
        items: items.map((it) => ({
          service_labo_id: it.service_labo_id || null,
          item_label: it.item_label.trim() || null,
          options_selectionnees: it.options_selectionnees,
          type_travail: it.type_travail,
          description: it.description,
          dents: it.dents
            ? it.dents.split(",").map((d) => d.trim()).filter(Boolean)
            : null,
          materiau: it.materiau || null,
          teinte: it.teinte || null,
          mode_fabrication: it.mode_fabrication || null,
          quantite: it.quantite,
          prix_unitaire: it.prix_unitaire,
        })),
      }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(json.error || "Erreur");
      return;
    }
    if (proofFiles.length > 0) {
      const { data: { user } } = await supabase.auth.getUser();
      let uploadFailures = 0;
      if (user) {
        for (const file of proofFiles) {
          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
          const path = `${json.commande.id}/commande-papier/${crypto.randomUUID()}_${safeName}`;
          const fileKind = detectFileKind(file.name, file.type);
          const format3d = getScanFormat(file.name, file.type);
          const { data: uploaded, error: uploadError } = await supabase.storage
            .from(FILE_BUCKET)
            .upload(path, file);
          if (uploadError || !uploaded) {
            uploadFailures += 1;
            continue;
          }
          const { error: recordError } = await supabase.from("fichiers").insert({
            commande_id: json.commande.id,
            nom_fichier: path,
            nom_original: file.name,
            type_mime: file.type || null,
            taille: file.size,
            storage_bucket: FILE_BUCKET,
            storage_path: uploaded.path,
            uploaded_by: user.id,
            uploaded_via: "inscription_site",
            file_kind: fileKind,
            format_3d: format3d,
            version: 1,
            apercu_disponible: Boolean(format3d && isPreviewable3D(file.name, file.type)),
          });
          if (recordError) uploadFailures += 1;
        }
      } else {
        uploadFailures = proofFiles.length;
      }
      if (uploadFailures > 0) {
        window.alert(`Commande créée, mais ${uploadFailures} fichier(s) n’ont pas pu être joints. Tu pourras les ajouter depuis le détail de la commande.`);
      }
    }
    router.push(`/admin/travaux/${json.commande.id}`);
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/commandes"
          className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isPaperOrder ? "Saisir une commande papier" : "Nouvelle commande"}
          </h1>
          <p className="text-sm text-gray-500">
            {isPaperOrder
              ? "Encode la prescription reçue sur papier; la commande sera liée au dentiste, au patient et au suivi du laboratoire."
              : "Créer une commande pour un client (avec ou sans compte)."}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Client & patient</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Praticien *
            </label>
            <select
              value={dentisteId}
              onChange={(e) => {
                setDentisteId(e.target.value);
                setPatientId("");
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">— Sélectionner —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  Dr {c.prenom} {c.nom}
                  {c.sans_compte ? " (sans compte)" : ""}
                  {c.email ? ` — ${c.email}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Patient
            </label>
            <select
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">— Aucun / utiliser réf. libre —</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.reference} — {p.prenom} {p.nom}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Patients du dentiste sélectionné + patients orphelins du labo.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Input
              label="Réf. patient (libre)"
              value={patientRef}
              onChange={(e) => setPatientRef(e.target.value)}
            />
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Priorité
              </label>
              <select
                value={priorite}
                onChange={(e) => setPriorite(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="normale">Normale</option>
                <option value="urgente">Urgente</option>
                <option value="express">Express</option>
              </select>
            </div>
            <Input
              label="Date livraison"
              type="date"
              value={dateLivraison}
              onChange={(e) => setDateLivraison(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {isPaperOrder && (
        <Card>
          <CardHeader>
            <CardTitle>Fiche papier / pièces jointes (facultatif)</CardTitle>
          </CardHeader>
          <CardContent>
            <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-md border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50">
              <Paperclip className="h-4 w-4 text-gray-500" />
              <span>Joindre un scan PDF ou une photo de la prescription</span>
              <input
                type="file"
                accept=".pdf,image/*"
                multiple
                className="sr-only"
                onChange={(event) => setProofFiles(Array.from(event.target.files ?? []))}
              />
            </label>
            {proofFiles.length > 0 && (
              <ul className="mt-3 space-y-1 text-xs text-gray-600">
                {proofFiles.map((file, index) => <li key={`${file.name}-${index}`}>{file.name}</li>)}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Lignes
            <Button
              size="sm"
              variant="outline"
              onClick={() => setItems([...items, { ...EMPTY_ITEM }])}
            >
              <Plus className="mr-1 h-4 w-4" />
              Ligne
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.map((it, idx) => (
            <div key={idx} className="rounded-lg border border-gray-200 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700">
                  Ligne {idx + 1}
                </p>
                {items.length > 1 && (
                  <button
                    onClick={() =>
                      setItems(items.filter((_, i) => i !== idx))
                    }
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Service du catalogue (facultatif)
                  </label>
                  <select
                    value={it.service_labo_id}
                    onChange={(event) => {
                      const service = services.find((entry) => entry.id === event.target.value);
                      updateItem(idx, {
                        service_labo_id: event.target.value,
                        item_label: "",
                        options_selectionnees: [],
                        type_travail: service?.type_travail || it.type_travail,
                        prix_unitaire: event.target.value ? service?.prix_base_ht ?? 0 : 0,
                      });
                    }}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">Hors catalogue / saisie libre</option>
                    {services.map((service) => (
                      <option key={service.id} value={service.id}>{service.nom}</option>
                    ))}
                  </select>
                </div>
                {!it.service_labo_id && (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Type de travail
                    </label>
                    <select
                      value={it.type_travail}
                      onChange={(event) => updateItem(idx, { type_travail: event.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    >
                      {[
                        "couronne", "bridge", "implant", "prothese_amovible", "facette",
                        "inlay_onlay", "guide_chirurgical", "gouttiere", "autre",
                      ].map((type) => (
                        <option key={type} value={type}>{type.replace(/_/g, " ")}</option>
                      ))}
                    </select>
                  </div>
                )}
                {!it.service_labo_id && (
                  <Input
                    label="Intitulé du travail (si hors catalogue)"
                    value={it.item_label}
                    onChange={(event) => updateItem(idx, { item_label: event.target.value })}
                  />
                )}
                <Input
                  label="Description"
                  value={it.description}
                  onChange={(e) =>
                    updateItem(idx, { description: e.target.value })
                  }
                />
                <Input
                  label="Dents (séparées par virgule)"
                  value={it.dents}
                  onChange={(e) => updateItem(idx, { dents: e.target.value })}
                />
                <Input
                  label="Matériau"
                  value={it.materiau}
                  onChange={(e) =>
                    updateItem(idx, { materiau: e.target.value })
                  }
                />
                <Input
                  label="Teinte"
                  value={it.teinte}
                  onChange={(e) => updateItem(idx, { teinte: e.target.value })}
                />
                <Input
                  label="Mode fabrication"
                  value={it.mode_fabrication}
                  onChange={(e) =>
                    updateItem(idx, { mode_fabrication: e.target.value })
                  }
                />
                <Input
                  label="Quantité"
                  type="number"
                  value={it.quantite}
                  onChange={(e) =>
                    updateItem(idx, { quantite: Number(e.target.value) })
                  }
                />
                <Input
                  label="Prix unitaire (€)"
                  type="number"
                  step="0.01"
                  value={it.prix_unitaire}
                  readOnly={Boolean(it.service_labo_id && services.find((service) => service.id === it.service_labo_id)?.prix_base_ht !== null)}
                  onChange={(e) =>
                    updateItem(idx, { prix_unitaire: Number(e.target.value) })
                  }
                />
              </div>
              {it.service_labo_id && (() => {
                const service = services.find((entry) => entry.id === it.service_labo_id);
                if (!service) return null;
                return (
                  <div className="mt-3 rounded-md bg-sky-50 px-3 py-2 text-sm">
                    <p className="font-medium text-sky-900">
                      Tarif de base : {service.prix_base_ht === null ? "sur devis" : `${service.prix_base_ht.toFixed(2)} € HT`}
                    </p>
                    {service.prix_base_ht === null && (
                      <p className="mt-1 text-xs text-sky-800">Saisis le prix convenu dans le champ Prix unitaire.</p>
                    )}
                    {service.options.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs font-medium uppercase text-sky-800">Options facturables</p>
                        {service.options.map((option) => {
                          const checked = it.options_selectionnees.includes(option.id);
                          return (
                            <label key={option.id} className="flex cursor-pointer items-center justify-between gap-3 text-sky-900">
                              <span className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => updateItem(idx, {
                                    options_selectionnees: checked
                                      ? it.options_selectionnees.filter((id) => id !== option.id)
                                      : [...it.options_selectionnees, option.id],
                                  })}
                                />
                                {option.nom}
                              </span>
                              <span className="whitespace-nowrap font-medium">+ {option.prix_ht.toFixed(2)} € HT / unité</span>
                            </label>
                          );
                        })}
                        <p className="pt-1 text-xs text-sky-800">Ces options seront précochées sur la facture; le dentiste pourra les vérifier.</p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          ))}
          <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2 text-sm">
            <span className="font-medium">Total estimé</span>
            <span className="text-lg font-bold text-sky-700">
              {total.toFixed(2)} €
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Link
          href="/admin/commandes"
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50"
        >
          Annuler
        </Link>
        <Button onClick={submit} isLoading={saving}>
          Créer la commande
        </Button>
      </div>
    </div>
  );
}

export default function AdminNouvelleCommandePage() {
  return (
    <Suspense fallback={null}>
      <AdminNouvelleCommandeInner />
    </Suspense>
  );
}
