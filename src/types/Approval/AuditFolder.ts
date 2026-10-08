/**
 * resign / over_capacity / normal diisi administrator saat membuat data.
 * dihapus / dipindahkan / membuat_memo adalah keputusan atasan departemen; pilihannya
 * per baris datang dari backend (`pilihan_status`). Normal dengan usage 0 juga bisa
 * diputuskan tetap `normal`.
 */
export type AuditFolderStatus = 'normal' | 'resign' | 'over_capacity' | 'dihapus' | 'dipindahkan' | 'membuat_memo';

export type AuditFolderStatusKeputusan = Extract<AuditFolderStatus, 'dihapus' | 'dipindahkan' | 'membuat_memo' | 'normal'>;

/** Siapa yang memindahkan folder pada status dipindahkan. */
export type AuditFolderPindahOleh = 'sendiri' | 'it';

/**
 * all  -- administrator, seluruh departemen
 * dept -- pemegang permission, departemennya sendiri di HR (+ penanggung jawab khusus)
 * none -- NIK tidak aktif di HR / departemennya tidak dikenali
 */
export type AuditFolderScope = 'all' | 'dept' | 'none';

/** Satu baris majsf_approval.audit_folder_log. */
export interface AuditFolderLog {
  id: number;
  /** buat | ubah | ubah_status | hapus */
  aksi: string;
  status_dari: AuditFolderStatus | null;
  status_ke: AuditFolderStatus | null;
  pindah_oleh: AuditFolderPindahOleh | null;
  /** Kolom yang diubah admin, satu per baris: "Label: lama -> baru". */
  perubahan: string | null;
  oleh: string;
  oleh_nama: string | null;
  /** "Administrator", "Atasan PCD", "Penanggung Jawab ...". */
  peran: string | null;
  catatan: string | null;
  created_at: string;
}

export interface AuditFolderRow {
  id: number;
  tanggal: string;
  nik: string;
  nama: string;
  departemen: string;
  nama_folder: string;
  quota_gb: number | null;
  usage_gb: number | null;
  status: AuditFolderStatus;
  /** Catatan administrator. */
  note: string | null;
  /** Ringkasan keputusan status terakhir; urutan lengkapnya di `riwayat`. */
  status_by: string | null;
  status_by_name: string | null;
  status_at: string | null;
  status_catatan: string | null;
  pindah_oleh: AuditFolderPindahOleh | null;
  /** Terisi = sudah diputuskan; atasan tidak bisa mengubah lagi, hanya administrator. */
  diputuskan_at: string | null;
  created_by: string;
  created_by_name: string | null;
  created_at: string;
  updated_by: string | null;
  updated_by_name: string | null;
  updated_at: string | null;
  /** Pemakai ini boleh mengubah status baris ini -- dihitung backend. */
  bisa_ubah_status: boolean;
  /** Pilihan keputusan untuk pemakai ini; kosong kalau bisa_ubah_status false. */
  pilihan_status: AuditFolderStatusKeputusan[];
  /** Hanya ada pada balasan audit-detail. */
  riwayat?: AuditFolderLog[];
}

export interface AuditFolderFormData {
  id: number | null;
  tanggal: string;
  nik: string;
  nama: string;
  departemen: string;
  nama_folder: string;
  /** String supaya input kosong tetap kosong, bukan 0. */
  quota_gb: string;
  usage_gb: string;
  status: AuditFolderStatus | '';
  note: string;
}

export interface AuditFolderFilter {
  status: AuditFolderStatus | '';
  start_date: string;
  end_date: string;
}

export interface AuditFolderMe {
  nik: string;
  nama: string;
  departemen: string;
  jabatan: string;
  administrator: boolean;
  departemen_dikelola: string[];
  cakupan: AuditFolderScope;
  izin: {
    /** Tambah / ubah / hapus data -- administrator saja. */
    crud: boolean;
    /** Ubah status jadi dihapus / dipindahkan. */
    ubah_status: boolean;
  };
}

/** GET employee?nik= -- isian otomatis form admin dari portal HR. */
export interface AuditFolderEmployee {
  nik: string;
  nama: string;
  /** Sudah dicocokkan ke daftar departemen; '' kalau tidak ada padanannya. */
  departemen: string;
  departemen_hr: string;
  aktif: boolean;
}

export interface AuditFolderListResponse {
  status: string;
  scope: AuditFolderScope;
  data: AuditFolderRow[];
}

export interface AuditFolderSaveResponse {
  status: string;
  message: string;
  data?: AuditFolderRow;
}

export interface AuditFolderState {
  dataTable: AuditFolderRow[];
  departemenList: string[];
  me: AuditFolderMe | null;
  scope: AuditFolderScope;
  filter: AuditFolderFilter;
  search: string;
  formData: AuditFolderFormData;
  dialog: {
    form: boolean;
    detail: boolean;
    status: boolean;
    hapus: boolean;
  };
  selected: AuditFolderRow | null;
  statusBaru: AuditFolderStatusKeputusan | '';
  pindahOleh: AuditFolderPindahOleh | '';
  catatan: string;
  isLoading: boolean;
  isSaving: boolean;
  isProcessing: boolean;
  isLoadingDetail: boolean;
  isLookup: boolean;
  lookupInfo: string;
  lastError: string;
}
