"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ChatModalWindow } from "./chat-modal-window";

export function ChatFab({ href }: { href: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let refreshInterval: number | null = null;
    let refreshOnFocus: (() => void) | null = null;
    let refreshOnVisibility: (() => void) | null = null;
    const notifications = new Map<string, Notification>();
    const timers = new Set<number>();

    const start = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!isMounted || !user) return;

      const refreshUnread = async () => {
        const { data, error } = await supabase.rpc("get_chat_unread_counts");

        if (isMounted && !error) {
          setUnreadCount((data ?? []).reduce((total: number, row: { unread_count: number | string }) => total + Number(row.unread_count), 0));
          const unread = new Set((data ?? []).filter((row: { unread_count: number | string }) => Number(row.unread_count) > 0).map((row: { conversation_id: string }) => row.conversation_id));
          for (const [id, notification] of notifications) if (!unread.has(id)) { notification.close(); notifications.delete(id); }
        }
        return error ? null : data;
      };

      await refreshUnread();
      refreshOnFocus = () => void refreshUnread();
      refreshOnVisibility = () => {
        if (document.visibilityState === "visible") void refreshUnread();
      };
      refreshInterval = window.setInterval(refreshUnread, 30000);
      window.addEventListener("focus", refreshOnFocus);
      document.addEventListener("visibilitychange", refreshOnVisibility);

      channel = supabase
        .channel(`chat-fab-unread-${user.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "messages" },
          (payload) => {
            void refreshUnread();
            if (payload.eventType !== "INSERT" || payload.new.auteur_id === user.id || !("Notification" in window) || Notification.permission !== "granted") return;
            const id = payload.new.conversation_id as string;
            const timer = window.setTimeout(async () => {
              timers.delete(timer);
              const rows = await refreshUnread();
              if (!isMounted || !rows?.some((row: { conversation_id: string; unread_count: number | string }) => row.conversation_id === id && Number(row.unread_count) > 0)) return;
              try {
                notifications.get(id)?.close();
                const notification = new Notification("DECERF LAB", { body: "Vous avez des messages non lus.", tag: `decerf-chat-${id}` });
                notification.onclick = () => { window.focus(); router.push(`${href}?conversation=${encodeURIComponent(id)}`); notification.close(); };
                notifications.set(id, notification);
              } catch { notifications.delete(id); }
            }, 1500);
            timers.add(timer);
          }
        )
        .on("postgres_changes", { event: "*", schema: "public", table: "conversation_participants" }, () => {
          void refreshUnread();
        })
        .subscribe();
    };

    void start();

    return () => {
      isMounted = false;
      if (refreshInterval !== null) window.clearInterval(refreshInterval);
      if (refreshOnFocus) window.removeEventListener("focus", refreshOnFocus);
      if (refreshOnVisibility) document.removeEventListener("visibilitychange", refreshOnVisibility);
      if (channel) supabase.removeChannel(channel);
      for (const timer of timers) window.clearTimeout(timer);
      for (const notification of notifications.values()) notification.close();
    };
  }, [supabase, href, router]);

  if (pathname?.startsWith(href)) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen((open) => !open)}
        aria-label="Ouvrir la messagerie"
        title="Messagerie"
        className={`fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full px-4 py-3 text-white shadow-lg transition ${
          isModalOpen ? "bg-sky-700" : "bg-sky-600 hover:bg-sky-700"
        }`}
      >
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
        <MessageCircle className="h-5 w-5" />
        <span className="hidden text-sm font-medium sm:inline">Messagerie</span>
      </button>

      <ChatModalWindow
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        unreadCount={unreadCount}
        chatPath={href}
      />
    </>
  );
}
