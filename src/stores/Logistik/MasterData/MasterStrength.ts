import { defineStore } from 'pinia';
import { useNotificationStore } from '@/pinia/notification';

import {
  fetchMasterStrengthService,
  addMasterStrengthService,
  updateMasterStrengthService
} from '@/services/Logistik/MasterData/MasterStrength';

import type { StrengthItem, StrengthFilters, StrengthFormData, StrengthActionType } from '@/types/Logistik/MasterData/MasterStrength';

/* =======================
 * Factory
 * ======================= */
const createInitialFormData = (): StrengthFormData => ({
  customer: '',
  model: '',
  min_str: '',
  max_str: '',
  unit_str: '',
  location: '',
  cycle_type: '',
  is_active: 1
});

const createInitialFilters = (): StrengthFilters => ({
  keyword: ''
});

export const useMasterStrengthStore = defineStore('master-strength', {
  state: () => ({
    items: [] as StrengthItem[],
    filters: createInitialFilters(),
    formData: createInitialFormData(),
    action: '' as StrengthActionType,
    isDialogOpen: false,
    isLoading: false,
    // Bulk edit: baris yang dicentang di tabel (by reference, data tidak punya id)
    selectedItems: [] as StrengthItem[],
    bulkFormData: [] as StrengthFormData[],
    isBulkDialogOpen: false
  }),

  getters: {
    filteredItems(state): StrengthItem[] {
      const keyword = state.filters.keyword.trim().toLowerCase();
      if (!keyword) return state.items;

      return state.items.filter((item) => Object.values(item).some((value) => String(value).toLowerCase().includes(keyword)));
    }
  },

  actions: {
    /* =======================
     * UI Helpers
     * ======================= */
    resetForm() {
      this.formData = createInitialFormData();
      this.isDialogOpen = false;
      this.selectedItems = [];
      this.fetchMasterStrength();
    },

    resetFilters() {
      this.filters = createInitialFilters();
    },

    openAddDialog() {
      this.formData = createInitialFormData();
      this.action = 'Add';
      this.isDialogOpen = true;
    },

    openEditDialog(data: StrengthItem) {
      // @ts-ignore
      this.formData = { ...data };
      this.action = 'Edit';
      this.isDialogOpen = true;
    },

    closeDialog() {
      this.isDialogOpen = false;
    },

    /* =======================
     * Bulk Edit
     * ======================= */
    isSelected(item: StrengthItem): boolean {
      return this.selectedItems.includes(item);
    },

    toggleSelect(item: StrengthItem) {
      const idx = this.selectedItems.indexOf(item);
      if (idx === -1) this.selectedItems.push(item);
      else this.selectedItems.splice(idx, 1);
    },

    // rows = baris yang sedang tampil di tabel (sudah lewat filter kolom)
    toggleSelectAll(rows: StrengthItem[]) {
      const allSelected = rows.length > 0 && rows.every((r) => this.selectedItems.includes(r));
      this.selectedItems = allSelected ? this.selectedItems.filter((r) => !rows.includes(r)) : [...new Set([...this.selectedItems, ...rows])];
    },

    clearSelection() {
      this.selectedItems = [];
    },

    openBulkEditDialog() {
      if (this.selectedItems.length === 0) return;
      // @ts-ignore
      this.bulkFormData = this.selectedItems.map((item) => ({ ...item }));
      this.isBulkDialogOpen = true;
    },

    closeBulkDialog() {
      this.isBulkDialogOpen = false;
    },

    async onSubmitBulk() {
      const notificationStore = useNotificationStore();

      const invalidIdx = this.bulkFormData.findIndex((row) => !(row.customer && row.model && row.min_str && row.max_str));
      if (invalidIdx !== -1) {
        notificationStore.showAlertWarning(`Data baris ke-${invalidIdx + 1} belum lengkap`);
        return;
      }

      notificationStore.loading = true;
      try {
        // Tidak ada endpoint bulk, jadi update dikirim per baris
        const results = await Promise.allSettled(this.bulkFormData.map((row) => updateMasterStrengthService(row)));
        const failed = results.filter((r) => r.status === 'rejected' || r.value.status !== 200 || !r.value.data?.success).length;
        const success = results.length - failed;

        if (failed === 0) {
          notificationStore.showAlertSuccess(`${success} data berhasil diupdate`);
        } else {
          notificationStore.showAlertWarning(`${success} data berhasil, ${failed} data gagal diupdate`);
        }

        this.isBulkDialogOpen = false;
        this.selectedItems = [];
        this.fetchMasterStrength();
      } finally {
        notificationStore.disableLoading();
      }
    },

    /* =======================
     * API Actions
     * ======================= */
    async fetchMasterStrength() {
      this.isLoading = true;
      try {
        const res = await fetchMasterStrengthService();
        if (res.status === 200) {
          this.items = res.data as StrengthItem[];
        }
      } catch (err) {
        console.error(err);
      } finally {
        this.isLoading = false;
      }
    },

    async onSubmit() {
      const notificationStore = useNotificationStore();
      notificationStore.loading = true;

      if (!this.validateForm()) {
        notificationStore.showAlertWarning('Data belum lengkap');
        notificationStore.disableLoading();
        return;
      }

      try {
        const res =
          this.action === 'Add' ? await addMasterStrengthService(this.formData) : await updateMasterStrengthService(this.formData);

        notificationStore.onApiResponseToastAlert(res, () => {
          this.resetForm();
        });
      } catch (error) {
        console.log((error as any).response.data.messages);

        const message = (error as any).response.data.messages.includes('Duplicate') ? 'Data sudah pernah dibuat' : 'Gagal menyimpan data';
        notificationStore.showAlertWarning(message);
      } finally {
        notificationStore.disableLoading();
      }
    },

    /* =======================
     * Validation
     * ======================= */
    validateForm(): boolean {
      const { customer, model, min_str, max_str } = this.formData;

      if (this.action === 'Add') {
        return Boolean(min_str && max_str);
      }

      return Boolean(customer && model && min_str && max_str);
    }
  }
});
