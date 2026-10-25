"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  User,
  Shield,
  Save,
  Database,
  Users,
  Package,
  BookOpen,
  Key,
  Mail,
} from "lucide-react";

type Profile = {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  telephone: string | null;
  role: string;
  avatar_url: string | null;
};

export function ParametresForm({
  profile,
  stats,
}: {
  profile: Profile | null;
  stats: {
    totalClients: number;
    totalCommandes: number;
    totalProtocoles: number;
  };
}) {
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [emailChanging, setEmailChanging] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailChangeMessage, setEmailChangeMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nom: profile?.nom || "",
    prenom: profile?.prenom || "",
    telephone: profile?.telephone || "",
  });
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    await supabase
      .from("profiles")
      .update({
        nom: formData.nom,
        prenom: formData.prenom,
        telephone: formData.telephone || null,
      })
      .eq("id", profile?.id);

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleRequestEmailChange = async () => {
    const email = newEmail.trim().toLowerCase();
    setEmailChangeMessage(null);
    if (!email || email === profile?.email?.toLowerCase()) {
      setEmailChangeMessage("Saisissez une nouvelle adresse email différente de l’adresse actuelle.");
      return;
    }

    setEmailChanging(true);
    const { error } = await supabase.auth.updateUser({ email });
    setEmailChanging(false);
    setEmailChangeMessage(
      error
        ? `Impossible de demander le changement : ${error.message}`
        : "Demande envoyée. Suivez les instructions de confirmation reçues par email; l’adresse de connexion changera après confirmation."
    );
  };

  return (
    <div className="space-y-8">
      {/* Profil admin */}
      <Card>
        <CardContent className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <User className="h-5 w-5 text-sky-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Compte administrateur
            </h2>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Prénom"
                value={formData.prenom}
                onChange={(e) =>
                  setFormData({ ...formData, prenom: e.target.value })
                }
              />
              <Input
                label="Nom"
                value={formData.nom}
                onChange={(e) =>
                  setFormData({ ...formData, nom: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  Email de connexion
                </label>
                <div className="flex h-10 items-center rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-500">
                  <Mail className="mr-2 h-4 w-4" />
                  {profile?.email}
                </div>
                <p className="text-xs text-gray-500">
                  Cet email sert à se connecter à l’administration. L’email public du laboratoire se règle dans l’identité du labo.
                </p>
              </div>
              <Input
                label="Téléphone"
                type="tel"
                value={formData.telephone}
                onChange={(e) =>
                  setFormData({ ...formData, telephone: e.target.value })
                }
                placeholder="+32 (0)4 xx xx xx xx"
              />
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="submit"
                disabled={saving}
                className="gap-2 bg-sky-600 hover:bg-sky-700"
              >
                <Save className="h-4 w-4" />
                {saving ? "Enregistrement..." : "Enregistrer"}
              </Button>
              {saved && (
                <span className="text-sm text-green-600">
                  ✓ Modifications enregistrées
                </span>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Sécurité */}
      <Card>
        <CardContent className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-sky-600" />
            <h2 className="text-lg font-semibold text-gray-900">Sécurité</h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-3 rounded-lg border border-gray-200 p-4">
              <div>
                <p className="font-medium text-gray-900">Email de connexion</p>
                <p className="text-sm text-gray-500">Adresse actuelle : {profile?.email}</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  label="Nouvelle adresse email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="nouvelle-adresse@exemple.be"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={emailChanging}
                  onClick={handleRequestEmailChange}
                  className="self-end"
                >
                  {emailChanging ? "Envoi…" : "Demander le changement"}
                </Button>
              </div>
              {emailChangeMessage && (
                <p className="text-sm text-slate-600" role="status">{emailChangeMessage}</p>
              )}
            </div>
            <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
              <div>
                <p className="font-medium text-gray-900">
                  Changer le mot de passe
                </p>
                <p className="text-sm text-gray-500">
                  Modifier votre mot de passe de connexion
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (profile?.email) {
                    await supabase.auth.resetPasswordForEmail(profile.email, {
                      redirectTo: `${window.location.origin}/login`,
                    });
                    alert(
                      "Un email de réinitialisation a été envoyé à " +
                        profile.email
                    );
                  }
                }}
                className="gap-2"
              >
                <Key className="h-4 w-4" />
                Réinitialiser
              </Button>
            </div>

            <div className="rounded-lg border border-gray-200 p-4">
              <p className="font-medium text-gray-900">
                Rôle : Administrateur
              </p>
              <p className="text-sm text-gray-500">
                Accès complet à toutes les fonctionnalités du laboratoire
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats base de données */}
      <Card>
        <CardContent className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <Database className="h-5 w-5 text-sky-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Base de données
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 p-4">
              <Users className="h-8 w-8 text-sky-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.totalClients}
                </p>
                <p className="text-sm text-gray-500">Clients</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 p-4">
              <Package className="h-8 w-8 text-sky-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.totalCommandes}
                </p>
                <p className="text-sm text-gray-500">Commandes</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 p-4">
              <BookOpen className="h-8 w-8 text-sky-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.totalProtocoles}
                </p>
                <p className="text-sm text-gray-500">Protocoles</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
