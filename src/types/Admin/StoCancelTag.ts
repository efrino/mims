import type { StoTagOkRow } from '@/types/Admin/StoTagList';

// Bentuk satu baris sto_data, mengikuti BaseSto::formatTag() pada modul STO.
// Dipakai cancel-requests dan tag-detail.
export interface StoTag {
  id: number;
  id_tag: string;
  id_event: number | null;
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
  nik_a: string;
  qty_a: number;
  updated_a: string;
  nik_b: string;
  qty_b: number;
  updated_b: string;
  // 0 = normal, 1 = dibatalkan, 2 = pengajuan menunggu keputusan admin
  is_canceled: number;
  cancel_reason: string;
  cancel_requested_by: number | null;
  cancel_requested_by_nik: string;
  cancel_requested_at: string;
  cancel_approved_by: number | null;
  cancel_approved_by_nik: string;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface StoTagRow extends StoTag {
  [key: string]: unknown;
}

export interface StoCancelRequestListResponse {
  status: string;
  message: string;
  limit_terpakai: number;
  total_row: number;
  data: StoTag[];
}

export interface StoTagDetailResponse {
  status: string;
  message: string;
  data: StoTag;
}

export interface StoCancelDecisionResponse {
  status: string;
  message: string;
  data: StoTag;
}

export type StoDecisionType = 'approve' | 'reject';

/**
 * Hasil satu putaran keputusan. cancel-approve / cancel-reject hanya menerima
 * satu id_tag per request, jadi keputusan massal dikirim satu per satu dan
 * hasilnya dikumpulkan di sini -- satu tag yang gagal tidak menjatuhkan sisanya.
 */
export interface StoDecisionResult {
  type: StoDecisionType;
  berhasil: string[];
  gagal: Array<{ id_tag: string; message: string }>;
}

export interface StoCancelTagDialog {
  decision: boolean;
  detail: boolean;
  result: boolean;
  /** Konfirmasi pembatalan massal per area (tab 2). */
  areaConfirm: boolean;
  /** Ringkasan hasil setelah pembatalan massal selesai. */
  areaResult: boolean;
}

export type StoCancelTab = 'requests' | 'area' | 'requestsOk' | 'areaOk';

export interface StoCancelTagState {
  adminNik: string;
  /** Tombol Logout pada "Diakses sebagai" sedang memproses. */
  isLoggingOut: boolean;
  tab: StoCancelTab;

  requests: StoTagRow[];
  requestArea: string;
  /** Event yang sedang ditangani; bawaannya event yang berjalan. */
  requestEvent: number | null;
  requestLimit: number;
  isLoadingRequests: boolean;

  // Sisi tag OK -- bentuknya sengaja sejajar dengan tag STO di atas supaya
  // kedua tab bisa dibaca dengan pola yang sama.
  requestsOk: StoTagOkRow[];
  requestAreaOk: string;
  requestEventOk: number | null;
  isLoadingRequestsOk: boolean;
  selectedOk: string[];

  // Centang baris -- boleh acc / tolak lebih dari satu sekaligus.
  selected: string[];

  decisionType: StoDecisionType | null;
  // Satu id untuk aksi per baris, banyak id untuk aksi massal.
  decisionIds: string[];
  decisionTarget: StoTagRow | null;
  /** Sisi mana yang sedang diputuskan -- tag STO atau tag OK. */
  decisionScope: 'sto' | 'ok';
  isDeciding: boolean;
  decisionProgress: number;
  decisionResult: StoDecisionResult | null;

  detail: StoTag | null;
  isLoadingDetail: boolean;

  // Tab 2 -- pembatalan massal per area.
  areaCancel: StoCancelAreaState;
  /** Tab 4 -- pembatalan massal tag OK per area. */
  areaCancelOk: StoCancelAreaState;
  areaOptions: string[];
  eventOptions: StoCancelEventOption[];

  dialog: StoCancelTagDialog;
  lastError: string;
  permissions: {
    approve: boolean;
  };
}

// ---------------------------------------------------------------------------
// Tab 2 -- pembatalan massal seluruh tag yang belum discan di satu area.
// ---------------------------------------------------------------------------

/**
 * Rincian isi satu area sebelum pembatalan dijalankan.
 *
 * `akan_dibatalkan` adalah satu-satunya angka yang benar-benar akan berubah:
 * belum discan DAN belum berstatus batal. Backend menghitungnya dengan
 * kriteria yang sama persis dengan yang dipakai saat mengubah.
 */
export interface StoCancelAreaRingkasan {
  total_tag: number;
  total_belum_scan: number;
  total_sudah_scan: number;
  total_dibatalkan: number;
  akan_dibatalkan: number;
}

/** Contoh tag yang akan ikut dibatalkan -- supaya bukan cuma angka. */
export interface StoCancelAreaContoh {
  id_tag: string;
  area: string;
  part_number: string;
  job_number: string;
  material_description: string;
  created_at: string;
}

export interface StoCancelAreaPreviewResponse {
  status: string;
  message: string;
  area: string;
  id_event: number | null;
  contoh: StoCancelAreaContoh[];
  data: StoCancelAreaRingkasan;
}

export interface StoCancelAreaResponse {
  status: string;
  message: string;
  area: string;
  id_event: number | null;
  total_canceled: number;
  sebelum: StoCancelAreaRingkasan;
  sesudah: StoCancelAreaRingkasan | null;
}

/** Pilihan dropdown event pada tab pembatalan massal. */
export interface StoCancelEventOption {
  id_event: number;
  event_name: string;
  status: 0 | 1;
}

export interface StoCancelAreaState {
  area: string;
  /** null = seluruh event. Sengaja default ke event yang sedang berjalan. */
  idEvent: number | null;
  ringkasan: StoCancelAreaRingkasan | null;
  contoh: StoCancelAreaContoh[];
  /** Ketikan konfirmasi; harus sama dengan nama area sebelum tombol aktif. */
  konfirmasi: string;
  isLoadingPreview: boolean;
  isCanceling: boolean;
  hasil: StoCancelAreaResponse | null;
}
