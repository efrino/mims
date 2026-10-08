import { defineStore } from 'pinia';
import { useNotificationStore } from '@/stores/notification';
import { useStoEventService } from '@/services/Admin/StoEventService';
import { useStoManageUserService } from '@/services/Admin/StoManageUserService';
import { keluarDariStoSesi, pastikanNikSto, readStoAdminNik } from '@/services/Admin/StoApi';
import type { StoEventState, StoEventListItem, StoEventFormData } from '@/types/Admin/StoEvent';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();

export const useStoEventStore = defineStore('Admin STO Event', {
  state: (): StoEventState => ({
    nik: readStoAdminNik(),
    isLoggingOut: false,
    dataTable: [],
    currentEvent: null,
    formData: {
      event_name: '',
      start_date: '',
      end_date: null,
      allow_print: 1,
      total_tim: 2,
      tag_mode: 'both'
    },
    dialog: {
      form: false,
      delete: false,
      activate: false,
      close: false,
      resetOperator: false
    },
    action: 'Create',
    editId: null,
    deleteData: {
      id_event: null,
      event_name: ''
    },
    actionTarget: null,
    isDeleting: false,
    isSaving: false,
    isActivating: false,
    isClosing: false,
    editStatus: 0,
    permissions: {
      create: authStore.checkAccess("Module.Create.STOEvent"),
      update: authStore.checkAccess("Module.Update.STOEvent"),
    },
  }),

  getters: {
    /**
     * Izin cetak hanya bisa dibuka pada event yang berjalan.
     *
     * Event baru selalu lahir tidak aktif (backend memakai DEFAULT status 0),
     * dan event yang sudah ditutup pun tidak boleh dibuka pencetakannya --
     * tag yang lahir di luar event aktif tidak punya tempat berpijak.
     * Backend memaksakan aturan yang sama; ini hanya supaya layarnya jujur.
     */
    izinCetakTerkunci: (state): boolean => state.action === 'Create' || state.editStatus !== 1,

    totalEventAktif: (state): number => state.dataTable.filter((e) => e.status === 1).length,

    /** Jumlah tag yang pernah tercetak dari seluruh event, dijumlah dari kolom event-list. */
    totalTagSemua: (state): number => state.dataTable.reduce((jumlah, e) => jumlah + (e.total_tag || 0), 0)
  },

  actions: {
    async fetchAll(): Promise<void> {
      const notificationStore = useNotificationStore();

      // Belum ada NIK admin aktif sama sekali -- tunggu modal pilih-NIK
      // dulu. StoEventService membaca readStoAdminNik() sendiri di tiap
      // panggilan, tapi itu tidak menunggu apa pun -- tanpa ini, permintaan
      // pertama bisa terlanjur berangkat dengan nik="" sebelum gerbang rute
      // sempat menanganinya.
      try {
        this.nik = await pastikanNikSto();
      } catch (error) {
        notificationStore.showDialogError('Gagal Memuat Data', error instanceof Error ? error.message : 'NIK admin tidak tersedia.');
        return;
      }

      try {
        notificationStore.loading = true;
        const service = useStoEventService();
        const [current, list] = await Promise.all([service.fetchCurrent(), service.fetchList()]);
        this.currentEvent = current;
        this.dataTable = list;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Gagal memuat data STO Event';
        notificationStore.showDialogError('Gagal Memuat Data', errorMessage);
      } finally {
        notificationStore.loading = false;
      }
    },

    /**
     * Tombol Save pada form.
     *
     * Membuat event baru punya efek samping yang tidak kelihatan dari form --
     * hak akses seluruh operator ikut dikosongkan -- jadi ditahan dulu di
     * dialog konfirmasi. Mengedit event yang sudah ada tidak menyentuh user
     * mana pun, jadi langsung jalan.
     */
    mintaSimpan(): void {
      if (this.action === 'Create') {
        this.dialog.resetOperator = true;

        return;
      }

      void this.onSaveEvent();
    },

    async onSaveEvent(): Promise<void> {
      const notificationStore = useNotificationStore();
      const currentAction = this.action;

      try {
        this.isSaving = true;
        const service = useStoEventService();

        const result =
          currentAction === 'Edit' && this.editId
            ? await service.updateEvent(this.editId, this.formData)
            : await service.createEvent(this.formData);

        // Event baru berarti pembagian tugas diulang dari nol. Dijalankan
        // setelah event benar-benar tersimpan supaya hak akses tidak
        // terlanjur hilang kalau penyimpanannya gagal.
        let ringkasanReset = '';

        if (currentAction === 'Create') {
          const reset = await useStoManageUserService().resetAksesOperator(readStoAdminNik());

          ringkasanReset = `\n\nHak akses ${reset.berhasil} dari ${reset.total} akun operator dikosongkan.`;

          if (reset.gagal.length > 0) {
            ringkasanReset += ` Gagal pada: ${reset.gagal.join(', ')}.`;
          }
        }

        await this.fetchAll();

        this.dialog.form = false;
        this.dialog.resetOperator = false;
        this.resetForm();

        const label = currentAction === 'Edit' ? 'diperbarui' : 'ditambahkan';
        // Backend bisa menyertakan peringatan yang tidak menggagalkan simpan
        // (mis. end_date lebih awal dari start_date) -- jangan ditelan.
        const warnings = Array.isArray(result?.warnings) && result.warnings.length > 0 ? `\n\n${result.warnings.join('\n')}` : '';
        notificationStore.showDialogSuccess('Berhasil', `STO Event berhasil ${label}${ringkasanReset}${warnings}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Gagal menyimpan STO Event';
        notificationStore.showDialogError('Gagal Menyimpan', errorMessage);
      } finally {
        this.isSaving = false;
      }
    },

    async activateEvent(): Promise<void> {
      const notificationStore = useNotificationStore();
      if (!this.actionTarget) return;

      try {
        this.isActivating = true;
        const service = useStoEventService();
        await service.activateEvent(this.actionTarget.id_event);

        await this.fetchAll();

        this.dialog.activate = false;
        this.actionTarget = null;

        notificationStore.showDialogSuccess('Berhasil', 'STO Event berhasil diaktifkan');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Gagal mengaktifkan STO Event';
        notificationStore.showDialogError('Gagal Mengaktifkan', errorMessage);
      } finally {
        this.isActivating = false;
      }
    },

    async closeEvent(): Promise<void> {
      const notificationStore = useNotificationStore();
      if (!this.actionTarget) return;

      try {
        this.isClosing = true;
        const service = useStoEventService();
        await service.closeEvent(this.actionTarget.id_event);

        await this.fetchAll();

        this.dialog.close = false;
        this.actionTarget = null;

        notificationStore.showDialogSuccess('Berhasil', 'STO Event berhasil ditutup');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Gagal menutup STO Event';
        notificationStore.showDialogError('Gagal Menutup', errorMessage);
      } finally {
        this.isClosing = false;
      }
    },

    /**
     * Hapus event. Panggilan pertama tanpa `force`; backend menahannya
     * selama masih ada tag yang menempel dan membalas status "confirm" --
     * penghapusan baru dijalankan setelah admin menegaskan.
     */
    async deleteEvent(force: unknown = false): Promise<void> {
      const notificationStore = useNotificationStore();
      const idEvent = this.deleteData.id_event;

      // Dipanggil langsung dari @click, jadi argumennya bisa berupa
      // MouseEvent -- hanya `true` eksplisit yang dianggap force.
      const forced = force === true;

      try {
        this.isDeleting = true;

        if (!idEvent) {
          throw new Error('Tidak ada data yang dipilih untuk dihapus');
        }

        const service = useStoEventService();
        const result = await service.deleteEvent(idEvent, forced);

        if (result.status === 'confirm') {
          notificationStore.showConfirm('Konfirmasi Hapus', result.message, () => {
            void this.deleteEvent(true);
          });
          return;
        }

        await this.fetchAll();

        this.dialog.delete = false;
        this.resetDeleteData();

        notificationStore.showDialogSuccess('Berhasil', result.message || 'STO Event berhasil dihapus');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Gagal menghapus STO Event';
        notificationStore.showDialogError('Gagal Menghapus', errorMessage);
      } finally {
        this.isDeleting = false;
      }
    },

    loadFormEvent(action: 'Create' | 'Edit', data?: Partial<StoEventListItem>): void {
      this.action = action;

      if (action === 'Edit' && data) {
        this.editId = data.id_event ?? null;
        this.formData = {
          event_name: data.event_name || '',
          start_date: data.start_date || '',
          end_date: data.end_date ?? null,
          allow_print: data.allow_print ?? 1,
          total_tim: data.total_tim ?? 2,
          tag_mode: data.tag_mode ?? 'both'
        };
        this.editStatus = (data.status === 1 ? 1 : 0) as 0 | 1;
      } else {
        this.resetForm();
        // Event baru selalu lahir tidak aktif, jadi izin cetaknya terkunci.
        this.formData.allow_print = 0;
      }

      this.dialog.form = true;
    },

    confirmDelete(item: StoEventListItem): void {
      this.deleteData = { id_event: item.id_event, event_name: item.event_name };
      this.dialog.delete = true;
    },

    confirmActivate(item: StoEventListItem): void {
      this.actionTarget = item;
      this.dialog.activate = true;
    },

    confirmClose(item: StoEventListItem): void {
      this.actionTarget = item;
      this.dialog.close = true;
    },

    /**
     * Satu pintu untuk seluruh field form. `allow_print` dan `total_tim`
     * bertipe angka, sisanya teks -- jadi nilainya dilewatkan apa adanya dan
     * pemanggil yang menyesuaikan tipenya.
     */
    updateFormData<K extends keyof StoEventFormData>(key: K, value: StoEventFormData[K]): void {
      this.formData[key] = value;
    },

    resetForm(): void {
      this.formData = {
        event_name: '',
        start_date: '',
        end_date: null,
        allow_print: 1,
        total_tim: 2,
        tag_mode: 'both'
      };
      this.editId = null;
      this.editStatus = 0;
      this.action = 'Create';
    },

    resetDeleteData(): void {
      this.deleteData = {
        id_event: null,
        event_name: ''
      };
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
      await this.fetchAll();
    }
  }
});
