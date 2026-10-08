// GLC Press Simulation (Stamping) — tiruan GLC Simulation welding.
// Satu batang grafik = satu line press dari master machine press
// (ms_mesin_press: line_id + jumlah_mesin). Backend: api/Glc_press_simulation.

export type GlcPressSource = 'PATAN' | 'MDFO'
export type GlcPressStatus = 'DRAFT' | 'ACTIVE'

export interface GlcPressLine {
  line_id: string
  jumlah_mesin: number
}

export interface GlcPressSimulation {
  id: number
  periode: string
  source: GlcPressSource
  status: GlcPressStatus
  note: string | null
  working_day: number
  dandori_menit: number
  dandori_freq: number
  downtime_menit: number
  total_part?: number
  created_by: string | null
  created_at: string | null
  updated_by: string | null
  updated_at: string | null
}

/** Satu part di simulasi. Waktu disimpan dalam menit per hari. */
export interface GlcPressPart {
  id: number
  id_simulation: number
  part_number: string
  part_lh: string | null
  status_part: string | null
  line_prev: string
  line_use: string
  /** mesin pertama di line yang dipakai; part memakai mesin_awal..mesin_awal+proses-1 */
  mesin_awal: number
  proses: number
  gsph: number
  pcs_day: number
  stroke_day: number
  prod_min: number
  dandori_min: number
  run_day: number
  /** line yang pernah menjalankan part ini (jadwal patan 12 bulan terakhir) */
  line_history: string[]
}

/** Satu batang grafik: line, atau mesin di dalam line. Satuan jam/hari. */
export interface GlcPressBar {
  label: string
  jumlah_mesin?: number
  prod_time: number
  dandori: number
  downtime: number
  tpt: number
  pcs_day: number
  stroke_day: number
  item: number
  uph: number
}

export interface GlcPressDetail {
  header: GlcPressSimulation
  lines: GlcPressLine[]
  parts: GlcPressPart[]
}

export interface GlcPressSourceParam {
  periode: string
  source: GlcPressSource
  working_day?: number
  dandori_menit?: number
  dandori_freq?: number
  downtime_menit?: number
  note?: string
}

export interface GlcPressSummaryLine {
  line: string
  jumlah_mesin: number
  prod_time: number
  dandori: number
  downtime: number
  tpt: number
  pcs_day: number
  stroke_day: number
  item: number
  uph: number
}

export interface GlcPressSourcePreview {
  working_day: number
  total_part: number
  summary: GlcPressSummaryLine[]
}

export interface GlcPressMove {
  id: number
  part_number: string
  part_lh: string | null
  proses: number
  dari: string
  ke: string
  jam: number
}

export interface GlcPressBalance {
  moves: GlcPressMove[]
  sebelum: GlcPressSummaryLine[]
  sesudah: GlcPressSummaryLine[]
}
