import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { createCertificatPdf } from "@/lib/certificat-pdf";
import { getCertificatLogo } from "@/lib/certificat-logo";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const body = await request.json().catch(() => null) as {
    contenu?: unknown;
    numero?: unknown;
    demo?: unknown;
  } | null;
  if (typeof body?.contenu !== "string" || !body.contenu.trim() || body.contenu.length > 50_000) {
    return NextResponse.json({ error: "Le contenu de l’aperçu est invalide." }, { status: 400 });
  }
  const numero = typeof body.numero === "string" && body.numero.trim()
    ? body.numero.trim().slice(0, 80)
    : "APERÇU — NUMÉRO PROVISOIRE";

  const bytes = await createCertificatPdf(body.contenu, numero, {
    logoBytes: await getCertificatLogo(),
    preview: body.demo === true,
  });
  const responseBuffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(responseBuffer).set(bytes);
  return new Response(responseBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline; filename=certificate-preview.pdf",
      "Cache-Control": "private, no-store",
    },
  });
}
