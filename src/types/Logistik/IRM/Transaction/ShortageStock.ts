export interface FilterDate {
  start: string;
  end: string;
}

export interface ShortageStockTable {
  create_at: string;
  date: string;
  line_id: string;
  part_number: string;
  part_number_rm: string;
  qty_plan: string;
  qty_plan_rm: string;
  shift: string;
  stock_sap: string;
  user_create: string;
}
