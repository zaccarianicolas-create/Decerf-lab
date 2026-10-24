import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { extractRequestMeta, logAudit } from "@/lib/audit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const admin = createAdminClient();
  const { data: actor } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (actor?.role !== "admin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { id } = await params;
  const { data: client, error: readError } = await admin
    .from("profiles")
    .select("id, role, numero_inami")
    .eq("id", id)
    .maybeSingle();
  if (readError || !client || client.role !== "dentiste") {
    return NextResponse.json({ error: readError?.message || "Dentiste introuvable." }, { status: 404 });
  }
  if (!client.numero_inami?.trim()) {
    return NextResponse.json({ error: "Aucun numéro INAMI à vérifier." }, { status: 400 });
  }

  const verifiedAt = new Date().toISOString();
  const { error: updateError } = await admin
    .from("profiles")
    .update({
      numero_inami_verifie: true,
      numero_inami_verifie_le: verifiedAt,
      numero_inami_verifie_par: user.id,
    })
    .eq("id", client.id);
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  const meta = extractRequestMeta(request);
  await logAudit({
    actor_id: user.id,
    actor_role: "admin",
    action: "client.inami.verify",
    entity_type: "profile",
    entity_id: client.id,
    metadata: { numero_inami: client.numero_inami, verified_at: verifiedAt },
    ip: meta.ip,
    user_agent: meta.user_agent,
  });

  return NextResponse.json({ success: true, numero_inami_verifie_le: verifiedAt });
}