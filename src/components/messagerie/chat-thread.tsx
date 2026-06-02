"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Send,
  Paperclip,
  Smile,
  Reply,
  X,
  Trash2,
  Edit3,
  CornerUpLeft,
} from "lucide-react";

type Author = {
  id: string;
  nom: string | null;
  prenom: string | null;
  avatar_url: string | null;
  role: string | null;
};

export type ChatMessage = {
  id: string;
  conversation_id: string;
  auteur_id: string;
  contenu: string | null;
  message_type: string;
  reply_to_id: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_mime: string | null;
  attachment_size: number | null;
  attachment_path: string | null;
  attachment_bucket: string | null;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
};

type Reaction = {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
};

const EMOJI_PALETTE = [
  "👍", "❤️", "😂", "😮", "😢", "🙏", "🎉", "🔥",
  "✅", "❌", "👏", "🤝", "💪", "🦷", "🚀", "💡",
];

const QUICK_REACTIONS = ["👍", "❤️", "😂", "🎉", "🙏", "🔥"];

export function ChatThread({
  conversationId,
  currentUserId,
  authorsMap,
  readOnly,
}: {
  conversationId: string;
  currentUserId: string;
  authorsMap: Record<string, Author>;
  readOnly?: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editing, setEditing] = useState<ChatMessage | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [reactionTargetId, setReactionTargetId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: msgs } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    setMessages((msgs ?? []) as ChatMessage[]);

    if (msgs && msgs.length > 0) {
      const ids = (msgs as ChatMessage[]).map((m) => m.id);
      const { data: rx } = await supabase
        .from("message_reactions")
        .select("*")
        .in("message_id", ids);
      setReactions((rx ?? []) as Reaction[]);
    }

    setLoading(false);

    // Mark unread incoming as read
    await supabase
      .from("messages")
      .update({ lu: true })
      .eq("conversation_id", conversationId)
      .neq("auteur_id", currentUserId)
      .eq("lu", false);
  }, [supabase, conversationId, currentUserId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, reactions]);

  useEffect(() => {
    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setMessages((p) => [...p, payload.new as ChatMessage]);
            if ((payload.new as ChatMessage).auteur_id !== currentUserId) {
              supabase
                .from("messages")
                .update({ lu: true })
                .eq("id", (payload.new as ChatMessage).id);
            }
          } else if (payload.eventType === "UPDATE") {
            setMessages((p) =>
              p.map((m) =>
                m.id === (payload.new as ChatMessage).id
                  ? (payload.new as ChatMessage)
                  : m
              )
            );
          } else if (payload.eventType === "DELETE") {
            setMessages((p) =>
              p.filter((m) => m.id !== (payload.old as ChatMessage).id)
            );
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message_reactions" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setReactions((p) => [...p, payload.new as Reaction]);
          } else if (payload.eventType === "DELETE") {
            setReactions((p) =>
              p.filter((r) => r.id !== (payload.old as Reaction).id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, conversationId, currentUserId]);

  const send = async () => {
    if (!input.trim() && !editing) return;

    if (editing) {
      await supabase
        .from("messages")
        .update({ contenu: input, edited_at: new Date().toISOString() })
        .eq("id", editing.id);
      setEditing(null);
      setInput("");
      return;
    }

    await supabase.from("messages").insert({
      conversation_id: conversationId,
      auteur_id: currentUserId,
      contenu: input,
      message_type: "text",
      reply_to_id: replyTo?.id ?? null,
    });
    setInput("");
    setReplyTo(null);
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const path = `${conversationId}/${currentUserId}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage
      .from("messages")
      .upload(path, file, { contentType: file.type });

    if (error) {
      console.error(error);
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    const { data: signed } = await supabase.storage
      .from("messages")
      .createSignedUrl(path, 60 * 60 * 24 * 7); // 7 jours

    const isImage = file.type.startsWith("image/");
    const isAudio = file.type.startsWith("audio/");
    const isPdf = file.type === "application/pdf";

    await supabase.from("messages").insert({
      conversation_id: conversationId,
      auteur_id: currentUserId,
      contenu: null,
      message_type: isImage ? "image" : isAudio ? "audio" : isPdf ? "pdf" : "file",
      reply_to_id: replyTo?.id ?? null,
      attachment_url: signed?.signedUrl ?? null,
      attachment_name: file.name,
      attachment_mime: file.type,
      attachment_size: file.size,
      attachment_bucket: "messages",
      attachment_path: path,
    });

    setReplyTo(null);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const softDelete = async (msg: ChatMessage) => {
    await supabase
      .from("messages")
      .update({
        contenu: null,
        deleted_at: new Date().toISOString(),
        message_type: "deleted",
      })
      .eq("id", msg.id);
  };

  const startEdit = (msg: ChatMessage) => {
    setEditing(msg);
    setInput(msg.contenu ?? "");
    setReplyTo(null);
  };

  const toggleReaction = async (msgId: string, emoji: string) => {
    const existing = reactions.find(
      (r) =>
        r.message_id === msgId && r.user_id === currentUserId && r.emoji === emoji
    );
    if (existing) {
      await supabase.from("message_reactions").delete().eq("id", existing.id);
    } else {
      await supabase
        .from("message_reactions")
        .insert({ message_id: msgId, user_id: currentUserId, emoji });
    }
    setReactionTargetId(null);
  };

  const reactionsByMsg = useMemo(() => {
    const map: Record<string, Record<string, string[]>> = {};
    for (const r of reactions) {
      if (!map[r.message_id]) map[r.message_id] = {};
      if (!map[r.message_id][r.emoji]) map[r.message_id][r.emoji] = [];
      map[r.message_id][r.emoji].push(r.user_id);
    }
    return map;
  }, [reactions]);

  const messagesById = useMemo(() => {
    const m: Record<string, ChatMessage> = {};
    for (const x of messages) m[x.id] = x;
    return m;
  }, [messages]);

  const author = (id: string) => authorsMap[id];
  const initials = (id: string) => {
    const a = author(id);
    if (!a) return "?";
    return `${a.prenom?.[0] ?? ""}${a.nom?.[0] ?? ""}` || "?";
  };

  return (
    <div className="flex h-full min-h-[400px] flex-col">
      <div className="flex-1 overflow-y-auto bg-gray-50 px-4 py-4">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-sky-600 border-t-transparent" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-gray-400">
            Aucun message. Démarrez la conversation.
          </p>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => {
              const isMe = msg.auteur_id === currentUserId;
              const a = author(msg.auteur_id);
              const reply = msg.reply_to_id
                ? messagesById[msg.reply_to_id]
                : null;
              const rx = reactionsByMsg[msg.id] || {};
              const isDeleted = !!msg.deleted_at;

              return (
                <div
                  key={msg.id}
                  className={`flex gap-2 ${isMe ? "justify-end" : "justify-start"}`}
                >
                  {!isMe && (
                    <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-medium text-sky-700">
                      {initials(msg.auteur_id)}
                    </div>
                  )}

                  <div className={`group relative max-w-[75%] ${isMe ? "items-end" : "items-start"}`}>
                    {!isMe && a && (
                      <p className="mb-0.5 text-xs text-gray-500">
                        {a.prenom} {a.nom}
                      </p>
                    )}

                    <div
                      className={`rounded-2xl px-3.5 py-2 text-sm ${
                        isDeleted
                          ? "bg-gray-100 italic text-gray-400"
                          : isMe
                            ? "bg-sky-600 text-white"
                            : "bg-white text-gray-900 shadow-sm"
                      }`}
                    >
                      {reply && (
                        <div
                          className={`mb-1 rounded border-l-2 px-2 py-1 text-xs ${
                            isMe
                              ? "border-sky-300 bg-sky-700/40"
                              : "border-gray-300 bg-gray-50 text-gray-600"
                          }`}
                        >
                          <CornerUpLeft className="mr-1 inline h-3 w-3" />
                          {reply.contenu
                            ? reply.contenu.slice(0, 80)
                            : reply.attachment_name || "Pièce jointe"}
                        </div>
                      )}

                      {isDeleted ? (
                        <span>Message supprimé</span>
                      ) : msg.message_type === "image" && msg.attachment_url ? (
                        <a
                          href={msg.attachment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={msg.attachment_url}
                            alt={msg.attachment_name || ""}
                            className="max-h-64 rounded-lg"
                          />
                        </a>
                      ) : msg.message_type === "audio" && msg.attachment_url ? (
                        <audio controls src={msg.attachment_url} className="max-w-full" />
                      ) : msg.attachment_url ? (
                        <a
                          href={msg.attachment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center gap-1.5 underline ${isMe ? "text-sky-100" : "text-sky-600"}`}
                        >
                          <Paperclip className="h-3 w-3" />
                          {msg.attachment_name || "Fichier"}
                        </a>
                      ) : (
                        <span className="whitespace-pre-wrap break-words">
                          {msg.contenu}
                        </span>
                      )}

                      {msg.edited_at && !isDeleted && (
                        <span
                          className={`ml-2 text-[10px] ${isMe ? "text-sky-200" : "text-gray-400"}`}
                        >
                          (modifié)
                        </span>
                      )}
                    </div>

                    {/* Reactions */}
                    {Object.keys(rx).length > 0 && (
                      <div className={`mt-1 flex flex-wrap gap-1 ${isMe ? "justify-end" : ""}`}>
                        {Object.entries(rx).map(([emoji, users]) => {
                          const mine = users.includes(currentUserId);
                          return (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => toggleReaction(msg.id, emoji)}
                              className={`flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs ${
                                mine
                                  ? "border-sky-300 bg-sky-50"
                                  : "border-gray-200 bg-white"
                              }`}
                            >
                              <span>{emoji}</span>
                              <span className="text-[10px] text-gray-600">
                                {users.length}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <div
                      className={`mt-0.5 flex gap-0.5 text-[10px] text-gray-400 opacity-0 transition-opacity group-hover:opacity-100 ${isMe ? "justify-end" : ""}`}
                    >
                      {!readOnly && !isDeleted && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setReactionTargetId(
                                reactionTargetId === msg.id ? null : msg.id
                              )
                            }
                            className="rounded p-0.5 hover:bg-gray-200"
                            title="Réagir"
                          >
                            <Smile className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setReplyTo(msg)}
                            className="rounded p-0.5 hover:bg-gray-200"
                            title="Répondre"
                          >
                            <Reply className="h-3 w-3" />
                          </button>
                          {isMe && msg.message_type === "text" && (
                            <button
                              type="button"
                              onClick={() => startEdit(msg)}
                              className="rounded p-0.5 hover:bg-gray-200"
                              title="Modifier"
                            >
                              <Edit3 className="h-3 w-3" />
                            </button>
                          )}
                          {isMe && (
                            <button
                              type="button"
                              onClick={() => softDelete(msg)}
                              className="rounded p-0.5 hover:bg-gray-200"
                              title="Supprimer"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </>
                      )}
                      <span>
                        {new Date(msg.created_at).toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    {reactionTargetId === msg.id && (
                      <div
                        className={`absolute z-10 mt-1 flex gap-1 rounded-full border border-gray-200 bg-white p-1 shadow-md ${
                          isMe ? "right-0" : "left-0"
                        }`}
                      >
                        {QUICK_REACTIONS.map((e) => (
                          <button
                            key={e}
                            type="button"
                            onClick={() => toggleReaction(msg.id, e)}
                            className="rounded-full px-1.5 py-0.5 text-base hover:bg-gray-100"
                          >
                            {e}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {!readOnly && (
        <div className="border-t border-gray-200 bg-white p-3">
          {(replyTo || editing) && (
            <div className="mb-2 flex items-center justify-between rounded-lg bg-gray-50 px-2 py-1 text-xs">
              <span className="truncate">
                {editing ? (
                  <>
                    <Edit3 className="mr-1 inline h-3 w-3" /> Modification
                  </>
                ) : (
                  <>
                    <Reply className="mr-1 inline h-3 w-3" />
                    Réponse à : {replyTo!.contenu?.slice(0, 60) || replyTo!.attachment_name}
                  </>
                )}
              </span>
              <button
                type="button"
                onClick={() => {
                  setReplyTo(null);
                  setEditing(null);
                  setInput("");
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              title="Pièce jointe"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <input
              ref={fileRef}
              type="file"
              hidden
              onChange={onFile}
            />

            <div className="relative flex-1">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={1}
                placeholder="Votre message..."
                className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
              />
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowEmoji(!showEmoji)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                title="Emoji"
              >
                <Smile className="h-4 w-4" />
              </button>
              {showEmoji && (
                <div className="absolute bottom-full right-0 mb-2 grid grid-cols-8 gap-1 rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
                  {EMOJI_PALETTE.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => {
                        setInput((prev) => prev + e);
                        setShowEmoji(false);
                      }}
                      className="rounded p-1 text-base hover:bg-gray-100"
                    >
                      {e}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={send}
              disabled={uploading || (!input.trim() && !editing)}
              className="rounded-lg bg-sky-600 p-2 text-white hover:bg-sky-700 disabled:opacity-50"
              title="Envoyer"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
