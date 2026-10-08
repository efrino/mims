import { defineStore } from 'pinia';
import { useNotificationStore } from '@/stores/notification';
import { useStoTagListService } from '@/services/Admin/StoTagListService';
import { useStoEventService } from '@/services/Admin/StoEventService';
import { keluarDariStoSesi, pastikanNikSto, readStoAdminNik } from '@/services/Admin/StoApi';
import { useStoReportService } from '@/services/Admin/StoReportService';
import { useStoTagOkCollector } from '@/services/Admin/StoTagOkCollector';
import { useStoCancelTagService } from '@/services/Admin/StoCancelTagService';
import { exportReportStoExcel, exportTagOkExcel, exportTagStoExcel } from '@/services/Admin/StoTagListExcel';
import type {
  StoTagListItem,
  StoTagListRow,
  StoTagListState,
  StoTagListTab,
  StoTagOkItem
} from '@/types/Admin/StoTagList';
import type { StoReportRentang } from '@/types/Admin/StoReport';

/** Jeda ketikan sebelum permintaan dikirim, supaya tidak satu request per huruf. */
const DEBOUNCE_MS = 350;

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Penanda urutan permintaan. Balasan yang datang terlambat dari ketikan lama
 * dibuang -- kalau tidak, hasil "BOL" bisa menimpa hasil "BOLT".
 */
let permintaanTerakhir = 0;

/** Penanda urutan yang sama untuk tab Tag OK, terpisah dari tab Tag STO. */
let permintaanTerakhirOk = 0;

let debounceTimerOk: ReturnType<typeof setTimeout> | null = null;

/** Batas halaman saat mengumpulkan seluruh tag STO untuk export. */
const EXPORT_LIMIT = 500;
const EXPORT_MAX_HALAMAN = 40;

const dua = (n: number) => String(n).padStart(2, '0');

const tanggalHariIni = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${dua(d.getMonth() + 1)}-${dua(d.getDate())}`;
};

const awalBulanIni = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${dua(d.getMonth() + 1)}-01`;
};

export const useStoTagListStore = defineStore('Admin STO Tag List', {
  state: (): StoTagListState => ({
    nik: readStoAdminNik(),
    tab: 'sto',
    dataTable: [],
    totalSemua: 0,
    filter: {
      q: '',
      area: '',
      id_event: null,
      batal: '',
      scan: '',
      limit: 100,
      offset: 0
    },
    areaOptions: [],
    isLoggingOut: false,
    eventOptions: [],
    isLoading: false,
    lastError: '',
    detail: null,
    dialog: {
      detail: false,
      ajukanCancel: false
    },
    ajukan: {
      sisi: 'sto',
      id: '',
      keterangan: '',
      alasan: '',
      isSubmitting: false
    },
    tagOk: {
      dataTable: [],
      summary: null,
      filter: {
        q: '',
        area: '',
        open: '',
        batal: '',
        id_event: null,
        limit: 100
      },
      areaOptions: [],
      isLoading: false,
      lastError: '',
      detail: null,
      // Tab Tag OK baru diambil saat pertama kali dibuka, bukan saat halaman
      // dimuat -- kebanyakan kunjungan cuma butuh tab Tag STO.
      sudahDimuat: false
    },
    sedangExport: null
  }),

  getters: {
    /** Masih ada baris yang cocok tapi terpotong limit. */
    adaSisa: (state): boolean => state.totalSemua > state.dataTable.length + state.filter.offset,

    halaman: (state): number => Math.floor(state.filter.offset / state.filter.limit) + 1,

    totalHalaman: (state): number => Math.max(1, Math.ceil(state.totalSemua / state.filter.limit)),

    adaFilterAktif: (state): boolean =>
      state.filter.q.trim() !== '' ||
      state.filter.area !== '' ||
      state.filter.batal !== '' ||
      state.filter.scan !== '' ||
      state.filter.id_event !== null,

    /**
     * Event yang sedang dipilih pada tab aktif. Seluruh unduhan bergantung
     * padanya -- tanpa event, cakupan datanya tidak jelas dan angkanya tidak
     * bisa dibandingkan dengan apa pun.
     */
    eventTerpilih: (state) => {
      const id = state.tab === 'ok' ? state.tagOk.filter.id_event : state.filter.id_event;

      return state.eventOptions.find((e) => e.id_event === id) ?? null;
    },

    adaFilterAktifOk: (state): boolean =>
      state.tagOk.filter.q.trim() !== '' ||
      state.tagOk.filter.area !== '' ||
      state.tagOk.filter.open !== '' ||
      state.tagOk.filter.batal !== '' ||
      state.tagOk.filter.id_event !== null
  },

  actions: {
    async fetchTags(): Promise<void> {
      const notificationStore = useNotificationStore();

      // Belum ada NIK admin aktif sama sekali -- tunggu modal pilih-NIK
      // dulu, supaya tidak memanggil backend dengan nik="".
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

        const service = useStoTagListService();

        // Seluruh baris yang cocok filter diambil sekaligus, bukan per
        // halaman: penyaringan, pengurutan, dan paginasinya sekarang
        // dikerjakan TableExcel di layar. Filter separuh-separuh justru
        // menyesatkan -- checklist kolomnya hanya akan melihat satu halaman.
        const kumpulan: StoTagListRow[] = [];
        let total = 0;
        let areaList: string[] = [];

        for (let halaman = 0; halaman < EXPORT_MAX_HALAMAN; halaman += 1) {
          const result = await service.fetchTags(this.nik, {
            ...this.filter,
            limit: EXPORT_LIMIT,
            offset: halaman * EXPORT_LIMIT
          });

          // Balasan basi dari ketikan sebelumnya -- abaikan.
          if (urutan !== permintaanTerakhir) return;

          const rows = (result.data ?? []) as StoTagListRow[];
          kumpulan.push(...rows);

          total = result.total_semua ?? kumpulan.length;

          if (Array.isArray(result.area_list) && result.area_list.length > 0) {
            areaList = result.area_list;
          }

          if (rows.length < EXPORT_LIMIT || kumpulan.length >= total) break;
        }

        this.dataTable = kumpulan;
        this.totalSemua = total;
        this.filter.offset = 0;

        if (areaList.length > 0) {
          this.areaOptions = areaList;
        }
      } catch (error) {
        if (urutan !== permintaanTerakhir) return;

        const errorMessage = error instanceof Error ? error.message : 'Gagal memuat daftar tag STO';
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
        void this.fetchTags();
      }, DEBOUNCE_MS);
    },

    /** Filter yang bukan ketikan (dropdown) -- langsung, tanpa jeda. */
    terapkanFilter(): void {
      if (debounceTimer !== null) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }

      this.filter.offset = 0;
      void this.fetchTags();
    },

    resetFilter(): void {
      this.filter.q = '';
      this.filter.area = '';
      this.filter.batal = '';
      this.filter.scan = '';
      this.filter.id_event = null;
      this.terapkanFilter();
    },

    /**
     * Isi dropdown event. Lewat gerbang admin, jadi kegagalan di sini (mis.
     * NIK aktif bukan admin) sengaja tidak memunculkan dialog error -- daftar
     * tag sendiri tetap bisa dibaca NIK non-admin.
     */
    async muatPilihan(): Promise<void> {
      try {
        const events = await useStoEventService().fetchList();
        this.eventOptions = events.map((e) => ({
          id_event: e.id_event,
          event_name: e.event_name,
          status: e.status,
          start_date: e.start_date,
          end_date: e.end_date
        }));
      } catch {
        this.eventOptions = [];
      }
    },

    /**
     * Pindah tab. Tag OK diambil saat pertama kali dibuka saja; setelahnya
     * pemakai yang meminta lewat filter atau tombol muat ulang.
     */
    gantiTab(tab: StoTagListTab): void {
      this.tab = tab;

      if (tab === 'ok' && !this.tagOk.sudahDimuat) {
        void this.fetchTagOk();
      }
    },

    async fetchTagOk(): Promise<void> {
      const notificationStore = useNotificationStore();

      if (!this.nik) {
        this.tagOk.lastError = 'NIK belum diisi. Daftar tag OK hanya bisa dibaca NIK yang terdaftar di majsf_sto.';
        this.tagOk.dataTable = [];
        this.tagOk.summary = null;
        return;
      }

      const urutan = ++permintaanTerakhirOk;

      try {
        this.tagOk.isLoading = true;
        this.tagOk.lastError = '';

        // Ringkasan tetap dibaca dari satu permintaan biasa -- angkanya
        // dihitung backend atas seluruh data, bukan atas baris yang terkirim.
        const ringkas = await useStoTagListService().fetchTagOk(this.nik, { ...this.tagOk.filter, limit: 1 });

        // Barisnya lewat pengumpul, yang menyiasati batas 500 baris tanpa
        // offset pada tag-ok-list.
        const hasil = await useStoTagOkCollector().kumpulkanSemua(this.nik, this.tagOk.filter);

        if (urutan !== permintaanTerakhirOk) return;

        this.tagOk.dataTable = hasil.rows;
        this.tagOk.summary = ringkas.summary ?? null;
        this.tagOk.sudahDimuat = true;

        // tag-ok-list tidak mengirim area_list, jadi pilihannya diturunkan
        // dari baris yang terbaca. Sengaja ditumpuk, bukan diganti: menyaring
        // satu area tidak boleh membuat area lain hilang dari dropdown.
        const gabungan = new Set([...this.tagOk.areaOptions, ...this.tagOk.dataTable.map((r) => r.area).filter(Boolean)]);
        this.tagOk.areaOptions = [...gabungan].sort();
      } catch (error) {
        if (urutan !== permintaanTerakhirOk) return;

        const errorMessage = error instanceof Error ? error.message : 'Gagal memuat daftar tag OK';
        this.tagOk.lastError = errorMessage;
        this.tagOk.dataTable = [];
        this.tagOk.summary = null;
        notificationStore.showDialogError('Gagal Memuat Data', errorMessage);
      } finally {
        if (urutan === permintaanTerakhirOk) this.tagOk.isLoading = false;
      }
    },

    cariBertahapOk(): void {
      if (debounceTimerOk !== null) clearTimeout(debounceTimerOk);

      debounceTimerOk = setTimeout(() => {
        debounceTimerOk = null;
        void this.fetchTagOk();
      }, DEBOUNCE_MS);
    },

    terapkanFilterOk(): void {
      if (debounceTimerOk !== null) {
        clearTimeout(debounceTimerOk);
        debounceTimerOk = null;
      }

      void this.fetchTagOk();
    },

    resetFilterOk(): void {
      this.tagOk.filter.q = '';
      this.tagOk.filter.area = '';
      this.tagOk.filter.open = '';
      this.tagOk.filter.batal = '';
      this.tagOk.filter.id_event = null;
      this.terapkanFilterOk();
    },

    /**
     * Rentang tanggal Report STO.
     *
     * summary-part dan summary-tag-ok-part menyaring per tanggal, bukan per
     * id_event, jadi event yang dipilih di filter diterjemahkan dulu jadi
     * rentangnya. Urutan sumber: event pada filter tab yang sedang dibuka,
     * lalu event yang sedang berjalan, terakhir bulan berjalan.
     *
     * `end_date` event yang masih berjalan bernilai null -- dipakai hari ini,
     * bukan dikosongkan, sebab endpointnya mewajibkan kedua tanggal.
     */
    rentangReport(): StoReportRentang {
      const event = this.eventTerpilih;

      if (event && event.start_date) {
        return {
          start_date: event.start_date,
          end_date: event.end_date || tanggalHariIni(),
          event_name: event.event_name
        };
      }

      return { start_date: awalBulanIni(), end_date: tanggalHariIni(), event_name: '' };
    },

    /**
     * Penjaga bersama ketiga tombol unduh. Mengembalikan false berarti sudah
     * ada peringatan yang tampil, jadi pemanggil tinggal berhenti.
     */
    pastikanEventDipilih(): boolean {
      if (this.eventTerpilih) return true;

      useNotificationStore().showAlertWarning('Pilih event dulu pada filter sebelum mengunduh. Unduhan tanpa event tidak diizinkan.');

      return false;
    },

    /** Keterangan filter yang ikut tercetak di kepala berkas Excel. */
    metaFilterSto(): { label: string; isi: string }[] {
      const f = this.filter;
      const event = this.eventOptions.find((e) => e.id_event === f.id_event);
      const batal: Record<string, string> = { '0': 'Normal', '1': 'Dibatalkan', '2': 'Diajukan batal' };
      const scan: Record<string, string> = { sudah: 'Sudah discan', belum: 'Belum discan' };

      return [
        { label: 'Diakses Sebagai', isi: this.nik },
        { label: 'Event', isi: event ? event.event_name : 'Semua event' },
        { label: 'Area', isi: f.area || 'Semua area' },
        { label: 'Status', isi: batal[f.batal] || 'Semua status' },
        { label: 'Scan', isi: scan[f.scan] || 'Semua scan' },
        { label: 'Pencarian', isi: f.q.trim() || '-' }
      ];
    },

    metaFilterOk(): { label: string; isi: string }[] {
      const f = this.tagOk.filter;
      const event = this.eventOptions.find((e) => e.id_event === f.id_event);
      const batal: Record<string, string> = { '0': 'Normal', '1': 'Dibatalkan', '2': 'Diajukan batal' };
      const open: Record<string, string> = { '1': 'Belum discan', '0': 'Sudah discan' };

      return [
        { label: 'Diakses Sebagai', isi: this.nik },
        { label: 'Event', isi: event ? event.event_name : 'Semua event' },
        { label: 'Area', isi: f.area || 'Semua area' },
        { label: 'Scan', isi: open[f.open] || 'Semua scan' },
        { label: 'Status', isi: batal[f.batal] || 'Semua status' },
        { label: 'Pencarian', isi: f.q.trim() || '-' }
      ];
    },

    /**
     * Export tab Tag STO -- SELURUH baris yang cocok filter, bukan hanya
     * halaman yang sedang tampil. tag-list menerima offset, jadi dikumpulkan
     * per 500 baris sampai habis, dengan batas halaman sebagai pengaman kalau
     * total_semua ternyata tidak menyusut.
     */
    async exportTagSto(): Promise<void> {
      const notificationStore = useNotificationStore();

      if (this.sedangExport) return;
      if (!this.pastikanEventDipilih()) return;

      try {
        this.sedangExport = 'sto';

        const service = useStoTagListService();
        const kumpulan: StoTagListRow[] = [];
        let offset = 0;

        for (let halaman = 0; halaman < EXPORT_MAX_HALAMAN; halaman += 1) {
          const hasil = await service.fetchTags(this.nik, { ...this.filter, limit: EXPORT_LIMIT, offset });
          const baris = (hasil.data ?? []) as StoTagListRow[];

          kumpulan.push(...baris);

          if (baris.length < EXPORT_LIMIT || kumpulan.length >= (hasil.total_semua ?? kumpulan.length)) break;

          offset += EXPORT_LIMIT;
        }

        // Tag yang sudah dibatalkan tidak ikut diunduh. Kecuali admin memang
        // sedang menyaring status tertentu -- di situ permintaannya jelas dan
        // tidak boleh ditimpa.
        const saringBatal = this.filter.batal === '';
        const baris = saringBatal ? kumpulan.filter((r) => r.is_canceled !== 1) : kumpulan;

        await exportTagStoExcel(baris, [
          ...this.metaFilterSto(),
          { label: 'Tag Dibatalkan', isi: saringBatal ? 'Tidak diikutkan' : 'Mengikuti filter status' },
          { label: 'Jumlah Baris', isi: `${baris.length} tag` }
        ]);

        notificationStore.showAlertSuccess(`${baris.length} tag STO berhasil diunduh.`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Gagal mengunduh daftar tag STO';
        notificationStore.showDialogError('Gagal Mengunduh', errorMessage);
      } finally {
        this.sedangExport = null;
      }
    },

    /**
     * Export tab Tag OK -- SELURUH baris di database yang cocok filter, bukan
     * sebanyak batas baris yang sedang tampil di layar. Batas 500 baris pada
     * tag-ok-list disiasati StoTagOkCollector dengan memecah pertanyaannya.
     */
    async exportTagOk(): Promise<void> {
      const notificationStore = useNotificationStore();

      if (this.sedangExport) return;
      if (!this.pastikanEventDipilih()) return;

      try {
        this.sedangExport = 'ok';

        const saringBatal = this.tagOk.filter.batal === '';

        // Tag batal dibuang di backend supaya tidak ikut terangkut sia-sia,
        // kecuali admin memang sedang menyaring status tertentu.
        const hasil = await useStoTagOkCollector().kumpulkanSemua(this.nik, {
          ...this.tagOk.filter,
          batal: saringBatal ? '0' : this.tagOk.filter.batal
        });

        await exportTagOkExcel(hasil.rows, [
          ...this.metaFilterOk(),
          { label: 'Cakupan', isi: 'Seluruh baris di database yang cocok filter, bukan batas baris di layar' },
          { label: 'Tag Dibatalkan', isi: saringBatal ? 'Tidak diikutkan' : 'Mengikuti filter status' },
          { label: 'Jumlah Baris', isi: `${hasil.rows.length} tag OK` }
        ]);

        if (hasil.lengkap) {
          notificationStore.showAlertSuccess(`${hasil.rows.length} tag OK berhasil diunduh.`);
        } else {
          notificationStore.showAlertWarning(
            `${hasil.rows.length} tag OK diunduh, tapi ada potongan yang masih menyentuh batas 500 baris backend. Persempit filter untuk memastikan tidak ada yang tertinggal.`
          );
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Gagal mengunduh daftar tag OK';
        notificationStore.showDialogError('Gagal Mengunduh', errorMessage);
      } finally {
        this.sedangExport = null;
      }
    },

    /** Report STO per part number -- gabungan rekap tag STO dan tag OK. */
    async exportReport(): Promise<void> {
      const notificationStore = useNotificationStore();

      if (this.sedangExport) return;
      if (!this.pastikanEventDipilih()) return;

      try {
        this.sedangExport = 'report';

        const rentang = this.rentangReport();
        const idEvent = this.eventTerpilih?.id_event as number;
        const hasil = await useStoReportService().buildReport(this.nik, idEvent);

        await exportReportStoExcel(hasil.rows, [
          { label: 'Diakses Sebagai', isi: this.nik },
          { label: 'Event', isi: rentang.event_name },
          { label: 'Periode', isi: `${rentang.start_date} s/d ${rentang.end_date}` },
          { label: 'Tag Dibatalkan', isi: 'Tidak diikutkan' },
          { label: 'Cakupan', isi: 'Seluruh tag STO dan tag OK milik event di atas' },
          { label: 'Jumlah Baris', isi: `${hasil.rows.length} part` }
        ]);

        if (hasil.lengkap) {
          notificationStore.showAlertSuccess(`Report STO berisi ${hasil.rows.length} baris berhasil diunduh.`);
        } else {
          notificationStore.showAlertWarning(
            `Report STO berisi ${hasil.rows.length} baris, tapi pengumpulan tag OK masih menyentuh batas 500 baris backend pada sebagian potongan.`
          );
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Gagal menyusun Report STO';
        notificationStore.showDialogError('Gagal Mengunduh', errorMessage);
      } finally {
        this.sedangExport = null;
      }
    },

    openDetailOk(item: StoTagOkItem): void {
      this.tagOk.detail = item;
      // Satu modal dipakai bergantian, jadi isi tab sebelah dikosongkan
      // supaya tidak ada dua sumber yang sama-sama terisi.
      this.detail = null;
      this.dialog.detail = true;
    },

    openDetail(item: StoTagListItem): void {
      this.detail = item;
      this.tagOk.detail = null;
      this.dialog.detail = true;
    },

    /**
     * Buka form pengajuan pembatalan dari kolom aksi.
     *
     * Mengajukan, bukan membatalkan: tag baru benar-benar batal setelah admin
     * memutuskannya di halaman Cancel Tag. Alasannya wajib -- itu satu-satunya
     * keterangan yang dibaca admin saat memutuskan.
     */
    bukaAjukanCancel(sisi: 'sto' | 'ok', id: string, keterangan: string): void {
      this.ajukan = { sisi, id, keterangan, alasan: '', isSubmitting: false };
      this.dialog.ajukanCancel = true;
    },

    async kirimAjukanCancel(): Promise<void> {
      const notificationStore = useNotificationStore();
      const alasan = this.ajukan.alasan.trim();

      if (alasan === '') {
        notificationStore.showAlertWarning('Alasan pembatalan wajib diisi.');
        return;
      }

      try {
        this.ajukan.isSubmitting = true;

        const service = useStoCancelTagService();

        if (this.ajukan.sisi === 'ok') {
          await service.ajukanCancelOk(this.nik, this.ajukan.id, alasan);
        } else {
          await service.ajukanCancel(this.nik, this.ajukan.id, alasan);
        }

        this.dialog.ajukanCancel = false;

        // Baris yang baru diajukan berubah statusnya jadi "diajukan batal",
        // jadi daftarnya dimuat ulang supaya layarnya tidak basi.
        if (this.ajukan.sisi === 'ok') {
          await this.fetchTagOk();
        } else {
          await this.fetchTags();
        }

        notificationStore.showDialogSuccess(
          'Berhasil',
          `Pembatalan ${this.ajukan.id} berhasil diajukan. Menunggu keputusan admin di halaman Cancel Tag.`
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Gagal mengajukan pembatalan';
        notificationStore.showDialogError('Gagal Mengajukan', errorMessage);
      } finally {
        this.ajukan.isSubmitting = false;
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
        await keluarDariStoSesi(this.nik);
      } finally {
        this.isLoggingOut = false;
      }

      this.nik = readStoAdminNik();
      this.terapkanFilter();
      if (this.tagOk.sudahDimuat) this.terapkanFilterOk();
    }
  }
});
