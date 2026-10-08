// types.ts

export interface DialogState {
  filter: boolean;
  datePicker: boolean;
  datePickerPeriod: boolean;
  form: boolean;
  formIfp: boolean;
  datePickerForm: boolean;
  dateDaily: boolean;
  upload: boolean;
  detail: boolean;
}

export interface FilterState {
  period: string;
}

export interface FilterDateState {
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

export interface FormDataItem {
  period: string;
  date: string;
  stock_awal: number;
  part_number: string;
  [key: string]: string | number | undefined;
}

export interface FormIfpItem {
  stock_awal: number;
  part_number: string;
}

export interface FormUploadItem {
  period: string;
  job_number: string;
  part_number: string;
  dn: string;
  
  date_01: string;
  date_02: string;
  date_03: string;
  date_04: string;
  date_05: string;
  date_06: string;
  date_07: string;
  date_08: string;
  date_09: string;
  date_10: string;
  date_11: string;
  date_12: string;
  date_13: string;
  date_14: string;
  date_15: string;
  date_16: string;
  date_17: string;
  date_18: string;
  date_19: string;
  date_20: string;
  date_21: string;
  date_22: string;
  date_23: string;
  date_24: string;
  date_25: string;
  date_26: string;
  date_27: string;
  date_28: string;
  date_29: string;
  date_30: string;
  date_31: string;

  total: string;
}

export interface TableStockItem {
  items: any[];
}

export interface DataTableItem {
  headers: {
    title: string;
    key: string;
    align?: "start" | "center" | "end";
  }[];
  items: any[];
  filters: Record<string, string>;
}

export interface DataTablePCSItem {
  headers: {
    title: string;
    key: string;
    align?: "start" | "center" | "end";
  }[];
  items: any[];
  filters: Record<string, string>;
}

export interface DataTableIFPItem {
  headers: {
    title: string;
    key: string;
    align?: "start" | "center" | "end";
  }[];
  items: any[];
  filters: Record<string, string>;
}

export interface DataTableUploadItem {
  search: string;
  headers: {
    title: string;
    key: string;
    align?: "start" | "center" | "end";
  }[];
  items: DataTableUploadRow[];
}

export interface DataTableUploadRow {
  part_number: string;
  job_number: string;
  dn: string;

  date_01: string;
  date_02: string;
  date_03: string;
  date_04: string;
  date_05: string;
  date_06: string;
  date_07: string;
  date_08: string;
  date_09: string;
  date_10: string;
  date_11: string;
  date_12: string;
  date_13: string;
  date_14: string;
  date_15: string;
  date_16: string;
  date_17: string;
  date_18: string;
  date_19: string;
  date_20: string;
  date_21: string;
  date_22: string;
  date_23: string;
  date_24: string;
  date_25: string;
  date_26: string;
  date_27: string;
  date_28: string;
  date_29: string;
  date_30: string;
  date_31: string;

  total: string;

  ERROR: string;
  ERROR_UPLOAD: string;
}

export interface ReportStockStoreItem {
  permissions: {
    create: boolean;
  };
  dialog: DialogState;
  filter: FilterState;
  filterDate: FilterDateState;
  action: string;
  form: string[];
  formData: FormDataItem;
  formIfp: FormIfpItem;
  formUpload: FormUploadItem;
  params: any;
  table_stock: TableStockItem;
  datatables: DataTableItem;
  datatablesPCS: DataTablePCSItem;
  datatablesIFP: DataTableIFPItem;
  datatablesUpload: DataTableUploadItem;
}
