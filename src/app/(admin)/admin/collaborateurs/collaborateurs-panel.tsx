"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UserPlus, AlertCircle, Power, PowerOff, Copy } from "lucide-react";

type Collaborateur = {
  id: string;
  nom: string | null;
  prenom: string | null;
  email: string | null;
  telephone: string | null;
  role_labo: string | null;
  actif_collaborateur: boolean | null;
  created_at: string;
};

const ROLES_LABO = [
  { value: "prothesiste", label: "Prothésiste" },
  { value: "ortho", label: "Ortho" },
  { value: "qualite", label: "Qualité" },
  { value: "finition", label: "Finition" },
  { value: "logistique", label: "Logistique" },
  { value: "superviseur", label: "Superviseur" },
];

export function CollaborateursPanel({
  initial,
}: {
  initial: Collaborateur[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [form, setForm] = useState({
    nom: "",
    prenom: "",
    email: "",
    telephone: "",
    role_labo: "prothesiste",
  });

  const submit = () => {
    setError(null);
    setInviteUrl(null);
    startTransition(async () => {
      const res = await fetch("/api/admin/collaborateurs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Erreur");
        return;
      }
      setInviteUrl(data?.invite_url ?? null);
      setForm({
        nom: "",
        prenom: "",
        email: "",
        telephone: "",
        role_labo: "prothesiste",
      });
      router.refresh();
    });
  };

  const toggle = (id: string, actif: boolean) => {
    startTransition(async () => {
      const res = await fetch(`/api/admin/collaborateurs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actif_collaborateur: actif }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data?.error || "Erreur");
        return;
      }
      router.refresh();
    });
  };

  const changeRole = (id: string, role_labo: string) => {
    startTransition(async () => {
      const res = await fetch(`/api/admin/collaborateurs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role_labo }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data?.error || "Erreur");
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4 p-6">
          <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <UserPlus className="h-4 w-4 text-sky-600" />
            Inviter un collaborateur
          </h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input
              placeholder="Prénom"
              value={form.prenom}
              onChange={(e) => setForm({ ...form, prenom: e.target.value })}
            />
            <Input
              placeholder="Nom"
              value={form.nom}
              onChange={(e) => setForm({ ...form, nom: e.target.value })}
            />
            <Input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <Input
              placeholder="Téléphone (optionnel)"
              value={form.telephone}
              onChange={(e) => setForm({ ...form, telephone: e.target.value })}
            />
            <select
              value={form.role_labo}
              onChange={(e) => setForm({ ...form, role_labo: e.target.value })}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              {ROLES_LABO.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4" /> {error}
            </div>
          )}

          {inviteUrl && (
            <div className="space-y-2 rounded-lg bg-green-50 p-3 text-sm text-green-800">
              <p className="font-medium">
                Compte créé. Lien de définition de mot de passe :
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 break-all rounded bg-white px-2 py-1 text-xs">
                  {inviteUrl}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigator.clipboard.writeText(inviteUrl)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}

          <Button
            onClick={submit}
            disabled={pending || !form.email || !form.nom || !form.prenom}
            className="bg-sky-600 hover:bg-sky-700"
          >
            {pending ? "Création..." : "Inviter"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Nom</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Rôle interne</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {initial.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                      Aucun collaborateur.
                    </td>
                  </tr>
                )}
                {initial.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {c.prenom} {c.nom}
                      </div>
                      {c.telephone && (
                        <div className="text-xs text-gray-500">{c.telephone}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{c.email}</td>
                    <td className="px-4 py-3">
                      <select
                        value={c.role_labo ?? ""}
                        onChange={(e) => changeRole(c.id, e.target.value)}
                        className="rounded-lg border border-gray-200 px-2 py-1 text-xs"
                      >
                        <option value="">—</option>
                        {ROLES_LABO.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      {c.actif_collaborateur ? (
                        <Badge className="bg-green-100 text-green-700">Actif</Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-600">
                          Désactivé
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          toggle(c.id, !c.actif_collaborateur)
                        }
                      >
                        {c.actif_collaborateur ? (
                          <>
                            <PowerOff className="mr-1 h-3 w-3" /> Désactiver
                          </>
                        ) : (
                          <>
                            <Power className="mr-1 h-3 w-3" /> Réactiver
                          </>
                        )}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
