"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Prefs = {
  email_invitation: boolean;
  email_certificat: boolean;
  email_facture: boolean;
  email_commande: boolean;
  email_message: boolean;
  email_assignation: boolean;
  email_rgpd: boolean;
};

const DEFAULTS: Prefs = {
  email_invitation: true,
  email_certificat: true,
  email_facture: true,
  email_commande: true,
  email_message: true,
  email_assignation: true,
  email_rgpd: true,
};

const LABELS: Record<keyof Prefs, string> = {
  email_invitation: "Invitations",
  email_certificat: "Certificats de conformité",
  email_facture: "Factures émises",
  email_commande: "Commandes (création / changement de statut)",
  email_message: "Nouveaux messages",
  email_assignation: "Assignations de tâches",
  email_rgpd: "Demandes RGPD",
};

export function NotificationsPanel({ userId }: { userId: string }) {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (data) setPrefs({ ...DEFAULTS, ...(data as Prefs) });
      setLoading(false);
    })();
  }, [userId]);

  const save = async () => {
    setSaving(true);
    setMsg(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("notification_preferences")
      .upsert({ user_id: userId, ...prefs, updated_at: new Date().toISOString() });
    setMsg(error ? "Erreur lors de la sauvegarde" : "Préférences enregistrées");
    setSaving(false);
  };

  if (loading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications email</CardTitle>
      </CardHeader>
      <CardContent>
        {msg && (
          <div
            className={`mb-3 rounded-lg p-3 text-sm ${
              msg.startsWith("Erreur")
                ? "bg-red-50 text-red-600"
                : "bg-green-50 text-green-700"
            }`}
          >
            {msg}
          </div>
        )}
        <div className="space-y-2">
          {(Object.keys(LABELS) as (keyof Prefs)[]).map((k) => (
            <label
              key={k}
              className="flex cursor-pointer items-center justify-between rounded-lg border border-gray-100 px-3 py-2 hover:bg-gray-50"
            >
              <span className="text-sm text-gray-700">{LABELS[k]}</span>
              <input
                type="checkbox"
                checked={prefs[k]}
                onChange={(e) =>
                  setPrefs((p) => ({ ...p, [k]: e.target.checked }))
                }
                className="h-4 w-4 cursor-pointer rounded text-sky-600 focus:ring-sky-500"
              />
            </label>
          ))}
        </div>
        <div className="mt-4">
          <Button onClick={save} isLoading={saving}>
            Sauvegarder les préférences
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
