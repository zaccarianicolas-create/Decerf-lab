import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getParametresLabo } from "@/lib/parametres-labo";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Non autorisé." }, { status: 403 });

  const { data, error } = await admin
    .from("profiles")
    .select("id, nom, prenom, email")
    .eq("role", "dentiste")
    .order("nom");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ clients: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Non autorisé." }, { status: 403 });

  const body = await request.json().catch(() => null) as {
    dentiste_id?: unknown;
    notes?: unknown;
    lignes?: unknown;
  } | null;
  if (typeof body?.dentiste_id !== "string" || !Array.isArray(body.lignes) || body.lignes.length < 1 || body.lignes.length > 40) {
    return NextResponse.json({ error: "Choisis un dentiste et ajoute entre 1 et 40 lignes." }, { status: 400 });
  }

  const lines = body.lignes.map((raw, index) => {
    const line = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
    const description = typeof line.description === "string" ? line.description.trim().slice(0, 512) : "";
    const quantity = Number(line.quantite);
    const price = Number(line.prix_unitaire);
    const rate = Number(line.taux_tva);
    return { index, description, quantity, price, rate };
  });
  const invalid = lines.find((line) =>
    !line.description || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 10000 ||
    !Number.isFinite(line.price) || line.price <= 0 || line.price > 1_000_000 ||
    !Number.isFinite(line.rate) || line.rate < 0 || line.rate > 100
  );
  if (invalid) return NextResponse.json({ error: `Ligne ${invalid.index + 1} invalide.` }, { status: 400 });

  const { data: dentist, error: dentistError } = await admin
    .from("profiles")
    .select("id, role, nom, prenom, email, telephone, cabinet_id, numero_entreprise, assujetti_tva, numero_tva")
    .eq("id", body.dentiste_id)
    .eq("role", "dentiste")
    .maybeSingle();
  if (dentistError || !dentist) return NextResponse.json({ error: dentistError?.message || "Dentiste introuvable." }, { status: 404 });

  const [{ data: cabinet }, params] = await Promise.all([
    dentist.cabinet_id
      ? admin.from("cabinets").select("nom, adresse, code_postal, ville, telephone, tva_numero").eq("id", dentist.cabinet_id).maybeSingle().then(({ data }) => ({ data }))
      : Promise.resolve({ data: null }),
    getParametresLabo(),
  ]);
  const franchise = params.regime_tva === "franchise";
  const fullName = [dentist.prenom, dentist.nom].filter(Boolean).join(" ");
  const address = [cabinet?.nom, [cabinet?.adresse, cabinet?.code_postal, cabinet?.ville].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(" — ");
  const snapshot = {
    version: 2 as const,
    taux_tva: franchise ? 0 : Number(params.taux_tva_defaut ?? 21),
    regime_tva: params.regime_tva,
    mention_franchise_tva: params.mention_franchise_tva,
    issuer: {
      nom: params.nom_labo,
      adresse: [params.adresse, params.code_postal, params.ville, params.pays].filter(Boolean).join(", "),
      telephone: params.telephone ?? "",
      email: params.email_contact ?? "",
      tva_numero: params.tva_numero ?? "",
      numero_entreprise: params.numero_entreprise ?? "",
      iban: params.iban ?? "",
      bic: params.bic ?? "",
      conditions_paiement: params.conditions_paiement ?? "Paiement à 30 jours",
      mentions_legales: [params.mentions_legales_facture, franchise ? params.mention_franchise_tva : null].filter(Boolean).join("\n"),
      logo_url: params.logo_url ?? "",
    },
    client: {
      nom: fullName,
      prenom: dentist.prenom ?? "",
      email: dentist.email ?? "",
      adresse: address,
      cabinet_nom: cabinet?.nom ?? "",
      rue: cabinet?.adresse ?? "",
      code_postal: cabinet?.code_postal ?? "",
      ville: cabinet?.ville ?? "",
      pays: "Belgique",
      telephone: cabinet?.telephone || dentist.telephone || "",
      tva_numero: dentist.assujetti_tva === false ? "" : cabinet?.tva_numero ?? dentist.numero_tva ?? "",
      numero_entreprise: dentist.numero_entreprise ?? "",
      assujetti_tva: dentist.assujetti_tva ?? null,
    },
    commande_numero: "Vente directe",
    patient_ref: "",
    items: lines.map((line) => ({
      commande_item_id: "",
      service_id: null,
      service_nom: line.description,
      description: line.description,
      quantite: line.quantity,
      prix_base_ht: line.price,
      taux_tva: franchise ? 0 : line.rate,
      categorie_tva_peppol: franchise ? "E" as const : line.rate === 0 ? "Z" as const : "S" as const,
      motif_exoneration_tva: franchise ? params.mention_franchise_tva : null,
      options_preselectionnees: [],
      options: [],
    })),
  };

  const { data: facture, error } = await admin.from("factures").insert({
    dentiste_id: dentist.id,
    cabinet_id: dentist.cabinet_id,
    commande_id: null,
    statut: "brouillon",
    montant_ht: 0,
    montant_tva: 0,
    montant_ttc: 0,
    solde_du: 0,
    devise: "eur",
    notes: typeof body.notes === "string" ? body.notes.trim().slice(0, 1000) : "Vente directe",
    billing_snapshot: snapshot,
    created_by: user.id,
  }).select("id, numero, statut").single();
  if (error || !facture) return NextResponse.json({ error: error?.message || "Création du brouillon impossible." }, { status: 500 });

  return NextResponse.json({ success: true, facture });
}
