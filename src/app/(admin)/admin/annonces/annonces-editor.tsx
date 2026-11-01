"use client";

import { useState } from "react";
import { Archive, Edit3, FileText, Save, Send, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ANNONCE_CATEGORIES, type LabAnnonce } from "@/lib/annonces";

const localDate = (value = new Date().toISOString()) => {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export function AnnoncesEditor({ initial, userId }: { initial: LabAnnonce[]; userId: string }) {
  const [annonces, setAnnonces] = useState(initial);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<LabAnnonce["categorie"]>("information");
  const [start, setStart] = useState(localDate);
  const [end, setEnd] = useState("");
  const [sendEmail, setSendEmail] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const reset = () => { setEditingId(null); setTitle(""); setMessage(""); setCategory("information"); setStart(localDate()); setEnd(""); setSendEmail(false); setFile(null); };

  const save = async (status: "brouillon" | "publie") => {
    if (!title.trim() || !message.trim() || !start) { setError("Renseigne le titre, le message et la date de publication."); return; }
    setBusy(true); setError(null); setSuccess(null);
    try {
      const current = annonces.find((annonce) => annonce.id === editingId);
      let path = current?.attachment_path ?? null;
      let name = current?.attachment_name ?? null;
      if (file) {
        if (file.size > 5 * 1024 * 1024 || !["image/png", "image/jpeg", "image/webp", "application/pdf"].includes(file.type)) throw new Error("Pièce jointe : image ou PDF de 5 Mo maximum.");
        path = `${userId}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error } = await createClient().storage.from("annonces").upload(path, file, { contentType: file.type });
        if (error) throw new Error(error.message);
        name = file.name;
      }
      const response = await fetch("/api/admin/annonces", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        id: editingId, titre: title, message, categorie: category, statut: status,
        starts_at: new Date(start).toISOString(), ends_at: end ? new Date(end).toISOString() : null,
        send_email: sendEmail, attachment_path: path, attachment_name: name,
      }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setAnnonces((current) => [result.annonce, ...current.filter((annonce) => annonce.id !== result.annonce.id)]);
      setSuccess(status === "brouillon" ? "Brouillon enregistré." : new Date(start) > new Date() ? "Publication programmée." : "Annonce publiée.");
      reset();
    } catch (error) { setError(error instanceof Error ? error.message : "Enregistrement impossible."); }
    finally { setBusy(false); }
  };

  const archive = async (id: string) => {
    setBusy(true); setError(null);
    try {
      const response = await fetch("/api/admin/annonces", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setAnnonces((current) => current.map((annonce) => annonce.id === id ? { ...annonce, statut: "archive" } : annonce));
    } catch (error) { setError(error instanceof Error ? error.message : "Archivage impossible."); }
    finally { setBusy(false); }
  };
  const field = "mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm";
  const button = "inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-gray-300 px-3 text-sm disabled:opacity-50";
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Annonces du laboratoire</h1>
      <section className="space-y-4 border-b border-gray-200 pb-8">
        <h2 className="text-lg font-semibold">{editingId ? "Modifier le brouillon" : "Nouvelle annonce"}</h2>
        <label className="block text-sm font-medium">Titre<input className={field} maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
        <label className="block text-sm font-medium">Message<textarea className={field} rows={5} maxLength={8000} value={message} onChange={(event) => setMessage(event.target.value)} /></label>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="block text-sm font-medium">Catégorie<select className={field} value={category} onChange={(event) => setCategory(event.target.value as LabAnnonce["categorie"])}>{Object.entries(ANNONCE_CATEGORIES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="block min-w-0 text-sm font-medium">Publication<input className={field} type="datetime-local" value={start} onChange={(event) => setStart(event.target.value)} /></label>
          <label className="block min-w-0 text-sm font-medium">Fin de diffusion<input className={field} type="datetime-local" value={end} min={start} onChange={(event) => setEnd(event.target.value)} /></label>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={sendEmail} onChange={(event) => setSendEmail(event.target.checked)} /> Envoyer également par email aux dentistes qui ont activé cette catégorie</label>
        <label className="block text-sm font-medium">Image ou PDF (5 Mo maximum)<input className="mt-2 block w-full min-w-0 text-sm" type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label>
        <div className="flex flex-wrap gap-2">
          <button className={button} disabled={busy} onClick={() => save("brouillon")}><Save className="h-4 w-4" /> Enregistrer le brouillon</button>
          <button className={`${button} border-sky-600 bg-sky-600 text-white`} disabled={busy} onClick={() => save("publie")}><Send className="h-4 w-4" /> Publier / programmer</button>
          {editingId && <button className={button} onClick={reset} disabled={busy}><X className="h-4 w-4" /> Annuler</button>}
        </div>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        {success && <p role="status" className="text-sm text-green-700">{success}</p>}
      </section>
      <section>
        <h2 className="mb-3 text-lg font-semibold">Historique des annonces</h2>
        {!annonces.length && <p className="text-sm text-gray-500">Aucune annonce.</p>}
        <div className="divide-y divide-gray-200">{annonces.map((annonce) => <div key={annonce.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
          <div className="min-w-0 flex-1"><p className="break-words font-medium">{annonce.titre}</p><p className="text-xs text-gray-500">{ANNONCE_CATEGORIES[annonce.categorie]} · {annonce.statut === "brouillon" ? "Brouillon" : annonce.statut === "archive" ? "Archivée" : new Date(annonce.starts_at) > new Date() ? "Programmée" : annonce.ends_at && new Date(annonce.ends_at) <= new Date() ? "Terminée" : "Publiée"} · {new Date(annonce.starts_at).toLocaleString("fr-BE")}</p>{annonce.attachment_name && <p className="mt-1 flex items-center gap-1 break-all text-xs text-gray-500"><FileText className="h-3 w-3 shrink-0" />{annonce.attachment_name}</p>}</div>
          <div className="flex gap-2">{annonce.statut === "brouillon" && <button className={button} disabled={busy} title="Modifier le brouillon" aria-label="Modifier le brouillon" onClick={() => { setEditingId(annonce.id); setTitle(annonce.titre); setMessage(annonce.message); setCategory(annonce.categorie); setStart(localDate(annonce.starts_at)); setEnd(annonce.ends_at ? localDate(annonce.ends_at) : ""); setSendEmail(annonce.send_email); setFile(null); }}><Edit3 className="h-4 w-4" /></button>}{annonce.statut !== "archive" && <button className={button} disabled={busy} title="Archiver" aria-label="Archiver" onClick={() => archive(annonce.id)}><Archive className="h-4 w-4" /></button>}</div>
        </div>)}</div>
      </section>
    </div>
  );
}