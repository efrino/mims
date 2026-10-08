export interface AchievementReportSAPStmp {
  id: string
  date: string
  shift: string
  time_shift: string

  line_id: string
  original_line: string

  urut: string
  urut_plan: string
  patan: string
  additional: string

  job_number: string | null
  part_number: string | null

  part_rh: string
  part_lh: string

  combination: string
  value_combination: string

  plan_process: string
  act_process: string
  total_process: string

  tpt: string | null

  lotsize: string | null
  lot_rh: string
  lot_lh: string

  kbn_rh: string
  kbn_lh: string

  status_plan: string
  stroke_plan: string
  dandori_plan: string
  gsph_plan: string

  job_number_actual: string | null
  part_number_actual: string | null

  tpt_actual: string | null
  finish_actual: string | null
  qty_actual: string | null

  stroke_act: string
  act_rh: string
  act_lh: string

  sap_rh: string
  sap_lh: string

  status: string

  repair: string | null
  repair_rh: string
  repair_lh: string
  ket_repair_rh: string
  ket_repair_lh: string

  reject: string | null
  reject_rh: string
  reject_lh: string
  ket_reject_rh: string
  ket_reject_lh: string

  dandori: string
  dt_machines: string
  ket_dt_machines: string
  dt_dies: string
  ket_dt_dies: string
  dt_other: string
  ket_dt_other: string
  dt_material: string
  ket_dt_material: string
  dt_total: string

  downtime: string | null
  idletime: string
  ket_idletime: string
  breaktime: string | null

  keterangan: string

  tipe_palet: string
  qty_palet: string | null
  act_palet: string

  keterangan_all: string
  information: string
  keterangan_sap: string
  status_delivery: string

  is_tandem: string
  is_trial: string
  is_active: string
  is_done: string
  is_open: string
  is_running: string
  is_next: string

  hadir: string
  izin: string
  sakit: string
  ganti_hari: string

  create_date: string
  user_create: string
  update_date: string
  user_update: string
  user_open: string

  // line_plan: string

  is_tandem_text: string
  is_trial_text: string
  additional_text: string

  qty_actual_machine: string
  stroke_actual: string
  gsph: string
  dandori_machine: string | null

  total_sap: string
  gap_rh: string
  gap_lh: string

  tpt_machine: string | null

  total_lotsize_rh: string
  total_lotsize_lh: string

  machines_concat: string
  process_concat: string

  total_standard: string
  total_present: string
  total_leave: string
  total_sick: string

  machine_1: string | null
  machine_2: string | null
  machine_3: string | null
  machine_4: string | null

  process_1: string | null
  process_2: string | null
  process_3: string | null
  process_4: string | null
}

export interface AchievementReportSAPRow {
  date: string | null
  shift: string | null
  patan: string | null
  line_id: string | null
  urutan: string | null

  part_rh: string | null
  part_lh: string | null

  lot_rh: number | null
  lot_lh: number | null

  total_lotsize_rh: number | null
  total_lotsize_lh: number | null

  sap_rh: number | null
  sap_lh: number | null

  gap_rh: number | null
  gap_lh: number | null
}