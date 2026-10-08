import { defineStore } from "pinia";
import { getMasterPartGlc } from "@/services/PCD/Welding/welding_glc";
import { useNotificationStore } from "@/stores/notification";
import { useUtilityStore } from "@/stores/utility";
import type { WeldingGlcPart } from "@/types/PCD/Welding/welding_glc";

export const useWeldingGlcStore = defineStore("WeldingGlcStore", {
  state: () => ({
    dataTable: [] as WeldingGlcPart[],
    loading: false,
  }),
  actions: {
    async fetchMasterPartData() {
      const notificationStore = useNotificationStore();
      const utilityStore = useUtilityStore();
      
      try {
        this.loading = true;
        notificationStore.loading = true;

        const res = await getMasterPartGlc();

        if (res.data.status === "success") {
          this.dataTable = res.data.data;
        } else {
          notificationStore.showDialogWarning(
            "Warning",
            "Gagal mengambil data"
          );
        }
      } catch (error) {
        console.error("Error fetching welding glc master data:", error);
        utilityStore.onError(error);
      } finally {
        this.loading = false;
        notificationStore.disableLoading();
      }
    },
  },
});
