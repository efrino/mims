import axios from "axios";
import { defineStore } from "pinia";
import { useNotificationStore } from "@/pinia/notification";
import { useAuthStore } from "@/pinia/auth";
import { useConfigStore } from "@/pinia/config";
import { useUtilityStore } from "@/pinia/utility";
import { useStampingAchievementStore } from "@/pinia/admin/production/stamping/achievement.js";

const authStore = useAuthStore();
const configStore = useConfigStore();
const notificationStore = useNotificationStore();
const utilityStore = useUtilityStore();
const date = utilityStore.getCurrentShift();
const stampingStore = useStampingAchievementStore();

let formDetail = {
  hadir: [],
  izin: [],
  sakit: [],
  ganti_hari: [],
  jumlah_mesin: [],
  is_tandem: [],
  is_trial: [],
  is_terusan: [],
  is_running: [],
  is_next: [],
  is_start: [],
  job_number: [],
  job: [],
  job_rh: [],
  job_lh: [],
  plan: [],
  part_number_fix: [],
  qty_kbn: [],
  urut: [],
  urut_new: [],
  urut_plan: [],
  additional: [],
  patan: [],
  part_rh: [],
  part_lh: [],
  status_plan: [],
  combination: [],
  value_combination: [],
  total_process: [],
  plan_process: [],
  act_process: [],
  stroke_plan: [],
  lot_rh: [],
  lot_lh: [],
  kbn_rh: [],
  kbn_lh: [],
  sap_rh: [],
  sap_lh: [],
  total_lotsize_rh: [],
  total_lotsize_lh: [],
  pembagi_repair: [],
  pembagi_reject: [],
  tpt: [],
  finish_plan: [],
  finish_plan_current: [],
  finish_actual_current: [],
  keterangan: [],
  stroke_act: [],
  stroke_machine: [],
  act_rh: [],
  sum_act_rh: [],
  act_lh: [],
  repair_rh: [],
  repair_lh: [],
  reject_rh: [],
  reject_lh: [],
  status: [],
  dandori: [],
  dandori_plan: [],
  dt_machines: [],
  dt_dies: [],
  dt_other: [],
  dt_material: [],
  total_dt: [],
  gap_rh: [],
  gap_lh: [],
  total_sap: [],
  lotsize: [],
  gsph: [],
  gsph_plan: [],
  job_number_actual: [],
  tpt_actual: [],
  finish_actual: [],
  idletime: [],
  keterangan_all: [],
  keterangan_sap: [],
  status_delivery: [],
  is_done: [],
  update_date: [],
  information: [],
  ket_repair_rh: [],
  ket_repair_lh: [],
  ket_reject_rh: [],
  ket_reject_lh: [],
  ket_dt_machines: [],
  ket_dt_dies: [],
  ket_dt_other: [],
  ket_dt_material: [],
  machine: [],
  process: [],
  qty_actual_machine: [],
  last_status: [],
  dandori_machine: [],
  tpt_machine: [],
  finish_machine: [],
  act_palet: [],
  tipe_palet: [],
  qty_palet: [],
  gsph_machine: [],
  lotsize_rh_shift1: [],
  lotsize_lh_shift1: [],
  lotsize_rh_shift2: [],
  lotsize_lh_shift2: [],
  total_prod_lh_shift1: [],
  total_prod_lh_shift2: [],
  total_prod_rh_shift1: [],
  total_prod_rh_shift2: [],
  SAP_LH_SHIFT1: [],
  SAP_LH_SHIFT2: [],
  SAP_RH_SHIFT1: [],
  SAP_RH_SHIFT2: [],
  total_reject_lh_shift1: [],
  total_reject_lh_shift2: [],
  total_reject_rh_shift1: [],
  total_reject_rh_shift2: [],
  keterangan_sap_shift1: [],
  keterangan_sap_shift2: [],
  additional_shift1: [],
  additional_shift2: [],
  patan_shift1: [],
  patan_shift2: [],
  accum_lotsize_rh: [],
};

let formDetailWLD = {
  MATNR: [],
  job_number: [],
  line: [],
  model: [],
  ZQTY_SAP_ZSHIFT1: [],
  ZQTY_SAP_ZSHIFT2: [],
  accum_sap_shift1: [],
  accum_sap_shift2: [],
};
export const useReportkanbanStampingStore = defineStore({
  id: "report-kanban-stamping",
  state() {
    return {
      apiUrl: configStore.apiUrl,
      formDetail,
      formDetailWLD,
      line_id: "",
      patan: "",
      permissions: {
        create: authStore.checkAccess("Report.View.Stock"),
      },
      table: {
        items: [],
      },
      params: utilityStore.getCurrentShift(),
      datatables: {
        headers: [
          {
            text: "Part Number",
            align: "left",
            value: "MATNR",
          },
          { text: "Line", align: "center", value: "line_id" },
          { text: "LKH", align: "center", value: "ZQTY_LKH" },
          { text: "SAP", align: "center", value: "ZQTY_SAP" },
          { text: "GAP", align: "center", value: "GAP" },
          { text: "SAP Period", align: "center", value: "total_sap" },
          { text: "Action", align: "center", value: "" },
        ],
        items: [],
        filters: {
          MATNR: [],
          line_id: [],
          ZQTY_LKH: [],
          ZQTY_SAP: [],
          GAP: [],
          total_sap: [],
        },
      },
      datatablesIncomplete: {
        headers: [
          {
            text: "Part Number",
            align: "left",
            value: "part_number",
          },
          { text: "Line", align: "center", value: "line_id" },
          { text: "GAP", align: "center", value: "gap" },
        ],
        items: [],
        filters: {
          part_number: [],
          line_id: [],
          gap: [],
        },
      },
      data: {
        dashboard: [],
        chart: [],
        detail: [],
      },
      dialogKBN: {
        filter: false,
        datePicker: false,
        datePickerPeriod: false,
        detail: false,
      },
      dialog: {
        filter: false,
        datePicker: false,
        datePickerPeriod: false,
        detail: false,
      },
      filter: {
        period: date.period,
      },
      formData: {
        period: date.period,
        date: date.date,
        stock_awal: 0,
        part_number: "",
      },
      tipeData: ["ALL", "Achieve", "Not Achieve", "Over"],
      detail: [],
      line: {
        patan: "",
        shift: "",
        date: "",
        line_id: "",
        gsph_plan: 0,
        downtime_plan: 0,
        idletime_plan: 0,
        cycle_time_plan: 0,
        good_plan: 0,
        repair_plan: 0,
        reject_plan: 0,
        length: 0,
        connection: false,
        detail: formDetail,
      },
    };
  },
  actions: {
    resetForm() {
      this.fetchReportIFP();
      this.dialog.form = false;
      this.dialog.formIfp = false;
      this.dialog.upload = false;
    },
    fetchAchievementKanbanStamping(tanggal) {
      notificationStore.loading = true;
      const data = new FormData();
      data.append("start", Array.isArray(tanggal) ? tanggal[0] : tanggal);
      data.append(
        "end",
        Array.isArray(tanggal) ? tanggal[1] ?? tanggal[0] : tanggal
      );

      axios
        .post(
          `http://${configStore.apiUrl}/majsf_rest_api/api/report-kanban`,
          data
        )
        .then((response) => {
          if (response.status === 200) {
            this.datatables.items = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
      setTimeout(() => {
        this.dialog.datePicker = false;
      }, 500);
    },
    filteredItems() {
      return this.datatables.items.filter((d) => {
        return Object.keys(this.datatables.filters).every((f) => {
          return (
            this.datatables.filters[f].length < 1 ||
            d[f]
              .toLowerCase()
              .includes(this.datatables.filters[f].toLowerCase())
          );
        });
      });
    },

    fetchDataDashboard() {
      notificationStore.loading = true;
      axios
        .get(`http://${configStore.apiUrl}/majsf_rest_api/api/report-kanban`, {
          params: this.filter,
        })
        .then((response) => {
          if (response.status === 200) {
            this.data.dashboard = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },

    loadDetail(part_number, tanggal) {
      notificationStore.loading = true;
      const data = new FormData();
      data.append("start", Array.isArray(tanggal) ? tanggal[0] : tanggal);
      data.append(
        "end",
        Array.isArray(tanggal) ? tanggal[1] ?? tanggal[0] : tanggal
      );
      data.append("part_number", part_number);
      axios
        .post(
          `http://${configStore.apiUrl}/majsf_rest_api/api/report-kanban/detail`,
          data
        )
        .then((response) => {
          if (response.data.status === false) {
            utilityStore.onApiResponse(response);
          } else {
            notificationStore.loading = false;
            this.data.detail = response.data;
            this.dialog.detail = true;
          }
        })
        .catch(utilityStore.onError);
    },

    fetchDataChart(tanggal) {
      notificationStore.loading = true;
      const data = new FormData();
      data.append("start", Array.isArray(tanggal) ? tanggal[0] : tanggal);
      data.append(
        "end",
        Array.isArray(tanggal) ? tanggal[1] ?? tanggal[0] : tanggal
      );

      axios
        .post(
          `http://${configStore.apiUrl}/majsf_rest_api/api/report-kanban/chart`,
          data
        )
        .then((response) => {
          if (response.status === 200) {
            this.data.chart = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },

    fetchIncompleteKanbanStamping(tanggal) {
      notificationStore.loading = true;
      const data = new FormData();
      data.append("start", Array.isArray(tanggal) ? tanggal[0] : tanggal);
      data.append(
        "end",
        Array.isArray(tanggal) ? tanggal[1] ?? tanggal[0] : tanggal
      );

      axios
        .post(
          `http://${configStore.apiUrl}/majsf_rest_api/api/report-kanban/incomplete`,
          data
        )
        .then((response) => {
          if (response.status === 200) {
            this.datatablesIncomplete.items = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
      setTimeout(() => {
        this.dialog.datePicker = false;
      }, 500);
    },
    filteredItemsIncomplete() {
      return this.datatablesIncomplete.items.filter((d) => {
        return Object.keys(this.datatablesIncomplete.filters).every((f) => {
          return (
            this.datatablesIncomplete.filters[f].length < 1 ||
            d[f]
              .toLowerCase()
              .includes(this.datatablesIncomplete.filters[f].toLowerCase())
          );
        });
      });
    },

    loadDataEditSAP(line) {
      console.log(line);
      this.line = line;
      let item = line.detail;
      this.dialogKBN.detail = true;
      this.line_id = line.line_id;
      this.formDetail = {
        additional: [],
        patan: [],
        part_rh: [],
        part_lh: [],
        lot_rh: [],
        lot_lh: [],
        act_rh: [],
        act_lh: [],
        gap_rh: [],
        gap_lh: [],
        total_sap: [],
        keterangan_all: [],
        keterangan_sap: [],
        lotsize_rh_shift1: [],
        lotsize_lh_shift1: [],
        lotsize_rh_shift2: [],
        lotsize_lh_shift2: [],
        total_prod_lh_shift1: [],
        total_prod_lh_shift2: [],
        total_prod_rh_shift1: [],
        total_prod_rh_shift2: [],
        SAP_LH_SHIFT1: [],
        SAP_LH_SHIFT2: [],
        SAP_RH_SHIFT1: [],
        SAP_RH_SHIFT2: [],
        total_reject_lh_shift1: [],
        total_reject_lh_shift2: [],
        total_reject_rh_shift1: [],
        total_reject_rh_shift2: [],
        keterangan_sap_shift1: [],
        keterangan_sap_shift2: [],
        additional_shift1: [],
        additional_shift2: [],
        patan_shift1: [],
        patan_shift2: [],
      };
      let loop = 0;
      while (loop < (item.length > 13 ? item.length : 13)) {
        const arrVar = ["keterangan_sap"];
        if (item[loop]) {
          Object.entries(this.formDetail).map((k) => {
            if (
              k[0] == "is_tandem" ||
              k[0] == "is_trial" ||
              k[0] == "is_terusan"
            ) {
              this.formDetail[k[0]][loop] =
                item[loop][k[0]] == "1" ? true : false;
            } else {
              if (arrVar.includes(k[0])) {
                this.formDetail[k[0]][loop] = item[loop][k[0]]
                  ? item[loop][k[0]].split(",")
                  : [];
              } else {
                this.formDetail[k[0]][loop] = item[loop][k[0]];
              }
            }
          });
        } else {
          Object.entries(this.formDetail).map((k) => {
            if (
              k[0] == "is_tandem" ||
              k[0] == "is_trial" ||
              k[0] == "is_terusan"
            ) {
              this.formDetail[k[0]][loop] = false;
            } else {
              if (arrVar.includes(k[0])) {
                this.formDetail[k[0]][loop] = [];
              } else {
                this.formDetail[k[0]][loop] = "";
              }
            }
          });
        }
        loop++;
      }
      this.countDataActual();
    },

    countDataActual() {
      this.formDetail.part_rh.map((item, index) => {
        // daftar untuk Kanban STP
        this.formDetail.lotsize_rh_shift1[index] =
          parseInt(this.formDetail.lotsize_rh_shift1[index]) > 0
            ? parseInt(this.formDetail.lotsize_rh_shift1[index])
            : "";
        this.formDetail.accum_lotsize_rh_1 =
          this.formDetail.lotsize_rh_shift1.every((value) => value === "")
            ? ""
            : this.formDetail.lotsize_rh_shift1.reduce(
                (a, b) => Number(a) + Number(b),
                0
              );

        this.formDetail.lotsize_rh_shift2[index] =
          parseInt(this.formDetail.lotsize_rh_shift2[index]) > 0
            ? parseInt(this.formDetail.lotsize_rh_shift2[index])
            : "";
        this.formDetail.accum_lotsize_rh_2 =
          this.formDetail.lotsize_rh_shift2.every((value) => value === "")
            ? ""
            : this.formDetail.lotsize_rh_shift2.reduce(
                (a, b) => Number(a) + Number(b),
                0
              );

        this.formDetail.lotsize_lh_shift1[index] =
          parseInt(this.formDetail.lotsize_lh_shift1[index]) > 0
            ? parseInt(this.formDetail.lotsize_lh_shift1[index])
            : "";
        this.formDetail.accum_lotsize_lh_1 =
          this.formDetail.lotsize_lh_shift1.every((value) => value === "")
            ? ""
            : this.formDetail.lotsize_lh_shift1.reduce(
                (a, b) => Number(a) + Number(b),
                0
              );

        this.formDetail.lotsize_lh_shift2[index] =
          parseInt(this.formDetail.lotsize_lh_shift2[index]) > 0
            ? parseInt(this.formDetail.lotsize_lh_shift2[index])
            : "";
        this.formDetail.accum_lotsize_lh_2 =
          this.formDetail.lotsize_lh_shift2.every((value) => value === "")
            ? ""
            : this.formDetail.lotsize_lh_shift2.reduce(
                (a, b) => Number(a) + Number(b),
                0
              );

        this.formDetail.total_prod_lh_shift1[index] =
          parseInt(this.formDetail.lotsize_lh_shift1[index]) > 0
            ? parseInt(this.formDetail.total_prod_lh_shift1[index])
            : "";
        this.formDetail.accum_prod_lh_1 =
          this.formDetail.total_prod_lh_shift1.every((value) => value === "")
            ? ""
            : this.formDetail.total_prod_lh_shift1.reduce(
                (a, b) => Number(a) + Number(b),
                0
              );

        this.formDetail.total_prod_lh_shift2[index] =
          parseInt(this.formDetail.lotsize_lh_shift2[index]) > 0
            ? parseInt(this.formDetail.total_prod_lh_shift2[index])
            : "";
        this.formDetail.accum_prod_lh_2 =
          this.formDetail.total_prod_lh_shift2.every((value) => value === "")
            ? ""
            : this.formDetail.total_prod_lh_shift2.reduce(
                (a, b) => Number(a) + Number(b),
                0
              );

        this.formDetail.total_prod_rh_shift1[index] =
          parseInt(this.formDetail.lotsize_rh_shift1[index]) > 0
            ? parseInt(this.formDetail.total_prod_rh_shift1[index])
            : "";
        this.formDetail.accum_prod_rh_1 =
          this.formDetail.total_prod_rh_shift1.every((value) => value === "")
            ? ""
            : this.formDetail.total_prod_rh_shift1.reduce(
                (a, b) => Number(a) + Number(b),
                0
              );

        this.formDetail.total_prod_rh_shift2[index] =
          parseInt(this.formDetail.lotsize_rh_shift2[index]) > 0
            ? parseInt(this.formDetail.total_prod_rh_shift2[index])
            : "";
        this.formDetail.accum_prod_rh_2 =
          this.formDetail.total_prod_rh_shift2.every((value) => value === "")
            ? ""
            : this.formDetail.total_prod_rh_shift2.reduce(
                (a, b) => Number(a) + Number(b),
                0
              );

        this.formDetail.total_lkh =
          (parseInt(this.formDetail.accum_prod_rh_1) || 0) +
          (parseInt(this.formDetail.accum_prod_lh_1) || 0) +
          (parseInt(this.formDetail.accum_prod_rh_2) || 0) +
          (parseInt(this.formDetail.accum_prod_lh_2) || 0);

        this.formDetail.SAP_LH_SHIFT1[index] = this.formDetail.SAP_LH_SHIFT1[
          index
        ]
          ? parseInt(this.formDetail.SAP_LH_SHIFT1[index])
          : "";
        this.formDetail.accum_sap_lh_1 = this.formDetail.SAP_LH_SHIFT1.every(
          (value) => value === ""
        )
          ? ""
          : this.formDetail.SAP_LH_SHIFT1.reduce(
              (a, b) => Number(a) + Number(b),
              0
            );

        this.formDetail.SAP_LH_SHIFT2[index] = this.formDetail.SAP_LH_SHIFT2[
          index
        ]
          ? parseInt(this.formDetail.SAP_LH_SHIFT2[index])
          : "";
        this.formDetail.accum_sap_lh_2 = this.formDetail.SAP_LH_SHIFT2.every(
          (value) => value === ""
        )
          ? ""
          : this.formDetail.SAP_LH_SHIFT2.reduce(
              (a, b) => Number(a) + Number(b),
              0
            );

        this.formDetail.SAP_RH_SHIFT1[index] = this.formDetail.SAP_RH_SHIFT1[
          index
        ]
          ? parseInt(this.formDetail.SAP_RH_SHIFT1[index])
          : "";
        this.formDetail.accum_sap_rh_1 = this.formDetail.SAP_RH_SHIFT1.every(
          (value) => value === ""
        )
          ? ""
          : this.formDetail.SAP_RH_SHIFT1.reduce(
              (a, b) => Number(a) + Number(b),
              0
            );

        this.formDetail.SAP_RH_SHIFT2[index] = this.formDetail.SAP_RH_SHIFT2[
          index
        ]
          ? parseInt(this.formDetail.SAP_RH_SHIFT2[index])
          : "";
        this.formDetail.accum_sap_rh_2 = this.formDetail.SAP_RH_SHIFT2.every(
          (value) => value === ""
        )
          ? ""
          : this.formDetail.SAP_RH_SHIFT2.reduce(
              (a, b) => Number(a) + Number(b),
              0
            );

        this.formDetail.total_sap =
          (parseInt(this.formDetail.accum_sap_rh_1) || 0) +
          (parseInt(this.formDetail.accum_sap_lh_1) || 0) +
          (parseInt(this.formDetail.accum_sap_rh_2) || 0) +
          (parseInt(this.formDetail.accum_sap_lh_2) || 0);

        this.formDetail.gap_rh[index] = !isNaN(
          parseInt(this.formDetail.gap_rh[index])
        )
          ? parseInt(this.formDetail.gap_rh[index])
          : "";
        this.formDetail.accum_gap_rh = this.formDetail.gap_rh.reduce(
          (a, b) => Number(a) + Number(b),
          0
        );

        this.formDetail.gap_lh[index] = !isNaN(
          parseInt(this.formDetail.gap_lh[index])
        )
          ? parseInt(this.formDetail.gap_lh[index])
          : "";
        this.formDetail.accum_gap_lh = this.formDetail.gap_lh.reduce(
          (a, b) => Number(a) + Number(b),
          0
        );

        this.formDetail.total_reject_lh_shift1[index] =
          parseInt(this.formDetail.total_reject_lh_shift1[index]) > 0
            ? parseInt(this.formDetail.total_reject_lh_shift1[index])
            : "";
        this.formDetail.accum_reject_lh_1 =
          this.formDetail.total_reject_lh_shift1.every((value) => value === "")
            ? ""
            : this.formDetail.total_reject_lh_shift1.reduce(
                (a, b) => Number(a) + Number(b),
                0
              );

        this.formDetail.total_reject_lh_shift2[index] =
          parseInt(this.formDetail.total_reject_lh_shift2[index]) > 0
            ? parseInt(this.formDetail.total_reject_lh_shift2[index])
            : "";
        this.formDetail.accum_reject_lh_2 =
          this.formDetail.total_reject_lh_shift2.every((value) => value === "")
            ? ""
            : this.formDetail.total_reject_lh_shift2.reduce(
                (a, b) => Number(a) + Number(b),
                0
              );

        this.formDetail.total_reject_rh_shift1[index] =
          parseInt(this.formDetail.total_reject_rh_shift1[index]) > 0
            ? parseInt(this.formDetail.total_reject_rh_shift1[index])
            : "";
        this.formDetail.accum_reject_rh_1 =
          this.formDetail.total_reject_rh_shift1.every((value) => value === "")
            ? ""
            : this.formDetail.total_reject_rh_shift1.reduce(
                (a, b) => Number(a) + Number(b),
                0
              );

        this.formDetail.total_reject_rh_shift2[index] =
          parseInt(this.formDetail.total_reject_rh_shift2[index]) > 0
            ? parseInt(this.formDetail.total_reject_rh_shift2[index])
            : "";
        this.formDetail.accum_reject_rh_2 =
          this.formDetail.total_reject_rh_shift2.every((value) => value === "")
            ? ""
            : this.formDetail.total_reject_rh_shift2.reduce(
                (a, b) => Number(a) + Number(b),
                0
              );

        this.formDetail.keterangan_sap_shift1[index] = this.formDetail
          .keterangan_sap_shift1[index]
          ? this.formDetail.keterangan_sap_shift1[index]
          : "";
        this.formDetail.keterangan_sap_shift2[index] = this.formDetail
          .keterangan_sap_shift2[index]
          ? this.formDetail.keterangan_sap_shift2[index]
          : "";

        this.formDetail.additional_shift1[index] = this.formDetail
          .additional_shift1[index]
          ? this.formDetail.additional_shift1[index]
          : "";
        this.formDetail.additional_shift2[index] = this.formDetail
          .additional_shift2[index]
          ? this.formDetail.additional_shift2[index]
          : "";
        this.formDetail.patan_shift1[index] = this.formDetail.patan_shift1[
          index
        ]
          ? this.formDetail.patan_shift1[index]
          : "";
        this.formDetail.patan_shift2[index] = this.formDetail.patan_shift2[
          index
        ]
          ? this.formDetail.patan_shift2[index]
          : "";
        // end
        this.formDetail.patan[index] = this.patan;
      });
    },

    fetchDataSAP(TAG) {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/report-kanban/sync_sap?tag=${TAG}`,
          { params: this.params }
        )
        .then((response) => {
          if (response.status === 200) {
            notificationStore.disableLoading();
            if(TAG == 'LKH-STP') {
              stampingStore.fetchDataKanbanSTP()
            } else if(TAG == 'LKH-WLD') {
              stampingStore.fetchDataKanbanWLD()
            }
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },

    loadDataEditSAPWLD(line) {
      console.log(line);
      this.line = line;
      let item = line.detail;
      this.dialogKBN.detail = true;
      this.line_id = line.line_id;
      this.formDetailWLD = {
        MATNR: [],
        job_number: [],
        line: [],
        model: [],
        ZQTY_SAP_ZSHIFT1: [],
        ZQTY_SAP_ZSHIFT2: [],
        accum_sap_shift1: [],
        accum_sap_shift2: [],
      };
      let loop = 0;
      while (loop < (item.length > 13 ? item.length : 13)) {
        const arrVar = ["keterangan_sap"];
        if (item[loop]) {
          Object.entries(this.formDetailWLD).map((k) => {
            if (
              k[0] == "is_tandem" ||
              k[0] == "is_trial" ||
              k[0] == "is_terusan"
            ) {
              this.formDetailWLD[k[0]][loop] =
                item[loop][k[0]] == "1" ? true : false;
            } else {
              if (arrVar.includes(k[0])) {
                this.formDetailWLD[k[0]][loop] = item[loop][k[0]]
                  ? item[loop][k[0]].split(",")
                  : [];
              } else {
                this.formDetailWLD[k[0]][loop] = item[loop][k[0]];
              }
            }
          });
        } else {
          Object.entries(this.formDetailWLD).map((k) => {
            if (
              k[0] == "is_tandem" ||
              k[0] == "is_trial" ||
              k[0] == "is_terusan"
            ) {
              this.formDetailWLD[k[0]][loop] = false;
            } else {
              if (arrVar.includes(k[0])) {
                this.formDetailWLD[k[0]][loop] = [];
              } else {
                this.formDetailWLD[k[0]][loop] = "";
              }
            }
          });
        }
        loop++;
      }
      this.countDataActualWLD();
    },

    countDataActualWLD() {
      this.formDetailWLD.MATNR.map((item, index) => {
        this.formDetailWLD.ZQTY_SAP_ZSHIFT1[index] = this.formDetailWLD
          .ZQTY_SAP_ZSHIFT1[index]
          ? parseInt(this.formDetailWLD.ZQTY_SAP_ZSHIFT1[index])
          : "";
        this.formDetailWLD.accum_sap_shift1 =
          this.formDetailWLD.ZQTY_SAP_ZSHIFT1.every((value) => value === "")
            ? ""
            : this.formDetailWLD.ZQTY_SAP_ZSHIFT1.reduce(
                (a, b) => Number(a) + Number(b),
                0
              );

        this.formDetailWLD.ZQTY_SAP_ZSHIFT2[index] = this.formDetailWLD
          .ZQTY_SAP_ZSHIFT2[index]
          ? parseInt(this.formDetailWLD.ZQTY_SAP_ZSHIFT2[index])
          : "";
        this.formDetailWLD.accum_sap_shift2 =
          this.formDetailWLD.ZQTY_SAP_ZSHIFT2.every((value) => value === "")
            ? ""
            : this.formDetailWLD.ZQTY_SAP_ZSHIFT2.reduce(
                (a, b) => Number(a) + Number(b),
                0
              );

        this.formDetailWLD.total_sap =
          (parseInt(this.formDetailWLD.accum_sap_shift1) || 0) +
          (parseInt(this.formDetailWLD.accum_sap_shift2) || 0);
      });
    },
  },
});
