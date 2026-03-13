"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  X,
  Edit,
  Save,
  Trash2,
  Wrench,
  Eye,
  EyeOff,
  GripVertical,
  Monitor,
  Truck,
  ArrowUpDown,
  Euro,
  Clock,
} from "lucide-react";

type Service = {
  id: string;
  nom: string;
  description: string | null;
  categorie: string;
  type_travail: string | null;
  materiaux_disponibles: string[];
  mode_fourniture: string;
  prix_indicatif: number | null;
  duree_estimee_jours: number | null;
  instructions: string | null;
  actif: boolean;
  ordre: number;
  created_at: string;
};

const CATEGORIES = [
  { value: "prothese_fixe", label: "Prothèse fixe" },
  { value: "prothese_amovible", label: "Prothèse amovible" },
  { value: "implantologie", label: "Implantologie" },
  { value: "orthodontie", label: "Orthodontie" },
  { value: "esthetique", label: "Esthétique" },
  { value: "autre", label: "Autre" },
];

const TYPES_TRAVAIL = [
  { value: "couronne", label: "Couronne" },
  { value: "bridge", label: "Bridge" },
  { value: "inlay_onlay", label: "Inlay / Onlay" },
  { value: "facette", label: "Facette" },
  { value: "prothese_amovible", label: "Prothèse amovible" },
  { value: "prothese_complete", label: "Prothèse complète" },
  { value: "implant", label: "Implant" },
  { value: "orthodontie", label: "Orthodontie" },
  { value: "gouttiere", label: "Gouttière" },
  { value: "autre", label: "Autre" },
];

const MATERIAUX = [
  { value: "zircone", label: "Zircone" },
  { value: "emax", label: "E.max" },
  { value: "metal", label: "Métal" },
  { value: "ceramique", label: "Céramique" },
  { value: "resine", label: "Résine" },
  { value: "composite", label: "Composite" },
  { value: "titane", label: "Titane" },
  { value: "chrome_cobalt", label: "Chrome-Cobalt" },
  { value: "autre", label: "Autre" },
];

const MODES_FOURNITURE = [
  { value: "numerique_stl", label: "Numérique (STL)", icon: Monitor },
  { value: "empreinte_physique", label: "Empreinte physique", icon: Truck },
  { value: "les_deux", label: "Les deux", icon: ArrowUpDown },
];

const CATEGORIE_COLORS: Record<string, string> = {
  prothese_fixe: "bg-blue-50 text-blue-700 border-blue-200",
  prothese_amovible: "bg-purple-50 text-purple-700 border-purple-200",
  implantologie: "bg-teal-50 text-teal-700 border-teal-200",
  orthodontie: "bg-orange-50 text-orange-700 border-orange-200",
  esthetique: "bg-pink-50 text-pink-700 border-pink-200",
  autre: "bg-gray-50 text-gray-700 border-gray-200",
};

const emptyForm = {
  nom: "",
  description: "",
  categorie: "prothese_fixe",
  type_travail: "",
  materiaux_disponibles: [] as string[],
  mode_fourniture: "les_deux",
  prix_indicatif: "",
  duree_estimee_jours: "",
  instructions: "",
};

export function ServicesList({
  initialServices,
}: {
  initialServices: Service[];
}) {
  const supabase = createClient();
  const [services, setServices] = useState(initialServices);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [filterCat, setFilterCat] = useState<string>("all");

  const filtered =
    filterCat === "all"
      ? services
      : services.filter((s) => s.categorie === filterCat);

  const actifs = services.filter((s) => s.actif).length;

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (s: Service) => {
    setForm({
      nom: s.nom,
      description: s.description || "",
      categorie: s.categorie,
      type_travail: s.type_travail || "",
      materiaux_disponibles: s.materiaux_disponibles || [],
      mode_fourniture: s.mode_fourniture,
      prix_indicatif: s.prix_indicatif?.toString() || "",
      duree_estimee_jours: s.duree_estimee_jours?.toString() || "",
      instructions: s.instructions || "",
    });
    setEditingId(s.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      nom: form.nom,
      description: form.description || null,
      categorie: form.categorie,
      type_travail: form.type_travail || null,
      materiaux_disponibles: form.materiaux_disponibles,
      mode_fourniture: form.mode_fourniture,
      prix_indicatif: form.prix_indicatif
        ? parseFloat(form.prix_indicatif)
        : null,
      duree_estimee_jours: form.duree_estimee_jours
        ? parseInt(form.duree_estimee_jours)
        : null,
      instructions: form.instructions || null,
    };

    if (editingId) {
      const { error } = await supabase
        .from("services_labo")
        .update(payload)
        .eq("id", editingId);
      if (!error) {
        setServices((prev) =>
          prev.map((s) => (s.id === editingId ? { ...s, ...payload } : s))
        );
      }
    } else {
      const maxOrdre = Math.max(0, ...services.map((s) => s.ordre));
      const { data, error } = await supabase
        .from("services_labo")
        .insert({ ...payload, ordre: maxOrdre + 1 })
        .select()
        .single();
      if (!error && data) {
        setServices([...services, data]);
      }
    }
    resetForm();
    setSaving(false);
  };

  const toggleActif = async (id: string, actif: boolean) => {
    const { error } = await supabase
      .from("services_labo")
      .update({ actif: !actif })
      .eq("id", id);
    if (!error) {
      setServices((prev) =>
        prev.map((s) => (s.id === id ? { ...s, actif: !actif } : s))
      );
    }
  };

  const deleteService = async (id: string) => {
    if (!confirm("Supprimer ce service ?")) return;
    const { error } = await supabase
      .from("services_labo")
      .delete()
      .eq("id", id);
    if (!error) {
      setServices((prev) => prev.filter((s) => s.id !== id));
    }
  };

  const toggleMateriau = (val: string) => {
    setForm((f) => ({
      ...f,
      materiaux_disponibles: f.materiaux_disponibles.includes(val)
        ? f.materiaux_disponibles.filter((m) => m !== val)
        : [...f.materiaux_disponibles, val],
    }));
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Wrench className="mx-auto mb-1 h-5 w-5 text-sky-500" />
            <p className="text-2xl font-bold text-gray-900">
              {services.length}
            </p>
            <p className="text-xs text-gray-500">Total services</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Eye className="mx-auto mb-1 h-5 w-5 text-green-500" />
            <p className="text-2xl font-bold text-gray-900">{actifs}</p>
            <p className="text-xs text-gray-500">Actifs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <EyeOff className="mx-auto mb-1 h-5 w-5 text-gray-400" />
            <p className="text-2xl font-bold text-gray-900">
              {services.length - actifs}
            </p>
            <p className="text-xs text-gray-500">Désactivés</p>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-2">
          <button
            onClick={() => setFilterCat("all")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filterCat === "all"
                ? "bg-sky-100 text-sky-700"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Tous
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setFilterCat(c.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filterCat === c.value
                  ? "bg-sky-100 text-sky-700"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="gap-2 bg-sky-600 hover:bg-sky-700"
        >
          <Plus className="h-4 w-4" />
          Nouveau service
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="border-sky-200">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingId ? "Modifier le service" : "Nouveau service"}
              </h3>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Nom du service *"
                  placeholder="Ex: Couronne unitaire"
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                />
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">
                    Catégorie *
                  </label>
                  <select
                    value={form.categorie}
                    onChange={(e) =>
                      setForm({ ...form, categorie: e.target.value })
                    }
                    className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  rows={2}
                  placeholder="Description courte du service..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">
                    Type de travail (enum)
                  </label>
                  <select
                    value={form.type_travail}
                    onChange={(e) =>
                      setForm({ ...form, type_travail: e.target.value })
                    }
                    className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Aucun</option>
                    {TYPES_TRAVAIL.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <Input
                  label="Prix indicatif (€)"
                  type="number"
                  step="0.01"
                  placeholder="250.00"
                  value={form.prix_indicatif}
                  onChange={(e) =>
                    setForm({ ...form, prix_indicatif: e.target.value })
                  }
                />
                <Input
                  label="Durée estimée (jours)"
                  type="number"
                  placeholder="7"
                  value={form.duree_estimee_jours}
                  onChange={(e) =>
                    setForm({ ...form, duree_estimee_jours: e.target.value })
                  }
                />
              </div>

              {/* Mode de fourniture */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Mode de fourniture
                </label>
                <div className="flex gap-3">
                  {MODES_FOURNITURE.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() =>
                        setForm({ ...form, mode_fourniture: m.value })
                      }
                      className={`flex flex-1 items-center gap-2 rounded-lg border-2 px-3 py-2.5 text-sm transition-colors ${
                        form.mode_fourniture === m.value
                          ? "border-sky-500 bg-sky-50 text-sky-700"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      <m.icon className="h-4 w-4" />
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Matériaux disponibles */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Matériaux disponibles
                </label>
                <div className="flex flex-wrap gap-2">
                  {MATERIAUX.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => toggleMateriau(m.value)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                        form.materiaux_disponibles.includes(m.value)
                          ? "border-sky-300 bg-sky-100 text-sky-700"
                          : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Instructions */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  Instructions pour le praticien
                </label>
                <textarea
                  value={form.instructions}
                  onChange={(e) =>
                    setForm({ ...form, instructions: e.target.value })
                  }
                  rows={2}
                  placeholder="Instructions spécifiques lors de la commande de ce type de travail..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={resetForm}>
                  Annuler
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving || !form.nom}
                  className="gap-2 bg-sky-600 hover:bg-sky-700"
                >
                  <Save className="h-4 w-4" />
                  {saving
                    ? "Enregistrement..."
                    : editingId
                      ? "Mettre à jour"
                      : "Créer le service"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Services list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Wrench className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-4 text-gray-500">Aucun service</p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((s) => (
            <Card
              key={s.id}
              className={`transition-opacity ${!s.actif ? "opacity-50" : ""}`}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  {/* Drag handle placeholder */}
                  <div className="mt-1 text-gray-300">
                    <GripVertical className="h-5 w-5" />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-900">{s.nom}</h3>
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${
                          CATEGORIE_COLORS[s.categorie] || CATEGORIE_COLORS.autre
                        }`}
                      >
                        {CATEGORIES.find((c) => c.value === s.categorie)
                          ?.label || s.categorie}
                      </span>
                      {!s.actif && (
                        <Badge className="border-gray-200 bg-gray-100 text-gray-500">
                          Désactivé
                        </Badge>
                      )}
                    </div>

                    {s.description && (
                      <p className="mt-1 text-sm text-gray-500">
                        {s.description}
                      </p>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      {/* Mode fourniture */}
                      <span className="flex items-center gap-1">
                        {s.mode_fourniture === "numerique_stl" ? (
                          <>
                            <Monitor className="h-3.5 w-3.5" /> Numérique
                          </>
                        ) : s.mode_fourniture === "empreinte_physique" ? (
                          <>
                            <Truck className="h-3.5 w-3.5" /> Physique
                          </>
                        ) : (
                          <>
                            <ArrowUpDown className="h-3.5 w-3.5" /> Les deux
                          </>
                        )}
                      </span>

                      {/* Prix */}
                      {s.prix_indicatif && (
                        <span className="flex items-center gap-1">
                          <Euro className="h-3.5 w-3.5" />
                          {Number(s.prix_indicatif).toFixed(2)} €
                        </span>
                      )}

                      {/* Durée */}
                      {s.duree_estimee_jours && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {s.duree_estimee_jours} jours
                        </span>
                      )}

                      {/* Matériaux */}
                      {s.materiaux_disponibles?.length > 0 && (
                        <span>
                          Matériaux :{" "}
                          {s.materiaux_disponibles
                            .map(
                              (m) =>
                                MATERIAUX.find((x) => x.value === m)?.label ||
                                m
                            )
                            .join(", ")}
                        </span>
                      )}
                    </div>

                    {s.instructions && (
                      <p className="mt-2 rounded bg-amber-50 px-2 py-1 text-xs text-amber-700">
                        📋 {s.instructions}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleActif(s.id, s.actif)}
                      className={`rounded-lg p-2 transition-colors ${
                        s.actif
                          ? "text-green-600 hover:bg-green-50"
                          : "text-gray-400 hover:bg-gray-100"
                      }`}
                      title={s.actif ? "Désactiver" : "Activer"}
                    >
                      {s.actif ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => startEdit(s)}
                      className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-sky-600"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteService(s.id)}
                      className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
