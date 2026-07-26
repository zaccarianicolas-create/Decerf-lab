"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ChatModalWindow } from "./chat-modal-window";

export function ChatFab({ href }: { href: string }) {
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const start = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const refreshUnread = async () => {
        const { count } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("lu", false)
          .neq("auteur_id", user.id);

        if (isMounted) {
          setUnreadCount(count ?? 0);
        }
      };

      await refreshUnread();

      channel = supabase
        .channel(`chat-fab-unread-${user.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "messages" },
          () => {
            void refreshUnread();
          }
        )
        .subscribe();
    };

    void start();

    return () => {
      isMounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [supabase]);

  if (pathname?.startsWith(href)) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        aria-label="Ouvrir la messagerie"
        title="Messagerie"
        className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-sky-600 px-4 py-3 text-white shadow-lg transition hover:bg-sky-700"
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
      />
    </>
  );
}
