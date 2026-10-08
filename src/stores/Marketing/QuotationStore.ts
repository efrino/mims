import {
  computed,
  ref,
  watch
} from 'vue';

import type {
  CSSProperties
} from 'vue';

import {
  defineStore
} from 'pinia';

import {
  quotationService
} from '@/services/Marketing/Quotation';

import {
  executeMdfoDelete,
  previewMdfoDelete
} from '@/services/Marketing/MdfoDeleteService';

import {
  useNotificationStore
} from '@/stores/notification';

import {
  useAuthStore
} from '@/stores/auth';

import {
  getAnchoredPopupPosition,
  useAnchoredPopup
} from '@/composables/useAnchoredPopup';

import type {
  QuotationActiveFilters,
  QuotationColumn,
  QuotationColumnFilters,
  QuotationDataFilter,
  QuotationKey,
  QuotationMode,
  QuotationModeOption,
  QuotationRow,
  QuotationSelectedFilters,
  QuotationSearchFilters,
  QuotationOpenFilters,
  ZsttDayKey,
  QuotationAddPartPayload
} from '@/types/Marketing/Quotation';

// Mode and column configuration

// Manual add part

const showAddPartModal =
  ref(false);

const isSavingAddPart =
  ref(false);

const addPartForm =
  ref({
    customer: '',
    periode: '',
    revision: '0',
    material: '',
    orderQuantity: '',
    remarks: ''
  });


// Add part options

const isLoadingAddPartOptions =
  ref(false);

const addPartCustomerOptions =
  ref<string[]>([]);

const addPartPeriodOptions =
  ref<string[]>([]);

const addPartRevisionOptions =
  ref<string[]>([]);

type AddPartDraftItem = {
  id: number;
  material: string;
  orderQuantity: string;
  error: string;
};

let addPartDraftSequence = 0;

const addPartPasteText =
  ref('');

const addPartItems =
  ref<AddPartDraftItem[]>([]);

const addPartSaveCurrent =
  ref(0);

const addPartSaveTotal =
  ref(0);

const isCheckingAddPartDuplicates =
  ref(false);

const addPartDraftCount =
  computed(() => addPartItems.value.length);

const addPartPasteCandidateCount =
  computed(() => {
    return parseAddPartPasteCandidates(
      addPartPasteText.value
    ).candidates.length;
  });

const normalizeAddPartMaterialExact = (
  value: unknown
): string => {
  // Hanya trim + uppercase.
  // Titik akhir TIDAK dihapus.
  return String(value ?? '')
    .trim()
    .toUpperCase();
};

const isAddPartHeaderValue = (
  value: string
): boolean => {
  const clean = value
    .replace(/[\s_\-./]+/g, '')
    .toUpperCase();

  return [
    'PARTNO',
    'PARTNUMBER',
    'MATERIAL',
    'MATERIALSO',
    'MATERIALSAP'
  ].includes(clean);
};

/*
 * Duplicate key dibuat sama dengan rule backend.
 *
 * Umum:
 *   exact trim + uppercase.
 *
 * ADM P5:
 *   61024-BZ370-00-26 = 61024-BZ370-00
 *   57106-BZ240-00E26 = 57106-BZ240-00
 *
 * Trailing dot tetap berbeda:
 *   57147-BZ010-00
 *   57147-BZ010-00.
 */
const getAddPartDuplicateKey = (
  customer: unknown,
  material: unknown
): string => {
  const normalizedCustomer =
    String(customer ?? '')
      .trim()
      .toUpperCase();

  const normalizedMaterial =
    normalizeAddPartMaterialExact(
      material
    );

  if (
    normalizedMaterial === '' ||
    normalizedCustomer !== 'ADM P5'
  ) {
    return normalizedMaterial;
  }

  const dashSuffix =
    normalizedMaterial.match(
      /^(.*-[A-Z0-9]{2})-\d{2}$/
    );

  if (dashSuffix?.[1]) {
    return dashSuffix[1];
  }

  const eSuffix =
    normalizedMaterial.match(
      /^(.*-[A-Z0-9]{2})E\d{2}$/
    );

  if (eSuffix?.[1]) {
    return eSuffix[1];
  }

  return normalizedMaterial;
};

type ParsedAddPartCandidate = {
  material: string;
  quantity?: string;
};

const parseAddPartPasteCandidates = (
  text: unknown
): {
  candidates: ParsedAddPartCandidate[];
  duplicateInPaste: number;
  skippedEmptyOrHeader: number;
} => {
  const raw =
    String(text ?? '')
      .replace(/\r/g, '')
      .trim();

  if (raw === '') {
    return {
      candidates: [],
      duplicateInPaste: 0,
      skippedEmptyOrHeader: 0
    };
  }

  const customer =
    addPartForm.value.customer;

  const candidates:
    ParsedAddPartCandidate[] = [];

  const seenKeys =
    new Set<string>();

  let duplicateInPaste = 0;
  let skippedEmptyOrHeader = 0;

  raw
    .split('\n')
    .forEach(
      (line) => {
        const cells =
          line
            .split('\t')
            .map(
              (cell) =>
                cell.trim()
            );

        const material =
          normalizeAddPartMaterialExact(
            cells[0] ?? ''
          );

        if (
          material === '' ||
          isAddPartHeaderValue(
            material
          )
        ) {
          skippedEmptyOrHeader += 1;
          return;
        }

        const duplicateKey =
          getAddPartDuplicateKey(
            customer,
            material
          );

        if (
          duplicateKey === '' ||
          seenKeys.has(
            duplicateKey
          )
        ) {
          duplicateInPaste += 1;
          return;
        }

        seenKeys.add(
          duplicateKey
        );

        /*
         * Bila user copy 2 kolom Part No | Part Name,
         * kolom kedua bukan angka sehingga diabaikan.
         *
         * Bila kolom kedua angka > 0, boleh dianggap Qty.
         */
        const secondCell =
          cells[1] ?? '';

        const quantity =
          secondCell !== '' &&
            Number.isFinite(
              Number(secondCell)
            ) &&
            Number(secondCell) > 0
            ? secondCell
            : undefined;

        candidates.push({
          material,
          quantity
        });
      }
    );

  return {
    candidates,
    duplicateInPaste,
    skippedEmptyOrHeader
  };
};

const getDefaultAddPartQuantity = (): string => {
  const value =
    Number(
      addPartForm.value.orderQuantity
    );

  return (
    Number.isFinite(value) &&
    value > 0
  )
    ? String(value)
    : '1';
};

const hasAddPartDraftDuplicate = (
  material: string
): boolean => {
  const customer =
    addPartForm.value.customer;

  const targetKey =
    getAddPartDuplicateKey(
      customer,
      material
    );

  if (targetKey === '') {
    return false;
  }

  return addPartItems.value.some(
    (item) =>
      getAddPartDuplicateKey(
        customer,
        item.material
      ) === targetKey
  );
};

const pushAddPartDraft = (
  rawMaterial: unknown,
  rawQuantity?: unknown
): boolean => {
  const material =
    normalizeAddPartMaterialExact(
      rawMaterial
    );

  if (
    material === '' ||
    isAddPartHeaderValue(material) ||
    hasAddPartDraftDuplicate(material)
  ) {
    return false;
  }

  const parsedQuantity =
    Number(rawQuantity);

  const quantity =
    (
      Number.isFinite(parsedQuantity) &&
      parsedQuantity > 0
    )
      ? String(parsedQuantity)
      : getDefaultAddPartQuantity();

  addPartDraftSequence += 1;

  addPartItems.value.push({
    id: addPartDraftSequence,
    material,
    orderQuantity: quantity,
    error: ''
  });

  return true;
};

const resetAddPartDraft = (): void => {
  addPartPasteText.value = '';
  addPartItems.value = [];
  addPartSaveCurrent.value = 0;
  addPartSaveTotal.value = 0;
};

const addPartSaveCount =
  computed(() => {
    const pendingMaterial =
      normalizeAddPartMaterialExact(
        addPartForm.value.material
      );

    const hasPending =
      pendingMaterial !== '' &&
      !hasAddPartDraftDuplicate(
        pendingMaterial
      );

    return (
      addPartItems.value.length +
      (hasPending ? 1 : 0)
    );
  });

// Add Part Dropdowns

const showAddPartCustomerDropdown =
  ref(false);

const showAddPartPeriodDropdown =
  ref(false);

const showAddPartRevisionDropdown =
  ref(false);

const GRID_BORDER =
  '#e2e8f0';

const ROWS_PER_PAGE_OPTIONS = [
  10,
  20,
  50,
  100
];

const QUOTATION_MODE_OPTIONS:
  QuotationModeOption[] = [
    {
      value: 'Q',
      label: 'Q',
      forecastLabel: 'N',
      description:
        'Quotation bulan berjalan'
    },
    {
      value: 'Q1',
      label: 'Q1',
      forecastLabel: 'N+1',
      description:
        'Quotation bulan berikutnya'
    },
    {
      value: 'Q2',
      label: 'Q2',
      forecastLabel: 'N+2',
      description:
        'Quotation dua bulan berikutnya'
    },
    {
      value: 'Q3',
      label: 'Q3',
      forecastLabel: 'N+3',
      description:
        'Quotation tiga bulan berikutnya'
    },
    {
      value: 'CONTRACT',
      label: 'Contract',
      forecastLabel: '',
      description:
        'Contract berdasarkan Quotation Q'
    },
    {
      value: 'ZSTT',
      label: 'ZSTT',
      forecastLabel: '',
      description:
        'Daily quantity MDFO dibandingkan Contract'
    }
  ];

const QUOTATION_COLUMNS:
  QuotationColumn[] = [
    {
      key: 'salesDocument',
      label: 'Sales Document',
      technicalLabel: 'VBAK-VBELN',
      width: '100px'
    },
    {
      key: 'documentDate',
      label: 'Document Date',
      technicalLabel: 'VBAK-AUDAT',
      width: '85px'
    },
    {
      key: 'salesDocType',
      label: 'Sales Doc. Type',
      technicalLabel: 'VBAK-AUART',
      width: '80px'
    },
    {
      key: 'salesOrg',
      label: 'Sales Org.',
      technicalLabel: 'VBAK-VKORG',
      width: '78px'
    },
    {
      key: 'distrChannel',
      label: 'Distr. Channel',
      technicalLabel: 'VBAK-VTWEG',
      width: '80px'
    },
    {
      key: 'division',
      label: 'Division',
      technicalLabel: 'VBAK-SPART',
      width: '75px'
    },
    {
      key: 'salesGroup',
      label: 'Sales Group',
      technicalLabel: 'VBAK-VKGRP',
      width: '95px'
    },
    {
      key: 'salesOffice',
      label: 'Sales Office',
      technicalLabel: 'VBAK-VKBUR',
      width: '80px'
    },
    {
      key: 'validFrom',
      label: 'Valid from',
      technicalLabel: 'VBAK-ANGDT',
      width: '80px'
    },
    {
      key: 'validTo',
      label: 'Valid to',
      technicalLabel: 'VBAK-BNDDT',
      width: '80px'
    },
    {
      key: 'priceDate',
      label: 'Price Date',
      technicalLabel: 'VBKD-PRSDT',
      width: '80px'
    },
    {
      key: 'soldToParty',
      label: 'Sold-to party',
      technicalLabel: 'VBPA-KUNNR',
      width: '100px'
    },
    {
      key: 'shipToParty',
      label: 'Ship-to party',
      technicalLabel: 'VBPA-KUNNR',
      width: '100px'
    },
    {
      key: 'billToParty',
      label: 'Bill-to party',
      technicalLabel: 'VBPA-KUNNR',
      width: '100px'
    },
    {
      key: 'payer',
      label: 'Payer',
      technicalLabel: 'VBPA-KUNNR',
      width: '100px'
    },
    {
      key: 'item',
      label: 'Item',
      technicalLabel: 'VBAP-POSNR',
      width: '75px'
    },
    {
      key: 'material',
      label: 'Material',
      technicalLabel: 'VBAP-MATNR',
      width: '140px'
    },
    {
      key: 'orderQuantity',
      label: 'Order Quantity',
      technicalLabel: 'VBAP-KWMENG',
      width: '110px'
    },
    {
      key: 'plant',
      label: 'Plant',
      technicalLabel: 'VBAP-WERKS',
      width: '80px'
    },
    {
      key: 'shippingPoint',
      label:
        'Shipping Point/\nReceiving Pt',
      technicalLabel: 'VBAP-VSTEL',
      width: '120px'
    }
  ];

const CONTRACT_COLUMNS:
  QuotationColumn[] = [
    {
      key: 'salesDocument',
      label: 'Sales Document',
      technicalLabel: 'VBAK-VBELN',
      width: '100px'
    },
    {
      key: 'referenceDoc',
      label: 'Reference doc.',
      technicalLabel: 'VBFA-VBELV',
      width: '115px'
    },
    {
      key: 'documentDate',
      label: 'Document Date',
      technicalLabel: 'VBAK-AUDAT',
      width: '85px'
    },
    {
      key: 'salesDocType',
      label: 'Sales Doc. Type',
      technicalLabel: 'VBAK-AUART',
      width: '80px'
    },
    {
      key: 'salesOrg',
      label: 'Sales Org.',
      technicalLabel: 'VBAK-VKORG',
      width: '78px'
    },
    {
      key: 'distrChannel',
      label: 'Distr. Channel',
      technicalLabel: 'VBAK-VTWEG',
      width: '80px'
    },
    {
      key: 'division',
      label: 'Division',
      technicalLabel: 'VBAK-SPART',
      width: '75px'
    },
    {
      key: 'salesGroup',
      label: 'Sales Group',
      technicalLabel: 'VBAK-VKGRP',
      width: '95px'
    },
    {
      key: 'salesOffice',
      label: 'Sales Office',
      technicalLabel: 'VBAK-VKBUR',
      width: '80px'
    },
    {
      key: 'validFrom',
      label: 'Valid from',
      technicalLabel: 'VBAK-GUEBG',
      width: '80px'
    },
    {
      key: 'validTo',
      label: 'Valid to',
      technicalLabel: 'VBAK-GUEEN',
      width: '80px'
    },
    {
      key: 'shippingCondition',
      label: 'Shipping Condition',
      technicalLabel: 'VBAK-VSBED',
      width: '110px'
    },
    {
      key: 'priceDate',
      label: 'Price Date',
      technicalLabel: 'VBKD-PRSDT',
      width: '80px'
    },
    {
      key: 'poNumber',
      label: 'PO Number',
      technicalLabel: 'VBKD-BSTNK',
      width: '115px'
    },
    {
      key: 'poDate',
      label: 'PO Date',
      technicalLabel: 'VBKD-BSTDK',
      width: '90px'
    },
    {
      key: 'soldToParty',
      label: 'Sold-to party',
      technicalLabel: 'VBPA-KUNNR',
      width: '100px'
    },
    {
      key: 'shipToParty',
      label: 'Ship-to party',
      technicalLabel: 'VBPA-KUNNR',
      width: '100px'
    },
    {
      key: 'billToParty',
      label: 'Bill-to party',
      technicalLabel: 'VBPA-KUNNR',
      width: '100px'
    },
    {
      key: 'payer',
      label: 'Payer',
      technicalLabel: 'VBPA-KUNNR',
      width: '100px'
    },
    {
      key: 'item',
      label: 'Item',
      technicalLabel: 'VBAP-POSNR',
      width: '75px'
    },
    {
      key: 'material',
      label: 'Material',
      technicalLabel: 'VBAP-MATNR',
      width: '127px'
    },
    {
      key: 'orderQuantity',
      label: 'Order Quantity',
      technicalLabel: 'VBAP-KWMENG',
      width: '110px'
    },
    {
      key: 'plant',
      label: 'Plant',
      technicalLabel: 'VBAP-WERKS',
      width: '80px'
    },
    {
      key: 'shippingPoint',
      label:
        'Shipping Point/\nReceiving Pt',
      technicalLabel: 'VBAP-VSTEL',
      width: '120px'
    },
    {
      key: 'customerPlant',
      label: 'Customer Plant',
      technicalLabel: 'VBBK-Z001',
      width: '180px'
    },
    {
      key: 'cycleIssue',
      label: 'Cycle Issue',
      technicalLabel: 'VBBK-Z002',
      width: '120px'
    },
    {
      key: 'remarks',
      label: 'Remarks',
      technicalLabel: 'VBBK-Z003',
      width: '150px'
    }
  ];

const ALL_ZSTT_DAY_KEYS:
  ZsttDayKey[] =
  Array.from(
    {
      length: 31
    },
    (_, index) =>
      `d${String(
        index + 1
      ).padStart(
        2,
        '0'
      )}` as ZsttDayKey
  );

const ZSTT_LEFT_COLUMNS:
  QuotationColumn[] = [
    {
      key: 'salesDocument',
      label: 'Sales Document',
      technicalLabel: 'VBAK-VBELN',
      width: '120px'
    },
    {
      key: 'material',
      label: 'Material',
      technicalLabel: 'VBAP-MATNR',
      width: '145px'
    }
  ];

const ZSTT_RIGHT_COLUMNS:
  QuotationColumn[] = [
    {
      key: 'revision',
      label: 'Rev',
      technicalLabel: 'REV',
      width: '65px'
    },
    {
      key: 'zsttTotal',
      label: 'Total',
      technicalLabel: 'TOTAL',
      width: '90px'
    },
    {
      key: 'contractTotal',
      label: 'Contract',
      technicalLabel: 'CONTR',
      width: '90px'
    },
    {
      key: 'status',
      label: 'Status',
      technicalLabel: 'STATUS',
      width: '80px'
    }
  ];

const ZSTT_ALL_COLUMNS:
  QuotationColumn[] = [
    ...ZSTT_LEFT_COLUMNS,
    ...ALL_ZSTT_DAY_KEYS.map(
      (key, index) => ({
        key,
        label: String(index + 1),
        technicalLabel: '',
        width: '52px'
      })
    ),
    ...ZSTT_RIGHT_COLUMNS
  ];

const ALL_COLUMNS:
  QuotationColumn[] = [
    ...new Map<
      QuotationKey,
      QuotationColumn
    >(
      [
        ...QUOTATION_COLUMNS,
        ...CONTRACT_COLUMNS,
        ...ZSTT_ALL_COLUMNS
      ].map((column) => [
        column.key,
        column
      ])
    ).values()
  ];

const NUMERIC_COLUMNS =
  new Set<QuotationKey>([
    'item',
    'orderQuantity',
    ...ALL_ZSTT_DAY_KEYS,
    'zsttTotal',
    'contractTotal'
  ]);

const numberFormatter =
  new Intl.NumberFormat(
    'id-ID',
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }
  );

// Pure helpers

const getWidthNumber = (
  width: string
): number => {
  return Number(
    width.replace('px', '')
  );
};

const formatRawValue = (
  value: unknown
): string => {
  return value === null ||
    value === undefined
    ? ''
    : String(value);
};

const BLANK_FILTER_OPTION =
  'Blanks';

const normalizeFilterOption = (
  value: unknown
): string => {
  const rawValue =
    formatRawValue(value);

  return rawValue.trim() === ''
    ? BLANK_FILTER_OPTION
    : rawValue;
};

const toRawFilterOption = (
  value: string
): string => {
  return value ===
    BLANK_FILTER_OPTION
    ? ''
    : value;
};

const compareFilterOptions = (
  first: string,
  second: string
): number => {
  if (first === BLANK_FILTER_OPTION) {
    return second === BLANK_FILTER_OPTION
      ? 0
      : -1;
  }

  if (second === BLANK_FILTER_OPTION) {
    return 1;
  }

  return first.localeCompare(
    second,
    'id',
    { numeric: true }
  );
};

const matchesSearchTokens = (value: unknown, search: unknown): boolean => {
  const normalizedValue = String(value ?? '').trim().toLocaleLowerCase('id');
  const normalizedSearch = String(search ?? '')
    .trim()
    .toLocaleLowerCase('id')
    .replace(/\s+/g, ' ');

  if (normalizedSearch === '') return true;
  if (normalizedValue.includes(normalizedSearch)) return true;

  const tokens = Array.from(new Set(normalizedSearch.split(' ').filter(Boolean))).slice(0, 8);
  return tokens.length > 0 && tokens.every((token) => normalizedValue.includes(token));
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

const normalizeFilters = (
  filters: QuotationDataFilter
): QuotationActiveFilters => {
  return {
    batchId:
      normalizeBatchId(
        filters.batchId
      ),
    customer:
      String(
        filters.customer ?? ''
      )
        .trim()
        .toUpperCase(),
    periode:
      String(
        filters.periode ?? ''
      ).replace(/\D/g, ''),
    revision:
      String(
        filters.revision ?? ''
      ).trim()
  };
};

const getErrorMessage = (
  error: unknown,
  fallbackMessage: string
): string => {
  if (
    error &&
    typeof error === 'object'
  ) {
    const responseMessage =
      (
        error as {
          response?: {
            data?: {
              message?: unknown;
            };
          };
        }
      ).response?.data?.message;

    if (
      responseMessage !== undefined &&
      responseMessage !== null &&
      String(responseMessage).trim() !== ''
    ) {
      return String(
        responseMessage
      );
    }
  }

  return error instanceof Error
    ? error.message
    : fallbackMessage;
};

const createSelectedFilters = ():
  QuotationSelectedFilters => {
  const filters:
    QuotationSelectedFilters = {};

  ALL_COLUMNS.forEach((column) => {
    filters[column.key] = [];
  });

  return filters;
};

const createSearchFilters = ():
  QuotationSearchFilters => {
  const filters:
    QuotationSearchFilters = {};

  ALL_COLUMNS.forEach((column) => {
    filters[column.key] = '';
  });

  return filters;
};

const createOpenFilters = ():
  QuotationOpenFilters => {
  const filters:
    QuotationOpenFilters = {};

  ALL_COLUMNS.forEach((column) => {
    filters[column.key] = false;
  });

  return filters;
};

// Store

export const useQuotationStore =
  defineStore(
    'quotation',
    () => {
      const notificationStore =
        useNotificationStore();
      const authStore =
        useAuthStore();

      const requireUploadMdfoPermission = (
        action: 'Create' | 'Update' | 'Delete' | 'Download'
      ): boolean => {
        const permission = `Marketing.${action}.Monthly.UploadMdfo`;
        if (authStore.checkAccess(permission)) {
          return true;
        }

        notificationStore.showAlertWarning(
          `Anda tidak memiliki permission ${action} untuk fitur Upload MDFO.`
        );
        return false;
      };

      // Mode and data

      const selectedQuotationMode =
        ref<QuotationMode>('Q');

      const rows =
        ref<QuotationRow[]>([]);

      const serverPaged = ref(false);
      const serverTotal = ref(0);
      const serverTotalPages = ref(1);
      const serverTotalOrderQuantity = ref(0);
      const activeCustomers = ref<string[]>([]);

      const batchId =
        ref<number | null>(null);

      const activeFilters =
        ref<QuotationActiveFilters>({
          batchId: null,
          customer: '',
          periode: '',
          revision: ''
        });

      const isLoading =
        ref(false);

      const isGenerating =
        ref(false);

      const isDownloadingExcel =
        ref(false);

      const deleteSelectedIds = ref<Set<number>>(new Set());
      const isDeleting = ref(false);

      const zsttDaysInMonth =
        ref(31);

      const zsttDayHeaders =
        ref<
          Partial<
            Record<
              ZsttDayKey,
              string
            >
          >
        >({});

      const formatAddPartPeriod =
        (
          periode:
            string
        ): string => {

          const normalized =
            String(
              periode ??
              ''
            ).replace(
              /\D/g,
              ''
            );

          if (
            !/^\d{6}$/.test(
              normalized
            )
          ) {
            return (
              normalized ||
              'Select Period'
            );
          }

          const year =
            Number(
              normalized.slice(
                0,
                4
              )
            );

          const month =
            Number(
              normalized.slice(
                4,
                6
              )
            );

          if (
            month <
            1 ||
            month >
            12
          ) {
            return normalized;
          }

          return new Intl
            .DateTimeFormat(
              'id-ID',
              {
                month:
                  'long',

                year:
                  'numeric'
              }
            )
            .format(
              new Date(
                year,
                month - 1,
                1
              )
            );
        };

      const closeAddPartDropdowns =
        (): void => {

          showAddPartCustomerDropdown
            .value =
            false;

          showAddPartPeriodDropdown
            .value =
            false;

          showAddPartRevisionDropdown
            .value =
            false;
        };

      const toggleAddPartCustomerDropdown =
        (): void => {

          const next =
            !showAddPartCustomerDropdown
              .value;

          closeAddPartDropdowns();

          showAddPartCustomerDropdown
            .value =
            next;
        };

      const toggleAddPartPeriodDropdown =
        (): void => {

          if (
            !addPartForm
              .value
              .customer
          ) {
            notificationStore
              .showAlertWarning(
                'Pilih Customer terlebih dahulu.'
              );

            return;
          }

          const next =
            !showAddPartPeriodDropdown
              .value;

          closeAddPartDropdowns();

          showAddPartPeriodDropdown
            .value =
            next;
        };

      const toggleAddPartRevisionDropdown =
        (): void => {

          if (
            !addPartForm
              .value
              .customer ||
            !addPartForm
              .value
              .periode
          ) {
            notificationStore
              .showAlertWarning(
                'Pilih Customer dan Periode terlebih dahulu.'
              );

            return;
          }

          const next =
            !showAddPartRevisionDropdown
              .value;

          closeAddPartDropdowns();

          showAddPartRevisionDropdown
            .value =
            next;
        };

      const loadAddPartOptions =
        async (
          customer = '',
          periode = ''
        ): Promise<{
          latestPeriod: string;
          latestRevision: string;
        }> => {

          try {

            isLoadingAddPartOptions
              .value =
              true;

            const response =
              await quotationService
                .getAddPartOptions({
                  customer,
                  periode
                });

            if (
              response.status !==
              'success'
            ) {
              throw new Error(
                response.message ||
                'Gagal mengambil pilihan Add Part.'
              );
            }

            addPartCustomerOptions
              .value =
              Array.isArray(
                response.customers
              )
                ? response.customers
                : [];

            addPartPeriodOptions
              .value =
              Array.isArray(
                response.periods
              )
                ? response.periods
                : [];

            addPartRevisionOptions
              .value =
              Array.isArray(
                response.revisions
              )
                ? response.revisions
                : [];

            return {
              latestPeriod:
                String(
                  response
                    .latest_period ??
                  ''
                ),

              latestRevision:
                String(
                  response
                    .latest_revision ??
                  ''
                )
            };

          } catch (
          error: unknown
          ) {

            console.error(
              'Add Part Options:',
              error
            );

            notificationStore
              .showAlertError(
                getErrorMessage(
                  error,
                  'Gagal mengambil pilihan Add Part.'
                )
              );

            return {
              latestPeriod:
                '',

              latestRevision:
                ''
            };

          } finally {

            isLoadingAddPartOptions
              .value =
              false;
          }
        };

      // FILTER, SORT, DAN PAGINATION

      const selectedFilters =
        ref<QuotationSelectedFilters>(
          createSelectedFilters()
        );

      const searchFilters =
        ref<QuotationSearchFilters>(
          createSearchFilters()
        );

      const serverFilterOptions =
        ref<Partial<Record<QuotationKey, string[]>>>({});

      const remoteFilterControllers =
        new Map<QuotationKey, AbortController>();

      const remoteFilterTimers =
        new Map<QuotationKey, ReturnType<typeof setTimeout>>();

      const openFilters =
        ref<QuotationOpenFilters>(
          createOpenFilters()
        );

      const filterPopupPosition =
        ref({
          top: 0,
          left: 0
        });

      const quotationFilterAnchor = useAnchoredPopup(() => {
        ALL_COLUMNS.forEach((column) => {
          openFilters.value[column.key] = false;
        });
      });

      const sortKey =
        ref<QuotationKey | ''>('');

      const sortDirection =
        ref<
          'none' | 'asc' | 'desc'
        >('none');

      const currentPage =
        ref(1);

      const rowsPerPage =
        ref(10);

      const rowsPerPageOptions =
        ROWS_PER_PAGE_OPTIONS;

      // COMPUTED: MODE DAN KOLOM

      const quotationModeOptions =
        QUOTATION_MODE_OPTIONS;

      const zsttDayColumns =
        computed<
          QuotationColumn[]
        >(() => {
          return ALL_ZSTT_DAY_KEYS
            .slice(
              0,
              zsttDaysInMonth.value
            )
            .map(
              (key, index) => ({
                key,
                label:
                  String(index + 1),
                technicalLabel:
                  zsttDayHeaders
                    .value[key] || '',
                width: '52px'
              })
            );
        });

      const zsttColumns =
        computed<
          QuotationColumn[]
        >(() => [
          ...ZSTT_LEFT_COLUMNS,
          ...zsttDayColumns.value,
          ...ZSTT_RIGHT_COLUMNS
        ]);

      const columns =
        computed<
          QuotationColumn[]
        >(() => {
          if (
            selectedQuotationMode
              .value === 'CONTRACT'
          ) {
            return CONTRACT_COLUMNS;
          }

          if (
            selectedQuotationMode
              .value === 'ZSTT'
          ) {
            return zsttColumns.value;
          }

          return QUOTATION_COLUMNS;
        });

      const frozenColumns =
        computed<
          QuotationKey[]
        >(() => {
          if (
            selectedQuotationMode
              .value === 'ZSTT'
          ) {
            return [
              'salesDocument',
              'material'
            ];
          }

          if (
            selectedQuotationMode
              .value === 'CONTRACT'
          ) {
            return [
              'salesDocument',
              'referenceDoc',
              'documentDate',
              'salesDocType',
              'salesOrg',
              'distrChannel',
              'division',
              'salesGroup',
              'salesOffice'
            ];
          }

          return [
            'salesDocument',
            'documentDate',
            'salesDocType',
            'salesOrg',
            'distrChannel',
            'division',
            'salesGroup',
            'salesOffice'
          ];
        });

      const selectedQuotationModeOption =
        computed(() => {
          return (
            quotationModeOptions.find(
              (option) => {
                return (
                  option.value ===
                  selectedQuotationMode
                    .value
                );
              }
            ) ||
            quotationModeOptions[0]
          );
        });

      const selectedQuotationTitle =
        computed(() => {
          const mode =
            selectedQuotationMode.value;

          if (mode === 'CONTRACT') {
            return 'Contract';
          }

          if (mode === 'ZSTT') {
            return 'ZSTT';
          }

          const option =
            selectedQuotationModeOption
              .value;

          return (
            `Quotation ${option.label}` +
            ` (${option.forecastLabel})`
          );
        });

      const selectedQuotationDescription =
        computed(() => {
          const mode =
            selectedQuotationMode.value;

          if (mode === 'CONTRACT') {
            return (
              'Generated Contract from Quotation'
            );
          }

          if (mode === 'ZSTT') {
            return (
              'Daily MDFO and Contract Cross-check'
            );
          }

          return (
            'Generated Quotation from MDFO'
          );
        });

      const tableWidth =
        computed(() => {
          const width =
            columns.value.reduce(
              (total, column) => {
                return (
                  total +
                  getWidthNumber(
                    column.width
                  )
                );
              },
              0
            );

          return `${width}px`;
        });

      const orderQuantityColumnIndex =
        computed(() => {
          return columns.value
            .findIndex((column) => {
              return (
                column.key ===
                'orderQuantity'
              );
            });
        });

      const rightFooterColspan =
        computed(() => {
          const index =
            orderQuantityColumnIndex
              .value;

          if (index < 0) {
            return 0;
          }

          return Math.max(
            0,
            columns.value.length -
            index -
            1
          );
        });

      // COMPUTED: FILTER, SORT, PAGINATION, TOTAL

      const filteredRows =
        computed(() => {
          if (serverPaged.value) return rows.value;

          const activeFilters = columns.value
            .map((column) => ({
              key: column.key,
              selected: new Set(
                selectedFilters.value[column.key] ?? []
              )
            }))
            .filter((filter) => filter.selected.size > 0);

          if (activeFilters.length === 0) return rows.value;

          return rows.value.filter(
            (row) => {
              return activeFilters.every(
                (filter) => {
                  return filter.selected.has(
                    normalizeFilterOption(
                      row[filter.key]
                    )
                  );
                }
              );
            }
          );
        });

      const sortedRows =
        computed(() => {
          if (serverPaged.value) return rows.value;

          const data = [
            ...filteredRows.value
          ];

          if (
            sortKey.value === '' ||
            sortDirection.value ===
            'none'
          ) {
            return data;
          }

          const key =
            sortKey.value;

          return data.sort(
            (first, second) => {
              const firstValue =
                formatRawValue(
                  first[key]
                );

              const secondValue =
                formatRawValue(
                  second[key]
                );

              const result =
                firstValue.localeCompare(
                  secondValue,
                  'id',
                  {
                    numeric: true
                  }
                );

              return (
                sortDirection.value ===
                'asc'
              )
                ? result
                : -result;
            }
          );
        });

      const exportRowCount =
        computed(() => {
          return serverPaged.value ? serverTotal.value : sortedRows.value.length;
        });

      const totalPages =
        computed(() => {
          if (serverPaged.value) return Math.max(1, serverTotalPages.value);
          return Math.max(1, Math.ceil(sortedRows.value.length / rowsPerPage.value));
        });

      const paginatedRows =
        computed(() => {
          if (serverPaged.value) return rows.value;
          const start = (currentPage.value - 1) * rowsPerPage.value;
          return sortedRows.value.slice(start, start + rowsPerPage.value);
        });

      const visiblePages =
        computed(() => {
          const maximum = 15;
          const pages: number[] = [];

          let start = Math.max(
            1,
            currentPage.value -
            Math.floor(
              maximum / 2
            )
          );

          const end = Math.min(
            totalPages.value,
            start + maximum - 1
          );

          if (
            end - start <
            maximum - 1
          ) {
            start = Math.max(
              1,
              end - maximum + 1
            );
          }

          for (
            let page = start;
            page <= end;
            page++
          ) {
            pages.push(page);
          }

          return pages;
        });

      const showingStart =
        computed(() => {
          if ((serverPaged.value ? serverTotal.value : sortedRows.value.length) === 0) {
            return 0;
          }

          return (
            (
              currentPage.value - 1
            ) *
            rowsPerPage.value +
            1
          );
        });

      const showingEnd =
        computed(() => {
          return Math.min(currentPage.value * rowsPerPage.value, serverPaged.value ? serverTotal.value : sortedRows.value.length);
        });

      const orderQuantityGrandTotal =
        computed(() => {
          if (serverPaged.value) return serverTotalOrderQuantity.value;
          return filteredRows.value
            .reduce(
              (total, row) => {
                return (
                  total +
                  (
                    Number(
                      row.orderQuantity
                    ) || 0
                  )
                );
              },
              0
            );
        });

      const zsttColumnTotals =
        computed(() => {
          const totals:
            Partial<
              Record<
                QuotationKey,
                number
              >
            > = {};

          const totalKeys:
            QuotationKey[] = [
              ...ALL_ZSTT_DAY_KEYS.slice(
                0,
                zsttDaysInMonth.value
              ),
              'zsttTotal',
              'contractTotal'
            ];

          totalKeys.forEach((key) => {
            totals[key] =
              filteredRows.value.reduce(
                (total, row) => {
                  return (
                    total +
                    (
                      Number(row[key]) ||
                      0
                    )
                  );
                },
                0
              );
          });

          return totals;
        });

      const zsttOverallStatus =
        computed(() => {
          if (
            filteredRows.value.length ===
            0
          ) {
            return '';
          }

          const zstt =
            Number(
              zsttColumnTotals
                .value.zsttTotal || 0
            );

          const contract =
            Number(
              zsttColumnTotals
                .value.contractTotal || 0
            );

          return (
            Math.abs(
              zstt - contract
            ) < 0.0000001
          )
            ? 'TRUE'
            : 'FALSE';
        });

      // COMPUTED: DOWNLOAD

      const missingDownloadFilters =
        computed(() => {
          const missing: string[] = [];

          if (
            activeFilters
              .value.customer === ''
          ) {
            missing.push('Customer');
          }

          if (
            activeFilters
              .value.periode === ''
          ) {
            missing.push('Periode');
          }

          if (
            activeFilters
              .value.revision === ''
          ) {
            missing.push('Revision');
          }

          return missing;
        });

      const canDownloadExcel =
        computed(() => {
          const customer =
            activeFilters.value.customer;

          const periode =
            activeFilters.value.periode;

          const revision =
            activeFilters.value.revision;

          return (
            customer !== '' &&
            /^\d{6}$/.test(periode) &&
            /^\d+$/.test(revision) &&
            !isDownloadingExcel.value
          );
        });

      const downloadExcelDescription =
        computed(() => {
          if (
            isDownloadingExcel.value
          ) {
            return (
              'File Excel sedang dipersiapkan'
            );
          }

          const periode =
            activeFilters
              .value.periode;

          if (
            periode !== '' &&
            !/^\d{6}$/.test(periode)
          ) {
            return (
              'Format periode harus YYYYMM'
            );
          }

          const revision =
            activeFilters
              .value.revision;

          if (
            revision !== '' &&
            !/^\d+$/.test(revision)
          ) {
            return (
              'Format revision tidak valid'
            );
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

      // Presentation Helper

      const getHeaderBackground = (
        key: QuotationKey,
        technical = false
      ): string => {
        if (
          selectedQuotationMode
            .value !== 'ZSTT'
        ) {
          return technical
            ? '#dbeafe'
            : '#eff6ff';
        }

        if (key === 'zsttTotal') {
          return technical
            ? '#fde68a'
            : '#fef3c7';
        }

        if (key === 'contractTotal') {
          return technical
            ? '#ddd6fe'
            : '#ede9fe';
        }

        if (key === 'status') {
          return technical
            ? '#a7f3d0'
            : '#d1fae5';
        }

        return technical
          ? '#dbeafe'
          : '#eff6ff';
      };

      const getBodyBackground = (
        key: QuotationKey,
        row: QuotationRow,
        rowIndex: number
      ): string => {
        if (
          selectedQuotationMode
            .value !== 'ZSTT'
        ) {
          return '';
        }

        if (key === 'zsttTotal') {
          return '#fffbeb';
        }

        if (key === 'contractTotal') {
          return '#f5f3ff';
        }

        if (key === 'status') {
          return row.status === 'TRUE'
            ? '#ecfdf5'
            : '#fef2f2';
        }

        return rowIndex % 2 === 0
          ? '#ffffff'
          : '#f8fafc';
      };

      const formatNumber = (
        value: unknown
      ): string => {
        if (
          value === null ||
          value === undefined ||
          value === ''
        ) {
          return '';
        }

        const number =
          Number(value);

        return Number.isFinite(number)
          ? numberFormatter.format(number)
          : String(value);
      };

      const formatCellValue = (
        key: QuotationKey,
        value: unknown
      ): string => {
        return NUMERIC_COLUMNS.has(key)
          ? formatNumber(value)
          : formatRawValue(value);
      };

      // Sticky table borders and frozen columns follow the MDFO grid behavior.

      const getFrozenLeftPosition = (
        key: QuotationKey
      ): number => {
        // columns adalah ComputedRef, jadi di dalam store wajib .value.
        const currentColumns =
          columns.value;

        const index =
          currentColumns.findIndex(
            (column) =>
              column.key === key
          );

        if (index < 0) {
          return 0;
        }

        return currentColumns
          .slice(0, index)
          .reduce(
            (
              total,
              column
            ) => {
              return (
                total +
                getWidthNumber(
                  column.width
                )
              );
            },
            0
          );
      };

      // Check Frozen

      const isFrozenColumn = (
        key: QuotationKey
      ): boolean => {
        return frozenColumns.value.includes(
          key
        );
      };

      // Calculate the frozen visual width for the ZSTT footer.

      const frozenPaneWidth =
        computed(() => {
          const currentColumns =
            columns.value;

          const currentFrozen =
            frozenColumns.value;

          const totalWidth =
            currentFrozen.reduce(
              (
                total,
                key
              ) => {
                const column =
                  currentColumns.find(
                    (item) =>
                      item.key === key
                  );

                return column
                  ? total +
                  getWidthNumber(
                    column.width
                  )
                  : total;
              },
              0
            );

          // Account for the small overlap applied between frozen columns.
          const overlap =
            Math.max(
              currentFrozen.length - 1,
              0
            );

          return `${Math.max(
            0,
            totalWidth - overlap
          )
            }px`;
        });

      // COLUMN STYLE Sama dengan getColumnStyle MDFO.

      const getColumnStyle = (
        key: QuotationKey,
        isHeader = false,
        rowIndex = 0,
        backgroundOverride = '',
        includeHeaderTopBorder = true
      ): CSSProperties => {
        const currentColumns =
          columns.value;

        const currentFrozen =
          frozenColumns.value;

        const column =
          currentColumns.find(
            (item) =>
              item.key === key
          );

        const width =
          column?.width || '120px';

        const isFrozen =
          currentFrozen.includes(
            key
          );

        const isOpen =
          openFilters.value[key] ===
          true;

        // Index frozen.
        const frozenIndex =
          currentFrozen.indexOf(
            key
          );

        // Frozen terakhir.
        const lastFrozenKey =
          currentFrozen[
          currentFrozen.length - 1
          ];

        // Kolom pertama tabel.
        const isFirstColumn =
          key ===
          currentColumns[0]?.key;

        // Background. ZSTT boleh override warna.
        const backgroundColor =
          String(
            backgroundOverride || ''
          ).trim() !== ''
            ? backgroundOverride
            : isHeader
              ? '#eff6ff'
              : rowIndex % 2 === 0
                ? '#ffffff'
                : '#f8fafc';

        // Grid Border
        const gridShadows:
          string[] = [
            // Border kanan.
            `inset -1px 0 0 ${GRID_BORDER}`,

            // Border bawah.
            `inset 0 -1px 0 ${GRID_BORDER}`
          ];

        // Border atas header. Technical header dapat mengirim false supaya seam header tidak dobel.
        if (
          isHeader &&
          includeHeaderTopBorder
        ) {
          gridShadows.push(
            `inset 0 1px 0 ${GRID_BORDER}`
          );
        }

        // Border paling kiri tabel.
        if (isFirstColumn) {
          gridShadows.push(
            `inset 1px 0 0 ${GRID_BORDER}`
          );
        }

        // Separator frozen terakhir. Sama dengan Raw MDFO.
        if (
          isFrozen &&
          key === lastFrozenKey
        ) {
          gridShadows.push(
            '3px 0 7px -6px rgba(15, 23, 42, 0.32)'
          );
        }

        // FROZEN OVERLAP Ini yang belum ada pada Quotation lama.
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

          backgroundColor,

          // Solid layer seperti MDFO.
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

          boxShadow:
            gridShadows.join(', ')
        };

        // Non Frozen
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

        // Frozen
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

          transform:
            'translateZ(0)',

          backfaceVisibility:
            'hidden'
        };
      };

      // Footer Per Column

      const getFooterColumnStyle = (
        key: QuotationKey,
        backgroundOverride = '#eff6ff'
      ): CSSProperties => {
        const currentColumns =
          columns.value;

        const currentFrozen =
          frozenColumns.value;

        const column =
          currentColumns.find(
            (item) =>
              item.key === key
          );

        const width =
          column?.width || '120px';

        const isFrozen =
          currentFrozen.includes(
            key
          );

        const frozenIndex =
          currentFrozen.indexOf(
            key
          );

        const lastFrozenKey =
          currentFrozen[
          currentFrozen.length - 1
          ];

        const isFirstColumn =
          key ===
          currentColumns[0]?.key;

        const backgroundColor =
          backgroundOverride;

        const gridShadows:
          string[] = [
            `inset -1px 0 0 ${GRID_BORDER}`,
            `inset 0 1px 0 ${GRID_BORDER}`,
            `inset 0 -1px 0 ${GRID_BORDER}`
          ];

        if (isFirstColumn) {
          gridShadows.push(
            `inset 1px 0 0 ${GRID_BORDER}`
          );
        }

        if (
          isFrozen &&
          key === lastFrozenKey
        ) {
          gridShadows.push(
            '3px 0 7px -6px rgba(15, 23, 42, 0.32)'
          );
        }

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

        const style:
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

          boxShadow:
            gridShadows.join(', ')
        };

        if (isFrozen) {
          style.left =
            `${frozenLeft}px`;

          style.transform =
            'translateZ(0)';

          style.backfaceVisibility =
            'hidden';
        }

        return style;
      };

      // Shared footer style for total and status cells.

      type FooterBlockOptions = {
        backgroundColor?: string;
        width?: string;
        left?: string;
        zIndex?: number;
        includeLeftBorder?: boolean;
        includeSeparator?: boolean;
      };

      const getFooterBlockStyle = (
        options:
          FooterBlockOptions = {}
      ): CSSProperties => {
        const backgroundColor =
          options.backgroundColor ||
          '#eff6ff';

        const shadows: string[] = [
          `inset -1px 0 0 ${GRID_BORDER}`,
          `inset 0 1px 0 ${GRID_BORDER}`,
          `inset 0 -1px 0 ${GRID_BORDER}`
        ];

        if (
          options.includeLeftBorder
        ) {
          shadows.push(
            `inset 1px 0 0 ${GRID_BORDER}`
          );
        }

        if (
          options.includeSeparator
        ) {
          shadows.push(
            '3px 0 7px -6px rgba(15, 23, 42, 0.32)'
          );
        }

        const style:
          CSSProperties = {
          position:
            'sticky',

          bottom:
            '0px',

          zIndex:
            options.zIndex ?? 120,

          boxSizing:
            'border-box',

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

          boxShadow:
            shadows.join(', ')
        };

        if (options.width) {
          style.minWidth =
            options.width;

          style.width =
            options.width;

          style.maxWidth =
            options.width;
        }

        if (
          options.left !==
          undefined
        ) {
          style.left =
            options.left;

          style.transform =
            'translateZ(0)';

          style.backfaceVisibility =
            'hidden';
        }

        return style;
      };

      // Empty Row

      const getEmptyRowStyle =
        (): CSSProperties => {
          return {
            boxSizing:
              'border-box',

            boxShadow: [
              `inset 1px 0 0 ${GRID_BORDER}`,
              `inset -1px 0 0 ${GRID_BORDER}`,
              `inset 0 -1px 0 ${GRID_BORDER}`
            ].join(', ')
          };
        };

      // Column filters and sorting

      // Mengambil nilai filter aktif. QuotationKey bersifat gabungan antara Quotation, Contract, dan ZSTT sehingga suatu key mungkin belum tersedia pada.
      const getSelectedFilterValues = (
        key: QuotationKey
      ): string[] => {
        return (
          selectedFilters.value[key] ??
          []
        );
      };

      // Memeriksa apakah sebuah option sedang dipilih.
      const isFilterSelected = (
        key: QuotationKey,
        option: string
      ): boolean => {
        return getSelectedFilterValues(
          key
        ).includes(option);
      };

      const getColumnOptions = (
        key: QuotationKey
      ): string[] => {
        const keyword = String(searchFilters.value[key] ?? '').trim();
        const remoteValues = serverFilterOptions.value[key];

        if (
          serverPaged.value &&
          keyword.length >= 3 &&
          Array.isArray(remoteValues)
        ) {
          return Array.from(
            new Set([
              ...remoteValues,
              ...getSelectedFilterValues(key)
            ])
          ).sort(compareFilterOptions);
        }

        const activeFilters = columns.value
          .filter((column) => column.key !== key)
          .map((column) => ({
            key: column.key,
            selected: new Set(
              selectedFilters.value[column.key] ?? []
            )
          }))
          .filter((filter) => filter.selected.size > 0);

        const sourceRows = activeFilters.length === 0
          ? rows.value
          : rows.value.filter((row) =>
            activeFilters.every((filter) =>
              filter.selected.has(
                normalizeFilterOption(row[filter.key])
              )
            )
          );

        return Array.from(
          new Set<string>(
            sourceRows.map((row) => {
              return String(normalizeFilterOption(
                row[key]
              ));
            })
          )
        ).sort(compareFilterOptions);
      };

      const getFilteredColumnOptions = (
        key: QuotationKey
      ): string[] => {
        const keyword =
          (
            searchFilters
              .value[key] || ''
          ).toLowerCase();

        const options = getColumnOptions(key);

        if (
          serverPaged.value &&
          keyword.trim().length >= 3 &&
          Array.isArray(serverFilterOptions.value[key])
        ) {
          return options;
        }

        return options.filter((option) =>
          matchesSearchTokens(option, keyword)
        );
      };

      const getActiveColumnFilters = ():
        Partial<
          Record<
            QuotationKey,
            string[]
          >
        > => {
        const result:
          Partial<
            Record<
              QuotationKey,
              string[]
            >
          > = {};

        columns.value.forEach(
          (column) => {
            const selected =
              selectedFilters
                .value[
              column.key
              ] || [];

            if (
              selected.length === 0
            ) {
              return;
            }

            const options =
              getColumnOptions(
                column.key
              );

            // Selecting every option is equivalent to no column filter.
            if (
              options.length > 0 &&
              selected.length ===
              options.length
            ) {
              return;
            }

            result[column.key] =
              selected.map(
                toRawFilterOption
              );
          }
        );

        return result;
      };

      const toggleDropdown = (
        key: QuotationKey,
        event?: MouseEvent
      ) => {
        const wasOpen =
          openFilters.value[key] === true;

        ALL_COLUMNS.forEach(
          (column) => {
            openFilters
              .value[
              column.key
            ] = false;
          }
        );

        if (wasOpen) {
          quotationFilterAnchor.clear();
          return;
        }

        const trigger =
          event?.currentTarget as
          HTMLElement | null;

        if (!trigger) {
          return;
        }

        quotationFilterAnchor.anchor(
          trigger,
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

        openFilters.value[key] =
          true;
      };

      const closeAllDropdowns = () => {
        ALL_COLUMNS.forEach(
          (column) => {
            openFilters
              .value[
              column.key
            ] = false;
          }
        );

        quotationFilterAnchor.clear();
      };

      const toggleFilter = (
        key: QuotationKey,
        value: string
      ) => {
        const selected = [
          ...getSelectedFilterValues(key)
        ];

        const index =
          selected.indexOf(value);

        if (index < 0) {
          selected.push(value);
        } else {
          selected.splice(index, 1);
        }

        selectedFilters.value[key] =
          selected;
      };

      const toggleAllColumn = (
        key: QuotationKey
      ) => {
        const options =
          getFilteredColumnOptions(
            key
          );

        const selected =
          getSelectedFilterValues(
            key
          );

        const allSelected =
          options.length > 0 &&
          options.every((option) => {
            return selected.includes(
              option
            );
          });

        selectedFilters.value[key] =
          allSelected
            ? []
            : [...options];
      };

      const clearColumnFilter = (
        key: QuotationKey
      ) => {
        selectedFilters.value[key] =
          [];

        searchFilters.value[key] =
          '';
      };

      const isAllSelected = (
        key: QuotationKey
      ): boolean => {
        const options =
          getFilteredColumnOptions(
            key
          );

        const selected =
          getSelectedFilterValues(
            key
          );

        return (
          options.length > 0 &&
          options.every((option) => {
            return selected.includes(
              option
            );
          })
        );
      };

      const getSelectedLabel = (
        key: QuotationKey
      ): string => {
        const selected =
          getSelectedFilterValues(
            key
          );

        return selected.length > 0
          ? `${selected.length} selected`
          : 'All';
      };

      const setSort = (
        key: QuotationKey,
        direction:
          | 'none'
          | 'asc'
          | 'desc'
      ) => {
        if (direction === 'none') {
          sortKey.value = '';
          sortDirection.value = 'none';
        } else {
          sortKey.value = key;
          sortDirection.value =
            direction;
        }

        currentPage.value = 1;
        if (serverPaged.value) void loadData({ ...activeFilters.value, customers: activeCustomers.value, page: 1 });
      };

      const isSortActive = (
        key: QuotationKey,
        direction:
          | 'asc'
          | 'desc'
      ): boolean => {
        return (
          sortKey.value === key &&
          sortDirection.value ===
          direction
        );
      };

      const isNoSortActive = (
        key: QuotationKey
      ): boolean => {
        return (
          sortDirection.value ===
          'none' ||
          sortKey.value !== key
        );
      };

      const clearAllFilters = () => {
        quotationFilterAnchor.clear();

        ALL_COLUMNS.forEach(
          (column) => {
            selectedFilters
              .value[
              column.key
            ] = [];

            searchFilters
              .value[
              column.key
            ] = '';

            openFilters
              .value[
              column.key
            ] = false;
          }
        );

        sortKey.value = '';
        sortDirection.value = 'none';
        currentPage.value = 1;
      };
      const getAddPartScope = (): {
        customer: string;
        periode: string;
        revision: number;
      } => {
        return {
          customer:
            String(
              addPartForm.value.customer
            )
              .trim()
              .toUpperCase(),

          periode:
            String(
              addPartForm.value.periode
            )
              .replace(/\D/g, ''),

          revision:
            Number(
              addPartForm.value.revision
            )
        };
      };

      /*
       * Mengambil material Quotation Q langsung dari DB melalui endpoint getData existing.
       * Tidak perlu endpoint/service/schema baru.
       *
       * Scope:
       * Customer + Periode + Revision.
       */
      const fetchExistingAddPartKeys =
        async (): Promise<Set<string>> => {

          const {
            customer,
            periode,
            revision
          } =
            getAddPartScope();

          if (
            customer === '' ||
            !/^\d{6}$/.test(periode) ||
            !Number.isInteger(revision) ||
            revision < 0
          ) {
            return new Set<string>();
          }

          const response =
            await quotationService
              .getData({
                customer,
                periode,
                revision:
                  String(revision),
                quotationMode:
                  'Q'
              });

          if (
            response.status !==
            'success'
          ) {
            throw new Error(
              response.message ||
              'Gagal mengecek duplicate Part Number di database.'
            );
          }

          const result =
            new Set<string>();

          const data =
            Array.isArray(response.data)
              ? response.data
              : [];

          data.forEach(
            (row) => {
              const key =
                getAddPartDuplicateKey(
                  customer,
                  row.material
                );

              if (key !== '') {
                result.add(key);
              }
            }
          );

          return result;
        };

      const validateAddPartScope =
        (): boolean => {

          const {
            customer,
            periode,
            revision
          } =
            getAddPartScope();

          if (
            ![
              'ADM P1',
              'ADM P4',
              'ADM P5',
              'DCWA',
              'ASI ADM',
              'TMMIN',
              'GAYA MTR'
            ].includes(customer)
          ) {
            notificationStore
              .showAlertWarning(
                'Pilih Customer terlebih dahulu.'
              );

            return false;
          }

          if (
            !/^\d{6}$/.test(periode)
          ) {
            notificationStore
              .showAlertWarning(
                'Pilih Quotation / Contract Period terlebih dahulu.'
              );

            return false;
          }

          if (
            !Number.isInteger(revision) ||
            revision < 0
          ) {
            notificationStore
              .showAlertWarning(
                'Pilih Revision terlebih dahulu.'
              );

            return false;
          }

          return true;
        };


      const addSingleAddPartItem =
        async (): Promise<void> => {

          const material =
            normalizeAddPartMaterialExact(
              addPartForm.value.material
            );

          if (material === '') {
            notificationStore
              .showAlertWarning(
                'Isi Part Number terlebih dahulu.'
              );

            return;
          }

          if (!validateAddPartScope()) {
            return;
          }


          if (
            hasAddPartDraftDuplicate(
              material
            )
          ) {
            notificationStore
              .showAlertWarning(
                `Part ${material} sudah ada di daftar.`
              );

            return;
          }

          try {
            const existingKeys =
              await fetchExistingAddPartKeys();

            const {
              customer
            } =
              getAddPartScope();

            const materialKey =
              getAddPartDuplicateKey(
                customer,
                material
              );

            if (
              existingKeys.has(
                materialKey
              )
            ) {
              notificationStore
                .showAlertWarning(
                  `Part ${material} sudah tersedia di database untuk Customer, Period, dan Revision yang dipilih.`
                );

              return;
            }

          } catch (
          error: unknown
          ) {
            console.error(
              'Check Add Part Duplicate:',
              error
            );

            notificationStore
              .showAlertError(
                getErrorMessage(
                  error,
                  'Gagal mengecek duplicate Part Number di database.'
                )
              );

            return;
          }

          pushAddPartDraft(
            material,
            addPartForm.value.orderQuantity
          );

          addPartForm.value.material = '';
        };



      const importAddPartText =
        async (
          text: string
        ): Promise<void> => {

          const parsed =
            parseAddPartPasteCandidates(
              text
            );

          if (
            parsed.candidates.length === 0
          ) {
            notificationStore
              .showAlertWarning(
                'Tidak ada Part Number baru yang dapat diproses dari hasil paste.'
              );

            return;
          }

          if (!validateAddPartScope()) {
            return;
          }

          if (
            isCheckingAddPartDuplicates.value ||
            isSavingAddPart.value
          ) {
            return;
          }

          try {
            isCheckingAddPartDuplicates.value =
              true;

            /*
             * Cek existing Quotation Q pada Customer + Period + Revision.
             */
            const existingKeys =
              await fetchExistingAddPartKeys();

            const {
              customer
            } =
              getAddPartScope();

            let added = 0;
            let duplicateDraft = 0;
            let duplicateDatabase = 0;

            parsed.candidates.forEach(
              (candidate) => {

                const key =
                  getAddPartDuplicateKey(
                    customer,
                    candidate.material
                  );

                if (
                  hasAddPartDraftDuplicate(
                    candidate.material
                  )
                ) {
                  duplicateDraft += 1;
                  return;
                }

                if (
                  existingKeys.has(
                    key
                  )
                ) {
                  duplicateDatabase += 1;
                  return;
                }

                const inserted =
                  pushAddPartDraft(
                    candidate.material,
                    candidate.quantity
                  );

                if (inserted) {
                  added += 1;
                }
              }
            );

            /*
             * Clear textarea HANYA setelah pengecekan berhasil.
             * Kalau network/error DB gagal, paste tetap ada agar user bisa retry.
             */
            addPartPasteText.value = '';

            if (added > 0) {
              const detail:
                string[] = [];

              if (
                parsed.duplicateInPaste > 0
              ) {
                detail.push(
                  `${parsed.duplicateInPaste} duplicate dari paste`
                );
              }

              if (duplicateDraft > 0) {
                detail.push(
                  `${duplicateDraft} sudah ada di daftar`
                );
              }

              if (
                duplicateDatabase > 0
              ) {
                detail.push(
                  `${duplicateDatabase} sudah ada di database`
                );
              }

              if (
                parsed.skippedEmptyOrHeader > 0
              ) {
                detail.push(
                  `${parsed.skippedEmptyOrHeader} header/kosong`
                );
              }

              notificationStore
                .showAlertSuccess(
                  detail.length > 0
                    ? `${added} part masuk daftar. Dilewati: ${detail.join(', ')}.`
                    : `${added} part masuk daftar.`
                );

              return;
            }

            notificationStore
              .showAlertWarning(
                `Tidak ada Part Number baru. ${duplicateDatabase} sudah ada di database, ${duplicateDraft} sudah ada di daftar, ${parsed.duplicateInPaste} duplicate dari paste.`
              );

          } catch (
          error: unknown
          ) {
            console.error(
              'Check Add Part Duplicate:',
              error
            );

            notificationStore
              .showAlertError(
                getErrorMessage(
                  error,
                  'Gagal mengecek duplicate Part Number di database.'
                )
              );

          } finally {
            isCheckingAddPartDuplicates.value =
              false;
          }
        };


      /*
       * v26:
       * Jangan preventDefault dan jangan import saat event paste.
       * Template v26 juga tidak lagi memasang @paste.
       *
       * Fungsi dipertahankan agar tidak error bila masih tercantum
       * pada return store lama.
       */
      const handleAddPartPaste =
        (): void => {
          // Native textarea paste saja.
        };


      const removeAddPartItem = (
        id: number
      ): void => {
        if (
          isSavingAddPart.value
        ) {
          return;
        }

        addPartItems.value =
          addPartItems.value.filter(
            (item) =>
              item.id !== id
          );
      };


      const clearAddPartItems =
        (): void => {

          if (
            isSavingAddPart.value
          ) {
            return;
          }

          addPartItems.value = [];
          addPartPasteText.value = '';
        };


      /*
       * Clear Data:
       * - Customer / Period / Revision TETAP dipertahankan.
       * - Yang dibersihkan hanya data input Add Part.
       */
      const clearAddPartData =
        (
          force = false
        ): void => {

          if (
            isSavingAddPart.value &&
            !force
          ) {
            return;
          }

          addPartPasteText.value = '';
          addPartItems.value = [];

          addPartForm.value.material = '';
          addPartForm.value.orderQuantity = '1';
          addPartForm.value.remarks = '';

          addPartSaveCurrent.value = 0;
          addPartSaveTotal.value = 0;

          isCheckingAddPartDuplicates.value = false;
        };


      const applyDefaultQtyToAllAddParts =
        (): void => {

          const quantity =
            Number(
              addPartForm.value.orderQuantity
            );

          if (
            !Number.isFinite(quantity) ||
            quantity <= 0
          ) {
            notificationStore
              .showAlertWarning(
                'Default Qty harus lebih dari 0.'
              );

            return;
          }

          addPartItems.value.forEach(
            (item) => {
              item.orderQuantity =
                String(quantity);

              item.error = '';
            }
          );
        };



      const openAddPartModal =
        async (): Promise<void> => {

          if (
            selectedQuotationMode
              .value ===
            'ZSTT'
          ) {
            notificationStore
              .showAlertWarning(
                'Add Part tidak tersedia pada ZSTT.'
              );

            return;
          }

          closeAddPartDropdowns();

          // Reset Form

          addPartForm.value = {
            customer: '',
            periode: '',
            revision: '',
            material: '',
            orderQuantity: '1',
            remarks: ''
          };

          resetAddPartDraft();

          showAddPartModal
            .value =
            true;

          // Load Customer Options

          await loadAddPartOptions();

          // Current Filter Customer

          const currentCustomer =
            String(
              activeFilters
                .value
                .customer ??
              ''
            )
              .trim()
              .toUpperCase();

          // Keep the actual customer selection for Add Part.
          const allowedExactCustomers =
            new Set([
              'ADM P1',
              'ADM P4',
              'ADM P5',
              'DCWA',
              'ASI ADM',
              'GAYA MTR'
            ]);

          if (
            !allowedExactCustomers
              .has(
                currentCustomer
              )
          ) {
            return;
          }

          if (
            !addPartCustomerOptions
              .value
              .includes(
                currentCustomer
              )
          ) {
            return;
          }

          addPartForm
            .value
            .customer =
            currentCustomer;

          // Load Periods For Current Customer

          const customerOptions =
            await loadAddPartOptions(
              currentCustomer
            );

          const currentPeriod =
            String(
              activeFilters
                .value
                .periode ??
              ''
            )
              .replace(
                /\D/g,
                ''
              );

          if (
            addPartPeriodOptions
              .value
              .includes(
                currentPeriod
              )
          ) {
            addPartForm
              .value
              .periode =
              currentPeriod;

          } else {

            addPartForm
              .value
              .periode =
              customerOptions
                .latestPeriod;
          }

          // Load Revision

          if (
            addPartForm
              .value
              .periode
          ) {
            const revisionOptions =
              await loadAddPartOptions(
                currentCustomer,
                addPartForm
                  .value
                  .periode
              );

            const currentRevision =
              String(
                activeFilters
                  .value
                  .revision ??
                ''
              ).trim();

            if (
              addPartRevisionOptions
                .value
                .includes(
                  currentRevision
                )
            ) {
              addPartForm
                .value
                .revision =
                currentRevision;

            } else {

              addPartForm
                .value
                .revision =
                revisionOptions
                  .latestRevision;
            }
          }
        };

      const selectAddPartCustomer =
        async (
          customer:
            string
        ): Promise<void> => {

          addPartForm
            .value
            .customer =
            customer;

          // Customer berubah: period + revision lama tidak boleh dipertahankan.
          addPartForm
            .value
            .periode =
            '';

          addPartForm
            .value
            .revision =
            '';

          closeAddPartDropdowns();

          const options =
            await loadAddPartOptions(
              customer
            );

          // Default ke periode terbaru milik customer tersebut.
          if (
            options.latestPeriod
          ) {
            addPartForm
              .value
              .periode =
              options.latestPeriod;

            const revisionOptions =
              await loadAddPartOptions(
                customer,
                options.latestPeriod
              );

            addPartForm
              .value
              .revision =
              revisionOptions
                .latestRevision;
          }
        };

      const selectAddPartPeriod =
        async (
          periode:
            string
        ): Promise<void> => {

          addPartForm
            .value
            .periode =
            periode;

          addPartForm
            .value
            .revision =
            '';

          closeAddPartDropdowns();

          const options =
            await loadAddPartOptions(
              addPartForm
                .value
                .customer,
              periode
            );

          addPartForm
            .value
            .revision =
            options.latestRevision;
        };

      const selectAddPartRevision =
        (
          revision:
            string
        ): void => {

          addPartForm
            .value
            .revision =
            revision;

          closeAddPartDropdowns();
        };


      const closeAddPartModal =
        (): void => {

          if (
            isSavingAddPart.value
          ) {
            return;
          }

          closeAddPartDropdowns();

          clearAddPartData();

          showAddPartModal.value =
            false;
        };

      // Save Add Part


      const saveAddPart =
        async (): Promise<boolean> => {
          if (!requireUploadMdfoPermission('Create')) return false;

          const {
            customer,
            periode,
            revision
          } =
            getAddPartScope();

          const remarks =
            String(
              addPartForm.value.remarks ?? ''
            ).trim();

          if (!validateAddPartScope()) {
            return false;
          }

          if (
            isCheckingAddPartDuplicates.value
          ) {
            notificationStore
              .showAlertWarning(
                'Tunggu pengecekan Part Number selesai.'
              );

            return false;
          }

          /*
           * Kalau user mengetik di "Tambah Satu per Satu"
           * lalu langsung klik Save, validasi DB tetap dijalankan.
           */
          const pendingMaterial =
            normalizeAddPartMaterialExact(
              addPartForm.value.material
            );

          if (pendingMaterial !== '') {
            const beforeCount =
              addPartItems.value.length;

            await addSingleAddPartItem();

            /*
             * Jika tidak bertambah dan text masih ada,
             * berarti duplicate / validasi gagal.
             */
            if (
              addPartItems.value.length ===
              beforeCount &&
              normalizeAddPartMaterialExact(
                addPartForm.value.material
              ) !== ''
            ) {
              return false;
            }
          }

          if (
            addPartItems.value.length === 0
          ) {
            notificationStore
              .showAlertWarning(
                'Tambahkan minimal satu Part Number.'
              );

            return false;
          }

          addPartItems.value.forEach(
            (item) => {
              item.error = '';
            }
          );

          /*
           * Ambil ulang kondisi DB tepat sebelum Save.
           * Ini menjadi guard jika ada user lain yang baru saja
           * menambahkan part yang sama setelah proses paste.
           */
          let existingKeys:
            Set<string>;

          try {
            existingKeys =
              await fetchExistingAddPartKeys();

          } catch (
          error: unknown
          ) {
            console.error(
              'Check Add Part Duplicate Before Save:',
              error
            );

            notificationStore
              .showAlertError(
                getErrorMessage(
                  error,
                  'Gagal mengecek duplicate Part Number di database.'
                )
              );

            return false;
          }

          let hasInvalidRow = false;

          const seenMaterials =
            new Set<string>();

          addPartItems.value.forEach(
            (item) => {

              const material =
                normalizeAddPartMaterialExact(
                  item.material
                );

              const quantity =
                Number(
                  item.orderQuantity
                );

              const duplicateKey =
                getAddPartDuplicateKey(
                  customer,
                  material
                );

              item.material =
                material;

              if (material === '') {
                item.error =
                  'Part Number wajib diisi.';

                hasInvalidRow =
                  true;

                return;
              }

              if (
                !Number.isFinite(quantity) ||
                quantity <= 0
              ) {
                item.error =
                  'Qty harus lebih dari 0.';

                hasInvalidRow =
                  true;

                return;
              }

              if (
                seenMaterials.has(
                  duplicateKey
                )
              ) {
                item.error =
                  'Duplicate Part Number pada daftar.';

                hasInvalidRow =
                  true;

                return;
              }

              seenMaterials.add(
                duplicateKey
              );

              if (
                existingKeys.has(
                  duplicateKey
                )
              ) {
                item.error =
                  'Part sudah tersedia di database.';

                hasInvalidRow =
                  true;
              }
            }
          );

          if (hasInvalidRow) {
            notificationStore
              .showAlertWarning(
                'Ada Part Number duplicate / invalid. Periksa row yang ditandai.'
              );

            return false;
          }

          if (
            isSavingAddPart.value
          ) {
            return false;
          }

          const itemsSnapshot =
            addPartItems.value.map(
              (item) => ({
                ...item,
                material:
                  normalizeAddPartMaterialExact(
                    item.material
                  ),
                error: ''
              })
            );

          const periodLabel =
            formatAddPartPeriod(
              periode
            );

          notificationStore
            .showConfirm(
              'Confirm Add Part',

              `Tambahkan ${itemsSnapshot.length} part ke ${customer} - ${periodLabel} - Revision ${revision}?\n\nSemua part akan masuk ke Quotation dan Contract.\nManual Part tidak ditambahkan ke ZSTT.`,

              async () => {

                try {
                  isSavingAddPart.value =
                    true;

                  addPartSaveCurrent.value =
                    0;

                  addPartSaveTotal.value =
                    itemsSnapshot.length;

                  const savedIds =
                    new Set<number>();

                  const failures:
                    Array<{
                      id: number;
                      material: string;
                      message: string;
                    }> = [];

                  /*
                   * Tetap sequential.
                   * Jangan diganti Promise.all().
                   */
                  for (
                    let index = 0;
                    index <
                    itemsSnapshot.length;
                    index += 1
                  ) {
                    const item =
                      itemsSnapshot[index];

                    addPartSaveCurrent.value =
                      index + 1;

                    const payload:
                      QuotationAddPartPayload = {
                      batchId:
                        batchId.value,

                      customer,

                      periode,

                      revision,

                      material:
                        item.material,

                      orderQuantity:
                        Number(
                          item.orderQuantity
                        ),

                      remarks
                    };

                    try {
                      const response =
                        await quotationService
                          .addPart(
                            payload
                          );

                      if (
                        response.status !==
                        'success'
                      ) {
                        throw new Error(
                          response.message ||
                          'Add Part gagal.'
                        );
                      }

                      savedIds.add(
                        item.id
                      );

                    } catch (
                    error: unknown
                    ) {
                      failures.push({
                        id:
                          item.id,

                        material:
                          item.material,

                        message:
                          getErrorMessage(
                            error,
                            'Gagal menambahkan Part.'
                          )
                      });
                    }
                  }

                  /*
                   * Refresh tabel utama hanya sekali.
                   */
                  if (
                    savedIds.size > 0
                  ) {
                    await loadData({
                      ...activeFilters.value
                    });
                  }

                  /*
                   * Yang berhasil dihapus dari draft.
                   * Yang gagal tetap tinggal dan menampilkan error backend.
                   */
                  addPartItems.value =
                    addPartItems.value
                      .filter(
                        (item) =>
                          !savedIds.has(
                            item.id
                          )
                      )
                      .map(
                        (item) => {
                          const failure =
                            failures.find(
                              (failed) =>
                                failed.id ===
                                item.id
                            );

                          return {
                            ...item,
                            error:
                              failure?.message ??
                              ''
                          };
                        }
                      );

                  if (
                    failures.length === 0
                  ) {
                    closeAddPartDropdowns();

                    /*
                     * Saat callback Save sukses, isSavingAddPart masih true.
                     * force=true hanya dipakai internal setelah seluruh save selesai.
                     */
                    clearAddPartData(true);

                    showAddPartModal.value =
                      false;

                    notificationStore
                      .showAlertSuccess(
                        `${savedIds.size} part berhasil ditambahkan ke Quotation dan Contract.`
                      );

                    return true;
                  }

                  const firstFailure =
                    failures[0];

                  notificationStore
                    .showAlertWarning(
                      `${savedIds.size} part berhasil, ${failures.length} part gagal. Part gagal tetap ada di daftar. Contoh: ${firstFailure.material} - ${firstFailure.message}`
                    );

                  return false;

                } finally {
                  isSavingAddPart.value =
                    false;

                  addPartSaveCurrent.value =
                    0;

                  addPartSaveTotal.value =
                    0;
                }
              }
            );

          return true;
        };
      // Load Data

      let latestLoadRequestId = 0;
      let activeLoadController: AbortController | null = null;

      const getActiveServerColumnFilters = (): QuotationColumnFilters => {
        const result: QuotationColumnFilters = {};
        columns.value.forEach((column) => {
          const values = selectedFilters.value[column.key] ?? [];
          if (values.length > 0) result[column.key] = [...values];
        });
        return result;
      };

      const loadRemoteFilterOptions = async (
        key: QuotationKey,
        keyword: string
      ): Promise<void> => {
        const search = String(keyword ?? '').trim();
        if (!serverPaged.value || search.length < 3) return;

        remoteFilterControllers.get(key)?.abort();
        const controller = new AbortController();
        remoteFilterControllers.set(key, controller);

        try {
          const values = await quotationService.getFilterOptions(
            {
              batchId: activeFilters.value.batchId,
              customer: activeFilters.value.customer,
              customers: activeCustomers.value,
              periode: activeFilters.value.periode,
              revision: activeFilters.value.revision,
              columnFilters: getActiveServerColumnFilters(),
              signal: controller.signal
            },
            selectedQuotationMode.value,
            key,
            search
          );

          if (controller.signal.aborted) return;
          serverFilterOptions.value = {
            ...serverFilterOptions.value,
            [key]: Array.from(new Set(values.map(normalizeFilterOption)))
              .sort(compareFilterOptions)
          };
        } catch (error: unknown) {
          if (controller.signal.aborted) return;
          console.error('Gagal mengambil remote filter Quotation:', error);
        } finally {
          if (remoteFilterControllers.get(key) === controller) {
            remoteFilterControllers.delete(key);
          }
        }
      };

      const scheduleRemoteFilterSearch = (
        key: QuotationKey,
        keyword: string
      ): void => {
        const previousTimer = remoteFilterTimers.get(key);
        if (previousTimer) clearTimeout(previousTimer);

        const search = String(keyword ?? '').trim();
        if (search.length < 3) {
          remoteFilterControllers.get(key)?.abort();
          remoteFilterControllers.delete(key);
          const next = { ...serverFilterOptions.value };
          delete next[key];
          serverFilterOptions.value = next;
          return;
        }

        remoteFilterTimers.set(
          key,
          setTimeout(() => {
            remoteFilterTimers.delete(key);
            void loadRemoteFilterOptions(key, search);
          }, 300)
        );
      };

      const loadData = async (
        filters: QuotationDataFilter = {}
      ) => {
        const requestId = ++latestLoadRequestId;
        activeLoadController?.abort();
        const controller = new AbortController();
        activeLoadController = controller;

        remoteFilterControllers.forEach((activeController) => activeController.abort());
        remoteFilterControllers.clear();
        serverFilterOptions.value = {};

        try {
          isLoading.value = true;
          activeFilters.value = normalizeFilters(filters);
          activeCustomers.value = Array.isArray(filters.customers)
            ? Array.from(new Set(filters.customers.map((value) => String(value ?? '').trim().toUpperCase()).filter(Boolean)))
            : [];

          const requestedPage = Math.max(1, Number(filters.page ?? currentPage.value) || 1);
          const requestFilters: QuotationDataFilter = {
            batchId: activeFilters.value.batchId,
            customer: activeFilters.value.customer,
            customers: activeCustomers.value,
            periode: activeFilters.value.periode,
            revision: activeFilters.value.revision,
            page: requestedPage,
            perPage: rowsPerPage.value,
            columnFilters: getActiveServerColumnFilters(),
            sortKey: sortKey.value,
            sortDirection: sortDirection.value,
            signal: controller.signal
          };

          const mode = selectedQuotationMode.value;
          let response;
          let nextDaysInMonth = 31;
          let nextDayHeaders: Partial<Record<ZsttDayKey, string>> = {};

          if (mode === 'CONTRACT') {
            response = await quotationService.getContractData(requestFilters);
          } else if (mode === 'ZSTT') {
            const zsttResponse = await quotationService.getZsttData(requestFilters);
            response = zsttResponse;
            nextDaysInMonth = zsttResponse.days_in_month || 31;
            nextDayHeaders = zsttResponse.day_headers || {};
          } else {
            response = await quotationService.getData({ ...requestFilters, quotationMode: mode });
          }

          if (requestId !== latestLoadRequestId || controller.signal.aborted) return;
          if (response.status !== 'success') throw new Error(response.message || 'Gagal mengambil data');

          rows.value = Array.isArray(response.data) ? response.data : [];
          batchId.value = normalizeBatchId(response.batch_id);
          serverPaged.value = response.server_paged === true;
          serverTotal.value = Number(response.total || 0);
          serverTotalPages.value = Math.max(1, Number(response.total_pages || 1));
          serverTotalOrderQuantity.value =
            'total_order_quantity' in response
              ? Number(response.total_order_quantity ?? 0)
              : 0;
          currentPage.value = Math.max(1, Number(response.page || requestedPage));

          if (mode === 'ZSTT') {
            zsttDaysInMonth.value = nextDaysInMonth;
            zsttDayHeaders.value = nextDayHeaders;
          }
        } catch (error: unknown) {
          if (controller.signal.aborted || requestId !== latestLoadRequestId) return;
          console.error('Gagal mengambil data:', error);
          rows.value = [];
          serverTotal.value = 0;
          notificationStore.showAlertError(getErrorMessage(error, 'Gagal mengambil data'));
        } finally {
          if (requestId === latestLoadRequestId) isLoading.value = false;
          if (activeLoadController === controller) activeLoadController = null;
        }
      };

      const setQuotationMode =
        async (
          mode: QuotationMode
        ) => {
          const valid =
            quotationModeOptions.some(
              (option) => {
                return (
                  option.value === mode
                );
              }
            );

          if (
            !valid ||
            selectedQuotationMode
              .value === mode
          ) {
            return;
          }

          selectedQuotationMode.value =
            mode;

          clearDeleteSelection();
          clearAllFilters();

          await loadData({
            ...activeFilters.value
          });
        };

      // Download and Regenerate

      const downloadExcelForCustomers =
        async (
          customers: string[],
          periode: string,
          revision: string
        ): Promise<void> => {
          if (!requireUploadMdfoPermission('Download')) return;
          const normalizedCustomers = Array.from(
            new Set(
              customers
                .map((customer) =>
                  String(customer ?? '')
                    .trim()
                    .toUpperCase()
                )
                .filter(Boolean)
            )
          );

          if (normalizedCustomers.length === 0) {
            notificationStore.showAlertWarning(
              'Pilih Customer terlebih dahulu'
            );
            return;
          }

          if (!/^\d{6}$/.test(String(periode ?? ''))) {
            notificationStore.showAlertWarning(
              'Pilih Periode bulan terlebih dahulu'
            );
            return;
          }

          if (!/^\d+$/.test(String(revision ?? ''))) {
            notificationStore.showAlertWarning(
              'Pilih Revision terlebih dahulu'
            );
            return;
          }

          if (isDownloadingExcel.value) {
            return;
          }

          try {
            isDownloadingExcel.value = true;

            const fileNames =
              await quotationService.downloadExcel({
                customer:
                  normalizedCustomers.length === 1
                    ? normalizedCustomers[0]
                    : '',
                customers: normalizedCustomers,
                periode,
                revision,
                activeMode:
                  selectedQuotationMode.value,
                columnFilters:
                  normalizedCustomers.length === 1
                    ? getActiveColumnFilters()
                    : {}
              });

            notificationStore.showAlertSuccess(
              'Excel Q, Q1, Q2, Q3, Contract, dan ZSTT berhasil didownload: ' +
              fileNames.join(', ')
            );
          } catch (error: unknown) {
            console.error(
              'Download workbook gagal:',
              error
            );

            notificationStore.showAlertError(
              getErrorMessage(
                error,
                'Download Excel gagal'
              )
            );
          } finally {
            isDownloadingExcel.value = false;
          }
        };

      const downloadExcel =
        async () => {
          if (!canDownloadExcel.value) {
            notificationStore.showAlertWarning(
              downloadExcelDescription.value ||
              'Filter export tidak valid'
            );
            return;
          }

          const customer =
            activeFilters.value.customer;

          await downloadExcelForCustomers(
            customer !== '' ? [customer] : [],
            activeFilters.value.periode,
            activeFilters.value.revision
          );
        };

      const regenerate = async (
        sourceBatchId:
          number | string
      ) => {
        if (!requireUploadMdfoPermission('Update')) return;
        const normalizedSourceBatchId =
          normalizeBatchId(
            sourceBatchId
          );

        if (
          normalizedSourceBatchId ===
          null
        ) {
          notificationStore
            .showAlertWarning(
              'Batch MDFO tidak valid'
            );
          return;
        }

        try {
          isGenerating.value = true;

          // Send the active MDFO batch ID during regeneration.
          const response =
            await quotationService
              .regenerate({
                batchId:
                  normalizedSourceBatchId,
                customer:
                  activeFilters
                    .value.customer,
                periode:
                  activeFilters
                    .value.periode,
                revision:
                  activeFilters
                    .value.revision
              });

          if (
            response.status !==
            'success'
          ) {
            throw new Error(
              response.message ||
              'Regenerate data gagal'
            );
          }

          const quotationRows =
            Number(
              response.quotation_rows ||
              response.total_rows ||
              0
            );

          const contractRows =
            Number(
              response.contract_rows || 0
            );

          const zsttRows =
            Number(
              response.zstt_rows || 0
            );

          if (
            contractRows > 0 &&
            zsttRows === 0
          ) {
            throw new Error(
              'Contract berhasil dibuat, tetapi ZSTT masih kosong.'
            );
          }

          selectedQuotationMode.value =
            'ZSTT';

          clearAllFilters();

          await loadData({
            ...activeFilters.value,
            batchId:
              normalizedSourceBatchId
          });

          notificationStore
            .showAlertSuccess(
              `Quotation ${quotationRows} baris, Contract ${contractRows} baris, dan ZSTT ${zsttRows} baris berhasil dibuat.`
            );
        } catch (error: unknown) {
          console.error(
            'Regenerate data gagal:',
            error
          );

          notificationStore
            .showAlertError(
              getErrorMessage(
                error,
                'Regenerate data gagal'
              )
            );
        } finally {
          isGenerating.value = false;
        }
      };



      // Pagination

      const firstPage = () => {
        currentPage.value = 1;
      };

      const prevPage = () => {
        if (
          currentPage.value > 1
        ) {
          currentPage.value--;
        }
      };

      const nextPage = () => {
        if (
          currentPage.value <
          totalPages.value
        ) {
          currentPage.value++;
        }
      };

      const lastPage = () => {
        currentPage.value =
          totalPages.value;
      };

      // Watcher

      watch(
        selectedFilters,
        () => {
          // Selected delete hanya berlaku untuk hasil filter saat selection
          // dibuat. Saat filter berubah, kosongkan selection tetapi jangan saat
          // user sekadar pindah page.
          if (deleteSelectedIds.value.size > 0) {
            deleteSelectedIds.value = new Set();
          }

          currentPage.value = 1;
          if (serverPaged.value) void loadData({ ...activeFilters.value, customers: activeCustomers.value, page: 1 });
        },
        { deep: true }
      );

      watch(
        searchFilters,
        (values) => {
          ALL_COLUMNS.forEach((column) => {
            if (!openFilters.value[column.key]) return;
            scheduleRemoteFilterSearch(
              column.key,
              String(values[column.key] ?? '')
            );
          });
        },
        { deep: true }
      );

      watch(rowsPerPage, () => {
        currentPage.value = 1;
        if (serverPaged.value) void loadData({ ...activeFilters.value, customers: activeCustomers.value, page: 1 });
      });

      watch(currentPage, (page, previousPage) => {
        if (serverPaged.value && page !== previousPage && !isLoading.value) {
          void loadData({ ...activeFilters.value, customers: activeCustomers.value, page });
        }
      });

      const getDeleteRowId = (row: QuotationRow): number => {
        const id = Number(row._id ?? 0);
        return Number.isInteger(id) && id > 0 ? id : 0;
      };

      const isDeleteRowSelected = (row: QuotationRow): boolean => {
        const id = getDeleteRowId(row);
        return id > 0 && deleteSelectedIds.value.has(id);
      };

      const toggleDeleteRow = (row: QuotationRow): void => {
        const id = getDeleteRowId(row);
        if (id <= 0) return;
        const next = new Set(deleteSelectedIds.value);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        deleteSelectedIds.value = next;
      };

      const deleteCurrentPageSelected = computed(() => {
        const ids = paginatedRows.value.map(getDeleteRowId).filter((id) => id > 0);
        return ids.length > 0 && ids.every((id) => deleteSelectedIds.value.has(id));
      });

      const toggleDeleteCurrentPage = (): void => {
        const next = new Set(deleteSelectedIds.value);
        const ids = paginatedRows.value.map(getDeleteRowId).filter((id) => id > 0);
        if (deleteCurrentPageSelected.value) ids.forEach((id) => next.delete(id));
        else ids.forEach((id) => next.add(id));
        deleteSelectedIds.value = next;
      };

      const clearDeleteSelection = (): void => {
        deleteSelectedIds.value = new Set();
      };

      const buildCompactDeleteDependencyWarning = (
        preview: Awaited<ReturnType<typeof previewMdfoDelete>>
      ): string => {
        const reasons = preview.impact.protected_rows
          .map((row) => String(row.reason ?? '').trim())
          .filter(Boolean);

        const joined = reasons.join(' ; ').toLowerCase();
        const dependencies: string[] = [];

        if (joined.includes('format sales order')) {
          dependencies.push('Format Sales Order');
        }

        if (joined.includes('raw sales order')) {
          dependencies.push('Raw Sales Order');
        }

        const blockedCount = Math.max(
          Number(preview.impact.protected || 0),
          Number(preview.impact.requested || 0) - Number(preview.impact.safe || 0)
        );

        const targetLabel = selectedQuotationMode.value === 'CONTRACT'
          ? 'Contract'
          : selectedQuotationMode.value === 'ZSTT'
            ? 'ZSTT'
            : 'Quotation';

        if (dependencies.length > 0) {
          return blockedCount > 1
            ? `Delete ditolak. ${blockedCount} data ${targetLabel} sudah digunakan oleh ${dependencies.join(', ')}.`
            : `Delete ditolak. ${targetLabel} sudah digunakan oleh ${dependencies.join(', ')}.`;
        }

        return blockedCount > 1
          ? `Delete ditolak. ${blockedCount} data ${targetLabel} masih memiliki dependency.`
          : `Delete ditolak. ${targetLabel} masih memiliki dependency.`;
      };

      const collectFilteredDeleteTargets = async (
        maxTargets = 2000
      ): Promise<Array<{ id: number; customer: string }>> => {
        const pageSize = 200;
        const requestFilters: QuotationDataFilter = {
          batchId: activeFilters.value.batchId,
          customer: activeFilters.value.customer,
          customers: activeCustomers.value,
          periode: activeFilters.value.periode,
          revision: activeFilters.value.revision,
          page: 1,
          perPage: pageSize,
          columnFilters: getActiveServerColumnFilters(),
          sortKey: sortKey.value,
          sortDirection: sortDirection.value
        };

        const mode = selectedQuotationMode.value;
        const fetchPage = async (page: number) => {
          const filters = { ...requestFilters, page };
          if (mode === 'CONTRACT') {
            return quotationService.getContractData(filters);
          }
          if (mode === 'ZSTT') {
            return quotationService.getZsttData(filters);
          }
          return quotationService.getData({ ...filters, quotationMode: mode });
        };

        const firstResponse = await fetchPage(1);
        if (firstResponse.status !== 'success') {
          throw new Error(firstResponse.message || 'Gagal mengambil seluruh hasil filter.');
        }

        const total = Math.max(0, Number(firstResponse.total || 0));
        if (total > maxTargets) {
          throw new Error(
            `Hasil filter berjumlah ${total.toLocaleString('id-ID')} data. Maksimal ${maxTargets.toLocaleString('id-ID')} data per delete.`
          );
        }

        const targets = new Map<number, { id: number; customer: string }>();
        const collect = (response: { data?: unknown }) => {
          const responseRows = Array.isArray(response.data)
            ? response.data as QuotationRow[]
            : [];
          responseRows.forEach((row) => {
            const id = getDeleteRowId(row);
            if (id > 0) {
              targets.set(id, {
                id,
                customer: String(row._customer || activeFilters.value.customer || '').trim()
              });
            }
          });
        };

        collect(firstResponse);
        const totalPages = Math.max(
          1,
          Number(firstResponse.total_pages || Math.ceil(total / pageSize) || 1)
        );

        for (let page = 2; page <= totalPages; page += 1) {
          const response = await fetchPage(page);
          if (response.status !== 'success') {
            throw new Error(response.message || 'Gagal mengambil seluruh hasil filter.');
          }
          collect(response);
        }

        return Array.from(targets.values());
      };

      const requestLifecycleDelete = async (mode: 'SELECTED' | 'FILTERED'): Promise<void> => {
        if (!requireUploadMdfoPermission('Delete')) return;
        if (isDeleting.value) return;

        let targets: Array<{ id: number; customer: string }> = [];

        try {
          targets = mode === 'FILTERED'
            ? await collectFilteredDeleteTargets(2000)
            : [...deleteSelectedIds.value]
              .filter((id) => Number.isInteger(id) && id > 0)
              .map((id) => ({ id, customer: activeFilters.value.customer }));
        } catch (error: unknown) {
          notificationStore.showAlertWarning(
            getErrorMessage(error, 'Gagal mengambil seluruh hasil filter.')
          );
          return;
        }

        if (targets.length === 0) {
          notificationStore.showAlertWarning(
            mode === 'FILTERED' ? 'Tidak ada data hasil filter yang dapat dihapus.' : 'Pilih minimal satu baris terlebih dahulu.'
          );
          return;
        }
        if (targets.length > 2000) {
          notificationStore.showAlertWarning(
            'Maksimal 2.000 data per delete. Persempit filter customer, periode, atau revision terlebih dahulu.'
          );
          return;
        }

        const entity = selectedQuotationMode.value === 'CONTRACT'
          ? 'CONTRACT'
          : selectedQuotationMode.value === 'ZSTT'
            ? 'ZSTT'
            : 'QUOTATION';

        try {
          isDeleting.value = true;
          const preview = await previewMdfoDelete({
            entity,
            selection_mode: mode,
            targets,
            customer: activeFilters.value.customer,
            periode: activeFilters.value.periode,
            revision: activeFilters.value.revision
          });

          // Backend menerapkan all-or-nothing. Jangan menawarkan konfirmasi
          // apabila satu saja target berubah/tidak aman karena execute pasti
          // menolak keseluruhan operasi.
          if (
            preview.impact.safe <= 0 ||
            preview.impact.protected > 0 ||
            preview.impact.safe !== preview.impact.requested
          ) {
            isDeleting.value = false;
            notificationStore.showAlertWarning(
              buildCompactDeleteDependencyWarning(preview)
            );
            return;
          }

          const lifecycleNote = entity === 'QUOTATION'
            ? 'Quotation yang dipilih akan di-soft-delete bersama Contract dan ZSTT turunannya. Raw MDFO tetap dipertahankan.'
            : entity === 'CONTRACT'
              ? 'Contract yang dipilih akan di-soft-delete bersama ZSTT turunannya. Quotation dan Raw MDFO tetap dipertahankan.'
              : 'Hanya ZSTT yang dipilih yang di-soft-delete. Contract, Quotation, dan Raw MDFO tetap dipertahankan.';
          notificationStore.showConfirm(
            `Delete ${selectedQuotationMode.value} ${mode === 'FILTERED' ? 'Filtered' : 'Selected'}`,
            `${preview.message}\n\n${lifecycleNote}\n\nSeluruh target sudah lolos dependency check. Lanjutkan?`,
            async () => {
              try {
                isDeleting.value = true;
                const result = await executeMdfoDelete({ token: preview.token });
                clearDeleteSelection();
                await loadData({
                  batchId: activeFilters.value.batchId,
                  customer: activeFilters.value.customer,
                  periode: activeFilters.value.periode,
                  revision: activeFilters.value.revision
                });
                window.dispatchEvent(new CustomEvent('mdfo-lifecycle-deleted'));
                notificationStore.showAlertSuccess(result.message);
              } catch (error: unknown) {
                notificationStore.showAlertError(
                  getErrorMessage(error, 'Delete gagal.')
                );
              } finally {
                isDeleting.value = false;
              }
            },
            () => { isDeleting.value = false; },
            'Delete Aman',
            'Batal'
          );
        } catch (error: unknown) {
          isDeleting.value = false;
          notificationStore.showAlertError(
            getErrorMessage(error, 'Preview delete gagal.')
          );
        }
      };

      // Public Api

      return {
        columns,
        frozenColumns,

        rows,
        serverPaged,
        serverTotal,
        serverTotalPages,
        activeCustomers,
        batchId,
        activeFilters,

        isLoading,
        isGenerating,
        isDownloadingExcel,
        deleteSelectedIds,
        isDeleting,
        isDeleteRowSelected,
        toggleDeleteRow,
        deleteCurrentPageSelected,
        toggleDeleteCurrentPage,
        clearDeleteSelection,
        requestLifecycleDelete,

        quotationModeOptions,
        selectedQuotationMode,
        selectedQuotationModeOption,
        selectedQuotationTitle,
        selectedQuotationDescription,

        zsttDayColumns,
        zsttColumnTotals,
        zsttOverallStatus,

        selectedFilters,
        searchFilters,
        openFilters,
        filterPopupPosition,

        sortKey,
        sortDirection,

        currentPage,
        rowsPerPage,
        rowsPerPageOptions,

        tableWidth,

        frozenPaneWidth,

        orderQuantityColumnIndex,
        rightFooterColspan,
        filteredRows,
        sortedRows,
        exportRowCount,

        paginatedRows,
        totalPages,
        visiblePages,
        showingStart,
        showingEnd,

        orderQuantityGrandTotal,

        canDownloadExcel,
        missingDownloadFilters,
        downloadExcelDescription,

        getHeaderBackground,
        getBodyBackground,

        isFrozenColumn,

        getColumnStyle,

        getFooterColumnStyle,

        getFooterBlockStyle,

        getEmptyRowStyle,

        formatNumber,
        formatCellValue,

        getFilteredColumnOptions,
        getActiveColumnFilters,

        getSelectedFilterValues,
        isFilterSelected,

        toggleDropdown,
        closeAllDropdowns,
        toggleFilter,
        toggleAllColumn,
        clearColumnFilter,
        isAllSelected,
        getSelectedLabel,

        setSort,
        isSortActive,
        isNoSortActive,
        clearAllFilters,

        loadData,
        setQuotationMode,
        regenerate,
        downloadExcel,
        downloadExcelForCustomers,

        firstPage,
        prevPage,
        nextPage,
        lastPage,
        showAddPartModal,
        isSavingAddPart,
        addPartForm,

        openAddPartModal,
        closeAddPartModal,
        saveAddPart,

        isLoadingAddPartOptions,

        addPartCustomerOptions,
        addPartPeriodOptions,
        addPartRevisionOptions,

        showAddPartCustomerDropdown,
        showAddPartPeriodDropdown,
        showAddPartRevisionDropdown,

        formatAddPartPeriod,

        closeAddPartDropdowns,

        toggleAddPartCustomerDropdown,
        toggleAddPartPeriodDropdown,
        toggleAddPartRevisionDropdown,

        selectAddPartCustomer,
        selectAddPartPeriod,
        selectAddPartRevision,

        addPartPasteText,
        addPartItems,
        addPartDraftCount,
        addPartSaveCount,
        addPartSaveCurrent,
        addPartSaveTotal,

        addSingleAddPartItem,
        importAddPartText,
        handleAddPartPaste,
        removeAddPartItem,
        clearAddPartItems,
        applyDefaultQtyToAllAddParts,

        clearAddPartData,
        isCheckingAddPartDuplicates,
        addPartPasteCandidateCount
      };
    }
  );
