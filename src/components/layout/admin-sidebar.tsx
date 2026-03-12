"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Package,
  MessageSquare,
  Settings,
  FileText,
  CreditCard,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

const adminLinks = [
  { label: "Tableau de bord", href: "/admin", icon: LayoutDashboard },
  { label: "Clients", href: "/admin/clients", icon: Users },
  { label: "Commandes", href: "/admin/commandes", icon: Package },
  { label: "Messages", href: "/admin/messages", icon: MessageSquare },
  { label: "Protocoles", href: "/admin/protocoles", icon: BookOpen },
  { label: "Paiements", href: "/admin/paiements", icon: CreditCard },
  { label: "Paramètres", href: "/admin/parametres", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 border-r border-gray-200 bg-gray-900 lg:block">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center border-b border-gray-800 px-4">
          <Link href="/admin" className="flex items-center gap-2">
            <Image
              src="/images/logod.png"
              alt="DECERF LAB"
              width={140}
              height={40}
              className="h-8 w-auto brightness-0 invert"
            />
            <span className="text-[9px] font-medium uppercase tracking-widest text-gray-500">
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
        <div className="border-t border-gray-800 p-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300"
          >
            <FileText className="h-4 w-4" />
            Retour au site
          </Link>
        </div>
      </div>
    </aside>
  );
}
