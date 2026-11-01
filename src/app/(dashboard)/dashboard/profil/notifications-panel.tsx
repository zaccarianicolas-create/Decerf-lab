"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DEFAULT_NOTIFICATION_PREFERENCES as DEFAULTS, NOTIFICATION_LABELS as LABELS, type NotificationPreferences as Prefs } from "@/lib/notification-preferences";

export function NotificationsPanel({ userId }: { userId: string }) {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) { setLoadFailed(true); setMsg("Erreur de chargement des préférences. Réessaie après rechargement."); }
      if (data) setPrefs(Object.fromEntries(Object.keys(DEFAULTS).map((key) => [key, data[key] ?? DEFAULTS[key as keyof Prefs]])) as Prefs);
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
              <span className="min-w-0 text-sm text-gray-700">{LABELS[k]}</span>
              <input
                type="checkbox"
                checked={prefs[k]}
                onChange={(e) =>
                  setPrefs((p) => ({ ...p, [k]: e.target.checked }))
                }
                className="ml-3 h-4 w-4 shrink-0 cursor-pointer rounded text-sky-600 focus:ring-sky-500"
              />
            </label>
          ))}
        </div>
        <div className="mt-4">
          <Button onClick={save} isLoading={saving} disabled={loadFailed}>
            Sauvegarder les préférences
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
