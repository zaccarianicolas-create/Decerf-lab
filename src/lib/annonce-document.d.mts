export type AnnouncementNode = {
  type: string;
  text?: string;
  attrs?: Record<string, string | number | null>;
  marks?: { type: string; attrs?: Record<string, string | null> }[];
  content?: AnnouncementNode[];
};
export function safeAnnouncementLink(value: unknown): string | null;
export function normalizeAnnouncementDocument(value: unknown): AnnouncementNode;
export function announcementImagePaths(document: AnnouncementNode | null): string[];
export function announcementPlainText(document: AnnouncementNode): string;
export function plainAnnouncementDocument(text: string): AnnouncementNode;
export function renderAnnouncementHtml(document: AnnouncementNode, imageUrls?: Record<string, string>): string;