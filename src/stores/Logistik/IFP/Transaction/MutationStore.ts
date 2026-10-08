import { defineStore } from 'pinia';
import {
  getStockMutation,
  bulkUpdateMutation,
  getDeliveryByDate,
  getSalesOrderDo,
  updateEtd,
  getSalesOrderDoByDate,
  syncSalesOrderQtyToMovement,
  importExcelMgl,
  syncStockMovement,
  syncStockAwal,
} from '@/services/Logistik/IFP/Transaction/MutationService';
import type {
  MutationItem,
  MutationQuery,
  MutationUpdatePayload,
  DeliveryItem,
  SalesOrderDoItem,
  EtdUpdatePayload,
} from '@/types/Logistik/IFP/Transaction/Mutation';

export const useMutationStore = defineStore('mutation', {
  state: () => ({
    // === Mutation state ===
    mutations: [] as MutationItem[],
    totalData: 0 as number,
    isLoading: false as boolean,
    isUpdating: false as boolean,
    filters: {
      tanggal: '',
      shift: '1',
      source: '',
      part_number: '',
    } as MutationQuery,

    // === Delivery state ===
    // Key: erdat ("20260612"), Value: gabungan ZDNDO (PODATE + CREATEDON, deduped)
    deliveriesByDate: {} as Record<string, DeliveryItem[]>,
    isLoadingDelivery: false as boolean,

    // === Sales Order DO State ===
    salesOrderData: [] as SalesOrderDoItem[],
    isSalesOrderCycledelvNull: false as boolean,
    isLoadingSalesOrder: false as boolean,
    isUpdatingEtd: false as boolean,
  }),

  getters: {
    // === Mutation getters ===
    hasData: (state) => state.mutations.length > 0,
    criticalItems: (state) =>
      state.mutations.filter((m) => m.qty_needed_for_qty_final > 0),

    // === Sales Order DO Getters ===
    hasSalesOrderData: (state) => state.salesOrderData.length > 0,
  },

  actions: {
    // === Mutation actions ===
    async fetchStockMutation() {
      this.isLoading = true;
      const response = await getStockMutation(this.filters);

      if (response.success) {
        this.mutations = response.data;
        this.totalData = response.total;
      } else {
        this.mutations = [];
        this.totalData = 0;
      }
      this.isLoading = false;
    },

    async updateMutations(items: MutationUpdatePayload[]) {
      this.isUpdating = true;
      const response = await bulkUpdateMutation(items);
      this.isUpdating = false;

      if (response.success) {
        await this.fetchStockMutation();
      }

      return response;
    },

    setFilters(newFilters: MutationQuery) {
      this.filters = { ...this.filters, ...newFilters };
    },

    resetFilters() {
      this.filters = { tanggal: '', shift: '1', source: '', part_number: '' };
    },

    // === Delivery actions ===
    async fetchDeliveriesForDate(erdat: string, force = false) {
      if (!erdat) return;
      if (!force && this.deliveriesByDate[erdat]) return;

      this.isLoadingDelivery = true;

      const [resPodate, resCreatedon] = await Promise.all([
        getDeliveryByDate({ action: 'PODATE', erdat }),
        getDeliveryByDate({ action: 'CREATEDON', erdat }),
      ]);

      const podate = resPodate.success ? resPodate.data.ZDNDO : [];
      const createdon = resCreatedon.success ? resCreatedon.data.ZDNDO : [];

      const map = new Map<string, DeliveryItem>();
      [...createdon, ...podate].forEach((d) => {
        const key = `${d.VBELN}_${d.POSNR}`;
        if (!map.has(key)) map.set(key, d);
      });

      this.deliveriesByDate[erdat] = Array.from(map.values());
      this.isLoadingDelivery = false;
    },

    clearDeliveriesCache() {
      this.deliveriesByDate = {};
    },

    // === Sales Order DO Actions (LAMA - TETAP DIPERTAHANKAN) ===
    /**
     * Mengambil data Sales Order DO berdasarkan parameter jam & tanggal
     */
    async fetchSalesOrderDo(date: string, startHour: string, endHour: string) {
      this.isLoadingSalesOrder = true;
      const response = await getSalesOrderDo(date, startHour, endHour);

      if (response.status) {
        this.salesOrderData = response.data;
        this.isSalesOrderCycledelvNull = response.is_cycledelv_null;
      } else {
        this.salesOrderData = [];
        this.isSalesOrderCycledelvNull = false;
      }
      this.isLoadingSalesOrder = false;
      return response;
    },

    /**
     * Update data ETD (vsnmr_v) untuk item tertentu (Versi Lama)
     */
    async updateSalesOrderEtd(
      payload: EtdUpdatePayload & {
        refetchParams?: { date: string; startHour: string; endHour: string };
      }
    ) {
      this.isUpdatingEtd = true;
      const response = await updateEtd(payload);
      this.isUpdatingEtd = false;

      if (response.status && payload.refetchParams) {
        const { date, startHour, endHour } = payload.refetchParams;
        await this.fetchSalesOrderDo(date, startHour, endHour);
      }

      return response;
    },

    // ============================================================
    // === TAMBAHAN BARU: SALES ORDER DO ACTIONS (BY DATE & ACTION) ===
    // ============================================================
    /**
     * Mengambil data Sales Order DO berdasarkan parameter tanggal & tipe action saja
     */
    async fetchSalesOrderDoByDate(date: string, action: string, mode: string = 'db') {
      this.isLoadingSalesOrder = true;
      const response = await getSalesOrderDoByDate(date, action, mode);

      if (mode === 'db') {
        if (response.status) {
          this.salesOrderData = response.data;
          this.isSalesOrderCycledelvNull = response.is_cycledelv_null;
        } else {
          this.salesOrderData = [];
          this.isSalesOrderCycledelvNull = false;
        }
      }
      this.isLoadingSalesOrder = false;
      return response;
    },

    /**
     * Update data ETD (vsnmr_v) khusus untuk sistem pencarian Date & Action terbaru
     */
    async updateSalesOrderEtdByDate(
      payload: EtdUpdatePayload & {
        refetchParams?: { date: string; action: string };
      }
    ) {
      this.isUpdatingEtd = true;
      const response = await updateEtd(payload);
      this.isUpdatingEtd = false;

      // Otomatis refresh data di dalam popup modal jika proses update berhasil
      if (response.status && payload.refetchParams) {
        const { date, action } = payload.refetchParams;
        await this.fetchSalesOrderDoByDate(date, action);
      }

      return response;
    },

    /**
     * Reset State Sales Order DO
     */
    clearSalesOrderData() {
      this.salesOrderData = [];
      this.isSalesOrderCycledelvNull = false;
    },


/**
     * Sinkronisasi massal dengan filter rentang jam cycle delivery
     */
    async syncSalesOrderQtyToMovement(payload: any) {
      this.isLoadingSalesOrder = true; 
      try {
        // KUNCI PERBAIKAN: Oper variabel 'payload' secara UTUH ke fungsi service API
        const response = await syncSalesOrderQtyToMovement(payload);
        
        this.isLoadingSalesOrder = false;
        return response;
      } catch (error) {
        this.isLoadingSalesOrder = false;
        return Promise.reject(error);
      }
    },

    async importExcelMgl(file: File, tanggal: string, shift: string, updatedBy: string, typeUpload?: string) {
      this.isLoading = true;
      try {
        const response = await importExcelMgl(file, tanggal, shift, updatedBy, typeUpload);
        this.isLoading = false;
        return response;
      } catch (error) {
        this.isLoading = false;
        return Promise.reject(error);
      }
    },

    async syncStockMovement(date: string) {
      this.isLoading = true;
      try {
        const response = await syncStockMovement(date);
        this.isLoading = false;
        return response;
      } catch (error) {
        this.isLoading = false;
        return Promise.reject(error);
      }
    },

    async syncStockAwal() {
      this.isLoading = true;
      try {
        const response = await syncStockAwal();
        this.isLoading = false;
        return response;
      } catch (error) {
        this.isLoading = false;
        return Promise.reject(error);
      }
    },
  },
});