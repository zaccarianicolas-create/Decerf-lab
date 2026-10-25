"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Profile } from "@/types";
import { NotificationsPanel } from "./notifications-panel";

type CabinetContact = {
  id: string;
  nom: string;
  adresse: string | null;
  code_postal: string | null;
  ville: string | null;
  telephone: string | null;
  email: string | null;
};

const emptyCabinet = (id = ""): CabinetContact => ({
  id,
  nom: "",
  adresse: "",
  code_postal: "",
  ville: "",
  telephone: "",
  email: "",
});

export default function ProfilPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingCabinet, setSavingCabinet] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [cabinetMessage, setCabinetMessage] = useState<string | null>(null);
  const [cabinet, setCabinet] = useState<CabinetContact | null>(null);

  const { register, handleSubmit, reset, setValue, watch } = useForm<Partial<Profile>>();
  const assujettiTva = watch("assujetti_tva");

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (data) {
        setProfile(data);
        reset(data);
        if (data.cabinet_id) {
          const { data: cabinetData } = await supabase
            .from("cabinets")
            .select("id, nom, adresse, code_postal, ville, telephone, email")
            .eq("id", data.cabinet_id)
            .maybeSingle();
          setCabinet(cabinetData ?? emptyCabinet(data.cabinet_id));
        } else {
          setCabinet(emptyCabinet());
        }
      }
      setLoading(false);
    }
    loadProfile();
  }, [reset]);

  const onSubmit = async (data: Partial<Profile>) => {
    if (data.assujetti_tva === true && !data.numero_tva?.trim()) {
      setMessage("Indique le numéro TVA si tu te déclares assujetti.");
      return;
    }
    setSaving(true);
    setMessage(null);
    const supabase = createClient();

    const { error } = await supabase
      .from("profiles")
      .update({
        nom: data.nom,
        prenom: data.prenom,
        telephone: data.telephone,
        numero_inami: data.numero_inami?.trim() || null,
        numero_entreprise: data.numero_entreprise?.trim() || null,
        assujetti_tva: data.assujetti_tva ?? null,
        numero_tva: data.assujetti_tva === true ? data.numero_tva?.trim() || null : null,
        mode_travail_prefere:
          profile?.type_compte_client === "laboratoire" ? null : data.mode_travail_prefere,
        modele_scanner:
          profile?.type_compte_client === "laboratoire" || data.mode_travail_prefere === "empreinte"
            ? null
            : data.modele_scanner || null,
      })
      .eq("id", profile!.id);

    if (error) {
      setMessage("Erreur lors de la sauvegarde");
    } else {
      setMessage("Profil mis à jour avec succès");
    }
    setSaving(false);
  };

  const onSaveCabinet = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!cabinet) return;
    setSavingCabinet(true);
    setCabinetMessage(null);
    try {
      const response = await fetch("/api/dashboard/profil/cabinet", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cabinet),
      });
      const result = await response.json() as { cabinet?: CabinetContact; error?: string };
      if (!response.ok || !result.cabinet) {
        setCabinetMessage(result.error || "Erreur lors de la sauvegarde du cabinet.");
      } else {
        setCabinet(result.cabinet);
        setProfile((current) => current ? { ...current, cabinet_id: result.cabinet!.id } : current);
        setCabinetMessage("Cabinet enregistré. Son adresse sera proposée aux prochaines commandes.");
      }
    } catch {
      setCabinetMessage("Erreur réseau lors de la sauvegarde du cabinet.");
    }
    setSavingCabinet(false);
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Mon profil</h1>
        <p className="text-sm text-gray-500">
          Gérez vos informations personnelles
        </p>
      </div>

      <div className="max-w-3xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Informations personnelles</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {message && (
                <div
                  className={`rounded-lg p-3 text-sm ${message.includes("Erreur") ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}
                >
                  {message}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <Input label="Prénom" {...register("prenom")} />
                <Input label="Nom" {...register("nom")} />
              </div>
              <Input
                label="Email de connexion"
                value={profile?.email}
                disabled
                className="bg-gray-50"
              />
              <Input
                label="Téléphone"
                type="tel"
                {...register("telephone")}
              />
              {profile?.type_compte_client !== "laboratoire" && <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  Mode de travail préféré
                </label>
                <select
                  className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  {...register("mode_travail_prefere")}
                >
                  <option value="">Non renseigné</option>
                  <option value="scan">Scanner intra-oral</option>
                  <option value="empreinte">Empreinte classique</option>
                  <option value="hybride">Les deux</option>
                </select>
              </div>}
              {profile?.type_compte_client !== "laboratoire" && <Input
                label="Modèle de scanner"
                placeholder="ex: 3Shape TRIOS, iTero, Medit"
                {...register("modele_scanner")}
              />}
              <Button type="submit" isLoading={saving}>
                Enregistrer mes informations
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Informations professionnelles et facturation</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {profile?.type_compte_client !== "laboratoire" && (
                <div>
                  <Input
                    label="N° INAMI/RIZIV (facultatif)"
                    {...register("numero_inami")}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Non bloquant; le laboratoire peut le vérifier si tu le renseignes.
                  </p>
                </div>
              )}
              <Input
                label="N° d’entreprise BCE/KBO"
                placeholder="À compléter si attribué"
                {...register("numero_entreprise")}
              />
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  Assujetti à la TVA ?
                </label>
                <select
                  className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm"
                  value={assujettiTva === true ? "oui" : assujettiTva === false ? "non" : ""}
                  onChange={(event) => setValue("assujetti_tva", event.target.value === "" ? null : event.target.value === "oui")}
                >
                  <option value="">À préciser</option>
                  <option value="oui">Oui</option>
                  <option value="non">Non</option>
                </select>
              </div>
              {assujettiTva === true && (
                <Input
                  label="N° TVA"
                  placeholder="À compléter si attribué"
                  {...register("numero_tva")}
                />
              )}
              <Button type="submit" isLoading={saving}>
                Enregistrer les informations professionnelles
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cabinet ou organisation associé</CardTitle>
          </CardHeader>
          <CardContent>
            {cabinet ? (
              <form onSubmit={onSaveCabinet} className="space-y-4">
                {cabinetMessage && (
                  <p className={`rounded-lg p-3 text-sm ${cabinetMessage.startsWith("Erreur") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`} role="status">
                    {cabinetMessage}
                  </p>
                )}
                <Input label={profile?.type_compte_client === "laboratoire" ? "Nom du laboratoire" : "Nom du cabinet"} required value={cabinet.nom} onChange={(event) => setCabinet({ ...cabinet, nom: event.target.value })} />
                <Input label="Adresse" required value={cabinet.adresse || ""} onChange={(event) => setCabinet({ ...cabinet, adresse: event.target.value })} />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input label="Code postal" required value={cabinet.code_postal || ""} onChange={(event) => setCabinet({ ...cabinet, code_postal: event.target.value })} />
                  <Input label="Ville" required value={cabinet.ville || ""} onChange={(event) => setCabinet({ ...cabinet, ville: event.target.value })} />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input label="Téléphone du cabinet" type="tel" value={cabinet.telephone || ""} onChange={(event) => setCabinet({ ...cabinet, telephone: event.target.value })} />
                  <Input label="Email du cabinet" type="email" value={cabinet.email || ""} onChange={(event) => setCabinet({ ...cabinet, email: event.target.value })} />
                </div>
                <Button type="submit" isLoading={savingCabinet}>
                  {cabinet.id ? "Enregistrer le cabinet" : "Créer le cabinet associé"}
                </Button>
                <p className="text-xs text-gray-500">
                  Cette adresse sera proposée par défaut comme adresse d’enlèvement lors d’une nouvelle commande.
                </p>
              </form>
            ) : <p className="text-sm text-gray-500">Chargement du cabinet…</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Déconnexion</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={handleLogout}>
              Se déconnecter
            </Button>
          </CardContent>
        </Card>

        {profile?.id && <NotificationsPanel userId={profile.id} />}
      </div>
    </div>
  );
}
