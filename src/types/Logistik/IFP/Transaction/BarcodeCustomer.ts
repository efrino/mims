export interface BarcodeDn {
  id: string;
  customer: string;
  plant: string | null;
  part_no: string;
  qty: string;
  qty_total: string;
  cycle: string | null;
  delivery_date: string;
  barcode: string;
  is_scan: string;
  total_scan: string;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
}

export interface BarcodeDnFilter {
  customer?: string | null;
  start_date?: string | null;
  end_date?: string | null;
}

export type UploadType = 'HMMI' | 'MMKI' | 'ADM';

export interface ApiResponse<T = unknown> {
  status: boolean | 'success' | 'error';
  message?: string;
  data?: T;
}

export interface UploadBarcodePayload {
  file: File;
  type: UploadType;
  password_excel?: string | null;
}

export interface UploadResponse {
  status: boolean | 'success' | 'error';
  message: string;
}