// SHARED TYPES

export type SortDirection = 'none' | 'asc' | 'desc';

export type ExcelCell = string | number | boolean | null;

export type CustomerCode = string;

export type FilterParams = {
  customer?: string;

  // Order Date
  from_date?: string;
  to_date?: string;

  // Delivery Date
  delivery_from_date?: string;
  delivery_to_date?: string;

  // Creation / Upload Date
  creation_from_date?: string;
  creation_to_date?: string;
};

export type ApiListResponse<T> = {
  status?: string;
  total?: number;
  data?: T[];
  message?: string;
};

export type UploadResponse = {
  status: 'success' | 'warning' | 'error';
  message: string;
  total_insert?: number;
  data?: unknown[];
};

export type ExcelPreviewResponse = {
  status: 'success' | 'error';
  message?: string;
  sheet_names?: string[];
  active_sheet?: string;
  headers?: string[];
  rows?: ExcelCell[][];
};

export type TableColumn<K extends string> = {
  key: K;
  label: string;
  width: string;
};

// FORMAT SALES ORDER

export type FormatSOKey =
  | 'reference_doc'
  | 'sales_document'
  | 'document_date'
  | 'sales_doc_type'
  | 'sales_org'
  | 'distr_channel'
  | 'division'
  | 'sales_group'
  | 'sales_office'
  | 'req_delv_date'
  | 'price_date'
  | 'po_number'
  | 'po_date'
  | 'sold_to_party'
  | 'ship_to_party'
  | 'bill_to_party'
  | 'payer'
  | 'item'
  | 'material'
  | 'item_category'
  | 'order_quantity'
  | 'reference_document'
  | 'reference_item'
  | 'plant'
  | 'storage_location'
  | 'shipping_point'
  | 'customer_plant'
  | 'cycle_issue'
  | 'job_no'
  | 'po_sa'
  | 'cycle_time';

export type FormatSalesOrderRow = Partial<
  Record<FormatSOKey, string | number | null>
> & {
  id?: string | number;
  customer_code?: string;
  upload_batch_id?: string | null;
};

export type FormatSOFilterPayload = {
  customer: string;
  customers?: string[];
  filters: Partial<Record<FormatSOKey, string[]>>;
  search: string;
  sort_key: FormatSOKey | '';
  sort_direction: SortDirection;
  from_date?: string;
  to_date?: string;

  delivery_from_date?: string;
  delivery_to_date?: string;

  creation_from_date?: string;
  creation_to_date?: string;
};

export type RegenerateFormatSOResponse = {
  status: 'success' | 'error';
  message: string;

  customer?: string;

  customers?: Record<
    string,
    {
      raw_total: number;
      format_total: number;
      status: string;
    }
  >;

  raw_total?: number;
  format_total?: number;
  batch_ids?: string[];
  batch_total?: number;
};

// RAW CUSTOMER ORDER

export type RawCustomerOrderBackendRow = {
  id?: number | string;
  upload_batch_id?: string | null;
  customer_code?: string | null;

  plant_code?: string;
  shop_code?: string;
  part_category?: string;
  route?: string;
  lp?: string;
  trip?: string;

  vendor_code?: string;
  vendor_alias?: string;
  vendor_site?: string;
  vendor_site_alias?: string;

  order_no?: string;
  po_number?: string;

  calc_date?: string;
  order_date?: string;
  order_time?: string;

  del_date?: string;
  del_time?: string;
  del_cycle?: string;

  doc_no?: string;
  rec_status?: string;
  dn_type?: string;

  rec_date?: string;
  rec_by?: string;

  part_no?: string;
  part_name?: string;
  job_no?: string;
  lane?: string;

  qty_kbn?: string;
  order_kbn?: string;
  order_pcs?: string;

  qty_receive?: string;
  qty_balance?: string;

  cancel_status?: string;
  remark?: string;

  /*
   * Status cancel sistem.
   * Jangan dicampur dengan cancel_status dari file customer.
   */
  is_cancelled?: number | string | boolean;
  cancel_group_id?: string | null;
  cancelled_at?: string | null;
  cancelled_by?: string | null;
  cancel_reason?: string | null;

  [key: string]: unknown;
};

// RAW CUSTOMER ORDER - FRONTEND TABLE

export type Card2Key =
  | 'plantCode'
  | 'shopCode'
  | 'partCategory'
  | 'route'
  | 'lp'
  | 'trip'
  | 'vendorCode'
  | 'vendorAlias'
  | 'vendorSite'
  | 'vendorSiteAlias'
  | 'orderNo'
  | 'poNumber'
  | 'calcDate'
  | 'orderDate'
  | 'orderTime'
  | 'delDate'
  | 'delTime'
  | 'delCycle'
  | 'docNo'
  | 'recStatus'
  | 'dnType'
  | 'recDate'
  | 'recBy'
  | 'partNo'
  | 'partName'
  | 'jobNo'
  | 'lane'
  | 'qtyKbn'
  | 'orderKbn'
  | 'orderPcs'
  | 'qtyReceive'
  | 'qtyBalance'
  | 'cancelStatus'
  | 'remark';

export type Card2Row = Record<Card2Key, string> & {
  rawId: number;
  uploadBatchId: string;
};

export type RawFilesExcelPayload = {
  customer: string;
  customers?: string[];
  raw_ids?: number[];
  selected_only?: boolean;
  filters: Partial<Record<Card2Key, string[]>>;
  sort_key: Card2Key | '';
  sort_direction: SortDirection;
  from_date?: string;
  to_date?: string;

  delivery_from_date?: string;
  delivery_to_date?: string;

  creation_from_date?: string;
  creation_to_date?: string;
};

// RAW SALES ORDER TMMIN

export type TmminRawSoKey =
  | 'aManifestNo'
  | 'bCode'
  | 'cValue'
  | 'dValue'
  | 'eValue'
  | 'fValue'
  | 'gValue'
  | 'hPoNo'
  | 'iValue'
  | 'jValue'
  | 'kPartNoRaw'
  | 'lValue'
  | 'mValue'
  | 'nOrderDateTime'
  | 'oJobNo'
  | 'pQtyPalet'
  | 'qQtyOrder'
  | 'rKbn'
  | 'sValue'
  | 'tValue'
  | 'uValue'
  | 'vSupplierName'
  | 'wPartName'
  | 'xValue'
  | 'yValue'
  | 'zDlvDateRv01'
  | 'aaValue'
  | 'abValue'
  | 'acValue'
  | 'adRoute'
  | 'aeCycle'
  | 'afOrderDateRaw'
  | 'agValue'
  | 'ahValue'
  | 'aiValue'
  | 'ajDlvDate'
  | 'akValue'
  | 'alValue'
  | 'amValue'
  | 'anValue'
  | 'aoDeliveryOrderDate'
  | 'apOrderDate'
  | 'aqMaterialSap'
  | 'arMaterialSo'
  | 'asQty'
  | 'atManifest'
  | 'auPo'
  | 'avJobNo'
  | 'awCycle'
  | 'axDateSo'
  | 'ayTimeSoMs'
  | 'azTimeSo'
  | 'baOrderDate';

export type TmminRawSoBackendRow = {
  id?: number | string;
  upload_batch_id?: string | null;
  customer_code?: string | null;
  source_file?: string | null;
  source_header?: string | null;
  source_row?: number | string | null;
  uploaded_by?: string | null;
  created_at?: string | null;

  a_manifest_no?: string | null;
  b_code?: string | null;
  c_value?: string | null;
  d_value?: string | null;
  e_value?: string | null;
  f_value?: string | null;
  g_value?: string | null;
  h_po_no?: string | null;
  i_value?: string | null;
  j_value?: string | null;
  k_part_no_raw?: string | null;
  l_value?: string | null;
  m_value?: string | null;
  n_order_datetime?: string | null;
  o_job_no?: string | null;
  p_qty_palet?: string | null;
  q_qty_order?: string | null;
  r_kbn?: string | null;
  s_value?: string | null;
  t_value?: string | null;
  u_value?: string | null;
  v_supplier_name?: string | null;
  w_part_name?: string | null;
  x_value?: string | null;
  y_value?: string | null;
  z_dlv_date_rv01?: string | null;
  aa_value?: string | null;
  ab_value?: string | null;
  ac_value?: string | null;
  ad_route?: string | null;
  ae_cycle?: string | null;
  af_order_date_raw?: string | null;
  ag_value?: string | null;
  ah_value?: string | null;
  ai_value?: string | null;
  aj_dlv_date?: string | null;
  ak_value?: string | null;
  al_value?: string | null;
  am_value?: string | null;
  an_value?: string | null;
  ao_delivery_order_date?: string | null;
  ap_order_date?: string | null;
  aq_material_sap?: string | null;
  ar_material_so?: string | null;
  as_qty?: string | null;
  at_manifest?: string | null;
  au_po?: string | null;
  av_job_no?: string | null;
  aw_cycle?: string | null;
  ax_date_so?: string | null;
  ay_time_so_ms?: string | null;
  az_time_so?: string | null;
  ba_order_date?: string | null;

  order_date_iso?: string | null;
  delivery_date_iso?: string | null;

  [key: string]: unknown;
};

export type TmminRawSoRow =
  Record<TmminRawSoKey, string> & {
    id: number;
    uploadBatchId: string;
    sourceFile: string;
    sourceHeader: string;
    sourceRow: number;
    uploadedBy: string;
    createdAt: string;
  };

export type TmminRawSoUploadResponse = {
  status: 'success' | 'warning' | 'error';
  message: string;
  upload_batch_id?: string;
  total_files?: number;
  total_rows_read?: number;
  total_insert?: number;
  total_skipped_kbn_zero?: number;
  total_skipped_duplicate?: number;
  preview_data?: TmminRawSoBackendRow[];
  data?: TmminRawSoBackendRow[];
};

export type TmminRawSoPreviewResponse = {
  status: 'success' | 'warning' | 'error';
  message: string;
  total_files?: number;
  total_rows_read?: number;
  total_preview?: number;
  total_skipped_kbn_zero?: number;
  contract_materials?: string[];
  preview_limit?: number;
  preview_truncated?: boolean;
  preview_data: TmminRawSoBackendRow[];
};

// RAW SALES ORDER NTC

export type NtcRawSoKey =
  | 'smNo'
  | 'poNo'
  | 'orderType'
  | 'supplier'
  | 'dock'
  | 'orderDate'
  | 'arrivalDate'
  | 'arrivalTime'
  | 'cycleNo'
  | 'partNo'
  | 'partNumber'
  | 'desc'
  | 'lineProduction'
  | 'store'
  | 'kanbanCode'
  | 'boxType'
  | 'qtyKbn'
  | 'qtyStd'
  | 'qtyTotal'
  | 'period'
  | 'site'
  | 'createdAt';

export type NtcRawSoBackendRow = {
  id?: number | string;
  upload_batch_id?: string | null;
  customer_code?: string | null;
  source_file?: string | null;
  source_row?: number | string | null;
  sm_no?: string | null;
  po_no?: string | null;
  order_type?: string | null;
  supplier?: string | null;
  dock?: string | null;
  order_date?: string | null;
  arrival_date?: string | null;
  arrival_time?: string | null;
  cycle_no?: string | null;
  part_no_raw?: string | null;
  part_number?: string | null;
  description?: string | null;
  line_production?: string | null;
  store?: string | null;
  kanban_code?: string | null;
  box_type?: string | null;
  qty_kbn?: string | number | null;
  qty_std?: string | number | null;
  qty_total?: string | number | null;
  period_raw?: string | null;
  periode?: string | null;
  site?: string | null;
  ntc_plant?: string | null;
  row_hash?: string | null;
  uploaded_by?: string | null;
  created_at?: string | null;
  [key: string]: unknown;
};

export type NtcRawSoRow =
  Record<NtcRawSoKey, string> & {
    id: number;
    uploadBatchId: string;
    sourceFile: string;
    sourceRow: number;
    ntcPlant: string;
    uploadedBy: string;
  };

export type NtcRawSoSiteSummary = {
  site: string;
  label: string;
  total_files: number;
  total_rows: number;
  total_qty: number;
  po_numbers: string[];
  order_date_from: string;
  order_date_to: string;
  delivery_date_from: string;
  delivery_date_to: string;
};

export type NtcRawSoPreviewResponse = {
  status: 'success' | 'warning' | 'error';
  message: string;
  total_files?: number;
  total_rows_read?: number;
  total_preview?: number;
  total_preview_all_periods?: number;
  available_periods?: Array<{
    period: string;
    label: string;
    count: number;
  }>;
  has_multiple_periods?: boolean;
  selected_period?: string;
  selected_period_count?: number;
  preview_summary_by_site?: NtcRawSoSiteSummary[];
  contract_materials?: string[];
  preview_limit?: number;
  preview_truncated?: boolean;
  preview_data: NtcRawSoBackendRow[];
};

export type NtcRawSoUploadResponse = {
  status: 'success' | 'warning' | 'error';
  message: string;
  upload_batch_id?: string;
  total_files?: number;
  total_rows_read?: number;
  total_insert?: number;
  total_skipped_duplicate?: number;
  format_total?: number;
  tracking_generated?: boolean;
  preview_summary_by_site?: NtcRawSoSiteSummary[];
  data?: NtcRawSoBackendRow[];
};

// RAW SALES ORDER DPM

export type DpmRawSoKey =
  | 'no'
  | 'plant'
  | 'plantDesc'
  | 'diNumber'
  | 'deliveryDate'
  | 'vendorCode'
  | 'vendorName'
  | 'materialId'
  | 'description'
  | 'partNumber'
  | 'diQty'
  | 'qtyPerKanban'
  | 'kanbanQty'
  | 'deliveredQty'
  | 'poNumber'
  | 'poItem'
  | 'cycleDelivery'
  | 'deliveryTime'
  | 'gate'
  | 'deliveryLocation'
  | 'confirmQtyDel'
  | 'kanbanDelQty'
  | 'productionDate'
  | 'createdAt';

export type DpmRawSoBackendRow = {
  id?: number | string;
  upload_batch_id?: string | null;
  source_file?: string | null;
  source_row?: number | string | null;
  source_no?: string | null;
  plant?: string | null;
  plant_desc?: string | null;
  di_number?: string | null;
  delivery_date?: string | null;
  periode?: string | null;
  vendor_code?: string | null;
  vendor_name?: string | null;
  material_id?: string | null;
  description?: string | null;
  part_number?: string | null;
  di_qty?: string | number | null;
  qty_per_kanban?: string | number | null;
  kanban_qty?: string | number | null;
  delivered_qty?: string | number | null;
  po_number?: string | null;
  po_item?: string | null;
  cycle_delivery?: string | null;
  delivery_time?: string | null;
  gate?: string | null;
  delivery_location?: string | null;
  confirm_qty_del?: string | number | null;
  kanban_del_qty?: string | number | null;
  production_date?: string | null;
  uploaded_by?: string | null;
  created_at?: string | null;
  [key: string]: unknown;
};

export type DpmRawSoRow = Record<DpmRawSoKey, string> & {
  id: number;
  uploadBatchId: string;
  sourceFile: string;
  sourceRow: number;
  periode: string;
  uploadedBy: string;
};

export type DpmContractValidation = {
  is_ready: boolean;
  missing_parts: string[];
  periods: Array<{
    customer: string;
    periode: string;
    revision: number | null;
    checked: number;
    existing_parts: string[];
    missing_parts: string[];
  }>;
};

export type DpmRawSoPeriodOption = {
  period: string;
  label?: string;
  count: number;
};

export type DpmSalesDocumentConflict = {
  delivery_date: string;
  po_number: string;
  sales_document: string;
  sales_documents?: string[];
  previous_upload_batch_id?: string;
};

export type DpmSalesDocumentStrategy =
  | ''
  | 'reuse_existing'
  | 'generate_new';

export type DpmRawSoDuplicateRow = DpmRawSoBackendRow & {
  duplicate_type?: 'DATABASE' | 'UPLOAD' | string;
  incoming_source_file?: string | null;
  incoming_source_row?: number | string | null;
};

export type DpmRawSoDuplicateValidation = {
  is_ready: boolean;
  has_duplicates: boolean;
  total_duplicates: number;
  total_existing: number;
  total_upload_duplicates: number;
  existing_source_files: string[];
  incoming_source_files: string[];
  existing_rows: DpmRawSoDuplicateRow[];
  upload_duplicate_rows: DpmRawSoDuplicateRow[];
};

export type DpmMdfoPoMismatch = {
  po_number: string;
  status: 'WRONG_PERIOD' | 'NOT_FOUND' | 'EMPTY' | string;
  row_count: number;
  found_periods: string[];
  found_period_labels: string[];
  message: string;
};

export type DpmMdfoPoValidation = {
  is_ready: boolean;
  all_matched: boolean;
  selected_period: string;
  selected_period_label: string;
  total_rows: number;
  matched_rows: number;
  mismatched_rows: number;
  blank_po_rows: number;
  total_po_numbers: number;
  matched_po_count: number;
  mismatched_po_count: number;
  matched_po_numbers: string[];
  mismatched_po_numbers: DpmMdfoPoMismatch[];
  message: string;
};

export type DpmRawSoPreviewResponse = {
  status: 'success' | 'warning' | 'error';
  message: string;
  total_files?: number;
  total_preview?: number;
  total_rows_detected?: number;
  selected_period?: string;
  available_periods?: DpmRawSoPeriodOption[];
  summary?: Record<string, unknown>;
  po_validation?: DpmMdfoPoValidation;
  contract_validation?: DpmContractValidation;
  duplicate_validation?: DpmRawSoDuplicateValidation;
  sales_document_conflicts?: DpmSalesDocumentConflict[];
  preview_limit?: number;
  preview_truncated?: boolean;
  preview_data: DpmRawSoBackendRow[];
};

export type DpmRawSoUploadResponse = {
  status: 'success' | 'warning' | 'error';
  message: string;
  upload_batch_id?: string;
  total_files?: number;
  total_rows_read?: number;
  total_rows_selected?: number;
  upload_period?: string;
  total_insert?: number;
  total_skipped_duplicate?: number;
  total_skipped_po_mismatch?: number;
  sales_document_strategy?: DpmSalesDocumentStrategy;
  sales_document_conflicts?: DpmSalesDocumentConflict[];
  po_validation?: DpmMdfoPoValidation;
  contract_validation?: DpmContractValidation;
  data?: DpmRawSoBackendRow[];
};


// RAW SALES ORDER FTI - GENERATE FROM ZSTT
export type FtiRawSoKey =
  | 'partNo'
  | 'partName'
  | 'poNumber'
  | 'qty'
  | 'orderDate'
  | 'deliveryDate'
  | 'createdAt';

export type FtiRawSoBackendRow = {
  id?: number | string;
  upload_batch_id?: string | null;
  source_zstt_batch_id?: number | string | null;
  source_zstt_id?: number | string | null;
  source_mdfo_id?: number | string | null;
  customer_code?: string | null;
  periode?: string | null;
  revision?: number | string | null;
  part_no?: string | null;
  part_name?: string | null;
  po_number?: string | null;
  qty?: string | number | null;
  order_date?: string | null;
  delivery_date?: string | null;
  uploaded_by?: string | null;
  created_at?: string | null;
  source_type?: string | null;
  fti_additional_order_id?: number | string | null;
};

export type FtiRawSoRow = Record<FtiRawSoKey, string> & {
  id: number;
  uploadBatchId: string;
  sourceZsttBatchId: string;
  periode: string;
  revision: string;
  uploadedBy: string;
  createdAt: string;
};

export type FtiRawSoPreviewResponse = {
  status: 'success' | 'warning' | 'error';
  message: string;
  selected_period?: string;
  source_zstt_batch_id?: number | string;
  revision?: number | null;
  summary?: Record<string, unknown>;
  preview_limit?: number;
  preview_truncated?: boolean;
  preview_data: FtiRawSoBackendRow[];
};

export type FtiRawSoUploadResponse = {
  status: 'success' | 'warning' | 'error';
  message: string;
  upload_batch_id?: string;
  source_zstt_batch_id?: number | string;
  revision?: number | null;
  total_insert?: number;
  data?: FtiRawSoBackendRow[];
};

export type FtiAdditionalOrderCandidate = {
  date: string;
  existing_qty: number;
  scheduled_qty: number;
  normal_daily_qty: number;
  suggested_qty: number;
  is_closing: boolean;
};

export type FtiAdditionalOrderItem = {
  part_no: string;
  part_name: string;
  pdf_qty: number;
  base_po_qty: number;
  previous_additional_qty: number;
  cumulative_target_qty: number;
  existing_order_qty: number;
  required_qty: number;
  normal_daily_qty: number;
  scheduled_total_qty: number;
  last_business_date: string;
  source_mdfo_id: number;
  candidates: FtiAdditionalOrderCandidate[];
};

export type FtiAdditionalOrderMode = 'MANUAL' | 'OCR';

export type FtiAdditionalManualPart = {
  source_mdfo_id: number;
  part_no: string;
  part_name: string;
  n_qty: number;
};

export type FtiAdditionalManualOptionsResponse = {
  status: 'success' | 'warning' | 'error';
  message: string;
  selected_period: string;
  periode: string;
  source_mdfo_batch_id: number;
  revision: number | null;
  parts: FtiAdditionalManualPart[];
};

export type FtiAdditionalManualInputItem = {
  part_no: string;
  qty: number;
};

export type FtiAdditionalOrderPreview = {
  source_mode?: FtiAdditionalOrderMode;
  selected_period: string;
  periode: string;
  source_mdfo_batch_id: number;
  revision: number | null;
  contract_document: string;
  po_number: string;
  po_date: string;
  delivery_date: string;
  source_file_name: string;
  source_file_hash: string;
  total_items: number;
  total_pdf_qty: number;
  total_required_qty: number;
  preview_signature: string;
  items: FtiAdditionalOrderItem[];
};

export type FtiAdditionalOrderPreviewResponse = {
  status: 'success' | 'warning' | 'error';
  message: string;
  preview: FtiAdditionalOrderPreview | null;
};

export type FtiAdditionalOrderAllocation = {
  date: string;
  qty: number;
};

export type FtiAdditionalOrderAllocationItem = {
  part_no: string;
  allocations: FtiAdditionalOrderAllocation[];
};

export type FtiAdditionalOrderUploadResponse = {
  status: 'success' | 'warning' | 'error';
  message: string;
  upload_batch_id?: string;
  selected_period?: string;
  po_number?: string;
  total_metadata?: number;
  total_insert?: number;
  format_total?: number;
  data?: FtiRawSoBackendRow[];
};

// RAW ORDER CANCEL / RESTORE

export type RawCancelMode =
  | 'selected'
  | 'filtered';

export type RawCancelPayload = {
  mode: RawCancelMode;
  customer?: string;

  /*
   * selected mode
   */
  raw_ids?: number[];

  /*
   * filtered mode.
   * Backend akan resolve seluruh hasil filter,
   * bukan hanya halaman pagination saat ini.
   */
  customers?: string[];

  from_date?: string;
  to_date?: string;

  delivery_from_date?: string;
  delivery_to_date?: string;
  creation_from_date?: string;
  creation_to_date?: string;

  filters?: Partial<Record<Card2Key, string[]>>;

  reason: string;

  /*
   * Fallback jika backend belum mengambil user dari session.
   */
  action_by?: string;
};

export type RawRestorePayload = {
  raw_ids: number[];
  customer?: string;
  reason?: string;
  action_by?: string;
};

export type RawLifecycleDnImpact = {
  order_no: string;
  total_parts: number | string;
  cancelled_parts: number | string;
  active_parts: number | string;
  cancel_state:
  | 'ACTIVE'
  | 'PARTIAL_CANCELLED'
  | 'FULL_CANCELLED';
};

export type RawCancelResponse = {
  status: 'success' | 'error';
  message: string;

  data?: {
    event_group_id?: string;
    requested?: number;
    cancelled?: number;
    skipped?: number;
    dn_impact?: RawLifecycleDnImpact[];
  };
};

export type RawRestoreResponse = {
  status: 'success' | 'error';
  message: string;

  data?: {
    event_group_id?: string;
    requested?: number;
    restored?: number;
    skipped?: number;
    dn_impact?: RawLifecycleDnImpact[];
  };
};

export type CancelListParams = {
  customers?: string[];

  from_date?: string;
  to_date?: string;

  delivery_from_date?: string;
  delivery_to_date?: string;

  page?: number;
  per_page?: number;
};

export type CancelledRawRow = RawCustomerOrderBackendRow & {
  id: number | string;
  is_cancelled: number | string | boolean;
  sales_document?: string | null;
};

export type CancelHistoryAction =
  | 'CANCEL'
  | 'RESTORE';

export type CancelHistoryRow = {
  id: number | string;
  event_group_id: string;
  raw_id: number | string;
  action: CancelHistoryAction;

  plant_code?: string | null;
  customer_code?: string | null;

  order_no?: string | null;
  order_date?: string | null;
  del_date?: string | null;

  part_no?: string | null;
  part_name?: string | null;
  part_category?: string | null;
  order_pcs?: string | number | null;

  upload_batch_id?: string | null;
  sales_document?: string | null;

  reason?: string | null;
  action_by?: string | null;
  action_at: string;
};

export type CancelledDnRow = {
  dn_number: string;
  customer: string;

  order_date: string | null;
  delivery_date: string | null;

  total_parts: number | string;
  cancelled_parts: number | string;
  active_parts: number | string;

  cancel_state:
  | 'PARTIAL_CANCELLED'
  | 'FULL_CANCELLED';

  cancelled_raw_ids: string | null;
  cancelled_part_list: string | null;

  last_cancelled_at: string | null;

  registered_date?: string | null;
  registration_status?: string | null;

  cancelled_by: string | null;
  cancel_reason: string | null;
};

export type CancelListResponse<T> = {
  status: 'success' | 'error';
  total: number;
  data: T[];
  message?: string;
};

export type CancelListPageResponse<T> = CancelListResponse<T> & {
  server_paged?: boolean;
  page: number;
  per_page: number;
  total_pages: number;
};

export type CancelLifecycleCountsResponse = {
  status: 'success' | 'error';
  cancelled_raw_total: number;
  history_total: number;
  message?: string;
};

// TRACKING UPLOAD SALES ORDER

export type TrackingStatus =
  | 'BELUM_DIMULAI'
  | 'DALAM_PROSES'
  | 'DIBLOKIR'
  | 'SELESAI';

// TRACKING - FRONTEND ROW

export type Card1Row = {
  id: number;
  uploadBatchId: string;

  penyerahan: string;
  pembuat: string;
  customer: string;

  tanggalOrderan: string;
  jamDiserahkan: string;

  nomorDn: string;
  nomorSo: string;
  totalQty: string;

  tanggalUpload: string;
  jamUpload: string;
  uploadSo: string;

  status: TrackingStatus;
  remarks: string;

  /*
   * Informasi cancel sistem bersifat read-only.
   * Manual remarks tetap berada di remarks.
   */
  cancelledPartCount: number;
  cancelledDnCount: number;
  cancelledItems: string;
  systemCancelRemarks: string;
};

// TRACKING - COLUMN KEYS

export type ColumnKey =
  | 'penyerahan'
  | 'pembuat'
  | 'customer'
  | 'tanggalOrderan'
  | 'jamDiserahkan'
  | 'nomorDn'
  | 'nomorSo'
  | 'totalQty'
  | 'tanggalUpload'
  | 'jamUpload'
  | 'uploadSo'
  | 'status'
  | 'remarks';

// TRACKING - COLOR

export type ColorKey =
  | 'normal'
  | 'yellow'
  | 'pink'
  | 'cyan'
  | 'purple'
  | 'blue'
  | 'gray'
  | 'green'
  | 'orange'
  | 'red'
  | 'indigo'
  | 'emerald';

export type UserColor = Exclude<ColorKey, 'normal'>;

export type UserMaster = {
  name: string;
  color: UserColor;
};

// TRACKING - EDITABLE FIELDS

export type TrackingEditableKey =
  | 'tanggalUpload'
  | 'jamUpload'
  | 'uploadSo'
  | 'status'
  | 'remarks';

export type TrackingUpdateField =
  | 'upload_date'
  | 'upload_time'
  | 'upload_so_by'
  | 'status'
  | 'remarks';

// TRACKING - BACKEND ROW

export type TrackingBackendRow = {
  id: number | string;
  upload_batch_id: string;

  customer_code: string;

  handover_date: string | null;
  so_creator: string | null;

  order_date_from: string | null;
  order_date_to: string | null;

  handed_time: string | null;

  first_dn_number: string | null;
  last_dn_number: string | null;

  first_sales_document: string | null;
  last_sales_document: string | null;

  total_quantity: number | string | null;

  upload_date: string | null;
  upload_time: string | null;
  upload_so_by: string | null;

  status: TrackingStatus | null;
  remarks: string | null;

  cancelled_part_count?: number | string | null;
  cancelled_dn_count?: number | string | null;
  cancelled_items?: string | null;
};

// TRACKING - UPDATE REQUEST / RESPONSE

export type TrackingUpdatePayload = {
  id: number;
  field: TrackingUpdateField;
  value: string | null;
};

export type TrackingUpdateResponse = {
  status: 'success' | 'error';
  message: string;

  id?: number;
  field?: TrackingUpdateField;
  value?: string | null;
};

export type TrackingBulkUpdatePayload = {
  ids: number[];
  changes: Partial<Record<TrackingUpdateField, string | null>>;
};

export type TrackingBulkUpdateResponse = {
  status: 'success' | 'error';
  message: string;
  requested?: number;
  updated?: number;
};

// DN RAW FILE CROSSCHECK
export type DnCrosscheckStatus =
  | 'FOUND'
  | 'NOT_FOUND'
  | 'OPEN'
  | 'CLOSE';

export type DnCrosscheckKey =
  | 'dn_number'
  | 'customer'
  | 'order_no'
  | 'order_date'
  | 'delivery_date'
  | 'status'
  | 'registered_date';

export type DnCrosscheckRow = {
  dn_number: string;

  customer: string;

  /** Kode turunan TMMIN khusus DN Crosscheck, misalnya T034 / TMAJ. */
  customer_code?: string;

  order_no: string;

  order_date: string;

  delivery_date: string;

  raw_row_count: number;

  found: boolean;

  registered: boolean;

  registered_date: string;

  registered_at: string;

  status: DnCrosscheckStatus;

  message: string;
};

export type DnCrosscheckResponse = {
  status: 'success' | 'error';

  message?: string;

  total_input: number;

  total_found: number;

  total_not_found: number;

  data: DnCrosscheckRow[];
};

export type DnRegisterPayload = {
  dn_numbers: string[];

  dn_in_office_date: string;
};

export type DnRegisterResponse = {
  status: 'success' | 'error';

  message: string;

  total_requested: number;

  total_registered: number;

  total_already_registered: number;

  total_not_found: number;
};

export type DnAllStatusResponse = {
  status: 'success' | 'error';
  total: number;
  data: DnCrosscheckRow[];
  message?: string;
};

export type DnDeleteRegisterPayload = {
  dn_numbers: string[];
};

export type DnDeleteRegisterResponse = {
  status:
  'success' |
  'error';

  message: string;

  requested: number;

  deleted: number;
};

// DN MONITORING REPORT

export type DnMonitoringDateBasis =
  | 'order_date'
  | 'delivery_date';

export type DnMonitoringReportPayload = {
  dn_numbers: string[];

  source_mode:
  | 'all'
  | 'paste';

  /*
   * Format:
   *
   * 2026-08
   * 2026-09
   * dst.
   */
  period: string;

  /*
   * Dasar periode dan daily report.
   */
  date_basis:
  DnMonitoringDateBasis;
};

export type DnMonitoringReportRow = {
  no: number;

  date: string;

  out: number | null;
  in: number | null;
  gap: number | null;

  achievement: number | null;
};

export type DnMonitoringReportSection = {
  key: string;

  title: string;

  rows: DnMonitoringReportRow[];

  total_out: number;
  total_in: number;
  total_gap: number;

  achievement: number;
};

export type DnMonitoringReportPage = {
  period: string;

  sections: DnMonitoringReportSection[];

  grand_total: {
    out: number;
    in: number;
    gap: number;
    achievement: number;
  };
};

export type DnMonitoringPreviewResponse = {
  status:
  | 'success'
  | 'error';

  message?: string;

  period?: string;

  period_label?: string;

  date_basis?:
  DnMonitoringDateBasis;

  date_basis_label?: string;

  total_dn?: number;

  updated_at?: string;

  updated_at_short?: string;

  logos?: {
    left?: string;
    right?: string;
  };

  pages: any[];
};


// RAW SALES ORDER GAYA MOTOR (PDF DELIVERY NOTE)

export type GayaRawSoKey =
  | 'seqNo'
  | 'materialNumber'
  | 'partNumber'
  | 'description'
  | 'totalQty'
  | 'qtyPerKanban'
  | 'totalKanban'
  | 'jitCall'
  | 'po'
  | 'orderDate'
  | 'deliveryDate'
  | 'cycle'
  | 'jobNo'
  | 'createdAt';

export type GayaRawSoBackendRow = {
  id?: number | string;
  upload_batch_id?: string | null;
  customer_code?: string | null;
  source_file?: string | null;
  source_row?: number | string | null;
  seq_no?: number | string | null;
  material_number?: string | null;
  part_number?: string | null;
  description?: string | null;
  total_qty?: number | string | null;
  qty_per_kanban?: number | string | null;
  total_kanban?: number | string | null;
  jit_call_no?: string | null;
  agreement_no?: string | null;
  order_date?: string | null;
  delivery_date?: string | null;
  cycle_no?: number | string | null;
  job_no?: string | null;
  periode?: string | null;
  row_hash?: string | null;
  uploaded_by?: string | null;
  created_at?: string | null;
  is_cancelled?: number | string | null;
  [key: string]: unknown;
};

export type GayaRawSoRow =
  Record<GayaRawSoKey, string> & {
    id: number;
    uploadBatchId: string;
    sourceFile: string;
    sourceRow: number;
    deliveryDate: string;
    period: string;
    uploadedBy: string;
    createdAt: string;
  };

export type GayaRawSoPreviewSummary = {
  total_files: number;
  total_rows: number;
  total_qty: number;
  total_kanban: number;
  jit_call_numbers: string[];
  agreement_numbers: string[];
  cycles: number[];
  order_date_from: string;
  order_date_to: string;
  delivery_date_from: string;
  delivery_date_to: string;
};

export type GayaRawSoPreviewResponse = {
  status: 'success' | 'warning' | 'error';
  message: string;
  total_files?: number;
  total_rows_read?: number;
  total_preview?: number;
  total_preview_all_periods?: number;
  available_periods?: Array<{
    period: string;
    label: string;
    count: number;
  }>;
  has_multiple_periods?: boolean;
  selected_period?: string;
  preview_summary?: GayaRawSoPreviewSummary;
  preview_data: GayaRawSoBackendRow[];
};

export type GayaRawSoUploadResponse = {
  status: 'success' | 'warning' | 'error';
  message: string;
  upload_batch_id?: string;
  batch_id?: string;
  customer?: 'GAYA MTR' | string;
  total_files?: number;
  total_rows_read?: number;
  total_insert?: number;
  format_total?: number;
  tracking_created?: boolean;
  total_skipped_duplicate?: number;
  preview_summary?: GayaRawSoPreviewSummary;
  data?: GayaRawSoBackendRow[];
};

// RAW SALES ORDER DCWA (EXCEL A:W + PDF PO + MDFO JOB NUMBER)

export type DcwaRawSoKey =
  | 'supplierCode'
  | 'supplierName'
  | 'destination'
  | 'vanning'
  | 'week'
  | 'cycle'
  | 'orderDate'
  | 'dnSeq'
  | 'dnNo'
  | 'partNo'
  | 'partName'
  | 'boxType'
  | 'qtyPerBox'
  | 'totalBox'
  | 'orderQty'
  | 'boxPerMdl'
  | 'module'
  | 'moduleNumber'
  | 'truckNo'
  | 'containerNo'
  | 'periode'
  | 'etd'
  | 'container'
  | 'poNumber'
  | 'jobNumber'
  | 'orderType'
  | 'createdAt';

export type DcwaRawSoBackendRow = {
  id?: number | string;
  upload_batch_id?: string | null;
  customer_code?: string | null;
  order_type?: 'REGULAR' | 'SPECIAL_ORDER' | string | null;
  source_file?: string | null;
  source_file_order?: number | string | null;
  source_row?: number | string | null;
  supplier_code?: string | null;
  supplier_name?: string | null;
  destination?: string | null;
  vanning?: string | null;
  week_value?: string | null;
  cycle?: string | null;
  order_date?: string | null;
  dn_seq?: string | null;
  dn_no?: string | null;
  part_no?: string | null;
  part_name?: string | null;
  box_type?: string | null;
  qty_per_box?: number | string | null;
  total_box?: number | string | null;
  order_qty?: number | string | null;
  box_per_mdl?: number | string | null;
  module?: string | null;
  module_number?: string | null;
  truck_no?: string | null;
  container_no?: string | null;
  periode?: string | null;
  etd?: string | null;
  container?: string | null;
  po_number?: string | null;
  job_number?: string | null;
  po_match_status?: 'MATCHED' | 'MISSING' | 'AMBIGUOUS' | string | null;
  job_match_status?: 'MATCHED' | 'MISSING' | 'AMBIGUOUS' | string | null;
  uploaded_by?: string | null;
  row_hash?: string | null;
  is_cancelled?: number | string | null;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: unknown;
};

export type DcwaRawSoRow =
  Record<DcwaRawSoKey, string> & {
    id: number;
    uploadBatchId: string;
    sourceFile: string;
    sourceRow: number;
    uploadedBy: string;
    createdAt: string;
    poMatchStatus: string;
    jobMatchStatus: string;
  };

export type DcwaRawSoPreviewSummary = {
  total_rows: number;
  total_excel_files: number;
  total_pdf_files: number;
  regular_rows?: number;
  special_order_rows?: number;

  // Jumlah DN No unik pada seluruh row periode preview DCWA.
  unique_dn: number;

  // Total kolom Order Qty (kolom O) seluruh row periode preview DCWA.
  total_order_qty: number;

  matched_po: number;
  matched_job: number;
  missing_po_parts: number;
  ambiguous_po_parts: number;
  missing_job_parts: number;
  ambiguous_job_parts: number;

  // Regular: Delivery Date memakai ETD. Special Order: memakai Arrival/Order Date.
  order_date_from: string;
  order_date_to: string;
  delivery_date_from: string;
  delivery_date_to: string;

  // Compatibility untuk response lama. Tidak ditampilkan lagi pada UI preview.
};

export type DcwaRawSoPreviewResponse = {
  status: 'success' | 'warning' | 'error';
  message: string;
  total_excel_files?: number;
  total_pdf_files?: number;
  regular_pdf_files?: number;
  special_order_pdf_files?: number;
  regular_rows?: number;
  special_order_rows?: number;
  total_rows_read?: number;
  total_preview?: number;
  available_periods?: Array<{
    period: string;
    label: string;
    count: number;
  }>;
  has_multiple_periods?: boolean;
  selected_period?: string;
  can_submit?: boolean;
  validation_errors?: string[];
  preview_summary?: DcwaRawSoPreviewSummary;
  preview_data: DcwaRawSoBackendRow[];
};

export type DcwaRawSoUploadResponse = {
  status: 'success' | 'warning' | 'error';
  message: string;
  upload_batch_id?: string;
  batch_id?: string;
  customer?: string;
  total_excel_files?: number;
  total_pdf_files?: number;
  regular_pdf_files?: number;
  special_order_pdf_files?: number;
  regular_rows?: number;
  special_order_rows?: number;
  total_rows_read?: number;
  total_insert?: number;

  // DCWA Raw -> Format SO -> Tracking
  format_total?: number;
  tracking_generated?: boolean;

  total_skipped_duplicate?: number;
  preview_summary?: DcwaRawSoPreviewSummary;
  data?: DcwaRawSoBackendRow[];
};


// RAW SALES ORDER ASI ADM (PDF PURCHASE ORDER + MDFO / SERVICE PART MANUAL DATE)

export type AsiAdmRawSoOrderType = 'REGULAR' | 'SERVICE PART';

export type AsiAdmRawSoKey =
  | 'partNumberFinal'
  | 'partName'
  | 'note'
  | 'orderType'
  | 'qty'
  | 'orderDate'
  | 'deliveryDate'
  | 'poNumber';

export type AsiAdmRawSoBackendRow = {
  id?: number | string;
  upload_batch_id?: string | null;
  customer_code?: string | null;
  source_file?: string | null;
  source_row?: number | string | null;
  order_type?: AsiAdmRawSoOrderType | string | null;
  part_number_raw?: string | null;
  part_number_final?: string | null;
  part_name?: string | null;
  note?: string | null;
  pdf_total_qty?: number | string | null;
  qty?: number | string | null;
  order_date?: string | null;
  delivery_date?: string | null;
  po_number?: string | null;
  periode?: string | null;
  mdfo_raw_id?: number | string | null;
  mdfo_day_no?: number | string | null;
  mdfo_revision?: number | string | null;
  mdfo_total_qty?: number | string | null;
  validation_status?: string | null;
  validation_message?: string | null;
  row_hash?: string | null;
  uploaded_by?: string | null;
  created_at?: string | null;
  is_cancelled?: number | string | boolean | null;
  [key: string]: unknown;
};

export type AsiAdmRawSoRow =
  Record<AsiAdmRawSoKey, string> & {
    id: number;
    uploadBatchId: string;
    sourceFile: string;
    sourceRow: number;
    partNumberRaw: string;
    pdfTotalQty: string;
    period: string;
    mdfoRawId: number;
    mdfoDayNo: number;
    mdfoRevision: number;
    mdfoTotalQty: string;
    validationStatus: string;
    validationMessage: string;
    uploadedBy: string;
    createdAt: string;
  };

export type AsiAdmRawSoPreviewSummary = {
  total_files: number;
  total_items_pdf: number;
  total_rows: number;
  regular_rows: number;
  service_part_rows: number;
  total_daily_qty: number;
  po_numbers: string[];
  order_date_from: string;
  order_date_to: string;
  validation_error_count: number;
};

export type AsiAdmRawSoFileTypeInfo = {
  file_name: string;
  order_type: AsiAdmRawSoOrderType | string;
  total_items: number;
};

export type AsiAdmRawSoInspectResponse = {
  status: 'success' | 'warning' | 'error';
  message: string;
  total_files?: number;
  total_items_pdf?: number;
  order_type?: AsiAdmRawSoOrderType | '';
  requires_delivery_date?: boolean;
  file_types?: AsiAdmRawSoFileTypeInfo[];
};

export type ContractPreviewPartsResponse = {
  status: 'success' | 'error';
  message: string;
  customer?: string;
  periode?: string;
  revision?: number | null;
  checked?: number;
  missing_count?: number;
  missing_parts?: string[];
  existing_parts?: string[];
  can_submit?: boolean;
};

export type AsiAdmRawSoPreviewResponse = {
  status: 'success' | 'warning' | 'error';
  message: string;
  total_files?: number;
  total_items_pdf?: number;
  total_preview?: number;
  selected_period?: string;
  order_type?: AsiAdmRawSoOrderType | '';
  requires_delivery_date?: boolean;
  service_part_delivery_date?: string;
  file_types?: AsiAdmRawSoFileTypeInfo[];
  contract_revision?: number | null;
  missing_contract_parts?: string[];
  can_submit?: boolean;
  validation_errors?: string[];
  preview_summary?: AsiAdmRawSoPreviewSummary;
  preview_data: AsiAdmRawSoBackendRow[];
};

export type AsiAdmRawSoUploadResponse = {
  status: 'success' | 'warning' | 'error';
  message: string;
  upload_batch_id?: string;
  batch_id?: string;
  customer?: string;
  total_files?: number;
  total_items_pdf?: number;
  order_type?: AsiAdmRawSoOrderType | '';
  service_part_delivery_date?: string;
  contract_revision?: number | null;
  total_rows_read?: number;
  total_insert?: number;
  total_skipped_duplicate?: number;
  format_total?: number;
  tracking_generated?: boolean;
  preview_summary?: AsiAdmRawSoPreviewSummary;
  data?: AsiAdmRawSoBackendRow[];
};

// RAW SALES ORDER MES - PDF PURCHASE ORDER / RFQ
export type MesRawSoKey =
  | 'partNo'
  | 'partName'
  | 'poNumber'
  | 'qty'
  | 'orderDate'
  | 'deliveryDate'
  | 'createdAt';

export type MesRawSoBackendRow = {
  id?: number | string;
  upload_batch_id?: string | null;
  customer_code?: string | null;
  source_file_name?: string | null;
  source_file_hash?: string | null;
  source_row?: number | string | null;
  part_no?: string | null;
  part_name?: string | null;
  po_number?: string | null;
  qty?: string | number | null;
  order_date?: string | null;
  delivery_date?: string | null;
  uploaded_by?: string | null;
  created_at?: string | null;
};

export type MesRawSoRow = Record<MesRawSoKey, string> & {
  id: number;
  uploadBatchId: string;
  sourceFileName: string;
  sourceRow: string;
  uploadedBy: string;
};

export type MesPartNameConflict = {
  key: string;
  row_index?: number;
  source_file_name?: string;
  source_row?: number | string | null;
  part_no: string;
  pdf_part_name: string;
  contract_part_name: string;
  similarity: number;
  severity: 'minor' | 'major';
};

export type MesRawSoPreviewResponse = {
  status: 'success' | 'warning' | 'error';
  message: string;
  selected_period?: string;
  total_files?: number;
  summary?: Record<string, unknown>;
  preview_limit?: number;
  preview_truncated?: boolean;
  preview_data: MesRawSoBackendRow[];
  missing_contract_parts?: string[];
  contract_documents?: string[];
  part_name_conflicts?: MesPartNameConflict[];
  can_submit?: boolean;
};

export type MesRawSoUploadResponse = {
  status: 'success' | 'warning' | 'error';
  message: string;
  upload_batch_id?: string;
  upload_period?: string;
  total_insert?: number;
  format_total?: number;
  data?: MesRawSoBackendRow[];
  missing_contract_parts?: string[];
  contract_documents?: string[];
};
