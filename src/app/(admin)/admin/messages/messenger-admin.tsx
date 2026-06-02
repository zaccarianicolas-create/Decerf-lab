"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { MessageSquare, Plus, Search } from "lucide-react";
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
  dentiste_id: string;
  derniere_activite: string;
  dentiste: Author | null;
  commande: { numero: string } | null;
};

type Dentiste = {
  id: string;
  nom: string | null;
  prenom: string | null;
  email: string | null;
};

export function MessengerAdmin({
  initialConversations,
  unreadMap: initialUnread,
  currentUserId,
  dentistes,
  authorsMap,
}: {
  initialConversations: Conversation[];
  unreadMap: Record<string, number>;
  currentUserId: string;
  dentistes: Dentiste[];
  authorsMap: Record<string, Author>;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [conversations, setConversations] =
    useState<Conversation[]>(initialConversations);
  const [activeId, setActiveId] = useState<string | null>(
    initialConversations[0]?.id ?? null
  );
  const [unread, setUnread] = useState(initialUnread);
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);

  // Realtime sur nouvelles convs + activité
  useEffect(() => {
    const channel = supabase
      .channel("admin-conv-list")
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

  const createConv = async (dentisteId: string) => {
    const d = dentistes.find((x) => x.id === dentisteId);
    if (!d) return;
    const { data: conv } = await supabase
      .from("conversations")
      .insert({
        titre: `Conversation avec Dr ${d.prenom ?? ""} ${d.nom ?? ""}`.trim(),
        dentiste_id: dentisteId,
      })
      .select(
        `*, dentiste:profiles!conversations_dentiste_id_fkey(id, nom, prenom, avatar_url, role), commande:commandes(numero)`
      )
      .single();
    if (conv) {
      setConversations((p) => [conv as Conversation, ...p]);
      open(conv.id);
    }
    setShowNew(false);
  };

  const filtered = conversations.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.dentiste?.nom?.toLowerCase().includes(q) ||
      c.dentiste?.prenom?.toLowerCase().includes(q) ||
      c.titre?.toLowerCase().includes(q) ||
      c.commande?.numero?.toLowerCase().includes(q)
    );
  });

  const activeConv = conversations.find((c) => c.id === activeId);

  return (
    <Card className="overflow-hidden">
      <div className="flex h-[calc(100vh-200px)] min-h-[520px]">
        <aside className="flex w-80 flex-col border-r border-gray-200">
          <div className="border-b border-gray-100 p-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher..."
                  className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-sky-500 focus:outline-none"
                />
              </div>
              <button
                onClick={() => setShowNew(!showNew)}
                className="rounded-lg bg-sky-600 p-2 text-white hover:bg-sky-700"
                title="Nouvelle conversation"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {showNew && (
              <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow">
                {dentistes.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => createConv(d.id)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-100 text-xs font-medium text-sky-700">
                      {d.prenom?.[0]}
                      {d.nom?.[0]}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        Dr {d.prenom} {d.nom}
                      </p>
                      <p className="text-xs text-gray-500">{d.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="py-12 text-center">
                <MessageSquare className="mx-auto h-10 w-10 text-gray-300" />
                <p className="mt-2 text-sm text-gray-500">Aucune conversation</p>
              </div>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.id}
                  onClick={() => open(c.id)}
                  className={`flex w-full items-start gap-3 border-b border-gray-50 px-4 py-3 text-left ${
                    activeId === c.id ? "bg-sky-50" : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-medium text-sky-700">
                    {c.dentiste?.prenom?.[0] || "?"}
                    {c.dentiste?.nom?.[0] || ""}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="truncate text-sm font-medium text-gray-900">
                        Dr {c.dentiste?.prenom} {c.dentiste?.nom}
                      </p>
                      {(unread[c.id] || 0) > 0 && (
                        <span className="ml-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-sky-600 px-1.5 text-xs font-medium text-white">
                          {unread[c.id]}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-gray-500">
                      {c.titre ||
                        (c.commande
                          ? `Commande ${c.commande.numero}`
                          : "Conversation")}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(c.derniere_activite).toLocaleDateString(
                        "fr-FR",
                        {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="flex flex-1 flex-col">
          {!activeConv ? (
            <div className="flex flex-1 flex-col items-center justify-center text-gray-400">
              <MessageSquare className="h-16 w-16" />
              <p className="mt-4 text-sm">Sélectionnez une conversation</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-gray-200 px-6 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-sm font-medium text-sky-700">
                    {activeConv.dentiste?.prenom?.[0]}
                    {activeConv.dentiste?.nom?.[0]}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      Dr {activeConv.dentiste?.prenom} {activeConv.dentiste?.nom}
                    </p>
                    {activeConv.commande && (
                      <p className="text-xs text-gray-500">
                        {activeConv.commande.numero}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <ChatThread
                conversationId={activeConv.id}
                currentUserId={currentUserId}
                authorsMap={authorsMap}
              />
            </>
          )}
        </section>
      </div>
    </Card>
  );
}
