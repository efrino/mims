import type { KategoriItem } from './MasterKategori';

// 1 baris = 1 unit fisik barang
export interface BarangItem {
  kode_barang: string;
  kode_kategori: string | null;
  nama_kategori?: string | null;
  nama_barang: string;
  merk: string | null;
  kode_area: string | null;
  nama_area?: string | null;
  rak: string | null;
  kondisi: string;
  status: string;
  status_pinjam?: string;
  keterangan: string | null;
  create_date?: string;
  user_create?: string;
  update_date?: string | null;
  user_update?: string | null;
}

// Ringkasan unit & persentase kondisi per nama barang dalam satu kategori
export interface RingkasanBarangItem {
  kode_kategori: string | null;
  nama_kategori: string | null;
  nama_barang: string;
  merk: string | null;
  qty_total: string | number;
  qty_baik: string | number;
  qty_sedang: string | number;
  qty_rusak: string | number;
  qty_dipinjam: string | number;
  qty_tersedia: string | number;
  persen_baik: string | number;
  persen_sedang: string | number;
  persen_rusak: string | number;
}

// Mode template & upload excel: kode barang diisi manual atau digenerate sistem
export type ModeKodeExcel = 'manual' | 'otomatis';

export interface AreaItem {
  kode_area: string;
  nama_area: string;
}

export interface RakItem {
  id_rak: string | number;
  kode_area: string;
  nama_area: string;
  nama_rak: string;
}

export interface BarangFormData {
  kode_barang: string;
  kode_kategori: string;
  nama_barang: string;
  merk: string;
  kode_area: string;
  rak: string;
  kondisi: string;
  status: string;
  keterangan: string;
}

export interface BarangDialog {
  form: boolean;
  delete: boolean;
  tambahKategori: boolean;
}

export interface DeleteBarangData {
  kode_barang: string;
  nama_barang: string;
}

export interface BarangState {
  dataTable: BarangItem[];
  ringkasan: RingkasanBarangItem[];
  kategoriOptions: KategoriItem[];
  areaOptions: AreaItem[];
  rakOptions: RakItem[];
  formData: BarangFormData;
  kodeManual: boolean;
  previewKode: string;
  formError: string;
  dialog: BarangDialog;
  action: 'Create' | 'Edit';
  editKode: string | null;
  deleteData: DeleteBarangData;
  isDeleting: boolean;
  uploading: boolean;
  uploadError: string;
}
