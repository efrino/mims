import { defineStore } from "pinia";
import { useNotificationStore } from "@/stores/notification";
import { useAuthStore } from '@/stores/auth';
import { useUtilityStore } from "@/stores/utility";

// TS type, service & utils
import { stampingReportSumService } from "@/services/Stamping/Report/AchievementSumService";
import type { 
  AchievementReportSumRow, 
  AchievementReportSumStmp
} from "@/types/Stamping/Report/AchievementSum";

const authStore = useAuthStore();
const notificationStore = useNotificationStore();
const utilityStore = useUtilityStore();
const date = utilityStore.getCurrentShift();

export const useStampingAchievementReportSumStore = defineStore("StampingReportAchievementSum", {
  state: () => ({
    dataTable: [] as AchievementReportSumRow[],
    filterDate: {
      start: date.date,
      end: '',
    },
    permissions: {
      create: authStore.checkAccess("Transaction.Create.AchievementStamping"),
      update: authStore.checkAccess("Transaction.Update.AchievementStamping"),
      download: authStore.checkAccess("Report.Download.AchievementStamping"),
      pcd: authStore.checkAccess("Transaction.PCD.AchievementStamping"),
    },
  }),
  actions: {
    mapAchievementReportSum(data: AchievementReportSumStmp[]): AchievementReportSumRow[] {
      return data.map((item) => ({
        date: item.date ?? null,
        shift: item.shift ?? null,
        patan: item.patan ?? null,
        line_id: item.line_id ?? null,
        status_plan: item.status_plan ?? null,

        gsph_plan: item.gsph_plan ? Number(item.gsph_plan) : null,
        gsph_actual: item.gsph_actual ? Number(item.gsph_actual) : null,

        downtime_plan: item.downtime_plan ? Number(item.downtime_plan) : null,
        downtime_actual: item.downtime_actual ? Number(item.downtime_actual) : null,

        ideltime_plan: item.ideltime_plan ? Number(item.ideltime_plan) : null,
        ideltime_actual: item.ideltime_actual ? Number(item.ideltime_actual) : null,

        cycletime_plan: item.cycletime_plan ? Number(item.cycletime_plan) : null,
        cycletime_actual: item.cycletime_actual ? Number(item.cycletime_actual) : null,

        qty_plan: item.qty_plan ? Number(item.qty_plan) : null,
        qty_actual: item.qty_actual ? Number(item.qty_actual) : null,

        good_plan: item.good_plan ? Number(item.good_plan) : null,
        good_actual: item.good_actual ? Number(item.good_actual) : null,

        repair_plan: item.repair_plan ? Number(item.repair_plan) : null,
        repair_actual: item.repair_actual ? Number(item.repair_actual) : null,

        reject_plan: item.reject_plan ? Number(item.reject_plan) : null,
        reject_actual: item.reject_actual ? Number(item.reject_actual) : null,
      }));
    },
    async fetchDataReportSum() {
      try {
        notificationStore.loading = true;
        const res = await stampingReportSumService.fetchAchievementReportSum({
          start: this.filterDate.start,
          end: this.filterDate.end || this.filterDate.start,
        });
        if (res.status !== 200) {
          notificationStore.showDialogWarning(
            "Warning!",
            "Terjadi kesalahan saat mengambil data!"
          )
          return;
        }
        const mappingData = this.mapAchievementReportSum(res.data);
        this.dataTable = mappingData;
      } catch (error) {
        utilityStore.onError(error);
      } finally {
        notificationStore.disableLoading();
      }
    },
  },
});
