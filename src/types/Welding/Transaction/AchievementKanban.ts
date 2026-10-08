export interface lines {
  line_id: string | null;
  detail: lineDetail[];
  total_lkh: number | null;
  total_sap: number | null;
};

export interface lineDetail {
  ACT_SHIFT1: string | null;
  ACT_SHIFT2: string | null;
  NG_SHIFT1: string | null;
  NG_SHIFT2: string | null;
  PATAN_SHIFT1: string;
  PATAN_SHIFT2: string;
  PLAN_SHIFT1: string;
  PLAN_SHIFT2: string;
  MATNR: string;
  job_number: string;
  line: string;
  model: string;
  ZDATE: string;
  ZQTY_SAP: string;
  ZQTY_SAP_ZSHIFT1: string;
  ZQTY_SAP_ZSHIFT2: string;
  total_lkh: number | null;
  total_sap: number | null;
}

export interface filterDate {
  clock: string;   // "2025-12-19 17:38"
  date: string;    // "2025-12-19"
  day: string;     // "19"
  hour: string;    // "17:38"
  period: string;  // "2025-12"
  period2: string; // "202512"
  shift: number;   // 1
  month?: string | null;
  year?: string | null;
}