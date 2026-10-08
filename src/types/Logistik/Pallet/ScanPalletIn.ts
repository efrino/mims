export interface PalletLogItem {
  id: string;
  no_rfid: string;
  type: string;
  no_pallet: string;
  status: 'IN' | 'OUT' | 'EMPTY';
  category: string;
  customer: string | null;
  id_label: string | null;
  created_at: string;
  updated_at: string;
}

export interface PalletLogFormData {
  ms_pallet_id: string;
  no_rfid: string;
  type: string;
  no_pallet: string;
  status: 'IN' | 'OUT' | '';
  category: string;
  customer: string;
  id_label: string;
}

export interface PalletLogDialog {
  scan: boolean;
  detail: boolean;
}

export interface PalletLogDatatablesFilters {
  no_rfid: string;
  status: string;
  category: string;
  customer: string;
}

export interface PalletLogDatatables {
  items: PalletLogItem[];
  filters: PalletLogDatatablesFilters;
}

export interface PalletLogState {
  dataTable: PalletLogItem[];
  formData: PalletLogFormData;
  dialog: PalletLogDialog;
  datatables: PalletLogDatatables;
  isSubmitting: boolean;
}