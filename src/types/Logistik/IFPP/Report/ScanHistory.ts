export type ScanMode = 'IN' | 'OUT' | null;
export type ScanStatus = 'SCAN_IN' | 'SCAN_OUT';
export type AreaType = 'inhouse' | 'outhouse';
export interface ScanHistoryItem {
  id_tag_ok?: string | number;
  area_id?: string | number;
  line_id?: string | number;
  part_number: string;
  part_name: string;
  customer: string;
  model: string;
  status: ScanStatus;
  category_scan: string | null;
  qty: string | number | null;
  // qty_out hanya ada di response Scan OUT (scan_out_ifpp) - Scan IN
  // (scan_in_out_ifpp) selalu difilter qty_out=0 di backend jadi tidak dikirim.
  // job_number tidak dikirim backend di kedua kategori (query pure, tanpa join).
  qty_out?: string | number | null;
  // date: kolom "hari kerja shift" - dipasangkan dengan shift, dipakai backend
  // buat filter (bukan scan_in_date/scan_out_date). Dikirim di kedua kategori.
  date?: string | null;
  shift: string | number | null;
  scan_in_date: string | null;
  scan_in_user: string | null;
  scan_out_date: string | null;
  scan_out_user: string | null;
  [key: string]: unknown;
}

export interface ScanHistoryTable {
  items: ScanHistoryItem[];
}

export interface ScanHistoryDateFilter {
  date_from: string | null;
  shift_start: number | string | null;
  date_to: string | null;
  shift_end: number | string | null;
}

export interface ScanHistoryIFPPState {
  scanFilter: ScanMode;
  scanData: ScanHistoryItem[];
  table: ScanHistoryTable;
  dateFilter: ScanHistoryDateFilter;
}