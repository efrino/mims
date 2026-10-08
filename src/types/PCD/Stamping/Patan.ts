export interface Filter {
  date: string;
  period: string;
  line: string;
  shift: string;
  part_type: string;
}

export interface ListInfo {
  line: string[];
  patan: string[];
  status: string[];
  status_plan: string[];
  combination: string[];
  shift: string[];
  tipe_part: string[];
  planProcess: string[];
}

export interface SchedulePress {
  id: string;
  period: string;
  date: string;
  shift: string;
  line_id: string;
  patan: string;
  part_lh: string;
  part_rh: string;
  lot_lh: string;
  lot_rh: string;
  gsph: string;
  tpt: string;
  dandori_plan: string;
  plan_process: string;
  act_process: string | null;
  stroke_plan: string;
  combination: string;
  value_combination: string;
  additional: string;
  status_plan: string;
  urut: string;
  urut_plan: string;
  time_shift: string;
  create_date: string;
  update_date: string | null;
  is_active: string;
  user_create: string;
  user_update: string | null;
}

export interface formData {
  date: string;
  line: string;
  shift: string;
  combination: string;
  plan_process: string;
  part_rh: string;
  part_lh: string;
  lot_rh: string;
  lot_lh: string;
  tpt: string;
  gsph: string;
  stroke_plan: string;
  dandori_plan: string;
  status_plan: string;
  status: string;
}

export interface TableTagOK {
  id: string;
  id_tag_ok: string;
  id_kanban: string;
  no_kanban: string;
  line_id: string;
  area: string;
  project: string;
  customer: string;
  part_number: string;
  part_name: string;
  job_number: string;
  qty_kbn: string;
  range: string;
  total_tag_ok: string;
  status: string;
  shift: string;
  date: string;
  is_scanned: string;
  scan_date: string;
  scan_user: string | null;
  unscan_date: string;
  unscan_user: string | null;
  additional: string;
  identity: string | null;
  user_create: string;
  user_update: string | null;
  create_date: string;
  update_date: string | null;
  print_date: string;
  created_at: string;
  updated_at: string;
}

export interface ExcelColumn {
  period: string;
  line: string;
  patan: string;
  combination: string;
  plan_process: string;
  part_rh: string;
  part_lh: string;
  stroke_plan: number | string;
  lot_rh: number | string;
  lot_lh: number | string;
  tpt: number | string;
  gsph: number | string;
  cycletime: number | string;
  dandori_plan: number | string;
  status_plan: string;
  value_combination: string;
  raw_matnr: string;
  need_qty: string;
  stock_sap: string;
  ERROR: string | null;
  ERROR_UPLOAD: string | null;
  WARNING: string | null;
}