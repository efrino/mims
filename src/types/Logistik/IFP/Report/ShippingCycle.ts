export interface ShippingCycleParams {
  cycle?: string | number | null;
  customer: string;
  tanggal?: string | null;
}

export interface ShippingCycleItem {
  CUSTOMER?: string;
  CYCLE?: string | number;
  ETD?: string;
  MATNR?: string;
  BISMT?: string;
  BSTDK?: string;
  VDATU?: string;
  project?: string;
  KWMENG?: string | number;
  total_qty_scan?: string | number;
  [key: string]: any;
}

export interface ShippingCycleResponse {
  data: ShippingCycleItem[];
  [key: string]: any;
}