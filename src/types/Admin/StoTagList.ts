// Satu baris tag STO dari GET /api/sto/tag-list.
//
// Bentuknya = format_tag() milik backend, ditambah empat field khusus daftar
// (created_by_nik, event_name, print_status, printed_at) yang ikut dalam satu
// query supaya tidak perlu lookup per baris.
export interface StoTagListItem {
  id: number;
  id_tag: string;
  id_event: number | null;
  event_name: string;
  id_item: number;
  area: string;
  job_number: string;
  part_number: string;
  material_description: string;
  type: string;
  status_part: string;
  customer: string;
  plant: string;
  sloc: string;
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
  cancel_requested_by_nik: string;
  cancel_requested_at: string;
  cancel_approved_by_nik: string;
  created_by_nik: string;
  print_status: string;
  printed_at: string;
  created_at: string;
  updated_at: string;
}

export interface StoTagListRow extends StoTagListItem {
  [key: string]: unknown;
}

export interface StoTagListResponse {
  status: string;
  message: string;
  limit_terpakai: number;
  offset: number;
  total_row: number;
  /** Jumlah baris yang cocok dengan filter TANPA limit. */
  total_semua: number;
  /** Area yang benar-benar dipakai di sto_data -- isi dropdown filter. */
  area_list: string[];
  data: StoTagListItem[];
}

export type StoTagBatalFilter = '' | '0' | '1' | '2';
export type StoTagScanFilter = '' | 'sudah' | 'belum';

export interface StoTagListFilter {
  q: string;
  area: string;
  id_event: number | null;
  batal: StoTagBatalFilter;
  scan: StoTagScanFilter;
  limit: number;
  offset: number;
}

/** Pilihan dropdown event pada filter. */
export interface StoTagEventOption {
  id_event: number;
  event_name: string;
  status: 0 | 1;
  /** Dipakai Report STO -- endpoint rekapnya menyaring per tanggal, bukan per event. */
  start_date: string;
  end_date: string | null;
}

export interface StoTagListState {
  nik: string;
  /** Tab aktif -- 'sto' membaca tag-list, 'ok' membaca tag-ok-list. */
  tab: StoTagListTab;
  tagOk: StoTagOkState;
  /** Export mana yang sedang berjalan; null berarti tidak ada. */
  sedangExport: 'sto' | 'ok' | 'report' | null;
  dataTable: StoTagListRow[];
  totalSemua: number;
  filter: StoTagListFilter;
  areaOptions: string[];
  /** Tombol Logout pada "Diakses sebagai" sedang memproses. */
  isLoggingOut: boolean;
  eventOptions: StoTagEventOption[];
  isLoading: boolean;
  lastError: string;
  detail: StoTagListItem | null;
  dialog: {
    detail: boolean;
    ajukanCancel: boolean;
  };
  /** Pengajuan pembatalan dari kolom aksi; dipakai kedua tab. */
  ajukan: {
    sisi: 'sto' | 'ok';
    id: string;
    keterangan: string;
    alasan: string;
    isSubmitting: boolean;
  };
}

// ── Tag OK ────────────────────────────────────────────────────────
//
// Satu baris dari GET /tag-ok-list. Tag OK adalah tag hasil produksi yang
// disiapkan lalu dihitung -- terpisah dari tag STO, jadi bentuk barisnya juga
// berbeda: kuncinya `id_tag_ok`, dan tidak ada pasangan tim A / tim B.
export interface StoTagOkItem {
  id_tag_ok: string;
  area: string;
  part_number: string;
  job_number: string;
  process: string;
  line: string;
  shift: number;
  customer: string;
  project: string;
  status: string;
  qty_kbn: string;
  id_event: number | null;
  /** 1 = masih terbuka (belum dihitung), 0 = sudah tertutup. */
  scan_open: number;
  scan_at: string;
  scan_by: string;
  opened_by: string;
  opened_at: string;
  qty_scan: number;
  scanned_by: string;
  scanned_at: string;
  is_canceled: number;
  cancel_reason: string;
  canceled_by: string;
  canceled_at: string;
}

export interface StoTagOkRow extends StoTagOkItem {
  [key: string]: unknown;
}

export interface StoTagOkSummary {
  terbuka: number;
  tertutup: number;
  batal: number;
  pengajuan: number;
  total_qty: number;
}

export interface StoTagOkResponse {
  status: string;
  message: string;
  total_row: number;
  summary: StoTagOkSummary;
  data: StoTagOkItem[];
}

export type StoTagOkOpenFilter = '' | '0' | '1';

/**
 * tag-ok-list tidak punya `offset`, jadi tidak ada paginasi sisi server --
 * yang bisa diatur hanya `limit` (maks 500).
 */
export interface StoTagOkFilter {
  q: string;
  area: string;
  open: StoTagOkOpenFilter;
  batal: StoTagBatalFilter;
  id_event: number | null;
  limit: number;
}

export interface StoTagOkState {
  dataTable: StoTagOkRow[];
  summary: StoTagOkSummary | null;
  filter: StoTagOkFilter;
  /** Diturunkan dari baris yang terbaca; tag-ok-list tidak mengirim area_list. */
  areaOptions: string[];
  isLoading: boolean;
  lastError: string;
  detail: StoTagOkItem | null;
  sudahDimuat: boolean;
}

export type StoTagListTab = 'sto' | 'ok';
