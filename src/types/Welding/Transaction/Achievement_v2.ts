export interface FilterParams {
  date: string;
  period: string;
  period2: string;
  clock: string;
  hour: string;
  shift: string | number;
  day: string;
  line?: string;
}

export interface ResponseData {
  attendance: Attendance[];
  detail: Detail[];
  line_id: string;     // Group key
  patan: string | null;
  shift?: string | number;

  // Added by store
  summary_data?: SummaryData;
  note?: string;
  area_code?: string | null; // area master (ms_welding_area) yg memayungi line_id; null = di luar master
}

export interface Detail {
  id: string;
  schedule_id: string;
  area: string;
  date: string;
  shift: string | number;
  part_number: string;
  patan: string | null;

  // Form Auto Schedule (Plan)
  job_number: string | null;
  job_number_delivery: string | null;
  op: string | null;
  mc_weld: string | null;   // mesin proses ini (ms_welding_route) — pengganti kolom OP
  proc_seq?: number | null;     // urutan proses (1..N)
  total_proses?: number | null; // total proses part (rute multi-mesin)
  ops?: RouteOp[];              // proses rute urut seq (saklar OP Gabung/Pisah, sama dgn LKH)
  line?: string | null;         // line (huruf depan mesin, mis. 'A')
  qty_kbn?: number | string | null; // qty per kanban (master)
  plan_process: string | null;
  plan_process_original: string | null;
  carryover: string | null;
  source_plan: string | null;
  stroke_plan: string | null;
  lotsize: string | null;       // Plan lotsize
  uph_plan: string | null;
  tpt: string | null;           // Plan tpt
  status_plan: string | null;
  patan_sch: string | null;
  urut_plan: string;

  // Actual Production
  lotsize_actual: string | null;
  stroke_act: string | null;
  uph_act: string | null;
  tpt_actual: string | null;
  finish_actual: string | null;
  idletime: string | null;

  // Quality
  repair: string | null;
  reject: string | null;

  // Downtime
  dt_machines: string | null;
  dt_jig: string | null;
  dt_other: string | null;
  dt_wip: string | null;
  dt_total: string | null;

  // Flags & Metadata
  status: string | null;
  is_running: string;
  is_next: string;
  is_open: string;
  user_open: string | null;
  additional: string | null;
  override_reason: string | null;

  // Information descriptions
  information: string | null;
  keterangan_plan: string | null;
  keterangan_actual: string | null;
  ket_repair: string | null;
  ket_reject: string | null;
  ket_dt_machines: string | null;
  ket_dt_jig: string | null;
  ket_dt_other: string | null;
  ket_dt_wip: string | null;

  // Calculated from DB
  total_lotsize: string | null;

  // Computed by Frontend Store
  total_lotsize_act?: number | null;
  total_dt?: number | null;
  uph?: number | null;
}

export interface Attendance {
  id?: string;
  date?: string;
  line_id: string;
  shift: string | number;
  id_role?: string;
  name_role: string;
  standard: string | number;
  present: string | number;
  sick: string | number;
  leave: string | number;
}

export interface DataGroup {
  prefix_area: string;
  total_area: number;
  detail: ResponseData[];
}

export interface SummaryData {
  qty_total: number;
  qty_persen: number;
  repair_total: number;
  repair_persen: number;
  reject_total: number;
  reject_persen: number;
  total_stroke_actual: number;
  avg_uph: number;
  tpt_total: number;
  part_count?: number;
  ach_avg?: number;     // rata-rata akurasi per part (actual/plan %)
  updated?: string;
}

export interface PartItem {
  id: string;
  job_number: string;
  line: string;
  model: string;
  part_number: string;
  created_at: string | null;
  updated_at: string | null;
  user_created: string | null;
  user_updated: string | null;
}

export interface FormEdit {
  detail: Detail[];
  attendance: Attendance[];
}

export type LockSlot = 'plan' | 'actual';
/** Lock per area: 2 slot departemen — plan (PCD) & actual (Welding). */
export type AreaLocks = Record<LockSlot, LockInfo | null>;

export interface LockInfo {
  slot?: LockSlot;
  user: string;
  fullname: string | null;
  opened_at: string;
  heartbeat_at: string;
  is_admin: boolean;
  dept?: string | null;
}

/** 1 proses rute part (ms_welding_route). */
export interface RouteOp {
  op: string;       // OP10, OP20, ...
  machine: string;
  ct: number;       // detik/pcs
  stroke: number;
}

/** Pembuka modal View (boleh banyak orang per area). */
export interface ViewerInfo {
  user: string;
  fullname: string | null;
  is_admin: boolean;
  dept: string | null;
  since: string;
}

export interface UserCheck {
  status: boolean;
  user: string | null;
  messages: string | null;
  lock?: LockInfo | null;
  locks?: AreaLocks | null;
  my_slots?: LockSlot[];
  is_me?: boolean;
  taken_from?: string | null;
}

export interface KetActual_Plan {
  id: string;
  information: string | null;
  created_at: string | null;
  updated_at: string | null;
  user_created: string | null;
  user_updated: string | null;
}
// Kandidat part dari mutasi_weld/mutasi_wip (modal Tambah Planning Manual).
export interface PartCandidate {
  part_number: string;
  job_number: string;
  status_plan: 'FP' | 'WIP';
  car_name: string;
  model: string;
  qty_kbn: number;
  stock_before: number;     // stok sebelum shift ini
  plan_shift: number;       // plan mutasi shift ini
  plan_day_total: number;   // plan mutasi day+night tanggal ini
  dn_shift: number;
  dn_month: number;
  mdfo_month: number;
  actual_mtd: number;       // aktual s.d. shift sebelumnya
  balance_shift: number;
  strength_shift: number;   // jam
  pcs_per_day: number;
  part_name: string;
  machine: string;
  uph: number;
  stroke: number;
  op: string;
  customers: string[];
  plan_lkh: number;
  already_planned: boolean;
  area?: string;            // zone asal (area master gabungan → kandidat tiap zone)
}
