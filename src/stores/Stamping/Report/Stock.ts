import { defineStore } from "pinia";
import { useNotificationStore } from "@/stores/notification";
import { useAuthStore } from "@/stores/auth";
import { useConfigStore } from "@/stores/config";
import { useUtilityStore } from "@/pinia/utility";

// ts type, utils & service
import type {
  DialogState,
  FilterState,
  FilterDateState,
  FormDataItem,
  FormIfpItem,
  FormUploadItem,
  DataTableItem,
  DataTablePCSItem,
  DataTableIFPItem,
  DataTableUploadItem,
  TableStockItem,
} from '@/types/Stamping/Report/reportStock';

import { filterItems } from '@/utils/helpers/filtersItem';

import {
  reportStockService
} from "@/services/Stamping/Report/StockService";

const authStore = useAuthStore();
const configStore = useConfigStore();
const notificationStore = useNotificationStore();
const utilityStore = useUtilityStore();
const date = utilityStore.getCurrentShift();

export const useReportStockStore = defineStore('ReportStock', {
    state: () => ({
        permissions: {
            create: authStore.checkAccess("Report.View.Stock"),
        },
        dialog: {
          filter: false,
          datePicker: false,
          datePickerPeriod: false,
          form: false,
          formIfp: false,
          datePickerForm: false,
          dateDaily: false,
          upload: false,
          detail: false,
        } as DialogState,
        filter: { 
          period: date.period, 
        } as FilterState,
        filterDate: {
          clock: "",
          date: "",
          day: "",
          hour: "",
          period: "", 
          period2: "",
          shift: 1,
          month: "",
          year: "",
        } as FilterDateState,
        action: "" as "" | "Edit" | "Create",
        formData: {
          period: date.period,
          date: date.date,
          stock_awal: 0,
          part_number: "",
        } as FormDataItem,
        formIfp: {
          stock_awal: 0,
          part_number: "",
        } as FormIfpItem,
        params: utilityStore.getCurrentShift(),
        datatables: {
          headers: [
            {
              title: "Search Part Number...",
              key: "part_number",
              align: "start",
            },
          ],
          items: [],
          filters: {
            part_number: "",
          },
        } as DataTableItem,
        form: [
          "period",
          "job_number",
          "part_number",
          "dn",
          "date_01",
          "date_02",
          "date_03",
          "date_04",
          "date_05",
          "date_06",
          "date_07",
          "date_08",
          "date_09",
          "date_11",
          "date_12",
          "date_13",
          "date_14",
          "date_15",
          "date_16",
          "date_17",
          "date_18",
          "date_19",
          "date_20",
          "date_21",
          "date_22",
          "date_23",
          "date_24",
          "date_25",
          "date_26",
          "date_27",
          "date_28",
          "date_29",
          "date_30",
          "date_31",
          "total",
        ],
        formUpload: {
          period: "",
          job_number: "",
          part_number: "",
          dn: "",
          date_01: "",
          date_02: "",
          date_03: "",
          date_04: "",
          date_05: "",
          date_06: "",
          date_07: "",
          date_08: "",
          date_09: "",
          date_10: "",
          date_11: "",
          date_12: "",
          date_13: "",
          date_14: "",
          date_15: "",
          date_16: "",
          date_17: "",
          date_18: "",
          date_19: "",
          date_20: "",
          date_21: "",
          date_22: "",
          date_23: "",
          date_24: "",
          date_25: "",
          date_26: "",
          date_27: "",
          date_28: "",
          date_29: "",
          date_30: "",
          date_31: "",
          total: "",
        } as FormUploadItem,
        table_stock: {
          items: [] as TableStockItem[],
        },
        datatablesPCS: {
          headers: [
            { title: "Part RH", key: "part_rh", align: "start",},
            { title: "Part LH", key: "part_lh", align: "start",},
          ],
          items: [],
          filters: {
            part_rh: "",
            part_lh: "",
          },
        } as DataTablePCSItem,
        datatablesIFP: {
          headers: [
            {
                title: "Search Part Number...",
                key: "part_number",
                align: "start",
            },
          ],
          items: [],
          filters: {
            part_number: "",
          },
        } as DataTableIFPItem, 
        datatablesUpload: {
          search: "",
          headers: [
            { title: "Part Number", key: "part_number", align: "start",},
            { title: "Job Number", key: "job_number", align: "start",},
            { title: "DN", key: "dn", align: "start",},
            { title: "Tgl 1",  key: "date_01", align: "start",},
            { title: "Tgl 2",  key: "date_02", align: "start",},
            { title: "Tgl 3",  key: "date_03", align: "start",},
            { title: "Tgl 4",  key: "date_04", align: "start",},
            { title: "Tgl 5",  key: "date_05", align: "start",},
            { title: "Tgl 6",  key: "date_06", align: "start",},
            { title: "Tgl 7",  key: "date_07", align: "start",},
            { title: "Tgl 8",  key: "date_08", align: "start",},
            { title: "Tgl 9",  key: "date_09", align: "start",},
            { title: "Tgl 10",  key: "date_10", align: "start",},
            { title: "Tgl 11",  key: "date_11", align: "start",},
            { title: "Tgl 12",  key: "date_12", align: "start",},
            { title: "Tgl 13",  key: "date_13", align: "start",},
            { title: "Tgl 14",  key: "date_14", align: "start",},
            { title: "Tgl 15",  key: "date_15", align: "start",},
            { title: "Tgl 16",  key: "date_16", align: "start",},
            { title: "Tgl 17",  key: "date_17", align: "start",},
            { title: "Tgl 18",  key: "date_18", align: "start",},
            { title: "Tgl 19",  key: "date_19", align: "start",},
            { title: "Tgl 20",  key: "date_20", align: "start",},
            { title: "Tgl 21",  key: "date_21", align: "start",},
            { title: "Tgl 22",  key: "date_22", align: "start",},
            { title: "Tgl 23",  key: "date_23", align: "start",},
            { title: "Tgl 24",  key: "date_24", align: "start",},
            { title: "Tgl 25",  key: "date_25", align: "start",},
            { title: "Tgl 26",  key: "date_26", align: "start",},
            { title: "Tgl 27",  key: "date_27", align: "start",},
            { title: "Tgl 28",  key: "date_28", align: "start",},
            { title: "Tgl 29",  key: "date_29", align: "start",},
            { title: "Tgl 30",  key: "date_30", align: "start",},
            { title: "Tgl 31",  key: "date_31", align: "start",},
            { title: "Total",  key: "total", align: "start",},
            { title: "Simulate",  key: "ERROR", align: "start",},
          ],
          items: [],
        } as DataTableUploadItem,
      }
    ),
    actions: {
      resetForm() {
        this.fetchReportIFP();
        this.dialog.form = false;
        this.dialog.formIfp = false;
        this.dialog.upload = false;
      },
      // Utils
      filteredItems() {
        return filterItems(this.datatables.items, this.datatables.filters);
      },
      filteredItemsIFP() {
        return filterItems(this.datatablesIFP.items, this.datatablesIFP.filters);
      },
      filteredItemsPCS() {
        return filterItems(this.datatablesPCS.items, this.datatablesPCS.filters);
      },

      // fetch
      async fetchReportBlank() {
        notificationStore.loading = true;

        try {
          const response = await reportStockService.fetchReportBlank(
            this.filterDate
          );

          if (response.status === 200) {
            this.datatables.items = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }

        } catch (err) {
          utilityStore.onError(err);

        } finally {
          notificationStore.disableLoading();
        }
      },

      // IFP
      async fetchReportIFP() {
        notificationStore.loading = true;

        try {
          const response = await reportStockService.fetchReportIFP({
            period: this.filterDate.period2, // YYYYMM
          });

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

      // Achivement PCS
      async fetchReportAchievementPeriod() {
        notificationStore.loading = true;

        try {
          const response = await reportStockService.fetchReportAchievementPeriod(
            this.filterDate
          );

          if (response.status === 200) {
            this.datatablesPCS.items = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }

        } catch (err) {
          utilityStore.onError(err);

        } finally {
          notificationStore.disableLoading();
        }
      },

      async updateQty() {
        notificationStore.loading = true;

        try {
          const response = await reportStockService.updateQty(this.filterDate);

          if (response.status === 200) {
            await this.fetchReportBlank(); // tetap dipanggil
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }

        } catch (err) {
          utilityStore.onError(err);

        } finally {
          notificationStore.disableLoading();
        }
      },

      async onUpdate(tipe: string) {
        const notificationStore = useNotificationStore();
        const configStore = useConfigStore();

        notificationStore.loading = true;

        const data = new URLSearchParams();

        if (!this.formIfp.part_number || this.formIfp.stock_awal === null) {
          notificationStore.showAlertWarning(
            "Part number dan stock awal wajib diisi."
          );
          notificationStore.disableLoading();
          return;
        }

        data.append("part_number", this.formIfp.part_number);
        data.append("stock_awal", String(this.formIfp.stock_awal));

        data.append("period", this.filterDate.period);
        data.append("tipe", tipe);

        try {
          const response = await reportStockService.updateStockAwal(data);
          notificationStore.onApiResponseToastAlert(
            response,
            this.resetForm
          );

          await this.fetchReportBlank();
          await this.fetchReportIFP();
        } catch (err) {
          configStore.onError(err);
        }
      },
      
      async onUpload() {
        notificationStore.loading = true;

        if (!this.datatablesUpload.items.length) {
          notificationStore.showAlertWarning("Data yang anda kirim tidak Lengkap");
          notificationStore.disableLoading();
          return;
        }

        // --- siapkan FormData ---
        const data = new FormData();

        this.datatablesUpload.items.forEach((item) => {
          data.append("period", this.formData.period);
            
          const safeItem = item as Record<string, string>;
            Object.keys(item).forEach((key) => {
              if (this.form.includes(key)) {
                data.append(`${key}[]`, safeItem[key]);
              }
            });
          });

        try {
          const response = await reportStockService.uploadFixOrder(data);

          if (response.status === 200) {
            let error = true;
            const message = "";

            if (response.data.success) {
              error = false;
              this.resetForm();
              this.dialog.upload = false;
            }

            const tmp = document.createElement("DIV");
            tmp.innerHTML = response.data.messages + message;

            const text = tmp.textContent || tmp.innerText || "";

            if (error) {
              notificationStore.showAlertWarning(text);
            } else {
              notificationStore.showAlertSuccess(text);
            }
          } else {
            notificationStore.showAlertWarning(response.data.status);
          }

        } catch (err) {
          configStore.onError(err);

        } finally {
          notificationStore.disableLoading();
        }
      },

      loadDataStockAwal(action: "" | "Edit" | "Create", data: Partial<FormDataItem>) {
        Object.assign(this.formData, data);
        this.action = action;
        this.dialog.form = true;
      },

      loadDataStockAwalIfp(action: "" | "Edit" | "Create", data: Partial<FormIfpItem>) {
        Object.assign(this.formIfp, data);
        this.action = action;
        this.dialog.formIfp = true;
      },
    }
  }
)