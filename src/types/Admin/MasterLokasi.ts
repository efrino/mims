export interface AreaKelolaItem {
  kode_area: string;
  nama_area: string;
  status: string;
  jumlah_rak: string | number;
  jumlah_barang: string | number;
}

export interface RakKelolaItem {
  id_rak: string | number;
  kode_area: string;
  nama_area: string | null;
  nama_rak: string;
  status: string;
  jumlah_barang: string | number;
}

export interface AreaFormData {
  // Kode sebelum diedit, dipakai backend untuk mengganti kode area
  kode_lama: string;
  kode_area: string;
  nama_area: string;
  status: string;
}

export interface RakFormData {
  id_rak: string | number | null;
  kode_area: string;
  nama_rak: string;
  status: string;
}
