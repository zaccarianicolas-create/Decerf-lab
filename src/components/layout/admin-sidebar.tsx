"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Package,
  MessageSquare,
  Settings,
  FileText,
  CreditCard,
  BookOpen,
  LogOut,
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const adminLinks = [
  { label: "Tableau de bord", href: "/admin", icon: LayoutDashboard },
  { label: "Clients", href: "/admin/clients", icon: Users },
  { label: "Travaux", href: "/admin/travaux", icon: Briefcase },
  { label: "Commandes", href: "/admin/commandes", icon: Package },
  { label: "Messages", href: "/admin/messages", icon: MessageSquare },
  { label: "Protocoles", href: "/admin/protocoles", icon: BookOpen },
  { label: "Paiements", href: "/admin/paiements", icon: CreditCard },
  { label: "Paramètres", href: "/admin/parametres", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 border-r border-gray-200 bg-gray-900 lg:block">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-20 items-center border-b border-gray-800 px-4">
          <Link href="/admin" className="flex flex-col items-start">
            <Image
              src="/images/logod.png"
              alt="DECERF LAB"
              width={150}
              height={42}
              className="h-10 w-auto brightness-0 invert"
            />
            <span className="-mt-0.5 text-[8px] font-medium uppercase tracking-[0.2em] text-gray-500">
              Laboratoire dentaire
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {adminLinks.map((link) => {
            const isActive =
              pathname === link.href ||
              (link.href !== "/admin" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-blue-600/20 text-blue-400"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                )}
              >
                <link.icon className="h-5 w-5" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="space-y-2 border-t border-gray-800 p-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300"
          >
            <FileText className="h-4 w-4" />
            Retour au site
          </Link>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 text-sm text-red-400 hover:text-red-300"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </button>
        </div>
      </div>
    </aside>
  );
}
