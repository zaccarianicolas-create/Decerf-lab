"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, X, type LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type MobileNavLink = { label: string; href: string; icon: LucideIcon };

export function MobileSidebarMenu({
  links,
  brandHref,
  dark = false,
}: {
  links: MobileNavLink[];
  brandHref: string;
  dark?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const surface = dark ? "bg-gray-900 text-gray-100" : "bg-white text-gray-900";
  const border = dark ? "border-gray-800" : "border-gray-200";

  const logout = async () => {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className={`fixed inset-x-0 top-0 z-50 lg:hidden ${surface}`}>
      <header className={`flex h-14 items-center justify-between border-b px-4 ${border}`}>
        <Link href={brandHref} onClick={() => setOpen(false)} className="flex items-center gap-2">
          <Image
            src="/images/logod.png"
            alt="DECERF LAB"
            width={128}
            height={36}
            className={`h-8 w-auto ${dark ? "brightness-0 invert" : ""}`}
          />
          <span className={`text-xs font-medium ${dark ? "text-gray-400" : "text-gray-500"}`}>
            {dark ? "Administration" : "Espace praticien"}
          </span>
        </Link>
        <button
          type="button"
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className={`inline-flex min-h-10 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${dark ? "text-gray-200 hover:bg-gray-800" : "text-gray-700 hover:bg-gray-100"}`}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          <span>{open ? "Fermer" : "Menu"}</span>
        </button>
      </header>
      {open && (
        <nav className={`max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-b p-3 ${border}`}>
          <div className="space-y-1">
            {links.map((link) => {
              const active = pathname === link.href ||
                (link.href !== brandHref && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`flex min-h-11 items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium ${
                    active
                      ? dark ? "bg-blue-600/20 text-blue-300" : "bg-blue-50 text-blue-700"
                      : dark ? "text-gray-300 hover:bg-gray-800" : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <link.icon className="h-5 w-5 shrink-0" />
                  {link.label}
                </Link>
              );
            })}
          </div>
          <button
            type="button"
            onClick={logout}
            className={`mt-3 flex min-h-11 w-full items-center gap-3 rounded-md border-t px-3 pt-3 text-sm font-medium ${border} ${dark ? "text-red-300" : "text-red-600"}`}
          >
            <LogOut className="h-5 w-5" />
            Déconnexion
          </button>
        </nav>
      )}
    </div>
  );
}