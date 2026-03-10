import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { commande_id, montant } = await request.json();

  // Créer une session Stripe Checkout
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: `Commande DECERF LAB`,
            description: `Paiement de la commande`,
          },
          unit_amount: Math.round(montant * 100),
        },
        quantity: 1,
      },
    ],
    metadata: {
      commande_id,
      user_id: user.id,
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/commandes/${commande_id}?payment=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/commandes/${commande_id}?payment=cancelled`,
  });

  // Enregistrer le paiement en BDD
  await supabase.from("paiements").insert({
    commande_id,
    montant,
    stripe_checkout_session_id: session.id,
    statut: "en_attente",
  });

  return NextResponse.json({ url: session.url });
}
