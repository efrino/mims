import { defineStore } from 'pinia';
import { useNotificationStore } from '@/stores/notification';
import { useAuthStore } from '@/stores/auth';
import { useStoCancelTagService } from '@/services/Admin/StoCancelTagService';
import { useStoTagListService } from '@/services/Admin/StoTagListService';
import { useStoEventService } from '@/services/Admin/StoEventService';
import { keluarDariStoSesi, pastikanNikSto, readStoAdminNik } from '@/services/Admin/StoApi';
import type { StoCancelTab, StoCancelTagState, StoDecisionType, StoTagRow } from '@/types/Admin/StoCancelTag';
import type { StoTagOkRow } from '@/types/Admin/StoTagList';

export const useStoCancelTagStore = defineStore('Admin STO Cancel Tag', {
  state: (): StoCancelTagState => {
    const authStore = useAuthStore();

    return {
      adminNik: readStoAdminNik(),
      isLoggingOut: false,
      tab: 'requests',

      requests: [],
      requestArea: '',
      requestEvent: null,
      requestLimit: 100,
      isLoadingRequests: false,

      requestsOk: [],
      requestAreaOk: '',
      requestEventOk: null,
      isLoadingRequestsOk: false,
      selectedOk: [],

      selected: [],

      decisionType: null,
      decisionIds: [],
      decisionTarget: null,
      decisionScope: 'sto',
      isDeciding: false,
      decisionProgress: 0,
      decisionResult: null,

      detail: null,
      isLoadingDetail: false,

      areaCancel: {
        area: '',
        idEvent: null,
        ringkasan: null,
        contoh: [],
        konfirmasi: '',
        isLoadingPreview: false,
        isCanceling: false,
        hasil: null
      },
      areaCancelOk: {
        area: '',
        idEvent: null,
        ringkasan: null,
        contoh: [],
        konfirmasi: '',
        isLoadingPreview: false,
        isCanceling: false,
        hasil: null
      },
      areaOptions: [],
      eventOptions: [],

      dialog: {
        decision: false,
        detail: false,
        result: false,
        areaConfirm: false,
        areaResult: false
      },
      lastError: '',
      permissions: {
        approve: authStore.checkAccess('Module.Update.STOCancelTag')
      }
    };
  },

  getters: {
    totalRequest: (state): number => state.requests.length,

    allSelected: (state): boolean => state.requests.length > 0 && state.selected.length === state.requests.length,

    someSelected: (state): boolean => state.selected.length > 0,

    /**
     * Tombol pembatalan massal hanya hidup kalau ketikannya sama persis
     * dengan nama area. Dibandingkan case-insensitive karena kolom area
     * sendiri bercollation ci -- yang dijaga di sini adalah kesengajaan,
     * bukan huruf besar-kecilnya.
     */
    areaConfirmed: (state): boolean => {
      const area = state.areaCancel.area.trim();
      return area !== '' && state.areaCancel.konfirmasi.trim().toLowerCase() === area.toLowerCase();
    },

    /** Tidak ada yang berubah -- tombolnya tidak perlu dinyalakan. */
    areaTidakAdaYangDibatalkan: (state): boolean =>
      state.areaCancel.ringkasan !== null && state.areaCancel.ringkasan.akan_dibatalkan === 0,

    totalRequestOk: (state): number => state.requestsOk.length,

    allSelectedOk: (state): boolean =>
      state.requestsOk.length > 0 && state.selectedOk.length === state.requestsOk.length,

    someSelectedOk: (state): boolean => state.selectedOk.length > 0,

    areaOkConfirmed: (state): boolean => {
      const area = state.areaCancelOk.area.trim();
      return area !== '' && state.areaCancelOk.konfirmasi.trim().toLowerCase() === area.toLowerCase();
    },

    areaOkTidakAdaYangDibatalkan: (state): boolean =>
      state.areaCancelOk.ringkasan !== null && state.areaCancelOk.ringkasan.akan_dibatalkan === 0
  },

  actions: {
    async fetchRequests(): Promise<void> {
      const notificationStore = useNotificationStore();

      // Belum ada NIK admin aktif sama sekali -- tunggu modal pilih-NIK
      // dulu, supaya tidak memanggil backend dengan nik="".
      try {
        this.adminNik = await pastikanNikSto();
      } catch (error) {
        this.lastError = error instanceof Error ? error.message : 'NIK admin tidak tersedia.';
        this.requests = [];
        return;
      }

      try {
        this.isLoadingRequests = true;
        this.lastError = '';

        const service = useStoCancelTagService();
        const rows = await service.fetchCancelRequests(this.adminNik, {
          area: this.requestArea,
          id_event: this.requestEvent,
          limit: this.requestLimit
        });
        this.requests = rows as StoTagRow[];

        // Buang centang yang pengajuannya sudah tidak ada lagi di daftar.
        const ada = new Set(this.requests.map((r) => r.id_tag));
        this.selected = this.selected.filter((id) => ada.has(id));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Gagal memuat pengajuan pembatalan';
        this.lastError = errorMessage;
        this.requests = [];
        this.selected = [];
        notificationStore.showDialogError('Gagal Memuat Data', errorMessage);
      } finally {
        this.isLoadingRequests = false;
      }
    },

    // ── Seleksi baris ────────────────────────────────────────────────
    toggleSelect(idTag: string): void {
      this.selected = this.selected.includes(idTag) ? this.selected.filter((id) => id !== idTag) : [...this.selected, idTag];
    },

    toggleSelectAll(): void {
      this.selected = this.allSelected ? [] : this.requests.map((r) => r.id_tag);
    },

    clearSelection(): void {
      this.selected = [];
    },

    // ── Keputusan ────────────────────────────────────────────────────
    /** Acc / tolak satu baris. */
    confirmDecision(item: StoTagRow, type: StoDecisionType): void {
      this.decisionTarget = item;
      this.decisionScope = 'sto';
      this.decisionIds = [item.id_tag];
      this.decisionType = type;
      this.dialog.decision = true;
    },

    /** Acc / tolak seluruh baris yang tercentang. */
    confirmBulkDecision(type: StoDecisionType): void {
      const notificationStore = useNotificationStore();

      if (this.selected.length === 0) {
        notificationStore.showAlertWarning('Pilih minimal satu baris pengajuan.');
        return;
      }

      this.decisionTarget = null;
      this.decisionScope = 'sto';
      this.decisionIds = [...this.selected];
      this.decisionType = type;
      this.dialog.decision = true;
    },

    /**
     * Kirim keputusan. cancel-approve / cancel-reject hanya menerima satu
     * id_tag per request, jadi keputusan massal dikirim berurutan dan tag
     * yang gagal dikumpulkan -- sisanya tetap diproses.
     */
    async submitDecision(): Promise<void> {
      const notificationStore = useNotificationStore();
      const type = this.decisionType;
      const ids = [...this.decisionIds];

      if (!type || ids.length === 0) return;

      const berhasil: string[] = [];
      const gagal: Array<{ id_tag: string; message: string }> = [];

      try {
        this.isDeciding = true;
        this.decisionProgress = 0;

        const service = useStoCancelTagService();
        const sisiOk = this.decisionScope === 'ok';

        for (const idTag of ids) {
          try {
            if (sisiOk) {
              // Tag OK memakai satu endpoint untuk kedua keputusan; yang
              // membedakan hanya isi `keputusan`.
              await service.decideCancelOk(this.adminNik, idTag, type === 'approve' ? 'setuju' : 'tolak');
            } else if (type === 'approve') {
              await service.approveCancel(this.adminNik, idTag);
            } else {
              await service.rejectCancel(this.adminNik, idTag);
            }
            berhasil.push(idTag);
          } catch (error) {
            gagal.push({ id_tag: idTag, message: error instanceof Error ? error.message : 'Gagal menyimpan keputusan' });
          }

          this.decisionProgress += 1;
        }

        if (this.decisionScope === 'ok') {
          this.selectedOk = this.selectedOk.filter((id) => !berhasil.includes(id));
          await this.fetchRequestsOk();
        } else {
          this.selected = this.selected.filter((id) => !berhasil.includes(id));
          await this.fetchRequests();
        }

        this.dialog.decision = false;
        this.resetDecision();

        const label = type === 'approve' ? 'disetujui' : 'ditolak';

        if (gagal.length === 0) {
          notificationStore.showDialogSuccess('Berhasil', `${berhasil.length} pengajuan berhasil ${label}.`);
          return;
        }

        // Ada yang gagal -- tampilkan rinciannya, jangan cuma pesan umum.
        this.decisionResult = { type, berhasil, gagal };
        this.dialog.result = true;
      } finally {
        this.isDeciding = false;
        this.decisionProgress = 0;
      }
    },

    resetDecision(): void {
      this.decisionTarget = null;
      this.decisionIds = [];
      this.decisionType = null;
      this.decisionScope = 'sto';
    },

    // ── Detail satu tag ──────────────────────────────────────────────
    async openDetail(idTag: string): Promise<void> {
      const notificationStore = useNotificationStore();

      this.detail = null;
      this.dialog.detail = true;

      try {
        this.isLoadingDetail = true;
        const service = useStoCancelTagService();
        this.detail = await service.fetchTagDetail(idTag);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Gagal memuat detail tag';
        this.dialog.detail = false;
        notificationStore.showDialogError('Gagal Memuat Detail', errorMessage);
      } finally {
        this.isLoadingDetail = false;
      }
    },

    // ── Tab 2: pembatalan massal per area ────────────────────────────

    gantiTab(tab: StoCancelTab): void {
      this.tab = tab;

      // Isi dropdown baru diambil saat tabnya benar-benar dibuka.
      if (this.areaOptions.length === 0 || this.eventOptions.length === 0) {
        void this.muatPilihanArea();
      }

      if (tab === 'requestsOk' && this.requestsOk.length === 0) {
        void this.fetchRequestsOk();
      }
    },

    /**
     * Isi dropdown area & event. Areanya diambil dari tag-list (area yang
     * benar-benar punya tag), bukan dari master_data -- area tanpa tag tidak
     * ada gunanya muncul di sini.
     *
     * Event default-nya yang sedang berjalan: membatalkan lintas event akan
     * ikut menyentuh tag milik STO periode lama.
     */
    async muatPilihanArea(): Promise<void> {
      try {
        const hasil = await useStoTagListService().fetchTags(this.adminNik, {
          q: '',
          area: '',
          id_event: null,
          batal: '',
          scan: '',
          limit: 1,
          offset: 0
        });
        this.areaOptions = Array.isArray(hasil.area_list) ? hasil.area_list : [];
      } catch {
        this.areaOptions = [];
      }

      try {
        const events = await useStoEventService().fetchList();
        this.eventOptions = events.map((e) => ({ id_event: e.id_event, event_name: e.event_name, status: e.status }));

        // Event yang sedang berjalan jadi bawaan seluruh tab: menangani
        // pengajuan lintas event nyaris selalu keliru, dan membatalkan
        // lintas event ikut menyentuh tag milik STO periode lama.
        const aktif = this.eventOptions.find((e) => e.status === 1);

        if (aktif) {
          if (this.areaCancel.idEvent === null) this.areaCancel.idEvent = aktif.id_event;
          if (this.areaCancelOk.idEvent === null) this.areaCancelOk.idEvent = aktif.id_event;

          if (this.requestEvent === null) {
            this.requestEvent = aktif.id_event;
            void this.fetchRequests();
          }

          if (this.requestEventOk === null) this.requestEventOk = aktif.id_event;
        }
      } catch {
        this.eventOptions = [];
      }
    },

    /** Hitung ulang ringkasan. Tidak mengubah apa pun di database. */
    async muatRingkasanArea(): Promise<void> {
      const notificationStore = useNotificationStore();
      const area = this.areaCancel.area.trim();

      this.areaCancel.ringkasan = null;
      this.areaCancel.contoh = [];
      this.areaCancel.konfirmasi = '';

      if (area === '') return;

      try {
        this.areaCancel.isLoadingPreview = true;

        const hasil = await useStoCancelTagService().fetchAreaPreview(this.adminNik, {
          area,
          id_event: this.areaCancel.idEvent
        });

        this.areaCancel.ringkasan = hasil.data;
        this.areaCancel.contoh = Array.isArray(hasil.contoh) ? hasil.contoh : [];
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Gagal membaca ringkasan area';
        notificationStore.showDialogError('Gagal Memuat Ringkasan', errorMessage);
      } finally {
        this.areaCancel.isLoadingPreview = false;
      }
    },

    bukaKonfirmasiArea(): void {
      const notificationStore = useNotificationStore();

      if (this.areaCancel.area.trim() === '') {
        notificationStore.showAlertWarning('Pilih area lebih dulu.');
        return;
      }

      this.areaCancel.konfirmasi = '';
      this.dialog.areaConfirm = true;
    },

    tutupKonfirmasiArea(): void {
      this.dialog.areaConfirm = false;
      this.areaCancel.konfirmasi = '';
    },

    /**
     * Jalankan pembatalan massal. Ringkasannya dimuat ulang setelah selesai
     * supaya angka di layar bukan sisa keadaan sebelum perubahan.
     */
    async submitCancelArea(): Promise<void> {
      const notificationStore = useNotificationStore();
      const area = this.areaCancel.area.trim();

      if (!this.areaConfirmed) {
        notificationStore.showAlertWarning('Ketik nama area persis seperti tertulis untuk menegaskan.');
        return;
      }

      try {
        this.areaCancel.isCanceling = true;

        const hasil = await useStoCancelTagService().cancelArea(this.adminNik, {
          area,
          id_event: this.areaCancel.idEvent
        });

        this.areaCancel.hasil = hasil;
        this.dialog.areaConfirm = false;
        this.areaCancel.konfirmasi = '';
        this.dialog.areaResult = true;

        await this.muatRingkasanArea();

        // Tag yang baru dibatalkan bisa saja termasuk yang pengajuannya
        // masih menunggu keputusan -- daftar di tab 1 ikut disegarkan.
        await this.fetchRequests();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Gagal membatalkan tag di area ini';
        notificationStore.showDialogError('Gagal Membatalkan', errorMessage);
      } finally {
        this.areaCancel.isCanceling = false;
      }
    },

    // ── Tab 3: pengajuan pembatalan tag OK ───────────────────────────
    async fetchRequestsOk(): Promise<void> {
      const notificationStore = useNotificationStore();

      if (!this.adminNik) {
        this.requestsOk = [];
        return;
      }

      try {
        this.isLoadingRequestsOk = true;

        const rows = await useStoCancelTagService().fetchCancelRequestsOk(this.adminNik, {
          area: this.requestAreaOk,
          id_event: this.requestEventOk,
          limit: 500
        });
        this.requestsOk = rows as StoTagOkRow[];

        const ada = new Set(this.requestsOk.map((r) => r.id_tag_ok));
        this.selectedOk = this.selectedOk.filter((id) => ada.has(id));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Gagal memuat pengajuan pembatalan tag OK';
        this.requestsOk = [];
        this.selectedOk = [];
        notificationStore.showDialogError('Gagal Memuat Data', errorMessage);
      } finally {
        this.isLoadingRequestsOk = false;
      }
    },

    toggleSelectOk(idTagOk: string): void {
      this.selectedOk = this.selectedOk.includes(idTagOk)
        ? this.selectedOk.filter((id) => id !== idTagOk)
        : [...this.selectedOk, idTagOk];
    },

    toggleSelectAllOk(): void {
      this.selectedOk = this.allSelectedOk ? [] : this.requestsOk.map((r) => r.id_tag_ok);
    },

    clearSelectionOk(): void {
      this.selectedOk = [];
    },

    confirmDecisionOk(idTagOk: string, type: StoDecisionType): void {
      this.decisionTarget = null;
      this.decisionScope = 'ok';
      this.decisionIds = [idTagOk];
      this.decisionType = type;
      this.dialog.decision = true;
    },

    confirmBulkDecisionOk(type: StoDecisionType): void {
      const notificationStore = useNotificationStore();

      if (this.selectedOk.length === 0) {
        notificationStore.showAlertWarning('Pilih minimal satu baris pengajuan.');
        return;
      }

      this.decisionTarget = null;
      this.decisionScope = 'ok';
      this.decisionIds = [...this.selectedOk];
      this.decisionType = type;
      this.dialog.decision = true;
    },

    // ── Tab 4: pembatalan massal tag OK per area ─────────────────────
    async muatRingkasanAreaOk(): Promise<void> {
      const notificationStore = useNotificationStore();
      const area = this.areaCancelOk.area.trim();

      this.areaCancelOk.ringkasan = null;
      this.areaCancelOk.contoh = [];
      this.areaCancelOk.konfirmasi = '';

      if (area === '') return;

      try {
        this.areaCancelOk.isLoadingPreview = true;

        const hasil = await useStoCancelTagService().fetchAreaPreviewOk(this.adminNik, {
          area,
          id_event: this.areaCancelOk.idEvent
        });

        this.areaCancelOk.ringkasan = hasil.data;
        this.areaCancelOk.contoh = Array.isArray(hasil.contoh) ? hasil.contoh : [];
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Gagal membaca ringkasan area tag OK';
        notificationStore.showDialogError('Gagal Memuat Ringkasan', errorMessage);
      } finally {
        this.areaCancelOk.isLoadingPreview = false;
      }
    },

    bukaKonfirmasiAreaOk(): void {
      const notificationStore = useNotificationStore();

      if (this.areaCancelOk.area.trim() === '') {
        notificationStore.showAlertWarning('Pilih area lebih dulu.');
        return;
      }

      this.areaCancelOk.konfirmasi = '';
      this.dialog.areaConfirm = true;
    },

    async submitCancelAreaOk(): Promise<void> {
      const notificationStore = useNotificationStore();
      const area = this.areaCancelOk.area.trim();

      if (!this.areaOkConfirmed) {
        notificationStore.showAlertWarning('Ketik nama area persis seperti tertulis untuk menegaskan.');
        return;
      }

      try {
        this.areaCancelOk.isCanceling = true;

        const hasil = await useStoCancelTagService().cancelAreaOk(this.adminNik, {
          area,
          id_event: this.areaCancelOk.idEvent
        });

        this.areaCancelOk.hasil = hasil;
        this.dialog.areaConfirm = false;
        this.areaCancelOk.konfirmasi = '';
        this.dialog.areaResult = true;

        await this.muatRingkasanAreaOk();
        await this.fetchRequestsOk();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Gagal membatalkan tag OK di area ini';
        notificationStore.showDialogError('Gagal Membatalkan', errorMessage);
      } finally {
        this.areaCancelOk.isCanceling = false;
      }
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
        await keluarDariStoSesi(this.adminNik);
      } finally {
        this.isLoggingOut = false;
      }

      this.adminNik = readStoAdminNik();

      if (this.tab === 'requestsOk') {
        await this.fetchRequestsOk();
      } else {
        await this.fetchRequests();
      }

      if (this.tab === 'area') {
        await this.muatRingkasanArea();
      } else if (this.tab === 'areaOk') {
        await this.muatRingkasanAreaOk();
      }
    }
  }
});
