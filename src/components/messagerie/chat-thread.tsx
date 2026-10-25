"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Send,
  Camera,
  Paperclip,
  Smile,
  Reply,
  X,
  Trash2,
  Edit3,
  CornerUpLeft,
  Mic,
  MicOff,
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
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [reactionTargetId, setReactionTargetId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const load = useCallback(async () => {
    const { data: msgs } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    const refreshedMessages = await Promise.all(
      ((msgs ?? []) as ChatMessage[]).map(async (message) => {
        if (!message.attachment_bucket || !message.attachment_path) return message;
        const { data } = await supabase.storage
          .from(message.attachment_bucket)
          .createSignedUrl(message.attachment_path, 60 * 60);
        return data?.signedUrl ? { ...message, attachment_url: data.signedUrl } : message;
      })
    );
    let loadedReactions: Reaction[] = [];
    if (msgs && msgs.length > 0) {
      const ids = (msgs as ChatMessage[]).map((m) => m.id);
      const { data: rx } = await supabase
        .from("message_reactions")
        .select("*")
        .in("message_id", ids);
      loadedReactions = (rx ?? []) as Reaction[];
    }

    startTransition(() => {
      setMessages(refreshedMessages);
      setReactions(loadedReactions);
      setLoading(false);
    });

    // Mark unread incoming as read
    await supabase.rpc("mark_conversation_messages_read", {
      p_conversation_id: conversationId,
    });
  }, [supabase, conversationId]);

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
              void supabase.rpc("mark_conversation_messages_read", {
                p_conversation_id: conversationId,
              });
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
    setMessageError(null);

    if (editing) {
      const { error } = await supabase
        .from("messages")
        .update({ contenu: input, edited_at: new Date().toISOString() })
        .eq("id", editing.id);
      if (error) {
        setMessageError("Impossible de modifier ce message.");
        return;
      }
      setEditing(null);
      setInput("");
      if (textareaRef.current) textareaRef.current.style.height = "44px";
      return;
    }

    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      auteur_id: currentUserId,
      contenu: input,
      message_type: "text",
      reply_to_id: replyTo?.id ?? null,
    });
    if (error) {
      setMessageError("Le message n’a pas pu être envoyé. Vérifie ta connexion et réessaie.");
      return;
    }
    setInput("");
    setReplyTo(null);
    if (textareaRef.current) textareaRef.current.style.height = "44px";
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    await uploadAttachment(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  const onCameraPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadAttachment(file);
    if (cameraRef.current) cameraRef.current.value = "";
  };

  const uploadAttachment = async (file: File) => {
    setUploadError(null);
    if (file.size > 100 * 1024 * 1024) {
      setUploadError("Le fichier dépasse la limite de 100 Mo.");
      return;
    }
    setUploading(true);
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${conversationId}/${currentUserId}/${Date.now()}-${safeFileName}`;
    const { error } = await supabase.storage
      .from("messages")
      .upload(path, file, { contentType: file.type });

    if (error) {
      console.error(error);
      setUploadError("Impossible d’envoyer cette pièce jointe. Réessaie ou réduis sa taille.");
      setUploading(false);
      return;
    }

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    const isAudio = file.type.startsWith("audio/");
    const isPdf = file.type === "application/pdf";

    const messageId = crypto.randomUUID();
    const { error: insertError } = await supabase.from("messages").insert({
      id: messageId,
      conversation_id: conversationId,
      auteur_id: currentUserId,
      contenu: null,
      message_type: isImage ? "image" : isVideo ? "video" : isAudio ? "audio" : isPdf ? "pdf" : "file",
      reply_to_id: replyTo?.id ?? null,
      attachment_url: null,
      attachment_name: file.name,
      attachment_mime: file.type,
      attachment_size: file.size,
      attachment_bucket: "messages",
      attachment_path: path,
    });

    if (insertError) {
      setUploadError("Le fichier est envoyé, mais le message n’a pas pu être enregistré.");
      setUploading(false);
      return;
    }

    const { data: signed } = await supabase.storage
      .from("messages")
      .createSignedUrl(path, 60 * 60);
    if (signed?.signedUrl) {
      const { error: updateError } = await supabase
        .from("messages")
        .update({ attachment_url: signed.signedUrl })
        .eq("id", messageId);
      if (updateError) {
        setUploadError("Le fichier est conservé ; son lien sera rafraîchi au prochain affichage.");
      }
    }

    setReplyTo(null);
    setUploading(false);
  };

  const toggleRecording = async () => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
      setRecording(false);
      return;
    }
    setUploadError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        stream.getTracks().forEach((track) => track.stop());
        setUploadError("L’enregistrement vocal a échoué.");
      };
      recorder.onstop = async () => {
        setRecording(false);
        stream.getTracks().forEach((track) => track.stop());
        const mimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const extension = mimeType.includes("mp4") ? "m4a" : "webm";
        await uploadAttachment(new File([blob], `vocal-${Date.now()}.${extension}`, { type: mimeType }));
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setUploadError("Autorise l’accès au microphone pour enregistrer un vocal.");
    }
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

  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? input.length;
    const end = textarea?.selectionEnd ?? input.length;
    const nextInput = `${input.slice(0, start)}${emoji}${input.slice(end)}`;
    setInput(nextInput);
    setShowEmoji(false);
    requestAnimationFrame(() => {
      const currentTextarea = textareaRef.current;
      if (!currentTextarea) return;
      currentTextarea.style.height = "auto";
      currentTextarea.style.height = `${Math.min(currentTextarea.scrollHeight, 160)}px`;
      currentTextarea.focus();
      currentTextarea.setSelectionRange(start + emoji.length, start + emoji.length);
    });
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
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto bg-gray-50 px-4 py-4">
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
                            className="max-h-80 max-w-full rounded-lg object-contain"
                          />
                        </a>
                        ) : msg.message_type === "video" && msg.attachment_url ? (
                          <video controls preload="metadata" src={msg.attachment_url} className="max-h-80 max-w-full rounded-lg" />
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
                      className={`mt-0.5 flex gap-0.5 text-[10px] text-gray-400 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 ${isMe ? "justify-end" : ""}`}
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
        <div className="relative z-20 flex-shrink-0 border-t border-gray-200 bg-white p-3">
            {messageError && <p role="alert" className="mb-2 text-xs text-red-600">{messageError}</p>}
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

          <div className="flex items-end gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              aria-label="Joindre un fichier"
              title="Joindre un fichier"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
              hidden
              onChange={onFile}
            />
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              disabled={uploading}
              aria-label="Prendre une photo"
              title="Prendre une photo"
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
            >
              <Camera className="h-4 w-4" />
            </button>
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={onCameraPhoto}
            />

            <button
              type="button"
              onClick={toggleRecording}
              disabled={uploading}
              aria-label={recording ? "Arrêter le vocal" : "Enregistrer un vocal"}
              className={`rounded-md p-2 ${recording ? "bg-red-50 text-red-600" : "text-gray-500 hover:bg-gray-100"}`}
              title={recording ? "Arrêter le vocal" : "Vocal"}
            >
              {recording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>

            <div className="relative flex-1">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.currentTarget.style.height = "auto";
                  e.currentTarget.style.height = `${Math.min(e.currentTarget.scrollHeight, 160)}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={1}
                placeholder="Votre message..."
                className="max-h-40 min-h-11 w-full min-w-0 resize-none overflow-y-auto rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
              />
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowEmoji((visible) => !visible)}
                aria-label="Choisir un emoji"
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                title="Emoji"
              >
                <Smile className="h-4 w-4" />
              </button>
              {showEmoji && (
                <div className="absolute bottom-full right-0 z-30 mb-2 grid max-h-44 w-64 max-w-[calc(100vw-32px)] grid-cols-6 gap-1 overflow-y-auto rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
                  {EMOJI_PALETTE.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => insertEmoji(e)}
                      aria-label={`Insérer ${e}`}
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
          {uploadError && <p role="alert" className="mt-2 text-xs text-red-600">{uploadError}</p>}
        </div>
      )}
    </div>
  );
}
