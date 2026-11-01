import { renderAnnouncementHtml, type AnnouncementNode } from "@/lib/annonce-document.mjs";

export function AnnonceContent({ document, text, imageUrls = {} }: {
  document?: AnnouncementNode | null; text: string; imageUrls?: Record<string, string>;
}) {
  if (!document) return <p className="whitespace-pre-wrap break-words text-sm text-gray-700">{text}</p>;
  return <div className="annonce-content min-w-0 break-words text-sm text-gray-700" dangerouslySetInnerHTML={{ __html: renderAnnouncementHtml(document, imageUrls) }} />;
}