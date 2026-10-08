export interface FilterDate {
  year: string;
  month: string;
}

export interface TableFilters {
  part_number: string;
  line_id: string;
}

export interface MdfoData {
  [key: string]: string;
}

export interface DnData {
  [key: string]: string;
}

export interface ProdWeldingData {
  [key: string]: string;
}

export interface LotData {
  [key: string]: string;
}

export interface ActData {
  [key: string]: string;
}

export interface MonitoringItem {
  part_number: string;
  job_number: string;
  part_finish: string;
  line_id: string;
  stock_awal: string;
  type_part: 'LH' | 'RH';
  part_name?: string;
  mdfo: MdfoData;
  dn: DnData;
  prod_welding: ProdWeldingData;
  lot_lh: LotData;
  lot_rh: LotData;
  act_lh: ActData;
  act_rh: ActData;
}

export interface MasterDataForm {
  part_number: string;
  job_number: string;
  part_finish: string;
  line_id: string;
  stock_awal: string;
  part_name: string;
}

export interface MonitoringState {
  filterDate: FilterDate;
  items: MonitoringItem[];
  loading: boolean;
  error: string | null;
  filters: TableFilters;
}

export interface UploadDataItem {
  [key: string]: string | number;
}

export interface UploadParams {
  period: string;
  type_data: string;
  items: UploadDataItem[];
}