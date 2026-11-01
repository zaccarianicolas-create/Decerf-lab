"use client";

import { useEffect, useState } from "react";
import { Bell, Check, FileText } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { ANNONCE_CATEGORIES, type LabAnnonce } from "@/lib/annonces";
import type { AnnonceCategory } from "@/lib/annonces";
import { AnnonceContent } from "@/components/annonce-content";

export function AnnoncesFeed({ userId, history = false }: { userId: string; history?: boolean }) {
  const [annonces, setAnnonces] = useState<LabAnnonce[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [categories, setCategories] = useState<AnnonceCategory[]>([]);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    const supabase = createClient();
    let mounted = true;
    const load = async () => {
      const [{ data, error }, { data: reads, error: readsError }, categoryResult] = await Promise.all([
        supabase.from("lab_annonces").select("*").eq("statut", "publie").lte("starts_at", new Date().toISOString()).order("starts_at", { ascending: false }),
        supabase.from("lab_annonce_reads").select("annonce_id").eq("user_id", userId),
        supabase.from("lab_annonce_categories").select("*"),
      ]);
      if (!mounted) return;
      if (error || readsError) { setError("Impossible de charger les annonces."); return; }
      const seen = new Set((reads ?? []).map((row) => row.annonce_id));
      const urls: Record<string, string> = {};
      const result = await Promise.all((data ?? []).map(async (annonce) => {
        for (const path of annonce.image_paths ?? []) { const { data } = await supabase.storage.from("annonces").createSignedUrl(path, 3600); if (data) urls[path] = data.signedUrl; }
        const file = annonce.attachment_path ? await supabase.storage.from("annonces").createSignedUrl(annonce.attachment_path, 3600) : null;
        return { ...annonce, read: seen.has(annonce.id), attachment_url: file?.data?.signedUrl ?? null };
      }));
      if (mounted) { setAnnonces(result); setCategories(categoryResult.data ?? []); setImageUrls(urls); setError(null); setNow(Date.now()); }
    };
    void load();
    const channel = supabase.channel(`annonces-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "lab_annonces" }, () => { void load(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "lab_annonce_reads", filter: `user_id=eq.${userId}` }, () => { void load(); }).subscribe();
    const interval = window.setInterval(load, 60000);
    window.addEventListener("focus", load);
    return () => { mounted = false; window.clearInterval(interval); window.removeEventListener("focus", load); void supabase.removeChannel(channel); };
  }, [userId]);
  const markRead = async (annonce: LabAnnonce) => {
    setBusyId(annonce.id);
    const { error } = await createClient().from("lab_annonce_reads").upsert({ annonce_id: annonce.id, user_id: userId }, { onConflict: "annonce_id,user_id", ignoreDuplicates: true });
    if (error) setError("Impossible de marquer cette annonce comme lue.");
    else setAnnonces((current) => current.map((row) => row.id === annonce.id ? { ...row, read: true } : row));
    setBusyId(null);
  };
  const visible = annonces.filter((annonce) => history || !annonce.ends_at || new Date(annonce.ends_at).getTime() > now);
  const categoryLabels = { ...ANNONCE_CATEGORIES, ...Object.fromEntries(categories.map((row) => [row.code, row.label])) };
  const unread = visible.filter((annonce) => !annonce.read).length;
  if (!history && !visible.length && !error) return null;
  return (
    <section className="mb-8 space-y-3" aria-label="Annonces du laboratoire">
      {!history && <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-lg font-semibold"><Bell className="h-5 w-5 text-sky-700" /> Annonces du laboratoire {unread > 0 && <span className="rounded-full bg-sky-600 px-2 py-0.5 text-xs text-white">{unread}</span>}</h2><Link href="/dashboard/annonces" className="text-sm text-sky-700 hover:underline">Historique</Link></div>}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {history && !visible.length && <p className="text-sm text-gray-500">Aucune annonce.</p>}
      {visible.map((annonce) => <article key={annonce.id} className={`rounded-md border p-4 ${categories.find((row) => row.code === annonce.categorie)?.is_closure && !annonce.read ? "border-amber-300 bg-amber-50" : "border-gray-200 bg-white"}`}>
        <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1"><p className="text-xs text-gray-500">{categoryLabels[annonce.categorie] || annonce.categorie} · {new Date(annonce.starts_at).toLocaleDateString("fr-BE")}{annonce.ends_at && ` · Jusqu’au ${new Date(annonce.ends_at).toLocaleDateString("fr-BE")}`}</p><h3 className="mt-1 break-words font-semibold">{annonce.titre}</h3></div>{annonce.read ? <span className="flex items-center gap-1 text-xs text-gray-500"><Check className="h-4 w-4" /> Lue</span> : <button disabled={busyId === annonce.id} onClick={() => markRead(annonce)} className="inline-flex min-h-9 items-center gap-1 rounded-md border border-gray-300 px-2 text-xs disabled:opacity-50"><Check className="h-4 w-4" /> Marquer comme lue</button>}</div>
        <div className="mt-3"><AnnonceContent document={annonce.message_document} text={annonce.message} imageUrls={imageUrls} /></div>
        {annonce.attachment_url && annonce.attachment_name && (annonce.attachment_name.match(/\.(png|jpe?g|webp)$/i)
          ? <a href={annonce.attachment_url} target="_blank" rel="noreferrer"><Image unoptimized src={annonce.attachment_url} alt={annonce.attachment_name} width={800} height={600} className="mt-3 h-auto max-h-80 w-auto max-w-full rounded-md object-contain" /></a>
          : <a href={annonce.attachment_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex max-w-full items-center gap-2 break-all text-sm text-sky-700"><FileText className="h-4 w-4 shrink-0" />{annonce.attachment_name}</a>)}
      </article>)}
    </section>
  );
}