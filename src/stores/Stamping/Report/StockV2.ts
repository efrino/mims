import { defineStore } from "pinia";
import { useNotificationStore } from "@/stores/notification";
import { useAuthStore } from "@/stores/auth";
import { useUtilityStore } from "@/pinia/utility";

import type {
  FilterDateStateV2,
  FormIfpV2Item,
  DataTableIFPV2Item,
} from '@/types/Stamping/Report/reportStockV2';

import { filterItems } from '@/utils/helpers/filtersItem';
import { reportStockV2Service } from "@/services/Stamping/Report/StockServiceV2";
import { reportStockService } from "@/services/Stamping/Report/StockService";

const authStore = useAuthStore();
const utilityStore = useUtilityStore();
const date = utilityStore.getCurrentShift();

export const useReportStockV2Store = defineStore('ReportStockV2', {
  state: () => ({
    permissions: {
      create: authStore.checkAccess("Report.View.Stock"),
    },
    dialog: {
      formIfp: false,
    },
    filterDate: {
      period: date.period,
      period2: date.period.replace('-', ''),
      month: "",
      year: "",
    } as FilterDateStateV2,
    formIfp: {
      stock_awal: 0,
      part_number: "",
    } as FormIfpV2Item,
    datatablesIFP: {
      headers: [
        { title: "Search Part Number...", key: "part_number", align: "start" },
      ],
      items: [],
      filters: {
        part_number: "",
      },
    } as DataTableIFPV2Item,
  }),
  actions: {
    filteredItemsIFP() {
      return filterItems(this.datatablesIFP.items, this.datatablesIFP.filters);
    },

    // Refresh report_ifp_sum.in_qty dari display_achievement_new (achievement stamping
    // real, STATUS='FP') untuk periode yang lagi dipilih, sebelum ambil data IFP.
    // Tanpa ini, input foreman terbaru di /Transaction/stamping/achievement tidak akan
    // ikut ke kolom In sampai ada yang membuka halaman Stock v1 (yang memicu refresh ini).
    async syncAchievementQty() {
      try {
        await reportStockService.updateQty({
          clock: "",
          date: `${this.filterDate.period}-01`,
          day: "",
          hour: "",
          period: this.filterDate.period,
          period2: this.filterDate.period2,
          shift: 1,
        });
      } catch (err) {
        utilityStore.onError(err);
      }
    },

    async fetchReportIFP() {
      const notificationStore = useNotificationStore();
      notificationStore.loading = true;

      try {
        await this.syncAchievementQty();

        const response = await reportStockV2Service.fetchReportIFP(this.filterDate.period2);

        if (response.status === 200) {
          this.datatablesIFP.items = response.data;
        } else {
          utilityStore.onApiResponse(response);
        }
      } catch (err) {
        utilityStore.onError(err);
      } finally {
        notificationStore.disableLoading();
      }
    },

    loadDataStockAwalIfp(data: Partial<FormIfpV2Item>) {
      Object.assign(this.formIfp, data);
      this.dialog.formIfp = true;
    },

    async onUpdateStockAwal() {
      const notificationStore = useNotificationStore();
      notificationStore.loading = true;

      if (!this.formIfp.part_number || this.formIfp.stock_awal === null) {
        notificationStore.showAlertWarning("Part number dan stock awal wajib diisi.");
        notificationStore.disableLoading();
        return;
      }

      const data = new URLSearchParams();
      data.append("part_number", this.formIfp.part_number);
      data.append("stock_awal", String(this.formIfp.stock_awal));
      data.append("period", this.filterDate.period);
      data.append("tipe", "ifp");

      try {
        const response = await reportStockService.updateStockAwal(data);
        notificationStore.onApiResponseToastAlert(response, () => {
          this.dialog.formIfp = false;
        });
        await this.fetchReportIFP();
      } catch (err) {
        utilityStore.onError(err);
      } finally {
        notificationStore.disableLoading();
      }
    },
  },
});
