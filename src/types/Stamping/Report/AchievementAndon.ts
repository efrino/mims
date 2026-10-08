export interface AchievementReportAndonSummaryStmp {
  line_id: string

  STATUS: string | null

  part_number: string | null

  plan: string | null
  actual: string | null

  diff_plan_pcs: string | null
  diff_plan_persen: string | null

  diff_mdfo_pcs: string | null
  diff_mdfo_persen: string | null

  gsph: string | null
  tpt: string | null

  mdfo: string | null
}

export interface AchievementReportAndonMutasiStmp {
  part_number: string | null
  date: string | null

  [key: `plan_${number}`]: string | null
  [key: `act_${number}`]: string | null
  [key: `total_${number}`]: string | null
}

export interface AchievementReportAndonMDFOStmp {
  id: string
  date: string
  shift: string
  time_shift: string
  line_id: string
  part_number: string
  plan_process: string
  act_process: string
  total_process: string
  status: string
  gsph_plan: string
  information: string
}

export interface AchievementReportAndonSummaryRow {
   part_number: string | null
   line_id: string
   plan: string | null
   actual: string | null
   diff_plan_pcs: number | null
   diff_plan_persen: number | null
   gsph: number | null
   tpt: string | null
}

export interface AchievementReportAndonMutasiRow {
  part_number: string | null
}

export interface MDFORow {
  part_number: string | null
  status: string | null
  line: string | null
  process: string | null
  mdfo: string | null
  gsph: string | null
  ERROR: string | null
}

export interface DetailItem {
  part_number: string
  date: string
  line_id: string
  shift: string
  patan: string

  lotsize: number
  tpt: number

  keterangan: string

  lotsize_actual: number
  repair: number
  ket_repair: string
  reject: number
  ket_reject: string

  tpt_actual: number
  status: string

  idletime: number
  dandori: number

  dt_machines: number
  ket_dt_machines: string
  dt_dies: number
  ket_dt_dies: string
  dt_other: number
  ket_dt_other: string
  dt_material: number
  ket_dt_material: string

  stroke_act: number
  act_process: number

  keterangan_all: string
}
