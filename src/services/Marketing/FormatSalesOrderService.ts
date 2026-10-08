import { MARKETING_API_BASE_URL as BASE_URL } from './MarketingApiConfig';
import axios, { type AxiosResponse } from 'axios';

import type {
  ApiListResponse,
  FilterParams,
  FormatSalesOrderRow,
  FormatSOFilterPayload,
  RegenerateFormatSOResponse
} from '@/types/Marketing/UploadSo';

// API configuration

// Filter normalization

const normalizeFilterParams = (
  params: FilterParams
): FilterParams => {
  const normalized: FilterParams = {};

  if (params.customer) {
    normalized.customer = params.customer;
  }

  if (params.from_date) {
    normalized.from_date = params.from_date;
  }

  if (params.to_date) {
    normalized.to_date = params.to_date;
  }

  if (params.delivery_from_date) {
    normalized.delivery_from_date =
      params.delivery_from_date;
  }

  if (params.delivery_to_date) {
    normalized.delivery_to_date =
      params.delivery_to_date;
  }

  if (params.creation_from_date) {
    normalized.creation_from_date =
      params.creation_from_date;
  }

  if (params.creation_to_date) {
    normalized.creation_to_date =
      params.creation_to_date;
  }

  return normalized;
};

const FORMAT_SO_READ_CHUNK_SIZE = 500;

export type FormatServerPage = {
  status: 'success' | 'error';
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  data: FormatSalesOrderRow[];
  message?: string;
};

const FORMAT_PAGE_CACHE_TTL_MS = 30 * 60 * 1000;
// Cache dipakai untuk first paint, lalu direvalidasi diam-diam setelah 30 detik
// agar perubahan dari user/browser lain tidak tertahan sampai TTL habis.
const FORMAT_PAGE_CACHE_REVALIDATE_AFTER_MS = 30 * 1000;
const FORMAT_PAGE_CACHE_MAX_ENTRIES = 8;
const FORMAT_PAGE_CACHE_NAMESPACE = 'format-so-page-v2';

const buildFormatPageCacheKey = (params: Record<string, unknown>): string => {
  const sorted = Object.keys(params)
    .sort()
    .reduce<Record<string, unknown>>((result, key) => {
      result[key] = params[key];
      return result;
    }, {});

  return `marketing:${FORMAT_PAGE_CACHE_NAMESPACE}:${JSON.stringify(sorted)}`;
};

const readFormatPageCache = (key: string): FormatServerPage | null => {
  if (typeof window === 'undefined' || !window.sessionStorage) return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const envelope = JSON.parse(raw) as { savedAt: number; payload: FormatServerPage };
    if (Date.now() - Number(envelope?.savedAt ?? 0) > FORMAT_PAGE_CACHE_TTL_MS) {
      window.sessionStorage.removeItem(key);
      return null;
    }
    return envelope?.payload ?? null;
  } catch {
    return null;
  }
};

const formatPageCacheNeedsRevalidate = (key: string): boolean => {
  if (typeof window === 'undefined' || !window.sessionStorage) return true;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return true;
    const envelope = JSON.parse(raw) as { savedAt?: number };
    const savedAt = Number(envelope?.savedAt ?? 0);
    if (!Number.isFinite(savedAt) || savedAt <= 0) return true;
    return Date.now() - savedAt >= FORMAT_PAGE_CACHE_REVALIDATE_AFTER_MS;
  } catch {
    return true;
  }
};

const writeFormatPageCache = (key: string, payload: FormatServerPage): void => {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  try {
    window.sessionStorage.setItem(
      key,
      JSON.stringify({ savedAt: Date.now(), payload })
    );

    const entries: Array<{ key: string; savedAt: number }> = [];
    for (let index = 0; index < window.sessionStorage.length; index += 1) {
      const cacheKey = window.sessionStorage.key(index);
      if (!cacheKey || !(cacheKey.startsWith(`marketing:${FORMAT_PAGE_CACHE_NAMESPACE}:`) || cacheKey.startsWith('marketing:format-so-page:'))) continue;
      try {
        const raw = window.sessionStorage.getItem(cacheKey);
        const parsed = raw ? JSON.parse(raw) : null;
        entries.push({ key: cacheKey, savedAt: Number(parsed?.savedAt ?? 0) });
      } catch {
        window.sessionStorage.removeItem(cacheKey);
      }
    }

    entries
      .sort((first, second) => second.savedAt - first.savedAt)
      .slice(FORMAT_PAGE_CACHE_MAX_ENTRIES)
      .forEach((entry) => window.sessionStorage.removeItem(entry.key));
  } catch {
    // cache optional
  }
};


const clearFormatSalesOrderCache = (): void => {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  try {
    const keys: string[] = [];
    for (let index = 0; index < window.sessionStorage.length; index += 1) {
      const key = window.sessionStorage.key(index);
      if (!key) continue;
      if (
        key.startsWith(`marketing:${FORMAT_PAGE_CACHE_NAMESPACE}:`) ||
        key.startsWith('marketing:format-so-page:') ||
        key.startsWith('marketing-filter:format-so:')
      ) keys.push(key);
    }
    keys.forEach((key) => window.sessionStorage.removeItem(key));
  } catch {
    // Cache Format SO hanya optimasi.
  }
};

const FORMAT_FILTER_CACHE_TTL_MS = 10 * 60 * 1000;
const FORMAT_FILTER_CACHE_MAX_ENTRIES = 20;

const buildFormatFilterCacheKey = (params: Record<string, unknown>): string => {
  const sorted = Object.keys(params)
    .sort()
    .reduce<Record<string, unknown>>((result, key) => {
      result[key] = params[key];
      return result;
    }, {});
  return `marketing-filter:format-so:${JSON.stringify(sorted)}`;
};

const readFormatFilterCache = (key: string): string[] | null => {
  if (typeof window === 'undefined' || !window.sessionStorage) return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { savedAt: number; values: string[] };
    if (
      !Array.isArray(parsed?.values) ||
      Date.now() - Number(parsed?.savedAt ?? 0) > FORMAT_FILTER_CACHE_TTL_MS
    ) {
      window.sessionStorage.removeItem(key);
      return null;
    }
    return parsed.values.map((value) => String(value ?? ''));
  } catch {
    return null;
  }
};

const writeFormatFilterCache = (key: string, values: string[]): void => {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), values }));
    const entries: Array<{ key: string; savedAt: number }> = [];
    for (let index = 0; index < window.sessionStorage.length; index += 1) {
      const cacheKey = window.sessionStorage.key(index);
      if (!cacheKey || !cacheKey.startsWith('marketing-filter:format-so:')) continue;
      try {
        const raw = window.sessionStorage.getItem(cacheKey);
        const parsed = raw ? JSON.parse(raw) : null;
        entries.push({ key: cacheKey, savedAt: Number(parsed?.savedAt ?? 0) });
      } catch {
        window.sessionStorage.removeItem(cacheKey);
      }
    }
    entries
      .sort((a, b) => b.savedAt - a.savedAt)
      .slice(FORMAT_FILTER_CACHE_MAX_ENTRIES)
      .forEach((entry) => window.sessionStorage.removeItem(entry.key));
  } catch {
    // cache optional
  }
};

// Format Sales Order service

export const formatSalesOrderService = {
  clearCache(): void {
    clearFormatSalesOrderCache();
  },


  getCachedPage(
    params: FilterParams,
    customers: string[],
    page: number,
    perPage: number,
    sortKey = '',
    sortDirection = 'none',
    filters: Record<string, string[]> = {},
    search = ''
  ): FormatServerPage | null {
    const requestParams = {
      ...normalizeFilterParams(params),
      customer: [...customers]
        .map((value) => String(value ?? '').trim().toUpperCase())
        .filter(Boolean)
        .sort()
        .join(','),
      page,
      per_page: perPage,
      sort_key: sortKey,
      sort_direction: sortDirection,
      search,
      filters: Object.keys(filters).length > 0
        ? JSON.stringify(filters)
        : ''
    };
    return readFormatPageCache(buildFormatPageCacheKey(requestParams));
  },

  shouldRevalidatePage(
    params: FilterParams,
    customers: string[],
    page: number,
    perPage: number,
    sortKey = '',
    sortDirection = 'none',
    filters: Record<string, string[]> = {},
    search = ''
  ): boolean {
    const requestParams = {
      ...normalizeFilterParams(params),
      customer: [...customers]
        .map((value) => String(value ?? '').trim().toUpperCase())
        .filter(Boolean)
        .sort()
        .join(','),
      page,
      per_page: perPage,
      sort_key: sortKey,
      sort_direction: sortDirection,
      search,
      filters: Object.keys(filters).length > 0
        ? JSON.stringify(filters)
        : ''
    };

    return formatPageCacheNeedsRevalidate(
      buildFormatPageCacheKey(requestParams)
    );
  },

  async getPage(
    params: FilterParams = {},
    customers: string[] = [],
    page = 1,
    perPage = 10,
    sortKey = '',
    sortDirection = 'none',
    filters: Record<string, string[]> = {},
    search = '',
    signal?: AbortSignal
  ): Promise<FormatServerPage> {
    const requestParams = {
      ...normalizeFilterParams(params),
      customer: [...customers]
        .map((value) => String(value ?? '').trim().toUpperCase())
        .filter(Boolean)
        .sort()
        .join(','),
      page: Math.max(1, Number(page) || 1),
      per_page: [10, 20, 50, 100].includes(Number(perPage))
        ? Number(perPage)
        : 10,
      sort_key: sortKey,
      sort_direction: sortDirection,
      search,
      filters: Object.keys(filters).length > 0
        ? JSON.stringify(filters)
        : ''
    };

    const response = await axios.get<FormatServerPage>(
      `${BASE_URL}/FormatSalesOrder/getPage`,
      {
        params: requestParams,
        signal
      }
    );

    if (response.data.status === 'success') {
      writeFormatPageCache(
        buildFormatPageCacheKey(requestParams),
        response.data
      );
    }

    return response.data;
  },

  async prefetchPage(
    params: FilterParams,
    customers: string[],
    page: number,
    perPage: number,
    sortKey = '',
    sortDirection = 'none',
    filters: Record<string, string[]> = {},
    search = ''
  ): Promise<void> {
    if (page <= 1) return;
    if (
      this.getCachedPage(
        params,
        customers,
        page,
        perPage,
        sortKey,
        sortDirection,
        filters,
        search
      )
    ) {
      return;
    }

    try {
      await this.getPage(
        params,
        customers,
        page,
        perPage,
        sortKey,
        sortDirection,
        filters,
        search
      );
    } catch {
      // prefetch optional
    }
  },

  async searchFilterOptions(
    params: FilterParams,
    customers: string[],
    column: string,
    search: string,
    filters: Record<string, string[]> = {},
    signal?: AbortSignal
  ): Promise<string[]> {
    const requestParams = {
      ...normalizeFilterParams(params),
      customer: [...customers]
        .map((value) => String(value ?? '').trim().toUpperCase())
        .filter(Boolean)
        .sort()
        .join(','),
      column: String(column ?? '').trim(),
      search: String(search ?? '').trim(),
      filters: Object.keys(filters).length > 0
        ? JSON.stringify(filters)
        : '',
      limit: 100
    };

    const cacheKey = buildFormatFilterCacheKey(requestParams);
    const cached = readFormatFilterCache(cacheKey);
    if (cached) return cached;

    const response = await axios.get<{
      status: 'success' | 'error';
      data: string[];
      message?: string;
    }>(`${BASE_URL}/FormatSalesOrder/filterOptions`, {
      params: requestParams,
      signal
    });

    const values = Array.isArray(response.data?.data)
      ? response.data.data.map((value) => String(value ?? ''))
      : [];
    if (response.data?.status === 'success') {
      writeFormatFilterCache(cacheKey, values);
    }
    return values;
  },

  // Get Format Sales Order Data - Active Only

  async getData(
    params: FilterParams = {}
  ): Promise<FormatSalesOrderRow[]> {
    const result: FormatSalesOrderRow[] = [];
    let offset = 0;

    while (true) {
      const response = await axios.get<
        | FormatSalesOrderRow[]
        | (ApiListResponse<FormatSalesOrderRow> & {
            has_more?: boolean;
          })
      >(
        `${BASE_URL}/FormatSalesOrder/getData`,
        {
          params: {
            ...normalizeFilterParams(params),
            limit: FORMAT_SO_READ_CHUNK_SIZE,
            offset
          }
        }
      );

      const payload = response.data;
      const rows = Array.isArray(payload)
        ? payload
        : (payload.data ?? []);

      if (rows.length === 0) {
        break;
      }

      result.push(...rows);
      offset += rows.length;

      const hasMore =
        !Array.isArray(payload) &&
        typeof payload.has_more === 'boolean'
          ? payload.has_more
          : null;

      if (hasMore === false || rows.length < FORMAT_SO_READ_CHUNK_SIZE) {
        break;
      }
    }

    return result;
  },

  // Preflight Download Format Sales Order. Backend hanya melakukan COUNT(*)
  // per customer dan mengembalikan customer yang benar-benar tersedia.
  async getDownloadPreflight(
    payload: FormatSOFilterPayload & {
      format_ids?: number[];
      selected_only?: boolean;
    }
  ): Promise<{
    status: 'success' | 'error';
    total: number;
    by_customer: Record<string, number>;
    available_customers: string[];
    unavailable_customers: string[];
    estimated_files: number;
    chunk_rows: number;
    requested_total?: number;
    missing_total?: number;
    message?: string;
  }> {
    const response = await axios.post(
      `${BASE_URL}/FormatSalesOrder/downloadPreflight`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  },

  // Download Format Sales Order - Active Only

  async downloadExcel(
    payload: FormatSOFilterPayload
  ): Promise<AxiosResponse<Blob>> {
    return axios.post<Blob>(
      `${BASE_URL}/FormatSalesOrder/downloadExcel`,
      payload,
      {
        responseType: 'blob',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  },

  // Regenerate Format Sales Order

  async regenerate(
    customer = '',
    batchIds: string[] = [],
    rawScope: Record<string, unknown> | null = null,
    formatScope: Record<string, unknown> | null = null
  ): Promise<RegenerateFormatSOResponse> {
    const response =
      await axios.post<RegenerateFormatSOResponse>(
        `${BASE_URL}/CustomerOrder/regenerateFormatSalesOrder`,
        {
          customer,
          batch_ids: batchIds,
          ...(rawScope ? { raw_scope: rawScope } : {}),
          ...(formatScope ? { format_scope: formatScope } : {})
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

    if (response.data?.status === 'success') {
      clearFormatSalesOrderCache();
    }
    return response.data;
  }
};
