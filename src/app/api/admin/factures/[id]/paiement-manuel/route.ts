import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
  const montant = Number(body.montant);
  if (!Number.isFinite(montant) || montant <= 0) {
    return NextResponse.json({ error: "Montant invalide." }, { status: 400 });
  }

  const { id } = await params;
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("enregistrer_paiement_facture", {
    p_facture_id: id,
    p_admin_id: user.id,
    p_montant: montant,
    p_reference: typeof body.reference === "string" ? body.reference : "",
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true, ...data });
}