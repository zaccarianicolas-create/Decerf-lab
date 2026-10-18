import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import type { FactureBillingSnapshot } from "@/lib/facture-workflow";

type FacturePdfLine = {
  description: string;
  quantite: number;
  prix_unitaire: number;
  taux_tva: number;
  total_ligne_ht: number;
  total_ligne_tva: number;
  total_ligne_ttc: number;
};

type FacturePdfData = {
  numero: string;
  date_emission: string;
  date_echeance: string;
  montant_ht: number;
  montant_tva: number;
  montant_ttc: number;
  solde_du: number;
  snapshot: FactureBillingSnapshot;
  lignes: FacturePdfLine[];
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 42;
const TEXT = rgb(0.12, 0.17, 0.24);
const MUTED = rgb(0.38, 0.44, 0.51);
const ACCENT = rgb(0.02, 0.52, 0.78);
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

export async function createFacturePdf(data: FacturePdfData) {
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  let page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  const newPage = () => {
    page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN;
    return page;
  };
  const draw = (
    text: string,
    x: number,
    top: number,
    size = 10,
    font: PDFFont = regular,
    color = TEXT
  ) => {
    page.drawText(text, { x, y: top - size, size, font, color });
  };
  const drawWrapped = (
    text: string,
    x: number,
    top: number,
    width: number,
    size = 9,
    font: PDFFont = regular,
    color = MUTED
  ) => {
    const lines = wrapText(text, font, size, width);
    lines.forEach((line, index) => draw(line, x, top - index * 13, size, font, color));
    return top - lines.length * 13;
  };
  const drawRule = (at: number) => {
    page.drawLine({ start: { x: MARGIN, y: at }, end: { x: PAGE_WIDTH - MARGIN, y: at }, thickness: 0.7, color: RULE });
  };
  const ensureRoom = (height: number) => {
    if (y - height < MARGIN + 30) newPage();
  };
  const euro = (amount: number) => `${Number(amount || 0).toFixed(2)} EUR`;
  const date = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString("fr-BE");

  page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 92, width: PAGE_WIDTH, height: 92, color: ACCENT });
  draw(data.snapshot.issuer.nom || "DECERF LAB", MARGIN, PAGE_HEIGHT - 35, 17, bold, rgb(1, 1, 1));
  draw("FACTURE", PAGE_WIDTH - 150, PAGE_HEIGHT - 37, 16, bold, rgb(1, 1, 1));
  draw(data.numero, PAGE_WIDTH - 150, PAGE_HEIGHT - 62, 10, regular, rgb(1, 1, 1));

  y = PAGE_HEIGHT - 120;
  y = drawWrapped(data.snapshot.issuer.adresse, MARGIN, y, 245);
  for (const detail of [
    data.snapshot.issuer.telephone,
    data.snapshot.issuer.email,
    data.snapshot.issuer.tva_numero ? `TVA : ${data.snapshot.issuer.tva_numero}` : "",
  ].filter(Boolean)) {
    y = drawWrapped(detail, MARGIN, y, 245);
  }

  const clientTop = PAGE_HEIGHT - 120;
  draw("FACTURÉ À", 340, clientTop, 8, bold, MUTED);
  let clientY = clientTop - 19;
  clientY = drawWrapped(data.snapshot.client.nom, 340, clientY, 210, 10, bold, TEXT);
  clientY = drawWrapped(data.snapshot.client.adresse, 340, clientY, 210);
  clientY = drawWrapped(data.snapshot.client.email, 340, clientY, 210);
  if (data.snapshot.client.tva_numero) {
    drawWrapped(`TVA : ${data.snapshot.client.tva_numero}`, 340, clientY, 210);
  }

  y = Math.min(y, clientY) - 18;
  drawRule(y);
  y -= 20;
  draw(`Date d’émission : ${date(data.date_emission)}`, MARGIN, y, 9, regular, MUTED);
  draw(`Échéance : ${date(data.date_echeance)}`, 315, y, 9, regular, MUTED);
  y -= 25;
  draw(`Commande : ${data.snapshot.commande_numero}`, MARGIN, y, 9, regular, MUTED);
  if (data.snapshot.patient_ref) draw(`Référence : ${data.snapshot.patient_ref}`, 315, y, 9, regular, MUTED);

  const drawTableHeader = () => {
    y -= 25;
    page.drawRectangle({ x: MARGIN, y: y - 5, width: PAGE_WIDTH - MARGIN * 2, height: 23, color: rgb(0.94, 0.96, 0.98) });
    draw("Désignation", MARGIN + 7, y + 12, 8, bold, MUTED);
    draw("Qté", 350, y + 12, 8, bold, MUTED);
    draw("Prix HT", 390, y + 12, 8, bold, MUTED);
    draw("TVA", 458, y + 12, 8, bold, MUTED);
    draw("Total HT", 494, y + 12, 8, bold, MUTED);
    y -= 21;
  };
  drawTableHeader();

  for (const line of data.lignes) {
    const descriptionLines = wrapText(line.description, regular, 9, 285);
    const rowHeight = Math.max(24, descriptionLines.length * 12 + 10);
    ensureRoom(rowHeight + 24);
    if (y < MARGIN + rowHeight) drawTableHeader();
    descriptionLines.forEach((text, index) => draw(text, MARGIN + 7, y - 1 - index * 12, 9, regular, TEXT));
    draw(String(line.quantite), 350, y - 1, 8, regular, MUTED);
    draw(euro(line.prix_unitaire), 390, y - 1, 8, regular, MUTED);
    draw(`${Number(line.taux_tva).toFixed(0)}%`, 458, y - 1, 8, regular, MUTED);
    draw(euro(line.total_ligne_ht), 494, y - 1, 8, regular, TEXT);
    y -= rowHeight;
    drawRule(y + 5);
  }

  ensureRoom(116);
  y -= 10;
  const totalX = 390;
  draw("Total HT", totalX, y, 9, regular, MUTED);
  draw(euro(data.montant_ht), 494, y, 9, regular, TEXT);
  y -= 18;
  draw("TVA", totalX, y, 9, regular, MUTED);
  draw(euro(data.montant_tva), 494, y, 9, regular, TEXT);
  y -= 20;
  drawRule(y + 8);
  draw("Total TTC", totalX, y, 11, bold, TEXT);
  draw(euro(data.montant_ttc), 494, y, 11, bold, TEXT);
  y -= 19;
  draw("Solde à payer", totalX, y, 10, bold, ACCENT);
  draw(euro(data.solde_du), 494, y, 10, bold, ACCENT);

  ensureRoom(100);
  y -= 35;
  if (data.snapshot.issuer.iban) {
    draw("Paiement par virement", MARGIN, y, 9, bold, TEXT);
    y -= 15;
    drawWrapped(`IBAN : ${data.snapshot.issuer.iban}${data.snapshot.issuer.bic ? `  BIC : ${data.snapshot.issuer.bic}` : ""}`, MARGIN, y, 500);
    y -= 15;
  }
  y = drawWrapped(data.snapshot.issuer.conditions_paiement, MARGIN, y, 500, 9, regular, MUTED) - 3;
  drawWrapped(data.snapshot.issuer.mentions_legales, MARGIN, y, 500, 8, regular, MUTED);

  return document.save();
}