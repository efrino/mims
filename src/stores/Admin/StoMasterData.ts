import { defineStore } from 'pinia';
import { useNotificationStore } from '@/stores/notification';
import { useAuthStore } from '@/stores/auth';
import { useStoMasterDataService } from '@/services/Admin/StoMasterDataService';
import { keluarDariStoSesi, pastikanNikSto, readStoAdminNik } from '@/services/Admin/StoApi';
import type { StoMasterFormData, StoMasterItem, StoMasterRow, StoMasterState } from '@/types/Admin/StoMasterData';

/** Jeda ketikan sebelum permintaan dikirim, supaya tidak satu request per huruf. */
const DEBOUNCE_MS = 350;

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

let permintaanTerakhir = 0;

/** Satu halaman saat mengumpulkan seluruh baris yang cocok filter. */
const HAL_LIMIT = 500;
const HAL_MAX = 40;

const emptyForm = (): StoMasterFormData => ({
  area: '',
  job_number: '',
  part_number: '',
  material_description: '',
  type: '',
  status_part: '',
  customer: '',
  plant: '',
  process: '',
  category: '',
  model: ''
});

/** Salin kolom yang bisa ditulis dari satu baris -- dipakai Edit & Duplicate. */
const formDariItem = (item: StoMasterItem): StoMasterFormData => ({
  area: item.area ?? '',
  job_number: item.job_number ?? '',
  part_number: item.part_number ?? '',
  material_description: item.material_description ?? '',
  type: item.type ?? '',
  status_part: item.status_part ?? '',
  customer: item.customer ?? '',
  plant: item.plant ?? '',
  process: item.process ?? '',
  category: item.category ?? '',
  model: item.model ?? ''
});

export const useStoMasterDataStore = defineStore('Admin STO Master Data', {
  state: (): StoMasterState => {
    const authStore = useAuthStore();

    return {
      nik: readStoAdminNik(),
      dataTable: [],
      totalSemua: 0,
      filter: {
        q: '',
        area: '',
        limit: 100,
        offset: 0
      },
      areaOptions: [],
      isLoggingOut: false,
      formData: emptyForm(),
      action: 'Create',
      editId: null,
      duplicateFrom: null,
      deleteTarget: null,
      detail: null,
      isLoading: false,
      isSaving: false,
      isDeleting: false,
      lastError: '',
      dialog: {
        form: false,
        delete: false,
        detail: false
      },
      permissions: {
        create: authStore.checkAccess('Module.Create.STOMasterData'),
        update: authStore.checkAccess('Module.Update.STOMasterData'),
        delete: authStore.checkAccess('Module.Delete.STOMasterData')
      }
    };
  },

  getters: {
    halaman: (state): number => Math.floor(state.filter.offset / state.filter.limit) + 1,

    totalHalaman: (state): number => Math.max(1, Math.ceil(state.totalSemua / state.filter.limit)),

    adaFilterAktif: (state): boolean => state.filter.q.trim() !== '' || state.filter.area !== '',

    /**
     * Saran isian untuk kolom yang di database cuma VARCHAR bebas. Diambil
     * dari halaman yang sedang tampil, jadi tetap boleh diketik manual.
     */
    saranKolom: (state) => {
      const unik = (ambil: (row: StoMasterRow) => string): string[] =>
        [...new Set(state.dataTable.map(ambil).filter((v) => v !== ''))].sort();

      return {
        area: [...new Set([...state.areaOptions, ...unik((r) => r.area)])].sort(),
        type: unik((r) => r.type),
        status_part: unik((r) => r.status_part),
        customer: unik((r) => r.customer),
        plant: unik((r) => r.plant),
        process: unik((r) => r.process),
        category: unik((r) => r.category),
        model: unik((r) => r.model)
      };
    }
  },

  actions: {
    async fetchItems(): Promise<void> {
      const notificationStore = useNotificationStore();

      // Belum ada NIK admin aktif sama sekali (localStorage kosong) --
      // tunggu modal pilih-NIK dulu, supaya tidak memanggil backend dengan
      // nik="" sebelum gerbang rute sempat menanganinya.
      try {
        this.nik = await pastikanNikSto();
      } catch (error) {
        this.lastError = error instanceof Error ? error.message : 'NIK admin tidak tersedia.';
        this.dataTable = [];
        this.totalSemua = 0;
        return;
      }

      const urutan = ++permintaanTerakhir;

      try {
        this.isLoading = true;
        this.lastError = '';

        // Seluruh baris yang cocok filter diambil sekaligus: penyaringan per
        // kolom, pengurutan, dan paginasinya dikerjakan TableExcel di layar.
        // Menyaring separuh data justru menyesatkan -- checklist kolomnya
        // hanya akan melihat halaman yang kebetulan sedang dimuat.
        const service = useStoMasterDataService();
        const kumpulan: StoMasterRow[] = [];
        let total = 0;
        let areaList: string[] = [];

        for (let halaman = 0; halaman < HAL_MAX; halaman += 1) {
          const result = await service.fetchItems(this.nik, {
            ...this.filter,
            limit: HAL_LIMIT,
            offset: halaman * HAL_LIMIT
          });

          // Balasan basi dari ketikan sebelumnya -- abaikan.
          if (urutan !== permintaanTerakhir) return;

          const rows = (result.data ?? []) as StoMasterRow[];
          kumpulan.push(...rows);

          total = result.total_semua ?? kumpulan.length;

          if (Array.isArray(result.area_list) && result.area_list.length > 0) {
            areaList = result.area_list;
          }

          if (rows.length < HAL_LIMIT || kumpulan.length >= total) break;
        }

        this.dataTable = kumpulan;
        this.totalSemua = total;
        this.filter.offset = 0;

        if (areaList.length > 0) {
          this.areaOptions = areaList;
        }
      } catch (error) {
        if (urutan !== permintaanTerakhir) return;

        const errorMessage = error instanceof Error ? error.message : 'Gagal memuat master data STO';
        this.lastError = errorMessage;
        this.dataTable = [];
        this.totalSemua = 0;
        notificationStore.showDialogError('Gagal Memuat Data', errorMessage);
      } finally {
        if (urutan === permintaanTerakhir) this.isLoading = false;
      }
    },

    /** Live search: tunggu ketikan berhenti sejenak, lalu muat ulang dari awal. */
    cariBertahap(): void {
      if (debounceTimer !== null) clearTimeout(debounceTimer);

      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        this.filter.offset = 0;
        void this.fetchItems();
      }, DEBOUNCE_MS);
    },

    /** Filter yang bukan ketikan (dropdown) -- langsung, tanpa jeda. */
    terapkanFilter(): void {
      if (debounceTimer !== null) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }

      this.filter.offset = 0;
      void this.fetchItems();
    },

    resetFilter(): void {
      this.filter.q = '';
      this.filter.area = '';
      this.terapkanFilter();
    },

    async onSave(): Promise<void> {
      const notificationStore = useNotificationStore();
      const currentAction = this.action;

      const kosong = (['area', 'job_number', 'part_number', 'material_description', 'type', 'status_part', 'customer'] as const).filter(
        (k) => this.formData[k].trim() === ''
      );

      if (kosong.length > 0) {
        notificationStore.showAlertWarning(`Kolom wajib belum diisi: ${kosong.join(', ')}`);
        return;
      }

      try {
        this.isSaving = true;
        const service = useStoMasterDataService();

        const result =
          currentAction === 'Edit' && this.editId !== null
            ? await service.updateItem(this.nik, this.editId, this.formData)
            : await service.createItem(this.nik, this.formData);

        await this.fetchItems();

        this.dialog.form = false;
        this.resetForm();

        const label = currentAction === 'Edit' ? 'diperbarui' : currentAction === 'Duplicate' ? 'digandakan' : 'dibuat';
        const pesan = [result.message || `Master data berhasil ${label}`, ...(result.warnings ?? [])].join('\n');

        notificationStore.showDialogSuccess('Berhasil', pesan);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Gagal menyimpan master data';
        notificationStore.showDialogError('Gagal Menyimpan', errorMessage);
      } finally {
        this.isSaving = false;
      }
    },

    async submitDelete(): Promise<void> {
      const notificationStore = useNotificationStore();
      const target = this.deleteTarget;

      if (!target) {
        notificationStore.showAlertWarning('Tidak ada baris yang dipilih untuk dihapus.');
        return;
      }

      try {
        this.isDeleting = true;
        const result = await useStoMasterDataService().deleteItem(this.nik, target.id_item);

        await this.fetchItems();

        this.dialog.delete = false;
        this.deleteTarget = null;

        notificationStore.showDialogSuccess('Berhasil', result.message || 'Master data berhasil dihapus');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Gagal menghapus master data';
        notificationStore.showDialogError('Gagal Menghapus', errorMessage);
      } finally {
        this.isDeleting = false;
      }
    },

    /**
     * Buka form. 'Duplicate' memakai baris lain sebagai isian awal lalu
     * mengosongkan part_number -- pasangan (area, part_number) itu UNIQUE,
     * jadi salinan mentahnya pasti ditolak dan kolom itulah yang memang
     * harus diubah.
     */
    loadForm(action: 'Create' | 'Duplicate' | 'Edit', data?: StoMasterItem): void {
      this.action = action;
      this.duplicateFrom = null;
      this.editId = null;

      if (action === 'Edit' && data) {
        this.editId = data.id_item;
        this.formData = formDariItem(data);
      } else if (action === 'Duplicate' && data) {
        this.duplicateFrom = data;
        this.formData = { ...formDariItem(data), part_number: '' };
      } else {
        this.formData = emptyForm();
      }

      this.dialog.form = true;
    },

    confirmDelete(item: StoMasterItem): void {
      this.deleteTarget = item;
      this.dialog.delete = true;
    },

    openDetail(item: StoMasterItem): void {
      this.detail = item;
      this.dialog.detail = true;
    },

    resetForm(): void {
      this.formData = emptyForm();
      this.editId = null;
      this.duplicateFrom = null;
      this.action = 'Create';
    },

    /**
     * Tombol Logout pada "Diakses sebagai". Ganti identitas sekarang lewat
     * dropdown pilih-NIK pada modal PIN (dipicu ulang di sini), bukan lewat
     * halaman -- lihat catatan di StoPinModal.vue.
     */
    async keluarSto(): Promise<void> {
      if (this.isLoggingOut) return;

      try {
        this.isLoggingOut = true;
        await keluarDariStoSesi(this.nik);
      } finally {
        this.isLoggingOut = false;
      }

      this.nik = readStoAdminNik();
      await this.fetchItems();
    }
  }
});
