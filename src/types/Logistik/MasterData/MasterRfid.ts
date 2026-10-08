export interface RfidItem {
  id: string;
  no_rfid: string;
}

export interface RfidFormData {
  no_rfid: string;
}

export interface RfidDialog {
  form: boolean;
  detail: boolean;
  delete: boolean;
}

export interface DatatablesFilters {
  no_rfid: string;
}

export interface Datatables {
  items: RfidItem[];
  filters: DatatablesFilters;
}
export interface DeleteData {
  id: string;
  no_rfid: string;
}

export interface RfidState {
  dataTable: RfidItem[];
  formData: RfidFormData;
  dialog: RfidDialog;
  action: 'Create' | 'Edit';
  editId: string | null;
  datatables: Datatables;
  deleteData: DeleteData;
  isDeleting: boolean;
  uploading: boolean;
}
