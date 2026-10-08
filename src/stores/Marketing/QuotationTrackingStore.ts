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
  quotationTrackingService
} from '@/services/Marketing/QuotationTrackingService';

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
  QuotationTrackingApiRow,
  QuotationTrackingColorOption,
  QuotationTrackingColumn,
  QuotationTrackingDocumentType,
  QuotationTrackingEditableKey,
  QuotationTrackingFilters,
  QuotationTrackingKey,
  QuotationTrackingResponse,
  QuotationTrackingRow,
  QuotationTrackingSortDirection,
  QuotationTrackingStatus,
  QuotationTrackingUpdateField
} from '@/types/Marketing/QuotationTracking';

const GRID_BORDER = '#e2e8f0';

const BLANK_FILTER_OPTION = 'Blanks';

const normalizeFilterOption = (value: unknown): string => {
  const text = String(value ?? '').trim();
  return text === '' ? BLANK_FILTER_OPTION : text;
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

const ROWS_PER_PAGE_OPTIONS = [
  10,
  20,
  50,
  100
];

const COLUMNS:
  QuotationTrackingColumn[] = [
    {
      key: 'handoverDate',
      label: 'Tgl Serah',
      width: '100px'
    },
    {
      key: 'creatorName',
      label: 'Nama Pembuat',
      width: '120px'
    },
    {
      key: 'customer',
      label: 'Destinasi/Customer',
      width: '145px'
    },
    {
      key: 'documentType',
      label: 'Jenis Dokumen',
      width: '135px'
    },
    {
      key: 'periode',
      label: 'Periode',
      width: '110px'
    },
    {
      key: 'handedTime',
      label: 'Jam Diserahkan',
      width: '110px'
    },
    {
      key: 'documentNumber',
      label:
        'Nomor Dokumen',
      width: '130px'
    },
    {
      key: 'totalQuantity',
      label: 'Total Quantity',
      width: '105px'
    },
    {
      key: 'uploadDate',
      label: 'Tanggal Upload',
      width: '125px'
    },
    {
      key: 'uploadTime',
      label: 'Jam Upload',
      width: '135px'
    },
    {
      key: 'uploadBy',
      label: 'Nama Upload',
      width: '135px'
    },
    {
      key: 'status',
      label: 'Status',
      width: '140px'
    },
    {
      key: 'remarks',
      label: 'Remarks',
      width: '190px'
    }
  ];

const FROZEN_COLUMNS:
  QuotationTrackingKey[] = [
    'handoverDate',
    'creatorName',
    'customer'
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
] as const;

const USER_COLOR_CLASSES:
  Record<string, string> = {
  yellow:
    'bg-yellow-100 text-yellow-800 border-yellow-200',
  pink:
    'bg-pink-100 text-pink-700 border-pink-200',
  cyan:
    'bg-cyan-100 text-cyan-600 border-cyan-200',
  purple:
    'bg-purple-100 text-purple-700 border-purple-200',
  blue:
    'bg-blue-100 text-blue-700 border-blue-200',
  gray:
    'bg-gray-100 text-gray-700 border-gray-200',
  green:
    'bg-green-100 text-green-700 border-green-200',
  orange:
    'bg-orange-100 text-orange-700 border-orange-200',
  red:
    'bg-red-100 text-red-700 border-red-200',
  indigo:
    'bg-indigo-100 text-indigo-700 border-indigo-200',
  emerald:
    'bg-emerald-200 text-emerald-900 border-emerald-200'
};

const COLOR_DOT_CLASSES:
  Record<string, string> = {
  sky: 'bg-sky-300',
  yellow: 'bg-yellow-300',
  pink: 'bg-pink-300',
  cyan: 'bg-cyan-300',
  purple: 'bg-purple-300',
  blue: 'bg-blue-300',
  gray: 'bg-gray-300',
  green: 'bg-green-300',
  orange: 'bg-orange-300',
  red: 'bg-red-300',
  indigo: 'bg-indigo-300',
  emerald: 'bg-emerald-300',
  amber: 'bg-amber-300',
  slate: 'bg-slate-300'
};

const STATUS_OPTIONS: Array<{
  value:
  QuotationTrackingStatus;
  label: string;
}> = [
    {
      value: 'BELUM_DIMULAI',
      label: 'Belum Mulai'
    },
    {
      value: 'DALAM_PROSES',
      label: 'Dalam Proses'
    },
    {
      value: 'DIBLOKIR',
      label: 'Diblokir'
    },
    {
      value: 'SELESAI',
      label: 'Selesai'
    }
  ];

const numberFormatter =
  new Intl.NumberFormat(
    'id-ID',
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }
  );

const getColumnWidthNumber = (
  width: string
): number => {
  return Number(
    width.replace('px', '')
  );
};

const formatDateDisplay = (
  value: unknown
): string => {
  const text = String(
    value ?? ''
  ).trim();

  if (text === '') {
    return '';
  }

  const normalized =
    text.slice(0, 10);

  const match =
    normalized.match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

  if (!match) {
    return text;
  }

  return [
    match[3],
    match[2],
    match[1]
  ].join('/');
};

const formatPeriodDisplay = (
  value: unknown
): string => {
  const text = String(
    value ?? ''
  ).trim();

  if (
    /^\d{2}\/\d{2}\/\d{4}$/
      .test(text)
  ) {
    return text;
  }

  const period =
    text.replace(/\D/g, '');

  if (!/^\d{6}$/.test(period)) {
    return text;
  }

  return [
    '01',
    period.slice(4, 6),
    period.slice(0, 4)
  ].join('/');
};

const formatTimeDisplay = (
  value: unknown
): string => {
  const text = String(
    value ?? ''
  ).trim();

  if (text === '') {
    return '';
  }

  return text.slice(0, 8);
};

const formatTimeInput = (
  value: unknown
): string => {
  const text = String(
    value ?? ''
  ).trim();

  if (text === '') {
    return '';
  }

  return text.slice(0, 5);
};

const normalizeStatus = (
  value: unknown
): QuotationTrackingStatus => {
  const normalized =
    String(value ?? '')
      .trim()
      .toUpperCase();

  return STATUS_OPTIONS.some(
    (option) =>
      option.value === normalized
  )
    ? normalized as
    QuotationTrackingStatus
    : 'BELUM_DIMULAI';
};

const normalizeDocumentType = (
  value: unknown
): QuotationTrackingDocumentType => {
  const normalized =
    String(value ?? '')
      .trim()
      .toUpperCase();

  /*
   * Kompatibilitas data lama.
   */
  if (normalized === 'QUOTATION') {
    return 'Q';
  }

  if (
    normalized === 'Q' ||
    normalized === 'Q1' ||
    normalized === 'Q2' ||
    normalized === 'Q3' ||
    normalized === 'CONTRACT' ||
    normalized === 'ZSTT'
  ) {
    return normalized;
  }

  return 'Q';
};

const getFirstValue = (
  row: QuotationTrackingApiRow,
  keys:
    Array<
      keyof QuotationTrackingApiRow
    >
): unknown => {
  for (const key of keys) {
    const value = row[key];

    if (
      value !== undefined &&
      value !== null
    ) {
      return value;
    }
  }

  return '';
};

const mapTrackingRow = (
  row: QuotationTrackingApiRow
): QuotationTrackingRow => {
  const periodeSource =
    getFirstValue(
      row,
      [
        'periodeRaw',
        'periode_raw',
        'periode'
      ]
    );

  const periodeRaw =
    String(
      periodeSource ?? ''
    ).replace(/\D/g, '');

  return {
    id:
      Number(row.id || 0),

    sourceBatchId:
      Number(
        getFirstValue(
          row,
          [
            'sourceBatchId',
            'source_batch_id'
          ]
        ) || 0
      ),

    handoverDate:
      String(
        getFirstValue(
          row,
          [
            'handoverDate',
            'handover_date'
          ]
        ) ?? ''
      ).slice(0, 10),

    creatorName:
      String(
        getFirstValue(
          row,
          [
            'creatorName',
            'creator_name'
          ]
        ) ?? ''
      ),

    customer:
      String(
        getFirstValue(
          row,
          [
            'customer',
            'customer_code'
          ]
        ) ?? ''
      ),

    documentType:
      normalizeDocumentType(
        getFirstValue(
          row,
          [
            'documentType',
            'document_type'
          ]
        )
      ),

    periodeRaw:
      /^\d{6}$/.test(periodeRaw)
        ? periodeRaw
        : '',

    periode:
      formatPeriodDisplay(
        periodeSource
      ),

    revision:
      Number(row.revision || 0),

    handedTime:
      formatTimeDisplay(
        getFirstValue(
          row,
          [
            'handedTime',
            'handed_time'
          ]
        )
      ),

    firstDocument:
      String(
        getFirstValue(
          row,
          [
            'firstDocument',
            'first_document'
          ]
        ) ?? ''
      ),

    lastDocument:
      String(
        getFirstValue(
          row,
          [
            'lastDocument',
            'last_document'
          ]
        ) ?? ''
      ),

    totalQuantity:
      getFirstValue(
        row,
        [
          'totalQuantity',
          'total_quantity'
        ]
      ) as string | number,

    uploadDate:
      String(
        getFirstValue(
          row,
          [
            'uploadDate',
            'upload_date'
          ]
        ) ?? ''
      ).slice(0, 10),

    uploadTime:
      formatTimeInput(
        getFirstValue(
          row,
          [
            'uploadTime',
            'upload_time'
          ]
        )
      ),

    uploadBy:
      String(
        getFirstValue(
          row,
          [
            'uploadBy',
            'upload_by'
          ]
        ) ?? ''
      ),

    status:
      normalizeStatus(
        row.status
      ),

    remarks:
      String(
        row.remarks ?? ''
      )
  };
};

const extractTrackingRows = (
  response:
    QuotationTrackingResponse
): QuotationTrackingApiRow[] => {
  if (Array.isArray(response.data)) {
    return response.data;
  }

  if (
    response.data &&
    typeof response.data ===
    'object' &&
    Array.isArray(
      response.data.data
    )
  ) {
    return response.data.data;
  }

  return [];
};

const createRecord = <T>(
  factory: () => T
): Record<
  QuotationTrackingKey,
  T
> => {
  return COLUMNS.reduce(
    (result, column) => {
      result[column.key] =
        factory();

      return result;
    },
    {} as Record<
      QuotationTrackingKey,
      T
    >
  );
};

const getErrorMessage = (
  error: unknown,
  fallback: string
): string => {
  return error instanceof Error
    ? error.message
    : fallback;
};

export const
  useQuotationTrackingStore =
    defineStore(
      'quotationTracking',
      () => {
        const notificationStore =
          useNotificationStore();
        const authStore =
          useAuthStore();

        const requireUploadMdfoUpdatePermission = (): boolean => {
          if (authStore.checkAccess('Marketing.Update.Monthly.UploadMdfo')) {
            return true;
          }

          notificationStore.showAlertWarning(
            'Anda tidak memiliki permission Update untuk fitur Upload MDFO.'
          );
          return false;
        };

        const rows =
          ref<
            QuotationTrackingRow[]
          >([]);

        const serverPaged = ref(false);
        const serverTotal = ref(0);
        const serverTotalPages = ref(1);

        const activeFilters =
          ref<
            QuotationTrackingFilters
          >({});

        const isLoading =
          ref(false);

        const savingCells =
          ref<
            Record<string, boolean>
          >({});

        const selectedFilters =
          ref(
            createRecord(
              () => [] as string[]
            )
          );

        const selectedColorFilters =
          ref(
            createRecord(
              () => [] as string[]
            )
          );

        const searchFilters =
          ref(
            createRecord(
              () => ''
            )
          );

        const serverFilterOptions =
          ref<Partial<Record<QuotationTrackingKey, string[]>>>({});

        const remoteFilterControllers =
          new Map<QuotationTrackingKey, AbortController>();

        const remoteFilterTimers =
          new Map<QuotationTrackingKey, ReturnType<typeof setTimeout>>();

        const openFilters =
          ref(
            createRecord(
              () => false
            )
          );

        const activeFilterKey =
          ref<
            QuotationTrackingKey |
            null
          >(null);

        const sortKey =
          ref<
            QuotationTrackingKey |
            null
          >(null);

        const sortDirection =
          ref<
            QuotationTrackingSortDirection
          >('none');

        const currentPage =
          ref(1);

        const rowsPerPage =
          ref(20);

        const filterPopupPosition =
          ref({
            top: 0,
            left: 0,
            maxHeight: 350
          });

        const quotationTrackingFilterAnchor = useAnchoredPopup(() => {
          columns.forEach((column) => {
            openFilters.value[column.key] = false;
          });
          activeFilterKey.value = null;
        });

        const timeDrafts =
          ref<
            Record<number, string>
          >({});

        const openUploadUserId =
          ref<number | null>(null);

        const uploadUserPopupPosition =
          ref({
            top: 0,
            left: 0,
            width: 160
          });

        const openStatusId =
          ref<number | null>(null);

        const statusPopupPosition =
          ref({
            top: 0,
            left: 0,
            width: 150
          });

        const openRemarksId =
          ref<number | null>(null);

        const remarksPopupPosition =
          ref({
            top: 0,
            left: 0,
            width: 300
          });

        const activeRemarksDraft =
          ref('');

        const columns = COLUMNS;
        const frozenColumns =
          FROZEN_COLUMNS;
        const rowsPerPageOptions =
          ROWS_PER_PAGE_OPTIONS;
        const uploadUserOptions =
          USER_MASTER.map(
            (user) => user.name
          );
        const statusOptions =
          STATUS_OPTIONS;

        const getDocumentNumber = (
          row:
            QuotationTrackingRow
        ): string => {
          const first =
            row.firstDocument.trim();

          const last =
            row.lastDocument.trim();

          if (first === '') {
            return last;
          }

          if (
            last === '' ||
            last === first
          ) {
            return first;
          }

          return `${first}\n${last}`;
        };

        const getColumnValue = (
          row:
            QuotationTrackingRow,
          key:
            QuotationTrackingKey
        ): string => {
          switch (key) {
            case 'handoverDate':
              return formatDateDisplay(
                row.handoverDate
              );

            case 'creatorName':
              return row.creatorName;

            case 'customer':
              return row.customer;

            case 'documentType':
              return documentTypeLabel(
                row.documentType
              );

            case 'periode':
              return row.periode;

            case 'handedTime':
              return row.handedTime;

            case 'documentNumber':
              return getDocumentNumber(
                row
              );

            case 'totalQuantity':
              return formatNumber(
                row.totalQuantity
              );

            case 'uploadDate':
              return formatDateDisplay(
                row.uploadDate
              );

            case 'uploadTime':
              return row.uploadTime;

            case 'uploadBy':
              return row.uploadBy;

            case 'status':
              return statusLabel(
                row.status
              );

            case 'remarks':
              return row.remarks;
          }
        };

        const tableWidth =
          computed(() => {
            return `${columns.reduce(
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
            )
              }px`;
          });

        const getFrozenLeftPosition = (
          key:
            QuotationTrackingKey
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

        const isFrozenColumn = (
          key:
            QuotationTrackingKey
        ): boolean => {
          return frozenColumns
            .includes(key);
        };

        const getColumnStyle = (
          key:
            QuotationTrackingKey,
          isHeader = false,
          rowIndex = 0
        ): CSSProperties => {
          const column =
            columns.find(
              (item) =>
                item.key === key
            );

          const width =
            column?.width ||
            '120px';

          const isFrozen =
            frozenColumns.includes(
              key
            );

          const isOpen =
            openFilters.value[key] ===
            true;

          /*
           * Index frozen.
           */
          const frozenIndex =
            frozenColumns.indexOf(
              key
            );

          /*
           * Frozen terakhir.
           */
          const lastFrozenKey =
            frozenColumns[
            frozenColumns.length - 1
            ];

          /*
           * Cell paling kiri.
           */
          const isFirstColumn =
            key === columns[0]?.key;

          /*
           * Tracking tetap memakai emerald header.
           *
           * Mekanisme BORDER yang disamakan,
           * bukan identitas warna section.
           */
          const backgroundColor =
            isHeader
              ? '#ecfdf5'
              : rowIndex % 2 === 0
                ? '#ffffff'
                : '#f8fafc';

          /*
           * =========================================
           * GRID
           * =========================================
           */
          const gridShadows:
            string[] = [
              `inset -1px 0 0 ${GRID_BORDER}`,
              `inset 0 -1px 0 ${GRID_BORDER}`
            ];

          /*
           * Header top.
           */
          if (isHeader) {
            gridShadows.push(
              `inset 0 1px 0 ${GRID_BORDER}`
            );
          }

          /*
           * Border kiri.
           */
          if (isFirstColumn) {
            gridShadows.push(
              `inset 1px 0 0 ${GRID_BORDER}`);
          }

          /*
           * Separator frozen terakhir.
           *
           * Sama dengan MDFO.
           */
          if (
            isFrozen &&
            key === lastFrozenKey
          ) {
            gridShadows.push(
              '3px 0 7px -6px rgba(15, 23, 42, 0.32)'
            );
          }

          /*
           * =========================================
           * OVERLAP FROZEN
           * =========================================
           */
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

          /*
           * =========================================
           * BASE STYLE
           * =========================================
           */
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

          /*
           * NON FROZEN
           */
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

          /*
           * FROZEN
           */
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

        const getColumnOptions = (
          key:
            QuotationTrackingKey
        ): string[] => {
          const isUserColumn =
            key === 'creatorName' ||
            key === 'uploadBy';

          const keyword = String(searchFilters.value[key] ?? '').trim();
          const remoteOptions = serverFilterOptions.value[key];

          if (
            serverPaged.value &&
            keyword.length >= 3 &&
            Array.isArray(remoteOptions)
          ) {
            return sortFilterOptions(
              Array.from(new Set([
                ...remoteOptions.map(normalizeFilterOption),
                ...(selectedFilters.value[key] ?? [])
              ]))
                .filter((value) => !(
                  isUserColumn &&
                  String(value).trim().toLowerCase() === 'pius'
                ))
            );
          }

          return sortFilterOptions(
            Array.from(
              new Set(
                getRowsForColumnOptions(key)
                  .map((row) =>
                    normalizeFilterOption(
                      getColumnValue(
                        row,
                        key
                      )
                    )
                  )
                  .filter(
                    (value) => {
                      if (
                        isUserColumn &&
                        String(value)
                          .trim()
                          .toLowerCase() ===
                        'pius'
                      ) {
                        return false;
                      }

                      return true;
                    }
                  )
              )
            )
          );
        };

        const getSearchValue = (
          key:
            QuotationTrackingKey
        ): string => {
          return (
            searchFilters
              .value[key] ||
            ''
          );
        };

        const setSearchValue = (
          key:
            QuotationTrackingKey,
          value: string
        ) => {
          searchFilters.value[key] = value;
          scheduleRemoteFilterSearch(key, value);
        };

        const getFilteredOptions = (
          key:
            QuotationTrackingKey
        ): string[] => {
          const keyword =
            getSearchValue(key)
              .trim()
              .toLowerCase();

          if (keyword === '') {
            return getColumnOptions(key);
          }

          /*
           * >= 3 karakter memakai hasil remote server-side. Backend sudah
           * melakukan pencarian, jadi jangan menyaring ulang dengan page aktif.
           */
          if (serverPaged.value && keyword.length >= 3) {
            return getColumnOptions(key);
          }

          return getColumnOptions(key).filter(
            (option) => matchesSearchTokens(option, keyword)
          );
        };

        const getSelectedValues = (
          key:
            QuotationTrackingKey
        ): string[] => {
          return (
            selectedFilters
              .value[key] ||
            []
          );
        };

        const isFilterSelected = (
          key:
            QuotationTrackingKey,
          option: string
        ): boolean => {
          return getSelectedValues(
            key
          ).includes(option);
        };

        const toggleFilterValue = (
          key:
            QuotationTrackingKey,
          option: string
        ) => {
          const values = [
            ...getSelectedValues(key)
          ];

          const index =
            values.indexOf(option);

          if (index < 0) {
            values.push(option);
          } else {
            values.splice(
              index,
              1
            );
          }

          selectedFilters.value[key] =
            values;
        };

        const isAllSelected = (
          key:
            QuotationTrackingKey
        ): boolean => {
          const options =
            getFilteredOptions(key);

          const selected =
            getSelectedValues(key);

          return (
            options.length > 0 &&
            options.every(
              (option) =>
                selected.includes(
                  option
                )
            )
          );
        };

        const toggleAllColumn = (
          key:
            QuotationTrackingKey
        ) => {
          const options =
            getFilteredOptions(key);

          selectedFilters.value[key] =
            isAllSelected(key)
              ? []
              : [...options];
        };

        const clearColumnFilter = (
          key:
            QuotationTrackingKey
        ) => {
          selectedFilters.value[key] =
            [];

          selectedColorFilters
            .value[key] = [];

          searchFilters.value[key] = '';
          remoteFilterControllers.get(key)?.abort();
          remoteFilterControllers.delete(key);
          const next = { ...serverFilterOptions.value };
          delete next[key];
          serverFilterOptions.value = next;
        };

        const getSelectedLabel = (
          key:
            QuotationTrackingKey
        ): string => {
          const valueCount =
            getSelectedValues(
              key
            ).length;

          const colorCount =
            selectedColorFilters
              .value[key].length;

          const total =
            valueCount +
            colorCount;

          return total > 0
            ? `${total} selected`
            : 'All';
        };

        const userColorKey = (
          name: string
        ): string => {
          return (
            USER_MASTER.find(
              (item) =>
                item.name === name
            )?.color ||
            'gray'
          );
        };

        const userColorClass = (
          name: string
        ): string => {
          return (
            USER_COLOR_CLASSES[
            userColorKey(name)
            ] ||
            USER_COLOR_CLASSES.gray
          );
        };

        const documentTypeLabel = (
          type:
            QuotationTrackingDocumentType
        ): string => {
          const labels:
            Record<
              QuotationTrackingDocumentType,
              string
            > = {
            Q: 'Quotation',
            Q1: 'Quotation Q1',
            Q2: 'Quotation Q2',
            Q3: 'Quotation Q3',
            CONTRACT: 'Contract',
            ZSTT: 'ZSTT'
          };

          return labels[type];
        };

        const documentTypeClass = (
          type:
            QuotationTrackingDocumentType
        ): string => {
          if (type === 'CONTRACT') {
            return (
              'bg-green-100 text-green-700 border-green-200'
            );
          }

          if (type === 'ZSTT') {
            return (
              'bg-orange-100 text-orange-700 border-orange-200'
            );
          }

          return (
            'bg-amber-100 text-amber-700 border-amber-200'
          );
        };

        const statusLabel = (
          status:
            QuotationTrackingStatus
        ): string => {
          return (
            statusOptions.find(
              (option) =>
                option.value === status
            )?.label ||
            'Belum dimulai'
          );
        };

        /**
          * Warna status disamakan dengan
          * Tracking Upload Sales Order.
          */
        const statusClass = (
          status:
            QuotationTrackingStatus
        ): string => {
          const classes:
            Record<
              QuotationTrackingStatus,
              string
            > = {
            BELUM_DIMULAI:
              `
                border-sky-200!
                bg-sky-100!
                text-sky-700!
                hover:bg-sky-100!
            `,

            DALAM_PROSES:
              `
                border-yellow-200!
                bg-yellow-100!
                text-yellow-800!
                hover:bg-yellow-100!
            `,

            DIBLOKIR:
              `
                border-red-200!
                bg-red-100!
                text-red-700!
                hover:bg-red-100!
            `,

            SELESAI:
              `
                border-emerald-200!
                bg-emerald-100!
                text-emerald-700!
                hover:bg-emerald-100!
            `
          };

          return (
            classes[status] ??
            classes.BELUM_DIMULAI
          );
        };
        const customerClass = (
          customer: string
        ): string => {
          return customer
            .toUpperCase()
            .includes('P4')
            ? 'bg-cyan-100 text-cyan-700 border-cyan-200'
            : 'bg-blue-100 text-blue-700 border-blue-200';
        };

        const getRowColorKey = (
          key:
            QuotationTrackingKey,
          row:
            QuotationTrackingRow
        ): string => {
          if (
            key === 'creatorName'
          ) {
            return userColorKey(
              row.creatorName
            );
          }

          if (key === 'uploadBy') {
            return userColorKey(
              row.uploadBy
            );
          }

          if (
            key === 'documentType'
          ) {
            if (
              row.documentType ===
              'CONTRACT'
            ) {
              return 'green';
            }

            if (
              row.documentType ===
              'ZSTT'
            ) {
              return 'orange';
            }

            return 'amber';
          }

          if (key === 'status') {
            if (
              row.status ===
              'BELUM_DIMULAI'
            ) {
              return 'sky';
            }

            if (
              row.status ===
              'DALAM_PROSES'
            ) {
              return 'yellow';
            }

            if (
              row.status ===
              'DIBLOKIR'
            ) {
              return 'red';
            }

            if (
              row.status ===
              'SELESAI'
            ) {
              return 'emerald';
            }

            return 'sky';
          }

          if (key === 'customer') {
            return row.customer
              .toUpperCase()
              .includes('P4')
              ? 'cyan'
              : 'blue';
          }

          return '';
        };

        const getRowsForColumnOptions = (
          activeKey: QuotationTrackingKey
        ) => {
          /* Server sudah menerapkan filter lain terhadap page aktif. */
          if (serverPaged.value) return rows.value;

          const activeFilters = columns
            .filter((column) => column.key !== activeKey)
            .map((column) => ({
              key: column.key,
              values: new Set(selectedFilters.value[column.key]),
              colors: new Set(selectedColorFilters.value[column.key])
            }))
            .filter((filter) => filter.values.size > 0 || filter.colors.size > 0);

          if (activeFilters.length === 0) return rows.value;

          return rows.value.filter((row) =>
            activeFilters.every((filter) => {
              const key = filter.key;
              const valueMatches = filter.values.size === 0 ||
                filter.values.has(
                  normalizeFilterOption(getColumnValue(row, key))
                );

              if (!valueMatches) return false;

              return filter.colors.size === 0 ||
                filter.colors.has(getRowColorKey(key, row));
            })
          );
        };

        const colorLabel = (
          key: string
        ): string => {
          const labels:
            Record<string, string> = {
            yellow: 'Kuning',
            pink: 'Pink',
            cyan: 'Cyan',
            purple: 'Ungu',
            blue: 'Biru',
            gray: 'Abu',
            green: 'Hijau',
            orange: 'Oranye',
            red: 'Merah',
            indigo: 'Indigo',
            emerald: 'Emerald',
            amber: 'Amber',
            sky: 'Biru Muda',
            slate: 'Slate'
          };

          return labels[key] || key;
        };

        const getColumnColorOptions = (
          key:
            QuotationTrackingKey
        ):
          QuotationTrackingColorOption[] => {
          let values: string[] = [];

          if (serverPaged.value) {
            if (key === 'creatorName' || key === 'uploadBy') {
              values = Array.from(new Set([
                ...USER_MASTER.map((item) => item.color),
                'gray'
              ]));
            } else if (key === 'documentType') {
              values = ['amber', 'green', 'orange'];
            } else if (key === 'status') {
              values = ['sky', 'yellow', 'red', 'emerald'];
            } else if (key === 'customer') {
              values = ['cyan', 'blue'];
            }
          } else {
            values = Array.from(
              new Set<string>(
                getRowsForColumnOptions(key)
                  .map((row) => String(getRowColorKey(key, row) || ''))
                  .filter((value): value is string => value.length > 0)
              )
            );
          }

          return values.map((colorKey) => ({
            key: colorKey,
            label: colorLabel(colorKey)
          }));
        };

        const isColorSelected = (
          key:
            QuotationTrackingKey,
          colorKey: string
        ): boolean => {
          return selectedColorFilters
            .value[key]
            .includes(colorKey);
        };

        const toggleColorFilter = (
          key:
            QuotationTrackingKey,
          colorKey: string
        ) => {
          const selected = [
            ...selectedColorFilters
              .value[key]
          ];

          const index =
            selected.indexOf(
              colorKey
            );

          if (index < 0) {
            selected.push(
              colorKey
            );
          } else {
            selected.splice(
              index,
              1
            );
          }

          selectedColorFilters
            .value[key] = selected;
        };

        const colorDotClass = (
          colorKey: string
        ): string => {
          return (
            COLOR_DOT_CLASSES[
            colorKey
            ] ||
            COLOR_DOT_CLASSES.gray
          );
        };

        const filteredRows =
          computed(() => {
            /* Paging/filter/color filter sudah dikerjakan backend. */
            if (serverPaged.value) return rows.value;

            const activeFilters = columns
              .map((column) => ({
                key: column.key,
                values: new Set(selectedFilters.value[column.key]),
                colors: new Set(selectedColorFilters.value[column.key])
              }))
              .filter((filter) => filter.values.size > 0 || filter.colors.size > 0);

            if (activeFilters.length === 0) return rows.value;

            return rows.value.filter(
              (row) => {
                return activeFilters.every(
                  (filter) => {
                    const key = filter.key;

                    const valueMatches =
                      filter.values.size === 0 ||
                      filter.values.has(
                          normalizeFilterOption(
                            getColumnValue(
                              row,
                              key
                            )
                          )
                        );

                    if (!valueMatches) {
                      return false;
                    }

                    return (
                      filter.colors.size === 0 ||
                      filter.colors.has(
                          getRowColorKey(
                            key,
                            row
                          )
                        )
                    );
                  }
                );
              }
            );
          });

        const sortedRows =
          computed(() => {
            if (serverPaged.value) return filteredRows.value;

            const data = [
              ...filteredRows.value
            ];

            /*
             * Default Tracking MDFO:
             * Tgl Serah terbaru selalu berada di paling atas.
             *
             * handoverDate sudah dinormalisasi menjadi YYYY-MM-DD,
             * sehingga sorting string DESC aman untuk urutan tanggal.
             * Row dengan tanggal kosong diletakkan paling bawah.
             *
             * Sorting manual user tetap dipertahankan. Jika user
             * belum memilih sorting kolom / sort di-clear, tampilan
             * kembali otomatis ke Tgl Serah terbaru -> terlama.
             */
            if (
              sortKey.value === null ||
              sortDirection.value ===
              'none'
            ) {
              data.sort(
                (first, second) => {
                  const firstDate =
                    String(
                      first.handoverDate ??
                      ''
                    )
                      .trim()
                      .slice(0, 10);

                  const secondDate =
                    String(
                      second.handoverDate ??
                      ''
                    )
                      .trim()
                      .slice(0, 10);

                  if (
                    firstDate === '' &&
                    secondDate === ''
                  ) {
                    return 0;
                  }

                  if (firstDate === '') {
                    return 1;
                  }

                  if (secondDate === '') {
                    return -1;
                  }

                  return secondDate
                    .localeCompare(
                      firstDate,
                      'id',
                      {
                        numeric: true
                      }
                    );
                }
              );

              return data;
            }

            const key =
              sortKey.value;

            data.sort(
              (
                first,
                second
              ) => {
                /*
                 * Khusus Tgl Serah, bandingkan nilai ISO mentah
                 * (YYYY-MM-DD), bukan display DD/MM/YYYY.
                 * Ini menjaga sorting lintas bulan/tahun tetap benar.
                 */
                if (key === 'handoverDate') {
                  const firstDate =
                    String(
                      first.handoverDate ??
                      ''
                    )
                      .trim()
                      .slice(0, 10);

                  const secondDate =
                    String(
                      second.handoverDate ??
                      ''
                    )
                      .trim()
                      .slice(0, 10);

                  if (
                    firstDate === '' &&
                    secondDate === ''
                  ) {
                    return 0;
                  }

                  if (firstDate === '') {
                    return 1;
                  }

                  if (secondDate === '') {
                    return -1;
                  }

                  const result =
                    firstDate.localeCompare(
                      secondDate,
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

                const firstValue =
                  getColumnValue(
                    first,
                    key
                  );

                const secondValue =
                  getColumnValue(
                    second,
                    key
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

            return data;
          });

        const totalPages =
          computed(() => {
            if (serverPaged.value) return Math.max(1, serverTotalPages.value);
            if (rowsPerPage.value === 0) return 1;
            return Math.max(1, Math.ceil(sortedRows.value.length / rowsPerPage.value));
          });

        const paginatedRows =
          computed(() => {
            if (serverPaged.value) return sortedRows.value;
            if (
              rowsPerPage.value === 0
            ) {
              return sortedRows.value;
            }

            const start =
              (
                currentPage.value -
                1
              ) *
              rowsPerPage.value;

            return sortedRows
              .value.slice(
                start,
                start +
                rowsPerPage.value
              );
          });

        const visiblePages =
          computed(() => {
            const maximum = 5;
            const pages: number[] = [];

            let start =
              Math.max(
                1,
                currentPage.value -
                Math.floor(
                  maximum / 2
                )
              );

            const end =
              Math.min(
                totalPages.value,
                start +
                maximum -
                1
              );

            if (
              end - start <
              maximum - 1
            ) {
              start =
                Math.max(
                  1,
                  end -
                  maximum +
                  1
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
            if (
              (serverPaged.value ? serverTotal.value : sortedRows.value.length) === 0
            ) {
              return 0;
            }

            if (
              rowsPerPage.value === 0
            ) {
              return 1;
            }

            return (
              (
                currentPage.value -
                1
              ) *
              rowsPerPage.value +
              1
            );
          });

        const showingEnd =
          computed(() => {
            if (
              rowsPerPage.value === 0
            ) {
              return sortedRows
                .value.length;
            }

            return Math.min(
              currentPage.value * rowsPerPage.value,
              serverPaged.value ? serverTotal.value : sortedRows.value.length
            );
          });

        const getTrackingSortDirection = (
          key:
            QuotationTrackingKey
        ):
          QuotationTrackingSortDirection => {
          return sortKey.value === key
            ? sortDirection.value
            : 'none';
        };

        const setTrackingSort = (
          key:
            QuotationTrackingKey,
          direction:
            QuotationTrackingSortDirection
        ) => {
          if (direction === 'none') {
            sortKey.value = null;
            sortDirection.value =
              'none';
          } else {
            sortKey.value = key;
            sortDirection.value =
              direction;
          }

          currentPage.value = 1;
          if (serverPaged.value) void loadData({ ...activeFilters.value, page: 1 });
        };

        const closeTrackingFilter =
          () => {
            columns.forEach(
              (column) => {
                openFilters
                  .value[
                  column.key
                ] = false;
              }
            );

            activeFilterKey.value =
              null;

            quotationTrackingFilterAnchor.clear();
          };

        const closeUploadUserDropdown =
          () => {
            openUploadUserId.value =
              null;
          };

        const closeStatusDropdown =
          () => {
            openStatusId.value =
              null;
          };

        const closeRemarksPopup =
          () => {
            openRemarksId.value =
              null;

            activeRemarksDraft.value =
              '';
          };

        const closeAllPopups = () => {
          closeTrackingFilter();
          closeUploadUserDropdown();
          closeStatusDropdown();
          closeRemarksPopup();
        };

        const getPopupPosition = (
          trigger: HTMLElement,
          popupWidth: number,
          popupHeight: number
        ) => {
          const rect =
            trigger
              .getBoundingClientRect();

          const padding = 8;
          const gap = 6;

          const availableBelow =
            window.innerHeight -
            rect.bottom -
            gap -
            padding;

          const availableAbove =
            rect.top -
            gap -
            padding;

          const openAbove =
            availableBelow <
            Math.min(
              popupHeight,
              180
            ) && availableAbove >
            availableBelow;

          let top =
            openAbove
              ? rect.top -
              popupHeight -
              gap
              : rect.bottom +
              gap;

          let left = rect.left;

          top = Math.max(
            padding,
            Math.min(
              top,
              window.innerHeight -
              popupHeight -
              padding
            )
          );

          left = Math.max(
            padding,
            Math.min(
              left,
              window.innerWidth -
              popupWidth -
              padding
            )
          );

          return {
            top,
            left
          };
        };

        const toggleDropdown = (
          key:
            QuotationTrackingKey,
          event: MouseEvent
        ) => {
          const wasOpen =
            openFilters.value[key];

          closeAllPopups();

          if (wasOpen) {
            return;
          }

          const trigger =
            event.currentTarget as
            HTMLElement | null;

          if (!trigger) {
            return;
          }

          quotationTrackingFilterAnchor.anchor(
            trigger,
            (anchor) => {
              const position = getAnchoredPopupPosition(anchor, {
                popupWidth: 300,
                preferredHeight: 430,
                minimumHeight: 250
              });

              filterPopupPosition.value = position;
            }
          );

          activeFilterKey.value =
            key;

          openFilters.value[key] =
            true;
        };

        const toggleUploadUserDropdown = (
          rowId: number,
          event: MouseEvent
        ) => {
          const trackingId =
            Number(rowId);

          const wasOpen =
            openUploadUserId.value ===
            trackingId;

          closeAllPopups();

          if (
            wasOpen ||
            !Number.isInteger(
              trackingId
            ) ||
            trackingId <= 0
          ) {
            return;
          }

          const trigger =
            event.currentTarget as
            HTMLElement | null;

          if (!trigger) {
            return;
          }

          const popupWidth =
            Math.max(
              160,
              trigger
                .getBoundingClientRect()
                .width
            );

          const popupHeight = 240;

          const position =
            getPopupPosition(
              trigger,
              popupWidth,
              popupHeight
            );

          uploadUserPopupPosition
            .value = {
            ...position,
            width: popupWidth
          };

          openUploadUserId.value =
            trackingId;
        };

        const toggleStatusDropdown = (
          rowId: number,
          event: MouseEvent
        ) => {
          const trackingId =
            Number(rowId);

          const wasOpen =
            openStatusId.value ===
            trackingId;

          closeAllPopups();

          if (
            wasOpen ||
            !Number.isInteger(
              trackingId
            ) ||
            trackingId <= 0
          ) {
            return;
          }

          const trigger =
            event.currentTarget as
            HTMLElement | null;

          if (!trigger) {
            return;
          }

          const popupWidth =
            Math.max(
              150,
              trigger
                .getBoundingClientRect()
                .width
            );

          const popupHeight = 190;

          const position =
            getPopupPosition(
              trigger,
              popupWidth,
              popupHeight
            );

          statusPopupPosition.value = {
            ...position,
            width: popupWidth
          };

          openStatusId.value =
            trackingId;
        };

        /**
         * Membuka popup Remarks dengan posisi:
         *
         * - rata kanan terhadap tombol Remarks;
         * - otomatis membuka ke atas jika ruang bawah sempit;
         * - tetap berada di dalam viewport;
         * - lebar maksimal 340px.
         */
        const toggleRemarksPopup = (
          row: QuotationTrackingRow,
          event: MouseEvent
        ) => {
          const trackingId =
            Number(row.id);

          const wasOpen =
            openRemarksId.value ===
            trackingId;

          /*
          * Tutup filter dan popup lainnya.
          */
          closeAllPopups();

          if (
            wasOpen ||
            !Number.isInteger(
              trackingId
            ) ||
            trackingId <= 0
          ) {
            return;
          }

          const trigger =
            event.currentTarget as
            HTMLElement | null;

          if (!trigger) {
            return;
          }

          const rect =
            trigger.getBoundingClientRect();

          const viewportPadding = 10;
          const popupGap = 6;
          const popupHeight = 275;

          /*
          * Desktop maksimal 340px.
          * Pada layar kecil mengikuti lebar viewport.
          */
          const popupWidth =
            Math.max(
              280,
              Math.min(
                340,
                window.innerWidth -
                viewportPadding * 2
              )
            );

          const availableBelow =
            window.innerHeight -
            rect.bottom -
            popupGap -
            viewportPadding;

          const availableAbove =
            rect.top -
            popupGap -
            viewportPadding;

          /*
          * Jika bagian bawah sempit,
          * popup dibuka di atas trigger.
          */
          const openAbove =
            availableBelow <
            popupHeight &&
            availableAbove >
            availableBelow;

          let top =
            openAbove
              ? rect.top -
              popupHeight -
              popupGap
              : rect.bottom +
              popupGap;

          top = Math.max(
            viewportPadding,
            Math.min(
              top,
              window.innerHeight -
              popupHeight -
              viewportPadding
            )
          );

          /*
          * Rata kanan:
          *
          * sisi kanan popup =
          * sisi kanan tombol Remarks.
          */
          const maximumLeft =
            Math.max(
              viewportPadding,
              window.innerWidth -
              popupWidth -
              viewportPadding
            );

          const rightAlignedLeft =
            rect.right -
            popupWidth;

          const left =
            Math.min(
              Math.max(
                rightAlignedLeft,
                viewportPadding
              ),
              maximumLeft
            );

          remarksPopupPosition.value = {
            top,
            left,
            width: popupWidth
          };

          /*
          * Isi textarea sebelum popup dirender.
          */
          activeRemarksDraft.value =
            String(
              row.remarks ?? ''
            );

          openRemarksId.value =
            trackingId;
        };

        const clearAllFilters = () => {
          quotationTrackingFilterAnchor.clear();

          columns.forEach(
            (column) => {
              selectedFilters
                .value[
                column.key
              ] = [];

              selectedColorFilters
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

          remoteFilterControllers.forEach((item) => item.abort());
          remoteFilterControllers.clear();
          remoteFilterTimers.forEach((timer) => clearTimeout(timer));
          remoteFilterTimers.clear();
          serverFilterOptions.value = {};

          sortKey.value = null;
          sortDirection.value =
            'none';
          currentPage.value = 1;
        };

        const fieldMap:
          Record<
            QuotationTrackingEditableKey,
            QuotationTrackingUpdateField
          > = {
          uploadDate:
            'upload_date',
          uploadTime:
            'upload_time',
          uploadBy:
            'upload_by',
          status:
            'status',
          remarks:
            'remarks'
        };

        const cellSavingKey = (
          rowId: number,
          key:
            QuotationTrackingEditableKey
        ): string => {
          return `${rowId}:${key}`;
        };

        const isCellSaving = (
          rowId: number,
          key:
            QuotationTrackingEditableKey
        ): boolean => {
          return Boolean(
            savingCells.value[
            cellSavingKey(
              rowId,
              key
            )
            ]
          );
        };

        const updateLocalRow = (
          row:
            QuotationTrackingRow,
          key:
            QuotationTrackingEditableKey,
          value: string
        ) => {
          if (key === 'status') {
            row.status =
              normalizeStatus(value);

            return;
          }

          row[key] = value as never;
        };

        const saveCell = async (
          row:
            QuotationTrackingRow,
          key:
            QuotationTrackingEditableKey,
          value: string | null
): Promise<boolean> => {
          if (!requireUploadMdfoUpdatePermission()) return false;

          const trackingId =
            Number(row.id);

          if (
            !Number.isInteger(
              trackingId
            ) ||
            trackingId <= 0
          ) {
            notificationStore
              .showAlertError(
                'ID Tracking tidak valid.'
              );

            return false;
          }

          const savingKey =
            cellSavingKey(
              trackingId,
              key
            );

          if (
            savingCells
              .value[
            savingKey
            ]
          ) {
            return false;
          }

          try {
            savingCells
              .value[
              savingKey
            ] = true;

            const response =
              await quotationTrackingService
                .updateTracking({
                  id: trackingId,
                  field:
                    fieldMap[key],
                  value
                });

            if (
              response.status ===
              'error'
            ) {
              throw new Error(
                response.message ||
                'Gagal menyimpan Tracking'
              );
            }

            updateLocalRow(
              row,
              key,
              String(
                value ?? ''
              )
            );

            return true;
          } catch (error: unknown) {
            notificationStore
              .showAlertError(
                getErrorMessage(
                  error,
                  'Gagal menyimpan Tracking'
                )
              );

            return false;
          } finally {
            delete savingCells
              .value[
              savingKey
            ];
          }
        };

        const saveFieldFromEvent = (
          row:
            QuotationTrackingRow,
          key:
            QuotationTrackingEditableKey,
          event: Event
        ) => {
          const input =
            event.target as
            HTMLInputElement;

          void saveCell(
            row,
            key,
            input.value
          );
        };

        const getTimeDraft = (
          row:
            QuotationTrackingRow
        ): string => {
          return (
            timeDrafts
              .value[
            row.id
            ] ??
            formatTimeInput(
              row.uploadTime
            )
          );
        };

        const normalizeTimeDraft = (
          value: string
        ): string => {
          const digits =
            value.replace(/\D/g, '')
              .slice(0, 4);

          if (digits.length <= 2) {
            return digits;
          }

          return (
            digits.slice(0, 2) +
            ':' +
            digits.slice(2)
          );
        };

        const updateTimeDraft = (
          row:
            QuotationTrackingRow,
          event: Event
        ) => {
          const input =
            event.target as
            HTMLInputElement;

          const value =
            normalizeTimeDraft(
              input.value
            );

          timeDrafts
            .value[
            row.id
          ] = value;

          input.value = value;
        };

        const saveTimeDraft = async (
          row:
            QuotationTrackingRow
        ) => {
          const value =
            getTimeDraft(row)
              .trim();

          if (value === '') {
            const saved =
              await saveCell(
                row,
                'uploadTime',
                null
              );

            if (saved) {
              delete timeDrafts
                .value[
                row.id
              ];
            }

            return;
          }

          if (
            !/^(?:[01]\d|2[0-3]):[0-5]\d$/
              .test(value)
          ) {
            notificationStore
              .showAlertWarning(
                'Format jam harus HH:mm.'
              );

            return;
          }

          if (
            value ===
            formatTimeInput(
              row.uploadTime
            )
          ) {
            delete timeDrafts
              .value[
              row.id
            ];

            return;
          }

          const saved =
            await saveCell(
              row,
              'uploadTime',
              value
            );

          if (saved) {
            delete timeDrafts
              .value[
              row.id
            ];
          }
        };

        const setTimeNow = async (
          row:
            QuotationTrackingRow
        ) => {
          const value =
            new Intl.DateTimeFormat(
              'en-GB',
              {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
                timeZone:
                  'Asia/Jakarta'
              }
            )
              .format(
                new Date()
              )
              .replace('.', ':');

          timeDrafts
            .value[
            row.id
          ] = value;

          await saveTimeDraft(row);
        };

        const selectUploadUser = async (
          row:
            QuotationTrackingRow,
          user: string
        ) => {
          closeUploadUserDropdown();

          await saveCell(
            row,
            'uploadBy',
            String(
              user ?? ''
            ).trim()
          );
        };

        const selectStatus = async (
          row:
            QuotationTrackingRow,
          status:
            QuotationTrackingStatus
        ) => {
          closeStatusDropdown();

          await saveCell(
            row,
            'status',
            status
          );
        };

        const cancelRemarks = () => {
          closeRemarksPopup();
        };

        const saveRemarksPopup = async (
          row:
            QuotationTrackingRow
        ) => {
          const value =
            String(
              activeRemarksDraft
                .value ?? ''
            ).trim();

          const saved =
            await saveCell(
              row,
              'remarks',
              value
            );

          if (saved) {
            closeRemarksPopup();
          }
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

          return Number.isFinite(
            number
          )
            ? numberFormatter
              .format(number)
            : String(value);
        };

        const formatCellValue = (
          row:
            QuotationTrackingRow,
          key:
            QuotationTrackingKey
        ): string => {
          return getColumnValue(
            row,
            key
          );
        };

        let latestRequestId = 0;
        let activeLoadController: AbortController | null = null;

        const getActiveServerFilters = (
          excludeKey?: QuotationTrackingKey
        ): Partial<Record<QuotationTrackingKey, string[]>> => {
          const result: Partial<Record<QuotationTrackingKey, string[]>> = {};
          columns.forEach((column) => {
            if (column.key === excludeKey) return;
            const values = selectedFilters.value[column.key] ?? [];
            if (values.length > 0) result[column.key] = [...values];
          });
          return result;
        };

        const getActiveServerColorFilters = (
          excludeKey?: QuotationTrackingKey
        ): Partial<Record<QuotationTrackingKey, string[]>> => {
          const result: Partial<Record<QuotationTrackingKey, string[]>> = {};
          columns.forEach((column) => {
            if (column.key === excludeKey) return;
            const values = selectedColorFilters.value[column.key] ?? [];
            if (values.length > 0) result[column.key] = [...values];
          });
          return result;
        };

        const loadRemoteFilterOptions = async (
          key: QuotationTrackingKey,
          keyword: string
        ) => {
          const search = String(keyword ?? '').trim();
          if (!serverPaged.value || search.length < 3) {
            remoteFilterControllers.get(key)?.abort();
            remoteFilterControllers.delete(key);
            const next = { ...serverFilterOptions.value };
            delete next[key];
            serverFilterOptions.value = next;
            return;
          }

          remoteFilterControllers.get(key)?.abort();
          const controller = new AbortController();
          remoteFilterControllers.set(key, controller);

          try {
            const options = await quotationTrackingService.getFilterOptions(
              {
                ...activeFilters.value,
                columnFilters: getActiveServerFilters(key),
                colorFilters: getActiveServerColorFilters(key),
                signal: controller.signal
              },
              key,
              search
            );

            if (controller.signal.aborted) return;
            serverFilterOptions.value = {
              ...serverFilterOptions.value,
              [key]: sortFilterOptions(options.map(normalizeFilterOption))
            };
          } catch (error: unknown) {
            if (controller.signal.aborted) return;
            notificationStore.showAlertError(
              getErrorMessage(error, 'Gagal mengambil pilihan filter Tracking')
            );
          } finally {
            if (remoteFilterControllers.get(key) === controller) {
              remoteFilterControllers.delete(key);
            }
          }
        };

        const scheduleRemoteFilterSearch = (
          key: QuotationTrackingKey,
          keyword: string
        ) => {
          const previousTimer = remoteFilterTimers.get(key);
          if (previousTimer) clearTimeout(previousTimer);
          remoteFilterTimers.delete(key);

          const search = String(keyword ?? '').trim();
          if (search.length < 3) {
            void loadRemoteFilterOptions(key, search);
            return;
          }

          const timer = setTimeout(() => {
            remoteFilterTimers.delete(key);
            void loadRemoteFilterOptions(key, search);
          }, 300);
          remoteFilterTimers.set(key, timer);
        };

        const collectFilteredTargets = async (
          maxTargets = 2000
        ): Promise<Array<{ id: number; customer: string }>> => {
          const pageSize = 200;
          const baseFilters: QuotationTrackingFilters = {
            ...activeFilters.value,
            page: 1,
            perPage: pageSize,
            columnFilters: getActiveServerFilters(),
            colorFilters: getActiveServerColorFilters(),
            sortKey: sortKey.value ?? '',
            sortDirection: sortDirection.value
          };

          const firstResponse = await quotationTrackingService.getTracking(baseFilters);
          if (firstResponse.status === 'error') {
            throw new Error(firstResponse.message || 'Gagal mengambil hasil filter Tracking');
          }

          const total = Number(firstResponse.total || 0);
          if (total > maxTargets) {
            throw new Error(
              `Hasil filter berjumlah ${total.toLocaleString('id-ID')} baris. Maksimal ${maxTargets.toLocaleString('id-ID')} baris per operasi.`
            );
          }

          const targets = new Map<number, { id: number; customer: string }>();
          const collect = (response: QuotationTrackingResponse) => {
            extractTrackingRows(response)
              .map(mapTrackingRow)
              .forEach((row) => {
                const id = Number(row.id);
                if (Number.isInteger(id) && id > 0) {
                  targets.set(id, { id, customer: String(row.customer ?? '').trim() });
                }
              });
          };

          collect(firstResponse);

          const totalPages = Math.max(1, Number(firstResponse.total_pages || Math.ceil(total / pageSize) || 1));
          for (let page = 2; page <= totalPages; page += 1) {
            const response = await quotationTrackingService.getTracking({
              ...baseFilters,
              page
            });
            if (response.status === 'error') {
              throw new Error(response.message || 'Gagal mengambil hasil filter Tracking');
            }
            collect(response);
          }

          return Array.from(targets.values());
        };

        const bulkUpdateByIds = async (
          ids: number[],
          changes: Partial<Record<QuotationTrackingEditableKey, string | null>>
): Promise<number> => {
          if (!requireUploadMdfoUpdatePermission()) return 0;

          const normalizedIds = Array.from(new Set(
            ids
              .map((value) => Number(value))
              .filter((value) => Number.isInteger(value) && value > 0)
          ));

          if (normalizedIds.length === 0) return 0;
          if (normalizedIds.length > 2000) {
            throw new Error('Maksimal 2.000 Tracking per update massal.');
          }

          const fieldMap: Record<QuotationTrackingEditableKey, QuotationTrackingUpdateField> = {
            uploadDate: 'upload_date',
            uploadTime: 'upload_time',
            uploadBy: 'upload_by',
            status: 'status',
            remarks: 'remarks'
          };

          const payloadChanges: Partial<Record<QuotationTrackingUpdateField, string | null>> = {};
          (Object.keys(changes) as QuotationTrackingEditableKey[]).forEach((key) => {
            if (!(key in fieldMap)) return;
            const value = changes[key];
            if (value !== undefined) payloadChanges[fieldMap[key]] = value;
          });

          if (Object.keys(payloadChanges).length === 0) return 0;

          const response = await quotationTrackingService.bulkUpdateTracking({
            ids: normalizedIds,
            changes: payloadChanges
          });

          if (response.status === 'error') {
            throw new Error(response.message || 'Update massal Tracking gagal');
          }

          await loadData({ ...activeFilters.value, page: currentPage.value });
          return Number(response.updated ?? normalizedIds.length);
        };

        const loadData = async (
          filters: QuotationTrackingFilters = {}
        ) => {
          const requestId = ++latestRequestId;
          activeLoadController?.abort();
          remoteFilterControllers.forEach((item) => item.abort());
          remoteFilterControllers.clear();
          remoteFilterTimers.forEach((timer) => clearTimeout(timer));
          remoteFilterTimers.clear();
          serverFilterOptions.value = {};
          const controller = new AbortController();
          activeLoadController = controller;

          try {
            isLoading.value = true;
            activeFilters.value = { ...filters };
            const requestedPage = Math.max(1, Number(filters.page ?? currentPage.value) || 1);
            const response = await quotationTrackingService.getTracking({
              ...filters,
              page: requestedPage,
              perPage: rowsPerPage.value === 0 ? 200 : rowsPerPage.value,
              columnFilters: getActiveServerFilters(),
              colorFilters: getActiveServerColorFilters(),
              sortKey: sortKey.value ?? '',
              sortDirection: sortDirection.value,
              signal: controller.signal
            });

            if (requestId !== latestRequestId || controller.signal.aborted) return;
            if (response.status === 'error') throw new Error(response.message || 'Gagal mengambil Tracking');

            rows.value = extractTrackingRows(response)
              .map(mapTrackingRow)
              .filter((row) => Number.isInteger(row.id) && row.id > 0);
            serverPaged.value = response.server_paged === true;
            serverTotal.value = Number(response.total || 0);
            serverTotalPages.value = Math.max(1, Number(response.total_pages || 1));
            currentPage.value = Math.max(1, Number(response.page || requestedPage));
            timeDrafts.value = {};
          } catch (error: unknown) {
            if (controller.signal.aborted || requestId !== latestRequestId) return;
            rows.value = [];
            serverTotal.value = 0;
            notificationStore.showAlertError(getErrorMessage(error, 'Gagal mengambil Tracking Quotation'));
          } finally {
            if (requestId === latestRequestId) isLoading.value = false;
            if (activeLoadController === controller) activeLoadController = null;
          }
        };

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

        watch(
          [selectedFilters, selectedColorFilters],
          () => {
            currentPage.value = 1;
            if (serverPaged.value) void loadData({ ...activeFilters.value, page: 1 });
          },
          { deep: true }
        );

        watch(rowsPerPage, () => {
          currentPage.value = 1;
          if (serverPaged.value) void loadData({ ...activeFilters.value, page: 1 });
        });

        watch(currentPage, (page, previousPage) => {
          if (serverPaged.value && page !== previousPage && !isLoading.value) {
            void loadData({ ...activeFilters.value, page });
          }
        });

        watch(
          totalPages,
          (pages: number) => {
            if (
              currentPage.value >
              pages
            ) {
              currentPage.value =
                pages;
            }
          }
        );

        return {
          columns,
          frozenColumns,
          rowsPerPageOptions,
          uploadUserOptions,
          statusOptions,

          rows,
          serverPaged,
          serverTotal,
          serverTotalPages,
          activeFilters,
          isLoading,
          savingCells,

          selectedFilters,
          selectedColorFilters,
          searchFilters,
          openFilters,
          activeFilterKey,
          sortKey,
          sortDirection,

          currentPage,
          rowsPerPage,

          filterPopupPosition,

          openUploadUserId,
          uploadUserPopupPosition,

          openStatusId,
          statusPopupPosition,

          openRemarksId,
          remarksPopupPosition,
          activeRemarksDraft,

          tableWidth,
          filteredRows,
          sortedRows,
          paginatedRows,
          totalPages,
          visiblePages,
          showingStart,
          showingEnd,

          isFrozenColumn,
          getColumnStyle,

          getDocumentNumber,
          getColumnValue,
          formatCellValue,
          formatNumber,
          formatDateDisplay,
          formatPeriodDisplay,

          userColorClass,
          customerClass,
          documentTypeLabel,
          documentTypeClass,
          statusLabel,
          statusClass,

          getSearchValue,
          setSearchValue,
          getFilteredOptions,
          getSelectedValues,
          isFilterSelected,
          toggleFilterValue,
          isAllSelected, toggleAllColumn,
          clearColumnFilter,
          getSelectedLabel,

          getColumnColorOptions,
          isColorSelected,
          toggleColorFilter,
          colorDotClass,

          getTrackingSortDirection,
          setTrackingSort,

          toggleDropdown,
          closeTrackingFilter,

          toggleUploadUserDropdown,
          closeUploadUserDropdown,
          selectUploadUser,

          toggleStatusDropdown,
          closeStatusDropdown,
          selectStatus,

          toggleRemarksPopup,
          closeRemarksPopup,
          cancelRemarks,
          saveRemarksPopup,

          closeAllPopups,
          clearAllFilters,

          isCellSaving,
          saveCell,
          saveFieldFromEvent,
          collectFilteredTargets,
          bulkUpdateByIds,

          getTimeDraft,
          updateTimeDraft,
          saveTimeDraft,
          setTimeNow,

          loadData,

          firstPage,
          prevPage,
          nextPage,
          lastPage,
          getEmptyRowStyle
        };
      }
    );
