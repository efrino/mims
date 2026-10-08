import { defineStore } from "pinia";
import {
  getSpecMachine,
  insertSpecMachine,
  updateSpecMachine,
  deleteSpecMachine,
  activatedSpecMachine,
  updateLayout
} from "@/services/Welding/Master/SpecMachine";
import { useNotificationStore } from "@/stores/notification";
import { useUtilityStore } from "@/stores/utility";
import { useAuthStore } from "@/stores/auth";
import type { SpecMachine, SpecMachineForm } from "@/types/Welding/Master/SpecMachine";
import { getSpecMachineAreaList } from "@/services/Welding/Master/SpecMachine";

const emptyForm = (): SpecMachineForm => ({
  id: "",
  area: "",
  line: "",
  machine: "",
  tipe_gun: "GUN X",
  gun_type_detail: null,
  stroke_dress: 350,
  dress_tip_change: 2450,
  downtime: 5.17,
  upper_holder: "",
  lower_holder: "",
  kva: "",
  nut_type: "",
  nut_feeder: "",
  rotary_holder: "",
  handy_navi: "",
  robo_navi: "",
  gate_sensor: "",
  nut_feeder_type: "",
  robo_navi_integrated: null,
  handy_navi_integrated: null,
  gate_sensor_integrated: null,
  is_polybox: "0",
  is_pallet: "0",
  note: ""
});

export const useSpecMachineStore = defineStore("SpecMachineStore", {
  state: () => ({
    dataTable: [] as SpecMachine[],
    areaList: [] as string[],
    loading: false,
    filterIsDeleted: '0',
    isModalAddOpen: false,
    isModalEditOpen: false,
    formData: {
      id: "",
      area: "",
      line: "",
      machine: "",
      tipe_gun: "GUN X",
      gun_type_detail: null,
      stroke_dress: 350,
      dress_tip_change: 2450,
      downtime: 5.17,
      upper_holder: "",
      lower_holder: "",
      kva: "",
      id_ms_nut: null as number | string | null,
      nut_type: "",
      nut_feeder: "",
      rotary_holder: "",
      handy_navi: "",
      robo_navi: "",
      gate_sensor: "",
      nut_feeder_type: "",
      robo_navi_integrated: null,
      handy_navi_integrated: null,
      gate_sensor_integrated: null,
      is_polybox: "0",
      is_pallet: "0",
      note: ""
    } as SpecMachineForm,
  }),
  getters: {
    permissions: (state) => {
      const authStore = useAuthStore();
      return {
        create: authStore.checkAccess("Master.Create.SpecMachine"),
        update: authStore.checkAccess("Master.Update.SpecMachine"),
        download: authStore.checkAccess("Master.Download.SpecMachine"),
      };
    }
  },
  actions: {
    /**
     * Beri nomor urut integrasi (robo/handy navi, gate sensor) untuk flag yang aktif,
     * dan kosongkan nomornya saat flag dimatikan.
     */
    assignIntegrationNumbers() {
      const pairs = [
        { flag: 'robo_navi', number: 'robo_navi_integrated' },
        { flag: 'handy_navi', number: 'handy_navi_integrated' },
        { flag: 'gate_sensor', number: 'gate_sensor_integrated' }
      ] as const;

      for (const { flag, number } of pairs) {
        if (this.formData[flag] !== '1') {
          this.formData[number] = null;
          continue;
        }
        if (this.formData[number]) continue;

        const max = Math.max(0, ...this.dataTable.map(m => parseInt(m[number] as any) || 0));
        this.formData[number] = max + 1;
      }
    },

    async fetchMasterData() {
      const notificationStore = useNotificationStore();
      const utilityStore = useUtilityStore();
      
      try {
        this.loading = true;
        const res = await getSpecMachine(undefined, undefined, this.filterIsDeleted);
        
        if (res.data.status === "success") {
          this.dataTable = res.data.data;
        } else {
          notificationStore.showDialogWarning("Warning", "Gagal mengambil data spec machine");
        }
      } catch (error) {
        console.error("Error fetching welding spec machine:", error);
        utilityStore.onError(error);
      } finally {
        this.loading = false;
      }
    },

    async fetchAreaList() {
      try {
        const res = await getSpecMachineAreaList();
        if (res.data?.status === "success" && Array.isArray(res.data.data)) {
          this.areaList = res.data.data;
        }
      } catch (err) {
        console.error("Error fetching area list:", err);
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

        this.assignIntegrationNumbers();

        const payload = {
          ...this.formData,
          created_by: authStore.user.username || 'SYSTEM'
        };
        
        const res = await insertSpecMachine(payload);
        
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
        tipe_gun: selected.tipe_gun || "GUN X",
        gun_type_detail: selected.gun_type_detail || null,
        stroke_dress: selected.stroke_dress ?? 350,
        dress_tip_change: selected.dress_tip_change ?? 2450,
        downtime: selected.downtime ?? 5.17,
        upper_holder: selected.upper_holder || "",
        lower_holder: selected.lower_holder || "",
        kva: selected.kva || "",
        id_ms_nut: selected.id_ms_nut || null,
        nut_type: selected.nut_type || "",
        nut_feeder: selected.nut_feeder || "",
        rotary_holder: selected.rotary_holder || "",
        handy_navi: selected.handy_navi || "",
        robo_navi: selected.robo_navi || "",
        gate_sensor: selected.gate_sensor || "",
        nut_feeder_type: selected.nut_feeder_type || "",
        robo_navi_integrated: selected.robo_navi_integrated || null,
        handy_navi_integrated: selected.handy_navi_integrated || null,
        gate_sensor_integrated: selected.gate_sensor_integrated || null,
        is_polybox: selected.is_polybox || "0",
        is_pallet: selected.is_pallet || "0",
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

        this.assignIntegrationNumbers();

        const payload = {
          ...this.formData,
          updated_by: authStore.user.username || 'SYSTEM'
        };
        
        const res = await updateSpecMachine(this.formData.id, payload);
        
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
        const res = await deleteSpecMachine(id, authStore.user.username || 'SYSTEM');
        
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
        const res = await activatedSpecMachine(id, updated_by);
        
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
      this.formData = {
        id: "",
        area: "",
        line: "",
        machine: "",
        upper_holder: "",
        lower_holder: "",
        kva: "",
        nut_type: "",
        nut_feeder: "",
        rotary_holder: "",
        handy_navi: "",
        robo_navi: "",
        gate_sensor: "",
        nut_feeder_type: "",
        robo_navi_integrated: null,
        handy_navi_integrated: null,
        gate_sensor_integrated: null,
        is_polybox: "0",
        is_pallet: "0",
        note: ""
      };
    },
    
    async saveLayout(layoutData: any[]) {
      const notificationStore = useNotificationStore();
      const utilityStore = useUtilityStore();
      const authStore = useAuthStore();
      
      try {
        notificationStore.loading = true;
        const updated_by = authStore.user.username || 'SYSTEM';
        const res = await updateLayout(layoutData, updated_by);
        
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
    }
  }
});
