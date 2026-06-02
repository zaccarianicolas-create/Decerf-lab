import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

type ExportType = "factures" | "avoirs" | "ledger" | "paiements" | "journal";

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

async function requireAdmin() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: NextResponse.json({ error: "Non authentifie" }, { status: 401 }),
    };
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return {
      error: NextResponse.json({ error: "Non autorise" }, { status: 403 }),
    };
  }

  return { admin };
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { admin } = auth;
  const params = request.nextUrl.searchParams;
  const type = (params.get("type") || "factures") as ExportType;
  const from = params.get("from");
  const to = params.get("to");

  if (!["factures", "avoirs", "ledger", "paiements", "journal"].includes(type)) {
    return NextResponse.json({ error: "Type d'export invalide" }, { status: 400 });
  }

  if (type === "factures") {
    let query = admin
      .from("factures")
      .select(
        "numero,statut,date_emission,date_echeance,montant_ht,montant_tva,montant_ttc,solde_du,devise,dentiste:profiles!factures_dentiste_id_fkey(nom,prenom,email),commande:commandes(numero)"
      )
      .order("date_emission", { ascending: false })
      .limit(2000);

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
      dentiste_nom: [f.dentiste?.prenom, f.dentiste?.nom].filter(Boolean).join(" "),
      dentiste_email: f.dentiste?.email || "",
    }));

    const csv = toCsv(rows);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=export-factures-${new Date().toISOString().slice(0, 10)}.csv`,
      },
    });
  }

  if (type === "avoirs") {
    let query = admin
      .from("avoirs")
      .select(
        "numero,statut,motif,montant,solde_restant,date_emission,dentiste:profiles!avoirs_dentiste_id_fkey(nom,prenom,email),facture:factures(numero)"
      )
      .order("date_emission", { ascending: false })
      .limit(2000);

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
      dentiste_nom: [a.dentiste?.prenom, a.dentiste?.nom].filter(Boolean).join(" "),
      dentiste_email: a.dentiste?.email || "",
    }));

    const csv = toCsv(rows);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=export-avoirs-${new Date().toISOString().slice(0, 10)}.csv`,
      },
    });
  }

  if (type === "paiements") {
    let query = admin
      .from("paiements")
      .select(
        "created_at,montant,devise,statut,methode,stripe_payment_intent_id,commande:commandes(numero),facture:factures(numero)"
      )
      .order("created_at", { ascending: false })
      .limit(2000);

    if (from) query = query.gte("created_at", `${from}T00:00:00.000Z`);
    if (to) query = query.lte("created_at", `${to}T23:59:59.999Z`);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const rows = (data || []).map((p: any) => ({
      created_at: p.created_at,
      montant: p.montant,
      devise: p.devise,
      statut: p.statut,
      methode: p.methode,
      stripe_payment_intent_id: p.stripe_payment_intent_id,
      commande_numero: p.commande?.numero || "",
      facture_numero: p.facture?.numero || "",
    }));

    const csv = toCsv(rows);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=export-paiements-${new Date().toISOString().slice(0, 10)}.csv`,
      },
    });
  }

  if (type === "journal") {
    let query = admin
      .from("ecritures_compte_client")
      .select(
        `
        created_at,
        type_ecriture,
        libelle,
        montant,
        dentiste:profiles!ecritures_compte_client_dentiste_id_fkey(nom, prenom, email),
        facture:factures(numero, montant_ht, montant_tva, montant_ttc),
        avoir:avoirs(numero),
        paiement:paiements(id, stripe_payment_intent_id)
      `
      )
      .order("created_at", { ascending: false })
      .limit(3000);

    if (from) query = query.gte("created_at", `${from}T00:00:00.000Z`);
    if (to) query = query.lte("created_at", `${to}T23:59:59.999Z`);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const rows = (data || []).map((line: any) => {
      const brut = Number(line.montant || 0);
      const debit = brut > 0 ? brut : 0;
      const credit = brut < 0 ? Math.abs(brut) : 0;
      const journalCode =
        line.type_ecriture === "facture"
          ? "VEN"
          : line.type_ecriture === "paiement"
            ? "BNQ"
            : "OD";

      return {
        date_ecriture: line.created_at,
        code_journal: journalCode,
        type_ecriture: line.type_ecriture,
        piece:
          line.facture?.numero ||
          line.avoir?.numero ||
          line.paiement?.stripe_payment_intent_id ||
          "",
        libelle: line.libelle,
        dentiste_nom: [line.dentiste?.prenom, line.dentiste?.nom]
          .filter(Boolean)
          .join(" "),
        dentiste_email: line.dentiste?.email || "",
        debit,
        credit,
        base_ht: line.type_ecriture === "facture" ? Number(line.facture?.montant_ht || 0) : 0,
        montant_tva:
          line.type_ecriture === "facture" ? Number(line.facture?.montant_tva || 0) : 0,
        montant_ttc:
          line.type_ecriture === "facture"
            ? Number(line.facture?.montant_ttc || 0)
            : Number(Math.abs(brut).toFixed(2)),
      };
    });

    const csv = toCsv(rows);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=export-journal-${new Date().toISOString().slice(0, 10)}.csv`,
      },
    });
  }

  let query = admin
    .from("ecritures_compte_client")
    .select(
      "created_at,type_ecriture,libelle,montant,dentiste:profiles!ecritures_compte_client_dentiste_id_fkey(nom,prenom,email),facture:factures(numero),avoir:avoirs(numero)"
    )
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
    dentiste_nom: [l.dentiste?.prenom, l.dentiste?.nom].filter(Boolean).join(" "),
    dentiste_email: l.dentiste?.email || "",
  }));

  const csv = toCsv(rows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=export-ledger-${new Date().toISOString().slice(0, 10)}.csv`,
    },
  });
}
