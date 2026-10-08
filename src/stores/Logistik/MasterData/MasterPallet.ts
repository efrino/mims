import { defineStore } from 'pinia';
import { useNotificationStore } from '@/stores/notification';
import { usePalletService } from '@/services/Logistik/MasterData/MasterPallet';
import type {
  PalletState,
  PalletItem,
  PalletFormData,
  DatatablesFilters
} from '@/types/Logistik/MasterData/MasterPallet';

export const usePalletStore = defineStore('Master Data Pallet', {
  state: (): PalletState => ({
    dataTable: [],
    formData: {
      pallet: ''
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
        pallet: ''
      }
    },
    deleteData: {
      id: '',
      pallet: ''
    },
    isDeleting: false,
    uploading: false
  }),

  getters: {
    filteredItems: (state): PalletItem[] => {
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
    async fetchMasterPallet(): Promise<void> {
      const notificationStore = useNotificationStore();

      try {
        notificationStore.loading = true;
        const service = usePalletService();

        const data = await service.fetchMasterPallet();

        this.dataTable = data;
        this.datatables.items = data;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Gagal memuat data master Pallet';
        notificationStore.showDialogError('Gagal Memuat Data', errorMessage);
      } finally {
        notificationStore.loading = false;
      }
    },

    async onSavePallet(): Promise<void> {
      const notificationStore = useNotificationStore();
      const currentAction = this.action;

      try {
        notificationStore.loading = true;
        const service = usePalletService();

        if (currentAction === 'Edit' && this.editId) {
          await service.updatePallet(this.editId, this.formData);
        } else {
          await service.insertPallet(this.formData);
        }

        await this.fetchMasterPallet();

        this.dialog.form = false;
        this.resetForm();

        const label = currentAction === 'Edit' ? 'diperbarui' : 'ditambahkan';
        notificationStore.showDialogSuccess('Berhasil', `Data Pallet berhasil ${label}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Gagal menyimpan data Pallet';
        notificationStore.showDialogError('Gagal Menyimpan', errorMessage);
      } finally {
        notificationStore.loading = false;
      }
    },

    async deletePallet(): Promise<void> {
      const notificationStore = useNotificationStore();

      try {
        notificationStore.loading = true;

        if (!this.deleteData.id) {
          throw new Error('Tidak ada data yang dipilih untuk dihapus');
        }

        const service = usePalletService();
        await service.deletePallet(this.deleteData.id);

        await this.fetchMasterPallet();

        this.dialog.delete = false;
        this.resetDeleteData();

        notificationStore.showDialogSuccess('Berhasil', 'Data Pallet berhasil dihapus');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Gagal menghapus data Pallet';
        notificationStore.showDialogError('Gagal Menghapus', errorMessage);
      } finally {
        notificationStore.loading = false;        
      }
    },

    async uploadExcel(file: File): Promise<void> {
      const notificationStore = useNotificationStore();

      try {
        notificationStore.loading = true;

        const service = usePalletService();
        const result = await service.uploadExcel(file);

        if (result.success) {
          await this.fetchMasterPallet();
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

    loadFormPallet(action: 'Create' | 'Edit', data?: Partial<PalletItem>): void {
      this.action = action;

      if (action === 'Edit' && data) {
        this.editId = data.id || null;
        this.formData = {
          pallet: data.pallet || ''
        };
      } else {
        this.resetForm();
      }

      this.dialog.form = true;
    },

    confirmDelete(id: string,pallet: string): void {
      this.deleteData = { id, pallet};
      this.dialog.delete = true;
    },

    updateFormData(key: keyof PalletFormData, value: string): void {
      this.formData[key] = value;
    },

    updateDatatableFilter(key: keyof DatatablesFilters, value: string): void {
      this.datatables.filters[key] = value;
    },

    resetForm(): void {
      this.formData = {
        pallet: ''
      };
      this.editId = null;
      this.action = 'Create';
    },

    resetDeleteData(): void {
      this.deleteData = {
        id: '',
        pallet: ''
      };
    },

    resetFilters(): void {
      this.datatables.filters = {
        pallet: ''
      };
    }
  }
});