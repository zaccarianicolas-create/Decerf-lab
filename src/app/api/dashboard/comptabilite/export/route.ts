import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

type ExportType = "factures" | "avoirs" | "ledger";

function toCsv(rows: Record<string, unknown>[]) {
  if (rows.length === 0) return "";

  const headers = Object.keys(rows[0]);
  const escapeCell = (value: unknown) => {
    if (value === null || value === undefined) return "";
    const str = String(value);
    if (str.includes('"') || str.includes(",") || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCell(row[h])).join(","));
  }

  return lines.join("\n");
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const type = (params.get("type") || "factures") as ExportType;
  const from = params.get("from");
  const to = params.get("to");

  if (!["factures", "avoirs", "ledger"].includes(type)) {
    return NextResponse.json({ error: "Type d'export invalide" }, { status: 400 });
  }

  if (type === "factures") {
    let query = supabase
      .from("factures")
      .select("numero,statut,date_emission,date_echeance,montant_ht,montant_tva,montant_ttc,solde_du,devise,commande:commandes(numero)")
      .eq("dentiste_id", user.id)
      .order("date_emission", { ascending: false })
      .limit(1000);

    if (from) query = query.gte("date_emission", from);
    if (to) query = query.lte("date_emission", to);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const rows = (data || []).map((f: any) => ({
      numero: f.numero,
      statut: f.statut,
      date_emission: f.date_emission,
      date_echeance: f.date_echeance,
      montant_ht: f.montant_ht,
      montant_tva: f.montant_tva,
      montant_ttc: f.montant_ttc,
      solde_du: f.solde_du,
      devise: f.devise,
      commande_numero: f.commande?.numero || "",
    }));

    return new NextResponse(toCsv(rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=mes-factures-${new Date().toISOString().slice(0, 10)}.csv`,
      },
    });
  }

  if (type === "avoirs") {
    let query = supabase
      .from("avoirs")
      .select("numero,statut,motif,montant,solde_restant,date_emission,facture:factures(numero)")
      .eq("dentiste_id", user.id)
      .order("date_emission", { ascending: false })
      .limit(1000);

    if (from) query = query.gte("date_emission", from);
    if (to) query = query.lte("date_emission", to);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const rows = (data || []).map((a: any) => ({
      numero: a.numero,
      statut: a.statut,
      motif: a.motif,
      montant: a.montant,
      solde_restant: a.solde_restant,
      date_emission: a.date_emission,
      facture_numero: a.facture?.numero || "",
    }));

    return new NextResponse(toCsv(rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=mes-avoirs-${new Date().toISOString().slice(0, 10)}.csv`,
      },
    });
  }

  let query = supabase
    .from("ecritures_compte_client")
    .select("created_at,type_ecriture,libelle,montant,facture:factures(numero),avoir:avoirs(numero)")
    .eq("dentiste_id", user.id)
    .order("created_at", { ascending: false })
    .limit(2000);

  if (from) query = query.gte("created_at", `${from}T00:00:00.000Z`);
  if (to) query = query.lte("created_at", `${to}T23:59:59.999Z`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const rows = (data || []).map((l: any) => ({
    created_at: l.created_at,
    type_ecriture: l.type_ecriture,
    libelle: l.libelle,
    montant: l.montant,
    facture_numero: l.facture?.numero || "",
    avoir_numero: l.avoir?.numero || "",
  }));

  return new NextResponse(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=mon-grand-livre-${new Date().toISOString().slice(0, 10)}.csv`,
    },
  });
}
