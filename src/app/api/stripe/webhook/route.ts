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
        // Mettre à jour le paiement
        await supabase
          .from("paiements")
          .update({
            statut: "paye",
            stripe_payment_intent_id: session.payment_intent as string,
          })
          .eq("stripe_checkout_session_id", session.id);

        // Mettre à jour le statut de paiement de la commande
        await supabase
          .from("commandes")
          .update({ statut_paiement: "paye" })
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
