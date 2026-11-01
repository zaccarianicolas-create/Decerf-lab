import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { POST as issueInvoice } from "@/app/api/dashboard/factures/[id]/valider/route";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { data: profile } = await createAdminClient().from("profiles").select("role, actif, statut_compte").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin" || !profile.actif || profile.statut_compte !== "approuve") return NextResponse.json({ error: "Émission réservée au laboratoire" }, { status: 403 });
  return issueInvoice(request, context);
}