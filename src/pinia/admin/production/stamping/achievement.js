import axios from "axios";
import { defineStore } from "pinia";
import { useConfigStore } from "@/pinia/config";
import { useNotificationStore } from "@/pinia/notification";
import { useAuthStore } from "@/pinia/auth";
import { useUtilityStore } from "@/pinia/utility";
import moment from "moment";
import CryptoJS from "crypto-js";

const configStore = useConfigStore();
const authStore = useAuthStore();
const notificationStore = useNotificationStore();
const utilityStore = useUtilityStore();
const date = utilityStore.getCurrentShift();

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
  jumlah_mesin: [],
  e_kanban: Array(15).fill([]),
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
  original_line: [],
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
  actual_progress_now: [],
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
  ket_idletime: [],
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
  reject_lh_shift1: [],
  reject_lh_shift2: [],
  reject_rh_shift1: [],
  reject_rh_shift2: [],
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
  zkbnfull_rh: [],
  zkbnwait_rh: [],
  ztotkbn_rh: [],
  ztotkbn_lh: [],
  ztotqty_rh: [],
  ztotqty_lh: [],
  zstatus: [],
  qty_pallet: [],
  type_pallet: [],
  zbehmg_rh: [],
  zbehmg_lh: [],
};
export const useStampingAchievementStore = defineStore({
  id: "production-stamping-achievement",
  state() {
    return {
      tag: "LKH-STP",
      is_done: "",
      hadir: "",
      izin: "",
      sakit: "",
      ganti_hari: "",
      context: null,
      line_id: "",
      patan: "",
      percentage_line: "",
      formDetail,
      formAttendance,
      apiUrl: configStore.apiUrl,
      permissions: {
        create: authStore.checkAccess("Production.Create.AchievementStamping"),
        update: authStore.checkAccess("Production.Update.AchievementStamping"),
        download: authStore.checkAccess("Report.Download.AchievementStamping"),
        pcd: authStore.checkAccess("Production.PCD.AchievementStamping"),
      },
      reportSAP: {
        datatables: {
          headers: [
            { title: "Date", align: "left", value: "date" },
            { title: "Shift", align: "left", value: "shift" },
            { title: "Patan", align: "left", value: "patan" },
            { title: "Line", align: "left", value: "line_id" },
            { title: "Urut", align: "left", value: "urutan" },
            { title: "Part RH", align: "left", value: "part_rh" },
            { title: "Part LH", align: "left", value: "part_lh" },
            {
              title: "Qty Plan RH",
              align: "left",
              value: "lot_rh",
            },
            {
              title: "Qty Plan LH",
              align: "left",
              value: "lot_lh",
            },
            {
              title: "Qty Finish Actual RH",
              align: "left",
              value: "total_lotsize_rh",
            },
            {
              title: "Qty Finish Actual LH",
              align: "left",
              value: "total_lotsize_lh",
            },
            {
              title: "Qty SAP RH",
              align: "left",
              value: "sap_rh",
            },
            {
              title: "Qty SAP LH",
              align: "left",
              value: "sap_lh",
            },
            {
              title: "SAP vs LKH (RH)",
              align: "left",
              value: "gap_rh",
            },
            {
              title: "SAP vs LKH (LH)",
              align: "left",
              value: "gap_lh",
            },
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
            lot_rh: [],
            lot_lh: [],
            sap_rh: [],
            sap_lh: [],
            act_rh: [],
            act_lh: [],
            total_sap: [],
            gap_rh: [],
            gap_lh: [],
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
      visibleColumns: [],
      report: {
        datatables: {
          headers: [
            { title: "Date", align: "left", value: "date" },
            { title: "Shift", align: "left", value: "shift" },
            { title: "Patan", align: "left", value: "additional_text" },
            { title: "Line", align: "left", value: "line_id" },
            { title: "Urut", align: "left", value: "urut" },
            { title: "Tandem", align: "right", value: "is_tandem_text" },
            { title: "Trial", align: "right", value: "is_trial_text" },
            { title: "Part RH", align: "left", value: "part_rh" },
            { title: "Part LH", align: "left", value: "part_lh" },
            {
              title: "Combination Process",
              align: "left",
              value: "combination",
            },
            { title: "Status Plan", align: "left", value: "status_plan" },
            { title: "Stroke Plan", align: "left", value: "stroke_plan" },
            {
              title: "Qty Finish Plan RH",
              align: "left",
              value: "lot_rh",
            },
            {
              title: "Qty Finish Plan LH",
              align: "left",
              value: "lot_lh",
            },
            { title: "TPT Plan", align: "left", value: "tpt" },
            { title: "Keterangan", align: "left", value: "keterangan" },
            { title: "Stroke Actual", align: "left", value: "stroke_act" },
            {
              title: "Qty OK RH",
              align: "left",
              value: "act_rh",
            },
            {
              title: "Qty OK LH",
              align: "left",
              value: "act_lh",
            },
            {
              title: "Repair RH",
              align: "left",
              value: "repair_rh",
            },
            {
              title: "Repair LH",
              align: "left",
              value: "repair_lh",
            },
            {
              title: "Keterangan Repair RH",
              align: "left",
              value: "ket_repair_rh",
            },
            {
              title: "Keterangan Repair LH",
              align: "left",
              value: "ket_repair_lh",
            },
            {
              title: "Reject RH",
              align: "left",
              value: "reject_rh",
            },
            {
              title: "Reject LH",
              align: "left",
              value: "reject_lh",
            },
            {
              title: "Keterangan Reject RH",
              align: "left",
              value: "ket_reject_rh",
            },
            {
              title: "Keterangan Reject LH",
              align: "left",
              value: "ket_reject_lh",
            },
            {
              title: "Qty Finish Actual RH",
              align: "left",
              value: "total_lotsize_rh",
            },
            {
              title: "Qty Finish Actual LH",
              align: "left",
              value: "total_lotsize_lh",
            },
            { title: "Status", align: "left", value: "status" },
            { title: "Idletime", align: "left", value: "idletime" },
            { title: "Dandori", align: "left", value: "dandori" },
            { title: "Down Time Machines", align: "left", value: "dt_machines" },
            { title: "Down Time Dies", align: "left", value: "dt_dies" },
            { title: "Down Time Other", align: "left", value: "dt_other" },
            {
              title: "Keterangan Down Time Machines",
              align: "left",
              value: "ket_dt_machines",
            },
            {
              title: "Keterangan Down Time Dies",
              align: "left",
              value: "ket_dt_dies",
            },
            {
              title: "Keterangan Down Time Other",
              align: "left",
              value: "ket_dt_other",
            },
            { title: "Total Down Time", align: "left", value: "dt_total" },
            { title: "TPT Actual", align: "left", value: "tpt_actual" },
            { title: "Finish Actual", align: "left", value: "finish_actual" },
            { title: "GSPH", align: "left", value: "gsph" },
            { title: "Keterangan Line", align: "left", value: "keterangan_all" },
            { title: "Tipe Palet", align: "left", value: "tipe_palet" },
            { title: "Act Palet", align: "left", value: "act_palet" },
            { title: "Total Standard", align: "left", value: "total_standard" },
            { title: "Total Hadir", align: "left", value: "total_present" },
            { title: "Total Izin", align: "left", value: "total_leave" },
            { title: "total Sakit", align: "left", value: "total_sick" },
          ],
          items: [],
          filters: {
            date: [],
            shift: [],
            additional_text: [],
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
            finish_actual: [],
            gsph: [],
            keterangan_all: [],
            tipe_palet: [],
            act_palet: [],
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
        // sorting
        sortKey: "",
        sortOrder: 'asc',
        // end sorting
      },
      reportSummary: {
        datatables: {
          headers: [
            { title: "Date", align: "left", value: "date" },
            { title: "Shift", align: "left", value: "shift" },
            { title: "Patan", align: "left", value: "patan" },
            { title: "Line", align: "left", value: "line_id" },
            { title: "Status Plan", align: "left", value: "status_plan" },
            { title: "GSPH Plan", align: "left", value: "gsph_plan" },
            { title: "GSPH Actual", align: "left", value: "gsph_actual" },
            { title: "Downtime Plan", align: "left", value: "downtime_plan" },
            {
              title: "Downtime Actual",
              align: "left",
              value: "downtime_actual",
            },
            { title: "Idle Time Plan", align: "left", value: "ideltime_plan" },
            {
              title: "Idle Time Actual",
              align: "left",
              value: "ideltime_actual",
            },
            { title: "Cycle Time Plan", align: "left", value: "cycletime_plan" },
            {
              title: "Cycle Time Actual",
              align: "left",
              value: "cycletime_actual",
            },
            { title: "Qty Plan", align: "left", value: "qty_plan" },
            { title: "Qty Actual", align: "left", value: "qty_actual" },
            { title: "Good Plan", align: "left", value: "good_plan" },
            { title: "Good Actual", align: "left", value: "good_actual" },
            { title: "Repair Plan", align: "left", value: "repair_plan" },
            { title: "Repair Actual", align: "left", value: "repair_actual" },
            { title: "Reject Plan", align: "left", value: "reject_plan" },
            { title: "Reject Actual", align: "left", value: "reject_actual" },
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
            { title: "Date", align: "left", value: "date" },
            { title: "Shift", align: "left", value: "shift" },
            { title: "Patan", align: "left", value: "patan" },
            { title: "Line", align: "left", value: "line_id" },
            { title: "Machine", align: "left", value: "machine" },
            {
              title: "Job Number Actual",
              align: "left",
              value: "job_number_actual",
            },
            { title: "Process", align: "left", value: "process" },
            { title: "Qty Plan", align: "left", value: "lotsize" },
            { title: "Qty Actual", align: "left", value: "qty_actual" },
            { title: "Dandori", align: "left", value: "dandori" },
            { title: "TPT", align: "left", value: "tpt" },
            { title: "Gangguan Sarana", align: "left", value: "g_sarana" },
            { title: "Gangguan Bahan", align: "left", value: "g_bahan" },
            { title: "Gangguan Dies", align: "left", value: "g_dies" },
            { title: "Gangguan Machine", align: "left", value: "g_machine" },
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
            dandori: [],
            tpt: [],
            g_sarana: [],
            g_bahan: [],
            g_dies: [],
            g_machine: [],
          },
        },
        // filter: {
        //   dates: [ null, null
        //     // new Date(Date.now() - new Date().getTimezoneOffset() * 60000),
        //     // new Date(Date.now() - new Date().getTimezoneOffset() * 60000),
        //   ],
        // },
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
        template: false,
        formLed: false,
        formKetRepair: false,
        formKetDT: false,
        confirmDelete: false,
        formKanban: false,
        formStartLed: false,
        formTag: false,
        addLine: false,
        sync: false,
        menuLine: false,
        detailPatan: false,
        kanbanFull: false,
      },
      partItems: [],
      lines: [],
      keterangan: [],
      table_machine: {
        items: [],
      },
      table_next: {
        items: [],
        detail: [],
      },
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
          "80T",
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
          "150T-8",
          "150T-9",
          "150T-10",
          "150T-11",
          "150T-12",
          "300T-1",
          "300T-2",
          "G1",
          "G2",
          "G3",
          "G4",
          "H1",
          "H2",
          "H3",
          "H4",
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
        palet: [
          "C",
          "D",
          "D2",
          "Gantung",
          "WBD",
          "Skid Kayu",
          "Skid Besi",
          "Poly Box",
        ],
      },
      statusList: ["WIP", "FP", "BL"],
      keteranganList: [
        "Revisi Plan",
        "Cancel Plan",
        "Switch Item",
        "Prioritas",
        "Service Part",
        "Buffer",
        "Delay Material",
        "Delay Dies",
        "Delay WIP",
        "Delay BL",
        "Kombinasi Item",
        "Delay Kanban",
      ],
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
      keteranganAllList: [
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
        "R/M Kurang di jalur",
        "R/M Kurang dr IRM",
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
        "TPT Plan >10/11 Jam",
        "Add SO",
        "Tambah Lotsize",
        "Balancing Qty Tandem",
        "Stop ada part urgent",
        "Revisi Plan",
        "Cancel Plan",
        "Switch Item",
        "R/M Kosong",
        "Service Part",
        "Buffer",
        "WIP Kosong",
        "BL Kosong",
        "Dies repair MTC",
        "Problem Raw Material",
      ],
      statusDelivery: ["On Schedule", "Advance"],
      combinationProcess: ["5 - 0", "4 - 0", "3 - 0", "2 - 0", "1 - 0"],
      planProcess: ["1", "2", "3", "4", "5", "6", "7"],
      totalProcess: ["1", "2", "3", "4", "5", "6"],
      addList: ["Add", "A", "B", "C", "D", "R1", "LJ", "TP"],
      listShift: [1, 2],
      listLine: ["A, B, C, E", "D, F, G, H", "300T, SP"],
      listAllLine: ["A", "B", "C", "D", "E", "F", "G", "H", "300T", "SP"],
      listKategori_dt: ["Dies", "Machine", "Other"],
      params: utilityStore.getCurrentShift(),
      shiftNow: utilityStore.getShiftNow(),
      view: false,
      machine: "",
      statusForm: "",
      order: 1,
      part_number_rh: "",
      kategori_dt: "",
      part_number_lh: "",
      lot_size_rh: "",
      lot_size_lh: "",
      urut: "",
      graph: [],
      dataMachine: [],
      dataLastMachine: [],
      gsph_plan: "",
      filterDate: {
        date: date.date,
        shift: date.shift,
      },
      formData: {
        machine: "",
        process: "",
      },
      formTagOK: {
        qty_kbn: "",
        part_number: "",
        lotsize_actual: "",
        date: "",
        shift: 1,
      },
      formScan: {
        id_kanban: "",
      },
      formKanbanFull: {
        part_number_rh: "",
        part_number_lh: "",
        total_kanban: "",
        qty_ok: "",
        dIndex: "",
      },
      form: {
        period: new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
          .toISOString()
          .substr(0, 7),
      },
      table_tag: [],
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
      this.formData.machine = "";
      this.formData.process = "";
      this.dialog.formTag = false;
      this.dialog.addLine = false;
    },
    refreshForm(line) {
      this.fetchDataLineByID(line);
    },
    filterMachineLine() {
      // if (this.line_id.toUpperCase() === "SP") {
      //   return [
      //     "80T",
      //     "110T-1",
      //     "110T-2",
      //     "110T-3",
      //     "110T-4",
      //     "150T-1",
      //     "150T-2",
      //     "150T-3",
      //     "150T-4",
      //     "150T-5",
      //     "150T-6",
      //     "150T-7",
      //     "150T-8",
      //     "150T-9",
      //     "150T-10",
      //     "150T-11",
      //     "150T-12"
      //   ];
      // } else {
      //   return this.list.machine.filter((d) =>
      //     d.toUpperCase().includes(this.line_id.toUpperCase())
      //   );
      // }
      return this.list.machine;
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

    fetchDataPart() {
      notificationStore.loading = true;
      return axios
        .get(
          // `http://${configStore.apiUrl}/majsf_rest_api/api/master/part`
          'http://localhost/majsf_rest_api/api/master/part'
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
    fetchDataMachine() {
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
    fetchlastDataMachine() {
      const data = new FormData();
      data.append("machine", this.machine);
      axios
        .post(
          `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/report_machine_last`,
          // `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/report_machine_last`,
          data
        )
        .then((response) => {
          if (response.status === 200) {
            this.dataLastMachine = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },
    fetchPlanningGSPH() {
      axios
        .post(
          `http://192.168.10.67/majsf_rest_api/api/inventory-achievement/fetch_planning_gsph`,
          { parameter: this.dataLastMachine[0] }, // Kirim sebagai JSON
          { headers: { "Content-Type": "application/json" } } // Set header JSON
        )
        .then((response) => {
          if (response.status === 200) {
            this.gsph_plan = response.data.gsph_plan;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },
    fetchDataRunningText() {
      const date = this.params.date;
      const shift = this.params.shift;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/running-text?shift=${shift}&date=${date}`
        )
        .then((response) => {
          if (response.status === 200) {
            this.table_machine.items = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },
    counterDataMachine(waktu) {
      const data = new FormData();
      data.append("machine", this.machine);
      data.append("qty", waktu);
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
      let filtered = this.report.datatables.items.filter((d) => {
        return Object.keys(this.report.datatables.filters).every((f) => {
          return (
            this.report.datatables.filters[f].length < 1 ||
            d[f]
              .toLowerCase()
              .includes(this.report.datatables.filters[f].toLowerCase())
          )
        })
      })

      const key = this.report.sortKey;
      const order = this.report.sortOrder;

      if (key) {
        filtered.sort((a, b) => {
          const aVal = a[key] ?? "";
          const bVal = b[key] ?? "";

          // ✅ Numeric-safe comparison
          const isNumber = !isNaN(aVal) && !isNaN(bVal);
          if (isNumber) {
            return order === "asc" ? aVal - bVal : bVal - aVal;
          }

          // ✅ String comparison fallback
          if (aVal < bVal) return order === "asc" ? -1 : 1;
          if (aVal > bVal) return order === "asc" ? 1 : -1;
          return 0;
        });
      }
      
      // console.log("Filtered Items:", filtered);
      return filtered;
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
    filteredItemsSap() {
      return this.reportSAP.datatables.items.filter((d) => {
        return Object.keys(this.reportSAP.datatables.filters).every((f) => {
          return (
            this.reportSAP.datatables.filters[f].length < 1 ||
            d[f]
              .toLowerCase()
              .includes(this.reportSAP.datatables.filters[f].toLowerCase())
          );
        });
      });
    },
    fetchDataLine(type) {
      if (!type) {
        notificationStore.loading = true;
      }
      console.log("Fetching lines with params:", this.params);
      console.time("AXIOS REQUEST TIME");
      return axios
        .get(
          // `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/achievement`,
          'http://192.168.10.67/majsf_rest_api/api/inventory-achievement/achievement',
          { params: this.params }
        )
        .then((response) => {
          console.timeEnd("AXIOS REQUEST TIME");
          // console.log("Response from backend:", response.data);
          if (response.status === 200) {
            if (response.data.status) {
              console.time("HEAVY CALCULATION LOOP");
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
                        : "";
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
                  dt_material += parseFloat(
                    item.dt_material ? item.dt_material : 0
                  );
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
                data.total_dt_material = dt_material;
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
              console.timeEnd("HEAVY CALCULATION LOOP");
            } else {
              utilityStore.onApiResponse(response);
              this.lines = response.data.data;
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
    fetchDataLineSummary(id) {
      notificationStore.loading = true;
      this.params.line = id;
      axios
        .get(
          // `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/achievement_v2`,
          `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/achievement_v2`,
          { params: this.params }
        )
        .then((response) => {
          if (response.status === 200) {
            if (response.data.status) {
              this.lines = response.data.data.map((data) => {
                let patan = "";
                let downtime = 0;
                let idletime = 0;
                let repair = 0;
                let reject = 0;
                let qty_actual = 0;
                let qty_plan = 0;
                let stroke = 0;
                let stroke_current = 0;
                let stroke_act = 0;
                let tpt = 0;
                let tpt_current = 0;
                let tpt_actual = 0;
                let stroke_actual = 0;
                let lot_rh = 0;
                let lot_lh = 0;
                let lot_curr_rh = 0;
                let lot_curr_lh = 0;
                let act_rh = 0;
                let act_lh = 0;
                let dandori = 0;
                let dandori_plan = 0;
                let dt_machines = 0;
                let dt_dies = 0;
                let dt_other = 0;
                let dt_material = 0;
                let total_repair = 0;
                let total_reject = 0;
                let total_stroke_actual = 0;
                let part_rh = 0;
                let current_stroke = 0;
                let current_gsph_avg = 0;
                // let actual_gsph = 0;
                let gsph_act_1 = 0;
                let gsph_act_4 = 0;
                let gsph_act_3 = 0;
                let gsph_act_2 = 0;
                let gsph_act_17 = 0;
                let current_job = "";
                let actual_job = 0;
                let coba = "";
                let act_s = "";
                let indexjobact = 0;
                let indexJobPlan = 1;
                let indexJobCurrent = 0;
                let actual_stroke = 0;
                let gsph_plan_avg = 0;
                // let gsph_actual = 0;
                let gsph_current_avg = 0;
                let current_rh = 0;
                let cur_rh = 0;
                let current_lh = 0;
                let cur_lh = 0;
                let curr_dandori = 0;
                let dandori_now = 0;
                // let gsph = 0;
                let gsph_plan = 0;
                let gsph_current = 0;
                let indexCurrent = 0;
                let curr_index = 0;
                let gsph_total_plan_1 = 0;
                let gsph_total_plan_4 = 0;
                let gsph_total_plan_2 = 0;
                let gsph_total_plan_17 = 0;
                let gsph_1 = 0;
                let gsph_4 = 0;
                let gsph_2 = 0;
                let gsph_3 = 0;
                let gsph_17 = 0;
                let gsph_plan_1 = 0;
                let gsph_plan_4 = 0;
                let gsph_plan_3 = 0;
                let gsph_plan_2 = 0;
                let gsph_plan_17 = 0;
                let total_stroke_act = 0;
                let total_pembagi_repair = 0;
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

                data.detail = data.detail.map((item) => {
                  if (item.part_rh) {
                    downtime += parseFloat(item.downtime ? item.downtime : 0);
                    repair += parseFloat(item.repair ? item.repair : 0);
                    reject += parseFloat(item.reject ? item.reject : 0);
                    qty_actual += parseFloat(
                      item.qty_actual ? item.qty_actual : 0
                    );
                    if (item.is_tandem == "0") {
                      // if (item.is_trial == "0") {
                      //   idletime += parseFloat(
                      //     item.idletime ? item.idletime : ""
                      //   );
                      // }
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
                        : "";
                    }
                  }
                  stroke += parseInt(
                    item.stroke_plan && item.keterangan !== "Cancel Plan"
                      ? item.stroke_plan
                      : 0
                  );
                  stroke_current += parseInt(
                    (item.act_rh > 0 && item.keterangan !== "Cancel Plan") ||
                      item.repair_rh > 0 ||
                      item.reject_rh > 0
                      ? item.stroke_plan
                      : 0
                  );
                  stroke_act += parseInt(item.stroke_act ? item.stroke_act : 0);
                  tpt += parseFloat(
                    item.tpt && item.is_tandem == false ? item.tpt : 0
                  );
                  tpt_current += parseFloat(
                    (item.act_rh > 0 ||
                      item.repair_rh > 0 ||
                      item.reject_rh > 0) &&
                      item.is_tandem == "0"
                      ? item.tpt
                      : 0
                  );
                  tpt_actual += parseFloat(
                    (item.act_rh > 0 ||
                      item.repair_rh > 0 ||
                      item.reject_rh > 0) &&
                      item.is_tandem == "0"
                      ? item.tpt_actual
                      : 0
                  );
                  idletime += parseInt(item.idletime ? item.idletime : 0);
                  stroke_actual = item.act_rh
                    ? parseInt(item.act_rh) * parseInt(item.act_process)
                    : 0;
                  total_stroke_actual = parseFloat(
                    item.act_rh || item.repair_rh || item.reject_rh
                      ? (parseInt(item.act_rh) +
                          parseInt(item.repair_rh) +
                          parseInt(item.reject_rh)) *
                          parseInt(item.act_process)
                      : 0
                  );
                  item.stroke_actual = stroke_actual;
                  lot_rh += parseFloat(
                    item.lot_rh && item.keterangan !== "Cancel Plan"
                      ? item.lot_rh
                      : 0
                  );
                  lot_lh += parseFloat(
                    item.lot_lh && item.keterangan !== "Cancel Plan"
                      ? item.lot_lh
                      : 0
                  );
                  lot_curr_rh += parseFloat(
                    item.act_rh > 0 ||
                      item.repair_rh > 0 ||
                      (item.reject_rh > 0 && item.keterangan !== "Cancel Plan")
                      ? item.lot_rh
                      : 0
                  );
                  lot_curr_lh += parseFloat(
                    item.act_lh > 0 ||
                      item.repair_lh > 0 ||
                      (item.reject_lh > 0 && item.keterangan !== "Cancel Plan")
                      ? item.lot_lh
                      : 0
                  );
                  act_rh += parseFloat(item.act_rh ? item.act_rh : 0);
                  act_lh += parseFloat(item.act_lh ? item.act_lh : 0);
                  dandori += parseFloat(
                    item.dandori && item.is_tandem !== "1" ? item.dandori : 0
                  );
                  dandori_plan += parseFloat(
                    item.lot_rh && item.keterangan !== "Cancel Plan"
                      ? item.dandori_plan
                      : 0
                  );
                  dt_machines += parseFloat(
                    item.dt_machines ? item.dt_machines : 0
                  );
                  dt_dies += parseFloat(item.dt_dies ? item.dt_dies : 0);
                  dt_other += parseFloat(item.dt_other ? item.dt_other : 0);
                  dt_material += parseFloat(
                    item.dt_material ? item.dt_material : 0
                  );
                  // gsph += parseFloat(
                  //   item.act_rh &&
                  //     item.is_running !== "1" && item.tpt_actual
                  //     ? (item.stroke_act /
                  //         (item.act_process *
                  //           (item.tpt_actual - item.idletime))) *
                  //         60
                  //     : 0
                  // );

                  gsph_plan += parseFloat(
                    item.act_rh > 0 ||
                      item.repair_rh > 0 ||
                      (item.reject_rh > 0 && item.gsph_plan)
                      ? item.gsph_plan
                      : 0
                  );
                  gsph_current +=
                    item.act_rh &&
                    item.is_tandem !== "1" &&
                    item.is_running !== "1"
                      ? parseFloat(item.gsph_plan ? item.gsph_plan : 0)
                      : 0;

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

                  total_pembagi_repair += parseFloat(
                    item.status == "FP"
                      ? parseInt(item.act_rh) +
                          parseInt(item.act_lh) +
                          parseInt(item.repair_rh) +
                          parseInt(item.repair_lh)
                      : 0
                  );

                  item.total_gsph =
                    (item.stroke_actual /
                      (item.value_combination * item.tpt_actual)) *
                    60;
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
                  // Mencari Current Stroke
                  current_stroke =
                    (item.act_rh > 0 && item.keterangan !== "Cancel Plan") ||
                    item.repair_rh > 0 ||
                    item.reject_rh > 0
                      ? stroke_current
                      : "-";
                  if (current_stroke !== "-") {
                    coba = current_stroke;
                  }
                  actual_stroke =
                    (item.act_rh > 0 && item.keterangan !== "Cancel Plan") ||
                    item.repair_rh > 0 ||
                    item.reject_rh > 0
                      ? stroke_act
                      : "-";
                  if (actual_stroke !== "-") {
                    act_s = stroke_act;
                  }
                  curr_index =
                    item.act_rh > 0 ||
                    item.repair_rh ||
                    (item.reject_rh > 0 && item.is_tandem !== "1")
                      ? indexCurrent++
                      : "-";
                  if (curr_index !== "-") {
                    curr_index = indexCurrent;
                  }

                  gsph_plan_avg = gsph_plan;

                  //Mencari Current GSPH
                  current_gsph_avg =
                    item.act_rh > 0 ||
                    item.repair_rh > 0 ||
                    (item.reject_rh > 0 && item.keterangan !== "Cancel Plan")
                      ? gsph_current
                      : "-";
                  if (current_gsph_avg !== "-") {
                    gsph_current_avg = current_gsph_avg;
                  }

                  //Mencari Total Current job
                  // console.log;
                  current_job =
                    item.act_rh > 0 ||
                    item.repair_rh > 0 ||
                    (item.reject_rh > 0 && item.keterangan !== "Cancel Plan")
                      ? indexJobCurrent++
                      : "-";
                  if (current_job !== "-") {
                    current_job = indexJobCurrent;
                  }

                  //Mencari Total actual job
                  actual_job =
                    item.act_rh > 0 || item.repair_rh > 0 || item.reject_rh > 0
                      ? item.part_rh
                      : "-";
                  if (actual_job !== "-") {
                    indexjobact++;
                  }

                  // Total Plan job number
                  part_rh =
                    item.part_rh && item.keterangan !== "Cancel Plan"
                      ? indexJobPlan++
                      : indexJobPlan - 1;

                  gsph_total_plan_1 = (stroke / tpt / 1) * 60;
                  gsph_total_plan_4 = (stroke / tpt / 4) * 60;
                  gsph_total_plan_2 = (stroke / tpt / 2) * 60;
                  gsph_total_plan_17 = (stroke / tpt / 17) * 60;
                  // Gsph actual dibagi dengan jumlah item dari awal hingga sekarang
                  gsph_1 = (stroke_current / tpt_current / 1) * 60;
                  gsph_1 = item.tpt_actual > 0 ? gsph_1 : "-";
                  if (gsph_1 !== "-") {
                    gsph_plan_1 =
                      isFinite(gsph_1) == false ? gsph_plan : gsph_1;
                  }
                  gsph_4 = (stroke_current / tpt_current / 4) * 60;
                  gsph_4 = item.tpt_actual > 0 ? gsph_4 : "-";
                  if (gsph_4 !== "-") {
                    gsph_plan_4 =
                      isFinite(gsph_4) == false &&
                      (item.act_rh > 0 ||
                        item.repair_rh > 0 ||
                        item.reject_rh > 0) &&
                      item.is_tandem == "0"
                        ? gsph_plan
                        : gsph_4;
                  }

                  gsph_2 = (stroke_current / tpt_current / 2) * 60;
                  gsph_2 = item.tpt_actual > 0 ? gsph_2 : "-";
                  if (gsph_2 !== "-") {
                    gsph_plan_2 =
                      isFinite(gsph_2) == false &&
                      (item.act_rh > 0 ||
                        item.repair_rh > 0 ||
                        item.reject_rh > 0) &&
                      item.is_tandem == "0"
                        ? gsph_plan
                        : gsph_2;
                  }
                  gsph_17 = (stroke_current / tpt_current / 17) * 60;
                  gsph_17 = item.tpt_actual > 0 ? gsph_17 : "-";
                  if (gsph_17 !== "-") {
                    gsph_plan_17 =
                      isFinite(gsph_17) == false &&
                      (item.act_rh > 0 ||
                        item.repair_rh > 0 ||
                        item.reject_rh > 0) &&
                      item.is_tandem == "0"
                        ? gsph_plan
                        : gsph_17;
                  }

                  gsph_3 = (stroke_current / tpt_current / 3) * 60;
                  gsph_3 = item.tpt_actual > 0 ? gsph_3 : "-";
                  if (gsph_3 !== "-") {
                    gsph_plan_3 =
                      isFinite(gsph_3) == false ? gsph_plan : gsph_3;
                  }

                  gsph_1 =
                    tpt_actual > 0
                      ? (stroke_act / (tpt_actual - idletime) / 1) * 60
                      : 0;
                  gsph_1 =
                    item.act_rh > 0 ||
                    item.repair_rh > 0 ||
                    (item.reject_rh > 0 && item.tpt_actual > 0)
                      ? gsph_1
                      : "-";
                  if (gsph_1 !== "-") {
                    gsph_act_1 = gsph_1;
                  }

                  gsph_4 =
                    tpt_actual > 0
                      ? (stroke_act / (tpt_actual - idletime) / 4) * 60
                      : 0;
                  gsph_4 =
                    item.act_rh > 0 ||
                    item.repair_rh > 0 ||
                    (item.reject_rh > 0 && item.tpt_actual > 0)
                      ? gsph_4
                      : "-";
                  if (gsph_4 !== "-") {
                    gsph_act_4 = gsph_4;
                  }

                  gsph_2 =
                    tpt_actual > 0
                      ? (stroke_act / (tpt_actual - idletime) / 2) * 60
                      : 0;
                  gsph_2 =
                    item.act_rh > 0 ||
                    item.repair_rh > 0 ||
                    (item.reject_rh > 0 && item.tpt_actual > 0)
                      ? gsph_2
                      : "-";
                  if (gsph_2 !== "-") {
                    gsph_act_2 = gsph_2;
                  }

                  gsph_3 =
                    tpt_actual > 0
                      ? (stroke_act / (tpt_actual - idletime) / 3) * 60
                      : 0;
                  gsph_3 =
                    item.act_rh > 0 ||
                    item.repair_rh > 0 ||
                    (item.reject_rh > 0 && item.tpt_actual > 0)
                      ? gsph_3
                      : "-";
                  if (gsph_3 !== "-") {
                    gsph_act_3 = gsph_3;
                  }

                  gsph_17 =
                    tpt_actual > 0
                      ? (stroke_act / (tpt_actual - idletime) / 17) * 60
                      : 0;
                  gsph_17 =
                    item.act_rh > 0 ||
                    item.repair_rh > 0 ||
                    (item.reject_rh > 0 && item.tpt_actual > 0)
                      ? gsph_17
                      : "-";
                  if (gsph_17 !== "-") {
                    gsph_act_17 = gsph_17;
                  }

                  total_stroke_actual =
                    item.act_rh > 0 || item.repair_rh > 0 || item.reject_rh > 0
                      ? total_stroke_actual
                      : "-";
                  if (total_stroke_actual !== "-") {
                    total_stroke_act = total_stroke_actual;
                  }

                  current_rh =
                    item.act_rh > 0 || item.repair_rh > 0 || item.reject_rh > 0
                      ? lot_curr_rh
                      : "-";
                  if (current_rh !== "-") {
                    cur_rh = current_rh;
                  }

                  current_lh =
                    item.act_lh > 0 || item.repair_lh > 0 || item.reject_lh > 0
                      ? lot_curr_lh
                      : "-";
                  if (current_lh !== "-") {
                    cur_lh = current_lh;
                  }

                  current_lh = item.act_lh > 0 ? lot_curr_lh : "-";
                  if (current_lh !== "-") {
                    cur_lh = current_lh;
                  }

                  curr_dandori =
                    item.act_rh > 0 || item.repair_rh > 0 || item.reject_rh > 0
                      ? dandori_plan
                      : "-";
                  if (curr_dandori !== "-") {
                    dandori_now = curr_dandori;
                  }
                  patan = item.patan;
                  return item;
                });
                data.patan = patan;
                data.job_current = indexJobCurrent;
                data.gsph_current_avg = gsph_current_avg;
                data.gsph_plan_avg = gsph_plan_avg;
                data.gsph_all_1 = gsph_total_plan_1;
                data.gsph_all_4 = gsph_total_plan_4;
                data.gsph_all_2 = gsph_total_plan_2;
                data.gsph_all_17 = gsph_total_plan_17;
                data.gsph_current_1 = gsph_plan_1;
                data.gsph_current_4 =
                  gsph_plan_4 == Number.POSITIVE_INFINITY ? 0 : gsph_plan_4;
                data.gsph_current_2 =
                  gsph_plan_2 == Number.POSITIVE_INFINITY ? 0 : gsph_plan_2;
                data.gsph_current_3 = gsph_plan_3;
                data.gsph_current_17 =
                  gsph_plan_17 == Number.POSITIVE_INFINITY ? 0 : gsph_plan_17;
                data.gsph_actual_1 = gsph_act_1;
                data.gsph_actual_4 =
                  gsph_act_4 == Number.POSITIVE_INFINITY ? 0 : gsph_act_4;
                data.gsph_actual_2 =
                  gsph_act_2 == Number.POSITIVE_INFINITY ? 0 : gsph_act_2;
                data.gsph_actual_3 = gsph_act_3;
                data.gsph_actual_17 =
                  gsph_act_17 == Number.POSITIVE_INFINITY ? 0 : gsph_act_17;
                data.ttl_stroke_plan = stroke;
                data.stroke_current = coba;
                data.stroke_actual = act_s;
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
                data.total_stroke_actual = total_stroke_act;
                data.total_act_rh = act_rh;
                data.total_act_lh = act_lh;
                data.total_dandori = dandori;
                data.total_dandori_plan = dandori_plan;
                data.total_dt_machines = dt_machines;
                data.total_dt_dies = dt_dies;
                data.total_dt_other = dt_other;
                data.total_dt_material = dt_material;
                data.total_dt_direksi = dt_dies + dt_machines + dt_material;
                data.total_dt = dt_other + dt_dies + dt_machines + dt_material;
                data.ok_persen =
                  (parseInt(data.qty_ok) /
                    (parseInt(act_rh) + parseInt(act_lh))) *
                  100;

                data.repair_persen =
                  (parseInt(total_repair) /
                    (parseInt(act_rh) +
                      parseInt(act_lh) +
                      parseInt(total_pembagi_repair))) *
                  100;
                data.total_pembagi_reject =
                  act_rh || total_repair || total_reject
                    ? act_rh + act_lh + total_repair + total_reject
                    : 0;
                data.reject_persen =
                  (parseInt(total_reject) /
                    parseInt(data.total_pembagi_reject)) *
                  100;
                data.gsph_plan = (stroke / (tpt - 0) / 4) * 60;
                data.job_plan = part_rh;
                data.job_actual = indexjobact;

                data.lot_size = lot_rh + lot_lh;
                data.lot_current = cur_rh + cur_lh;
                data.act_pcs = act_rh + act_lh + total_repair + total_reject;
                data.current_dandori = dandori_now;

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
        this.dialog.datePicker = false;
      }, 500);
    },
    fetchDataKeterangan(line, tipe) {
      notificationStore.loading = true;
      this.params.line = line;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/achievement_keterangan?tipe=${tipe}`,
          { params: this.params }
        )
        .then((response) => {
          if (response.data.status === false) {
            utilityStore.onApiResponse(response);
          } else {
            notificationStore.loading = false;
            this.keterangan = response.data;
            if (tipe == "repair") {
              this.dialog.formKetRepair = true;
            } else if (tipe == "reject") {
              this.dialog.formKetReject = true;
            } else if (tipe == "dies") {
              this.dialog.formKetDT = true;
            } else if (tipe == "machine") {
              this.dialog.formKetDTMC = true;
            } else if (tipe == "other") {
              this.dialog.formKetDTOth = true;
            } else if (tipe == "material") {
              this.dialog.formKetDTMat = true;
            }
          }
        })
        .catch(utilityStore.onError);
    },
    fetchDataLineforSAP() {
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/achievement_sap`,
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
            configStore.page.name = `Achievement Stamping Compare with SAP (${utilityStore.formatDate(
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
          // `http://${configStore.apiUrl}/majsf_rest_api/index.php/api/inventory-achievement/report`,
          `http://192.168.10.67/majsf_rest_api/index.php/api/inventory-achievement/report`,
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
    fetchDataReportSAP() {
      notificationStore.loading = true;
      const data = new FormData();
      data.append("start", this.reportSAP.filter.dates[0]);
      data.append(
        "end",
        this.reportSAP.filter.dates[1] ?? this.reportSAP.filter.dates[0]
      );
      axios
        .post(
          `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/report_sap`,
          data
        )
        .then((response) => {
          if (response.status === 200) {
            this.reportSAP.datatables.items = response.data;
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
      notificationStore.loading = true;
      axios
        .get(
          // `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/display?line=${id}`
          `http://192.168.10.67/majsf_rest_api/api/inventory-achievement/display?line=${id}`
        )
        .then((response) => {
          if (response.status === 200) {
            if (response.data.status) {
              this.loadDataDetailEdit(response.data.data);
              setTimeout(() => {
                notificationStore.disableResponse();
              }, 3000);
            } else {
              utilityStore.onApiResponse(response);
            }
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        });
    },
    fetchDataLineByMachine(id) {
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
            // notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        });
    },
    fetchDataLineIDUnion(id) {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/display_union?line=${id}`
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
    fetchDataLineAll() {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/display`
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
    fetchDataLineByIDSAP(id) {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/display_sap?line=${id}`,
          { params: this.params }
        )
        .then((response) => {
          if (response.status === 200) {
            if (response.data.status) {
              this.loadDataDetailEdit(response.data.data);
              this.dialog.filter = false;
            } else {
              utilityStore.onApiResponse(response);
            }
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        });
    },

    fetchDataSAP() {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/sync_sap`,
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

    fetchDataLineByIDDireksi(id, status) {
      notificationStore.loading = status;
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
    fetchDataLineRefresh(id, date) {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/display_refresh?line=${id}&date=${date}`,
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
        data.append("hadir", this.hadir);
      }
      if (this.izin !== "") {
        data.append("izin", this.izin);
      }
      if (this.sakit !== "") {
        data.append("sakit", this.sakit);
      }
      if (this.ganti_hari !== "") {
        data.append("ganti_hari", this.ganti_hari);
      }
      const configHttp = {
        method: "post",
        url: 'http://localhost/majsf_rest_api/api/inventory-achievement/achievement',
        //`http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/achievement`,
        headers: {
          "Content-Type": "multipart/form-data",
        },
        data,
      };
      axios(configHttp)
        .then((response) => {
          utilityStore.onApiResponse(response);
          if (this.params.date == this.shiftNow.date) {
            this.refreshForm(this.line_id);
          } else {
            this.fetchDataLine();
          }
          if (response.data.additional_info) {
            notificationStore.onApiResponseToastAlertAdditional(response);
          }
          vm.$socket?.emit("updateAcievement", this.line_id);
        })
        .catch(utilityStore.onError);
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
      data.append("is_done", this.is_done);
      const configHttp = {
        method: "post",
        url: `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/achievement_sap`,
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
        url: //`http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/achievement`
        'http://localhost/majsf_rest_api/api/inventory-achievement/achievement',
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
    countDataActual() {
      let qty_actual = 0;
      let qty_plan = 0;
      let total_repair = 0;
      let total_reject = 0;
      var array = [];
      var trial = [];
      var act_rh_trial = [];
      var act_lh_trial = [];
      let total_std_item = [];
      let total_act_item = [];
      let total_std_qty = [];
      let total_act_qty = [];
      let total_plan_tpt = [];
      let total_act_tpt = [];
      let lastPlanHour = [];
      let lastActHour = [];
      let total_item = [];
      let patan_additional = [];
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
            (this.formDetail.repair_rh[index] > 1 ||
              this.formDetail.reject_rh[index] > 1 ||
              this.formDetail.act_rh[index] > 1) &&
            this.formDetail.is_tandem[index] == false
              ? this.formDetail.tpt_actual[index]
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
              ? this.formDetail.act_rh[index]
              : 0;

          act_rh_trial.push(this.formDetail.hasil_act_rh);

          this.formDetail.hasil_act_lh =
            this.formDetail.is_trial[index] == false
              ? this.formDetail.act_lh[index]
              : 0;

          act_lh_trial.push(this.formDetail.hasil_act_lh);

          this.formDetail.finish_actual[index] =
            this.formDetail.tpt_actual[index] !== "0"
              ? current_actual.format("HH : mm")
              : "";
          this.formDetail.finish_machine[index] = this.formDetail.tpt_machine[
            index
          ]
            ? currentMachine.format("HH : mm")
            : "";
        }

        this.formDetail.total_lotsize_rh[index] =
          this.formDetail.act_rh[index] ||
          this.formDetail.repair_rh[index] ||
          this.formDetail.reject_rh[index]
            ? parseInt(this.formDetail.act_rh[index]) +
              parseInt(this.formDetail.repair_rh[index]) +
              parseInt(this.formDetail.reject_rh[index])
            : 0;

        this.formDetail.total_lotsize_lh[index] =
          this.formDetail.act_lh[index] ||
          this.formDetail.repair_lh[index] ||
          this.formDetail.reject_lh[index]
            ? parseInt(this.formDetail.act_lh[index]) +
              parseInt(this.formDetail.repair_lh[index]) +
              parseInt(this.formDetail.reject_lh[index])
            : 0;

        this.formDetail.accum_lotsize_rh =
          this.formDetail.total_lotsize_rh.reduce(
            (a, b) => Number(a) + Number(b),
            0
          );

        this.formDetail.accum_lotsize_lh =
          this.formDetail.total_lotsize_lh.reduce(
            (a, b) => Number(a) + Number(b),
            0
          );

        // Total pembagi repair
        this.formDetail.pembagi_repair[index] =
          this.formDetail.status[index] == "FP"
            ? parseInt(this.formDetail.act_rh[index]) +
              parseInt(this.formDetail.act_lh[index]) +
              parseInt(this.formDetail.repair_rh[index]) +
              parseInt(this.formDetail.repair_lh[index])
            : 0;

        this.formDetail.total_pembagi_repair =
          this.formDetail.pembagi_repair.reduce(
            (a, b) => Number(a) + Number(b),
            0
          );

        // Total pembagi reject
        this.formDetail.pembagi_reject[index] = this.formDetail
          .total_lotsize_rh[index]
          ? parseInt(this.formDetail.total_lotsize_rh[index]) +
            parseInt(this.formDetail.total_lotsize_lh[index])
          : 0;

        this.formDetail.total_pembagi_reject =
          this.formDetail.pembagi_reject.reduce(
            (a, b) => Number(a) + Number(b),
            0
          );

        this.formDetail.stroke_plan[index] =
          this.formDetail.lot_rh[index] *
          this.formDetail.value_combination[index];

        this.formDetail.stroke_act[index] = this.formDetail.total_lotsize_rh[
          index
        ]
          ? this.formDetail.total_lotsize_rh[index] *
            this.formDetail.act_process[index]
          : 0;

        this.formDetail.stroke_machine[index] = this.formDetail
          .qty_actual_machine[index]
          ? this.formDetail.qty_actual_machine[index] *
            this.formDetail.act_process[index]
          : 0;

        this.formDetail.total_dt[index] =
          parseInt(this.formDetail.dt_machines[index]) +
          parseInt(this.formDetail.dt_dies[index]) +
          parseInt(this.formDetail.dt_other[index]) +
          parseInt(this.formDetail.dt_material[index]);

        this.formDetail.gsph[index] =
          this.formDetail.stroke_act[index] &&
          this.formDetail.tpt_actual[index] > 0
            ? (parseInt(this.formDetail.stroke_act[index]) /
                (parseInt(this.formDetail.act_process[index]) *
                  (parseInt(this.formDetail.tpt_actual[index]) -
                    parseInt(this.formDetail.idletime[index])))) *
              60
            : "";
        this.formDetail.gsph_machine[index] =
          (parseInt(this.formDetail.stroke_machine[index]) /
            (parseInt(this.formDetail.act_process[index]) *
              (parseInt(this.formDetail.tpt_machine[index]) -
                parseInt(this.formDetail.idletime[index])))) *
          60;

        // this.formDetail.gap_lh[index] = parseInt(this.formDetail.sap_lh[index])
        //   ? parseInt(this.formDetail.sap_lh[index]) -
        //     parseInt(this.formDetail.total_lotsize_lh[index])
        //   : "";

        // this.formDetail.gap_rh[index] = parseInt(this.formDetail.sap_rh[index])
        //   ? parseInt(this.formDetail.sap_rh[index]) -
        //     parseInt(this.formDetail.total_lotsize_rh[index])
        //   : "";

        this.formDetail.total_sap[index] = parseInt(
          this.formDetail.sap_rh[index]
        )
          ? parseInt(this.formDetail.sap_rh[index]) +
            parseInt(this.formDetail.sap_lh[index])
          : "";

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

        this.formDetail.total_sap_rh = this.formDetail.sap_rh.reduce(
          (a, b) => Number(a) + Number(b),
          0
        );

        this.formDetail.total_sap_lh = this.formDetail.sap_lh.reduce(
          (a, b) => Number(a) + Number(b),
          0
        );

        this.formDetail.accum_sap =
          this.formDetail.total_sap_rh + this.formDetail.total_sap_lh;

        this.formDetail.total_gap_rh = this.formDetail.gap_rh.reduce(
          (a, b) => Number(a) + Number(b),
          0
        );

        this.formDetail.total_gap_lh = this.formDetail.gap_lh.reduce(
          (a, b) => Number(a) + Number(b),
          0
        );

        this.formDetail.total_sum_act_rh = this.formDetail.sum_act_rh.reduce(
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

        this.formDetail.accum_lkh =
          this.formDetail.accum_lotsize_rh + this.formDetail.accum_lotsize_lh;

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
        this.formDetail.total_dt_material = this.formDetail.dt_material.reduce(
          (a, b) => Number(a) + Number(b),
          0
        );

        this.formDetail.dt_total =
          this.formDetail.total_dt_machines +
          this.formDetail.total_dt_dies +
          this.formDetail.total_dt_other +
          this.formDetail.total_dt_material;

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

        this.formDetail.plan_gsph_4 =
          (this.formDetail.total_stroke / (this.formDetail.tpt_total - 0) / 4) *
          60;
        this.formDetail.plan_gsph_2 =
          (this.formDetail.total_stroke / (this.formDetail.tpt_total - 0) / 2) *
          60;
        this.formDetail.plan_gsph_1 =
          (this.formDetail.total_stroke / (this.formDetail.tpt_total - 0) / 1) *
          60;
        this.formDetail.plan_gsph_10 =
          (this.formDetail.total_stroke /
            (this.formDetail.tpt_total - 0) /
            10) *
          60;

        this.formDetail.total_gsph_4 =
          this.formDetail.total_tpt_actual > 0
            ? (this.formDetail.total_stroke_actual /
                (this.formDetail.total_tpt_actual -
                  this.formDetail.total_idletime) /
                4) *
              60
            : "-";
        this.formDetail.total_gsph_3 =
          this.formDetail.total_tpt_actual > 0
            ? (this.formDetail.total_stroke_actual /
                (this.formDetail.total_tpt_actual -
                  this.formDetail.total_idletime) /
                3) *
              60
            : "-";

        this.formDetail.total_gsph_2 =
          this.formDetail.total_tpt_actual > 0
            ? (this.formDetail.total_stroke_actual /
                (this.formDetail.total_tpt_actual -
                  this.formDetail.total_idletime) /
                2) *
              60
            : "-";

        this.formDetail.total_gsph_1 =
          this.formDetail.total_tpt_actual > 0
            ? (this.formDetail.total_stroke_actual /
                (this.formDetail.total_tpt_actual -
                  this.formDetail.total_idletime) /
                1) *
              60
            : "-";

        this.formDetail.total_gsph_10 =
          this.formDetail.total_tpt_actual > 0
            ? (this.formDetail.total_stroke_actual /
                (this.formDetail.total_tpt_actual -
                  this.formDetail.total_idletime) /
                17) *
              60
            : "-";
        // TPT Trial
        this.formDetail.trial_gsph_4 =
          (this.formDetail.total_stroke_actual /
            (this.formDetail.total_tpt_trial - this.formDetail.total_idletime) /
            4) *
          60;

        this.formDetail.trial_gsph_2 =
          (this.formDetail.total_stroke_actual /
            (this.formDetail.total_tpt_trial - this.formDetail.total_idletime) /
            2) *
          60;

        this.formDetail.trial_gsph_1 =
          (this.formDetail.total_stroke_actual /
            (this.formDetail.total_tpt_trial - this.formDetail.total_idletime) /
            1) *
          60;

        this.formDetail.trial_gsph_10 =
          (this.formDetail.total_stroke_actual /
            (this.formDetail.total_tpt_trial - this.formDetail.total_idletime) /
            17) *
          60;

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
        this.formDetail.finish_plan[index] = this.formDetail.part_rh[index]
          ? current.format("HH : mm")
          : "";
        this.formDetail.finish_plan_current[index] =
          this.formDetail.tpt_actual[index] !== "0" &&
          this.formDetail.tpt_actual[index] !== "" &&
          this.formDetail.is_tandem[index] !== true
            ? this.formDetail.tpt[index]
            : "";
        // this.formDetail.finish_plan_current[index] =
        //   this.formDetail.tpt_actual[index] !== "0" &&
        //   this.formDetail.tpt_actual[index] !== "" &&
        //   this.formDetail.additional[index] !== "0" &&
        //   this.formDetail.is_tandem[index] !== true
        //     ? this.formDetail.tpt_actual[index]
        //     : this.formDetail.is_tandem[index] !== true &&
        //       this.formDetail.is_tandem[index + 1] == true &&
        //       this.formDetail.tpt_actual[index] !== "0" &&
        //       this.formDetail.tpt_actual[index] !== ""
        //     ? this.formDetail.tpt[index] == "0"
        //       ? this.formDetail.tpt[index + 1]
        //       : this.formDetail.tpt[index]
        //     : this.formDetail.tpt_actual[index] !== "0" &&
        //       this.formDetail.tpt_actual[index] !== "" &&
        //       this.formDetail.is_tandem[index] !== true
        //     ? this.formDetail.tpt[index]
        //     : "";

        this.formDetail.finish_actual_current[index] =
          this.formDetail.tpt_actual[index] !== "0" &&
          this.formDetail.tpt_actual[index] !== "" &&
          this.formDetail.is_tandem[index] == false
            ? this.formDetail.tpt_actual[index]
            : "";

        this.formDetail.actual_progress_now[index] =
          this.formDetail.tpt_actual[index] !== "0" &&
          this.formDetail.tpt_actual[index] !== ""
            ? this.formDetail.tpt_actual[index]
            : "";

        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();

        let countPlan = 1;
        this.formDetail.finish_plan.forEach((time) => {
          if (time && typeof time === "string") {
            const [hour, minute] = time
              .split(" : ")
              .map((num) => parseInt(num));

            if (
              currentHour > hour ||
              (hour === currentHour && currentMinute > minute)
            ) {
              countPlan++;
            }
          }
        });

        total_std_item = countPlan;
        total_act_item = this.formDetail.actual_progress_now.filter(
          (item) => item
        ).length;

        // Mengambil elemen pertama sebanyak countPlan
        const lotPlanRH = this.formDetail.lot_rh.slice(0, countPlan);
        const lotPlanLH = this.formDetail.lot_lh.slice(0, countPlan);
        const lotActRH = this.formDetail.act_rh.slice(0, total_act_item);
        const lotActLH = this.formDetail.act_lh.slice(0, total_act_item);
        total_plan_tpt = this.formDetail.finish_plan.slice(0, countPlan);
        total_act_tpt = this.formDetail.finish_actual.slice(0, total_act_item);

        lastPlanHour = total_plan_tpt.slice(-1)[0];
        lastActHour = total_act_tpt.slice(-1)[0];

        // Menghitung jumlah elemen yang diambil
        total_std_qty =
          lotPlanRH
            .map(Number) // Mengubah setiap elemen menjadi angka
            .reduce((a, b) => a + b, 0) +
          lotPlanLH.map(Number).reduce((a, b) => a + b, 0);

        total_act_qty =
          lotActRH
            .map(Number) // Mengubah setiap elemen menjadi angka
            .reduce((a, b) => a + b, 0) +
          lotActLH.map(Number).reduce((a, b) => a + b, 0);

        total_item = this.formDetail.part_rh.filter((item) => item).length;
        patan_additional = this.formDetail.additional.filter(
          (value) => value !== "0" && value !== ""
        ).length;
      });

      this.formAttendance.present;

      this.line.total_std_item = total_std_item;
      this.line.total_act_item = total_act_item;
      this.line.total_std_qty = total_std_qty;
      this.line.total_act_qty = total_act_qty;
      this.line.total_std_time = lastPlanHour;
      this.line.total_act_time = lastActHour;
      this.line.persentase_std =
        (total_std_qty /
          (this.formDetail.total_lot_rh + this.formDetail.total_lot_lh)) *
        100;
      this.line.persentase_act = total_act_qty
        ? (total_act_qty /
            (this.formDetail.total_lot_rh + this.formDetail.total_lot_lh)) *
          100
        : 0;

      this.line.persentase_tpt = this.formDetail.total_tpt_actual
        ? (this.formDetail.total_tpt_actual / this.formDetail.tpt_total) * 100
        : 0;

      this.line.total_item = total_item;
      this.line.patan_additional = patan_additional;
      this.line.persentase_patan = total_item
        ? ((total_item - patan_additional) / total_item) * 100
        : 0;

      this.formDetail.finish_plan.filter((item) => item);
      this.line.finish_plan = this.formDetail.finish_plan
        .filter((item) => item)
        .pop();
      this.formDetail.finish_plan_current.filter((item) => item);
      this.line.finish_plan_current = this.formDetail.finish_plan_current
        .filter((item) => item)
        .reduce((a, b) => Number(a) + Number(b), 0);
      this.formDetail.finish_actual.filter((item) => item);
      this.line.finish_actual_current = this.formDetail.finish_actual_current
        .filter((item) => item)
        .reduce((a, b) => Number(a) + Number(b), 0);

      this.formDetail.hadir.filter((item) => item);
      this.line.hadir = this.formDetail.hadir.filter((item) => item).shift();
      this.formDetail.izin.filter((item) => item);
      this.line.izin = this.formDetail.izin.filter((item) => item).shift();
      this.formDetail.sakit.filter((item) => item);
      this.line.sakit = this.formDetail.sakit.filter((item) => item).shift();
      total_repair =
        this.formDetail.total_repair_rh || this.formDetail.total_repair_lh
          ? this.formDetail.total_repair_rh + this.formDetail.total_repair_lh
          : 0;

      this.line.total_repair = total_repair;
      total_reject =
        this.formDetail.total_reject_rh + this.formDetail.total_reject_lh;

      this.line.total_reject = total_reject;
      this.line.total_part_plan = qty_plan;
      this.line.total_part_actual = qty_actual;
      this.line.good_actual =
        100 - this.line.repair_actual - this.line.reject_actual;

      this.line.qty_ok =
        parseInt(this.formDetail.total_act_rh) +
        parseInt(this.formDetail.total_act_lh);

      this.line.ok_persen =
        (parseInt(this.line.qty_ok) /
          (parseInt(this.formDetail.total_act_rh) +
            parseInt(this.formDetail.total_act_lh))) *
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
        jumlah_mesin: [],
        e_kanban: Array(15).fill([]),
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
        original_line: [],
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
        actual_progress_now: [],
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
        ket_idletime: [],
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
        total_std_item: [],
        total_act_item: [],
        total_std_qty: [],
        total_act_qty: [],
        total_std_time: [],
        total_act_time: [],
        persentase_std: [],
        persentase_act: [],
        persentase_tpt: [],
        persentase_patan: [],
        total_item: [],
        patan_additional: [],
        zkbnfull_rh: [],
        zkbnwait_rh: [],
        ztotkbn_rh: [],
        ztotkbn_lh: [],
        ztotqty_rh: [],
        ztotqty_lh: [],
        zstatus: [],
        qty_pallet: [],
        type_pallet: [],
        zbehmg_rh: [],
        zbehmg_lh: [],
      };
      let loop = 0;
      while (loop < (item.length > 12 ? item.length : 13)) {
        const arrVar = ["machine", "process"];
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
                  ? item[loop][k[0]].split(" ")
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

      if (
        !this.view &&
        this.dialog.detail &&
        utilityStore.isCurrentTimeBetween("15:00", "16:20")
      ) {
        // utilityStore.onApiResponse({
        //   status: 200,
        //   data: {
        //     messages:
        //       "Pastikan kembali data yang Anda isi sudah lengkap dan sesuai (Repair, Reject, Downtime, dll)!",
        //     success: false,
        //   },
        // });
      }

      this.countDataActual();
    },
    loadDataEditSAP(line) {
      this.line = line;
      let item = line.detail;
      this.dialog.detail = true;
      this.line_id = line.line_id;
      this.is_done = line.is_done;
      this.formDetail = {
        hadir: [],
        izin: [],
        sakit: [],
        is_tandem: [],
        is_trial: [],
        is_terusan: [],
        job_number: [],
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
        // total_tpt_actual: [],
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
        // part_number: [],
        lotsize: [],
        gsph: [],
        gsph_plan: [],
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
        keterangan_sap: [],
        status_delivery: [],
        is_done: [],
        update_date: [],
        information: [],
        ket_repair_rh: [],
        ket_repair_lh: [],
        ket_reject_rh: [],
        ket_reject_lh: [],
        ket_idletime: [],
        ket_dt_machines: [],
        ket_dt_dies: [],
        ket_dt_other: [],
        ket_dt_material: [],
        machine: [],
        process: [],
        qty_actual_machine: [],
        dandori_machine: [],
        tpt_machine: [],
        finish_machine: [],
        lotsize_rh_shift1: [],
        lotsize_lh_shift1: [],
        lotsize_rh_shift2: [],
        lotsize_lh_shift2: [],
        reject_lh_shift1: [],
        reject_lh_shift2: [],
        reject_rh_shift1: [],
        reject_rh_shift2: [],
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
        actual_progress_now: [],
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
    loadDataLed(line) {
      this.dialog.formLed = true;
      this.dialog.detail
        ? ""
        : (this.loadDataDetailEdit(line), (this.dialog.detail = false));
    },
    loadQualityRepair(line) {
      this.dialog.formKetRepair = true;
      this.loadDataDetailEdit(line);
      this.dialog.detail = false;
    },
    loadKeteranganRepair() {
      this.dialog.formKetRepair = true;
    },
    loadRepair(line) {
      this.fetchDataKeterangan(line, "repair");
    },
    loadReject(line) {
      this.fetchDataKeterangan(line, "reject");
    },
    loadDies(line) {
      this.fetchDataKeterangan(line, "dies");
    },
    loadMC(line) {
      this.fetchDataKeterangan(line, "machine");
    },
    loadOth(line) {
      this.fetchDataKeterangan(line, "other");
    },
    loadMat(line) {
      this.fetchDataKeterangan(line, "material");
    },
    loadKeteranganDT() {
      this.dialog.formKetDT = true;
    },
    async loadDataKanban(line, status) {
      try {
        notificationStore.loading = true;
        const response = await axios.get(
          // `http://${configStore.apiUrl}/majsf_rest_api/api/kanban_circulation/kanban_status_wait?line_id=${line.line_id}`
          'http://localhost/majsf_rest_api/api/kanban_circulation/kanban_status_wait?line_id=${line.line_id}'
          ,
          { params: this.params }
        );

        if (!status) {
          if (response.data) {
            await this.fetchDataLineRefreshKanban(
              line.line_id,
              this.params.date
            );
          }
        }
      } catch (error) {
        console.error("Error loading Kanban data:", error);
      } finally {
        notificationStore.loading = false;
      }
    },
    async onEmptyKanban(part_rh = null, part_lh = null, totalKanban) {
      notificationStore.loading = true;
      const data = new FormData();

      if (part_rh) {
        data.append("part_rh", part_rh);
      }
      if (part_lh) {
        data.append("part_lh", part_lh);
      }

      data.append("total_kanban", totalKanban);
      data.append("line_id", this.line_id);
      data.append("date", this.params.date);
      data.append("shift", this.params.shift);
      data.append("patan", this.patan);

      const configHttp = {
        method: "post",
        url: 
        // `http://${configStore.apiUrl}/majsf_rest_api/api/kanban_circulation/kanban_status_to_empty`
        'http://localhost/majsf_rest_api/api/kanban_circulation/kanban_status_to_empty',
        headers: {
          "Content-Type": "multipart/form-data",
        },
        data,
      };

      try {
        const response = await axios(configHttp);

        if (response.status === 200) {
          await utilityStore.onApiResponse(response);
          await this.fetchDataLineRefreshKanban(this.line_id, this.params.date);
        }
      } catch (error) {
        console.error("Terjadi kesalahan:", error);
      } finally {
        notificationStore.loading = false;
      }
    },
    fetchDataLineRefreshKanban(id, date) {
      notificationStore.loading = true;
      axios
        .get(
          //`http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/display_refresh?line=${id}&date=${date}`
          'http://localhost/majsf_rest_api/api/inventory-achievement/display_refresh?line=${id}&date=${date}',
          { params: this.params }
        )
        .then((response) => {
          if (response.status === 200) {
            if (response.data.status) {
              this.loadDataDetailKanban(response.data.data);
            } else {
              utilityStore.onApiResponse(response);
            }
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        });
    },
    loadDataDetailKanban(line) {
      this.line = line;
      let item = line.detail;
      let att = line.attendance;
      this.line_id = line.line_id;
      this.dialog.formKanban = true;
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
        jumlah_mesin: [],
        e_kanban: Array(15).fill([]),
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
        original_line: [],
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
        actual_progress_now: [],
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
        ket_idletime: [],
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
        total_std_item: [],
        total_act_item: [],
        total_std_qty: [],
        total_act_qty: [],
        total_std_time: [],
        total_act_time: [],
        persentase_std: [],
        persentase_act: [],
        persentase_tpt: [],
        persentase_patan: [],
        total_item: [],
        patan_additional: [],
        zkbnfull_rh: [],
        zkbnwait_rh: [],
        ztotkbn_rh: [],
        ztotkbn_lh: [],
        ztotqty_rh: [],
        ztotqty_lh: [],
        zstatus: [],
        qty_pallet: [],
        type_pallet: [],
        zbehmg_rh: [],
        zbehmg_lh: [],
      };
      let loop = 0;
      while (loop < (item.length > 12 ? item.length : 13)) {
        const arrVar = ["machine", "process"];
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
                  ? item[loop][k[0]].split(" ")
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

    onFullKanban() {
      notificationStore.loading = true;
      const data = new FormData();
      3;
      data.append("part_number", this.formKanbanFull.part_number);
      data.append("qty_ok", this.formKanbanFull.qty_ok);
      data.append("line_id", this.line_id);
      data.append("date", this.params.date);
      data.append("shift", this.params.shift);
      data.append("patan", this.patan);
      const configHttp = {
        method: "post",
        url: //`http://${configStore.apiUrl}/majsf_rest_api/api/kanban_circulation/kanban_status_to_full`
        'http://localhost/majsf_rest_api/api/kanban_circulation/kanban_status_to_full',
        headers: {
          "Content-Type": "multipart/form-data",
        },
        data,
      };
      axios(configHttp)
        .then((response) => {
          notificationStore.onApiResponseToastAlert(response);
          this.fetchDataLineRefreshKanban(this.line_id, this.params.date);
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
      const configHttp = {
        method: "post",
        url: 'http://localhost/majsf_rest_api/api/inventory-achievement/kanban_start',
        //`http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/kanban_start`,
        data,
      };
      axios(configHttp).then((response) => {
        notificationStore.onApiResponseToastAlert(response, this.resetForm);
        // vm.$socket.emit("updateAcievement", this.line_id);
      });
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
        url: 'http://localhost/majsf_rest_api/api/inventory-achievement/move',
        //`http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/move`,
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
      const arrVar = ["machine", "process"];
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
        url: 'http://localhost/majsf_rest_api/api/inventory-achievement/data',
        //`http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/data`,
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
    onPrint(data, pic) {
      const fd = new URLSearchParams();
      fd.append("line_id", this.line_id);
      fd.append("date", this.params.date);
      fd.append("shift", this.params.shift);
      fd.append("patan", this.patan);
      fd.append("urut", data);
      fd.append("pic", pic);

      const configHttp = {
        method: "put",
        url: 'http://localhost/majsf_rest_api/api/inventory-achievement/print',
        //`http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/print`,
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
      fd.append("line_id", this.line_id);
      fd.append("date", this.params.date);
      fd.append("shift", this.params.shift);
      fd.append("patan", this.patan);

      const configHttp = {
        method: "put",
        url: 
        // `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/open`
        'http://localhost/majsf_rest_api/api/inventory-achievement/open',
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
        url: 
        // `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/close`
        'http://localhost/majsf_rest_api/api/inventory-achievement/close'
        ,
        headers: {
          "Content-Type": "multipart/form-data",
        },
        data: fd,
      };
      axios(configHttp);
    },
    checkForm(userNow) {
      const id = this.line_id;
      const date = this.params.date;
      const shift = this.params.shift;
      const user = userNow;
      axios
        .get(
          // `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/check?line_id=${id}&date=${date}&shift=${shift}`
          'http://localhost/majsf_rest_api/api/inventory-achievement/check?line_id=${id}&date=${date}&shift=${shift}'
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
    // closeRefreshForm(userNow) {
    //   const fd = new URLSearchParams();
    //   fd.append("line_id", this.line_id || "");
    //   fd.append("date", this.params?.date || "");
    //   fd.append("shift", this.params?.shift || "");
    //   fd.append("patan", this.patan || "");
    //   fd.append("user_open", userNow || "");

    //   axios.put("http://localhost/majsf_rest_api/api/inventory-achievement/close_refresh", fd, {
    //     headers: { "Content-Type": "application/x-www-form-urlencoded" },
    //   })
    //   .then(res => console.log(res.data))
    //   .catch(err => console.error("close_refresh error:", err));
    // },
    //closeRefresh with user active
    closeRefreshForm(userNow) {
      const fd = new URLSearchParams();
      fd.append("line_id", this.line_id);
      fd.append("date", this.params.date);
      fd.append("shift", this.params.shift);
      fd.append("patan", this.patan);
      fd.append("user_open", userNow);

      const configHttp = {
        method: "put",
        url: 
        // `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/close_refresh`
        'http://localhost/majsf_rest_api/api/inventory-achievement/close_refresh',
        headers: {
          "Content-Type": "multipart/form-data",
        },
        data: fd,
      };
      axios(configHttp);
      this.resetForm();
    },
    updateQty() {
      axios.get(
        // `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-lkh/update_qty`,
        'http://localhost/majsf_rest_api/api/inventory-lkh/update_qty',
        {
          params: this.filterDate,
        }
      );
    },
    updateQtyLh() {
      axios.get(
        // `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-lkh/update_qty_lh`,
        'http://localhost/majsf_rest_api/api/inventory-lkh/update_qty_lh',
        {
          params: this.filterDate,
        }
      );
    },

    startItem(vm, part_rh, urut_plan) {
      const fd = new URLSearchParams();
      fd.append("part_rh", part_rh);
      fd.append("urut_plan", urut_plan);
      fd.append("line_id", this.line_id);
      fd.append("date", this.params.date);
      fd.append("shift", this.params.shift);

      const configHttp = {
        method: "put",
        url: //`http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/start_running`
        'http://localhost/majsf_rest_api/api/inventory-achievement/start_running',
        headers: {
          "Content-Type": "multipart/form-data",
        },
        data: fd,
      };
      axios(configHttp)
        .then((response) => {
          notificationStore.onApiResponseToastAlert(response);
          vm.$socket.emit("updateAcievement", this.line_id);
          this.refreshForm(this.line_id);
        })
        .catch(utilityStore.onError);
    },

    stopItem(vm, part_rh, urut_plan) {
      const fd = new URLSearchParams();
      fd.append("part_rh", part_rh);
      fd.append("urut_plan", urut_plan);
      fd.append("line_id", this.line_id);
      fd.append("date", this.params.date);
      fd.append("shift", this.params.shift);

      const configHttp = {
        method: "put",
        url: `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/stop_running`,
        headers: {
          "Content-Type": "multipart/form-data",
        },
        data: fd,
      };
      axios(configHttp)
        .then((response) => {
          notificationStore.onApiResponseToastAlert(response);
          vm.$socket.emit("updateAcievement", this.line_id);
          this.refreshForm(this.line_id);
        })
        .catch(utilityStore.onError);
    },
    loadDataTag(line) {
      this.dialog.formTag = true;
      this.loadDataDetailEdit(line);
      this.dialog.detail = false;
    },
    updateQtyKbn(line) {
      const fd = new URLSearchParams();
      fd.append("line_id", line);
      fd.append("date", this.params.date);
      fd.append("shift", this.params.shift);

      const configHttp = {
        method: "put",
        url: //`http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/update_kbn`
        'http://localhost/majsf_rest_api/api/inventory-achievement/update_kbn',
        headers: {
          "Content-Type": "multipart/form-data",
        },
        data: fd,
      };
      axios(configHttp)
        .then((response) => {
          notificationStore.onApiResponseToastAlert(response);
          this.resetForm();
          this.dialog.formTag = true;
        })
        .catch(utilityStore.onError);
    },

    startProcess(vm, part_rh, urut_plan) {
      const fd = new URLSearchParams();
      fd.append("part_rh", part_rh);
      fd.append("urut_plan", urut_plan);
      fd.append("line_id", this.line_id);
      fd.append("date", this.params.date);
      fd.append("shift", this.params.shift);

      const configHttp = {
        method: "put",
        url: //`http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/start_process`
        'http://localhost/majsf_rest_api/api/inventory-achievement/start_process',
        headers: {
          "Content-Type": "multipart/form-data",
        },
        data: fd,
      };
      axios(configHttp)
        .then((response) => {
          notificationStore.onApiResponseToastAlert(response);
          vm.$socket.emit("updateAcievement", this.line_id);
          this.refreshForm(this.line_id);
        })
        .catch(utilityStore.onError);
    },

    stopProcess(vm, part_rh, urut_plan) {
      const fd = new URLSearchParams();
      fd.append("part_rh", part_rh);
      fd.append("urut_plan", urut_plan);
      fd.append("line_id", this.line_id);
      fd.append("date", this.params.date);
      fd.append("shift", this.params.shift);

      const configHttp = {
        method: "put",
        url: //`http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/stop_process`
        'http://localhost/majsf_rest_api/api/inventory-achievement/stop_process',
        headers: {
          "Content-Type": "multipart/form-data",
        },
        data: fd,
      };
      axios(configHttp)
        .then((response) => {
          notificationStore.onApiResponseToastAlert(response);
          vm.$socket.emit("updateAcievement", this.line_id);
          this.refreshForm(this.line_id);
        })
        .catch(utilityStore.onError);
    },

    onScanKanban(data) {
      const fd = new URLSearchParams();
      // const id = this.line_id;
      fd.append("date", this.params.date);
      fd.append("shift", this.params.shift);
      fd.append("id_kanban", data);
      fd.append("tipe", "STP");

      const configHttp = {
        method: "put",
        url: `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/print`,
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
              }/mims/production/stamping/print-tag-ok?parameter_tag=${encodeURIComponent(
                encryptedData
              )}`,
              // `http://localhost:8080/production/stamping/print-tag-ok?parameter_tag=${encodeURIComponent(
              //   encryptedData
              // )}`,
              "_blank"
            );
          } else {
            utilityStore.onApiResponse(response);
          }
          this.formScan.id_kanban = "";
        })
        .catch(configStore.onError);
    },

    onScanKanbanEksternal(data) {
      const fd = new URLSearchParams();
      fd.append("date", this.params.date);
      fd.append("shift", this.params.shift);
      fd.append("id_kanban", data);
      fd.append("tipe", "IFP");

      const configHttp = {
        method: "put",
        url: `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/print`,
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
              }/mims/production/stamping/print-tag-ok?parameter_tag=${encodeURIComponent(
                encryptedData
              )}`
            );
          } else {
            utilityStore.onApiResponse(response);
          }
          this.formScan.id_kanban = "";
        })
        .catch(configStore.onError);
    },

    fetchDataNextProcess() {
      notificationStore.loading = true;
      axios
        .get(
          //`http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/display_next`
          'http://localhost/majsf_rest_api/api/inventory-achievement/display_next'
        )
        .then((response) => {
          if (response.data.status == false) {
            utilityStore.onApiResponse(response);
            this.table_next.items = response.data.data;
            this.table_next.detail = response.data.data;
          } else {
            this.table_next.items = response.data.data[0];
            this.table_next.detail = response.data.data;
            notificationStore.disableResponse();
            notificationStore.disableLoading();
          }
        });
    },

    stopAllRunning(line) {
      const fd = new URLSearchParams();
      fd.append("line_id", line);

      const configHttp = {
        method: "put",
        url: //`http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/stop_all`
        'http://localhost/majsf_rest_api/api/inventory-achievement/stop_all',
        headers: {
          "Content-Type": "multipart/form-data",
        },
        data: fd,
      };
      axios(configHttp)
        .then(
          (response) => console.log(response),
          this.fetchDataLineNoLoading(line)
        )
        .catch(configStore.onError);
    },

    fetchDataLineNoLoading(id) {
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/display?line=${id}`
        )
        .then((response) => {
          console.log(response);
        });
    },
    onAddLine(vm) {
      notificationStore.loading = true;
      const data = new FormData();
      data.append("date", this.params.date);
      data.append("shift", this.params.shift);
      data.append("patan", this.patan);
      data.append("line_id", this.params.line_id);
      const configHttp = {
        method: "post",
        url: 'http://localhost/majsf_rest_api/api/inventory-achievement/add_line',
        //`http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/add_line`,
        data,
      };
      axios(configHttp).then((response) => {
        notificationStore.onApiResponseToastAlert(response, this.resetForm);
        vm.$socket?.emit("updateAcievement", this.line_id);
      });
    },
    fetchDataWeekly() {
      notificationStore.loading = status;
      axios
        .get(
          // `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/data_weekly`
          'http://localhost/majsf_rest_api/api/inventory-achievement/data_weekly'
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

    fetchDataKanbanSTP() {
      // notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/achievement_kanban`,
          { params: this.params }
        )
        .then((response) => {
          if (response.status === 200) {
            if (response.data.status) {
              this.lines = response.data.data.map((data) => {
                let total_lkh = 0;
                let total_sap = 0;

                this.patan = data.patan;
                data.detail = data.detail.map((item) => {
                  total_lkh += parseFloat(
                    item.total_prod_rh_shift1 ||
                      item.total_prod_rh_shift2 ||
                      item.total_prod_lh_shift1 ||
                      item.total_prod_lh_shift2
                      ? parseInt(item.total_prod_rh_shift1) +
                          parseInt(item.total_prod_rh_shift2) +
                          parseInt(item.total_prod_lh_shift1) +
                          parseInt(item.total_prod_lh_shift2)
                      : 0
                  );
                  total_sap += parseFloat(
                    item.SAP_RH_SHIFT1 ||
                      item.SAP_RH_SHIFT2 ||
                      item.SAP_LH_SHIFT1 ||
                      item.SAP_LH_SHIFT2
                      ? (parseInt(item.SAP_RH_SHIFT1) || 0) +
                          (parseInt(item.SAP_RH_SHIFT2) || 0) +
                          (parseInt(item.SAP_LH_SHIFT1) || 0) +
                          (parseInt(item.SAP_LH_SHIFT2) || 0)
                      : 0
                  );
                  return item;
                });
                data.total_lkh = total_lkh;
                data.total_sap = total_sap;
                data.expand = false;
                return data;
              });
              // notificationStore.loading = false;
              this.dialog.filter = false;
            } else {
              utilityStore.onApiResponse(response);
              this.lines = response.data.data.map((data) => {
                data.detail = [];
                return data;
              });
            }
            configStore.page.name = `Achievement Kanban Stamping (${utilityStore.formatDate(
              this.params.date
            )})`;
          } else {
            utilityStore.onApiResponse(response);
          }
        });
    },

    fetchDataKanbanWLD() {
      // notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/welding-achievement/achievement_kanban_wld`,
          { params: this.params }
        )
        .then((response) => {
          if (response.status === 200) {
            if (response.data.status) {
              this.lines = response.data.data.map((data) => {
                let total_lkh = 0;
                let total_sap = 0;
                data.detail = data.detail.map((item) => {
                  total_lkh += parseFloat(
                    item.ACT_SHIFT1 || item.ACT_SHIFT2
                      ? parseInt(item.ACT_SHIFT1) + parseInt(item.ACT_SHIFT2)
                      : 0
                  );
                  total_sap += parseFloat(
                    item.ZQTY_SAP_ZSHIFT1 || item.ZQTY_SAP_ZSHIFT2
                      ? (parseInt(item.ZQTY_SAP_ZSHIFT1) || 0) +
                          (parseInt(item.ZQTY_SAP_ZSHIFT2) || 0)
                      : 0
                  );
                  return item;
                });
                data.total_lkh = total_lkh;
                data.total_sap = total_sap;
                data.expand = false;
                return data;
              });
              // notificationStore.loading = false;
              this.dialog.filter = false;
            } else {
              utilityStore.onApiResponse(response);
              this.lines = response.data.data.map((data) => {
                data.detail = [];
                return data;
              });
            }
            configStore.page.name = `Achievement Kanban Welding (${utilityStore.formatDate(
              this.params.date
            )})`;
          } else {
            utilityStore.onApiResponse(response);
          }
        });
    },

    printEKanban(part_rh, part_lh, username, qtyOk) {
      notificationStore.loading = true;
      const fd = new URLSearchParams();
      fd.append("date", this.params.date);
      fd.append("shift", this.params.shift);
      fd.append("part_number[]", part_rh);
      if (part_lh) {
        fd.append("part_number[]", part_lh);
      }
      fd.append("username", username);
      fd.append("qty_oke", qtyOk);

      const configHttp = {
        method: "put",
        url: `http://localhost/majsf_rest_api/kanban-circulation/print_e_kanban`,
        //`http://${configStore.apiUrl}/majsf_rest_api/api/kanban-circulation/print_e_kanban`,
        headers: {
          "Content-Type": "multipart/form-data",
        },
        data: fd,
      };
      axios(configHttp)
        .then((response) => {
          notificationStore.disableLoading();
          if (response.data.status == true) {
            // Simpan data ke session storage
            sessionStorage.setItem(
              "printData",
              JSON.stringify({
                time: this.params.clock,
                shift: this.params.shift,
                date: this.params.date,
                part_number: [part_rh, part_lh].filter(Boolean),
                username: username,
                index: qtyOk,
              })
            );

            // Buka URL
            utilityStore.onApiResponse(response, () => {
              window.open(
                `http://${configStore.apiUrl}/mims/production/print-e-kanban`,
                "_blank"
              );
              this.fetchDataLineRefreshKanban(this.line_id, this.params.date);
            });
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(configStore.onError);
    },

    cancelEkanban(part_rh, part_lh, username, qtyOk) {
      notificationStore.loading = true;
      const fd = new URLSearchParams();
      fd.append("date", this.params.date);
      fd.append("shift", this.params.shift);
      fd.append("part_number[]", part_rh);
      if (part_lh) {
        fd.append("part_number[]", part_lh);
      }
      fd.append("username", username);
      fd.append("qty_oke", qtyOk);

      const configHttp = {
        method: "put",
        url: `http://localhost/majsf_rest_api/kanban-circulation/cancel_e_kanban`,
        //`http://${configStore.apiUrl}/majsf_rest_api/api/kanban-circulation/cancel_e_kanban`,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        data: fd,
      };

      axios(configHttp)
        .then((response) => {
          notificationStore.disableLoading();
          utilityStore.onApiResponse(response);
          this.fetchDataLineRefreshKanban(this.line_id, this.params.date);
        })
        .catch((error) => {
          notificationStore.disableLoading();
          const configStore = useConfigStore();
          configStore.onError(error);
        });
    },

    rePrintKanban(part_rh, part_lh, username, qtyOk) {
      // Simpan data ke session storage
      sessionStorage.setItem(
        "printData",
        JSON.stringify({
          time: this.params.clock,
          shift: this.params.shift,
          date: this.params.date,
          part_number: [part_rh, part_lh].filter(Boolean),
          username: username,
          index: qtyOk,
        })
      );

      // Buka URL print ke tab baru
      window.open(
        `http://${configStore.apiUrl}/mims/production/print-e-kanban`,
        // `http://localhost:8080/production/print-e-kanban`,
        "_blank"
      );
    },

    getQtyKbn() {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/master/Welding/qty_kanban?part_number=${this.formTagOK.part_number}`
        )
        .then((response) => {
          if (response.status === 200) {
            this.formTagOK.qty_kbn = response.data;
            this.formTagOK.lotsize_actual = "";
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },

    handleTagOK() {
      if (this.formTagOK.part_number && this.formTagOK.lotsize_actual > 0) {
        if (
          !Number.isInteger(
            this.formTagOK.lotsize_actual / this.formTagOK.qty_kbn
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
      data.append("part_number", this.formTagOK.part_number);
      data.append("lotsize_actual", this.formTagOK.lotsize_actual);
      data.append("date", this.formTagOK.date);
      data.append("shift", this.formTagOK.shift);

      const configHttp = {
        method: "post",
        url: `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/print_tag_ok`,
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
              part_number: this.formTagOK.part_number,
              date: this.formTagOK.date,
              shift: this.formTagOK.shift,
              lotize_actual: this.formTagOK.lotsize_actual,
              qty_kbn: this.formTagOK.qty_kbn,
              tipe_part: this.formTagOK.tipe_part,
            });

            const encryptedData = CryptoJS.AES.encrypt(
              dataToEncrypt,
              secretKey
            ).toString();

            window.open(
              `http://${
                configStore.apiUrl
              }/mims/production/tag-ok?parameter_tag=${encodeURIComponent(
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

    async fetchDataTagOK(parameter_tag) {
      try {
        notificationStore.loading = true;
        const response = await axios.get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/inventory_achievement/tag_ok_by_id_kanban?parameter_tag=${parameter_tag}`
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
