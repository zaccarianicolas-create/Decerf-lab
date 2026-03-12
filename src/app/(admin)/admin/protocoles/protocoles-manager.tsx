"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BookOpen,
  Plus,
  X,
  Edit3,
  Trash2,
  GripVertical,
  Eye,
  EyeOff,
  Save,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

type Protocole = {
  id: string;
  titre: string;
  description: string | null;
  contenu: string | null;
  categorie: string | null;
  actif: boolean;
  ordre: number;
  created_at: string;
  updated_at: string;
};

const CATEGORIES = [
  "Couronnes",
  "Bridges",
  "Prothèses amovibles",
  "Implants",
  "Orthodontie",
  "Contrôle qualité",
  "Expédition",
  "Général",
];

export function ProtocolesManager({
  initialProtocoles,
}: {
  initialProtocoles: Protocole[];
}) {
  const supabase = createClient();
  const [protocoles, setProtocoles] = useState(initialProtocoles);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Protocole | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    titre: "",
    description: "",
    contenu: "",
    categorie: "Général",
    actif: true,
  });

  const resetForm = () => {
    setFormData({
      titre: "",
      description: "",
      contenu: "",
      categorie: "Général",
      actif: true,
    });
    setEditing(null);
    setShowForm(false);
  };

  const openEdit = (p: Protocole) => {
    setEditing(p);
    setFormData({
      titre: p.titre,
      description: p.description || "",
      contenu: p.contenu || "",
      categorie: p.categorie || "Général",
      actif: p.actif,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    if (editing) {
      const { data, error } = await supabase
        .from("protocoles")
        .update({
          titre: formData.titre,
          description: formData.description || null,
          contenu: formData.contenu || null,
          categorie: formData.categorie,
          actif: formData.actif,
        })
        .eq("id", editing.id)
        .select()
        .single();

      if (data) {
        setProtocoles((prev) =>
          prev.map((p) => (p.id === editing.id ? data : p))
        );
      }
    } else {
      const { data, error } = await supabase
        .from("protocoles")
        .insert({
          titre: formData.titre,
          description: formData.description || null,
          contenu: formData.contenu || null,
          categorie: formData.categorie,
          actif: formData.actif,
          ordre: protocoles.length,
        })
        .select()
        .single();

      if (data) {
        setProtocoles((prev) => [...prev, data]);
      }
    }

    setSaving(false);
    resetForm();
  };

  const toggleActif = async (id: string, actif: boolean) => {
    await supabase.from("protocoles").update({ actif: !actif }).eq("id", id);
    setProtocoles((prev) =>
      prev.map((p) => (p.id === id ? { ...p, actif: !actif } : p))
    );
  };

  const deleteProtocole = async (id: string) => {
    if (!confirm("Supprimer ce protocole ?")) return;
    await supabase.from("protocoles").delete().eq("id", id);
    setProtocoles((prev) => prev.filter((p) => p.id !== id));
  };

  const groupedByCategory = protocoles.reduce(
    (acc, p) => {
      const cat = p.categorie || "Général";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(p);
      return acc;
    },
    {} as Record<string, Protocole[]>
  );

  return (
    <div className="space-y-6">
      {/* Create / Edit form */}
      {!showForm ? (
        <Button
          onClick={() => setShowForm(true)}
          className="gap-2 bg-sky-600 hover:bg-sky-700"
        >
          <Plus className="h-4 w-4" />
          Nouveau protocole
        </Button>
      ) : (
        <Card>
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {editing ? "Modifier le protocole" : "Nouveau protocole"}
              </h3>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Titre *"
                  value={formData.titre}
                  onChange={(e) =>
                    setFormData({ ...formData, titre: e.target.value })
                  }
                  required
                  placeholder="Ex: Protocole couronne zircone"
                />
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">
                    Catégorie
                  </label>
                  <select
                    value={formData.categorie}
                    onChange={(e) =>
                      setFormData({ ...formData, categorie: e.target.value })
                    }
                    className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <Input
                label="Description courte"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Résumé en une ligne"
              />

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  Contenu détaillé (Markdown)
                </label>
                <textarea
                  value={formData.contenu}
                  onChange={(e) =>
                    setFormData({ ...formData, contenu: e.target.value })
                  }
                  placeholder={`## Étapes\n\n1. Préparation du modèle\n2. Scan numérique\n3. Conception CAO\n4. Fraisage\n5. Finitions`}
                  rows={8}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="actif"
                  checked={formData.actif}
                  onChange={(e) =>
                    setFormData({ ...formData, actif: e.target.checked })
                  }
                  className="rounded border-gray-300"
                />
                <label htmlFor="actif" className="text-sm text-gray-700">
                  Actif (visible par les dentistes)
                </label>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="gap-2 bg-sky-600 hover:bg-sky-700"
                >
                  <Save className="h-4 w-4" />
                  {saving
                    ? "Enregistrement..."
                    : editing
                      ? "Mettre à jour"
                      : "Créer"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* List */}
      {protocoles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-4 text-gray-500">Aucun protocole créé</p>
            <p className="text-sm text-gray-400">
              Créez votre premier protocole pour documenter vos procédures
            </p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(groupedByCategory).map(([category, items]) => (
          <div key={category}>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
              {category} ({items.length})
            </h3>
            <div className="space-y-2">
              {items.map((p) => (
                <Card
                  key={p.id}
                  className={`transition-colors ${!p.actif ? "opacity-50" : ""}`}
                >
                  <CardContent className="p-0">
                    <div className="flex items-center justify-between px-5 py-4">
                      <div className="flex items-center gap-3">
                        <GripVertical className="h-4 w-4 text-gray-300" />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900">
                              {p.titre}
                            </p>
                            {!p.actif && (
                              <Badge className="border-gray-200 bg-gray-100 text-gray-500">
                                Inactif
                              </Badge>
                            )}
                          </div>
                          {p.description && (
                            <p className="text-sm text-gray-500">
                              {p.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            setExpandedId(
                              expandedId === p.id ? null : p.id
                            )
                          }
                          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          title="Voir le contenu"
                        >
                          {expandedId === p.id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => toggleActif(p.id, p.actif)}
                          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          title={p.actif ? "Désactiver" : "Activer"}
                        >
                          {p.actif ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => openEdit(p)}
                          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-sky-600"
                          title="Modifier"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteProtocole(p.id)}
                          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Expanded content */}
                    {expandedId === p.id && p.contenu && (
                      <div className="border-t border-gray-100 bg-gray-50 px-5 py-4">
                        <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700">
                          {p.contenu}
                        </pre>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
