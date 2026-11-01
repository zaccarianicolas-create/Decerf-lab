import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeAnnouncementDocument, announcementPlainText, announcementImagePaths } from "@/lib/annonce-document.mjs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("role, actif, statut_compte").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin" || !profile.actif || profile.statut_compte !== "approuve") return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.titre !== "string" || !body.titre.trim() || body.titre.trim().length > 160
    || typeof body.message !== "string" || !body.message.trim() || body.message.trim().length > 8000
    || typeof body.categorie !== "string" || !["brouillon", "publie"].includes(body.statut)
    || typeof body.send_email !== "boolean") return NextResponse.json({ error: "Annonce invalide" }, { status: 400 });
  const start = new Date(body.starts_at);
  const { data: category } = await admin.from("lab_annonce_categories").select("actif").eq("code", body.categorie).maybeSingle();
  if (!category?.actif) return NextResponse.json({ error: "Catégorie indisponible." }, { status: 400 });
  let document = null;
  try { if (body.message_document) document = normalizeAnnouncementDocument(body.message_document); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Message invalide" }, { status: 400 }); }
  const text = document ? announcementPlainText(document) : body.message.trim();
  if (!text || text.length > 8000) return NextResponse.json({ error: "Message vide ou trop long." }, { status: 400 });
  const imagePaths = announcementImagePaths(document);
  const { data: previous } = body.id ? await admin.from("lab_annonces").select("image_paths").eq("id", body.id).maybeSingle() : { data: null };
  if (imagePaths.some((path) => !path.startsWith(`${user.id}/`) && !previous?.image_paths?.includes(path))) return NextResponse.json({ error: "Image non autorisée." }, { status: 400 });
  for (const path of imagePaths) {
    const { data: file, error } = await admin.storage.from("annonces").info(path);
    if (error || !file?.contentType?.startsWith("image/")) return NextResponse.json({ error: "Image introuvable." }, { status: 400 });
  }
  const end = body.ends_at ? new Date(body.ends_at) : null;
  if (!Number.isFinite(start.getTime()) || (end && (!Number.isFinite(end.getTime()) || end <= start))) return NextResponse.json({ error: "Dates invalides" }, { status: 400 });
  if (body.attachment_path && (typeof body.attachment_path !== "string" || !body.attachment_path.startsWith(`${user.id}/`)
    || body.attachment_path.includes("..") || typeof body.attachment_name !== "string" || !body.attachment_name)) return NextResponse.json({ error: "Pièce jointe invalide" }, { status: 400 });
  const values = { titre: body.titre.trim(), message: text, message_document: document, categorie: body.categorie,
    statut: body.statut, starts_at: start.toISOString(), ends_at: end?.toISOString() ?? null,
    send_email: body.send_email, attachment_path: body.attachment_path || null, attachment_name: body.attachment_path ? body.attachment_name : null };
  if (body.id) {
    const { data: existing } = await admin.from("lab_annonces").select("statut").eq("id", body.id).maybeSingle();
    if (!existing || existing.statut !== "brouillon") return NextResponse.json({ error: "Seul un brouillon peut être modifié." }, { status: 409 });
  }
  const query = body.id
    ? admin.from("lab_annonces").update(values).eq("id", body.id).eq("statut", "brouillon")
    : admin.from("lab_annonces").insert({ ...values, created_by: user.id });
  const { data, error } = await query.select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ annonce: data });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("role, actif, statut_compte").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin" || !profile.actif || profile.statut_compte !== "approuve") return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (typeof body?.id !== "string") return NextResponse.json({ error: "Annonce invalide" }, { status: 400 });
  const { error } = await admin.from("lab_annonces").update({ statut: "archive" }).eq("id", body.id);
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ ok: true });
}