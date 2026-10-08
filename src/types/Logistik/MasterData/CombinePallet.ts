export interface PalletItem {
  id: string;
  no_rfid: string;
  no_pallet: string;
  name: string;
  type: string;
  status: 'IN' | 'OUT';
  id_label: string | null;
  created_at: string;
  updated_at: string;
  is_active: string;
  category: string;
  customer: string;
}

export interface PalletFormData {
  no_rfid: string;
  no_pallet: string;
  name: string;
  type: string;
  is_active?: string;
  category?: string;
  customer?: string;
}

export interface PalletDialog {
  form: boolean;
  detail: boolean;
  delete: boolean;
}

export interface DatatablesFilters {
  no_rfid: string;
  no_pallet: string;
  name: string;
  type: string;
  status: string;
  is_active: string;
  category: string;
  customer: string;
}

export interface Datatables {
  items: PalletItem[];
  filters: DatatablesFilters;
}
export interface DeleteData {
  id: string;
  no_rfid: string;
  no_pallet: string;
  type: string;
}

export interface CombineDriverItem {
  id: string;
  no_rfid: string;
  name: string;
  no_pallet: string;
  type: string;
  category: string;
  customer: string;
  status: string;
  id_label: string;
  is_active: string;
  updated_at: string;
  log_id: number;
  nik: string | null;
  nama_driver: string | null;
  nama_lp: string | null;
  no_polisi: string | null;
  log_created_at: string;
  log_updated_at: string;
}

export interface PalletState {
  dataTable: PalletItem[];
  formData: PalletFormData;
  dialog: PalletDialog;
  action: 'Create' | 'Edit';
  editId: string | null;
  datatables: Datatables;
  deleteData: DeleteData;
  isDeleting: boolean;
  uploading: boolean;
}
