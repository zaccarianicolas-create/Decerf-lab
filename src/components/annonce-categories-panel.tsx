"use client";
import { useState } from "react";
import { Plus, Save } from "lucide-react";
import type { AnnonceCategory } from "@/lib/annonces";

export function AnnonceCategoriesPanel({ categories, onChange }: { categories: AnnonceCategory[]; onChange: (category: AnnonceCategory) => void }) {
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState("information");
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async (values: Record<string, unknown>) => {
    setBusy(true); setError(null);
    try { const response = await fetch("/api/admin/annonces/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) }); const result = await response.json(); if (!response.ok) throw new Error(result.error); onChange(result.category); if (!values.code) setLabel(""); }
    catch (error) { setError(error instanceof Error ? error.message : "Enregistrement impossible."); }
    finally { setBusy(false); }
  };
  return <div className="space-y-3 border-y border-gray-200 py-4">
    <div className="flex flex-wrap gap-2"><input aria-label="Nouvelle catégorie" placeholder="Nom de la catégorie" maxLength={80} value={label} onChange={(event) => setLabel(event.target.value)} className="min-w-0 flex-1 rounded-md border px-3 py-2 text-sm" /><select aria-label="Type d’email" value={kind} onChange={(event) => setKind(event.target.value)} className="max-w-full rounded-md border px-3 py-2 text-sm"><option value="information">Information de fonctionnement</option><option value="promotion">Commercial : consentement requis</option></select><button type="button" disabled={busy || !label.trim()} className="inline-flex items-center gap-2 rounded-md bg-sky-600 px-3 py-2 text-sm text-white disabled:opacity-40" onClick={() => save({ label, email_kind: kind })}><Plus className="h-4 w-4" />Ajouter</button></div>
    {categories.map((row) => <div key={row.code} className="flex flex-wrap items-center gap-2"><input aria-label={`Nom de ${row.label}`} value={edits[row.code] ?? row.label} maxLength={80} onChange={(event) => setEdits((current) => ({ ...current, [row.code]: event.target.value }))} className="min-w-0 flex-1 rounded-md border px-3 py-2 text-sm" /><span className="text-xs text-gray-500">{row.email_kind === "promotion" ? "Commercial" : "Information"}</span><label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={row.actif} disabled={busy} onChange={(event) => save({ code: row.code, label: row.label, actif: event.target.checked })} />Active</label><button type="button" title="Enregistrer le nom" aria-label={`Enregistrer ${row.label}`} disabled={busy} onClick={() => save({ code: row.code, label: edits[row.code] ?? row.label })} className="rounded-md p-2 text-gray-600 hover:bg-gray-100"><Save className="h-4 w-4" /></button></div>)}
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
  </div>;
}