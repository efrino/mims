export interface KategoriItem {
  kode_kategori: string;
  nama_kategori: string;
  status: string;
  jumlah_barang?: string | number;
  create_date?: string;
  user_create?: string;
  update_date?: string | null;
  user_update?: string | null;
}

export interface KategoriFormData {
  // Kode sebelum diedit, dipakai backend untuk mengganti kode kategori
  kode_lama: string;
  kode_kategori: string;
  nama_kategori: string;
  status: string;
}

export interface KategoriDialog {
  form: boolean;
  delete: boolean;
}

export interface DeleteKategoriData {
  kode_kategori: string;
  nama_kategori: string;
}

export interface KategoriState {
  dataTable: KategoriItem[];
  formData: KategoriFormData;
  formError: string;
  dialog: KategoriDialog;
  action: 'Create' | 'Edit';
  deleteData: DeleteKategoriData;
  isDeleting: boolean;
}
