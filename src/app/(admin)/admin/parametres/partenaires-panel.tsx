"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowDown, ArrowUp, ExternalLink, Pencil, Plus, Save, Trash2, Upload, X } from "lucide-react";

export type Partenaire = {
  id: string;
  slug: string;
  nom: string;
  logo_path: string | null;
  site_url: string | null;
  ordre: number;
  actif: boolean;
};

type FormState = {
  nom: string;
  site_url: string;
  ordre: string;
  actif: boolean;
};

const emptyForm: FormState = { nom: "", site_url: "", ordre: "0", actif: true };
const partnerFields = "id, slug, nom, logo_path, site_url, ordre, actif";

function createSlug(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  return trimmed && !/^https?:\/\//i.test(trimmed) ? `https://${trimmed}` : trimmed;
}

export function PartenairesPanel({ initial }: { initial: Partenaire[] }) {
  const supabase = createClient();
  const [partners, setPartners] = useState(initial);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({ ...emptyForm, ordre: String(initial.length) });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const resetForm = (nextOrder = partners.length) => {
    setEditingId(null);
    setForm({ ...emptyForm, ordre: String(nextOrder) });
    setLogoFile(null);
  };

  const startEdit = (partner: Partenaire) => {
    setEditingId(partner.id);
    setForm({
      nom: partner.nom,
      site_url: partner.site_url ?? "",
      ordre: String(partner.ordre),
      actif: partner.actif,
    });
    setLogoFile(null);
    setMessage(null);
  };

  const loadPartners = async (): Promise<Partenaire[] | null> => {
    const { data, error } = await supabase
      .from("partenaires")
      .select(partnerFields)
      .order("ordre", { ascending: true })
      .order("nom", { ascending: true });
    if (error) {
      setMessage(`Erreur : ${error.message}`);
      return null;
    }
    const refreshed = (data ?? []) as Partenaire[];
    setPartners(refreshed);
    return refreshed;
  };

  const savePartner = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nom = form.nom.trim();
    if (!nom) {
      setMessage("Le nom du partenaire est obligatoire.");
      return;
    }

    setSaving(true);
    setMessage(null);
    const previousLogoPath = editingId ? partners.find((partner) => partner.id === editingId)?.logo_path ?? null : null;
    let logoPath = previousLogoPath;

    if (logoFile) {
      if (logoFile.size > 5 * 1024 * 1024) {
        setMessage("Le logo ne peut pas dépasser 5 Mo.");
        setSaving(false);
        return;
      }
      if (!["image/png", "image/jpeg", "image/webp"].includes(logoFile.type)) {
        setMessage("Choisis un logo au format PNG, JPG ou WebP.");
        setSaving(false);
        return;
      }
      const extension = logoFile.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "png";
      const path = `partenaires/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("branding")
        .upload(path, logoFile, { upsert: false, contentType: logoFile.type, cacheControl: "31536000" });
      if (uploadError) {
        setMessage(`Erreur d’envoi du logo : ${uploadError.message}`);
        setSaving(false);
        return;
      }
      logoPath = path;
    }

    const payload = {
      nom,
      slug: createSlug(nom),
      site_url: normalizeUrl(form.site_url) || null,
      ordre: Number(form.ordre) || 0,
      actif: form.actif,
      logo_path: logoPath,
      updated_at: new Date().toISOString(),
    };
    const result = editingId
      ? await supabase.from("partenaires").update(payload).eq("id", editingId)
      : await supabase.from("partenaires").insert(payload);

    if (result.error) {
      setMessage(`Erreur : ${result.error.message}`);
      setSaving(false);
      return;
    }

    if (logoFile && previousLogoPath && !previousLogoPath.startsWith("/") && !/^https?:\/\//i.test(previousLogoPath)) {
      await supabase.storage.from("branding").remove([previousLogoPath]);
    }

    const refreshed = await loadPartners();
    resetForm(refreshed?.length ?? partners.length);
    setMessage("Partenaire enregistré.");
    setSaving(false);
  };

  const removePartner = async (partner: Partenaire) => {
    if (!window.confirm(`Supprimer ${partner.nom} de la liste des partenaires ?`)) return;
    const { error } = await supabase.from("partenaires").delete().eq("id", partner.id);
    if (error) {
      setMessage(`Erreur : ${error.message}`);
      return;
    }
    if (partner.logo_path && !partner.logo_path.startsWith("/") && !/^https?:\/\//i.test(partner.logo_path)) {
      await supabase.storage.from("branding").remove([partner.logo_path]);
    }
    setPartners((current) => current.filter((entry) => entry.id !== partner.id));
    if (editingId === partner.id) resetForm(Math.max(0, partners.length - 1));
    setMessage("Partenaire supprimé.");
  };

  const movePartner = async (partner: Partenaire, direction: -1 | 1) => {
    const sorted = [...partners].sort((a, b) => a.ordre - b.ordre || a.nom.localeCompare(b.nom));
    const index = sorted.findIndex((entry) => entry.id === partner.id);
    const other = sorted[index + direction];
    if (!other) return;
    const updates = await Promise.all([
      supabase.from("partenaires").update({ ordre: other.ordre }).eq("id", partner.id),
      supabase.from("partenaires").update({ ordre: partner.ordre }).eq("id", other.id),
    ]);
    if (updates.some(({ error }) => error)) {
      setMessage("Impossible de modifier l’ordre des partenaires.");
      return;
    }
    await loadPartners();
  };

  const logoUrl = (path: string) => path.startsWith("/") || /^https?:\/\//i.test(path)
    ? path
    : supabase.storage.from("branding").getPublicUrl(path).data.publicUrl;

  return (
    <section className="mt-10 space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Partenaires</h2>
        <p className="mt-1 text-sm text-gray-500">Logos et liens affichés sur la page d’accueil.</p>
      </div>

      <div className="divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white">
        {partners.length === 0 ? (
          <p className="p-5 text-sm text-gray-500">Aucun partenaire enregistré.</p>
        ) : (
          partners.map((partner, index) => (
            <div key={partner.id} className="flex flex-wrap items-center gap-4 p-4">
              <div className="flex h-14 w-36 shrink-0 items-center justify-center rounded-lg bg-white px-2">
                {partner.logo_path ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl(partner.logo_path)} alt={`Logo ${partner.nom}`} className="max-h-12 max-w-full object-contain" />
                ) : (
                  <span className="text-lg font-semibold tracking-tight text-slate-800">{partner.nom}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900">{partner.nom}</p>
                <p className="truncate text-sm text-gray-500">{partner.site_url || "Aucun site associé"}</p>
                <p className="mt-1 text-xs text-gray-400">{partner.actif ? "Publié" : "Masqué"} · Position {partner.ordre + 1}</p>
              </div>
              <div className="flex items-center gap-1">
                <Button type="button" size="icon" variant="ghost" onClick={() => void movePartner(partner, -1)} disabled={index === 0} aria-label={`Monter ${partner.nom}`} title="Monter">
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button type="button" size="icon" variant="ghost" onClick={() => void movePartner(partner, 1)} disabled={index === partners.length - 1} aria-label={`Descendre ${partner.nom}`} title="Descendre">
                  <ArrowDown className="h-4 w-4" />
                </Button>
                {partner.site_url && <a href={partner.site_url} target="_blank" rel="noreferrer" aria-label={`Ouvrir le site de ${partner.nom}`} className="rounded-md p-2 text-gray-600 hover:bg-gray-100"><ExternalLink className="h-4 w-4" /></a>}
                <Button type="button" size="icon" variant="ghost" onClick={() => startEdit(partner)} aria-label={`Modifier ${partner.nom}`} title="Modifier">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button type="button" size="icon" variant="ghost" onClick={() => void removePartner(partner)} aria-label={`Supprimer ${partner.nom}`} title="Supprimer">
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={savePartner} className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold text-gray-900">{editingId ? "Modifier le partenaire" : "Ajouter un partenaire"}</h3>
          {editingId && <Button type="button" size="sm" variant="ghost" onClick={() => resetForm()}><X className="mr-1 h-4 w-4" /> Annuler</Button>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Nom" value={form.nom} onChange={(event) => setForm({ ...form, nom: event.target.value })} required placeholder="Nom du partenaire" />
          <Input label="Site web" type="url" value={form.site_url} onChange={(event) => setForm({ ...form, site_url: event.target.value })} placeholder="https://exemple.be" />
          <Input label="Ordre d’affichage" type="number" value={form.ordre} onChange={(event) => setForm({ ...form, ordre: event.target.value })} />
          <label className="flex items-center gap-2 self-end pb-2 text-sm text-gray-700"><input type="checkbox" checked={form.actif} onChange={(event) => setForm({ ...form, actif: event.target.checked })} /> Visible sur le site</label>
        </div>
        <label className="flex flex-wrap items-center gap-3 text-sm text-gray-700">
          <span className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2"><Upload className="h-4 w-4" /> Choisir un logo</span>
          <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)} className="sr-only" />
          <span className="text-xs text-gray-500">{logoFile?.name || "PNG, JPG, WebP ou SVG · 5 Mo maximum"}</span>
        </label>
        {message && <p role="status" className={`text-sm ${message.startsWith("Erreur") || message.startsWith("Le logo") || message.startsWith("Choisis") ? "text-red-700" : "text-emerald-700"}`}>{message}</p>}
        <Button type="submit" disabled={saving} className="gap-2"><Save className="h-4 w-4" />{saving ? "Enregistrement…" : editingId ? "Enregistrer les modifications" : <><Plus className="h-4 w-4" /> Ajouter le partenaire</>}</Button>
      </form>
    </section>
  );
}
