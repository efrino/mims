export interface PalletItem {
  id: string;
  pallet: string;
}

export interface PalletFormData {
  pallet: string;
}

export interface PalletDialog {
  form: boolean;
  detail: boolean;
  delete: boolean;
}

export interface DatatablesFilters {
  pallet: string;
}

export interface Datatables {
  items: PalletItem[];
  filters: DatatablesFilters;
}
export interface DeleteData {
  id: string;
  pallet: string;
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
