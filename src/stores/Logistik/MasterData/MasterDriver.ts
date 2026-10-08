import { defineStore } from 'pinia';
import { useNotificationStore } from '@/stores/notification';
import { useMasterDriver } from '@/services/Logistik/MasterData/MasterDriver';
import type {
  DriverState,
  DriverItem,
  DriverFormData,
  DatatablesFilters
} from '@/types/Logistik/MasterData/MasterDriver';

export const useDriverStore = defineStore('Master Data Driver', {
  state: (): DriverState => ({
    dataTable: [],
    formData: {
      nik: '',
      nama_driver: '',
      nama_lp: ''
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
        nik: '',
        nama_driver: '',
        nama_lp: ''
      }
    },
    deleteData: {
      id: '',
      nik: ''
    },
    isDeleting: false,
    uploading: false
  }),

  getters: {
    filteredItems: (state): DriverItem[] => {
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
    async fetchMasterDriver(): Promise<void> {
      const notificationStore = useNotificationStore();

      try {
        notificationStore.loading = true;
        const service = useMasterDriver();

        const data = await service.fetchMasterDriver();

        this.dataTable = data;
        this.datatables.items = data;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Gagal memuat data master driver';
        notificationStore.showDialogError('Gagal Memuat Data', errorMessage);
      } finally {
        notificationStore.loading = false;
      }
    },

    async onSaveDriver(): Promise<void> {
      const notificationStore = useNotificationStore();
      const currentAction = this.action;

      try {
        notificationStore.loading = true;
        const service = useMasterDriver();

        if (currentAction === 'Edit' && this.editId) {
          await service.updateDriver(this.editId, this.formData);
        } else {
          await service.insertDriver(this.formData);
        }

        await this.fetchMasterDriver();

        this.dialog.form = false;
        this.resetForm();

        const label = currentAction === 'Edit' ? 'diperbarui' : 'ditambahkan';
        notificationStore.showDialogSuccess('Berhasil', `Data Driver berhasil ${label}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Gagal menyimpan data Driver';
        notificationStore.showDialogError('Gagal Menyimpan', errorMessage);
      } finally {
        notificationStore.loading = false;
      }
    },

    async deleteDriver(): Promise<void> {
      const notificationStore = useNotificationStore();

      try {
        notificationStore.loading = true;

        if (!this.deleteData.id) {
          throw new Error('Tidak ada data yang dipilih untuk dihapus');
        }

        const service = useMasterDriver();
        await service.deleteDriver(this.deleteData.id);

        await this.fetchMasterDriver();

        this.dialog.delete = false;
        this.resetDeleteData();

        notificationStore.showDialogSuccess('Berhasil', 'Data Driver berhasil dihapus');
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

        const service = useMasterDriver();
        const result = await service.uploadExcel(file);

        if (result.success) {
          await this.fetchMasterDriver();
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

    loadFormDriver(action: 'Create' | 'Edit', data?: Partial<DriverItem>): void {
      this.action = action;

      if (action === 'Edit' && data) {
        this.editId = data.id || null;
        this.formData = {
          nik: data.nik || '',
          nama_driver: data.nama_driver || '',
          nama_lp: data.nama_lp || ''
        };
      } else {
        this.resetForm();
      }

      this.dialog.form = true;
    },

    confirmDelete(id: string,nik: string): void {
      this.deleteData = { id, nik };
      this.dialog.delete = true;
    },

    updateFormData(key: keyof DriverFormData, value: string): void {
      this.formData[key] = value;
    },

    updateDatatableFilter(key: keyof DatatablesFilters, value: string): void {
      this.datatables.filters[key] = value;
    },

    resetForm(): void {
      this.formData = {
        nik: '',
        nama_driver: '',
        nama_lp: ''
      };
      this.editId = null;
      this.action = 'Create';
    },

    resetDeleteData(): void {
      this.deleteData = {
        id: '',
        nik: ''
      };
    },

    resetFilters(): void {
      this.datatables.filters = {
        nik: '',
        nama_driver: '',
        nama_lp: ''
      };
    }
  }
});
