export interface MetalFinishProblem {
  id: number;
  problem_id: number;
  problem: string;
  repair_process_id: number;
  repair_process: string;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
}

export interface MetalFinishItem {
  id: number;
  date: string;
  shift: number;
  urut: number;
  nik: string;
  operator_name: string;
  part_number: string;
  job_number: string;
  time_end: string | null;
  prod_time: number;
  prepare_time: number;
  qty_ok: number | null;
  qty_ng: number | null;
  open_by: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
  problems: MetalFinishProblem[];
  // computed in store
  time_start?: string;
}

export interface MetalFinishResponse {
  status: boolean;
  date: string;
  shift: number;
  data: MetalFinishItem[];
}

export interface MetalFinishGroup {
  nik: string;
  operator_name: string;
  items: MetalFinishItem[];
}

export interface MetalFinishParams {
  date: string;
  shift: number;
  period: string;
  period2: string;
  clock: string;
  hour: string;
  day: string;
}

// ── Edit form types ──────────────────────────────────────────────

export interface EmployeeItem {
  nik: string;
  name: string;
  department: string;
  division: string;
  job_title: string;
}

export interface PartListItem {
  id: string;
  part_number: string;
  job_number: string;
  part_name: string;
  status: string;
}

export interface ProblemListItem {
  id: string;
  problem: string;
}

export interface RepairProcessListItem {
  id: string;
  proses: string;
}

export interface EditProblem {
  problem_id: number | null;
  repair_process_id: number | null;
  problem?: string | null;
  repair_process?: string | null;
}

export interface EditRecord {
  id: number;
  urut: number;
  part_number: string;
  job_number: string;
  /** computed – chained from previous row's time_end (or shift start) */
  time_start: string | null;
  /** user input – the actual end time */
  time_end: string | null;
  prepare_time: number | null;
  /** computed – time_end - time_start - prepare_time */
  prod_time: number | null;
  qty_ok: number | null;
  qty_ng: number | null;
  problems: EditProblem[];
}

export interface BatchUpdatePayload {
  records: BatchRecord[];
}

export interface CreatePayload {
  nik: string;
  date: string;
  shift: number;
  part_number: string;
  job_number: string;
}

export interface MetalFinishReportItem {
  id: number;
  date: string;
  shift: number;
  urut: number;
  nik: string;
  operator_name: string;
  part_number: string;
  job_number: string;
  prepare_time: number;
  prod_time: number;
  time_end: string | null;
  gsph: number | null;
  cycle_time: number | null;
  qty_ok: number | null;
  qty_ng: number | null;
  qty_total: number | null;
  problems_summary: string | null;
  repair_summary: string | null;
  open_by: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
}

export interface MetalFinishMonthlyDayData {
  qty_ok: number;
  qty_ng: number;
  total_prod_time: number;
  gsph: number | null;
  cycle_time: number | null;
}

export interface MetalFinishMonthlyItem {
  part_number: string;
  daily: Record<string, MetalFinishMonthlyDayData>;
  total_qty_ok: number;
  total_qty_ng: number;
  total_prod_time: number;
}

export interface MetalFinishMonthlyResponse {
  status: boolean;
  month: string;
  shift: string | number;
  days_in_month: number;
  total: number;
  data: MetalFinishMonthlyItem[];
}

export interface MetalFinishMonthlyNikItem {
  nik: string;
  operator_name: string;
  daily: Record<string, MetalFinishMonthlyDayData>;
  total_qty_ok: number;
  total_qty_ng: number;
  total_prod_time: number;
}

export interface MetalFinishMonthlyNikResponse {
  status: boolean;
  month: string;
  shift: string | number;
  days_in_month: number;
  total: number;
  data: MetalFinishMonthlyNikItem[];
}

export interface MetalFinishReportResponse {
  status: boolean;
  start: string;
  end: string;
  shift?: number;
  total: number;
  data: MetalFinishReportItem[];
}

export interface BatchRecord {
  id: number;
  urut: number;
  part_number: string;
  job_number: string;
  time_end: string | null;
  prepare_time: number | null;
  prod_time: number | null;
  qty_ok: number | null;
  qty_ng: number | null;
  gsph: number | null;
  cycle_time: number | null;
  problems: EditProblem[];
}
