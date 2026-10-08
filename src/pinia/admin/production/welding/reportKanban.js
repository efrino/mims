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
export const useReportkanbanWeldingStore = defineStore({
  id: "report-kanban-stamping",
  state() {
    return {
      apiUrl: configStore.apiUrl,
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
        detail: formDetailWLD,
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
    fetchAchievementKanbanWelding(tanggal) {
      notificationStore.loading = true;
      const data = new FormData();
      data.append("start", Array.isArray(tanggal) ? tanggal[0] : tanggal);
      data.append(
        "end",
        Array.isArray(tanggal) ? tanggal[1] ?? tanggal[0] : tanggal
      );

      axios
        .post(
          `http://${configStore.apiUrl}/majsf_rest_api/api/report-kanban/welding`,
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
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/report-kanban/welding`,
          {
            params: this.filter,
          }
        )
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
          `http://${configStore.apiUrl}/majsf_rest_api/api/report-kanban/chart_welding`,
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
            if (TAG == "LKH-STP") {
              stampingStore.fetchDataKanbanSTP();
            } else if (TAG == "LKH-WLD") {
              stampingStore.fetchDataKanbanWLD();
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
        PLAN_SHIFT1: [],
        PLAN_SHIFT2: [],
        accum_plan_shift1: [],
        accum_plan_shift2: [],
        ACT_SHIFT1: [],
        ACT_SHIFT2: [],
        accum_lkh_shift1: [],
        accum_lkh_shift2: [],
        NG_SHIFT1: [],
        NG_SHIFT2: [],
        accum_ng_shift1: [],
        accum_ng_shift2: [],
        PATAN_SHIFT1: [],
        PATAN_SHIFT2: [],
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

        this.formDetailWLD.accum_plan_shift1 =
          this.formDetailWLD.PLAN_SHIFT1.every((value) => value === "")
            ? ""
            : this.formDetailWLD.PLAN_SHIFT1.reduce(
                (a, b) => Number(a) + Number(b),
                0
              );

        this.formDetailWLD.accum_plan_shift2 =
          this.formDetailWLD.PLAN_SHIFT2.every((value) => value === "")
            ? ""
            : this.formDetailWLD.PLAN_SHIFT2.reduce(
                (a, b) => Number(a) + Number(b),
                0
              );

        this.formDetailWLD.accum_lkh_shift1 =
          this.formDetailWLD.ACT_SHIFT1.every((value) => value === "")
            ? ""
            : this.formDetailWLD.ACT_SHIFT1.reduce(
                (a, b) => Number(a) + Number(b),
                0
              );

        this.formDetailWLD.accum_lkh_shift2 =
          this.formDetailWLD.ACT_SHIFT2.every((value) => value === "")
            ? ""
            : this.formDetailWLD.ACT_SHIFT2.reduce(
                (a, b) => Number(a) + Number(b),
                0
              );

        this.formDetailWLD.accum_ng_shift1 = this.formDetailWLD.NG_SHIFT1.every(
          (value) => value === ""
        )
          ? ""
          : this.formDetailWLD.NG_SHIFT1.reduce(
              (a, b) => Number(a) + Number(b),
              0
            );

        this.formDetailWLD.accum_ng_shift2 = this.formDetailWLD.NG_SHIFT2.every(
          (value) => value === ""
        )
          ? ""
          : this.formDetailWLD.NG_SHIFT2.reduce(
              (a, b) => Number(a) + Number(b),
              0
            );

        this.formDetailWLD.total_lkh =
          (parseInt(this.formDetailWLD.accum_lkh_shift1) || 0) +
          (parseInt(this.formDetailWLD.accum_lkh_shift2) || 0);
          
      });
    },
  },
});
