import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const { id } = await params;
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const { data: credit, error } = await admin
    .from("avoirs")
    .select("id, numero, dentiste_id, billit_pdf_storage_path")
    .eq("id", id)
    .maybeSingle();
  if (error || !credit) {
    return NextResponse.json({ error: error?.message || "Avoir introuvable." }, { status: 404 });
  }
  if (credit.dentiste_id !== user.id && profile?.role !== "admin") {
    return NextResponse.json({ error: "Non autorisé." }, { status: 403 });
  }
  if (!credit.billit_pdf_storage_path) {
    return NextResponse.json({ error: "Le PDF Billit n’est pas encore disponible." }, { status: 404 });
  }

  const { data: file, error: downloadError } = await admin.storage
    .from("factures")
    .download(credit.billit_pdf_storage_path);
  if (downloadError || !file) {
    return NextResponse.json({ error: downloadError?.message || "PDF introuvable." }, { status: 404 });
  }

  return new Response(file, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${credit.numero}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
