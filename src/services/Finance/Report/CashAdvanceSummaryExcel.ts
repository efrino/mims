import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { CashAdvanceSummaryItem, CashAdvanceSummaryDepartmentItem } from '@/types/Finance/Report/CashAdvanceSummary';

/**
 * Export Excel halaman Finance > Report > Advance Payment Summary.
 *
 * Mengikuti tabel di layar: header 2 baris dengan grup "Over Due (Hari)", sorot kuning untuk bucket
 * overdue yang sudah dilewati, dan baris Grand Total. Karena Excel tidak bisa "expand", rincian
 * karyawan langsung ditulis di bawah baris departemennya (menjorok), jadi semua data ikut terekspor.
 */

const C = {
  titleFill: '1D4ED8',
  titleText: 'FFFFFF',
  headFill: 'DBEAFE',
  subHeadFill: 'EFF6FF',
  headText: '1E3A8A',
  metaLabel: '6B7280',
  metaText: '1F2937',
  border: 'CBD5E1',
  deptFill: 'FFFFFF',
  empFill: 'F9FAFB',
  highlight: 'FEF08A',
  text: '1F2937',
  muted: '6B7280',
  totalFill: 'E5E7EB'
};

const argb = (hex: string) => 'FF' + hex;
const fill = (hex: string): ExcelJS.Fill => ({ type: 'pattern', pattern: 'solid', fgColor: { argb: argb(hex) } });
const border = (hex = C.border): Partial<ExcelJS.Borders> => {
  const side = { style: 'thin' as const, color: { argb: argb(hex) } };
  return { top: side, left: side, bottom: side, right: side };
};
const font = (color: string, bold = false, size = 10, italic = false): Partial<ExcelJS.Font> => ({
  name: 'Calibri',
  size,
  bold,
  italic,
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

// API kadang mengirim angka sebagai string ("2000000.00") — dibersihkan supaya tetap angka di Excel
const toNumber = (val: unknown): number => {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (typeof val === 'string') {
    const n = parseFloat(val.replace(/,/g, ''));
    return isNaN(n) ? 0 : n;
  }
  return 0;
};

const OVERDUE_KEYS = ['overdue_0_5', 'overdue_6_10', 'overdue_11_15', 'overdue_16_20', 'overdue_21_25', 'overdue_gt_25'] as const;
const OVERDUE_LABELS = ['0 - 5', '6-10', '11-15', '16-20', '21-25', '>25'];
type SummaryRow = CashAdvanceSummaryDepartmentItem | CashAdvanceSummaryItem;
type Totals = Record<'qty_kasbon' | 'balance_due' | 'current_amount' | (typeof OVERDUE_KEYS)[number], number>;

// Sama seperti tampilan tabel: bucket aktif + semua bucket sebelumnya ("sudah dilewati") disorot kuning
const furthestOverdueIdx = (row: SummaryRow) =>
  OVERDUE_KEYS.reduce((acc, k, i) => (toNumber(row[k]) > 0 ? i : acc), -1);

// Kolom: A Departemen/Karyawan, B Qty, C Balance Due, D Current, E–J Over Due, K Keterangan
const COL_COUNT = 11;
const COL_WIDTHS = [34, 12, 16, 16, 14, 14, 14, 14, 14, 14, 18];
const MONEY_FMT = '#,##0;-#,##0;"-"';
const QTY_FMT = '0;-0;"-"';

export interface CashAdvanceSummaryExcelInput {
  departmentRows: CashAdvanceSummaryDepartmentItem[];
  employeesByDepartment: (department: string) => CashAdvanceSummaryItem[];
  grandTotal: Totals;
  tillDateLabel: string;
  /** Terisi jika data dibatasi ke satu departemen (user tanpa akses ViewAll) */
  scopedDepartment?: string;
}

export async function exportCashAdvanceSummaryExcel(input: CashAdvanceSummaryExcelInput): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'MIMS';
  wb.created = new Date();
  const ws = wb.addWorksheet('Advance Payment Summary', { views: [{ showGridLines: false }] });
  COL_WIDTHS.forEach((w, i) => (ws.getColumn(i + 1).width = w));

  // ── Judul & meta ──────────────────────────────────────────────
  ws.mergeCells(1, 1, 1, COL_COUNT);
  const title = ws.getCell(1, 1);
  title.value = 'ADVANCE PAYMENT SUMMARY';
  title.font = font(C.titleText, true, 14);
  title.fill = fill(C.titleFill);
  title.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(1).height = 26;

  const meta: [string, string][] = [
    ['Data overdue per', input.tillDateLabel || '-'],
    ['Departemen', input.scopedDepartment || 'Semua departemen'],
    ['Diunduh', waktuSekarang()]
  ];
  meta.forEach(([label, isi], i) => {
    const r = 2 + i;
    ws.getCell(r, 1).value = label;
    ws.getCell(r, 1).font = font(C.metaLabel);
    ws.mergeCells(r, 2, r, COL_COUNT);
    ws.getCell(r, 2).value = isi;
    ws.getCell(r, 2).font = font(C.metaText, true);
  });

  // ── Header 2 baris (mirip tabel di layar) ─────────────────────
  const h1 = 6;
  const h2 = 7;
  const singleHeaders: [number, string][] = [
    [1, 'Departemen / Karyawan'],
    [2, 'Qty Kas Bon'],
    [3, 'Balance Due'],
    [4, 'Current'],
    [11, 'Keterangan']
  ];
  singleHeaders.forEach(([col, text]) => {
    ws.mergeCells(h1, col, h2, col);
    ws.getCell(h1, col).value = text;
  });
  ws.mergeCells(h1, 5, h1, 10);
  ws.getCell(h1, 5).value = 'Over Due (Hari)';
  OVERDUE_LABELS.forEach((label, i) => (ws.getCell(h2, 5 + i).value = label));

  for (let r = h1; r <= h2; r++) {
    for (let c = 1; c <= COL_COUNT; c++) {
      const cell = ws.getCell(r, c);
      const isSubHeader = r === h2 && c >= 5 && c <= 10;
      cell.fill = fill(isSubHeader ? C.subHeadFill : C.headFill);
      cell.font = font(C.headText, true);
      cell.border = border();
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    }
  }
  ws.getRow(h1).height = 20;
  ws.getRow(h2).height = 20;

  // ── Isi: baris departemen + rincian karyawan di bawahnya ──────
  let r = h2 + 1;
  const writeRow = (label: string, row: SummaryRow, isEmployee: boolean) => {
    const furthest = furthestOverdueIdx(row);
    const values: (string | number)[] = [
      label,
      toNumber(row.qty_kasbon),
      toNumber(row.balance_due),
      toNumber(row.current_amount),
      ...OVERDUE_KEYS.map((k) => toNumber(row[k])),
      '-'
    ];
    values.forEach((v, i) => {
      const cell = ws.getCell(r, i + 1);
      const col = i + 1;
      cell.value = v;
      cell.border = border();
      cell.fill = fill(isEmployee ? C.empFill : C.deptFill);
      cell.font = font(isEmployee ? C.muted : C.text, !isEmployee && col === 1);
      if (col === 1) {
        cell.alignment = { vertical: 'middle', horizontal: 'left', indent: isEmployee ? 2 : 0 };
      } else if (col === 2) {
        cell.numFmt = QTY_FMT;
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else if (col === 11) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.font = font(C.muted);
      } else {
        cell.numFmt = MONEY_FMT;
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        if (col === 3) cell.font = font(isEmployee ? C.muted : C.text, true);
        const overdueIdx = col - 5;
        if (overdueIdx >= 0 && overdueIdx <= furthest) {
          cell.fill = fill(C.highlight);
          cell.font = font(C.text, true);
        }
      }
    });
    r++;
  };

  input.departmentRows.forEach((dept) => {
    writeRow(dept.department || '-', dept, false);
    input.employeesByDepartment(dept.department).forEach((emp) => {
      writeRow(`↳ ${emp.name || emp.nik}`, emp, true);
    });
  });

  // ── Grand Total ───────────────────────────────────────────────
  if (input.departmentRows.length > 0) {
    const t = input.grandTotal;
    const totals = [
      'Grand Total',
      t.qty_kasbon,
      t.balance_due,
      t.current_amount,
      ...OVERDUE_KEYS.map((k) => t[k]),
      ''
    ];
    totals.forEach((v, i) => {
      const cell = ws.getCell(r, i + 1);
      const col = i + 1;
      cell.value = v;
      cell.fill = fill(C.totalFill);
      cell.font = font(C.text, true);
      cell.border = border();
      if (col === 1) cell.alignment = { vertical: 'middle', horizontal: 'left' };
      else if (col === 2) {
        cell.numFmt = QTY_FMT;
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else if (col <= 10) {
        cell.numFmt = MONEY_FMT;
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      }
    });
  }

  // Header beku supaya tetap terlihat saat scroll
  ws.views = [{ state: 'frozen', ySplit: h2, showGridLines: false }];

  const buffer = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `Advance_Payment_Summary_${capWaktu()}.xlsx`
  );
}
