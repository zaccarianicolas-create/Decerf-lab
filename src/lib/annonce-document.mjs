const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
const nodeTypes = new Set(["doc", "paragraph", "text", "heading", "bulletList", "orderedList", "listItem", "blockquote", "hardBreak", "horizontalRule", "image"]);
const markTypes = new Set(["bold", "italic", "underline", "strike", "link"]);

export function safeAnnouncementLink(value) {
  try {
    const url = new URL(value);
    return ["https:", "http:", "mailto:", "tel:"].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

export function normalizeAnnouncementDocument(value) {
  let count = 0;
  const visit = (node, depth = 0) => {
    if (!node || typeof node !== "object" || !nodeTypes.has(node.type) || depth > 12 || ++count > 1500) throw new Error("Contenu du message invalide.");
    const result = { type: node.type };
    if (node.type === "text") {
      if (typeof node.text !== "string" || node.text.length > 8000) throw new Error("Texte invalide.");
      result.text = node.text;
      if (node.marks) result.marks = node.marks.map((mark) => {
        if (!markTypes.has(mark.type)) throw new Error("Mise en forme non autorisée.");
        if (mark.type !== "link") return { type: mark.type };
        const href = safeAnnouncementLink(mark.attrs?.href);
        if (!href) throw new Error("Lien invalide : utilise http, https, mailto ou tel.");
        return { type: "link", attrs: { href, target: "_blank", rel: "noopener noreferrer" } };
      });
    }
    if (node.type === "heading") result.attrs = { level: [2, 3].includes(node.attrs?.level) ? node.attrs.level : 2 };
    if (node.type === "orderedList") result.attrs = { start: 1 };
    if (node.type === "image") {
      const path = node.attrs?.storagePath;
      if (typeof path !== "string" || !/^[a-f0-9-]{36}\/[a-zA-Z0-9._-]+$/.test(path) || path.includes("..")) throw new Error("Image invalide.");
      result.attrs = { storagePath: path, alt: String(node.attrs?.alt ?? "Image").slice(0, 160) };
    }
    if (node.content) {
      if (!Array.isArray(node.content) || node.type === "text" || node.type === "image") throw new Error("Contenu invalide.");
      result.content = node.content.map((child) => visit(child, depth + 1));
    }
    return result;
  };
  const document = visit(value);
  if (document.type !== "doc" || JSON.stringify(document).length > 60000) throw new Error("Message trop long ou invalide.");
  return document;
}

export function announcementImagePaths(document) {
  const paths = new Set();
  const visit = (node) => { if (node.type === "image") paths.add(node.attrs.storagePath); node.content?.forEach(visit); };
  if (document) visit(document);
  return [...paths];
}

export function announcementPlainText(document) {
  const visit = (node) => node.type === "text" ? node.text : node.type === "image" ? `[${node.attrs.alt || "Image"}]` : (node.content ?? []).map(visit).join(node.type === "paragraph" || node.type === "heading" ? "" : "\n");
  return visit(document).trim();
}

export function plainAnnouncementDocument(text) {
  return { type: "doc", content: String(text ?? "").split("\n").map((line) => ({ type: "paragraph", ...(line ? { content: [{ type: "text", text: line }] } : {}) })) };
}

export function renderAnnouncementHtml(document, imageUrls = {}) {
  const visit = (node) => {
    if (node.type === "text") {
      return (node.marks ?? []).reduce((text, mark) => {
        if (mark.type === "link") { const href = safeAnnouncementLink(mark.attrs?.href); return href ? `<a href="${escape(href)}" target="_blank" rel="noopener noreferrer">${text}</a>` : text; }
        const tag = { bold: "strong", italic: "em", underline: "u", strike: "s" }[mark.type];
        return tag ? `<${tag}>${text}</${tag}>` : text;
      }, escape(node.text));
    }
    if (node.type === "image") {
      const src = imageUrls[node.attrs?.storagePath];
      return src && safeAnnouncementLink(src)?.startsWith("https://") ? `<img src="${escape(src)}" alt="${escape(node.attrs?.alt)}" style="display:block;max-width:100%;height:auto;margin:12px 0;border-radius:4px" loading="lazy">` : "";
    }
    if (node.type === "hardBreak") return "<br>";
    if (node.type === "horizontalRule") return "<hr>";
    const children = (node.content ?? []).map(visit).join("");
    const tag = { paragraph: "p", heading: node.attrs?.level === 3 ? "h3" : "h2", bulletList: "ul", orderedList: "ol", listItem: "li", blockquote: "blockquote" }[node.type];
    return tag ? `<${tag}>${children || "<br>"}</${tag}>` : children;
  };
  return visit(normalizeAnnouncementDocument(document));
}