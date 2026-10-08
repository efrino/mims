import { defineStore } from 'pinia';
import { useNotificationStore } from '@/stores/notification';
import { useAuthStore } from '@/stores/auth';
import { useFolderSharingService } from '@/services/Approval/FolderSharingService';
import { exportFolderSharingExcel, LABEL_STATUS } from '@/services/Approval/FolderSharingExcel';
import type {
  FolderSharingAksi,
  FolderSharingFormData,
  FolderSharingMe,
  FolderSharingRequest,
  FolderSharingState
} from '@/types/Approval/FolderSharing';

/**
 * Isian awal form. Nama, NIK, dan departemen diambil dari `me` (data kepegawaian
 * di maj_hr_portal), dengan akun login sebagai cadangan kalau NIK-nya belum
 * terdaftar di sana. Selain administrator ketiganya dikunci di layar -- dan backend
 * tetap mengabaikan isian body-nya, jadi kunci di layar bukan satu-satunya jaminan.
 */
const emptyForm = (me: FolderSharingMe | null): FolderSharingFormData => {
  const authStore = useAuthStore();
  return {
    nama: me?.nama || authStore.user.fullname || '',
    nik: me?.nik || authStore.user.username || '',
    departemen: me?.departemen ?? '',
    departemen_tujuan: '',
    folder_path: '',
    alasan: '',
    jenis_akses: '',
    akses_sampai: ''
  };
};

/**
 * Tidak bisa dipilih sebagai departemen yang dituju. Sumber kebenarannya
 * `Folder_sharing::DEPARTEMEN_BUKAN_TUJUAN`; ini hanya untuk daftar cadangan.
 */
export const DEPARTEMEN_BUKAN_TUJUAN = ['FINANCE', 'ACCOUNTING'];

/**
 * Cadangan kalau endpoint departemen-list gagal dipanggil. Sumber kebenarannya
 * tetap `Folder_sharing::DEPARTEMEN` di backend -- di situ juga yang divalidasi.
 */
export const DEPARTEMEN_CADANGAN = [
  'LOGISTIC',
  'MARKETING SUPPORT',
  'WELDING',
  'DIE MAINTENANCE',
  'GENERAL AFFAIR',
  'STAMPING',
  'R & D, TECHNICAL CENTER',
  'DIE MANUFACTURING',
  'TOOLING JIG',
  'QUALITY CONTROL',
  'PLANT SERVICE',
  'FINANCE',
  'HRD',
  'PROCUREMENT',
  'PCD',
  'ACCOUNTING',
  'BUSSINESS OPERATION & DEVELOPMENT'
];

/**
 * Cadangan kalau `me` belum termuat: tanggal hari ini + 3 bulan menurut jam lokal,
 * dengan aturan yang sama seperti Folder_sharing::batas_akses() -- tanggal yang tidak
 * ada di bulan tujuan jatuh ke akhir bulan (30 Nov -> 28 Feb, bukan 2 Mar).
 */
const dua = (n: number) => String(n).padStart(2, '0');
const keYmd = (d: Date) => `${d.getFullYear()}-${dua(d.getMonth() + 1)}-${dua(d.getDate())}`;
export const hariIniLokal = (): string => keYmd(new Date());
export const tambahBulan = (ymd: string, bulan: number): string => {
  const [y, m, d] = ymd.split('-').map(Number);
  const akhirBulan = new Date(y, m - 1 + bulan + 1, 0).getDate();
  return keYmd(new Date(y, m - 1 + bulan, Math.min(d, akhirBulan)));
};

// Pola UNC yang sama dengan backend: \\host\share[\sub...]
export const POLA_FOLDER = /^\\\\[^\\/\s]+(\\[^\\/]+)+\\?$/;

export const useFolderSharingStore = defineStore('Approval Folder Sharing', {
  state: (): FolderSharingState => {
    const authStore = useAuthStore();

    return {
      dataTable: [],
      departemenList: [],
      departemenTujuanList: [],
      me: null,
      // Server yang menentukan cakupannya dari jabatan pemakai; nilai ini hanya
      // cerminan balasan terakhir, dipakai untuk label "Menampilkan".
      scope: 'mine',
      filter: { status: '', start_date: '', end_date: '' },
      formData: emptyForm(null),
      dialog: { form: false, detail: false, aksi: false },
      selected: null,
      aksi: null,
      catatan: '',
      isLoading: false,
      isSaving: false,
      isProcessing: false,
      isExporting: false,
      isLoadingDetail: false,
      lastError: '',
      permissions: {
        // Menu ini tanpa permission: setiap akun yang login boleh mengajukan.
        create: true,
        // Menandai akses diberikan/ditarik tidak diatur permission: administrator saja.
        // Hak menyetujui/menolak TIDAK ada di sini -- ditentukan per baris oleh
        // backend lewat `bisa_setujui` / `bisa_tolak`, sebab bergantung departemen
        // lapis itu dan statusnya.
        akses: authStore.group === '1'
      }
    };
  },

  getters: {
    /** Nama/NIK/departemen pemohon dikunci ke data akun -- semua kecuali administrator. */
    identitasTerkunci: (state): boolean => state.me?.identitas_terkunci ?? !state.permissions.akses,
    /** Batas bawah & atas tanggal akses. Dari jam server kalau `me` sudah termuat. */
    hariIni: (state): string => state.me?.hari_ini || hariIniLokal(),
    batasAkses: (state): string => state.me?.batas_akses || tambahBulan(hariIniLokal(), 3),
    /** Keterangan cakupan untuk panel "Menampilkan". */
    labelCakupan: (state): string => {
      if (state.scope === 'all') return 'Semua Permintaan';
      if (state.scope === 'dept') {
        // Bisa lebih dari satu (mis. penanggung jawab khusus BUSSINESS OPERATION & DEVELOPMENT).
        const dikelola = state.me?.departemen_dikelola?.length ? state.me.departemen_dikelola : [state.me?.departemen || '-'];
        return `Permintaan Dept. ${dikelola.join(', ')}`;
      }
      return 'Permintaan Saya';
    },
    /** Pilihan departemen tujuan: tanpa departemen pemohon sendiri. */
    pilihanTujuan: (state): string[] => state.departemenTujuanList.filter((d) => d !== state.formData.departemen),
    /** Masih di salah satu dari dua lapis persetujuan. */
    totalPending: (state): number => state.dataTable.filter((r) => r.status === 'pending' || r.status === 'pending_tujuan').length,
    /** Menunggu keputusan pemakai ini -- angka yang paling dicari approver. */
    totalPerluSaya: (state): number => state.dataTable.filter((r) => r.bisa_setujui).length,
    /** Disetujui approver tapi aksesnya belum ditandai diberikan oleh tim IT. */
    totalApproved: (state): number => state.dataTable.filter((r) => r.status === 'approved').length,
    totalRejected: (state): number => state.dataTable.filter((r) => r.status === 'rejected').length,
    /** Sudah ditandai tim IT bahwa aksesnya benar-benar diberikan di server. */
    totalAksesDiberikan: (state): number => state.dataTable.filter((r) => r.status === 'granted').length
  },

  actions: {
    async fetchAll(): Promise<void> {
      try {
        this.isLoading = true;
        this.lastError = '';

        // Identitas & jabatan cukup diambil sekali per kunjungan halaman.
        if (!this.me) {
          try {
            this.me = await useFolderSharingService().fetchMe();
          } catch {
            this.me = null;
          }
        }

        const result = await useFolderSharingService().fetchList(this.filter);
        this.dataTable = result.data;
        this.scope = result.scope ?? this.scope;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Gagal memuat daftar permintaan';
        this.lastError = message;
        this.dataTable = [];
        useNotificationStore().showDialogError('Gagal Memuat Data', message);
      } finally {
        this.isLoading = false;
      }
    },

    async loadForm(): Promise<void> {
      this.formData = emptyForm(this.me);
      this.dialog.form = true;

      // Pilihan departemen diambil dari backend supaya tidak ada dua daftar yang
      // bisa berbeda; kalau gagal, form memakai daftar cadangan di store ini.
      try {
        const { semua, tujuan } = await useFolderSharingService().fetchDepartemen();
        this.departemenList = semua;
        this.departemenTujuanList = tujuan.length ? tujuan : semua.filter((d) => !DEPARTEMEN_BUKAN_TUJUAN.includes(d));
      } catch {
        this.departemenList = [...DEPARTEMEN_CADANGAN];
        this.departemenTujuanList = DEPARTEMEN_CADANGAN.filter((d) => !DEPARTEMEN_BUKAN_TUJUAN.includes(d));
      }
    },

    validateForm(): string[] {
      const f = this.formData;
      const errors: string[] = [];
      // Saat terkunci, ketiganya diisi server dari data akun. Kalau data HR-nya belum
      // lengkap, backend yang membalas dengan pesan yang menyebut sebabnya.
      if (!this.identitasTerkunci) {
        if (!f.nama.trim()) errors.push('Nama wajib diisi.');
        if (!f.nik.trim()) errors.push('NIK wajib diisi.');
        if (!f.departemen.trim()) errors.push('Departemen wajib dipilih.');
      }
      if (!f.departemen_tujuan.trim()) errors.push('Departemen yang dituju wajib dipilih.');
      else if (DEPARTEMEN_BUKAN_TUJUAN.includes(f.departemen_tujuan)) errors.push(`Departemen ${f.departemen_tujuan} tidak bisa dipilih sebagai departemen yang dituju.`);
      else if (f.departemen_tujuan === f.departemen) errors.push('Departemen yang dituju tidak boleh sama dengan departemen pemohon.');
      if (!f.folder_path.trim()) errors.push('Folder yang dituju wajib diisi.');
      else if (!POLA_FOLDER.test(f.folder_path.trim())) errors.push('Folder harus berupa path jaringan, contoh \\\\192.168.10.66\\report\\HSE\\');
      if (!f.alasan.trim()) errors.push('Alasan / kebutuhan akses wajib diisi.');
      if (!f.jenis_akses) errors.push('Akses wajib dipilih.');
      if (f.jenis_akses === 'sampai') {
        // Sama dengan validasi request-create: antara hari ini dan hari ini + 3 bulan.
        if (!f.akses_sampai) errors.push('Tanggal akses berakhir wajib diisi.');
        else if (f.akses_sampai < this.hariIni) errors.push('Tanggal akses berakhir tidak boleh sebelum hari ini.');
        else if (f.akses_sampai > this.batasAkses) errors.push('Tanggal akses berakhir maksimal 3 bulan dari hari ini.');
      }
      return errors;
    },

    async onSubmit(): Promise<void> {
      const notificationStore = useNotificationStore();
      const errors = this.validateForm();
      if (errors.length) {
        notificationStore.showDialogWarning('Data Belum Lengkap', errors.join(' '));
        return;
      }

      try {
        this.isSaving = true;
        const result = await useFolderSharingService().createRequest(this.formData);
        this.dialog.form = false;
        await this.fetchAll();
        notificationStore.showDialogSuccess('Berhasil', result.message || 'Permintaan berhasil diajukan');
      } catch (error) {
        notificationStore.showDialogError('Gagal Mengajukan', error instanceof Error ? error.message : 'Gagal mengajukan permintaan');
      } finally {
        this.isSaving = false;
      }
    },

    /**
     * Unduh Excel dari baris yang sedang tampil. `rows` diambil view dari
     * TableExcel.getVisibleRows(), karena filter checklist kolom dan sort hanya
     * diketahui tabel -- store tidak menyimpannya.
     */
    async exportExcel(rows: FolderSharingRequest[]): Promise<void> {
      const notificationStore = useNotificationStore();
      if (!rows.length) {
        notificationStore.showAlertWarning('Tidak ada data yang tampil untuk diunduh.');
        return;
      }

      const f = this.filter;
      const rentang = f.start_date || f.end_date ? `${f.start_date || '...'} s/d ${f.end_date || '...'}` : 'Semua tanggal';

      try {
        this.isExporting = true;
        await exportFolderSharingExcel(rows, [
          { label: 'Cakupan', isi: this.labelCakupan },
          { label: 'Status', isi: f.status ? LABEL_STATUS[f.status] : 'Semua status' },
          { label: 'Tanggal Pengajuan', isi: rentang },
          // Filter checklist kolom tidak terbaca dari luar tabel, jadi cukup disebut
          // bahwa isinya mengikuti layar -- jumlah barisnya jadi pembanding.
          { label: 'Isi', isi: `${rows.length} baris, sesuai filter & urutan tabel di layar` }
        ]);
      } catch (error) {
        notificationStore.showDialogError('Gagal Mengunduh', error instanceof Error ? error.message : 'Gagal membuat berkas Excel');
      } finally {
        this.isExporting = false;
      }
    },

    /**
     * Buka detail: tampilkan baris dari tabel dulu, lalu ganti dengan balasan
     * request-detail yang membawa `riwayat`. Kalau gagal, detail tetap tampil
     * tanpa riwayat -- pesannya disebut di tempat riwayat, bukan dialog error.
     */
    async openDetail(row: FolderSharingRequest): Promise<void> {
      this.selected = row;
      this.dialog.detail = true;

      try {
        this.isLoadingDetail = true;
        const detail = await useFolderSharingService().fetchDetail(row.id);
        // Pemakai bisa saja sudah menutup / pindah ke baris lain selagi menunggu.
        if (this.dialog.detail && this.selected?.id === row.id) this.selected = detail;
      } catch {
        if (this.selected?.id === row.id) this.selected = { ...row, riwayat: undefined };
      } finally {
        this.isLoadingDetail = false;
      }
    },

    openAksi(row: FolderSharingRequest, aksi: FolderSharingAksi): void {
      this.selected = row;
      this.aksi = aksi;
      this.catatan = '';
      this.dialog.aksi = true;
    },

    async onProcess(): Promise<void> {
      const notificationStore = useNotificationStore();
      const target = this.selected;
      const aksi = this.aksi;
      if (!target || !aksi) return;

      if (aksi === 'reject' && !this.catatan.trim()) {
        notificationStore.showAlertWarning('Alasan penolakan wajib diisi.');
        return;
      }

      try {
        this.isProcessing = true;
        const result = await useFolderSharingService().processRequest(aksi, target.id, this.catatan);
        this.dialog.aksi = false;
        this.dialog.detail = false;
        await this.fetchAll();
        notificationStore.showDialogSuccess('Berhasil', result.message);
      } catch (error) {
        // 409 = sudah diproses orang lain; muat ulang supaya status di layar ikut benar.
        notificationStore.showDialogError('Gagal Memproses', error instanceof Error ? error.message : 'Gagal memproses permintaan');
        await this.fetchAll();
      } finally {
        this.isProcessing = false;
      }
    },

    /** Pengaju boleh membatalkan selama masih di salah satu lapis persetujuan. */
    /**
     * Pemohon boleh membatalkan selama aksesnya belum diberikan -- termasuk sesudah
     * disetujui dua lapis (approved). Sama dengan STATUS_BISA_BATAL di backend.
     */
    canCancel(row: FolderSharingRequest): boolean {
      const authStore = useAuthStore();
      const bisaBatal = row.status === 'pending' || row.status === 'pending_tujuan' || row.status === 'approved';
      // Backend menyimpan created_by dalam huruf besar.
      return bisaBatal && row.created_by === (authStore.user.username ?? '').toUpperCase();
    }
  }
});
