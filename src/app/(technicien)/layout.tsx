import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { LogOut, Briefcase } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function TechnicienLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, prenom, nom")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "technicien") {
    redirect(profile?.role === "admin" ? "/admin" : "/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/atelier" className="flex items-center gap-2">
            <Image
              src="/images/logod.png"
              alt="DECERF LAB"
              width={120}
              height={32}
              className="h-8 w-auto"
            />
            <span className="hidden text-sm font-medium text-gray-600 sm:inline">
              · Atelier
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-gray-600 sm:inline">
              {profile?.prenom} {profile?.nom}
            </span>
            <Link
              href="/atelier"
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              title="Atelier"
            >
              <Briefcase className="h-4 w-4" />
            </Link>
            <form action="/api/auth/signout" method="post">
              <button
                type="submit"
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                title="Déconnexion"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
