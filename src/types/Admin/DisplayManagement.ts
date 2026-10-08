export enum DeviceType {
  WINDOWS = "Windows",
  RASPBERRY_PI = "Raspberry PI"
}

export enum ActionType {
  ADD = "Add",
  EDIT = "Edit"
}

export enum MoveDirection {
  UP = "up",
  DOWN = "down"
}

export interface Display {
  id: string;
  title: string;
  location: string;
  device: DeviceType | string;
  ip_address: string;
  short_link: string;
}

export interface DisplayAndon {
  id: string;
  andon_id: string;
  display_id?: string;
  title_andon: string;
  link?: string;
  parameter: string;
  duration: number;
  urut?: number;

  is_line?: string;
  is_group?: string;
  is_running_text?: string;
  is_tipe?: string;
  is_period?: string;
  is_cycle?: string;
  photo?: string;
  nama_andon: string;
  nama_department?: string;
}

export interface DisplayFormData {
  id: string;
  title: string;
  location: string;
  device: string;
  ip_address: string;
  short_link: string;
}

export interface DisplayAndonFormData {
  id: string;
  andon_id: string;
  title_andon: string;
  duration: number;
  parameter: string;
  link?: string;
}

export interface DatatableHeader {
  text: string;
  align: "left" | "center" | "right";
  value: string;
  sortable?: boolean;
}

export interface DatatableFilters {
  id: string[];
  title: string[];
  location: string[];
  device: string[];
  ip_address: string[];
  short_link: string[];
}

export interface DatatableListFilters {
  title_andon: string[];
  link: string[];
  duration: string[];
}

export interface Datatables {
  headers: DatatableHeader[];
  items: Display[];
  filters: DatatableFilters;
}

export interface DatatablesList {
  headers: DatatableHeader[];
  items: DisplayAndon[];
  filters: DatatableListFilters;
}

export interface DialogState {
  formData: boolean;
  formListAndon: boolean;
  formDataGroupAndon: boolean;
}

export interface Permissions {
  create: boolean;
}

export interface DeleteAndonPayload {
  id: string;
}

export interface MoveAndonPayload {
  urut: number;
  id: string;
  move: MoveDirection;
}

export interface UpdateAndonGroupPayload extends DisplayAndonFormData {
  display_id: string;
}

export interface ApiResponse<T = any> {
  status: number;
  message?: string;
  data: T;
}

export interface DisplayManagementState {
  action: ActionType;
  apiUrl: string;
  permissions: Permissions;
  datatables: Datatables;
  datatablesList: DatatablesList;
  table: {
    items: DisplayAndon[];
  };
  form: string[];
  dialog: DialogState;
  formData: DisplayFormData;
  formDataAndon: DisplayAndonFormData;
  list: {
    device: DeviceType[];
  };
  listAndon: DisplayAndon[];
}