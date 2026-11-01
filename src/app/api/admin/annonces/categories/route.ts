import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role, actif, statut_compte").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin" || !profile.actif || profile.statut_compte !== "approuve") return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.label !== "string" || !body.label.trim() || body.label.trim().length > 80
    || (!body.code && !["information", "promotion"].includes(body.email_kind))) return NextResponse.json({ error: "Catégorie invalide." }, { status: 400 });
  const query = body.code
    ? supabase.from("lab_annonce_categories").update({ label: body.label.trim(), ...(typeof body.actif === "boolean" ? { actif: body.actif } : {}) }).eq("code", body.code)
    : supabase.from("lab_annonce_categories").insert({ code: `custom_${crypto.randomUUID()}`, label: body.label.trim(), email_kind: body.email_kind });
  const { data, error } = await query.select("*").single();
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ category: data });
}