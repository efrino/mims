import { defineStore } from "pinia";
import { 
  getDedicatedMachines, 
  getDedicatedMachineById, 
  postDedicatedMachine, 
  updateDedicatedMachine, 
  deleteDedicatedMachine 
} from "@/services/PCD/Master/DedicatedMachine";
import { useNotificationStore } from "@/stores/notification";
import { useUtilityStore } from "@/stores/utility";
import { useAuthStore } from "@/stores/auth";
import { getAreaList, getActiveMachines, getMasterPart } from "@/services/PCD/Welding/Simulation";

export interface DedicatedMachine {
  id?: number | string;
  part_number: string;
  machine: string;
  machine_alternative?: string;
  area?: string;
  note?: string;
  created_by?: string;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
}

export const useDedicatedMachineStore = defineStore("DedicatedMachineStore", {
  state: () => ({
    dataTable: [] as DedicatedMachine[],
    loading: false,
    detailLoading: false,
    
    // Modal states
    isModalDetailOpen: false,
    isModalFormOpen: false,
    formLoading: false,
    
    // Form data
    selectedItem: null as DedicatedMachine | null,
    formData: {
      part_number: '' as string | string[],
      machine: '',
      machine_alternative: '',
      area: '',
      note: ''
    } as any,
    
    isEditMode: false,
    
    // Dropdown options
    areaOptions: [] as any[],
    machineOptions: [] as any[],
    partOptions: [] as any[],
  }),
  actions: {
    async fetchDropdownOptions(area?: string) {
      try {
        const [areaRes, machineRes, partRes] = await Promise.all([
          getAreaList(),
          getActiveMachines(area),
          getMasterPart(area)
        ]);
        
        if (areaRes.data?.status === "success") {
          this.areaOptions = areaRes.data.data || [];
        }
        if (machineRes.data?.status === "success") {
          this.machineOptions = machineRes.data.machines || [];
        }
        if (partRes.data?.status === "success") {
          this.partOptions = partRes.data.data || [];
        }
      } catch (error) {
        console.error("Error fetching dropdown options:", error);
      }
    },
    async fetchDedicatedMachines(part_number?: string, machine?: string, area?: string, id_simulation?: number | string) {
      this.loading = true;
      const utilityStore = useUtilityStore();
      try {
        const res = await getDedicatedMachines(part_number, machine, area, id_simulation);
        if (res.data?.status === "success") {
          this.dataTable = res.data.data || [];
        } else {
          this.dataTable = [];
        }
      } catch (error) {
        console.error("Error fetching dedicated machines:", error);
        utilityStore.onError(error);
      } finally {
        this.loading = false;
      }
    },

    openCreateModal() {
      this.isEditMode = false;
      this.formData = { part_number: [], machine: '', machine_alternative: '', area: '', note: '' };
      this.selectedItem = null;
      this.isModalFormOpen = true;
    },

    openEditModal(item: DedicatedMachine) {
      this.isEditMode = true;
      this.selectedItem = item;
      this.formData = { ...item };
      this.isModalFormOpen = true;
    },

    closeFormModal() {
      this.isModalFormOpen = false;
      this.formData = { part_number: '', machine: '', machine_alternative: '', area: '', note: '' };
      this.selectedItem = null;
    },

    async saveDedicatedMachine() {
      const notificationStore = useNotificationStore();
      const utilityStore = useUtilityStore();
      const authStore = useAuthStore();
      
      if (!this.formData.part_number || !this.formData.machine) {
        notificationStore.showDialogWarning("Warning", "Part Number dan Machine wajib diisi!");
        return false;
      }

      this.formLoading = true;
      try {
        let res: any;
        const payload = {
          ...this.formData,
          created_by: authStore.user?.username || 'SYSTEM',
          updated_by: authStore.user?.username || 'SYSTEM'
        };

        if (this.isEditMode && this.selectedItem?.id) {
          res = await updateDedicatedMachine(this.selectedItem.id, payload);
        } else {
          if (Array.isArray(this.formData.part_number)) {
            if (this.formData.part_number.length === 0) {
              notificationStore.showDialogWarning("Warning", "Pilih minimal 1 Part Number!");
              this.formLoading = false;
              return false;
            }
            let successCount = 0;
            let total = this.formData.part_number.length;
            for(let p of this.formData.part_number) {
               let singlePayload = { ...payload, part_number: p };
               let singleRes: any = await postDedicatedMachine(singlePayload);
               if (singleRes.status === "success") successCount++;
            }
            res = { status: successCount > 0 ? "success" : "error", message: `Berhasil menyimpan ${successCount} dari ${total} part.` };
          } else {
            res = await postDedicatedMachine(payload);
          }
        }

        if (res.status === "success") {
          notificationStore.showDialogSuccess("Success", res.message || "Data berhasil disimpan!");
          await this.fetchDedicatedMachines();
          this.closeFormModal();
          return true;
        } else {
          notificationStore.showDialogError("Error", res.message || "Gagal menyimpan data.");
          return false;
        }
      } catch (error) {
        console.error("Error saving dedicated machine:", error);
        utilityStore.onError(error);
        return false;
      } finally {
        this.formLoading = false;
      }
    },

    async deleteData(id: number | string) {
      const notificationStore = useNotificationStore();
      const utilityStore = useUtilityStore();
      this.loading = true;
      try {
        const res: any = await deleteDedicatedMachine(id);
        if (res.status === "success") {
          notificationStore.showDialogSuccess("Success", res.message || "Data berhasil dihapus!");
          await this.fetchDedicatedMachines();
          return true;
        } else {
          notificationStore.showDialogError("Error", res.message || "Gagal menghapus data.");
          return false;
        }
      } catch (error) {
        console.error("Error deleting dedicated machine:", error);
        utilityStore.onError(error);
        return false;
      } finally {
        this.loading = false;
      }
    }
  }
});
