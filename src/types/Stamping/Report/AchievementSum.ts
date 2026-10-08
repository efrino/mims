export interface AchievementReportSumStmp {
  date: string | null
  shift: string | null
  line_id: string | null
  patan: string | null

  status_plan: string | null
  gsph_plan: string | null
  gsph_actual: string | null

  downtime_plan: string | null
  downtime_actual: string | null

  ideltime_plan: string | null
  ideltime_actual: string | null

  cycletime_plan: string | null
  cycletime_actual: string | null

  qty_plan: string | null
  qty_actual: string | null

  good_plan: string | null
  good_actual: string | null

  repair_plan: string | null
  repair_actual: string | null

  reject_plan: string | null
  reject_actual: string | null
}


export interface AchievementReportSumRow {
  date: string | null
  shift: string | null
  patan: string | null
  line_id: string | null
  status_plan: string | null

  gsph_plan: number | null
  gsph_actual: number | null

  downtime_plan: number | null
  downtime_actual: number | null

  ideltime_plan: number | null
  ideltime_actual: number | null

  cycletime_plan: number | null
  cycletime_actual: number | null

  qty_plan: number | null
  qty_actual: number | null

  good_plan: number | null
  good_actual: number | null

  repair_plan: number | null
  repair_actual: number | null

  reject_plan: number | null
  reject_actual: number | null
}
