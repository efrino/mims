export interface ParamsFilter {
  start: string;
  end: string;
}

export interface ScannedTagRawItem {
  id_tag_ok: string;
  date: string;
  shift: string;
  line_id: string;
  status: string;
  part_number: string;
  qty: string;
  scanned_in: string;
  scan_in_date: string;
  scan_in_user: string;
  scanned_out: string;
  scan_out_date: string;
  scan_out_user: string | null;
  unscan_date: string;
  unscan_user: string | null;
  updated_at: string;
  updated_user: string | null;
  id: string;
  job_number: string;
  part_name: string;
  qty_kbn: string;
  project: string;
  customer: string;
  area: string;
}

export interface ScannedItem {
  id_tag_ok: string;
  date: string;
  shift: string;
  line_id: string;
  part_number: string;
  job_number: string;
  project: string;
  qty: string;
  scan_in_date: string;
  scan_in_user: string;

  action?: string;
}

export interface UnscanTagPayload {
  id_tag_ok: string | number;
  nik: string | null;
}
