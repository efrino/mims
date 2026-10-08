// Document, status, and keys

export type QuotationTrackingDocumentType =
  | 'Q'
  | 'Q1'
  | 'Q2'
  | 'Q3'
  | 'CONTRACT'
  | 'ZSTT';

export type QuotationTrackingStatus =
  | 'BELUM_DIMULAI'
  | 'DALAM_PROSES'
  | 'DIBLOKIR'
  | 'SELESAI';

export type QuotationTrackingKey =
  | 'handoverDate'
  | 'creatorName'
  | 'customer'
  | 'documentType'
  | 'periode'
  | 'handedTime'
  | 'documentNumber'
  | 'totalQuantity'
  | 'uploadDate'
  | 'uploadTime'
  | 'uploadBy'
  | 'status'
  | 'remarks';

export type QuotationTrackingEditableKey =
  | 'uploadDate'
  | 'uploadTime'
  | 'uploadBy'
  | 'status'
  | 'remarks';

export type QuotationTrackingUpdateField =
  | 'upload_date'
  | 'upload_time'
  | 'upload_by'
  | 'status'
  | 'remarks';

// Frontend columns and rows

export type QuotationTrackingColumn = {
  key: QuotationTrackingKey;
  label: string;
  width: string;
};

export type QuotationTrackingRow = {
  id: number;
  sourceBatchId: number;

  handoverDate: string;
  creatorName: string;
  customer: string;

  documentType:
  QuotationTrackingDocumentType;

  periodeRaw: string;
  periode: string;
  revision: number;

  handedTime: string;

  firstDocument: string;
  lastDocument: string;

  totalQuantity:
  string | number;

  uploadDate: string;
  uploadTime: string;
  uploadBy: string;

  status:
  QuotationTrackingStatus;

  remarks: string;
};

// Backend rows

export type QuotationTrackingApiRow = {
  id?: number | string;

  sourceBatchId?: number | string;
  source_batch_id?: number | string;

  handoverDate?: string | null;
  handover_date?: string | null;

  creatorName?: string | null;
  creator_name?: string | null;

  customer?: string | null;
  customer_code?: string | null;

  documentType?: string | null;
  document_type?: string | null;

  periodeRaw?: string | null;
  periode_raw?: string | null;
  periode?: string | null;

  revision?: number | string | null;

  handedTime?: string | null;
  handed_time?: string | null;

  firstDocument?: string | null;
  first_document?: string | null;

  lastDocument?: string | null;
  last_document?: string | null;

  totalQuantity?: number | string | null;
  total_quantity?: number | string | null;

  uploadDate?: string | null;
  upload_date?: string | null;

  uploadTime?: string | null;
  upload_time?: string | null;

  uploadBy?: string | null;
  upload_by?: string | null;

  status?: string | null;
  remarks?: string | null;
};

// Filters and responses

export type QuotationTrackingFilters = {
  batchId?: number | string | null;
  customer?: string;
  customers?: string[];
  periode?: string;
  revision?: string | number;
  page?: number;
  perPage?: number;
  columnFilters?: Partial<Record<QuotationTrackingKey, string[]>>;
  colorFilters?: Partial<Record<QuotationTrackingKey, string[]>>;
  sortKey?: QuotationTrackingKey | '';
  sortDirection?: QuotationTrackingSortDirection;
  signal?: AbortSignal;
};

export type QuotationTrackingNestedData = {
  total?: number;
  data?: QuotationTrackingApiRow[];
};

export type QuotationTrackingResponse = {
  status?: 'success' | 'error';
  message?: string;
  total?: number;
  server_paged?: boolean;
  page?: number;
  per_page?: number;
  total_pages?: number;

  data?:
  | QuotationTrackingApiRow[]
  | QuotationTrackingNestedData;
};

// Update

export type QuotationTrackingUpdatePayload = {
  id: number;
  field:
  QuotationTrackingUpdateField;
  value:
  string | null;
};

export type QuotationTrackingUpdateResponse = {
  status?: 'success' | 'error';
  message?: string;
  id?: number;
  field?:
  QuotationTrackingUpdateField;
  value?: string | null;
};

export type QuotationTrackingBulkUpdatePayload = {
  ids: number[];
  changes: Partial<Record<QuotationTrackingUpdateField, string | null>>;
};

export type QuotationTrackingBulkUpdateResponse = {
  status?: 'success' | 'error';
  message?: string;
  requested?: number;
  updated?: number;
};

// Sort and color

export type QuotationTrackingSortDirection =
  | 'none'
  | 'asc'
  | 'desc';

export type QuotationTrackingColorOption = {
  key: string;
  label: string;
};
