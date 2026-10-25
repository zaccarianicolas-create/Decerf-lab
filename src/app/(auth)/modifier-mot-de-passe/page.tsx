"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ModifierMotDePassePage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const updatePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (password !== confirmation) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      setError("Le lien est invalide ou expiré. Demandez un nouveau lien de réinitialisation.");
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (updateError) {
      setError("Impossible de mettre à jour le mot de passe. Demandez un nouveau lien si celui-ci a expiré.");
      return;
    }
    setSaved(true);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">Choisir un nouveau mot de passe</CardTitle>
      </CardHeader>
      <CardContent>
        {saved ? (
          <div className="space-y-4">
            <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800" role="status">
              Votre mot de passe a été modifié.
            </p>
            <Button onClick={() => router.push("/dashboard")} className="w-full">
              Accéder à mon espace
            </Button>
          </div>
        ) : (
          <form onSubmit={updatePassword} className="space-y-4">
            {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
            <PasswordInput
              label="Nouveau mot de passe"
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <PasswordInput
              label="Confirmer le nouveau mot de passe"
              autoComplete="new-password"
              required
              minLength={6}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
            />
            <Button type="submit" className="w-full" isLoading={saving}>
              Enregistrer le nouveau mot de passe
            </Button>
            <Link href="/mot-de-passe-oublie" className="block text-center text-sm text-sky-600 hover:underline">
              Demander un nouveau lien
            </Link>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
