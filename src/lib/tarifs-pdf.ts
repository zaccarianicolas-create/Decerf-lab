import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import type { ParametresLabo } from "@/lib/parametres-labo";

export type TarifPdfService = {
  nom: string;
  categorie: string;
  description: string | null;
  prix_base_ht: number | null;
  options: { nom: string; prix_ht: number }[];
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 42;
const TEXT = rgb(0.12, 0.17, 0.24);
const MUTED = rgb(0.38, 0.44, 0.51);
const ACCENT = rgb(0.02, 0.48, 0.72);
const PALE = rgb(0.93, 0.97, 0.99);
const RULE = rgb(0.86, 0.89, 0.92);

function wrapText(text: string, font: PDFFont, size: number, width: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && font.widthOfTextAtSize(candidate, size) > width) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

export async function createTarifsPdf(
  params: ParametresLabo,
  services: TarifPdfService[],
  logoBytes: Uint8Array
) {
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const logo = await document.embedPng(logoBytes);
  const pages = [document.addPage([PAGE_WIDTH, PAGE_HEIGHT])];
  let page = pages[0];
  let y = PAGE_HEIGHT - MARGIN;

  const draw = (text: string, x: number, top: number, size = 9, font: PDFFont = regular, color = TEXT) => {
    page.drawText(text, { x, y: top - size, size, font, color });
  };
  const drawWrapped = (text: string, x: number, top: number, width: number, size = 8.5, color = MUTED) => {
    const lines = wrapText(text, regular, size, width);
    lines.forEach((line, index) => draw(line, x, top - index * 11, size, regular, color));
    return top - lines.length * 11;
  };
  const euro = (value: number) => `${Number(value || 0).toFixed(2)} EUR`;
  const formatDate = new Date().toLocaleDateString("fr-BE");

  const drawCompactHeader = () => {
    page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 56, width: PAGE_WIDTH, height: 56, color: PALE });
    const logoSize = logo.scaleToFit(92, 34);
    page.drawImage(logo, {
      x: MARGIN,
      y: PAGE_HEIGHT - 46 + (34 - logoSize.height) / 2,
      width: logoSize.width,
      height: logoSize.height,
    });
    draw("TARIFS PROFESSIONNELS", 168, PAGE_HEIGHT - 27, 11, bold, ACCENT);
    draw(params.nom_labo || "DECERF LAB", 168, PAGE_HEIGHT - 43, 8, regular, MUTED);
    y = PAGE_HEIGHT - 78;
  };
  const nextPage = () => {
    page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    pages.push(page);
    drawCompactHeader();
  };
  const ensureRoom = (height: number) => {
    if (y - height < MARGIN + 26) nextPage();
  };

  const drawHeader = () => {
    page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 100, width: PAGE_WIDTH, height: 100, color: PALE });
    page.drawRectangle({ x: MARGIN, y: PAGE_HEIGHT - 82, width: 148, height: 58, color: rgb(1, 1, 1) });
    const logoSize = logo.scaleToFit(136, 48);
    page.drawImage(logo, {
      x: MARGIN + (148 - logoSize.width) / 2,
      y: PAGE_HEIGHT - 76 + (48 - logoSize.height) / 2,
      width: logoSize.width,
      height: logoSize.height,
    });
    draw("TARIFS PROFESSIONNELS", 218, PAGE_HEIGHT - 42, 15, bold, ACCENT);
    draw(params.nom_labo || "DECERF LAB", 218, PAGE_HEIGHT - 62, 10, bold, TEXT);
    draw(`Mis à jour le ${formatDate}`, 218, PAGE_HEIGHT - 79, 8, regular, MUTED);

    let detailsY = PAGE_HEIGHT - 119;
    const address = [params.adresse, [params.code_postal, params.ville].filter(Boolean).join(" "), params.pays]
      .filter((part): part is string => Boolean(part?.trim()))
      .join(", ");
    const details = [
      address,
      params.telephone,
      params.email_contact,
      params.site_web,
      params.numero_entreprise ? `BCE : ${params.numero_entreprise}` : null,
      params.tva_numero ? `TVA : ${params.tva_numero}` : null,
    ].filter((detail): detail is string => Boolean(detail?.trim()));
    const leftColumn = details.slice(0, 3);
    const rightColumn = details.slice(3);
    leftColumn.forEach((detail) => {
      detailsY = drawWrapped(detail, MARGIN, detailsY, 245, 8, MUTED);
    });
    let rightY = PAGE_HEIGHT - 119;
    rightColumn.forEach((detail) => {
      rightY = drawWrapped(detail, 315, rightY, PAGE_WIDTH - MARGIN - 315, 8, MUTED);
    });
    y = Math.min(detailsY, rightY) - 15;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_WIDTH - MARGIN, y }, thickness: 0.8, color: RULE });
    y -= 20;
    draw("Tarifs exprimés en euros. Les options s’ajoutent au tarif de base lorsqu’elles sont sélectionnées.", MARGIN, y, 8, regular, MUTED);
    y -= 18;
    draw(`Régime TVA : ${params.regime_tva === "franchise" ? "franchise" : "normal"}. Le traitement de la TVA est indiqué sur la facture.`, MARGIN, y, 8, regular, MUTED);
    y -= 20;
  };

  const categoryLabels: Record<string, string> = {
    prothese_fixe: "Prothèse fixe",
    prothese_amovible: "Prothèse amovible",
    implantologie: "Implantologie",
    orthodontie: "Orthodontie",
    esthetique: "Esthétique",
    autre: "Autres services",
  };

  drawHeader();
  let currentCategory = "";
  for (const service of services) {
    const category = service.categorie || "autre";
    const titleLines = wrapText(service.nom, bold, 10, 365);
    const descriptionLines = service.description
      ? wrapText(service.description, regular, 8, 370)
      : [];
    const optionHeight = service.options.length ? 16 + service.options.length * 14 : 0;
    const serviceHeight = titleLines.length * 13 + descriptionLines.length * 11 + optionHeight + 18;
    ensureRoom(serviceHeight + (currentCategory === category ? 0 : 28));

    if (currentCategory !== category) {
      y -= 7;
      page.drawRectangle({ x: MARGIN, y: y - 5, width: PAGE_WIDTH - MARGIN * 2, height: 22, color: PALE });
      draw(categoryLabels[category] || category, MARGIN + 8, y + 11, 9, bold, ACCENT);
      y -= 25;
      currentCategory = category;
    }

    const serviceTop = y;
    titleLines.forEach((line, index) => draw(line, MARGIN + 7, serviceTop - index * 13, 10, bold, TEXT));
    draw(service.prix_base_ht === null ? "Sur devis" : `${euro(service.prix_base_ht)} HT`, PAGE_WIDTH - MARGIN - 120, serviceTop, 9, bold, TEXT);
    y -= titleLines.length * 13;
    if (descriptionLines.length) {
      descriptionLines.forEach((line, index) => draw(line, MARGIN + 7, y - index * 11, 8, regular, MUTED));
      y -= descriptionLines.length * 11;
    }

    if (service.options.length) {
      y -= 2;
      for (const option of service.options) {
        draw(`+ ${option.nom}`, MARGIN + 18, y, 8.5, regular, MUTED);
        draw(`+ ${euro(option.prix_ht)} HT`, PAGE_WIDTH - MARGIN - 120, y, 8.5, regular, TEXT);
        y -= 14;
      }
    }
    y -= 7;
    page.drawLine({ start: { x: MARGIN + 6, y }, end: { x: PAGE_WIDTH - MARGIN - 6, y }, thickness: 0.5, color: RULE });
    y -= 12;
  }

  for (const [index, pdfPage] of pages.entries()) {
    pdfPage.drawLine({ start: { x: MARGIN, y: 28 }, end: { x: PAGE_WIDTH - MARGIN, y: 28 }, thickness: 0.6, color: RULE });
    pdfPage.drawText(`${params.nom_labo || "DECERF LAB"} · Tarifs professionnels · ${index + 1}/${pages.length}`, {
      x: MARGIN,
      y: 15,
      size: 7,
      font: regular,
      color: MUTED,
    });
  }

  return document.save();
}
