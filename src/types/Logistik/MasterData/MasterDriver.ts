export interface DriverItem {
  id: string;
  nik: string;
  nama_driver: string;
  nama_lp: string;
}

export interface DriverFormData {
  nik: string;
  nama_driver: string;
  nama_lp: string;
}

export interface DriverDialog {
  form: boolean;
  detail: boolean;
  delete: boolean;
}

export interface DatatablesFilters {
  nik: string;
  nama_driver: string;
  nama_lp: string;
}

export interface Datatables {
  items: DriverItem[];
  filters: DatatablesFilters;
}
export interface DeleteData {
  id: string;
  nik: string;
}

export interface DriverState {
  dataTable: DriverItem[];
  formData: DriverFormData;
  dialog: DriverDialog;
  action: 'Create' | 'Edit';
  editId: string | null;
  datatables: Datatables;
  deleteData: DeleteData;
  isDeleting: boolean;
  uploading: boolean;
}
