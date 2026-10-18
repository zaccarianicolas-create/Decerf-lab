import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Stripe est mis en pause ; les factures restent disponibles." },
    { status: 410 }
  );
}
