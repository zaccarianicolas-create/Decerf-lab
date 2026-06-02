"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Download, X, Users, Eye } from "lucide-react";

type Dentiste = {
  id: string;
  nom: string;
  prenom: string;
  sans_compte?: boolean;
  cabinet?: { nom: string } | null;
};

type Patient = {
  id: string;
  reference: string;
  nom: string;
  prenom: string;
  date_naissance: string | null;
  sexe: string | null;
  telephone: string | null;
  email: string | null;
  actif: boolean;
  archived_at: string | null;
  anonymized_at: string | null;
  dentiste_id: string | null;
  created_at: string;
  nb_commandes: number;
  dentiste:
    | {
        id: string;
        nom: string;
        prenom: string;
        sans_compte?: boolean;
        cabinet?: { nom: string } | null;
      }
    | null;
};

export function AdminPatientsList({
  initialPatients,
  dentistes,
}: {
  initialPatients: Patient[];
  dentistes: Dentiste[];
}) {
  const [patients, setPatients] = useState(initialPatients);
  const [search, setSearch] = useState("");
  const [filterDentiste, setFilterDentiste] = useState<string>("");
  const [filterStatut, setFilterStatut] = useState<string>("actifs");
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    dentiste_id: "",
    nom: "",
    prenom: "",
    date_naissance: "",
    sexe: "",
    telephone: "",
    email: "",
    notes: "",
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return patients.filter((p) => {
      const matchSearch =
        !q ||
        p.nom.toLowerCase().includes(q) ||
        p.prenom.toLowerCase().includes(q) ||
        p.reference.toLowerCase().includes(q) ||
        (p.email ?? "").toLowerCase().includes(q);
      const matchDent =
        !filterDentiste ||
        (filterDentiste === "orphelins" && !p.dentiste_id) ||
        p.dentiste_id === filterDentiste;
      const matchStatut =
        filterStatut === "tous" ||
        (filterStatut === "actifs" && p.actif && !p.archived_at) ||
        (filterStatut === "archives" && p.archived_at && !p.anonymized_at) ||
        (filterStatut === "anonymises" && p.anonymized_at);
      return matchSearch && matchDent && matchStatut;
    });
  }, [patients, search, filterDentiste, filterStatut]);

  const stats = useMemo(() => {
    const total = patients.length;
    const actifs = patients.filter((p) => p.actif && !p.archived_at).length;
    const archives = patients.filter(
      (p) => p.archived_at && !p.anonymized_at
    ).length;
    const anonymises = patients.filter((p) => p.anonymized_at).length;
    const orphelins = patients.filter((p) => !p.dentiste_id).length;
    return { total, actifs, archives, anonymises, orphelins };
  }, [patients]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    const res = await fetch("/api/admin/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        dentiste_id: form.dentiste_id || null,
        date_naissance: form.date_naissance || null,
      }),
    });
    const json = await res.json();
    setCreating(false);
    if (!res.ok) {
      setError(json.error || "Erreur");
      return;
    }
    setPatients([
      { ...json.patient, nb_commandes: 0, dentiste: null },
      ...patients,
    ]);
    setForm({
      dentiste_id: "",
      nom: "",
      prenom: "",
      date_naissance: "",
      sexe: "",
      telephone: "",
      email: "",
      notes: "",
    });
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
          <p className="text-sm text-gray-500">
            Vue globale de tous les patients du laboratoire
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="/api/admin/patients/export"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </a>
          <Button
            onClick={() => setShowForm(!showForm)}
            className="gap-2 bg-sky-600 hover:bg-sky-700"
          >
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? "Annuler" : "Nouveau patient"}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: "Total", value: stats.total, color: "text-gray-900" },
          { label: "Actifs", value: stats.actifs, color: "text-green-600" },
          { label: "Archivés", value: stats.archives, color: "text-amber-600" },
          {
            label: "Anonymisés",
            value: stats.anonymises,
            color: "text-red-600",
          },
          {
            label: "Orphelins",
            value: stats.orphelins,
            color: "text-purple-600",
          },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs uppercase text-gray-500">{s.label}</p>
              <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {showForm && (
        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 text-lg font-semibold">Nouveau patient</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Dentiste référent (optionnel — patient orphelin si vide)
                </label>
                <select
                  value={form.dentiste_id}
                  onChange={(e) =>
                    setForm({ ...form, dentiste_id: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">— Aucun (patient orphelin labo) —</option>
                  {dentistes.map((d) => (
                    <option key={d.id} value={d.id}>
                      Dr {d.prenom} {d.nom}
                      {d.sans_compte ? " (sans compte)" : ""}
                      {d.cabinet?.nom ? ` — ${d.cabinet.nom}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                    onChange={(e) =>
                      setForm({ ...form, sexe: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">Non renseigné</option>
                    <option value="M">Masculin</option>
                    <option value="F">Féminin</option>
                    <option value="X">Autre</option>
                  </select>
                </div>
                <Input
                  label="Téléphone"
                  value={form.telephone}
                  onChange={(e) =>
                    setForm({ ...form, telephone: e.target.value })
                  }
                />
                <Input
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm({ ...form, email: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Notes
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
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
                <Button type="submit" isLoading={creating}>
                  Créer
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[260px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher (nom, prénom, réf, email)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>
        <select
          value={filterDentiste}
          onChange={(e) => setFilterDentiste(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
        >
          <option value="">Tous dentistes</option>
          <option value="orphelins">Patients orphelins</option>
          {dentistes.map((d) => (
            <option key={d.id} value={d.id}>
              Dr {d.prenom} {d.nom}
              {d.sans_compte ? " (sans compte)" : ""}
            </option>
          ))}
        </select>
        <select
          value={filterStatut}
          onChange={(e) => setFilterStatut(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
        >
          <option value="actifs">Actifs</option>
          <option value="archives">Archivés</option>
          <option value="anonymises">Anonymisés</option>
          <option value="tous">Tous</option>
        </select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="mx-auto h-10 w-10 text-gray-300" />
              <p className="mt-3 text-sm text-gray-500">Aucun patient</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="px-4 py-3 font-medium">Référence</th>
                    <th className="px-4 py-3 font-medium">Patient</th>
                    <th className="px-4 py-3 font-medium">Dentiste référent</th>
                    <th className="px-4 py-3 font-medium">Cabinet</th>
                    <th className="px-4 py-3 font-medium text-center">
                      Travaux
                    </th>
                    <th className="px-4 py-3 font-medium">Statut</th>
                    <th className="px-4 py-3 font-medium">Créé le</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-sky-600">
                        {p.reference}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">
                          {p.prenom} {p.nom}
                        </p>
                        {p.email && (
                          <p className="text-xs text-gray-500">{p.email}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {p.dentiste ? (
                          <div>
                            <p>
                              Dr {p.dentiste.prenom} {p.dentiste.nom}
                            </p>
                            {p.dentiste.sans_compte && (
                              <span className="inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                                Sans compte
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-block rounded bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                            Orphelin
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {p.dentiste?.cabinet?.nom ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-center font-medium">
                        {p.nb_commandes}
                      </td>
                      <td className="px-4 py-3">
                        {p.anonymized_at ? (
                          <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs text-red-700">
                            Anonymisé
                          </span>
                        ) : p.archived_at ? (
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                            Archivé
                          </span>
                        ) : (
                          <span className="rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs text-green-700">
                            Actif
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {new Date(p.created_at).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/patients/${p.id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs hover:bg-gray-50"
                        >
                          <Eye className="h-3 w-3" />
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
