export interface RundownItem {
  ID: string;
  MATNR: string;
  MAKTX: string;
  PATAN: string | null;
  PROCESS: string;
  MTART: string;
  BISMT: string;
  LABST: string;
  project_id: string;
  ZPLNPH: string;
  ZMAJPH: string;
  EXTWG: string | null;
  ZSTRENGTH: string;
  ZLOC: string | null;
  LGORT: string;
  BEHMG: string;
  ZQTY_CTR: string | null;
  SORTL: string;
  ZROUTING: string;
  CUSTOMER: string | null;
  DEST1: string;
  DEST2: string;
  DEST3: string;
  REMARK: string;
  type: string | null;
  created_at: string;
  updated_at: string;
  runout: string;
}

export interface ParamsFilter {
  start?: string;
  end?: string;
  type?: string;
  data?: string;
}
