import { defineStore } from 'pinia';
import { useNotificationStore } from '@/stores/notification';
import { useAuthStore } from '@/stores/auth';
import { useUtilityStore } from '@/stores/utility';
import { categoryService } from '@/services/Finance/Master/CategoryService';
import type { CategoryItem, CategoryForm } from '@/types/Finance/Master/Category';

const isSuccessStatus = (status: number) => status === 200 || status === 201;

const emptyForm = (): CategoryForm => ({
  category: '',
  due_days: null,
});

export const useCategoryStore = defineStore('finance-master-category', {
  state: () => ({
    tableRows: [] as CategoryItem[],
    form: emptyForm() as CategoryForm,
    dialog: {
      form: false,
    },
    selectedRow: null as CategoryItem | null,
    loading: false,
    permissions: {
      create: useAuthStore().checkAccess('Finance.Create.Category'),
      update: useAuthStore().checkAccess('Finance.Update.Category'),
      delete: useAuthStore().checkAccess('Finance.Delete.Category'),
    },
  }),

  getters: {
    activeRows: (state) => state.tableRows.filter((r) => Number(r.active) !== 0),
  },

  actions: {
    async fetchData() {
      const notifStore = useNotificationStore();
      const utilStore = useUtilityStore();
      this.loading = true;
      notifStore.loading = true;
      try {
        const res = await categoryService.fetchList();
        // GET category kadang membalas array polos (tanpa envelope {status,message,data}) — beda dari
        // endpoint finance lain yang selalu terbungkus. Dukung dua-duanya supaya tabel tidak kosong.
        const payload = res.data;
        const rows = Array.isArray(payload) ? payload : (payload?.data ?? null);
        if (isSuccessStatus(res.status) && rows !== null && payload?.status !== false) {
          this.tableRows = rows as CategoryItem[];
        } else {
          notifStore.showDialogWarning('Gagal', payload?.message ?? 'Gagal memuat data kategori.');
        }
      } catch (error) {
        utilStore.onError(error);
      } finally {
        this.loading = false;
        notifStore.disableLoading();
      }
    },

    openAdd() {
      this.selectedRow = null;
      this.form = emptyForm();
      this.dialog.form = true;
    },

    openEdit(row: CategoryItem) {
      this.selectedRow = row;
      this.form = {
        category: row.category,
        due_days: row.due_days,
      };
      this.dialog.form = true;
    },

    async onSubmit() {
      const notifStore = useNotificationStore();
      const utilStore = useUtilityStore();
      notifStore.loading = true;
      try {
        const res = this.selectedRow
          ? await categoryService.update(this.selectedRow.id, this.form)
          : await categoryService.create(this.form);
        if (isSuccessStatus(res.status) && res.data?.status !== false) {
          notifStore.showDialogSuccess('Berhasil', res.data?.message ?? 'Kategori berhasil disimpan.');
          this.dialog.form = false;
          await this.fetchData();
        } else {
          notifStore.showDialogWarning('Gagal', res.data?.message ?? 'Kategori gagal disimpan.');
        }
      } catch (error) {
        utilStore.onError(error);
      } finally {
        notifStore.disableLoading();
      }
    },

    async onToggle(row: CategoryItem) {
      const notifStore = useNotificationStore();
      const utilStore = useUtilityStore();
      const willActivate = Number(row.active) === 0;
      notifStore.showConfirm(
        willActivate ? 'Aktifkan Kategori' : 'Nonaktifkan Kategori',
        `${willActivate ? 'Aktifkan' : 'Nonaktifkan'} kategori "${row.category}"?`,
        async () => {
          notifStore.loading = true;
          try {
            const res = await categoryService.toggle(row.id);
            if (isSuccessStatus(res.status) && res.data?.status !== false) {
              notifStore.showDialogSuccess('Berhasil', res.data?.message ?? 'Status kategori berhasil diubah.');
              await this.fetchData();
            } else {
              notifStore.showDialogWarning('Gagal', res.data?.message ?? 'Status kategori gagal diubah.');
            }
          } catch (error) {
            utilStore.onError(error);
          } finally {
            notifStore.disableLoading();
          }
        }
      );
    },

    async onDelete(row: CategoryItem) {
      const notifStore = useNotificationStore();
      const utilStore = useUtilityStore();
      notifStore.showConfirm(
        'Hapus Kategori',
        `Hapus kategori "${row.category}"? Tindakan ini tidak dapat dibatalkan.`,
        async () => {
          notifStore.loading = true;
          try {
            const res = await categoryService.remove(row.id);
            if (isSuccessStatus(res.status) && res.data?.status !== false) {
              notifStore.showDialogSuccess('Berhasil', res.data?.message ?? 'Kategori berhasil dihapus.');
              await this.fetchData();
            } else {
              notifStore.showDialogWarning('Gagal', res.data?.message ?? 'Kategori gagal dihapus.');
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
