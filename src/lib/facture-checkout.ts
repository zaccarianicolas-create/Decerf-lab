import { stripe } from "@/lib/stripe";
import type { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

export async function createFactureCheckout(
  admin: AdminClient,
  factureId: string,
  userId: string
) {
  const { data: facture, error } = await admin
    .from("factures")
    .select("id, numero, statut, dentiste_id, commande_id, solde_du, methode_paiement")
    .eq("id", factureId)
    .eq("dentiste_id", userId)
    .maybeSingle();
  if (error || !facture) throw new Error(error?.message || "Facture introuvable.");
  if (facture.statut === "brouillon" || facture.statut === "annulee") {
    throw new Error("Cette facture n’est pas encore payable.");
  }
  if (facture.methode_paiement !== "stripe") {
    throw new Error("Cette facture est configurée pour un règlement par virement.");
  }

  const montant = Number(facture.solde_du || 0);
  if (montant <= 0) throw new Error("Cette facture est déjà réglée.");
  if (!facture.commande_id) throw new Error("Cette facture n’est pas liée à une commande.");

  const { data: pendingPayments } = await admin
    .from("paiements")
    .select("stripe_checkout_session_id")
    .eq("facture_id", facture.id)
    .eq("statut", "en_attente")
    .not("stripe_checkout_session_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1);

  const pendingSessionId = pendingPayments?.[0]?.stripe_checkout_session_id;
  if (pendingSessionId) {
    try {
      const existingSession = await stripe.checkout.sessions.retrieve(pendingSessionId);
      if (
        existingSession.status === "open" &&
        existingSession.url &&
        existingSession.amount_total === Math.round(montant * 100)
      ) {
        return { url: existingSession.url, sessionId: existingSession.id };
      }
      if (existingSession.status === "open") {
        await stripe.checkout.sessions.expire(existingSession.id);
        await admin
          .from("paiements")
          .update({ statut: "echoue" })
          .eq("stripe_checkout_session_id", existingSession.id);
      }
    } catch {
      // An expired or removed session can be replaced with a fresh one.
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.decerf-lab.be";
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: `Facture ${facture.numero} — DECERF LAB`,
            description: `Solde restant de la facture ${facture.numero}`,
          },
          unit_amount: Math.round(montant * 100),
        },
        quantity: 1,
      },
    ],
    metadata: { facture_id: facture.id },
    success_url: `${appUrl}/dashboard/finance?payment=success`,
    cancel_url: `${appUrl}/dashboard/finance?payment=cancelled`,
  });

  const { error: paymentError } = await admin.from("paiements").insert({
    commande_id: facture.commande_id,
    facture_id: facture.id,
    montant,
    devise: "eur",
    statut: "en_attente",
    methode: "stripe",
    stripe_checkout_session_id: session.id,
  });
  if (paymentError) {
    await stripe.checkout.sessions.expire(session.id);
    throw new Error(paymentError.message);
  }

  return { url: session.url, sessionId: session.id };
}