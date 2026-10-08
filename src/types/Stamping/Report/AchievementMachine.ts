export interface AchievementReportMachineStmp {
  date: string | null
  shift: string | null
  line_id: string | null
  urut: string | null
  patan: string | null

  machine_position: string | null
  machine: string | null
  process: string | null

  job_number: string | null
  part_number: string | null
  lotsize: string | null

  gsph: string | null

  job_number_actual: string | null
  part_number_actual: string | null
  qty_actual: string | null

  is_finish: string | null
  act_mesin: string | null
  is_done: string | null

  dandori_start: string | null
  dandori_end: string | null
  tpt_start: string | null
  tpt_end: string | null

  last_status: string | null

  create_date: string | null
  user_create: string | null
  update_date: string | null
  user_update: string | null

  job_number_next: string | null

  dandori: string | null
  tpt: string | null

  g_sarana: string | null
  g_bahan: string | null
  g_dies: string | null
  g_mesin: string | null
}

export interface AchievementReportMachineRow {
  date: string | null
  shift: string | null
  patan: string | null
  line_id: string | null

  machine: string | null
  job_number_actual: string | null
  process: string | null

  lotsize: number | null
  qty_actual: number | null

  dandori: number | null
  tpt: number | null

  g_sarana: number | null
  g_bahan: number | null
  g_dies: number | null
  g_mesin: number | null
}
