export interface ReportKanbanStampingState {
  line_id: string;
  patan: string;
  permissions: {
    create: boolean;
  };
  table_kanban: TableKanbanItem;
  params: any;
  datatables: DataTable;
  datatablesIncomplete: DataTableIncomplete;
  data: {
    dashboard: DashboardItem[];
    chart: ChartItem[];
    detail: DetailItem[];
  };
  dialogKBN: DialogKBNState;
  dialog: DialogState;
  filter: {
    period: string;
  };
  formData: {
    period: string;
    date: string;
    stock_awal: number;
    part_number: string;
  };
  tipeData: string[];
  detail: any[];
}

export interface TableKanbanItem {
  items: any[];
}

export interface DataTableHeader {
  title: string;
  items: string;
  align?: "start" | "center" | "end";
  sortable?: boolean;
  filterable?: boolean;
}

export interface DataTableItem {
  MATNR: string
  line_id: string
  ZQTY_LKH: number
  ZQTY_SAP: number
  GAP: number
  total_sap: number
  date: string;
}

export interface DataTableItemIncomplete{
  part_number: string
  line_id: string
  gap: number
};

export interface DataTable {
  headers: DataTableHeader[];
  items: DataTableItem[]; 
  filters: Record<string, string>;
}

export interface DataTableIncomplete {
  headers: DataTableHeader[];
  items: DataTableItemIncomplete[];
  filters: Record<string, string>;
}

export interface DialogKBNState {
  filter: boolean;
  datePicker: boolean;
  datePickerPeriod: boolean;
  detail: boolean;
}

export interface DialogState {
  filter: boolean;
  datePicker: boolean;
  datePickerPeriod: boolean;
  detail: boolean;
}

export interface FilterState {
  period: string | {
    start: string;
    end: string;
  }
}

export interface ChartItem {
  part_number: string;
  line_id: string;
  act_lkh: number;
  act_sap: number;
}

export interface DashboardItem {
  part_number: string;
  line_id: string;
  gap: number;
  percentage: number;
  type: string;
}

export interface DetailItem {
  part_number: string;
  date: string;
  line_id: string;
  shift: string | number;
  patan: string;
  lkh: number;
  sap: number;
  gap: number;
  percentage: number;
  keterangan_sap: string;
}
