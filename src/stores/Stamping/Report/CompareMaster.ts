import { defineStore } from "pinia";
import { useNotificationStore } from "@/stores/notification";
import { useUtilityStore } from "@/pinia/utility";

import type { CompareMasterRow } from '@/types/Stamping/Report/reportStockV2';
import { filterItems } from '@/utils/helpers/filtersItem';
import { reportStockV2Service } from "@/services/Stamping/Report/StockServiceV2";

const utilityStore = useUtilityStore();
const today = utilityStore.getCurrentShift().date;

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export const useCompareMasterStore = defineStore('StampingCompareMaster', {
  state: () => ({
    range: {
      start: daysAgo(30),
      end: today,
    },
    filters: {
      part_number: "",
      status: "" as "" | "matched" | "missing",
    },
    items: [] as CompareMasterRow[],
  }),
  actions: {
    filteredItems() {
      const byText = filterItems(this.items, { part_number: this.filters.part_number });
      if (!this.filters.status) return byText;
      return byText.filter((item) => item.status === this.filters.status);
    },

    async fetchCompare() {
      const notificationStore = useNotificationStore();
      notificationStore.loading = true;

      try {
        const response = await reportStockV2Service.compareMaster(this.range.start, this.range.end);

        if (response.status === 200) {
          this.items = response.data;
        } else {
          utilityStore.onApiResponse(response);
        }
      } catch (err) {
        utilityStore.onError(err);
      } finally {
        notificationStore.disableLoading();
      }
    },
  },
});
