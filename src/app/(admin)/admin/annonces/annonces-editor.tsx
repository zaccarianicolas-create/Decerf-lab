"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { Archive, Edit3, FileText, Save, Send, X, Eye, Settings2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ANNONCE_CATEGORIES as DEFAULT_LABELS, type LabAnnonce, type AnnonceCategory } from "@/lib/annonces";
import { plainAnnouncementDocument, announcementPlainText, type AnnouncementNode } from "@/lib/annonce-document.mjs";
import { AnnonceRichEditor } from "@/components/annonce-rich-editor";
import { AnnonceContent } from "@/components/annonce-content";
import { AnnonceCategoriesPanel } from "@/components/annonce-categories-panel";

const localDate = (value = new Date().toISOString()) => {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export function AnnoncesEditor({ initial, initialCategories, userId }: { initial: LabAnnonce[]; initialCategories: AnnonceCategory[]; userId: string }) {
  const [annonces, setAnnonces] = useState(initial);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [document, setDocument] = useState<AnnouncementNode>(() => plainAnnouncementDocument(""));
  const [formVersion, setFormVersion] = useState(0);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState(false);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [categories, setCategories] = useState(initialCategories);
  const [manageCategories, setManageCategories] = useState(false);
  const [contentValid, setContentValid] = useState(true);
  const ANNONCE_CATEGORIES = { ...DEFAULT_LABELS, ...Object.fromEntries(categories.map((row) => [row.code, row.label])) };
  const receiveImages = useCallback((urls: Record<string, string>) => setImageUrls((current) => ({ ...current, ...urls })), []);
  const [category, setCategory] = useState<LabAnnonce["categorie"]>("information");
  const [start, setStart] = useState(localDate);
  const [end, setEnd] = useState("");
  const [sendEmail, setSendEmail] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const reset = () => { setEditingId(null); setTitle(""); setMessage(""); setDocument(plainAnnouncementDocument("")); setFormVersion((value) => value + 1); setImageUrls({}); setPreview(false); setAttachmentPreview(null); setCategory("information"); setStart(localDate()); setEnd(""); setSendEmail(false); setFile(null); };
  const editDraft = (annonce: LabAnnonce) => { setEditingId(annonce.id); setTitle(annonce.titre); setMessage(annonce.message); setDocument(annonce.message_document || plainAnnouncementDocument(annonce.message)); setFormVersion((value) => value + 1); setImageUrls({}); setPreview(false); setAttachmentPreview(null); setCategory(annonce.categorie); setStart(localDate(annonce.starts_at)); setEnd(annonce.ends_at ? localDate(annonce.ends_at) : ""); setSendEmail(annonce.send_email); setFile(null); };

  const save = async (status: "brouillon" | "publie") => {
    if (!contentValid) { setError("Corrige le contenu ou attends la fin de l’ajout d’image."); return; }
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
        id: editingId, titre: title, message, message_document: document, categorie: category, statut: status,
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
        <div className="space-y-2"><p className="text-sm font-medium">Message</p><AnnonceRichEditor key={formVersion} initialDocument={document} userId={userId} onChange={(value) => { setDocument(value); setMessage(announcementPlainText(value)); }} onImages={receiveImages} onValidityChange={setContentValid} /></div>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="block text-sm font-medium">Catégorie<select className={field} value={category} onChange={(event) => setCategory(event.target.value)}>{categories.filter((row) => row.actif || row.code === category).map((row) => <option key={row.code} value={row.code}>{row.label}</option>)}</select></label>
          <label className="block min-w-0 text-sm font-medium">Publication<input className={field} type="datetime-local" value={start} onChange={(event) => setStart(event.target.value)} /></label>
          <label className="block min-w-0 text-sm font-medium">Fin de diffusion<input className={field} type="datetime-local" value={end} min={start} onChange={(event) => setEnd(event.target.value)} /></label>
        </div>
        <button type="button" className={button} onClick={() => setManageCategories((value) => !value)}><Settings2 className="h-4 w-4" />Gérer les catégories</button>
        {manageCategories && <AnnonceCategoriesPanel categories={categories} onChange={(row) => setCategories((current) => [...current.filter((value) => value.code !== row.code), row])} />}
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={sendEmail} onChange={(event) => setSendEmail(event.target.checked)} /> Envoyer également par email aux dentistes qui ont activé cette catégorie</label>
        <label className="block text-sm font-medium">Pièce jointe en bas de l’annonce (image ou PDF, 5 Mo maximum)<input className="mt-2 block w-full min-w-0 text-sm" type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setAttachmentPreview(null); }} /></label>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={button} disabled={busy} onClick={async () => { if (file) { const reader = new FileReader(); reader.onload = () => setAttachmentPreview(String(reader.result)); reader.readAsDataURL(file); } else { const path = annonces.find((row) => row.id === editingId)?.attachment_path; if (path) { const { data } = await createClient().storage.from("annonces").createSignedUrl(path, 3600); setAttachmentPreview(data?.signedUrl ?? null); } } setPreview(true); }}><Eye className="h-4 w-4" />Aperçu avant publication</button>
          <button className={button} disabled={busy || !contentValid} onClick={() => save("brouillon")}><Save className="h-4 w-4" /> Enregistrer le brouillon</button>
          <button className={`${button} border-sky-600 bg-sky-600 text-white`} disabled={busy || !contentValid} onClick={() => save("publie")}><Send className="h-4 w-4" /> Publier / programmer</button>
          {editingId && <button className={button} onClick={reset} disabled={busy}><X className="h-4 w-4" /> Annuler</button>}
        </div>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        {success && <p role="status" className="text-sm text-green-700">{success}</p>}
      </section>
      {preview && <section className="space-y-3 border-b border-gray-200 pb-6" aria-label="Aperçu de l’annonce"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Aperçu dentiste</h2><button type="button" className={button} onClick={() => setPreview(false)} title="Fermer l’aperçu" aria-label="Fermer l’aperçu"><X className="h-4 w-4" /></button></div><article className={`rounded-md border p-4 ${categories.find((row) => row.code === category)?.is_closure ? "border-amber-300 bg-amber-50" : "border-gray-200 bg-white"}`}><p className="text-xs text-gray-500">{ANNONCE_CATEGORIES[category]}</p><h3 className="mb-3 mt-1 break-words font-semibold">{title || "Sans titre"}</h3><AnnonceContent document={document} text={message} imageUrls={imageUrls} />{attachmentPreview && (file?.type.startsWith("image/") || (!file && annonces.find((row) => row.id === editingId)?.attachment_name?.match(/\.(png|jpe?g|webp)$/i)) ? <Image unoptimized src={attachmentPreview} width={800} height={600} alt={file?.name || "Pièce jointe"} className="mt-3 h-auto max-h-80 w-auto max-w-full rounded-md object-contain" /> : <a className="mt-3 inline-flex items-center gap-2 text-sm text-sky-700" href={attachmentPreview} target="_blank" rel="noreferrer"><FileText className="h-4 w-4" />{file?.name || "Pièce jointe PDF"}</a>)}</article></section>}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Historique des annonces</h2>
        {!annonces.length && <p className="text-sm text-gray-500">Aucune annonce.</p>}
        <div className="divide-y divide-gray-200">{annonces.map((annonce) => <div key={annonce.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
          <div className="min-w-0 flex-1"><p className="break-words font-medium">{annonce.titre}</p><p className="text-xs text-gray-500">{ANNONCE_CATEGORIES[annonce.categorie]} · {annonce.statut === "brouillon" ? "Brouillon" : annonce.statut === "archive" ? "Archivée" : new Date(annonce.starts_at) > new Date() ? "Programmée" : annonce.ends_at && new Date(annonce.ends_at) <= new Date() ? "Terminée" : "Publiée"} · {new Date(annonce.starts_at).toLocaleString("fr-BE")}</p>{annonce.attachment_name && <p className="mt-1 flex items-center gap-1 break-all text-xs text-gray-500"><FileText className="h-3 w-3 shrink-0" />{annonce.attachment_name}</p>}</div>
          <div className="flex gap-2">{annonce.statut === "brouillon" && <button className={button} disabled={busy} title="Modifier le brouillon" aria-label="Modifier le brouillon" onClick={() => editDraft(annonce)}><Edit3 className="h-4 w-4" /></button>}{annonce.statut !== "archive" && <button className={button} disabled={busy} title="Archiver" aria-label="Archiver" onClick={() => archive(annonce.id)}><Archive className="h-4 w-4" /></button>}</div>
        </div>)}</div>
      </section>
    </div>
  );
}