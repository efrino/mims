import { computed, reactive, ref, watch, shallowRef } from 'vue';

import type { CSSProperties } from 'vue';

import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

import { defineStore } from 'pinia';

import { mdfoService } from '@/services/Marketing/UploadMdfo';
import {
  executeMdfoDelete,
  previewMdfoDelete,
  type MdfoDeleteTarget
} from '@/services/Marketing/MdfoDeleteService';

import { useNotificationStore } from '@/stores/notification';
import { useAuthStore } from '@/stores/auth';
import { useQuotationStore } from '@/stores/Marketing/QuotationStore';
import { useQuotationTrackingStore } from '@/stores/Marketing/QuotationTrackingStore';
import {
  createDpmPdfsWithoutPrices,
  type DpmSanitizedPdfFile
} from '@/utils/dpmPdfPriceMask';
import {
  getAnchoredPopupPosition,
  useAnchoredPopup
} from '@/composables/useAnchoredPopup';

import type {
  MdfoColumn,
  MdfoDayKey,
  MdfoKey,
  MdfoRow,
  MdfoFileCheckResult,
  ExcelCell,
  AdmPlantCode,
  MdfoDataMode,
  TmminMdfoColumn,
  TmminMdfoRow,
  TmminSupplierCode,
  NtcMdfoColumn,
  NtcMdfoKey,
  NtcMdfoMonthHeaders,
  NtcMdfoRow,
  NtcMdfoTotals,
  GayaMdfoColumn,
  GayaMdfoRow,
  GayaMdfoTotals,
  DpmPreviewWarning,
  MdfoRevisionDetectionResponse,
  FtiPartOption,
  FtiManualRowPayload,
  MesManualRowPayload,
  MesZsttDailyRowPayload,
  FtiManualSourceRow,
  MdfoForecastEditRow,
  MdfoForecastUpdateRow,
  MdfoGetDataParams
} from '@/types/Marketing/UploadMdfo';
import type { QuotationKey, QuotationMode, QuotationRow } from '@/types/Marketing/Quotation';


const BLANK_FILTER_OPTION = 'Blanks';

const normalizeFilterOption = (value: unknown): string => {
  const text = String(value ?? '').trim();
  return text === '' ? BLANK_FILTER_OPTION : text;
};

const toRawFilterOption = (value: string): string => {
  return value === BLANK_FILTER_OPTION ? '' : value;
};

const sortFilterOptions = (values: string[]): string[] => {
  return [...values].sort((first, second) => {
    if (first === BLANK_FILTER_OPTION && second !== BLANK_FILTER_OPTION) {
      return -1;
    }

    if (second === BLANK_FILTER_OPTION && first !== BLANK_FILTER_OPTION) {
      return 1;
    }

    return first.localeCompare(second, 'id', {
      numeric: true
    });
  });
};

const matchesSearchTokens = (value: unknown, search: unknown): boolean => {
  const normalizedValue = String(value ?? '')
    .trim()
    .toLocaleLowerCase('id');
  const normalizedSearch = String(search ?? '')
    .trim()
    .toLocaleLowerCase('id')
    .replace(/\s+/g, ' ');

  if (normalizedSearch === '') return true;
  if (normalizedValue.includes(normalizedSearch)) return true;

  const tokens = Array.from(
    new Set(
      normalizedSearch
        .split(' ')
        .map((token) => token.trim())
        .filter(Boolean)
    )
  ).slice(0, 8);

  return tokens.length > 0 && tokens.every((token) => normalizedValue.includes(token));
};

const getRowsMatchingOtherColumnFilters = <TRow, TKey extends string>(
  rows: TRow[],
  columns: ReadonlyArray<{ key: TKey }>,
  selectedFilters: Partial<Record<TKey, string[]>>,
  activeKey: TKey | null,
  getValue: (row: TRow, key: TKey) => unknown
): TRow[] => {
  const activeFilters = columns
    .filter((column) => column.key !== activeKey)
    .map((column) => ({
      key: column.key,
      selected: new Set(selectedFilters[column.key] ?? [])
    }))
    .filter((filter) => filter.selected.size > 0);

  if (activeFilters.length === 0) return rows;

  return rows.filter((row) =>
    activeFilters.every((filter) =>
      filter.selected.has(
        normalizeFilterOption(getValue(row, filter.key))
      )
    )
  );
};

const MDFO_DOWNLOAD_CUSTOMER_ORDER = [
  'ADM P1',
  'ADM P4',
  'DCWA',
  'ADM P5',
  'ASI ADM',
  'TMMIN',
  'NTC',
  'GAYA MTR',
  'DPM',
  'FTI',
  'MES'
] as const;

// Raw Files dapat digabung hanya untuk customer yang memakai struktur ADM yang sama.
// TMMIN, NTC, dan Gaya Motor memakai struktur Raw khusus sehingga tidak digabung ke tabel Raw ADM.
const RAW_STANDARD_DISPLAY_CUSTOMER_ORDER = [
  'ADM P1',
  'ADM P4',
  'ADM P5'
] as const;

const RAW_STANDARD_DISPLAY_CUSTOMERS = new Set<string>(
  RAW_STANDARD_DISPLAY_CUSTOMER_ORDER
);

const RAW_STANDARD_SERVER_CUSTOMERS = new Set<string>([
  ...RAW_STANDARD_DISPLAY_CUSTOMER_ORDER,
  'DCWA',
  'ASI ADM'
]);

const RAW_SERVER_PAGE_CUSTOMERS = new Set<string>([
  ...RAW_STANDARD_DISPLAY_CUSTOMER_ORDER,
  'DCWA',
  'ASI ADM',
  'TMMIN',
  'NTC',
  'GAYA MTR',
  'DPM',
  'FTI',
  'MES'
]);


/*
 * Customer yang memiliki Quotation / Contract / ZSTT / Tracking.
 * ASI ADM memakai pipeline dokumen standard bersama customer ADM lainnya.
 */
const MDFO_DOCUMENT_CUSTOMERS = new Set<string>([
  'ADM P1',
  'ADM P4',
  'DCWA',
  'ADM P5',
  'ASI ADM',
  'TMMIN',
  'NTC',
  'GAYA MTR',
  'DPM',
  'FTI',
  'MES'
]);

const normalizeMdfoDownloadCustomer = (value: unknown): string => {
  const customer = String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');

  // Alias lama hanya dipertahankan sebagai fallback.
  // Filter baru selalu memakai ADM P4 dan DCWA secara terpisah.
  if (
    [
      'ADM P4 (SAP & DCWA)',
      'ADM P4 (SAP&DCWA)',
      'ADM_P4_GROUP'
    ].includes(customer)
  ) {
    return 'ADM P4';
  }

  if (
    customer === 'GAYA MOTOR' ||
    customer === 'GAYA_MOTOR'
  ) {
    return 'GAYA MTR';
  }

  return customer;
};

const getMdfoDownloadCustomerLabel = (customer: string): string => {
  return normalizeMdfoDownloadCustomer(customer) === 'GAYA MTR'
    ? 'GAYA MOTOR'
    : customer;
};

const getMdfoTableCustomerFromDownloadCustomer = (customer: string): string => {
  return customer;
};

// Table configuration
const ALLOWED_MDFO_EXTENSIONS = new Set(['xlsx', 'xls']);
const ALLOWED_NTC_MDFO_EXTENSIONS = new Set(['xlsx', 'xls', 'csv']);
const ALLOWED_GAYA_MDFO_EXTENSIONS = new Set(['xlsx', 'xls', 'csv']);
const ALLOWED_DPM_MDFO_EXTENSIONS = new Set(['pdf', 'zip', 'rar', '7z']);
const ALLOWED_FTI_MDFO_EXTENSIONS = new Set(['pdf', 'xlsx', 'xls']);

// Maksimal 25 MB untuk satu file. Nilai ini bisa disesuaikan.
const MAX_MDFO_FILE_SIZE = 25 * 1024 * 1024;
const MAX_MDFO_UPLOAD_FILES = 30;
const MAX_MDFO_TOTAL_SIZE = 80 * 1024 * 1024;

const DAY_KEYS: MdfoDayKey[] = [
  'd01',
  'd02',
  'd03',
  'd04',
  'd05',
  'd06',
  'd07',
  'd08',
  'd09',
  'd10',
  'd11',
  'd12',
  'd13',
  'd14',
  'd15',
  'd16',
  'd17',
  'd18',
  'd19',
  'd20',
  'd21',
  'd22',
  'd23',
  'd24',
  'd25',
  'd26',
  'd27',
  'd28',
  'd29',
  'd30',
  'd31'
];

const COLUMNS: MdfoColumn[] = [
  {
    key: 'periode',
    label: 'Periode',
    width: '70px',
    group: 'fixed'
  },
  {
    key: 'partNo',
    label: 'Part No',
    width: '140px',
    group: 'fixed'
  },
  {
    key: 'uniqueNo',
    label: 'Job No.',
    width: '80px',
    group: 'fixed'
  },
  {
    key: 'revision',
    label: 'Rev',
    width: '40px',
    group: 'fixed'
  },
  {
    key: 'partName',
    label: 'Part Name',
    width: '280px',
    group: 'fixed'
  },
  {
    key: 'qtyKanban',
    label: 'Qty/\nKanban',
    width: '66px',
    group: 'fixed'
  },
  {
    key: 'poNumber',
    label: 'PO Number',
    width: '100px',
    group: 'fixed'
  },
  {
    key: 'poQty',
    label: 'PO \nQty',
    width: '67px',
    group: 'fixed'
  },
  {
    key: 'n',
    label: 'N',
    width: '67px',
    group: 'forecast'
  },
  {
    key: 'n1',
    label: 'N+1',
    width: '67px',
    group: 'forecast'
  },
  {
    key: 'n2',
    label: 'N+2',
    width: '67px',
    group: 'forecast'
  },
  {
    key: 'n3',
    label: 'N+3',
    width: '67px',
    group: 'forecast'
  },
  ...DAY_KEYS.map(
    (key, index): MdfoColumn => ({
      key,
      label: String(index + 1),
      width: '50px',
      group: 'day'
    })
  )
];

/*
 * ASI ADM tetap memakai dataMode `standard` dan tabel database Raw MDFO existing.
 * Perbedaannya hanya susunan kolom website: Part No. SAP diturunkan dari Part No,
 * header satu baris, dan freeze sampai N+3.
 */
const ASI_MDFO_COLUMNS: MdfoColumn[] = [
  {
    key: 'partNo',
    label: 'Part No',
    width: '145px',
    group: 'fixed'
  },
  {
    key: 'partNoSap',
    label: 'Part No. SAP',
    width: '155px',
    group: 'fixed'
  },
  {
    key: 'partName',
    label: 'Part Name',
    width: '300px',
    group: 'fixed'
  },
  {
    key: 'qtyKanban',
    label: 'Qty / Kanban',
    width: '92px',
    group: 'fixed'
  },
  {
    key: 'n',
    label: 'N',
    width: '72px',
    group: 'forecast'
  },
  {
    key: 'n1',
    label: 'N+1',
    width: '72px',
    group: 'forecast'
  },
  {
    key: 'n2',
    label: 'N+2',
    width: '72px',
    group: 'forecast'
  },
  {
    key: 'n3',
    label: 'N+3',
    width: '72px',
    group: 'forecast'
  },
  ...DAY_KEYS.map(
    (key, index): MdfoColumn => ({
      key,
      label: String(index + 1),
      width: '54px',
      group: 'day'
    })
  )
];

const ASI_FROZEN_COLUMNS: MdfoKey[] = [
  'partNo',
  'partNoSap',
  'partName',
  'qtyKanban',
  'n',
  'n1',
  'n2',
  'n3'
];

const ASI_TOTAL_COLUMN_KEYS = new Set<MdfoKey>([
  // Qty/Kanban adalah ukuran kemasan per part, bukan nilai additive.
  // Jangan dijumlahkan di footer karena totalnya tidak bermakna.
  'n',
  'n1',
  'n2',
  'n3',
  ...DAY_KEYS
]);

const FROZEN_COLUMNS: MdfoKey[] = [
  'periode',
  'partNo',
  'uniqueNo',
  'revision',
  'partName',
  'qtyKanban',
  'poNumber',
  'poQty',
  'n',
  'n1',
  'n2',
  'n3'
];

// Raw MDFO ADM: pada viewport laptop freeze cukup sampai Part Name.
const LAPTOP_FROZEN_COLUMNS: MdfoKey[] = [
  'periode',
  'partNo',
  'uniqueNo',
  'revision',
  'partName'
];

// 1366 / 1440 / 1536 masuk mode laptop. 1600+ mempertahankan freeze desktop sampai N+3.
const ADM_DESKTOP_FREEZE_MIN_WIDTH = 1600;

const RESPONSIVE_ADM_RAW_CUSTOMERS = new Set([
  'ADM P1',
  'ADM P4',
  'DCWA',
  'ADM P5'
]);

const TOTAL_LABEL_END_KEY: MdfoKey =
  'poNumber';

const NUMERIC_COLUMN_KEYS = new Set<MdfoKey>(['qtyKanban', 'poQty', 'n', 'n1', 'n2', 'n3', ...DAY_KEYS]);

const TOTAL_COLUMN_KEYS = new Set<MdfoKey>(['poQty', 'n', 'n1', 'n2', 'n3', ...DAY_KEYS]);

const HIDE_FILTER_LABEL_KEYS = new Set<MdfoKey>(['qtyKanban', 'poQty', 'n', 'n1', 'n2', 'n3', ...DAY_KEYS]);

const CUSTOMER_UPLOAD_OPTIONS = [
  'ADM P1',
  'ADM P4 (SAP & DCWA)',
  'ADM P5',
  'TMMIN',
  'GAYA MOTOR',
  'ASI ADM',
  'NTC',
  'DPM',
  'FTI',
  'MES'
];

const USER_MASTER = [
  {
    name: 'Adis',
    color: 'yellow'
  },
  {
    name: 'Aisyah',
    color: 'pink'
  },
  {
    name: 'Alfi',
    color: 'cyan'
  },
  {
    name: 'Fania',
    color: 'purple'
  },
  {
    name: 'Gema',
    color: 'blue'
  },
  {
    name: 'Manap',
    color: 'gray'
  },
  {
    name: 'Rizqi',
    color: 'orange'
  },
  {
    name: 'Sufri',
    color: 'red'
  },
  {
    name: 'Yamin',
    color: 'indigo'
  },
  {
    name: 'Yudha',
    color: 'emerald'
  }
];

const normalizeUploadAccountValue = (value: unknown): string => {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
};

const UPLOAD_USER_BY_USERNAME: Record<string, string> = {
  'D.9010': 'Adis',
  'A.9717': 'Aisyah',
  'A.1628': 'Alfi',
  'F.9230': 'Fania',
  'G.9560': 'Gema',
  'A.4290': 'Manap',
  'M.9771': 'Rizqi',
  'S.9879': 'Sufri',
  'A.4123': 'Yamin',
  'Y.8934': 'Yudha'
};

const UPLOAD_USER_BY_FULLNAME: Record<string, string> = {
  'DJADOG JUNIVER SRIAYU ADISTYA': 'Adis',
  'AISYAH RIFQI NABILAH': 'Aisyah',
  'ALFI PEBRIYANTI': 'Alfi',
  'FANIA YUSRIYAH': 'Fania',
  'GEMA RAMADHAN PRASETYA': 'Gema',
  'ABDUL MANAP': 'Manap',
  'M. RIZQI ARDIANSYAH': 'Rizqi',
  'SUFRI YATNA JAYA': 'Sufri',
  'A. NURYAMIN': 'Yamin',
  'YUDHA MAHENDRA': 'Yudha'
};

const USER_COLOR_CLASSES: Record<string, string> = {
  yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  pink: 'bg-pink-100 text-pink-700 border-pink-200',
  cyan: 'bg-cyan-100 text-cyan-500 border-cyan-200',
  purple: 'bg-purple-100 text-purple-700 border-purple-200',
  blue: 'bg-blue-100 text-blue-700 border-blue-200',
  gray: 'bg-gray-100 text-gray-700 border-gray-200',
  green: 'bg-green-100 text-green-700 border-green-200',
  orange: 'bg-orange-100 text-orange-700 border-orange-200',
  red: 'bg-red-100 text-red-700 border-red-200',
  indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  emerald: 'bg-emerald-200 text-emerald-900 border-emerald-200'
};

const GRID_BORDER = '#e2e8f0';

const DAILY_TOTAL_WIDTH = '80px';

const ROWS_PER_PAGE_OPTIONS = [10, 20, 50, 100];

const LATEST_PERIOD_YEAR_STORAGE_KEY = 'mdfo_latest_period_year';

const numberFormatter = new Intl.NumberFormat('id-ID', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});

const stickyHeaderTopBorder: CSSProperties = {
  boxShadow: `inset 0 1px 0 ${GRID_BORDER}`
};

const stickyFooterBottomBorder: CSSProperties = {
  boxShadow: `inset 0 -1px 0 ${GRID_BORDER}`
};

// Pure helpers
const isDayKey = (key: MdfoKey): key is MdfoDayKey => {
  return /^d(0[1-9]|[12][0-9]|3[01])$/.test(key);
};

const createDefaultDayHeaders = (): Record<MdfoDayKey, string> => {
  return {
    d01: 'Mon',
    d02: 'Tue',
    d03: 'Wed',
    d04: 'Thu',
    d05: 'Fri',
    d06: 'Sat',
    d07: 'Sun',
    d08: 'Mon',
    d09: 'Tue',
    d10: 'Wed',
    d11: 'Thu',
    d12: 'Fri',
    d13: 'Sat',
    d14: 'Sun',
    d15: 'Mon',
    d16: 'Tue',
    d17: 'Wed',
    d18: 'Thu',
    d19: 'Fri',
    d20: 'Sat',
    d21: 'Sun',
    d22: 'Mon',
    d23: 'Tue',
    d24: 'Wed',
    d25: 'Thu',
    d26: 'Fri',
    d27: 'Sat',
    d28: 'Sun',
    d29: 'Mon',
    d30: 'Tue',
    d31: ''
  };
};

const createSelectedFilters = (columns: MdfoColumn[]): Record<MdfoKey, string[]> => {
  const filters = {} as Record<MdfoKey, string[]>;

  columns.forEach((column) => {
    filters[column.key] = [];
  });
  filters.rowTotal = [];

  return filters;
};

const createSearchFilters = (columns: MdfoColumn[]): Record<MdfoKey, string> => {
  const filters = {} as Record<MdfoKey, string>;

  columns.forEach((column) => {
    filters[column.key] = '';
  });

  filters.rowTotal = '';

  return filters;
};

const createOpenFilters = (columns: MdfoColumn[]): Record<MdfoKey, boolean> => {
  const filters = {} as Record<MdfoKey, boolean>;

  columns.forEach((column) => {
    filters[column.key] = false;
  });

  filters.rowTotal = false;

  return filters;
};

const getColumnWidthNumber = (width: string): number => {
  return Number(width.replace('px', ''));
};

const normalizePeriod = (value: unknown): string => {
  const period = String(value ?? '').replace(/\D/g, '');

  return /^\d{6}$/.test(period) ? period : '';
};

const normalizeRevision = (value: unknown): string => {
  return String(value ?? '').trim();
};

const formatPeriodLabel = (periode: string): string => {
  if (!/^\d{6}$/.test(periode)) {
    return periode;
  }

  const year = Number(periode.slice(0, 4));

  const month = Number(periode.slice(4, 6));

  if (month < 1 || month > 12) {
    return periode;
  }

  return new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric'
  }).format(new Date(year, month - 1, 1));
};

const formatNumber = (value: unknown): string => {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return String(value);
  }

  return numberFormatter.format(numberValue);
};

const formatCellValue = (key: MdfoKey, value: unknown): string => {
  if (!NUMERIC_COLUMN_KEYS.has(key)) {
    return value === null || value === undefined ? '' : String(value);
  }

  return formatNumber(value);
};

const formatFilterValue = (value: unknown): string => {
  return value === null || value === undefined ? '' : String(value);
};

const uniqueStrings = (values: unknown[]): string[] => {
  return Array.from(new Set(values.map((value) => String(value ?? '').trim()).filter(Boolean)));
};

const getErrorMessage = (error: unknown, fallbackMessage: string): string => {
  if (error && typeof error === 'object') {
    const responseMessage = (
      error as {
        response?: {
          data?: {
            message?: unknown;
          };
        };
      }
    ).response?.data?.message;

    if (responseMessage !== undefined && responseMessage !== null && String(responseMessage).trim() !== '') {
      return String(responseMessage);
    }
  }

  return error instanceof Error ? error.message : fallbackMessage;
};

type Plant4DuplicatePart = {
  part_no: string;
  count: number;
  rows: number[];
};

type Plant4DuplicateFile = {
  file: string;
  duplicates: Plant4DuplicatePart[];
  duplicate_part_count?: number;
};

const escapeDialogHtml = (value: unknown): string => {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const getPlant4DuplicateFilesFromError = (
  error: unknown
): Plant4DuplicateFile[] => {
  if (!error || typeof error !== 'object' || !('apiPayload' in error)) {
    return [];
  }

  const payload = (error as { apiPayload?: unknown }).apiPayload;
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const apiPayload = payload as {
    error_code?: unknown;
    duplicate_files?: unknown;
  };

  if (
    String(apiPayload.error_code ?? '') !==
    'MDFO_P4_DUPLICATE_PART_IN_FILE' ||
    !Array.isArray(apiPayload.duplicate_files)
  ) {
    return [];
  }

  return apiPayload.duplicate_files
    .map((group): Plant4DuplicateFile | null => {
      if (!group || typeof group !== 'object') return null;

      const rawGroup = group as {
        file?: unknown;
        duplicates?: unknown;
        duplicate_part_count?: unknown;
      };

      const duplicates = Array.isArray(rawGroup.duplicates)
        ? rawGroup.duplicates
            .map((item): Plant4DuplicatePart | null => {
              if (!item || typeof item !== 'object') return null;

              const rawItem = item as {
                part_no?: unknown;
                count?: unknown;
                rows?: unknown;
              };

              const partNo = String(rawItem.part_no ?? '').trim();
              if (partNo === '') return null;

              return {
                part_no: partNo,
                count: Math.max(2, Number(rawItem.count ?? 2) || 2),
                rows: Array.isArray(rawItem.rows)
                  ? rawItem.rows
                      .map((row) => Number(row))
                      .filter((row) => Number.isInteger(row) && row > 0)
                  : []
              };
            })
            .filter((item): item is Plant4DuplicatePart => item !== null)
        : [];

      if (duplicates.length === 0) return null;

      return {
        file: String(rawGroup.file ?? 'File MDFO').trim() || 'File MDFO',
        duplicates,
        duplicate_part_count: Number(rawGroup.duplicate_part_count ?? duplicates.length)
      };
    })
    .filter((group): group is Plant4DuplicateFile => group !== null);
};

const buildPlant4DuplicateWarningHtml = (
  duplicateFiles: Plant4DuplicateFile[]
): string => {
  const fileBlocks = duplicateFiles.map((group) => {
    const items = group.duplicates
      .map((duplicate) => {
        const rowLabel = duplicate.rows.length > 0
          ? ` <span style="color:#64748b;">(baris ${duplicate.rows.join(', ')})</span>`
          : '';

        return `<li style="margin:4px 0;"><strong>${escapeDialogHtml(duplicate.part_no)}</strong> — ${duplicate.count}x${rowLabel}</li>`;
      })
      .join('');

    return `
      <div style="margin:10px 0 14px;padding:10px 12px;border:1px solid #f59e0b;border-radius:8px;background:#fffbeb;">
        <div style="font-weight:700;color:#92400e;margin-bottom:6px;word-break:break-word;">${escapeDialogHtml(group.file)}</div>
        <ul style="margin:0;padding-left:20px;color:#7c2d12;">${items}</ul>
      </div>`;
  }).join('');

  return `
    <div style="text-align:left;line-height:1.45;">
      <div style="margin-bottom:10px;">
        Preview dan upload ditolak. Dalam <strong>satu file mentahan ADM P4</strong>, setiap Part Number hanya boleh muncul satu kali.
      </div>
      <div style="max-height:340px;overflow:auto;padding-right:4px;">${fileBlocks}</div>
      <div style="margin-top:10px;font-size:13px;color:#64748b;">
        Part Number yang sama pada file mentahan yang berbeda tidak dianggap duplikat oleh validasi ini.
      </div>
    </div>`;
};

// Store

export const useMdfoStore = defineStore('mdfo', () => {
  const notificationStore = useNotificationStore();
  const authStore = useAuthStore();

  type UploadMdfoPermissionAction = 'view' | 'create' | 'update' | 'delete' | 'download';

  const permissions = computed(() => ({
    view: authStore.checkAccess('Marketing.View.Monthly.UploadMdfo'),
    create: authStore.checkAccess('Marketing.Create.Monthly.UploadMdfo'),
    update: authStore.checkAccess('Marketing.Update.Monthly.UploadMdfo'),
    delete: authStore.checkAccess('Marketing.Delete.Monthly.UploadMdfo'),
    download: authStore.checkAccess('Marketing.Download.Monthly.UploadMdfo')
  }));

  const requireUploadMdfoPermission = (
    action: UploadMdfoPermissionAction,
    label: string
  ): boolean => {
    if (permissions.value[action]) {
      return true;
    }

    notificationStore.showAlertWarning(
      `Anda tidak memiliki permission ${label} untuk fitur Upload MDFO.`
    );
    return false;
  };

  const requireUploadMdfoCreateOrUpdatePermission = (): boolean => {
    if (permissions.value.create || permissions.value.update) {
      return true;
    }

    notificationStore.showAlertWarning(
      'Anda tidak memiliki permission Create/Update untuk fitur Upload MDFO.'
    );
    return false;
  };
  const rawDeleteSelectedKeys = ref<Set<string>>(new Set());
  const isDeletingRaw = ref(false);
  const quotationStore = useQuotationStore();
  const quotationTrackingStore = useQuotationTrackingStore();


  // Tracking bulk update
  // UI state and actions live in the store; save tetap memakai saveCell() existing.
  const mdfoTrackingBulkMode = ref(false);
  const mdfoTrackingBulkSelectedIds = ref<Set<number>>(new Set());

  const mdfoTrackingBulkDate = ref('');
  const mdfoTrackingBulkTime = ref('');
  const mdfoTrackingBulkUser = ref('');
  const mdfoTrackingBulkStatus = ref('');
  const mdfoTrackingBulkRemarks = ref('');

  const mdfoTrackingBulkUserDropdownOpen = ref(false);
  const mdfoTrackingBulkStatusDropdownOpen = ref(false);

  const mdfoTrackingVisibleUserOptions = computed(() => {
    return quotationTrackingStore.uploadUserOptions.filter((user) => {
      return String(user ?? '').trim().toLowerCase() !== 'pius';
    });
  });

  const mdfoTrackingBulkStatusMeta = computed(() => {
    return (
      quotationTrackingStore.statusOptions.find((option) => {
        return option.value === mdfoTrackingBulkStatus.value;
      }) ?? null
    );
  });

  const closeMdfoTrackingBulkValueDropdowns = (): void => {
    mdfoTrackingBulkUserDropdownOpen.value = false;
    mdfoTrackingBulkStatusDropdownOpen.value = false;
  };

  const toggleMdfoTrackingBulkUserValueDropdown = (): void => {
    mdfoTrackingBulkUserDropdownOpen.value =
      !mdfoTrackingBulkUserDropdownOpen.value;
    mdfoTrackingBulkStatusDropdownOpen.value = false;
  };

  const toggleMdfoTrackingBulkStatusValueDropdown = (): void => {
    mdfoTrackingBulkStatusDropdownOpen.value =
      !mdfoTrackingBulkStatusDropdownOpen.value;
    mdfoTrackingBulkUserDropdownOpen.value = false;
  };

  const selectMdfoTrackingBulkUserValue = (user: string): void => {
    mdfoTrackingBulkUser.value = String(user ?? '').trim();
    mdfoTrackingBulkUserDropdownOpen.value = false;
  };

  const selectMdfoTrackingBulkStatusValue = (status: string): void => {
    mdfoTrackingBulkStatus.value = String(status ?? '').trim();
    mdfoTrackingBulkStatusDropdownOpen.value = false;
  };

  const mdfoTrackingBulkIsApplying = ref(false);
  const mdfoTrackingBulkProgressDone = ref(0);
  const mdfoTrackingBulkProgressTotal = ref(0);
  const mdfoTrackingBulkMessage = ref('');
  const mdfoTrackingBulkMessageType =
    ref<'success' | 'warning' | 'error'>('success');

  const mdfoTrackingBulkSelectedRows = computed(() => {
    const selectedIds = mdfoTrackingBulkSelectedIds.value;

    return quotationTrackingStore.sortedRows.filter((row) => {
      return selectedIds.has(Number(row.id));
    });
  });

  const mdfoTrackingBulkSelectedCount = computed(() => {
    return mdfoTrackingBulkSelectedIds.value.size;
  });

  const mdfoTrackingBulkHasChanges = computed(() => {
    return Boolean(
      mdfoTrackingBulkDate.value ||
      mdfoTrackingBulkTime.value ||
      mdfoTrackingBulkUser.value ||
      mdfoTrackingBulkStatus.value ||
      mdfoTrackingBulkRemarks.value.trim()
    );
  });

  const isMdfoTrackingBulkCurrentPageSelected = computed(() => {
    const rows = quotationTrackingStore.paginatedRows;

    return (
      rows.length > 0 &&
      rows.every((row) => {
        return mdfoTrackingBulkSelectedIds.value.has(Number(row.id));
      })
    );
  });

  const getMdfoJakartaDateValue = (): string => {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(new Date());

    const year =
      parts.find((part) => part.type === 'year')?.value ?? '';
    const month =
      parts.find((part) => part.type === 'month')?.value ?? '';
    const day =
      parts.find((part) => part.type === 'day')?.value ?? '';

    return year && month && day
      ? `${year}-${month}-${day}`
      : '';
  };

  const getMdfoJakartaTimeValue = (): string => {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    }).formatToParts(new Date());

    const hour =
      parts.find((part) => part.type === 'hour')?.value ?? '00';
    const minute =
      parts.find((part) => part.type === 'minute')?.value ?? '00';

    return `${hour}:${minute}`;
  };

  const toggleMdfoTrackingBulkMode = (): void => {
    mdfoTrackingBulkMode.value = !mdfoTrackingBulkMode.value;
    mdfoTrackingBulkMessage.value = '';
    closeMdfoTrackingBulkValueDropdowns();
  };

  const isMdfoTrackingBulkRowSelected = (
    trackingId: number
  ): boolean => {
    return mdfoTrackingBulkSelectedIds.value.has(Number(trackingId));
  };

  const toggleMdfoTrackingBulkRow = (trackingId: number): void => {
    const id = Number(trackingId);

    if (!Number.isFinite(id) || id <= 0) {
      return;
    }

    const next = new Set(mdfoTrackingBulkSelectedIds.value);

    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }

    mdfoTrackingBulkSelectedIds.value = next;
    mdfoTrackingBulkMessage.value = '';
  };

  const selectMdfoTrackingBulkCurrentPage = (): void => {
    const next = new Set(mdfoTrackingBulkSelectedIds.value);

    quotationTrackingStore.paginatedRows.forEach((row) => {
      const id = Number(row.id);

      if (Number.isFinite(id) && id > 0) {
        next.add(id);
      }
    });

    mdfoTrackingBulkSelectedIds.value = next;
    mdfoTrackingBulkMessage.value = '';
  };

  const toggleMdfoTrackingBulkCurrentPageSelection = (): void => {
    const next = new Set(mdfoTrackingBulkSelectedIds.value);

    if (isMdfoTrackingBulkCurrentPageSelected.value) {
      quotationTrackingStore.paginatedRows.forEach((row) => {
        next.delete(Number(row.id));
      });
    } else {
      quotationTrackingStore.paginatedRows.forEach((row) => {
        const id = Number(row.id);

        if (Number.isFinite(id) && id > 0) {
          next.add(id);
        }
      });
    }

    mdfoTrackingBulkSelectedIds.value = next;
    mdfoTrackingBulkMessage.value = '';
  };

  const selectMdfoTrackingBulkFilteredRows = async (): Promise<void> => {
    try {
      const targets = await quotationTrackingStore.collectFilteredTargets(2000);
      const next = new Set(mdfoTrackingBulkSelectedIds.value);

      targets.forEach((target) => {
        if (Number.isInteger(target.id) && target.id > 0) {
          next.add(target.id);
        }
      });

      mdfoTrackingBulkSelectedIds.value = next;
      mdfoTrackingBulkMessage.value = '';
    } catch (error: unknown) {
      notificationStore.showAlertWarning(
        getErrorMessage(error, 'Gagal memilih seluruh hasil filter Tracking.')
      );
    }
  };

  const clearMdfoTrackingBulkSelection = (): void => {
    mdfoTrackingBulkSelectedIds.value = new Set();
    mdfoTrackingBulkMessage.value = '';
  };

  const requestTrackingLifecycleDelete = async (
    mode: 'SELECTED' | 'FILTERED'
  ): Promise<void> => {
    if (!requireUploadMdfoPermission('delete', 'Delete')) return;
    try {
      const targets = mode === 'FILTERED'
        ? (await quotationTrackingStore.collectFilteredTargets(2000))
          .map((row) => ({ id: Number(row.id) }))
        : [...mdfoTrackingBulkSelectedIds.value]
          .map((id) => ({ id: Number(id) }))
          .filter((target) => Number.isInteger(target.id) && target.id > 0);

      if (targets.length === 0) {
        notificationStore.showAlertWarning('Pilih minimal satu Tracking terlebih dahulu.');
        return;
      }
      if (targets.length > 2000) {
        notificationStore.showAlertWarning(
          'Maksimal 2.000 Tracking per delete. Persempit filter terlebih dahulu.'
        );
        return;
      }

      const preview = await previewMdfoDelete({
        entity: 'TRACKING', selection_mode: mode, targets,
        customer: selectedCustomerFilter.value,
        periode: selectedPeriodFilter.value,
        revision: selectedRevisionFilter.value
      });
      if (preview.impact.safe === 0) {
        notificationStore.showAlertWarning(preview.message);
        return;
      }

      notificationStore.showConfirm(
        `Delete Tracking ${mode === 'FILTERED' ? 'Filtered' : 'Selected'}`,
        `${preview.message}

Tindakan ini hanya mengarsipkan/menyembunyikan Tracking; Raw MDFO dan dokumen bisnis tidak dihapus. Lanjutkan?`,
        async () => {
          try {
            const result = await executeMdfoDelete({ token: preview.token });
            clearMdfoTrackingBulkSelection();
            await loadQuotationTracking();
            notificationStore.showAlertSuccess(result.message);
          } catch (error: unknown) {
            notificationStore.showAlertError(
              getErrorMessage(error, 'Delete Tracking gagal.')
            );
          }
        },
        () => {},
        'Delete Tracking',
        'Batal'
      );
    } catch (error: unknown) {
      notificationStore.showAlertError(
        getErrorMessage(error, 'Preview delete Tracking gagal.')
      );
    }
  };

  const setMdfoTrackingBulkToday = (): void => {
    mdfoTrackingBulkDate.value = getMdfoJakartaDateValue();
  };

  const setMdfoTrackingBulkNow = (): void => {
    mdfoTrackingBulkTime.value = getMdfoJakartaTimeValue();
  };

  const applyMdfoTrackingBulkUpdate = async (): Promise<void> => {
    if (!requireUploadMdfoPermission('update', 'Update')) return;
    if (mdfoTrackingBulkIsApplying.value) {
      return;
    }

    const ids = [...mdfoTrackingBulkSelectedIds.value]
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0);

    if (ids.length === 0) {
      mdfoTrackingBulkMessageType.value = 'warning';
      mdfoTrackingBulkMessage.value =
        'Pilih minimal satu baris Tracking terlebih dahulu.';
      return;
    }

    if (ids.length > 2000) {
      mdfoTrackingBulkMessageType.value = 'warning';
      mdfoTrackingBulkMessage.value =
        'Maksimal 2.000 Tracking per update massal.';
      return;
    }

    if (!mdfoTrackingBulkHasChanges.value) {
      mdfoTrackingBulkMessageType.value = 'warning';
      mdfoTrackingBulkMessage.value =
        'Isi minimal satu field yang ingin diterapkan.';
      return;
    }

    const changes: Partial<Record<'uploadDate' | 'uploadTime' | 'uploadBy' | 'status' | 'remarks', string>> = {};
    if (mdfoTrackingBulkDate.value) changes.uploadDate = mdfoTrackingBulkDate.value;
    if (mdfoTrackingBulkTime.value) changes.uploadTime = mdfoTrackingBulkTime.value;
    if (mdfoTrackingBulkUser.value) changes.uploadBy = mdfoTrackingBulkUser.value;
    if (mdfoTrackingBulkStatus.value) changes.status = mdfoTrackingBulkStatus.value;
    const bulkRemarks = mdfoTrackingBulkRemarks.value.trim();
    if (bulkRemarks) changes.remarks = bulkRemarks;

    mdfoTrackingBulkIsApplying.value = true;
    mdfoTrackingBulkProgressDone.value = 0;
    mdfoTrackingBulkProgressTotal.value = ids.length;
    mdfoTrackingBulkMessage.value = '';

    try {
      await quotationTrackingStore.bulkUpdateByIds(ids, changes);
      mdfoTrackingBulkProgressDone.value = ids.length;

      // Setelah update berhasil, selection lama tidak boleh tetap aktif setelah
      // tabel direload karena dapat membuat user meng-update ID yang sama lagi.
      clearMdfoTrackingBulkSelection();
      mdfoTrackingBulkMessageType.value = 'success';
      mdfoTrackingBulkMessage.value =
        `${ids.length} baris Tracking berhasil diperbarui.`;
    } catch (error: unknown) {
      mdfoTrackingBulkMessageType.value = 'error';
      mdfoTrackingBulkMessage.value = getErrorMessage(
        error,
        'Update massal Tracking gagal.'
      );
    } finally {
      mdfoTrackingBulkIsApplying.value = false;
    }
  };

  // Page

  const page =
    ref({
      title: 'Upload MDFO'
    });

  const breadcrumbs =
    shallowRef([
      {
        title: 'Marketing',
        disabled: false,
        href: '#'
      },
      {
        title: 'MDFO',
        disabled: false,
        href: '#'
      },
      {
        title: 'Upload MDFO',
        disabled: true,
        href: '#'
      }
    ]);

  const uploadFileInput =
    shallowRef<HTMLInputElement | null>(null);

  // Data and requests

  const rows = ref<MdfoRow[]>([]);

  // TMMIN dan NTC memakai struktur Raw Files khusus.
  const dataMode = ref<MdfoDataMode>('standard');
  const tmminRows = ref<TmminMdfoRow[]>([]);
  const tmminColumns = ref<TmminMdfoColumn[]>([]);

  const ntcRows = ref<NtcMdfoRow[]>([]);
  const ntcColumns = ref<NtcMdfoColumn[]>([]);
  const ntcTotalsFromApi = ref<NtcMdfoTotals>({});
  const ntcMonthHeaders = ref<NtcMdfoMonthHeaders>({
    forecast1: '',
    forecast2: '',
    forecast3: ''
  });

  const gayaRows = ref<GayaMdfoRow[]>([]);
  const gayaColumns = ref<GayaMdfoColumn[]>([]);
  const gayaTotalsFromApi = ref<GayaMdfoTotals>({});
  const gayaCurrentPage = ref(1);
  const gayaRowsPerPage = ref(10);

  // Filter/sort khusus Raw MDFO Gaya Motor.
  // Dipisahkan dari filter ADM/NTC karena struktur kolom Gaya Motor dinamis.
  const gayaSelectedFilters = ref<Record<string, string[]>>({});
  const gayaSearchFilters = ref<Record<string, string>>({});
  const gayaActiveFilterKey = ref<string | null>(null);
  const gayaFilterPopupPosition = ref({ top: 0, left: 0 });
  const gayaSortKey = ref('');
  const gayaSortDirection = ref<'none' | 'asc' | 'desc'>('none');

  const batchId = ref<number | null>(null);

  const isLoading = ref(false);

  const isUploading = ref(false);

  const isDownloadingExcel = ref(false);

  const dayHeaders = reactive<Record<MdfoDayKey, string>>(createDefaultDayHeaders());

  // Page UI state

  const showTableCustomerDropdown = ref(false);

  const showTablePeriodDropdown = ref(false);

  const showTableRevisionDropdown = ref(false);

  const showMdfoCustomerDropdown = ref(false);

  const showMdfoUploadUserDropdown = ref(false);

  const showMdfoUploadPreview = ref(false);

  type DpmSanitizedPdfPreview = DpmSanitizedPdfFile & {
    url: string;
  };

  const showDpmSanitizedPdfPreview = ref(false);

  const isPreparingDpmSanitizedPdfs = ref(false);

  const dpmSanitizedPdfError = ref('');

  const dpmSanitizedPdfs = shallowRef<DpmSanitizedPdfPreview[]>([]);

  const activeDpmSanitizedPdfIndex = ref(0);

  // Upload

  const selectedFiles = ref<File[]>([]);

  const selectedCustomerUpload = ref('');


  type FtiUploadMode = 'manual' | 'ocr';
  type FtiManualQty = number | '';
  type FtiManualRowDraft = {
    id: string;
    required: boolean;
    partNo: string;
    partName: string;
    n: FtiManualQty;
    n1: FtiManualQty;
    n2: FtiManualQty;
    n3: FtiManualQty;
    poNumber: string;
    poDate: string;
    deliveryDate: string;
  };

  const FTI_REQUIRED_PARTS: FtiPartOption[] = [
    {
      part_no: '53717-BZ200-00',
      part_name: 'GUSSET FENDER APRON RH',
      required: true
    },
    {
      part_no: '53718-BZ200-00',
      part_name: 'GUSSET FENDER APRON LH',
      required: true
    }
  ];


  const MES_REQUIRED_PARTS: FtiPartOption[] = [
    {
      part_no: '68639-BZ010-00',
      part_name: 'BRACKET R/D CHECK NO.3',
      required: true
    },
    {
      part_no: '57161-BZ120-00',
      part_name: 'MEMBER FRONT CROSS REAR',
      required: true
    }
  ];

  let ftiManualRowSequence = 0;

  const createFtiManualRow = (
    option?: FtiPartOption,
    required = false
  ): FtiManualRowDraft => ({
    id: `fti-manual-${++ftiManualRowSequence}`,
    required: required || option?.required === true,
    partNo: option?.part_no ?? '',
    partName: option?.part_name ?? '',
    n: '',
    n1: '',
    n2: '',
    n3: '',
    poNumber: '',
    poDate: '',
    deliveryDate: ''
  });

  const createDefaultFtiManualRows = (): FtiManualRowDraft[] =>
    FTI_REQUIRED_PARTS.map((option) => createFtiManualRow(option, true));

  const ftiUploadMode = ref<FtiUploadMode>('manual');
  const ftiManualPeriod = ref('');
  const ftiManualScheduleFile = shallowRef<File | null>(null);
  const ftiManualForecastFile = shallowRef<File | null>(null);
  const ftiManualSourceInputKey = ref(0);
  const ftiManualPartOptions = ref<FtiPartOption[]>([
    ...FTI_REQUIRED_PARTS
  ]);

  /*
   * Lookup Part Name lintas customer dilakukan ON DEMAND per Part No.
   * Dengan cara ini frontend tidak perlu memuat seluruh histori part customer
   * lain ke memory. Hasil lookup disimpan kecil di cache selama modal aktif.
   */
  const ftiManualPartNameLookupCache = new Map<
    string,
    FtiPartOption | null
  >();
  const ftiManualPartNameResolvingRows = ref<Record<string, string>>({});

  const ftiManualRows = ref<FtiManualRowDraft[]>(
    createDefaultFtiManualRows()
  );


  let mesManualRowSequence = 0;

  const createMesManualRow = (
    option?: FtiPartOption,
    required = false
  ): FtiManualRowDraft => ({
    id: `mes-manual-${++mesManualRowSequence}`,
    required: required || option?.required === true,
    partNo: option?.part_no ?? '',
    partName: option?.part_name ?? '',
    n: '',
    n1: '',
    n2: '',
    n3: '',
    poNumber: '',
    poDate: '',
    deliveryDate: ''
  });

  const createDefaultMesManualRows = (): FtiManualRowDraft[] =>
    MES_REQUIRED_PARTS.map((option) => createMesManualRow(option, true));

  const mesManualPeriod = ref('');
  const mesManualPartOptions = ref<FtiPartOption[]>([...MES_REQUIRED_PARTS]);
  const mesManualRows = ref<FtiManualRowDraft[]>(createDefaultMesManualRows());
  const mesManualPartNameLookupCache = new Map<string, FtiPartOption | null>();
  const mesManualPartNameResolvingRows = ref<Record<string, string>>({});

  const isMesManualMode = computed(() =>
    selectedCustomerUpload.value.trim().toUpperCase() === 'MES'
  );

  const mesManualPeriodCompact = computed(() => normalizePeriod(mesManualPeriod.value));

  const mesManualMonthLabels = computed(() => {
    const period = mesManualPeriodCompact.value;
    if (!/^\d{6}$/.test(period)) return ['N', 'N+1', 'N+2', 'N+3'];
    const year = Number(period.slice(0, 4));
    const month = Number(period.slice(4, 6));
    return Array.from({ length: 4 }, (_, offset) => {
      const date = new Date(year, month - 1 + offset, 1);
      const monthName = new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(date);
      return `${offset === 0 ? 'N' : `N+${offset}`} (${monthName})`;
    });
  });

  const showMesZsttModal = ref(false);
  const isSubmittingMesZstt = ref(false);
  const isLoadingMesZsttDraft = ref(false);
  const mesZsttBatchId = ref<number | null>(null);
  const mesZsttPeriod = ref('');
  type MesZsttDraftRow = {
    rawId: number;
    partNo: string;
    partName: string;
    targetQty: number;
    daily: Record<MdfoDayKey, number | ''>;
  };
  const MES_ZSTT_PART_PRIORITY = new Map<string, number>([
    ['68639-BZ010-00', 0],
    ['57161-BZ120-00', 1]
  ]);
  const getMesZsttPartPriority = (partNo: string): number =>
    MES_ZSTT_PART_PRIORITY.get(String(partNo ?? '').trim().toUpperCase()) ?? 999;
  const createMesDailyFromRawRow = (
    row: Record<string, unknown>
  ): Record<MdfoDayKey, number | ''> =>
    DAY_KEYS.reduce((result, key) => {
      const rawValue = row[key];
      const numericValue = Number(rawValue);
      result[key] = rawValue === '' || rawValue === null || rawValue === undefined || numericValue === 0
        ? ''
        : numericValue;
      return result;
    }, {} as Record<MdfoDayKey, number | ''>);
  const mesZsttRows = ref<MesZsttDraftRow[]>([]);
  const mesZsttDayKeys = computed<MdfoDayKey[]>(() => {
    const period = normalizePeriod(mesZsttPeriod.value);
    if (!/^\d{6}$/.test(period)) return [...DAY_KEYS];
    const year = Number(period.slice(0, 4));
    const month = Number(period.slice(4, 6));
    const days = new Date(year, month, 0).getDate();
    return DAY_KEYS.slice(0, days);
  });

  const normalizeFtiManualPoNumber = (value: unknown): string =>
    String(value ?? '')
      .replace(/\D/g, '')
      .slice(0, 10);

  const setFtiManualPoNumber = (
    rowId: string,
    value: unknown
  ): void => {
    const rowIndex = ftiManualRows.value.findIndex((item) => item.id === rowId);
    if (rowIndex < 0) return;

    const normalizedPoNumber = normalizeFtiManualPoNumber(value);
    ftiManualRows.value[rowIndex].poNumber = normalizedPoNumber;

    /*
     * PO Number pada baris pertama menjadi acuan untuk seluruh baris di bawahnya.
     * Ini juga mencakup Part tambahan yang dibuat lewat tombol Add Part.
     */
    if (rowIndex === 0) {
      ftiManualRows.value.slice(1).forEach((row) => {
        row.poNumber = normalizedPoNumber;
      });
    }
  };

  const onFtiManualPoNumberInput = (
    rowId: string,
    event: Event
  ): void => {
    const input = event.target as HTMLInputElement | null;
    if (!input) return;

    setFtiManualPoNumber(rowId, input.value);

    const row = ftiManualRows.value.find((item) => item.id === rowId);
    input.value = row?.poNumber ?? '';
  };

  const getFtiManualPoNumberLength = (rowId: string): number => {
    const row = ftiManualRows.value.find((item) => item.id === rowId);
    return normalizeFtiManualPoNumber(row?.poNumber ?? '').length;
  };

  const isFtiManualPoNumberValid = (rowId: string): boolean => {
    const row = ftiManualRows.value.find((item) => item.id === rowId);
    return /^\d{10}$/.test(String(row?.poNumber ?? '').trim());
  };

  const getFtiManualPoNumberWarning = (rowId: string): string => {
    const row = ftiManualRows.value.find((item) => item.id === rowId);
    if (!row) return '';

    const value = String(row.poNumber ?? '').trim();
    if (value === '' || /^\d{10}$/.test(value)) return '';

    return `PO Number FTI harus tepat 10 digit (${normalizeFtiManualPoNumber(value).length}/10 digit).`;
  };

  const firstInvalidFtiManualPoNumber = (): FtiManualRowDraft | null =>
    ftiManualRows.value.find(
      (row) => !/^\d{10}$/.test(String(row.poNumber ?? '').trim())
    ) ?? null;
  const ftiManualSourceRows = ref<FtiManualSourceRow[]>([]);
  const ftiManualSourceMismatches = ref<Array<{ message: string }>>([]);
  const isLoadingFtiManualSources = ref(false);

  const isFtiManualMode = computed(() =>
    selectedCustomerUpload.value.trim().toUpperCase() === 'FTI' &&
    ftiUploadMode.value === 'manual'
  );

  const isFtiOcrMode = computed(() =>
    selectedCustomerUpload.value.trim().toUpperCase() === 'FTI' &&
    ftiUploadMode.value === 'ocr'
  );

  const ftiManualPeriodCompact = computed(() =>
    normalizePeriod(ftiManualPeriod.value)
  );

  const ftiManualSourceFiles = computed<File[]>(() => {
    const files: File[] = [];
    if (ftiManualScheduleFile.value) files.push(ftiManualScheduleFile.value);
    if (ftiManualForecastFile.value) files.push(ftiManualForecastFile.value);
    return files;
  });

  /*
   * Forecast baru dianggap benar-benar LOCK setelah backend berhasil
   * membaca minimal satu row Forecast. Jadi field N+1..N+3 tidak menjadi
   * readonly kosong hanya karena file sudah dipilih.
   */
  const ftiManualForecastLocked = computed(() =>
    ftiManualForecastFile.value !== null &&
    ftiManualSourceRows.value.some((row) => row.forecast_found === true)
  );

  const ftiManualMonthLabels = computed(() => {
    const period = ftiManualPeriodCompact.value;
    if (!/^\d{6}$/.test(period)) {
      return ['N', 'N+1', 'N+2', 'N+3'];
    }

    const year = Number(period.slice(0, 4));
    const month = Number(period.slice(4, 6));

    return Array.from({ length: 4 }, (_, offset) => {
      const date = new Date(year, month - 1 + offset, 1);
      const monthName = new Intl.DateTimeFormat('id-ID', {
        month: 'short'
      }).format(date);
      return `${offset === 0 ? 'N' : `N+${offset}`} (${monthName})`;
    });
  });

  // Revision upload tidak lagi diinput manual. Nilai ini selalu berasal
  // dari hasil deteksi backend dan ditampilkan readonly di form.
  const uploadRevision = ref<string | number>('');

  const uploadRevisionPlan = ref<MdfoRevisionDetectionResponse | null>(null);

  const isDetectingUploadRevision = ref(false);

  const uploadRevisionConfirmed = ref(false);

  let uploadRevisionDetectionSequence = 0;

  const uploadUserOptions = USER_MASTER.map((user) => user.name);

  const uploadBy = ref('');

  const loggedInUploadUsername = computed(() =>
    normalizeUploadAccountValue(authStore.user?.username)
  );

  const loggedInUploadFullname = computed(() =>
    normalizeUploadAccountValue(authStore.user?.fullname)
  );

  // Administrator dan akun tester tetap boleh memilih Upload By manual.
  // Akun tester lokal saat ini memakai username `testing` dan fullname `Tester IT`.
  const canSelectUploadUser = computed(() => {
    return (
      loggedInUploadUsername.value === 'ADMINISTRATOR' ||
      loggedInUploadUsername.value === 'TESTER' ||
      loggedInUploadUsername.value === 'TESTING' ||
      loggedInUploadFullname.value === 'ADMINISTRATOR' ||
      loggedInUploadFullname.value === 'TESTER' ||
      loggedInUploadFullname.value === 'TESTER IT'
    );
  });

  const mappedUploadUser = computed(() => {
    return (
      UPLOAD_USER_BY_USERNAME[loggedInUploadUsername.value] ||
      UPLOAD_USER_BY_FULLNAME[loggedInUploadFullname.value] ||
      ''
    );
  });

  const hasUploadUserLoginMapping = computed(() => {
    return canSelectUploadUser.value || mappedUploadUser.value !== '';
  });

  const syncUploadUserFromLogin = (): void => {
    showMdfoUploadUserDropdown.value = false;

    if (canSelectUploadUser.value) {
      if (!uploadUserOptions.includes(uploadBy.value)) {
        uploadBy.value = '';
      }
      return;
    }

    uploadBy.value = mappedUploadUser.value;
  };

  watch(
    [loggedInUploadUsername, loggedInUploadFullname],
    () => syncUploadUserFromLogin(),
    { immediate: true }
  );

  const showUploadModal = ref(false);

  // Dipakai untuk mereset input file setelah modal ditutup atau upload selesai.
  const uploadInputKey = ref(0);

  // Status check file.
  const isCheckingFiles = ref(false);

  const filesChecked = ref(false);

  const fileCheckResults = ref<MdfoFileCheckResult[]>([]);

  // Workbook yang sudah lolos validasi. Index mengikuti selectedFiles.
  const validatedWorkbooks = shallowRef<Array<XLSX.WorkBook | null>>([]);

  // Preview file.
  const activePreviewFileIndex = ref(0);

  const isPreviewLoading = ref(false);

  const excelWorkbook = shallowRef<XLSX.WorkBook | null>(null);

  const excelSheetNames = ref<string[]>([]);

  const selectedExcelSheet = ref('');

  const excelPreviewHeaders = ref<string[]>([]);


  type MdfoPreviewSummary = {
    mode: 'ADM' | 'TMMIN' | 'NTC' | 'GAYA MOTOR' | 'DPM' | 'FTI' | 'MES';
    customer: string;
    period: string;
    periodLabel: string;
    revision: string;
    regNo: string;
    dockCode: string;
    vendorCode: string;
    vendorName: string;
    vendorAddress: string;
    supplierCode: string;
    companyCode: string;
    totalRows: number;
    plant?: string;
    plantDesc?: string;
    poNumbers?: string[];
    totalFiles?: number;
    mappedRows?: number;
    unmappedRows?: number;
    poDate?: string;
    deliveryDate?: string;
    sourceFiles?: string[];
  };

  type MdfoPreviewForecastItem = {
    key: string;
    period: string;
    periodLabel: string;
    total: number;
  };

  const excelPreviewSummary =
    ref<MdfoPreviewSummary>({
      mode: 'ADM',
      customer: '',
      period: '',
      periodLabel: '',
      revision: '',
      regNo: '',
      dockCode: '',
      vendorCode: '',
      vendorName: '',
      vendorAddress: '',
      supplierCode: '',
      companyCode: '',
      totalRows: 0
    });

  const excelPreviewForecastSummary =
    ref<MdfoPreviewForecastItem[]>([]);

  const dpmPreviewWarnings = ref<DpmPreviewWarning[]>([]);

  const excelPreviewDetectedHeaderRow =
    ref(0);

  const excelPreviewRows = ref<ExcelCell[][]>([]);

  const excelPreviewError = ref('');

  const customerUploadOptions = [...CUSTOMER_UPLOAD_OPTIONS].sort(
    (first, second) =>
      first.localeCompare(second, 'id', {
        numeric: true,
        sensitivity: 'base'
      })
  );


  const selectedFileNames = computed(() => {
    return selectedFiles.value.map((file) => file.name);
  });

  const activePreviewFile = computed<File | null>(() => {
    return selectedFiles.value[activePreviewFileIndex.value] ?? null;
  });

  const allCheckedFilesValid = computed(() => {
    return (
      selectedFiles.value.length > 0 &&
      filesChecked.value &&
      fileCheckResults.value.length === selectedFiles.value.length &&
      fileCheckResults.value.every((result) => result.valid)
    );
  });

  const canOpenUploadPreview = computed(() => {
    if (isMesManualMode.value) {
      return (
        mesManualPeriodCompact.value !== '' &&
        mesManualRows.value.length > 0 &&
        !isPreviewLoading.value
      );
    }

    if (isFtiManualMode.value) {
      return (
        ftiManualScheduleFile.value !== null &&
        ftiManualPeriodCompact.value !== '' &&
        !isLoadingFtiManualSources.value &&
        !isPreviewLoading.value
      );
    }

    return (
      selectedFiles.value.length > 0 &&
      !isCheckingFiles.value &&
      !isPreviewLoading.value
    );
  });

  const normalizedUploadRevision = computed(() => {
    return String(uploadRevision.value ?? '').trim();
  });

  const isUploadRevisionDetected = computed(() => {
    return (
      !isDetectingUploadRevision.value &&
      uploadRevisionPlan.value !== null &&
      uploadRevisionPlan.value.can_upload === true &&
      /^\d+$/.test(normalizedUploadRevision.value)
    );
  });

  const isUploadRevisionReady = computed(() => {
    return (
      isUploadRevisionDetected.value &&
      uploadRevisionConfirmed.value
    );
  });

  const isFtiManualRowsComplete = computed(() => {
    if (!isFtiManualMode.value) return true;

    const requiredParts = new Set(
      FTI_REQUIRED_PARTS.map((item) => item.part_no)
    );
    const seen = new Set<string>();

    for (const row of ftiManualRows.value) {
      const partNo = row.partNo.trim().toUpperCase();
      const partName = row.partName.trim();

      if (partNo === '' || partName === '') return false;
      if (seen.has(partNo)) return false;
      seen.add(partNo);

      if (
        row.n === '' ||
        !Number.isFinite(Number(row.n)) ||
        Number(row.n) < 0
      ) {
        return false;
      }

      // Forecast FTI bersifat opsional. Kosong disimpan sebagai NULL,
      // sedangkan angka 0 tetap berarti forecast benar-benar nol.
      for (const optional of [row.n1, row.n2, row.n3]) {
        if (
          optional !== '' &&
          (!Number.isFinite(Number(optional)) || Number(optional) < 0)
        ) {
          return false;
        }
      }

      if (
        !/^\d{10}$/.test(row.poNumber.trim()) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(row.poDate) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(row.deliveryDate)
      ) {
        return false;
      }
    }

    return Array.from(requiredParts).every((partNo) => seen.has(partNo));
  });


  const isMesManualRowsComplete = computed(() => {
    if (!isMesManualMode.value) return true;
    const requiredParts = new Set(MES_REQUIRED_PARTS.map((item) => item.part_no));
    const seen = new Set<string>();
    for (const row of mesManualRows.value) {
      const partNo = row.partNo.trim().toUpperCase();
      const partName = row.partName.trim();
      if (!partNo || !partName || seen.has(partNo)) return false;
      seen.add(partNo);
      if (row.n === '' || !Number.isFinite(Number(row.n)) || Number(row.n) < 0) return false;
      for (const optional of [row.n1, row.n2, row.n3]) {
        if (optional !== '' && (!Number.isFinite(Number(optional)) || Number(optional) < 0)) return false;
      }
      // Khusus MES, PO Number / PO Date / Delivery Date bersifat opsional.
      // Jika tanggal diisi, format native input date harus tetap YYYY-MM-DD.
      for (const optionalDate of [row.poDate, row.deliveryDate]) {
        if (optionalDate !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(optionalDate)) {
          return false;
        }
      }
    }
    return Array.from(requiredParts).every((partNo) => seen.has(partNo));
  });

  const isMesUploadSetComplete = computed(() =>
    !isMesManualMode.value || (
      mesManualPeriodCompact.value !== '' &&
      mesManualRows.value.length > 0 &&
      isMesManualRowsComplete.value
    )
  );

  const isFtiUploadSetComplete = computed(() => {
    if (selectedCustomerUpload.value.trim().toUpperCase() !== 'FTI') {
      return true;
    }

    if (isFtiManualMode.value) {
      return (
        ftiManualPeriodCompact.value !== '' &&
        ftiManualScheduleFile.value !== null &&
        ftiManualRows.value.length > 0 &&
        isFtiManualRowsComplete.value
      );
    }

    const extensions = selectedFiles.value.map((file) =>
      getFileExtension(file.name)
    );

    return (
      selectedFiles.value.length === 3 &&
      extensions.filter((extension) => extension === 'pdf').length === 1 &&
      extensions.filter((extension) => extension === 'xlsx' || extension === 'xls').length === 2
    );
  });

  const canSubmitUpload = computed(() => {
    const hasUploadSource = isMesManualMode.value
      ? mesManualPeriodCompact.value !== ''
      : isFtiManualMode.value
        ? ftiManualScheduleFile.value !== null
        : selectedFiles.value.length > 0;

    return (
      selectedCustomerUpload.value.trim() !== '' &&
      hasUploadSource &&
      isUploadRevisionDetected.value &&
      isFtiUploadSetComplete.value &&
      isMesUploadSetComplete.value &&
      uploadBy.value.trim() !== '' &&
      !isCheckingFiles.value &&
      !isLoadingFtiManualSources.value &&
      !isDetectingUploadRevision.value &&
      !isUploading.value
    );
  });

  const excelColumnCount = computed(() => {
    const headerLength = excelPreviewHeaders.value.length;

    const rowLength = excelPreviewRows.value.reduce((maximum, row) => {
      return Math.max(maximum, row.length);
    }, 0);

    return Math.max(headerLength, rowLength);
  });

  const normalizedExcelPreviewRows = computed(() => {
    return excelPreviewRows.value.map((row) => {
      return Array.from(
        {
          length: excelColumnCount.value
        },
        (_, index) => {
          return row[index] ?? '';
        }
      );
    });
  });

  // Main filters

  const selectedCustomerFilter = ref('');

  const selectedPeriodFilter = ref('');

  const selectedRevisionFilter = ref('');

  // Lebar viewport dipakai hanya untuk menentukan freeze Raw MDFO ADM.
  // Nilai default desktop menjaga SSR / test environment tetap aman.
  const rawMdfoViewportWidth = ref(
    typeof window !== 'undefined'
      ? window.innerWidth
      : ADM_DESKTOP_FREEZE_MIN_WIDTH
  );

  const syncRawMdfoViewportWidth = (): void => {
    if (typeof window === 'undefined') {
      return;
    }

    rawMdfoViewportWidth.value = window.innerWidth;
  };

  const isResponsiveAdmRawScope = computed(() => {
    if (dataMode.value !== 'standard') {
      return false;
    }

    const customer = normalizeMdfoDownloadCustomer(
      selectedCustomerFilter.value
    );

    // Saat belum memilih customer, Raw standard tetap memakai perilaku responsif ADM.
    return (
      customer === '' ||
      RESPONSIVE_ADM_RAW_CUSTOMERS.has(customer)
    );
  });

  const isLaptopAdmRawFreeze = computed(() => {
    return (
      isResponsiveAdmRawScope.value &&
      rawMdfoViewportWidth.value < ADM_DESKTOP_FREEZE_MIN_WIDTH
    );
  });

  const activeFrozenColumns = computed<MdfoKey[]>(() => {
    return isLaptopAdmRawFreeze.value
      ? LAPTOP_FROZEN_COLUMNS
      : FROZEN_COLUMNS;
  });

  /*
   * Customer yang dicentang menentukan scope tabel + download.
   * Raw Files multi-customer hanya menggabungkan customer ADM-format
   * (ADM P1 / ADM P4 / DCWA / ADM P5). TMMIN dan NTC tetap ikut
   * Quotation / Contract / ZSTT serta download, tetapi tidak dicampur
   * ke tabel Raw ADM karena struktur kolomnya berbeda.
   */
  // Default halaman adalah All Customers secara nyata, bukan sekadar label.
  // Dengan begitu Period + Revision yang sudah dipilih langsung dapat dipakai
  // untuk download seluruh customer tanpa harus membuka dropdown Customer.
  const selectedDownloadCustomers = ref<string[]>([...MDFO_DOWNLOAD_CUSTOMER_ORDER]);
  const draftDownloadCustomers = ref<string[]>([...MDFO_DOWNLOAD_CUSTOMER_ORDER]);

  // Total row untuk seluruh scope customer terpilih.
  // Nilai ini dipakai bersama oleh tombol download Raw dan Quotation/Contract/ZSTT.
  const downloadScopeRowCount = ref(0);
  const isLoadingDownloadScopeRowCount = ref(false);
  let downloadScopeRowCountRequestId = 0;

  const selectedDownloadCustomerScopeKey = computed(() => {
    return selectedDownloadCustomers.value
      .map(normalizeMdfoDownloadCustomer)
      .filter(Boolean)
      .join('|');
  });

  const getSelectedScopeCustomers = (): string[] => {
    const selected = selectedDownloadCustomers.value
      .map(normalizeMdfoDownloadCustomer)
      .filter((customer, index, values) => {
        return customer !== '' && values.indexOf(customer) === index;
      });

    if (selected.length > 0) {
      return selected;
    }

    const fallback = normalizeMdfoDownloadCustomer(
      selectedCustomerFilter.value
    );

    return fallback !== '' ? [fallback] : [];
  };

  const getDocumentScopeCustomers = (
    scopeCustomers: string[]
  ): string[] => {
    return scopeCustomers
      .map(normalizeMdfoDownloadCustomer)
      .filter(
        (customer, index, values) =>
          customer !== '' &&
          MDFO_DOCUMENT_CUSTOMERS.has(customer) &&
          values.indexOf(customer) === index
      );
  };

  const getRawDisplayCustomers = (
    scopeCustomers: string[]
  ): string[] => {
    if (scopeCustomers.length === 0) {
      return [...RAW_STANDARD_DISPLAY_CUSTOMER_ORDER];
    }

    if (scopeCustomers.length <= 1) {
      return [...scopeCustomers];
    }

    const selected = new Set(
      scopeCustomers.map(normalizeMdfoDownloadCustomer)
    );

    const standardCustomers =
      RAW_STANDARD_DISPLAY_CUSTOMER_ORDER.filter((customer) => {
        return selected.has(customer);
      });

    // Jika ada customer ADM-format, Raw default menampilkan gabungan ADM saja.
    if (standardCustomers.length > 0) {
      return [...standardCustomers];
    }

    const additionalStandardCustomers = scopeCustomers
      .map(normalizeMdfoDownloadCustomer)
      .filter((customer, index, values) => {
        return RAW_STANDARD_SERVER_CUSTOMERS.has(customer) &&
          values.indexOf(customer) === index;
      });

    if (additionalStandardCustomers.length > 0) {
      return additionalStandardCustomers;
    }

    // TMMIN + NTC + Gaya Motor tidak digabung karena struktur Raw berbeda.
    // Untuk kombinasi khusus tersebut, tampilkan customer pertama saja.
    return scopeCustomers.length > 0
      ? [scopeCustomers[0]]
      : [];
  };


  const activeRawDisplayCustomers = computed<string[]>(() =>
    getRawDisplayCustomers(getSelectedScopeCustomers())
      .map(normalizeMdfoDownloadCustomer)
      .filter((customer, index, values) => {
        return customer !== '' && values.indexOf(customer) === index;
      })
  );

  const rawDisplayCustomerLabel = computed(() => {
    const labels = activeRawDisplayCustomers.value.map(
      getMdfoDownloadCustomerLabel
    );

    if (labels.length === 0) {
      return 'Raw Customer';
    }

    if (labels.length <= 2) {
      return labels.join(' + ');
    }

    return `${labels.length} Raw Customers`;
  });

  const rawDisplayScopeDiffersFromSelectedScope = computed(() => {
    const selectedScope = getSelectedScopeCustomers();
    const effectiveSelectedScope = (
      selectedScope.length > 0
        ? selectedScope
        : [...MDFO_DOWNLOAD_CUSTOMER_ORDER]
    )
      .map(normalizeMdfoDownloadCustomer)
      .filter((customer, index, values) => {
        return customer !== '' && values.indexOf(customer) === index;
      })
      .sort();

    const displayedScope = [...activeRawDisplayCustomers.value].sort();

    return effectiveSelectedScope.join('|') !== displayedScope.join('|');
  });

  const customerFilterOptions = ref<string[]>([]);

  const periodFilterOptions = ref<string[]>([]);

  const revisionFilterOptions = ref<string[]>([]);

  const downloadCustomerOptions = computed(() => {
    /*
     * Scope download selalu menampilkan seluruh customer utama.
     * TMMIN disimpan pada tabel raw terpisah sehingga tidak selalu
     * muncul di filter_options MDFO ADM.
     */
    return MDFO_DOWNLOAD_CUSTOMER_ORDER.map((customer) => ({
      value: customer,
      label: getMdfoDownloadCustomerLabel(customer)
    })).sort((first, second) =>
      first.label.localeCompare(second.label, 'id', {
        numeric: true,
        sensitivity: 'base'
      })
    );
  });

  const canPrepareDpmSanitizedPdfs = computed(() => {
    return (
      selectedCustomerUpload.value.trim().toUpperCase() === 'DPM' &&
      selectedFiles.value.length > 0 &&
      allCheckedFilesValid.value &&
      !isCheckingFiles.value &&
      !isUploading.value &&
      !isPreparingDpmSanitizedPdfs.value
    );
  });

  const activeDpmSanitizedPdf = computed<DpmSanitizedPdfPreview | null>(() => {
    return dpmSanitizedPdfs.value[activeDpmSanitizedPdfIndex.value] ?? null;
  });

  const selectedDownloadCustomerLabels = computed(() => {
    return selectedDownloadCustomers.value.map(
      getMdfoDownloadCustomerLabel
    );
  });

  const downloadCustomerButtonLabel = computed(() => {
    const selected = selectedDownloadCustomerLabels.value;

    if (selected.length === 0) {
      return 'Pilih Customer';
    }

    if (selected.length === MDFO_DOWNLOAD_CUSTOMER_ORDER.length) {
      return 'All Customers';
    }

    if (selected.length === 1) {
      return selected[0];
    }

    return `${selected.length} Customers`;
  });

  const isAllDownloadCustomersDraftSelected = computed(() => {
    const options = downloadCustomerOptions.value.map(
      (option) => option.value
    );

    return (
      options.length > 0 &&
      options.every((customer) =>
        draftDownloadCustomers.value.includes(customer)
      )
    );
  });

  // Column filters and sorting

  const selectedFilters = ref<Record<MdfoKey, string[]>>(createSelectedFilters([...COLUMNS, ...ASI_MDFO_COLUMNS]));

  const searchFilters = ref<Record<MdfoKey, string>>(createSearchFilters([...COLUMNS, ...ASI_MDFO_COLUMNS]));

  const openFilters = ref<Record<MdfoKey, boolean>>(createOpenFilters([...COLUMNS, ...ASI_MDFO_COLUMNS]));

  const activeColumnMenu = ref<MdfoKey | null>(null);

  const sortKey = ref<MdfoKey | ''>('');

  const sortDirection = ref<'none' | 'asc' | 'desc'>('none');

  const filterPopupPosition = ref({
    top: 0,
    left: 0
  });

  // Pagination

  const currentPage = ref(1);

  const rowsPerPage = ref(10);

  const rowsPerPageOptions = ROWS_PER_PAGE_OPTIONS;

  const rawServerPaged = ref(false);
  const rawServerTotal = ref(0);
  const rawServerTotalPages = ref(1);
  const rawServerColumnTotals = ref<Partial<Record<MdfoKey, number>>>({});
  const rawServerFilterOptions = ref<Partial<Record<MdfoKey, string[]>>>({});
  const rawRemoteFilterControllers = new Map<string, AbortController>();
  let skipNextMainPageWatch = false;
  let skipNextNtcPageWatch = false;
  let skipNextGayaPageWatch = false;

  // NTC memakai filter/pagination sendiri karena struktur kolomnya berbeda.
  const ntcSelectedFilters = ref<Partial<Record<NtcMdfoKey, string[]>>>({});
  const ntcSearchFilters = ref<Partial<Record<NtcMdfoKey, string>>>({});
  const ntcOpenFilters = ref<Partial<Record<NtcMdfoKey, boolean>>>({});
  const ntcFilterPopupPosition = ref({
    top: 0,
    left: 0
  });

  const mdfoFilterAnchor = useAnchoredPopup(() => {
    Object.keys(openFilters.value).forEach((columnKey) => {
      openFilters.value[columnKey as MdfoKey] = false;
    });
    Object.keys(ntcOpenFilters.value).forEach((columnKey) => {
      ntcOpenFilters.value[columnKey as NtcMdfoKey] = false;
    });
    gayaActiveFilterKey.value = null;
  });

  const ntcSortKey = ref<NtcMdfoKey | ''>('');
  const ntcSortDirection = ref<'none' | 'asc' | 'desc'>('none');
  const ntcCurrentPage = ref(1);
  const ntcRowsPerPage = ref(10);
  const ntcServerFilterOptions = ref<Partial<Record<NtcMdfoKey, string[]>>>({});
  const gayaServerFilterOptions = ref<Record<string, string[]>>({});

  // COMPUTED: KOLOM DAN FILTER UTAMA

  const columns = COLUMNS;

  const totalLabelColspan =
    computed(() => {
      const endIndex =
        columns.findIndex(
          (column) =>
            column.key ===
            TOTAL_LABEL_END_KEY
        );

      if (endIndex < 0) {
        return 1;
      }

      return endIndex + 1;
    });

  const fixedColumns = computed(() => {
    return columns.filter((column) => column.group !== 'day');
  });

  const dayColumns = computed(() => {
    return columns.filter((column) => column.group === 'day');
  });

  const periodInputValue = computed(() => {
    const value = selectedPeriodFilter.value;

    if (!/^\d{6}$/.test(value)) {
      return '';
    }

    return [value.slice(0, 4), value.slice(4, 6)].join('-');
  });

  const selectedPeriodLabel = computed(() => {
    if (selectedPeriodFilter.value === '') {
      return 'All Periods';
    }

    return formatPeriodLabel(selectedPeriodFilter.value);
  });

  const selectedRevisionLabel = computed(() => {
    if (selectedRevisionFilter.value === '') {
      return 'All Revisions';
    }

    return `Revision ${selectedRevisionFilter.value}`;
  });

  const normalizedPeriodOptions = computed<string[]>(() => {
    return Array.from(new Set(periodFilterOptions.value.map(normalizePeriod).filter(Boolean))).sort();
  });

  const latestAvailablePeriodYear = computed<string>(() => {
    const periods = normalizedPeriodOptions.value;

    if (periods.length === 0) {
      return '';
    }

    return periods[periods.length - 1].slice(0, 4);
  });

  const latestYearPeriodOptions = computed<string[]>(() => {
    const latestYear = latestAvailablePeriodYear.value;

    if (latestYear === '') {
      return [];
    }

    return normalizedPeriodOptions.value.filter((period) => {
      return period.startsWith(latestYear);
    });
  });

  const defaultLatestYearPeriod = computed<string>(() => {
    const latestYear = latestAvailablePeriodYear.value;

    const options = latestYearPeriodOptions.value;

    if (latestYear === '' || options.length === 0) {
      return '';
    }

    const january = `${latestYear}01`;

    return options.includes(january) ? january : options[0];
  });

  // TMMIN table

  // Kolom ini tetap tersimpan dan ikut export, tetapi tidak ditampilkan di website.
  const TMMIN_HIDDEN_COLUMN_KEYS = new Set<string>([
    'dId',
    'rPlantCd',
    'vers',
    'sPlantCd',
    'shipCd',
    'ordType',
    'recCd',
    'src',
    'partNoFormatted'
  ]);

  const isTmminMode = computed(() => {
    return dataMode.value === 'tmmin';
  });

  const isNtcMode = computed(() => {
    return dataMode.value === 'ntc' || dataMode.value === 'dpm' || dataMode.value === 'fti';
  });

  const isDpmMode = computed(() => {
    return dataMode.value === 'dpm';
  });

  const isFtiMode = computed(() => {
    return dataMode.value === 'fti';
  });

  // MES memakai renderer Raw yang sama dengan FTI, tetapi identitas customer
  // tetap harus dibedakan untuk label, delete, dan download.
  const isMesMode = computed(() => {
    return (
      dataMode.value === 'fti' &&
      normalizeMdfoDownloadCustomer(selectedCustomerFilter.value) === 'MES'
    );
  });

  const isGayaMode = computed(() => {
    return dataMode.value === 'gaya';
  });


  const isAsiAdmMode = computed(() => {
    if (dataMode.value !== 'standard') {
      return false;
    }

    if (
      normalizeMdfoDownloadCustomer(
        selectedCustomerFilter.value
      ) === 'ASI ADM'
    ) {
      return true;
    }

    /*
     * Pada multi-customer selectedCustomerFilter memang dikosongkan.
     * Jika Raw yang sedang ditampilkan adalah ASI ADM (mis. ASI ADM + TMMIN),
     * backend sudah mengirim field turunan partNoSap pada seluruh row ASI.
     */
    return (
      rows.value.length > 0 &&
      rows.value.every((row) =>
        String(row.partNoSap ?? '').trim() !== ''
      )
    );
  });

  const isTmminColumnKey = (
    key: MdfoKey
  ): boolean => {
    return tmminColumns.value.some(
      (column) => column.key === key
    );
  };

  const initializeTmminColumnFilters = () => {
    tmminColumns.value.forEach((column) => {
      if (!Array.isArray(selectedFilters.value[column.key])) {
        selectedFilters.value[column.key] = [];
      }

      if (typeof searchFilters.value[column.key] !== 'string') {
        searchFilters.value[column.key] = '';
      }

      if (typeof openFilters.value[column.key] !== 'boolean') {
        openFilters.value[column.key] = false;
      }
    });
  };

  const tmminDisplayColumns = computed(() => {
    return tmminColumns.value.filter((column) => {
      return !TMMIN_HIDDEN_COLUMN_KEYS.has(column.key);
    });
  });

  const tmminFrozenColumnCount = computed(() => {
    const finalPartIndex = tmminDisplayColumns.value.findIndex(
      (column) => column.key === 'partNoFinal'
    );

    return finalPartIndex >= 0
      ? finalPartIndex + 1
      : 0;
  });

  const tmminFrozenColumns = computed(() => {
    return tmminDisplayColumns.value.slice(
      0,
      tmminFrozenColumnCount.value
    );
  });

  const tmminFrozenPaneWidth = computed(() => {
    return tmminFrozenColumns.value.reduce(
      (total, column) => {
        return total + getColumnWidthNumber(
          column.width || '95px'
        );
      },
      0
    );
  });

  const isTmminFrozenColumn = (key: string): boolean => {
    return tmminFrozenColumns.value.some(
      (column) => column.key === key
    );
  };

  const isTmminLastFrozenColumn = (key: string): boolean => {
    const lastColumn =
      tmminFrozenColumns.value[
      tmminFrozenColumns.value.length - 1
      ];

    return lastColumn?.key === key;
  };

  const getTmminFrozenLeft = (key: string): number => {
    let left = 0;

    for (const column of tmminFrozenColumns.value) {
      if (column.key === key) {
        return left;
      }

      left += getColumnWidthNumber(
        column.width || '95px'
      );
    }

    return 0;
  };

  const tmminFilteredRows = computed(() => {
    if (rawServerPaged.value) {
      return tmminRows.value;
    }

    return getRowsMatchingOtherColumnFilters(
      tmminRows.value,
      tmminColumns.value,
      selectedFilters.value,
      null,
      (row, key) => formatFilterValue(row[key])
    );
  });

  const tmminSortedRows = computed(() => {
    const data = [...tmminFilteredRows.value];

    if (rawServerPaged.value) {
      return data;
    }

    if (
      sortKey.value === '' ||
      sortDirection.value === 'none' ||
      !isTmminColumnKey(sortKey.value)
    ) {
      return data;
    }

    const key = sortKey.value;

    return data.sort((first, second) => {
      const firstValue = formatFilterValue(
        first[key]
      ).toLowerCase();

      const secondValue = formatFilterValue(
        second[key]
      ).toLowerCase();

      return sortDirection.value === 'asc'
        ? firstValue.localeCompare(
          secondValue,
          'id',
          { numeric: true }
        )
        : secondValue.localeCompare(
          firstValue,
          'id',
          { numeric: true }
        );
    });
  });

  const tmminColumnTotals = computed(() => {
    const totals: Record<string, number> = {};

    tmminColumns.value.forEach((column) => {
      if (!column.total) {
        totals[column.key] = 0;
        return;
      }

      if (rawServerPaged.value) {
        totals[column.key] = Number(rawServerColumnTotals.value[column.key] ?? 0);
        return;
      }

      totals[column.key] = tmminFilteredRows.value.reduce(
        (total, row) => {
          return total + (Number(row[column.key]) || 0);
        },
        0
      );
    });

    return totals;
  });

  const tmminTotalLabelColspan = computed(() => {
    return Math.max(
      tmminFrozenColumnCount.value,
      1
    );
  });

  const tmminTableWidth = computed(() => {
    const width = tmminDisplayColumns.value.reduce(
      (total, column) => {
        return total + getColumnWidthNumber(
          column.width || '95px'
        );
      },
      0
    );

    return `${Math.max(width, 900)}px`;
  });

  const tmminPaginatedRows = computed(() => {
    if (rawServerPaged.value) {
      return tmminSortedRows.value;
    }

    if (rowsPerPage.value === 0) {
      return tmminSortedRows.value;
    }

    const start =
      (currentPage.value - 1) *
      rowsPerPage.value;

    return tmminSortedRows.value.slice(
      start,
      start + rowsPerPage.value
    );
  });

  const tmminAvailableSupplierCodes = computed<TmminSupplierCode[]>(() => {
    const codes = new Set<TmminSupplierCode>();

    tmminFilteredRows.value.forEach((row) => {
      const code = String(
        row._supplierCode ?? ''
      )
        .trim()
        .toUpperCase();

      if (
        code === 'T034' ||
        code === 'TMAJ'
      ) {
        codes.add(code);
      }
    });

    return ['T034', 'TMAJ'].filter(
      (code): code is TmminSupplierCode =>
        codes.has(code as TmminSupplierCode)
    );
  });

  const getTmminColumnStyle = (
    column: TmminMdfoColumn,
    rowIndex = 0,
    isHeader = false,
    isFooter = false
  ): CSSProperties => {
    const width = column.width || '95px';
    const frozen = isTmminFrozenColumn(column.key);
    const lastFrozen = isTmminLastFrozenColumn(column.key);

    const backgroundColor = isHeader || isFooter
      ? '#eff6ff'
      : rowIndex % 2 === 0
        ? '#ffffff'
        : '#f8fafc';

    let zIndex = 1;

    if (isHeader && frozen) {
      zIndex = 360;
    } else if (isHeader) {
      zIndex = 301;
    } else if (isFooter && frozen) {
      zIndex = 350;
    } else if (isFooter) {
      zIndex = 130;
    } else if (frozen) {
      zIndex = 210;
    }

    // Garis isi tabel dibuat satu sisi agar tetap tipis.
    // Batas luar tabel ditangani langsung oleh elemen table.
    const shadows = [
      `inset -1px 0 0 ${GRID_BORDER}`,
      `inset 0 -1px 0 ${GRID_BORDER}`,
      isHeader || isFooter
        ? `inset 0 1px 0 ${GRID_BORDER}`
        : ''
    ].filter(Boolean);

    if (lastFrozen) {
      shadows.push(
        '2px 0 4px -3px rgba(15, 23, 42, 0.16)'
      );
    }

    return {
      minWidth: width,
      width,
      maxWidth: width,
      boxSizing: 'border-box',
      position: frozen || isFooter
        ? 'sticky'
        : 'relative',
      left: frozen
        ? `${getTmminFrozenLeft(column.key)}px`
        : undefined,
      bottom: isFooter
        ? '0px'
        : undefined,
      zIndex,
      backgroundColor,
      backgroundImage: `linear-gradient(${backgroundColor}, ${backgroundColor})`,
      backgroundRepeat: 'no-repeat',
      backgroundSize: '100% 100%',
      boxShadow: shadows.join(', ')
    };
  };

  const getTmminTotalLabelStyle = (): CSSProperties => {
    const width = Math.max(
      tmminFrozenPaneWidth.value,
      95
    );

    return {
      position: 'sticky',
      left: '0px',
      bottom: '0px',
      zIndex: 370,
      minWidth: `${width}px`,
      width: `${width}px`,
      backgroundColor: '#dbeafe',
      boxSizing: 'border-box',
      boxShadow: [
        `inset -1px 0 0 ${GRID_BORDER}`,
        `inset 0 1px 0 ${GRID_BORDER}`,
        `inset 0 -1px 0 ${GRID_BORDER}`,
        '2px 0 4px -3px rgba(15, 23, 42, 0.16)'
      ].join(', ')
    };
  };

  const formatTmminCellValue = (
    column: TmminMdfoColumn,
    value: unknown
  ): string => {
    return column.numeric
      ? formatNumber(value)
      : formatFilterValue(value);
  };

  // RAW MDFO NTC

  const initializeNtcColumnFilters = (): void => {
    ntcColumns.value.forEach((column) => {
      if (!Array.isArray(ntcSelectedFilters.value[column.key])) {
        ntcSelectedFilters.value[column.key] = [];
      }

      if (typeof ntcSearchFilters.value[column.key] !== 'string') {
        ntcSearchFilters.value[column.key] = '';
      }

      if (typeof ntcOpenFilters.value[column.key] !== 'boolean') {
        ntcOpenFilters.value[column.key] = false;
      }
    });
  };

  /*
   * Raw MDFO NTC responsive freeze:
   * - Laptop / viewport < 1600px : freeze sampai PART NO.
   * - PC lebar / viewport >= 1600px : tidak ada horizontal freeze.
   *
   * Mengikuti breakpoint responsive Raw MDFO ADM yang sudah ada.
   */
  const isLaptopNtcRawFreeze = computed(() => {
    return (
      isNtcMode.value &&
      (
        isDpmMode.value ||
        isFtiMode.value ||
        rawMdfoViewportWidth.value <
          ADM_DESKTOP_FREEZE_MIN_WIDTH
      )
    );
  });

  const ntcFrozenColumnCount = computed(() => {
    if (!isLaptopNtcRawFreeze.value) {
      return 0;
    }

    if (isDpmMode.value) {
      const materialIdIndex = ntcColumns.value.findIndex(
        (column) => column.key === 'materialId'
      );

      return materialIdIndex >= 0
        ? materialIdIndex + 1
        : 0;
    }

    if (isFtiMode.value) {
      const partNoIndex = ntcColumns.value.findIndex(
        (column) => column.key === 'partNo'
      );

      return partNoIndex >= 0
        ? partNoIndex + 1
        : 1;
    }

    // Laptop: freeze sampai PART NO. FINAL / part number yang sudah dibenarkan.
    // Jadi urutannya:
    // NO. | KBN CODE | PART NO. (raw) | PART NO. FINAL | ...
    const partNoFinalIndex = ntcColumns.value.findIndex(
      (column) => column.key === 'partNoFinal'
    );

    if (partNoFinalIndex >= 0) {
      return partNoFinalIndex + 1;
    }

    // Fallback untuk response backend lama yang belum mengirim PART NO. FINAL.
    const partNoRawIndex = ntcColumns.value.findIndex(
      (column) => column.key === 'partNo'
    );

    return partNoRawIndex >= 0
      ? partNoRawIndex + 1
      : 0;
  });

  const ntcFrozenColumns = computed(() => {
    return ntcColumns.value.slice(
      0,
      ntcFrozenColumnCount.value
    );
  });

  const isNtcFrozenColumn = (key: NtcMdfoKey): boolean => {
    return ntcFrozenColumns.value.some(
      (column) => column.key === key
    );
  };

  const isNtcLastFrozenColumn = (key: NtcMdfoKey): boolean => {
    return ntcFrozenColumns.value[
      ntcFrozenColumns.value.length - 1
    ]?.key === key;
  };

  const getNtcFrozenLeft = (key: NtcMdfoKey): number => {
    let left = 0;

    for (const column of ntcFrozenColumns.value) {
      if (column.key === key) {
        return left;
      }

      left += getColumnWidthNumber(column.width || '90px');
    }

    return 0;
  };

  const ntcFilteredRows = computed<NtcMdfoRow[]>(() => {
    if (rawServerPaged.value) {
      return ntcRows.value;
    }

    return getRowsMatchingOtherColumnFilters(
      ntcRows.value,
      ntcColumns.value,
      ntcSelectedFilters.value,
      null,
      (row, key) => formatFilterValue(row[key])
    );
  });

  const ntcFrozenPaneWidth = computed(() => {
    return ntcFrozenColumns.value.reduce(
      (total, column) =>
        total + getColumnWidthNumber(column.width || '90px'),
      0
    );
  });

  const ntcSortedRows = computed<NtcMdfoRow[]>(() => {
    const data = [...ntcFilteredRows.value];

    if (rawServerPaged.value) {
      return data;
    }

    if (
      ntcSortKey.value === '' ||
      ntcSortDirection.value === 'none'
    ) {
      return data;
    }

    const key = ntcSortKey.value;

    return data.sort((first, second) => {
      const firstValue = formatFilterValue(
        first[key]
      ).toLowerCase();

      const secondValue = formatFilterValue(
        second[key]
      ).toLowerCase();

      return ntcSortDirection.value === 'asc'
        ? firstValue.localeCompare(
          secondValue,
          'id',
          { numeric: true }
        )
        : secondValue.localeCompare(
          firstValue,
          'id',
          { numeric: true }
        );
    });
  });

  const ntcColumnTotals = computed<NtcMdfoTotals>(() => {
    const totals: NtcMdfoTotals = {};

    ntcColumns.value.forEach((column) => {
      if (!column.total) {
        return;
      }

      if (rawServerPaged.value) {
        totals[column.key] = Number(ntcTotalsFromApi.value[column.key] ?? 0);
        return;
      }

      totals[column.key] =
        ntcFilteredRows.value.reduce(
          (sum, row) =>
            sum + (Number(row[column.key]) || 0),
          0
        );
    });

    return totals;
  });

  const ntcTableWidth = computed(() => {
    const width = ntcColumns.value.reduce(
      (total, column) =>
        total + getColumnWidthNumber(column.width || '90px'),
      0
    );

    return `${Math.max(width, 980)}px`;
  });

  const ntcTotalPages = computed(() => {
    if (rawServerPaged.value) {
      return rawServerTotalPages.value;
    }

    if (ntcRowsPerPage.value === 0) {
      return 1;
    }

    return Math.max(
      1,
      Math.ceil(
        ntcSortedRows.value.length /
        ntcRowsPerPage.value
      )
    );
  });

  const ntcVisiblePages = computed(() => {
    const total = ntcTotalPages.value;
    const current = ntcCurrentPage.value;
    let start = Math.max(1, current - 2);
    const end = Math.min(total, start + 4);

    start = Math.max(1, end - 4);

    return Array.from(
      { length: end - start + 1 },
      (_, index) => start + index
    );
  });

  const ntcPaginatedRows = computed<NtcMdfoRow[]>(() => {
    if (rawServerPaged.value) {
      return ntcSortedRows.value;
    }

    if (ntcRowsPerPage.value === 0) {
      return ntcSortedRows.value;
    }

    const start =
      (ntcCurrentPage.value - 1) *
      ntcRowsPerPage.value;

    return ntcSortedRows.value.slice(
      start,
      start + ntcRowsPerPage.value
    );
  });

  const ntcShowingStart = computed(() => {
    const totalRows = rawServerPaged.value
      ? rawServerTotal.value
      : ntcSortedRows.value.length;

    if (totalRows === 0) {
      return 0;
    }

    if (ntcRowsPerPage.value === 0) {
      return 1;
    }

    return (
      (ntcCurrentPage.value - 1) *
      ntcRowsPerPage.value +
      1
    );
  });

  const ntcShowingEnd = computed(() => {
    if (ntcRowsPerPage.value === 0) {
      return rawServerPaged.value
        ? rawServerTotal.value
        : ntcSortedRows.value.length;
    }

    return Math.min(
      ntcCurrentPage.value * ntcRowsPerPage.value,
      rawServerPaged.value
        ? rawServerTotal.value
        : ntcSortedRows.value.length
    );
  });

  const getNtcColumnOptions = (
    key: NtcMdfoKey
  ): string[] => {
    const search = String(
      ntcSearchFilters.value[key] ?? ''
    )
      .trim()
      .toLowerCase();

    if (rawServerPaged.value) {
      const values = ntcServerFilterOptions.value[key] || [];
      return values.filter((value) => {
        return matchesSearchTokens(value, search);
      });
    }

    const values = getRowsMatchingOtherColumnFilters(
      ntcRows.value,
      ntcColumns.value,
      ntcSelectedFilters.value,
      key,
      (row, columnKey) => formatFilterValue(row[columnKey])
    ).map(
      (row) =>
        normalizeFilterOption(
          formatFilterValue(row[key])
        )
    );

    return sortFilterOptions(
      Array.from(new Set(values))
    ).filter((value) => {
      if (search === '') {
        return true;
      }

      return matchesSearchTokens(value, search);
    });
  };

  const getNtcSelectedLabel = (
    key: NtcMdfoKey
  ): string => {
    const selected =
      ntcSelectedFilters.value[key] || [];

    if (selected.length === 0) {
      return '';
    }

    if (selected.length === 1) {
      return selected[0] === BLANK_FILTER_OPTION
        ? '(Blanks)'
        : selected[0];
    }

    return `${selected.length} selected`;
  };

  const normalizeNtcServerFilterValue = (
    key: NtcMdfoKey,
    value: unknown
  ): string => {
    const text = String(value ?? '').trim();
    const column = ntcColumns.value.find((item) => item.key === key);
    if (column?.numeric && /^-?\d+(?:\.\d+)?$/.test(text)) {
      return normalizeFilterOption(Number(text));
    }
    return normalizeFilterOption(text);
  };

  const seedNtcServerFilterOptions = (key: NtcMdfoKey): void => {
    if (!rawServerPaged.value) return;

    const pageValues = ntcRows.value.map((row) => {
      return normalizeNtcServerFilterValue(key, row[key]);
    });
    const selectedValues = ntcSelectedFilters.value[key] || [];

    ntcServerFilterOptions.value = {
      ...ntcServerFilterOptions.value,
      [key]: sortFilterOptions(
        Array.from(new Set([...pageValues, ...selectedValues]))
      )
    };
  };

  const isNtcAllSelected = (
    key: NtcMdfoKey
  ): boolean => {
    const options = getNtcColumnOptions(key);
    const selected =
      ntcSelectedFilters.value[key] || [];

    return (
      options.length > 0 &&
      options.every((value) =>
        selected.includes(value)
      )
    );
  };

  const toggleNtcFilter = (
    key: NtcMdfoKey,
    event?: MouseEvent
  ): void => {
    const next = !ntcOpenFilters.value[key];

    Object.keys(ntcOpenFilters.value)
      .forEach((columnKey) => {
        ntcOpenFilters.value[
          columnKey as NtcMdfoKey
        ] = false;
      });

    if (!next) {
      mdfoFilterAnchor.clear();
      return;
    }

    const trigger =
      event?.currentTarget as HTMLElement | null;

    if (!trigger) {
      return;
    }

    mdfoFilterAnchor.anchor(
      trigger,
      (anchor) => {
        const position = getAnchoredPopupPosition(anchor, {
          popupWidth: 280,
          preferredHeight: 390,
          minimumHeight: 390
        });

        ntcFilterPopupPosition.value = {
          top: position.top,
          left: position.left
        };
      }
    );

    ntcOpenFilters.value[key] = true;
    seedNtcServerFilterOptions(key);
  };

  const closeNtcFilters = (): void => {
    Object.keys(ntcOpenFilters.value)
      .forEach((columnKey) => {
        ntcOpenFilters.value[
          columnKey as NtcMdfoKey
        ] = false;
      });

    mdfoFilterAnchor.clear();
  };

  const toggleNtcFilterOption = (
    key: NtcMdfoKey,
    value: string
  ): void => {
    const selected = [
      ...(ntcSelectedFilters.value[key] || [])
    ];

    const index = selected.indexOf(value);

    if (index >= 0) {
      selected.splice(index, 1);
    } else {
      selected.push(value);
    }

    ntcSelectedFilters.value[key] = selected;
    if (rawServerPaged.value && ntcCurrentPage.value !== 1) {
      skipNextNtcPageWatch = true;
    }
    ntcCurrentPage.value = 1;
    ntcServerFilterOptions.value = {};
    if (rawServerPaged.value) {
      void loadData();
    }
  };

  const toggleNtcAllColumn = (
    key: NtcMdfoKey
  ): void => {
    ntcSelectedFilters.value[key] =
      isNtcAllSelected(key)
        ? []
        : [...getNtcColumnOptions(key)];

    if (rawServerPaged.value && ntcCurrentPage.value !== 1) {
      skipNextNtcPageWatch = true;
    }
    ntcCurrentPage.value = 1;
    ntcServerFilterOptions.value = {};
    if (rawServerPaged.value) {
      void loadData();
    }
  };

  const clearNtcColumnFilter = (
    key: NtcMdfoKey
  ): void => {
    ntcSelectedFilters.value[key] = [];
    ntcSearchFilters.value[key] = '';
    if (rawServerPaged.value && ntcCurrentPage.value !== 1) {
      skipNextNtcPageWatch = true;
    }
    ntcCurrentPage.value = 1;
    ntcServerFilterOptions.value = {};
    if (rawServerPaged.value) {
      void loadData();
    }
  };

  const clearNtcFilters = (reload = true): void => {
    ntcColumns.value.forEach((column) => {
      ntcSelectedFilters.value[column.key] = [];
      ntcSearchFilters.value[column.key] = '';
      ntcOpenFilters.value[column.key] = false;
    });

    ntcSortKey.value = '';
    ntcSortDirection.value = 'none';
    const wasFirstPage = ntcCurrentPage.value === 1;
    if (!wasFirstPage) {
      skipNextNtcPageWatch = true;
    }
    ntcCurrentPage.value = 1;
    ntcServerFilterOptions.value = {};
    if (reload && rawServerPaged.value) {
      void loadData();
    }
  };

  const setNtcSort = (
    key: NtcMdfoKey,
    direction: 'none' | 'asc' | 'desc'
  ): void => {
    if (direction === 'none') {
      ntcSortKey.value = '';
      ntcSortDirection.value = 'none';
    } else {
      ntcSortKey.value = key;
      ntcSortDirection.value = direction;
    }

    if (rawServerPaged.value && ntcCurrentPage.value !== 1) {
      skipNextNtcPageWatch = true;
    }
    ntcCurrentPage.value = 1;
    if (rawServerPaged.value) {
      void loadData(undefined, { pageOnly: true });
    }
  };

  const isNtcSortActive = (
    key: NtcMdfoKey,
    direction: 'asc' | 'desc'
  ): boolean => {
    return (
      ntcSortKey.value === key &&
      ntcSortDirection.value === direction
    );
  };

  const isNtcNoSortActive = (
    key: NtcMdfoKey
  ): boolean => {
    return (
      ntcSortDirection.value === 'none' ||
      ntcSortKey.value !== key
    );
  };

  const setNtcRowsPerPage = (
    value: number | string
  ): void => {
    const normalized = Number(value);

    if (
      !ROWS_PER_PAGE_OPTIONS.includes(normalized)
    ) {
      return;
    }

    ntcRowsPerPage.value = normalized;
  };

  const ntcFirstPage = (): void => {
    ntcCurrentPage.value = 1;
  };

  const ntcPrevPage = (): void => {
    ntcCurrentPage.value = Math.max(
      1,
      ntcCurrentPage.value - 1
    );
  };

  const ntcNextPage = (): void => {
    ntcCurrentPage.value = Math.min(
      ntcTotalPages.value,
      ntcCurrentPage.value + 1
    );
  };

  const ntcLastPage = (): void => {
    ntcCurrentPage.value = ntcTotalPages.value;
  };

  const getNtcColumnStyle = (
    column: NtcMdfoColumn,
    rowIndex = 0,
    isHeader = false,
    isFooter = false,
    freezeEnabled = false
  ): CSSProperties => {
    const width = column.width || '90px';
    const frozen =
      freezeEnabled &&
      isNtcFrozenColumn(column.key);
    const lastFrozen =
      freezeEnabled &&
      isNtcLastFrozenColumn(column.key);

    const backgroundColor = isFooter
      ? '#dbeafe'
      : isHeader
        ? '#eff6ff'
        : rowIndex % 2 === 0
          ? '#ffffff'
          : '#f8fafc';

    const shadows = [
      `inset -1px 0 0 ${GRID_BORDER}`,
      `inset 0 -1px 0 ${GRID_BORDER}`,
      isHeader || isFooter
        ? `inset 0 1px 0 ${GRID_BORDER}`
        : ''
    ].filter(Boolean);

    if (lastFrozen) {
      shadows.push(
        '2px 0 4px -3px rgba(15, 23, 42, 0.16)'
      );
    }

    let zIndex = 1;

    if (isHeader && frozen) {
      zIndex = 360;
    } else if (isHeader) {
      zIndex = 301;
    } else if (isFooter && frozen) {
      zIndex = 350;
    } else if (isFooter) {
      zIndex = 130;
    } else if (frozen) {
      zIndex = 210;
    }

    return {
      minWidth: width,
      width,
      maxWidth: width,
      boxSizing: 'border-box',
      position: frozen || isFooter
        ? 'sticky'
        : 'relative',
      left: frozen
        ? `${getNtcFrozenLeft(column.key)}px`
        : undefined,
      bottom: isFooter
        ? '0px'
        : undefined,
      zIndex,
      backgroundColor,
      backgroundImage:
        `linear-gradient(${backgroundColor}, ${backgroundColor})`,
      backgroundRepeat: 'no-repeat',
      backgroundSize: '100% 100%',
      boxShadow: shadows.join(', ')
    };
  };

  const formatNtcNumericDisplay = (
    value: unknown,
    roundToInteger = false
  ): string => {
    if (value === null || value === undefined || value === '') {
      return '';
    }

    const normalized =
      typeof value === 'string'
        ? value.trim().replace(/,/g, '')
        : value;

    const number = Number(normalized);

    if (!Number.isFinite(number)) {
      return formatFilterValue(value);
    }

    const displayNumber = roundToInteger
      ? Math.round(number)
      : number;

    return new Intl.NumberFormat('id-ID', {
      useGrouping: true,
      minimumFractionDigits: 0,
      maximumFractionDigits: roundToInteger ? 0 : 6
    }).format(displayNumber);
  };

  const formatNtcCellValue = (
    column: NtcMdfoColumn,
    value: unknown
  ): string => {
    if (!column.numeric) {
      return formatFilterValue(value);
    }

    // KANBAN / DAY hanya dibulatkan pada tampilan.
    // Nilai asli pada state / DB tetap tidak berubah.
    if (column.key === 'kanbanDay') {
      return formatNtcNumericDisplay(value, true);
    }

    // Seluruh kolom numeric NTC menggunakan format Indonesia:
    // 4547 -> 4.547, 78933 -> 78.933.
    return formatNtcNumericDisplay(value);
  };

  const formatNtcTotalValue = (
    value: unknown
  ): string => {
    return formatNtcNumericDisplay(value);
  };

  const getActiveNtcColumnFilters = (): Record<string, string[]> => {
    const result: Record<string, string[]> = {};

    ntcColumns.value.forEach((column) => {
      const selected =
        ntcSelectedFilters.value[column.key] || [];

      if (selected.length > 0) {
        result[column.key] =
          selected.map(toRawFilterOption);
      }
    });

    return result;
  };


  // RAW MDFO GAYA MOTOR

  /*
   * Freeze Raw MDFO Gaya Motor mengikuti skema responsif ADM:
   * - Laptop / viewport < 1600px  : freeze sampai PART NAME.
   * - PC / viewport >= 1600px     : freeze sampai N+3.
   *
   * rawMdfoViewportWidth sudah disinkronkan oleh listener resize existing,
   * sehingga perubahan ukuran browser langsung mengubah batas freeze.
   */
  const gayaFrozenColumnCount = computed(() => {
    const laptopMode =
      rawMdfoViewportWidth.value <
      ADM_DESKTOP_FREEZE_MIN_WIDTH;

    const endKey = laptopMode
      ? 'partName'
      : 'n3';

    const endIndex =
      gayaColumns.value.findIndex(
        (column) =>
          String(column.key) === endKey
      );

    if (endIndex >= 0) {
      return endIndex + 1;
    }

    // Fallback menjaga tabel tetap aman jika response lama belum
    // membawa key yang diharapkan.
    return Math.min(
      laptopMode ? 5 : 10,
      gayaColumns.value.length
    );
  });

  const initializeGayaColumnFilters = (): void => {
    const validKeys = new Set(gayaColumns.value.map((column) => column.key));

    Object.keys(gayaSelectedFilters.value).forEach((key) => {
      if (!validKeys.has(key)) {
        delete gayaSelectedFilters.value[key];
        delete gayaSearchFilters.value[key];
      }
    });

    gayaColumns.value.forEach((column) => {
      if (!Array.isArray(gayaSelectedFilters.value[column.key])) {
        gayaSelectedFilters.value[column.key] = [];
      }

      if (typeof gayaSearchFilters.value[column.key] !== 'string') {
        gayaSearchFilters.value[column.key] = '';
      }
    });
  };

  const getActiveGayaColumnFilters = (): Record<string, string[]> => {
    const result: Record<string, string[]> = {};

    gayaColumns.value.forEach((column) => {
      const selected = gayaSelectedFilters.value[column.key] || [];
      if (selected.length > 0) {
        result[column.key] = selected.map(toRawFilterOption);
      }
    });

    return result;
  };

  const gayaFilteredRows = computed<GayaMdfoRow[]>(() => {
    if (rawServerPaged.value) {
      return gayaRows.value;
    }

    return getRowsMatchingOtherColumnFilters(
      gayaRows.value,
      gayaColumns.value,
      gayaSelectedFilters.value,
      null,
      (row, key) => formatFilterValue(row[key])
    );
  });

  const gayaSortedRows = computed<GayaMdfoRow[]>(() => {
    const data = [...gayaFilteredRows.value];

    if (rawServerPaged.value) {
      return data;
    }

    if (
      gayaSortKey.value !== '' &&
      gayaSortDirection.value !== 'none'
    ) {
      const column = gayaColumns.value.find(
        (item) => item.key === gayaSortKey.value
      );

      if (column) {
        return data.sort((first, second) => {
          const firstRaw = first[column.key];
          const secondRaw = second[column.key];

          let comparison = 0;

          if (column.numeric) {
            const firstNumber = Number(firstRaw) || 0;
            const secondNumber = Number(secondRaw) || 0;
            comparison = firstNumber - secondNumber;
          } else {
            comparison = formatFilterValue(firstRaw).localeCompare(
              formatFilterValue(secondRaw),
              'id',
              { numeric: true }
            );
          }

          return gayaSortDirection.value === 'asc'
            ? comparison
            : -comparison;
        });
      }
    }

    // Default Gaya Motor tetap mengikuti nomor urut hasil merge file.
    return data.sort((first, second) => {
      const noCompare =
        (Number(first.no) || 0) -
        (Number(second.no) || 0);

      if (noCompare !== 0) {
        return noCompare;
      }

      return (
        (Number(first._sourceFileOrder) || 0) -
        (Number(second._sourceFileOrder) || 0)
      );
    });
  });

  const gayaColumnTotals = computed<GayaMdfoTotals>(() => {
    const totals: GayaMdfoTotals = {};

    gayaColumns.value.forEach((column) => {
      if (!column.total) {
        return;
      }

      if (rawServerPaged.value) {
        totals[column.key] = Number(gayaTotalsFromApi.value[column.key] ?? 0);
        return;
      }

      // Total mengikuti hasil filter yang sedang tampil, sama seperti tabel ADM.
      totals[column.key] = gayaFilteredRows.value.reduce(
        (sum, row) =>
          sum + (Number(row[column.key]) || 0),
        0
      );
    });

    return totals;
  });

  const gayaTableWidth = computed(() => {
    const width = gayaColumns.value.reduce(
      (total, column) =>
        total + getColumnWidthNumber(column.width || '90px'),
      0
    );

    return `${Math.max(width, 1500)}px`;
  });

  const gayaTotalPages = computed(() => {
    if (rawServerPaged.value) {
      return rawServerTotalPages.value;
    }

    if (gayaRowsPerPage.value === 0) {
      return 1;
    }

    return Math.max(
      1,
      Math.ceil(
        gayaSortedRows.value.length /
        gayaRowsPerPage.value
      )
    );
  });

  const gayaVisiblePages = computed(() => {
    const total = gayaTotalPages.value;
    const current = gayaCurrentPage.value;
    let start = Math.max(1, current - 2);
    const end = Math.min(total, start + 4);

    start = Math.max(1, end - 4);

    return Array.from(
      { length: end - start + 1 },
      (_, index) => start + index
    );
  });

  const gayaPaginatedRows = computed<GayaMdfoRow[]>(() => {
    if (rawServerPaged.value) {
      return gayaSortedRows.value;
    }

    if (gayaRowsPerPage.value === 0) {
      return gayaSortedRows.value;
    }

    const start =
      (gayaCurrentPage.value - 1) *
      gayaRowsPerPage.value;

    return gayaSortedRows.value.slice(
      start,
      start + gayaRowsPerPage.value
    );
  });

  const gayaShowingStart = computed(() => {
    const totalRows = rawServerPaged.value
      ? rawServerTotal.value
      : gayaSortedRows.value.length;

    if (totalRows === 0) {
      return 0;
    }

    if (gayaRowsPerPage.value === 0) {
      return 1;
    }

    return (
      (gayaCurrentPage.value - 1) *
      gayaRowsPerPage.value +
      1
    );
  });

  const gayaShowingEnd = computed(() => {
    if (gayaRowsPerPage.value === 0) {
      return rawServerPaged.value
        ? rawServerTotal.value
        : gayaSortedRows.value.length;
    }

    return Math.min(
      gayaCurrentPage.value * gayaRowsPerPage.value,
      rawServerPaged.value
        ? rawServerTotal.value
        : gayaSortedRows.value.length
    );
  });

  const getGayaColumnOptions = (key: string): string[] => {
    const search = String(gayaSearchFilters.value[key] ?? '')
      .trim()
      .toLowerCase();

    if (rawServerPaged.value) {
      const values = gayaServerFilterOptions.value[key] || [];
      return values.filter((value) => {
        return matchesSearchTokens(value, search);
      });
    }

    const values = getRowsMatchingOtherColumnFilters(
      gayaRows.value,
      gayaColumns.value,
      gayaSelectedFilters.value,
      key,
      (row, columnKey) => formatFilterValue(row[columnKey])
    ).map((row) => normalizeFilterOption(formatFilterValue(row[key])));

    return sortFilterOptions(
      Array.from(new Set(values))
    ).filter((value) => {
      return matchesSearchTokens(value, search);
    });
  };

  const getGayaSelectedLabel = (key: string): string => {
    const selected = gayaSelectedFilters.value[key] || [];

    if (selected.length === 0) {
      return '';
    }

    if (selected.length === 1) {
      return selected[0] === BLANK_FILTER_OPTION
        ? '(Blanks)'
        : selected[0];
    }

    return `${selected.length} selected`;
  };

  const normalizeGayaServerFilterValue = (
    key: string,
    value: unknown
  ): string => {
    const text = String(value ?? '').trim();
    const column = gayaColumns.value.find((item) => item.key === key);
    if (column?.numeric && /^-?\d+(?:\.\d+)?$/.test(text)) {
      return normalizeFilterOption(Number(text));
    }
    return normalizeFilterOption(text);
  };

  const seedGayaServerFilterOptions = (key: string): void => {
    if (!rawServerPaged.value) return;

    const pageValues = gayaRows.value.map((row) => {
      return normalizeGayaServerFilterValue(key, row[key]);
    });
    const selectedValues = gayaSelectedFilters.value[key] || [];

    gayaServerFilterOptions.value = {
      ...gayaServerFilterOptions.value,
      [key]: sortFilterOptions(
        Array.from(new Set([...pageValues, ...selectedValues]))
      )
    };
  };

  const isGayaAllSelected = (key: string): boolean => {
    const options = getGayaColumnOptions(key);
    const selected = gayaSelectedFilters.value[key] || [];

    return (
      options.length > 0 &&
      options.every((value) => selected.includes(value))
    );
  };

  const toggleGayaFilter = (
    key: string,
    event?: MouseEvent
  ): void => {
    if (gayaActiveFilterKey.value === key) {
      gayaActiveFilterKey.value = null;
      mdfoFilterAnchor.clear();
      return;
    }

    const trigger = event?.currentTarget as HTMLElement | null;

    if (!trigger) {
      return;
    }

    mdfoFilterAnchor.anchor(
      trigger,
      (anchor) => {
        const position = getAnchoredPopupPosition(anchor, {
          popupWidth: 270,
          preferredHeight: 390,
          minimumHeight: 390
        });

        gayaFilterPopupPosition.value = {
          top: position.top,
          left: position.left
        };
      }
    );

    gayaActiveFilterKey.value = key;
    seedGayaServerFilterOptions(key);
  };

  const closeGayaFilters = (): void => {
    gayaActiveFilterKey.value = null;
    mdfoFilterAnchor.clear();
  };

  const toggleGayaFilterOption = (
    key: string,
    value: string
  ): void => {
    const selected = [...(gayaSelectedFilters.value[key] || [])];
    const index = selected.indexOf(value);

    if (index >= 0) {
      selected.splice(index, 1);
    } else {
      selected.push(value);
    }

    gayaSelectedFilters.value[key] = selected;
    if (rawServerPaged.value && gayaCurrentPage.value !== 1) {
      skipNextGayaPageWatch = true;
    }
    gayaCurrentPage.value = 1;
    gayaServerFilterOptions.value = {};
    if (rawServerPaged.value) {
      void loadData();
    }
  };

  const toggleGayaAllColumn = (key: string): void => {
    gayaSelectedFilters.value[key] = isGayaAllSelected(key)
      ? []
      : [...getGayaColumnOptions(key)];

    if (rawServerPaged.value && gayaCurrentPage.value !== 1) {
      skipNextGayaPageWatch = true;
    }
    gayaCurrentPage.value = 1;
    gayaServerFilterOptions.value = {};
    if (rawServerPaged.value) {
      void loadData();
    }
  };

  const clearGayaColumnFilter = (key: string): void => {
    gayaSelectedFilters.value[key] = [];
    gayaSearchFilters.value[key] = '';
    if (rawServerPaged.value && gayaCurrentPage.value !== 1) {
      skipNextGayaPageWatch = true;
    }
    gayaCurrentPage.value = 1;
    gayaServerFilterOptions.value = {};
    if (rawServerPaged.value) {
      void loadData();
    }
  };

  const clearGayaFilters = (reload = true): void => {
    gayaColumns.value.forEach((column) => {
      gayaSelectedFilters.value[column.key] = [];
      gayaSearchFilters.value[column.key] = '';
    });

    gayaSortKey.value = '';
    gayaSortDirection.value = 'none';
    gayaActiveFilterKey.value = null;
    const wasFirstPage = gayaCurrentPage.value === 1;
    if (!wasFirstPage) {
      skipNextGayaPageWatch = true;
    }
    gayaCurrentPage.value = 1;
    gayaServerFilterOptions.value = {};
    if (reload && rawServerPaged.value) {
      void loadData();
    }
  };

  const setGayaSort = (
    key: string,
    direction: 'none' | 'asc' | 'desc'
  ): void => {
    if (direction === 'none') {
      gayaSortKey.value = '';
      gayaSortDirection.value = 'none';
    } else {
      gayaSortKey.value = key;
      gayaSortDirection.value = direction;
    }

    if (rawServerPaged.value && gayaCurrentPage.value !== 1) {
      skipNextGayaPageWatch = true;
    }
    gayaCurrentPage.value = 1;
    if (rawServerPaged.value) {
      void loadData(undefined, { pageOnly: true });
    }
  };

  const isGayaSortActive = (
    key: string,
    direction: 'asc' | 'desc'
  ): boolean => {
    return (
      gayaSortKey.value === key &&
      gayaSortDirection.value === direction
    );
  };

  const isGayaNoSortActive = (key: string): boolean => {
    return (
      gayaSortDirection.value === 'none' ||
      gayaSortKey.value !== key
    );
  };

  const gayaActiveFilterColumn = computed(() => {
    if (!gayaActiveFilterKey.value) {
      return null;
    }

    return gayaColumns.value.find(
      (column) => column.key === gayaActiveFilterKey.value
    ) || null;
  });

  const setGayaRowsPerPage = (
    value: number | string
  ): void => {
    const normalized = Number(value);

    if (!ROWS_PER_PAGE_OPTIONS.includes(normalized)) {
      return;
    }

    gayaRowsPerPage.value = normalized;
  };

  const gayaFirstPage = (): void => {
    gayaCurrentPage.value = 1;
  };

  const gayaPrevPage = (): void => {
    gayaCurrentPage.value = Math.max(
      1,
      gayaCurrentPage.value - 1
    );
  };

  const gayaNextPage = (): void => {
    gayaCurrentPage.value = Math.min(
      gayaTotalPages.value,
      gayaCurrentPage.value + 1
    );
  };

  const gayaLastPage = (): void => {
    gayaCurrentPage.value = gayaTotalPages.value;
  };

  const getGayaColumnStyle = (
    column: GayaMdfoColumn,
    rowIndex = 0,
    isHeader = false,
    isFooter = false
  ): CSSProperties => {
    const width = column.width || '90px';
    const index = gayaColumns.value.findIndex(
      (item) => item.key === column.key
    );
    const frozen = index >= 0 && index < gayaFrozenColumnCount.value;
    const lastFrozen = index === gayaFrozenColumnCount.value - 1;
    const isFirstColumn = index === 0;

    let left = 0;
    if (frozen) {
      left = gayaColumns.value
        .slice(0, index)
        .reduce(
          (total, item) =>
            total + getColumnWidthNumber(item.width || '90px'),
          0
        );
    }

    // Warna dibuat sama dengan Raw MDFO ADM.
    // Sabtu/Minggu tidak lagi diberi warna merah khusus.
    const backgroundColor = isFooter
      ? '#eff6ff'
      : isHeader
        ? '#eff6ff'
        : rowIndex % 2 === 0
          ? '#ffffff'
          : '#f8fafc';

    const shadows = [
      `inset -1px 0 0 ${GRID_BORDER}`,
      `inset 0 -1px 0 ${GRID_BORDER}`,
      isHeader || isFooter
        ? `inset 0 1px 0 ${GRID_BORDER}`
        : '',
      // Separator freeze dibuat tipis sama seperti ADM.
      lastFrozen
        ? '2px 0 4px -3px rgba(15, 23, 42, 0.16)'
        : ''
    ].filter(Boolean);

    // Garis kiri tabel sama seperti Raw MDFO ADM.
    if (isFirstColumn) {
      shadows.push(`inset 1px 0 0 ${GRID_BORDER}`);
    }

    return {
      width,
      minWidth: width,
      maxWidth: width,
      boxSizing: 'border-box',
      position: frozen || isFooter ? 'sticky' : 'relative',
      left: frozen ? `${left}px` : undefined,
      bottom: isFooter ? '0px' : undefined,
      zIndex: frozen
        ? isHeader
          ? 700
          : isFooter
            ? 280
            : 80
        : isHeader
          ? 301
          : isFooter
            ? 120
            : 1,
      backgroundColor,
      backgroundImage: `linear-gradient(${backgroundColor}, ${backgroundColor})`,
      backgroundOrigin: 'border-box',
      backgroundClip: 'border-box',
      backgroundRepeat: 'no-repeat',
      backgroundSize: '100% 100%',
      isolation: 'isolate',
      boxShadow: shadows.join(', '),
      transform: frozen ? 'translateZ(0)' : undefined,
      backfaceVisibility: frozen ? 'hidden' : undefined
    };
  };

  const formatGayaCellValue = (
    column: GayaMdfoColumn,
    value: unknown
  ): string => {
    if (value === null || value === undefined || value === '') {
      return '';
    }

    return column.numeric
      ? formatNumber(value)
      : String(value);
  };

  const formatGayaTotalValue = (value: unknown): string => {
    return formatNumber(value);
  };

  // COMPUTED: FILTER, SORT, TOTAL, PAGINATION

  const hasOpenFilter = computed(() => {
    return [...columns, ...ASI_MDFO_COLUMNS, ...tmminColumns.value].some(
      (column) => openFilters.value[column.key]
    );
  });

  const hasActiveFilter = computed(() => {
    return Object.values(selectedFilters.value).some((values) => Array.isArray(values) && values.length > 0);
  });

  const hasAnySelectedFilterValues = (
    filters: Record<string, string[] | undefined>
  ): boolean => {
    return Object.values(filters).some(
      (values) => Array.isArray(values) && values.length > 0
    );
  };

  const hasActiveRawColumnFilter = computed(() => {
    if (isGayaMode.value) {
      return hasAnySelectedFilterValues(gayaSelectedFilters.value);
    }

    if (isNtcMode.value) {
      return hasAnySelectedFilterValues(
        ntcSelectedFilters.value as unknown as Record<string, string[] | undefined>
      );
    }

    return hasAnySelectedFilterValues(
      selectedFilters.value as unknown as Record<string, string[] | undefined>
    );
  });

  const filteredRows = computed(() => {
    if (rawServerPaged.value) {
      return rows.value;
    }

    return getRowsMatchingOtherColumnFilters(
      rows.value,
      columns,
      selectedFilters.value,
      null,
      (row, key) => formatFilterValue(row[key])
    );
  });

  const sortedRows = computed(() => {
    const data = [...filteredRows.value];

    if (rawServerPaged.value) {
      return data;
    }

    if (sortKey.value === '' || sortDirection.value === 'none') {
      return data;
    }

    const key = sortKey.value;

    return data.sort((first, second) => {
      const firstValue = formatFilterValue(first[key]).toLowerCase();

      const secondValue = formatFilterValue(second[key]).toLowerCase();

      return sortDirection.value === 'asc'
        ? firstValue.localeCompare(secondValue, 'id', {
          numeric: true
        })
        : secondValue.localeCompare(firstValue, 'id', {
          numeric: true
        });
    });
  });

  const getAsiCellValue = (
    row: MdfoRow,
    key: MdfoKey
  ): string | number => {
    if (key === 'partNoSap') {
      const explicit = String(row.partNoSap ?? '').trim();

      if (explicit !== '') {
        return explicit;
      }

      const partNo = String(row.partNo ?? '').trim();

      if (partNo === '') {
        return '';
      }

      return /-00$/i.test(partNo)
        ? partNo
        : `${partNo}-00`;
    }

    return row[key] ?? '';
  };

  const asiFilteredRows = computed(() => {
    if (rawServerPaged.value) {
      return rows.value;
    }

    if (!isAsiAdmMode.value) {
      return rows.value;
    }

    return getRowsMatchingOtherColumnFilters(
      rows.value,
      ASI_MDFO_COLUMNS,
      selectedFilters.value,
      null,
      (row, key) => formatFilterValue(getAsiCellValue(row, key))
    );
  });

  const asiSortedRows = computed(() => {
    const data = [...asiFilteredRows.value];

    if (rawServerPaged.value) {
      return data;
    }

    if (sortKey.value === '' || sortDirection.value === 'none') {
      return data;
    }

    const key = sortKey.value;

    if (!ASI_MDFO_COLUMNS.some((column) => column.key === key)) {
      return data;
    }

    return data.sort((first, second) => {
      const firstValue = formatFilterValue(
        getAsiCellValue(first, key)
      ).toLowerCase();
      const secondValue = formatFilterValue(
        getAsiCellValue(second, key)
      ).toLowerCase();

      return sortDirection.value === 'asc'
        ? firstValue.localeCompare(secondValue, 'id', { numeric: true })
        : secondValue.localeCompare(firstValue, 'id', { numeric: true });
    });
  });

  const asiPaginatedRows = computed(() => {
    if (rawServerPaged.value) {
      return asiSortedRows.value;
    }

    if (rowsPerPage.value === 0) {
      return asiSortedRows.value;
    }

    const start = (currentPage.value - 1) * rowsPerPage.value;

    return asiSortedRows.value.slice(
      start,
      start + rowsPerPage.value
    );
  });

  const asiColumnTotals = computed(() => {
    const totals: Record<MdfoKey, number> = {};

    ASI_MDFO_COLUMNS.forEach((column) => {
      if (!ASI_TOTAL_COLUMN_KEYS.has(column.key)) {
        totals[column.key] = 0;
        return;
      }

      totals[column.key] = rawServerPaged.value
        ? Number(rawServerColumnTotals.value[column.key] ?? 0)
        : asiFilteredRows.value.reduce(
        (sum, row) => sum + (Number(getAsiCellValue(row, column.key)) || 0),
        0
      );
    });

    return totals;
  });

  const asiDailyGrandTotal = computed(() => {
    // Ambil grand total langsung dari total harian yang sama dengan footer.
    // Dengan begitu angka Daily Total selalu identik dengan penjumlahan day 1..31
    // setelah filter ASI ADM diterapkan.
    return DAY_KEYS.reduce(
      (total, key) => total + (asiColumnTotals.value[key] || 0),
      0
    );
  });

  // Footer ASI ADM menggabungkan Part No, Part No SAP, Part Name, dan
  // Qty/Kanban ke area label TOTAL. Qty/Kanban bukan nilai additive.
  const asiFooterLabelColspan = 4;
  const asiFooterLabelColumns = ASI_MDFO_COLUMNS.slice(
    0,
    asiFooterLabelColspan
  );
  const asiFooterTotalColumns = computed(() => {
    return ASI_MDFO_COLUMNS.slice(asiFooterLabelColspan);
  });

  const exportRowCount = computed(() => {
    if (rawServerPaged.value) {
      return rawServerTotal.value;
    }

    if (isGayaMode.value) {
      return gayaSortedRows.value.length;
    }

    if (isNtcMode.value) {
      return ntcSortedRows.value.length;
    }

    if (isAsiAdmMode.value) {
      return asiSortedRows.value.length;
    }

    return isTmminMode.value
      ? tmminSortedRows.value.length
      : sortedRows.value.length;
  });

  const sharedDownloadRowCount = computed(() => {
    // Multi-customer download tidak membawa column filter per tabel,
    // sehingga count mengikuti seluruh scope customer terpilih.
    if (selectedDownloadCustomers.value.length > 1) {
      return downloadScopeRowCount.value;
    }

    // Single customer tetap mengikuti hasil filter tabel seperti behavior lama.
    return exportRowCount.value;
  });

  const columnTotals = computed(() => {
    const totals = {} as Record<MdfoKey, number>;

    columns.forEach((column) => {
      if (!TOTAL_COLUMN_KEYS.has(column.key)) {
        totals[column.key] = 0;
        return;
      }

      totals[column.key] = rawServerPaged.value
        ? Number(rawServerColumnTotals.value[column.key] ?? 0)
        : filteredRows.value.reduce((sum, row) => {
          return sum + (Number(row[column.key]) || 0);
        }, 0);
    });

    return totals;
  });

  const totalPages = computed(() => {
    if (rawServerPaged.value) {
      return rawServerTotalPages.value;
    }

    if (rowsPerPage.value === 0) {
      return 1;
    }

    return Math.max(
      1,
      Math.ceil(
        sortedRows.value.length / rowsPerPage.value
      )
    );
  });

  const visiblePages =
    computed(() => {
      const total =
        totalPages.value;

      const current =
        currentPage.value;

      // Maksimal 5 nomor halaman: 1 2 3 4 5 atau: 8 9 10 11 12
      let start =
        Math.max(
          1,
          current - 2
        );

      const end =
        Math.min(
          total,
          start + 4
        );

      start =
        Math.max(
          1,
          end - 4
        );

      return Array.from(
        {
          length:
            end - start + 1
        },

        (
          _,
          index
        ) => {
          return start + index;
        }
      );
    });

  const paginatedRows = computed(() => {
    if (rawServerPaged.value) {
      return sortedRows.value;
    }

    if (rowsPerPage.value === 0) {
      return sortedRows.value;
    }

    const start =
      (currentPage.value - 1) *
      rowsPerPage.value;

    return sortedRows.value.slice(
      start,
      start + rowsPerPage.value
    );
  });

  const showingStart = computed(() => {
    const totalRows = rawServerPaged.value
      ? rawServerTotal.value
      : sortedRows.value.length;

    if (totalRows === 0) {
      return 0;
    }

    if (rowsPerPage.value === 0) {
      return 1;
    }

    return (currentPage.value - 1) * rowsPerPage.value + 1;
  });

  const showingEnd = computed(() => {
    if (rawServerPaged.value) {
      return Math.min(currentPage.value * rowsPerPage.value, rawServerTotal.value);
    }

    if (rowsPerPage.value === 0) {
      return sortedRows.value.length;
    }

    return Math.min(
      currentPage.value * rowsPerPage.value,
      sortedRows.value.length
    );
  });

  const activeTotalPages = computed(() => {
    if (rawServerPaged.value) {
      return rawServerTotalPages.value;
    }

    if (rowsPerPage.value === 0) {
      return 1;
    }

    const totalRows = isAsiAdmMode.value
      ? asiSortedRows.value.length
      : isTmminMode.value
        ? tmminSortedRows.value.length
        : sortedRows.value.length;

    return Math.max(
      1,
      Math.ceil(totalRows / rowsPerPage.value)
    );
  });

  const activeVisiblePages = computed(() => {
    const total = activeTotalPages.value;
    const current = currentPage.value;
    let start = Math.max(1, current - 2);
    const end = Math.min(total, start + 4);

    start = Math.max(1, end - 4);

    return Array.from(
      { length: end - start + 1 },
      (_, index) => start + index
    );
  });

  const activeShowingStart = computed(() => {
    if (rawServerPaged.value) {
      return rawServerTotal.value === 0
        ? 0
        : (currentPage.value - 1) * rowsPerPage.value + 1;
    }

    const count = isAsiAdmMode.value
      ? asiSortedRows.value.length
      : isTmminMode.value
        ? tmminSortedRows.value.length
        : sortedRows.value.length;

    if (count === 0) {
      return 0;
    }

    if (rowsPerPage.value === 0) {
      return 1;
    }

    return (currentPage.value - 1) * rowsPerPage.value + 1;
  });

  const activeShowingEnd = computed(() => {
    if (rawServerPaged.value) {
      return Math.min(currentPage.value * rowsPerPage.value, rawServerTotal.value);
    }

    const count = isAsiAdmMode.value
      ? asiSortedRows.value.length
      : isTmminMode.value
        ? tmminSortedRows.value.length
        : sortedRows.value.length;

    if (rowsPerPage.value === 0) {
      return count;
    }

    return Math.min(
      currentPage.value * rowsPerPage.value,
      count
    );
  });

  // COMPUTED: DOWNLOAD

  const missingDownloadFilters = computed(() => {
    const missing: string[] = [];

    if (selectedDownloadCustomers.value.length === 0) {
      missing.push('Customer');
    }

    if (normalizePeriod(selectedPeriodFilter.value) === '') {
      missing.push('Periode');
    }

    if (normalizeRevision(selectedRevisionFilter.value) === '') {
      missing.push('Revision');
    }

    return missing;
  });

  // Heavy operation lock:
  // export Raw, export Quotation/Contract/ZSTT, dan regenerate tidak boleh
  // berjalan bersamaan agar server 128 MB tidak menerima beberapa proses
  // workbook/query berat pada waktu yang sama. Browsing/filter tetap aktif.
  const isHeavyOperationRunning = computed(() => {
    return (
      isDownloadingExcel.value ||
      quotationStore.isDownloadingExcel ||
      quotationStore.isGenerating
    );
  });

  const canDownloadExcel = computed(() => {
    return (
      missingDownloadFilters.value.length === 0 &&
      !isHeavyOperationRunning.value
    );
  });

  const downloadExcelDescription = computed(() => {
    if (isDownloadingExcel.value) {
      return 'File MDFO sedang dipersiapkan';
    }

    if (quotationStore.isDownloadingExcel) {
      return 'Tunggu download Quotation/Contract/ZSTT selesai';
    }

    if (quotationStore.isGenerating) {
      return 'Tunggu regenerate Quotation selesai';
    }

    if (missingDownloadFilters.value.length > 0) {
      return (
        'Pilih ' +
        missingDownloadFilters.value.join(', ') +
        ' sebelum download'
      );
    }

    return '';
  });

  const rawDownloadButtonLabel = computed(() => {
    if (isDownloadingExcel.value) {
      return 'Preparing...';
    }

    if (missingDownloadFilters.value.length > 0) {
      return `Pilih ${missingDownloadFilters.value.join(' + ')}`;
    }

    const customerCount =
      selectedDownloadCustomers.value.length;

    const rowCountLabel = isLoadingDownloadScopeRowCount.value
      ? '...'
      : sharedDownloadRowCount.value.toLocaleString('id-ID');

    if (customerCount === MDFO_DOWNLOAD_CUSTOMER_ORDER.length) {
      return `Download ZIP All Customers (${rowCountLabel})`;
    }

    if (customerCount > 1) {
      return `Download ZIP ${customerCount} Customer (${rowCountLabel})`;
    }

    return `Download Excel (${sharedDownloadRowCount.value})`;
  });

  const refreshDownloadScopeRowCount = async (): Promise<void> => {
    const requestId = ++downloadScopeRowCountRequestId;
    const customers = [...selectedDownloadCustomers.value];
    const periode = normalizePeriod(selectedPeriodFilter.value);
    const revision = normalizeRevision(selectedRevisionFilter.value);

    if (customers.length <= 1 || periode === '' || revision === '') {
      downloadScopeRowCount.value = 0;
      isLoadingDownloadScopeRowCount.value = false;
      return;
    }

    downloadScopeRowCount.value = 0;
    isLoadingDownloadScopeRowCount.value = true;

    try {
      const preflight = await mdfoService.getDownloadPreflight(
        customers,
        periode,
        revision,
        {}
      );

      if (requestId !== downloadScopeRowCountRequestId) return;

      downloadScopeRowCount.value = preflight.available.reduce(
        (total, row) => total + (row.available ? Number(row.rows || 0) : 0),
        0
      );
    } catch (error: unknown) {
      if (requestId !== downloadScopeRowCountRequestId) return;

      // Count pada label bersifat informasi tambahan. Kegagalan menghitung
      // tidak boleh memblokir tombol download yang tetap punya preflight sendiri.
      downloadScopeRowCount.value = 0;
      console.warn('Gagal menghitung total row download MDFO:', error);
    } finally {
      if (requestId === downloadScopeRowCountRequestId) {
        isLoadingDownloadScopeRowCount.value = false;
      }
    }
  };

  const quotationDownloadCustomers = computed(() => {
    /*
     * Semua customer dokumen termasuk GAYA MTR memakai scope
     * Quotation / Contract / ZSTT yang sama.
     * Raw Gaya Motor tetap memakai tabel Raw khusus.
     */
    return getDocumentScopeCustomers(
      selectedDownloadCustomers.value
    );
  });

  const canDownloadQuotationExcel = computed(() => {
    return (
      missingDownloadFilters.value.length === 0 &&
      quotationDownloadCustomers.value.length > 0 &&
      !isHeavyOperationRunning.value
    );
  });

  const downloadQuotationDescription = computed(() => {
    if (quotationStore.isDownloadingExcel) {
      return 'File Quotation sedang dipersiapkan';
    }

    if (isDownloadingExcel.value) {
      return 'Tunggu download Raw MDFO selesai';
    }

    if (quotationStore.isGenerating) {
      return 'Tunggu regenerate Quotation selesai';
    }

    if (
      selectedDownloadCustomers.value.length > 0 &&
      quotationDownloadCustomers.value.length === 0
    ) {
      return 'Tidak ada customer dokumen yang valid untuk didownload';
    }

    if (missingDownloadFilters.value.length > 0) {
      return (
        'Pilih ' +
        missingDownloadFilters.value.join(', ') +
        ' sebelum download'
      );
    }

    return '';
  });

  const quotationDownloadButtonLabel = computed(() => {
    if (quotationStore.isDownloadingExcel) {
      return 'Preparing...';
    }

    if (missingDownloadFilters.value.length > 0) {
      return `Pilih ${missingDownloadFilters.value.join(' + ')}`;
    }

    const customerCount =
      quotationDownloadCustomers.value.length;

    // Badge download harus mencerminkan SELURUH hasil scope/filter, bukan
    // hanya row page aktif. Pada server-side pagination serverTotal adalah
    // jumlah row lengkap (mis. 44 walaupun Show 10).
    const quotationRowCount = quotationStore.serverPaged
      ? quotationStore.serverTotal
      : quotationStore.sortedRows.length;

    if (customerCount > 1) {
      return `Download ZIP ${customerCount} Customer (${quotationRowCount} rows)`;
    }

    return `Download Excel 6 Sheets (${quotationRowCount})`;
  });

  const asiDisplayColumns = ASI_MDFO_COLUMNS;
  const asiDayColumns = computed(() => {
    return ASI_MDFO_COLUMNS.filter((column) => column.group === 'day');
  });

  const asiTableWidth = computed(() => {
    const width = ASI_MDFO_COLUMNS.reduce(
      (total, column) => total + getColumnWidthNumber(column.width),
      0
    );

    return `${width + getColumnWidthNumber(DAILY_TOTAL_WIDTH)}px`;
  });

  const isAsiFrozenColumn = (key: MdfoKey): boolean => {
    return ASI_FROZEN_COLUMNS.includes(key);
  };

  const getAsiFrozenLeft = (key: MdfoKey): number => {
    const index = ASI_FROZEN_COLUMNS.indexOf(key);

    if (index < 0) {
      return 0;
    }

    return ASI_FROZEN_COLUMNS
      .slice(0, index)
      .reduce((total, frozenKey) => {
        const column = ASI_MDFO_COLUMNS.find(
          (item) => item.key === frozenKey
        );

        return total + (column ? getColumnWidthNumber(column.width) : 0);
      }, 0);
  };

  const getAsiColumnStyle = (
    key: MdfoKey,
    rowIndex = 0,
    isHeader = false,
    isFooter = false
  ): CSSProperties => {
    const column = ASI_MDFO_COLUMNS.find((item) => item.key === key);
    const width = column?.width || '100px';
    const frozen = isAsiFrozenColumn(key);
    const firstColumn = key === ASI_MDFO_COLUMNS[0]?.key;
    const isOpen = openFilters.value[key] === true;
    const backgroundColor = isHeader || isFooter
      ? '#eff6ff'
      : rowIndex % 2 === 0
        ? '#ffffff'
        : '#f8fafc';
    const shadows = [
      `inset -1px 0 0 ${GRID_BORDER}`,
      `inset 0 -1px 0 ${GRID_BORDER}`,
      isHeader || isFooter ? `inset 0 1px 0 ${GRID_BORDER}` : '',
      firstColumn ? `inset 1px 0 0 ${GRID_BORDER}` : ''
    ].filter(Boolean);

    /*
     * ASI ADM tidak memakai shadow separator tambahan setelah N+3.
     * Shadow lama terlihat seperti ada kolom/garis baru sebelum Day 1.
     * Border kanan 1px normal di atas sudah cukup.
     */
    const frozenIndex = ASI_FROZEN_COLUMNS.indexOf(key);
    const frozenLeft = frozen
      ? Math.max(0, getAsiFrozenLeft(key) - Math.max(frozenIndex, 0))
      : 0;

    return {
      minWidth: width,
      width,
      maxWidth: width,
      boxSizing: 'border-box',
      position: frozen || isFooter ? 'sticky' : 'relative',
      left: frozen ? `${frozenLeft}px` : undefined,
      bottom: isFooter ? '0px' : undefined,
      zIndex: frozen
        ? isHeader && isOpen
          ? 10002
          : isHeader
            ? 700
            : isFooter
              ? 280
              : 80
        : isHeader && isOpen
          ? 10001
          : isHeader
            ? 301
            : isFooter
              ? 120
              : 1,
      backgroundColor,
      backgroundImage: `linear-gradient(${backgroundColor}, ${backgroundColor})`,
      backgroundRepeat: 'no-repeat',
      backgroundSize: '100% 100%',
      backgroundOrigin: 'border-box',
      backgroundClip: 'border-box',
      isolation: 'isolate',
      boxShadow: shadows.join(', '),
      transform: frozen ? 'translateZ(0)' : undefined,
      backfaceVisibility: frozen ? 'hidden' : undefined
    };
  };

  const getAsiFooterLabelCellStyle = (
    key: MdfoKey,
    index: number
  ): CSSProperties => {
    const column = ASI_MDFO_COLUMNS.find((item) => item.key === key);
    const width = column?.width || '100px';
    const frozenIndex = ASI_FROZEN_COLUMNS.indexOf(key);
    const left = Math.max(
      0,
      getAsiFrozenLeft(key) - Math.max(frozenIndex, 0)
    );
    const backgroundColor = '#dbeafe';
    const shadows = [
      index === 0 ? `inset 1px 0 0 ${GRID_BORDER}` : '',
      index === asiFooterLabelColumns.length - 1
        ? `inset -1px 0 0 ${GRID_BORDER}`
        : '',
      `inset 0 1px 0 ${GRID_BORDER}`,
      `inset 0 -1px 0 ${GRID_BORDER}`
    ].filter(Boolean);

    return {
      position: 'sticky',
      left: `${left}px`,
      bottom: '0px',
      zIndex: index === 0 ? 295 : 285,
      width,
      minWidth: width,
      maxWidth: width,
      height: '40px',
      boxSizing: 'border-box',
      overflow: 'visible',
      backgroundColor,
      backgroundImage: `linear-gradient(${backgroundColor}, ${backgroundColor})`,
      backgroundOrigin: 'border-box',
      backgroundClip: 'border-box',
      backgroundRepeat: 'no-repeat',
      backgroundSize: '100% 100%',
      boxShadow: shadows.join(', '),
      transform: 'translateZ(0)',
      backfaceVisibility: 'hidden'
    };
  };

  const getAsiFooterLabelOverlayStyle = (): CSSProperties => {
    const width = asiFooterLabelColumns.reduce(
      (total, column) => total + getColumnWidthNumber(column.width),
      0
    );

    return {
      position: 'absolute',
      left: '0px',
      top: '0px',
      zIndex: 2,
      width: `${width}px`,
      minWidth: `${width}px`,
      maxWidth: `${width}px`,
      height: '40px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      pointerEvents: 'none',
      whiteSpace: 'nowrap'
    };
  };

  // Dipertahankan untuk kompatibilitas pemanggilan lama.
  const getAsiTotalLabelStyle = (): CSSProperties => {
    return getAsiFooterLabelOverlayStyle();
  };


  // Sticky table styles follow the same grid and frozen-column behavior as Upload SO.

  const getFrozenLeftPosition = (
    key: MdfoKey
  ): number => {
    const index =
      columns.findIndex(
        (column) =>
          column.key === key
      );

    if (index < 0) {
      return 0;
    }

    return columns
      .slice(0, index)
      .reduce(
        (
          total,
          column
        ) => {
          return (
            total +
            getColumnWidthNumber(
              column.width
            )
          );
        },
        0
      );
  };

  // Footer Raw MDFO mengikuti batas freeze aktif supaya laptop tidak membeku melewati Part Name.
  const rawFooterLabelColspan = computed(() => {
    if (!isLaptopAdmRawFreeze.value) {
      return totalLabelColspan.value;
    }

    const partNameIndex = columns.findIndex(
      (column) => column.key === 'partName'
    );

    return partNameIndex >= 0
      ? partNameIndex + 1
      : totalLabelColspan.value;
  });

  const rawFooterSpacerColumns = computed(() => {
    return columns.slice(
      rawFooterLabelColspan.value,
      totalLabelColspan.value
    );
  });

  const rawFooterTotalColumns = computed(() => {
    return columns.slice(totalLabelColspan.value);
  });

  // Lebar visual label TOTAL mengikuti overlap frozen yang sama dengan header/body.
  const totalLabelFrozenWidth = computed(() => {
    const labelEndKey: MdfoKey = isLaptopAdmRawFreeze.value
      ? 'partName'
      : TOTAL_LABEL_END_KEY;

    const labelEndIndex = columns.findIndex(
      (column) => column.key === labelEndKey
    );

    if (labelEndIndex < 0) {
      return '0px';
    }

    const nextKey = columns[labelEndIndex + 1]?.key;
    const activeFrozen = activeFrozenColumns.value;

    if (nextKey) {
      const nextFrozenIndex = activeFrozen.indexOf(nextKey);

      if (nextFrozenIndex >= 0) {
        return `${Math.max(
          0,
          getFrozenLeftPosition(nextKey) - nextFrozenIndex
        )}px`;
      }
    }

    const endFrozenIndex = activeFrozen.indexOf(labelEndKey);
    const endColumn = columns[labelEndIndex];
    const rightEdge =
      getFrozenLeftPosition(labelEndKey) -
      Math.max(endFrozenIndex, 0) +
      getColumnWidthNumber(endColumn.width);

    return `${Math.max(0, rightEdge)}px`;
  });

  // Total Lebar Frozen Pane aktif.
  const frozenPaneWidth = computed(() => {
    const totalWidth = activeFrozenColumns.value.reduce(
      (total, key) => {
        const column = columns.find((item) => item.key === key);

        return column
          ? total + getColumnWidthNumber(column.width)
          : total;
      },
      0
    );

    return `${totalWidth}px`;
  });

  // Total Lebar Tabel

  const tableWidth = computed(() => {
    const columnsWidth =
      columns.reduce(
        (
          total,
          column
        ) => {
          return (
            total +
            getColumnWidthNumber(
              column.width
            )
          );
        },
        0
      );

    return `${columnsWidth +
      getColumnWidthNumber(
        DAILY_TOTAL_WIDTH
      )
      }px`;
  });

  // Check Frozen Column

  const isFrozenColumn = (
    key: MdfoKey
  ): boolean => {
    return activeFrozenColumns.value.includes(
      key
    );
  };

  // COLUMN STYLE Ini mengikuti getCard2ColumnStyle() pada Upload SO.

  const getColumnStyle = (
    key: MdfoKey,
    isHeader = false,
    rowIndex = 0,
    includeHeaderTopBorder = true
  ): CSSProperties => {
    const column =
      columns.find(
        (item) =>
          item.key === key
      );

    const width =
      column?.width || '120px';

    const activeFrozen =
      activeFrozenColumns.value;

    const isFrozen =
      activeFrozen.includes(
        key
      );

    const isOpen =
      openFilters.value[key] === true;

    // Posisi frozen column di array frozen.
    const frozenIndex =
      activeFrozen.indexOf(
        key
      );

    // Frozen column terakhir. Dipakai untuk membuat separator frozen vs non-frozen.
    const lastFrozenKey =
      activeFrozen[
      activeFrozen.length - 1
      ];

    // Kolom pertama seluruh tabel.
    const isFirstColumn =
      key === columns[0]?.key;

    // Warna sama dengan Upload SO: Header = blue-50 Row genap = putih Row ganjil = slate-50
    const backgroundColor =
      isHeader
        ? '#eff6ff'
        : rowIndex % 2 === 0
          ? '#ffffff'
          : '#f8fafc';

    // Sama persis dengan grid color Upload SO.
    const gridColor =
      '#e2e8f0';

    // Use inset shadows for table grid borders so frozen cells stay visually stable.
    const gridShadows: string[] = [
      // Border kanan.
      `inset -1px 0 0 ${gridColor}`,

      // Border bawah.
      `inset 0 -1px 0 ${gridColor}`
    ];

    // Border atas header. Pada header row kedua MDFO includeHeaderTopBorder = false supaya tidak terbentuk garis dobel.
    if (
      isHeader &&
      includeHeaderTopBorder
    ) {
      gridShadows.push(
        `inset 0 1px 0 ${gridColor}`
      );
    }

    // Border kiri tabel. Raw Files Upload SO memakai 2px untuk sisi paling kiri.
    if (isFirstColumn) {
      gridShadows.push(`inset 1px 0 0 ${gridColor}`);
    }

    // SEPARATOR FROZEN TERAKHIR Sama seperti Upload SO.
    if (
      isFrozen &&
      key === lastFrozenKey
    ) {
      gridShadows.push(
        '2px 0 4px -3px rgba(15, 23, 42, 0.16)'
      );
    }

    // Apply the same small frozen-column overlap used by Upload SO.
    const frozenLeft =
      isFrozen
        ? Math.max(
          0,
          getFrozenLeftPosition(
            key
          ) -
          Math.max(
            frozenIndex,
            0
          )
        )
        : 0;

    // Base Style
    const baseStyle:
      CSSProperties = {
      minWidth:
        width,

      width,

      maxWidth:
        width,

      boxSizing:
        'border-box',

      // Background diberikan pada SEMUA cell.
      backgroundColor,

      // Solid background layer. Ini sangat penting untuk frozen cell agar tulisan non-frozen tidak terlihat menembus ketika discroll.
      backgroundImage: `linear-gradient(
      ${backgroundColor},
      ${backgroundColor}
    )`,

      backgroundOrigin:
        'border-box',

      backgroundClip:
        'border-box',

      backgroundRepeat:
        'no-repeat',

      backgroundSize:
        '100% 100%',

      // Membuat stacking context cell lebih stabil.
      isolation:
        'isolate',

      // Seluruh border grid berasal dari sini.
      boxShadow:
        gridShadows.join(', ')
    };

    // Non-Frozen
    if (!isFrozen) {
      return {
        ...baseStyle,

        position:
          'relative',

        zIndex:
          isHeader &&
            isOpen
            ? 10001
            : isHeader
              ? 301
              : 1
      };
    }

    // Frozen Column
    return {
      ...baseStyle,

      position:
        'sticky',

      left:
        `${frozenLeft}px`,

      zIndex:
        isHeader &&
          isOpen
          ? 10002
          : isHeader
            ? 700
            : 80,

      // Membantu browser saat render sticky horizontal.
      transform:
        'translateZ(0)',

      backfaceVisibility:
        'hidden'
    };
  };

  // FOOTER COLUMN STYLE Prinsip grid-nya sama seperti Upload SO: right + top + bottom + frozen separator.

  const getFooterColumnStyle = (
    key: MdfoKey
  ): CSSProperties => {
    const column =
      columns.find(
        (item) =>
          item.key === key
      );

    const width =
      column?.width || '120px';

    const activeFrozen =
      activeFrozenColumns.value;

    const isFrozen =
      activeFrozen.includes(
        key
      );

    const frozenIndex =
      activeFrozen.indexOf(
        key
      );

    const lastFrozenKey =
      activeFrozen[
      activeFrozen.length - 1
      ];

    const backgroundColor =
      '#eff6ff';

    const gridShadows: string[] = [
      // Border kanan.
      `inset -1px 0 0 ${GRID_BORDER}`,

      // Border atas footer.
      `inset 0 1px 0 ${GRID_BORDER}`,

      // Border bawah.
      `inset 0 -1px 0 ${GRID_BORDER}`
    ];

    // Separator frozen terakhir.
    if (
      isFrozen &&
      key === lastFrozenKey
    ) {
      gridShadows.push(
        '2px 0 4px -3px rgba(15, 23, 42, 0.16)'
      );
    }

    // Sama seperti body/header: frozen overlap 1px.
    const frozenLeft =
      isFrozen
        ? Math.max(
          0,
          getFrozenLeftPosition(
            key
          ) -
          Math.max(
            frozenIndex,
            0
          )
        )
        : 0;

    const baseStyle:
      CSSProperties = {
      minWidth:
        width,

      width,

      maxWidth:
        width,

      boxSizing:
        'border-box',

      position:
        'sticky',

      bottom:
        '0px',

      zIndex:
        isFrozen
          ? 280
          : 120,

      backgroundColor,

      backgroundImage: `linear-gradient(
      ${backgroundColor},
      ${backgroundColor}
    )`,

      backgroundOrigin:
        'border-box',

      backgroundClip:
        'border-box',

      backgroundRepeat:
        'no-repeat',

      backgroundSize:
        '100% 100%',

      isolation:
        'isolate',

      boxShadow:
        gridShadows.join(', ')
    };

    if (!isFrozen) {
      return baseStyle;
    }

    return {
      ...baseStyle,

      left:
        `${frozenLeft}px`,

      transform:
        'translateZ(0)',

      backfaceVisibility:
        'hidden'
    };
  };

  // TOTAL LABEL FOOTER Cell TOTAL adalah colspan 7, sehingga style dibuat terpisah.

  const getTotalLabelCellStyle =
    (): CSSProperties => {
      const backgroundColor = '#dbeafe';

      return {
        position: 'sticky',
        left: '0px',
        bottom: '0px',
        zIndex: 260,

        // Background ikut diisi supaya kalau ada subpixel rendering, tidak tampil putih.
        backgroundColor,
        backgroundImage: `linear-gradient(${backgroundColor}, ${backgroundColor})`,
        backgroundOrigin: 'border-box',
        backgroundClip: 'border-box',
        backgroundRepeat: 'no-repeat',
        backgroundSize: '100% 100%',

        padding: '0',
        boxSizing: 'border-box',
        overflow: 'hidden',

        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden'
      };
    };
  // TOTAL LABEL INNER STYLE Ini adalah layer biru yang benar-benar terlihat.

  const getTotalLabelStyle =
    (): CSSProperties => {
      const backgroundColor =
        '#dbeafe';

      return {
        // Size
        height:
          '40px',

        minHeight:
          '40px',

        // Ini Yang Menentukan Garis Total.
        width:
          totalLabelFrozenWidth.value,

        minWidth:
          totalLabelFrozenWidth.value,

        maxWidth:
          totalLabelFrozenWidth.value,

        boxSizing:
          'border-box',

        // Position
        position:
          'relative',

        zIndex:
          1,

        // Alignment
        display:
          'flex',

        alignItems:
          'center',

        justifyContent:
          'center',

        // Background
        backgroundColor,

        backgroundImage:
          `linear-gradient(
          ${backgroundColor},
          ${backgroundColor}
        )`,

        backgroundOrigin:
          'border-box',

        backgroundClip:
          'border-box',

        backgroundRepeat:
          'no-repeat',

        backgroundSize:
          '100% 100%',

        isolation:
          'isolate',

        // BORDER Sekarang border kanan berada pada visual width yang benar, BUKAN pada ujung colspan browser.
        boxShadow: [
          // kiri
          `inset 1px 0 0 ${GRID_BORDER}`,

          // kanan
          `inset -1px 0 0 ${GRID_BORDER}`,

          // atas
          `inset 0 1px 0 ${GRID_BORDER}`,

          // bawah
          `inset 0 -1px 0 ${GRID_BORDER}`
        ].join(', '),

        overflow:
          'hidden',

        whiteSpace:
          'nowrap'
      };
    };

  // DAILY TOTAL HEADER Daily Total tidak berada di COLUMNS, jadi perlu helper style sendiri.

  const getDailyTotalHeaderStyle =
    (): CSSProperties => {
      const backgroundColor =
        '#eff6ff';

      return {
        minWidth:
          DAILY_TOTAL_WIDTH,

        width:
          DAILY_TOTAL_WIDTH,

        maxWidth:
          DAILY_TOTAL_WIDTH,

        boxSizing:
          'border-box',

        position:
          'relative',

        zIndex:
          301,

        backgroundColor,

        backgroundImage: `linear-gradient(
        ${backgroundColor},
        ${backgroundColor}
      )`,

        backgroundOrigin:
          'border-box',

        backgroundClip:
          'border-box',

        backgroundRepeat:
          'no-repeat',

        backgroundSize:
          '100% 100%',

        isolation:
          'isolate',

        // Sama seperti header Upload SO.
        boxShadow: [
          `inset -1px 0 0 ${GRID_BORDER}`,
          `inset 0 -1px 0 ${GRID_BORDER}`,
          `inset 0 1px 0 ${GRID_BORDER}`
        ].join(', ')
      };
    };

  // Daily Total Body

  const getDailyTotalBodyStyle = (
    rowIndex: number
  ): CSSProperties => {
    const backgroundColor =
      rowIndex % 2 === 0
        ? '#ffffff'
        : '#f8fafc';

    return {
      minWidth:
        DAILY_TOTAL_WIDTH,

      width:
        DAILY_TOTAL_WIDTH,

      maxWidth:
        DAILY_TOTAL_WIDTH,

      boxSizing:
        'border-box',

      position:
        'relative',

      zIndex:
        1,

      backgroundColor,

      backgroundImage: `linear-gradient(
      ${backgroundColor},
      ${backgroundColor}
    )`,

      backgroundOrigin:
        'border-box',

      backgroundClip:
        'border-box',

      backgroundRepeat:
        'no-repeat',

      backgroundSize:
        '100% 100%',

      isolation:
        'isolate',

      boxShadow: [
        `inset -1px 0 0 ${GRID_BORDER}`,
        `inset 0 -1px 0 ${GRID_BORDER}`
      ].join(', ')
    };
  };

  // Daily Total Footer

  const getDailyTotalFooterStyle =
    (): CSSProperties => {
      const backgroundColor =
        '#eff6ff';

      return {
        minWidth:
          DAILY_TOTAL_WIDTH,

        width:
          DAILY_TOTAL_WIDTH,

        maxWidth:
          DAILY_TOTAL_WIDTH,

        boxSizing:
          'border-box',

        position:
          'sticky',

        bottom:
          '0px',

        zIndex:
          210,

        backgroundColor,

        backgroundImage: `linear-gradient(
        ${backgroundColor},
        ${backgroundColor}
      )`,

        backgroundOrigin:
          'border-box',

        backgroundClip:
          'border-box',

        backgroundRepeat:
          'no-repeat',

        backgroundSize:
          '100% 100%',

        isolation:
          'isolate',

        boxShadow: [
          `inset -1px 0 0 ${GRID_BORDER}`,
          `inset 0 1px 0 ${GRID_BORDER}`,
          `inset 0 -1px 0 ${GRID_BORDER}`
        ].join(', ')
      };
    };

  // Empty Row Style

  const getEmptyRowStyle =
    (): CSSProperties => {
      return {
        boxSizing:
          'border-box',

        boxShadow: [
          `inset 2px 0 0 ${GRID_BORDER}`,
          `inset -1px 0 0 ${GRID_BORDER}`,
          `inset 0 -1px 0 ${GRID_BORDER}`
        ].join(', ')
      };
    };

  const resetExcelPreviewState = () => {
    excelWorkbook.value = null;

    excelSheetNames.value = [];

    selectedExcelSheet.value = '';

    excelPreviewHeaders.value = [];

    excelPreviewRows.value = [];

    dpmPreviewWarnings.value = [];

    excelPreviewError.value = '';

    isPreviewLoading.value = false;
  };

  const resetDpmSanitizedPdfState = () => {
    dpmSanitizedPdfs.value.forEach((file) => {
      URL.revokeObjectURL(file.url);
    });

    dpmSanitizedPdfs.value = [];
    activeDpmSanitizedPdfIndex.value = 0;
    dpmSanitizedPdfError.value = '';
    showDpmSanitizedPdfPreview.value = false;
  };

  const resetUploadRevisionDetection = () => {
    uploadRevisionDetectionSequence += 1;
    uploadRevision.value = '';
    uploadRevisionPlan.value = null;
    uploadRevisionConfirmed.value = false;
    isDetectingUploadRevision.value = false;
  };

  const resetFileValidationState = () => {
    resetUploadRevisionDetection();
    resetDpmSanitizedPdfState();

    filesChecked.value = false;

    fileCheckResults.value = [];

    validatedWorkbooks.value = [];

    activePreviewFileIndex.value = 0;

    resetExcelPreviewState();
  };

  excelPreviewSummary.value = {
    mode: 'ADM',
    customer: '',
    period: '',
    periodLabel: '',
    revision: '',
    regNo: '',
    dockCode: '',
    vendorCode: '',
    vendorName: '',
    vendorAddress: '',
    supplierCode: '',
    companyCode: '',
    totalRows: 0
  };

  excelPreviewForecastSummary.value = [];

  excelPreviewDetectedHeaderRow.value = 0;

  const resetSelectedFiles = () => {
    selectedFiles.value = [];

    resetFileValidationState();

    // Membuat input file baru, sehingga file yang sama dapat dipilih ulang.
    uploadInputKey.value += 1;
  };

  const validateCustomerBeforeChooseFile = (): boolean => {
    if (selectedCustomerUpload.value.trim() !== '') {
      return true;
    }

    notificationStore.showAlertWarning('Pilih customer terlebih dahulu sebelum memilih file MDFO');

    return false;
  };

  const getFileExtension = (fileName: string): string => {
    return fileName.split('.').pop()?.trim().toLowerCase() ?? '';
  };

  const resetFtiManualState = () => {
    ftiUploadMode.value = 'manual';
    ftiManualPeriod.value = '';
    ftiManualScheduleFile.value = null;
    ftiManualForecastFile.value = null;
    ftiManualRows.value = createDefaultFtiManualRows();
    ftiManualSourceRows.value = [];
    ftiManualSourceMismatches.value = [];
    ftiManualPartNameLookupCache.clear();
    ftiManualPartNameResolvingRows.value = {};
    isLoadingFtiManualSources.value = false;
    ftiManualSourceInputKey.value += 1;
  };

  const loadFtiPartOptions = async (): Promise<void> => {
    try {
      const response = await mdfoService.getFtiPartOptions();
      if (response.status !== 'success') {
        throw new Error(response.message || 'Master Part FTI tidak dapat diambil');
      }

      const merged = new Map<string, FtiPartOption>();
      [...FTI_REQUIRED_PARTS, ...(response.data ?? [])].forEach((item) => {
        const partNo = String(item.part_no ?? '').trim().toUpperCase();
        const partName = String(item.part_name ?? '').trim().toUpperCase();
        if (partNo === '' || partName === '') return;

        const current = merged.get(partNo);
        merged.set(partNo, {
          part_no: partNo,
          part_name: partName,
          required: item.required === true || current?.required === true
        });
      });

      ftiManualPartOptions.value = Array.from(merged.values()).sort(
        (first, second) => {
          if (first.required !== second.required) {
            return first.required ? -1 : 1;
          }
          return first.part_no.localeCompare(second.part_no, 'id', { numeric: true });
        }
      );
    } catch (error: unknown) {
      // Dua part wajib tetap tersedia sebagai fallback walaupun endpoint master gagal.
      ftiManualPartOptions.value = [...FTI_REQUIRED_PARTS];
      console.error('Master Part FTI gagal dimuat:', error);
    }
  };


  const resetMesManualState = () => {
    mesManualPeriod.value = '';
    mesManualRows.value = createDefaultMesManualRows();
    mesManualPartOptions.value = [...MES_REQUIRED_PARTS];
    mesManualPartNameLookupCache.clear();
    mesManualPartNameResolvingRows.value = {};
    showMesZsttModal.value = false;
    mesZsttBatchId.value = null;
    mesZsttPeriod.value = '';
    mesZsttRows.value = [];
  };

  const loadMesPartOptions = async (): Promise<void> => {
    try {
      const response = await mdfoService.getMesPartOptions();
      if (response.status !== 'success') {
        throw new Error(response.message || 'Master Part MES tidak dapat diambil');
      }
      const merged = new Map<string, FtiPartOption>();
      [...MES_REQUIRED_PARTS, ...(response.data ?? [])].forEach((item) => {
        const partNo = String(item.part_no ?? '').trim().toUpperCase();
        const partName = String(item.part_name ?? '').trim().toUpperCase();
        if (!partNo || !partName) return;
        const current = merged.get(partNo);
        merged.set(partNo, {
          part_no: partNo,
          part_name: partName,
          required: item.required === true || current?.required === true
        });
      });
      mesManualPartOptions.value = Array.from(merged.values()).sort((a, b) => {
        if (a.required !== b.required) return a.required ? -1 : 1;
        return a.part_no.localeCompare(b.part_no, 'id', { numeric: true });
      });
    } catch (error: unknown) {
      mesManualPartOptions.value = [...MES_REQUIRED_PARTS];
      console.error('Master Part MES gagal dimuat:', error);
    }
  };

  const mergeOneMesManualPartOption = (option: FtiPartOption): void => {
    const partNo = String(option.part_no ?? '').trim().toUpperCase();
    const partName = String(option.part_name ?? '').trim().toUpperCase();
    if (!partNo || !partName) return;
    const next = mesManualPartOptions.value.filter(
      (item) => item.part_no.trim().toUpperCase() !== partNo
    );
    next.push({ part_no: partNo, part_name: partName, required: option.required === true });
    mesManualPartOptions.value = next.sort((a, b) => {
      if (a.required !== b.required) return a.required ? -1 : 1;
      return a.part_no.localeCompare(b.part_no, 'id', { numeric: true });
    });
  };

  const isMesManualPartNameResolving = (rowId: string): boolean =>
    Boolean(mesManualPartNameResolvingRows.value[rowId]);

  const isMesManualPartNameReadonly = (rowId: string): boolean => {
    const row = mesManualRows.value.find((item) => item.id === rowId);
    if (!row || row.partNo.trim() === '') return false;
    return mesManualPartOptions.value.some(
      (item) => item.part_no.trim().toUpperCase() === row.partNo.trim().toUpperCase()
    );
  };

  const updateMesManualPartName = (rowId: string, value: string): void => {
    const row = mesManualRows.value.find((item) => item.id === rowId);
    if (!row || isMesManualPartNameReadonly(rowId)) return;
    row.partName = String(value ?? '').trimStart().toUpperCase();
  };

  const updateMesManualPartNo = async (rowId: string, value: string): Promise<void> => {
    const row = mesManualRows.value.find((item) => item.id === rowId);
    if (!row) return;
    const partNo = String(value ?? '').trim().toUpperCase();
    row.partNo = partNo;
    row.partName = '';
    if (!partNo) return;
    const option = mesManualPartOptions.value.find(
      (item) => item.part_no.trim().toUpperCase() === partNo
    );
    if (option) {
      row.partName = option.part_name;
      return;
    }
    const cached = mesManualPartNameLookupCache.get(partNo);
    if (cached !== undefined) {
      if (cached) {
        row.partName = cached.part_name;
        mergeOneMesManualPartOption(cached);
      }
      return;
    }
    mesManualPartNameResolvingRows.value[rowId] = partNo;
    try {
      const response = await mdfoService.resolveMesPartName(partNo);
      const latestRow = mesManualRows.value.find((item) => item.id === rowId);
      if (!latestRow || latestRow.partNo.trim().toUpperCase() !== partNo) return;
      if (response.status === 'success' && response.found && String(response.part_name ?? '').trim()) {
        const resolved: FtiPartOption = {
          part_no: partNo,
          part_name: String(response.part_name).trim().replace(/\s+/g, ' ').toUpperCase(),
          required: false
        };
        mesManualPartNameLookupCache.set(partNo, resolved);
        mergeOneMesManualPartOption(resolved);
        latestRow.partName = resolved.part_name;
      } else {
        mesManualPartNameLookupCache.set(partNo, null);
      }
    } catch (error) {
      console.error('Lookup Part Name MES gagal:', error);
      mesManualPartNameLookupCache.set(partNo, null);
    } finally {
      if (mesManualPartNameResolvingRows.value[rowId] === partNo) {
        delete mesManualPartNameResolvingRows.value[rowId];
      }
    }
  };

  const normalizeMesManualPoNumber = (value: unknown): string =>
    String(value ?? '').toUpperCase();

  const setMesManualPoNumber = (
    rowId: string,
    value: unknown
  ): void => {
    const rowIndex = mesManualRows.value.findIndex((item) => item.id === rowId);
    if (rowIndex < 0) return;

    const normalizedPoNumber = normalizeMesManualPoNumber(value);
    mesManualRows.value[rowIndex].poNumber = normalizedPoNumber;

    /*
     * Khusus MES, PO Number baris pertama menjadi nilai default bersama.
     * Format tidak dipaksa numeric/10 digit: contoh PO 8 karakter seperti
     * P0062855 tetap diterima.
     */
    if (rowIndex === 0) {
      mesManualRows.value.slice(1).forEach((row) => {
        row.poNumber = normalizedPoNumber;
      });
    }
  };

  const onMesManualPoNumberInput = (
    rowId: string,
    event: Event
  ): void => {
    const input = event.target as HTMLInputElement | null;
    if (!input) return;

    setMesManualPoNumber(rowId, input.value);
    const row = mesManualRows.value.find((item) => item.id === rowId);
    input.value = row?.poNumber ?? '';
  };

  const addMesManualRow = () => {
    const row = createMesManualRow();
    row.poNumber = mesManualRows.value[0]?.poNumber ?? '';
    mesManualRows.value.push(row);
  };
  const removeMesManualRow = (rowId: string) => {
    const row = mesManualRows.value.find((item) => item.id === rowId);
    if (!row || row.required) return;
    mesManualRows.value = mesManualRows.value.filter((item) => item.id !== rowId);
  };

  const normalizeOptionalMesQty = (value: FtiManualQty): number | null =>
    value === '' || value === null || value === undefined ? null : Number(value);

  const buildMesManualPayloadRows = (): MesManualRowPayload[] =>
    mesManualRows.value.map((row) => ({
      part_no: row.partNo.trim().toUpperCase(),
      part_name: row.partName.trim().toUpperCase(),
      n_qty: Number(row.n),
      n1_qty: normalizeOptionalMesQty(row.n1),
      n2_qty: normalizeOptionalMesQty(row.n2),
      n3_qty: normalizeOptionalMesQty(row.n3),
      po_number: row.poNumber.trim().toUpperCase(),
      po_date: row.poDate,
      delivery_date: row.deliveryDate
    }));

  const setMesManualPeriod = async (value: string): Promise<void> => {
    mesManualPeriod.value = String(value ?? '').trim();
    resetUploadRevisionDetection();
    if (mesManualPeriodCompact.value !== '') {
      await detectUploadRevision(false);
    }
  };

  const getMesZsttRowTotal = (row: MesZsttDraftRow): number =>
    mesZsttDayKeys.value.reduce((total, key) => {
      const value = row.daily[key];
      return total + (value === '' ? 0 : Number(value) || 0);
    }, 0);

  const getMesZsttRemaining = (row: MesZsttDraftRow): number =>
    row.targetQty - getMesZsttRowTotal(row);

  const isMesZsttValid = computed(() =>
    mesZsttRows.value.length > 0 &&
    mesZsttRows.value.every((row) => Math.abs(getMesZsttRemaining(row)) < 0.000001)
  );

  const openMesZsttFromRawRows = (
    batch: number,
    period: string,
    rawRows: Array<Record<string, unknown>>
  ): void => {
    mesZsttBatchId.value = batch;
    mesZsttPeriod.value = normalizePeriod(period);
    mesZsttRows.value = rawRows
      .map((row) => ({
        rawId: Number(row._id ?? 0),
        partNo: String(row.partNo ?? ''),
        partName: String(row.partName ?? ''),
        targetQty: Number(row.n ?? 0),
        daily: createMesDailyFromRawRow(row)
      }))
      .filter((row) => row.rawId > 0 && row.partNo !== '')
      .sort((first, second) => {
        const priority = getMesZsttPartPriority(first.partNo) - getMesZsttPartPriority(second.partNo);
        return priority !== 0
          ? priority
          : first.partNo.localeCompare(second.partNo, 'id', { numeric: true });
      });
    showMesZsttModal.value = true;
  };

  const mesZsttScopeBatchId = computed<number | null>(() => {
    if (!isMesMode.value) return null;
    const currentBatchId = Number(batchId.value ?? 0);
    if (currentBatchId > 0) return currentBatchId;

    const rowBatchIds = ntcRows.value
      .map((row) => Number(row._batchId ?? 0))
      .filter((value) => value > 0);
    return rowBatchIds.length > 0 ? Math.max(...rowBatchIds) : null;
  });

  const canOpenMesZsttEditor = computed(() =>
    isMesMode.value && Number(mesZsttScopeBatchId.value ?? 0) > 0
  );

  const openMesZsttEditor = async (): Promise<void> => {
    if (!requireUploadMdfoCreateOrUpdatePermission()) return;
    const selectedBatchId = Number(mesZsttScopeBatchId.value ?? 0);
    if (selectedBatchId <= 0) {
      notificationStore.showAlertWarning('Pilih customer, periode, dan revision MES terlebih dahulu.');
      return;
    }

    // Draft yang belum disubmit tetap dipertahankan saat popup ditutup.
    if (mesZsttBatchId.value === selectedBatchId && mesZsttRows.value.length > 0) {
      mesZsttRows.value = [...mesZsttRows.value].sort((first, second) => {
        const priority = getMesZsttPartPriority(first.partNo) - getMesZsttPartPriority(second.partNo);
        return priority !== 0
          ? priority
          : first.partNo.localeCompare(second.partNo, 'id', { numeric: true });
      });
      showMesZsttModal.value = true;
      return;
    }

    try {
      isLoadingMesZsttDraft.value = true;
      const response = await mdfoService.getMesZsttDraft(selectedBatchId);
      if (response.status !== 'success' || !Array.isArray(response.data)) {
        throw new Error(response.message || 'Draft ZSTT MES tidak ditemukan.');
      }
      openMesZsttFromRawRows(
        selectedBatchId,
        response.period || selectedPeriodFilter.value,
        response.data as unknown as Array<Record<string, unknown>>
      );
    } catch (error: unknown) {
      notificationStore.showAlertError(getErrorMessage(error, 'Gagal membuka input ZSTT MES'));
    } finally {
      isLoadingMesZsttDraft.value = false;
    }
  };

  const closeMesZsttModal = (): void => {
    if (isSubmittingMesZstt.value) return;
    showMesZsttModal.value = false;
  };

  const submitMesZstt = async (): Promise<void> => {
    if (!requireUploadMdfoCreateOrUpdatePermission()) return;
    const batch = mesZsttBatchId.value;
    if (!batch || !isMesZsttValid.value) {
      notificationStore.showAlertWarning(
        'Total Qty harian setiap Part MES harus sama dengan Qty N sebelum ZSTT dapat disimpan.'
      );
      return;
    }
    try {
      isSubmittingMesZstt.value = true;
      const payload: MesZsttDailyRowPayload[] = mesZsttRows.value.map((row) => ({
        raw_id: row.rawId,
        part_no: row.partNo,
        daily: mesZsttDayKeys.value.reduce((result, key) => {
          const value = row.daily[key];
          result[key] = value === '' ? 0 : Number(value) || 0;
          return result;
        }, {} as Partial<Record<MdfoDayKey, number | null>>)
      }));
      const response = await mdfoService.submitMesZstt(batch, payload);
      if (response.status !== 'success' || response.generation_success === false) {
        throw new Error(response.message || response.generation_error || 'Generate ZSTT MES gagal');
      }
      showMesZsttModal.value = false;
      const refreshTasks: Promise<void>[] = [];
      if (quotationSectionActivated.value) refreshTasks.push(loadQuotation());
      if (trackingSectionActivated.value) refreshTasks.push(loadQuotationTracking());
      await Promise.all(refreshTasks);
      notificationStore.showAlertSuccess(response.message || 'ZSTT MES dan Tracking berhasil dibuat');
    } catch (error: unknown) {
      notificationStore.showAlertError(getErrorMessage(error, 'ZSTT MES gagal disimpan'));
    } finally {
      isSubmittingMesZstt.value = false;
    }
  };

  const mergeFtiManualSourceOptions = (rows: FtiManualSourceRow[]) => {
    const merged = new Map<string, FtiPartOption>();
    ftiManualPartOptions.value.forEach((item) => {
      merged.set(item.part_no.trim().toUpperCase(), item);
    });

    rows.forEach((row) => {
      const partNo = String(row.part_no ?? '').trim().toUpperCase();
      const partName = String(row.part_name ?? '').trim().toUpperCase();
      if (partNo === '' || partName === '') return;

      const current = merged.get(partNo);
      merged.set(partNo, {
        part_no: partNo,
        part_name: partName,
        required: current?.required === true
      });
    });

    ftiManualPartOptions.value = Array.from(merged.values());
  };

  const mergeOneFtiManualPartOption = (option: FtiPartOption) => {
    const partNo = String(option.part_no ?? '').trim().toUpperCase();
    const partName = String(option.part_name ?? '')
      .trim()
      .replace(/\s+/g, ' ')
      .toUpperCase();

    if (partNo === '' || partName === '') return;

    const existingIndex = ftiManualPartOptions.value.findIndex(
      (item) => item.part_no.trim().toUpperCase() === partNo
    );

    if (existingIndex >= 0) {
      const existing = ftiManualPartOptions.value[existingIndex];
      ftiManualPartOptions.value[existingIndex] = {
        part_no: partNo,
        part_name: partName,
        required: existing.required === true || option.required === true
      };
      return;
    }

    ftiManualPartOptions.value.push({
      part_no: partNo,
      part_name: partName,
      required: option.required === true
    });
  };

  const isFtiManualPartNameResolving = (rowId: string): boolean =>
    String(ftiManualPartNameResolvingRows.value[rowId] ?? '') !== '';

  const isFtiManualPartNameReadonly = (rowId: string): boolean => {
    const row = ftiManualRows.value.find((item) => item.id === rowId);
    if (!row) return true;

    const partNo = row.partNo.trim().toUpperCase();
    if (partNo === '' || row.required || isFtiManualPartNameResolving(rowId)) {
      return true;
    }

    return ftiManualPartOptions.value.some(
      (item) => item.part_no.trim().toUpperCase() === partNo
    );
  };

  const updateFtiManualPartName = (rowId: string, value: string) => {
    const row = ftiManualRows.value.find((item) => item.id === rowId);
    if (!row || isFtiManualPartNameReadonly(rowId)) return;

    row.partName = String(value ?? '')
      .trim()
      .replace(/\s+/g, ' ')
      .toUpperCase();
  };

  const updateFtiManualPartNo = async (
    rowId: string,
    value: string
  ): Promise<void> => {
    const row = ftiManualRows.value.find((item) => item.id === rowId);
    if (!row) return;

    const partNo = String(value ?? '').trim().toUpperCase();
    row.partNo = partNo;
    row.partName = '';

    if (partNo === '') {
      return;
    }

    const option = ftiManualPartOptions.value.find(
      (item) => item.part_no.trim().toUpperCase() === partNo
    );

    if (option) {
      row.partName = option.part_name;
    } else {
      const cached = ftiManualPartNameLookupCache.get(partNo);

      if (cached !== undefined) {
        if (cached) {
          row.partName = cached.part_name;
          mergeOneFtiManualPartOption(cached);
        }
      } else {
        ftiManualPartNameResolvingRows.value[rowId] = partNo;

        try {
          const response = await mdfoService.resolveFtiPartName(partNo);

          const latestRow = ftiManualRows.value.find(
            (item) => item.id === rowId
          );

          if (!latestRow || latestRow.partNo.trim().toUpperCase() !== partNo) {
            return;
          }

          if (
            response.status === 'success' &&
            response.found === true &&
            String(response.part_name ?? '').trim() !== ''
          ) {
            const resolvedOption: FtiPartOption = {
              part_no: partNo,
              part_name: String(response.part_name)
                .trim()
                .replace(/\s+/g, ' ')
                .toUpperCase(),
              required: false
            };

            ftiManualPartNameLookupCache.set(partNo, resolvedOption);
            mergeOneFtiManualPartOption(resolvedOption);
            latestRow.partName = resolvedOption.part_name;
          } else {
            // Tidak ditemukan di FTI maupun customer lain: user boleh isi manual.
            ftiManualPartNameLookupCache.set(partNo, null);
          }
        } catch (error: unknown) {
          /*
           * Lookup hanya bantuan. Jika API lookup gagal, jangan blok input;
           * user tetap dapat mengisi Part Name secara manual.
           */
          console.error('Lookup Part Name lintas customer gagal:', error);
          ftiManualPartNameLookupCache.set(partNo, null);
        } finally {
          if (ftiManualPartNameResolvingRows.value[rowId] === partNo) {
            delete ftiManualPartNameResolvingRows.value[rowId];
          }
        }
      }
    }

    if (ftiManualForecastLocked.value) {
      const source = ftiManualSourceRows.value.find(
        (item) => String(item.part_no ?? '').trim().toUpperCase() === row.partNo
      );

      if (source) {
        row.n1 = source.n1_qty === null || source.n1_qty === undefined ? '' : Number(source.n1_qty);
        row.n2 = source.n2_qty === null || source.n2_qty === undefined ? '' : Number(source.n2_qty);
        row.n3 = source.n3_qty === null || source.n3_qty === undefined ? '' : Number(source.n3_qty);
      }
    }
  };

  const addFtiManualRow = () => {
    const row = createFtiManualRow();
    row.poNumber = normalizeFtiManualPoNumber(ftiManualRows.value[0]?.poNumber ?? '');
    ftiManualRows.value.push(row);
  };

  const removeFtiManualRow = (rowId: string) => {
    const row = ftiManualRows.value.find((item) => item.id === rowId);
    if (!row || row.required) return;
    ftiManualRows.value = ftiManualRows.value.filter((item) => item.id !== rowId);
  };

  const normalizeOptionalFtiQty = (value: FtiManualQty): number | null =>
    value === '' || value === null || value === undefined ? null : Number(value);

  const buildFtiManualPayloadRows = (): FtiManualRowPayload[] =>
    ftiManualRows.value.map((row) => ({
      part_no: row.partNo.trim().toUpperCase(),
      part_name: row.partName.trim().toUpperCase(),
      n_qty: Number(row.n),
      n1_qty: normalizeOptionalFtiQty(row.n1),
      n2_qty: normalizeOptionalFtiQty(row.n2),
      n3_qty: normalizeOptionalFtiQty(row.n3),
      po_number: normalizeFtiManualPoNumber(row.poNumber),
      po_date: row.poDate,
      delivery_date: row.deliveryDate
    }));

  const applyFtiManualForecastRows = (sourceRows: FtiManualSourceRow[]) => {
    const byPart = new Map(
      sourceRows.map((row) => [
        String(row.part_no ?? '').trim().toUpperCase(),
        row
      ])
    );

    ftiManualRows.value.forEach((row) => {
      const source = byPart.get(row.partNo.trim().toUpperCase());
      if (!source) return;

      const sourcePartName = String(source.part_name ?? '').trim().toUpperCase();
      if (sourcePartName !== '') {
        row.partName = sourcePartName;
      }

      if (ftiManualForecastLocked.value) {
        row.n1 = source.n1_qty === null || source.n1_qty === undefined ? '' : Number(source.n1_qty);
        row.n2 = source.n2_qty === null || source.n2_qty === undefined ? '' : Number(source.n2_qty);
        row.n3 = source.n3_qty === null || source.n3_qty === undefined ? '' : Number(source.n3_qty);
      }
    });
  };

  const refreshFtiManualSources = async (
    showMessage = false
  ): Promise<boolean> => {
    if (!isFtiManualMode.value) return false;

    /*
     * Schedule tetap wajib, tetapi Bulan MDFO belum harus dipilih untuk
     * membaca nilai Forecast. Backend boleh memakai periode yang terdeteksi
     * dari Excel hanya untuk preview N+1..N+3. Bulan form tetap wajib dipilih
     * user sebelum Preview/Submit final.
     */
    if (!ftiManualScheduleFile.value) {
      ftiManualSourceRows.value = [];
      ftiManualSourceMismatches.value = [];
      return false;
    }

    try {
      isLoadingFtiManualSources.value = true;
      const response = await mdfoService.previewFtiManualSources(
        ftiManualSourceFiles.value,
        ftiManualPeriodCompact.value
      );

      if (response.status !== 'success') {
        throw new Error(response.message || 'Source Excel FTI tidak dapat dibaca');
      }

      ftiManualSourceRows.value = response.rows ?? [];
      ftiManualSourceMismatches.value = response.mismatches ?? [];
      mergeFtiManualSourceOptions(ftiManualSourceRows.value);
      applyFtiManualForecastRows(ftiManualSourceRows.value);

      if (showMessage) {
        const forecastText = response.forecast_locked
          ? 'Forecast terdeteksi; N+1 sampai N+3 dikunci dari file Forecast.'
          : 'Forecast tidak dipilih; N+1 sampai N+3 dapat diisi manual.';
        notificationStore.showAlertSuccess(
          `Schedule FTI berhasil dibaca. ${forecastText}`
        );
      }

      if ((response.mismatches ?? []).length > 0) {
        notificationStore.showDialogWarning(
          'Periksa Source FTI',
          response.mismatches
            .slice(0, 8)
            .map((item) => `• ${item.message}`)
            .join('\n')
        );
      }

      return true;
    } catch (error: unknown) {
      ftiManualSourceRows.value = [];
      ftiManualSourceMismatches.value = [];
      notificationStore.showAlertError(
        getErrorMessage(error, 'Gagal membaca Schedule/Forecast FTI')
      );
      return false;
    } finally {
      isLoadingFtiManualSources.value = false;
    }
  };

  const setFtiManualPeriod = async (value: string): Promise<void> => {
    ftiManualPeriod.value = String(value ?? '').trim();
    resetUploadRevisionDetection();

    if (ftiManualPeriodCompact.value === '') {
      return;
    }

    await detectUploadRevision(false);

    if (ftiManualScheduleFile.value) {
      await refreshFtiManualSources(false);
    }
  };

  const onFtiManualScheduleFileChange = async (event: Event): Promise<void> => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    if (!file) return;

    const extension = getFileExtension(file.name);
    if (!['xlsx', 'xls'].includes(extension)) {
      notificationStore.showAlertWarning('Schedule FTI harus menggunakan XLSX atau XLS');
      return;
    }

    ftiManualScheduleFile.value = file;
    resetExcelPreviewState();

    // Langsung baca Schedule/Forecast walaupun Bulan MDFO belum dipilih.
    await refreshFtiManualSources(true);
  };

  const onFtiManualForecastFileChange = async (event: Event): Promise<void> => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    if (!file) return;

    const extension = getFileExtension(file.name);
    if (!['xlsx', 'xls'].includes(extension)) {
      notificationStore.showAlertWarning('Forecast FTI harus menggunakan XLSX atau XLS');
      return;
    }

    ftiManualForecastFile.value = file;
    resetExcelPreviewState();

    // Begitu Forecast dipilih dan Schedule tersedia, isi N+1..N+3 langsung
    // dari Excel. Field menjadi readonly setelah data Forecast benar terbaca.
    if (ftiManualScheduleFile.value) {
      await refreshFtiManualSources(true);
    }
  };

  const clearFtiManualScheduleFile = () => {
    ftiManualScheduleFile.value = null;
    ftiManualSourceRows.value = [];
    ftiManualSourceMismatches.value = [];
    resetExcelPreviewState();
    ftiManualSourceInputKey.value += 1;
  };

  const clearFtiManualForecastFile = async () => {
    ftiManualForecastFile.value = null;
    ftiManualSourceRows.value = [];
    ftiManualSourceMismatches.value = [];
    resetExcelPreviewState();
    ftiManualSourceInputKey.value += 1;

    if (ftiManualScheduleFile.value && ftiManualPeriodCompact.value !== '') {
      await refreshFtiManualSources(false);
    }
  };

  const setFtiUploadMode = async (mode: FtiUploadMode): Promise<void> => {
    if (ftiUploadMode.value === mode) return;

    ftiUploadMode.value = mode;
    resetUploadRevisionDetection();
    resetExcelPreviewState();
    showMdfoUploadPreview.value = false;

    if (mode === 'manual') {
      await loadFtiPartOptions();
      if (ftiManualPeriodCompact.value !== '') {
        await detectUploadRevision(false);
      }
    } else if (selectedFiles.value.length > 0) {
      // OCR lama tetap memakai validasi 1 PDF + 2 Excel.
      await checkSelectedFiles();
    }
  };

  const validateMdfoFileList = (
    files: File[]
  ): {
    validFiles: File[];
    errors: string[];
  } => {
    const validFiles: File[] = [];

    const errors: string[] = [];

    const fileKeys = new Set<string>();

    const normalizedUploadCustomer =
      selectedCustomerUpload.value
        .trim()
        .toUpperCase();

    const isTmminUpload =
      normalizedUploadCustomer === 'TMMIN';

    const isNtcUpload =
      normalizedUploadCustomer === 'NTC';

    const isGayaUpload =
      normalizedUploadCustomer === 'GAYA MOTOR' ||
      normalizedUploadCustomer === 'GAYA MTR';

    const isDpmUpload =
      normalizedUploadCustomer === 'DPM';

    const isFtiUpload =
      normalizedUploadCustomer === 'FTI';


    const isAsiAdmUpload =
      normalizedUploadCustomer === 'ASI ADM';

    if (files.length > MAX_MDFO_UPLOAD_FILES) {
      errors.push(
        `Maksimal ${MAX_MDFO_UPLOAD_FILES} file dalam satu upload MDFO.`
      );
      return { validFiles, errors };
    }

    const totalUploadSize = files.reduce(
      (total, file) => total + Math.max(0, Number(file.size) || 0),
      0
    );

    if (totalUploadSize > MAX_MDFO_TOTAL_SIZE) {
      errors.push('Total ukuran upload MDFO maksimal 80 MB.');
      return { validFiles, errors };
    }

    if (isTmminUpload && files.length > 2) {
      errors.push(
        'Customer TMMIN hanya dapat upload maksimal 2 file sekaligus: satu T034 dan satu TMAJ'
      );

      return {
        validFiles,
        errors
      };
    }

    if (isNtcUpload && files.length > 2) {
      errors.push(
        'Customer NTC maksimal 2 file CSV sekaligus (NTC1 dan NTC2), atau 1 workbook Excel yang berisi keduanya'
      );

      return {
        validFiles,
        errors
      };
    }

    if (isFtiUpload && files.length > 3) {
      errors.push(
        'Customer FTI wajib tepat 3 file: 1 PDF Purchase Order, 1 Excel Forecast, dan 1 Excel Schedule'
      );

      return {
        validFiles,
        errors
      };
    }

    files.forEach((file) => {
      const extension = getFileExtension(file.name);

      if (isAsiAdmUpload && extension !== 'xls') {
        errors.push(
          `${file.name}: Raw MDFO ASI ADM harus menggunakan format XLS`
        );
        return;
      }

      const allowedExtensions =
        isDpmUpload
          ? ALLOWED_DPM_MDFO_EXTENSIONS
          : isFtiUpload
            ? ALLOWED_FTI_MDFO_EXTENSIONS
          : isNtcUpload
          ? ALLOWED_NTC_MDFO_EXTENSIONS
          : isGayaUpload
            ? ALLOWED_GAYA_MDFO_EXTENSIONS
            : ALLOWED_MDFO_EXTENSIONS;

      if (!allowedExtensions.has(extension)) {
        errors.push(
          isDpmUpload
            ? `${file.name}: format DPM harus PDF, ZIP, RAR, atau 7Z`
            : isFtiUpload
              ? `${file.name}: format FTI harus PDF, XLSX, atau XLS`
            : isNtcUpload
            ? `${file.name}: format NTC harus CSV, XLSX, atau XLS`
            : isGayaUpload
              ? `${file.name}: format Gaya Motor harus CSV, XLSX, atau XLS`
              : `${file.name}: format file harus XLSX atau XLS`
        );

        return;
      }

      if (file.size <= 0) {
        errors.push(`${file.name}: file kosong atau rusak`);

        return;
      }

      if (file.size > MAX_MDFO_FILE_SIZE) {
        errors.push(`${file.name}: ukuran file melebihi 25 MB`);

        return;
      }

      const fileKey = [file.name.trim().toLowerCase(), file.size, file.lastModified].join('|');

      if (fileKeys.has(fileKey)) {
        errors.push(`${file.name}: file terpilih lebih dari satu kali`);

        return;
      }

      fileKeys.add(fileKey);

      validFiles.push(file);
    });

    return {
      validFiles,
      errors
    };
  };

  const readExcelWorkbook = async (file: File): Promise<XLSX.WorkBook> => {
    const arrayBuffer = await file.arrayBuffer();

    return XLSX.read(arrayBuffer, {
      type: 'array',
      cellDates: true
    });
  };

  const hasCellValue = (value: ExcelCell): boolean => {
    if (value === null || value === undefined) {
      return false;
    }

    return String(value).trim() !== '';
  };

  const getNonEmptySheetNames = (workbook: XLSX.WorkBook): string[] => {
    return workbook.SheetNames.filter((sheetName) => {
      const worksheet = workbook.Sheets[sheetName];

      if (!worksheet) {
        return false;
      }

      // !ref menandakan sheet mempunyai area data yang digunakan.
      return Boolean(worksheet['!ref']);
    });
  };

  // For ADM P5, reject TMMIN/TMMIIN files while keeping TMMIN customer uploads valid.
  const findForbiddenAdmP5TmminFromWorkbook = (
    workbook: XLSX.WorkBook
  ): string => {
    for (const sheetName of workbook.SheetNames) {
      const worksheet =
        workbook.Sheets[sheetName];

      if (!worksheet) {
        continue;
      }

      const rows =
        XLSX.utils.sheet_to_json<
          ExcelCell[]
        >(
          worksheet,
          {
            header: 1,
            defval: '',
            blankrows: false
          }
        );

      for (const row of rows) {
        for (const cell of row) {
          const originalValue =
            String(
              cell ?? ''
            ).trim();

          if (!originalValue) {
            continue;
          }

          const normalizedValue =
            originalValue
              .toUpperCase()
              .replace(/\s+/g, '');

          // Match: TMMIN TMMIIN K5TMMIN_ K5TMMIIN_
          if (
            /TMMI+N/.test(
              normalizedValue
            )
          ) {
            return originalValue;
          }
        }
      }
    }

    return '';
  };

  const validateAdmP5TmminFromWorkbook = (
    workbook: XLSX.WorkBook,
    customer: string
  ): void => {
    const normalizedCustomer =
      String(
        customer ?? ''
      )
        .trim()
        .toUpperCase();

    // Hanya ADM P5.
    if (
      normalizedCustomer !==
      'ADM P5'
    ) {
      return;
    }

    const forbiddenValue =
      findForbiddenAdmP5TmminFromWorkbook(
        workbook
      );

    if (!forbiddenValue) {
      return;
    }

    throw new Error(
      [
        'Upload ditolak.',
        'File TMMIN/TMMIIN tidak boleh diupload sebagai ADM P5.',
        `Ditemukan: ${forbiddenValue}`
      ].join(' ')
    );
  };

  const getExpectedAdmPlantCode = (
    customer: string
  ): AdmPlantCode | null => {
    const normalizedCustomer =
      String(customer ?? '')
        .trim()
        .toUpperCase();

    // Plant 1
    if (
      normalizedCustomer ===
      'ADM P1'
    ) {
      return 'D101';
    }

    // Plant 4 Pakai startsWith supaya tetap aman apabila label customer nanti menjadi: ADM P4 ADM P4 (SAP & DCWA) ADM P4 (...)
    if (
      normalizedCustomer.startsWith(
        'ADM P4'
      )
    ) {
      return 'D104';
    }

    if (normalizedCustomer === 'ADM P5') {
      return 'D105';
    }

    // Customer lain tidak diperiksa menggunakan aturan ADM plant.
    return null;
  };

  const validateTmminWorkbook = (
    workbook: XLSX.WorkBook
  ): TmminSupplierCode => {
    const normalizedHeader = (value: unknown): string => {
      return String(value ?? '')
        .trim()
        .toUpperCase()
        .replace(/[\r\n\t ]+/g, '');
    };

    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];

      if (!worksheet) {
        continue;
      }

      const sheetRows = XLSX.utils.sheet_to_json<ExcelCell[]>(
        worksheet,
        {
          header: 1,
          defval: '',
          blankrows: false
        }
      );

      const headerRowIndex = sheetRows.findIndex((row) => {
        const headers = row.map(normalizedHeader);

        return (
          headers.includes('D_ID') &&
          headers.includes('PART_NO') &&
          headers.includes('DOCK_CD') &&
          headers.includes('SUPPLIER_CD')
        );
      });

      if (headerRowIndex < 0) {
        continue;
      }

      const headerRow = sheetRows[headerRowIndex] || [];
      const headers = headerRow.map(normalizedHeader);

      const nonEmptyHeaderCount = headers.filter(Boolean).length;

      if (nonEmptyHeaderCount !== 107) {
        throw new Error(
          `Format TMMIN harus memiliki 107 kolom mentahan (A sampai DC). Terbaca ${nonEmptyHeaderCount} kolom.`
        );
      }

      const supplierIndex = headers.indexOf('SUPPLIER_CD');
      const partIndex = headers.indexOf('PART_NO');

      if (supplierIndex < 0 || partIndex < 0) {
        throw new Error(
          'Kolom SUPPLIER_CD atau PART_NO TMMIN tidak ditemukan'
        );
      }

      const supplierCodes = new Set<string>();
      let hasData = false;

      sheetRows
        .slice(headerRowIndex + 1)
        .forEach((row) => {
          const partNo = String(row[partIndex] ?? '').trim();

          if (partNo === '') {
            return;
          }

          hasData = true;

          const supplierCode = String(
            row[supplierIndex] ?? ''
          )
            .trim()
            .toUpperCase();

          if (supplierCode !== '') {
            supplierCodes.add(supplierCode);
          }
        });

      if (!hasData) {
        throw new Error(
          'File TMMIN tidak memiliki data PART_NO'
        );
      }

      if (supplierCodes.size !== 1) {
        throw new Error(
          'Satu file TMMIN harus berisi tepat satu SUPPLIER_CD'
        );
      }

      const supplierCode = Array.from(supplierCodes)[0];

      if (
        supplierCode !== 'T034' &&
        supplierCode !== 'TMAJ'
      ) {
        throw new Error(
          `SUPPLIER_CD TMMIN hanya boleh T034 atau TMAJ. Terbaca ${supplierCode}`
        );
      }

      return supplierCode as TmminSupplierCode;
    }

    throw new Error(
      'Header TMMIN tidak ditemukan. Pastikan file berisi D_ID, PART_NO, DOCK_CD, dan SUPPLIER_CD.'
    );
  };


  const validateNtcWorkbook = (
    workbook: XLSX.WorkBook
  ): void => {
    const compactHeader = (value: unknown): string => {
      return String(value ?? '')
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');
    };

    const requiredHeaders = [
      'NO',
      'KBNCODE',
      'PARTNO',
      'PROCESSORDER',
      'PCSM',
      'PCSD',
      'BOXTYPE',
      'QTYBOX',
      'KANBANDAY',
      'MODEL'
    ];

    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];

      if (!worksheet) {
        continue;
      }

      const sheetRows = XLSX.utils.sheet_to_json<ExcelCell[]>(
        worksheet,
        {
          header: 1,
          defval: '',
          blankrows: false
        }
      );

      const headerRowIndex = sheetRows.findIndex((row) => {
        const headers = row.map(compactHeader);

        return requiredHeaders.every(
          (header) => headers.includes(header)
        );
      });

      if (headerRowIndex < 0) {
        continue;
      }

      const headers =
        (sheetRows[headerRowIndex] || [])
          .map(compactHeader);

      const partNoIndex = headers.indexOf('PARTNO');
      const kanbanDayIndex = headers.indexOf('KANBANDAY');
      const modelIndex = headers.indexOf('MODEL');

      if (
        partNoIndex < 0 ||
        kanbanDayIndex < 0 ||
        modelIndex < 0 ||
        modelIndex - kanbanDayIndex < 4
      ) {
        throw new Error(
          'Format NTC tidak lengkap. Pastikan ada 3 kolom forecast di antara KANBAN / DAY dan MODEL.'
        );
      }

      const hasData = sheetRows
        .slice(headerRowIndex + 1)
        .some((row) => {
          return String(
            row[partNoIndex] ?? ''
          ).trim() !== '';
        });

      if (!hasData) {
        throw new Error(
          'File NTC tidak memiliki data PART NO.'
        );
      }

      return;
    }

    throw new Error(
      'Header NTC tidak ditemukan. Kolom wajib: NO., KBN CODE, PART NO., PROCESS ORDER, PCS / M, PCS / D, BOX TYPE, QTY / BOX, KANBAN / DAY, 3 bulan forecast, dan MODEL.'
    );
  };


  const validateGayaWorkbook = (
    workbook: XLSX.WorkBook
  ): void => {
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];

      if (!worksheet) {
        continue;
      }

      const sheetRows = XLSX.utils.sheet_to_json<ExcelCell[]>(
        worksheet,
        {
          header: 1,
          defval: '',
          blankrows: false
        }
      );

      const headerRowIndex = sheetRows.findIndex((row) => {
        const a = String(row[0] ?? '').trim().toUpperCase();
        const b = String(row[1] ?? '').trim().toUpperCase();
        const e = String(row[4] ?? '').trim().toUpperCase();
        const f = String(row[5] ?? '').trim().toUpperCase();

        return (
          a === 'NO' &&
          b.includes('NO PART') &&
          e.includes('NO JOB') &&
          f.includes('PART NAME')
        );
      });

      if (headerRowIndex < 0) {
        continue;
      }

      const hasData = sheetRows
        .slice(headerRowIndex + 1)
        .some((row) => {
          return (
            Number.isFinite(Number(row[0])) &&
            Number(row[0]) > 0 &&
            String(row[1] ?? '').trim() !== ''
          );
        });

      if (!hasData) {
        throw new Error(
          'File Gaya Motor tidak memiliki data NO dan NO PART.'
        );
      }

      return;
    }

    throw new Error(
      'Header Gaya Motor tidak ditemukan. Pastikan ada kolom NO, NO PART, NO JOB, dan PART NAME mulai sekitar baris 10.'
    );
  };

  const validateAsiAdmWorkbook = (
    workbook: XLSX.WorkBook
  ): void => {
    const nonEmptySheets = getNonEmptySheetNames(workbook);

    if (nonEmptySheets.length === 0) {
      throw new Error('Workbook ASI ADM tidak mempunyai sheet data.');
    }

    const worksheet = workbook.Sheets[nonEmptySheets[0]];
    const matrix = XLSX.utils.sheet_to_json<ExcelCell[]>(
      worksheet,
      { header: 1, defval: '', blankrows: false, raw: true }
    );

    const hasRequiredHeader = matrix.some((row) => {
      const tokens = row.map(compactPreviewToken);
      return (
        tokens.includes('PARTNO') &&
        tokens.includes('PARTNAME') &&
        tokens.includes('QTYKANBAN')
      );
    });

    if (!hasRequiredHeader) {
      throw new Error(
        'Format ASI ADM tidak sesuai. Header Part No, Part Name, dan Qty / Kanban tidak ditemukan.'
      );
    }

    const asiMarker = matrix
      .slice(0, 12)
      .flat()
      .map((value) => String(value ?? '').toUpperCase())
      .join(' ');

    if (!asiMarker.includes('ASI-MPC')) {
      throw new Error(
        'File tidak terdeteksi sebagai ASI ADM. Reg No ASI-MPC tidak ditemukan.'
      );
    }
  };

  const confirmDetectedUploadRevision = (
    message: string
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      let resolved = false;

      const finish = (value: boolean) => {
        if (resolved) return;
        resolved = true;
        uploadRevisionConfirmed.value = value;
        resolve(value);
      };

      notificationStore.showConfirm(
        'Revision MDFO Terdeteksi',
        message,
        () => finish(true),
        () => finish(false),
        'Lanjut',
        'Batal'
      );
    });
  };

  const detectUploadRevision = async (
    showConfirmation = true
  ): Promise<boolean> => {
    const customer = selectedCustomerUpload.value.trim();

    const manualFti = isFtiManualMode.value;
    const manualMes = isMesManualMode.value;

    if (
      customer === '' ||
      (manualFti && ftiManualPeriodCompact.value === '') ||
      (manualMes && mesManualPeriodCompact.value === '') ||
      (!manualFti && !manualMes && selectedFiles.value.length === 0)
    ) {
      resetUploadRevisionDetection();
      return false;
    }

    const requestSequence = ++uploadRevisionDetectionSequence;
    isDetectingUploadRevision.value = true;
    uploadRevisionConfirmed.value = false;
    uploadRevisionPlan.value = null;
    uploadRevision.value = '';

    try {
      const response = manualMes
        ? await mdfoService.detectMesManualRevision(mesManualPeriodCompact.value)
        : manualFti
          ? await mdfoService.detectFtiManualRevision(ftiManualPeriodCompact.value)
          : await mdfoService.detectRevision(
          selectedFiles.value,
          customer
        );

      if (requestSequence !== uploadRevisionDetectionSequence) {
        return false;
      }

      if (response.status !== 'success') {
        throw new Error(
          response.message ||
          'Revision MDFO tidak dapat dideteksi'
        );
      }

      uploadRevisionPlan.value = response;

      if (response.revision !== null && response.revision !== undefined) {
        uploadRevision.value = String(response.revision);
      }

      if (!response.can_upload) {
        uploadRevisionConfirmed.value = false;
        notificationStore.showDialogWarning(
          'Revision MDFO',
          response.warning ||
          'Revision MDFO belum memenuhi urutan upload.'
        );
        return false;
      }

      if (!/^\d+$/.test(normalizedUploadRevision.value)) {
        throw new Error('Revision MDFO hasil deteksi tidak valid');
      }

      if (!showConfirmation) {
        uploadRevisionConfirmed.value = true;
        return true;
      }

      const message =
        String(response.confirmation_message ?? '').trim() ||
        `File akan disimpan sebagai Revision ${normalizedUploadRevision.value}. Apakah Anda yakin ingin melanjutkan?`;

      return await confirmDetectedUploadRevision(message);
    } catch (error: unknown) {
      if (requestSequence !== uploadRevisionDetectionSequence) {
        return false;
      }

      uploadRevision.value = '';
      uploadRevisionPlan.value = null;
      uploadRevisionConfirmed.value = false;

      const duplicateFiles = getPlant4DuplicateFilesFromError(error);
      if (duplicateFiles.length > 0) {
        notificationStore.showDialogWarning(
          'Duplikat Part Number MDFO P4',
          buildPlant4DuplicateWarningHtml(duplicateFiles)
        );
        return false;
      }

      notificationStore.showAlertError(
        getErrorMessage(
          error,
          'Gagal mendeteksi Revision MDFO'
        )
      );

      return false;
    } finally {
      if (requestSequence === uploadRevisionDetectionSequence) {
        isDetectingUploadRevision.value = false;
      }
    }
  };

  const checkSelectedFiles = async (): Promise<boolean> => {
    // Validasi Customer
    if (!validateCustomerBeforeChooseFile()) {
      return false;
    }

    // Validasi File Terpilih
    if (selectedFiles.value.length === 0) {
      notificationStore.showAlertWarning(
        'Pilih minimal satu file MDFO'
      );

      return false;
    }

    if (
      selectedCustomerUpload.value.trim().toUpperCase() === 'FTI' &&
      !isFtiUploadSetComplete.value
    ) {
      const extensions = selectedFiles.value.map((file) =>
        getFileExtension(file.name)
      );
      const pdfCount = extensions.filter((extension) => extension === 'pdf').length;
      const excelCount = extensions.filter(
        (extension) => extension === 'xlsx' || extension === 'xls'
      ).length;

      notificationStore.showAlertWarning(
        `Upload FTI belum lengkap. Wajib 1 PDF dan 2 Excel; saat ini ${pdfCount} PDF dan ${excelCount} Excel.`
      );

      return false;
    }

    // Avoid duplicate file validation requests.
    if (isCheckingFiles.value) {
      return false;
    }

    isCheckingFiles.value = true;

    // Reset the previous file validation state.
    filesChecked.value = false;

    fileCheckResults.value = [];

    validatedWorkbooks.value = [];

    resetExcelPreviewState();

    try {
      const checkResults: MdfoFileCheckResult[] = [];

      const workbooks: Array<
        XLSX.WorkBook | null
      > = [];

      const tmminSupplierCodes = new Set<string>();

      // Periksa Satu Per Satu File
      for (
        const file
        of selectedFiles.value
      ) {
        try {
          const normalizedUploadCustomer =
            selectedCustomerUpload.value
              .trim()
              .toUpperCase();

          // Parser DPM berjalan di backend. Browser hanya memvalidasi jenis,
          // ukuran, dan duplikasi file sebelum upload.
          if (normalizedUploadCustomer === 'DPM') {
            workbooks.push(null);
            checkResults.push({
              name: file.name,
              valid: true,
              message: 'File DPM siap divalidasi oleh server saat preview/upload'
            });
            continue;
          }

          if (normalizedUploadCustomer === 'FTI') {
            workbooks.push(null);
            checkResults.push({
              name: file.name,
              valid: true,
              message: 'File FTI siap dicocokkan bersama 2 file lainnya saat preview'
            });
            continue;
          }

          // Membaca workbook.
          const workbook =
            await readExcelWorkbook(file);

          // Workbook harus punya sheet.
          if (
            workbook.SheetNames.length === 0
          ) {
            throw new Error(
              'Workbook tidak memiliki sheet'
            );
          }

          const nonEmptySheets =
            getNonEmptySheetNames(
              workbook
            );

          if (
            nonEmptySheets.length === 0
          ) {
            throw new Error(
              'Workbook tidak memiliki sheet yang berisi data'
            );
          }

          if (normalizedUploadCustomer === 'TMMIN') {
            const supplierCode = validateTmminWorkbook(
              workbook
            );

            if (tmminSupplierCodes.has(supplierCode)) {
              throw new Error(
                `Supplier ${supplierCode} dipilih lebih dari satu file. Pilih maksimal satu T034 dan satu TMAJ.`
              );
            }

            tmminSupplierCodes.add(supplierCode);
          } else if (normalizedUploadCustomer === 'NTC') {
            validateNtcWorkbook(workbook);
          } else if (
            normalizedUploadCustomer === 'GAYA MOTOR' ||
            normalizedUploadCustomer === 'GAYA MTR'
          ) {
            validateGayaWorkbook(workbook);
          } else if (normalizedUploadCustomer === 'ASI ADM') {
            validateAsiAdmWorkbook(workbook);
          } else {
            // ADM P5 tidak boleh menerima TMMIN/TMMIIN.
            validateAdmP5TmminFromWorkbook(
              workbook,
              selectedCustomerUpload.value
            );

            validateAdmPlantFromWorkbook(
              workbook,
              selectedCustomerUpload.value
            );
          }

          // Jangan mempertahankan seluruh workbook hasil parse di memory browser.
          // Preview membaca ulang hanya file yang dipilih, sehingga upload banyak
          // workbook tidak menumpuk object XLSX besar secara bersamaan.
          workbooks.push(null);

          checkResults.push({
            name: file.name,
            valid: true,
            message:
              'File valid dan dapat dibaca'
          });
        } catch (
        error: unknown
        ) {
          console.error(
            `Validasi MDFO gagal untuk ${file.name}:`,
            error
          );

          workbooks.push(
            null
          );

          checkResults.push({
            name: file.name,
            valid: false,
            message:
              getErrorMessage(
                error,
                'File tidak dapat dibaca. Pastikan file tidak rusak atau terenkripsi.'
              )
          });
        }
      }

      // Simpan Hasil Check
      validatedWorkbooks.value =
        workbooks;

      fileCheckResults.value =
        checkResults;

      // setelah seluruh proses selesai, tandai file sudah diperiksa.
      filesChecked.value = true;

      const allValid =
        checkResults.length ===
        selectedFiles.value.length &&
        checkResults.length > 0 &&
        checkResults.every(
          (result) =>
            result.valid
        );

      if (allValid) {
        // File sudah selesai diperiksa. Revision langsung dideteksi dari
        // file/source atau urutan upload existing, lalu user diminta konfirmasi.
        isCheckingFiles.value = false;

        const revisionConfirmed =
          await detectUploadRevision(true);

        if (revisionConfirmed) {
          notificationStore.showAlertSuccess(
            checkResults.length === 1
              ? `File MDFO valid sebagai Revision ${normalizedUploadRevision.value}`
              : `${checkResults.length} file MDFO valid sebagai Revision ${normalizedUploadRevision.value}`
          );
        }

        // Preview/upload tidak boleh lanjut sebelum validasi server
        // (termasuk duplicate Part Number P4) dan revision sama-sama lolos.
        return revisionConfirmed && isUploadRevisionReady.value;
      }

      // File Invalid
      const invalidMessages =
        checkResults
          .filter(
            (result) =>
              !result.valid
          )
          .map(
            (result) =>
              `${result.name}: ${result.message}`
          );

      notificationStore
        .showAlertWarning(
          invalidMessages.length
            ? invalidMessages.join('\n')
            : 'File MDFO gagal divalidasi'
        );

      return false;
    } catch (
    error: unknown
    ) {
      // Catch untuk error tak terduga di level keseluruhan pengecekan.
      console.error(
        'Check file MDFO gagal:',
        error
      );

      filesChecked.value =
        false;

      notificationStore
        .showAlertError(
          getErrorMessage(
            error,
            'Gagal memeriksa file MDFO'
          )
        );

      return false;
    } finally {
      // Wajib kembali false. Kalau bagian ini tidak jalan, Preview dan Submit akan terus disabled.
      isCheckingFiles.value =
        false;
    }
  };

  // Ui Actions

  const closeMainFilterDropdowns = () => {
    showTableCustomerDropdown.value = false;

    showTablePeriodDropdown.value = false;

    showTableRevisionDropdown.value = false;
  };

  /*
   * Menutup seluruh dropdown/popup kecil di halaman MDFO sebelum
   * popup lain dibuka. State pilihan/filter tidak direset; yang
   * ditutup hanya layer UI-nya supaya tidak ada dua popup bertumpuk.
   */
  const closeMdfoPageDropdowns = (): void => {
    closeMainFilterDropdowns();

    showMdfoCustomerDropdown.value = false;
    showMdfoUploadUserDropdown.value = false;

    // Column filter standard / TMMIN.
    closeAllDropdowns();
    activeColumnMenu.value = null;

    // Column filter mode NTC / Gaya Motor.
    closeNtcFilters();
    closeGayaFilters();

    // Dropdown bulk Tracking.
    closeMdfoTrackingBulkValueDropdowns();
  };

  const toggleTableCustomerDropdown = () => {
    const nextValue = !showTableCustomerDropdown.value;

    closeMdfoPageDropdowns();

    if (nextValue) {
      const currentSelection =
        selectedDownloadCustomers.value.length > 0
          ? selectedDownloadCustomers.value
          : [
              normalizeMdfoDownloadCustomer(
                selectedCustomerFilter.value
              )
            ].filter(Boolean);

      draftDownloadCustomers.value = [
        ...new Set(currentSelection)
      ];
    }

    showTableCustomerDropdown.value = nextValue;
  };

  const isDownloadCustomerDraftSelected = (
    customer: string
  ): boolean => {
    return draftDownloadCustomers.value.includes(
      normalizeMdfoDownloadCustomer(customer)
    );
  };

  const toggleDownloadCustomerDraft = (
    customer: string
  ): void => {
    const normalized =
      normalizeMdfoDownloadCustomer(customer);

    if (normalized === '') {
      return;
    }

    if (
      draftDownloadCustomers.value.includes(
        normalized
      )
    ) {
      draftDownloadCustomers.value =
        draftDownloadCustomers.value.filter(
          (value) => value !== normalized
        );
      return;
    }

    draftDownloadCustomers.value = [
      ...draftDownloadCustomers.value,
      normalized
    ];
  };

  const toggleAllDownloadCustomersDraft = (): void => {
    if (isAllDownloadCustomersDraftSelected.value) {
      draftDownloadCustomers.value = [];
      return;
    }

    draftDownloadCustomers.value =
      downloadCustomerOptions.value.map(
        (option) => option.value
      );
  };

  const clearDownloadCustomerDraft = (): void => {
    draftDownloadCustomers.value = [];
  };

  const applyDownloadCustomerSelection = async (): Promise<void> => {
    const allowed = new Set<string>(
      downloadCustomerOptions.value.map(
        (option) => option.value
      )
    );

    selectedDownloadCustomers.value =
      draftDownloadCustomers.value
        .map(normalizeMdfoDownloadCustomer)
        .filter(
          (customer, index, values) =>
            allowed.has(customer) &&
            values.indexOf(customer) === index
        );

    showTableCustomerDropdown.value = false;

    if (selectedDownloadCustomers.value.length === 0) {
      selectedCustomerFilter.value = '';
      selectedPeriodFilter.value = '';
      selectedRevisionFilter.value = '';

      periodFilterOptions.value = [];
      revisionFilterOptions.value = [];

      downloadScopeRowCount.value = 0;

      clearAllFilters();
      await loadData();
      return;
    }

    // Single customer tetap memakai behavior lama.
    if (selectedDownloadCustomers.value.length === 1) {
      await applyCustomerFilter(
        getMdfoTableCustomerFromDownloadCustomer(
          selectedDownloadCustomers.value[0]
        )
      );
      return;
    }

    /*
     * Multi-customer / All Customers:
     * - Raw Files akan menggabungkan customer ADM-format saja.
     * - Quotation / Contract / ZSTT akan menggabungkan seluruh customer terpilih.
     * selectedCustomerFilter dikosongkan supaya tidak ada satu customer yang
     * dianggap sebagai filter tunggal aktif.
     */
    selectedCustomerFilter.value = '';
    selectedPeriodFilter.value = '';
    selectedRevisionFilter.value = '';

    periodFilterOptions.value = [];
    revisionFilterOptions.value = [];

    clearAllFilters();

    await loadData();
  };

  const toggleTablePeriodDropdown = () => {
    const nextValue = !showTablePeriodDropdown.value;

    closeMdfoPageDropdowns();

    showTablePeriodDropdown.value = nextValue;

    if (nextValue && periodFilterOptions.value.length === 0) {
      void refreshRawMainFilterMetadata();
    }
  };

  const toggleTableRevisionDropdown = () => {
    const nextValue = !showTableRevisionDropdown.value;

    closeMdfoPageDropdowns();

    showTableRevisionDropdown.value = nextValue;

    if (nextValue && revisionFilterOptions.value.length === 0) {
      void refreshRawMainFilterMetadata();
    }
  };

  const toggleMdfoCustomerDropdown = () => {
    const nextValue = !showMdfoCustomerDropdown.value;

    closeMdfoPageDropdowns();

    showMdfoCustomerDropdown.value = nextValue;
  };

  const toggleMdfoUploadUserDropdown = () => {
    if (!canSelectUploadUser.value) {
      showMdfoUploadUserDropdown.value = false;
      return;
    }

    const nextValue = !showMdfoUploadUserDropdown.value;

    closeMdfoPageDropdowns();

    showMdfoUploadUserDropdown.value = nextValue;
  };

  const userColorClass = (name: string): string => {
    const color = USER_MASTER.find((item) => item.name === name)?.color || 'gray';

    return USER_COLOR_CLASSES[color] || USER_COLOR_CLASSES.gray;
  };

  const selectMdfoCustomer = (customer: string) => {
    const customerChanged = selectedCustomerUpload.value !== customer;

    selectedCustomerUpload.value = customer;

    if (customerChanged) {
      resetUploadRevisionDetection();

      // Draft sumber OCR customer lama tidak boleh terbawa ke customer baru.
      if (selectedFiles.value.length > 0) {
        resetSelectedFiles();
      }

      resetFtiManualState();
      resetMesManualState();

      if (customer.trim().toUpperCase() === 'FTI') {
        ftiUploadMode.value = 'manual';
        void loadFtiPartOptions();
      } else if (customer.trim().toUpperCase() === 'MES') {
        void loadMesPartOptions();
      }
    }

    showMdfoCustomerDropdown.value = false;
  };

  const selectUploadUser = (user: string) => {
    if (!canSelectUploadUser.value) {
      syncUploadUserFromLogin();
      return;
    }

    const normalizedUser = String(user ?? '').trim();
    uploadBy.value = uploadUserOptions.includes(normalizedUser)
      ? normalizedUser
      : '';

    showMdfoUploadUserDropdown.value = false;
  };

  const openUploadModal = () => {
    if (!requireUploadMdfoPermission('create', 'Create')) return;
    /*
     * Select File / Upload MDFO Form mendapat prioritas.
     * Jika Select Customer, All Periods, All Revisions, column
     * filter, atau dropdown lain masih terbuka, semuanya ditutup
     * terlebih dahulu agar hanya satu popup yang terlihat.
     */
    closeMdfoPageDropdowns();

    showUploadModal.value = true;
  };

  const closeUploadModal = () => {
    // Hanya tutup modal. Draft upload tetap disimpan agar
    // Customer, file, dan Upload By tidak hilang saat user
    // menekan X, Cancel, atau backdrop.
    showUploadModal.value = false;

    showMdfoCustomerDropdown.value = false;
    showMdfoUploadUserDropdown.value = false;
  };

  const openUploadPreview =
    async (): Promise<void> => {
      // Customer tetap wajib.
      if (selectedCustomerUpload.value.trim() === '') {
        notificationStore.showAlertWarning(
          'Pilih customer terlebih dahulu'
        );
        return;
      }

      // MES sepenuhnya manual: tidak ada upload file/OCR.
      if (isMesManualMode.value) {
        if (mesManualPeriodCompact.value === '') {
          notificationStore.showAlertWarning('Pilih Bulan MES terlebih dahulu');
          return;
        }
        if (!isMesManualRowsComplete.value) {
          notificationStore.showAlertWarning(
            'Lengkapi input MES. Dua Part wajib harus tetap ada, Qty N wajib diisi, sedangkan N+1 sampai N+3 boleh kosong.'
          );
          return;
        }
        if (!isUploadRevisionReady.value) {
          const revisionReady = await detectUploadRevision(true);
          if (!revisionReady || !isUploadRevisionReady.value) return;
        }
        showMdfoUploadPreview.value = true;
        await loadActiveFilePreview();
        return;
      }

      // FTI manual tidak memakai selectedFiles OCR. Preview dibentuk dari
      // input manual + Schedule wajib + Forecast opsional.
      if (isFtiManualMode.value) {
        if (ftiManualPeriodCompact.value === '') {
          notificationStore.showAlertWarning(
            'Pilih Bulan FTI manual terlebih dahulu'
          );
          return;
        }

        if (!ftiManualScheduleFile.value) {
          notificationStore.showAlertWarning(
            'Excel Schedule FTI wajib dipilih'
          );
          return;
        }

        const invalidPoRow = firstInvalidFtiManualPoNumber();
        if (invalidPoRow) {
          const poLength = normalizeFtiManualPoNumber(
            invalidPoRow.poNumber
          ).length;

          notificationStore.showAlertWarning(
            `PO Number FTI untuk Part ${invalidPoRow.partNo || '-'} harus tepat 10 digit. Saat ini ${poLength}/10 digit.`
          );
          return;
        }

        if (!isFtiManualRowsComplete.value) {
          notificationStore.showAlertWarning(
            'Lengkapi Part, Qty N, PO Date, dan Delivery Date FTI. N+1 sampai N+3 boleh kosong dan dapat ditambahkan lewat Edit Forecast.'
          );
          return;
        }

        if (!isUploadRevisionDetected.value) {
          const revisionReady = await detectUploadRevision(false);
          if (!revisionReady) return;
        }

        showMdfoCustomerDropdown.value = false;
        showMdfoUploadUserDropdown.value = false;
        activePreviewFileIndex.value = 0;
        showMdfoUploadPreview.value = true;
        await loadActiveFilePreview();
        return;
      }

      // OCR / customer lain wajib memiliki file pada selectedFiles.
      if (selectedFiles.value.length === 0) {
        notificationStore.showAlertWarning(
          'Pilih file MDFO terlebih dahulu'
        );
        return;
      }

      // VALIDASI FILE Kalau: belum pernah checked ATAU checked tetapi invalid lakukan check ulang.
      if (!filesChecked.value || !allCheckedFilesValid.value) {
        const valid = await checkSelectedFiles();
        if (!valid) {
          return;
        }
      }

      // Safety check tambahan.
      if (!allCheckedFilesValid.value) {
        notificationStore.showAlertWarning(
          'File MDFO belum lolos validasi'
        );
        return;
      }

      // Wajib lolos deteksi server sebelum Preview dibuka. Ini menutup celah
      // saat file sudah valid secara struktur tetapi validasi revision/duplicate
      // sebelumnya gagal atau dibatalkan.
      if (!isUploadRevisionReady.value) {
        const revisionReady = await detectUploadRevision(true);
        if (!revisionReady || !isUploadRevisionReady.value) {
          return;
        }
      }

      showMdfoCustomerDropdown.value = false;
      showMdfoUploadUserDropdown.value = false;
      activePreviewFileIndex.value = 0;
      showMdfoUploadPreview.value = true;
      await loadActiveFilePreview();
    };

  const closeUploadPreview = () => {
    // Preview hanya disembunyikan. State preview dan draft upload
    // tetap dipertahankan. State baru dibersihkan saat Clear Data,
    // ganti file/customer, atau upload berhasil.
    showMdfoUploadPreview.value = false;
  };

  const prepareDpmSanitizedPdfs = async (): Promise<void> => {
    if (selectedCustomerUpload.value.trim().toUpperCase() !== 'DPM') {
      notificationStore.showAlertWarning('Fitur PDF tanpa harga hanya tersedia untuk customer DPM.');
      return;
    }

    if (selectedFiles.value.length === 0) {
      notificationStore.showAlertWarning('Pilih file DPM terlebih dahulu.');
      return;
    }

    if (!filesChecked.value || !allCheckedFilesValid.value) {
      const valid = await checkSelectedFiles();

      if (!valid) {
        return;
      }
    }

    if (isPreparingDpmSanitizedPdfs.value) {
      return;
    }

    resetDpmSanitizedPdfState();
    isPreparingDpmSanitizedPdfs.value = true;
    dpmSanitizedPdfError.value = '';
    showMdfoCustomerDropdown.value = false;
    showMdfoUploadUserDropdown.value = false;

    try {
      // Parser server tetap menjadi sumber validasi utama. PDF baru hanya dibuat
      // setelah seluruh file benar-benar dapat diparse oleh alur MDFO DPM.
      const parsedPreview = await mdfoService.previewDpm(selectedFiles.value);

      if (parsedPreview.status !== 'success') {
        throw new Error(parsedPreview.message || 'File DPM tidak dapat diparse oleh server.');
      }

      const generatedFiles = await createDpmPdfsWithoutPrices(selectedFiles.value);

      dpmSanitizedPdfs.value = generatedFiles.map((file) => ({
        ...file,
        url: URL.createObjectURL(file.blob)
      }));
      activeDpmSanitizedPdfIndex.value = 0;
      showDpmSanitizedPdfPreview.value = true;

      notificationStore.showAlertSuccess(
        generatedFiles.length === 1
          ? 'PDF DPM tanpa harga siap dipreview dan didownload.'
          : `${generatedFiles.length} PDF DPM tanpa harga siap dipreview dan didownload.`
      );
    } catch (error: unknown) {
      const message = getErrorMessage(
        error,
        'PDF DPM tanpa harga gagal dibuat. Pastikan file memakai template DPM yang didukung.'
      );

      dpmSanitizedPdfError.value = message;
      notificationStore.showAlertError(message);
    } finally {
      isPreparingDpmSanitizedPdfs.value = false;
    }
  };

  const closeDpmSanitizedPdfPreview = (): void => {
    showDpmSanitizedPdfPreview.value = false;
  };

  const selectDpmSanitizedPdf = (index: number): void => {
    if (index < 0 || index >= dpmSanitizedPdfs.value.length) {
      return;
    }

    activeDpmSanitizedPdfIndex.value = index;
  };

  const downloadActiveDpmSanitizedPdf = (): void => {
    if (!requireUploadMdfoPermission('download', 'Download')) return;
    const file = activeDpmSanitizedPdf.value;

    if (!file) {
      notificationStore.showAlertWarning('Pilih PDF DPM yang akan didownload.');
      return;
    }

    saveAs(file.blob, file.name);
  };

  const downloadAllDpmSanitizedPdfs = async (): Promise<void> => {
    if (!requireUploadMdfoPermission('download', 'Download')) return;
    if (dpmSanitizedPdfs.value.length === 0) {
      notificationStore.showAlertWarning('Belum ada PDF DPM tanpa harga yang siap didownload.');
      return;
    }

    if (dpmSanitizedPdfs.value.length === 1) {
      downloadActiveDpmSanitizedPdf();
      return;
    }

    const archive = new JSZip();

    dpmSanitizedPdfs.value.forEach((file) => {
      archive.file(file.name, file.blob);
    });

    const zipBlob = await archive.generateAsync({
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
      type: 'blob'
    });

    saveAs(zipBlob, 'DPM PDF TANPA HARGA.zip');
  };

  // Main filters

  const clearAllFilters = () => {
    [...columns, ...ASI_MDFO_COLUMNS, ...tmminColumns.value].forEach((column) => {
      selectedFilters.value[column.key] = [];
      searchFilters.value[column.key] = '';
      openFilters.value[column.key] = false;
    });

    clearNtcFilters(false);
    clearGayaFilters(false);

    sortKey.value = '';
    sortDirection.value = 'none';
    if (currentPage.value !== 1) {
      skipNextMainPageWatch = true;
    }
    currentPage.value = 1;
    rawServerFilterOptions.value = {};
  };

  const applyRevisionFilter = async (revision: string) => {
    selectedRevisionFilter.value = normalizeRevision(revision);

    showTableRevisionDropdown.value = false;

    clearAllFilters();

    await loadData();
  };

  const applyCustomerFilter = async (customer: string) => {
    selectedCustomerFilter.value = String(customer ?? '')
      .trim()
      .toUpperCase();

    if (
      selectedDownloadCustomers.value.length === 0 &&
      selectedCustomerFilter.value !== ''
    ) {
      selectedDownloadCustomers.value = [
        normalizeMdfoDownloadCustomer(
          selectedCustomerFilter.value
        )
      ].filter(Boolean);
    }

    selectedPeriodFilter.value = '';
    selectedRevisionFilter.value = '';

    periodFilterOptions.value = [];
    revisionFilterOptions.value = [];

    showTableCustomerDropdown.value = false;

    clearAllFilters();

    await loadData();
  };

  const applyPeriodFilter = async (value: string) => {
    selectedPeriodFilter.value = normalizePeriod(value);

    selectedRevisionFilter.value = '';
    revisionFilterOptions.value = [];

    showTablePeriodDropdown.value = false;

    clearAllFilters();

    await loadData();
  };

  const applyPeriodInputValue = async (value: string) => {
    const period = normalizePeriod(value);

    if (period === '' || !latestYearPeriodOptions.value.includes(period)) {
      return;
    }

    await applyPeriodFilter(period);
  };

  const selectTableCustomer = async (customer: string) => {
    await applyCustomerFilter(customer);
  };

  const selectTablePeriod = async (periode: string) => {
    await applyPeriodFilter(periode);
  };

  const selectTableRevision = async (revision: string) => {
    await applyRevisionFilter(revision);
  };

  const clearMainFilters = async () => {
    selectedCustomerFilter.value = '';
    selectedPeriodFilter.value = '';
    selectedRevisionFilter.value = '';
    selectedDownloadCustomers.value = [...MDFO_DOWNLOAD_CUSTOMER_ORDER];
    draftDownloadCustomers.value = [...MDFO_DOWNLOAD_CUSTOMER_ORDER];

    clearAllFilters();

    await loadData();
  };

  // Column filters and sorting

  const getDayHeader = (key: MdfoKey): string => {
    return isDayKey(key) ? dayHeaders[key] : '';
  };

  const getColumnOptions = (key: MdfoKey): string[] => {
    if (rawServerPaged.value) {
      return rawServerFilterOptions.value[key] || [];
    }

    if (
      isAsiAdmMode.value &&
      ASI_MDFO_COLUMNS.some((column) => column.key === key)
    ) {
      const sourceRows = getRowsMatchingOtherColumnFilters(
        rows.value,
        ASI_MDFO_COLUMNS,
        selectedFilters.value,
        key,
        (row, columnKey) => formatFilterValue(
          getAsiCellValue(row, columnKey)
        )
      );

      return sortFilterOptions(
        Array.from(
          new Set(
            sourceRows.map((row) =>
              normalizeFilterOption(
                formatFilterValue(getAsiCellValue(row, key))
              )
            )
          )
        )
      );
    }

    const isTmminKey = isTmminColumnKey(key);
    const sourceRows = isTmminKey
      ? getRowsMatchingOtherColumnFilters(
        tmminRows.value,
        tmminColumns.value,
        selectedFilters.value,
        key,
        (row, columnKey) => formatFilterValue(row[columnKey])
      )
      : getRowsMatchingOtherColumnFilters(
        rows.value,
        columns,
        selectedFilters.value,
        key,
        (row, columnKey) => formatFilterValue(row[columnKey])
      );

    return sortFilterOptions(
      Array.from(
        new Set(
          sourceRows
            .map((row) => normalizeFilterOption(formatFilterValue(row[key])))
        )
      )
    );
  };

  const getFilteredColumnOptions = (key: MdfoKey): string[] => {
    const keyword = (searchFilters.value[key] || '').toLowerCase();

    return getColumnOptions(key).filter((option) => {
      return matchesSearchTokens(option, keyword);
    });
  };

  const normalizeRawServerFilterValue = (
    key: MdfoKey,
    value: unknown
  ): string => {
    const text = String(value ?? '').trim();
    if (
      NUMERIC_COLUMN_KEYS.has(key) &&
      /^-?\d+(?:\.\d+)?$/.test(text)
    ) {
      return normalizeFilterOption(Number(text));
    }

    return normalizeFilterOption(text);
  };

  const getCurrentPageRawFilterOptions = (
    key: MdfoKey
  ): string[] => {
    return rows.value.map((row) => {
      const value = isAsiAdmMode.value
        ? getAsiCellValue(row, key)
        : row[key];
      return normalizeRawServerFilterValue(key, value);
    });
  };

  const getActiveColumnFilters = (): Partial<Record<MdfoKey, string[]>> => {
    const activeFilters: Partial<Record<MdfoKey, string[]>> = {};

    const sourceColumns = isTmminMode.value
      ? tmminColumns.value
      : isAsiAdmMode.value
        ? ASI_MDFO_COLUMNS
        : columns;

    sourceColumns.forEach((column) => {
      const values = selectedFilters.value[column.key] || [];

      if (values.length === 0) {
        return;
      }

      if (isAsiAdmMode.value && column.key === 'partNoSap') {
        activeFilters.partNo = values
          .map(toRawFilterOption)
          .map((value) => value.replace(/-00$/i, ''));
        return;
      }

      activeFilters[column.key] = values.map(toRawFilterOption);
    });

    return activeFilters;
  };

  const getActiveServerColumnFilters = (
    customer = normalizeMdfoDownloadCustomer(selectedCustomerFilter.value)
  ): Record<string, string[]> => {
    if (customer === 'NTC' || customer === 'DPM' || customer === 'FTI' || customer === 'MES') {
      return getActiveNtcColumnFilters();
    }

    if (customer === 'GAYA MTR') {
      return getActiveGayaColumnFilters();
    }

    return getActiveColumnFilters() as Record<string, string[]>;
  };

  const abortRawFilterRequest = (key: string): void => {
    const controller = rawRemoteFilterControllers.get(key);
    if (controller) {
      controller.abort();
      rawRemoteFilterControllers.delete(key);
    }
  };

  const loadRawServerFilterOptions = async (
    key: MdfoKey,
    search = ''
  ): Promise<void> => {
    if (!rawServerPaged.value) return;

    const keyword = String(search ?? '').trim();
    if (keyword.length < 3) return;

    const requestKey = `main:${key}`;
    abortRawFilterRequest(requestKey);
    const controller = new AbortController();
    rawRemoteFilterControllers.set(requestKey, controller);

    try {
      const rawDisplayCustomers = getRawDisplayCustomers(getSelectedScopeCustomers());
      const explicitCustomer = normalizeMdfoDownloadCustomer(selectedCustomerFilter.value);
      const effectiveCustomer = explicitCustomer || (
        rawDisplayCustomers.length === 1 ? rawDisplayCustomers[0] : ''
      );
      const values = await mdfoService.getRawFilterOptions(
        key,
        keyword,
        {
          customer: effectiveCustomer,
          customers: effectiveCustomer === ''
            ? rawDisplayCustomers
            : undefined,
          periode: selectedPeriodFilter.value,
          revision: selectedRevisionFilter.value,
          columnFilters: getActiveServerColumnFilters(effectiveCustomer)
        },
        controller.signal
      );

      if (controller.signal.aborted) return;

      const currentPageValues = isTmminMode.value
        ? tmminRows.value.map((row) => normalizeRawServerFilterValue(key, row[key]))
        : getCurrentPageRawFilterOptions(key);
      const selectedValues = selectedFilters.value[key] || [];

      rawServerFilterOptions.value = {
        ...rawServerFilterOptions.value,
        [key]: sortFilterOptions(
          Array.from(new Set([
            ...values.map((value) => normalizeRawServerFilterValue(key, value)),
            ...currentPageValues,
            ...selectedValues
          ]))
        )
      };
    } finally {
      if (rawRemoteFilterControllers.get(requestKey) === controller) {
        rawRemoteFilterControllers.delete(requestKey);
      }
    }
  };

  const loadNtcServerFilterOptions = async (
    key: NtcMdfoKey,
    search = ''
  ): Promise<void> => {
    if (!rawServerPaged.value) return;
    const keyword = String(search ?? '').trim();
    if (keyword.length < 3) return;

    const requestKey = `ntc:${key}`;
    abortRawFilterRequest(requestKey);
    const controller = new AbortController();
    rawRemoteFilterControllers.set(requestKey, controller);

    try {
      const rawDisplayCustomers = getRawDisplayCustomers(getSelectedScopeCustomers());
      const customer = normalizeMdfoDownloadCustomer(
        selectedCustomerFilter.value || rawDisplayCustomers[0] || ''
      );
      const values = await mdfoService.getRawFilterOptions(
        key,
        keyword,
        {
          customer,
          periode: selectedPeriodFilter.value,
          revision: selectedRevisionFilter.value,
          columnFilters: getActiveNtcColumnFilters()
        },
        controller.signal
      );
      if (controller.signal.aborted) return;

      const selectedValues = ntcSelectedFilters.value[key] || [];
      const pageValues = ntcRows.value.map((row) => {
        return normalizeNtcServerFilterValue(key, row[key]);
      });
      ntcServerFilterOptions.value = {
        ...ntcServerFilterOptions.value,
        [key]: sortFilterOptions(
          Array.from(new Set([
            ...values.map((value) => normalizeNtcServerFilterValue(key, value)),
            ...pageValues,
            ...selectedValues
          ]))
        )
      };
    } finally {
      if (rawRemoteFilterControllers.get(requestKey) === controller) {
        rawRemoteFilterControllers.delete(requestKey);
      }
    }
  };

  const loadGayaServerFilterOptions = async (
    key: string,
    search = ''
  ): Promise<void> => {
    if (!rawServerPaged.value) return;
    const keyword = String(search ?? '').trim();
    if (keyword.length < 3) return;

    const requestKey = `gaya:${key}`;
    abortRawFilterRequest(requestKey);
    const controller = new AbortController();
    rawRemoteFilterControllers.set(requestKey, controller);

    try {
      const values = await mdfoService.getRawFilterOptions(
        key,
        keyword,
        {
          customer: 'GAYA MTR',
          periode: selectedPeriodFilter.value,
          revision: selectedRevisionFilter.value,
          columnFilters: getActiveGayaColumnFilters()
        },
        controller.signal
      );
      if (controller.signal.aborted) return;

      const selectedValues = gayaSelectedFilters.value[key] || [];
      const pageValues = gayaRows.value.map((row) => {
        return normalizeGayaServerFilterValue(key, row[key]);
      });
      gayaServerFilterOptions.value = {
        ...gayaServerFilterOptions.value,
        [key]: sortFilterOptions(
          Array.from(new Set([
            ...values.map((value) => normalizeGayaServerFilterValue(key, value)),
            ...pageValues,
            ...selectedValues
          ]))
        )
      };
    } finally {
      if (rawRemoteFilterControllers.get(requestKey) === controller) {
        rawRemoteFilterControllers.delete(requestKey);
      }
    }
  };

  const reloadMainServerPage = (pageOnly = false): void => {
    if (currentPage.value !== 1) {
      skipNextMainPageWatch = true;
      currentPage.value = 1;
    }
    void loadData(undefined, { pageOnly });
  };

  const toggleFilter = (key: MdfoKey, value: string) => {
    const selected = selectedFilters.value[key] || [];

    const index = selected.indexOf(value);

    if (index < 0) {
      selected.push(value);
    } else {
      selected.splice(index, 1);
    }

    if (rawServerPaged.value) {
      rawServerFilterOptions.value = {};
      reloadMainServerPage(false);
    }
  };

  const toggleAllColumn = (key: MdfoKey) => {
    const options = getFilteredColumnOptions(key);

    const selected = selectedFilters.value[key] || [];

    selectedFilters.value[key] = selected.length === options.length ? [] : [...options];
    if (rawServerPaged.value) {
      rawServerFilterOptions.value = {};
      reloadMainServerPage(false);
    }
  };

  const clearColumnFilter = (key: MdfoKey) => {
    selectedFilters.value[key] = [];
    searchFilters.value[key] = '';
    if (rawServerPaged.value) {
      rawServerFilterOptions.value = {};
      reloadMainServerPage(false);
    }
  };

  const isAllSelected = (key: MdfoKey): boolean => {
    const options = getFilteredColumnOptions(key);

    const selected = selectedFilters.value[key] || [];

    return options.length > 0 && selected.length === options.length;
  };

  const getSelectedLabel = (key: MdfoKey): string => {
    const selected = selectedFilters.value[key] || [];

    return selected.length ? `${selected.length} selected` : 'All';
  };

  const hideFilterLabel = (key: MdfoKey): boolean => {
    const tmminColumn = tmminColumns.value.find(
      (column) => column.key === key
    );

    if (tmminColumn) {
      return tmminColumn.numeric;
    }

    return HIDE_FILTER_LABEL_KEYS.has(key);
  };

  const toggleDropdown = (key: MdfoKey, event?: MouseEvent) => {
    const isCurrentlyOpen = openFilters.value[key];
    // Simpan elemen pemicu sebelum await. Browser akan mengosongkan
    // event.currentTarget setelah event handler melewati async boundary.
    const triggerElement = event?.currentTarget as HTMLElement | null;

    [...columns, ...ASI_MDFO_COLUMNS, ...tmminColumns.value].forEach((column) => {
      openFilters.value[column.key] = false;
    });

    if (isCurrentlyOpen) {
      mdfoFilterAnchor.clear();
      return;
    }

    if (!triggerElement) {
      console.warn('Filter trigger element tidak ditemukan');
      return;
    }

    mdfoFilterAnchor.anchor(
      triggerElement,
      (anchor) => {
        const position = getAnchoredPopupPosition(anchor, {
          popupWidth: 270,
          preferredHeight: 390,
          minimumHeight: 390
        });

        filterPopupPosition.value = {
          top: position.top,
          left: position.left
        };
      }
    );

    openFilters.value[key] = true;

    if (rawServerPaged.value) {
      // Klik filter tidak boleh memicu query DISTINCT seluruh Raw MDFO.
      // Tampilkan nilai page aktif; remote search baru berjalan mulai 3 karakter.
      if (!rawServerFilterOptions.value[key]) {
        const pageValues = isTmminMode.value
          ? tmminRows.value.map((row) => normalizeRawServerFilterValue(key, row[key]))
          : getCurrentPageRawFilterOptions(key);

        rawServerFilterOptions.value = {
          ...rawServerFilterOptions.value,
          [key]: sortFilterOptions(
            Array.from(new Set([
              ...pageValues,
              ...(selectedFilters.value[key] || [])
            ]))
          )
        };
      }
    }
  };

  const closeAllDropdowns = () => {
    [...columns, ...ASI_MDFO_COLUMNS, ...tmminColumns.value].forEach((column) => {
      openFilters.value[column.key] = false;
    });

    mdfoFilterAnchor.clear();
  };

  const toggleColumnMenu = (key: MdfoKey) => {
    activeColumnMenu.value = activeColumnMenu.value === key ? null : key;
  };

  const setSort = (key: MdfoKey, direction: 'none' | 'asc' | 'desc') => {
    if (direction === 'none') {
      sortKey.value = '';
      sortDirection.value = 'none';
    } else {
      sortKey.value = key;
      sortDirection.value = direction;
    }

    if (rawServerPaged.value) {
      reloadMainServerPage(true);
    } else {
      currentPage.value = 1;
    }
  };

  const isSortActive = (key: MdfoKey, direction: 'asc' | 'desc'): boolean => {
    return sortKey.value === key && sortDirection.value === direction;
  };

  const isNoSortActive = (key: MdfoKey): boolean => {
    return sortDirection.value === 'none' || sortKey.value !== key;
  };

  // Total Harian

  const getRowTotal = (row: MdfoRow): number => {
    const keys: MdfoKey[] = ['poQty', 'n', 'n1', 'n2', 'n3', ...DAY_KEYS];

    return keys.reduce((total, key) => {
      return total + (Number(row[key]) || 0);
    }, 0);
  };

  const getDailyTotal = (row: MdfoRow): number => {
    return DAY_KEYS.reduce((total, key) => {
      return total + (Number(row[key]) || 0);
    }, 0);
  };

  const dailyGrandTotal = computed(() => {
    if (rawServerPaged.value) {
      return DAY_KEYS.reduce((total, key) => {
        return total + Number(rawServerColumnTotals.value[key] ?? 0);
      }, 0);
    }

    return filteredRows.value.reduce((total, row) => {
      return total + getDailyTotal(row);
    }, 0);
  });

  // Pagination

  const setRowsPerPage = (value: number) => {
    rowsPerPage.value = value;
  };

  const firstPage = () => {
    currentPage.value = 1;
  };

  const prevPage = () => {
    if (currentPage.value > 1) {
      currentPage.value--;
    }
  };

  const nextPage = () => {
    if (currentPage.value < activeTotalPages.value) {
      currentPage.value++;
    }
  };

  const lastPage = () => {
    currentPage.value = activeTotalPages.value;
  };

  // File Upload

  const getMdfoUploadFileIdentity = (
    file: File
  ): string => {
    return [
      file.name.trim().toLowerCase(),
      file.size,
      file.lastModified
    ].join('|');
  };

  const onFileChange =
    async (
      event: Event
    ): Promise<void> => {
      const input =
        event.target as
        HTMLInputElement;

      // Customer harus dipilih lebih dahulu.
      if (
        !validateCustomerBeforeChooseFile()
      ) {
        input.value = '';

        return;
      }

      const incomingFiles =
        Array.from(
          input.files ?? []
        );

      // Selalu kosongkan native input agar Browse berikutnya dapat
      // memilih file yang sama lagi tanpa mengganti daftar sebelumnya.
      input.value = '';

      if (
        incomingFiles.length === 0
      ) {
        return;
      }

      /*
       * Skema sama seperti Upload SO:
       * - pilihan Browse berikutnya DITAMBAHKAN ke daftar;
       * - file lama tidak direplace;
       * - file identik tidak diduplikasi.
       */
      const mergedFiles =
        new Map<string, File>();

      selectedFiles.value.forEach(
        (file) => {
          mergedFiles.set(
            getMdfoUploadFileIdentity(file),
            file
          );
        }
      );

      let duplicateCount = 0;

      incomingFiles.forEach(
        (file) => {
          const key =
            getMdfoUploadFileIdentity(file);

          if (mergedFiles.has(key)) {
            duplicateCount += 1;
            return;
          }

          mergedFiles.set(
            key,
            file
          );
        }
      );

      const nextFiles =
        Array.from(
          mergedFiles.values()
        );

      // Validasi terhadap SELURUH daftar setelah digabung.
      // Penting untuk TMMIN yang tetap maksimal 2 file
      // (satu T034 + satu TMAJ).
      const {
        validFiles,
        errors
      } =
        validateMdfoFileList(
          nextFiles
        );

      if (
        errors.length > 0
      ) {
        // File yang sudah ada dipertahankan. Hanya pilihan baru ditolak.
        notificationStore
          .showAlertWarning(
            errors.join('\n')
          );

        return;
      }

      if (
        validFiles.length ===
        selectedFiles.value.length &&
        duplicateCount > 0
      ) {
        notificationStore
          .showAlertWarning(
            duplicateCount === 1
              ? 'File yang dipilih sudah ada di daftar upload.'
              : `${duplicateCount} file yang dipilih sudah ada di daftar upload.`
          );

        return;
      }

      selectedFiles.value =
        validFiles;

      resetFileValidationState();

      if (duplicateCount > 0) {
        notificationStore
          .showAlertWarning(
            `${duplicateCount} file duplikat tidak ditambahkan. File baru lainnya tetap dimasukkan.`
          );
      }

      // AUTO CHECK ulang seluruh daftar agar status tiap file tetap sinkron.
      await checkSelectedFiles();
    };

  const removeSelectedFile =
    async (
      index: number
    ): Promise<void> => {
      if (
        isCheckingFiles.value ||
        isUploading.value ||
        index < 0 ||
        index >= selectedFiles.value.length
      ) {
        return;
      }

      selectedFiles.value =
        selectedFiles.value.filter(
          (_, fileIndex) =>
            fileIndex !== index
        );

      resetFileValidationState();

      // Pastikan native input tidak menyimpan pilihan lama.
      uploadInputKey.value += 1;

      if (
        selectedFiles.value.length === 0
      ) {
        return;
      }

      // Sesudah satu file dihapus, validasi ulang file yang masih tersisa.
      await checkSelectedFiles();
    };

  const resetUploadForm = () => {
    // resetSelectedFiles() membersihkan file, validasi, workbook cache,
    // preview Excel, serta mereset native file input.
    resetSelectedFiles();

    selectedCustomerUpload.value = '';
    resetUploadRevisionDetection();
    resetFtiManualState();
    resetMesManualState();
    uploadBy.value = '';
    syncUploadUserFromLogin();

    showMdfoCustomerDropdown.value = false;
    showMdfoUploadUserDropdown.value = false;
    showMdfoUploadPreview.value = false;
  };

  const clearUploadForm = () => {
    if (isUploading.value) {
      return;
    }

    // Clear Data memang menghapus seluruh draft upload.
    // Modal tetap terbuka agar user bisa langsung mengisi ulang.
    resetUploadForm();
  };

  const loadExcelSheetPreview = (
    sheetName: string
  ) => {
    const workbook =
      excelWorkbook.value;

    excelPreviewError.value =
      '';

    excelPreviewSummary.value = {
      mode: 'ADM',
      customer: '',
      period: '',
      periodLabel: '',
      revision: '',
      regNo: '',
      dockCode: '',
      vendorCode: '',
      vendorName: '',
      vendorAddress: '',
      supplierCode: '',
      companyCode: '',
      totalRows: 0
    };

    excelPreviewForecastSummary.value =
      [];

    excelPreviewDetectedHeaderRow.value =
      0;

    if (!workbook) {
      excelPreviewHeaders.value =
        [];

      excelPreviewRows.value =
        [];

      excelPreviewError.value =
        'Workbook preview belum tersedia';

      return;
    }

    const worksheet =
      workbook.Sheets[
      sheetName
      ];

    if (!worksheet) {
      excelPreviewHeaders.value =
        [];

      excelPreviewRows.value =
        [];

      excelPreviewError.value =
        `Sheet "${sheetName}" tidak ditemukan`;

      return;
    }

    try {
      const rawRows =
        XLSX.utils.sheet_to_json<
          ExcelCell[]
        >(
          worksheet,
          {
            header: 1,
            defval: '',
            blankrows: false,
            // Ambil nilai asli Excel, bukan formatted text (.w).
            // Ini mencegah angka preview berubah menjadi "$100" dan membuat total forecast = 0.
            raw: true
          }
        );

      const normalizedUploadCustomer =
        selectedCustomerUpload.value
          .trim()
          .toUpperCase();

      const isGayaPreview =
        normalizedUploadCustomer === 'GAYA MOTOR' ||
        normalizedUploadCustomer === 'GAYA MTR';

      const result =
        normalizedUploadCustomer === 'NTC'
          ? buildNtcReadablePreview(rawRows)
          : isGayaPreview
            ? buildGayaReadablePreview(rawRows)
            : normalizedUploadCustomer === 'ASI ADM'
              ? buildAsiAdmReadablePreview(rawRows)
              : buildReadablePreview(rawRows);

      excelPreviewHeaders.value =
        result.headers;

      excelPreviewRows.value =
        result.rows;

      excelPreviewSummary.value =
        result.summary;

      excelPreviewForecastSummary.value =
        result.forecast;

      excelPreviewDetectedHeaderRow.value =
        result.headerRowNumber;

    } catch (
    error: unknown
    ) {
      console.error(
        `Gagal membaca sheet ${sheetName}:`,
        error
      );

      excelPreviewHeaders.value =
        [];

      excelPreviewRows.value =
        [];

      excelPreviewForecastSummary.value =
        [];

      excelPreviewDetectedHeaderRow.value =
        0;

      excelPreviewError.value =
        getErrorMessage(
          error,
          'Sheet Excel gagal dibaca'
        );
    }
  };


  const normalizePreviewToken = (
    value: unknown
  ): string => {
    return String(value ?? '')
      .trim()
      .toUpperCase()
      .replace(/\r?\n/g, ' ')
      .replace(/[-_./\\]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const compactPreviewToken = (
    value: unknown
  ): string => {
    return normalizePreviewToken(value)
      .replace(/[^A-Z0-9+]/g, '');
  };

  const PREVIEW_HEADER_ALIASES:
    Record<string, string> = {
    // ADM
    NO: 'no',
    PARTNO: 'partNo',
    PARTNUMBER: 'partNo',
    MATERIAL: 'partNo',
    PARTNAME: 'partName',
    UNIQUENO: 'uniqueNo',
    JOBNO: 'uniqueNo',
    QTYKANBAN: 'qtyKanban',
    PONUMBER: 'poNumber',
    PONO: 'poNumber',
    POQTY: 'poQty',
    POQUANTITY: 'poQty',

    // NTC
    KBNCODE: 'kbnCode',
    PROCESSORDER: 'processOrder',
    PCSM: 'pcsM',
    PCSD: 'pcsD',
    BOXTYPE: 'boxType',
    QTYBOX: 'qtyBox',
    KANBANDAY: 'kanbanDay',
    MODEL: 'model',

    N: 'n',
    'N+1': 'n1',
    N1: 'n1',
    'N+2': 'n2',
    N2: 'n2',
    'N+3': 'n3',
    N3: 'n3',

    // TMMIN
    REVNO: 'revision',
    REVISION: 'revision',
    COMP_CD: 'companyCode',
    COMPCD: 'companyCode',
    COMPANYCODE: 'companyCode',
    DOCKCD: 'dockCode',
    DOCKCODE: 'dockCode',
    PACKMONT: 'period',
    PACKMONTH: 'period',
    PERIOD: 'period',
    PERIODE: 'period',
    CARCD: 'carCode',
    ORDERTYPE: 'orderType',
    ORDERLOT: 'orderLot',
    KANBANNUM: 'kanban',
    KANBANNO: 'kanban',

    NVOLUME: 'n',
    N1VOLUME: 'n1',
    N2VOLUME: 'n2',
    N3VOLUME: 'n3',
    N01VOLUME: 'n1',
    N02VOLUME: 'n2',
    N03VOLUME: 'n3',

    SUPPLIERCODE: 'supplierCode',
    SUPPLIERCD: 'supplierCode',
    VENDORCODE: 'vendorCode',
    VENDORCD: 'vendorCode'
  };

  const getPreviewHeaderKey = (
    value: unknown
  ): string => {
    const compact =
      compactPreviewToken(value);

    // Special normalization agar:
    // N_1_VOLUME / N-1 VOLUME / N 1 VOLUME -> N1VOLUME
    if (
      /^N\+?1VOLUME$/.test(compact)
    ) {
      return 'n1';
    }

    if (
      /^N\+?2VOLUME$/.test(compact)
    ) {
      return 'n2';
    }

    if (
      /^N\+?3VOLUME$/.test(compact)
    ) {
      return 'n3';
    }

    if (compact === 'NVOLUME') {
      return 'n';
    }

    return (
      PREVIEW_HEADER_ALIASES[compact] ??
      ''
    );
  };

  const findPreviewHeaderRowIndex = (
    rows: ExcelCell[][]
  ): number => {
    let bestIndex = -1;
    let bestScore = -1;

    rows.forEach(
      (row, rowIndex) => {
        const keys =
          row
            .map(getPreviewHeaderKey)
            .filter(Boolean);

        const uniqueKeys =
          new Set(keys);

        const hasPart =
          uniqueKeys.has('partNo');

        const hasForecast =
          uniqueKeys.has('n') ||
          uniqueKeys.has('n1') ||
          uniqueKeys.has('n2') ||
          uniqueKeys.has('n3');

        const hasAdmStructure =
          uniqueKeys.has('poQty') ||
          uniqueKeys.has('poNumber') ||
          uniqueKeys.has('partName');

        const hasTmminStructure =
          uniqueKeys.has('period') ||
          uniqueKeys.has('companyCode') ||
          uniqueKeys.has('revision');

        let score =
          uniqueKeys.size;

        if (hasPart) {
          score += 6;
        }

        if (hasForecast) {
          score += 4;
        }

        if (hasAdmStructure) {
          score += 2;
        }

        if (hasTmminStructure) {
          score += 2;
        }

        /*
         * Header valid minimal harus mempunyai Part No,
         * lalu salah satu struktur forecast / MDFO.
         */
        if (
          !hasPart ||
          (!hasForecast &&
            !hasAdmStructure &&
            !hasTmminStructure)
        ) {
          return;
        }

        if (score > bestScore) {
          bestScore = score;
          bestIndex = rowIndex;
        }
      }
    );

    return bestIndex;
  };

  const PREVIEW_METADATA_LABELS = [
    'Reg No',
    'Registration No',
    'Registration Number',
    'Period',
    'Periode',
    'Pack Mont',
    'Pack Month',
    'PACK_MONT',
    'Revision',
    'Rev',
    'REV_NO',
    'Dock Code',
    'Dock Cd',
    'DOCK_CD',
    'Vendor Code',
    'Vendor Cd',
    'Supplier Code',
    'Supplier Cd',
    'Vendor Name',
    'Supplier Name',
    'Company Name',
    'Vendor Address',
    'Supplier Address',
    'Address',
    'Alamat',
    'Company Code',
    'Comp Cd',
    'COMP_CD'
  ] as const;

  const PREVIEW_METADATA_LABEL_TOKENS =
    new Set(
      PREVIEW_METADATA_LABELS.map(
        (label) =>
          compactPreviewToken(label)
      )
    );

  const cleanPreviewMetadataValue = (
    value: unknown
  ): string => {
    return String(value ?? '')
      .replace(/^[\s:=-]+/, '')
      .trim();
  };

  const isPreviewMetadataLabel = (
    value: unknown
  ): boolean => {
    return PREVIEW_METADATA_LABEL_TOKENS.has(
      compactPreviewToken(value)
    );
  };

  const findPreviewInlineMetadataValue = (
    rawValue: unknown,
    normalizedLabels: Set<string>
  ): string => {
    const raw =
      String(rawValue ?? '').trim();

    if (raw === '') {
      return '';
    }

    /*
     * Format umum:
     * Period : 2026 August
     * Revision : 0.1
     * Reg No : 0002/ADM-D104/...
     */
    const splitMatch =
      raw.match(
        /^(.{1,80}?)\s*[:=]\s*(.+)$/
      );

    if (!splitMatch) {
      return '';
    }

    const labelToken =
      compactPreviewToken(
        splitMatch[1]
      );

    if (
      !normalizedLabels.has(
        labelToken
      )
    ) {
      return '';
    }

    return cleanPreviewMetadataValue(
      splitMatch[2]
    );
  };

  const findPreviewMetadataValue = (
    rows: ExcelCell[][],
    labels: string[],
    options?: {
      maxRows?: number;
      rightDistance?: number;
      belowDistance?: number;
    }
  ): string => {
    const normalizedLabels =
      new Set(
        labels.map(
          (label) =>
            compactPreviewToken(label)
        )
      );

    const maxRows =
      Math.min(
        rows.length,
        options?.maxRows ?? 40
      );

    const rightDistance =
      Math.max(
        1,
        options?.rightDistance ?? 20
      );

    const belowDistance =
      Math.max(
        0,
        options?.belowDistance ?? 4
      );

    for (
      let rowIndex = 0;
      rowIndex < maxRows;
      rowIndex += 1
    ) {
      const row =
        rows[rowIndex] ?? [];

      for (
        let colIndex = 0;
        colIndex < row.length;
        colIndex += 1
      ) {
        const rawCell =
          row[colIndex];

        /*
         * Metadata kadang berada di satu cell:
         * "Period : 2026 August".
         */
        const inlineValue =
          findPreviewInlineMetadataValue(
            rawCell,
            normalizedLabels
          );

        if (inlineValue !== '') {
          return inlineValue;
        }

        const token =
          compactPreviewToken(
            rawCell
          );

        if (
          !normalizedLabels.has(token)
        ) {
          continue;
        }

        /*
         * Ikuti parser backend: cari cukup jauh ke kanan karena file MDFO
         * banyak memakai merged cell.
         */
        for (
          let next = colIndex + 1;
          next <=
          Math.min(
            row.length - 1,
            colIndex + rightDistance
          );
          next += 1
        ) {
          const value =
            cleanPreviewMetadataValue(
              row[next]
            );

          if (
            value === '' ||
            value === ':' ||
            isPreviewMetadataLabel(value)
          ) {
            continue;
          }

          return value;
        }

        /*
         * Fallback untuk layout metadata vertikal.
         */
        for (
          let nextRow = rowIndex + 1;
          nextRow <=
          Math.min(
            rows.length - 1,
            rowIndex + belowDistance
          );
          nextRow += 1
        ) {
          const value =
            cleanPreviewMetadataValue(
              rows[nextRow]?.[
              colIndex
              ]
            );

          if (
            value === '' ||
            value === ':' ||
            isPreviewMetadataLabel(value)
          ) {
            continue;
          }

          return value;
        }
      }
    }

    return '';
  };

  const PREVIEW_MONTH_MAP:
    Record<string, string> = {
    january: '01',
    jan: '01',
    february: '02',
    feb: '02',
    march: '03',
    mar: '03',
    april: '04',
    apr: '04',
    may: '05',
    june: '06',
    jun: '06',
    july: '07',
    jul: '07',
    august: '08',
    aug: '08',
    september: '09',
    sep: '09',
    october: '10',
    oct: '10',
    november: '11',
    nov: '11',
    december: '12',
    dec: '12'
  };

  const normalizePreviewPeriod = (
    value: unknown
  ): string => {
    const raw =
      String(value ?? '')
        .trim();

    if (raw === '') {
      return '';
    }

    const clean =
      raw
        .toLowerCase()
        .replace(
          /\b(?:period|periode|pack[\s_-]*mont|pack[\s_-]*month)\b/g,
          ' '
        )
        .replace(/[:=]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    /*
     * 2026 August / 2026 Aug / 2026 08
     */
    const yearMonth =
      clean.match(
        /(20\d{2})[\s/_.-]+([a-z]+|\d{1,2})/i
      );

    if (yearMonth) {
      const year =
        yearMonth[1];

      const monthText =
        String(
          yearMonth[2] ?? ''
        ).toLowerCase();

      const month =
        /^\d+$/.test(monthText)
          ? String(
            Number(monthText)
          ).padStart(2, '0')
          : PREVIEW_MONTH_MAP[
          monthText
          ] ?? '';

      if (
        /^(0[1-9]|1[0-2])$/.test(
          month
        )
      ) {
        return year + month;
      }
    }

    /*
     * August 2026 / 08 2026
     */
    const monthYear =
      clean.match(
        /([a-z]+|\d{1,2})[\s/_.-]+(20\d{2})/i
      );

    if (monthYear) {
      const monthText =
        String(
          monthYear[1] ?? ''
        ).toLowerCase();

      const year =
        monthYear[2];

      const month =
        /^\d+$/.test(monthText)
          ? String(
            Number(monthText)
          ).padStart(2, '0')
          : PREVIEW_MONTH_MAP[
          monthText
          ] ?? '';

      if (
        /^(0[1-9]|1[0-2])$/.test(
          month
        )
      ) {
        return year + month;
      }
    }

    /*
     * Reg No:
     * 0002/ADM-D101/P1R_/06/2026
     */
    const regNoPeriod =
      clean.match(
        /\/(\d{1,2})\/(20\d{2})(?:\D|$)/
      );

    if (regNoPeriod) {
      const month =
        String(
          Number(
            regNoPeriod[1]
          )
        ).padStart(2, '0');

      if (
        /^(0[1-9]|1[0-2])$/.test(
          month
        )
      ) {
        return (
          regNoPeriod[2] +
          month
        );
      }
    }

    const digits =
      raw.replace(/\D/g, '');

    /*
     * YYYYMM
     */
    const direct =
      digits.match(
        /(20\d{2})(0[1-9]|1[0-2])/
      );

    if (direct) {
      return (
        direct[1] +
        direct[2]
      );
    }

    /*
     * MMYYYY
     */
    const reverse =
      digits.match(
        /(0[1-9]|1[0-2])(20\d{2})/
      );

    if (reverse) {
      return (
        reverse[2] +
        reverse[1]
      );
    }

    return '';
  };

  const findPreviewPeriodText = (
    rows: ExcelCell[][]
  ): string => {
    const maxRows =
      Math.min(
        rows.length,
        20
      );

    for (
      let rowIndex = 0;
      rowIndex < maxRows;
      rowIndex += 1
    ) {
      const row =
        rows[rowIndex] ?? [];

      for (
        let colIndex = 0;
        colIndex < row.length;
        colIndex += 1
      ) {
        const raw =
          String(
            row[colIndex] ?? ''
          ).trim();

        if (
          !/(?:period|periode|pack[\s_-]*mont|pack[\s_-]*month)/i.test(
            raw
          )
        ) {
          continue;
        }

        if (
          normalizePreviewPeriod(
            raw
          ) !== ''
        ) {
          return raw;
        }

        for (
          let next = colIndex + 1;
          next <=
          Math.min(
            row.length - 1,
            colIndex + 12
          );
          next += 1
        ) {
          const nextValue =
            cleanPreviewMetadataValue(
              row[next]
            );

          if (
            nextValue === '' ||
            nextValue === ':'
          ) {
            continue;
          }

          const combined =
            `${raw} ${nextValue}`.trim();

          if (
            normalizePreviewPeriod(
              combined
            ) !== ''
          ) {
            return combined;
          }
        }
      }
    }

    return '';
  };

  const looksLikePreviewRevisionValue = (
    value: unknown
  ): boolean => {
    const raw =
      String(value ?? '')
        .trim()
        .replace(',', '.');

    if (
      raw === '' ||
      raw === ':'
    ) {
      return false;
    }

    return (
      /^\d+(?:\.\d+)?$/.test(
        raw
      )
    );
  };

  const findPreviewRevisionText = (
    rows: ExcelCell[][]
  ): string => {
    const revisionLabels =
      new Set([
        compactPreviewToken(
          'Revision'
        ),
        compactPreviewToken(
          'Rev'
        ),
        compactPreviewToken(
          'REV_NO'
        )
      ]);

    for (
      let rowIndex = 0;
      rowIndex < rows.length;
      rowIndex += 1
    ) {
      const row =
        rows[rowIndex] ?? [];

      for (
        let colIndex = 0;
        colIndex < row.length;
        colIndex += 1
      ) {
        const rawCell =
          row[colIndex];

        const inlineValue =
          findPreviewInlineMetadataValue(
            rawCell,
            revisionLabels
          );

        if (
          inlineValue !== '' &&
          looksLikePreviewRevisionValue(
            inlineValue
          )
        ) {
          return inlineValue;
        }

        const token =
          compactPreviewToken(
            rawCell
          );

        if (
          !revisionLabels.has(
            token
          )
        ) {
          continue;
        }

        /*
         * Sama seperti parser backend:
         * 1. cari kanan label,
         * 2. cari sampai 3 row di atas,
         * 3. cari sampai 5 row di bawah.
         *
         * Beberapa file ADM menyimpan 0.1 di BI6,
         * sedangkan label Revision berada di BA7.
         */
        for (
          let nextCol = colIndex + 1;
          nextCol <=
          Math.min(
            row.length - 1,
            colIndex + 25
          );
          nextCol += 1
        ) {
          const value =
            row[nextCol];

          if (
            looksLikePreviewRevisionValue(
              value
            )
          ) {
            return String(
              value
            ).trim();
          }
        }

        for (
          let prevRow =
            Math.max(
              0,
              rowIndex - 3
            );
          prevRow < rowIndex;
          prevRow += 1
        ) {
          const candidateRow =
            rows[prevRow] ?? [];

          for (
            let nextCol = colIndex;
            nextCol <=
            Math.min(
              candidateRow.length - 1,
              colIndex + 25
            );
            nextCol += 1
          ) {
            const value =
              candidateRow[
              nextCol
              ];

            if (
              looksLikePreviewRevisionValue(
                value
              )
            ) {
              return String(
                value
              ).trim();
            }
          }
        }

        for (
          let nextRow = rowIndex + 1;
          nextRow <=
          Math.min(
            rows.length - 1,
            rowIndex + 5
          );
          nextRow += 1
        ) {
          const candidateRow =
            rows[nextRow] ?? [];

          for (
            let nextCol = colIndex;
            nextCol <=
            Math.min(
              candidateRow.length - 1,
              colIndex + 25
            );
            nextCol += 1
          ) {
            const value =
              candidateRow[
              nextCol
              ];

            if (
              looksLikePreviewRevisionValue(
                value
              )
            ) {
              return String(
                value
              ).trim();
            }
          }
        }

        return '';
      }
    }

    return '';
  };

  const addMonthsToPreviewPeriod = (
    period: string,
    offset: number
  ): string => {
    if (
      !/^\d{6}$/.test(period)
    ) {
      return '';
    }

    const year =
      Number(
        period.slice(0, 4)
      );

    const month =
      Number(
        period.slice(4, 6)
      );

    const date =
      new Date(
        year,
        month - 1 + offset,
        1
      );

    return (
      String(
        date.getFullYear()
      ) +
      String(
        date.getMonth() + 1
      ).padStart(2, '0')
    );
  };

  const toPreviewNumber = (
    value: unknown
  ): number => {
    if (typeof value === 'number') {
      return Number.isFinite(value)
        ? value
        : 0;
    }

    const original =
      String(value ?? '').trim();

    if (original === '') {
      return 0;
    }

    // Aman untuk nilai hasil format Excel seperti $7,500, Rp 7.500, 7.500,00, dll.
    const negativeByParentheses =
      /^\(.*\)$/.test(original);

    let raw = original
      .replace(/\s/g, '')
      .replace(/[^0-9,.-]/g, '');

    if (raw === '' || raw === '-') {
      return 0;
    }

    if (negativeByParentheses) {
      raw = raw.replace(/-/g, '');
    }

    const lastDot = raw.lastIndexOf('.');
    const lastComma = raw.lastIndexOf(',');

    if (lastDot >= 0 && lastComma >= 0) {
      // Separator yang paling kanan dianggap decimal separator.
      if (lastComma > lastDot) {
        // 7.500,25 -> 7500.25
        raw = raw
          .replace(/\./g, '')
          .replace(',', '.');
      } else {
        // 7,500.25 -> 7500.25
        raw = raw.replace(/,/g, '');
      }
    } else if (
      /^-?\d{1,3}([.,]\d{3})+$/.test(raw)
    ) {
      // 7.500 / 7,500 -> 7500
      raw = raw.replace(/[.,]/g, '');
    } else if (lastComma >= 0) {
      // 7500,25 -> 7500.25
      raw = raw.replace(',', '.');
    }

    const number = Number(raw);

    if (!Number.isFinite(number)) {
      return 0;
    }

    return negativeByParentheses
      ? -Math.abs(number)
      : number;
  };

  /**
   * Khusus preview NTC: KANBAN / DAY ditampilkan sebagai bilangan bulat
   * tanpa mengubah nilai asli yang dibaca dari file.
   * Contoh raw 3.84 tetap 3.84 di data preview, tetapi UI menampilkan 4.
   */
  const getExcelPreviewDisplayValue = (
    value: ExcelCell,
    columnIndex: number
  ): ExcelCell => {
    if (excelPreviewSummary.value.mode === 'DPM') {
      const headerKey = compactPreviewToken(
        excelPreviewHeaders.value[columnIndex] ?? ''
      );

      return ['QTY', 'N+1', 'N+2', 'N+3'].includes(headerKey)
        ? formatNumber(value)
        : value;
    }

    if (excelPreviewSummary.value.mode !== 'NTC') {
      return value;
    }

    const headerKey = String(
      excelPreviewHeaders.value[columnIndex] ?? ''
    )
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');

    if (headerKey !== 'KANBANDAY') {
      return value;
    }

    const text = String(value ?? '').trim();

    if (text === '') {
      return value;
    }

    return Math.round(
      toPreviewNumber(value)
    );
  };

  const getPreviewColumnIndexByKey = (
    headerRow: ExcelCell[],
    key: string
  ): number => {
    return headerRow.findIndex(
      (header) =>
        getPreviewHeaderKey(header) ===
        key
    );
  };

  const getPreviewSupplierCode = (
    rows: ExcelCell[][],
    headerRow: ExcelCell[],
    dataRows: ExcelCell[][]
  ): string => {
    const explicit =
      findPreviewMetadataValue(
        rows,
        [
          'Supplier Code',
          'Supplier Cd',
          'Supplier'
        ]
      );

    if (explicit !== '') {
      return explicit;
    }

    const supplierIndex =
      getPreviewColumnIndexByKey(
        headerRow,
        'supplierCode'
      );

    if (supplierIndex >= 0) {
      const fromColumn =
        String(
          dataRows[0]?.[
          supplierIndex
          ] ?? ''
        ).trim();

      if (fromColumn !== '') {
        return fromColumn;
      }
    }

    /*
     * TMMIN existing hanya mengenal supplier T034/TMAJ.
     * Cari token tersebut sebagai fallback, bukan nama bebas.
     */
    for (const row of rows) {
      for (const cell of row) {
        const token =
          String(cell ?? '')
            .trim()
            .toUpperCase();

        if (
          token === 'T034' ||
          token === 'TMAJ'
        ) {
          return token;
        }
      }
    }

    return '';
  };

  const isTmminPreviewWorkbook = (
    headerRow: ExcelCell[],
    rows: ExcelCell[][]
  ): boolean => {
    const selectedCustomer =
      String(
        selectedCustomerUpload.value ??
        ''
      )
        .trim()
        .toUpperCase();

    if (
      selectedCustomer === 'TMMIN'
    ) {
      return true;
    }

    const keys =
      new Set(
        headerRow
          .map(getPreviewHeaderKey)
          .filter(Boolean)
      );

    if (
      keys.has('companyCode') &&
      keys.has('period')
    ) {
      return true;
    }

    return (
      getPreviewSupplierCode(
        rows,
        headerRow,
        []
      ) !== ''
    );
  };

  const formatTmminPreviewRevision = (
    _value: unknown
  ): string => {
    // REV_NO source TMMIN tidak menjadi revision aplikasi. Revision preview
    // selalu mengikuti hasil deteksi urutan upload periode yang aktif.
    return normalizedUploadRevision.value || '-';
  };

  const normalizeNtcPreviewMonth = (
    value: unknown
  ): string => {
    const text = String(value ?? '')
      .trim()
      .toUpperCase();

    const monthMap: Record<string, string> = {
      JAN: 'JAN',
      JANUARY: 'JAN',
      FEB: 'FEB',
      FEBRUARY: 'FEB',
      MAR: 'MAR',
      MARCH: 'MAR',
      APR: 'APR',
      APRIL: 'APR',
      MAY: 'MAY',
      JUN: 'JUN',
      JUNE: 'JUN',
      JUL: 'JUL',
      JULY: 'JUL',
      AUG: 'AUG',
      AUGUST: 'AUG',
      SEP: 'SEP',
      SEPT: 'SEP',
      SEPTEMBER: 'SEP',
      OCT: 'OCT',
      OCTOBER: 'OCT',
      NOV: 'NOV',
      NOVEMBER: 'NOV',
      DEC: 'DEC',
      DECEMBER: 'DEC'
    };

    const token = text
      .replace(/[^A-Z]/g, ' ')
      .trim()
      .split(/\s+/)[0] || '';

    return monthMap[token] || '';
  };

  const getNtcPreviewPeriod = (
    rows: ExcelCell[][],
    forecastLabels: string[]
  ): string => {
    const fromRows =
      normalizePreviewPeriod(
        findPreviewPeriodText(rows)
      );

    if (fromRows !== '') {
      return fromRows;
    }

    const sourceText = [
      activePreviewFile.value?.name || '',
      ...rows.slice(0, 18).flat().map(
        (value) => String(value ?? '')
      ),
      ...forecastLabels
    ].join(' ').toUpperCase();

    const monthMap: Record<string, string> = {
      JAN: '01',
      JANUARY: '01',
      FEB: '02',
      FEBRUARY: '02',
      MAR: '03',
      MARCH: '03',
      APR: '04',
      APRIL: '04',
      MAY: '05',
      JUN: '06',
      JUNE: '06',
      JUL: '07',
      JULY: '07',
      AUG: '08',
      AUGUST: '08',
      SEP: '09',
      SEPT: '09',
      SEPTEMBER: '09',
      OCT: '10',
      OCTOBER: '10',
      NOV: '11',
      NOVEMBER: '11',
      DEC: '12',
      DECEMBER: '12'
    };

    const match = sourceText.match(
      /\b(JAN(?:UARY)?|FEB(?:RUARY)?|MAR(?:CH)?|APR(?:IL)?|MAY|JUN(?:E)?|JUL(?:Y)?|AUG(?:UST)?|SEP(?:T(?:EMBER)?)?|OCT(?:OBER)?|NOV(?:EMBER)?|DEC(?:EMBER)?)['\s._/-]*(20)?(\d{2})\b/i
    );

    if (!match) {
      return '';
    }

    const month =
      monthMap[
        String(match[1] ?? '')
          .toUpperCase()
      ] || '';

    const year =
      `${match[2] || '20'}${match[3] || ''}`;

    return (
      month !== '' &&
      /^\d{4}$/.test(year)
    )
      ? `${year}${month}`
      : '';
  };

  const buildNtcReadablePreview = (
    rawRows: ExcelCell[][]
  ): {
    headers: string[];
    rows: ExcelCell[][];
    headerRowNumber: number;
    summary: MdfoPreviewSummary;
    forecast: MdfoPreviewForecastItem[];
  } => {
    const meaningfulRows = rawRows.filter(
      (row) => row.some(hasCellValue)
    );

    if (meaningfulRows.length === 0) {
      throw new Error(
        'Sheet NTC tidak memiliki data yang dapat ditampilkan'
      );
    }

    const compact = (value: unknown): string => {
      return String(value ?? '')
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');
    };

    const required = [
      'NO',
      'KBNCODE',
      'PARTNO',
      'PROCESSORDER',
      'PCSM',
      'PCSD',
      'BOXTYPE',
      'QTYBOX',
      'KANBANDAY',
      'MODEL'
    ];

    const headerIndex = meaningfulRows.findIndex(
      (row) => {
        const headers = row.map(compact);

        return required.every(
          (header) => headers.includes(header)
        );
      }
    );

    if (headerIndex < 0) {
      throw new Error(
        'Header Raw MDFO NTC tidak ditemukan'
      );
    }

    const headerRow =
      meaningfulRows[headerIndex] || [];

    const headerTokens =
      headerRow.map(compact);

    const findIndex = (name: string): number =>
      headerTokens.indexOf(name);

    const indexes = {
      no: findIndex('NO'),
      kbnCode: findIndex('KBNCODE'),
      partNo: findIndex('PARTNO'),
      processOrder: findIndex('PROCESSORDER'),
      pcsM: findIndex('PCSM'),
      pcsD: findIndex('PCSD'),
      boxType: findIndex('BOXTYPE'),
      qtyBox: findIndex('QTYBOX'),
      kanbanDay: findIndex('KANBANDAY'),
      model: findIndex('MODEL')
    };

    const forecastIndexes: number[] = [];

    for (
      let index = indexes.kanbanDay + 1;
      index < indexes.model;
      index += 1
    ) {
      forecastIndexes.push(index);
    }

    if (forecastIndexes.length < 3) {
      throw new Error(
        'Raw MDFO NTC harus mempunyai 3 kolom forecast sebelum MODEL'
      );
    }

    const usedForecastIndexes =
      forecastIndexes.slice(0, 3);

    const possibleMonthRow =
      meaningfulRows[headerIndex + 1] || [];

    const possibleMonthLabels =
      usedForecastIndexes.map(
        (index) =>
          normalizeNtcPreviewMonth(
            possibleMonthRow[index]
          )
      );

    const hasMonthSubHeader =
      possibleMonthLabels.filter(Boolean)
        .length >= 2 &&
      !hasCellValue(
        possibleMonthRow[indexes.partNo]
      );

    let monthLabels =
      hasMonthSubHeader
        ? possibleMonthLabels
        : usedForecastIndexes.map(
          (index) =>
            normalizeNtcPreviewMonth(
              headerRow[index]
            )
        );

    const period =
      getNtcPreviewPeriod(
        meaningfulRows,
        [
          ...possibleMonthRow,
          ...headerRow
        ].map((value) => String(value ?? ''))
      );

    const shortMonthLabels = [
      'JAN', 'FEB', 'MAR', 'APR',
      'MAY', 'JUN', 'JUL', 'AUG',
      'SEP', 'OCT', 'NOV', 'DEC'
    ];

    const currentMonthLabel =
      period !== ''
        ? shortMonthLabels[
          Number(period.slice(4, 6)) - 1
        ] || 'M'
        : 'M';

    const periodMonths =
      [1, 2, 3].map(
        (offset) => {
          const base =
            period !== ''
              ? addMonthsToPreviewPeriod(
                period,
                offset
              )
              : '';

          if (base === '') {
            return '';
          }

          const month =
            Number(base.slice(4, 6));

          return shortMonthLabels[month - 1] || '';
        }
      );

    monthLabels = monthLabels.map(
      (label, index) =>
        label ||
        periodMonths[index] ||
        `F${index + 1}`
    );

    const dataStart =
      headerIndex +
      (hasMonthSubHeader ? 2 : 1);

    const sourceDataRows =
      meaningfulRows
        .slice(dataStart)
        .filter(
          (row) =>
            hasCellValue(
              row[indexes.partNo]
            )
        );

    const canonicalIndexes = [
      indexes.no,
      indexes.kbnCode,
      indexes.partNo,
      indexes.processOrder,
      indexes.pcsM,
      indexes.pcsD,
      indexes.boxType,
      indexes.qtyBox,
      indexes.kanbanDay,
      ...usedForecastIndexes,
      indexes.model
    ];

    const headers = [
      'NO.',
      'KBN CODE',
      'PART NO.',
      'PROCESS ORDER',
      'PCS / M',
      'PCS / D',
      'BOX TYPE',
      'QTY / BOX',
      'KANBAN / DAY',
      monthLabels[0],
      monthLabels[1],
      monthLabels[2],
      'MODEL'
    ];

    const previewRows =
      sourceDataRows
        .slice(0, 100)
        .map(
          (row) =>
            canonicalIndexes.map(
              (index) =>
                row[index] ?? ''
            )
        );

    const currentPeriodTotal =
      sourceDataRows.reduce(
        (sum, row) =>
          sum +
          toPreviewNumber(
            row[indexes.pcsM]
          ),
        0
      );

    const forecast: MdfoPreviewForecastItem[] = [
      {
        key: currentMonthLabel,
        period,
        periodLabel:
          period !== ''
            ? formatPeriodLabel(period)
            : currentMonthLabel,
        total: currentPeriodTotal
      },
      ...usedForecastIndexes.map(
        (sourceIndex, index) => {
          const total =
            sourceDataRows.reduce(
              (sum, row) =>
                sum +
                toPreviewNumber(
                  row[sourceIndex]
                ),
              0
            );

          const forecastPeriod =
            period !== ''
              ? addMonthsToPreviewPeriod(
                period,
                index + 1
              )
              : '';

          return {
            key: monthLabels[index],
            period: forecastPeriod,
            periodLabel:
              forecastPeriod !== ''
                ? formatPeriodLabel(
                  forecastPeriod
                )
                : monthLabels[index],
            total
          };
        }
      )
    ];

    return {
      headers,
      rows: previewRows,
      headerRowNumber: headerIndex + 1,
      summary: {
        mode: 'NTC',
        customer: 'NTC',
        period,
        periodLabel:
          period !== ''
            ? formatPeriodLabel(period)
            : '-',
        revision: normalizedUploadRevision.value || '0',
        regNo: '-',
        dockCode: '-',
        vendorCode: '-',
        vendorName: '-',
        vendorAddress: '-',
        supplierCode: '-',
        companyCode: '-',
        totalRows: sourceDataRows.length
      },
      forecast
    };
  };


  const normalizeGayaPreviewPartNumber = (
    value: unknown
  ): string => {
    let part = String(value ?? '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '');

    part = part.replace(/^VV-/, '');
    part = part.replace(/^[A-Z](?=\d)/, '');
    part = part.replace(/\.+$/, '');

    if (part !== '' && !/-00$/.test(part)) {
      part += '-00';
    }

    if (part === '51311-BZ020-00') {
      part += '.';
    }

    return part;
  };


  const parseGayaPreviewDate = (
    value: unknown
  ): Date | null => {
    if (
      value instanceof Date &&
      !Number.isNaN(value.getTime())
    ) {
      return new Date(
        value.getFullYear(),
        value.getMonth(),
        value.getDate()
      );
    }

    if (
      typeof value === 'number' &&
      Number.isFinite(value) &&
      value >= 20000 &&
      value <= 90000
    ) {
      const parsed =
        XLSX.SSF.parse_date_code(value);

      if (
        parsed &&
        Number.isFinite(parsed.y) &&
        Number.isFinite(parsed.m) &&
        Number.isFinite(parsed.d)
      ) {
        return new Date(
          parsed.y,
          parsed.m - 1,
          parsed.d
        );
      }
    }

    const text =
      String(value ?? '').trim();

    if (text === '') {
      return null;
    }

    const ymd =
      text.match(
        /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/
      );

    if (ymd) {
      const year = Number(ymd[1]);
      const month = Number(ymd[2]);
      const day = Number(ymd[3]);

      const date =
        new Date(year, month - 1, day);

      return Number.isNaN(date.getTime())
        ? null
        : date;
    }

    const dmy =
      text.match(
        /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/
      );

    if (dmy) {
      const day = Number(dmy[1]);
      const month = Number(dmy[2]);
      let year = Number(dmy[3]);

      if (year < 100) {
        year += year >= 70
          ? 1900
          : 2000;
      }

      const date =
        new Date(year, month - 1, day);

      return Number.isNaN(date.getTime())
        ? null
        : date;
    }

    return null;
  };


  const formatGayaPreviewPeriod = (
    date: Date
  ): string => {
    return [
      String(date.getFullYear()),
      String(date.getMonth() + 1)
        .padStart(2, '0')
    ].join('');
  };


  const buildGayaReadablePreview = (
    rawRows: ExcelCell[][]
  ): {
    headers: string[];
    rows: ExcelCell[][];
    headerRowNumber: number;
    summary: MdfoPreviewSummary;
    forecast: MdfoPreviewForecastItem[];
  } => {
    const headerIndexes: number[] = [];

    rawRows.forEach(
      (row, rowIndex) => {
        const a =
          String(row[0] ?? '')
            .trim()
            .toUpperCase();

        const b =
          String(row[1] ?? '')
            .trim()
            .toUpperCase();

        const e =
          String(row[4] ?? '')
            .trim()
            .toUpperCase();

        const f =
          String(row[5] ?? '')
            .trim()
            .toUpperCase();

        if (
          a === 'NO' &&
          b.includes('NO PART') &&
          e.includes('NO JOB') &&
          f.includes('PART NAME')
        ) {
          headerIndexes.push(rowIndex);
        }
      }
    );

    if (headerIndexes.length === 0) {
      throw new Error(
        'Header Gaya Motor tidak ditemukan. Pastikan file mempunyai kolom NO, NO PART, NO JOB, dan PART NAME.'
      );
    }

    type GayaBlockInfo = {
      headerIndex: number;
      nextHeaderIndex: number;
      dateHeaderIndex: number;
      periodColumns: Record<string, Record<number, number>>;
    };

    const blockInfos: GayaBlockInfo[] = [];
    const periodCounts = new Map<string, number>();

    headerIndexes.forEach(
      (
        headerIndex,
        headerPosition
      ) => {
        const nextHeaderIndex =
          headerIndexes[
            headerPosition + 1
          ] ?? rawRows.length;

        let bestDateHeaderIndex = -1;
        let bestDateCellCount = 0;
        let bestPeriodColumns:
          Record<string, Record<number, number>> = {};

        const candidateEnd =
          Math.min(
            headerIndex + 4,
            nextHeaderIndex - 1,
            rawRows.length - 1
          );

        for (
          let candidateIndex =
            headerIndex + 1;
          candidateIndex <= candidateEnd;
          candidateIndex += 1
        ) {
          const row =
            rawRows[candidateIndex] ?? [];

          const periodColumns:
            Record<string, Record<number, number>> = {};

          let dateCellCount = 0;

          for (
            let columnIndex = 7;
            columnIndex < row.length;
            columnIndex += 1
          ) {
            const date =
              parseGayaPreviewDate(
                row[columnIndex]
              );

            if (!date) {
              continue;
            }

            const period =
              formatGayaPreviewPeriod(
                date
              );

            const day =
              date.getDate();

            if (!periodColumns[period]) {
              periodColumns[period] = {};
            }

            periodColumns[period][day] =
              columnIndex;

            dateCellCount += 1;
          }

          if (
            dateCellCount >
            bestDateCellCount
          ) {
            bestDateCellCount =
              dateCellCount;

            bestDateHeaderIndex =
              candidateIndex;

            bestPeriodColumns =
              periodColumns;
          }
        }

        if (
          bestDateHeaderIndex < 0 ||
          Object.keys(
            bestPeriodColumns
          ).length === 0
        ) {
          return;
        }

        Object.entries(
          bestPeriodColumns
        ).forEach(
          ([period, columns]) => {
            periodCounts.set(
              period,
              (
                periodCounts.get(
                  period
                ) ?? 0
              ) +
              Object.keys(columns).length
            );
          }
        );

        blockInfos.push({
          headerIndex,
          nextHeaderIndex,
          dateHeaderIndex:
            bestDateHeaderIndex,
          periodColumns:
            bestPeriodColumns
        });
      }
    );

    if (
      blockInfos.length === 0 ||
      periodCounts.size === 0
    ) {
      throw new Error(
        'Header tanggal Gaya Motor tidak ditemukan pada file.'
      );
    }

    const period =
      Array.from(
        periodCounts.entries()
      )
        .sort(
          (first, second) =>
            second[1] - first[1]
        )[0]?.[0] ?? '';

    if (!/^\d{6}$/.test(period)) {
      throw new Error(
        'Periode Gaya Motor tidak dapat ditentukan dari header tanggal.'
      );
    }

    type GayaPreviewRow = {
      no: number;
      partRaw: string;
      partNormalized: string;
      noJob: string;
      partName: string;
      summaryPo: number;
      dailyForecast: number;
      n1: number;
      n2: number;
      n3: number;
      days: Record<number, number>;
    };

    const merged =
      new Map<number, GayaPreviewRow>();

    blockInfos.forEach(
      (block) => {
        const dateColumns =
          block.periodColumns[
            period
          ] ?? {};

        const dateColumnEntries =
          Object.entries(
            dateColumns
          ).map(
            ([day, columnIndex]) =>
              [
                Number(day),
                Number(columnIndex)
              ] as const
          );

        if (
          dateColumnEntries.length === 0
        ) {
          return;
        }

        const headerRow =
          rawRows[
            block.headerIndex
          ] ?? [];

        const forecastHeader =
          String(
            headerRow[7] ?? ''
          )
            .trim()
            .toUpperCase();

        const minDateColumn =
          Math.min(
            ...dateColumnEntries.map(
              ([, columnIndex]) =>
                columnIndex
            )
          );

        const hasForecastColumns =
          forecastHeader.includes(
            'FORECAST'
          ) ||
          minDateColumn >= 13;

        const dataStartIndex =
          Math.max(
            block.headerIndex + 1,
            block.dateHeaderIndex + 1
          );

        const dataEndIndex =
          Math.min(
            rawRows.length - 1,
            block.nextHeaderIndex - 1
          );

        for (
          let rowIndex =
            dataStartIndex;
          rowIndex <= dataEndIndex;
          rowIndex += 1
        ) {
          const row =
            rawRows[rowIndex] ?? [];

          const no =
            Number(
              String(
                row[0] ?? ''
              ).trim()
            );

          const partRaw =
            String(
              row[1] ?? ''
            ).trim();

          if (
            !Number.isFinite(no) ||
            no <= 0 ||
            partRaw === ''
          ) {
            continue;
          }

          const sequence =
            Math.trunc(no);

          let current =
            merged.get(sequence);

          if (!current) {
            current = {
              no: sequence,
              partRaw,
              partNormalized:
                normalizeGayaPreviewPartNumber(
                  partRaw
                ),
              noJob:
                String(
                  row[4] ?? ''
                ).trim(),
              partName:
                String(
                  row[5] ?? ''
                ).trim(),
              summaryPo: 0,
              dailyForecast: 0,
              n1: 0,
              n2: 0,
              n3: 0,
              days: {}
            };

            merged.set(
              sequence,
              current
            );
          } else {
            if (
              current.noJob === ''
            ) {
              current.noJob =
                String(
                  row[4] ?? ''
                ).trim();
            }

            if (
              current.partName === ''
            ) {
              current.partName =
                String(
                  row[5] ?? ''
                ).trim();
            }
          }

          if (hasForecastColumns) {
            current.summaryPo =
              toPreviewNumber(
                row[7]
              );

            current.dailyForecast =
              toPreviewNumber(
                row[8]
              );

            // row[9] = +/- dan sengaja tidak dimasukkan.

            current.n1 =
              toPreviewNumber(
                row[10]
              );

            current.n2 =
              toPreviewNumber(
                row[11]
              );

            current.n3 =
              toPreviewNumber(
                row[12]
              );
          }

          dateColumnEntries.forEach(
            ([day, columnIndex]) => {
              if (
                day < 1 ||
                day > 31
              ) {
                return;
              }

              current!.days[day] =
                toPreviewNumber(
                  row[columnIndex]
                );
            }
          );
        }
      }
    );

    const mergedRows =
      Array.from(
        merged.values()
      ).sort(
        (first, second) =>
          first.no - second.no
      );

    if (mergedRows.length === 0) {
      throw new Error(
        'Data Gaya Motor tidak ditemukan setelah blok file digabung.'
      );
    }

    const year =
      Number(period.slice(0, 4));

    const month =
      Number(period.slice(4, 6));

    const daysInMonth =
      new Date(
        year,
        month,
        0
      ).getDate();

    const dayHeaders =
      Array.from(
        {
          length:
            daysInMonth
        },
        (_, index) =>
          String(index + 1)
      );

    const headers = [
      'NO',
      'NO PART',
      'NO PART NORMALIZED',
      'NO JOB',
      'PART NAME',
      'Sum PO',
      'Daily Frc',
      'N+1',
      'N+2',
      'N+3',
      ...dayHeaders,
      'Total'
    ];

    const rows =
      mergedRows
        .slice(0, 100)
        .map(
          (row) => {
            const dailyValues =
              Array.from(
                {
                  length:
                    daysInMonth
                },
                (_, index) =>
                  row.days[
                    index + 1
                  ] ?? 0
              );

            const total =
              dailyValues.reduce(
                (
                  sum,
                  value
                ) =>
                  sum +
                  toPreviewNumber(
                    value
                  ),
                0
              );

            return [
              row.no,
              row.partRaw,
              row.partNormalized,
              row.noJob,
              row.partName,
              row.summaryPo,
              row.dailyForecast,
              row.n1,
              row.n2,
              row.n3,
              ...dailyValues,
              total
            ];
          }
        );

    const sum =
      (
        getter:
          (
            row: GayaPreviewRow
          ) => number
      ): number =>
        mergedRows.reduce(
          (
            total,
            row
          ) =>
            total +
            getter(row),
          0
        );

    const forecast:
      MdfoPreviewForecastItem[] = [
        {
          key: 'Summary PO',
          period,
          periodLabel:
            formatPeriodLabel(
              period
            ),
          total:
            sum(
              (row) =>
                row.summaryPo
            )
        },
        {
          key: 'Daily Forecast',
          period,
          periodLabel:
            formatPeriodLabel(
              period
            ),
          total:
            sum(
              (row) =>
                row.dailyForecast
            )
        },
        {
          key: 'N+1',
          period:
            addMonthsToPreviewPeriod(
              period,
              1
            ),
          periodLabel:
            formatPeriodLabel(
              addMonthsToPreviewPeriod(
                period,
                1
              )
            ),
          total:
            sum(
              (row) =>
                row.n1
            )
        },
        {
          key: 'N+2',
          period:
            addMonthsToPreviewPeriod(
              period,
              2
            ),
          periodLabel:
            formatPeriodLabel(
              addMonthsToPreviewPeriod(
                period,
                2
              )
            ),
          total:
            sum(
              (row) =>
                row.n2
            )
        },
        {
          key: 'N+3',
          period:
            addMonthsToPreviewPeriod(
              period,
              3
            ),
          periodLabel:
            formatPeriodLabel(
              addMonthsToPreviewPeriod(
                period,
                3
              )
            ),
          total:
            sum(
              (row) =>
                row.n3
            )
        }
      ];

    return {
      headers,
      rows,
      headerRowNumber:
        headerIndexes[0] + 1,
      summary: {
        mode:
          'GAYA MOTOR',
        customer:
          'GAYA MOTOR',
        period,
        periodLabel:
          formatPeriodLabel(
            period
          ),
        revision:
          normalizedUploadRevision.value || 'Auto',
        regNo:
          '-',
        dockCode:
          '-',
        vendorCode:
          '-',
        vendorName:
          '-',
        vendorAddress:
          '-',
        supplierCode:
          '-',
        companyCode:
          '-',
        totalRows:
          mergedRows.length
      },
      forecast
    };
  };


  const buildAsiAdmReadablePreview = (
    rawRows: ExcelCell[][]
  ): {
    headers: string[];
    rows: ExcelCell[][];
    headerRowNumber: number;
    summary: MdfoPreviewSummary;
    forecast: MdfoPreviewForecastItem[];
  } => {
    const meaningfulRows = rawRows.filter((row) =>
      row.some((cell) => hasCellValue(cell))
    );

    const headerIndex = meaningfulRows.findIndex((row) => {
      const tokens = row.map(compactPreviewToken);

      return (
        tokens.includes('PARTNO') &&
        tokens.includes('PARTNAME') &&
        tokens.includes('QTYKANBAN')
      );
    });

    if (headerIndex < 0) {
      throw new Error(
        'Header ASI ADM tidak ditemukan. Wajib ada Part No, Part Name, dan Qty / Kanban.'
      );
    }

    const headerRow = meaningfulRows[headerIndex] ?? [];
    const partNoIndex = headerRow.findIndex(
      (cell) => compactPreviewToken(cell) === 'PARTNO'
    );
    const partNameIndex = headerRow.findIndex(
      (cell) => compactPreviewToken(cell) === 'PARTNAME'
    );
    const qtyIndex = headerRow.findIndex(
      (cell) => compactPreviewToken(cell) === 'QTYKANBAN'
    );

    if (partNoIndex < 0 || partNameIndex < 0 || qtyIndex < 0) {
      throw new Error('Struktur kolom ASI ADM tidak lengkap.');
    }

    const noIndex = Math.max(0, partNoIndex - 1);
    const nIndex = qtyIndex + 1;
    const n1Index = qtyIndex + 2;
    const n2Index = qtyIndex + 3;
    const n3Index = qtyIndex + 4;
    const firstDayIndex = qtyIndex + 5;
    const monthHeaderRow = meaningfulRows[headerIndex + 1] ?? [];

    const orderDateValue = monthHeaderRow[nIndex];
    let period = '';

    if (orderDateValue instanceof Date && !Number.isNaN(orderDateValue.getTime())) {
      period = `${orderDateValue.getFullYear()}${String(orderDateValue.getMonth() + 1).padStart(2, '0')}`;
    } else {
      period = normalizePreviewPeriod(orderDateValue);
    }

    const sourceDataRows = meaningfulRows
      .slice(headerIndex + 2)
      .filter((row) => hasCellValue(row[partNoIndex]));

    const headers = [
      'No',
      'Part No',
      'Part No. SAP',
      'Part Name',
      'Qty / Kanban',
      'N',
      'N+1',
      'N+2',
      'N+3',
      ...DAY_KEYS.map((_, index) => String(index + 1))
    ];

    const rows = sourceDataRows.slice(0, 100).map((row) => {
      const partNo = String(row[partNoIndex] ?? '').trim();
      const partNoSap = /-00$/i.test(partNo)
        ? partNo
        : partNo !== ''
          ? `${partNo}-00`
          : '';

      return [
        row[noIndex] ?? '',
        partNo,
        partNoSap,
        row[partNameIndex] ?? '',
        row[qtyIndex] ?? '',
        row[nIndex] ?? '',
        row[n1Index] ?? '',
        row[n2Index] ?? '',
        row[n3Index] ?? '',
        ...DAY_KEYS.map((_, index) => row[firstDayIndex + index] ?? '')
      ];
    });

    const metadataValue = (labels: string[]): string =>
      findPreviewMetadataValue(
        meaningfulRows,
        labels,
        { maxRows: 30, rightDistance: 14, belowDistance: 3 }
      );

    const revision = metadataValue(['Revision', 'Rev']) || '0';
    const regNo = metadataValue(['Reg No']) || '-';
    const vendorCode = metadataValue(['Vendor Code']) || '-';
    const vendorName = metadataValue(['Vendor Name']) || '-';
    const vendorAddress = metadataValue(['Vendor Address']) || '-';

    const forecastDefinitions = [
      { key: 'N', index: nIndex, offset: 0 },
      { key: 'N+1', index: n1Index, offset: 1 },
      { key: 'N+2', index: n2Index, offset: 2 },
      { key: 'N+3', index: n3Index, offset: 3 }
    ];

    const forecast: MdfoPreviewForecastItem[] = forecastDefinitions.map((item) => {
      const forecastPeriod = addMonthsToPreviewPeriod(period, item.offset);

      return {
        key: item.key,
        period: forecastPeriod,
        periodLabel: forecastPeriod ? formatPeriodLabel(forecastPeriod) : '-',
        total: sourceDataRows.reduce(
          (sum, row) => sum + toPreviewNumber(row[item.index]),
          0
        )
      };
    });

    return {
      headers,
      rows,
      headerRowNumber: headerIndex + 1,
      summary: {
        mode: 'ADM',
        customer: 'ASI ADM',
        period,
        periodLabel: period ? formatPeriodLabel(period) : '-',
        revision:
          normalizedUploadRevision.value ||
          revision.replace(/^[:\s]+/, '') ||
          '0',
        regNo: regNo.replace(/^[:\s]+/, '') || '-',
        dockCode: '-',
        vendorCode: vendorCode.replace(/^[:\s]+/, '') || '-',
        vendorName: vendorName.replace(/^[:\s]+/, '') || '-',
        vendorAddress: vendorAddress.replace(/^[:\s]+/, '') || '-',
        supplierCode: '-',
        companyCode: '-',
        totalRows: sourceDataRows.length
      },
      forecast
    };
  };

  const buildReadablePreview = (
    rawRows: ExcelCell[][]
  ): {
    headers: string[];
    rows: ExcelCell[][];
    headerRowNumber: number;
    summary: MdfoPreviewSummary;
    forecast: MdfoPreviewForecastItem[];
  } => {
    const meaningfulRows =
      rawRows.filter(
        (row) =>
          row.some(
            (cell) =>
              hasCellValue(cell)
          )
      );

    if (
      meaningfulRows.length === 0
    ) {
      throw new Error(
        'Sheet tidak memiliki data yang dapat ditampilkan'
      );
    }

    const headerIndex =
      findPreviewHeaderRowIndex(
        meaningfulRows
      );

    if (headerIndex < 0) {
      throw new Error(
        'Header tabel MDFO tidak ditemukan. Pastikan file memakai format MDFO yang sesuai.'
      );
    }

    const rawHeader =
      meaningfulRows[
      headerIndex
      ] ?? [];

    const partNoIndex =
      getPreviewColumnIndexByKey(
        rawHeader,
        'partNo'
      );

    const sourceDataRows =
      meaningfulRows
        .slice(
          headerIndex + 1
        )
        .filter(
          (row) => {
            /*
             * Kalau Part No ditemukan, pakai itu untuk membedakan data
             * dengan footer/keterangan setelah tabel.
             */
            if (
              partNoIndex >= 0
            ) {
              return hasCellValue(
                row[partNoIndex]
              );
            }

            return row.some(
              (cell) =>
                hasCellValue(cell)
            );
          }
        );

    /*
     * Hapus kolom yang benar-benar kosong dari header sampai semua data.
     * TMMIN yang lebar tidak lagi penuh kolom kosong.
     */
    const maximumColumns =
      Math.max(
        rawHeader.length,
        ...sourceDataRows.map(
          (row) =>
            row.length
        )
      );

    const usedColumnIndexes:
      number[] = [];

    for (
      let colIndex = 0;
      colIndex < maximumColumns;
      colIndex += 1
    ) {
      const headerHasValue =
        hasCellValue(
          rawHeader[colIndex]
        );

      const dataHasValue =
        sourceDataRows.some(
          (row) =>
            hasCellValue(
              row[colIndex]
            )
        );

      if (
        headerHasValue ||
        dataHasValue
      ) {
        usedColumnIndexes.push(
          colIndex
        );
      }
    }

    const cleanHeaders =
      usedColumnIndexes.map(
        (sourceIndex) => {
          const value =
            String(
              rawHeader[
              sourceIndex
              ] ?? ''
            ).trim();

          return (
            value ||
            `Column ${sourceIndex + 1}`
          );
        }
      );

    /*
     * Preview memakai kolom asli MDFO.
     * Kolom tambahan "Row" tidak diperlukan karena file sudah mempunyai
     * kolom "No".
     */
    const previewHeaders =
      cleanHeaders;

    const previewRows =
      sourceDataRows
        .slice(0, 100)
        .map(
          (row) =>
            usedColumnIndexes.map(
              (sourceIndex) =>
                row[sourceIndex] ?? ''
            )
        );

    const tmmin =
      isTmminPreviewWorkbook(
        rawHeader,
        meaningfulRows
      );

    const periodIndex =
      getPreviewColumnIndexByKey(
        rawHeader,
        'period'
      );

    const revisionIndex =
      getPreviewColumnIndexByKey(
        rawHeader,
        'revision'
      );

    const companyCodeIndex =
      getPreviewColumnIndexByKey(
        rawHeader,
        'companyCode'
      );

    const vendorCodeIndex =
      getPreviewColumnIndexByKey(
        rawHeader,
        'vendorCode'
      );

    const dockCodeIndex =
      getPreviewColumnIndexByKey(
        rawHeader,
        'dockCode'
      );

    const firstDataRow =
      sourceDataRows[0] ?? [];

    const regNo =
      findPreviewMetadataValue(
        meaningfulRows,
        [
          'Reg No',
          'Registration No',
          'Registration Number'
        ],
        {
          maxRows: 30,
          rightDistance: 12,
          belowDistance: 3
        }
      );

    const metadataPeriod =
      findPreviewMetadataValue(
        meaningfulRows,
        [
          'Period',
          'Periode',
          'Pack Mont',
          'Pack Month',
          'PACK_MONT'
        ],
        {
          maxRows: 20,
          rightDistance: 12
        }
      ) ||
      findPreviewPeriodText(
        meaningfulRows
      );

    let period =
      normalizePreviewPeriod(
        metadataPeriod
      );

    if (
      period === '' &&
      periodIndex >= 0
    ) {
      period =
        normalizePreviewPeriod(
          firstDataRow[
          periodIndex
          ]
        );
    }

    if (
      period === ''
    ) {
      period =
        normalizePreviewPeriod(
          regNo
        );
    }

    const revision =
      (
        findPreviewRevisionText(
          meaningfulRows
        ) ||
        findPreviewMetadataValue(
          meaningfulRows,
          [
            'Revision',
            'Rev',
            'REV_NO'
          ],
          {
            rightDistance: 25,
            belowDistance: 5
          }
        ) ||
        (
          revisionIndex >= 0
            ? String(
              firstDataRow[
              revisionIndex
              ] ?? ''
            ).trim()
            : ''
        )
      );

    const companyCode =
      (
        findPreviewMetadataValue(
          meaningfulRows,
          [
            'Company Code',
            'Comp Cd',
            'COMP_CD'
          ]
        ) ||
        (
          companyCodeIndex >= 0
            ? String(
              firstDataRow[
              companyCodeIndex
              ] ?? ''
            ).trim()
            : ''
        )
      );

    const supplierCode =
      getPreviewSupplierCode(
        meaningfulRows,
        rawHeader,
        sourceDataRows
      );

    const vendorCode =
      (
        findPreviewMetadataValue(
          meaningfulRows,
          [
            'Vendor Code',
            'Vendor Cd',
            'VENDOR_CD'
          ],
          {
            maxRows: 30,
            rightDistance: 12,
            belowDistance: 3
          }
        ) ||
        (
          vendorCodeIndex >= 0
            ? String(
              firstDataRow[
              vendorCodeIndex
              ] ?? ''
            ).trim()
            : ''
        )
      );

    const vendorName =
      findPreviewMetadataValue(
        meaningfulRows,
        [
          'Vendor Name',
          'Supplier Name',
          'Company Name'
        ],
        {
          maxRows: 40,
          rightDistance: 20,
          belowDistance: 4
        }
      );

    const vendorAddress =
      findPreviewMetadataValue(
        meaningfulRows,
        [
          'Vendor Address',
          'Supplier Address',
          'Address',
          'Alamat'
        ],
        {
          maxRows: 40,
          rightDistance: 24,
          belowDistance: 5
        }
      );

    const dockCode =
      (
        findPreviewMetadataValue(
          meaningfulRows,
          [
            'Dock Code',
            'Dock Cd',
            'DOCK_CD'
          ],
          {
            maxRows: 30,
            rightDistance: 12,
            belowDistance: 3
          }
        ) ||
        (
          dockCodeIndex >= 0
            ? String(
              firstDataRow[
              dockCodeIndex
              ] ?? ''
            ).trim()
            : ''
        )
      );

    const forecastKeys:
      Array<{
        key: 'N' | 'N+1' | 'N+2' | 'N+3';
        lookup: string;
        offset: number;
      }> = [
        {
          key: 'N',
          lookup: 'n',
          offset: 0
        },
        {
          key: 'N+1',
          lookup: 'n1',
          offset: 1
        },
        {
          key: 'N+2',
          lookup: 'n2',
          offset: 2
        },
        {
          key: 'N+3',
          lookup: 'n3',
          offset: 3
        }
      ];

    const forecast =
      forecastKeys.map(
        (item) => {
          const index =
            getPreviewColumnIndexByKey(
              rawHeader,
              item.lookup
            );

          const total =
            index < 0
              ? 0
              : sourceDataRows.reduce(
                (sum, row) =>
                  sum +
                  toPreviewNumber(
                    row[index]
                  ),
                0
              );

          const forecastPeriod =
            addMonthsToPreviewPeriod(
              period,
              item.offset
            );

          return {
            key: item.key,
            period:
              forecastPeriod,
            periodLabel:
              forecastPeriod
                ? formatPeriodLabel(
                  forecastPeriod
                )
                : '-',
            total
          };
        }
      );

    return {
      headers:
        previewHeaders,

      rows:
        previewRows,

      headerRowNumber:
        headerIndex + 1,

      summary: {
        mode:
          tmmin
            ? 'TMMIN'
            : 'ADM',

        customer:
          String(
            selectedCustomerUpload.value ??
            ''
          ).trim(),

        period,

        periodLabel:
          period
            ? formatPeriodLabel(period)
            : '-',

        revision:
          normalizedUploadRevision.value ||
          (
            tmmin
              ? formatTmminPreviewRevision(revision)
              : (revision || '-')
          ),

        regNo:
          tmmin
            ? '-'
            : (
              regNo || '-'
            ),

        dockCode:
          dockCode || '-',

        vendorCode:
          vendorCode ||
          companyCode ||
          supplierCode ||
          '-',

        vendorName:
          vendorName || '-',

        vendorAddress:
          vendorAddress || '-',

        supplierCode:
          supplierCode || '-',

        companyCode:
          companyCode || '-',

        totalRows:
          sourceDataRows.length
      },

      forecast
    };
  };


  const PREVIEW_TABLE_MIN_WIDTHS:
    Record<string, number> = {
    // ADM
    no: 62,
    partNo: 150,
    partNoSap: 155,
    uniqueNo: 110,
    partName: 300,
    qtyKanban: 104,
    poNumber: 120,
    poQty: 88,
    n: 72,
    n1: 72,
    n2: 72,
    n3: 72,

    // TMMIN
    revision: 92,
    period: 110,
    companyCode: 120,
    dockCode: 110,
    supplierCode: 125,
    vendorCode: 115
  };


  const estimateExcelPreviewTextWidth = (
    value: unknown
  ): number => {
    const text =
      String(value ?? '')
        .replace(/\r?\n/g, ' ')
        .trim();

    if (text === '') {
      return 0;
    }

    /*
     * Estimasi lebar font preview 12px.
     * Huruf kapital / angka sedikit lebih lebar daripada spasi.
     */
    let width = 0;

    for (const char of text) {
      if (char === ' ') {
        width += 4;
      } else if (
        /[MW@#%&]/.test(char)
      ) {
        width += 9;
      } else if (
        /[A-Z0-9]/.test(char)
      ) {
        width += 7.4;
      } else {
        width += 6.6;
      }
    }

    // Padding cell kiri + kanan.
    return Math.ceil(width + 28);
  };


  const excelPreviewColumnWidths =
    computed<number[]>(() => {
      return excelPreviewHeaders.value
        .map(
          (
            header,
            headerIndex
          ) => {
            const key =
              getPreviewHeaderKey(
                header
              );

            const compact =
              compactPreviewToken(
                header
              );

            const headerWidth =
              estimateExcelPreviewTextWidth(
                header
              );

            let contentWidth =
              0;

            for (
              const row of excelPreviewRows.value
            ) {
              contentWidth =
                Math.max(
                  contentWidth,
                  estimateExcelPreviewTextWidth(
                    row[
                    headerIndex
                    ]
                  )
                );
            }

            let minimum =
              key
                ? (
                  PREVIEW_TABLE_MIN_WIDTHS[
                  key
                  ] ?? 88
                )
                : 88;

            /*
             * GAYA MOTOR: kolom frozen dibuat lebih padat supaya area
             * tanggal harian (non-frozen) lebih luas saat tabel digeser.
             * Lebar ini sengaja fixed untuk kolom numerik/pendek.
             */
            if (
              excelPreviewSummary.value.mode === 'GAYA MOTOR'
            ) {
              const gayaCompactWidths:
                Record<string, number> = {
                NO: 44,
                SUMPO: 68,
                DAILYFRC: 78,

                // compactPreviewToken() MEMPERTAHANKAN tanda '+'.
                // Jadi header N+1/N+2/N+3 menghasilkan token
                // 'N+1'/'N+2'/'N+3', bukan N1/N2/N3.
                'N+1': 46,
                'N+2': 46,
                'N+3': 46,

                // Alias fallback jika suatu saat header datang tanpa '+'.
                N1: 40,
                N2: 40,
                N3: 40
              };

              const gayaWidth =
                gayaCompactWidths[compact];

              if (gayaWidth) {
                return gayaWidth;
              }
            }

            if (compact === 'UNIT') {
              minimum = 68;
            }

            if (
              /^\d{1,2}$/.test(
                compact
              )
            ) {
              minimum = 58;
            }

            /*
             * Header tidak boleh terpotong.
             * Isi data juga ikut menentukan lebar kolom.
             */
            let width =
              Math.max(
                minimum,
                headerWidth,
                contentWidth
              );

            /*
             * Kolom deskripsi boleh jauh lebih lebar.
             * Kolom biasa tetap dibatasi agar preview masih nyaman digeser.
             */
            const descriptive =
              key === 'partName' ||
              /NAME|ADDRESS|DESCRIPTION|REMARK/.test(
                compact
              );

            const maxWidth =
              descriptive
                ? 620
                : 360;

            width =
              Math.min(
                maxWidth,
                width
              );

            return Math.ceil(
              width
            );
          }
        );
    });


  const excelPreviewTableWidth =
    computed<number>(() => {
      return excelPreviewColumnWidths
        .value
        .reduce(
          (
            total,
            width
          ) =>
            total + width,
          0
        );
    });


  const getExcelPreviewColumnWidth = (
    headerIndex: number
  ): number => {
    return (
      excelPreviewColumnWidths
        .value[
      headerIndex
      ] ??
      96
    );
  };

  // Proporsi kolom preview FTI. Total 100% agar Delivery Date tepat
  // mencapai sisi kanan tabel tanpa menyisakan area kosong.
  const ftiPreviewColumnPercentages = [
    13,
    26,
    7.5,
    7.5,
    7.5,
    7.5,
    10.5,
    9,
    11.5
  ];

  const getFtiPreviewColumnPercentage = (
    headerIndex: number
  ): number => {
    return ftiPreviewColumnPercentages[headerIndex] ?? 10;
  };


  const excelPreviewFrozenColumnCount =
    computed(() => {
      if (
        ['FTI', 'MES'].includes(excelPreviewSummary.value.mode)
      ) {
        // Seluruh kolom FTI sudah muat selebar panel preview.
        return 0;
      }

      if (
        String(selectedCustomerUpload.value ?? '')
          .trim()
          .toUpperCase() === 'ASI ADM'
      ) {
        // ASI ADM: freeze sampai N+3 pada preview (8 kolom pertama setelah No dihilangkan dari tabel Raw utama).
        return Math.min(
          9,
          excelPreviewHeaders.value.length
        );
      }

      if (
        excelPreviewSummary.value.mode === 'GAYA MOTOR'
      ) {
        // Gaya Motor: freeze sampai N+3, yaitu 10 kolom pertama (A:J).
        return Math.min(
          10,
          excelPreviewHeaders.value.length
        );
      }

      if (
        excelPreviewSummary.value.mode === 'NTC'
      ) {
        const processOrderIndex =
          excelPreviewHeaders.value
            .findIndex(
              (header) =>
                compactPreviewToken(header) ===
                'PROCESSORDER'
            );

        return processOrderIndex >= 0
          ? processOrderIndex + 1
          : 0;
      }

      if (
        excelPreviewSummary.value.mode === 'DPM'
      ) {
        const materialIdIndex =
          excelPreviewHeaders.value.findIndex(
            (header) => compactPreviewToken(header) === 'IDMATERIAL'
          );

        return materialIdIndex >= 0
          ? materialIdIndex + 1
          : 0;
      }

      const poQtyIndex =
        excelPreviewHeaders.value
          .findIndex(
            (header) =>
              getPreviewHeaderKey(
                header
              ) === 'poQty'
          );

      /*
       * ADM: freeze dari No sampai PO Qty.
       */
      if (poQtyIndex >= 0) {
        return poQtyIndex + 1;
      }

      const dockCodeIndex =
        excelPreviewHeaders.value
          .findIndex(
            (header) =>
              getPreviewHeaderKey(
                header
              ) === 'dockCode'
          );

      /*
       * TMMIN: freeze dari kolom pertama sampai DOCK_CD.
       * Style sticky, separator, dan shadow tetap memakai helper yang
       * sama dengan ADM agar tampilannya konsisten.
       */
      return dockCodeIndex >= 0
        ? dockCodeIndex + 1
        : 0;
    });


  const getExcelPreviewFrozenLeft = (
    headerIndex: number
  ): number => {
    let left = 0;

    for (
      let index = 0;
      index < headerIndex;
      index += 1
    ) {
      left +=
        getExcelPreviewColumnWidth(
          index
        );
    }

    /*
     * Gunakan offset persis, tanpa pengurangan 1px.
     * Ini menjaga header dan body tetap satu garis ketika scroll
     * mentok kanan maupun dikembalikan ke kiri.
     */
    return left;
  };


  const getExcelPreviewCellStyle = (
    headerIndex: number,
    isHeader = false,
    rowIndex = 0
  ): CSSProperties => {
    const width =
      getExcelPreviewColumnWidth(
        headerIndex
      );

    const isFtiPreview =
      ['FTI', 'MES'].includes(excelPreviewSummary.value.mode);

    const frozen =
      headerIndex <
      excelPreviewFrozenColumnCount.value;

    const isLastFrozen =
      frozen &&
      headerIndex ===
      excelPreviewFrozenColumnCount.value -
      1;

    const backgroundColor =
      isHeader
        ? '#eff6ff'
        : rowIndex % 2 === 0
          ? '#ffffff'
          : '#f8fafc';

    const boxShadows = [
      'inset -1px 0 0 #e2e8f0',
      'inset 0 -1px 0 #e2e8f0'
    ];

    if (isHeader) {
      boxShadows.push(
        'inset 0 1px 0 #e2e8f0'
      );
    }

    if (headerIndex === 0) {
      boxShadows.push(
        'inset 1px 0 0 #e2e8f0'
      );
    }

    if (isLastFrozen) {
      boxShadows.push(
        '2px 0 4px -3px rgba(15, 23, 42, 0.16)'
      );
    }

    const isGayaCenteredCompact =
      excelPreviewSummary.value.mode === 'GAYA MOTOR' &&
      [0, 5, 6, 7, 8, 9].includes(headerIndex);

    const isGayaNForecastCompact =
      excelPreviewSummary.value.mode === 'GAYA MOTOR' &&
      [7, 8, 9].includes(headerIndex);

    const isNtcPreview =
      excelPreviewSummary.value.mode === 'NTC';

    const isNtcCentered =
      isNtcPreview &&
      (
        isHeader ||
        [0, 8].includes(headerIndex)
      );

    const isNtcNumeric =
      isNtcPreview &&
      !isHeader &&
      [4, 5, 7, 9, 10, 11].includes(headerIndex);

    const baseStyle:
      CSSProperties = {
      minWidth:
        isFtiPreview ? '0px' : `${width}px`,
      width:
        isFtiPreview
          ? `${getFtiPreviewColumnPercentage(headerIndex)}%`
          : `${width}px`,
      maxWidth:
        isFtiPreview ? 'none' : `${width}px`,
      boxSizing:
        'border-box',
      // Jangan hanya mengandalkan class Tailwind.
      // Inline style menjamin header + isi N+1..N+3 benar-benar center.
      textAlign:
        isNtcCentered
          ? 'center'
          : isNtcNumeric
            ? 'right'
            : isGayaCenteredCompact
              ? 'center'
              : undefined,
      paddingLeft:
        isGayaNForecastCompact ? '2px' : undefined,
      paddingRight:
        isGayaNForecastCompact ? '2px' : undefined,
      backgroundColor,
      backgroundImage:
        `linear-gradient(${backgroundColor}, ${backgroundColor})`,
      backgroundClip:
        'border-box',
      boxShadow:
        boxShadows.join(', ')
    };

    if (
      isHeader &&
      frozen
    ) {
      return {
        ...baseStyle,
        position:
          'sticky',
        top:
          '0px',
        left:
          `${getExcelPreviewFrozenLeft(headerIndex)}px`,
        zIndex:
          isLastFrozen
            ? 130
            : 125
      };
    }

    if (isHeader) {
      return {
        ...baseStyle,
        position:
          'sticky',
        top:
          '0px',
        zIndex:
          110
      };
    }

    if (frozen) {
      return {
        ...baseStyle,
        position:
          'sticky',
        left:
          `${getExcelPreviewFrozenLeft(headerIndex)}px`,
        zIndex:
          isLastFrozen
            ? 80
            : 70
      };
    }

    return {
      ...baseStyle,
      position:
        'relative',
      zIndex:
        1
    };
  };


  const handleExcelSheetChange = () => {
    loadExcelSheetPreview(selectedExcelSheet.value);
  };
  const loadActiveFilePreview =
    async (): Promise<void> => {
      const manualFti = isFtiManualMode.value;
      const manualMes = isMesManualMode.value;
      const file = activePreviewFile.value;

      if (!manualFti && !manualMes && !file) {
        excelPreviewError.value = 'File preview tidak ditemukan';
        return;
      }

      // Pastikan index valid untuk flow file biasa / FTI OCR.
      if (
        !manualFti && !manualMes &&
        (
          activePreviewFileIndex.value < 0 ||
          activePreviewFileIndex.value >= selectedFiles.value.length
        )
      ) {
        excelPreviewError.value = 'Index file preview tidak valid';
        return;
      }

      isPreviewLoading.value =
        true;

      excelPreviewError.value = '';

      // Reset tampilan preview lama.
      excelWorkbook.value = null;

      excelSheetNames.value = [];

      selectedExcelSheet.value = '';

      excelPreviewHeaders.value = [];

      excelPreviewRows.value = [];

      dpmPreviewWarnings.value = [];

      try {
        if (manualMes) {
          const preview = await mdfoService.previewMesManual(
            mesManualPeriodCompact.value,
            buildMesManualPayloadRows()
          );
          if (preview.status !== 'success') {
            throw new Error(preview.message || 'Input manual MES tidak dapat dipreview');
          }
          excelSheetNames.value = ['MES MANUAL'];
          selectedExcelSheet.value = 'MES MANUAL';
          excelPreviewHeaders.value = preview.headers;
          excelPreviewRows.value = preview.rows;
          const summary = preview.summary;
          const normalizedPeriod = normalizePeriod(summary.period);
          excelPreviewSummary.value = {
            mode: 'MES',
            customer: 'MES',
            period: normalizedPeriod,
            periodLabel: normalizedPeriod !== '' ? formatPeriodLabel(normalizedPeriod) : '-',
            revision: normalizedUploadRevision.value || '-',
            regNo: '-', dockCode: '-', vendorCode: '-', vendorName: '-', vendorAddress: '-',
            supplierCode: '-', companyCode: '-', totalRows: summary.total_rows,
            poNumbers: summary.po_number ? [summary.po_number] : [],
            poDate: summary.po_date || '-',
            deliveryDate: summary.delivery_date || '-',
            totalFiles: 0,
            sourceFiles: ['MANUAL INPUT MES']
          };
          excelPreviewForecastSummary.value = (preview.forecast_summary ?? []).map((forecast) => ({
            key: forecast.key,
            period: forecast.period,
            periodLabel: forecast.period !== '' ? formatPeriodLabel(forecast.period) : '-',
            total: Number(forecast.total) || 0
          }));
          excelPreviewDetectedHeaderRow.value = 1;
          if (!preview.can_upload || preview.mismatches.length > 0) {
            notificationStore.showDialogWarning(
              'Data MES Belum Lengkap',
              preview.mismatches.map((item) => `• ${item.message}`).join('\n') || 'Input manual MES belum lengkap.'
            );
            throw new Error('Input MES belum dapat disubmit.');
          }
          if (excelPreviewHeaders.value.length === 0 || excelPreviewRows.value.length === 0) {
            throw new Error('Data MES tidak dapat ditampilkan pada preview');
          }
          return;
        }

        if (manualFti) {
          const preview = await mdfoService.previewFtiManual(
            ftiManualSourceFiles.value,
            ftiManualPeriodCompact.value,
            buildFtiManualPayloadRows()
          );

          if (preview.status !== 'success') {
            throw new Error(
              preview.message || 'Input manual FTI tidak dapat dipreview'
            );
          }

          excelSheetNames.value = ['FTI MANUAL'];
          selectedExcelSheet.value = 'FTI MANUAL';
          excelPreviewHeaders.value = preview.headers;
          excelPreviewRows.value = preview.rows;

          const summary = preview.summary;
          const normalizedPeriod = normalizePeriod(summary.period);

          excelPreviewSummary.value = {
            mode: 'FTI',
            customer: 'FTI',
            period: normalizedPeriod,
            periodLabel: normalizedPeriod !== ''
              ? formatPeriodLabel(normalizedPeriod)
              : summary.periods.join(', ') || '-',
            revision: normalizedUploadRevision.value || '-',
            regNo: '-',
            dockCode: '-',
            vendorCode: '-',
            vendorName: '-',
            vendorAddress: '-',
            supplierCode: '-',
            companyCode: '-',
            totalRows: summary.total_rows,
            poNumbers: summary.po_number ? [summary.po_number] : [],
            poDate: summary.po_date || '-',
            deliveryDate: summary.delivery_date || '-',
            totalFiles: summary.total_files,
            sourceFiles: [
              'MANUAL INPUT',
              summary.forecast_file,
              summary.schedule_file
            ].filter(Boolean)
          };

          excelPreviewForecastSummary.value =
            (preview.forecast_summary ?? []).map((forecast) => ({
              key: forecast.key,
              period: forecast.period,
              periodLabel: forecast.period !== ''
                ? formatPeriodLabel(forecast.period)
                : '-',
              total: Number(forecast.total) || 0
            }));
          excelPreviewDetectedHeaderRow.value = 1;

          if (!preview.can_upload || preview.mismatches.length > 0) {
            const mismatchMessage = preview.mismatches
              .map((mismatch) => `• ${mismatch.message}`)
              .join('\n');

            notificationStore.showDialogWarning(
              'Data FTI Manual Tidak Sesuai',
              mismatchMessage || 'Input manual tidak sesuai dengan Schedule/Forecast FTI.'
            );
            throw new Error(
              'Upload FTI manual ditahan sampai input dan source Excel sesuai.'
            );
          }

          if (
            excelPreviewHeaders.value.length === 0 ||
            excelPreviewRows.value.length === 0
          ) {
            throw new Error('Data FTI manual tidak dapat ditampilkan pada preview');
          }

          return;
        }

        if (!file) {
          throw new Error('File preview tidak ditemukan');
        }

        if (
          selectedCustomerUpload.value.trim().toUpperCase() === 'FTI'
        ) {
          const preview = await mdfoService.previewFti(selectedFiles.value);

          if (preview.status !== 'success') {
            throw new Error(
              preview.message || 'Tiga file FTI tidak dapat dipreview'
            );
          }

          excelSheetNames.value = ['FTI'];
          selectedExcelSheet.value = 'FTI';
          excelPreviewHeaders.value = preview.headers;
          excelPreviewRows.value = preview.rows;

          const summary = preview.summary;
          const normalizedPeriod = normalizePeriod(summary.period);

          excelPreviewSummary.value = {
            mode: 'FTI',
            customer: 'FTI',
            period: normalizedPeriod,
            periodLabel: normalizedPeriod !== ''
              ? formatPeriodLabel(normalizedPeriod)
              : summary.periods.join(', ') || '-',
            revision: normalizedUploadRevision.value || '-',
            regNo: '-',
            dockCode: '-',
            vendorCode: '-',
            vendorName: '-',
            vendorAddress: '-',
            supplierCode: '-',
            companyCode: '-',
            totalRows: summary.total_rows,
            poNumbers: summary.po_number ? [summary.po_number] : [],
            poDate: summary.po_date || '-',
            deliveryDate: summary.delivery_date || '-',
            totalFiles: summary.total_files,
            sourceFiles: [
              summary.pdf_file,
              summary.forecast_file,
              summary.schedule_file
            ].filter(Boolean)
          };

          excelPreviewForecastSummary.value =
            (preview.forecast_summary ?? []).map((forecast) => ({
              key: forecast.key,
              period: forecast.period,
              periodLabel: forecast.period !== ''
                ? formatPeriodLabel(forecast.period)
                : '-',
              total: Number(forecast.total) || 0
            }));
          excelPreviewDetectedHeaderRow.value = 1;

          if (!preview.can_upload || preview.mismatches.length > 0) {
            const mismatchMessage = preview.mismatches
              .map((mismatch) => `• ${mismatch.message}`)
              .join('\n');

            notificationStore.showDialogWarning(
              'Data FTI Tidak Sesuai',
              mismatchMessage || 'Part No, Part Name, atau periode dari tiga file FTI tidak sesuai.'
            );
            throw new Error('Upload FTI ditahan sampai ketiga file mempunyai data yang sama.');
          }

          if (
            excelPreviewHeaders.value.length === 0 ||
            excelPreviewRows.value.length === 0
          ) {
            throw new Error('Data FTI tidak dapat ditampilkan pada preview');
          }

          return;
        }

        if (
          selectedCustomerUpload.value.trim().toUpperCase() === 'DPM'
        ) {
          const preview = await mdfoService.previewDpm([file]);

          if (preview.status !== 'success') {
            throw new Error(
              preview.message || 'File DPM tidak dapat dipreview'
            );
          }

          excelSheetNames.value = ['DPM'];
          selectedExcelSheet.value = 'DPM';
          excelPreviewHeaders.value = preview.headers;
          excelPreviewRows.value = preview.rows;
          dpmPreviewWarnings.value = preview.warnings ?? [];

          const summary = preview.summary;
          const normalizedPeriod = normalizePeriod(summary.period);

          excelPreviewSummary.value = {
            mode: 'DPM',
            customer: 'DPM',
            period: normalizedPeriod,
            periodLabel: normalizedPeriod !== ''
              ? formatPeriodLabel(normalizedPeriod)
              : summary.periods.join(', ') || '-',
            revision: normalizedUploadRevision.value || '-',
            regNo: '-',
            dockCode: '-',
            vendorCode: summary.vendor_code || '-',
            vendorName: summary.vendor_name || '-',
            vendorAddress: '-',
            supplierCode: '-',
            companyCode: '-',
            totalRows: summary.total_rows,
            plant: summary.plant || '-',
            plantDesc: summary.plant_desc || '-',
            poNumbers: summary.po_numbers ?? [],
            totalFiles: summary.total_pdf_files,
            mappedRows: summary.mapped_rows,
            unmappedRows: summary.unmapped_rows
          };

          excelPreviewForecastSummary.value =
            (preview.forecast_summary ?? []).map((forecast) => ({
              key: forecast.key,
              period: forecast.period,
              periodLabel: forecast.period !== ''
                ? formatPeriodLabel(forecast.period)
                : '-',
              total: Number(forecast.total) || 0
            }));
          excelPreviewDetectedHeaderRow.value = 1;

          if (
            excelPreviewHeaders.value.length === 0 ||
            excelPreviewRows.value.length === 0
          ) {
            throw new Error('Data PDF DPM tidak dapat ditampilkan pada preview');
          }

          return;
        }

        // Gunakan workbook yang sudah dibaca oleh checkSelectedFiles().
        let workbook =
          validatedWorkbooks.value[
          activePreviewFileIndex.value
          ];

        // Kalau cache tidak ada, baca kembali file.
        if (!workbook) {
          workbook =
            await readExcelWorkbook(
              file
            );
        }

        // Ambil sheet yang mempunyai data.
        const nonEmptySheets =
          getNonEmptySheetNames(
            workbook
          );

        if (
          nonEmptySheets.length === 0
        ) {
          throw new Error(
            'File tidak memiliki sheet yang berisi data'
          );
        }

        // Simpan workbook.
        excelWorkbook.value =
          workbook;

        // Simpan daftar sheet.
        excelSheetNames.value =
          nonEmptySheets;

        // Pilih sheet pertama.
        selectedExcelSheet.value =
          nonEmptySheets[0];

        // Load isi sheet.
        loadExcelSheetPreview(
          selectedExcelSheet.value
        );

        // Safety.
        if (
          excelPreviewHeaders.value
            .length === 0 &&
          excelPreviewRows.value
            .length === 0
        ) {
          throw new Error(
            'Data Excel tidak dapat ditampilkan pada preview'
          );
        }
      } catch (
      error: unknown
      ) {
        console.error(
          'Preview MDFO gagal:',
          error
        );

        excelPreviewError.value =
          getErrorMessage(
            error,
            'File MDFO tidak dapat dipreview'
          );
      } finally {
        isPreviewLoading.value =
          false;
      }
    };

  const ADM_PLANT_CODES: AdmPlantCode[] = [
    'D101',
    'D104',
    'D105'
  ];

  const getAdmPlantCodesFromWorkbook = (
    workbook: XLSX.WorkBook
  ): AdmPlantCode[] => {
    const foundCodes =
      new Set<AdmPlantCode>();

    workbook.SheetNames.forEach(
      (sheetName) => {
        const worksheet =
          workbook.Sheets[sheetName];

        if (!worksheet) {
          return;
        }

        const sheetRows =
          XLSX.utils.sheet_to_json<
            ExcelCell[]
          >(
            worksheet,
            {
              header: 1,
              defval: '',
              blankrows: false
            }
          );

        sheetRows.forEach((row) => {
          row.forEach((cell) => {
            const value =
              String(cell ?? '')
                .trim()
                .toUpperCase();

            if (value === '') {
              return;
            }

            ADM_PLANT_CODES.forEach(
              (code) => {
                const pattern =
                  new RegExp(
                    `(^|[^A-Z0-9])${code}([^A-Z0-9]|$)`
                  );

                if (pattern.test(value)) {
                  foundCodes.add(code);
                }
              }
            );
          });
        });
      }
    );

    return Array.from(foundCodes);
  };

  const getAdmPlantLabel = (
    code: AdmPlantCode
  ): string => {
    switch (code) {
      case 'D101':
        return 'ADM Plant 1';

      case 'D104':
        return 'ADM Plant 4';

      case 'D105':
        return 'ADM Plant 5';
    }
  };

  // Memastikan Customer yang dipilih sesuai dengan kode plant yang ditemukan di No Reg Excel.
  const validateAdmPlantFromWorkbook = (
    workbook: XLSX.WorkBook,
    customer: string
  ): void => {
    const expectedCode =
      getExpectedAdmPlantCode(customer);

    if (!expectedCode) {
      return;
    }

    const detectedCodes =
      getAdmPlantCodesFromWorkbook(
        workbook
      );

    if (detectedCodes.length === 0) {
      throw new Error(
        [
          `No Reg untuk ${customer} tidak dapat divalidasi.`,
          `Seharusnya No Reg mengandung ${expectedCode}.`,
          'Pastikan file MDFO sesuai dengan plant yang dipilih.'
        ].join(' ')
      );
    }

    if (detectedCodes.length > 1) {
      throw new Error(
        [
          'File MDFO mengandung lebih dari satu kode plant:',
          detectedCodes.join(', ') + '.',
          `Customer yang dipilih ${customer},`,
          `seharusnya hanya menggunakan ${expectedCode}.`
        ].join(' ')
      );
    }

    const actualCode =
      detectedCodes[0];

    if (actualCode !== expectedCode) {
      throw new Error(
        [
          `Customer ${customer} tidak sesuai dengan No Reg file.`,
          `File terdeteksi ${actualCode} (${getAdmPlantLabel(actualCode)}).`,
          `Seharusnya ${expectedCode} (${getAdmPlantLabel(expectedCode)}).`,
          'Silakan pilih file MDFO yang sesuai.'
        ].join(' ')
      );
    }
  };

  const selectPreviewFile = async (index: number): Promise<void> => {
    if (index < 0 || index >= selectedFiles.value.length) {
      return;
    }

    activePreviewFileIndex.value = index;

    await loadActiveFilePreview();
  };

  const getLatestPeriodFromRows = (uploadedRows: MdfoRow[]): string => {
    const periods = uploadedRows.map((row) => normalizePeriod(row.periode)).filter(Boolean);

    const uniquePeriods = Array.from(new Set(periods)).sort();

    return uniquePeriods[uniquePeriods.length - 1] || '';
  };

  const getLatestRevisionFromRows = (uploadedRows: MdfoRow[], targetPeriod: string): string => {
    const revisions = uploadedRows
      .filter((row) => {
        return targetPeriod === '' || normalizePeriod(row.periode) === targetPeriod;
      })
      .map((row) => normalizeRevision(row.revision))
      .filter((revision) => {
        return revision !== '' && Number.isFinite(Number(revision));
      });

    const uniqueRevisions = Array.from(new Set(revisions)).sort((first, second) => {
      return Number(first) - Number(second);
    });

    return uniqueRevisions[uniqueRevisions.length - 1] || '';
  };


  const getLatestPeriodFromTmminRows = (
    uploadedRows: TmminMdfoRow[]
  ): string => {
    const periods = uploadedRows
      .map((row) => normalizePeriod(row._periode))
      .filter(Boolean);

    const uniquePeriods = Array.from(
      new Set(periods)
    ).sort();

    return uniquePeriods[uniquePeriods.length - 1] || '';
  };

  const getLatestRevisionFromTmminRows = (
    uploadedRows: TmminMdfoRow[],
    targetPeriod: string
  ): string => {
    const revisions = uploadedRows
      .filter((row) => {
        return (
          targetPeriod === '' ||
          normalizePeriod(row._periode) === targetPeriod
        );
      })
      .map((row) => normalizeRevision(row._revision))
      .filter((revision) => {
        return revision !== '' && Number.isFinite(Number(revision));
      });

    const uniqueRevisions = Array.from(
      new Set(revisions)
    ).sort((first, second) => {
      return Number(first) - Number(second);
    });

    return uniqueRevisions[uniqueRevisions.length - 1] || '';
  };

  const getLatestPeriodFromNtcRows = (
    uploadedRows: NtcMdfoRow[]
  ): string => {
    const periods = uploadedRows
      .map((row) => normalizePeriod(row._periode))
      .filter(Boolean);

    const uniquePeriods = Array.from(
      new Set(periods)
    ).sort();

    return uniquePeriods[
      uniquePeriods.length - 1
    ] || '';
  };

  const getLatestRevisionFromNtcRows = (
    uploadedRows: NtcMdfoRow[],
    targetPeriod: string
  ): string => {
    const revisions = uploadedRows
      .filter((row) => {
        return (
          targetPeriod === '' ||
          normalizePeriod(row._periode) ===
          targetPeriod
        );
      })
      .map((row) =>
        normalizeRevision(row._revision)
      )
      .filter((revision) => {
        return (
          revision !== '' &&
          Number.isFinite(Number(revision))
        );
      });

    const uniqueRevisions = Array.from(
      new Set(revisions)
    ).sort(
      (first, second) =>
        Number(first) - Number(second)
    );

    return uniqueRevisions[
      uniqueRevisions.length - 1
    ] || '';
  };


  const getLatestPeriodFromGayaRows = (
    uploadedRows: GayaMdfoRow[]
  ): string => {
    const periods = uploadedRows
      .map((row) => normalizePeriod(row._periode))
      .filter(Boolean);

    const uniquePeriods = Array.from(
      new Set(periods)
    ).sort();

    return uniquePeriods[
      uniquePeriods.length - 1
    ] || '';
  };

  const getLatestRevisionFromGayaRows = (
    uploadedRows: GayaMdfoRow[],
    targetPeriod: string
  ): string => {
    const revisions = uploadedRows
      .filter((row) => {
        return (
          targetPeriod === '' ||
          normalizePeriod(row._periode) === targetPeriod
        );
      })
      .map((row) => normalizeRevision(row._revision))
      .filter((revision) => {
        return revision !== '' && Number.isFinite(Number(revision));
      });

    const uniqueRevisions = Array.from(
      new Set(revisions)
    ).sort((first, second) => Number(first) - Number(second));

    return uniqueRevisions[
      uniqueRevisions.length - 1
    ] || '';
  };


  const validateUploadForm =
    async (): Promise<boolean> => {
      // Customer
      if (
        selectedCustomerUpload.value
          .trim() === ''
      ) {
        notificationStore
          .showAlertWarning(
            'Pilih customer terlebih dahulu'
          );

        return false;
      }

      if (isMesManualMode.value) {
        if (mesManualPeriodCompact.value === '') {
          notificationStore.showAlertWarning('Pilih Bulan MES terlebih dahulu');
          return false;
        }
        if (!isMesManualRowsComplete.value) {
          notificationStore.showAlertWarning(
            'Lengkapi input MES. Dua Part wajib harus tetap ada dan Qty N wajib diisi. N+1 sampai N+3, PO Number, PO Date, dan Delivery Date boleh kosong.'
          );
          return false;
        }
        if (uploadBy.value.trim() === '') {
          notificationStore.showAlertWarning(
            hasUploadUserLoginMapping.value
              ? 'Pilih Upload By terlebih dahulu'
              : 'Username login belum terdaftar sebagai Upload By'
          );
          return false;
        }
        if (!isUploadRevisionReady.value) {
          const revisionReady = await detectUploadRevision(true);
          if (!revisionReady || !isUploadRevisionReady.value) return false;
        }
        return true;
      }

      if (isFtiManualMode.value) {
        if (ftiManualPeriodCompact.value === '') {
          notificationStore.showAlertWarning(
            'Pilih Bulan FTI manual terlebih dahulu'
          );
          return false;
        }

        if (!ftiManualScheduleFile.value) {
          notificationStore.showAlertWarning(
            'Excel Schedule FTI wajib dipilih'
          );
          return false;
        }

        const invalidPoRow = firstInvalidFtiManualPoNumber();
        if (invalidPoRow) {
          const poLength = normalizeFtiManualPoNumber(
            invalidPoRow.poNumber
          ).length;

          notificationStore.showAlertWarning(
            `PO Number FTI untuk Part ${invalidPoRow.partNo || '-'} harus tepat 10 digit. Saat ini ${poLength}/10 digit.`
          );
          return false;
        }

        if (!isFtiManualRowsComplete.value) {
          notificationStore.showAlertWarning(
            'Lengkapi input wajib FTI manual. Dua Part wajib dan Qty N harus tetap terisi; N+1 sampai N+3 boleh kosong dan dapat ditambahkan lewat Edit Forecast.'
          );
          return false;
        }

        if (uploadBy.value.trim() === '') {
          notificationStore.showAlertWarning(
            hasUploadUserLoginMapping.value
              ? 'Pilih Upload By terlebih dahulu'
              : 'Username login belum terdaftar sebagai Upload By'
          );
          return false;
        }

        if (isLoadingFtiManualSources.value) {
          notificationStore.showAlertWarning(
            'Schedule/Forecast FTI masih diperiksa'
          );
          return false;
        }

        if (!isUploadRevisionReady.value) {
          const revisionReady = await detectUploadRevision(true);
          if (!revisionReady || !isUploadRevisionReady.value) {
            return false;
          }
        }

        return true;
      }

      // File
      if (
        selectedFiles.value.length === 0
      ) {
        notificationStore
          .showAlertWarning(
            'Pilih minimal satu file MDFO'
          );

        return false;
      }

      // Upload By
      if (
        uploadBy.value.trim() === ''
      ) {
        notificationStore
          .showAlertWarning(
            hasUploadUserLoginMapping.value
              ? 'Pilih Upload By terlebih dahulu'
              : 'Username login belum terdaftar sebagai Upload By'
          );

        return false;
      }

      // Do not submit while file validation is running.
      if (
        isCheckingFiles.value
      ) {
        notificationStore
          .showAlertWarning(
            'File MDFO masih diperiksa'
          );

        return false;
      }

      // Revalidate files when no valid validation result is available.
      if (
        !filesChecked.value ||
        !allCheckedFilesValid.value
      ) {
        const valid =
          await checkSelectedFiles();

        if (!valid) {
          return false;
        }
      }

      // Safety check final.
      if (
        !allCheckedFilesValid.value
      ) {
        notificationStore
          .showAlertWarning(
            'File MDFO belum lolos validasi'
          );

        return false;
      }

      // Revision wajib berasal dari hasil deteksi backend dan harus sudah
      // dikonfirmasi user. Tidak ada lagi input revision manual.
      if (!isUploadRevisionReady.value) {
        const revisionReady =
          await detectUploadRevision(true);

        if (!revisionReady || !isUploadRevisionReady.value) {
          return false;
        }
      }

      return true;
    };

  const submitUpload =
    async (): Promise<void> => {
      if (!requireUploadMdfoPermission('create', 'Create')) return;
      // Validasi: Customer File Upload By File sudah lolos pengecekan TIDAK ADA PASSWORD.
      const valid =
        await validateUploadForm();

      if (!valid) {
        return;
      }

      // Simpan customer sebelum proses upload.
      const uploadedCustomer =
        selectedCustomerUpload.value;

      // Mengikuti popup confirmation Upload SO.
      notificationStore.showConfirm(
        'Konfirmasi',
        'Apakah Anda yakin ingin menyimpan data?',
        async () => {
          try {
            isUploading.value =
              true;

            const response = isMesManualMode.value
              ? await mdfoService.uploadMesManual(
                mesManualPeriodCompact.value,
                buildMesManualPayloadRows(),
                uploadBy.value,
                normalizedUploadRevision.value
              )
              : isFtiManualMode.value
                ? await mdfoService.uploadFtiManual(
                  ftiManualSourceFiles.value,
                  ftiManualPeriodCompact.value,
                  buildFtiManualPayloadRows(),
                  uploadBy.value,
                  normalizedUploadRevision.value
                )
                : await mdfoService.upload(
                selectedFiles.value,
                uploadBy.value,
                uploadedCustomer,
                normalizedUploadRevision.value
              );

            // Validasi response backend.
            if (
              response.status !==
              'success'
            ) {
              throw new Error(
                response.message ||
                'Upload MDFO gagal'
              );
            }

            const uploadErrors = Array.isArray(response.errors)
              ? response.errors.map((value) => String(value ?? '').trim()).filter(Boolean)
              : [];
            const totalUploadFiles = Math.max(0, Number(response.total_files ?? 0));
            const successfulUploadFiles = Math.max(0, Number(response.successful_files ?? 0));
            const isPartialUpload =
              uploadErrors.length > 0 ||
              (totalUploadFiles > 0 && successfulUploadFiles < totalUploadFiles);
            const uploadResultMessage = [
              response.message || 'Upload MDFO berhasil',
              uploadErrors.length > 0
                ? `File gagal:\n- ${uploadErrors.join('\n- ')}`
                : ''
            ].filter(Boolean).join('\n\n');
            const showUploadSuccessResult = (fallback: string): void => {
              if (isPartialUpload) {
                notificationStore.showAlertWarning(uploadResultMessage || fallback);
              } else {
                notificationStore.showAlertSuccess(response.message || fallback);
              }
            };

            // Backend harus mengembalikan batch_id yang valid.
            const uploadedBatchId =
              Number(
                response.batch_id || 0
              );

            if (
              !Number.isInteger(
                uploadedBatchId
              ) ||
              uploadedBatchId <= 0
            ) {
              throw new Error(
                'Batch hasil upload tidak valid'
              );
            }

            // Customer hasil upload langsung dijadikan filter tabel MDFO.
            selectedCustomerFilter.value =
              normalizeMdfoDownloadCustomer(uploadedCustomer) === 'GAYA MTR'
                ? 'GAYA MTR'
                : uploadedCustomer;

            selectedDownloadCustomers.value = [
              normalizeMdfoDownloadCustomer(
                uploadedCustomer
              )
            ].filter(Boolean);

            selectedPeriodFilter.value = '';
            selectedRevisionFilter.value = '';

            clearAllFilters();
            mdfoService.clearRawCache();

            // Load batch yang baru diupload.
            await loadData(
              uploadedBatchId
            );

            const latestPeriod =
              isGayaMode.value
                ? getLatestPeriodFromGayaRows(
                  gayaRows.value
                )
                : (isNtcMode.value || isDpmMode.value || isFtiMode.value)
                  ? getLatestPeriodFromNtcRows(
                    ntcRows.value
                  )
                  : isTmminMode.value
                    ? getLatestPeriodFromTmminRows(
                      tmminRows.value
                    )
                    : getLatestPeriodFromRows(
                      rows.value
                    );

            const latestRevision =
              isGayaMode.value
                ? getLatestRevisionFromGayaRows(
                  gayaRows.value,
                  latestPeriod
                )
                : (isNtcMode.value || isDpmMode.value || isFtiMode.value)
                  ? getLatestRevisionFromNtcRows(
                    ntcRows.value,
                    latestPeriod
                  )
                  : isTmminMode.value
                    ? getLatestRevisionFromTmminRows(
                      tmminRows.value,
                      latestPeriod
                    )
                    : getLatestRevisionFromRows(
                      rows.value,
                      latestPeriod
                    );

            selectedPeriodFilter.value =
              latestPeriod;

            selectedRevisionFilter.value =
              latestRevision;

            // Reload menggunakan filter period + revision terbaru.
            await loadData(
              uploadedBatchId
            );

            // Pastikan revision hasil upload tersedia di option Revision.
            if (
              latestRevision !== '' &&
              !revisionFilterOptions
                .value.includes(
                  latestRevision
                )
            ) {
              revisionFilterOptions.value =
                Array.from(
                  new Set([
                    ...revisionFilterOptions
                      .value,

                    latestRevision
                  ])
                ).sort(
                  (
                    first,
                    second
                  ) => {
                    return (
                      Number(first) -
                      Number(second)
                    );
                  }
                );
            }

            // MES membutuhkan Raw row hasil upload untuk popup ZSTT manual.
            const shouldOpenMesZstt =
              uploadedCustomer.trim().toUpperCase() === 'MES' &&
              response.requires_manual_zstt === true;
            const mesRawRowsForZstt = shouldOpenMesZstt
              ? (ntcRows.value as unknown as Array<Record<string, unknown>>).map((row) => ({ ...row }))
              : [];
            const mesPeriodForZstt = latestPeriod || mesManualPeriodCompact.value;

            // Upload berhasil: baru hapus draft lalu tutup modal.
            // Close/Cancel biasa tidak lagi menghapus draft.
            resetUploadForm();
            showUploadModal.value = false;

            if (shouldOpenMesZstt) {
              openMesZsttFromRawRows(uploadedBatchId, mesPeriodForZstt, mesRawRowsForZstt);
              if (quotationSectionActivated.value) {
                await loadQuotation();
              }
              showUploadSuccessResult(
                'Raw MDFO, Quotation, dan Contract MES berhasil dibuat. Lengkapi ZSTT harian untuk menyelesaikan proses.'
              );
              return;
            }

            // Jika backend memang melewati generation, cukup refresh Raw.
            // GAYA MTR terbaru tidak lagi dihentikan di sini karena backend
            // sudah membentuk Q/Q1/Q2/Q3/Contract/ZSTT secara otomatis.
            if (
              response.generation_skipped === true
            ) {
              showUploadSuccessResult('Raw MDFO berhasil diupload');

              return;
            }

            // Upload berhasil tetapi proses generate backend gagal.
            if (
              response.generation_success ===
              false
            ) {
              notificationStore
                .showAlertWarning(
                  isPartialUpload
                    ? uploadResultMessage
                    : response.message ||
                      response.generation_error ||
                      'MDFO berhasil diupload, tetapi generate dokumen gagal'
                );

              return;
            }

            /*
             * Generation backend sudah selesai sebelum response upload.
             * Refresh dokumen agar Q/Q1/Q2/Q3/Contract/ZSTT langsung
             * tampil tanpa user perlu mengganti filter terlebih dahulu.
             */
            const refreshTasks: Promise<void>[] = [];
            if (quotationSectionActivated.value) refreshTasks.push(loadQuotation());
            if (trackingSectionActivated.value) refreshTasks.push(loadQuotationTracking());
            await Promise.all(refreshTasks);

            showUploadSuccessResult('Upload MDFO berhasil');
          } catch (
          error: unknown
          ) {
            console.error(
              'Upload MDFO gagal:',
              error
            );

            const duplicateFiles = getPlant4DuplicateFilesFromError(error);
            if (duplicateFiles.length > 0) {
              notificationStore.showDialogWarning(
                'Duplikat Part Number MDFO P4',
                buildPlant4DuplicateWarningHtml(duplicateFiles)
              );
              return;
            }

            notificationStore
              .showAlertError(
                getErrorMessage(
                  error,
                  'Upload MDFO gagal diproses'
                )
              );
          } finally {
            isUploading.value =
              false;
          }
        }
      );
    };

  // Load and Download

  type MdfoGetDataResponse = Awaited<
    ReturnType<typeof mdfoService.getData>
  >;

  const applyMdfoFilterOptionsFromResponses = (
    responses: MdfoGetDataResponse[]
  ): void => {
    const metadataResponses = responses.filter((response) => {
      return response.filter_options !== null && response.filter_options !== undefined;
    });

    if (metadataResponses.length === 0) {
      return;
    }

    customerFilterOptions.value =
      uniqueStrings(
        [
          ...MDFO_DOWNLOAD_CUSTOMER_ORDER,
          ...metadataResponses.flatMap((response) => {
            return response.filter_options?.customers || [];
          })
        ]
      )
        .map((customer) => {
          return String(customer ?? '')
            .trim()
            .toUpperCase();
        })
        .filter((customer) => {
          // Alias group lama tidak lagi ditampilkan di filter utama.
          return ![
            'ADM P4 (SAP & DCWA)',
            'ADM P4 (SAP&DCWA)',
            'ADM_P4_GROUP'
          ].includes(customer);
        });

    periodFilterOptions.value =
      uniqueStrings(
        metadataResponses.flatMap((response) => {
          return response.filter_options?.periods || [];
        })
      )
        .map(normalizePeriod)
        .filter(Boolean)
        .sort();

    revisionFilterOptions.value =
      uniqueStrings(
        metadataResponses.flatMap((response) => {
          return response.filter_options?.revisions || [];
        })
      )
        .sort((first, second) => {
          return Number(first) - Number(second);
        });

    const mergedDayHeaders = metadataResponses.reduce(
      (result, response) => {
        return {
          ...result,
          ...(response.day_headers || {})
        };
      },
      {} as Partial<Record<MdfoDayKey, string>>
    );

    Object.assign(
      dayHeaders,
      createDefaultDayHeaders(),
      mergedDayHeaders
    );
  };

  const applySingleMdfoDataResponse = (
    response: MdfoGetDataResponse,
    updateFilterOptions = true
  ): void => {
    if (response.status !== 'success') {
      throw new Error(
        response.message ||
        'Gagal mengambil data MDFO'
      );
    }

    dataMode.value =
      response.data_mode === 'tmmin'
        ? 'tmmin'
        : response.data_mode === 'ntc'
          ? 'ntc'
          : response.data_mode === 'dpm'
            ? 'dpm'
          : response.data_mode === 'fti'
            ? 'fti'
          : response.data_mode === 'gaya'
            ? 'gaya'
            : 'standard';

    rawServerPaged.value = response.server_paged === true;
    rawServerTotal.value = rawServerPaged.value ? Number(response.total || 0) : 0;
    rawServerTotalPages.value = rawServerPaged.value
      ? Math.max(1, Number(response.total_pages || 1))
      : 1;
    if (!rawServerPaged.value) {
      rawServerColumnTotals.value = {};
    } else if (response.column_totals !== null && response.column_totals !== undefined) {
      rawServerColumnTotals.value = response.column_totals;
    } else if (dataMode.value !== 'standard' && dataMode.value !== 'tmmin') {
      rawServerColumnTotals.value = {};
    }

    if (dataMode.value === 'gaya') {
      gayaRows.value = Array.isArray(response.data)
        ? response.data as GayaMdfoRow[]
        : [];

      if (Array.isArray(response.gaya_columns)) {
        gayaColumns.value = response.gaya_columns;
        initializeGayaColumnFilters();
      }

      closeGayaFilters();

      if (response.gaya_totals !== null && response.gaya_totals !== undefined) {
        gayaTotalsFromApi.value = response.gaya_totals;
      }

      rows.value = [];
      tmminRows.value = [];
      tmminColumns.value = [];
      ntcRows.value = [];
      ntcColumns.value = [];
      ntcTotalsFromApi.value = {};
      gayaCurrentPage.value = rawServerPaged.value
        ? Math.max(1, Number(response.page || 1))
        : 1;
    } else if (dataMode.value === 'ntc' || dataMode.value === 'dpm' || dataMode.value === 'fti') {
      ntcRows.value = Array.isArray(response.data)
        ? response.data as unknown as NtcMdfoRow[]
        : [];

      const rawColumns = dataMode.value === 'dpm'
        ? response.dpm_columns
        : dataMode.value === 'fti'
          ? response.fti_columns
          : response.ntc_columns;

      if (Array.isArray(rawColumns)) {
        ntcColumns.value = rawColumns as NtcMdfoColumn[];
      }

      if (response.ntc_totals !== null && response.ntc_totals !== undefined) {
        ntcTotalsFromApi.value = response.ntc_totals;
      }

      if (response.ntc_month_headers !== null && response.ntc_month_headers !== undefined) {
        ntcMonthHeaders.value = {
          forecast1: response.ntc_month_headers.forecast1 || '',
          forecast2: response.ntc_month_headers.forecast2 || '',
          forecast3: response.ntc_month_headers.forecast3 || ''
        };
      }

      rows.value = [];
      tmminRows.value = [];
      tmminColumns.value = [];
      gayaRows.value = [];
      gayaColumns.value = [];
      gayaTotalsFromApi.value = {};

      initializeNtcColumnFilters();
      ntcCurrentPage.value = rawServerPaged.value
        ? Math.max(1, Number(response.page || 1))
        : 1;
    } else if (dataMode.value === 'tmmin') {
      tmminRows.value = Array.isArray(response.data)
        ? response.data as TmminMdfoRow[]
        : [];

      if (Array.isArray(response.tmmin_columns)) {
        tmminColumns.value = response.tmmin_columns;
      }

      rows.value = [];
      ntcRows.value = [];
      ntcColumns.value = [];
      ntcTotalsFromApi.value = {};
      gayaRows.value = [];
      gayaColumns.value = [];
      gayaTotalsFromApi.value = {};

      initializeTmminColumnFilters();
    } else {
      rows.value = Array.isArray(response.data)
        ? response.data as MdfoRow[]
        : [];

      tmminRows.value = [];
      tmminColumns.value = [];
      ntcRows.value = [];
      ntcColumns.value = [];
      ntcTotalsFromApi.value = {};
      gayaRows.value = [];
      gayaColumns.value = [];
      gayaTotalsFromApi.value = {};
    }

    batchId.value = response.batch_id
      ? Number(response.batch_id)
      : null;

    if (updateFilterOptions) {
      applyMdfoFilterOptionsFromResponses([
        response
      ]);
    }

    if (!isNtcMode.value && !isGayaMode.value) {
      currentPage.value = rawServerPaged.value
        ? Math.max(1, Number(response.page || 1))
        : 1;
    }
  };

  const NTC_STYLE_SERVER_CUSTOMERS = new Set<string>([
    'NTC',
    'DPM',
    'FTI',
    'MES'
  ]);

  const getRawServerRequestState = (customer: string) => {
    const normalizedCustomer = normalizeMdfoDownloadCustomer(customer);

    if (NTC_STYLE_SERVER_CUSTOMERS.has(normalizedCustomer)) {
      return {
        page: ntcCurrentPage.value,
        perPage: ntcRowsPerPage.value,
        columnFilters: getActiveNtcColumnFilters(),
        sortKey: ntcSortKey.value,
        sortDirection: ntcSortDirection.value
      };
    }

    if (normalizedCustomer === 'GAYA MTR') {
      return {
        page: gayaCurrentPage.value,
        perPage: gayaRowsPerPage.value,
        columnFilters: getActiveGayaColumnFilters(),
        sortKey: gayaSortKey.value,
        sortDirection: gayaSortDirection.value
      };
    }

    return {
      page: currentPage.value,
      perPage: rowsPerPage.value,
      columnFilters: getActiveColumnFilters(),
      sortKey: sortKey.value,
      sortDirection: sortDirection.value
    };
  };

  const prefetchNextRawServerPage = (
    request: NonNullable<Parameters<typeof mdfoService.getData>[0]>,
    response: MdfoGetDataResponse
  ): void => {
    if (response.server_paged !== true) return;

    const page = Math.max(1, Number(response.page || request.page || 1));
    const totalPages = Math.max(1, Number(response.total_pages || 1));
    if (page >= totalPages) return;

    void mdfoService.prefetchData({
      ...request,
      page: page + 1,
      paged: true,
      includeMeta: false,
      includeTotals: false
    });
  };

  let activeRawLoadController: AbortController | null = null;

  // Metadata Period/Revision/day header tidak perlu menahan first paint halaman.
  // First load mengambil page data saja; metadata disegarkan setelah UI sudah
  // tampil/idle. Ini mengurangi rasa lag ketika menu Upload MDFO dibuka.
  let rawMetadataRefreshSerial = 0;
  let rawMetadataRefreshTimer: ReturnType<typeof setTimeout> | null = null;

  const refreshRawMainFilterMetadata = async (): Promise<void> => {
    const requestSerial = ++rawMetadataRefreshSerial;
    const scopeCustomers = getSelectedScopeCustomers();
    const scopeKey = [
      ...scopeCustomers.map(normalizeMdfoDownloadCustomer),
      normalizePeriod(selectedPeriodFilter.value),
      normalizeRevision(selectedRevisionFilter.value)
    ].join('|');

    const rawDisplayCustomers = getRawDisplayCustomers(scopeCustomers);
    const standardCustomers = rawDisplayCustomers.filter((customer) =>
      RAW_STANDARD_SERVER_CUSTOMERS.has(customer)
    );

    const request: MdfoGetDataParams = standardCustomers.length > 0
      ? {
          customers: standardCustomers,
          periode: selectedPeriodFilter.value,
          revision: selectedRevisionFilter.value,
          page: 1,
          perPage: 10,
          columnFilters: {},
          sortKey: '',
          sortDirection: 'none',
          paged: true,
          includeMeta: true,
          includeTotals: false
        }
      : {
          customer: rawDisplayCustomers[0] || scopeCustomers[0] || '',
          periode: selectedPeriodFilter.value,
          revision: selectedRevisionFilter.value,
          page: 1,
          perPage: 10,
          columnFilters: {},
          sortKey: '',
          sortDirection: 'none',
          paged: true,
          includeMeta: true,
          includeTotals: false
        };

    try {
      const response = await mdfoService.getData(request);
      const currentScopeKey = [
        ...getSelectedScopeCustomers().map(normalizeMdfoDownloadCustomer),
        normalizePeriod(selectedPeriodFilter.value),
        normalizeRevision(selectedRevisionFilter.value)
      ].join('|');

      if (requestSerial !== rawMetadataRefreshSerial || scopeKey !== currentScopeKey) {
        return;
      }

      if (response.status === 'success') {
        applyMdfoFilterOptionsFromResponses([response]);
      }
    } catch (error: unknown) {
      if (requestSerial !== rawMetadataRefreshSerial) return;
      // Metadata adalah optimasi/pendukung dropdown. Raw page yang sudah tampil
      // tidak boleh dianggap gagal hanya karena refresh metadata bermasalah.
      console.warn('Gagal menyegarkan metadata filter MDFO:', error);
    }
  };

  const scheduleRawMainFilterMetadataRefresh = (): void => {
    if (rawMetadataRefreshTimer) {
      clearTimeout(rawMetadataRefreshTimer);
      rawMetadataRefreshTimer = null;
    }

    const run = () => {
      rawMetadataRefreshTimer = null;
      void refreshRawMainFilterMetadata();
    };

    if (typeof window !== 'undefined') {
      const requestIdle = (window as any).requestIdleCallback as
        | ((callback: () => void, options?: { timeout?: number }) => number)
        | undefined;

      if (typeof requestIdle === 'function') {
        requestIdle(run, { timeout: 700 });
        return;
      }
    }

    rawMetadataRefreshTimer = setTimeout(run, 120);
  };

  const waitForUploadMdfoInitialPaint = async (): Promise<void> => {
    if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
      return;
    }

    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => resolve());
      });
    });
  };

  // Total Raw MDFO hanya valid ketika scope bisnis sudah terkunci ke
  // satu customer + satu period + satu revision. Revision adalah versi data,
  // sedangkan N/N+1/N+2/N+3 dan kolom harian bergeser antarperiode; karena itu
  // menjumlahkan scope yang masih All dapat menghasilkan angka menyesatkan.
  const shouldRequestRawTotals = (scopeCustomers: string[]): boolean => {
    const normalizedCustomers = scopeCustomers
      .map(normalizeMdfoDownloadCustomer)
      .filter((customer, index, values) => customer !== '' && values.indexOf(customer) === index);

    return normalizedCustomers.length === 1 &&
      String(selectedPeriodFilter.value ?? '').trim() !== '' &&
      String(selectedRevisionFilter.value ?? '').trim() !== '';
  };

  const loadMultiCustomerRawData = async (
    scopeCustomers: string[],
    options: { pageOnly?: boolean; bypassCache?: boolean; signal?: AbortSignal } = {}
  ): Promise<void> => {
    const normalizedScope = scopeCustomers
      .map(normalizeMdfoDownloadCustomer)
      .filter((customer, index, values) => {
        return customer !== '' &&
          values.indexOf(customer) === index;
      });

    const rawDisplayCustomers = getRawDisplayCustomers(normalizedScope);
    const standardCustomers = rawDisplayCustomers.filter((customer) => {
      return RAW_STANDARD_SERVER_CUSTOMERS.has(customer);
    });

    const pageOnly = options.pageOnly === true;
    const request = standardCustomers.length > 0
      ? {
        customers: standardCustomers,
        periode: selectedPeriodFilter.value,
        revision: selectedRevisionFilter.value,
        page: currentPage.value,
        perPage: rowsPerPage.value,
        columnFilters: getActiveColumnFilters(),
        sortKey: sortKey.value,
        sortDirection: sortDirection.value,
        paged: true,
        includeMeta: !pageOnly,
        includeTotals: false
      }
      : (() => {
        const customer = rawDisplayCustomers[0] || normalizedScope[0] || '';
        const state = getRawServerRequestState(customer);
        return {
          customer,
          periode: selectedPeriodFilter.value,
          revision: selectedRevisionFilter.value,
          page: state.page,
          perPage: state.perPage,
          columnFilters: state.columnFilters,
          sortKey: state.sortKey,
          sortDirection: state.sortDirection,
          paged: true,
          includeMeta: !pageOnly,
          includeTotals: false
        };
      })();

    const response = await mdfoService.getData(
      request,
      { bypassCache: options.bypassCache === true, signal: options.signal }
    );

    applySingleMdfoDataResponse(response);
    prefetchNextRawServerPage(request, response);
  };

  const loadData = async (
    targetBatchId?: number | string,
    options: { pageOnly?: boolean; bypassCache?: boolean } = {}
  ) => {
    activeRawLoadController?.abort();
    const rawController = new AbortController();
    activeRawLoadController = rawController;

    try {
      isLoading.value = true;

      const scopeCustomers =
        getSelectedScopeCustomers();

      /*
       * All / multi customer:
       * - Raw default tetap hanya menggabungkan customer ber-layout standard.
       * - Customer ber-layout khusus tetap ditampilkan satu per satu, tetapi
       *   seluruhnya memakai paging/filter database yang sama ringannya.
       * Batch-specific reload sesudah upload tetap memakai jalur single.
       */
      if (
        targetBatchId === undefined &&
        scopeCustomers.length > 1
      ) {
        await loadMultiCustomerRawData(
          scopeCustomers,
          { ...options, signal: rawController.signal }
        );
        return;
      }

      const effectiveCustomer =
        scopeCustomers.length === 1
          ? scopeCustomers[0]
          : selectedCustomerFilter.value;

      const normalizedEffectiveCustomer = normalizeMdfoDownloadCustomer(
        effectiveCustomer
      );
      const useServerPaging = normalizedEffectiveCustomer === '' ||
        RAW_SERVER_PAGE_CUSTOMERS.has(normalizedEffectiveCustomer);
      const state = getRawServerRequestState(normalizedEffectiveCustomer);
      const pageOnly = options.pageOnly === true;
      const requestRawTotals = shouldRequestRawTotals(scopeCustomers);

      const request = {
        batchId: targetBatchId,
        customer: effectiveCustomer,
        periode: selectedPeriodFilter.value,
        revision: selectedRevisionFilter.value,
        page: state.page,
        perPage: state.perPage,
        columnFilters: useServerPaging ? state.columnFilters : undefined,
        sortKey: useServerPaging ? state.sortKey : '',
        sortDirection: useServerPaging ? state.sortDirection : 'none',
        paged: useServerPaging,
        includeMeta: useServerPaging ? !pageOnly : undefined,
        includeTotals: useServerPaging
          ? (!pageOnly && requestRawTotals)
          : undefined
      };

      const response = await mdfoService.getData(
        request,
        { bypassCache: options.bypassCache === true, signal: rawController.signal }
      );

      applySingleMdfoDataResponse(response);

      if (useServerPaging) {
        prefetchNextRawServerPage(request, response);
      }
    } catch (error: unknown) {
      if (rawController.signal.aborted) return;
      console.error('Gagal mengambil data MDFO:', error);

      notificationStore.showAlertError(
        getErrorMessage(
          error,
          'Gagal mengambil data MDFO'
        )
      );
    } finally {
      if (activeRawLoadController === rawController) {
        activeRawLoadController = null;
        isLoading.value = false;
      }
    }
  };

  type ForecastEditQty = number | '';
  type ForecastEditDraftRow = {
    id: number;
    batchId: number;
    partNo: string;
    partName: string;
    n: number;
    n1: ForecastEditQty;
    n2: ForecastEditQty;
    n3: ForecastEditQty;
  };

  const showForecastEditModal = ref(false);
  const isLoadingForecastEdit = ref(false);
  const isSavingForecastEdit = ref(false);
  const forecastEditRows = ref<ForecastEditDraftRow[]>([]);

  const forecastEditCustomer = computed<'FTI' | 'MES' | ''>(() => {
    const customer = normalizeMdfoDownloadCustomer(selectedCustomerFilter.value);
    return customer === 'FTI' || customer === 'MES' ? customer : '';
  });

  const forecastEditPeriod = computed(() => normalizePeriod(selectedPeriodFilter.value));
  const forecastEditRevision = computed(() => normalizeRevision(selectedRevisionFilter.value));

  const canEditForecast = computed(() =>
    forecastEditCustomer.value !== '' &&
    forecastEditPeriod.value !== '' &&
    forecastEditRevision.value !== '' &&
    !isLoadingForecastEdit.value &&
    !isSavingForecastEdit.value
  );

  const forecastEditButtonTitle = computed(() => {
    if (forecastEditCustomer.value === '') {
      return 'Edit Forecast hanya tersedia untuk FTI dan MES.';
    }
    if (forecastEditPeriod.value === '' || forecastEditRevision.value === '') {
      return 'Pilih Periode dan Revision terlebih dahulu.';
    }
    return `Edit N+1 sampai N+3 ${forecastEditCustomer.value} tanpa membuat revision baru.`;
  });

  const closeForecastEdit = (): void => {
    if (isSavingForecastEdit.value) return;
    showForecastEditModal.value = false;
    forecastEditRows.value = [];
  };

  const mapForecastQtyToDraft = (value: number | null): ForecastEditQty =>
    value === null || value === undefined ? '' : Number(value);

  const openForecastEdit = async (): Promise<void> => {
    if (!requireUploadMdfoPermission('update', 'Update')) return;
    const customer = forecastEditCustomer.value;
    const period = forecastEditPeriod.value;
    const revision = forecastEditRevision.value;

    if (customer === '') {
      notificationStore.showAlertWarning('Edit Forecast hanya tersedia untuk FTI dan MES.');
      return;
    }
    if (period === '' || revision === '') {
      notificationStore.showAlertWarning('Pilih Periode dan Revision FTI/MES terlebih dahulu.');
      return;
    }

    isLoadingForecastEdit.value = true;
    forecastEditRows.value = [];
    showForecastEditModal.value = true;

    try {
      const response = await mdfoService.getForecastEditData(customer, period, revision);
      const rows = Array.isArray(response.rows) ? response.rows : [];
      forecastEditRows.value = rows.map((row: MdfoForecastEditRow) => ({
        id: Number(row.id),
        batchId: Number(row.batch_id),
        partNo: String(row.part_no ?? ''),
        partName: String(row.part_name ?? ''),
        n: Number(row.n_qty ?? 0),
        n1: mapForecastQtyToDraft(row.n1_qty),
        n2: mapForecastQtyToDraft(row.n2_qty),
        n3: mapForecastQtyToDraft(row.n3_qty)
      }));
    } catch (error: unknown) {
      console.error('Gagal memuat Edit Forecast MDFO:', error);
      showForecastEditModal.value = false;
      notificationStore.showAlertError(
        getErrorMessage(error, 'Gagal memuat data Edit Forecast')
      );
    } finally {
      isLoadingForecastEdit.value = false;
    }
  };

  const normalizeForecastDraftQty = (
    value: ForecastEditQty,
    label: string,
    partNo: string
  ): number | null => {
    if (value === '' || value === null || value === undefined) return null;
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue) || numberValue < 0) {
      throw new Error(`${label} untuk Part ${partNo || '-'} harus kosong atau angka >= 0.`);
    }
    return numberValue;
  };

  const saveForecastEdit = async (): Promise<void> => {
    if (!requireUploadMdfoPermission('update', 'Update')) return;
    if (!canEditForecast.value || forecastEditRows.value.length === 0) return;

    const customer = forecastEditCustomer.value;
    const period = forecastEditPeriod.value;
    const revision = forecastEditRevision.value;
    if (customer === '' || period === '' || revision === '') return;

    try {
      const rows: MdfoForecastUpdateRow[] = forecastEditRows.value.map((row) => ({
        id: row.id,
        n1_qty: normalizeForecastDraftQty(row.n1, 'N+1', row.partNo),
        n2_qty: normalizeForecastDraftQty(row.n2, 'N+2', row.partNo),
        n3_qty: normalizeForecastDraftQty(row.n3, 'N+3', row.partNo)
      }));

      notificationStore.showConfirm(
        'Simpan dan Regenerate Quotation?',
        `Forecast ${customer} Revision ${revision} akan disimpan tanpa membuat revision baru. Quotation Q1 (N+1), Q2 (N+2), dan Q3 (N+3) pada periode ${formatPeriodLabel(period)} akan langsung diregenerate. Lanjutkan?`,
        async () => {
          try {
            isSavingForecastEdit.value = true;
            const response = await mdfoService.updateForecast(customer, period, revision, rows);
            showForecastEditModal.value = false;
            forecastEditRows.value = [];

            await loadData(undefined, { bypassCache: true });

            const refreshTasks: Promise<unknown>[] = [];
            if (quotationSectionActivated.value) refreshTasks.push(loadQuotation());
            if (trackingSectionActivated.value) refreshTasks.push(loadQuotationTracking());
            if (refreshTasks.length > 0) {
              await Promise.all(refreshTasks);
            }

            notificationStore.showAlertSuccess(
              response.message ||
                `Forecast ${customer} berhasil diperbarui dan Quotation Q1 sampai Q3 sudah diregenerasi. Revision tetap ${revision}.`
            );
          } catch (error: unknown) {
            console.error('Gagal menyimpan Edit Forecast MDFO:', error);
            notificationStore.showAlertError(
              getErrorMessage(error, 'Gagal menyimpan Edit Forecast')
            );
          } finally {
            isSavingForecastEdit.value = false;
          }
        },
        () => {},
        'Ya, Simpan & Regenerate',
        'Batal'
      );
    } catch (error: unknown) {
      console.error('Gagal menyimpan Edit Forecast MDFO:', error);
      notificationStore.showAlertError(
        getErrorMessage(error, 'Gagal menyimpan Edit Forecast')
      );
    }
  };

  type RawDeleteRow = Record<string, unknown> & {
    _id?: number;
    _customer?: string;
  };


  type RawDeletePreviewTableRow = {
    key: string;
    no: number;
    id: number;
    customer: string;
    periode: string;
    partNo: string;
    jobNo: string;
    revision: string;
  };

  const showRawDeletePreviewModal = ref(false);
  const rawDeletePreviewMode = ref<'SELECTED' | 'FILTERED'>('SELECTED');
  const rawDeletePreviewData = ref<Awaited<ReturnType<typeof previewMdfoDelete>> | null>(null);
  const rawDeletePreviewRows = ref<RawDeletePreviewTableRow[]>([]);

  const rawDeletePreviewRequested = computed(() =>
    Number(rawDeletePreviewData.value?.impact.requested ?? 0)
  );

  const rawDeletePreviewSafe = computed(() =>
    Number(rawDeletePreviewData.value?.impact.safe ?? 0)
  );

  const rawDeletePreviewProtected = computed(() =>
    Number(rawDeletePreviewData.value?.impact.protected ?? 0)
  );

  const rawDeletePreviewWarningCount = computed(() =>
    Number(rawDeletePreviewData.value?.impact.warning_count ?? 0)
  );

  const rawDeletePreviewWarnings = computed(() =>
    rawDeletePreviewData.value?.impact.warning_rows ?? []
  );

  const rawDeletePreviewCounts = computed(() =>
    rawDeletePreviewData.value?.impact.counts ?? {
      raw: 0,
      quotation: 0,
      contract: 0,
      zstt: 0,
      tracking: 0
    }
  );

  const rawDeletePreviewHiddenCount = computed(() =>
    Math.max(0, rawDeletePreviewSafe.value - rawDeletePreviewRows.value.length)
  );

  // Snapshot baris mempertahankan rincian Selected meskipun user mengganti
  // filter setelah mencentang data. Set key tetap menjadi sumber identitas,
  // sedangkan Map hanya dipakai untuk preview yang akurat.
  const rawDeleteSelectedRows = ref<Map<string, RawDeleteRow>>(new Map());

  const getRawDeleteCustomer = (row: RawDeleteRow): string => {
    /*
     * DPM dan FTI memakai layout/ref yang sama dengan NTC, sehingga
     * isNtcMode juga bernilai true untuk kedua customer tersebut.
     * Customer delete HARUS ditentukan dari mode spesifik lebih dulu;
     * kalau NTC dicek lebih awal, row FTI/DPM salah dikirim sebagai NTC.
     */
    if (isTmminMode.value) return 'TMMIN';
    if (isDpmMode.value) return 'DPM';
    if (isMesMode.value) return 'MES';
    if (isFtiMode.value) return 'FTI';
    if (dataMode.value === 'ntc') return 'NTC';
    if (isGayaMode.value) return 'GAYA MTR';

    const explicit = String(row._customer ?? '').trim().toUpperCase();
    if (explicit) return explicit;

    return String(selectedCustomerFilter.value ?? '').trim().toUpperCase();
  };

  const getRawDeleteKey = (row: RawDeleteRow): string => {
    const id = Number(row._id ?? 0);
    return id > 0 ? `${getRawDeleteCustomer(row)}|${id}` : '';
  };

  const getCurrentRawFilteredRows = (): RawDeleteRow[] => {
    if (isTmminMode.value) return tmminFilteredRows.value as RawDeleteRow[];
    if (isNtcMode.value || isDpmMode.value || isFtiMode.value) return ntcFilteredRows.value as RawDeleteRow[];
    if (isGayaMode.value) return gayaFilteredRows.value as RawDeleteRow[];
    if (isAsiAdmMode.value) return asiFilteredRows.value as RawDeleteRow[];
    return filteredRows.value as RawDeleteRow[];
  };

  const getCurrentRawPageRows = (): RawDeleteRow[] => {
    if (isTmminMode.value) return tmminPaginatedRows.value as RawDeleteRow[];
    if (isNtcMode.value || isDpmMode.value || isFtiMode.value) return ntcPaginatedRows.value as RawDeleteRow[];
    if (isGayaMode.value) return gayaPaginatedRows.value as RawDeleteRow[];
    if (isAsiAdmMode.value) return asiPaginatedRows.value as RawDeleteRow[];
    return paginatedRows.value as RawDeleteRow[];
  };

  const rawDeleteFilteredCount = computed(() => {
    return rawServerPaged.value
      ? rawServerTotal.value
      : getCurrentRawFilteredRows().length;
  });

  const isRawDeleteRowSelected = (row: RawDeleteRow): boolean => {
    const key = getRawDeleteKey(row);
    return key !== '' && rawDeleteSelectedKeys.value.has(key);
  };

  const toggleRawDeleteRow = (row: RawDeleteRow): void => {
    const key = getRawDeleteKey(row);
    if (!key) return;
    const next = new Set(rawDeleteSelectedKeys.value);
    const nextRows = new Map(rawDeleteSelectedRows.value);
    if (next.has(key)) {
      next.delete(key);
      nextRows.delete(key);
    } else {
      next.add(key);
      nextRows.set(key, row);
    }
    rawDeleteSelectedKeys.value = next;
    rawDeleteSelectedRows.value = nextRows;
  };

  const isRawDeleteCurrentPageSelected = computed(() => {
    const keys = getCurrentRawPageRows().map(getRawDeleteKey).filter(Boolean);
    return keys.length > 0 && keys.every((key) => rawDeleteSelectedKeys.value.has(key));
  });

  const toggleRawDeleteCurrentPage = (): void => {
    const next = new Set(rawDeleteSelectedKeys.value);
    const nextRows = new Map(rawDeleteSelectedRows.value);
    const pageRows = getCurrentRawPageRows();
    const keys = pageRows.map(getRawDeleteKey).filter(Boolean);
    if (isRawDeleteCurrentPageSelected.value) {
      keys.forEach((key) => {
        next.delete(key);
        nextRows.delete(key);
      });
    } else {
      pageRows.forEach((row) => {
        const key = getRawDeleteKey(row);
        if (key) {
          next.add(key);
          nextRows.set(key, row);
        }
      });
    }
    rawDeleteSelectedKeys.value = next;
    rawDeleteSelectedRows.value = nextRows;
  };

  const clearRawDeleteSelection = (): void => {
    rawDeleteSelectedKeys.value = new Set();
    rawDeleteSelectedRows.value = new Map();
  };

  const normalizeRawSelectionFilterFingerprint = (
    filters: Record<string, string[] | undefined>
  ): Record<string, string[]> => {
    return Object.keys(filters)
      .sort()
      .reduce<Record<string, string[]>>((result, key) => {
        const values = (filters[key] ?? [])
          .map((value) => String(value ?? '').trim())
          .filter(Boolean)
          .sort((first, second) => first.localeCompare(second, 'id', { numeric: true }));

        if (values.length > 0) {
          result[key] = values;
        }

        return result;
      }, {});
  };

  const rawDeleteSelectionScopeFingerprint = computed(() => {
    const filters = isGayaMode.value
      ? normalizeRawSelectionFilterFingerprint(gayaSelectedFilters.value)
      : isNtcMode.value
        ? normalizeRawSelectionFilterFingerprint(
            ntcSelectedFilters.value as unknown as Record<string, string[] | undefined>
          )
        : normalizeRawSelectionFilterFingerprint(
            selectedFilters.value as unknown as Record<string, string[] | undefined>
          );

    return JSON.stringify({
      customers: [...activeRawDisplayCustomers.value].sort(),
      periode: normalizePeriod(selectedPeriodFilter.value),
      revision: normalizeRevision(selectedRevisionFilter.value),
      filters
    });
  });

  watch(
    rawDeleteSelectionScopeFingerprint,
    (nextFingerprint, previousFingerprint) => {
      if (
        !previousFingerprint ||
        nextFingerprint === previousFingerprint ||
        rawDeleteSelectedKeys.value.size === 0
      ) {
        return;
      }

      // Selection lintas page tetap dipertahankan. Perubahan customer,
      // period, revision, atau filter kolom mengosongkan selection agar row
      // lama yang sudah tidak terlihat tidak ikut terhapus.
      clearRawDeleteSelection();
    },
    { flush: 'sync' }
  );

  const toRawDeleteTargets = (sourceRows: RawDeleteRow[]): MdfoDeleteTarget[] => {
    const targets = new Map<string, MdfoDeleteTarget>();
    sourceRows.forEach((row) => {
      const id = Number(row._id ?? 0);
      const customer = getRawDeleteCustomer(row);
      if (Number.isInteger(id) && id > 0 && customer) {
        targets.set(`${customer}|${id}`, { id, customer });
      }
    });
    return [...targets.values()];
  };

  const getRawDeletePreviewValue = (
    row: RawDeleteRow,
    keys: string[]
  ): string => {
    for (const key of keys) {
      const value = row[key];
      if (value !== null && value !== undefined && String(value).trim() !== '') {
        return String(value).trim();
      }
    }
    return '';
  };

  const buildRawDeletePreviewRows = (
    sourceRows: RawDeleteRow[],
    preview: Awaited<ReturnType<typeof previewMdfoDelete>>
  ): RawDeletePreviewTableRow[] => {
    const protectedKeys = new Set(
      preview.impact.protected_rows
        .map((row) => {
          const customer = String(row.customer ?? '').trim().toUpperCase();
          const id = Number(row.id ?? 0);
          return id > 0 ? `${customer}|${id}` : '';
        })
        .filter(Boolean)
    );

    const uniqueSafeRows = new Map<string, RawDeleteRow>();

    sourceRows.forEach((row) => {
      const key = getRawDeleteKey(row);
      if (key && !protectedKeys.has(key) && !uniqueSafeRows.has(key)) {
        uniqueSafeRows.set(key, row);
      }
    });

    // Preview tabel dibatasi agar modal tetap ringan ketika Delete Filtered
    // berisi ratusan/ribuan row. Jumlah total aman tetap ditampilkan di summary.
    return [...uniqueSafeRows.values()]
      .slice(0, 100)
      .map((row, index) => ({
        key: getRawDeleteKey(row) || `row-${index + 1}`,
        no: index + 1,
        id: Number(row._id ?? 0),
        customer: getRawDeleteCustomer(row) || '-',
        periode: getRawDeletePreviewValue(row, [
          'periode', 'period', 'deliveryPeriod', '_periode'
        ]) || '-',
        partNo: getRawDeletePreviewValue(row, [
          'partNo', 'part_no', 'partNoSap', 'part_no_sap',
          'material', 'materialSap', 'material_so'
        ]) || '-',
        jobNo: getRawDeletePreviewValue(row, [
          'uniqueNo', 'unique_no', 'jobNo', 'job_no',
          'jobNoRaw', 'job_no_raw'
        ]) || '-',
        revision: getRawDeletePreviewValue(row, ['revision', 'rev']) || '-'
      }));
  };

  const resetRawDeletePreviewState = (): void => {
    showRawDeletePreviewModal.value = false;
    rawDeletePreviewMode.value = 'SELECTED';
    rawDeletePreviewData.value = null;
    rawDeletePreviewRows.value = [];
  };

  const closeRawDeletePreviewModal = (): void => {
    resetRawDeletePreviewState();
    isDeletingRaw.value = false;
  };

  const continueRawDeletePreview = (): void => {
    const preview = rawDeletePreviewData.value;

    if (!preview) {
      closeRawDeletePreviewModal();
      return;
    }

    showRawDeletePreviewModal.value = false;

    const sapWarningCount = Number(preview.impact.warning_count ?? 0);
    const finalSapWarning = sapWarningCount > 0
      ? `

WARNING: ${sapWarningCount} scope memiliki warning Tracking SAP (DALAM PROSES / SELESAI / histori upload). Sistem tetap mengizinkan delete karena tidak ditemukan dependency Raw Sales Order atau Format Sales Order. Tracking yang menjadi orphan akan diarsipkan otomatis. Pastikan data memang ingin dibatalkan sebelum klik Ya, Hapus.`
      : '';

    window.setTimeout(() => {
      notificationStore.showConfirm(
        'Apakah Anda yakin ingin menghapus data ini?',
        `Anda akan menghapus ${preview.impact.safe} target Raw MDFO.

Seluruh target pada preview sudah lolos dependency check Sales Order dan Raw SO. Raw MDFO akan di-soft-delete bersama Quotation, Contract, dan ZSTT turunannya. Tracking tanpa dokumen aktif akan diarsipkan otomatis.${finalSapWarning}`,
        async () => {
          try {
            const result = await executeMdfoDelete({ token: preview.token });
            clearRawDeleteSelection();
            resetRawDeletePreviewState();
            mdfoService.clearRawCache();
            await loadData(undefined, { bypassCache: true });
            const refreshTasks: Promise<void>[] = [];
            if (quotationSectionActivated.value) refreshTasks.push(loadQuotation());
            if (trackingSectionActivated.value) refreshTasks.push(loadQuotationTracking());
            await Promise.all(refreshTasks);
            notificationStore.showAlertSuccess(result.message);
          } catch (error: unknown) {
            notificationStore.showAlertError(
              getErrorMessage(error, 'Delete Raw MDFO gagal.')
            );
          } finally {
            isDeletingRaw.value = false;
          }
        },
        () => {
          resetRawDeletePreviewState();
          isDeletingRaw.value = false;
        },
        'Ya, Hapus',
        'Batal'
      );
    }, 0);
  };

  const requestRawLifecycleDelete = async (mode: 'SELECTED' | 'FILTERED'): Promise<void> => {
    if (!requireUploadMdfoPermission('delete', 'Delete')) return;
    if (isDeletingRaw.value) return;

    let serverFilteredTargets: MdfoDeleteTarget[] | null = null;
    if (mode === 'FILTERED' && rawServerPaged.value) {
      try {
        isDeletingRaw.value = true;
        const rawDisplayCustomers = getRawDisplayCustomers(getSelectedScopeCustomers());
        const effectiveCustomer = normalizeMdfoDownloadCustomer(
          selectedCustomerFilter.value ||
          (rawDisplayCustomers.length === 1 ? rawDisplayCustomers[0] : '')
        );
        const result = await mdfoService.getRawFilteredTargets({
          customer: effectiveCustomer,
          customers: effectiveCustomer === '' ? rawDisplayCustomers : undefined,
          periode: selectedPeriodFilter.value,
          revision: selectedRevisionFilter.value,
          columnFilters: getActiveServerColumnFilters(effectiveCustomer)
        });

        if (result.truncated || result.total > 2000) {
          notificationStore.showAlertWarning(
            'Maksimal 2.000 Raw MDFO per delete. Persempit filter customer, periode, atau revision terlebih dahulu.'
          );
          isDeletingRaw.value = false;
          return;
        }

        serverFilteredTargets = result.data
          .map((target) => ({
            id: Number(target.id),
            customer: String(target.customer || '').trim().toUpperCase()
          }))
          .filter((target) => target.id > 0 && target.customer !== '');
      } catch (error) {
        isDeletingRaw.value = false;
        notificationStore.showAlertError(
          getErrorMessage(error, 'Gagal mengambil target Raw MDFO hasil filter.')
        );
        return;
      }
    }

    const sourceRows = mode === 'FILTERED'
      ? getCurrentRawFilteredRows()
      : [...rawDeleteSelectedKeys.value]
        .map((key) => rawDeleteSelectedRows.value.get(key))
        .filter((row): row is RawDeleteRow => row !== undefined);

    const targets = mode === 'FILTERED'
      ? (serverFilteredTargets || toRawDeleteTargets(sourceRows))
      : [...rawDeleteSelectedKeys.value]
        .map((key): MdfoDeleteTarget | null => {
          const separator = key.lastIndexOf('|');
          const customer = separator >= 0 ? key.slice(0, separator).trim() : '';
          const id = separator >= 0 ? Number(key.slice(separator + 1)) : 0;
          return customer && Number.isInteger(id) && id > 0
            ? { id, customer }
            : null;
        })
        .filter((target): target is MdfoDeleteTarget => target !== null);

    if (targets.length === 0) {
      isDeletingRaw.value = false;
      notificationStore.showAlertWarning(
        mode === 'FILTERED'
          ? 'Tidak ada Raw MDFO hasil filter yang dapat dihapus.'
          : 'Pilih minimal satu Raw MDFO.'
      );
      return;
    }

    if (targets.length > 2000) {
      isDeletingRaw.value = false;
      notificationStore.showAlertWarning(
        'Maksimal 2.000 Raw MDFO per delete. Persempit filter customer, periode, atau revision terlebih dahulu.'
      );
      return;
    }

    try {
      isDeletingRaw.value = true;

      const preview = await previewMdfoDelete({
        entity: 'RAW',
        selection_mode: mode,
        targets,
        customer: selectedCustomerFilter.value,
        periode: selectedPeriodFilter.value,
        revision: selectedRevisionFilter.value
      });

      // Raw MDFO memakai kebijakan all-or-nothing. Jika satu saja target
      // tidak memenuhi dependency delete, jangan tampilkan popup preview dan
      // jangan izinkan sebagian target yang aman ikut terhapus.
      if (
        preview.impact.safe <= 0 ||
        preview.impact.protected > 0 ||
        preview.impact.safe !== preview.impact.requested
      ) {
        isDeletingRaw.value = false;

        const blockedCount = Math.max(
          preview.impact.protected,
          preview.impact.requested - preview.impact.safe
        );

        const joinedReasons = preview.impact.protected_rows
          .map((row) => String(row.reason ?? '').trim())
          .filter(Boolean)
          .join(' ; ')
          .toLowerCase();

        if (
          joinedReasons.includes('scope penuh') ||
          joinedReasons.includes('pilih seluruh')
        ) {
          notificationStore.showAlertWarning(
            'Delete Raw MDFO ditolak. Customer ini membentuk dokumen agregat; pilih seluruh data pada customer, periode, dan revision yang sama.'
          );
          return;
        }

        const dependencies: string[] = [];

        if (joinedReasons.includes('format sales order')) {
          dependencies.push('Format Sales Order');
        }

        if (joinedReasons.includes('raw sales order')) {
          dependencies.push('Raw Sales Order');
        }

        const dependencyText = dependencies.length > 0
          ? ` Data sudah digunakan oleh ${dependencies.join(', ')}.`
          : ' Data masih memiliki dependency aktif.';

        notificationStore.showAlertWarning(
          `Delete Raw MDFO ditolak.${blockedCount > 1 ? ` ${blockedCount} data tidak dapat dihapus.` : ''}${dependencyText}`
        );
        return;
      }

      rawDeletePreviewMode.value = mode;
      rawDeletePreviewData.value = preview;
      rawDeletePreviewRows.value = buildRawDeletePreviewRows(sourceRows, preview);
      showRawDeletePreviewModal.value = true;
    } catch (error: unknown) {
      resetRawDeletePreviewState();
      isDeletingRaw.value = false;
      notificationStore.showAlertError(
        getErrorMessage(error, 'Preview delete Raw MDFO gagal.')
      );
    }
  };

  // Download Raw MDFO mengikuti Customer + Periode + Revision.

  const getRawDownloadColumnFilters = (
    customers: string[]
  ): Record<string, string[]> => {
    if (customers.length !== 1) return {};

    const singleCustomer = String(customers[0] ?? '').trim().toUpperCase();

    if (
      singleCustomer === 'NTC' ||
      singleCustomer === 'DPM' ||
      singleCustomer === 'FTI' ||
      singleCustomer === 'MES'
    ) {
      return getActiveNtcColumnFilters();
    }

    if (singleCustomer === 'GAYA MTR') {
      return {};
    }

    const activeFilters = getActiveColumnFilters();
    const normalizedFilters: Record<string, string[]> = {};

    Object.entries(activeFilters).forEach(([key, values]) => {
      if (Array.isArray(values) && values.length > 0) {
        normalizedFilters[key] = values;
      }
    });

    return normalizedFilters;
  };

  const performRawDownload = async (customers: string[]): Promise<void> => {
    const downloadedFile = await mdfoService.downloadExcel({
      customer: customers.length === 1 ? customers[0] : '',
      customers,
      periode: selectedPeriodFilter.value,
      revision: selectedRevisionFilter.value,
      columnFilters: getRawDownloadColumnFilters(customers)
    });

    notificationStore.showAlertSuccess(`${downloadedFile} berhasil didownload`);
  };

  const downloadExcel = async (): Promise<void> => {
    if (!requireUploadMdfoPermission('download', 'Download')) return;
    if (!canDownloadExcel.value) {
      notificationStore.showAlertWarning(downloadExcelDescription.value || 'Filter download belum lengkap');
      return;
    }

    try {
      isDownloadingExcel.value = true;
      const customers = [...selectedDownloadCustomers.value];
      const preflight = await mdfoService.getDownloadPreflight(
        customers,
        selectedPeriodFilter.value,
        selectedRevisionFilter.value,
        getRawDownloadColumnFilters(customers)
      );

      if (preflight.availableCustomers.length === 0) {
        notificationStore.showAlertWarning(
          customers.length > 1
            ? 'Download All dibatalkan. Tidak ada customer yang memiliki data pada periode/revision terpilih.'
            : 'Tidak ada data MDFO pada periode/revision dan filter terpilih.'
        );
        return;
      }

      const unsafeRows = preflight.available.filter((row) => {
        return row.available && row.safe_for_export === false;
      });

      if (unsafeRows.length > 0) {
        const unsafeText = unsafeRows
          .map((row) => {
            const label = getMdfoDownloadCustomerLabel(row.customer);
            const rows = Number(row.rows || 0).toLocaleString('id-ID');
            const maxRows = Number(row.max_safe_rows || 0).toLocaleString('id-ID');
            return `${label}: ${rows} baris (batas aman ~${maxRows})`;
          })
          .join('; ');

        notificationStore.showAlertWarning(
          `Download dibatalkan agar tidak memicu memory error 128 MB. ${unsafeText}. Persempit filter terlebih dahulu.`
        );
        return;
      }

      if (customers.length > 1 && preflight.unavailableCustomers.length > 0) {
        const availableText = preflight.availableCustomers
          .map(getMdfoDownloadCustomerLabel)
          .join(', ');
        const unavailableText = preflight.unavailableCustomers
          .map(getMdfoDownloadCustomerLabel)
          .join(', ');

        isDownloadingExcel.value = false;
        notificationStore.showConfirm(
          'Preflight Download All',
          `Tersedia: ${availableText}.
Tidak tersedia: ${unavailableText}.

Lanjutkan download hanya untuk customer yang tersedia?`,
          async () => {
            if (quotationStore.isDownloadingExcel || quotationStore.isGenerating) {
              notificationStore.showAlertWarning(
                quotationStore.isGenerating
                  ? 'Tunggu regenerate Quotation selesai sebelum download Raw MDFO.'
                  : 'Tunggu download Quotation/Contract/ZSTT selesai sebelum download Raw MDFO.'
              );
              return;
            }

            try {
              isDownloadingExcel.value = true;
              await performRawDownload(preflight.availableCustomers);
            } catch (error: unknown) {
              notificationStore.showAlertError(getErrorMessage(error, 'Download Excel MDFO gagal'));
            } finally {
              isDownloadingExcel.value = false;
            }
          },
          undefined,
          'Lanjut Download',
          'Batal'
        );
        return;
      }

      await performRawDownload(customers);
    } catch (error: unknown) {
      console.error('Download Excel MDFO gagal:', error);
      notificationStore.showAlertError(getErrorMessage(error, 'Download Excel MDFO gagal'));
    } finally {
      isDownloadingExcel.value = false;
    }
  };

  const downloadQuotationExcel =
    async (): Promise<void> => {
      if (!requireUploadMdfoPermission('download', 'Download')) return;
      if (!canDownloadQuotationExcel.value) {
        notificationStore.showAlertWarning(
          downloadQuotationDescription.value ||
          'Filter download belum lengkap'
        );
        return;
      }

      const customers =
        quotationDownloadCustomers.value;

      await quotationStore.downloadExcelForCustomers(
        customers,
        selectedPeriodFilter.value,
        selectedRevisionFilter.value
      );
    };

  // Watcher

  let rawFilterSearchTimer: ReturnType<typeof setTimeout> | null = null;
  let ntcFilterSearchTimer: ReturnType<typeof setTimeout> | null = null;
  let gayaFilterSearchTimer: ReturnType<typeof setTimeout> | null = null;

  watch(
    () => [
      selectedDownloadCustomers.value.join('|'),
      selectedPeriodFilter.value,
      selectedRevisionFilter.value
    ] as const,
    () => {
      void refreshDownloadScopeRowCount();
    },
    { immediate: true }
  );

  watch(
    searchFilters,
    () => {
      if (!rawServerPaged.value) return;

      const openKey = Object.keys(openFilters.value).find((key) => {
        return openFilters.value[key as MdfoKey] === true;
      }) as MdfoKey | undefined;
      if (!openKey) return;

      const keyword = String(searchFilters.value[openKey] || '').trim();
      if (rawFilterSearchTimer) clearTimeout(rawFilterSearchTimer);

      if (keyword.length < 3) {
        abortRawFilterRequest(`main:${openKey}`);
        const pageValues = isTmminMode.value
          ? tmminRows.value.map((row) => normalizeRawServerFilterValue(openKey, row[openKey]))
          : getCurrentPageRawFilterOptions(openKey);
        rawServerFilterOptions.value = {
          ...rawServerFilterOptions.value,
          [openKey]: sortFilterOptions(
            Array.from(new Set([
              ...pageValues,
              ...(selectedFilters.value[openKey] || [])
            ]))
          )
        };
        return;
      }

      rawFilterSearchTimer = setTimeout(() => {
        void loadRawServerFilterOptions(openKey, keyword).catch((error) => {
          if (!rawRemoteFilterControllers.has(`main:${openKey}`)) return;
          console.error('Gagal mencari filter Raw MDFO:', error);
        });
      }, 300);
    },
    { deep: true }
  );

  watch(
    ntcSearchFilters,
    () => {
      if (!rawServerPaged.value || !isNtcMode.value) return;

      const openKey = Object.keys(ntcOpenFilters.value).find((key) => {
        return ntcOpenFilters.value[key as NtcMdfoKey] === true;
      }) as NtcMdfoKey | undefined;
      if (!openKey) return;

      const keyword = String(ntcSearchFilters.value[openKey] || '').trim();
      if (ntcFilterSearchTimer) clearTimeout(ntcFilterSearchTimer);

      if (keyword.length < 3) {
        abortRawFilterRequest(`ntc:${openKey}`);
        seedNtcServerFilterOptions(openKey);
        return;
      }

      ntcFilterSearchTimer = setTimeout(() => {
        void loadNtcServerFilterOptions(openKey, keyword).catch((error) => {
          if (!rawRemoteFilterControllers.has(`ntc:${openKey}`)) return;
          console.error('Gagal mencari filter Raw MDFO:', error);
        });
      }, 300);
    },
    { deep: true }
  );

  watch(
    gayaSearchFilters,
    () => {
      if (!rawServerPaged.value || !isGayaMode.value) return;
      const openKey = gayaActiveFilterKey.value;
      if (!openKey) return;

      const keyword = String(gayaSearchFilters.value[openKey] || '').trim();
      if (gayaFilterSearchTimer) clearTimeout(gayaFilterSearchTimer);

      if (keyword.length < 3) {
        abortRawFilterRequest(`gaya:${openKey}`);
        seedGayaServerFilterOptions(openKey);
        return;
      }

      gayaFilterSearchTimer = setTimeout(() => {
        void loadGayaServerFilterOptions(openKey, keyword).catch((error) => {
          if (!rawRemoteFilterControllers.has(`gaya:${openKey}`)) return;
          console.error('Gagal mencari filter Raw MDFO:', error);
        });
      }, 300);
    },
    { deep: true }
  );

  watch(
    selectedFilters,
    () => {
      currentPage.value = 1;
    },
    {
      deep: true
    }
  );

  watch(rowsPerPage, () => {
    const wasFirstPage = currentPage.value === 1;
    currentPage.value = 1;
    if (rawServerPaged.value && wasFirstPage) {
      void loadData(undefined, { pageOnly: true });
    }
  });

  watch(currentPage, (page, previousPage) => {
    if (page !== previousPage && skipNextMainPageWatch) {
      skipNextMainPageWatch = false;
      return;
    }

    if (
      rawServerPaged.value &&
      page !== previousPage &&
      !isLoading.value
    ) {
      void loadData(undefined, { pageOnly: true });
    }
  });

  watch(gayaRowsPerPage, () => {
    if (!rawServerPaged.value || !isGayaMode.value) return;
    const wasFirstPage = gayaCurrentPage.value === 1;
    gayaCurrentPage.value = 1;
    if (wasFirstPage && !isLoading.value) {
      void loadData(undefined, { pageOnly: true });
    }
  });

  watch(ntcRowsPerPage, () => {
    if (!rawServerPaged.value || !isNtcMode.value) return;
    const wasFirstPage = ntcCurrentPage.value === 1;
    ntcCurrentPage.value = 1;
    if (wasFirstPage && !isLoading.value) {
      void loadData(undefined, { pageOnly: true });
    }
  });

  watch(ntcCurrentPage, (page, previousPage) => {
    if (page !== previousPage && skipNextNtcPageWatch) {
      skipNextNtcPageWatch = false;
      return;
    }

    if (
      rawServerPaged.value &&
      isNtcMode.value &&
      page !== previousPage &&
      !isLoading.value
    ) {
      void loadData(undefined, { pageOnly: true });
    }
  });

  watch(gayaCurrentPage, (page, previousPage) => {
    if (page !== previousPage && skipNextGayaPageWatch) {
      skipNextGayaPageWatch = false;
      return;
    }

    if (
      rawServerPaged.value &&
      isGayaMode.value &&
      page !== previousPage &&
      !isLoading.value
    ) {
      void loadData(undefined, { pageOnly: true });
    }
  });

  watch(
    () => [latestAvailablePeriodYear.value, selectedPeriodFilter.value] as const,

    async ([latestYear, selectedPeriod]) => {
      if (latestYear === '') {
        return;
      }

      const normalizedSelected = normalizePeriod(selectedPeriod);

      const selectedYear = normalizedSelected !== '' ? normalizedSelected.slice(0, 4) : '';

      const savedLatestYear = typeof window !== 'undefined' ? window.localStorage.getItem(LATEST_PERIOD_YEAR_STORAGE_KEY) || '' : '';

      const hasYearChanged = /^\d{4}$/.test(savedLatestYear) && Number(latestYear) > Number(savedLatestYear);

      const selectedPeriodIsOld = normalizedSelected !== '' && selectedYear !== latestYear;

      if ((hasYearChanged || selectedPeriodIsOld) && defaultLatestYearPeriod.value !== '') {
        await applyPeriodFilter(defaultLatestYearPeriod.value);
      }

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(LATEST_PERIOD_YEAR_STORAGE_KEY, latestYear);
      }
    },

    {
      flush: 'post'
    }
  );


  // Page actions

  const openMdfoFilePicker =
    (): void => {
      if (!requireUploadMdfoPermission('create', 'Create')) return;
      if (
        !validateCustomerBeforeChooseFile()
      ) {
        return;
      }

      uploadFileInput.value?.click();
    };

  const onPeriodFilterChange =
    async (
      event:
        Event
    ): Promise<void> => {
      const input =
        event.target as HTMLInputElement;

      await applyPeriodInputValue(
        input.value
      );
    };

  // Quotation view helpers

  const addPartPeriodInputValue =
    computed(() => {
      const periode =
        String(
          quotationStore
            .addPartForm
            .periode ??
          ''
        ).replace(
          /\D/g,
          ''
        );

      if (
        !/^\d{6}$/.test(
          periode
        )
      ) {
        return '';
      }

      return `${periode.slice(0, 4)}-${periode.slice(4, 6)}`;
    });

  const onAddPartPeriodInputChange =
    async (
      event:
        Event
    ): Promise<void> => {
      const input =
        event.target as HTMLInputElement;

      const periode =
        String(
          input.value ??
          ''
        ).replace(
          /\D/g,
          ''
        );

      if (
        !quotationStore
          .addPartPeriodOptions
          .includes(
            periode
          )
      ) {
        input.value =
          addPartPeriodInputValue.value;

        return;
      }

      await quotationStore
        .selectAddPartPeriod(
          periode
        );
    };

  const getZsttHeaderBackground =
    (
      key:
        QuotationKey,
      technical =
        false
    ): string => {
      if (
        quotationStore
          .selectedQuotationMode !==
        'ZSTT'
      ) {
        return technical
          ? '#dbeafe'
          : '#eff6ff';
      }

      if (
        key ===
        'zsttTotal'
      ) {
        return technical
          ? '#fde68a'
          : '#fef3c7';
      }

      if (
        key ===
        'contractTotal'
      ) {
        return technical
          ? '#ddd6fe'
          : '#ede9fe';
      }

      if (
        key ===
        'status'
      ) {
        return technical
          ? '#a7f3d0'
          : '#d1fae5';
      }

      return technical
        ? '#dbeafe'
        : '#eff6ff';
    };

  const getZsttBodyBackground =
    (
      key:
        QuotationKey,
      row:
        QuotationRow,
      rowIndex:
        number
    ): string => {
      if (
        quotationStore
          .selectedQuotationMode !==
        'ZSTT'
      ) {
        return '';
      }

      if (
        key ===
        'zsttTotal'
      ) {
        return '#fffbeb';
      }

      if (
        key ===
        'contractTotal'
      ) {
        return '#f5f3ff';
      }

      if (
        key ===
        'status'
      ) {
        return row.status ===
          'TRUE'
          ? '#ecfdf5'
          : '#fef2f2';
      }

      return rowIndex % 2 ===
        0
        ? '#ffffff'
        : '#f8fafc';
    };

  const quotationOrderQuantityIndex =
    computed(() => {
      return quotationStore
        .columns
        .findIndex(
          (column) =>
            column.key ===
            'orderQuantity'
        );
    });

  const quotationRightFooterColspan =
    computed(() => {
      const index =
        quotationOrderQuantityIndex.value;

      if (
        index < 0
      ) {
        return 0;
      }

      return Math.max(
        0,
        quotationStore
          .columns
          .length -
        index -
        1
      );
    });

  // MDFO and quotation synchronization

  let quotationScopeRequestId = 0;
  let quotationTrackingScopeRequestId = 0;
  const quotationSectionActivated = ref(false);
  const trackingSectionActivated = ref(false);

  const loadQuotation =
    async (): Promise<void> => {
      const requestId = ++quotationScopeRequestId;
      const rawScopeCustomers = getSelectedScopeCustomers();
      const scopeCustomers = getDocumentScopeCustomers(rawScopeCustomers);
      if (rawScopeCustomers.length > 0 && scopeCustomers.length === 0) {
        quotationStore.rows = [];
        quotationStore.serverTotal = 0;
        quotationStore.batchId = null;
        quotationStore.currentPage = 1;
        return;
      }

      await quotationStore.loadData({
        customer: scopeCustomers.length === 1 ? scopeCustomers[0] : '',
        customers: scopeCustomers.length > 1 ? scopeCustomers : undefined,
        periode: selectedPeriodFilter.value,
        revision: selectedRevisionFilter.value,
        page: quotationStore.currentPage
      });
      if (requestId !== quotationScopeRequestId) return;
    };

  const setQuotationModeForScope =
    async (
      mode: QuotationMode
    ): Promise<void> => {
      const valid = quotationStore
        .quotationModeOptions
        .some((option) => {
          return option.value === mode;
        });

      if (
        !valid ||
        quotationStore.selectedQuotationMode === mode
      ) {
        return;
      }

      const rawScopeCustomers =
        getSelectedScopeCustomers();

      const scopeCustomers =
        getDocumentScopeCustomers(
          rawScopeCustomers
        );

      const isAllCustomers =
        rawScopeCustomers.length === 0 ||
        scopeCustomers.length === MDFO_DOCUMENT_CUSTOMERS.size;

      if (isAllCustomers) {
        quotationStore.selectedQuotationMode = mode;
        quotationStore.clearAllFilters();
        await loadQuotation();
        return;
      }

      if (scopeCustomers.length === 0) return;

      if (scopeCustomers.length <= 1) {
        await quotationStore.setQuotationMode(mode);
        return;
      }

      /*
       * Pada multi-customer jangan memakai activeFilters customer terakhir.
       * Ganti mode, lalu reload ulang seluruh scope customer dan merge.
       */
      quotationStore.selectedQuotationMode = mode;
      quotationStore.clearAllFilters();

      await loadQuotation();
    };

  const loadQuotationTracking =
    async (): Promise<void> => {
      const requestId = ++quotationTrackingScopeRequestId;
      const rawScopeCustomers = getSelectedScopeCustomers();
      const scopeCustomers = getDocumentScopeCustomers(rawScopeCustomers);
      if (rawScopeCustomers.length > 0 && scopeCustomers.length === 0) {
        quotationTrackingStore.rows = [];
        quotationTrackingStore.serverTotal = 0;
        quotationTrackingStore.currentPage = 1;
        return;
      }

      await quotationTrackingStore.loadData({
        customer: scopeCustomers.length === 1 ? scopeCustomers[0] : '',
        customers: scopeCustomers.length > 1 ? scopeCustomers : undefined,
        periode: selectedPeriodFilter.value,
        revision: selectedRevisionFilter.value,
        page: quotationTrackingStore.currentPage
      });
      if (requestId !== quotationTrackingScopeRequestId) return;
    };

  const activateQuotationSection = async (): Promise<void> => {
    if (!quotationSectionActivated.value) quotationSectionActivated.value = true;
    await loadQuotation();
  };

  const activateTrackingSection = async (): Promise<void> => {
    if (!trackingSectionActivated.value) trackingSectionActivated.value = true;
    await loadQuotationTracking();
  };

  const regenerateQuotation =
    async (): Promise<void> => {
      if (!requireUploadMdfoPermission('update', 'Update')) return;
      if (isDownloadingExcel.value || quotationStore.isDownloadingExcel || quotationStore.isGenerating) {
        notificationStore.showAlertWarning(
          isDownloadingExcel.value
            ? 'Tunggu download Raw MDFO selesai sebelum regenerate Quotation.'
            : quotationStore.isDownloadingExcel
              ? 'Tunggu download Quotation/Contract/ZSTT selesai sebelum regenerate.'
              : 'Regenerate Quotation sedang berjalan.'
        );
        return;
      }

      const rawScopeCustomers =
        getSelectedScopeCustomers();

      const regenerateScopeCustomers =
        getDocumentScopeCustomers(
          rawScopeCustomers
        );

      if (
        rawScopeCustomers.length > 0 &&
        regenerateScopeCustomers.length === 0
      ) {
        notificationStore.showAlertWarning(
          'Customer dokumen tidak valid untuk regenerate.'
        );
        return;
      }

      const sourceBatchId =
        Number(
          batchId.value ||
          0
        );

      if (
        !Number.isInteger(
          sourceBatchId
        ) ||
        sourceBatchId <=
        0
      ) {
        notificationStore.showAlertWarning(
          'Batch MDFO aktif tidak ditemukan.'
        );
        return;
      }

      const customerLabel =
        regenerateScopeCustomers.length > 0
          ? regenerateScopeCustomers
              .map(getMdfoDownloadCustomerLabel)
              .join(', ')
          : 'customer pada batch aktif';

      const periodLabel =
        selectedPeriodFilter.value !== ''
          ? formatPeriodLabel(
              selectedPeriodFilter.value
            )
          : 'semua periode';

      const revisionLabel =
        selectedRevisionFilter.value !== ''
          ? `Revision ${selectedRevisionFilter.value}`
          : 'semua revision';

      notificationStore.showConfirm(
        'Regenerate Quotation',
        'Quotation, Contract, dan ZSTT pada batch MDFO aktif akan dibuat ulang. ' +
          'Filter saat ini: ' +
          customerLabel +
          ', ' +
          periodLabel +
          ', ' +
          revisionLabel +
          '. Raw MDFO tidak akan dihapus. ' +
          'Urutan item revision yang sudah pernah terbentuk tetap dipertahankan. Lanjutkan?',
        async () => {
          // Confirmation bisa dibiarkan terbuka cukup lama. Cek ulang lock
          // agar export yang dimulai setelah dialog muncul tidak overlap
          // dengan proses regenerate.
          if (isDownloadingExcel.value || quotationStore.isDownloadingExcel || quotationStore.isGenerating) {
            notificationStore.showAlertWarning(
              isDownloadingExcel.value
                ? 'Tunggu download Raw MDFO selesai sebelum regenerate Quotation.'
                : quotationStore.isDownloadingExcel
                  ? 'Tunggu download Quotation/Contract/ZSTT selesai sebelum regenerate.'
                  : 'Regenerate Quotation sedang berjalan.'
            );
            return;
          }

          await quotationStore
            .regenerate(
              sourceBatchId
            );

          await loadQuotationTracking();
        }
      );
    };

  const quotationWatchReady =
    shallowRef(false);

  watch(
    () =>
      [
        selectedCustomerFilter.value,
        selectedDownloadCustomerScopeKey.value,
        selectedPeriodFilter.value,
        selectedRevisionFilter.value,
        batchId.value
      ] as const,
    async () => {
      if (
        !quotationWatchReady.value
      ) {
        return;
      }

      // Perubahan Customer/Period/Revision adalah perubahan scope bisnis.
      // Selection lintas page tetap valid hanya selama scope yang sama.
      clearRawDeleteSelection();
      clearMdfoTrackingBulkSelection();
      quotationStore.clearDeleteSelection();

      quotationStore
        .clearAllFilters();

      quotationTrackingStore
        .clearAllFilters();

      quotationTrackingStore
        .closeAllPopups();

      const lazyLoads: Promise<void>[] = [];
      if (quotationSectionActivated.value) lazyLoads.push(loadQuotation());
      if (trackingSectionActivated.value) lazyLoads.push(loadQuotationTracking());
      await Promise.all(lazyLoads);
    },
    {
      flush:
        'post'
    }
  );

  watch(
    () => [
      quotationTrackingStore.selectedFilters,
      quotationTrackingStore.selectedColorFilters
    ] as const,
    () => {
      if (mdfoTrackingBulkSelectedIds.value.size > 0) {
        clearMdfoTrackingBulkSelection();
      }
    },
    {
      deep: true,
      flush: 'sync'
    }
  );

  const handleLifecycleDeleted = (): void => {
    clearRawDeleteSelection();
    mdfoService.clearRawCache();
    const refreshTasks: Promise<void>[] = [
      loadData(undefined, { bypassCache: true })
    ];
    if (quotationSectionActivated.value) refreshTasks.push(loadQuotation());
    if (trackingSectionActivated.value) refreshTasks.push(loadQuotationTracking());
    void Promise.all(refreshTasks);
  };

  const initializeUploadMdfoView =
    async (): Promise<void> => {
      quotationWatchReady.value =
        false;

      quotationSectionActivated.value = false;
      trackingSectionActivated.value = false;

      // Pasang listener dan hitung viewport SEBELUM request data. Navigasi ke
      // Upload MDFO jadi dapat paint lebih dahulu dan tidak terasa tertahan
      // oleh query first load.
      if (
        typeof window !==
        'undefined'
      ) {
        syncRawMdfoViewportWidth();

        window.removeEventListener(
          'resize',
          syncRawMdfoViewportWidth
        );

        window.addEventListener(
          'resize',
          syncRawMdfoViewportWidth
        );

        window.removeEventListener(
          'click',
          quotationTrackingStore.closeAllPopups
        );

        window.addEventListener(
          'click',
          quotationTrackingStore.closeAllPopups
        );

        window.removeEventListener('mdfo-lifecycle-deleted', handleLifecycleDeleted);
        window.addEventListener('mdfo-lifecycle-deleted', handleLifecycleDeleted);
      }

      // Beri browser dua frame untuk menampilkan halaman lebih dahulu. First
      // query hanya mengambil page Raw; metadata filter disegarkan background.
      await waitForUploadMdfoInitialPaint();
      await loadData(undefined, { pageOnly: true });

      quotationWatchReady.value =
        true;

      scheduleRawMainFilterMetadataRefresh();
    };

  const cleanupUploadMdfoView =
    (): void => {
      quotationWatchReady.value =
        false;
      activeRawLoadController?.abort();
      activeRawLoadController = null;
      rawMetadataRefreshSerial++;
      if (rawMetadataRefreshTimer) {
        clearTimeout(rawMetadataRefreshTimer);
        rawMetadataRefreshTimer = null;
      }
      quotationSectionActivated.value = false;
      trackingSectionActivated.value = false;

      resetDpmSanitizedPdfState();

      closeAllDropdowns();
      closeNtcFilters();
      closeGayaFilters();
      quotationStore.closeAllDropdowns();
      quotationTrackingStore.closeAllPopups();

      if (
        typeof window !==
        'undefined'
      ) {
        window.removeEventListener(
          'resize',
          syncRawMdfoViewportWidth
        );

        window.removeEventListener(
          'click',
          quotationTrackingStore.closeAllPopups
        );

        window.removeEventListener('mdfo-lifecycle-deleted', handleLifecycleDeleted);
      }
    };

  // Public Api

  return {
    // Page
    page,
    breadcrumbs,
    uploadFileInput,
    addPartPeriodInputValue,
    quotationOrderQuantityIndex,
    quotationRightFooterColspan,

    // Audited lifecycle delete Raw MDFO
    rawDeleteSelectedKeys,
    isDeletingRaw,
    isRawDeleteRowSelected,
    toggleRawDeleteRow,
    isRawDeleteCurrentPageSelected,
    toggleRawDeleteCurrentPage,
    clearRawDeleteSelection,
    rawDeleteFilteredCount,
    permissions,
    requestRawLifecycleDelete,
    showRawDeletePreviewModal,
    rawDeletePreviewMode,
    rawDeletePreviewRows,
    rawDeletePreviewRequested,
    rawDeletePreviewSafe,
    rawDeletePreviewProtected,
    rawDeletePreviewWarningCount,
    rawDeletePreviewWarnings,
    rawDeletePreviewCounts,
    rawDeletePreviewHiddenCount,
    closeRawDeletePreviewModal,
    continueRawDeletePreview,

    // Tracking bulk update
    mdfoTrackingBulkMode,
    mdfoTrackingBulkSelectedIds,
    mdfoTrackingBulkDate,
    mdfoTrackingBulkTime,
    mdfoTrackingBulkUser,
    mdfoTrackingBulkStatus,
    mdfoTrackingBulkRemarks,
    mdfoTrackingBulkUserDropdownOpen,
    mdfoTrackingBulkStatusDropdownOpen,
    mdfoTrackingVisibleUserOptions,
    mdfoTrackingBulkStatusMeta,
    mdfoTrackingBulkIsApplying,
    mdfoTrackingBulkProgressDone,
    mdfoTrackingBulkProgressTotal,
    mdfoTrackingBulkMessage,
    mdfoTrackingBulkMessageType,
    mdfoTrackingBulkSelectedRows,
    mdfoTrackingBulkSelectedCount,
    mdfoTrackingBulkHasChanges,
    isMdfoTrackingBulkCurrentPageSelected,
    closeMdfoTrackingBulkValueDropdowns,
    toggleMdfoTrackingBulkUserValueDropdown,
    toggleMdfoTrackingBulkStatusValueDropdown,
    selectMdfoTrackingBulkUserValue,
    selectMdfoTrackingBulkStatusValue,
    toggleMdfoTrackingBulkMode,
    isMdfoTrackingBulkRowSelected,
    toggleMdfoTrackingBulkRow,
    selectMdfoTrackingBulkCurrentPage,
    toggleMdfoTrackingBulkCurrentPageSelection,
    selectMdfoTrackingBulkFilteredRows,
    clearMdfoTrackingBulkSelection,
    requestTrackingLifecycleDelete,
    setMdfoTrackingBulkToday,
    setMdfoTrackingBulkNow,
    applyMdfoTrackingBulkUpdate,

    openMdfoFilePicker,
    onPeriodFilterChange,
    onAddPartPeriodInputChange,
    getZsttHeaderBackground,
    getZsttBodyBackground,
    loadQuotation,
    loadQuotationTracking,
    activateQuotationSection,
    activateTrackingSection,
    quotationSectionActivated,
    trackingSectionActivated,
    regenerateQuotation,
    initializeUploadMdfoView,
    cleanupUploadMdfoView,
    columns,
    asiDisplayColumns,
    asiDayColumns,
    fixedColumns,
    dayColumns,
    isLaptopAdmRawFreeze,
    activeFrozenColumns,
    rawFooterLabelColspan,
    rawFooterSpacerColumns,
    rawFooterTotalColumns,

    dataMode,
    isTmminMode,
    tmminRows,
    tmminColumns,
    tmminDisplayColumns,
    tmminFrozenColumnCount,
    tmminFrozenPaneWidth,
    tmminFilteredRows,
    tmminSortedRows,
    tmminPaginatedRows,
    tmminColumnTotals,
    tmminTotalLabelColspan,
    tmminTableWidth,
    tmminAvailableSupplierCodes,
    getTmminColumnStyle,
    getTmminTotalLabelStyle,
    formatTmminCellValue,

    // Raw MDFO NTC
    isNtcMode,
    isDpmMode,
    isFtiMode,
    isMesMode,
    ntcRows,
    ntcColumns,
    ntcTotalsFromApi,
    ntcMonthHeaders,
    ntcSelectedFilters,
    ntcSearchFilters,
    ntcOpenFilters,
    ntcFilterPopupPosition,
    ntcSortKey,
    ntcSortDirection,
    ntcCurrentPage,
    ntcRowsPerPage,
    isLaptopNtcRawFreeze,
    ntcFrozenColumnCount,
    ntcFrozenPaneWidth,
    ntcFilteredRows,
    ntcSortedRows,
    ntcPaginatedRows,
    ntcColumnTotals,
    ntcTableWidth,
    ntcTotalPages,
    ntcVisiblePages,
    ntcShowingStart,
    ntcShowingEnd,
    getNtcColumnOptions,
    getNtcSelectedLabel,
    isNtcAllSelected,
    toggleNtcFilter,
    closeNtcFilters,
    toggleNtcFilterOption,
    toggleNtcAllColumn,
    clearNtcColumnFilter,
    clearNtcFilters,
    setNtcSort,
    isNtcSortActive,
    isNtcNoSortActive,
    setNtcRowsPerPage,
    ntcFirstPage,
    ntcPrevPage,
    ntcNextPage,
    ntcLastPage,
    getNtcColumnStyle,
    formatNtcCellValue,
    formatNtcTotalValue,
    getActiveNtcColumnFilters,

    // Raw MDFO Gaya Motor
    isGayaMode,
    isAsiAdmMode,
    gayaRows,
    gayaColumns,
    gayaTotalsFromApi,
    gayaCurrentPage,
    gayaRowsPerPage,
    gayaFrozenColumnCount,
    gayaSelectedFilters,
    gayaSearchFilters,
    gayaActiveFilterKey,
    gayaActiveFilterColumn,
    gayaFilterPopupPosition,
    gayaSortKey,
    gayaSortDirection,
    gayaFilteredRows,
    gayaSortedRows,
    gayaPaginatedRows,
    gayaColumnTotals,
    gayaTableWidth,
    gayaTotalPages,
    gayaVisiblePages,
    gayaShowingStart,
    gayaShowingEnd,
    getGayaColumnOptions,
    getGayaSelectedLabel,
    isGayaAllSelected,
    toggleGayaFilter,
    closeGayaFilters,
    toggleGayaFilterOption,
    toggleGayaAllColumn,
    clearGayaColumnFilter,
    clearGayaFilters,
    setGayaSort,
    isGayaSortActive,
    isGayaNoSortActive,
    setGayaRowsPerPage,
    gayaFirstPage,
    gayaPrevPage,
    gayaNextPage,
    gayaLastPage,
    getGayaColumnStyle,
    formatGayaCellValue,
    formatGayaTotalValue,

    rows,
    batchId,
    dayHeaders,

    isLoading,
    isUploading,
    isDownloadingExcel,

    // Upload

    selectedFiles,
    selectedFileNames,
    selectedCustomerUpload,
    ftiUploadMode,
    isFtiManualMode,
    isFtiOcrMode,
    isMesManualMode,
    mesManualPeriod,
    mesManualPeriodCompact,
    mesManualMonthLabels,
    mesManualPartOptions,
    mesManualRows,
    setMesManualPoNumber,
    onMesManualPoNumberInput,
    isMesManualRowsComplete,
    isMesUploadSetComplete,
    setMesManualPeriod,
    updateMesManualPartNo,
    updateMesManualPartName,
    isMesManualPartNameReadonly,
    isMesManualPartNameResolving,
    addMesManualRow,
    removeMesManualRow,
    showMesZsttModal,
    isSubmittingMesZstt,
    isLoadingMesZsttDraft,
    mesZsttBatchId,
    mesZsttPeriod,
    mesZsttRows,
    mesZsttDayKeys,
    getMesZsttRowTotal,
    getMesZsttRemaining,
    isMesZsttValid,
    canOpenMesZsttEditor,
    openMesZsttEditor,
    closeMesZsttModal,
    submitMesZstt,
    ftiManualPeriod,
    ftiManualPeriodCompact,
    ftiManualMonthLabels,
    ftiManualScheduleFile,
    ftiManualForecastFile,
    ftiManualSourceFiles,
    ftiManualSourceInputKey,
    ftiManualForecastLocked,
    ftiManualPartOptions,
    ftiManualRows,
    setFtiManualPoNumber,
    onFtiManualPoNumberInput,
    getFtiManualPoNumberLength,
    isFtiManualPoNumberValid,
    getFtiManualPoNumberWarning,
    ftiManualSourceRows,
    ftiManualSourceMismatches,
    isLoadingFtiManualSources,
    isFtiManualRowsComplete,
    uploadRevision,
    uploadRevisionPlan,
    isDetectingUploadRevision,
    uploadRevisionConfirmed,
    isUploadRevisionDetected,
    isUploadRevisionReady,
    detectUploadRevision,
    setFtiUploadMode,
    setFtiManualPeriod,
    onFtiManualScheduleFileChange,
    onFtiManualForecastFileChange,
    clearFtiManualScheduleFile,
    clearFtiManualForecastFile,
    refreshFtiManualSources,
    updateFtiManualPartNo,
    updateFtiManualPartName,
    isFtiManualPartNameReadonly,
    isFtiManualPartNameResolving,
    addFtiManualRow,
    removeFtiManualRow,
    isFtiUploadSetComplete,
    uploadBy,
    canSelectUploadUser,
    hasUploadUserLoginMapping,
    mappedUploadUser,
    showUploadModal,

    uploadInputKey,

    isCheckingFiles,
    filesChecked,
    fileCheckResults,
    allCheckedFilesValid,
    canOpenUploadPreview,
    canPrepareDpmSanitizedPdfs,
    canSubmitUpload,

    customerUploadOptions,
    uploadUserOptions,

    // Upload Dropdown

    showMdfoCustomerDropdown,
    showMdfoUploadUserDropdown,

    // Excel Preview

    showMdfoUploadPreview,

    showDpmSanitizedPdfPreview,
    isPreparingDpmSanitizedPdfs,
    dpmSanitizedPdfError,
    dpmSanitizedPdfs,
    activeDpmSanitizedPdfIndex,
    activeDpmSanitizedPdf,

    activePreviewFileIndex,
    activePreviewFile,

    isPreviewLoading,

    excelWorkbook,
    excelSheetNames,
    selectedExcelSheet,

    excelPreviewHeaders,
    excelPreviewRows,
    excelColumnCount,
    normalizedExcelPreviewRows,
    excelPreviewError,

    // Header Filter Dropdown

    showTableCustomerDropdown,
    showTablePeriodDropdown,
    showTableRevisionDropdown,

    selectedCustomerFilter,
    selectedPeriodFilter,
    selectedRevisionFilter,

    // Edit Forecast FTI / MES (revision tetap)
    showForecastEditModal,
    isLoadingForecastEdit,
    isSavingForecastEdit,
    forecastEditRows,
    forecastEditCustomer,
    forecastEditPeriod,
    forecastEditRevision,
    canEditForecast,
    forecastEditButtonTitle,

    selectedDownloadCustomers,
    draftDownloadCustomers,
    downloadScopeRowCount,
    sharedDownloadRowCount,
    downloadCustomerOptions,
    selectedDownloadCustomerLabels,
    downloadCustomerButtonLabel,
    activeRawDisplayCustomers,
    rawDisplayCustomerLabel,
    rawDisplayScopeDiffersFromSelectedScope,
    isAllDownloadCustomersDraftSelected,

    customerFilterOptions,
    periodFilterOptions,
    revisionFilterOptions,

    normalizedPeriodOptions,
    latestAvailablePeriodYear,
    latestYearPeriodOptions,
    defaultLatestYearPeriod,

    selectedFilters,
    searchFilters,
    openFilters,
    activeColumnMenu,
    filterPopupPosition,

    currentPage,
    rowsPerPage,
    rowsPerPageOptions,

    sortKey,
    sortDirection,

    periodInputValue,
    selectedPeriodLabel,
    selectedRevisionLabel,

    tableWidth,
    frozenPaneWidth,
    dailyTotalWidth: DAILY_TOTAL_WIDTH,

    hasOpenFilter,
    hasActiveFilter,
    hasActiveRawColumnFilter,
    filteredRows,
    sortedRows,
    exportRowCount,
    columnTotals,
    dailyGrandTotal,

    totalPages,
    visiblePages,
    paginatedRows,
    asiPaginatedRows,
    asiSortedRows,
    asiColumnTotals,
    asiDailyGrandTotal,
    asiFooterLabelColspan,
    asiFooterLabelColumns,
    asiFooterTotalColumns,
    showingStart,
    showingEnd,
    activeTotalPages,
    activeVisiblePages,
    activeShowingStart,
    activeShowingEnd,

    missingDownloadFilters,
    isHeavyOperationRunning,
    canDownloadExcel,
    downloadExcelDescription,
    rawDownloadButtonLabel,
    canDownloadQuotationExcel,
    downloadQuotationDescription,
    quotationDownloadButtonLabel,

    stickyHeaderTopBorder,
    stickyFooterBottomBorder,

    formatPeriodLabel,
    formatNumber,
    formatCellValue,
    userColorClass,

    getDayHeader,
    getColumnStyle,
    getAsiColumnStyle,
    getAsiFooterLabelCellStyle,
    getAsiFooterLabelOverlayStyle,
    getAsiTotalLabelStyle,
    isAsiFrozenColumn,
    asiTableWidth,
    getAsiCellValue,
    getFooterColumnStyle,
    getTotalLabelStyle,
    isFrozenColumn,

    getFilteredColumnOptions,
    getActiveColumnFilters,
    getSelectedLabel,
    isAllSelected,
    hideFilterLabel,

    getRowTotal,
    getDailyTotal,

    isSortActive,
    isNoSortActive,
    setSort,

    closeMainFilterDropdowns,
    closeMdfoPageDropdowns,
    toggleTableCustomerDropdown,
    toggleTablePeriodDropdown,
    toggleTableRevisionDropdown,
    isDownloadCustomerDraftSelected,
    toggleDownloadCustomerDraft,
    toggleAllDownloadCustomersDraft,
    clearDownloadCustomerDraft,
    applyDownloadCustomerSelection,

    toggleMdfoCustomerDropdown,
    toggleMdfoUploadUserDropdown,

    selectMdfoCustomer,
    selectUploadUser,

    openUploadModal,
    closeUploadModal,
    clearUploadForm,
    openUploadPreview,
    closeUploadPreview,
    openForecastEdit,
    closeForecastEdit,
    saveForecastEdit,

    selectTableCustomer,
    selectTablePeriod,
    selectTableRevision,
    applyPeriodInputValue,

    toggleDropdown,
    closeAllDropdowns,
    toggleFilter,
    toggleAllColumn,
    clearColumnFilter,
    clearAllFilters,

    toggleColumnMenu,

    setRowsPerPage,
    firstPage,
    prevPage,
    nextPage,
    lastPage,

    onFileChange,
    removeSelectedFile,
    submitUpload,

    loadData,
    applyCustomerFilter,
    applyPeriodFilter,
    applyRevisionFilter,
    clearMainFilters,

    downloadExcel,
    downloadQuotationExcel,
    setQuotationModeForScope,
    validateCustomerBeforeChooseFile,
    validateMdfoFileList,
    checkSelectedFiles,

    prepareDpmSanitizedPdfs,
    closeDpmSanitizedPdfPreview,
    selectDpmSanitizedPdf,
    downloadActiveDpmSanitizedPdf,
    downloadAllDpmSanitizedPdfs,

    resetSelectedFiles,
    resetFileValidationState,

    loadExcelSheetPreview,
    handleExcelSheetChange,
    loadActiveFilePreview,
    selectPreviewFile,

    validateUploadForm,

    getDailyTotalHeaderStyle,

    getDailyTotalBodyStyle,

    getDailyTotalFooterStyle,

    getEmptyRowStyle,
    totalLabelColspan,
    totalLabelFrozenWidth,
    getTotalLabelCellStyle,
    excelPreviewSummary,
    excelPreviewForecastSummary,
    dpmPreviewWarnings,
    excelPreviewDetectedHeaderRow,
    excelPreviewColumnWidths,
    excelPreviewTableWidth,
    getFtiPreviewColumnPercentage,
    excelPreviewFrozenColumnCount,
    getExcelPreviewCellStyle,
    getExcelPreviewDisplayValue
  };
});
