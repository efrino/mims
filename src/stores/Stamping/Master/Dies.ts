import { defineStore } from "pinia";
import {
  getDies,
  insertDies,
  updateDies,
  deleteDies,
  activatedDies,
  getDiesPairing,
  storeDiesPairing,
  deleteDiesPairing
} from "@/services/Stamping/Master/Dies";
import { useNotificationStore } from "@/stores/notification";
import { useUtilityStore } from "@/stores/utility";
import { useAuthStore } from "@/stores/auth";
import type { PressDies, PressDiesForm, DiesPairing } from "@/types/Stamping/Master/Dies";

export const useDiesStore = defineStore("DiesStore", {
  state: () => ({
    dataTable: [] as PressDies[],
    pairings: [] as DiesPairing[],
    loading: false,
    filterIsDeleted: '0',
    isModalAddOpen: false,
    isModalEditOpen: false,
    formData: {
      id: "",
      dies_code: "",
      dies_name: "",
      part_number: "",
      tonnage_required: "",
      dies_length: "",
      dies_width: "",
      note: ""
    } as PressDiesForm,
  }),
  actions: {
    async fetchMasterData() {
      const notificationStore = useNotificationStore();
      const utilityStore = useUtilityStore();

      try {
        this.loading = true;
        const res = await getDies(this.filterIsDeleted);

        if (res.data.status === "success") {
          this.dataTable = res.data.data;
        } else {
          notificationStore.showDialogWarning("Warning", "Gagal mengambil data dies");
        }
      } catch (error) {
        console.error("Error fetching dies:", error);
        utilityStore.onError(error);
      } finally {
        this.loading = false;
      }
    },

    async fetchPairings() {
      const notificationStore = useNotificationStore();
      const utilityStore = useUtilityStore();

      try {
        const res = await getDiesPairing();
        if (res.data.status === "success") {
          this.pairings = res.data.data;
        } else {
          notificationStore.showDialogWarning("Warning", "Gagal mengambil data pairing");
        }
      } catch (error) {
        console.error("Error fetching dies pairing:", error);
        utilityStore.onError(error);
      }
    },

    async addData() {
      const notificationStore = useNotificationStore();
      const utilityStore = useUtilityStore();
      const authStore = useAuthStore();

      try {
        notificationStore.loading = true;

        if (!this.formData.dies_code) {
          notificationStore.showDialogWarning("Warning", "Kode Dies wajib diisi!");
          return;
        }

        const payload = {
          ...this.formData,
          created_by: authStore.user.username || 'SYSTEM'
        };

        const res = await insertDies(payload);

        if (res.data.status === "success") {
          await this.fetchMasterData();
          notificationStore.showDialogSuccess("Success", "Berhasil menambahkan data");
          this.isModalAddOpen = false;
          this.resetForm();
        } else {
          notificationStore.showDialogWarning("Warning", res.data.message || "Gagal menambahkan data");
        }
      } catch (error) {
        console.error("Error adding dies:", error);
        utilityStore.onError(error);
      } finally {
        notificationStore.disableLoading();
      }
    },

    editData(id: number | string) {
      const selected = this.dataTable.find(e => e.id == id);

      if (!selected) {
        const notificationStore = useNotificationStore();
        notificationStore.showDialogWarning("Warning", "Data tidak tersedia!");
        return;
      }

      this.formData = {
        id: selected.id,
        dies_code: selected.dies_code || "",
        dies_name: selected.dies_name || "",
        part_number: selected.part_number || "",
        tonnage_required: selected.tonnage_required || "",
        dies_length: selected.dies_length || "",
        dies_width: selected.dies_width || "",
        note: selected.note || ""
      };

      this.isModalEditOpen = true;
    },

    async updateData() {
      const notificationStore = useNotificationStore();
      const utilityStore = useUtilityStore();
      const authStore = useAuthStore();

      try {
        notificationStore.loading = true;

        if (!this.formData.id || !this.formData.dies_code) {
          notificationStore.showDialogWarning("Warning", "ID dan Kode Dies wajib ada!");
          return;
        }

        const payload = {
          ...this.formData,
          updated_by: authStore.user.username || 'SYSTEM'
        };

        const res = await updateDies(this.formData.id, payload);

        if (res.data.status === "success") {
          await this.fetchMasterData();
          notificationStore.showDialogSuccess("Success", "Berhasil mengupdate data");
          this.isModalEditOpen = false;
          this.resetForm();
        } else {
          notificationStore.showDialogWarning("Warning", res.data.message || "Gagal mengupdate data");
        }
      } catch (error) {
        console.error("Error updating dies:", error);
        utilityStore.onError(error);
      } finally {
        notificationStore.disableLoading();
      }
    },

    async deleteData(id: number | string) {
      const notificationStore = useNotificationStore();
      const utilityStore = useUtilityStore();
      const authStore = useAuthStore();

      try {
        notificationStore.loading = true;
        const res = await deleteDies(id, authStore.user.username || 'SYSTEM');

        if (res.data.status === "success") {
          await this.fetchMasterData();
          notificationStore.showDialogSuccess("Success", res.data.message || "Berhasil menghapus data");
        } else {
          notificationStore.showDialogWarning("Warning", res.data.message || "Gagal menghapus data");
        }
      } catch (error) {
        console.error("Error deleting dies:", error);
        utilityStore.onError(error);
      } finally {
        notificationStore.disableLoading();
      }
    },

    async activateData(id: number | string) {
      const notificationStore = useNotificationStore();
      const utilityStore = useUtilityStore();
      const authStore = useAuthStore();

      try {
        notificationStore.loading = true;
        const res = await activatedDies(id, authStore.user.username || 'SYSTEM');

        if (res.data.status === "success") {
          await this.fetchMasterData();
          notificationStore.showDialogSuccess("Success", res.data.message || "Berhasil mengaktifkan data");
        } else {
          notificationStore.showDialogWarning("Warning", res.data.message || "Gagal mengaktifkan data");
        }
      } catch (error) {
        console.error("Error activating dies:", error);
        utilityStore.onError(error);
      } finally {
        notificationStore.disableLoading();
      }
    },

    async pairDiesToMachine(diesId: number, machineId: number) {
      const notificationStore = useNotificationStore();
      const utilityStore = useUtilityStore();
      const authStore = useAuthStore();

      try {
        const res = await storeDiesPairing(diesId, machineId, authStore.user.username || 'SYSTEM');
        if (res.data.status === "success") {
          await this.fetchPairings();
          notificationStore.showDialogSuccess("Success", "Dies berhasil dipasangkan ke mesin");
        } else {
          notificationStore.showDialogWarning("Warning", res.data.message || "Gagal memasangkan dies");
        }
      } catch (error) {
        console.error("Error pairing dies:", error);
        utilityStore.onError(error);
      }
    },

    async unpairDies(pairingId: number) {
      const notificationStore = useNotificationStore();
      const utilityStore = useUtilityStore();
      const authStore = useAuthStore();

      try {
        const res = await deleteDiesPairing(pairingId, authStore.user.username || 'SYSTEM');
        if (res.data.status === "success") {
          await this.fetchPairings();
          notificationStore.showDialogSuccess("Success", "Pairing berhasil dilepas");
        } else {
          notificationStore.showDialogWarning("Warning", res.data.message || "Gagal melepas pairing");
        }
      } catch (error) {
        console.error("Error unpairing dies:", error);
        utilityStore.onError(error);
      }
    },

    resetForm() {
      this.formData = {
        id: "",
        dies_code: "",
        dies_name: "",
        part_number: "",
        tonnage_required: "",
        dies_length: "",
        dies_width: "",
        note: ""
      };
    }
  }
});
