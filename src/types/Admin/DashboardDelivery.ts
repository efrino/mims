export interface DeliveryPlanActualItem {
  date: string;
  customer: string;
  plan: string | number;
  actual: string | number;
}

export interface DashboardDeliveryCard {
  src: string;
  title: string;
  link: string;
  customClass: string;
  plan: number;
  actual: number;
  diff: number;
  pct: number;
  customers: string[]; 
}

export interface CustomerMapping {
  displayName: string;
  apiNames: string[];
  src: string;
  link: string;
  customClass: string;
}

export interface DeliveryCycleDetail {
  VBELN: string;
  CUSTOMER: string;
  VDATU: number;
  ETA: string;
  ETD: string;
  VBTYP: string;
  BSTNK: string;
  KUNNR: string;
  CYCLE: number;
  TRIP: string | null;
  LFSTK: string;
  PLAN: number;
  ACT: number;
  ERZET: string;
  ERDAT: string;
  BSTDK: string;
  update_date: string;
  MATNR: string;
  KWMENG: number;
  LFIMG: number;
  BISMT: string;
}

export interface DeliveryCycle {
  VDATU: number;
  VBELN: string;
  CYCLE: number;
  ETD: string;
  PLAN: number;
  ACT: number;
  customer: string;
  details: DeliveryCycleDetail[];
}

export interface CycleHierarchy {
  [customer: string]: DeliveryCycle[];
}

export interface ConvertedDeliveryCycle {
  time: string;
  c: number | null;
  p: number | null;
  ad: number | null;
  i: number | null;
  details: DetailsSaleOrder[];
}

export interface ConvertedDeliveryCustomer {
  name: string;
  slots: ConvertedDeliveryCycle[];
}

export interface DetailsSaleOrder {
  vbeln: string;
  vdatu: string;
  bstnk: string;
  etd: string;
  eta: string;
  plan: number;
  act: number;
  items: any[];

}