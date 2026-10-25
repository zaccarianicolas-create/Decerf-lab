"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function MotDePasseOubliePage() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const sendResetLink = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSending(true);
    setError(null);

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/api/auth/callback?next=/modifier-mot-de-passe`;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });

    setSending(false);
    if (resetError) {
      setError("Impossible d’envoyer le lien pour le moment. Réessayez plus tard.");
      return;
    }
    setSent(true);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">Réinitialiser le mot de passe</CardTitle>
        <p className="text-sm text-gray-500">
          Indiquez l’email associé au compte pour recevoir un lien de réinitialisation.
        </p>
      </CardHeader>
      <CardContent>
        {sent ? (
          <div className="space-y-4">
            <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800" role="status">
              Si un compte correspond à cette adresse, un lien de réinitialisation va être envoyé.
            </p>
            <Link href="/login" className="text-sm font-medium text-sky-600 hover:underline">
              Retour à la connexion
            </Link>
          </div>
        ) : (
          <form onSubmit={sendResetLink} className="space-y-4">
            {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
            <Input
              label="Email de connexion"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <Button type="submit" className="w-full" isLoading={sending}>
              Envoyer le lien
            </Button>
            <Link href="/login" className="block text-center text-sm text-sky-600 hover:underline">
              Retour à la connexion
            </Link>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
