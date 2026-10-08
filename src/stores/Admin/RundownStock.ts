import { defineStore } from 'pinia';
import { ref } from 'vue';
import { planDeliveryApi } from '@/services/Admin/PlanDeliveryService';
import type { PlanDeliveryItem, PlanDeliveryResponse } from '@/types/Admin/PlanDelivery';
import { DashboardRundownService } from '@/services/Admin/DashboardRundownStock';
import type { StockDetailIFPD, StockDetailIFPP, StockDetailIFRM, StockIFPD, StockIFPP, StockIFRM } from '@/types/Admin/RundownStock';
import type { SupplyMatLineData, SupplyMatRow } from '@/types/Admin/RundownSupplyMat';

const dashboardRundownService = new DashboardRundownService();

export const useRundownStock = defineStore('rundown-stock', () => {
  const stockIFPD = ref<StockIFPD[]>([]);
  const stockIFRM = ref<StockIFRM[]>([]);
  const stockIFPPIn = ref<StockIFPP[]>([]);
  const stockIFPPOut = ref<StockIFPP[]>([]);
  const totalStockIFPD = ref<StockIFPD>({} as StockIFPD);
  const totalStockIFRM = ref<StockIFRM>({} as StockIFRM);
  const totalStockIFPPIn = ref<StockIFPP>({} as StockIFPP);
  const totalStockIFPPOut = ref<StockIFPP>({} as StockIFPP);
  const stockDetail = ref({
    IFPD: { items: [] as StockDetailIFPD[], model: '', customer: '', type: '', project_detail: '' as string | null },
    IFPP: { items: [] as StockDetailIFPP[], model: '', customer: '', type: '', project_detail: '' as string | null },
    IFRM: { items: [] as StockDetailIFRM[], model: '', customer: '', type: '', project_detail: '' as string | null }
  });
  const dialog = ref({
    detailItemIFPD: false,
    detailItemIFPP: false,
    detailItemIFRM: false
  });
  const supplyMatLines = ref<SupplyMatLineData[]>([]);
  const supplyMatLoading = ref(false);
  const supplyMatError = ref<string | null>(null);

  const loading = ref(false);
  const error = ref<string | null>(null);

  async function getRundownStockIFPD() {
    loading.value = true;
    error.value = null;

    try {
      const response = await dashboardRundownService.getStockIFPD();

      stockIFPD.value = response ?? [];
      const totalRow: StockIFPD = stockIFPD.value.reduce((acc, item) => {
        (Object.keys(item) as (keyof StockIFPD)[]).forEach((key) => {
          if (key === 'shift') {
            return;
          }

          const value = Number(item[key]);

          if (!Number.isNaN(value)) {
            const current = Number(acc[key] ?? 0);

            (acc as Record<string, any>)[key] = current + value;
          }
        });

        return acc;
      }, {} as StockIFPD);

      totalRow.customer = 'TOTAL';
      totalRow.model = '';
      totalRow.project_detail = null;
      totalRow.shift = '-';

      totalRow.cycle_delv = '-';
      totalStockIFPD.value = totalRow;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Terjadi kesalahan';
      console.error('getRundownStockIFPD error:', err);
    } finally {
      loading.value = false;
    }
  }

  async function getRundownStockIFPP(location: string | undefined) {
    loading.value = true;
    error.value = null;

    try {
      const response = await dashboardRundownService.getStockIFPP(location);

      if (location === 'IN') {
        stockIFPPIn.value = response ?? [];
      } else {
        stockIFPPOut.value = response ?? [];
      }

      const totalRow: StockIFPP = (location === 'IN' ? stockIFPPIn.value : stockIFPPOut.value).reduce((acc, item) => {
        (Object.keys(item) as (keyof StockIFPP)[]).forEach((key) => {
          const value = Number(item[key]);

          if (!Number.isNaN(value)) {
            const current = Number(acc[key] ?? 0);

            (acc as Record<string, any>)[key] = current + value;
          }
        });

        return acc;
      }, {} as StockIFPP);

      totalRow.customer = 'TOTAL';
      totalRow.model = '';
      if (location === 'IN') {
        totalStockIFPPIn.value = totalRow;
      } else {
        totalStockIFPPOut.value = totalRow;
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Terjadi kesalahan';
      console.error('getRundownStockIFPP error:', err);
    } finally {
      loading.value = false;
    }
  }
  async function getRundownStockIFRM() {
    loading.value = true;
    error.value = null;

    try {
      const response = await dashboardRundownService.getStockIFRM();

      stockIFRM.value = response ?? [];
      const totalRow: StockIFRM = stockIFRM.value.reduce((acc, item) => {
        (Object.keys(item) as (keyof StockIFRM)[]).forEach((key) => {
          const value = Number(item[key]);

          if (!Number.isNaN(value)) {
            const current = Number(acc[key] ?? 0);

            (acc as Record<string, any>)[key] = current + value;
          }
        });

        return acc;
      }, {} as StockIFRM);

      totalRow.customer = 'TOTAL';
      totalRow.model = '';
      totalRow.hours = null;
      totalStockIFRM.value = totalRow;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Terjadi kesalahan';
      console.error('getRundownStockIFRM error:', err);
    } finally {
      loading.value = false;
    }
  }
  async function getRundownStockDetailIFPD(customer: string, model: string, type: string, project_detail: string|null) {
    loading.value = true;
    error.value = null;

    try {
      const response = await dashboardRundownService.getStockDetailIFPD(customer, model, type, project_detail);

      stockDetail.value.IFPD.items = response ?? [];
      stockDetail.value.IFPD.model = model;
      stockDetail.value.IFPD.customer = customer;
      stockDetail.value.IFPD.type = type;
      stockDetail.value.IFPD.project_detail = project_detail;
      dialog.value.detailItemIFPD = true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Terjadi kesalahan';
      console.error('getRundownStockDetailIFPD error:', err);
    } finally {
      loading.value = false;
    }
  }
  async function getRundownStockDetailIFPP(location: string | undefined, customer: string, model: string, type: string) {
    loading.value = true;
    error.value = null;

    try {
      const response = await dashboardRundownService.getStockDetailIFPP(location, customer, model, type);
      
      stockDetail.value.IFPP.items = response ?? [];
      stockDetail.value.IFPP.model = model;
      stockDetail.value.IFPP.customer = customer;
      stockDetail.value.IFPP.type = type;
      dialog.value.detailItemIFPP = true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Terjadi kesalahan';
      console.error('getRundownStockDetailIFPP error:', err);
    } finally {
      loading.value = false;
    }
  }
  async function getRundownStockDetailIFRM(customer: string, model: string, type: string) {
    loading.value = true;
    error.value = null;

    try {
      const response = await dashboardRundownService.getStockDetailIFRM(customer, model, type);
      
      stockDetail.value.IFRM.items = response ?? [];
      stockDetail.value.IFRM.model = model;
      stockDetail.value.IFRM.customer = customer;
      stockDetail.value.IFRM.type = type;
      dialog.value.detailItemIFRM = true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Terjadi kesalahan';
      console.error('getRundownStockDetailIFRM error:', err);
    } finally {
      loading.value = false;
    }
  }

  const SMALL_PRESS_ALIASES = ['SA-LINEP', 'SA-LINESP', 'SA-LINE SP', 'SA-LINE P'];
  const formatLineName = (prvbe: string): string => {
    if (!prvbe || prvbe.trim() === '') return 'Line -';
    if (SMALL_PRESS_ALIASES.some(a => a.toUpperCase() === prvbe.trim().toUpperCase())) return 'LINE SMALL PRESS';
    const match = prvbe.trim().match(/^SA-LINE(.+)$/i);
    if (match?.[1]) return `LINE ${match[1].toUpperCase()}`;
    return prvbe.trim();
  };

  async function getRundownSupplyMat() {
    supplyMatLoading.value = true;
    supplyMatError.value = null;

    try {
      const response = await dashboardRundownService.getRundownSupplyMat();

      if (!response.status || !response.data) {
        supplyMatError.value = 'Gagal mengambil data';
        return;
      }

      const lineMap = new Map<string, SupplyMatRow[]>();

      for (const item of response.data) {
        const lineName = formatLineName(item.PRVBE);
        const row: SupplyMatRow = {
          noReservasi: Number(item.RSNUM),
          partNo:      item.MATNR,
          jobNo:       item.BISMT,
          stockIrm:    Number(item.ZSTOCK),
          qtyRequest:  Number(item.BDMNG),
          qtySupply:   Number(item.ZACC_ACT),
        };
        if (!lineMap.has(lineName)) lineMap.set(lineName, []);
        lineMap.get(lineName)!.push(row);
      }

      supplyMatLines.value = Array.from(lineMap.entries())
        .sort(([a], [b]) => {
          if (a === 'Line -') return 1;
          if (b === 'Line -') return -1;
          return a.localeCompare(b);
        })
        .map(([name, rows]) => ({ name, rows }));
    } catch (err) {
      supplyMatError.value = err instanceof Error ? err.message : 'Terjadi kesalahan';
      console.error('getRundownSupplyMat error:', err);
    } finally {
      supplyMatLoading.value = false;
    }
  }

  function reset() {
    stockIFPD.value = [];
    loading.value = false;
    error.value = null;
  }

  return {
    stockIFPD,
    stockIFRM,
    stockIFPPIn,
    stockIFPPOut,
    totalStockIFPD,
    totalStockIFRM,
    totalStockIFPPIn,
    totalStockIFPPOut,
    stockDetail,
    dialog,
    loading,
    error,
    getRundownStockIFPD,
    getRundownStockIFRM,
    getRundownStockIFPP,
    getRundownStockDetailIFPD,
    getRundownStockDetailIFPP,
    getRundownStockDetailIFRM,
    supplyMatLines,
    supplyMatLoading,
    supplyMatError,
    getRundownSupplyMat,
    reset
  };
});
