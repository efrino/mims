export interface GoodsItem {
  code_material: string;
  material_description: string;
  satuan: string;
  pcs_day: string;
  stok: string;
  strength: string;
  lokasi: string;
  user_create: string;
  create_date: string;
  user_update: string;
  update_date: string;
}

export interface GoodsFilter {
  period: string;
  year: string;
  inventaris: string;
  category: string;
}

export interface GoodsFormData {
  code_material: string;
  material_description: string;
  lokasi: string;
  satuan: string;
  pcs_day: string;
  photo?: File;
  photoPreview?: string;
}

export interface GoodsDialog {
  form: boolean;
  detail: boolean;
  masterData: boolean;
  delete: boolean;
}

export interface DatatablesFilters {
  code_material: string;
  material_description: string;
  lokasi: string;
  satuan: string;
  pcs_day: string;
}

export interface Datatables {
  items: GoodsItem[];
  filters: DatatablesFilters;
}

export interface DeleteData {
  code_material: string;
  material_description: string;
}

export type InventarisType = 'CONSUMABLE' | 'SPARE_PART' | 'TOOL';

export interface ListData {
  inventaris: InventarisType[];
}

export interface GoodsState {
  dataTable: GoodsItem[];
  filter: GoodsFilter;
  formDataIncoming: GoodsFormData;
  dialog: GoodsDialog;
  action: 'Create' | 'Edit';
  urlPreview: string | null;
  judulMasterData: string;
  datatables: Datatables;
  datatablesRundown: Datatables;
  list: ListData;
  deleteData: DeleteData;
  isDeleting: boolean;
}