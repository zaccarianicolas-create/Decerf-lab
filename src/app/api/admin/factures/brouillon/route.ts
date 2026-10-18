import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { createFactureDraft } from "@/lib/facture-workflow";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  if (typeof body.commande_id !== "string") {
    return NextResponse.json({ error: "commande_id requis" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: commande, error } = await admin
    .from("commandes")
    .select("id, statut")
    .eq("id", body.commande_id)
    .maybeSingle();
  if (error || !commande) {
    return NextResponse.json({ error: error?.message || "Commande introuvable" }, { status: 404 });
  }
  if (!["terminee", "livree"].includes(commande.statut)) {
    return NextResponse.json({ error: "Le travail doit être terminé avant de préparer une facture." }, { status: 409 });
  }

  const result = await createFactureDraft(admin, commande.id, user.id);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });

  const { data: facture } = await admin
    .from("factures")
    .select("id, numero, statut")
    .eq("id", result.factureId)
    .single();
  return NextResponse.json({ success: true, facture });
}