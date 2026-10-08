export type ReportCategory = 'repair-rate' | 'reject-rate' | 'tpm-akurasi';

export type DateMode = 'harian' | 'mingguan' | 'akumulasi';

export interface WeekRange {
  id: string;
  label: string;
  start: number;
  end: number;
}

export interface ParamsFilter {
  mode: DateMode;
  date: string; 
  year: number;
  month: number;
  week: number;
  start: string;
  end: string;
}

export interface ResolvedFilter {
  mode: DateMode;
  date?: string;
  year?: number;
  month?: number;
  week?: number;
  start?: string;
  end?: string;
  sel_roc?: string;
  dept?: string;
  chart_limit?: number | 'all';
  sel_defect?: string;
  sel_part?: string;
  layer?: string;
}

export interface ChartConfig {
  key: string;
  title: string;
}

export interface CategoryConfig {
  key: ReportCategory;
  title: string;
  charts: ChartConfig[];
}

export interface ParetoRaw {
  category: string;
  qty: number;
}

export interface ParetoClean extends ParetoRaw {
  pct: string;
  cumm_qty: number;
  cumm_pct: string;
}

// TAMBAHAN — bentuk ringkas rincian lintas-domain (dipakai saat kolom Repair/Reject/Akurasi
// di tabel domain LAIN diklik, mis. kolom Akurasi di tabel Reject Rate). Native detail domain
// sendiri (mis. kolom Repair di tabel Repair Rate) tetap pakai PartListItem/RejectListDetail/
// AkurasiListItem apa adanya, bukan tipe ini.
export interface RepairDetailRow {
  job_number: string | null;
  date: string;
  shift: number;
  qty_ok: number | null;
  qty_ng: number | null;
  problem: string;
}

export interface AkurasiDetailRow {
  part_no: string;
  date: string;
  type: string | null;
  accuracy_pct: number | null;
}

export interface RejectDetailRow {
  doc_number: string;
  doc_item: string;
  reject_date: string;
  posting_date: string;
  category: string;
  roc: string;
  line: string;
  shift: string;
  qty: number;
}

export interface PartListItem {
  achievement_id: number;
  part_number: string;
  part_name: string | null;
  job_number: string;
  date: string;
  shift: number;
  qty_ok: number | null;
  qty_ng: number | null;
  problem: string;
  // Layer part+job dari master (STAMPING/WELDING/FP/...), bisa lebih dari satu - achievement_metal_finish
  // belum punya kolom layer, lihat M_report_pareto_stamping::layer_map().
  layers: string[];
  reject: number | null;
  problem_reject: string | null;
  accuracy: number | null;
  // Ditambahkan di M_report_pareto_stamping (get_list) - dipakai modal detail Reject/Akurasi
  // saat diklik dari tabel Repair Rate (part yg sama, semua kejadian, bukan cuma tanggal ini).
  reject_details: RejectDetailRow[];
  akurasi_details: AkurasiDetailRow[];
}
export interface AkurasiListItem {
  id: number;
  type: string | null;
  part_no: string;
  part_name: string | null;
  job_number: string | null;
  date: string;
  accuracy_pct: number | null;
  pcs_qty_repair: number | null;
  problem_repair: string | null;
  pcs_qty_reject: number | null;
  problem_reject: string | null;
  // Ditambahkan di M_report_pareto_stamping (get_list_akurasi) - dipakai modal detail Repair/
  // Reject saat diklik dari tabel TPM Akurasi.
  repair_details: RepairDetailRow[];
  reject_details: RejectDetailRow[];
}
export interface RejectListDetail {
  doc_number: string;
  doc_item: string;
  dept: string;
  job_number: string | null;
  reject_date: string;
  posting_date: string;
  part_number: string;
  part_name: string | null;
  defect_code: string;
  category: string;
  roc: string;
  line: string;
  shift: string;
  qty: number;
  uom: string;
}

export interface RejectListItem {
  part_number: string;
  // Ditambahkan di M_report_pareto (part_detail_list) - part number baku ms_part_sap,
  // ini yg DITAMPILKAN di tabel. `part_number` mentah tetap dipakai sbg kunci baris & modal.
  part_number_sap: string | null;
  part_name: string | null;
  job_number: string | null;
  dept: string;
  qty: number;
  doc_count: number;
  defects: string[];
  lines: string[];
  first_date: string;
  last_date: string;
  details: RejectListDetail[];
  // Ditambahkan di M_report_pareto (part_detail_list) - JOIN ke Repair/Akurasi, Reject
  // tetap jadi acuan (part & urutan baris masih dari reject, ini cuma kolom pelengkap).
  pcs_qty_repair: number | null;
  problem_repair: string | null;
  accuracy: number | null;
  // Dipakai modal detail Repair/Akurasi saat diklik dari tabel Reject Rate.
  repair_details: RepairDetailRow[];
  akurasi_details: AkurasiDetailRow[];
}
export interface LastSyncInfo {
  date_low?: string;
  date_high?: string;
  rows_sap?: string | number;
  rows_upsert?: string | number;
  elapsed_ms?: string | number;
  finished_at: string;
}

export interface ResponseMeta {
  drill?: { roc?: string | null; defect?: string | null; part?: string | null };
  start?: string | null;
  end?: string | null;
  chart_limit?: number;
  layer?: string | null;
  layer_options?: string[];
  dept?: string | null;
  last_sync?: LastSyncInfo | null;
  note?: string | null;
}

export interface DataAPI {
  charts: Record<string, ParetoRaw[]>;
  list: PartListItem[] | AkurasiListItem[] | RejectListItem[];
  meta?: ResponseMeta;
}

export interface CleanData {
  charts: Record<string, ParetoClean[]>;
  list: PartListItem[] | AkurasiListItem[] | RejectListItem[];
  layer_options?: string[];
  selected_problem?: string | null;
  selected_defect?: string | null;
  selected_part?: string | null;
  last_sync?: LastSyncInfo | null;
  note?: string | null;
  start?: string | null;
  end?: string | null;
}
