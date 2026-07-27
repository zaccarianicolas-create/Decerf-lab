"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Menu, X, LogOut } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";

const navLinks = [
  { label: "Accueil", href: "/" },
  { label: "Services", href: "/#services" },
  { label: "À propos", href: "/#about" },
  { label: "Contact", href: "/contact" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoadingRole, setIsLoadingRole] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    setIsLoadingRole(true);
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle()
          .then(({ data, error }) => {
            if (error) {
              console.warn("Failed to fetch user role:", error?.message || "Erreur lors de la récupération du profil");
              setUserRole(null);
            } else if (data) {
              setUserRole(data.role ?? null);
            } else {
              console.warn("Profile not found for user");
              setUserRole(null);
            }
            setIsLoadingRole(false);
          });
      } else {
        setIsLoadingRole(false);
      }
    }).catch((err) => {
      console.error("Error fetching user:", err);
      setUser(null);
      setIsLoadingRole(false);
    });
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setUserRole(null);
    router.push("/");
    router.refresh();
  };

  const dashboardHref = userRole === "admin" ? "/admin" : "/dashboard";

  return (
    <header
      className={`fixed top-0 z-50 w-full transition-all duration-300 border-b border-slate-200/80 bg-white shadow-sm`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex flex-col items-start">
          <Image
            src="/images/logod.png"
            alt="DECERF LAB"
            width={180}
            height={50}
            className="h-12 w-auto"
            priority
          />
          <span className="-mt-0.5 text-[9px] font-medium uppercase tracking-[0.2em] text-slate-400">
            Laboratoire dentaire
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-slate-600 transition-colors hover:text-sky-600"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden items-center gap-3 md:flex">
          {user && !isLoadingRole ? (
            <>
              <Link href={dashboardHref}>
                <Button size="sm" className="bg-sky-600 hover:bg-sky-700">
                  Mon espace
                </Button>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-red-500"
              >
                <LogOut className="h-4 w-4" />
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm" className="text-slate-600 hover:text-sky-600">
                  Connexion
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm" className="bg-sky-600 hover:bg-sky-700">S&apos;inscrire</Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu button (native toggle, works without JS) */}
        <details className="group relative md:hidden">
          <summary className="list-none rounded-md p-1 text-slate-700 cursor-pointer" aria-label="Menu">
            <Menu className="h-6 w-6 group-open:hidden" />
            <X className="hidden h-6 w-6 group-open:block" />
          </summary>

          <div className="absolute right-0 top-11 w-[min(92vw,360px)] rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
            <div className="flex flex-col gap-3">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  {link.label}
                </Link>
              ))}
              <hr className="my-2 border-slate-100" />
              {user && !isLoadingRole ? (
                <>
                  <Link href={dashboardHref}>
                    <Button className="w-full bg-sky-600 hover:bg-sky-700">Mon espace</Button>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Déconnexion
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="outline" className="w-full">
                      Connexion
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button className="w-full bg-sky-600 hover:bg-sky-700">S&apos;inscrire</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </details>
      </nav>

    </header>
  );
}
