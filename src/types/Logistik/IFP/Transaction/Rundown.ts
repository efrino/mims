export interface WeeklyForecast {
  week_label: string;
  pcs?: number;
  pcs_kanban?: number;
}

export interface RunoutPrediction {
  day_label: string;
  stock_after: number;
  qty_deduction: number;
  source: string;
}

export interface ShippingPreparationItem {
  part_number?: string;
  etd?: string;
  init_stok?: number | string;
  init_stock?: number | string;
  qty_added?: number | string;
  qty_added_scan?: number | string;
  qty_reduced?: number | string;
  qty_reduced_scan?: number | string;
  total_calc?: number | string;
  total_calc_assumpt_scan_ship?: number | string;
  order_qty?: number | string;
  source?: string;
}

export interface RundownItem {
  ID: string;
  MATNR: string;
  MAKTX: string;
  PATAN: string | null;
  PROCESS: string;
  MTART: string;
  BISMT: string;
  LABST: string;
  project_id: string;
  ZPLNPH: string;
  ZMAJPH: string;
  EXTWG: string | null;
  ZSTRENGTH: string;
  ZLOC: string | null;
  LGORT: string;
  BEHMG: string;
  ZQTY_CTR: string | null;
  SORTL: string;
  ZROUTING: string;
  CUSTOMER: string | null;
  DEST1: string;
  DEST2: string;
  DEST3: string;
  REMARK: string;
  type: string | null;
  created_at: string;
  updated_at: string;
  runout: string;

  pcs_per_week: string | null;
  pcs_day_mdfo_roundedkanban: string | null;
  pcs_day_mdfo_delivery?: string | null;
  pcs_day_mdfo_delivery_roundedkanban?: string | null;
  freq_delivery?: string | number | null;
  periode: string | null;

  zcust?: string | null;
  ZCUST?: string | null;

  weekly_forecast?: WeeklyForecast[];
  runout_prediction?: RunoutPrediction[];
  shipping_preparation?: ShippingPreparationItem[];
}

export interface CustomerWorkday {
  zcust: string;
  customer_id_master?: string;
  nama_customer?: string;
  induk_customer?: string;
  nama_induk?: string;
  total_workdays: number;
  range_minggu_ini?: string;
  status_keterangan?: string;
}

export interface GenerateSOUpdatedItem {
  part_no: string;
  qty: number;
}

export interface GenerateSONotFoundItem {
  part_no: string;
  qty: number;
  status?: string;
  vbeln?: string;
}

export interface GenerateSOResponse {
  status: string;
  updated: GenerateSOUpdatedItem[];
  not_found: GenerateSONotFoundItem[];
  total_updated: number;
  total_not_found: number;
}

export interface ParamsFilter {
  start?: string;
  end?: string;
  type?: string;
  data?: string;
  week_offset?: number | string;
  offset?: number | string;
  week?: number | string;
  shift?: number | string;
}