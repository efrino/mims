import { MARKETING_API_BASE_URL as BASE_URL } from './MarketingApiConfig';
import axios from 'axios';

import type {
  QuotationTrackingFilters,
  QuotationTrackingKey,
  QuotationTrackingResponse,
  QuotationTrackingUpdatePayload,
  QuotationTrackingUpdateResponse,
  QuotationTrackingBulkUpdatePayload,
  QuotationTrackingBulkUpdateResponse
} from '@/types/Marketing/QuotationTracking';

/* =========================================================
 * API
 * ======================================================= */


type ApiMessagePayload = {
  message?: unknown;
};

/* =========================================================
 * NORMALISASI
 * ======================================================= */

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

  return Number.isInteger(batchId) &&
    batchId > 0
    ? batchId
    : null;
};

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
  const period = String(
    value ?? ''
  ).replace(/\D/g, '');

  return /^\d{6}$/.test(period)
    ? period
    : '';
};

const normalizeRevision = (
  value: unknown
): string => {
  return String(value ?? '').trim();
};

const buildParams = (
  filters:
    QuotationTrackingFilters
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

  /* Revision 0 tetap harus dikirim. */
  if (revision !== '') {
    params.revision = revision;
  }

  if (Array.isArray(filters.customers) && filters.customers.length > 0) {
    params.customers = JSON.stringify(filters.customers);
  }
  if (filters.page && filters.page > 0) params.page = Math.floor(filters.page);
  if (filters.perPage && filters.perPage > 0) params.per_page = Math.floor(filters.perPage);
  if (filters.columnFilters && Object.keys(filters.columnFilters).length > 0) {
    params.column_filters = JSON.stringify(filters.columnFilters);
  }
  if (filters.colorFilters && Object.keys(filters.colorFilters).length > 0) {
    params.color_filters = JSON.stringify(filters.colorFilters);
  }
  if (filters.sortKey) params.sort_key = filters.sortKey;
  if (filters.sortDirection && filters.sortDirection !== 'none') params.sort_direction = filters.sortDirection;

  return params;
};

/* =========================================================
 * ERROR
 * ======================================================= */

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

  const message = (
    value as ApiMessagePayload
  ).message;

  return message === undefined ||
    message === null
    ? ''
    : String(message).trim();
};

const getErrorMessage = (
  error: unknown,
  fallback: string
): string => {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error
      ? error.message
      : fallback;
  }

  return (
    getObjectMessage(
      error.response?.data
    ) ||
    error.message ||
    fallback
  );
};

/* =========================================================
 * SERVICE
 * ======================================================= */

export const quotationTrackingService = {
  /**
   * Mengambil histori tracking Quotation,
   * Contract, dan ZSTT.
   */
  async getTracking(
    filters:
      QuotationTrackingFilters = {}
  ): Promise<
    QuotationTrackingResponse
  > {
    try {
      const response =
        await axios.get<
          QuotationTrackingResponse
        >(
          `${BASE_URL}/Quotation/tracking`,
          {
            params:
              buildParams(filters),
            signal: filters.signal
          }
        );

      return response.data;
    } catch (error: unknown) {
      throw new Error(
        getErrorMessage(
          error,
          'Gagal mengambil Tracking Quotation'
        )
      );
    }
  },

  async getFilterOptions(
    filters: QuotationTrackingFilters,
    column: QuotationTrackingKey,
    search: string
  ): Promise<string[]> {
    const keyword = String(search ?? '').trim();
    if (keyword.length < 3) return [];

    try {
      const params = buildParams(filters);
      params.column = column;
      params.search = keyword;

      const response = await axios.get<{
        status?: 'success' | 'error';
        options?: string[];
        message?: string;
      }>(`${BASE_URL}/Quotation/trackingFilterOptions`, {
        params,
        signal: filters.signal
      });

      return Array.isArray(response.data.options)
        ? response.data.options.map((value) => String(value ?? ''))
        : [];
    } catch (error: unknown) {
      if (axios.isCancel(error)) return [];
      throw new Error(
        getErrorMessage(error, 'Gagal mengambil pilihan filter Tracking')
      );
    }
  },

  /**
   * Mengubah satu field editable
   * pada satu baris tracking.
   */
  async updateTracking(
    payload:
      QuotationTrackingUpdatePayload
  ): Promise<
    QuotationTrackingUpdateResponse
  > {
    try {
      const response =
        await axios.post<
          QuotationTrackingUpdateResponse
        >(
          `${BASE_URL}/Quotation/updateTracking`,
          payload,
          {
            headers: {
              'Content-Type':
                'application/json'
            }
          }
        );

      return response.data;
    } catch (error: unknown) {
      throw new Error(
        getErrorMessage(
          error,
          'Gagal memperbarui Tracking Quotation'
        )
      );
    }
  },

  async bulkUpdateTracking(
    payload: QuotationTrackingBulkUpdatePayload
  ): Promise<QuotationTrackingBulkUpdateResponse> {
    try {
      const response = await axios.post<QuotationTrackingBulkUpdateResponse>(
        `${BASE_URL}/Quotation/bulkUpdateTracking`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error: unknown) {
      throw new Error(
        getErrorMessage(
          error,
          'Gagal memperbarui Tracking secara massal'
        )
      );
    }
  }
};
