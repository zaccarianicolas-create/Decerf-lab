import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Non authentifié" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const { id } = await params;
  const { data: certificate, error } = await admin
    .from("certificats_conformite")
    .select("id, numero_certificat, statut, dentiste_id, pdf_storage_bucket, pdf_storage_path")
    .eq("id", id)
    .maybeSingle();

  if (error || !certificate) {
    return Response.json({ error: error?.message || "Fiche introuvable." }, { status: 404 });
  }
  const isAdmin = profile?.role === "admin";
  if (!isAdmin && certificate.dentiste_id !== user.id) {
    return Response.json({ error: "Non autorisé" }, { status: 403 });
  }
  if (!isAdmin && certificate.statut !== "envoye") {
    return Response.json({ error: "Le PDF n’a pas encore été mis à disposition." }, { status: 404 });
  }
  if (!(["emis", "envoye"].includes(certificate.statut) && certificate.pdf_storage_path)) {
    return Response.json({ error: "Le PDF n’est pas encore disponible." }, { status: 404 });
  }

  const { data: file, error: downloadError } = await admin.storage
    .from(certificate.pdf_storage_bucket || "certificats")
    .download(certificate.pdf_storage_path);
  if (downloadError || !file) {
    return Response.json({ error: downloadError?.message || "PDF indisponible." }, { status: 500 });
  }

  return new Response(file, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${certificate.numero_certificat}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
