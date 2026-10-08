export interface ReportLKH {
  date: string;
  insert_date: string | null;
  update_date: string | null;
  shift: string;
  line: string;
  model: string;
  job_number: string;
  part_number: string;
  part_name: string;
  lotsize: string;
  qty_kbn: string;
  qty: string | null;
  qty_sap: string;
  qty_ng: string;
  qty_shift_1: string;
  qty_shift_2: string;
  plan: string;
  plan_shift_1: string;
  plan_shift_2: string;
  ng_shift_1: string;
  ng_shift_2: string;
}

export interface TableItem {
  partNumber: string;
  jobNumber: string;
  lotSize: number;
  qtyKbn: number;

  shift1: ShiftData;
  shift2: ShiftData;

  totalProduction: number;
  totalBalance: number;
  totalPercentage: number | "-";
  totalNg: number;
}

export interface ShiftData {
  plan: number;
  actual: number;
  balance: number;
  percentage: number | "-";
  ng: number;
}
