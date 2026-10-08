import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
const MAX_DPM_PDF_FILES = 100;
const PDF_RENDER_SCALE = 3;
type DpmPdfSource = {
  bytes: Uint8Array;
  name: string;
  sourceName: string;
};
export type DpmSanitizedPdfFile = {
  blob: Blob;
  name: string;
  pageCount: number;
  sourceName: string;
};
type PdfTextBox = {
  height: number;
  normalized: string;
  text: string;
  width: number;
  x: number;
  y: number;
};
const getExtension = (fileName: string): string =>
  fileName.split('.').pop()?.trim().toLowerCase() ?? '';
const getBaseName = (fileName: string): string => {
  const normalized = fileName.replace(/\\/g, '/').split('/').pop() || 'DPM';
  return normalized.replace(/\.pdf$/i, '').trim() || 'DPM';
};
const getDpmPdfDownloadBaseName = (fileName: string): string => {
  const originalBaseName = getBaseName(fileName)
    .replace(/\s*-\s*TANPA\s+HARGA\s*$/i, '')
    .trim();

  /*
   * Nama sumber DPM umumnya:
   * PO-YYYYMMDD-HHMMSS.pdf
   *
   * Hasil download cukup:
   * PO-YYYYMMDD.pdf
   *
   * Timestamp hanya dipotong jika benar-benar berada di akhir nama.
   */
  const timestampMatch = originalBaseName.match(/^(.*-\d{8})-\d{6}$/);

  return timestampMatch?.[1] || originalBaseName || 'DPM';
};

const createUniquePdfName = (
  requestedName: string,
  usedNames: Set<string>
): string => {
  const baseName = getDpmPdfDownloadBaseName(requestedName);
  let candidate = `${baseName}.pdf`;
  let duplicateIndex = 2;

  while (usedNames.has(candidate.toLowerCase())) {
    candidate = `${baseName} (${duplicateIndex}).pdf`;
    duplicateIndex += 1;
  }

  usedNames.add(candidate.toLowerCase());
  return candidate;
};

const assertPdfSignature = (bytes: Uint8Array, fileName: string): void => {
  const signature = new TextDecoder('latin1').decode(bytes.slice(0, 5));
  if (signature !== '%PDF-') {
    throw new Error(`${fileName} bukan file PDF yang valid.`);
  }
};
const extractDpmPdfSources = async (files: File[]): Promise<DpmPdfSource[]> => {
  const sources: DpmPdfSource[] = [];
  for (const file of files) {
    const extension = getExtension(file.name);
    if (extension === 'pdf') {
      const bytes = new Uint8Array(await file.arrayBuffer());
      assertPdfSignature(bytes, file.name);
      sources.push({ bytes, name: file.name, sourceName: file.name });
      continue;
    }
    if (extension !== 'zip') {
      throw new Error(
        `Preview PDF tanpa harga mendukung file PDF atau ZIP. ${file.name} tetap dapat dipakai pada alur upload MDFO biasa.`
      );
    }
    const archive = await JSZip.loadAsync(file);
    const entries = Object.values(archive.files)
      .filter((entry) => !entry.dir && getExtension(entry.name) === 'pdf')
      .sort((first, second) => first.name.localeCompare(second.name, 'id', { numeric: true }));
    if (entries.length === 0) {
      throw new Error(`${file.name} tidak memiliki file PDF di dalam ZIP.`);
    }
    for (const entry of entries) {
      const bytes = await entry.async('uint8array');
      assertPdfSignature(bytes, entry.name);
      sources.push({
        bytes,
        name: entry.name.replace(/\\/g, '/').split('/').pop() || entry.name,
        sourceName: `${file.name} / ${entry.name}`
      });
    }
  }
  if (sources.length === 0) {
    throw new Error('Tidak ada PDF DPM yang dapat diproses.');
  }
  if (sources.length > MAX_DPM_PDF_FILES) {
    throw new Error(`Maksimal ${MAX_DPM_PDF_FILES} PDF DPM dapat diproses sekaligus.`);
  }
  return sources;
};
const canvasToPngBytes = async (canvas: HTMLCanvasElement): Promise<ArrayBuffer> => {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) {
        resolve(result);
        return;
      }
      reject(new Error('Browser gagal membuat halaman PDF hasil masking.'));
    }, 'image/png');
  });
  return blob.arrayBuffer();
};
const normalizePdfText = (value: string): string =>
  value.toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
const getPdfTextBoxes = (
  items: Array<Record<string, unknown>>,
  viewport: { transform: number[] }
): PdfTextBox[] => {
  return items.flatMap((item) => {
    if (!('str' in item) || !('transform' in item)) {
      return [];
    }
    const text = String(item.str ?? '').trim();
    const transform = item.transform;
    if (!text || !Array.isArray(transform) || transform.length < 6) {
      return [];
    }
    const renderedTransform = pdfjsLib.Util.transform(
      viewport.transform,
      transform.map((value) => Number(value))
    );
    const height = Math.max(
      1,
      Math.hypot(renderedTransform[2], renderedTransform[3])
    );
    return [{
      height,
      normalized: normalizePdfText(text),
      text,
      width: Math.max(1, Number(item.width ?? 0) * PDF_RENDER_SCALE),
      x: renderedTransform[4],
      y: renderedTransform[5]
    }];
  });
};
const findTextBox = (
  boxes: PdfTextBox[],
  predicate: (box: PdfTextBox) => boolean
): PdfTextBox | undefined => boxes.find(predicate);
const getForecastBucketIndex = (box: PdfTextBox): number | null => {
  const raw = box.text
    .toUpperCase()
    .replace(/\s+/g, '');
  if (raw === '+1' || raw === 'N+1') return 1;
  if (raw === 'N+2') return 2;
  if (raw === 'N+3') return 3;
  return null;
};
const getForecastGridLeftX = (
  boxes: PdfTextBox[],
  forecast: PdfTextBox
): number | null => {
  const candidates = boxes
    .map((box) => ({
      box,
      index: getForecastBucketIndex(box)
    }))
    .filter(
      (
        item
      ): item is {
        box: PdfTextBox;
        index: number;
      } =>
        item.index !== null &&
        item.box.x >= forecast.x - (25 * PDF_RENDER_SCALE) &&
        item.box.x <= forecast.x + (180 * PDF_RENDER_SCALE)
    )
    .sort((first, second) => first.index - second.index);
  if (candidates.length >= 2) {
    let bestPair:
      | {
        first: (typeof candidates)[number];
        second: (typeof candidates)[number];
      }
      | null = null;
    for (let firstIndex = 0; firstIndex < candidates.length - 1; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < candidates.length; secondIndex += 1) {
        if (candidates[firstIndex].index === candidates[secondIndex].index) {
          continue;
        }
        bestPair = {
          first: candidates[firstIndex],
          second: candidates[secondIndex]
        };
        break;
      }
      if (bestPair) break;
    }
    if (bestPair) {
      const firstCenter =
        bestPair.first.box.x +
        (bestPair.first.box.width / 2);
      const secondCenter =
        bestPair.second.box.x +
        (bestPair.second.box.width / 2);
      const indexDistance =
        bestPair.second.index -
        bestPair.first.index;
      const columnStep =
        (secondCenter - firstCenter) /
        indexDistance;
      if (columnStep > 0) {
        const firstForecastCenter =
          firstCenter -
          ((bestPair.first.index - 1) * columnStep);
        return firstForecastCenter - (columnStep / 2);
      }
    }
  }
  const firstBucket =
    candidates.find((item) => item.index === 1);
  if (firstBucket) {
    /*
     * Jika hanya +1 / N+1 yang terbaca, berhenti sedikit sebelum text-nya.
     * Ini tetap lebih aman daripada memakai posisi header "Forecast Qty"
     * yang berada di tengah area forecast.
     */
    return (
      firstBucket.box.x -
      Math.max(
        8 * PDF_RENDER_SCALE,
        firstBucket.box.width * 0.75
      )
    );
  }
  return null;
};
const fillWhiteRectangle = (
  context: CanvasRenderingContext2D,
  left: number,
  top: number,
  right: number,
  bottom: number
): void => {
  const x = Math.max(0, Math.min(left, right));
  const y = Math.max(0, Math.min(top, bottom));
  const width = Math.min(context.canvas.width, Math.max(left, right)) - x;
  const height = Math.min(context.canvas.height, Math.max(top, bottom)) - y;
  if (width <= 0 || height <= 0) {
    return;
  }
  context.save();
  context.fillStyle = '#ffffff';
  context.fillRect(x, y, width, height);
  context.restore();
};
const maskDpmPriceArea = (
  context: CanvasRenderingContext2D,
  boxes: PdfTextBox[]
): void => {
  const price = findTextBox(boxes, (box) => box.normalized === 'PRICE');
  const amount = findTextBox(boxes, (box) => box.normalized === 'AMOUNT');
  const forecast = findTextBox(boxes, (box) => box.normalized.includes('FORECAST'));
  const subTotal = findTextBox(
    boxes,
    (box) => box.normalized === 'SUB TOTAL' || box.normalized === 'SUBTOTAL'
  );
  const totalBoxes = boxes.filter((box) => box.normalized === 'TOTAL');
  const finalTotal = totalBoxes.sort((first, second) => second.y - first.y)[0];
  if (!price || !amount || !forecast || !subTotal || !finalTotal) {
    throw new Error(
      'Area Price, Amount, Sub Total, PPN, Additional, dan Total tidak terdeteksi pada template PDF DPM.'
    );
  }
  const padding = 2 * PDF_RENDER_SCALE;
  /*
   * "Forecast Qty" adalah header gabungan yang posisinya berada di tengah
   * tiga kolom forecast. Memakai forecast.x sebagai batas kanan membuat mask
   * masuk ke kolom +1 / N+1.
   *
   * Hitung batas kiri grid forecast dari posisi +1 / N+1, N+2, N+3.
   * Mask dihentikan sedikit SEBELUM garis vertikal pertama forecast supaya
   * garis tabel dan seluruh nilai forecast tetap terlihat.
   */
  const forecastGridLeftX =
    getForecastGridLeftX(
      boxes,
      forecast
    );
  const forecastLineGap =
    1.5 * PDF_RENDER_SCALE;
  const priceMaskRight =
    forecastGridLeftX !== null
      ? forecastGridLeftX - forecastLineGap
      : forecast.x - (18 * PDF_RENDER_SCALE);
  // Menghapus header Price/Amount, garis tabel harga, serta seluruh nilai item.
  fillWhiteRectangle(
    context,
    price.x - (7 * PDF_RENDER_SCALE),
    Math.min(price.y - price.height, amount.y - amount.height) - padding,
    priceMaskRight,
    subTotal.y - subTotal.height - padding
  );
  // Label ringkasan tetap terlihat; hanya nilai nominal di sisi kanan yang dihapus.
  fillWhiteRectangle(
    context,
    context.canvas.width * 0.81,
    subTotal.y - subTotal.height - padding,
    context.canvas.width * 0.945,
    finalTotal.y + padding
  );
};
const sanitizeDpmPdf = async (source: DpmPdfSource): Promise<DpmSanitizedPdfFile> => {
  // PDF.js dapat memindahkan ArrayBuffer ke worker, sehingga gunakan salinan terpisah.
  const loadingTask = pdfjsLib.getDocument({
    data: source.bytes.slice(),
    useSystemFonts: true
  });
  const inputDocument = await loadingTask.promise;
  const outputDocument = await PDFDocument.create();
  try {
    for (let pageNumber = 1; pageNumber <= inputDocument.numPages; pageNumber += 1) {
      const inputPage = await inputDocument.getPage(pageNumber);
      const viewport = inputPage.getViewport({ scale: PDF_RENDER_SCALE });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext('2d', { alpha: false });
      if (!context) {
        throw new Error('Browser tidak mendukung canvas untuk membuat preview PDF.');
      }
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      await inputPage.render({ canvas, canvasContext: context, viewport }).promise;
      const textContent = await inputPage.getTextContent();
      const boxes = getPdfTextBoxes(
        textContent.items as unknown as Array<Record<string, unknown>>,
        viewport
      );
      maskDpmPriceArea(context, boxes);
      const pngBytes = await canvasToPngBytes(canvas);
      const pngImage = await outputDocument.embedPng(pngBytes);
      const outputPage = outputDocument.addPage([
        viewport.width / PDF_RENDER_SCALE,
        viewport.height / PDF_RENDER_SCALE
      ]);
      outputPage.drawImage(pngImage, {
        x: 0,
        y: 0,
        width: outputPage.getWidth(),
        height: outputPage.getHeight()
      });
      inputPage.cleanup();
      canvas.width = 1;
      canvas.height = 1;
    }
    outputDocument.setTitle(getDpmPdfDownloadBaseName(source.name));
    outputDocument.setSubject('PDF DPM dengan data harga disembunyikan');
    outputDocument.setCreator('MDFO Marketing');
    const outputBytes = await outputDocument.save();
    // TypeScript 5.7+ membedakan ArrayBuffer dan SharedArrayBuffer pada
    // Uint8Array<ArrayBufferLike>. BlobPart hanya menerima ArrayBuffer-backed
    // view secara pasti, jadi salin hasil pdf-lib ke ArrayBuffer biasa.
    const outputBuffer = new ArrayBuffer(outputBytes.byteLength);
    new Uint8Array(outputBuffer).set(outputBytes);
    return {
      blob: new Blob([outputBuffer], { type: 'application/pdf' }),
      name: source.name,
      pageCount: inputDocument.numPages,
      sourceName: source.sourceName
    };
  } finally {
    await loadingTask.destroy();
  }
};
export const createDpmPdfsWithoutPrices = async (
  files: File[]
): Promise<DpmSanitizedPdfFile[]> => {
  const sources = await extractDpmPdfSources(files);
  const usedNames = new Set<string>();
  const results: DpmSanitizedPdfFile[] = [];
  // Diproses berurutan agar file ZIP besar tidak membuat pemakaian memori melonjak.
  for (const source of sources) {
    const result = await sanitizeDpmPdf(source);
    results.push({
      ...result,
      name: createUniquePdfName(source.name, usedNames)
    });
  }
  return results;
};
