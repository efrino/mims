export interface PrintBarcodeFormData {
  type: string;
  dateBuild: string;
  jarak: number;
}

export interface PrintBarcodeFormRepeat {
  type: string;
  from: number;
  to: number;
}

export interface PrintBarcodeItem {
  type: string;
  jarak: number;
  create_date: string;
  update_date?: string;
  barcode?: string;
}

export interface PrintBarcodeFilter {
  create_date: string;
}

export interface PrintBarcodeFilter1 {
  update_date: string;
}

export interface PrintBarcodePermissions {
  create: boolean;
}

export interface PrintBarcodeDialog {
  datePicker: boolean;
  datePickerForm: boolean;
  filter: boolean;
  upload: boolean;
  form: boolean;
}

export interface PrintBarcodeList {
  type: Array<{ text: string; value: string } | string>;
}

export interface PrintBarcodeState {
  apiUrl: string;
  permissions: PrintBarcodePermissions;
  error: number;
  formData: PrintBarcodeFormData;
  formRepeat: PrintBarcodeFormRepeat;
  form: string[];
  table: {
    items: PrintBarcodeItem[];
  };
  filter: PrintBarcodeFilter;
  filter1: PrintBarcodeFilter1;
  list: PrintBarcodeList;
  dialog: PrintBarcodeDialog;
}