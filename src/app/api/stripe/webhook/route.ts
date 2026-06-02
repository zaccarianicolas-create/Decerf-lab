import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import Stripe from "stripe";

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const sig = headersList.get("stripe-signature") as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const commandeId = session.metadata?.commande_id;

      if (commandeId) {
        const { data: paiement } = await supabase
          .from("paiements")
          .select("id, statut, montant, facture_id, commande_id")
          .eq("stripe_checkout_session_id", session.id)
          .maybeSingle();

        await supabase
          .from("paiements")
          .update({
            statut: "paye",
            stripe_payment_intent_id: session.payment_intent as string,
          })
          .eq("stripe_checkout_session_id", session.id);

        let factureId = paiement?.facture_id || null;
        if (!factureId) {
          const { data: facture } = await supabase
            .from("factures")
            .select("id")
            .eq("commande_id", commandeId)
            .maybeSingle();
          factureId = facture?.id || null;
        }

        if (factureId && paiement?.id) {
          await supabase
            .from("paiements")
            .update({ facture_id: factureId })
            .eq("id", paiement.id);
        }

        let statutCommande: "en_attente" | "paye" = "en_attente";

        if (factureId && paiement && paiement.statut !== "paye") {
          const { data: facture } = await supabase
            .from("factures")
            .select("id, numero, solde_du, dentiste_id, cabinet_id")
            .eq("id", factureId)
            .single();

          if (facture) {
            const paiementMontant = Number(paiement.montant || 0);
            const nouveauSolde = Number(
              Math.max(0, Number(facture.solde_du || 0) - paiementMontant).toFixed(2)
            );
            const nouveauStatut = nouveauSolde <= 0 ? "payee" : "partiellement_payee";

            await supabase
              .from("factures")
              .update({
                solde_du: nouveauSolde,
                statut: nouveauStatut,
              })
              .eq("id", facture.id);

            await supabase.from("ecritures_compte_client").insert({
              dentiste_id: facture.dentiste_id,
              cabinet_id: facture.cabinet_id,
              facture_id: facture.id,
              paiement_id: paiement.id,
              type_ecriture: "paiement",
              libelle: `Paiement Stripe sur ${facture.numero}`,
              montant: -paiementMontant,
            });

            if (nouveauSolde <= 0) {
              statutCommande = "paye";
            }
          }
        }

        await supabase
          .from("commandes")
          .update({ statut_paiement: statutCommande })
          .eq("id", commandeId);
      }
      break;
    }
    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      await supabase
        .from("paiements")
        .update({ statut: "echoue" })
        .eq("stripe_payment_intent_id", paymentIntent.id);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
