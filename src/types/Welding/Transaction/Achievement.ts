export interface FilterParams {
  date: string;
  period: string;
  period2: string;
  clock: string;
  hour: string;
  shift: string | number;
  day: string;
}

export interface ResponseData {
  attendance: Attendance[];
  detail: Detail[];
  line_id: string;
  patan: string;

  summary_data?: SummaryData;
  note?: string;
}

export interface Detail {
  id: string;
  urut: string;
  patan: string;
  urut_plan: string;
  job_number: string;
  part_number: string;
  status: string;
  status_plan: string;
  idletime: string | null;
  is_open: string;
  is_running: string;
  is_next: string;
  is_tandem: string;
  stroke_plan: string;
  stroke_act: string | null;
  plan_process: string | null;
  act_process: string | null;
  total_process: string;
  finish_actual: string;
  time_shift: string;
  update_date: string;
  tpt: string;
  tpt_actual: string;
  uph_plan: string;
  uph_act: string;
  lotsize: string;
  lotsize_actual: string | null;
  dandori: string | null;
  dandori_plan: string;
  combination: string | null;
  value_combination: string | null;
  dt_total: string;
  dt_wip: string | null;
  dt_jig: string | null;
  dt_machines: string | null;
  dt_other: string | null;
  ket_dt_wip: string | null;
  ket_dt_jig: string | null;
  ket_dt_machines: string | null;
  ket_dt_other: string | null;
  reject: string | null;
  repair: string | null;
  ket_reject: string | null;
  ket_repair: string | null;
  nut_spot: string | null;
  information: string;
  keterangan_plan: string | null;
  keterangan_actual: string | null;
  additional: string;
  user_open: string | null;

  total_lotsize_act?: number | null;
  total_dt?: number | null;
  uph?: number | null;
}

export interface Attendance {
  DATE: string;
  line_id: string;
  shift: string | number;
  name_role: string;
  standard: string | number;
  present: string | number;
  sick: string | number;
  leave: string | number;
}

export interface DataGroup {
  prefix_line_id: string;
  total_line_id: number;
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

export interface UserCheck {
  status: boolean;
  user: string | null;
  messages: string | null;
}

export interface KetActual_Plan {
  id: string;
  information: string | null;
  created_at: string | null;
  updated_at: string | null;
  user_created: string | null;
  user_updated: string | null;
}