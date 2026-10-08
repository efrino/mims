import { MARKETING_API_BASE_URL as BASE_URL } from './MarketingApiConfig';
import axios from 'axios';

import type {
  ContractGetDataResponse,
  QuotationApiMode,
  QuotationDataFilter,
  QuotationExportRequest,
  QuotationGetDataResponse,
  QuotationKey,
  QuotationMode,
  QuotationRegenerateRequest,
  QuotationRegenerateResponse,
  ZsttGetDataResponse,
  QuotationAddPartPayload,
  QuotationAddPartResponse,
  QuotationAddPartOptionsResponse
} from '@/types/Marketing/Quotation';


// API

type ApiMessagePayload = {
  message?: unknown;
};

// NORMALISASI PARAMETER

const normalizeCustomer = (
  value: unknown
): string => {
  return String(value ?? '')
    .trim()
    .toUpperCase();
};

const normalizePeriod = (
  value: unknown
): string => {
  const period =
    String(value ?? '')
      .replace(/\D/g, '');

  return /^\d{6}$/.test(period)
    ? period
    : '';
};

const normalizeRevision = (
  value: unknown
): string => {
  return String(value ?? '')
    .trim();
};

const normalizeBatchId = (
  value: unknown
): number | null => {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return null;
  }

  const batchId =
    Number(value);

  return (
    Number.isInteger(batchId) &&
    batchId > 0
  )
    ? batchId
    : null;
};

const buildOptionalParams = (
  filters: QuotationDataFilter
): Record<
  string,
  string | number
> => {
  const params: Record<
    string,
    string | number
  > = {};

  const batchId =
    normalizeBatchId(
      filters.batchId
    );

  const customer =
    normalizeCustomer(
      filters.customer
    );

  const periode =
    normalizePeriod(
      filters.periode
    );

  const revision =
    normalizeRevision(
      filters.revision
    );

  if (batchId !== null) {
    params.batch_id = batchId;
  }

  if (customer !== '') {
    params.customer = customer;
  }

  if (periode !== '') {
    params.periode = periode;
  }

  /**
   * Revision "0" tetap dikirim.
   */
  if (revision !== '') {
    params.revision = revision;
  }

  if (Array.isArray(filters.customers) && filters.customers.length > 0) {
    params.customers = JSON.stringify(filters.customers);
  }

  if (filters.page && filters.page > 0) {
    params.page = Math.floor(filters.page);
  }

  if (filters.perPage && filters.perPage > 0) {
    params.per_page = Math.floor(filters.perPage);
  }

  if (filters.columnFilters && Object.keys(filters.columnFilters).length > 0) {
    params.column_filters = JSON.stringify(filters.columnFilters);
  }

  if (filters.sortKey) {
    params.sort_key = filters.sortKey;
  }

  if (filters.sortDirection && filters.sortDirection !== 'none') {
    params.sort_direction = filters.sortDirection;
  }

  return params;
};

// HELPER ERROR DAN DOWNLOAD

const getObjectMessage = (
  value: unknown
): string => {
  if (
    !value ||
    typeof value !== 'object' ||
    !('message' in value)
  ) {
    return '';
  }

  const message =
    (
      value as ApiMessagePayload
    ).message;

  return message === undefined ||
    message === null
    ? ''
    : String(message).trim();
};

const parseBlobMessage = async (
  blob: Blob
): Promise<string> => {
  try {
    const text =
      await blob.text();

    if (text.trim() === '') {
      return '';
    }

    try {
      return getObjectMessage(
        JSON.parse(text)
      );
    } catch {
      return text.trim();
    }
  } catch {
    return '';
  }
};

const getErrorMessage = async (
  error: unknown,
  fallbackMessage: string
): Promise<string> => {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error
      ? error.message
      : fallbackMessage;
  }

  const responseData =
    error.response?.data;

  if (responseData instanceof Blob) {
    return (
      await parseBlobMessage(
        responseData
      )
    ) || fallbackMessage;
  }

  return (
    getObjectMessage(responseData) ||
    error.message ||
    fallbackMessage
  );
};

const getDownloadFileName = (
  disposition: unknown,
  fallbackName: string
): string => {
  const header =
    String(disposition ?? '');

  const utf8Match =
    header.match(
      /filename\*=UTF-8''([^;]+)/i
    );

  if (utf8Match?.[1]) {
    const encodedName =
      utf8Match[1].trim();

    try {
      return decodeURIComponent(
        encodedName
      );
    } catch {
      return encodedName;
    }
  }

  const regularMatch =
    header.match(
      /filename="?([^";]+)"?/i
    );

  return regularMatch?.[1]?.trim() ||
    fallbackName;
};

const triggerBlobDownload = (
  blob: Blob,
  fileName: string
): void => {
  const blobUrl =
    URL.createObjectURL(blob);

  const anchor =
    document.createElement('a');

  anchor.href = blobUrl;
  anchor.download = fileName;
  anchor.style.display = 'none';

  document.body.appendChild(
    anchor
  );

  anchor.click();
  anchor.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(
      blobUrl
    );
  }, 1000);
};

const assertExcelBlob = async (
  blob: Blob,
  contentType: unknown
): Promise<void> => {
  const normalizedType =
    String(
      contentType ||
      blob.type ||
      ''
    ).toLowerCase();

  if (
    !normalizedType.includes(
      'application/json'
    )
  ) {
    return;
  }

  const message =
    await parseBlobMessage(blob);

  throw new Error(
    message ||
    'Backend mengembalikan JSON, bukan file Excel'
  );
};

type QuotationDownloadPayload =
  QuotationExportRequest & {
    customers?: string[];
  };

const normalizeDownloadCustomers = (
  payload: QuotationDownloadPayload
): string[] => {
  const source = Array.isArray(payload.customers)
    ? payload.customers
    : [payload.customer ?? ''];

  return Array.from(
    new Set(
      source
        .map(normalizeCustomer)
        .filter(Boolean)
    )
  );
};

const buildFallbackFileName = (
  customers: string[],
  periode: string,
  revision: string
): string => {
  if (customers.length > 1) {
    return (
      'Quotation_Contract_ZSTT_' +
      (periode || 'ALLPERIODS') +
      '_REV' +
      (revision || 'ALL') +
      '.zip'
    );
  }

  const customer = customers[0] ?? 'CUSTOMER';
  const customerFile =
    customer === 'ADM P4'
      ? 'ADM_P4_SAP'
      : customer
        .replace(
          /[^A-Z0-9]+/g,
          '_'
        )
        .replace(
          /^_+|_+$/g,
          ''
        ) ||
      'CUSTOMER';

  return (
    'Quotation_Contract_ZSTT_' +
    customerFile +
    '_' +
    (periode || 'ALLPERIODS') +
    '_REV' +
    (revision || 'ALL') +
    '.xlsx'
  );
};

/* =========================================================
 * SERVICE
 * ======================================================= */

export const quotationService = {
  /**
   * Mengambil data mode Q, Q1, Q2, atau Q3.
   */
  async getData(
    filters: QuotationDataFilter = {}
  ): Promise<QuotationGetDataResponse> {
    const params =
      buildOptionalParams(filters);

    const quotationMode:
      QuotationApiMode =
      filters.quotationMode ?? 'Q';

    params.quotation_mode =
      quotationMode;

    const response =
      await axios.get<
        QuotationGetDataResponse
      >(
        `${BASE_URL}/Quotation/getData`,
        { params, signal: filters.signal }
      );

    return response.data;
  },

  /**
   * Remote filter option. UI hanya memanggil ketika keyword >= 3 karakter.
   */
  async getFilterOptions(
    filters: QuotationDataFilter,
    mode: QuotationMode,
    column: QuotationKey,
    search: string
  ): Promise<string[]> {
    const keyword = String(search ?? '').trim();
    if (keyword.length < 3) return [];

    const params = buildOptionalParams(filters);
    params.column = column;
    params.search = keyword;

    let url = `${BASE_URL}/Quotation/filterOptions`;
    if (mode === 'CONTRACT') {
      url = `${BASE_URL}/Contract/filterOptions`;
    } else if (mode === 'ZSTT') {
      url = `${BASE_URL}/Zstt/filterOptions`;
    } else {
      params.quotation_mode = mode;
    }

    const response = await axios.get<{
      status?: 'success' | 'error';
      options?: string[];
      message?: string;
    }>(url, {
      params,
      signal: filters.signal
    });

    return Array.isArray(response.data.options)
      ? response.data.options.map((value) => String(value ?? ''))
      : [];
  },

  /**
   * Membentuk ulang Quotation, Contract, dan ZSTT.
   */
  async regenerate(
    payload: QuotationRegenerateRequest
  ): Promise<QuotationRegenerateResponse> {
    try {
      const response =
        await axios.post<
          QuotationRegenerateResponse
        >(
          `${BASE_URL}/Quotation/regenerate`,
          {
            batch_id:
              normalizeBatchId(
                payload.batchId
              ),
            customer:
              normalizeCustomer(
                payload.customer
              ),
            periode:
              normalizePeriod(
                payload.periode
              ),
            revision:
              normalizeRevision(
                payload.revision
              )
          }
        );

      return response.data;
    } catch (error: unknown) {
      throw new Error(
        await getErrorMessage(
          error,
          'Regenerate gagal'
        )
      );
    }
  },

  /**
   * Single customer menghasilkan XLSX.
   * Multi customer menghasilkan ZIP dari backend.
   * ADM P4 dan DCWA selalu dikirim sebagai customer terpisah.
   */
  async downloadExcel(
    payload: QuotationDownloadPayload
  ): Promise<string[]> {
    try {
      const customers =
        normalizeDownloadCustomers(
          payload
        );

      const periode =
        normalizePeriod(
          payload.periode
        );

      const revision =
        normalizeRevision(
          payload.revision
        );

      if (customers.length === 0) {
        throw new Error(
          'Pilih minimal satu Customer sebelum download'
        );
      }

      if (periode === '') {
        throw new Error(
          'Pilih Periode bulan sebelum download'
        );
      }

      if (revision === '') {
        throw new Error(
          'Pilih Revision sebelum download'
        );
      }

      const response =
        await axios.post<Blob>(
          `${BASE_URL}/Quotation/exportExcel`,
          {
            customer:
              customers.length === 1
                ? customers[0]
                : '',
            customers,
            periode,
            revision,
            active_mode:
              payload.activeMode ?? 'Q',
            column_filters:
              customers.length === 1
                ? payload.columnFilters ?? {}
                : {}
          },
          {
            responseType: 'blob'
          }
        );

      await assertExcelBlob(
        response.data,
        response.headers[
          'content-type'
        ]
      );

      const fallbackName =
        buildFallbackFileName(
          customers,
          periode,
          revision
        );

      const fileName =
        getDownloadFileName(
          response.headers[
            'content-disposition'
          ],
          fallbackName
        );

      triggerBlobDownload(
        response.data,
        fileName
      );

      return [fileName];
    } catch (error: unknown) {
      throw new Error(
        await getErrorMessage(
          error,
          'Download workbook gagal'
        )
      );
    }
  },

  async getContractData(
    filters: QuotationDataFilter = {}
  ): Promise<ContractGetDataResponse> {
    const response =
      await axios.get<
        ContractGetDataResponse
      >(
        `${BASE_URL}/Contract/getData`,
        {
          params:
            buildOptionalParams(
              filters
            ),
          signal: filters.signal
        }
      );

    return response.data;
  },

  async getZsttData(
    filters: QuotationDataFilter = {}
  ): Promise<ZsttGetDataResponse> {
    const response =
      await axios.get<
        ZsttGetDataResponse
      >(
        `${BASE_URL}/Zstt/getData`,
        {
          params:
            buildOptionalParams(
              filters
            ),
          signal: filters.signal
        }
      );

    return response.data;
  },

  // ============================================================
  // ADD PART QUOTATION + CONTRACT
  // ============================================================

  async addPart(
    payload:
      QuotationAddPartPayload
  ): Promise<
    QuotationAddPartResponse
  > {
    try {

      const response =
        await axios.post<
          QuotationAddPartResponse
        >(
          `${BASE_URL}/Quotation/addPart`,
          {
            batch_id:
              normalizeBatchId(
                payload.batchId
              ),

            customer:
              normalizeCustomer(
                payload.customer
              ),

            periode:
              normalizePeriod(
                payload.periode
              ),

            revision:
              payload.revision,

            material:
              String(
                payload.material ??
                ''
              )
                .trim()
                .toUpperCase(),

            order_quantity:
              Number(
                payload.orderQuantity
              ),

            remarks:
              String(
                payload.remarks ??
                ''
              ).trim()
          },
          {
            headers: {
              'Content-Type':
                'application/json'
            }
          }
        );


      return response.data;


    } catch (
    error: unknown
    ) {

      throw new Error(
        await getErrorMessage(
          error,
          'Gagal menambahkan part'
        )
      );
    }
  },

  // ============================================================
  // ADD PART OPTIONS
  // ============================================================

  async getAddPartOptions(
    params: {
      customer?: string;
      periode?: string;
    } = {}
  ): Promise<
    QuotationAddPartOptionsResponse
  > {
    const response =
      await axios.get<
        QuotationAddPartOptionsResponse
      >(
        `${BASE_URL}/Quotation/addPartOptions`,
        {
          params: {
            customer:
              params.customer ||
              undefined,

            periode:
              params.periode ||
              undefined
          }
        }
      );


    return response.data;
  },
};
