import { defineStore } from "pinia";
import { useNotificationStore } from "@/stores/notification";
import { useAuthStore } from '@/stores/auth';
import { useUtilityStore } from "@/stores/utility";

// TS type, service & utils
import { reportAndonService } from '@/services/Stamping/Report/AchievementAndonService';

import type { 
  AchievementReportAndonSummaryRow, 
  AchievementReportAndonMutasiRow,
  AchievementReportAndonMDFOStmp,
  MDFORow,
  DetailItem,
} from "@/types/Stamping/Report/AchievementAndon";

const authStore = useAuthStore();
const notificationStore = useNotificationStore();
const utilityStore = useUtilityStore();
const date = utilityStore.getCurrentShift();

export const useStampingAchievementReportAndonStore = defineStore("StampingReportAchievementAndon", {
  state: () => ({
    dataTableSummary: [] as AchievementReportAndonSummaryRow[],
    dataTableMutasi: [] as AchievementReportAndonMutasiRow[],
    dataTablesUploadMDFO: [] as AchievementReportAndonMDFOStmp[],
    dataTableMDFO: [] as MDFORow[],
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
    tipeData: ["ALL", "Achieve", "Not Achieve", "Over"],
    selectedTipe: "ALL",
    detail: [] as DetailItem[],
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
    },
    formData: {
      period: date.period,
      date: date.date,
      stock_awal: 0,
      part_number: "",
    },
  }),
  actions: {
    mapMDFOToTable(data: AchievementReportAndonMDFOStmp[]): MDFORow[] {
      return data.map((item) => ({
        part_number: item.part_number ?? null,
        status: item.status ?? null,
        line: item.line_id ?? null,

        process: item.act_process && item.plan_process
          ? `${item.act_process} / ${item.plan_process}`
          : null,

        mdfo: item.total_process ?? null,
        gsph: item.gsph_plan ?? null,

        ERROR: item.information ?? null,
      }))
    },

    async fetchDataReportSummary() {
      try {
        notificationStore.loading = true;

        const res = await reportAndonService.fetchAchievementReportSummary({
          start: this.filterDate.start,
          end: this.filterDate.end || this.filterDate.start,
          tipe: this.selectedTipe,
        });

        if (res.status !== 200) {
          notificationStore.showDialogWarning(
            "Warning!",
            "Terjadi kesalahan saat mengambil data!"
          );
          return;
        }

        this.dataTableSummary = res.data as AchievementReportAndonSummaryRow[];
      } catch (error) {
        utilityStore.onError(error);
      } finally {
        notificationStore.disableLoading();
      }
    },
    async fetchDataReportMutasi() {
      try {
        notificationStore.loading = true;

        const res = await reportAndonService.fetchAchievementReportMutasi({
          start: this.filterDate.start,
          end: this.filterDate.end || this.filterDate.start,
        });

        if (res.status !== 200) {
          notificationStore.showDialogWarning(
            "Warning!",
            "Terjadi kesalahan saat mengambil data!"
          );
          return;
        }

        // LANGSUNG ke state
        this.dataTableMutasi = res.data as AchievementReportAndonMutasiRow[];

      } catch (error) {
        utilityStore.onError(error);
      } finally {
        notificationStore.disableLoading();
      }
    },
    async loadDetail(part_number: string, tanggal: string | string[]) {
      notificationStore.loading = true;

      const payload = new FormData();
      payload.append("start", Array.isArray(tanggal) ? tanggal[0] : tanggal);
      payload.append("end", Array.isArray(tanggal) ? tanggal[1] ?? tanggal[0] : tanggal);
      payload.append("part_number", part_number);

      try {
        const response = await reportAndonService.loadDetail(payload);

        if (response.data.status === false) {
          utilityStore.onApiResponse(response);
        } else {
          notificationStore.loading = false;
          this.detail = response.data;
          this.dialog.detail = true;
        }
      } catch (err) {
        utilityStore.onError(err);
      }
    },
    async onUploadMDFO() {
      if (!this.dataTablesUploadMDFO.length) {
        notificationStore.showAlertWarning(
          "Data yang anda kirim tidak Lengkap"
        )
        return
      }

      try {
        notificationStore.loading = true

        const formData = new FormData()

        this.dataTablesUploadMDFO.forEach((item) => {
          formData.append("id[]", item.id)
          formData.append("date[]", item.date)
          formData.append("shift[]", item.shift)
          formData.append("time_shift[]", item.time_shift)
          formData.append("line_id[]", item.line_id)
          formData.append("part_number[]", item.part_number)
          formData.append("plan_process[]", item.plan_process)
          formData.append("act_process[]", item.act_process)
          formData.append("total_process[]", item.total_process)
          formData.append("status[]", item.status)
          formData.append("gsph_plan[]", item.gsph_plan)
          formData.append("information[]", item.information ?? "")
        })

        const res = await reportAndonService.onUploadMDFO(formData)

        if (res.status === 200 && res.data.success) {
          // reset state
          this.dataTablesUploadMDFO = []
          this.dataTableMDFO = []
          this.dialog.upload = false

          notificationStore.showAlertSuccess(res.data.messages)
        } else {
          utilityStore.onApiResponse(res)
        }
      } catch (err) {
        utilityStore.onError(err)
      } finally {
        notificationStore.disableLoading()
      }
    },
  },
});