export interface MasterIncomingItem {
  ZPERIOD: string;
  ZMATL: string;
  ZDESK: string;
  ZPLAN: string;
  ZQTY: string;
  ZSATUAN: string;
  ZASPEK: string;
  created_at: string;
  user_created: string;
  updated_at: string;
  user_updated: string;
}

export interface IncomingApiResponse {
  data: MasterIncomingItem[];
}

export interface IncomingFilter {
  inventaris: string;
  department: string;
  period: string;
  date: string;
}

export interface IncomingFormData {
  ZMATL: string;
  ZDESK: string;
  ZPLAN: string;
  ZQTY: string;
  ZSATUAN: string;
  ZASPEK: string;
}

export type IncomingFormKey = keyof IncomingFormData;

export interface filterDate {
  clock: string; // "2025-12-19 17:38"
  date: string; // "2025-12-19"
  day: string; // "19"
  hour: string; // "17:38"
  period: string; // "2025-12"
  period2: string; // "202512"
  shift: number; // 1
  month?: string | null;
  year?: string | null;
}
