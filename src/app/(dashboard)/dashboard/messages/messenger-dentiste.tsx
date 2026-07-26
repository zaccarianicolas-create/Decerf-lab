"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { MessageSquare, Search } from "lucide-react";
import { ChatThread } from "@/components/messagerie/chat-thread";

type Author = {
  id: string;
  nom: string | null;
  prenom: string | null;
  avatar_url: string | null;
  role: string | null;
};

type Conversation = {
  id: string;
  titre: string | null;
  commande_id: string | null;
  derniere_activite: string;
  commande: { numero: string } | null;
};

export function MessengerDentiste({
  initialConversations,
  unreadMap: initialUnread,
  currentUserId,
  authorsMap,
  isEmbed,
}: {
  initialConversations: Conversation[];
  unreadMap: Record<string, number>;
  currentUserId: string;
  authorsMap: Record<string, Author>;
  isEmbed?: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [activeId, setActiveId] = useState<string | null>(
    initialConversations[0]?.id ?? null
  );
  const [unread, setUnread] = useState(initialUnread);
  const [conversations, setConversations] = useState(initialConversations);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("dentiste-conv-list")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const m = payload.new as { conversation_id: string; auteur_id: string };
          const isIncoming = m.auteur_id !== currentUserId;
          const isInactiveConversation = m.conversation_id !== activeId;

          if (
            isIncoming &&
            isInactiveConversation &&
            typeof window !== "undefined" &&
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            const conv = conversations.find((c) => c.id === m.conversation_id);
            const convLabel = conv?.titre || "DECERF LAB";
            new Notification("Nouveau message", {
              body: `${convLabel} vous a écrit`,
            });
          }

          if (m.auteur_id !== currentUserId && m.conversation_id !== activeId) {
            setUnread((u) => ({
              ...u,
              [m.conversation_id]: (u[m.conversation_id] || 0) + 1,
            }));
          }
          setConversations((convs) =>
            convs
              .map((c) =>
                c.id === m.conversation_id
                  ? { ...c, derniere_activite: new Date().toISOString() }
                  : c
              )
              .sort((a, b) =>
                b.derniere_activite.localeCompare(a.derniere_activite)
              )
          );
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, activeId, currentUserId]);

  const open = (id: string) => {
    setActiveId(id);
    setUnread((u) => ({ ...u, [id]: 0 }));
  };

  const active = conversations.find((c) => c.id === activeId);
  const filtered = conversations.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.titre?.toLowerCase().includes(q) ||
      c.commande?.numero?.toLowerCase().includes(q)
    );
  });

  if (conversations.length === 0) {
    return (
      <Card className={isEmbed ? "h-full rounded-none border-0 shadow-none" : ""}>
        <div className="flex h-full flex-col">
          {isEmbed && (
            <div className="border-b border-gray-100 p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher..."
                  className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-sky-500 focus:outline-none"
                />
              </div>
            </div>
          )}
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <MessageSquare className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-4 text-sm text-gray-500">
            Aucune conversation pour le moment. Une conversation peut être ouverte
            par le laboratoire ou attachée à une commande.
          </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`overflow-hidden ${isEmbed ? "h-full rounded-none border-0 shadow-none" : ""}`}>
      <div
        className={`${
          isEmbed
            ? "flex h-full min-h-0 flex-col"
            : "flex h-[calc(100vh-200px)] min-h-[520px]"
        }`}
      >
        <aside
          className={`${
            isEmbed
              ? "h-1/2 overflow-y-auto border-b border-gray-200"
              : "w-72 overflow-y-auto border-r border-gray-200"
          }`}
        >
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => open(c.id)}
              className={`flex w-full items-start gap-3 border-b border-gray-50 px-4 py-3 text-left ${
                activeId === c.id ? "bg-sky-50" : "hover:bg-gray-50"
              }`}
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-medium text-sky-700">
                DL
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {c.titre || "DECERF LAB"}
                  </p>
                  {(unread[c.id] || 0) > 0 && (
                    <span className="ml-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-sky-600 px-1.5 text-xs font-medium text-white">
                      {unread[c.id]}
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-gray-500">
                  {c.commande
                    ? `Commande ${c.commande.numero}`
                    : "Conversation générale"}
                </p>
              </div>
            </button>
          ))}
        </aside>
        <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {active && (
            <ChatThread
              conversationId={active.id}
              currentUserId={currentUserId}
              authorsMap={authorsMap}
            />
          )}
        </section>
      </div>
    </Card>
  );
}
