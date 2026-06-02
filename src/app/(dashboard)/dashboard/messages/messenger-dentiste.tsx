"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";
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
}: {
  initialConversations: Conversation[];
  unreadMap: Record<string, number>;
  currentUserId: string;
  authorsMap: Record<string, Author>;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [activeId, setActiveId] = useState<string | null>(
    initialConversations[0]?.id ?? null
  );
  const [unread, setUnread] = useState(initialUnread);
  const [conversations, setConversations] = useState(initialConversations);

  useEffect(() => {
    const channel = supabase
      .channel("dentiste-conv-list")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const m = payload.new as { conversation_id: string; auteur_id: string };
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

  if (conversations.length === 0) {
    return (
      <Card>
        <div className="py-12 text-center">
          <MessageSquare className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-4 text-sm text-gray-500">
            Aucune conversation pour le moment. Une conversation peut être ouverte
            par le laboratoire ou attachée à une commande.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex h-[calc(100vh-200px)] min-h-[520px]">
        <aside className="w-72 border-r border-gray-200 overflow-y-auto">
          {conversations.map((c) => (
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
        <section className="flex flex-1 flex-col">
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
