export interface AchievementLineResponse {
  status: boolean;
  data: AchievementLine[];
}

export interface AchievementLineDetail {
  id: string;
  time_shift: string;
  original_line: string;
  urut: string;
  urut_plan: string;
  patan: string;

  additional: string;
  job_number: string | null;
  part_number: string | null;
  part_rh: string;
  part_lh: string;

  combination: string;
  value_combination: string;

  plan_process: string;
  act_process: string;
  total_process: string;

  tpt: string;
  tpt_actual: string;

  lotsize: string | null;
  lot_rh: number[];
  lot_lh: number[];

  kbn_rh: string;
  kbn_lh: string;

  status_plan: string;
  status: string;

  stroke_plan: string;
  stroke_act: string;

  dandori_plan: string;
  dandori: string;

  gsph_plan: string;

  qty_actual: string | null;
  act_rh: string;
  act_lh: string;

  sap_rh: string;
  sap_lh: string;

  repair: string | null;
  repair_rh: string;
  repair_lh: string;

  reject: string | null;
  reject_rh: string;
  reject_lh: string;

  dt_machines: string;
  dt_dies: string;
  dt_other: string;
  dt_material: string;
  dt_total: string;
  cm_dt_machines: string,
  cm_dt_dies: string,
  cm_dt_other: string,
  cm_dt_material: string,
  status_dt_machines: string,
  status_dt_dies: string,
  status_dt_other: string,
  status_dt_material: string,

  downtime: string | null;
  idletime: string;

  finish_actual: string;
  finish_machine?: string;
  finish_plan?: string;

  machine: string;
  process: string;

  is_tandem: string;
  is_trial: string;

  is_active: string;
  is_done: string;
  is_open: string;
  is_running: string;
  is_next: string;

  update_date: string;

  stroke_actual?: number;
  total_gsph?: number;
}

export interface AchievementLine {
  connection: boolean;
  patan: string;
  line_id: string;
  shift: number;
  jumlah_mesin: string | number;

  detail: AchievementLineDetail[];

  gsph_actual?: number;
  cycle_time_actual?: number;

  downtime_actual?: number;
  idletime_actual?: number;

  total_part_plan?: number;
  total_part_actual?: number;

  repair_actual?: number;
  reject_actual?: number;
  good_actual?: number;

  total_stroke?: number;
  total_lot_rh?: number;
  total_lot_lh?: number;
  tpt_total?: number;

  total_stroke_actual?: number;
  total_act_rh?: number;
  total_act_lh?: number;

  total_dandori?: number;
  total_dt_machines?: number;
  total_dt_dies?: number;
  total_dt_other?: number;
  total_dt_material?: number;

  total_tpt_actual?: number;
  total_gsph?: number;

  total_lkh?: number;
  total_sap?: number;

  reject?: number;
  repair?: number;
  qty_ok?: number;

  expand?: boolean;
}

export interface PartItem {
  id: string;
  job_number: string;
  part_number: string;
  part_name: string;
  status: string;

  pallet: string;
  qty_pallet: string;

  total_dies: string | null;
  limit_stroke: string | null;

  is_active: string;

  create_date: string;
  user_create: string;

  user_update: string;
  update_date: string;

  mat_group: string;
}

export interface FormAttendance {
  standard: number[];
  present: number[];
  leave: number[];
  exchange_day: number[];
  permit: number[];
  sick: number[];
  absent: number[];
}

export interface FormDetail {
  // --- Basic Info ---
  hadir: any;
  izin: any;
  sakit: any;
  ganti_hari: any;
  jumlah_mesin: string;

  // --- Kanban & Flags ---
  e_kanban: any[];
  is_tandem: number[];
  is_trial: boolean[];
  is_terusan: boolean;
  is_running: string;
  is_next: string; // Hanya ada di interface A
  is_start: string;

  // --- Job & Part Info ---
  job_number: string | null;
  job: any;
  job_rh: string | null;
  job_lh: string | null;
  plan: any;
  part_number_fix: any;
  qty_kbn: any;
  urut: any;
  urut_new: any;
  urut_plan: any;
  additional: any;
  patan: string[];
  original_line: string;
  part_rh: string[];
  part_lh: string[];

  // --- Plan & Status ---
  status_plan: string;
  combination: string;
  value_combination: number[];
  total_process: string;
  plan_process: number[];
  act_process: number[];
  stroke_plan: string;

  // --- Lot & KBN Info ---
  lot_rh: number[];
  lot_lh: number[];
  kbn_rh: number[];
  kbn_lh: number[];
  sap_rh: number[];
  sap_lh: number[];
  total_lotsize_rh: number[];
  total_lotsize_lh: number[];
  lotsize: number[];

  // --- Pembagi (Different names in sources) ---
  pembagi_repair?: any; // Dari interface A
  pembagi_reject?: any; // Dari interface A
  total_pembagi_repair?: any; // Dari interface B
  total_pembagi_reject?: any; // Dari interface B

  // --- TPT & Progress ---
  tpt: number[];
  finish_plan: string;
  finish_plan_current: string;
  finish_actual_current: string;
  actual_progress_now: any;

  // --- Keterangan (Notes) ---
  keterangan: string;
  keterangan_all: string[]; // Dari interface A
  keterangan_sum?: string; // Dari interface B
  keterangan_sap: string[][];
  information: string;

  // --- Actual Production ---
  stroke_act: number[];
  stroke_machine: number | string;

  act_rh: number[];
  sum_act_rh: number | string;
  act_lh: number[];

  repair_rh: number[];
  repair_lh: number[];

  reject_rh: number[];
  reject_lh: number[];

  status: string;

  // --- Downtime (DT) & Dandori ---
  dandori: (string | number)[];
  dandori_plan: number | string;
  dt_machines: number[];
  dt_dies: number[];
  dt_other: number[];
  dt_material: number[];
  total_dt: number[];
  // --- Gaps & Totals ---
  gap_rh: number[];
  gap_lh: number[];

  // --- Detailed Totals (Arrays from Interface A) ---
  total_sap: number[];
  total_std_item?: (string | number)[];
  total_act_item?: (string | number)[];
  total_std_qty?: (string | number)[];
  total_act_qty?: (string | number)[];
  total_std_time?: (string | number)[];
  total_act_time?: (string | number)[];
  persentase_std?: (string | number)[];
  persentase_act?: (string | number)[];
  persentase_tpt?: (string | number)[];
  persentase_patan?: (string | number)[];
  total_item?: (string | number)[];
  patan_additional?: (string | number)[];

  // --- Summary Totals (Numbers/Strings from Interface B) ---
  total_stroke?: number;
  total_lot_rh?: number;
  total_lot_lh?: number;
  tpt_total?: number;
  total_stroke_actual?: number | string;
  total_act_rh?: number | string;
  total_act_lh?: number | string;
  total_repair_rh?: number | string;
  total_repair_lh?: number | string;
  total_reject_rh?: number | string;
  total_reject_lh?: number | string;
  accum_lotsize_rh?: number | string;
  accum_lotsize_rh_1: number;
  accum_lotsize_lh_1: number;
  accum_lotsize_rh_2: number;
  accum_lotsize_lh_2: number;
  accum_prod_rh_1: number;
  accum_prod_lh_1: number;
  accum_prod_rh_2: number;
  accum_prod_lh_2: number;
  accum_sap_rh_1: number;
  accum_sap_lh_1: number;
  accum_sap_rh_2: number;
  accum_sap_lh_2: number;
  accum_gap_rh: number;
  accum_gap_lh: number;
  accum_reject_rh_1: number;
  accum_reject_lh_1: number;
  accum_reject_rh_2: number;
  accum_reject_lh_2: number;
  accum_lotsize_lh?: number | string;
  total_idletime?: number | string;
  total_dandori?: number | string;
  total_dt_machines?: number | string;
  total_dt_dies?: number | string;
  total_dt_other?: number | string;
  total_dt_material?: number | string;
  dt_total?: number | string;
  total_tpt_trial?: number | string;
  total_tpt_actual?: number | string;
  range_tpt?: number | string;

  // --- GSPH & Actuals ---
  gsph: (string | number)[];
  gsph_plan: number[];
  job_number_actual: string | null;
  tpt_actual: number[];
  finish_actual: string;
  idletime: number[];

  // --- Delivery & Updates ---
  status_delivery: string;
  is_done: string | number;
  update_date: string;

  // --- Keterangan Details ---
  ket_repair_rh: string[];
  ket_repair_lh: string[];
  ket_reject_rh: string[];
  ket_reject_lh: string[];
  ket_idletime: string[];
  ket_dt_machines: string[];
  ket_dt_dies: string[];
  ket_dt_other: string[];
  ket_dt_material: string[];
  cm_dt_machines: string[],
  cm_dt_dies: string[],
  cm_dt_other: string[],
  cm_dt_material: string[],
  status_dt_machines: string[],
  status_dt_dies: string[],
  status_dt_other: string[],
  status_dt_material: string[],  

  // --- Machine Specifics ---
  machine: string[][];
  process: string[][];
  qty_actual_machine: number | string;
  last_status: string;
  dandori_machine: number | string;
  tpt_machine: number | string;
  finish_machine: string;
  gsph_machine: number | string;

  // --- Pallet Info ---
  act_palet: number[];
  tipe_palet: string;
  qty_palet: number | string;
  qty_pallet: number[]; // Duplicate naming handled (exists in both with different spelling)
  type_pallet: string;

  total_lkh: number[];

  additional_shift1: number[];
  patan_shift1: number[];
  additional_shift2: number[];
  patan_shift2: number[];

  // --- Shift Details (1 & 2) ---
  lotsize_rh_shift1: number[];
  lotsize_lh_shift1: number[];
  lotsize_rh_shift2: number[];
  lotsize_lh_shift2: number[];

  reject_lh_shift1: number[];
  reject_lh_shift2: number[];
  reject_rh_shift1: number[];
  reject_rh_shift2: number[];

  total_prod_lh_shift1: number[];
  total_prod_lh_shift2: number[];
  total_prod_rh_shift1: number[];
  total_prod_rh_shift2: number[];

  SAP_LH_SHIFT1: number[];
  SAP_LH_SHIFT2: number[];
  SAP_RH_SHIFT1: number[];
  SAP_RH_SHIFT2: number[];

  total_reject_lh_shift1: number[];
  total_reject_lh_shift2: number[];
  total_reject_rh_shift1: number[];
  total_reject_rh_shift2: number[];

  keterangan_sap_shift1: string;
  keterangan_sap_shift2: string;

  // --- Z-Fields ---
  zkbnfull_rh: number[];
  zkbnwait_rh: number[];
  ztotkbn_rh: number[];
  ztotkbn_lh: number[];
  ztotqty_rh: number[];
  ztotqty_lh: number[];
  zstatus: string;
  zbehmg_rh: number[];
  zbehmg_lh: number[];

  // Ach SAP
  accum_lkh: number;
  accum_sap: number;
  total_sap_rh: number;
  total_sap_lh: number;
}

export interface lineDetail {
  patan: string;
  shift: number;
  date: string;
  line_id: string;
  gsph_plan: number;
  downtime_plan: number;
  idletime_plan: number;
  cycle_time_plan: number;
  good_plan: number;
  repair_plan: number;
  reject_plan: number;
  length: number;
  connection: boolean;

  total_reject: number | string;
  reject_persen: number | string;

  jumlah_mesin: number;
  qty_ok: number;
  ok_persen: string;
  total_repair: number;
  repair_persen: string;

  detail: any;
}

export interface FormKanbanFull {
  part_number_rh: string;
  part_number_lh: string;
  total_kanban: number;
  qty_ok: number;
  dIndex: number;
  isCancel: number | string;
}

export interface filterDate {
  clock: string; // "2025-12-19 17:38"
  date: string; // "2025-12-19"
  day: string; // "19"
  hour: string; // "17:38"
  period: string; // "2025-12"
  period2: string; // "202512"
  shift: number; // 1
  month?: string | null;
  year?: string | null;
}

export interface SaveDetailSAP {
  formDetail: Record<string, any[]>;
  line_id: string;
  date: string;
  shift: string;
  patan: string;
  is_done: string | number | boolean;
}
