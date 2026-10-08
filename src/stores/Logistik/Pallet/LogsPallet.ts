import { defineStore } from 'pinia';
import { useNotificationStore } from '@/stores/notification';
import { useLogsPalletService } from '@/services/Logistik/Pallet/logsPalletService';
import type { PalletLogItem, LogDateParams } from '@/types/Logistik/Pallet/logsPallet';

export const useLogsPalletStore = defineStore('Logs Pallet', {
  state: () => ({
    logs        : [] as PalletLogItem[],
    isLoading   : false,
    lastParams  : null as LogDateParams | null,
  }),

  getters: {
    totalLogs: (state): number => state.logs.length,

    logsIn: (state): PalletLogItem[] =>
      state.logs.filter((log) => log.status === 'IN'),

    logsOut: (state): PalletLogItem[] =>
      state.logs.filter((log) => log.status === 'OUT'),

    logsByCustomer: (state) => (customer: string): PalletLogItem[] =>
      state.logs.filter((log) => log.customer === customer),

    logsByDate: (state) => (date: string): PalletLogItem[] =>
      state.logs.filter((log) => log.created_at === date),

    isEmpty: (state): boolean => state.logs.length === 0,
  },

  actions: {
    async getLogsByDate(params: LogDateParams) {
      const notificationStore = useNotificationStore();
      try {
        notificationStore.loading = true;
        this.lastParams = params;
        this.logs       = await useLogsPalletService().getLogsByDate(params);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Gagal memuat data log pallet';
        notificationStore.showDialogError('Gagal Memuat Data', errorMessage);
      } finally {
        notificationStore.loading = false;
      }
    },

    async refresh() {
      if (!this.lastParams) return;
      await this.getLogsByDate(this.lastParams);
    },

    resetLogs() {
      this.logs       = [];
      this.lastParams = null;
    },
  },
});