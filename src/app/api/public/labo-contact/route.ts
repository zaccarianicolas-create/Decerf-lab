import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("parametres_labo")
    .select("nom_labo, email_contact, telephone, adresse, code_postal, ville, pays")
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Coordonnées indisponibles" }, { status: 503 });

  return NextResponse.json({ contact: data });
}
