import { defineStore } from 'pinia';
import { useNotificationStore } from '@/stores/notification';
import { useAuthStore } from '@/stores/auth';
import { useUtilityStore } from '@/stores/utility';
import { advanceSettlementService } from '@/services/Finance/Transaction/AdvanceSettlementService';
import { exportAdvanceSettlementExcel } from '@/services/Finance/Transaction/AdvanceSettlementExcel';
import type {
  AdvanceSettlementItem,
  KasbonStatus,
  KasbonEditForm,
  SettlementForm,
  SettlementFilter,
  EmployeeOption,
} from '@/types/Finance/Transaction/AdvanceSettlement';
import type { CategoryOption } from '@/types/Finance/Master/Category';

const today = () => new Date().toISOString().substring(0, 10);
const oneMonthAgo = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().substring(0, 10);
};

const emptyKasbonForm = (): KasbonEditForm => ({
  kasbon_date: today(),
  employee_nik: '',
  category_id: null,
  description: '',
  amount: null,
  usage_date: today(),
});

const emptySettlementForm = (): SettlementForm => ({
  report_note: '',
  bkk_no: '',
  bkk_date: '',
  realization_amount: null,
  cash_received: null,
});

export const useAdvanceSettlementStore = defineStore('finance-advance-settlement', {
  state: () => ({
    // Dua dataset terpisah dari dua panggilan API (active=1 dan active=0) — bukan active=all yang di-split di client
    activeDataset: [] as AdvanceSettlementItem[],
    cancelledDataset: [] as AdvanceSettlementItem[],
    employeeOptions: [] as EmployeeOption[],
    categoryOptions: [] as CategoryOption[],
    filter: {
      date_from: oneMonthAgo(),
      date_to: today(),
    } as SettlementFilter,
    // Dua form terpisah — hanya salah satunya yang dipakai tergantung status kasbon yang diedit
    kasbonForm: emptyKasbonForm() as KasbonEditForm,
    settlementForm: emptySettlementForm() as SettlementForm,
    restoreForm: { bkk_no: '' },
    dialog: {
      settlement: false,
      restore: false,
      cardDetail: false,
      export: false,
    },
    // Status yang dipilih di modal Download — tiap status jadi sheet terpisah di file Excel
    exportStatuses: ['Open', 'Approved', 'Closed'] as KasbonStatus[],
    exporting: false,
    activeCardKey: null as 'open' | 'approved' | 'closed' | 'cancelled' | 'nominal' | 'outstanding' | null,
    activeTab: 'detail' as 'detail' | 'settlement' | 'kasbon',
    selectedRow: null as AdvanceSettlementItem | null,
    // Default ke 'approved' — itulah antrian utama finance (kasbon yang sudah di-approve, siap diisi settlement)
    activeListTab: 'approved' as 'open' | 'approved' | 'closed' | 'cancelled',
    loading: false,
    permissions: {
      update: useAuthStore().checkAccess('Finance.Update.AdvanceSettlement'),
      create: useAuthStore().checkAccess('Finance.Create.AdvanceSettlement'),
      download: useAuthStore().checkAccess('Finance.Download.AdvanceSettlement'),
    },
  }),

  getters: {
    openRows:      (state) => state.activeDataset.filter((r) => r.status === 'Open'),
    approvedRows:  (state) => state.activeDataset.filter((r) => r.status === 'Approved'),
    closedRows:    (state) => state.activeDataset.filter((r) => r.status === 'Closed'),
    cancelledRows: (state) => state.cancelledDataset,

    summaryCards: (state) => {
      // Open & Approved sama-sama "belum Closed" — dipakai untuk total nominal/outstanding gabungan
      const unclosed = state.activeDataset.filter((r) => r.status !== 'Closed');
      return {
        open:             state.activeDataset.filter((r) => r.status === 'Open').length,
        approved:         state.activeDataset.filter((r) => r.status === 'Approved').length,
        closed:           state.activeDataset.filter((r) => r.status === 'Closed').length,
        cancelled:        state.cancelledDataset.length,
        totalAmount:      unclosed.reduce((s, r) => s + parseFloat(r.amount            || '0'), 0),
        totalOutstanding: unclosed.reduce((s, r) => s + parseFloat(r.outstanding_amount || '0'), 0),
      };
    },

    // Approve hanya untuk kasbon Open (Open → Approved)
    canApprove: (state) =>
      state.selectedRow !== null &&
      state.selectedRow.active !== 0 &&
      state.selectedRow.status === 'Open',

    // Close manual hanya relevan saat Approved & outstanding sudah 0 (biasanya sudah auto-close dari backend,
    // tombol ini jadi fallback kalau belum ke-trigger)
    canClose: (state) =>
      state.selectedRow !== null &&
      state.selectedRow.status === 'Approved' &&
      parseFloat(state.selectedRow.outstanding_amount || '0') <= 0,

    canCancel: (state) =>
      state.selectedRow !== null &&
      state.selectedRow.active !== 0 &&
      state.selectedRow.status !== 'Closed',

    canRestore: (state) =>
      state.selectedRow !== null &&
      state.selectedRow.active === 0,

    // Field pengajuan cuma bisa diedit saat status Open
    canEditKasbon: (state) => state.selectedRow !== null && state.selectedRow.status === 'Open',
    // Field settlement cuma bisa diedit saat status Approved
    canEditSettlement: (state) => state.selectedRow !== null && state.selectedRow.status === 'Approved',

    // Due days dari kategori yang sedang dipilih di tab Edit Data Kasbon
    selectedCategoryDueDays: (state) => {
      if (!state.kasbonForm.category_id) return null;
      return state.categoryOptions.find((c) => c.value === state.kasbonForm.category_id)?.due_days ?? null;
    },
  },

  actions: {
    async fetchData() {
      const notifStore = useNotificationStore();
      const utilStore = useUtilityStore();
      this.loading = true;
      notifStore.loading = true;
      try {
        const [activeRes, cancelledRes] = await Promise.all([
          advanceSettlementService.fetchAll(this.filter, '1'),
          advanceSettlementService.fetchAll(this.filter, '0'),
        ]);
        if (activeRes.status === 200 && activeRes.data?.status !== false) {
          this.activeDataset = (activeRes.data?.data ?? []) as AdvanceSettlementItem[];
        } else {
          notifStore.showDialogWarning('Gagal', activeRes.data?.message ?? 'Gagal memuat data kasbon aktif.');
        }
        if (cancelledRes.status === 200 && cancelledRes.data?.status !== false) {
          this.cancelledDataset = (cancelledRes.data?.data ?? []) as AdvanceSettlementItem[];
        } else {
          notifStore.showDialogWarning('Gagal', cancelledRes.data?.message ?? 'Gagal memuat data kasbon dibatalkan.');
        }
      } catch (error) {
        utilStore.onError(error);
      } finally {
        this.loading = false;
        notifStore.disableLoading();
      }
    },

    async fetchEmployeeOptions() {
      const utilStore = useUtilityStore();
      try {
        const res = await advanceSettlementService.fetchEmployees();
        if (res.status === 200 && res.data?.status !== false) {
          this.employeeOptions = (res.data?.data ?? []).map((e: any) => ({
            value: e.nik,
            label: e.name ?? e.employee_name ?? e.nik,
            sublabel: e.department ?? e.dept ?? undefined,
          }));
        }
      } catch (error) {
        utilStore.onError(error);
      }
    },

    async fetchCategoryOptions() {
      const utilStore = useUtilityStore();
      try {
        const res = await advanceSettlementService.fetchCategories();
        // GET category kadang membalas array polos (tanpa envelope {status,message,data})
        const payload = res.data;
        const rows = Array.isArray(payload) ? payload : (payload?.data ?? null);
        if (res.status === 200 && rows !== null && payload?.status !== false) {
          this.categoryOptions = (rows as any[])
            .filter((c: any) => Number(c.active) !== 0)
            .map((c: any) => ({
              value: c.id,
              label: c.category,
              due_days: c.due_days,
            }));
        }
      } catch (error) {
        utilStore.onError(error);
      }
    },

    // Satu entrypoint dipanggil dari tombol Simpan — routing ke endpoint yang benar tergantung status
    // kasbon yang sedang dibuka, supaya form Open tidak pernah kirim field settlement dan sebaliknya.
    async onUpdate() {
      if (!this.selectedRow) return;
      if (this.selectedRow.status === 'Open') {
        await this.onUpdateKasbon();
      } else if (this.selectedRow.status === 'Approved') {
        await this.onUpdateSettlement();
      }
    },

    async onUpdateKasbon() {
      if (!this.selectedRow) return;
      const notifStore = useNotificationStore();
      const utilStore = useUtilityStore();
      notifStore.loading = true;
      try {
        const updatedBy = useAuthStore().user.username ?? '';
        const res = await advanceSettlementService.updateKasbon(this.selectedRow.id, this.kasbonForm, updatedBy);
        if (res.status === 200 && res.data?.status !== false) {
          notifStore.showDialogSuccess('Berhasil', res.data?.message ?? 'Data pengajuan kasbon berhasil diupdate.');
          this.dialog.settlement = false;
          await this.fetchData();
        } else {
          notifStore.showDialogWarning('Gagal', res.data?.message ?? 'Data pengajuan gagal diupdate.');
        }
      } catch (error) {
        utilStore.onError(error);
      } finally {
        notifStore.disableLoading();
      }
    },

    async onUpdateSettlement() {
      if (!this.selectedRow) return;
      const notifStore = useNotificationStore();
      const utilStore = useUtilityStore();
      notifStore.loading = true;
      try {
        // Jaga-jaga: Cash Received tidak boleh melebihi sisa outstanding, meski sudah dibatasi di form
        const maxCashReceived = parseFloat(this.selectedRow.outstanding_amount || '0');
        if (this.settlementForm.cash_received !== null && this.settlementForm.cash_received > maxCashReceived) {
          this.settlementForm.cash_received = maxCashReceived;
        }
        const updatedBy = useAuthStore().user.username ?? '';
        const res = await advanceSettlementService.updateSettlement(this.selectedRow.id, this.settlementForm, updatedBy);
        if (res.status === 200 && res.data?.status !== false) {
          notifStore.showDialogSuccess('Berhasil', res.data?.message ?? 'Data settlement berhasil diupdate.');
          this.dialog.settlement = false;
          await this.fetchData();
        } else {
          notifStore.showDialogWarning('Gagal', res.data?.message ?? 'Data settlement gagal diupdate.');
        }
      } catch (error) {
        utilStore.onError(error);
      } finally {
        notifStore.disableLoading();
      }
    },

    async onApprove(row: AdvanceSettlementItem) {
      const notifStore = useNotificationStore();
      const utilStore = useUtilityStore();
      notifStore.showConfirm(
        'Approve Kasbon',
        `Approve kasbon ${row.kasbon_no}? Isi form Edit Data Kasbon saat ini ikut disimpan. ` +
          'Setelah di-approve, data pengajuan tidak bisa diedit lagi dan hanya field settlement yang bisa diisi.',
        async () => {
          notifStore.loading = true;
          try {
            const approvedBy = useAuthStore().user.username ?? '';
            // Edit + approve dalam satu request ke /approve — tidak perlu Simpan dulu
            const res = await advanceSettlementService.approve(row.id, approvedBy, this.kasbonForm);
            if (res.status === 200 && res.data?.status !== false) {
              const kasbonNo = res.data?.data?.kasbon_no;
              notifStore.showDialogSuccess(
                'Berhasil',
                kasbonNo ? `Disetujui dengan nomor ${kasbonNo}.` : res.data?.message ?? 'Kasbon berhasil di-approve.'
              );
              this.dialog.settlement = false;
              await this.fetchData();
            } else {
              // Gagal = tidak ada yang tersimpan & tetap Open; modal dibiarkan terbuka supaya form bisa diperbaiki
              notifStore.showDialogWarning('Gagal', res.data?.message ?? 'Kasbon gagal di-approve.');
            }
          } catch (error) {
            utilStore.onError(error);
          } finally {
            notifStore.disableLoading();
          }
        }
      );
    },

    async onClose() {
      if (!this.selectedRow) return;
      const notifStore = useNotificationStore();
      const utilStore = useUtilityStore();
      notifStore.showConfirm(
        'Konfirmasi Close',
        `Tutup kasbon ${this.selectedRow.kasbon_no}? Tindakan ini akan mengubah status menjadi Closed.`,
        async () => {
          notifStore.loading = true;
          try {
            const res = await advanceSettlementService.close(this.selectedRow!.id);
            if (res.status === 200 && res.data?.status !== false) {
              notifStore.showDialogSuccess('Berhasil', res.data?.message ?? 'Kasbon berhasil ditutup.');
              this.dialog.settlement = false;
              await this.fetchData();
            } else {
              notifStore.showDialogWarning('Gagal', res.data?.message ?? 'Kasbon gagal ditutup.');
            }
          } catch (error) {
            utilStore.onError(error);
          } finally {
            notifStore.disableLoading();
          }
        }
      );
    },

    async onCancel(row: AdvanceSettlementItem) {
      const notifStore = useNotificationStore();
      const utilStore = useUtilityStore();
      notifStore.showConfirm(
        'Konfirmasi Pembatalan',
        `Batalkan kasbon ${row.kasbon_no}? Data ini akan dipindahkan ke tab Dibatalkan.`,
        async () => {
          notifStore.loading = true;
          try {
            const cancelledBy = useAuthStore().user.username ?? '';
            const res = await advanceSettlementService.cancel(row.id, cancelledBy);
            if (res.status === 200 && res.data?.status !== false) {
              notifStore.showDialogSuccess('Berhasil', res.data?.message ?? 'Kasbon berhasil dibatalkan.');
              this.dialog.settlement = false;
              await this.fetchData();
            } else {
              notifStore.showDialogWarning('Gagal', res.data?.message ?? 'Kasbon gagal dibatalkan.');
            }
          } catch (error) {
            utilStore.onError(error);
          } finally {
            notifStore.disableLoading();
          }
        }
      );
    },

    openRestore(row: AdvanceSettlementItem) {
      this.selectedRow = row;
      this.restoreForm = { bkk_no: '' };
      this.dialog.restore = true;
    },

    async onRestore() {
      if (!this.selectedRow) return;
      const notifStore = useNotificationStore();
      const utilStore = useUtilityStore();
      notifStore.loading = true;
      try {
        const restoredBy = useAuthStore().user.username ?? '';
        const res = await advanceSettlementService.restore(this.restoreForm.bkk_no.trim(), restoredBy);
        if (res.status === 200 && res.data?.status !== false) {
          notifStore.showDialogSuccess('Berhasil', res.data?.message ?? 'Kasbon berhasil di-restore.');
          this.dialog.restore = false;
          this.dialog.settlement = false;
          await this.fetchData();
        } else {
          notifStore.showDialogWarning('Gagal', res.data?.message ?? 'Kasbon gagal di-restore.');
        }
      } catch (error) {
        utilStore.onError(error);
      } finally {
        notifStore.disableLoading();
      }
    },

    openExport() {
      if (!this.permissions.download) return;
      this.exportStatuses = ['Open', 'Approved', 'Closed'];
      this.dialog.export = true;
    },

    // Export data yang sedang tampil (tidak fetch ulang). Open/Approved = semua outstanding
    // (outstanding_all=1), Closed = sesuai rentang tanggal filter.
    async onExport() {
      if (!this.permissions.download || this.exportStatuses.length === 0 || this.exporting) return;
      const notifStore = useNotificationStore();
      this.exporting = true;
      try {
        const rowsByStatus: Record<KasbonStatus, AdvanceSettlementItem[]> = {
          Open: this.openRows,
          Approved: this.approvedRows,
          Closed: this.closedRows,
        };
        // Urutan sheet selalu Open → Approved → Closed, terlepas dari urutan klik checkbox
        const sheets = (['Open', 'Approved', 'Closed'] as KasbonStatus[])
          .filter((s) => this.exportStatuses.includes(s))
          .map((status) => ({ status, rows: rowsByStatus[status] }));
        const fmt = (iso: string) => (iso ? iso.split('-').reverse().join('/') : '-');
        await exportAdvanceSettlementExcel({
          sheets,
          closedDateRangeLabel: `${fmt(this.filter.date_from)} - ${fmt(this.filter.date_to)}`,
        });
        this.dialog.export = false;
      } catch (error) {
        // Error dari ExcelJS/browser, bukan axios — utilStore.onError butuh error.response
        console.error(error);
        notifStore.showDialogWarning('Gagal', 'Export Excel gagal dibuat. Silakan coba lagi.');
      } finally {
        this.exporting = false;
      }
    },

    openCardDetail(key: 'open' | 'approved' | 'closed' | 'cancelled' | 'nominal' | 'outstanding') {
      this.activeCardKey = key;
      this.dialog.cardDetail = true;
    },

    openSettlement(row: AdvanceSettlementItem) {
      this.selectedRow = row;
      // Tab default menyesuaikan status: Open → form pengajuan, Approved → form settlement, Closed → cuma Detail
      this.activeTab = row.status === 'Open' ? 'kasbon' : row.status === 'Approved' ? 'settlement' : 'detail';

      // category_id kadang belum ada di response lama — fallback cari by nama dari daftar kategori
      const categoryId = row.category_id ?? this.categoryOptions.find((c) => c.label === row.category_name)?.value ?? null;
      this.kasbonForm = {
        kasbon_date:  row.kasbon_date,
        employee_nik: row.employee_nik,
        category_id:  categoryId,
        description:  row.description,
        amount:       parseFloat(row.amount || '0'),
        usage_date:   row.usage_date,
      };
      this.settlementForm = {
        report_note:        row.report_note ?? '',
        bkk_no:              row.bkk_no ?? '',
        // API bisa mengirim datetime — input type="date" butuh YYYY-MM-DD saja
        bkk_date:            (row.bkk_date ?? '').substring(0, 10),
        realization_amount: row.realization_amount ? parseFloat(row.realization_amount) : null,
        cash_received:       row.cash_received      ? parseFloat(row.cash_received)      : null,
      };
      this.dialog.settlement = true;
    },
  },
});
