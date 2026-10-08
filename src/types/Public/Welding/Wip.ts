// Welding WIP Management Types
export interface WipStockItem {
  id: number;
  area_code: string;
  part_number: string;
  job_number: string | null;
  op: number;
  source: 'IFPP' | 'OUTHOUSE' | 'CKD' | 'VENDOR' | 'WIP' | string;
  qty: number;
  last_updated: string;
}
export interface WipStockSummary {
  area_code: string;
  total_qty: number;
  total_part: number;
}
export interface WipTrxRow {
  id: number;
  trx_code: string;
  trx_date: string;
  shift: 'Day' | 'Night';
  type: 'plan' | 'actual';          // ← tambah
  area_code: string;
  fp_part_number: string;
  fp_job_number: string | null;
  fp_qty_plan: number;
  total_lines: number;
  lines_kurang: number;
  status: 'draft' | 'confirmed';
}
export interface WipTrxCrossLine {
  id: number;
  from_area: string;
  to_area: string;
  part_number: string;
  job_number: string | null;
  source: string;
  required_qty: number;
  stock_snapshot: number;
  delta: number;
}
export interface WipTrxInternalLine {
  id: number;
  from_area: string;
  part_number: string;
  job_number: string | null;
  op: number;
  required_qty: number;
  stock_snapshot: number;
  delta: number;
}
export interface WipTrxHeader extends WipTrxRow { }
export interface WipTrxDetail {
  header: WipTrxHeader | null;
  cross: WipTrxCrossLine[];
  internal: WipTrxInternalLine[];
}
export interface WipGeneratePayload {
  trx_date: string;
  shift: 'Day' | 'Night';
  area_code: string;
  fp_part_number: string;
  fp_qty_plan: number;
}
export interface StockFilter {
  area_code?: string;
  part_number?: string;
  job_number?: string;
  source?: string;
}
export interface TrxFilter {
  area_code?: string;
  trx_date?: string;
  shift?: string;
  status?: string;
  type?: string;
}
