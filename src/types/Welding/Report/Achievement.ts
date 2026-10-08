export interface AchievementReportWld {
  achievement_id: string | null;
  act_process: string | null;
  additional: string;
  additional_text: string;
  combination: string | null;
  create_date: string;
  created_at: string | null;
  update_date: string;
  updated_at: string | null;
  date: string;
  time_shift: string;
  id: string;
  idletime: string;
  urut: string;
  urut_plan: string;
  job_number: string;
  part_number: string;
  model: string;
  line: string;
  line_id: string;
  shift: string;
  status: string;
  status_plan: string;
  patan: string;
  lotsize: string;
  lotsize_actual: string | null;
  total_lotsize: string | null;
  plan_process: string | null;
  total_process: string;
  finish_actual: string;
  stroke_plan: string;
  stroke_plan_total: string;
  stroke_act: string | null;
  uph_plan: string;
  uph_act: string;
  tpt: string;
  tpt_actual: string;
  dt_total: string;
  dt_jig: string | null;
  dt_machines: string | null;
  dt_other: string | null;
  dt_wip: string | null;
  jig: string | null;
  machine: string | null;
  nut_spot: string | null;
  dandori: string | null;
  dandori_plan: string | null;
  others: string | null;
  wip: string | null;
  reject: string | null;
  repair: string | null;
  ket_dt_jig: string | null;
  ket_dt_machines: string | null;
  ket_dt_other: string | null;
  ket_dt_wip: string | null;
  ket_reject: string | null;
  ket_repair: string | null;
  keterangan_plan: string | null;
  keterangan_actual: string | null;
  information: string | null;
  information_id: string | null;
  is_open: string;
  is_running: string;
  is_next: string;
  is_tandem: string;
  is_tandem_text: string;
  value_combination: string | null;
  user_create: string;
  user_created: string | null;
  user_update: string;
  user_updated: string;
  user_open: string | null;
}

export interface AchievementReportRow {
  date: string | null;
  shift: string | null;
  additional_text: string | null;
  line_id: string | null;
  urut: string | null;
  part_number: string | null;
  job_number: string | null;
  status_plan: string | null;
  stroke_plan: string | null;
  stroke_plan_total: string | null;
  lotsize: string | null;
  tpt: number | null;
  uph_plan: number | null;
  keterangan: string | null;
  stroke_act: string | null;
  lotsize_actual: string | null;
  repair: string | null;
  ket_repair: string | null;
  reject: string | null;
  ket_reject: string | null;
  total_output: number | null;
  status: string | null;
  idletime: string | null;
  dandori: string | null;
  dt_machines: string | null;
  ket_dt_machines: string | null;
  dt_jig: string | null;
  ket_dt_jig: string | null;
  dt_other: string | null;
  ket_dt_other: string | null;
  dt_wip: string | null;
  ket_dt_wip: string | null;
  dt_total: string | null;
  tpt_actual: string | null;
  uph_act: string | null;
}

export interface DashboardKanban {
  act_lkh: string;
  act_sap: string;
  percentage: string;
  type: string;
}

export interface AchievementReportWldKbn {
  GAP: string;
  MATNR: string;
  PERCENTAGE: number | null;
  ZQTY_LKH: string;
  ZQTY_SAP: string | null;
  date: string;
  line_id: string;
  shift: string;
  total_sap: string;
}

export interface IncomplateKanbanRow {
  PERCENTAGE: number | null;
  act_lkh: string;
  act_sap: string;
  date: string;
  gap: string;
  line_id: string;
  part_number: string;
  shift: string;
  total_sap: string;
}

export interface DetailAchievementReportWldKbn {
  date: string;
  line_id: string;
  lkh: string;
  sap: string;
  gap: string;
  percentage: string;
  keterangan_sap: string | null;
  part_number: string;
}
