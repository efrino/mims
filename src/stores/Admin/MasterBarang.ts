import { defineStore } from 'pinia';
import { useNotificationStore } from '@/stores/notification';
import { useMasterBarangService } from '@/services/Admin/MasterBarangService';
import { useMasterKategoriService } from '@/services/Admin/MasterKategoriService';
import type { BarangState, BarangItem, BarangFormData, ModeKodeExcel } from '@/types/Admin/MasterBarang';

export const useMasterBarangStore = defineStore('Master Barang', {
  state: (): BarangState => ({
    dataTable: [],
    ringkasan: [],
    kategoriOptions: [],
    areaOptions: [],
    rakOptions: [],
    formData: {
      kode_barang: '',
      kode_kategori: '',
      nama_barang: '',
      merk: '',
      kode_area: '',
      rak: '',
      kondisi: 'BAIK',
      status: 'AKTIF',
      keterangan: ''
    },
    kodeManual: false,
    previewKode: '',
    formError: '',
    dialog: {
      form: false,
      delete: false,
      tambahKategori: false
    },
    action: 'Create',
    editKode: null,
    deleteData: {
      kode_barang: '',
      nama_barang: ''
    },
    isDeleting: false,
    uploading: false,
    uploadError: ''
  }),

  actions: {
    async fetchBarang(): Promise<void> {
      const notificationStore = useNotificationStore();

      try {
        notificationStore.loading = true;
        const service = useMasterBarangService();

        const [data, ringkasan] = await Promise.all([service.fetchBarang(), service.fetchRingkasan()]);
        this.dataTable = data;
        this.ringkasan = ringkasan;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Gagal memuat data master barang';
        notificationStore.showDialogError('Gagal Memuat Data', errorMessage);
      } finally {
        notificationStore.loading = false;
      }
    },

    // Kategori aktif untuk dropdown pemilihan kategori barang
    async fetchKategoriOptions(): Promise<void> {
      try {
        const service = useMasterKategoriService();
        this.kategoriOptions = await service.fetchKategori(undefined, 'AKTIF');
      } catch (error) {
        const notificationStore = useNotificationStore();
        const errorMessage = error instanceof Error ? error.message : 'Gagal memuat data kategori';
        notificationStore.showDialogError('Gagal Memuat Data', errorMessage);
      }
    },

    // Area & seluruh rak terdaftar; rak difilter per area di form
    async fetchLokasiOptions(): Promise<void> {
      try {
        const service = useMasterBarangService();
        const [area, rak] = await Promise.all([service.fetchAreaList(), service.fetchRakList()]);
        this.areaOptions = area;
        this.rakOptions = rak;
      } catch (error) {
        const notificationStore = useNotificationStore();
        const errorMessage = error instanceof Error ? error.message : 'Gagal memuat data area & rak';
        notificationStore.showDialogError('Gagal Memuat Data', errorMessage);
      }
    },

    // Tambah kategori baru langsung dari form Master Barang, tanpa pindah halaman.
    // Kategori baru otomatis masuk Master Kategori Barang dan langsung dipilih di form ini.
    async quickAddKategori(kode_kategori: string, nama_kategori: string): Promise<void> {
      const notificationStore = useNotificationStore();

      try {
        if (!kode_kategori.trim() || !nama_kategori.trim()) {
          throw new Error('Kode dan nama kategori wajib diisi');
        }

        notificationStore.loading = true;
        const service = useMasterKategoriService();
        await service.insertKategori({ kode_kategori: kode_kategori.trim(), nama_kategori: nama_kategori.trim() });

        await this.fetchKategoriOptions();
        this.formData.kode_kategori = kode_kategori.trim().toUpperCase();
        this.dialog.tambahKategori = false;
        await this.refreshPreviewKode();

        notificationStore.showDialogSuccess('Berhasil', `Kategori ${nama_kategori} berhasil ditambahkan`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Gagal menambah kategori';
        notificationStore.showDialogError('Gagal Menambah Kategori', errorMessage);
      } finally {
        notificationStore.loading = false;
      }
    },

    // Pratinjau kode otomatis berdasarkan kategori terpilih
    async refreshPreviewKode(): Promise<void> {
      if (this.action === 'Edit' || this.kodeManual || !this.formData.kode_kategori) {
        this.previewKode = '';
        return;
      }
      try {
        const service = useMasterBarangService();
        this.previewKode = await service.fetchNextKode(this.formData.kode_kategori);
      } catch {
        this.previewKode = '';
      }
    },

    async setKodeManual(value: boolean): Promise<void> {
      this.kodeManual = value;
      this.formData.kode_barang = '';
      await this.refreshPreviewKode();
    },

    // Cek field wajib sebelum kirim ke server, mengembalikan pesan error atau string kosong
    validateForm(): string {
      const kosong: string[] = [];
      if (this.action === 'Create' && this.kodeManual && !this.formData.kode_barang.trim()) kosong.push('Kode Barang');
      if (!this.formData.kode_kategori) kosong.push('Kategori');
      if (!this.formData.nama_barang.trim()) kosong.push('Nama Barang');
      if (!this.formData.kode_area) kosong.push('Area Penyimpanan');
      return kosong.length ? `${kosong.join(', ')} wajib diisi` : '';
    },

    async onSaveBarang(): Promise<void> {
      const notificationStore = useNotificationStore();
      const currentAction = this.action;

      this.formError = this.validateForm();
      if (this.formError) return;

      try {
        notificationStore.loading = true;
        const service = useMasterBarangService();

        let result;
        if (currentAction === 'Edit') {
          result = await service.updateBarang(this.formData);
        } else {
          result = await service.insertBarang({ ...this.formData, kode_barang: this.kodeManual ? this.formData.kode_barang : '' });
        }

        await this.fetchBarang();

        this.dialog.form = false;
        this.resetForm();

        const label = currentAction === 'Edit' ? 'diperbarui' : 'ditambahkan';
        notificationStore.showDialogSuccess('Berhasil', result?.messages || `Data barang berhasil ${label}`);
      } catch (error) {
        // Pesan gagal ditampilkan di dalam form supaya isian user tidak hilang
        this.formError = error instanceof Error ? error.message : 'Gagal menyimpan data barang';
      } finally {
        notificationStore.loading = false;
      }
    },

    async deleteBarang(): Promise<void> {
      const notificationStore = useNotificationStore();

      try {
        this.isDeleting = true;

        if (!this.deleteData.kode_barang) {
          throw new Error('Tidak ada data yang dipilih untuk dihapus');
        }

        const service = useMasterBarangService();
        await service.deleteBarang(this.deleteData.kode_barang);

        await this.fetchBarang();

        this.dialog.delete = false;
        this.resetDeleteData();

        notificationStore.showDialogSuccess('Berhasil', 'Data barang berhasil dihapus');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Gagal menghapus data barang';
        notificationStore.showDialogError('Gagal Menghapus', errorMessage);
      } finally {
        this.isDeleting = false;
      }
    },

    async downloadTemplate(mode: ModeKodeExcel): Promise<void> {
      const notificationStore = useNotificationStore();

      try {
        notificationStore.loading = true;
        const service = useMasterBarangService();

        await service.downloadTemplate(mode);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Gagal download template';
        notificationStore.showDialogError('Gagal Download', errorMessage);
      } finally {
        notificationStore.loading = false;
      }
    },

    // Pesan gagal disimpan di uploadError supaya tampil di dalam modal upload; true jika berhasil
    async uploadExcel(file: File, mode: ModeKodeExcel): Promise<boolean> {
      const notificationStore = useNotificationStore();

      try {
        this.uploading = true;
        this.uploadError = '';
        notificationStore.loading = true;

        const service = useMasterBarangService();
        const result = await service.uploadExcel(file, mode);

        if (!result.success) {
          this.uploadError = result.messages || 'Terjadi kesalahan saat upload';
          return false;
        }

        await this.fetchBarang();
        notificationStore.showDialogSuccess('Berhasil', result.messages || 'Upload berhasil');
        return true;
      } catch (error) {
        this.uploadError = error instanceof Error ? error.message : 'Gagal upload file';
        return false;
      } finally {
        this.uploading = false;
        notificationStore.loading = false;
      }
    },

    // Membuka form Create/Edit sekaligus memuat pilihan kategori, area & rak terbaru
    async openFormBarang(action: 'Create' | 'Edit', data?: Partial<BarangItem>): Promise<void> {
      await Promise.all([this.fetchKategoriOptions(), this.fetchLokasiOptions()]);
      this.loadFormBarang(action, data);
    },

    loadFormBarang(action: 'Create' | 'Edit', data?: Partial<BarangItem>): void {
      this.action = action;

      if (action === 'Edit' && data) {
        this.editKode = data.kode_barang || null;
        this.formData = {
          kode_barang: data.kode_barang || '',
          kode_kategori: data.kode_kategori || '',
          nama_barang: data.nama_barang || '',
          merk: data.merk || '',
          kode_area: data.kode_area || '',
          rak: data.rak || '',
          kondisi: data.kondisi || 'BAIK',
          status: data.status || 'AKTIF',
          keterangan: data.keterangan || ''
        };
      } else {
        this.resetForm();
      }

      this.kodeManual = false;
      this.previewKode = '';
      this.formError = '';
      this.dialog.form = true;
    },

    confirmDelete(kode_barang: string, nama_barang: string): void {
      this.deleteData = { kode_barang, nama_barang };
      this.dialog.delete = true;
    },

    updateFormData(key: keyof BarangFormData, value: string): void {
      this.formData[key] = value;
      this.formError = '';
      if (key === 'kode_kategori') this.refreshPreviewKode();
    },

    resetForm(): void {
      this.formData = {
        kode_barang: '',
        kode_kategori: '',
        nama_barang: '',
        merk: '',
        kode_area: '',
        rak: '',
        kondisi: 'BAIK',
        status: 'AKTIF',
        keterangan: ''
      };
      this.editKode = null;
      this.action = 'Create';
    },

    resetDeleteData(): void {
      this.deleteData = {
        kode_barang: '',
        nama_barang: ''
      };
    }
  }
});
