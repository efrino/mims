export interface Customer {
  id: number | string;
  kode_customer: string;
  nama: string;
  nama_alias?: string | null;
  kode_zstt?: string | null;
  induk_customer: number | null;
  created_by?: string;
  updated_by?: string;
  deleted_by?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}

export interface CustomerCreatePayload {
  kode_customer: string;
  nama: string;
  nama_alias: string | null;
  kode_zstt: string | null;
  induk_customer: number | null;
  created_by: string;
}

export interface CustomerUpdatePayload {
  id: number | string;
  kode_customer: string;
  nama: string;
  nama_alias: string | null;
  kode_zstt: string | null;
  induk_customer: number | null;
  updated_by: string;
}

export interface CustomerDeletePayload {
  id: number | string;
  deleted_by: string;
}

export interface ApiResponse<T = unknown> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
}