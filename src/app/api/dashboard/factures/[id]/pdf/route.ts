import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const admin = createAdminClient();
  const { data: facture, error } = await admin
    .from("factures")
    .select("pdf_storage_path")
    .eq("id", id)
    .eq("dentiste_id", user.id)
    .maybeSingle();
  if (error || !facture?.pdf_storage_path) {
    return NextResponse.json({ error: error?.message || "PDF introuvable." }, { status: 404 });
  }

  const { data, error: signedUrlError } = await admin.storage
    .from("factures")
    .createSignedUrl(facture.pdf_storage_path, 60);
  if (signedUrlError || !data?.signedUrl) {
    return NextResponse.json({ error: signedUrlError?.message || "PDF indisponible." }, { status: 500 });
  }
  return NextResponse.redirect(data.signedUrl);
}