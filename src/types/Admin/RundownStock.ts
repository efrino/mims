export interface StockIFPD {
  customer: string;
  model: string;
  model_name: string;
  project_detail: string | null;
  alias_name: string;
  group_name: string;

  ifpd_single: number;
  ifpd_sa: number;
  ifpd_semi_sa: number;
  ifpd_module: number;

  safe_teiki1: number;
  safe_teiki2: number;
  safe_teiryo1: number;
  safe_teiryo2: number;

  over_total: number;
  kritis_total: number;
  kritis: number;
  safe: number;
  over: number;

  strength_kritis: number;
  total: number;

  shift: number | string;
  cycle_delv: number | string;

  polybox: number;
  pallet: number;
  pcs_polybox: number;
  pcs_pallet: number;
}

export interface StockIFRM {
  customer: string;
  model: string;
  model_name: string;
  kritis: number;
  safe: number;
  over: number;
  hours: number | null;
  total: number;
  single: number;
  semi: number;
  sa: number;
  md: number;
  total_delivery_part: number;
}

export interface StockIFPP {
  customer: string;
  model: string;
  model_name: string;
  converted_strength: number;
  safe_1: number;
  safe_2: number;
  safe_3?: number;
  over_total: number;
  kritis_total: number;
  kritis: number;
  safe: number;
  over: number;
  total: number;
}

export interface StockDetailIFPD {
  MATNR: string;
  BISMT: string;
  ZPLNPH: number;
  LABST: number;
  ZSTRENGTH: number;
  REMARK: string;
  min_str: number;
  max_str: number;
  unit_str: string;
  project_detail: string | null;
  type?: string;
}

export interface StockDetailIFPP {
  id: number;
  lotcycle: string;
  category: string;
  part_type: string;
  part_number: string;
  job_number: string;
  part_desc: string;
  project_id: string;
  routing: string;
  patan: string;
  line_process: string;
  lotsize: number;
  qty_kbn: number;
  plan_day: number;
  plan_hour: number;
  stock: number;
  strength: number;
  stock_conv: number;
  strength_conv: number;
  customer_1: string;
  customer_2: string | null;
  min: number;
  max: number;
  created_at: string;
  updated_at: string;
  runout: number;
  is_rundown: boolean;
  status: string;
  conv_strength: number;
  type?: string;
}

export interface StockDetailIFRM {
  PATAN: string | null;
  PROCESS: string;
  MTART: string;
  BISMT: string;
  ID: number;
  MATNR: string;
  MAKTX: string;
  status_part_hmmi: string | null;
  LABST: number;
  project_id: string;
  ZPLNPH: number;
  ZMAJPH: number | null;
  EXTWG: string;
  ZSTRENGTH: number;
  ZLOC: string | null;
  LGORT: string;
  BEHMG: number;
  ZQTY_CTR: number;
  SORTL: string;
  ZROUTING: number;
  CUSTOMER: string | null;
  DEST1: string;
  DEST2: string;
  DEST3: string;
  REMARK: string;
  type: string;
  created_at: string;
  updated_at: string;
  runout: string; // "667%"
  updated_user: string | null;
  freq_delivery: number | null;
  pcs_day_mdfo_roundedkanban: number | null;
  pcs_day_mdfo_delivery: number | null;
  pcs_day_mdfo_delivery_roundedkanban: number | null;
}

export interface CustomerStock {
  name: string;
  ZCUST: string;
  ZCUST2?: string;
  alias: string;
  group: string;
  model: string;
  modelDetail: string | null;
  carName: string;
}
