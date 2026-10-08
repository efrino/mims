import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

/**
 * Kerangka bersama berkas Excel dashboard: judul, baris keterangan filter, waktu
 * unduh, lalu tabel ber-header beku dengan autofilter. Awalnya milik List Tags STO
 * (`StoTagListExcel.ts`); dipindah ke sini supaya halaman lain (Folder Sharing)
 * menghasilkan berkas yang tampilannya sama tanpa menyalin kode.
 */

export const C = {
  titleFill: '1D4ED8',
  titleText: 'FFFFFF',
  headFill: 'DBEAFE',
  headText: '1E3A8A',
  metaLabel: '6B7280',
  metaText: '1F2937',
  border: 'CBD5E1',
  zebra: 'F8FAFC',
  text: '1F2937',
  muted: '9CA3AF',
  totalFill: 'E5E7EB'
};

export const argb = (hex: string) => 'FF' + hex;

export const fill = (hex: string): ExcelJS.Fill => ({ type: 'pattern', pattern: 'solid', fgColor: { argb: argb(hex) } });

export const border = (hex = C.border): Partial<ExcelJS.Borders> => {
  const side = { style: 'thin' as const, color: { argb: argb(hex) } };
  return { top: side, left: side, bottom: side, right: side };
};

export const font = (color: string, bold = false, size = 10): Partial<ExcelJS.Font> => ({
  name: 'Calibri',
  size,
  bold,
  color: { argb: argb(color) }
});

export const dua = (n: number) => String(n).padStart(2, '0');

/** "09/09/2026 14:33:07" -- jam mesin, bukan UTC. */
export const waktuSekarang = (): string => {
  const d = new Date();
  return `${dua(d.getDate())}/${dua(d.getMonth() + 1)}/${d.getFullYear()} ${dua(d.getHours())}:${dua(d.getMinutes())}:${dua(d.getSeconds())}`;
};

/** "20260909-1433" -- dipakai di nama berkas supaya unduhan tidak saling timpa. */
export const capWaktu = (): string => {
  const d = new Date();
  return `${d.getFullYear()}${dua(d.getMonth() + 1)}${dua(d.getDate())}-${dua(d.getHours())}${dua(d.getMinutes())}`;
};

export interface KolomExcel {
  header: string;
  width: number;
  /** Nilai satu sel. Dikembalikan apa adanya supaya angka tetap angka di Excel. */
  nilai: (row: never, index: number) => string | number;
  align?: 'left' | 'center' | 'right';
}

export interface OpsiSheet {
  judul: string;
  /** Baris keterangan di bawah judul: label -> isi. */
  meta: { label: string; isi: string }[];
  kolom: KolomExcel[];
  data: unknown[];
  /** Baris total di kaki tabel: index kolom -> nilai. */
  total?: Record<number, string | number>;
}

/**
 * Rangka satu sheet. Judul dan meta ditaruh di baris atas yang di-merge,
 * lalu header tabel dibekukan supaya tetap terlihat saat digulir.
 */
export const susunSheet = (ws: ExcelJS.Worksheet, opsi: OpsiSheet): void => {
  const jumlahKolom = opsi.kolom.length;
  const kolomTerakhir = ws.getColumn(jumlahKolom).letter;

  // ── Judul ──
  ws.mergeCells(`A1:${kolomTerakhir}1`);
  const judul = ws.getCell('A1');
  judul.value = opsi.judul;
  judul.font = font(C.titleText, true, 14);
  judul.fill = fill(C.titleFill);
  judul.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(1).height = 28;

  // ── Meta: label di kolom A, isinya di-merge sampai kolom terakhir ──
  let baris = 2;
  const metaLengkap = [...opsi.meta, { label: 'Waktu Unduh', isi: waktuSekarang() }];

  // Label dan isinya ditaruh dalam SATU sel yang di-merge selebar tabel, bukan
  // dua sel bersebelahan. Kolom A cuma selebar nomor urut, jadi label yang
  // berdiri sendiri di sana selalu terpotong.
  for (const m of metaLengkap) {
    ws.mergeCells(`A${baris}:${kolomTerakhir}${baris}`);
    const sel = ws.getCell(`A${baris}`);

    sel.value = {
      richText: [
        { font: { ...font(C.metaLabel, true), size: 10 }, text: `${m.label}  :  ` },
        { font: { ...font(C.metaText), size: 10 }, text: m.isi }
      ]
    };
    sel.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    ws.getRow(baris).height = 16;

    baris += 1;
  }

  baris += 1; // satu baris kosong sebagai pemisah

  // ── Header tabel ──
  const barisHeader = baris;
  const header = ws.getRow(barisHeader);

  opsi.kolom.forEach((k, i) => {
    const sel = header.getCell(i + 1);
    sel.value = k.header;
    sel.font = font(C.headText, true);
    sel.fill = fill(C.headFill);
    sel.border = border();
    sel.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });
  header.height = 22;

  ws.columns.forEach((kolom, i) => {
    kolom.width = opsi.kolom[i]?.width ?? 14;
  });

  // ── Isi ──
  opsi.data.forEach((row, i) => {
    const r = ws.getRow(barisHeader + 1 + i);

    opsi.kolom.forEach((k, j) => {
      const sel = r.getCell(j + 1);
      sel.value = k.nilai(row as never, i);
      sel.font = font(C.text);
      sel.border = border();
      sel.alignment = { vertical: 'middle', horizontal: k.align ?? 'left' };
      if (i % 2 === 1) sel.fill = fill(C.zebra);
    });
  });

  const barisTerakhirData = barisHeader + opsi.data.length;

  // ── Baris total ──
  if (opsi.total) {
    const r = ws.getRow(barisTerakhirData + 1);

    opsi.kolom.forEach((_, j) => {
      const sel = r.getCell(j + 1);
      sel.value = opsi.total?.[j] ?? (j === 0 ? 'TOTAL' : '');
      sel.font = font(C.headText, true);
      sel.fill = fill(C.totalFill);
      sel.border = border();
      sel.alignment = { vertical: 'middle', horizontal: j === 0 ? 'left' : (opsi.kolom[j].align ?? 'left') };
    });
  }

  if (opsi.data.length === 0) {
    const sel = ws.getCell(`A${barisHeader + 1}`);
    ws.mergeCells(`A${barisHeader + 1}:${kolomTerakhir}${barisHeader + 1}`);
    sel.value = 'Tidak ada data yang cocok dengan filter ini.';
    sel.font = font(C.muted, false);
    sel.alignment = { vertical: 'middle', horizontal: 'center' };
  }

  // Header tetap terlihat saat digulir, dan bisa langsung disaring di Excel.
  ws.views = [{ state: 'frozen', ySplit: barisHeader }];

  if (opsi.data.length > 0) {
    ws.autoFilter = { from: { row: barisHeader, column: 1 }, to: { row: barisTerakhirData, column: jumlahKolom } };
  }
};

export const simpan = async (wb: ExcelJS.Workbook, namaFile: string): Promise<void> => {
  const buffer = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), namaFile);
};

export const bukuBaru = (): ExcelJS.Workbook => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'MAJ Inventory Dashboard';
  wb.created = new Date();
  return wb;
};

export const teks = (v: unknown): string => String(v ?? '').trim();
