import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Non authentifié" }, { status: 401 }) };
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") {
    return { error: NextResponse.json({ error: "Non autorisé" }, { status: 403 }) };
  }
  return { admin };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const auth = await requireAdmin();
  if ((auth as any).error) return (auth as any).error;
  const { admin } = auth as { admin: ReturnType<typeof createAdminClient> };

  const { data: row } = await admin
    .from("protocole_instances")
    .select(
      "*, commande:commandes(id, numero), patient:patients(reference, nom, prenom), dentiste:profiles(nom, prenom)"
    )
    .eq("id", id)
    .single();

  if (!row) {
    return NextResponse.json({ error: "Instance introuvable" }, { status: 404 });
  }

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]); // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let y = 800;
  const left = 40;

  const write = (text: string, bold = false, size = 11) => {
    if (y < 60) {
      const p = pdf.addPage([595.28, 841.89]);
      y = 800;
      p.drawText(text, {
        x: left,
        y,
        size,
        font: bold ? fontBold : font,
        color: rgb(0.1, 0.12, 0.18),
      });
      y -= size + 8;
      return;
    }
    page.drawText(text, {
      x: left,
      y,
      size,
      font: bold ? fontBold : font,
      color: rgb(0.1, 0.12, 0.18),
    });
    y -= size + 8;
  };

  write("DECERF LAB — Protocole", true, 18);
  write(`Titre: ${row.titre}`, true, 13);
  write(`Type protocole: ${row.type_protocole || "-"}`);
  write(`Type travail: ${row.type_travail || "-"}`);
  write(`Version: ${row.version || 1}`);
  write(`Statut: ${row.statut || "brouillon"}`);
  write(`Commande: ${row.commande?.numero || "-"}`);
  write(`Patient: ${row.patient ? `${row.patient.prenom} ${row.patient.nom} (${row.patient.reference})` : "-"}`);
  write(`Dentiste: ${row.dentiste ? `Dr ${row.dentiste.prenom} ${row.dentiste.nom}` : "-"}`);
  write(`Date: ${new Date(row.created_at).toLocaleDateString("fr-FR")}`);

  y -= 8;
  write("Sections", true, 12);
  const sections = (row.sections || {}) as Record<string, unknown>;
  for (const [k, v] of Object.entries(sections)) {
    write(`- ${k}: ${typeof v === "boolean" ? (v ? "Oui" : "Non") : JSON.stringify(v)}`);
  }

  y -= 8;
  write("Méta", true, 12);
  const meta = JSON.stringify(row.metadata || {}, null, 2).split("\n");
  for (const line of meta) write(line, false, 9);

  const bytes = await pdf.save();
  const buffer = Buffer.from(bytes);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="protocole-${id}.pdf"`,
    },
  });
}
