/* =========================================================
 * STATUS DAN KONSTANTA DASAR
 * ======================================================= */

export type ApiStatus = 'success' | 'error' | 'warning';

export type AdmPlantCode = 'D101' | 'D104' | 'D105';

export type MdfoHeaderRowMode = 'single' | 'first' | 'second';

export type MdfoDataMode = 'standard' | 'tmmin' | 'ntc' | 'gaya' | 'dpm' | 'fti';

export type TmminSupplierCode = 'T034' | 'TMAJ';

export type MdfoRevisionStrategy = 'SOURCE' | 'SEQUENTIAL';

export type MdfoRevisionDetectionResponse = {
  status: ApiStatus;
  message?: string;
  customer: string;
  periode: string;
  strategy: MdfoRevisionStrategy;
  source_revision: number | null;
  revision: number | null;
  existing_revisions: number[];
  can_upload: boolean;
  warning: string;
  confirmation_message: string;
};

/* =========================================================
 * KEY MDFO ADM
 * ======================================================= */

export type MdfoDayKey =
  | 'd01' | 'd02' | 'd03' | 'd04' | 'd05' | 'd06' | 'd07'
  | 'd08' | 'd09' | 'd10' | 'd11' | 'd12' | 'd13' | 'd14'
  | 'd15' | 'd16' | 'd17' | 'd18' | 'd19' | 'd20' | 'd21'
  | 'd22' | 'd23' | 'd24' | 'd25' | 'd26' | 'd27' | 'd28'
  | 'd29' | 'd30' | 'd31';

export type MdfoBaseKey =
  | 'periode'
  | 'partNo'
  | 'uniqueNo'
  | 'revision'
  | 'partName'
  | 'qtyKanban'
  | 'poNumber'
  | 'poQty'
  | 'n'
  | 'n1'
  | 'n2'
  | 'n3';

export type MdfoCalculatedKey = 'rowTotal';

/*
 * TMMIN dan NTC memakai kolom yang berbeda dari MDFO ADM.
 * MdfoKey tetap string agar popup filter yang sama dapat dipakai.
 */
export type MdfoKey = string;

/* =========================================================
 * ROW DAN KOLOM ADM
 * ======================================================= */

export type MdfoRow = {
  _id?: number;
  _batchId?: number;
  _customer?: string;
  periode: string;
  partNo: string;
  uniqueNo: string;
  revision: string;
  partName: string;
  qtyKanban: string;
  poNumber: string;
  poQty: string;
  n: string;
  n1: string;
  n2: string;
  n3: string;
  rowTotal?: string;
  [key: string]: string | number | undefined;
} & Record<MdfoDayKey, string>;

export type MdfoColumnGroup = 'fixed' | 'forecast' | 'day';

export type MdfoColumn = {
  key: MdfoKey;
  label: string;
  width: string;
  group: MdfoColumnGroup;
};

/* =========================================================
 * RAW MDFO TMMIN
 * ======================================================= */

export type TmminMdfoValue = string | number | null;

export type TmminMdfoRow = Record<string, TmminMdfoValue> & {
  _id?: number;
  _batchId?: number;
  _sourceFile?: string;
  _sourceRow?: number;
  _periode?: string;
  _revision?: string;
  _supplierCode?: TmminSupplierCode | string;
};

export type TmminMdfoColumn = {
  key: string;
  label: string;
  source_header?: string;
  source_col?: number;
  excel_index?: number;
  width: string;
  numeric: boolean;
  total: boolean;
  group?: 'fixed';
};

/* =========================================================
 * RAW MDFO NTC
 * ======================================================= */

export type NtcMdfoKey =
  | 'no'
  | 'kbnCode'
  | 'partNo'
  | 'partNoFinal'
  | 'processOrder'
  | 'pcsM'
  | 'pcsD'
  | 'boxType'
  | 'qtyBox'
  | 'kanbanDay'
  | 'forecast1'
  | 'forecast2'
  | 'forecast3'
  | 'model'
  | 'plant'
  | 'plantDesc'
  | 'vendorCode'
  | 'vendorName'
  | 'materialId'
  | 'description'
  | 'partNumber'
  | 'qty'
  | 'n1'
  | 'n2'
  | 'n3'
  | 'poNumber'
  | 'partName'
  | 'n'
  | 'poDate'
  | 'deliveryDate';

export type NtcMdfoRow = Record<string, string | number | null | undefined> & {
  _id?: number;
  _batchId?: number;
  _sourceFile?: string;
  _sourceSheet?: string;
  _sourceRow?: number;
  _sourceOrder?: number;
  _periode?: string;
  _revision?: string;
  no: string;
  kbnCode: string;
  partNo: string;
  partNoFinal: string;
  processOrder: string;
  pcsM: string;
  pcsD: string;
  boxType: string;
  qtyBox: string;
  kanbanDay: string;
  forecast1: string;
  forecast2: string;
  forecast3: string;
  model: string;
};

export type NtcMdfoColumn = {
  key: NtcMdfoKey;
  label: string;
  width: string;
  numeric: boolean;
  total: boolean;
  group?: 'fixed' | 'forecast';
};

export type NtcMdfoTotals = Partial<Record<NtcMdfoKey, number>>;

export type NtcMdfoMonthHeaders = {
  forecast1: string;
  forecast2: string;
  forecast3: string;
};



/* =========================================================
 * RAW MDFO GAYA MOTOR
 * ======================================================= */

export type GayaMdfoRow = Record<string, string | number | null | undefined> & {
  _id?: number;
  _batchId?: number;
  _sourceFile?: string;
  _sourceRow?: number;
  _sourceFileOrder?: number;
  _periode?: string;
  _revision?: string;
  no: string;
  partNoRaw: string;
  partNo: string;
  noJob: string;
  partName: string;
  summaryPo: string;
  dailyForecast: string;
  n1: string;
  n2: string;
  n3: string;
  rowTotal: string;
};

export type GayaMdfoColumn = {
  key: string;
  label: string;
  weekday?: string;
  weekend?: boolean;
  width: string;
  numeric: boolean;
  total: boolean;
  group?: 'fixed' | 'day' | 'total';
};

export type GayaMdfoTotals = Record<string, number>;

/* =========================================================
 * RAW MDFO DPM
 * ======================================================= */

export type DpmMdfoRow = Record<string, string | number | null | undefined> & {
  _id?: number;
  _batchId?: number;
  _sourceFile?: string;
  _sourceRow?: number;
  _periode?: string;
  _revision?: string;
  plant: string;
  plantDesc: string;
  vendorCode: string;
  vendorName: string;
  materialId: string;
  description: string;
  partNumber: string;
  qty: string;
  n1: string;
  n2: string;
  n3: string;
  poNumber: string;
};

export type DpmMdfoColumn = {
  key: string;
  label: string;
  width: string;
  numeric: boolean;
  total: boolean;
};

export type DpmPreviewWarning = {
  source_file: string;
  material_id: string;
  description: string;
};

export type DpmPreviewSummary = {
  customer: 'DPM';
  period: string;
  periods: string[];
  plant: string;
  plant_desc: string;
  vendor_code: string;
  vendor_name: string;
  po_numbers: string[];
  total_pdf_files: number;
  total_rows: number;
  mapped_rows: number;
  unmapped_rows: number;
};

export type DpmPreviewForecast = {
  key: string;
  period: string;
  total: number;
};

export type MdfoDpmPreviewResponse = {
  status: 'success' | 'error';
  message?: string;
  data_mode: 'dpm';
  headers: string[];
  rows: Array<Array<string | number | null>>;
  summary: DpmPreviewSummary;
  forecast_summary: DpmPreviewForecast[];
  warnings: DpmPreviewWarning[];
};

/* =========================================================
 * RAW MDFO FTI
 * ======================================================= */

export type FtiPreviewMismatch = {
  type: 'missing_part' | 'part_name' | 'period' | string;
  part_no: string;
  pdf?: string;
  forecast?: string;
  schedule?: string;
  message: string;
};

export type FtiPreviewSummary = {
  customer: 'FTI' | 'MES';
  period: string;
  periods: string[];
  po_number: string;
  po_date: string;
  delivery_date: string;
  forecast_file: string;
  schedule_file: string;
  pdf_file: string;
  total_rows: number;
  total_files: number;
};

export type MdfoFtiPreviewResponse = {
  status: 'success' | 'error';
  message?: string;
  data_mode: 'fti';
  can_upload: boolean;
  headers: string[];
  rows: Array<Array<string | number | null>>;
  summary: FtiPreviewSummary;
  forecast_summary: DpmPreviewForecast[];
  mismatches: FtiPreviewMismatch[];
};

export type FtiPartOption = {
  part_no: string;
  part_name: string;
  required: boolean;
};

export type MdfoFtiPartNameResolveResponse = {
  status: 'success' | 'error';
  message?: string;
  found: boolean;
  part_no: string;
  part_name: string;
  source: string;
};

export type FtiManualRowPayload = {
  part_no: string;
  part_name: string;
  n_qty: number;
  n1_qty: number | null;
  n2_qty: number | null;
  n3_qty: number | null;
  po_number: string;
  po_date: string;
  delivery_date: string;
};



export type MesManualRowPayload = {
  part_no: string;
  part_name: string;
  n_qty: number;
  n1_qty: number | null;
  n2_qty: number | null;
  n3_qty: number | null;
  po_number: string;
  po_date: string;
  delivery_date: string;
};

export type MesZsttDailyRowPayload = {
  raw_id: number;
  part_no: string;
  daily: Partial<Record<MdfoDayKey, number | null>>;
};

export type MdfoMesZsttResponse = {
  status: ApiStatus;
  message: string;
  batch_id?: number;
  generation_success?: boolean;
  generation_error?: string;
  zstt_total_documents?: number;
  zstt_total_rows?: number;
  tracking_total_rows?: number;
  requires_manual_zstt?: boolean;
  zstt_pending?: boolean;
};

export type MdfoMesZsttDraftResponse = {
  status: ApiStatus;
  message?: string;
  batch_id?: number;
  period?: string;
  data?: NtcMdfoRow[];
};

export type MdfoForecastEditRow = {
  id: number;
  batch_id: number;
  customer: 'FTI' | 'MES';
  periode: string;
  revision: number;
  part_no: string;
  part_name: string;
  n_qty: number;
  n1_qty: number | null;
  n2_qty: number | null;
  n3_qty: number | null;
};

export type MdfoForecastEditResponse = {
  status: ApiStatus;
  message?: string;
  customer: 'FTI' | 'MES';
  periode: string;
  revision: number;
  total: number;
  rows: MdfoForecastEditRow[];
};

export type MdfoForecastUpdateRow = {
  id: number;
  n1_qty: number | null;
  n2_qty: number | null;
  n3_qty: number | null;
};

export type MdfoForecastUpdateResponse = {
  status: ApiStatus;
  message: string;
  customer: 'FTI' | 'MES';
  periode: string;
  revision: number;
  updated_rows: number;
  batch_ids: number[];
  quotation_total_rows: number;
  quotation_total_documents: number;
};

export type FtiManualSourceRow = {
  part_no: string;
  part_name: string;
  n1_qty: number | null;
  n2_qty: number | null;
  n3_qty: number | null;
  schedule_found: boolean;
  forecast_found: boolean;
};

export type MdfoFtiPartOptionsResponse = {
  status: 'success' | 'error';
  message?: string;
  data: FtiPartOption[];
};

export type MdfoFtiManualSourcePreviewResponse = {
  status: 'success' | 'error';
  message?: string;
  data_mode: 'fti';
  period: string;
  schedule_file: string;
  forecast_file: string;
  forecast_locked: boolean;
  rows: FtiManualSourceRow[];
  mismatches: FtiPreviewMismatch[];
};


/* =========================================================
 * FILTER
 * ======================================================= */

export type MdfoFilterOptions = {
  customers: string[];
  periods: string[];
  revisions: string[];
};

export type MdfoActiveFilters = {
  customer: string;
  periode: string;
  revision: string;
};

export type MdfoDayHeaders = Partial<Record<MdfoDayKey, string>>;

export type MdfoColumnFilters = Partial<Record<string, string[]>>;

/* =========================================================
 * UPLOAD
 * ======================================================= */

export type MdfoCustomerValidationError = {
  source_file: string;
  selected_customer: string;
  expected_code: string;
  detected_code: string;
  reg_no: string;
  message: string;
};

export type MdfoUploadResponse = {
  status: ApiStatus;
  message: string;

  error_code?: string;
  validation_errors?: MdfoCustomerValidationError[];
  total_validation_errors?: number;

  batch_id?: number;
  total_files?: number;
  successful_files?: number;
  total_rows?: number;
  errors?: string[];

  generation_success?: boolean;
  generation_skipped?: boolean;
  generation_error?: string;

  quotation_total_documents?: number;
  quotation_total_rows?: number;
  contract_total_documents?: number;
  contract_total_rows?: number;
  zstt_total_documents?: number;
  zstt_total_rows?: number;
  tracking_total_rows?: number;

  // MES manual menyimpan Raw + Quotation + Contract lebih dulu,
  // kemudian meminta user mengisi Daily ZSTT pada popup khusus.
  requires_manual_zstt?: boolean;
  zstt_pending?: boolean;

  data_mode?: MdfoDataMode;
  uploaded_periods?: string[];
  uploaded_revisions?: string[];
  tmmin_columns?: TmminMdfoColumn[] | null;
  ntc_columns?: NtcMdfoColumn[] | null;
  ntc_totals?: NtcMdfoTotals | null;
  ntc_month_headers?: NtcMdfoMonthHeaders | null;
  gaya_columns?: GayaMdfoColumn[] | null;
  gaya_totals?: GayaMdfoTotals | null;
  dpm_columns?: DpmMdfoColumn[] | null;
  fti_columns?: NtcMdfoColumn[] | null;

  day_headers?: MdfoDayHeaders;
  filter_options?: MdfoFilterOptions;
  data?: MdfoRow[] | TmminMdfoRow[] | NtcMdfoRow[] | GayaMdfoRow[] | DpmMdfoRow[];
};

/* =========================================================
 * GET DATA
 * ======================================================= */

export type MdfoGetDataResponse = {
  status: 'success' | 'error';
  message?: string;
  data_mode?: MdfoDataMode;
  total: number;
  page?: number;
  per_page?: number;
  total_pages?: number;
  server_paged?: boolean;
  column_totals?: Partial<Record<MdfoKey, number>> | null;
  batch_id?: number | null;
  day_headers?: MdfoDayHeaders | null;
  active_filters?: MdfoActiveFilters;
  filter_options?: MdfoFilterOptions | null;
  tmmin_columns?: TmminMdfoColumn[] | null;
  ntc_columns?: NtcMdfoColumn[] | null;
  ntc_totals?: NtcMdfoTotals | null;
  ntc_month_headers?: NtcMdfoMonthHeaders | null;
  gaya_columns?: GayaMdfoColumn[] | null;
  gaya_totals?: GayaMdfoTotals | null;
  dpm_columns?: DpmMdfoColumn[] | null;
  fti_columns?: NtcMdfoColumn[] | null;
  data: MdfoRow[] | TmminMdfoRow[] | NtcMdfoRow[] | GayaMdfoRow[] | DpmMdfoRow[];
};

export type MdfoGetDataParams = {
  batchId?: number | string | null;
  customer?: string;
  periode?: string;
  revision?: string;
  customers?: string[];
  page?: number;
  perPage?: number;
  columnFilters?: MdfoColumnFilters;
  sortKey?: MdfoKey | '';
  sortDirection?: 'none' | 'asc' | 'desc';
  paged?: boolean;
  includeMeta?: boolean;
  includeTotals?: boolean;
};

export type MdfoDataFilter = MdfoGetDataParams;

/* =========================================================
 * EXPORT DAN DUPLICATE
 * ======================================================= */

export type MdfoExportRequest = {
  customer?: string;
  periode?: string;
  revision?: string;
  columnFilters?: MdfoColumnFilters;
};

export type MdfoTmminExportRequest = MdfoExportRequest & {
  supplierCode: TmminSupplierCode;
};

export type MdfoNtcExportRequest = MdfoExportRequest & {
  customer: 'NTC';
};

export type MdfoDuplicateRow = {
  type: 'upload' | 'database';
  id?: number | null;
  batch_id?: number | null;
  customer: string;
  periode: string;
  revision: number;
  part_no: string;
  source_file?: string;
  source_row?: number | null;
  message: string;
};

/* =========================================================
 * EXCEL
 * ======================================================= */

export type ExcelCell = string | number | boolean | Date | null;

export type MdfoFileCheckResult = {
  name: string;
  valid: boolean;
  message: string;
};
