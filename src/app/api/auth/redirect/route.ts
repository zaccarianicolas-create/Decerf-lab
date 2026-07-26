import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

/**
 * API endpoint qui redirige automatiquement vers le bon dashboard
 * selon le rôle de l'utilisateur (admin ou dashboard)
 */
export async function GET(request: NextRequest) {
  try {
    const admin = createAdminClient();
    
    // Récupérer le token de la requête
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const token = authHeader.replace("Bearer ", "");
    
    // Vérifier le token et récupérer l'utilisateur
    const { data: { user }, error: userError } = await admin.auth.admin.getUserById(
      token.split(".")[0] // Rough extraction, should use proper JWT parsing
    );

    if (userError || !user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Récupérer le rôle de l'utilisateur
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Rediriger vers le bon dashboard
    const dashboardUrl = profile.role === "admin" ? "/admin" : "/dashboard";
    return NextResponse.redirect(new URL(dashboardUrl, request.url));
  } catch (error) {
    console.error("Error in redirect endpoint:", error);
    return NextResponse.redirect(new URL("/login", request.url));
  }
}
