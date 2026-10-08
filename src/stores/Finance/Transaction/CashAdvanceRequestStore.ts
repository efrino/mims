import { defineStore } from 'pinia';
import { useNotificationStore } from '@/stores/notification';
import { useAuthStore } from '@/stores/auth';
import { useUtilityStore } from '@/stores/utility';
import { cashAdvanceRequestService } from '@/services/Finance/Transaction/CashAdvanceRequestService';
import type {
  CashAdvanceRequestItem,
  CashAdvanceRequestForm,
  CashAdvanceRequestFilter,
  EmployeeOption,
  KasbonEmployee,
} from '@/types/Finance/Transaction/CashAdvanceRequest';
import type { CategoryOption } from '@/types/Finance/Master/Category';

const today = () => new Date().toISOString().substring(0, 10);
const oneMonthAgo = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().substring(0, 10);
};
const getCreatedBy = () => useAuthStore().user.username ?? null;

export const useCashAdvanceRequestStore = defineStore('finance-cash-advance-request', {
  state: () => ({
    allRows: [] as CashAdvanceRequestItem[],
    // Karyawan whitelist + kasbon_limit masing-masing (opsi dropdown diturunkan lewat getter employeeOptions)
    employees: [] as KasbonEmployee[],
    // Jumlah kasbon aktif belum Closed (Open + Approved) per NIK, dari semua pengaju — null = belum
    // berhasil dimuat, dalam kondisi itu tidak ada NIK yang diblokir (backend tetap validasi saat submit)
    outstandingCountByNik: null as Record<string, number> | null,
    // Keterangan merah di bawah field NIK saat user mencoba memilih karyawan yang sudah limit
    employeeLimitNotice: '' as string,
    categoryOptions: [] as CategoryOption[],
    filter: {
      date_from: oneMonthAgo(),
      date_to: today(),
      status: '',
      employee_nik: '',
      category_id: null,
      created_by: getCreatedBy(),
    } as CashAdvanceRequestFilter,
    form: {
      kasbon_date: today(),
      employee_nik: '',
      category_id: null,
      description: '',
      amount: null,
      usage_date: today(),
      created_by: getCreatedBy(),
    } as CashAdvanceRequestForm,
    dialog: {
      form: false,
      detail: false,
    },
    selectedRow: null as CashAdvanceRequestItem | null,
    activeTab: 'open' as 'open' | 'approved' | 'closed',
    loading: false,
    permissions: {
      create: useAuthStore().checkAccess('Finance.Create.CashAdvanceRequest'),
    },
  }),

  getters: {
    openRows:     (state) => state.allRows.filter((r) => r.status === 'Open'),
    approvedRows: (state) => state.allRows.filter((r) => r.status === 'Approved'),
    closedRows:   (state) => state.allRows.filter((r) => r.status === 'Closed'),

    summaryCards: (state) => {
      // Open & Approved sama-sama "belum Closed" — dua-duanya masih dihitung ke limit kasbon aktif
      const unclosedRows = state.allRows.filter((r) => r.status !== 'Closed');
      return {
        open:     state.allRows.filter((r) => r.status === 'Open').length,
        approved: state.allRows.filter((r) => r.status === 'Approved').length,
        closed:   state.allRows.filter((r) => r.status === 'Closed').length,
        totalAmount:      unclosedRows.reduce((s, r) => s + parseFloat(r.amount            || '0'), 0),
        totalOutstanding: unclosedRows.reduce((s, r) => s + parseFloat(r.outstanding_amount || '0'), 0),
      };
    },

    // Opsi NIK untuk form pengajuan. NIK yang sudah mencapai kasbon_limit tetap ditampilkan tapi
    // disabled + diberi keterangan, supaya PIC tahu dari awal tanpa harus submit dulu lalu ditolak.
    employeeOptions(state): EmployeeOption[] {
      return state.employees.map((e) => {
        const current = state.outstandingCountByNik?.[e.nik] ?? 0;
        const limit = e.kasbon_limit;
        const atLimit = state.outstandingCountByNik !== null && limit !== null && limit > 0 && current >= limit;
        if (!atLimit) return { value: e.nik, label: e.name, sublabel: e.department };

        // Autocomplete (komponen shared, tidak diubah) tidak punya opsi "disabled" — jadi NIK yang limit
        // ditandai lewat fitur yang sudah ada: badge merah (statusLabel) + keterangan di sublabel.
        // Kalau tetap diklik, pilihannya dibatalkan oleh onEmployeeSelected().
        const badge = `Limit ${current}/${limit}`;
        return {
          value: e.nik,
          label: e.name,
          sublabel: [e.department, 'Tidak dapat dipilih — limit kasbon outstanding tercapai'].filter(Boolean).join(' · '),
          statusLabel: { label: badge, colorMap: { [badge]: 'red' } },
          disabled: true,
          disabledReason: `sudah mencapai limit kasbon outstanding (${current}/${limit}), tidak dapat diajukan kasbon baru`,
        };
      });
    },

    // Due days dari kategori yang sedang dipilih di form — dipakai untuk info tenggat
    selectedCategoryDueDays: (state) => {
      if (!state.form.category_id) return null;
      return state.categoryOptions.find((c) => c.value === state.form.category_id)?.due_days ?? null;
    },
  },

  actions: {
    async fetchEmployeeOptions() {
      const utilStore = useUtilityStore();
      try {
        const res = await cashAdvanceRequestService.fetchEmployees();
        if (res.status === 200 && res.data?.status !== false) {
          this.employees = (res.data?.data ?? []).map((e: any) => {
            const limit = Number(e.kasbon_limit);
            return {
              nik: e.nik,
              name: e.name ?? e.employee_name ?? e.nik,
              department: e.department ?? e.dept ?? undefined,
              kasbon_limit: e.kasbon_limit === null || e.kasbon_limit === undefined || isNaN(limit) ? null : limit,
            };
          });
        }
      } catch (error) {
        useUtilityStore().onError(error);
      }
    },

    // Hitung kasbon aktif belum Closed per NIK (Open + Approved, dari semua pengaju) — dasar yang sama
    // dengan pengecekan kasbon_limit di backend. Gagal memuat = tidak memblokir siapa pun.
    async fetchOutstandingCounts() {
      try {
        const res = await cashAdvanceRequestService.fetchOutstanding(today());
        if (res.status === 200 && res.data?.status !== false) {
          const counts: Record<string, number> = {};
          for (const row of (res.data?.data ?? []) as CashAdvanceRequestItem[]) {
            if (row.status === 'Closed') continue;
            counts[row.employee_nik] = (counts[row.employee_nik] ?? 0) + 1;
          }
          this.outstandingCountByNik = counts;
        }
      } catch (error) {
        console.error(error);
      }
    },

    async fetchCategoryOptions() {
      const utilStore = useUtilityStore();
      try {
        const res = await cashAdvanceRequestService.fetchCategories();
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

    async fetchData() {
      const notifStore = useNotificationStore();
      const utilStore = useUtilityStore();
      this.loading = true;
      notifStore.loading = true;
      try {
        const res = await cashAdvanceRequestService.fetchAll(this.filter);
        if (res.status === 200 && res.data?.status !== false) {
          this.allRows = (res.data?.data ?? []) as CashAdvanceRequestItem[];
        } else {
          utilStore.onApiResponse(res);
        }
      } catch (error) {
        utilStore.onError(error);
      } finally {
        this.loading = false;
        notifStore.disableLoading();
      }
    },

    async onCreate() {
      const notifStore = useNotificationStore();
      const utilStore = useUtilityStore();
      // Jaga-jaga kalau NIK yang sudah limit tetap terpilih (mis. limit tercapai setelah form dibuka)
      const selected = this.employeeOptions.find((o) => o.value === this.form.employee_nik);
      if (selected?.disabled) {
        notifStore.showDialogWarning('Pengajuan Ditolak', `${selected.label}: ${selected.disabledReason}`);
        return;
      }
      // Pastikan created_by terisi sebelum kirim
      this.form.created_by = getCreatedBy();
      notifStore.loading = true;
      try {
        const res = await cashAdvanceRequestService.create(this.form);
        // Cek envelope { status: false, message, data } lebih dulu — bisa datang dengan HTTP 400
        // (mis. limit kasbon aktif tercapai), jadi jangan cuma cek res.status 200/201.
        if (res.data?.status === false) {
          let message = res.data?.message ?? 'Pengajuan gagal disimpan.';
          const limit = res.data?.data?.limit;
          const current = res.data?.data?.current;
          if (limit !== undefined && current !== undefined) {
            message += ` (${current}/${limit} kasbon aktif)`;
          }
          notifStore.showDialogWarning('Pengajuan Ditolak', message);
        } else if (res.status === 200 || res.status === 201) {
          // kasbon_no digenerate sistem saat pengajuan (format KB{YY}{NNNN}) — tampilkan sebagai konfirmasi
          const kasbonNo = res.data?.data?.kasbon_no;
          const message = res.data?.message ?? 'Pengajuan kasbon berhasil dibuat.';
          notifStore.showDialogSuccess('Berhasil', kasbonNo ? `${message} No. Kasbon: ${kasbonNo}` : message);
          this.dialog.form = false;
          this.resetForm();
          await this.fetchData();
          this.fetchOutstandingCounts();
        } else {
          utilStore.onApiResponse(res);
        }
      } catch (error) {
        utilStore.onError(error);
      } finally {
        notifStore.disableLoading();
      }
    },

    // Dipanggil tiap form.employee_nik berubah. NIK yang sudah limit tidak boleh terpilih: pilihannya
    // langsung dikosongkan lagi dan alasannya ditampilkan di bawah field (early information untuk PIC).
    onEmployeeSelected(nik: string | null) {
      if (!nik) return; // dikosongkan (termasuk oleh fungsi ini sendiri) — keterangan dibiarkan terbaca
      const selected = this.employeeOptions.find((o) => o.value === nik);
      if (selected?.disabled) {
        this.employeeLimitNotice = `${selected.label} (${nik}) ${selected.disabledReason}.`;
        this.form.employee_nik = '';
      } else {
        this.employeeLimitNotice = '';
      }
    },

    openCreate() {
      this.resetForm();
      this.employeeLimitNotice = '';
      this.dialog.form = true;
      // Ambil ulang tiap form dibuka supaya status limit selalu terbaru
      this.fetchOutstandingCounts();
    },

    openDetail(row: CashAdvanceRequestItem) {
      this.selectedRow = row;
      this.dialog.detail = true;
    },

    resetForm() {
      this.form = {
        kasbon_date: today(),
        employee_nik: '',
        category_id: null,
        description: '',
        amount: null,
        usage_date: today(),
        created_by: getCreatedBy(),
      };
    },
  },
});
