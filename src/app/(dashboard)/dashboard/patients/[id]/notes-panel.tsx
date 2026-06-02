"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, FileText } from "lucide-react";

export type ClinicalNote = {
  id: string;
  date_note: string;
  titre: string | null;
  contenu: string;
  type: string;
  created_at: string;
};

const TYPES = ["observation", "examen", "prescription", "suivi"];

export function NotesCliniquesPanel({
  patientId,
  initialNotes,
}: {
  patientId: string;
  initialNotes: ClinicalNote[];
}) {
  const supabase = createClient();
  const [notes, setNotes] = useState(initialNotes);
  const [form, setForm] = useState({
    date_note: new Date().toISOString().slice(0, 10),
    titre: "",
    contenu: "",
    type: "observation",
  });
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const add = async () => {
    if (!form.contenu.trim()) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return setSaving(false);
    const { data, error } = await supabase
      .from("patient_notes_cliniques")
      .insert({
        patient_id: patientId,
        dentiste_id: user.id,
        date_note: form.date_note,
        titre: form.titre || null,
        contenu: form.contenu,
        type: form.type,
      })
      .select("*")
      .single();
    setSaving(false);
    if (!error && data) {
      setNotes([data as ClinicalNote, ...notes]);
      setForm({
        date_note: new Date().toISOString().slice(0, 10),
        titre: "",
        contenu: "",
        type: "observation",
      });
      setShowForm(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer cette note ?")) return;
    const { error } = await supabase
      .from("patient_notes_cliniques")
      .delete()
      .eq("id", id);
    if (!error) setNotes(notes.filter((n) => n.id !== id));
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold text-gray-900">
            <FileText className="h-4 w-4 text-sky-600" />
            Notes cliniques ({notes.length})
          </h2>
          <Button
            variant={showForm ? "outline" : "default"}
            size="sm"
            onClick={() => setShowForm(!showForm)}
          >
            <Plus className="mr-1 h-4 w-4" />
            {showForm ? "Annuler" : "Nouvelle note"}
          </Button>
        </div>

        {showForm && (
          <div className="mb-4 space-y-3 rounded-lg border border-sky-100 bg-sky-50/30 p-4">
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                value={form.date_note}
                onChange={(e) =>
                  setForm({ ...form, date_note: e.target.value })
                }
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <input
              placeholder="Titre (optionnel)"
              value={form.titre}
              onChange={(e) => setForm({ ...form, titre: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <textarea
              placeholder="Contenu de la note..."
              value={form.contenu}
              onChange={(e) => setForm({ ...form, contenu: e.target.value })}
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <Button onClick={add} isLoading={saving} size="sm">
              Enregistrer
            </Button>
          </div>
        )}

        {notes.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">
            Aucune note clinique pour ce patient.
          </p>
        ) : (
          <div className="space-y-3">
            {notes.map((n) => (
              <div
                key={n.id}
                className="rounded-lg border border-gray-200 p-3 hover:bg-gray-50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="rounded bg-sky-100 px-2 py-0.5 font-medium text-sky-700">
                      {n.type}
                    </span>
                    <span>
                      {new Date(n.date_note).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                  <button
                    onClick={() => remove(n.id)}
                    className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                {n.titre && (
                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {n.titre}
                  </p>
                )}
                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">
                  {n.contenu}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
