import axios from "axios";
import { defineStore } from "pinia";
import { useConfigStore } from "@/pinia/config";
import { useNotificationStore } from "@/pinia/notification";
import { useAuthStore } from "@/pinia/auth";
import { useUtilityStore } from "@/pinia/utility";
import moment from "moment";

const configStore = useConfigStore();
const authStore = useAuthStore();
const notificationStore = useNotificationStore();
const utilityStore = useUtilityStore();
const date = utilityStore.getCurrentShift();
let formDetail = {
  is_tandem: [],
  is_trial: [],
  job_number: [],
  additional: [],
  patan: [],
  part_rh: [],
  part_lh: [],
  combination: [],
  value_combination: [],
  plan_process: [],
  total_process: [],
  act_process: [],
  stroke_plan: [],
  lot_rh: [],
  lot_lh: [],
  kbn_rh: [],
  kbn_lh: [],
  stroke_act: [],
  stroke_machine: [],
  total_tpt_actual: [],
  act_rh: [],
  act_lh: [],
  reject_rh: [],
  reject_lh: [],
  repair_rh: [],
  repair_lh: [],
  g_mesin: [],
  g_dies: [],
  g_sarana: [],
  act_mesin: [],
  act_dies: [],
  act_sarana: [],
  dandori: [],
  dt_machines: [],
  dt_dies: [],
  dt_other: [],
  total_dt: [],
  tpt_real: [],
  tpt_start: [],
  tpt_end: [],
  urut_plan: [],
  part_number: [],
  status_plan: [],
  lotsize: [],
  tpt: [],
  gsph: [],
  gsph_machine: [],
  cycle_time: [],
  finish_plan: [],
  job_number_actual: [],
  part_number_actual: [],
  qty_actual: [],
  tpt_actual: [],
  finish_actual: [],
  repair: [],
  reject: [],
  downtime: [],
  idletime: [],
  breaktime: [],
  status: [],
  keterangan: [],
  keterangan_all: [],
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
  machine: [],
  process: [],
  qty_actual_machine: [],
  last_status: [],
  dandori_machine: [],
  tpt_machine: [],
  finish_machine: [],
  urut: [],
};
export const useStampingAchievementStoreMachine = defineStore({
  id: "production-stamping-achievement-machine",
  state() {
    return {
      tag: "LKH-STP",
      is_done: true,
      context: null,
      line_id: "",
      patan: "",
      formDetail,
      permissions: {
        create: authStore.checkAccess("Production.Create.AchievementStamping"),
        update: authStore.checkAccess("Production.Update.AchievementStamping"),
        download: authStore.checkAccess("Report.Download.AchievementStamping"),
        pcd: authStore.checkAccess("Production.PCD.AchievementStamping"),
      },
      report: {
        datatables: {
          headers: [
            { text: "Date", align: "left", value: "date" },
            { text: "Shift", align: "left", value: "shift" },
            { text: "Patan", align: "left", value: "patan" },
            { text: "Line", align: "left", value: "line_id" },
            { text: "Urut", align: "left", value: "urut" },
            { text: "Tandem", align: "right", value: "is_tandem_text" },
            { text: "Trial", align: "right", value: "is_trial_text" },
            { text: "Part RH", align: "left", value: "part_rh" },
            { text: "Part LH", align: "left", value: "part_lh" },
            {
              text: "Combination Process",
              align: "left",
              value: "combination",
            },
            { text: "Status Plan", align: "left", value: "status_plan" },
            { text: "Stroke Plan", align: "left", value: "stroke_plan" },
            {
              text: "Qty Finish Plan RH",
              align: "left",
              value: "lot_rh",
            },
            {
              text: "Qty Finish Plan LH",
              align: "left",
              value: "lot_lh",
            },
            { text: "TPT Plan", align: "left", value: "tpt" },
            { text: "Keterangan", align: "left", value: "keterangan" },
            { text: "Stroke Actual", align: "left", value: "stroke_act" },
            {
              text: "Qty Finish Actual RH",
              align: "left",
              value: "act_rh",
            },
            {
              text: "Qty Finish Actual LH",
              align: "left",
              value: "act_lh",
            },
            {
              text: "Repair RH",
              align: "left",
              value: "repair_rh",
            },
            {
              text: "Repair LH",
              align: "left",
              value: "repair_lh",
            },
            {
              text: "Keterangan Repair RH",
              align: "left",
              value: "ket_repair_rh",
            },
            {
              text: "Keterangan Repair LH",
              align: "left",
              value: "ket_repair_lh",
            },
            {
              text: "Reject RH",
              align: "left",
              value: "reject_rh",
            },
            {
              text: "Reject LH",
              align: "left",
              value: "reject_lh",
            },
            {
              text: "Keterangan Reject RH",
              align: "left",
              value: "ket_reject_rh",
            },
            {
              text: "Keterangan Reject LH",
              align: "left",
              value: "ket_reject_lh",
            },
            { text: "Status", align: "left", value: "status" },
            { text: "Idletime", align: "left", value: "idletime" },
            { text: "Dandori", align: "left", value: "dandori" },
            { text: "Down Time Machines", align: "left", value: "dt_machines" },
            { text: "Down Time Dies", align: "left", value: "dt_dies" },
            { text: "Down Time Other", align: "left", value: "dt_other" },
            {
              text: "Keterangan Down Time Machines",
              align: "left",
              value: "ket_dt_machines",
            },
            {
              text: "Keterangan Down Time Dies",
              align: "left",
              value: "ket_dt_dies",
            },
            {
              text: "Keterangan Down Time Other",
              align: "left",
              value: "ket_dt_other",
            },
            { text: "Total Down Time", align: "left", value: "dt_total" },
            { text: "TPT Actual", align: "left", value: "tpt_actual" },
            { text: "GSPH", align: "left", value: "gsph" },
            { text: "Keterangan Line", align: "left", value: "keterangan_all" },
          ],
          items: [],
          filters: {
            date: [],
            shift: [],
            patan: [],
            line_id: [],
            urut: [],
            is_tandem_text: [],
            is_trial_text: [],
            part_rh: [],
            part_lh: [],
            combination: [],
            status_plan: [],
            stroke_plan: [],
            lot_rh: [],
            lot_lh: [],
            tpt: [],
            keterangan: [],
            stroke_act: [],
            act_rh: [],
            act_lh: [],
            repair_rh: [],
            repair_lh: [],
            ket_repair_rh: [],
            ket_repair_lh: [],
            reject_rh: [],
            reject_lh: [],
            ket_reject_rh: [],
            ket_reject_lh: [],
            status: [],
            dandori: [],
            dt_machines: [],
            dt_dies: [],
            dt_other: [],
            ket_dt_machines: [],
            ket_dt_dies: [],
            ket_dt_other: [],
            dt_total: [],
            tpt_actual: [],
            gsph: [],
            keterangan_all: [],
            update_date: [],
            information: [],
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
      reportMachine: {
        datatables: {
          headers: [
            { text: "Date", align: "left", value: "date" },
            { text: "Shift", align: "left", value: "shift" },
            { text: "Patan", align: "left", value: "patan" },
            { text: "Line", align: "left", value: "line_id" },
            { text: "Machine", align: "left", value: "machine" },
            {
              text: "Job Number Actual",
              align: "left",
              value: "job_number_actual",
            },
            { text: "Process", align: "left", value: "process" },
            { text: "Qty Plan", align: "left", value: "lotsize" },
            { text: "Qty Actual", align: "left", value: "qty_actual" },
            { text: "Dandori", align: "left", value: "dandori" },
            { text: "TPT", align: "left", value: "tpt" },
            { text: "Gangguan Sarana", align: "left", value: "g_sarana" },
            { text: "Gangguan Bahan", align: "left", value: "g_bahan" },
            { text: "Gangguan Dies", align: "left", value: "g_dies" },
            { text: "Gangguan Machine", align: "left", value: "g_machine" },
          ],
          items: [],
          filters: {
            date: [],
            shift: [],
            patan: [],
            line_id: [],
            machine: [],
            job_number_actual: [],
            process: [],
            lotsize: [],
            qty_actual: [],
            machqty_actualine: [],
            dandori: [],
            tpt: [],
            g_sarana: [],
            g_bahan: [],
            g_dies: [],
            g_machine: [],
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
        formAction: false,
      },
      partItems: [],
      gangguan: [],
      gangguan_dies: [],
      gangguan_sarana: [],
      gangguan_machine: [],
      lines: [],
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
      list: {
        machine: [
          "A1",
          "A2",
          "A3",
          "A4",
          "B1",
          "B2",
          "B3",
          "B4",
          "C1",
          "C2",
          "D1",
          "D2",
          "D3",
          "D4",
          "E1",
          "E2",
          "E3",
          "E4",
          "F1",
          "F2",
          "F3",
          "F4",
          "80T-1",
          "80T-2",
          "80T-3",
          "110T-1",
          "110T-2",
          "110T-3",
          "110T-4",
          "150T-1",
          "150T-2",
          "150T-3",
          "150T-4",
          "150T-5",
          "150T-6",
          "150T-7",
          "300T-1",
          "300T-2",
        ],
        process: [
          "OP10",
          "OP20",
          "OP30",
          "OP40",
          "OP50",
          "OP60",
          "OP70",
          "OP80",
        ],
      },
      statusList: ["WIP", "FP", "BL"],
      keteranganList: [
        "Revisi Plan",
        "Cancel Plan",
        "Kanban Kosong",
        "Switch Item",
        "R/M Kosong",
        "Prioritas",
        "Service Part",
        "Buffer",
        "Add SO",
        "WIP Kosong",
        "BL Kosong",
        "Delay Material",
        "Delay Dies",
        "Delay WIP",
        "Delay BL",
        "Kombinasi Item",
        "Delay Kanban",
        "Stock Over",
        "Waktu Tidak Cukup",
      ],
      keteranganAllList: [
        "Lanjutan Shift 1",
        "Lanjutan Shift 2",
        "1 Lot R/M ≠ LotSize",
        "Tarik Patan",
        "WIP Kurang",
        "Blank Kurang",
        "Problem Mesin",
        "Problem Dies",
        "Lanjut Shift Berikut",
        "R/M Kurang",
        "Switching LINE A",
        "Switching LINE B",
        "Switching LINE C",
        "Switching LINE D",
        "Switching LINE E",
        "Switching LINE F",
        "Switching LINE 300T",
        "Switching LINE SP",
        "Pallet Std Kosong",
        "Trial Produksi",
        "Kanban Kurang",
        "Sdh Tarik Proses",
      ],
      combinationProcess: ["5 - 0", "4 - 0", "3 - 0", "2 - 0", "1 - 0"],
      planProcess: ["1", "2", "3", "4", "5", "6", "7"],
      totalProcess: ["1", "2", "3", "4", "5", "6"],
      addList: ["Add", "A", "B", "C", "D", "R1"],
      listShift: [1, 2],
      params: utilityStore.getCurrentShift(),
      view: false,
      machine: "",
      statusForm: "",
      order: 1,
      part_number_rh: "",
      part_number_lh: "",
      lot_size_rh: "",
      lot_size_lh: "",
      urut: "",
      mesin: "",
      job_number_actual: "",
      d_start: "",
      d_end: "0000-00-00 00:00:00",
      act_mesin: "",
      act_sarana: "",
      act_dies: "",
      dataMachine: [],
      filterDate: {
        date: date.date,
        shift: date.shift,
      },
      formData: {
        machine: "",
        process: "",
      },
      form: {
        period: new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
          .toISOString()
          .substr(0, 7),
      },
    };
  },
  actions: {
    resetForm() {
      this.fetchDataLine();
      // this.dialog.detail = false;
      this.dialog.formLed = false;
      this.dialog.formData = false;
      this.dialog.formKetRepair = false;
      this.dialog.formKetDT = false;
      this.dialog.confirmDelete = false;
      this.dialog.formStartLed = false;
      this.dialog.formAction = false;
      this.formData.machine = "";
      this.formData.process = "";
    },
    filterMachineLine() {
      return this.list.machine.filter((d) => {
        return d.toUpperCase().includes(this.line_id.toUpperCase());
      });
    },
    searchPart(item) {
      return `<strong>${item.job_number}</strong> - ${item.part_number}`;
    },
    fetchDataPart() {
      notificationStore.loading = true;
      axios
        .get(`http://${configStore.apiUrl}/majsf_rest_api/api/master/part`)
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
    fetchDataMachine() {
      notificationStore.loading = true;
      const data = new FormData();
      data.append("machine", this.machine);
      axios
        .post(
          `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/report-machine`,
          data
        )
        .then((response) => {
          if (response.status === 200) {
            if (Object.keys(response.data).length) {
              this.dataMachine = response.data;
            } else {
              this.order--;
            }
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },
    counterDataMachine() {
      notificationStore.loading = true;
      const data = new FormData();
      data.append("machine", this.machine);
      axios
        .post(
          `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/trial_counter`,
          data
        )
        .then((response) => {
          if (response.status === 200) {
            if (Object.keys(response.data).length) {
              this.dataMachine = response.data;
            } else {
              this.order--;
            }
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
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
    filteredItemsMachine() {
      return this.reportMachine.datatables.items.filter((d) => {
        return Object.keys(this.reportMachine.datatables.filters).every((f) => {
          return (
            this.reportMachine.datatables.filters[f].length < 1 ||
            d[f]
              .toLowerCase()
              .includes(this.reportMachine.datatables.filters[f].toLowerCase())
          );
        });
      });
    },
    fetchDataLine() {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/achievement`,
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
                          item.idletime ? item.idletime : 0
                        );
                        total_qty_gsph += parseFloat(
                          item.qty_actual ? item.qty_actual : 0
                        );
                        total_tpt += parseFloat(
                          item.tpt_actual ? item.tpt_actual : 0
                        );
                      }
                      const startActual = current_actual.format(
                        "YYYY-MM-DD HH:mm"
                      );
                      current_actual = moment(current_actual, "hh:mm:ss A").add(
                        item.tpt_actual ? item.tpt_actual : 0,
                        "minutes"
                      );
                      const endActual = current_actual.format(
                        "YYYY-MM-DD HH:mm"
                      );
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
                  const startMachine = current_machine.format(
                    "YYYY-MM-DD HH:mm"
                  );
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
                data.qty_ok =
                  parseInt(act_rh) +
                  parseInt(act_lh) -
                  parseInt(total_repair) -
                  parseInt(total_reject);
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
            }

            configStore.page.name = `Achievement Stamping (${utilityStore.formatDate(
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
    fetchDataGangguan() {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/gangguan`,
          { params: this.params }
        )
        .then((response) => {
          if (response.status === 200) {
            if (response.data.status) {
              this.gangguan = response.data.data;
            } else {
              utilityStore.onApiResponse(response);
            }

            configStore.page.name = `Achievement Stamping (${utilityStore.formatDate(
              this.params.date
            )} / Shift ${this.params.shift} / Patan ${this.patan})`;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },
    fetchDataGangguanMachine(machine) {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/gangguan_machine?machine=${machine}`,
          { params: this.params }
        )
        .then((response) => {
          if (response.status === 200) {
            if (response.data.status) {
              this.gangguan_machine = response.data.data;
            } else {
              utilityStore.onApiResponse(response);
            }
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },
    fetchDataGangguanDies() {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/gangguan_dies`,
          { params: this.params }
        )
        .then((response) => {
          if (response.status === 200) {
            if (response.data.status) {
              this.gangguan_dies = response.data.data;
            } else {
              utilityStore.onApiResponse(response);
            }

            configStore.page.name = `Achievement Stamping (${utilityStore.formatDate(
              this.params.date
            )} / Shift ${this.params.shift} / Patan ${this.patan})`;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },
    fetchDataGangguanSarana() {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/gangguan_sarana`,
          { params: this.params }
        )
        .then((response) => {
          if (response.status === 200) {
            if (response.data.status) {
              this.gangguan_sarana = response.data.data;
            } else {
              utilityStore.onApiResponse(response);
            }

            configStore.page.name = `Achievement Stamping (${utilityStore.formatDate(
              this.params.date
            )} / Shift ${this.params.shift} / Patan ${this.patan})`;
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
          `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/report`,
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
          `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/summary`,
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
    fetchDataReportMachine() {
      notificationStore.loading = true;
      const data = new FormData();
      data.append("start", this.reportMachine.filter.dates[0]);
      data.append(
        "end",
        this.reportMachine.filter.dates[1] ?? this.reportMachine.filter.dates[0]
      );
      axios
        .post(
          `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/report-machine`,
          data
        )
        .then((response) => {
          if (response.status === 200) {
            this.reportMachine.datatables.items = response.data;
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
    fetchDataLineByID(id) {
      // notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/display_machine?line=${id}`
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
    fetchDataLineByIDDireksi(id) {
      // notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/display?line=${id}`
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
    fetchDataLineRefresh(id) {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/display_refresh?line=${id}`
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
      data.append("line_id", this.line_id);
      data.append("date", this.params.date);
      data.append("shift", this.params.shift);
      data.append("patan", this.patan);
      data.append("is_done", this.is_done);
      const configHttp = {
        method: "post",
        url: `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/achievement`,
        headers: {
          "Content-Type": "multipart/form-data",
        },
        data,
      };
      axios(configHttp)
        .then((response) => {
          notificationStore.onApiResponseToastAlert(response, this.resetForm);
          vm.$socket.emit("updateAcievement", this.line_id);
        })
        .catch(utilityStore.onError);
    },
    onSaveMachine(vm) {
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
        url: `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/achievement`,
        headers: {
          "Content-Type": "multipart/form-data",
        },
        data,
      };
      axios(configHttp)
        .then((response) => {
          notificationStore.onApiResponseToastAlert(response, this.resetForm);
          vm.$socket.emit("updateAcievement", this.line_id);
        })
        .catch(utilityStore.onError);
    },
    onSaveStart() {
      notificationStore.loading = true;
      const data = new FormData();
      data.append("line_id", this.line_id);
      data.append("date", this.params.date);
      data.append("shift", this.params.shift);
      data.append("patan", this.patan);
      data.append("part_number_rh", this.part_number_rh);
      data.append("part_number_lh", this.part_number_lh);
      data.append("lot_size_rh", this.lot_size_rh);
      data.append("urut", this.urut);
      data.append("machine", this.formData.machine);
      data.append("process", this.formData.process);
      console.log(data);
      const configHttp = {
        method: "post",
        url: `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/kanban_start`,
        data,
      };
      axios(configHttp).then((response) => {
        notificationStore.onApiResponseToastAlert(response, this.resetForm);
        // vm.$socket.emit("updateAcievement", this.line_id);
      });
    },
    countDataActual() {
      // let total_qty_gsph = 0;
      // let total_tpt = 0;
      // let downtime = 0;
      // let idletime = 0;
      // let repair = 0;
      // let reject = 0;
      let qty_actual = 0;
      let qty_plan = 0;
      let total_repair = 0;
      let total_reject = 0;
      var array = [];
      var trial = [];
      var act_rh_trial = [];
      var act_lh_trial = [];
      const time = this.params.shift == "1" ? "07:15" : "20:00";
      let current_actual = moment(
        `${this.params.date} ${time}`,
        "YYYY-MM-DD HH:mm"
      );
      let current = moment(`${this.params.date} ${time}`, "YYYY-MM-DD HH:mm");
      let currentMachine = moment(
        `${this.params.date} ${time}`,
        "YYYY-MM-DD HH:mm"
      );

      let current_now = moment(`${this.params.date}`, "YYYY-MM-DD HH:mm");

      this.formDetail.tpt_actual.map((item, index) => {
        if (this.formDetail.act_rh[index]) {
          // downtime += parseFloat(
          //   this.formDetail.downtime[index]
          //     ? this.formDetail.downtime[index]
          //     : 0
          // );
          // repair += parseFloat(
          //   this.formDetail.repair[index] ? this.formDetail.repair[index] : 0
          // );
          // reject += parseFloat(
          //   this.formDetail.reject[index] ? this.formDetail.reject[index] : 0
          // );
          // qty_actual += parseFloat(
          //   this.formDetail.qty_actual[index]
          //     ? this.formDetail.qty_actual[index]
          //     : 0
          // );
          if (!this.formDetail.is_tandem[index]) {
            if (!this.formDetail.is_trial[index]) {
              // idletime += parseFloat(
              //   this.formDetail.idletime[index]
              //     ? this.formDetail.idletime[index]
              //     : 0
              // );
              // total_qty_gsph += parseFloat(
              //   this.formDetail.qty_actual[index]
              //     ? this.formDetail.qty_actual[index]
              //     : 0
              // );
              // total_tpt += parseFloat(
              //   this.formDetail.tpt_actual[index]
              //     ? this.formDetail.tpt_actual[index]
              //     : 0
              // );
            }
            // const startActual = current_actual.format("YYYY-MM-DD HH:mm");
            // current_actual = moment(current_actual, "hh:mm:ss A").add(
            //   minutes ? minutes : 0,
            //   "minutes"
            // );
            // const endActual = current_actual.format("YYYY-MM-DD HH:mm");
            // const breakTimeActual = utilityStore.mappingBreak(
            //   this.params,
            //   startActual,
            //   endActual
            // );
            // current_actual = moment(current_actual, "hh:mm:ss").add(
            //   breakTimeActual,
            //   "minutes"
            // );
            // current_now = moment(current_now, "hh:mm:ss A").add(
            //   item ? item : 0,
            //   "minutes"
            // );
            // this.formDetail.breaktime[index] = breakTimeActual;
            const startActual = current_actual.format("YYYY-MM-DD HH:mm");
            current_actual = moment(current_actual, "hh:mm:ss A").add(
              item ? item : 0,
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
            current_now = moment(current_now, "hh:mm:ss A").add(
              item ? item : 0,
              "minutes"
            );
            const startMachine = currentMachine.format("YYYY-MM-DD HH:mm");
            currentMachine = moment(currentMachine, "hh:mm:ss A").add(
              this.formDetail.tpt_machine[index]
                ? this.formDetail.tpt_machine[index]
                : 0,
              "minutes"
            );
            const endMachine = currentMachine.format("YYYY-MM-DD HH:mm");
            const breakTimeMachine = utilityStore.mappingBreak(
              this.params,
              startMachine,
              endMachine
            );
            currentMachine = moment(currentMachine, "hh:mm:ss A").add(
              breakTimeMachine,
              "minutes"
            );
          }
          // Jika tandem dipilih maka total tpt tidak tidak menambahkan
          this.formDetail.hasil_tpt =
            this.formDetail.is_tandem[index] == false
              ? this.formDetail.tpt_machine[index]
              : 0;

          this.formDetail.tpt_trial =
            this.formDetail.is_trial[index] == false
              ? this.formDetail.hasil_tpt
              : 0;

          array.push(this.formDetail.hasil_tpt);
          trial.push(this.formDetail.tpt_trial);

          // Jika Trial dipilih maka total pcs tidak ditambah
          this.formDetail.hasil_act_rh =
            this.formDetail.is_trial[index] == false
              ? this.formDetail.qty_actual_machine[index]
              : 0;

          act_rh_trial.push(this.formDetail.hasil_act_rh);

          // this.formDetail.hasil_act_lh =
          //   this.formDetail.is_trial[index] == false
          //     ? this.formDetail.act_lh[index]
          //     : 0;

          // act_lh_trial.push(this.formDetail.hasil_act_lh);

          this.formDetail.finish_actual[index] = this.formDetail
            .tpt_actual[index]
            ? current_actual.format("HH : mm")
            : "-";
            
          this.formDetail.finish_machine[index] = this.formDetail.tpt_machine[
            index
          ]
            ? currentMachine.format("HH : mm")
            : "-";
        }

        this.formDetail.stroke_plan[index] =
          this.formDetail.lot_rh[index] *
          this.formDetail.value_combination[index];

          this.formDetail.stroke_act[index] = this.formDetail.qty_actual_machine[index]
          ? this.formDetail.qty_actual_machine[index] * this.formDetail.act_process[index]
          : 0;

          this.formDetail.stroke_machine[index] = this.formDetail.qty_actual_machine[
            index
          ]
            ? this.formDetail.qty_actual_machine[index] *
              this.formDetail.act_process[index]
            : 0;

        this.formDetail.total_dt[index] =
          parseInt(this.formDetail.g_mesin[index]) +
          parseInt(this.formDetail.g_dies[index]) +
          parseInt(this.formDetail.g_sarana[index]);

          this.formDetail.gsph[index] =
          (parseInt(this.formDetail.stroke_act[index]) /
            (parseInt(this.formDetail.act_process[index]) *
              (parseInt(this.formDetail.tpt_actual[index]) -
                parseInt(this.formDetail.idletime[index])))) *
          60;
        this.formDetail.gsph_machine[index] =
          (parseInt(this.formDetail.stroke_machine[index]) /
            (parseInt(this.formDetail.act_process[index]) *
              (parseInt(this.formDetail.tpt_machine[index]) -
                parseInt(this.formDetail.idletime[index])))) *
          60;

        this.formDetail.patan[index] = this.patan;

        this.formDetail.total_tpt_actual = array.reduce(
          (a, b) => Number(a) + Number(b),
          0
        );

        this.formDetail.total_tpt_trial = trial.reduce(
          (a, b) => Number(a) + Number(b),
          0
        );

        this.formDetail.tpt_total = this.formDetail.tpt.reduce(
          (a, b) => Number(a) + Number(b),
          0
        );

        this.formDetail.total_stroke = this.formDetail.stroke_plan.reduce(
          (a, b) => Number(a) + Number(b),
          0
        );

        this.formDetail.total_lot_rh = this.formDetail.lot_rh.reduce(
          (a, b) => Number(a) + Number(b),
          0
        );

        this.formDetail.total_lot_lh = this.formDetail.lot_lh.reduce(
          (a, b) => Number(a) + Number(b),
          0
        );

        this.formDetail.total_stroke_actual = this.formDetail.stroke_act.reduce(
          (a, b) => Number(a) + Number(b),
          0
        );

        this.formDetail.total_act_rh = act_rh_trial.reduce(
          (a, b) => Number(a) + Number(b),
          0
        );

        this.formDetail.total_act_lh = act_lh_trial.reduce(
          (a, b) => Number(a) + Number(b),
          0
        );

        this.formDetail.total_repair_rh = this.formDetail.repair_rh.reduce(
          (a, b) => Number(a) + Number(b),
          0
        );

        this.formDetail.total_repair_lh = this.formDetail.repair_lh.reduce(
          (a, b) => Number(a) + Number(b),
          0
        );

        this.formDetail.total_reject_rh = this.formDetail.reject_rh.reduce(
          (a, b) => Number(a) + Number(b),
          0
        );

        this.formDetail.total_reject_lh = this.formDetail.reject_lh.reduce(
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

        this.formDetail.total_dt_dies = this.formDetail.dt_dies.reduce(
          (a, b) => Number(a) + Number(b),
          0
        );

        this.formDetail.total_dt_other = this.formDetail.dt_other.reduce(
          (a, b) => Number(a) + Number(b),
          0
        );

        this.formDetail.dt_total = this.formDetail.total_dt.reduce(
          (a, b) => Number(a) + Number(b),
          0
        );

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
        this.formDetail.keterangan_sum = this.formDetail.keterangan_filter.join(
          ", "
        );

        this.formDetail.total_gsph_4 =
          (this.formDetail.total_stroke_actual /
            (4 * this.formDetail.total_tpt_actual -
              this.formDetail.total_idletime)) *
          60;

        this.formDetail.total_gsph_2 =
          (this.formDetail.total_stroke_actual /
            (2 * this.formDetail.total_tpt_actual -
              this.formDetail.total_idletime)) *
          60;

        this.formDetail.total_gsph_1 =
          (this.formDetail.total_stroke_actual /
            (1 * this.formDetail.total_tpt_actual -
              this.formDetail.total_idletime)) *
          60;

        this.formDetail.total_gsph_10 =
          (this.formDetail.total_stroke_actual /
            (10 * this.formDetail.total_tpt_actual -
              this.formDetail.total_idletime)) *
          60;

        // TPT Trial
        this.formDetail.trial_gsph_4 =
          (this.formDetail.total_stroke_actual /
            (4 * this.formDetail.total_tpt_trial -
              this.formDetail.total_idletime)) *
          60;

        this.formDetail.trial_gsph_2 =
          (this.formDetail.total_stroke_actual /
            (2 * this.formDetail.total_tpt_trial -
              this.formDetail.total_idletime)) *
          60;

        this.formDetail.trial_gsph_1 =
          (this.formDetail.total_stroke_actual /
            (1 * this.formDetail.total_tpt_trial -
              this.formDetail.total_idletime)) *
          60;

        this.formDetail.trial_gsph_10 =
          (this.formDetail.total_stroke_actual /
            (10 * this.formDetail.total_tpt_trial -
              this.formDetail.total_idletime)) *
          60;

        // qty_plan += parseFloat(
        //   this.formDetail.lotsize[index] ? this.formDetail.lotsize[index] : 0
        // );
        const start = current.format("YYYY-MM-DD HH:mm");
        current = moment(current, "hh:mm:ss A").add(
          this.formDetail.tpt[index] ? this.formDetail.tpt[index] : 0,
          "minutes"
        );
        const end = current.format("YYYY-MM-DD HH:mm");
        const breakTime = utilityStore.mappingBreak(this.params, start, end);
        current = moment(current, "hh:mm:ss A").add(breakTime, "minutes");
        this.formDetail.finish_plan[index] = this.formDetail.part_rh[index]
          ? current.format("HH : mm")
          : "-";
      });
      total_repair =
        this.formDetail.total_repair_rh + this.formDetail.total_repair_lh;

      this.line.total_repair = total_repair;
      total_reject =
        this.formDetail.total_reject_rh + this.formDetail.total_reject_lh;

      this.line.total_reject = total_reject;
      // this.line.gsph_actual =
      //   total_qty_gsph && total_tpt
      //     ? (total_qty_gsph / (total_tpt - idletime)) * 60
      //     : 0;
      // this.line.cycle_time_actual =
      //   total_qty_gsph && total_tpt
      //     ? ((total_tpt - idletime) / total_qty_gsph) * 60
      //     : 0;
      // this.line.downtime_actual = downtime;
      // this.line.idletime_actual = idletime;
      this.line.total_part_plan = qty_plan;
      this.line.total_part_actual = qty_actual;
      // this.line.repair_actual =
      //   qty_actual && repair ? (repair / qty_actual) * 100 : 0;
      // this.line.reject_actual =
      //   qty_actual && reject ? (reject / qty_actual) * 100 : 0;
      this.line.good_actual =
        100 - this.line.repair_actual - this.line.reject_actual;

      this.line.qty_ok = parseInt(this.formDetail.total_act_rh);
      parseInt(total_reject) - parseInt(total_repair) - parseInt(total_reject);
      this.line.ok_persen =
        (parseInt(this.line.qty_ok) / parseInt(this.formDetail.total_act_rh)) *
        100;

      this.line.repair_persen =
        (parseInt(total_repair) /
          (parseInt(this.formDetail.total_act_rh) +
            parseInt(this.formDetail.total_act_lh))) *
        100;

      this.line.reject_persen =
        (parseInt(total_reject) /
          (parseInt(this.formDetail.total_act_rh) +
            parseInt(this.formDetail.total_act_lh))) *
        100;
    },
    loadDataDetailEdit(line) {
      this.line = line;
      let item = line.detail;
      this.dialog.detail = true;
      this.line_id = line.line_id;
      this.is_done = line.is_done;
      this.formDetail = {
        is_tandem: [],
        is_trial: [],
        job_number: [],
        urut: [],
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
        tpt: [],
        finish_plan: [],
        keterangan: [],
        stroke_act: [],
        stroke_machine: [],
        // total_tpt_actual: [],
        act_rh: [],
        act_lh: [],
        repair_rh: [],
        repair_lh: [],
        reject_rh: [],
        reject_lh: [],
        status: [],
        g_mesin: [],
        g_dies: [],
        g_sarana: [],
        act_mesin: [],
        act_dies: [],
        act_sarana: [],
        dandori: [],
        dt_machines: [],
        dt_dies: [],
        dt_other: [],
        total_dt: [],
        tpt_real: [],
        tpt_start: [],
        tpt_end: [],
        // part_number: [],
        lotsize: [],
        gsph: [],
        gsph_machine: [],
        // cycle_time: [],
        job_number_actual: [],
        // part_number_actual: [],
        // qty_actual: [],
        tpt_actual: [],
        finish_actual: [],
        // repair: [],
        // reject: [],
        // downtime: [],
        idletime: [],
        // breaktime: [],
        keterangan_all: [],
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
        machine: [],
        process: [],
        qty_actual_machine: [],
        last_status: [],
        dandori_machine: [],
        tpt_machine: [],
        finish_machine: [],
      };
      let loop = 0;
      while (loop < (item.length > 13 ? item.length : 13)) {
        const arrVar = ["machine", "process"];
        if (item[loop]) {
          Object.entries(this.formDetail).map((k) => {
            if (k[0] == "is_tandem" || k[0] == "is_trial") {
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
            if (k[0] == "is_tandem" || k[0] == "is_trial") {
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
    loadDataLed(line) {
      this.dialog.formLed = true;
      this.loadDataDetailEdit(line);
      this.dialog.detail = false;
    },
    loadKeteranganRepair() {
      this.dialog.formKetRepair = true;
      // this.loadDataDetailEdit(line);
      // this.dialog.detail = false;
    },
    loadKeteranganDT() {
      this.dialog.formKetDT = true;
      // this.loadDataDetailEdit(line);
      // this.dialog.detail = false;
    },
    loadDataKanban(line) {
      this.dialog.formKanban = true;
      this.loadDataDetailEdit(line);
      this.dialog.detail = false;
    },
    loadStart(line, rh, lh, lot_rh, lot_lh, urut) {
      this.dialog.formStartLed = true;
      this.part_number_rh = rh;
      this.part_number_lh = lh;
      this.lot_size_rh = lot_rh;
      this.lot_size_lh = lot_lh;
      this.urut = urut;
      this.loadDataDetailEdit(line);
      this.dialog.detail = false;
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
      fd.append("patan", this.patan);
      fd.append("urut", data);
      fd.append("move", to);

      const configHttp = {
        method: "put",
        url: `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/move`,
        headers: {
          "Content-Type": "multipart/form-data",
        },
        data: fd,
      };
      axios(configHttp)
        .then((response) =>
          notificationStore.onApiResponseToastAlert(
            response,
            this.fetchDataLineRefresh(id)
          )
        )
        .catch(configStore.onError);
    },
    addRow() {
      const arrVar = ["machine", "process"];
      // notificationStore.loading = true;
      Object.entries(this.formDetail).map((k) => {
        if (k[0] == "is_tandem" || k[0] == "is_trial") {
          this.formDetail[k[0]].push(false);
        } else {
          if (arrVar.includes(k[0])) {
            this.formDetail[k[0]].push([]);
          } else {
            this.formDetail[k[0]].push("");
          }
        }
      });
      notificationStore.disableLoading();
    },
    deleteRow(j) {
      const arrVar = ["machine", "process"];
      // notificationStore.loading = true;
      Object.entries(this.formDetail).map((k) => {
        if (k[0] == "is_tandem" || k[0] == "is_trial") {
          this.formDetail[k[0]].splice(false);
        } else {
          if (arrVar.includes(k[0])) {
            this.formDetail[k[0]].splice([]);
          } else {
            this.formDetail[k[0]].splice(j, 1);
          }
        }
      });
      notificationStore.disableLoading();
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
        url: `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/data`,
        headers: {
          "Content-Type": "multipart/form-data",
        },
        data: fd,
      };
      axios(configHttp)
        .then((response) =>
          notificationStore.onApiResponseToastAlert(
            response,
            this.fetchDataLineByID(id)
          )
        )
        .catch(configStore.onError);
    },
    onPrint(data) {
      const fd = new URLSearchParams();
      // const id = this.line_id;
      fd.append("line_id", this.line_id);
      fd.append("date", this.params.date);
      fd.append("shift", this.params.shift);
      fd.append("patan", this.patan);
      fd.append("urut", data);

      const configHttp = {
        method: "put",
        url: `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/print`,
        headers: {
          "Content-Type": "multipart/form-data",
        },
        data: fd,
      };
      axios(configHttp)
        .then((response) =>
          notificationStore.onApiResponseToastAlert(
            response
            // this.fetchDataLineByID(id)
          )
        )
        .catch(configStore.onError);
    },
    openForm() {
      const fd = new URLSearchParams();
      // const id = this.line_id;
      fd.append("line_id", this.line_id);
      fd.append("date", this.params.date);
      fd.append("shift", this.params.shift);
      fd.append("patan", this.patan);

      const configHttp = {
        method: "put",
        url: `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/open`,
        headers: {
          "Content-Type": "multipart/form-data",
        },
        data: fd,
      };
      axios(configHttp);
    },
    closeForm() {
      const fd = new URLSearchParams();
      // const id = this.line_id;
      fd.append("line_id", this.line_id);
      fd.append("date", this.params.date);
      fd.append("shift", this.params.shift);
      fd.append("patan", this.patan);

      const configHttp = {
        method: "put",
        url: `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/close`,
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
      // notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/check?line_id=${id}&date=${date}&shift=${shift}`
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
    updateQty() {
      axios.get(
        `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-lkh/update_qty`,
        {
          params: this.filterDate,
        }
      );
    },
    updateQtyLh() {
      axios.get(
        `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-lkh/update_qty_lh`,
        {
          params: this.filterDate,
        }
      );
    },
    loadFormAction(
      machine,
      job_number_actual,
      d_start,
      d_end,
      urut,
      machine_position,
      act_mesin,
      act_dies,
      act_sarana,
      is_done
    ) {
      this.dialog.formAction = true;
      this.mesin = machine;
      this.job_number_actual = job_number_actual;
      this.d_start = d_start;
      this.d_end = d_end;
      this.urut = urut;
      this.act_mesin = act_mesin;
      this.act_dies = act_dies;
      this.act_sarana = act_sarana;
      this.is_done = is_done;
      this.machine_position = machine_position;
    },
    onAction() {
      notificationStore.loading = true;
      const data = new FormData();
      data.append("part_number", this.job_number_actual);
      data.append("date", this.params.date);
      data.append("shift", this.params.shift);
      data.append("machine", this.mesin);
      data.append("urut", this.urut);
      data.append("machine_position", this.machine_position);
      const configHttp = {
        method: "post",
        url: `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/action_start`,
        data,
      };
      axios(configHttp).then((response) => {
        notificationStore.onApiResponseToastAlert(
          response,
          this.resetForm,
          this.fetchDataGangguan()
        );
        // vm.$socket.emit("updateAcievement", this.line_id);
      });
    },
    onActionSarana() {
      notificationStore.loading = true;
      const data = new FormData();
      data.append("part_number", this.job_number_actual);
      data.append("date", this.params.date);
      data.append("shift", this.params.shift);
      data.append("machine", this.mesin);
      data.append("urut", this.urut);
      data.append("machine_position", this.machine_position);
      const configHttp = {
        method: "post",
        url: `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/action_start_sarana`,
        data,
      };
      axios(configHttp).then((response) => {
        notificationStore.onApiResponseToastAlert(
          response,
          this.resetForm,
          this.fetchDataGangguanSarana()
        );
        // vm.$socket.emit("updateAcievement", this.line_id);
      });
    },
    onActionDies() {
      notificationStore.loading = true;
      const data = new FormData();
      data.append("part_number", this.job_number_actual);
      data.append("date", this.params.date);
      data.append("shift", this.params.shift);
      data.append("machine", this.mesin);
      data.append("urut", this.urut);
      data.append("machine_position", this.machine_position);
      const configHttp = {
        method: "post",
        url: `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/action_start_dies`,
        data,
      };
      axios(configHttp).then((response) => {
        notificationStore.onApiResponseToastAlert(
          response,
          this.resetForm,
          this.fetchDataGangguanDies()
        );
        // vm.$socket.emit("updateAcievement", this.line_id);
      });
    },
    onDone() {
      notificationStore.loading = true;
      const data = new FormData();
      data.append("part_number", this.job_number_actual);
      data.append("date", this.params.date);
      data.append("shift", this.params.shift);
      data.append("machine", this.mesin);
      data.append("urut", this.urut);
      data.append("machine_position", this.machine_position);
      const configHttp = {
        method: "post",
        url: `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/action_done`,
        data,
      };
      axios(configHttp).then((response) => {
        notificationStore.onApiResponseToastAlert(response, this.resetForm);
        if (this.act_sarana == 1) {
          this.fetchDataGangguanSarana();
        } else if (this.act_mesin == 1) {
          this.fetchDataGangguan();
        } else {
          this.fetchDataGangguanDies();
        }
        // vm.$socket.emit("updateAcievement", this.line_id);
      });
    },
  },
});
