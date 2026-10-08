import { defineStore, storeToRefs } from 'pinia';

import { computed, nextTick, ref } from 'vue';

import { useCustomizerStore } from '@/stores/customizer';

import { useNotificationStore } from '@/stores/notification';
import { useAuthStore } from '@/stores/auth';
import { useBudgetMatStore } from '@/stores/Marketing/BudgetMatStore.ts';
import { getBudgetVsSo } from '@/services/Marketing/BudgetVsSoService.ts';
import type { BudgetVsSoFilter, BudgetVsSoRow } from '@/types/Marketing/BudgetVsSo.ts';
import { useRouter, useRoute } from 'vue-router';


export const useBudgetVsSoStore = defineStore('budgetVsSo', () => {
  const router = useRouter();
  const route = useRoute();
  /* ==============================
 * STATE UTAMA
 * ============================== */
  const rows = ref<BudgetVsSoRow[]>([]);
  const totalRow = ref<BudgetVsSoRow | null>(null);

  const selectedMonth = ref('');
  const selectedReportType = ref('');
  const selectedVersion = ref('');

  const customerCode = ref('HMMI');

  /* ==============================
 * SALES AMOUNT PRINT STATE
 * ============================== */
  const isPreparingPrint = ref(false);

  const SALES_PRINT_FLOW_KEY = 'hmmi-sales-print-flow';

  const SALES_PRINT_RETURN_KEY = 'hmmi-sales-print-return-url';

  const SALES_PRINT_PHASE_OPEN_MATERIAL = 'OPEN_MATERIAL';

  const SALES_PRINT_PHASE_RETURN_SALES = 'RETURN_TO_SALES';

  const SALES_PRINT_STYLE_ID = 'hmmi-sales-print-style';

  let isExecutingPrint = false;

  let previousMiniSidebar = false;

  let printPortal: HTMLElement | null = null;

  /* ==============================
 * REFERENSI DARI BUDGET MAT STORE
 * ============================== */
  const budgetMatStore = useBudgetMatStore();
  const customizer = useCustomizerStore();

  const notification = useNotificationStore();
  const authStore = useAuthStore();

  type BudgetSalesAmountPermissionAction = 'view' | 'create' | 'update' | 'download';

  const permissions = computed(() => ({
    view: authStore.checkAccess('Marketing.View.Daily.BudgetSalesAmount'),
    create: authStore.checkAccess('Marketing.Create.Daily.BudgetSalesAmount'),
    update: authStore.checkAccess('Marketing.Update.Daily.BudgetSalesAmount'),
    download: authStore.checkAccess('Marketing.Download.Daily.BudgetSalesAmount')
  }));

  const requireBudgetSalesAmountPermission = (
    action: BudgetSalesAmountPermissionAction,
    label: string
  ): boolean => {
    if (permissions.value[action]) return true;

    notification.showAlertWarning(
      `Anda tidak memiliki permission ${label} untuk fitur Budget Sales Amount.`
    );
    return false;
  };

  const {
    selectedMonth: budgetMatMonth,
    selectedReportType: budgetMatReportType,
    selectedVersion: budgetMatVersion,
    includeADT: budgetMatIncludeADT,
    budgetMat: budgetMaterialRows
  } = storeToRefs(budgetMatStore);

  /* ==============================
 * HELPER FILTER
 * ============================== */
  const formatPeriode = (monthStr: string) => {
    if (!monthStr) return '';

    const [year, month] = monthStr.split('-');
    if (!year || !month) return '';

    return `${year}${month}`;
  };

  const buildTypeBudget = (reportType: string, version: string) => {
    if (!reportType || !version) return '';

    const letter = reportType === 'Original' ? 'R' : 'B';
    return `${letter}${version}`;
  };

  const syncFilterFromBudgetMatStore = () => {
    if (budgetMatMonth.value) {
      selectedMonth.value = budgetMatMonth.value;
    }

    if (budgetMatReportType.value) {
      selectedReportType.value = budgetMatReportType.value;
    }

    if (budgetMatVersion.value) {
      selectedVersion.value = budgetMatVersion.value;
    }
  };

  /* ==============================
 * INIT FILTER DARI STORE / SESSION
 * ============================== */
  const initFromSession = async () => {
    syncFilterFromBudgetMatStore();

    if (selectedMonth.value && selectedReportType.value && selectedVersion.value) {
      return;
    }

    const raw = sessionStorage.getItem('budgetMatFilter');
    if (!raw) return;

    try {
      const f = JSON.parse(raw) as {
        customer?: string;
        periode?: string;
        type_budget?: string;
        typebudget?: string;
      };

      const periode = f.periode || '';
      const typeBudget = f.type_budget || f.typebudget || '';

      if (!periode || !typeBudget) return;

      const year = periode.slice(0, 4);
      const month = periode.slice(4, 6);

      selectedMonth.value = `${year}-${month}`;

      const letter = typeBudget.slice(0, 1);
      const version = typeBudget.slice(1);

      selectedReportType.value = letter === 'R' ? 'Original' : 'Balancing';
      selectedVersion.value = version;

      if (f.customer) {
        customerCode.value = f.customer;
      }
    } catch (e) {
      console.error('initFromSession VS SO error', e);
    }
  };

  /* ==============================
 * HELPER NORMALISASI ROW
 * ============================== */
  const normalizeText = (value: any) => {
    return String(value ?? '').trim();
  };

  const normalizeUpper = (value: any) => {
    return normalizeText(value).toUpperCase();
  };

  const getKetValue = (row: any) => {
    return normalizeUpper(row?.ket ?? row?.KET ?? row?.ZKET);
  };

  const isSchemaRow = (row: any) => {
    const ket = getKetValue(row);
    return ket.endsWith('ADT') || ket.endsWith('ADV');
  };

  const isTotalRow = (row: any) => {
    return normalizeUpper(row?.model) === 'TOTAL';
  };

  const numberValue = (value: any) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  };

  const cloneRow = <T>(row: T): T => {
    return JSON.parse(JSON.stringify(row || {}));
  };

  const getBudgetVsBaseKey = (row: any) => {
    return [normalizeText(row?.nokol), normalizeText(row?.model), normalizeText(row?.tipe), normalizeText(row?.name)].join('|');
  };

  const applyBudgetMatAmountToVsSoRows = (baseRows: BudgetVsSoRow[]) => {
    const materialRows = Array.isArray(budgetMaterialRows.value) ? budgetMaterialRows.value : [];

    if (!budgetMatIncludeADT.value || !materialRows.length) {
      return baseRows;
    }

    const materialMap = new Map<string, any>();

    materialRows
      .filter((row: any) => !isTotalRow(row))
      .forEach((row: any) => {
        materialMap.set(getBudgetVsBaseKey(row), row);
      });

    return baseRows.map((row: any) => {
      const materialRow = materialMap.get(getBudgetVsBaseKey(row));

      if (!materialRow) {
        return row;
      }

      const merged = cloneRow(row);

      merged.n_amount_forecast = numberValue(materialRow.n_amount_forecast);
      merged.n1_amount_forecast = numberValue(materialRow.n1_amount_forecast);
      merged.n2_amount_forecast = numberValue(materialRow.n2_amount_forecast);
      merged.n3_amount_forecast = numberValue(materialRow.n3_amount_forecast);

      return merged;
    }) as BudgetVsSoRow[];
  };

  const calcPercent = (mats: any, sales: any) => {
    const materialValue = numberValue(mats);
    const salesValue = numberValue(sales) / 1000;

    if (materialValue <= 0 || salesValue <= 0) {
      return 0;
    }

    return Math.round((materialValue / salesValue) * 100);
  };

  const recalcPercentRows = (sourceRows: BudgetVsSoRow[]) => {
    const ckdAmountMap = new Map<string, any>();

    sourceRows.forEach((row: any) => {
      if (row.name !== 'CKD PCS' && row.name !== 'CKD Transport') return;

      const key = normalizeText(row.model);

      if (!ckdAmountMap.has(key)) {
        ckdAmountMap.set(key, {
          n0: 0,
          n: 0,
          n1: 0,
          n2: 0,
          n3: 0
        });
      }

      const current = ckdAmountMap.get(key);

      current.n0 += numberValue(row.n0_amount_act);
      current.n += numberValue(row.n_amount_forecast);
      current.n1 += numberValue(row.n1_amount_forecast);
      current.n2 += numberValue(row.n2_amount_forecast);
      current.n3 += numberValue(row.n3_amount_forecast);
    });

    return sourceRows.map((row: any) => {
      const next = cloneRow(row);

      if (next.name === 'CKD PCS' || next.name === 'CKD Transport') {
        const ckd = ckdAmountMap.get(normalizeText(next.model)) || {
          n0: 0,
          n: 0,
          n1: 0,
          n2: 0,
          n3: 0
        };

        next.n0_percentMatSales = calcPercent(ckd.n0, next.n0_amountSales);
        next.n_percentMatSales = calcPercent(ckd.n, next.n_amountSales);
        next.n1_percentMatSales = calcPercent(ckd.n1, next.n1_amountSales);
        next.n2_percentMatSales = calcPercent(ckd.n2, next.n2_amountSales);
        next.n3_percentMatSales = calcPercent(ckd.n3, next.n3_amountSales);

        return next;
      }

      next.n0_percentMatSales = calcPercent(next.n0_amount_act, next.n0_amountSales);
      next.n_percentMatSales = calcPercent(next.n_amount_forecast, next.n_amountSales);
      next.n1_percentMatSales = calcPercent(next.n1_amount_forecast, next.n1_amountSales);
      next.n2_percentMatSales = calcPercent(next.n2_amount_forecast, next.n2_amountSales);
      next.n3_percentMatSales = calcPercent(next.n3_amount_forecast, next.n3_amountSales);

      return next;
    }) as BudgetVsSoRow[];
  };

  const recalcTotalRow = (sourceRows: BudgetVsSoRow[], oldTotalRow: any) => {
    const modelsForTotal = ['SU2ID', 'KS', 'SU2ID FL', 'KS-FL'];

    const rowsForMaterialAmount = sourceRows.filter((row: any) => {
      return (
        modelsForTotal.includes(normalizeText(row.model)) && ['Material', 'CKD PCS', 'CKD Transport'].includes(normalizeText(row.name))
      );
    });

    const materialRowsForItem = sourceRows.filter((row: any) => {
      return modelsForTotal.includes(normalizeText(row.model)) && normalizeText(row.name) === 'Material';
    });

    const materialRowsForSales = sourceRows.filter((row: any) => {
      return modelsForTotal.includes(normalizeText(row.model)) && normalizeText(row.name) === 'Material';
    });

    const total = cloneRow(
      oldTotalRow || {
        id: null,
        month: formatPeriode(selectedMonth.value),
        ket: buildTypeBudget(selectedReportType.value, selectedVersion.value),
        nokol: null,
        cust: customerCode.value,
        model: 'TOTAL',
        tipe: '',
        name: 'Sales'
      }
    );

    total.total_item = materialRowsForItem.reduce((sum: number, row: any) => sum + numberValue(row.total_item), 0);

    total.n0_amount_act = rowsForMaterialAmount.reduce((sum: number, row: any) => sum + numberValue(row.n0_amount_act), 0);

    total.n_amount_forecast = rowsForMaterialAmount.reduce((sum: number, row: any) => sum + numberValue(row.n_amount_forecast), 0);

    total.n1_amount_forecast = rowsForMaterialAmount.reduce((sum: number, row: any) => sum + numberValue(row.n1_amount_forecast), 0);

    total.n2_amount_forecast = rowsForMaterialAmount.reduce((sum: number, row: any) => sum + numberValue(row.n2_amount_forecast), 0);

    total.n3_amount_forecast = rowsForMaterialAmount.reduce((sum: number, row: any) => sum + numberValue(row.n3_amount_forecast), 0);

    total.n0_amountSales = materialRowsForSales.reduce((sum: number, row: any) => sum + numberValue(row.n0_amountSales), 0);

    total.n_amountSales = materialRowsForSales.reduce((sum: number, row: any) => sum + numberValue(row.n_amountSales), 0);

    total.n1_amountSales = materialRowsForSales.reduce((sum: number, row: any) => sum + numberValue(row.n1_amountSales), 0);

    total.n2_amountSales = materialRowsForSales.reduce((sum: number, row: any) => sum + numberValue(row.n2_amountSales), 0);

    total.n3_amountSales = materialRowsForSales.reduce((sum: number, row: any) => sum + numberValue(row.n3_amountSales), 0);

    total.n0_percentMatSales = calcPercent(total.n0_amount_act, total.n0_amountSales);
    total.n_percentMatSales = calcPercent(total.n_amount_forecast, total.n_amountSales);
    total.n1_percentMatSales = calcPercent(total.n1_amount_forecast, total.n1_amountSales);
    total.n2_percentMatSales = calcPercent(total.n2_amount_forecast, total.n2_amountSales);
    total.n3_percentMatSales = calcPercent(total.n3_amount_forecast, total.n3_amountSales);

    return total as BudgetVsSoRow;
  };

  const normalizeBudgetVsRows = (allRows: BudgetVsSoRow[]) => {
    const sourceRows = Array.isArray(allRows) ? allRows : [];
    const detailRows = sourceRows.filter((row: any) => !isTotalRow(row));

    const baseRows = detailRows.filter((row: any) => !isSchemaRow(row));

    if (!budgetMatIncludeADT.value) {
      return recalcPercentRows(baseRows);
    }

    const rowsWithAppliedMaterialAmount = applyBudgetMatAmountToVsSoRows(baseRows);

    return recalcPercentRows(rowsWithAppliedMaterialAmount);
  };

  /* ==============================
 * LOAD DATA VS SO
 * ============================== */
  const loadBudgetVsSo = async () => {
    syncFilterFromBudgetMatStore();

    const periode = formatPeriode(selectedMonth.value);
    const typebudget = buildTypeBudget(selectedReportType.value, selectedVersion.value);

    if (!periode || !typebudget) return;

    if (budgetMatIncludeADT.value && typeof budgetMatStore.loadBudgetMat === 'function') {
      await budgetMatStore.loadBudgetMat();
    }

    const payload: BudgetVsSoFilter = {
      customer: customerCode.value,
      periode,
      typebudget
    };

    try {
      const res = await getBudgetVsSo(payload);
      const allRows = Array.isArray(res.data) ? res.data : [];

      const normalizedRows = normalizeBudgetVsRows(allRows);

      rows.value = normalizedRows;
      totalRow.value = recalcTotalRow(normalizedRows, allRows.find((row: any) => isTotalRow(row)) ?? null);
    } catch (error) {
      console.error('loadBudgetVsSo error', error);
      rows.value = [];
      totalRow.value = null;
    }
  };

  /* ==============================
 * SALES AMOUNT PRINT HELPERS
 * ============================== */
  const sleep = (duration: number): Promise<void> => {
    return new Promise((resolve) => {
      window.setTimeout(resolve, duration);
    });
  };

  const waitNextPaint = async (): Promise<void> => {
    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => resolve());
      });
    });
  };

  const waitForElement = async (selector: string, timeout = 8000): Promise<HTMLElement | null> => {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeout) {
      const element = document.querySelector<HTMLElement>(selector);

      if (element) {
        return element;
      }

      await sleep(50);
    }

    return null;
  };

  const waitForImages = async (container: HTMLElement): Promise<void> => {
    const images = Array.from(container.querySelectorAll<HTMLImageElement>('img'));

    await Promise.all(
      images.map(async (image) => {
        if (image.complete && image.naturalWidth > 0) {
          return;
        }

        if (typeof image.decode === 'function') {
          try {
            await image.decode();
            return;
          } catch {
            // lanjut ke event load/error
          }
        }

        await new Promise<void>((resolve) => {
          const finish = () => {
            image.removeEventListener('load', finish);

            image.removeEventListener('error', finish);

            resolve();
          };

          image.addEventListener('load', finish, {
            once: true
          });

          image.addEventListener('error', finish, {
            once: true
          });
        });
      })
    );
  };

  const removePrintPortal = () => {
    if (printPortal) {
      printPortal.remove();
      printPortal = null;
    }

    document.getElementById('printPortal')?.remove();
  };

  const createPrintPortal = (source: HTMLElement): HTMLElement => {
    removePrintPortal();

    const portal = document.createElement('div');

    portal.id = 'printPortal';

    const clonedDocument = source.cloneNode(true) as HTMLElement;

    clonedDocument.id = 'printDocument';

    portal.appendChild(clonedDocument);

    document.body.appendChild(portal);

    printPortal = portal;

    return portal;
  };

  const clearSalesPrintStorage = () => {
    sessionStorage.removeItem(SALES_PRINT_FLOW_KEY);

    sessionStorage.removeItem(SALES_PRINT_RETURN_KEY);
  };

  const restoreAfterSalesPrint = () => {
    customizer.mini_sidebar = previousMiniSidebar;

    document.body.classList.remove('hmmi-sales-printing');

    removePrintPortal();
    removeSalesPrintStyle();

    isExecutingPrint = false;
    isPreparingPrint.value = false;

    clearSalesPrintStorage();

    window.removeEventListener('afterprint', restoreAfterSalesPrint);
  };

  const executeSalesAmountPrint = async (): Promise<void> => {
    if (!requireBudgetSalesAmountPermission('download', 'Download/Print')) return;

    if (isExecutingPrint) {
      return;
    }

    isExecutingPrint = true;
    isPreparingPrint.value = true;

    previousMiniSidebar = customizer.mini_sidebar;

    try {
      await initFromSession();
      await loadBudgetVsSo();

      if (rows.value.length === 0) {
        throw new Error('Data Sales Amount tidak tersedia');
      }

      /*
       * Kecilkan sidebar terlebih dahulu.
       */
      customizer.mini_sidebar = true;

      await nextTick();

      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      await waitNextPaint();

      const source = await waitForElement('#printArea');

      if (!source) {
        throw new Error('Area print Sales Amount tidak ditemukan');
      }
      installSalesPrintStyle();

      /*
       * Buat salinan khusus untuk print.
       */
      const portal = createPrintPortal(source);

      await waitForImages(portal);
      await waitNextPaint();

      /*
       * Sembunyikan aplikasi dan tampilkan
       * hanya print portal.
       */
      document.body.classList.add('hmmi-sales-printing');

      /*
       * Tunggu browser menerapkan print CSS.
       */
      await waitNextPaint();

      void portal.offsetWidth;
      void portal.offsetHeight;

      window.addEventListener('afterprint', restoreAfterSalesPrint, {
        once: true
      });

      await sleep(250);

      window.print();
    } catch (error) {
      console.error('Sales Amount print error:', error);

      notification.showAlertError(error instanceof Error ? error.message : 'Gagal menyiapkan halaman print');

      restoreAfterSalesPrint();
    }
  };

  const removeSalesPrintStyle = () => {
    document.getElementById(SALES_PRINT_STYLE_ID)?.remove();
  };

  const installSalesPrintStyle = () => {
    removeSalesPrintStyle();

    const style = document.createElement('style');

    style.id = SALES_PRINT_STYLE_ID;

    style.textContent = `
      @page {
      size: A4 landscape;
      margin: 4mm;
      }

        #printPortal {
          position: fixed;
          top: 0;
          left: -200vw;
          width: 100%;
          visibility: hidden;
          pointer-events: none;
          background: #ffffff;
        }

          @media print {
          html,
          body {
            width: auto !important;
            height: auto !important;
            min-width: 0 !important;
            min-height: 0 !important;

            margin: 0 !important;
            padding: 0 !important;

            overflow: visible !important;
            background: #ffffff !important;
          }

          body.hmmi-sales-printing > *:not(#printPortal) {
            display: none !important;
          }

          body.hmmi-sales-printing > #printPortal {
            display: block !important;
            position: static !important;

            width: 100% !important;
            min-width: 0 !important;
            max-width: none !important;

            height: auto !important;
            min-height: 0 !important;

            margin: 0 !important;
            padding: 0 !important;

            visibility: visible !important;
            overflow: visible !important;
            pointer-events: auto !important;

            background: #ffffff !important;
          }

          #printPortal,
          #printPortal * {
            box-sizing: border-box !important;
            visibility: visible !important;
          }

          #printDocument {
            display: block !important;
            position: static !important;

            width: 100% !important;
            min-width: 0 !important;
            max-width: none !important;

            height: auto !important;
            min-height: 0 !important;

            margin: 0 !important;
            padding: 0 !important;

            overflow: visible !important;
            background: #ffffff !important;
          }

          #printPortal .report-frame {
            position: relative !important;

            /*
            * Jangan tepat 100%, beri ruang agar
            * border kanan tidak terpotong.
            */
            width: calc(100% - 1mm) !important;
            min-width: 0 !important;
            max-width: none !important;

            min-height: 198mm !important;

            /*
            * Posisi kiri dan kanan dibuat simetris.
            */
            margin: 0 auto !important;
            padding: 1.5mm !important;
            padding-top: 2mm !important;

            box-sizing: border-box !important;
            overflow: visible !important;

            /*
            * Gunakan mm agar ketebalan cetak stabil.
            */
            border: 0.35mm solid #000000 !important;

            border-radius: 0 !important;
            box-shadow: none !important;
            }

            #printPortal .budget-table {
              border: 0.3mm solid #000000 !important;
            }

            #printPortal .budget-table th:last-child,
            #printPortal .budget-table td:last-child {
              border-right: 0.3mm solid #000000 !important;
            }

          #printPortal .report-content {
            width: 100% !important;
            min-width: 0 !important;
            max-width: none !important;

            height: auto !important;
            min-height: 184mm !important;

            margin: 0 !important;

            /* kiri dan kanan sama */
            padding: 0 2mm 6mm 3mm !important;
          }

          /*
          * UKURAN TABEL DISAMAKAN DENGAN
          * BUDGET MATERIAL HMMI
          */
          #printPortal .budget-table {
            width: 100% !important;
            min-width: 0 !important;
            max-width: none !important;

            table-layout: fixed !important;
            border-collapse: collapse !important;

            font-size: 8.5px !important;
            line-height: 1.9 !important;

            page-break-inside: avoid !important;
            break-inside: avoid-page !important;
          }

          #printPortal .budget-table thead {
            display: table-header-group !important;
          }

          #printPortal .budget-table tbody {
            display: table-row-group !important;
          }

          #printPortal .budget-table tr {
            height: auto !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          #printPortal .budget-table th,
          #printPortal .budget-table td {
            border: 1px solid #000000 !important;

            /*
            * Persis ukuran Budget Material HMMI
            */
            padding: 2px 2px !important;
            font-size: 8.5px !important;
            line-height: 1.4 !important;

            vertical-align: middle !important;

            white-space: normal !important;
            overflow-wrap: break-word !important;
            word-break: normal !important;
          }

          /*
          * TITLE, PROJECT, CUSTOMER
          */
          #printPortal .header-text-13,
          #printPortal .header-text-13 * {
            font-size: 12px !important;
            line-height: 1.5 !important;
            font-weight: 700 !important;
          }

          /*
          * Beri sedikit jarak antarbaris header
          */
          #printPortal .header-text-13 {
            min-height: 4mm !important;
          }

            #printPortal img,
            #printPortal th,
            #printPortal td,
            #printPortal tr,
            #printPortal div {
              print-color-adjust: exact !important;
              -webkit-print-color-adjust: exact !important;
            }
          }

          /*
          * FINAL NOTE OVERRIDE
          * Diletakkan paling akhir agar tidak ditimpa Tailwind.
          */
          #printPortal .note-section {
            position: relative !important;

            margin-top: 0 !important;
            transform: translateY(-1.5mm) !important;

            font-size: 10pt !important;
            line-height: 1.25 !important;
            font-weight: 700 !important;

            page-break-inside: avoid !important;
            break-inside: avoid-page !important;
          }

          #printPortal .note-section strong {
            display: block !important;

            margin: 0 0 1mm 0 !important;

            font-size: 11pt !important;
            line-height: 1.2 !important;
            font-weight: 800 !important;
          }

          #printPortal .note-section ul {
            margin: 0 !important;
            padding-left: 5mm !important;

            list-style-position: outside !important;
          }

          #printPortal .note-section li {
            margin: 0 0 0.7mm 0 !important;
            padding: 0 !important;

            font-size: 9.5pt !important;
            line-height: 1.25 !important;
            font-weight: 700 !important;
          }

          #printPortal .note-section li *,
          #printPortal .note-section li span {
            font-size: 9.5pt !important;
            line-height: 1.25 !important;
            font-weight: 700 !important;
          }
    `;

    document.head.appendChild(style);


  };

  const startSalesAmountPrint = async (): Promise<void> => {
    if (!requireBudgetSalesAmountPermission('download', 'Download/Print')) return;

    if (isPreparingPrint.value) {
      return;
    }

    isPreparingPrint.value = true;

    try {
      const currentUrl = new URL(window.location.href);

      /*
       * Jangan menyimpan autoPrint
       * ke return URL.
       */
      currentUrl.searchParams.delete('autoPrint');

      sessionStorage.setItem(SALES_PRINT_FLOW_KEY, SALES_PRINT_PHASE_OPEN_MATERIAL);

      sessionStorage.setItem(SALES_PRINT_RETURN_KEY, currentUrl.pathname + currentUrl.search + currentUrl.hash);

      await router.push({
        name: 'budgeting-hmmi-material',
        query: {
          prepareSalesPrint: '1'
        }
      });

    } catch (error) {
      console.error('Mulai print error:', error);

      isPreparingPrint.value = false;
      clearSalesPrintStorage();

      notification.showAlertError('Gagal membuka Budget Material sebelum print');
    }
  };

  const continueSalesPrintFromMaterial = async (): Promise<void> => {
    const phase = sessionStorage.getItem(SALES_PRINT_FLOW_KEY);

    const currentUrl = new URL(window.location.href);

    const isPrepareRequest = currentUrl.searchParams.get('prepareSalesPrint') === '1';

    if (phase !== SALES_PRINT_PHASE_OPEN_MATERIAL || !isPrepareRequest) {
      return;
    }

    if (!requireBudgetSalesAmountPermission('download', 'Download/Print')) {
      clearSalesPrintStorage();
      return;
    }

    try {
      
      await waitForElement('#printArea', 10000);

      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      await nextTick();
      await waitNextPaint();

      await sleep(500);

      sessionStorage.setItem(SALES_PRINT_FLOW_KEY, SALES_PRINT_PHASE_RETURN_SALES);

      await router.replace({
        name: 'budgeting-hmmi-sales',
        query: {
          autoPrint: '1'
        }
      });

    } catch (error) {
      console.error('Material print preparation error:', error);

      clearSalesPrintStorage();

      notification.showAlertError('Gagal menyiapkan Budget Material sebelum print');
    }
  };

  const removeAutoPrintQuery =
  async (): Promise<void> => {
    const query = {
      ...route.query
    };

    delete query.autoPrint;

    await router.replace({
      name: route.name as string,
      query
    });
  };

 const initSalesAmountPage =
  async (): Promise<void> => {
    try {
      await initFromSession();
      await loadBudgetVsSo();

      const phase =
        sessionStorage.getItem(
          SALES_PRINT_FLOW_KEY
        );

      const shouldAutoPrint =
        phase ===
          SALES_PRINT_PHASE_RETURN_SALES &&
        route.query.autoPrint === '1';

      if (!shouldAutoPrint) {
        isPreparingPrint.value = false;
        return;
      }

      await removeAutoPrintQuery();

      await nextTick();
      await waitNextPaint();

      await executeSalesAmountPrint();
    } catch (error) {
      console.error(
        'Sales Amount init error:',
        error
      );

      isPreparingPrint.value = false;

      clearSalesPrintStorage();

      notification.showAlertError(
        'Gagal memuat halaman Sales Amount'
      );
    }
  };
  
/* ==============================
 * HELPER ROWSPAN / GROUPING
 * ============================== */
  const groupNumber = (index: number) => {
    let counter = 0;
    let lastNo: any = null;

    for (let i = 0; i <= index; i += 1) {
      const no = rows.value[i]?.nokol;

      if (no !== lastNo) {
        counter += 1;
        lastNo = no;
      }
    }

    return counter;
  };

  const rowspanNo = (no: string | number) => {
    return rows.value.filter((row) => row.nokol === no).length;
  };

  const rowspanModel = (no: string | number, model: string) => {
    return rows.value.filter((row) => row.nokol === no && row.model === model).length;
  };

  const shouldShowNo = (index: number) => {
    return index === 0 || rows.value[index]?.nokol !== rows.value[index - 1]?.nokol;
  };

  const shouldShowModel = (index: number) => {
    return index === 0 || rows.value[index]?.model !== rows.value[index - 1]?.model;
  };

  const shouldShowTotalItem = (index: number) => {
    return index === 0 || rows.value[index]?.total_item !== rows.value[index - 1]?.total_item;
  };

/* ==============================
 * HELPER CKD DAN FORMAT ANGKA
 * ============================== */
  const sumCKD = (no: any, model: any, field: keyof BudgetVsSoRow) => {
    const group = rows.value.filter(
      (row) => row.nokol === no && row.model === model && (row.name === 'CKD PCS' || row.name === 'CKD Transport')
    );

    return group.reduce((sum, row) => sum + (parseFloat(String(row[field] ?? 0)) || 0), 0);
  };

  const formatNumber = (value: any) => {
    if (value === null || value === undefined || value === '') return '0';

    const n = Math.round(Number(value) || 0);
    if (n === 0) return '-';

    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const formatAmountThousand = (value: any) => {
    if (value === null || value === undefined || value === '') return '0';

    const n = Math.round((Number(value) || 0) / 1000);
    if (n === 0) return '-';

    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

/* ==============================
 * RETURN
 * ============================== */
  return {
    /* Permission */
    permissions,

    /* State */
    rows,
    totalRow,
    selectedMonth,
    selectedReportType,
    selectedVersion,

    /* Action */
    initFromSession,
    loadBudgetVsSo,
    isPreparingPrint,

    /* Print Action */
    initSalesAmountPage,
    startSalesAmountPrint,
    continueSalesPrintFromMaterial,
    executeSalesAmountPrint,
    restoreAfterSalesPrint,

    /* Helper table */
    groupNumber,
    rowspanNo,
    rowspanModel,
    shouldShowNo,
    shouldShowModel,
    shouldShowTotalItem,
    sumCKD,

    /* Formatter */
    formatNumber,
    formatAmountThousand
  };
});
