import { defineStore } from 'pinia';
import { useNotificationStore } from '@/stores/notification';
import { useAuditFolderService } from '@/services/Approval/AuditFolderService';
import { DEPARTEMEN_CADANGAN, hariIniLokal } from '@/stores/Approval/FolderSharing';
import type { AuditFolderFormData, AuditFolderPindahOleh, AuditFolderRow, AuditFolderState, AuditFolderStatus } from '@/types/Approval/AuditFolder';

export const LABEL_STATUS_AUDIT: Record<AuditFolderStatus, string> = {
  normal: 'Normal',
  resign: 'Sudah Resign',
  over_capacity: 'Over Capacity',
  dihapus: 'Hapus',
  dipindahkan: 'Dipindahkan',
  membuat_memo: 'Memo'
};

export const LABEL_PINDAH_OLEH: Record<AuditFolderPindahOleh, string> = {
  sendiri: 'Dipindahkan sendiri',
  it: 'Dipindahkan oleh IT'
};

/** Caption di bawah setiap pilihan status, supaya pemilihnya tahu akibatnya. */
export const KETERANGAN_STATUS_AUDIT: Record<AuditFolderStatus, string> = {
  normal: 'Pemakaian folder masih wajar, tidak perlu tindakan.',
  resign: 'Pemilik folder sudah resign, menunggu keputusan atasan.',
  over_capacity: 'Quota folder lebih dari 10 GB, perlu dirapikan atau dipindahkan.',
  dihapus: 'Folder akan dihapus dari storage.',
  dipindahkan: 'Folder dipindahkan, sendiri atau oleh IT.',
  membuat_memo: 'Membuat memo untuk penambahan kapasitas storage.'
};

/** Sama dengan Audit_folder::BATAS_OVER_CAPACITY_GB -- over capacity hanya untuk quota di atas ini. */
export const BATAS_OVER_CAPACITY_GB = 10;

const angka = (v: string | number | null | undefined): number | null => {
  const s = String(v ?? '').trim().replace(',', '.');
  return s === '' || Number.isNaN(Number(s)) ? null : Number(s);
};

const emptyForm = (): AuditFolderFormData => ({
  id: null,
  tanggal: hariIniLokal(),
  nik: '',
  nama: '',
  departemen: '',
  nama_folder: '',
  quota_gb: '',
  usage_gb: '',
  status: '',
  note: ''
});

export const useAuditFolderStore = defineStore('Approval Audit Folder', {
  state: (): AuditFolderState => ({
    dataTable: [],
    departemenList: [],
    me: null,
    // Cerminan balasan server terakhir -- server yang menentukan dari jabatan.
    scope: 'none',
    filter: { status: '', start_date: '', end_date: '' },
    search: '',
    formData: emptyForm(),
    dialog: { form: false, detail: false, status: false, hapus: false },
    selected: null,
    statusBaru: '',
    pindahOleh: '',
    catatan: '',
    isLoading: false,
    isSaving: false,
    isProcessing: false,
    isLoadingDetail: false,
    isLookup: false,
    lookupInfo: '',
    lastError: ''
  }),

  getters: {
    /** CRUD hanya administrator; hak ubah status per baris datang dari backend. */
    bolehCrud: (state): boolean => !!state.me?.izin.crud,
    /** Punya permission, tapi departemennya di HR tidak dikenali -- tidak ada data. */
    tanpaAkses: (state): boolean => state.me !== null && state.me.cakupan === 'none',
    labelCakupan: (state): string => {
      if (state.scope === 'all') return 'Semua Departemen';
      if (state.scope === 'dept') return `Dept. ${(state.me?.departemen_dikelola ?? []).join(', ') || '-'}`;
      return '-';
    },
    /**
     * Pencarian dilakukan di layar atas baris yang sudah dimuat (seluruh baris yang
     * cocok filter server), lalu diserahkan ke TableExcel untuk filter kolom & sort.
     */
    rowsTampil: (state): AuditFolderRow[] => {
      const q = state.search.trim().toLowerCase();
      if (!q) return state.dataTable;
      return state.dataTable.filter((r) =>
        [r.nik, r.nama, r.departemen, r.nama_folder, r.note, r.status_catatan, LABEL_STATUS_AUDIT[r.status]]
          .some((v) => (v ?? '').toString().toLowerCase().includes(q))
      );
    },
    /** Quota di form melewati batas, jadi status Over Capacity boleh dipilih. */
    bolehOverCapacity: (state): boolean => (angka(state.formData.quota_gb) ?? 0) > BATAS_OVER_CAPACITY_GB,
    /** Usage di form melebihi quota -- ditandai langsung di bawah isiannya. */
    usageLewatQuota: (state): boolean => {
      const q = angka(state.formData.quota_gb);
      const u = angka(state.formData.usage_gb);
      return q !== null && u !== null && u > q;
    },
    /** Masih menunggu keputusan: ada pilihan keputusan dan belum diputuskan. */
    totalMenunggu: (state): number => state.dataTable.filter((r) => r.pilihan_status?.length && !r.diputuskan_at).length,
    totalDihapus: (state): number => state.dataTable.filter((r) => r.status === 'dihapus').length,
    totalDipindahkan: (state): number => state.dataTable.filter((r) => r.status === 'dipindahkan').length,
    totalMemo: (state): number => state.dataTable.filter((r) => r.status === 'membuat_memo').length,
    /** Note wajib: lokasi pemindahan kalau dipindahkan oleh IT. */
    catatanWajib: (state): boolean => state.statusBaru === 'dipindahkan' && state.pindahOleh === 'it'
  },

  actions: {
    async fetchAll(): Promise<void> {
      try {
        this.isLoading = true;
        this.lastError = '';

        if (!this.me) {
          this.me = await useAuditFolderService().fetchMe();
        }
        // Departemen tidak dikenali: list pasti 403, layar menampilkan keterangannya.
        if (this.me.cakupan === 'none') {
          this.dataTable = [];
          this.scope = 'none';
          return;
        }

        const result = await useAuditFolderService().fetchList(this.filter);
        this.dataTable = result.data;
        this.scope = result.scope ?? this.scope;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Gagal memuat data audit folder';
        this.lastError = message;
        this.dataTable = [];
        useNotificationStore().showDialogError('Gagal Memuat Data', message);
      } finally {
        this.isLoading = false;
      }
    },

    async muatDepartemen(): Promise<void> {
      if (this.departemenList.length) return;
      try {
        this.departemenList = await useAuditFolderService().fetchDepartemen();
      } catch {
        this.departemenList = [...DEPARTEMEN_CADANGAN];
      }
    },

    async openCreate(): Promise<void> {
      this.formData = emptyForm();
      this.lookupInfo = '';
      this.dialog.form = true;
      await this.muatDepartemen();
    },

    async openEdit(row: AuditFolderRow): Promise<void> {
      this.formData = {
        id: row.id,
        tanggal: row.tanggal,
        nik: row.nik,
        nama: row.nama,
        departemen: row.departemen,
        nama_folder: row.nama_folder,
        quota_gb: row.quota_gb === null ? '' : String(row.quota_gb),
        usage_gb: row.usage_gb === null ? '' : String(row.usage_gb),
        status: row.status,
        note: row.note ?? ''
      };
      this.lookupInfo = '';
      this.dialog.form = true;
      await this.muatDepartemen();
    },

    /** Isi nama + departemen dari portal HR. Termasuk pegawai yang sudah tidak aktif. */
    async lookupNik(): Promise<void> {
      const nik = this.formData.nik.trim();
      if (!nik) return;
      try {
        this.isLookup = true;
        this.lookupInfo = '';
        const emp = await useAuditFolderService().fetchEmployee(nik);
        this.formData.nik = emp.nik;
        this.formData.nama = emp.nama;
        if (emp.departemen) this.formData.departemen = emp.departemen;
        const info: string[] = [];
        if (!emp.aktif) info.push('Pegawai sudah tidak aktif di HR.');
        if (!emp.departemen) info.push(`Departemen HR "${emp.departemen_hr}" tidak ada di daftar, pilih manual.`);
        this.lookupInfo = info.join(' ');
      } catch (error) {
        this.lookupInfo = error instanceof Error ? error.message : 'NIK tidak ditemukan';
      } finally {
        this.isLookup = false;
      }
    },

    validateForm(): string[] {
      const f = this.formData;
      const errors: string[] = [];
      if (!f.tanggal) errors.push('Tanggal wajib diisi.');
      if (!f.nik.trim()) errors.push('NIK wajib diisi.');
      if (!f.nama.trim()) errors.push('Nama wajib diisi.');
      if (!f.departemen) errors.push('Departemen wajib dipilih.');
      if (!f.nama_folder.trim()) errors.push('Nama folder wajib diisi.');
      for (const [label, v] of [['Quota', f.quota_gb], ['Usage', f.usage_gb]] as const) {
        const s = String(v ?? '').trim().replace(',', '.');
        if (s !== '' && (Number.isNaN(Number(s)) || Number(s) < 0)) errors.push(`${label} harus berupa angka GB yang tidak negatif.`);
      }
      if (!f.status) errors.push('Status wajib dipilih.');
      // Aturan yang sama dengan Audit_folder::baca_form() -- server tetap memeriksanya.
      if (this.usageLewatQuota) errors.push('Usage tidak boleh lebih besar dari quota.');
      if (f.status === 'over_capacity' && !this.bolehOverCapacity) {
        errors.push(`Status Over Capacity hanya untuk folder dengan quota lebih dari ${BATAS_OVER_CAPACITY_GB} GB.`);
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
        const result = await useAuditFolderService().save(this.formData);
        this.dialog.form = false;
        await this.fetchAll();
        notificationStore.showDialogSuccess('Berhasil', result.message);
      } catch (error) {
        notificationStore.showDialogError('Gagal Menyimpan', error instanceof Error ? error.message : 'Gagal menyimpan data');
      } finally {
        this.isSaving = false;
      }
    },

    /** Tampilkan baris dari tabel dulu, lalu ganti dengan detail yang membawa riwayat. */
    async openDetail(row: AuditFolderRow): Promise<void> {
      this.selected = row;
      this.dialog.detail = true;
      try {
        this.isLoadingDetail = true;
        const detail = await useAuditFolderService().fetchDetail(row.id);
        if (this.dialog.detail && this.selected?.id === row.id) this.selected = detail;
      } catch {
        if (this.selected?.id === row.id) this.selected = { ...row, riwayat: undefined };
      } finally {
        this.isLoadingDetail = false;
      }
    },

    openStatus(row: AuditFolderRow): void {
      this.selected = row;
      // Tanpa pilihan bawaan: keputusan ini hanya sekali, jadi harus dipilih sadar.
      this.statusBaru = '';
      this.pindahOleh = '';
      this.catatan = '';
      this.dialog.status = true;
    },

    async onUbahStatus(): Promise<void> {
      const notificationStore = useNotificationStore();
      const target = this.selected;
      if (!target || !this.statusBaru) {
        notificationStore.showAlertWarning('Pilih status baru dulu.');
        return;
      }
      // Aturan yang sama dengan Audit_folder::audit_status_post() -- server tetap memeriksanya.
      if (this.statusBaru === 'dipindahkan' && !this.pindahOleh) {
        notificationStore.showAlertWarning('Pilih siapa yang memindahkan: sendiri atau oleh IT.');
        return;
      }
      if (this.catatanWajib && !this.catatan.trim()) {
        notificationStore.showAlertWarning('Isi lokasi pemindahan di note.');
        return;
      }
      try {
        this.isProcessing = true;
        const result = await useAuditFolderService().ubahStatus(target.id, this.statusBaru, this.catatan, this.pindahOleh);
        this.dialog.status = false;
        this.dialog.detail = false;
        await this.fetchAll();
        notificationStore.showDialogSuccess('Berhasil', result.message);
      } catch (error) {
        // 409 = keduluan pengguna lain; muat ulang supaya status di layar ikut benar.
        notificationStore.showDialogError('Gagal Mengubah Status', error instanceof Error ? error.message : 'Gagal mengubah status');
        await this.fetchAll();
      } finally {
        this.isProcessing = false;
      }
    },

    openHapus(row: AuditFolderRow): void {
      this.selected = row;
      this.dialog.hapus = true;
    },

    async onHapus(): Promise<void> {
      const notificationStore = useNotificationStore();
      const target = this.selected;
      if (!target) return;
      try {
        this.isProcessing = true;
        const result = await useAuditFolderService().remove(target.id);
        this.dialog.hapus = false;
        this.dialog.detail = false;
        await this.fetchAll();
        notificationStore.showDialogSuccess('Berhasil', result.message);
      } catch (error) {
        notificationStore.showDialogError('Gagal Menghapus', error instanceof Error ? error.message : 'Gagal menghapus data');
        await this.fetchAll();
      } finally {
        this.isProcessing = false;
      }
    }
  }
});
