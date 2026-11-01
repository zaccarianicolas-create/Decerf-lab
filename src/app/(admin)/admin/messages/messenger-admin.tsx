"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import {
  ArrowLeft,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
} from "lucide-react";
import { ChatThread } from "@/components/messagerie/chat-thread";
import type { LabChatAuthor, LabChatContact, LabChatConversation } from "@/lib/lab-messenger";

export function MessengerAdmin({
  initialConversations,
  unreadMap: initialUnread,
  currentUserId,
  contacts,
  authorsMap,
  initialOpenNew,
  initialActiveId,
  isEmbed,
}: {
  initialConversations: LabChatConversation[];
  unreadMap: Record<string, number>;
  currentUserId: string;
  contacts: LabChatContact[];
  authorsMap: Record<string, LabChatAuthor>;
  initialOpenNew?: boolean;
  initialActiveId?: string;
  isEmbed?: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [conversations, setConversations] =
    useState<LabChatConversation[]>(initialConversations);
  const [activeId, setActiveId] = useState<string | null>(
    initialConversations.find((conversation) => conversation.id === initialActiveId)?.id ?? initialConversations[0]?.id ?? null
  );
  const [unread, setUnread] = useState(initialUnread);
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(Boolean(initialOpenNew));
  const [isConversationListCollapsed, setIsConversationListCollapsed] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const peer = (conversation: LabChatConversation) => conversation.dentiste ?? authorsMap[
    conversation.private_user_low === currentUserId ? conversation.private_user_high ?? "" : conversation.private_user_low ?? ""
  ];
  const label = (person?: LabChatAuthor | LabChatContact) => {
    const name = [person?.prenom, person?.nom].filter(Boolean).join(" ");
    return person?.role === "dentiste" ? `Dr ${name}` : name || "Membre du laboratoire";
  };

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => undefined);
    }
  }, []);

  // Realtime sur nouvelles convs + activité
  useEffect(() => {
    const refreshUnread = async () => {
      const { data, error } = await supabase.rpc("get_chat_unread_counts");
      if (!error) setUnread(Object.fromEntries((data ?? []).map((row: { conversation_id: string; unread_count: number | string }) => [row.conversation_id, Number(row.unread_count)])));
    };
    const channel = supabase
      .channel("admin-conv-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        (payload) => {
          void refreshUnread();
          if (payload.eventType !== "INSERT") return;
          const m = payload.new as { conversation_id: string; auteur_id: string };
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
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, (payload) => {
        if (payload.eventType === "DELETE") {
          setConversations((current) => current.filter((conversation) => conversation.id !== payload.old.id));
          return;
        }
        const row = payload.new as Omit<LabChatConversation, "dentiste">;
        const conversation: LabChatConversation = { ...row, dentiste: row.dentiste_id ? authorsMap[row.dentiste_id] ?? null : null };
        setConversations((current) => [conversation, ...current.filter((existing) => existing.id !== conversation.id)]
          .sort((first, second) => second.derniere_activite.localeCompare(first.derniere_activite)));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "conversation_participants" }, () => {
        void refreshUnread();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, activeId, currentUserId, authorsMap]);

  const open = (id: string) => {
    setActiveId(id);
    setUnread((u) => ({ ...u, [id]: 0 }));
  };

  const createConv = async (recipientId: string) => {
    const d = contacts.find((contact) => contact.id === recipientId);
    if (!d) return;
    const existingConversation = conversations.find(
      (conversation) => d.role === "dentiste"
        ? conversation.dentiste_id === recipientId
        : !conversation.dentiste_id && peer(conversation)?.id === recipientId
    );
    if (existingConversation) {
      open(existingConversation.id);
      setShowNew(false);
      return;
    }
    setCreating(true);
    setCreateError(null);
    const { data: conversationId, error: ensureError } = d.role === "dentiste"
      ? await supabase.rpc("get_or_create_dentist_conversation", { p_dentiste_id: recipientId })
      : await supabase.rpc("get_or_create_internal_conversation", { p_recipient_id: recipientId });
    if (ensureError || !conversationId) {
      setCreating(false);
      setCreateError(ensureError?.message || "Impossible de créer la conversation.");
      return;
    }
    const { data: conv, error } = await supabase
      .from("conversations")
      .select(
        "id, titre, commande_id, dentiste_id, private_user_low, private_user_high, derniere_activite"
      )
      .eq("id", conversationId)
      .single();
    setCreating(false);
    if (error) {
      setCreateError(error.message);
      return;
    }
    if (conv) {
      const conversation: LabChatConversation = { ...conv, dentiste: conv.dentiste_id ? authorsMap[conv.dentiste_id] ?? null : null };
      setConversations((p) => [conversation, ...p.filter((current) => current.id !== conv.id)]);
      open(conv.id);
    }
    setShowNew(false);
  };

  const filtered = conversations.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      label(peer(c)).toLowerCase().includes(q) ||
      c.titre?.toLowerCase().includes(q)
    );
  });

  const activeConv = conversations.find((c) => c.id === activeId);
  const hasSearch = search.trim().length > 0;
  const isEmbedEmpty = Boolean(isEmbed) && conversations.length === 0;

  if (isEmbedEmpty) {
    return (
      <Card className="h-full overflow-hidden rounded-none border-0 shadow-none">
        <div className="flex h-full flex-col">
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
                type="button"
                onClick={() => setShowNew(!showNew)}
                disabled={creating}
                aria-label="Nouvelle conversation"
                title="Nouvelle conversation"
                className="rounded-lg bg-sky-600 p-2 text-white hover:bg-sky-700"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {showNew && (
              <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow">
                {contacts.length === 0 ? (
                  <p className="p-3 text-sm text-gray-500">
                    Aucun contact disponible.
                  </p>
                ) : (
                  contacts.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => createConv(d.id)}
                      disabled={creating}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-100 text-xs font-medium text-sky-700">
                        {d.prenom?.[0]}
                        {d.nom?.[0]}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {label(d)}
                        </p>
                        <p className="text-xs text-gray-500">{d.role === "dentiste" ? "Dentiste" : d.role === "admin" ? "Administrateur · Privé" : "Collaborateur · Privé"}</p>
                      </div>
                    </button>
                  ))
                )}
                {createError && <p role="alert" className="p-3 text-xs text-red-600">{createError}</p>}
              </div>
            )}
          </div>

          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center text-gray-500">
            <MessageSquare className="h-12 w-12 text-gray-300" />
            <p className="mt-3 text-base font-medium text-gray-700">Aucune conversation</p>
            <p className="mt-1 text-sm">
              Aucun échange pour le moment.
            </p>
            <button
              type="button"
              onClick={() => setShowNew((visible) => !visible)}
              disabled={creating}
              className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-md bg-sky-600 px-4 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {showNew ? "Masquer les contacts" : "Démarrer une conversation"}
            </button>
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
            ? "flex h-full min-h-0 flex-col md:flex-row"
            : "flex h-[calc(100dvh-9rem)] min-h-[420px] flex-col md:h-[calc(100vh-200px)] md:min-h-[520px] md:flex-row"
        }`}
      >
        <aside
          className={`flex-col border-gray-200 ${
            isEmbed
              ? `h-full min-h-0 border-b md:shrink-0 md:border-b-0 md:border-r ${activeId ? "hidden md:flex" : "flex"} ${isConversationListCollapsed ? "md:w-16" : "md:w-72"}`
              : `w-full border-b md:w-80 md:border-b-0 md:border-r ${activeId ? "hidden md:flex" : "flex"}`
          }`}
        >
          {isEmbed && isConversationListCollapsed ? (
            <div className="hidden shrink-0 flex-col items-center gap-2 border-b border-gray-100 py-3 md:flex">
              <button
                type="button"
                onClick={() => setIsConversationListCollapsed(false)}
                aria-label="Développer la liste des conversations"
                title="Développer la liste"
                className="rounded-md p-2 text-gray-600 hover:bg-gray-100"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsConversationListCollapsed(false);
                  setShowNew(true);
                }}
                aria-label="Nouvelle conversation"
                title="Nouvelle conversation"
                className="rounded-md bg-sky-600 p-2 text-white hover:bg-sky-700"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="shrink-0 border-b border-gray-100 p-3">
              <div className="flex items-center gap-2">
                <div className="relative min-w-0 flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Rechercher..."
                    className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-sky-500 focus:outline-none"
                  />
                </div>
                {isEmbed && (
                  <button
                    type="button"
                    onClick={() => setIsConversationListCollapsed(true)}
                    aria-label="Réduire la liste des conversations"
                    title="Réduire la liste"
                    className="hidden rounded-md p-2 text-gray-600 hover:bg-gray-100 md:inline-flex"
                  >
                    <PanelLeftClose className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  disabled={creating}
                  aria-label="Nouvelle conversation"
                  title="Nouvelle conversation"
                  className="rounded-lg bg-sky-600 p-2 text-white hover:bg-sky-700"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              {showNew && (
                <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow">
                  {contacts.length === 0 ? (
                    <p className="p-3 text-sm text-gray-500">
                      Aucun contact disponible.
                    </p>
                  ) : (
                    contacts.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => createConv(d.id)}
                        disabled={creating}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
                      >
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-100 text-xs font-medium text-sky-700">
                          {d.prenom?.[0]}
                          {d.nom?.[0]}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{label(d)}</p>
                          <p className="text-xs text-gray-500">{d.role === "dentiste" ? "Dentiste" : d.role === "admin" ? "Administrateur · Privé" : "Collaborateur · Privé"}</p>
                        </div>
                      </button>
                    ))
                  )}
                  {createError && <p role="alert" className="p-3 text-xs text-red-600">{createError}</p>}
                </div>
              )}
            </div>
          )}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="py-12 text-center">
                <MessageSquare className="mx-auto h-10 w-10 text-gray-300" />
                <p className="mt-2 text-sm text-gray-500">
                  {hasSearch
                    ? `Aucun résultat pour "${search}"`
                    : "Aucune conversation"}
                </p>
              </div>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.id}
                  onClick={() => open(c.id)}
                  title={label(peer(c))}
                  aria-label={`Ouvrir la conversation avec ${label(peer(c))}`}
                  className={`flex w-full items-start gap-3 border-b border-gray-50 px-4 py-3 text-left ${
                    activeId === c.id ? "bg-sky-50" : "hover:bg-gray-50"
                  } ${isEmbed && isConversationListCollapsed ? "justify-center px-2 md:items-center" : ""}`}
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-medium text-sky-700">
                    {peer(c)?.prenom?.[0] || "?"}
                    {peer(c)?.nom?.[0] || ""}
                  </div>
                  <div className={`min-w-0 flex-1 ${isEmbed && isConversationListCollapsed ? "md:hidden" : ""}`}>
                    <div className="flex items-center justify-between">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {label(peer(c))}
                      </p>
                      {(unread[c.id] || 0) > 0 && (
                        <span className="ml-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-sky-600 px-1.5 text-xs font-medium text-white">
                          {unread[c.id]}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-gray-500">
                      {c.dentiste_id ? "Dentiste · Équipe du laboratoire" : "Échange interne · Privé"}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(c.derniere_activite).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className={`min-h-0 min-w-0 flex-1 flex-col overflow-hidden ${activeId ? "flex" : "hidden md:flex"}`}>
          {!activeConv ? (
            <div className="flex flex-1 flex-col items-center justify-center text-gray-400">
              <MessageSquare className="h-16 w-16" />
              <p className="mt-4 text-sm">{conversations.length === 0 ? "Aucune conversation pour le moment." : "Sélectionnez une conversation"}</p>
              {conversations.length === 0 && (
                <button
                  type="button"
                  onClick={() => setShowNew(true)}
                  className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-md bg-sky-600 px-4 text-sm font-medium text-white hover:bg-sky-700"
                >
                  <Plus className="h-4 w-4" /> Nouvelle conversation
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-gray-200 px-3 py-3 md:px-6">
                <div className="flex min-w-0 items-center gap-3">
                  <button type="button" className="rounded-md p-2 text-gray-600 hover:bg-gray-100 md:hidden" onClick={() => setActiveId(null)} aria-label="Retour aux conversations">
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-medium text-sky-700">
                    {peer(activeConv)?.prenom?.[0]}
                    {peer(activeConv)?.nom?.[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-900">
                      {label(peer(activeConv))}
                    </p>
                    <p className="truncate text-xs text-gray-500">{activeConv.dentiste_id ? "Dentiste · Équipe du laboratoire" : "Échange interne · Privé"}</p>
                  </div>
                </div>
              </div>
              <ChatThread
                key={activeConv.id}
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
