/**
 * Perkecil foto sebelum upload (foto HP 4–12 MB > batas server 2 MB).
 * Sisi terpanjang maks `maxDim` px, disimpan JPEG `quality` — kecuali PNG/WebP
 * transparan (hasil hapus-background) yg tetap PNG supaya transparansinya tidak hilang.
 * GIF (animasi) & file yg sudah kecil dikirim apa adanya.
 */
export async function compressImage(file: File, maxDim = 1600, quality = 0.85, skipBelow = 900 * 1024): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.size <= skipBelow) return file;
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file);
  } catch {
    return file;   // format tak terbaca browser (mis. HEIC) → biar server yg menolak dgn pesan jelas
  }
  const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();

  const keepAlpha = file.type === 'image/png' || file.type === 'image/webp';
  const type = keepAlpha ? 'image/png' : 'image/jpeg';
  const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, type, quality));
  if (!blob || blob.size >= file.size) return file;
  const name = file.name.replace(/\.[^.]+$/, '') + (keepAlpha ? '.png' : '.jpg');
  return new File([blob], name, { type });
}
