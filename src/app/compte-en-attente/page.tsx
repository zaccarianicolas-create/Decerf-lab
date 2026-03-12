import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, LogOut } from "lucide-react";
import Link from "next/link";

export default async function CompteEnAttentePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("nom, prenom, statut_compte, role")
    .eq("id", user.id)
    .single();

  // Si déjà approuvé, rediriger
  if (profile?.statut_compte === "approuve" || profile?.role === "admin") {
    redirect("/dashboard");
  }

  const isRejected = profile?.statut_compte === "rejete";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-white px-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          <Image
            src="/images/decerflogo.png"
            alt="DECERF LAB"
            width={160}
            height={45}
            className="mx-auto mb-6 h-11 w-auto"
          />

          {isRejected ? (
            <>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
                <span className="text-2xl">✕</span>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                Inscription refusée
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-gray-500">
                Votre demande d&apos;inscription n&apos;a pas été approuvée.
                Si vous pensez qu&apos;il s&apos;agit d&apos;une erreur, veuillez
                nous contacter directement.
              </p>
            </>
          ) : (
            <>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
                <Clock className="h-7 w-7 text-amber-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                Compte en attente de validation
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-gray-500">
                Bonjour Dr {profile?.prenom} {profile?.nom}, votre inscription a
                bien été reçue ! Notre équipe doit valider votre compte avant que
                vous puissiez accéder à la plateforme.
              </p>
              <div className="mt-4 rounded-lg bg-sky-50 p-4">
                <p className="text-sm text-sky-700">
                  Vous recevrez un email dès que votre compte sera activé. 
                  Ce processus est généralement rapide.
                </p>
              </div>
            </>
          )}

          <form action="/api/auth/signout" method="POST" className="mt-6">
            <Button variant="outline" className="w-full gap-2" type="submit">
              <LogOut className="h-4 w-4" />
              Se déconnecter
            </Button>
          </form>

          <Link
            href="/"
            className="mt-4 block text-sm text-gray-400 hover:text-gray-600"
          >
            Retour au site
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
