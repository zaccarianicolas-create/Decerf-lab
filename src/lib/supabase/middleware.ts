import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
    return supabaseResponse;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Routes protégées
  const protectedRoutes = ["/dashboard", "/admin"];
  const authRoutes = ["/login", "/register"];
  const pendingRoute = "/compte-en-attente";
  const isProtectedRoute = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );
  const isAuthRoute = authRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );
  const isPendingRoute = request.nextUrl.pathname === pendingRoute;

  // Rediriger vers login si pas authentifié
  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Si l'utilisateur est connecté, vérifier le statut de son compte
  if (user && (isProtectedRoute || isAuthRoute || isPendingRoute)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, statut_compte")
      .eq("id", user.id)
      .single();

    // Compte en attente de validation → rediriger vers page d'attente
    if (profile && profile.statut_compte !== "approuve" && profile.role !== "admin") {
      if (!isPendingRoute) {
        const url = request.nextUrl.clone();
        url.pathname = pendingRoute;
        return NextResponse.redirect(url);
      }
      return supabaseResponse;
    }

    // Compte approuvé visitant la page d'attente → rediriger vers dashboard
    if (isPendingRoute && profile?.statut_compte === "approuve") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    // Rediriger vers dashboard si déjà connecté et visite login/register
    if (isAuthRoute) {
      const url = request.nextUrl.clone();
      url.pathname = profile?.role === "admin" ? "/admin" : "/dashboard";
      return NextResponse.redirect(url);
    }

    // Vérifier l'accès admin
    if (request.nextUrl.pathname.startsWith("/admin")) {
      if (profile?.role !== "admin") {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}
