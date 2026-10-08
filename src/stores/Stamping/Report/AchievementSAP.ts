import { defineStore } from "pinia";
import { useNotificationStore } from "@/stores/notification";
import { useAuthStore } from '@/stores/auth';
import { useUtilityStore } from "@/stores/utility";

// TS type, service & utils
import { stampingReportSAPService } from "@/services/Stamping/Report/AchievementSAPService";
import type { 
  AchievementReportSAPRow, 
  AchievementReportSAPStmp
} from "@/types/Stamping/Report/AchievementSAP";

const authStore = useAuthStore();
const notificationStore = useNotificationStore();
const utilityStore = useUtilityStore();
const date = utilityStore.getCurrentShift();

export const useStampingAchievementReportSAPStore = defineStore("StampingReportAchievementSAP", {
  state: () => ({
    dataTable: [] as AchievementReportSAPRow[],
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
    mapAchievementReportSAP(data: AchievementReportSAPStmp[]): AchievementReportSAPRow[] {
      return data.map((item) => ({
        date: item.date ?? null,
        shift: item.shift ?? null,
        patan: item.patan ?? null,
        line_id: item.line_id ?? null,
        urutan: item.urut ?? null,

        part_rh: item.part_rh ?? null,
        part_lh: item.part_lh ?? null,

        lot_rh: item.lot_rh ? Number(item.lot_rh) : null,
        lot_lh: item.lot_lh ? Number(item.lot_lh) : null,

        total_lotsize_rh: item.total_lotsize_rh
          ? Number(item.total_lotsize_rh)
          : null,

        total_lotsize_lh: item.total_lotsize_lh
          ? Number(item.total_lotsize_lh)
          : null,

        sap_rh: item.sap_rh ? Number(item.sap_rh) : null,
        sap_lh: item.sap_lh ? Number(item.sap_lh) : null,

        gap_rh: item.gap_rh ? Number(item.gap_rh) : null,
        gap_lh: item.gap_lh ? Number(item.gap_lh) : null,
      }));
    },
    async fetchDataReportSAP() {
      try {
        notificationStore.loading = true;
        const res = await stampingReportSAPService.fetchAchievementReportSAP({
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
        const mappingData = this.mapAchievementReportSAP(res.data);
        this.dataTable = mappingData;
      } catch (error) {
        utilityStore.onError(error);
      } finally {
        notificationStore.disableLoading();
      }
    },
  },
});
