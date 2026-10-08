import { defineStore } from 'pinia';
import { useNotificationStore } from '@/stores/notification';
import { usePalletLogService } from '@/services/Logistik/Pallet/ScanInPalletService';
import type {
  PalletLogState,
  PalletLogItem,
  PalletLogFormData,
  PalletLogDatatablesFilters
} from '@/types/Logistik/Pallet/ScanPalletIn';

export const usePalletLogStore = defineStore('Pallet Log', {
  state: (): PalletLogState => ({
    dataTable: [],
    formData: {
      ms_pallet_id: '',
      no_rfid: '',
      type:'',
      no_pallet:'',
      status: '',
      category: '',
      customer: '',
      id_label: ''
    },
    dialog: {
      scan: false,
      detail: false
    },
    datatables: {
      items: [],
      filters: {
        no_rfid: '',
        status: '',
        category: '',
        customer: ''
      }
    },
    isSubmitting: false
  }),

  getters: {
    filteredItems: (state): PalletLogItem[] => {
      return state.datatables.items.filter((item) => {
        return (Object.keys(state.datatables.filters) as Array<keyof PalletLogDatatablesFilters>).every((key) => {
          const filterValue = state.datatables.filters[key];
          const itemValue = item[key as keyof PalletLogItem];

          return filterValue.length < 1 ||
            (typeof itemValue === 'string' && itemValue.toLowerCase().includes(filterValue.toLowerCase()));
        });
      });
    }
  },

  actions: {
    async fetchPalletLogs(id?: string): Promise<void> {
      const notificationStore = useNotificationStore();

      try {
        notificationStore.loading = true;
        const service = usePalletLogService();

        const data = await service.fetchPalletLogs(id);

        this.dataTable = data;
        this.datatables.items = data;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Gagal memuat data log pallet';
        notificationStore.showDialogError('Gagal Memuat Data', errorMessage);
      } finally {
        notificationStore.loading = false;
      }
    },

    async submitScan(): Promise<void> {
      const notificationStore = useNotificationStore();
      const currentStatus = this.formData.status;

      try {
        this.isSubmitting = true;

        if (!this.formData.no_rfid) {
          throw new Error('Pallet ID tidak boleh kosong');
        }

        const service = usePalletLogService();
        await service.submitPalletLog(this.formData);

        await this.fetchPalletLogs();

        this.dialog.scan = false;
        this.resetForm();

        notificationStore.showDialogSuccess('Berhasil', `Scan ${currentStatus} berhasil dicatat`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Gagal melakukan scan Pallet';
        notificationStore.showDialogError('Gagal Scan', errorMessage);
      } finally {
        this.isSubmitting = false;
      }
    },

    async submitScanDirect(payload: PalletLogFormData): Promise<void> {
      const service = usePalletLogService();
      await service.submitPalletLog(payload);
    },

    openScanDialog(no_rfid: string): void {
      this.resetForm();
      this.formData.no_rfid = no_rfid;
      this.dialog.scan = true;
    },

    updateFormData(key: keyof PalletLogFormData, value: string): void {
      if (key === 'status') {
        this.formData.status = value as 'IN' | 'OUT' | '';
        this.formData.id_label = '';
      } else {
        this.formData[key] = value;
      }
    },

    updateDatatableFilter(key: keyof PalletLogDatatablesFilters, value: string): void {
      this.datatables.filters[key] = value;
    },

    resetForm(): void {
      this.formData = {
        ms_pallet_id: '',
        no_rfid: '',
        type:'',
        no_pallet:'',
        status: '',
        category: '',
        id_label: '',
        customer: ''
      };
    },

    resetFilters(): void {
      this.datatables.filters = {
        no_rfid: '',
        status: '',
        category: '',
        customer: ''
      };
    }
  }
});