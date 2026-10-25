import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * API endpoint qui redirige automatiquement vers le bon dashboard
 * selon le rôle de l'utilisateur (admin ou dashboard)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const dashboardUrl = profile.role === "admin"
      ? "/admin"
      : profile.role === "technicien"
        ? "/atelier"
        : "/dashboard";
    return NextResponse.redirect(new URL(dashboardUrl, request.url));
  } catch (error) {
    console.error("Error in redirect endpoint:", error);
    return NextResponse.redirect(new URL("/login", request.url));
  }
}
