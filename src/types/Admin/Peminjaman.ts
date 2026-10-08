import type { EmployeeOption } from '@/services/HRD/AttendanceService';
import type { RingkasanBarangItem } from './MasterBarang';

export interface PeminjamanItem {
  no_pinjam: string;
  kode_barang: string;
  nama_barang: string;
  waktu_pinjam: string;
  nik_peminjam: string;
  nama_peminjam: string;
  departemen: string | null;
  keperluan: string;
  lokasi_penggunaan: string;
  lama_pinjam: string | number;
  tgl_jatuh_tempo: string | null;
  qty_pinjam: string | number;
  qty_kembali: string | number;
  petugas_serah: string;
  waktu_kembali: string | null;
  petugas_terima: string | null;
  kondisi_kembali: string | null;
  kondisi?: string | null;
  merk?: string | null;
  status: string;
  ket: string | null;
}

// Unit barang yang siap dipinjam
export interface StokBarangItem {
  kode_barang: string;
  kode_kategori: string | null;
  nama_kategori: string | null;
  nama_barang: string;
  merk: string | null;
  kode_area: string | null;
  nama_area: string | null;
  rak: string | null;
  kondisi: string;
}

// Satu unit barang pada form peminjaman
export interface PinjamItemForm {
  kode_barang: string;
  nama_barang: string;
  merk: string;
  nama_kategori: string;
  kondisi: string;
  lokasi: string;
  lama_pinjam: string | number;
}

export interface PinjamFormData {
  nik_peminjam: string;
  nama_peminjam: string;
  departemen: string;
  keperluan: string;
  lokasi_penggunaan: string;
  petugas_serah: string;
  ket: string;
  items: PinjamItemForm[];
}

// Satu unit pada form pengembalian, dicentang jika unit dikembalikan
export interface KembaliItemForm {
  kode_barang: string;
  nama_barang: string;
  merk: string;
  dikembalikan: boolean;
  kondisi_kembali: string;
}

export interface KembaliFormData {
  no_pinjam: string;
  nama_peminjam: string;
  petugas_terima: string;
  ket: string;
  items: KembaliItemForm[];
}

export interface PeminjamanFilters {
  date_from: string;
  date_to: string;
}

export interface PeminjamanDialog {
  pinjam: boolean;
  kembali: boolean;
  detail: boolean;
}

export interface PeminjamanState {
  dataTable: PeminjamanItem[];
  employees: EmployeeOption[];
  stokBarang: StokBarangItem[];
  ketersediaan: RingkasanBarangItem[];
  detailItems: PeminjamanItem[];
  filters: PeminjamanFilters;
  pinjamForm: PinjamFormData;
  kembaliForm: KembaliFormData;
  formError: string;
  dialog: PeminjamanDialog;
}
