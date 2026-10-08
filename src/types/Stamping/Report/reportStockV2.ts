// types.ts — Stock IFP v2 (in dari achievement stamping, out dari welding_achievement_v2)

export interface FilterDateStateV2 {
  period: string;  // "2026-07"
  period2: string; // "202607"
  month: string;
  year: string;
}

export interface FormIfpV2Item {
  stock_awal: number;
  part_number: string;
}

export interface DataTableIFPV2Row {
  part_number: string;
  stock_awal: number;
  [key: string]: string | number;
}

export interface DataTableIFPV2Item {
  headers: {
    title: string;
    key: string;
    align?: "start" | "center" | "end";
  }[];
  items: DataTableIFPV2Row[];
  filters: Record<string, string>;
}

// Compare achievement Stamping (display_achievement_new) vs master ms_welding
export interface CompareMasterRow {
  part_number: string;
  total_qty: number;
  last_date: string;
  ms_category: string | null;
  ms_area: string | null;
  status: "matched" | "missing";
}
