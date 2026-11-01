"use client";

import { useSyncExternalStore } from "react";
import { ChatFab } from "@/components/messagerie/chat-fab";

export function AtelierLayoutShell({ children, header }: {
  children: React.ReactNode;
  header: React.ReactNode;
}) {
  const isEmbedded = useSyncExternalStore(
    () => () => undefined,
    () => new URLSearchParams(window.location.search).get("embed") === "1",
    () => false
  );
  return (
    <div className="min-h-screen bg-gray-50">
      {!isEmbedded && header}
      <main className={isEmbedded ? "h-dvh min-h-0" : "mx-auto max-w-6xl px-4 py-6"}>
        {children}
      </main>
      {!isEmbedded && <ChatFab href="/atelier/messages" />}
    </div>
  );
}