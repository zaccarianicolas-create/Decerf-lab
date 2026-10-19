"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { ArrowLeft, MessageSquare, Plus, Search } from "lucide-react";
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
  commande: { numero: string } | { numero: string }[] | null;
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
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const createConversation = async () => {
    setCreating(true);
    setError(null);
    const { data, error: createError } = await supabase
      .from("conversations")
      .insert({ titre: "Conversation avec DECERF LAB", dentiste_id: currentUserId })
      .select("id, titre, commande_id, derniere_activite, commande:commandes(numero)")
      .single();
    setCreating(false);
    if (createError || !data) {
      setError(createError?.message || "Impossible de créer la conversation.");
      return;
    }
    const conversation = data as Conversation;
    setConversations((current) => [conversation, ...current]);
    open(conversation.id);
  };

  const active = conversations.find((c) => c.id === activeId);
  const filtered = conversations.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const commande = Array.isArray(c.commande) ? c.commande[0] : c.commande;
    return (
      c.titre?.toLowerCase().includes(q) ||
      commande?.numero?.toLowerCase().includes(q)
    );
  });

  if (conversations.length === 0) {
    return (
      <Card className={isEmbed ? "h-full rounded-none border-0 shadow-none" : ""}>
        <div className="flex h-full flex-col">
          {isEmbed && (
            <div className="border-b border-gray-100 p-3">
              <div className="flex gap-2">
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
                  type="button"
                  onClick={createConversation}
                  disabled={creating}
                  aria-label="Nouvelle conversation"
                  className="rounded-md bg-sky-600 p-2 text-white disabled:opacity-50"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <MessageSquare className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-4 text-sm text-gray-500">
            Aucune conversation pour le moment. Démarre un échange avec le laboratoire.
          </p>
          <button
            type="button"
            onClick={createConversation}
            disabled={creating}
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-md bg-sky-600 px-4 text-sm font-medium text-white disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {creating ? "Création…" : "Démarrer une conversation"}
          </button>
          {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
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
              : `w-full overflow-y-auto border-r border-gray-200 md:w-72 ${activeId ? "hidden md:block" : "block"}`
          }`}
        >
          <div className="flex items-center gap-2 border-b border-gray-100 p-3">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher…"
                className="w-full rounded-md border border-gray-200 py-2 pl-9 pr-3 text-sm"
              />
            </div>
            <button type="button" onClick={createConversation} disabled={creating} aria-label="Nouvelle conversation" className="rounded-md bg-sky-600 p-2 text-white disabled:opacity-50">
              <Plus className="h-5 w-5" />
            </button>
          </div>
          {filtered.map((c) => (
            (() => {
              const commande = Array.isArray(c.commande) ? c.commande[0] : c.commande;
              return (
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
                  {commande
                    ? `Commande ${commande.numero}`
                    : "Conversation générale"}
                </p>
              </div>
            </button>
              );
            })()
          ))}
        </aside>
        <section className={`min-w-0 flex-1 flex-col overflow-hidden ${activeId ? "flex" : "hidden md:flex"}`}>
          {active && (
            <>
              <div className="flex min-h-12 items-center gap-2 border-b border-gray-200 px-3">
                <button type="button" className="rounded-md p-2 text-gray-600 hover:bg-gray-100 md:hidden" onClick={() => setActiveId(null)} aria-label="Retour aux conversations">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <p className="truncate text-sm font-medium text-gray-900">{active.titre || "DECERF LAB"}</p>
              </div>
              <ChatThread
                conversationId={active.id}
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
