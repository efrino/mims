export interface TagOkItem {
  date?: string | null;
  shift?: string | null;
  line_id?: string | null;
  id_kanban?: string | null;
  part_number?: string | null;
  part_name?: string | null;
  id_label?: string | null;
  id_tag_ok?: string | null;
  total_tag_ok?: string | null;
  job_number?: string | null;
  identity?: string | null;
  qty_kbn?: string | null;
  qty?: string | null;
  no_kanban?: string | null;
  page?: number | null;
  page_of?: string | null;
  range?: string | null;
  status?: string | null;
  pic?: string | null;
  nickname?: string | null;
  user_create?: string | null;
  user_update?: string | null;
  is_scan?: string | null;
  is_scanned?: string | null;
  scan_date?: string | null;
  scan_user?: string | null;
  date_print?: string | null;
  print_date?: string | null;
  additional?: string | null;
  created_at?: string | null;
  create_date?: string | null;
  update_date?: string | null;
  updated_at?: string | null;
  part_delivery?: string | null;
  type?: string | null;
  customer?: string | null;
}

export interface QZPrintData {
  type: "image";
  format: "base64";
  data: string;
}

export interface SelectPartNumber {
  part_number: string;
  part_delivery: string;
  job_number: string;
  type: string;
  qty_kbn: string;
  customer: string;
}

export interface FormDataTagOk {
  date: string;
  id_kanban: string;
  id_wis: string;
  qty_kbn: string;
  part_number: string;
  lotsize_actual: string;
  shift: number;
  type: string;
  job_number: string;
}

export interface params {
  date: string;
  shift: string;
  id_kanban: string;
}

export interface scanTagOK {
  id_tag: string;
  nik_user: string;
}