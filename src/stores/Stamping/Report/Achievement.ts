import { defineStore } from 'pinia';
import { useNotificationStore } from '@/stores/notification';
import { useAuthStore } from '@/stores/auth';
import { useUtilityStore } from '@/stores/utility';

// TS type, service & utils
import { stampingReportService } from '@/services/Stamping/Report/AchievementService';
import type { AchievementReportRow, AchievementReportStmp } from '@/types/Stamping/Report/Achievement';

const authStore = useAuthStore();
const notificationStore = useNotificationStore();
const utilityStore = useUtilityStore();
const date = utilityStore.getCurrentShift();

export const useStampingAchievementReportStore = defineStore('StampingReportAchievement', {
  state: () => ({
    dataTable: [] as AchievementReportRow[],
    filterDate: {
      start: date.date,
      end: ''
    },
    permissions: {
      create: authStore.checkAccess('Transaction.Create.AchievementStamping'),
      update: authStore.checkAccess('Transaction.Update.AchievementStamping'),
      download: authStore.checkAccess('Report.Download.AchievementStamping'),
      pcd: authStore.checkAccess('Transaction.PCD.AchievementStamping')
    }
  }),
  actions: {
    mapAchievementReport(data: AchievementReportStmp[]): AchievementReportRow[] {
      return data.map((item) => ({
        date: item.date ?? null,
        shift: item.shift ?? null,
        additional_text: item.additional_text ?? null,
        line_id: item.line_id ?? null,
        urut: item.urut ?? null,

        is_tandem_text: item.is_tandem_text ?? null,
        is_trial_text: item.is_trial_text ?? null,

        part_rh: item.part_rh ?? null,
        part_lh: item.part_lh ?? null,
        job_rh: item.job_rh ?? null,
        job_lh: item.job_lh ?? null,

        combination: item.combination?.toString() ?? null,
        status_plan: item.status_plan ? String(item.status_plan).trim().toUpperCase() : null,
        stroke_plan: item.stroke_plan ?? null,

        lot_rh: item.lot_rh ?? null,
        lot_lh: item.lot_lh ?? null,

        tpt: item.tpt ?? null,
        keterangan: item.keterangan ?? null,

        stroke_act: item.stroke_act ?? null,
        act_rh: item.act_rh?.toString() ?? null,
        act_lh: item.act_lh ?? null,

        repair_rh: item.repair_rh ?? null,
        repair_lh: item.repair_lh ?? null,
        ket_repair_rh: item.ket_repair_rh ?? null,
        ket_repair_lh: item.ket_repair_lh ?? null,

        reject_rh: item.reject_rh ?? null,
        reject_lh: item.reject_lh ?? null,
        ket_reject_rh: item.ket_reject_rh ?? null,
        ket_reject_lh: item.ket_reject_lh ?? null,

        total_lotsize_rh: item.total_lotsize_rh ?? null,
        total_lotsize_lh: item.total_lotsize_lh ?? null,

        status: item.status ? String(item.status).trim().toUpperCase() : null,

        idletime: item.idletime ?? null,

        dandori: item.dandori ?? null,

        dt_machines: item.dt_machines ?? null,
        dt_dies: item.dt_dies ?? null,
        dt_other: item.dt_other ?? null,

        ket_dt_machines: item.ket_dt_machines ?? null,
        ket_dt_dies: item.ket_dt_dies ?? null,
        ket_dt_other: item.ket_dt_other ?? null,

        dt_total: item.dt_total ?? null,

        tpt_actual: item.tpt_actual ?? null,
        finish_actual: item.finish_actual ?? null,
        gsph: item.gsph ?? null,

        keterangan_all: item.keterangan_all ?? null,

        tipe_palet: item.tipe_palet ?? null,
        act_palet: item.act_palet ?? null,

        total_standard: item.total_standard ?? null,
        total_present: item.total_present ?? null,
        total_leave: item.total_leave ?? null,
        total_sick: item.total_sick ?? null
      }));
    },
    async fetchDataReport() {
      try {
        notificationStore.loading = true;
        const res = await stampingReportService.fetchAchievementReport({
          start: this.filterDate.start,
          end: this.filterDate.end || this.filterDate.start
        });
        if (res.status !== 200) {
          notificationStore.showDialogWarning('Warning!', 'Terjadi kesalahan saat mengambil data!');
          return;
        }
        const mappingData = this.mapAchievementReport(res.data);
        this.dataTable = mappingData;
      } catch (error) {
        utilityStore.onError(error);
      } finally {
        notificationStore.disableLoading();
      }
    }
  }
});
