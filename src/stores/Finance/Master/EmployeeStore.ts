import { defineStore } from 'pinia';
import { useNotificationStore } from '@/stores/notification';
import { useAuthStore } from '@/stores/auth';
import { useUtilityStore } from '@/stores/utility';
import { employeeService } from '@/services/Finance/Master/EmployeeService';
import type {
  WhitelistEmployee,
  SourceEmployee,
  EmployeeEditForm,
} from '@/types/Finance/Master/Employee';

// POST /employees_ca bisa membalas 201 Created untuk penambahan baru, bukan cuma 200
const isSuccessStatus = (status: number) => status === 200 || status === 201;

const emptyEditForm = (): EmployeeEditForm => ({
  name: '',
  gender: '',
  department: '',
  division: '',
  job_title: '',
  emp_status: '',
  kasbon_limit: null,
  document_filename: null,
  document_base64: null,
});

const MAX_DOCUMENT_SIZE = 5 * 1024 * 1024; // 5 MB, sesuai batas backend

const readFileAsBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

export const useEmployeeStore = defineStore('finance-master-employee', {
  state: () => ({
    tableRows: [] as WhitelistEmployee[],
    availableOptions: [] as SourceEmployee[],
    departmentOptions: [] as string[],
    stagingList: [] as SourceEmployee[],
    addKasbonLimit: 3 as number | null,
    pickerNik: null as string | null,
    editForm: emptyEditForm() as EmployeeEditForm,
    // Nama file yang baru dipilih di form edit (belum ter-upload) — dipakai untuk preview sebelum Simpan
    editDocumentPreviewName: null as string | null,
    dialog: {
      add: false,
      edit: false,
      detail: false,
    },
    selectedRow: null as WhitelistEmployee | null,
    activeListTab: 'active' as 'active' | 'inactive' | 'all',
    loading: false,
    permissions: {
      create: useAuthStore().checkAccess('Finance.Create.Employee'),
      update: useAuthStore().checkAccess('Finance.Update.Employee'),
      delete: useAuthStore().checkAccess('Finance.Delete.Employee'),
    },
  }),

  getters: {
    activeRows:   (state) => state.tableRows.filter((r) => Number(r.active) !== 0),
    inactiveRows: (state) => state.tableRows.filter((r) => Number(r.active) === 0),

    // Karyawan source yang belum masuk whitelist DAN belum di-staging di form Add
    availablePickerOptions: (state) => {
      const stagedNiks = new Set(state.stagingList.map((s) => s.nik));
      return state.availableOptions
        .filter((e) => !stagedNiks.has(e.nik))
        .map((e) => ({
          value: e.nik,
          label: e.name,
          sublabel: [e.department, e.job_title].filter(Boolean).join(' · '),
        }));
    },
  },

  actions: {
    async fetchData() {
      const notifStore = useNotificationStore();
      const utilStore = useUtilityStore();
      this.loading = true;
      notifStore.loading = true;
      try {
        const res = await employeeService.fetchList();
        if (isSuccessStatus(res.status) && res.data?.status !== false) {
          this.tableRows = (res.data?.data ?? []) as WhitelistEmployee[];
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

    async fetchAvailable() {
      const utilStore = useUtilityStore();
      try {
        const res = await employeeService.fetchAvailable();
        if (isSuccessStatus(res.status) && res.data?.status !== false) {
          this.availableOptions = (res.data?.data ?? []) as SourceEmployee[];
        }
      } catch (error) {
        utilStore.onError(error);
      }
    },

    async fetchDepartmentOptions() {
      const utilStore = useUtilityStore();
      try {
        const res = await employeeService.fetchSourceOptions('department');
        if (isSuccessStatus(res.status) && res.data?.status !== false) {
          this.departmentOptions = (res.data?.data ?? []) as string[];
        }
      } catch (error) {
        utilStore.onError(error);
      }
    },

    openAdd() {
      this.stagingList = [];
      this.addKasbonLimit = 3;
      this.pickerNik = null;
      this.dialog.add = true;
      this.fetchAvailable();
    },

    addToStaging(nik: string | null) {
      if (!nik) return;
      const found = this.availableOptions.find((e) => e.nik === nik);
      if (found && !this.stagingList.some((s) => s.nik === nik)) {
        this.stagingList.push(found);
      }
      this.pickerNik = null;
    },

    removeFromStaging(nik: string) {
      this.stagingList = this.stagingList.filter((s) => s.nik !== nik);
    },

    async onSubmitAdd() {
      if (this.stagingList.length === 0) return;
      const notifStore = useNotificationStore();
      const utilStore = useUtilityStore();
      notifStore.loading = true;
      try {
        // kasbon_limit hanya berlaku untuk single add — endpoint batch belum mendukung limit per-NIK,
        // jadi tiap NIK di batch otomatis pakai default backend (3)
        const res = this.stagingList.length === 1
          ? await employeeService.create(this.stagingList[0].nik, this.addKasbonLimit)
          : await employeeService.createBatch(this.stagingList.map((s) => s.nik));
        if (isSuccessStatus(res.status) && res.data?.status !== false) {
          const skipped: string[] = res.data?.data?.skipped ?? [];
          let message = res.data?.message ?? 'Karyawan berhasil ditambahkan ke whitelist.';
          if (skipped.length > 0) {
            message += ` (dilewati karena sudah ada: ${skipped.join(', ')})`;
          }
          notifStore.showDialogSuccess('Berhasil', message);
          this.dialog.add = false;
          this.stagingList = [];
          await this.fetchData();
          await this.fetchAvailable();
        } else {
          utilStore.onApiResponse(res);
        }
      } catch (error) {
        utilStore.onError(error);
      } finally {
        notifStore.disableLoading();
      }
    },

    async onToggle(row: WhitelistEmployee) {
      const notifStore = useNotificationStore();
      const utilStore = useUtilityStore();
      const willActivate = Number(row.active) === 0;
      notifStore.showConfirm(
        willActivate ? 'Aktifkan Karyawan' : 'Nonaktifkan Karyawan',
        `${willActivate ? 'Aktifkan' : 'Nonaktifkan'} ${row.name} (${row.nik}) dari whitelist kasbon?`,
        async () => {
          notifStore.loading = true;
          try {
            const res = await employeeService.toggle(row.nik);
            if (isSuccessStatus(res.status) && res.data?.status !== false) {
              notifStore.showDialogSuccess('Berhasil', res.data?.message ?? 'Status karyawan berhasil diubah.');
              await this.fetchData();
            } else {
              utilStore.onApiResponse(res);
            }
          } catch (error) {
            utilStore.onError(error);
          } finally {
            notifStore.disableLoading();
          }
        }
      );
    },

    async onDelete(row: WhitelistEmployee) {
      const notifStore = useNotificationStore();
      const utilStore = useUtilityStore();
      notifStore.showConfirm(
        'Hapus dari Whitelist',
        `Hapus permanen ${row.name} (${row.nik}) dari whitelist kasbon? Tindakan ini tidak dapat dibatalkan.`,
        async () => {
          notifStore.loading = true;
          try {
            const res = await employeeService.remove(row.nik);
            if (isSuccessStatus(res.status) && res.data?.status !== false) {
              notifStore.showDialogSuccess('Berhasil', res.data?.message ?? 'Karyawan berhasil dihapus dari whitelist.');
              await this.fetchData();
              await this.fetchAvailable();
            } else {
              utilStore.onApiResponse(res);
            }
          } catch (error) {
            utilStore.onError(error);
          } finally {
            notifStore.disableLoading();
          }
        }
      );
    },

    openDetail(row: WhitelistEmployee) {
      this.selectedRow = row;
      this.dialog.detail = true;
    },

    // GET /document sekarang balas JSON berisi signed URL sementara (valid 5 menit, tervalidasi HMAC,
    // bukan stream file langsung) — harus di-fetch dulu baru dibuka, tidak bisa langsung jadi href.
    // Gunakan hanya saat row.document terisi (dicek di view lewat v-if) supaya tidak pernah hit endpoint
    // ini saat dokumen memang belum ada.
    async viewDocument(nik: string) {
      const notifStore = useNotificationStore();
      const utilStore = useUtilityStore();
      notifStore.loading = true;
      try {
        const res = await employeeService.fetchDocumentUrl(nik);
        if (res.status === 200 && res.data?.status !== false) {
          window.open(res.data.data.url, '_blank');
        } else {
          notifStore.showDialogWarning('Gagal', res.data?.message ?? 'Dokumen tidak dapat dibuka.');
        }
      } catch (error) {
        utilStore.onError(error);
      } finally {
        notifStore.disableLoading();
      }
    },

    openEdit(row: WhitelistEmployee) {
      this.selectedRow = row;
      this.editForm = {
        name: row.name,
        gender: row.gender,
        department: row.department,
        division: row.division,
        job_title: row.job_title,
        emp_status: row.emp_status,
        kasbon_limit: row.kasbon_limit,
        document_filename: null,
        document_base64: null,
      };
      this.editDocumentPreviewName = null;
      this.dialog.edit = true;
    },

    // Validasi client-side (ekstensi & ukuran) sebelum convert ke base64 — hanya untuk UX lebih cepat,
    // validasi final (magic bytes, dsb) tetap di backend. file=null berarti user membatalkan pilihan.
    async setEditDocumentFile(file: File | null) {
      const notifStore = useNotificationStore();
      if (!file) {
        this.editForm.document_filename = null;
        this.editForm.document_base64 = null;
        this.editDocumentPreviewName = null;
        return;
      }
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        notifStore.showDialogWarning('Gagal', 'Dokumen harus berformat PDF.');
        return;
      }
      if (file.size > MAX_DOCUMENT_SIZE) {
        notifStore.showDialogWarning('Gagal', 'Ukuran file maksimal 5 MB.');
        return;
      }
      try {
        const base64 = await readFileAsBase64(file);
        this.editForm.document_filename = file.name;
        this.editForm.document_base64 = base64;
        this.editDocumentPreviewName = file.name;
      } catch (error) {
        useUtilityStore().onError(error);
      }
    },

    async onUpdate() {
      if (!this.selectedRow) return;
      const notifStore = useNotificationStore();
      const utilStore = useUtilityStore();
      notifStore.loading = true;
      try {
        const res = await employeeService.update(this.selectedRow.nik, this.editForm);
        if (isSuccessStatus(res.status) && res.data?.status !== false) {
          notifStore.showDialogSuccess('Berhasil', res.data?.message ?? 'Data karyawan berhasil diupdate.');
          this.dialog.edit = false;
          await this.fetchData();
        } else {
          notifStore.showDialogWarning('Gagal', res.data?.message ?? 'Data karyawan gagal diupdate.');
        }
      } catch (error) {
        utilStore.onError(error);
      } finally {
        notifStore.disableLoading();
      }
    },

    async onSync(row: WhitelistEmployee) {
      const notifStore = useNotificationStore();
      const utilStore = useUtilityStore();
      notifStore.showConfirm(
        'Sync dari Master',
        `Samakan lagi data ${row.name} (${row.nik}) dengan data master karyawan (nama, departemen, divisi, jabatan, status pegawai)?`,
        async () => {
          notifStore.loading = true;
          try {
            const res = await employeeService.syncFromMaster(row.nik);
            if (isSuccessStatus(res.status) && res.data?.status !== false) {
              notifStore.showDialogSuccess('Berhasil', res.data?.message ?? 'Data karyawan berhasil di-sync dari master.');
              await this.fetchData();
            } else {
              utilStore.onApiResponse(res);
            }
          } catch (error) {
            utilStore.onError(error);
          } finally {
            notifStore.disableLoading();
          }
        }
      );
    },
  },
});
