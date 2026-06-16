import { getPdfJs, type PdfTextItem } from "@/lib/pdfJsLoader";

export interface ViewportBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface LineSegment {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  charStart: number;
  charEnd: number;
}

interface TextLine {
  text: string;
  segments: LineSegment[];
}

const PHONE_RE =
  /(?:\+?\d{1,4}[\s().-]*)?\(?\d{2,4}\)?[\s.-]*\d{2,4}[\s.-]*\d{2,4}(?:[\s.-]*\d+)?/g;

const LABELED_PHONE_RE =
  /(?:phone|tel(?:ephone)?|mobile|cell|whatsapp|m(?:ob)?\.?)\s*[:\s]+([+\d\s().-]{8,})/gi;

const RENDER_SCALE = 2;
const BLUR_RADIUS = 8;

export function isLikelyPhone(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || /@/.test(trimmed)) return false;

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 15) return false;

  // Skip year ranges and short numeric IDs.
  if (/^(19|20)\d{2}$/.test(digits)) return false;
  if (/^\d{4}\s*[-–—]\s*\d{4}$/.test(trimmed)) return false;

  return /(?:\+|\(|0\d|\d{3}[\s.-]\d)/.test(trimmed);
}

function groupItemsIntoLines(
  items: PdfTextItem[],
  viewport: { transform: number[]; scale: number },
  pdfjs: typeof import("pdfjs-dist")
): TextLine[] {
  const rows: Array<{
    str: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }> = [];

  for (const item of items) {
    if (!item.str.trim()) continue;
    const transform = pdfjs.Util.transform(viewport.transform, item.transform);
    const fontHeight = Math.hypot(transform[2], transform[3]);
    const width = item.width ? item.width * viewport.scale : item.str.length * fontHeight * 0.55;
    rows.push({
      str: item.str,
      x: transform[4],
      y: transform[5] - fontHeight,
      width,
      height: fontHeight * 1.2,
    });
  }

  rows.sort((a, b) => a.y - b.y || a.x - b.x);

  const lines: TextLine[] = [];
  let current: typeof rows = [];
  let currentY = Number.NEGATIVE_INFINITY;
  const yTolerance = 4;

  const flush = () => {
    if (!current.length) return;
    let text = "";
    const segments: LineSegment[] = [];
    for (const row of current) {
      const charStart = text.length;
      text += row.str;
      segments.push({
        str: row.str,
        x: row.x,
        y: row.y,
        width: row.width,
        height: row.height,
        charStart,
        charEnd: text.length,
      });
    }
    lines.push({ text, segments });
    current = [];
  };

  for (const row of rows) {
    if (Math.abs(row.y - currentY) > yTolerance) {
      flush();
      currentY = row.y;
    }
    current.push(row);
  }
  flush();

  return lines;
}

function bboxForRange(line: TextLine, start: number, end: number): ViewportBox | null {
  const overlapping = line.segments.filter((s) => s.charEnd > start && s.charStart < end);
  if (!overlapping.length) return null;

  const pad = 3;
  const x = Math.min(...overlapping.map((s) => s.x)) - pad;
  const y = Math.min(...overlapping.map((s) => s.y)) - pad;
  const right = Math.max(...overlapping.map((s) => s.x + s.width)) + pad;
  const bottom = Math.max(...overlapping.map((s) => s.y + s.height)) + pad;

  return {
    x: Math.max(0, x),
    y: Math.max(0, y),
    width: Math.max(8, right - x),
    height: Math.max(8, bottom - y),
  };
}

function mergeBoxes(boxes: ViewportBox[]): ViewportBox[] {
  if (!boxes.length) return [];
  const merged = [...boxes];

  let changed = true;
  while (changed) {
    changed = false;
    outer: for (let i = 0; i < merged.length; i++) {
      for (let j = i + 1; j < merged.length; j++) {
        const a = merged[i];
        const b = merged[j];
        const overlap =
          a.x <= b.x + b.width + 6 &&
          b.x <= a.x + a.width + 6 &&
          a.y <= b.y + b.height + 6 &&
          b.y <= a.y + a.height + 6;
        if (!overlap) continue;

        const x = Math.min(a.x, b.x);
        const y = Math.min(a.y, b.y);
        const right = Math.max(a.x + a.width, b.x + b.width);
        const bottom = Math.max(a.y + a.height, b.y + b.height);
        merged[i] = { x, y, width: right - x, height: bottom - y };
        merged.splice(j, 1);
        changed = true;
        continue outer;
      }
    }
  }

  return merged;
}

export function findPhoneBoxesInLine(line: TextLine): ViewportBox[] {
  const boxes: ViewportBox[] = [];

  for (const match of line.text.matchAll(PHONE_RE)) {
    const text = match[0];
    const start = match.index ?? 0;
    if (!isLikelyPhone(text)) continue;
    const box = bboxForRange(line, start, start + text.length);
    if (box) boxes.push(box);
  }

  for (const match of line.text.matchAll(LABELED_PHONE_RE)) {
    const text = match[1];
    const labelEnd = (match.index ?? 0) + match[0].length;
    const start = labelEnd - text.length;
    if (!isLikelyPhone(text)) continue;
    const box = bboxForRange(line, start, labelEnd);
    if (box) boxes.push(box);
  }

  return boxes;
}

async function findPhoneBoxesOnPage(
  page: import("pdfjs-dist").PDFPageProxy,
  viewport: import("pdfjs-dist").PageViewport,
  pdfjs: typeof import("pdfjs-dist")
): Promise<ViewportBox[]> {
  const content = await page.getTextContent();
  const lines = groupItemsIntoLines(content.items as PdfTextItem[], viewport, pdfjs);
  const boxes: ViewportBox[] = [];

  for (const line of lines) {
    boxes.push(...findPhoneBoxesInLine(line));
  }

  return mergeBoxes(boxes);
}

function blurRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number
) {
  const pad = 4;
  const sx = Math.max(0, Math.floor(x - pad));
  const sy = Math.max(0, Math.floor(y - pad));
  const sw = Math.min(ctx.canvas.width - sx, Math.ceil(width + pad * 2));
  const sh = Math.min(ctx.canvas.height - sy, Math.ceil(height + pad * 2));
  if (sw <= 0 || sh <= 0) return;

  const patch = document.createElement("canvas");
  patch.width = sw;
  patch.height = sh;
  const patchCtx = patch.getContext("2d");
  if (!patchCtx) return;

  patchCtx.drawImage(ctx.canvas, sx, sy, sw, sh, 0, 0, sw, sh);
  ctx.save();
  ctx.filter = `blur(${BLUR_RADIUS}px)`;
  ctx.drawImage(patch, 0, 0, sw, sh, sx, sy, sw, sh);
  ctx.restore();

  ctx.fillStyle = "rgba(235, 235, 235, 0.45)";
  ctx.fillRect(sx, sy, sw, sh);
}

/**
 * Renders each PDF page, blurs detected phone numbers, and returns a new PDF file.
 */
export async function blurPhoneNumbersInPdf(file: File): Promise<File> {
  const pdfjs = await getPdfJs();
  const { PDFDocument } = await import("pdf-lib");
  const data = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data }).promise;
  const outDoc = await PDFDocument.create();

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const renderViewport = page.getViewport({ scale: RENDER_SCALE });
    const pageSize = page.getViewport({ scale: 1 });

    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(renderViewport.width);
    canvas.height = Math.ceil(renderViewport.height);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Could not prepare CV preview");

    await page.render({ canvasContext: ctx, viewport: renderViewport }).promise;

    const phoneBoxes = await findPhoneBoxesOnPage(page, renderViewport, pdfjs);
    for (const box of phoneBoxes) {
      blurRect(ctx, box.x, box.y, box.width, box.height);
    }

    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Could not encode blurred CV page"));
      }, "image/png");
    });

    const pngBytes = new Uint8Array(await pngBlob.arrayBuffer());
    const pngImage = await outDoc.embedPng(pngBytes);
    const outPage = outDoc.addPage([pageSize.width, pageSize.height]);
    outPage.drawImage(pngImage, {
      x: 0,
      y: 0,
      width: pageSize.width,
      height: pageSize.height,
    });
  }

  const pdfBytes = await outDoc.save();
  return new File([pdfBytes], file.name.replace(/\.pdf$/i, "") + ".pdf", {
    type: "application/pdf",
  });
}

export async function pdfContainsPhoneNumber(file: File): Promise<boolean> {
  const pdfjs = await getPdfJs();
  const data = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data }).promise;

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1 });
    const boxes = await findPhoneBoxesOnPage(page, viewport, pdfjs);
    if (boxes.length) return true;
  }

  return false;
}
