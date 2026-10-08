import { defineStore } from 'pinia';
import { useNotificationStore } from '@/stores/notification';
import { useAuthStore } from '@/stores/auth';
import { useUtilityStore } from '@/stores/utility';
import { cashAdvanceSummaryService } from '@/services/Finance/Report/CashAdvanceSummaryService';
import { exportCashAdvanceSummaryExcel } from '@/services/Finance/Report/CashAdvanceSummaryExcel';
import type {
  CashAdvanceSummaryItem,
  CashAdvanceSummaryDepartmentItem,
  CashAdvanceSummaryFilter,
} from '@/types/Finance/Report/CashAdvanceSummary';

const today = () => new Date().toISOString().substring(0, 10);

// API kadang mengembalikan field numeric sebagai string ("2000000.00") — Number() saja bisa
// menghasilkan NaN untuk kasus tak terduga (mis. ada pemisah ribuan), jadi selalu dibersihkan dulu.
const toNumber = (val: unknown): number => {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (typeof val === 'string') {
    const n = parseFloat(val.replace(/,/g, ''));
    return isNaN(n) ? 0 : n;
  }
  return 0;
};

export const useCashAdvanceSummaryStore = defineStore('finance-cash-advance-summary', {
  state: () => ({
    departmentRows: [] as CashAdvanceSummaryDepartmentItem[],
    // Rincian per karyawan untuk tiap departemen — di-fetch berbarengan dengan departmentRows,
    // dipakai untuk expand baris departemen tanpa perlu request tambahan per klik.
    departmentEmployeeRows: [] as CashAdvanceSummaryItem[],
    expandedDepartments: [] as string[],
    filter: {
      till_date: today(),
      employee_nik: '',
      department: '',
    } as CashAdvanceSummaryFilter,
    // Tanggal acuan overdue yang benar-benar dipakai backend untuk hasil yang sedang ditampilkan
    // (echo dari response) — bisa beda dari filter.till_date kalau belum di-refresh.
    tillDate: '' as string,
    // Nama departemen hasil scope (echo dari response) — hanya terisi untuk user tanpa akses ViewAll
    scopedDepartment: '' as string,
    loading: false,
    exporting: false,
    permissions: {
      download: useAuthStore().checkAccess('Finance.Download.CashAdvanceSummary'),
      // "Lihat semua departemen" memakai permission Update (kolom Update di Manage User) — halaman ini
      // tidak punya aksi update, jadi kolom itu dipinjam supaya tidak perlu kolom baru di Manage User.
      // Tanpa permission ini (mis. dept head) → data dibatasi backend ke departemen user itu sendiri.
      // Default-nya terbatas, supaya akun yang belum diatur tidak otomatis melihat semua departemen.
      viewAll: useAuthStore().checkAccess('Finance.Update.CashAdvanceSummary'),
    },
  }),

  getters: {
    employeesByDepartment: (state) => (department: string) =>
      state.departmentEmployeeRows.filter((r) => r.department === department),

    isDepartmentExpanded: (state) => (department: string) => state.expandedDepartments.includes(department),

    grandTotal: (state) => {
      const rows = state.departmentRows;
      return {
        qty_kasbon:     rows.reduce((s, r) => s + toNumber(r.qty_kasbon),     0),
        balance_due:    rows.reduce((s, r) => s + toNumber(r.balance_due),    0),
        current_amount: rows.reduce((s, r) => s + toNumber(r.current_amount), 0),
        overdue_0_5:    rows.reduce((s, r) => s + toNumber(r.overdue_0_5),    0),
        overdue_6_10:   rows.reduce((s, r) => s + toNumber(r.overdue_6_10),   0),
        overdue_11_15:  rows.reduce((s, r) => s + toNumber(r.overdue_11_15),  0),
        overdue_16_20:  rows.reduce((s, r) => s + toNumber(r.overdue_16_20),  0),
        overdue_21_25:  rows.reduce((s, r) => s + toNumber(r.overdue_21_25),  0),
        overdue_gt_25:  rows.reduce((s, r) => s + toNumber(r.overdue_gt_25),  0),
      };
    },
  },

  actions: {
    toggleDepartment(department: string) {
      const idx = this.expandedDepartments.indexOf(department);
      if (idx >= 0) {
        this.expandedDepartments.splice(idx, 1);
      } else {
        this.expandedDepartments.push(department);
      }
    },

    async fetchData() {
      const notifStore = useNotificationStore();
      const utilStore = useUtilityStore();
      this.loading = true;
      notifStore.loading = true;
      try {
        this.expandedDepartments = [];
        // User tanpa ViewAll: kirim scope=department + NIK login di KEDUA endpoint; departemennya
        // ditentukan backend. Dengan ViewAll: tanpa scope (semua departemen).
        const scoped = !this.permissions.viewAll;
        const scopedTo = scoped ? (useAuthStore().user.username ?? '') : null;

        // Rincian per karyawan di-fetch berbarengan supaya expand baris departemen tidak perlu
        // request tambahan per klik.
        const [deptRes, employeeRes] = await Promise.all([
          cashAdvanceSummaryService.fetchSummaryByDepartment(this.filter, scopedTo),
          cashAdvanceSummaryService.fetchSummary({ ...this.filter, employee_nik: '' }, scopedTo),
        ]);

        // Fail closed: kalau diminta scoped tapi response tidak meng-echo scope "department", anggap
        // tidak tersaring dan JANGAN tampilkan — lebih baik kosong daripada bocor data departemen lain.
        const isScopeHonored = (res: { data?: any }) => !scoped || res.data?.scope === 'department';

        const deptOk = deptRes.status === 200 && deptRes.data?.status !== false;
        if (deptOk && isScopeHonored(deptRes)) {
          // count: 0 / data: [] = departemen tsb tidak punya kasbon outstanding → state kosong, bukan error
          this.departmentRows = (deptRes.data?.data ?? []) as CashAdvanceSummaryDepartmentItem[];
          this.tillDate = deptRes.data?.till_date ?? this.filter.till_date;
          this.scopedDepartment = scoped ? (deptRes.data?.department ?? '') : '';
        } else {
          this.departmentRows = [];
          this.departmentEmployeeRows = [];
          this.scopedDepartment = '';
          notifStore.showDialogWarning(
            'Gagal',
            deptOk
              ? 'Data tidak dapat ditampilkan: pembatasan departemen tidak dikonfirmasi oleh server.'
              : (deptRes.data?.message ?? 'Gagal memuat data summary.')
          );
          return;
        }

        const employeeOk = employeeRes.status === 200 && employeeRes.data?.status !== false;
        this.departmentEmployeeRows =
          employeeOk && isScopeHonored(employeeRes) ? ((employeeRes.data?.data ?? []) as CashAdvanceSummaryItem[]) : [];
      } catch (error) {
        utilStore.onError(error);
      } finally {
        this.loading = false;
        notifStore.disableLoading();
      }
    },

    // Export data yang sedang tampil (bukan fetch ulang) — isinya persis sama dengan tabel di layar,
    // termasuk rincian karyawan per departemen walaupun barisnya tidak sedang di-expand.
    async exportExcel() {
      if (!this.permissions.download || this.departmentRows.length === 0 || this.exporting) return;
      const notifStore = useNotificationStore();
      this.exporting = true;
      try {
        const d = new Date(this.tillDate);
        const tillDateLabel = !this.tillDate
          ? ''
          : isNaN(d.getTime())
            ? this.tillDate
            : d.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
        await exportCashAdvanceSummaryExcel({
          departmentRows: this.departmentRows,
          employeesByDepartment: this.employeesByDepartment,
          grandTotal: this.grandTotal,
          tillDateLabel,
          scopedDepartment: this.scopedDepartment,
        });
      } catch (error) {
        // Error di sini dari ExcelJS/browser, bukan axios — utilStore.onError butuh error.response
        console.error(error);
        notifStore.showDialogWarning('Gagal', 'Export Excel gagal dibuat. Silakan coba lagi.');
      } finally {
        this.exporting = false;
      }
    },
  },
});
