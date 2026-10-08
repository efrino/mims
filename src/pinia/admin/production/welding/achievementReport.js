import axios from "axios";
import { defineStore } from "pinia";
import { useNotificationStore } from "@/pinia/notification";
import { useConfigStore } from "@/pinia/config";
import { useUtilityStore } from "@/pinia/utility";
import { useAuthStore } from "@/pinia/auth";

const configStore = useConfigStore();
const notificationStore = useNotificationStore();
const utilityStore = useUtilityStore();
const authStore = useAuthStore();
let formDetail = {
  hadir: [],
  izin: [],
  sakit: [],
  ganti_hari: [],
  is_tandem: [],
  is_running: [],
  is_next: [],
  is_start: [],
  job_number: [],
  urut: [],
  urut_plan: [],
  additional: [],
  patan: [],
  part_number: [],
  status_plan: [],
  combination: [],
  value_combination: [],
  total_process: [],
  plan_process: [],
  act_process: [],
  stroke_plan: [],
  nut_spot: [],
  total_lotsize_act: [],
  total_lotsize_lh: [],
  tpt: [],
  finish_plan: [],
  finish_plan_current: [],
  finish_actual_current: [],
  keterangan_plan: [],
  stroke_act: [],
  lotsize_actual: [],
  repair: [],
  reject: [],
  status: [],
  dandori: [],
  dandori_plan: [],
  dt_machines: [],
  dt_jig: [],
  dt_other: [],
  dt_wip: [],
  total_dt: [],
  lotsize: [],
  uph_plan: [],
  uph: [],
  tpt_actual: [],
  finish_actual: [],
  idletime: [],
  keterangan_actual: [],
  is_done: [],
  update_date: [],
  information: [],
  ket_repair: [],
  ket_repair_lh: [],
  ket_reject: [],
  ket_reject_lh: [],
  ket_dt_machines: [],
  ket_dt_jig: [],
  ket_dt_other: [],
  ket_dt_wip: [],
};
export const useWeldingAchievementReportStore = defineStore({
  id: "production-welding-achievement",
  state() {
    return {
      apiUrl: configStore.apiUrl,
      view: false,
      formDetail,
      context: null,
      table: {
        items: [],
      },
      partItems: [],
      params: utilityStore.getCurrentShift(),
      shiftNow: utilityStore.getShiftNow(),
      statusForm: "",
      permissions: {
        create: authStore.checkAccess("Production.Create.AchievementWelding"),
        update: authStore.checkAccess("Production.Update.AchievementWelding"),
        download: authStore.checkAccess("Report.Download.AchievementWelding"),
        pcd: authStore.checkAccess("Production.PCD.AchievementWelding"),
      },
      formData: {
        id_kanban: "",
        id_wis: "",
      },
      report: {
        datatables: {
          headers: [
            { text: "Date", align: "left", value: "date" },
            { text: "Shift", align: "left", value: "shift" },
            { text: "Patan", align: "left", value: "additional_text" },
            { text: "Line", align: "left", value: "line_id" },
            { text: "Part Number", align: "left", value: "part_number" },
            { text: "Job Number", align: "left", value: "job_number" },
            { text: "Status Plan", align: "left", value: "status_plan" },
            { text: "Stroke Plan", align: "left", value: "stroke_plan" },
            {
              text: "Qty Finish Plan",
              align: "left",
              value: "lotsize",
            },
            { text: "TPT Plan", align: "left", value: "tpt" },
            { text: "UPH Plan", align: "left", value: "uph_plan" },
            { text: "Keterangan Plan", align: "left", value: "keterangan" },
            { text: "Stroke Actual", align: "left", value: "stroke_act" },
            {
              text: "Qty OK",
              align: "left",
              value: "lotsize_actual",
            },
            {
              text: "Qty Repair",
              align: "left",
              value: "repair",
            },
            {
              text: "Keterangan Repair",
              align: "left",
              value: "ket_repair",
            },
            {
              text: "Qty Reject",
              align: "left",
              value: "reject",
            },
            {
              text: "Keterangan Reject",
              align: "left",
              value: "ket_reject",
            },
            {
              text: "Qty Finish Actual",
              align: "left",
              value: "total_lotsize",
            },
            { text: "Status", align: "left", value: "status" },
            { text: "Idletime", align: "left", value: "idletime" },
            { text: "Dandori", align: "left", value: "dandori" },
            { text: "Downtime Machines", align: "left", value: "dt_machines" },
            {
              text: "Keterangan Downtime Machines",
              align: "left",
              value: "ket_dt_machines",
            },
            { text: "Downtime Jig", align: "left", value: "dt_jig" },
            {
              text: "Keterangan Downtime Jig",
              align: "left",
              value: "ket_dt_jig",
            },
            { text: "Downtime Other", align: "left", value: "dt_other" },
            {
              text: "Keterangan Downtime Other",
              align: "left",
              value: "ket_dt_other",
            },
            { text: "Downtime Bahan", align: "left", value: "dt_wip" },
            {
              text: "Keterangan Downtime Bahan",
              align: "left",
              value: "ket_dt_wip",
            },
            { text: "Total Downtime", align: "left", value: "dt_total" },
            { text: "TPT Actual", align: "left", value: "tpt_actual" },
            { text: "UPH Act", align: "left", value: "uph_act" },
            { text: "Keterangan Item", align: "left", value: "keterangan_all" },
            { text: "Total Standard", align: "left", value: "total_standard" },
            { text: "Total Hadir", align: "left", value: "total_present" },
            { text: "Total Izin", align: "left", value: "total_leave" },
            { text: "total Sakit", align: "left", value: "total_sick" },
          ],
          items: [],
          filters: {
            date: [],
            shift: [],
            additional_text: [],
            line_id: [],
            urut: [],
            is_tandem_text: [],
            part_number: [],
            job_number: [],
            combination: [],
            status_plan: [],
            stroke_plan: [],
            lotsize: [],
            tpt: [],
            keterangan: [],
            stroke_act: [],
            lotsize_actual: [],
            repair: [],
            ket_repair: [],
            reject: [],
            ket_reject: [],
            status: [],
            dandori: [],
            dt_machines: [],
            dt_jig: [],
            dt_other: [],
            dt_wip: [],
            ket_dt_machines: [],
            ket_dt_jig: [],
            ket_dt_other: [],
            ket_dt_wip: [],
            dt_total: [],
            tpt_actual: [],
            finish_actual: [],
            uph: [],
            keterangan_all: [],
            update_date: [],
            information: [],
            hadir: [],
            izin: [],
            sakit: [],
            ganti_hari: [],
          },
        },
        filter: {
          dates: [
            new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
              .toISOString()
              .substr(0, 10),
            new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
              .toISOString()
              .substr(0, 10),
          ],
        },
      },
      reportSummary: {
        datatables: {
          headers: [
            { text: "Date", align: "left", value: "date" },
            { text: "Shift", align: "left", value: "shift" },
            { text: "Patan", align: "left", value: "patan" },
            { text: "Line", align: "left", value: "line_id" },
            { text: "Status Plan", align: "left", value: "status_plan" },
            { text: "GSPH Plan", align: "left", value: "gsph_plan" },
            { text: "GSPH Actual", align: "left", value: "gsph_actual" },
            { text: "Downtime Plan", align: "left", value: "downtime_plan" },
            {
              text: "Downtime Actual",
              align: "left",
              value: "downtime_actual",
            },
            { text: "Idle Time Plan", align: "left", value: "ideltime_plan" },
            {
              text: "Idle Time Actual",
              align: "left",
              value: "ideltime_actual",
            },
            { text: "Cycle Time Plan", align: "left", value: "cycletime_plan" },
            {
              text: "Cycle Time Actual",
              align: "left",
              value: "cycletime_actual",
            },
            { text: "Qty Plan", align: "left", value: "qty_plan" },
            { text: "Qty Actual", align: "left", value: "qty_actual" },
            { text: "Good Plan", align: "left", value: "good_plan" },
            { text: "Good Actual", align: "left", value: "good_actual" },
            { text: "Repair Plan", align: "left", value: "repair_plan" },
            { text: "Repair Actual", align: "left", value: "repair_actual" },
            { text: "Reject Plan", align: "left", value: "reject_plan" },
            { text: "Reject Actual", align: "left", value: "reject_actual" },
          ],
          items: [],
          filters: {
            date: [],
            shift: [],
            patan: [],
            line_id: [],
            status_plan: [],
            gsph_plan: [],
            gsph_actual: [],
            downtime_plan: [],
            downtime_actual: [],
            ideltime_plan: [],
            ideltime_actual: [],
            cycletime_plan: [],
            cycletime_actual: [],
            qty_plan: [],
            qty_actual: [],
            good_plan: [],
            good_actual: [],
            repair_plan: [],
            repair_actual: [],
            reject_plan: [],
            reject_actual: [],
          },
        },
        filter: {
          dates: [
            new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
              .toISOString()
              .substr(0, 10),
            new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
              .toISOString()
              .substr(0, 10),
          ],
        },
      },
      dialog: {
        detail: false,
        datePicker: false,
        filter: false,
        formLed: false,
        formKetRepair: false,
        formKetDT: false,
        confirmDelete: false,
        formKanban: false,
        formStartLed: false,
        formTag: false,
        addLine: false,
      },
      lines: [],
    };
  },
  actions: {
    resetForm() {
      this.fetchDataLine();
    },
    fetchDataPart() {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/master/Welding/part?tipe=part`
        )
        .then((response) => {
          if (response.status === 200) {
            this.partItems = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },

    fetchDataReport() {
      notificationStore.loading = true;
      const data = new FormData();
      data.append("start", this.report.filter.dates[0]);
      data.append(
        "end",
        this.report.filter.dates[1] ?? this.report.filter.dates[0]
      );
      axios
        .post(
          `http://${configStore.apiUrl}/majsf_rest_api/api/welding-achievement/report`,
          data
        )
        .then((response) => {
          if (response.status === 200) {
            this.report.datatables.items = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
      setTimeout(() => {
        this.dialog.filter = false;
      }, 500);
    },

    filteredItems() {
      return this.report.datatables.items.filter((d) => {
        return Object.keys(this.report.datatables.filters).every((f) => {
          return (
            this.report.datatables.filters[f].length < 1 ||
            d[f]
              .toLowerCase()
              .includes(this.report.datatables.filters[f].toLowerCase())
          );
        });
      });
    },
    filteredItemsSummary() {
      return this.reportSummary.datatables.items.filter((d) => {
        return Object.keys(this.reportSummary.datatables.filters).every((f) => {
          return (
            this.reportSummary.datatables.filters[f].length < 1 ||
            d[f]
              .toLowerCase()
              .includes(this.reportSummary.datatables.filters[f].toLowerCase())
          );
        });
      });
    },

  },
});
