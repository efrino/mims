/**
 * Alur status:
 *   pending        menunggu atasan departemen pemohon (> section head)
 *   pending_tujuan menunggu atasan departemen yang dituju
 *   approved       kedua lapis lolos, menunggu tim IT
 *   granted/revoked pelaksanaan tim IT (administrator saja)
 *   rejected/canceled alur berhenti
 */
export type FolderSharingStatus =
  | 'pending'
  | 'pending_tujuan'
  | 'approved'
  | 'rejected'
  | 'canceled'
  | 'granted'
  | 'revoked';

/**
 * '3bulan' dan 'sampai' untuk permintaan baru (maks 3 bulan dari hari pengajuan).
 * 'permanen' hanya ada pada baris lama sebelum aturan 3 bulan berlaku.
 */
export type FolderSharingJenisAkses = 'permanen' | '3bulan' | 'sampai';

/** Satu aksi pada riwayat permintaan (majsf_approval.folder_sharing_log). */
export interface FolderSharingLog {
  id: number;
  /** ajukan | setujui_1 | setujui_2 | tolak | batal | beri_akses | tarik_akses */
  aksi: string;
  /** null = tidak diketahui (baris hasil migrasi yang jejak aslinya tertimpa). */
  status_dari: FolderSharingStatus | null;
  status_ke: FolderSharingStatus;
  oleh: string;
  oleh_nama: string | null;
  /** "Pemohon", "Atasan PCD", "Administrator". */
  peran: string | null;
  catatan: string | null;
  created_at: string;
  /** Diisi balik oleh migrasi dari kolom jejak lama, bukan dicatat saat kejadian. */
  dari_migrasi: boolean;
}
/**
 * Cakupan data menurut backend:
 *   all  -- administrator, seluruh permintaan
 *   dept -- atasan, permintaan dari/ke departemennya + miliknya sendiri
 *   mine -- hanya milik akun sendiri
 */
export type FolderSharingScope = 'mine' | 'dept' | 'all';

export interface FolderSharingRequest {
  id: number;
  no_request: string;
  nama: string;
  nik: string;
  departemen: string;
  departemen_tujuan: string;
  folder_path: string;
  alasan: string;
  jenis_akses: FolderSharingJenisAkses;
  akses_sampai: string | null;
  status: FolderSharingStatus;
  created_by: string;
  created_by_name: string | null;
  created_at: string;
  /** Persetujuan lapis 1 (atasan departemen pemohon). */
  appr1_by: string | null;
  appr1_by_name: string | null;
  appr1_at: string | null;
  appr1_catatan: string | null;
  /** Persetujuan lapis 2 (atasan departemen tujuan). */
  appr2_by: string | null;
  appr2_by_name: string | null;
  appr2_at: string | null;
  appr2_catatan: string | null;
  /** Keputusan yang menghentikan alur: tolak / batal. */
  processed_by: string | null;
  processed_by_name: string | null;
  processed_at: string | null;
  catatan: string | null;
  /** Jejak tim IT, terpisah dari keputusan approver. */
  akses_by: string | null;
  akses_by_name: string | null;
  akses_at: string | null;
  akses_catatan: string | null;
  /** Akses "sampai" yang tanggalnya sudah lewat; dihitung backend saat dibaca. */
  kedaluwarsa: boolean;
  /** Lapis persetujuan yang sedang berjalan: 1, 2, atau 0 kalau sudah lewat. */
  tahap: number;
  /** Departemen yang atasannya sedang ditunggu. */
  menunggu_departemen: string;
  /** Pemakai ini boleh menyetujui lapis yang sedang berjalan -- dihitung backend. */
  bisa_setujui: boolean;
  /**
   * Pemakai ini boleh menolak -- dihitung backend. Tetap true SESUDAH ia menyetujui,
   * selama akses belum diberikan.
   */
  bisa_tolak: boolean;
  /** Hanya ada pada balasan request-detail. */
  riwayat?: FolderSharingLog[];
}

export interface FolderSharingFormData {
  nama: string;
  nik: string;
  departemen: string;
  departemen_tujuan: string;
  folder_path: string;
  alasan: string;
  jenis_akses: Exclude<FolderSharingJenisAkses, 'permanen'> | '';
  akses_sampai: string;
}

export interface FolderSharingFilter {
  status: FolderSharingStatus | '';
  start_date: string;
  end_date: string;
}

export type FolderSharingAksi = 'approve' | 'reject' | 'cancel' | 'grant' | 'revoke';

/** GET me -- identitas pemakai + haknya di halaman ini, menurut backend. */
export interface FolderSharingMe {
  nik: string;
  nama: string;
  /** Departemen pegawai, sudah dicocokkan ke daftar pilihan form. */
  departemen: string;
  jabatan: string;
  /** Jabatannya di atas section head. */
  atasan: boolean;
  /**
   * Departemen yang keputusannya dipegang pemakai ini: departemennya sendiri (kalau
   * atasan) dan/atau departemen yang ia pegang sebagai penanggung jawab khusus.
   */
  departemen_dikelola: string[];
  /** Hanya administrator. */
  lihat_semua: boolean;
  cakupan: FolderSharingScope;
  /** Nama, NIK, dan departemen pemohon dikunci ke data akun (selain administrator). */
  identitas_terkunci: boolean;
  /** Tanggal server (Y-m-d) -- batas bawah datepicker akses. */
  hari_ini: string;
  /** Hari ini + 3 bulan menurut server -- batas atas akses, juga isi opsi '3bulan'. */
  batas_akses: string;
  izin: {
    create: boolean;
    /** Menandai akses diberikan/ditarik -- administrator saja. */
    akses: boolean;
  };
}

export interface FolderSharingListResponse {
  status: string;
  scope: FolderSharingScope;
  data: FolderSharingRequest[];
}

export interface FolderSharingSaveResponse {
  status: string;
  message: string;
  data: FolderSharingRequest;
}

export interface FolderSharingState {
  dataTable: FolderSharingRequest[];
  departemenList: string[];
  /** Pilihan departemen yang dituju -- tanpa FINANCE / ACCOUNTING. */
  departemenTujuanList: string[];
  me: FolderSharingMe | null;
  /** Diisi dari balasan server, bukan dipilih pemakai. */
  scope: FolderSharingScope;
  filter: FolderSharingFilter;
  formData: FolderSharingFormData;
  dialog: {
    form: boolean;
    detail: boolean;
    aksi: boolean;
  };
  selected: FolderSharingRequest | null;
  aksi: FolderSharingAksi | null;
  catatan: string;
  isLoading: boolean;
  isSaving: boolean;
  isProcessing: boolean;
  isExporting: boolean;
  isLoadingDetail: boolean;
  lastError: string;
  permissions: {
    create: boolean;
    akses: boolean;
  };
}
