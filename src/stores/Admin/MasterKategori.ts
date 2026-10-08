import { defineStore } from 'pinia';
import { useNotificationStore } from '@/stores/notification';
import { useMasterKategoriService } from '@/services/Admin/MasterKategoriService';
import type { KategoriState, KategoriItem, KategoriFormData } from '@/types/Admin/MasterKategori';

export const useMasterKategoriStore = defineStore('Master Kategori Barang', {
  state: (): KategoriState => ({
    dataTable: [],
    formData: {
      kode_lama: '',
      kode_kategori: '',
      nama_kategori: '',
      status: 'AKTIF'
    },
    formError: '',
    dialog: {
      form: false,
      delete: false
    },
    action: 'Create',
    deleteData: {
      kode_kategori: '',
      nama_kategori: ''
    },
    isDeleting: false
  }),

  actions: {
    async fetchKategori(): Promise<void> {
      const notificationStore = useNotificationStore();

      try {
        notificationStore.loading = true;
        const service = useMasterKategoriService();

        this.dataTable = await service.fetchKategori();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Gagal memuat data master kategori';
        notificationStore.showDialogError('Gagal Memuat Data', errorMessage);
      } finally {
        notificationStore.loading = false;
      }
    },

    async onSaveKategori(): Promise<void> {
      const notificationStore = useNotificationStore();
      const currentAction = this.action;

      const kosong: string[] = [];
      if (!this.formData.kode_kategori.trim()) kosong.push('Kode Kategori');
      if (!this.formData.nama_kategori.trim()) kosong.push('Nama Kategori');
      this.formError = kosong.length ? `${kosong.join(', ')} wajib diisi` : '';
      if (this.formError) return;

      try {
        notificationStore.loading = true;
        const service = useMasterKategoriService();

        let result;
        if (currentAction === 'Edit') {
          result = await service.updateKategori(this.formData);
        } else {
          result = await service.insertKategori(this.formData);
        }

        await this.fetchKategori();

        this.dialog.form = false;
        this.resetForm();

        const label = currentAction === 'Edit' ? 'diperbarui' : 'ditambahkan';
        notificationStore.showDialogSuccess('Berhasil', result?.messages || `Data kategori berhasil ${label}`);
      } catch (error) {
        // Pesan gagal tampil di dalam form supaya isian tidak hilang
        this.formError = error instanceof Error ? error.message : 'Gagal menyimpan data kategori';
      } finally {
        notificationStore.loading = false;
      }
    },

    async deleteKategori(): Promise<void> {
      const notificationStore = useNotificationStore();

      try {
        this.isDeleting = true;

        if (!this.deleteData.kode_kategori) {
          throw new Error('Tidak ada data yang dipilih untuk dihapus');
        }

        const service = useMasterKategoriService();
        await service.deleteKategori(this.deleteData.kode_kategori);

        await this.fetchKategori();

        this.dialog.delete = false;
        this.resetDeleteData();

        notificationStore.showDialogSuccess('Berhasil', 'Data kategori berhasil dihapus');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Gagal menghapus data kategori';
        notificationStore.showDialogError('Gagal Menghapus', errorMessage);
      } finally {
        this.isDeleting = false;
      }
    },

    loadFormKategori(action: 'Create' | 'Edit', data?: Partial<KategoriItem>): void {
      this.action = action;

      if (action === 'Edit' && data) {
        this.formData = {
          kode_lama: data.kode_kategori || '',
          kode_kategori: data.kode_kategori || '',
          nama_kategori: data.nama_kategori || '',
          status: data.status || 'AKTIF'
        };
      } else {
        this.resetForm();
      }

      this.formError = '';
      this.dialog.form = true;
    },

    confirmDelete(kode_kategori: string, nama_kategori: string): void {
      this.deleteData = { kode_kategori, nama_kategori };
      this.dialog.delete = true;
    },

    updateFormData(key: keyof KategoriFormData, value: string): void {
      this.formData[key] = value;
      this.formError = '';
    },

    resetForm(): void {
      this.formData = {
        kode_lama: '',
        kode_kategori: '',
        nama_kategori: '',
        status: 'AKTIF'
      };
      this.action = 'Create';
    },

    resetDeleteData(): void {
      this.deleteData = {
        kode_kategori: '',
        nama_kategori: ''
      };
    }
  }
});
