import { defineStore } from "pinia";
import { useNotificationStore } from "@/stores/notification";
import { useAuthStore } from '@/stores/auth';
import { useUtilityStore } from "@/stores/utility";

// TS type, service & utils
import { stampingLkhService } from "@/services/Stamping/Report/LkhService";
import type { 
  ReportLKH, 
  ShiftData,
  tableRowsDaily,
  tableRowsMonthly,
} from "@/types/Stamping/Report/LKH";

const authStore = useAuthStore();
const notificationStore = useNotificationStore();
const utilityStore = useUtilityStore();
const date = utilityStore.getCurrentShift();

export const useLkhStore = defineStore("StampingReportLkh", {
  state: () => ({
      tag: "LKH-STP",
      rawDaily: [] as ReportLKH[],
      tableRowsDaily: [] as tableRowsDaily[],
      tableRowsMonthly: [] as tableRowsMonthly[],
      form: {
        date: new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
          .toISOString()
          .substr(0, 10),
        period: new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
          .toISOString()
          .substr(0, 7),
      },
      filterDate: {
        date: date.date,
      },
      permissions: {
        downloadReport: authStore.checkAccess("Report.Download.LkhStamping"),
        create: authStore.checkAccess("Transaction.Create.LkhStamping"),
        download: authStore.checkAccess("Transaction.Download.LkhStamping"),
        update: authStore.checkAccess("Transaction.Update.LkhStamping"),
      },
      shiftItems: ["1", "2"],
      current: new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
      .toISOString()
      .substr(0, 10),
      dialog: false
  }),
  actions: {
    mappingDataTable(data: ReportLKH[]): tableRowsDaily[] {
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
          percentage: plan1 > 0 ? Math.round((actual1 / plan1) * 100) : "-",
          ng: ng1,
        };

        const shift2: ShiftData = {
          plan: plan2,
          actual: actual2,
          balance: actual2 - plan2,
          percentage: plan2 > 0 ? Math.round((actual2 / plan2) * 100) : "-",
          ng: ng2,
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
            totalPlan > 0 ? Math.round((totalActual / totalPlan) * 100) : "-",
          totalNg: ng1 + ng2,
        };
      });
    },
    generateMonthlyFromDaily() {
      const month = this.form.period;
      this.tableRowsMonthly = this.rawDaily
        .filter(item => item.date?.startsWith(month))
        .map(item => ({
          date: item.date ?? "",

          shift: item.shift ? `Shift ${item.shift}` : "",

          model: item.model ?? "",

          jobNumber:
            item.job_number && item.job_number !== "-"
              ? item.job_number
              : "",

          partNumber: item.part_number ?? "",

          partName: item.part_name ?? "",

          createdAt: item.insert_date ?? item.update_date ?? "",

          qty: Number(item.qty ?? 0),

          qtySap: Number(item.qty_sap ?? 0),

          keterangan: "-", // backend memang tidak ada
        }));
    },
    async fetchDataReport() {
      notificationStore.loading = true;

      try {
        const response = await stampingLkhService.fetchDataReport({
          tag: this.tag,
          date: this.filterDate.date,
        });

        if (response.status === 200) {
          this.rawDaily = response.data as ReportLKH[];

          this.tableRowsDaily = this.mappingDataTable(this.rawDaily);

          this.generateMonthlyFromDaily();
        } else {
          utilityStore.onApiResponse(response);
        }
      } catch (error) {
        utilityStore.onError(error);
      } finally {
        notificationStore.disableLoading();
      }
    },
  },
});