"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Settings,
  User,
  Building2,
  Shield,
  Save,
  Database,
  Users,
  Package,
  BookOpen,
  Key,
  Mail,
  Phone,
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
  const [formData, setFormData] = useState({
    nom: profile?.nom || "",
    prenom: profile?.prenom || "",
    telephone: profile?.telephone || "",
  });
  const [laboSettings, setLaboSettings] = useState({
    nom_labo: "DECERF LAB",
    adresse: "",
    code_postal: "",
    ville: "",
    telephone_labo: "",
    email_labo: "",
    siret: "",
    horaires: "Lundi - Vendredi : 8h00 - 18h00",
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

  return (
    <div className="space-y-8">
      {/* Profil admin */}
      <Card>
        <CardContent className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <User className="h-5 w-5 text-sky-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Profil administrateur
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
                  Email
                </label>
                <div className="flex h-10 items-center rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-500">
                  <Mail className="mr-2 h-4 w-4" />
                  {profile?.email}
                </div>
              </div>
              <Input
                label="Téléphone"
                type="tel"
                value={formData.telephone}
                onChange={(e) =>
                  setFormData({ ...formData, telephone: e.target.value })
                }
                placeholder="06 12 34 56 78"
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

      {/* Informations du laboratoire */}
      <Card>
        <CardContent className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-sky-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Informations du laboratoire
            </h2>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Nom du laboratoire"
                value={laboSettings.nom_labo}
                onChange={(e) =>
                  setLaboSettings({
                    ...laboSettings,
                    nom_labo: e.target.value,
                  })
                }
              />
              <Input
                label="SIRET"
                value={laboSettings.siret}
                onChange={(e) =>
                  setLaboSettings({ ...laboSettings, siret: e.target.value })
                }
                placeholder="123 456 789 00012"
              />
            </div>
            <Input
              label="Adresse"
              value={laboSettings.adresse}
              onChange={(e) =>
                setLaboSettings({ ...laboSettings, adresse: e.target.value })
              }
              placeholder="12 rue de la Prothèse"
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Input
                label="Code postal"
                value={laboSettings.code_postal}
                onChange={(e) =>
                  setLaboSettings({
                    ...laboSettings,
                    code_postal: e.target.value,
                  })
                }
                placeholder="75001"
              />
              <Input
                label="Ville"
                value={laboSettings.ville}
                onChange={(e) =>
                  setLaboSettings({ ...laboSettings, ville: e.target.value })
                }
                placeholder="Paris"
              />
              <Input
                label="Téléphone"
                value={laboSettings.telephone_labo}
                onChange={(e) =>
                  setLaboSettings({
                    ...laboSettings,
                    telephone_labo: e.target.value,
                  })
                }
                placeholder="01 23 45 67 89"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Email du laboratoire"
                type="email"
                value={laboSettings.email_labo}
                onChange={(e) =>
                  setLaboSettings({
                    ...laboSettings,
                    email_labo: e.target.value,
                  })
                }
                placeholder="contact@decerflab.fr"
              />
              <Input
                label="Horaires d'ouverture"
                value={laboSettings.horaires}
                onChange={(e) =>
                  setLaboSettings({
                    ...laboSettings,
                    horaires: e.target.value,
                  })
                }
              />
            </div>

            <p className="text-xs text-gray-400">
              Ces informations apparaîtront sur les documents et factures
              envoyés aux clients.
            </p>
          </div>
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
