import { defineStore } from 'pinia';
import { useNotificationStore } from '@/stores/notification';
import { useRfidService } from '@/services/Logistik/MasterData/MasterRfid';
import type {
  RfidState,
  RfidItem,
  RfidFormData,
  DatatablesFilters
} from '@/types/Logistik/MasterData/MasterRfid';

export const useRfidStore = defineStore('Master Data Rfid', {
  state: (): RfidState => ({
    dataTable: [],
    formData: {
      no_rfid: ''
    },
    dialog: {
      form: false,
      detail: false,
      delete: false
    },
    action: 'Create',
    editId: null,
    datatables: {
      items: [],
      filters: {
        no_rfid: ''
      }
    },
    deleteData: {
      id: '',
      no_rfid: ''
    },
    isDeleting: false,
    uploading: false
  }),

  getters: {
    filteredItems: (state): RfidItem[] => {
      return state.datatables.items.filter((item) => {
        return (Object.keys(state.datatables.filters) as Array<keyof DatatablesFilters>).every((key) => {
          const filterValue = state.datatables.filters[key];
          const itemValue = item[key];

          return filterValue.length < 1 ||
            (typeof itemValue === 'string' && itemValue.toLowerCase().includes(filterValue.toLowerCase()));
        });
      });
    }
  },

  actions: {
    async fetchMasterRfid(): Promise<void> {
      const notificationStore = useNotificationStore();

      try {
        notificationStore.loading = true;
        const service = useRfidService();

        const data = await service.fetchMasterRfid();

        this.dataTable = data;
        this.datatables.items = data;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Gagal memuat data master Rfid';
        notificationStore.showDialogError('Gagal Memuat Data', errorMessage);
      } finally {
        notificationStore.loading = false;
      }
    },

    async onSaveRfid(): Promise<void> {
      const notificationStore = useNotificationStore();
      const currentAction = this.action;

      try {
        notificationStore.loading = true;
        const service = useRfidService();

        if (currentAction === 'Edit' && this.editId) {
          await service.updateRfid(this.editId, this.formData);
        } else {
          await service.insertRfid(this.formData);
        }

        await this.fetchMasterRfid();

        this.dialog.form = false;
        this.resetForm();

        const label = currentAction === 'Edit' ? 'diperbarui' : 'ditambahkan';
        notificationStore.showDialogSuccess('Berhasil', `Data Rfid berhasil ${label}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Gagal menyimpan data Rfid';
        notificationStore.showDialogError('Gagal Menyimpan', errorMessage);
      } finally {
        notificationStore.loading = false;
      }
    },

    async deleteRfid(): Promise<void> {
      const notificationStore = useNotificationStore();

      try {
        notificationStore.loading = true;

        if (!this.deleteData.id) {
          throw new Error('Tidak ada data yang dipilih untuk dihapus');
        }

        const service = useRfidService();
        await service.deleteRfid(this.deleteData.id);

        await this.fetchMasterRfid();

        this.dialog.delete = false;
        this.resetDeleteData();

        notificationStore.showDialogSuccess('Berhasil', 'Data Rfid berhasil dihapus');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Gagal menghapus data Rfid';
        notificationStore.showDialogError('Gagal Menghapus', errorMessage);
      } finally {
        notificationStore.loading = false;        
      }
    },

    async uploadExcel(file: File): Promise<void> {
      const notificationStore = useNotificationStore();

      try {
        notificationStore.loading = true;

        const service = useRfidService();
        const result = await service.uploadExcel(file);

        if (result.success) {
          await this.fetchMasterRfid();
          notificationStore.showDialogSuccess(
            'Berhasil',
            `Upload berhasil (${result.total} data)`
          );
        } else {
          notificationStore.showDialogError(
            'Upload Gagal',
            result.message || 'Terjadi kesalahan saat upload'
          );
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Gagal upload file';
        notificationStore.showDialogError('Upload Error', errorMessage);
      } finally {
        notificationStore.loading = false;
      }
    },

    loadFormRfid(action: 'Create' | 'Edit', data?: Partial<RfidItem>): void {
      this.action = action;

      if (action === 'Edit' && data) {
        this.editId = data.id || null;
        this.formData = {
          no_rfid: data.no_rfid || ''
        };
      } else {
        this.resetForm();
      }

      this.dialog.form = true;
    },

    confirmDelete(id: string,no_rfid: string): void {
      this.deleteData = { id, no_rfid };
      this.dialog.delete = true;
    },

    updateFormData(key: keyof RfidFormData, value: string): void {
      this.formData[key] = value;
    },

    updateDatatableFilter(key: keyof DatatablesFilters, value: string): void {
      this.datatables.filters[key] = value;
    },

    resetForm(): void {
      this.formData = {
        no_rfid: ''
      };
      this.editId = null;
      this.action = 'Create';
    },

    resetDeleteData(): void {
      this.deleteData = {
        id: '',
        no_rfid: ''
      };
    },

    resetFilters(): void {
      this.datatables.filters = {
        no_rfid: ''
      };
    }
  }
});
