import { bukuBaru, capWaktu, simpan, susunSheet, teks, type KolomExcel } from '@/services/Shared/ExcelTabel';
import type { FolderSharingRequest, FolderSharingStatus } from '@/types/Approval/FolderSharing';

/**
 * Export Excel halaman General > Folder Sharing.
 *
 * Barisnya adalah yang sedang tampil di tabel -- sesudah filter server (status,
 * tanggal), filter checklist tiap kolom, dan urutan sort -- bukan seluruh data.
 * Pemanggil yang mengambilnya dari `TableExcel.getVisibleRows()`.
 */

export const LABEL_STATUS: Record<FolderSharingStatus, string> = {
  pending: 'Menunggu Dept. Pemohon',
  pending_tujuan: 'Menunggu Dept. Tujuan',
  approved: 'Disetujui',
  rejected: 'Ditolak',
  canceled: 'Dibatalkan',
  granted: 'Akses Diberikan',
  revoked: 'Akses Ditarik'
};

const dua = (n: number) => String(n).padStart(2, '0');

/** "2026-09-18 08:42:07" -> "18/09/2026 08:42". Kosong jadi "-". */
const tanggalJam = (v: string | null | undefined, denganJam = true): string => {
  if (!v) return '-';
  const d = new Date(v.replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return v;
  const tgl = `${dua(d.getDate())}/${dua(d.getMonth() + 1)}/${d.getFullYear()}`;
  return denganJam ? `${tgl} ${dua(d.getHours())}:${dua(d.getMinutes())}` : tgl;
};

/** "Nama (NIK)" untuk kolom jejak; "-" kalau belum ada. */
const oleh = (nama: string | null, nik: string | null): string => {
  if (!nik) return '-';
  return nama && nama !== nik ? `${nama} (${nik})` : nik;
};

type R = FolderSharingRequest;

const KOLOM: KolomExcel[] = [
  { header: 'No', width: 5, nilai: (_r: R, i: number) => i + 1, align: 'center' },
  { header: 'No. Request', width: 14, nilai: (r: R) => teks(r.no_request) },
  { header: 'Tanggal', width: 17, nilai: (r: R) => tanggalJam(r.created_at), align: 'center' },
  { header: 'Nama', width: 24, nilai: (r: R) => teks(r.nama) },
  { header: 'NIK', width: 12, nilai: (r: R) => teks(r.nik) },
  { header: 'Departemen', width: 20, nilai: (r: R) => teks(r.departemen) },
  { header: 'Dept. Tujuan', width: 20, nilai: (r: R) => teks(r.departemen_tujuan) },
  { header: 'Folder', width: 36, nilai: (r: R) => teks(r.folder_path) },
  { header: 'Alasan / Kebutuhan', width: 40, nilai: (r: R) => teks(r.alasan) },
  {
    header: 'Akses',
    width: 18,
    nilai: (r: R) => {
      if (r.jenis_akses === '3bulan') return `3 Bulan (s/d ${tanggalJam(r.akses_sampai, false)})`;
      if (r.jenis_akses === 'sampai') return `Sampai ${tanggalJam(r.akses_sampai, false)}`;
      return 'Permanen'; // hanya baris lama, sebelum akses dibatasi 3 bulan
    },
    align: 'center'
  },
  {
    header: 'Status',
    width: 22,
    nilai: (r: R) => (LABEL_STATUS[r.status] ?? r.status) + (r.kedaluwarsa ? ' (Kedaluwarsa)' : ''),
    align: 'center'
  },
  // Jejak keputusan -- kolom yang tidak muat di tabel layar, tapi justru yang dicari
  // saat berkas ini dipakai sebagai arsip atau bahan audit.
  { header: 'Tahap 1 Oleh', width: 24, nilai: (r: R) => oleh(r.appr1_by_name, r.appr1_by) },
  { header: 'Tahap 1 Waktu', width: 17, nilai: (r: R) => tanggalJam(r.appr1_at), align: 'center' },
  { header: 'Tahap 2 Oleh', width: 24, nilai: (r: R) => oleh(r.appr2_by_name, r.appr2_by) },
  { header: 'Tahap 2 Waktu', width: 17, nilai: (r: R) => tanggalJam(r.appr2_at), align: 'center' },
  { header: 'Ditolak / Dibatalkan Oleh', width: 24, nilai: (r: R) => oleh(r.processed_by_name, r.processed_by) },
  { header: 'Catatan Penolakan / Pembatalan', width: 32, nilai: (r: R) => teks(r.catatan) || '-' },
  { header: 'Akses IT Oleh', width: 24, nilai: (r: R) => oleh(r.akses_by_name, r.akses_by) },
  { header: 'Akses IT Waktu', width: 17, nilai: (r: R) => tanggalJam(r.akses_at), align: 'center' }
];

export const exportFolderSharingExcel = async (rows: FolderSharingRequest[], meta: { label: string; isi: string }[]): Promise<void> => {
  const wb = bukuBaru();
  const ws = wb.addWorksheet('Folder Sharing');

  susunSheet(ws, {
    judul: 'Permintaan Akses Folder',
    meta,
    kolom: KOLOM,
    data: rows
  });

  await simpan(wb, `Folder-Sharing-${capWaktu()}.xlsx`);
};
