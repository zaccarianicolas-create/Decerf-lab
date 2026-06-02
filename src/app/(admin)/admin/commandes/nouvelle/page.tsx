"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import Link from "next/link";

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
  type_travail: string;
  description: string;
  dents: string;
  materiau: string;
  teinte: string;
  mode_fabrication: string;
  quantite: number;
  prix_unitaire: number;
};

const EMPTY_ITEM: Item = {
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
  const supabase = createClient();
  const [clients, setClients] = useState<Client[]>([]);
  const [patients, setPatients] = useState<PatientLite[]>([]);
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
    (s, it) => s + Number(it.quantite || 0) * Number(it.prix_unitaire || 0),
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
          <h1 className="text-2xl font-bold text-gray-900">Nouvelle commande</h1>
          <p className="text-sm text-gray-500">
            Créer une commande pour un client (avec ou sans compte).
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
                    Type
                  </label>
                  <select
                    value={it.type_travail}
                    onChange={(e) =>
                      updateItem(idx, { type_travail: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    {[
                      "couronne",
                      "bridge",
                      "implant",
                      "prothese_amovible",
                      "facette",
                      "inlay_onlay",
                      "guide_chirurgical",
                      "gouttiere",
                      "autre",
                    ].map((t) => (
                      <option key={t} value={t}>
                        {t.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </div>
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
                  onChange={(e) =>
                    updateItem(idx, { prix_unitaire: Number(e.target.value) })
                  }
                />
              </div>
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
