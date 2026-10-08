import { defineStore } from "pinia";
import { useNotificationStore } from "@/stores/notification";
import { useAuthStore } from '@/stores/auth';
import { useUtilityStore } from "@/stores/utility";

// TS type, service & utils
import { stampingReportMachineService } from '@/services/Stamping/Report/AchievementMachineService'
import type { 
  AchievementReportMachineRow, 
  AchievementReportMachineStmp
} from '@/types/Stamping/Report/AchievementMachine';

const authStore = useAuthStore();
const notificationStore = useNotificationStore();
const utilityStore = useUtilityStore();
const date = utilityStore.getCurrentShift();

export const useStampingAchievementReportMachineStore = defineStore("StampingReportAchievementMachine", {
  state: () => ({
    dataTable: [] as AchievementReportMachineRow[],
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
    mapAchievementReportMachine(data: AchievementReportMachineStmp[]): AchievementReportMachineRow[] {
      return data.map((item) => ({
        date: item.date,
        shift: item.shift,
        patan: item.patan,
        line_id: item.line_id,

        machine: item.machine,
        job_number_actual: item.job_number_actual,
        process: item.process,

        lotsize: item.lotsize ? Number(item.lotsize) : null,
        qty_actual: item.qty_actual ? Number(item.qty_actual) : null,

        dandori: item.dandori ? Number(item.dandori) : null,
        tpt: item.tpt ? Number(item.tpt) : null,

        g_sarana: item.g_sarana ? Number(item.g_sarana) : null,
        g_bahan: item.g_bahan ? Number(item.g_bahan) : null,
        g_dies: item.g_dies ? Number(item.g_dies) : null,
        g_mesin: item.g_mesin ? Number(item.g_mesin) : null,
      }))
    },
    async fetchDataReportMachine() {
      try {
        notificationStore.loading = true;
        const res = await stampingReportMachineService.fetchAchievementReportMachine({
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
        const mappingData = this.mapAchievementReportMachine(res.data);
        this.dataTable = mappingData;
      } catch (error) {
        utilityStore.onError(error);
      } finally {
        notificationStore.disableLoading();
      }
    },
  },
});
