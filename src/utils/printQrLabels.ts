// utils/printQrLabels.ts
// Cetak label QR aset: 1 label = 1 halaman, memenuhi kertas apa pun (A4 / A6 / kertas label).
// Layout: logo New Armada → garis → QR → garis → "PART NUMBER | OP n/N".
// Dicetak lewat iframe tersembunyi berisi dokumen bersih supaya ukuran label mengikuti
// kertas (bukan lebar layar / layout halaman) dan header-footer browser tidak ikut (margin 0).
import QRCode from 'qrcode'
import logoUrl from '@/assets/images/logo-maj.png'

export interface QrLabel {
  /** Isi QR (link halaman aset). */
  url: string
  /** Teks tebal di footer, mis. part number. */
  title: string
  /** Teks setelah pemisah, mis. "OP 1/3". */
  sub: string
}

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))

const CSS = `
  @page { margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; }
  .label {
    width: 100%; height: 100vh; padding: 6vmin 7vmin;
    display: flex; flex-direction: column;
    break-after: page; page-break-after: always; break-inside: avoid;
    color: #111; font-family: Arial, Helvetica, sans-serif;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .label:last-child { break-after: auto; page-break-after: auto; }
  .head { display: flex; justify-content: center; padding-bottom: 3vmin; border-bottom: .6vmin solid #2E5396; }
  .head img { width: 62%; max-height: 14vh; object-fit: contain; }
  .body { flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; padding: 4vmin 0; }
  .body img { width: 100%; height: 100%; object-fit: contain; image-rendering: pixelated; }
  .foot {
    display: flex; justify-content: center; align-items: baseline; flex-wrap: wrap; gap: 2.5vmin;
    padding-top: 3vmin; border-top: .6vmin solid #2E5396; font-size: 5.2vmin; line-height: 1.2; text-align: center;
  }
  .foot b { font-weight: 800; letter-spacing: .02em; }
  .sep { color: #2E5396; }
`

export async function printQrLabels(labels: QrLabel[]): Promise<void> {
  if (!labels.length) return
  const qrs = await Promise.all(labels.map(l => QRCode.toDataURL(l.url, { width: 1000, margin: 0, errorCorrectionLevel: 'M' })))
  const logo = new URL(logoUrl, window.location.href).href
  const body = labels.map((l, i) => `
    <div class="label">
      <div class="head"><img src="${logo}" alt="New Armada"></div>
      <div class="body"><img src="${qrs[i]}" alt=""></div>
      <div class="foot"><b>${esc(l.title)}</b><span class="sep">|</span><span>${esc(l.sub)}</span></div>
    </div>`).join('')

  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden'
  document.body.appendChild(frame)
  const doc = frame.contentDocument!
  doc.open()
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>Label QR</title><style>${CSS}</style></head><body>${body}</body></html>`)
  doc.close()

  // Tunggu logo & QR termuat — tanpa ini logo bisa kosong di hasil cetak.
  await Promise.all([...doc.images].map(img => img.decode().catch(() => undefined)))
  await new Promise<void>(resolve => {
    const win = frame.contentWindow!
    win.addEventListener('afterprint', () => resolve(), { once: true })
    win.focus()
    win.print()
    setTimeout(resolve, 60_000)   // cadangan bila afterprint tidak terpicu
  })
  frame.remove()
}
