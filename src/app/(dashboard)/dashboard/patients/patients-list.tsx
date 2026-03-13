"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users,
  Plus,
  X,
  Search,
  UserPlus,
  Eye,
  Save,
} from "lucide-react";

type Patient = {
  id: string;
  reference: string;
  nom: string;
  prenom: string;
  date_naissance: string | null;
  sexe: string | null;
  notes: string | null;
  actif: boolean;
  created_at: string;
};

export function PatientsList({
  initialPatients,
}: {
  initialPatients: Patient[];
}) {
  const supabase = createClient();
  const [patients, setPatients] = useState(initialPatients);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    nom: "",
    prenom: "",
    date_naissance: "",
    sexe: "" as string,
    notes: "",
  });

  const filtered = patients.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.nom.toLowerCase().includes(q) ||
      p.prenom.toLowerCase().includes(q) ||
      p.reference.toLowerCase().includes(q)
    );
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data, error } = await supabase
      .from("patients")
      .insert({
        dentiste_id: userData.user.id,
        nom: form.nom,
        prenom: form.prenom,
        date_naissance: form.date_naissance || null,
        sexe: form.sexe || null,
        notes: form.notes || null,
      })
      .select()
      .single();

    if (!error && data) {
      setPatients([data, ...patients]);
      setForm({ nom: "", prenom: "", date_naissance: "", sexe: "", notes: "" });
      setShowForm(false);
    }
    setCreating(false);
  };

  return (
    <div className="space-y-6">
      {/* Actions bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un patient..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="gap-2 bg-sky-600 hover:bg-sky-700"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Annuler" : "Nouveau patient"}
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <Card>
          <CardContent className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-sky-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Nouveau patient
              </h3>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Prénom *"
                  value={form.prenom}
                  onChange={(e) =>
                    setForm({ ...form, prenom: e.target.value })
                  }
                  required
                />
                <Input
                  label="Nom *"
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Input
                  label="Date de naissance"
                  type="date"
                  value={form.date_naissance}
                  onChange={(e) =>
                    setForm({ ...form, date_naissance: e.target.value })
                  }
                />
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Sexe
                  </label>
                  <select
                    value={form.sexe}
                    onChange={(e) => setForm({ ...form, sexe: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  >
                    <option value="">Non renseigné</option>
                    <option value="M">Masculin</option>
                    <option value="F">Féminin</option>
                    <option value="X">Autre</option>
                  </select>
                </div>
                <Input
                  label="Notes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Allergies, remarques..."
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={creating}
                  className="gap-2 bg-sky-600 hover:bg-sky-700"
                >
                  <Save className="h-4 w-4" />
                  {creating ? "Création..." : "Enregistrer"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Patients list */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-4 text-gray-500">
                {search ? "Aucun patient trouvé" : "Aucun patient enregistré"}
              </p>
              {!search && (
                <p className="mt-1 text-sm text-gray-400">
                  Créez votre premier patient pour commencer
                </p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-gray-500">
                    <th className="px-6 py-3 font-medium">Référence</th>
                    <th className="px-6 py-3 font-medium">Nom</th>
                    <th className="px-6 py-3 font-medium">Date de naissance</th>
                    <th className="px-6 py-3 font-medium">Sexe</th>
                    <th className="px-6 py-3 font-medium">Créé le</th>
                    <th className="px-6 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-mono text-xs text-sky-600">
                        {p.reference}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {p.prenom} {p.nom}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {p.date_naissance
                          ? new Date(p.date_naissance).toLocaleDateString(
                              "fr-FR"
                            )
                          : "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {p.sexe === "M"
                          ? "Homme"
                          : p.sexe === "F"
                            ? "Femme"
                            : p.sexe === "X"
                              ? "Autre"
                              : "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(p.created_at).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/dashboard/patients/${p.id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Voir
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
