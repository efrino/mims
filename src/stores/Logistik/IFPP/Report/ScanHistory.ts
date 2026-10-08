import { defineStore } from 'pinia';
import { useNotificationStore } from '@/stores/notification';
import { useScanHistoryIFPPService } from '@/services/Logistik/IFPP/Report/ScanHistoryService';
import type {
  ScanHistoryIFPPState,
  ScanHistoryItem,
  ScanMode
} from '@/types/Logistik/IFPP/Report/ScanHistory';

export const useScanHistoryIFPPStore = defineStore('Scan History IFPP', {
  state: (): ScanHistoryIFPPState => ({
    scanFilter: null,
    scanData: [],
    table: {
      items: []
    },
    dateFilter: {
      date_from: null,
      shift_start: null,
      date_to: null,
      shift_end: null
    }
  }),

  getters: {
    filteredByMode: (state): ScanHistoryItem[] => {
      return state.table.items;
    }
  },

  actions: {
    async fetchScanHistoryInhouse(categoryScan?: ScanMode): Promise<void> {
      const notificationStore = useNotificationStore();

      try {
        notificationStore.loading = true;
        const service = useScanHistoryIFPPService();

        const data = await service.fetchScanHistory('inhouse', {
          category_scan: categoryScan ?? null,
          date_from: this.dateFilter.date_from,
          shift_start: this.dateFilter.shift_start,
          date_to: this.dateFilter.date_to,
          shift_end: this.dateFilter.shift_end
        });

        this.scanData = data;
        this.table.items = data;
        this.scanFilter = categoryScan ?? null;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Gagal memuat data scan history inhouse';
        notificationStore.showDialogError('Gagal Memuat Data', errorMessage);
      } finally {
        notificationStore.loading = false;
      }
    },

    async fetchScanHistoryOuthouse(categoryScan?: ScanMode): Promise<void> {
      const notificationStore = useNotificationStore();

      try {
        notificationStore.loading = true;
        const service = useScanHistoryIFPPService();

        const data = await service.fetchScanHistory('outhouse', {
          category_scan: categoryScan ?? null,
          date_from: this.dateFilter.date_from,
          shift_start: this.dateFilter.shift_start,
          date_to: this.dateFilter.date_to,
          shift_end: this.dateFilter.shift_end
        });

        this.scanData = data;
        this.table.items = data;
        this.scanFilter = categoryScan ?? null;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Gagal memuat data scan history outhouse';
        notificationStore.showDialogError('Gagal Memuat Data', errorMessage);
      } finally {
        notificationStore.loading = false;
      }
    },

    // Dipakai halaman gabungan ScanHistory.vue - tab Scan IN/OUT di sana tidak
    // membedakan area, jadi ambil inhouse + outhouse sekaligus untuk category
    // yang sama lalu digabung. Beda dengan fetchScanHistoryInhouse/Outhouse
    // yang area-nya dikunci (dipakai ScanHistoryInhouse.vue/Outhouse.vue).
    async fetchScanHistoryByCategory(categoryScan: ScanMode): Promise<ScanHistoryItem[]> {
      const notificationStore = useNotificationStore();

      try {
        notificationStore.loading = true;
        const service = useScanHistoryIFPPService();

        const params = {
          category_scan: categoryScan ?? null,
          date_from: this.dateFilter.date_from,
          shift_start: this.dateFilter.shift_start,
          date_to: this.dateFilter.date_to,
          shift_end: this.dateFilter.shift_end
        };

        const [inhouseData, outhouseData] = await Promise.all([
          service.fetchScanHistory('inhouse', params),
          service.fetchScanHistory('outhouse', params)
        ]);

        return [...inhouseData, ...outhouseData];
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Gagal memuat data scan history';
        notificationStore.showDialogError('Gagal Memuat Data', errorMessage);
        return [];
      } finally {
        notificationStore.loading = false;
      }
    },

    resetFilter(): void {
      this.scanFilter = null;
      this.table.items = this.scanData;
    },

    resetDateFilter(): void {
      this.dateFilter = {
        date_from: null,
        shift_start: null,
        date_to: null,
        shift_end: null
      };
    }
  }
});