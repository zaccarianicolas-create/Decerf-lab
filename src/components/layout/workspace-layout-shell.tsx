"use client";

import { useSyncExternalStore } from "react";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { ChatFab } from "@/components/messagerie/chat-fab";

type WorkspaceLayoutShellProps = {
  children: React.ReactNode;
  workspace: "admin" | "dashboard";
};

export function WorkspaceLayoutShell({ children, workspace }: WorkspaceLayoutShellProps) {
  const isEmbedded = useSyncExternalStore(
    () => () => undefined,
    () => new URLSearchParams(window.location.search).get("embed") === "1",
    () => false
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {!isEmbedded && (workspace === "admin" ? <AdminSidebar /> : <DashboardSidebar />)}
      <main className={isEmbedded ? "h-screen min-h-0" : "pt-14 lg:pl-64 lg:pt-0"}>
        <div className={isEmbedded ? "h-full min-h-0" : "px-4 py-8 sm:px-6 lg:px-8"}>
          {children}
        </div>
      </main>
      {!isEmbedded && <ChatFab href={workspace === "admin" ? "/admin/messages" : "/dashboard/messages"} />}
    </div>
  );
}
