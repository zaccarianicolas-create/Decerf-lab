import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { data: patients } = await admin
    .from("patients")
    .select(
      "id, reference, nom, prenom, date_naissance, sexe, telephone, email, actif, archived_at, anonymized_at, created_at, dentiste:profiles!dentiste_id(nom, prenom, sans_compte, cabinet:cabinets(nom))"
    )
    .order("created_at", { ascending: false });

  const rows = (patients ?? []).map((p: any) => {
    const dent = p.dentiste
      ? `Dr ${p.dentiste.prenom} ${p.dentiste.nom}${p.dentiste.sans_compte ? " (sans compte)" : ""}`
      : "—";
    const cabinet = p.dentiste?.cabinet?.nom ?? "";
    const statut = p.anonymized_at
      ? "Anonymisé"
      : p.archived_at
      ? "Archivé"
      : p.actif
      ? "Actif"
      : "Inactif";
    return [
      p.reference,
      p.nom,
      p.prenom,
      p.date_naissance ?? "",
      p.sexe ?? "",
      p.telephone ?? "",
      p.email ?? "",
      dent,
      cabinet,
      statut,
      new Date(p.created_at).toLocaleDateString("fr-FR"),
    ];
  });

  const header = [
    "Référence",
    "Nom",
    "Prénom",
    "Date naissance",
    "Sexe",
    "Téléphone",
    "Email",
    "Dentiste référent",
    "Cabinet",
    "Statut",
    "Créé le",
  ];

  const escape = (v: unknown) => {
    const s = String(v ?? "");
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [header, ...rows].map((r) => r.map(escape).join(";")).join("\n");

  return new NextResponse("\uFEFF" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="patients-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
