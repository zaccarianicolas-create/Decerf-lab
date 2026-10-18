import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createFactureCheckout } from "@/lib/facture-checkout";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  if (typeof body.facture_id !== "string") {
    return NextResponse.json({ error: "facture_id requis" }, { status: 400 });
  }

  try {
    const result = await createFactureCheckout(
      createAdminClient(),
      body.facture_id,
      user.id
    );
    return NextResponse.json({ url: result.url });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Impossible de créer le paiement." },
      { status: 400 }
    );
  }
}
