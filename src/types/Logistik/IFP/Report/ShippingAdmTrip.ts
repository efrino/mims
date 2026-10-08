export interface AdmTripParams {
  plant?: string | null;
  trip?: number | null;
  route?: string | null;
  date?: string | null;
}

export interface AdmTripItem {
  trip?: number | string;
  qty?: number | string;
  is_scan?: number | string;
  plan?: string;
  route?: string;
  etd?: string;
  job_number?: string;
  part_number?: string;
  project?: string;
  jenis?: string;
  cycle?: string | number;
  barcode?: string;
  no_urut?: string | number;
  [key: string]: any;
}

export interface AdmTripMappedItem extends AdmTripItem {
  trip_num: number;
  qty_num: number;
  is_scan_num: number;
  plan: string;
}

export interface AdmTripResult {
  dataTripAll: AdmTripMappedItem[];
  tripOptions: number[];
  routeOptions: string[];
}