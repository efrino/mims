import {
  detailAchievementReportKbn,
  fetchAchievementReportKbn,
  fetchAchievementReportWLDService,
  fetchDashboardKanban,
  fetchIncompleteKanban
} from '@/services/Welding/Report/AchievementServive';
import { useAuthStore } from '@/stores/auth';
import { useNotificationStore } from '@/stores/notification';
import { useUtilityStore } from '@/stores/utility';
import type {
  AchievementReportRow,
  AchievementReportWld,
  AchievementReportWldKbn,
  DashboardKanban,
  DetailAchievementReportWldKbn,
  IncomplateKanbanRow
} from '@/types/Welding/Report/Achievement';
import { defineStore } from 'pinia';

const notificationStore = useNotificationStore();
const utilityStore = useUtilityStore();
const date = utilityStore.getCurrentShift();
const authStore = useAuthStore();

export const useWeldingAchievementReportStore = defineStore('report-welding-achievement', {
  state: () => ({
    dataTable: [] as AchievementReportRow[],
    filterDate: {
      start: date.date,
      end: ''
    },
    permissions: {
      create: authStore.checkAccess('Transaction.Create.AchievementWelding'),
      update: authStore.checkAccess('Transaction.Update.AchievementWelding'),
      download: authStore.checkAccess('Report.Download.AchievementWelding'),
      pcd: authStore.checkAccess('Transaction.PCD.AchievementWelding')
    },
    achievementKanbanData: {
      dashboard: [] as DashboardKanban[],
      chart: {
        act_lkh: 0 as Number,
        act_sap: 0 as Number
      },
      detail: [] as DetailAchievementReportWldKbn[],
      dataTable: [] as AchievementReportWldKbn[],
      incomplete: [] as IncomplateKanbanRow[],
      showModal: false
    }
  }),
  actions: {
    async fetchAchievementReport() {
      try {
        notificationStore.loading = true;

        const res = await fetchAchievementReportWLDService({
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
        console.log('err: ', error);
      } finally {
        notificationStore.disableLoading();
      }
    },

    mapAchievementReport(data: AchievementReportWld[]): AchievementReportRow[] {
      return data.map((item) => {
        const lotsizeActual = parseInt(item.lotsize_actual || '0');
        const repair = parseInt(item.repair || '0');
        const reject = parseInt(item.reject || '0');

        return {
          date: item.date,
          shift: item.shift,
          additional_text: item.additional_text,
          line_id: item.line_id ? String(item.line_id).trim() : item.line_id,
          urut: item.urut,
          part_number: item.part_number ? String(item.part_number).trim() : item.part_number,
          job_number: item.job_number ? String(item.job_number).trim() : item.job_number,
          status_plan: item.status_plan ? String(item.status_plan).trim().toUpperCase() : item.status_plan,
          stroke_plan: item.stroke_plan,
          stroke_plan_total: item.stroke_plan_total,
          lotsize: item.lotsize,
          tpt: Number(item.tpt),
          uph_plan: Number(item.uph_plan),
          keterangan: item.keterangan_plan,
          stroke_act: item.stroke_act,
          lotsize_actual: item.lotsize_actual,
          repair: item.repair,
          ket_repair: item.ket_repair,
          reject: item.reject,
          ket_reject: item.ket_reject,
          total_output: item.lotsize_actual ? lotsizeActual + repair + reject : 0,
          status: item.status ? String(item.status).trim().toUpperCase() : item.status,
          idletime: item.idletime,
          dandori: item.dandori,
          dt_machines: item.dt_machines,
          ket_dt_machines: item.ket_dt_machines,
          dt_jig: item.dt_jig,
          ket_dt_jig: item.ket_dt_jig,
          dt_other: item.dt_other,
          ket_dt_other: item.ket_dt_other,
          dt_wip: item.dt_wip,
          ket_dt_wip: item.ket_dt_wip,
          dt_total: item.dt_total,
          tpt_actual: item.tpt_actual,
          uph_act: item.uph_act
        };
      });
    },

    async dashboardAchKanban() {
      try {
        notificationStore.loading = true;

        const res = await fetchDashboardKanban(date.period);

        if (res.status !== 200) {
          notificationStore.showDialogWarning('Warning!', 'Terjadi kesalahan saat mengambil data dashboard!');
          return;
        }

        this.achievementKanbanData.dashboard = res.data;
      } catch (error) {
        console.log('err: ', error);
      } finally {
        notificationStore.disableLoading();
      }
    },

    async fetchAchievementReportKbn() {
      try {
        notificationStore.loading = true;

        const res = await fetchAchievementReportKbn(this.filterDate);

        if (res.status !== 200) {
          notificationStore.showDialogWarning('Warning!', 'Terjadi kesalahan saat mengambil data tabel!');
          return;
        }

        this.achievementKanbanData.dataTable = res.data;

        // for chart
        let count_ZQTY_LKH = 0;
        let count_ZQTY_SAP = 0;
        this.achievementKanbanData.dataTable.forEach((e) => {
          count_ZQTY_LKH += Number(e.ZQTY_LKH);
          count_ZQTY_SAP += Number(e.ZQTY_SAP);
        });

        this.achievementKanbanData.chart.act_lkh = count_ZQTY_LKH;
        this.achievementKanbanData.chart.act_sap = count_ZQTY_SAP;
      } catch (error) {
        console.log('err: ', error);
      } finally {
        notificationStore.disableLoading();
      }
    },

    async fetchIncompleteKanban() {
      try {
        notificationStore.loading = true;

        const res = await fetchIncompleteKanban(this.filterDate);

        if (res.status !== 200) {
          notificationStore.showDialogWarning('Warning!', 'Terjadi kesalahan saat mengambil data chart!');
          return;
        }

        this.achievementKanbanData.incomplete = res.data;
      } catch (error) {
        console.log('err: ', error);
      } finally {
        notificationStore.disableLoading();
      }
    },

    async detailAchievementReportKbn(part_number: string) {
      const ress = await detailAchievementReportKbn({
        start: this.filterDate.start,
        end: this.filterDate.end,
        part_number: part_number
      });

      this.achievementKanbanData.detail = ress.data;
      this.achievementKanbanData.showModal = true;
    }
  }
});
