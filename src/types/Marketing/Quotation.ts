// Mode

export type QuotationApiMode =
  | 'Q'
  | 'Q1'
  | 'Q2'
  | 'Q3';

export type QuotationMode =
  | QuotationApiMode
  | 'CONTRACT'
  | 'ZSTT';

export type QuotationModeOption = {
  value: QuotationMode;
  label: string;
  forecastLabel: string;
  description: string;
};

// Column keys

export type ZsttDayKey =
  | 'd01'
  | 'd02'
  | 'd03'
  | 'd04'
  | 'd05'
  | 'd06'
  | 'd07'
  | 'd08'
  | 'd09'
  | 'd10'
  | 'd11'
  | 'd12'
  | 'd13'
  | 'd14'
  | 'd15'
  | 'd16'
  | 'd17'
  | 'd18'
  | 'd19'
  | 'd20'
  | 'd21'
  | 'd22'
  | 'd23'
  | 'd24'
  | 'd25'
  | 'd26'
  | 'd27'
  | 'd28'
  | 'd29'
  | 'd30'
  | 'd31';

export type ZsttOnlyKey =
  | 'revision'
  | 'zsttTotal'
  | 'contractTotal'
  | 'status'
  | ZsttDayKey;

export type CommonSalesDocumentKey =
  | 'salesDocument'
  | 'documentDate'
  | 'salesDocType'
  | 'salesOrg'
  | 'distrChannel'
  | 'division'
  | 'salesGroup'
  | 'salesOffice'
  | 'validFrom'
  | 'validTo'
  | 'priceDate'
  | 'soldToParty'
  | 'shipToParty'
  | 'billToParty'
  | 'payer'
  | 'item'
  | 'material'
  | 'orderQuantity'
  | 'plant'
  | 'shippingPoint'
  | 'remarks';

export type QuotationOnlyKey =
  | 'noLetterIntent'
  | 'projectCode';

export type ContractOnlyKey =
  | 'referenceDoc'
  | 'shippingCondition'
  | 'poNumber'
  | 'poDate'
  | 'referenceDocument'
  | 'referenceItem'
  | 'customerPlant'
  | 'cycleIssue';

export type QuotationKey =
  | CommonSalesDocumentKey
  | QuotationOnlyKey
  | ContractOnlyKey
  | ZsttOnlyKey;

// Rows and columns

export type QuotationRow =
  Partial<
    Record<
      QuotationKey,
      string
    >
  > & {
    _id?: number;
    _sourceBatchId?: number;
    _sourceMdfoId?: number | null;
    _sourceQuotationId?: number | null;
    _sourceContractId?: number | null;
    _customer?: string;
    salesDocument: string;
    material: string;
    item?: string;
    orderQuantity?: string;
    isRequiredPart?: string;
  };

export type QuotationColumn = {
  key: QuotationKey;
  label: string;
  technicalLabel: string;
  width: string;
};

export type QuotationColumnFilters =
  Partial<
    Record<
      QuotationKey,
      string[]
    >
  >;

// Filters

export type QuotationDataFilter = {
  batchId?: number | string | null;
  customer?: string;
  customers?: string[];
  periode?: string;
  revision?: string;

  // Server-side grid state.
  page?: number;
  perPage?: number;
  columnFilters?: QuotationColumnFilters;
  sortKey?: QuotationKey | '';
  sortDirection?: 'none' | 'asc' | 'desc';
  signal?: AbortSignal;

  // Hanya digunakan oleh endpoint Quotation/getData.
  quotationMode?: QuotationApiMode;
};

export type QuotationActiveFilters = {
  batchId?: number | null;
  customer: string;
  periode: string;
  revision: string;
};

export type QuotationBackendActiveFilters = {
  customer: string;
  periode: string;
  revision: string;
  quotation_mode?: QuotationApiMode;
};

// Responses

export type SalesDocumentDataResponse = {
  status: 'success' | 'error';
  total: number;
  server_paged?: boolean;
  page?: number;
  per_page?: number;
  total_pages?: number;

  batch_id?: number | null;
  total_order_quantity?: number;

  active_filters?:
  QuotationBackendActiveFilters;

  data: QuotationRow[];
  message?: string;
};

export type QuotationGetDataResponse =
  SalesDocumentDataResponse;

export type ContractGetDataResponse =
  SalesDocumentDataResponse;

export type ZsttGetDataResponse = {
  status: 'success' | 'error';
  total: number;
  server_paged?: boolean;
  page?: number;
  per_page?: number;
  total_pages?: number;

  batch_id?: number | null;

  days_in_month: number;

  day_headers:
  Partial<
    Record<
      ZsttDayKey,
      string
    >
  >;

  data: QuotationRow[];
  message?: string;
};

// Export

export type QuotationExportRequest = {
  customer?: string;
  periode?: string;
  revision?: string;

  // Menentukan sheet yang menerima filter popup aktif.
  activeMode?: QuotationMode;

  columnFilters?:
  QuotationColumnFilters;
};

// Regenerate

export type QuotationRegenerateRequest = {
  batchId?: number | string | null;
  customer?: string;
  periode?: string;
  revision?: string;
};

export type QuotationRegenerateResponse = {
  status: 'success' | 'error';

  message: string;
  batch_id?: number;

  // Response lama.
  total_documents?: number;
  total_rows?: number;

  // Response gabungan Quotation, Contract, dan ZSTT.
  quotation_rows?: number;
  contract_rows?: number;
  zstt_rows?: number;

  quotation_documents?: number;
  contract_documents?: number;
  zstt_documents?: number;
};

// Frontend filter state

export type QuotationSelectedFilters =
  Partial<
    Record<
      QuotationKey,
      string[]
    >
  >;

export type QuotationSearchFilters =
  Partial<
    Record<
      QuotationKey,
      string
    >
  >;

export type QuotationOpenFilters =
  Partial<
    Record<
      QuotationKey,
      boolean
    >
  >;

// Manual add part

export type QuotationAddPartPayload = {
  batchId?: number | null;

  customer: string;

  // Yyyymm
  periode: string;

  revision: number;

  material: string;

  orderQuantity: number;

  remarks?: string;
};

export type QuotationAddPartResponse = {
  status:
  | 'success'
  | 'error';

  message: string;

  batch_id?: number;

  quotation_id?: number;

  contract_id?: number;

  item?: number;

  material?: string;

  order_quantity?: number;

  added_to_zstt?: boolean;
};

// Add part options

export type QuotationAddPartOptionsResponse = {
  status:
  | 'success'
  | 'error';

  message?: string;

  customers:
  string[];

  periods:
  string[];

  revisions:
  string[];

  latest_period?:
  string;

  latest_revision?:
  string;
};
