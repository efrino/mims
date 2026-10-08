import { bukuBaru, capWaktu, simpan, susunSheet, teks } from '@/services/Shared/ExcelTabel';
import type { StoTagListRow, StoTagOkRow } from '@/types/Admin/StoTagList';
import type { StoReportRow } from '@/types/Admin/StoReport';

/**
 * Export Excel halaman Admin > STO > List Tags.
 *
 * Tiga berkas dengan kerangka yang sama -- judul, baris keterangan filter,
 * waktu unduh, lalu tabel ber-header beku. Yang berbeda cuma kolomnya.
 */

// ── 1. Tag STO ──────────────────────────────────────────────────────────────
const LABEL_BATAL: Record<number, string> = { 0: 'Normal', 1: 'Dibatalkan', 2: 'Diajukan Batal' };

export const exportTagStoExcel = async (rows: StoTagListRow[], meta: { label: string; isi: string }[]): Promise<void> => {
  const wb = bukuBaru();
  const ws = wb.addWorksheet('Tag STO');

  susunSheet(ws, {
    judul: 'LIST TAG STO',
    meta,
    data: rows,
    kolom: [
      { header: 'No', width: 6, align: 'center', nilai: (_r, i) => i + 1 },
      { header: 'ID Tag', width: 20, nilai: (r: StoTagListRow) => teks(r.id_tag) },
      { header: 'Event', width: 26, nilai: (r: StoTagListRow) => teks(r.event_name) || '-' },
      { header: 'Area', width: 10, align: 'center', nilai: (r: StoTagListRow) => teks(r.area) },
      { header: 'Part Number', width: 22, nilai: (r: StoTagListRow) => teks(r.part_number) },
      { header: 'Job Number', width: 18, nilai: (r: StoTagListRow) => teks(r.job_number) },
      { header: 'Deskripsi', width: 34, nilai: (r: StoTagListRow) => teks(r.material_description) },
      { header: 'Type', width: 10, align: 'center', nilai: (r: StoTagListRow) => teks(r.type) },
      { header: 'Model', width: 12, align: 'center', nilai: (r: StoTagListRow) => teks(r.model) },
      { header: 'Customer', width: 14, nilai: (r: StoTagListRow) => teks(r.customer) },
      { header: 'NIK Tim A', width: 12, align: 'center', nilai: (r: StoTagListRow) => teks(r.nik_a) || '-' },
      { header: 'Qty Tim A', width: 11, align: 'right', nilai: (r: StoTagListRow) => (r.updated_a ? r.qty_a : '') },
      { header: 'Waktu Tim A', width: 20, align: 'center', nilai: (r: StoTagListRow) => teks(r.updated_a) || '-' },
      { header: 'NIK Tim B', width: 12, align: 'center', nilai: (r: StoTagListRow) => teks(r.nik_b) || '-' },
      { header: 'Qty Tim B', width: 11, align: 'right', nilai: (r: StoTagListRow) => (r.updated_b ? r.qty_b : '') },
      { header: 'Waktu Tim B', width: 20, align: 'center', nilai: (r: StoTagListRow) => teks(r.updated_b) || '-' },
      { header: 'Status', width: 15, align: 'center', nilai: (r: StoTagListRow) => LABEL_BATAL[r.is_canceled] ?? '-' },
      { header: 'Alasan Batal', width: 26, nilai: (r: StoTagListRow) => teks(r.cancel_reason) || '-' },
      { header: 'Cetak', width: 12, align: 'center', nilai: (r: StoTagListRow) => teks(r.print_status) || '-' },
      { header: 'Dicetak Oleh', width: 14, align: 'center', nilai: (r: StoTagListRow) => teks(r.created_by_nik) || '-' },
      { header: 'Dibuat', width: 20, align: 'center', nilai: (r: StoTagListRow) => teks(r.created_at) || '-' }
    ]
  });

  await simpan(wb, `List_Tag_STO_${capWaktu()}.xlsx`);
};

// ── 2. Tag OK ───────────────────────────────────────────────────────────────
export const exportTagOkExcel = async (rows: StoTagOkRow[], meta: { label: string; isi: string }[]): Promise<void> => {
  const wb = bukuBaru();
  const ws = wb.addWorksheet('Tag OK');

  susunSheet(ws, {
    judul: 'LIST TAG OK',
    meta,
    data: rows,
    kolom: [
      { header: 'No', width: 6, align: 'center', nilai: (_r, i) => i + 1 },
      { header: 'ID Tag OK', width: 24, nilai: (r: StoTagOkRow) => teks(r.id_tag_ok) },
      { header: 'Area', width: 10, align: 'center', nilai: (r: StoTagOkRow) => teks(r.area) },
      { header: 'Part Number', width: 22, nilai: (r: StoTagOkRow) => teks(r.part_number) },
      { header: 'Job Number', width: 18, nilai: (r: StoTagOkRow) => teks(r.job_number) },
      { header: 'Line', width: 22, nilai: (r: StoTagOkRow) => teks(r.line) || '-' },
      { header: 'Shift', width: 8, align: 'center', nilai: (r: StoTagOkRow) => r.shift ?? '' },
      { header: 'Customer', width: 16, nilai: (r: StoTagOkRow) => teks(r.customer) },
      { header: 'Project', width: 12, align: 'center', nilai: (r: StoTagOkRow) => teks(r.project) },
      { header: 'Status Part', width: 12, align: 'center', nilai: (r: StoTagOkRow) => teks(r.status) },
      { header: 'Qty KBN', width: 11, align: 'right', nilai: (r: StoTagOkRow) => Number(r.qty_kbn ?? 0) },
      { header: 'Scan', width: 14, align: 'center', nilai: (r: StoTagOkRow) => (r.scan_open === 1 ? 'Belum discan' : 'Sudah discan') },
      { header: 'Discan Oleh', width: 14, align: 'center', nilai: (r: StoTagOkRow) => teks(r.scanned_by) || '-' },
      { header: 'Waktu Scan', width: 20, align: 'center', nilai: (r: StoTagOkRow) => teks(r.scanned_at) || '-' },
      { header: 'Disiapkan Oleh', width: 14, align: 'center', nilai: (r: StoTagOkRow) => teks(r.opened_by) || '-' },
      { header: 'Waktu Siap', width: 20, align: 'center', nilai: (r: StoTagOkRow) => teks(r.opened_at) || '-' },
      { header: 'Status', width: 15, align: 'center', nilai: (r: StoTagOkRow) => LABEL_BATAL[r.is_canceled] ?? '-' },
      { header: 'Alasan Batal', width: 26, nilai: (r: StoTagOkRow) => teks(r.cancel_reason) || '-' }
    ]
  });

  await simpan(wb, `List_Tag_OK_${capWaktu()}.xlsx`);
};

// ── 3. Report STO ───────────────────────────────────────────────────────────
export const exportReportStoExcel = async (rows: StoReportRow[], meta: { label: string; isi: string }[]): Promise<void> => {
  const wb = bukuBaru();
  const ws = wb.addWorksheet('Report STO');

  const jumlah = (ambil: (r: StoReportRow) => number) => rows.reduce((t, r) => t + ambil(r), 0);

  susunSheet(ws, {
    judul: 'REPORT STO PER PART NUMBER',
    meta,
    data: rows,
    kolom: [
      { header: 'No', width: 6, align: 'center', nilai: (_r, i) => i + 1 },
      { header: 'Part Number', width: 24, nilai: (r: StoReportRow) => teks(r.part_number) || '-' },
      { header: 'Job Number', width: 20, nilai: (r: StoReportRow) => teks(r.job_number) || '-' },
      { header: 'Area', width: 10, align: 'center', nilai: (r: StoReportRow) => teks(r.area) },
      { header: 'Customer', width: 16, nilai: (r: StoReportRow) => teks(r.customer) || '-' },
      { header: 'Plant', width: 12, nilai: (r: StoReportRow) => teks(r.plant) || '-' },
      { header: 'SLoc', width: 10, align: 'center', nilai: (r: StoReportRow) => teks(r.sloc) || '-' },
      { header: 'Kategori', width: 12, align: 'center', nilai: (r: StoReportRow) => teks(r.category) || '-' },
      { header: 'Deskripsi', width: 34, nilai: (r: StoReportRow) => teks(r.material_description) || '-' },
      { header: 'Jumlah Tag STO', width: 15, align: 'right', nilai: (r: StoReportRow) => r.sto_total_tag },
      { header: 'Qty STO Tim A', width: 15, align: 'right', nilai: (r: StoReportRow) => r.sto_qty_a },
      { header: 'Qty STO Tim B', width: 15, align: 'right', nilai: (r: StoReportRow) => r.sto_qty_b },
      { header: 'Selisih A - B', width: 14, align: 'right', nilai: (r: StoReportRow) => r.sto_selisih },
      { header: 'Jumlah Tag OK', width: 15, align: 'right', nilai: (r: StoReportRow) => r.ok_total_tag },
      { header: 'Qty Tag OK', width: 14, align: 'right', nilai: (r: StoReportRow) => r.ok_total_qty }
    ],
    total: {
      0: 'TOTAL',
      1: `${rows.length} baris`,
      9: jumlah((r) => r.sto_total_tag),
      10: jumlah((r) => r.sto_qty_a),
      11: jumlah((r) => r.sto_qty_b),
      12: jumlah((r) => r.sto_selisih),
      13: jumlah((r) => r.ok_total_tag),
      14: jumlah((r) => r.ok_total_qty)
    }
  });

  await simpan(wb, `Report_STO_${capWaktu()}.xlsx`);
};
