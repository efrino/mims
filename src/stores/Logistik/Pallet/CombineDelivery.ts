import { defineStore } from 'pinia';
import { useNotificationStore } from '@/stores/notification';
import { useLogsPalletService } from '@/services/Logistik/Pallet/logsPalletService';
import type { CombinePalletDeliveryItem, CombineDeliveryParams, DeliveryCycleItem, DeliveryCyclesParams } from '@/types/Logistik/Pallet/logsPallet';

export const useCombineDeliveryStore = defineStore('Combine Delivery', {
  state: () => ({
    items       : [] as CombinePalletDeliveryItem[],
    cycles      : [] as DeliveryCycleItem[],
    isLoading   : false,
    lastParams  : null as CombineDeliveryParams | null,
  }),

  getters: {
    totalItems: (state): number => state.items.length,

    isEmpty: (state): boolean => state.items.length === 0,

    itemsByStatus: (state) => (status: 'IN' | 'OUT' | 'EMPTY'): CombinePalletDeliveryItem[] =>
      state.items.filter((item) => item.status === status),

    itemsBySource: (state) => (source: string): CombinePalletDeliveryItem[] =>
      state.items.filter((item) => item.source === source),

    itemsByCycle: (state) => (cycle: string): CombinePalletDeliveryItem[] =>
      state.items.filter((item) => item.cycle === cycle),

    // pallet yang cycle-nya masih perkiraan - tidak dapat dipertanggungjawabkan
    itemsEstimatedCycle: (state): CombinePalletDeliveryItem[] =>
      state.items.filter((item) => item.cycle_is_estimated === '1'),

    // pallet yang cycle-nya ditentukan dari jam keluar (HMMI / MKM)
    itemsCycleByJamKeluar: (state): CombinePalletDeliveryItem[] =>
      state.items.filter((item) => item.cycle_source === 'jam_keluar'),

    // pallet yang cycle-nya pasti, dari nomor DN di label
    itemsCyclePasti: (state): CombinePalletDeliveryItem[] =>
      state.items.filter((item) => item.cycle_source === 'label'),

    // pallet yang belum ada driver-nya
    itemsWithoutDriver: (state): CombinePalletDeliveryItem[] =>
      state.items.filter((item) => !item.nik),

    // pallet yang label-nya tidak ketemu di sumber delivery mana pun
    itemsUnmatched: (state): CombinePalletDeliveryItem[] =>
      state.items.filter((item) => !item.source),

    // daftar customer pada hasil cycle (baris tabel report)
    cycleCustomers: (state): string[] =>
      [...new Set(state.cycles.map((c) => c.customer))],

    // cycle milik satu customer, urut naik
    cyclesOf: (state) => (customer: string): DeliveryCycleItem[] =>
      state.cycles.filter((c) => c.customer === customer),

    sourceOptions: (state): string[] =>
      [...new Set(state.items.map((item) => item.source).filter(Boolean))] as string[],

    cycleOptions: (state): string[] =>
      [...new Set(state.items.map((item) => item.cycle).filter(Boolean))] as string[],
  },

  actions: {
    async getCombineDelivery(params: CombineDeliveryParams = {}) {
      const notificationStore = useNotificationStore();
      try {
        notificationStore.loading = true;
        this.isLoading  = true;
        this.lastParams = params;
        this.items      = await useLogsPalletService().getCombineDelivery(params);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Gagal memuat data combine pallet';
        notificationStore.showDialogError('Gagal Memuat Data', errorMessage);
      } finally {
        this.isLoading = false;
        notificationStore.loading = false;
      }
    },

    // ambil pallet pada satu cycle tertentu (pola mieruka_shipping:
    // .../mieruka-shipping/hmmi/4). Cycle jadi parameter, bukan tebakan.
    // daftar cycle per customer utk satu grup + tanggal (sumber jawaban cycle)
    async getDeliveryCycles(params: DeliveryCyclesParams = {}) {
      const notificationStore = useNotificationStore();
      try {
        notificationStore.loading = true;
        this.cycles = await useLogsPalletService().getDeliveryCycles(params);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Gagal memuat daftar cycle';
        notificationStore.showDialogError('Gagal Memuat Data', errorMessage);
      } finally {
        notificationStore.loading = false;
      }
    },

    // ambil pallet satu grup (1 / 2) - pola report-cycle-delivery-all
    async getByGroup(group: 1 | 2, cycle?: string | number) {
      await this.getCombineDelivery({
        group,
        ...(cycle !== undefined ? { cycle } : {}),
      });
    },

    async getByCycle(cycle: string | number, customer?: string) {
      await this.getCombineDelivery({
        cycle,
        ...(customer ? { customer } : {}),
      });
    },

    async refresh() {
      await this.getCombineDelivery(this.lastParams ?? {});
    },

    resetItems() {
      this.items      = [];
      this.lastParams = null;
    },
  },
});
