// types/Public/Welding/mutasi-wip.ts

export type WipStockStatus = 'CRITICAL' | 'LOW' | 'SAFE' | 'OVER'

// ── wip_stock ─────────────────────────────────────────────────
export interface WipStock {
  id:             number
  part_number:    string
  part_name:      string | null
  area:           string
  job_number:     string | null
  op:             number | null
  stock_current:  number
  safety_min:     number
  safety_max:     number
  stock_status:   WipStockStatus
  stock_pct:      string | null
  parent_part:    string | null
  bq:             number
  last_tp_at:     string | null
  updated_at:     string
}

export interface WipStockSummary {
  area:               string
  total_parts:        number
  critical_count:     number
  low_count:          number
  safe_count:         number
  over_count:         number
  unconfigured_count: number
  total_stock:        number
}

// ── mutasi_wip harian ─────────────────────────────────────────
export interface WipMutasiDay {
  tanggal?:      number
  plan_day:      number
  plan_night:    number
  plan_total:    number
  actual_day:    number
  actual_night:  number
  actual_total:  number
  initial_stock: number
  stock_in:      number
  stock_out:     number
  closing_stock: number
  safety_min:    number
  safety_max:    number
  balance:       number
  shortage:      number
  is_shortage:   boolean
  is_over_stock: boolean
}

// ── pivoted row ───────────────────────────────────────────────
export interface WipMutasiRow {
  part_number:     string
  part_name:       string | null
  job_number:      string | null
  op:              number | null
  parent_part:     string
  bq:              number
  area:            string
  days:            Record<number, WipMutasiDay>
  total_plan:      number
  total_actual:    number
  total_shortage:  number
  has_shortage:    boolean
  has_over:        boolean
}

// ── summary bulanan ───────────────────────────────────────────
export interface WipMutasiSummaryRow {
  period_year:         number
  period_month:        number
  area:                string
  part_number:         string
  part_name:           string | null
  job_number:          string | null
  op:                  number | null
  parent_part:         string
  bq:                  number
  plan_total_month:    number
  plan_day_month:      number
  plan_night_month:    number
  actual_total_month:  number
  actual_day_month:    number
  actual_night_month:  number
  closing_stock_last:  number | null
  initial_stock_first: number | null
  stock_in_month:      number
  stock_out_month:     number
  safety_min:          number | null
  safety_max:          number | null
  balance_month:       number
  shortage_days:       number
  shortage_qty_total:  number
  over_days:           number
  has_shortage:        boolean | number
  has_over:            boolean | number
  last_day_data:       number
  achievement_rate:    number | null
}

// ── alerts ────────────────────────────────────────────────────
export interface WipAlert {
  area:             string
  part_number:      string
  part_name:        string | null
  parent_part:      string
  parent_part_name: string | null
  tanggal:          number
  plan_total:       number
  closing_stock:    number
  safety_min:       number
  safety_max:       number
  shortage:         number
  is_shortage:      boolean | number
  is_over_stock:    boolean | number
  fp_plan_day:      number
  fp_plan_night:    number
}

// ── API responses ─────────────────────────────────────────────
export interface WipMutasiResponse {
  period: { year: number; month: number }
  area:   string | null
  total:  number
  rows:   WipMutasiRow[]
}

export interface WipMutasiSummaryResponse {
  period: { year: number; month: number }
  area:   string | null
  total:  number
  rows:   WipMutasiSummaryRow[]
}

export interface WipDailyDetailResponse {
  period:      { year: number; month: number }
  part_number: string
  area:        string
  days:        WipMutasiDay[]
}

export interface WipStockResponse {
  rows:  WipStock[]
  total: number
}

export interface WipAlertResponse {
  period:  { year: number; month: number }
  tanggal: number | null
  total:   number
  rows:    WipAlert[]
}

export interface PipelineResult {
  area:           string
  total_parts:    string | number
  total_plan:     string | number
  total_actual:   string | number
  shortage_parts: string | number
  over_parts:     string | number
}

export interface PipelineResponse {
  period:     { year: number; month: number }
  area:       string
  elapsed_ms: number
  summary:    PipelineResult[]
}

// ── Filter params ─────────────────────────────────────────────
export interface WipMutasiFilter {
  year:  number
  month: number
  area:  string | null
}

export interface WipAlertFilter {
  year:     number
  month:    number
  tanggal?: number | null
}

// ── UI helpers ────────────────────────────────────────────────
export const STOCK_STATUS_LABEL: Record<WipStockStatus, string> = {
  CRITICAL: 'Kritis',
  LOW:      'Rendah',
  SAFE:     'Aman',
  OVER:     'Over Stok',
}

export const STOCK_STATUS_COLOR: Record<WipStockStatus, string> = {
  CRITICAL: 'error',
  LOW:      'warning',
  SAFE:     'success',
  OVER:     'info',
}

export const MONTHS_ID = [
  '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]