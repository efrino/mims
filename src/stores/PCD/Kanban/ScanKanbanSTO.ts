import { useNotificationStore } from "@/stores/notification";
import { defineStore } from "pinia";

const notificationStore = useNotificationStore();

export const useScanKanbanSTOStore = defineStore('scanEKanban', {
  state: () => ({
    barcodeId: "" as string,
  }),
  actions: {
    async onScan() {
      try {
        notificationStore.loading = true;

        

      } catch (error) {
        console.error("Err:", error);
      } finally {
        notificationStore.disableLoading();
      }
    }
  }
});