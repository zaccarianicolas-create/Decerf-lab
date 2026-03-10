"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Profile } from "@/types";

export default function ProfilPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const { register, handleSubmit, reset } = useForm<Partial<Profile>>();

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
      }
      setLoading(false);
    }
    loadProfile();
  }, [reset]);

  const onSubmit = async (data: Partial<Profile>) => {
    setSaving(true);
    setMessage(null);
    const supabase = createClient();

    const { error } = await supabase
      .from("profiles")
      .update({
        nom: data.nom,
        prenom: data.prenom,
        telephone: data.telephone,
      })
      .eq("id", profile!.id);

    if (error) {
      setMessage("Erreur lors de la sauvegarde");
    } else {
      setMessage("Profil mis à jour avec succès");
    }
    setSaving(false);
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

      <div className="max-w-2xl space-y-6">
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
                label="Email"
                value={profile?.email}
                disabled
                className="bg-gray-50"
              />
              <Input
                label="Téléphone"
                type="tel"
                {...register("telephone")}
              />
              <Input
                label="Rôle"
                value={profile?.role === "admin" ? "Administrateur" : "Dentiste"}
                disabled
                className="bg-gray-50"
              />
              <Button type="submit" isLoading={saving}>
                Sauvegarder
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Zone de danger</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={handleLogout}>
              Se déconnecter
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
