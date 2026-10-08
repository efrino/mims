export interface Material {
  MATNR: string;
  MAKTX: string;
  BISMT: string;
  project_id: string;
  SORTL: string;
  ZPLNPH: number;
  LABST: number;
  ZSTRENGTH: number;
  DEST1?: string;
  DEST2?: string;
  DEST3?: string;
  customer_1?: string;
  customer_2?: string;
  strength: string;
  part_number: string;
  job_number: string;
  line_process: string;
  plan_day: string;
  stock: string;
}

export interface TableHeader {
  text: string;
  align?: string;
  value: string;
  filter?: (value: unknown) => boolean;
}

export interface RundownState {
  materials: Material[];
  isLoading: boolean;
  deleteDialog: boolean;
  selectedType: 'IFPP-INHOUSE' | 'IFPP-OUTHOUSE';
  customers: string[];
  destination: string;
  reportUrl: string;
}

export interface ApiResponse<T> {
  success: boolean;
  messages: string;
  data?: T;
}

export interface UploadParams {
  location: string;
}

export interface DeleteParams {
  location: string;
}