import { fetchdataTable } from "@/services/Logistik/IRM/Transaction/ShortageStore";
import { useNotificationStore } from "@/stores/notification";
import { useUtilityStore } from "@/stores/utility";
import type { FilterDate, ShortageStockTable } from "@/types/Logistik/IRM/Transaction/ShortageStock";
import { defineStore } from "pinia";

const utilityStore = useUtilityStore();
const date = utilityStore.getCurrentShift();
const notificationStore = useNotificationStore();

export const useShortageStock = defineStore('ShortageStock', {
  state: () => ({
    filterDate: {
      start: date.date,
      end: '',
    } as FilterDate,
    dataTable: [] as ShortageStockTable[],
  }),
  actions: {
    async fetchData() {
      try {
        notificationStore.loading = true;

        const res = await fetchdataTable({ ...this.filterDate, end: this.filterDate.end || this.filterDate.start });

        if (res.status !== 200) {
          notificationStore.showDialogWarning(
            "Warning",
            "Terjadi kesalahan saat mengambil data"
          );
          return;
        }

        this.dataTable = res.data;
        
      } catch (error) {
        console.log("err: ", error);
        utilityStore.onError(error);
      } finally {
        notificationStore.disableLoading();
      }
    }
  }
})