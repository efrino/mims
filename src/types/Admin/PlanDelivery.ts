export interface PlanDeliveryItem {
  yearmonth: string;
  customer_code: string;
  customer: string;
  model: string | null;
  total: number;
  t1: number;
  t2: number; 
  t3: number;
  t4: number;
  t5: number;
  t6: number;
  t7: number;
  t8: number;
  t9: number;
  t10: number;
  t11: number;
  t12: number;
  t13: number;
  t14: number;
  t15: number;
  t16: number;
  t17: number;
  t18: number;
  t19: number;
  t20: number;
  t21: number;
  t22: number;
  t23: number;
  t24: number;
  t25: number;
  t26: number;
  t27: number;
  t28: number;
  t29: number;
  t30: number;
  t31: number;
}

export interface PlanDeliveryResponse {
  mdfo: PlanDeliveryItem[];
  sales_order: PlanDeliveryItem[];
}

export interface PlanDeliveryState {
  mdfo: PlanDeliveryItem[];
  salesOrder: PlanDeliveryItem[];
  loading: boolean;
  error: string | null;
}