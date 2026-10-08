import { defineStore } from "pinia";
import {
  getSpecMachinePress,
  insertSpecMachinePress,
  updateSpecMachinePress,
  deleteSpecMachinePress,
  activatedSpecMachinePress,
  updateLayoutPress
} from "@/services/Stamping/Master/SpecMachine";
import { useNotificationStore } from "@/stores/notification";
import { useUtilityStore } from "@/stores/utility";
import { useAuthStore } from "@/stores/auth";
import type { SpecMachinePress, SpecMachinePressForm } from "@/types/Stamping/Master/SpecMachine";

const emptyForm = (): SpecMachinePressForm => ({
  id: "",
  area: "",
  line: "",
  machine: "",
  press_type: "",
  tonnage: "",
  stroke: "",
  die_size: "",
  note: ""
});

export const useSpecMachinePressStore = defineStore("SpecMachinePressStore", {
  state: () => ({
    dataTable: [] as SpecMachinePress[],
    loading: false,
    filterIsDeleted: '0',
    isModalAddOpen: false,
    isModalEditOpen: false,
    formData: emptyForm(),
  }),
  actions: {
    async fetchMasterData() {
      const notificationStore = useNotificationStore();
      const utilityStore = useUtilityStore();

      try {
        this.loading = true;
        const res = await getSpecMachinePress(undefined, undefined, this.filterIsDeleted);

        if (res.data.status === "success") {
          this.dataTable = res.data.data;
        } else {
          notificationStore.showDialogWarning("Warning", "Gagal mengambil data spec machine press");
        }
      } catch (error) {
        console.error("Error fetching press spec machine:", error);
        utilityStore.onError(error);
      } finally {
        this.loading = false;
      }
    },

    async addData() {
      const notificationStore = useNotificationStore();
      const utilityStore = useUtilityStore();
      const authStore = useAuthStore();

      try {
        notificationStore.loading = true;

        if (!this.formData.machine) {
          notificationStore.showDialogWarning("Warning", "Machine wajib diisi!");
          return;
        }

        const payload = {
          ...this.formData,
          created_by: authStore.user.username || 'SYSTEM'
        };

        const res = await insertSpecMachinePress(payload);

        if (res.data.status === "success") {
          await this.fetchMasterData();
          notificationStore.showDialogSuccess("Success", "Berhasil menambahkan data");
          this.isModalAddOpen = false;
          this.resetForm();
        } else {
          notificationStore.showDialogWarning("Warning", res.data.message || "Gagal menambahkan data");
        }
      } catch (error) {
        console.error("Error adding data:", error);
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
        area: selected.area || "",
        line: selected.line || "",
        machine: selected.machine || "",
        press_type: selected.press_type || "",
        tonnage: selected.tonnage || "",
        stroke: selected.stroke || "",
        die_size: selected.die_size || "",
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

        if (!this.formData.id || !this.formData.machine) {
          notificationStore.showDialogWarning("Warning", "ID dan Machine wajib ada!");
          return;
        }

        const payload = {
          ...this.formData,
          updated_by: authStore.user.username || 'SYSTEM'
        };

        const res = await updateSpecMachinePress(this.formData.id, payload);

        if (res.data.status === "success") {
          await this.fetchMasterData();
          notificationStore.showDialogSuccess("Success", "Berhasil mengupdate data");
          this.isModalEditOpen = false;
          this.resetForm();
        } else {
          notificationStore.showDialogWarning("Warning", res.data.message || "Gagal mengupdate data");
        }
      } catch (error) {
        console.error("Error updating data:", error);
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
        const res = await deleteSpecMachinePress(id, authStore.user.username || 'SYSTEM');

        if (res.data.status === "success") {
          await this.fetchMasterData();
          notificationStore.showDialogSuccess("Success", res.data.message || "Berhasil menghapus data");
        } else {
          notificationStore.showDialogWarning("Warning", res.data.message || "Gagal menghapus data");
        }
      } catch (error) {
        console.error("Error deleting data:", error);
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
        const updated_by = authStore.user.username || 'SYSTEM';
        const res = await activatedSpecMachinePress(id, updated_by);

        if (res.data.status === "success") {
          await this.fetchMasterData();
          notificationStore.showDialogSuccess("Success", res.data.message || "Berhasil mengaktifkan data");
        } else {
          notificationStore.showDialogWarning("Warning", res.data.message || "Gagal mengaktifkan data");
        }
      } catch (error) {
        console.error("Error activating data:", error);
        utilityStore.onError(error);
      } finally {
        notificationStore.disableLoading();
      }
    },

    resetForm() {
      this.formData = emptyForm();
    },

    async saveLayout(layoutData: any[]) {
      const notificationStore = useNotificationStore();
      const utilityStore = useUtilityStore();
      const authStore = useAuthStore();

      try {
        notificationStore.loading = true;
        const updated_by = authStore.user.username || 'SYSTEM';
        const res = await updateLayoutPress(layoutData, updated_by);

        if (res.data.status === "success") {
          await this.fetchMasterData();
          notificationStore.showDialogSuccess("Success", res.data.message || "Berhasil menyimpan layout");
        } else {
          notificationStore.showDialogWarning("Warning", res.data.message || "Gagal menyimpan layout");
        }
      } catch (error) {
        console.error("Error saving layout:", error);
        utilityStore.onError(error);
      } finally {
        notificationStore.disableLoading();
      }
    },

    // Pindahkan mesin antar Line dari Factory Layout (drag & drop). Beda
    // dengan saveLayout (pos_row/pos_col) — ini mengubah field `line`, jadi
    // harus lewat UpdateSpecMachine (full update) per mesin yang field
    // `line`-nya berubah, sambil mempertahankan field lain apa adanya.
    async reassignLines(changes: { id: number | string; line: string }[]) {
      const notificationStore = useNotificationStore();
      const utilityStore = useUtilityStore();
      const authStore = useAuthStore();

      try {
        notificationStore.loading = true;
        const updated_by = authStore.user.username || 'SYSTEM';
        let success = 0;
        const errors: string[] = [];

        for (const change of changes) {
          const original = this.dataTable.find(m => String(m.id) === String(change.id));
          if (!original) continue;

          const payload = {
            area: original.area || '',
            line: change.line,
            machine: original.machine,
            press_type: original.press_type || '',
            tonnage: original.tonnage || '',
            stroke: original.stroke || '',
            die_size: original.die_size || '',
            note: original.note || '',
            updated_by
          };

          const res = await updateSpecMachinePress(change.id, payload as any);
          if (res.data.status === 'success') success++;
          else errors.push(`${original.machine}: ${res.data.message || 'gagal'}`);
        }

        await this.fetchMasterData();

        if (errors.length === 0) {
          notificationStore.showDialogSuccess('Success', `${success} mesin berhasil dipindahkan Line-nya`);
        } else {
          notificationStore.showDialogWarning('Warning', `${success} berhasil, ${errors.length} gagal: ${errors.join('; ')}`);
        }
      } catch (error) {
        console.error('Error reassigning lines:', error);
        utilityStore.onError(error);
      } finally {
        notificationStore.disableLoading();
      }
    }
  }
});
