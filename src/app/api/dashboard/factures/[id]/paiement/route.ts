import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Le paiement en ligne n’est pas disponible pour le moment." },
    { status: 410 }
  );
}