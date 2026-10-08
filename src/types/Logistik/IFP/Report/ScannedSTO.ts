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
  unscan_date: string;
  unscan_user: string | null;
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
}