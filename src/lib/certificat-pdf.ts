import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

function toPdfText(value: string): string {
  return value
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2022/g, "-")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function wrapLine(text: string, maxWidth: number, font: Awaited<ReturnType<PDFDocument["embedFont"]>>, size: number) {
  const words = toPdfText(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth || !current) {
      current = next;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export async function createCertificatPdf(content: string, number: string): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  document.setTitle(`Declaration de conformite ${number}`);
  document.setSubject("Dispositif medical sur mesure");
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const pageSize: [number, number] = [595.28, 841.89];
  const margin = 52;
  const fontSize = 10;
  const lineHeight = 15;
  let page = document.addPage(pageSize);
  let y = page.getHeight() - margin;

  page.drawText(toPdfText(number), {
    x: margin,
    y,
    size: 9,
    font: bold,
    color: rgb(0.1, 0.2, 0.32),
  });
  y -= 24;

  for (const paragraph of content.split(/\r?\n/)) {
    const lines = wrapLine(paragraph, page.getWidth() - margin * 2, regular, fontSize);
    if (!lines.length) {
      y -= lineHeight * 0.7;
      continue;
    }
    for (const line of lines) {
      if (y < margin) {
        page = document.addPage(pageSize);
        y = page.getHeight() - margin;
      }
      const isHeading = line.length < 90 && line.endsWith(":");
      page.drawText(line, {
        x: margin,
        y,
        size: isHeading ? fontSize : fontSize,
        font: isHeading ? bold : regular,
        color: rgb(0.12, 0.14, 0.17),
      });
      y -= lineHeight;
    }
  }

  return document.save();
}
