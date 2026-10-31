import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getParametresLabo } from "@/lib/parametres-labo";
import { createConditionsGeneralesPdf } from "@/lib/conditions-generales-pdf";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Non autorisé." }, { status: 403 });

  const params = await getParametresLabo();
  const logo = await readFile(join(process.cwd(), "public", "images", "logodecerflabslogan.png"));
  const bytes = await createConditionsGeneralesPdf(params, logo);
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=CGV-Decerf-Lab.pdf",
      "Cache-Control": "private, no-store",
    },
  });
}
