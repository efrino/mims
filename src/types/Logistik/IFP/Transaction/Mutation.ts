export interface MutationQuery {
  tanggal?: string;
  shift?: string;
  source?: string;
  part_number?: string;
}

export interface MutationItem {
  id: number;
  tanggal: string;
  shift: string;
  source: string;
  part_number: string;
  stok_awal: number;
  qty_in: number;
  qty_out: number;
  qty_final: number;
  qty_adjust: number | null;
  tabungan: number | null;
  stok_awal_tabungan: number | null;
  stock_weld_yesterday: number | null;
  stock_mgl: number | null;
  pcs_day_adjust: number | null;
  pcs_today: number | null;
  pcs_tomorrow: number | null;
  pcs_day_mdfo_roundedkanban: number | null;
  status: string;
  strength: string | null;
  strength_standard: string | null;
  zrouting: string | null;
  MAKTX: string | null;
  project_id: string | null;
  DEST1: string | null;
  pcs_day_mdfo_roundedkanban_stocks: number | null;
  std_min: number | null;
  std_max: number | null;
  customer: string | null;
  qty_kbn?: number | null;

  // Computed oleh controller
  pcs_day_calc_for_qty_final: number;
  pcs_day_calc_for_qty_adjustment: number;
  qty_needed_for_qty_final: number;
  qty_needed_for_qty_adjustment: number;
}

export interface MutationResponse {
  success: boolean;
  data: MutationItem[];
  total: number;
  message?: string;
}

// Untuk POST bulk_update
export interface MutationUpdatePayload {
  tanggal: string;
  shift: string;
  source: string;
  part_number: string;
  stok_awal?: number;
  qty_in?: number;
  qty_out?: number;
  qty_final?: number;
  status?: string;
  strength?: string;
  pcs_day_adjust?: number;
  pcs_day_mdfo_roundedkanban?: number;
  zrouting?: string;
}

export interface MutationUpdateResponse {
  success: boolean;
  message: string;
  errors?: string[];
}

export interface DeliveryItem {
  KUNNR: string;
  VBELV: string;
  POSNR: string;
  BISMT: string;
  MATNR: string;
  KWMENG: string;
  VDATU: string;
  VBELN: string;
  SJMAN: string;
  POSNN: string;
  RFMNG: string;
  MEINS: string;
  ERDAT: string;
  ERZET: string;
  BSTNK: string;
  WADAT_IST: string;
  VGBEL: string;
  VSNMR_V: string;
  BSTDK: string;
  MBLNR: string;
  BUDAT: string;
  EMPST: string;
  DATEBILL: string;
  DNBACK: string;
  REMARK: string;
}

export interface DeliveryQuery {
  action: string;
  erdat?: string;
}

export interface DeliveryResponse {
  success: boolean;
  data: {
    COUNT: string;
    MESSAGE: string;
    MESSAGE2: string;
    SHOPCODE: string;
    ZPRINT: string;
    ISTPOX: any[];
    LINES: any[];
    LIPS: any[];
    ZDELIVERY: any[];
    ZDNDO: DeliveryItem[];
  };
  message?: string;
}

// ==========================================
// === TAMBAHAN BARU: SALES ORDER DO & ETD ===
// ==========================================

export interface SalesOrderDoItem {
  id: number;
  bstdk: string | null;
  matnr: string | null;
  vbeln: string | null;
  vbelv: string | null;
  posnr: string | null;
  erdat: string | null;
  erzet: string | null;
  ERZET?: string | null;
  action: string | null;
  kwmeng: string | null;
  bismt: string | null;
  vsnmr_v: string | null; // Tipe data TIME dari MySQL (format 'HH:MM:SS' atau null)
  rfmng: string | null;
  created_at: string | null;
  created_by: string | null;
  updated_at: string | null;
  updated_by: string | null;
  qty_out: string; // Hasil CONDITIONAL antara rfmng & kwmeng
}

export interface SalesOrderDoResponse {
  status: boolean;
  message: string;
  is_cycledelv_null: boolean;
  data: SalesOrderDoItem[];
}

export interface EtdUpdatePayload {
  id: number | string;
  vbeln: string;
  vbelv: string;
  posnr: string;
  cycledelv: string; // Dikirim dengan format waktu 'HH:MM:SS'
  status?: string;
}

export interface EtdUpdateResponse {
  status: boolean;
  message: string;
}

// ============================================================
// === STRUKTUR PAYLOAD BARU UNTUK SEBAGAI PARAMETER RE-FETCH ===
// ============================================================
export interface SalesOrderDoQueryByDate {
  date: string;
  action: 'PODATE' | 'CREATEDON';
}