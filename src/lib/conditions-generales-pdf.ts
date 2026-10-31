import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { ParametresLabo } from "@/lib/parametres-labo";
import { formatAdresseLabo } from "@/lib/parametres-labo";
import { CONDITIONS_GENERALES_SECTIONS, CONDITIONS_GENERALES_VERSION } from "@/lib/conditions-generales-content";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 48;
const TEXT = rgb(0.13, 0.18, 0.24);
const MUTED = rgb(0.39, 0.45, 0.52);
const ACCENT = rgb(0.02, 0.34, 0.49);
const RULE = rgb(0.84, 0.88, 0.91);

function pdfSafe(value: string) {
  return value
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/\u00a0/g, " ");
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = pdfSafe(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (current && font.widthOfTextAtSize(next, size) > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

export async function createConditionsGeneralesPdf(
  params: ParametresLabo,
  logoBytes: Uint8Array
): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  document.setTitle(`Conditions générales de vente - ${params.nom_labo}`);
  document.setSubject("CGV professionnelles Decerf lab");
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  let logo = null;
  try {
    logo = await document.embedPng(logoBytes);
  } catch {
    logo = null;
  }

  let page!: PDFPage;
  let pageNumber = 0;
  let y = 0;

  const draw = (text: string, x: number, top: number, size: number, font: PDFFont, color = TEXT) => {
    page.drawText(pdfSafe(text), { x, y: top - size, size, font, color });
  };

  const addPage = () => {
    if (pageNumber > 0) {
      page.drawLine({ start: { x: MARGIN, y: 30 }, end: { x: PAGE_WIDTH - MARGIN, y: 30 }, thickness: 0.6, color: RULE });
      draw(`CGV ${params.nom_labo} · ${pageNumber}`, MARGIN, 22, 7, regular, MUTED);
    }
    page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    pageNumber += 1;
    y = PAGE_HEIGHT - MARGIN;

    if (logo) {
      const size = logo.scaleToFit(132, 42);
      page.drawImage(logo, { x: MARGIN, y: y - size.height, width: size.width, height: size.height });
    }
    draw(params.nom_labo, 218, y - 2, 13, bold, ACCENT);
    const identity = [
      formatAdresseLabo(params),
      params.numero_entreprise ? `BCE : ${params.numero_entreprise}` : null,
      params.tva_numero ? `TVA : ${params.tva_numero}` : null,
      params.telephone ? `Tél. : ${params.telephone}` : null,
      params.email_contact,
      params.site_web,
    ].filter((value): value is string => Boolean(value?.trim()));
    let identityY = y - 17;
    for (const line of identity) {
      draw(line, 218, identityY, 8, regular, MUTED);
      identityY -= 11;
    }
    y = Math.min(y - 49, identityY - 5);
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_WIDTH - MARGIN, y }, thickness: 0.8, color: RULE });
    y -= 25;

    if (pageNumber === 1) {
      draw("CONDITIONS GÉNÉRALES DE VENTE", MARGIN, y, 16, bold, ACCENT);
      y -= 23;
      draw(`${CONDITIONS_GENERALES_VERSION} · Applicables à compter de leur acceptation par le Client.`, MARGIN, y, 8, regular, MUTED);
      y -= 20;
      draw("1. Identification du Laboratoire", MARGIN, y, 11, bold);
      y -= 17;
      const identityText = [
        `Nom commercial : ${params.nom_labo}`,
        `Titulaire : ${params.titulaire_legal} (${params.forme_juridique})`,
        `Numéro BCE : ${params.numero_entreprise || "À compléter dès attribution"}`,
        `Numéro TVA : ${params.tva_numero || "À compléter"}`,
        `Adresse : ${formatAdresseLabo(params) || "À compléter dans les paramètres du laboratoire"}`,
        `Téléphone : ${params.telephone || "À compléter"}`,
        `Email : ${params.email_contact || "À compléter"}`,
        `Site : ${params.site_web || "À compléter"}`,
        `Ci-après « ${params.nom_labo} » ou « le Laboratoire ».`,
      ];
      for (const line of identityText) {
        draw(line, MARGIN, y, 8.5, regular);
        y -= 12;
      }
      y -= 8;
    }
  };

  addPage();

  const drawParagraph = (text: string, font: PDFFont, size: number, lineHeight: number, indent = 0) => {
    const lines = wrapText(text, font, size, PAGE_WIDTH - MARGIN * 2 - indent);
    if (y - lines.length * lineHeight < MARGIN + 40) addPage();
    for (const line of lines) {
      draw(line, MARGIN + indent, y, size, font);
      y -= lineHeight;
    }
    y -= 5;
  };

  for (const section of CONDITIONS_GENERALES_SECTIONS) {
    const titleLines = wrapText(section.title, bold, 11, PAGE_WIDTH - MARGIN * 2);
    if (y - titleLines.length * 15 < MARGIN + 55) addPage();
    for (const titleLine of titleLines) {
      draw(titleLine, MARGIN, y, 11, bold, ACCENT);
      y -= 15;
    }
    y -= 2;
    for (const paragraph of section.paragraphs) drawParagraph(paragraph, regular, 9, 12, 4);
    if (section.link) drawParagraph(`${section.link.label} : ${params.site_web || "https://www.decerf-lab.be"}${section.link.href}`, regular, 9, 12, 4);
    y -= 7;
  }

  page.drawLine({ start: { x: MARGIN, y: 30 }, end: { x: PAGE_WIDTH - MARGIN, y: 30 }, thickness: 0.6, color: RULE });
  draw(`CGV ${params.nom_labo} · ${pageNumber}`, MARGIN, 22, 7, regular, MUTED);
  return document.save();
}