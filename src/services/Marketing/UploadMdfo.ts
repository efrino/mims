import { MARKETING_API_BASE_URL as BASE_URL } from './MarketingApiConfig';
import axios from 'axios';

import type {
  MdfoExportRequest,
  MdfoGetDataParams,
  MdfoGetDataResponse,
  MdfoDpmPreviewResponse,
  MdfoFtiPreviewResponse,
  MdfoFtiPartOptionsResponse,
  MdfoFtiPartNameResolveResponse,
  MdfoFtiManualSourcePreviewResponse,
  FtiManualRowPayload,
  MesManualRowPayload,
  MesZsttDailyRowPayload,
  MdfoMesZsttResponse,
  MdfoMesZsttDraftResponse,
  MdfoForecastEditResponse,
  MdfoForecastUpdateRow,
  MdfoForecastUpdateResponse,
  MdfoRevisionDetectionResponse,
  MdfoNtcExportRequest,
  MdfoTmminExportRequest,
  MdfoUploadResponse
} from '@/types/Marketing/UploadMdfo';



const MDFO_CACHE_TTL_MS = 30 * 60 * 1000;
const MDFO_PAGE_CACHE_NAMESPACE = 'mdfo-raw-page-v2';
const MDFO_FILTER_CACHE_NAMESPACE = 'mdfo-raw-filter-v2';
const MDFO_CACHE_MAX_ENTRIES = 24;

type MdfoCacheEnvelope<T> = {
  savedAt: number;
  payload: T;
};

const buildMdfoCacheKey = (
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

const readMdfoCache = <T>(key: string): T | null => {
  if (typeof window === 'undefined' || !window.sessionStorage) return null;

  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const envelope = JSON.parse(raw) as MdfoCacheEnvelope<T>;
    if (
      !envelope ||
      Date.now() - Number(envelope.savedAt ?? 0) > MDFO_CACHE_TTL_MS
    ) {
      window.sessionStorage.removeItem(key);
      return null;
    }
    return envelope.payload ?? null;
  } catch {
    return null;
  }
};

const pruneMdfoCache = (): void => {
  if (typeof window === 'undefined' || !window.sessionStorage) return;

  try {
    const entries: Array<{ key: string; savedAt: number }> = [];
    for (let index = 0; index < window.sessionStorage.length; index += 1) {
      const key = window.sessionStorage.key(index);
      if (
        !key ||
        (!key.startsWith(`marketing:${MDFO_PAGE_CACHE_NAMESPACE}:`) &&
          !key.startsWith(`marketing:${MDFO_FILTER_CACHE_NAMESPACE}:`))
      ) {
        continue;
      }

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
      .slice(MDFO_CACHE_MAX_ENTRIES)
      .forEach((entry) => window.sessionStorage.removeItem(entry.key));
  } catch {
    // Cache hanya optimasi.
  }
};

const writeMdfoCache = <T>(key: string, payload: T): void => {
  if (typeof window === 'undefined' || !window.sessionStorage) return;

  try {
    window.sessionStorage.setItem(
      key,
      JSON.stringify({ savedAt: Date.now(), payload } satisfies MdfoCacheEnvelope<T>)
    );
    pruneMdfoCache();
  } catch {
    // Quota/storage error tidak boleh menggagalkan halaman.
  }
};

const clearMdfoRawCache = (): void => {
  if (typeof window === 'undefined' || !window.sessionStorage) return;

  try {
    const keys: string[] = [];
    for (let index = 0; index < window.sessionStorage.length; index += 1) {
      const key = window.sessionStorage.key(index);
      if (
        key &&
        (key.startsWith(`marketing:${MDFO_PAGE_CACHE_NAMESPACE}:`) ||
          key.startsWith(`marketing:${MDFO_FILTER_CACHE_NAMESPACE}:`))
      ) {
        keys.push(key);
      }
    }
    keys.forEach((key) => window.sessionStorage.removeItem(key));
  } catch {
    // Cache hanya optimasi.
  }
};

type ApiErrorPayload = {
  message?: unknown;
};

type MdfoServiceError = Error & {
  apiPayload?: unknown;
};

const createMdfoServiceError = (
  message: string,
  apiPayload?: unknown
): MdfoServiceError => {
  const error = new Error(message) as MdfoServiceError;
  error.name = 'MdfoServiceError';
  error.apiPayload = apiPayload;
  return error;
};

type MdfoMultiExportRequest = MdfoExportRequest & {
  customers?: string[];
};

const normalizeCustomer = (value: unknown): string => {
  return String(value ?? '')
    .trim()
    .toUpperCase();
};

const normalizeCustomers = (values: unknown): string[] => {
  if (!Array.isArray(values)) {
    return [];
  }

  return Array.from(
    new Set(
      values
        .map(normalizeCustomer)
        .filter(Boolean)
    )
  );
};

const normalizePeriod = (value: unknown): string => {
  const period = String(value ?? '')
    .replace(/\D/g, '')
    .trim();

  return /^\d{6}$/.test(period)
    ? period
    : '';
};

const normalizeRevision = (value: unknown): string => {
  return String(value ?? '').trim();
};

const normalizeBatchId = (value: unknown): number | null => {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return null;
  }

  const batchId = Number(value);

  return Number.isInteger(batchId) && batchId > 0
    ? batchId
    : null;
};

const getObjectMessage = (value: unknown): string => {
  if (
    !value ||
    typeof value !== 'object' ||
    !('message' in value)
  ) {
    return '';
  }

  const message = (value as ApiErrorPayload).message;

  return message === undefined || message === null
    ? ''
    : String(message).trim();
};

const parseBlobMessage = async (blob: Blob): Promise<string> => {
  try {
    const text = await blob.text();

    if (text.trim() === '') {
      return '';
    }

    try {
      return getObjectMessage(JSON.parse(text));
    } catch {
      return text.trim();
    }
  } catch {
    return '';
  }
};

const getDownloadErrorMessage = async (
  error: unknown,
  fallbackMessage: string
): Promise<string> => {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error
      ? error.message
      : fallbackMessage;
  }

  const responseData = error.response?.data;

  if (responseData instanceof Blob) {
    return (
      await parseBlobMessage(responseData)
    ) || fallbackMessage;
  }

  return (
    getObjectMessage(responseData) ||
    error.message ||
    fallbackMessage
  );
};

const extractFileName = (
  disposition: unknown,
  fallbackName: string
): string => {
  const header = String(disposition ?? '');

  const utf8Match = header.match(
    /filename\*=UTF-8''([^;]+)/i
  );

  if (utf8Match?.[1]) {
    const encodedName = utf8Match[1].trim();

    try {
      return decodeURIComponent(encodedName);
    } catch {
      return encodedName;
    }
  }

  const regularMatch = header.match(
    /filename="?([^";]+)"?/i
  );

  return regularMatch?.[1]?.trim() || fallbackName;
};

const triggerBlobDownload = (
  blob: Blob,
  fileName: string
): void => {
  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = blobUrl;
  anchor.download = fileName;
  anchor.style.display = 'none';

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(blobUrl);
  }, 1000);
};

const assertDownloadBlob = async (
  blob: Blob,
  contentType: unknown
): Promise<void> => {
  const normalizedContentType = String(
    contentType || blob.type || ''
  ).toLowerCase();

  if (
    normalizedContentType.includes('application/json') ||
    normalizedContentType.includes('text/html') ||
    normalizedContentType.includes('text/plain')
  ) {
    const message = await parseBlobMessage(blob);

    throw new Error(
      message ||
      'Backend tidak mengembalikan file download yang valid'
    );
  }

  if (blob.size < 22) {
    throw new Error(
      'File download tidak lengkap'
    );
  }
};

const GAYA_MONTH_NAMES: Record<string, string> = {
  '01': 'JANUARI',
  '02': 'FEBRUARI',
  '03': 'MARET',
  '04': 'APRIL',
  '05': 'MEI',
  '06': 'JUNI',
  '07': 'JULI',
  '08': 'AGUSTUS',
  '09': 'SEPTEMBER',
  '10': 'OKTOBER',
  '11': 'NOVEMBER',
  '12': 'DESEMBER'
};

const buildFallbackFileName = (
  customer: string,
  periode: string,
  revision: string
): string => {
  const normalizedCustomer = normalizeCustomer(customer);
  const normalizedPeriod = normalizePeriod(periode);

  if (
    (normalizedCustomer === 'GAYA MTR' || normalizedCustomer === 'GAYA MOTOR') &&
    normalizedPeriod !== ''
  ) {
    const year = normalizedPeriod.slice(0, 4);
    const month = normalizedPeriod.slice(4, 6);
    const monthName = GAYA_MONTH_NAMES[month] ?? month;
    const revisionNumber = Number(normalizeRevision(revision) || 0);
    const revisionLabel = Number.isFinite(revisionNumber)
      ? String(Math.max(0, Math.trunc(revisionNumber))).padStart(2, '0')
      : '00';

    return `MDFO GAYA MOTOR ${monthName} ${year} REV.${revisionLabel}.xlsx`;
  }

  const customerFile = normalizedCustomer !== ''
    ? normalizedCustomer
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
    : 'CUSTOMER';

  return [
    'MDFO',
    customerFile,
    normalizedPeriod || 'PERIODE',
    `REV${revision || '0'}`
  ].join('_') + '.xlsx';
};

const buildMultiFallbackFileName = (
  periode: string,
  revision: string
): string => {
  return `MDFO_${periode}_REV${revision}.zip`;
};

const TMMIN_MONTH_NAMES: Record<string, string> = {
  '01': 'JANUARI',
  '02': 'FEBRUARI',
  '03': 'MARET',
  '04': 'APRIL',
  '05': 'MEI',
  '06': 'JUNI',
  '07': 'JULI',
  '08': 'AGUSTUS',
  '09': 'SEPTEMBER',
  '10': 'OKTOBER',
  '11': 'NOVEMBER',
  '12': 'DESEMBER'
};

const buildTmminFallbackFileName = (
  supplierCode: 'T034' | 'TMAJ',
  periode: string,
  revision: string
): string => {
  const normalizedPeriod = normalizePeriod(periode);

  if (normalizedPeriod === '') {
    return supplierCode === 'TMAJ'
      ? 'MDFO TMMIN P1.xlsx'
      : 'MDFO TMMIN D26.xlsx';
  }

  const year = normalizedPeriod.slice(0, 4);
  const yearShort = year.slice(-2);
  const month = normalizedPeriod.slice(4, 6);
  const monthName = TMMIN_MONTH_NAMES[month] ?? month;
  const revisionNumber = Number(
    normalizeRevision(revision) || 0
  );
  const revisionLabel = Number.isFinite(revisionNumber)
    ? String(
        Math.max(0, Math.trunc(revisionNumber))
      ).padStart(2, '0')
    : '00';

  if (supplierCode === 'TMAJ') {
    return `MDFO TMMIN P1 ${monthName} ${yearShort} REV. ${revisionLabel}.xlsx`;
  }

  return `MDFO TMMIN D26 ${monthName} ${yearShort}.xlsx`;
};


const buildNtcFallbackFileName = (
  periode: string,
  revision: string
): string => {
  return `MDFO_NTC_${periode || 'PERIODE'}_REV${revision || '0'}.xlsx`;
};

const buildFtiFallbackFileName = (
  periode: string,
  revision: string
): string => {
  const normalizedPeriod = normalizePeriod(periode);
  const year = normalizedPeriod.slice(0, 4);
  const month = normalizedPeriod.slice(4, 6);
  const monthName = TMMIN_MONTH_NAMES[month] ?? month;
  const revisionNumber = Number(normalizeRevision(revision) || 0);
  const revisionLabel = Number.isFinite(revisionNumber)
    ? String(Math.max(0, Math.trunc(revisionNumber))).padStart(2, '0')
    : '00';

  return `MDFO FTI ${monthName || 'PERIODE'} ${year || ''} REV.${revisionLabel}.xlsx`
    .replace(/\s+/g, ' ')
    .trim();
};

const buildMesFallbackFileName = (
  periode: string,
  revision: string
): string => {
  const normalizedPeriod = normalizePeriod(periode);
  const year = normalizedPeriod.slice(0, 4);
  const month = normalizedPeriod.slice(4, 6);
  const monthName = TMMIN_MONTH_NAMES[month] ?? month;
  const revisionNumber = Number(normalizeRevision(revision) || 0);
  const revisionLabel = Number.isFinite(revisionNumber)
    ? String(Math.max(0, Math.trunc(revisionNumber))).padStart(2, '0')
    : '00';

  return `MDFO MES ${monthName || 'PERIODE'} ${year || ''} REV.${revisionLabel}.xlsx`
    .replace(/\s+/g, ' ')
    .trim();
};

const downloadBlob = async (
  endpoint: string,
  payload: Record<string, unknown>,
  fallbackName: string
): Promise<string> => {
  const response = await axios.post<Blob>(
    endpoint,
    payload,
    {
      responseType: 'blob'
    }
  );

  await assertDownloadBlob(
    response.data,
    response.headers['content-type']
  );

  const fileName = extractFileName(
    response.headers['content-disposition'],
    fallbackName
  );

  triggerBlobDownload(
    response.data,
    fileName
  );

  return fileName;
};

export const mdfoService = {
  clearRawCache(): void {
    clearMdfoRawCache();
  },

  getCachedData(
    filters: MdfoGetDataParams = {}
  ): MdfoGetDataResponse | null {
    if (!filters.paged) return null;

    const params = this.buildGetDataParams(filters);
    return readMdfoCache<MdfoGetDataResponse>(
      buildMdfoCacheKey(MDFO_PAGE_CACHE_NAMESPACE, params)
    );
  },

  buildGetDataParams(filters: MdfoGetDataParams = {}): Record<string, string | number> {
    const params: Record<string, string | number> = {};

    const batchId = normalizeBatchId(filters.batchId);
    const customer = normalizeCustomer(filters.customer);
    const periode = normalizePeriod(filters.periode);
    const revision = normalizeRevision(filters.revision);

    if (batchId !== null) params.batch_id = batchId;
    if (customer !== '') params.customer = customer;
    if (periode !== '') params.periode = periode;
    if (revision !== '') params.revision = revision;

    const customers = normalizeCustomers(filters.customers);
    if (customers.length > 0) params.customers = JSON.stringify(customers);

    if (filters.paged) {
      params.paged = 1;
      params.page = Math.max(1, Number(filters.page) || 1);
      params.per_page = [10, 20, 50, 100].includes(Number(filters.perPage))
        ? Number(filters.perPage)
        : 10;
      params.sort_key = String(filters.sortKey ?? '');
      params.sort_direction = String(filters.sortDirection ?? 'none');
      params.filters = filters.columnFilters && Object.keys(filters.columnFilters).length > 0
        ? JSON.stringify(filters.columnFilters)
        : '';
      params.include_meta = filters.includeMeta === false ? 0 : 1;
      params.include_totals = filters.includeTotals === false ? 0 : 1;
    }

    return params;
  },

  async getData(
    filters: MdfoGetDataParams = {},
    options: { signal?: AbortSignal; bypassCache?: boolean } = {}
  ): Promise<MdfoGetDataResponse> {
    const params = this.buildGetDataParams(filters);
    const cacheKey = filters.paged
      ? buildMdfoCacheKey(MDFO_PAGE_CACHE_NAMESPACE, params)
      : '';

    if (cacheKey && !options.bypassCache) {
      const cached = readMdfoCache<MdfoGetDataResponse>(cacheKey);
      if (cached) return cached;
    }

    const response = await axios.get<MdfoGetDataResponse>(
      `${BASE_URL}/UploadMdfo/getData`,
      {
        params,
        signal: options.signal
      }
    );

    if (cacheKey && response.data.status === 'success') {
      writeMdfoCache(cacheKey, response.data);
    }

    return response.data;
  },

  async prefetchData(
    filters: MdfoGetDataParams = {}
  ): Promise<void> {
    if (!filters.paged || Number(filters.page) <= 1) return;
    if (this.getCachedData(filters)) return;

    try {
      await this.getData(filters);
    } catch {
      // Prefetch tidak boleh memunculkan error ke user.
    }
  },

  async getRawFilterOptions(
    column: string,
    search: string,
    filters: MdfoGetDataParams = {},
    signal?: AbortSignal
  ): Promise<string[]> {
    const params: Record<string, string | number> = {
      column: String(column ?? '').trim(),
      search: String(search ?? '').trim(),
      limit: 100
    };

    const batchId = normalizeBatchId(filters.batchId);
    const customer = normalizeCustomer(filters.customer);
    const periode = normalizePeriod(filters.periode);
    const revision = normalizeRevision(filters.revision);
    const customers = normalizeCustomers(filters.customers);

    if (batchId !== null) params.batch_id = batchId;
    if (customer !== '') params.customer = customer;
    if (periode !== '') params.periode = periode;
    if (revision !== '') params.revision = revision;
    if (customers.length > 0) params.customers = JSON.stringify(customers);
    if (filters.columnFilters && Object.keys(filters.columnFilters).length > 0) {
      params.filters = JSON.stringify(filters.columnFilters);
    }

    const cacheKey = buildMdfoCacheKey(MDFO_FILTER_CACHE_NAMESPACE, params);
    const cached = readMdfoCache<string[]>(cacheKey);
    if (cached) return cached;

    const response = await axios.get<{
      status: 'success' | 'error';
      data?: string[];
      message?: string;
    }>(`${BASE_URL}/UploadMdfo/rawFilterOptions`, { params, signal });

    if (response.data.status !== 'success') {
      throw new Error(response.data.message || 'Gagal mengambil pilihan filter MDFO');
    }

    const values = Array.isArray(response.data.data)
      ? response.data.data.map((value) => String(value ?? ''))
      : [];
    writeMdfoCache(cacheKey, values);
    return values;
  },

  async getRawFilteredTargets(filters: MdfoGetDataParams = {}): Promise<{
    total: number;
    truncated: boolean;
    data: Array<{ id: number; customer: string }>;
  }> {
    const params: Record<string, string | number> = {};
    const batchId = normalizeBatchId(filters.batchId);
    const customer = normalizeCustomer(filters.customer);
    const periode = normalizePeriod(filters.periode);
    const revision = normalizeRevision(filters.revision);
    const customers = normalizeCustomers(filters.customers);

    if (batchId !== null) params.batch_id = batchId;
    if (customer !== '') params.customer = customer;
    if (periode !== '') params.periode = periode;
    if (revision !== '') params.revision = revision;
    if (customers.length > 0) params.customers = JSON.stringify(customers);
    if (filters.columnFilters && Object.keys(filters.columnFilters).length > 0) {
      params.filters = JSON.stringify(filters.columnFilters);
    }

    const response = await axios.get<{
      status: 'success' | 'error';
      total?: number;
      truncated?: boolean;
      data?: Array<{ id: number; customer: string }>;
      message?: string;
    }>(`${BASE_URL}/UploadMdfo/rawFilteredTargets`, { params });

    if (response.data.status !== 'success') {
      throw new Error(response.data.message || 'Gagal mengambil target MDFO');
    }

    return {
      total: Number(response.data.total || 0),
      truncated: response.data.truncated === true,
      data: Array.isArray(response.data.data) ? response.data.data : []
    };
  },

  async detectRevision(
    files: File[],
    customer: string
  ): Promise<MdfoRevisionDetectionResponse> {
    if (files.length === 0) {
      throw new Error('Pilih minimal satu file MDFO');
    }

    const normalizedCustomer = normalizeCustomer(customer);
    if (normalizedCustomer === '') {
      throw new Error('Pilih customer terlebih dahulu');
    }

    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files[]', file);
    });
    formData.append('customer', normalizedCustomer);

    try {
      const response = await axios.post<MdfoRevisionDetectionResponse>(
        `${BASE_URL}/UploadMdfo/detectRevision`,
        formData
      );

      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const apiPayload = error.response?.data;
        throw createMdfoServiceError(
          getObjectMessage(apiPayload) ||
          error.message ||
          'Deteksi Revision MDFO gagal',
          apiPayload
        );
      }

      throw error;
    }
  },

  async getFtiPartOptions(): Promise<MdfoFtiPartOptionsResponse> {
    const response = await axios.get<MdfoFtiPartOptionsResponse>(
      `${BASE_URL}/UploadMdfo/ftiPartOptions`
    );

    return response.data;
  },

  async resolveFtiPartName(
    partNo: string
  ): Promise<MdfoFtiPartNameResolveResponse> {
    const normalizedPartNo = String(partNo ?? '')
      .trim()
      .toUpperCase();

    if (normalizedPartNo === '') {
      throw new Error('Part No wajib diisi');
    }

    const response = await axios.get<MdfoFtiPartNameResolveResponse>(
      `${BASE_URL}/UploadMdfo/resolveFtiPartName`,
      {
        params: {
          part_no: normalizedPartNo
        }
      }
    );

    return response.data;
  },

  async detectFtiManualRevision(
    period: string
  ): Promise<MdfoRevisionDetectionResponse> {
    const normalizedPeriod = normalizePeriod(period);

    if (normalizedPeriod === '') {
      throw new Error('Pilih bulan FTI manual terlebih dahulu');
    }

    const formData = new FormData();
    formData.append('period', normalizedPeriod);

    try {
      const response = await axios.post<MdfoRevisionDetectionResponse>(
        `${BASE_URL}/UploadMdfo/detectFtiManualRevision`,
        formData
      );

      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          getObjectMessage(error.response?.data) ||
          error.message ||
          'Deteksi Revision FTI manual gagal'
        );
      }

      throw error;
    }
  },

  async upload(
    files: File[],
    uploadBy = '',
    customer = '',
    revision = ''
  ): Promise<MdfoUploadResponse> {
    if (files.length === 0) {
      throw new Error(
        'Pilih minimal satu file MDFO'
      );
    }

    const formData = new FormData();

    files.forEach((file) => {
      formData.append('files[]', file);
    });

    const normalizedUploadBy = String(
      uploadBy ?? ''
    ).trim();

    const normalizedCustomer = normalizeCustomer(
      customer
    );

    if (normalizedUploadBy !== '') {
      formData.append('upload_by', normalizedUploadBy);
    }

    if (normalizedCustomer !== '') {
      formData.append('customer', normalizedCustomer);
    }

    const normalizedRevision = String(revision ?? '').trim();

    if (normalizedRevision !== '') {
      formData.append('revision', normalizedRevision);
    }

    try {
      const response = await axios.post<MdfoUploadResponse>(
        `${BASE_URL}/UploadMdfo/upload`,
        formData
      );

      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const apiPayload = error.response?.data;
        throw createMdfoServiceError(
          getObjectMessage(apiPayload) ||
          error.message ||
          'Upload MDFO gagal',
          apiPayload
        );
      }

      throw error;
    }
  },

  async previewDpm(
    files: File[]
  ): Promise<MdfoDpmPreviewResponse> {
    if (files.length === 0) {
      throw new Error('Pilih minimal satu file DPM');
    }

    const formData = new FormData();

    files.forEach((file) => {
      formData.append('files[]', file);
    });

    const response = await axios.post<MdfoDpmPreviewResponse>(
      `${BASE_URL}/UploadMdfo/previewDpm`,
      formData
    );

    return response.data;
  },

  async previewFti(
    files: File[]
  ): Promise<MdfoFtiPreviewResponse> {
    if (files.length !== 3) {
      throw new Error('FTI wajib memilih tepat 3 file: 1 PDF dan 2 Excel');
    }

    const formData = new FormData();

    files.forEach((file) => {
      formData.append('files[]', file);
    });

    const response = await axios.post<MdfoFtiPreviewResponse>(
      `${BASE_URL}/UploadMdfo/previewFti`,
      formData
    );

    return response.data;
  },

  async previewFtiManualSources(
    files: File[],
    period: string
  ): Promise<MdfoFtiManualSourcePreviewResponse> {
    if (files.length < 1 || files.length > 2) {
      throw new Error('FTI manual membutuhkan 1 Schedule dan maksimal 1 Forecast');
    }

    /*
     * Khusus preview source, period boleh kosong.
     * Backend akan memakai periode Excel hanya untuk menentukan kolom
     * Forecast N+1..N+3. Bulan MDFO final tetap wajib pada Preview/Submit.
     */
    const normalizedPeriod = normalizePeriod(period);

    const formData = new FormData();
    files.forEach((file) => formData.append('files[]', file));
    formData.append('period', normalizedPeriod);

    const response = await axios.post<MdfoFtiManualSourcePreviewResponse>(
      `${BASE_URL}/UploadMdfo/previewFtiManualSources`,
      formData
    );

    return response.data;
  },

  async previewFtiManual(
    files: File[],
    period: string,
    rows: FtiManualRowPayload[]
  ): Promise<MdfoFtiPreviewResponse> {
    if (files.length < 1 || files.length > 2) {
      throw new Error('Excel Schedule FTI wajib dipilih');
    }

    const normalizedPeriod = normalizePeriod(period);
    if (normalizedPeriod === '') {
      throw new Error('Pilih bulan FTI manual terlebih dahulu');
    }

    const formData = new FormData();
    files.forEach((file) => formData.append('files[]', file));
    formData.append('period', normalizedPeriod);
    formData.append('manual_rows', JSON.stringify(rows));

    const response = await axios.post<MdfoFtiPreviewResponse>(
      `${BASE_URL}/UploadMdfo/previewFtiManual`,
      formData
    );

    return response.data;
  },

  async uploadFtiManual(
    files: File[],
    period: string,
    rows: FtiManualRowPayload[],
    uploadBy = '',
    revision = ''
  ): Promise<MdfoUploadResponse> {
    if (files.length < 1 || files.length > 2) {
      throw new Error('Excel Schedule FTI wajib dipilih');
    }

    const normalizedPeriod = normalizePeriod(period);
    if (normalizedPeriod === '') {
      throw new Error('Pilih bulan FTI manual terlebih dahulu');
    }

    const formData = new FormData();
    files.forEach((file) => formData.append('files[]', file));
    formData.append('period', normalizedPeriod);
    formData.append('manual_rows', JSON.stringify(rows));
    formData.append('upload_by', String(uploadBy ?? '').trim());

    const normalizedRevision = String(revision ?? '').trim();
    if (normalizedRevision !== '') {
      formData.append('revision', normalizedRevision);
    }

    const response = await axios.post<MdfoUploadResponse>(
      `${BASE_URL}/UploadMdfo/uploadFtiManual`,
      formData
    );

    return response.data;
  },


  async getMesPartOptions(): Promise<MdfoFtiPartOptionsResponse> {
    const response = await axios.get<MdfoFtiPartOptionsResponse>(
      `${BASE_URL}/UploadMdfo/mesPartOptions`
    );
    return response.data;
  },

  async resolveMesPartName(
    partNo: string
  ): Promise<MdfoFtiPartNameResolveResponse> {
    const normalizedPartNo = String(partNo ?? '').trim().toUpperCase();
    if (normalizedPartNo === '') {
      throw new Error('Part No wajib diisi');
    }
    const response = await axios.get<MdfoFtiPartNameResolveResponse>(
      `${BASE_URL}/UploadMdfo/resolveMesPartName`,
      { params: { part_no: normalizedPartNo } }
    );
    return response.data;
  },

  async detectMesManualRevision(
    period: string
  ): Promise<MdfoRevisionDetectionResponse> {
    const normalizedPeriod = normalizePeriod(period);
    if (normalizedPeriod === '') {
      throw new Error('Pilih bulan MES terlebih dahulu');
    }
    const formData = new FormData();
    formData.append('period', normalizedPeriod);
    const response = await axios.post<MdfoRevisionDetectionResponse>(
      `${BASE_URL}/UploadMdfo/detectMesManualRevision`,
      formData
    );
    return response.data;
  },

  async previewMesManual(
    period: string,
    rows: MesManualRowPayload[]
  ): Promise<MdfoFtiPreviewResponse> {
    const normalizedPeriod = normalizePeriod(period);
    if (normalizedPeriod === '') {
      throw new Error('Pilih bulan MES terlebih dahulu');
    }
    const formData = new FormData();
    formData.append('period', normalizedPeriod);
    formData.append('manual_rows', JSON.stringify(rows));
    const response = await axios.post<MdfoFtiPreviewResponse>(
      `${BASE_URL}/UploadMdfo/previewMesManual`,
      formData
    );
    return response.data;
  },

  async uploadMesManual(
    period: string,
    rows: MesManualRowPayload[],
    uploadBy = '',
    revision = ''
  ): Promise<MdfoUploadResponse> {
    const normalizedPeriod = normalizePeriod(period);
    if (normalizedPeriod === '') {
      throw new Error('Pilih bulan MES terlebih dahulu');
    }
    const formData = new FormData();
    formData.append('period', normalizedPeriod);
    formData.append('manual_rows', JSON.stringify(rows));
    formData.append('upload_by', String(uploadBy ?? '').trim());
    const normalizedRevision = String(revision ?? '').trim();
    if (normalizedRevision !== '') formData.append('revision', normalizedRevision);
    const response = await axios.post<MdfoUploadResponse>(
      `${BASE_URL}/UploadMdfo/uploadMesManual`,
      formData
    );
    return response.data;
  },

  async submitMesZstt(
    batchId: number,
    rows: MesZsttDailyRowPayload[]
  ): Promise<MdfoMesZsttResponse> {
    const response = await axios.post<MdfoMesZsttResponse>(
      `${BASE_URL}/UploadMdfo/submitMesZstt`,
      { batch_id: batchId, rows }
    );
    return response.data;
  },

  async getMesZsttDraft(batchId: number): Promise<MdfoMesZsttDraftResponse> {
    const response = await axios.get<MdfoMesZsttDraftResponse>(
      `${BASE_URL}/UploadMdfo/mesZsttDraft`,
      { params: { batch_id: batchId } }
    );
    return response.data;
  },

  async getForecastEditData(
    customer: 'FTI' | 'MES',
    periode: string,
    revision: string | number
  ): Promise<MdfoForecastEditResponse> {
    const response = await axios.get<MdfoForecastEditResponse>(
      `${BASE_URL}/UploadMdfo/forecastEdit`,
      {
        params: {
          customer,
          periode: normalizePeriod(periode),
          revision: normalizeRevision(revision)
        }
      }
    );

    return response.data;
  },

  async updateForecast(
    customer: 'FTI' | 'MES',
    periode: string,
    revision: string | number,
    rows: MdfoForecastUpdateRow[]
  ): Promise<MdfoForecastUpdateResponse> {
    const response = await axios.post<MdfoForecastUpdateResponse>(
      `${BASE_URL}/UploadMdfo/updateForecast`,
      {
        customer,
        periode: normalizePeriod(periode),
        revision: Number(revision),
        rows
      }
    );

    clearMdfoRawCache();
    return response.data;
  },

  async getDownloadPreflight(
    customers: string[],
    periode: string,
    revision: string,
    columnFilters: Record<string, string[]> = {},
    signal?: AbortSignal
  ): Promise<{
    available: Array<{
      customer: string;
      available: boolean;
      rows: number;
      estimated_columns?: number;
      estimated_cells?: number;
      max_safe_rows?: number;
      safe_for_export?: boolean;
    }>;
    availableCustomers: string[];
    unavailableCustomers: string[];
  }> {
    const response = await axios.get<{
      status: 'success' | 'error';
      message?: string;
      data?: Array<{
        customer: string;
        available: boolean;
        rows: number;
        estimated_columns?: number;
        estimated_cells?: number;
        max_safe_rows?: number;
        safe_for_export?: boolean;
      }>;
      available_customers?: string[];
      unavailable_customers?: string[];
    }>(`${BASE_URL}/UploadMdfo/downloadPreflight`, {
      params: {
        customers: JSON.stringify(customers),
        periode: normalizePeriod(periode),
        revision: normalizeRevision(revision),
        column_filters: Object.keys(columnFilters).length > 0
          ? JSON.stringify(columnFilters)
          : undefined
      },
      signal
    });

    if (response.data.status !== 'success') {
      throw new Error(response.data.message || 'Preflight download gagal');
    }

    return {
      available: Array.isArray(response.data.data) ? response.data.data : [],
      availableCustomers: Array.isArray(response.data.available_customers) ? response.data.available_customers : [],
      unavailableCustomers: Array.isArray(response.data.unavailable_customers) ? response.data.unavailable_customers : []
    };
  },

  async downloadExcel(
    payload: MdfoMultiExportRequest
  ): Promise<string> {
    try {
      const customers = normalizeCustomers(
        payload.customers
      );

      const customer = normalizeCustomer(
        payload.customer
      );

      const normalizedCustomers = customers.length > 0
        ? customers
        : customer !== ''
          ? [customer]
          : [];

      const periode = normalizePeriod(
        payload.periode
      );

      const revision = normalizeRevision(
        payload.revision
      );

      if (normalizedCustomers.length === 0) {
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

      return await downloadBlob(
        `${BASE_URL}/UploadMdfo/exportExcel`,
        {
          customer:
            normalizedCustomers.length === 1
              ? normalizedCustomers[0]
              : '',
          customers: normalizedCustomers,
          periode,
          revision,
          column_filters:
            normalizedCustomers.length === 1
              ? payload.columnFilters ?? {}
              : {}
        },
        normalizedCustomers.length > 1
          ? buildMultiFallbackFileName(
              periode,
              revision
            )
          : normalizedCustomers[0] === 'FTI'
            ? buildFtiFallbackFileName(
                periode,
                revision
              )
            : normalizedCustomers[0] === 'MES'
              ? buildMesFallbackFileName(
                  periode,
                  revision
                )
              : buildFallbackFileName(
                  normalizedCustomers[0],
                  periode,
                  revision
                )
      );
    } catch (error: unknown) {
      const message = await getDownloadErrorMessage(
        error,
        'Download Excel MDFO gagal'
      );

      throw new Error(message);
    }
  },


  async downloadNtcExcel(
    payload: MdfoNtcExportRequest
  ): Promise<string> {
    try {
      const periode = normalizePeriod(
        payload.periode
      );

      const revision = normalizeRevision(
        payload.revision
      );

      if (periode === '') {
        throw new Error(
          'Pilih Periode bulan sebelum download NTC'
        );
      }

      if (revision === '') {
        throw new Error(
          'Pilih Revision sebelum download NTC'
        );
      }

      return await downloadBlob(
        `${BASE_URL}/UploadMdfo/exportNtcExcel`,
        {
          customer: 'NTC',
          periode,
          revision,
          column_filters:
            payload.columnFilters ?? {}
        },
        buildNtcFallbackFileName(
          periode,
          revision
        )
      );
    } catch (error: unknown) {
      const message = await getDownloadErrorMessage(
        error,
        'Download Excel MDFO NTC gagal'
      );

      throw new Error(message);
    }
  },

  async downloadTmminExcel(
    payload: MdfoTmminExportRequest
  ): Promise<string> {
    try {
      const periode = normalizePeriod(
        payload.periode
      );

      const revision = normalizeRevision(
        payload.revision
      );

      const supplierCode = payload.supplierCode;

      return await downloadBlob(
        `${BASE_URL}/UploadMdfo/exportTmminExcel`,
        {
          customer: 'TMMIN',
          periode,
          revision,
          supplier_code: supplierCode,
          column_filters:
            payload.columnFilters ?? {}
        },
        buildTmminFallbackFileName(
          supplierCode,
          periode,
          revision
        )
      );
    } catch (error: unknown) {
      const message = await getDownloadErrorMessage(
        error,
        `Download Excel TMMIN ${payload.supplierCode} gagal`
      );

      throw new Error(message);
    }
  }
};
