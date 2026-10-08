// Satu baris master_data dari modul STO.
//
// `total_tag` = jumlah tag sto_data yang memakai baris ini. FK-nya RESTRICT,
// jadi selama angkanya > 0 barisnya tidak bisa dihapus sama sekali -- bukan
// sekadar butuh konfirmasi.
export interface StoMasterItem {
  id_item: number;
  area: string;
  job_number: string;
  part_number: string;
  material_description: string;
  type: string;
  status_part: string;
  customer: string;
  plant: string;
  process: string;
  category: string;
  model: string;
  total_tag: number;
  created_at: string;
  updated_at: string;
}

export interface StoMasterRow extends StoMasterItem {
  [key: string]: unknown;
}

export interface StoMasterListResponse {
  status: string;
  message: string;
  limit_terpakai: number;
  offset: number;
  total_row: number;
  /** Jumlah baris yang cocok dengan filter TANPA limit. */
  total_semua: number;
  /** Area yang benar-benar dipakai di master_data -- isi dropdown filter. */
  area_list: string[];
  data: StoMasterItem[];
}

export interface StoMasterDetailResponse {
  status: string;
  message: string;
  data: StoMasterItem;
}

export interface StoMasterSaveResponse {
  status: string;
  message: string;
  data: StoMasterItem | null;
  warnings?: string[];
}

/** Kolom yang boleh ditulis. Sengaja tanpa id_item, total_tag, dan tanggal. */
export interface StoMasterFormData {
  area: string;
  job_number: string;
  part_number: string;
  material_description: string;
  type: string;
  status_part: string;
  customer: string;
  plant: string;
  process: string;
  category: string;
  model: string;
}

export interface StoMasterFilter {
  q: string;
  area: string;
  limit: number;
  offset: number;
}

export interface StoMasterState {
  nik: string;
  dataTable: StoMasterRow[];
  totalSemua: number;
  filter: StoMasterFilter;
  areaOptions: string[];
  /** Tombol Logout pada "Diakses sebagai" sedang memproses. */
  isLoggingOut: boolean;
  formData: StoMasterFormData;
  /** 'Create' = baris kosong, 'Duplicate' = salinan baris lain, 'Edit' = ubah. */
  action: 'Create' | 'Duplicate' | 'Edit';
  editId: number | null;
  /** Baris sumber saat menggandakan -- dipakai judul & catatan di form. */
  duplicateFrom: StoMasterItem | null;
  deleteTarget: StoMasterItem | null;
  detail: StoMasterItem | null;
  isLoading: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  lastError: string;
  dialog: {
    form: boolean;
    delete: boolean;
    detail: boolean;
  };
  permissions: {
    create: boolean;
    update: boolean;
    delete: boolean;
  };
}
