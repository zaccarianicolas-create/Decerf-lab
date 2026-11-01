"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { MessageSquare, Plus } from "lucide-react";
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
  currentUserId,
  authorsMap,
  isEmbed,
}: {
  initialConversations: Conversation[];
  currentUserId: string;
  authorsMap: Record<string, Author>;
  isEmbed?: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [activeId, setActiveId] = useState<string | null>(
    initialConversations[0]?.id ?? null
  );
  const [conversations, setConversations] = useState(initialConversations);
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
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "conversations", filter: `dentiste_id=eq.${currentUserId}` }, (payload) => {
        const conversation = { ...payload.new, commande: null } as Conversation;
        setConversations((current) => [conversation, ...current.filter((existing) => existing.id !== conversation.id)]);
        setActiveId((current) => current ?? conversation.id);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, activeId, currentUserId]);

  const open = (id: string) => {
    setActiveId(id);
  };

  const createConversation = async () => {
    const existingConversation = conversations[0];
    if (existingConversation) {
      open(existingConversation.id);
      return;
    }

    setCreating(true);
    setError(null);
    const { data: conversationId, error: ensureError } = await supabase.rpc(
      "get_or_create_dentist_conversation",
      { p_dentiste_id: currentUserId }
    );
    if (ensureError || !conversationId) {
      setCreating(false);
      setError(ensureError?.message || "Impossible de créer la conversation.");
      return;
    }
    const { data, error: createError } = await supabase
      .from("conversations")
      .select("id, titre, commande_id, derniere_activite, commande:commandes(numero)")
      .eq("id", conversationId)
      .single();
    setCreating(false);
    if (createError || !data) {
      setError(createError?.message || "Impossible de créer la conversation.");
      return;
    }
    const conversation = data as Conversation;
    setConversations((current) => [conversation, ...current.filter((existing) => existing.id !== conversation.id)]);
    open(conversation.id);
  };

  const active = conversations.find((c) => c.id === activeId);

  if (conversations.length === 0) {
    return (
      <Card className={isEmbed ? "h-full rounded-none border-0 shadow-none" : ""}>
        <div className="flex h-full flex-col">
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
            : "flex h-[calc(100vh-200px)] min-h-[520px] flex-col"
        }`}
      >
        <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {active && (
            <>
              <ChatThread
                key={active.id}
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
