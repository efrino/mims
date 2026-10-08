import axios from "axios";
import { defineStore } from "pinia";
import { useNotificationStore } from "@/pinia/notification";
import { useConfigStore } from "@/pinia/config";
import { useUtilityStore } from "@/pinia/utility";
import { useAuthStore } from "@/pinia/auth";
import moment from "moment";
import CryptoJS from "crypto-js";

const configStore = useConfigStore();
const notificationStore = useNotificationStore();
const utilityStore = useUtilityStore();
const authStore = useAuthStore();
let formAttendance = {
  standard: [],
  present: [],
  leave: [],
  sick: [],
};
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
  order_start: [],
  isManualInput: [],
  qty_sap: [],
};
export const useWeldingAchievementStore = defineStore({
  id: "production-welding-achievement",
  state() {
    return {
      apiUrl: configStore.apiUrl,
      view: false,
      formDetail,
      formAttendance,
      context: null,
      table: {
        items: [],
      },
      partItems: [],
      params: utilityStore.getCurrentShift(),
      shiftNow: utilityStore.getShiftNow(),
      statusForm: "",
      graph: [],
      permissions: {
        create: authStore.checkAccess("Production.Create.AchievementWelding"),
        update: authStore.checkAccess("Production.Update.AchievementWelding"),
        download: authStore.checkAccess("Report.Download.AchievementWelding"),
        pcd: authStore.checkAccess("Production.PCD.AchievementWelding"),
      },
      reportSummary: {
        datatables: {
          headers: [
            { text: "Date", align: "left", value: "date" },
            { text: "Shift", align: "left", value: "shift" },
            { text: "Patan", align: "left", value: "patan" },
            { text: "Line", align: "left", value: "line_id" },
            { text: "UPH Plan", align: "left", value: "uph_plan" },
            { text: "UPH Actual", align: "left", value: "uph_actual" },
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
            uph_plan: [],
            uph_actual: [],
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
      formData: {
        id_kanban: "",
        id_wis: "",
        qty_kbn: "",
        part_number: "",
        lotsize_actual: "",
        shift: 1,
      },
      listLine: [
        "S/A ROBOT",
        "S/A MANUAL",
        "CO MANUAL",
        "CO ROBOT",
        "WSS A",
        "WSS B",
        "WSS C",
        "WSS D",
        "WSS E",
        "WSS G",
        "WSS H",
        "WSS HMMI",
        "S/A HMMI",
        "CO ROBOT HMMI",
      ],
      list: {
        palet: ["C", "D", "D2", "Gantung", "WBD"],
        status: ["WIP", "FP"],
        keteranganPlan: [
          "Revisi Plan",
          "Cancel Plan",
          "Switch Item",
          "R/M Kosong",
          "Prioritas",
          "Service Part",
          "Buffer",
          "WIP Kosong",
          "BL Kosong",
          "Delay Material",
          "Delay Dies",
          "Delay WIP",
          "Delay BL",
          "Kombinasi Item",
          "Delay Kanban",
        ],
        keteranganItem: [
          "Lanjutan Shift 1",
          "Lanjutan Shift 2",
          "1 Lot R/M ≠ LotSize",
          "Tarik Patan",
          "WIP Kurang",
          "Blank Kurang",
          "Problem Mesin",
          "Problem Dies",
          "Problem Crane",
          "Lanjut Shift Berikut",
          "R/M Kurang",
          "Switching LINE A",
          "Switching LINE B",
          "Switching LINE C",
          "Switching LINE D",
          "Switching LINE E",
          "Switching LINE F",
          "Switching LINE G",
          "Switching LINE H",
          "Switching LINE 300T",
          "Switching LINE SP",
          "Pallet Std Kosong",
          "Trial Produksi",
          "Kanban Kurang",
          "Kanban Kosong",
          "Sdh Tarik Proses",
          "Stock BL Over",
          "Stock WIP Over",
          "Stock FP Over",
          "Waktu Tidak Cukup",
          "Add SO",
          "Tambah Lotsize",
          "Problem Raw Material",
        ],
        patan: ["Add", "A", "B", "C", "D", "R1", "LJ", "TP"],
        lineId: ["A", "B", "C", "D", "E", "F", "G", "H", "300T", "SP"],
        combinationProcess: ["5 - 0", "4 - 0", "3 - 0", "2 - 0", "1 - 0"],
        planProcess: ["1", "2", "3", "4", "5", "6", "7"],
        actProcess: ["1", "2", "3", "4", "5", "6"],
        shift: [1, 2],
        keterangan_sap: [
          "Scan Minus Kbn",
          "Minus Kbn Cut Off",
          "Minus Part Reject",
          "Minus Trouble Dies",
          "Minus Trouble Mesin",
          "Minus R/M kurang",
          "Kanban Error",
          "Add Request Qty",
          "Add Pcs Reject",
        ],
      },
      line: {
        patan: "",
        shift: "",
        date: "",
        line_id: "",
        uph_plan: 0,
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
      dialog: {
        detail: false,
        datePicker: false,
        filter: false,
        template: false,
        submitActual: false,
        formLed: false,
        formKetRepair: false,
        formKetDT: false,
        confirmDelete: false,
        formKanban: false,
        formStartLed: false,
        formTag: false,
        addLine: false,
        grouping: false,
      },
      lines: [],
      listShift: [1, 2],
      table_tag: [],
    };
  },
  actions: {
    resetForm() {
      this.fetchDataLine();
    },
    fetchAchievementRobot(id) {
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/Inventory_achievement_welding/display?line=${id}`
        )
        .then((response) => {
          if (response.status === 200) {
            this.table.items = response.data;
            notificationStore.disableLoading();
          }
        });
    },
    fetchDataWecon() {
      axios.post(
        `http://${configStore.apiUrl}/majsf_rest_api/api/Inventory_achievement_welding`
      );
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
    fetchDataPartIFP() {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/master/Welding/part_ifp?tipe=part`
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
    searchPart(item) {
      return `<strong>${item.job_number}</strong> - ${item.part_number}`;
    },
    
    customFilter(item, queryText) {
      const normalize = str =>
      (str || '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .replace(/0/g, ''); 
      const query = normalize(queryText);
      return normalize(item.part_number).includes(query) ||
             normalize(item.job_number).includes(query);
    },

    getQtyKbn() {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/master/Welding/qty_kanban?part_number=${this.formData.part_number}`
        )
        .then((response) => {
          if (response.status === 200) {
            this.formData.qty_kbn = response.data;
            this.formData.lotsize_actual = "";
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },

    onScanKanban(data) {
      const fd = new URLSearchParams();
      // const id = this.line_id;
      fd.append("date", this.params.date);
      fd.append("shift", this.params.shift);
      fd.append("id_kanban", data);
      fd.append("tipe", "WLD");

      const configHttp = {
        method: "put",
        url: `http://${configStore.apiUrl}/majsf_rest_api/api/welding-achievement/print`,
        headers: {
          "Content-Type": "multipart/form-data",
        },
        data: fd,
      };
      axios(configHttp)
        .then((response) => {
          if (response.data.success === true) {
            const secretKey = "armada123";
            const dataToEncrypt = JSON.stringify({
              id_kanban: data,
            });

            const encryptedData = CryptoJS.AES.encrypt(
              dataToEncrypt,
              secretKey
            ).toString();

            window.open(
              `http://${
                configStore.apiUrl
              }/mims/production/welding/print-tag-ok?parameter_tag=${encodeURIComponent(
                encryptedData
              )}`,
              // `http://localhost:8080/production/welding/print-tag-ok?parameter_tag=${encodeURIComponent(
              //   encryptedData
              // )}`,
              "_blank"
            );
          } else {
            utilityStore.onApiResponse(response);
          }
          this.formData.id_kanban = "";
        })
        .catch(configStore.onError);
    },
    fetchDataLineByID(id) {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/welding-achievement/display?line=${id}`
        )
        .then((response) => {
          if (response.status === 200) {
            if (response.data.status) {
              this.loadDataDetailEdit(response.data.data);
              notificationStore.disableResponse();
            } else {
              utilityStore.onApiResponse(response);
            }
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        });
    },
    loadDataDetailEdit(line) {
      this.line = line;
      let item = line.detail;
      let att = line.attendance;
      this.dialog.detail = true;
      this.line_id = line.line_id;
      this.is_done = line.is_done;
      this.formAttendance = {
        standard: [],
        present: [],
        leave: [],
        sick: [],
      };
      this.formDetail = {
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
        order_start: [],
        isManualInput: [],
        qty_sap: [],
      };
      let loop = 0;
      while (loop < (item.length > 12 ? item.length : 15)) {
        const arrVar = ["machine", "process"];
        if (item[loop]) {
          Object.entries(this.formDetail).map((k) => {
            if (k[0] == "is_tandem" || k[0] == "is_terusan") {
              this.formDetail[k[0]][loop] =
                item[loop][k[0]] == "1" ? true : false;
            } else {
              if (arrVar.includes(k[0])) {
                this.formDetail[k[0]][loop] = item[loop][k[0]]
                  ? item[loop][k[0]].split(" ")
                  : [];
              } else {
                this.formDetail[k[0]][loop] = item[loop][k[0]];
              }
            }
          });
        } else {
          Object.entries(this.formDetail).map((k) => {
            if (k[0] == "is_tandem" || k[0] == "is_terusan") {
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

      let looping = 0;
      while (looping < att.length) {
        Object.entries(this.formAttendance).map((k) => {
          // Ambil nama properti dari k[0]
          const key = k[0];
          // Periksa apakah properti ada dalam att[looping] menggunakan Object.keys
          if (Object.keys(att[looping]).includes(key)) {
            this.formAttendance[key][looping] = att[looping][key];
          } else {
            // Jika tidak ada, kosongkan atau beri nilai default
            this.formAttendance[key][looping] = "";
          }
        });
        looping++;
      }

      this.countDataActual();
    },

    countDataActual() {
      let qty_actual = 0;
      let qty_plan = 0;
      let total_repair = 0;
      let total_reject = 0;
      // var array = [];
      const time = this.params.shift == "1" ? "07:15" : "20:00";
      let current_actual = moment(
        `${this.params.date} ${time}`,
        "YYYY-MM-DD HH:mm"
      );
      let current = moment(`${this.params.date} ${time}`, "YYYY-MM-DD HH:mm");
      let current_plan = moment(
        `${this.params.date} ${time}`,
        "YYYY-MM-DD HH:mm"
      );

      let current_now = moment(`${this.params.date}`, "YYYY-MM-DD HH:mm");
      this.formDetail.lotsize_actual.map((item, index) => {
        if (this.formDetail.lotsize_actual[index]) {
          if (this.formDetail.order_start[index] == 2) {
            // Dijadiin 0 dulu
            const firstIndexWithTwo = this.formDetail.order_start.findIndex(
              (value) => value === "2"
            );

            const lastIndexWithOne =
              this.formDetail.order_start.lastIndexOf("1");
            if (firstIndexWithTwo == index) {
              current_actual = moment(current_actual, "hh:mm:ss A").subtract(
                this.formDetail.tpt_actual[lastIndexWithOne],
                "minutes"
              );
            } else {
              current_actual = moment(current_actual, "hh:mm:ss A").subtract(
                parseInt(this.formDetail.tpt_actual[lastIndexWithOne]) +
                  parseInt(this.formDetail.tpt_actual[index - 1]),
                "minutes"
              );
            }

            const startActual = current_actual.format("YYYY-MM-DD HH:mm");
            current_actual = moment(current_actual, "hh:mm:ss A").add(
              parseInt(this.formDetail.tpt_actual[lastIndexWithOne]) +
                parseInt(this.formDetail.tpt_actual[index]),
              "minutes"
            );

            const endActual = current_actual.format("YYYY-MM-DD HH:mm");
            const breakTimeActual = utilityStore.mappingBreak(
              this.params,
              startActual,
              endActual
            );
            current_actual = moment(current_actual, "hh:mm:ss").add(
              breakTimeActual,
              "minutes"
            );
          } else if (this.formDetail.order_start[index] == 3) {
            // Dijadiin 0 dulu
            current_actual = moment(current_actual, "hh:mm:ss A").subtract(
              this.formDetail.tpt_actual[index - 1],
              "minutes"
            );

            const startActual = current_actual.format("YYYY-MM-DD HH:mm");
            current_actual = moment(current_actual, "hh:mm:ss A").add(
              parseInt(this.formDetail.tpt_actual[index - 1]) +
                parseInt(this.formDetail.tpt_actual[index]),
              "minutes"
            );

            const endActual = current_actual.format("YYYY-MM-DD HH:mm");
            const breakTimeActual = utilityStore.mappingBreak(
              this.params,
              startActual,
              endActual
            );
            current_actual = moment(current_actual, "hh:mm:ss").add(
              breakTimeActual,
              "minutes"
            );
          } else if (
            this.formDetail.order_start[index] == 0 ||
            this.formDetail.order_start[index] == 1
          ) {
            const startActual = current_actual.format("YYYY-MM-DD HH:mm");
            current_actual = moment(current_actual, "hh:mm:ss A").subtract(
              this.formDetail.tpt_actual[index - 1],
              "minutes"
            );
            current_actual = moment(current_actual, "hh:mm:ss A").add(
              this.formDetail.tpt_actual[index],
              "minutes"
            );
            const endActual = current_actual.format("YYYY-MM-DD HH:mm");
            const breakTimeActual = utilityStore.mappingBreak(
              this.params,
              startActual,
              endActual
            );
            current_actual = moment(current_actual, "hh:mm:ss").add(
              breakTimeActual,
              "minutes"
            );
          }

          this.formDetail.finish_actual[index] =
            this.formDetail.tpt_actual[index] !== "0"
              ? current_actual.format("HH : mm")
              : "";
        }

        this.formDetail.total_lotsize_act[index] = this.formDetail
          .lotsize_actual[index]
          ? parseInt(this.formDetail.lotsize_actual[index] | 0) +
            parseInt(this.formDetail.repair[index] | 0)
          : 0;

        this.formDetail.total_lotsize_lh[index] =
          this.formDetail.lotsize_actual[index] ||
          this.formDetail.repair[index] ||
          this.formDetail.reject[index]
            ? parseInt(this.formDetail.lotsize_actual[index]) +
              parseInt(this.formDetail.repair[index]) +
              parseInt(this.formDetail.reject[index])
            : 0;

        this.formDetail.stroke_act[index] = this.formDetail.total_lotsize_act[
          index
        ]
          ? parseInt(this.formDetail.total_lotsize_act[index] | 0) *
            parseInt(this.formDetail.stroke_plan[index] | 0)
          : 0;

        this.formDetail.total_dt[index] =
          parseInt(this.formDetail.dt_machines[index]) +
          parseInt(this.formDetail.dt_jig[index]) +
          parseInt(this.formDetail.dt_other[index]) +
          parseInt(this.formDetail.dt_wip[index]);

        // console.log(this.formDetail.tpt_actual[index]);
        let tpt_before = this.formDetail.tpt_actual[index];

        this.formDetail.tpt_actual[index] = this.formDetail.lotsize_actual[
          index
        ]
          ? (parseInt(this.formDetail.lotsize_actual[index]) /
              parseInt(this.formDetail.uph_plan[index])) *
            60
          : "";

        console.log(tpt_before + " = " + this.formDetail.tpt_actual[index]);
        if (
          this.formDetail.tpt_actual[index] /
            parseInt(this.formDetail.lotsize_actual[index]) !=
          tpt_before / parseInt(this.formDetail.lotsize_actual[index])
        ) {
          // console.log(
          //   this.formDetail.tpt_actual[index] /
          //     parseInt(this.formDetail.lotsize_actual[index]) +
          //     " = " +
          //     tpt_before / parseInt(this.formDetail.lotsize_actual[index])
          // );
        }

        this.formDetail.uph[index] =
          this.formDetail.tpt_actual[index] > 0
            ? (
                (this.formDetail.total_lotsize_act[index] /
                  this.formDetail.tpt_actual[index].toFixed(2)) *
                60
              ).toFixed(0)
            : "";

        this.formDetail.patan[index] = this.patan;

        this.formDetail.total_tpt_actual = this.formDetail.tpt_actual
          .reduce((a, b) => Number(a) + Number(b), 0)
          .toFixed(0);

        this.formDetail.tpt_total = this.formDetail.tpt.reduce(
          (a, b) => Number(a) + Number(b),
          0
        );
        this.formDetail.total_ok = this.formDetail.lotsize_actual.reduce(
          (a, b) => Number(a) + Number(b),
          0
        );

        this.formDetail.total_sap = this.formDetail.qty_sap.reduce(
          (a, b) => Number(a) + Number(b),
          0
        );

        this.formDetail.total_stroke = this.formDetail.stroke_plan.reduce(
          (a, b) => Number(a) + Number(b),
          0
        );

        this.formDetail.total_lot_rh = this.formDetail.lotsize.reduce(
          (a, b) => Number(a) + Number(b),
          0
        );

        this.formDetail.total_lot_lh = this.formDetail.lotsize.reduce(
          (a, b) => Number(a) + Number(b),
          0
        );

        this.formDetail.total_stroke_actual = this.formDetail.stroke_act.reduce(
          (a, b) => Number(a) + Number(b),
          0
        );
        this.formDetail.avg_uph_actual =
          (this.formDetail.total_lotsize_act.reduce(
            (a, b) => Number(a) + Number(b),
            0
          ) /
            this.formDetail.total_tpt_actual) *
          60;

        this.formDetail.total_repair = this.formDetail.repair.reduce(
          (a, b) => Number(a) + Number(b),
          0
        );

        this.formDetail.total_reject = this.formDetail.reject.reduce(
          (a, b) => Number(a) + Number(b),
          0
        );

        this.formDetail.total_dandori = this.formDetail.dandori.reduce(
          (a, b) => Number(a) + Number(b),
          0
        );

        this.formDetail.total_dt_machines = this.formDetail.dt_machines.reduce(
          (a, b) => Number(a) + Number(b),
          0
        );

        this.formDetail.total_dt_jig = this.formDetail.dt_jig.reduce(
          (a, b) => Number(a) + Number(b),
          0
        );

        this.formDetail.total_dt_other = this.formDetail.dt_other.reduce(
          (a, b) => Number(a) + Number(b),
          0
        );
        this.formDetail.total_dt_wip = this.formDetail.dt_wip.reduce(
          (a, b) => Number(a) + Number(b),
          0
        );

        this.formDetail.dt_total =
          this.formDetail.total_dt_machines +
          this.formDetail.total_dt_jig +
          this.formDetail.total_dt_other +
          this.formDetail.total_dt_wip;

        this.formDetail.tpt_minutes = this.formDetail.total_tpt_actual / 60;

        this.formDetail.range_tpt = this.formDetail.tpt_minutes
          ? current_now.format("HH : mm")
          : "-";

        this.formDetail.total_idletime = this.formDetail.idletime.reduce(
          (a, b) => Number(a) + Number(b),
          0
        );

        // Hilangkan data kosong
        this.formDetail.keterangan_filter = this.formDetail.information.filter(
          (item) => item
        );
        // Array to String
        this.formDetail.keterangan_sum =
          this.formDetail.keterangan_filter.join(", ");

        const start = current.format("YYYY-MM-DD HH:mm");
        current = moment(current, "hh:mm:ss A").add(
          this.formDetail.tpt[index] ? this.formDetail.tpt[index] : 0,
          "minutes"
        );
        current_plan = moment(current_plan, "hh:mm:ss A").add(
          this.formDetail.tpt_actual[index] !== "0" &&
            this.formDetail.tpt_actual[index] !== ""
            ? this.formDetail.tpt[index]
            : 0,
          "minutes"
        );
        const end = current.format("YYYY-MM-DD HH:mm");
        const breakTime = utilityStore.mappingBreak(this.params, start, end);
        current = moment(current, "hh:mm:ss A").add(breakTime, "minutes");
        current_plan = moment(current_plan, "hh:mm:ss A").add(
          breakTime,
          "minutes"
        );
        this.formDetail.finish_plan[index] = this.formDetail.part_number[index]
          ? current.format("HH : mm")
          : "";
      });
      this.formAttendance.present;

      this.formDetail.hadir.filter((item) => item);
      this.line.hadir = this.formDetail.hadir.filter((item) => item).shift();
      this.formDetail.izin.filter((item) => item);
      this.line.izin = this.formDetail.izin.filter((item) => item).shift();
      this.formDetail.sakit.filter((item) => item);
      this.line.sakit = this.formDetail.sakit.filter((item) => item).shift();
      total_repair = this.formDetail.total_repair
        ? this.formDetail.total_repair
        : 0;

      this.line.total_repair = total_repair;
      total_reject = this.formDetail.total_reject;

      this.line.total_reject = total_reject;
      this.line.total_part_plan = qty_plan;
      this.line.total_part_actual = qty_actual;
      this.line.good_actual =
        100 - this.line.repair_actual - this.line.reject_actual;

      this.line.qty_ok = parseInt(this.formDetail.total_ok);

      this.line.ok_persen =
        (parseInt(this.line.qty_ok) /
          (parseInt(this.formDetail.total_ok) +
            parseInt(this.formDetail.total_repair))) *
        100;

      this.line.repair_persen =
        (parseInt(total_repair) / parseInt(this.line.qty_ok)) * 100;

      this.line.reject_persen =
        (parseInt(total_reject) / parseInt(this.line.qty_ok)) * 100;
    },

    fetchDataLine(type) {
      if (!type) {
        notificationStore.loading = true;
      }
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/welding-achievement/achievement`,
          { params: this.params }
        )
        .then((response) => {
          if (response.status === 200) {
            if (response.data.status) {
              this.lines = response.data.data.map((data) => {
                let total_qty_gsph = 0;
                let total_tpt = 0;
                let downtime = 0;
                let idletime = 0;
                let repair = 0;
                let reject = 0;
                let qty_actual = 0;
                let qty_plan = 0;
                let stroke = 0;
                let lotsize = 0;
                let tpt = 0;
                let stroke_actual = 0;
                let lotsize_actual = 0;
                let dandori = 0;
                let dt_machines = 0;
                let dt_dies = 0;
                let dt_other = 0;
                let dt_material = 0;
                let tpt_actual = 0;
                let gsph_total = 0;
                let total_repair = 0;
                let total_reject = 0;
                let total_stroke_actual = 0;
                const time = this.params.shift == "1" ? "07:15" : "20:00";
                let current_actual = moment(
                  `${this.params.date} ${time}`,
                  "YYYY-MM-DD HH:mm"
                );
                let current = moment(
                  `${this.params.date} ${time}`,
                  "YYYY-MM-DD HH:mm"
                );
                this.patan = data.patan;
                data.detail = data.detail.map((item) => {
                  if (item.part_number) {
                    downtime += parseFloat(
                      item.downtime ? item.downtime : null
                    );
                    repair += parseFloat(item.repair ? item.repair : null);
                    reject += parseFloat(item.reject ? item.reject : null);
                    qty_actual += parseFloat(
                      item.qty_actual ? item.qty_actual : null
                    );
                    if (item.is_tandem == "0") {
                      const startActual =
                        current_actual.format("YYYY-MM-DD HH:mm");
                      current_actual = moment(current_actual, "hh:mm:ss A").add(
                        item.tpt_actual ? item.tpt_actual : null,
                        "minutes"
                      );
                      const endActual =
                        current_actual.format("YYYY-MM-DD HH:mm");
                      const breakTimeActual = utilityStore.mappingBreak(
                        this.params,
                        startActual,
                        endActual
                      );

                      current_actual = moment(current_actual, "hh:mm:ss").add(
                        breakTimeActual,
                        "minutes"
                      );

                      item.finish_actual = item.tpt_actual
                        ? current_actual.format("HH : mm")
                        : "";
                    }
                  }
                  stroke += parseFloat(
                    item.stroke_plan ? item.stroke_plan : null
                  );
                  lotsize += parseFloat(item.lotsize ? item.lotsize : null);
                  tpt += parseFloat(item.tpt ? item.tpt : null);
                  stroke_actual = item.lotsize_actual
                    ? parseInt(item.lotsize_actual) * parseInt(item.act_process)
                    : null;
                  total_stroke_actual += parseFloat(
                    item.lotsize_actual
                      ? parseInt(item.lotsize_actual) *
                          parseInt(item.act_process)
                      : null
                  );

                  item.stroke_actual = stroke_actual;
                  lotsize_actual += parseFloat(
                    item.lotsize_actual ? item.lotsize_actual : null
                  );
                  dandori += parseFloat(item.dandori ? item.dandori : null);
                  dt_machines += parseFloat(
                    item.dt_machines ? item.dt_machines : null
                  );
                  dt_dies += parseFloat(item.dt_dies ? item.dt_dies : null);
                  dt_other += parseFloat(item.dt_other ? item.dt_other : null);
                  dt_material += parseFloat(
                    item.dt_material ? item.dt_material : null
                  );
                  tpt_actual += parseFloat(
                    item.tpt_actual ? item.tpt_actual : null
                  );
                  total_repair += parseFloat(
                    item.repair
                      ? parseInt(item.repair) + parseInt(item.repair)
                      : null
                  );

                  total_reject += parseFloat(
                    item.reject_rh
                      ? parseInt(item.reject) + parseInt(item.reject)
                      : null
                  );

                  item.total_gsph =
                    (item.stroke_actual /
                      (item.value_combination * item.tpt_actual)) *
                    60;
                  gsph_total = (stroke_actual / (4 * tpt_actual)) * 60;
                  qty_plan += parseFloat(item.lotsize ? item.lotsize : null);
                  const start = current.format("YYYY-MM-DD HH:mm");
                  current = moment(current, "hh:mm:ss A").add(
                    item.tpt ? item.tpt : null,
                    "minutes"
                  );
                  const end = current.format("YYYY-MM-DD HH:mm");
                  const breakTime = utilityStore.mappingBreak(
                    this.params,
                    start,
                    end
                  );
                  current = moment(current, "hh:mm:ss A").add(
                    breakTime,
                    "minutes"
                  );
                  item.finish_plan = item.job_number
                    ? current.format("HH : mm")
                    : "-";

                  return item;
                });

                data.gsph_actual =
                  total_qty_gsph && total_tpt
                    ? (total_qty_gsph / (total_tpt - idletime)) * 60
                    : null;
                data.cycle_time_actual =
                  total_qty_gsph && total_tpt
                    ? ((total_tpt - idletime) / total_qty_gsph) * 60
                    : null;
                data.downtime_actual = downtime;
                data.idletime_actual = idletime;
                data.total_part_plan = qty_plan;
                data.total_part_actual = qty_actual;
                data.repair_actual =
                  qty_actual && repair ? (repair / qty_actual) * 100 : null;
                data.reject_actual =
                  qty_actual && reject ? (reject / qty_actual) * 100 : null;
                data.good_actual =
                  100 - data.repair_actual - data.reject_actual;
                data.total_stroke = stroke;
                data.total_lot_rh = lotsize;
                data.total_lot_lh = lotsize;
                data.tpt_total = tpt;
                data.total_stroke_actual = total_stroke_actual;
                data.total_act_rh = lotsize_actual;
                data.total_act_lh = lotsize_actual;
                data.total_dandori = dandori;
                data.total_dt_machines = dt_machines;
                data.total_dt_dies = dt_dies;
                data.total_dt_other = dt_other;
                data.total_dt_material = dt_material;
                data.total_tpt_actual = tpt_actual;
                data.total_gsph = gsph_total;
                data.reject = total_reject;
                data.repair = total_repair;
                data.qty_ok =
                  parseInt(lotsize_actual) + parseInt(lotsize_actual);
                data.ok_persen =
                  (parseInt(data.qty_ok) /
                    (parseInt(lotsize_actual) + parseInt(lotsize_actual))) *
                  100;

                data.repair_persen =
                  (parseInt(total_repair) /
                    (parseInt(lotsize_actual) + parseInt(lotsize_actual))) *
                  100;

                data.reject_persen =
                  (parseInt(total_reject) /
                    (parseInt(lotsize_actual) + parseInt(lotsize_actual))) *
                  100;
                data.total_gsph = (total_stroke_actual / (4 * tpt_actual)) * 60;
                data.expand = false;
                return data;
              });
            } else {
              utilityStore.onApiResponse(response);
              this.lines = response.data.data;
            }
            configStore.page.name = `Achievement Welding (${utilityStore.formatDate(
              this.params.date
            )} / Shift ${this.params.shift} / Patan ${this.patan})`;
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

    exportDataLine() {
      axios.get(`http://${configStore.apiUrl}/majsf_rest_api/api/welding-achievement/download_template_excel`, {
        params: {
          date: this.params.date
        },
        responseType: 'blob'
      }).then(response => {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `template_patan_${this.params.date}.xlsx`);
        document.body.appendChild(link);
        link.click();
      });
    },   

    closeRefreshForm(userNow) {
      const fd = new URLSearchParams();
      fd.append("line_id", this.line_id);
      fd.append("date", this.params.date);
      fd.append("shift", this.params.shift);
      fd.append("patan", this.patan);
      fd.append("user_open", userNow);

      const configHttp = {
        method: "put",
        url: `http://${configStore.apiUrl}/majsf_rest_api/api/welding-achievement/close_refresh`,
        headers: {
          "Content-Type": "multipart/form-data",
        },
        data: fd,
      };
      axios(configHttp);
      this.resetForm();
    },

    checkForm(userNow) {
      const id = this.line_id;
      const date = this.params.date;
      const shift = this.params.shift;
      const user = userNow;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/welding-achievement/check?line_id=${id}&date=${date}&shift=${shift}`
        )
        .then((response) => {
          this.statusForm = response.data;
          if (this.statusForm.user !== user && response.data.status == false) {
            utilityStore.onApiResponse(response);
            notificationStore.disableLoading();
          }
        })
        .catch(utilityStore.onError);
    },

    openForm() {
      const fd = new URLSearchParams();
      fd.append("line_id", this.line_id);
      fd.append("date", this.params.date);
      fd.append("shift", this.params.shift);
      fd.append("patan", this.patan);

      const configHttp = {
        method: "put",
        url: `http://${configStore.apiUrl}/majsf_rest_api/api/welding-achievement/open`,
        headers: {
          "Content-Type": "multipart/form-data",
        },
        data: fd,
      };
      axios(configHttp);
    },

    closeForm() {
      const fd = new URLSearchParams();
      fd.append("line_id", this.line_id);
      fd.append("date", this.params.date);
      fd.append("shift", this.params.shift);
      fd.append("patan", this.patan);

      const configHttp = {
        method: "put",
        url: `http://${configStore.apiUrl}/majsf_rest_api/api/welding-achievement/close`,
        headers: {
          "Content-Type": "multipart/form-data",
        },
        data: fd,
      };
      axios(configHttp);
    },

    onSaveDetail(vm) {
      notificationStore.loading = true;
      const data = new FormData();
      for (let index in this.formDetail) {
        for (let idx = 0; idx <= this.formDetail[index].length; idx++) {
          data.append(
            `${index}[]`,
            this.formDetail[index][idx] ? this.formDetail[index][idx] : ""
          );
        }
      }
      for (let index in this.formAttendance) {
        for (let idx = 0; idx < this.formAttendance[index].length; idx++) {
          data.append(
            `${index}[]`,
            this.formAttendance[index][idx]
              ? this.formAttendance[index][idx]
              : ""
          );
        }
      }
      data.append("line_id", this.line_id);
      data.append("date", this.params.date);
      data.append("shift", this.params.shift);
      data.append("patan", this.patan);
      data.append("is_done", this.is_done);
      if (this.hadir !== "") {
        data.append("hadir", this.formDetail.hadir);
      }
      if (this.izin !== "") {
        data.append("izin", this.formDetail.izin);
      }
      if (this.sakit !== "") {
        data.append("sakit", this.formDetail.sakit);
      }
      if (this.ganti_hari !== "") {
        data.append("ganti_hari", this.formDetail.ganti_hari);
      }

      const configHttp = {
        method: "post",
        url: `http://${configStore.apiUrl}/majsf_rest_api/api/welding-achievement/achievement`,
        headers: {
          "Content-Type": "multipart/form-data",
        },
        data,
      };
      axios(configHttp)
        .then((response) => {
          notificationStore.onApiResponseToastAlert(response, this.resetForm);
          if (response.data.additional_info) {
            notificationStore.onApiResponseToastAlertAdditional(
              response,
              this.resetForm
            );
          }
          vm.$socket.emit("updateAcievementWelding", this.line_id);
        })
        .catch(utilityStore.onError);
    },

    loadKeteranganRepair() {
      this.dialog.formKetRepair = true;
    },
    loadKeteranganDT() {
      this.dialog.formKetDT = true;
    },

    startItem(vm, part_number, urut_plan) {
      const fd = new URLSearchParams();
      fd.append("part_number", part_number);
      fd.append("urut_plan", urut_plan);
      fd.append("line_id", this.line_id);
      fd.append("date", this.params.date);
      fd.append("shift", this.params.shift);

      const configHttp = {
        method: "put",
        url: `http://${configStore.apiUrl}/majsf_rest_api/api/welding-achievement/start_running`,
        headers: {
          "Content-Type": "multipart/form-data",
        },
        data: fd,
      };
      axios(configHttp)
        .then((response) => {
          notificationStore.onApiResponseToastAlert(response);
          vm.$socket.emit("updateAcievementWelding", this.line_id);
          // this.refreshForm(this.line_id);
        })
        .catch(utilityStore.onError);
    },

    stopItem(vm, part_number, urut_plan) {
      const fd = new URLSearchParams();
      fd.append("part_number", part_number);
      fd.append("urut_plan", urut_plan);
      fd.append("line_id", this.line_id);
      fd.append("date", this.params.date);
      fd.append("shift", this.params.shift);

      const configHttp = {
        method: "put",
        url: `http://${configStore.apiUrl}/majsf_rest_api/api/welding-achievement/stop_running`,
        headers: {
          "Content-Type": "multipart/form-data",
        },
        data: fd,
      };
      axios(configHttp)
        .then((response) => {
          notificationStore.onApiResponseToastAlert(response);
          vm.$socket.emit("updateAcievementWelding", this.line_id);
          this.refreshForm(this.line_id);
        })
        .catch(utilityStore.onError);
    },

    startProcess(vm, part_number, urut_plan) {
      const fd = new URLSearchParams();
      fd.append("part_number", part_number);
      fd.append("urut_plan", urut_plan);
      fd.append("line_id", this.line_id);
      fd.append("date", this.params.date);
      fd.append("shift", this.params.shift);

      const configHttp = {
        method: "put",
        url: `http://${configStore.apiUrl}/majsf_rest_api/api/welding-achievement/start_process`,
        headers: {
          "Content-Type": "multipart/form-data",
        },
        data: fd,
      };
      axios(configHttp)
        .then((response) => {
          notificationStore.onApiResponseToastAlert(response);
          vm.$socket.emit("updateAcievementWelding", this.line_id);
          this.refreshForm(this.line_id);
        })
        .catch(utilityStore.onError);
    },

    stopProcess(vm, part_number, urut_plan) {
      const fd = new URLSearchParams();
      fd.append("part_number", part_number);
      fd.append("urut_plan", urut_plan);
      fd.append("line_id", this.line_id);
      fd.append("date", this.params.date);
      fd.append("shift", this.params.shift);

      const configHttp = {
        method: "put",
        url: `http://${configStore.apiUrl}/majsf_rest_api/api/welding-achievement/stop_process`,
        headers: {
          "Content-Type": "multipart/form-data",
        },
        data: fd,
      };
      axios(configHttp)
        .then((response) => {
          notificationStore.onApiResponseToastAlert(response);
          vm.$socket.emit("updateAcievementWelding", this.line_id);
          this.refreshForm(this.line_id);
        })
        .catch(utilityStore.onError);
    },

    deleteData() {
      this.dialog.confirmDelete = true;
    },
    onMove(to, data) {
      const fd = new URLSearchParams();
      const id = this.line_id;
      fd.append("line_id", this.line_id);
      fd.append("date", this.params.date);
      fd.append("shift", this.params.shift);
      // fd.append("patan", this.patan);
      fd.append("urut", data);
      fd.append("move", to);

      const configHttp = {
        method: "put",
        url: `http://${configStore.apiUrl}/majsf_rest_api/api/welding-achievement/move`,
        headers: {
          "Content-Type": "multipart/form-data",
        },
        data: fd,
      };
      axios(configHttp)
        .then((response) =>
          notificationStore.onApiResponseToastAlert(
            response,
            this.fetchDataLineRefresh(id, this.params.date)
          )
        )
        .catch(configStore.onError);
    },

    fetchDataLineRefresh(id, date) {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/welding-achievement/display_refresh?line=${id}&date=${date}`,
          { params: this.params }
        )
        .then((response) => {
          if (response.status === 200) {
            if (response.data.status) {
              this.loadDataDetailEdit(response.data.data);
            } else {
              utilityStore.onApiResponse(response);
            }
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        });
    },

    onDelete(data) {
      const fd = new URLSearchParams();
      const id = this.line_id;
      fd.append("line_id", this.line_id);
      fd.append("date", this.params.date);
      fd.append("shift", this.params.shift);
      fd.append("patan", this.patan);
      fd.append("urut", data);

      const configHttp = {
        method: "delete",
        url: `http://${configStore.apiUrl}/majsf_rest_api/api/welding-achievement/data`,
        headers: {
          "Content-Type": "multipart/form-data",
        },
        data: fd,
      };
      axios(configHttp)
        .then((response) =>
          notificationStore.onApiResponseToastAlert(
            response,
            this.fetchDataLineRefresh(id, this.params.date)
          )
        )
        .catch(configStore.onError);
    },

    addRow() {
      Object.entries(this.formDetail).map((k) => {
        if (k[0] == "is_tandem" || k[0] == "is_trial") {
          this.formDetail[k[0]].push(false);
        } else {
          this.formDetail[k[0]].push("");
        }
      });
      notificationStore.disableLoading();
    },

    // fetchDataLineSummary(id) {
    //   notificationStore.loading = true;
    //   this.params.line = id;
    //   axios
    //     .get(
    //       `http://${configStore.apiUrl}/majsf_rest_api/api/welding-achievement/achievement_summary`,
    //       { params: this.params }
    //     )
    //     .then((response) => {
    //       if (response.status === 200) {
    //         if (response.data.status) {
    //           this.lines = response.data.data.map((data) => {
    //             let patan = "";
    //             let downtime = 0;
    //             let idletime = 0;
    //             let repair = 0;
    //             let reject = 0;
    //             let qty_actual = 0;
    //             let qty_plan = 0;
    //             let stroke = 0;
    //             let stroke_current = 0;
    //             let stroke_act = 0;
    //             let tpt = 0;
    //             let tpt_current = 0;
    //             let tpt_actual = 0;
    //             let stroke_actual = 0;
    //             let lotsize = 0;
    //             let lotsize_current = 0;
    //             let lotsize_actual = 0;
    //             let dandori = 0;
    //             let dandori_plan = 0;
    //             let dt_machines = 0;
    //             let dt_jig = 0;
    //             let dt_other = 0;
    //             let dt_wip = 0;
    //             let total_repair = 0;
    //             let total_reject = 0;
    //             let total_stroke_actual = 0;
    //             let part_number = 0;
    //             let current_stroke = 0;
    //             let current_gsph_avg = 0;
    //             // let actual_gsph = 0;
    //             let uph_act = 0;
    //             let current_job = "";
    //             let actual_job = 0;
    //             let coba = "";
    //             let act_s = "";
    //             let indexjobact = 0;
    //             let indexJobPlan = 1;
    //             let indexJobCurrent = 0;
    //             let actual_stroke = 0;
    //             let uph_plan_avg = 0;
    //             let uph_current_avg = 0;
    //             let current_lot = 0;
    //             let cur_lot = 0;
    //             let curr_dandori = 0;
    //             let dandori_now = 0;
    //             // let gsph = 0                let uph_plan = 0;
    //             let uph_current = 0;
    //             let indexCurrent = 0;
    //             let curr_index = 0;
    //             let uph_total_plan = 0;
    //             let uph = 0;
    //             let uph_plan = 0;
    //             let total_stroke_act = 0;
    //             const time = this.params.shift == "1" ? "07:15" : "20:00";
    //             let current_actual = moment(
    //               `${this.params.date} ${time}`,
    //               "YYYY-MM-DD HH:mm"
    //             );
    //             let current_machine = moment(
    //               `${this.params.date} ${time}`,
    //               "YYYY-MM-DD HH:mm"
    //             );
    //             let current = moment(
    //               `${this.params.date} ${time}`,
    //               "YYYY-MM-DD HH:mm"
    //             );

    //             data.detail = data.detail.map((item) => {
    //               if (item.part_number) {
    //                 downtime += parseFloat(item.downtime ? item.downtime : 0);
    //                 repair += parseFloat(item.repair ? item.repair : 0);
    //                 reject += parseFloat(item.reject ? item.reject : 0);
    //                 if (item.is_tandem == "0") {
    //                   // if (item.is_trial == "0") {
    //                   //   idletime += parseFloat(
    //                   //     item.idletime ? item.idletime : ""
    //                   //   );
    //                   // }
    //                   const startActual =
    //                     current_actual.format("YYYY-MM-DD HH:mm");
    //                   current_actual = moment(current_actual, "hh:mm:ss A").add(
    //                     item.tpt_actual ? item.tpt_actual : 0,
    //                     "minutes"
    //                   );
    //                   const endActual =
    //                     current_actual.format("YYYY-MM-DD HH:mm");
    //                   const breakTimeActual = utilityStore.mappingBreak(
    //                     this.params,
    //                     startActual,
    //                     endActual
    //                   );

    //                   current_actual = moment(current_actual, "hh:mm:ss").add(
    //                     breakTimeActual,
    //                     "minutes"
    //                   );

    //                   item.finish_actual = item.tpt_actual
    //                     ? current_actual.format("HH : mm")
    //                     : "";
    //                 }
    //               }
    //               stroke += parseInt(
    //                 item.stroke_plan && item.keterangan !== "Cancel Plan"
    //                   ? item.stroke_plan
    //                   : 0
    //               );
    //               stroke_current += parseInt(
    //                 (item.lotsize_actual > 0 && item.keterangan !== "Cancel Plan") ||
    //                   item.repair > 0 ||
    //                   item.reject > 0
    //                   ? item.stroke_plan
    //                   : 0
    //               );
    //               stroke_act += parseInt(item.stroke_act ? item.stroke_act : 0);
    //               tpt += parseFloat(
    //                 item.tpt && item.is_tandem == false ? item.tpt : 0
    //               );
    //               tpt_current += parseFloat(
    //                 (item.lotsize_actual > 0 ||
    //                   item.repair > 0 ||
    //                   item.reject > 0) && item.is_tandem  == '0'
    //                   ? item.tpt
    //                   : 0
    //               );
    //               tpt_actual += parseFloat(
    //                 (item.act_rh > 0 ||
    //                   item.repair_rh > 0 ||
    //                   item.reject_rh > 0) &&
    //                     item.is_tandem  == '0'
    //                   ? item.tpt_actual
    //                   : 0
    //               );
    //               idletime += parseInt(item.idletime ? item.idletime : 0);
    //               stroke_actual = item.act_rh
    //                 ? parseInt(item.act_rh) * parseInt(item.act_process)
    //                 : 0;
    //               total_stroke_actual = parseFloat(
    //                 item.act_rh || item.repair_rh || item.reject_rh
    //                   ? (parseInt(item.act_rh) +
    //                       parseInt(item.repair_rh) +
    //                       parseInt(item.reject_rh)) *
    //                       parseInt(item.act_process)
    //                   : 0
    //               );
    //               item.stroke_actual = stroke_actual;
    //               lot_rh += parseFloat(
    //                 item.lot_rh && item.keterangan !== "Cancel Plan"
    //                   ? item.lot_rh
    //                   : 0
    //               );
    //               lot_lh += parseFloat(
    //                 item.lot_lh && item.keterangan !== "Cancel Plan"
    //                   ? item.lot_lh
    //                   : 0
    //               );
    //               lot_curr_rh += parseFloat(
    //                 item.act_rh > 0 ||
    //                   item.repair_rh > 0 ||
    //                   (item.reject_rh > 0 && item.keterangan !== "Cancel Plan")
    //                   ? item.lot_rh
    //                   : 0
    //               );
    //               lot_curr_lh += parseFloat(
    //                 item.act_lh > 0 ||
    //                   item.repair_lh > 0 ||
    //                   (item.reject_lh > 0 && item.keterangan !== "Cancel Plan")
    //                   ? item.lot_lh
    //                   : 0
    //               );
    //               act_rh += parseFloat(item.act_rh ? item.act_rh : 0);
    //               act_lh += parseFloat(item.act_lh ? item.act_lh : 0);
    //               dandori += parseFloat(
    //                 item.dandori && item.is_tandem !== "1" ? item.dandori : 0
    //               );
    //               dandori_plan += parseFloat(
    //                 item.lot_rh && item.keterangan !== "Cancel Plan"
    //                   ? item.dandori_plan
    //                   : 0
    //               );
    //               dt_machines += parseFloat(
    //                 item.dt_machines ? item.dt_machines : 0
    //               );
    //               dt_dies += parseFloat(item.dt_dies ? item.dt_dies : 0);
    //               dt_other += parseFloat(item.dt_other ? item.dt_other : 0);
    //               dt_material += parseFloat(
    //                 item.dt_material ? item.dt_material : 0
    //               );
    //               // gsph += parseFloat(
    //               //   item.act_rh &&
    //               //     item.is_running !== "1" && item.tpt_actual
    //               //     ? (item.stroke_act /
    //               //         (item.act_process *
    //               //           (item.tpt_actual - item.idletime))) *
    //               //         60
    //               //     : 0
    //               // );

    //               gsph_plan += parseFloat(
    //                 item.act_rh > 0 ||
    //                   item.repair_rh > 0 ||
    //                   (item.reject_rh > 0 && item.gsph_plan)
    //                   ? item.gsph_plan
    //                   : 0
    //               );
    //               gsph_current +=
    //                 item.act_rh &&
    //                 item.is_tandem !== "1" &&
    //                 item.is_running !== "1"
    //                   ? parseFloat(item.gsph_plan ? item.gsph_plan : 0)
    //                   : 0;

    //               total_repair += parseFloat(
    //                 item.repair_rh
    //                   ? parseInt(item.repair_rh) + parseInt(item.repair_lh)
    //                   : 0
    //               );

    //               total_reject += parseFloat(
    //                 item.reject_rh
    //                   ? parseInt(item.reject_rh) + parseInt(item.reject_lh)
    //                   : 0
    //               );

    //               total_pembagi_repair += parseFloat(
    //                 item.status == "FP"
    //                   ? parseInt(item.act_rh) +
    //                       parseInt(item.act_lh) +
    //                       parseInt(item.repair_rh) +
    //                       parseInt(item.repair_lh)
    //                   : 0
    //               );

    //               item.total_gsph =
    //                 (item.stroke_actual /
    //                   (item.value_combination * item.tpt_actual)) *
    //                 60;
    //               const startMachine =
    //                 current_machine.format("YYYY-MM-DD HH:mm");
    //               current_machine = moment(current_machine, "hh:mm:ss A").add(
    //                 item.tpt_machine ? item.tpt_machine : 0,
    //                 "minutes"
    //               );
    //               const endMachine = current_machine.format("YYYY-MM-DD HH:mm");
    //               const breakTimeMachine = utilityStore.mappingBreak(
    //                 this.params,
    //                 startMachine,
    //                 endMachine
    //               );
    //               current_machine = moment(current_machine, "hh:mm:ss A").add(
    //                 breakTimeMachine,
    //                 "minutes"
    //               );
    //               item.finish_machine = item.tpt_machine
    //                 ? current_machine.format("HH : mm")
    //                 : "-";
    //               qty_plan += parseFloat(item.lotsize ? item.lotsize : 0);
    //               const start = current.format("YYYY-MM-DD HH:mm");
    //               current = moment(current, "hh:mm:ss A").add(
    //                 item.tpt ? item.tpt : 0,
    //                 "minutes"
    //               );
    //               const end = current.format("YYYY-MM-DD HH:mm");
    //               const breakTime = utilityStore.mappingBreak(
    //                 this.params,
    //                 start,
    //                 end
    //               );
    //               current = moment(current, "hh:mm:ss A").add(
    //                 breakTime,
    //                 "minutes"
    //               );
    //               // Mencari Current Stroke
    //               current_stroke =
    //               (item.act_rh > 0 && item.keterangan !== "Cancel Plan") ||
    //               item.repair_rh > 0 ||
    //               item.reject_rh > 0
    //                   ? stroke_current
    //                   : "-";
    //               if (current_stroke !== "-") {
    //                 coba = current_stroke;
    //               }
    //               actual_stroke =
    //                 (item.act_rh > 0 && item.keterangan !== "Cancel Plan") ||
    //                 item.repair_rh > 0 ||
    //                 item.reject_rh > 0
    //                   ? stroke_act
    //                   : "-";
    //               if (actual_stroke !== "-") {
    //                 act_s = stroke_act;
    //               }
    //               curr_index =
    //                 item.act_rh > 0 ||
    //                 item.repair_rh ||
    //                 (item.reject_rh > 0 && item.is_tandem !== "1")
    //                   ? indexCurrent++
    //                   : "-";
    //               if (curr_index !== "-") {
    //                 curr_index = indexCurrent;
    //               }

    //               gsph_plan_avg = gsph_plan;

    //               //Mencari Current GSPH
    //               current_gsph_avg =
    //                 item.act_rh > 0 ||
    //                 item.repair_rh > 0 ||
    //                 (item.reject_rh > 0 && item.keterangan !== "Cancel Plan")
    //                   ? gsph_current
    //                   : "-";
    //               if (current_gsph_avg !== "-") {
    //                 gsph_current_avg = current_gsph_avg;
    //               }

    //               //Mencari Total Current job
    //               current_job =
    //                 item.act_rh > 0 ||
    //                 item.repair_rh > 0 ||
    //                 (item.reject_rh > 0 && item.keterangan !== "Cancel Plan")
    //                   ? indexJobCurrent++
    //                   : "-";
    //               if (current_job !== "-") {
    //                 current_job = indexJobCurrent;
    //               }

    //               //Mencari Total actual job
    //               actual_job =
    //                 item.act_rh > 0 || item.repair_rh > 0 || item.reject_rh > 0
    //                   ? item.part_rh
    //                   : "-";
    //               if (actual_job !== "-") {
    //                 indexjobact++;
    //               }

    //               // Total Plan job number
    //               part_rh =
    //                 item.part_rh && item.keterangan !== "Cancel Plan"
    //                   ? indexJobPlan++
    //                   : indexJobPlan - 1;

    //               gsph_total_plan_1 = (stroke / tpt / 1) * 60;
    //               gsph_total_plan_4 = (stroke / tpt / 4) * 60;
    //               gsph_total_plan_2 = (stroke / tpt / 2) * 60;
    //               gsph_total_plan_17 = (stroke / tpt / 17) * 60;
    //               // Gsph actual dibagi dengan jumlah item dari awal hingga sekarang
    //               gsph_1 = (stroke_current / tpt_current / 1) * 60;
    //               gsph_1 = item.tpt_actual > 0 ? gsph_1 : "-";
    //               if (gsph_1 !== "-") {
    //                 gsph_plan_1 =
    //                   isFinite(gsph_1) == false ? gsph_plan : gsph_1;
    //               }
    //               gsph_4 = (stroke_current / tpt_current / 4) * 60;
    //               gsph_4 = item.tpt_actual > 0 ? gsph_4 : "-";
    //               if (gsph_4 !== "-") {
    //                 gsph_plan_4 =
    //                 isFinite(gsph_4) == false && ( item.act_rh > 0 || item.repair_rh > 0 || item.reject_rh > 0)  && item.is_tandem  == '0' ? gsph_plan : gsph_4;
    //               }

    //               gsph_2 = (stroke_current / tpt_current / 2) * 60;
    //               gsph_2 = item.tpt_actual > 0 ? gsph_2 : "-";
    //               if (gsph_2 !== "-") {
    //                 gsph_plan_2 =
    //                 isFinite(gsph_2) == false && ( item.act_rh > 0 || item.repair_rh > 0 || item.reject_rh > 0)  && item.is_tandem  == '0' ? gsph_plan : gsph_2;
    //               }
    //               gsph_17 = (stroke_current / tpt_current / 17) * 60;
    //               gsph_17 = item.tpt_actual > 0 ? gsph_17 : "-";
    //               if (gsph_17 !== "-") {
    //                 gsph_plan_17 =
    //                   isFinite(gsph_17) == false && ( item.act_rh > 0 || item.repair_rh > 0 || item.reject_rh > 0)  && item.is_tandem  == '0' ? gsph_plan : gsph_17;
    //               }

    //               gsph_3 = (stroke_current / tpt_current / 3) * 60;
    //               gsph_3 = item.tpt_actual > 0 ? gsph_3 : "-";
    //               if (gsph_3 !== "-") {
    //                 gsph_plan_3 =
    //                   isFinite(gsph_3) == false ? gsph_plan : gsph_3;
    //               }

    //               gsph_1 = tpt_actual > 0 ? (stroke_act / (tpt_actual - idletime) / 1) * 60 : 0;
    //               gsph_1 = item.act_rh > 0 || item.repair_rh > 0 || item.reject_rh > 0 && item.tpt_actual > 0 ? gsph_1 : "-";
    //               if (gsph_1 !== "-") {
    //                 gsph_act_1 = gsph_1;
    //               }

    //               gsph_4 = tpt_actual > 0 ? (stroke_act / (tpt_actual - idletime) / 4) * 60 : 0;
    //               gsph_4 = item.act_rh > 0 || item.repair_rh > 0 || item.reject_rh > 0 && item.tpt_actual > 0 ? gsph_4 : "-";
    //               if (gsph_4 !== "-") {
    //                 gsph_act_4 = gsph_4;
    //               }

    //               gsph_2 = tpt_actual > 0 ? (stroke_act / (tpt_actual - idletime) / 2) * 60 : 0;
    //               gsph_2 = item.act_rh > 0 || item.repair_rh > 0 || item.reject_rh > 0 && item.tpt_actual > 0 ? gsph_2 : "-";
    //               if (gsph_2 !== "-") {
    //                 gsph_act_2 = gsph_2;
    //               }

    //               gsph_3 = tpt_actual > 0 ? (stroke_act / (tpt_actual - idletime) / 3) * 60 : 0;
    //               gsph_3 = item.act_rh > 0 || item.repair_rh > 0 || item.reject_rh > 0 && item.tpt_actual > 0 ? gsph_3 : "-";
    //               if (gsph_3 !== "-") {
    //                 gsph_act_3 = gsph_3;
    //               }

    //               gsph_17 = tpt_actual > 0 ? (stroke_act / (tpt_actual - idletime) / 17) * 60 : 0;
    //               gsph_17 =
    //                 item.act_rh > 0 || item.repair_rh > 0 || item.reject_rh > 0 && item.tpt_actual > 0 ? gsph_17 : "-";
    //               if (gsph_17 !== "-") {
    //                 gsph_act_17 = gsph_17;
    //               }

    //               total_stroke_actual =
    //                 item.act_rh > 0 || item.repair_rh > 0 || item.reject_rh > 0
    //                   ? total_stroke_actual
    //                   : "-";
    //               if (total_stroke_actual !== "-") {
    //                 total_stroke_act = total_stroke_actual;
    //               }

    //               current_rh =
    //                 item.act_rh > 0 || item.repair_rh > 0 || item.reject_rh > 0
    //                   ? lot_curr_rh
    //                   : "-";
    //               if (current_rh !== "-") {
    //                 cur_rh = current_rh;
    //               }

    //               current_lh =
    //                 item.act_lh > 0 || item.repair_lh > 0 || item.reject_lh > 0
    //                   ? lot_curr_lh
    //                   : "-";
    //               if (current_lh !== "-") {
    //                 cur_lh = current_lh;
    //               }

    //               current_lh = item.act_lh > 0 ? lot_curr_lh : "-";
    //               if (current_lh !== "-") {
    //                 cur_lh = current_lh;
    //               }

    //               curr_dandori =
    //                 item.act_rh > 0 || item.repair_rh > 0 || item.reject_rh > 0
    //                   ? dandori_plan
    //                   : "-";
    //               if (curr_dandori !== "-") {
    //                 dandori_now = curr_dandori;
    //               }
    //               patan = item.patan;
    //               return item;
    //             });
    //             data.patan = patan;
    //             data.job_current = indexJobCurrent;
    //             data.gsph_current_avg = gsph_current_avg;
    //             data.gsph_plan_avg = gsph_plan_avg;
    //             data.gsph_all_1 = gsph_total_plan_1;
    //             data.gsph_all_4 = gsph_total_plan_4;
    //             data.gsph_all_2 = gsph_total_plan_2;
    //             data.gsph_all_17 = gsph_total_plan_17;
    //             data.gsph_current_1 = gsph_plan_1;
    //             data.gsph_current_4 =  gsph_plan_4 == Number.POSITIVE_INFINITY ? 0 : gsph_plan_4;
    //             data.gsph_current_2 = gsph_plan_2 == Number.POSITIVE_INFINITY ? 0 : gsph_plan_2;
    //             data.gsph_current_3 = gsph_plan_3;
    //             data.gsph_current_17 =
    //               gsph_plan_17 == Number.POSITIVE_INFINITY ? 0 : gsph_plan_17;
    //             data.gsph_actual_1 = gsph_act_1;
    //             data.gsph_actual_4 = gsph_act_4 == Number.POSITIVE_INFINITY ? 0 : gsph_act_4;
    //             data.gsph_actual_2 = gsph_act_2 == Number.POSITIVE_INFINITY ? 0 : gsph_act_2;
    //             data.gsph_actual_3 = gsph_act_3;
    //             data.gsph_actual_17 = gsph_act_17 == Number.POSITIVE_INFINITY ? 0 : gsph_act_17;
    //             data.ttl_stroke_plan = stroke;
    //             data.stroke_current = coba;
    //             data.stroke_actual = act_s;
    //             data.downtime_actual = downtime;
    //             data.idletime_actual = idletime;
    //             data.total_part_plan = qty_plan;
    //             data.total_part_actual = qty_actual;
    //             data.repair_actual =
    //               qty_actual && repair ? (repair / qty_actual) * 100 : 0;
    //             data.reject_actual =
    //               qty_actual && reject ? (reject / qty_actual) * 100 : 0;
    //             data.good_actual =
    //               100 - data.repair_actual - data.reject_actual;
    //             data.total_stroke = stroke;
    //             data.total_stroke_actual = total_stroke_act;
    //             data.total_act_rh = act_rh;
    //             data.total_act_lh = act_lh;
    //             data.total_dandori = dandori;
    //             data.total_dandori_plan = dandori_plan;
    //             data.total_dt_machines = dt_machines;
    //             data.total_dt_dies = dt_dies;
    //             data.total_dt_other = dt_other;
    //             data.total_dt_material = dt_material;
    //             data.total_dt = dt_other + dt_dies + dt_machines + dt_material;
    //             data.ok_persen =
    //               (parseInt(data.qty_ok) /
    //                 (parseInt(act_rh) + parseInt(act_lh))) *
    //               100;

    //             data.repair_persen =
    //               (parseInt(total_repair) /
    //                 (parseInt(act_rh) +
    //                   parseInt(act_lh) +
    //                   parseInt(total_pembagi_repair))) *
    //               100;
    //             data.total_pembagi_reject =
    //               act_rh || total_repair || total_reject
    //                 ? act_rh + act_lh + total_repair + total_reject
    //                 : 0;
    //             data.reject_persen =
    //               (parseInt(total_reject) /
    //                 parseInt(data.total_pembagi_reject)) *
    //               100;
    //             data.gsph_plan = (stroke / (tpt - 0) / 4) * 60;
    //             data.job_plan = part_rh;
    //             data.job_actual = indexjobact;

    //             data.lot_size = lot_rh + lot_lh;
    //             data.lot_current = cur_rh + cur_lh;
    //             data.act_pcs = act_rh + act_lh + total_repair + total_reject;
    //             data.current_dandori = dandori_now;

    //             data.expand = false;
    //             return data;
    //           });
    //         } else {
    //           utilityStore.onApiResponse(response);
    //         }

    //         configStore.page.name = `Achievement Stamping (${utilityStore.formatDate(
    //           this.params.date
    //         )} / Shift ${this.params.shift} / Patan ${this.patan})`;
    //         notificationStore.disableLoading();
    //       } else {
    //         utilityStore.onApiResponse(response);
    //       }
    //     })
    //     .catch(utilityStore.onError);
    //   setTimeout(() => {
    //     this.dialog.datePicker = false;
    //   }, 500);
    // },

    fetchDataReportSummary() {
      notificationStore.loading = true;
      const data = new FormData();
      data.append("start", this.reportSummary.filter.dates[0]);
      data.append(
        "end",
        this.reportSummary.filter.dates[1] ?? this.reportSummary.filter.dates[0]
      );
      axios
        .post(
          `http://${configStore.apiUrl}/majsf_rest_api/api/welding-achievement/summary`,
          data
        )
        .then((response) => {
          if (response.status === 200) {
            this.reportSummary.datatables.items = response.data;
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

    importTemplateExcel() {
      notificationStore.loading = true;
      const formData = new FormData();
      formData.append('file', this.params.file);
      // formData.append('date', this.params.date);
      // formData.append('shift', this.params.shift);

      axios
        .post(`http://${configStore.apiUrl}/majsf_rest_api/api/welding-achievement/import_template_excel`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })
        .then((response) => {
          utilityStore.onApiResponse(response);
        })
        .catch((error) => {
          this.$toast.error('Gagal mengupload file.');
          console.error(error);
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
    fetchDataWeekly() {
      notificationStore.loading = status;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/data_weekly`
        )
        .then((response) => {
          if (response.status === 200) {
            if (response.data) {
              this.graph = response.data;
            } else {
              utilityStore.onApiResponse(response);
            }
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        });
    },
    refreshForm(line) {
      this.fetchDataLineByID(line);
    },

    fetchDataLineforSAP() {
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/welding-achievement/achievement_sap`,
          { params: this.params }
        )
        .then((response) => {
          if (response.status === 200) {
            if (response.data.status) {
              this.lines = response.data.data.map((data) => {
                let total_qty_gsph = 0;
                let total_tpt = 0;
                let downtime = 0;
                let idletime = 0;
                let repair = 0;
                let reject = 0;
                let qty_actual = 0;
                let qty_plan = 0;
                let stroke = 0;
                let lot_rh = 0;
                let lot_lh = 0;
                let tpt = 0;
                let stroke_actual = 0;
                let act_rh = 0;
                let act_lh = 0;
                let dandori = 0;
                let dt_machines = 0;
                let dt_dies = 0;
                let dt_other = 0;
                let tpt_actual = 0;
                let gsph_total = 0;
                let total_repair = 0;
                let total_reject = 0;
                let total_stroke_actual = 0;
                const time = this.params.shift == "1" ? "07:15" : "20:00";
                let current_actual = moment(
                  `${this.params.date} ${time}`,
                  "YYYY-MM-DD HH:mm"
                );
                let current_machine = moment(
                  `${this.params.date} ${time}`,
                  "YYYY-MM-DD HH:mm"
                );
                let current = moment(
                  `${this.params.date} ${time}`,
                  "YYYY-MM-DD HH:mm"
                );
                this.patan = data.patan;
                data.detail = data.detail.map((item) => {
                  if (item.part_rh) {
                    downtime += parseFloat(item.downtime ? item.downtime : 0);
                    repair += parseFloat(item.repair ? item.repair : 0);
                    reject += parseFloat(item.reject ? item.reject : 0);
                    qty_actual += parseFloat(
                      item.qty_actual ? item.qty_actual : 0
                    );
                    if (item.is_tandem == "0") {
                      if (item.is_trial == "0") {
                        idletime += parseFloat(
                          item.idletime ? item.idletime : ""
                        );
                        total_qty_gsph += parseFloat(
                          item.qty_actual ? item.qty_actual : 0
                        );
                        total_tpt += parseFloat(
                          item.tpt_actual ? item.tpt_actual : 0
                        );
                      }
                      const startActual =
                        current_actual.format("YYYY-MM-DD HH:mm");
                      current_actual = moment(current_actual, "hh:mm:ss A").add(
                        item.tpt_actual ? item.tpt_actual : 0,
                        "minutes"
                      );
                      const endActual =
                        current_actual.format("YYYY-MM-DD HH:mm");
                      const breakTimeActual = utilityStore.mappingBreak(
                        this.params,
                        startActual,
                        endActual
                      );

                      current_actual = moment(current_actual, "hh:mm:ss").add(
                        breakTimeActual,
                        "minutes"
                      );

                      item.finish_actual = item.tpt_actual
                        ? current_actual.format("HH : mm")
                        : "-";
                    }
                  }
                  stroke += parseFloat(item.stroke_plan ? item.stroke_plan : 0);
                  lot_rh += parseFloat(item.lot_rh ? item.lot_rh : 0);
                  lot_lh += parseFloat(item.lot_lh ? item.lot_lh : 0);
                  tpt += parseFloat(item.tpt ? item.tpt : 0);
                  stroke_actual = item.act_rh
                    ? parseInt(item.act_rh) * parseInt(item.act_process)
                    : 0;
                  total_stroke_actual += parseFloat(
                    item.act_rh
                      ? parseInt(item.act_rh) * parseInt(item.act_process)
                      : 0
                  );

                  item.stroke_actual = stroke_actual;
                  act_rh += parseFloat(item.act_rh ? item.act_rh : 0);
                  act_lh += parseFloat(item.act_lh ? item.act_lh : 0);
                  dandori += parseFloat(item.dandori ? item.dandori : 0);
                  dt_machines += parseFloat(
                    item.dt_machines ? item.dt_machines : 0
                  );
                  dt_dies += parseFloat(item.dt_dies ? item.dt_dies : 0);
                  dt_other += parseFloat(item.dt_other ? item.dt_other : 0);
                  tpt_actual += parseFloat(
                    item.tpt_actual ? item.tpt_actual : 0
                  );
                  total_repair += parseFloat(
                    item.repair_rh
                      ? parseInt(item.repair_rh) + parseInt(item.repair_lh)
                      : 0
                  );

                  total_reject += parseFloat(
                    item.reject_rh
                      ? parseInt(item.reject_rh) + parseInt(item.reject_lh)
                      : 0
                  );

                  item.total_gsph =
                    (item.stroke_actual /
                      (item.value_combination * item.tpt_actual)) *
                    60;
                  gsph_total = (stroke_actual / (4 * tpt_actual)) * 60;
                  const startMachine =
                    current_machine.format("YYYY-MM-DD HH:mm");
                  current_machine = moment(current_machine, "hh:mm:ss A").add(
                    item.tpt_machine ? item.tpt_machine : 0,
                    "minutes"
                  );
                  const endMachine = current_machine.format("YYYY-MM-DD HH:mm");
                  const breakTimeMachine = utilityStore.mappingBreak(
                    this.params,
                    startMachine,
                    endMachine
                  );
                  current_machine = moment(current_machine, "hh:mm:ss A").add(
                    breakTimeMachine,
                    "minutes"
                  );
                  item.finish_machine = item.tpt_machine
                    ? current_machine.format("HH : mm")
                    : "-";
                  qty_plan += parseFloat(item.lotsize ? item.lotsize : 0);
                  const start = current.format("YYYY-MM-DD HH:mm");
                  current = moment(current, "hh:mm:ss A").add(
                    item.tpt ? item.tpt : 0,
                    "minutes"
                  );
                  const end = current.format("YYYY-MM-DD HH:mm");
                  const breakTime = utilityStore.mappingBreak(
                    this.params,
                    start,
                    end
                  );
                  current = moment(current, "hh:mm:ss A").add(
                    breakTime,
                    "minutes"
                  );
                  item.finish_plan = item.job_number
                    ? current.format("HH : mm")
                    : "-";
                  return item;
                });

                data.gsph_actual =
                  total_qty_gsph && total_tpt
                    ? (total_qty_gsph / (total_tpt - idletime)) * 60
                    : 0;
                data.cycle_time_actual =
                  total_qty_gsph && total_tpt
                    ? ((total_tpt - idletime) / total_qty_gsph) * 60
                    : 0;
                data.downtime_actual = downtime;
                data.idletime_actual = idletime;
                data.total_part_plan = qty_plan;
                data.total_part_actual = qty_actual;
                data.repair_actual =
                  qty_actual && repair ? (repair / qty_actual) * 100 : 0;
                data.reject_actual =
                  qty_actual && reject ? (reject / qty_actual) * 100 : 0;
                data.good_actual =
                  100 - data.repair_actual - data.reject_actual;
                data.total_stroke = stroke;
                data.total_lot_rh = lot_rh;
                data.total_lot_lh = lot_lh;
                data.tpt_total = tpt;
                data.total_stroke_actual = total_stroke_actual;
                data.total_act_rh = act_rh;
                data.total_act_lh = act_lh;
                data.total_dandori = dandori;
                data.total_dt_machines = dt_machines;
                data.total_dt_dies = dt_dies;
                data.total_dt_other = dt_other;
                data.total_tpt_actual = tpt_actual;
                data.total_gsph = gsph_total;
                data.reject = total_reject;
                data.repair = total_repair;
                data.qty_ok = parseInt(act_rh) + parseInt(act_lh);
                data.ok_persen =
                  (parseInt(data.qty_ok) /
                    (parseInt(act_rh) + parseInt(act_lh))) *
                  100;

                data.repair_persen =
                  (parseInt(total_repair) /
                    (parseInt(act_rh) + parseInt(act_lh))) *
                  100;

                data.reject_persen =
                  (parseInt(total_reject) /
                    (parseInt(act_rh) + parseInt(act_lh))) *
                  100;

                data.total_gsph = (total_stroke_actual / (4 * tpt_actual)) * 60;
                data.expand = false;
                return data;
              });
            } else {
              utilityStore.onApiResponse(response);
              this.lines = response.data.data.map((data) => {
                data.detail = [];
                return data;
              });
            }
            configStore.page.name = `Achievement Welding Compare with SAP (${utilityStore.formatDate(
              this.params.date
            )} / Shift ${this.params.shift})`;
          } else {
            utilityStore.onApiResponse(response);
          }
        });
      setTimeout(() => {
        this.dialog.filter = false;
      }, 500);
    },

    loadDataEditSAP(line) {
      this.line = line;
      let item = line.detail;
      this.dialog.detail = true;
      this.line_id = line.line_id;
      this.formDetail = {
        hadir: [],
        izin: [],
        sakit: [],
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
        order_start: [],
        isManualInput: [],
        qty_sap: [],
        keterangan_sap: [],
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

    onSaveDetailSAP(vm) {
      notificationStore.loading = true;
      const data = new FormData();
      for (let index in this.formDetail) {
        for (let idx = 0; idx <= this.formDetail[index].length; idx++) {
          data.append(
            `${index}[]`,
            this.formDetail[index][idx] ? this.formDetail[index][idx] : ""
          );
        }
      }
      data.append("line_id", this.line_id);
      data.append("date", this.params.date);
      data.append("shift", this.params.shift);
      data.append("patan", this.patan);
      const configHttp = {
        method: "post",
        url: `http://${configStore.apiUrl}/majsf_rest_api/api/welding-achievement/achievement_sap`,
        headers: {
          "Content-Type": "multipart/form-data",
        },
        data,
      };
      axios(configHttp)
        .then((response) => {
          notificationStore.onApiResponseToastAlert(
            response,
            this.fetchDataLineforSAP()
          );
          vm.$socket.emit("updateAcievement", this.line_id);
        })
        .catch(utilityStore.onError);
    },

    handleTagOK() {
      if (this.formData.part_number && this.formData.lotsize_actual > 0) {
        if (
          !Number.isInteger(
            this.formData.lotsize_actual / this.formData.qty_kbn
          )
        ) {
          notificationStore.showConfirm(
            "Confirm Print",
            "Jumlah PCS tidak kelipatan 1 Kanban! Apakah ingin lanjut??",
            () => {
              this.printTagOk();
            }
          );
        } else {
          this.printTagOk();
        }
      } else {
        notificationStore.showAlertWarning(
          "Data yang anda kirim tidak Lengkap."
        );
      }
    },

    printTagOk() {
      notificationStore.loading = true;
      const data = new FormData();
      data.append("part_number", this.formData.part_number);
      data.append("lotsize_actual", this.formData.lotsize_actual);
      data.append("date", this.formData.date);
      data.append("shift", this.formData.shift);

      const configHttp = {
        method: "post",
        url: `http://${configStore.apiUrl}/majsf_rest_api/api/welding-achievement/print_tag_ok`,
        headers: {
          "Content-Type": "multipart/form-data",
        },
        data,
      };
      axios(configHttp)
        .then((response) => {
          if (response.data.success === true) {
            const secretKey = "armada123";
            const dataToEncrypt = JSON.stringify({
              part_number: this.formData.part_number,
              date: this.formData.date,
              shift: this.formData.shift,
              tipe_part: this.formData.tipe_part,
              qty_kbn: this.formData.qty_kbn,
              lotsize: this.formData.lotsize_actual,
            });

            const encryptedData = CryptoJS.AES.encrypt(
              dataToEncrypt,
              secretKey
            ).toString();

            window.open(
              `http://${
                configStore.apiUrl
              }/mims/production-welding/tag-ok?parameter_tag=${encodeURIComponent(
                encryptedData
              )}`,
              // `http://localhost:8080/production-welding/tag-ok?line_id=${encodeURIComponent(
              //   encryptedLineTag
              // )}`,
              "_blank"
            );
            notificationStore.loading = false;
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },

    fetchDataSAP(TAG) {
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/report-kanban/sync_sap?tag=${TAG}`,
          { params: this.params }
        )
        .then((response) => {
          if (response.status === 200) {
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },

    async fetchDataTagOK(parameter_tag) {
      try {
        notificationStore.loading = true;
        const response = await axios.get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/welding_achievement/tag_ok_by_id_kanban?parameter_tag=${parameter_tag}`
        );

        if (response.status === 200) {
          this.table_tag = response.data;
          notificationStore.disableLoading();
          return response.data; // PASTIKAN data dikembalikan!
        } else {
          utilityStore.onApiResponse(response);
          return []; // Return array kosong jika gagal
        }
      } catch (error) {
        utilityStore.onError(error);
        return []; // Return array kosong jika error
      }
    },
  },
});
