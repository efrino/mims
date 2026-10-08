import {
  computed,
  nextTick,
  reactive,
  ref,
  shallowRef,
  watch
} from 'vue';
import type { CSSProperties } from 'vue';
import { defineStore } from 'pinia';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import JSZip from 'jszip';
import { useNotificationStore } from '@/stores/notification';
import { useAuthStore } from '@/stores/auth';
import { customerOrderService } from '@/services/Marketing/CustomerOrderService';
import { formatSalesOrderService } from '@/services/Marketing/FormatSalesOrderService';
import type {
  Card1Row,
  Card2Key,
  Card2Row,
  ColorKey,
  ColumnKey,
  ExcelCell,
  FilterParams,
  FormatSalesOrderRow,
  FormatSOKey,
  RawCustomerOrderBackendRow,
  SortDirection,
  TableColumn,
  TrackingBackendRow,
  TrackingEditableKey,
  TrackingStatus,
  TrackingUpdateField,
  UserMaster,
  DnCrosscheckRow,
  DnCrosscheckKey,
  DnMonitoringPreviewResponse,
  DnMonitoringReportPayload,
  RawCancelMode,
  CancelledRawRow,
  CancelledDnRow,
  CancelHistoryRow,
  TmminRawSoBackendRow,
  TmminRawSoKey,
  TmminRawSoRow,
  NtcRawSoBackendRow,
  NtcRawSoKey,
  NtcRawSoRow,
  NtcRawSoSiteSummary,
  DpmRawSoBackendRow,
  DpmRawSoKey,
  DpmRawSoRow,
  DpmRawSoDuplicateRow,
  DpmRawSoDuplicateValidation,
  DpmMdfoPoValidation,
  DpmSalesDocumentConflict,
  DpmSalesDocumentStrategy,
  FtiRawSoBackendRow,
  FtiRawSoKey,
  FtiRawSoRow,
  FtiAdditionalOrderPreview,
  FtiAdditionalOrderAllocationItem,
  FtiAdditionalOrderMode,
  FtiAdditionalManualPart,
  FtiAdditionalManualInputItem,
  GayaRawSoBackendRow,
  GayaRawSoKey,
  GayaRawSoRow,
  GayaRawSoPreviewSummary,
  AsiAdmRawSoBackendRow,
  AsiAdmRawSoOrderType,
  AsiAdmRawSoKey,
  AsiAdmRawSoRow,
  AsiAdmRawSoPreviewSummary,
  DcwaRawSoBackendRow,
  DcwaRawSoKey,
  DcwaRawSoPreviewSummary,
  DcwaRawSoRow,
  MesRawSoBackendRow,
  MesRawSoKey,
  MesRawSoRow,
  MesPartNameConflict
} from '@/types/Marketing/UploadSo';

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

// CUSTOMER ORDER STORE

export const useCustomerOrderStore = defineStore('customerOrder', () => {
  // BASE STATE & MASTER DATA

  const notificationStore = useNotificationStore();
  const authStore = useAuthStore();

  type UploadSoPermissionAction = 'view' | 'create' | 'update' | 'delete' | 'download';

  const permissions = computed(() => ({
    view: authStore.checkAccess('Marketing.View.Daily.UploadSO'),
    create: authStore.checkAccess('Marketing.Create.Daily.UploadSO'),
    update: authStore.checkAccess('Marketing.Update.Daily.UploadSO'),
    delete: authStore.checkAccess('Marketing.Delete.Daily.UploadSO'),
    download: authStore.checkAccess('Marketing.Download.Daily.UploadSO')
  }));

  const requireUploadSoPermission = (action: UploadSoPermissionAction): boolean => {
    if (permissions.value[action]) {
      return true;
    }

    const labels: Record<UploadSoPermissionAction, string> = {
      view: 'View',
      create: 'Create',
      update: 'Update',
      delete: 'Delete',
      download: 'Download'
    };

    notificationStore.showAlertWarning(
      `Anda tidak memiliki permission ${labels[action]} untuk fitur Upload SO.`
    );
    return false;
  };

  const page = ref({ title: 'Pilih Customer' });
  const breadcrumbs = shallowRef([
    { title: 'Marketing', disabled: false, href: '#' },
    { title: 'Customer', disabled: false, href: '#' },
    { title: 'Select Customer', disabled: true, href: '#' }
  ]);
  // Seed customer utama supaya dropdown dapat dibuka langsung tanpa menunggu API.
  // Endpoint customerOptions tetap dipakai sebagai refresh background, tetapi
  // interaksi UI tidak lagi diblokir oleh request jaringan setiap dropdown dibuka.
  const customerOptions = reactive<string[]>([
    'ADM P1',
    'ADM P4',
    'ADM P5',
    'ASI ADM',
    'TMMIN',
    'NTC',
    'GAYA MTR',
    'DCWA',
    'DPM',
    'FTI',
    'MES'
  ]);
  const ADM_ORDER_CUSTOMERS = [
    'ADM P1',
    'ADM P4',
    'ADM P5'
  ] as const;
  const ENCRYPTED_ORDER_CUSTOMERS = new Set<string>(ADM_ORDER_CUSTOMERS);
  const isAdmOrderCustomer = (customer: string): boolean => {
    return ADM_ORDER_CUSTOMERS.includes(customer.trim().toUpperCase() as (typeof ADM_ORDER_CUSTOMERS)[number]);
  };
  const ORDER_TRACKING_CUSTOMERS = [
    ...ADM_ORDER_CUSTOMERS,
    'ASI ADM',
    'TMMIN',
    'NTC',
    'GAYA MTR',
    'DCWA',
    'DPM',
    'FTI',
    'MES'
  ] as const;

  const DOWNLOAD_EXPORT_CUSTOMERS = [
    'ADM P1',
    'ADM P4',
    'ADM P5',
    'ASI ADM',
    'TMMIN',
    'NTC',
    'GAYA MTR',
    'DCWA',
    'DPM',
    'FTI',
    'MES'
  ] as const;

  const RAW_DOWNLOAD_EXPORT_CUSTOMERS = [
    'ADM P1',
    'ADM P4',
    'ADM P5',
    'ASI ADM',
    'TMMIN',
    'NTC',
    'GAYA MTR',
    'DCWA',
    'DPM',
    'FTI',
    'MES'
  ] as const;

  type RawDownloadExportCustomer =
    (typeof RAW_DOWNLOAD_EXPORT_CUSTOMERS)[number];

  const isRawDownloadExportCustomer = (
    customer: string
  ): customer is RawDownloadExportCustomer => {
    return RAW_DOWNLOAD_EXPORT_CUSTOMERS.includes(
      customer.trim().toUpperCase() as RawDownloadExportCustomer
    );
  };

  type DownloadExportCustomer =
    (typeof DOWNLOAD_EXPORT_CUSTOMERS)[number];

  const isOrderTrackingCustomer = (customer: string): boolean => {
    return ORDER_TRACKING_CUSTOMERS.includes(
      customer.trim().toUpperCase() as (typeof ORDER_TRACKING_CUSTOMERS)[number]
    );
  };

  const isDownloadExportCustomer = (
    customer: string
  ): customer is DownloadExportCustomer => {
    return DOWNLOAD_EXPORT_CUSTOMERS.includes(
      customer.trim().toUpperCase() as DownloadExportCustomer
    );
  };
  // HEADER CUSTOMER & ORDER DATE FILTER

  const selectedCustomers =
    ref<string[]>([]);
  // DN MONITORING REPORT

  const showDnMonitoringReport =
    ref(false);

  // SPLIT CROSSCHECK + REPORT VIEW
  // false:
  //   behavior lama (Data Only / Report Only).
  // true:
  //   Crosscheck table dan DN Monitoring Report ditampilkan
  //   berdampingan pada halaman yang sama.

  const showDnMonitoringCompare =
    ref(false);

  const showDnMonitoringPeriodModal =
    ref(false);

  const dnMonitoringReportPeriod =
    ref('');

  // DN MONITORING DATE BASIS

  const dnMonitoringReportDateBasis =
    ref<
      'order_date' |
      'delivery_date'
    >(
      'order_date'
    );

  const dnMonitoringReportData =
    ref<
      DnMonitoringPreviewResponse |
      null
    >(
      null
    );

  // DN MONITORING REPORT CACHE
  // Back to Data hanya menyembunyikan report.
  // Data report yang sudah berhasil dibuat tetap disimpan.

  const hasDnMonitoringReportCache =
    computed<boolean>(
      () =>
        Boolean(
          dnMonitoringReportData
            .value &&
          Array.isArray(
            dnMonitoringReportData
              .value
              .pages
          )
        )
    );

  // REPORT CONFIGURATION CACHE
  // Berbeda dengan `hasDnMonitoringReportCache`.
  // Report Data Cache:
  //   hasil preview yang sudah digenerate.
  // Report Configuration Cache:
  //   bulan + basis tanggal terakhir yang dipilih user.
  // Saat user Back to Paste lalu mengganti daftar DN:
  // - report data lama dibuang karena sudah stale,
  // - tetapi period + date basis TIDAK dibuang.
  // Jadi View Report berikutnya bisa regenerate data terbaru
  // memakai konfigurasi terakhir tanpa popup ulang.

  const hasDnMonitoringReportConfig =
    computed<boolean>(
      () =>
        Boolean(
          normalizeDnMonitoringPeriod(
            dnMonitoringReportPeriod
              .value
          )
        ) &&
        [
          'order_date',
          'delivery_date'
        ].includes(
          dnMonitoringReportDateBasis
            .value
        )
    );

  // STALE REPORT FLAG
  // true:
  // - report lama masih disimpan dan masih bisa ditampilkan,
  // - tetapi source DN sudah berubah,
  // - user dapat refresh secara manual melalui
  //   "Report Perlu Update".
  // false:
  // - report sesuai dengan source DN saat ini.

  const isDnMonitoringReportStale =
    ref(false);

  const isLoadingDnMonitoringReport =
    ref(false);

  // NORMALIZE DN MONITORING PERIOD

  const normalizeDnMonitoringPeriod =
    (
      value: unknown
    ): string => {

      const raw =
        String(
          value ?? ''
        ).trim();

      // ALREADY YYYY-MM

      if (
        /^\d{4}-(0[1-9]|1[0-2])$/
          .test(
            raw
          )
      ) {
        return raw;
      }

      // HANDLE YYYYMM
      // Kalau suatu kode lama masih menghasilkan:
      // 202608
      // otomatis menjadi:
      // 2026-08

      if (
        /^\d{6}$/
          .test(
            raw
          )
      ) {
        const year =
          raw.slice(
            0,
            4
          );

        const month =
          raw.slice(
            4,
            6
          );

        if (
          /^(0[1-9]|1[0-2])$/
            .test(
              month
            )
        ) {
          return `${year}-${month}`;
        }
      }

      return '';
    };
  // ============================================================
  // PERIOD LABEL
  // ============================================================

  const dnMonitoringReportPeriodLabel =
    computed<string>(() => {

      const period =
        normalizeDnMonitoringPeriod(
          dnMonitoringReportPeriod
            .value
        );


      if (
        !period
      ) {
        return '';
      }


      const [
        year,
        month
      ] =
        period.split(
          '-'
        );


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
            Number(
              year
            ),
            Number(
              month
            ) - 1,
            1
          )
        );
    });


  // ============================================================
  // DATE BASIS LABEL
  // ============================================================

  const dnMonitoringReportDateBasisLabel =
    computed<string>(
      () =>
        dnMonitoringReportDateBasis
          .value ===
          'delivery_date'
          ? 'Delivery Date'
          : 'Order Date'
    );


  // ============================================================
  // LOAD HTML REPORT
  // ============================================================


  // ============================================================
  // FETCH DN MONITORING REPORT
  // ============================================================

  const fetchDnMonitoringReportPreview =
    async (): Promise<boolean> => {

      if (
        dnMonitoringReportCount
          .value ===
        0
      ) {
        notificationStore
          .showAlertWarning(
            'Tidak ada data DN untuk dibuat menjadi report.'
          );

        return false;
      }


      if (
        isLoadingDnMonitoringReport
          .value
      ) {
        return false;
      }


      /*
       * Simpan kondisi cache SEBELUM masuk try/catch.
       *
       * Variabel ini dipakai baik di:
       * - try
       * - catch
       *
       * Jadi scope-nya harus berada di level function,
       * bukan dideklarasikan di dalam blok try.
       */
      const hadPreviousReport =
        hasDnMonitoringReportCache
          .value;


      try {
        isLoadingDnMonitoringReport
          .value =
          true;

        /*
         * Jangan kosongkan report lama sebelum request selesai.
         *
         * Ini penting untuk Crosscheck View:
         * user tetap dapat melihat snapshot report terakhir
         * selama proses refresh berjalan.
         */


        const requestDnMonitoringPreview = async (): Promise<any> =>
          customerOrderService.previewDnMonitoringReport(
            buildDnMonitoringReportPayload()
          );

        let response: any;

        try {
          response = await requestDnMonitoringPreview();
        } catch (requestError: any) {
          const status = Number(requestError?.response?.status ?? 0);

          /*
           * Cold request pertama pada localhost dapat sesaat gagal ketika DB
           * dan filesystem baru mulai membaca source report. Backend sekarang
           * sudah jauh lebih ringan; retry satu kali ini hanya menjadi safety
           * net untuk 500/502/503/504 agar user tidak perlu klik dua kali.
           */
          if ([500, 502, 503, 504].includes(status)) {
            await new Promise((resolve) => window.setTimeout(resolve, 250));
            response = await requestDnMonitoringPreview();
          } else {
            throw requestError;
          }
        }


        /*
         * CustomerOrderService pada beberapa revisi mengembalikan
         * AxiosResponse, sedangkan revisi lain langsung mengembalikan
         * response.data. Terima kedua bentuk supaya report tidak gagal
         * hanya karena perbedaan wrapper service.
         */
        let data: any =
          response?.data !== undefined
            ? response.data
            : response;


        /*
         * Defense tambahan bila server/proxy mengembalikan JSON
         * sebagai string.
         */
        if (typeof data === 'string') {
          const raw = data.trim();

          try {
            data = JSON.parse(raw);
          } catch {
            console.error(
              'DN Monitoring Preview raw response:',
              raw.slice(0, 1500)
            );

            throw new Error(
              'Response DN Monitoring tidak valid. Cek tab Network > dnMonitoringPreview > Response.'
            );
          }
        }


        /*
         * Kompatibilitas jika API wrapper menaruh payload sekali lagi
         * di property data.
         */
        if (
          data &&
          typeof data === 'object' &&
          !Array.isArray(data) &&
          !data.status &&
          data.data &&
          typeof data.data === 'object'
        ) {
          data = data.data;
        }


        // ====================================================
        // EMPTY MONTH
        // ====================================================

        if (
          data?.status ===
          'empty'
        ) {
          /*
           * Jika ini refresh report lama:
           * pertahankan snapshot lama dan tetap tandai stale.
           *
           * Jika belum pernah ada report:
           * tidak ada yang perlu ditampilkan.
           */
          if (
            !hadPreviousReport
          ) {
            dnMonitoringReportData
              .value =
              null;

            showDnMonitoringReport
              .value =
              false;

            showDnMonitoringCompare
              .value =
              false;
          }


          isDnMonitoringReportStale
            .value =
            hadPreviousReport;


          notificationStore
            .showAlertWarning(
              data.message ||
              `DN di bulan ${dnMonitoringReportPeriodLabel.value} berdasarkan ${dnMonitoringReportDateBasisLabel.value} tidak ada.`
            );


          return false;
        }


        // ====================================================
        // REAL BACKEND ERROR
        // ====================================================

        if (
          data?.status !==
          'success'
        ) {
          throw new Error(
            data?.message ||
            'Report DN Monitoring gagal dibuat.'
          );
        }


        if (
          !Array.isArray(
            data.pages
          )
        ) {
          throw new Error(
            'Format data DN Monitoring tidak valid.'
          );
        }


        // ====================================================
        // SUCCESS
        // ====================================================

        dnMonitoringReportData
          .value =
          data;


        isDnMonitoringReportStale
          .value =
          false;


        return true;

      } catch (
      error: any
      ) {
        console.error(
          'DN Monitoring Preview:',
          error
        );


        /*
         * Jika sebelumnya sudah ada report, jangan hilangkan
         * snapshot tersebut hanya karena refresh gagal.
         */
        if (
          !hadPreviousReport
        ) {
          dnMonitoringReportData
            .value =
            null;

          showDnMonitoringReport
            .value =
            false;

          showDnMonitoringCompare
            .value =
            false;
        }


        isDnMonitoringReportStale
          .value =
          hadPreviousReport;


        notificationStore
          .showAlertError(
            error.response
              ?.data
              ?.message ||
            error.message ||
            'Gagal membuat DN Monitoring Report.'
          );


        return false;

      } finally {
        isLoadingDnMonitoringReport
          .value =
          false;
      }
    };

  // ============================================================
  // REFRESH STALE DN MONITORING REPORT
  // ============================================================

  const refreshDnMonitoringReport =
    async (): Promise<void> => {

      if (
        !isDnMonitoringReportStale
          .value
      ) {
        return;
      }


      if (
        dnMonitoringReportCount
          .value ===
        0
      ) {
        notificationStore
          .showAlertWarning(
            'Tidak ada data DN terbaru untuk memperbarui report.'
          );

        return;
      }


      /*
       * Tidak mengubah layout.
       *
       * Jika saat ini Crosscheck View:
       * tetap Crosscheck View selama refresh.
       *
       * Jika saat ini Report Only:
       * tetap Report Only selama refresh.
       */
      const success =
        await fetchDnMonitoringReportPreview();


      if (
        !success
      ) {
        return;
      }


      notificationStore
        .showAlertSuccess(
          'DN Monitoring Report berhasil diperbarui.'
        );
    };


  // ============================================================
  // TOGGLE DN MONITORING REPORT
  // ============================================================

  // ============================================================
  // OPEN / CLOSE DN MONITORING REPORT
  // ============================================================

  const openDnMonitoringReportSettings =
    (): void => {

      if (
        dnMonitoringReportCount
          .value ===
        0 &&
        !hasDnMonitoringReportCache
          .value
      ) {
        notificationStore
          .showAlertWarning(
            'Tidak ada data DN untuk dibuat menjadi report.'
          );

        return;
      }


      /*
       * Report pertama:
       * mulai dari pilihan awal.
       *
       * Jika report data sudah invalid karena DN berubah,
       * tetapi configuration cache masih ada, bulan dan
       * basis tanggal terakhir tetap dipertahankan.
       */
      if (
        !hasDnMonitoringReportConfig
          .value
      ) {
        dnMonitoringReportPeriod
          .value =
          '';

        dnMonitoringReportDateBasis
          .value =
          'order_date';
      }


      showDnMonitoringPeriodModal
        .value =
        true;
    };


  const toggleDnMonitoringReport =
    async (): Promise<void> => {

      // ========================================================
      // REPORT ONLY -> DATA ONLY
      // ========================================================
      //
      // Behavior lama tetap dipertahankan.
      // Cache report tidak dihapus.
      // ========================================================

      if (
        showDnMonitoringReport
          .value
      ) {
        showDnMonitoringReport
          .value =
          false;

        showDnMonitoringCompare
          .value =
          false;

        return;
      }


      // ========================================================
      // SPLIT VIEW -> REPORT ONLY
      // ========================================================

      if (
        showDnMonitoringCompare
          .value &&
        hasDnMonitoringReportCache
          .value
      ) {
        showDnMonitoringCompare
          .value =
          false;

        showDnMonitoringReport
          .value =
          true;

        return;
      }


      // ========================================================
      // DATA ONLY -> CACHED REPORT
      // ========================================================

      if (
        hasDnMonitoringReportCache
          .value
      ) {
        showDnMonitoringCompare
          .value =
          false;

        showDnMonitoringReport
          .value =
          true;

        return;
      }


      // ========================================================
      // STALE REPORT -> REFRESH WITH LAST CONFIG
      // ========================================================
      //
      // Contoh alur:
      //
      // 1. Generate Agustus 2026 - Order Date.
      // 2. Back to Paste.
      // 3. Paste DN baru.
      // 4. Hasil Crosscheck berubah -> report data lama invalid.
      // 5. User klik View Report.
      //
      // Di tahap ini TIDAK buka popup ulang.
      // Report langsung digenerate memakai:
      //
      // - period terakhir,
      // - date basis terakhir,
      // - DN terbaru dari hasil crosscheck saat ini.
      // ========================================================

      if (
        hasDnMonitoringReportConfig
          .value
      ) {
        if (
          dnMonitoringReportCount
            .value ===
          0
        ) {
          notificationStore
            .showAlertWarning(
              'Tidak ada data DN terbaru untuk dibuat menjadi report.'
            );

          return;
        }


        const success =
          await fetchDnMonitoringReportPreview();


        if (
          !success
        ) {
          return;
        }


        showDnMonitoringCompare
          .value =
          false;


        showDnMonitoringReport
          .value =
          true;


        return;
      }


      // ========================================================
      // FIRST GENERATE
      // ========================================================

      openDnMonitoringReportSettings();
    };


  // ============================================================
  // TOGGLE SPLIT CROSSCHECK VIEW
  // ============================================================

  const toggleDnMonitoringCompare =
    (): void => {

      if (
        !hasDnMonitoringReportCache
          .value
      ) {
        notificationStore
          .showAlertWarning(
            'Generate DN Monitoring Report terlebih dahulu.'
          );

        return;
      }


      /*
       * Jika sedang Split View:
       * kembali ke Data Only.
       */
      if (
        showDnMonitoringCompare
          .value
      ) {
        showDnMonitoringCompare
          .value =
          false;

        showDnMonitoringReport
          .value =
          false;

        return;
      }


      /*
       * Masuk Split View.
       * Full Report dimatikan supaya kedua section
       * dapat dirender berdampingan.
       */
      showDnMonitoringReport
        .value =
        false;

      showDnMonitoringCompare
        .value =
        true;
    };


  // ============================================================
  // CLOSE PERIOD MODAL
  // ============================================================

  const closeDnMonitoringPeriodModal =
    (): void => {

      showDnMonitoringPeriodModal
        .value =
        false;
    };

  // ============================================================
  // CONFIRM PERIOD AND VIEW REPORT
  // ============================================================

  const confirmDnMonitoringPeriodAndView =
    async (): Promise<void> => {

      if (
        !dnMonitoringReportPeriod
          .value
      ) {
        notificationStore
          .showAlertWarning(
            'Pilih periode bulan terlebih dahulu.'
          );

        return;
      }


      if (
        ![
          'order_date',
          'delivery_date'
        ].includes(
          dnMonitoringReportDateBasis
            .value
        )
      ) {
        notificationStore
          .showAlertWarning(
            'Pilih dasar report terlebih dahulu.'
          );

        return;
      }


      /*
      * Jangan tutup modal dulu.
      *
      * Kalau bulan kosong,
      * user masih bisa langsung
      * memilih bulan lainnya.
      */
      const success =
        await fetchDnMonitoringReportPreview();


      if (
        !success
      ) {
        return;
      }


      /*
      * Baru tutup kalau report berhasil.
      */
      showDnMonitoringPeriodModal
        .value =
        false;


      showDnMonitoringCompare
        .value =
        false;


      showDnMonitoringReport
        .value =
        true;
    };



  /*
  * Selection sementara di dalam dropdown.
  * Baru diterapkan setelah klik Apply.
  */
  const draftSelectedCustomers =
    ref<string[]>([]);

  /*
  * Kompatibilitas dengan fungsi lama.
  *
  * Kalau hanya 1 customer dipilih:
  * selectedCustomer = ADM P1
  *
  * Kalau multi:
  * selectedCustomer = ''
  *
  * Ini penting supaya kode lama yang
  * membutuhkan single customer tidak error.
  */
  const selectedCustomer =
    computed(() => {
      return selectedCustomers.value.length === 1
        ? selectedCustomers.value[0]
        : '';
    });

  const RAW_SPECIAL_SCHEMA_CUSTOMERS = [
    'TMMIN',
    'NTC',
    'GAYA MTR',
    'ASI ADM',
    'DCWA',
    'DPM',
    'FTI',
    'MES'
  ] as const;

  const hasMultiSpecialRawSchemaSelection = computed(() => {
    const normalized = selectedCustomers.value.map((customer) =>
      String(customer ?? '').trim().toUpperCase()
    );

    // Empty selection = All Customer, sehingga drawer Cancelled dapat
    // berisi ID dari beberapa tabel Raw yang namespace ID-nya berbeda.
    if (normalized.length === 0) {
      return true;
    }

    if (normalized.length <= 1) {
      return false;
    }

    return normalized.some((customer) =>
      (RAW_SPECIAL_SCHEMA_CUSTOMERS as readonly string[]).includes(customer)
    );
  });

  const rawMultiSchemaNotice = computed(() => {
    if (selectedCustomers.value.length === 0) {
      return 'All Customer menampilkan ADM P1/P4/P5 saja. Download tetap semua customer.';
    }

    if (selectedCustomers.value.length === 1) {
      return '';
    }

    const specialCustomers = selectedCustomers.value.filter((customer) =>
      (RAW_SPECIAL_SCHEMA_CUSTOMERS as readonly string[]).includes(
        String(customer ?? '').trim().toUpperCase()
      )
    );

    if (specialCustomers.length === 0) {
      return '';
    }

    const admCustomers = selectedCustomers.value.filter((customer) =>
      ['ADM P1', 'ADM P4', 'ADM P5'].includes(
        String(customer ?? '').trim().toUpperCase()
      )
    );

    if (admCustomers.length > 0) {
      return (
        'Raw Files memakai schema berbeda per customer. Pada pilihan multi-customer, ' +
        `tabel Raw hanya menampilkan ${admCustomers.join(', ')} secara server-side. ` +
        `Pilih ${specialCustomers.join(', ')} satu per satu untuk melihat Raw customer tersebut. ` +
        'Format Sales Order dan Tracking tetap mengikuti seluruh customer yang dipilih.'
      );
    }

    return (
      'Raw Files customer dengan schema khusus ditampilkan satu customer per waktu agar browser tidak memuat seluruh dataset. ' +
      `Pilih salah satu customer: ${specialCustomers.join(', ')}. ` +
      'Format Sales Order dan Tracking tetap dapat memakai pilihan multi-customer.'
    );
  });

  const isTmminSoMode =
    computed(() => {
      return (
        selectedCustomers.value.length === 1 &&
        selectedCustomer.value === 'TMMIN'
      );
    });

  const isNtcSoMode =
    computed(() => {
      return (
        selectedCustomers.value.length === 1 &&
        selectedCustomer.value === 'NTC'
      );
    });

  const isGayaSoMode =
    computed(() => {
      return (
        selectedCustomers.value.length === 1 &&
        selectedCustomer.value === 'GAYA MTR'
      );
    });

  const isAsiAdmSoMode =
    computed(() => {
      return (
        selectedCustomers.value.length === 1 &&
        selectedCustomer.value === 'ASI ADM'
      );
    });

  const isDcwaSoMode =
    computed(() => {
      return (
        selectedCustomers.value.length === 1 &&
        selectedCustomer.value === 'DCWA'
      );
    });

  const isDpmSoMode =
    computed(() => {
      return (
        selectedCustomers.value.length === 1 &&
        selectedCustomer.value === 'DPM'
      );
    });

  const isFtiSoMode =
    computed(() => {
      return (
        selectedCustomers.value.length === 1 &&
        selectedCustomer.value === 'FTI'
      );
    });

  const isMesSoMode =
    computed(() => {
      return (
        selectedCustomers.value.length === 1 &&
        selectedCustomer.value === 'MES'
      );
    });

  const clearHeaderCustomerSelection = () => {
    draftSelectedCustomers.value = [];
  };

  const selectedCustomerLabel =
    computed(() => {
      const selected =
        selectedCustomers.value;

      if (selected.length === 0) {
        return 'All Customer';
      }

      if (selected.length === 1) {
        return selected[0];
      }

      if (selected.length === 2) {
        return selected.join(', ');
      }

      return `${selected.length} Customers`;
    });

  const showHeaderCustomerDropdown =
    ref(false);

  const getJakartaTodayIso = (): string => {
    const parts = new Intl.DateTimeFormat(
      'en-CA',
      {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }
    ).formatToParts(new Date());

    const year =
      parts.find((part) => part.type === 'year')?.value ?? '';
    const month =
      parts.find((part) => part.type === 'month')?.value ?? '';
    const day =
      parts.find((part) => part.type === 'day')?.value ?? '';

    return `${year}-${month}-${day}`;
  };

  const todayDate =
    ref(getJakartaTodayIso());

  const syncTodayDate = (): void => {
    todayDate.value =
      getJakartaTodayIso();
  };

  const showOrderDateFilter =
    ref(false);

  const fromDate =
    ref('');

  const toDate =
    ref('');

  const minToDate =
    computed(() => fromDate.value || '');

  /*
   * Batas maksimum Order/Delivery Date tidak lagi selalu hari ini.
   * Nilainya mengikuti tanggal terbaru yang benar-benar tersedia pada
   * Raw Files / Format Sales Order untuk scope customer aktif.
   * Creation Date tetap dibatasi sampai hari ini.
   */
  const maxOrderDate =
    ref(todayDate.value);

  const maxDeliveryDate =
    ref(todayDate.value);

  // ========================================================
  // DELIVERY DATE FILTER
  // ========================================================

  const showDeliveryDateFilter =
    ref(false);

  const deliveryFromDate =
    ref('');

  const deliveryToDate =
    ref('');

  const minDeliveryToDate =
    computed(
      () =>
        deliveryFromDate.value ||
        ''
    );

  // ========================================================
  // CREATION DATE FILTER
  // ========================================================
  // Menggunakan created_at Raw SO di database.
  // To Date boleh kosong; bila kosong dianggap sampai hari ini.

  const showCreationDateFilter =
    ref(false);

  const creationFromDate =
    ref('');

  const creationToDate =
    ref('');

  const minCreationToDate =
    computed(
      () =>
        creationFromDate.value ||
        ''
    );

  const resolveOptionalToDate = (
    from: string,
    to: string,
    fallbackTo: string = todayDate.value
  ): string => {
    const normalizedFrom =
      String(from ?? '').trim();

    const normalizedTo =
      String(to ?? '').trim();

    const normalizedFallback =
      String(fallbackTo ?? '').trim();

    if (normalizedTo !== '') {
      return normalizedTo;
    }

    if (normalizedFrom === '') {
      return '';
    }

    /*
     * Order / Delivery Date boleh memiliki tanggal setelah hari ini.
     * Saat To kosong gunakan tanggal data terbaru. Kalau fallback tidak
     * valid atau berada sebelum From, perlakukan sebagai satu hari saja.
     */
    if (
      /^\d{4}-\d{2}-\d{2}$/.test(normalizedFallback) &&
      normalizedFallback >= normalizedFrom
    ) {
      return normalizedFallback;
    }

    return normalizedFrom;
  };


  // Download Excel memakai customer export yang memang mempunyai skema SO.
  // selectedCustomers kosong berarti All Customer pada header.
  const getDownloadExportCustomers = (): DownloadExportCustomer[] => {
    const sourceCustomers =
      selectedCustomers.value.length === 0
        ? [...customerOptions]
        : [...selectedCustomers.value];

    return sourceCustomers
      .map((customer) =>
        String(customer ?? '').trim().toUpperCase()
      )
      .filter(isDownloadExportCustomer);
  };

  const getUnsupportedDownloadCustomers = (): string[] => {
    if (selectedCustomers.value.length === 0) {
      return [];
    }

    return selectedCustomers.value
      .map((customer) =>
        String(customer ?? '').trim().toUpperCase()
      )
      .filter((customer) =>
        customer !== '' &&
        !isDownloadExportCustomer(customer)
      );
  };

  const getRawDownloadExportCustomers =
    (): RawDownloadExportCustomer[] => {
      const sourceCustomers =
        selectedCustomers.value.length === 0
          ? [...customerOptions]
          : [...selectedCustomers.value];

      return sourceCustomers
        .map((customer) =>
          String(customer ?? '').trim().toUpperCase()
        )
        .filter(isRawDownloadExportCustomer);
    };

  const getUnsupportedRawDownloadCustomers =
    (): string[] => {
      if (selectedCustomers.value.length === 0) {
        return [];
      }

      return selectedCustomers.value
        .map((customer) =>
          String(customer ?? '').trim().toUpperCase()
        )
        .filter((customer) =>
          customer !== '' &&
          !isRawDownloadExportCustomer(customer)
        );
    };

  const parseDownloadIsoDate = (
    value: string
  ): number | null => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return null;
    }

    const timestamp =
      Date.parse(`${value}T00:00:00Z`);

    return Number.isFinite(timestamp)
      ? timestamp
      : null;
  };

  const validateDownloadDateFilters = (): string => {
    syncTodayDate();

    const orderFrom =
      fromDate.value.trim();

    const orderTo =
      toDate.value.trim();

    const deliveryFrom =
      deliveryFromDate.value.trim();

    const deliveryTo =
      deliveryToDate.value.trim();

    const creationFrom =
      creationFromDate.value.trim();

    const creationTo =
      creationToDate.value.trim();

    const hasOrder =
      orderFrom !== '' ||
      orderTo !== '';

    const hasDelivery =
      deliveryFrom !== '' ||
      deliveryTo !== '';

    const hasCreation =
      creationFrom !== '' ||
      creationTo !== '';

    if (
      !hasOrder &&
      !hasDelivery &&
      !hasCreation
    ) {
      return 'Filter tanggal wajib diisi';
    }

    const validateRange = (
      from: string,
      to: string,
      label: string,
      maxAllowedDate: string
    ): string => {
      if (from === '') {
        return `${label} From wajib diisi.`;
      }

      const effectiveTo =
        resolveOptionalToDate(
          from,
          to,
          maxAllowedDate
        );

      const fromTime =
        parseDownloadIsoDate(from);

      const toTime =
        parseDownloadIsoDate(
          effectiveTo
        );

      const maxAllowedTime =
        parseDownloadIsoDate(
          maxAllowedDate
        );

      if (
        fromTime === null ||
        toTime === null ||
        maxAllowedTime === null
      ) {
        return `Format ${label} tidak valid.`;
      }

      if (fromTime > maxAllowedTime) {
        return `${label} From tidak boleh melewati tanggal data terbaru (${maxAllowedDate}).`;
      }

      if (toTime > maxAllowedTime) {
        return `${label} To tidak boleh melewati tanggal data terbaru (${maxAllowedDate}).`;
      }

      if (toTime < fromTime) {
        return `${label} To tidak boleh lebih kecil dari From.`;
      }

      const rangeDays =
        Math.floor(
          (toTime - fromTime) /
          86400000
        ) + 1;

      if (rangeDays > 31) {
        return `${label} untuk download maksimal 1 bulan (31 hari).`;
      }

      return '';
    };

    if (hasOrder) {
      const error =
        validateRange(
          orderFrom,
          orderTo,
          'Order Date',
          maxOrderDate.value
        );

      if (error !== '') {
        return error;
      }
    }

    if (hasDelivery) {
      const error =
        validateRange(
          deliveryFrom,
          deliveryTo,
          'Delivery Date',
          maxDeliveryDate.value
        );

      if (error !== '') {
        return error;
      }
    }

    if (hasCreation) {
      const error =
        validateRange(
          creationFrom,
          creationTo,
          'Creation Date',
          todayDate.value
        );

      if (error !== '') {
        return error;
      }
    }

    return '';
  };

  type SelectedDownloadDateScope = {
    allowed: boolean;
    message: string;
    fromDate: string;
    toDate: string;
    deliveryFromDate: string;
    deliveryToDate: string;
    creationFromDate: string;
    creationToDate: string;
    inferredFromSelection: boolean;
  };

  const normalizeSelectedOrderDate = (value: unknown): string => {
    const raw = String(value ?? '').trim();

    if (raw === '') {
      return '';
    }

    const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const iso = `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
      return parseDownloadIsoDate(iso) !== null ? iso : '';
    }

    const compactMatch = raw.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (compactMatch) {
      const iso = `${compactMatch[1]}-${compactMatch[2]}-${compactMatch[3]}`;
      return parseDownloadIsoDate(iso) !== null ? iso : '';
    }

    const dmyMatch = raw.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})(?:\s.*)?$/);
    if (dmyMatch) {
      const day = dmyMatch[1].padStart(2, '0');
      const month = dmyMatch[2].padStart(2, '0');
      const iso = `${dmyMatch[3]}-${month}-${day}`;
      return parseDownloadIsoDate(iso) !== null ? iso : '';
    }

    const monthNames: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
    };
    const shortMonthMatch = raw.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2}|\d{4})$/);
    if (shortMonthMatch) {
      const month = monthNames[shortMonthMatch[2].toLowerCase()] ?? '';
      const yearRaw = shortMonthMatch[3];
      const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw;
      const day = shortMonthMatch[1].padStart(2, '0');
      const iso = month !== '' ? `${year}-${month}-${day}` : '';
      return iso !== '' && parseDownloadIsoDate(iso) !== null ? iso : '';
    }

    return '';
  };

  const isDateFilterKey = (key: string): boolean => {
    const normalized = String(key ?? '').trim().toLowerCase();
    return (
      normalized.includes('date') ||
      normalized.includes('tanggal') ||
      normalized === 'penyerahan'
    );
  };

  /**
   * Nilai tanggal di tabel ditampilkan sebagai 4-Aug-26, sedangkan pencarian
   * server memakai ISO. Cocokkan keduanya agar keyword 2026-08-04 maupun
   * 2026-08 tetap berfungsi saat data sedang diproses secara lokal.
   */
  const normalizeSearchTokens = (search: unknown): string[] => {
    const normalized = String(search ?? '')
      .trim()
      .toLocaleLowerCase('id')
      .replace(/\s+/g, ' ');

    if (normalized === '') return [];

    return Array.from(
      new Set(
        normalized
          .split(' ')
          .map((token) => token.trim())
          .filter(Boolean)
      )
    ).slice(0, 8);
  };

  const matchesTextSearch = (value: unknown, search: unknown): boolean => {
    const displayValue = String(value ?? '')
      .trim()
      .toLocaleLowerCase('id');
    const normalizedSearch = String(search ?? '')
      .trim()
      .toLocaleLowerCase('id')
      .replace(/\s+/g, ' ');

    if (normalizedSearch === '') return true;
    if (displayValue.includes(normalizedSearch)) return true;

    const tokens = normalizeSearchTokens(normalizedSearch);
    return tokens.length > 0 && tokens.every((token) => displayValue.includes(token));
  };

  const matchesFilterOptionSearch = (
    key: string,
    option: string,
    search: string
  ): boolean => {
    const normalizedSearch = String(search ?? '').trim().toLocaleLowerCase('id');
    if (normalizedSearch === '') return true;

    const displayValue = String(option ?? '').trim();
    if (matchesTextSearch(displayValue, normalizedSearch)) return true;
    if (!isDateFilterKey(key)) return false;

    const dateTokens = displayValue.match(
      /\d{4}-\d{2}-\d{2}|\d{1,2}-[A-Za-z]{3}-\d{2,4}/g
    ) ?? [displayValue];

    return dateTokens.some((token) =>
      matchesTextSearch(normalizeSelectedOrderDate(token), normalizedSearch)
    );
  };

  const resolveSelectedDownloadDateScope = (
    orderDateValues: unknown[]
  ): SelectedDownloadDateScope => {
    syncTodayDate();

    const orderFrom =
      fromDate.value.trim();

    const orderTo =
      toDate.value.trim();

    const deliveryFrom =
      deliveryFromDate.value.trim();

    const deliveryTo =
      deliveryToDate.value.trim();

    const creationFrom =
      creationFromDate.value.trim();

    const creationTo =
      creationToDate.value.trim();

    const hasManualDateFilter =
      orderFrom !== '' ||
      orderTo !== '' ||
      deliveryFrom !== '' ||
      deliveryTo !== '' ||
      creationFrom !== '' ||
      creationTo !== '';

    if (hasManualDateFilter) {
      const manualError =
        validateDownloadDateFilters();

      return {
        allowed: manualError === '',
        message: manualError,
        fromDate: orderFrom,
        toDate:
          resolveOptionalToDate(
            orderFrom,
            orderTo,
            maxOrderDate.value
          ),
        deliveryFromDate: deliveryFrom,
        deliveryToDate:
          resolveOptionalToDate(
            deliveryFrom,
            deliveryTo,
            maxDeliveryDate.value
          ),
        creationFromDate: creationFrom,
        creationToDate:
          resolveOptionalToDate(
            creationFrom,
            creationTo,
            todayDate.value
          ),
        inferredFromSelection: false
      };
    }

    if (orderDateValues.length === 0) {
      return {
        allowed: false,
        message: 'Pilih rentang Order Date maksimal 1 bulan terlebih dahulu.',
        fromDate: '',
        toDate: '',
        deliveryFromDate: '',
        deliveryToDate: '',
        creationFromDate: '',
        creationToDate: '',
        inferredFromSelection: false
      };
    }

    const normalizedDates =
      orderDateValues.map(
        normalizeSelectedOrderDate
      );

    if (
      normalizedDates.some(
        (date) => date === ''
      )
    ) {
      return {
        allowed: false,
        message: 'Order Date pada data terpilih tidak lengkap. Pilih rentang Order Date maksimal 1 bulan terlebih dahulu.',
        fromDate: '',
        toDate: '',
        deliveryFromDate: '',
        deliveryToDate: '',
        creationFromDate: '',
        creationToDate: '',
        inferredFromSelection: false
      };
    }

    const sortedDates =
      [...normalizedDates].sort();

    const minDate =
      sortedDates[0] ?? '';

    const maxDate =
      sortedDates[
        sortedDates.length - 1
      ] ?? '';

    const minTime =
      parseDownloadIsoDate(minDate);

    const maxTime =
      parseDownloadIsoDate(maxDate);

    if (
      minTime === null ||
      maxTime === null
    ) {
      return {
        allowed: false,
        message: 'Order Date pada data terpilih tidak valid. Pilih rentang Order Date maksimal 1 bulan terlebih dahulu.',
        fromDate: '',
        toDate: '',
        deliveryFromDate: '',
        deliveryToDate: '',
        creationFromDate: '',
        creationToDate: '',
        inferredFromSelection: false
      };
    }

    const rangeDays =
      Math.floor(
        (maxTime - minTime) /
        86400000
      ) + 1;

    if (rangeDays > 31) {
      return {
        allowed: false,
        message: 'Data terpilih mencakup Order Date lebih dari 1 bulan. Pilih rentang Order Date maksimal 1 bulan terlebih dahulu.',
        fromDate: '',
        toDate: '',
        deliveryFromDate: '',
        deliveryToDate: '',
        creationFromDate: '',
        creationToDate: '',
        inferredFromSelection: false
      };
    }

    return {
      allowed: true,
      message: '',
      fromDate: minDate,
      toDate: maxDate,
      deliveryFromDate: '',
      deliveryToDate: '',
      creationFromDate: '',
      creationToDate: '',
      inferredFromSelection: true
    };
  };

  const validateRawDownloadScope =
    (): RawDownloadExportCustomer[] | null => {
      const dateError = validateDownloadDateFilters();

      if (dateError !== '') {
        notificationStore.showAlertWarning(dateError);
        return null;
      }

      const unsupported =
        getUnsupportedRawDownloadCustomers();

      if (unsupported.length > 0) {
        notificationStore.showAlertWarning(
          `Download Raw SO hanya tersedia untuk ADM P1, ADM P4, ADM P5, ASI ADM, TMMIN, NTC, GAYA MOTOR, DCWA, DPM, FTI, dan MES. Customer yang tidak didukung: ${unsupported.join(', ')}`
        );
        return null;
      }

      const customers =
        getRawDownloadExportCustomers();

      if (customers.length === 0) {
        notificationStore.showAlertWarning(
          'Tidak ada customer Raw SO yang dapat diproses untuk download.'
        );
        return null;
      }

      return customers;
    };

  const validateFormatSODownloadScope = (): DownloadExportCustomer[] | null => {
    const dateError = validateDownloadDateFilters();

    if (dateError !== '') {
      notificationStore.showAlertWarning(dateError);
      return null;
    }

    const unsupported = getUnsupportedDownloadCustomers();

    if (unsupported.length > 0) {
      notificationStore.showAlertWarning(
        `Download Raw/Format SO hanya tersedia untuk ADM P1, ADM P4, ADM P5, ASI ADM, TMMIN, NTC, GAYA MOTOR, DCWA, DPM, FTI, dan MES. Customer yang tidak didukung: ${unsupported.join(', ')}`
      );
      return null;
    }

    const customers = getDownloadExportCustomers();

    if (customers.length === 0) {
      notificationStore.showAlertWarning(
        'Tidak ada customer yang dapat diproses untuk download.'
      );
      return null;
    }

    return customers;
  };
  const getOptionalFilterParams =
    (): FilterParams => {
      syncTodayDate();

      const params:
        FilterParams = {};

      if (selectedCustomer.value) {
        params.customer =
          selectedCustomer.value;
      }

      if (fromDate.value) {
        params.from_date =
          fromDate.value;

        params.to_date =
          resolveOptionalToDate(
            fromDate.value,
            toDate.value,
            maxOrderDate.value
          );
      }

      if (deliveryFromDate.value) {
        params.delivery_from_date =
          deliveryFromDate.value;

        params.delivery_to_date =
          resolveOptionalToDate(
            deliveryFromDate.value,
            deliveryToDate.value,
            maxDeliveryDate.value
          );
      }

      if (creationFromDate.value) {
        params.creation_from_date =
          creationFromDate.value;

        params.creation_to_date =
          resolveOptionalToDate(
            creationFromDate.value,
            creationToDate.value,
            todayDate.value
          );
      }

      return params;
    };

  const getDateOnlyFilterParams =
    (): FilterParams => {
      syncTodayDate();

      const params:
        FilterParams = {};

      if (fromDate.value) {
        params.from_date =
          fromDate.value;

        params.to_date =
          resolveOptionalToDate(
            fromDate.value,
            toDate.value,
            maxOrderDate.value
          );
      }

      if (deliveryFromDate.value) {
        params.delivery_from_date =
          deliveryFromDate.value;

        params.delivery_to_date =
          resolveOptionalToDate(
            deliveryFromDate.value,
            deliveryToDate.value,
            maxDeliveryDate.value
          );
      }

      if (creationFromDate.value) {
        params.creation_from_date =
          creationFromDate.value;

        params.creation_to_date =
          resolveOptionalToDate(
            creationFromDate.value,
            creationToDate.value,
            todayDate.value
          );
      }

      return params;
    };

  const getTrackingDateFilterParams =
    (): FilterParams => {
      syncTodayDate();

      const params:
        FilterParams = {};

      if (fromDate.value) {
        params.from_date =
          fromDate.value;

        params.to_date =
          resolveOptionalToDate(
            fromDate.value,
            toDate.value,
            maxOrderDate.value
          );
      }

      if (deliveryFromDate.value) {
        params.delivery_from_date =
          deliveryFromDate.value;

        params.delivery_to_date =
          resolveOptionalToDate(
            deliveryFromDate.value,
            deliveryToDate.value,
            maxDeliveryDate.value
          );
      }

      /*
       * Tracking mengikuti seluruh filter tanggal utama:
       * - Order Date
       * - Delivery Date
       * - Creation Date
       *
       * Semua filter yang sedang aktif dikirim bersamaan ke backend.
       * Dengan demikian Tracking selalu sinkron dengan Raw Files dan
       * Format Sales Order, termasuk FTI Additional Order.
       */
      if (creationFromDate.value) {
        params.creation_from_date =
          creationFromDate.value;

        params.creation_to_date =
          resolveOptionalToDate(
            creationFromDate.value,
            creationToDate.value,
            todayDate.value
          );
      }

      return params;
    };


  const CUSTOMER_OPTIONS_REFRESH_TTL_MS = 5 * 60 * 1000;
  let customerOptionsLastLoadedAt = 0;
  let customerOptionsLoadPromise: Promise<void> | null = null;

  const loadCustomerOptions = async (force = false): Promise<void> => {
    const now = Date.now();

    if (
      !force &&
      customerOptionsLastLoadedAt > 0 &&
      now - customerOptionsLastLoadedAt < CUSTOMER_OPTIONS_REFRESH_TTL_MS
    ) {
      return;
    }

    if (customerOptionsLoadPromise) {
      return customerOptionsLoadPromise;
    }

    customerOptionsLoadPromise = (async () => {
      try {
        const options = await customerOrderService.getAvailableCustomers();

        // Customer yang didukung aplikasi selalu tersedia di dropdown.
        // Hasil backend hanya menambah/menyegarkan opsi, bukan membuat user
        // harus menunggu request sebelum dropdown dapat dibuka.
        const normalized = Array.from(
          new Set([
            ...RAW_DOWNLOAD_EXPORT_CUSTOMERS,
            ...options
              .map((customer) => String(customer ?? '').trim().toUpperCase())
              .filter(Boolean)
          ])
        );

        normalized.sort((first, second) =>
          first.localeCompare(second, 'id', {
            numeric: true,
            sensitivity: 'base'
          })
        );

        customerOptions.splice(0, customerOptions.length, ...normalized);
        customerOptionsLastLoadedAt = Date.now();

        const allowed = new Set<string>(customerOptions);

        if (selectedCustomers.value.length > 0) {
          selectedCustomers.value = selectedCustomers.value.filter((customer) =>
            allowed.has(customer)
          );
        }

        if (draftSelectedCustomers.value.length > 0) {
          draftSelectedCustomers.value = draftSelectedCustomers.value.filter((customer) =>
            allowed.has(customer)
          );
        }
      } catch (error) {
        // Opsi seed tetap dapat dipakai walaupun refresh API sedang gagal.
        console.error('Gagal menyegarkan pilihan Customer dari database:', error);
      } finally {
        customerOptionsLoadPromise = null;
      }
    })();

    return customerOptionsLoadPromise;
  };

  /*
  * ========================================================
  * MULTI CUSTOMER REQUEST
  * ========================================================
  *
  * 0 customer:
  *   request sekali tanpa customer
  *
  * 1 customer:
  *   request sekali
  *
  * >1 customer:
  *   request per customer secara paralel
  *   kemudian hasil digabung.
  */

  const isAllHeaderCustomersSelected =
    computed(() => {
      return (
        customerOptions.length > 0 &&
        draftSelectedCustomers.value.length ===
        customerOptions.length &&
        customerOptions.every(
          (customer) =>
            draftSelectedCustomers.value.includes(
              customer
            )
        )
      );
    });

  const loadBySelectedCustomers =
    async <T>(
      loader:
        (
          params: FilterParams
        ) => Promise<T[]>
    ): Promise<T[]> => {
      const customers =
        selectedCustomers.value;

      const baseParams =
        getDateOnlyFilterParams();

      /*
      * Kosong = All Customer.
      */
      if (customers.length === 0) {
        return loader(
          baseParams
        );
      }

      const results =
        await Promise.all(
          customers.map(
            (customer) => {
              return loader({
                ...baseParams,
                customer
              });
            }
          )
        );

      return results.flat();
    };

  /*
   * ADM P1 + P4 dimuat melalui request terpisah lalu digabung di frontend.
   * Promise.all mempertahankan urutan request, sehingga tanpa normalisasi
   * hasil P1 selalu berada sebelum P4 walaupun batch P4 baru saja diupload.
   *
   * Untuk scope gabungan P1/P4, jadikan upload_batch_id sebagai unit urutan.
   * Batch dengan ID row terbesar dianggap batch paling baru. Urutan row di
   * dalam batch tetap dipertahankan agar susunan item dari backend tidak rusak.
   */
  const isAdmP1P4CombinedSelection = (): boolean => {
    const normalized = new Set(
      selectedCustomers.value
        .map((customer) => String(customer ?? '').trim().toUpperCase())
        .filter(Boolean)
    );

    return (
      normalized.size === 2 &&
      normalized.has('ADM P1') &&
      normalized.has('ADM P4')
    );
  };

  const sortRowsByLatestUploadBatch = <T extends {
    id?: string | number | null;
    upload_batch_id?: string | null;
  }>(rows: T[]): T[] => {
    if (rows.length <= 1) {
      return [...rows];
    }

    const indexedRows = rows.map((row, index) => {
      const rowId = Number(row.id ?? 0);
      const batchId = String(row.upload_batch_id ?? '').trim();

      return {
        row,
        index,
        rowId: Number.isFinite(rowId) ? rowId : 0,
        batchKey: batchId !== ''
          ? `batch:${batchId}`
          : `row:${Number.isFinite(rowId) ? rowId : 0}:${index}`
      };
    });

    const latestIdByBatch = new Map<string, number>();

    indexedRows.forEach(({ batchKey, rowId }) => {
      latestIdByBatch.set(
        batchKey,
        Math.max(latestIdByBatch.get(batchKey) ?? 0, rowId)
      );
    });

    indexedRows.sort((first, second) => {
      const firstBatchId = latestIdByBatch.get(first.batchKey) ?? first.rowId;
      const secondBatchId = latestIdByBatch.get(second.batchKey) ?? second.rowId;

      if (firstBatchId !== secondBatchId) {
        return secondBatchId - firstBatchId;
      }

      // Stable order di dalam batch mengikuti urutan backend semula.
      return first.index - second.index;
    });

    return indexedRows.map(({ row }) => row);
  };
  watch(fromDate, (value: string) => {
    if (toDate.value && toDate.value < value) {
      toDate.value = value;
    }
  });

  watch(
    deliveryFromDate,
    (
      value:
        string
    ) => {
      if (
        deliveryToDate.value &&
        deliveryToDate.value <
        value
      ) {
        deliveryToDate.value =
          value;
      }
    }
  );
  watch(
    creationFromDate,
    (
      value:
        string
    ) => {
      if (
        creationToDate.value &&
        creationToDate.value <
        value
      ) {
        creationToDate.value =
          value;
      }
    }
  );
  const isHeaderCustomerSelected = (
    customer: string
  ): boolean => {
    return draftSelectedCustomers
      .value
      .includes(customer);
  };

  const toggleHeaderCustomerSelection = (
    customer: string
  ) => {
    const cleanCustomer =
      String(customer ?? '')
        .trim();

    if (!cleanCustomer) {
      return;
    }

    const current = [
      ...draftSelectedCustomers.value
    ];

    const index =
      current.indexOf(
        cleanCustomer
      );

    if (index >= 0) {
      /*
      * Sudah dipilih → hapus.
      */
      current.splice(
        index,
        1
      );
    } else {
      /*
      * Belum dipilih → tambah.
      */
      current.push(
        cleanCustomer
      );
    }

    draftSelectedCustomers.value =
      current;
  };

  const toggleAllHeaderCustomerSelection =
    () => {
      /*
      * Kalau semua sudah terpilih,
      * klik All Customer akan melepas semuanya.
      */
      if (
        isAllHeaderCustomersSelected.value
      ) {
        draftSelectedCustomers.value = [];

        return;
      }

      /*
      * Kalau belum semua terpilih,
      * pilih seluruh customer.
      */
      draftSelectedCustomers.value = [
        ...customerOptions
      ];
    };
  const formatDateExcel = (date: string | null | undefined): string => {
    if (!date)
      return '';
    const d = new Date(date);
    if (isNaN(d.getTime()))
      return date;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d.getDate()}-${months[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}`;
  };
  const formatTimeExcel = (time: string | null | undefined): string => {
    if (!time)
      return '';
    return time.substring(0, 5);
  };
  const getColumnWidthNumber = (width: string) => {
    return Number(width.replace('px', ''));
  };
  // ========================================================
  // USER MASTER & COLOR CONFIGURATION
  // ========================================================

  const userMaster: UserMaster[] = [
    { name: 'Adis', color: 'yellow' },
    { name: 'Aisyah', color: 'pink' },
    { name: 'Alfi', color: 'cyan' },
    { name: 'Fania', color: 'purple' },
    { name: 'Gema', color: 'blue' },
    { name: 'Manap', color: 'gray' },
    { name: 'Rizqi', color: 'orange' },
    { name: 'Sufri', color: 'red' },
    { name: 'Yamin', color: 'indigo' },
    { name: 'Yudha', color: 'emerald' }
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

  const uploadUserOptions = computed(() => {
    return userMaster.map((user) => user.name);
  });

  // Form upload tidak lagi menyediakan Pius maupun pilihan bebas "Lainnya".
  const uploadFormUserOptions = computed(() => {
    return [...uploadUserOptions.value];
  });
  const getUserColor = (name: string) => {
    const normalizedName = String(name ?? '')
      .trim()
      .toLowerCase();
    const user = userMaster.find((item) => {
      return (item.name
        .trim()
        .toLowerCase() ===
        normalizedName);
    });
    return user?.color ?? 'gray';
  };
  const userColorClass = (name: string): string => {
    const color = getUserColor(name);
    const classes: Record<string, string> = {
      yellow: 'bg-yellow-100! text-yellow-800! border-yellow-200! hover:bg-yellow-100!',
      pink: 'bg-pink-100! text-pink-700! border-pink-200! hover:bg-pink-100!',
      cyan: 'bg-cyan-100! text-cyan-700! border-cyan-200! hover:bg-cyan-100!',
      purple: 'bg-purple-100! text-purple-700! border-purple-200! hover:bg-purple-100!',
      blue: 'bg-blue-100! text-blue-700! border-blue-200! hover:bg-blue-100!',
      gray: 'bg-gray-100! text-gray-700! border-gray-200! hover:bg-gray-100!',
      green: 'bg-green-100! text-green-700! border-green-200! hover:bg-green-100!',
      orange: 'bg-orange-100! text-orange-700! border-orange-200! hover:bg-orange-100!',
      red: 'bg-red-100! text-red-700! border-red-200! hover:bg-red-100!',
      indigo: 'bg-indigo-100! text-indigo-700! border-indigo-200! hover:bg-indigo-100!',
      emerald: 'bg-emerald-200! text-emerald-900! border-emerald-300! hover:bg-emerald-200!'
    };
    return (classes[color] ??
      classes.gray);
  };
  const colorLabels: Record<ColorKey, string> = {
    normal: 'Normal',
    yellow: 'Kuning',
    pink: 'Pink',
    cyan: 'Biru Muda',
    purple: 'Ungu',
    blue: 'Biru',
    gray: 'Abu-abu',
    green: 'Hijau',
    orange: 'Oranye',
    red: 'Merah',
    indigo: 'Indigo',
    emerald: 'Emerald'
  };
  const colorDotClass = (color: ColorKey): string => {
    const classes: Record<ColorKey, string> = {
      normal: 'bg-white',
      yellow: 'bg-yellow-200',
      pink: 'bg-pink-200',
      cyan: 'bg-cyan-200',
      purple: 'bg-purple-200',
      blue: 'bg-blue-200',
      gray: 'bg-gray-200',
      green: 'bg-green-200',
      orange: 'bg-orange-200',
      red: 'bg-red-200',
      indigo: 'bg-indigo-200',
      emerald: 'bg-emerald-200'
    };
    return classes[color];
  };
  // ========================================================
  // UPLOAD FORM & EXCEL PREVIEW
  // ========================================================
  const showUploadModal = ref(false);
  const selectedCustomerUpload = ref('');

  // ========================================================
  // UPLOAD DELIVERY PERIOD
  // ========================================================
  // Bulan upload hanya menjadi guard.
  // ADM memakai Delivery Date; TMMIN memakai 6 digit awal nomor PO (YYYYMM).
  const getCurrentUploadPeriod = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    return `${year}-${month}`;
  };

  const selectedUploadPeriod = ref(getCurrentUploadPeriod());

  const selectedUploadPeriodLabel = computed(() => {
    const raw = String(selectedUploadPeriod.value ?? '').trim();

    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(raw)) {
      return '';
    }

    const [year, month] = raw.split('-');

    return new Intl.DateTimeFormat('id-ID', {
      month: 'long',
      year: 'numeric'
    }).format(new Date(Number(year), Number(month) - 1, 1));
  });

  type UploadDeliveryPeriodOption = {
    period: string;
    label: string;
    count: number;
  };

  const uploadDeliveryPeriodOptions =
    ref<UploadDeliveryPeriodOption[]>([]);

  const showUploadDeliveryPeriodChoice =
    ref(false);

  const pendingUploadPeriod =
    ref('');

  const isAnalyzingUploadPeriods =
    ref(false);

  const selectedUploadPeriodCount =
    computed(() => {
      const option =
        uploadDeliveryPeriodOptions.value
          .find(
            (item) =>
              item.period ===
              selectedUploadPeriod.value
          );

      return option?.count ?? 0;
    });

  const hasDetectedUploadPeriods =
    computed(
      () =>
        uploadDeliveryPeriodOptions.value.length > 0
    );

  const hasMultipleUploadPeriods =
    computed(
      () =>
        uploadDeliveryPeriodOptions.value.length > 1
    );

  const isSelectedUploadPeriodAvailable =
    computed(() => {
      if (
        uploadDeliveryPeriodOptions.value.length === 0
      ) {
        return true;
      }

      return uploadDeliveryPeriodOptions.value
        .some(
          (item) =>
            item.period ===
            selectedUploadPeriod.value
        );
    });

  const showCustomerDropdown = ref(false);
  const showUploadUserDropdown = ref(false);
  const selectedUploadUser = ref('');

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
    showUploadUserDropdown.value = false;

    if (canSelectUploadUser.value) {
      if (!uploadUserOptions.value.includes(selectedUploadUser.value)) {
        selectedUploadUser.value = '';
      }
      return;
    }

    selectedUploadUser.value = mappedUploadUser.value;
  };

  watch(
    [loggedInUploadUsername, loggedInUploadFullname],
    () => syncUploadUserFromLogin(),
    { immediate: true }
  );

  const excelPassword = ref('');
  const hasExcelPassword = computed(() => {
    return excelPassword.value.trim().length > 0;
  });

  // Naik setiap kali password berubah. Request preview ADM menyimpan versi ini
  // supaya response dari password lama/parsial dapat diabaikan tanpa toast palsu.
  let admPreviewPasswordVersion = 0;
  type TmminDetectedTxtFile = {
    key: string;
    name: string;
    archiveName: string;
    entryName: string;
  };

  const tmminSoDetectedTxtFiles =
    ref<TmminDetectedTxtFile[]>([]);

  const tmminSoExcludedTxtEntries =
    ref<string[]>([]);

  // Sama dengan backend Stage 3. Frontend hanya menjaga source file;
  // ukuran TXT hasil extract ZIP/RAR tetap divalidasi ulang oleh server.
  const TMMIN_MAX_UPLOAD_SOURCE_FILES = 20;
  const TMMIN_MAX_UPLOAD_SOURCE_BYTES = 20 * 1024 * 1024;
  const TMMIN_MAX_UPLOAD_TOTAL_BYTES = 50 * 1024 * 1024;

  const canOpenUploadPreview = computed(() => {
    if (isDcwaSoUpload.value) {
      return (
        dcwaSoUploadFiles.value.some((file) => /\.pdf$/i.test(file.name)) &&
        !isPreviewLoading.value &&
        !isAnalyzingUploadPeriods.value
      );
    }

    if (isAsiAdmSoUpload.value) {
      return (
        asiAdmSoUploadFiles.value.length > 0 &&
        asiAdmDetectedOrderType.value !== '' &&
        !isInspectingAsiAdmFiles.value &&
        !isPreviewLoading.value &&
        !isAnalyzingUploadPeriods.value
      );
    }

    if (isGayaSoUpload.value) {
      return (
        gayaSoUploadFiles.value.length > 0 &&
        !isPreviewLoading.value &&
        !isAnalyzingUploadPeriods.value
      );
    }

    if (isMesSoUpload.value) {
      return mesSoUploadFiles.value.length > 0 && !isPreviewLoading.value;
    }

    if (isFtiSoUpload.value) {
      if (ftiAdditionalOrderEnabled.value) {
        if (ftiAdditionalOrderMode.value === 'MANUAL') {
          return (
            /^\d{4}-(0[1-9]|1[0-2])$/.test(selectedUploadPeriod.value) &&
            isFtiAdditionalManualPoNumberValid.value &&
            hasFtiAdditionalManualQty.value &&
            !isPreviewLoading.value &&
            !isLoadingFtiAdditionalManualParts.value
          );
        }
        return ftiAdditionalOrderFile.value !== null && !isPreviewLoading.value;
      }
      return !isPreviewLoading.value && /^\d{4}-(0[1-9]|1[0-2])$/.test(selectedUploadPeriod.value);
    }

    if (isDpmSoUpload.value) {
      return dpmSoUploadFiles.value.length > 0 && !isPreviewLoading.value;
    }

    if (isNtcSoUpload.value) {
      return (
        ntcSoUploadFiles.value.length > 0 &&
        !isPreviewLoading.value &&
        !isAnalyzingUploadPeriods.value
      );
    }

    if (isTmminSoUpload.value) {
      return (
        tmminSoUploadFiles.value.length > 0 &&
        tmminSoDetectedTxtFiles.value.length > 0 &&
        !isPreviewLoading.value &&
        !isAnalyzingUploadPeriods.value
      );
    }

    if (!uploadFiles.value) {
      return false;
    }

    if (
      showExcelPasswordInput.value &&
      !hasExcelPassword.value
    ) {
      return false;
    }

    return (
      !isPreviewLoading.value &&
      !isAnalyzingUploadPeriods.value
    );
  });
  const showExcelPassword = ref(false);
  const uploadFiles = ref<File | null>(null);
  const admUploadFiles = ref<File[]>([]);
  const tmminSoUploadFiles = ref<File[]>([]);
  const ntcSoUploadFiles = ref<File[]>([]);
  const dpmSoUploadFiles = ref<File[]>([]);
  const gayaSoUploadFiles = ref<File[]>([]);
  const mesSoUploadFiles = ref<File[]>([]);
  const asiAdmSoUploadFiles = ref<File[]>([]);
  const asiAdmDetectedOrderType = ref<AsiAdmRawSoOrderType | ''>('');
  const asiAdmServicePartDeliveryDate = ref('');
  const asiAdmFileTypes = ref<Array<{
    file_name: string;
    order_type: string;
    total_items: number;
  }>>([]);
  const isInspectingAsiAdmFiles = ref(false);

  type MissingContractPartGroup = {
    customer: string;
    revision: number | null;
    parts: string[];
    contractDocuments?: string[];
  };

  const showMissingContractPartsModal = ref(false);
  const missingContractPartsPeriod = ref('');
  const missingContractPartGroups = ref<MissingContractPartGroup[]>([]);
  const isValidatingPreviewContractParts = ref(false);
  const missingContractPartsCopied = ref(false);
  let missingContractPartsCopiedTimer: ReturnType<typeof setTimeout> | null = null;

  const resetMissingContractPartsCopiedState = (): void => {
    missingContractPartsCopied.value = false;

    if (missingContractPartsCopiedTimer !== null) {
      clearTimeout(missingContractPartsCopiedTimer);
      missingContractPartsCopiedTimer = null;
    }
  };

  const missingContractParts = computed<string[]>(() => {
    const result = new Set<string>();

    missingContractPartGroups.value.forEach((group) => {
      group.parts.forEach((part) => {
        const value = String(part ?? '').trim().toUpperCase();
        if (value !== '') result.add(value);
      });
    });

    return Array.from(result);
  });

  const dcwaSoUploadFiles = ref<File[]>([]);
  const uploadFileName = ref('');

  const isDcwaSoUpload =
    computed(() => {
      return selectedCustomerUpload
        .value
        .trim()
        .toUpperCase() ===
        'DCWA';
    });

  const isAsiAdmSoUpload =
    computed(() => {
      return selectedCustomerUpload
        .value
        .trim()
        .toUpperCase() ===
        'ASI ADM';
    });

  const isGayaSoUpload =
    computed(() => {
      return selectedCustomerUpload
        .value
        .trim()
        .toUpperCase() ===
        'GAYA MTR';
    });

  const isNtcSoUpload =
    computed(() => {
      return selectedCustomerUpload
        .value
        .trim()
        .toUpperCase() ===
        'NTC';
    });

  const isDpmSoUpload =
    computed(() => {
      return selectedCustomerUpload.value.trim().toUpperCase() === 'DPM';
    });

  const isFtiSoUpload =
    computed(() => {
      return selectedCustomerUpload.value.trim().toUpperCase() === 'FTI';
    });

  const isMesSoUpload =
    computed(() => {
      return selectedCustomerUpload.value.trim().toUpperCase() === 'MES';
    });


  // ============================================================
  // FTI ADDITIONAL ORDER - OPTIONAL PDF FLOW
  // ============================================================
  const ftiAdditionalOrderEnabled = ref(false);
  const ftiAdditionalOrderMode = ref<FtiAdditionalOrderMode>('MANUAL');
  const ftiAdditionalOrderFile = ref<File | null>(null);
  const ftiAdditionalOrderPreview = ref<FtiAdditionalOrderPreview | null>(null);
  const showFtiAdditionalOrderPreview = ref(false);
  /*
   * Preview schedule Additional Order hanya bersifat draft sampai user
   * menekan "Konfirmasi Schedule". Generate Raw/Format SO/Tracking baru
   * dilakukan saat tombol Submit pada Upload Form utama ditekan.
   */
  const ftiAdditionalOrderScheduleConfirmed = ref(false);
  const ftiAdditionalOrderAllocationDrafts = ref<Record<string, Record<string, number>>>({});
  const ftiAdditionalManualParts = ref<FtiAdditionalManualPart[]>([]);
  const ftiAdditionalManualPoNumber = ref('');

  /*
   * PO Number FTI normalnya 10 digit. User tetap bisa mengetik bertahap,
   * tetapi Preview/Submit belum aktif sebelum tepat 10 digit.
   */
  const ftiAdditionalManualPoNumberLength = computed(
    () => ftiAdditionalManualPoNumber.value.length
  );

  const isFtiAdditionalManualPoNumberValid = computed(
    () => /^\d{10}$/.test(ftiAdditionalManualPoNumber.value)
  );

  const ftiAdditionalManualPoNumberWarning = computed((): string => {
    const length = ftiAdditionalManualPoNumberLength.value;

    if (length === 0) {
      return '';
    }

    if (length < 10) {
      return `PO Number FTI belum lengkap (${length}/10 digit).`;
    }

    return '';
  });

  const ftiAdditionalManualQtyDrafts = ref<Record<string, number>>({});
  const isLoadingFtiAdditionalManualParts = ref(false);

  const resetFtiAdditionalOrderState = (disableMode = true): void => {
    if (disableMode) {
      ftiAdditionalOrderEnabled.value = false;
    }
    ftiAdditionalOrderMode.value = 'MANUAL';
    ftiAdditionalOrderFile.value = null;
    ftiAdditionalOrderPreview.value = null;
    showFtiAdditionalOrderPreview.value = false;
    ftiAdditionalOrderScheduleConfirmed.value = false;
    ftiAdditionalOrderAllocationDrafts.value = {};
    ftiAdditionalManualParts.value = [];
    ftiAdditionalManualPoNumber.value = '';
    ftiAdditionalManualQtyDrafts.value = {};
    isLoadingFtiAdditionalManualParts.value = false;
  };

  const toggleFtiAdditionalOrder = (): void => {
    const next = !ftiAdditionalOrderEnabled.value;
    resetFtiAdditionalOrderState(false);
    ftiAdditionalOrderEnabled.value = next;

    if (next) {
      ftiAdditionalOrderMode.value = 'MANUAL';
      ftiRawSoPreviewRows.value = [];
      ftiRawSoPreviewSummary.value = null;
      showFtiRawSoPreview.value = false;
      void loadFtiAdditionalManualParts();
    }
  };

  const setFtiAdditionalOrderFile = (file: File | null): void => {
    ftiAdditionalOrderPreview.value = null;
    showFtiAdditionalOrderPreview.value = false;
    ftiAdditionalOrderScheduleConfirmed.value = false;
    ftiAdditionalOrderAllocationDrafts.value = {};

    if (!file) {
      ftiAdditionalOrderFile.value = null;
      return;
    }

    if (!/\.pdf$/i.test(file.name)) {
      ftiAdditionalOrderFile.value = null;
      notificationStore.showAlertWarning('Additional Order FTI hanya menerima file PDF.');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      ftiAdditionalOrderFile.value = null;
      notificationStore.showAlertWarning('Ukuran PDF Additional Order maksimal 20 MB.');
      return;
    }

    ftiAdditionalOrderFile.value = file;
  };

  const buildFtiAdditionalManualItems = (): FtiAdditionalManualInputItem[] => {
    return ftiAdditionalManualParts.value
      .map((part) => ({
        part_no: part.part_no,
        qty: Math.max(0, Number(ftiAdditionalManualQtyDrafts.value[part.part_no] ?? 0))
      }))
      .filter((item) => item.qty > 0);
  };

  const hasFtiAdditionalManualQty = computed(() =>
    buildFtiAdditionalManualItems().length > 0
  );

  const setFtiAdditionalManualPoNumber = (value: string): void => {
    ftiAdditionalManualPoNumber.value = String(value ?? '')
      .replace(/\D/g, '')
      .slice(0, 10);

    ftiAdditionalOrderPreview.value = null;
    showFtiAdditionalOrderPreview.value = false;
    ftiAdditionalOrderScheduleConfirmed.value = false;
    ftiAdditionalOrderAllocationDrafts.value = {};
  };

  const setFtiAdditionalManualQty = (partNo: string, value: string | number): void => {
    const numeric = Number(value);
    ftiAdditionalManualQtyDrafts.value = {
      ...ftiAdditionalManualQtyDrafts.value,
      [partNo]: Number.isFinite(numeric) ? Math.max(0, numeric) : 0
    };
    ftiAdditionalOrderPreview.value = null;
    showFtiAdditionalOrderPreview.value = false;
    ftiAdditionalOrderScheduleConfirmed.value = false;
    ftiAdditionalOrderAllocationDrafts.value = {};
  };

  const loadFtiAdditionalManualParts = async (): Promise<boolean> => {
    const period = String(selectedUploadPeriod.value ?? '').trim();
    if (!ftiAdditionalOrderEnabled.value || ftiAdditionalOrderMode.value !== 'MANUAL') {
      return false;
    }
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) {
      ftiAdditionalManualParts.value = [];
      return false;
    }

    try {
      isLoadingFtiAdditionalManualParts.value = true;
      const response = await customerOrderService.getFtiAdditionalManualOptions(period);
      if (response.status !== 'success') {
        throw new Error(response.message || 'Part MDFO FTI tidak dapat dimuat');
      }

      const previousDrafts = { ...ftiAdditionalManualQtyDrafts.value };
      ftiAdditionalManualParts.value = Array.isArray(response.parts) ? response.parts : [];
      ftiAdditionalManualQtyDrafts.value = ftiAdditionalManualParts.value.reduce(
        (result, part) => {
          result[part.part_no] = Math.max(0, Number(previousDrafts[part.part_no] ?? 0));
          return result;
        },
        {} as Record<string, number>
      );
      return true;
    } catch (error: any) {
      ftiAdditionalManualParts.value = [];
      notificationStore.showAlertWarning(
        error?.response?.data?.message || error?.message || 'Part MDFO FTI tidak dapat dimuat'
      );
      return false;
    } finally {
      isLoadingFtiAdditionalManualParts.value = false;
    }
  };

  const setFtiAdditionalOrderMode = async (mode: FtiAdditionalOrderMode): Promise<void> => {
    if (ftiAdditionalOrderMode.value === mode) return;

    ftiAdditionalOrderMode.value = mode;
    ftiAdditionalOrderPreview.value = null;
    showFtiAdditionalOrderPreview.value = false;
    ftiAdditionalOrderScheduleConfirmed.value = false;
    ftiAdditionalOrderAllocationDrafts.value = {};

    if (mode === 'MANUAL') {
      ftiAdditionalOrderFile.value = null;
      await loadFtiAdditionalManualParts();
    }
  };

  const isTmminSoUpload =
    computed(() => {
      return selectedCustomerUpload
        .value
        .trim()
        .toUpperCase() ===
        'TMMIN';
    });
  const showUploadPreview = ref(false);
  const isPreviewLoading = ref(false);
  const isUploading = ref(false);

  // ========================================================
  // CONTRACT MATERIAL CHOICE
  // ========================================================
  // 57147-BZ010-00 dan 57147-BZ010-00. adalah dua Part Number
  // berbeda. Jika keduanya tersedia pada Contract, backend akan
  // meminta user memilih material yang akan dipakai oleh order.
  type ContractMaterialChoiceItem = {
    key: string;
    contract_document: string;
    source_material: string;
    options: string[];
    order_no?: string;
    part_name?: string;
    manifest?: string;
    job_no?: string;
  };

  const showContractMaterialChoiceModal = ref(false);
  const contractMaterialChoiceItems = ref<ContractMaterialChoiceItem[]>([]);
  const contractMaterialSelections = ref<Record<string, string>>({});
  const contractMaterialChoiceMessage = ref('');

  // File ADM yang sudah berhasil diproses pada satu sesi modal
  // tidak diupload ulang ketika user selesai memilih material.
  const completedAdmUploadFileKeys = new Set<string>();

  const getUploadFileIdentity = (file: File): string => {
    return [file.name, file.size, file.lastModified].join('::');
  };

  const resetContractMaterialChoices = () => {
    showContractMaterialChoiceModal.value = false;
    contractMaterialChoiceItems.value = [];
    contractMaterialSelections.value = {};
    contractMaterialChoiceMessage.value = '';
  };

  /*
   * Material choice dan partial-upload marker hanya valid selama context
   * customer + periode + kumpulan file yang sama. Saat context berubah,
   * pilihan Contract lama tidak boleh diam-diam dipakai pada upload berikutnya.
   *
   * Khusus ADM, saat user hanya menambah/menghapus file pada sesi partial
   * upload yang sama, file yang memang sudah sukses tetap dipertahankan selama
   * file tersebut masih ada di daftar aktif. Dengan begitu File A tidak
   * diupload ulang hanya karena File B meminta material choice.
   */
  const syncCompletedAdmUploadFileKeys = (): void => {
    const activeKeys = new Set(
      admUploadFiles.value.map((file) => getUploadFileIdentity(file))
    );

    completedAdmUploadFileKeys.forEach((key) => {
      if (!activeKeys.has(key)) {
        completedAdmUploadFileKeys.delete(key);
      }
    });
  };

  const resetUploadSessionState = (
    preserveCompletedAdmFiles = false
  ): void => {
    resetContractMaterialChoices();

    if (preserveCompletedAdmFiles) {
      syncCompletedAdmUploadFileKeys();
      return;
    }

    completedAdmUploadFileKeys.clear();
  };

  const openContractMaterialChoice = (response: any): boolean => {
    if (response?.status !== 'material_choice_required') {
      return false;
    }

    const rows = Array.isArray(response?.choices)
      ? response.choices
      : [];

    contractMaterialChoiceItems.value = rows
      .map((item: any) => ({
        key: String(item?.key ?? '').trim(),
        contract_document: String(item?.contract_document ?? '').trim(),
        source_material: String(item?.source_material ?? '').trim(),
        options: Array.isArray(item?.options)
          ? item.options.map((value: any) => String(value ?? '').trim()).filter(Boolean)
          : [],
        order_no: String(item?.order_no ?? '').trim(),
        part_name: String(item?.part_name ?? '').trim(),
        manifest: String(item?.manifest ?? '').trim(),
        job_no: String(item?.job_no ?? '').trim()
      }))
      .filter((item: ContractMaterialChoiceItem) => item.key !== '' && item.options.length > 1);

    if (contractMaterialChoiceItems.value.length === 0) {
      return false;
    }

    // Pertahankan pilihan yang masih valid jika response muncul lagi.
    const nextSelections: Record<string, string> = {};

    contractMaterialChoiceItems.value.forEach((item) => {
      const previous = contractMaterialSelections.value[item.key];

      if (previous && item.options.includes(previous)) {
        nextSelections[item.key] = previous;
      }
    });

    contractMaterialSelections.value = nextSelections;
    contractMaterialChoiceMessage.value = String(
      response?.message ??
      'Pilih Part Number Contract yang akan digunakan pada order.'
    );
    showContractMaterialChoiceModal.value = true;
    return true;
  };

  const selectContractMaterialChoice = (
    key: string,
    material: string
  ) => {
    const item = contractMaterialChoiceItems.value.find(
      (row) => row.key === key
    );

    if (!item || !item.options.includes(material)) {
      return;
    }

    contractMaterialSelections.value = {
      ...contractMaterialSelections.value,
      [key]: material
    };
  };

  const isContractMaterialChoiceSelected = (
    key: string,
    material: string
  ): boolean => {
    return contractMaterialSelections.value[key] === material;
  };

  const canConfirmContractMaterialChoice = computed(() => {
    return (
      contractMaterialChoiceItems.value.length > 0 &&
      contractMaterialChoiceItems.value.every(
        (item) =>
          Boolean(contractMaterialSelections.value[item.key]) &&
          item.options.includes(contractMaterialSelections.value[item.key])
      )
    );
  });

  const closeContractMaterialChoice = () => {
    showContractMaterialChoiceModal.value = false;
  };
  const excelWorkbook = ref<XLSX.WorkBook | null>(null);
  const excelSheetNames = ref<string[]>([]);
  const selectedExcelSheet = ref('');
  const excelPreviewHeaders = ref<string[]>([]);
  const excelPreviewRows = ref<ExcelCell[][]>([]);
  const excelPreviewError = ref('');

  /*
   * Summary preview berasal dari backend agar total quantity/row
   * dihitung dari seluruh data periode terpilih, bukan hanya
   * maksimal 100 row yang dirender pada tabel preview.
   */
  const admUploadPreviewSummaryByPlant =
    ref<Record<string, any>>({});

  const tmminUploadPreviewSummary =
    ref<Record<string, any>>({});

  const ntcUploadPreviewSummaryBySite =
    ref<NtcRawSoSiteSummary[]>([]);
  const showExcelPasswordInput = computed(() => {
    return ENCRYPTED_ORDER_CUSTOMERS.has(selectedCustomerUpload.value
      .trim()
      .toUpperCase());
  });

  const isStaleAdmPasswordAttempt = (
    version: number,
    passwordSnapshot: string
  ): boolean => {
    return (
      showExcelPasswordInput.value &&
      (
        version !== admPreviewPasswordVersion ||
        passwordSnapshot !== excelPassword.value
      )
    );
  };
  const excelColumnCount = computed(() => {
    return excelPreviewRows.value.reduce((max, row) => {
      return Math.max(max, row.length);
    }, 0);
  });
  const normalizedExcelPreviewRows = computed(() => {
    return excelPreviewRows.value.map((row) => {
      return Array.from({ length: excelColumnCount.value }, (_, index) => {
        return row[index] ?? '';
      });
    });
  });
  const finalUploadUser = computed(() => selectedUploadUser.value);
  const validateCustomerBeforeChooseFile = (): boolean => {
    if (selectedCustomerUpload.value.trim() !== '') {
      return true;
    }
    notificationStore.showAlertWarning('Pilih Customer terlebih dahulu sebelum memilih file Excel');
    return false;
  };
  const openUploadModal = () => {
    if (!requireUploadSoPermission('create')) {
      return;
    }

    /*
    * Kalau Customer header / Date / Filter
    * sedang terbuka, tutup semuanya dahulu.
    */
    closeAllPopups();
    showUploadModal.value =
      true;
  };
  const closeUploadModal = () => {
    showUploadDeliveryPeriodChoice.value = false;
    showUploadModal.value =
      false;
    closeAllPopups();
  };
  const selectCustomerUpload = (customer: string) => {
    selectedCustomerUpload.value =
      customer;
    /*
    * Tutup dropdown/popup sesudah memilih.
    */
    closeAllPopups();
    formatSOCurrentPage.value =
      1;
  };
  const selectUploadUser = (user: string) => {
    if (!canSelectUploadUser.value) {
      syncUploadUserFromLogin();
      closeAllPopups();
      return;
    }

    const normalizedUser = String(user ?? '').trim();
    selectedUploadUser.value = uploadUserOptions.value.includes(normalizedUser)
      ? normalizedUser
      : '';
    closeAllPopups();
  };
  watch(selectedCustomerUpload, (value: string) => {
    const normalizedCustomer = value.trim().toUpperCase();

    // Customer baru = context upload baru. Jangan bawa pilihan material atau
    // marker partial upload dari customer sebelumnya.
    resetUploadSessionState(false);

    // Additional Order FTI tidak boleh terbawa saat customer diganti.
    // File/preview lama dapat menjadi stale terhadap customer/periode berikutnya.
    resetFtiAdditionalOrderState(true);

    dpmSoUploadFiles.value = [];
    dpmRawSoPreviewRows.value = [];
    dpmRawSoPreviewSummary.value = null;
    dpmRawSoContractValidation.value = null;
    mesSoUploadFiles.value = [];
    mesRawSoPreviewRows.value = [];
    mesRawSoPreviewSummary.value = null;
    mesPartNameConflicts.value = [];
    mesPartNameChoices.value = {};
    showMesRawSoPreview.value = false;
    resetDpmRawSoDuplicateState();
    resetDpmSalesDocumentChoice();

    selectedUploadPeriod.value = getCurrentUploadPeriod();

    if (!ENCRYPTED_ORDER_CUSTOMERS.has(normalizedCustomer)) {
      excelPassword.value = '';
      showExcelPassword.value = false;
    }

    /*
     * File dari mode lain tidak dibawa saat customer diganti.
     * ADM dan TMMIN mempunyai parser berbeda.
     */
    if (normalizedCustomer === 'TMMIN') {
      admUploadFiles.value = [];
      ntcSoUploadFiles.value = [];
      gayaSoUploadFiles.value = [];
      asiAdmSoUploadFiles.value = [];
      dcwaSoUploadFiles.value = [];
      tmminSoDetectedTxtFiles.value = [];
      tmminSoExcludedTxtEntries.value = [];
    } else if (normalizedCustomer === 'NTC') {
      admUploadFiles.value = [];
      tmminSoUploadFiles.value = [];
      ntcSoUploadFiles.value = [];
      gayaSoUploadFiles.value = [];
      asiAdmSoUploadFiles.value = [];
      dcwaSoUploadFiles.value = [];
      tmminSoDetectedTxtFiles.value = [];
      tmminSoExcludedTxtEntries.value = [];
    } else if (normalizedCustomer === 'ASI ADM') {
      admUploadFiles.value = [];
      tmminSoUploadFiles.value = [];
      ntcSoUploadFiles.value = [];
      gayaSoUploadFiles.value = [];
      asiAdmSoUploadFiles.value = [];
      dcwaSoUploadFiles.value = [];
      tmminSoDetectedTxtFiles.value = [];
      tmminSoExcludedTxtEntries.value = [];
    } else if (normalizedCustomer === 'GAYA MTR') {
      admUploadFiles.value = [];
      tmminSoUploadFiles.value = [];
      ntcSoUploadFiles.value = [];
      gayaSoUploadFiles.value = [];
      asiAdmSoUploadFiles.value = [];
      dcwaSoUploadFiles.value = [];
      tmminSoDetectedTxtFiles.value = [];
      tmminSoExcludedTxtEntries.value = [];
    } else if (normalizedCustomer === 'DCWA') {
      admUploadFiles.value = [];
      tmminSoUploadFiles.value = [];
      ntcSoUploadFiles.value = [];
      gayaSoUploadFiles.value = [];
      asiAdmSoUploadFiles.value = [];
      dcwaSoUploadFiles.value = [];
      tmminSoDetectedTxtFiles.value = [];
      tmminSoExcludedTxtEntries.value = [];
    } else {
      tmminSoUploadFiles.value = [];
      ntcSoUploadFiles.value = [];
      gayaSoUploadFiles.value = [];
      asiAdmSoUploadFiles.value = [];
      dcwaSoUploadFiles.value = [];
      tmminSoDetectedTxtFiles.value = [];
      tmminSoExcludedTxtEntries.value = [];
    }

    asiAdmDetectedOrderType.value = '';
    asiAdmServicePartDeliveryDate.value = '';
    asiAdmFileTypes.value = [];
    isInspectingAsiAdmFiles.value = false;
    showMissingContractPartsModal.value = false;
    missingContractPartsPeriod.value = '';
    missingContractPartGroups.value = [];

    resetUploadDeliveryPeriodDetection();
    uploadFiles.value = null;
    uploadFileName.value = '';
    resetDcwaRawSoPreview();
    resetExcelPreviewState();
  });

  watch(selectedUploadPeriod, (value, previous) => {
    if (value === previous) {
      return;
    }

    // Material choice memakai Contract/Reference Document yang period-sensitive.
    // Begitu bulan berubah, seluruh pilihan lama wajib dihitung ulang.
    resetUploadSessionState(false);
  });

  const resetExcelPreviewState = () => {
    excelWorkbook.value = null;
    excelSheetNames.value = [];
    selectedExcelSheet.value = '';
    excelPreviewHeaders.value = [];
    excelPreviewRows.value = [];
    excelPreviewError.value = '';
    admUploadPreviewSummaryByPlant.value = {};
    tmminUploadPreviewSummary.value = {};
    ntcUploadPreviewSummaryBySite.value = [];
    gayaUploadPreviewSummary.value = null;
    gayaRawSoPreviewRows.value = [];
    gayaRawSoActivePreviewFile.value = '';
    asiAdmRawSoPreviewRows.value = [];
    asiAdmRawSoPreviewSummary.value = null;
    asiAdmRawSoPreviewErrors.value = [];
    asiAdmRawSoCanSubmitPreview.value = false;
    showMissingContractPartsModal.value = false;
    missingContractPartsPeriod.value = '';
    missingContractPartGroups.value = [];
  };
  const resetUploadDeliveryPeriodDetection = () => {
    uploadDeliveryPeriodOptions.value = [];
    showUploadDeliveryPeriodChoice.value = false;
    pendingUploadPeriod.value = '';
  };

  /*
   * Password tidak lagi memicu scan saat blur.
   * Perubahan password hanya membatalkan cache preview supaya
   * satu klik Preview memakai password terbaru.
   */
  watch(excelPassword, () => {
    if (!showExcelPasswordInput.value) {
      return;
    }

    admPreviewPasswordVersion += 1;
    resetUploadDeliveryPeriodDetection();
    resetExcelPreviewState();
  });

  const normalizeUploadDeliveryPeriodOptions = (
    value: unknown
  ): UploadDeliveryPeriodOption[] => {
    if (!Array.isArray(value)) {
      return [];
    }

    const map =
      new Map<string, UploadDeliveryPeriodOption>();

    value.forEach((item: any) => {
      const period =
        String(item?.period ?? '').trim();

      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) {
        return;
      }

      const count =
        Math.max(
          0,
          Number(item?.count ?? 0) || 0
        );

      const label =
        String(item?.label ?? '').trim() ||
        (() => {
          const [year, month] = period.split('-');

          return new Intl.DateTimeFormat('id-ID', {
            month: 'long',
            year: 'numeric'
          }).format(
            new Date(
              Number(year),
              Number(month) - 1,
              1
            )
          );
        })();

      const existing = map.get(period);

      map.set(period, {
        period,
        label,
        count:
          (existing?.count ?? 0) + count
      });
    });

    return Array.from(map.values())
      .sort(
        (a, b) =>
          a.period.localeCompare(b.period)
      );
  };

  const setDetectedUploadPeriods = (
    options: UploadDeliveryPeriodOption[],
    openChoice = true
  ): boolean => {
    uploadDeliveryPeriodOptions.value =
      normalizeUploadDeliveryPeriodOptions(options);

    const detected =
      uploadDeliveryPeriodOptions.value;

    if (detected.length === 0) {
      showUploadDeliveryPeriodChoice.value = false;
      pendingUploadPeriod.value = '';
      return false;
    }

    /*
     * Jika hanya ada satu bulan, gunakan langsung.
     * User tidak perlu memilih / konfirmasi bulan lagi.
     */
    if (detected.length === 1) {
      selectedUploadPeriod.value =
        detected[0].period;

      pendingUploadPeriod.value =
        detected[0].period;

      showUploadDeliveryPeriodChoice.value = false;

      return true;
    }

    /*
     * Multi-bulan tetap wajib dipilih user.
     * Saat scan otomatis, pilihan hanya disimpan dan modal
     * baru ditampilkan ketika tombol Preview ditekan.
     */
    const selectedExists =
      detected.some(
        (item) =>
          item.period ===
          selectedUploadPeriod.value
      );

    pendingUploadPeriod.value =
      selectedExists
        ? selectedUploadPeriod.value
        : detected[0].period;

    showUploadDeliveryPeriodChoice.value =
      openChoice;

    return false;
  };

  const syncAdmUploadFileState = () => {
    const files =
      admUploadFiles.value;

    uploadFiles.value =
      files[0] ?? null;

    uploadFileName.value =
      files.length === 0
        ? ''
        : files.length === 1
          ? files[0].name
          : `${files.length} Excel files selected`;
  };

  const syncDpmUploadFileState = () => {
    const files = dpmSoUploadFiles.value;

    uploadFiles.value = files[0] ?? null;
    uploadFileName.value =
      files.length === 0
        ? ''
        : files.length === 1
          ? files[0].name
          : `${files.length} Excel files selected`;
  };

  const syncTmminUploadFileState = () => {
    const files =
      tmminSoUploadFiles.value;

    const detectedCount =
      tmminSoDetectedTxtFiles.value.length;

    uploadFiles.value =
      files[0] ?? null;

    uploadFileName.value =
      files.length === 0
        ? ''
        : detectedCount > 0
          ? `${detectedCount} TXT files detected`
          : files.length === 1
            ? files[0].name
            : `${files.length} source files selected`;
  };

  const resetUploadForm = () => {
    completedAdmUploadFileKeys.clear();
    resetContractMaterialChoices();
    selectedCustomerUpload.value = '';
    selectedUploadPeriod.value = getCurrentUploadPeriod();
    selectedUploadUser.value = '';
    syncUploadUserFromLogin();
    excelPassword.value = '';
    uploadFiles.value = null;
    admUploadFiles.value = [];
    tmminSoUploadFiles.value = [];
    ntcSoUploadFiles.value = [];
    dpmSoUploadFiles.value = [];
    gayaSoUploadFiles.value = [];
    mesSoUploadFiles.value = [];
    asiAdmSoUploadFiles.value = [];
    asiAdmDetectedOrderType.value = '';
    asiAdmServicePartDeliveryDate.value = '';
    asiAdmFileTypes.value = [];
    isInspectingAsiAdmFiles.value = false;
    showMissingContractPartsModal.value = false;
    missingContractPartsPeriod.value = '';
    missingContractPartGroups.value = [];
    dcwaSoUploadFiles.value = [];
    resetFtiAdditionalOrderState(true);
    tmminSoDetectedTxtFiles.value = [];
    tmminSoExcludedTxtEntries.value = [];
    resetUploadDeliveryPeriodDetection();
    uploadFileName.value = '';
    showUploadPreview.value = false;
    showTmminRawSoPreview.value = false;
    showGayaRawSoPreview.value = false;
    showAsiAdmRawSoPreview.value = false;
    showDcwaRawSoPreview.value = false;
    showDpmRawSoPreview.value = false;
    showMesRawSoPreview.value = false;
    mesRawSoPreviewRows.value = [];
    mesRawSoPreviewSummary.value = null;
    mesPartNameConflicts.value = [];
    mesPartNameChoices.value = {};
    resetDpmRawSoDuplicateState();
    resetDpmSalesDocumentChoice();
    resetDcwaRawSoPreview();
    resetExcelPreviewState();
  };

  const clearUploadFormData = () => {
    resetUploadForm();
    closeAllPopups();
  };

  const removeAdmUploadFile = (
    index: number
  ) => {
    if (
      index < 0 ||
      index >= admUploadFiles.value.length
    ) {
      return;
    }

    admUploadFiles.value.splice(index, 1);
    resetUploadSessionState(true);
    syncAdmUploadFileState();
    resetExcelPreviewState();
    resetUploadDeliveryPeriodDetection();

    if (admUploadFiles.value.length === 0) {
      return;
    }

    if (
      !showExcelPasswordInput.value ||
      excelPassword.value.trim() !== ''
    ) {
      void analyzeAdmUploadPeriods(false);
    }
  };

  const removeNtcSoUploadFile = (
    index: number
  ) => {
    if (
      index < 0 ||
      index >= ntcSoUploadFiles.value.length
    ) {
      return;
    }

    ntcSoUploadFiles.value.splice(
      index,
      1
    );
    resetUploadSessionState(false);

    ntcRawSoPreviewRows.value = [];
    ntcRawSoPreviewContractMaterials.value = [];
    ntcUploadPreviewSummaryBySite.value = [];
    resetUploadDeliveryPeriodDetection();
    resetExcelPreviewState();

    uploadFiles.value =
      ntcSoUploadFiles.value[0] ?? null;

    uploadFileName.value =
      ntcSoUploadFiles.value.length === 0
        ? ''
        : ntcSoUploadFiles.value.length === 1
          ? ntcSoUploadFiles.value[0].name
          : `${ntcSoUploadFiles.value.length} CSV files selected`;

    if (ntcSoUploadFiles.value.length > 0) {
      void refreshNtcUploadDetection(
        false,
        false
      );
    }
  };


  const removeDpmSoUploadFile = (
    index: number
  ) => {
    if (
      index < 0 ||
      index >= dpmSoUploadFiles.value.length
    ) {
      return;
    }

    dpmSoUploadFiles.value.splice(index, 1);
    resetUploadSessionState(false);
    syncDpmUploadFileState();
    dpmRawSoPreviewRows.value = [];
    dpmRawSoPreviewSummary.value = null;
    dpmRawSoContractValidation.value = null;
    showDpmRawSoPreview.value = false;
    resetDpmRawSoDuplicateState();
    resetDpmSalesDocumentChoice();
    resetUploadDeliveryPeriodDetection();
    resetExcelPreviewState();

    if (dpmSoUploadFiles.value.length > 0) {
      void refreshDpmUploadPreview(false, false);
    }
  };

  const clearMissingContractPartsPreview = (): void => {
    showMissingContractPartsModal.value = false;
    missingContractPartsPeriod.value = '';
    missingContractPartGroups.value = [];
    resetMissingContractPartsCopiedState();
  };

  const openMissingContractPartsModal = (): void => {
    if (missingContractParts.value.length === 0) {
      return;
    }

    resetMissingContractPartsCopiedState();
    showMissingContractPartsModal.value = true;
  };

  const closeMissingContractPartsModal = (): void => {
    showMissingContractPartsModal.value = false;
    resetMissingContractPartsCopiedState();
  };

  const copyTextToClipboard = async (
    text: string
  ): Promise<boolean> => {
    if (text.trim() === '') return false;

    try {
      if (
        typeof navigator !== 'undefined' &&
        navigator.clipboard?.writeText
      ) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
      }

      notificationStore.showAlertSuccess(
        `${text.split(/\r?\n/).filter(Boolean).length} Part Number berhasil dicopy.`
      );

      return true;
    } catch (error) {
      console.error('Copy Part Number gagal:', error);
      notificationStore.showAlertError(
        'Part Number gagal dicopy. Silakan copy manual dari daftar.'
      );

      return false;
    }
  };

  const copyMissingContractParts = async (): Promise<void> => {
    const copied = await copyTextToClipboard(
      missingContractParts.value.join('\n')
    );

    if (!copied) {
      resetMissingContractPartsCopiedState();
      return;
    }

    resetMissingContractPartsCopiedState();
    missingContractPartsCopied.value = true;

    missingContractPartsCopiedTimer = setTimeout(() => {
      missingContractPartsCopied.value = false;
      missingContractPartsCopiedTimer = null;
    }, 2200);
  };

  const normalizeContractPreviewPeriod = (
    value: unknown
  ): string => {
    const period = String(value ?? '').replace(/\\D/g, '');
    return /^\\d{6}$/.test(period) ? period : '';
  };

  const normalizeContractPreviewMaterials = (
    values: unknown[]
  ): string[] => {
    return Array.from(
      new Set(
        values
          .map((value) => String(value ?? '').trim().toUpperCase())
          .filter(Boolean)
      )
    );
  };

  /**
   * Memproses hasil Contract validation yang dihitung dari raw row oleh backend.
   * Payload ini memakai rule Final Submit (Reference Document aktual dan
   * material variant), bukan sekadar customer + period + latest revision.
   */
  const validateEmbeddedContractValidationGroups = (
    rawGroups: any[],
    openModalWhenMissing = true
  ): boolean => {
    const groups = Array.isArray(rawGroups)
      ? rawGroups.filter((group) => group && typeof group === 'object')
      : [];

    if (groups.length === 0) {
      return true;
    }

    const ambiguousByKey = new Map<string, any>();

    groups.forEach((group) => {
      const ambiguousRows = Array.isArray(group?.ambiguous_parts)
        ? group.ambiguous_parts
        : [];

      ambiguousRows.forEach((item: any) => {
        const key = String(item?.key ?? '').trim();
        const options = Array.isArray(item?.options)
          ? item.options
              .map((value: any) => String(value ?? '').trim().toUpperCase())
              .filter(Boolean)
          : [];

        if (key === '' || options.length <= 1) {
          return;
        }

        if (!ambiguousByKey.has(key)) {
          ambiguousByKey.set(key, {
            ...item,
            key,
            options
          });
        }
      });
    });

    /*
     * Samakan urutan dengan Final Submit: ambiguity diselesaikan lebih dulu.
     * Setelah user memilih, Preview/Submit dipanggil lagi dengan
     * material_choices sehingga missing part berikutnya dapat ditampilkan.
     */
    if (ambiguousByKey.size > 0) {
      clearMissingContractPartsPreview();

      const opened = openContractMaterialChoice({
        status: 'material_choice_required',
        message:
          'Contract mempunyai Part Number bertitik dan tanpa titik. Pilih Part Number yang akan dipakai pada order.',
        choices: Array.from(ambiguousByKey.values())
      });

      if (opened) {
        return false;
      }
    } else {
      showContractMaterialChoiceModal.value = false;
      contractMaterialChoiceItems.value = [];
      contractMaterialChoiceMessage.value = '';
    }

    const missingByCustomer = new Map<
      string,
      { parts: Set<string>; documents: Set<string> }
    >();

    groups.forEach((group) => {
      const customer = String(group?.customer ?? '')
        .trim()
        .toUpperCase();

      if (customer === '') {
        return;
      }

      const parts = Array.isArray(group?.missing_parts)
        ? group.missing_parts
        : [];

      if (parts.length === 0) {
        return;
      }

      if (!missingByCustomer.has(customer)) {
        missingByCustomer.set(customer, {
          parts: new Set<string>(),
          documents: new Set<string>()
        });
      }

      const bucket = missingByCustomer.get(customer)!;

      const documents = Array.isArray(group?.contract_documents)
        ? group.contract_documents
        : [];

      documents.forEach((value: any) => {
        const document = String(value ?? '').trim().toUpperCase();
        if (document !== '') bucket.documents.add(document);
      });

      parts.forEach((item: any) => {
        const material = String(
          typeof item === 'string'
            ? item
            : item?.material ?? item?.source_material ?? item?.part_no ?? ''
        )
          .trim()
          .toUpperCase();

        if (material !== '') {
          bucket.parts.add(material);
        }

        if (item && typeof item === 'object') {
          const document = String(item?.contract_document ?? '')
            .trim()
            .toUpperCase();
          if (document !== '') bucket.documents.add(document);
        }
      });
    });

    const missingGroups: MissingContractPartGroup[] =
      Array.from(missingByCustomer.entries()).map(
        ([customer, bucket]) => ({
          customer,
          revision: null,
          parts: Array.from(bucket.parts),
          contractDocuments: Array.from(bucket.documents)
        })
      );

    resetMissingContractPartsCopiedState();
    missingContractPartsPeriod.value =
      normalizeContractPreviewPeriod(selectedUploadPeriod.value);
    missingContractPartGroups.value = missingGroups;
    showMissingContractPartsModal.value =
      openModalWhenMissing && missingGroups.length > 0;

    if (missingGroups.length === 0) {
      clearMissingContractPartsPreview();
    }

    return missingGroups.length === 0;
  };

  const validatePreviewContractGroups = async (
    groups: Array<{
      customer: string;
      materials: unknown[];
    }>,
    periodValue: unknown,
    openModalWhenMissing = true
  ): Promise<boolean> => {
    const periode = normalizeContractPreviewPeriod(periodValue);

    if (periode === '' || groups.length === 0) {
      clearMissingContractPartsPreview();
      return true;
    }

    const normalizedGroups = groups
      .map((group) => ({
        customer: String(group.customer ?? '').trim().toUpperCase(),
        materials: normalizeContractPreviewMaterials(group.materials)
      }))
      .filter((group) => group.customer !== '' && group.materials.length > 0);

    if (normalizedGroups.length === 0) {
      clearMissingContractPartsPreview();
      return true;
    }

    try {
      isValidatingPreviewContractParts.value = true;
      const missingGroups: MissingContractPartGroup[] = [];

      for (const group of normalizedGroups) {
        const response = await customerOrderService
          .validateContractPreviewParts({
            customer: group.customer,
            periode,
            materials: group.materials
          });

        if (response.status !== 'success') {
          throw new Error(
            response.message ||
            `Validasi Contract ${group.customer} gagal.`
          );
        }

        const parts = normalizeContractPreviewMaterials(
          Array.isArray(response.missing_parts)
            ? response.missing_parts
            : []
        );

        if (parts.length > 0) {
          missingGroups.push({
            customer: group.customer,
            revision:
              response.revision === null ||
              response.revision === undefined
                ? null
                : Number(response.revision),
            parts
          });
        }
      }

      resetMissingContractPartsCopiedState();
      missingContractPartsPeriod.value = periode;
      missingContractPartGroups.value = missingGroups;
      showMissingContractPartsModal.value =
        openModalWhenMissing && missingGroups.length > 0;

      return missingGroups.length === 0;
    } catch (error: any) {
      console.error('Validasi Part Contract preview gagal:', error);

      /*
       * Customer lama tidak dibuat gagal Preview hanya karena endpoint early
       * validation bermasalah. Validasi Submit backend existing tetap aktif.
       */
      clearMissingContractPartsPreview();
      notificationStore.showAlertWarning(
        error?.response?.data?.message ||
        error?.message ||
        'Validasi awal Part Number terhadap Contract gagal. Validasi Submit tetap aktif.'
      );
      return true;
    } finally {
      isValidatingPreviewContractParts.value = false;
    }
  };

  /**
   * Membuka popup Missing Contract Parts langsung dari response upload.
   *
   * Backend ADM melakukan validasi final menggunakan Sales Document Contract
   * yang benar-benar akan dipakai (contoh CAD4000926). Validasi preview yang
   * hanya berdasarkan customer + periode bisa saja lolos apabila material ada
   * pada Contract lain di periode yang sama. Karena itu response upload tetap
   * menjadi sumber validasi final.
   *
   * `missing_contract_parts` adalah sumber utama. Parser message dipertahankan
   * sebagai backward compatibility apabila frontend baru masih terhubung ke
   * backend versi lama yang hanya mengirim `message`.
   */
  const openMissingContractPartsFromUploadResponse = (
    response: any,
    fallbackCustomer: string
  ): boolean => {
    const message = String(response?.message ?? '');

    let parts = normalizeContractPreviewMaterials(
      Array.isArray(response?.missing_contract_parts)
        ? response.missing_contract_parts
        : []
    );

    if (parts.length === 0 && /contract/i.test(message)) {
      const parsed: string[] = [];

      // Format ADM combined existing:
      // Part yang belum ada di Contract:\n• 55111-BZ100-00
      for (const match of message.matchAll(
        /(?:^|\n)\s*[•*-]\s*([A-Z0-9][A-Z0-9._\/-]*)\s*(?=\n|$)/gim
      )) {
        parsed.push(match[1]);
      }

      // Format ADM single existing:
      // Part: 55111-BZ100-00, 12345-ABC +2 lainnya
      const inlinePartMatch = message.match(/(?:^|\n)\s*Part\s*:\s*([^\n]+)/i);
      if (inlinePartMatch?.[1]) {
        inlinePartMatch[1]
          .split(',')
          .map((value) => value.trim())
          .filter((value) => value !== '' && !/^\+\d+\s+part\s+lainnya$/i.test(value))
          .forEach((value) => {
            const token = value.match(/^([A-Z0-9][A-Z0-9._\/-]*)/i)?.[1];
            if (token) parsed.push(token);
          });
      }

      parts = normalizeContractPreviewMaterials(parsed);
    }

    if (parts.length === 0) {
      return false;
    }

    const responseCustomer = String(response?.customer ?? '')
      .trim()
      .toUpperCase();

    const messageCustomer =
      message.match(/customer\s+([A-Z0-9]+(?:\s+[A-Z0-9]+)*)\s*\./i)?.[1] ??
      message.match(/Upload\s+ditolak\s*[—-]\s*([^\n]+)/i)?.[1] ??
      '';

    const customer =
      responseCustomer ||
      String(messageCustomer).trim().toUpperCase() ||
      String(fallbackCustomer ?? '').trim().toUpperCase() ||
      'ADM';

    resetMissingContractPartsCopiedState();
    missingContractPartsPeriod.value =
      normalizeContractPreviewPeriod(selectedUploadPeriod.value);
    missingContractPartGroups.value = [
      {
        customer,
        revision:
          response?.contract_revision === null ||
          response?.contract_revision === undefined
            ? null
            : Number(response.contract_revision),
        parts
      }
    ];
    showMissingContractPartsModal.value = true;

    return true;
  };

  const getAdmPreviewContractPartIndex = (): number => {
    return excelPreviewHeaders.value.findIndex((header) => {
      const key = String(header ?? '')
        .trim()
        .replace(/[^A-Z0-9]+/gi, ' ')
        .trim()
        .toUpperCase();

      return [
        'PART NO',
        'PART NUMBER',
        'PARTNO',
        'MATERIAL'
      ].includes(key);
    });
  };

  const getAdmPreviewContractMaterials = (
    rows: ExcelCell[][]
  ): string[] => {
    const index = getAdmPreviewContractPartIndex();
    if (index < 0) return [];

    return normalizeContractPreviewMaterials(
      rows.map((row) => row[index])
    );
  };

  const validateAdmPreviewContract = async (
    previewResponse: any = null
  ): Promise<boolean> => {
    const exactGroups = Array.isArray(
      previewResponse?.contract_validation_groups
    )
      ? previewResponse.contract_validation_groups
      : [];

    if (exactGroups.length > 0) {
      return validateEmbeddedContractValidationGroups(
        exactGroups,
        true
      );
    }

    /*
     * Backward compatibility bila frontend baru sementara masih mengarah
     * ke backend lama yang belum mengirim exact validation payload.
     */
    const selected = String(selectedCustomerUpload.value ?? '')
      .trim()
      .toUpperCase();

    const groups: Array<{ customer: string; materials: unknown[] }> = [];

    if (selected === 'ADM P1' || selected === 'ADM P4') {
      const p1Parts = getAdmPreviewContractMaterials(
        admP1ExcelPreviewRows.value as ExcelCell[][]
      );
      const p4Parts = getAdmPreviewContractMaterials(
        admP4ExcelPreviewRows.value as ExcelCell[][]
      );

      if (p1Parts.length > 0) {
        groups.push({ customer: 'ADM P1', materials: p1Parts });
      }
      if (p4Parts.length > 0) {
        groups.push({ customer: 'ADM P4', materials: p4Parts });
      }
    } else if (selected === 'ADM P5') {
      groups.push({
        customer: 'ADM P5',
        materials: getAdmPreviewContractMaterials(
          normalizedExcelPreviewRows.value as ExcelCell[][]
        )
      });
    }

    return validatePreviewContractGroups(
      groups,
      selectedUploadPeriod.value,
      true
    );
  };

  /*
   * Ambil Part Number ADM langsung dari payload preview per file.
   *
   * Helper ini dipakai saat Submit karena ADM mendukung lebih dari satu
   * file. Preview UI hanya menyimpan satu file aktif, sehingga validasi
   * Contract pada Submit harus menggabungkan seluruh file terlebih dahulu
   * agar popup menampilkan SEMUA part yang belum ada di Contract.
   */
  const getAdmContractGroupsFromPreviewResponse = (
    data: any
  ): Array<{ customer: string; materials: string[] }> => {
    const headers = Array.isArray(data?.headers)
      ? data.headers
      : [];
    const rows = Array.isArray(data?.rows)
      ? data.rows
      : [];

    const normalizeHeader = (value: unknown): string => {
      return String(value ?? '')
        .trim()
        .replace(/[^A-Z0-9]+/gi, ' ')
        .trim()
        .toUpperCase();
    };

    const partIndex = headers.findIndex((header: unknown) => {
      const key = normalizeHeader(header);
      return [
        'PART NO',
        'PART NUMBER',
        'PARTNO',
        'MATERIAL'
      ].includes(key);
    });

    if (partIndex < 0) {
      return [];
    }

    const plantIndex = headers.findIndex((header: unknown) => {
      const key = normalizeHeader(header);
      return key === 'PLANT CODE' || key === 'PLANT';
    });

    const selected = String(selectedCustomerUpload.value ?? '')
      .trim()
      .toUpperCase();

    const materialsByCustomer = new Map<string, Set<string>>();

    const addMaterial = (
      customer: string,
      materialValue: unknown
    ): void => {
      const material = String(materialValue ?? '')
        .trim()
        .toUpperCase();

      if (customer === '' || material === '') {
        return;
      }

      if (!materialsByCustomer.has(customer)) {
        materialsByCustomer.set(customer, new Set<string>());
      }

      materialsByCustomer.get(customer)?.add(material);
    };

    rows.forEach((rawRow: unknown) => {
      if (!Array.isArray(rawRow)) {
        return;
      }

      const plant = plantIndex >= 0
        ? String(rawRow[plantIndex] ?? '')
            .trim()
            .replace(/\s+/g, '')
            .toUpperCase()
        : '';

      let customer = '';

      if (plant === 'D101') {
        customer = 'ADM P1';
      } else if (plant === 'D104') {
        customer = 'ADM P4';
      } else if (plant === 'D105') {
        customer = 'ADM P5';
      } else if (selected === 'ADM P5') {
        // P5 berdiri sendiri. Fallback ini menjaga validasi tetap berjalan
        // apabila kolom Plant tidak ikut dikirim pada payload preview.
        customer = 'ADM P5';
      }

      // P1/P4 memang boleh berada pada satu file. Customer lain diabaikan.
      if (
        selected === 'ADM P1' ||
        selected === 'ADM P4'
      ) {
        if (customer !== 'ADM P1' && customer !== 'ADM P4') {
          return;
        }
      } else if (selected === 'ADM P5') {
        if (customer !== 'ADM P5') {
          return;
        }
      }

      addMaterial(customer, rawRow[partIndex]);
    });

    return Array.from(materialsByCustomer.entries()).map(
      ([customer, materials]) => ({
        customer,
        materials: Array.from(materials)
      })
    );
  };

  const mergeAdmContractPreviewGroups = (
    target: Map<string, Set<string>>,
    groups: Array<{ customer: string; materials: string[] }>
  ): void => {
    groups.forEach((group) => {
      const customer = String(group.customer ?? '')
        .trim()
        .toUpperCase();

      if (customer === '') {
        return;
      }

      if (!target.has(customer)) {
        target.set(customer, new Set<string>());
      }

      const destination = target.get(customer);

      normalizeContractPreviewMaterials(group.materials).forEach((part) => {
        destination?.add(part);
      });
    });
  };

  const validateTmminPreviewContract = async (): Promise<boolean> => {
    const materials = tmminRawSoPreviewContractMaterials.value.length > 0
      ? tmminRawSoPreviewContractMaterials.value
      : tmminRawSoPreviewRows.value.map((row) =>
          row.arMaterialSo || row.aqMaterialSap || row.kPartNoRaw
        );

    return validatePreviewContractGroups(
      [{ customer: 'TMMIN', materials }],
      selectedUploadPeriod.value,
      true
    );
  };

  const validateNtcPreviewContract = async (): Promise<boolean> => {
    const materials = ntcRawSoPreviewContractMaterials.value.length > 0
      ? ntcRawSoPreviewContractMaterials.value
      : ntcRawSoPreviewRows.value.map((row) =>
          row.partNumber || row.partNo
        );

    return validatePreviewContractGroups(
      [{ customer: 'NTC', materials }],
      selectedUploadPeriod.value,
      true
    );
  };

  const validateGayaPreviewContract = async (
    previewResponse: any = null
  ): Promise<boolean> => {
    if (
      previewResponse?.contract_validation &&
      typeof previewResponse.contract_validation === 'object'
    ) {
      return validateEmbeddedContractValidationGroups(
        [previewResponse.contract_validation],
        true
      );
    }

    // Backward compatibility untuk backend lama.
    const materials = gayaRawSoPreviewRows.value.map((row) =>
      row.partNumber || row.materialNumber
    );

    return validatePreviewContractGroups(
      [{ customer: 'GAYA MTR', materials }],
      selectedUploadPeriod.value,
      true
    );
  };

  const validateDcwaPreviewContract = async (): Promise<boolean> => {
    const materials = dcwaRawSoPreviewRows.value.map((row) => row.partNo);

    return validatePreviewContractGroups(
      [{ customer: 'DCWA', materials }],
      selectedUploadPeriod.value,
      true
    );
  };

  const buildAsiAdmInspectionFormData = (
    files: File[]
  ): FormData => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files[]', file));
    return formData;
  };

  const inspectAsiAdmCandidateFiles = async (
    files: File[]
  ): Promise<boolean> => {
    if (files.length === 0) {
      asiAdmDetectedOrderType.value = '';
      asiAdmFileTypes.value = [];
      asiAdmServicePartDeliveryDate.value = '';
      return true;
    }

    try {
      isInspectingAsiAdmFiles.value = true;
      const response = await customerOrderService.inspectAsiAdmRawSoFiles(
        buildAsiAdmInspectionFormData(files)
      );

      if (response.status !== 'success') {
        notificationStore.showAlertWarning(
          response.message ||
          'PDF ASI ADM REGULAR dan SERVICE PART tidak boleh dicampur.'
        );
        return false;
      }

      const detected = String(response.order_type ?? '')
        .trim()
        .toUpperCase();

      if (detected !== 'REGULAR' && detected !== 'SERVICE PART') {
        notificationStore.showAlertWarning(
          'Tipe PDF ASI ADM tidak dapat dideteksi.'
        );
        return false;
      }

      asiAdmDetectedOrderType.value = detected as AsiAdmRawSoOrderType;
      asiAdmFileTypes.value = Array.isArray(response.file_types)
        ? response.file_types.map((item) => ({
            file_name: String(item.file_name ?? ''),
            order_type: String(item.order_type ?? ''),
            total_items: Number(item.total_items ?? 0)
          }))
        : [];

      if (asiAdmDetectedOrderType.value !== 'SERVICE PART') {
        asiAdmServicePartDeliveryDate.value = '';
      }

      return true;
    } catch (error: any) {
      console.error('Inspect PDF ASI ADM gagal:', error);
      notificationStore.showAlertWarning(
        error?.response?.data?.message ||
        error?.message ||
        'Gagal memeriksa tipe PDF ASI ADM.'
      );
      return false;
    } finally {
      isInspectingAsiAdmFiles.value = false;
    }
  };

  const removeAsiAdmSoUploadFile = (
    index: number
  ) => {
    if (
      index < 0 ||
      index >= asiAdmSoUploadFiles.value.length
    ) {
      return;
    }

    asiAdmSoUploadFiles.value.splice(index, 1);
    resetUploadSessionState(false);
    asiAdmRawSoPreviewRows.value = [];
    asiAdmRawSoPreviewSummary.value = null;
    asiAdmRawSoPreviewErrors.value = [];
    asiAdmRawSoCanSubmitPreview.value = false;
    showAsiAdmRawSoPreview.value = false;
    clearMissingContractPartsPreview();

    uploadFiles.value =
      asiAdmSoUploadFiles.value[0] ?? null;

    uploadFileName.value =
      asiAdmSoUploadFiles.value.length === 0
        ? ''
        : asiAdmSoUploadFiles.value.length === 1
          ? asiAdmSoUploadFiles.value[0].name
          : `${asiAdmSoUploadFiles.value.length} PDF files selected`;

    if (asiAdmSoUploadFiles.value.length === 0) {
      asiAdmDetectedOrderType.value = '';
      asiAdmFileTypes.value = [];
      asiAdmServicePartDeliveryDate.value = '';
    } else {
      void inspectAsiAdmCandidateFiles(
        [...asiAdmSoUploadFiles.value]
      );
    }
  };

  const removeGayaSoUploadFile = (
    index: number
  ) => {
    if (
      index < 0 ||
      index >= gayaSoUploadFiles.value.length
    ) {
      return;
    }

    gayaSoUploadFiles.value.splice(index, 1);
    resetUploadSessionState(false);
    gayaRawSoPreviewRows.value = [];
    gayaUploadPreviewSummary.value = null;
    resetUploadDeliveryPeriodDetection();
    resetExcelPreviewState();

    uploadFiles.value =
      gayaSoUploadFiles.value[0] ?? null;

    uploadFileName.value =
      gayaSoUploadFiles.value.length === 0
        ? ''
        : gayaSoUploadFiles.value.length === 1
          ? gayaSoUploadFiles.value[0].name
          : `${gayaSoUploadFiles.value.length} PDF files selected`;

    if (gayaSoUploadFiles.value.length > 0) {
      void refreshGayaUploadDetection(false, false);
    }
  };

  const removeTmminSoUploadFile = (
    index: number
  ) => {
    if (
      index < 0 ||
      index >= tmminSoUploadFiles.value.length
    ) {
      return;
    }

    tmminSoUploadFiles.value.splice(
      index,
      1
    );
    resetUploadSessionState(false);

    tmminSoDetectedTxtFiles.value = [];
    tmminSoExcludedTxtEntries.value = [];
    tmminRawSoPreviewRows.value = [];
    tmminRawSoPreviewContractMaterials.value = [];
    resetUploadDeliveryPeriodDetection();
    syncTmminUploadFileState();
    resetExcelPreviewState();

    if (tmminSoUploadFiles.value.length > 0) {
      void refreshTmminUploadDetection(
        false,
        false
      );
    }
  };
  const loadExcelSheetPreview = (sheetName: string) => {
    if (!excelWorkbook.value)
      return;
    const worksheet = excelWorkbook.value.Sheets[sheetName];
    if (!worksheet) {
      excelPreviewRows.value = [];
      return;
    }
    const rows = XLSX.utils.sheet_to_json<ExcelCell[]>(worksheet, {
      header: 1,
      defval: '',
      blankrows: false
    });
    excelPreviewRows.value = rows.slice(0, 100);
  };
  const handleExcelSheetChange = () => {
    loadExcelSheetPreview(selectedExcelSheet.value);
  };

  // Guard upload standar disamakan dengan backend. Tujuannya menolak
  // payload abnormal sebelum browser mengirim file ke parser server 128 MB.
  const SO_MAX_PDF_FILE_BYTES = 10 * 1024 * 1024;
  const SO_MAX_SPREADSHEET_FILE_BYTES = 15 * 1024 * 1024;
  const SO_MAX_CSV_FILE_BYTES = 15 * 1024 * 1024;
  const SO_MAX_MULTI_UPLOAD_BYTES = 50 * 1024 * 1024;
  const SO_MAX_MULTI_UPLOAD_FILES = 20;
  const ADM_SO_MAX_UPLOAD_FILES = 20;
  const ASI_ADM_SO_MAX_UPLOAD_FILES = 50;
  const GAYA_SO_MAX_UPLOAD_FILES = 30;
  const DCWA_SO_MAX_UPLOAD_FILES = 60;

  const validateSoUploadBudget = (
    files: File[],
    label: string,
    maxFiles: number,
    maxTotalBytes: number,
    maxBytesForFile: (file: File) => number
  ): boolean => {
    const emptyFile = files.find((file) => file.size <= 0);
    if (emptyFile) {
      notificationStore.showAlertWarning(
        `File ${emptyFile.name} kosong atau tidak valid.`
      );
      return false;
    }

    if (maxFiles > 0 && files.length > maxFiles) {
      notificationStore.showAlertWarning(
        `Maksimal ${maxFiles} file ${label} dalam sekali upload.`
      );
      return false;
    }

    const oversized = files.find((file) => {
      const maxBytes = Math.max(0, maxBytesForFile(file));
      return maxBytes > 0 && file.size > maxBytes;
    });

    if (oversized) {
      const maxBytes = Math.max(0, maxBytesForFile(oversized));
      const maxMb = Math.ceil(maxBytes / (1024 * 1024));
      notificationStore.showAlertWarning(
        `Ukuran file ${label} maksimal ${maxMb} MB per file: ${oversized.name}.`
      );
      return false;
    }

    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
    if (maxTotalBytes > 0 && totalBytes > maxTotalBytes) {
      const maxTotalMb = Math.ceil(maxTotalBytes / (1024 * 1024));
      notificationStore.showAlertWarning(
        `Total ukuran file ${label} maksimal ${maxTotalMb} MB dalam sekali upload.`
      );
      return false;
    }

    return true;
  };

  // MES PDF guard disamakan dengan backend supaya file terlalu besar/banyak
  // ditolak sebelum browser mengirim payload dan menjalankan preview parser.
  const MES_SO_MAX_UPLOAD_FILES = 20;
  const MES_SO_MAX_FILE_BYTES = 10 * 1024 * 1024;
  const MES_SO_MAX_TOTAL_BYTES = 50 * 1024 * 1024;

  const onUploadFileChange = async (e: Event) => {
    const target =
      e.target as HTMLInputElement;

    if (!selectedCustomerUpload.value) {
      notificationStore.showAlertWarning(
        'Pilih Customer terlebih dahulu sebelum memilih file'
      );

      target.value = '';
      uploadFiles.value = null;
      admUploadFiles.value = [];
      tmminSoUploadFiles.value = [];
      asiAdmSoUploadFiles.value = [];
      tmminSoDetectedTxtFiles.value = [];
      tmminSoExcludedTxtEntries.value = [];
      uploadFileName.value = '';

      return;
    }

    if (!target.files?.length) {
      return;
    }

    if (isMesSoUpload.value) {
      admUploadFiles.value = [];
      tmminSoUploadFiles.value = [];
      ntcSoUploadFiles.value = [];
      dpmSoUploadFiles.value = [];
      gayaSoUploadFiles.value = [];
      asiAdmSoUploadFiles.value = [];
      dcwaSoUploadFiles.value = [];
      tmminSoDetectedTxtFiles.value = [];
      tmminSoExcludedTxtEntries.value = [];

      const selectedFiles = Array.from(target.files);
      const invalidFile = selectedFiles.find((file) => !/\.pdf$/i.test(file.name));
      if (invalidFile) {
        notificationStore.showAlertWarning(`File ${invalidFile.name} harus berformat PDF.`);
        target.value = '';
        return;
      }

      const emptyFile = selectedFiles.find((file) => file.size <= 0);
      if (emptyFile) {
        notificationStore.showAlertWarning(`File ${emptyFile.name} kosong atau tidak valid.`);
        target.value = '';
        return;
      }

      const oversizedFile = selectedFiles.find(
        (file) => file.size > MES_SO_MAX_FILE_BYTES
      );
      if (oversizedFile) {
        notificationStore.showAlertWarning(
          `Ukuran setiap PDF MES maksimal 10 MB: ${oversizedFile.name}.`
        );
        target.value = '';
        return;
      }

      const existingFiles = new Map<string, File>();
      [...mesSoUploadFiles.value, ...selectedFiles].forEach((file) => {
        existingFiles.set([file.name, file.size, file.lastModified].join('::'), file);
      });

      const mergedFiles = Array.from(existingFiles.values());
      if (mergedFiles.length > MES_SO_MAX_UPLOAD_FILES) {
        notificationStore.showAlertWarning(
          `Maksimal ${MES_SO_MAX_UPLOAD_FILES} PDF MES dalam sekali upload.`
        );
        target.value = '';
        return;
      }

      const totalBytes = mergedFiles.reduce((sum, file) => sum + file.size, 0);
      if (totalBytes > MES_SO_MAX_TOTAL_BYTES) {
        notificationStore.showAlertWarning(
          'Total ukuran PDF MES dalam sekali upload maksimal 50 MB.'
        );
        target.value = '';
        return;
      }

      mesSoUploadFiles.value = mergedFiles;
      resetUploadSessionState(false);
      uploadFiles.value = mesSoUploadFiles.value[0] ?? null;
      uploadFileName.value = mesSoUploadFiles.value.length === 1
        ? mesSoUploadFiles.value[0].name
        : `${mesSoUploadFiles.value.length} PDF files selected`;
      mesRawSoPreviewRows.value = [];
      mesRawSoPreviewSummary.value = null;
      mesPartNameConflicts.value = [];
      mesPartNameChoices.value = {};
      showMesRawSoPreview.value = false;
      clearMissingContractPartsPreview();
      resetUploadDeliveryPeriodDetection();
      resetExcelPreviewState();
      target.value = '';

      // Parser text MES sekaligus mendeteksi Delivery Date/bulan dari PDF.
      await refreshMesUploadPreview(false);
      return;
    }

    if (isDcwaSoUpload.value) {
      admUploadFiles.value = [];
      tmminSoUploadFiles.value = [];
      ntcSoUploadFiles.value = [];
      gayaSoUploadFiles.value = [];
      tmminSoDetectedTxtFiles.value = [];
      tmminSoExcludedTxtEntries.value = [];

      const selectedFiles = Array.from(target.files);
      const invalidFile = selectedFiles.find(
        (file) => !/\.(xlsx|xls|pdf)$/i.test(file.name)
      );

      if (invalidFile) {
        notificationStore.showAlertWarning(
          `File ${invalidFile.name} harus berformat XLSX, XLS, atau PDF.`
        );
        target.value = '';
        return;
      }

      if (!addDcwaSoUploadFiles(selectedFiles)) {
        target.value = '';
        return;
      }
      resetUploadSessionState(false);
      uploadFiles.value = dcwaSoUploadFiles.value[0] ?? null;
      uploadFileName.value = dcwaSoUploadFileLabel.value;
      resetUploadDeliveryPeriodDetection();
      target.value = '';

      if (dcwaSoHasRequiredFileTypes.value) {
        await analyzeDcwaUploadPeriods(false);
      }

      return;
    }


    if (isAsiAdmSoUpload.value) {
      admUploadFiles.value = [];
      tmminSoUploadFiles.value = [];
      ntcSoUploadFiles.value = [];
      gayaSoUploadFiles.value = [];
      dcwaSoUploadFiles.value = [];
      tmminSoDetectedTxtFiles.value = [];
      tmminSoExcludedTxtEntries.value = [];

      const selectedFiles = Array.from(target.files);
      const invalidFile = selectedFiles.find(
        (file) => !file.name.toLowerCase().endsWith('.pdf')
      );

      if (invalidFile) {
        notificationStore.showAlertWarning(
          `File ${invalidFile.name} harus berformat PDF.`
        );
        target.value = '';
        return;
      }

      /*
       * Browse berikutnya tetap boleh menambah file, tetapi gabungan seluruh
       * file WAJIB satu tipe: semua REGULAR atau semua SERVICE PART.
       * Candidate diperiksa backend SEBELUM list upload diganti sehingga
       * pilihan lama tetap aman bila user mencoba mencampur tipe.
       */
      const existingFiles = new Map<string, File>();

      asiAdmSoUploadFiles.value.forEach((file) => {
        existingFiles.set(
          [file.name, file.size, file.lastModified].join('::'),
          file
        );
      });

      selectedFiles.forEach((file) => {
        existingFiles.set(
          [file.name, file.size, file.lastModified].join('::'),
          file
        );
      });

      const candidateFiles = Array.from(existingFiles.values());

      if (!validateSoUploadBudget(
        candidateFiles,
        'PDF ASI ADM',
        ASI_ADM_SO_MAX_UPLOAD_FILES,
        SO_MAX_MULTI_UPLOAD_BYTES,
        () => SO_MAX_PDF_FILE_BYTES
      )) {
        target.value = '';
        return;
      }

      const accepted = await inspectAsiAdmCandidateFiles(candidateFiles);

      target.value = '';

      if (!accepted) {
        return;
      }

      asiAdmSoUploadFiles.value = candidateFiles;
      resetUploadSessionState(false);
      uploadFiles.value = asiAdmSoUploadFiles.value[0] ?? null;
      uploadFileName.value =
        asiAdmSoUploadFiles.value.length === 1
          ? asiAdmSoUploadFiles.value[0].name
          : `${asiAdmSoUploadFiles.value.length} PDF files selected`;

      asiAdmRawSoPreviewRows.value = [];
      asiAdmRawSoPreviewSummary.value = null;
      asiAdmRawSoPreviewErrors.value = [];
      asiAdmRawSoCanSubmitPreview.value = false;
      clearMissingContractPartsPreview();
      resetUploadDeliveryPeriodDetection();
      resetExcelPreviewState();
      return;
    }

    if (isGayaSoUpload.value) {
      admUploadFiles.value = [];
      tmminSoUploadFiles.value = [];
      ntcSoUploadFiles.value = [];
      tmminSoDetectedTxtFiles.value = [];
      tmminSoExcludedTxtEntries.value = [];

      const selectedFiles = Array.from(target.files);
      const invalidFile = selectedFiles.find(
        (file) => !file.name.toLowerCase().endsWith('.pdf')
      );

      if (invalidFile) {
        notificationStore.showAlertWarning(
          `File ${invalidFile.name} harus berformat PDF.`
        );
        target.value = '';
        return;
      }

      const existingFiles = new Map<string, File>();

      gayaSoUploadFiles.value.forEach((file) => {
        existingFiles.set(
          [file.name, file.size, file.lastModified].join('::'),
          file
        );
      });

      selectedFiles.forEach((file) => {
        existingFiles.set(
          [file.name, file.size, file.lastModified].join('::'),
          file
        );
      });

      const candidateGayaFiles = Array.from(existingFiles.values());
      if (!validateSoUploadBudget(
        candidateGayaFiles,
        'PDF Gaya Motor',
        GAYA_SO_MAX_UPLOAD_FILES,
        SO_MAX_MULTI_UPLOAD_BYTES,
        () => SO_MAX_PDF_FILE_BYTES
      )) {
        target.value = '';
        return;
      }

      gayaSoUploadFiles.value = candidateGayaFiles;
      resetUploadSessionState(false);
      uploadFiles.value = gayaSoUploadFiles.value[0] ?? null;
      uploadFileName.value =
        gayaSoUploadFiles.value.length === 1
          ? gayaSoUploadFiles.value[0].name
          : `${gayaSoUploadFiles.value.length} PDF files selected`;

      gayaRawSoPreviewRows.value = [];
      gayaUploadPreviewSummary.value = null;
      resetUploadDeliveryPeriodDetection();
      resetExcelPreviewState();
      target.value = '';

      await refreshGayaUploadDetection(false, false);
      return;
    }

    if (isDpmSoUpload.value) {
      admUploadFiles.value = [];
      tmminSoUploadFiles.value = [];
      ntcSoUploadFiles.value = [];
      gayaSoUploadFiles.value = [];
      asiAdmSoUploadFiles.value = [];

      const selectedFiles = Array.from(target.files);
      const invalidFile = selectedFiles.find(
        (file) => !/\.(xlsx|xls)$/i.test(file.name)
      );

      if (invalidFile) {
        notificationStore.showAlertWarning(
          `File ${invalidFile.name} harus berformat XLSX atau XLS.`
        );
        target.value = '';
        return;
      }

      const existingFiles = new Map<string, File>();
      [...dpmSoUploadFiles.value, ...selectedFiles].forEach((file) => {
        existingFiles.set([file.name, file.size, file.lastModified].join('::'), file);
      });
      const candidateDpmFiles = Array.from(existingFiles.values());
      if (!validateSoUploadBudget(
        candidateDpmFiles,
        'Excel DPM',
        SO_MAX_MULTI_UPLOAD_FILES,
        SO_MAX_MULTI_UPLOAD_BYTES,
        () => SO_MAX_SPREADSHEET_FILE_BYTES
      )) {
        target.value = '';
        return;
      }
      dpmSoUploadFiles.value = candidateDpmFiles;
      resetUploadSessionState(false);
      syncDpmUploadFileState();
      dpmRawSoPreviewRows.value = [];
      dpmRawSoPreviewSummary.value = null;
      dpmRawSoContractValidation.value = null;
      resetDpmRawSoDuplicateState();
      resetDpmSalesDocumentChoice();
      resetUploadDeliveryPeriodDetection();
      target.value = '';
      await refreshDpmUploadPreview(false, false);
      return;
    }

    if (isNtcSoUpload.value) {
      admUploadFiles.value = [];
      tmminSoUploadFiles.value = [];
      tmminSoDetectedTxtFiles.value = [];
      tmminSoExcludedTxtEntries.value = [];

      const selectedFiles =
        Array.from(target.files);

      const invalidFile =
        selectedFiles.find(
          (file) =>
            !file.name
              .toLowerCase()
              .endsWith('.csv')
        );

      if (invalidFile) {
        notificationStore.showAlertWarning(
          `File ${invalidFile.name} harus berformat CSV.`
        );

        target.value = '';
        return;
      }

      const existingFiles =
        new Map<string, File>();

      ntcSoUploadFiles.value.forEach(
        (file) => {
          existingFiles.set(
            [
              file.name,
              file.size,
              file.lastModified
            ].join('::'),
            file
          );
        }
      );

      selectedFiles.forEach(
        (file) => {
          existingFiles.set(
            [
              file.name,
              file.size,
              file.lastModified
            ].join('::'),
            file
          );
        }
      );

      const candidateNtcFiles =
        Array.from(
          existingFiles.values()
        );

      if (!validateSoUploadBudget(
        candidateNtcFiles,
        'CSV NTC',
        SO_MAX_MULTI_UPLOAD_FILES,
        SO_MAX_MULTI_UPLOAD_BYTES,
        () => SO_MAX_CSV_FILE_BYTES
      )) {
        target.value = '';
        return;
      }

      ntcSoUploadFiles.value = candidateNtcFiles;
      resetUploadSessionState(false);

      uploadFiles.value =
        ntcSoUploadFiles.value[0] ?? null;

      uploadFileName.value =
        ntcSoUploadFiles.value.length === 1
          ? ntcSoUploadFiles.value[0].name
          : `${ntcSoUploadFiles.value.length} CSV files selected`;

      ntcRawSoPreviewRows.value = [];
      ntcRawSoPreviewContractMaterials.value = [];
      ntcUploadPreviewSummaryBySite.value = [];
      resetUploadDeliveryPeriodDetection();
      resetExcelPreviewState();
      target.value = '';

      await refreshNtcUploadDetection(
        false,
        false
      );

      return;
    }

    if (isTmminSoUpload.value) {
      admUploadFiles.value = [];

      const selectedFiles =
        Array.from(
          target.files
        );

      const invalidFile =
        selectedFiles.find(
          (file) => {
            const name =
              file.name
                .toLowerCase();

            return !(
              name.endsWith('.txt') ||
              name.endsWith('.zip') ||
              name.endsWith('.rar')
            );
          }
        );

      if (invalidFile) {
        notificationStore.showAlertWarning(
          `File ${invalidFile.name} harus berformat TXT, ZIP, atau RAR.`
        );

        target.value = '';

        return;
      }

      const oversizedFile =
        selectedFiles.find(
          (file) =>
            file.size > TMMIN_MAX_UPLOAD_SOURCE_BYTES
        );

      if (oversizedFile) {
        notificationStore.showAlertWarning(
          `File ${oversizedFile.name} melebihi batas 20 MB per file TMMIN.`
        );
        target.value = '';
        return;
      }

      const existingFiles =
        new Map<
          string,
          File
        >();

      tmminSoUploadFiles.value
        .forEach(
          (file) => {
            const key =
              [
                file.name,
                file.size,
                file.lastModified
              ].join(
                '::'
              );

            existingFiles.set(
              key,
              file
            );
          }
        );

      const previousCount =
        existingFiles.size;

      selectedFiles.forEach(
        (file) => {
          const key =
            [
              file.name,
              file.size,
              file.lastModified
            ].join(
              '::'
            );

          existingFiles.set(
            key,
            file
          );
        }
      );

      const nextTmminFiles =
        Array.from(
          existingFiles.values()
        );

      if (
        nextTmminFiles.length >
        TMMIN_MAX_UPLOAD_SOURCE_FILES
      ) {
        notificationStore.showAlertWarning(
          'Maksimal 20 file sumber TXT/ZIP/RAR TMMIN dalam satu upload.'
        );
        target.value = '';
        return;
      }

      const nextTmminTotalBytes =
        nextTmminFiles.reduce(
          (total, file) => total + file.size,
          0
        );

      if (
        nextTmminTotalBytes >
        TMMIN_MAX_UPLOAD_TOTAL_BYTES
      ) {
        notificationStore.showAlertWarning(
          'Total file sumber TMMIN melebihi batas 50 MB. Kurangi file yang dipilih.'
        );
        target.value = '';
        return;
      }

      tmminSoUploadFiles.value =
        nextTmminFiles;
      resetUploadSessionState(false);

      // Re-select source berarti scan ulang isi archive dari awal.
      tmminSoExcludedTxtEntries.value = [];
      tmminSoDetectedTxtFiles.value = [];
      tmminRawSoPreviewRows.value = [];
      tmminRawSoPreviewContractMaterials.value = [];
      resetUploadDeliveryPeriodDetection();

      syncTmminUploadFileState();
      resetExcelPreviewState();

      target.value = '';

      if (
        tmminSoUploadFiles.value.length ===
        previousCount &&
        selectedFiles.length > 0
      ) {
        notificationStore.showAlertWarning(
          'File yang dipilih sudah ada di daftar upload. Isi archive akan dipindai ulang.'
        );
      }

      await refreshTmminUploadDetection(
        false,
        false
      );

      return;
    }

    const selectedFiles =
      Array.from(target.files);

    const invalidFile =
      selectedFiles.find(
        (file) => {
          const name =
            file.name.toLowerCase();

          return !(
            name.endsWith('.xlsx') ||
            name.endsWith('.xls')
          );
        }
      );

    if (invalidFile) {
      notificationStore.showAlertWarning(
        `File ${invalidFile.name} harus berformat XLSX atau XLS.`
      );

      target.value = '';
      return;
    }

    tmminSoUploadFiles.value = [];
    ntcSoUploadFiles.value = [];
    tmminSoDetectedTxtFiles.value = [];
    tmminSoExcludedTxtEntries.value = [];
    resetUploadDeliveryPeriodDetection();

    const existingFiles =
      new Map<string, File>();

    admUploadFiles.value.forEach(
      (file) => {
        existingFiles.set(
          [
            file.name,
            file.size,
            file.lastModified
          ].join('::'),
          file
        );
      }
    );

    const previousCount =
      existingFiles.size;

    selectedFiles.forEach(
      (file) => {
        existingFiles.set(
          [
            file.name,
            file.size,
            file.lastModified
          ].join('::'),
          file
        );
      }
    );

    const candidateAdmFiles =
      Array.from(existingFiles.values());

    if (!validateSoUploadBudget(
      candidateAdmFiles,
      'Excel ADM',
      ADM_SO_MAX_UPLOAD_FILES,
      SO_MAX_MULTI_UPLOAD_BYTES,
      () => SO_MAX_SPREADSHEET_FILE_BYTES
    )) {
      target.value = '';
      return;
    }

    admUploadFiles.value = candidateAdmFiles;
    resetUploadSessionState(true);

    syncAdmUploadFileState();
    resetExcelPreviewState();
    target.value = '';

    if (
      admUploadFiles.value.length === previousCount &&
      selectedFiles.length > 0
    ) {
      notificationStore.showAlertWarning(
        'File yang dipilih sudah ada di daftar upload.'
      );
    }

    if (
      showExcelPasswordInput.value &&
      !excelPassword.value.trim()
    ) {
      /*
       * ADM terenkripsi baru dapat dideteksi setelah password
       * diisi. Scan dilakukan ketika user menekan Preview.
       */
      return;
    }

    await analyzeAdmUploadPeriods(false);
  };

  const buildAdmPreviewFormData = (
    file: File
  ) => {
    const formData = new FormData();

    formData.append('file', file);
    formData.append(
      'customer',
      selectedCustomerUpload.value
    );
    formData.append(
      'upload_period',
      selectedUploadPeriod.value
    );

    if (showExcelPasswordInput.value) {
      formData.append(
        'excel_password',
        excelPassword.value
      );
    }

    if (Object.keys(contractMaterialSelections.value).length > 0) {
      formData.set(
        'material_choices',
        JSON.stringify(contractMaterialSelections.value)
      );
    }

    return formData;
  };

  const applyAdmPreviewResponse = (
    data: any,
    openModal = false
  ) => {
    excelSheetNames.value =
      Array.isArray(data?.sheet_names)
        ? data.sheet_names
        : [];

    selectedExcelSheet.value =
      String(data?.active_sheet ?? '');

    excelPreviewHeaders.value =
      Array.isArray(data?.headers)
        ? data.headers
        : [];

    excelPreviewRows.value =
      Array.isArray(data?.rows)
        ? data.rows
        : [];

    admUploadPreviewSummaryByPlant.value =
      data?.preview_summary_by_plant &&
        typeof data.preview_summary_by_plant === 'object'
        ? data.preview_summary_by_plant
        : {};

    if (openModal) {
      showUploadPreview.value = true;
    }
  };

  const requestAdmPreview = async (
    file: File
  ): Promise<any> => {
    const data: any =
      await customerOrderService
        .previewExcel(
          buildAdmPreviewFormData(file)
        );

    if (data?.status !== 'success') {
      throw new Error(
        data?.message ||
        `Preview ${file.name} gagal.`
      );
    }

    return data;
  };

  const refreshAdmPreviewForSelectedPeriod = async (
    openModal = false
  ): Promise<boolean> => {
    const firstFile =
      admUploadFiles.value[0];

    if (!firstFile) {
      return false;
    }

    if (
      showExcelPasswordInput.value &&
      !excelPassword.value.trim()
    ) {
      return false;
    }

    const passwordVersion = admPreviewPasswordVersion;
    const passwordSnapshot = excelPassword.value;

    try {
      isPreviewLoading.value = true;
      excelPreviewError.value = '';

      const data =
        await requestAdmPreview(firstFile);

      // User masih mengetik / mengganti password ketika request berjalan.
      // Abaikan response lama agar tidak menimpa preview password terbaru.
      if (
        isStaleAdmPasswordAttempt(
          passwordVersion,
          passwordSnapshot
        )
      ) {
        return false;
      }

      applyAdmPreviewResponse(
        data,
        openModal
      );

      if (openModal) {
        await validateAdmPreviewContract(data);
      }

      return true;
    } catch (error: any) {
      // Error dari request password lama/parsial tidak boleh muncul sebagai
      // "password incorrect" setelah user sudah menyelesaikan password baru.
      if (
        isStaleAdmPasswordAttempt(
          passwordVersion,
          passwordSnapshot
        )
      ) {
        return false;
      }

      console.error(
        'Preview Excel ADM gagal:',
        error
      );

      excelPreviewError.value =
        error?.response?.data?.message ||
        error?.message ||
        'Preview Excel gagal diproses oleh server';

      if (openModal) {
        showUploadPreview.value = true;
      }

      return false;
    } finally {
      isPreviewLoading.value = false;
    }
  };

  const analyzeAdmUploadPeriods = async (
    openChoice = true,
    refreshPreview = true
  ): Promise<boolean> => {
    if (admUploadFiles.value.length === 0) {
      resetUploadDeliveryPeriodDetection();
      return false;
    }

    if (
      showExcelPasswordInput.value &&
      !excelPassword.value.trim()
    ) {
      return false;
    }

    if (isAnalyzingUploadPeriods.value) {
      return false;
    }

    const passwordVersion = admPreviewPasswordVersion;
    const passwordSnapshot = excelPassword.value;

    try {
      isAnalyzingUploadPeriods.value = true;

      const merged =
        new Map<string, UploadDeliveryPeriodOption>();

      for (const file of admUploadFiles.value) {
        const data =
          await requestAdmPreview(file);

        if (
          isStaleAdmPasswordAttempt(
            passwordVersion,
            passwordSnapshot
          )
        ) {
          return false;
        }

        const options =
          normalizeUploadDeliveryPeriodOptions(
            data?.available_periods
          );

        options.forEach((item) => {
          const existing = merged.get(item.period);

          merged.set(item.period, {
            ...item,
            count:
              (existing?.count ?? 0) +
              item.count
          });
        });
      }

      if (
        isStaleAdmPasswordAttempt(
          passwordVersion,
          passwordSnapshot
        )
      ) {
        return false;
      }

      const options =
        Array.from(merged.values())
          .sort(
            (a, b) =>
              a.period.localeCompare(b.period)
          );

      setDetectedUploadPeriods(
        options,
        openChoice
      );

      if (
        refreshPreview &&
        options.some(
          (item) =>
            item.period ===
            selectedUploadPeriod.value
        )
      ) {
        await refreshAdmPreviewForSelectedPeriod(false);
      }

      return options.length > 0;
    } catch (error: any) {
      if (
        isStaleAdmPasswordAttempt(
          passwordVersion,
          passwordSnapshot
        )
      ) {
        return false;
      }

      console.error(
        'Deteksi bulan Delivery Date ADM gagal:',
        error
      );

      notificationStore.showAlertError(
        error?.response?.data?.message ||
        error?.message ||
        'Gagal mendeteksi bulan Delivery Date dari Excel.'
      );

      return false;
    } finally {
      isAnalyzingUploadPeriods.value = false;
    }
  };

  const loadEncryptedExcelPreview = async () => {
    if (!uploadFiles.value) {
      return;
    }

    if (!excelPassword.value.trim()) {
      notificationStore.showAlertWarning(
        'Masukkan password Excel terlebih dahulu.'
      );
      return;
    }

    /*
     * Deteksi bulan dilakukan lebih dulu. Jika multi-bulan,
     * modal pilihan bulan mendapat prioritas dan preview baru
     * dibuka setelah user menentukan bulan.
     */
    await analyzeAdmUploadPeriods(true, false);

    if (showUploadDeliveryPeriodChoice.value) {
      return;
    }

    await refreshAdmPreviewForSelectedPeriod(true);
  };

  const buildTmminUploadFormData = () => {
    const formData =
      new FormData();

    tmminSoUploadFiles.value
      .forEach((file) => {
        formData.append(
          'files[]',
          file
        );
      });

    tmminSoExcludedTxtEntries.value
      .forEach((key) => {
        formData.append(
          'exclude_entries[]',
          key
        );
      });

    formData.append(
      'customer',
      'TMMIN'
    );

    formData.append(
      'upload_period',
      selectedUploadPeriod.value
    );

    if (
      finalUploadUser.value
        .trim() !== ''
    ) {
      formData.append(
        'upload_by',
        finalUploadUser.value
      );
    }

    if (Object.keys(contractMaterialSelections.value).length > 0) {
      formData.set(
        'material_choices',
        JSON.stringify(contractMaterialSelections.value)
      );
    }

    return formData;
  };

  const applyTmminPreviewResponse = (
    response: any,
    openModal: boolean
  ) => {
    const detected =
      Array.isArray(
        response?.detected_txt_files
      )
        ? response.detected_txt_files
        : [];

    tmminSoDetectedTxtFiles.value =
      detected
        .map((file: any) => ({
          key: String(
            file?.key ??
            ''
          ),
          name: String(
            file?.name ??
            ''
          ),
          archiveName: String(
            file?.archive_name ??
            ''
          ),
          entryName: String(
            file?.entry_name ??
            file?.name ??
            ''
          )
        }))
        .filter(
          (file: TmminDetectedTxtFile) =>
            file.key !== '' &&
            file.name !== ''
        );

    const previewRows =
      Array.isArray(
        response?.preview_data
      )
        ? response.preview_data
          .map(
            mapTmminRawSoRowFromBackend
          )
        : [];

    tmminRawSoPreviewRows.value =
      previewRows;

    tmminRawSoPreviewContractMaterials.value =
      Array.isArray(response?.contract_materials)
        ? response.contract_materials
            .map((value: unknown) => String(value ?? '').trim())
            .filter((value: string) => value !== '')
        : [];

    tmminUploadPreviewSummary.value =
      response?.preview_summary &&
        typeof response.preview_summary === 'object'
        ? response.preview_summary
        : {};

    syncTmminUploadFileState();

    if (openModal) {
      openTmminRawSoPreview(
        previewRows
      );
    }
  };

  const refreshTmminUploadDetection = async (
    openModal = false,
    openPeriodChoice = true
  ): Promise<boolean> => {
    if (
      tmminSoUploadFiles.value.length === 0
    ) {
      tmminSoDetectedTxtFiles.value = [];
      tmminRawSoPreviewRows.value = [];
      tmminRawSoPreviewContractMaterials.value = [];
      resetUploadDeliveryPeriodDetection();
      syncTmminUploadFileState();

      return false;
    }

    if (isPreviewLoading.value) {
      return false;
    }

    try {
      isPreviewLoading.value = true;

      const response: any =
        await customerOrderService
          .previewTmminRawSo(
            buildTmminUploadFormData()
          );

      if (
        response.status !==
        'success'
      ) {
        tmminSoDetectedTxtFiles.value = [];
        tmminRawSoPreviewRows.value = [];
        tmminRawSoPreviewContractMaterials.value = [];
        syncTmminUploadFileState();

        notificationStore
          .showAlertError(
            response.message ||
            'Preview Raw SO TMMIN gagal'
          );

        return false;
      }

      const options =
        normalizeUploadDeliveryPeriodOptions(
          response?.available_periods
        );

      setDetectedUploadPeriods(
        options,
        openPeriodChoice
      );

      const shouldOpenPreview =
        openModal &&
        !showUploadDeliveryPeriodChoice.value;

      applyTmminPreviewResponse(
        response,
        shouldOpenPreview
      );

      if (shouldOpenPreview) {
        await validateTmminPreviewContract();
      }

      return true;
    } catch (error: any) {
      console.error(
        'Preview Raw SO TMMIN gagal:',
        error
      );

      tmminSoDetectedTxtFiles.value = [];
      tmminRawSoPreviewRows.value = [];
      tmminRawSoPreviewContractMaterials.value = [];
      tmminUploadPreviewSummary.value = {};
      syncTmminUploadFileState();

      notificationStore
        .showAlertError(
          error?.response
            ?.data
            ?.message ||
          error?.message ||
          'Gagal membaca TXT / ZIP / RAR TMMIN'
        );

      return false;
    } finally {
      isPreviewLoading.value = false;
    }
  };



  watch(asiAdmServicePartDeliveryDate, () => {
    asiAdmRawSoPreviewRows.value = [];
    asiAdmRawSoPreviewSummary.value = null;
    asiAdmRawSoPreviewErrors.value = [];
    asiAdmRawSoCanSubmitPreview.value = false;
    showAsiAdmRawSoPreview.value = false;
    clearMissingContractPartsPreview();
  });

  const buildAsiAdmUploadFormData = () => {
    const formData = new FormData();

    asiAdmSoUploadFiles.value.forEach((file) => {
      formData.append('files[]', file);
    });

    formData.append('customer', 'ASI ADM');
    formData.append('upload_period', selectedUploadPeriod.value);

    if (
      asiAdmDetectedOrderType.value === 'SERVICE PART' &&
      asiAdmServicePartDeliveryDate.value.trim() !== ''
    ) {
      formData.append(
        'delivery_date',
        asiAdmServicePartDeliveryDate.value.trim()
      );
    }

    if (finalUploadUser.value.trim() !== '') {
      formData.append('upload_by', finalUploadUser.value);
    }

    return formData;
  };

  const applyAsiAdmPreviewResponse = (
    response: any,
    openModal = false
  ) => {
    asiAdmRawSoPreviewRows.value =
      Array.isArray(response?.preview_data)
        ? response.preview_data.map(mapAsiAdmRawSoRowFromBackend)
        : [];

    asiAdmRawSoPreviewSummary.value =
      response?.preview_summary ?? null;

    asiAdmRawSoPreviewErrors.value =
      Array.isArray(response?.validation_errors)
        ? response.validation_errors.map((value: unknown) => String(value ?? ''))
        : [];

    const detectedType = String(response?.order_type ?? '')
      .trim()
      .toUpperCase();

    if (detectedType === 'REGULAR' || detectedType === 'SERVICE PART') {
      asiAdmDetectedOrderType.value =
        detectedType as AsiAdmRawSoOrderType;
    }

    if (Array.isArray(response?.file_types)) {
      asiAdmFileTypes.value = response.file_types.map((item: any) => ({
        file_name: String(item?.file_name ?? ''),
        order_type: String(item?.order_type ?? ''),
        total_items: Number(item?.total_items ?? 0)
      }));
    }

    const missingParts = normalizeContractPreviewMaterials(
      Array.isArray(response?.missing_contract_parts)
        ? response.missing_contract_parts
        : []
    );

    resetMissingContractPartsCopiedState();

    missingContractPartsPeriod.value =
      normalizeContractPreviewPeriod(
        response?.selected_period ?? selectedUploadPeriod.value
      );

    missingContractPartGroups.value =
      missingParts.length > 0
        ? [{
            customer: 'ASI ADM',
            revision:
              response?.contract_revision === null ||
              response?.contract_revision === undefined
                ? null
                : Number(response.contract_revision),
            parts: missingParts
          }]
        : [];

    showMissingContractPartsModal.value =
      openModal && missingParts.length > 0;

    asiAdmRawSoCanSubmitPreview.value =
      Boolean(response?.can_submit) &&
      asiAdmRawSoPreviewErrors.value.length === 0 &&
      missingParts.length === 0;

    if (openModal) {
      showAsiAdmRawSoPreview.value = true;
    }
  };

  const refreshAsiAdmUploadPreview = async (
    openModal = false
  ): Promise<boolean> => {
    if (asiAdmSoUploadFiles.value.length === 0) {
      asiAdmRawSoPreviewRows.value = [];
      asiAdmRawSoPreviewSummary.value = null;
      asiAdmRawSoPreviewErrors.value = [];
      asiAdmRawSoCanSubmitPreview.value = false;
      return false;
    }

    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(selectedUploadPeriod.value)) {
      notificationStore.showAlertWarning(
        'Pilih periode Ordering ASI ADM terlebih dahulu.'
      );
      return false;
    }

    if (asiAdmDetectedOrderType.value === '') {
      const inspected = await inspectAsiAdmCandidateFiles(
        [...asiAdmSoUploadFiles.value]
      );
      if (!inspected) return false;
    }

    if (isPreviewLoading.value) {
      return false;
    }

    try {
      isPreviewLoading.value = true;

      const response = await customerOrderService.previewAsiAdmRawSo(
        buildAsiAdmUploadFormData()
      );

      if (response.status !== 'success') {
        asiAdmRawSoPreviewRows.value = [];
        asiAdmRawSoPreviewSummary.value = null;
        asiAdmRawSoPreviewErrors.value =
          Array.isArray(response.validation_errors)
            ? response.validation_errors
            : [response.message || 'Preview Raw Ordering ASI ADM gagal'];
        asiAdmRawSoCanSubmitPreview.value = false;

        notificationStore.showAlertError(
          response.message || 'Preview Raw Ordering ASI ADM gagal'
        );
        return false;
      }

      applyAsiAdmPreviewResponse(response, openModal);
      return true;
    } catch (error: any) {
      console.error('Preview Raw Ordering ASI ADM gagal:', error);
      asiAdmRawSoPreviewRows.value = [];
      asiAdmRawSoPreviewSummary.value = null;
      asiAdmRawSoPreviewErrors.value = [
        error?.response?.data?.message ||
        error?.message ||
        'Gagal membaca PDF Ordering ASI ADM'
      ];
      asiAdmRawSoCanSubmitPreview.value = false;
      clearMissingContractPartsPreview();

      notificationStore.showAlertError(
        asiAdmRawSoPreviewErrors.value[0]
      );
      return false;
    } finally {
      isPreviewLoading.value = false;
    }
  };

  const buildGayaUploadFormData = () => {
    const formData = new FormData();

    gayaSoUploadFiles.value.forEach((file) => {
      formData.append('files[]', file);
    });

    formData.append('customer', 'GAYA MTR');
    formData.append('upload_period', selectedUploadPeriod.value);

    if (finalUploadUser.value.trim() !== '') {
      formData.append('upload_by', finalUploadUser.value);
    }

    return formData;
  };

  const applyGayaPreviewResponse = (
    response: any,
    openModal = false
  ) => {
    gayaRawSoPreviewRows.value =
      Array.isArray(response?.preview_data)
        ? response.preview_data.map(mapGayaRawSoRowFromBackend)
        : [];

    gayaUploadPreviewSummary.value =
      response?.preview_summary ?? null;

    /*
     * Preview Gaya Motor sekarang dipisahkan per file PDF.
     * Pertahankan file aktif bila masih ada; kalau tidak, buka file pertama
     * sesuai urutan file yang dipilih user.
     */
    const previewFileNames = [
      ...gayaSoUploadFiles.value.map((file) => file.name),
      ...gayaRawSoPreviewRows.value.map((row) => row.sourceFile)
    ].filter((name, index, values) => {
      const normalized = String(name ?? '').trim();
      return normalized !== '' && values.indexOf(name) === index;
    });

    if (
      gayaRawSoActivePreviewFile.value === '' ||
      !previewFileNames.includes(gayaRawSoActivePreviewFile.value)
    ) {
      gayaRawSoActivePreviewFile.value =
        previewFileNames[0] ?? '';
    }

    if (openModal) {
      showGayaRawSoPreview.value = true;
    }
  };

  const refreshGayaUploadDetection = async (
    openModal = false,
    openPeriodChoice = true
  ): Promise<boolean> => {
    if (gayaSoUploadFiles.value.length === 0) {
      gayaRawSoPreviewRows.value = [];
      gayaUploadPreviewSummary.value = null;
      gayaRawSoActivePreviewFile.value = '';
      resetUploadDeliveryPeriodDetection();
      return false;
    }

    if (isPreviewLoading.value) {
      return false;
    }

    try {
      isPreviewLoading.value = true;

      const response: any =
        await customerOrderService.previewGayaRawSo(
          buildGayaUploadFormData()
        );

      if (response.status !== 'success') {
        gayaRawSoPreviewRows.value = [];
        gayaUploadPreviewSummary.value = null;
        gayaRawSoActivePreviewFile.value = '';
        notificationStore.showAlertError(
          response.message || 'Preview Raw SO Gaya Motor gagal'
        );
        return false;
      }

      const options = normalizeUploadDeliveryPeriodOptions(
        response?.available_periods
      );

      setDetectedUploadPeriods(options, openPeriodChoice);
      const shouldOpenPreview =
        openModal && !showUploadDeliveryPeriodChoice.value;

      applyGayaPreviewResponse(
        response,
        shouldOpenPreview
      );

      if (shouldOpenPreview) {
        await validateGayaPreviewContract(response);
      }

      return true;
    } catch (error: any) {
      console.error('Preview Raw SO Gaya Motor gagal:', error);
      gayaRawSoPreviewRows.value = [];
      gayaUploadPreviewSummary.value = null;
      gayaRawSoActivePreviewFile.value = '';
      notificationStore.showAlertError(
        error?.response?.data?.message ||
        error?.message ||
        'Gagal membaca PDF Gaya Motor'
      );
      return false;
    } finally {
      isPreviewLoading.value = false;
    }
  };

  const buildNtcUploadFormData = () => {
    const formData = new FormData();

    ntcSoUploadFiles.value.forEach(
      (file) => {
        formData.append(
          'files[]',
          file
        );
      }
    );

    formData.append(
      'customer',
      'NTC'
    );

    formData.append(
      'upload_period',
      selectedUploadPeriod.value
    );

    if (
      finalUploadUser.value
        .trim() !== ''
    ) {
      formData.append(
        'upload_by',
        finalUploadUser.value
      );
    }

    return formData;
  };

  const applyNtcPreviewResponse = (
    response: any,
    openModal = false
  ) => {
    const rows =
      Array.isArray(response?.preview_data)
        ? response.preview_data.map(
          mapNtcRawSoRowFromBackend
        )
        : [];

    ntcRawSoPreviewRows.value = rows;

    ntcRawSoPreviewContractMaterials.value =
      Array.isArray(response?.contract_materials)
        ? response.contract_materials
            .map((value: unknown) => String(value ?? '').trim())
            .filter((value: string) => value !== '')
        : [];

    ntcUploadPreviewSummaryBySite.value =
      Array.isArray(
        response?.preview_summary_by_site
      )
        ? response.preview_summary_by_site
        : [];

    if (openModal) {
      showNtcRawSoPreview.value = true;
    }
  };

  const refreshNtcUploadDetection = async (
    openModal = false,
    openPeriodChoice = true
  ): Promise<boolean> => {
    if (ntcSoUploadFiles.value.length === 0) {
      ntcRawSoPreviewRows.value = [];
      ntcRawSoPreviewContractMaterials.value = [];
      ntcUploadPreviewSummaryBySite.value = [];
      resetUploadDeliveryPeriodDetection();
      return false;
    }

    if (isPreviewLoading.value) {
      return false;
    }

    try {
      isPreviewLoading.value = true;

      const response: any =
        await customerOrderService
          .previewNtcRawSo(
            buildNtcUploadFormData()
          );

      if (response.status !== 'success') {
        ntcRawSoPreviewRows.value = [];
        ntcRawSoPreviewContractMaterials.value = [];
        ntcUploadPreviewSummaryBySite.value = [];

        notificationStore.showAlertError(
          response.message ||
          'Preview Raw SO NTC gagal'
        );

        return false;
      }

      const options =
        normalizeUploadDeliveryPeriodOptions(
          response?.available_periods
        );

      setDetectedUploadPeriods(
        options,
        openPeriodChoice
      );

      const shouldOpenPreview =
        openModal &&
        !showUploadDeliveryPeriodChoice.value;

      applyNtcPreviewResponse(
        response,
        shouldOpenPreview
      );

      if (shouldOpenPreview) {
        await validateNtcPreviewContract();
      }

      return true;
    } catch (error: any) {
      console.error(
        'Preview Raw SO NTC gagal:',
        error
      );

      ntcRawSoPreviewRows.value = [];
      ntcRawSoPreviewContractMaterials.value = [];
      ntcUploadPreviewSummaryBySite.value = [];

      notificationStore.showAlertError(
        error?.response?.data?.message ||
        error?.message ||
        'Gagal membaca CSV NTC'
      );

      return false;
    } finally {
      isPreviewLoading.value = false;
    }
  };

  const analyzeUploadDeliveryMonths = async (
    openChoice = false
  ): Promise<boolean> => {
    if (isNtcSoUpload.value) {
      return await refreshNtcUploadDetection(
        false,
        openChoice
      );
    }

    if (isTmminSoUpload.value) {
      return await refreshTmminUploadDetection(
        false,
        openChoice
      );
    }

    return await analyzeAdmUploadPeriods(
      openChoice
    );
  };

  const selectPendingUploadPeriod = (
    period: string
  ) => {
    const clean = String(period ?? '').trim();

    if (
      !uploadDeliveryPeriodOptions.value
        .some(
          (item) =>
            item.period === clean
        )
    ) {
      return;
    }

    pendingUploadPeriod.value = clean;
  };

  const closeUploadDeliveryPeriodChoice = () => {
    showUploadDeliveryPeriodChoice.value = false;
  };

  const confirmUploadDeliveryPeriodChoice = async () => {
    const period =
      String(pendingUploadPeriod.value ?? '').trim();

    if (
      !uploadDeliveryPeriodOptions.value
        .some(
          (item) =>
            item.period === period
        )
    ) {
      notificationStore.showAlertWarning(
        isDcwaSoUpload.value
          ? 'Pilih salah satu periode DCWA yang tersedia.'
          : isGayaSoUpload.value
            ? 'Pilih salah satu periode Gaya Motor berdasarkan tanggal DELIVERY pada nama file dan rule Agreement No yang tersedia.'
            : isTmminSoUpload.value
            ? 'Pilih salah satu periode nomor PO TMMIN yang tersedia.'
            : 'Pilih salah satu bulan Delivery Date yang tersedia.'
      );
      return;
    }

    selectedUploadPeriod.value = period;
    showUploadDeliveryPeriodChoice.value = false;

    if (isDpmSoUpload.value) {
      await refreshDpmUploadPreview(true, false);
      return;
    }

    if (isDcwaSoUpload.value) {
      await previewDcwaRawSo(period, true);
      return;
    }

    if (isGayaSoUpload.value) {
      await refreshGayaUploadDetection(true, false);
      return;
    }

    if (isNtcSoUpload.value) {
      await refreshNtcUploadDetection(
        true,
        false
      );
      return;
    }

    if (isTmminSoUpload.value) {
      await refreshTmminUploadDetection(
        true,
        false
      );
      return;
    }

    await refreshAdmPreviewForSelectedPeriod(true);
  };

  const handleSelectedUploadPeriodChange = async () => {
    const selected =
      String(selectedUploadPeriod.value ?? '').trim();

    if (
      uploadDeliveryPeriodOptions.value.length > 0 &&
      !uploadDeliveryPeriodOptions.value.some(
        (item) =>
          item.period === selected
      )
    ) {
      pendingUploadPeriod.value =
        uploadDeliveryPeriodOptions.value[0]?.period ?? '';
      showUploadDeliveryPeriodChoice.value = true;

      return;
    }

    pendingUploadPeriod.value = selected;
    showUploadDeliveryPeriodChoice.value = false;

    if (isFtiSoUpload.value) {
      ftiRawSoPreviewRows.value = [];
      ftiRawSoPreviewSummary.value = null;
      showFtiRawSoPreview.value = false;
      if (ftiAdditionalOrderEnabled.value) {
        ftiAdditionalOrderPreview.value = null;
        showFtiAdditionalOrderPreview.value = false;
        ftiAdditionalOrderScheduleConfirmed.value = false;
        ftiAdditionalOrderAllocationDrafts.value = {};
        if (ftiAdditionalOrderMode.value === 'MANUAL') {
          await loadFtiAdditionalManualParts();
        }
      }
      return;
    }

    if (isDpmSoUpload.value) {
      if (dpmSoUploadFiles.value.length > 0) {
        await refreshDpmUploadPreview(false, false);
      }
      return;
    }

    if (isDcwaSoUpload.value) {
      if (dcwaSoHasRequiredFileTypes.value) {
        await previewDcwaRawSo(selected, false);
      }
      return;
    }

    if (isAsiAdmSoUpload.value) {
      if (asiAdmSoUploadFiles.value.length > 0) {
        await refreshAsiAdmUploadPreview(false);
      }
      return;
    }

    if (isGayaSoUpload.value) {
      if (gayaSoUploadFiles.value.length > 0) {
        await refreshGayaUploadDetection(false, false);
      }
      return;
    }

    if (isNtcSoUpload.value) {
      if (ntcSoUploadFiles.value.length > 0) {
        await refreshNtcUploadDetection(
          false,
          false
        );
      }

      return;
    }

    if (isTmminSoUpload.value) {
      if (tmminSoUploadFiles.value.length > 0) {
        await refreshTmminUploadDetection(
          false,
          false
        );
      }

      return;
    }

    if (
      admUploadFiles.value.length > 0 &&
      (!showExcelPasswordInput.value ||
        excelPassword.value.trim() !== '')
    ) {
      await refreshAdmPreviewForSelectedPeriod(false);
    }
  };

  const removeTmminDetectedTxtFile = async (
    key: string
  ) => {
    const cleanKey =
      String(key ?? '')
        .trim();

    if (!cleanKey) {
      return;
    }

    if (
      !tmminSoExcludedTxtEntries.value
        .includes(cleanKey)
    ) {
      tmminSoExcludedTxtEntries.value
        .push(cleanKey);
    }

    tmminSoDetectedTxtFiles.value =
      tmminSoDetectedTxtFiles.value
        .filter(
          (file) =>
            file.key !==
            cleanKey
        );

    if (
      tmminSoDetectedTxtFiles.value.length === 0
    ) {
      /*
       * Semua TXT aktif sudah dihapus oleh user.
       *
       * Jangan pertahankan source TXT / ZIP / RAR di state karena UI akan
       * tetap menampilkan "x source files selected" walaupun tidak ada lagi
       * TXT yang aktif. Reset seluruh source selection agar form benar-benar
       * kembali ke kondisi belum memilih file.
       */
      tmminSoUploadFiles.value = [];
      tmminSoExcludedTxtEntries.value = [];
      tmminRawSoPreviewRows.value = [];
      tmminRawSoPreviewContractMaterials.value = [];
      tmminUploadPreviewSummary.value = {};

      uploadFiles.value = null;
      uploadFileName.value = '';

      resetUploadDeliveryPeriodDetection();
      resetExcelPreviewState();

      /*
       * Reset native <input type="file"> juga penting supaya file yang sama
       * bisa dipilih kembali dan event change tetap terpanggil.
       */
      if (uploadFileInput.value) {
        uploadFileInput.value.value = '';
      }

      return;
    }

    await refreshTmminUploadDetection(
      false
    );
  };

  const openUploadPreview = async () => {
    if (isMesSoUpload.value) {
      await refreshMesUploadPreview(true);
      return;
    }

    if (isFtiSoUpload.value) {
      if (ftiAdditionalOrderEnabled.value) {
        if (ftiAdditionalOrderMode.value === 'MANUAL') {
          await refreshFtiAdditionalManualPreview(true);
          return;
        }
        if (!ftiAdditionalOrderFile.value) {
          notificationStore.showAlertWarning('Pilih PDF Additional Order FTI terlebih dahulu.');
          return;
        }
        await refreshFtiAdditionalOrderPreview(true);
        return;
      }
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(selectedUploadPeriod.value)) {
        notificationStore.showAlertWarning('Pilih Bulan Upload FTI terlebih dahulu');
        return;
      }
      await refreshFtiUploadPreview(true);
      return;
    }

    if (isDpmSoUpload.value) {
      if (dpmSoUploadFiles.value.length === 0) {
        notificationStore.showAlertWarning('Pilih minimal satu file Excel DPM terlebih dahulu');
        return;
      }

      if (!hasDetectedUploadPeriods.value) {
        const detected = await refreshDpmUploadPreview(false, false);
        if (!detected) return;
      }

      if (hasMultipleUploadPeriods.value) {
        const selectedExists = uploadDeliveryPeriodOptions.value.some(
          (item) => item.period === selectedUploadPeriod.value
        );
        pendingUploadPeriod.value = selectedExists
          ? selectedUploadPeriod.value
          : uploadDeliveryPeriodOptions.value[0]?.period ?? '';
        showUploadDeliveryPeriodChoice.value = true;
        return;
      }

      if (uploadDeliveryPeriodOptions.value.length === 1) {
        selectedUploadPeriod.value = uploadDeliveryPeriodOptions.value[0].period;
        pendingUploadPeriod.value = uploadDeliveryPeriodOptions.value[0].period;
      }

      await refreshDpmUploadPreview(true, false);
      return;
    }

    if (isDcwaSoUpload.value) {
      if (!dcwaSoHasRequiredFileTypes.value) {
        notificationStore.showAlertWarning(
          'Pilih PDF DCWA terlebih dahulu. Regular memakai Excel + PDF; Special Order dapat PDF saja.'
        );
        return;
      }

      if (!hasDetectedUploadPeriods.value) {
        const detected = await analyzeDcwaUploadPeriods(false);
        if (!detected) return;
      }

      if (hasMultipleUploadPeriods.value) {
        const selectedExists = uploadDeliveryPeriodOptions.value.some(
          (item) => item.period === selectedUploadPeriod.value
        );
        pendingUploadPeriod.value = selectedExists
          ? selectedUploadPeriod.value
          : uploadDeliveryPeriodOptions.value[0]?.period ?? '';
        showUploadDeliveryPeriodChoice.value = true;
        return;
      }

      if (uploadDeliveryPeriodOptions.value.length === 1) {
        selectedUploadPeriod.value = uploadDeliveryPeriodOptions.value[0].period;
        pendingUploadPeriod.value = uploadDeliveryPeriodOptions.value[0].period;
      }

      await previewDcwaRawSo(selectedUploadPeriod.value, true);
      return;
    }


    if (isAsiAdmSoUpload.value) {
      if (asiAdmSoUploadFiles.value.length === 0) {
        notificationStore.showAlertWarning(
          'Pilih minimal satu PDF Purchase Order ASI ADM terlebih dahulu'
        );
        return;
      }

      await refreshAsiAdmUploadPreview(true);
      return;
    }

    if (isGayaSoUpload.value) {
      if (gayaSoUploadFiles.value.length === 0) {
        notificationStore.showAlertWarning(
          'Pilih minimal satu PDF Gaya Motor terlebih dahulu'
        );
        return;
      }

      if (!hasDetectedUploadPeriods.value) {
        const detected = await refreshGayaUploadDetection(false, true);
        if (!detected) return;
      }

      if (hasMultipleUploadPeriods.value) {
        const selectedExists = uploadDeliveryPeriodOptions.value.some(
          (item) => item.period === selectedUploadPeriod.value
        );
        pendingUploadPeriod.value = selectedExists
          ? selectedUploadPeriod.value
          : uploadDeliveryPeriodOptions.value[0]?.period ?? '';
        showUploadDeliveryPeriodChoice.value = true;
        return;
      }

      if (uploadDeliveryPeriodOptions.value.length === 1) {
        selectedUploadPeriod.value = uploadDeliveryPeriodOptions.value[0].period;
        pendingUploadPeriod.value = uploadDeliveryPeriodOptions.value[0].period;
      }

      await refreshGayaUploadDetection(true, false);
      return;
    }

    if (isNtcSoUpload.value) {
      if (ntcSoUploadFiles.value.length === 0) {
        notificationStore.showAlertWarning(
          'Pilih minimal satu file CSV NTC terlebih dahulu'
        );
        return;
      }

      if (!hasDetectedUploadPeriods.value) {
        const detected =
          await refreshNtcUploadDetection(
            false,
            true
          );

        if (!detected) {
          return;
        }
      }

      if (hasMultipleUploadPeriods.value) {
        const selectedExists =
          uploadDeliveryPeriodOptions.value.some(
            (item) =>
              item.period ===
              selectedUploadPeriod.value
          );

        pendingUploadPeriod.value =
          selectedExists
            ? selectedUploadPeriod.value
            : uploadDeliveryPeriodOptions.value[0]?.period ?? '';

        showUploadDeliveryPeriodChoice.value = true;
        return;
      }

      if (uploadDeliveryPeriodOptions.value.length === 1) {
        selectedUploadPeriod.value =
          uploadDeliveryPeriodOptions.value[0].period;
        pendingUploadPeriod.value =
          uploadDeliveryPeriodOptions.value[0].period;
      }

      await refreshNtcUploadDetection(
        true,
        false
      );

      return;
    }

    if (isTmminSoUpload.value) {
      if (
        tmminSoUploadFiles.value.length === 0
      ) {
        notificationStore.showAlertWarning(
          'Pilih file TXT, ZIP, atau RAR TMMIN terlebih dahulu'
        );
        return;
      }

      /*
       * Preview sekali klik:
       * - satu periode -> otomatis pilih + buka preview,
       * - multi-periode -> tampilkan pilihan periode.
       */
      if (!hasDetectedUploadPeriods.value) {
        const detected =
          await refreshTmminUploadDetection(
            false,
            true
          );

        if (!detected) {
          return;
        }
      }

      if (hasMultipleUploadPeriods.value) {
        const selectedExists =
          uploadDeliveryPeriodOptions.value.some(
            (item) =>
              item.period ===
              selectedUploadPeriod.value
          );

        pendingUploadPeriod.value =
          selectedExists
            ? selectedUploadPeriod.value
            : uploadDeliveryPeriodOptions.value[0]?.period ?? '';

        showUploadDeliveryPeriodChoice.value = true;
        return;
      }

      if (uploadDeliveryPeriodOptions.value.length === 1) {
        selectedUploadPeriod.value =
          uploadDeliveryPeriodOptions.value[0].period;
        pendingUploadPeriod.value =
          uploadDeliveryPeriodOptions.value[0].period;
      }

      await refreshTmminUploadDetection(
        true,
        false
      );

      return;
    }

    if (!uploadFiles.value) {
      notificationStore.showAlertWarning(
        'Pilih file Excel terlebih dahulu'
      );
      return;
    }

    if (
      showExcelPasswordInput.value &&
      !excelPassword.value.trim()
    ) {
      notificationStore.showAlertWarning(
        'Masukkan password Excel terlebih dahulu untuk melihat preview'
      );
      return;
    }

    /*
     * Preview ADM sekali klik:
     * - bila scan belum ada, deteksi Delivery Date dulu,
     * - satu bulan -> otomatis gunakan bulan itu dan buka preview,
     * - dua bulan atau lebih -> user pilih bulan, lalu preview
     *   otomatis dibuka dari confirmUploadDeliveryPeriodChoice().
     */
    if (!hasDetectedUploadPeriods.value) {
      const detected =
        await analyzeAdmUploadPeriods(true, false);

      if (!detected) {
        return;
      }
    }

    if (hasMultipleUploadPeriods.value) {
      const selectedExists =
        uploadDeliveryPeriodOptions.value.some(
          (item) =>
            item.period ===
            selectedUploadPeriod.value
        );

      pendingUploadPeriod.value =
        selectedExists
          ? selectedUploadPeriod.value
          : uploadDeliveryPeriodOptions.value[0]?.period ?? '';

      showUploadDeliveryPeriodChoice.value = true;
      return;
    }

    if (uploadDeliveryPeriodOptions.value.length === 1) {
      selectedUploadPeriod.value =
        uploadDeliveryPeriodOptions.value[0].period;
      pendingUploadPeriod.value =
        uploadDeliveryPeriodOptions.value[0].period;
    }

    await refreshAdmPreviewForSelectedPeriod(true);
  };
  const closeUploadPreview = () => {
    showUploadPreview.value = false;
  };

  /*
   * Sinkronkan tabel utama setelah ada file ADM yang benar-benar sudah
   * tersimpan. Helper ini dipakai baik ketika seluruh batch sukses maupun
   * ketika batch berhenti di tengah jalan, supaya user langsung melihat
   * file yang sudah COMMIT dan tidak mengira seluruh upload gagal.
   */
  const refreshAdmUploadResultTables = async (closeAndReset = false) => {
    const uploadedCustomers =
      isAdmP1P4CombinedUpload.value
        ? ['ADM P1', 'ADM P4']
        : [selectedCustomerUpload.value];

    selectedCustomers.value = [
      ...uploadedCustomers
    ];

    draftSelectedCustomers.value = [
      ...uploadedCustomers
    ];

    card2CurrentPage.value = 1;
    formatSOCurrentPage.value = 1;
    currentPage.value = 1;

    // Batch ADM yang baru disimpan harus kembali terlihat dari urutan terbaru.
    sortKey.value = null;
    sortDirection.value = 'none';
    card2SortColumn.value = null;
    card2SortDirection.value = 'none';
    formatSOSortKey.value = null;
    formatSOSortDirection.value = 'none';

    invalidateTrackingFilterOptionsCache();

    await fetchCard2Data();
    await loadFormatSalesOrder();
    await loadTrackingData();
    await nextTick();
    currentPage.value = 1;

    if (!closeAndReset) {
      return;
    }

    showUploadModal.value = false;
    showUploadPreview.value = false;
    showCustomerDropdown.value = false;
    showUploadUserDropdown.value = false;
    resetUploadForm();
  };

  const submitUploadForm = async () => {
    if (!requireUploadSoPermission('create')) {
      return;
    }

    if (!selectedCustomerUpload.value) {
      notificationStore.showAlertWarning('Customer wajib dipilih');
      return;
    }

    if (isMesSoUpload.value) {
      if (mesSoUploadFiles.value.length === 0) {
        notificationStore.showAlertWarning('Pilih minimal satu PDF Purchase Order / RFQ MES.');
        return;
      }
      if (!finalUploadUser.value) {
        notificationStore.showAlertWarning('Upload By wajib dipilih');
        return;
      }

      const previewOk = await refreshMesUploadPreview(false);
      if (!previewOk) return;

      if (hasUnresolvedMesPartNameConflict.value) {
        showMesRawSoPreview.value = true;
        notificationStore.showAlertWarning(
          'Ada Part Name PDF yang berbeda dengan Contract MES. Pilih nama yang akan dipakai sebelum Submit.'
        );
        return;
      }

      notificationStore.showConfirm(
        'Konfirmasi Upload Sales Order MES',
        `Parse ${mesSoUploadFiles.value.length} PDF MES periode ${selectedUploadPeriodLabel.value || selectedUploadPeriod.value}, lalu generate Raw Sales Order, Format SO, dan Tracking?`,
        async () => {
          try {
            isUploading.value = true;
            const response = await customerOrderService.uploadMesRawSo(buildMesUploadFormData(true));
            if (response.status !== 'success') {
              if (openMissingContractPartsFromUploadResponse(response, 'MES')) return;
              notificationStore.showAlertError(response.message || 'Upload Sales Order MES gagal');
              return;
            }

            notificationStore.showAlertSuccess(response.message);
            await loadCustomerOptions();
            selectedCustomers.value = ['MES'];
            draftSelectedCustomers.value = ['MES'];
            mesRawSoCurrentPage.value = 1;
            formatSOCurrentPage.value = 1;
            currentPage.value = 1;
            invalidateTrackingFilterOptionsCache();

            await Promise.all([
              fetchMesRawSoData(),
              loadFormatSalesOrder(),
              loadTrackingData()
            ]);
            await nextTick();
            showMesRawSoPreview.value = false;
            showUploadModal.value = false;
            resetUploadForm();
          } catch (error: any) {
            const payload = error?.response?.data;
            if (payload && openMissingContractPartsFromUploadResponse(payload, 'MES')) return;
            notificationStore.showAlertError(
              payload?.message || error?.message || 'Upload Sales Order MES gagal'
            );
          } finally {
            isUploading.value = false;
          }
        }
      );
      return;
    }

    if (isFtiSoUpload.value) {
      if (ftiAdditionalOrderEnabled.value) {
        if (!finalUploadUser.value) {
          notificationStore.showAlertWarning('Upload By wajib dipilih');
          return;
        }

        if (ftiAdditionalOrderMode.value === 'MANUAL') {
          const manualItems = buildFtiAdditionalManualItems();
          if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(selectedUploadPeriod.value)) {
            notificationStore.showAlertWarning('Pilih Bulan Upload FTI terlebih dahulu.');
            return;
          }
          if (ftiAdditionalManualPoNumber.value.trim() === '') {
            notificationStore.showAlertWarning('PO Number Additional Order wajib diisi.');
            return;
          }
          if (!isFtiAdditionalManualPoNumberValid.value) {
            notificationStore.showAlertWarning(
              `PO Number FTI harus tepat 10 digit. Saat ini ${ftiAdditionalManualPoNumberLength.value}/10 digit.`
            );
            return;
          }
          if (manualItems.length === 0) {
            notificationStore.showAlertWarning('Isi minimal satu Qty Additional Order yang lebih dari 0.');
            return;
          }
          if (!ftiAdditionalOrderPreview.value || ftiAdditionalOrderPreview.value.source_mode !== 'MANUAL') {
            const previewOk = await refreshFtiAdditionalManualPreview(true);
            if (previewOk) {
              notificationStore.showAlertWarning('Preview Schedule sudah dibuat. Periksa lalu klik Konfirmasi Schedule sebelum Submit.');
            }
            return;
          }

          if (!isFtiAdditionalOrderAllocationValid.value) {
            notificationStore.showAlertWarning(
              'Total Additional Qty setiap part harus sama dengan Target Qty sebelum Submit.'
            );
            return;
          }

          if (!ftiAdditionalOrderScheduleConfirmed.value) {
            notificationStore.showAlertWarning(
              'Schedule Additional Order belum dikonfirmasi. Buka Preview Plan lalu klik Konfirmasi Schedule terlebih dahulu.'
            );
            return;
          }

          const preview = ftiAdditionalOrderPreview.value;
          notificationStore.showConfirm(
            'Konfirmasi Additional Order FTI Manual',
            `Simpan Additional Order PO ${preview.po_number} periode ${preview.selected_period} dengan total tambahan ${preview.total_required_qty.toLocaleString('id-ID')}? Qty hasil generate pada Preview dapat disesuaikan user dan pembagian yang tampil sekarang akan dipakai. Format SO dan Tracking akan dibuat otomatis.`,
            async () => {
              try {
                isUploading.value = true;
                const response = await customerOrderService.uploadFtiAdditionalManualOrder({
                  upload_period: String(selectedUploadPeriod.value ?? '').trim(),
                  po_number: ftiAdditionalManualPoNumber.value.trim(),
                  items: buildFtiAdditionalManualItems(),
                  upload_by: finalUploadUser.value,
                  preview_signature: preview.preview_signature,
                  allocations: buildFtiAdditionalOrderAllocations()
                });

                if (response.status !== 'success') {
                  notificationStore.showAlertError(response.message || 'Upload Additional Order FTI manual gagal');
                  return;
                }

                notificationStore.showAlertSuccess(response.message);
                await loadCustomerOptions();
                selectedCustomers.value = ['FTI'];
                draftSelectedCustomers.value = ['FTI'];
                invalidateTrackingFilterOptionsCache();

                await Promise.all([
                  fetchFtiRawSoData(),
                  loadFormatSalesOrder(),
                  loadTrackingData()
                ]);
                showFtiAdditionalOrderPreview.value = false;
                showUploadModal.value = false;
                resetUploadForm();
              } catch (error: any) {
                notificationStore.showAlertError(
                  error?.response?.data?.message || error?.message || 'Upload Additional Order FTI manual gagal'
                );
              } finally {
                isUploading.value = false;
              }
            }
          );
          return;
        }

        // Mode OCR lama tetap dipertahankan tanpa mengubah flow existing.
        if (!ftiAdditionalOrderFile.value) {
          notificationStore.showAlertWarning('Pilih PDF Additional Order FTI terlebih dahulu.');
          return;
        }
        if (!ftiAdditionalOrderPreview.value || ftiAdditionalOrderPreview.value.source_mode === 'MANUAL') {
          const previewOk = await refreshFtiAdditionalOrderPreview(true);
          if (previewOk) {
            notificationStore.showAlertWarning('Preview Schedule sudah dibuat. Periksa lalu klik Konfirmasi Schedule sebelum Submit.');
          }
          return;
        }
        if (!isFtiAdditionalOrderAllocationValid.value) {
          notificationStore.showAlertWarning('Total Qty Additional Order belum sesuai dengan Qty yang harus dialokasikan.');
          return;
        }

        if (!ftiAdditionalOrderScheduleConfirmed.value) {
          notificationStore.showAlertWarning(
            'Schedule Additional Order belum dikonfirmasi. Buka Preview lalu klik Konfirmasi Schedule terlebih dahulu.'
          );
          return;
        }

        const preview = ftiAdditionalOrderPreview.value;
        notificationStore.showConfirm(
          'Konfirmasi Additional Order FTI',
          `Simpan Additional Order PO ${preview.po_number} periode ${preview.selected_period} dengan total tambahan ${preview.total_required_qty.toLocaleString('id-ID')}? Format SO dan Tracking akan dibuat otomatis.`,
          async () => {
            try {
              isUploading.value = true;
              const formData = new FormData();
              formData.append('file', ftiAdditionalOrderFile.value as File);
              formData.append('upload_by', finalUploadUser.value);
              formData.append('preview_signature', preview.preview_signature);
              formData.append('allocations', JSON.stringify(buildFtiAdditionalOrderAllocations()));

              const response = await customerOrderService.uploadFtiAdditionalOrder(formData);
              if (response.status !== 'success') {
                notificationStore.showAlertError(response.message || 'Upload Additional Order FTI gagal');
                return;
              }

              notificationStore.showAlertSuccess(response.message);
              await loadCustomerOptions();
              selectedCustomers.value = ['FTI'];
              draftSelectedCustomers.value = ['FTI'];
              invalidateTrackingFilterOptionsCache();

              await Promise.all([
                fetchFtiRawSoData(),
                loadFormatSalesOrder(),
                loadTrackingData()
              ]);
              showFtiAdditionalOrderPreview.value = false;
              showUploadModal.value = false;
              resetUploadForm();
            } catch (error: any) {
              notificationStore.showAlertError(
                error?.response?.data?.message || error?.message || 'Upload Additional Order FTI gagal'
              );
            } finally {
              isUploading.value = false;
            }
          }
        );
        return;
      }

      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(selectedUploadPeriod.value)) {
        notificationStore.showAlertWarning('Pilih Bulan Upload FTI terlebih dahulu');
        return;
      }
      if (!finalUploadUser.value) {
        notificationStore.showAlertWarning('Upload By wajib dipilih');
        return;
      }
      const previewOk = await refreshFtiUploadPreview(false);
      if (!previewOk) return;
      notificationStore.showConfirm(
        'Konfirmasi Generate FTI',
        `Generate dan simpan Raw Sales Order FTI periode ${selectedUploadPeriodLabel.value || selectedUploadPeriod.value} dari ZSTT? Raw FTI akan langsung membentuk Format SO dan Tracking setelah validasi Contract berhasil.`,
        async () => {
          try {
            isUploading.value = true;
            const response = await customerOrderService.uploadFtiRawSo({
              upload_period: String(selectedUploadPeriod.value ?? '').trim(),
              upload_by: finalUploadUser.value
            });
            if (response.status !== 'success') {
              notificationStore.showAlertError(response.message || 'Generate Raw SO FTI gagal');
              return;
            }
            notificationStore.showAlertSuccess(response.message);
            await loadCustomerOptions();
            selectedCustomers.value = ['FTI'];
            draftSelectedCustomers.value = ['FTI'];
            invalidateTrackingFilterOptionsCache();

            await Promise.all([
              fetchFtiRawSoData(),
              loadFormatSalesOrder(),
              loadTrackingData()
            ]);
            showUploadModal.value = false;
            resetUploadForm();
          } catch (error: any) {
            notificationStore.showAlertError(error?.response?.data?.message || error?.message || 'Generate Raw SO FTI gagal');
          } finally {
            isUploading.value = false;
          }
        }
      );
      return;
    }

    if (isDpmSoUpload.value) {
      if (dpmSoUploadFiles.value.length === 0) {
        notificationStore.showAlertWarning('File Excel DPM wajib dipilih');
        return;
      }
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(selectedUploadPeriod.value)) {
        notificationStore.showAlertWarning('Pilih Bulan Upload DPM terlebih dahulu');
        return;
      }
      if (
        uploadDeliveryPeriodOptions.value.length > 0 &&
        !uploadDeliveryPeriodOptions.value.some(
          (item) => item.period === selectedUploadPeriod.value
        )
      ) {
        showUploadDeliveryPeriodChoice.value = true;
        notificationStore.showAlertWarning(
          'Bulan Upload tidak ditemukan pada Delivery Date file DPM. Pilih periode yang terdeteksi.'
        );
        return;
      }
      if (!finalUploadUser.value) {
        notificationStore.showAlertWarning('Upload By wajib dipilih');
        return;
      }

      /*
       * Re-validate file yang masih berada di form tepat sebelum submit.
       * Warning duplicate tidak dibuka lagi di sini agar tidak menumpuk
       * dengan konfirmasi upload; backend akan mengambil eligible_rows saja.
       */
      const previewOk = await refreshDpmUploadPreview(false, false, false);
      if (!previewOk) return;

      if (
        dpmRawSoHasPoMismatch.value &&
        dpmRawSoTotalPoEligible.value <= 0
      ) {
        notificationStore.showAlertWarning(
          dpmRawSoPoValidationMessage.value ||
          'Tidak ada PO Number DPM yang match dengan Raw MDFO pada periode yang dipilih.'
        );

        if (
          dpmRawSoDuplicateValidation.value?.has_duplicates &&
          dpmRawSoEligibleRows.value.length > 0
        ) {
          openDpmRawSoDuplicatePreview('eligible');
        } else {
          showDpmRawSoDuplicatePreview.value = false;
          showDpmRawSoPreview.value = true;
        }

        return;
      }

      const eligibleCount =
        dpmRawSoDuplicateValidation.value
          ? dpmRawSoTotalPoEligible.value
          : (
              dpmRawSoPoValidation.value?.is_ready
                ? dpmRawSoTotalPoEligible.value
                : dpmRawSoPreviewRows.value.length
            );

      if (eligibleCount <= 0) {
        notificationStore.showAlertWarning(
          'Semua data DPM pada periode terpilih sudah pernah diupload. Tidak ada data baru yang dapat disimpan.'
        );
        openDpmRawSoDuplicatePreview('existing');
        return;
      }

      if (
        dpmSalesDocumentConflicts.value.length > 0 &&
        dpmSalesDocumentStrategy.value === ''
      ) {
        /*
         * Untuk partial upload, conflict dihitung hanya dari baris BARU.
         * Dialog sengaja dibuka saat Submit agar popup duplicate/preview tidak
         * tertumpuk. Setelah user memilih, Submit dapat ditekan lagi.
         */
        showDpmSalesDocumentConflictChoice(
          dpmSalesDocumentConflicts.value,
          true
        );
        return;
      }

      const missingParts = Array.isArray(dpmRawSoContractValidation.value?.missing_parts)
        ? dpmRawSoContractValidation.value?.missing_parts
        : [];

      if (missingParts.length > 0) {
        notificationStore.showAlertWarning(
          `${missingParts.length} Part Number belum ada pada Contract DPM: ${missingParts.join(', ')}. Tambahkan part ke Contract terlebih dahulu agar Raw dan Format SO dapat disimpan bersama.`
        );
        return;
      }

      const skippedDuplicateCount = Math.max(
        0,
        Number(
          dpmRawSoDuplicateValidation.value?.total_duplicates ?? 0
        )
      );

      const skippedPoMismatchCount = Math.max(
        0,
        Number(
          dpmRawSoPoValidation.value?.mismatched_rows ?? 0
        )
      );

      notificationStore.showConfirm(
        'Konfirmasi',
        `Simpan ${eligibleCount} data BARU Raw Sales Order DPM periode ${dpmRawSoDetectedPeriodLabel.value || selectedUploadPeriodLabel.value || selectedUploadPeriod.value} dari ${dpmSoUploadFiles.value.length} file Excel sekaligus generate Format SO dan Tracking?${skippedDuplicateCount > 0 ? `<br><br><strong>${skippedDuplicateCount} data duplikat</strong> akan dilewati otomatis dan tidak disimpan ulang.` : ''}${skippedPoMismatchCount > 0 ? `<br><br><strong>${skippedPoMismatchCount} data dengan PO tidak match MDFO</strong> akan dilewati. Hanya PO yang match periode ${dpmRawSoPoValidation.value?.selected_period_label || dpmRawSoDetectedPeriodLabel.value || selectedUploadPeriodLabel.value || selectedUploadPeriod.value} yang disimpan.` : ''}${dpmSalesDocumentConflicts.value.length > 0 ? `<br><br>Sales Document: <strong>${dpmSalesDocumentStrategy.value === 'reuse_existing' ? 'gunakan nomor lama' : 'buat nomor baru'}</strong>.` : ''}`,
        async () => {
          try {
            isUploading.value = true;
            const response = await customerOrderService.uploadDpmRawSo(buildDpmUploadFormData(true));
            if (response.status !== 'success') {
              notificationStore.showAlertError(response.message || 'Upload Raw SO DPM gagal');
              return;
            }
            notificationStore.showAlertSuccess(response.message);
            await loadCustomerOptions();
            selectedCustomers.value = ['DPM'];
            draftSelectedCustomers.value = ['DPM'];
            invalidateTrackingFilterOptionsCache();

            await Promise.all([
              fetchDpmRawSoData(),
              loadFormatSalesOrder(),
              loadTrackingData()
            ]);
            showUploadModal.value = false;
            resetUploadForm();
          } catch (error: any) {
            notificationStore.showAlertError(
              error?.response?.data?.message || error?.message || 'Upload Raw SO DPM gagal'
            );
          } finally {
            isUploading.value = false;
          }
        }
      );
      return;
    }

    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(selectedUploadPeriod.value)) {
      notificationStore.showAlertWarning(
        isDcwaSoUpload.value
          ? 'Pilih periode DCWA terlebih dahulu'
          : isAsiAdmSoUpload.value
            ? 'Pilih periode Ordering ASI ADM terlebih dahulu'
          : isGayaSoUpload.value
            ? 'Pilih periode Gaya Motor terlebih dahulu'
          : isNtcSoUpload.value
            ? 'Pilih periode NTC terlebih dahulu'
            : isTmminSoUpload.value
            ? 'Pilih periode nomor PO TMMIN terlebih dahulu'
            : 'Pilih bulan Delivery Date terlebih dahulu'
      );
      return;
    }
    if (
      showUploadDeliveryPeriodChoice.value ||
      !isSelectedUploadPeriodAvailable.value
    ) {
      showUploadDeliveryPeriodChoice.value =
        uploadDeliveryPeriodOptions.value.length > 0;

      notificationStore.showAlertWarning(
        isDcwaSoUpload.value
          ? 'Konfirmasi periode DCWA yang akan diupload terlebih dahulu.'
          : isAsiAdmSoUpload.value
            ? 'Konfirmasi periode Ordering ASI ADM yang akan diupload terlebih dahulu.'
          : isGayaSoUpload.value
            ? 'Konfirmasi periode Gaya Motor yang akan diupload terlebih dahulu.'
          : isNtcSoUpload.value
            ? 'Konfirmasi periode NTC yang akan diupload terlebih dahulu.'
            : isTmminSoUpload.value
            ? 'Konfirmasi periode nomor PO TMMIN yang akan diupload terlebih dahulu.'
            : 'Konfirmasi bulan Delivery Date yang akan diupload terlebih dahulu.'
      );
      return;
    }
    if (
      isDcwaSoUpload.value
        ? !dcwaSoHasRequiredFileTypes.value
        : isAsiAdmSoUpload.value
          ? asiAdmSoUploadFiles.value.length === 0
        : isGayaSoUpload.value
          ? gayaSoUploadFiles.value.length === 0
        : isNtcSoUpload.value
          ? ntcSoUploadFiles.value.length === 0
          : isTmminSoUpload.value
            ? (
              tmminSoUploadFiles.value.length === 0 ||
              tmminSoDetectedTxtFiles.value.length === 0
            )
            : admUploadFiles.value.length === 0
    ) {
      notificationStore.showAlertWarning('File wajib dipilih');
      return;
    }
    if (showExcelPasswordInput.value && !excelPassword.value.trim()) {
      notificationStore.showAlertWarning('Password Excel wajib diisi');
      return;
    }
    if (!finalUploadUser.value) {
      notificationStore.showAlertWarning('Upload By wajib dipilih');
      return;
    }

    if (isDcwaSoUpload.value) {
      const previewOk =
        await previewDcwaRawSo(
          selectedUploadPeriod.value,
          false
        );

      if (
        !previewOk ||
        !dcwaRawSoCanSubmitPreview.value
      ) {
        notificationStore.showAlertWarning(
          dcwaRawSoPreviewErrors.value[0] ||
          'PO dan JOB Number DCWA harus valid sebelum Submit.'
        );
        return;
      }

      const excelCount =
        dcwaSoUploadFiles.value.filter(
          (file) => /\.(xlsx|xls)$/i.test(file.name)
        ).length;

      const pdfCount =
        dcwaSoUploadFiles.value.filter(
          (file) => /\.pdf$/i.test(file.name)
        ).length;

      notificationStore.showConfirm(
        'Konfirmasi',
        `Simpan Raw Sales Order Regular/Special Order + Format SO DCWA periode ${selectedUploadPeriodLabel.value} dari ${excelCount} Excel + ${pdfCount} PDF?`,
        async () => {
          try {
            const response = await uploadDcwaRawSo(
              selectedUploadPeriod.value,
              finalUploadUser.value
            );

            if (response?.status === 'warning') {
              return;
            }

            await loadCustomerOptions();
            selectedCustomers.value = ['DCWA'];
            draftSelectedCustomers.value = ['DCWA'];
            dcwaRawSoCurrentPage.value = 1;
            formatSOCurrentPage.value = 1;
            currentPage.value = 1;

            invalidateTrackingFilterOptionsCache();

            await Promise.all([
              fetchDcwaRawSoData(
                getDateOnlyFilterParams()
              ),
              loadFormatSalesOrder(),
              loadTrackingData()
            ]);

            showUploadModal.value = false;
            resetUploadForm();
          } catch (error: any) {
            console.error('Upload Raw SO DCWA gagal:', error);
            notificationStore.showAlertError(
              error?.response?.data?.message ||
              error?.message ||
              'Upload Raw SO DCWA gagal'
            );
          }
        }
      );

      return;
    }


    if (isAsiAdmSoUpload.value) {
      const previewOk =
        await refreshAsiAdmUploadPreview(false);

      const hasAsiAdmMissingContractParts =
        missingContractPartGroups.value.some((group) =>
          String(group.customer ?? '').trim().toUpperCase() === 'ASI ADM' &&
          Array.isArray(group.parts) &&
          group.parts.length > 0
        );

      /*
       * Preview ASI ADM memang dijalankan tanpa membuka modal data Raw,
       * tetapi apabila Contract belum lengkap shared Contract Validation
       * popup tetap WAJIB muncul seperti customer lain. Jangan jatuhkan
       * kasus missing Contract ke toast warning biasa.
       */
      if (hasAsiAdmMissingContractParts) {
        showMissingContractPartsModal.value = true;
        return;
      }

      if (
        !previewOk ||
        !asiAdmRawSoCanSubmitPreview.value
      ) {
        notificationStore.showAlertWarning(
          asiAdmRawSoPreviewErrors.value[0] ||
          'Part Number dan Qty PDF ASI ADM harus cocok dengan MDFO sebelum Submit.'
        );
        return;
      }

      notificationStore.showConfirm(
        'Konfirmasi',
        `Simpan Raw Ordering ASI ADM periode ${selectedUploadPeriodLabel.value} dari ${asiAdmSoUploadFiles.value.length} PDF?`,
        async () => {
          try {
            isUploading.value = true;

            const formData = buildAsiAdmUploadFormData();
            formData.set('upload_by', finalUploadUser.value);

            const res = await customerOrderService.uploadAsiAdmRawSo(
              formData
            );

            if (res.status === 'warning') {
              if (
                openMissingContractPartsFromUploadResponse(
                  res,
                  'ASI ADM'
                )
              ) {
                return;
              }

              notificationStore.showAlertWarning(res.message);
              return;
            }

            if (res.status === 'error') {
              if (
                openMissingContractPartsFromUploadResponse(
                  res,
                  'ASI ADM'
                )
              ) {
                return;
              }

              notificationStore.showAlertError(res.message);
              return;
            }

            notificationStore.showAlertSuccess(res.message);

            await loadCustomerOptions();
            selectedCustomers.value = ['ASI ADM'];
            draftSelectedCustomers.value = ['ASI ADM'];
            asiAdmRawSoCurrentPage.value = 1;
            selectedRawIds.value = [];

            invalidateTrackingFilterOptionsCache();

            await Promise.all([
              fetchAsiAdmRawSoData(),
              loadFormatSalesOrder(),
              loadTrackingData()
            ]);

            formatSOCurrentPage.value = 1;
            currentPage.value = 1;

            showUploadModal.value = false;
            resetUploadForm();
          } catch (error: any) {
            console.error('Upload Raw Ordering ASI ADM gagal:', error);

            const payload = error?.response?.data;
            if (
              payload &&
              openMissingContractPartsFromUploadResponse(
                payload,
                'ASI ADM'
              )
            ) {
              return;
            }

            notificationStore.showAlertError(
              payload?.message ||
              error?.message ||
              'Upload Raw Ordering ASI ADM gagal'
            );
          } finally {
            isUploading.value = false;
          }
        }
      );

      return;
    }

    if (isGayaSoUpload.value) {
      notificationStore.showConfirm(
        'Konfirmasi',
        `Simpan Raw Sales Order Gaya Motor periode ${selectedUploadPeriodLabel.value} dari ${gayaSoUploadFiles.value.length} PDF?`,
        async () => {
          try {
            isUploading.value = true;
            const formData = buildGayaUploadFormData();
            formData.set('upload_by', finalUploadUser.value);

            const rawResponse: any =
              await customerOrderService.uploadGayaRawSo(formData);

            /*
             * Normalisasi response supaya toast tidak pernah tampil hijau
             * tetapi kosong. Service normal mengembalikan response.data,
             * tetapi tetap terima AxiosResponse atau JSON string untuk
             * kompatibilitas antar revisi service.
             */
            /*
             * Service CustomerOrder mengembalikan response.data langsung.
             * Payload sukses Gaya Motor sendiri juga mempunyai property `data`
             * (berisi rows hasil upload). Jangan salah menganggap property itu
             * sebagai AxiosResponse.data karena status/message payload akan hilang.
             *
             * - AxiosResponse     : status berupa NUMBER (200, 422, dst) -> unwrap .data
             * - Backend payload   : status berupa STRING ('success'/'warning'/'error')
             *                      -> pakai object tersebut apa adanya
             */
            let res: any = rawResponse;

            if (
              rawResponse &&
              typeof rawResponse === 'object' &&
              typeof rawResponse.status === 'number' &&
              rawResponse.data !== undefined
            ) {
              res = rawResponse.data;
            }

            if (typeof res === 'string') {
              const rawText = res.trim();

              try {
                res = JSON.parse(rawText);
              } catch {
                throw new Error(
                  'Response upload Gaya Motor tidak valid. ' +
                  'Cek PHP warning/error pada response backend.'
                );
              }
            }

            if (!res || typeof res !== 'object') {
              throw new Error(
                'Response upload Gaya Motor kosong atau tidak valid.'
              );
            }

            const responseStatus =
              String(res.status ?? '')
                .trim()
                .toLowerCase();

            if (responseStatus === 'warning') {
              notificationStore.showAlertWarning(
                String(res.message ?? '').trim() ||
                'Upload Gaya Motor selesai dengan peringatan.'
              );
              return;
            }

            if (responseStatus === 'error') {
              notificationStore.showAlertError(
                String(res.message ?? '').trim() ||
                'Upload Raw SO Gaya Motor gagal.'
              );
              return;
            }

            if (responseStatus !== 'success') {
              throw new Error(
                String(res.message ?? '').trim() ||
                'Backend tidak mengembalikan status success untuk upload Gaya Motor.'
              );
            }

            const successMessage =
              String(res.message ?? '').trim() ||
              `Upload Raw Sales Order Gaya Motor berhasil. ${Number(res.total_insert ?? 0)} baris Raw Order disimpan dan ${Number(res.format_total ?? 0)} baris Format Sales Order dibuat.`;

            notificationStore.showAlertSuccess(successMessage);
            await loadCustomerOptions();
            selectedCustomers.value = ['GAYA MTR'];
            draftSelectedCustomers.value = ['GAYA MTR'];
            gayaRawSoCurrentPage.value = 1;
            formatSOCurrentPage.value = 1;
            currentPage.value = 1;

            invalidateTrackingFilterOptionsCache();

            await Promise.all([
              fetchGayaRawSoData(),
              loadFormatSalesOrder(),
              loadTrackingData(),
              loadCancelledData()
            ]);

            showUploadModal.value = false;
            resetUploadForm();
          } catch (error: any) {
            console.error('Upload Raw SO Gaya Motor gagal:', error);
            notificationStore.showAlertError(
              error?.response?.data?.message ||
              error?.message ||
              'Upload Raw SO Gaya Motor gagal'
            );
          } finally {
            isUploading.value = false;
          }
        }
      );

      return;
    }

    if (isNtcSoUpload.value) {
      notificationStore.showConfirm(
        'Konfirmasi',
        `Simpan Raw Sales Order NTC periode ${selectedUploadPeriodLabel.value} dari ${ntcSoUploadFiles.value.length} file CSV?`,
        async () => {
          try {
            isUploading.value = true;

            const formData =
              buildNtcUploadFormData();

            formData.set(
              'upload_by',
              finalUploadUser.value
            );

            const res =
              await customerOrderService
                .uploadNtcRawSo(
                  formData
                );

            if (res.status === 'warning') {
              notificationStore
                .showAlertWarning(
                  res.message
                );
              return;
            }

            if (res.status === 'error') {
              notificationStore
                .showAlertError(
                  res.message
                );
              return;
            }

            notificationStore
              .showAlertSuccess(
                res.message
              );

            /*
             * NTC dapat diupload saat tabelnya masih kosong sehingga belum
             * muncul di customerOptions dinamis. Refresh option setelah insert
             * agar NTC langsung tersedia di dropdown tanpa reload halaman.
             */
            await loadCustomerOptions();

            selectedCustomers.value =
              ['NTC'];

            draftSelectedCustomers.value =
              ['NTC'];

            /*
             * Backend NTC membuat Raw -> Format SO -> Tracking dalam satu
             * transaksi. Setelah upload berhasil, refresh ketiga section
             * supaya hasil generate langsung tampil tanpa klik Regenerate.
             */
            /*
             * Refresh NTC dibuat berurutan supaya Tracking selalu
             * membaca hasil transaksi terbaru setelah Raw dan Format SO
             * selesai dimuat ulang.
             */
            ntcRawSoCurrentPage.value = 1;
            formatSOCurrentPage.value = 1;
            currentPage.value = 1;

            invalidateTrackingFilterOptionsCache();

            await fetchNtcRawSoData();
            await loadFormatSalesOrder();
            await loadCancelledData();
            await loadTrackingData();

            showUploadModal.value = false;
            resetUploadForm();
          } catch (error: any) {
            console.error(
              'Upload Raw SO NTC gagal:',
              error
            );

            notificationStore.showAlertError(
              error?.response?.data?.message ||
              error?.message ||
              'Upload Raw SO NTC gagal'
            );
          } finally {
            isUploading.value = false;
          }
        }
      );

      return;
    }

    if (isTmminSoUpload.value) {
      if (
        tmminSoUploadFiles.value.length === 0
      ) {
        notificationStore.showAlertWarning(
          'Pilih minimal satu TXT TMMIN dari file TXT / ZIP / RAR.'
        );

        return;
      }

      notificationStore.showConfirm(
        'Konfirmasi',
        `Simpan Raw Sales Order TMMIN periode PO ${selectedUploadPeriodLabel.value} dari ${tmminSoDetectedTxtFiles.value.length} file TXT yang terdeteksi?`,
        async () => {
          try {
            isUploading.value = true;

            const formData =
              buildTmminUploadFormData();

            // Upload By wajib pada Submit, overwrite value preview bila perlu.
            formData.set(
              'upload_by',
              finalUploadUser.value
            );

            const res =
              await customerOrderService
                .uploadTmminRawSo(
                  formData
                );

            if (openContractMaterialChoice(res)) {
              return;
            }

            if (
              res.status ===
              'warning'
            ) {
              notificationStore
                .showAlertWarning(
                  res.message
                );

              return;
            }

            if (
              res.status ===
              'error'
            ) {
              notificationStore
                .showAlertError(
                  res.message
                );

              return;
            }

            notificationStore
              .showAlertSuccess(
                res.message
              );

            selectedCustomers.value =
              ['TMMIN'];

            draftSelectedCustomers.value =
              ['TMMIN'];

            invalidateTrackingFilterOptionsCache();

            await Promise.all([
              fetchTmminRawSoData(),
              loadFormatSalesOrder(),
              loadTrackingData(),
              loadCancelledData()
            ]);

            tmminRawSoCurrentPage.value = 1;
            showUploadModal.value = false;
            resetUploadForm();
          } catch (error: any) {
            console.error(
              'Upload Raw SO TMMIN gagal:',
              error
            );

            notificationStore
              .showAlertError(
                error?.response
                  ?.data
                  ?.message ||
                error?.message ||
                'Upload Raw SO TMMIN gagal'
              );
          } finally {
            isUploading.value = false;
          }
        }
      );

      return;
    }

    notificationStore.showConfirm(
      'Konfirmasi',
      `Upload data ${selectedUploadCustomerLabel.value} untuk Delivery Date ${selectedUploadPeriodLabel.value}? Row bulan lain di dalam file akan dilewati.`,
      async () => {
        const filesToUpload: File[] = [];
        let activeAdmUploadFile: File | null = null;

        const completedCountForCurrentBatch = (): number =>
          filesToUpload.reduce(
            (count, file) =>
              count +
              (completedAdmUploadFileKeys.has(
                getUploadFileIdentity(file)
              )
                ? 1
                : 0),
            0
          );

        /*
         * Jika batch ADM berhenti setelah sebagian file berhasil COMMIT,
         * refresh tabel saat itu juga dan jelaskan statusnya dengan tegas.
         * File yang sudah sukses tetap tercatat pada Set sehingga Submit
         * berikutnya hanya melanjutkan file yang belum selesai.
         */
        const handleAdmUploadInterrupted = async (
          message: string,
          level: 'warning' | 'error' = 'warning',
          failedFile: File | null = activeAdmUploadFile
        ): Promise<boolean> => {
          const completedCount = completedCountForCurrentBatch();

          if (completedCount <= 0) {
            return false;
          }

          let refreshFailed = false;
          try {
            await refreshAdmUploadResultTables(false);
          } catch (refreshError) {
            refreshFailed = true;
            console.error(
              'Refresh tabel setelah partial upload ADM gagal:',
              refreshError
            );
          }

          const totalCount = filesToUpload.length;
          const remainingCount = Math.max(
            totalCount - completedCount,
            0
          );
          const failedFileLabel =
            failedFile?.name
              ? ` Proses berhenti pada ${failedFile.name}.`
              : '';
          const continuationMessage =
            remainingCount > 0
              ? ` ${remainingCount} file belum selesai. Selesaikan peringatan lalu klik Submit lagi; ${completedCount} file yang sudah berhasil tidak akan di-upload ulang.`
              : ' Semua file sudah tersimpan. Anda tidak perlu meng-upload ulang file tersebut.';
          const refreshMessage =
            refreshFailed
              ? ' Data sudah tersimpan, tetapi refresh tabel gagal. Muat ulang halaman untuk melihat data terbaru.'
              : ' Data yang sudah berhasil langsung diperbarui pada Raw SO, Format SO, dan Tracking.';
          const summary =
            `${completedCount} dari ${totalCount} file ADM sudah berhasil disimpan.` +
            failedFileLabel +
            ` ${message}` +
            continuationMessage +
            refreshMessage;

          if (level === 'error') {
            notificationStore.showAlertError(summary);
          } else {
            notificationStore.showAlertWarning(summary);
          }

          return true;
        };

        try {
          isUploading.value = true;

          /*
           * PRE-CHECK SEMUA FILE ADM.
           *
           * File boleh berisi beberapa bulan. Hanya file yang
           * mempunyai row pada bulan pilihan yang diteruskan ke
           * endpoint upload; backend kemudian memfilter row-nya.
           */
          const admContractMaterialsByCustomer =
            new Map<string, Set<string>>();
          const admExactContractValidationGroups: any[] = [];

          for (const file of admUploadFiles.value) {
            const previewResult: any =
              await requestAdmPreview(file);

            const selectedCount =
              Number(
                previewResult?.selected_period_count ??
                0
              );

            if (selectedCount > 0) {
              filesToUpload.push(file);

              if (
                Array.isArray(
                  previewResult?.contract_validation_groups
                )
              ) {
                admExactContractValidationGroups.push(
                  ...previewResult.contract_validation_groups
                );
              }

              mergeAdmContractPreviewGroups(
                admContractMaterialsByCustomer,
                getAdmContractGroupsFromPreviewResponse(
                  previewResult
                )
              );
            }
          }

          if (filesToUpload.length === 0) {
            showUploadDeliveryPeriodChoice.value =
              uploadDeliveryPeriodOptions.value.length > 0;

            notificationStore.showAlertWarning(
              `Tidak ada data ${selectedUploadCustomerLabel.value} untuk ${selectedUploadPeriodLabel.value}. Pilih bulan Delivery Date lain.`
            );
            return;
          }

          /*
           * VALIDASI CONTRACT SEBELUM endpoint upload dipanggil.
           *
           * Hasil dari seluruh file digabung, lalu memakai popup shared
           * yang sama dengan TMMIN. Jadi user langsung melihat daftar Part
           * Number lengkap, bisa Copy, paste ke Upload MDFO -> Add Part,
           * lalu mengulang Submit setelah Contract diperbarui.
           */
          const admContractValidationGroups =
            Array.from(
              admContractMaterialsByCustomer.entries()
            ).map(([customer, materials]) => ({
              customer,
              materials: Array.from(materials)
            }));

          if (admExactContractValidationGroups.length > 0) {
            const contractReady =
              validateEmbeddedContractValidationGroups(
                admExactContractValidationGroups,
                true
              );

            if (!contractReady) {
              return;
            }
          } else if (admContractValidationGroups.length > 0) {
            /* Backend lama: gunakan validator period/revision sebagai fallback. */
            const contractReady =
              await validatePreviewContractGroups(
                admContractValidationGroups,
                selectedUploadPeriod.value,
                true
              );

            if (!contractReady) {
              return;
            }
          }

          const successMessages: string[] = [];

          for (const file of filesToUpload) {
            const fileIdentity = getUploadFileIdentity(file);

            if (completedAdmUploadFileKeys.has(fileIdentity)) {
              continue;
            }

            const formData = new FormData();
            formData.append('file', file);
            formData.append(
              'customer',
              selectedCustomerUpload.value
            );
            formData.append(
              'upload_by',
              finalUploadUser.value
            );
            formData.append(
              'upload_period',
              selectedUploadPeriod.value
            );

            if (Object.keys(contractMaterialSelections.value).length > 0) {
              formData.append(
                'material_choices',
                JSON.stringify(contractMaterialSelections.value)
              );
            }

            if (showExcelPasswordInput.value) {
              formData.append(
                'excel_password',
                excelPassword.value
              );
            }

            activeAdmUploadFile = file;

            const res =
              await customerOrderService
                .upload(formData);

            if (openContractMaterialChoice(res)) {
              await handleAdmUploadInterrupted(
                'Upload dijeda karena ada Part Number Contract yang harus dipilih.',
                'warning',
                file
              );
              return;
            }

            if (res.status === 'warning') {
              /*
               * VALIDASI FINAL CONTRACT DARI BACKEND.
               *
               * Backend upload memvalidasi Sales Document Contract yang
               * benar-benar dipakai. Jika ada Part Number yang belum ada,
               * tampilkan popup copyable shared (sama seperti flow TMMIN)
               * dan JANGAN lagi menampilkan toast orange panjang.
               */
              const warningMessage = String(res.message ?? '');

              if (/contract/i.test(warningMessage)) {
                if (
                  openMissingContractPartsFromUploadResponse(
                    res,
                    selectedCustomerUpload.value
                  )
                ) {
                  await handleAdmUploadInterrupted(
                    'Upload dijeda karena masih ada Part Number yang belum tersedia di Contract.',
                    'warning',
                    file
                  );
                  return;
                }

                /*
                 * Backward compatibility: bila backend lama belum mengirim
                 * missing_contract_parts dan message tidak dapat diparse,
                 * coba endpoint preview sekali lagi sebelum fallback toast.
                 */
                if (admContractValidationGroups.length > 0) {
                  const contractReady =
                    await validatePreviewContractGroups(
                      admContractValidationGroups,
                      selectedUploadPeriod.value,
                      true
                    );

                  if (!contractReady) {
                    await handleAdmUploadInterrupted(
                      'Upload dijeda sampai Contract dilengkapi.',
                      'warning',
                      file
                    );
                    return;
                  }
                }
              }

              const partialHandled =
                await handleAdmUploadInterrupted(
                  String(res.message ?? 'Upload file ADM menghasilkan warning.'),
                  'warning',
                  file
                );

              if (!partialHandled) {
                notificationStore.showAlertWarning(
                  `${file.name}: ${res.message}`
                );
              }
              return;
            }

            if (res.status === 'error') {
              const partialHandled =
                await handleAdmUploadInterrupted(
                  String(res.message ?? 'Upload file ADM gagal diproses.'),
                  'error',
                  file
                );

              if (!partialHandled) {
                notificationStore.showAlertError(
                  `${file.name}: ${res.message}`
                );
              }
              return;
            }

            completedAdmUploadFileKeys.add(fileIdentity);
            successMessages.push(res.message);
            activeAdmUploadFile = null;
          }

          const completedCount =
            completedCountForCurrentBatch();
          const successMessage =
            filesToUpload.length === 1
              ? successMessages[0] ||
                `${filesToUpload[0].name} berhasil diproses untuk ${selectedUploadPeriodLabel.value}.`
              : `${completedCount} file berhasil diproses untuk ${selectedUploadPeriodLabel.value}.`;

          await refreshAdmUploadResultTables(true);
          notificationStore.showAlertSuccess(
            successMessage
          );
        } catch (error: any) {
          console.error(error);

          const message =
            error.response?.data?.message ||
            error.message ||
            'Upload gagal diproses';

          const partialHandled =
            await handleAdmUploadInterrupted(
              message,
              'error',
              activeAdmUploadFile
            );

          if (!partialHandled) {
            notificationStore.showAlertError(message);
          }
        } finally {
          isUploading.value = false;
        }
      }
    );
  };

  const confirmContractMaterialChoiceAndContinue = async () => {
    if (!canConfirmContractMaterialChoice.value) {
      notificationStore.showAlertWarning(
        'Pilih salah satu Part Number untuk setiap Contract terlebih dahulu.'
      );
      return;
    }

    showContractMaterialChoiceModal.value = false;

    // File tetap berada di Upload Form. Submit berikutnya membawa
    // material_choices sehingga user tidak perlu memilih file ulang.
    await submitUploadForm();
  };

  // ========================================================
  // FORMAT SALES ORDER
  // ========================================================
  const formatSalesOrderData = ref<FormatSalesOrderRow[]>([]);
  const searchFormatSO = ref('');
  const isLoadingFormatSO = ref(false);

  // ========================================================
  // FAST FIRST LOAD / SERVER PAGE STATE
  // ========================================================
  type RawServerSource =
    | 'ADM'
    | 'TMMIN'
    | 'NTC'
    | 'GAYA MTR'
    | 'ASI ADM'
    | 'DCWA'
    | 'DPM'
    | 'FTI'
    | 'MES';

  const RAW_SERVER_SOURCES: RawServerSource[] = [
    'ADM',
    'TMMIN',
    'NTC',
    'GAYA MTR',
    'ASI ADM',
    'DCWA',
    'DPM',
    'FTI',
    'MES'
  ];

  const isLoadingRawData = ref(false);
  const rawServerPaged = reactive<Record<RawServerSource, boolean>>(
    Object.fromEntries(
      RAW_SERVER_SOURCES.map((source) => [source, true])
    ) as Record<RawServerSource, boolean>
  );
  const rawServerTotals = reactive<Record<RawServerSource, number>>(
    Object.fromEntries(
      RAW_SERVER_SOURCES.map((source) => [source, 0])
    ) as Record<RawServerSource, number>
  );

  const formatSOServerPaged = ref(true);
  const formatSOServerTotal = ref(0);

  // Section berat tidak dimuat saat halaman pertama dibuka. Data baru diminta
  // ketika section mendekati viewport. Perubahan filter sebelum section terlihat
  // hanya menandai data sebagai dirty dan akan dipakai saat aktivasi pertama.
  const formatSOSectionActivated = ref(false);
  let formatSOSectionDirty = true;
  const trackingSectionActivated = ref(false);
  let trackingSectionDirty = true;

  const rawPageAbortControllers = new Map<RawServerSource, AbortController>();
  const rawPageRequestSerial = new Map<RawServerSource, number>();

  // DN memakai controller + serial yang sama untuk page dan summary. Request
  // lama boleh selesai di network, tetapi tidak boleh lagi menyentuh UI.
  let dnCrosscheckPageAbortController: AbortController | null = null;
  let dnCrosscheckPageRequestSerial = 0;

  const dnCrosscheckServerPaged = ref(true);
  const dnCrosscheckServerTotal = ref(0);

  type RawServerQueryOptions = {
    filters?: Record<string, string[]>;
    sortKey?: string;
    sortDirection?: SortDirection;
  };

  const loadRawServerPage = async <TBackend>(
    source: RawServerSource,
    params: FilterParams,
    page: number,
    perPage: number,
    applyRows: (rows: TBackend[]) => void,
    query: RawServerQueryOptions = {}
  ): Promise<void> => {
    const requestSerial = (rawPageRequestSerial.get(source) ?? 0) + 1;
    rawPageRequestSerial.set(source, requestSerial);

    rawPageAbortControllers.get(source)?.abort();
    const controller = new AbortController();
    rawPageAbortControllers.set(source, controller);

    const isLatestRequest = (): boolean =>
      rawPageRequestSerial.get(source) === requestSerial &&
      !controller.signal.aborted;
    let servedFromCache = false;

    try {
      const cached = customerOrderService.getCachedRawSourcePage<TBackend>(
        source,
        params,
        page,
        perPage,
        query
      );

      if (cached?.status === 'success') {
        if (!isLatestRequest()) return;
        servedFromCache = true;

        applyRows(cached.data ?? []);
        rawServerTotals[source] = Number(cached.total ?? 0);
        isLoadingRawData.value = false;

        if (page < Number(cached.total_pages ?? 1)) {
          void customerOrderService.prefetchRawSourcePage<TBackend>(
            source,
            params,
            page + 1,
            perPage,
            query
          );
        }

        // Cache tetap memberi first paint instan. Setelah berumur >= 30 detik,
        // page yang sama dicek diam-diam agar upload dari browser/user lain
        // tidak tertahan sampai TTL cache 30 menit.
        if (
          !customerOrderService.shouldRevalidateRawSourcePage(
            source,
            params,
            page,
            perPage,
            query
          )
        ) {
          return;
        }
      }

      const response = await customerOrderService.getRawSourcePage<TBackend>(
        source,
        params,
        page,
        perPage,
        query,
        controller.signal
      );

      if (!isLatestRequest()) return;

      if (response.status !== 'success') {
        throw new Error(response.message || `Gagal mengambil Raw SO ${source}`);
      }

      applyRows(response.data ?? []);
      rawServerTotals[source] = Number(response.total ?? 0);

      if (page < Number(response.total_pages ?? 1)) {
        void customerOrderService.prefetchRawSourcePage<TBackend>(
          source,
          params,
          page + 1,
          perPage,
          query
        );
      }
    } catch (error: any) {
      const cancelled =
        controller.signal.aborted ||
        error?.code === 'ERR_CANCELED' ||
        error?.name === 'CanceledError' ||
        error?.name === 'AbortError';

      if (!cancelled) {
        if (servedFromCache) {
          console.warn(`Revalidasi Raw SO ${source} gagal; cache tetap dipakai.`, error);
          return;
        }
        throw error;
      }
    } finally {
      if (rawPageAbortControllers.get(source) === controller) {
        rawPageAbortControllers.delete(source);
      }
    }
  };

  const isDownloadingFormatSO = ref(false);
  const isRegeneratingFormatSO = ref(false);
  const isDownloadingRawExcel = ref(false);
  // Dipakai hanya saat All Customer. Nilainya berasal dari COUNT(*) backend,
  // sehingga tabel Raw tetap cukup memuat ADM P1/P4/P5.
  const rawDownloadAllCustomerRowCount = ref(0);

  // Satu proses export Excel dalam satu waktu.
  // Export Raw + Format SO bersamaan dapat menambah beban memory PHP
  // dan berisiko menghasilkan response parsial pada workbook besar.
  const isAnyExcelDownloading = computed(() => {
    return (
      isDownloadingRawExcel.value ||
      isDownloadingFormatSO.value
    );
  });
  const downloadDateValidationMessage = computed(() =>
    validateDownloadDateFilters()
  );

  const downloadExportCustomers = computed<DownloadExportCustomer[]>(() =>
    getDownloadExportCustomers()
  );

  const downloadExportFileCount = computed(() =>
    downloadExportCustomers.value.length
  );

  const rawDownloadExportCustomers =
    computed<RawDownloadExportCustomer[]>(() =>
      getRawDownloadExportCustomers()
    );

  const rawDownloadExportFileCount = computed(() =>
    rawDownloadExportCustomers.value.length
  );

  const downloadDescriptionIsError = computed(() => {
    return (
      downloadDateValidationMessage.value !== '' ||
      (
        downloadExportFileCount.value === 0 &&
        rawDownloadExportFileCount.value === 0
      )
    );
  });

  const canDownloadRawExcel = computed(() => {
    return (
      downloadDateValidationMessage.value === '' &&
      rawDownloadExportFileCount.value > 0 &&
      !isAnyExcelDownloading.value
    );
  });

  const canDownloadFormatSOExcel = computed(() => {
    return (
      downloadDateValidationMessage.value === '' &&
      downloadExportFileCount.value > 0 &&
      !isAnyExcelDownloading.value &&
      !isRegeneratingFormatSO.value
    );
  });

  const getDownloadZipInfo = (): string => {
    if (downloadExportFileCount.value <= 1) {
      return '';
    }

    return (
      `ZIP berisi ${downloadExportFileCount.value} file Excel ` +
      '(1 file per customer).'
    );
  };

  const getRawDownloadZipInfo = (): string => {
    if (rawDownloadExportFileCount.value <= 1) {
      return '';
    }

    return (
      `ZIP berisi ${rawDownloadExportFileCount.value} file Excel ` +
      '(1 file per customer).'
    );
  };

  const rawDownloadDescription = computed(() => {
    if (isDownloadingRawExcel.value) {
      return 'File Raw SO sedang dipersiapkan';
    }

    if (downloadDateValidationMessage.value !== '') {
      const validationMessage =
        downloadDateValidationMessage.value.trim();

      if (
        validationMessage ===
        'Filter tanggal wajib diisi'
      ) {
        return 'Pilih tanggal • Maks. 1 bulan (31 hari)';
      }

      if (
        validationMessage
          .toLowerCase()
          .includes('maksimal 1 bulan')
      ) {
        return 'Rentang maks. 1 bulan (31 hari)';
      }

      return (
        validationMessage.replace(/\.$/, '') +
        ' • Maks. 1 bulan (31 hari)'
      );
    }

    if (rawDownloadExportFileCount.value === 0) {
      return 'Tidak ada customer Raw SO aktif di database.';
    }

    return getRawDownloadZipInfo();
  });

  const rawDownloadTitle = computed(() => {
    if (isDownloadingRawExcel.value) {
      return 'File Raw SO sedang dipersiapkan';
    }

    if (isDownloadingFormatSO.value) {
      return 'Proses download Format Sales Order masih berjalan.';
    }

    if (downloadDateValidationMessage.value !== '') {
      return downloadDateValidationMessage.value;
    }

    if (rawDownloadExportFileCount.value === 0) {
      return 'Tidak ada customer Raw SO aktif di database yang dapat di-download.';
    }

    return getRawDownloadZipInfo() || 'Download Raw Files Excel';
  });

  const formatSODownloadDescription = computed(() => {
    if (isDownloadingFormatSO.value) {
      return 'File Format Sales Order sedang dipersiapkan';
    }

    if (isDownloadingRawExcel.value) {
      return 'Proses download Raw Files masih berjalan.';
    }

    if (isRegeneratingFormatSO.value) {
      return 'Tunggu proses Regenerate Format Sales Order selesai.';
    }

    if (downloadDateValidationMessage.value !== '') {
      return downloadDateValidationMessage.value;
    }

    if (downloadExportFileCount.value === 0) {
      return 'Tidak ada customer SO aktif di database yang dapat di-download.';
    }

    return '';
  });

  const rawDownloadButtonLabel = computed(() => {
    if (isDownloadingRawExcel.value) {
      return 'Downloading Excel...';
    }

    if (rawDownloadExportFileCount.value > 1) {
      return `Download ZIP ${rawDownloadExportFileCount.value} Customer`;
    }

    if (rawDownloadExportFileCount.value === 1) {
      return `Download Excel ${rawDownloadExportCustomers.value[0]}`;
    }

    return 'Download Excel';
  });

  const formatSODownloadButtonLabel = computed(() => {
    if (isDownloadingFormatSO.value) {
      return 'Downloading Excel...';
    }

    if (downloadExportFileCount.value > 1) {
      return `Download ZIP ${downloadExportFileCount.value} Customer`;
    }

    if (downloadExportFileCount.value === 1) {
      return `Download Excel ${downloadExportCustomers.value[0]}`;
    }

    return 'Download Excel';
  });
  const FORMAT_SO_SELECTION_COLUMN_WIDTH = 38;
  const selectedFormatSOIds = ref<number[]>([]);
  const selectedFormatSOMetadata = ref<Record<number, {
    customerCode: string;
    poDate: string;
  }>>({});

  const formatSOCurrentPage = ref(1);
  const formatSORowsPerPage = ref(10);
  const formatSORowsPerPageOptions = [10, 20, 50, 100];
  /*
  * Diisi oleh initFormatSOFilters() setelah
  * konfigurasi kolom selesai dibuat.
  */
  const formatSOOpenFilters = ref<Record<FormatSOKey, boolean>>({} as Record<FormatSOKey, boolean>);
  const formatSOSearchFilters = ref<Record<FormatSOKey, string>>({} as Record<FormatSOKey, string>);
  const formatSOSelectedFilters = ref<Record<FormatSOKey, string[]>>({} as Record<FormatSOKey, string[]>);
  const formatSOActiveFilterKey = ref<FormatSOKey | null>(null);
  const formatSOFilterPopupPosition = ref({
    top: 0,
    left: 0,
    maxHeight: 420
  });
  const formatSOSortKey = ref<FormatSOKey | null>(null);
  const formatSOSortDirection = ref<SortDirection>('none');
  const formatSOColumns: TableColumn<FormatSOKey>[] = [
    { key: 'reference_doc', label: 'Reference Doc.', width: '100px' },
    { key: 'sales_document', label: 'Sales Document', width: '100px' },
    { key: 'document_date', label: 'Document Date', width: '100px' },
    { key: 'sales_doc_type', label: 'Sales Doc. Type', width: '90px' },
    { key: 'sales_org', label: 'Sales Org.', width: '90px' },
    { key: 'distr_channel', label: 'Distr. Channel', width: '90px' },
    { key: 'division', label: 'Division', width: '70px' },
    { key: 'sales_group', label: 'Sales Group', width: '70px' },
    { key: 'sales_office', label: 'Sales Office', width: '70px' },
    { key: 'req_delv_date', label: 'Req. Delv. Date', width: '100px' },
    { key: 'price_date', label: 'Price Date', width: '100px' },
    { key: 'po_number', label: 'PO Number', width: '130px' },
    { key: 'po_date', label: 'PO Date / Order Date', width: '140px' },
    { key: 'sold_to_party', label: 'Sold-to Party', width: '100px' },
    { key: 'ship_to_party', label: 'Ship-to Party', width: '100px' },
    { key: 'bill_to_party', label: 'Bill-to Party', width: '100px' },
    { key: 'payer', label: 'Payer', width: '100px' },
    { key: 'item', label: 'Item', width: '70px' },
    { key: 'material', label: 'Material', width: '130px' },
    { key: 'item_category', label: 'Item Category', width: '70px' },
    { key: 'order_quantity', label: 'Order Quantity', width: '70px' },
    // { key: 'reference_document', label: 'Reference Document', width: '100px' },
    // { key: 'reference_item', label: 'Reference Item', width: '140px' },
    { key: 'plant', label: 'Plant', width: '100px' },
    { key: 'storage_location', label: 'Storage Location', width: '100px' },
    { key: 'shipping_point', label: 'Shipping Point / Receiving Pt', width: '130px' },
    { key: 'customer_plant', label: 'Customer Plant', width: '250px' },
    { key: 'cycle_issue', label: 'Cycle Issue', width: '70px' },
    { key: 'job_no', label: 'JOB NO', width: '70px' },
    { key: 'po_sa', label: 'PO/SA', width: '100px' },
    { key: 'cycle_time', label: 'Cycle Time', width: '70px' }
  ];
  const formatSOFrozenColumns: FormatSOKey[] = ['reference_doc', 'sales_document', 'document_date'];
  function createFormatSOSelectedFilters(): Record<FormatSOKey, string[]> {
    const filters = {} as Record<FormatSOKey, string[]>;
    formatSOColumns.forEach((column) => {
      filters[column.key] = [];
    });
    return filters;
  }
  function createFormatSOSearchFilters(): Record<FormatSOKey, string> {
    const filters = {} as Record<FormatSOKey, string>;
    formatSOColumns.forEach((column) => {
      filters[column.key] = '';
    });
    return filters;
  }
  function createFormatSOOpenFilters(): Record<FormatSOKey, boolean> {
    const filters = {} as Record<FormatSOKey, boolean>;
    formatSOColumns.forEach((column) => {
      filters[column.key] = false;
    });
    return filters;
  }
  const initFormatSOFilters = () => {
    formatSOOpenFilters.value = createFormatSOOpenFilters();
    formatSOSearchFilters.value = createFormatSOSearchFilters();
    formatSOSelectedFilters.value = createFormatSOSelectedFilters();
    formatSOActiveFilterKey.value = null;
    formatSOSortKey.value = null;
    formatSOSortDirection.value = 'none';
  };
  const formatSOTableWidth = computed(() => {
    return `${FORMAT_SO_SELECTION_COLUMN_WIDTH + formatSOColumns.reduce((total, column) => {
      return total + getColumnWidthNumber(column.width);
    }, 0)}px`;
  });
  const getFormatSOFrozenLeftPosition = (key: FormatSOKey) => {
    const index = formatSOColumns.findIndex((column) => column.key === key);
    if (index === -1)
      return FORMAT_SO_SELECTION_COLUMN_WIDTH;
    return FORMAT_SO_SELECTION_COLUMN_WIDTH + formatSOColumns.slice(0, index).reduce((total, column) => {
      return total + getColumnWidthNumber(column.width);
    }, 0);
  };
  const getFormatSOColumnStyle = (key: FormatSOKey, isHeader = false, rowIndex = 0): CSSProperties => {
    const column = formatSOColumns.find((item) => item.key === key);
    const width = column?.width || '120px';
    const isFrozen = formatSOFrozenColumns.includes(key);
    const isOpen = formatSOOpenFilters.value[key] === true;
    const frozenIndex = formatSOFrozenColumns.indexOf(key);
    const lastFrozenKey = formatSOFrozenColumns[formatSOFrozenColumns.length - 1];
    const backgroundColor = isHeader ? '#eff6ff' : rowIndex % 2 === 0 ? '#ffffff' : '#f8fafc';
    const gridColor = '#e2e8f0';
    /*
    * Garis kanan dan bawah untuk semua cell.
    * Dibuat dengan inset shadow supaya tetap
    * terlihat ketika frozen column menumpuk
    * di atas kolom non-frozen.
    */
    const gridShadows = [`inset -1px 0 0 ${gridColor}`, `inset 0 -1px 0 ${gridColor}`];
    /*
    * Garis atas header.
    */
    if (isHeader) {
      gridShadows.push(`inset 0 1px 0 ${gridColor}`);
    }
    /*
    * Pemisah frozen column terakhir.
    */
    if (isFrozen && key === lastFrozenKey) {
      gridShadows.push('3px 0 7px -6px rgba(15, 23, 42, 0.32)');
    }
    /*
    * Frozen column dibuat overlap 1px.
    * Tujuannya menutup celah yang muncul
    * ketika horizontal scroll.
    */
    const frozenLeft = isFrozen ? Math.max(0, getFormatSOFrozenLeftPosition(key) - Math.max(frozenIndex, 0)) : 0;
    const baseStyle: CSSProperties = {
      minWidth: width,
      width,
      maxWidth: width,
      boxSizing: 'border-box',
      backgroundColor,
      backgroundImage: `linear-gradient(
            ${backgroundColor},
            ${backgroundColor}
            )`,
      backgroundOrigin: 'border-box',
      backgroundClip: 'border-box',
      backgroundRepeat: 'no-repeat',
      backgroundSize: '100% 100%',
      isolation: 'isolate',
      boxShadow: gridShadows.join(', ')
    };
    if (!isFrozen) {
      return {
        ...baseStyle,
        position: 'relative',
        zIndex: isHeader && isOpen ? 10001 : isHeader ? 301 : 1
      };
    }
    return {
      ...baseStyle,
      position: 'sticky',
      left: `${frozenLeft}px`,
      zIndex: isHeader && isOpen ? 10002 : isHeader ? 700 : 80,
      transform: 'translateZ(0)',
      backfaceVisibility: 'hidden'
    };
  };
  const getFormatSOCheckboxColumnStyle = (
    isHeader = false,
    rowIndex = 0
  ): CSSProperties => {
    const width = `${FORMAT_SO_SELECTION_COLUMN_WIDTH}px`;
    const backgroundColor = isHeader
      ? '#eff6ff'
      : rowIndex % 2 === 0
        ? '#ffffff'
        : '#f8fafc';
    const gridColor = '#e2e8f0';
    const gridShadows = [
      `inset -1px 0 0 ${gridColor}`,
      `inset 0 -1px 0 ${gridColor}`,
      `inset 1px 0 0 ${gridColor}`
    ];

    if (isHeader) {
      gridShadows.push(`inset 0 1px 0 ${gridColor}`);
    }

    return {
      minWidth: width,
      width,
      maxWidth: width,
      boxSizing: 'border-box',
      position: 'sticky',
      left: '0px',
      zIndex: isHeader ? 900 : 180,
      backgroundColor,
      backgroundImage: `linear-gradient(${backgroundColor}, ${backgroundColor})`,
      backgroundOrigin: 'border-box',
      backgroundClip: 'border-box',
      backgroundRepeat: 'no-repeat',
      backgroundSize: '100% 100%',
      isolation: 'isolate',
      boxShadow: gridShadows.join(', '),
      transform: 'translateZ(0)',
      backfaceVisibility: 'hidden'
    };
  };

  const formatSOFiltered = computed(() => {
    let result = [...formatSalesOrderData.value];
    if (selectedCustomer.value) {
      result = result.filter((item) => item.customer_code === selectedCustomer.value);
    }
    if (searchFormatSO.value) {
      const keyword = searchFormatSO.value;
      result = result.filter((item) =>
        matchesTextSearch(
          [
            item.sales_document,
            item.material,
            item.sold_to_party,
            item.reference_doc
          ].join(' '),
          keyword
        )
      );
    }
    result = getRowsMatchingOtherColumnFilters(
      result,
      formatSOColumns,
      formatSOSelectedFilters.value,
      null,
      (item, key) => item[key]
    );
    return result;
  });
  const formatSOSorted = computed(() => {
    const result = [...formatSOFiltered.value];
    if (formatSOSortDirection.value === 'none' || formatSOSortKey.value === null) {
      return result;
    }
    const key = formatSOSortKey.value;
    result.sort((a, b) => {
      const x = String(a[key] ?? '').toLowerCase();
      const y = String(b[key] ?? '').toLowerCase();
      return formatSOSortDirection.value === 'asc' ? x.localeCompare(y) : y.localeCompare(x);
    });
    return result;
  });

  // Saat server-page aktif, array hanya berisi page yang sedang tampil.
  const formatSOActiveRowCount = computed(() =>
    formatSOServerPaged.value
      ? formatSOServerTotal.value
      : formatSOSorted.value.length
  );

  const formatSOPaginatedData = computed(() => {
    if (formatSOServerPaged.value) {
      return formatSOSorted.value;
    }

    const start = (formatSOCurrentPage.value - 1) * formatSORowsPerPage.value;
    return formatSOSorted.value.slice(start, start + formatSORowsPerPage.value);
  });

  const formatSOSelectedCount = computed(() =>
    selectedFormatSOIds.value.length
  );

  const currentPageFormatSOIds = computed<number[]>(() =>
    formatSOPaginatedData.value
      .map((row) => Number(row.id ?? 0))
      .filter((id) => id > 0)
  );

  const isAllCurrentPageFormatSOSelected = computed(() => {
    const ids = currentPageFormatSOIds.value;
    return ids.length > 0 && ids.every((id) =>
      selectedFormatSOIds.value.includes(id)
    );
  });

  const isFormatSOSelected = (id: string | number | undefined): boolean => {
    const normalizedId = Number(id ?? 0);
    return normalizedId > 0 && selectedFormatSOIds.value.includes(normalizedId);
  };

  const getFormatSOSelectionMetadata = (id: number) => {
    const row = formatSOPaginatedData.value.find(
      (item) => Number(item.id ?? 0) === id
    );

    if (!row) {
      return null;
    }

    return {
      customerCode: String(row.customer_code ?? '').trim().toUpperCase(),
      poDate: String(row.po_date ?? '').trim()
    };
  };

  const removeFormatSOSelectionMetadata = (id: number): void => {
    if (!(id in selectedFormatSOMetadata.value)) {
      return;
    }

    const next = { ...selectedFormatSOMetadata.value };
    delete next[id];
    selectedFormatSOMetadata.value = next;
  };

  const toggleFormatSOSelection = (id: string | number | undefined): void => {
    const normalizedId = Number(id ?? 0);
    if (normalizedId <= 0) {
      return;
    }

    const current = new Set<number>(selectedFormatSOIds.value);
    if (current.has(normalizedId)) {
      current.delete(normalizedId);
      removeFormatSOSelectionMetadata(normalizedId);
    } else {
      const metadata = getFormatSOSelectionMetadata(normalizedId);
      if (!metadata) {
        return;
      }

      current.add(normalizedId);
      selectedFormatSOMetadata.value = {
        ...selectedFormatSOMetadata.value,
        [normalizedId]: metadata
      };
    }
    selectedFormatSOIds.value = Array.from(current);
  };

  const toggleAllCurrentPageFormatSO = (): void => {
    const pageIds = currentPageFormatSOIds.value;
    if (pageIds.length === 0) {
      return;
    }

    const current = new Set<number>(selectedFormatSOIds.value);
    const allSelected = pageIds.every((id) => current.has(id));
    const metadata = { ...selectedFormatSOMetadata.value };

    pageIds.forEach((id) => {
      if (allSelected) {
        current.delete(id);
        delete metadata[id];
        return;
      }

      const rowMetadata = getFormatSOSelectionMetadata(id);
      if (!rowMetadata) {
        return;
      }

      current.add(id);
      metadata[id] = rowMetadata;
    });

    selectedFormatSOIds.value = Array.from(current);
    selectedFormatSOMetadata.value = metadata;
  };

  const clearFormatSOSelection = (): void => {
    selectedFormatSOIds.value = [];
    selectedFormatSOMetadata.value = {};
  };

  const selectedFormatSOOrderDates = computed<unknown[]>(() =>
    selectedFormatSOIds.value.map(
      (id) => selectedFormatSOMetadata.value[id]?.poDate ?? ''
    )
  );

  const selectedFormatSODateScope = computed(() =>
    resolveSelectedDownloadDateScope(selectedFormatSOOrderDates.value)
  );

  const canDownloadSelectedFormatSOExcel = computed(() => {
    return (
      selectedFormatSOIds.value.length > 0 &&
      selectedFormatSODateScope.value.allowed &&
      !isAnyExcelDownloading.value &&
      !isRegeneratingFormatSO.value
    );
  });

  const selectedFormatSODownloadDescription = computed(() => {
    if (
      selectedFormatSOIds.value.length > 0 &&
      !selectedFormatSODateScope.value.allowed
    ) {
      return selectedFormatSODateScope.value.message;
    }

    return '';
  });

  const formatSOTotalPages = computed(() => {
    const totalRows = formatSOServerPaged.value
      ? formatSOServerTotal.value
      : formatSOSorted.value.length;

    return Math.max(1, Math.ceil(totalRows / formatSORowsPerPage.value));
  });
  const formatSOVisiblePages = computed(() => {
    const total = formatSOTotalPages.value;
    const current = formatSOCurrentPage.value;
    let start = Math.max(1, current - 2);
    let end = Math.min(total, start + 4);
    start = Math.max(1, end - 4);
    return Array.from({
      length: end - start + 1
    }, (_, index) => start + index);
  });
  const formatSOShowingStart = computed(() => {
    const totalRows = formatSOServerPaged.value
      ? formatSOServerTotal.value
      : formatSOSorted.value.length;

    if (totalRows === 0) {
      return 0;
    }
    return (formatSOCurrentPage.value - 1) * formatSORowsPerPage.value + 1;
  });
  const formatSOShowingEnd = computed(() => {
    const totalRows = formatSOServerPaged.value
      ? formatSOServerTotal.value
      : formatSOSorted.value.length;

    return Math.min(
      formatSOCurrentPage.value * formatSORowsPerPage.value,
      totalRows
    );
  });

  let formatSOPageAbortController: AbortController | null = null;
  let formatSOPageRequestSerial = 0;

  const loadFormatSalesOrder =
    async (resetPage = true) => {
      if (!formatSOSectionActivated.value) {
        formatSOSectionDirty = true;
        return;
      }

      const requestSerial = ++formatSOPageRequestSerial;
      formatSOPageAbortController?.abort();
      const controller = new AbortController();
      formatSOPageAbortController = controller;
      let servedFromCache = false;

      try {
        isLoadingFormatSO.value = true;

        if (resetPage) {
          formatSOCurrentPage.value = 1;
          clearFormatSOSelection();
        }

        const baseParams = getDateOnlyFilterParams();
        const customers = [...selectedCustomers.value];
        const sortKey = formatSOSortKey.value ?? '';
        const sortDirection = formatSOSortDirection.value;
        const filters = buildFormatSOFilters() as Record<string, string[]>;
        const search = getFormatSOServerSearch();

        const cached = formatSalesOrderService.getCachedPage(
          baseParams,
          customers,
          formatSOCurrentPage.value,
          formatSORowsPerPage.value,
          sortKey,
          sortDirection,
          filters,
          search
        );

        if (cached?.status === 'success') {
          servedFromCache = true;
          if (
            controller.signal.aborted ||
            requestSerial !== formatSOPageRequestSerial
          ) {
            return;
          }

          formatSalesOrderData.value = cached.data ?? [];
          formatSOServerTotal.value = Number(cached.total ?? 0);
          lastFormatSOServerSearch = search;
          formatSOCurrentPage.value = Number(
            cached.page ?? formatSOCurrentPage.value
          );
          formatSOSectionDirty = false;

          if (formatSOCurrentPage.value < Number(cached.total_pages ?? 1)) {
            void formatSalesOrderService.prefetchPage(
              baseParams,
              customers,
              formatSOCurrentPage.value + 1,
              formatSORowsPerPage.value,
              sortKey,
              sortDirection,
              filters,
              search
            );
          }

          // First paint selesai dari cache; revalidasi lama berjalan tanpa
          // memunculkan spinner kembali.
          isLoadingFormatSO.value = false;
          if (
            !formatSalesOrderService.shouldRevalidatePage(
              baseParams,
              customers,
              formatSOCurrentPage.value,
              formatSORowsPerPage.value,
              sortKey,
              sortDirection,
              filters,
              search
            )
          ) {
            return;
          }
        }

        const response = await formatSalesOrderService.getPage(
          baseParams,
          customers,
          formatSOCurrentPage.value,
          formatSORowsPerPage.value,
          sortKey,
          sortDirection,
          filters,
          search,
          controller.signal
        );

        if (
          controller.signal.aborted ||
          requestSerial !== formatSOPageRequestSerial
        ) {
          return;
        }

        if (response.status !== 'success') {
          throw new Error(
            response.message || 'Gagal mengambil Format Sales Order'
          );
        }

        formatSalesOrderData.value = response.data ?? [];
        formatSOServerTotal.value = Number(response.total ?? 0);
        lastFormatSOServerSearch = search;
        formatSOCurrentPage.value = Number(
          response.page ?? formatSOCurrentPage.value
        );
        formatSOSectionDirty = false;

        if (formatSOCurrentPage.value < Number(response.total_pages ?? 1)) {
          void formatSalesOrderService.prefetchPage(
            baseParams,
            customers,
            formatSOCurrentPage.value + 1,
            formatSORowsPerPage.value,
            sortKey,
            sortDirection,
            filters,
            search
          );
        }
      } catch (error: any) {
        const cancelled =
          controller.signal.aborted ||
          error?.code === 'ERR_CANCELED' ||
          error?.name === 'CanceledError' ||
          error?.name === 'AbortError';

        if (!cancelled) {
          if (servedFromCache) {
            console.warn(
              'Revalidasi Format Sales Order gagal; cache tetap dipakai.',
              error
            );
          } else {
            console.error('Format Sales Order Error', error);
            notificationStore.showAlertError(
              'Gagal mengambil data Format Sales Order'
            );
          }
        }
      } finally {
        if (requestSerial === formatSOPageRequestSerial) {
          isLoadingFormatSO.value = false;
        }
        if (formatSOPageAbortController === controller) {
          formatSOPageAbortController = null;
        }
      }
    };

  const activateFormatSOSection = async (): Promise<void> => {
    const firstActivation = !formatSOSectionActivated.value;
    formatSOSectionActivated.value = true;

    if (
      firstActivation ||
      formatSOSectionDirty ||
      formatSalesOrderData.value.length === 0
    ) {
      await loadFormatSalesOrder(false);
    }
  };

  watch(formatSORowsPerPage, () => {
    if (!formatSOServerPaged.value) {
      formatSOCurrentPage.value = 1;
      return;
    }

    if (formatSOCurrentPage.value !== 1) {
      formatSOCurrentPage.value = 1;
    } else {
      void loadFormatSalesOrder(false);
    }
  });

  watch(formatSOCurrentPage, (page, previous) => {
    if (
      formatSOServerPaged.value &&
      page !== previous &&
      !isLoadingFormatSO.value
    ) {
      void loadFormatSalesOrder(false);
    }
  });

  const getFormatSOServerSearch = (): string => {
    const search = String(searchFormatSO.value ?? '').trim();
    return search.length >= 3 ? search : '';
  };

  let lastFormatSOServerSearch = '';
  let formatGlobalSearchTimer: ReturnType<typeof setTimeout> | null = null;
  watch(searchFormatSO, () => {
    if (formatGlobalSearchTimer) clearTimeout(formatGlobalSearchTimer);
    formatGlobalSearchTimer = setTimeout(() => {
      if (!formatSOServerPaged.value) {
        formatSOCurrentPage.value = 1;
        return;
      }

      const nextServerSearch = getFormatSOServerSearch();

      // 1-2 karakter hanya memfilter page yang sudah ada di browser.
      // Request database baru diperlukan saat masuk/keluar mode full-search
      // (>= 3 karakter), sehingga ketikan pendek tidak memicu LIKE ke seluruh data.
      const needsServerReload = nextServerSearch !== lastFormatSOServerSearch;

      if (formatSOCurrentPage.value !== 1) {
        formatSOCurrentPage.value = 1;
        return;
      }

      if (needsServerReload) {
        void loadFormatSalesOrder(false);
      }
    }, 300);
  });
  const buildFormatSOFilters = (): Partial<Record<FormatSOKey, string[]>> => {
    const filters: Partial<Record<FormatSOKey, string[]>> = {};
    formatSOColumns.forEach((column) => {
      const selectedValues = formatSOSelectedFilters.value[column.key] ?? [];
      if (selectedValues.length > 0) {
        filters[column.key] = selectedValues.map(toRawFilterOption);
      }
    });
    return filters;
  };
  const queueFormatSOFilterOptionSearch = (key: FormatSOKey, value: string): void => {
    const search = String(value ?? '').trim();
    const existingTimer = formatRemoteFilterTimers.get(key);
    if (existingTimer) clearTimeout(existingTimer);
    formatRemoteFilterTimers.delete(key);

    const previousController = formatRemoteFilterControllers.get(key);
    if (previousController) previousController.abort();
    formatRemoteFilterControllers.delete(key);

    if (search.length < 3 || !formatSOServerPaged.value) {
      formatRemoteFilterLoading.value[key] = false;
      formatRemoteFilterOptions.value[key] = [];
      return;
    }

    formatRemoteFilterOptions.value[key] = [];
    formatRemoteFilterLoading.value[key] = true;
    const timer = setTimeout(async () => {
      const controller = new AbortController();
      formatRemoteFilterControllers.set(key, controller);
      try {
        const filters = buildFormatSOFilters() as Record<string, string[]>;
        delete filters[key];
        const values = await formatSalesOrderService.searchFilterOptions(
          getDateOnlyFilterParams(),
          [...selectedCustomers.value],
          key,
          search,
          filters,
          controller.signal
        );
        if (!controller.signal.aborted) {
          formatRemoteFilterOptions.value[key] = values.map(normalizeFilterOption);
        }
      } catch (error: any) {
        if (error?.name !== 'CanceledError' && error?.name !== 'AbortError' && error?.code !== 'ERR_CANCELED') {
          console.warn('Pencarian filter Format SO gagal:', error);
        }
      } finally {
        if (formatRemoteFilterControllers.get(key) === controller) {
          formatRemoteFilterControllers.delete(key);
          formatRemoteFilterLoading.value[key] = false;
        }
      }
    }, 300);
    formatRemoteFilterTimers.set(key, timer);
  };

  const isFormatSOFilterOptionLoading = (key: FormatSOKey): boolean =>
    Boolean(formatRemoteFilterLoading.value[key]);

  const isFormatSOFilterRemoteSearch = (key: FormatSOKey): boolean =>
    formatSOServerPaged.value && getFormatSOSearchValue(key).trim().length >= 3;

  const isFormatSOFilterServerPaged = (): boolean =>
    formatSOServerPaged.value;

  const EXCEL_XLSX_MIME =
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  const normalizeExcelDownloadBlob = (data: unknown): Blob => {
    if (data instanceof Blob) {
      return data;
    }

    return new Blob(
      [data as BlobPart],
      { type: EXCEL_XLSX_MIME }
    );
  };

  const readDownloadErrorMessage = async (
    blob: Blob
  ): Promise<string> => {
    try {
      const text = (await blob.text()).trim();

      if (text === '') {
        return '';
      }

      try {
        const parsed = JSON.parse(text);

        return String(
          parsed?.message ??
          parsed?.error ??
          text
        ).trim();
      } catch {
        return text;
      }
    } catch {
      return '';
    }
  };

  const hasZipEndOfCentralDirectory = async (
    blob: Blob
  ): Promise<boolean> => {
    // EOCD ZIP dapat berada maksimum sekitar 65 KB dari akhir file.
    const tailSize = Math.min(blob.size, 65557);
    const tail = new Uint8Array(
      await blob
        .slice(blob.size - tailSize)
        .arrayBuffer()
    );

    for (let index = tail.length - 4; index >= 0; index--) {
      if (
        tail[index] === 0x50 &&
        tail[index + 1] === 0x4b &&
        tail[index + 2] === 0x05 &&
        tail[index + 3] === 0x06
      ) {
        return true;
      }
    }

    return false;
  };

  const assertValidXlsxDownload = async (
    blob: Blob,
    contentType: unknown
  ): Promise<void> => {
    const normalizedContentType = String(
      contentType ?? blob.type ?? ''
    ).toLowerCase();

    if (
      normalizedContentType.includes('application/json') ||
      normalizedContentType.includes('text/html') ||
      normalizedContentType.includes('text/plain')
    ) {
      throw new Error(
        (await readDownloadErrorMessage(blob)) ||
        'Backend tidak mengembalikan file Excel.'
      );
    }

    if (blob.size < 22) {
      throw new Error(
        'File Excel yang diterima tidak lengkap. Silakan ulangi download.'
      );
    }

    const prefix = new Uint8Array(
      await blob.slice(0, 4).arrayBuffer()
    );

    if (
      prefix[0] !== 0x50 ||
      prefix[1] !== 0x4b
    ) {
      throw new Error(
        (await readDownloadErrorMessage(blob)) ||
        'Response download bukan file XLSX yang valid.'
      );
    }

    if (!(await hasZipEndOfCentralDirectory(blob))) {
      throw new Error(
        'File Excel terpotong sebelum proses download selesai. File tidak disimpan; silakan ulangi.'
      );
    }
  };

  const extractExcelDownloadFilename = (
    disposition: unknown,
    fallbackName: string
  ): string => {
    const header = String(disposition ?? '');

    const utf8Match = header.match(
      /filename\*=UTF-8''([^;]+)/i
    );

    if (utf8Match?.[1]) {
      try {
        return decodeURIComponent(
          utf8Match[1].trim()
        );
      } catch {
        return utf8Match[1].trim();
      }
    }

    const normalMatch = header.match(
      /filename="?([^";]+)"?/i
    );

    return normalMatch?.[1]?.trim() || fallbackName;
  };

  const saveExcelDownloadResponse = async (
    response: any,
    fallbackName: string
  ): Promise<string> => {
    const blob = normalizeExcelDownloadBlob(
      response?.data
    );

    await assertValidXlsxDownload(
      blob,
      response?.headers?.['content-type']
    );

    const filename = extractExcelDownloadFilename(
      response?.headers?.['content-disposition'],
      fallbackName
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = filename;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);

    return filename;
  };

  const saveBlobDownload = (
    blob: Blob,
    filename: string
  ): string => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = filename;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);

    return filename;
  };

  const sanitizeArchiveFilename = (filename: string): string => {
    const cleaned = filename
      .replace(/[\\/:*?"<>|]+/g, '_')
      .replace(/\s+/g, ' ')
      .trim();

    return cleaned || `export_${Date.now()}.xlsx`;
  };

  type XlsxWorksheetMergeState = {
    path: string;
    prefix: string;
    body: string;
    suffix: string;
    appendedParts: string[];
    lastRow: number;
  };

  const getXlsxWorksheetPaths = (zip: JSZip): string[] => {
    return Object.keys(zip.files)
      .filter((path) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(path))
      .sort((left, right) => {
        const leftIndex = Number(left.match(/sheet(\d+)\.xml$/i)?.[1] ?? 0);
        const rightIndex = Number(right.match(/sheet(\d+)\.xml$/i)?.[1] ?? 0);
        return leftIndex - rightIndex;
      });
  };

  const getWorksheetMaxRow = (xml: string): number => {
    let maxRow = 0;
    const rowRegex = /<row\b[^>]*\br="(\d+)"[^>]*>/g;
    let match: RegExpExecArray | null;

    while ((match = rowRegex.exec(xml)) !== null) {
      maxRow = Math.max(maxRow, Number(match[1]) || 0);
    }

    return maxRow;
  };

  const splitWorksheetForMerge = (
    path: string,
    xml: string
  ): XlsxWorksheetMergeState => {
    const opening = /<sheetData\b[^>]*>/.exec(xml);
    if (!opening || opening.index === undefined) {
      throw new Error(`Worksheet ${path} tidak memiliki sheetData.`);
    }

    const bodyStart = opening.index + opening[0].length;
    const closeIndex = xml.indexOf('</sheetData>', bodyStart);
    if (closeIndex < 0) {
      throw new Error(`Worksheet ${path} tidak memiliki penutup sheetData.`);
    }

    const body = xml.slice(bodyStart, closeIndex);

    return {
      path,
      prefix: xml.slice(0, bodyStart),
      body,
      suffix: xml.slice(closeIndex),
      appendedParts: [],
      lastRow: Math.max(2, getWorksheetMaxRow(body))
    };
  };

  const extractXlsxSharedStringItems = (xml: string): string[] => {
    const items: string[] = [];
    const regex = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(xml)) !== null) {
      items.push(match[1]);
    }

    return items;
  };

  const loadXlsxSharedStrings = async (zip: JSZip): Promise<string[]> => {
    const file = zip.file('xl/sharedStrings.xml');
    if (!file) {
      return [];
    }

    return extractXlsxSharedStringItems(await file.async('string'));
  };

  const convertSharedStringCellsToInline = (
    rowXml: string,
    sharedStrings: readonly string[]
  ): string => {
    if (sharedStrings.length === 0 || !rowXml.includes('t="s"')) {
      return rowXml;
    }

    return rowXml.replace(
      /<c\b([^>]*?)\bt="s"([^>]*)>([\s\S]*?)<\/c>/g,
      (full, before, after, body) => {
        const valueMatch = /<v>\s*(\d+)\s*<\/v>/.exec(body);
        if (!valueMatch) {
          return full;
        }

        const sharedIndex = Number(valueMatch[1]);
        const sharedXml = sharedStrings[sharedIndex];
        if (sharedXml === undefined) {
          return full;
        }

        const inlineBody = body.replace(
          /<v>\s*\d+\s*<\/v>/,
          `<is>${sharedXml}</is>`
        );

        return `<c${before}t="inlineStr"${after}>${inlineBody}</c>`;
      }
    );
  };

  const shiftWorksheetRowXml = (
    rowXml: string,
    targetRow: number
  ): string => {
    let shifted = rowXml.replace(
      /(<row\b[^>]*\br=")\d+("[^>]*>)/,
      `$1${targetRow}$2`
    );

    shifted = shifted.replace(
      /(\br="[A-Z]{1,3})\d+(")/g,
      `$1${targetRow}$2`
    );

    return shifted;
  };

  const extractWorksheetDataRows = (
    worksheetXml: string,
    sharedStrings: readonly string[],
    state: XlsxWorksheetMergeState
  ): string => {
    const rowRegex = /<row\b[^>]*\br="(\d+)"[^>]*>[\s\S]*?<\/row>/g;
    const mergedRows: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = rowRegex.exec(worksheetXml)) !== null) {
      const sourceRow = Number(match[1]) || 0;

      // Baris 1/2 adalah title/header dari setiap chunk. Header hanya
      // dipakai dari chunk pertama agar file customer final tidak berulang.
      if (sourceRow < 3) {
        continue;
      }

      state.lastRow += 1;
      const inlineRow = convertSharedStringCellsToInline(
        match[0],
        sharedStrings
      );
      mergedRows.push(
        shiftWorksheetRowXml(inlineRow, state.lastRow)
      );
    }

    return mergedRows.join('');
  };

  const updateWorksheetRangeEndRow = (
    xml: string,
    tagName: 'dimension' | 'autoFilter',
    lastRow: number
  ): string => {
    const pattern = new RegExp(
      `(<${tagName}\\b[^>]*\\bref=")([^"]+)(")`,
      'g'
    );

    return xml.replace(pattern, (_full, before, reference, after) => {
      const updated = String(reference).replace(
        /(:\$?[A-Z]{1,3}\$?)\d+$/,
        `$1${lastRow}`
      );

      return `${before}${updated}${after}`;
    });
  };

  const buildMergedCustomerXlsx = async (
    basePayload: any,
    customer: string,
    customerTotal: number,
    chunkRows: number,
    requestChunk: (payload: any) => Promise<any>,
    fallbackPrefix: string
  ): Promise<{ blob: Blob; fileName: string; chunkCount: number }> => {
    const totalParts = Math.max(1, Math.ceil(customerTotal / chunkRows));
    let baseZip: JSZip | null = null;
    let worksheetStates: XlsxWorksheetMergeState[] = [];
    let baseWorksheetPaths: string[] = [];
    let finalFileName = '';

    for (let part = 1; part <= totalParts; part++) {
      const chunkOffset = (part - 1) * chunkRows;
      const response = await requestChunk({
        ...basePayload,
        customer,
        customers: [customer],
        single_chunk: true,
        chunk_offset: chunkOffset,
        chunk_limit: chunkRows
      });

      const chunkBlob = normalizeExcelDownloadBlob(response?.data);
      await assertValidXlsxDownload(
        chunkBlob,
        response?.headers?.['content-type']
      );

      const responseName = sanitizeArchiveFilename(
        extractExcelDownloadFilename(
          response?.headers?.['content-disposition'],
          `${fallbackPrefix}_${customer}.xlsx`
        )
      );

      if (finalFileName === '') {
        finalFileName = /\.xlsx$/i.test(responseName)
          ? responseName
          : `${responseName}.xlsx`;
      }

      const chunkZip = await JSZip.loadAsync(chunkBlob);
      const worksheetPaths = getXlsxWorksheetPaths(chunkZip);

      if (worksheetPaths.length === 0) {
        throw new Error(`Workbook ${customer} tidak memiliki worksheet.`);
      }

      if (part === 1) {
        baseZip = chunkZip;
        baseWorksheetPaths = [...worksheetPaths];
        worksheetStates = [];

        for (const path of baseWorksheetPaths) {
          const file = baseZip.file(path);
          if (!file) {
            throw new Error(`Worksheet ${path} tidak ditemukan.`);
          }

          worksheetStates.push(
            splitWorksheetForMerge(path, await file.async('string'))
          );
        }
      } else {
        if (
          worksheetPaths.length !== baseWorksheetPaths.length ||
          worksheetPaths.some((path, index) => path !== baseWorksheetPaths[index])
        ) {
          throw new Error(
            `Struktur worksheet ${customer} berubah antar chunk. Download dihentikan agar file Excel tidak rusak.`
          );
        }

        const sharedStrings = await loadXlsxSharedStrings(chunkZip);

        for (const state of worksheetStates) {
          const file = chunkZip.file(state.path);
          if (!file) {
            throw new Error(`Worksheet ${state.path} tidak ditemukan pada chunk ${part}.`);
          }

          const appendedXml = extractWorksheetDataRows(
            await file.async('string'),
            sharedStrings,
            state
          );

          if (appendedXml !== '') {
            state.appendedParts.push(appendedXml);
          }
        }
      }

      // Beri kesempatan browser menggambar ulang spinner/progress dan lepas
      // object chunk sebelum request berikutnya. Tidak ada workbook object
      // ribuan cell yang ditahan seperti ExcelJS/SheetJS.
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, 0);
      });
    }

    if (!baseZip || worksheetStates.length === 0) {
      throw new Error(`Gagal membentuk workbook ${customer}.`);
    }

    for (const state of worksheetStates) {
      const prefix = updateWorksheetRangeEndRow(
        state.prefix,
        'dimension',
        state.lastRow
      );
      const suffix = updateWorksheetRangeEndRow(
        state.suffix,
        'autoFilter',
        state.lastRow
      );

      baseZip.file(
        state.path,
        new Blob(
          [prefix, state.body, ...state.appendedParts, suffix],
          { type: 'application/xml' }
        )
      );

      // Lepas potongan XML setelah dipindahkan ke entry ZIP.
      state.appendedParts = [];
      state.body = '';
    }

    const mergedBlob = await baseZip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 3 }
    });

    return {
      blob: mergedBlob,
      fileName:
        finalFileName ||
        sanitizeArchiveFilename(`${fallbackPrefix}_${customer}.xlsx`),
      chunkCount: totalParts
    };
  };

  /**
   * Server tetap memproses maksimal satu chunk per request sehingga request PHP
   * tidak memegang seluruh customer dan timer 60 detik tidak terakumulasi.
   * Di browser, XML worksheet tiap chunk digabung menjadi SATU XLSX/customer.
   * Saat customer > 1, ZIP luar hanya berisi satu XLSX untuk tiap customer.
   */
  const downloadChunkedExcelPerCustomer = async (
    basePayload: any,
    customers: readonly string[],
    preflight: {
      by_customer?: Record<string, number>;
      chunk_rows?: number;
      estimated_files?: number;
    },
    requestChunk: (payload: any) => Promise<any>,
    zipFilename: string,
    fallbackPrefix: string
  ): Promise<{ fileName: string; fileCount: number }> => {
    const chunkRows = Math.max(
      1,
      Number(preflight.chunk_rows ?? 1000) || 1000
    );
    const multiCustomer = customers.length > 1;
    const archive = multiCustomer ? new JSZip() : null;
    const usedNames = new Set<string>();
    let fileCount = 0;
    let singleDownloadName = '';

    for (const customer of customers) {
      const customerTotal = Math.max(
        0,
        Number(preflight.by_customer?.[customer] ?? 0) || 0
      );

      if (customerTotal <= 0) {
        continue;
      }

      const merged = await buildMergedCustomerXlsx(
        basePayload,
        customer,
        customerTotal,
        chunkRows,
        requestChunk,
        fallbackPrefix
      );

      let customerFileName = sanitizeArchiveFilename(merged.fileName);
      if (usedNames.has(customerFileName)) {
        customerFileName = sanitizeArchiveFilename(
          `${customer}_${customerFileName}`
        );
      }
      usedNames.add(customerFileName);

      if (archive) {
        archive.file(customerFileName, merged.blob);
      } else {
        singleDownloadName = saveBlobDownload(
          merged.blob,
          customerFileName
        );
      }

      fileCount++;
    }

    if (fileCount === 0) {
      throw new Error('Tidak ada file Excel yang berhasil dibentuk.');
    }

    if (!archive) {
      return {
        fileName: singleDownloadName,
        fileCount
      };
    }

    const zipBlob = await archive.generateAsync({
      type: 'blob',
      compression: 'STORE'
    });

    return {
      fileName: saveBlobDownload(zipBlob, zipFilename),
      fileCount
    };
  };

  const downloadFormatSOExcel = async () => {
    if (!requireUploadSoPermission('download')) {
      return;
    }

    if (isAnyExcelDownloading.value) {
      notificationStore.showAlertWarning(
        'Proses download Excel lain masih berjalan. Tunggu sampai selesai.'
      );
      return;
    }

    const requestedCustomers = validateFormatSODownloadScope();

    if (!requestedCustomers) {
      return;
    }

    try {
      isDownloadingFormatSO.value = true;

      const initialSingleCustomer =
        requestedCustomers.length === 1
          ? requestedCustomers[0]
          : '';

      const payload: any = {
        customer: initialSingleCustomer,
        customers: [...requestedCustomers],
        filters: buildFormatSOFilters(),
        search: getFormatSOServerSearch(),
        sort_key: formatSOSortKey.value ?? '',
        sort_direction: formatSOSortDirection.value,
        from_date: fromDate.value || undefined,
        to_date:
          resolveOptionalToDate(
            fromDate.value,
            toDate.value,
            maxOrderDate.value
          ) || undefined,
        delivery_from_date:
          deliveryFromDate.value || undefined,
        delivery_to_date:
          resolveOptionalToDate(
            deliveryFromDate.value,
            deliveryToDate.value,
            maxDeliveryDate.value
          ) || undefined,
        creation_from_date:
          creationFromDate.value || undefined,
        creation_to_date:
          resolveOptionalToDate(
            creationFromDate.value,
            creationToDate.value,
            todayDate.value
          ) || undefined
      };

      // COUNT-only preflight: jangan membuat workbook untuk customer kosong.
      const preflight = await formatSalesOrderService.getDownloadPreflight(
        payload
      );

      const availableCustomers = (
        preflight.available_customers ?? []
      ).filter(isDownloadExportCustomer);

      if (availableCustomers.length === 0 || Number(preflight.total ?? 0) <= 0) {
        notificationStore.showAlertWarning(
          'Tidak ada data Format Sales Order hasil filter yang dapat di-download.'
        );
        return;
      }

      const unavailableCustomers = (
        preflight.unavailable_customers ?? []
      ).filter(isDownloadExportCustomer);

      if (unavailableCustomers.length > 0) {
        notificationStore.showAlertWarning(
          `Tidak ada data: ${unavailableCustomers.join(', ')}. ` +
          `Download dilanjutkan untuk: ${availableCustomers.join(', ')}.`
        );
      }

      payload.customers = [...availableCustomers];
      payload.customer =
        availableCustomers.length === 1
          ? availableCustomers[0]
          : '';

      const estimatedChunkFiles = Math.max(
        1,
        Number(preflight.estimated_files ?? availableCustomers.length)
      );
      const isZip = availableCustomers.length > 1;
      const needsChunkMerge =
        isZip || estimatedChunkFiles > availableCustomers.length;

      let fileName = '';
      let actualFileCount = availableCustomers.length;

      if (needsChunkMerge) {
        const archiveResult = await downloadChunkedExcelPerCustomer(
          payload,
          availableCustomers,
          preflight,
          (chunkPayload) =>
            formatSalesOrderService.downloadExcel(chunkPayload),
          `Format_Sales_Order_${Date.now()}.zip`,
          'Format_Sales_Order'
        );

        fileName = archiveResult.fileName;
        actualFileCount = archiveResult.fileCount;
      } else {
        const response = await formatSalesOrderService.downloadExcel(payload);
        fileName = await saveExcelDownloadResponse(
          response,
          `Format_Sales_Order_${availableCustomers[0]}_${Date.now()}.xlsx`
        );
      }

      notificationStore.showAlertSuccess(
        isZip
          ? `${Number(preflight.total ?? 0)} baris Format Sales Order berhasil dibuat menjadi ${actualFileCount} file Excel (1 file per customer) dalam ZIP: ${fileName}`
          : `Format Sales Order ${availableCustomers[0]} berhasil di-download (${Number(preflight.total ?? 0)} baris): ${fileName}`
      );
    } catch (error: any) {
      console.error(
        'Download Format Sales Order gagal:',
        error
      );

      let message =
        'Gagal mengunduh Excel Format Sales Order';

      const responseData =
        error.response?.data;

      if (responseData instanceof Blob) {
        const text = await responseData.text();

        try {
          const json = JSON.parse(text);
          message = json.message ?? message;
        } catch {
          if (text) {
            message = text;
          }
        }
      } else if (error.response?.data?.message) {
        message = error.response.data.message;
      } else if (error?.message) {
        message = error.message;
      }

      notificationStore.showAlertError(message);
    } finally {
      isDownloadingFormatSO.value = false;
    }
  };

  const downloadSelectedFormatSOExcel = async () => {
    if (!requireUploadSoPermission('download')) {
      return;
    }

    if (selectedFormatSOIds.value.length === 0) {
      notificationStore.showAlertWarning(
        'Centang minimal satu baris Format Sales Order terlebih dahulu.'
      );
      return;
    }

    if (isAnyExcelDownloading.value) {
      notificationStore.showAlertWarning(
        'Proses download Excel lain masih berjalan. Tunggu sampai selesai.'
      );
      return;
    }

    const dateScope = selectedFormatSODateScope.value;
    if (!dateScope.allowed) {
      notificationStore.showAlertWarning(dateScope.message);
      return;
    }

    const customerSet = new Set<DownloadExportCustomer>();
    selectedFormatSOIds.value.forEach((id) => {
      const customer = String(
        selectedFormatSOMetadata.value[id]?.customerCode ?? ''
      ).trim().toUpperCase();

      if (isDownloadExportCustomer(customer)) {
        customerSet.add(customer);
      }
    });

    if (customerSet.size === 0 && isDownloadExportCustomer(selectedCustomer.value)) {
      customerSet.add(selectedCustomer.value);
    }

    const exportCustomers = DOWNLOAD_EXPORT_CUSTOMERS.filter((customer) =>
      customerSet.has(customer)
    );

    if (exportCustomers.length === 0) {
      notificationStore.showAlertWarning(
        'Customer dari Format Sales Order yang dicentang tidak dapat ditentukan.'
      );
      return;
    }

    try {
      isDownloadingFormatSO.value = true;

      const singleCustomer =
        exportCustomers.length === 1
          ? exportCustomers[0]
          : '';

      const payload: any = {
        customer: singleCustomer,
        customers: [...exportCustomers],
        format_ids: [...selectedFormatSOIds.value],
        selected_only: true,
        filters: {},
        search: '',
        sort_key: '',
        sort_direction: 'none',
        from_date: dateScope.fromDate || undefined,
        to_date: dateScope.toDate || undefined,
        delivery_from_date:
          dateScope.deliveryFromDate || undefined,
        delivery_to_date:
          dateScope.deliveryToDate || undefined,
        creation_from_date:
          dateScope.creationFromDate || undefined,
        creation_to_date:
          dateScope.creationToDate || undefined
      };

      const preflight = await formatSalesOrderService.getDownloadPreflight(payload);
      const actualTotal = Math.max(0, Number(preflight.total ?? 0));
      const missingTotal = Math.max(0, Number(preflight.missing_total ?? 0));
      const availableCustomers = (preflight.available_customers ?? [])
        .filter(isDownloadExportCustomer);

      if (actualTotal <= 0 || availableCustomers.length === 0) {
        notificationStore.showAlertWarning(
          'Data Format Sales Order yang dipilih sudah tidak tersedia. Refresh tabel lalu pilih ulang.'
        );
        clearFormatSOSelection();
        return;
      }

      if (missingTotal > 0) {
        notificationStore.showAlertWarning(
          `${missingTotal} baris pilihan sudah tidak tersedia/cancel. ` +
          `Download dilanjutkan untuk ${actualTotal} baris yang masih aktif.`
        );
      }

      payload.customers = [...availableCustomers];
      payload.customer =
        availableCustomers.length === 1
          ? availableCustomers[0]
          : '';

      const response =
        await formatSalesOrderService.downloadExcel(payload);

      // Backend memecah selected export >1000 ID menjadi beberapa XLSX.
      const isZip =
        availableCustomers.length > 1 ||
        selectedFormatSOIds.value.length > 1000;
      const fileName = await saveExcelDownloadResponse(
        response,
        isZip
          ? `Format_Sales_Order_Selected_${Date.now()}.zip`
          : `Format_Sales_Order_Selected_${availableCustomers[0]}_${Date.now()}.xlsx`
      );

      notificationStore.showAlertSuccess(
        isZip
          ? `${actualTotal} baris Format Sales Order terpilih berhasil dibuat dalam ZIP: ${fileName}`
          : `${actualTotal} baris Format Sales Order terpilih berhasil di-download: ${fileName}`
      );
    } catch (error: any) {
      console.error('Download Selected Format Sales Order gagal:', error);

      let message = 'Gagal mengunduh Format Sales Order yang dipilih';
      const responseData = error.response?.data;

      if (responseData instanceof Blob) {
        const text = await responseData.text();
        try {
          const json = JSON.parse(text);
          message = json.message ?? message;
        } catch {
          if (text) {
            message = text;
          }
        }
      } else if (error.response?.data?.message) {
        message = error.response.data.message;
      } else if (error?.message) {
        message = error.message;
      }

      notificationStore.showAlertError(message);
    } finally {
      isDownloadingFormatSO.value = false;
    }
  };

  const regenerateFormatSalesOrder = () => {
    if (!requireUploadSoPermission('update')) {
      return;
    }

    if (selectedCustomer.value !== '' && !isOrderTrackingCustomer(selectedCustomer.value)) {
      notificationStore.showAlertWarning('Regenerate hanya tersedia untuk ADM P1, ADM P4, ADM P5, ASI ADM, TMMIN, NTC, GAYA MOTOR, DCWA, DPM, FTI, atau All Customer');
      return;
    }

    const formatRows = formatSOSorted.value;
    let activeRowCount = formatRows.length;
    let batchIds: string[] = [];
    let regenerateFormatScope: Record<string, unknown> | null = null;
    let regenerateRawScope: Record<string, unknown> | null = null;
    let regenerateSourceLabel = 'Format Sales Order hasil filter/tampilan';

    if (formatRows.length > 0) {
      if (formatSOServerPaged.value) {
        /*
         * Server pagination hanya menyimpan page aktif di browser. Kirim
         * filter ke backend agar Regenerate memproses seluruh hasil filter,
         * bukan hanya 10/20/50/100 row yang terlihat.
         */
        regenerateFormatScope = {
          ...getDateOnlyFilterParams(),
          filters: buildFormatSOFilters(),
          search: getFormatSOServerSearch()
        };
        batchIds = [];
        activeRowCount = formatSOServerTotal.value;
        regenerateSourceLabel = 'seluruh Format Sales Order yang sesuai filter';
      } else {
        const rowsWithoutBatch = formatRows.filter((row) =>
          String(row.upload_batch_id ?? '').trim() === ''
        ).length;

        if (rowsWithoutBatch > 0) {
          notificationStore.showAlertWarning(
            `${rowsWithoutBatch} baris pada hasil filter/tampilan belum memiliki Batch ID. ` +
            'Regenerate dibatalkan agar data history di luar scope tidak ikut berubah.'
          );
          return;
        }

        batchIds = Array.from(
          new Set(
            formatRows
              .map((row) => String(row.upload_batch_id ?? '').trim())
              .filter((batchId) => batchId !== '')
          )
        );
      }
    } else if (selectedCustomer.value === 'GAYA MTR') {
      /*
       * Recovery khusus Gaya Motor.
       *
       * Data legacy dapat memiliki Format SO kosong/tidak terhubung ke Raw
       * setelah perubahan Delivery Date. Dalam kondisi itu tombol Regenerate
       * tidak boleh buntu hanya karena tabel Format SO bernilai 0. Ambil scope
       * batch dari Raw Gaya Motor yang sedang tampil/filter, lalu backend akan
       * membangun ulang link gaya_raw_so_id + Req. Delv. Date.
       */
      const rawRows = gayaRawSoSortedRows.value;

      if (rawRows.length <= 0) {
        notificationStore.showAlertWarning(
          'Tidak ada Raw Gaya Motor pada hasil filter/tampilan yang dapat diregenerate.'
        );
        return;
      }

      if (rawServerPaged['GAYA MTR']) {
        /*
         * Jangan mengambil Batch ID dari page aktif. Pada server pagination,
         * browser hanya memegang 10/20/50/100 row sehingga scope Regenerate
         * bisa terpotong (contoh total 24 row tetapi hanya 2 batch page 1).
         * Kirim filter aktif; backend resolve seluruh Batch ID langsung di DB.
         */
        regenerateRawScope = {
          ...getDateOnlyFilterParams(),
          filters: buildRawServerFiltersForMode('gaya')
        };
        batchIds = [];
        activeRowCount = rawServerTotals['GAYA MTR'];
        regenerateSourceLabel =
          'seluruh Raw Gaya Motor yang sesuai filter (Format SO belum tersedia)';
      } else {
        const rowsWithoutBatch = rawRows.filter((row) =>
          String(row.uploadBatchId ?? '').trim() === ''
        ).length;

        if (rowsWithoutBatch > 0) {
          notificationStore.showAlertWarning(
            `${rowsWithoutBatch} baris Raw Gaya Motor belum memiliki Batch ID. ` +
            'Regenerate dibatalkan agar data di luar scope tidak ikut berubah.'
          );
          return;
        }

        batchIds = Array.from(
          new Set(
            rawRows
              .map((row) => String(row.uploadBatchId ?? '').trim())
              .filter((batchId) => batchId !== '')
          )
        );
        activeRowCount = rawRows.length;
        regenerateSourceLabel =
          'Raw Gaya Motor hasil filter/tampilan (Format SO belum tersedia)';
      }
    } else {
      notificationStore.showAlertWarning(
        'Tidak ada baris Format Sales Order pada hasil filter/tampilan yang dapat diregenerate.'
      );
      return;
    }

    if (
      batchIds.length <= 0 &&
      !regenerateFormatScope &&
      !regenerateRawScope
    ) {
      notificationStore.showAlertWarning(
        'Batch ID untuk hasil filter/tampilan tidak ditemukan. Refresh data lalu coba lagi.'
      );
      return;
    }

    const scopeLabel = selectedCustomer.value || 'All Customer';
    const isFilteredRegenerate = Boolean(
      regenerateFormatScope || regenerateRawScope
    );
    const batchScopeLabel = isFilteredRegenerate
      ? 'seluruh batch yang sesuai filter'
      : `${batchIds.length} batch`;
    const batchConsistencyNote = isFilteredRegenerate
      ? ' Jika hanya sebagian row dalam suatu batch cocok filter, seluruh batch tersebut tetap dibuat ulang agar data konsisten.'
      : '';

    notificationStore.showConfirm(
      'Regenerate Format Sales Order',
      'Format Sales Order akan dibuat ulang untuk ' + batchScopeLabel +
        ' dari ' + regenerateSourceLabel + ' (' + activeRowCount + ' baris) untuk ' +
        scopeLabel + '.' + batchConsistencyNote +
        ' Mapping/nomor Sales Document existing tetap dipertahankan dan Raw Files tidak dihapus. Lanjutkan?',
      async () => {
        try {
          isRegeneratingFormatSO.value = true;
          const response = await formatSalesOrderService.regenerate(
            selectedCustomer.value,
            batchIds,
            regenerateRawScope,
            regenerateFormatScope
          );

          if (response.status !== 'success') {
            notificationStore.showAlertError(response.message || 'Regenerate gagal');
            return;
          }

          invalidateTrackingFilterOptionsCache();
          formatSalesOrderService.clearCache();

          // Reset page SEBELUM reload agar request setelah regenerate selalu
          // mengambil page pertama dari scope filter terbaru.
          formatSOCurrentPage.value = 1;
          currentPage.value = 1;

          await Promise.all([
            loadFormatSalesOrder(),
            loadTrackingData()
          ]);

          notificationStore.showAlertSuccess(response.message);
        } catch (error: any) {
          console.error('Regenerate Format SO gagal:', error);
          notificationStore.showAlertError(
            error.response?.data?.message ||
              'Regenerate Format Sales Order gagal'
          );
        } finally {
          isRegeneratingFormatSO.value = false;
        }
      }
    );
  };
  const formatRemoteFilterOptions = ref<Partial<Record<FormatSOKey, string[]>>>({});
  const formatRemoteFilterLoading = ref<Partial<Record<FormatSOKey, boolean>>>({});
  const formatRemoteFilterTimers = new Map<FormatSOKey, ReturnType<typeof setTimeout>>();
  const formatRemoteFilterControllers = new Map<FormatSOKey, AbortController>();

  const closeFormatSOFilter = () => {
    formatSOColumns.forEach((column) => {
      formatSOOpenFilters.value[column.key] = false;
    });

    formatSOActiveFilterKey.value = null;
    clearAnchoredFilterPopup();
  };
  const toggleFormatSOFilter = async (key: FormatSOKey, event?: MouseEvent) => {
    const isCurrentlyOpen = formatSOActiveFilterKey.value ===
      key;
    /*
    * Tutup popup dari seluruh section.
    */
    closeAllPopups();
    if (isCurrentlyOpen) {
      return;
    }

    const trigger = event?.currentTarget as HTMLElement | null;
    if (!trigger) {
      return;
    }
    setAnchoredFilterPopup(
      trigger,
      (anchor) => {
        formatSOFilterPopupPosition.value =
          getSafeRawFilterPopupPosition(anchor, 270, 300);
      }
    );
    formatSOActiveFilterKey.value =
      key;
    formatSOOpenFilters.value[key] = true;
  };
  const getFormatSOSelectedValues = (key: FormatSOKey): string[] => {
    return formatSOSelectedFilters.value[key] || [];
  };
  const getFormatSOSearchValue = (key: FormatSOKey): string => {
    return formatSOSearchFilters.value[key] || '';
  };
  const setFormatSOSearchValue = (key: FormatSOKey, value: string) => {
    formatSOSearchFilters.value[key] = String(value ?? '');
  };
  const getFormatSOFilteredOptions = (key: FormatSOKey): string[] => {
    const remoteSearch = getFormatSOSearchValue(key).trim();
    if (remoteSearch.length >= 3 && formatSOServerPaged.value) {
      return sortFilterOptions(formatRemoteFilterOptions.value[key] ?? []);
    }

    let sourceRows = [...formatSalesOrderData.value];

    if (selectedCustomer.value) {
      sourceRows = sourceRows.filter(
        (item) => item.customer_code === selectedCustomer.value
      );
    }

    if (searchFormatSO.value) {
      const keyword = searchFormatSO.value;
      sourceRows = sourceRows.filter((item) =>
        matchesTextSearch(
          [
            item.sales_document,
            item.material,
            item.sold_to_party,
            item.reference_doc
          ].join(' '),
          keyword
        )
      );
    }

    sourceRows = getRowsMatchingOtherColumnFilters(
      sourceRows,
      formatSOColumns,
      formatSOSelectedFilters.value,
      key,
      (item, columnKey) => item[columnKey]
    );

    const values = sourceRows
      .map((item) => {
        return normalizeFilterOption(item[key]);
      });
    const uniqueValues = sortFilterOptions(
      Array.from(new Set(values))
    );
    const search = getFormatSOSearchValue(key).toLowerCase();
    return uniqueValues.filter((value) => {
      return matchesFilterOptionSearch(key, value, search);
    });
  };
  const toggleAllFormatSOColumn = (key: FormatSOKey) => {
    const options = getFormatSOFilteredOptions(key);
    const selected = getFormatSOSelectedValues(key);
    const allSelected = options.length > 0 &&
      options.every((option) => {
        return selected.includes(option);
      });
    formatSOSelectedFilters.value[key] = allSelected ? [] : [...options];
  };
  const isAllFormatSOSelected = (key: FormatSOKey): boolean => {
    const options = getFormatSOFilteredOptions(key);
    const selected = getFormatSOSelectedValues(key);
    return (options.length > 0 &&
      options.every((option) => {
        return selected.includes(option);
      }));
  };
  const isFormatSOFilterSelected = (key: FormatSOKey, value: string): boolean => {
    return getFormatSOSelectedValues(key).includes(value);
  };
  const getFormatSOSelectedLabel = (key: FormatSOKey): string => {
    const selected = getFormatSOSelectedValues(key);
    if (selected.length === 0) {
      return 'All';
    }
    if (selected.length === 1) {
      return selected[0];
    }
    return `${selected.length} Selected`;
  };
  const clearFormatSOColumnFilter = (key: FormatSOKey) => {
    formatSOSelectedFilters.value[key] = [];
    formatSOSearchFilters.value[key] = '';
  };
  const toggleFormatSOFilterValue = (key: FormatSOKey, value: string) => {
    const selected = [...getFormatSOSelectedValues(key)];
    const index = selected.indexOf(value);
    if (index < 0) {
      selected.push(value);
    }
    else {
      selected.splice(index, 1);
    }
    formatSOSelectedFilters.value[key] = selected;
  };
  const setFormatSOSort = (key: FormatSOKey, direction: SortDirection) => {
    formatSOSortKey.value = direction === 'none' ? null : key;
    formatSOSortDirection.value = direction;
    const wasFirstPage = formatSOCurrentPage.value === 1;
    formatSOCurrentPage.value = 1;

    if (formatSOServerPaged.value && wasFirstPage) {
      void loadFormatSalesOrder(false);
    }
  };
  const getFormatSOSortDirection = (key: FormatSOKey): SortDirection => {
    return formatSOSortKey.value === key ? formatSOSortDirection.value : 'none';
  };
  const formatSOFirstPage = () => {
    formatSOCurrentPage.value = 1;
  };
  const formatSOPrevPage = () => {
    if (formatSOCurrentPage.value > 1) {
      formatSOCurrentPage.value--;
    }
  };
  const formatSONextPage = () => {
    if (formatSOCurrentPage.value < formatSOTotalPages.value) {
      formatSOCurrentPage.value++;
    }
  };
  const formatSOLastPage = () => {
    formatSOCurrentPage.value = formatSOTotalPages.value;
  };
  watch(formatSOSelectedFilters, () => {
    if (!formatSOServerPaged.value) {
      formatSOCurrentPage.value = 1;
      return;
    }
    if (formatSOCurrentPage.value !== 1) {
      formatSOCurrentPage.value = 1;
    } else {
      void loadFormatSalesOrder(false);
    }
  }, { deep: true });
  // ========================================================
  // RAW FILES
  // ========================================================
  const card2Columns: TableColumn<Card2Key>[] = [
    { key: 'plantCode', label: 'Plant Code', width: '70px' },
    { key: 'shopCode', label: 'Shop Code', width: '70px' },
    { key: 'partCategory', label: 'Part Category', width: '80px' },
    { key: 'route', label: 'Route', width: '100px' },
    { key: 'lp', label: 'LP', width: '70px' },
    { key: 'trip', label: 'Trip', width: '70px' },
    { key: 'vendorCode', label: 'Vendor Code', width: '70px' },
    { key: 'vendorAlias', label: 'Vendor Alias', width: '100px' },
    { key: 'vendorSite', label: 'Vendor Site', width: '120px' },
    { key: 'vendorSiteAlias', label: 'Vendor Site Alias', width: '100px' },
    { key: 'orderNo', label: 'Order No', width: '140px' },
    { key: 'poNumber', label: 'PO Number', width: '100px' },
    { key: 'calcDate', label: 'Calc. Date', width: '100px' },
    { key: 'orderDate', label: 'Order Date', width: '100px' },
    // { key: 'orderTime', label: 'Order Time', width: '100px' },
    { key: 'delDate', label: 'Del. Date', width: '100px' },
    { key: 'delTime', label: 'Del. Time', width: '100px' },
    { key: 'delCycle', label: 'Del. Cycle', width: '70px' },
    { key: 'docNo', label: 'Doc No', width: '70px' },
    { key: 'recStatus', label: 'Rec Status', width: '100px' },
    { key: 'dnType', label: 'DN Type', width: '100px' },
    // { key: 'recDate', label: 'Rec. Date', width: '130px' },
    // { key: 'recBy', label: 'Rec. By', width: '130px' },
    { key: 'partNo', label: 'Part No', width: '130px' },
    { key: 'partName', label: 'Part Name', width: '320px' },
    { key: 'jobNo', label: 'Job No', width: '100px' },
    { key: 'lane', label: 'Lane', width: '70px' },
    { key: 'qtyKbn', label: 'Qty/Kbn', width: '70px' },
    { key: 'orderKbn', label: 'Order(Kbn)', width: '90px' },
    { key: 'orderPcs', label: 'Order(Pcs)', width: '90px' },
    { key: 'qtyReceive', label: 'Qty Receive', width: '70px' },
    { key: 'qtyBalance', label: 'Qty Balance', width: '70px' },
    { key: 'cancelStatus', label: 'Cancel Status', width: '100px' },
    // Metadata upload ditampilkan paling kanan agar batch upload mudah difilter/delete.
    { key: 'createdAt' as Card2Key, label: 'Created At', width: '160px' }
    // { key: 'remark', label: 'Remark', width: '70px' }
  ];
  const card2FrozenColumns: Card2Key[] = ['plantCode', 'shopCode', 'partCategory'];
  const card2ChipColumns: Card2Key[] = ['recStatus', 'dnType', 'cancelStatus'];
  type SelectableRawRow =
    Card2Row & {
      rawId:
      number;

      uploadBatchId:
      string;

      // Timestamp saat row Raw Files dibuat di database.
      createdAt:
      string;
    };

  const card2Data =
    ref<SelectableRawRow[]>([]);

  // ============================================================
  // RAW FILES MULTIPLE DELETE
  // ============================================================

  const selectedRawIds =
    ref<number[]>([]);

  const isDeletingRawFiles =
    ref(false);

  // ============================================================
  // RAW FILES CANCEL / RESTORE
  // ============================================================

  const isCancellingRawFiles =
    ref(false);

  const isRestoringRawFiles =
    ref(false);

  const showCancelRawModal =
    ref(false);

  const cancelRawMode =
    ref<RawCancelMode>(
      'selected'
    );

  const cancelReason =
    ref('');

  /*
   * User yang dipilih untuk audit Cancelled By.
   *
   * Opsi dropdown berasal dari userMaster yang sama
   * dengan Upload By melalui uploadUserOptions.
   */
  const cancelActionBy =
    ref('');

  const showCancelledDrawer =
    ref(false);

  const cancelledDrawerTab =
    ref<
      'parts' |
      'dn' |
      'history'
    >(
      'parts'
    );

  const isLoadingCancelledData =
    ref(false);

  const cancelledRawRows =
    ref<CancelledRawRow[]>(
      []
    );

  const cancelledDnRows =
    ref<CancelledDnRow[]>(
      []
    );

  const cancelHistoryRows =
    ref<CancelHistoryRow[]>(
      []
    );

  const cancelledRawTotal = ref(0);
  const cancelledDnTotal = ref(0);
  const cancelHistoryTotal = ref(0);

  const cancelledRawPage = ref(1);
  const cancelHistoryPage = ref(1);
  const cancelledRowsPerPage = ref(20);
  const cancelHistoryRowsPerPage = ref(20);
  const cancelledRowsPerPageOptions = [20, 50, 100];
  const cancelledDnLoaded = ref(false);

  const cancelledRawTotalPages = computed(() =>
    Math.max(1, Math.ceil(cancelledRawTotal.value / cancelledRowsPerPage.value))
  );

  const cancelHistoryTotalPages = computed(() =>
    Math.max(1, Math.ceil(cancelHistoryTotal.value / cancelHistoryRowsPerPage.value))
  );

  const selectedCancelledRawIds =
    ref<number[]>(
      []
    );

  const restoreReason =
    ref('');

  const RAW_SELECTION_COLUMN_WIDTH =
    40;
  const card2SelectedFilters = ref<Record<Card2Key, string[]>>(createCard2SelectedFilters());
  const card2SearchFilters = ref<Record<Card2Key, string>>(createCard2SearchFilters());
  const card2OpenFilters = ref<Record<Card2Key, boolean>>(createCard2OpenFilters());
  const card2ActiveFilterKey = ref<Card2Key | null>(null);
  /**
   * Posisi popup filter Raw Files.
   *
   * Popup memakai Teleport ke body sehingga posisi
   * dihitung dari tombol filter yang diklik.
   */
  const card2FilterPopupPosition = ref({
    top: 0,
    left: 0,
    maxHeight: 420
  });
  const card2CurrentPage = ref(1);
  /*
  * Jumlah baris Raw Files per halaman.
  * Dibuat reactive agar selector Show 10/20/50/100
  * bekerja seperti pagination MDFO.
  */
  const card2RowsPerPage = ref(10);
  const card2RowsPerPageOptions = [10, 20, 50, 100];
  const card2SortColumn = ref<Card2Key | null>(null);
  const card2SortDirection = ref<SortDirection>('none');
  function createCard2SelectedFilters(): Record<Card2Key, string[]> {
    const filters = {} as Record<Card2Key, string[]>;
    card2Columns.forEach((column) => {
      filters[column.key] = [];
    });
    return filters;
  }
  function createCard2SearchFilters(): Record<Card2Key, string> {
    const filters = {} as Record<Card2Key, string>;
    card2Columns.forEach((column) => {
      filters[column.key] = '';
    });
    return filters;
  }
  function createCard2OpenFilters(): Record<Card2Key, boolean> {
    const filters = {} as Record<Card2Key, boolean>;
    card2Columns.forEach((column) => {
      filters[column.key] = false;
    });
    return filters;
  }
  const mapCard2RowFromBackend =
    (
      row: any
    ): SelectableRawRow => {

      return {

        // =================================================
        // INTERNAL ID
        // tidak ditampilkan sebagai column
        // =================================================

        rawId:
          Number(
            row.id ??
            row.rawId ??
            0
          ),

        uploadBatchId:
          String(
            row.upload_batch_id ??
            row.uploadBatchId ??
            ''
          ),

        createdAt:
          String(
            row.created_at ??
            row.createdAt ??
            ''
          ),


        // =================================================
        // DISPLAY COLUMNS
        // =================================================

        plantCode:
          row.plantCode ??
          row.plant_code ??
          '',

        shopCode:
          row.shopCode ??
          row.shop_code ??
          '',

        partCategory:
          row.partCategory ??
          row.part_category ??
          '',

        route:
          row.route ??
          '',

        lp:
          row.lp ??
          '',

        trip:
          row.trip ??
          '',

        vendorCode:
          row.vendorCode ??
          row.vendor_code ??
          '',

        vendorAlias:
          row.vendorAlias ??
          row.vendor_alias ??
          '',

        vendorSite:
          row.vendorSite ??
          row.vendor_site ??
          '',

        vendorSiteAlias:
          row.vendorSiteAlias ??
          row.vendor_site_alias ??
          '',

        orderNo:
          row.orderNo ??
          row.order_no ??
          '',

        poNumber:
          row.poNumber ??
          row.po_number ??
          '',

        calcDate:
          row.calcDate ??
          row.calc_date ??
          '',

        orderDate:
          row.orderDate ??
          row.order_date ??
          '',

        orderTime:
          row.orderTime ??
          row.order_time ??
          '',

        delDate:
          row.delDate ??
          row.del_date ??
          '',

        delTime:
          row.delTime ??
          row.del_time ??
          '',

        delCycle:
          row.delCycle ??
          row.del_cycle ??
          '',

        docNo:
          row.docNo ??
          row.doc_no ??
          '',

        recStatus:
          row.recStatus ??
          row.rec_status ??
          '',

        dnType:
          row.dnType ??
          row.dn_type ??
          '',

        recDate:
          row.recDate ??
          row.rec_date ??
          '',

        recBy:
          row.recBy ??
          row.rec_by ??
          '',

        partNo:
          row.partNo ??
          row.part_no ??
          '',

        partName:
          row.partName ??
          row.part_name ??
          '',

        jobNo:
          row.jobNo ??
          row.job_no ??
          '',

        lane:
          row.lane ??
          '',

        qtyKbn:
          row.qtyKbn ??
          row.qty_kbn ??
          '',

        orderKbn:
          row.orderKbn ??
          row.order_kbn ??
          '',

        orderPcs:
          row.orderPcs ??
          row.order_pcs ??
          '',

        qtyReceive:
          row.qtyReceive ??
          row.qty_receive ??
          '',

        qtyBalance:
          row.qtyBalance ??
          row.qty_balance ??
          '',

        cancelStatus:
          row.cancelStatus ??
          row.cancel_status ??
          '',

        remark:
          row.remark ??
          ''
      };
    };





  // ============================================================
  // RAW SALES ORDER ASI ADM (PDF PURCHASE ORDER + MDFO DAILY)
  // ============================================================

  type AsiAdmRawSoColumn =
    TableColumn<AsiAdmRawSoKey> & {
      letter: string;
      number: number;
    };

  const asiAdmRawSoColumns: AsiAdmRawSoColumn[] = [
    { key: 'partNumberFinal', letter: 'A', number: 1, label: 'PART NUMBER FINAL', width: '190px' },
    { key: 'partName', letter: 'B', number: 2, label: 'PART NAME', width: '330px' },
    { key: 'note', letter: 'C', number: 3, label: 'NOTE', width: '260px' },
    { key: 'orderType', letter: 'D', number: 4, label: 'ORDER TYPE', width: '130px' },
    { key: 'qty', letter: 'E', number: 5, label: 'QTY', width: '100px' },
    { key: 'orderDate', letter: 'F', number: 6, label: 'ORDER DATE', width: '120px' },
    { key: 'deliveryDate', letter: 'G', number: 7, label: 'DELIVERY DATE', width: '120px' },
    { key: 'poNumber', letter: 'H', number: 8, label: 'PO NO.', width: '180px' }
  ];

  const asiAdmRawSoData = ref<AsiAdmRawSoRow[]>([]);
  const asiAdmRawSoPreviewRows = ref<AsiAdmRawSoRow[]>([]);
  const asiAdmRawSoPreviewSummary = ref<AsiAdmRawSoPreviewSummary | null>(null);
  const asiAdmRawSoPreviewErrors = ref<string[]>([]);
  const asiAdmRawSoCanSubmitPreview = ref(false);
  const showAsiAdmRawSoPreview = ref(false);

  const asiAdmRawSoSelectedFilters =
    ref<Partial<Record<AsiAdmRawSoKey, string[]>>>({});
  const asiAdmRawSoSearchFilters =
    ref<Partial<Record<AsiAdmRawSoKey, string>>>({});
  const asiAdmRawSoOpenFilters =
    ref<Partial<Record<AsiAdmRawSoKey, boolean>>>({});
  const asiAdmRawSoActiveFilterKey = ref<AsiAdmRawSoKey | null>(null);
  const asiAdmRawSoSortColumn = ref<AsiAdmRawSoKey | null>(null);
  const asiAdmRawSoSortDirection = ref<SortDirection>('none');
  const asiAdmRawSoFilterPopupPosition = ref({
    top: 0,
    left: 0,
    maxHeight: 300
  });
  const asiAdmRawSoCurrentPage = ref(1);
  const asiAdmRawSoRowsPerPage = ref(10);
  const asiAdmRawSoRowsPerPageOptions = [10, 20, 50, 100];

  const ASI_ADM_RAW_SO_FROZEN_KEYS: AsiAdmRawSoKey[] = [
    'partNumberFinal',
    'partName',
    'note'
  ];

  const asiAdmRawSoTableWidth = computed(() => {
    const width = asiAdmRawSoColumns.reduce(
      (sum, column) => sum + getColumnWidthNumber(column.width),
      0
    );

    return `${width + 48}px`;
  });

  const asiAdmRawSoPreviewTableWidth = computed(() => {
    const width = asiAdmRawSoColumns.reduce(
      (sum, column) => sum + getColumnWidthNumber(column.width),
      0
    );

    return `${width}px`;
  });

  const getAsiAdmRawSoFrozenLeftPosition = (
    key: AsiAdmRawSoKey,
    leadingOffset = 48
  ): number => {
    const index = asiAdmRawSoColumns.findIndex(
      (column) => column.key === key
    );

    if (index <= 0) {
      return leadingOffset;
    }

    return leadingOffset + asiAdmRawSoColumns
      .slice(0, index)
      .reduce(
        (sum, column) => sum + getColumnWidthNumber(column.width),
        0
      );
  };

  const getAsiAdmRawSoColumnStyle = (
    key: AsiAdmRawSoKey,
    isHeader = false,
    rowIndex = 0,
    isPreview = false
  ): CSSProperties => {
    const column = asiAdmRawSoColumns.find(
      (item) => item.key === key
    );
    const width = column?.width ?? '120px';
    const isFrozen = ASI_ADM_RAW_SO_FROZEN_KEYS.includes(key);
    const backgroundColor = isHeader
      ? '#eff6ff'
      : rowIndex % 2 === 0
        ? '#ffffff'
        : '#f8fafc';
    const gridColor = '#e2e8f0';
    const shadows = [
      `inset -1px 0 0 ${gridColor}`,
      `inset 0 -1px 0 ${gridColor}`
    ];

    if (key === 'partNumberFinal') {
      shadows.push(`inset 1px 0 0 ${gridColor}`);
    }

    if (isHeader) {
      shadows.push(`inset 0 1px 0 ${gridColor}`);
    }

    if (isFrozen && key === 'note') {
      shadows.push('3px 0 7px -6px rgba(15, 23, 42, 0.35)');
    }

    const style: CSSProperties = {
      width,
      minWidth: width,
      maxWidth: width,
      backgroundColor,
      boxShadow: shadows.join(', ')
    };

    if (!isPreview && isFrozen) {
      style.position = 'sticky';
      style.left = `${getAsiAdmRawSoFrozenLeftPosition(key)}px`;
      style.zIndex = isHeader ? 302 : 80;
    } else {
      style.position = 'relative';
      style.zIndex = isHeader ? 301 : 1;
    }

    return style;
  };

  const mapAsiAdmRawSoRowFromBackend = (
    row: AsiAdmRawSoBackendRow
  ): AsiAdmRawSoRow => {
    const value = (key: string): string =>
      String(row[key] ?? '');

    return {
      id: Number(row.id ?? 0),
      uploadBatchId: value('upload_batch_id'),
      sourceFile: value('source_file'),
      sourceRow: Number(row.source_row ?? 0),
      partNumberRaw: value('part_number_raw'),
      pdfTotalQty: value('pdf_total_qty'),
      period: value('periode'),
      mdfoRawId: Number(row.mdfo_raw_id ?? 0),
      mdfoDayNo: Number(row.mdfo_day_no ?? 0),
      mdfoRevision: Number(row.mdfo_revision ?? 0),
      mdfoTotalQty: value('mdfo_total_qty'),
      validationStatus: value('validation_status'),
      validationMessage: value('validation_message'),
      uploadedBy: value('uploaded_by'),
      createdAt: value('created_at'),
      partNumberFinal: value('part_number_final'),
      partName: value('part_name'),
      note: value('note'),
      orderType: value('order_type'),
      qty: value('qty'),
      orderDate: value('order_date'),
      deliveryDate: value('delivery_date'),
      poNumber: value('po_number')
    };
  };

  const getAsiAdmRawSoSelectedValues = (
    key: AsiAdmRawSoKey
  ): string[] => asiAdmRawSoSelectedFilters.value[key] ?? [];

  const getAsiAdmRawSoColumnOptions = (
    key: AsiAdmRawSoKey
  ): string[] => sortFilterOptions(
    Array.from(
      new Set(
        getRowsMatchingOtherColumnFilters(
          asiAdmRawSoData.value,
          asiAdmRawSoColumns,
          asiAdmRawSoSelectedFilters.value,
          key,
          (row, columnKey) => row[columnKey]
        ).map(
          (row) => normalizeFilterOption(row[key])
        )
      )
    )
  );

  const getAsiAdmRawSoSearchValue = (
    key: AsiAdmRawSoKey
  ): string => asiAdmRawSoSearchFilters.value[key] ?? '';

  const setAsiAdmRawSoSearchValue = (
    key: AsiAdmRawSoKey,
    value: string
  ) => {
    asiAdmRawSoSearchFilters.value[key] = value;
  };

  const getAsiAdmRawSoFilteredColumnOptions = (
    key: AsiAdmRawSoKey
  ): string[] => {
    const search = getAsiAdmRawSoSearchValue(key)
      .trim()
      .toLowerCase();

    return getAsiAdmRawSoColumnOptions(key).filter(
      (option) => matchesFilterOptionSearch(key, option, search)
    );
  };

  const toggleAsiAdmRawSoFilter = (
    key: AsiAdmRawSoKey,
    value: string
  ) => {
    const selected = getAsiAdmRawSoSelectedValues(key);
    asiAdmRawSoSelectedFilters.value[key] = selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value];
  };

  const toggleAllAsiAdmRawSoColumn = (
    key: AsiAdmRawSoKey
  ) => {
    const options = getAsiAdmRawSoFilteredColumnOptions(key);
    const selected = getAsiAdmRawSoSelectedValues(key);
    const allSelected =
      options.length > 0 &&
      options.every((option) => selected.includes(option));

    asiAdmRawSoSelectedFilters.value[key] = allSelected
      ? []
      : [...options];
  };

  const clearAsiAdmRawSoColumnFilter = (
    key: AsiAdmRawSoKey
  ) => {
    asiAdmRawSoSelectedFilters.value[key] = [];
    asiAdmRawSoSearchFilters.value[key] = '';
  };

  const isAllAsiAdmRawSoSelected = (
    key: AsiAdmRawSoKey
  ): boolean => {
    const options = getAsiAdmRawSoFilteredColumnOptions(key);
    const selected = getAsiAdmRawSoSelectedValues(key);

    return (
      options.length > 0 &&
      options.every((option) => selected.includes(option))
    );
  };

  const isAsiAdmRawSoFilterSelected = (
    key: AsiAdmRawSoKey,
    value: string
  ): boolean => getAsiAdmRawSoSelectedValues(key).includes(value);

  const closeAsiAdmRawSoFilter = () => {
    asiAdmRawSoOpenFilters.value = {};
    asiAdmRawSoActiveFilterKey.value = null;
    clearAnchoredFilterPopup();
  };

  const setAsiAdmRawSoSort = (
    key: AsiAdmRawSoKey,
    direction: SortDirection
  ) => {
    asiAdmRawSoSortColumn.value = direction === 'none' ? null : key;
    asiAdmRawSoSortDirection.value = direction;
    asiAdmRawSoCurrentPage.value = 1;
    if (rawServerPaged['ASI ADM']) {
      void fetchAsiAdmRawSoData(false);
    }
  };

  const isAsiAdmRawSoSortActive = (
    key: AsiAdmRawSoKey,
    direction: 'asc' | 'desc'
  ): boolean =>
    asiAdmRawSoSortColumn.value === key &&
    asiAdmRawSoSortDirection.value === direction;

  const isAsiAdmRawSoNoSortActive = (
    key: AsiAdmRawSoKey
  ): boolean =>
    asiAdmRawSoSortColumn.value !== key ||
    asiAdmRawSoSortDirection.value === 'none';

  const asiAdmRawSoFilteredRows = computed(() => {
    return getRowsMatchingOtherColumnFilters(
      asiAdmRawSoData.value,
      asiAdmRawSoColumns,
      asiAdmRawSoSelectedFilters.value,
      null,
      (row, key) => row[key]
    );
  });

  const asiAdmRawSoSortedRows = computed(() => {
    const rows = [...asiAdmRawSoFilteredRows.value];
    const key = asiAdmRawSoSortColumn.value;
    const direction = asiAdmRawSoSortDirection.value;

    if (!key || direction === 'none') {
      return rows;
    }

    rows.sort((first, second) => {
      const compared = String(first[key] ?? '').localeCompare(
        String(second[key] ?? ''),
        'id',
        { numeric: true }
      );

      return direction === 'asc'
        ? compared
        : -compared;
    });

    return rows;
  });

  const asiAdmRawSoTotalPages = computed(() => {
    const totalRows = rawServerPaged['ASI ADM']
      ? rawServerTotals['ASI ADM']
      : asiAdmRawSoSortedRows.value.length;

    return Math.max(
      1,
      Math.ceil(totalRows / asiAdmRawSoRowsPerPage.value)
    );
  });

  const asiAdmRawSoVisiblePages = computed(() => {
    const start = Math.max(1, asiAdmRawSoCurrentPage.value - 2);
    const end = Math.min(asiAdmRawSoTotalPages.value, start + 4);

    return Array.from(
      { length: Math.max(0, end - start + 1) },
      (_, index) => start + index
    );
  });

  const asiAdmRawSoPaginatedRows = computed(() => {
    if (rawServerPaged['ASI ADM']) {
      return asiAdmRawSoSortedRows.value;
    }

    const start =
      (asiAdmRawSoCurrentPage.value - 1) *
      asiAdmRawSoRowsPerPage.value;

    return asiAdmRawSoSortedRows.value.slice(
      start,
      start + asiAdmRawSoRowsPerPage.value
    );
  });

  const asiAdmRawSoShowingStart = computed(() => {
    const totalRows = rawServerPaged['ASI ADM']
      ? rawServerTotals['ASI ADM']
      : asiAdmRawSoSortedRows.value.length;
    return totalRows === 0
      ? 0
      : (asiAdmRawSoCurrentPage.value - 1) *
          asiAdmRawSoRowsPerPage.value + 1;
  });

  const asiAdmRawSoShowingEnd = computed(() => {
    const totalRows = rawServerPaged['ASI ADM']
      ? rawServerTotals['ASI ADM']
      : asiAdmRawSoSortedRows.value.length;
    return Math.min(
      asiAdmRawSoCurrentPage.value * asiAdmRawSoRowsPerPage.value,
      totalRows
    );
  });

  const asiAdmRawSoFirstPage = () => {
    asiAdmRawSoCurrentPage.value = 1;
  };
  const asiAdmRawSoPrevPage = () => {
    if (asiAdmRawSoCurrentPage.value > 1) {
      asiAdmRawSoCurrentPage.value--;
    }
  };
  const asiAdmRawSoNextPage = () => {
    if (asiAdmRawSoCurrentPage.value < asiAdmRawSoTotalPages.value) {
      asiAdmRawSoCurrentPage.value++;
    }
  };
  const asiAdmRawSoLastPage = () => {
    asiAdmRawSoCurrentPage.value = asiAdmRawSoTotalPages.value;
  };

  const getAsiAdmRawSoSelectedLabel = (
    key: AsiAdmRawSoKey
  ): string => {
    const values = asiAdmRawSoSelectedFilters.value[key] ?? [];

    if (values.length === 0) return '';
    if (values.length === 1) return values[0];

    return `${values.length} selected`;
  };

  const toggleAsiAdmRawSoDropdown = async (
    key: AsiAdmRawSoKey,
    event: MouseEvent
  ) => {
    const element = event.currentTarget as HTMLElement;
    const wasOpen = asiAdmRawSoOpenFilters.value[key] === true;
    closeAllPopups();

    if (wasOpen) {
      asiAdmRawSoActiveFilterKey.value = null;
      clearAnchoredFilterPopup();
      return;
    }

    setAnchoredFilterPopup(
      element,
      (anchor) => {
        asiAdmRawSoFilterPopupPosition.value =
          getSafeRawFilterPopupPosition(anchor);
      }
    );

    asiAdmRawSoOpenFilters.value[key] = true;
    asiAdmRawSoActiveFilterKey.value = key;
  };

  const closeAsiAdmRawSoPreview = () => {
    showAsiAdmRawSoPreview.value = false;
  };

  const fetchAsiAdmRawSoData = async (resetPage = true) => {
    try {
      isLoadingRawData.value = true;
      if (resetPage) {
        asiAdmRawSoCurrentPage.value = 1;
      }

      const params = getDateOnlyFilterParams();

      if (rawServerPaged['ASI ADM']) {
        await loadRawServerPage<AsiAdmRawSoBackendRow>(
          'ASI ADM',
          params,
          asiAdmRawSoCurrentPage.value,
          asiAdmRawSoRowsPerPage.value,
          (rows) => {
            asiAdmRawSoData.value = rows.map(mapAsiAdmRawSoRowFromBackend);
          },
          { filters: buildRawServerFiltersForMode('asi'), sortKey: String(asiAdmRawSoSortColumn.value ?? ''), sortDirection: asiAdmRawSoSortDirection.value }
        );
      } else {
        const rows = await customerOrderService.getAsiAdmRawSo(params);
        asiAdmRawSoData.value = rows.map(mapAsiAdmRawSoRowFromBackend);
        rawServerTotals['ASI ADM'] = asiAdmRawSoData.value.length;
      }

      refreshLatestAvailableFilterDates();
    } catch (error) {
      console.error('Gagal fetch Raw Ordering ASI ADM:', error);
      notificationStore.showAlertError(
        'Gagal mengambil Raw Ordering ASI ADM'
      );
    } finally {
      isLoadingRawData.value = false;
    }
  };

  watch(
    asiAdmRawSoSelectedFilters,
    () => {
      asiAdmRawSoCurrentPage.value = 1;
    },
    { deep: true }
  );

  watch(asiAdmRawSoRowsPerPage, () => {
    if (rawServerPaged['ASI ADM']) {
      if (asiAdmRawSoCurrentPage.value !== 1) {
        asiAdmRawSoCurrentPage.value = 1;
      } else {
        void fetchAsiAdmRawSoData(false);
      }
      return;
    }
    asiAdmRawSoCurrentPage.value = 1;
  });

  watch(asiAdmRawSoCurrentPage, (page, previous) => {
    if (
      rawServerPaged['ASI ADM'] &&
      page !== previous &&
      !isLoadingRawData.value
    ) {
      void fetchAsiAdmRawSoData(false);
    }
  });

  watch(asiAdmRawSoTotalPages, (totalPages) => {
    if (asiAdmRawSoCurrentPage.value > totalPages) {
      asiAdmRawSoCurrentPage.value = totalPages;
    }
  });

  // ============================================================
  // RAW SALES ORDER GAYA MOTOR (PDF DELIVERY NOTE)
  // ============================================================

  type GayaRawSoColumn =
    TableColumn<GayaRawSoKey> & {
      letter: string;
      number: number;
    };

  const gayaRawSoColumns: GayaRawSoColumn[] = [
    { key: 'seqNo', letter: 'A', number: 1, label: 'SEQ NO', width: '78px' },
    { key: 'materialNumber', letter: 'B', number: 2, label: 'MATERIAL NUMBER', width: '170px' },
    { key: 'partNumber', letter: 'C', number: 3, label: 'PART NUMBER', width: '170px' },
    { key: 'description', letter: 'D', number: 4, label: 'DESCRIPTION', width: '310px' },
    { key: 'totalQty', letter: 'E', number: 5, label: 'TOTAL QTY', width: '100px' },
    { key: 'qtyPerKanban', letter: 'F', number: 6, label: 'QTY PER KANBAN', width: '120px' },
    { key: 'totalKanban', letter: 'G', number: 7, label: 'TOTAL KANBAN', width: '115px' },
    { key: 'jitCall', letter: 'H', number: 8, label: 'JIT CALL', width: '110px' },
    { key: 'po', letter: 'I', number: 9, label: 'PO', width: '135px' },
    { key: 'orderDate', letter: 'J', number: 10, label: 'ORDER DATE', width: '115px' },
    { key: 'deliveryDate', letter: 'K', number: 11, label: 'DELIVERY DATE', width: '120px' },
    { key: 'cycle', letter: 'L', number: 12, label: 'CYCLE', width: '78px' },
    { key: 'jobNo', letter: 'M', number: 13, label: 'JOB NO', width: '95px' },
    { key: 'createdAt', letter: 'N', number: 14, label: 'CREATED AT', width: '160px' }
  ];

  const gayaRawSoData = ref<GayaRawSoRow[]>([]);
  const gayaRawSoPreviewRows = ref<GayaRawSoRow[]>([]);
  const gayaUploadPreviewSummary = ref<GayaRawSoPreviewSummary | null>(null);
  const showGayaRawSoPreview = ref(false);

  /*
   * Preview Gaya Motor per file PDF.
   * Data backend tetap sama; pemisahan dilakukan dari sourceFile sehingga
   * tidak mengubah proses upload / database yang sudah berjalan.
   */
  const gayaRawSoActivePreviewFile = ref('');

  type GayaRawSoPreviewFileItem = {
    name: string;
    rowCount: number;
    index: number;
  };

  const gayaRawSoPreviewFiles =
    computed<GayaRawSoPreviewFileItem[]>(() => {
      const rowCountByFile =
        new Map<string, number>();

      gayaRawSoPreviewRows.value.forEach((row) => {
        const fileName =
          String(row.sourceFile ?? '').trim();

        if (fileName === '') {
          return;
        }

        rowCountByFile.set(
          fileName,
          (rowCountByFile.get(fileName) ?? 0) + 1
        );
      });

      const orderedFileNames: string[] = [];
      const seen = new Set<string>();

      const appendFileName = (value: unknown) => {
        const fileName =
          String(value ?? '').trim();

        if (
          fileName === '' ||
          seen.has(fileName)
        ) {
          return;
        }

        seen.add(fileName);
        orderedFileNames.push(fileName);
      };

      /*
       * Prioritas urutan mengikuti file yang dipilih user.
       * Fallback ke sourceFile dari response agar preview tetap aman
       * ketika dipanggil dari state yang sudah terisi.
       */
      gayaSoUploadFiles.value.forEach((file) => {
        appendFileName(file.name);
      });

      gayaRawSoPreviewRows.value.forEach((row) => {
        appendFileName(row.sourceFile);
      });

      return orderedFileNames.map(
        (name, index) => ({
          name,
          rowCount: rowCountByFile.get(name) ?? 0,
          index
        })
      );
    });

  const gayaRawSoActivePreviewRows =
    computed<GayaRawSoRow[]>(() => {
      const activeFile =
        gayaRawSoActivePreviewFile.value ||
        gayaRawSoPreviewFiles.value[0]?.name ||
        '';

      if (activeFile === '') {
        return [];
      }

      return gayaRawSoPreviewRows.value.filter(
        (row) =>
          String(row.sourceFile ?? '').trim() ===
          activeFile
      );
    });

  const buildGayaRawSoPreviewSummaryFromRows = (
    rows: GayaRawSoRow[],
    hasActiveFile: boolean
  ): GayaRawSoPreviewSummary => {
    const toNumber = (value: unknown): number => {
      const normalized =
        String(value ?? '')
          .trim()
          .replace(/,/g, '');

      if (normalized === '') {
        return 0;
      }

      const parsed = Number(normalized);
      return Number.isFinite(parsed)
        ? parsed
        : 0;
    };

    const uniqueNaturalStrings = (
      values: unknown[]
    ): string[] => {
      return Array.from(
        new Set(
          values
            .map((value) =>
              String(value ?? '').trim()
            )
            .filter(Boolean)
        )
      ).sort((first, second) =>
        first.localeCompare(
          second,
          'id',
          { numeric: true }
        )
      );
    };

    const orderDates =
      uniqueNaturalStrings(
        rows.map((row) => row.orderDate)
      ).sort();

    const deliveryDates =
      uniqueNaturalStrings(
        rows.map((row) => row.deliveryDate)
      ).sort();

    const cycles =
      Array.from(
        new Set(
          rows
            .map((row) =>
              Math.trunc(
                toNumber(row.cycle)
              )
            )
            .filter((cycle) => cycle > 0)
        )
      ).sort(
        (first, second) =>
          first - second
      );

    return {
      total_files:
        hasActiveFile ? 1 : 0,
      total_rows:
        rows.length,
      total_qty:
        rows.reduce(
          (total, row) =>
            total +
            toNumber(row.totalQty),
          0
        ),
      total_kanban:
        rows.reduce(
          (total, row) =>
            total +
            toNumber(row.totalKanban),
          0
        ),
      jit_call_numbers:
        uniqueNaturalStrings(
          rows.map((row) => row.jitCall)
        ),
      agreement_numbers:
        uniqueNaturalStrings(
          rows.map((row) => row.po)
        ),
      cycles,
      order_date_from:
        orderDates[0] ?? '',
      order_date_to:
        orderDates.length > 0
          ? orderDates[
              orderDates.length - 1
            ]
          : '',
      delivery_date_from:
        deliveryDates[0] ?? '',
      delivery_date_to:
        deliveryDates.length > 0
          ? deliveryDates[
              deliveryDates.length - 1
            ]
          : ''
    };
  };

  const gayaRawSoActivePreviewSummary =
    computed<GayaRawSoPreviewSummary | null>(() => {
      const activeFile =
        gayaRawSoActivePreviewFile.value ||
        gayaRawSoPreviewFiles.value[0]?.name ||
        '';

      if (activeFile === '') {
        return null;
      }

      return buildGayaRawSoPreviewSummaryFromRows(
        gayaRawSoActivePreviewRows.value,
        true
      );
    });

  const selectGayaRawSoPreviewFile = (
    fileName: string
  ) => {
    const normalized =
      String(fileName ?? '').trim();

    if (
      normalized === '' ||
      !gayaRawSoPreviewFiles.value.some(
        (item) => item.name === normalized
      )
    ) {
      return;
    }

    gayaRawSoActivePreviewFile.value =
      normalized;
  };

  const gayaRawSoSelectedFilters =
    ref<Partial<Record<GayaRawSoKey, string[]>>>({});
  const gayaRawSoSearchFilters =
    ref<Partial<Record<GayaRawSoKey, string>>>({});
  const gayaRawSoOpenFilters =
    ref<Partial<Record<GayaRawSoKey, boolean>>>({});
  const gayaRawSoActiveFilterKey = ref<GayaRawSoKey | null>(null);
  const gayaRawSoSortColumn = ref<GayaRawSoKey | null>(null);
  const gayaRawSoSortDirection = ref<SortDirection>('none');
  const gayaRawSoFilterPopupPosition = ref({
    top: 0,
    left: 0,
    maxHeight: 300
  });
  const gayaRawSoCurrentPage = ref(1);
  const gayaRawSoRowsPerPage = ref(10);
  const gayaRawSoRowsPerPageOptions = [10, 20, 50, 100];

  /*
   * Website Raw Gaya Motor menampilkan CREATED AT sebagai kolom terakhir.
   * Preview sebelum Submit tetap mengikuti kolom asli PDF, karena CREATED AT
   * baru terbentuk sesudah data berhasil disimpan ke database.
   */
  const gayaRawSoVisibleColumns = computed(() => gayaRawSoColumns);

  const gayaRawSoPreviewColumns =
    computed<GayaRawSoColumn[]>(() =>
      gayaRawSoColumns.filter(
        (column) => column.key !== 'createdAt'
      )
    );

  const GAYA_RAW_SO_FROZEN_KEYS: GayaRawSoKey[] = [
    'seqNo',
    'materialNumber',
    'partNumber'
  ];

  const gayaRawSoTableWidth = computed(() => {
    const width = gayaRawSoVisibleColumns.value.reduce(
      (sum, column) => sum + getColumnWidthNumber(column.width),
      0
    );
    return `${width + 48}px`;
  });

  const gayaRawSoPreviewTableWidth = computed(() => {
    const width = gayaRawSoPreviewColumns.value.reduce(
      (sum, column) => sum + getColumnWidthNumber(column.width),
      0
    );
    return `${width}px`;
  });

  const getGayaRawSoFrozenLeftPosition = (
    key: GayaRawSoKey,
    leadingOffset = 48
  ): number => {
    const index = gayaRawSoColumns.findIndex((column) => column.key === key);
    if (index <= 0) return leadingOffset;

    return leadingOffset + gayaRawSoColumns
      .slice(0, index)
      .reduce(
        (sum, column) => sum + getColumnWidthNumber(column.width),
        0
      );
  };

  const getGayaRawSoColumnStyle = (
    key: GayaRawSoKey,
    isHeader = false,
    rowIndex = 0,
    isPreview = false
  ): CSSProperties => {
    const column = gayaRawSoColumns.find((item) => item.key === key);
    const width = column?.width ?? '120px';
    const isFrozen = GAYA_RAW_SO_FROZEN_KEYS.includes(key);
    const backgroundColor = isHeader
      ? '#eff6ff'
      : rowIndex % 2 === 0
        ? '#ffffff'
        : '#f8fafc';
    const gridColor = '#e2e8f0';
    const shadows = [
      `inset -1px 0 0 ${gridColor}`,
      `inset 0 -1px 0 ${gridColor}`
    ];

    if (key === 'seqNo') {
      shadows.push(`inset 1px 0 0 ${gridColor}`);
    }
    if (isHeader) {
      shadows.push(`inset 0 1px 0 ${gridColor}`);
    }
    if (isFrozen && key === 'partNumber') {
      shadows.push('3px 0 7px -6px rgba(15, 23, 42, 0.32)');
    }

    const base: CSSProperties = {
      minWidth: width,
      width,
      maxWidth: width,
      boxSizing: 'border-box',
      backgroundColor,
      backgroundImage: `linear-gradient(${backgroundColor}, ${backgroundColor})`,
      boxShadow: shadows.join(', '),
      isolation: 'isolate'
    };

    if (!isFrozen) {
      return {
        ...base,
        /*
         * Semua header preview Gaya Motor harus tetap sticky saat scroll
         * vertikal, termasuk DESCRIPTION sampai kolom terakhir.
         * Jangan gunakan position: relative pada header karena akan
         * menimpa class `sticky top-0` di UploadSo.vue.
         */
        position: isHeader ? 'sticky' : 'relative',
        top: isHeader ? '0px' : undefined,
        zIndex: isHeader ? 700 : 1
      };
    }

    return {
      ...base,
      position: 'sticky',
      top: isHeader ? '0px' : undefined,
      left: `${getGayaRawSoFrozenLeftPosition(key, isPreview ? 0 : 48)}px`,
      zIndex: isHeader ? 850 : 80,
      transform: 'translateZ(0)',
      backfaceVisibility: 'hidden'
    };
  };

  const getGayaRawSoColumnOptions = (key: GayaRawSoKey): string[] => {
    return sortFilterOptions(
      Array.from(new Set(
        getRowsMatchingOtherColumnFilters(
          gayaRawSoData.value,
          gayaRawSoVisibleColumns.value,
          gayaRawSoSelectedFilters.value,
          key,
          (row, columnKey) => row[columnKey]
        ).map((row) => normalizeFilterOption(row[key]))
      ))
    );
  };

  const getGayaRawSoSelectedValues = (key: GayaRawSoKey): string[] =>
    gayaRawSoSelectedFilters.value[key] ?? [];

  const getGayaRawSoSearchValue = (key: GayaRawSoKey): string =>
    gayaRawSoSearchFilters.value[key] ?? '';

  const setGayaRawSoSearchValue = (key: GayaRawSoKey, value: string) => {
    gayaRawSoSearchFilters.value[key] = String(value ?? '');
  };

  const getGayaRawSoFilteredColumnOptions = (key: GayaRawSoKey): string[] => {
    const search = getGayaRawSoSearchValue(key)
      .trim()
      .toLocaleLowerCase('id');
    const options = getGayaRawSoColumnOptions(key);
    return search === ''
      ? options
      : options.filter((option) =>
        matchesFilterOptionSearch(key, option, search)
      );
  };

  const toggleGayaRawSoFilter = (key: GayaRawSoKey, value: string) => {
    const selected = [...getGayaRawSoSelectedValues(key)];
    const index = selected.indexOf(value);
    if (index < 0) selected.push(value);
    else selected.splice(index, 1);
    gayaRawSoSelectedFilters.value[key] = selected;
  };

  const toggleAllGayaRawSoColumn = (key: GayaRawSoKey) => {
    const options = getGayaRawSoFilteredColumnOptions(key);
    const selected = getGayaRawSoSelectedValues(key);
    const allSelected = options.length > 0 &&
      options.every((option) => selected.includes(option));
    gayaRawSoSelectedFilters.value[key] = allSelected ? [] : [...options];
  };

  const clearGayaRawSoColumnFilter = (key: GayaRawSoKey) => {
    gayaRawSoSelectedFilters.value[key] = [];
    gayaRawSoSearchFilters.value[key] = '';
  };

  const isAllGayaRawSoSelected = (key: GayaRawSoKey): boolean => {
    const options = getGayaRawSoFilteredColumnOptions(key);
    const selected = getGayaRawSoSelectedValues(key);
    return options.length > 0 && options.every((option) => selected.includes(option));
  };

  const isGayaRawSoFilterSelected = (
    key: GayaRawSoKey,
    value: string
  ): boolean => getGayaRawSoSelectedValues(key).includes(value);

  const closeGayaRawSoFilter = () => {
    gayaRawSoOpenFilters.value = {};
    gayaRawSoActiveFilterKey.value = null;
    clearAnchoredFilterPopup();
  };

  const setGayaRawSoSort = (
    key: GayaRawSoKey,
    direction: SortDirection
  ) => {
    gayaRawSoSortColumn.value = direction === 'none' ? null : key;
    gayaRawSoSortDirection.value = direction;
    gayaRawSoCurrentPage.value = 1;
    if (rawServerPaged['GAYA MTR']) {
      void fetchGayaRawSoData(false);
    }
  };

  const isGayaRawSoSortActive = (
    key: GayaRawSoKey,
    direction: 'asc' | 'desc'
  ): boolean =>
    gayaRawSoSortColumn.value === key &&
    gayaRawSoSortDirection.value === direction;

  const isGayaRawSoNoSortActive = (key: GayaRawSoKey): boolean =>
    gayaRawSoSortColumn.value !== key ||
    gayaRawSoSortDirection.value === 'none';

  const gayaRawSoFilteredRows = computed(() => {
    return getRowsMatchingOtherColumnFilters(
      gayaRawSoData.value,
      gayaRawSoVisibleColumns.value,
      gayaRawSoSelectedFilters.value,
      null,
      (row, key) => row[key]
    );
  });

  const gayaRawSoSortedRows = computed(() => {
    const rows = [...gayaRawSoFilteredRows.value];
    const key = gayaRawSoSortColumn.value;
    const direction = gayaRawSoSortDirection.value;

    if (!key || direction === 'none') return rows;

    rows.sort((first, second) => {
      const compared = String(first[key] ?? '').localeCompare(
        String(second[key] ?? ''),
        'id',
        { numeric: true }
      );
      return direction === 'asc' ? compared : -compared;
    });

    return rows;
  });

  const regenerateFormatSOActiveRowCount = computed(() => {
    if (
      selectedCustomer.value === 'GAYA MTR' &&
      formatSOActiveRowCount.value === 0
    ) {
      return rawServerPaged['GAYA MTR']
        ? rawServerTotals['GAYA MTR']
        : gayaRawSoSortedRows.value.length;
    }

    return formatSOActiveRowCount.value;
  });

  const gayaRawSoTotalPages = computed(() => {
    const totalRows = rawServerPaged['GAYA MTR']
      ? rawServerTotals['GAYA MTR']
      : gayaRawSoSortedRows.value.length;
    return Math.max(1, Math.ceil(totalRows / gayaRawSoRowsPerPage.value));
  });

  const gayaRawSoVisiblePages = computed(() => {
    const start = Math.max(1, gayaRawSoCurrentPage.value - 2);
    const end = Math.min(gayaRawSoTotalPages.value, start + 4);
    return Array.from(
      { length: Math.max(0, end - start + 1) },
      (_, index) => start + index
    );
  });

  const gayaRawSoPaginatedRows = computed(() => {
    if (rawServerPaged['GAYA MTR']) {
      return gayaRawSoSortedRows.value;
    }
    const start = (gayaRawSoCurrentPage.value - 1) * gayaRawSoRowsPerPage.value;
    return gayaRawSoSortedRows.value.slice(start, start + gayaRawSoRowsPerPage.value);
  });

  const gayaRawSoShowingStart = computed(() => {
    const totalRows = rawServerPaged['GAYA MTR']
      ? rawServerTotals['GAYA MTR']
      : gayaRawSoSortedRows.value.length;
    return totalRows === 0
      ? 0
      : (gayaRawSoCurrentPage.value - 1) * gayaRawSoRowsPerPage.value + 1;
  });
  const gayaRawSoShowingEnd = computed(() => {
    const totalRows = rawServerPaged['GAYA MTR']
      ? rawServerTotals['GAYA MTR']
      : gayaRawSoSortedRows.value.length;
    return Math.min(
      gayaRawSoCurrentPage.value * gayaRawSoRowsPerPage.value,
      totalRows
    );
  });

  const gayaRawSoFirstPage = () => { gayaRawSoCurrentPage.value = 1; };
  const gayaRawSoPrevPage = () => {
    if (gayaRawSoCurrentPage.value > 1) gayaRawSoCurrentPage.value--;
  };
  const gayaRawSoNextPage = () => {
    if (gayaRawSoCurrentPage.value < gayaRawSoTotalPages.value) {
      gayaRawSoCurrentPage.value++;
    }
  };
  const gayaRawSoLastPage = () => {
    gayaRawSoCurrentPage.value = gayaRawSoTotalPages.value;
  };

  const getGayaRawSoSelectedLabel = (key: GayaRawSoKey): string => {
    const values = gayaRawSoSelectedFilters.value[key] ?? [];
    if (values.length === 0) return '';
    if (values.length === 1) return values[0];
    return `${values.length} selected`;
  };



  type RawFilterPopupPosition = {
    top: number;
    left: number;
    maxHeight: number;
  };

  /**
   * Posisi popup filter Raw Files yang aman terhadap batas viewport.
   *
   * Penting:
   * - document.documentElement.clientWidth dipakai untuk menghindari area
   *   scrollbar kanan ikut dihitung sebagai ruang kosong.
   * - visualViewport dipakai bila browser sedang zoom.
   * - Jika kolom berada di ujung kanan (mis. CREATED AT), popup akan
   *   bergeser ke kiri sehingga seluruh popup tetap terlihat.
   * - Jika ruang di bawah header sempit, popup otomatis dibuka ke atas.
   */
  const getSafeRawFilterPopupPosition = (
    trigger: HTMLElement,
    popupWidth = 270,
    preferredHeight = 300
  ): RawFilterPopupPosition => {
    const rect = trigger.getBoundingClientRect();
    const visualViewport = window.visualViewport;

    const viewportLeft = visualViewport?.offsetLeft ?? 0;
    const viewportTop = visualViewport?.offsetTop ?? 0;

    const documentWidth =
      document.documentElement.clientWidth ||
      window.innerWidth;

    const documentHeight =
      document.documentElement.clientHeight ||
      window.innerHeight;

    const viewportWidth = Math.min(
      visualViewport?.width ?? window.innerWidth,
      documentWidth
    );

    const viewportHeight = Math.min(
      visualViewport?.height ?? window.innerHeight,
      documentHeight
    );

    const viewportRight = viewportLeft + viewportWidth;
    const viewportBottom = viewportTop + viewportHeight;

    const viewportPadding = 10;
    const popupGap = 6;

    const minimumLeft = viewportLeft + viewportPadding;
    const maximumLeft = Math.max(
      minimumLeft,
      viewportRight - popupWidth - viewportPadding
    );

    let left = rect.left;

    // Kolom paling kanan: align sisi kanan popup ke sisi kanan trigger.
    if (left + popupWidth > viewportRight - viewportPadding) {
      left = rect.right - popupWidth;
    }

    left = Math.min(
      Math.max(left, minimumLeft),
      maximumLeft
    );

    const belowTop = rect.bottom + popupGap;
    const aboveBottom = rect.top - popupGap;

    const availableBelow = Math.max(
      0,
      viewportBottom - belowTop - viewportPadding
    );

    const availableAbove = Math.max(
      0,
      aboveBottom - viewportTop - viewportPadding
    );

    const minimumUsefulHeight = 220;
    const openAbove =
      availableBelow < minimumUsefulHeight &&
      availableAbove > availableBelow;

    const availableHeight = openAbove
      ? availableAbove
      : availableBelow;

    const maxHeight = Math.max(
      120,
      Math.min(preferredHeight, availableHeight)
    );

    const top = openAbove
      ? Math.max(
        viewportTop + viewportPadding,
        aboveBottom - maxHeight
      )
      : Math.max(
        viewportTop + viewportPadding,
        belowTop
      );

    return {
      top,
      left,
      maxHeight
    };
  };

  type AnchoredFilterPopup = {
    trigger: HTMLElement;
    updatePosition: (trigger: HTMLElement) => void;
  };

  let activeAnchoredFilterPopup: AnchoredFilterPopup | null = null;
  let anchoredFilterPopupFrame: number | null = null;

  const clearAnchoredFilterPopup = (): void => {
    activeAnchoredFilterPopup = null;

    if (
      anchoredFilterPopupFrame !== null &&
      typeof window !== 'undefined'
    ) {
      window.cancelAnimationFrame(anchoredFilterPopupFrame);
      anchoredFilterPopupFrame = null;
    }
  };

  const setAnchoredFilterPopup = (
    trigger: HTMLElement,
    updatePosition: (trigger: HTMLElement) => void
  ): void => {
    activeAnchoredFilterPopup = {
      trigger,
      updatePosition
    };

    updatePosition(trigger);
  };

  const updateAnchoredFilterPopupPosition = (): void => {
    const popup = activeAnchoredFilterPopup;

    if (!popup) {
      return;
    }

    if (!popup.trigger.isConnected) {
      clearAnchoredFilterPopup();
      closeAllPopups();
      return;
    }

    const rect = popup.trigger.getBoundingClientRect();
    const visualViewport = window.visualViewport;
    const viewportLeft = visualViewport?.offsetLeft ?? 0;
    const viewportTop = visualViewport?.offsetTop ?? 0;
    const viewportRight = viewportLeft +
      (visualViewport?.width ?? window.innerWidth);
    const viewportBottom = viewportTop +
      (visualViewport?.height ?? window.innerHeight);
    const isOutsideViewport =
      rect.width <= 0 ||
      rect.height <= 0 ||
      rect.right <= viewportLeft ||
      rect.left >= viewportRight ||
      rect.bottom <= viewportTop ||
      rect.top >= viewportBottom;

    if (isOutsideViewport) {
      closeAllPopups();
      return;
    }

    popup.updatePosition(popup.trigger);
  };

  const scheduleAnchoredFilterPopupPosition = (): void => {
    if (
      typeof window === 'undefined' ||
      activeAnchoredFilterPopup === null ||
      anchoredFilterPopupFrame !== null
    ) {
      return;
    }

    anchoredFilterPopupFrame = window.requestAnimationFrame(() => {
      anchoredFilterPopupFrame = null;
      updateAnchoredFilterPopupPosition();
    });
  };

  const toggleGayaRawSoDropdown = async (
    key: GayaRawSoKey,
    event: MouseEvent
  ) => {
    const element = event.currentTarget as HTMLElement;
    const wasOpen = gayaRawSoOpenFilters.value[key] === true;
    closeAllPopups();

    if (wasOpen) {
      gayaRawSoActiveFilterKey.value = null;
      clearAnchoredFilterPopup();
      return;
    }

    setAnchoredFilterPopup(
      element,
      (anchor) => {
        gayaRawSoFilterPopupPosition.value =
          getSafeRawFilterPopupPosition(anchor);
      }
    );

    gayaRawSoOpenFilters.value[key] = true;
    gayaRawSoActiveFilterKey.value = key;
  };

  const closeGayaRawSoPreview = () => {
    showGayaRawSoPreview.value = false;
  };

  const mapGayaRawSoRowFromBackend = (
    row: GayaRawSoBackendRow
  ): GayaRawSoRow => {
    const value = (key: string): string => String(row[key] ?? '');

    return {
      id: Number(row.id ?? 0),
      uploadBatchId: value('upload_batch_id'),
      sourceFile: value('source_file'),
      sourceRow: Number(row.source_row ?? 0),
      deliveryDate: value('delivery_date'),
      period: value('periode'),
      uploadedBy: value('uploaded_by'),
      createdAt: value('created_at'),
      seqNo: value('seq_no'),
      materialNumber: value('material_number'),
      partNumber: value('part_number'),
      description: value('description'),
      totalQty: value('total_qty'),
      qtyPerKanban: value('qty_per_kanban'),
      totalKanban: value('total_kanban'),
      jitCall: value('jit_call_no'),
      po: value('agreement_no'),
      orderDate: value('order_date'),
      cycle: value('cycle_no'),
      jobNo: value('job_no')
    };
  };

  const fetchGayaRawSoData = async (resetPage = true) => {
    try {
      isLoadingRawData.value = true;
      if (resetPage) gayaRawSoCurrentPage.value = 1;
      const params = getDateOnlyFilterParams();

      if (rawServerPaged['GAYA MTR']) {
        await loadRawServerPage<GayaRawSoBackendRow>(
          'GAYA MTR',
          params,
          gayaRawSoCurrentPage.value,
          gayaRawSoRowsPerPage.value,
          (rows) => {
            gayaRawSoData.value = rows.map(mapGayaRawSoRowFromBackend);
          },
          { filters: buildRawServerFiltersForMode('gaya'), sortKey: String(gayaRawSoSortColumn.value ?? ''), sortDirection: gayaRawSoSortDirection.value }
        );
      } else {
        const rows = await customerOrderService.getGayaRawSo(params);
        gayaRawSoData.value = rows.map(mapGayaRawSoRowFromBackend);
        rawServerTotals['GAYA MTR'] = gayaRawSoData.value.length;
      }

      refreshLatestAvailableFilterDates();
    } catch (error) {
      console.error('Gagal fetch Raw SO Gaya Motor:', error);
      notificationStore.showAlertError('Gagal mengambil Raw SO Gaya Motor');
    } finally {
      isLoadingRawData.value = false;
    }
  };

  watch(gayaRawSoSelectedFilters, () => {
    gayaRawSoCurrentPage.value = 1;
  }, { deep: true });
  watch(gayaRawSoRowsPerPage, () => {
    if (rawServerPaged['GAYA MTR']) {
      if (gayaRawSoCurrentPage.value !== 1) gayaRawSoCurrentPage.value = 1;
      else void fetchGayaRawSoData(false);
      return;
    }
    gayaRawSoCurrentPage.value = 1;
  });
  watch(gayaRawSoCurrentPage, (page, previous) => {
    if (rawServerPaged['GAYA MTR'] && page !== previous && !isLoadingRawData.value) {
      void fetchGayaRawSoData(false);
    }
  });
  watch(gayaRawSoTotalPages, (totalPages) => {
    if (gayaRawSoCurrentPage.value > totalPages) {
      gayaRawSoCurrentPage.value = totalPages;
    }
  });

  // ============================================================
  // RAW SALES ORDER DPM
  // ============================================================

  type DpmRawSoColumn = TableColumn<DpmRawSoKey> & {
    letter: string;
    number: number;
    numeric?: boolean;
  };

  const dpmRawSoColumns: DpmRawSoColumn[] = [
    { key: 'no', letter: 'A', number: 1, label: 'No', width: '58px' },
    { key: 'plant', letter: 'B', number: 2, label: 'Plant', width: '78px' },
    { key: 'plantDesc', letter: 'C', number: 3, label: 'Plant Desc', width: '145px' },
    { key: 'diNumber', letter: 'D', number: 4, label: 'DI Number', width: '155px' },
    { key: 'deliveryDate', letter: 'E', number: 5, label: 'Deliv Date', width: '115px' },
    { key: 'vendorCode', letter: 'F', number: 6, label: 'Vendor Code', width: '108px' },
    { key: 'vendorName', letter: 'G', number: 7, label: 'Vendor Name', width: '190px' },
    { key: 'materialId', letter: 'H', number: 8, label: 'ID Material', width: '185px' },
    { key: 'description', letter: 'I', number: 9, label: 'Description', width: '300px' },
    { key: 'partNumber', letter: 'J', number: 10, label: 'Part Number', width: '150px' },
    { key: 'diQty', letter: 'K', number: 11, label: 'DI Qty', width: '90px', numeric: true },
    { key: 'qtyPerKanban', letter: 'L', number: 12, label: 'Qty/Kanban', width: '105px', numeric: true },
    { key: 'kanbanQty', letter: 'M', number: 13, label: 'Kanban Qty', width: '105px', numeric: true },
    { key: 'deliveredQty', letter: 'N', number: 14, label: 'Delivered Qty', width: '115px', numeric: true },
    { key: 'poNumber', letter: 'O', number: 15, label: 'PO Number', width: '125px' },
    { key: 'poItem', letter: 'P', number: 16, label: 'PO Item', width: '85px' },
    { key: 'cycleDelivery', letter: 'Q', number: 17, label: 'Cycle Delivery', width: '125px' },
    { key: 'deliveryTime', letter: 'R', number: 18, label: 'Delivery Time', width: '115px' },
    { key: 'gate', letter: 'S', number: 19, label: 'Gate', width: '85px' },
    { key: 'deliveryLocation', letter: 'T', number: 20, label: 'Delivery Location', width: '195px' },
    { key: 'confirmQtyDel', letter: 'U', number: 21, label: 'Confirm Qty Del', width: '130px', numeric: true },
    { key: 'kanbanDelQty', letter: 'V', number: 22, label: 'Kanban Del Qty', width: '130px', numeric: true },
    { key: 'productionDate', letter: 'W', number: 23, label: 'Production Date', width: '130px' },
    // Metadata database ditampilkan paling kanan pada Raw Files DPM.
    { key: 'createdAt', letter: 'X', number: 24, label: 'Created At', width: '165px' }
  ];

  // ============================================================
  // RAW SALES ORDER FTI - GENERATE FROM ZSTT
  // ============================================================
  type FtiRawSoColumn = TableColumn<FtiRawSoKey>;
  const ftiRawSoColumns: FtiRawSoColumn[] = [
    { key: 'partNo', label: 'Part No', width: '165px' },
    { key: 'partName', label: 'Part Name', width: '300px' },
    { key: 'poNumber', label: 'PO Number', width: '150px' },
    { key: 'qty', label: 'Qty', width: '105px' },
    { key: 'orderDate', label: 'Order Date', width: '125px' },
    { key: 'deliveryDate', label: 'Delivery Date', width: '125px' },
    // Metadata database ditampilkan paling kanan khusus Raw Files FTI.
    { key: 'createdAt', label: 'Creation Date', width: '155px' }
  ];
  const ftiRawSoData = ref<FtiRawSoRow[]>([]);
  const ftiRawSoPreviewRows = ref<FtiRawSoRow[]>([]);
  const ftiRawSoPreviewSummary = ref<Record<string, any> | null>(null);
  const showFtiRawSoPreview = ref(false);
  const ftiRawSoSelectedFilters = ref<Partial<Record<FtiRawSoKey, string[]>>>({});
  const ftiRawSoSearchFilters = ref<Partial<Record<FtiRawSoKey, string>>>({});
  const ftiRawSoOpenFilters = ref<Partial<Record<FtiRawSoKey, boolean>>>({});
  const ftiRawSoActiveFilterKey = ref<FtiRawSoKey | null>(null);
  const ftiRawSoFilterPopupPosition = ref({
    top: 0,
    left: 0,
    maxHeight: 300
  });
  const ftiRawSoSortColumn = ref<FtiRawSoKey | null>(null);
  const ftiRawSoSortDirection = ref<SortDirection>('none');
  const ftiRawSoCurrentPage = ref(1);
  const ftiRawSoRowsPerPage = ref(10);
  const ftiRawSoRowsPerPageOptions = [10, 20, 50, 100];

  const mapFtiRawSoRowFromBackend = (row: FtiRawSoBackendRow): FtiRawSoRow => ({
    id: Number(row.id ?? 0),
    uploadBatchId: String(row.upload_batch_id ?? ''),
    sourceZsttBatchId: String(row.source_zstt_batch_id ?? ''),
    periode: String(row.periode ?? ''),
    revision: String(row.revision ?? ''),
    uploadedBy: String(row.uploaded_by ?? ''),
    createdAt: (() => {
      const raw = String(row.created_at ?? '').trim();
      if (raw === '') return '';

      const datePart = raw.slice(0, 10);
      const match = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);

      return match
        ? `${match[3]}-${match[2]}-${match[1]}`
        : raw;
    })(),
    partNo: String(row.part_no ?? ''),
    partName: String(row.part_name ?? ''),
    poNumber: String(row.po_number ?? ''),
    qty: String(row.qty ?? ''),
    orderDate: String(row.order_date ?? ''),
    deliveryDate: String(row.delivery_date ?? '')
  });

  const ftiRawSoTableWidth = computed(() =>
    `${ftiRawSoColumns.reduce((sum, column) => sum + parseInt(column.width, 10), 0)}px`
  );

  const getFtiRawSoColumnStyle = (
    key: FtiRawSoKey,
    isHeader = false,
    rowIndex = 0
  ): CSSProperties => {
    const column = ftiRawSoColumns.find((item) => item.key === key);
    const width = column?.width ?? '120px';
    const backgroundColor = isHeader
      ? '#eff6ff'
      : rowIndex % 2 === 0
        ? '#ffffff'
        : '#f8fafc';
    const gridColor = '#e2e8f0';
    const shadows = [
      `inset -1px 0 0 ${gridColor}`,
      `inset 0 -1px 0 ${gridColor}`
    ];

    if (isHeader) shadows.push(`inset 0 1px 0 ${gridColor}`);
    if (ftiRawSoColumns[0]?.key === key) shadows.push(`inset 1px 0 0 ${gridColor}`);

    return {
      width,
      minWidth: width,
      maxWidth: width,
      boxSizing: 'border-box',
      backgroundColor,
      backgroundImage: `linear-gradient(${backgroundColor}, ${backgroundColor})`,
      backgroundClip: 'border-box',
      boxShadow: shadows.join(', '),
      position: isHeader ? 'sticky' : 'relative',
      top: isHeader ? '0px' : undefined,
      zIndex: isHeader ? 110 : 1
    };
  };

  const ftiRawSoFilteredRows = computed(() => {
    const active = ftiRawSoColumns
      .map((column) => ({
        key: column.key,
        values: new Set(ftiRawSoSelectedFilters.value[column.key] ?? [])
      }))
      .filter((item) => item.values.size > 0);

    if (active.length === 0) return ftiRawSoData.value;

    return ftiRawSoData.value.filter((row) =>
      active.every((item) => item.values.has(normalizeFilterOption(row[item.key])))
    );
  });

  const ftiRawSoSortedRows = computed(() => {
    const rows = [...ftiRawSoFilteredRows.value];
    const key = ftiRawSoSortColumn.value;

    if (key && ftiRawSoSortDirection.value !== 'none') {
      const direction = ftiRawSoSortDirection.value === 'asc' ? 1 : -1;
      return rows.sort((a, b) =>
        String(a[key] ?? '').localeCompare(String(b[key] ?? ''), 'id', { numeric: true }) * direction
      );
    }

    return rows.sort((a, b) => {
      const dateCompare = String(b.orderDate).localeCompare(String(a.orderDate));
      if (dateCompare !== 0) return dateCompare;
      return String(a.partNo).localeCompare(String(b.partNo), 'id', { numeric: true });
    });
  });

  const getFtiRawSoColumnOptions = (key: FtiRawSoKey): string[] =>
    sortFilterOptions(
      Array.from(new Set(ftiRawSoData.value.map((row) => normalizeFilterOption(row[key]))))
    );

  const getFtiRawSoFilteredColumnOptions = (key: FtiRawSoKey): string[] => {
    const rows = getRowsMatchingOtherColumnFilters(
      ftiRawSoData.value,
      ftiRawSoColumns,
      ftiRawSoSelectedFilters.value,
      key,
      (row, columnKey) => row[columnKey]
    );
    const search = String(ftiRawSoSearchFilters.value[key] ?? '').toLowerCase();

    return sortFilterOptions(
      Array.from(new Set(rows.map((row) => normalizeFilterOption(row[key]))))
    ).filter((option) => matchesFilterOptionSearch(key, option, search));
  };

  const toggleFtiRawSoFilterValue = (key: FtiRawSoKey, option: string): void => {
    const current = new Set(ftiRawSoSelectedFilters.value[key] ?? []);
    current.has(option) ? current.delete(option) : current.add(option);
    ftiRawSoSelectedFilters.value[key] = Array.from(current);
    ftiRawSoCurrentPage.value = 1;
  };

  const clearFtiRawSoColumnFilter = (key: FtiRawSoKey): void => {
    ftiRawSoSelectedFilters.value[key] = [];
    ftiRawSoSearchFilters.value[key] = '';
    ftiRawSoCurrentPage.value = 1;
  };

  const setFtiRawSoSort = (key: FtiRawSoKey, direction: SortDirection): void => {
    ftiRawSoSortColumn.value = direction === 'none' ? null : key;
    ftiRawSoSortDirection.value = direction;
    ftiRawSoCurrentPage.value = 1;
    if (rawServerPaged['FTI']) void fetchFtiRawSoData(false);
  };

  const getFtiRawSoSelectedValues = (key: FtiRawSoKey): string[] =>
    ftiRawSoSelectedFilters.value[key] ?? [];

  const getFtiRawSoSearchValue = (key: FtiRawSoKey): string =>
    ftiRawSoSearchFilters.value[key] ?? '';

  const setFtiRawSoSearchValue = (key: FtiRawSoKey, value: string): void => {
    ftiRawSoSearchFilters.value[key] = String(value ?? '');
  };

  const toggleAllFtiRawSoColumn = (key: FtiRawSoKey): void => {
    const options = getFtiRawSoFilteredColumnOptions(key);
    const selected = getFtiRawSoSelectedValues(key);
    const allSelected =
      options.length > 0 && options.every((option) => selected.includes(option));

    ftiRawSoSelectedFilters.value[key] = allSelected ? [] : [...options];
    ftiRawSoCurrentPage.value = 1;
  };

  const isFtiRawSoFilterSelected = (key: FtiRawSoKey, value: string): boolean =>
    getFtiRawSoSelectedValues(key).includes(value);

  const closeFtiRawSoFilter = (): void => {
    ftiRawSoOpenFilters.value = {};
    ftiRawSoActiveFilterKey.value = null;

    mesRawSoOpenFilters.value = {};
    mesRawSoActiveFilterKey.value = null;
    clearAnchoredFilterPopup();
  };

  const isFtiRawSoSortActive = (
    key: FtiRawSoKey,
    direction: 'asc' | 'desc'
  ): boolean =>
    ftiRawSoSortColumn.value === key && ftiRawSoSortDirection.value === direction;

  const isFtiRawSoNoSortActive = (key: FtiRawSoKey): boolean =>
    ftiRawSoSortColumn.value !== key || ftiRawSoSortDirection.value === 'none';

  const getFtiRawSoSelectedLabel = (key: FtiRawSoKey): string => {
    const values = getFtiRawSoSelectedValues(key);
    if (values.length === 0) return '';
    return values.length === 1 ? values[0] : `${values.length} selected`;
  };

  const toggleFtiRawSoDropdown = async (
    key: FtiRawSoKey,
    event: MouseEvent
  ): Promise<void> => {
    const element = event.currentTarget as HTMLElement;
    const wasOpen = ftiRawSoOpenFilters.value[key] === true;

    closeAllPopups();
    if (wasOpen) {
      ftiRawSoActiveFilterKey.value = null;
      clearAnchoredFilterPopup();
      return;
    }

    setAnchoredFilterPopup(element, (anchor) => {
      ftiRawSoFilterPopupPosition.value = getSafeRawFilterPopupPosition(anchor);
    });

    ftiRawSoOpenFilters.value[key] = true;
    ftiRawSoActiveFilterKey.value = key;
  };

  const ftiRawSoTotalPages = computed(() => {
    const totalRows = rawServerPaged['FTI'] ? rawServerTotals['FTI'] : ftiRawSoSortedRows.value.length;
    return Math.max(1, Math.ceil(totalRows / ftiRawSoRowsPerPage.value));
  });
  const ftiRawSoPaginatedRows = computed(() => {
    if (rawServerPaged['FTI']) return ftiRawSoSortedRows.value;
    const start = (ftiRawSoCurrentPage.value - 1) * ftiRawSoRowsPerPage.value;
    return ftiRawSoSortedRows.value.slice(start, start + ftiRawSoRowsPerPage.value);
  });
  const ftiRawSoVisiblePages = computed(() => {
    const total = ftiRawSoTotalPages.value;
    const current = ftiRawSoCurrentPage.value;
    const start = Math.max(1, Math.min(current - 2, Math.max(1, total - 4)));
    return Array.from({ length: Math.min(5, total) }, (_, index) => start + index);
  });
  const ftiRawSoShowingStart = computed(() => {
    const totalRows = rawServerPaged['FTI'] ? rawServerTotals['FTI'] : ftiRawSoSortedRows.value.length;
    return totalRows === 0 ? 0 : (ftiRawSoCurrentPage.value - 1) * ftiRawSoRowsPerPage.value + 1;
  });
  const ftiRawSoShowingEnd = computed(() => {
    const totalRows = rawServerPaged['FTI'] ? rawServerTotals['FTI'] : ftiRawSoSortedRows.value.length;
    return Math.min(ftiRawSoCurrentPage.value * ftiRawSoRowsPerPage.value, totalRows);
  });
  const ftiRawSoFirstPage = () => { ftiRawSoCurrentPage.value = 1; };
  const ftiRawSoPrevPage = () => { if (ftiRawSoCurrentPage.value > 1) ftiRawSoCurrentPage.value--; };
  const ftiRawSoNextPage = () => { if (ftiRawSoCurrentPage.value < ftiRawSoTotalPages.value) ftiRawSoCurrentPage.value++; };
  const ftiRawSoLastPage = () => { ftiRawSoCurrentPage.value = ftiRawSoTotalPages.value; };
  watch(ftiRawSoRowsPerPage, () => {
    if (rawServerPaged['FTI']) {
      if (ftiRawSoCurrentPage.value !== 1) ftiRawSoCurrentPage.value = 1;
      else void fetchFtiRawSoData(false);
      return;
    }
    ftiRawSoCurrentPage.value = 1;
  });
  watch(ftiRawSoCurrentPage, (page, previous) => {
    if (rawServerPaged['FTI'] && page !== previous && !isLoadingRawData.value) void fetchFtiRawSoData(false);
  });
  watch(ftiRawSoTotalPages, (total) => { if (ftiRawSoCurrentPage.value > total) ftiRawSoCurrentPage.value = total; });

  const fetchFtiRawSoData = async (resetPage = true) => {
    try {
      isLoadingRawData.value = true;
      if (resetPage) ftiRawSoCurrentPage.value = 1;
      const params = getDateOnlyFilterParams();
      if (rawServerPaged['FTI']) {
        await loadRawServerPage<FtiRawSoBackendRow>('FTI', params, ftiRawSoCurrentPage.value, ftiRawSoRowsPerPage.value, (rows) => {
          ftiRawSoData.value = rows.map(mapFtiRawSoRowFromBackend);
        }, { filters: buildRawServerFiltersForMode('fti'), sortKey: String(ftiRawSoSortColumn.value ?? ''), sortDirection: ftiRawSoSortDirection.value });
      } else {
        const rows = await customerOrderService.getFtiRawSo(params);
        ftiRawSoData.value = rows.map(mapFtiRawSoRowFromBackend);
        rawServerTotals['FTI'] = ftiRawSoData.value.length;
      }
      refreshLatestAvailableFilterDates();
    } catch (error) {
      console.error('Gagal fetch Raw SO FTI:', error);
      notificationStore.showAlertError('Gagal mengambil Raw Sales Order FTI');
    } finally {
      isLoadingRawData.value = false;
    }
  };

  const refreshFtiUploadPreview = async (openModal = true): Promise<boolean> => {
    try {
      isPreviewLoading.value = true;
      const response = await customerOrderService.previewFtiRawSo({
        upload_period: String(selectedUploadPeriod.value ?? '').trim()
      });
      if (response.status !== 'success') throw new Error(response.message);
      ftiRawSoPreviewRows.value = (response.preview_data ?? []).map(mapFtiRawSoRowFromBackend);
      ftiRawSoPreviewSummary.value = response.summary ?? null;
      showFtiRawSoPreview.value = openModal;
      return true;
    } catch (error: any) {
      ftiRawSoPreviewRows.value = [];
      ftiRawSoPreviewSummary.value = null;
      showFtiRawSoPreview.value = false;
      notificationStore.showAlertError(error?.response?.data?.message || error?.message || 'Gagal generate preview FTI dari ZSTT');
      return false;
    } finally {
      isPreviewLoading.value = false;
    }
  };




  // ============================================================
  // RAW SALES ORDER MES - PDF PURCHASE ORDER / RFQ
  // ============================================================
  type MesRawSoColumn = TableColumn<MesRawSoKey>;
  const mesRawSoColumns: MesRawSoColumn[] = [
    { key: 'partNo', label: 'Part No', width: '165px' },
    { key: 'partName', label: 'Part Name', width: '300px' },
    { key: 'poNumber', label: 'PO Number', width: '150px' },
    { key: 'qty', label: 'Qty', width: '105px' },
    { key: 'orderDate', label: 'Order Date', width: '125px' },
    { key: 'deliveryDate', label: 'Delivery Date', width: '125px' },
    { key: 'createdAt', label: 'Creation Date', width: '165px' }
  ];
  const mesRawSoData = ref<MesRawSoRow[]>([]);
  const mesRawSoPreviewRows = ref<MesRawSoRow[]>([]);
  const mesRawSoPreviewSummary = ref<Record<string, any> | null>(null);
  const showMesRawSoPreview = ref(false);
  const mesPartNameConflicts = ref<MesPartNameConflict[]>([]);
  const mesPartNameChoices = ref<Record<string, 'PDF' | 'CONTRACT'>>({});
  const mesRawSoSelectedFilters = ref<Partial<Record<MesRawSoKey, string[]>>>({});
  const mesRawSoSearchFilters = ref<Partial<Record<MesRawSoKey, string>>>({});
  const mesRawSoOpenFilters = ref<Partial<Record<MesRawSoKey, boolean>>>({});
  const mesRawSoActiveFilterKey = ref<MesRawSoKey | null>(null);
  const mesRawSoFilterPopupPosition = ref({ top: 0, left: 0, maxHeight: 300 });
  const mesRawSoSortColumn = ref<MesRawSoKey | null>(null);
  const mesRawSoSortDirection = ref<SortDirection>('none');
  const mesRawSoCurrentPage = ref(1);
  const mesRawSoRowsPerPage = ref(10);
  const mesRawSoRowsPerPageOptions = [10, 20, 50, 100];

  const mapMesRawSoRowFromBackend = (row: MesRawSoBackendRow): MesRawSoRow => ({
    id: Number(row.id ?? 0),
    uploadBatchId: String(row.upload_batch_id ?? ''),
    sourceFileName: String(row.source_file_name ?? ''),
    sourceRow: String(row.source_row ?? ''),
    uploadedBy: String(row.uploaded_by ?? ''),
    createdAt: (() => {
      const raw = String(row.created_at ?? '').trim();
      if (raw === '') return '';
      const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
      if (!match) return raw;
      const date = `${match[3]}-${match[2]}-${match[1]}`;
      return match[4] ? `${date} ${match[4]}:${match[5]}${match[6] ? `:${match[6]}` : ''}` : date;
    })(),
    partNo: String(row.part_no ?? ''),
    partName: String(row.part_name ?? ''),
    poNumber: String(row.po_number ?? ''),
    qty: String(row.qty ?? ''),
    orderDate: String(row.order_date ?? ''),
    deliveryDate: String(row.delivery_date ?? '')
  });

  const mesRawSoTableWidth = computed(() =>
    `${mesRawSoColumns.reduce((sum, column) => sum + parseInt(column.width, 10), 0)}px`
  );

  const getMesRawSoColumnStyle = (
    key: MesRawSoKey,
    isHeader = false,
    rowIndex = 0
  ): CSSProperties => {
    const column = mesRawSoColumns.find((item) => item.key === key);
    const width = column?.width ?? '120px';
    const backgroundColor = isHeader ? '#eff6ff' : rowIndex % 2 === 0 ? '#ffffff' : '#f8fafc';
    const gridColor = '#e2e8f0';
    const shadows = [`inset -1px 0 0 ${gridColor}`, `inset 0 -1px 0 ${gridColor}`];
    if (isHeader) shadows.push(`inset 0 1px 0 ${gridColor}`);
    if (mesRawSoColumns[0]?.key === key) shadows.push(`inset 1px 0 0 ${gridColor}`);
    return {
      width, minWidth: width, maxWidth: width, boxSizing: 'border-box', backgroundColor,
      backgroundImage: `linear-gradient(${backgroundColor}, ${backgroundColor})`,
      backgroundClip: 'border-box', boxShadow: shadows.join(', '),
      position: isHeader ? 'sticky' : 'relative', top: isHeader ? '0px' : undefined,
      zIndex: isHeader ? 110 : 1
    };
  };

  const mesRawSoFilteredRows = computed(() => {
    const active = mesRawSoColumns
      .map((column) => ({ key: column.key, values: new Set(mesRawSoSelectedFilters.value[column.key] ?? []) }))
      .filter((item) => item.values.size > 0);
    if (active.length === 0) return mesRawSoData.value;
    return mesRawSoData.value.filter((row) =>
      active.every((item) => item.values.has(normalizeFilterOption(row[item.key])))
    );
  });

  const mesRawSoSortedRows = computed(() => {
    const rows = [...mesRawSoFilteredRows.value];
    const key = mesRawSoSortColumn.value;
    if (key && mesRawSoSortDirection.value !== 'none') {
      const direction = mesRawSoSortDirection.value === 'asc' ? 1 : -1;
      return rows.sort((a, b) =>
        String(a[key] ?? '').localeCompare(String(b[key] ?? ''), 'id', { numeric: true }) * direction
      );
    }
    // Upload terbaru selalu tampil paling atas. ID raw mengikuti urutan insert database.
    return rows.sort((a, b) => Number(b.id ?? 0) - Number(a.id ?? 0));
  });

  const getMesRawSoColumnOptions = (key: MesRawSoKey): string[] =>
    sortFilterOptions(Array.from(new Set(mesRawSoData.value.map((row) => normalizeFilterOption(row[key])))));

  const getMesRawSoFilteredColumnOptions = (key: MesRawSoKey): string[] => {
    const rows = getRowsMatchingOtherColumnFilters(
      mesRawSoData.value, mesRawSoColumns, mesRawSoSelectedFilters.value, key,
      (row, columnKey) => row[columnKey]
    );
    const search = String(mesRawSoSearchFilters.value[key] ?? '').toLowerCase();
    return sortFilterOptions(Array.from(new Set(rows.map((row) => normalizeFilterOption(row[key])))))
      .filter((option) => matchesFilterOptionSearch(key, option, search));
  };

  const toggleMesRawSoFilterValue = (key: MesRawSoKey, option: string): void => {
    const current = new Set(mesRawSoSelectedFilters.value[key] ?? []);
    current.has(option) ? current.delete(option) : current.add(option);
    mesRawSoSelectedFilters.value[key] = Array.from(current);
    mesRawSoCurrentPage.value = 1;
  };
  const clearMesRawSoColumnFilter = (key: MesRawSoKey): void => {
    mesRawSoSelectedFilters.value[key] = [];
    mesRawSoSearchFilters.value[key] = '';
    mesRawSoCurrentPage.value = 1;
  };
  const setMesRawSoSort = (key: MesRawSoKey, direction: SortDirection): void => {
    mesRawSoSortColumn.value = direction === 'none' ? null : key;
    mesRawSoSortDirection.value = direction;
    mesRawSoCurrentPage.value = 1;
    if (rawServerPaged['MES']) void fetchMesRawSoData(false);
  };
  const getMesRawSoSelectedValues = (key: MesRawSoKey): string[] => mesRawSoSelectedFilters.value[key] ?? [];
  const getMesRawSoSearchValue = (key: MesRawSoKey): string => mesRawSoSearchFilters.value[key] ?? '';
  const setMesRawSoSearchValue = (key: MesRawSoKey, value: string): void => {
    mesRawSoSearchFilters.value[key] = String(value ?? '');
  };
  const toggleAllMesRawSoColumn = (key: MesRawSoKey): void => {
    const options = getMesRawSoFilteredColumnOptions(key);
    const selected = getMesRawSoSelectedValues(key);
    const allSelected = options.length > 0 && options.every((option) => selected.includes(option));
    mesRawSoSelectedFilters.value[key] = allSelected ? [] : [...options];
    mesRawSoCurrentPage.value = 1;
  };
  const isMesRawSoFilterSelected = (key: MesRawSoKey, value: string): boolean =>
    getMesRawSoSelectedValues(key).includes(value);
  const closeMesRawSoFilter = (): void => {
    mesRawSoOpenFilters.value = {};
    mesRawSoActiveFilterKey.value = null;
    clearAnchoredFilterPopup();
  };
  const isMesRawSoSortActive = (key: MesRawSoKey, direction: 'asc' | 'desc'): boolean =>
    mesRawSoSortColumn.value === key && mesRawSoSortDirection.value === direction;
  const isMesRawSoNoSortActive = (key: MesRawSoKey): boolean =>
    mesRawSoSortColumn.value !== key || mesRawSoSortDirection.value === 'none';
  const getMesRawSoSelectedLabel = (key: MesRawSoKey): string => {
    const values = getMesRawSoSelectedValues(key);
    if (values.length === 0) return '';
    return values.length === 1 ? values[0] : `${values.length} selected`;
  };
  const toggleMesRawSoDropdown = async (key: MesRawSoKey, event: MouseEvent): Promise<void> => {
    const element = event.currentTarget as HTMLElement;
    const wasOpen = mesRawSoOpenFilters.value[key] === true;
    closeAllPopups();
    if (wasOpen) {
      mesRawSoActiveFilterKey.value = null;
      clearAnchoredFilterPopup();
      return;
    }
    setAnchoredFilterPopup(element, (anchor) => {
      mesRawSoFilterPopupPosition.value = getSafeRawFilterPopupPosition(anchor);
    });
    mesRawSoOpenFilters.value[key] = true;
    mesRawSoActiveFilterKey.value = key;
  };

  const mesRawSoTotalPages = computed(() => {
    const totalRows = rawServerPaged['MES'] ? rawServerTotals['MES'] : mesRawSoSortedRows.value.length;
    return Math.max(1, Math.ceil(totalRows / mesRawSoRowsPerPage.value));
  });
  const mesRawSoPaginatedRows = computed(() => {
    if (rawServerPaged['MES']) return mesRawSoSortedRows.value;
    const start = (mesRawSoCurrentPage.value - 1) * mesRawSoRowsPerPage.value;
    return mesRawSoSortedRows.value.slice(start, start + mesRawSoRowsPerPage.value);
  });
  const mesRawSoVisiblePages = computed(() => {
    const total = mesRawSoTotalPages.value;
    const current = mesRawSoCurrentPage.value;
    const start = Math.max(1, Math.min(current - 2, Math.max(1, total - 4)));
    return Array.from({ length: Math.min(5, total) }, (_, index) => start + index);
  });
  const mesRawSoShowingStart = computed(() => {
    const totalRows = rawServerPaged['MES'] ? rawServerTotals['MES'] : mesRawSoSortedRows.value.length;
    return totalRows === 0 ? 0 : (mesRawSoCurrentPage.value - 1) * mesRawSoRowsPerPage.value + 1;
  });
  const mesRawSoShowingEnd = computed(() => {
    const totalRows = rawServerPaged['MES'] ? rawServerTotals['MES'] : mesRawSoSortedRows.value.length;
    return Math.min(mesRawSoCurrentPage.value * mesRawSoRowsPerPage.value, totalRows);
  });
  const mesRawSoFirstPage = () => { mesRawSoCurrentPage.value = 1; };
  const mesRawSoPrevPage = () => { if (mesRawSoCurrentPage.value > 1) mesRawSoCurrentPage.value--; };
  const mesRawSoNextPage = () => { if (mesRawSoCurrentPage.value < mesRawSoTotalPages.value) mesRawSoCurrentPage.value++; };
  const mesRawSoLastPage = () => { mesRawSoCurrentPage.value = mesRawSoTotalPages.value; };
  watch(mesRawSoRowsPerPage, () => {
    if (rawServerPaged['MES']) {
      if (mesRawSoCurrentPage.value !== 1) mesRawSoCurrentPage.value = 1;
      else void fetchMesRawSoData(false);
      return;
    }
    mesRawSoCurrentPage.value = 1;
  });
  watch(mesRawSoCurrentPage, (page, previous) => {
    if (rawServerPaged['MES'] && page !== previous && !isLoadingRawData.value) void fetchMesRawSoData(false);
  });
  watch(mesRawSoTotalPages, (total) => { if (mesRawSoCurrentPage.value > total) mesRawSoCurrentPage.value = total; });

  const fetchMesRawSoData = async (resetPage = true): Promise<void> => {
    try {
      isLoadingRawData.value = true;
      if (resetPage) mesRawSoCurrentPage.value = 1;
      const params = getDateOnlyFilterParams();
      if (rawServerPaged['MES']) {
        await loadRawServerPage<MesRawSoBackendRow>('MES', params, mesRawSoCurrentPage.value, mesRawSoRowsPerPage.value, (rows) => {
          mesRawSoData.value = rows.map(mapMesRawSoRowFromBackend);
        }, { filters: buildRawServerFiltersForMode('mes'), sortKey: String(mesRawSoSortColumn.value ?? ''), sortDirection: mesRawSoSortDirection.value });
      } else {
        const rows = await customerOrderService.getMesRawSo(params);
        mesRawSoData.value = rows.map(mapMesRawSoRowFromBackend);
        rawServerTotals['MES'] = mesRawSoData.value.length;
      }
      refreshLatestAvailableFilterDates();
    } catch (error) {
      console.error('Gagal fetch Raw SO MES:', error);
      notificationStore.showAlertError('Gagal mengambil Raw Sales Order MES');
    } finally {
      isLoadingRawData.value = false;
    }
  };

  const setMesPartNameChoice = (key: string, choice: 'PDF' | 'CONTRACT'): void => {
    mesPartNameChoices.value = { ...mesPartNameChoices.value, [key]: choice };
  };

  const hasUnresolvedMesPartNameConflict = computed(() =>
    mesPartNameConflicts.value.some((item) => !mesPartNameChoices.value[item.key])
  );

  const buildMesUploadFormData = (includeUser = false): FormData => {
    const formData = new FormData();
    mesSoUploadFiles.value.forEach((file) => formData.append('files[]', file));
    const period = String(selectedUploadPeriod.value ?? '').trim();
    if (period !== '') formData.append('upload_period', period);
    if (includeUser) {
      formData.append('upload_by', finalUploadUser.value);
      formData.append('part_name_choices', JSON.stringify(mesPartNameChoices.value));
    }
    return formData;
  };

  const applyMesMissingContractPreview = (parts: unknown[], period: string): boolean => {
    const normalized = normalizeContractPreviewMaterials(Array.isArray(parts) ? parts : []);
    if (normalized.length === 0) return false;
    resetMissingContractPartsCopiedState();
    missingContractPartsPeriod.value = period.replace(/\D/g, '');
    missingContractPartGroups.value = [{ customer: 'MES', revision: null, parts: normalized }];
    showMissingContractPartsModal.value = true;
    return true;
  };

  const refreshMesUploadPreview = async (openModal = true): Promise<boolean> => {
    if (mesSoUploadFiles.value.length === 0) {
      notificationStore.showAlertWarning('Pilih minimal satu PDF Purchase Order / RFQ MES terlebih dahulu.');
      return false;
    }
    try {
      isPreviewLoading.value = true;
      const response = await customerOrderService.previewMesRawSo(buildMesUploadFormData(false));
      if (response.status !== 'success') throw new Error(response.message || 'Preview PDF MES gagal');
      const detectedPeriod = String(response.selected_period ?? '').trim();
      if (/^\d{4}-(0[1-9]|1[0-2])$/.test(detectedPeriod)) {
        selectedUploadPeriod.value = detectedPeriod;
        uploadDeliveryPeriodOptions.value = [{ period: detectedPeriod, label: selectedUploadPeriodLabel.value || detectedPeriod, count: response.preview_data?.length ?? 0 }];
      }
      mesRawSoPreviewRows.value = (response.preview_data ?? []).map(mapMesRawSoRowFromBackend);
      mesRawSoPreviewSummary.value = response.summary ?? null;
      mesPartNameConflicts.value = Array.isArray(response.part_name_conflicts) ? response.part_name_conflicts : [];
      const validKeys = new Set(mesPartNameConflicts.value.map((item) => item.key));
      mesPartNameChoices.value = Object.fromEntries(
        Object.entries(mesPartNameChoices.value).filter(([key]) => validKeys.has(key))
      ) as Record<string, 'PDF' | 'CONTRACT'>;

      const missing = applyMesMissingContractPreview(response.missing_contract_parts ?? [], detectedPeriod || selectedUploadPeriod.value);
      showMesRawSoPreview.value = openModal && !missing;
      return !missing;
    } catch (error: any) {
      mesRawSoPreviewRows.value = [];
      mesRawSoPreviewSummary.value = null;
      mesPartNameConflicts.value = [];
      mesPartNameChoices.value = {};
      showMesRawSoPreview.value = false;
      notificationStore.showAlertError(error?.response?.data?.message || error?.message || 'Gagal membaca PDF MES');
      return false;
    } finally {
      isPreviewLoading.value = false;
    }
  };

  const removeMesSoUploadFile = async (index: number): Promise<void> => {
    if (index < 0 || index >= mesSoUploadFiles.value.length) return;
    mesSoUploadFiles.value.splice(index, 1);
    resetUploadSessionState(false);
    uploadFiles.value = mesSoUploadFiles.value[0] ?? null;
    uploadFileName.value = mesSoUploadFiles.value.length === 0
      ? ''
      : mesSoUploadFiles.value.length === 1
        ? mesSoUploadFiles.value[0].name
        : `${mesSoUploadFiles.value.length} PDF files selected`;
    mesRawSoPreviewRows.value = [];
    mesRawSoPreviewSummary.value = null;
    mesPartNameConflicts.value = [];
    mesPartNameChoices.value = {};
    showMesRawSoPreview.value = false;
    clearMissingContractPartsPreview();
    if (mesSoUploadFiles.value.length > 0) await refreshMesUploadPreview(false);
  };

  const initializeFtiAdditionalOrderAllocations = (preview: FtiAdditionalOrderPreview): void => {
    // Preview / plan baru selalu wajib dikonfirmasi ulang oleh user.
    ftiAdditionalOrderScheduleConfirmed.value = false;

    const drafts: Record<string, Record<string, number>> = {};

    preview.items.forEach((item) => {
      const partDraft: Record<string, number> = {};
      item.candidates.forEach((candidate) => {
        partDraft[candidate.date] = Math.max(0, Number(candidate.suggested_qty ?? 0));
      });
      drafts[item.part_no] = partDraft;
    });

    ftiAdditionalOrderAllocationDrafts.value = drafts;
  };

  const refreshFtiAdditionalManualPreview = async (openModal = true): Promise<boolean> => {
    const period = String(selectedUploadPeriod.value ?? '').trim();
    const poNumber = ftiAdditionalManualPoNumber.value.trim();
    const items = buildFtiAdditionalManualItems();

    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) {
      notificationStore.showAlertWarning('Pilih Bulan Upload FTI terlebih dahulu.');
      return false;
    }
    if (poNumber === '') {
      notificationStore.showAlertWarning('PO Number Additional Order wajib diisi.');
      return false;
    }
    if (!isFtiAdditionalManualPoNumberValid.value) {
      notificationStore.showAlertWarning(
        `PO Number FTI harus tepat 10 digit. Saat ini ${ftiAdditionalManualPoNumberLength.value}/10 digit.`
      );
      return false;
    }
    if (items.length === 0) {
      notificationStore.showAlertWarning('Isi minimal satu Qty Additional Order yang lebih dari 0.');
      return false;
    }

    try {
      isPreviewLoading.value = true;
      const response = await customerOrderService.previewFtiAdditionalManualOrder({
        upload_period: period,
        po_number: poNumber,
        items
      });

      if (response.status !== 'success' || !response.preview) {
        throw new Error(response.message || 'Preview Additional Order FTI manual gagal');
      }

      ftiAdditionalOrderPreview.value = response.preview;
      initializeFtiAdditionalOrderAllocations(response.preview);
      showFtiAdditionalOrderPreview.value = openModal;
      showFtiRawSoPreview.value = false;
      return true;
    } catch (error: any) {
      ftiAdditionalOrderPreview.value = null;
      ftiAdditionalOrderAllocationDrafts.value = {};
      showFtiAdditionalOrderPreview.value = false;
      notificationStore.showAlertError(
        error?.response?.data?.message || error?.message || 'Preview Additional Order FTI manual gagal'
      );
      return false;
    } finally {
      isPreviewLoading.value = false;
    }
  };

  const refreshFtiAdditionalOrderPreview = async (openModal = true): Promise<boolean> => {
    if (!ftiAdditionalOrderFile.value) {
      notificationStore.showAlertWarning('Pilih PDF Additional Order FTI terlebih dahulu.');
      return false;
    }

    try {
      isPreviewLoading.value = true;
      const formData = new FormData();
      formData.append('file', ftiAdditionalOrderFile.value);
      const response = await customerOrderService.previewFtiAdditionalOrder(formData);

      if (response.status !== 'success' || !response.preview) {
        throw new Error(response.message || 'Preview Additional Order FTI gagal');
      }

      ftiAdditionalOrderPreview.value = response.preview;
      selectedUploadPeriod.value = response.preview.selected_period;
      initializeFtiAdditionalOrderAllocations(response.preview);
      showFtiAdditionalOrderPreview.value = openModal;
      showFtiRawSoPreview.value = false;
      return true;
    } catch (error: any) {
      ftiAdditionalOrderPreview.value = null;
      ftiAdditionalOrderAllocationDrafts.value = {};
      showFtiAdditionalOrderPreview.value = false;
      notificationStore.showAlertError(
        error?.response?.data?.message || error?.message || 'Preview Additional Order FTI gagal'
      );
      return false;
    } finally {
      isPreviewLoading.value = false;
    }
  };

  const getFtiAdditionalOrderAllocationQty = (partNo: string, date: string): number =>
    Number(ftiAdditionalOrderAllocationDrafts.value[partNo]?.[date] ?? 0);

  const resetFtiAdditionalOrderAllocationsToSystemPlan = (): void => {
    const preview = ftiAdditionalOrderPreview.value;
    if (!preview) return;

    /*
     * Kembalikan seluruh Additional Qty ke suggested_qty asli hasil
     * kalkulasi sistem pada Preview. Tidak mengubah PO, Target Qty,
     * periode, ataupun input Additional Order lainnya.
     */
    initializeFtiAdditionalOrderAllocations(preview);
  };

  const confirmFtiAdditionalOrderSchedule = (): void => {
    const preview = ftiAdditionalOrderPreview.value;

    if (!preview) {
      notificationStore.showAlertWarning(
        'Preview Schedule Additional Order terlebih dahulu.'
      );
      return;
    }

    if (!isFtiAdditionalOrderAllocationValid.value) {
      notificationStore.showAlertWarning(
        'Total Additional Qty setiap part harus sama dengan Target Qty sebelum Schedule dikonfirmasi.'
      );
      return;
    }

    ftiAdditionalOrderScheduleConfirmed.value = true;
    showFtiAdditionalOrderPreview.value = false;

    notificationStore.showAlertSuccess(
      'Schedule Additional Order sudah dikonfirmasi. Pilih Upload By lalu klik Submit untuk generate Raw Order, Format SO, dan Tracking.'
    );
  };

  const openFtiAdditionalOrderConfirmedSchedule = (): void => {
    if (!ftiAdditionalOrderPreview.value) {
      notificationStore.showAlertWarning(
        'Schedule Additional Order belum tersedia. Buat Preview Plan terlebih dahulu.'
      );
      return;
    }

    showFtiAdditionalOrderPreview.value = true;
  };

  const updateFtiAdditionalOrderAllocation = (
    partNo: string,
    date: string,
    rawValue: number | string
  ): void => {
    ftiAdditionalOrderScheduleConfirmed.value = false;

    const preview = ftiAdditionalOrderPreview.value;
    if (!preview) return;

    const item = preview.items.find((row) => row.part_no === partNo);
    if (!item) return;

    const candidate = item.candidates.find((row) => row.date === date);
    if (!candidate) return;

    const targetQty = Math.max(0, Number(item.required_qty ?? 0));
    const closing =
      item.candidates.find((row) => row.is_closing) ??
      item.candidates[item.candidates.length - 1];

    const currentDraft = {
      ...(ftiAdditionalOrderAllocationDrafts.value[partNo] ?? {})
    };

    const numeric = Number(rawValue);
    const requested = Number.isFinite(numeric)
      ? Math.max(0, numeric)
      : 0;

    if (candidate.is_closing) {
      /*
       * Closing sekarang juga boleh diedit pada mode Manual.
       * Nilainya diclamp agar total seluruh tanggal tidak pernah
       * melebihi Target Qty yang dimasukkan user.
       */
      const otherTotal = item.candidates
        .filter((row) => row.date !== date)
        .reduce(
          (sum, row) =>
            sum + Math.max(0, Number(currentDraft[row.date] ?? 0)),
          0
        );

      currentDraft[date] = Math.min(
        requested,
        Math.max(0, targetQty - otherTotal)
      );
    } else {
      /*
       * Untuk tanggal non-closing, behavior lama dipertahankan:
       * user mengubah Qty lalu closing otomatis menjadi sisa target.
       * Dengan begitu hasil generate sistem tetap menjadi default,
       * tetapi user bebas mengatur pembagiannya.
       */
      const otherNonClosing = item.candidates
        .filter((row) => !row.is_closing && row.date !== date)
        .reduce(
          (sum, row) =>
            sum + Math.max(0, Number(currentDraft[row.date] ?? 0)),
          0
        );

      const maxForCurrent = Math.max(
        0,
        targetQty - otherNonClosing
      );

      currentDraft[date] = Math.min(
        requested,
        maxForCurrent
      );

      if (closing) {
        const nonClosingTotal = item.candidates
          .filter((row) => row.date !== closing.date)
          .reduce(
            (sum, row) =>
              sum + Math.max(0, Number(currentDraft[row.date] ?? 0)),
            0
          );

        currentDraft[closing.date] = Math.max(
          0,
          targetQty - nonClosingTotal
        );
      }
    }

    ftiAdditionalOrderAllocationDrafts.value = {
      ...ftiAdditionalOrderAllocationDrafts.value,
      [partNo]: currentDraft
    };
  };

  const getFtiAdditionalOrderAllocationTotal = (partNo: string): number => {
    const draft = ftiAdditionalOrderAllocationDrafts.value[partNo] ?? {};
    return Object.values(draft).reduce((sum, qty) => sum + Math.max(0, Number(qty ?? 0)), 0);
  };

  const isFtiAdditionalOrderAllocationValid = computed(() => {
    const preview = ftiAdditionalOrderPreview.value;
    if (!preview) return false;

    return preview.items.every((item) =>
      Math.abs(getFtiAdditionalOrderAllocationTotal(item.part_no) - Number(item.required_qty ?? 0)) <= 0.001
    );
  });

  const buildFtiAdditionalOrderAllocations = (): FtiAdditionalOrderAllocationItem[] => {
    const preview = ftiAdditionalOrderPreview.value;
    if (!preview) return [];

    return preview.items.map((item) => ({
      part_no: item.part_no,
      allocations: item.candidates.map((candidate) => ({
        date: candidate.date,
        qty: Math.max(0, Number(ftiAdditionalOrderAllocationDrafts.value[item.part_no]?.[candidate.date] ?? 0))
      }))
    }));
  };

  const dpmRawSoData = ref<DpmRawSoRow[]>([]);
  const dpmRawSoPreviewRows = ref<DpmRawSoRow[]>([]);
  const dpmRawSoPreviewSummary = ref<Record<string, any> | null>(null);
  const dpmRawSoPoValidation = ref<DpmMdfoPoValidation | null>(null);
  const dpmRawSoContractValidation = ref<Record<string, any> | null>(null);
  const showDpmRawSoPreview = ref(false);

  /*
   * Duplicate / partial-upload preview DPM.
   *
   * Backend membagi file yang sedang dipilih menjadi tiga kelompok:
   * - existing_rows         : sudah pernah tersimpan di database;
   * - eligible_rows         : belum ada dan aman untuk diupload;
   * - upload_duplicate_rows : business key ganda di file yang sedang dipilih.
   *
   * File tetap dipertahankan di form. Karena itu user cukup memilih Upload By
   * lalu Submit; backend akan menyimpan eligible_rows saja tanpa meminta user
   * memilih / mengupload ulang file Excel.
   */
  type DpmRawSoDuplicatePreviewMode =
    | 'existing'
    | 'eligible'
    | 'upload_duplicate';

  type DpmRawSoDuplicateValidationWithEligible =
    DpmRawSoDuplicateValidation & {
      total_incoming?: number;
      total_eligible?: number;
      can_upload?: boolean;
      eligible_source_files?: string[];
      eligible_rows?: DpmRawSoDuplicateRow[];
    };

  const dpmRawSoDuplicateValidation =
    ref<DpmRawSoDuplicateValidationWithEligible | null>(null);
  const dpmRawSoDuplicateRows =
    ref<DpmRawSoDuplicateRow[]>([]);
  const showDpmRawSoDuplicatePreview =
    ref(false);
  const dpmRawSoDuplicateDialogSignature =
    ref('');
  const dpmRawSoDuplicatePreviewMode =
    ref<DpmRawSoDuplicatePreviewMode>('existing');

  const dpmRawSoDuplicateExistingFiles =
    computed<string[]>(() => {
      const files =
        dpmRawSoDuplicateValidation.value?.existing_source_files;

      return Array.isArray(files)
        ? files
            .map((value) => String(value ?? '').trim())
            .filter((value) => value !== '')
        : [];
    });

  const dpmRawSoEligibleRows =
    computed<DpmRawSoDuplicateRow[]>(() => {
      const rows =
        dpmRawSoDuplicateValidation.value?.eligible_rows;

      return Array.isArray(rows)
        ? rows
        : [];
    });

  const dpmRawSoUploadDuplicateRows =
    computed<DpmRawSoDuplicateRow[]>(() => {
      const rows =
        dpmRawSoDuplicateValidation.value?.upload_duplicate_rows;

      return Array.isArray(rows)
        ? rows
        : [];
    });

  const dpmRawSoTotalEligible =
    computed<number>(() =>
      Math.max(
        0,
        Number(
          dpmRawSoDuplicateValidation.value?.total_eligible ??
          dpmRawSoEligibleRows.value.length
        )
      )
    );

  const dpmRawSoHasPoMismatch =
    computed<boolean>(() => {
      const validation = dpmRawSoPoValidation.value;

      return Boolean(
        validation?.is_ready &&
        !validation?.all_matched
      );
    });

  const dpmRawSoPoValidationMessage =
    computed<string>(() =>
      String(
        dpmRawSoPoValidation.value?.message ??
        ''
      ).trim()
    );

  const dpmRawSoTotalPoEligible =
    computed<number>(() => {
      const validation = dpmRawSoPoValidation.value;

      if (!validation?.is_ready) {
        return dpmRawSoTotalEligible.value;
      }

      return Math.max(
        0,
        Number(validation.matched_rows ?? 0)
      );
    });

  const dpmRawSoCanUploadFromSelectedFile =
    computed<boolean>(() =>
      dpmRawSoTotalPoEligible.value > 0
    );

  const dpmRawSoDuplicatePreviewRows =
    computed<DpmRawSoDuplicateRow[]>(() => {
      if (dpmRawSoDuplicatePreviewMode.value === 'eligible') {
        return dpmRawSoEligibleRows.value;
      }

      if (dpmRawSoDuplicatePreviewMode.value === 'upload_duplicate') {
        return dpmRawSoUploadDuplicateRows.value;
      }

      return dpmRawSoDuplicateRows.value;
    });

  const dpmSalesDocumentConflicts = ref<DpmSalesDocumentConflict[]>([]);
  const dpmSalesDocumentStrategy = ref<DpmSalesDocumentStrategy>('');
  const dpmSalesDocumentConflictSignature = ref('');

  const resetDpmSalesDocumentChoice = (): void => {
    dpmSalesDocumentConflicts.value = [];
    dpmSalesDocumentStrategy.value = '';
    dpmSalesDocumentConflictSignature.value = '';
  };

  const resetDpmRawSoDuplicateState = (): void => {
    dpmRawSoDuplicateValidation.value = null;
    dpmRawSoDuplicateRows.value = [];
    dpmRawSoPoValidation.value = null;
    showDpmRawSoDuplicatePreview.value = false;
    dpmRawSoDuplicateDialogSignature.value = '';
    dpmRawSoDuplicatePreviewMode.value = 'existing';
  };

  const setDpmRawSoDuplicatePreviewMode = (
    mode: DpmRawSoDuplicatePreviewMode
  ): void => {
    if (
      mode === 'existing' &&
      dpmRawSoDuplicateRows.value.length === 0
    ) {
      return;
    }

    if (
      mode === 'eligible' &&
      dpmRawSoEligibleRows.value.length === 0
    ) {
      return;
    }

    if (
      mode === 'upload_duplicate' &&
      dpmRawSoUploadDuplicateRows.value.length === 0
    ) {
      return;
    }

    dpmRawSoDuplicatePreviewMode.value = mode;
  };

  const openDpmRawSoDuplicatePreview = (
    preferredMode?: DpmRawSoDuplicatePreviewMode
  ): void => {
    if (
      dpmRawSoDuplicateRows.value.length === 0 &&
      dpmRawSoEligibleRows.value.length === 0 &&
      dpmRawSoUploadDuplicateRows.value.length === 0
    ) {
      return;
    }

    const candidates: DpmRawSoDuplicatePreviewMode[] = [
      preferredMode ?? 'existing',
      'existing',
      'upload_duplicate',
      'eligible'
    ];

    for (const mode of candidates) {
      if (
        (mode === 'existing' && dpmRawSoDuplicateRows.value.length > 0) ||
        (mode === 'eligible' && dpmRawSoEligibleRows.value.length > 0) ||
        (mode === 'upload_duplicate' && dpmRawSoUploadDuplicateRows.value.length > 0)
      ) {
        dpmRawSoDuplicatePreviewMode.value = mode;
        break;
      }
    }

    showDpmRawSoDuplicatePreview.value = true;
  };

  const closeDpmRawSoDuplicatePreview = (): void => {
    showDpmRawSoDuplicatePreview.value = false;
  };

  const showDpmRawSoDuplicateWarning = (
    force = false
  ): void => {
    const validation =
      dpmRawSoDuplicateValidation.value;

    if (
      !validation ||
      !validation.has_duplicates
    ) {
      return;
    }

    const existingCount =
      Math.max(
        0,
        Number(
          validation.total_existing ??
          dpmRawSoDuplicateRows.value.length
        )
      );

    const uploadDuplicateCount =
      Math.max(
        0,
        Number(
          validation.total_upload_duplicates ??
          dpmRawSoUploadDuplicateRows.value.length
        )
      );

    const eligibleCount =
      dpmRawSoTotalPoEligible.value;

    const signature = JSON.stringify({
      existingCount,
      uploadDuplicateCount,
      eligibleCount,
      poMismatch: dpmRawSoHasPoMismatch.value,
      files: dpmRawSoDuplicateExistingFiles.value
    });

    if (
      !force &&
      signature ===
        dpmRawSoDuplicateDialogSignature.value
    ) {
      return;
    }

    dpmRawSoDuplicateDialogSignature.value =
      signature;

    const fileText =
      dpmRawSoDuplicateExistingFiles.value.length > 0
        ? ` dari ${dpmRawSoDuplicateExistingFiles.value.length} file sebelumnya`
        : '';

    const internalDuplicateText =
      uploadDuplicateCount > 0
        ? ` ${uploadDuplicateCount} baris ganda di file baru juga akan dilewati.`
        : '';

    const poMismatchRows =
      Math.max(
        0,
        Number(
          dpmRawSoPoValidation.value?.mismatched_rows ??
          0
        )
      );

    const uploadableText =
      eligibleCount > 0
        ? dpmRawSoHasPoMismatch.value
          ? ` ${eligibleCount} data baru mempunyai PO yang match MDFO dan tetap dapat diupload. ${poMismatchRows} row dengan PO salah bulan / belum ada di MDFO akan dilewati. Klik View untuk melihat detail PO.`
          : ` ${eligibleCount} data baru belum tersimpan dan siap diupload dari file yang sama. Data lama akan dilewati otomatis.`
        : dpmRawSoHasPoMismatch.value
          ? ' Tidak ada data baru dengan PO yang match MDFO pada periode terpilih.'
          : ' Tidak ada data baru yang dapat diupload dari file ini.';

    notificationStore.showConfirm(
      'Data DPM sudah pernah diupload',
      `${existingCount} data pada file yang dipilih sudah tersimpan${fileText}.${uploadableText}${internalDuplicateText}`,
      () => {
        openDpmRawSoDuplicatePreview(
          existingCount > 0
            ? 'existing'
            : eligibleCount > 0
              ? 'eligible'
              : 'upload_duplicate'
        );
      },
      () => {},
      'View',
      'Tutup'
    );
  };

  const escapeDpmDialogText = (value: unknown): string =>
    String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  const showDpmSalesDocumentConflictChoice = (
    conflicts: DpmSalesDocumentConflict[],
    showDialog = true
  ): void => {
    const normalized = conflicts
      .map((item) => ({
        delivery_date: String(item.delivery_date ?? '').trim(),
        po_number: String(item.po_number ?? '').trim().toUpperCase(),
        sales_document: String(item.sales_document ?? '').trim().toUpperCase(),
        sales_documents: Array.isArray(item.sales_documents)
          ? item.sales_documents.map((value) => String(value ?? '').trim().toUpperCase())
          : []
      }))
      .filter(
        (item) =>
          item.delivery_date !== '' &&
          item.po_number !== '' &&
          item.sales_document !== ''
      )
      .sort((left, right) =>
        `${left.delivery_date}|${left.po_number}`.localeCompare(
          `${right.delivery_date}|${right.po_number}`,
          'id',
          { numeric: true }
        )
      );

    if (normalized.length === 0) {
      resetDpmSalesDocumentChoice();
      return;
    }

    const signature = JSON.stringify(normalized);
    const sameSignature =
      signature === dpmSalesDocumentConflictSignature.value;

    dpmSalesDocumentConflicts.value = normalized;

    if (
      sameSignature &&
      dpmSalesDocumentStrategy.value !== ''
    ) {
      return;
    }

    if (!sameSignature) {
      dpmSalesDocumentConflictSignature.value = signature;
      dpmSalesDocumentStrategy.value = '';
    }

    /*
     * Saat file mengandung duplicate database, pilihan Sales Document hanya
     * disimpan dulu. Dialog baru dibuka ketika user menekan Submit supaya
     * tidak menumpuk di atas popup validasi duplicate.
     */
    if (!showDialog) {
      return;
    }

    const shownConflicts = normalized.slice(0, 5);
    const detail = shownConflicts
      .map(
        (item) =>
          `${escapeDpmDialogText(item.delivery_date)} · PO ${escapeDpmDialogText(item.po_number)} → <strong>${escapeDpmDialogText(item.sales_document)}</strong>`
      )
      .join('<br>');
    const remaining = normalized.length - shownConflicts.length;
    const remainingText = remaining > 0
      ? `<br>+${remaining} pasangan lainnya`
      : '';

    notificationStore.showConfirm(
      'Sales Document DPM sudah ada',
      `Ditemukan ${normalized.length} pasangan Delivery Date + PO Number pada data BARU yang siap diupload:<br><br>${detail}${remainingText}<br><br>Gunakan Sales Document lama atau buat nomor urut baru?`,
      () => {
        dpmSalesDocumentStrategy.value = 'reuse_existing';
        notificationStore.showAlertSuccess('Sales Document lama akan digunakan.');
      },
      () => {
        dpmSalesDocumentStrategy.value = 'generate_new';
        notificationStore.showAlertSuccess('Sales Document baru akan dibuat.');
      },
      'Gunakan Lama',
      'Nomor Baru'
    );
  };
  const dpmRawSoDetectedPeriodLabel = computed(() => {
    const selected = String(selectedUploadPeriod.value ?? '').trim();
    if (/^\d{4}-(0[1-9]|1[0-2])$/.test(selected)) {
      const [year, month] = selected.split('-').map(Number);
      return new Intl.DateTimeFormat('id-ID', {
        month: 'long',
        year: 'numeric'
      }).format(new Date(year, month - 1, 1));
    }

    const periods = Array.isArray(dpmRawSoPreviewSummary.value?.periods)
      ? dpmRawSoPreviewSummary.value?.periods
      : [];

    return periods
      .map((value: unknown) => String(value ?? '').replace(/\D/g, ''))
      .filter((value: string) => /^\d{6}$/.test(value))
      .map((value: string) => {
        const year = Number(value.slice(0, 4));
        const month = Number(value.slice(4, 6));
        return new Intl.DateTimeFormat('id-ID', {
          month: 'long',
          year: 'numeric'
        }).format(new Date(year, month - 1, 1));
      })
      .join(', ');
  });
  const dpmRawSoSelectedFilters = ref<Partial<Record<DpmRawSoKey, string[]>>>({});
  const dpmRawSoSearchFilters = ref<Partial<Record<DpmRawSoKey, string>>>({});
  const dpmRawSoOpenFilters = ref<Partial<Record<DpmRawSoKey, boolean>>>({});
  const dpmRawSoActiveFilterKey = ref<DpmRawSoKey | null>(null);
  const dpmRawSoFilterPopupPosition = ref({
    top: 0,
    left: 0,
    maxHeight: 300
  });
  const dpmRawSoSortColumn = ref<DpmRawSoKey | null>(null);
  const dpmRawSoSortDirection = ref<SortDirection>('none');
  const dpmRawSoCurrentPage = ref(1);
  const dpmRawSoRowsPerPage = ref(10);
  const dpmRawSoRowsPerPageOptions = [10, 25, 50, 100];

  const mapDpmRawSoRowFromBackend = (row: DpmRawSoBackendRow): DpmRawSoRow => {
    const value = (key: string): string => String(row[key] ?? '');
    return {
      id: Number(row.id ?? 0),
      uploadBatchId: value('upload_batch_id'),
      sourceFile: value('source_file'),
      sourceRow: Number(row.source_row ?? 0),
      periode: value('periode'),
      uploadedBy: value('uploaded_by'),
      no: value('source_no'),
      plant: value('plant'),
      plantDesc: value('plant_desc'),
      diNumber: value('di_number'),
      deliveryDate: value('delivery_date'),
      vendorCode: value('vendor_code'),
      vendorName: value('vendor_name'),
      materialId: value('material_id'),
      description: value('description'),
      partNumber: value('part_number'),
      diQty: value('di_qty'),
      qtyPerKanban: value('qty_per_kanban'),
      kanbanQty: value('kanban_qty'),
      deliveredQty: value('delivered_qty'),
      poNumber: value('po_number'),
      poItem: value('po_item'),
      cycleDelivery: value('cycle_delivery'),
      deliveryTime: value('delivery_time'),
      gate: value('gate'),
      deliveryLocation: value('delivery_location'),
      confirmQtyDel: value('confirm_qty_del'),
      kanbanDelQty: value('kanban_del_qty'),
      productionDate: value('production_date'),
      createdAt: value('created_at')
    };
  };

  const applyDpmRawSoDuplicateValidation = (
    validation:
      | DpmRawSoDuplicateValidation
      | null
      | undefined,
    showWarning = true
  ): boolean => {
    if (!validation) {
      resetDpmRawSoDuplicateState();
      return false;
    }

    const extendedValidation =
      validation as DpmRawSoDuplicateValidationWithEligible;

    dpmRawSoDuplicateValidation.value =
      extendedValidation;

    dpmRawSoDuplicateRows.value =
      Array.isArray(extendedValidation.existing_rows)
        ? extendedValidation.existing_rows
        : [];

    if (!extendedValidation.has_duplicates) {
      showDpmRawSoDuplicatePreview.value = false;
      dpmRawSoDuplicateDialogSignature.value = '';
      dpmRawSoDuplicatePreviewMode.value = 'eligible';
      return false;
    }

    if (showWarning) {
      showDpmRawSoDuplicateWarning();
    }

    return true;
  };

  const dpmRawSoTableWidth = computed(() =>
    `${dpmRawSoColumns.reduce((sum, column) => sum + parseInt(column.width, 10), 0)}px`
  );

  const getDpmRawSoColumnStyle = (
    key: DpmRawSoKey,
    isHeader = false,
    rowIndex = 0
  ): CSSProperties => {
    const index = dpmRawSoColumns.findIndex((column) => column.key === key);
    const column = dpmRawSoColumns[index];
    const width = column?.width ?? '100px';
    const frozen = index === 0;
    const backgroundColor = isHeader
      ? '#eff6ff'
      : rowIndex % 2 === 0
        ? '#ffffff'
        : '#f8fafc';
    const gridColor = '#e2e8f0';
    const shadows = [
      `inset -1px 0 0 ${gridColor}`,
      `inset 0 -1px 0 ${gridColor}`
    ];

    if (isHeader) shadows.push(`inset 0 1px 0 ${gridColor}`);
    if (index === 0) shadows.push(`inset 1px 0 0 ${gridColor}`);
    if (frozen) shadows.push('3px 0 7px -6px rgba(15, 23, 42, 0.32)');

    const baseStyle: CSSProperties = {
      width,
      minWidth: width,
      maxWidth: width,
      boxSizing: 'border-box',
      backgroundColor,
      backgroundImage: `linear-gradient(${backgroundColor}, ${backgroundColor})`,
      backgroundClip: 'border-box',
      boxShadow: shadows.join(', ')
    };

    if (frozen && isHeader) {
      return { ...baseStyle, position: 'sticky', left: '0px', top: '0px', zIndex: 130 };
    }
    if (isHeader) {
      return { ...baseStyle, position: 'sticky', top: '0px', zIndex: 110 };
    }
    if (frozen) {
      return { ...baseStyle, position: 'sticky', left: '0px', zIndex: 80 };
    }
    return { ...baseStyle, position: 'relative', zIndex: 1 };
  };

  const dpmRawSoFilteredRows = computed(() => {
    const active = dpmRawSoColumns
      .map((column) => ({ key: column.key, values: new Set(dpmRawSoSelectedFilters.value[column.key] ?? []) }))
      .filter((item) => item.values.size > 0);
    if (active.length === 0) return dpmRawSoData.value;
    return dpmRawSoData.value.filter((row) =>
      active.every((item) => item.values.has(normalizeFilterOption(row[item.key])))
    );
  });

  const dpmRawSoSortedRows = computed(() => {
    const rows = [...dpmRawSoFilteredRows.value];
    const key = dpmRawSoSortColumn.value;
    if (!key || dpmRawSoSortDirection.value === 'none') return rows;
    const direction = dpmRawSoSortDirection.value === 'asc' ? 1 : -1;
    return rows.sort((a, b) => String(a[key] ?? '').localeCompare(String(b[key] ?? ''), 'id', { numeric: true }) * direction);
  });

  const dpmRawSoTotalPages = computed(() => {
    const totalRows = rawServerPaged['DPM'] ? rawServerTotals['DPM'] : dpmRawSoSortedRows.value.length;
    return Math.max(1, Math.ceil(totalRows / dpmRawSoRowsPerPage.value));
  });
  const dpmRawSoPaginatedRows = computed(() => {
    if (rawServerPaged['DPM']) return dpmRawSoSortedRows.value;
    const start = (dpmRawSoCurrentPage.value - 1) * dpmRawSoRowsPerPage.value;
    return dpmRawSoSortedRows.value.slice(start, start + dpmRawSoRowsPerPage.value);
  });
  const dpmRawSoShowingStart = computed(() => {
    const totalRows = rawServerPaged['DPM'] ? rawServerTotals['DPM'] : dpmRawSoSortedRows.value.length;
    return totalRows === 0 ? 0 : (dpmRawSoCurrentPage.value - 1) * dpmRawSoRowsPerPage.value + 1;
  });
  const dpmRawSoShowingEnd = computed(() => {
    const totalRows = rawServerPaged['DPM'] ? rawServerTotals['DPM'] : dpmRawSoSortedRows.value.length;
    return Math.min(dpmRawSoCurrentPage.value * dpmRawSoRowsPerPage.value, totalRows);
  });
  const dpmRawSoVisiblePages = computed(() => {
    const start = Math.max(1, dpmRawSoCurrentPage.value - 2);
    return Array.from({ length: Math.min(5, dpmRawSoTotalPages.value - start + 1) }, (_, index) => start + index);
  });

  const getDpmRawSoColumnOptions = (key: DpmRawSoKey): string[] =>
    sortFilterOptions(Array.from(new Set(dpmRawSoData.value.map((row) => normalizeFilterOption(row[key])))));
  const getDpmRawSoFilteredColumnOptions = (key: DpmRawSoKey): string[] => {
    const rows = getRowsMatchingOtherColumnFilters(
      dpmRawSoData.value,
      dpmRawSoColumns,
      dpmRawSoSelectedFilters.value,
      key,
      (row, columnKey) => row[columnKey]
    );
    const search = String(dpmRawSoSearchFilters.value[key] ?? '').toLowerCase();
    return sortFilterOptions(Array.from(new Set(rows.map((row) => normalizeFilterOption(row[key])))))
      .filter((option) => matchesFilterOptionSearch(key, option, search));
  };
  const toggleDpmRawSoFilterValue = (key: DpmRawSoKey, option: string) => {
    const current = new Set(dpmRawSoSelectedFilters.value[key] ?? []);
    current.has(option) ? current.delete(option) : current.add(option);
    dpmRawSoSelectedFilters.value[key] = Array.from(current);
    dpmRawSoCurrentPage.value = 1;
  };
  const clearDpmRawSoColumnFilter = (key: DpmRawSoKey) => {
    dpmRawSoSelectedFilters.value[key] = [];
    dpmRawSoSearchFilters.value[key] = '';
  };
  const setDpmRawSoSort = (key: DpmRawSoKey, direction: SortDirection) => {
    dpmRawSoSortColumn.value = direction === 'none' ? null : key;
    dpmRawSoSortDirection.value = direction;
    dpmRawSoCurrentPage.value = 1;
    if (rawServerPaged['DPM']) void fetchDpmRawSoData(false);
  };

  const getDpmRawSoSelectedValues = (key: DpmRawSoKey): string[] =>
    dpmRawSoSelectedFilters.value[key] ?? [];

  const getDpmRawSoSearchValue = (key: DpmRawSoKey): string =>
    dpmRawSoSearchFilters.value[key] ?? '';

  const setDpmRawSoSearchValue = (key: DpmRawSoKey, value: string): void => {
    dpmRawSoSearchFilters.value[key] = String(value ?? '');
  };

  const toggleAllDpmRawSoColumn = (key: DpmRawSoKey): void => {
    const options = getDpmRawSoFilteredColumnOptions(key);
    const selected = getDpmRawSoSelectedValues(key);
    const allSelected =
      options.length > 0 && options.every((option) => selected.includes(option));

    dpmRawSoSelectedFilters.value[key] = allSelected ? [] : [...options];
    dpmRawSoCurrentPage.value = 1;
  };

  const isDpmRawSoFilterSelected = (
    key: DpmRawSoKey,
    value: string
  ): boolean => getDpmRawSoSelectedValues(key).includes(value);

  const closeDpmRawSoFilter = (): void => {
    dpmRawSoOpenFilters.value = {};
    dpmRawSoActiveFilterKey.value = null;
    clearAnchoredFilterPopup();
  };

  const isDpmRawSoSortActive = (
    key: DpmRawSoKey,
    direction: 'asc' | 'desc'
  ): boolean =>
    dpmRawSoSortColumn.value === key &&
    dpmRawSoSortDirection.value === direction;

  const isDpmRawSoNoSortActive = (key: DpmRawSoKey): boolean =>
    dpmRawSoSortColumn.value !== key || dpmRawSoSortDirection.value === 'none';

  const getDpmRawSoSelectedLabel = (key: DpmRawSoKey): string => {
    const values = getDpmRawSoSelectedValues(key);
    if (values.length === 0) return '';
    return values.length === 1 ? values[0] : `${values.length} selected`;
  };

  const toggleDpmRawSoDropdown = async (
    key: DpmRawSoKey,
    event: MouseEvent
  ): Promise<void> => {
    const element = event.currentTarget as HTMLElement;
    const wasOpen = dpmRawSoOpenFilters.value[key] === true;

    closeAllPopups();
    if (wasOpen) {
      dpmRawSoActiveFilterKey.value = null;
      clearAnchoredFilterPopup();
      return;
    }

    setAnchoredFilterPopup(element, (anchor) => {
      dpmRawSoFilterPopupPosition.value =
        getSafeRawFilterPopupPosition(anchor);
    });

    dpmRawSoOpenFilters.value[key] = true;
    dpmRawSoActiveFilterKey.value = key;
  };

  const buildDpmUploadFormData = (includeUser = false): FormData => {
    const formData = new FormData();
    dpmSoUploadFiles.value.forEach((file) => formData.append('files[]', file));
    formData.append('customer', 'DPM');
    formData.append('upload_period', String(selectedUploadPeriod.value ?? '').trim());
    if (includeUser) {
      formData.append('upload_by', finalUploadUser.value);
      if (dpmSalesDocumentStrategy.value !== '') {
        formData.append(
          'sales_document_strategy',
          dpmSalesDocumentStrategy.value
        );
      }
    }
    return formData;
  };

  const refreshDpmUploadPreview = async (
    openModal = false,
    openPeriodChoice = false,
    showDuplicateWarning = true
  ): Promise<boolean> => {
    if (dpmSoUploadFiles.value.length === 0) return false;

    try {
      isPreviewLoading.value = true;
      isAnalyzingUploadPeriods.value = true;
      const response = await customerOrderService.previewDpmRawSo(
        buildDpmUploadFormData()
      );
      if (response.status !== 'success') throw new Error(response.message);

      const mappedRows = (response.preview_data ?? []).map(mapDpmRawSoRowFromBackend);
      dpmRawSoPreviewRows.value = mappedRows;
      dpmRawSoPreviewSummary.value = response.summary ?? null;
      dpmRawSoContractValidation.value = response.contract_validation ?? null;

      /*
       * PO Number DPM wajib match dengan Raw MDFO pada periode yang sama.
       * Simpan sebelum duplicate warning dibuka agar dialog duplicate juga
       * langsung mengetahui bila data baru tertahan oleh validasi PO.
       */
      dpmRawSoPoValidation.value =
        response.po_validation ?? null;

      const hasDuplicate =
        applyDpmRawSoDuplicateValidation(
          response.duplicate_validation,
          showDuplicateWarning && !openModal
        );

      const validation =
        dpmRawSoDuplicateValidation.value;
      const hasUploadableRows = validation
        ? dpmRawSoTotalEligible.value > 0
        : mappedRows.length > 0;

      const conflicts =
        Array.isArray(response.sales_document_conflicts)
          ? response.sales_document_conflicts
          : [];

      if (hasUploadableRows) {
        showDpmSalesDocumentConflictChoice(
          conflicts,
          !hasDuplicate && !openModal
        );
      } else {
        resetDpmSalesDocumentChoice();
      }

      let options = normalizeUploadDeliveryPeriodOptions(response.available_periods);
      if (options.length === 0) {
        const periodCounts = new Map<string, number>();
        mappedRows.forEach((row) => {
          let period = '';
          const deliveryDate = String(row.deliveryDate ?? '').trim();
          const deliveryMatch = deliveryDate.match(/^(\d{4})-(\d{2})-\d{2}$/);
          if (deliveryMatch) {
            period = `${deliveryMatch[1]}-${deliveryMatch[2]}`;
          } else {
            const compact = String(row.periode ?? '').replace(/\D/g, '');
            if (/^\d{6}$/.test(compact)) {
              period = `${compact.slice(0, 4)}-${compact.slice(4, 6)}`;
            }
          }

          if (period) {
            periodCounts.set(period, (periodCounts.get(period) ?? 0) + 1);
          }
        });

        options = Array.from(periodCounts.entries()).map(([period, count]) => ({
          period,
          label: new Intl.DateTimeFormat('id-ID', {
            month: 'long',
            year: 'numeric'
          }).format(new Date(Number(period.slice(0, 4)), Number(period.slice(5, 7)) - 1, 1)),
          count
        }));
      }

      setDetectedUploadPeriods(options, openPeriodChoice);

      const canOpenPreview =
        openModal &&
        !showUploadDeliveryPeriodChoice.value;

      if (canOpenPreview && hasDuplicate) {
        showDpmRawSoPreview.value = false;
        openDpmRawSoDuplicatePreview(
          dpmRawSoDuplicateRows.value.length > 0
            ? 'existing'
            : dpmRawSoUploadDuplicateRows.value.length > 0
              ? 'upload_duplicate'
              : 'eligible'
        );
      } else {
        showDpmRawSoDuplicatePreview.value = false;
        showDpmRawSoPreview.value =
          canOpenPreview &&
          !hasDuplicate;
      }

      return true;
    } catch (error: any) {
      dpmRawSoPreviewRows.value = [];
      dpmRawSoPreviewSummary.value = null;
      dpmRawSoContractValidation.value = null;
      resetDpmRawSoDuplicateState();
      resetDpmSalesDocumentChoice();
      notificationStore.showAlertError(
        error?.response?.data?.message || error?.message || 'Gagal membaca Excel DPM'
      );
      return false;
    } finally {
      isPreviewLoading.value = false;
      isAnalyzingUploadPeriods.value = false;
    }
  };

  const fetchDpmRawSoData = async (resetPage = true) => {
    try {
      isLoadingRawData.value = true;
      if (resetPage) dpmRawSoCurrentPage.value = 1;
      const params = getDateOnlyFilterParams();
      if (rawServerPaged['DPM']) {
        await loadRawServerPage<DpmRawSoBackendRow>('DPM', params, dpmRawSoCurrentPage.value, dpmRawSoRowsPerPage.value, (rows) => {
          dpmRawSoData.value = rows.map(mapDpmRawSoRowFromBackend);
        }, { filters: buildRawServerFiltersForMode('dpm'), sortKey: String(dpmRawSoSortColumn.value ?? ''), sortDirection: dpmRawSoSortDirection.value });
      } else {
        const rows = await customerOrderService.getDpmRawSo(params);
        dpmRawSoData.value = rows.map(mapDpmRawSoRowFromBackend);
        rawServerTotals['DPM'] = dpmRawSoData.value.length;
      }
      refreshLatestAvailableFilterDates();
    } catch (error) {
      console.error('Gagal fetch Raw SO DPM:', error);
      notificationStore.showAlertError('Gagal mengambil Raw SO DPM');
    } finally {
      isLoadingRawData.value = false;
    }
  };

  watch(dpmRawSoRowsPerPage, () => {
    if (rawServerPaged['DPM']) {
      if (dpmRawSoCurrentPage.value !== 1) dpmRawSoCurrentPage.value = 1;
      else void fetchDpmRawSoData(false);
      return;
    }
    dpmRawSoCurrentPage.value = 1;
  });
  watch(dpmRawSoCurrentPage, (page, previous) => {
    if (rawServerPaged['DPM'] && page !== previous && !isLoadingRawData.value) void fetchDpmRawSoData(false);
  });
  watch(dpmRawSoTotalPages, (total) => {
    if (dpmRawSoCurrentPage.value > total) dpmRawSoCurrentPage.value = total;
  });

  // ============================================================
  // RAW SALES ORDER NTC
  // ============================================================

  type NtcRawSoColumn =
    TableColumn<NtcRawSoKey> & {
      letter: string;
      number: number;
    };

  const ntcRawSoColumns: NtcRawSoColumn[] = [
    { key: 'smNo', letter: 'A', number: 1, label: 'SM No', width: '130px' },
    { key: 'poNo', letter: 'B', number: 2, label: 'PO No', width: '130px' },
    { key: 'orderType', letter: 'C', number: 3, label: 'Order Type', width: '95px' },
    { key: 'supplier', letter: 'D', number: 4, label: 'Supplier', width: '95px' },
    { key: 'dock', letter: 'E', number: 5, label: 'Dock', width: '90px' },
    { key: 'orderDate', letter: 'F', number: 6, label: 'Order Date', width: '110px' },
    { key: 'arrivalDate', letter: 'G', number: 7, label: 'Arrival Date', width: '110px' },
    { key: 'arrivalTime', letter: 'H', number: 8, label: 'Arrival Time', width: '100px' },
    { key: 'cycleNo', letter: 'I', number: 9, label: 'Cycle No', width: '85px' },
    { key: 'partNo', letter: 'J', number: 10, label: 'Part No', width: '155px' },
    { key: 'partNumber', letter: 'K', number: 11, label: 'Part Number', width: '155px' },
    { key: 'desc', letter: 'L', number: 12, label: 'Desc', width: '255px' },
    { key: 'lineProduction', letter: 'M', number: 13, label: 'Line Production', width: '140px' },
    { key: 'store', letter: 'N', number: 14, label: 'Store', width: '120px' },
    { key: 'kanbanCode', letter: 'O', number: 15, label: 'Kanban Code', width: '115px' },
    { key: 'boxType', letter: 'P', number: 16, label: 'Box Type', width: '110px' },
    { key: 'qtyKbn', letter: 'Q', number: 17, label: 'Qty Kbn', width: '85px' },
    { key: 'qtyStd', letter: 'R', number: 18, label: 'Qty Std', width: '85px' },
    { key: 'qtyTotal', letter: 'S', number: 19, label: 'Qty Total', width: '95px' },
    { key: 'period', letter: 'T', number: 20, label: 'Period', width: '85px' },
    { key: 'site', letter: 'U', number: 21, label: 'Site', width: '100px' },
    // Metadata database, sama seperti Raw ADM/TMMIN.
    { key: 'createdAt', letter: 'V', number: 22, label: 'Created At', width: '160px' }
  ];

  const ntcRawSoData =
    ref<NtcRawSoRow[]>([]);

  const ntcRawSoPreviewRows =
    ref<NtcRawSoRow[]>([]);

  const ntcRawSoPreviewContractMaterials =
    ref<string[]>([]);

  const showNtcRawSoPreview =
    ref(false);

  const ntcRawSoSelectedFilters =
    ref<Partial<Record<NtcRawSoKey, string[]>>>({});

  const ntcRawSoSearchFilters =
    ref<Partial<Record<NtcRawSoKey, string>>>({});

  const ntcRawSoOpenFilters =
    ref<Partial<Record<NtcRawSoKey, boolean>>>({});

  const ntcRawSoActiveFilterKey =
    ref<NtcRawSoKey | null>(null);

  const ntcRawSoSortColumn =
    ref<NtcRawSoKey | null>(null);

  const ntcRawSoSortDirection =
    ref<SortDirection>('none');

  const ntcRawSoFilterPopupPosition =
    ref({
      top: 0,
      left: 0,
      maxHeight: 300
    });

  const ntcRawSoCurrentPage =
    ref(1);

  const ntcRawSoRowsPerPage =
    ref(10);

  const ntcRawSoRowsPerPageOptions =
    [10, 20, 50, 100];

  const ntcRawSoVisibleColumns =
    computed(() => ntcRawSoColumns);

  const ntcRawSoPreviewVisibleColumns =
    computed(() =>
      ntcRawSoColumns.filter(
        (column) => column.key !== 'createdAt'
      )
    );

  const NTC_RAW_SO_FROZEN_KEYS:
    NtcRawSoKey[] = [
      'smNo',
      'poNo',
      'orderType',
      'supplier',
      'dock'
    ];

  const ntcRawSoTableWidth =
    computed(() => {
      const width =
        ntcRawSoVisibleColumns.value
          .reduce(
            (sum, column) =>
              sum +
              getColumnWidthNumber(
                column.width
              ),
            0
          );

      /*
       * +48 px untuk checkbox lifecycle NTC.
       */
      return `${width + 48}px`;
    });

  const ntcRawSoPreviewTableWidth =
    computed(() => {
      const width =
        ntcRawSoPreviewVisibleColumns.value
          .reduce(
            (sum, column) =>
              sum +
              getColumnWidthNumber(
                column.width
              ),
            0
          );

      return `${width}px`;
    });

  const getNtcRawSoFrozenLeftPosition = (
    key: NtcRawSoKey,
    columns = ntcRawSoVisibleColumns.value,
    leadingOffset = 48
  ): number => {
    const index =
      columns.findIndex(
        (column) => column.key === key
      );

    if (index <= 0) {
      return leadingOffset;
    }

    return (
      leadingOffset +
      columns
        .slice(0, index)
        .reduce(
          (sum, column) =>
            sum +
            getColumnWidthNumber(
              column.width
            ),
          0
        )
    );
  };

  const getNtcRawSoColumnStyle = (
    key: NtcRawSoKey,
    isHeader = false,
    rowIndex = 0,
    isPreview = false
  ): CSSProperties => {
    const column =
      ntcRawSoColumns.find(
        (item) => item.key === key
      );

    const width =
      column?.width ?? '120px';

    const isFrozen =
      NTC_RAW_SO_FROZEN_KEYS.includes(key);

    const backgroundColor =
      isHeader
        ? '#eff6ff'
        : rowIndex % 2 === 0
          ? '#ffffff'
          : '#f8fafc';

    const gridColor = '#e2e8f0';
    const shadows = [
      `inset -1px 0 0 ${gridColor}`,
      `inset 0 -1px 0 ${gridColor}`
    ];

    /*
     * Border kiri tabel harus terlihat sampai body.
     */
    if (key === 'smNo') {
      shadows.push(
        `inset 1px 0 0 ${gridColor}`
      );
    }

    if (isHeader) {
      shadows.push(
        `inset 0 1px 0 ${gridColor}`
      );
    }

    /*
     * Batas freeze NTC sekarang berada setelah Dock.
     */
    if (
      isFrozen &&
      key === 'dock'
    ) {
      shadows.push(
        '3px 0 7px -6px rgba(15, 23, 42, 0.32)'
      );
    }

    const base: CSSProperties = {
      minWidth: width,
      width,
      maxWidth: width,
      boxSizing: 'border-box',
      backgroundColor,
      backgroundImage:
        `linear-gradient(${backgroundColor}, ${backgroundColor})`,
      boxShadow: shadows.join(', '),
      isolation: 'isolate'
    };

    if (!isFrozen) {
      return {
        ...base,
        position: 'relative',
        zIndex: isHeader ? 301 : 1
      };
    }

    return {
      ...base,
      position: 'sticky',
      left: `${getNtcRawSoFrozenLeftPosition(
        key,
        isPreview
          ? ntcRawSoPreviewVisibleColumns.value
          : ntcRawSoVisibleColumns.value,
        isPreview ? 0 : 48
      )}px`,
      zIndex: isHeader ? 700 : 80,
      transform: 'translateZ(0)',
      backfaceVisibility: 'hidden'
    };
  };

  const getNtcRawSoColumnOptions = (
    key: NtcRawSoKey
  ): string[] => {
    return sortFilterOptions(
      Array.from(
        new Set(
          getRowsMatchingOtherColumnFilters(
            ntcRawSoData.value,
            ntcRawSoVisibleColumns.value,
            ntcRawSoSelectedFilters.value,
            key,
            (row, columnKey) => row[columnKey]
          ).map(
            (row) =>
              normalizeFilterOption(
                row[key]
              )
          )
        )
      )
    );
  };

  const getNtcRawSoSelectedValues = (
    key: NtcRawSoKey
  ): string[] => {
    return (
      ntcRawSoSelectedFilters.value[key] ??
      []
    );
  };

  const getNtcRawSoSearchValue = (
    key: NtcRawSoKey
  ): string => {
    return (
      ntcRawSoSearchFilters.value[key] ??
      ''
    );
  };

  const setNtcRawSoSearchValue = (
    key: NtcRawSoKey,
    value: string
  ) => {
    ntcRawSoSearchFilters.value[key] =
      String(value ?? '');
  };

  const getNtcRawSoFilteredColumnOptions = (
    key: NtcRawSoKey
  ): string[] => {
    const search =
      getNtcRawSoSearchValue(key)
        .trim()
        .toLocaleLowerCase('id');

    const options =
      getNtcRawSoColumnOptions(key);

    if (search === '') {
      return options;
    }

    return options.filter(
      (option) => matchesFilterOptionSearch(key, option, search)
    );
  };

  const toggleNtcRawSoFilter = (
    key: NtcRawSoKey,
    value: string
  ) => {
    const selected =
      [...getNtcRawSoSelectedValues(key)];

    const index =
      selected.indexOf(value);

    if (index < 0) {
      selected.push(value);
    } else {
      selected.splice(index, 1);
    }

    ntcRawSoSelectedFilters.value[key] =
      selected;
  };

  const toggleAllNtcRawSoColumn = (
    key: NtcRawSoKey
  ) => {
    const options =
      getNtcRawSoFilteredColumnOptions(key);

    const selected =
      getNtcRawSoSelectedValues(key);

    const allSelected =
      options.length > 0 &&
      options.every(
        (option) =>
          selected.includes(option)
      );

    ntcRawSoSelectedFilters.value[key] =
      allSelected
        ? []
        : [...options];
  };

  const clearNtcRawSoColumnFilter = (
    key: NtcRawSoKey
  ) => {
    ntcRawSoSelectedFilters.value[key] = [];
    ntcRawSoSearchFilters.value[key] = '';
  };

  const isAllNtcRawSoSelected = (
    key: NtcRawSoKey
  ): boolean => {
    const options =
      getNtcRawSoFilteredColumnOptions(key);

    const selected =
      getNtcRawSoSelectedValues(key);

    return (
      options.length > 0 &&
      options.every(
        (option) =>
          selected.includes(option)
      )
    );
  };

  const isNtcRawSoFilterSelected = (
    key: NtcRawSoKey,
    value: string
  ): boolean => {
    return getNtcRawSoSelectedValues(key)
      .includes(value);
  };

  const closeNtcRawSoFilter = () => {
    ntcRawSoOpenFilters.value = {};
    ntcRawSoActiveFilterKey.value = null;
    clearAnchoredFilterPopup();
  };

  const setNtcRawSoSort = (
    key: NtcRawSoKey,
    direction: SortDirection
  ) => {
    ntcRawSoSortColumn.value =
      direction === 'none'
        ? null
        : key;

    ntcRawSoSortDirection.value =
      direction;

    ntcRawSoCurrentPage.value = 1;
    if (rawServerPaged['NTC']) {
      void fetchNtcRawSoData(false);
    }
  };

  const isNtcRawSoSortActive = (
    key: NtcRawSoKey,
    direction: 'asc' | 'desc'
  ): boolean => {
    return (
      ntcRawSoSortColumn.value === key &&
      ntcRawSoSortDirection.value ===
        direction
    );
  };

  const isNtcRawSoNoSortActive = (
    key: NtcRawSoKey
  ): boolean => {
    return (
      ntcRawSoSortColumn.value !== key ||
      ntcRawSoSortDirection.value === 'none'
    );
  };

  const ntcRawSoFilteredRows =
    computed(() => {
      return getRowsMatchingOtherColumnFilters(
        ntcRawSoData.value,
        ntcRawSoVisibleColumns.value,
        ntcRawSoSelectedFilters.value,
        null,
        (row, key) => row[key]
      );
    });

  const ntcRawSoSortedRows =
    computed(() => {
      const rows =
        [...ntcRawSoFilteredRows.value];

      const key =
        ntcRawSoSortColumn.value;

      const direction =
        ntcRawSoSortDirection.value;

      if (
        !key ||
        direction === 'none'
      ) {
        return rows;
      }

      rows.sort(
        (first, second) => {
          const firstValue =
            String(
              first[key] ?? ''
            );

          const secondValue =
            String(
              second[key] ?? ''
            );

          const compared =
            firstValue.localeCompare(
              secondValue,
              'id',
              {
                numeric: true
              }
            );

          return direction === 'asc'
            ? compared
            : -compared;
        }
      );

      return rows;
    });

  const ntcRawSoTotalPages = computed(() => {
    const totalRows = rawServerPaged['NTC']
      ? rawServerTotals['NTC']
      : ntcRawSoSortedRows.value.length;
    return Math.max(1, Math.ceil(totalRows / ntcRawSoRowsPerPage.value));
  });

  const ntcRawSoVisiblePages =
    computed(() => {
      const start =
        Math.max(
          1,
          ntcRawSoCurrentPage.value - 2
        );

      const end =
        Math.min(
          ntcRawSoTotalPages.value,
          start + 4
        );

      return Array.from(
        {
          length:
            Math.max(
              0,
              end - start + 1
            )
        },
        (_, index) =>
          start + index
      );
    });

  const ntcRawSoPaginatedRows = computed(() => {
    if (rawServerPaged['NTC']) {
      return ntcRawSoSortedRows.value;
    }
    const start = (ntcRawSoCurrentPage.value - 1) * ntcRawSoRowsPerPage.value;
    return ntcRawSoSortedRows.value.slice(start, start + ntcRawSoRowsPerPage.value);
  });

  const ntcRawSoShowingStart = computed(() => {
    const totalRows = rawServerPaged['NTC']
      ? rawServerTotals['NTC']
      : ntcRawSoSortedRows.value.length;
    return totalRows === 0 ? 0 : (ntcRawSoCurrentPage.value - 1) * ntcRawSoRowsPerPage.value + 1;
  });

  const ntcRawSoShowingEnd = computed(() => {
    const totalRows = rawServerPaged['NTC']
      ? rawServerTotals['NTC']
      : ntcRawSoSortedRows.value.length;
    return Math.min(ntcRawSoCurrentPage.value * ntcRawSoRowsPerPage.value, totalRows);
  });

  const ntcRawSoFirstPage = () => {
    ntcRawSoCurrentPage.value = 1;
  };

  const ntcRawSoPrevPage = () => {
    if (ntcRawSoCurrentPage.value > 1) {
      ntcRawSoCurrentPage.value--;
    }
  };

  const ntcRawSoNextPage = () => {
    if (
      ntcRawSoCurrentPage.value <
      ntcRawSoTotalPages.value
    ) {
      ntcRawSoCurrentPage.value++;
    }
  };

  const ntcRawSoLastPage = () => {
    ntcRawSoCurrentPage.value =
      ntcRawSoTotalPages.value;
  };

  const getNtcRawSoSelectedLabel = (
    key: NtcRawSoKey
  ): string => {
    const values =
      ntcRawSoSelectedFilters.value[key] ??
      [];

    if (values.length === 0) {
      return '';
    }

    if (values.length === 1) {
      return values[0];
    }

    return `${values.length} selected`;
  };

  const toggleNtcRawSoDropdown = async (
    key: NtcRawSoKey,
    event: MouseEvent
  ) => {
    const element =
      event.currentTarget as HTMLElement;

    const wasOpen =
      ntcRawSoOpenFilters.value[key] ===
      true;

    closeAllPopups();

    if (wasOpen) {
      ntcRawSoActiveFilterKey.value = null;
      clearAnchoredFilterPopup();
      return;
    }

    setAnchoredFilterPopup(
      element,
      (anchor) => {
        ntcRawSoFilterPopupPosition.value =
          getSafeRawFilterPopupPosition(anchor);
      }
    );

    ntcRawSoOpenFilters.value[key] = true;
    ntcRawSoActiveFilterKey.value = key;
  };

  const closeNtcRawSoPreview = () => {
    showNtcRawSoPreview.value = false;
  };

  const mapNtcRawSoRowFromBackend =
    (
      row: NtcRawSoBackendRow
    ): NtcRawSoRow => {
      const value = (
        key: string
      ): string => {
        return String(
          row[key] ?? ''
        );
      };

      return {
        id: Number(row.id ?? 0),
        uploadBatchId:
          value('upload_batch_id'),
        sourceFile:
          value('source_file'),
        sourceRow:
          Number(row.source_row ?? 0),
        ntcPlant:
          value('ntc_plant'),
        uploadedBy:
          value('uploaded_by'),
        smNo: value('sm_no'),
        poNo: value('po_no'),
        orderType: value('order_type'),
        supplier: value('supplier'),
        dock: value('dock'),
        orderDate: value('order_date'),
        arrivalDate: value('arrival_date'),
        arrivalTime: value('arrival_time'),
        cycleNo: value('cycle_no'),
        partNo: value('part_no_raw'),
        partNumber: value('part_number'),
        desc: value('description'),
        lineProduction: value('line_production'),
        store: value('store'),
        kanbanCode: value('kanban_code'),
        boxType: value('box_type'),
        qtyKbn: value('qty_kbn'),
        qtyStd: value('qty_std'),
        qtyTotal: value('qty_total'),
        period: value('period_raw'),
        site: value('site'),
        createdAt: value('created_at')
      };
    };

  const fetchNtcRawSoData = async (resetPage = true) => {
    try {
      isLoadingRawData.value = true;
      if (resetPage) ntcRawSoCurrentPage.value = 1;
      const params = getDateOnlyFilterParams();
      if (rawServerPaged['NTC']) {
        await loadRawServerPage<NtcRawSoBackendRow>('NTC', params, ntcRawSoCurrentPage.value, ntcRawSoRowsPerPage.value, (rows) => {
          ntcRawSoData.value = rows.map(mapNtcRawSoRowFromBackend);
        }, { filters: buildRawServerFiltersForMode('ntc'), sortKey: String(ntcRawSoSortColumn.value ?? ''), sortDirection: ntcRawSoSortDirection.value });
      } else {
        const rows = await customerOrderService.getNtcRawSo(params);
        ntcRawSoData.value = rows.map(mapNtcRawSoRowFromBackend);
        rawServerTotals['NTC'] = ntcRawSoData.value.length;
      }
      refreshLatestAvailableFilterDates();
    } catch (error) {
      console.error('Gagal fetch Raw SO NTC:', error);
      notificationStore.showAlertError('Gagal mengambil Raw SO NTC');
    } finally {
      isLoadingRawData.value = false;
    }
  };

  watch(
    ntcRawSoSelectedFilters,
    () => {
      ntcRawSoCurrentPage.value = 1;
    },
    {
      deep: true
    }
  );

  watch(ntcRawSoRowsPerPage, () => {
    if (rawServerPaged['NTC']) {
      if (ntcRawSoCurrentPage.value !== 1) ntcRawSoCurrentPage.value = 1;
      else void fetchNtcRawSoData(false);
      return;
    }
    ntcRawSoCurrentPage.value = 1;
  });

  watch(ntcRawSoCurrentPage, (page, previous) => {
    if (rawServerPaged['NTC'] && page !== previous && !isLoadingRawData.value) {
      void fetchNtcRawSoData(false);
    }
  });

  watch(
    ntcRawSoTotalPages,
    (totalPages) => {
      if (
        ntcRawSoCurrentPage.value >
        totalPages
      ) {
        ntcRawSoCurrentPage.value =
          totalPages;
      }
    }
  );


  // ============================================================
  // RAW SALES ORDER TMMIN
  // ============================================================

  type TmminRawSoColumn =
    TableColumn<TmminRawSoKey> & {
      letter: string;
      number: number;
      group?: 'source' | 'sap';
    };

  const tmminRawSoColumns:
    TmminRawSoColumn[] = [
      { key: 'aManifestNo', letter: 'A', number: 1, label: 'NO MANIFEST', width: '130px', group: 'source' },
      { key: 'bCode', letter: 'B', number: 2, label: 'KODE', width: '80px', group: 'source' },
      { key: 'cValue', letter: 'C', number: 3, label: '', width: '60px', group: 'source' },
      { key: 'dValue', letter: 'D', number: 4, label: '', width: '70px', group: 'source' },
      { key: 'eValue', letter: 'E', number: 5, label: '', width: '80px', group: 'source' },
      { key: 'fValue', letter: 'F', number: 6, label: '', width: '60px', group: 'source' },
      { key: 'gValue', letter: 'G', number: 7, label: '', width: '70px', group: 'source' },
      { key: 'hPoNo', letter: 'H', number: 8, label: 'NO PO', width: '120px', group: 'source' },
      { key: 'iValue', letter: 'I', number: 9, label: '', width: '70px', group: 'source' },
      { key: 'jValue', letter: 'J', number: 10, label: '', width: '70px', group: 'source' },
      { key: 'kPartNoRaw', letter: 'K', number: 11, label: 'PART NO', width: '135px', group: 'source' },
      { key: 'lValue', letter: 'L', number: 12, label: '', width: '130px', group: 'source' },
      { key: 'mValue', letter: 'M', number: 13, label: '', width: '60px', group: 'source' },
      { key: 'nOrderDateTime', letter: 'N', number: 14, label: '', width: '180px', group: 'source' },
      { key: 'oJobNo', letter: 'O', number: 15, label: 'JOB NO', width: '100px', group: 'source' },
      { key: 'pQtyPalet', letter: 'P', number: 16, label: 'QTY/PALET', width: '90px', group: 'source' },
      { key: 'qQtyOrder', letter: 'Q', number: 17, label: 'QTY ORDER', width: '90px', group: 'source' },
      { key: 'rKbn', letter: 'R', number: 18, label: 'KBN', width: '70px', group: 'source' },
      { key: 'sValue', letter: 'S', number: 19, label: '', width: '70px', group: 'source' },
      { key: 'tValue', letter: 'T', number: 20, label: '', width: '70px', group: 'source' },
      { key: 'uValue', letter: 'U', number: 21, label: '', width: '70px', group: 'source' },
      { key: 'vSupplierName', letter: 'V', number: 22, label: '', width: '190px', group: 'source' },
      { key: 'wPartName', letter: 'W', number: 23, label: 'PART NAME', width: '300px', group: 'source' },
      { key: 'xValue', letter: 'X', number: 24, label: '', width: '70px', group: 'source' },
      { key: 'yValue', letter: 'Y', number: 25, label: '', width: '180px', group: 'source' },
      { key: 'zDlvDateRv01', letter: 'Z', number: 26, label: 'DLV DATE RV-01', width: '180px', group: 'source' },
      { key: 'aaValue', letter: 'AA', number: 27, label: '', width: '90px', group: 'source' },
      { key: 'abValue', letter: 'AB', number: 28, label: '', width: '60px', group: 'source' },
      { key: 'acValue', letter: 'AC', number: 29, label: '', width: '180px', group: 'source' },
      { key: 'adRoute', letter: 'AD', number: 30, label: 'ROUTE', width: '90px', group: 'source' },
      { key: 'aeCycle', letter: 'AE', number: 31, label: 'CYCLE', width: '70px', group: 'source' },
      { key: 'afOrderDateRaw', letter: 'AF', number: 32, label: '', width: '180px', group: 'source' },
      { key: 'agValue', letter: 'AG', number: 33, label: '', width: '80px', group: 'source' },
      { key: 'ahValue', letter: 'AH', number: 34, label: '', width: '60px', group: 'source' },
      { key: 'aiValue', letter: 'AI', number: 35, label: '', width: '70px', group: 'source' },
      { key: 'ajDlvDate', letter: 'AJ', number: 36, label: 'DLV DATE', width: '180px', group: 'source' },
      { key: 'akValue', letter: 'AK', number: 37, label: '', width: '180px', group: 'source' },
      { key: 'alValue', letter: 'AL', number: 38, label: '', width: '90px', group: 'source' },
      { key: 'amValue', letter: 'AM', number: 39, label: '', width: '70px', group: 'source' },
      { key: 'anValue', letter: 'AN', number: 40, label: '', width: '110px', group: 'source' },
      { key: 'aoDeliveryOrderDate', letter: 'AO', number: 41, label: 'DELIVERY ORDER DATE', width: '300px', group: 'source' },
      { key: 'apOrderDate', letter: 'AP', number: 42, label: 'ORDER DATE', width: '110px', group: 'sap' },
      { key: 'aqMaterialSap', letter: 'AQ', number: 43, label: 'MATERIAL SAP RUMUSAN', width: '155px', group: 'sap' },
      { key: 'arMaterialSo', letter: 'AR', number: 44, label: 'MATERIAL SO(RUMUSAN)', width: '175px', group: 'sap' },
      { key: 'asQty', letter: 'AS', number: 45, label: 'QTY', width: '80px', group: 'sap' },
      { key: 'atManifest', letter: 'AT', number: 46, label: 'MANIFEST', width: '130px', group: 'sap' },
      { key: 'auPo', letter: 'AU', number: 47, label: 'PO', width: '120px', group: 'sap' },
      { key: 'avJobNo', letter: 'AV', number: 48, label: 'JOB NO', width: '90px', group: 'sap' },
      { key: 'awCycle', letter: 'AW', number: 49, label: 'CYCLE', width: '70px', group: 'sap' },
      { key: 'axDateSo', letter: 'AX', number: 50, label: 'DATE SO', width: '110px', group: 'sap' },
      { key: 'ayTimeSoMs', letter: 'AY', number: 51, label: 'TIME SO', width: '120px', group: 'sap' },
      { key: 'azTimeSo', letter: 'AZ', number: 52, label: 'TIME SO', width: '100px', group: 'sap' },
      { key: 'baOrderDate', letter: 'BA', number: 53, label: 'ORDER DATE', width: '110px', group: 'sap' },
      // Metadata database, bukan kolom TXT. Selalu diletakkan paling kanan.
      { key: 'createdAt' as TmminRawSoKey, letter: '', number: 54, label: 'CREATED AT', width: '160px', group: 'sap' }
    ];

  const tmminRawSoData =
    ref<TmminRawSoRow[]>([]);

  // Kolom yang memang tidak ditampilkan di website.
  const TMMIN_RAW_SO_ALWAYS_HIDDEN_COLUMNS =
    new Set<TmminRawSoKey>([
      'yValue',
      'zDlvDateRv01',
      'ayTimeSoMs'
    ]);

  const tmminRawSoSelectedFilters =
    ref<
      Partial<
        Record<
          TmminRawSoKey,
          string[]
        >
      >
    >({});

  const tmminRawSoSearchFilters =
    ref<
      Partial<
        Record<
          TmminRawSoKey,
          string
        >
      >
    >({});

  const tmminRawSoOpenFilters =
    ref<
      Partial<
        Record<
          TmminRawSoKey,
          boolean
        >
      >
    >({});

  const tmminRawSoActiveFilterKey =
    ref<TmminRawSoKey | null>(
      null
    );

  const tmminRawSoSortColumn =
    ref<TmminRawSoKey | null>(
      null
    );

  const tmminRawSoSortDirection =
    ref<SortDirection>(
      'none'
    );

  const tmminRawSoFilterPopupPosition =
    ref({
      top: 0,
      left: 0,
      maxHeight: 300
    });

  const tmminRawSoCurrentPage =
    ref(1);

  const tmminRawSoRowsPerPage =
    ref(10);

  const tmminRawSoRowsPerPageOptions =
    [10, 20, 50, 100];

  const showTmminRawSoPreview =
    ref(false);

  const tmminRawSoPreviewRows =
    ref<TmminRawSoRow[]>([]);

  const tmminRawSoPreviewContractMaterials =
    ref<string[]>([]);

  const hasTmminColumnData = (
    rows: TmminRawSoRow[],
    key: TmminRawSoKey
  ): boolean => {
    return rows.some(
      (row) =>
        String(
          row[key] ?? ''
        ).trim() !== ''
    );
  };

  // Kolom kosong otomatis tidak ditampilkan.
  const tmminRawSoVisibleColumns =
    computed(() => {
      /*
       * Saat belum ada data TMMIN, jangan anggap seluruh kolom
       * sebagai kolom kosong. Kalau semua kolom dibuang, tabel
       * hanya menyisakan checkbox dan empty state menjadi sempit.
       *
       * Samakan behavior dengan Format Sales Order:
       * header tabel tetap memiliki lebar/struktur normal walaupun
       * body belum memiliki row.
       */
      if (tmminRawSoData.value.length === 0) {
        return tmminRawSoColumns.filter(
          (column) =>
            !TMMIN_RAW_SO_ALWAYS_HIDDEN_COLUMNS.has(
              column.key
            )
        );
      }

      return tmminRawSoColumns
        .filter(
          (column) => {
            if (
              TMMIN_RAW_SO_ALWAYS_HIDDEN_COLUMNS
                .has(
                  column.key
                )
            ) {
              return false;
            }

            return hasTmminColumnData(
              tmminRawSoData.value,
              column.key
            );
          }
        );
    });

  const tmminRawSoPreviewVisibleColumns =
    computed(() => {
      return tmminRawSoColumns
        .filter(
          (column) => {
            if (
              TMMIN_RAW_SO_ALWAYS_HIDDEN_COLUMNS
                .has(
                  column.key
                )
            ) {
              return false;
            }

            return hasTmminColumnData(
              tmminRawSoPreviewRows.value,
              column.key
            );
          }
        );
    });

  const getTmminColumnsWidth = (
    columns: TmminRawSoColumn[]
  ): string => {
    return (
      columns.reduce(
        (sum, column) =>
          sum +
          Number(
            column.width
              .replace(
                'px',
                ''
              )
          ),
        0
      ) +
      'px'
    );
  };

  const TMMIN_RAW_SELECTION_COLUMN_WIDTH =
    40;

  /*
   * Freeze Raw TMMIN sampai NO PO (A:H),
   * ditambah checkbox selection di paling kiri.
   */
  const TMMIN_RAW_SO_FROZEN_KEYS:
    TmminRawSoKey[] = [
      'aManifestNo',
      'bCode',
      'cValue',
      'dValue',
      'eValue',
      'fValue',
      'gValue',
      'hPoNo'
    ];

  const tmminRawSoTableWidth =
    computed(() => {
      const columnsWidth =
        tmminRawSoVisibleColumns.value.reduce(
          (sum, column) =>
            sum + getColumnWidthNumber(column.width),
          0
        );

      return `${columnsWidth + TMMIN_RAW_SELECTION_COLUMN_WIDTH}px`;
    });

  const getTmminRawSoFrozenLeftPosition = (
    key: TmminRawSoKey
  ): number => {
    const visibleColumns =
      tmminRawSoVisibleColumns.value;

    const index =
      visibleColumns.findIndex(
        (column) => column.key === key
      );

    if (index < 0) {
      return TMMIN_RAW_SELECTION_COLUMN_WIDTH;
    }

    return (
      TMMIN_RAW_SELECTION_COLUMN_WIDTH +
      visibleColumns
        .slice(0, index)
        .reduce(
          (sum, column) =>
            sum + getColumnWidthNumber(column.width),
          0
        )
    );
  };

  const getTmminRawSoColumnStyle = (
    key: TmminRawSoKey,
    isHeader = false,
    rowIndex = 0
  ): CSSProperties => {
    const column =
      tmminRawSoVisibleColumns.value.find(
        (item) => item.key === key
      ) ??
      tmminRawSoColumns.find(
        (item) => item.key === key
      );

    const width =
      column?.width || '120px';

    const isFrozen =
      TMMIN_RAW_SO_FROZEN_KEYS.includes(key);

    const isOpen =
      tmminRawSoOpenFilters.value[key] === true;

    const frozenVisibleKeys =
      tmminRawSoVisibleColumns.value
        .map((item) => item.key)
        .filter((itemKey) =>
          TMMIN_RAW_SO_FROZEN_KEYS.includes(itemKey)
        );

    const frozenIndex =
      frozenVisibleKeys.indexOf(key);

    const lastFrozenKey =
      frozenVisibleKeys[
      frozenVisibleKeys.length - 1
      ];

    const backgroundColor =
      isHeader
        ? '#eff6ff'
        : rowIndex % 2 === 0
          ? '#ffffff'
          : '#f8fafc';

    const gridColor = '#e2e8f0';

    const gridShadows = [
      `inset -1px 0 0 ${gridColor}`,
      `inset 0 -1px 0 ${gridColor}`
    ];

    if (isHeader) {
      gridShadows.push(
        `inset 0 1px 0 ${gridColor}`
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
          getTmminRawSoFrozenLeftPosition(key) -
          Math.max(frozenIndex, 0)
        )
        : 0;

    const baseStyle: CSSProperties = {
      minWidth: width,
      width,
      maxWidth: width,
      boxSizing: 'border-box',
      backgroundColor,
      backgroundImage: `linear-gradient(${backgroundColor}, ${backgroundColor})`,
      backgroundOrigin: 'border-box',
      backgroundClip: 'border-box',
      backgroundRepeat: 'no-repeat',
      backgroundSize: '100% 100%',
      isolation: 'isolate',
      boxShadow: gridShadows.join(', ')
    };

    if (!isFrozen) {
      return {
        ...baseStyle,
        position: 'relative',
        zIndex:
          isHeader && isOpen
            ? 10001
            : isHeader
              ? 301
              : 1
      };
    }

    return {
      ...baseStyle,
      position: 'sticky',
      left: `${frozenLeft}px`,
      zIndex:
        isHeader && isOpen
          ? 10002
          : isHeader
            ? 700
            : 80,
      transform: 'translateZ(0)',
      backfaceVisibility: 'hidden'
    };
  };

  const getTmminRawSoCheckboxColumnStyle = (
    isHeader = false,
    rowIndex = 0
  ): CSSProperties => {
    const width =
      `${TMMIN_RAW_SELECTION_COLUMN_WIDTH}px`;

    const backgroundColor =
      isHeader
        ? '#eff6ff'
        : rowIndex % 2 === 0
          ? '#ffffff'
          : '#f8fafc';

    const gridColor = '#e2e8f0';

    const gridShadows = [
      `inset -1px 0 0 ${gridColor}`,
      `inset 0 -1px 0 ${gridColor}`,
      `inset 1px 0 0 ${gridColor}`
    ];

    if (isHeader) {
      gridShadows.push(
        `inset 0 1px 0 ${gridColor}`
      );
    }

    return {
      minWidth: width,
      width,
      maxWidth: width,
      boxSizing: 'border-box',
      position: 'sticky',
      left: '0px',
      zIndex: isHeader ? 900 : 180,
      backgroundColor,
      backgroundImage: `linear-gradient(${backgroundColor}, ${backgroundColor})`,
      backgroundOrigin: 'border-box',
      backgroundClip: 'border-box',
      backgroundRepeat: 'no-repeat',
      backgroundSize: '100% 100%',
      isolation: 'isolate',
      boxShadow: gridShadows.join(', '),
      transform: 'translateZ(0)',
      backfaceVisibility: 'hidden'
    };
  };

  const tmminRawSoPreviewTableWidth =
    computed(() => {
      return getTmminColumnsWidth(
        tmminRawSoPreviewVisibleColumns
          .value
      );
    });

  const mapTmminRawSoRowFromBackend =
    (
      row:
        TmminRawSoBackendRow
    ): TmminRawSoRow => {
      const value = (
        snakeKey: string
      ): string => {
        return String(
          row[snakeKey] ??
          ''
        );
      };

      return {
        id: Number(row.id ?? 0),
        uploadBatchId:
          value(
            'upload_batch_id'
          ),
        sourceFile:
          value(
            'source_file'
          ),
        sourceHeader:
          value(
            'source_header'
          ),
        sourceRow:
          Number(
            row.source_row ??
            0
          ),
        uploadedBy:
          value(
            'uploaded_by'
          ),
        createdAt:
          value(
            'created_at'
          ),

        aManifestNo: value('a_manifest_no'),
        bCode: value('b_code'),
        cValue: value('c_value'),
        dValue: value('d_value'),
        eValue: value('e_value'),
        fValue: value('f_value'),
        gValue: value('g_value'),
        hPoNo: value('h_po_no'),
        iValue: value('i_value'),
        jValue: value('j_value'),
        kPartNoRaw: value('k_part_no_raw'),
        lValue: value('l_value'),
        mValue: value('m_value'),
        nOrderDateTime: value('n_order_datetime'),
        oJobNo: value('o_job_no'),
        pQtyPalet: value('p_qty_palet'),
        qQtyOrder: value('q_qty_order'),
        rKbn: value('r_kbn'),
        sValue: value('s_value'),
        tValue: value('t_value'),
        uValue: value('u_value'),
        vSupplierName: value('v_supplier_name'),
        wPartName: value('w_part_name'),
        xValue: value('x_value'),
        yValue: value('y_value'),
        zDlvDateRv01: value('z_dlv_date_rv01'),
        aaValue: value('aa_value'),
        abValue: value('ab_value'),
        acValue: value('ac_value'),
        adRoute: value('ad_route'),
        aeCycle: value('ae_cycle'),
        afOrderDateRaw: value('af_order_date_raw'),
        agValue: value('ag_value'),
        ahValue: value('ah_value'),
        aiValue: value('ai_value'),
        ajDlvDate: value('aj_dlv_date'),
        akValue: value('ak_value'),
        alValue: value('al_value'),
        amValue: value('am_value'),
        anValue: value('an_value'),
        aoDeliveryOrderDate: value('ao_delivery_order_date'),
        apOrderDate: value('ap_order_date'),
        aqMaterialSap: value('aq_material_sap'),
        arMaterialSo: value('ar_material_so'),
        asQty: value('as_qty'),
        atManifest: value('at_manifest'),
        auPo: value('au_po'),
        avJobNo: value('av_job_no'),
        awCycle: value('aw_cycle'),
        axDateSo: value('ax_date_so'),
        ayTimeSoMs: value('ay_time_so_ms'),
        azTimeSo: value('az_time_so'),
        baOrderDate: value('ba_order_date')
      };
    };

  /*
   * ============================================================
   * LATEST ORDER / DELIVERY DATE FOR HEADER FILTER
   * ============================================================
   *
   * Order Date dan Delivery Date pada file customer dapat berada
   * 1-2 hari setelah hari ini. Karena itu batas kalender tidak boleh
   * lagi memakai todayDate secara mutlak. Batas diambil dari tanggal
   * terbaru yang benar-benar ada pada Raw Files / Format Sales Order.
   *
   * Saat filter tanggal sedang aktif, batas yang sudah diketahui tidak
   * diperkecil oleh hasil filter. Ini membuat user tetap dapat membuka
   * kembali range sampai tanggal data terbaru tanpa harus kehilangan
   * batas maksimum sebelumnya.
   */
  let latestDateLimitScopeKey = '';

  const getLatestNormalizedDate = (
    values: unknown[]
  ): string => {
    const normalized = values
      .map(normalizeSelectedOrderDate)
      .filter((value) => value !== '')
      .sort();

    return normalized[normalized.length - 1] ?? '';
  };

  function refreshLatestAvailableFilterDates(): void {
    syncTodayDate();

    const scopeKey =
      selectedCustomers.value.length === 0
        ? '__ALL__'
        : [...selectedCustomers.value]
          .map((value) => String(value ?? '').trim().toUpperCase())
          .sort()
          .join('|');

    const scopeChanged =
      latestDateLimitScopeKey !== scopeKey;

    latestDateLimitScopeKey = scopeKey;

    const rawOrderDates: unknown[] =
      isAsiAdmSoMode.value
        ? asiAdmRawSoData.value.map((row) =>
          row.orderDate || ''
        )
        : isDcwaSoMode.value
        ? dcwaRawSoData.value.map((row) =>
          row.orderDate || ''
        )
        : isNtcSoMode.value
          ? ntcRawSoData.value.map((row) =>
            row.orderDate || ''
          )
          : isTmminSoMode.value
            ? tmminRawSoData.value.map((row) =>
              row.baOrderDate ||
              row.apOrderDate ||
              row.afOrderDateRaw ||
              row.nOrderDateTime ||
              ''
            )
            : card2Data.value.map((row) =>
              row.orderDate ?? ''
            );

    const rawDeliveryDates: unknown[] =
      isAsiAdmSoMode.value
        ? asiAdmRawSoData.value.map((row) =>
          row.deliveryDate || ''
        )
        : isDcwaSoMode.value
        ? dcwaRawSoData.value.map((row) =>
          row.orderDate || ''
        )
        : isNtcSoMode.value
          ? ntcRawSoData.value.map((row) =>
            row.arrivalDate || ''
          )
          : isTmminSoMode.value
            ? tmminRawSoData.value.map((row) =>
              row.axDateSo ||
              row.ajDlvDate ||
              row.zDlvDateRv01 ||
              ''
            )
            : card2Data.value.map((row) =>
              row.delDate ?? ''
            );

    const formatOrderDates: unknown[] =
      formatSalesOrderData.value.map((row) =>
        row.po_date ?? ''
      );

    const formatDeliveryDates: unknown[] =
      formatSalesOrderData.value.map((row) =>
        row.req_delv_date ?? ''
      );

    const detectedOrderMax =
      getLatestNormalizedDate([
        ...rawOrderDates,
        ...formatOrderDates
      ]);

    const detectedDeliveryMax =
      getLatestNormalizedDate([
        ...rawDeliveryDates,
        ...formatDeliveryDates
      ]);

    const hasOrderDateFilter =
      fromDate.value.trim() !== '' ||
      toDate.value.trim() !== '';

    const hasDeliveryDateFilter =
      deliveryFromDate.value.trim() !== '' ||
      deliveryToDate.value.trim() !== '';

    if (scopeChanged || !hasOrderDateFilter) {
      maxOrderDate.value =
        detectedOrderMax || todayDate.value;
    } else if (
      detectedOrderMax !== '' &&
      detectedOrderMax > maxOrderDate.value
    ) {
      maxOrderDate.value = detectedOrderMax;
    }

    if (scopeChanged || !hasDeliveryDateFilter) {
      maxDeliveryDate.value =
        detectedDeliveryMax || todayDate.value;
    } else if (
      detectedDeliveryMax !== '' &&
      detectedDeliveryMax > maxDeliveryDate.value
    ) {
      maxDeliveryDate.value = detectedDeliveryMax;
    }
  }

  const fetchTmminRawSoData = async (resetPage = true) => {
    try {
      isLoadingRawData.value = true;
      if (resetPage) tmminRawSoCurrentPage.value = 1;
      const params = getDateOnlyFilterParams();
      if (rawServerPaged['TMMIN']) {
        await loadRawServerPage<TmminRawSoBackendRow>('TMMIN', params, tmminRawSoCurrentPage.value, tmminRawSoRowsPerPage.value, (rows) => {
          tmminRawSoData.value = rows.map(mapTmminRawSoRowFromBackend);
        }, { filters: buildRawServerFiltersForMode('tmmin'), sortKey: String(tmminRawSoSortColumn.value ?? ''), sortDirection: tmminRawSoSortDirection.value });
      } else {
        const rows = await customerOrderService.getTmminRawSo(params);
        tmminRawSoData.value = rows.map(mapTmminRawSoRowFromBackend);
        rawServerTotals['TMMIN'] = tmminRawSoData.value.length;
      }
      refreshLatestAvailableFilterDates();
    } catch (error) {
      console.error('Gagal fetch Raw SO TMMIN:', error);
      notificationStore.showAlertError('Gagal mengambil Raw SO TMMIN');
    } finally {
      isLoadingRawData.value = false;
    }
  };

  const getTmminRawSoColumnOptions =
    (
      key:
        TmminRawSoKey
    ): string[] => {
      return sortFilterOptions(
        Array.from(
          new Set(
            getRowsMatchingOtherColumnFilters(
              tmminRawSoData.value,
              tmminRawSoVisibleColumns.value,
              tmminRawSoSelectedFilters.value,
              key,
              (row, columnKey) => row[columnKey]
            )
              .map(
                (row) =>
                  normalizeFilterOption(
                    row[key]
                  )
              )
          )
        )
      );
    };

  const getTmminRawSoSelectedValues =
    (
      key:
        TmminRawSoKey
    ): string[] => {
      return (
        tmminRawSoSelectedFilters
          .value[
        key
        ] ??
        []
      );
    };

  const getTmminRawSoSearchValue =
    (
      key:
        TmminRawSoKey
    ): string => {
      return (
        tmminRawSoSearchFilters
          .value[
        key
        ] ??
        ''
      );
    };

  const setTmminRawSoSearchValue =
    (
      key:
        TmminRawSoKey,
      value:
        string
    ) => {
      tmminRawSoSearchFilters
        .value[
        key
      ] =
        String(
          value ??
          ''
        );
    };

  const getTmminRawSoFilteredColumnOptions =
    (
      key:
        TmminRawSoKey
    ): string[] => {
      const search =
        getTmminRawSoSearchValue(
          key
        )
          .trim()
          .toLocaleLowerCase(
            'id'
          );

      const options =
        getTmminRawSoColumnOptions(
          key
        );

      if (search === '') {
        return options;
      }

      return options.filter(
        (option) => matchesFilterOptionSearch(key, option, search)
      );
    };

  const toggleTmminRawSoFilter =
    (
      key:
        TmminRawSoKey,
      value:
        string
    ) => {
      const selected = [
        ...getTmminRawSoSelectedValues(
          key
        )
      ];

      const index =
        selected.indexOf(
          value
        );

      if (index < 0) {
        selected.push(
          value
        );
      } else {
        selected.splice(
          index,
          1
        );
      }

      tmminRawSoSelectedFilters
        .value[
        key
      ] =
        selected;
    };

  const toggleAllTmminRawSoColumn =
    (
      key:
        TmminRawSoKey
    ) => {
      const options =
        getTmminRawSoFilteredColumnOptions(
          key
        );

      const selected =
        getTmminRawSoSelectedValues(
          key
        );

      const allSelected =
        options.length > 0 &&
        options.every(
          (option) =>
            selected.includes(
              option
            )
        );

      tmminRawSoSelectedFilters
        .value[
        key
      ] =
        allSelected
          ? []
          : [...options];
    };

  const clearTmminRawSoColumnFilter =
    (
      key:
        TmminRawSoKey
    ) => {
      tmminRawSoSelectedFilters
        .value[
        key
      ] =
        [];

      tmminRawSoSearchFilters
        .value[
        key
      ] =
        '';
    };

  const isAllTmminRawSoSelected =
    (
      key:
        TmminRawSoKey
    ): boolean => {
      const options =
        getTmminRawSoFilteredColumnOptions(
          key
        );

      const selected =
        getTmminRawSoSelectedValues(
          key
        );

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

  const isTmminRawSoFilterSelected =
    (
      key:
        TmminRawSoKey,
      value:
        string
    ): boolean => {
      return getTmminRawSoSelectedValues(
        key
      ).includes(
        value
      );
    };

  const getTmminRawSoSelectedLabel =
    (
      key:
        TmminRawSoKey
    ): string => {
      const selected =
        getTmminRawSoSelectedValues(
          key
        );

      return selected.length > 0
        ? `${selected.length} selected`
        : 'All';
    };

  const closeTmminRawSoFilter = () => {
    tmminRawSoColumns.forEach(
      (column) => {
        tmminRawSoOpenFilters
          .value[
          column.key
        ] =
          false;
      }
    );

    tmminRawSoActiveFilterKey
      .value =
      null;

    clearAnchoredFilterPopup();
  };

  const toggleTmminRawSoDropdown =
    async (
      key:
        TmminRawSoKey,
      event?:
        MouseEvent
    ) => {
      const isCurrentlyOpen =
        tmminRawSoActiveFilterKey
          .value ===
        key;

      closeAllPopups();

      if (isCurrentlyOpen) {
        return;
      }

      const trigger =
        event
          ?.currentTarget as
        HTMLElement |
        null;

      if (!trigger) {
        return;
      }

      setAnchoredFilterPopup(
        trigger,
        (anchor) => {
          tmminRawSoFilterPopupPosition.value =
            getSafeRawFilterPopupPosition(anchor);
        }
      );

      tmminRawSoActiveFilterKey
        .value =
        key;

      tmminRawSoOpenFilters
        .value[
        key
      ] =
        true;
    };

  const setTmminRawSoSort =
    (
      key:
        TmminRawSoKey,
      direction:
        SortDirection
    ) => {
      tmminRawSoSortColumn
        .value =
        direction ===
          'none'
          ? null
          : key;

      tmminRawSoSortDirection
        .value =
        direction;

      tmminRawSoCurrentPage.value = 1;
      if (rawServerPaged['TMMIN']) {
        void fetchTmminRawSoData(false);
      }
    };

  const isTmminRawSoSortActive =
    (
      key:
        TmminRawSoKey,
      direction:
        'asc' |
        'desc'
    ): boolean => {
      return (
        tmminRawSoSortColumn
          .value ===
        key &&
        tmminRawSoSortDirection
          .value ===
        direction
      );
    };

  const isTmminRawSoNoSortActive =
    (
      key:
        TmminRawSoKey
    ): boolean => {
      return (
        tmminRawSoSortColumn
          .value !==
        key ||
        tmminRawSoSortDirection
          .value ===
        'none'
      );
    };

  const tmminRawSoFilteredRows =
    computed(() => {
      return getRowsMatchingOtherColumnFilters(
        tmminRawSoData.value,
        tmminRawSoVisibleColumns.value,
        tmminRawSoSelectedFilters.value,
        null,
        (row, key) => row[key]
      );
    });

  const tmminRawSoSortedRows =
    computed(() => {
      const rows = [
        ...tmminRawSoFilteredRows
          .value
      ];

      const key =
        tmminRawSoSortColumn
          .value;

      if (
        key === null ||
        tmminRawSoSortDirection
          .value ===
        'none'
      ) {
        return rows;
      }

      rows.sort(
        (
          a,
          b
        ) => {
          const first =
            String(
              a[key] ??
              ''
            );

          const second =
            String(
              b[key] ??
              ''
            );

          const compare =
            first.localeCompare(
              second,
              'id',
              {
                numeric: true
              }
            );

          return (
            tmminRawSoSortDirection
              .value ===
              'asc'
              ? compare
              : -compare
          );
        }
      );

      return rows;
    });

  const tmminRawSoTotalPages = computed(() => {
    const totalRows = rawServerPaged['TMMIN']
      ? rawServerTotals['TMMIN']
      : tmminRawSoSortedRows.value.length;
    return Math.max(1, Math.ceil(totalRows / tmminRawSoRowsPerPage.value));
  });

  const tmminRawSoVisiblePages =
    computed(() => {
      const max = 5;
      const pages: number[] = [];

      let start = Math.max(
        1,
        tmminRawSoCurrentPage.value -
        Math.floor(max / 2)
      );

      let end = Math.min(
        tmminRawSoTotalPages.value,
        start + max - 1
      );

      if (
        end - start <
        max - 1
      ) {
        start = Math.max(
          1,
          end - max + 1
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

  const tmminRawSoPaginatedRows = computed(() => {
    if (rawServerPaged['TMMIN']) {
      return tmminRawSoSortedRows.value;
    }
    const start = (tmminRawSoCurrentPage.value - 1) * tmminRawSoRowsPerPage.value;
    return tmminRawSoSortedRows.value.slice(start, start + tmminRawSoRowsPerPage.value);
  });

  const tmminRawSoShowingStart = computed(() => {
    const totalRows = rawServerPaged['TMMIN']
      ? rawServerTotals['TMMIN']
      : tmminRawSoSortedRows.value.length;
    return totalRows === 0 ? 0 : (tmminRawSoCurrentPage.value - 1) * tmminRawSoRowsPerPage.value + 1;
  });

  const tmminRawSoShowingEnd = computed(() => {
    const totalRows = rawServerPaged['TMMIN']
      ? rawServerTotals['TMMIN']
      : tmminRawSoSortedRows.value.length;
    return Math.min(tmminRawSoCurrentPage.value * tmminRawSoRowsPerPage.value, totalRows);
  });

  const tmminRawSoFirstPage = () => {
    tmminRawSoCurrentPage.value = 1;
  };

  const tmminRawSoPrevPage = () => {
    if (
      tmminRawSoCurrentPage.value >
      1
    ) {
      tmminRawSoCurrentPage.value--;
    }
  };

  const tmminRawSoNextPage = () => {
    if (
      tmminRawSoCurrentPage.value <
      tmminRawSoTotalPages.value
    ) {
      tmminRawSoCurrentPage.value++;
    }
  };

  const tmminRawSoLastPage = () => {
    tmminRawSoCurrentPage.value =
      tmminRawSoTotalPages.value;
  };

  const clearTmminRawSoFilters = () => {
    tmminRawSoSelectedFilters.value = {};
    tmminRawSoSearchFilters.value = {};
    tmminRawSoSortColumn.value = null;
    tmminRawSoSortDirection.value = 'none';
    closeTmminRawSoFilter();
    tmminRawSoCurrentPage.value = 1;
  };

  const openTmminRawSoPreview = (
    rows?: TmminRawSoRow[]
  ) => {
    tmminRawSoPreviewRows.value =
      rows !== undefined
        ? [...rows]
        : [...tmminRawSoData.value];

    showTmminRawSoPreview.value = true;
  };

  const closeTmminRawSoPreview = () => {
    showTmminRawSoPreview.value = false;
  };

  watch(
    tmminRawSoSelectedFilters,
    () => {
      tmminRawSoCurrentPage.value = 1;
    },
    {
      deep: true
    }
  );

  watch(tmminRawSoRowsPerPage, () => {
    if (rawServerPaged['TMMIN']) {
      if (tmminRawSoCurrentPage.value !== 1) tmminRawSoCurrentPage.value = 1;
      else void fetchTmminRawSoData(false);
      return;
    }
    tmminRawSoCurrentPage.value = 1;
  });

  watch(tmminRawSoCurrentPage, (page, previous) => {
    if (rawServerPaged['TMMIN'] && page !== previous && !isLoadingRawData.value) {
      void fetchTmminRawSoData(false);
    }
  });

  watch(
    tmminRawSoTotalPages,
    (total) => {
      if (
        tmminRawSoCurrentPage
          .value >
        total
      ) {
        tmminRawSoCurrentPage.value =
          total;
      }
    }
  );


  // ========================================================
  // RAW SALES ORDER DCWA - SAME UploadSo STORE
  // ========================================================
  // DCWA mengikuti pola state/action Raw SO yang sudah ada di UploadSo store.
  // Tidak membuat Pinia store atau namespace object baru.
  type DcwaRawSoColumn = TableColumn<DcwaRawSoKey> & {
    letter: string;
    number: number;
  };

  const dcwaRawSoColumns: DcwaRawSoColumn[] = [
    { key: 'supplierCode', letter: 'A', number: 1, label: 'Supplier Code', width: '130px' },
    { key: 'supplierName', letter: 'B', number: 2, label: 'Supplier Name', width: '235px' },
    { key: 'destination', letter: 'C', number: 3, label: 'Destination', width: '125px' },
    { key: 'vanning', letter: 'D', number: 4, label: 'Vanning', width: '145px' },
    { key: 'week', letter: 'E', number: 5, label: 'Week', width: '80px' },
    { key: 'cycle', letter: 'F', number: 6, label: 'Cycle', width: '80px' },
    { key: 'orderDate', letter: 'G', number: 7, label: 'Order Date', width: '110px' },
    { key: 'dnSeq', letter: 'H', number: 8, label: 'DN Seq', width: '90px' },
    { key: 'dnNo', letter: 'I', number: 9, label: 'DN No', width: '170px' },
    { key: 'partNo', letter: 'J', number: 10, label: 'Part No', width: '165px' },
    { key: 'partName', letter: 'K', number: 11, label: 'Part Name', width: '300px' },
    { key: 'boxType', letter: 'L', number: 12, label: 'Box Type', width: '120px' },
    { key: 'qtyPerBox', letter: 'M', number: 13, label: 'Qty/Box', width: '90px' },
    { key: 'totalBox', letter: 'N', number: 14, label: 'Total Box', width: '95px' },
    { key: 'orderQty', letter: 'O', number: 15, label: 'Order Qty', width: '100px' },
    { key: 'boxPerMdl', letter: 'P', number: 16, label: 'Box/Mdl', width: '90px' },
    { key: 'module', letter: 'Q', number: 17, label: 'Module', width: '95px' },
    { key: 'moduleNumber', letter: 'R', number: 18, label: 'Module_Number', width: '165px' },
    { key: 'truckNo', letter: 'S', number: 19, label: 'Truck No', width: '175px' },
    { key: 'containerNo', letter: 'T', number: 20, label: 'Container No', width: '165px' },
    { key: 'periode', letter: 'U', number: 21, label: 'Periode', width: '90px' },
    { key: 'etd', letter: 'V', number: 22, label: 'ETD', width: '105px' },
    { key: 'container', letter: 'W', number: 23, label: 'Container', width: '105px' },
    { key: 'poNumber', letter: 'X', number: 24, label: 'PO', width: '125px' },
    { key: 'jobNumber', letter: 'Y', number: 25, label: 'JOB Number', width: '125px' },
    { key: 'orderType', letter: '', number: 26, label: 'Order Type', width: '135px' },
    { key: 'createdAt', letter: '', number: 27, label: 'Created At', width: '160px' }
  ];

  const dcwaRawSoPreviewColumns = computed(() =>
    dcwaRawSoColumns.filter((column) => column.key !== 'createdAt')
  );

  const dcwaRawSoPreviewRows = ref<DcwaRawSoRow[]>([]);
  const dcwaRawSoPreviewSummary = ref<DcwaRawSoPreviewSummary | null>(null);
  const dcwaRawSoPreviewErrors = ref<string[]>([]);
  const dcwaRawSoAvailablePeriods = ref<Array<{ period: string; label: string; count: number }>>([]);
  const dcwaRawSoCanSubmitPreview = ref(false);
  const showDcwaRawSoPreview = ref(false);

  const dcwaRawSoData = ref<DcwaRawSoRow[]>([]);
  const isLoadingDcwaRawSo = ref(false);
  let dcwaRawSoFetchSerial = 0;
  const dcwaRawSoSelectedIds = ref<number[]>([]);
  const isDownloadingDcwaRawSo = ref(false);

  const dcwaRawSoSelectedFilters = ref<Partial<Record<DcwaRawSoKey, string[]>>>({});
  const dcwaRawSoSearchFilters = ref<Partial<Record<DcwaRawSoKey, string>>>({});
  const dcwaRawSoOpenFilters = ref<Partial<Record<DcwaRawSoKey, boolean>>>({});
  const dcwaRawSoActiveFilterKey = ref<DcwaRawSoKey | null>(null);
  const dcwaRawSoFilterPopupPosition = ref({ top: 0, left: 0, maxHeight: 320 });
  const dcwaRawSoSortKey = ref<DcwaRawSoKey | null>(null);
  const dcwaRawSoSortDirection = ref<SortDirection>('none');
  const dcwaRawSoCurrentPage = ref(1);
  const dcwaRawSoRowsPerPage = ref(10);
  const dcwaRawSoRowsPerPageOptions = [10, 20, 50, 100];

  const dcwaSoUploadFileLabel = computed(() => {
    const files = dcwaSoUploadFiles.value;
    if (files.length === 0) return '';
    const excel = files.filter((file) => /\.xlsx?$/i.test(file.name)).length;
    const pdf = files.filter((file) => /\.pdf$/i.test(file.name)).length;
    return `${excel} Excel + ${pdf} PDF selected`;
  });

  const dcwaSoHasRequiredFileTypes = computed(() => {
    const hasPdf = dcwaSoUploadFiles.value.some((file) => /\.pdf$/i.test(file.name));
    return hasPdf;
  });

  const mapDcwaRawSoRowFromBackend = (row: DcwaRawSoBackendRow): DcwaRawSoRow => ({
    id: Number(row.id ?? 0),
    uploadBatchId: String(row.upload_batch_id ?? ''),
    sourceFile: String(row.source_file ?? ''),
    sourceRow: Number(row.source_row ?? 0),
    uploadedBy: String(row.uploaded_by ?? ''),
    createdAt: String(row.created_at ?? ''),
    poMatchStatus: String(row.po_match_status ?? (row.po_number ? 'MATCHED' : '')),
    jobMatchStatus: String(row.job_match_status ?? (row.job_number ? 'MATCHED' : '')),
    supplierCode: String(row.supplier_code ?? ''),
    supplierName: String(row.supplier_name ?? ''),
    destination: String(row.destination ?? ''),
    vanning: String(row.vanning ?? ''),
    week: String(row.week_value ?? ''),
    cycle: String(row.cycle ?? ''),
    orderDate: String(row.order_date ?? ''),
    dnSeq: String(row.dn_seq ?? ''),
    dnNo: String(row.dn_no ?? ''),
    partNo: String(row.part_no ?? ''),
    partName: String(row.part_name ?? ''),
    boxType: String(row.box_type ?? ''),
    qtyPerBox: String(row.qty_per_box ?? ''),
    totalBox: String(row.total_box ?? ''),
    orderQty: String(row.order_qty ?? ''),
    boxPerMdl: String(row.box_per_mdl ?? ''),
    module: String(row.module ?? ''),
    moduleNumber: String(row.module_number ?? ''),
    truckNo: String(row.truck_no ?? ''),
    containerNo: String(row.container_no ?? ''),
    periode: String(row.periode ?? ''),
    etd: String(row.etd ?? ''),
    container: String(row.container ?? ''),
    poNumber: String(row.po_number ?? ''),
    jobNumber: String(row.job_number ?? ''),
    orderType: String(row.order_type ?? 'REGULAR')
  });

  const buildDcwaRawSoFormData = (period: string, uploadBy = ''): FormData => {
    const formData = new FormData();
    dcwaSoUploadFiles.value.forEach((file) => formData.append('files[]', file));
    formData.append('customer', 'DCWA');
    formData.append('upload_period', period);
    if (uploadBy.trim() !== '') formData.append('upload_by', uploadBy.trim());
    return formData;
  };

  const addDcwaSoUploadFiles = (files: File[]) => {
    const invalid = files.find((file) => !/\.(xlsx|xls|pdf)$/i.test(file.name));
    if (invalid) {
      notificationStore.showAlertWarning(
        `File ${invalid.name} harus berformat XLSX, XLS, atau PDF.`
      );
      return false;
    }

    const existing = new Map<string, File>();
    dcwaSoUploadFiles.value.forEach((file) =>
      existing.set(`${file.name}::${file.size}::${file.lastModified}`, file)
    );
    files.forEach((file) =>
      existing.set(`${file.name}::${file.size}::${file.lastModified}`, file)
    );

    const candidateFiles = [...existing.values()];
    if (!validateSoUploadBudget(
      candidateFiles,
      'DCWA',
      DCWA_SO_MAX_UPLOAD_FILES,
      SO_MAX_MULTI_UPLOAD_BYTES,
      (file) => /\.pdf$/i.test(file.name)
        ? SO_MAX_PDF_FILE_BYTES
        : SO_MAX_SPREADSHEET_FILE_BYTES
    )) {
      return false;
    }

    dcwaSoUploadFiles.value = candidateFiles;
    resetDcwaRawSoPreview();
    return true;
  };


  const removeDcwaSoUploadFile = (index: number) => {
    if (index < 0 || index >= dcwaSoUploadFiles.value.length) {
      return;
    }

    dcwaSoUploadFiles.value.splice(index, 1);
    resetUploadSessionState(false);
    uploadFiles.value = dcwaSoUploadFiles.value[0] ?? null;
    uploadFileName.value = dcwaSoUploadFileLabel.value;
    resetUploadDeliveryPeriodDetection();
    resetDcwaRawSoPreview();

    if (dcwaSoHasRequiredFileTypes.value) {
      void analyzeDcwaUploadPeriods(false);
    }
  };

  const clearDcwaSoUploadFiles = () => {
    dcwaSoUploadFiles.value = [];
    resetUploadSessionState(false);
    uploadFiles.value = null;
    uploadFileName.value = '';
    resetUploadDeliveryPeriodDetection();
    resetDcwaRawSoPreview();
  };

  const resetDcwaRawSoPreview = () => {
    dcwaRawSoPreviewRows.value = [];
    dcwaRawSoPreviewSummary.value = null;
    dcwaRawSoPreviewErrors.value = [];
    dcwaRawSoAvailablePeriods.value = [];
    dcwaRawSoCanSubmitPreview.value = false;
    showDcwaRawSoPreview.value = false;
  };

  const closeDcwaRawSoPreview = () => {
    showDcwaRawSoPreview.value = false;
  };

  const previewDcwaRawSo = async (period: string, open = true): Promise<boolean> => {
    if (!dcwaSoHasRequiredFileTypes.value) {
      notificationStore.showAlertWarning(
        'DCWA wajib memilih PDF. Regular memakai Excel + PDF; Special Order dapat memakai PDF saja.'
      );
      return false;
    }

    if (isPreviewLoading.value) return false;

    try {
      isPreviewLoading.value = true;
      const response = await customerOrderService.previewDcwaRawSo(
        buildDcwaRawSoFormData(period)
      );

      if (response.status !== 'success') {
        throw new Error(response.message || 'Preview DCWA gagal.');
      }

      dcwaRawSoPreviewRows.value = Array.isArray(response.preview_data)
        ? response.preview_data.map(mapDcwaRawSoRowFromBackend)
        : [];
      dcwaRawSoPreviewSummary.value = response.preview_summary ?? null;
      dcwaRawSoPreviewErrors.value = Array.isArray(response.validation_errors)
        ? response.validation_errors.map(String)
        : [];
      dcwaRawSoAvailablePeriods.value = Array.isArray(response.available_periods)
        ? response.available_periods
        : [];
      dcwaRawSoCanSubmitPreview.value = Boolean(response.can_submit);
      if (open) {
        showDcwaRawSoPreview.value = true;
        await validateDcwaPreviewContract();
      }

      if (!dcwaRawSoCanSubmitPreview.value && dcwaRawSoPreviewErrors.value.length > 0) {
        notificationStore.showAlertWarning(
          dcwaRawSoPreviewErrors.value[0] || 'Masih ada PO/JOB Number DCWA yang belum valid.'
        );
      }

      return true;
    } catch (error: any) {
      console.error('Preview Raw SO DCWA gagal:', error);
      dcwaRawSoPreviewRows.value = [];
      dcwaRawSoPreviewSummary.value = null;
      dcwaRawSoPreviewErrors.value = [];
      dcwaRawSoCanSubmitPreview.value = false;
      notificationStore.showAlertError(
        error?.response?.data?.message || error?.message || 'Preview Raw SO DCWA gagal.'
      );
      return false;
    } finally {
      isPreviewLoading.value = false;
    }
  };

  const uploadDcwaRawSo = async (period: string, uploadBy: string) => {
    if (!dcwaSoHasRequiredFileTypes.value) {
      throw new Error('DCWA wajib memilih minimal satu PDF Delivery Note.');
    }
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) {
      throw new Error('Pilih periode DCWA terlebih dahulu.');
    }
    if (uploadBy.trim() === '') {
      throw new Error('Upload By wajib dipilih.');
    }

    try {
      isUploading.value = true;
      const response = await customerOrderService.uploadDcwaRawSo(
        buildDcwaRawSoFormData(period, uploadBy)
      );

      if (response.status === 'error') {
        throw new Error(response.message || 'Upload DCWA gagal.');
      }

      if (response.status === 'warning') {
        notificationStore.showAlertWarning(response.message || 'Upload DCWA selesai dengan peringatan.');
      } else {
        notificationStore.showAlertSuccess(
          response.message || `Raw + Format Sales Order DCWA berhasil diupload (${response.total_insert ?? 0} raw / ${response.format_total ?? 0} format).`
        );
      }

      return response;
    } finally {
      isUploading.value = false;
    }
  };

  const analyzeDcwaUploadPeriods = async (
    openChoice = false
  ): Promise<boolean> => {
    if (!dcwaSoHasRequiredFileTypes.value) {
      resetUploadDeliveryPeriodDetection();
      return false;
    }

    if (isAnalyzingUploadPeriods.value) {
      return false;
    }

    try {
      isAnalyzingUploadPeriods.value = true;

      const response =
        await customerOrderService.previewDcwaRawSo(
          buildDcwaRawSoFormData('')
        );

      if (response.status !== 'success') {
        throw new Error(
          response.message ||
          'Gagal mendeteksi periode Raw Sales Order DCWA.'
        );
      }

      const options =
        normalizeUploadDeliveryPeriodOptions(
          response.available_periods
        );

      dcwaRawSoAvailablePeriods.value = options;
      setDetectedUploadPeriods(options, openChoice);

      return options.length > 0;
    } catch (error: any) {
      console.error('Deteksi periode Raw SO DCWA gagal:', error);
      notificationStore.showAlertError(
        error?.response?.data?.message ||
        error?.message ||
        'Gagal mendeteksi periode Raw Sales Order DCWA.'
      );
      return false;
    } finally {
      isAnalyzingUploadPeriods.value = false;
    }
  };

  const isDcwaRawSoNumericColumn = (key: DcwaRawSoKey): boolean => {
    return [
      'qtyPerBox',
      'totalBox',
      'orderQty',
      'boxPerMdl'
    ].includes(key);
  };

  const isDcwaRawSoValidationColumn = (key: DcwaRawSoKey): boolean => {
    return key === 'poNumber' || key === 'jobNumber';
  };

  const isDcwaRawSoValidationMissing = (
    row: DcwaRawSoRow,
    key: DcwaRawSoKey
  ): boolean => {
    if (key === 'poNumber') {
      return row.poMatchStatus.toUpperCase() !== 'MATCHED';
    }

    if (key === 'jobNumber') {
      return row.jobMatchStatus.toUpperCase() !== 'MATCHED';
    }

    return false;
  };

  const fetchDcwaRawSoData = async (params: FilterParams = {}, resetPage = true) => {
    const requestSerial = ++dcwaRawSoFetchSerial;
    try {
      isLoadingDcwaRawSo.value = true;
      isLoadingRawData.value = true;
      if (resetPage) dcwaRawSoCurrentPage.value = 1;
      const effectiveParams = Object.keys(params).length > 0 ? params : getDateOnlyFilterParams();
      if (rawServerPaged['DCWA']) {
        await loadRawServerPage<DcwaRawSoBackendRow>('DCWA', effectiveParams, dcwaRawSoCurrentPage.value, dcwaRawSoRowsPerPage.value, (rows) => {
          dcwaRawSoData.value = rows.map(mapDcwaRawSoRowFromBackend);
        }, { filters: buildRawServerFiltersForMode('dcwa'), sortKey: String(dcwaRawSoSortKey.value ?? ''), sortDirection: dcwaRawSoSortDirection.value });
      } else {
        const rows = await customerOrderService.getDcwaRawSo(effectiveParams);
        if (requestSerial !== dcwaRawSoFetchSerial) return;
        dcwaRawSoData.value = rows.map(mapDcwaRawSoRowFromBackend);
        rawServerTotals['DCWA'] = dcwaRawSoData.value.length;
      }

      if (requestSerial !== dcwaRawSoFetchSerial) return;
      dcwaRawSoSelectedIds.value = [];
      refreshLatestAvailableFilterDates();
    } catch (error: any) {
      if (requestSerial !== dcwaRawSoFetchSerial) return;
      const cancelled =
        error?.code === 'ERR_CANCELED' ||
        error?.name === 'CanceledError' ||
        error?.name === 'AbortError';
      if (cancelled) return;

      console.error('Get Raw SO DCWA gagal:', error);
      dcwaRawSoData.value = [];
      notificationStore.showAlertError(
        error?.response?.data?.message || error?.message || 'Gagal mengambil Raw Sales Order DCWA.'
      );
    } finally {
      if (requestSerial === dcwaRawSoFetchSerial) {
        isLoadingDcwaRawSo.value = false;
        isLoadingRawData.value = false;
      }
    }
  };

  const getDcwaRawSoColumnOptions = (key: DcwaRawSoKey): string[] =>
    sortFilterOptions(Array.from(new Set(
      getRowsMatchingOtherColumnFilters(
        dcwaRawSoData.value,
        dcwaRawSoColumns,
        dcwaRawSoSelectedFilters.value,
        key,
        (row, columnKey) => row[columnKey]
      ).map((row) => normalizeFilterOption(row[key]))
    )));

  const getDcwaRawSoSelectedValues = (key: DcwaRawSoKey): string[] =>
    dcwaRawSoSelectedFilters.value[key] ?? [];

  const getDcwaRawSoSearchValue = (key: DcwaRawSoKey): string => dcwaRawSoSearchFilters.value[key] ?? '';

  const setDcwaRawSoSearchValue = (key: DcwaRawSoKey, value: string) => {
    dcwaRawSoSearchFilters.value[key] = String(value ?? '');
  };

  const getDcwaRawSoFilteredColumnOptions = (key: DcwaRawSoKey): string[] => {
    const search = getDcwaRawSoSearchValue(key).trim().toLocaleLowerCase('id');
    const options = getDcwaRawSoColumnOptions(key);
    if (search === '') return options;
    return options.filter((option) => matchesFilterOptionSearch(key, option, search));
  };

  const toggleDcwaRawSoFilter = (key: DcwaRawSoKey, value: string) => {
    const selected = [...getDcwaRawSoSelectedValues(key)];
    const index = selected.indexOf(value);
    if (index >= 0) selected.splice(index, 1);
    else selected.push(value);
    dcwaRawSoSelectedFilters.value[key] = selected;
  };

  const toggleAllDcwaRawSoColumn = (key: DcwaRawSoKey) => {
    const options = getDcwaRawSoFilteredColumnOptions(key);
    const selected = getDcwaRawSoSelectedValues(key);
    const all = options.length > 0 && options.every((value) => selected.includes(value));
    dcwaRawSoSelectedFilters.value[key] = all ? [] : [...options];
  };

  const clearDcwaRawSoColumnFilter = (key: DcwaRawSoKey) => {
    dcwaRawSoSelectedFilters.value[key] = [];
    dcwaRawSoSearchFilters.value[key] = '';
  };

  const isAllDcwaRawSoSelected = (key: DcwaRawSoKey): boolean => {
    const options = getDcwaRawSoFilteredColumnOptions(key);
    const selected = getDcwaRawSoSelectedValues(key);
    return options.length > 0 && options.every((value) => selected.includes(value));
  };

  const isDcwaRawSoFilterSelected = (key: DcwaRawSoKey, value: string): boolean =>
    getDcwaRawSoSelectedValues(key).includes(value);

  const dcwaRawSoFilteredRows = computed(() =>
    getRowsMatchingOtherColumnFilters(
      dcwaRawSoData.value,
      dcwaRawSoColumns,
      dcwaRawSoSelectedFilters.value,
      null,
      (row, key) => row[key]
    )
  );

  const dcwaRawSoSortedRows = computed(() => {
    const rows = [...dcwaRawSoFilteredRows.value];
    const key = dcwaRawSoSortKey.value;
    const direction = dcwaRawSoSortDirection.value;
    if (!key || direction === 'none') return rows;

    rows.sort((first, second) => {
      const left = String(first[key] ?? '');
      const right = String(second[key] ?? '');
      const compare = left.localeCompare(right, 'id', { numeric: true });
      return direction === 'asc' ? compare : -compare;
    });
    return rows;
  });

  const dcwaRawSoTotalPages = computed(() => {
    const totalRows = rawServerPaged['DCWA'] ? rawServerTotals['DCWA'] : dcwaRawSoSortedRows.value.length;
    return Math.max(1, Math.ceil(totalRows / dcwaRawSoRowsPerPage.value));
  });

  const dcwaRawSoPaginatedRows = computed(() => {
    if (rawServerPaged['DCWA']) return dcwaRawSoSortedRows.value;
    const start = (dcwaRawSoCurrentPage.value - 1) * dcwaRawSoRowsPerPage.value;
    return dcwaRawSoSortedRows.value.slice(start, start + dcwaRawSoRowsPerPage.value);
  });

  const dcwaRawSoVisiblePages = computed(() => {
    const start = Math.max(1, Math.min(dcwaRawSoCurrentPage.value - 2, dcwaRawSoTotalPages.value - 4));
    const end = Math.min(dcwaRawSoTotalPages.value, start + 4);
    const pages: number[] = [];
    for (let page = Math.max(1, start); page <= end; page++) pages.push(page);
    return pages;
  });

  const dcwaRawSoShowingStart = computed(() => {
    const totalRows = rawServerPaged['DCWA'] ? rawServerTotals['DCWA'] : dcwaRawSoSortedRows.value.length;
    return totalRows === 0 ? 0 : (dcwaRawSoCurrentPage.value - 1) * dcwaRawSoRowsPerPage.value + 1;
  });
  const dcwaRawSoShowingEnd = computed(() => {
    const totalRows = rawServerPaged['DCWA'] ? rawServerTotals['DCWA'] : dcwaRawSoSortedRows.value.length;
    return Math.min(dcwaRawSoCurrentPage.value * dcwaRawSoRowsPerPage.value, totalRows);
  });

  const dcwaRawSoTableWidth = computed(() => {
    const width = dcwaRawSoColumns.reduce((sum, column) => sum + Number.parseInt(column.width || '120', 10), 0);
    return `${width + 48}px`;
  });

  const dcwaRawSoPreviewTableWidth = computed(() => {
    const width = dcwaRawSoPreviewColumns.value.reduce(
      (sum, column) => sum + Number.parseInt(column.width || '120', 10),
      0
    );
    return `${width}px`;
  });

  const DCWA_RAW_SO_FROZEN_KEYS: DcwaRawSoKey[] = ['supplierCode', 'supplierName', 'destination'];

  const getDcwaRawSoColumnStyle = (
    key: DcwaRawSoKey,
    isHeader = false,
    rowIndex = 0,
    isPreview = false
  ): CSSProperties => {
    const targetColumns = isPreview ? dcwaRawSoPreviewColumns.value : dcwaRawSoColumns;
    const column = targetColumns.find((item) => item.key === key);
    const width = column?.width ?? '120px';
    const backgroundColor = isHeader ? '#eff6ff' : rowIndex % 2 === 0 ? '#ffffff' : '#f8fafc';
    const base: CSSProperties = {
      minWidth: width,
      width,
      maxWidth: width,
      boxSizing: 'border-box',
      backgroundColor,
      boxShadow: 'inset -1px 0 0 #e2e8f0, inset 0 -1px 0 #e2e8f0'
    };

    if (!DCWA_RAW_SO_FROZEN_KEYS.includes(key)) {
      return { ...base, position: 'relative', zIndex: isHeader ? 301 : 1 };
    }

    const index = targetColumns.findIndex((item) => item.key === key);
    const leading = isPreview ? 0 : 48;
    const left = leading + targetColumns.slice(0, Math.max(0, index))
      .reduce((sum, item) => sum + Number.parseInt(item.width || '120', 10), 0);

    return {
      ...base,
      position: 'sticky',
      left: `${left}px`,
      zIndex: isHeader ? 700 : 80,
      transform: 'translateZ(0)'
    };
  };

  const toggleDcwaRawSoDropdown = async (key: DcwaRawSoKey, event?: MouseEvent) => {
    const wasOpen = dcwaRawSoOpenFilters.value[key] === true;

    // Ikuti global popup controller UploadSo: hanya satu popup aktif.
    closeAllPopups();

    if (wasOpen) {
      return;
    }

    const trigger = event?.currentTarget as HTMLElement | null;

    if (!trigger) {
      return;
    }

    setAnchoredFilterPopup(
      trigger,
      (anchor) => {
        dcwaRawSoFilterPopupPosition.value =
          getSafeRawFilterPopupPosition(anchor, 320, 320);
      }
    );

    dcwaRawSoOpenFilters.value[key] = true;
    dcwaRawSoActiveFilterKey.value = key;
  };

  const closeDcwaRawSoFilter = () => {
    dcwaRawSoOpenFilters.value = {};
    dcwaRawSoActiveFilterKey.value = null;
    clearAnchoredFilterPopup();
  };

  const setDcwaRawSoSort = (key: DcwaRawSoKey, direction: SortDirection) => {
    dcwaRawSoSortKey.value = direction === 'none' ? null : key;
    dcwaRawSoSortDirection.value = direction;
    dcwaRawSoCurrentPage.value = 1;
    if (rawServerPaged['DCWA']) void fetchDcwaRawSoData(getDateOnlyFilterParams(), false);
  };

  const isDcwaRawSoSortActive = (key: DcwaRawSoKey, direction: 'asc' | 'desc') =>
    dcwaRawSoSortKey.value === key && dcwaRawSoSortDirection.value === direction;
  const isDcwaRawSoNoSortActive = (key: DcwaRawSoKey) =>
    dcwaRawSoSortKey.value !== key || dcwaRawSoSortDirection.value === 'none';

  const getDcwaRawSoSelectedLabel = (key: DcwaRawSoKey): string => {
    const values = dcwaRawSoSelectedFilters.value[key] ?? [];
    return values.length === 0 ? 'All' : values.length === 1 ? values[0] : `${values.length} selected`;
  };

  const toggleDcwaRawSoSelection = (id: number) => {
    const value = Number(id);
    if (!value) return;
    const index = dcwaRawSoSelectedIds.value.indexOf(value);
    if (index >= 0) dcwaRawSoSelectedIds.value.splice(index, 1);
    else dcwaRawSoSelectedIds.value.push(value);
  };

  const dcwaRawSoCurrentPageIds = computed(() =>
    dcwaRawSoPaginatedRows.value.map((row) => Number(row.id)).filter((id) => id > 0)
  );

  const isAllCurrentPageDcwaRawSoSelected = computed(() =>
    dcwaRawSoCurrentPageIds.value.length > 0 && dcwaRawSoCurrentPageIds.value.every((id) => dcwaRawSoSelectedIds.value.includes(id))
  );

  const toggleAllCurrentPageDcwaRawSo = () => {
    const ids = dcwaRawSoCurrentPageIds.value;
    const selected = new Set(dcwaRawSoSelectedIds.value);
    const shouldSelect = !ids.every((id) => selected.has(id));
    ids.forEach((id) => shouldSelect ? selected.add(id) : selected.delete(id));
    dcwaRawSoSelectedIds.value = [...selected];
  };

  const isDcwaRawSoSelected = (id: number): boolean => dcwaRawSoSelectedIds.value.includes(Number(id));

  const resolveDcwaRawSoDownloadDateScope = (rows: DcwaRawSoRow[]) => {
    const dates = rows.map((row) => row.orderDate).filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value)).sort();
    if (dates.length === 0) {
      return { allowed: false, message: 'Order Date DCWA tidak tersedia untuk scope download.', from: '', to: '' };
    }
    const from = dates[0];
    const to = dates[dates.length - 1];
    const diff = Math.floor((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000) + 1;
    if (diff > 31) {
      return { allowed: false, message: 'Download DCWA maksimal mencakup rentang Order Date 31 hari.', from: '', to: '' };
    }
    return { allowed: true, message: '', from, to };
  };

  const saveDcwaRawSoBlobResponse = (response: any, fallbackName: string) => {
    const disposition = String(response?.headers?.['content-disposition'] ?? '');
    const match = disposition.match(/filename\*?=(?:UTF-8''|\")?([^\";]+)/i);
    const fileName = match ? decodeURIComponent(match[1].replace(/\"/g, '').trim()) : fallbackName;
    const blob = response.data instanceof Blob ? response.data : new Blob([response.data]);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    return fileName;
  };

  const downloadDcwaRawSoRows = async (rows: DcwaRawSoRow[], selectedOnly = false) => {
    if (isDownloadingDcwaRawSo.value) return;
    if (rows.length === 0) {
      notificationStore.showAlertWarning('Tidak ada data DCWA yang dapat didownload.');
      return;
    }

    const dateScope = resolveDcwaRawSoDownloadDateScope(rows);
    if (!dateScope.allowed) {
      notificationStore.showAlertWarning(dateScope.message);
      return;
    }

    try {
      isDownloadingDcwaRawSo.value = true;
      const ids = rows.map((row) => Number(row.id)).filter((id) => id > 0);
      const response = await customerOrderService.downloadRawExcel({
        customer: 'DCWA',
        customers: ['DCWA'],
        from_date: dateScope.from,
        to_date: dateScope.to,
        raw_ids: ids,
        selected_only: selectedOnly,
        filters: {},
        sort_key: '',
        sort_direction: 'none'
      });

      const fileName = saveDcwaRawSoBlobResponse(response, `Raw_Files_DCWA_${Date.now()}.xlsx`);
      notificationStore.showAlertSuccess(`Raw Files DCWA berhasil di-download: ${fileName}`);
    } catch (error: any) {
      let message = 'Gagal mengunduh Raw Files DCWA.';
      const responseData = error?.response?.data;
      if (responseData instanceof Blob) {
        const text = await responseData.text();
        try { message = JSON.parse(text)?.message || message; } catch { if (text) message = text; }
      } else if (responseData?.message) {
        message = responseData.message;
      } else if (error?.message) {
        message = error.message;
      }
      notificationStore.showAlertError(message);
    } finally {
      isDownloadingDcwaRawSo.value = false;
    }
  };

  const downloadDcwaRawSoExcel = () => downloadDcwaRawSoRows(dcwaRawSoSortedRows.value, false);
  const downloadSelectedDcwaRawSoExcel = () => {
    const selected = new Set(dcwaRawSoSelectedIds.value);
    return downloadDcwaRawSoRows(dcwaRawSoData.value.filter((row) => selected.has(Number(row.id))), true);
  };

  const dcwaRawSoFirstPage = () => { dcwaRawSoCurrentPage.value = 1; };
  const dcwaRawSoPrevPage = () => { if (dcwaRawSoCurrentPage.value > 1) dcwaRawSoCurrentPage.value--; };
  const dcwaRawSoNextPage = () => { if (dcwaRawSoCurrentPage.value < dcwaRawSoTotalPages.value) dcwaRawSoCurrentPage.value++; };
  const dcwaRawSoLastPage = () => { dcwaRawSoCurrentPage.value = dcwaRawSoTotalPages.value; };

  watch(dcwaRawSoSelectedFilters, () => { dcwaRawSoCurrentPage.value = 1; }, { deep: true });
  watch(dcwaRawSoRowsPerPage, () => {
    if (rawServerPaged['DCWA']) {
      if (dcwaRawSoCurrentPage.value !== 1) dcwaRawSoCurrentPage.value = 1;
      else void fetchDcwaRawSoData(getDateOnlyFilterParams(), false);
      return;
    }
    dcwaRawSoCurrentPage.value = 1;
  });
  watch(dcwaRawSoCurrentPage, (page, previous) => {
    if (rawServerPaged['DCWA'] && page !== previous) {
      void fetchDcwaRawSoData(getDateOnlyFilterParams(), false);
    }
  });
  watch(dcwaRawSoTotalPages, (total) => { if (dcwaRawSoCurrentPage.value > total) dcwaRawSoCurrentPage.value = total; });

  const getActiveRawServerSource = (): RawServerSource => {
    if (isMesSoMode.value) return 'MES';
    if (isFtiSoMode.value) return 'FTI';
    if (isDpmSoMode.value) return 'DPM';
    if (isAsiAdmSoMode.value) return 'ASI ADM';
    if (isDcwaSoMode.value) return 'DCWA';
    if (isGayaSoMode.value) return 'GAYA MTR';
    if (isNtcSoMode.value) return 'NTC';
    if (isTmminSoMode.value) return 'TMMIN';
    return 'ADM';
  };

  const getActiveRawFilterMode = (): RawFilterMode => {
    if (isMesSoMode.value) return 'mes';
    if (isFtiSoMode.value) return 'fti';
    if (isDpmSoMode.value) return 'dpm';
    if (isAsiAdmSoMode.value) return 'asi';
    if (isDcwaSoMode.value) return 'dcwa';
    if (isGayaSoMode.value) return 'gaya';
    if (isNtcSoMode.value) return 'ntc';
    if (isTmminSoMode.value) return 'tmmin';
    return 'adm';
  };

  const buildRawFilteredLifecyclePayload = () => {
    const source = getActiveRawServerSource();
    const mode = getActiveRawFilterMode();
    return {
      mode: 'filtered' as const,
      customer: source === 'ADM' ? undefined : source,
      customers: source === 'ADM' ? [...selectedCustomers.value] : undefined,
      from_date: fromDate.value || undefined,
      to_date: resolveOptionalToDate(fromDate.value, toDate.value, maxOrderDate.value) || undefined,
      delivery_from_date: deliveryFromDate.value || undefined,
      delivery_to_date: resolveOptionalToDate(deliveryFromDate.value, deliveryToDate.value, maxDeliveryDate.value) || undefined,
      creation_from_date: creationFromDate.value || undefined,
      creation_to_date: resolveOptionalToDate(creationFromDate.value, creationToDate.value, todayDate.value) || undefined,
      filters: buildRawServerFiltersForMode(mode)
    };
  };

  /*
   * Advanced Excel-style filter/sort membutuhkan seluruh opsi kolom.
   * First load tetap server-page; dataset penuh baru dibaca saat user benar-benar
   * membuka filter/sort/bulk yang membutuhkan seluruh scope.
   */
  const fetchCard2Data =
    async (resetPage = true) => {

      // Refresh opsi Customer tidak boleh menahan first paint / load Raw.
      // Dropdown sudah mempunyai seed lokal dan refresh berjalan background.
      if (resetPage) {
        void loadCustomerOptions();
      }

      if (isMesSoMode.value) {
        card2Data.value = [];
        tmminRawSoData.value = [];
        ntcRawSoData.value = [];
        gayaRawSoData.value = [];
        asiAdmRawSoData.value = [];
        dcwaRawSoData.value = [];
        dpmRawSoData.value = [];
        ftiRawSoData.value = [];
        mesRawSoData.value = [];
        selectedRawIds.value = [];
        await fetchMesRawSoData(resetPage);
        return;
      }

      if (isFtiSoMode.value) {
        card2Data.value = [];
        tmminRawSoData.value = [];
        ntcRawSoData.value = [];
        gayaRawSoData.value = [];
        asiAdmRawSoData.value = [];
        dcwaRawSoData.value = [];
        dpmRawSoData.value = [];
        ftiRawSoData.value = [];
        selectedRawIds.value = [];
        await fetchFtiRawSoData(resetPage);
        return;
      }

      if (isDpmSoMode.value) {
        card2Data.value = [];
        tmminRawSoData.value = [];
        ntcRawSoData.value = [];
        gayaRawSoData.value = [];
        asiAdmRawSoData.value = [];
        dcwaRawSoData.value = [];
        selectedRawIds.value = [];
        await fetchDpmRawSoData(resetPage);
        return;
      }


      if (isAsiAdmSoMode.value) {
        card2Data.value = [];
        tmminRawSoData.value = [];
        ntcRawSoData.value = [];
        gayaRawSoData.value = [];
        dcwaRawSoData.value = [];
        selectedRawIds.value = [];
        await fetchAsiAdmRawSoData(resetPage);
        return;
      }

      if (isGayaSoMode.value) {
        card2Data.value = [];
        tmminRawSoData.value = [];
        ntcRawSoData.value = [];
        dcwaRawSoData.value = [];
        selectedRawIds.value = [];
        await fetchGayaRawSoData(resetPage);
        return;
      }

      if (isDcwaSoMode.value) {
        card2Data.value = [];
        tmminRawSoData.value = [];
        ntcRawSoData.value = [];
        gayaRawSoData.value = [];
        selectedRawIds.value = [];

        await fetchDcwaRawSoData(
          getDateOnlyFilterParams(),
          resetPage
        );

        return;
      }

      if (isNtcSoMode.value) {
        card2Data.value = [];
        tmminRawSoData.value = [];
        gayaRawSoData.value = [];
        dcwaRawSoData.value = [];
        selectedRawIds.value = [];

        await fetchNtcRawSoData(resetPage);

        return;
      }

      if (isTmminSoMode.value) {
        card2Data.value = [];
        ntcRawSoData.value = [];
        gayaRawSoData.value = [];
        dcwaRawSoData.value = [];
        selectedRawIds.value = [];

        await fetchTmminRawSoData(resetPage);

        return;
      }

      tmminRawSoData.value = [];
      ntcRawSoData.value = [];
      gayaRawSoData.value = [];
      asiAdmRawSoData.value = [];
      dcwaRawSoData.value = [];
      dpmRawSoData.value = [];
      ftiRawSoData.value = [];

      try {

        const selectedNormalized =
          selectedCustomers.value
            .map((customer) =>
              String(customer ?? '')
                .trim()
                .toUpperCase()
            );

        const allCustomersMode =
          selectedNormalized.length === 0;

        const admCustomers = selectedNormalized.filter((customer) =>
          ['ADM P1', 'ADM P4', 'ADM P5'].includes(customer)
        );
        const hasSpecialRawCustomer = selectedNormalized.some((customer) =>
          !['ADM P1', 'ADM P4', 'ADM P5'].includes(customer)
        );

        /*
         * All Customer dan scope ADM memakai true server-side pagination.
         * Pada pilihan multi-schema, tabel Raw hanya membaca subset ADM
         * secara server-side; customer dengan schema khusus dipilih satu-satu.
         */
        if (
          rawServerPaged.ADM &&
          (
            !hasSpecialRawCustomer ||
            (selectedNormalized.length > 1 && admCustomers.length > 0)
          )
        ) {
          if (resetPage) card2CurrentPage.value = 1;
          isLoadingRawData.value = true;
          try {
            const pageParams: FilterParams = {
              ...getDateOnlyFilterParams(),
              customer: admCustomers.join(',') || undefined
            };

            const pagePromise = loadRawServerPage<RawCustomerOrderBackendRow>(
              'ADM',
              pageParams,
              card2CurrentPage.value,
              card2RowsPerPage.value,
              (rows) => {
                const ordered = isAdmP1P4CombinedSelection()
                  ? sortRowsByLatestUploadBatch(rows)
                  : rows;
                card2Data.value = ordered.map(mapCard2RowFromBackend);
              },
              {
                filters: buildRawServerFiltersForMode('adm'),
                sortKey: card2SortColumn.value ?? '',
                sortDirection: card2SortDirection.value
              }
            );

            // Prioritaskan page pertama. Total download All Customer dihitung
            // setelah tabel sudah dapat dirender sehingga COUNT lintas source
            // tidak menahan first paint.
            await pagePromise;

            if (allCustomersMode) {
              void customerOrderService
                .getRawDownloadCount(getDateOnlyFilterParams())
                .then((rawDownloadCount) => {
                  rawDownloadAllCustomerRowCount.value =
                    Number(rawDownloadCount?.total ?? 0);
                })
                .catch((error) => {
                  console.error('Gagal memperbarui total Raw All Customer:', error);
                });
            }

            selectedRawIds.value = [];
            refreshLatestAvailableFilterDates();
            return;
          } finally {
            isLoadingRawData.value = false;
          }
        }

        if (
          selectedNormalized.length > 1 &&
          hasSpecialRawCustomer &&
          admCustomers.length === 0
        ) {
          /*
           * Jangan fallback ke full hydration saat beberapa customer dengan
           * schema Raw berbeda dipilih. Format SO / Tracking tetap boleh
           * multi-customer; untuk Raw user memilih satu customer khusus.
           */
          card2Data.value = [];
          rawServerTotals.ADM = 0;
          selectedRawIds.value = [];
          isLoadingRawData.value = false;
          return;
        }

        /*
         * Default / All Customer memakai layout Raw ADM, sehingga yang
         * ditampilkan hanya ADM P1, P4, dan P5 dari orderingadm_sap.
         * Raw customer dengan schema khusus baru dimuat ketika customer itu
         * benar-benar dipilih. Format SO dan Tracking tetap memuat semuanya
         * pada mode All Customer melalui loader masing-masing.
         */
        const shouldLoadTmmin =
          !allCustomersMode && selectedNormalized.includes('TMMIN');

        const shouldLoadNtc =
          !allCustomersMode && selectedNormalized.includes('NTC');

        const shouldLoadGaya =
          !allCustomersMode && selectedNormalized.includes('GAYA MTR');

        const shouldLoadAsiAdm =
          !allCustomersMode && selectedNormalized.includes('ASI ADM');

        const shouldLoadDcwa =
          !allCustomersMode && selectedNormalized.includes('DCWA');

        const shouldLoadDpm =
          !allCustomersMode && selectedNormalized.includes('DPM');

        const [
          rows,
          tmminRows,
          ntcRows,
          gayaRows,
          asiAdmRows,
          dcwaRows,
          dpmRows,
          rawDownloadCount
        ] =
          await Promise.all([
            loadBySelectedCustomers(
              (
                params:
                  FilterParams
              ) => {

                return customerOrderService
                  .getRawFiles(
                    params
                  );
              }
            ),
            shouldLoadTmmin
              ? customerOrderService
                  .getTmminRawSo(
                    getDateOnlyFilterParams()
                  )
              : Promise.resolve([] as TmminRawSoBackendRow[]),
            shouldLoadNtc
              ? customerOrderService
                  .getNtcRawSo(
                    getDateOnlyFilterParams()
                  )
              : Promise.resolve([] as NtcRawSoBackendRow[]),
            shouldLoadGaya
              ? customerOrderService
                  .getGayaRawSo(
                    getDateOnlyFilterParams()
                  )
              : Promise.resolve([] as GayaRawSoBackendRow[]),
            shouldLoadAsiAdm
              ? customerOrderService
                  .getAsiAdmRawSo(
                    getDateOnlyFilterParams()
                  )
              : Promise.resolve([] as AsiAdmRawSoBackendRow[]),
            shouldLoadDcwa
              ? customerOrderService
                  .getDcwaRawSo(
                    getDateOnlyFilterParams()
                  )
              : Promise.resolve([] as DcwaRawSoBackendRow[]),
            shouldLoadDpm
              ? customerOrderService.getDpmRawSo(getDateOnlyFilterParams())
              : Promise.resolve([] as DpmRawSoBackendRow[]),
            allCustomersMode
              ? customerOrderService.getRawDownloadCount(
                  getDateOnlyFilterParams()
                )
              : Promise.resolve(null)
          ]);


        const orderedAdmRows =
          isAdmP1P4CombinedSelection()
            ? sortRowsByLatestUploadBatch(rows)
            : rows;

        card2Data.value =
          orderedAdmRows.map(
            mapCard2RowFromBackend
          );

        // Setelah refresh/upload, selalu mulai dari batch terbaru.
        card2CurrentPage.value = 1;

        tmminRawSoData.value =
          tmminRows.map(
            mapTmminRawSoRowFromBackend
          );

        ntcRawSoData.value =
          ntcRows.map(
            mapNtcRawSoRowFromBackend
          );

        gayaRawSoData.value =
          gayaRows.map(
            mapGayaRawSoRowFromBackend
          );

        asiAdmRawSoData.value =
          asiAdmRows.map(
            mapAsiAdmRawSoRowFromBackend
          );

        dcwaRawSoData.value =
          dcwaRows.map(
            mapDcwaRawSoRowFromBackend
          );

        dpmRawSoData.value = dpmRows.map(mapDpmRawSoRowFromBackend);

        if (allCustomersMode) {
          rawDownloadAllCustomerRowCount.value =
            Number(rawDownloadCount?.total ?? 0);
        }

        refreshLatestAvailableFilterDates();


        /*
        * Data baru = selection lama
        * tidak boleh dipertahankan.
        */
        selectedRawIds.value =
          [];


      } catch (
      error
      ) {

        console.error(
          'Gagal fetch data raw files:',
          error
        );


        notificationStore
          .showAlertError(
            'Gagal mengambil data Raw Files'
          );
      }
    };


  const downloadRawFilesExcel = async () => {
    if (!requireUploadSoPermission('download')) {
      return;
    }

    if (isAnyExcelDownloading.value) {
      notificationStore.showAlertWarning(
        'Proses download Excel lain masih berjalan. Tunggu sampai selesai.'
      );
      return;
    }

    const exportCustomers = validateRawDownloadScope();

    if (!exportCustomers) {
      return;
    }

    try {
      isDownloadingRawExcel.value = true;

      const singleCustomer =
        exportCustomers.length === 1
          ? exportCustomers[0]
          : '';

      const rawDownloadFilters: Record<string, string[]> =
        singleCustomer === 'TMMIN'
          ? buildRawServerFiltersForMode('tmmin')
          : singleCustomer === 'NTC'
            ? buildRawServerFiltersForMode('ntc')
            : singleCustomer === 'GAYA MTR'
              ? buildRawServerFiltersForMode('gaya')
              : singleCustomer === 'DCWA'
                ? buildRawServerFiltersForMode('dcwa')
                : singleCustomer === 'ASI ADM'
                  ? buildRawServerFiltersForMode('asi')
                  : singleCustomer === 'DPM'
                    ? buildRawServerFiltersForMode('dpm')
                    : singleCustomer === 'FTI'
                      ? buildRawServerFiltersForMode('fti')
                      : singleCustomer === 'MES'
                        ? buildRawServerFiltersForMode('mes')
                        : buildRawExcelFilters() as Record<string, string[]>;

      const payload: any = {
        customer: singleCustomer,
        customers: [...exportCustomers],
        filters: rawDownloadFilters,
        sort_key: card2SortColumn.value ?? '',
        sort_direction: card2SortDirection.value,
        from_date: fromDate.value || undefined,
        to_date:
          resolveOptionalToDate(
            fromDate.value,
            toDate.value,
            maxOrderDate.value
          ) || undefined,
        delivery_from_date:
          deliveryFromDate.value || undefined,
        delivery_to_date:
          resolveOptionalToDate(
            deliveryFromDate.value,
            deliveryToDate.value,
            maxDeliveryDate.value
          ) || undefined,
        creation_from_date:
          creationFromDate.value || undefined,
        creation_to_date:
          resolveOptionalToDate(
            creationFromDate.value,
            creationToDate.value,
            todayDate.value
          ) || undefined
      };

      /*
       * Saat TMMIN dipilih sendiri, raw_ids mempertahankan filter kolom
       * TMMIN yang sudah diterapkan pada tabel. Untuk ZIP multi customer,
       * backend memakai scope Customer + tanggal agar tiap file konsisten.
       */
      if (
        exportCustomers.length === 1 &&
        exportCustomers[0] === 'TMMIN' &&
        !rawServerPaged['TMMIN']
      ) {
        payload.raw_ids =
          tmminRawSoSortedRows.value
            .map((row) => Number(row.id ?? 0))
            .filter((id) => id > 0);
      }

      if (
        exportCustomers.length === 1 &&
        exportCustomers[0] === 'NTC' &&
        !rawServerPaged['NTC']
      ) {
        payload.raw_ids =
          ntcRawSoSortedRows.value
            .map((row) => Number(row.id ?? 0))
            .filter((id) => id > 0);
      }


      if (
        exportCustomers.length === 1 &&
        exportCustomers[0] === 'GAYA MTR' &&
        !rawServerPaged['GAYA MTR']
      ) {
        payload.raw_ids =
          gayaRawSoSortedRows.value
            .map((row) => Number(row.id ?? 0))
            .filter((id) => id > 0);
      }

      if (
        exportCustomers.length === 1 &&
        exportCustomers[0] === 'DCWA' &&
        !rawServerPaged['DCWA']
      ) {
        payload.raw_ids =
          dcwaRawSoSortedRows.value
            .map((row) => Number(row.id ?? 0))
            .filter((id) => id > 0);
      }

      if (
        exportCustomers.length === 1 &&
        exportCustomers[0] === 'ASI ADM' &&
        !rawServerPaged['ASI ADM']
      ) {
        payload.raw_ids =
          asiAdmRawSoSortedRows.value
            .map((row) => Number(row.id ?? 0))
            .filter((id) => id > 0);
      }

      // COUNT-only preflight: customer tanpa data tidak dikirim ke exporter.
      const preflight = await customerOrderService.getRawDownloadPreflight(
        payload
      );

      const availableCustomers = (
        preflight.available_customers ?? []
      ).filter(isRawDownloadExportCustomer);

      if (availableCustomers.length === 0 || Number(preflight.total ?? 0) <= 0) {
        notificationStore.showAlertWarning(
          'Tidak ada data Raw Sales Order hasil filter yang dapat di-download.'
        );
        return;
      }

      const unavailableCustomers = (
        preflight.unavailable_customers ?? []
      ).filter(isRawDownloadExportCustomer);

      if (unavailableCustomers.length > 0) {
        notificationStore.showAlertWarning(
          `Tidak ada data: ${unavailableCustomers.join(', ')}. ` +
          `Download dilanjutkan untuk: ${availableCustomers.join(', ')}.`
        );
      }

      payload.customers = [...availableCustomers];
      payload.customer =
        availableCustomers.length === 1
          ? availableCustomers[0]
          : '';

      const estimatedChunkFiles = Math.max(
        1,
        Number(preflight.estimated_files ?? availableCustomers.length)
      );
      const isZip = availableCustomers.length > 1;

      const buildDdMmRangeSuffix = (): string => {
        const candidates: Array<[string, string]> = [
          [
            fromDate.value || '',
            resolveOptionalToDate(
              fromDate.value,
              toDate.value,
              maxOrderDate.value
            ) || ''
          ],
          [
            deliveryFromDate.value || '',
            resolveOptionalToDate(
              deliveryFromDate.value,
              deliveryToDate.value,
              maxDeliveryDate.value
            ) || ''
          ],
          [
            creationFromDate.value || '',
            resolveOptionalToDate(
              creationFromDate.value,
              creationToDate.value,
              todayDate.value
            ) || ''
          ]
        ];

        const active = candidates.find(([from]) => /^\d{4}-\d{2}-\d{2}$/.test(from));
        if (!active) return '';

        const [from, rawTo] = active;
        const to = /^\d{4}-\d{2}-\d{2}$/.test(rawTo) ? rawTo : from;
        const toDdMm = (value: string) => `${value.slice(8, 10)}${value.slice(5, 7)}`;
        const fromToken = toDdMm(from);
        const toToken = toDdMm(to);

        return `_${fromToken === toToken ? fromToken : `${fromToken}-${toToken}`}`;
      };

      const rawZipName =
        `Raw_Ordering_${new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Jakarta',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).format(new Date()).replace(/-/g, '')}${buildDdMmRangeSuffix()}.zip`;

      let fileName = '';
      let actualFileCount = availableCustomers.length;

      const hasExplicitRawIds =
        Array.isArray(payload.raw_ids) &&
        payload.raw_ids.length > 0;
      const needsChunkMerge =
        !hasExplicitRawIds &&
        (isZip || estimatedChunkFiles > availableCustomers.length);

      if (needsChunkMerge) {
        const archiveResult = await downloadChunkedExcelPerCustomer(
          payload,
          availableCustomers,
          preflight,
          (chunkPayload) =>
            customerOrderService.downloadRawExcel(chunkPayload),
          rawZipName,
          'Raw_Files'
        );

        fileName = archiveResult.fileName;
        actualFileCount = archiveResult.fileCount;
      } else {
        const response =
          await customerOrderService.downloadRawExcel(payload);
        fileName = await saveExcelDownloadResponse(
          response,
          `Raw_Files_${availableCustomers[0]}_${Date.now()}.xlsx`
        );
      }

      notificationStore.showAlertSuccess(
        isZip
          ? `${Number(preflight.total ?? 0)} baris Raw Files berhasil dibuat menjadi ${actualFileCount} file Excel (1 file per customer) dalam ZIP: ${fileName}`
          : `Raw Files ${availableCustomers[0]} berhasil di-download (${Number(preflight.total ?? 0)} baris): ${fileName}`
      );
    } catch (error: any) {
      console.error(
        'Download Raw Files gagal:',
        error
      );

      let message =
        'Gagal mengunduh Raw Files Excel';

      const responseData =
        error.response?.data;

      if (responseData instanceof Blob) {
        const text = await responseData.text();

        try {
          const json = JSON.parse(text);
          message = json.message || message;
        } catch {
          if (text) {
            message = text;
          }
        }
      } else if (error.response?.data?.message) {
        message = error.response.data.message;
      } else if (error?.message) {
        message = error.message;
      }

      notificationStore.showAlertError(message);
    } finally {
      isDownloadingRawExcel.value = false;
    }
  };

  const activeSelectedRawIds = computed<number[]>(() => {
    return isDcwaSoMode.value
      ? dcwaRawSoSelectedIds.value
      : selectedRawIds.value;
  });

  const selectedRawOrderDates = computed<unknown[]>(() => {
    const selectedIdSet = new Set<number>(activeSelectedRawIds.value);

    if (isMesSoMode.value) {
      return mesRawSoData.value
        .filter((row) => selectedIdSet.has(Number(row.id ?? 0)))
        .map((row) => row.orderDate || row.deliveryDate || '');
    }

    if (isFtiSoMode.value) {
      return ftiRawSoData.value
        .filter((row) => selectedIdSet.has(Number(row.id ?? 0)))
        .map((row) => row.orderDate || row.deliveryDate || '');
    }

    if (isDpmSoMode.value) {
      return dpmRawSoData.value
        .filter((row) => selectedIdSet.has(Number(row.id ?? 0)))
        .map((row) => row.deliveryDate || '');
    }

    if (isAsiAdmSoMode.value) {
      return asiAdmRawSoData.value
        .filter((row) => selectedIdSet.has(Number(row.id ?? 0)))
        .map((row) => row.orderDate || '');
    }

    if (isDcwaSoMode.value) {
      return dcwaRawSoData.value
        .filter((row) => selectedIdSet.has(Number(row.id ?? 0)))
        .map((row) => row.orderDate || '');
    }

    if (isGayaSoMode.value) {
      return gayaRawSoData.value
        .filter((row) => selectedIdSet.has(Number(row.id ?? 0)))
        .map((row) => row.orderDate || '');
    }

    if (isNtcSoMode.value) {
      return ntcRawSoData.value
        .filter((row) => selectedIdSet.has(Number(row.id ?? 0)))
        .map((row) => row.orderDate || '');
    }

    if (isTmminSoMode.value) {
      return tmminRawSoData.value
        .filter((row) => selectedIdSet.has(Number(row.id ?? 0)))
        .map((row) =>
          row.baOrderDate ||
          row.apOrderDate ||
          row.afOrderDateRaw ||
          row.nOrderDateTime ||
          ''
        );
    }

    return card2Data.value
      .filter((row) => selectedIdSet.has(Number(row.rawId ?? 0)))
      .map((row) => row.orderDate ?? '');
  });

  const selectedRawDateScope = computed(() =>
    resolveSelectedDownloadDateScope(selectedRawOrderDates.value)
  );

  const canDownloadSelectedRawExcel = computed(() => {
    return (
      activeSelectedRawIds.value.length > 0 &&
      selectedRawDateScope.value.allowed &&
      !isAnyExcelDownloading.value &&
      !isDeletingRawFiles.value &&
      !isCancellingRawFiles.value &&
      !isRestoringRawFiles.value
    );
  });

  const selectedRawDownloadDescription = computed(() => {
    if (
      activeSelectedRawIds.value.length > 0 &&
      !selectedRawDateScope.value.allowed
    ) {
      return selectedRawDateScope.value.message;
    }

    return '';
  });

  const downloadSelectedRawFilesExcel = async () => {
    if (!requireUploadSoPermission('download')) {
      return;
    }

    const activeIds = [...activeSelectedRawIds.value];

    if (activeIds.length === 0) {
      notificationStore.showAlertWarning(
        'Centang minimal satu baris Raw Files terlebih dahulu.'
      );
      return;
    }

    if (isAnyExcelDownloading.value) {
      notificationStore.showAlertWarning(
        'Proses download Excel lain masih berjalan. Tunggu sampai selesai.'
      );
      return;
    }

    const dateScope = selectedRawDateScope.value;
    if (!dateScope.allowed) {
      notificationStore.showAlertWarning(dateScope.message);
      return;
    }

    const selectedIdSet = new Set<number>(activeIds);
    const selectedCustomersForDownload = new Set<RawDownloadExportCustomer>();

    if (isMesSoMode.value) {
      selectedCustomersForDownload.add('MES');
    } else if (isFtiSoMode.value) {
      selectedCustomersForDownload.add('FTI');
    } else if (isDpmSoMode.value) {
      selectedCustomersForDownload.add('DPM');
    } else if (isAsiAdmSoMode.value) {
      selectedCustomersForDownload.add('ASI ADM');
    } else if (isDcwaSoMode.value) {
      selectedCustomersForDownload.add('DCWA');
    } else if (isGayaSoMode.value) {
      selectedCustomersForDownload.add('GAYA MTR');
    } else if (isNtcSoMode.value) {
      selectedCustomersForDownload.add('NTC');
    } else if (isTmminSoMode.value) {
      selectedCustomersForDownload.add('TMMIN');
    } else {
      card2Data.value.forEach((row) => {
        if (!selectedIdSet.has(Number(row.rawId ?? 0))) {
          return;
        }

        if (row.plantCode === 'D101') {
          selectedCustomersForDownload.add('ADM P1');
        } else if (row.plantCode === 'D104') {
          selectedCustomersForDownload.add('ADM P4');
        } else if (row.plantCode === 'D105') {
          selectedCustomersForDownload.add('ADM P5');
        }
      });
    }

    if (
      selectedCustomersForDownload.size === 0 &&
      isRawDownloadExportCustomer(selectedCustomer.value)
    ) {
      selectedCustomersForDownload.add(selectedCustomer.value);
    }

    const exportCustomers = RAW_DOWNLOAD_EXPORT_CUSTOMERS.filter((customer) =>
      selectedCustomersForDownload.has(customer)
    );

    if (exportCustomers.length === 0) {
      notificationStore.showAlertWarning(
        'Customer dari Raw Files yang dicentang tidak dapat ditentukan.'
      );
      return;
    }

    try {
      isDownloadingRawExcel.value = true;

      const singleCustomer =
        exportCustomers.length === 1
          ? exportCustomers[0]
          : '';

      const payload: any = {
        customer: singleCustomer,
        customers: [...exportCustomers],
        raw_ids: activeIds,
        selected_only: true,
        filters: {},
        sort_key: '',
        sort_direction: 'none',
        from_date: dateScope.fromDate || undefined,
        to_date: dateScope.toDate || undefined,
        delivery_from_date:
          dateScope.deliveryFromDate || undefined,
        delivery_to_date:
          dateScope.deliveryToDate || undefined,
        creation_from_date:
          dateScope.creationFromDate || undefined,
        creation_to_date:
          dateScope.creationToDate || undefined
      };

      const preflight = await customerOrderService.getRawDownloadPreflight(payload);
      const actualTotal = Math.max(0, Number(preflight.total ?? 0));
      const missingTotal = Math.max(0, Number(preflight.missing_total ?? 0));
      const availableCustomers = (preflight.available_customers ?? [])
        .filter(isRawDownloadExportCustomer);

      if (actualTotal <= 0 || availableCustomers.length === 0) {
        notificationStore.showAlertWarning(
          'Data Raw Files yang dipilih sudah tidak tersedia. Refresh tabel lalu pilih ulang.'
        );
        clearRawDeleteSelection();
        return;
      }

      if (missingTotal > 0) {
        notificationStore.showAlertWarning(
          `${missingTotal} baris pilihan sudah tidak tersedia/cancel. ` +
          `Download dilanjutkan untuk ${actualTotal} baris yang masih aktif.`
        );
      }

      payload.customers = [...availableCustomers];
      payload.customer =
        availableCustomers.length === 1
          ? availableCustomers[0]
          : '';

      const response =
        await customerOrderService.downloadRawExcel(payload);

      const isZip =
        availableCustomers.length > 1 ||
        activeIds.length > 1000;
      const fileName = await saveExcelDownloadResponse(
        response,
        isZip
          ? `Raw_Ordering_Selected_${Date.now()}.zip`
          : `Raw_Files_Selected_${availableCustomers[0]}_${Date.now()}.xlsx`
      );

      notificationStore.showAlertSuccess(
        isZip
          ? `${actualTotal} baris Raw Files terpilih berhasil dibuat dalam ZIP: ${fileName}`
          : `${actualTotal} baris Raw Files terpilih berhasil di-download: ${fileName}`
      );
    } catch (error: any) {
      console.error('Download Selected Raw Files gagal:', error);

      let message = 'Gagal mengunduh Raw Files yang dipilih';
      const responseData = error.response?.data;

      if (responseData instanceof Blob) {
        const text = await responseData.text();
        try {
          const json = JSON.parse(text);
          message = json.message || message;
        } catch {
          if (text) {
            message = text;
          }
        }
      } else if (error.response?.data?.message) {
        message = error.response.data.message;
      } else if (error?.message) {
        message = error.message;
      }

      notificationStore.showAlertError(message);
    } finally {
      isDownloadingRawExcel.value = false;
    }
  };

  const card2TableWidth =
    computed(() => {

      const columnsWidth =
        card2Columns.reduce(
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
        RAW_SELECTION_COLUMN_WIDTH
        }px`;
    });
  const getCard2FrozenLeftPosition =
    (
      key:
        Card2Key
    ) => {

      const index =
        card2Columns
          .findIndex(
            (
              column
            ) =>
              column.key ===
              key
          );


      if (
        index ===
        -1
      ) {
        return RAW_SELECTION_COLUMN_WIDTH;
      }


      const previousColumnsWidth =
        card2Columns
          .slice(
            0,
            index
          )
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


      /*
      * Checkbox column = 44px.
      *
      * Plant Code sekarang mulai dari:
      * left: 44px
      */
      return (
        RAW_SELECTION_COLUMN_WIDTH +
        previousColumnsWidth
      );
    };
  const getCard2ColumnStyle = (key: Card2Key, isHeader = false, rowIndex = 0): CSSProperties => {
    const column = card2Columns.find((item) => item.key === key);
    const width = column?.width || '120px';
    const isFrozen = card2FrozenColumns.includes(key);
    const isOpen = card2OpenFilters.value[key] === true;
    const frozenIndex = card2FrozenColumns.indexOf(key);
    const lastFrozenKey = card2FrozenColumns[card2FrozenColumns.length - 1];
    const backgroundColor = isHeader ? '#eff6ff' : rowIndex % 2 === 0 ? '#ffffff' : '#f8fafc';
    const gridColor = '#e2e8f0';
    /*
    * Border kanan dan bawah untuk semua cell.
    * Menggunakan inset shadow agar tetap terlihat
    * ketika frozen column berada di atas kolom lain.
    */
    const gridShadows = [`inset -1px 0 0 ${gridColor}`, `inset 0 -1px 0 ${gridColor}`];
    /*
    * Border atas khusus header.
    */
    if (isHeader) {
      gridShadows.push(`inset 0 1px 0 ${gridColor}`);
    }
    /*
    * Garis pemisah frozen column terakhir.
    */
    if (isFrozen && key === lastFrozenKey) {
      gridShadows.push('3px 0 7px -6px rgba(15, 23, 42, 0.32)');
    }
    /*
    * Setiap frozen column dibuat overlap 1px.
    * Ini menutup celah antarkolom saat digeser.
    */
    const frozenLeft = isFrozen ? Math.max(0, getCard2FrozenLeftPosition(key) - Math.max(frozenIndex, 0)) : 0;
    const baseStyle: CSSProperties = {
      minWidth: width,
      width,
      maxWidth: width,
      boxSizing: 'border-box',
      backgroundColor,
      /*
      * Background solid menutupi tulisan
      * dari kolom non-frozen di belakang.
      */
      backgroundImage: `linear-gradient(
            ${backgroundColor},
            ${backgroundColor}
            )`,
      backgroundOrigin: 'border-box',
      backgroundClip: 'border-box',
      backgroundRepeat: 'no-repeat',
      backgroundSize: '100% 100%',
      isolation: 'isolate',
      boxShadow: gridShadows.join(', ')
    };
    /*
    * Non-frozen column.
    */
    if (!isFrozen) {
      return {
        ...baseStyle,
        position: 'relative',
        zIndex: isHeader && isOpen ? 10001 : isHeader ? 301 : 1
      };
    }
    /*
    * Frozen column.
    */
    return {
      ...baseStyle,
      position: 'sticky',
      left: `${frozenLeft}px`,
      zIndex: isHeader && isOpen ? 10002 : isHeader ? 700 : 80,
      transform: 'translateZ(0)',
      backfaceVisibility: 'hidden'
    };
  };

  // ============================================================
  // RAW FILES CHECKBOX COLUMN STYLE
  // ============================================================

  const getCard2CheckboxColumnStyle = (
    isHeader = false,
    rowIndex = 0
  ): CSSProperties => {

    const width =
      `${RAW_SELECTION_COLUMN_WIDTH}px`;

    const backgroundColor =
      isHeader
        ? '#eff6ff'
        : rowIndex % 2 === 0
          ? '#ffffff'
          : '#f8fafc';

    const gridColor =
      '#e2e8f0';


    /*
    * HARUS sama dengan getCard2ColumnStyle().
    *
    * kanan  = pemisah checkbox / Plant Code
    * bawah  = garis setiap row
    */
    const gridShadows = [
      `inset -1px 0 0 ${gridColor}`,
      `inset 0 -1px 0 ${gridColor}`
    ];


    /*
    * Header perlu garis atas.
    */
    if (
      isHeader
    ) {
      gridShadows.push(
        `inset 0 1px 0 ${gridColor}`
      );
    }


    /*
    * Checkbox sekarang merupakan kolom
    * paling kiri tabel.
    */
    gridShadows.push(
      `inset 1px 0 0 ${gridColor}`
    );

    return {
      minWidth:
        width,

      width:
        width,

      maxWidth:
        width,

      boxSizing:
        'border-box',

      position:
        'sticky',

      left:
        '0px',

      zIndex:
        isHeader
          ? 900
          : 180,

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
        gridShadows.join(
          ', '
        ),

      transform:
        'translateZ(0)',

      backfaceVisibility:
        'hidden'
    };
  };
  const displayCard2Value = (key: Card2Key, value: string) => {
    if (['calcDate', 'orderDate', 'delDate', 'recDate'].includes(key)) {
      return formatDateExcel(value);
    }
    if (['orderTime', 'delTime'].includes(key)) {
      return formatTimeExcel(value);
    }
    return value;
  };
  const buildRawExcelFilters = (): Partial<Record<Card2Key, string[]>> => {
    const filters = {} as Partial<Record<Card2Key, string[]>>;

    card2Columns.forEach((column) => {
      const selectedValues = card2SelectedFilters.value[column.key] ?? [];
      if (selectedValues.length === 0) {
        return;
      }

      // Jangan bergantung pada row page aktif. Pada server paging, option
      // yang dipilih bisa berasal dari remote search dan tidak ada di page
      // yang sedang tampil. Nilai tanggal dikembalikan ke ISO untuk backend.
      filters[column.key] = Array.from(new Set(
        selectedValues.map((selectedValue) => {
          const rawValue = toRawFilterOption(selectedValue);
          if (rawValue === '') return '';

          if (['calcDate', 'orderDate', 'delDate', 'recDate'].includes(column.key)) {
            return normalizeSelectedOrderDate(rawValue) || rawValue;
          }

          return rawValue;
        })
      ));
    });

    return filters;
  };
  const getCard2ColumnOptions = (key: Card2Key) => {
    let sourceRows = [...(card2Data.value || [])];

    if (selectedCustomer.value === 'ADM P1') {
      sourceRows = sourceRows.filter((row) => row.plantCode === 'D101');
    } else if (selectedCustomer.value === 'ADM P4') {
      sourceRows = sourceRows.filter((row) => row.plantCode === 'D104');
    } else if (selectedCustomer.value === 'ADM P5') {
      sourceRows = sourceRows.filter((row) => row.plantCode === 'D105');
    }

    sourceRows = getRowsMatchingOtherColumnFilters(
      sourceRows,
      card2Columns,
      card2SelectedFilters.value,
      key,
      (row, columnKey) => displayCard2Value(
        columnKey,
        String(row?.[columnKey] ?? '')
      )
    );

    return sortFilterOptions(
      [...new Set(
        sourceRows.map((row) =>
          normalizeFilterOption(
            displayCard2Value(key, row?.[key] ?? '')
          )
        )
      )]
    );
  };
  const getCard2FilteredColumnOptions = (key: Card2Key) => {
    const search = (card2SearchFilters.value[key] || '').toLowerCase();
    return getCard2ColumnOptions(key).filter((item) => {
      return matchesFilterOptionSearch(key, item, search);
    });
  };
  const card2BaseFiltered = computed(() => {
    return getRowsMatchingOtherColumnFilters(
      card2Data.value || [],
      card2Columns,
      card2SelectedFilters.value,
      null,
      (row, key) => displayCard2Value(
        key,
        String(row?.[key] ?? '')
      )
    );
  });
  const card2CustomerFiltered = computed(() => {
    if (selectedCustomer.value === 'ADM P1') {
      return card2BaseFiltered.value.filter((row) => row.plantCode === 'D101');
    }
    if (selectedCustomer.value === 'ADM P4') {
      return card2BaseFiltered.value.filter((row) => row.plantCode === 'D104');
    }
    if (selectedCustomer.value === 'ADM P5') {
      return card2BaseFiltered.value.filter((row) => row.plantCode === 'D105');
    }
    return card2BaseFiltered.value;
  });
  const card2TotalPages = computed(() => {
    const totalRows = rawServerPaged.ADM
      ? rawServerTotals.ADM
      : card2CustomerFiltered.value.length;
    return Math.max(1, Math.ceil(totalRows / card2RowsPerPage.value));
  });
  const card2SortedData = computed(() => {
    const result = [...card2CustomerFiltered.value];
    if (!card2SortColumn.value || card2SortDirection.value === 'none') {
      return result;
    }
    const column = card2SortColumn.value;
    return result.sort((a, b) => {
      const valueA = String(a[column] ?? '').toLowerCase();
      const valueB = String(b[column] ?? '').toLowerCase();
      if (valueA < valueB) {
        return card2SortDirection.value === 'asc' ? -1 : 1;
      }
      if (valueA > valueB) {
        return card2SortDirection.value === 'asc' ? 1 : -1;
      }
      return 0;
    });
  });

  // Raw ADM, TMMIN, NTC, Gaya Motor, DCWA, dan DPM memakai sumber tabel aktif masing-masing.
  // Pada All / multi customer, jumlah tombol download tetap menghitung
  // customer non-ADM walaupun tabel utama hanya menampilkan baris ADM.
  const rawActiveRowCount = computed(() => {
    if (isMesSoMode.value) {
      return rawServerPaged.MES ? rawServerTotals.MES : mesRawSoSortedRows.value.length;
    }

    if (isFtiSoMode.value) {
      return rawServerPaged.FTI ? rawServerTotals.FTI : ftiRawSoSortedRows.value.length;
    }

    if (isDpmSoMode.value) {
      return rawServerPaged.DPM ? rawServerTotals.DPM : dpmRawSoSortedRows.value.length;
    }

    if (isAsiAdmSoMode.value) {
      return rawServerPaged['ASI ADM'] ? rawServerTotals['ASI ADM'] : asiAdmRawSoSortedRows.value.length;
    }

    if (isDcwaSoMode.value) {
      return rawServerPaged.DCWA ? rawServerTotals.DCWA : dcwaRawSoSortedRows.value.length;
    }

    if (isGayaSoMode.value) {
      return rawServerPaged['GAYA MTR'] ? rawServerTotals['GAYA MTR'] : gayaRawSoSortedRows.value.length;
    }

    if (isNtcSoMode.value) {
      return rawServerPaged.NTC ? rawServerTotals.NTC : ntcRawSoSortedRows.value.length;
    }

    if (isTmminSoMode.value) {
      return rawServerPaged.TMMIN ? rawServerTotals.TMMIN : tmminRawSoSortedRows.value.length;
    }

    const selectedNormalized =
      selectedCustomers.value
        .map((customer) =>
          String(customer ?? '')
            .trim()
            .toUpperCase()
        )
        .filter(Boolean);

    const allCustomersMode =
      selectedNormalized.length === 0;

    /*
     * All Customer menghitung seluruh sumber Raw SO lewat endpoint COUNT(*).
     * Rows tabel di browser tetap hanya ADM P1/P4/P5 sesuai layout existing.
     */
    if (allCustomersMode) {
      return rawDownloadAllCustomerRowCount.value;
    }

    /*
     * Ketika scope hanya ADM P1/P4/P5 dan Raw Files masih memakai
     * server-side pagination, card2Data hanya berisi page yang sedang
     * tampil (mis. 10 row). Badge Download harus memakai total hasil
     * filter dari backend, bukan panjang page aktif.
     *
     * Contoh:
     *   ADM P5 + Creation Date = 418 row
     *   page aktif            = 10 row
     *   tombol Download       = 418 (bukan 10)
     */
    const admOnlySelection =
      selectedNormalized.length > 0 &&
      selectedNormalized.every((customer) =>
        ['ADM P1', 'ADM P4', 'ADM P5'].includes(customer)
      );

    if (rawServerPaged.ADM && admOnlySelection) {
      return Number(rawServerTotals.ADM ?? 0);
    }

    const selectedSet =
      new Set(selectedNormalized);

    const selectedAdmPlantCodes =
      new Set<string>();

    if (allCustomersMode || selectedSet.has('ADM P1')) {
      selectedAdmPlantCodes.add('D101');
    }

    if (allCustomersMode || selectedSet.has('ADM P4')) {
      selectedAdmPlantCodes.add('D104');
    }

    if (allCustomersMode || selectedSet.has('ADM P5')) {
      selectedAdmPlantCodes.add('D105');
    }

    /*
     * Multi customer tidak boleh menghitung seluruh ADM secara otomatis.
     * Hitung hanya plant ADM yang benar-benar dipilih user, tetapi tetap
     * pakai hasil filter kolom Raw yang aktif.
     */
    const admCount =
      card2BaseFiltered.value.filter(
        (row) =>
          selectedAdmPlantCodes.has(
            String(row.plantCode ?? '')
              .trim()
              .toUpperCase()
          )
      ).length;

    const includeTmmin =
      allCustomersMode
        ? customerOptions.includes('TMMIN')
        : selectedSet.has('TMMIN');

    const includeNtc =
      allCustomersMode
        ? customerOptions.includes('NTC')
        : selectedSet.has('NTC');

    const includeGaya =
      allCustomersMode
        ? customerOptions.includes('GAYA MTR')
        : selectedSet.has('GAYA MTR');

    const includeAsiAdm =
      allCustomersMode
        ? customerOptions.includes('ASI ADM')
        : selectedSet.has('ASI ADM');

    const includeDcwa =
      allCustomersMode
        ? customerOptions.includes('DCWA')
        : selectedSet.has('DCWA');

    const includeDpm =
      allCustomersMode
        ? customerOptions.includes('DPM')
        : selectedSet.has('DPM');

    const includeFti =
      allCustomersMode
        ? customerOptions.includes('FTI')
        : selectedSet.has('FTI');

    const includeMes =
      allCustomersMode
        ? customerOptions.includes('MES')
        : selectedSet.has('MES');

    return (
      admCount +
      (includeTmmin
        ? tmminRawSoSortedRows.value.length
        : 0) +
      (includeNtc
        ? ntcRawSoSortedRows.value.length
        : 0) +
      (includeGaya
        ? gayaRawSoSortedRows.value.length
        : 0) +
      (includeAsiAdm
        ? asiAdmRawSoSortedRows.value.length
        : 0) +
      (includeDcwa
        ? dcwaRawSoSortedRows.value.length
        : 0) +
      (includeDpm
        ? dpmRawSoSortedRows.value.length
        : 0) +
      (includeFti
        ? ftiRawSoSortedRows.value.length
        : 0) +
      (includeMes
        ? mesRawSoSortedRows.value.length
        : 0)
    );
  });

  const card2PaginatedData = computed(() => {
    if (rawServerPaged.ADM) {
      return card2SortedData.value;
    }
    const start = (card2CurrentPage.value - 1) * card2RowsPerPage.value;
    return card2SortedData.value.slice(start, start + card2RowsPerPage.value);
  });

  // ============================================================
  // RAW FILES DELETE SELECTION
  // ============================================================

  const rawDeleteSelectedCount =
    computed<number>(() => {
      return isDcwaSoMode.value
        ? dcwaRawSoSelectedIds.value.length
        : selectedRawIds.value.length;
    });


  // ============================================================
  // RAW FILES FILTERED DELETE
  // ============================================================

  /*
   * Semua ID yang sedang masuk hasil filter.
   *
   * PENTING:
   * pakai card2SortedData, BUKAN card2PaginatedData.
   *
   * card2SortedData:
   * seluruh hasil filter.
   *
   * card2PaginatedData:
   * hanya halaman yang sedang tampil.
   */
  const filteredRawIds =
    computed<number[]>(() => {
      const ids =
        isMesSoMode.value
          ? mesRawSoSortedRows.value.map(
            (row) => Number(row.id ?? 0)
          )
        : isFtiSoMode.value
          ? ftiRawSoSortedRows.value.map(
            (row) => Number(row.id ?? 0)
          )
        : isDpmSoMode.value
          ? dpmRawSoSortedRows.value.map(
            (row) => Number(row.id ?? 0)
          )
        : isAsiAdmSoMode.value
          ? asiAdmRawSoSortedRows.value.map(
            (row) => Number(row.id ?? 0)
          )
        : isDcwaSoMode.value
          ? dcwaRawSoSortedRows.value.map(
            (row) => Number(row.id ?? 0)
          )
          : isGayaSoMode.value
            ? gayaRawSoSortedRows.value.map(
              (row) => Number(row.id ?? 0)
            )
            : isNtcSoMode.value
              ? ntcRawSoSortedRows.value.map(
                (row) => Number(row.id ?? 0)
              )
              : isTmminSoMode.value
                ? tmminRawSoSortedRows.value.map(
                  (row) => Number(row.id ?? 0)
                )
                : card2SortedData.value.map(
                  (row) => Number(row.rawId ?? 0)
                );

      return Array.from(
        new Set(
          ids.filter((id) => id > 0)
        )
      );
    });

  /*
   * Jumlah seluruh data hasil filter.
   *
   * Contoh:
   *
   * ADM P5 = 105 data
   *
   * maka:
   *
   * rawFilteredDeleteCount = 105
   */
  const rawCurrentTableTotalCount = computed<number>(() => {
    const source = getActiveRawServerSource();

    if (rawServerPaged[source]) {
      return Number(rawServerTotals[source] ?? 0);
    }

    switch (source) {
      case 'MES':
        return mesRawSoSortedRows.value.length;
      case 'FTI':
        return ftiRawSoSortedRows.value.length;
      case 'DPM':
        return dpmRawSoSortedRows.value.length;
      case 'ASI ADM':
        return asiAdmRawSoSortedRows.value.length;
      case 'DCWA':
        return dcwaRawSoSortedRows.value.length;
      case 'GAYA MTR':
        return gayaRawSoSortedRows.value.length;
      case 'NTC':
        return ntcRawSoSortedRows.value.length;
      case 'TMMIN':
        return tmminRawSoFilteredRows.value.length;
      default:
        return card2SortedData.value.length;
    }
  });

  const rawFilteredDeleteCount =
    computed<number>(() => {
      const source = getActiveRawServerSource();

      // Pada fast server-page mode array frontend hanya berisi page aktif.
      // Badge filtered tetap harus menunjukkan seluruh scope database.
      if (rawServerPaged[source]) {
        return Number(rawServerTotals[source] ?? 0);
      }

      return filteredRawIds
        .value
        .length;
    });


  /*
   * Safety.
   *
   * Delete Filtered hanya boleh aktif apabila
   * user memang sedang menggunakan filter.
   *
   * Filter yang dianggap aktif:
   *
   * 1. Customer header
   * 2. From Date
   * 3. To Date
   * 4. Filter kolom Raw Files
   */
  const hasRawDeleteActiveFilter =
    computed<boolean>(() => {

      const hasCustomerFilter =
        selectedCustomers
          .value
          .length >
        0;


      const hasDateFilter =
        Boolean(
          fromDate.value ||
          toDate.value ||
          deliveryFromDate.value ||
          deliveryToDate.value ||
          creationFromDate.value ||
          creationToDate.value
        );


      const hasColumnFilter =
        isMesSoMode.value
          ? mesRawSoColumns.some(
            (column) =>
              (mesRawSoSelectedFilters.value[column.key]?.length ?? 0) > 0
          )
        : isFtiSoMode.value
          ? ftiRawSoColumns.some(
            (column) =>
              (ftiRawSoSelectedFilters.value[column.key]?.length ?? 0) > 0
          )
        : isDpmSoMode.value
          ? dpmRawSoColumns.some(
            (column) =>
              (dpmRawSoSelectedFilters.value[column.key]?.length ?? 0) > 0
          )
        : isAsiAdmSoMode.value
          ? asiAdmRawSoColumns.some(
            (column) =>
              (asiAdmRawSoSelectedFilters.value[column.key]?.length ?? 0) > 0
          )
        : isDcwaSoMode.value
          ? dcwaRawSoColumns.some(
            (column) =>
              (dcwaRawSoSelectedFilters.value[column.key]?.length ?? 0) > 0
          )
          : isGayaSoMode.value
            ? gayaRawSoVisibleColumns.value.some(
              (column) =>
                (gayaRawSoSelectedFilters.value[column.key]?.length ?? 0) > 0
            )
            : isNtcSoMode.value
              ? ntcRawSoVisibleColumns.value.some(
                (column) =>
                  (ntcRawSoSelectedFilters.value[column.key]?.length ?? 0) > 0
              )
              : isTmminSoMode.value
                ? tmminRawSoVisibleColumns.value.some(
                  (column) =>
                    (tmminRawSoSelectedFilters.value[column.key]?.length ?? 0) > 0
                )
                : card2Columns.some(
                  (column) =>
                    (card2SelectedFilters.value[column.key]?.length ?? 0) > 0
                );


      return (
        hasCustomerFilter ||
        hasDateFilter ||
        hasColumnFilter
      );
    });

  const currentPageRawIds =
    computed<number[]>(() => {
      const ids =
        isMesSoMode.value
          ? mesRawSoPaginatedRows.value.map(
            (row) => Number(row.id ?? 0)
          )
        : isFtiSoMode.value
          ? ftiRawSoPaginatedRows.value.map(
            (row) => Number(row.id ?? 0)
          )
        : isDpmSoMode.value
          ? dpmRawSoPaginatedRows.value.map(
            (row) => Number(row.id ?? 0)
          )
        : isAsiAdmSoMode.value
          ? asiAdmRawSoPaginatedRows.value.map(
            (row) => Number(row.id ?? 0)
          )
        : isDcwaSoMode.value
          ? dcwaRawSoPaginatedRows.value.map(
            (row) => Number(row.id ?? 0)
          )
          : isGayaSoMode.value
            ? gayaRawSoPaginatedRows.value.map(
              (row) => Number(row.id ?? 0)
            )
            : isNtcSoMode.value
              ? ntcRawSoPaginatedRows.value.map(
                (row) => Number(row.id ?? 0)
              )
              : isTmminSoMode.value
                ? tmminRawSoPaginatedRows.value.map(
                  (row) => Number(row.id ?? 0)
                )
                : card2PaginatedData.value.map(
                  (row) => Number(row.rawId ?? 0)
                );

      return ids.filter((id) => id > 0);
    });


  const isAllCurrentPageRawSelected =
    computed<boolean>(() => {

      const ids =
        currentPageRawIds
          .value;


      if (
        ids.length ===
        0
      ) {
        return false;
      }


      return ids.every(
        (
          id
        ) =>
          selectedRawIds
            .value
            .includes(
              id
            )
      );
    });


  const isRawSelectedForDelete =
    (
      rawId:
        number
    ): boolean => {

      return selectedRawIds
        .value
        .includes(
          Number(
            rawId
          )
        );
    };


  const toggleRawDeleteSelection =
    (
      rawId:
        number
    ): void => {

      const id =
        Number(
          rawId
        );


      if (
        id <=
        0
      ) {
        return;
      }


      const current =
        [
          ...selectedRawIds
            .value
        ];


      const index =
        current
          .indexOf(
            id
          );


      if (
        index >=
        0
      ) {
        current.splice(
          index,
          1
        );
      } else {
        current.push(
          id
        );
      }


      selectedRawIds.value =
        current;
    };


  const toggleAllCurrentPageRawDelete =
    (): void => {

      const pageIds =
        currentPageRawIds
          .value;


      if (
        pageIds.length ===
        0
      ) {
        return;
      }


      const current =
        new Set<number>(
          selectedRawIds
            .value
        );


      const allSelected =
        pageIds.every(
          (
            id
          ) =>
            current.has(
              id
            )
        );


      if (
        allSelected
      ) {
        pageIds.forEach(
          (
            id
          ) =>
            current.delete(
              id
            )
        );
      } else {
        pageIds.forEach(
          (
            id
          ) =>
            current.add(
              id
            )
        );
      }


      selectedRawIds.value =
        Array.from(
          current
        );
    };


  const clearRawDeleteSelection =
    (): void => {
      selectedRawIds.value = [];
      dcwaRawSoSelectedIds.value = [];
    };


  // ============================================================
  // CANCEL / RESTORE UI STATE
  // ============================================================

  const rawCancelSelectedCount =
    computed<number>(() => {
      return rawDeleteSelectedCount.value;
    });

  const rawFilteredCancelCount =
    computed<number>(() => {
      const source = getActiveRawServerSource();

      if (rawServerPaged[source]) {
        return Number(rawServerTotals[source] ?? 0);
      }

      return filteredRawIds
        .value
        .length;
    });

  const cancelledSelectedCount =
    computed<number>(() => {
      return selectedCancelledRawIds
        .value
        .length;
    });

  const getCancelListParams =
    () => {
      return {
        customers:
          [
            ...selectedCustomers
              .value
          ],

        from_date:
          fromDate.value ||
          undefined,

        to_date:
          resolveOptionalToDate(
            fromDate.value,
            toDate.value,
            maxOrderDate.value
          ) || undefined,

        delivery_from_date:
          deliveryFromDate.value ||
          undefined,

        delivery_to_date:
          resolveOptionalToDate(
            deliveryFromDate.value,
            deliveryToDate.value,
            maxDeliveryDate.value
          ) || undefined,

        creation_from_date:
          creationFromDate.value ||
          undefined,

        creation_to_date:
          resolveOptionalToDate(
            creationFromDate.value,
            creationToDate.value,
            todayDate.value
          ) || undefined
      };
    };

  const formatCancelLifecycleDate =
    (
      value:
        string |
        null |
        undefined
    ): string => {

      const raw =
        String(
          value ??
          ''
        )
          .trim();

      if (!raw) {
        return '-';
      }

      return raw
        .replace(
          'T',
          ' '
        )
        .substring(
          0,
          19
        );
    };

  let cancelledLifecycleAbortController: AbortController | null = null;
  let cancelledLifecycleRequestSerial = 0;
  let cancelledCountAbortController: AbortController | null = null;

  const isCancelledRequestAbort = (error: any, signal?: AbortSignal): boolean => {
    return Boolean(
      signal?.aborted ||
      error?.code === 'ERR_CANCELED' ||
      error?.name === 'CanceledError' ||
      error?.name === 'AbortError'
    );
  };

  const loadCancelledCounts = async (): Promise<void> => {
    cancelledCountAbortController?.abort();
    const controller = new AbortController();
    cancelledCountAbortController = controller;

    try {
      const response = await customerOrderService.getCancelledCounts(
        getCancelListParams(),
        controller.signal
      );

      if (controller.signal.aborted) {
        return;
      }

      if (response.status !== 'success') {
        throw new Error(response.message || 'Gagal menghitung data Cancelled.');
      }

      cancelledRawTotal.value = Number(response.cancelled_raw_total ?? 0);
      cancelHistoryTotal.value = Number(response.history_total ?? 0);

      // DN summary sengaja benar-benar lazy; jangan query grouping hanya untuk badge.
      if (!showCancelledDrawer.value || cancelledDrawerTab.value !== 'dn') {
        cancelledDnLoaded.value = false;
        cancelledDnTotal.value = 0;
        cancelledDnRows.value = [];
      }
    } catch (error: any) {
      if (!isCancelledRequestAbort(error, controller.signal)) {
        console.error('Load Cancelled Counts:', error);
      }
    } finally {
      if (cancelledCountAbortController === controller) {
        cancelledCountAbortController = null;
      }
    }
  };

  const loadCancelledTab = async (
    tab: 'parts' | 'dn' | 'history' = cancelledDrawerTab.value,
    resetPage = false
  ): Promise<void> => {
    const requestSerial = ++cancelledLifecycleRequestSerial;
    cancelledLifecycleAbortController?.abort();
    const controller = new AbortController();
    cancelledLifecycleAbortController = controller;

    if (resetPage) {
      if (tab === 'parts') {
        cancelledRawPage.value = 1;
      } else if (tab === 'history') {
        cancelHistoryPage.value = 1;
      }
    }

    try {
      isLoadingCancelledData.value = true;
      const params = getCancelListParams();

      if (tab === 'parts') {
        const fetchPage = (page: number) =>
          customerOrderService.getCancelledRawOrdersPage(
            {
              ...params,
              page,
              per_page: cancelledRowsPerPage.value
            },
            controller.signal
          );

        let response = await fetchPage(cancelledRawPage.value);

        if (
          controller.signal.aborted ||
          requestSerial !== cancelledLifecycleRequestSerial
        ) {
          return;
        }

        if (response.status !== 'success') {
          throw new Error(response.message || 'Gagal mengambil Cancelled Parts.');
        }

        const total = Number(response.total ?? 0);
        const totalPages = Math.max(
          1,
          Number(response.total_pages ?? Math.ceil(total / cancelledRowsPerPage.value))
        );

        if (cancelledRawPage.value > totalPages) {
          cancelledRawPage.value = totalPages;
          response = await fetchPage(totalPages);

          if (
            controller.signal.aborted ||
            requestSerial !== cancelledLifecycleRequestSerial
          ) {
            return;
          }
        }

        cancelledRawRows.value = response.data ?? [];
        cancelledRawTotal.value = Number(response.total ?? 0);
        selectedCancelledRawIds.value = [];
        return;
      }

      if (tab === 'history') {
        const fetchPage = (page: number) =>
          customerOrderService.getCancelHistoryPage(
            {
              ...params,
              page,
              per_page: cancelHistoryRowsPerPage.value
            },
            controller.signal
          );

        let response = await fetchPage(cancelHistoryPage.value);

        if (
          controller.signal.aborted ||
          requestSerial !== cancelledLifecycleRequestSerial
        ) {
          return;
        }

        if (response.status !== 'success') {
          throw new Error(response.message || 'Gagal mengambil History Cancel / Restore.');
        }

        const total = Number(response.total ?? 0);
        const totalPages = Math.max(
          1,
          Number(response.total_pages ?? Math.ceil(total / cancelHistoryRowsPerPage.value))
        );

        if (cancelHistoryPage.value > totalPages) {
          cancelHistoryPage.value = totalPages;
          response = await fetchPage(totalPages);

          if (
            controller.signal.aborted ||
            requestSerial !== cancelledLifecycleRequestSerial
          ) {
            return;
          }
        }

        cancelHistoryRows.value = response.data ?? [];
        cancelHistoryTotal.value = Number(response.total ?? 0);
        return;
      }

      // DN / SO-SP berisi agregasi lintas part. Endpoint ini baru dipanggil
      // ketika tab DN benar-benar dibuka, tidak pada initial page / badge.
      const rows = await customerOrderService.getCancelledDnOrders(
        params,
        controller.signal
      );

      if (
        controller.signal.aborted ||
        requestSerial !== cancelledLifecycleRequestSerial
      ) {
        return;
      }

      cancelledDnRows.value = rows;
      cancelledDnTotal.value = rows.length;
      cancelledDnLoaded.value = true;
    } catch (error: any) {
      if (
        isCancelledRequestAbort(error, controller.signal) ||
        requestSerial !== cancelledLifecycleRequestSerial
      ) {
        return;
      }

      console.error('Load Cancelled Data:', error);
      notificationStore.showAlertError(
        error.response?.data?.message ||
        error.message ||
        'Gagal mengambil data Cancelled / Restore.'
      );
    } finally {
      if (requestSerial === cancelledLifecycleRequestSerial) {
        isLoadingCancelledData.value = false;
      }
      if (cancelledLifecycleAbortController === controller) {
        cancelledLifecycleAbortController = null;
      }
    }
  };

  const loadCancelledData = async (): Promise<void> => {
    await loadCancelledCounts();

    if (showCancelledDrawer.value) {
      await loadCancelledTab(cancelledDrawerTab.value, false);
    }
  };

  const openCancelledDrawerPanel = async (): Promise<void> => {
    cancelledDrawerTab.value = 'parts';
    cancelledRawPage.value = 1;
    showCancelledDrawer.value = true;

    await Promise.all([
      loadCancelledCounts(),
      loadCancelledTab('parts', true)
    ]);
  };

  const closeCancelledDrawerPanel = (): void => {
    showCancelledDrawer.value = false;
    cancelledLifecycleAbortController?.abort();
    selectedCancelledRawIds.value = [];
    restoreReason.value = '';
  };

  const setCancelledDrawerTab = async (
    tab: 'parts' | 'dn' | 'history'
  ): Promise<void> => {
    if (cancelledDrawerTab.value === tab) {
      return;
    }

    cancelledDrawerTab.value = tab;
    await loadCancelledTab(tab, false);
  };

  const setCancelledRawPage = async (page: number): Promise<void> => {
    const next = Math.max(1, Math.min(cancelledRawTotalPages.value, Math.floor(page)));
    if (next === cancelledRawPage.value) {
      return;
    }
    cancelledRawPage.value = next;
    await loadCancelledTab('parts', false);
  };

  const setCancelHistoryPage = async (page: number): Promise<void> => {
    const next = Math.max(1, Math.min(cancelHistoryTotalPages.value, Math.floor(page)));
    if (next === cancelHistoryPage.value) {
      return;
    }
    cancelHistoryPage.value = next;
    await loadCancelledTab('history', false);
  };

  const setCancelledRowsPerPage = async (value: number): Promise<void> => {
    const next = cancelledRowsPerPageOptions.includes(Number(value))
      ? Number(value)
      : 20;
    cancelledRowsPerPage.value = next;
    cancelledRawPage.value = 1;
    await loadCancelledTab('parts', false);
  };

  const setCancelHistoryRowsPerPage = async (value: number): Promise<void> => {
    const next = cancelledRowsPerPageOptions.includes(Number(value))
      ? Number(value)
      : 20;
    cancelHistoryRowsPerPage.value = next;
    cancelHistoryPage.value = 1;
    await loadCancelledTab('history', false);
  };

  const isCancelledRawSelected =
    (
      rawId:
        number |
        string
    ): boolean => {

      return selectedCancelledRawIds
        .value
        .includes(
          Number(
            rawId
          )
        );
    };

  const toggleCancelledRawSelection =
    (
      rawId:
        number |
        string
    ): void => {

      if (hasMultiSpecialRawSchemaSelection.value) {
        notificationStore.showAlertWarning(
          'Restore Cancelled Parts untuk customer dengan schema berbeda dilakukan per customer. Pilih satu customer terlebih dahulu.'
        );
        return;
      }

      const id =
        Number(
          rawId
        );

      if (
        !Number
          .isFinite(
            id
          ) ||
        id <=
        0
      ) {
        return;
      }

      const current =
        new Set(
          selectedCancelledRawIds
            .value
        );

      if (
        current.has(
          id
        )
      ) {
        current.delete(
          id
        );
      } else {
        current.add(
          id
        );
      }

      selectedCancelledRawIds
        .value =
        Array.from(
          current
        );
    };

  const toggleAllCancelledRawSelection =
    (): void => {

      if (hasMultiSpecialRawSchemaSelection.value) {
        notificationStore.showAlertWarning(
          'Restore Cancelled Parts untuk customer dengan schema berbeda dilakukan per customer. Pilih satu customer terlebih dahulu.'
        );
        return;
      }

      const ids =
        cancelledRawRows
          .value
          .map(
            (
              row
            ) =>
              Number(
                row.id
              )
          )
          .filter(
            (
              id
            ) =>
              Number
                .isFinite(
                  id
                ) &&
              id >
              0
          );

      if (
        ids.length ===
        0
      ) {
        selectedCancelledRawIds
          .value =
          [];

        return;
      }

      const current =
        new Set(
          selectedCancelledRawIds
            .value
        );

      const allSelected =
        ids.every(
          (
            id
          ) =>
            current.has(
              id
            )
        );

      ids.forEach(
        (
          id
        ) => {

          if (
            allSelected
          ) {
            current.delete(
              id
            );
          } else {
            current.add(
              id
            );
          }
        }
      );

      selectedCancelledRawIds
        .value =
        Array.from(
          current
        );
    };

  const openCancelSelectedRawFiles =
    (): void => {

      if (
        rawCancelSelectedCount
          .value ===
        0
      ) {
        notificationStore
          .showAlertWarning(
            'Pilih minimal satu Raw File yang akan dicancel.'
          );

        return;
      }

      cancelRawMode
        .value =
        'selected';

      cancelReason
        .value =
        '';

      /*
       * Jika user Upload By yang sedang terpilih termasuk
       * user master statis, gunakan sebagai default.
       * Selain itu user wajib memilih dari dropdown.
       */
      cancelActionBy
        .value =
        uploadUserOptions
          .value
          .includes(
            selectedUploadUser
              .value
          )
          ? selectedUploadUser.value
          : '';

      showCancelRawModal
        .value =
        true;
    };

  const openCancelFilteredRawFiles =
    (): void => {

      if (
        !hasRawDeleteActiveFilter
          .value
      ) {
        notificationStore
          .showAlertWarning(
            'Aktifkan filter Customer, Order Date, atau filter kolom terlebih dahulu sebelum menggunakan Cancel Filtered.'
          );

        return;
      }

      if (
        rawFilteredCancelCount
          .value ===
        0
      ) {
        notificationStore
          .showAlertWarning(
            'Tidak ada Raw Files pada hasil filter yang dapat dicancel.'
          );

        return;
      }

      cancelRawMode
        .value =
        'filtered';

      cancelReason
        .value =
        '';

      /*
       * Jika user Upload By yang sedang terpilih termasuk
       * user master statis, gunakan sebagai default.
       * Selain itu user wajib memilih dari dropdown.
       */
      cancelActionBy
        .value =
        uploadUserOptions
          .value
          .includes(
            selectedUploadUser
              .value
          )
          ? selectedUploadUser.value
          : '';

      showCancelRawModal
        .value =
        true;
    };

  const closeCancelRawModal =
    (): void => {

      if (
        isCancellingRawFiles
          .value
      ) {
        return;
      }

      showCancelRawModal
        .value =
        false;

      cancelReason
        .value =
        '';

      cancelActionBy
        .value =
        '';
    };

  /*
   * Sinkronisasi seluruh area yang dipengaruhi oleh cancel/restore.
   *
   * DN Monitoring memakai data Crosscheck/Check All DN sehingga
   * cache report harus selalu dibuang setelah perubahan lifecycle.
   */
  const refreshAfterRawLifecycleChange =
    async (): Promise<void> => {

      invalidateTrackingFilterOptionsCache();

      if (isAsiAdmSoMode.value || isDpmSoMode.value) {
        /*
         * ASI ADM dan DPM bukan source DN Crosscheck/Monitoring.
         * Lifecycle hanya menyinkronkan Raw, Format SO,
         * Tracking, dan daftar Cancelled customer terkait.
         */
        await Promise.all([
          isDpmSoMode.value
            ? fetchDpmRawSoData()
            : fetchAsiAdmRawSoData(),
          loadFormatSalesOrder(),
          loadTrackingData()
        ]);

        await loadCancelledData();
        return;
      }

      await Promise.all([
        fetchCard2Data(),
        loadFormatSalesOrder(),
        loadTrackingData()
      ]);

      if (
        isCheckAllDnMode
          .value
      ) {
        await loadAllDnStatus();
      } else if (
        parsedDnNumbers
          .value
          .length >
        0
      ) {
        await loadDnCrosscheckPreview();
      }

      dnMonitoringReportData
        .value =
        null;

      showDnMonitoringReport
        .value =
        false;

      /*
       * Selalu refresh cancelled data supaya badge
       * `Cancelled (n)` langsung sinkron walaupun drawer
       * sedang tertutup.
       */
      await loadCancelledData();
    };

  const confirmCancelRawFiles =
    async (): Promise<void> => {
      if (!requireUploadSoPermission('update')) {
        return;
      }


      const reason =
        cancelReason
          .value
          .trim();

      if (!reason) {
        notificationStore
          .showAlertWarning(
            'Alasan cancel wajib diisi.'
          );

        return;
      }

      const actionBy =
        cancelActionBy
          .value
          .trim();

      if (!actionBy) {
        notificationStore
          .showAlertWarning(
            'Cancelled By wajib dipilih.'
          );

        return;
      }

      /*
       * Pastikan value hanya berasal dari user master statis
       * yang juga digunakan untuk Upload By.
       */
      if (
        !uploadUserOptions
          .value
          .includes(
            actionBy
          )
      ) {
        notificationStore
          .showAlertWarning(
            'Cancelled By tidak valid. Pilih user dari daftar Upload By.'
          );

        return;
      }

      if (
        isCancellingRawFiles
          .value
      ) {
        return;
      }

      try {
        isCancellingRawFiles
          .value =
          true;

        const mode =
          cancelRawMode
            .value;

        let cancelPayload: any =
          isMesSoMode.value
            ? {
              mode: 'selected',
              raw_ids:
                mode === 'selected'
                  ? [...selectedRawIds.value]
                  : [...filteredRawIds.value],
              customer: 'MES',
              reason,
              action_by: actionBy
            }
          : isFtiSoMode.value
            ? {
              mode: 'selected',
              raw_ids:
                mode === 'selected'
                  ? [...selectedRawIds.value]
                  : [...filteredRawIds.value],
              customer: 'FTI',
              reason,
              action_by: actionBy
            }
          : isDpmSoMode.value
            ? {
              mode: 'selected',
              raw_ids:
                mode === 'selected'
                  ? [...selectedRawIds.value]
                  : [...filteredRawIds.value],
              customer: 'DPM',
              reason,
              action_by: actionBy
            }
          : isAsiAdmSoMode.value
            ? {
              mode: 'selected',
              raw_ids:
                mode === 'selected'
                  ? [...selectedRawIds.value]
                  : [...filteredRawIds.value],
              customer: 'ASI ADM',
              reason,
              action_by: actionBy
            }
            : isDcwaSoMode.value
            ? {
              mode: 'selected',
              raw_ids:
                mode === 'selected'
                  ? [...dcwaRawSoSelectedIds.value]
                  : [...filteredRawIds.value],
              customer: 'DCWA',
              reason,
              action_by: actionBy
            }
            : isGayaSoMode.value
              ? {
                mode: 'selected',
                raw_ids:
                  mode === 'selected'
                    ? [...selectedRawIds.value]
                    : [...filteredRawIds.value],
                customer: 'GAYA MTR',
                reason,
                action_by: actionBy
              }
              : isNtcSoMode.value
                ? {
                  mode: 'selected',
                  raw_ids:
                    mode === 'selected'
                      ? [...selectedRawIds.value]
                      : [...filteredRawIds.value],
                  customer: 'NTC',
                  reason,
                  action_by: actionBy
                }
                : isTmminSoMode.value
                  ? {
                    mode: 'selected',
                    raw_ids:
                      mode === 'selected'
                        ? [...selectedRawIds.value]
                        : [...filteredRawIds.value],
                    customer: 'TMMIN',
                    reason,
                    action_by: actionBy
                  }
                  : mode === 'selected'
                    ? {
                      mode: 'selected',
                      raw_ids: [...selectedRawIds.value],
                      reason,
                      action_by: actionBy
                    }
                    : {
                mode: 'filtered',
                customers: [...selectedCustomers.value],
                from_date: fromDate.value || undefined,
                to_date:
                  resolveOptionalToDate(
                    fromDate.value,
                    toDate.value,
                    maxOrderDate.value
                  ) || undefined,
                delivery_from_date:
                  deliveryFromDate.value || undefined,
                delivery_to_date:
                  resolveOptionalToDate(
                    deliveryFromDate.value,
                    deliveryToDate.value,
                    maxDeliveryDate.value
                  ) || undefined,
                creation_from_date:
                  creationFromDate.value || undefined,
                creation_to_date:
                  resolveOptionalToDate(
                    creationFromDate.value,
                    creationToDate.value,
                    todayDate.value
                  ) || undefined,
                filters: buildRawExcelFilters(),
                reason,
                action_by: actionBy
              };

        if (mode === 'filtered') {
          cancelPayload = {
            ...buildRawFilteredLifecyclePayload(),
            reason,
            action_by: actionBy
          };
        }

        const response =
          await customerOrderService.cancelRawOrders(
            cancelPayload
          );

        if (
          response.status !==
          'success'
        ) {
          throw new Error(
            response.message ||
            'Cancel Raw Files gagal.'
          );
        }

        selectedRawIds.value = [];
        dcwaRawSoSelectedIds.value = [];

        showCancelRawModal
          .value =
          false;

        cancelReason
          .value =
          '';

        cancelActionBy
          .value =
          '';

        await refreshAfterRawLifecycleChange();

        notificationStore
          .showAlertSuccess(
            response.message
          );

      } catch (
      error:
        any
      ) {
        console.error(
          'Cancel Raw Files:',
          error
        );

        notificationStore
          .showAlertError(
            error.response
              ?.data
              ?.message ||
            error.message ||
            'Gagal melakukan Cancel Order.'
          );
      } finally {
        isCancellingRawFiles
          .value =
          false;
      }
    };

  const executeRestoreRawOrders =
    async (
      rawIds:
        number[],
      reason =
        '',
      customerOverride =
        ''
    ): Promise<void> => {
      if (!requireUploadSoPermission('update')) {
        return;
      }

      const ids =
        Array.from(
          new Set(
            rawIds
              .map(
                (
                  id
                ) =>
                  Number(
                    id
                  )
              )
              .filter(
                (
                  id
                ) =>
                  Number
                    .isFinite(
                      id
                    ) &&
                  id >
                  0
              )
          )
        );

      if (
        ids.length ===
        0
      ) {
        notificationStore
          .showAlertWarning(
            'Tidak ada data cancelled yang dapat direstore.'
          );

        return;
      }

      if (
        isRestoringRawFiles
          .value
      ) {
        return;
      }

      try {
        isRestoringRawFiles
          .value =
          true;

        const restorePayload: any = {
          raw_ids: ids,
          reason:
            reason.trim() || undefined
        };

        const normalizedCustomerOverride = String(customerOverride ?? '')
          .trim()
          .toUpperCase();

        if (normalizedCustomerOverride) {
          restorePayload.customer = normalizedCustomerOverride;
        } else if (isMesSoMode.value) {
          restorePayload.customer = 'MES';
        } else if (isFtiSoMode.value) {
          restorePayload.customer = 'FTI';
        } else if (isDpmSoMode.value) {
          restorePayload.customer = 'DPM';
        } else if (isAsiAdmSoMode.value) {
          restorePayload.customer = 'ASI ADM';
        } else if (isDcwaSoMode.value) {
          restorePayload.customer = 'DCWA';
        } else if (isGayaSoMode.value) {
          restorePayload.customer = 'GAYA MTR';
        } else if (isNtcSoMode.value) {
          restorePayload.customer = 'NTC';
        } else if (isTmminSoMode.value) {
          restorePayload.customer = 'TMMIN';
        }

        const response =
          await customerOrderService
            .restoreRawOrders(
              restorePayload
            );

        if (
          response.status !==
          'success'
        ) {
          throw new Error(
            response.message ||
            'Restore Raw Files gagal.'
          );
        }

        selectedCancelledRawIds
          .value =
          [];

        restoreReason
          .value =
          '';

        await refreshAfterRawLifecycleChange();

        notificationStore
          .showAlertSuccess(
            response.message
          );

      } catch (
      error:
        any
      ) {
        console.error(
          'Restore Raw Files:',
          error
        );

        notificationStore
          .showAlertError(
            error.response
              ?.data
              ?.message ||
            error.message ||
            'Gagal melakukan Restore Order.'
          );
      } finally {
        isRestoringRawFiles
          .value =
          false;
      }
    };

  const restoreSelectedCancelledRaw =
    (): void => {

      if (hasMultiSpecialRawSchemaSelection.value) {
        notificationStore.showAlertWarning(
          'Pilih satu customer khusus terlebih dahulu untuk Restore Selected agar ID Raw tidak tercampur antar schema.'
        );
        return;
      }

      const ids =
        [
          ...selectedCancelledRawIds
            .value
        ];

      if (
        ids.length ===
        0
      ) {
        notificationStore
          .showAlertWarning(
            'Pilih minimal satu Cancelled Part yang akan direstore.'
          );

        return;
      }

      notificationStore
        .showConfirm(
          'Restore Selected Order',

          `${ids.length} Raw Files akan diaktifkan kembali. ` +
          'Format Sales Order akan muncul lagi dengan nomor Sales Document yang sama. ' +
          'Jika DN sebelumnya sudah Registered, status Close juga akan kembali terlihat. Lanjutkan?',

          async () => {
            await executeRestoreRawOrders(
              ids,
              restoreReason.value
            );
          }
        );
    };

  const restoreCancelledDn =
    (
      row:
        CancelledDnRow
    ): void => {

      const ids =
        String(
          row.cancelled_raw_ids ??
          ''
        )
          .split(
            ','
          )
          .map(
            (
              value
            ) =>
              Number(
                value
              )
          )
          .filter(
            (
              id
            ) =>
              Number
                .isFinite(
                  id
                ) &&
              id >
              0
          );

      if (
        ids.length ===
        0
      ) {
        notificationStore
          .showAlertWarning(
            'Raw ID cancelled untuk DN ini tidak ditemukan.'
          );

        return;
      }

      notificationStore
        .showConfirm(
          'Restore Cancelled DN',

          `Restore ${ids.length} part cancelled pada ${row.dn_number}? ` +
          'DN akan kembali ke DN Crosscheck / Monitoring sesuai part aktifnya.',

          async () => {
            await executeRestoreRawOrders(
              ids,
              restoreReason.value,
              String(row.customer ?? '')
            );
          }
        );
    };



  // ============================================================
  // DELETE SELECTED RAW FILES
  // ============================================================

  // ============================================================
  // EXECUTE RAW FILE DELETE
  // ============================================================

  const executeRawFilesDelete =
    (
      rawIds:
        number[],

      confirmTitle:
        string,

      confirmMessage:
        string
    ): void => {

      const ids =
        Array.from(
          new Set(
            rawIds
              .map(
                (
                  id
                ) =>
                  Number(
                    id
                  )
              )
              .filter(
                (
                  id
                ) =>
                  id >
                  0
              )
          )
        );


      // ========================================================
      // EMPTY
      // ========================================================

      if (
        ids.length ===
        0
      ) {
        notificationStore
          .showAlertWarning(
            'Tidak ada Raw Files yang dapat dihapus.'
          );

        return;
      }


      // ========================================================
      // PREVENT DOUBLE REQUEST
      // ========================================================

      if (
        isDeletingRawFiles
          .value
      ) {
        return;
      }


      // ========================================================
      // BACKEND SAAT INI MAX 5000
      // ========================================================

      if (
        ids.length >
        5000
      ) {
        notificationStore
          .showAlertWarning(
            `Jumlah data yang akan dihapus adalah ${ids.length}. ` +
            'Backend saat ini membatasi maksimal 5.000 Raw Files dalam satu proses.'
          );

        return;
      }


      // ========================================================
      // CONFIRM
      // ========================================================

      notificationStore
        .showConfirm(

          confirmTitle,

          confirmMessage,

          async () => {

            try {

              // =========================================
              // LOADING
              // =========================================

              isDeletingRawFiles
                .value =
                true;


              // =========================================
              // DELETE API
              // =========================================

              const deletePayload: any = {
                raw_ids: ids
              };

              if (isMesSoMode.value) {
                deletePayload.customer = 'MES';
              } else if (isFtiSoMode.value) {
                deletePayload.customer = 'FTI';
              } else if (isAsiAdmSoMode.value) {
                deletePayload.customer = 'ASI ADM';
              } else if (isDpmSoMode.value) {
                deletePayload.customer = 'DPM';
              } else if (isDcwaSoMode.value) {
                deletePayload.customer = 'DCWA';
              } else if (isGayaSoMode.value) {
                deletePayload.customer = 'GAYA MTR';
              } else if (isNtcSoMode.value) {
                deletePayload.customer = 'NTC';
              } else if (isTmminSoMode.value) {
                deletePayload.customer = 'TMMIN';
              }

              const response =
                await customerOrderService
                  .deleteRawFiles(
                    deletePayload
                  );


              if (
                response.status !==
                'success'
              ) {
                throw new Error(
                  response.message ||
                  'Delete Raw Files gagal.'
                );
              }


              // =========================================
              // CLEAR SELECTION
              // =========================================

              selectedRawIds.value = [];
              dcwaRawSoSelectedIds.value = [];


              // =========================================
              // REFRESH RAW + FORMAT SO + TRACKING
              // =========================================

              await refreshAfterRawLifecycleChange();


              // =========================================
              // FIX RAW PAGINATION
              // =========================================

              if (
                card2CurrentPage
                  .value >
                card2TotalPages
                  .value
              ) {
                card2CurrentPage
                  .value =
                  card2TotalPages
                    .value;
              }

              if (
                tmminRawSoCurrentPage.value >
                tmminRawSoTotalPages.value
              ) {
                tmminRawSoCurrentPage.value =
                  tmminRawSoTotalPages.value;
              }

              if (
                ntcRawSoCurrentPage.value >
                ntcRawSoTotalPages.value
              ) {
                ntcRawSoCurrentPage.value =
                  ntcRawSoTotalPages.value;
              }

              if (
                gayaRawSoCurrentPage.value >
                gayaRawSoTotalPages.value
              ) {
                gayaRawSoCurrentPage.value =
                  gayaRawSoTotalPages.value;
              }

              if (
                asiAdmRawSoCurrentPage.value >
                asiAdmRawSoTotalPages.value
              ) {
                asiAdmRawSoCurrentPage.value =
                  asiAdmRawSoTotalPages.value;
              }

              if (
                dcwaRawSoCurrentPage.value >
                dcwaRawSoTotalPages.value
              ) {
                dcwaRawSoCurrentPage.value =
                  dcwaRawSoTotalPages.value;
              }

              if (
                dpmRawSoCurrentPage.value >
                dpmRawSoTotalPages.value
              ) {
                dpmRawSoCurrentPage.value =
                  dpmRawSoTotalPages.value;
              }


              // =========================================
              // FIX FORMAT SO PAGINATION
              // =========================================

              if (
                formatSOCurrentPage
                  .value >
                formatSOTotalPages
                  .value
              ) {
                formatSOCurrentPage
                  .value =
                  formatSOTotalPages
                    .value;
              }


              // =========================================
              // FIX TRACKING PAGINATION
              // =========================================

              if (
                currentPage
                  .value >
                totalPages
                  .value
              ) {
                currentPage
                  .value =
                  totalPages
                    .value;
              }


              // =========================================
              // RESET DN MONITORING CACHE
              // =========================================

              dnMonitoringReportData
                .value =
                null;

              showDnMonitoringReport
                .value =
                false;


              // =========================================
              // SUCCESS
              // =========================================

              notificationStore
                .showAlertSuccess(
                  response.message
                );

            } catch (
            error: any
            ) {

              console.error(
                'Delete Raw Files:',
                error
              );


              notificationStore
                .showAlertError(
                  error.response
                    ?.data
                    ?.message ||
                  error.message ||
                  'Gagal menghapus Raw Files.'
                );

            } finally {

              isDeletingRawFiles
                .value =
                false;
            }
          }
        );
    };


  // ============================================================
  // CLEAR RAW FILES STATE
  // ============================================================

  // ============================================================
  // CLEAR RAW FILES STATE
  // ============================================================

  const clearRawFilesState =
    (): void => {

      // ====================================================
      // RAW DATA
      // ====================================================

      card2Data.value =
        [];


      // ====================================================
      // DELETE SELECTION
      // ====================================================

      selectedRawIds.value =
        [];


      // ====================================================
      // PAGINATION
      // ====================================================

      card2CurrentPage.value =
        1;


      // ====================================================
      // RESET COLUMN FILTERS
      // ====================================================
      //
      // Jangan:
      //
      // card2SelectedFilters.value = {};
      //
      // Karena type-nya membutuhkan seluruh Card2Key.
      // ====================================================

      card2Columns.forEach(
        (
          column
        ) => {

          const key =
            column.key;


          card2SelectedFilters
            .value[
            key
          ] =
            [];


          card2SearchFilters
            .value[
            key
          ] =
            '';


          card2OpenFilters
            .value[
            key
          ] =
            false;
        }
      );


      // ====================================================
      // ACTIVE FILTER
      // ====================================================

      card2ActiveFilterKey.value =
        null;


      // ====================================================
      // SORTING
      // ====================================================

      card2SortColumn.value =
        null;


      card2SortDirection.value =
        'none';
    };

  const refreshRawFiles =
    async (): Promise<void> => {

      clearRawFilesState();

      await fetchCard2Data();
    };


  const card2ShowingStart = computed(() => {
    const totalRows = rawServerPaged.ADM ? rawServerTotals.ADM : card2SortedData.value.length;
    return totalRows === 0 ? 0 : (card2CurrentPage.value - 1) * card2RowsPerPage.value + 1;
  });
  const card2ShowingEnd = computed(() => {
    const totalRows = rawServerPaged.ADM ? rawServerTotals.ADM : card2SortedData.value.length;
    return Math.min(card2CurrentPage.value * card2RowsPerPage.value, totalRows);
  });
  const card2VisiblePages = computed(() => {
    const max = 5;
    const pages: number[] = [];
    let start = Math.max(1, card2CurrentPage.value - Math.floor(max / 2));
    let end = Math.min(card2TotalPages.value, start + max - 1);
    if (end - start < max - 1) {
      start = Math.max(1, end - max + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  });
  const card2FirstPage = () => {
    card2CurrentPage.value = 1;
  };
  const card2LastPage = () => {
    card2CurrentPage.value = card2TotalPages.value;
  };
  const card2NextPage = () => {
    if (card2CurrentPage.value < card2TotalPages.value) {
      card2CurrentPage.value++;
    }
  };
  const card2PrevPage = () => {
    if (card2CurrentPage.value > 1) {
      card2CurrentPage.value--;
    }
  };
  const closeCard2Filter = () => {
    card2Columns.forEach((column) => {
      card2OpenFilters.value[column.key] = false;
    });
    card2ActiveFilterKey.value = null;
    clearAnchoredFilterPopup();
  };
  type RawFilterMode = 'adm' | 'tmmin' | 'ntc' | 'gaya' | 'dcwa' | 'asi' | 'dpm' | 'fti' | 'mes';

  const rawRemoteFilterOptions = ref<Record<string, string[]>>({});
  const rawRemoteFilterLoading = ref<Record<string, boolean>>({});
  const rawRemoteFilterTimers = new Map<string, ReturnType<typeof setTimeout>>();
  const rawRemoteFilterControllers = new Map<string, AbortController>();
  const rawFilterReloadTimers = new Map<RawFilterMode, ReturnType<typeof setTimeout>>();

  const getRawFilterSource = (mode: RawFilterMode): RawServerSource => {
    const map: Record<RawFilterMode, RawServerSource> = {
      adm: 'ADM',
      tmmin: 'TMMIN',
      ntc: 'NTC',
      gaya: 'GAYA MTR',
      dcwa: 'DCWA',
      asi: 'ASI ADM',
      dpm: 'DPM',
      fti: 'FTI',
      mes: 'MES'
    };
    return map[mode];
  };

  const getRawModeSelectedFilterState = (mode: RawFilterMode): Record<string, string[]> => {
    if (mode === 'adm') return card2SelectedFilters.value as unknown as Record<string, string[]>;
    if (mode === 'tmmin') return tmminRawSoSelectedFilters.value as unknown as Record<string, string[]>;
    if (mode === 'ntc') return ntcRawSoSelectedFilters.value as unknown as Record<string, string[]>;
    if (mode === 'gaya') return gayaRawSoSelectedFilters.value as unknown as Record<string, string[]>;
    if (mode === 'dcwa') return dcwaRawSoSelectedFilters.value as unknown as Record<string, string[]>;
    if (mode === 'asi') return asiAdmRawSoSelectedFilters.value as unknown as Record<string, string[]>;
    if (mode === 'dpm') return dpmRawSoSelectedFilters.value as unknown as Record<string, string[]>;
    if (mode === 'fti') return ftiRawSoSelectedFilters.value as unknown as Record<string, string[]>;
    return mesRawSoSelectedFilters.value as unknown as Record<string, string[]>;
  };

  const normalizeRawServerFilterValue = (key: string, value: string): string => {
    const raw = toRawFilterOption(String(value ?? ''));
    if (/date/i.test(key) && /^\d{1,2}-[A-Za-z]{3}-\d{2,4}$/.test(raw)) {
      return normalizeSelectedOrderDate(raw) || raw;
    }
    return raw;
  };

  const buildRawServerFiltersForMode = (
    mode: RawFilterMode,
    excludeKey = ''
  ): Record<string, string[]> => {
    const result: Record<string, string[]> = {};
    Object.entries(getRawModeSelectedFilterState(mode)).forEach(([key, values]) => {
      if (key === excludeKey || !Array.isArray(values) || values.length === 0) return;
      result[key] = Array.from(new Set(values.map((value) => normalizeRawServerFilterValue(key, value))));
    });
    return result;
  };

  const getRawModeSearchValue = (mode: RawFilterMode, key: string): string => {
    if (mode === 'adm') return getCard2SearchValue(key as Card2Key);
    if (mode === 'tmmin') return getTmminRawSoSearchValue(key as TmminRawSoKey);
    if (mode === 'ntc') return getNtcRawSoSearchValue(key as NtcRawSoKey);
    if (mode === 'gaya') return getGayaRawSoSearchValue(key as GayaRawSoKey);
    if (mode === 'dcwa') return getDcwaRawSoSearchValue(key as DcwaRawSoKey);
    if (mode === 'asi') return getAsiAdmRawSoSearchValue(key as AsiAdmRawSoKey);
    if (mode === 'dpm') return getDpmRawSoSearchValue(key as DpmRawSoKey);
    if (mode === 'fti') return getFtiRawSoSearchValue(key as FtiRawSoKey);
    return getMesRawSoSearchValue(key as MesRawSoKey);
  };

  const getRawLocalFilteredOptions = (mode: RawFilterMode, key: string): string[] => {
    if (mode === 'adm') return getCard2FilteredColumnOptions(key as Card2Key);
    if (mode === 'tmmin') return getTmminRawSoFilteredColumnOptions(key as TmminRawSoKey);
    if (mode === 'ntc') return getNtcRawSoFilteredColumnOptions(key as NtcRawSoKey);
    if (mode === 'gaya') return getGayaRawSoFilteredColumnOptions(key as GayaRawSoKey);
    if (mode === 'dcwa') return getDcwaRawSoFilteredColumnOptions(key as DcwaRawSoKey);
    if (mode === 'asi') return getAsiAdmRawSoFilteredColumnOptions(key as AsiAdmRawSoKey);
    if (mode === 'dpm') return getDpmRawSoFilteredColumnOptions(key as DpmRawSoKey);
    if (mode === 'fti') return getFtiRawSoFilteredColumnOptions(key as FtiRawSoKey);
    return getMesRawSoFilteredColumnOptions(key as MesRawSoKey);
  };

  const rawFilterRemoteKey = (mode: RawFilterMode, key: string): string => `${mode}:${key}`;

  const queueRawFilterOptionSearch = (
    mode: RawFilterMode,
    key: string,
    value: string
  ): void => {
    const search = String(value ?? '').trim();
    const cacheKey = rawFilterRemoteKey(mode, key);
    const existingTimer = rawRemoteFilterTimers.get(cacheKey);
    if (existingTimer) clearTimeout(existingTimer);
    rawRemoteFilterTimers.delete(cacheKey);

    const previousController = rawRemoteFilterControllers.get(cacheKey);
    if (previousController) previousController.abort();
    rawRemoteFilterControllers.delete(cacheKey);

    const source = getRawFilterSource(mode);
    if (search.length < 3 || !rawServerPaged[source]) {
      rawRemoteFilterLoading.value[cacheKey] = false;
      rawRemoteFilterOptions.value[cacheKey] = [];
      return;
    }

    rawRemoteFilterOptions.value[cacheKey] = [];
    rawRemoteFilterLoading.value[cacheKey] = true;
    const timer = setTimeout(async () => {
      const controller = new AbortController();
      rawRemoteFilterControllers.set(cacheKey, controller);
      try {
        const params: FilterParams = { ...getDateOnlyFilterParams() };
        if (mode === 'adm') {
          const admCustomers = selectedCustomers.value
            .map((customer) => String(customer ?? '').trim().toUpperCase())
            .filter((customer) => ['ADM P1', 'ADM P4', 'ADM P5'].includes(customer));
          params.customer = admCustomers.join(',') || undefined;
        }

        const values = await customerOrderService.searchRawSourceFilterOptions(
          source,
          key,
          search,
          params,
          buildRawServerFiltersForMode(mode, key),
          controller.signal
        );
        if (!controller.signal.aborted) {
          rawRemoteFilterOptions.value[cacheKey] = values.map((value) =>
            normalizeFilterOption(
              mode === 'adm'
                ? displayCard2Value(key as Card2Key, String(value ?? ''))
                : value
            )
          );
        }
      } catch (error: any) {
        if (error?.name !== 'CanceledError' && error?.name !== 'AbortError' && error?.code !== 'ERR_CANCELED') {
          console.warn(`Pencarian filter Raw ${source} gagal:`, error);
        }
      } finally {
        if (rawRemoteFilterControllers.get(cacheKey) === controller) {
          rawRemoteFilterControllers.delete(cacheKey);
          rawRemoteFilterLoading.value[cacheKey] = false;
        }
      }
    }, 300);
    rawRemoteFilterTimers.set(cacheKey, timer);
  };

  const getRawFilterPopupOptions = (mode: RawFilterMode, key: string): string[] => {
    const search = getRawModeSearchValue(mode, key).trim();
    const source = getRawFilterSource(mode);
    if (search.length >= 3 && rawServerPaged[source]) {
      return sortFilterOptions(rawRemoteFilterOptions.value[rawFilterRemoteKey(mode, key)] ?? []);
    }
    return getRawLocalFilteredOptions(mode, key);
  };

  const isRawFilterOptionLoading = (mode: RawFilterMode, key: string): boolean =>
    Boolean(rawRemoteFilterLoading.value[rawFilterRemoteKey(mode, key)]);

  const isRawFilterRemoteSearchActive = (mode: RawFilterMode, key: string): boolean =>
    rawServerPaged[getRawFilterSource(mode)] && getRawModeSearchValue(mode, key).trim().length >= 3;

  const isRawFilterServerPaged = (mode: RawFilterMode): boolean =>
    Boolean(rawServerPaged[getRawFilterSource(mode)]);

  const setRawModeSelectedValues = (mode: RawFilterMode, key: string, values: string[]): void => {
    getRawModeSelectedFilterState(mode)[key] = values;
  };

  const scheduleRawServerFilterReload = (mode: RawFilterMode): void => {
    const source = getRawFilterSource(mode);
    if (!rawServerPaged[source]) return;
    const previous = rawFilterReloadTimers.get(mode);
    if (previous) clearTimeout(previous);
    rawFilterReloadTimers.set(mode, setTimeout(() => {
      if (mode === 'adm') {
        if (card2CurrentPage.value !== 1) card2CurrentPage.value = 1;
        else void fetchCard2Data(false);
      } else if (mode === 'tmmin') {
        if (tmminRawSoCurrentPage.value !== 1) tmminRawSoCurrentPage.value = 1;
        else void fetchTmminRawSoData(false);
      } else if (mode === 'ntc') {
        if (ntcRawSoCurrentPage.value !== 1) ntcRawSoCurrentPage.value = 1;
        else void fetchNtcRawSoData(false);
      } else if (mode === 'gaya') {
        if (gayaRawSoCurrentPage.value !== 1) gayaRawSoCurrentPage.value = 1;
        else void fetchGayaRawSoData(false);
      } else if (mode === 'dcwa') {
        if (dcwaRawSoCurrentPage.value !== 1) dcwaRawSoCurrentPage.value = 1;
        else void fetchDcwaRawSoData(getDateOnlyFilterParams(), false);
      } else if (mode === 'asi') {
        if (asiAdmRawSoCurrentPage.value !== 1) asiAdmRawSoCurrentPage.value = 1;
        else void fetchAsiAdmRawSoData(false);
      } else if (mode === 'dpm') {
        if (dpmRawSoCurrentPage.value !== 1) dpmRawSoCurrentPage.value = 1;
        else void fetchDpmRawSoData(false);
      } else if (mode === 'fti') {
        if (ftiRawSoCurrentPage.value !== 1) ftiRawSoCurrentPage.value = 1;
        else void fetchFtiRawSoData(false);
      } else if (mode === 'mes') {
        if (mesRawSoCurrentPage.value !== 1) mesRawSoCurrentPage.value = 1;
        else void fetchMesRawSoData(false);
      }
    }, 120));
  };

  const toggleAllRawFilterOptions = (mode: RawFilterMode, key: string): void => {
    const options = getRawFilterPopupOptions(mode, key);
    const selected = getRawModeSelectedFilterState(mode)[key] ?? [];
    const allSelected = options.length > 0 && options.every((option) => selected.includes(option));
    setRawModeSelectedValues(mode, key, allSelected ? [] : [...options]);
    scheduleRawServerFilterReload(mode);
  };

  const toggleCard2Dropdown = async (key: Card2Key, event?: MouseEvent) => {
    /*
    * Apakah filter yang diklik
    * sedang terbuka?
    */
    const isCurrentlyOpen = card2ActiveFilterKey.value ===
      key;
    /*
    * Tutup SEMUA popup halaman.
    */
    closeAllPopups();
    /*
    * Klik tombol yang sama:
    * cukup tutup.
    */
    if (isCurrentlyOpen) {
      return;
    }

    const trigger = event?.currentTarget as HTMLElement | null;
    if (!trigger) {
      console.warn('Tombol filter Raw Files tidak ditemukan.');
      return;
    }

    setAnchoredFilterPopup(
      trigger,
      (anchor) => {
        card2FilterPopupPosition.value =
          getSafeRawFilterPopupPosition(anchor);
      }
    );

    /*
    * Hanya popup ini yang aktif.
    */
    card2ActiveFilterKey.value =
      key;
    card2OpenFilters.value[key] = true;
  };
  const isCard2SortActive = (key: Card2Key, direction: 'asc' | 'desc'): boolean => {
    return card2SortColumn.value === key && card2SortDirection.value === direction;
  };
  const isCard2NoSortActive = (key: Card2Key): boolean => {
    return card2SortColumn.value !== key || card2SortDirection.value === 'none';
  };
  const getCard2SelectedValues = (key: Card2Key): string[] => {
    return card2SelectedFilters.value[key] || [];
  };
  const getCard2SearchValue = (key: Card2Key): string => {
    return card2SearchFilters.value[key] || '';
  };
  const setCard2SearchValue = (key: Card2Key, value: string) => {
    card2SearchFilters.value[key] = String(value ?? '');
  };
  const toggleCard2Filter = (key: Card2Key, value: string) => {
    const selected = [...getCard2SelectedValues(key)];
    const index = selected.indexOf(value);
    if (index < 0) {
      selected.push(value);
    }
    else {
      selected.splice(index, 1);
    }
    card2SelectedFilters.value[key] = selected;
  };
  const toggleAllCard2Column = (key: Card2Key) => {
    const options = getCard2FilteredColumnOptions(key);
    const selected = getCard2SelectedValues(key);
    const allSelected = options.length > 0 &&
      options.every((option) => {
        return selected.includes(option);
      });
    card2SelectedFilters.value[key] = allSelected ? [] : [...options];
  };
  const clearCard2ColumnFilter = (key: Card2Key) => {
    card2SelectedFilters.value[key] = [];
    card2SearchFilters.value[key] = '';
  };
  const isAllCard2Selected = (key: Card2Key): boolean => {
    const options = getCard2FilteredColumnOptions(key);
    const selected = getCard2SelectedValues(key);
    return (options.length > 0 &&
      options.every((option) => {
        return selected.includes(option);
      }));
  };
  const isCard2FilterSelected = (key: Card2Key, value: string): boolean => {
    return getCard2SelectedValues(key).includes(value);
  };
  const getCard2SelectedLabel = (key: Card2Key): string => {
    const selected = getCard2SelectedValues(key);
    return selected.length > 0 ? `${selected.length} selected` : 'All';
  };
  const isCard2ChipColumn = (key: Card2Key) => {
    return card2ChipColumns.includes(key);
  };
  const card2ChipClass = (key: Card2Key, value: string) => {
    if (key === 'recStatus')
      return 'bg-green-100 text-green-700 border-green-200';
    if (key === 'dnType')
      return 'bg-blue-100 text-blue-700 border-blue-200';
    if (key === 'cancelStatus')
      return 'bg-red-100 text-red-700 border-red-200';
    return '';
  };
  const setSort = (column: Card2Key, direction: SortDirection) => {
    card2SortColumn.value = direction === 'none' ? null : column;
    card2SortDirection.value = direction;
    const wasFirstPage = card2CurrentPage.value === 1;
    card2CurrentPage.value = 1;
    if (rawServerPaged.ADM && wasFirstPage) {
      void fetchCard2Data(false);
    }
  };
  watch(card2SelectedFilters, () => {
    if (rawServerPaged.ADM) {
      scheduleRawServerFilterReload('adm');
      return;
    }
    card2CurrentPage.value = 1;
  }, { deep: true });
  watch(card2RowsPerPage, () => {
    if (rawServerPaged.ADM) {
      if (card2CurrentPage.value !== 1) card2CurrentPage.value = 1;
      else void fetchCard2Data(false);
      return;
    }
    card2CurrentPage.value = 1;
  });
  watch(card2CurrentPage, (page, previous) => {
    if (rawServerPaged.ADM && page !== previous && !isLoadingRawData.value) {
      void fetchCard2Data(false);
    }
  });
  // ========================================================
  // TRACKING UPLOAD SALES ORDER
  // ========================================================
  const columns: TableColumn<ColumnKey>[] = [
    {
      key: 'penyerahan',
      label: 'Tgl Serah',
      width: '100px'
    },
    {
      key: 'pembuat',
      label: 'Nama Pembuat SO',
      width: '120px'
    },
    {
      key: 'customer',
      label: 'Destinasi/Customer',
      width: '150px'
    },
    {
      key: 'tanggalOrderan',
      label: 'Tanggal Orderan',
      width: '110px'
    },
    {
      key: 'jamDiserahkan',
      label: 'Jam Diserahkan',
      width: '110px'
    },
    {
      key: 'nomorDn',
      label: 'Nomor DN Awal & Akhir',
      width: '135px'
    },
    {
      key: 'nomorSo',
      label: 'Nomor SO Awal & Akhir',
      width: '110px'
    },
    {
      key: 'totalQty',
      label: 'Total Quantity',
      width: '80px'
    },
    {
      key: 'tanggalUpload',
      label: 'Tanggal Upload',
      width: '125px'
    },
    {
      key: 'jamUpload',
      label: 'Jam Upload',
      width: '135px'
    },
    {
      key: 'uploadSo',
      label: 'Nama Upload SO',
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
      width: '180px'
    }
  ];
  const frozenColumns: ColumnKey[] = ['penyerahan', 'pembuat', 'customer'];
  const chipColumns: ColumnKey[] = ['pembuat', 'uploadSo', 'status'];
  const data = ref<Card1Row[]>([]);
  const isLoadingTracking = ref(false);
  const trackingServerPaged = ref(true);
  const trackingServerTotal = ref(0);
  const trackingSavingCells = ref<Record<string, boolean>>({});
  const trackingTimeDrafts = ref<Record<number, string>>({});
  const openTrackingUploadUserId = ref<number | null>(null);
  const trackingUploadUserPopupPosition = ref({
    top: 0,
    left: 0,
    width: 160
  });
  const formatTrackingDate = (value: string | null | undefined): string => {
    if (!value) {
      return '';
    }
    const cleanValue = String(value).substring(0, 10);
    const parts = cleanValue.split('-');
    if (parts.length !== 3) {
      return cleanValue;
    }
    return [parts[2], parts[1], parts[0]].join('/');
  };
  const formatTrackingDateRange = (fromValue: string | null | undefined, toValue: string | null | undefined): string => {
    const from = formatTrackingDate(fromValue);
    const to = formatTrackingDate(toValue);
    if (!from && !to) {
      return '';
    }
    if (!to || from === to) {
      return from;
    }
    return `${from}–${to}`;
  };
  const formatTrackingQuantity = (value: string | number | null | undefined): string => {
    const numberValue = Number(value ?? 0);
    if (!Number.isFinite(numberValue)) {
      return '0';
    }
    return new Intl.NumberFormat('id-ID', {
      maximumFractionDigits: 2
    }).format(numberValue);
  };
  const joinTrackingRange = (first: string | null | undefined, last: string | null | undefined): string => {
    const firstValue = String(first ?? '').trim();
    const lastValue = String(last ?? '').trim();
    if (firstValue && lastValue && firstValue !== lastValue) {
      return firstValue + '\n' + lastValue;
    }
    return firstValue || lastValue;
  };
  const mapTrackingRowFromBackend = (row: TrackingBackendRow): Card1Row => {
    return {
      id: Number(row.id),
      uploadBatchId: String(row.upload_batch_id ?? ''),
      penyerahan: String(row.handover_date ?? ''),
      pembuat: String(row.so_creator ?? ''),
      customer: String(row.customer_code ?? ''),
      tanggalOrderan: formatTrackingDateRange(row.order_date_from, row.order_date_to),
      jamDiserahkan: String(row.handed_time ?? '').substring(0, 8),
      nomorDn: joinTrackingRange(row.first_dn_number, row.last_dn_number),
      nomorSo: joinTrackingRange(row.first_sales_document, row.last_sales_document),
      totalQty: formatTrackingQuantity(row.total_quantity),
      tanggalUpload: String(row.upload_date ?? '').substring(0, 10),
      jamUpload: String(row.upload_time ?? '').substring(0, 5),
      uploadSo: String(row.upload_so_by ?? ''),
      status: (row.status || 'BELUM_DIMULAI') as TrackingStatus,
      remarks: String(row.remarks ?? ''),

      cancelledPartCount:
        Number(
          row.cancelled_part_count ??
          0
        ),

      cancelledDnCount:
        Number(
          row.cancelled_dn_count ??
          0
        ),

      cancelledItems:
        String(
          row.cancelled_items ??
          ''
        ),

      systemCancelRemarks:
        Number(
          row.cancelled_part_count ??
          0
        ) > 0
          ? (
            `Cancelled Part (${Number(
              row.cancelled_part_count ??
              0
            )})` +
            (
              String(
                row.cancelled_items ??
                ''
              ).trim()
                ? `\n${String(
                  row.cancelled_items ??
                  ''
                ).trim()}`
                : ''
            )
          )
          : ''
    };
  };
  const buildTrackingServerTextFilters = (): Record<string, string[]> => {
    const result: Record<string, string[]> = {};

    Object.entries(selectedFilters.value).forEach(([key, values]) => {
      const normalized = (values ?? [])
        .map((value) => toRawFilterOption(String(value ?? '')))
        .filter((value, index, source) => source.indexOf(value) === index);

      if (normalized.length > 0) {
        result[key] = normalized;
      }
    });

    return result;
  };

  const buildTrackingServerColorFilters = (): Record<string, string[]> => {
    const result: Record<string, string[]> = {};

    Object.entries(selectedColorFilters.value).forEach(([key, values]) => {
      const normalized = (values ?? [])
        .map((value) => String(value ?? '').trim())
        .filter(Boolean)
        .filter((value, index, source) => source.indexOf(value) === index);

      if (normalized.length > 0) {
        result[key] = normalized;
      }
    });

    return result;
  };

  let trackingPageRequestSerial = 0;
  let trackingPageAbortController: AbortController | null = null;

  const loadTrackingData =
    async () => {
      if (!trackingSectionActivated.value) {
        trackingSectionDirty = true;
        return;
      }

      const requestSerial = ++trackingPageRequestSerial;
      trackingPageAbortController?.abort();
      const controller = new AbortController();
      trackingPageAbortController = controller;
      let servedFromCache = false;

      try {
        isLoadingTracking.value = true;

        const selected = selectedCustomers.value;
        const trackingCustomers = selected.filter((customer) =>
          isOrderTrackingCustomer(customer)
        );

        if (
          selected.length > 0 &&
          trackingCustomers.length === 0
        ) {
          if (
            requestSerial === trackingPageRequestSerial &&
            !controller.signal.aborted
          ) {
            data.value = [];
            trackingServerTotal.value = 0;
            currentPage.value = 1;
            trackingServerPaged.value = true;
            trackingSectionDirty = false;
          }
          return;
        }

        const baseParams = getTrackingDateFilterParams();
        const textFilters = buildTrackingServerTextFilters();
        const colorFilters = buildTrackingServerColorFilters();
        const requestedPage = Math.max(1, currentPage.value);
        const perPage = [10, 20, 50, 100].includes(trackingRowsPerPage.value)
          ? trackingRowsPerPage.value
          : 10;
        const trackingSortKey = sortKey.value ?? '';
        const trackingSortDirection = sortDirection.value;

        const cached = customerOrderService.getCachedTrackingPage(
          baseParams,
          trackingCustomers,
          requestedPage,
          perPage,
          textFilters,
          colorFilters,
          trackingSortKey,
          trackingSortDirection
        );

        if (cached?.status === 'success') {
          if (
            requestSerial !== trackingPageRequestSerial ||
            controller.signal.aborted
          ) {
            return;
          }

          servedFromCache = true;
          trackingServerPaged.value = true;
          trackingServerTotal.value = Number(cached.total ?? 0);
          data.value = (cached.data ?? []).map(mapTrackingRowFromBackend);
          currentPage.value = Math.max(1, Number(cached.page ?? requestedPage));
          trackingSectionDirty = false;
          isLoadingTracking.value = false;

          if (currentPage.value < Number(cached.total_pages ?? 1)) {
            void customerOrderService.prefetchTrackingPage(
              baseParams,
              trackingCustomers,
              currentPage.value + 1,
              perPage,
              textFilters,
              colorFilters,
              trackingSortKey,
              trackingSortDirection
            );
          }

          // F5/first paint memakai cache session lebih dulu. Cache yang masih
          // muda tidak perlu langsung memukul database lagi; setelah 30 detik
          // page direvalidasi diam-diam agar perubahan user/browser lain tetap
          // cepat terlihat tanpa menampilkan spinner kedua.
          if (
            !customerOrderService.shouldRevalidateTrackingPage(
              baseParams,
              trackingCustomers,
              currentPage.value,
              perPage,
              textFilters,
              colorFilters,
              trackingSortKey,
              trackingSortDirection
            )
          ) {
            return;
          }
        }

        const requestPage = async (page: number) =>
          customerOrderService.getTrackingPage(
            baseParams,
            trackingCustomers,
            page,
            perPage,
            textFilters,
            colorFilters,
            trackingSortKey,
            trackingSortDirection,
            controller.signal
          );

        let response = await requestPage(requestedPage);

        if (
          requestSerial !== trackingPageRequestSerial ||
          controller.signal.aborted
        ) {
          return;
        }

        if (response.status !== 'success') {
          throw new Error(response.message || 'Gagal mengambil page Tracking.');
        }

        const resolvedPage = Math.max(1, Number(response.page ?? requestedPage));

        if (resolvedPage !== requestedPage) {
          currentPage.value = resolvedPage;
          response = await requestPage(resolvedPage);

          if (
            requestSerial !== trackingPageRequestSerial ||
            controller.signal.aborted
          ) {
            return;
          }

          if (response.status !== 'success') {
            throw new Error(response.message || 'Gagal mengambil page Tracking.');
          }
        }

        trackingServerPaged.value = true;
        trackingServerTotal.value = Number(response.total ?? 0);
        data.value = (response.data ?? []).map(mapTrackingRowFromBackend);
        trackingSectionDirty = false;

        if (resolvedPage < Number(response.total_pages ?? 1)) {
          void customerOrderService.prefetchTrackingPage(
            baseParams,
            trackingCustomers,
            resolvedPage + 1,
            perPage,
            textFilters,
            colorFilters,
            trackingSortKey,
            trackingSortDirection
          );
        }
      } catch (error: any) {
        const cancelled =
          controller.signal.aborted ||
          error?.code === 'ERR_CANCELED' ||
          error?.name === 'CanceledError' ||
          error?.name === 'AbortError';

        if (
          cancelled ||
          requestSerial !== trackingPageRequestSerial
        ) {
          return;
        }

        if (servedFromCache) {
          console.warn(
            'Revalidasi Tracking gagal; cache tetap dipakai.',
            error
          );
          return;
        }

        console.error('Tracking Error:', error);
        notificationStore.showAlertError(
          error.response?.data?.message ||
          error.message ||
          'Gagal mengambil Tracking Upload Sales Order'
        );
      } finally {
        if (requestSerial === trackingPageRequestSerial) {
          isLoadingTracking.value = false;
        }
        if (trackingPageAbortController === controller) {
          trackingPageAbortController = null;
        }
      }
    };

  const activateTrackingSection = async (): Promise<void> => {
    const firstActivation = !trackingSectionActivated.value;
    trackingSectionActivated.value = true;

    if (
      firstActivation ||
      trackingSectionDirty ||
      data.value.length === 0
    ) {
      await loadTrackingData();
    }
  };

  const applyHeaderCustomerFilter =
    async () => {
      /*
      * Tidak boleh Apply tanpa
      * satu customer pun.
      */
      if (
        !isAllHeaderCustomersSelected.value &&
        draftSelectedCustomers.value.includes('TMMIN') &&
        draftSelectedCustomers.value.length > 1
      ) {
        notificationStore
          .showAlertWarning(
            'Raw Files TMMIN memakai layout berbeda. Pilih TMMIN sendiri tanpa customer lain.'
          );

        return;
      }

      if (
        draftSelectedCustomers.value.length === 0
      ) {
        notificationStore
          .showAlertWarning(
            'Pilih minimal 1 Customer'
          );

        return;
      }

      /*
      * =================================================
      * SEMUA CUSTOMER TERPILIH
      * =================================================
      *
      * selectedCustomers = []
      * tetap kita gunakan sebagai arti:
      *
      * ALL CUSTOMER
      *
      * Dengan demikian backend cukup request sekali,
      * bukan request satu per satu untuk seluruh customer.
      */
      if (
        isAllHeaderCustomersSelected.value
      ) {
        selectedCustomers.value = [];
      } else {
        selectedCustomers.value = [
          ...draftSelectedCustomers.value
        ];
      }

      closeAllPopups();

      card2CurrentPage.value = 1;
      formatSOCurrentPage.value = 1;
      currentPage.value = 1;
      dnCrosscheckCurrentPage.value =
        1;

      invalidateTrackingFilterOptionsCache();

      await Promise.all([
        fetchCard2Data(),
        loadFormatSalesOrder(),
        loadTrackingData(),
        loadCancelledData()
      ]);


      await reloadDnCrosscheckAfterGlobalFilter();
    };
  const trackingStatusOptions: Array<{
    value: TrackingStatus;
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
  const trackingStatusLabel = (status: TrackingStatus): string => {
    return (trackingStatusOptions
      .find(option => option.value ===
        status)
      ?.label ??
      'Belum Mulai');
  };
  const openTrackingRemarksId = ref<number | null>(null);
  const trackingRemarksPopupPosition = ref({
    top: 0,
    left: 0,
    width: 300
  });
  const activeTrackingRemarksDraft = ref('');
  const trackingStatusClass = (status: TrackingStatus): string => {
    const classes: Record<TrackingStatus, string> = {
      BELUM_DIMULAI: `
                    border-sky-200!
                    bg-sky-100!
                    text-sky-700!
                    hover:bg-sky-100!
                `,
      DALAM_PROSES: `
                    border-yellow-200!
                    bg-yellow-100!
                    text-yellow-800!
                    hover:bg-yellow-100!
                `,
      DIBLOKIR: `
                    border-red-200!
                    bg-red-100!
                    text-red-700!
                    hover:bg-red-100!
                `,
      SELESAI: `
                    border-emerald-200!
                    bg-emerald-100!
                    text-emerald-700!
                    hover:bg-emerald-100!
                `
    };
    return (classes[status] ??
      classes.BELUM_DIMULAI);
  };
  const trackingFieldMap: Record<TrackingEditableKey, TrackingUpdateField> = {
    tanggalUpload: 'upload_date',
    jamUpload: 'upload_time',
    uploadSo: 'upload_so_by',
    status: 'status',
    remarks: 'remarks'
  };
  const getTrackingEditableValue = (row: Card1Row, key: TrackingEditableKey): string => {
    switch (key) {
      case 'tanggalUpload':
        return row.tanggalUpload;
      case 'jamUpload':
        return row.jamUpload;
      case 'uploadSo':
        return row.uploadSo;
      case 'status':
        return row.status;
      case 'remarks':
        return row.remarks;
    }
  };
  const setTrackingLocalValue = (row: Card1Row, key: TrackingEditableKey, value: string) => {
    switch (key) {
      case 'tanggalUpload':
        row.tanggalUpload = value;
        break;
      case 'jamUpload':
        row.jamUpload = value;
        break;
      case 'uploadSo':
        row.uploadSo = value;
        break;
      case 'status':
        row.status = value as TrackingStatus;
        break;
      case 'remarks':
        row.remarks = value;
        break;
    }
  };
  const isTrackingCellSaving = (trackingId: number, key: TrackingEditableKey): boolean => {
    return trackingSavingCells.value[`${trackingId}:${key}`] === true;
  };
  const saveTrackingCell = async (row: Card1Row, key: TrackingEditableKey, value: string): Promise<boolean> => {
    if (!requireUploadSoPermission('update')) {
      return false;
    }

    if (!Number.isFinite(row.id) ||
      row.id <= 0) {
      notificationStore
        .showAlertError('ID Tracking tidak valid.');
      return false;
    }
    const savingKey = `${row.id}:${key}`;
    /*
    * Nilai lama diambil sebelum
    * row diubah.
    */
    const previousValue = getTrackingEditableValue(row, key);
    const normalizedValue = key === 'jamUpload'
      ? String(value)
        .trim()
        .substring(0, 5)
      : String(value ?? '');
    setTrackingLocalValue(row, key, normalizedValue);
    trackingSavingCells
      .value[savingKey] =
      true;
    try {
      const response = await customerOrderService
        .updateTracking({
          id: row.id,
          field: trackingFieldMap[key],
          value: normalizedValue === ''
            ? null
            : normalizedValue
        });
      if (response.status !==
        'success') {
        throw new Error(response.message ||
          'Penyimpanan Tracking gagal');
      }
      /*
      * Backend dapat mengembalikan
      * format HH:mm:ss.
      *
      * Tampilan cukup HH:mm.
      */
      if (key === 'jamUpload') {
        row.jamUpload =
          String(response.value ??
            normalizedValue).substring(0, 5);
      }

      // Edit Tracking dapat mengubah nilai yang muncul pada filter.
      invalidateTrackingFilterOptionsCache();
      return true;
    }
    catch (error: any) {
      /*
      * Kembalikan nilai lama jika
      * request gagal.
      */
      setTrackingLocalValue(row, key, previousValue);
      console.error('Simpan Tracking gagal:', error);
      notificationStore
        .showAlertError(error.response
          ?.data
          ?.message ||
          error.message ||
          'Gagal menyimpan Tracking');
      return false;
    }
    finally {
      delete trackingSavingCells
        .value[savingKey];
    }
  };
  const getJakartaCurrentTimeValue = (): string => {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    });
    const parts = formatter.formatToParts(new Date());
    const hour = parts.find(part => part.type === 'hour')?.value ?? '00';
    const minute = parts.find(part => part.type === 'minute')?.value ?? '00';
    return `${hour}:${minute}`;
  };
  const setTrackingTimeNow = async (row: Card1Row) => {
    if (!Number.isFinite(row.id) ||
      row.id <= 0) {
      notificationStore
        .showAlertError('ID Tracking tidak valid.');
      return;
    }
    const currentTime = getJakartaCurrentTimeValue();
    /*
    * Langsung tampilkan pada input.
    */
    trackingTimeDrafts
      .value[row.id] =
      currentTime;
    /*
    * Simpan ke backend.
    */
    const saved = await saveTrackingCell(row, 'jamUpload', currentTime);
    /*
    * Draft harus dibersihkan.
    *
    * Jika berhasil, nilai berasal dari row.
    * Jika gagal, row sudah dikembalikan
    * ke nilai sebelumnya oleh saveTrackingCell.
    */
    delete trackingTimeDrafts
      .value[row.id];
    if (!saved) {
      return;
    }
  };
  const normalizeTrackingTimeDraft = (value: string): string => {
    /*
    * Hanya ambil maksimal empat angka.
    *
    * Contoh:
    * 1802 → 18:02
    */
    const digits = String(value ?? '')
      .replace(/\D/g, '')
      .slice(0, 4);
    if (digits.length <= 2) {
      return digits;
    }
    return (digits.slice(0, 2) +
      ':' +
      digits.slice(2));
  };
  const getTrackingTimeDraft = (row: Card1Row): string => {
    return (trackingTimeDrafts
      .value[row.id] ??
      row.jamUpload ??
      '');
  };
  const updateTrackingTimeDraft = (row: Card1Row, event: Event) => {
    const input = event.target as HTMLInputElement;
    const normalizedValue = normalizeTrackingTimeDraft(input.value);
    trackingTimeDrafts
      .value[row.id] =
      normalizedValue;
    /*
    * Menyamakan langsung tampilan input.
    */
    input.value =
      normalizedValue;
  };
  const isValidTrackingTime = (value: string): boolean => {
    return (/^(?:[01]\d|2[0-3]):[0-5]\d$/
      .test(value));
  };
  const saveTrackingTimeDraft = async (row: Card1Row) => {
    /*
    * Tidak ada perubahan manual,
    * tidak perlu melakukan request.
    */
    if (!Object.prototype
      .hasOwnProperty
      .call(trackingTimeDrafts.value, row.id)) {
      return;
    }
    const value = String(trackingTimeDrafts
      .value[row.id] ??
      '').trim();
    /*
    * Nilai kosong diperbolehkan
    * untuk menghapus jam.
    */
    if (value !== '' &&
      !isValidTrackingTime(value)) {
      notificationStore
        .showAlertWarning('Format Jam Upload harus HH:mm. Contoh: 16:07.');
      /*
      * Hapus draft yang salah.
      * Input kembali ke nilai database.
      */
      delete trackingTimeDrafts
        .value[row.id];
      return;
    }
    const saved = await saveTrackingCell(row, 'jamUpload', value);
    if (saved) {
      delete trackingTimeDrafts
        .value[row.id];
    }
  };
  const closeTrackingUploadUserDropdown = () => {
    openTrackingUploadUserId.value =
      null;
  };
  const toggleTrackingUploadUserDropdown = (trackingId: number, event: MouseEvent) => {
    /*
    * Simpan status popup SEBELUM
    * closeAllPopups().
    */
    const isCurrentlyOpen = openTrackingUploadUserId.value ===
      trackingId;
    /*
    * Tutup semua.
    */
    closeAllPopups();
    /*
    * Klik popup yang sama:
    * cukup tutup.
    */
    if (isCurrentlyOpen) {
      return;
    }
    const trigger = event.currentTarget as HTMLElement | null;
    if (!trigger) {
      return;
    }
    const rect = trigger.getBoundingClientRect();
    const viewportPadding = 8;
    const popupGap = 5;
    const popupMaxHeight = 240;
    const popupWidth = Math.max(160, rect.width);
    const availableBelow = window.innerHeight -
      rect.bottom -
      popupGap -
      viewportPadding;
    const availableAbove = rect.top -
      popupGap -
      viewportPadding;
    const openAbove = availableBelow < 180 &&
      availableAbove >
      availableBelow;
    let top = rect.bottom +
      popupGap;
    if (openAbove) {
      top =
        rect.top -
        popupMaxHeight -
        popupGap;
    }
    top =
      Math.max(viewportPadding, Math.min(top, window.innerHeight -
        popupMaxHeight -
        viewportPadding));
    const maximumLeft = Math.max(viewportPadding, window.innerWidth -
      popupWidth -
      viewportPadding);
    const left = Math.min(Math.max(rect.left, viewportPadding), maximumLeft);
    trackingUploadUserPopupPosition.value =
    {
      top,
      left,
      width: popupWidth
    };
    /*
    * Hanya popup user ini yang aktif.
    */
    openTrackingUploadUserId.value =
      trackingId;
  };
  const selectTrackingUploadUser = async (row: Card1Row, user: string) => {
    const cleanUser = String(user ?? '')
      .trim();
    closeTrackingUploadUserDropdown();
    await saveTrackingCell(row, 'uploadSo', cleanUser);
  };
  const saveTrackingFieldFromEvent = (row: Card1Row, key: TrackingEditableKey, event: Event) => {
    const target = event.target as HTMLInputElement | HTMLSelectElement;
    void saveTrackingCell(row, key, target.value);
  };
  const activeFilterKey = ref<ColumnKey | null>(null);
  const sortKey = ref<ColumnKey | null>(null);
  const sortDirection = ref<SortDirection>('none');
  const currentPage = ref(1);
  /*
  * Tracking selalu server-side pagination.
  * Show All sengaja tidak disediakan agar membuka/filter Tracking tidak
  * pernah meng-hydrate seluruh dataset ke browser.
  */
  const trackingRowsPerPage = ref(10);
  const trackingRowsPerPageOptions = [10, 20, 50, 100];
  /*
  * Posisi popup Tracking yang memakai Teleport.
  * Tidak berhubungan dengan popup Raw Files
  * maupun Format Sales Order.
  */
  const trackingFilterPopupPosition = ref({
    top: 0,
    left: 0,
    maxHeight: 350
  });
  const tableWidth = computed(() => {
    return `${columns.reduce((total, column) => {
      return total + getColumnWidthNumber(column.width);
    }, 0)}px`;
  });
  const getFrozenLeftPosition = (key: ColumnKey) => {
    const index = columns.findIndex((column) => column.key === key);
    if (index === -1)
      return 0;
    return columns.slice(0, index).reduce((total, column) => {
      return total + getColumnWidthNumber(column.width);
    }, 0);
  };
  const createTrackingRecord = <T>(factory: () => T): Record<ColumnKey, T> => {
    const result = {} as Record<ColumnKey, T>;
    columns.forEach((column) => {
      result[column.key] = factory();
    });
    return result;
  };
  const selectedFilters = ref<Record<ColumnKey, string[]>>(createTrackingRecord(() => []));
  const selectedColorFilters = ref<Record<ColumnKey, ColorKey[]>>(createTrackingRecord(() => []));
  const searchFilters = ref<Record<ColumnKey, string>>(createTrackingRecord(() => ''));
  const openFilters = ref<Record<ColumnKey, boolean>>(createTrackingRecord(() => false));

  /*
   * Opsi filter Tracking dibaca secara remote dan bounded.
   * Browser tidak perlu meng-hydrate seluruh row Tracking hanya untuk
   * membangun daftar checkbox Excel-style.
   */
  const trackingRemoteFilterOptions = ref<Record<ColumnKey, string[]>>(
    createTrackingRecord(() => [])
  );
  const trackingRemoteFilterLoading = ref<Record<ColumnKey, boolean>>(
    createTrackingRecord(() => false)
  );
  const trackingRemoteFilterHasMore = ref<Record<ColumnKey, boolean>>(
    createTrackingRecord(() => false)
  );
  const trackingRemoteFilterError = ref<Record<ColumnKey, string>>(
    createTrackingRecord(() => '')
  );
  const trackingFilterAbortControllers = new Map<ColumnKey, AbortController>();
  const trackingFilterSearchTimers = new Map<ColumnKey, ReturnType<typeof setTimeout>>();
  const TRACKING_REMOTE_FILTER_MIN_SEARCH_LENGTH = 3;

  type TrackingFilterOptionsCacheEntry = {
    options: string[];
    hasMore: boolean;
    cachedAt: number;
  };

  /*
   * Cache kecil opsi filter Tracking. Yang disimpan hanya maksimal 100
   * string option, bukan row Tracking. Popup pertama tetap lazy-load dari
   * server; buka ulang scope yang sama langsung memakai cache.
   */
  const trackingFilterOptionsCache = new Map<string, TrackingFilterOptionsCacheEntry>();
  const TRACKING_FILTER_OPTIONS_CACHE_TTL_MS = 30 * 60 * 1000;
  const TRACKING_FILTER_OPTIONS_CACHE_MAX_ENTRIES = 48;
  const openTrackingStatusId = ref<number | null>(null);
  const trackingStatusPopupPosition = ref({
    top: 0,
    left: 0,
    width: 150
  });
  const closeTrackingStatusDropdown = () => {
    openTrackingStatusId.value =
      null;
  };
  const toggleTrackingStatusDropdown = (trackingId: number, event: MouseEvent) => {
    const isCurrentlyOpen = openTrackingStatusId.value === trackingId;

    // Pastikan hanya satu popup/dropdown yang aktif.
    closeAllPopups();

    if (isCurrentlyOpen) {
      return;
    }

    const trigger = event.currentTarget as HTMLElement | null;
    if (!trigger) {
      return;
    }
    const rect = trigger.getBoundingClientRect();
    const viewportPadding = 8;
    const popupGap = 5;
    const popupMaxHeight = 205;
    const popupWidth = Math.max(150, rect.width);
    const availableBelow = window.innerHeight -
      rect.bottom -
      popupGap -
      viewportPadding;
    const availableAbove = rect.top -
      popupGap -
      viewportPadding;
    const openAbove = availableBelow < 180 &&
      availableAbove >
      availableBelow;
    let top = rect.bottom +
      popupGap;
    if (openAbove) {
      top =
        rect.top -
        popupMaxHeight -
        popupGap;
    }
    top =
      Math.max(viewportPadding, Math.min(top, window.innerHeight -
        popupMaxHeight -
        viewportPadding));
    const maximumLeft = Math.max(viewportPadding, window.innerWidth -
      popupWidth -
      viewportPadding);
    const left = Math.min(Math.max(rect.left, viewportPadding), maximumLeft);
    trackingStatusPopupPosition
      .value = {
      top,
      left,
      width: popupWidth
    };
    openTrackingStatusId.value =
      trackingId;
  };
  const selectTrackingStatus = async (row: Card1Row, status: TrackingStatus) => {
    closeTrackingStatusDropdown();
    await saveTrackingCell(row, 'status', status);
  };
  const closeTrackingRemarksPopup = () => {
    openTrackingRemarksId.value =
      null;
    activeTrackingRemarksDraft.value =
      '';
  };
  const cancelTrackingRemarks = () => {
    closeTrackingRemarksPopup();
  };
  const toggleTrackingRemarksPopup = (row: Card1Row, event: MouseEvent) => {
    const trackingId = Number(row.id);
    if (!Number.isFinite(trackingId) ||
      trackingId <= 0) {
      notificationStore
        .showAlertError('ID Tracking Remarks tidak valid.');
      return;
    }
    /*
    * Status popup disimpan SEBELUM
    * seluruh popup ditutup.
    */
    const isCurrentlyOpen = openTrackingRemarksId.value ===
      trackingId;
    /*
    * Tutup SEMUA popup halaman.
    */
    closeAllPopups();
    /*
    * Klik trigger yang sama:
    * tutup dan selesai.
    */
    if (isCurrentlyOpen) {
      return;
    }
    const trigger = event.currentTarget as HTMLElement | null;
    if (!trigger) {
      return;
    }
    const rect = trigger.getBoundingClientRect();
    const viewportPadding = 10;
    const popupGap = 6;
    const popupHeight = 260;
    const popupWidth = Math.max(280, Math.min(380, window.innerWidth -
      viewportPadding * 2));
    const availableBelow = window.innerHeight -
      rect.bottom -
      popupGap -
      viewportPadding;
    const availableAbove = rect.top -
      popupGap -
      viewportPadding;
    const openAbove = availableBelow <
      popupHeight &&
      availableAbove >
      availableBelow;
    let top = openAbove
      ? rect.top -
      popupHeight -
      popupGap
      : rect.bottom +
      popupGap;
    top =
      Math.max(viewportPadding, Math.min(top, window.innerHeight -
        popupHeight -
        viewportPadding));
    const maximumLeft = Math.max(viewportPadding, window.innerWidth -
      popupWidth -
      viewportPadding);
    const left = Math.min(Math.max(rect.right -
      popupWidth, viewportPadding), maximumLeft);
    trackingRemarksPopupPosition.value =
    {
      top,
      left,
      width: popupWidth
    };
    /*
    * Baru isi draft setelah semua popup
    * lama sudah ditutup.
    */
    activeTrackingRemarksDraft.value =
      String(row.remarks ?? '');
    openTrackingRemarksId.value =
      trackingId;
  };
  const saveTrackingRemarksPopup = async (row: Card1Row) => {
    const value = String(activeTrackingRemarksDraft
      .value ?? '').trim();
    const saved = await saveTrackingCell(row, 'remarks', value);
    if (!saved) {
      return;
    }
    closeTrackingRemarksPopup();
  };
  const getTrackingDisplayValue = (row: Card1Row, key: ColumnKey): string => {
    if (key === 'penyerahan') {
      return formatTrackingDate(row.penyerahan);
    }
    if (key === 'tanggalUpload') {
      return formatTrackingDate(row.tanggalUpload);
    }
    if (key === 'status') {
      return trackingStatusLabel(row.status);
    }
    return String(row[key] ?? '');
  };
  const getColumnStyle = (key: ColumnKey, isHeader = false, rowIndex = 0): CSSProperties => {
    const column = columns.find((item) => item.key === key);
    const width = column?.width ?? '120px';
    const isFrozen = frozenColumns.includes(key);
    const isOpen = openFilters.value[key] === true;
    const frozenIndex = frozenColumns.indexOf(key);
    const lastFrozenKey = frozenColumns[frozenColumns.length - 1];
    const isFirstColumn = key === columns[0]?.key;
    const backgroundColor = isHeader ? '#f0fdf4' : rowIndex % 2 === 0 ? '#ffffff' : '#f8fafc';
    const gridColor = '#e2e8f0';
    const gridShadows = [`inset -1px 0 0 ${gridColor}`, `inset 0 -1px 0 ${gridColor}`];
    if (isHeader) {
      gridShadows.push(`inset 0 1px 0 ${gridColor}`);
    }
    if (isFirstColumn) {
      gridShadows.push(`inset 1px 0 0 ${gridColor}`);
    }
    /*
    * Garis pemisah frozen terakhir.
    */
    if (isFrozen && key === lastFrozenKey) {
      gridShadows.push('3px 0 7px -6px rgba(15, 23, 42, 0.32)');
    }
    /*
    * Overlap satu pixel untuk menutup celah
    * saat tabel digeser horizontal.
    */
    const frozenLeft = isFrozen ? Math.max(0, getFrozenLeftPosition(key) - Math.max(frozenIndex, 0)) : 0;
    const baseStyle: CSSProperties = {
      minWidth: width,
      width,
      maxWidth: width,
      boxSizing: 'border-box',
      backgroundColor,
      backgroundImage: `linear-gradient(
                    ${backgroundColor},
                    ${backgroundColor}
                )`,
      backgroundOrigin: 'border-box',
      backgroundClip: 'border-box',
      backgroundRepeat: 'no-repeat',
      backgroundSize: '100% 100%',
      isolation: 'isolate',
      boxShadow: gridShadows.join(', ')
    };
    if (!isFrozen) {
      return {
        ...baseStyle,
        position: 'relative',
        zIndex: isHeader && isOpen ? 10001 : isHeader ? 301 : 1
      };
    }
    return {
      ...baseStyle,
      position: 'sticky',
      left: `${frozenLeft}px`,
      zIndex: isHeader && isOpen ? 10002 : isHeader ? 700 : 80,
      transform: 'translateZ(0)',
      backfaceVisibility: 'hidden'
    };
  };
  const getTrackingFilterScopeCustomers = (): string[] => {
    return selectedCustomers.value.filter((customer) =>
      isOrderTrackingCustomer(customer)
    );
  };

  const normalizeTrackingFilterCacheRecord = (
    record: Record<string, string[]>
  ): Record<string, string[]> => {
    const normalized: Record<string, string[]> = {};

    Object.keys(record)
      .sort()
      .forEach((recordKey) => {
        normalized[recordKey] = [...(record[recordKey] ?? [])]
          .map((value) => String(value ?? ''))
          .sort((first, second) => first.localeCompare(second, 'id', {
            numeric: true,
            sensitivity: 'base'
          }));
      });

    return normalized;
  };

  const buildTrackingFilterOptionsCacheKey = (
    key: ColumnKey,
    searchValue: string
  ): string => {
    const textFilters = buildTrackingServerTextFilters();
    const colorFilters = buildTrackingServerColorFilters();

    // Opsi kolom aktif hanya dipengaruhi filter kolom lain.
    delete textFilters[key];
    delete colorFilters[key];

    const dateParams = getTrackingDateFilterParams();
    const customers = getTrackingFilterScopeCustomers()
      .map((customer) => String(customer ?? '').trim().toUpperCase())
      .filter(Boolean)
      .sort((first, second) => first.localeCompare(second, 'id', {
        numeric: true,
        sensitivity: 'base'
      }));

    return JSON.stringify({
      column: key,
      search: String(searchValue ?? '').trim().toLowerCase(),
      customers,
      dates: {
        from_date: String(dateParams.from_date ?? ''),
        to_date: String(dateParams.to_date ?? ''),
        delivery_from_date: String(dateParams.delivery_from_date ?? ''),
        delivery_to_date: String(dateParams.delivery_to_date ?? ''),
        creation_from_date: String(dateParams.creation_from_date ?? ''),
        creation_to_date: String(dateParams.creation_to_date ?? '')
      },
      filters: normalizeTrackingFilterCacheRecord(textFilters),
      colorFilters: normalizeTrackingFilterCacheRecord(colorFilters)
    });
  };

  const setTrackingFilterOptionsCache = (
    cacheKey: string,
    options: string[],
    hasMore: boolean
  ): void => {
    if (trackingFilterOptionsCache.has(cacheKey)) {
      trackingFilterOptionsCache.delete(cacheKey);
    }

    trackingFilterOptionsCache.set(cacheKey, {
      options: [...options],
      hasMore,
      cachedAt: Date.now()
    });

    while (
      trackingFilterOptionsCache.size >
      TRACKING_FILTER_OPTIONS_CACHE_MAX_ENTRIES
    ) {
      const oldestKey = trackingFilterOptionsCache.keys().next().value;
      if (oldestKey === undefined) {
        break;
      }
      trackingFilterOptionsCache.delete(oldestKey);
    }
  };

  const restoreTrackingFilterOptionsFromCache = (
    key: ColumnKey,
    searchValue: string
  ): boolean => {
    const cacheKey = buildTrackingFilterOptionsCacheKey(key, searchValue);
    const cached = trackingFilterOptionsCache.get(cacheKey);

    if (!cached) {
      return false;
    }

    if (
      Date.now() - cached.cachedAt >
      TRACKING_FILTER_OPTIONS_CACHE_TTL_MS
    ) {
      trackingFilterOptionsCache.delete(cacheKey);
      return false;
    }

    // LRU ringan: entry yang dipakai dipindah ke posisi terakhir.
    trackingFilterOptionsCache.delete(cacheKey);
    trackingFilterOptionsCache.set(cacheKey, cached);

    const selected = selectedFilters.value[key] ?? [];
    trackingRemoteFilterOptions.value[key] = sortFilterOptions([
      ...new Set([
        ...cached.options,
        ...selected
      ])
    ]);
    trackingRemoteFilterHasMore.value[key] = cached.hasMore;
    trackingRemoteFilterLoading.value[key] = false;
    trackingRemoteFilterError.value[key] = '';

    return true;
  };

  const clearTrackingFilterOptionsCacheEntries = (): void => {
    trackingFilterOptionsCache.clear();
  };

  const invalidateTrackingFilterOptionsCache = (): void => {
    clearTrackingFilterOptionsCacheEntries();

    trackingFilterAbortControllers.forEach((controller) => controller.abort());
    trackingFilterAbortControllers.clear();

    trackingFilterSearchTimers.forEach((timer) => clearTimeout(timer));
    trackingFilterSearchTimers.clear();

    columns.forEach((column) => {
      const key = column.key;
      trackingRemoteFilterOptions.value[key] = [];
      trackingRemoteFilterLoading.value[key] = false;
      trackingRemoteFilterHasMore.value[key] = false;
      trackingRemoteFilterError.value[key] = '';
    });
  };

  const getTrackingLocalColumnOptions = (key: ColumnKey): string[] => {
    const isUserColumn = key === 'pembuat' || key === 'uploadSo';

    const values: string[] = getTrackingRowsForColumnOptions(key)
      .map((row) => normalizeFilterOption(getTrackingDisplayValue(row, key)))
      .filter((value) => {
        if (
          isUserColumn &&
          String(value).trim().toLowerCase() === 'pius'
        ) {
          return false;
        }
        return true;
      });

    return sortFilterOptions(Array.from(new Set<string>(values)));
  };

  const loadTrackingFilterOptions = async (key: ColumnKey): Promise<void> => {
    const previousController = trackingFilterAbortControllers.get(key);
    previousController?.abort();

    const searchValue = String(searchFilters.value[key] ?? '').trim();
    const localOptions = getTrackingLocalColumnOptions(key);
    const selected = selectedFilters.value[key] ?? [];

    /*
     * Buka popup dan search 1-2 karakter selalu memakai row page aktif yang
     * sudah ada di browser. Tidak ada query DISTINCT tambahan ke database.
     * Remote search seluruh scope baru berjalan mulai 3 karakter.
     */
    if (searchValue.length < TRACKING_REMOTE_FILTER_MIN_SEARCH_LENGTH) {
      const keyword = searchValue.toLowerCase();
      const visibleLocalOptions = keyword === ''
        ? localOptions
        : localOptions.filter((item) =>
            matchesFilterOptionSearch(key, item, keyword)
          );

      trackingRemoteFilterOptions.value[key] = sortFilterOptions([
        ...new Set([
          ...visibleLocalOptions,
          ...selected
        ])
      ]);
      trackingRemoteFilterHasMore.value[key] = false;
      trackingRemoteFilterLoading.value[key] = false;
      trackingRemoteFilterError.value[key] = '';
      return;
    }

    /*
     * Scope/search remote yang sama tidak request ulang.
     */
    if (restoreTrackingFilterOptionsFromCache(key, searchValue)) {
      return;
    }

    const controller = new AbortController();
    trackingFilterAbortControllers.set(key, controller);
    trackingRemoteFilterLoading.value[key] = true;
    trackingRemoteFilterError.value[key] = '';

    try {
      const response = await customerOrderService.searchTrackingFilterOptions(
        getTrackingDateFilterParams(),
        getTrackingFilterScopeCustomers(),
        key,
        searchValue,
        buildTrackingServerTextFilters(),
        buildTrackingServerColorFilters(),
        controller.signal
      );

      if (controller.signal.aborted) {
        return;
      }

      const isUserColumn =
        key === 'pembuat' ||
        key === 'uploadSo';

      const remoteValues = (response.data ?? [])
        .map((value) => normalizeFilterOption(value))
        .filter((value) => {
          if (
            isUserColumn &&
            String(value).trim().toLowerCase() === 'pius'
          ) {
            return false;
          }
          return true;
        });

      const normalizedRemoteValues = sortFilterOptions([
        ...new Set(remoteValues)
      ]);
      const hasMore = Boolean(response.has_more);

      setTrackingFilterOptionsCache(
        buildTrackingFilterOptionsCacheKey(key, searchValue),
        normalizedRemoteValues,
        hasMore
      );

      trackingRemoteFilterOptions.value[key] = sortFilterOptions([
        ...new Set([
          ...normalizedRemoteValues,
          ...selected
        ])
      ]);
      trackingRemoteFilterHasMore.value[key] = hasMore;
    } catch (error: any) {
      const cancelled =
        controller.signal.aborted ||
        error?.code === 'ERR_CANCELED' ||
        error?.name === 'CanceledError' ||
        error?.name === 'AbortError';

      if (!cancelled) {
        console.error('Tracking filter options error:', error);
        trackingRemoteFilterError.value[key] =
          error?.response?.data?.message ||
          error?.message ||
          'Gagal mengambil opsi filter Tracking.';
      }
    } finally {
      if (trackingFilterAbortControllers.get(key) === controller) {
        trackingFilterAbortControllers.delete(key);
        trackingRemoteFilterLoading.value[key] = false;
      }
    }
  };

  const scheduleTrackingFilterOptionsLoad = (
    key: ColumnKey,
    delay = 260
  ): void => {
    const previousTimer = trackingFilterSearchTimers.get(key);
    if (previousTimer) {
      clearTimeout(previousTimer);
    }

    const timer = setTimeout(() => {
      trackingFilterSearchTimers.delete(key);
      void loadTrackingFilterOptions(key);
    }, Math.max(0, delay));

    trackingFilterSearchTimers.set(key, timer);
  };

  const isTrackingFilterOptionsLoading = (key: ColumnKey): boolean =>
    trackingRemoteFilterLoading.value[key] === true;

  const trackingFilterOptionsHasMore = (key: ColumnKey): boolean =>
    trackingRemoteFilterHasMore.value[key] === true;

  const getTrackingFilterOptionsError = (key: ColumnKey): string =>
    trackingRemoteFilterError.value[key] || '';

  const getColumnOptions = (key: ColumnKey): string[] => {
    if (trackingServerPaged.value) {
      return sortFilterOptions([
        ...new Set([
          ...getTrackingLocalColumnOptions(key),
          ...(trackingRemoteFilterOptions.value[key] ?? []),
          ...(selectedFilters.value[key] ?? [])
        ])
      ]);
    }

    const isUserColumn =
      key === 'pembuat' ||
      key === 'uploadSo';

    const values = [
      ...new Set(getTrackingRowsForColumnOptions(key)
        .map((row) => {
          return normalizeFilterOption(
            getTrackingDisplayValue(row, key)
          );
        })
        .filter((value) => {
          if (
            isUserColumn &&
            String(value).trim().toLowerCase() === 'pius'
          ) {
            return false;
          }

          return true;
        }))
    ];

    return sortFilterOptions(values);
  };

  const getFilteredColumnOptions = (key: ColumnKey) => {
    if (trackingServerPaged.value) {
      const options = getColumnOptions(key);
      const keyword = String(searchFilters.value[key] ?? '')
        .trim()
        .toLowerCase();

      /*
       * 1-2 karakter memfilter opsi page aktif. Mulai 3 karakter daftar
       * sudah ditambah hasil remote seluruh scope, lalu tetap difilter oleh
       * keyword agar nilai page aktif yang tidak cocok tidak ikut muncul.
       */
      if (keyword !== '') {
        return options.filter((item) => {
          return matchesFilterOptionSearch(key, item, keyword);
        });
      }

      return options;
    }

    const keyword = searchFilters.value[key].toLowerCase();
    return getColumnOptions(key).filter((item) => {
      return matchesFilterOptionSearch(key, item, keyword);
    });
  };

  const getCellColorKey = (key: ColumnKey, value: string): ColorKey => {
    if (!value) {
      return 'normal';
    }
    if (key === 'pembuat' || key === 'uploadSo') {
      return getUserColor(value) as ColorKey;
    }
    if (key === 'customer') {
      return 'cyan';
    }
    if (key === 'status') {
      const status = String(value ?? '')
        .trim()
        .toUpperCase()
        .replace(/\s+/g, '_');

      if (status === 'BELUM_DIMULAI') {
        return 'cyan';
      }
      if (status === 'DALAM_PROSES') {
        return 'yellow';
      }
      if (status === 'DIBLOKIR') {
        return 'red';
      }
      if (status === 'SELESAI') {
        return 'green';
      }
    }
    return 'normal';
  };

  const getTrackingRowsForColumnOptions = (activeKey: ColumnKey) => {
    const activeFilters = columns
      .filter((column) => column.key !== activeKey)
      .map((column) => ({
        key: column.key,
        text: new Set(selectedFilters.value[column.key]),
        colors: new Set(selectedColorFilters.value[column.key])
      }))
      .filter((filter) => filter.text.size > 0 || filter.colors.size > 0);

    if (activeFilters.length === 0) return data.value;

    return data.value.filter((row) =>
      activeFilters.every((filter) => {
        const key = filter.key;
        const displayValue = normalizeFilterOption(
          getTrackingDisplayValue(row, key)
        );
        const textMatch = filter.text.size === 0 ||
          filter.text.has(displayValue);
        const colorMatch = filter.colors.size === 0 ||
          filter.colors.has(
            getCellColorKey(key, String(row[key] ?? ''))
          );
        return textMatch && colorMatch;
      })
    );
  };

  const getColumnColorOptions = (key: ColumnKey) => {
    const sourceValues = trackingServerPaged.value
      ? getColumnOptions(key).map((value) => toRawFilterOption(value))
      : getTrackingRowsForColumnOptions(key).map((row) => String(row[key] ?? ''));

    const colors = [...new Set(
      sourceValues.map((value) => getCellColorKey(key, value))
    )] as ColorKey[];

    return colors.map((color) => ({
      key: color,
      label: colorLabels[color]
    }));
  };

  const toggleColorFilter = (key: ColumnKey, color: ColorKey) => {
    const selected = selectedColorFilters.value[key];
    const index = selected.indexOf(color);
    index === -1 ? selected.push(color) : selected.splice(index, 1);
  };

  const isColorSelected = (key: ColumnKey, color: ColorKey) => {
    return selectedColorFilters.value[key].includes(color);
  };

  const baseFiltered = computed(() => {
    /*
     * Saat server-paged, current page sudah merupakan hasil filter backend.
     * Menjalankan filter yang sama lagi di browser bisa salah untuk nilai
     * display-formatted seperti tanggal, qty, atau blanks.
     */
    if (trackingServerPaged.value) {
      return data.value;
    }

    const activeFilters = columns
      .map((column) => ({
        key: column.key,
        text: new Set(selectedFilters.value[column.key]),
        colors: new Set(selectedColorFilters.value[column.key])
      }))
      .filter((filter) => filter.text.size > 0 || filter.colors.size > 0);

    if (activeFilters.length === 0) return data.value;

    return data.value.filter((row) => {
      return activeFilters.every((filter) => {
        const key = filter.key;
        const displayValue = normalizeFilterOption(getTrackingDisplayValue(row, key));
        const textMatch = filter.text.size === 0 || filter.text.has(displayValue);
        const colorMatch = filter.colors.size === 0 || filter.colors.has(getCellColorKey(key, String(row[key] ?? '')));
        return textMatch && colorMatch;
      });
    });
  });

  const isAdmP1P4TrackingScope = computed(() => {
    const customers = new Set(
      selectedCustomers.value
        .map((customer) => String(customer ?? '').trim().toUpperCase())
        .filter(Boolean)
    );

    return (
      customers.size === 2 &&
      customers.has('ADM P1') &&
      customers.has('ADM P4')
    );
  });

  const compareTrackingByLatestUpload = (
    first: Card1Row,
    second: Card1Row
  ): number => {
    /*
     * Jangan memakai Tanggal Upload / Jam Upload untuk menentukan
     * "file terbaru". Kedua kolom tersebut adalah field Tracking yang
     * dapat diedit user dan pada row baru dapat masih kosong, sehingga
     * batch yang baru saja diupload justru terdorong ke bawah.
     *
     * Tracking ID dibuat setelah batch berhasil disimpan. ID terbesar
     * adalah Tracking yang paling baru dibuat, sehingga aman dipakai
     * sebagai urutan default untuk scope gabungan ADM P1 + P4.
     */
    return Number(second.id) - Number(first.id);
  };

  const sortedData = computed(() => {
    const result = [...baseFiltered.value];

    /*
     * Server-paged Tracking sudah difilter dan disort secara global di backend.
     * Jangan sort ulang hanya 10/20/50/100 row page aktif di browser.
     */
    if (trackingServerPaged.value) {
      return result;
    }

    if (sortKey.value === null || sortDirection.value === 'none') {
      return isAdmP1P4TrackingScope.value
        ? result.sort(compareTrackingByLatestUpload)
        : result;
    }
    const key = sortKey.value;
    return result.sort((first, second) => {
      const firstValue = String(first[key] ?? '');
      const secondValue = String(second[key] ?? '');
      const compared = firstValue.localeCompare(secondValue, 'id', {
        numeric: true
      });
      return sortDirection.value === 'asc' ? compared : -compared;
    });
  });
  const totalPages = computed(() => {
    const totalRows = trackingServerPaged.value
      ? trackingServerTotal.value
      : sortedData.value.length;
    return Math.max(1, Math.ceil(totalRows / trackingRowsPerPage.value));
  });
  const paginatedData = computed(() => {
    if (trackingServerPaged.value) {
      return [...sortedData.value];
    }
    const start = (currentPage.value - 1) * trackingRowsPerPage.value;
    return sortedData.value.slice(start, start + trackingRowsPerPage.value);
  });
  /*
  * Hanya tampilkan maksimal lima nomor halaman,
  * sama seperti Format Sales Order.
  */
  const trackingVisiblePages = computed(() => {
    const total = totalPages.value;
    const current = currentPage.value;
    let start = Math.max(1, current - 2);
    let end = Math.min(total, start + 4);
    start = Math.max(1, end - 4);
    return Array.from({
      length: end - start + 1
    }, (_, index) => start + index);
  });
  const showingStart = computed(() => {
    const totalRows = trackingServerPaged.value ? trackingServerTotal.value : sortedData.value.length;
    if (totalRows === 0) return 0;
    return (currentPage.value - 1) * trackingRowsPerPage.value + 1;
  });
  const showingEnd = computed(() => {
    const totalRows = trackingServerPaged.value ? trackingServerTotal.value : sortedData.value.length;
    return Math.min(currentPage.value * trackingRowsPerPage.value, totalRows);
  });
  const trackingDisplayTotal = computed(() =>
    trackingServerPaged.value ? trackingServerTotal.value : sortedData.value.length
  );
  const trackingFirstPage = () => {
    currentPage.value = 1;
  };
  const nextPage = () => {
    if (currentPage.value < totalPages.value) {
      currentPage.value++;
    }
  };
  const prevPage = () => {
    if (currentPage.value > 1) {
      currentPage.value--;
    }
  };
  const trackingLastPage = () => {
    currentPage.value = totalPages.value;
  };
  const closeTrackingFilter = () => {
    columns.forEach((column) => {
      openFilters.value[column.key] = false;
    });
    activeFilterKey.value = null;
    clearAnchoredFilterPopup();
  };
  /* =====================================================
* GLOBAL POPUP CONTROLLER
* =====================================================
*
* Semua popup/dropdown pada halaman Upload SO
* harus melalui controller ini.
*
* Tujuan:
*
* - hanya satu popup boleh tampil
* - Customer vs Order Date tidak bertumpuk
* - Raw Filter vs Format Filter tidak bertumpuk
* - Tracking Filter vs Status/User/Remarks tidak bertumpuk
* - dropdown Customer/User pada modal upload tidak bertumpuk
* =================================================== */
  // ============================================================
  // GLOBAL POPUP CONTROLLER
  // ============================================================

  function closeAllPopups(): void {
    clearAnchoredFilterPopup();

    // ========================================================
    // HEADER
    // ========================================================

    showHeaderCustomerDropdown.value =
      false;

    showOrderDateFilter.value =
      false;

    showDeliveryDateFilter.value =
      false;

    showCreationDateFilter.value =
      false;


    // ========================================================
    // UPLOAD FORM
    // ========================================================

    showCustomerDropdown.value =
      false;

    showUploadUserDropdown.value =
      false;


    // ========================================================
    // RAW FILE FILTER
    // ========================================================

    card2Columns.forEach(
      (
        column
      ) => {
        card2OpenFilters
          .value[
          column.key
        ] =
          false;
      }
    );

    card2ActiveFilterKey.value =
      null;

    tmminRawSoColumns.forEach(
      (
        column
      ) => {
        tmminRawSoOpenFilters
          .value[
          column.key
        ] =
          false;
      }
    );

    tmminRawSoActiveFilterKey
      .value =
      null;

    ntcRawSoOpenFilters.value = {};
    ntcRawSoActiveFilterKey.value = null;

    gayaRawSoOpenFilters.value = {};
    gayaRawSoActiveFilterKey.value = null;

    asiAdmRawSoOpenFilters.value = {};
    asiAdmRawSoActiveFilterKey.value = null;

    dcwaRawSoOpenFilters.value = {};
    dcwaRawSoActiveFilterKey.value = null;

    dpmRawSoOpenFilters.value = {};
    dpmRawSoActiveFilterKey.value = null;

    ftiRawSoOpenFilters.value = {};
    ftiRawSoActiveFilterKey.value = null;


    // ========================================================
    // FORMAT SALES ORDER FILTER
    // ========================================================

    formatSOColumns.forEach(
      (
        column
      ) => {
        formatSOOpenFilters
          .value[
          column.key
        ] =
          false;
      }
    );

    formatSOActiveFilterKey.value =
      null;


    // ========================================================
    // TRACKING COLUMN FILTER
    // ========================================================

    columns.forEach(
      (
        column
      ) => {
        openFilters
          .value[
          column.key
        ] =
          false;
      }
    );

    activeFilterKey.value =
      null;


    // ========================================================
    // TRACKING USER
    // ========================================================

    openTrackingUploadUserId.value =
      null;


    // ========================================================
    // TRACKING STATUS
    // ========================================================

    openTrackingStatusId.value =
      null;


    // ========================================================
    // TRACKING REMARKS
    // ========================================================

    openTrackingRemarksId.value =
      null;

    activeTrackingRemarksDraft.value =
      '';


    // ========================================================
    // DN CROSSCHECK FILTER
    // ========================================================

    dnCrosscheckColumns
      .forEach(
        (
          column
        ) => {
          dnCrosscheckOpenFilters
            .value[
            column.key
          ] =
            false;
        }
      );

    dnCrosscheckActiveFilterKey.value =
      null;
  }
  /* =====================================================
  * HEADER CUSTOMER POPUP
  * =================================================== */
  const toggleHeaderCustomerDropdown =
    (): void => {
      const willOpen =
        !showHeaderCustomerDropdown.value;

      closeAllPopups();

      if (!willOpen) {
        return;
      }

      /*
      * selectedCustomers kosong
      * berarti filter aktif = All Customer.
      *
      * Dropdown dibuka LANGSUNG dari cache/seed lokal. Refresh opsi database
      * dijalankan background supaya klik Customer tidak terasa lag.
      */
      if (
        selectedCustomers.value.length === 0
      ) {
        draftSelectedCustomers.value = [
          ...customerOptions
        ];
      } else {
        draftSelectedCustomers.value = [
          ...selectedCustomers.value
        ];
      }

      showHeaderCustomerDropdown.value =
        true;

      void loadCustomerOptions();
    };
  /* =====================================================
  * ORDER DATE POPUP
  * =================================================== */
  const toggleOrderDateFilterPopup = () => {
    syncTodayDate();

    const willOpen =
      !showOrderDateFilter.value;

    closeAllPopups();

    if (willOpen) {
      showOrderDateFilter.value =
        true;
    }
  };

  /* =====================================================
   * DELIVERY DATE POPUP
   * =================================================== */
  const toggleDeliveryDateFilterPopup =
    () => {
      syncTodayDate();

      const willOpen =
        !showDeliveryDateFilter
          .value;

      closeAllPopups();

      if (
        willOpen
      ) {
        showDeliveryDateFilter
          .value =
          true;
      }
    };

  /* =====================================================
   * CREATION DATE POPUP
   * =================================================== */
  const toggleCreationDateFilterPopup =
    () => {
      syncTodayDate();

      const willOpen =
        !showCreationDateFilter.value;

      closeAllPopups();

      if (willOpen) {
        showCreationDateFilter.value =
          true;
      }
    };
  /* =====================================================
* UPLOAD FORM - CUSTOMER DROPDOWN
* =================================================== */
  const toggleUploadCustomerDropdown = () => {
    const willOpen = !showCustomerDropdown.value;
    closeAllPopups();
    if (willOpen) {
      showCustomerDropdown.value =
        true;
    }
  };
  /* =====================================================
  * UPLOAD FORM - USER DROPDOWN
  * =================================================== */
  const toggleUploadUserDropdown = () => {
    if (!canSelectUploadUser.value) {
      showUploadUserDropdown.value = false;
      return;
    }

    const willOpen = !showUploadUserDropdown.value;
    closeAllPopups();
    if (willOpen) {
      showUploadUserDropdown.value =
        true;
    }
  };
  const toggleDropdown = (key: ColumnKey, event?: MouseEvent) => {
    const isCurrentlyOpen = activeFilterKey.value ===
      key;
    /*
    * Tutup semua popup halaman.
    */
    closeAllPopups();
    if (isCurrentlyOpen) {
      return;
    }
    const trigger = event?.currentTarget as HTMLElement | null;
    if (!trigger) {
      return;
    }
    setAnchoredFilterPopup(
      trigger,
      (anchor) => {
        trackingFilterPopupPosition.value =
          getSafeRawFilterPopupPosition(anchor, 300, 360);
      }
    );
    activeFilterKey.value =
      key;
    openFilters.value[key] = true;

    /*
     * Opsi checkbox diambil dari endpoint DISTINCT-ish yang bounded.
     * Membuka popup tidak pernah mengubah tabel menjadi full hydration.
     */
    if (trackingServerPaged.value) {
      const searchValue = String(searchFilters.value[key] ?? '').trim();

      if (!restoreTrackingFilterOptionsFromCache(key, searchValue)) {
        void loadTrackingFilterOptions(key);
      }
    }
  };
  const getSelectedValues = (key: ColumnKey): string[] => {
    return selectedFilters.value[key] || [];
  };
  const getSearchValue = (key: ColumnKey): string => {
    return searchFilters.value[key] || '';
  };
  const setSearchValue = (key: ColumnKey, value: string) => {
    searchFilters.value[key] = String(value ?? '');

    if (
      trackingServerPaged.value &&
      openFilters.value[key]
    ) {
      const keyword = searchFilters.value[key].trim();

      if (
        keyword === '' ||
        keyword.length >= TRACKING_REMOTE_FILTER_MIN_SEARCH_LENGTH
      ) {
        if (!restoreTrackingFilterOptionsFromCache(key, keyword)) {
          scheduleTrackingFilterOptionsLoad(key);
        }
      } else {
        const previousTimer = trackingFilterSearchTimers.get(key);
        if (previousTimer) {
          clearTimeout(previousTimer);
          trackingFilterSearchTimers.delete(key);
        }

        const previousController = trackingFilterAbortControllers.get(key);
        previousController?.abort();
        trackingRemoteFilterLoading.value[key] = false;
      }
    }
  };
  const toggleFilter = (key: ColumnKey, value: string) => {
    const selected = [...getSelectedValues(key)];
    const index = selected.indexOf(value);
    if (index < 0) {
      selected.push(value);
    }
    else {
      selected.splice(index, 1);
    }
    selectedFilters.value[key] = selected;
  };
  const toggleAllColumn = (key: ColumnKey) => {
    const options = getFilteredColumnOptions(key);
    const selected = getSelectedValues(key);
    const allSelected = options.length > 0 &&
      options.every((option) => {
        return selected.includes(option);
      });
    selectedFilters.value[key] = allSelected ? [] : [...options];
  };
  const clearColumnFilter = (key: ColumnKey) => {
    selectedFilters.value[key] = [];
    selectedColorFilters.value[key] = [];
    searchFilters.value[key] = '';

    if (
      trackingServerPaged.value &&
      openFilters.value[key]
    ) {
      if (!restoreTrackingFilterOptionsFromCache(key, '')) {
        void loadTrackingFilterOptions(key);
      }
    }
  };
  const isAllSelected = (key: ColumnKey): boolean => {
    const options = getFilteredColumnOptions(key);
    const selected = getSelectedValues(key);
    return (options.length > 0 &&
      options.every((option) => {
        return selected.includes(option);
      }));
  };
  const isFilterSelected = (key: ColumnKey, value: string): boolean => {
    return getSelectedValues(key).includes(value);
  };
  const getSelectedLabel = (key: ColumnKey): string => {
    const textCount = getSelectedValues(key).length;
    const colorCount = selectedColorFilters.value[key].length;
    if (textCount > 0 && colorCount > 0) {
      return `${textCount} text, ` + `${colorCount} color`;
    }
    if (textCount > 0) {
      return `${textCount} selected`;
    }
    if (colorCount > 0) {
      return `${colorCount} color`;
    }
    return 'All';
  };
  const setTrackingSort = (key: ColumnKey, direction: SortDirection) => {
    sortKey.value = direction === 'none' ? null : key;
    sortDirection.value = direction;
    currentPage.value = 1;

    if (trackingServerPaged.value) {
      void loadTrackingData();
    }
  };
  const getTrackingSortDirection = (key: ColumnKey): SortDirection => {
    return sortKey.value === key ? sortDirection.value : 'none';
  };
  let trackingFilterReloadTimer: ReturnType<typeof setTimeout> | null = null;

  const scheduleTrackingTableReload = (): void => {
    if (trackingFilterReloadTimer !== null) {
      clearTimeout(trackingFilterReloadTimer);
    }

    trackingFilterReloadTimer = setTimeout(() => {
      trackingFilterReloadTimer = null;
      void loadTrackingData();
    }, 80);
  };

  watch(selectedFilters, () => {
    // Filter lain berubah: entry cache lama tidak lagi relevan.
    // Daftar yang sedang terbuka tetap dipertahankan agar checkbox tidak lompat.
    clearTrackingFilterOptionsCacheEntries();
    currentPage.value = 1;
    scheduleTrackingTableReload();
  }, { deep: true });

  watch(selectedColorFilters, () => {
    clearTrackingFilterOptionsCacheEntries();
    currentPage.value = 1;
    scheduleTrackingTableReload();
  }, { deep: true });

  watch(trackingRowsPerPage, () => {
    currentPage.value = 1;
    void loadTrackingData();
  });
  watch(currentPage, (page, previous) => {
    if (trackingServerPaged.value && page !== previous && !isLoadingTracking.value) {
      void loadTrackingData();
    }
  });
  watch(totalPages, (total: number) => {
    if (currentPage.value > total) {
      currentPage.value = total;
    }
  });
  // ========================================================
  // SHARED ACTIONS & INITIAL LOAD
  // ========================================================
  const validateHeaderDateInput = (
    from: string,
    to: string,
    label: string,
    maxAllowedDate: string
  ): boolean => {
    syncTodayDate();

    const normalizedFrom =
      String(from ?? '').trim();

    const normalizedTo =
      String(to ?? '').trim();

    const normalizedMax =
      String(maxAllowedDate ?? '').trim();

    if (
      normalizedFrom === '' &&
      normalizedTo === ''
    ) {
      return true;
    }

    if (normalizedFrom === '') {
      notificationStore.showAlertWarning(
        `${label} From wajib diisi`
      );

      return false;
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(normalizedMax)
    ) {
      notificationStore.showAlertWarning(
        `Tanggal maksimum ${label} tidak valid`
      );

      return false;
    }

    if (normalizedFrom > normalizedMax) {
      notificationStore.showAlertWarning(
        `${label} From tidak boleh melewati tanggal data terbaru (${normalizedMax})`
      );

      return false;
    }

    if (
      normalizedTo !== '' &&
      normalizedTo > normalizedMax
    ) {
      notificationStore.showAlertWarning(
        `${label} To tidak boleh melewati tanggal data terbaru (${normalizedMax})`
      );

      return false;
    }

    if (
      normalizedTo !== '' &&
      normalizedTo < normalizedFrom
    ) {
      notificationStore.showAlertWarning(
        `${label} To tidak boleh lebih kecil dari From`
      );

      return false;
    }

    const effectiveTo =
      resolveOptionalToDate(
        normalizedFrom,
        normalizedTo,
        normalizedMax
      );

    const fromTime =
      parseDownloadIsoDate(
        normalizedFrom
      );

    const toTime =
      parseDownloadIsoDate(
        effectiveTo
      );

    if (
      fromTime !== null &&
      toTime !== null &&
      Math.floor(
        (toTime - fromTime) /
        86400000
      ) + 1 > 31
    ) {
      notificationStore.showAlertWarning(
        `${label} maksimal 1 bulan (31 hari)`
      );

      return false;
    }

    return true;
  };

  const applyOrderDateFilter =
    async () => {
      if (
        !validateHeaderDateInput(
          fromDate.value,
          toDate.value,
          'Order Date',
          maxOrderDate.value
        )
      ) {
        return;
      }

      showOrderDateFilter.value =
        false;

      card2CurrentPage.value = 1;
      formatSOCurrentPage.value = 1;
      currentPage.value = 1;
      dnCrosscheckCurrentPage.value = 1;

      invalidateTrackingFilterOptionsCache();

      await Promise.all([
        fetchCard2Data(),
        loadFormatSalesOrder(),
        loadTrackingData()
      ]);

      await reloadDnCrosscheckAfterGlobalFilter();
    };

  const clearOrderDateFilter =
    async () => {
      fromDate.value = '';
      toDate.value = '';

      showOrderDateFilter.value =
        false;

      card2CurrentPage.value = 1;
      formatSOCurrentPage.value = 1;
      currentPage.value = 1;
      dnCrosscheckCurrentPage.value = 1;

      invalidateTrackingFilterOptionsCache();

      await Promise.all([
        fetchCard2Data(),
        loadFormatSalesOrder(),
        loadTrackingData()
      ]);

      await reloadDnCrosscheckAfterGlobalFilter();
    };

  // ========================================================
  // APPLY DELIVERY DATE FILTER
  // ========================================================

  const applyDeliveryDateFilter =
    async () => {
      if (
        !validateHeaderDateInput(
          deliveryFromDate.value,
          deliveryToDate.value,
          'Delivery Date',
          maxDeliveryDate.value
        )
      ) {
        return;
      }

      showDeliveryDateFilter.value =
        false;

      card2CurrentPage.value = 1;
      formatSOCurrentPage.value = 1;
      currentPage.value = 1;
      dnCrosscheckCurrentPage.value = 1;

      invalidateTrackingFilterOptionsCache();

      // Apply Delivery Date harus membaca hasil terbaru dari server.
      // Ini mencegah cache page lama (termasuk hasil 0) tetap tampil.
      formatSalesOrderService.clearCache();

      await Promise.all([
        fetchCard2Data(),
        loadFormatSalesOrder(),
        loadTrackingData()
      ]);

      await reloadDnCrosscheckAfterGlobalFilter();
    };

  // ========================================================
  // CLEAR DELIVERY DATE FILTER
  // ========================================================

  const clearDeliveryDateFilter =
    async () => {
      deliveryFromDate.value = '';
      deliveryToDate.value = '';

      showDeliveryDateFilter.value =
        false;

      card2CurrentPage.value = 1;
      formatSOCurrentPage.value = 1;
      currentPage.value = 1;
      dnCrosscheckCurrentPage.value = 1;

      invalidateTrackingFilterOptionsCache();

      formatSalesOrderService.clearCache();

      await Promise.all([
        fetchCard2Data(),
        loadFormatSalesOrder(),
        loadTrackingData()
      ]);

      await reloadDnCrosscheckAfterGlobalFilter();
    };

  // ========================================================
  // APPLY / CLEAR CREATION DATE FILTER
  // ========================================================
  // Creation Date memfilter Raw Files, Format Sales Order, dan Tracking.

  const applyCreationDateFilter =
    async () => {
      if (
        !validateHeaderDateInput(
          creationFromDate.value,
          creationToDate.value,
          'Creation Date',
          todayDate.value
        )
      ) {
        return;
      }

      showCreationDateFilter.value =
        false;

      card2CurrentPage.value = 1;
      tmminRawSoCurrentPage.value = 1;
      formatSOCurrentPage.value = 1;
      currentPage.value = 1;

      invalidateTrackingFilterOptionsCache();

      await Promise.all([
        fetchCard2Data(),
        loadFormatSalesOrder(),
        loadTrackingData()
      ]);
    };

  const clearCreationDateFilter =
    async () => {
      creationFromDate.value = '';
      creationToDate.value = '';

      showCreationDateFilter.value =
        false;

      card2CurrentPage.value = 1;
      tmminRawSoCurrentPage.value = 1;
      formatSOCurrentPage.value = 1;
      currentPage.value = 1;

      invalidateTrackingFilterOptionsCache();

      await Promise.all([
        fetchCard2Data(),
        loadFormatSalesOrder(),
        loadTrackingData()
      ]);
    };

  const loadInitialData = async () => {
    initFormatSOFilters();

    // Initial page hanya memuat Raw SO. Format SO dan Tracking diaktifkan
    // secara lazy oleh IntersectionObserver ketika section mendekati viewport.
    formatSOSectionDirty = true;
    trackingSectionDirty = true;
    await fetchCard2Data();
  };

  // ============================================================
  // DN IN OFFICE
  // ============================================================

  const dnPasteText =
    ref('');

  const dnInOfficeDate =
    ref('');

  const dnCrosscheckRows =
    ref<DnCrosscheckRow[]>([]);

  const dnCrosscheckServerSummary = reactive({
    total: 0,
    found: 0,
    not_found: 0,
    open: 0,
    close: 0
  });
  // ============================================================
  // DN CROSSCHECK FOLLOW MAIN ORDER DATE FILTER
  // ============================================================


  const isCheckingDn =
    ref(false);

  // Summary Total/Open/Close punya loading state terpisah dari page table.
  // Page boleh tampil lebih dahulu tanpa menunggu agregat summary selesai.
  const isLoadingDnSummary =
    ref(false);

  // Menandai bahwa angka Total/Open/Close sudah pernah berhasil diterima.
  // Nilai summary terakhir tetap ditampilkan selama refresh berikutnya.
  const dnCrosscheckSummaryReady =
    ref(false);

  const isRegisteringDn =
    ref(false);


  // ============================================================
  // DN CROSSCHECK MODE
  // ============================================================

  type DnCrosscheckMode =
    'paste' |
    'all';

  const dnCrosscheckMode =
    ref<DnCrosscheckMode>(
      'paste'
    );

  const isCheckAllDnMode =
    computed(
      () =>
        dnCrosscheckMode.value ===
        'all'
    );


  // ============================================================
  // RESTORE VIEW MODE AFTER BACK TO PASTE -> CHECK ALL DN
  // ============================================================

  type DnMonitoringReturnView =
    'data' |
    'report' |
    'compare';

  const dnMonitoringReturnViewAfterPaste =
    ref<DnMonitoringReturnView>(
      'data'
    );


  const rememberDnMonitoringViewBeforePaste =
    (): void => {

      if (
        showDnMonitoringCompare
          .value
      ) {
        dnMonitoringReturnViewAfterPaste
          .value =
          'compare';

        return;
      }


      if (
        showDnMonitoringReport
          .value
      ) {
        dnMonitoringReturnViewAfterPaste
          .value =
          'report';

        return;
      }


      dnMonitoringReturnViewAfterPaste
        .value =
        'data';
    };


  const restoreDnMonitoringViewAfterCheckAll =
    async (): Promise<void> => {

      const targetView =
        dnMonitoringReturnViewAfterPaste
          .value;


      /*
       * PENTING:
       *
       * Jangan generate ulang report di sini.
       *
       * Tujuan fungsi ini hanya mengembalikan layout SECEPATNYA.
       * Report cache terakhir tetap dipakai sebagai snapshot,
       * sedangkan `isDnMonitoringReportStale = true` memberi tahu
       * bahwa report tersebut perlu diperbarui.
       */


      // ========================================================
      // DATA ONLY
      // ========================================================

      if (
        targetView ===
        'data'
      ) {
        showDnMonitoringReport
          .value =
          false;

        showDnMonitoringCompare
          .value =
          false;

        return;
      }


      /*
       * Report/Compare hanya bisa dipulihkan jika memang
       * ada snapshot report sebelumnya.
       */
      if (
        !hasDnMonitoringReportCache
          .value
      ) {
        showDnMonitoringReport
          .value =
          false;

        showDnMonitoringCompare
          .value =
          false;

        return;
      }


      // ========================================================
      // RESTORE CROSSCHECK VIEW
      // ========================================================

      if (
        targetView ===
        'compare'
      ) {
        showDnMonitoringReport
          .value =
          false;

        showDnMonitoringCompare
          .value =
          true;

        return;
      }


      // ========================================================
      // RESTORE REPORT ONLY
      // ========================================================

      showDnMonitoringCompare
        .value =
        false;

      showDnMonitoringReport
        .value =
        true;
    };


  const getLocalToday =
    (): string => {
      const now =
        new Date();

      const local =
        new Date(
          now.getTime() -
          now.getTimezoneOffset() *
          60 *
          1000
        );

      return local
        .toISOString()
        .slice(
          0,
          10
        );
    };

  dnInOfficeDate.value =
    getLocalToday();

  /*
  * ==========================================================
  * PARSE DN HASIL PASTE EXCEL
  * ==========================================================
  *
  * Mendukung:
  *
  * DN4126080019983A
  * DN4126080019982A
  *
  * maupun data hasil copy Excel yang
  * mengandung TAB / newline.
  */
  // Nomor operasional yang boleh masuk Register/Monitoring.
  // Paste Crosscheck sendiri menerima semua nomor non-kosong agar
  // nomor yang tidak tersedia tetap dapat muncul sebagai Not Found.
  const isDnMonitoringOrderNumber =
    (
      value: string,
      customer = ''
    ): boolean => {
      const number =
        String(value ?? '')
          .trim()
          .toUpperCase();

      if (!number) {
        return false;
      }

      /*
       * Logical DN customer tanpa prefix DN / SO / SP:
       *
       * - TMMIN     : Manifest
       * - NTC       : SM No
       * - GAYA MTR  : JIT Call
       *
       * GAYA MOTOR ikut diterima sebagai alias label UI/report.
       * Nomor customer-customer ini memang dapat berupa angka murni,
       * sehingga tidak boleh dibuang hanya karena tidak berawalan
       * DN / SO / SP.
       */
      const normalizedCustomer =
        String(customer ?? '')
          .trim()
          .toUpperCase();

      if (
        [
          'TMMIN',
          'NTC',
          'GAYA MTR',
          'GAYA MOTOR'
        ].includes(
          normalizedCustomer
        )
      ) {
        return true;
      }

      return /^(DN|SO|SP)/.test(
        number
      );
    };

  const parsedDnNumbers =
    computed<string[]>(() => {
      const raw =
        String(
          dnPasteText.value ??
          ''
        );

      const tokens =
        raw.split(
          /[\s,;]+/
        );

      const result:
        string[] = [];

      const seen =
        new Set<string>();

      const ignoredHeaders =
        new Set([
          'NO',
          'DN',
          'NODN',
          'DNNO',
          'NOMORDN',
          'ORDERNO',
          'ORDERNUMBER',
          'PONUMBER'
        ]);

      tokens.forEach(
        (
          token
        ) => {
          const dn =
            String(
              token ?? ''
            )
              .trim()
              .toUpperCase()
              .replace(
                /[^A-Z0-9]/g,
                ''
              );

          /*
           * Semua nomor hasil paste tetap dihitung.
           * Nomor yang tidak ada di Raw Files akan
           * dikembalikan backend sebagai Not Found.
           *
           * Hanya cell kosong dan header Excel sederhana
           * yang diabaikan.
           */
          if (
            !dn ||
            ignoredHeaders.has(dn)
          ) {
            return;
          }

          /*
          * Duplicate dalam hasil paste
          * cukup ditampilkan sekali.
          */
          if (
            seen.has(
              dn
            )
          ) {
            return;
          }

          seen.add(
            dn
          );

          result.push(
            dn
          );
        }
      );

      return result;
    });
  const dnCrosscheckTotal = computed<number>(() => {
    if (isCheckAllDnMode.value && dnCrosscheckServerPaged.value) {
      return dnCrosscheckServerSummary.total;
    }
    return dnCrosscheckSummaryRows.value.length;
  });

  // ============================================================
  // DN CROSSCHECK SUMMARY SOURCE
  // ============================================================

  const dnCrosscheckSummaryRows =
    computed<DnCrosscheckRow[]>(() => {

      /*
       * Paste Mode:
       * badge Total / Found / Not Found harus selalu merepresentasikan
       * seluruh nomor hasil paste, bukan hasil filter tabel.
       *
       * Check All Mode tetap mengikuti data yang sedang ditampilkan.
       */
      return isCheckAllDnMode.value
        ? dnCrosscheckDisplayRows.value
        : dnCrosscheckRows.value;

    });

  const dnCrosscheckFound = computed<number>(() => {
    if (isCheckAllDnMode.value && dnCrosscheckServerPaged.value) {
      return dnCrosscheckServerSummary.found;
    }
    return dnCrosscheckSummaryRows.value.filter((row) => row.found === true).length;
  });

  const dnCrosscheckNotFound = computed<number>(() => {
    if (isCheckAllDnMode.value && dnCrosscheckServerPaged.value) {
      return dnCrosscheckServerSummary.not_found;
    }
    return dnCrosscheckSummaryRows.value.filter((row) => row.found !== true).length;
  });


  const dnCrosscheckClose = computed<number>(() => {
    if (isCheckAllDnMode.value && dnCrosscheckServerPaged.value) {
      return dnCrosscheckServerSummary.close;
    }
    return dnCrosscheckSummaryRows.value.filter(
      (row) => row.found === true && row.registered === true
    ).length;
  });

  const dnCrosscheckOpen = computed<number>(() => {
    if (isCheckAllDnMode.value && dnCrosscheckServerPaged.value) {
      return dnCrosscheckServerSummary.open;
    }
    return dnCrosscheckSummaryRows.value.filter(
      (row) => row.found === true && row.registered !== true
    ).length;
  });
  const dedupeDnCrosscheckRows = (rows: DnCrosscheckRow[]): DnCrosscheckRow[] => {
    const uniqueRows = new Map<string, DnCrosscheckRow>();
    rows.forEach((row) => {
      const key = String(row.order_no || row.dn_number || '')
        .trim()
        .toUpperCase();
      if (key) uniqueRows.set(key, row);
    });
    return Array.from(uniqueRows.values());
  };

  const applyDnCrosscheckServerSummary = (response: any): boolean => {
    if (response?.status !== 'success' || !response?.data) return false;

    const total = Number(response.data.total ?? 0);
    const found = Number(response.data.found ?? 0);
    const notFound = Number(response.data.not_found ?? 0);
    const open = Number(response.data.open ?? 0);
    const close = Number(response.data.close ?? 0);
    const values = [total, found, notFound, open, close];

    /*
     * Endpoint summary ini khusus Check All DN. Semua row berasal dari Raw
     * Files sehingga semuanya FOUND: found === total dan not_found === 0.
     * Validasi ketat juga menolak payload/cache lama yang secara aritmetika
     * tampak valid tetapi mengembalikan Total > 0 dengan Open/Close = 0.
     */
    const isValid =
      values.every((value) => Number.isFinite(value) && value >= 0) &&
      found === total &&
      notFound === 0 &&
      open + close === total;

    if (!isValid) {
      dnCrosscheckSummaryReady.value = false;
      return false;
    }

    dnCrosscheckServerSummary.total = total;
    dnCrosscheckServerSummary.found = found;
    dnCrosscheckServerSummary.not_found = notFound;
    dnCrosscheckServerSummary.open = open;
    dnCrosscheckServerSummary.close = close;
    dnCrosscheckSummaryReady.value = true;
    return true;
  };

  const normalizeDnServerFilterValue = (
    key: DnCrosscheckKey,
    value: string
  ): string => {
    const raw = toRawFilterOption(String(value ?? '').trim());

    if (
      ['order_date', 'delivery_date', 'registered_date'].includes(key) &&
      /^\d{1,2}-[A-Za-z]{3}-\d{2,4}$/.test(raw)
    ) {
      return normalizeSelectedOrderDate(raw) || raw;
    }

    if (key === 'status') {
      const normalized = raw.trim().toUpperCase();
      if (normalized === 'NOT FOUND') return 'NOT_FOUND';
      return normalized;
    }

    return raw;
  };

  const buildDnCrosscheckServerFilters = (
    excludeKey: DnCrosscheckKey | '' = ''
  ): Record<string, string[]> => {
    const result: Record<string, string[]> = {};

    dnCrosscheckColumns.forEach((column) => {
      const key = column.key;
      if (key === excludeKey) return;

      const selected = dnCrosscheckSelectedFilters.value[key] ?? [];
      if (selected.length === 0) return;

      result[key] = Array.from(
        new Set(
          selected.map((value) => normalizeDnServerFilterValue(key, value))
        )
      );
    });

    return result;
  };

  /*
   * Badge Total / Close / Open tidak boleh ikut berubah hanya karena user
   * menekan quick filter Keterangan Close/Open. Summary tetap mewakili
   * keseluruhan scope customer + tanggal + filter kolom LAIN yang aktif.
   *
   * Dengan memisahkan filter summary dari filter page, klik Close/Open tidak
   * memicu hitung ulang summary dan angka badge tetap akurat.
   */
  const buildDnCrosscheckSummaryFilters = (): Record<string, string[]> => {
    return buildDnCrosscheckServerFilters('status');
  };

  const isDnQuickStatusPageFilter = (
    filters: Record<string, string[]>
  ): boolean => {
    const statusValues = filters.status ?? [];

    return (
      statusValues.length > 0 &&
      statusValues.every((value) =>
        ['OPEN', 'CLOSE', 'FOUND', 'NOT_FOUND'].includes(
          String(value ?? '').trim().toUpperCase()
        )
      )
    );
  };

  /*
   * Fallback summary dari response page Open/Close.
   *
   * Endpoint page sudah selalu mengembalikan `total` untuk filter status yang
   * sedang diminta. Jadi bila endpoint aggregate summary gagal / cache summary
   * lama tidak valid, angka badge tetap bisa dipulihkan TANPA hydrate seluruh
   * 11 ribu DN ke browser. Hanya page kecil 10/20/50/100 row yang dipakai.
   *
   * Pada Check All DN seluruh row adalah FOUND, sehingga:
   * total = open + close, not_found = 0.
   */
  const applyDnQuickStatusTotalFromPage = (
    filters: Record<string, string[]>,
    payload: any
  ): boolean => {
    const statusValues = Array.from(
      new Set(
        (filters.status ?? [])
          .map((value) => String(value ?? '').trim().toUpperCase())
          .filter(Boolean)
      )
    );

    if (statusValues.length !== 1) return false;

    const status = statusValues[0];
    if (status !== 'OPEN' && status !== 'CLOSE') return false;

    const statusTotal = Number(payload?.total ?? NaN);
    if (!Number.isFinite(statusTotal) || statusTotal < 0) return false;

    if (status === 'OPEN') {
      dnCrosscheckServerSummary.open = statusTotal;
    } else {
      dnCrosscheckServerSummary.close = statusTotal;
    }

    const baseTotal = Number(dnCrosscheckServerSummary.total ?? 0);

    if (Number.isFinite(baseTotal) && baseTotal >= statusTotal && baseTotal >= 0) {
      dnCrosscheckServerSummary.found = baseTotal;
      dnCrosscheckServerSummary.not_found = 0;

      if (status === 'OPEN') {
        dnCrosscheckServerSummary.close = Math.max(0, baseTotal - statusTotal);
      } else {
        dnCrosscheckServerSummary.open = Math.max(0, baseTotal - statusTotal);
      }

      dnCrosscheckSummaryReady.value =
        dnCrosscheckServerSummary.open + dnCrosscheckServerSummary.close === baseTotal;
    }

    return true;
  };

  const prefetchDnQuickStatusFirstPages = (
    params: FilterParams,
    customers: string[],
    baseFilters: Record<string, string[]>,
    sortKey: string,
    sortDirection: SortDirection,
    requestSerial = dnCrosscheckPageRequestSerial
  ): void => {
    const statuses = ['OPEN', 'CLOSE'] as const;

    /*
     * Prefetch dibuat SEQUENTIAL supaya database tidak menerima dua query
     * status bersamaan. Masing-masing hanya mengambil page pertama sesuai
     * Show 10/20/50/100 dan hasilnya masuk cache kecil sessionStorage.
     */
    void (async () => {
      for (const status of statuses) {
        if (requestSerial !== dnCrosscheckPageRequestSerial) return;

        if (dnCrosscheckSummaryReady.value) {
          const expectedTotal =
            status === 'OPEN'
              ? dnCrosscheckServerSummary.open
              : dnCrosscheckServerSummary.close;

          if (expectedTotal <= 0) {
            continue;
          }
        }

        const statusFilters: Record<string, string[]> = {
          ...baseFilters,
          status: [status]
        };

        const cached = customerOrderService.getCachedAllDnStatusPage(
          params,
          customers,
          1,
          dnCrosscheckRowsPerPage.value,
          statusFilters,
          sortKey,
          sortDirection
        );

        if (
          cached?.status === 'success' &&
          !customerOrderService.shouldRevalidateAllDnStatusPage(
            params,
            customers,
            1,
            dnCrosscheckRowsPerPage.value,
            statusFilters,
            sortKey,
            sortDirection
          )
        ) {
          if (requestSerial !== dnCrosscheckPageRequestSerial) return;
          applyDnQuickStatusTotalFromPage(statusFilters, cached);
          continue;
        }

        try {
          const response = await customerOrderService.getAllDnStatusPage(
            params,
            customers,
            1,
            dnCrosscheckRowsPerPage.value,
            statusFilters,
            sortKey,
            sortDirection
          );

          if (
            requestSerial === dnCrosscheckPageRequestSerial &&
            response?.status === 'success'
          ) {
            applyDnQuickStatusTotalFromPage(statusFilters, response);
          }
        } catch {
          // Best effort. Jika prefetch belum tersedia, klik status tetap
          // melakukan silent refresh tanpa mengosongkan tabel.
        }
      }
    })();
  };

  const refreshDnCrosscheckServerSummary = async (
    params: FilterParams,
    customers: string[],
    filters: Record<string, string[]> = {},
    preferCache = true,
    signal?: AbortSignal,
    requestSerial = dnCrosscheckPageRequestSerial,
    showLoading = true
  ): Promise<void> => {
    const isLatestRequest = (): boolean =>
      requestSerial === dnCrosscheckPageRequestSerial &&
      !signal?.aborted;

    try {
      if (preferCache) {
        const cached = customerOrderService.getCachedAllDnStatusSummary(
          params,
          customers,
          filters
        );
        if (
          isLatestRequest() &&
          cached?.status === 'success' &&
          cached.data &&
          applyDnCrosscheckServerSummary(cached)
        ) {
          isLoadingDnSummary.value = false;

          if (
            !customerOrderService.shouldRevalidateAllDnStatusSummary(
              params,
              customers,
              filters
            )
          ) {
            return;
          }
        }
      }

      if (!isLatestRequest()) return;
      if (showLoading) {
        isLoadingDnSummary.value = true;
      }
      const response = await customerOrderService.getAllDnStatusSummary(
        params,
        customers,
        filters,
        signal
      );
      if (!isLatestRequest()) return;
      applyDnCrosscheckServerSummary(response);
    } catch (error: any) {
      const cancelled =
        signal?.aborted ||
        error?.code === 'ERR_CANCELED' ||
        error?.name === 'CanceledError' ||
        error?.name === 'AbortError';
      if (!cancelled && isLatestRequest()) {
        console.warn('DN summary gagal:', error);
      }
    } finally {
      if (isLatestRequest() && showLoading) {
        isLoadingDnSummary.value = false;
      }
    }
  };

  const loadAllDnStatus = async (resetPage = true): Promise<void> => {
    const requestSerial = ++dnCrosscheckPageRequestSerial;
    dnCrosscheckPageAbortController?.abort();
    const controller = new AbortController();
    dnCrosscheckPageAbortController = controller;
    // Request baru mengambil alih state loading summary dari request lama yang
    // baru saja dibatalkan. Bila memang perlu fetch summary, state akan
    // diaktifkan lagi oleh request terbaru.
    isLoadingDnSummary.value = false;

    const isLatestRequest = (): boolean =>
      requestSerial === dnCrosscheckPageRequestSerial &&
      !controller.signal.aborted;
    let servedFromCache = false;

    try {
      if (resetPage) {
        dnCrosscheckCurrentPage.value = 1;
      }

      if (dnCrosscheckServerPaged.value) {
        const params = getDateOnlyFilterParams();
        const customers = selectedCustomers.value
          .map((customer) => String(customer ?? '').trim().toUpperCase())
          .filter(Boolean);
        const filters = buildDnCrosscheckServerFilters();
        const summaryFilters = buildDnCrosscheckSummaryFilters();
        const sortKey = String(dnCrosscheckSortKey.value ?? '').trim();
        const sortDirection = dnCrosscheckSortDirection.value;
        const quickStatusOnly = isDnQuickStatusPageFilter(filters);
        const requestedPage = Math.max(1, Number(dnCrosscheckCurrentPage.value) || 1);
        const requestedPerPage = dnCrosscheckRowsPerPage.value;

        const applyPage = (payload: any) => {
          if (!isLatestRequest()) return;

          dnCrosscheckRows.value = dedupeDnCrosscheckRows(payload?.data ?? []);
          dnCrosscheckServerTotal.value = Number(payload?.total ?? 0);

          /*
           * Page normal menetapkan scope Total. Page quick-status tidak boleh
           * menimpa Total global, tetapi `payload.total` justru merupakan
           * jumlah Open/Close yang sangat berguna sebagai fallback summary.
           */
          if (!quickStatusOnly) {
            const pageTotal = Number(payload?.total ?? 0);
            dnCrosscheckServerSummary.total = pageTotal;
            dnCrosscheckServerSummary.found = pageTotal;
            dnCrosscheckServerSummary.not_found = 0;

            if (
              dnCrosscheckServerSummary.open +
                dnCrosscheckServerSummary.close !==
              pageTotal
            ) {
              dnCrosscheckSummaryReady.value = false;
            }
          } else {
            applyDnQuickStatusTotalFromPage(filters, payload);
          }

          const resolvedPage = Math.max(
            1,
            Number(payload?.page ?? requestedPage)
          );
          if (resolvedPage !== dnCrosscheckCurrentPage.value) {
            dnCrosscheckCurrentPage.value = resolvedPage;
          }
        };

        const cached = customerOrderService.getCachedAllDnStatusPage(
          params,
          customers,
          requestedPage,
          requestedPerPage,
          filters,
          sortKey,
          sortDirection
        );
        const cachedSummary = customerOrderService.getCachedAllDnStatusSummary(
          params,
          customers,
          summaryFilters
        );

        const cachedRows = Array.isArray(cached?.data)
          ? cached.data
          : [];

        const quickStatusValues = (filters.status ?? []).map((value) =>
          String(value ?? '').trim().toUpperCase()
        );

        const expectedQuickStatusTotal =
          quickStatusValues.length === 1 && quickStatusValues[0] === 'OPEN'
            ? dnCrosscheckServerSummary.open
            : quickStatusValues.length === 1 && quickStatusValues[0] === 'CLOSE'
              ? dnCrosscheckServerSummary.close
              : quickStatusValues.length === 1 && quickStatusValues[0] === 'FOUND'
                ? dnCrosscheckServerSummary.found
                : quickStatusValues.length === 1 && quickStatusValues[0] === 'NOT_FOUND'
                  ? dnCrosscheckServerSummary.not_found
                  : 0;

        const cachedQuickStatusIsStale =
          quickStatusOnly &&
          requestedPage === 1 &&
          (
            (!dnCrosscheckSummaryReady.value && Number(cached?.total ?? 0) <= 0) ||
            (Number(cached?.total ?? 0) > 0 && cachedRows.length === 0) ||
            (expectedQuickStatusTotal > 0 && Number(cached?.total ?? 0) <= 0)
          );

        if (cached?.status === 'success' && !cachedQuickStatusIsStale) {
          servedFromCache = true;
          applyPage(cached);
          if (!isLatestRequest()) return;
          isCheckingDn.value = false;

          const cachedSummaryApplied =
            cachedSummary?.status === 'success' &&
            Boolean(cachedSummary.data) &&
            applyDnCrosscheckServerSummary(cachedSummary);

          if (cachedSummaryApplied) {
            isLoadingDnSummary.value = false;
          }

          const pageNeedsRevalidate =
            customerOrderService.shouldRevalidateAllDnStatusPage(
              params,
              customers,
              requestedPage,
              requestedPerPage,
              filters,
              sortKey,
              sortDirection
            );
          const summaryNeedsRevalidate =
            !cachedSummaryApplied ||
            customerOrderService.shouldRevalidateAllDnStatusSummary(
              params,
              customers,
              summaryFilters
            );

          let effectivePage: any = cached;

          /*
           * Stale-while-revalidate: cache langsung tampil tanpa spinner.
           * Setelah 30 detik page yang sama dicek diam-diam. Ini menjaga F5
           * tetap cepat tetapi tidak membiarkan data browser lain tertahan
           * selama TTL 30 menit.
           */
          if (pageNeedsRevalidate) {
            const freshPage = await customerOrderService.getAllDnStatusPage(
              params,
              customers,
              requestedPage,
              requestedPerPage,
              filters,
              sortKey,
              sortDirection,
              controller.signal
            );

            if (!isLatestRequest()) return;
            if (freshPage.status !== 'success') {
              throw new Error(freshPage.message || 'Gagal merevalidasi page DN.');
            }

            if (
              quickStatusOnly &&
              requestedPage === 1 &&
              Number(freshPage.total ?? 0) > 0 &&
              (!Array.isArray(freshPage.data) || freshPage.data.length === 0)
            ) {
              throw new Error(
                'Data Open/Close terdeteksi tetapi page DN kosong. Silakan refresh setelah backend diperbarui.'
              );
            }

            applyPage(freshPage);
            effectivePage = freshPage;
          }

          if (summaryNeedsRevalidate && isLatestRequest()) {
            await refreshDnCrosscheckServerSummary(
              params,
              customers,
              summaryFilters,
              false,
              controller.signal,
              requestSerial,
              false
            );
          }

          if (!isLatestRequest()) return;

          if (
            dnCrosscheckCurrentPage.value <
            Number(effectivePage?.total_pages ?? 1)
          ) {
            void customerOrderService.prefetchAllDnStatusPage(
              params,
              customers,
              dnCrosscheckCurrentPage.value + 1,
              requestedPerPage,
              filters,
              sortKey,
              sortDirection
            );
          }

          prefetchDnQuickStatusFirstPages(
            params,
            customers,
            summaryFilters,
            sortKey,
            sortDirection,
            requestSerial
          );
          return;
        }

        /*
         * Cache miss pertama memang menampilkan loading. Khusus klik quick
         * status Close/Open, pertahankan tabel lama sampai page baru datang.
         */
        if (!quickStatusOnly || dnCrosscheckRows.value.length === 0) {
          isCheckingDn.value = true;
        }

        let summaryPromise: Promise<void> = Promise.resolve();
        const cachedSummaryApplied =
          isLatestRequest() &&
          cachedSummary?.status === 'success' &&
          Boolean(cachedSummary.data) &&
          applyDnCrosscheckServerSummary(cachedSummary);

        if (cachedSummaryApplied) {
          isLoadingDnSummary.value = false;

          if (
            customerOrderService.shouldRevalidateAllDnStatusSummary(
              params,
              customers,
              summaryFilters
            )
          ) {
            summaryPromise = refreshDnCrosscheckServerSummary(
              params,
              customers,
              summaryFilters,
              false,
              controller.signal,
              requestSerial,
              false
            );
          }
        } else {
          summaryPromise = refreshDnCrosscheckServerSummary(
            params,
            customers,
            summaryFilters,
            false,
            controller.signal,
            requestSerial,
            true
          );
        }

        const response = await customerOrderService.getAllDnStatusPage(
          params,
          customers,
          requestedPage,
          requestedPerPage,
          filters,
          sortKey,
          sortDirection,
          controller.signal
        );

        if (!isLatestRequest()) return;

        if (response.status !== 'success') {
          throw new Error(response.message || 'Gagal mengambil page DN.');
        }

        if (
          quickStatusOnly &&
          requestedPage === 1 &&
          Number(response.total ?? 0) > 0 &&
          (!Array.isArray(response.data) || response.data.length === 0)
        ) {
          throw new Error(
            'Data Open/Close terdeteksi tetapi page DN kosong. Silakan refresh setelah backend diperbarui.'
          );
        }

        applyPage(response);
        if (!isLatestRequest()) return;
        isCheckingDn.value = false;

        // Tabel sudah tampil; summary boleh selesai setelahnya tetapi tetap
        // menggunakan signal/serial request yang sama agar tidak stale.
        await summaryPromise;
        if (!isLatestRequest()) return;

        if (dnCrosscheckCurrentPage.value < Number(response.total_pages ?? 1)) {
          void customerOrderService.prefetchAllDnStatusPage(
            params,
            customers,
            dnCrosscheckCurrentPage.value + 1,
            requestedPerPage,
            filters,
            sortKey,
            sortDirection
          );
        }

        prefetchDnQuickStatusFirstPages(
          params,
          customers,
          summaryFilters,
          sortKey,
          sortDirection,
          requestSerial
        );
        return;
      }

      isCheckingDn.value = true;

      const rows = await loadBySelectedCustomers(
        async (params: FilterParams): Promise<DnCrosscheckRow[]> => {
          const response = await customerOrderService.getAllDnStatus(params);
          if (response.status !== 'success') {
            throw new Error(response.message || 'Gagal mengambil seluruh DN.');
          }
          return response.data ?? [];
        }
      );

      if (!isLatestRequest()) return;
      dnCrosscheckRows.value = dedupeDnCrosscheckRows(rows);
      dnCrosscheckServerTotal.value = dnCrosscheckRows.value.length;
    } catch (error: any) {
      const cancelled =
        controller.signal.aborted ||
        error?.code === 'ERR_CANCELED' ||
        error?.name === 'CanceledError' ||
        error?.name === 'AbortError';

      if (cancelled || !isLatestRequest()) {
        return;
      }

      if (servedFromCache) {
        console.warn('Revalidasi DN Crosscheck gagal; cache tetap dipakai.', error);
        return;
      }

      console.error('All DN Crosscheck Error:', error);
      console.error('Backend Response:', error.response?.data);

      if (dnCrosscheckRows.value.length === 0) {
        dnCrosscheckRows.value = [];
      }

      notificationStore.showAlertError(
        error.response?.data?.message ||
        error.message ||
        'Gagal mengambil seluruh status DN.'
      );
    } finally {
      if (dnCrosscheckPageAbortController === controller) {
        dnCrosscheckPageAbortController = null;
      }
      if (isLatestRequest()) {
        isCheckingDn.value = false;
      }
    }
  };

  // ============================================================
  // RELOAD CHECK ALL DN AFTER GLOBAL FILTER
  // ============================================================
  //
  // Jika user sedang:
  // - Data Only
  // - Report Only
  // - Crosscheck View
  //
  // mode tersebut tetap dipertahankan.
  //
  // Report lama menjadi snapshot stale dan dapat di-refresh
  // melalui tombol "Report Perlu Update".
  // ============================================================

  const reloadDnCrosscheckAfterGlobalFilter =
    async (): Promise<void> => {

      if (
        !isCheckAllDnMode
          .value
      ) {
        return;
      }


      if (
        showDnMonitoringCompare
          .value
      ) {
        dnMonitoringReturnViewAfterPaste
          .value =
          'compare';

      } else if (
        showDnMonitoringReport
          .value
      ) {
        dnMonitoringReturnViewAfterPaste
          .value =
          'report';

      } else {
        dnMonitoringReturnViewAfterPaste
          .value =
          'data';
      }


      dnCrosscheckServerPaged.value = true;
      await loadAllDnStatus();


      /*
       * Tunggu watcher dnCrosscheckRows menandai report stale.
       */
      await nextTick();


      /*
       * Restore layout tanpa generate report ulang.
       */
      await restoreDnMonitoringViewAfterCheckAll();
    };


  const toggleDnCheckAllMode =
    async (): Promise<void> => {
      /*
      * Tutup popup filter kolom.
      */
      closeDnCrosscheckFilter();

      /*
      * Reset pagination.
      */
      dnCrosscheckCurrentPage.value =
        1;

      /*
      * ========================================================
      * ALL -> PASTE
      * ========================================================
      */
      if (
        isCheckAllDnMode.value
      ) {
        /*
         * Simpan mode tampilan terakhir SEBELUM pindah ke
         * Paste Mode.
         *
         * Jika saat ini Crosscheck View:
         * mode yang disimpan = compare.
         */
        rememberDnMonitoringViewBeforePaste();


        dnCrosscheckMode.value =
          'paste';

        /*
        * DN yang sebelumnya dipaste
        * tidak perlu dihapus.
        *
        * Begitu kembali ke Paste Mode
        * hasil crosscheck dipulihkan.
        */
        await loadDnCrosscheckPreview();

        return;
      }


      /*
      * ========================================================
      * PASTE -> ALL
      * ========================================================
      */

      dnCrosscheckMode.value =
        'all';
      dnCrosscheckServerPaged.value = true;

      /*
      * Default Check All DN:
      * TOTAL selalu selected.
      */
      dnCrosscheckSelectedFilters
        .value
        .status = [];

      dnCrosscheckSearchFilters
        .value
        .status = '';


      /*
       * DN Paste tidak tampil pada Check All DN.
       * Bersihkan filter tersembunyi dari Paste Mode.
       */
      dnCrosscheckSelectedFilters
        .value
        .dn_number = [];

      dnCrosscheckSearchFilters
        .value
        .dn_number = '';


      dnCrosscheckCurrentPage
        .value =
        1;


      /*
       * Ambil All DN terbaru.
       *
       * Perubahan dnCrosscheckRows akan meng-invalidasi preview
       * report lama, tetapi period + date basis terakhir tetap ada.
       */
      await loadAllDnStatus();


      /*
       * Pastikan watcher dnCrosscheckRows selesai menandai
       * report sebagai stale sebelum layout dipulihkan.
       */
      await nextTick();


      /*
       * PENTING:
       *
       * Setelah Check All DN selesai, pulihkan mode tampilan
       * yang aktif sebelum user menekan Back to Paste.
       *
       * Contoh:
       *
       * Crosscheck View
       * -> Back to Paste
       * -> Check All DN
       * -> Crosscheck View otomatis kembali
       *
       * Report lama langsung tampil sebagai snapshot.
       * Jika data DN berubah, user akan melihat tombol
       * "Report Perlu Update" dan refresh dilakukan hanya
       * ketika tombol tersebut diklik.
       */
      await restoreDnMonitoringViewAfterCheckAll();
    };


  /*
  * ==========================================================
  * CROSSCHECK
  * ==========================================================
  */
  const loadDnCrosscheckPreview =
    async () => {
      const dnNumbers =
        parsedDnNumbers.value;

      if (
        dnNumbers.length === 0
      ) {
        dnCrosscheckRows.value =
          [];

        return;
      }

      try {
        isCheckingDn.value =
          true;

        const response =
          await customerOrderService
            .crosscheckDn(
              dnNumbers
            );

        if (
          response.status !==
          'success'
        ) {
          throw new Error(
            response.message ||
            'Crosscheck DN gagal.'
          );
        }

        dnCrosscheckRows.value =
          response.data ?? [];

        dnCrosscheckCurrentPage.value =
          1;

      } catch (error: any) {
        console.error(
          'DN preview error:',
          error
        );

        dnCrosscheckRows.value =
          [];

      } finally {
        isCheckingDn.value =
          false;
      }
    };

  let dnPreviewTimer:
    ReturnType<
      typeof setTimeout
    > |
    null = null;

  watch(
    dnPasteText,
    () => {
      /*
      * Saat mode Check All aktif,
      * textarea paste tidak boleh
      * menimpa seluruh data DN.
      */
      if (
        isCheckAllDnMode.value
      ) {
        return;
      }

      if (
        dnPreviewTimer !==
        null
      ) {
        clearTimeout(
          dnPreviewTimer
        );
      }

      if (
        parsedDnNumbers
          .value
          .length === 0
      ) {
        dnCrosscheckRows.value =
          [];

        return;
      }

      dnPreviewTimer =
        setTimeout(
          () => {
            void loadDnCrosscheckPreview();
          },
          350
        );
    }
  );


  const dnCrosscheckMainFilteredRows =
    computed<DnCrosscheckRow[]>(() => {
      let rows = [
        ...dnCrosscheckRows.value
      ];

      // =====================================================
      // 1. FILTER UTAMA - CUSTOMER
      // =====================================================

      const activeCustomers =
        selectedCustomers
          .value
          .map(
            (
              customer
            ) =>
              String(
                customer ?? ''
              )
                .trim()
                .toUpperCase()
          );

      /*
      * selectedCustomers = []
      * berarti All Customer.
      */
      if (
        activeCustomers.length >
        0
      ) {
        rows =
          rows.filter(
            (
              row
            ) => {
              if (
                !isCheckAllDnMode.value &&
                row.found !== true
              ) {
                return true;
              }

              const rowCustomer =
                String(
                  row.customer ?? ''
                )
                  .trim()
                  .toUpperCase();

              return activeCustomers
                .includes(
                  rowCustomer
                );
            }
          );
      }

      // =====================================================
      // 2. FILTER UTAMA - ORDER DATE FROM
      // =====================================================

      if (
        fromDate.value
      ) {
        rows =
          rows.filter(
            (
              row
            ) => {
              if (
                !isCheckAllDnMode.value &&
                row.found !== true
              ) {
                return true;
              }

              const orderDate =
                String(
                  row.order_date ?? ''
                )
                  .trim()
                  .slice(
                    0,
                    10
                  );

              if (!orderDate) {
                return false;
              }

              return (
                orderDate >=
                fromDate.value
              );
            }
          );
      }

      // =====================================================
      // 3. FILTER UTAMA - ORDER DATE TO
      // =====================================================

      if (
        toDate.value
      ) {
        rows =
          rows.filter(
            (
              row
            ) => {
              if (
                !isCheckAllDnMode.value &&
                row.found !== true
              ) {
                return true;
              }

              const orderDate =
                String(
                  row.order_date ?? ''
                )
                  .trim()
                  .slice(
                    0,
                    10
                  );

              if (!orderDate) {
                return false;
              }

              return (
                orderDate <=
                toDate.value
              );
            }
          );
      }

      return rows;
    });

  // ============================================================
  // DN REGISTER BUTTON STATE
  // ============================================================

  const isAllDnRegistered =
    computed<boolean>(() => {
      if (isCheckAllDnMode.value && dnCrosscheckServerPaged.value) {
        return dnCrosscheckFound.value > 0 && dnCrosscheckOpen.value === 0;
      }

      /*
       * Status tombol Register hanya melihat DN yang FOUND.
       * NOT_FOUND tidak boleh membuat tombol seolah-olah masih
       * mempunyai DN yang dapat dipost.
       *
       * Paste Mode memakai seluruh hasil paste, bukan hasil filter
       * tabel/pagination. Check All Mode tetap mengikuti source summary
       * yang sudah ditentukan sebelumnya.
       */
      const foundRows =
        dnCrosscheckSummaryRows
          .value
          .filter(
            (row) =>
              row.found === true
          );

      if (foundRows.length === 0) {
        return false;
      }

      return foundRows.every(
        (row) =>
          row.registered === true
      );
    });


  const dnRegisterDisabledMessage =
    computed<string>(() => {
      /*
      * Sedang proses register.
      */
      if (
        isRegisteringDn.value
      ) {
        return 'Sedang memproses DN Register...';
      }

      /*
      * Belum ada DN.
      */
      if (
        parsedDnNumbers
          .value
          .length === 0
      ) {
        return 'Paste nomor DN terlebih dahulu.';
      }

      /*
      * Semua DN sudah pernah dipost.
      */
      if (
        isAllDnRegistered.value
      ) {
        return 'Semua DN pada daftar ini sudah ter-post / registered.';
      }

      /*
      * Ada data tetapi tidak ada
      * yang memenuhi syarat register.
      */
      if (
        registerableDnRows
          .value
          .length === 0
      ) {
        return 'Tidak ada DN yang dapat diregister.';
      }

      return '';
    });


  const buildDnFilteredMutationPayload = () => {
    const params = getDateOnlyFilterParams();
    return {
      mode: 'filtered' as const,
      customers: selectedCustomers.value
        .map((customer) => String(customer ?? '').trim().toUpperCase())
        .filter(Boolean),
      from_date: params.from_date,
      to_date: params.to_date,
      delivery_from_date: params.delivery_from_date,
      delivery_to_date: params.delivery_to_date,
      filters: buildDnCrosscheckServerFilters()
    };
  };

  const registerableDnRows =
    computed<DnCrosscheckRow[]>(() => {
      /*
       * PENTING:
       * Jangan memakai dnCrosscheckDisplayRows di sini.
       * dnCrosscheckDisplayRows sudah terkena filter tabel seperti
       * Customer / Keterangan / tanggal / sorting. Akibatnya tombol
       * "Post DN for Register" sebelumnya hanya mengirim subset yang
       * sedang terlihat, misalnya 64 dari 390 FOUND.
       *
       * dnCrosscheckSummaryRows pada Paste Mode berisi SELURUH hasil
       * paste, sehingga satu kali Post akan meregister semua DN FOUND
       * yang masih OPEN, tanpa terpengaruh filter tabel atau pagination.
       */
      return dnCrosscheckSummaryRows
        .value
        .filter(
          (row) =>
            row.found === true &&
            row.registered !== true
        );
    });

  const dnCrosscheckRegisterableCount = computed<number>(() => {
    if (isCheckAllDnMode.value && dnCrosscheckServerPaged.value) {
      return dnCrosscheckOpen.value;
    }
    return registerableDnRows.value.length;
  });

  const registerDnInOffice =
    async () => {
      if (!requireUploadSoPermission('create')) {
        return;
      }

      if (
        !dnInOfficeDate.value
      ) {
        notificationStore
          .showAlertWarning(
            'Pilih DN In Office Date terlebih dahulu.'
          );

        return;
      }

      if (isCheckAllDnMode.value && dnCrosscheckServerPaged.value) {
        const totalOpen = dnCrosscheckRegisterableCount.value;
        if (totalOpen <= 0) {
          notificationStore.showAlertWarning('Tidak ada DN baru yang dapat diregister.');
          return;
        }

        notificationStore.showConfirm(
          'Register DN In Office',
          `Apakah Anda yakin ingin meregister ${totalOpen} DN OPEN pada hasil filter saat ini sebagai DN Registered tanggal ${formatDnCrosscheckDate(dnInOfficeDate.value)}?`,
          async () => {
            try {
              isRegisteringDn.value = true;
              const response = await customerOrderService.registerDnInOffice({
                ...buildDnFilteredMutationPayload(),
                dn_in_office_date: dnInOfficeDate.value
              } as any);
              if (response.status !== 'success') throw new Error(response.message);
              notificationStore.showAlertSuccess(response.message);
              await loadAllDnStatus();
            } catch (error: any) {
              notificationStore.showAlertError(
                error?.response?.data?.message || error?.message || 'Register DN gagal.'
              );
            } finally {
              isRegisteringDn.value = false;
            }
          }
        );
        return;
      }

      /*
       * Ambil seluruh DN registerable dari source paste dan dedupe lagi
       * secara defensive. Backend tetap melakukan canonical resolve
       * DN/SO/SP/Manifest TMMIN seperti sebelumnya.
       */
      const dnNumbers =
        Array.from(
          new Set(
            registerableDnRows
              .value
              .map(
                (row) =>
                  String(
                    row.dn_number ??
                    row.order_no ??
                    ''
                  )
                    .trim()
                    .toUpperCase()
              )
              .filter(Boolean)
          )
        );

      if (
        dnNumbers.length === 0
      ) {
        notificationStore
          .showAlertWarning(
            'Tidak ada DN baru yang dapat diregister.'
          );

        return;
      }

      notificationStore.showConfirm(
        'Register DN In Office',
        `Apakah Anda yakin ingin meregister ${dnNumbers.length} DN sebagai DN Registered tanggal ${formatDnCrosscheckDate(
          dnInOfficeDate.value
        )}?`,
        async () => {
          try {
            isRegisteringDn.value =
              true;

            const response =
              await customerOrderService
                .registerDnInOffice({
                  dn_numbers:
                    dnNumbers,

                  dn_in_office_date:
                    dnInOfficeDate.value
                });

            if (
              response.status !==
              'success'
            ) {
              throw new Error(
                response.message
              );
            }

            notificationStore
              .showAlertSuccess(
                response.message
              );

            await loadDnCrosscheckPreview();

          } catch (error: any) {
            notificationStore
              .showAlertError(
                error.response
                  ?.data
                  ?.message ||
                error.message ||
                'Register DN In Office gagal.'
              );

          } finally {
            isRegisteringDn.value =
              false;
          }
        }
      );
    };


  const dnCrosscheckColumns:
    TableColumn<
      DnCrosscheckKey
    >[] = [
      /*
       * No. DN menjadi kolom utama.
       *
       * Pada Check All DN:
       * DN Paste disembunyikan karena dn_number dan order_no
       * merupakan DN yang sama.
       *
       * Pada Paste Mode:
       * DN Paste tetap tersedia untuk membandingkan input user
       * dengan hasil Raw Files.
       */
      {
        key: 'order_no',
        label: 'No. DN',
        width: '180px'
      },
      {
        key: 'customer',
        label: 'Customer',
        // TMMIN menampilkan dua badge (TMMIN + T034/TMAJ).
        // Lebar 120px tidak cukup setelah padding cell sehingga badge kedua
        // keluar ke kolom Order Date pada Crosscheck View di layar laptop.
        width: '150px'
      },
      {
        key: 'dn_number',
        label: 'DN Paste',
        width: '180px'
      },
      {
        key: 'order_date',
        label: 'Order Date',
        width: '130px'
      },
      {
        key: 'delivery_date',
        label: 'Delivery Date',
        width: '130px'
      },
      {
        key: 'status',
        label: 'Keterangan',
        width: '150px'
      },
      {
        key: 'registered_date',
        label: 'Register Date',
        width: '140px'
      }
    ];


  /*
   * DN Paste tetap disimpan di data internal (`row.dn_number`)
   * karena masih dipakai untuk:
   *
   * - hasil input/paste user,
   * - pencocokan dengan Raw Files,
   * - status register/open/close,
   * - lookup Register Date,
   * - delete register berdasarkan DN.
   *
   * Tetapi kolom DN Paste TIDAK ditampilkan di website.
   *
   * Dengan demikian UI hanya menampilkan:
   *
   * No. DN -> Customer -> Order Date -> Delivery Date
   * -> Keterangan -> Register Date
   */
  const dnCrosscheckVisibleColumns =
    computed<
      TableColumn<
        DnCrosscheckKey
      >[]
    >(
      () =>
        dnCrosscheckColumns
          .filter(
            (
              column
            ) =>
              column.key !==
              'dn_number'
          )
    );


  const createDnCrosscheckRecord =
    <T>(
      factory: () => T
    ): Record<
      DnCrosscheckKey,
      T
    > => {
      const result =
        {} as Record<
          DnCrosscheckKey,
          T
        >;

      dnCrosscheckColumns
        .forEach(
          (
            column
          ) => {
            result[
              column.key
            ] =
              factory();
          }
        );

      return result;
    };

  const dnCrosscheckSelectedFilters =
    ref(
      createDnCrosscheckRecord(
        () => [] as string[]
      )
    );

  const dnCrosscheckSearchFilters =
    ref(
      createDnCrosscheckRecord(
        () => ''
      )
    );

  const dnCrosscheckOpenFilters =
    ref(
      createDnCrosscheckRecord(
        () => false
      )
    );

  const dnCrosscheckActiveFilterKey =
    ref<
      DnCrosscheckKey |
      null
    >(null);

  const dnCrosscheckFilterPopupPosition =
    ref({
      top: 0,
      left: 0,
      maxHeight: 320
    });

  const dnCrosscheckSortKey =
    ref<
      DnCrosscheckKey |
      null
    >(null);

  const dnCrosscheckSortDirection =
    ref<SortDirection>(
      'none'
    );

  // ============================================================
  // DN CROSSCHECK FILTER HELPERS
  // ============================================================

  const closeDnCrosscheckFilter =
    () => {
      dnCrosscheckColumns
        .forEach(
          (
            column
          ) => {
            dnCrosscheckOpenFilters
              .value[
              column.key
            ] = false;
          }
        );

      dnCrosscheckActiveFilterKey.value =
        null;

      clearAnchoredFilterPopup();
    };


  const toggleDnCrosscheckFilter =
    async (
      key: DnCrosscheckKey,
      event?: MouseEvent
    ) => {
      const isCurrentlyOpen =
        dnCrosscheckActiveFilterKey
          .value ===
        key;

      /*
      * Tutup popup lain pada halaman.
      */
      closeAllPopups();

      /*
      * Kalau popup yang sama
      * sebelumnya terbuka,
      * hasil akhir cukup tertutup.
      */
      if (isCurrentlyOpen) {
        return;
      }

      const trigger =
        event
          ?.currentTarget as
        HTMLElement |
        null;

      if (!trigger) {
        console.warn(
          'Tombol filter DN Crosscheck tidak ditemukan.'
        );

        return;
      }

      const rect =
        trigger
          .getBoundingClientRect();

      const popupWidth =
        270;

      const popupGap =
        6;

      const viewportPadding =
        8;

      /*
      * =================================================
      * VERTICAL POSITION
      * =================================================
      */

      const availableBelow =
        window.innerHeight -
        rect.bottom -
        popupGap -
        viewportPadding;

      const availableAbove =
        rect.top -
        popupGap -
        viewportPadding;

      const desiredHeight =
        340;

      const openAbove =
        availableBelow <
        240 &&
        availableAbove >
        availableBelow;

      let top =
        openAbove
          ? rect.top -
          Math.min(
            desiredHeight,
            availableAbove
          ) -
          popupGap
          : rect.bottom +
          popupGap;

      /*
      * =================================================
      * HORIZONTAL POSITION
      * =================================================
      */

      const maximumLeft =
        Math.max(
          viewportPadding,

          window.innerWidth -
          popupWidth -
          viewportPadding
        );

      /*
      * Default mengikuti kiri tombol.
      */
      let left =
        Math.min(
          Math.max(
            rect.left,
            viewportPadding
          ),

          maximumLeft
        );

      /*
      * Kolom kanan layar:
      * popup dibuat rata kanan tombol
      * supaya tidak keluar viewport.
      */
      if (
        rect.right +
        popupWidth >
        window.innerWidth -
        viewportPadding
      ) {
        left =
          Math.min(
            Math.max(
              rect.right -
              popupWidth,

              viewportPadding
            ),

            maximumLeft
          );
      }

      /*
      * Tinggi popup adaptif.
      */
      const availableHeight =
        openAbove
          ? availableAbove
          : availableBelow;

      const maxHeight =
        Math.max(
          220,

          Math.min(
            desiredHeight,
            availableHeight
          )
        );

      if (openAbove) {
        top =
          Math.max(
            viewportPadding,

            rect.top -
            maxHeight -
            popupGap
          );
      }

      dnCrosscheckFilterPopupPosition
        .value = {
        top,
        left,
        maxHeight
      };

      setAnchoredFilterPopup(
        trigger,
        (anchor) => {
          dnCrosscheckFilterPopupPosition.value =
            getSafeRawFilterPopupPosition(anchor, 270, 340);
        }
      );

      dnCrosscheckActiveFilterKey.value =
        key;

      dnCrosscheckOpenFilters
        .value[
        key
      ] = true;
    };


  // ============================================================
  // SELECTED VALUES
  // ============================================================

  const getDnCrosscheckSelectedValues =
    (
      key: DnCrosscheckKey
    ): string[] => {
      return (
        dnCrosscheckSelectedFilters
          .value[
        key
        ] ?? []
      );
    };


  // ============================================================
  // SEARCH
  // ============================================================

  const getDnCrosscheckSearchValue =
    (
      key: DnCrosscheckKey
    ): string => {
      return (
        dnCrosscheckSearchFilters
          .value[
        key
        ] ?? ''
      );
    };


  const dnRemoteFilterOptions = ref<Partial<Record<DnCrosscheckKey, string[]>>>({});
  const dnRemoteFilterLoading = ref<Partial<Record<DnCrosscheckKey, boolean>>>({});
  const dnRemoteFilterTimers = new Map<DnCrosscheckKey, ReturnType<typeof setTimeout>>();
  const dnRemoteFilterControllers = new Map<DnCrosscheckKey, AbortController>();

  /**
   * DN TMMIN selalu dibedakan berdasarkan supplier code. Opsi induk `TMMIN`
   * tidak boleh ditampilkan karena bukan filter data yang dapat dipilih user.
   */
  const isHiddenDnCrosscheckFilterOption = (
    key: DnCrosscheckKey,
    value: string
  ): boolean =>
    key === 'customer' && String(value ?? '').trim().toUpperCase() === 'TMMIN';

  const queueDnCrosscheckFilterOptionSearch = (
    key: DnCrosscheckKey,
    value: string
  ): void => {
    const search = String(value ?? '').trim();
    const existingTimer = dnRemoteFilterTimers.get(key);
    if (existingTimer) clearTimeout(existingTimer);
    dnRemoteFilterTimers.delete(key);

    const previousController = dnRemoteFilterControllers.get(key);
    if (previousController) previousController.abort();
    dnRemoteFilterControllers.delete(key);

    const canRemoteSearch =
      isCheckAllDnMode.value &&
      dnCrosscheckServerPaged.value;

    if (!canRemoteSearch || search.length < 3) {
      dnRemoteFilterLoading.value[key] = false;
      dnRemoteFilterOptions.value[key] = [];
      return;
    }

    dnRemoteFilterOptions.value[key] = [];
    dnRemoteFilterLoading.value[key] = true;
    const timer = setTimeout(async () => {
      const controller = new AbortController();
      dnRemoteFilterControllers.set(key, controller);
      try {
        const values = await customerOrderService.searchDnFilterOptions(
          getDateOnlyFilterParams(),
          [...selectedCustomers.value],
          key,
          search,
          buildDnCrosscheckServerFilters(key),
          controller.signal
        );
        if (!controller.signal.aborted) {
          dnRemoteFilterOptions.value[key] = values
            .map((value) => {
              const raw = String(value ?? '').trim();
              if (['order_date', 'delivery_date', 'registered_date'].includes(key)) {
                return normalizeFilterOption(formatDateExcel(raw));
              }
              if (key === 'status') {
                const upper = raw.toUpperCase();
                if (upper === 'OPEN') return 'Open';
                if (upper === 'CLOSE') return 'Close';
              }
              return normalizeFilterOption(raw);
            })
            .filter((option) => !isHiddenDnCrosscheckFilterOption(key, option));
        }
      } catch (error: any) {
        if (error?.name !== 'CanceledError' && error?.name !== 'AbortError' && error?.code !== 'ERR_CANCELED') {
          console.warn('Pencarian filter DN gagal:', error);
        }
      } finally {
        if (dnRemoteFilterControllers.get(key) === controller) {
          dnRemoteFilterControllers.delete(key);
          dnRemoteFilterLoading.value[key] = false;
        }
      }
    }, 300);
    dnRemoteFilterTimers.set(key, timer);
  };

  const isDnCrosscheckFilterOptionLoading = (key: DnCrosscheckKey): boolean =>
    Boolean(dnRemoteFilterLoading.value[key]);

  const isDnCrosscheckRemoteSearch = (key: DnCrosscheckKey): boolean =>
    isCheckAllDnMode.value &&
    dnCrosscheckServerPaged.value &&
    getDnCrosscheckSearchValue(key).trim().length >= 3;

  const setDnCrosscheckSearchValue =
    (
      key: DnCrosscheckKey,
      value: string
    ) => {
      dnCrosscheckSearchFilters
        .value[
        key
      ] =
        String(
          value ?? ''
        );

      queueDnCrosscheckFilterOptionSearch(key, value);
    };


  // ============================================================
  // OPTIONS
  // ============================================================

  const getDnCrosscheckColumnOptions =
    (
      key: DnCrosscheckKey
    ): string[] => {
      const values =
        dnCrosscheckMainFilteredRows
          .value
          .filter((row) =>
            dnCrosscheckColumns.every((column) =>
              column.key === key ||
              doesDnCrosscheckRowMatchColumnFilter(row, column.key)
            )
          )
          .map(
            (
              row
            ) => {
              return normalizeFilterOption(
                getDnCrosscheckDisplayValue(
                  row,
                  key
                )
              );
            }
          )
          .filter((option) => !isHiddenDnCrosscheckFilterOption(key, option));

      return sortFilterOptions(
        Array.from(
          new Set(
            values
          )
        )
      );
    };


  const getDnCrosscheckFilteredColumnOptions =
    (
      key: DnCrosscheckKey
    ): string[] => {
      const rawSearch = getDnCrosscheckSearchValue(key).trim();
      if (isDnCrosscheckRemoteSearch(key)) {
        return sortFilterOptions(dnRemoteFilterOptions.value[key] ?? []);
      }

      const search =
        getDnCrosscheckSearchValue(
          key
        )
          .trim()
          .toLowerCase();

      const options =
        getDnCrosscheckColumnOptions(
          key
        );

      if (!search) {
        return options;
      }

      return options.filter(
        (
          option
        ) => {
          return matchesFilterOptionSearch(key, option, search);
        }
      );
    };


  // ============================================================
  // TOGGLE SINGLE VALUE
  // ============================================================

  const toggleDnCrosscheckFilterValue =
    (
      key: DnCrosscheckKey,
      value: string
    ) => {
      const selected = [
        ...getDnCrosscheckSelectedValues(
          key
        )
      ];

      const index =
        selected.indexOf(
          value
        );

      if (index >= 0) {
        selected.splice(
          index,
          1
        );
      } else {
        selected.push(
          value
        );
      }

      dnCrosscheckSelectedFilters
        .value[
        key
      ] =
        selected;
    };


  // ============================================================
  // SELECT ALL
  // ============================================================

  const toggleAllDnCrosscheckColumn =
    (
      key: DnCrosscheckKey
    ) => {
      const options =
        getDnCrosscheckFilteredColumnOptions(
          key
        );

      const selected =
        getDnCrosscheckSelectedValues(
          key
        );

      const allSelected =
        options.length > 0 &&
        options.every(
          (
            option
          ) =>
            selected.includes(
              option
            )
        );

      /*
      * Jika semua yang tampil sudah dipilih:
      * lepaskan seluruh option yang sedang tampil.
      *
      * Ini lebih aman ketika Search aktif.
      */
      if (allSelected) {
        dnCrosscheckSelectedFilters
          .value[
          key
        ] =
          selected.filter(
            (
              value
            ) =>
              !options.includes(
                value
              )
          );

        return;
      }

      /*
      * Gabungkan selection lama
      * dengan option hasil search.
      */
      dnCrosscheckSelectedFilters
        .value[
        key
      ] =
        Array.from(
          new Set([
            ...selected,
            ...options
          ])
        );
    };


  const isAllDnCrosscheckSelected =
    (
      key: DnCrosscheckKey
    ): boolean => {
      const options =
        getDnCrosscheckFilteredColumnOptions(
          key
        );

      const selected =
        getDnCrosscheckSelectedValues(
          key
        );

      return (
        options.length > 0 &&
        options.every(
          (
            option
          ) =>
            selected.includes(
              option
            )
        )
      );
    };


  // ============================================================
  // IS SELECTED
  // ============================================================

  const isDnCrosscheckFilterSelected =
    (
      key: DnCrosscheckKey,
      value: string
    ): boolean => {
      return getDnCrosscheckSelectedValues(
        key
      ).includes(
        value
      );
    };


  // ============================================================
  // CLEAR
  // ============================================================

  const clearDnCrosscheckColumnFilter =
    (
      key: DnCrosscheckKey
    ) => {
      dnCrosscheckSelectedFilters
        .value[
        key
      ] = [];

      dnCrosscheckSearchFilters
        .value[
        key
      ] = '';
    };


  // ============================================================
  // LABEL
  // ============================================================

  const getDnCrosscheckSelectedLabel =
    (
      key: DnCrosscheckKey
    ): string => {
      const selected =
        getDnCrosscheckSelectedValues(
          key
        );

      if (
        selected.length ===
        0
      ) {
        return 'All';
      }

      if (
        selected.length ===
        1
      ) {
        return selected[0];
      }

      /*
       * Kompatibilitas state lama quick Found yang disimpan
       * sebagai Open + Close.
       */
      if (
        key === 'status' &&
        selected.length === 2 &&
        selected.includes('Open') &&
        selected.includes('Close')
      ) {
        return 'Found';
      }

      return (
        `${selected.length} Selected`
      );
    };


  // ============================================================
  // DN CROSSCHECK QUICK STATUS FILTER
  // ============================================================

  // ============================================================
  // DN CROSSCHECK QUICK STATUS FILTER
  // ============================================================

  type DnQuickStatus =
    'All' |
    'Found' |
    'Not Found' |
    'Open' |
    'Close';


  const toggleDnCrosscheckQuickStatus =
    (
      status:
        DnQuickStatus
    ) => {
      /*
      * Total = seluruh hasil Crosscheck.
      */
      if (
        status ===
        'All'
      ) {
        dnCrosscheckSelectedFilters
          .value
          .status = [];
      }

      /*
      * Found mencakup semua row yang tersedia di Raw Files:
      * Open + Close.
      */
      else if (
        status ===
        'Found'
      ) {
        /*
         * Simpan semantic filter sebagai `Found`.
         * Filter engine di bawah akan menerjemahkan Found
         * menjadi seluruh row yang benar-benar ditemukan,
         * baik status tampilannya Open maupun Close.
         */
        dnCrosscheckSelectedFilters
          .value
          .status = [
            'Found'
          ];
      }

      /*
      * Not Found hanya menampilkan nomor yang tidak tersedia.
      */
      else if (
        status ===
        'Not Found'
      ) {
        dnCrosscheckSelectedFilters
          .value
          .status = [
            'Not Found'
          ];
      }

      /*
      * Check All DN tetap memakai quick filter Open / Close.
      */
      else {
        dnCrosscheckSelectedFilters
          .value
          .status = [
            status
          ];
      }

      /*
      * Search popup Keterangan jangan ikut mengganggu
      * quick filter badge.
      */
      dnCrosscheckSearchFilters
        .value
        .status = '';

      dnCrosscheckCurrentPage
        .value = 1;

      clearDnDeleteSelection();

      closeDnCrosscheckFilter();
    };


  const isDnCrosscheckQuickStatusActive =
    (
      status:
        DnQuickStatus
    ): boolean => {
      const selected =
        dnCrosscheckSelectedFilters
          .value
          .status ?? [];

      if (
        status ===
        'All'
      ) {
        return (
          selected.length ===
          0
        );
      }

      if (
        status ===
        'Found'
      ) {
        /*
         * Terima format baru [`Found`] dan format kompatibilitas
         * lama [`Open`, `Close`].
         */
        return (
          (
            selected.length === 1 &&
            selected[0] ===
            'Found'
          ) ||
          (
            selected.length === 2 &&
            selected.includes(
              'Open'
            ) &&
            selected.includes(
              'Close'
            )
          )
        );
      }

      if (
        status ===
        'Not Found'
      ) {
        return (
          selected.length === 1 &&
          selected[0] ===
          'Not Found'
        );
      }

      return (
        selected.length === 1 &&
        selected[0] ===
        status
      );
    };


  // ============================================================
  // SORT
  // ============================================================

  const setDnCrosscheckSort =
    (
      key: DnCrosscheckKey,
      direction:
        SortDirection
    ) => {
      dnCrosscheckCurrentPage.value = 1;

      if (direction === 'none') {
        dnCrosscheckSortKey.value = null;
        dnCrosscheckSortDirection.value = 'none';
      } else {
        dnCrosscheckSortKey.value = key;
        dnCrosscheckSortDirection.value = direction;
      }

      // Check All tidak lagi full-hydration hanya untuk sort.
      // Watcher sort di bawah akan meminta page 1 yang sudah di-sort database.
    };


  const getDnCrosscheckSortDirection =
    (
      key: DnCrosscheckKey
    ): SortDirection => {
      if (
        dnCrosscheckSortKey.value !==
        key
      ) {
        return 'none';
      }

      return dnCrosscheckSortDirection
        .value;
    };


  /**
   * Customer dasar dari backend tetap `TMMIN` agar global customer filter
   * mencakup seluruh manifest. Hanya DN Crosscheck yang menambahkan kode
   * T034/TMAJ pada label dan pilihan filter kolom Customer.
   */
  const getDnCrosscheckCustomerLabel =
    (
      row: DnCrosscheckRow
    ): string => {
      const customer =
        String(
          row.customer ?? ''
        )
          .trim()
          .toUpperCase();

      const customerCode =
        String(
          row.customer_code ?? ''
        )
          .trim()
          .toUpperCase();

      if (
        customer === 'TMMIN' &&
        [
          'T034',
          'TMAJ'
        ].includes(
          customerCode
        )
      ) {
        return `${customer} ${customerCode}`;
      }

      return customer;
    };


  const getDnCrosscheckCustomerBadgeClass =
    (
      row: DnCrosscheckRow
    ): string => {
      const customer =
        String(
          row.customer ?? ''
        )
          .trim()
          .toUpperCase();

      if (customer === 'TMMIN') {
        return '!border-cyan-200 bg-cyan-50 text-cyan-700';
      }

      return '!border-cyan-200 bg-cyan-50 text-cyan-700';
    };


  const getDnCrosscheckCustomerCode =
    (
      row: DnCrosscheckRow
    ): string => {
      const customer =
        String(
          row.customer ?? ''
        )
          .trim()
          .toUpperCase();

      const customerCode =
        String(
          row.customer_code ?? ''
        )
          .trim()
          .toUpperCase();

      return (
        customer === 'TMMIN' &&
        ['T034', 'TMAJ'].includes(customerCode)
      )
        ? customerCode
        : '';
    };


  const getDnCrosscheckCustomerCodeBadgeClass =
    (
      row: DnCrosscheckRow
    ): string => {
      const customerCode =
        getDnCrosscheckCustomerCode(
          row
        );

      if (customerCode === 'T034') {
        return '!border-amber-300 bg-amber-50 text-amber-700';
      }

      if (customerCode === 'TMAJ') {
        return '!border-violet-300 bg-violet-50 text-violet-700';
      }

      return '';
    };


  const getDnCrosscheckDisplayValue =
    (
      row: DnCrosscheckRow,
      key: DnCrosscheckKey
    ): string => {
      if (
        key ===
        'customer'
      ) {
        return getDnCrosscheckCustomerLabel(
          row
        );
      }

      if (
        key ===
        'status'
      ) {
        /*
        * DN tidak ditemukan di Raw Files.
        */
        if (!row.found) {
          return 'Not Found';
        }

        /*
        * Sudah DN Registered
        * = proses selesai / Close.
        */
        if (row.registered) {
          return 'Close';
        }

        /*
        * Ada di Raw Files tetapi
        * belum DN Registered.
        */
        return 'Open';
      }

      if (
        key ===
        'order_date' ||
        key ===
        'delivery_date' ||
        key ===
        'registered_date'
      ) {
        return row[key]
          ? formatDateExcel(
            row[key]
          )
          : '-';
      }

      return String(
        row[key] ?? ''
      );
    };

  const doesDnCrosscheckRowMatchColumnFilter = (
    row: DnCrosscheckRow,
    key: DnCrosscheckKey
  ): boolean => {
    const selected = dnCrosscheckSelectedFilters.value[key] ?? [];
    if (selected.length === 0) return true;

    const rowValue = normalizeFilterOption(
      getDnCrosscheckDisplayValue(row, key)
    );

    if (key === 'status') {
      return selected.some((selectedStatus) =>
        selectedStatus === 'Found'
          ? row.found === true
          : selectedStatus === rowValue
      );
    }

    return selected.includes(rowValue);
  };


  const dnCrosscheckFilteredRows =
    computed<DnCrosscheckRow[]>(() => {
      const activeKeys = dnCrosscheckColumns
        .map((column) => column.key)
        .filter((key) =>
          (dnCrosscheckSelectedFilters.value[key]?.length ?? 0) > 0
        );

      if (activeKeys.length === 0) {
        return dnCrosscheckMainFilteredRows.value;
      }

      return dnCrosscheckMainFilteredRows
        .value
        .filter(
          (
            row
          ) => {
            return activeKeys
              .every(
                (
                  key
                ) => {
                  return doesDnCrosscheckRowMatchColumnFilter(
                    row,
                    key
                  );
                }
              );
          }
        );
    });



  const dnCrosscheckDisplayRows =
    computed<DnCrosscheckRow[]>(() => {
      const rows = [
        ...dnCrosscheckFilteredRows
          .value
      ];

      if (
        !dnCrosscheckSortKey.value ||
        dnCrosscheckSortDirection
          .value ===
        'none'
      ) {
        return rows;
      }

      const key =
        dnCrosscheckSortKey.value;

      rows.sort(
        (
          a,
          b
        ) => {
          const firstValue =
            getDnCrosscheckDisplayValue(
              a,
              key
            );

          const secondValue =
            getDnCrosscheckDisplayValue(
              b,
              key
            );

          const result =
            firstValue.localeCompare(
              secondValue,
              'id',
              {
                numeric:
                  true
              }
            );

          return (
            dnCrosscheckSortDirection
              .value ===
            'asc'
          )
            ? result
            : -result;
        }
      );

      return rows;
    });

  // ============================================================
  // DN CROSSCHECK PAGINATION
  // ============================================================

  const dnCrosscheckCurrentPage =
    ref(1);

  // ============================================================
  // DN DELETE REGISTER
  // ============================================================

  const selectedDnDeleteNumbers =
    ref<string[]>([]);

  const isDeletingDnRegister =
    ref(false);

  const dnDeleteSelectedCount =
    computed<number>(() => {
      return selectedDnDeleteNumbers
        .value
        .length;
    });


  const isDnDeletable =
    (
      row: DnCrosscheckRow
    ): boolean => {
      return (
        row.found === true &&
        row.registered === true &&
        String(
          row.dn_number ?? ''
        ).trim() !== ''
      );
    };


  const deletableDnFilteredRows =
    computed<DnCrosscheckRow[]>(() => {
      return dnCrosscheckDisplayRows
        .value
        .filter(
          (
            row
          ) =>
            isDnDeletable(
              row
            )
        );
    });


  const deletableDnCurrentPageRows =
    computed<DnCrosscheckRow[]>(() => {
      return dnCrosscheckPaginatedRows
        .value
        .filter(
          (
            row
          ) =>
            isDnDeletable(
              row
            )
        );
    });


  const isDnSelectedForDelete =
    (
      dnNumber: string
    ): boolean => {
      const dn =
        String(
          dnNumber ?? ''
        )
          .trim()
          .toUpperCase();

      return selectedDnDeleteNumbers
        .value
        .includes(
          dn
        );
    };


  const toggleDnDeleteSelection =
    (
      row: DnCrosscheckRow
    ) => {
      if (
        !isDnDeletable(
          row
        )
      ) {
        return;
      }

      const dn =
        String(
          row.dn_number ?? ''
        )
          .trim()
          .toUpperCase();

      if (!dn) {
        return;
      }

      const current = [
        ...selectedDnDeleteNumbers
          .value
      ];

      const index =
        current.indexOf(
          dn
        );

      if (
        index >= 0
      ) {
        current.splice(
          index,
          1
        );
      } else {
        current.push(
          dn
        );
      }

      selectedDnDeleteNumbers.value =
        current;
    };


  const isAllCurrentPageDnSelected =
    computed<boolean>(() => {
      const rows =
        deletableDnCurrentPageRows
          .value;

      if (
        rows.length === 0
      ) {
        return false;
      }

      return rows.every(
        (
          row
        ) =>
          isDnSelectedForDelete(
            row.dn_number
          )
      );
    });


  const toggleAllCurrentPageDnDelete =
    () => {
      const pageDnNumbers =
        deletableDnCurrentPageRows
          .value
          .map(
            (
              row
            ) =>
              String(
                row.dn_number
              )
                .trim()
                .toUpperCase()
          )
          .filter(Boolean);

      if (
        pageDnNumbers.length ===
        0
      ) {
        return;
      }

      const current =
        new Set(
          selectedDnDeleteNumbers
            .value
        );

      if (
        isAllCurrentPageDnSelected
          .value
      ) {
        /*
        * Semua page ini sedang selected
        * → unselect page ini.
        */
        pageDnNumbers.forEach(
          (
            dn
          ) => {
            current.delete(
              dn
            );
          }
        );
      } else {
        /*
        * Select seluruh Close
        * pada page sekarang.
        */
        pageDnNumbers.forEach(
          (
            dn
          ) => {
            current.add(
              dn
            );
          }
        );
      }

      selectedDnDeleteNumbers.value =
        Array.from(
          current
        );
    };

  const dnCrosscheckRowsPerPage =
    ref(10);

  const dnCrosscheckRowsPerPageOptions =
    [
      10,
      20,
      50,
      100
    ];

  const dnCrosscheckTotalPages = computed(() => {
    const totalRows = isCheckAllDnMode.value && dnCrosscheckServerPaged.value
      ? dnCrosscheckServerTotal.value
      : dnCrosscheckDisplayRows.value.length;
    return Math.max(1, Math.ceil(totalRows / dnCrosscheckRowsPerPage.value));
  });

  const dnCrosscheckPaginatedRows = computed<DnCrosscheckRow[]>(() => {
    if (isCheckAllDnMode.value && dnCrosscheckServerPaged.value) {
      return dnCrosscheckDisplayRows.value;
    }
    const start = (dnCrosscheckCurrentPage.value - 1) * dnCrosscheckRowsPerPage.value;
    return dnCrosscheckDisplayRows.value.slice(start, start + dnCrosscheckRowsPerPage.value);
  });

  const dnCrosscheckShowingStart = computed(() => {
    const totalRows = isCheckAllDnMode.value && dnCrosscheckServerPaged.value
      ? dnCrosscheckServerTotal.value
      : dnCrosscheckDisplayRows.value.length;
    return totalRows === 0
      ? 0
      : (dnCrosscheckCurrentPage.value - 1) * dnCrosscheckRowsPerPage.value + 1;
  });

  const clearDnDeleteSelection =
    () => {
      selectedDnDeleteNumbers.value =
        [];
    };

  const hasDnDeleteActiveFilter =
    computed<boolean>(() => {
      const hasMainCustomerFilter =
        selectedCustomers
          .value
          .length > 0;

      const hasDateFilter =
        Boolean(
          fromDate.value ||
          toDate.value
        );

      const hasColumnFilter =
        dnCrosscheckColumns
          .some(
            (
              column
            ) =>
              (
                dnCrosscheckSelectedFilters
                  .value[
                column.key
                ] ?? []
              ).length >
              0
          );

      return (
        hasMainCustomerFilter ||
        hasDateFilter ||
        hasColumnFilter
      );
    });


  const executeDeleteDnRegister =
    (
      dnNumbers:
        string[],
      source:
        'selected' |
        'filtered'
    ) => {
      if (
        isDeletingDnRegister
          .value
      ) {
        return;
      }

      const normalized =
        Array.from(
          new Set(
            dnNumbers
              .map(
                (
                  dn
                ) =>
                  String(
                    dn ?? ''
                  )
                    .trim()
                    .toUpperCase()
              )
              .filter(
                (
                  dn
                ) =>
                  dn !== ''
              )
          )
        );

      if (
        normalized.length ===
        0
      ) {
        notificationStore
          .showAlertWarning(
            'Tidak ada DN Registered yang dapat dihapus.'
          );

        return;
      }

      let message =
        `Apakah Anda yakin ingin menghapus register ${normalized.length} DN? ` +
        'DN tersebut akan berubah dari Close menjadi Open.';

      /*
      * Extra warning ketika:
      *
      * Check All DN
      * +
      * Delete Filtered
      * +
      * tidak ada filter
      *
      * berarti seluruh registered DN.
      */
      if (
        source ===
        'filtered' &&
        isCheckAllDnMode
          .value &&
        !hasDnDeleteActiveFilter
          .value
      ) {
        message =
          `PERHATIAN: Anda akan menghapus seluruh ${normalized.length} DN Registered ` +
          'yang ada pada Check All DN. Setelah dihapus seluruh DN tersebut akan menjadi Open. Lanjutkan?';
      }

      notificationStore
        .showConfirm(
          source ===
            'selected'
            ? 'Delete Selected DN'
            : 'Delete Filtered DN',

          message,

          async () => {
            try {
              isDeletingDnRegister
                .value =
                true;

              const response =
                await customerOrderService
                  .deleteDnRegister({
                    dn_numbers:
                      normalized
                  });

              if (
                response.status !==
                'success'
              ) {
                throw new Error(
                  response.message ||
                  'Delete DN Register gagal.'
                );
              }

              clearDnDeleteSelection();

              notificationStore
                .showAlertSuccess(
                  response.message
                );

              /*
              * Refresh sesuai mode.
              */
              if (
                isCheckAllDnMode
                  .value
              ) {
                await loadAllDnStatus();
              } else {
                await loadDnCrosscheckPreview();
              }

              dnCrosscheckCurrentPage
                .value = 1;

            } catch (
            error: any
            ) {
              console.error(
                'Delete DN Register Error:',
                error
              );

              notificationStore
                .showAlertError(
                  error.response
                    ?.data
                    ?.message ||
                  error.message ||
                  'Delete DN Register gagal.'
                );

            } finally {
              isDeletingDnRegister
                .value =
                false;
            }
          }
        );
    };


  const deleteSelectedDnRegisters =
    () => {
      if (!requireUploadSoPermission('delete')) {
        return;
      }

      executeDeleteDnRegister(
        selectedDnDeleteNumbers
          .value,
        'selected'
      );
    };

  const deleteFilteredDnRegisters = async () => {
    if (!requireUploadSoPermission('delete')) {
      return;
    }

    if (isCheckAllDnMode.value && dnCrosscheckServerPaged.value) {
      const deleteCount = dnCrosscheckClose.value;
      if (deleteCount <= 0) {
        notificationStore.showAlertWarning('Tidak ada DN Registered pada hasil filter yang dapat dihapus.');
        return;
      }

      notificationStore.showConfirm(
        'Delete Filtered DN',
        `Apakah Anda yakin ingin menghapus register ${deleteCount} DN CLOSE pada hasil filter saat ini? DN tersebut akan berubah dari Close menjadi Open.`,
        async () => {
          try {
            isDeletingDnRegister.value = true;
            const response = await customerOrderService.deleteDnRegister({
              ...buildDnFilteredMutationPayload()
            } as any);
            if (response.status !== 'success') {
              throw new Error(response.message || 'Delete DN Register gagal.');
            }
            clearDnDeleteSelection();
            notificationStore.showAlertSuccess(response.message);
            await loadAllDnStatus();
            dnCrosscheckCurrentPage.value = 1;
          } catch (error: any) {
            notificationStore.showAlertError(
              error?.response?.data?.message || error?.message || 'Delete DN Register gagal.'
            );
          } finally {
            isDeletingDnRegister.value = false;
          }
        }
      );
      return;
    }

    const dnNumbers = deletableDnFilteredRows.value.map((row) => row.dn_number);
    executeDeleteDnRegister(dnNumbers, 'filtered');
  };


  watch(
    [
      selectedCustomers,
      fromDate,
      toDate
    ],
    () => {
      clearDnDeleteSelection();
    },
    {
      deep: true
    }
  );

  watch(
    dnCrosscheckSelectedFilters,
    () => {
      clearDnDeleteSelection();
    },
    {
      deep: true
    }
  );

  const dnCrosscheckShowingEnd = computed(() => {
    const totalRows = isCheckAllDnMode.value && dnCrosscheckServerPaged.value
      ? dnCrosscheckServerTotal.value
      : dnCrosscheckDisplayRows.value.length;
    return Math.min(
      dnCrosscheckCurrentPage.value * dnCrosscheckRowsPerPage.value,
      totalRows
    );
  });

  const dnCrosscheckVisiblePages =
    computed(() => {
      const total =
        dnCrosscheckTotalPages
          .value;

      const current =
        dnCrosscheckCurrentPage
          .value;

      let start =
        Math.max(
          1,
          current - 2
        );

      let end =
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
            end -
            start +
            1
        },
        (
          _,
          index
        ) =>
          start +
          index
      );
    });

  const dnCrosscheckFirstPage =
    () => {
      dnCrosscheckCurrentPage.value =
        1;
    };

  const dnCrosscheckPrevPage =
    () => {
      if (
        dnCrosscheckCurrentPage
          .value >
        1
      ) {
        dnCrosscheckCurrentPage
          .value--;
      }
    };

  const dnCrosscheckNextPage =
    () => {
      if (
        dnCrosscheckCurrentPage
          .value <
        dnCrosscheckTotalPages
          .value
      ) {
        dnCrosscheckCurrentPage
          .value++;
      }
    };

  const dnCrosscheckLastPage =
    () => {
      dnCrosscheckCurrentPage.value =
        dnCrosscheckTotalPages
          .value;
    };


  watch(
    dnCrosscheckSelectedFilters,
    () => {
      dnCrosscheckCurrentPage.value =
        1;
    },
    {
      deep: true
    }
  );

  watch(
    () => JSON.stringify(buildDnCrosscheckServerFilters()),
    () => {
      if (!isCheckAllDnMode.value || !dnCrosscheckServerPaged.value) return;
      if (dnCrosscheckCurrentPage.value !== 1) {
        dnCrosscheckCurrentPage.value = 1;
      } else {
        void loadAllDnStatus(false);
      }
    }
  );

  watch(dnCrosscheckRowsPerPage, () => {
    if (isCheckAllDnMode.value && dnCrosscheckServerPaged.value) {
      if (dnCrosscheckCurrentPage.value !== 1) {
        dnCrosscheckCurrentPage.value = 1;
      } else {
        void loadAllDnStatus(false);
      }
      return;
    }
    dnCrosscheckCurrentPage.value = 1;
  });

  watch(dnCrosscheckCurrentPage, (page, previous) => {
    if (
      isCheckAllDnMode.value &&
      dnCrosscheckServerPaged.value &&
      page !== previous &&
      !isCheckingDn.value
    ) {
      void loadAllDnStatus(false);
    }
  });

  watch(
    selectedCustomers,
    () => {
      dnCrosscheckCurrentPage.value =
        1;
    },
    {
      deep: true
    }
  );

  watch(
    [
      fromDate,
      toDate
    ],
    () => {
      dnCrosscheckCurrentPage.value =
        1;
    }
  );

  watch(
    dnCrosscheckTotalPages,
    (
      total
    ) => {
      if (
        dnCrosscheckCurrentPage
          .value >
        total
      ) {
        dnCrosscheckCurrentPage.value =
          total;
      }
    }
  );

  watch(
    [
      selectedCustomers,
      fromDate,
      toDate,
      dnCrosscheckSelectedFilters
    ],
    () => {
      dnCrosscheckCurrentPage
        .value = 1;
    },
    {
      deep: true
    }
  );

  watch(
    [
      dnCrosscheckSortKey,
      dnCrosscheckSortDirection
    ],
    () => {
      if (dnCrosscheckCurrentPage.value !== 1) {
        dnCrosscheckCurrentPage.value = 1;
        return;
      }

      if (isCheckAllDnMode.value && dnCrosscheckServerPaged.value) {
        void loadAllDnStatus(false);
      }
    }
  );

  watch(
    dnCrosscheckRowsPerPage,
    () => {
      dnCrosscheckCurrentPage
        .value = 1;
    }
  );
  /*
  * ==========================================================
  * CLEAR
  * ==========================================================
  */
  const clearDnCrosscheck =
    () => {
      dnPasteText.value =
        '';

      dnCrosscheckRows.value =
        [];
    };

  /*
  * ==========================================================
  * FORMAT DATE CROSSCHECK
  * ==========================================================
  */
  const formatDnCrosscheckDate =
    (
      value:
        string |
        null |
        undefined
    ): string => {
      const cleanValue =
        String(
          value ?? ''
        ).trim();

      if (!cleanValue) {
        return '-';
      }

      /*
      * Backend mungkin mengirim:
      *
      * 2026-08-11
      *
      * atau:
      *
      * 2026-08-11 - 2026-08-12
      */
      if (
        cleanValue.includes(
          ' - '
        )
      ) {
        return cleanValue
          .split(
            ' - '
          )
          .map(
            (
              date
            ) =>
              formatDateExcel(
                date
              )
          )
          .join(
            ' - '
          );
      }

      return formatDateExcel(
        cleanValue
      );
    };



  const isExportingDnMonitoringExcel =
    ref(false);

  const isPrintingDnMonitoringReport =
    ref(false);

  const isDownloadingDnMonitoringImage =
    ref(false);

  const isDownloadingDnMonitoringPdf =
    ref(false);



  // ============================================================
  // REPORT DN NUMBERS
  // ============================================================

  const dnMonitoringReportDnNumbers =
    computed<string[]>(() => {
      const result =
        new Set<string>();

      /*
      * Gunakan hasil filter penuh,
      * bukan pagination.
      */
      dnCrosscheckDisplayRows
        .value
        .forEach(
          (
            row
          ) => {
            if (
              row.found !==
              true
            ) {
              return;
            }

            const dn =
              String(
                row.dn_number ??
                row.order_no ??
                ''
              )
                .trim()
                .toUpperCase();

            if (
              !dn ||
              !isDnMonitoringOrderNumber(
                dn,
                String(
                  row.customer ??
                  ''
                )
              )
            ) {
              return;
            }

            /*
            * DCWA sementara tidak ikut.
            */
            if (
              dn.startsWith(
                'DN47B'
              )
            ) {
              return;
            }

            result.add(
              dn
            );
          }
        );

      return Array.from(
        result
      );
    });


  const dnMonitoringReportCount =
    computed<number>(() => {
      /*
       * Check All memakai server-side pagination, sehingga
       * dnMonitoringReportDnNumbers hanya berisi page yang sedang tampil.
       * Gunakan total scope Check All sebagai gate UI; backend akan membaca
       * seluruh source report langsung dari database berdasarkan periode.
       */
      if (
        isCheckAllDnMode.value &&
        dnCrosscheckServerPaged.value
      ) {
        return dnCrosscheckTotal.value;
      }

      return dnMonitoringReportDnNumbers
        .value
        .length;
    });


  // ============================================================
  // REPORT PAYLOAD
  // ============================================================

  // ============================================================
  // BUILD DN MONITORING PAYLOAD
  // ============================================================

  const buildDnMonitoringReportPayload =
    (): DnMonitoringReportPayload & {
      customers?: string[];
      from_date?: string;
      to_date?: string;
      delivery_from_date?: string;
      delivery_to_date?: string;
    } => {

      const period =
        normalizeDnMonitoringPeriod(
          dnMonitoringReportPeriod
            .value
        );


      if (
        !period
      ) {
        throw new Error(
          'Periode DN Monitoring tidak valid.'
        );
      }


      const sourceMode =
        isCheckAllDnMode.value
          ? 'all'
          : 'paste';

      /*
       * Check All tidak lagi mengirim ribuan nomor DN ke backend karena
       * memakai server-side aggregate. Agar behavior report tetap sama
       * dengan tabel, filter tanggal global harus ikut dikirim eksplisit.
       *
       * getDateOnlyFilterParams() memakai resolver yang sama dengan Raw SO,
       * Format SO, Tracking, dan DN Crosscheck sehingga To Date kosong tetap
       * menghasilkan scope yang konsisten tanpa memuat seluruh history.
       */
      const reportDateFilters =
        sourceMode === 'all'
          ? getDateOnlyFilterParams()
          : {};

      return {
        /*
         * PASTE:
         * kirim nomor yang memang dipaste user seperti behavior lama.
         *
         * CHECK ALL:
         * JANGAN kirim nomor DN dari page aktif. Page aktif hanya 10/20/50/100
         * row setelah server-side pagination dan bukan scope report. Backend
         * akan mengambil seluruh DN report langsung dari database berdasarkan
         * period + date_basis.
         */
        dn_numbers:
          sourceMode === 'all'
            ? []
            : [
                ...dnMonitoringReportDnNumbers
                  .value
              ],

        source_mode:
          sourceMode,

        /*
         * Pertahankan scope Customer header untuk Check All.
         * Array kosong berarti All Customer. Backend tetap membatasi source
         * report ke ADM P1/P4/P5, GAYA MTR, TMMIN, dan NTC.
         */
        customers:
          sourceMode === 'all'
            ? selectedCustomers.value
                .map((customer) =>
                  String(customer ?? '')
                    .trim()
                    .toUpperCase()
                )
                .filter((customer) => customer !== '')
            : [],

        // Sinkronkan View Report / Export dengan filter tanggal header.
        from_date:
          reportDateFilters.from_date,

        to_date:
          reportDateFilters.to_date,

        delivery_from_date:
          reportDateFilters.delivery_from_date,

        delivery_to_date:
          reportDateFilters.delivery_to_date,

        /*
        * PENTING:
        *
        * tetap YYYY-MM.
        *
        * Jangan dibuat YYYYMM.
        */
        period:
          period,

        date_basis:
          dnMonitoringReportDateBasis
            .value
      };
    };


  // ============================================================
  // EXPORT EXCEL
  // ============================================================

  const exportDnMonitoringExcel =
    async (): Promise<void> => {
      if (!requireUploadSoPermission('download')) {
        return;
      }

      if (
        dnMonitoringReportCount
          .value ===
        0
      ) {
        notificationStore
          .showAlertWarning(
            'Tidak ada data DN untuk di-export.'
          );

        return;
      }

      if (
        !dnMonitoringReportPeriod
          .value
      ) {
        notificationStore
          .showAlertWarning(
            'Periode DN Monitoring belum dipilih.'
          );

        return;
      }

      if (
        isExportingDnMonitoringExcel
          .value
      ) {
        return;
      }

      try {
        isExportingDnMonitoringExcel
          .value =
          true;

        const response =
          await customerOrderService
            .exportDnMonitoringExcel(
              buildDnMonitoringReportPayload()
            );

        // Samakan nama file Excel dengan PNG/PDF.
        // Contoh: DN_Report_September_130926.xlsx
        const filename =
          `${buildDnMonitoringDownloadBaseName()}.xlsx`;

        const blob =
          normalizeExcelDownloadBlob(
            response?.data
          );

        /*
         * Jangan pernah menyimpan response error HTML/JSON sebagai .xlsx.
         * Selain signature PK, validasi juga End Of Central Directory ZIP
         * supaya file terpotong tidak sampai di-download oleh user.
         */
        await assertValidXlsxDownload(
          blob,
          response?.headers?.['content-type']
        );

        const url =
          URL.createObjectURL(
            blob
          );

        const link =
          document.createElement(
            'a'
          );

        link.href =
          url;

        link.download =
          filename;

        link.style.display =
          'none';

        document.body
          .appendChild(
            link
          );

        link.click();

        link.remove();

        /*
         * Jangan revoke URL pada tick yang sama dengan click. Pada file yang
         * lebih besar beberapa browser dapat belum selesai mengambil Blob.
         */
        window.setTimeout(
          () => {
            URL.revokeObjectURL(
              url
            );
          },
          1500
        );

        notificationStore
          .showAlertSuccess(
            `${dnMonitoringReportCount.value} DN berhasil dibuat menjadi laporan Excel.`
          );

      } catch (
      error: any
      ) {
        console.error(
          'Export DN Monitoring:',
          error
        );

        let message =
          'Gagal export DN Monitoring Report.';

        const responseData =
          error.response
            ?.data;

        if (
          responseData instanceof
          Blob
        ) {
          const text =
            await responseData
              .text();

          try {
            const json =
              JSON.parse(
                text
              );

            message =
              json.message ||
              message;

          } catch {
            if (text) {
              message =
                text;
            }
          }
        } else if (
          error.response
            ?.data
            ?.message
        ) {
          message =
            error.response
              .data
              .message;
        } else if (
          error?.message
        ) {
          message =
            String(
              error.message
            );
        }

        /*
         * PHP fatal error kadang dikirim sebagai HTML ketika display_errors
         * aktif. Tampilkan pesan ringkas, bukan tag HTML mentah.
         */
        message =
          String(
            message ?? ''
          )
            .replace(
              /<[^>]*>/g,
              ' '
            )
            .replace(
              /\s+/g,
              ' '
            )
            .trim() ||
          'Gagal export DN Monitoring Report.';

        notificationStore
          .showAlertError(
            message
          );

      } finally {
        isExportingDnMonitoringExcel
          .value =
          false;
      }
    };


  // ============================================================
  // DN MONITORING DOWNLOAD FILE NAME
  // Format: DN_Report_September_130926
  // - Bulan mengikuti periode report yang dipilih.
  // - Tanggal terakhir memakai tanggal download Asia/Jakarta (DDMMYY).
  // ============================================================

  const buildDnMonitoringDownloadBaseName = (): string => {
    const normalizedPeriod =
      normalizeDnMonitoringPeriod(
        dnMonitoringReportPeriod.value
      );

    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December'
    ];

    const monthNumber = Number(
      normalizedPeriod.slice(5, 7)
    );

    const monthName =
      monthNumber >= 1 && monthNumber <= 12
        ? monthNames[monthNumber - 1]
        : 'Report';

    const jakartaParts =
      new Intl.DateTimeFormat(
        'en-GB',
        {
          timeZone: 'Asia/Jakarta',
          day: '2-digit',
          month: '2-digit',
          year: '2-digit'
        }
      ).formatToParts(new Date());

    const day =
      jakartaParts.find(
        (part) => part.type === 'day'
      )?.value ?? '';

    const month =
      jakartaParts.find(
        (part) => part.type === 'month'
      )?.value ?? '';

    const year =
      jakartaParts.find(
        (part) => part.type === 'year'
      )?.value ?? '';

    const downloadDate =
      day && month && year
        ? `${day}${month}${year}`
        : '';

    return downloadDate
      ? `DN_Report_${monthName}_${downloadDate}`
      : `DN_Report_${monthName}`;
  };


  // ============================================================
  // DN MONITORING CLIENT-SIDE PNG / PDF EXPORT
  // ============================================================
  //
  // Tujuan:
  // - tidak membutuhkan Chrome / Chromium / Edge di server,
  // - PNG dan PDF berasal dari pixel source yang sama,
  // - layout mengikuti HTML print yang sebelumnya dirender Chromium,
  // - zoom preview browser tidak ikut ke file export,
  // - watermark preview tidak ikut ke file export.
  //
  // Strategi:
  // 1. Clone satu halaman report dengan width A4; height mengikuti isi bila perlu.
  // 2. Render HTML tersebut di iframe off-screen dengan CSS aplikasi yang sama.
  // 3. Tunggu stylesheet, font, logo, dan layout stabil.
  // 4. PDF memakai scale 2 lalu fit proporsional ke A4 tanpa crop.
  // 5. PNG memakai ukuran A4 setara 300 DPI agar teks kecil tetap tajam saat dibagikan lewat WhatsApp HD.
  // ============================================================

  const DN_MONITORING_EXPORT_SCALE = 2;
  const DN_MONITORING_PNG_EXPORT_SCALE = 300 / 96;
  const DN_MONITORING_EXPORT_WIDTH_MM = 210;

  /*
   * Width tetap A4 supaya 3 kolom customer tidak berubah. Height 1123 px
   * hanya minimum A4. Bila isi report sedikit lebih tinggi (contohnya bulan
   * 31 hari + row Total), renderer akan menambah tinggi canvas secara dinamis
   * agar baris bawah tidak dipotong. PDF kemudian mengecilkan canvas secara
   * proporsional ke satu halaman A4 tanpa crop / stretch.
   */
  const DN_MONITORING_EXPORT_WIDTH_PX = 794;
  const DN_MONITORING_EXPORT_HEIGHT_PX = 1123;
  const DN_MONITORING_EXPORT_BOTTOM_SAFETY_PX = 12;

  const buildDnMonitoringPrintHtmlForImage = (
    sourcePage: HTMLElement
  ): string => {
    const styles =
      Array.from(
        document.head.querySelectorAll(
          'style, link[rel="stylesheet"]'
        )
      )
        .map((element) => element.outerHTML)
        .join('\n');

    const pageClone =
      sourcePage.cloneNode(true) as HTMLElement;

    // Watermark hanya untuk preview layar.
    pageClone
      .querySelectorAll('.dn-page-watermark')
      .forEach((element) => element.remove());

    // Jangan membawa zoom/transform/shadow preview ke export.
    pageClone.style.removeProperty('transform');
    pageClone.style.removeProperty('transform-origin');
    pageClone.style.removeProperty('zoom');
    pageClone.style.removeProperty('box-shadow');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <base href="${document.baseURI}">
  ${styles}

  <style>
    @page {
      size: A4 portrait;
      margin: 0;
    }

    html,
    body {
      margin: 0 !important;
      padding: 0 !important;
      width: ${DN_MONITORING_EXPORT_WIDTH_PX}px !important;
      min-height: ${DN_MONITORING_EXPORT_HEIGHT_PX}px !important;
      height: auto !important;
      overflow: visible !important;
      background: #ffffff !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      position: relative !important;
    }

    #dn-monitoring-print-root {
      position: relative !important;
      display: block !important;
      visibility: visible !important;
      width: ${DN_MONITORING_EXPORT_WIDTH_PX}px !important;
      min-width: ${DN_MONITORING_EXPORT_WIDTH_MM}mm !important;
      max-width: ${DN_MONITORING_EXPORT_WIDTH_MM}mm !important;
      min-height: ${DN_MONITORING_EXPORT_HEIGHT_PX}px !important;
      height: auto !important;
      max-height: none !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: visible !important;
      background: #ffffff !important;
    }

    #dn-monitoring-print-root,
    #dn-monitoring-print-root * {
      visibility: visible !important;
      opacity: 1 !important;
    }

    #dn-monitoring-print-root .dn-report-page {
      display: flex !important;
      visibility: visible !important;
      width: ${DN_MONITORING_EXPORT_WIDTH_PX}px !important;
      min-width: ${DN_MONITORING_EXPORT_WIDTH_MM}mm !important;
      max-width: ${DN_MONITORING_EXPORT_WIDTH_MM}mm !important;
      min-height: ${DN_MONITORING_EXPORT_HEIGHT_PX}px !important;
      height: auto !important;
      max-height: none !important;
      margin: 0 !important;
      padding: 5.5mm 3.5mm 2.5mm !important;
      overflow: visible !important;
      box-sizing: border-box !important;
      background: #ffffff !important;
      box-shadow: none !important;
      transform: none !important;
      transform-origin: initial !important;
      zoom: 1 !important;
      page-break-before: auto !important;
      page-break-after: auto !important;
      page-break-inside: avoid !important;
      break-before: auto !important;
      break-after: auto !important;
      break-inside: avoid !important;
    }

    /*
     * Pada preview layar grid memang dipaksa mengisi tinggi A4. Untuk export
     * hal itu bisa membuat row Total / customer baris kedua terpotong karena
     * pembulatan mm -> px berbeda antar browser. Biarkan dua baris grid
     * memakai tinggi konten sebenarnya, lalu canvas mengikuti tinggi aktual.
     */
    #dn-monitoring-print-root .dn-report-grid {
      flex: 0 0 auto !important;
      min-height: 0 !important;
      height: auto !important;
      grid-template-rows: repeat(2, auto) !important;
      overflow: visible !important;
    }

    #dn-monitoring-print-root .dn-section {
      min-height: 0 !important;
      height: auto !important;
      grid-template-rows: 3mm 5.5mm auto !important;
      overflow: visible !important;
    }

    #dn-monitoring-print-root .dn-section-table {
      height: auto !important;
      min-height: 0 !important;
    }

    /*
     * Export-only normalization untuk html2canvas.
     * Native print browser bisa memusatkan text tabel dengan baik hanya dari
     * vertical-align. html2canvas kadang menghitung baseline font beberapa px
     * berbeda sehingga tanggal/angka terlihat terpotong oleh garis row.
     * Line-height dibuat sama dengan tinggi cell supaya posisi text stabil dan
     * sedekat mungkin dengan hasil PDF native/Chromium.
     */
    #dn-monitoring-print-root *,
    #dn-monitoring-print-root *::before,
    #dn-monitoring-print-root *::after {
      animation: none !important;
      transition: none !important;
      box-sizing: border-box !important;
      text-rendering: geometricPrecision !important;
      -webkit-font-smoothing: antialiased !important;
    }

    #dn-monitoring-print-root .dn-section-table {
      border-collapse: collapse !important;
      border-spacing: 0 !important;
    }

    #dn-monitoring-print-root .dn-section-table thead th {
      height: 5.2mm !important;
      min-height: 5.2mm !important;
      max-height: 5.2mm !important;
      line-height: 5.2mm !important;
      padding-top: 0 !important;
      padding-bottom: 0 !important;
      vertical-align: middle !important;
      overflow: hidden !important;
    }

    #dn-monitoring-print-root .dn-section-table tbody tr,
    #dn-monitoring-print-root .dn-section-table tbody td {
      height: 3.22mm !important;
      min-height: 3.22mm !important;
      max-height: 3.22mm !important;
    }

    #dn-monitoring-print-root .dn-section-table tbody td {
      padding-top: 0 !important;
      padding-bottom: 0 !important;
      line-height: 3.22mm !important;
      vertical-align: middle !important;
      overflow: hidden !important;
    }

    #dn-monitoring-print-root .dn-section-table tfoot td {
      height: 4.6mm !important;
      min-height: 4.6mm !important;
      max-height: 4.6mm !important;
      line-height: 4.6mm !important;
      padding-top: 0 !important;
      padding-bottom: 0 !important;
      vertical-align: middle !important;
      overflow: hidden !important;
    }

    #dn-monitoring-print-root .dn-section-caption {
      line-height: 1.15 !important;
    }

    #dn-monitoring-print-root .dn-section-heading {
      line-height: 5.5mm !important;
    }

    .dn-page-watermark {
      display: none !important;
    }
  </style>
</head>
<body>
  <div id="dn-monitoring-print-root">
    ${pageClone.outerHTML}
  </div>
</body>
</html>`;
  };

  const waitForDnMonitoringImages = async (
    root: ParentNode
  ): Promise<void> => {
    const images =
      Array.from(
        root.querySelectorAll<HTMLImageElement>('img')
      );

    await Promise.all(
      images.map(async (image) => {
        if (!image.complete) {
          await new Promise<void>((resolve) => {
            const finish = () => resolve();

            image.addEventListener(
              'load',
              finish,
              { once: true }
            );

            image.addEventListener(
              'error',
              finish,
              { once: true }
            );
          });
        }

        if (
          typeof image.decode === 'function'
        ) {
          try {
            await image.decode();
          } catch {
            // Image sudah selesai load; decode hanya best effort.
          }
        }
      })
    );
  };

  const waitForTwoAnimationFrames =
    async (): Promise<void> => {
      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            resolve();
          });
        });
      });
    };

  const ensureDnMonitoringReportDom =
    async (): Promise<HTMLElement> => {
      if (
        !dnMonitoringReportData.value
      ) {
        const success =
          await fetchDnMonitoringReportPreview();

        if (!success) {
          throw new Error(
            'DN Monitoring Report belum tersedia.'
          );
        }
      }

      await nextTick();

      if (
        typeof document !== 'undefined' &&
        'fonts' in document
      ) {
        try {
          await document.fonts.ready;
        } catch {
          // Font readiness best effort.
        }
      }

      await waitForTwoAnimationFrames();

      const sourcePage =
        document.querySelector<HTMLElement>(
          '#dn-monitoring-print-root .dn-report-page'
        );

      if (!sourcePage) {
        throw new Error(
          'Halaman DN Monitoring tidak ditemukan.'
        );
      }

      await waitForDnMonitoringImages(sourcePage);

      return sourcePage;
    };

  const renderDnMonitoringCanvas =
    async (
      scale = DN_MONITORING_EXPORT_SCALE
    ): Promise<HTMLCanvasElement> => {
      const sourcePage =
        await ensureDnMonitoringReportDom();

      const exportHtml =
        buildDnMonitoringPrintHtmlForImage(
          sourcePage
        );

      const iframe =
        document.createElement('iframe');

      iframe.setAttribute(
        'aria-hidden',
        'true'
      );

      Object.assign(
        iframe.style,
        {
          position: 'fixed',
          left: '-100000px',
          top: '0',
          width: `${DN_MONITORING_EXPORT_WIDTH_PX}px`,
          height: `${DN_MONITORING_EXPORT_HEIGHT_PX}px`,
          border: '0',
          margin: '0',
          padding: '0',
          pointerEvents: 'none',
          background: '#ffffff'
        }
      );

      const iframeLoaded =
        new Promise<void>((resolve) => {
          let resolved = false;

          const finish = () => {
            if (resolved) {
              return;
            }

            resolved = true;
            resolve();
          };

          iframe.addEventListener(
            'load',
            finish,
            { once: true }
          );

          // Fallback untuk browser yang tidak mengirim load event
          // secara konsisten pada srcdoc.
          window.setTimeout(
            finish,
            2000
          );
        });

      iframe.srcdoc =
        exportHtml;

      document.body.appendChild(
        iframe
      );

      try {
        await iframeLoaded;

        const exportDocument =
          iframe.contentDocument;

        if (!exportDocument) {
          throw new Error(
            'Dokumen export DN Monitoring tidak tersedia.'
          );
        }

        if (
          'fonts' in exportDocument
        ) {
          try {
            await exportDocument.fonts.ready;
          } catch {
            // Font readiness best effort.
          }
        }

        await waitForDnMonitoringImages(
          exportDocument
        );

        await waitForTwoAnimationFrames();

        const exportPage =
          exportDocument.querySelector<HTMLElement>(
            '#dn-monitoring-print-root .dn-report-page'
          );

        if (!exportPage) {
          throw new Error(
            'Halaman export DN Monitoring tidak ditemukan.'
          );
        }

        /*
         * Width tetap A4, tetapi height tidak lagi dipaksa 1123 px. Beberapa
         * kombinasi browser/font membuat 31 row + tfoot sedikit lebih tinggi
         * daripada A4 nominal sehingga row Total atau customer baris kedua
         * terpotong. Ambil tinggi layout aktual dan beri safety 12 px.
         */
        const exportRoot =
          exportDocument.querySelector<HTMLElement>(
            '#dn-monitoring-print-root'
          );

        const measuredHeightPx =
          Math.max(
            DN_MONITORING_EXPORT_HEIGHT_PX,
            Math.ceil(exportPage.scrollHeight),
            Math.ceil(exportPage.getBoundingClientRect().height),
            Math.ceil(exportRoot?.scrollHeight ?? 0)
          );

        const renderHeightPx =
          measuredHeightPx +
          DN_MONITORING_EXPORT_BOTTOM_SAFETY_PX;

        iframe.style.height =
          `${renderHeightPx}px`;

        /*
         * foreignObjectRendering meminta browser merender DOM/CSS melalui
         * SVG foreignObject terlebih dahulu. Untuk layout teks/table seperti
         * DN Report hasilnya jauh lebih dekat dengan native print dibanding
         * parser canvas html2canvas biasa.
         */
        const renderOptions = {
          scale:
            scale,
          backgroundColor:
            '#ffffff',
          useCORS:
            true,
          allowTaint:
            false,
          logging:
            false,
          imageTimeout:
            15000,
          scrollX:
            0,
          scrollY:
            0,
          width:
            DN_MONITORING_EXPORT_WIDTH_PX,
          height:
            renderHeightPx,
          windowWidth:
            DN_MONITORING_EXPORT_WIDTH_PX,
          windowHeight:
            renderHeightPx,
          foreignObjectRendering:
            true,
          removeContainer:
            true
        } as const;

        let canvas: HTMLCanvasElement;

        try {
          canvas =
            await html2canvas(
              exportPage,
              renderOptions
            );
        } catch (foreignObjectError) {
          /*
           * Fallback untuk browser lama / policy SVG tertentu.
           * Layout normalization di atas tetap dipakai sehingga hasilnya
           * masih lebih rapi daripada versi sebelumnya.
           */
          console.warn(
            'DN Monitoring foreignObject render fallback:',
            foreignObjectError
          );

          canvas =
            await html2canvas(
              exportPage,
              {
                ...renderOptions,
                foreignObjectRendering:
                  false
              }
            );
        }

        if (
          canvas.width <= 0 ||
          canvas.height <= 0
        ) {
          throw new Error(
            'Canvas DN Monitoring kosong.'
          );
        }

        return canvas;
      } finally {
        iframe.remove();
      }
    };

  const canvasToBlob = (
    canvas: HTMLCanvasElement,
    type: string,
    quality?: number
  ): Promise<Blob> => {
    return new Promise<Blob>(
      (resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(
                new Error(
                  'File hasil render DN Monitoring tidak dapat dibuat.'
                )
              );

              return;
            }

            resolve(blob);
          },
          type,
          quality
        );
      }
    );
  };

  const downloadDnMonitoringBlob = (
    blob: Blob,
    filename: string
  ): void => {
    const objectUrl =
      URL.createObjectURL(blob);

    try {
      const link =
        document.createElement('a');

      link.href =
        objectUrl;

      link.download =
        filename;

      document.body.appendChild(
        link
      );

      link.click();
      link.remove();
    } finally {
      window.setTimeout(
        () => {
          URL.revokeObjectURL(
            objectUrl
          );
        },
        0
      );
    }
  };

  const concatUint8Arrays = (
    chunks: Uint8Array[]
  ): Uint8Array => {
    const totalLength =
      chunks.reduce(
        (total, chunk) =>
          total + chunk.length,
        0
      );

    const result =
      new Uint8Array(totalLength);

    let offset = 0;

    chunks.forEach((chunk) => {
      result.set(
        chunk,
        offset
      );

      offset +=
        chunk.length;
    });

    return result;
  };

  const buildDnMonitoringPdfBlob =
    async (
      canvas: HTMLCanvasElement
    ): Promise<Blob> => {
      /*
       * PDF dibuat sebagai satu A4 portrait dari canvas yang sama dengan PNG.
       * Canvas dapat sedikit lebih tinggi dari rasio A4 agar semua row Total
       * ikut tertangkap. Karena itu gambar dimasukkan ke PDF dengan FIT
       * proporsional (bukan dipaksa 210 x 297) sehingga tidak ada crop maupun
       * distorsi.
       */
      const jpegBlob =
        await canvasToBlob(
          canvas,
          'image/jpeg',
          0.90
        );

      const jpegBytes =
        new Uint8Array(
          await jpegBlob.arrayBuffer()
        );

      const encoder =
        new TextEncoder();

      const chunks:
        Uint8Array[] = [];

      const objectOffsets =
        new Array<number>(6)
          .fill(0);

      let currentOffset =
        0;

      const pushBytes = (
        bytes: Uint8Array
      ): void => {
        chunks.push(bytes);
        currentOffset +=
          bytes.length;
      };

      const pushText = (
        value: string
      ): void => {
        pushBytes(
          encoder.encode(value)
        );
      };

      const startObject = (
        objectNumber: number
      ): void => {
        objectOffsets[objectNumber] =
          currentOffset;

        pushText(
          `${objectNumber} 0 obj\n`
        );
      };

      const endObject = (): void => {
        pushText(
          '\nendobj\n'
        );
      };

      // A4 portrait dalam PDF point (72 point = 1 inch).
      const pageWidthPt =
        595.2756;

      const pageHeightPt =
        841.8898;

      const canvasWidth =
        Math.max(1, canvas.width);

      const canvasHeight =
        Math.max(1, canvas.height);

      const fitScale =
        Math.min(
          pageWidthPt / canvasWidth,
          pageHeightPt / canvasHeight
        );

      const imageWidthPt =
        canvasWidth * fitScale;

      const imageHeightPt =
        canvasHeight * fitScale;

      /*
       * Horizontal center. Vertikal tetap menempel di atas halaman supaya
       * header report tidak bergeser ketika canvas hanya sedikit lebih tinggi
       * / pendek dari A4 nominal.
       */
      const imageLeftPt =
        (pageWidthPt - imageWidthPt) / 2;

      const imageBottomPt =
        pageHeightPt - imageHeightPt;

      const contentStream =
        [
          'q',
          `${imageWidthPt.toFixed(4)} 0 0 ${imageHeightPt.toFixed(4)} ${imageLeftPt.toFixed(4)} ${imageBottomPt.toFixed(4)} cm`,
          '/Im0 Do',
          'Q',
          ''
        ].join('\n');

      const contentBytes =
        encoder.encode(
          contentStream
        );

      pushText(
        '%PDF-1.4\n% DN Monitoring Report\n'
      );

      startObject(1);
      pushText(
        '<< /Type /Catalog /Pages 2 0 R >>'
      );
      endObject();

      startObject(2);
      pushText(
        '<< /Type /Pages /Kids [3 0 R] /Count 1 >>'
      );
      endObject();

      startObject(3);
      pushText(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidthPt.toFixed(4)} ${pageHeightPt.toFixed(4)}] /Resources << /ProcSet [/PDF /ImageC] /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`
      );
      endObject();

      startObject(4);
      pushText(
        `<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Interpolate true /Length ${jpegBytes.length} >>\nstream\n`
      );
      pushBytes(jpegBytes);
      pushText(
        '\nendstream'
      );
      endObject();

      startObject(5);
      pushText(
        `<< /Length ${contentBytes.length} >>\nstream\n`
      );
      pushBytes(contentBytes);
      pushText(
        'endstream'
      );
      endObject();

      const xrefOffset =
        currentOffset;

      pushText(
        'xref\n0 6\n'
      );

      pushText(
        '0000000000 65535 f \n'
      );

      for (
        let objectNumber = 1;
        objectNumber <= 5;
        objectNumber += 1
      ) {
        pushText(
          `${String(objectOffsets[objectNumber]).padStart(10, '0')} 00000 n \n`
        );
      }

      pushText(
        `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
      );

      const pdfBytes =
        concatUint8Arrays(
          chunks
        );

      /*
       * TypeScript DOM terbaru mendefinisikan BlobPart hanya menerima
       * ArrayBuffer / ArrayBufferView yang benar-benar berbasis ArrayBuffer.
       * Uint8Array hasil concat dapat bertipe Uint8Array<ArrayBufferLike>,
       * sehingga SharedArrayBuffer ikut masuk ke union type dan memicu TS2322.
       *
       * Copy sekali ke ArrayBuffer murni sebelum dimasukkan ke Blob.
       * Isi byte PDF tidak berubah; ini hanya mempertegas tipe buffer.
       */
      const pdfBuffer =
        new ArrayBuffer(
          pdfBytes.byteLength
        );

      new Uint8Array(
        pdfBuffer
      ).set(
        pdfBytes
      );

      return new Blob(
        [pdfBuffer],
        {
          type:
            'application/pdf'
        }
      );
    };

  // ============================================================
  // DOWNLOAD DN MONITORING AS PNG
  // ============================================================

  const downloadDnMonitoringImage =
    async (): Promise<void> => {
      if (!requireUploadSoPermission('download')) {
        return;
      }

      if (
        dnMonitoringReportCount.value === 0
      ) {
        notificationStore.showAlertWarning(
          'Tidak ada data DN untuk didownload.'
        );

        return;
      }

      if (
        isDownloadingDnMonitoringImage.value
      ) {
        return;
      }

      try {
        isDownloadingDnMonitoringImage.value =
          true;

        const canvas =
          await renderDnMonitoringCanvas(
            DN_MONITORING_PNG_EXPORT_SCALE
          );

        const pngBlob =
          await canvasToBlob(
            canvas,
            'image/png'
          );

        downloadDnMonitoringBlob(
          pngBlob,
          `${buildDnMonitoringDownloadBaseName()}.png`
        );

        notificationStore.showAlertSuccess(
          'DN Monitoring Report berhasil didownload sebagai PNG HD 300 DPI.'
        );
      } catch (error: any) {
        console.error(
          'Download DN Monitoring PNG:',
          error
        );

        notificationStore.showAlertError(
          error?.message ||
          'Gagal download DN Monitoring Report sebagai PNG.'
        );
      } finally {
        isDownloadingDnMonitoringImage.value =
          false;
      }
    };

  // ============================================================
  // DOWNLOAD DN MONITORING AS PDF
  // ============================================================
  // PDF dibuat 100% di browser. Tidak memanggil endpoint render
  // PNG/PDF dan tidak membutuhkan Chrome/Chromium di server.
  // ============================================================

  const downloadDnMonitoringPdf =
    async (): Promise<void> => {
      if (!requireUploadSoPermission('download')) {
        return;
      }

      if (
        dnMonitoringReportCount.value === 0
      ) {
        notificationStore.showAlertWarning(
          'Tidak ada data DN untuk didownload.'
        );

        return;
      }

      if (
        isDownloadingDnMonitoringPdf.value
      ) {
        return;
      }

      try {
        isDownloadingDnMonitoringPdf.value =
          true;

        const canvas =
          await renderDnMonitoringCanvas();

        const pdfBlob =
          await buildDnMonitoringPdfBlob(
            canvas
          );

        downloadDnMonitoringBlob(
          pdfBlob,
          `${buildDnMonitoringDownloadBaseName()}.pdf`
        );

        notificationStore.showAlertSuccess(
          'DN Monitoring Report berhasil didownload sebagai PDF.'
        );
      } catch (error: any) {
        console.error(
          'Download DN Monitoring PDF:',
          error
        );

        notificationStore.showAlertError(
          error?.message ||
          'Gagal download DN Monitoring Report sebagai PDF.'
        );
      } finally {
        isDownloadingDnMonitoringPdf.value =
          false;
      }
    };


  // ============================================================
  // PRINT / PDF
  // ============================================================
  // ============================================================
  // PRINT DN MONITORING
  // BROWSER NATIVE - TANPA PDF LIBRARY
  // ============================================================




  // ============================================================
  // PRINT DN MONITORING
  // ============================================================

  // ============================================================
  // PRINT DN MONITORING
  // ============================================================

  // ============================================================
  // PRINT DN MONITORING REPORT
  // BROWSER NATIVE - TANPA PDF LIBRARY
  // ============================================================

  // ============================================================
  // PRINT DN MONITORING REPORT
  // EXACTLY 1 A4 PAGE
  // ============================================================

  const printDnMonitoringReport =
    async (): Promise<void> => {
      if (!requireUploadSoPermission('download')) {
        return;
      }


      if (
        dnMonitoringReportCount
          .value ===
        0
      ) {
        notificationStore
          .showAlertWarning(
            'Tidak ada data DN untuk dicetak.'
          );

        return;
      }


      if (
        isPrintingDnMonitoringReport
          .value
      ) {
        return;
      }


      let iframe:
        HTMLIFrameElement |
        null =
        null;


      try {

        isPrintingDnMonitoringReport
          .value =
          true;


        // =================================================
        // 1. PASTIKAN DATA REPORT SUDAH ADA
        // =================================================

        if (
          !dnMonitoringReportData
            .value
        ) {
          const success =
            await fetchDnMonitoringReportPreview();


          if (
            !success
          ) {
            return;
          }
        }


        // =================================================
        // 2. TAMPILKAN REPORT AGAR DOM TERBENTUK
        // =================================================

        showDnMonitoringReport
          .value =
          true;


        await nextTick();


        /*
        * Tunggu layout Vue + browser.
        */
        await new Promise<void>(
          (
            resolve
          ) => {

            window
              .requestAnimationFrame(
                () => {

                  window
                    .requestAnimationFrame(
                      () => {
                        resolve();
                      }
                    );

                }
              );

          }
        );


        // =================================================
        // 3. AMBIL HANYA PAGE PERTAMA
        // =================================================

        const sourcePage =
          document
            .querySelector<HTMLElement>(
              '#dn-monitoring-print-root .dn-report-page'
            );


        if (
          !sourcePage
        ) {
          throw new Error(
            'Halaman DN Monitoring tidak ditemukan.'
          );
        }


        // =================================================
        // 4. BUAT IFRAME KHUSUS PRINT
        // =================================================

        iframe =
          document
            .createElement(
              'iframe'
            );


        iframe.setAttribute(
          'aria-hidden',
          'true'
        );


        Object.assign(
          iframe.style,
          {
            position:
              'fixed',

            left:
              '-100000px',

            top:
              '0',

            width:
              '1px',

            height:
              '1px',

            border:
              '0',

            opacity:
              '0',

            pointerEvents:
              'none'
          }
        );


        document.body
          .appendChild(
            iframe
          );


        const printWindow =
          iframe
            .contentWindow;


        const printDocument =
          iframe
            .contentDocument;


        if (
          !printWindow ||
          !printDocument
        ) {
          throw new Error(
            'Print frame tidak tersedia.'
          );
        }


        // =================================================
        // 5. NAMA FILE DEFAULT PRINT / SAVE AS PDF
        // =================================================

        const printFileBaseName =
          buildDnMonitoringDownloadBaseName();

        // Chromium/Edge memakai document.title sebagai nama default
        // ketika user memilih Save as PDF pada native print dialog.
        printDocument.title =
          printFileBaseName;


        // =================================================
        // 6. COPY CSS APLIKASI
        // =================================================

        const styles =
          Array.from(
            document
              .head
              .querySelectorAll(
                'style, link[rel="stylesheet"]'
              )
          )
            .map(
              (
                element
              ) =>
                element.outerHTML
            )
            .join(
              '\n'
            );


        // =================================================
        // 6. CLONE HANYA SATU HALAMAN
        // =================================================

        const pageClone =
          sourcePage
            .cloneNode(
              true
            ) as HTMLElement;


        /*
        * Watermark "Page 1"
        * tidak diperlukan saat print.
        */
        pageClone
          .querySelector(
            '.dn-page-watermark'
          )
          ?.remove();


        // =================================================
        // 7. HTML KHUSUS PRINT
        // =================================================

        printDocument
          .open();


        printDocument
          .write(`
    <!DOCTYPE html>

    <html>

    <head>

        <meta charset="UTF-8">

        <title>${printFileBaseName}</title>

        <base href="${document.baseURI}">

        ${styles}

        <style>

            @page {
                size: 210mm 297mm;
                margin: 0;
            }

            /*
             * Minta Chromium menggunakan ukuran fisik A4 untuk native print.
             * Dialog printer tetap dapat mengikuti default driver, tetapi layout
             * dokumen selalu dideklarasikan 210 x 297 mm.
             */
            @media print {
                @page {
                    size: 210mm 297mm;
                    margin: 0;
                }
            }


            html,
            body {
                margin: 0 !important;
                padding: 0 !important;

                width: 210mm !important;
                height: 297mm !important;

                overflow: hidden !important;

                background: #ffffff !important;

                -webkit-print-color-adjust:
                    exact !important;

                print-color-adjust:
                    exact !important;
            }


            body {
                position: relative !important;
            }


        #dn-monitoring-print-root {
        position: relative !important;

        display: block !important;

        visibility: visible !important;

        width: 210mm !important;
        height: 297mm !important;

        min-width: 210mm !important;
        max-width: 210mm !important;

        min-height: 297mm !important;
        max-height: 297mm !important;

        margin: 0 !important;
        padding: 0 !important;

        overflow: hidden !important;

        background: #ffffff !important;
    }


    #dn-monitoring-print-root,
    #dn-monitoring-print-root * {
        visibility: visible !important;
        opacity: 1 !important;
    }


    #dn-monitoring-print-root
    .dn-report-page {

        display: flex !important;

        visibility: visible !important;

        width: 210mm !important;

        height: 297mm !important;
        min-height: 297mm !important;
        max-height: 297mm !important;

        margin: 0 !important;

        padding:
            5.5mm
            3.5mm
            2.5mm !important;

        overflow: hidden !important;

        box-sizing: border-box !important;

        background: #ffffff !important;

        box-shadow: none !important;

        page-break-before: auto !important;
        page-break-after: auto !important;
        page-break-inside: avoid !important;

        break-before: auto !important;
        break-after: auto !important;
        break-inside: avoid !important;
    }


            #dn-single-print-page
            .dn-report-page {

                display: flex !important;

                width: 210mm !important;

                height: 297mm !important;
                min-height: 297mm !important;
                max-height: 297mm !important;

                margin: 0 !important;

                padding:
                    5.5mm
                    3.5mm
                    2.5mm !important;

                overflow: hidden !important;

                box-sizing:
                    border-box !important;

                box-shadow:
                    none !important;

                page-break-before:
                    auto !important;

                page-break-after:
                    auto !important;

                page-break-inside:
                    avoid !important;

                break-before:
                    auto !important;

                break-after:
                    auto !important;

                break-inside:
                    avoid !important;
            }


            .dn-page-watermark {
                display: none !important;
            }

        </style>

    </head>

    <body>

        <div
            id="dn-monitoring-print-root"
        >
            ${pageClone.outerHTML}
        </div>

    </body>

    </html>
                    `);


        printDocument
          .close();


        // =================================================
        // 8. TUNGGU GAMBAR / LOGO
        // =================================================

        const images =
          Array.from(
            printDocument
              .images
          );

        await Promise.all(
          images.map(
            (
              image
            ) => {

              if (
                image.complete
              ) {
                return Promise
                  .resolve();
              }


              return new Promise<void>(
                (
                  resolve
                ) => {

                  image.onload =
                    () =>
                      resolve();


                  image.onerror =
                    () =>
                      resolve();

                }
              );

            }
          )
        );


        /*
        * Tunggu layout iframe stabil.
        */
        await new Promise<void>(
          (
            resolve
          ) => {

            printWindow
              .requestAnimationFrame(
                () => {

                  printWindow
                    .requestAnimationFrame(
                      () =>
                        resolve()
                    );

                }
              );

          }
        );


        // =================================================
        // 9. PRINT
        // =================================================

        printWindow
          .focus();


        printWindow
          .print();


        // =================================================
        // 10. CLEANUP SESUDAH PRINT
        // =================================================

        printWindow
          .addEventListener(
            'afterprint',
            () => {

              window
                .setTimeout(
                  () => {

                    iframe
                      ?.remove();

                  },
                  300
                );

            },
            {
              once:
                true
            }
          );


      } catch (
      error: any
      ) {

        console.error(
          'Print DN Monitoring:',
          error
        );


        iframe
          ?.remove();


        notificationStore
          .showAlertError(
            error.message ||
            'Gagal membuka Print Preview.'
          );


      } finally {

        isPrintingDnMonitoringReport
          .value =
          false;

      }
    };


  // ============================================================
  // DELETE SELECTED RAW FILES
  // ============================================================

  const deleteSelectedRawFiles =
    (): void => {
      if (!requireUploadSoPermission('delete')) {
        return;
      }


      const sourceIds =
        isDcwaSoMode.value
          ? dcwaRawSoSelectedIds.value
          : selectedRawIds.value;

      const ids =
        Array.from(
          new Set(
            sourceIds
          )
        )
          .filter(
            (
              id
            ) =>
              Number(
                id
              ) >
              0
          );


      if (
        ids.length ===
        0
      ) {
        notificationStore
          .showAlertWarning(
            'Pilih minimal satu Raw File yang akan dihapus.'
          );

        return;
      }


      executeRawFilesDelete(

        ids,

        'Delete Selected Raw Files',

        `${ids.length} Raw Files yang dipilih akan dihapus.

Format Sales Order yang berasal dari Raw Files tersebut juga akan dihapus.

Sales Order Mapping akan dihapus apabila logical order sudah tidak memiliki Raw File.

Tracking hanya akan dihapus apabila batch tersebut sudah tidak memiliki Raw File.${
          isFtiSoMode.value
            ? '\n\nUntuk FTI, metadata Additional Order juga ikut dibersihkan jika seluruh Raw terkait Additional Order tersebut sudah tidak ada.'
            : ''
        }

Apakah Anda yakin?`
      );
    };


  // ============================================================
  // DELETE ALL FILTERED RAW FILES
  // ============================================================

  const deleteFilteredRawFiles =
    async (): Promise<void> => {
      if (!requireUploadSoPermission('delete')) {
        return;
      }


      // ========================================================
      // SAFETY: HARUS ADA FILTER
      // ========================================================

      if (
        !hasRawDeleteActiveFilter
          .value
      ) {
        notificationStore
          .showAlertWarning(
            'Aktifkan filter Customer, Order Date, atau filter kolom terlebih dahulu sebelum menggunakan Delete Filtered.'
          );

        return;
      }


      // ========================================================
      // FILTERED DELETE DISELESAIKAN BACKEND TANPA FULL HYDRATION
      // ========================================================

      const filteredDeleteCount =
        rawServerPaged[getActiveRawServerSource()]
          ? rawFilteredCancelCount.value
          : filteredRawIds.value.length;

      if (filteredDeleteCount === 0) {
        notificationStore.showAlertWarning(
          'Tidak ada Raw Files pada hasil filter yang dapat dihapus.'
        );
        return;
      }

      // ========================================================
      // BUILD FILTER DESCRIPTION
      // ========================================================

      const filterDescriptions:
        string[] =
        [];


      // CUSTOMER

      if (
        selectedCustomers
          .value
          .length >
        0
      ) {
        filterDescriptions.push(
          `Customer: ${selectedCustomers
            .value
            .join(
              ', '
            )
          }`
        );
      }


      // DATE

      if (
        fromDate.value ||
        toDate.value
      ) {
        filterDescriptions.push(
          `Order Date: ${fromDate.value ||
          '-'
          } s/d ${toDate.value ||
          '-'
          }`
        );
      }

      if (
        deliveryFromDate.value ||
        deliveryToDate.value
      ) {
        filterDescriptions.push(
          `Delivery Date: ${deliveryFromDate.value ||
          '-'
          } s/d ${deliveryToDate.value ||
          '-'
          }`
        );
      }

      if (
        creationFromDate.value ||
        creationToDate.value
      ) {
        filterDescriptions.push(
          `Created At: ${creationFromDate.value ||
          '-'
          } s/d ${creationToDate.value ||
          '-'
          }`
        );
      }


      // COLUMN FILTER COUNT
      // Gunakan daftar kolom customer yang sedang aktif.
      // Sebelumnya bagian ini selalu memakai card2Columns (ADM), sehingga
      // konfirmasi Delete Filtered Gaya/NTC/TMMIN tidak menampilkan filter
      // kolom yang benar walaupun ID yang dihapus sudah benar.

      const activeColumnFilterLabels: string[] =
        isDpmSoMode.value
          ? dpmRawSoColumns
            .filter(
              (column) =>
                (dpmRawSoSelectedFilters.value[column.key]?.length ?? 0) > 0
            )
            .map((column) => column.label)
        : isDcwaSoMode.value
          ? dcwaRawSoColumns
            .filter(
              (column) =>
                (dcwaRawSoSelectedFilters.value[column.key]?.length ?? 0) > 0
            )
            .map((column) => column.label)
          : isGayaSoMode.value
            ? gayaRawSoVisibleColumns.value
              .filter(
                (column) =>
                  (gayaRawSoSelectedFilters.value[column.key]?.length ?? 0) > 0
              )
              .map((column) => column.label)
            : isNtcSoMode.value
              ? ntcRawSoVisibleColumns.value
                .filter(
                  (column) =>
                    (ntcRawSoSelectedFilters.value[column.key]?.length ?? 0) > 0
                )
                .map((column) => column.label)
              : isTmminSoMode.value
                ? tmminRawSoVisibleColumns.value
                  .filter(
                    (column) =>
                      (tmminRawSoSelectedFilters.value[column.key]?.length ?? 0) > 0
                  )
                  .map((column) => column.label)
                : card2Columns
                  .filter(
                    (column) =>
                      (card2SelectedFilters.value[column.key]?.length ?? 0) > 0
                  )
                  .map((column) => column.label);


      if (
        activeColumnFilterLabels.length >
        0
      ) {
        filterDescriptions.push(
          `Column Filter: ${activeColumnFilterLabels.join(', ')}`
        );
      }


      const filterText =
        filterDescriptions
          .length >
          0
          ? filterDescriptions
            .join(
              '\n'
            )
          : '-';


      // ========================================================
      // EXECUTE
      // ========================================================

      notificationStore.showConfirm(
        'Delete All Filtered Raw Files',
        `Anda akan menghapus ${filteredDeleteCount} Raw Files yang masuk dalam hasil filter saat ini.

Filter aktif:
${filterText}

Format Sales Order yang berasal dari Raw Files tersebut juga akan dihapus.
Sales Order Mapping akan dibersihkan jika logical order sudah tidak mempunyai Raw File.
Tracking hanya akan dihapus apabila batch terkait sudah tidak mempunyai Raw File.
Apakah Anda benar-benar yakin ingin melanjutkan?`,
        async () => {
          try {
            isDeletingRawFiles.value = true;
            const response = await customerOrderService.deleteRawFiles({
              ...buildRawFilteredLifecyclePayload()
            } as any);
            if (response.status !== 'success') {
              throw new Error(response.message || 'Delete Filtered Raw Files gagal.');
            }
            selectedRawIds.value = [];
            dcwaRawSoSelectedIds.value = [];
            notificationStore.showAlertSuccess(response.message);
            await refreshAfterRawLifecycleChange();
          } catch (error: any) {
            notificationStore.showAlertError(
              error?.response?.data?.message || error?.message || 'Delete Filtered Raw Files gagal.'
            );
          } finally {
            isDeletingRawFiles.value = false;
          }
        }
      );
    };

  // ============================================================
  // RESET DN MONITORING REPORT
  // ============================================================
  // ============================================================
  // RESET DN MONITORING REPORT
  // ============================================================

  const resetDnMonitoringReport =
    (): void => {

      /*
       * Source DN berubah.
       *
       * JANGAN hapus report lama.
       *
       * Report lama tetap dipakai sebagai snapshot agar:
       *
       * Crosscheck View
       * -> Back to Paste
       * -> Check All DN
       *
       * bisa langsung kembali ke layout sebelumnya tanpa menunggu
       * proses report dari backend.
       *
       * Yang berubah hanya statusnya menjadi STALE.
       */
      if (
        hasDnMonitoringReportCache
          .value
      ) {
        isDnMonitoringReportStale
          .value =
          true;
      }

      /*
       * Saat source DN berubah, sementara kembali ke Data Only.
       * Nanti `restoreDnMonitoringViewAfterCheckAll()` akan
       * mengembalikan mode sebelumnya secara instan.
       */
      showDnMonitoringReport
        .value =
        false;

      showDnMonitoringCompare
        .value =
        false;
    };

  watch(
    dnCrosscheckRows,
    resetDnMonitoringReport,
    {
      deep: true
    }
  );

  /*
   * Report Monitoring adalah snapshot. Saat scope/filter utama berubah,
   * tandai snapshot sebagai stale SEBELUM request reload selesai supaya
   * tombol `Report Perlu Update` langsung terlihat oleh user.
   *
   * Pagination/sort tabel tidak masuk fingerprint karena itu hanya mengubah
   * cara data ditampilkan, bukan scope report.
   */
  const dnMonitoringReportSourceFingerprint = computed<string>(() =>
    JSON.stringify({
      customers: [...selectedCustomers.value]
        .map((customer) => String(customer ?? '').trim().toUpperCase())
        .filter(Boolean)
        .sort(),
      order_from: fromDate.value || '',
      order_to: toDate.value || '',
      delivery_from: deliveryFromDate.value || '',
      delivery_to: deliveryToDate.value || '',
      creation_from: creationFromDate.value || '',
      creation_to: creationToDate.value || '',
      report_period: normalizeDnMonitoringPeriod(
        dnMonitoringReportPeriod.value
      ),
      report_date_basis: dnMonitoringReportDateBasis.value || ''
    })
  );

  watch(
    dnMonitoringReportSourceFingerprint,
    (nextFingerprint, previousFingerprint) => {
      if (
        !previousFingerprint ||
        nextFingerprint === previousFingerprint ||
        !hasDnMonitoringReportCache.value
      ) {
        return;
      }

      isDnMonitoringReportStale.value = true;
    },
    { flush: 'sync' }
  );

  // VIEW UI STATE & HELPERS

  const uploadFileInput = ref<HTMLInputElement | null>(null);
  
  // TRACKING SO - BULK UPDATE UI
  // UI-only bulk editor.
  // Tidak mengubah schema / endpoint backend.
  // Penyimpanan tetap memakai saveTrackingCell() existing per row.
  const trackingBulkMode = ref(false);
  const trackingBulkSelectedIds = ref<Set<number>>(new Set());
  
  const trackingBulkDate = ref('');
  const trackingBulkTime = ref('');
  const trackingBulkUser = ref('');
  const trackingBulkStatus = ref('');
  const trackingBulkRemarks = ref('');
  
  const trackingBulkUserDropdownOpen = ref(false);
  const trackingBulkStatusDropdownOpen = ref(false);
  
  const trackingBulkVisibleUserOptions = computed(() => {
    return uploadUserOptions.value.filter((user) => {
      return String(user ?? '').trim().toLowerCase() !== 'pius';
    });
  });
  
  const trackingBulkStatusMeta = computed(() => {
    return (
      trackingStatusOptions.find((option) => {
        return option.value === trackingBulkStatus.value;
      }) ?? null
    );
  });
  
  const closeTrackingBulkValueDropdowns = () => {
    trackingBulkUserDropdownOpen.value = false;
    trackingBulkStatusDropdownOpen.value = false;
  };
  
  const toggleTrackingBulkUserValueDropdown = () => {
    trackingBulkUserDropdownOpen.value =
      !trackingBulkUserDropdownOpen.value;
    trackingBulkStatusDropdownOpen.value = false;
  };
  
  const toggleTrackingBulkStatusValueDropdown = () => {
    trackingBulkStatusDropdownOpen.value =
      !trackingBulkStatusDropdownOpen.value;
    trackingBulkUserDropdownOpen.value = false;
  };
  
  const selectTrackingBulkUserValue = (user: string) => {
    trackingBulkUser.value = String(user ?? '').trim();
    trackingBulkUserDropdownOpen.value = false;
  };
  
  const selectTrackingBulkStatusValue = (status: string) => {
    trackingBulkStatus.value = String(status ?? '').trim();
    trackingBulkStatusDropdownOpen.value = false;
  };
  
  const trackingBulkIsApplying = ref(false);
  const trackingBulkIsSelectingFiltered = ref(false);
  const trackingBulkProgressDone = ref(0);
  const trackingBulkProgressTotal = ref(0);
  const trackingBulkMessage = ref('');
  const trackingBulkMessageType = ref<'success' | 'warning' | 'error'>('success');

  const normalizeTrackingBulkFilterFingerprint = (
    filters: Record<string, string[]>
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

  const trackingBulkSelectionScopeFingerprint = computed(() =>
    JSON.stringify({
      customers: getTrackingFilterScopeCustomers()
        .map((customer) => String(customer ?? '').trim().toUpperCase())
        .filter(Boolean)
        .sort(),
      dates: getTrackingDateFilterParams(),
      filters: normalizeTrackingBulkFilterFingerprint(
        buildTrackingServerTextFilters()
      ),
      colors: normalizeTrackingBulkFilterFingerprint(
        buildTrackingServerColorFilters()
      )
    })
  );

  watch(
    trackingBulkSelectionScopeFingerprint,
    (nextFingerprint, previousFingerprint) => {
      if (
        !previousFingerprint ||
        nextFingerprint === previousFingerprint ||
        trackingBulkSelectedIds.value.size === 0
      ) {
        return;
      }

      // Selection lintas page tetap dipertahankan. Hanya perubahan scope/filter
      // yang mengosongkan pilihan agar ID dari customer/filter lama tidak ikut
      // ter-update tanpa terlihat di page aktif.
      trackingBulkSelectedIds.value = new Set();
      trackingBulkMessageType.value = 'warning';
      trackingBulkMessage.value =
        'Pilihan Tracking direset karena scope atau filter berubah.';
    },
    { flush: 'sync' }
  );
  
  const trackingBulkSelectedRows = computed(() => {
    const selectedIds = trackingBulkSelectedIds.value;
  
    return sortedData.value.filter((row) => {
      return selectedIds.has(Number(row.id));
    });
  });
  
  const trackingBulkSelectedCount = computed(() => {
    return trackingBulkSelectedIds.value.size;
  });
  
  const trackingBulkHasChanges = computed(() => {
    return Boolean(
      trackingBulkDate.value ||
      trackingBulkTime.value ||
      trackingBulkUser.value ||
      trackingBulkStatus.value ||
      trackingBulkRemarks.value.trim()
    );
  });
  
  const isTrackingBulkCurrentPageSelected = computed(() => {
    const rows = paginatedData.value;
  
    return (
      rows.length > 0 &&
      rows.every((row) => {
        return trackingBulkSelectedIds.value.has(Number(row.id));
      })
    );
  });
  
  const getJakartaDateValue = (): string => {
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
  
  const getJakartaTimeValue = (): string => {
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
  
  const toggleTrackingBulkMode = () => {
    trackingBulkMode.value = !trackingBulkMode.value;
    trackingBulkMessage.value = '';
    closeTrackingBulkValueDropdowns();
  };
  
  const isTrackingBulkRowSelected = (trackingId: number): boolean => {
    return trackingBulkSelectedIds.value.has(Number(trackingId));
  };
  
  const toggleTrackingBulkRow = (trackingId: number) => {
    const id = Number(trackingId);
  
    if (!Number.isFinite(id) || id <= 0) {
      return;
    }
  
    const next = new Set(trackingBulkSelectedIds.value);
  
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
  
    trackingBulkSelectedIds.value = next;
    trackingBulkMessage.value = '';
  };
  
  const selectTrackingBulkCurrentPage = () => {
    const next = new Set(trackingBulkSelectedIds.value);
  
    paginatedData.value.forEach((row) => {
      const id = Number(row.id);
  
      if (Number.isFinite(id) && id > 0) {
        next.add(id);
      }
    });
  
    trackingBulkSelectedIds.value = next;
    trackingBulkMessage.value = '';
  };
  
  const toggleTrackingBulkCurrentPageSelection = () => {
    const next = new Set(trackingBulkSelectedIds.value);
  
    if (isTrackingBulkCurrentPageSelected.value) {
      paginatedData.value.forEach((row) => {
        next.delete(Number(row.id));
      });
    } else {
      paginatedData.value.forEach((row) => {
        const id = Number(row.id);
  
        if (Number.isFinite(id) && id > 0) {
          next.add(id);
        }
      });
    }
  
    trackingBulkSelectedIds.value = next;
    trackingBulkMessage.value = '';
  };
  
  const collectTrackingFilteredIds = async (maxTargets = 2000): Promise<number[]> => {
    const baseParams = getTrackingDateFilterParams();
    const customers = getTrackingFilterScopeCustomers();
    const textFilters = buildTrackingServerTextFilters();
    const colorFilters = buildTrackingServerColorFilters();
    const trackingSortKey = sortKey.value ?? '';
    const trackingSortDirection = sortDirection.value;
    const pageSize = 200;

    const requestPage = (page: number) =>
      customerOrderService.getTrackingPage(
        baseParams,
        customers,
        page,
        pageSize,
        textFilters,
        colorFilters,
        trackingSortKey,
        trackingSortDirection
      );

    const firstResponse = await requestPage(1);
    if (firstResponse.status !== 'success') {
      throw new Error(firstResponse.message || 'Gagal mengambil hasil filter Tracking.');
    }

    const total = Number(firstResponse.total ?? 0);
    if (total > maxTargets) {
      throw new Error(
        `Hasil filter berjumlah ${total.toLocaleString('id-ID')} baris. ` +
        `Maksimal ${maxTargets.toLocaleString('id-ID')} baris per operasi.`
      );
    }

    const ids = new Set<number>();
    const collect = (rows: TrackingBackendRow[]) => {
      rows.forEach((row) => {
        const id = Number(row.id);
        if (Number.isInteger(id) && id > 0) {
          ids.add(id);
        }
      });
    };

    collect(firstResponse.data ?? []);

    const totalPages = Math.max(
      1,
      Number(firstResponse.total_pages ?? Math.max(1, Math.ceil(total / pageSize)))
    );

    for (let page = 2; page <= totalPages; page += 1) {
      const response = await requestPage(page);
      if (response.status !== 'success') {
        throw new Error(response.message || 'Gagal mengambil hasil filter Tracking.');
      }
      collect(response.data ?? []);
    }

    return Array.from(ids);
  };

  const selectTrackingBulkFilteredRows = async () => {
    if (trackingBulkIsSelectingFiltered.value || trackingBulkIsApplying.value) {
      return;
    }

    trackingBulkIsSelectingFiltered.value = true;
    trackingBulkMessageType.value = 'warning';
    trackingBulkMessage.value = 'Mengambil seluruh hasil filter Tracking...';

    try {
      const ids = await collectTrackingFilteredIds(2000);
      const next = new Set(trackingBulkSelectedIds.value);
      ids.forEach((id) => next.add(id));
      trackingBulkSelectedIds.value = next;
      trackingBulkMessageType.value = 'success';
      trackingBulkMessage.value =
        `${ids.length.toLocaleString('id-ID')} hasil filter berhasil dipilih.`;
    } catch (error: unknown) {
      trackingBulkMessageType.value = 'error';
      trackingBulkMessage.value =
        error instanceof Error
          ? error.message
          : 'Gagal memilih seluruh hasil filter Tracking.';
    } finally {
      trackingBulkIsSelectingFiltered.value = false;
    }
  };
  
  const clearTrackingBulkSelection = () => {
    trackingBulkSelectedIds.value = new Set();
    trackingBulkMessage.value = '';
  };
  
  const setTrackingBulkToday = () => {
    trackingBulkDate.value = getJakartaDateValue();
  };
  
  const setTrackingBulkNow = () => {
    trackingBulkTime.value = getJakartaTimeValue();
  };
  
  const applyTrackingBulkUpdate = async () => {
    if (!requireUploadSoPermission('update')) {
      return;
    }

    if (trackingBulkIsApplying.value || trackingBulkIsSelectingFiltered.value) {
      return;
    }

    const ids = Array.from(trackingBulkSelectedIds.value)
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0);

    if (ids.length === 0) {
      trackingBulkMessageType.value = 'warning';
      trackingBulkMessage.value =
        'Pilih minimal satu baris Tracking terlebih dahulu.';
      return;
    }

    if (ids.length > 2000) {
      trackingBulkMessageType.value = 'warning';
      trackingBulkMessage.value =
        'Maksimal 2.000 Tracking per update massal.';
      return;
    }

    if (!trackingBulkHasChanges.value) {
      trackingBulkMessageType.value = 'warning';
      trackingBulkMessage.value =
        'Isi minimal satu field yang ingin diterapkan.';
      return;
    }

    const changes: Partial<Record<TrackingUpdateField, string | null>> = {};
    if (trackingBulkDate.value) changes.upload_date = trackingBulkDate.value;
    if (trackingBulkTime.value) changes.upload_time = trackingBulkTime.value;
    if (trackingBulkUser.value) changes.upload_so_by = trackingBulkUser.value;
    if (trackingBulkStatus.value) changes.status = trackingBulkStatus.value;

    const bulkRemarks = trackingBulkRemarks.value.trim();
    if (bulkRemarks) changes.remarks = bulkRemarks;

    trackingBulkIsApplying.value = true;
    trackingBulkProgressDone.value = 0;
    trackingBulkProgressTotal.value = ids.length;
    trackingBulkMessage.value = '';

    try {
      const response = await customerOrderService.bulkUpdateTracking({
        ids,
        changes
      });

      if (response.status !== 'success') {
        throw new Error(response.message || 'Update massal Tracking gagal.');
      }

      trackingBulkProgressDone.value = ids.length;

      // Setelah berhasil, selection harus kosong. Ini mencegah user tanpa sadar
      // menerapkan perubahan kedua ke ID yang sama setelah tabel direload.
      clearTrackingBulkSelection();
      trackingBulkMessageType.value = 'success';
      trackingBulkMessage.value =
        `${ids.length.toLocaleString('id-ID')} baris Tracking berhasil diperbarui.`;

      // Backend bulk berjalan dalam satu transaction. Reload page aktif supaya
      // nilai yang ditampilkan konsisten dengan database tanpa full-load scope.
      await loadTrackingData();
    } catch (error: unknown) {
      trackingBulkMessageType.value = 'error';
      trackingBulkMessage.value =
        error instanceof Error
          ? error.message
          : 'Update massal Tracking gagal.';
    } finally {
      trackingBulkIsApplying.value = false;
    }
  };

  
  
  // ============================================================
  // UPLOAD CUSTOMER OPTION - ADM P1 + P4 COMBINED
  // ============================================================
  //
  // Hanya Upload File Form yang digabung.
  // Header filter / Raw / Format SO tetap memakai ADM P1 dan ADM P4 terpisah.
  //
  // Value internal sengaja tetap "ADM P1" agar:
  // - password Excel existing tetap aktif,
  // - flow upload P1/P4 combined existing tetap dipakai,
  // - tidak perlu mengubah schema/service/store.
  //
  type UploadCustomerOption = {
    value: string;
    label: string;
  };
  
  const uploadCustomerOptions = computed<UploadCustomerOption[]>(() => {
    const result: UploadCustomerOption[] = [];
    let combinedAdmAdded = false;
  
    customerOptions.forEach((customer) => {
      const normalized = String(customer ?? '').trim().toUpperCase();
  
      if (
        normalized === 'ADM P1' ||
        normalized === 'ADM P4'
      ) {
        if (!combinedAdmAdded) {
          result.push({
            value: 'ADM P1',
            label: 'ADM P1 & P4'
          });
  
          combinedAdmAdded = true;
        }
  
        return;
      }
  
      result.push({
        value: customer,
        label: customer
      });
    });
  


    /*
     * ASI ADM harus dapat dipilih sejak upload Ordering pertama,
     * sebelum tabel ordering_asi_adm_raw mempunyai data.
     */
    if (
      !result.some(
        (option) =>
          String(option.value ?? '')
            .trim()
            .toUpperCase() === 'ASI ADM'
      )
    ) {
      result.push({
        value: 'ASI ADM',
        label: 'ASI ADM'
      });
    }

    /*
     * NTC harus dapat dipilih untuk upload pertama.
     * Customer header tetap dinamis berdasarkan data aktif di database.
     */
    if (
      !result.some(
        (option) =>
          String(option.value ?? '')
            .trim()
            .toUpperCase() === 'NTC'
      )
    ) {
      result.push({
        value: 'NTC',
        label: 'NTC'
      });
    }

    /*
     * Gaya Motor harus bisa dipilih sejak upload pertama, bahkan ketika
     * ordering_gaya_motor_raw masih kosong dan belum muncul pada customerOptions.
     */
    if (
      !result.some(
        (option) =>
          String(option.value ?? '')
            .trim()
            .toUpperCase() === 'GAYA MTR'
      )
    ) {
      result.push({
        value: 'GAYA MTR',
        label: 'GAYA MOTOR'
      });
    } else {
      result.forEach((option) => {
        if (
          String(option.value ?? '')
            .trim()
            .toUpperCase() === 'GAYA MTR'
        ) {
          option.label = 'GAYA MOTOR';
        }
      });
    }

    /*
     * DCWA dapat dipilih sejak upload pertama walaupun ordering_dcwa_raw
     * masih kosong dan belum muncul pada customerOptions.
     */
    if (
      !result.some(
        (option) =>
          String(option.value ?? '')
            .trim()
            .toUpperCase() === 'DCWA'
      )
    ) {
      result.push({
        value: 'DCWA',
        label: 'DCWA'
      });
    }

    // FTI tidak upload file pada tahap Raw Order; sumbernya ZSTT FTI.
    if (
      !result.some(
        (option) => String(option.value ?? '').trim().toUpperCase() === 'FTI'
      )
    ) {
      result.push({ value: 'FTI', label: 'FTI' });
    }

    // DPM harus tersedia sejak upload pertama walaupun tabel raw masih kosong.
    if (
      !result.some(
        (option) => String(option.value ?? '').trim().toUpperCase() === 'DPM'
      )
    ) {
      result.push({ value: 'DPM', label: 'DPM' });
    }


    // MES menggunakan PDF Purchase Order / RFQ text-based dan harus dapat dipilih sejak upload pertama.
    if (
      !result.some(
        (option) => String(option.value ?? '').trim().toUpperCase() === 'MES'
      )
    ) {
      result.push({ value: 'MES', label: 'MES' });
    }

    return result.sort((first, second) =>
      first.label.localeCompare(second.label, 'id', {
        numeric: true,
        sensitivity: 'base'
      })
    );
  });
  
  const selectedUploadCustomerLabel = computed(() => {
    const normalized =
      String(selectedCustomerUpload.value ?? '')
        .trim()
        .toUpperCase();
  
    if (
      normalized === 'ADM P1' ||
      normalized === 'ADM P4'
    ) {
      return 'ADM P1 & P4';
    }

    if (normalized === 'GAYA MTR') {
      return 'GAYA MOTOR';
    }
  
    return selectedCustomerUpload.value;
  });
  
  type AdmCombinedPreviewCustomer =
    | 'ADM P1'
    | 'ADM P4';
  
  const activeAdmCombinedPreviewCustomer =
    ref<AdmCombinedPreviewCustomer>('ADM P1');
  
  const isAdmP1P4CombinedUpload = computed(() => {
    const normalized =
      String(selectedCustomerUpload.value ?? '')
        .trim()
        .toUpperCase();
  
    return (
      normalized === 'ADM P1' ||
      normalized === 'ADM P4'
    );
  });
  
  /*
   * Preview ADM P1/P4/P5 memakai satu sheet aktif yang sudah dipilih backend.
   * Dropdown Sheet hanya relevan untuk customer Excel non-ADM.
   */
  const isAdmExcelUploadPreview = computed(() => {
    const customer =
      String(selectedCustomerUpload.value ?? '')
        .trim()
        .toUpperCase();
  
    return [
      'ADM P1',
      'ADM P4',
      'ADM P5'
    ].includes(customer);
  });
  
  const excelPreviewPlantCodeIndex = computed(() => {
    const index =
      excelPreviewHeaders.value.findIndex((header) => {
        return String(header ?? '')
          .trim()
          .replace(/\s+/g, ' ')
          .toUpperCase() === 'PLANT CODE';
      });
  
    return index >= 0
      ? index
      : 0;
  });
  
  const getExcelPreviewPlantCode = (
    row: unknown[]
  ): string => {
    return String(
      row?.[
      excelPreviewPlantCodeIndex.value
      ] ?? ''
    )
      .trim()
      .replace(/\s+/g, '')
      .toUpperCase();
  };
  
  const admP1ExcelPreviewRows = computed(() => {
    return normalizedExcelPreviewRows.value.filter(
      (row) =>
        getExcelPreviewPlantCode(row) ===
        'D101'
    );
  });
  
  const admP4ExcelPreviewRows = computed(() => {
    return normalizedExcelPreviewRows.value.filter(
      (row) =>
        getExcelPreviewPlantCode(row) ===
        'D104'
    );
  });

  // Preview ADM P1/P4/P5 berhenti di kolom Remark.
  // Kolom source setelah Remark kosong dan tidak perlu dirender.
  const admRemarkColumnIndex = computed(() => {
    if (!isAdmExcelUploadPreview.value) {
      return -1;
    }

    return excelPreviewHeaders.value.findIndex((header) => {
      const key = normalizeUploadPreviewHeader(header);
      return key === 'REMARK' || key === 'REMARKS';
    });
  });

  const visibleExcelPreviewColumnCount = computed(() => {
    if (
      isAdmExcelUploadPreview.value &&
      admRemarkColumnIndex.value >= 0
    ) {
      return admRemarkColumnIndex.value + 1;
    }

    return excelPreviewHeaders.value.length;
  });

  const visibleExcelPreviewHeaders = computed(() => {
    return excelPreviewHeaders.value.slice(
      0,
      visibleExcelPreviewColumnCount.value
    );
  });
  
  const visibleExcelPreviewRows = computed(() => {
    const sourceRows = !isAdmP1P4CombinedUpload.value
      ? normalizedExcelPreviewRows.value
      : activeAdmCombinedPreviewCustomer.value === 'ADM P4'
        ? admP4ExcelPreviewRows.value
        : admP1ExcelPreviewRows.value;

    return sourceRows.map((row) => {
      return row.slice(
        0,
        visibleExcelPreviewColumnCount.value
      );
    });
  });
  
  const selectAdmCombinedPreviewCustomer = (
    customer: AdmCombinedPreviewCustomer
  ) => {
    activeAdmCombinedPreviewCustomer.value =
      customer;
  };
  
  /*
   * Jika file hanya berisi salah satu plant,
   * otomatis buka tab yang memang mempunyai data.
   */
  watch(
    [
      showUploadPreview,
      () => admP1ExcelPreviewRows.value.length,
      () => admP4ExcelPreviewRows.value.length
    ],
    () => {
      if (
        !showUploadPreview.value ||
        !isAdmP1P4CombinedUpload.value
      ) {
        return;
      }
  
      if (
        admP1ExcelPreviewRows.value.length === 0 &&
        admP4ExcelPreviewRows.value.length > 0
      ) {
        activeAdmCombinedPreviewCustomer.value =
          'ADM P4';
  
        return;
      }
  
      if (
        admP4ExcelPreviewRows.value.length === 0 &&
        admP1ExcelPreviewRows.value.length > 0
      ) {
        activeAdmCombinedPreviewCustomer.value =
          'ADM P1';
      }
    }
  );
  
  // ============================================================
  // TMMIN PREVIEW SUMMARY
  // ============================================================
  
  const tmminRawSoPreviewCodeCounts = computed(() => {
    const summary = tmminUploadPreviewSummary.value ?? {};
    const summaryT034 = Number((summary as any)?.code_t034);
    const summaryTmaj = Number((summary as any)?.code_tmaj);

    if (Number.isFinite(summaryT034) && Number.isFinite(summaryTmaj)) {
      return {
        t034: Math.max(0, summaryT034),
        tmaj: Math.max(0, summaryTmaj)
      };
    }

    let t034 = 0;
    let tmaj = 0;
    tmminRawSoPreviewRows.value.forEach((row) => {
      const code = String(row?.bCode ?? '').trim().toUpperCase();
      if (code === 'T034') t034++;
      else if (code === 'TMAJ') tmaj++;
    });

    return { t034, tmaj };
  });
  
  
  // ============================================================
  // UPLOAD PREVIEW SUMMARY HELPERS
  // ============================================================
  
  const formatUploadPreviewNumber = (
    value: unknown
  ): string => {
    const number = Number(value ?? 0);
  
    if (!Number.isFinite(number)) {
      return '0';
    }
  
    return new Intl.NumberFormat('id-ID', {
      maximumFractionDigits: 2
    }).format(number);
  };
  
  const formatUploadPreviewDate = (
    value: unknown
  ): string => {
    const text =
      String(value ?? '').trim();
  
    if (text === '') {
      return '-';
    }
  
    const match =
      text.match(
        /^(\d{4})-(\d{2})-(\d{2})$/
      );
  
    if (!match) {
      return text;
    }
  
    return `${match[3]}-${match[2]}-${match[1]}`;
  };
  
  const formatUploadPreviewDateRange = (
    from: unknown,
    to: unknown
  ): string => {
    const start =
      String(from ?? '').trim();
  
    const end =
      String(to ?? '').trim();
  
    if (start === '' && end === '') {
      return '-';
    }
  
    if (
      start !== '' &&
      (end === '' || start === end)
    ) {
      return formatUploadPreviewDate(start);
    }
  
    if (start === '') {
      return formatUploadPreviewDate(end);
    }
  
    return `${formatUploadPreviewDate(start)} – ${formatUploadPreviewDate(end)}`;
  };
  
  const activeAdmPreviewPlantCode =
    computed(() => {
      if (isAdmP1P4CombinedUpload.value) {
        return activeAdmCombinedPreviewCustomer.value ===
          'ADM P4'
          ? 'D104'
          : 'D101';
      }
  
      const customer =
        String(
          selectedCustomerUpload.value ?? ''
        )
          .trim()
          .toUpperCase();
  
      if (customer === 'ADM P1') {
        return 'D101';
      }
  
      if (customer === 'ADM P4') {
        return 'D104';
      }
  
      if (customer === 'ADM P5') {
        return 'D105';
      }
  
      return '';
    });
  
  const activeAdmUploadPreviewSummary =
    computed<Record<string, any>>(() => {
      const plantCode =
        activeAdmPreviewPlantCode.value;
  
      if (plantCode === '') {
        return {};
      }
  
      return (
        admUploadPreviewSummaryByPlant
          .value?.[plantCode] ?? {}
      );
    });
  
  const tmminUploadPreviewSummarySafe =
    computed<Record<string, any>>(() => {
      return (
        tmminUploadPreviewSummary.value ?? {}
      );
    });
  
  const normalizeUploadPreviewHeader = (
    value: unknown
  ): string => {
    return String(value ?? '')
      .trim()
      .replace(/[^A-Z0-9]+/gi, '')
      .toUpperCase();
  };
  
  /*
   * Kode, tanggal, status, dan angka lebih mudah dibandingkan jika center.
   * Nama/alias/remark tetap left supaya teks panjang nyaman dibaca.
   */
  const isExcelPreviewCenteredColumn = (
    header: unknown
  ): boolean => {
    const key =
      normalizeUploadPreviewHeader(
        header
      );
  
    return ![
      'PARTNAME',
      'VENDORALIAS',
      'VENDORSITEALIAS',
      'REMARK',
      'REMARKS'
    ].includes(key);
  };
  
  const isTmminPreviewCenteredColumn = (
    key: unknown
  ): boolean => {
    return ![
      'vSupplierName',
      'wPartName'
    ].includes(
      String(key ?? '')
    );
  };
  
  
  // ============================================================
  // TMMIN RAW SO PREVIEW TABLE STYLE
  // ============================================================
  
  /*
   * Freeze TMMIN sampai PART NO (kolom K / kPartNoRaw).
   * Kolom yang benar-benar kosong dapat disembunyikan oleh store,
   * jadi index freeze selalu dicari dari visible columns yang aktif.
   */
  const tmminRawSoPreviewFrozenColumnCount =
    computed(() => {
      const partNoIndex =
        tmminRawSoPreviewVisibleColumns.value
          .findIndex(
            (column) =>
              String(column.key) ===
              'kPartNoRaw'
          );
  
      return partNoIndex >= 0
        ? partNoIndex + 1
        : 0;
    });
  
  const getTmminRawSoPreviewColumnWidth = (
    columnIndex: number
  ): number => {
    const column =
      tmminRawSoPreviewVisibleColumns.value[
      columnIndex
      ];
  
    const width = Number.parseFloat(
      String(column?.width ?? '100px')
        .replace('px', '')
    );
  
    return Number.isFinite(width)
      ? width
      : 100;
  };
  
  const getTmminRawSoPreviewFrozenLeft = (
    columnIndex: number
  ): number => {
    let left = 0;
  
    for (
      let index = 0;
      index < columnIndex;
      index += 1
    ) {
      left +=
        getTmminRawSoPreviewColumnWidth(
          index
        );
    }
  
    return left;
  };
  
  const getTmminRawSoPreviewCellStyle = (
    columnIndex: number,
    isHeader = false,
    rowIndex = 0
  ): CSSProperties => {
    const width =
      getTmminRawSoPreviewColumnWidth(
        columnIndex
      );
  
    const frozen =
      columnIndex >= 0 &&
      columnIndex <
      tmminRawSoPreviewFrozenColumnCount.value;
  
    const isLastFrozen =
      frozen &&
      columnIndex ===
      tmminRawSoPreviewFrozenColumnCount.value - 1;
  
    const backgroundColor =
      isHeader
        ? '#eff6ff'
        : rowIndex % 2 === 0
          ? '#ffffff'
          : '#f8fafc';
  
    const gridColor = '#e2e8f0';
  
    /*
     * Grid tipis sama seperti preview ADM: satu garis inset 1px.
     * Tidak memakai border per-cell agar garis tidak terlihat ganda/tebal.
     */
    const boxShadows = [
      `inset -1px 0 0 ${gridColor}`,
      `inset 0 -1px 0 ${gridColor}`
    ];
  
    if (isHeader) {
      boxShadows.push(
        `inset 0 1px 0 ${gridColor}`
      );
    }
  
    if (columnIndex === 0) {
      boxShadows.push(
        `inset 1px 0 0 ${gridColor}`
      );
    }
  
    if (isLastFrozen) {
      boxShadows.push(
        '3px 0 7px -6px rgba(15, 23, 42, 0.32)'
      );
    }
  
    const baseStyle: CSSProperties = {
      minWidth: `${width}px`,
      width: `${width}px`,
      maxWidth: `${width}px`,
      boxSizing: 'border-box',
      backgroundColor,
      backgroundImage:
        `linear-gradient(${backgroundColor}, ${backgroundColor})`,
      backgroundClip: 'border-box',
      boxShadow: boxShadows.join(', ')
    };
  
    if (frozen && isHeader) {
      return {
        ...baseStyle,
        position: 'sticky',
        left:
          `${getTmminRawSoPreviewFrozenLeft(columnIndex)}px`,
        top: '0px',
        zIndex: 130
      };
    }
  
    if (isHeader) {
      return {
        ...baseStyle,
        position: 'sticky',
        top: '0px',
        zIndex: 110
      };
    }
  
    if (frozen) {
      return {
        ...baseStyle,
        position: 'sticky',
        left:
          `${getTmminRawSoPreviewFrozenLeft(columnIndex)}px`,
        zIndex: 80
      };
    }
  
    return {
      ...baseStyle,
      position: 'relative',
      zIndex: 1
    };
  };
  
  
  // ============================================================
  // ADM EXCEL PREVIEW TABLE STYLE
  // ============================================================
  
  /*
   * Freeze sama dengan tabel utama Raw Files:
   * Plant Code + Shop Code + Part Category.
   */
  const admExcelPreviewFrozenColumnCount =
    computed(() => {
      const partCategoryIndex =
        visibleExcelPreviewHeaders.value
          .findIndex(
            (header) =>
              normalizeUploadPreviewHeader(
                header
              ) === 'PARTCATEGORY'
          );
  
      return partCategoryIndex >= 0
        ? partCategoryIndex + 1
        : 0;
    });
  
  /*
   * Minimum width per tipe kolom.
   * Nilai akhir tetap dihitung dari header + isi preview agar teks
   * tidak terpotong seperti pada preview sebelumnya.
   */
  const admExcelPreviewColumnMinWidth = (
    key: string
  ): number => {
    const widths: Record<string, number> = {
      PLANTCODE: 88,
      SHOPCODE: 92,
      PARTCATEGORY: 112,
      ROUTE: 112,
      LP: 72,
      TRIP: 68,
      VENDORCODE: 112,
      VENDORALIAS: 140,
      VENDORSITE: 120,
      VENDORSITEALIAS: 145,
      ORDERNO: 170,
      PONUMBER: 120,
      CALCDATE: 105,
      ORDERDATE: 105,
      ORDERTIME: 96,
      DELDATE: 105,
      DELTIME: 96,
      DELCYCLE: 92,
      DOCNO: 130,
      RECSTATUS: 105,
      DNTYPE: 90,
      RECDATE: 105,
      RECBY: 120,
      PARTNO: 140,
      PARTNAME: 250,
      JOBNO: 100,
      LANE: 82,
      QTYKBN: 92,
      ORDERKBN: 102,
      ORDERPCS: 102,
      QTYRECEIVE: 108,
      QTYBALANCE: 108,
      CANCELSTATUS: 116,
      REMARK: 180,
      REMARKS: 180
    };
  
    return widths[key] ?? 96;
  };
  
  const estimateAdmExcelPreviewTextWidth = (
    value: unknown
  ): number => {
    const text = String(value ?? '').trim();
  
    if (!text) {
      return 0;
    }
  
    /*
     * Preview memakai font 12px. Estimasi 7px/karakter + padding
     * memberi ruang yang cukup tanpa membuat kolom berlebihan.
     */
    return Math.ceil(
      Array.from(text).length * 7 + 28
    );
  };
  
  const admExcelPreviewColumnWidths =
    computed<number[]>(() => {
      return visibleExcelPreviewHeaders.value.map(
        (header, cellIndex) => {
          const key =
            normalizeUploadPreviewHeader(
              header
            );
  
          const displayHeader =
            key === 'ORDERNO'
              ? 'Order No / Nomor DN'
              : String(header ?? '');
  
          let width = Math.max(
            admExcelPreviewColumnMinWidth(key),
            estimateAdmExcelPreviewTextWidth(
              displayHeader
            )
          );
  
          visibleExcelPreviewRows.value.forEach(
            (row) => {
              width = Math.max(
                width,
                estimateAdmExcelPreviewTextWidth(
                  row?.[cellIndex]
                )
              );
            }
          );
  
          /*
           * Kolom deskripsi boleh lebih lebar. Kolom biasa dibatasi
           * supaya tabel tetap nyaman digeser horizontal.
           */
          const maxWidth = [
            'PARTNAME',
            'VENDORALIAS',
            'VENDORSITEALIAS',
            'REMARK',
            'REMARKS'
          ].includes(key)
            ? 480
            : 260;
  
          return Math.min(
            Math.max(width, 64),
            maxWidth
          );
        }
      );
    });
  
  const admExcelPreviewTableWidth =
    computed<number>(() => {
      return admExcelPreviewColumnWidths.value
        .reduce(
          (total, width) => total + width,
          0
        );
    });
  
  const getAdmExcelPreviewColumnWidth = (
    cellIndex: number
  ): number => {
    return (
      admExcelPreviewColumnWidths.value[
      cellIndex
      ] ?? 96
    );
  };
  
  const getAdmExcelPreviewFrozenLeft = (
    cellIndex: number
  ): number => {
    let left = 0;
  
    for (
      let index = 0;
      index < cellIndex;
      index += 1
    ) {
      left +=
        getAdmExcelPreviewColumnWidth(
          index
        );
    }
  
    /*
     * Jangan dikurangi 1px. Offset harus persis agar ketika scrollbar
     * digeser kembali ke paling kiri tidak muncul celah/geser kecil.
     */
    return left;
  };
  
  const getAdmExcelPreviewCellStyle = (
    cellIndex: number,
    isHeader = false,
    rowIndex = 0
  ): CSSProperties => {
    const width =
      getAdmExcelPreviewColumnWidth(
        cellIndex
      );
  
    const frozen =
      cellIndex >= 0 &&
      cellIndex <
      admExcelPreviewFrozenColumnCount.value;
  
    const isLastFrozen =
      frozen &&
      cellIndex ===
      admExcelPreviewFrozenColumnCount.value - 1;
  
    const backgroundColor =
      isHeader
        ? '#eff6ff'
        : rowIndex % 2 === 0
          ? '#ffffff'
          : '#f8fafc';
  
    const gridColor = '#e2e8f0';
  
    const boxShadows = [
      `inset -1px 0 0 ${gridColor}`,
      `inset 0 -1px 0 ${gridColor}`
    ];
  
    if (isHeader) {
      boxShadows.push(
        `inset 0 1px 0 ${gridColor}`
      );
    }
  
    if (cellIndex === 0) {
      boxShadows.push(
        `inset 1px 0 0 ${gridColor}`
      );
    }
  
    if (isLastFrozen) {
      boxShadows.push(
        '3px 0 7px -6px rgba(15, 23, 42, 0.32)'
      );
    }
  
    const baseStyle: CSSProperties = {
      minWidth: `${width}px`,
      width: `${width}px`,
      maxWidth: `${width}px`,
      boxSizing: 'border-box',
      backgroundColor,
      backgroundImage:
        `linear-gradient(${backgroundColor}, ${backgroundColor})`,
      backgroundClip: 'border-box',
      boxShadow: boxShadows.join(', ')
    };
  
    if (frozen) {
      if (isHeader) {
        return {
          ...baseStyle,
          position: 'sticky',
          left:
            `${getAdmExcelPreviewFrozenLeft(cellIndex)}px`,
          top: '0px',
          zIndex: 130
        };
      }
  
      return {
        ...baseStyle,
        position: 'sticky',
        left:
          `${getAdmExcelPreviewFrozenLeft(cellIndex)}px`,
        zIndex: 80
      };
    }
  
    if (isHeader) {
      return {
        ...baseStyle,
        position: 'sticky',
        top: '0px',
        zIndex: 110
      };
    }
  
    return {
      ...baseStyle,
      position: 'relative',
      zIndex: 1
    };
  };
  
  const getExcelPreviewDisplayHeader = (
    header: unknown
  ): string => {
    const normalized =
      normalizeUploadPreviewHeader(
        header
      );
  
    if (normalized === 'ORDERNO') {
      return 'Order No / Nomor DN';
    }
  
    return String(header ?? '');
  };
  
  // ============================================================
  // RAW ACTION MENUS
  // ============================================================
  
  const showCancelActionMenu = ref(false);
  const showDeleteActionMenu = ref(false);
  
  const cancelActionMenuRef = ref<HTMLElement | null>(null);
  const deleteActionMenuRef = ref<HTMLElement | null>(null);
  
  /*
   * Jumlah row yang sedang dalam status Cancelled.
   * Satu row = satu part/raw row.
   */
  const cancelledCount = computed(() => cancelledRawTotal.value);
  
  const toggleCancelActionMenu = () => {
    closeAllPopups();
    showCancelActionMenu.value = !showCancelActionMenu.value;
    showDeleteActionMenu.value = false;
  };
  
  const toggleDeleteActionMenu = () => {
    closeAllPopups();
    showDeleteActionMenu.value = !showDeleteActionMenu.value;
    showCancelActionMenu.value = false;
  };
  
  const openUploadModalWithClose = () => {
    showCancelActionMenu.value = false;
    showDeleteActionMenu.value = false;
    closeAllPopups();
    openUploadModal();
  };
  
  const openCancelSelectedFromMenu = () => {
    showCancelActionMenu.value = false;
    openCancelSelectedRawFiles();
  };
  
  const openCancelFilteredFromMenu = () => {
    showCancelActionMenu.value = false;
    openCancelFilteredRawFiles();
  };
  
  const openCancelledFromMenu = () => {
    showCancelActionMenu.value = false;
    void openCancelledDrawerPanel();
  };
  
  const openDeleteSelectedFromMenu = () => {
    showDeleteActionMenu.value = false;
    deleteSelectedRawFiles();
  };
  
  const openDeleteFilteredFromMenu = () => {
    showDeleteActionMenu.value = false;
    void deleteFilteredRawFiles();
  };
  
  const handleOutsideActionMenu = (event: MouseEvent) => {
    const target = event.target as Node;
  
    if (
      cancelActionMenuRef.value &&
      !cancelActionMenuRef.value.contains(target)
    ) {
      showCancelActionMenu.value = false;
    }
  
    if (
      deleteActionMenuRef.value &&
      !deleteActionMenuRef.value.contains(target)
    ) {
      showDeleteActionMenu.value = false;
    }
  };
  
  // ============================================================
  // CANCEL PREVIEW DETAIL
  // ============================================================
  
  const tmminRawLifecyclePreviewRows = computed(() => {
    return tmminRawSoSortedRows.value.map((row: any) => ({
      rawId: Number(row.id || 0),
      orderNo: String(row.atManifest || row.aManifestNo || ''),
      partNo: String(row.arMaterialSo || row.kPartNoRaw || ''),
      partName: String(row.wPartName || ''),
      orderPcs: String(row.asQty || row.qQtyOrder || ''),
      orderDate: String(row.baOrderDate || row.apOrderDate || ''),
      delDate: String(row.axDateSo || ''),
      plantCode: 'TMMIN',
      partCategory: '',
      uploadBatchId: String(row.uploadBatchId || '')
    }));
  });
  
  const dcwaRawLifecyclePreviewRows = computed(() => {
    return dcwaRawSoSortedRows.value.map((row: any) => ({
      rawId: Number(row.id || 0),
      orderNo: String(row.dnNo || ''),
      partNo: String(row.partNo || ''),
      partName: String(row.partName || ''),
      orderPcs: String(row.orderQty || ''),
      orderDate: String(row.orderDate || ''),
      delDate: String(
        row.orderType === 'SPECIAL_ORDER'
          ? row.orderDate || ''
          : row.etd || ''
      ),
      plantCode: 'DCWA',
      partCategory: String(row.orderType || 'REGULAR'),
      uploadBatchId: String(row.uploadBatchId || '')
    }));
  });

  const dpmRawLifecyclePreviewRows = computed(() => {
    return dpmRawSoSortedRows.value.map((row) => ({
      rawId: Number(row.id || 0),
      orderNo: String(row.diNumber || ''),
      partNo: String(row.partNumber || ''),
      partName: String(row.description || ''),
      orderPcs: String(row.confirmQtyDel || ''),
      orderDate: String(row.deliveryDate || ''),
      delDate: String(row.deliveryDate || ''),
      plantCode: 'DPM',
      partCategory: 'REGULAR',
      uploadBatchId: String(row.uploadBatchId || '')
    }));
  });

  const selectedRawPreviewRows = computed(() => {
    const activeSelectedIds = isDcwaSoMode.value
      ? dcwaRawSoSelectedIds.value
      : selectedRawIds.value;

    const selected = new Set(
      activeSelectedIds.map((id) => Number(id))
    );

    const source = isDpmSoMode.value
      ? dpmRawLifecyclePreviewRows.value
      : isDcwaSoMode.value
      ? dcwaRawLifecyclePreviewRows.value
      : isTmminSoMode.value
        ? tmminRawLifecyclePreviewRows.value
        : card2SortedData.value;

    return source.filter((row: any) =>
      selected.has(Number(row.rawId))
    );
  });

  const cancelCandidateRows = computed(() => {
    if (cancelRawMode.value === 'selected') {
      return selectedRawPreviewRows.value;
    }

    return isDpmSoMode.value
      ? dpmRawLifecyclePreviewRows.value
      : isDcwaSoMode.value
      ? dcwaRawLifecyclePreviewRows.value
      : isTmminSoMode.value
        ? tmminRawLifecyclePreviewRows.value
        : card2SortedData.value;
  });
  
  /*
   * Jangan render ribuan row di modal.
   * Detail penuh tetap diproses backend; popup hanya preview.
   */
  const cancelPreviewRows = computed(() =>
    cancelCandidateRows.value.slice(0, 20)
  );
  
  const cancelPreviewHiddenCount = computed(() =>
    Math.max(0, cancelCandidateRows.value.length - cancelPreviewRows.value.length)
  );
  
  const cancelPreviewOrderNos = computed(() => {
    return Array.from(
      new Set(
        cancelCandidateRows.value
          .map((row) => String(row.orderNo || '').trim())
          .filter(Boolean)
      )
    );
  });
  
  const cancelTotalCount = computed(() => {
    return cancelRawMode.value === 'selected'
      ? rawCancelSelectedCount.value
      : rawFilteredCancelCount.value;
  });
  
  // ============================================================
  // FINAL CANCEL CONFIRM MODAL
  // ============================================================
  //
  // Alur:
  // 1. User isi Cancelled By + Alasan Cancel.
  // 2. Klik Confirm Cancel.
  // 3. Muncul final confirmation.
  // 4. API baru dijalankan setelah klik Yes, Cancel.
  // ============================================================
  
  const showFinalCancelConfirm = ref(false);
  
  const openFinalCancelConfirm = () => {
    if (!cancelActionBy.value) {
      return;
    }
  
    if (!cancelReason.value.trim()) {
      return;
    }
  
    showFinalCancelConfirm.value = true;
  };
  
  const closeFinalCancelConfirm = () => {
    if (isCancellingRawFiles.value) {
      return;
    }
  
    showFinalCancelConfirm.value = false;
  };
  
  const executeFinalCancel = async () => {
    if (isCancellingRawFiles.value) {
      return;
    }
  
    showFinalCancelConfirm.value = false;
  
    await confirmCancelRawFiles();
  };
  
  // ============================================================
  // RESTORE CONFIRM MODAL
  // ============================================================
  // Modal dibuat langsung di UploadSo.vue dengan z-index lebih tinggi
  // daripada Cancelled drawer. Ini menghindari confirm global muncul
  // di belakang drawer.
  // ============================================================
  
  const showRestoreConfirmModal = ref(false);
  const restoreConfirmTitle = ref('Restore Order');
  const restoreConfirmMessage = ref('');
  const restoreConfirmIds = ref<number[]>([]);
  
  const closeRestoreConfirmModal = () => {
    if (isRestoringRawFiles.value) {
      return;
    }
  
    showRestoreConfirmModal.value = false;
    restoreConfirmIds.value = [];
    restoreConfirmMessage.value = '';
  };
  
  const openRestoreSelectedConfirm = () => {
    const ids = [...selectedCancelledRawIds.value]
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id) && id > 0);
  
    if (ids.length === 0) {
      return;
    }
  
    restoreConfirmIds.value = ids;
    restoreConfirmTitle.value = 'Restore Selected Order';
    restoreConfirmMessage.value =
      isDcwaSoMode.value
        ? `${ids.length} Raw Sales Order DCWA akan diaktifkan kembali. Format Sales Order akan tampil kembali dengan Sales Document yang sama, dan Tracking kembali mengikuti batch aktif.`
        : `${ids.length} data akan diaktifkan kembali. Raw Files dan Format Sales Order akan tampil kembali menggunakan nomor Sales Document yang sama.`;
    showRestoreConfirmModal.value = true;
  };
  
  const openRestoreDnConfirm = (row: any) => {
    const ids = String(row?.cancelled_raw_ids ?? '')
      .split(',')
      .map((value) => Number(value))
      .filter((id) => Number.isFinite(id) && id > 0);
  
    if (ids.length === 0) {
      return;
    }
  
    restoreConfirmIds.value = ids;
    restoreConfirmTitle.value = 'Restore Cancelled DN';
    restoreConfirmMessage.value =
      isDcwaSoMode.value
        ? `${ids.length} row cancelled pada ${row?.dn_number || 'DN ini'} akan direstore ke Raw Sales Order DCWA aktif.`
        : `${ids.length} part cancelled pada ${row?.dn_number || 'DN ini'} akan direstore. DN akan kembali ke DN Crosscheck dan DN Monitoring sesuai part aktifnya.`;
    showRestoreConfirmModal.value = true;
  };
  
  const confirmRestoreFromModal = async () => {
    if (restoreConfirmIds.value.length === 0) {
      return;
    }
  
    const ids = [...restoreConfirmIds.value];
  
    await executeRestoreRawOrders(
      ids,
      restoreReason.value
    );
  
    showRestoreConfirmModal.value = false;
    restoreConfirmIds.value = [];
    restoreConfirmMessage.value = '';
  };
  
  // ============================================================
  // DN MONITORING REPORT ZOOM
  // ============================================================
  
  const dnReportZoom = ref(1);
  
  /*
   * Split view memakai zoom terpisah.
   * Default 75% supaya halaman A4 nyaman dilihat di panel kanan
   * tanpa mengubah zoom ketika user kembali ke full report.
   */
  const dnCompareReportZoom = ref(0.75);
  
  const activeDnReportZoom = computed(() =>
    showDnMonitoringCompare.value
      ? dnCompareReportZoom.value
      : dnReportZoom.value
  );
  
  const DN_REPORT_ZOOM_MIN = 0.5;
  
  const DN_REPORT_ZOOM_MAX = 1.5;
  
  const DN_REPORT_ZOOM_STEP = 0.1;
  
  // ============================================================
  // SET ZOOM
  // ============================================================
  
  const setDnReportZoom = (value: number) => {
    /*
     * Batasi zoom:
     *
     * Minimum = 50%
     * Maximum = 150%
     */
    const limitedValue = Math.min(
      DN_REPORT_ZOOM_MAX,
      Math.max(
        DN_REPORT_ZOOM_MIN,
        value
      )
    );
  
    const normalizedValue =
      Math.round(
        limitedValue * 100
      ) / 100;
  
    /*
     * Full Report dan Split View mempunyai zoom sendiri.
     */
    if (showDnMonitoringCompare.value) {
      dnCompareReportZoom.value =
        normalizedValue;
  
      return;
    }
  
    dnReportZoom.value =
      normalizedValue;
  };
  
  // ============================================================
  // ZOOM IN
  // ============================================================
  
  const zoomInDnReport = () => {
    setDnReportZoom(
      activeDnReportZoom.value +
      DN_REPORT_ZOOM_STEP
    );
  };
  
  // ============================================================
  // ZOOM OUT
  // ============================================================
  
  const zoomOutDnReport = () => {
    setDnReportZoom(
      activeDnReportZoom.value -
      DN_REPORT_ZOOM_STEP
    );
  };
  
  // ============================================================
  // RESET ZOOM
  // ============================================================
  
  const resetDnReportZoom = () => {
    if (showDnMonitoringCompare.value) {
      /*
       * Fit yang paling nyaman untuk panel kanan.
       */
      dnCompareReportZoom.value =
        0.75;
  
      return;
    }
  
    dnReportZoom.value =
      1;
  };
  
  // ============================================================
  // DN REGISTER TOOLTIP
  // ============================================================
  
  const showDnRegisterTooltip = ref(false);
  
  const showRegisterTooltip = () => {
    if (!dnRegisterDisabledMessage.value) {
      return;
    }
  
    showDnRegisterTooltip.value = true;
  };
  
  const hideRegisterTooltip = () => {
    showDnRegisterTooltip.value = false;
  };
  
  // ============================================================
  // ADAPTIVE STICKY ACTION BAR
  // ============================================================
  
  const isPageTop = ref(true);
  
  const isFloatingActionOpen = ref(false);
  
  const ACTION_BAR_SCROLL_THRESHOLD = 120;
  
  const handlePageScroll = () => {
    const pageTop = window.scrollY <= ACTION_BAR_SCROLL_THRESHOLD;
  
    isPageTop.value = pageTop;
  
    /*
     * Kalau kembali ke paling atas,
     * floating menu tidak perlu dibuka.
     * Karena toolbar penuh otomatis tampil.
     */
    if (pageTop) {
      isFloatingActionOpen.value = false;
    }
  };
  
  const toggleFloatingAction = () => {
    if (isPageTop.value) {
      return;
    }
  
    isFloatingActionOpen.value = !isFloatingActionOpen.value;
  
    /*
     * Tutup popup Customer / Date
     * ketika toolbar floating ditutup.
     */
    if (!isFloatingActionOpen.value) {
      closeAllPopups();
    }
  };
  
  const openUploadFilePicker = () => {
    if (!requireUploadSoPermission('create')) {
      return;
    }

    const customerValid = validateCustomerBeforeChooseFile();
  
    if (!customerValid) {
      return;
    }
  
    uploadFileInput.value?.click();
  };
  
  // ============================================================
  // SCROLL TO BOTTOM
  // ============================================================
  
  const scrollToPageBottom = () => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'smooth'
    });
  };
  
  // ============================================================
  // DN NUMBER FORMAT
  // ============================================================
  
  const formatDnCount = (value: number | string | null | undefined): string => {
    const number = Number(value ?? 0);
  
    if (!Number.isFinite(number)) {
      return '0';
    }
  
    return new Intl.NumberFormat('id-ID', {
      maximumFractionDigits: 0
    }).format(number);
  };
  
  // ============================================================
  // DN MONITORING VIEW HELPERS
  // ============================================================
  
  const hasDnActivity = (row: any): boolean => {
    if (!row?.date) {
      return false;
    }
  
    const out = Number(row?.out ?? 0);
  
    const input = Number(row?.in ?? 0);
  
    return out !== 0 || input !== 0;
  };
  
  // ============================================================
  // GAP
  // ============================================================
  
  const getDnMonitoringGap = (row: any): number => {
    /*
     * Kalau backend sudah memberikan GAP,
     * pakai nilai tersebut.
     */
    if (row?.gap !== null && row?.gap !== undefined && String(row.gap).trim() !== '' && Number.isFinite(Number(row.gap))) {
      return Number(row.gap);
    }
  
    /*
     * Fallback:
     *
     * GAP = IN - OUT
     *
     * Contoh:
     * OUT 6, IN 5
     * GAP = -1
     */
    const out = Number(row?.out ?? 0);
  
    const input = Number(row?.in ?? 0);
  
    return input - out;
  };
  
  // ============================================================
  // ACHIEVEMENT
  // ============================================================
  
  const getDnMonitoringAchievement = (row: any): number => {
    if (
      row?.achievement !== null &&
      row?.achievement !== undefined &&
      String(row.achievement).trim() !== '' &&
      Number.isFinite(Number(row.achievement))
    ) {
      return Math.round(Number(row.achievement));
    }
  
    /*
     * Fallback kalau achievement dari backend kosong.
     */
    const out = Number(row?.out ?? 0);
  
    const input = Number(row?.in ?? 0);
  
    if (out <= 0) {
      return 0;
    }
  
    return Math.round((input / out) * 100);
  };
  
  const getDnMonitoringAchievementClass = (row: any): string => {
    const achievement = getDnMonitoringAchievement(row);
  
    if (achievement === 100) {
      return 'bg-lime-400 font-bold text-black';
    }
  
    return '';
  };

  // VIEW LIFECYCLE

  let isUploadSoViewActive = false;

  const initializeUploadSoView = (): void => {
    if (isUploadSoViewActive) {
      return;
    }

    isUploadSoViewActive = true;

    void loadInitialData();
    void loadCancelledData();

    if (typeof window !== 'undefined') {
      handlePageScroll();
      window.addEventListener('scroll', handlePageScroll, {
        passive: true
      });
      window.addEventListener(
        'scroll',
        scheduleAnchoredFilterPopupPosition,
        {
          capture: true,
          passive: true
        }
      );
      window.addEventListener(
        'resize',
        scheduleAnchoredFilterPopupPosition,
        { passive: true }
      );
      window.visualViewport?.addEventListener(
        'scroll',
        scheduleAnchoredFilterPopupPosition,
        { passive: true }
      );
      window.visualViewport?.addEventListener(
        'resize',
        scheduleAnchoredFilterPopupPosition,
        { passive: true }
      );
    }

    if (typeof document !== 'undefined') {
      document.addEventListener('click', handleOutsideActionMenu);
    }
  };

  const disposeUploadSoView = (): void => {
    if (!isUploadSoViewActive) {
      return;
    }

    isUploadSoViewActive = false;

    if (typeof document !== 'undefined') {
      document.removeEventListener('click', handleOutsideActionMenu);
    }

    formatSOPageAbortController?.abort();
    formatSOPageAbortController = null;
    trackingPageAbortController?.abort();
    trackingPageAbortController = null;
    rawPageAbortControllers.forEach((controller) => controller.abort());
    rawPageAbortControllers.clear();

    formatSOSectionActivated.value = false;
    formatSOSectionDirty = true;
    trackingSectionActivated.value = false;
    trackingSectionDirty = true;

    if (typeof window !== 'undefined') {
      window.removeEventListener('scroll', handlePageScroll);
      window.removeEventListener(
        'scroll',
        scheduleAnchoredFilterPopupPosition,
        true
      );
      window.removeEventListener(
        'resize',
        scheduleAnchoredFilterPopupPosition
      );
      window.visualViewport?.removeEventListener(
        'scroll',
        scheduleAnchoredFilterPopupPosition
      );
      window.visualViewport?.removeEventListener(
        'resize',
        scheduleAnchoredFilterPopupPosition
      );
    }

    clearAnchoredFilterPopup();
    resetMissingContractPartsCopiedState();
  };

  // ========================================================
  // UPLOAD FORM - SUBMIT REQUIRED STATE
  // ========================================================
  // Sama seperti Upload MDFO:
  // tombol Submit baru aktif setelah seluruh field wajib pada mode/customer
  // yang sedang dipilih sudah terisi. submitUploadForm() tetap menyimpan
  // guard backend/frontend lama sebagai lapisan validasi kedua.
  const uploadSubmitDisabledReason = computed((): string => {
    if (isUploading.value) {
      return 'Upload sedang diproses';
    }

    if (isAnalyzingUploadPeriods.value) {
      return 'Periode file sedang dideteksi';
    }

    if (isPreviewLoading.value) {
      return 'Preview sedang diproses';
    }

    if (isInspectingAsiAdmFiles.value) {
      return 'File ASI ADM sedang diperiksa';
    }

    if (selectedCustomerUpload.value.trim() === '') {
      return 'Pilih Customer';
    }

    const hasValidPeriod =
      /^\d{4}-(0[1-9]|1[0-2])$/.test(
        String(selectedUploadPeriod.value ?? '').trim()
      );

    if (!hasValidPeriod) {
      return 'Pilih Bulan Upload';
    }

    if (showUploadDeliveryPeriodChoice.value) {
      return 'Konfirmasi periode upload terlebih dahulu';
    }

    if (
      hasDetectedUploadPeriods.value &&
      !isSelectedUploadPeriodAvailable.value
    ) {
      return 'Pilih periode yang terdeteksi dari file';
    }

    if (isFtiSoUpload.value) {
      if (ftiAdditionalOrderEnabled.value) {
        if (ftiAdditionalOrderMode.value === 'MANUAL') {
          if (ftiAdditionalManualPoNumber.value.trim() === '') {
            return 'Isi PO Number Additional Order';
          }

          if (!isFtiAdditionalManualPoNumberValid.value) {
            return `PO Number FTI harus 10 digit (${ftiAdditionalManualPoNumberLength.value}/10)`;
          }

          if (!hasFtiAdditionalManualQty.value) {
            return 'Isi minimal satu Qty Additional Order';
          }

          if (
            !ftiAdditionalOrderPreview.value ||
            ftiAdditionalOrderPreview.value.source_mode !== 'MANUAL'
          ) {
            return 'Preview Schedule Additional Order terlebih dahulu';
          }

          if (!isFtiAdditionalOrderAllocationValid.value) {
            return 'Sesuaikan Additional Qty dengan Target Qty';
          }

          if (!ftiAdditionalOrderScheduleConfirmed.value) {
            return 'Konfirmasi Schedule Additional Order terlebih dahulu';
          }
        } else {
          if (!ftiAdditionalOrderFile.value) {
            return 'Pilih PDF Additional Order FTI';
          }

          if (
            !ftiAdditionalOrderPreview.value ||
            ftiAdditionalOrderPreview.value.source_mode === 'MANUAL'
          ) {
            return 'Preview OCR Additional Order terlebih dahulu';
          }

          if (!isFtiAdditionalOrderAllocationValid.value) {
            return 'Sesuaikan Additional Qty dengan Target Qty';
          }

          if (!ftiAdditionalOrderScheduleConfirmed.value) {
            return 'Konfirmasi Schedule Additional Order terlebih dahulu';
          }
        }
      }

      if (finalUploadUser.value.trim() === '') {
        return hasUploadUserLoginMapping.value
          ? 'Pilih Upload By'
          : 'Username login belum terdaftar sebagai Upload By';
      }

      return '';
    }

    if (isMesSoUpload.value) {
      if (mesSoUploadFiles.value.length === 0) {
        return 'Pilih PDF Purchase Order / RFQ MES';
      }

      if (mesPartNameConflicts.value.some((item) => !mesPartNameChoices.value[item.key])) {
        return 'Pilih Part Name untuk perbedaan PDF dan Contract';
      }
    } else if (isDpmSoUpload.value) {
      if (dpmSoUploadFiles.value.length === 0) {
        return 'Pilih file Excel DPM';
      }
    } else if (isDcwaSoUpload.value) {
      if (!dcwaSoHasRequiredFileTypes.value) {
        return 'Pilih file DCWA yang diperlukan';
      }
    } else if (isAsiAdmSoUpload.value) {
      if (asiAdmSoUploadFiles.value.length === 0) {
        return 'Pilih PDF ASI ADM';
      }

      if (
        asiAdmDetectedOrderType.value === 'SERVICE PART' &&
        asiAdmServicePartDeliveryDate.value.trim() === ''
      ) {
        return 'Isi Delivery Date Service Part';
      }
    } else if (isGayaSoUpload.value) {
      if (gayaSoUploadFiles.value.length === 0) {
        return 'Pilih PDF Gaya Motor';
      }
    } else if (isNtcSoUpload.value) {
      if (ntcSoUploadFiles.value.length === 0) {
        return 'Pilih file CSV NTC';
      }
    } else if (isTmminSoUpload.value) {
      if (tmminSoUploadFiles.value.length === 0) {
        return 'Pilih file TMMIN';
      }

      if (tmminSoDetectedTxtFiles.value.length === 0) {
        return 'Belum ada TXT TMMIN yang terdeteksi';
      }
    } else if (admUploadFiles.value.length === 0) {
      return 'Pilih file Sales Order';
    }

    if (
      showExcelPasswordInput.value &&
      excelPassword.value.trim() === ''
    ) {
      return 'Isi Password Excel';
    }

    if (finalUploadUser.value.trim() === '') {
      return hasUploadUserLoginMapping.value
        ? 'Pilih Upload By'
        : 'Username login belum terdaftar sebagai Upload By';
    }

    return '';
  });

  const canSubmitUpload = computed(
    () => uploadSubmitDisabledReason.value === ''
  );

  // ========================================================
  // EXPOSED STATE / ACTIONS
  // ========================================================

  return {
    permissions,
    page,
    breadcrumbs,
    customerOptions,
    loadCustomerOptions,
    selectedCustomer,
    rawMultiSchemaNotice,
    hasMultiSpecialRawSchemaSelection,
    isTmminSoMode,
    isAsiAdmSoMode,
    isGayaSoMode,
    isNtcSoMode,
    isDcwaSoMode,
    isDpmSoMode,
    showHeaderCustomerDropdown,
    selectedCustomers,
    draftSelectedCustomers,
    selectedCustomerLabel,

    isHeaderCustomerSelected,
    toggleHeaderCustomerSelection,
    isAllHeaderCustomersSelected,
    toggleAllHeaderCustomerSelection,
    applyHeaderCustomerFilter,
    clearHeaderCustomerSelection,
    showOrderDateFilter,
    fromDate,
    toDate,
    minToDate,
    maxOrderDate,
    getOptionalFilterParams,
    applyOrderDateFilter,
    clearOrderDateFilter,

    showDeliveryDateFilter,
    deliveryFromDate,
    deliveryToDate,
    minDeliveryToDate,
    maxDeliveryDate,
    toggleDeliveryDateFilterPopup,
    applyDeliveryDateFilter,
    clearDeliveryDateFilter,

    showCreationDateFilter,
    creationFromDate,
    creationToDate,
    minCreationToDate,
    todayDate,
    toggleCreationDateFilterPopup,
    applyCreationDateFilter,
    clearCreationDateFilter,
    formatDateExcel,
    formatTimeExcel,
    getColumnWidthNumber,
    userMaster,
    uploadUserOptions,
    uploadFormUserOptions,
    getUserColor,
    userColorClass,
    colorLabels,
    colorDotClass,
    showUploadModal,
    selectedCustomerUpload,
    selectedUploadPeriod,
    selectedUploadPeriodLabel,
    uploadDeliveryPeriodOptions,
    showUploadDeliveryPeriodChoice,
    pendingUploadPeriod,
    isAnalyzingUploadPeriods,
    selectedUploadPeriodCount,
    hasDetectedUploadPeriods,
    hasMultipleUploadPeriods,
    isSelectedUploadPeriodAvailable,
    showCustomerDropdown,
    showUploadUserDropdown,
    selectedUploadUser,
    canSelectUploadUser,
    hasUploadUserLoginMapping,
    mappedUploadUser,
    excelPassword,
    showExcelPassword,
    uploadFiles,
    admUploadFiles,
    tmminSoUploadFiles,
    gayaSoUploadFiles,
    mesSoUploadFiles,
    asiAdmSoUploadFiles,
    asiAdmDetectedOrderType,
    asiAdmServicePartDeliveryDate,
    asiAdmFileTypes,
    isInspectingAsiAdmFiles,
    showMissingContractPartsModal,
    missingContractPartsPeriod,
    missingContractPartGroups,
    missingContractParts,
    missingContractPartsCopied,
    isValidatingPreviewContractParts,
    openMissingContractPartsModal,
    closeMissingContractPartsModal,
    copyMissingContractParts,
    dcwaSoUploadFiles,
    isDcwaSoUpload,
    isAsiAdmSoUpload,
    isGayaSoUpload,
    removeGayaSoUploadFile,
    removeMesSoUploadFile,
    removeAsiAdmSoUploadFile,
    inspectAsiAdmCandidateFiles,
    validatePreviewContractGroups,
    removeDcwaSoUploadFile,
    ntcSoUploadFiles,
    dpmSoUploadFiles,
    tmminSoDetectedTxtFiles,
    tmminSoExcludedTxtEntries,
    uploadFileName,
    isTmminSoUpload,
    isNtcSoUpload,
    isDpmSoUpload,
    showUploadPreview,
    isPreviewLoading,
    isUploading,
    showContractMaterialChoiceModal,
    contractMaterialChoiceItems,
    contractMaterialSelections,
    contractMaterialChoiceMessage,
    canConfirmContractMaterialChoice,
    selectContractMaterialChoice,
    isContractMaterialChoiceSelected,
    closeContractMaterialChoice,
    confirmContractMaterialChoiceAndContinue,
    excelWorkbook,
    excelSheetNames,
    selectedExcelSheet,
    excelPreviewHeaders,
    excelPreviewRows,
    excelPreviewError,
    admUploadPreviewSummaryByPlant,
    tmminUploadPreviewSummary,
    ntcUploadPreviewSummaryBySite,
    hasExcelPassword,
    canOpenUploadPreview,
    canSubmitUpload,
    uploadSubmitDisabledReason,
    showExcelPasswordInput,
    excelColumnCount,
    normalizedExcelPreviewRows,
    finalUploadUser,
    validateCustomerBeforeChooseFile,
    openUploadModal,
    closeUploadModal,
    selectCustomerUpload,
    selectUploadUser,
    analyzeUploadDeliveryMonths,
    selectPendingUploadPeriod,
    closeUploadDeliveryPeriodChoice,
    confirmUploadDeliveryPeriodChoice,
    handleSelectedUploadPeriodChange,
    onUploadFileChange,
    clearUploadFormData,
    removeAdmUploadFile,
    removeNtcSoUploadFile,
    removeDpmSoUploadFile,
    removeTmminSoUploadFile,
    removeTmminDetectedTxtFile,
    refreshTmminUploadDetection,
    refreshNtcUploadDetection,
    refreshAsiAdmUploadPreview,
    loadExcelSheetPreview,
    handleExcelSheetChange,
    loadEncryptedExcelPreview,
    openUploadPreview,
    closeUploadPreview,
    submitUploadForm,
    formatSalesOrderData,
    searchFormatSO,
    isLoadingFormatSO,
    isLoadingRawData,
    isDownloadingFormatSO,
    isAnyExcelDownloading,
    canDownloadRawExcel,
    canDownloadFormatSOExcel,
    downloadDescriptionIsError,
    rawDownloadDescription,
    rawDownloadTitle,
    formatSODownloadDescription,
    rawDownloadButtonLabel,
    formatSODownloadButtonLabel,
    rawActiveRowCount,
    rawCurrentTableTotalCount,
    formatSOActiveRowCount,
    regenerateFormatSOActiveRowCount,
    rawDownloadExportFileCount,
    downloadExportFileCount,
    formatSOCurrentPage,
    formatSOActiveFilterKey,
    formatSOOpenFilters,
    formatSOSearchFilters,
    formatSOSelectedFilters,
    formatSOSortKey,
    formatSOSortDirection,
    formatSOColumns,
    formatSOFrozenColumns,
    initFormatSOFilters,
    formatSOTableWidth,
    getFormatSOFrozenLeftPosition,
    getFormatSOColumnStyle,
    getFormatSOCheckboxColumnStyle,
    selectedFormatSOIds,
    formatSOSelectedCount,
    isAllCurrentPageFormatSOSelected,
    isFormatSOSelected,
    toggleFormatSOSelection,
    toggleAllCurrentPageFormatSO,
    clearFormatSOSelection,
    canDownloadSelectedFormatSOExcel,
    selectedFormatSODownloadDescription,
    formatSOSorted,
    formatSOPaginatedData,
    formatSOTotalPages,
    formatSOVisiblePages,
    formatSOShowingStart,
    formatSOShowingEnd,
    loadFormatSalesOrder,
    activateFormatSOSection,
    buildFormatSOFilters,
    downloadFormatSOExcel,
    downloadSelectedFormatSOExcel,
    toggleFormatSOFilter,
    closeFormatSOFilter,
    getFormatSOSelectedValues,
    getFormatSOSearchValue,
    setFormatSOSearchValue,
    getFormatSOFilteredOptions,
    queueFormatSOFilterOptionSearch,
    isFormatSOFilterOptionLoading,
    isFormatSOFilterRemoteSearch,
    isFormatSOFilterServerPaged,
    toggleAllFormatSOColumn,
    isAllFormatSOSelected,
    getFormatSOSelectedLabel,
    clearFormatSOColumnFilter,
    toggleFormatSOFilterValue,
    isFormatSOFilterSelected,
    setFormatSOSort,
    getFormatSOSortDirection,
    formatSOFirstPage,
    formatSOPrevPage,
    formatSONextPage,
    formatSOLastPage,
    dcwaRawSoColumns,
    dcwaRawSoPreviewColumns,
    dcwaSoUploadFileLabel,
    dcwaSoHasRequiredFileTypes,
    dcwaRawSoPreviewRows,
    dcwaRawSoPreviewSummary,
    dcwaRawSoPreviewErrors,
    dcwaRawSoAvailablePeriods,
    dcwaRawSoCanSubmitPreview,
    showDcwaRawSoPreview,
    dcwaRawSoData,
    isLoadingDcwaRawSo,
    dcwaRawSoSelectedIds,
    isDownloadingDcwaRawSo,
    dcwaRawSoSelectedFilters,
    dcwaRawSoSearchFilters,
    dcwaRawSoOpenFilters,
    dcwaRawSoActiveFilterKey,
    dcwaRawSoFilterPopupPosition,
    dcwaRawSoSortKey,
    dcwaRawSoSortDirection,
    dcwaRawSoCurrentPage,
    dcwaRawSoRowsPerPage,
    dcwaRawSoRowsPerPageOptions,
    dcwaRawSoFilteredRows,
    dcwaRawSoSortedRows,
    dcwaRawSoPaginatedRows,
    dcwaRawSoTotalPages,
    dcwaRawSoVisiblePages,
    dcwaRawSoShowingStart,
    dcwaRawSoShowingEnd,
    dcwaRawSoTableWidth,
    dcwaRawSoPreviewTableWidth,
    addDcwaSoUploadFiles,
    clearDcwaSoUploadFiles,
    resetDcwaRawSoPreview,
    closeDcwaRawSoPreview,
    analyzeDcwaUploadPeriods,
    previewDcwaRawSo,
    uploadDcwaRawSo,
    fetchDcwaRawSoData,
    getDcwaRawSoColumnOptions,
    getDcwaRawSoSelectedValues,
    getDcwaRawSoSearchValue,
    setDcwaRawSoSearchValue,
    getDcwaRawSoFilteredColumnOptions,
    toggleDcwaRawSoFilter,
    toggleAllDcwaRawSoColumn,
    clearDcwaRawSoColumnFilter,
    isAllDcwaRawSoSelected,
    isDcwaRawSoFilterSelected,
    getDcwaRawSoColumnStyle,
    toggleDcwaRawSoDropdown,
    closeDcwaRawSoFilter,
    setDcwaRawSoSort,
    isDcwaRawSoSortActive,
    isDcwaRawSoNoSortActive,
    getDcwaRawSoSelectedLabel,
    toggleDcwaRawSoSelection,
    isAllCurrentPageDcwaRawSoSelected,
    toggleAllCurrentPageDcwaRawSo,
    isDcwaRawSoSelected,
    downloadDcwaRawSoExcel,
    downloadSelectedDcwaRawSoExcel,
    dcwaRawSoFirstPage,
    dcwaRawSoPrevPage,
    dcwaRawSoNextPage,
    dcwaRawSoLastPage,
    isDcwaRawSoNumericColumn,
    isDcwaRawSoValidationColumn,
    isDcwaRawSoValidationMissing,
    asiAdmRawSoColumns,
    asiAdmRawSoData,
    asiAdmRawSoPreviewRows,
    asiAdmRawSoPreviewSummary,
    asiAdmRawSoPreviewErrors,
    asiAdmRawSoCanSubmitPreview,
    showAsiAdmRawSoPreview,
    asiAdmRawSoSelectedFilters,
    asiAdmRawSoSearchFilters,
    asiAdmRawSoOpenFilters,
    asiAdmRawSoActiveFilterKey,
    asiAdmRawSoFilterPopupPosition,
    asiAdmRawSoSortColumn,
    asiAdmRawSoSortDirection,
    asiAdmRawSoCurrentPage,
    asiAdmRawSoRowsPerPage,
    asiAdmRawSoRowsPerPageOptions,
    asiAdmRawSoTableWidth,
    asiAdmRawSoPreviewTableWidth,
    asiAdmRawSoFilteredRows,
    asiAdmRawSoSortedRows,
    asiAdmRawSoPaginatedRows,
    asiAdmRawSoTotalPages,
    asiAdmRawSoVisiblePages,
    asiAdmRawSoShowingStart,
    asiAdmRawSoShowingEnd,
    getAsiAdmRawSoColumnStyle,
    getAsiAdmRawSoSelectedValues,
    getAsiAdmRawSoColumnOptions,
    getAsiAdmRawSoSearchValue,
    setAsiAdmRawSoSearchValue,
    getAsiAdmRawSoFilteredColumnOptions,
    toggleAsiAdmRawSoFilter,
    toggleAllAsiAdmRawSoColumn,
    clearAsiAdmRawSoColumnFilter,
    isAllAsiAdmRawSoSelected,
    isAsiAdmRawSoFilterSelected,
    closeAsiAdmRawSoFilter,
    setAsiAdmRawSoSort,
    isAsiAdmRawSoSortActive,
    isAsiAdmRawSoNoSortActive,
    getAsiAdmRawSoSelectedLabel,
    toggleAsiAdmRawSoDropdown,
    closeAsiAdmRawSoPreview,
    fetchAsiAdmRawSoData,
    asiAdmRawSoFirstPage,
    asiAdmRawSoPrevPage,
    asiAdmRawSoNextPage,
    asiAdmRawSoLastPage,
    gayaRawSoColumns,
    gayaRawSoData,
    gayaRawSoPreviewRows,
    gayaUploadPreviewSummary,
    gayaRawSoPreviewFiles,
    gayaRawSoActivePreviewFile,
    gayaRawSoActivePreviewRows,
    gayaRawSoActivePreviewSummary,
    showGayaRawSoPreview,
    gayaRawSoSelectedFilters,
    gayaRawSoSearchFilters,
    gayaRawSoOpenFilters,
    gayaRawSoActiveFilterKey,
    gayaRawSoFilterPopupPosition,
    gayaRawSoCurrentPage,
    gayaRawSoRowsPerPage,
    gayaRawSoRowsPerPageOptions,
    gayaRawSoVisibleColumns,
    gayaRawSoPreviewColumns,
    gayaRawSoTableWidth,
    gayaRawSoPreviewTableWidth,
    gayaRawSoFilteredRows,
    gayaRawSoSortedRows,
    gayaRawSoPaginatedRows,
    gayaRawSoTotalPages,
    gayaRawSoVisiblePages,
    gayaRawSoShowingStart,
    gayaRawSoShowingEnd,
    getGayaRawSoColumnStyle,
    getGayaRawSoSelectedLabel,
    toggleGayaRawSoDropdown,
    getGayaRawSoSearchValue,
    setGayaRawSoSearchValue,
    getGayaRawSoFilteredColumnOptions,
    toggleGayaRawSoFilter,
    toggleAllGayaRawSoColumn,
    clearGayaRawSoColumnFilter,
    isAllGayaRawSoSelected,
    isGayaRawSoFilterSelected,
    closeGayaRawSoFilter,
    setGayaRawSoSort,
    isGayaRawSoSortActive,
    isGayaRawSoNoSortActive,
    gayaRawSoFirstPage,
    gayaRawSoPrevPage,
    gayaRawSoNextPage,
    gayaRawSoLastPage,
    closeGayaRawSoPreview,
    selectGayaRawSoPreviewFile,
    fetchGayaRawSoData,
    isMesSoMode,
    isMesSoUpload,
    mesRawSoColumns,
    mesRawSoData,
    mesRawSoPreviewRows,
    mesRawSoPreviewSummary,
    showMesRawSoPreview,
    mesPartNameConflicts,
    mesPartNameChoices,
    hasUnresolvedMesPartNameConflict,
    setMesPartNameChoice,
    mesRawSoSelectedFilters,
    mesRawSoSearchFilters,
    mesRawSoOpenFilters,
    mesRawSoActiveFilterKey,
    mesRawSoFilterPopupPosition,
    mesRawSoSortColumn,
    mesRawSoSortDirection,
    mesRawSoTableWidth,
    getMesRawSoColumnStyle,
    mesRawSoFilteredRows,
    getMesRawSoColumnOptions,
    getMesRawSoFilteredColumnOptions,
    toggleMesRawSoFilterValue,
    clearMesRawSoColumnFilter,
    setMesRawSoSort,
    getMesRawSoSelectedValues,
    getMesRawSoSearchValue,
    setMesRawSoSearchValue,
    toggleAllMesRawSoColumn,
    isMesRawSoFilterSelected,
    closeMesRawSoFilter,
    isMesRawSoSortActive,
    isMesRawSoNoSortActive,
    getMesRawSoSelectedLabel,
    toggleMesRawSoDropdown,
    mesRawSoCurrentPage,
    mesRawSoRowsPerPage,
    mesRawSoRowsPerPageOptions,
    mesRawSoSortedRows,
    mesRawSoPaginatedRows,
    mesRawSoTotalPages,
    mesRawSoVisiblePages,
    mesRawSoShowingStart,
    mesRawSoShowingEnd,
    mesRawSoFirstPage,
    mesRawSoPrevPage,
    mesRawSoNextPage,
    mesRawSoLastPage,
    fetchMesRawSoData,
    refreshMesUploadPreview,
    isFtiSoMode,
    isFtiSoUpload,
    ftiAdditionalOrderEnabled,
    ftiAdditionalOrderMode,
    ftiAdditionalOrderFile,
    ftiAdditionalOrderPreview,
    showFtiAdditionalOrderPreview,
    ftiAdditionalOrderScheduleConfirmed,
    ftiAdditionalOrderAllocationDrafts,
    ftiAdditionalManualParts,
    ftiAdditionalManualPoNumber,
    ftiAdditionalManualPoNumberLength,
    isFtiAdditionalManualPoNumberValid,
    ftiAdditionalManualPoNumberWarning,
    ftiAdditionalManualQtyDrafts,
    isLoadingFtiAdditionalManualParts,
    hasFtiAdditionalManualQty,
    isFtiAdditionalOrderAllocationValid,
    toggleFtiAdditionalOrder,
    setFtiAdditionalOrderMode,
    setFtiAdditionalOrderFile,
    setFtiAdditionalManualPoNumber,
    setFtiAdditionalManualQty,
    loadFtiAdditionalManualParts,
    resetFtiAdditionalOrderState,
    refreshFtiAdditionalManualPreview,
    refreshFtiAdditionalOrderPreview,
    getFtiAdditionalOrderAllocationQty,
    getFtiAdditionalOrderAllocationTotal,
    updateFtiAdditionalOrderAllocation,
    resetFtiAdditionalOrderAllocationsToSystemPlan,
    confirmFtiAdditionalOrderSchedule,
    openFtiAdditionalOrderConfirmedSchedule,
    buildFtiAdditionalOrderAllocations,
    ftiRawSoColumns,
    ftiRawSoData,
    ftiRawSoPreviewRows,
    ftiRawSoPreviewSummary,
    showFtiRawSoPreview,
    ftiRawSoSelectedFilters,
    ftiRawSoSearchFilters,
    ftiRawSoOpenFilters,
    ftiRawSoActiveFilterKey,
    ftiRawSoFilterPopupPosition,
    ftiRawSoSortColumn,
    ftiRawSoSortDirection,
    ftiRawSoTableWidth,
    getFtiRawSoColumnStyle,
    ftiRawSoFilteredRows,
    getFtiRawSoColumnOptions,
    getFtiRawSoFilteredColumnOptions,
    toggleFtiRawSoFilterValue,
    clearFtiRawSoColumnFilter,
    setFtiRawSoSort,
    getFtiRawSoSelectedValues,
    getFtiRawSoSearchValue,
    setFtiRawSoSearchValue,
    toggleAllFtiRawSoColumn,
    isFtiRawSoFilterSelected,
    closeFtiRawSoFilter,
    isFtiRawSoSortActive,
    isFtiRawSoNoSortActive,
    getFtiRawSoSelectedLabel,
    toggleFtiRawSoDropdown,
    ftiRawSoCurrentPage,
    ftiRawSoRowsPerPage,
    ftiRawSoRowsPerPageOptions,
    ftiRawSoSortedRows,
    ftiRawSoPaginatedRows,
    ftiRawSoTotalPages,
    ftiRawSoVisiblePages,
    ftiRawSoShowingStart,
    ftiRawSoShowingEnd,
    ftiRawSoFirstPage,
    ftiRawSoPrevPage,
    ftiRawSoNextPage,
    ftiRawSoLastPage,
    fetchFtiRawSoData,
    refreshFtiUploadPreview,
    dpmRawSoColumns,
    dpmRawSoData,
    dpmRawSoPreviewRows,
    dpmRawSoPreviewSummary,
    dpmRawSoPoValidation,
    dpmRawSoHasPoMismatch,
    dpmRawSoPoValidationMessage,
    dpmRawSoTotalPoEligible,
    dpmRawSoContractValidation,
    showDpmRawSoPreview,
    dpmRawSoDuplicateValidation,
    dpmRawSoDuplicateRows,
    dpmRawSoDuplicateExistingFiles,
    dpmRawSoEligibleRows,
    dpmRawSoUploadDuplicateRows,
    dpmRawSoTotalEligible,
    dpmRawSoCanUploadFromSelectedFile,
    dpmRawSoDuplicatePreviewMode,
    dpmRawSoDuplicatePreviewRows,
    showDpmRawSoDuplicatePreview,
    setDpmRawSoDuplicatePreviewMode,
    openDpmRawSoDuplicatePreview,
    closeDpmRawSoDuplicatePreview,
    showDpmRawSoDuplicateWarning,
    dpmRawSoDetectedPeriodLabel,
    dpmRawSoSelectedFilters,
    dpmRawSoSearchFilters,
    dpmRawSoOpenFilters,
    dpmRawSoActiveFilterKey,
    dpmRawSoFilterPopupPosition,
    dpmRawSoSortColumn,
    dpmRawSoSortDirection,
    dpmRawSoCurrentPage,
    dpmRawSoRowsPerPage,
    dpmRawSoRowsPerPageOptions,
    dpmRawSoTableWidth,
    dpmRawSoFilteredRows,
    dpmRawSoSortedRows,
    dpmRawSoPaginatedRows,
    dpmRawSoTotalPages,
    dpmRawSoVisiblePages,
    dpmRawSoShowingStart,
    dpmRawSoShowingEnd,
    getDpmRawSoColumnStyle,
    getDpmRawSoColumnOptions,
    getDpmRawSoFilteredColumnOptions,
    getDpmRawSoSelectedValues,
    getDpmRawSoSearchValue,
    setDpmRawSoSearchValue,
    toggleDpmRawSoFilterValue,
    toggleAllDpmRawSoColumn,
    clearDpmRawSoColumnFilter,
    isDpmRawSoFilterSelected,
    closeDpmRawSoFilter,
    setDpmRawSoSort,
    isDpmRawSoSortActive,
    isDpmRawSoNoSortActive,
    getDpmRawSoSelectedLabel,
    toggleDpmRawSoDropdown,
    refreshDpmUploadPreview,
    fetchDpmRawSoData,
    ntcRawSoColumns,
    ntcRawSoVisibleColumns,
    ntcRawSoPreviewVisibleColumns,
    ntcRawSoData,
    ntcRawSoSelectedFilters,
    ntcRawSoSearchFilters,
    ntcRawSoOpenFilters,
    ntcRawSoActiveFilterKey,
    ntcRawSoSortColumn,
    ntcRawSoSortDirection,
    ntcRawSoFilterPopupPosition,
    ntcRawSoCurrentPage,
    ntcRawSoRowsPerPage,
    ntcRawSoRowsPerPageOptions,
    ntcRawSoTableWidth,
    ntcRawSoPreviewTableWidth,
    getNtcRawSoColumnStyle,
    ntcRawSoFilteredRows,
    ntcRawSoSortedRows,
    ntcRawSoPaginatedRows,
    ntcRawSoTotalPages,
    ntcRawSoVisiblePages,
    ntcRawSoShowingStart,
    ntcRawSoShowingEnd,
    showNtcRawSoPreview,
    ntcRawSoPreviewRows,
    fetchNtcRawSoData,
    getNtcRawSoColumnOptions,
    getNtcRawSoFilteredColumnOptions,
    getNtcRawSoSelectedValues,
    getNtcRawSoSearchValue,
    setNtcRawSoSearchValue,
    toggleNtcRawSoFilter,
    toggleAllNtcRawSoColumn,
    clearNtcRawSoColumnFilter,
    isAllNtcRawSoSelected,
    isNtcRawSoFilterSelected,
    getNtcRawSoSelectedLabel,
    closeNtcRawSoFilter,
    toggleNtcRawSoDropdown,
    setNtcRawSoSort,
    isNtcRawSoSortActive,
    isNtcRawSoNoSortActive,
    closeNtcRawSoPreview,
    ntcRawSoFirstPage,
    ntcRawSoPrevPage,
    ntcRawSoNextPage,
    ntcRawSoLastPage,

    tmminRawSoColumns,
    tmminRawSoVisibleColumns,
    tmminRawSoPreviewVisibleColumns,
    tmminRawSoData,
    tmminRawSoSelectedFilters,
    tmminRawSoSearchFilters,
    tmminRawSoOpenFilters,
    tmminRawSoActiveFilterKey,
    tmminRawSoSortColumn,
    tmminRawSoSortDirection,
    tmminRawSoFilterPopupPosition,
    tmminRawSoCurrentPage,
    tmminRawSoRowsPerPage,
    tmminRawSoRowsPerPageOptions,
    tmminRawSoTableWidth,
    tmminRawSoPreviewTableWidth,
    getTmminRawSoColumnStyle,
    getTmminRawSoCheckboxColumnStyle,
    tmminRawSoFilteredRows,
    tmminRawSoSortedRows,
    tmminRawSoPaginatedRows,
    tmminRawSoTotalPages,
    tmminRawSoVisiblePages,
    tmminRawSoShowingStart,
    tmminRawSoShowingEnd,
    showTmminRawSoPreview,
    tmminRawSoPreviewRows,
    fetchTmminRawSoData,
    getTmminRawSoColumnOptions,
    getTmminRawSoFilteredColumnOptions,
    getTmminRawSoSelectedValues,
    getTmminRawSoSearchValue,
    setTmminRawSoSearchValue,
    toggleTmminRawSoFilter,
    toggleAllTmminRawSoColumn,
    clearTmminRawSoColumnFilter,
    isAllTmminRawSoSelected,
    isTmminRawSoFilterSelected,
    getTmminRawSoSelectedLabel,
    closeTmminRawSoFilter,
    toggleTmminRawSoDropdown,
    setTmminRawSoSort,
    isTmminRawSoSortActive,
    isTmminRawSoNoSortActive,
    clearTmminRawSoFilters,
    openTmminRawSoPreview,
    closeTmminRawSoPreview,
    tmminRawSoFirstPage,
    tmminRawSoPrevPage,
    tmminRawSoNextPage,
    tmminRawSoLastPage,

    card2Columns,
    card2FrozenColumns,
    card2ChipColumns,
    card2Data,
    card2SelectedFilters,
    card2SearchFilters,
    card2OpenFilters,
    card2ActiveFilterKey,
    card2CurrentPage,
    card2RowsPerPage,
    card2RowsPerPageOptions,
    card2SortColumn,
    card2SortDirection,
    mapCard2RowFromBackend,
    fetchCard2Data,
    card2TableWidth,
    getCard2FrozenLeftPosition,
    getCard2ColumnStyle,
    displayCard2Value,
    getCard2ColumnOptions,
    getCard2FilteredColumnOptions,
    card2TotalPages,
    card2SortedData,
    card2PaginatedData,
    card2ShowingStart,
    card2ShowingEnd,
    card2VisiblePages,
    card2FirstPage,
    card2LastPage,
    card2NextPage,
    card2PrevPage,
    toggleCard2Dropdown,
    closeCard2Filter,
    getCard2SelectedValues,
    getCard2SearchValue,
    setCard2SearchValue,
    queueRawFilterOptionSearch,
    getRawFilterPopupOptions,
    isRawFilterOptionLoading,
    isRawFilterRemoteSearchActive,
    isRawFilterServerPaged,
    scheduleRawServerFilterReload,
    toggleAllRawFilterOptions,
    toggleCard2Filter,
    toggleAllCard2Column,
    clearCard2ColumnFilter,
    isAllCard2Selected,
    isCard2FilterSelected,
    getCard2SelectedLabel,
    isCard2ChipColumn,
    card2ChipClass,
    setSort,
    columns,
    frozenColumns,
    chipColumns,
    data,
    selectedFilters,
    selectedColorFilters,
    searchFilters,
    openFilters,
    activeFilterKey,
    sortKey,
    sortDirection,
    currentPage,
    tableWidth,
    getFrozenLeftPosition,
    getColumnStyle,
    getColumnOptions,
    getFilteredColumnOptions,
    isTrackingFilterOptionsLoading,
    trackingFilterOptionsHasMore,
    getTrackingFilterOptionsError,
    getCellColorKey,
    getColumnColorOptions,
    toggleColorFilter,
    isColorSelected,
    sortedData,
    totalPages,
    trackingDisplayTotal,
    paginatedData,
    showingStart,
    showingEnd,
    trackingFirstPage,
    prevPage,
    nextPage,
    trackingLastPage,
    toggleDropdown,
    closeTrackingFilter,
    getSelectedValues,
    getSearchValue,
    setSearchValue,
    toggleFilter,
    toggleAllColumn,
    clearColumnFilter,
    isAllSelected,
    isFilterSelected,
    getSelectedLabel,
    setTrackingSort,
    getTrackingSortDirection,
    loadInitialData,
    isCard2SortActive,
    isCard2NoSortActive,
    card2FilterPopupPosition,
    formatSORowsPerPage,
    formatSORowsPerPageOptions,
    formatSOFilterPopupPosition,
    isRegeneratingFormatSO,
    regenerateFormatSalesOrder,
    isDownloadingRawExcel,
    buildRawExcelFilters,
    downloadRawFilesExcel,
    downloadSelectedRawFilesExcel,
    canDownloadSelectedRawExcel,
    selectedRawDownloadDescription,
    trackingRowsPerPage,
    trackingRowsPerPageOptions,
    trackingVisiblePages,
    trackingFilterPopupPosition,
    isLoadingTracking,
    trackingSavingCells,
    loadTrackingData,
    activateTrackingSection,
    formatTrackingDate,
    formatTrackingDateRange,
    formatTrackingQuantity,
    joinTrackingRange,
    trackingStatusOptions,
    trackingStatusClass,
    isTrackingCellSaving,
    saveTrackingCell,
    saveTrackingFieldFromEvent,
    trackingStatusLabel,
    setTrackingTimeNow,
    openTrackingUploadUserId,
    trackingUploadUserPopupPosition,
    trackingTimeDrafts,
    getJakartaCurrentTimeValue,
    normalizeTrackingTimeDraft,
    getTrackingTimeDraft,
    updateTrackingTimeDraft,
    isValidTrackingTime,
    saveTrackingTimeDraft,
    toggleTrackingUploadUserDropdown,
    closeTrackingUploadUserDropdown,
    selectTrackingUploadUser,
    openTrackingStatusId,
    trackingStatusPopupPosition,
    toggleTrackingStatusDropdown,
    closeTrackingStatusDropdown,
    selectTrackingStatus,
    openTrackingRemarksId,
    trackingRemarksPopupPosition,
    activeTrackingRemarksDraft,
    toggleTrackingRemarksPopup,
    closeTrackingRemarksPopup,
    cancelTrackingRemarks,
    saveTrackingRemarksPopup,
    closeAllPopups,
    toggleHeaderCustomerDropdown,
    toggleOrderDateFilterPopup,
    toggleUploadCustomerDropdown,
    toggleUploadUserDropdown,
    dnPasteText,
    dnCrosscheckRows,
    isCheckingDn,
    isLoadingDnSummary,
    parsedDnNumbers,
    dnCrosscheckTotal,
    dnCrosscheckFound,
    dnCrosscheckNotFound,
    clearDnCrosscheck,
    formatDnCrosscheckDate,
    dnInOfficeDate,

    dnCrosscheckDisplayRows,

    isRegisteringDn,


    dnCrosscheckSelectedFilters,

    registerableDnRows,
    dnCrosscheckRegisterableCount,

    // ==========================================================
    // DN IN OFFICE
    // ==========================================================

    dnCrosscheckColumns,
    dnCrosscheckVisibleColumns,


    loadDnCrosscheckPreview,

    registerDnInOffice,
    // ========================================================
    // DN IN OFFICE / CROSSCHECK
    // ========================================================


    dnCrosscheckSearchFilters,
    dnCrosscheckOpenFilters,
    dnCrosscheckActiveFilterKey,
    dnCrosscheckFilterPopupPosition,

    dnCrosscheckSortKey,
    dnCrosscheckSortDirection,

    dnCrosscheckMainFilteredRows,
    dnCrosscheckFilteredRows,
    getDnCrosscheckDisplayValue,
    getDnCrosscheckCustomerLabel,
    getDnCrosscheckCustomerBadgeClass,
    getDnCrosscheckCustomerCode,
    getDnCrosscheckCustomerCodeBadgeClass,

    toggleDnCrosscheckFilter,
    closeDnCrosscheckFilter,

    getDnCrosscheckSelectedValues,

    getDnCrosscheckSearchValue,
    setDnCrosscheckSearchValue,
    isDnCrosscheckFilterOptionLoading,
    isDnCrosscheckRemoteSearch,

    getDnCrosscheckColumnOptions,
    getDnCrosscheckFilteredColumnOptions,

    toggleDnCrosscheckFilterValue,
    toggleAllDnCrosscheckColumn,

    isAllDnCrosscheckSelected,
    isDnCrosscheckFilterSelected,

    clearDnCrosscheckColumnFilter,
    getDnCrosscheckSelectedLabel,

    setDnCrosscheckSort,
    getDnCrosscheckSortDirection,


    dnCrosscheckCurrentPage,
    dnCrosscheckRowsPerPage,
    dnCrosscheckRowsPerPageOptions,

    dnCrosscheckTotalPages,
    dnCrosscheckPaginatedRows,
    dnCrosscheckVisiblePages,

    dnCrosscheckShowingStart,
    dnCrosscheckShowingEnd,

    dnCrosscheckFirstPage,
    dnCrosscheckPrevPage,
    dnCrosscheckNextPage,
    dnCrosscheckLastPage,

    dnCrosscheckMode,
    isCheckAllDnMode,

    dnCrosscheckClose,
    dnCrosscheckOpen,

    loadAllDnStatus,
    toggleDnCheckAllMode,

    toggleDnCrosscheckQuickStatus,
    isDnCrosscheckQuickStatusActive,
    isAllDnRegistered,
    dnRegisterDisabledMessage,

    selectedDnDeleteNumbers,
    isDeletingDnRegister,

    dnDeleteSelectedCount,

    deletableDnFilteredRows,
    deletableDnCurrentPageRows,

    isDnDeletable,
    isDnSelectedForDelete,

    isAllCurrentPageDnSelected,

    toggleDnDeleteSelection,
    toggleAllCurrentPageDnDelete,

    clearDnDeleteSelection,

    deleteSelectedDnRegisters,
    deleteFilteredDnRegisters,

    hasDnDeleteActiveFilter,

    // ============================================================
    // DN MONITORING REPORT
    // ============================================================


    isExportingDnMonitoringExcel,
    isPrintingDnMonitoringReport,
    isDownloadingDnMonitoringImage,
    isDownloadingDnMonitoringPdf,

    dnMonitoringReportDnNumbers,
    dnMonitoringReportCount,

    exportDnMonitoringExcel,
    downloadDnMonitoringImage,
    downloadDnMonitoringPdf,
    printDnMonitoringReport,


    showDnMonitoringReport,
    showDnMonitoringCompare,
    isLoadingDnMonitoringReport,

    toggleDnMonitoringReport,
    toggleDnMonitoringCompare,
    refreshDnMonitoringReport,
    openDnMonitoringReportSettings,
    hasDnMonitoringReportCache,
    hasDnMonitoringReportConfig,
    isDnMonitoringReportStale,
    dnMonitoringReportData,

    // ============================================================
    // RAW FILES CANCEL / RESTORE / DELETE
    // ============================================================

    isCancellingRawFiles,
    isRestoringRawFiles,

    showCancelRawModal,
    cancelRawMode,
    cancelReason,
    cancelActionBy,

    rawCancelSelectedCount,
    rawFilteredCancelCount,

    openCancelSelectedRawFiles,
    openCancelFilteredRawFiles,
    closeCancelRawModal,
    confirmCancelRawFiles,

    showCancelledDrawer,
    cancelledDrawerTab,
    isLoadingCancelledData,
    cancelledRawRows,
    cancelledDnRows,
    cancelHistoryRows,
    cancelledRawTotal,
    cancelledDnTotal,
    cancelHistoryTotal,
    cancelledRawPage,
    cancelHistoryPage,
    cancelledRowsPerPage,
    cancelHistoryRowsPerPage,
    cancelledRowsPerPageOptions,
    cancelledRawTotalPages,
    cancelHistoryTotalPages,
    cancelledDnLoaded,
    selectedCancelledRawIds,
    cancelledSelectedCount,
    restoreReason,

    loadCancelledData,
    loadCancelledCounts,
    loadCancelledTab,
    openCancelledDrawerPanel,
    closeCancelledDrawerPanel,
    setCancelledDrawerTab,
    setCancelledRawPage,
    setCancelHistoryPage,
    setCancelledRowsPerPage,
    setCancelHistoryRowsPerPage,

    isCancelledRawSelected,
    toggleCancelledRawSelection,
    toggleAllCancelledRawSelection,
    executeRestoreRawOrders,
    restoreSelectedCancelledRaw,
    restoreCancelledDn,
    formatCancelLifecycleDate,

    selectedRawIds,
    isDeletingRawFiles,
    rawDeleteSelectedCount,
    isAllCurrentPageRawSelected,

    isRawSelectedForDelete,
    toggleRawDeleteSelection,
    toggleAllCurrentPageRawDelete,
    clearRawDeleteSelection,
    deleteSelectedRawFiles,
    getCard2CheckboxColumnStyle,

    showDnMonitoringPeriodModal,
    dnMonitoringReportPeriod,
    dnMonitoringReportPeriodLabel,
    dnMonitoringReportDateBasis,
    dnMonitoringReportDateBasisLabel,

    closeDnMonitoringPeriodModal,
    confirmDnMonitoringPeriodAndView,


    filteredRawIds,
    rawFilteredDeleteCount,
    hasRawDeleteActiveFilter,

    deleteFilteredRawFiles,

    // View UI state and helpers
    uploadFileInput,
    trackingBulkMode,
    trackingBulkSelectedIds,
    trackingBulkDate,
    trackingBulkTime,
    trackingBulkUser,
    trackingBulkStatus,
    trackingBulkRemarks,
    trackingBulkUserDropdownOpen,
    trackingBulkStatusDropdownOpen,
    trackingBulkVisibleUserOptions,
    trackingBulkStatusMeta,
    trackingBulkIsApplying,
    trackingBulkProgressDone,
    trackingBulkProgressTotal,
    trackingBulkMessage,
    trackingBulkMessageType,
    trackingBulkSelectedRows,
    trackingBulkSelectedCount,
    trackingBulkHasChanges,
    isTrackingBulkCurrentPageSelected,
    uploadCustomerOptions,
    selectedUploadCustomerLabel,
    activeAdmCombinedPreviewCustomer,
    isAdmP1P4CombinedUpload,
    isAdmExcelUploadPreview,
    excelPreviewPlantCodeIndex,
    admP1ExcelPreviewRows,
    admP4ExcelPreviewRows,
    visibleExcelPreviewHeaders,
    visibleExcelPreviewRows,
    tmminRawSoPreviewCodeCounts,
    activeAdmPreviewPlantCode,
    activeAdmUploadPreviewSummary,
    tmminUploadPreviewSummarySafe,
    tmminRawSoPreviewFrozenColumnCount,
    admExcelPreviewFrozenColumnCount,
    admExcelPreviewColumnWidths,
    admExcelPreviewTableWidth,
    showCancelActionMenu,
    showDeleteActionMenu,
    cancelActionMenuRef,
    deleteActionMenuRef,
    cancelledCount,
    tmminRawLifecyclePreviewRows,
    selectedRawPreviewRows,
    cancelCandidateRows,
    cancelPreviewRows,
    cancelPreviewHiddenCount,
    cancelPreviewOrderNos,
    cancelTotalCount,
    showFinalCancelConfirm,
    showRestoreConfirmModal,
    restoreConfirmTitle,
    restoreConfirmMessage,
    restoreConfirmIds,
    dnReportZoom,
    dnCompareReportZoom,
    activeDnReportZoom,
    showDnRegisterTooltip,
    isPageTop,
    isFloatingActionOpen,
    closeTrackingBulkValueDropdowns,
    toggleTrackingBulkUserValueDropdown,
    toggleTrackingBulkStatusValueDropdown,
    selectTrackingBulkUserValue,
    selectTrackingBulkStatusValue,
    getJakartaDateValue,
    getJakartaTimeValue,
    toggleTrackingBulkMode,
    isTrackingBulkRowSelected,
    toggleTrackingBulkRow,
    selectTrackingBulkCurrentPage,
    toggleTrackingBulkCurrentPageSelection,
    selectTrackingBulkFilteredRows,
    clearTrackingBulkSelection,
    setTrackingBulkToday,
    setTrackingBulkNow,
    applyTrackingBulkUpdate,
    getExcelPreviewPlantCode,
    selectAdmCombinedPreviewCustomer,
    formatUploadPreviewNumber,
    formatUploadPreviewDate,
    formatUploadPreviewDateRange,
    normalizeUploadPreviewHeader,
    isExcelPreviewCenteredColumn,
    isTmminPreviewCenteredColumn,
    getTmminRawSoPreviewColumnWidth,
    getTmminRawSoPreviewFrozenLeft,
    getTmminRawSoPreviewCellStyle,
    admExcelPreviewColumnMinWidth,
    estimateAdmExcelPreviewTextWidth,
    getAdmExcelPreviewColumnWidth,
    getAdmExcelPreviewFrozenLeft,
    getAdmExcelPreviewCellStyle,
    getExcelPreviewDisplayHeader,
    toggleCancelActionMenu,
    toggleDeleteActionMenu,
    openUploadModalWithClose,
    openCancelSelectedFromMenu,
    openCancelFilteredFromMenu,
    openCancelledFromMenu,
    openDeleteSelectedFromMenu,
    openDeleteFilteredFromMenu,
    handleOutsideActionMenu,
    openFinalCancelConfirm,
    closeFinalCancelConfirm,
    executeFinalCancel,
    closeRestoreConfirmModal,
    openRestoreSelectedConfirm,
    openRestoreDnConfirm,
    confirmRestoreFromModal,
    DN_REPORT_ZOOM_MIN,
    DN_REPORT_ZOOM_MAX,
    DN_REPORT_ZOOM_STEP,
    setDnReportZoom,
    zoomInDnReport,
    zoomOutDnReport,
    resetDnReportZoom,
    showRegisterTooltip,
    hideRegisterTooltip,
    ACTION_BAR_SCROLL_THRESHOLD,
    handlePageScroll,
    toggleFloatingAction,
    openUploadFilePicker,
    scrollToPageBottom,
    formatDnCount,
    hasDnActivity,
    getDnMonitoringGap,
    getDnMonitoringAchievement,
    getDnMonitoringAchievementClass,
    initializeUploadSoView,
    disposeUploadSoView,

  };
});

