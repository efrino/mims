import { MARKETING_API_BASE_URL as BASE_URL } from './MarketingApiConfig';
import axios, { type AxiosResponse } from 'axios';

import type {
  ApiListResponse,
  ExcelPreviewResponse,
  FilterParams,
  FormatSalesOrderRow,
  RawCustomerOrderBackendRow,
  RawFilesExcelPayload,
  TrackingBackendRow,
  TrackingUpdatePayload,
  TrackingUpdateResponse,
  TrackingBulkUpdatePayload,
  TrackingBulkUpdateResponse,
  UploadResponse,
  DnCrosscheckResponse,
  DnRegisterPayload,
  DnRegisterResponse,
  DnAllStatusResponse,
  DnDeleteRegisterPayload,
  DnDeleteRegisterResponse,
  DnMonitoringReportPayload,
  DnMonitoringPreviewResponse,

  RawCancelPayload,
  RawCancelResponse,
  RawRestorePayload,
  RawRestoreResponse,
  CancelListParams,
  CancelListResponse,
  CancelListPageResponse,
  CancelLifecycleCountsResponse,
  CancelledRawRow,
  CancelHistoryRow,
  CancelledDnRow,
  TmminRawSoBackendRow,
  TmminRawSoPreviewResponse,
  TmminRawSoUploadResponse,
  NtcRawSoBackendRow,
  NtcRawSoPreviewResponse,
  NtcRawSoUploadResponse,
  DpmRawSoBackendRow,
  DpmRawSoPreviewResponse,
  DpmRawSoUploadResponse,
  FtiRawSoBackendRow,
  FtiRawSoPreviewResponse,
  FtiRawSoUploadResponse,
  MesRawSoBackendRow,
  MesRawSoPreviewResponse,
  MesRawSoUploadResponse,
  FtiAdditionalOrderPreviewResponse,
  FtiAdditionalOrderUploadResponse,
  FtiAdditionalManualOptionsResponse,
  FtiAdditionalManualInputItem,
  FtiAdditionalOrderAllocationItem,
  GayaRawSoBackendRow,
  GayaRawSoPreviewResponse,
  GayaRawSoUploadResponse,
  AsiAdmRawSoBackendRow,
  AsiAdmRawSoInspectResponse,
  AsiAdmRawSoPreviewResponse,
  AsiAdmRawSoUploadResponse,
  ContractPreviewPartsResponse,
  DcwaRawSoBackendRow,
  DcwaRawSoPreviewResponse,
  DcwaRawSoUploadResponse
} from '@/types/Marketing/UploadSo';

// API CONFIGURATION

// FILTER NORMALIZER

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

/*
 * Satu request tabel tidak lagi meminta seluruh dataset dari PHP.
 * Service membaca database bertahap lalu menggabungkannya di browser agar
 * seluruh fitur filter/search/sort existing tetap 100% kompatibel.
 */
const DATABASE_READ_CHUNK_SIZE = 500;
const DN_READ_CHUNK_SIZE = 250;

export type ServerPageResponse<T> = {
  status: 'success' | 'error';
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  data: T[];
  message?: string;
};

export type DnGapDetailResponse = {
  status: 'success' | 'error';
  total: number;
  data: DnAllStatusResponse['data'][number][];
  message?: string;
  error_code?: string;
};

const PAGE_CACHE_TTL_MS = 30 * 60 * 1000;
// Cache tetap dipakai untuk first paint/F5, tetapi setelah 30 detik data
// direvalidasi diam-diam agar perubahan dari browser/user lain tidak tertahan
// sampai TTL 30 menit habis.
const PAGE_CACHE_REVALIDATE_AFTER_MS = 30 * 1000;
const PAGE_CACHE_MAX_ENTRIES = 18;
const DN_PAGE_CACHE_MAX_ENTRIES = 12;
const DN_SUMMARY_CACHE_MAX_ENTRIES = 6;

/*
 * Cache DN dibuat versioned agar cache Open/Close/summary dari revisi lama
 * tidak ikut terbaca setelah deploy. Ini penting karena sessionStorage tetap
 * bertahan saat user menekan F5.
 */
const RAW_PAGE_CACHE_NAMESPACE = 'raw-source-page-v2';
const TRACKING_PAGE_CACHE_NAMESPACE = 'tracking-page-v1';
const DN_PAGE_CACHE_NAMESPACE = 'dn-status-page-v4';
const DN_SUMMARY_CACHE_NAMESPACE = 'dn-status-summary-v4';

type PageCacheEnvelope<T> = {
  savedAt: number;
  payload: ServerPageResponse<T>;
};

const buildPageCacheKey = (
  namespace: string,
  params: Record<string, unknown>
): string => {
  const sorted = Object.keys(params)
    .sort()
    .reduce<Record<string, unknown>>((result, key) => {
      result[key] = params[key];
      return result;
    }, {});

  return `marketing:${namespace}:${JSON.stringify(sorted)}`;
};

const readPageCache = <T>(key: string): ServerPageResponse<T> | null => {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;

    const envelope = JSON.parse(raw) as PageCacheEnvelope<T>;
    if (
      !envelope ||
      !envelope.payload ||
      Date.now() - Number(envelope.savedAt ?? 0) > PAGE_CACHE_TTL_MS
    ) {
      window.sessionStorage.removeItem(key);
      return null;
    }

    return envelope.payload;
  } catch {
    return null;
  }
};

const pageCacheNeedsRevalidate = (
  key: string,
  maxAgeMs = PAGE_CACHE_REVALIDATE_AFTER_MS
): boolean => {
  if (typeof window === 'undefined' || !window.sessionStorage) return true;

  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return true;

    const envelope = JSON.parse(raw) as { savedAt?: number };
    const savedAt = Number(envelope?.savedAt ?? 0);
    if (!Number.isFinite(savedAt) || savedAt <= 0) return true;

    return Date.now() - savedAt >= Math.max(0, Number(maxAgeMs) || 0);
  } catch {
    return true;
  }
};

const isDnStatusPageCacheKey = (key: string): boolean =>
  key.startsWith(`marketing:${DN_PAGE_CACHE_NAMESPACE}:`) ||
  key.startsWith('marketing:dn-status-page:');

const isDnStatusSummaryCacheKey = (key: string): boolean =>
  key.startsWith(`marketing:${DN_SUMMARY_CACHE_NAMESPACE}:`) ||
  key.startsWith('marketing:dn-status-summary:');

const isDnStatusCacheKey = (key: string): boolean =>
  isDnStatusPageCacheKey(key) || isDnStatusSummaryCacheKey(key);

const pruneDnStatusPageCache = (): void => {
  if (typeof window === 'undefined' || !window.sessionStorage) return;

  try {
    const entries: Array<{ key: string; savedAt: number }> = [];

    for (let index = 0; index < window.sessionStorage.length; index += 1) {
      const key = window.sessionStorage.key(index);
      if (!key || !isDnStatusPageCacheKey(key)) continue;

      try {
        const raw = window.sessionStorage.getItem(key);
        const parsed = raw ? JSON.parse(raw) : null;
        entries.push({ key, savedAt: Number(parsed?.savedAt ?? 0) });
      } catch {
        window.sessionStorage.removeItem(key);
      }
    }

    entries
      .sort((first, second) => second.savedAt - first.savedAt)
      .slice(DN_PAGE_CACHE_MAX_ENTRIES)
      .forEach((entry) => window.sessionStorage.removeItem(entry.key));
  } catch {
    // Cache DN hanya optimasi.
  }
};

const pruneDnStatusSummaryCache = (): void => {
  if (typeof window === 'undefined' || !window.sessionStorage) return;

  try {
    const entries: Array<{ key: string; savedAt: number }> = [];

    for (let index = 0; index < window.sessionStorage.length; index += 1) {
      const key = window.sessionStorage.key(index);
      if (!key || !isDnStatusSummaryCacheKey(key)) continue;

      try {
        const raw = window.sessionStorage.getItem(key);
        const parsed = raw ? JSON.parse(raw) : null;
        entries.push({ key, savedAt: Number(parsed?.savedAt ?? 0) });
      } catch {
        window.sessionStorage.removeItem(key);
      }
    }

    entries
      .sort((first, second) => second.savedAt - first.savedAt)
      .slice(DN_SUMMARY_CACHE_MAX_ENTRIES)
      .forEach((entry) => window.sessionStorage.removeItem(entry.key));
  } catch {
    // Cache summary DN hanya optimasi.
  }
};

const pruneMarketingPageCache = (): void => {
  if (typeof window === 'undefined' || !window.sessionStorage) return;

  try {
    const entries: Array<{ key: string; savedAt: number }> = [];

    for (let index = 0; index < window.sessionStorage.length; index += 1) {
      const key = window.sessionStorage.key(index);
      if (
        !key ||
        !key.startsWith('marketing:') ||
        isDnStatusCacheKey(key)
      ) {
        continue;
      }

      try {
        const raw = window.sessionStorage.getItem(key);
        const parsed = raw ? JSON.parse(raw) : null;
        entries.push({
          key,
          savedAt: Number(parsed?.savedAt ?? 0)
        });
      } catch {
        window.sessionStorage.removeItem(key);
      }
    }

    entries
      .sort((first, second) => second.savedAt - first.savedAt)
      .slice(PAGE_CACHE_MAX_ENTRIES)
      .forEach((entry) => window.sessionStorage.removeItem(entry.key));
  } catch {
    // Cache hanya optimasi.
  }
};

const writePageCache = <T>(
  key: string,
  payload: ServerPageResponse<T>
): void => {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return;
  }

  try {
    const envelope: PageCacheEnvelope<T> = {
      savedAt: Date.now(),
      payload
    };
    window.sessionStorage.setItem(key, JSON.stringify(envelope));

    if (isDnStatusSummaryCacheKey(key)) {
      pruneDnStatusSummaryCache();
    } else if (isDnStatusPageCacheKey(key)) {
      pruneDnStatusPageCache();
    } else {
      pruneMarketingPageCache();
    }
  } catch {
    // Cache hanya optimasi. Quota/storage error tidak boleh menggagalkan UI.
  }
};

type DnSummaryPayload = {
  status: 'success' | 'error';
  data?: {
    total: number;
    found: number;
    not_found: number;
    open: number;
    close: number;
  };
  message?: string;
};

const isValidDnSummaryPayload = (payload: DnSummaryPayload | null): boolean => {
  if (payload?.status !== 'success' || !payload.data) return false;

  const total = Number(payload.data.total);
  const found = Number(payload.data.found);
  const notFound = Number(payload.data.not_found);
  const open = Number(payload.data.open);
  const close = Number(payload.data.close);
  const values = [total, found, notFound, open, close];

  if (values.some((value) => !Number.isFinite(value) || value < 0)) {
    return false;
  }

  /*
   * Endpoint ini khusus Check All DN. Seluruh row berasal dari Raw Files,
   * jadi semuanya FOUND dan tidak ada NOT_FOUND. Validasi dibuat lebih ketat
   * supaya payload/cache lama seperti:
   * Total 11.047, Found 0, Not Found 11.047, Open 0, Close 0
   * tidak pernah dianggap valid hanya karena secara aritmetika seimbang.
   */
  return (
    found === total &&
    notFound === 0 &&
    open + close === total
  );
};

const readDnSummaryCache = (key: string): DnSummaryPayload | null => {
  const payload = readPageCache<any>(key) as unknown as DnSummaryPayload | null;

  if (payload && !isValidDnSummaryPayload(payload)) {
    try {
      window.sessionStorage?.removeItem(key);
    } catch {
      // Cache invalid cukup diabaikan.
    }
    return null;
  }

  return payload;
};

const writeDnSummaryCache = (key: string, payload: DnSummaryPayload): void => {
  if (!isValidDnSummaryPayload(payload)) return;
  writePageCache<any>(key, payload as any);
};

const FILTER_OPTION_CACHE_TTL_MS = 10 * 60 * 1000;
const FILTER_OPTION_CACHE_MAX_ENTRIES = 30;

type FilterOptionCacheEnvelope = {
  savedAt: number;
  values: string[];
};

const readFilterOptionCache = (key: string): string[] | null => {
  if (typeof window === 'undefined' || !window.sessionStorage) return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FilterOptionCacheEnvelope;
    if (
      !parsed ||
      !Array.isArray(parsed.values) ||
      Date.now() - Number(parsed.savedAt ?? 0) > FILTER_OPTION_CACHE_TTL_MS
    ) {
      window.sessionStorage.removeItem(key);
      return null;
    }
    return parsed.values.map((value) => String(value ?? ''));
  } catch {
    return null;
  }
};

const writeFilterOptionCache = (key: string, values: string[]): void => {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  try {
    window.sessionStorage.setItem(
      key,
      JSON.stringify({ savedAt: Date.now(), values })
    );

    const entries: Array<{ key: string; savedAt: number }> = [];
    for (let index = 0; index < window.sessionStorage.length; index += 1) {
      const entryKey = window.sessionStorage.key(index);
      if (!entryKey || !entryKey.startsWith('marketing-filter:')) continue;
      try {
        const raw = window.sessionStorage.getItem(entryKey);
        const parsed = raw ? JSON.parse(raw) : null;
        entries.push({ key: entryKey, savedAt: Number(parsed?.savedAt ?? 0) });
      } catch {
        window.sessionStorage.removeItem(entryKey);
      }
    }

    entries
      .sort((first, second) => second.savedAt - first.savedAt)
      .slice(FILTER_OPTION_CACHE_MAX_ENTRIES)
      .forEach((entry) => window.sessionStorage.removeItem(entry.key));
  } catch {
    // Cache suggestion hanya optimasi.
  }
};

const TRACKING_FILTER_CACHE_TTL_MS = 10 * 60 * 1000;
const TRACKING_FILTER_CACHE_MAX_ENTRIES = 16;

type TrackingFilterOptionCacheEnvelope = {
  savedAt: number;
  values: string[];
  hasMore: boolean;
};

const readTrackingFilterOptionCache = (
  key: string
): { data: string[]; has_more: boolean } | null => {
  if (typeof window === 'undefined' || !window.sessionStorage) return null;

  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as TrackingFilterOptionCacheEnvelope;
    if (
      !parsed ||
      !Array.isArray(parsed.values) ||
      Date.now() - Number(parsed.savedAt ?? 0) > TRACKING_FILTER_CACHE_TTL_MS
    ) {
      window.sessionStorage.removeItem(key);
      return null;
    }

    return {
      data: parsed.values.map((value) => String(value ?? '')),
      has_more: Boolean(parsed.hasMore)
    };
  } catch {
    return null;
  }
};

const writeTrackingFilterOptionCache = (
  key: string,
  values: string[],
  hasMore: boolean
): void => {
  if (typeof window === 'undefined' || !window.sessionStorage) return;

  try {
    window.sessionStorage.setItem(
      key,
      JSON.stringify({
        savedAt: Date.now(),
        values,
        hasMore
      })
    );

    const entries: Array<{ key: string; savedAt: number }> = [];
    for (let index = 0; index < window.sessionStorage.length; index += 1) {
      const entryKey = window.sessionStorage.key(index);
      if (!entryKey || !entryKey.startsWith('marketing-filter:tracking:')) {
        continue;
      }

      try {
        const raw = window.sessionStorage.getItem(entryKey);
        const parsed = raw ? JSON.parse(raw) : null;
        entries.push({
          key: entryKey,
          savedAt: Number(parsed?.savedAt ?? 0)
        });
      } catch {
        window.sessionStorage.removeItem(entryKey);
      }
    }

    entries
      .sort((first, second) => second.savedAt - first.savedAt)
      .slice(TRACKING_FILTER_CACHE_MAX_ENTRIES)
      .forEach((entry) => window.sessionStorage.removeItem(entry.key));
  } catch {
    // Cache filter Tracking hanya optimasi.
  }
};

const clearDnStatusCache = (): void => {
  if (typeof window === 'undefined' || !window.sessionStorage) return;

  try {
    const keys: string[] = [];
    for (let index = 0; index < window.sessionStorage.length; index += 1) {
      const key = window.sessionStorage.key(index);
      if (!key) continue;
      if (
        isDnStatusCacheKey(key) ||
        key.startsWith('marketing-filter:dn:')
      ) {
        keys.push(key);
      }
    }
    keys.forEach((key) => window.sessionStorage.removeItem(key));
  } catch {
    // Cache DN hanya optimasi.
  }
};


const clearTrackingPageCache = (): void => {
  if (typeof window === 'undefined' || !window.sessionStorage) return;

  try {
    const keys: string[] = [];
    for (let index = 0; index < window.sessionStorage.length; index += 1) {
      const key = window.sessionStorage.key(index);
      if (!key) continue;
      if (
        key.startsWith(`marketing:${TRACKING_PAGE_CACHE_NAMESPACE}:`) ||
        key.startsWith('marketing:tracking-page:') ||
        key.startsWith('marketing-filter:tracking:')
      ) {
        keys.push(key);
      }
    }
    keys.forEach((key) => window.sessionStorage.removeItem(key));
  } catch {
    // Cache Tracking hanya optimasi.
  }
};


const clearRawSourceCache = (): void => {
  if (typeof window === 'undefined' || !window.sessionStorage) return;

  try {
    const keys: string[] = [];
    for (let index = 0; index < window.sessionStorage.length; index += 1) {
      const key = window.sessionStorage.key(index);
      if (!key) continue;
      if (
        key.startsWith(`marketing:${RAW_PAGE_CACHE_NAMESPACE}:`) ||
        key.startsWith('marketing:raw-source-page:') ||
        key.startsWith('marketing-filter:raw:') ||
        key.startsWith('marketing:format-so-page:') ||
        key.startsWith('marketing:format-so-page-v2:') ||
        key.startsWith('marketing-filter:format-so:')
      ) {
        keys.push(key);
      }
    }
    keys.forEach((key) => window.sessionStorage.removeItem(key));
  } catch {
    // Cache Raw hanya optimasi.
  }

  // Raw baru/cancel/restore juga dapat mengubah Tracking yang tampil.
  // Cache Tracking dibuang di satu tempat supaya upload dari flow customer
  // mana pun tidak meninggalkan page lama setelah refresh/F5.
  clearTrackingPageCache();

  // Perubahan Raw dapat mengubah logical DN Open/Close dan summary. Karena
  // semua upload/cancel/restore/delete sudah memanggil clearRawSourceCache(),
  // invalidasi DN dilakukan di satu tempat agar hasil DN tidak stale.
  clearDnStatusCache();
};

const buildFilterOptionCacheKey = (
  namespace: string,
  params: Record<string, unknown>
): string => {
  const sorted = Object.keys(params)
    .sort()
    .reduce<Record<string, unknown>>((result, key) => {
      result[key] = params[key];
      return result;
    }, {});
  return `marketing-filter:${namespace}:${JSON.stringify(sorted)}`;
};

type GridQueryOptions = {
  filters?: Record<string, string[]>;
  sortKey?: string;
  sortDirection?: 'none' | 'asc' | 'desc' | string;
};

type PagedListPayload<T> =
  | T[]
  | (ApiListResponse<T> & {
      has_more?: boolean;
      limit?: number;
      offset?: number;
    });

const getPayloadRows = <T>(
  payload: PagedListPayload<T>
): T[] => {
  if (Array.isArray(payload)) {
    return payload;
  }

  return Array.isArray(payload?.data)
    ? payload.data
    : [];
};

const fetchOffsetPagedRows = async <T>(
  url: string,
  params: FilterParams = {},
  chunkSize = DATABASE_READ_CHUNK_SIZE
): Promise<T[]> => {
  const result: T[] = [];
  let offset = 0;

  while (true) {
    const response = await axios.get<PagedListPayload<T>>(
      url,
      {
        params: {
          ...normalizeFilterParams(params),
          limit: chunkSize,
          offset
        }
      }
    );

    const rows = getPayloadRows<T>(response.data);

    if (rows.length === 0) {
      break;
    }

    result.push(...rows);
    offset += rows.length;

    const payload = response.data;
    const backendHasMore =
      !Array.isArray(payload) &&
      typeof payload.has_more === 'boolean'
        ? payload.has_more
        : null;

    if (backendHasMore === false || rows.length < chunkSize) {
      break;
    }
  }

  return result;
};

const normalizeCancelListParams = (
  params: CancelListParams
): CancelListParams => {
  const normalized: CancelListParams = {};

  if (
    Array.isArray(params.customers) &&
    params.customers.length > 0
  ) {
    normalized.customers = params.customers;
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

  if (Number.isFinite(Number(params.page)) && Number(params.page) > 0) {
    normalized.page = Math.max(1, Number(params.page));
  }

  if (Number.isFinite(Number(params.per_page)) && Number(params.per_page) > 0) {
    normalized.per_page = Math.max(1, Math.min(100, Number(params.per_page)));
  }

  return normalized;
};

// CUSTOMER ORDER SERVICE

export const customerOrderService = {
  clearRawSourceCache(): void {
    clearRawSourceCache();
  },

  clearTrackingCache(): void {
    clearTrackingPageCache();
  },

  // CUSTOMER FILTER OPTIONS - DYNAMIC FROM DATABASE

  async getAvailableCustomers(): Promise<string[]> {
    const response = await axios.get<
      | string[]
      | ApiListResponse<string>
    >(
      `${BASE_URL}/CustomerOrder/customerOptions`
    );

    if (Array.isArray(response.data)) {
      return response.data;
    }

    return response.data.data ?? [];
  },

  // SERVER-SIDE PAGE RAW SO + SESSION CACHE

  getCachedRawSourcePage<T>(
    source: string,
    params: FilterParams,
    page: number,
    perPage: number,
    query: GridQueryOptions = {}
  ): ServerPageResponse<T> | null {
    const filters = query.filters ?? {};
    const requestParams = {
      source: String(source ?? '').trim().toUpperCase(),
      ...normalizeFilterParams(params),
      page,
      per_page: perPage,
      sort_key: String(query.sortKey ?? ''),
      sort_direction: String(query.sortDirection ?? 'none'),
      filters: Object.keys(filters).length > 0
        ? JSON.stringify(filters)
        : ''
    };

    return readPageCache<T>(
      buildPageCacheKey(RAW_PAGE_CACHE_NAMESPACE, requestParams)
    );
  },

  shouldRevalidateRawSourcePage(
    source: string,
    params: FilterParams,
    page: number,
    perPage: number,
    query: GridQueryOptions = {}
  ): boolean {
    const filters = query.filters ?? {};
    const requestParams = {
      source: String(source ?? '').trim().toUpperCase(),
      ...normalizeFilterParams(params),
      page,
      per_page: perPage,
      sort_key: String(query.sortKey ?? ''),
      sort_direction: String(query.sortDirection ?? 'none'),
      filters: Object.keys(filters).length > 0
        ? JSON.stringify(filters)
        : ''
    };

    return pageCacheNeedsRevalidate(
      buildPageCacheKey(RAW_PAGE_CACHE_NAMESPACE, requestParams)
    );
  },

  async getRawSourcePage<T>(
    source: string,
    params: FilterParams = {},
    page = 1,
    perPage = 10,
    query: GridQueryOptions = {},
    signal?: AbortSignal
  ): Promise<ServerPageResponse<T>> {
    const filters = query.filters ?? {};
    const requestParams = {
      source: String(source ?? '').trim().toUpperCase(),
      ...normalizeFilterParams(params),
      page: Math.max(1, Number(page) || 1),
      per_page: [10, 20, 50, 100].includes(Number(perPage))
        ? Number(perPage)
        : 10,
      sort_key: String(query.sortKey ?? ''),
      sort_direction: String(query.sortDirection ?? 'none'),
      filters: Object.keys(filters).length > 0
        ? JSON.stringify(filters)
        : ''
    };

    const response = await axios.get<ServerPageResponse<T>>(
      `${BASE_URL}/CustomerOrder/rawSourcePage`,
      {
        params: requestParams,
        signal
      }
    );

    if (response.data.status === 'success') {
      writePageCache(
        buildPageCacheKey(RAW_PAGE_CACHE_NAMESPACE, requestParams),
        response.data
      );
    }

    return response.data;
  },

  async prefetchRawSourcePage<T>(
    source: string,
    params: FilterParams,
    page: number,
    perPage: number,
    query: GridQueryOptions = {}
  ): Promise<void> {
    if (page <= 1) return;
    if (this.getCachedRawSourcePage(source, params, page, perPage, query)) {
      return;
    }

    try {
      await this.getRawSourcePage(source, params, page, perPage, query);
    } catch {
      // Prefetch tidak boleh memunculkan error ke user.
    }
  },

  async searchRawSourceFilterOptions(
    source: string,
    column: string,
    search: string,
    params: FilterParams = {},
    filters: Record<string, string[]> = {},
    signal?: AbortSignal
  ): Promise<string[]> {
    const requestParams = {
      source: String(source ?? '').trim().toUpperCase(),
      column: String(column ?? '').trim(),
      search: String(search ?? '').trim(),
      ...normalizeFilterParams(params),
      filters: Object.keys(filters).length > 0
        ? JSON.stringify(filters)
        : '',
      limit: 100
    };

    const cacheKey = buildFilterOptionCacheKey('raw', requestParams);
    const cached = readFilterOptionCache(cacheKey);
    if (cached) return cached;

    const response = await axios.get<{
      status: 'success' | 'error';
      data: string[];
      message?: string;
    }>(`${BASE_URL}/CustomerOrder/rawSourceFilterOptions`, {
      params: requestParams,
      signal
    });

    const values = Array.isArray(response.data?.data)
      ? response.data.data.map((value) => String(value ?? ''))
      : [];

    if (response.data?.status === 'success') {
      writeFilterOptionCache(cacheKey, values);
    }
    return values;
  },

  // GET RAW FILES - ACTIVE ONLY

  async getRawFiles(
    params: FilterParams = {}
  ): Promise<RawCustomerOrderBackendRow[]> {
    return fetchOffsetPagedRows<RawCustomerOrderBackendRow>(
      `${BASE_URL}/CustomerOrder`,
      params
    );
  },

  // Total download Raw SO untuk All Customer. Backend hanya menjalankan
  // COUNT(*) per tabel sehingga tidak mengirim seluruh row ke browser.
  async getRawDownloadCount(
    params: FilterParams = {}
  ): Promise<{
    total: number;
    by_customer: Record<string, number>;
  }> {
    const response = await axios.get<{
      status: string;
      data: {
        total: number;
        by_customer: Record<string, number>;
      };
    }>(
      `${BASE_URL}/CustomerOrder/rawDownloadCount`,
      {
        params: normalizeFilterParams(params)
      }
    );

    return {
      total: Number(response.data?.data?.total ?? 0),
      by_customer: response.data?.data?.by_customer ?? {}
    };
  },


  // ==========================================================
  // GET RAW SALES ORDER TMMIN
  // ==========================================================

  async getTmminRawSo(
    params: FilterParams = {}
  ): Promise<TmminRawSoBackendRow[]> {
    return fetchOffsetPagedRows<TmminRawSoBackendRow>(
      `${BASE_URL}/CustomerOrder/tmminRawSo`,
      params
    );
  },

  // ==========================================================
  // UPLOAD RAW SALES ORDER TMMIN TXT
  // ==========================================================

  async uploadTmminRawSo(
    formData: FormData
  ): Promise<TmminRawSoUploadResponse> {
    const response =
      await axios.post<TmminRawSoUploadResponse>(
        `${BASE_URL}/CustomerOrder/uploadTmminRawSo`,
        formData
      );

    if ((response.data as any)?.status === 'success') {
      clearRawSourceCache();
    }
    return response.data;
  },

  // ==========================================================
  // PREVIEW RAW SALES ORDER TMMIN TXT
  // ==========================================================

  async previewTmminRawSo(
    formData: FormData
  ): Promise<TmminRawSoPreviewResponse> {
    const response =
      await axios.post<TmminRawSoPreviewResponse>(
        `${BASE_URL}/CustomerOrder/previewTmminRawSo`,
        formData
      );

    return response.data;
  },

  // ==========================================================
  // RAW SALES ORDER NTC CSV
  // ==========================================================

  async getNtcRawSo(
    params: FilterParams = {}
  ): Promise<NtcRawSoBackendRow[]> {
    return fetchOffsetPagedRows<NtcRawSoBackendRow>(
      `${BASE_URL}/CustomerOrder/ntcRawSo`,
      params
    );
  },

  async previewNtcRawSo(
    formData: FormData
  ): Promise<NtcRawSoPreviewResponse> {
    const response =
      await axios.post<NtcRawSoPreviewResponse>(
        `${BASE_URL}/CustomerOrder/previewNtcRawSo`,
        formData
      );

    return response.data;
  },

  async uploadNtcRawSo(
    formData: FormData
  ): Promise<NtcRawSoUploadResponse> {
    const response =
      await axios.post<NtcRawSoUploadResponse>(
        `${BASE_URL}/CustomerOrder/uploadNtcRawSo`,
        formData
      );

    if ((response.data as any)?.status === 'success') {
      clearRawSourceCache();
    }
    return response.data;
  },

  // ==========================================================
  // RAW SALES ORDER FTI (GENERATE FROM ZSTT)
  // ==========================================================

  async getMesRawSo(
    params: FilterParams = {}
  ): Promise<MesRawSoBackendRow[]> {
    return fetchOffsetPagedRows<MesRawSoBackendRow>(
      `${BASE_URL}/CustomerOrder/mesRawSo`,
      params
    );
  },

  async previewMesRawSo(formData: FormData): Promise<MesRawSoPreviewResponse> {
    const response = await axios.post<MesRawSoPreviewResponse>(
      `${BASE_URL}/CustomerOrder/previewMesRawSo`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },

  async uploadMesRawSo(formData: FormData): Promise<MesRawSoUploadResponse> {
    const response = await axios.post<MesRawSoUploadResponse>(
      `${BASE_URL}/CustomerOrder/uploadMesRawSo`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    if ((response.data as any)?.status === 'success') {
      clearRawSourceCache();
    }
    return response.data;
  },

  async getFtiRawSo(
    params: FilterParams = {}
  ): Promise<FtiRawSoBackendRow[]> {
    return fetchOffsetPagedRows<FtiRawSoBackendRow>(
      `${BASE_URL}/CustomerOrder/ftiRawSo`,
      params
    );
  },

  async previewFtiRawSo(payload: { upload_period: string }): Promise<FtiRawSoPreviewResponse> {
    const response = await axios.post<FtiRawSoPreviewResponse>(
      `${BASE_URL}/CustomerOrder/previewFtiRawSo`,
      payload
    );
    return response.data;
  },

  async uploadFtiRawSo(payload: { upload_period: string; upload_by: string }): Promise<FtiRawSoUploadResponse> {
    const response = await axios.post<FtiRawSoUploadResponse>(
      `${BASE_URL}/CustomerOrder/uploadFtiRawSo`,
      payload
    );
    if ((response.data as any)?.status === 'success') {
      clearRawSourceCache();
    }
    return response.data;
  },

  async previewFtiAdditionalOrder(
    formData: FormData
  ): Promise<FtiAdditionalOrderPreviewResponse> {
    const response = await axios.post<FtiAdditionalOrderPreviewResponse>(
      `${BASE_URL}/CustomerOrder/previewFtiAdditionalOrder`,
      formData
    );
    return response.data;
  },

  async uploadFtiAdditionalOrder(
    formData: FormData
  ): Promise<FtiAdditionalOrderUploadResponse> {
    const response = await axios.post<FtiAdditionalOrderUploadResponse>(
      `${BASE_URL}/CustomerOrder/uploadFtiAdditionalOrder`,
      formData
    );
    if ((response.data as any)?.status === 'success') {
      clearRawSourceCache();
    }
    return response.data;
  },

  async getFtiAdditionalManualOptions(
    uploadPeriod: string
  ): Promise<FtiAdditionalManualOptionsResponse> {
    const response = await axios.get<FtiAdditionalManualOptionsResponse>(
      `${BASE_URL}/CustomerOrder/ftiAdditionalManualOptions`,
      {
        params: {
          upload_period: uploadPeriod
        }
      }
    );
    return response.data;
  },

  async previewFtiAdditionalManualOrder(payload: {
    upload_period: string;
    po_number: string;
    items: FtiAdditionalManualInputItem[];
  }): Promise<FtiAdditionalOrderPreviewResponse> {
    const response = await axios.post<FtiAdditionalOrderPreviewResponse>(
      `${BASE_URL}/CustomerOrder/previewFtiAdditionalManualOrder`,
      payload
    );
    return response.data;
  },

  async uploadFtiAdditionalManualOrder(payload: {
    upload_period: string;
    po_number: string;
    items: FtiAdditionalManualInputItem[];
    upload_by: string;
    preview_signature: string;
    allocations: FtiAdditionalOrderAllocationItem[];
  }): Promise<FtiAdditionalOrderUploadResponse> {
    const response = await axios.post<FtiAdditionalOrderUploadResponse>(
      `${BASE_URL}/CustomerOrder/uploadFtiAdditionalManualOrder`,
      payload
    );
    if ((response.data as any)?.status === 'success') {
      clearRawSourceCache();
    }
    return response.data;
  },

  // ==========================================================
  // RAW SALES ORDER DPM (EXCEL)
  // ==========================================================

  async getDpmRawSo(
    params: FilterParams = {}
  ): Promise<DpmRawSoBackendRow[]> {
    return fetchOffsetPagedRows<DpmRawSoBackendRow>(
      `${BASE_URL}/CustomerOrder/dpmRawSo`,
      params
    );
  },

  async previewDpmRawSo(
    formData: FormData
  ): Promise<DpmRawSoPreviewResponse> {
    const response = await axios.post<DpmRawSoPreviewResponse>(
      `${BASE_URL}/CustomerOrder/previewDpmRawSo`,
      formData
    );
    return response.data;
  },

  async uploadDpmRawSo(
    formData: FormData
  ): Promise<DpmRawSoUploadResponse> {
    const response = await axios.post<DpmRawSoUploadResponse>(
      `${BASE_URL}/CustomerOrder/uploadDpmRawSo`,
      formData
    );
    if ((response.data as any)?.status === 'success') {
      clearRawSourceCache();
    }
    return response.data;
  },



  // ==========================================================
  // RAW SALES ORDER GAYA MOTOR (PDF)
  // ==========================================================

  async getGayaRawSo(
    params: FilterParams = {}
  ): Promise<GayaRawSoBackendRow[]> {
    return fetchOffsetPagedRows<GayaRawSoBackendRow>(
      `${BASE_URL}/CustomerOrder/gayaRawSo`,
      params
    );
  },

  async previewGayaRawSo(
    formData: FormData
  ): Promise<GayaRawSoPreviewResponse> {
    const response =
      await axios.post<GayaRawSoPreviewResponse>(
        `${BASE_URL}/CustomerOrder/previewGayaRawSo`,
        formData
      );

    return response.data;
  },

  async uploadGayaRawSo(
    formData: FormData
  ): Promise<GayaRawSoUploadResponse> {
    const response =
      await axios.post<GayaRawSoUploadResponse>(
        `${BASE_URL}/CustomerOrder/uploadGayaRawSo`,
        formData
      );

    if ((response.data as any)?.status === 'success') {
      clearRawSourceCache();
    }
    return response.data;
  },

  // ==========================================================
  // RAW SALES ORDER ASI ADM (PDF PURCHASE ORDER + MDFO DAILY)
  // ==========================================================

  async getAsiAdmRawSo(
    params: FilterParams = {}
  ): Promise<AsiAdmRawSoBackendRow[]> {
    return fetchOffsetPagedRows<AsiAdmRawSoBackendRow>(
      `${BASE_URL}/CustomerOrder/asiAdmRawSo`,
      params
    );
  },

  async getAsiAdmFormatSalesOrder(
    params: FilterParams = {}
  ): Promise<FormatSalesOrderRow[]> {
    return fetchOffsetPagedRows<FormatSalesOrderRow>(
      `${BASE_URL}/CustomerOrder/asiAdmFormatSalesOrder`,
      params
    );
  },

  async inspectAsiAdmRawSoFiles(
    formData: FormData
  ): Promise<AsiAdmRawSoInspectResponse> {
    const response =
      await axios.post<AsiAdmRawSoInspectResponse>(
        `${BASE_URL}/CustomerOrder/inspectAsiAdmRawSoFiles`,
        formData
      );

    return response.data;
  },

  async validateContractPreviewParts(
    payload: {
      customer: string;
      periode: string;
      materials: string[];
    }
  ): Promise<ContractPreviewPartsResponse> {
    const response =
      await axios.post<ContractPreviewPartsResponse>(
        `${BASE_URL}/CustomerOrder/validateContractPreviewParts`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

    return response.data;
  },

  async previewAsiAdmRawSo(
    formData: FormData
  ): Promise<AsiAdmRawSoPreviewResponse> {
    const response =
      await axios.post<AsiAdmRawSoPreviewResponse>(
        `${BASE_URL}/CustomerOrder/previewAsiAdmRawSo`,
        formData
      );

    return response.data;
  },

  async uploadAsiAdmRawSo(
    formData: FormData
  ): Promise<AsiAdmRawSoUploadResponse> {
    const response =
      await axios.post<AsiAdmRawSoUploadResponse>(
        `${BASE_URL}/CustomerOrder/uploadAsiAdmRawSo`,
        formData
      );

    if ((response.data as any)?.status === 'success') {
      clearRawSourceCache();
    }
    return response.data;
  },

  // ==========================================================
  // RAW SALES ORDER DCWA - EXCEL A:W + PDF PO + MDFO JOB
  // ==========================================================

  async getDcwaRawSo(
    params: FilterParams = {}
  ): Promise<DcwaRawSoBackendRow[]> {
    return fetchOffsetPagedRows<DcwaRawSoBackendRow>(
      `${BASE_URL}/CustomerOrder/dcwaRawSo`,
      params
    );
  },

  async previewDcwaRawSo(
    formData: FormData
  ): Promise<DcwaRawSoPreviewResponse> {
    const response =
      await axios.post<DcwaRawSoPreviewResponse>(
        `${BASE_URL}/CustomerOrder/previewDcwaRawSo`,
        formData
      );

    return response.data;
  },

  async uploadDcwaRawSo(
    formData: FormData
  ): Promise<DcwaRawSoUploadResponse> {
    const response =
      await axios.post<DcwaRawSoUploadResponse>(
        `${BASE_URL}/CustomerOrder/uploadDcwaRawSo`,
        formData
      );

    if ((response.data as any)?.status === 'success') {
      clearRawSourceCache();
    }
    return response.data;
  },

  // ==========================================================
  // CANCEL RAW ORDERS
  // ==========================================================

  async cancelRawOrders(
    payload: RawCancelPayload
  ): Promise<RawCancelResponse> {
    const response =
      await axios.post<RawCancelResponse>(
        `${BASE_URL}/CustomerOrder/cancelRawOrders`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
          }
        }
      );

    if ((response.data as any)?.status === 'success') {
      clearRawSourceCache();
    }
    return response.data;
  },

  // ==========================================================
  // RESTORE RAW ORDERS
  // ==========================================================

  async restoreRawOrders(
    payload: RawRestorePayload
  ): Promise<RawRestoreResponse> {
    const response =
      await axios.post<RawRestoreResponse>(
        `${BASE_URL}/CustomerOrder/restoreRawOrders`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
          }
        }
      );

    if ((response.data as any)?.status === 'success') {
      clearRawSourceCache();
    }
    return response.data;
  },

  // ==========================================================
  // CANCELLED / RESTORE - LIGHTWEIGHT COUNTS + SERVER PAGE
  // ==========================================================

  async getCancelledCounts(
    params: CancelListParams = {},
    signal?: AbortSignal
  ): Promise<CancelLifecycleCountsResponse> {
    const response = await axios.get<CancelLifecycleCountsResponse>(
      `${BASE_URL}/CustomerOrder/cancelledCounts`,
      {
        params: normalizeCancelListParams(params),
        signal
      }
    );

    return response.data;
  },

  async getCancelledRawOrdersPage(
    params: CancelListParams = {},
    signal?: AbortSignal
  ): Promise<CancelListPageResponse<CancelledRawRow>> {
    const response = await axios.get<
      CancelListPageResponse<CancelledRawRow>
    >(
      `${BASE_URL}/CustomerOrder/cancelledRawOrders`,
      {
        params: normalizeCancelListParams(params),
        signal
      }
    );

    return response.data;
  },

  async getCancelHistoryPage(
    params: CancelListParams = {},
    signal?: AbortSignal
  ): Promise<CancelListPageResponse<CancelHistoryRow>> {
    const response = await axios.get<
      CancelListPageResponse<CancelHistoryRow>
    >(
      `${BASE_URL}/CustomerOrder/cancelHistory`,
      {
        params: normalizeCancelListParams(params),
        signal
      }
    );

    return response.data;
  },

  // ==========================================================
  // GET CURRENT CANCELLED PARTS
  // ==========================================================

  async getCancelledRawOrders(
    params: CancelListParams = {}
  ): Promise<CancelledRawRow[]> {
    const response =
      await axios.get<
        CancelListResponse<CancelledRawRow>
      >(
        `${BASE_URL}/CustomerOrder/cancelledRawOrders`,
        {
          params:
            normalizeCancelListParams(
              params
            )
        }
      );

    return response.data.data ?? [];
  },

  // ==========================================================
  // GET CANCELLED DN SUMMARY
  // ==========================================================

  async getCancelledDnOrders(
    params: CancelListParams = {},
    signal?: AbortSignal
  ): Promise<CancelledDnRow[]> {
    const response =
      await axios.get<
        CancelListResponse<CancelledDnRow>
      >(
        `${BASE_URL}/CustomerOrder/cancelledDnOrders`,
        {
          params:
            normalizeCancelListParams(
              params
            ),
          signal
        }
      );

    return response.data.data ?? [];
  },

  // ==========================================================
  // GET CANCEL / RESTORE HISTORY
  // ==========================================================

  async getCancelHistory(
    params: CancelListParams = {}
  ): Promise<CancelHistoryRow[]> {
    const response =
      await axios.get<
        CancelListResponse<CancelHistoryRow>
      >(
        `${BASE_URL}/CustomerOrder/cancelHistory`,
        {
          params:
            normalizeCancelListParams(
              params
            )
        }
      );

    return response.data.data ?? [];
  },

  // ==========================================================
  // DELETE RAW FILES PERMANENTLY
  // ==========================================================

  async deleteRawFiles(
    payload: {
      mode?: 'selected' | 'filtered';
      raw_ids?: number[];
      customer?: string;
      customers?: string[];
      from_date?: string;
      to_date?: string;
      delivery_from_date?: string;
      delivery_to_date?: string;
      creation_from_date?: string;
      creation_to_date?: string;
      filters?: Record<string, string[]>;
    }
  ): Promise<{
    status: 'success' | 'error';
    message: string;

    requested?: number;
    raw_deleted?: number;
    format_deleted?: number;
    tracking_deleted?: number;
    additional_order_deleted?: number;

    batches_removed?: number;
  }> {
    const response =
      await axios.post<{
        status: 'success' | 'error';
        message: string;

        requested?: number;
        raw_deleted?: number;
        format_deleted?: number;
        tracking_deleted?: number;
        additional_order_deleted?: number;

        batches_removed?: number;
      }>(
        `${BASE_URL}/CustomerOrder/deleteRawFiles`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
          }
        }
      );

    if ((response.data as any)?.status === 'success') {
      clearRawSourceCache();
    }
    return response.data;
  },

  // ==========================================================
  // PREVIEW / CROSSCHECK DN
  // ==========================================================

  async crosscheckDn(
    dnNumbers: string[]
  ): Promise<DnCrosscheckResponse> {
    const normalized = Array.from(
      new Set(
        dnNumbers
          .map((value) => String(value ?? '').trim())
          .filter(Boolean)
      )
    );

    const combined: DnCrosscheckResponse = {
      status: 'success',
      total_input: 0,
      total_found: 0,
      total_not_found: 0,
      data: []
    };

    for (let offset = 0; offset < normalized.length; offset += DN_READ_CHUNK_SIZE) {
      const chunk = normalized.slice(
        offset,
        offset + DN_READ_CHUNK_SIZE
      );

      const response = await axios.post<DnCrosscheckResponse>(
        `${BASE_URL}/CustomerOrder/crosscheckDn`,
        { dn_numbers: chunk },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.status !== 'success') {
        return response.data;
      }

      combined.total_input += Number(response.data.total_input ?? 0);
      combined.total_found += Number(response.data.total_found ?? 0);
      combined.total_not_found += Number(response.data.total_not_found ?? 0);
      combined.data.push(...(response.data.data ?? []));
    }

    return combined;
  },

  // ==========================================================
  // DELETE DN REGISTER
  // ==========================================================

  async deleteDnRegister(
    payload: DnDeleteRegisterPayload
  ): Promise<DnDeleteRegisterResponse> {
    const response =
      await axios.post<DnDeleteRegisterResponse>(
        `${BASE_URL}/CustomerOrder/deleteDnRegister`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

    if (response.data.status === 'success') {
      clearDnStatusCache();
    }

    return response.data;
  },

  // ==========================================================
  // GET ALL DN STATUS
  // ==========================================================

  getCachedAllDnStatusPage(
    params: FilterParams,
    customers: string[],
    page: number,
    perPage: number,
    filters: Record<string, string[]> = {},
    sortKey = '',
    sortDirection: 'none' | 'asc' | 'desc' = 'none'
  ): ServerPageResponse<DnAllStatusResponse['data'][number]> | null {
    const requestParams = {
      ...normalizeFilterParams(params),
      customers: [...customers]
        .map((value) => String(value ?? '').trim().toUpperCase())
        .filter(Boolean)
        .sort()
        .join(','),
      page,
      per_page: perPage,
      filters: Object.keys(filters).length > 0
        ? JSON.stringify(filters)
        : '',
      sort_key: String(sortKey ?? '').trim(),
      sort_direction: sortDirection
    };

    return readPageCache<DnAllStatusResponse['data'][number]>(
      buildPageCacheKey(DN_PAGE_CACHE_NAMESPACE, requestParams)
    );
  },

  shouldRevalidateAllDnStatusPage(
    params: FilterParams,
    customers: string[],
    page: number,
    perPage: number,
    filters: Record<string, string[]> = {},
    sortKey = '',
    sortDirection: 'none' | 'asc' | 'desc' = 'none'
  ): boolean {
    const requestParams = {
      ...normalizeFilterParams(params),
      customers: [...customers]
        .map((value) => String(value ?? '').trim().toUpperCase())
        .filter(Boolean)
        .sort()
        .join(','),
      page,
      per_page: perPage,
      filters: Object.keys(filters).length > 0
        ? JSON.stringify(filters)
        : '',
      sort_key: String(sortKey ?? '').trim(),
      sort_direction: sortDirection
    };

    return pageCacheNeedsRevalidate(
      buildPageCacheKey(DN_PAGE_CACHE_NAMESPACE, requestParams)
    );
  },

  async getAllDnStatusPage(
    params: FilterParams = {},
    customers: string[] = [],
    page = 1,
    perPage = 10,
    filters: Record<string, string[]> = {},
    sortKey = '',
    sortDirection: 'none' | 'asc' | 'desc' = 'none',
    signal?: AbortSignal
  ): Promise<ServerPageResponse<DnAllStatusResponse['data'][number]>> {
    const requestParams = {
      ...normalizeFilterParams(params),
      customers: [...customers]
        .map((value) => String(value ?? '').trim().toUpperCase())
        .filter(Boolean)
        .sort()
        .join(','),
      page: Math.max(1, Number(page) || 1),
      per_page: [10, 20, 50, 100].includes(Number(perPage))
        ? Number(perPage)
        : 10,
      filters: Object.keys(filters).length > 0
        ? JSON.stringify(filters)
        : '',
      sort_key: String(sortKey ?? '').trim(),
      sort_direction: sortDirection
    };

    const response = await axios.get<
      ServerPageResponse<DnAllStatusResponse['data'][number]>
    >(
      `${BASE_URL}/CustomerOrder/allDnStatusPage`,
      { params: requestParams, signal }
    );

    if (response.data.status === 'success') {
      writePageCache(
        buildPageCacheKey(DN_PAGE_CACHE_NAMESPACE, requestParams),
        response.data
      );
    }

    return response.data;
  },

  /**
   * Popup GAP DN Monitoring mengambil seluruh DN Open pada scope yang sudah
   * sempit dalam satu request. Pagination dan filter popup dilakukan lokal
   * agar klik halaman/filter berikutnya tidak mengulang query database.
   */
  async getDnGapDetail(
    params: FilterParams = {},
    customers: string[] = [],
    signal?: AbortSignal
  ): Promise<DnGapDetailResponse> {
    const requestParams = {
      ...normalizeFilterParams(params),
      customers: [...customers]
        .map((value) => String(value ?? '').trim().toUpperCase())
        .filter(Boolean)
        .sort()
        .join(',')
    };

    const response = await axios.get<DnGapDetailResponse>(
      `${BASE_URL}/CustomerOrder/dnGapDetail`,
      { params: requestParams, signal }
    );

    return response.data;
  },

  async prefetchAllDnStatusPage(
    params: FilterParams,
    customers: string[],
    page: number,
    perPage: number,
    filters: Record<string, string[]> = {},
    sortKey = '',
    sortDirection: 'none' | 'asc' | 'desc' = 'none'
  ): Promise<void> {
    if (page < 1) return;
    if (this.getCachedAllDnStatusPage(params, customers, page, perPage, filters, sortKey, sortDirection)) {
      return;
    }

    try {
      await this.getAllDnStatusPage(params, customers, page, perPage, filters, sortKey, sortDirection);
    } catch {
      // silent prefetch
    }
  },

  async searchDnFilterOptions(
    params: FilterParams,
    customers: string[],
    column: 'order_no' | 'dn_number' | 'customer' | 'quantity' | 'order_date' | 'delivery_date' | 'status' | 'registered_date',
    search: string,
    filters: Record<string, string[]> = {},
    signal?: AbortSignal
  ): Promise<string[]> {
    const requestParams = {
      ...normalizeFilterParams(params),
      customers: [...customers]
        .map((value) => String(value ?? '').trim().toUpperCase())
        .filter(Boolean)
        .sort()
        .join(','),
      column,
      search: String(search ?? '').trim(),
      filters: Object.keys(filters).length > 0
        ? JSON.stringify(filters)
        : '',
      limit: 100
    };

    const cacheKey = buildFilterOptionCacheKey('dn', requestParams);
    const cached = readFilterOptionCache(cacheKey);
    if (cached) return cached;

    const response = await axios.get<{
      status: 'success' | 'error';
      data: string[];
      message?: string;
    }>(`${BASE_URL}/CustomerOrder/dnFilterOptions`, {
      params: requestParams,
      signal
    });

    const values = Array.isArray(response.data?.data)
      ? response.data.data.map((value) => String(value ?? ''))
      : [];
    if (response.data?.status === 'success') {
      writeFilterOptionCache(cacheKey, values);
    }
    return values;
  },

  getCachedAllDnStatusSummary(
    params: FilterParams = {},
    customers: string[] = [],
    filters: Record<string, string[]> = {}
  ): DnSummaryPayload | null {
    const requestParams = {
      ...normalizeFilterParams(params),
      customers: [...customers]
        .map((value) => String(value ?? '').trim().toUpperCase())
        .filter(Boolean)
        .sort()
        .join(','),
      filters: Object.keys(filters).length > 0
        ? JSON.stringify(filters)
        : ''
    };

    return readDnSummaryCache(
      buildPageCacheKey(DN_SUMMARY_CACHE_NAMESPACE, requestParams)
    );
  },

  shouldRevalidateAllDnStatusSummary(
    params: FilterParams = {},
    customers: string[] = [],
    filters: Record<string, string[]> = {}
  ): boolean {
    const requestParams = {
      ...normalizeFilterParams(params),
      customers: [...customers]
        .map((value) => String(value ?? '').trim().toUpperCase())
        .filter(Boolean)
        .sort()
        .join(','),
      filters: Object.keys(filters).length > 0
        ? JSON.stringify(filters)
        : ''
    };

    return pageCacheNeedsRevalidate(
      buildPageCacheKey(DN_SUMMARY_CACHE_NAMESPACE, requestParams)
    );
  },

  async getAllDnStatusSummary(
    params: FilterParams = {},
    customers: string[] = [],
    filters: Record<string, string[]> = {},
    signal?: AbortSignal
  ): Promise<{
    status: 'success' | 'error';
    data?: {
      total: number;
      found: number;
      not_found: number;
      open: number;
      close: number;
    };
    message?: string;
  }> {
    const requestParams = {
      ...normalizeFilterParams(params),
      customers: [...customers]
        .map((value) => String(value ?? '').trim().toUpperCase())
        .filter(Boolean)
        .sort()
        .join(','),
      filters: Object.keys(filters).length > 0
        ? JSON.stringify(filters)
        : ''
    };

    const response = await axios.get(
      `${BASE_URL}/CustomerOrder/allDnStatusSummary`,
      { params: requestParams, signal }
    );

    if (response.data?.status === 'success') {
      writeDnSummaryCache(
        buildPageCacheKey(DN_SUMMARY_CACHE_NAMESPACE, requestParams),
        response.data
      );
    }

    return response.data;
  },

  async getAllDnStatus(
    params: FilterParams = {}
  ): Promise<DnAllStatusResponse> {
    const normalizedParams = normalizeFilterParams(params);
    const requestedCustomer = String(
      normalizedParams.customer ?? ''
    ).trim();

    const sources = requestedCustomer
      ? [requestedCustomer]
      : ['ADM', 'TMMIN', 'NTC', 'GAYA MTR', 'DCWA'];

    const rows: DnAllStatusResponse['data'] = [];

    for (const customer of sources) {
      const sourceRows = await fetchOffsetPagedRows<
        DnAllStatusResponse['data'][number]
      >(
        `${BASE_URL}/CustomerOrder/allDnStatus`,
        {
          ...normalizedParams,
          customer
        },
        DN_READ_CHUNK_SIZE
      );

      rows.push(...sourceRows);
    }

    const uniqueRows = new Map<string, DnAllStatusResponse['data'][number]>();

    rows.forEach((row) => {
      const key = String(
        row.order_no || row.dn_number || ''
      )
        .trim()
        .toUpperCase();

      if (key) {
        uniqueRows.set(key, row);
      }
    });

    const data = Array.from(uniqueRows.values()).sort((first, second) => {
      const dateCompare = String(first.order_date ?? '').localeCompare(
        String(second.order_date ?? ''),
        'id',
        { numeric: true }
      );

      if (dateCompare !== 0) {
        return dateCompare;
      }

      const customerCompare = String(first.customer ?? '').localeCompare(
        String(second.customer ?? ''),
        'id',
        { numeric: true }
      );

      if (customerCompare !== 0) {
        return customerCompare;
      }

      return String(first.order_no ?? first.dn_number ?? '').localeCompare(
        String(second.order_no ?? second.dn_number ?? ''),
        'id',
        { numeric: true }
      );
    });

    return {
      status: 'success',
      total: data.length,
      data
    };
  },

  // ==========================================================
  // REGISTER DN IN OFFICE
  // ==========================================================

  async registerDnInOffice(
    payload: DnRegisterPayload
  ): Promise<DnRegisterResponse> {
    const response =
      await axios.post<DnRegisterResponse>(
        `${BASE_URL}/CustomerOrder/registerDnInOffice`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

    if (response.data.status === 'success') {
      clearDnStatusCache();
    }

    return response.data;
  },

  // ==========================================================
  // PREVIEW EXCEL
  // ==========================================================

  async previewExcel(
    formData: FormData
  ): Promise<ExcelPreviewResponse> {
    const response =
      await axios.post<ExcelPreviewResponse>(
        `${BASE_URL}/CustomerOrder/previewExcel`,
        formData
      );

    return response.data;
  },

  // ==========================================================
  // UPLOAD CUSTOMER ORDER
  // ==========================================================

  async upload(
    formData: FormData
  ): Promise<UploadResponse> {
    const response =
      await axios.post<UploadResponse>(
        `${BASE_URL}/CustomerOrder/upload`,
        formData
      );

    if ((response.data as any)?.status === 'success') {
      clearRawSourceCache();
    }
    return response.data;
  },

  // ==========================================================
  // DOWNLOAD RAW FILES EXCEL - ACTIVE ONLY
  // ==========================================================

  async getRawDownloadPreflight(
    payload: RawFilesExcelPayload
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
      `${BASE_URL}/CustomerOrder/rawDownloadPreflight`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  },

  async downloadRawExcel(
    payload: RawFilesExcelPayload
  ): Promise<AxiosResponse<Blob>> {
    return axios.post<Blob>(
      `${BASE_URL}/CustomerOrder/downloadRawExcel`,
      payload,
      {
        responseType: 'blob',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  },

  // ==========================================================
  // GET TRACKING UPLOAD SALES ORDER
  // ==========================================================

  getCachedTrackingPage(
    params: FilterParams = {},
    customers: string[] = [],
    page = 1,
    perPage = 10,
    filters: Record<string, string[]> = {},
    colorFilters: Record<string, string[]> = {},
    sortKey = '',
    sortDirection = 'none'
  ): ServerPageResponse<TrackingBackendRow> | null {
    const requestParams = {
      ...normalizeFilterParams(params),
      customers: customers
        .map((value) => String(value ?? '').trim().toUpperCase())
        .filter(Boolean)
        .sort()
        .join(','),
      page: Math.max(1, Number(page) || 1),
      per_page: [10, 20, 50, 100, 200].includes(Number(perPage))
        ? Number(perPage)
        : 10,
      filters: Object.keys(filters).length > 0
        ? JSON.stringify(filters)
        : '',
      color_filters: Object.keys(colorFilters).length > 0
        ? JSON.stringify(colorFilters)
        : '',
      sort_key: String(sortKey ?? '').trim(),
      sort_direction: String(sortDirection ?? 'none').trim().toLowerCase()
    };

    return readPageCache<TrackingBackendRow>(
      buildPageCacheKey(TRACKING_PAGE_CACHE_NAMESPACE, requestParams)
    );
  },

  shouldRevalidateTrackingPage(
    params: FilterParams = {},
    customers: string[] = [],
    page = 1,
    perPage = 10,
    filters: Record<string, string[]> = {},
    colorFilters: Record<string, string[]> = {},
    sortKey = '',
    sortDirection = 'none'
  ): boolean {
    const requestParams = {
      ...normalizeFilterParams(params),
      customers: customers
        .map((value) => String(value ?? '').trim().toUpperCase())
        .filter(Boolean)
        .sort()
        .join(','),
      page: Math.max(1, Number(page) || 1),
      per_page: [10, 20, 50, 100, 200].includes(Number(perPage))
        ? Number(perPage)
        : 10,
      filters: Object.keys(filters).length > 0
        ? JSON.stringify(filters)
        : '',
      color_filters: Object.keys(colorFilters).length > 0
        ? JSON.stringify(colorFilters)
        : '',
      sort_key: String(sortKey ?? '').trim(),
      sort_direction: String(sortDirection ?? 'none').trim().toLowerCase()
    };

    return pageCacheNeedsRevalidate(
      buildPageCacheKey(TRACKING_PAGE_CACHE_NAMESPACE, requestParams)
    );
  },

  async getTrackingPage(
    params: FilterParams = {},
    customers: string[] = [],
    page = 1,
    perPage = 10,
    filters: Record<string, string[]> = {},
    colorFilters: Record<string, string[]> = {},
    sortKey = '',
    sortDirection = 'none',
    signal?: AbortSignal
  ): Promise<ServerPageResponse<TrackingBackendRow>> {
    const requestParams = {
      ...normalizeFilterParams(params),
      customers: customers
        .map((value) => String(value ?? '').trim().toUpperCase())
        .filter(Boolean)
        .sort()
        .join(','),
      page: Math.max(1, Number(page) || 1),
      per_page: [10, 20, 50, 100, 200].includes(Number(perPage))
        ? Number(perPage)
        : 10,
      filters: Object.keys(filters).length > 0
        ? JSON.stringify(filters)
        : '',
      color_filters: Object.keys(colorFilters).length > 0
        ? JSON.stringify(colorFilters)
        : '',
      sort_key: String(sortKey ?? '').trim(),
      sort_direction: String(sortDirection ?? 'none').trim().toLowerCase()
    };

    const response = await axios.get<ServerPageResponse<TrackingBackendRow>>(
      `${BASE_URL}/CustomerOrder/trackingPage`,
      {
        params: {
          ...requestParams,
          // Hanya dipakai pada network request supaya browser/proxy tidak
          // menahan response lama. Nilai ini tidak menjadi bagian cache key.
          _ts: Date.now()
        },
        signal
      }
    );

    if (response.data.status === 'success') {
      writePageCache(
        buildPageCacheKey(TRACKING_PAGE_CACHE_NAMESPACE, requestParams),
        response.data
      );
    }

    return response.data;
  },

  async prefetchTrackingPage(
    params: FilterParams = {},
    customers: string[] = [],
    page = 1,
    perPage = 10,
    filters: Record<string, string[]> = {},
    colorFilters: Record<string, string[]> = {},
    sortKey = '',
    sortDirection = 'none'
  ): Promise<void> {
    if (page <= 1) return;

    if (
      this.getCachedTrackingPage(
        params,
        customers,
        page,
        perPage,
        filters,
        colorFilters,
        sortKey,
        sortDirection
      )
    ) {
      return;
    }

    try {
      await this.getTrackingPage(
        params,
        customers,
        page,
        perPage,
        filters,
        colorFilters,
        sortKey,
        sortDirection
      );
    } catch {
      // Prefetch Tracking hanya optimasi dan tidak boleh mengganggu UI.
    }
  },

  async searchTrackingFilterOptions(
    params: FilterParams = {},
    customers: string[] = [],
    column: string,
    search = '',
    filters: Record<string, string[]> = {},
    colorFilters: Record<string, string[]> = {},
    signal?: AbortSignal
  ): Promise<{ data: string[]; has_more: boolean }> {
    const requestParams = {
      ...normalizeFilterParams(params),
      customers: customers
        .map((value) => String(value ?? '').trim().toUpperCase())
        .filter(Boolean)
        .sort()
        .join(','),
      column: String(column ?? '').trim(),
      search: String(search ?? '').trim(),
      filters: Object.keys(filters).length > 0
        ? JSON.stringify(filters)
        : '',
      color_filters: Object.keys(colorFilters).length > 0
        ? JSON.stringify(colorFilters)
        : '',
      limit: 100
    };

    const cacheKey = buildFilterOptionCacheKey('tracking', requestParams);
    const cached = readTrackingFilterOptionCache(cacheKey);
    if (cached) {
      return cached;
    }

    const response = await axios.get<{
      status: 'success' | 'error';
      data: string[];
      has_more?: boolean;
      message?: string;
    }>(`${BASE_URL}/CustomerOrder/trackingFilterOptions`, {
      params: {
        ...requestParams,
        _ts: Date.now()
      },
      signal
    });

    const result = {
      data: Array.isArray(response.data?.data)
        ? response.data.data.map((value) => String(value ?? ''))
        : [],
      has_more: Boolean(response.data?.has_more)
    };

    if (response.data?.status === 'success') {
      writeTrackingFilterOptionCache(
        cacheKey,
        result.data,
        result.has_more
      );
    }

    return result;
  },

  async getTracking(
    params: FilterParams = {}
  ): Promise<TrackingBackendRow[]> {
    const response = await axios.get<
      | TrackingBackendRow[]
      | ApiListResponse<TrackingBackendRow>
    >(
      `${BASE_URL}/CustomerOrder/tracking`,
      {
        params: {
          ...normalizeFilterParams(
            params
          ),

          // Cache buster aman: hanya query parameter, tidak memicu CORS preflight.
          _ts: Date.now()
        }
      }
    );

    if (Array.isArray(response.data)) {
      return response.data;
    }

    return response.data.data ?? [];
  },

  // ==========================================================
  // UPDATE TRACKING
  // ==========================================================

  async updateTracking(
    payload: TrackingUpdatePayload
  ): Promise<TrackingUpdateResponse> {
    const response =
      await axios.post<TrackingUpdateResponse>(
        `${BASE_URL}/CustomerOrder/updateTracking`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

    if ((response.data as any)?.status === 'success') {
      clearTrackingPageCache();
    }

    return response.data;
  },

  async bulkUpdateTracking(
    payload: TrackingBulkUpdatePayload
  ): Promise<TrackingBulkUpdateResponse> {
    const response = await axios.post<TrackingBulkUpdateResponse>(
      `${BASE_URL}/CustomerOrder/bulkUpdateTracking`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if ((response.data as any)?.status === 'success') {
      clearTrackingPageCache();
    }

    return response.data;
  },

  // ==========================================================
  // DN GAP POPUP - SIMPLE EXCEL DOWNLOAD
  // ==========================================================

  async downloadDnGapExcel(
    payload: Record<string, unknown>
  ): Promise<AxiosResponse<Blob>> {
    return axios.post<Blob>(
      `${BASE_URL}/CustomerOrder/downloadDnGapExcel`,
      payload,
      {
        responseType: 'blob',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  },

  // ==========================================================
  // DN MONITORING REPORT PREVIEW
  // ==========================================================

  async previewDnMonitoringReport(
    payload: DnMonitoringReportPayload
  ): Promise<
    AxiosResponse<DnMonitoringPreviewResponse>
  > {
    return axios.post<DnMonitoringPreviewResponse>(
      `${BASE_URL}/CustomerOrder/dnMonitoringPreview`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        }
      }
    );
  },

  // ==========================================================
  // DN MONITORING REPORT EXCEL
  // ==========================================================

  async exportDnMonitoringExcel(
    payload: DnMonitoringReportPayload
  ): Promise<AxiosResponse<Blob>> {
    return axios.post<Blob>(
      `${BASE_URL}/CustomerOrder/exportDnMonitoringExcel`,
      payload,
      {
        responseType: 'blob',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
};
