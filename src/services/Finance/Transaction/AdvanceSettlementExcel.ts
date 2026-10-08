import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { AdvanceSettlementItem, KasbonStatus } from '@/types/Finance/Transaction/AdvanceSettlement';

/**
 * Export Excel halaman Finance > Transaction > Advance Settlement.
 *
 * Satu sheet per status yang dipilih (Open / Approved / Closed), kolomnya sama dengan tabel tab
 * masing-masing di layar. Angka ditulis sebagai angka (bukan "Rp ..." string) supaya bisa dijumlah.
 */

const C = {
  titleFill: '1D4ED8',
  titleText: 'FFFFFF',
  headFill: 'DBEAFE',
  headText: '1E3A8A',
  metaLabel: '6B7280',
  metaText: '1F2937',
  border: 'CBD5E1',
  zebra: 'F8FAFC',
  text: '1F2937',
  totalFill: 'E5E7EB'
};

const argb = (hex: string) => 'FF' + hex;
const fill = (hex: string): ExcelJS.Fill => ({ type: 'pattern', pattern: 'solid', fgColor: { argb: argb(hex) } });
const border = (hex = C.border): Partial<ExcelJS.Borders> => {
  const side = { style: 'thin' as const, color: { argb: argb(hex) } };
  return { top: side, left: side, bottom: side, right: side };
};
const font = (color: string, bold = false, size = 10): Partial<ExcelJS.Font> => ({
  name: 'Calibri',
  size,
  bold,
  color: { argb: argb(color) }
});

const dua = (n: number) => String(n).padStart(2, '0');
const waktuSekarang = (): string => {
  const d = new Date();
  return `${dua(d.getDate())}/${dua(d.getMonth() + 1)}/${d.getFullYear()} ${dua(d.getHours())}:${dua(d.getMinutes())}:${dua(d.getSeconds())}`;
};
const capWaktu = (): string => {
  const d = new Date();
  return `${d.getFullYear()}${dua(d.getMonth() + 1)}${dua(d.getDate())}-${dua(d.getHours())}${dua(d.getMinutes())}`;
};

const toNumber = (val: unknown): number => {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (typeof val === 'string' && val !== '') {
    const n = parseFloat(val.replace(/,/g, ''));
    return isNaN(n) ? 0 : n;
  }
  return 0;
};

// Sama dengan bucket overdue di tabel: dihitung dari due_date terhadap hari ini (hanya Open/Approved)
const overdueLabel = (row: AdvanceSettlementItem): string => {
  if (row.status === 'Closed' || !row.due_date) return '-';
  const due = new Date(row.due_date);
  const today = new Date();
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const late = Math.round((today.getTime() - due.getTime()) / 86400000);
  if (late <= 0) return 'Belum Jatuh Tempo';
  if (late <= 5) return '0-5 Hari';
  if (late <= 10) return '6-10 Hari';
  if (late <= 15) return '11-15 Hari';
  if (late <= 20) return '16-20 Hari';
  if (late <= 25) return '21-25 Hari';
  return '>25 Hari';
};

interface Kolom {
  header: string;
  width: number;
  nilai: (row: AdvanceSettlementItem) => string | number;
  align?: 'left' | 'center' | 'right';
  money?: boolean;
}

const MONEY_FMT = '#,##0;-#,##0;0';

const K = {
  kasbonNo: { header: 'No. Kasbon', width: 14, nilai: (r) => r.kasbon_no ?? '-' },
  kasbonDate: { header: 'Tgl Kasbon', width: 12, nilai: (r) => r.kasbon_date ?? '-', align: 'center' },
  karyawan: { header: 'Karyawan', width: 24, nilai: (r) => r.employee_name ?? '-' },
  pic: { header: 'PIC', width: 24, nilai: (r) => r.created_by_name ?? '-' },
  kategori: { header: 'Kategori', width: 16, nilai: (r) => r.category_name ?? '-' },
  keterangan: { header: 'Keterangan', width: 40, nilai: (r) => r.description ?? '' },
  nominal: { header: 'Nominal', width: 15, nilai: (r) => toNumber(r.amount), money: true },
  nominalBkk: { header: 'Nominal BKK', width: 15, nilai: (r) => toNumber(r.realization_amount), money: true },
  cashReceived: { header: 'Cash Received', width: 15, nilai: (r) => toNumber(r.cash_received), money: true },
  outstanding: { header: 'Outstanding', width: 15, nilai: (r) => toNumber(r.outstanding_amount), money: true },
  approvedBy: { header: 'Di-approve Oleh', width: 16, nilai: (r) => r.approved_by ?? '-' },
  dueDate: { header: 'Jatuh Tempo', width: 12, nilai: (r) => r.due_date ?? '-', align: 'center' },
  overdue: { header: 'Overdue', width: 18, nilai: (r) => overdueLabel(r), align: 'center' },
  status: { header: 'Status', width: 11, nilai: (r) => r.status, align: 'center' }
} satisfies Record<string, Kolom>;

// Urutan kolom per status mengikuti tabel tab masing-masing di AdvanceSettlement.vue
const KOLOM_PER_STATUS: Record<KasbonStatus, Kolom[]> = {
  Open: [K.kasbonNo, K.kasbonDate, K.karyawan, K.pic, K.kategori, K.keterangan, K.nominal, K.nominalBkk, K.cashReceived, K.outstanding, K.dueDate, K.overdue, K.status],
  Approved: [K.kasbonNo, K.kasbonDate, K.karyawan, K.pic, K.kategori, K.keterangan, K.nominal, K.nominalBkk, K.cashReceived, K.outstanding, K.approvedBy, K.dueDate, K.overdue, K.status],
  Closed: [K.kasbonNo, K.kasbonDate, K.karyawan, K.pic, K.kategori, K.keterangan, K.nominal, K.nominalBkk, K.cashReceived, K.outstanding, K.dueDate, K.status]
};

export interface AdvanceSettlementExcelSheet {
  status: KasbonStatus;
  rows: AdvanceSettlementItem[];
}

export interface AdvanceSettlementExcelInput {
  sheets: AdvanceSettlementExcelSheet[];
  /** Keterangan rentang tanggal untuk data Closed, mis. "01/09/2026 - 01/10/2026" */
  closedDateRangeLabel: string;
}

function tulisSheet(wb: ExcelJS.Workbook, sheet: AdvanceSettlementExcelSheet, closedDateRangeLabel: string) {
  // Kolom "No" di depan, lalu kolom tabel tab — kolom ke-c (1-based) = kolom[c - 2]
  const kolom = KOLOM_PER_STATUS[sheet.status];
  const ws = wb.addWorksheet(sheet.status, { views: [{ showGridLines: false }] });
  ws.getColumn(1).width = 6;
  kolom.forEach((k, i) => (ws.getColumn(i + 2).width = k.width));
  const lastCol = kolom.length + 1;

  // Judul
  ws.mergeCells(1, 1, 1, lastCol);
  const title = ws.getCell(1, 1);
  title.value = `ADVANCE SETTLEMENT — ${sheet.status.toUpperCase()}`;
  title.font = font(C.titleText, true, 14);
  title.fill = fill(C.titleFill);
  title.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(1).height = 26;

  // Open/Approved di-fetch dengan outstanding_all=1 → tidak terfilter tanggal
  const periode = sheet.status === 'Closed' ? closedDateRangeLabel || '-' : 'Semua kasbon outstanding (tanpa filter tanggal)';
  const meta: [string, string][] = [
    ['Periode', periode],
    ['Jumlah data', `${sheet.rows.length} kasbon`],
    ['Diunduh', waktuSekarang()]
  ];
  meta.forEach(([label, isi], i) => {
    const r = 2 + i;
    ws.getCell(r, 1).value = label;
    ws.getCell(r, 1).font = font(C.metaLabel);
    ws.mergeCells(r, 2, r, lastCol);
    ws.getCell(r, 2).value = isi;
    ws.getCell(r, 2).font = font(C.metaText, true);
  });

  // Header (No + kolom tabel)
  const headRow = 6;
  const headers = ['No', ...kolom.map((k) => k.header)];
  headers.forEach((h, i) => {
    const cell = ws.getCell(headRow, i + 1);
    cell.value = h;
    cell.fill = fill(C.headFill);
    cell.font = font(C.headText, true);
    cell.border = border();
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });
  ws.getRow(headRow).height = 20;

  // Data
  sheet.rows.forEach((row, idx) => {
    const r = headRow + 1 + idx;
    const zebra = idx % 2 === 1;
    const noCell = ws.getCell(r, 1);
    noCell.value = idx + 1;
    noCell.alignment = { vertical: 'middle', horizontal: 'center' };
    noCell.font = font(C.text);
    noCell.border = border();
    if (zebra) noCell.fill = fill(C.zebra);

    kolom.forEach((k, i) => {
      const cell = ws.getCell(r, i + 2);
      cell.value = k.nilai(row);
      cell.font = font(C.text);
      cell.border = border();
      if (zebra) cell.fill = fill(C.zebra);
      if (k.money) {
        cell.numFmt = MONEY_FMT;
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: k.align ?? 'left', wrapText: k === K.keterangan };
      }
    });
  });

  // Total untuk kolom uang
  if (sheet.rows.length > 0) {
    const r = headRow + 1 + sheet.rows.length;
    const totalLabel = ws.getCell(r, 1);
    totalLabel.value = 'Total';
    for (let c = 1; c <= lastCol; c++) {
      const cell = ws.getCell(r, c);
      cell.fill = fill(C.totalFill);
      cell.font = font(C.text, true);
      cell.border = border();
    }
    kolom.forEach((k, i) => {
      if (!k.money) return;
      const cell = ws.getCell(r, i + 2);
      cell.value = sheet.rows.reduce((s, row) => s + toNumber(k.nilai(row)), 0);
      cell.numFmt = MONEY_FMT;
      cell.alignment = { vertical: 'middle', horizontal: 'right' };
    });
  }

  ws.views = [{ state: 'frozen', ySplit: headRow, showGridLines: false }];
}

export async function exportAdvanceSettlementExcel(input: AdvanceSettlementExcelInput): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'MIMS';
  wb.created = new Date();
  input.sheets.forEach((s) => tulisSheet(wb, s, input.closedDateRangeLabel));

  const suffix = input.sheets.length === 1 ? `_${input.sheets[0].status}` : '';
  const buffer = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `Advance_Settlement${suffix}_${capWaktu()}.xlsx`
  );
}
