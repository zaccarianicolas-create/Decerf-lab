"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MessageSquare,
  Send,
  Plus,
  Search,
  Paperclip,
  Smile,
  Reply,
  X,
  Image as ImageIcon,
  File as FileIcon,
  Mic,
  MicOff,
  Check,
  CheckCheck,
} from "lucide-react";

type Conversation = {
  id: string;
  titre: string | null;
  commande_id: string | null;
  dentiste_id: string;
  derniere_activite: string;
  created_at: string;
  dentiste: {
    id: string;
    nom: string;
    prenom: string;
    email: string;
    avatar_url: string | null;
  };
  commande: { numero: string } | null;
};

type Message = {
  id: string;
  conversation_id: string;
  auteur_id: string;
  contenu: string;
  lu: boolean;
  fichier_url: string | null;
  created_at: string;
  reply_to?: string | null;
};

type Dentiste = {
  id: string;
  nom: string;
  prenom: string;
  email: string;
};

const EMOJI_LIST = [
  "😀",
  "😊",
  "👍",
  "👋",
  "🙏",
  "✅",
  "❌",
  "⏰",
  "📋",
  "🦷",
  "💉",
  "🔬",
  "📦",
  "🚀",
  "⚡",
  "💬",
  "📞",
  "📸",
  "📎",
  "⭐",
  "❤️",
  "🎉",
  "👏",
  "🤝",
];

export function MessagesPanel({
  initialConversations,
  unreadMap,
  currentUserId,
  dentistes,
}: {
  initialConversations: Conversation[];
  unreadMap: Record<string, number>;
  currentUserId: string;
  dentistes: Dentiste[];
}) {
  const supabase = createClient();
  const [conversations, setConversations] =
    useState<Conversation[]>(initialConversations);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewConv, setShowNewConv] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [unread, setUnread] = useState(unreadMap);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load messages for active conversation
  const loadMessages = useCallback(
    async (convId: string) => {
      setLoading(true);
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true });

      setMessages(data ?? []);
      setLoading(false);

      // Mark messages as read
      await supabase
        .from("messages")
        .update({ lu: true })
        .eq("conversation_id", convId)
        .neq("auteur_id", currentUserId)
        .eq("lu", false);

      setUnread((prev) => ({ ...prev, [convId]: 0 }));
    },
    [supabase, currentUserId]
  );

  // Subscribe to realtime messages
  useEffect(() => {
    const channel = supabase
      .channel("admin-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const newMsg = payload.new as Message;
          if (newMsg.conversation_id === activeConvId) {
            setMessages((prev) => [...prev, newMsg]);
            // Mark as read if we're viewing this conversation
            supabase
              .from("messages")
              .update({ lu: true })
              .eq("id", newMsg.id)
              .neq("auteur_id", currentUserId);
          } else {
            // Increment unread
            setUnread((prev) => ({
              ...prev,
              [newMsg.conversation_id]:
                (prev[newMsg.conversation_id] || 0) + 1,
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConvId, currentUserId, supabase]);

  const selectConversation = (convId: string) => {
    setActiveConvId(convId);
    setReplyTo(null);
    setShowEmoji(false);
    loadMessages(convId);
  };

  const sendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || !activeConvId) return;

    setSending(true);
    const contenu = replyTo
      ? `> ${replyTo.contenu.slice(0, 100)}\n\n${newMessage}`
      : newMessage;

    await supabase.from("messages").insert({
      conversation_id: activeConvId,
      auteur_id: currentUserId,
      contenu,
      fichier_url: null,
    });

    setNewMessage("");
    setReplyTo(null);
    setSending(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConvId) return;

    setSending(true);
    try {
      // Upload to Supabase Storage
      const fileName = `${Date.now()}_${file.name}`;
      const { data: uploadData, error } = await supabase.storage
        .from("messages-files")
        .upload(fileName, file);

      if (error) {
        // If bucket doesn't exist, send file name as message
        await supabase.from("messages").insert({
          conversation_id: activeConvId,
          auteur_id: currentUserId,
          contenu: `📎 Fichier: ${file.name}`,
          fichier_url: null,
        });
      } else {
        const {
          data: { publicUrl },
        } = supabase.storage.from("messages-files").getPublicUrl(fileName);

        const isImage = file.type.startsWith("image/");
        await supabase.from("messages").insert({
          conversation_id: activeConvId,
          auteur_id: currentUserId,
          contenu: isImage
            ? `📸 Image: ${file.name}`
            : `📎 Fichier: ${file.name}`,
          fichier_url: publicUrl,
        });
      }
    } catch {
      await supabase.from("messages").insert({
        conversation_id: activeConvId,
        auteur_id: currentUserId,
        contenu: `📎 Fichier: ${file.name}`,
        fichier_url: null,
      });
    }
    setSending(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const toggleRecording = async () => {
    if (recording) {
      // Stop recording
      mediaRecorderRef.current?.stop();
      setRecording(false);
    } else {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        chunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          chunksRef.current.push(e.data);
        };

        mediaRecorder.onstop = async () => {
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          stream.getTracks().forEach((t) => t.stop());

          if (!activeConvId) return;
          setSending(true);
          try {
            const fileName = `vocal_${Date.now()}.webm`;
            const { error } = await supabase.storage
              .from("messages-files")
              .upload(fileName, blob);

            if (error) {
              await supabase.from("messages").insert({
                conversation_id: activeConvId,
                auteur_id: currentUserId,
                contenu: "🎤 Message vocal",
                fichier_url: null,
              });
            } else {
              const {
                data: { publicUrl },
              } = supabase.storage
                .from("messages-files")
                .getPublicUrl(fileName);

              await supabase.from("messages").insert({
                conversation_id: activeConvId,
                auteur_id: currentUserId,
                contenu: "🎤 Message vocal",
                fichier_url: publicUrl,
              });
            }
          } catch {
            await supabase.from("messages").insert({
              conversation_id: activeConvId,
              auteur_id: currentUserId,
              contenu: "🎤 Message vocal",
              fichier_url: null,
            });
          }
          setSending(false);
        };

        mediaRecorder.start();
        setRecording(true);
      } catch {
        alert("Impossible d'accéder au microphone");
      }
    }
  };

  const createConversation = async (dentisteId: string) => {
    const dentiste = dentistes.find((d) => d.id === dentisteId);
    if (!dentiste) return;

    const { data: conv } = await supabase
      .from("conversations")
      .insert({
        titre: `Conversation avec Dr ${dentiste.prenom} ${dentiste.nom}`,
        dentiste_id: dentisteId,
      })
      .select(
        `*, dentiste:profiles!conversations_dentiste_id_fkey(id, nom, prenom, email, avatar_url), commande:commandes(numero)`
      )
      .single();

    if (conv) {
      setConversations((prev) => [conv, ...prev]);
      selectConversation(conv.id);
    }
    setShowNewConv(false);
  };

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.dentiste?.nom?.toLowerCase().includes(q) ||
      c.dentiste?.prenom?.toLowerCase().includes(q) ||
      c.titre?.toLowerCase().includes(q) ||
      c.commande?.numero?.toLowerCase().includes(q)
    );
  });

  const activeConv = conversations.find((c) => c.id === activeConvId);

  const getReplyMessage = (contenu: string) => {
    if (contenu.startsWith("> ")) {
      const lines = contenu.split("\n\n");
      return {
        quote: lines[0].replace(/^> /, ""),
        text: lines.slice(1).join("\n\n"),
      };
    }
    return null;
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex h-[calc(100vh-200px)] min-h-[500px]">
        {/* Sidebar — Conversations list */}
        <div className="flex w-80 flex-col border-r border-gray-200">
          <div className="border-b border-gray-100 p-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
              <button
                onClick={() => setShowNewConv(!showNewConv)}
                className="rounded-lg bg-sky-600 p-2 text-white hover:bg-sky-700"
                title="Nouvelle conversation"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* New conversation dropdown */}
            {showNewConv && (
              <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                {dentistes.length === 0 ? (
                  <p className="p-3 text-sm text-gray-500">
                    Aucun dentiste disponible
                  </p>
                ) : (
                  dentistes.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => createConversation(d.id)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-xs font-medium text-sky-700">
                        {d.prenom[0]}
                        {d.nom[0]}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          Dr {d.prenom} {d.nom}
                        </p>
                        <p className="text-xs text-gray-500">{d.email}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Conversations list */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MessageSquare className="h-10 w-10 text-gray-300" />
                <p className="mt-2 text-sm text-gray-500">
                  Aucune conversation
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => selectConversation(conv.id)}
                  className={`flex w-full items-start gap-3 border-b border-gray-50 px-4 py-3 text-left transition-colors ${
                    activeConvId === conv.id
                      ? "bg-sky-50"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-medium text-sky-700">
                    {conv.dentiste?.prenom?.[0] || "?"}
                    {conv.dentiste?.nom?.[0] || ""}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="truncate text-sm font-medium text-gray-900">
                        Dr {conv.dentiste?.prenom} {conv.dentiste?.nom}
                      </p>
                      {(unread[conv.id] || 0) > 0 && (
                        <span className="ml-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-sky-600 px-1.5 text-xs font-medium text-white">
                          {unread[conv.id]}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-gray-500">
                      {conv.titre ||
                        (conv.commande
                          ? `Commande ${conv.commande.numero}`
                          : "Conversation")}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(conv.derniere_activite).toLocaleDateString(
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
        </div>

        {/* Main — Messages area */}
        <div className="flex flex-1 flex-col">
          {!activeConvId ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <MessageSquare className="h-16 w-16 text-gray-200" />
              <p className="mt-4 text-lg font-medium text-gray-400">
                Sélectionnez une conversation
              </p>
              <p className="text-sm text-gray-400">
                ou créez-en une nouvelle
              </p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-sm font-medium text-sky-700">
                    {activeConv?.dentiste?.prenom?.[0] || "?"}
                    {activeConv?.dentiste?.nom?.[0] || ""}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      Dr {activeConv?.dentiste?.prenom}{" "}
                      {activeConv?.dentiste?.nom}
                    </p>
                    <p className="text-xs text-gray-500">
                      {activeConv?.dentiste?.email}
                    </p>
                  </div>
                </div>
                {activeConv?.commande && (
                  <span className="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-600">
                    {activeConv.commande.numero}
                  </span>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto bg-gray-50 px-6 py-4">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-600 border-t-transparent" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <p className="text-sm text-gray-400">
                      Aucun message. Commencez la conversation !
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((msg) => {
                      const isMe = msg.auteur_id === currentUserId;
                      const reply = getReplyMessage(msg.contenu);
                      const isVocal = msg.contenu === "🎤 Message vocal";
                      const isImage = msg.contenu.startsWith("📸 Image:");

                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                        >
                          <div className="group relative max-w-[70%]">
                            <div
                              className={`rounded-2xl px-4 py-2.5 ${
                                isMe
                                  ? "bg-sky-600 text-white"
                                  : "bg-white text-gray-900 shadow-sm"
                              }`}
                            >
                              {/* Reply quote */}
                              {reply && (
                                <div
                                  className={`mb-1.5 rounded border-l-2 px-2 py-1 text-xs ${
                                    isMe
                                      ? "border-sky-300 bg-sky-700/50"
                                      : "border-gray-300 bg-gray-50"
                                  }`}
                                >
                                  {reply.quote}
                                </div>
                              )}

                              {/* Vocal with audio player */}
                              {isVocal && msg.fichier_url ? (
                                <audio
                                  controls
                                  src={msg.fichier_url}
                                  className="max-w-full"
                                />
                              ) : isImage && msg.fichier_url ? (
                                <div>
                                  <img
                                    src={msg.fichier_url}
                                    alt="Image"
                                    className="max-h-60 rounded-lg"
                                  />
                                </div>
                              ) : msg.fichier_url &&
                                !isVocal &&
                                !isImage ? (
                                <a
                                  href={msg.fichier_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`flex items-center gap-1.5 underline ${isMe ? "text-sky-100" : "text-sky-600"}`}
                                >
                                  <FileIcon className="h-4 w-4" />
                                  {reply ? reply.text : msg.contenu}
                                </a>
                              ) : (
                                <p className="whitespace-pre-wrap text-sm">
                                  {reply ? reply.text : msg.contenu}
                                </p>
                              )}

                              <div
                                className={`mt-1 flex items-center gap-1 text-[10px] ${
                                  isMe ? "text-sky-200" : "text-gray-400"
                                }`}
                              >
                                {new Date(msg.created_at).toLocaleTimeString(
                                  "fr-FR",
                                  { hour: "2-digit", minute: "2-digit" }
                                )}
                                {isMe &&
                                  (msg.lu ? (
                                    <CheckCheck className="h-3 w-3" />
                                  ) : (
                                    <Check className="h-3 w-3" />
                                  ))}
                              </div>
                            </div>

                            {/* Reply button on hover */}
                            <button
                              onClick={() => setReplyTo(msg)}
                              className={`absolute top-1/2 -translate-y-1/2 rounded-full bg-white p-1 shadow opacity-0 transition-opacity group-hover:opacity-100 ${
                                isMe ? "-left-8" : "-right-8"
                              }`}
                              title="Répondre"
                            >
                              <Reply className="h-3.5 w-3.5 text-gray-500" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Reply bar */}
              {replyTo && (
                <div className="flex items-center gap-2 border-t border-gray-100 bg-gray-50 px-6 py-2">
                  <Reply className="h-4 w-4 text-sky-600" />
                  <p className="flex-1 truncate text-sm text-gray-600">
                    {replyTo.contenu.slice(0, 80)}
                  </p>
                  <button
                    onClick={() => setReplyTo(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Input area */}
              <div className="border-t border-gray-200 bg-white p-4">
                {/* Emoji picker */}
                {showEmoji && (
                  <div className="mb-2 flex flex-wrap gap-1 rounded-lg border border-gray-200 bg-white p-2">
                    {EMOJI_LIST.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => {
                          setNewMessage((prev) => prev + emoji);
                          setShowEmoji(false);
                        }}
                        className="rounded p-1 text-lg hover:bg-gray-100"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                <form
                  onSubmit={sendMessage}
                  className="flex items-center gap-2"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                    accept="image/*,.pdf,.stl,.obj,.zip,.rar,.doc,.docx"
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    title="Joindre un fichier"
                  >
                    <Paperclip className="h-5 w-5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowEmoji(!showEmoji)}
                    className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    title="Emojis"
                  >
                    <Smile className="h-5 w-5" />
                  </button>

                  <button
                    type="button"
                    onClick={toggleRecording}
                    className={`rounded-lg p-2 ${
                      recording
                        ? "animate-pulse bg-red-100 text-red-600"
                        : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    }`}
                    title={recording ? "Arrêter" : "Message vocal"}
                  >
                    {recording ? (
                      <MicOff className="h-5 w-5" />
                    ) : (
                      <Mic className="h-5 w-5" />
                    )}
                  </button>

                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Écrivez un message..."
                    className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    disabled={recording}
                  />

                  <Button
                    type="submit"
                    disabled={!newMessage.trim() || sending}
                    className="bg-sky-600 hover:bg-sky-700"
                    size="sm"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
