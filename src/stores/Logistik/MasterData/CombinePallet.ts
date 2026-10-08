import { defineStore } from 'pinia';
import { useNotificationStore } from '@/stores/notification';
import { usePalletService } from '@/services/Logistik/MasterData/CombinePallet';
import type {
  PalletState,
  PalletItem,
  PalletFormData,
  DatatablesFilters,
  CombineDriverItem
} from '@/types/Logistik/MasterData/CombinePallet';

export const useCombineStore = defineStore('Master Data Combine', {
  state: (): PalletState & { combineDriverData: CombineDriverItem[]; combineDriverInData: CombineDriverItem[] } => ({
    dataTable: [],
    combineDriverData: [],
    combineDriverInData: [],
    formData: {
      no_rfid: '',
      no_pallet: '',
      name: '',
      type: '',
      is_active: '1',
      category: '',
      customer: ''
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
        no_rfid: '',
        no_pallet: '',
        name: '',
        type: '',
        status: '',
        is_active: '',
        category: '',
        customer: ''
      }
    },
    deleteData: {
      id: '',
      no_rfid: '',
      no_pallet: '',
      type: ''
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

    async fetchCombineDriver(): Promise<void> {
      const notificationStore = useNotificationStore();
      try {
        notificationStore.loading = true;
        const service = usePalletService();
        this.combineDriverData = await service.fetchCombineDriver('OUT');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Gagal memuat data pallet tidak berputar';
        notificationStore.showDialogError('Gagal Memuat Data', errorMessage);
      } finally {
        notificationStore.loading = false;
      }
    },

    async fetchCombineDriverIn(): Promise<void> {
      const notificationStore = useNotificationStore();
      try {
        notificationStore.loading = true;
        const service = usePalletService();
        this.combineDriverInData = await service.fetchCombineDriver('IN');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Gagal memuat data pallet masuk';
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

    async downloadTemplate(): Promise<void> {
      const notificationStore = useNotificationStore();

      try {
        notificationStore.loading = true;
        const service = usePalletService();

        await service.downloadTemplate();

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Gagal download template';
        notificationStore.showDialogError('Gagal Download', errorMessage);
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
          no_rfid: data.no_rfid || '',
          no_pallet: data.no_pallet || '',
          name: data.name || '',
          type: data.type || '',
          is_active: data.is_active || '1',
          category: data.category || '',
          customer: data.customer || ''
        };
      } else {
        this.resetForm();
      }

      this.dialog.form = true;
    },

    async downloadExcel(): Promise<void> {
    const notificationStore = useNotificationStore();

      try {
        notificationStore.loading = true; 

        const service = usePalletService();
        await service.downloadExcel();

      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Gagal download excel';

        notificationStore.showDialogError('Download Gagal', errorMessage);
      } finally {
        notificationStore.loading = false;
      }
    },

    confirmDelete(id: string,no_rfid: string, no_pallet: string, type: string): void {
      this.deleteData = { id, no_rfid, no_pallet, type };
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
        no_rfid: '',
        no_pallet: '',
        name: '',
        type: '',
        is_active: '1',
        category: '',
        customer: ''
      };
      this.editId = null;
      this.action = 'Create';
    },

    resetDeleteData(): void {
      this.deleteData = {
        id: '',
        no_rfid: '',
        no_pallet: '',
        type: ''
      };
    },

    resetFilters(): void {
      this.datatables.filters = {
        no_rfid: '',
        no_pallet: '',
        name: '',
        type: '',
        status: '',
        is_active: '',
        category: '',
        customer: ''
      };
    }
  }
});