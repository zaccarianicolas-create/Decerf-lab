"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  MessageSquare,
  User,
  Plus,
  FileText,
  LogOut,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const dentistLinks = [
  { label: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard },
  { label: "Mes patients", href: "/dashboard/patients", icon: Users },
  { label: "Mes commandes", href: "/dashboard/commandes", icon: Package },
  { label: "Nouvelle commande", href: "/dashboard/commandes/nouvelle", icon: Plus },
  { label: "Messages", href: "/dashboard/messages", icon: MessageSquare },
  { label: "Mon profil", href: "/dashboard/profil", icon: User },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 border-r border-gray-200 bg-white lg:block">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-20 items-center border-b border-gray-200 px-4">
          <Link href="/" className="flex flex-col items-start">
            <Image
              src="/images/logod.png"
              alt="DECERF LAB"
              width={150}
              height={42}
              className="h-10 w-auto"
            />
            <span className="-mt-0.5 text-[8px] font-medium uppercase tracking-[0.2em] text-gray-400">
              Laboratoire dentaire
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {dentistLinks.map((link) => {
            const isActive =
              pathname === link.href ||
              (link.href !== "/dashboard" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <link.icon className="h-5 w-5" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="space-y-2 border-t border-gray-200 p-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
          >
            <FileText className="h-4 w-4" />
            Retour au site
          </Link>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 text-sm text-red-500 hover:text-red-700"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </button>
        </div>
      </div>
    </aside>
  );
}
