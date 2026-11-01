"use client";

import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageExtension from "@tiptap/extension-image";
import { Bold, Italic, Underline, Strikethrough, List, ListOrdered, Heading2, Heading3, Quote, Link2, Link2Off, ImagePlus, Undo2, Redo2, Eraser, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { normalizeAnnouncementDocument, announcementImagePaths, safeAnnouncementLink, type AnnouncementNode } from "@/lib/annonce-document.mjs";

const ProtectedImage = ImageExtension.extend({ addAttributes() { return { ...this.parent?.(), storagePath: { default: null } }; } });

export function AnnonceRichEditor({ initialDocument, userId, onChange, onImages, onValidityChange }: {
  initialDocument: AnnouncementNode; userId: string;
  onChange: (document: AnnouncementNode) => void; onImages: (urls: Record<string, string>) => void;
  onValidityChange: (valid: boolean) => void;
}) {
  const initial = useRef(initialDocument);
  const fileRef = useRef<HTMLInputElement>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit.configure({ heading: { levels: [2, 3] }, code: false, codeBlock: false }), ProtectedImage],
    content: initialDocument,
    editorProps: { attributes: { class: "annonce-content min-h-56 p-4 outline-none", role: "textbox", "aria-label": "Message de l’annonce", "aria-multiline": "true" } },
    onUpdate: ({ editor }) => { try { onChange(normalizeAnnouncementDocument(editor.getJSON())); onValidityChange(true); setError(null); } catch (error) { onValidityChange(false); setError(error instanceof Error ? error.message : "Contenu invalide."); } },
  });
  const state = useEditorState({ editor, selector: ({ editor }) => ({ bold: editor?.isActive("bold"), italic: editor?.isActive("italic"), underline: editor?.isActive("underline"), strike: editor?.isActive("strike"), bulletList: editor?.isActive("bulletList"), orderedList: editor?.isActive("orderedList"), image: editor?.isActive("image") }) });
  useEffect(() => {
    if (!editor) return;
    onValidityChange(true);
    let cancelled = false;
    void (async () => {
      const urls: Record<string, string> = {};
      for (const path of announcementImagePaths(initial.current)) {
        const { data } = await createClient().storage.from("annonces").createSignedUrl(path, 3600);
        if (data?.signedUrl) urls[path] = data.signedUrl;
      }
      if (cancelled) return;
      const hydrate = (node: AnnouncementNode): AnnouncementNode => ({ ...node, ...(node.type === "image" ? { attrs: { ...node.attrs, src: urls[String(node.attrs?.storagePath)] || "" } } : {}), ...(node.content ? { content: node.content.map(hydrate) } : {}) });
      if (Object.keys(urls).length) editor.commands.setContent(hydrate(initial.current), { emitUpdate: false });
      onImages(urls);
    })();
    return () => { cancelled = true; };
  }, [editor, onImages, onValidityChange]);
  const uploadImage = async (file?: File) => {
    if (!file || !editor) return;
    setBusy(true); setError(null);
    onValidityChange(false);
    try {
      if (file.size > 5 * 1024 * 1024 || !["image/png", "image/jpeg", "image/webp"].includes(file.type)) throw new Error("Image PNG, JPG ou WebP de 5 Mo maximum.");
      const path = `${userId}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const supabase = createClient();
      const { error } = await supabase.storage.from("annonces").upload(path, file, { contentType: file.type });
      if (error) throw new Error(error.message);
      const { data } = await supabase.storage.from("annonces").createSignedUrl(path, 3600);
      if (!data) throw new Error("Impossible de charger l’image.");
      onImages({ [path]: data.signedUrl });
      editor.chain().focus().insertContent({ type: "image", attrs: { src: data.signedUrl, storagePath: path, alt: file.name } }).run();
    } catch (error) { setError(error instanceof Error ? error.message : "Ajout d’image impossible."); }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; try { normalizeAnnouncementDocument(editor.getJSON()); onValidityChange(true); } catch { onValidityChange(false); } }
  };
  const tool = (label: string, Icon: typeof Bold, action: () => void, active = false) => <button type="button" key={label} aria-label={label} title={label} aria-pressed={active} disabled={!editor || busy} onClick={action} className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md disabled:opacity-40 ${active ? "bg-sky-100 text-sky-800" : "text-gray-600 hover:bg-gray-100"}`}><Icon className="h-4 w-4" /></button>;
  return <div className="overflow-hidden rounded-md border border-gray-300 bg-white">
    <div className="flex flex-wrap gap-1 border-b border-gray-200 p-2" role="toolbar" aria-label="Mise en forme">
      {tool("Gras", Bold, () => { editor?.chain().focus().toggleBold().run(); }, state?.bold)}
      {tool("Italique", Italic, () => { editor?.chain().focus().toggleItalic().run(); }, state?.italic)}
      {tool("Souligné", Underline, () => { editor?.chain().focus().toggleUnderline().run(); }, state?.underline)}
      {tool("Barré", Strikethrough, () => { editor?.chain().focus().toggleStrike().run(); }, state?.strike)}
      {tool("Titre", Heading2, () => { editor?.chain().focus().toggleHeading({ level: 2 }).run(); })}
      {tool("Sous-titre", Heading3, () => { editor?.chain().focus().toggleHeading({ level: 3 }).run(); })}
      {tool("Liste à puces", List, () => { editor?.chain().focus().toggleBulletList().run(); }, state?.bulletList)}
      {tool("Liste numérotée", ListOrdered, () => { editor?.chain().focus().toggleOrderedList().run(); }, state?.orderedList)}
      {tool("Citation", Quote, () => { editor?.chain().focus().toggleBlockquote().run(); })}
      {tool("Insérer un lien", Link2, () => { setLink(editor?.getAttributes("link").href || ""); setLinkOpen((visible) => !visible); })}
      {tool("Retirer le lien", Link2Off, () => { editor?.chain().focus().unsetLink().run(); })}
      <button type="button" title="Insérer une image" aria-label="Insérer une image" disabled={!editor || busy} onClick={() => fileRef.current?.click()} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 disabled:opacity-40"><ImagePlus className="h-4 w-4" /></button>
      {state?.image && tool("Supprimer l’image", Trash2, () => { editor?.chain().focus().deleteSelection().run(); })}
      {tool("Annuler", Undo2, () => { editor?.chain().focus().undo().run(); })}
      {tool("Rétablir", Redo2, () => { editor?.chain().focus().redo().run(); })}
      {tool("Retirer la mise en forme", Eraser, () => { editor?.chain().focus().unsetAllMarks().clearNodes().run(); })}
    </div>
    {linkOpen && <div className="flex flex-wrap gap-2 border-b border-gray-200 p-2"><input aria-label="Adresse du lien" type="url" value={link} onChange={(event) => setLink(event.target.value)} placeholder="https://" className="min-w-0 flex-1 rounded-md border px-2 py-1 text-sm" /><button type="button" className="rounded-md bg-sky-600 px-3 py-1 text-sm text-white" onClick={() => { const href = safeAnnouncementLink(link); if (!href) { setError("Lien invalide."); return; } editor?.chain().focus().extendMarkRange("link").setLink({ href }).run(); setLinkOpen(false); }}><Link2 className="mr-1 inline h-4 w-4" />Appliquer</button></div>}
    <input type="file" ref={fileRef} hidden accept="image/png,image/jpeg,image/webp" onChange={(event) => { void uploadImage(event.target.files?.[0]); }} />
    <EditorContent editor={editor} />
    {busy && <p role="status" className="p-3 text-sm text-gray-500">Ajout de l’image…</p>}
    {error && <p role="alert" className="p-3 text-sm text-red-600">{error}</p>}
  </div>;
}