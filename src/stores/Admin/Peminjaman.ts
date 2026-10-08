import { defineStore } from 'pinia';
import { useNotificationStore } from '@/stores/notification';
import { usePeminjamanService } from '@/services/Admin/PeminjamanService';
import { fetchEmployeeList } from '@/services/HRD/AttendanceService';
import type { PeminjamanState, PeminjamanItem, StokBarangItem } from '@/types/Admin/Peminjaman';

const toDateString = (date: Date): string => {
  const pad = (num: number) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const today = new Date();
const defaultDateFrom = toDateString(new Date(today.getFullYear(), today.getMonth(), 1));
const defaultDateTo = toDateString(today);

export const usePeminjamanStore = defineStore('Peminjaman Barang', {
  state: (): PeminjamanState => ({
    dataTable: [],
    employees: [],
    stokBarang: [],
    ketersediaan: [],
    detailItems: [],
    filters: {
      date_from: defaultDateFrom,
      date_to: defaultDateTo
    },
    pinjamForm: {
      nik_peminjam: '',
      nama_peminjam: '',
      departemen: '',
      keperluan: '',
      lokasi_penggunaan: '',
      petugas_serah: '',
      ket: '',
      items: []
    },
    kembaliForm: {
      no_pinjam: '',
      nama_peminjam: '',
      petugas_terima: '',
      ket: '',
      items: []
    },
    formError: '',
    dialog: {
      pinjam: false,
      kembali: false,
      detail: false
    }
  }),

  getters: {
    barangTersedia: (state): StokBarangItem[] => {
      const dipilih = state.pinjamForm.items.map((item) => item.kode_barang);
      return state.stokBarang.filter((barang) => !dipilih.includes(barang.kode_barang));
    }
  },

  actions: {
    async fetchPeminjaman(): Promise<void> {
      const notificationStore = useNotificationStore();

      try {
        notificationStore.loading = true;
        const service = usePeminjamanService();

        const [data, ketersediaan] = await Promise.all([service.fetchPeminjaman(this.filters), service.fetchKetersediaan()]);
        this.dataTable = data;
        this.ketersediaan = ketersediaan;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Gagal memuat data peminjaman';
        notificationStore.showDialogError('Gagal Memuat Data', errorMessage);
      } finally {
        notificationStore.loading = false;
      }
    },

    // Ketersediaan barang ditampilkan sejak halaman dibuka, tanpa menunggu Load Data
    async fetchKetersediaan(): Promise<void> {
      try {
        const service = usePeminjamanService();
        this.ketersediaan = await service.fetchKetersediaan();
      } catch {
        this.ketersediaan = [];
      }
    },

    async fetchStok(): Promise<void> {
      const notificationStore = useNotificationStore();

      try {
        const service = usePeminjamanService();
        this.stokBarang = await service.fetchStok();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Gagal memuat stok barang';
        notificationStore.showDialogError('Gagal Memuat Data', errorMessage);
      }
    },

    async fetchEmployees(): Promise<void> {
      const notificationStore = useNotificationStore();

      try {
        if (this.employees.length) return;
        this.employees = await fetchEmployeeList();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Gagal memuat data karyawan';
        notificationStore.showDialogError('Gagal Memuat Data', errorMessage);
      }
    },

    pilihPeminjam(nik: string): void {
      const karyawan = this.employees.find((item) => item.nik === nik);

      this.pinjamForm.nik_peminjam = nik || '';
      this.pinjamForm.nama_peminjam = karyawan ? karyawan.nama : '';
      this.pinjamForm.departemen = karyawan ? karyawan.departemen : '';
    },

    async openFormPinjam(): Promise<void> {
      this.resetPinjamForm();
      this.formError = '';
      await Promise.all([this.fetchStok(), this.fetchEmployees()]);
      this.dialog.pinjam = true;
    },

    addItemPinjam(kode_barang: string): void {
      if (!kode_barang) return;

      const barang = this.stokBarang.find((item) => item.kode_barang === kode_barang);
      if (!barang) return;

      this.pinjamForm.items.push({
        kode_barang: barang.kode_barang,
        nama_barang: barang.nama_barang,
        merk: barang.merk || '',
        nama_kategori: barang.nama_kategori || '',
        kondisi: barang.kondisi,
        lokasi: [barang.nama_area, barang.rak].filter(Boolean).join(' / ') || '-',
        lama_pinjam: 1
      });
    },

    removeItemPinjam(index: number): void {
      this.pinjamForm.items.splice(index, 1);
    },

    async onSavePinjam(): Promise<void> {
      const notificationStore = useNotificationStore();

      const kosong: string[] = [];
      if (!this.pinjamForm.nik_peminjam) kosong.push('Peminjam');
      if (!this.pinjamForm.keperluan.trim()) kosong.push('Keperluan');
      if (!this.pinjamForm.lokasi_penggunaan.trim()) kosong.push('Lokasi Penggunaan');
      if (!this.pinjamForm.petugas_serah) kosong.push('Diketahui Oleh');
      if (!this.pinjamForm.items.length) kosong.push('Barang Dipinjam');
      this.formError = kosong.length ? `${kosong.join(', ')} wajib diisi` : '';
      if (this.formError) return;

      try {
        notificationStore.loading = true;
        const service = usePeminjamanService();

        const result = await service.insertPeminjaman({
          nik_peminjam: this.pinjamForm.nik_peminjam,
          nama_peminjam: this.pinjamForm.nama_peminjam,
          departemen: this.pinjamForm.departemen,
          keperluan: this.pinjamForm.keperluan,
          lokasi_penggunaan: this.pinjamForm.lokasi_penggunaan,
          petugas_serah: this.pinjamForm.petugas_serah,
          ket: this.pinjamForm.ket,
          kode_barang: this.pinjamForm.items.map((item) => item.kode_barang),
          // Lama pinjam per barang, kosong / tidak valid dianggap 1 hari
          lama_pinjam: this.pinjamForm.items.map((item) => Math.max(1, Math.floor(Number(item.lama_pinjam)) || 1))
        });

        await this.fetchPeminjaman();

        this.dialog.pinjam = false;
        this.resetPinjamForm();

        notificationStore.showDialogSuccess('Berhasil', result.messages || 'Peminjaman berhasil dicatat');
      } catch (error) {
        this.formError = error instanceof Error ? error.message : 'Gagal menyimpan peminjaman';
      } finally {
        notificationStore.loading = false;
      }
    },

    async openFormKembali(no_pinjam: string): Promise<void> {
      const notificationStore = useNotificationStore();

      try {
        notificationStore.loading = true;
        const service = usePeminjamanService();
        const [detail] = await Promise.all([service.fetchDetail(no_pinjam), this.fetchEmployees()]);

        const belumKembali = detail.filter((item) => item.status !== 'SELESAI');
        if (!belumKembali.length) {
          notificationStore.showDialogWarning('Sudah Selesai', `Seluruh barang pada ${no_pinjam} sudah dikembalikan`);
          return;
        }

        this.kembaliForm = {
          no_pinjam,
          nama_peminjam: detail.length ? detail[0].nama_peminjam : '',
          petugas_terima: '',
          ket: '',
          // Kondisi kembali default mengikuti kondisi unit terakhir di master
          items: belumKembali.map((item) => ({
            kode_barang: item.kode_barang,
            nama_barang: item.nama_barang,
            merk: item.merk || '',
            dikembalikan: true,
            kondisi_kembali: item.kondisi || 'BAIK'
          }))
        };

        this.formError = '';
        this.dialog.kembali = true;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Gagal memuat catatan peminjaman';
        notificationStore.showDialogError('Gagal Memuat Data', errorMessage);
      } finally {
        notificationStore.loading = false;
      }
    },

    async onSaveKembali(): Promise<void> {
      const notificationStore = useNotificationStore();

      const items = this.kembaliForm.items.filter((item) => item.dikembalikan);
      const kosong: string[] = [];
      if (!items.length) kosong.push('Minimal 1 barang dicentang');
      if (!this.kembaliForm.petugas_terima) kosong.push('Diterima Oleh wajib diisi');
      this.formError = kosong.join(', ');
      if (this.formError) return;

      try {
        notificationStore.loading = true;
        const service = usePeminjamanService();

        const result = await service.prosesKembali({
          no_pinjam: this.kembaliForm.no_pinjam,
          petugas_terima: this.kembaliForm.petugas_terima,
          ket: this.kembaliForm.ket,
          kode_barang: items.map((item) => item.kode_barang),
          kondisi_kembali: items.map((item) => item.kondisi_kembali)
        });

        await this.fetchPeminjaman();

        this.dialog.kembali = false;
        this.resetKembaliForm();

        notificationStore.showDialogSuccess('Berhasil', result.messages || 'Pengembalian berhasil dicatat');
      } catch (error) {
        this.formError = error instanceof Error ? error.message : 'Gagal menyimpan pengembalian';
      } finally {
        notificationStore.loading = false;
      }
    },

    async openDetail(no_pinjam: string): Promise<void> {
      const notificationStore = useNotificationStore();

      try {
        notificationStore.loading = true;
        const service = usePeminjamanService();

        this.detailItems = await service.fetchDetail(no_pinjam);
        this.dialog.detail = true;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Gagal memuat detail peminjaman';
        notificationStore.showDialogError('Gagal Memuat Data', errorMessage);
      } finally {
        notificationStore.loading = false;
      }
    },

    setDetailItems(items: PeminjamanItem[]): void {
      this.detailItems = items;
    },

    resetPinjamForm(): void {
      this.pinjamForm = {
        nik_peminjam: '',
        nama_peminjam: '',
        departemen: '',
        keperluan: '',
        lokasi_penggunaan: '',
        petugas_serah: '',
        ket: '',
        items: []
      };
    },

    resetKembaliForm(): void {
      this.kembaliForm = {
        no_pinjam: '',
        nama_peminjam: '',
        petugas_terima: '',
        ket: '',
        items: []
      };
    },

    resetFilters(): void {
      this.filters = {
        date_from: defaultDateFrom,
        date_to: defaultDateTo
      };
    }
  }
});
