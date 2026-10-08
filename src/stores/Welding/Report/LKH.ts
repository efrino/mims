import { defineStore } from "pinia";
import { useUtilityStore } from '@/stores/utility';
import { useNotificationStore } from '@/stores/notification';
import { useAuthStore } from '@/stores/auth';
import type { ReportLKH, TableItem, ShiftData } from "@/types/Welding/Report/LKH";
import { addDataReportLKH, fetchDataReportLKH, updateDataReportLKH } from "@/services/Welding/Report/LKHService";

const utilityStore = useUtilityStore();
const date = utilityStore.getCurrentShift();
const notificationStore = useNotificationStore();
const authStore = useAuthStore();

export const useLKHStore = defineStore('WeldingReportLKH', {
  state: () => ({
    form: {
      date: new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
        .toISOString()
        .substr(0, 10),
      shift: "",
      partNumber: "",
      qty: "",
      period: new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
        .toISOString()
        .substr(0, 7),
    },
    filterDate: {
      date: date.date,
    },
    filter: {
      date: date.date,
      line: "S/A ROBOT",
    },
    permissions: {
      downloadReport: authStore.checkAccess("Report.Download.LkhWelding"),
      create: authStore.checkAccess("Transaction.Create.LkhWelding"),
      download: authStore.checkAccess("Transaction.Download.LkhWelding"),
      update: authStore.checkAccess("Transaction.Update.LkhWelding"),
    },
    shiftItems: ["1", "2"],
    tableData: [] as TableItem[],
    line: [
      "S/A ROBOT",
      "S/A MANUAL",
      "CO ROBOT",
      "WSS A",
      "WSS B",
      "WSS C",
      "WSS D",
      "WSS E",
      "WSS G",
      "WSS H",
      "CO ROBOT HMMI",
      "S/A HMMI",
      "WSS HMMI",
    ],
  }),
  actions: {
    mappingDataTable (data: ReportLKH[]): TableItem[] {
      const toNumber = (value: string | null | undefined): number => {
        const n = Number(value);
        return isNaN(n) ? 0 : n;
      };

      return data.map((item) => {
        const plan1 = toNumber(item.plan_shift_1);
        const actual1 = toNumber(item.qty_shift_1);
        const ng1 = toNumber(item.ng_shift_1);

        const plan2 = toNumber(item.plan_shift_2);
        const actual2 = toNumber(item.qty_shift_2);
        const ng2 = toNumber(item.ng_shift_2);

        const shift1: ShiftData = {
          plan: plan1,
          actual: actual1,
          balance: actual1 - plan1,
          percentage:
            plan1 > 0 ? Math.round((actual1 / plan1) * 100) : "-",
          ng: ng1
        };

        const shift2: ShiftData = {
          plan: plan2,
          actual: actual2,
          balance: actual2 - plan2,
          percentage:
            plan2 > 0 ? Math.round((actual2 / plan2) * 100) : "-",
          ng: ng2
        };

        const totalPlan = plan1 + plan2;
        const totalActual = actual1 + actual2;

        return {
          partNumber: item.part_number,
          jobNumber: item.job_number,
          lotSize: toNumber(item.lotsize),
          qtyKbn: toNumber(item.qty_kbn),

          shift1,
          shift2,

          totalProduction: totalActual,
          totalBalance: shift1.balance + shift2.balance,
          totalPercentage:
            totalPlan > 0
              ? Math.round((totalActual / totalPlan) * 100)
              : 0,
          totalNg: ng1 + ng2
        };
      });
    },

    async fetchDataReport() {

      try {
        notificationStore.loading = true;

        
        const ress = await fetchDataReportLKH(this.filter);
        
        if (ress.status === 200) {
          notificationStore.disableLoading();
          
          await updateDataReportLKH(this.filterDate)
          
          const data = this.mappingDataTable(ress.data);
          this.tableData = data;
        } else {
          notificationStore.disableLoading();
          utilityStore.onApiResponse(ress);
        }
      } catch (error) {
        notificationStore.disableLoading();
        console.error("Error:", error);
        utilityStore.onError(error);
      }
    },

    async addDataReport() {
      
      try {
        notificationStore.loading = true;
        
        const response = await addDataReportLKH(this.filterDate.date);
        
        if (response.status === 200) {
          this.fetchDataReport();
          notificationStore.disableLoading();
        } else {
          notificationStore.disableLoading();
          utilityStore.onApiResponse(response);
        }
      } catch (error) {
        notificationStore.disableLoading();
        console.error("Error:", error);
        utilityStore.onError(error);
      }
    },
  }
})