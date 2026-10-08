import { defineStore } from 'pinia';
import { useNotificationStore } from '@/stores/notification';
import { useAuthStore } from '@/stores/auth';
import { useUtilityStore } from '@/stores/utility';
import { useConfigStore } from '@/stores/config';
import { reactive } from 'vue';
import moment from 'moment';
import socket from '@/plugins/socket';

// TS type, service & utils
type ReprintKanbanPayload = {
  part_rh?: string | null;
  part_lh?: string | null;
  username: string;
  qtyOk: number | string;
};

import { stampingProdService } from '@/services/Stamping/Transaction/AchievementService';

import type {
  AchievementLine,
  PartItem,
  FormDetail,
  FormAttendance,
  FormKanbanFull,
  lineDetail,
  filterDate,
  SaveDetailSAP
} from '@/types/Stamping/Transaction/Achievement';

const authStore = useAuthStore();
const notificationStore = useNotificationStore();
const utilityStore = useUtilityStore();
const configStore = useConfigStore();

let formDetail = {
  hadir: [],
  izin: [],
  sakit: [],
  ganti_hari: [],
  jumlah_mesin: [],
  e_kanban: Array.from({ length: 15 }, () => []),
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
  cm_dt_machines: [],
  cm_dt_dies: [],
  cm_dt_other: [],
  cm_dt_material: [],
  status_dt_machines: [],
  status_dt_dies: [],
  status_dt_other: [],
  status_dt_material: [],
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
  zbehmg_lh: []
};

// const shiftDefault = utilityStore.getCurrentShift();

export const useStampingAchievementProdStore = defineStore('StampingProductionAchievement', {
  state: () => {
    return {
      params: {
        ...utilityStore.getCurrentShift(),
        line_id: ''
      },
      shiftNow: utilityStore.getShiftNow(),
      is_done: '',
      patan: '',
      line_id: '',
      part_number_rh: '',
      part_number_lh: '',
      lot_size_rh: '',
      urut: '',
      lines: [] as AchievementLine[],
      view: false,
      isLoading: false,
      payload: null,
      formDetail: {} as FormDetail,
      formAttendance: {
        standard: [],
        present: [],
        leave: [],
        exchange_day: [],
        permit: [],
        sick: [],
        absent: []
      } as FormAttendance,
      line: {
        patan: '',
        shift: '',
        date: '',
        line_id: '',
        gsph_plan: 0,
        downtime_plan: 0,
        idletime_plan: 0,
        cycle_time_plan: 0,
        good_plan: 0,
        repair_plan: 0,
        reject_plan: 0,
        length: 0,
        connection: false,
        detail: formDetail
      } as unknown as lineDetail,
      partItems: [] as PartItem[],
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
        formData: false
      },
      dialogKBN: {
        filter: false,
        datePicker: false,
        datePickerPeriod: false,
        detail: false
      },
      addList: ['Add', 'A', 'B', 'C', 'D', 'R1', 'LJ', 'TP'],
      listAllLine: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', '300T', 'SP'],
      statusList: ['WIP', 'FP', 'BL'],
      combinationProcess: ['5 - 0', '4 - 0', '3 - 0', '2 - 0', '1 - 0'],
      planProcess: ['1', '2', '3', '4', '5', '6', '7'],
      totalProcess: ['1', '2', '3', '4', '5', '6'],
      keteranganList: [
        'Revisi Plan',
        'Cancel Plan',
        'Switch Item',
        'Prioritas',
        'Service Part',
        'Buffer',
        'Delay Material',
        'Delay Dies',
        'Delay WIP',
        'Delay BL',
        'Kombinasi Item',
        'Delay Kanban'
      ],
      keteranganAllList: [
        'Lanjutan Shift 1',
        'Lanjutan Shift 2',
        '1 Lot R/M ≠ LotSize',
        'Tarik Patan',
        'WIP Kurang',
        'Blank Kurang',
        'Problem Mesin',
        'Problem Dies',
        'Problem Crane',
        'Lanjut Shift Berikut',
        'R/M Kurang di jalur',
        'R/M Kurang dr IRM',
        'Switching LINE A',
        'Switching LINE B',
        'Switching LINE C',
        'Switching LINE D',
        'Switching LINE E',
        'Switching LINE F',
        'Switching LINE G',
        'Switching LINE H',
        'Switching LINE 300T',
        'Switching LINE SP',
        'Pallet Std Kosong',
        'Trial Produksi',
        'Kanban Kurang',
        'Kanban Kosong',
        'Sdh Tarik Proses',
        'Stock BL Over',
        'Stock WIP Over',
        'Stock FP Over',
        'TPT Plan >10/11 Jam',
        'Add SO',
        'Tambah Lotsize',
        'Balancing Qty Tandem',
        'Stop ada part urgent',
        'Revisi Plan',
        'Cancel Plan',
        'Switch Item',
        'R/M Kosong',
        'Service Part',
        'Buffer',
        'WIP Kosong',
        'BL Kosong',
        'Dies repair MTC',
        'Problem Raw Material'
      ],
      keterangan_sap: [
        'Scan Minus Kbn',
        'Minus Kbn Cut Off',
        'Minus Part Reject',
        'Minus Trouble Dies',
        'Minus Trouble Mesin',
        'Minus R/M kurang',
        'Kanban Error',
        'Add Request Qty',
        'Add Pcs Reject'
      ],
      statusDelivery: ['On Schedule', 'Advance'],
      permissions: {
        create: authStore.checkAccess('Transaction.Create.AchievementKanban'),
        update: authStore.checkAccess('Transaction.Update.AchievementKanban'),
        download: authStore.checkAccess('Report.Download.AchievementKanban'),
        pcd: authStore.checkAccess('Transaction.PCD.AchievementKanban')
      },
      statusForm: { user: '', status: false } as { user: string; status: boolean },
      list: {
        machine: [
          'A1',
          'A2',
          'A3',
          'A4',
          'B1',
          'B2',
          'B3',
          'B4',
          'C1',
          'C2',
          'D1',
          'D2',
          'D3',
          'D4',
          'E1',
          'E2',
          'E3',
          'E4',
          'F1',
          'F2',
          'F3',
          'F4',
          '80T',
          '110T-1',
          '110T-2',
          '110T-3',
          '110T-4',
          '150T-1',
          '150T-2',
          '150T-3',
          '150T-4',
          '150T-5',
          '150T-6',
          '150T-7',
          '150T-8',
          '150T-9',
          '150T-10',
          '150T-11',
          '150T-12',
          '300T-1',
          '300T-2',
          'G1',
          'G2',
          'G3',
          'G4',
          'H1',
          'H2',
          'H3',
          'H4'
        ],
        process: ['OP10', 'OP20', 'OP30', 'OP40', 'OP50', 'OP60', 'OP70', 'OP80'],
        palet: ['C', 'D', 'D2', 'Gantung', 'WBD', 'Skid Kayu', 'Skid Besi', 'Poly Box']
      },
      formKanbanFull: {
        part_number_rh: '',
        part_number_lh: '',
        total_kanban: 0,
        qty_ok: 0,
        dIndex: 0
      } as FormKanbanFull,
      formData: {
        machine: [] as string[],
        process: [] as string[]
      },
      filterDate: {
        clock: '',
        date: '',
        day: '',
        hour: '',
        period: '',
        period2: '',
        shift: 1,
        month: '',
        year: ''
      } as filterDate
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
      this.formData.machine = [];
      this.formData.process = [];
      this.dialog.formTag = false;
      this.dialog.addLine = false;
    },
    loadKeteranganRepair() {
      this.dialog.formKetRepair = true;
    },
    loadKeteranganDT() {
      this.dialog.formKetDT = true;
    },
    filterMachineLine() {
      return this.list.machine;
    },
    searchPart(item: any) {
      return `<strong>${item.job_number}</strong> - ${item.part_number}`;
    },
    refreshForm(line: any) {
      this.fetchDataLineByID(line);
    },
    deleteData() {
      this.dialog.confirmDelete = true;
    },
    addRow() {
      const arrVar = ['machine', 'process'] as const;

      (Object.keys(this.formDetail) as Array<keyof typeof this.formDetail>).forEach((key) => {
        const target = this.formDetail[key];

        if (!Array.isArray(target)) return;

        if (key === 'is_tandem' || key === 'is_trial' || key === 'is_terusan') {
          (target as boolean[]).push(false);
          return;
        }

        if (key === 'e_kanban' || arrVar.includes(key as any)) {
          (target as any[]).push([]);
          return;
        }

        (target as any[]).push('');
      });
    },
    countDataActual(this: any): void {
      let qty_actual: number = 0;
      let qty_plan: number = 0;
      let total_repair: number = 0;
      let total_reject: number = 0;
      var array: number[] = [];
      var trial: number[] = [];
      var act_rh_trial: number[] = [];
      var act_lh_trial: number[] = [];
      let total_std_item: number = 0;
      let total_act_item: number[] = [];
      let total_std_qty: number = 0;
      let total_act_qty: number = 0;
      let total_plan_tpt: number[] = [];
      let total_act_tpt: number[] = [];
      let lastPlanHour: number = 0;
      let lastActHour: number = 0;
      let total_item: number = 0;
      let patan_additional: number = 0;
      const time = this.params.shift == '1' ? '07:15' : '20:00';
      let current_actual = moment(`${this.params.date} ${time}`, 'YYYY-MM-DD HH:mm');
      let current = moment(`${this.params.date} ${time}`, 'YYYY-MM-DD HH:mm');
      let current_plan = moment(`${this.params.date} ${time}`, 'YYYY-MM-DD HH:mm');
      let currentMachine = moment(`${this.params.date} ${time}`, 'YYYY-MM-DD HH:mm');

      let current_now = moment(`${this.params.date}`, 'YYYY-MM-DD HH:mm');

      this.formDetail.tpt_actual.map((item: any, index: number) => {
        if (this.formDetail.act_rh[index]) {
          if (!this.formDetail.is_tandem[index]) {
            const startActual = current_actual.format('YYYY-MM-DD HH:mm');
            current_actual = moment(current_actual, 'hh:mm:ss A').add(item ? item : 0, 'minutes');
            const endActual = current_actual.format('YYYY-MM-DD HH:mm');
            const breakTimeActual = utilityStore.mappingBreak(this.params, startActual, endActual);
            current_actual = moment(current_actual, 'hh:mm:ss').add(breakTimeActual, 'minutes');
            current_now = moment(current_now, 'hh:mm:ss A').add(item ? item : 0, 'minutes');

            const startMachine = currentMachine.format('YYYY-MM-DD HH:mm');
            currentMachine = moment(currentMachine, 'hh:mm:ss A').add(
              this.formDetail.tpt_machine[index] ? this.formDetail.tpt_machine[index] : 0,
              'minutes'
            );
            const endMachine = currentMachine.format('YYYY-MM-DD HH:mm');
            const breakTimeMachine = utilityStore.mappingBreak(this.params, startMachine, endMachine);
            currentMachine = moment(currentMachine, 'hh:mm:ss A').add(breakTimeMachine, 'minutes');
          }

          // Jika tandem dipilih maka total tpt tidak tidak menambahkan
          this.formDetail.hasil_tpt =
            (this.formDetail.repair_rh[index] > 1 || this.formDetail.reject_rh[index] > 1 || this.formDetail.act_rh[index] > 1) &&
            this.formDetail.is_tandem[index] == false
              ? this.formDetail.tpt_actual[index]
              : 0;
          this.formDetail.tpt_trial = this.formDetail.is_trial[index] == false ? this.formDetail.hasil_tpt : 0;

          array.push(this.formDetail.hasil_tpt);
          trial.push(this.formDetail.tpt_trial);
          // Jika Trial dipilih maka total pcs tidak ditambah
          this.formDetail.hasil_act_rh = this.formDetail.is_trial[index] == false ? this.formDetail.act_rh[index] : 0;

          act_rh_trial.push(this.formDetail.hasil_act_rh);

          this.formDetail.hasil_act_lh = this.formDetail.is_trial[index] == false ? this.formDetail.act_lh[index] : 0;

          act_lh_trial.push(this.formDetail.hasil_act_lh);

          this.formDetail.finish_actual[index] = this.formDetail.tpt_actual[index] !== '0' ? current_actual.format('HH : mm') : '';
          this.formDetail.finish_machine[index] = this.formDetail.tpt_machine[index] ? currentMachine.format('HH : mm') : '';
        }

        this.formDetail.total_lotsize_rh[index] =
          this.formDetail.act_rh[index] || this.formDetail.repair_rh[index] || this.formDetail.reject_rh[index]
            ? Number(this.formDetail.act_rh[index]) + Number(this.formDetail.repair_rh[index]) + Number(this.formDetail.reject_rh[index])
            : 0;

        this.formDetail.total_lotsize_lh[index] =
          this.formDetail.act_lh[index] || this.formDetail.repair_lh[index] || this.formDetail.reject_lh[index]
            ? Number(this.formDetail.act_lh[index]) + Number(this.formDetail.repair_lh[index]) + Number(this.formDetail.reject_lh[index])
            : 0;

        this.formDetail.accum_lotsize_rh = this.formDetail.total_lotsize_rh.reduce((a: number, b: number | string) => a + Number(b), 0);

        this.formDetail.accum_lotsize_lh = this.formDetail.total_lotsize_lh.reduce((a: number, b: number | string) => a + Number(b), 0);

        // Total pembagi repair
        this.formDetail.pembagi_repair[index] =
          this.formDetail.status[index] == 'FP'
            ? Number(this.formDetail.act_rh[index]) +
              Number(this.formDetail.act_lh[index]) +
              Number(this.formDetail.repair_rh[index]) +
              Number(this.formDetail.repair_lh[index])
            : 0;

        this.formDetail.total_pembagi_repair = this.formDetail.pembagi_repair.reduce((a: number, b: number | string) => a + Number(b), 0);

        // Total pembagi reject
        this.formDetail.pembagi_reject[index] = this.formDetail.total_lotsize_rh[index]
          ? Number(this.formDetail.total_lotsize_rh[index]) + Number(this.formDetail.total_lotsize_lh[index])
          : 0;

        this.formDetail.total_pembagi_reject = this.formDetail.pembagi_reject.reduce((a: number, b: number | string) => a + Number(b), 0);

        this.formDetail.stroke_plan[index] = this.formDetail.lot_rh[index] * this.formDetail.value_combination[index];

        this.formDetail.stroke_act[index] = this.formDetail.total_lotsize_rh[index]
          ? this.formDetail.total_lotsize_rh[index] * this.formDetail.act_process[index]
          : 0;

        this.formDetail.stroke_machine[index] = this.formDetail.qty_actual_machine[index]
          ? this.formDetail.qty_actual_machine[index] * this.formDetail.act_process[index]
          : 0;

        this.formDetail.total_dt[index] =
          Number(this.formDetail.dt_machines[index]) +
          Number(this.formDetail.dt_dies[index]) +
          Number(this.formDetail.dt_other[index]) +
          Number(this.formDetail.dt_material[index]);

        this.formDetail.gsph[index] =
          this.formDetail.stroke_act[index] && this.formDetail.tpt_actual[index] > 0
            ? (Number(this.formDetail.stroke_act[index]) /
                (Number(this.formDetail.act_process[index]) *
                  (Number(this.formDetail.tpt_actual[index]) - Number(this.formDetail.idletime[index])))) *
              60
            : '';
        this.formDetail.gsph_machine[index] =
          (Number(this.formDetail.stroke_machine[index]) /
            (Number(this.formDetail.act_process[index]) *
              (Number(this.formDetail.tpt_machine[index]) - Number(this.formDetail.idletime[index])))) *
          60;

        this.formDetail.total_sap[index] = Number(this.formDetail.sap_rh[index])
          ? Number(this.formDetail.sap_rh[index]) + Number(this.formDetail.sap_lh[index])
          : '';

        this.formDetail.patan[index] = this.patan;

        this.formDetail.total_tpt_actual = array.reduce((a: number, b: number | string) => a + Number(b), 0);

        this.formDetail.total_tpt_trial = trial.reduce((a: number, b: number | string) => a + Number(b), 0);

        this.formDetail.tpt_total = this.formDetail.tpt.reduce((a: number, b: number | string) => a + Number(b), 0);

        this.formDetail.total_stroke = this.formDetail.stroke_plan.reduce((a: number, b: number | string) => a + Number(b), 0);

        this.formDetail.total_lot_rh = this.formDetail.lot_rh.reduce((a: number, b: number | string) => a + Number(b), 0);

        this.formDetail.total_lot_lh = this.formDetail.lot_lh.reduce((a: number, b: number | string) => a + Number(b), 0);

        this.formDetail.total_sap_rh = this.formDetail.sap_rh.reduce((a: number, b: number | string) => a + Number(b), 0);

        this.formDetail.total_sap_lh = this.formDetail.sap_lh.reduce((a: number, b: number | string) => a + Number(b), 0);

        this.formDetail.accum_sap = this.formDetail.total_sap_rh + this.formDetail.total_sap_lh;

        this.formDetail.total_gap_rh = this.formDetail.gap_rh.reduce((a: number, b: number | string) => a + Number(b), 0);

        this.formDetail.total_gap_lh = this.formDetail.gap_lh.reduce((a: number, b: number | string) => a + Number(b), 0);

        this.formDetail.total_sum_act_rh = this.formDetail.sum_act_rh.reduce((a: number, b: number | string) => a + Number(b), 0);

        this.formDetail.total_stroke_actual = this.formDetail.stroke_act.reduce((a: number, b: number | string) => a + Number(b), 0);

        this.formDetail.total_act_rh = act_rh_trial.reduce((a: number, b: number | string) => a + Number(b), 0);

        this.formDetail.total_act_lh = act_lh_trial.reduce((a: number, b: number | string) => a + Number(b), 0);

        this.formDetail.accum_lkh = this.formDetail.accum_lotsize_rh + this.formDetail.accum_lotsize_lh;

        this.formDetail.total_repair_rh = this.formDetail.repair_rh.reduce((a: number, b: number | string) => a + Number(b), 0);

        this.formDetail.total_repair_lh = this.formDetail.repair_lh.reduce((a: number, b: number | string) => a + Number(b), 0);

        this.formDetail.total_reject_rh = this.formDetail.reject_rh.reduce((a: number, b: number | string) => a + Number(b), 0);

        this.formDetail.total_reject_lh = this.formDetail.reject_lh.reduce((a: number, b: number | string) => a + Number(b), 0);

        this.formDetail.total_dandori = this.formDetail.dandori.reduce((a: number, b: number | string) => a + Number(b), 0);

        this.formDetail.total_dt_machines = this.formDetail.dt_machines.reduce((a: number, b: number | string) => a + Number(b), 0);

        this.formDetail.total_dt_dies = this.formDetail.dt_dies.reduce((a: number, b: number | string) => a + Number(b), 0);

        this.formDetail.total_dt_other = this.formDetail.dt_other.reduce((a: number, b: number | string) => a + Number(b), 0);
        this.formDetail.total_dt_material = this.formDetail.dt_material.reduce((a: number, b: number | string) => a + Number(b), 0);

        this.formDetail.dt_total =
          this.formDetail.total_dt_machines +
          this.formDetail.total_dt_dies +
          this.formDetail.total_dt_other +
          this.formDetail.total_dt_material;

        this.formDetail.tpt_minutes = this.formDetail.total_tpt_actual / 60;

        this.formDetail.range_tpt = this.formDetail.tpt_minutes ? current_now.format('HH : mm') : '-';

        this.formDetail.total_idletime = this.formDetail.idletime.reduce((a: number, b: number | string) => a + Number(b), 0);

        // Hilangkan data kosong
        this.formDetail.keterangan_filter = this.formDetail.information.filter((item: any) => item);
        // Array to String
        this.formDetail.keterangan_sum = this.formDetail.keterangan_filter.join(', ');

        this.formDetail.plan_gsph_4 = (this.formDetail.total_stroke / (this.formDetail.tpt_total - 0) / 4) * 60;
        this.formDetail.plan_gsph_2 = (this.formDetail.total_stroke / (this.formDetail.tpt_total - 0) / 2) * 60;
        this.formDetail.plan_gsph_1 = (this.formDetail.total_stroke / (this.formDetail.tpt_total - 0) / 1) * 60;
        this.formDetail.plan_gsph_10 = (this.formDetail.total_stroke / (this.formDetail.tpt_total - 0) / 10) * 60;

        this.formDetail.total_gsph_4 =
          this.formDetail.total_tpt_actual > 0
            ? (this.formDetail.total_stroke_actual / (this.formDetail.total_tpt_actual - this.formDetail.total_idletime) / 4) * 60
            : '-';
        this.formDetail.total_gsph_3 =
          this.formDetail.total_tpt_actual > 0
            ? (this.formDetail.total_stroke_actual / (this.formDetail.total_tpt_actual - this.formDetail.total_idletime) / 3) * 60
            : '-';

        this.formDetail.total_gsph_2 =
          this.formDetail.total_tpt_actual > 0
            ? (this.formDetail.total_stroke_actual / (this.formDetail.total_tpt_actual - this.formDetail.total_idletime) / 2) * 60
            : '-';

        this.formDetail.total_gsph_1 =
          this.formDetail.total_tpt_actual > 0
            ? (this.formDetail.total_stroke_actual / (this.formDetail.total_tpt_actual - this.formDetail.total_idletime) / 1) * 60
            : '-';

        this.formDetail.total_gsph_10 =
          this.formDetail.total_tpt_actual > 0
            ? (this.formDetail.total_stroke_actual / (this.formDetail.total_tpt_actual - this.formDetail.total_idletime) / 17) * 60
            : '-';
        // TPT Trial
        this.formDetail.trial_gsph_4 =
          (this.formDetail.total_stroke_actual / (this.formDetail.total_tpt_trial - this.formDetail.total_idletime) / 4) * 60;

        this.formDetail.trial_gsph_2 =
          (this.formDetail.total_stroke_actual / (this.formDetail.total_tpt_trial - this.formDetail.total_idletime) / 2) * 60;

        this.formDetail.trial_gsph_1 =
          (this.formDetail.total_stroke_actual / (this.formDetail.total_tpt_trial - this.formDetail.total_idletime) / 1) * 60;

        this.formDetail.trial_gsph_10 =
          (this.formDetail.total_stroke_actual / (this.formDetail.total_tpt_trial - this.formDetail.total_idletime) / 17) * 60;

        const start = current.format('YYYY-MM-DD HH:mm');
        current = moment(current, 'hh:mm:ss A').add(this.formDetail.tpt[index] ? this.formDetail.tpt[index] : 0, 'minutes');
        current_plan = moment(current_plan, 'hh:mm:ss A').add(
          this.formDetail.tpt_actual[index] !== '0' && this.formDetail.tpt_actual[index] !== '' ? this.formDetail.tpt[index] : 0,
          'minutes'
        );
        const end = current.format('YYYY-MM-DD HH:mm');
        const breakTime = utilityStore.mappingBreak(this.params, start, end);
        current = moment(current, 'hh:mm:ss A').add(breakTime, 'minutes');
        current_plan = moment(current_plan, 'hh:mm:ss A').add(breakTime, 'minutes');
        this.formDetail.finish_plan[index] = this.formDetail.part_rh[index] ? current.format('HH : mm') : '';
        this.formDetail.finish_plan_current[index] =
          this.formDetail.tpt_actual[index] !== '0' && this.formDetail.tpt_actual[index] !== '' && this.formDetail.is_tandem[index] !== true
            ? this.formDetail.tpt[index]
            : '';

        this.formDetail.finish_actual_current[index] =
          this.formDetail.tpt_actual[index] !== '0' && this.formDetail.tpt_actual[index] !== '' && this.formDetail.is_tandem[index] == false
            ? this.formDetail.tpt_actual[index]
            : '';

        this.formDetail.actual_progress_now[index] =
          this.formDetail.tpt_actual[index] !== '0' && this.formDetail.tpt_actual[index] !== '' ? this.formDetail.tpt_actual[index] : '';

        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();

        let countPlan = 1;
        this.formDetail.finish_plan.forEach((time: any) => {
          if (time && typeof time === 'string') {
            const [hour, minute] = time.split(' : ').map((num: any) => Number(num));

            if (currentHour > hour || (hour === currentHour && currentMinute > minute)) {
              countPlan++;
            }
          }
        });

        total_std_item = countPlan;
        total_act_item = this.formDetail.actual_progress_now.filter((item: any) => item).length;

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
            .reduce((a: number, b: number | string) => a + Number(b), 0) +
          lotPlanLH.map(Number).reduce((a: number, b: number | string) => a + Number(b), 0);

        total_act_qty =
          lotActRH
            .map(Number) // Mengubah setiap elemen menjadi angka
            .reduce((a: number, b: number | string) => a + Number(b), 0) +
          lotActLH.map(Number).reduce((a: number, b: number | string) => a + Number(b), 0);

        total_item = this.formDetail.part_rh.filter((item: any) => item).length;
        patan_additional = this.formDetail.additional.filter((value: any) => value !== '0' && value !== '').length;
      });

      this.formAttendance.present;

      this.line.total_std_item = total_std_item;
      this.line.total_act_item = total_act_item;
      this.line.total_std_qty = total_std_qty;
      this.line.total_act_qty = total_act_qty;
      this.line.total_std_time = lastPlanHour;
      this.line.total_act_time = lastActHour;
      this.line.persentase_std = (total_std_qty / (this.formDetail.total_lot_rh + this.formDetail.total_lot_lh)) * 100;
      this.line.persentase_act = total_act_qty ? (total_act_qty / (this.formDetail.total_lot_rh + this.formDetail.total_lot_lh)) * 100 : 0;

      this.line.persentase_tpt = this.formDetail.total_tpt_actual
        ? (this.formDetail.total_tpt_actual / this.formDetail.tpt_total) * 100
        : 0;

      this.line.total_item = total_item;
      this.line.patan_additional = patan_additional;
      this.line.persentase_patan = total_item ? ((total_item - patan_additional) / total_item) * 100 : 0;

      this.formDetail.finish_plan.filter((item: any) => item);
      this.line.finish_plan = this.formDetail.finish_plan.filter((item: any) => item).pop();
      this.formDetail.finish_plan_current.filter((item: any) => item);
      this.line.finish_plan_current = this.formDetail.finish_plan_current
        .filter((item: any) => item)
        .reduce((a: number, b: number | string) => a + Number(b), 0);
      this.formDetail.finish_actual.filter((item: any) => item);
      this.line.finish_actual_current = this.formDetail.finish_actual_current
        .filter((item: any) => item)
        .reduce((a: number, b: number | string) => a + Number(b), 0);

      this.formDetail.hadir.filter((item: any) => item);
      this.line.hadir = this.formDetail.hadir.filter((item: any) => item).shift();
      this.formDetail.izin.filter((item: any) => item);
      this.line.izin = this.formDetail.izin.filter((item: any) => item).shift();
      this.formDetail.sakit.filter((item: any) => item);
      this.line.sakit = this.formDetail.sakit.filter((item: any) => item).shift();
      total_repair =
        this.formDetail.total_repair_rh || this.formDetail.total_repair_lh
          ? this.formDetail.total_repair_rh + this.formDetail.total_repair_lh
          : 0;

      this.line.total_repair = total_repair;
      total_reject = this.formDetail.total_reject_rh + this.formDetail.total_reject_lh;

      this.line.total_reject = total_reject;
      this.line.total_part_plan = qty_plan;
      this.line.total_part_actual = qty_actual;
      this.line.good_actual = 100 - this.line.repair_actual - this.line.reject_actual;

      this.line.qty_ok = Number(this.formDetail.total_act_rh) + Number(this.formDetail.total_act_lh);

      this.line.ok_persen =
        (Number(this.line.qty_ok) / (Number(this.formDetail.total_act_rh) + Number(this.formDetail.total_act_lh))) * 100;

      this.line.repair_persen =
        (Number(total_repair) / (Number(this.formDetail.total_act_rh) + Number(this.formDetail.total_act_lh))) * 100;

      this.line.reject_persen =
        (Number(total_reject) / (Number(this.formDetail.total_act_rh) + Number(this.formDetail.total_act_lh))) * 100;
    },
    loadDataDetailEdit(line: any) {
      // const utilityStore = useUtilityStore();

      this.line = line;
      const item = line.detail ?? [];
      const att = line.attendance ?? [];

      this.dialog.detail = true;
      this.line_id = line.line_id;
      this.is_done = line.is_done;
      this.statusForm = { user: '', status: false };
      // RESET FORM
      this.formAttendance = {
        standard: [],
        present: [],
        leave: [],
        exchange_day: [],
        permit: [],
        sick: [],
        absent: []
      };

      this.formDetail = {
        hadir: [],
        izin: [],
        sakit: [],
        ganti_hari: [],
        jumlah_mesin: [],
        e_kanban: Array.from({ length: 15 }, () => []),
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
        cm_dt_machines: [],
        cm_dt_dies: [],
        cm_dt_other: [],
        cm_dt_material: [],
        status_dt_machines: [],
        status_dt_dies: [],
        status_dt_other: [],
        status_dt_material: [],
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
        zbehmg_lh: []
      } as unknown as FormDetail;

      const arrVar = ['machine', 'process'];

      let loop = 0;

      while (loop < (item.length > 12 ? item.length : 13)) {
        (Object.entries(this.formDetail) as [keyof typeof this.formDetail, any][]).forEach(([key]) => {
          if (item[loop]) {
            if (['is_tandem', 'is_trial', 'is_terusan'].includes(key as string)) {
              (this.formDetail[key] as any[])[loop] = item[loop][key] === '1' || item[loop][key] === 1;
            } else if (arrVar.includes(key as string)) {
              (this.formDetail[key] as any[])[loop] = item[loop][key] ? item[loop][key].split(' ') : [];
            } else {
              (this.formDetail[key] as any[])[loop] = item[loop][key] ?? '';
            }
          } else {
            (this.formDetail[key] as any[])[loop] = ['is_tandem', 'is_trial', 'is_terusan'].includes(key as string)
              ? false
              : arrVar.includes(key as string)
                ? []
                : '';
          }
        });

        loop++;
      }

      let i = 0;
      while (i < att.length) {
        (Object.entries(this.formAttendance) as [keyof typeof this.formAttendance, any][]).forEach(([key]) => {
          (this.formAttendance[key] as any[])[i] = att[i]?.[key] ?? '';
        });
        i++;
      }

      // if (
      //   !this.view &&
      //   this.dialog.detail &&
      //   utilityStore.isCurrentTimeBetween("15:00", "16:20")
      // )
      this.countDataActual();
    },
    loadDataLed(line: AchievementLine): void {
      this.dialog.formLed = true;

      if (!this.dialog.detail) {
        this.loadDataDetailEdit(line);
        this.dialog.detail = false;
      }
    },
    loadDataDetailKanban(line: any) {
      this.line = line;
      this.line_id = line.line_id;
      this.is_done = line.is_done;
      this.dialog.formKanban = true;

      const items = line.detail || [];
      const attendance = line.attendance || [];

      this.formAttendance = {
        standard: [],
        present: [],
        leave: [],
        exchange_day: [],
        permit: [],
        sick: [],
        absent: []
      };

      this.formDetail = {
        hadir: [],
        izin: [],
        sakit: [],
        ganti_hari: [],
        jumlah_mesin: [],
        e_kanban: Array.from({ length: 15 }, () => []),
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
        cm_dt_machines: [],
        cm_dt_dies: [],
        cm_dt_other: [],
        cm_dt_material: [],
        status_dt_machines: [],
        status_dt_dies: [],
        status_dt_other: [],
        status_dt_material: [],
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
        zbehmg_lh: []
      } as unknown as FormDetail;

      const maxLoop = Math.max(items.length, 13);
      const arrayField = ['machine', 'process'];

      for (let i = 0; i < maxLoop; i++) {
        const row = items[i];

        (Object.keys(this.formDetail) as Array<keyof typeof this.formDetail>).forEach((key) => {
          const target = this.formDetail[key] as any[];

          if (row) {
            if (key === 'is_tandem' || key === 'is_trial' || key === 'is_terusan') {
              target[i] = row[key] === '1' || row[key] === 1;
            } else if (arrayField.includes(key as string)) {
              target[i] = row[key] ? String(row[key]).split(' ') : [];
            } else {
              target[i] = row[key] ?? '';
            }
          } else {
            if (key === 'is_tandem' || key === 'is_trial' || key === 'is_terusan') {
              target[i] = false;
            } else if (arrayField.includes(key as string)) {
              target[i] = [];
            } else {
              target[i] = '';
            }
          }
        });
      }

      (attendance as any[]).forEach((row, i) => {
        (Object.keys(this.formAttendance) as Array<keyof typeof this.formAttendance>).forEach((key) => {
          const target = this.formAttendance[key] as any[];
          target[i] = row?.[key] ?? '';
        });
      });

      this.countDataActual();
    },
    rePrintKanban(payload: ReprintKanbanPayload) {
      const printData = {
        time: this.params.clock,
        shift: this.params.shift,
        date: this.params.date,
        part_number: [payload.part_rh, payload.part_lh].filter((v): v is string => Boolean(v)),
        username: payload.username,
        index: payload.qtyOk
      };

      sessionStorage.setItem('printData', JSON.stringify(printData));

      window.open(`http://${configStore.apiUrl}/mims/production/print-e-kanban`, '_blank');
    },
    async fetchDataLineforSAP() {
      this.isLoading = true;

      try {
        const payload = {
          date: this.params.date,
          shift: String(this.params.shift)
        };
        const response = await stampingProdService.fetchDataAchievementSAP(payload);

        if (response.status === 200) {
          if (response.data.status) {
            this.lines = response.data.data.map((data: any) => {
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

              const time = this.params.shift == 1 ? '07:15' : '20:00';

              let current_actual = moment(`${this.params.date} ${time}`, 'YYYY-MM-DD HH:mm');
              let current_machine = moment(`${this.params.date} ${time}`, 'YYYY-MM-DD HH:mm');
              let current = moment(`${this.params.date} ${time}`, 'YYYY-MM-DD HH:mm');

              data.detail = data.detail.map((item: any) => {
                if (item.part_rh) {
                  downtime += parseFloat(item.downtime || 0);
                  repair += parseFloat(item.repair || 0);
                  reject += parseFloat(item.reject || 0);
                  qty_actual += parseFloat(item.qty_actual || 0);

                  if (item.is_tandem == '0') {
                    if (item.is_trial == '0') {
                      idletime += parseFloat(item.idletime || 0);
                      total_qty_gsph += parseFloat(item.qty_actual || 0);
                      total_tpt += parseFloat(item.tpt_actual || 0);
                    }

                    const startActual = current_actual.format('YYYY-MM-DD HH:mm');
                    current_actual = moment(current_actual).add(item.tpt_actual || 0, 'minutes');
                    const endActual = current_actual.format('YYYY-MM-DD HH:mm');

                    const breakTimeActual = utilityStore.mappingBreak(this.params, startActual, endActual);

                    current_actual = moment(current_actual).add(breakTimeActual, 'minutes');

                    item.finish_actual = item.tpt_actual ? current_actual.format('HH : mm') : '-';
                  }
                }

                stroke += parseFloat(item.stroke_plan || 0);
                lot_rh += parseFloat(item.lot_rh || 0);
                lot_lh += parseFloat(item.lot_lh || 0);
                tpt += parseFloat(item.tpt || 0);

                stroke_actual = item.act_rh ? parseInt(item.act_rh) * parseInt(item.act_process) : 0;
                total_stroke_actual += stroke_actual;

                item.stroke_actual = stroke_actual;
                act_rh += parseFloat(item.act_rh || 0);
                act_lh += parseFloat(item.act_lh || 0);
                dandori += parseFloat(item.dandori || 0);

                dt_machines += parseFloat(item.dt_machines || 0);
                dt_dies += parseFloat(item.dt_dies || 0);
                dt_other += parseFloat(item.dt_other || 0);
                tpt_actual += parseFloat(item.tpt_actual || 0);

                const current_repair = item.repair_rh ? parseInt(item.repair_rh) + parseInt(item.repair_lh) : 0;
                total_repair += current_repair;

                const current_reject = item.reject_rh ? parseInt(item.reject_rh) + parseInt(item.reject_lh) : 0;
                total_reject += current_reject;

                item.total_gsph = (item.stroke_actual / (item.value_combination * item.tpt_actual)) * 60;
                if (!isFinite(item.total_gsph)) item.total_gsph = 0;

                const startMachine = current_machine.format('YYYY-MM-DD HH:mm');
                current_machine = moment(current_machine).add(item.tpt_machine || 0, 'minutes');
                const endMachine = current_machine.format('YYYY-MM-DD HH:mm');
                const breakTimeMachine = utilityStore.mappingBreak(this.params, startMachine, endMachine);
                current_machine = moment(current_machine).add(breakTimeMachine, 'minutes');

                item.finish_machine = item.tpt_machine ? current_machine.format('HH : mm') : '-';

                // Kalkulasi Plan Time
                qty_plan += parseFloat(item.lotsize || 0);
                const start = current.format('YYYY-MM-DD HH:mm');
                current = moment(current).add(item.tpt || 0, 'minutes');
                const end = current.format('YYYY-MM-DD HH:mm');
                const breakTime = utilityStore.mappingBreak(this.params, start, end);
                current = moment(current).add(breakTime, 'minutes');

                item.finish_plan = item.job_number ? current.format('HH : mm') : '-';

                return item;
              });

              data.gsph_actual = total_qty_gsph && total_tpt ? (total_qty_gsph / (total_tpt - idletime)) * 60 : 0;
              data.cycle_time_actual = total_qty_gsph && total_tpt ? ((total_tpt - idletime) / total_qty_gsph) * 60 : 0;

              data.downtime_actual = downtime;
              data.idletime_actual = idletime;
              data.total_part_plan = qty_plan;
              data.total_part_actual = qty_actual;

              data.repair_actual = qty_actual && repair ? (repair / qty_actual) * 100 : 0;
              data.reject_actual = qty_actual && reject ? (reject / qty_actual) * 100 : 0;
              data.good_actual = 100 - data.repair_actual - data.reject_actual;

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

              gsph_total = (stroke_actual / (4 * tpt_actual)) * 60;
              data.total_gsph = (total_stroke_actual / (4 * tpt_actual)) * 60;
              if (!isFinite(data.total_gsph)) data.total_gsph = 0;

              data.reject = total_reject;
              data.repair = total_repair;

              const total_act = parseInt(String(act_rh)) + parseInt(String(act_lh));
              data.qty_ok = total_act;

              data.ok_persen = total_act > 0 ? (total_act / total_act) * 100 : 0;

              data.repair_persen = total_act > 0 ? (total_repair / total_act) * 100 : 0;
              data.reject_persen = total_act > 0 ? (total_reject / total_act) * 100 : 0;

              data.expand = false;

              return data;
            });
          } else {
            utilityStore.onApiResponse(response);
            this.lines = response.data.data.map((data: any) => {
              data.detail = [];
              return data;
            });
          }
        } else {
          utilityStore.onApiResponse(response);
        }
      } catch (error: any) {
        utilityStore.onError(error);
      } finally {
        this.isLoading = false;
        setTimeout(() => {
          this.dialog.filter = false;
        }, 500);
      }
    },
    async fetchDataLine(type?: string) {
      const notificationStore = useNotificationStore();
      const utilityStore = useUtilityStore();

      if (!type) notificationStore.loading = true;

      try {
        const res = await stampingProdService.fetchDataLines(this.params);

        this.lines = res;

        this.patan = res.length > 0 ? res[0].patan : '';
      } catch (error) {
        utilityStore.onError(error);
      } finally {
        notificationStore.disableLoading();
      }
    },
    async fetchDataPart() {
      const notificationStore = useNotificationStore();

      notificationStore.loading = true;

      try {
        this.partItems = await stampingProdService.fetchPartItems();
      } finally {
        notificationStore.disableLoading();
      }
    },
    async openForm(line?: AchievementLine): Promise<void> {
      const target = line ?? this.line;

      stampingProdService.openForm({
        line_id: target.line_id,
        date: this.params.date,
        shift: String(this.params.shift),
        patan: this.patan
      });
    },
    async checkForm(userNow: string) {
      const notificationStore = useNotificationStore();
      const utilityStore = useUtilityStore();

      const id = this.line_id;
      const date = this.params.date;
      const shift = this.params.shift;
      const user = userNow;

      try {
        const response = await stampingProdService.checkForm({
          line_id: id,
          date: date,
          shift: shift
        });

        this.statusForm = response.data;

        if (this.statusForm?.user !== user && response.data.status === false) {
          utilityStore.onApiResponse(response);
          notificationStore.disableLoading();
        }
      } catch (error) {
        utilityStore.onError(error);
      }
    },
    async loadDataKanban(line: AchievementLine, status?: boolean) {
      try {
        notificationStore.loading = true;

        const response = await stampingProdService.KanbanStatusWait(line.line_id, this.params);

        if (!status && response) {
          await this.fetchDataLineRefreshKanban(line.line_id, this.params.date);
        }
      } catch (error) {
        console.error('Error loading Kanban data:', error);
      } finally {
        notificationStore.loading = false;
      }
    },
    async fetchDataLineRefreshKanban(id: string, date: string) {
      notificationStore.loading = true;

      try {
        const data = await stampingProdService.fetchDataLineRefreshKanban(id, date, this.params);

        if (!data) return;

        if (data.status) {
          this.loadDataDetailKanban(data.data);
        } else {
          utilityStore.onApiResponse({ data });
        }
      } catch (error) {
        console.error(error);
      } finally {
        notificationStore.disableLoading();
      }
    },
    async onSaveDetail() {
      const notificationStore = useNotificationStore();

      try {
        notificationStore.loading = true;
        const formData = new FormData();

        Object.keys(this.formDetail).forEach((key) => {
          const values = this.formDetail[key as keyof FormDetail];

          if (Array.isArray(values)) {
            values.forEach((val) => {
              if (key === 'is_tandem' || key === 'is_trial' || key === 'is_terusan') {
                // Hanya boolean true / string '1' yang dianggap tercentang —
                // string '0'/'false' truthy di JS/PHP dan pernah menyebabkan tandem terceklist semua
                formData.append(`${key}[]`, val === true || val === '1' || val === 1 ? '1' : '0');
              } else {
                formData.append(`${key}[]`, val ?? '');
              }
            });
          }
        });

        Object.keys(this.formAttendance).forEach((key) => {
          const values = this.formAttendance[key as keyof FormAttendance];

          if (Array.isArray(values)) {
            values.forEach((val) => {
              formData.append(`${key}[]`, String(val ?? ''));
            });
          }
        });

        formData.append('line_id', this.line_id);
        formData.append('date', this.params.date);
        formData.append('shift', String(this.params.shift));
        formData.append('patan', this.patan);
        formData.append('is_done', this.is_done);

        if (this.formDetail.hadir?.length) {
          formData.append('hadir', String(this.formDetail.hadir.length));
        }

        const response = await stampingProdService.saveDetail(formData);

        utilityStore.onApiResponse(response);

        if (response.data?.additional_info) {
          notificationStore.onApiResponseToastAlertAdditional(response);
        }

        console.log(socket);
        socket.emit('updateAcievement', this.line_id);
      } catch (error) {
        utilityStore.onError(error);
      } finally {
        notificationStore.loading = false;
      }
    },
    async fetchDataLineByID(id: string) {
      notificationStore.loading = true;

      try {
        const response = await stampingProdService.fetchDataLineByID(id);

        if (response.status !== 200) {
          utilityStore.onApiResponse(response);
          return;
        }

        if (response.data?.status) {
          this.loadDataDetailEdit(response.data.data);

          setTimeout(() => {
            notificationStore.disableResponse();
          }, 3000);
        } else {
          utilityStore.onApiResponse(response);
        }
      } catch (error) {
        utilityStore.onError(error);
      } finally {
        notificationStore.disableLoading();
      }
    },
    async onDelete(urut: string | number) {
      const lineId = this.line_id;

      try {
        const response = await stampingProdService.deleteAchievementData({
          line_id: this.line_id,
          date: this.params.date,
          shift: String(this.params.shift),
          patan: this.patan,
          urut
        });

        notificationStore.onApiResponseToastAlert(response, () => this.fetchDataLineRefresh(lineId, this.params.date));
      } catch (error) {
        utilityStore.onError(error);
      }
    },
    async fetchDataLineRefresh(lineId: string, date: string) {
      notificationStore.loading = true;

      const savedStatusForm = { ...this.statusForm };
      try {
        const response = await stampingProdService.fetchDataLineRefresh(lineId, date, this.params);

        if (response.status !== 200) {
          utilityStore.onApiResponse(response);
          return;
        }

        if (response.data?.status) {
          this.loadDataDetailEdit(response.data.data);
          this.statusForm = savedStatusForm;
        } else {
          utilityStore.onApiResponse(response);
        }
      } catch (error) {
        utilityStore.onError(error);
      } finally {
        notificationStore.disableLoading();
      }
    },
    async onMove(to: string, urut: string | number) {
      const lineId = this.line_id;

      try {
        const response = await stampingProdService.moveAchievementData({
          line_id: this.line_id,
          date: this.params.date,
          shift: String(this.params.shift),
          urut,
          move: to
        });

        notificationStore.onApiResponseToastAlert(response, () => this.fetchDataLineRefresh(lineId, this.params.date));
      } catch (error) {
        utilityStore.onError(error);
      }
    },
    async startItem(part_rh: string, urut_plan: string | number) {
      try {
        const response = await stampingProdService.startRunningItem({
          part_rh,
          urut_plan,
          line_id: this.line_id,
          date: this.params.date,
          shift: String(this.params.shift)
        });

        notificationStore.onApiResponseToastAlert(response);

        if ((window as any).$socket) {
          (window as any).$socket.emit('updateAcievement', this.line_id);
        }

        await this.fetchDataLineRefresh(this.line_id, this.params.date);
      } catch (error) {
        utilityStore.onError(error);
      }
    },
    async onEmptyKanban(totalKanban: string | number, part_rh?: string | null, part_lh?: string | null) {
      notificationStore.loading = true;

      try {
        const response = await stampingProdService.setKanbanToEmpty({
          part_rh,
          part_lh,
          total_kanban: totalKanban,
          line_id: this.line_id,
          date: this.params.date,
          shift: String(this.params.shift),
          patan: this.patan
        });

        if (response.status === 200) {
          utilityStore.onApiResponse(response);

          await this.fetchDataLineRefreshKanban(this.line_id, this.params.date);
        }
      } catch (error) {
        utilityStore.onError(error);
      } finally {
        notificationStore.loading = false;
      }
    },
    async onSaveMachine() {
      notificationStore.loading = true;

      try {
        const formData = new FormData();

        Object.keys(this.formDetail).forEach((key) => {
          const values = this.formDetail[key as keyof FormDetail];

          if (Array.isArray(values)) {
            values.forEach((val) => {
              if (key === 'is_tandem' || key === 'is_trial' || key === 'is_terusan') {
                // Boolean false tidak boleh terkirim sebagai string "false" (truthy di PHP)
                formData.append(`${key}[]`, val === true || val === '1' || val === 1 ? '1' : '0');
              } else {
                formData.append(`${key}[]`, val ?? '');
              }
            });
          }
        });

        formData.append('line_id', this.line_id);
        formData.append('date', this.params.date);
        formData.append('shift', String(this.params.shift));
        formData.append('patan', this.patan);

        const response = await stampingProdService.saveDetail(formData);

        notificationStore.onApiResponseToastAlert(response, this.resetForm);

        if ((window as any).$socket) {
          (window as any).$socket.emit('updateAcievement', this.line_id);
        }
      } catch (error) {
        utilityStore.onError(error);
      } finally {
        notificationStore.loading = false;
      }
    },
    async stopItem(part_rh: string, urut_plan: string | number) {
      const notificationStore = useNotificationStore();
      const utilityStore = useUtilityStore();

      notificationStore.loading = true;

      try {
        const response = await stampingProdService.stopRunningItem({
          part_rh,
          urut_plan,
          line_id: this.line_id,
          date: this.params.date,
          shift: this.params.shift
        });

        notificationStore.onApiResponseToastAlert(response);

        socket.emit('updateAcievement', this.line_id);
        await this.fetchDataLineRefresh(this.line_id, this.params.date);
      } catch (error) {
        utilityStore.onError(error);
      } finally {
        notificationStore.loading = false;
      }
    },
    async startProcess(part_rh: string, urut_plan: string | number) {
      const notificationStore = useNotificationStore();
      const utilityStore = useUtilityStore();

      notificationStore.loading = true;

      try {
        const response = await stampingProdService.startProcessItem({
          part_rh,
          urut_plan,
          line_id: this.line_id,
          date: this.params.date,
          shift: this.params.shift
        });

        notificationStore.onApiResponseToastAlert(response);

        socket.emit('updateAcievement', this.line_id);
        await this.fetchDataLineRefresh(this.line_id, this.params.date);
      } catch (error) {
        utilityStore.onError(error);
      } finally {
        notificationStore.loading = false;
      }
    },
    async stopProcess(part_rh: string, urut_plan: string | number) {
      const notificationStore = useNotificationStore();
      const utilityStore = useUtilityStore();

      notificationStore.loading = true;

      try {
        const response = await stampingProdService.stopProcessItem({
          part_rh,
          urut_plan,
          line_id: this.line_id,
          date: this.params.date,
          shift: this.params.shift
        });

        notificationStore.onApiResponseToastAlert(response);

        socket.emit('updateAcievement', this.line_id);
        await this.fetchDataLineRefresh(this.line_id, this.params.date);
      } catch (error) {
        utilityStore.onError(error);
      } finally {
        notificationStore.loading = false;
      }
    },
    async onSaveStart() {
      const notificationStore = useNotificationStore();
      notificationStore.loading = true;

      try {
        const response = await stampingProdService.kanbanStart({
          line_id: this.line_id,
          date: this.params.date,
          shift: this.params.shift,
          patan: this.patan,
          part_number_rh: this.part_number_rh,
          part_number_lh: this.part_number_lh,
          lot_size_rh: this.lot_size_rh,
          urut: this.urut,
          machine: this.formData.machine,
          process: this.formData.process
        });

        notificationStore.onApiResponseToastAlert(response, this.resetForm);
      } catch (err) {
        utilityStore.onError(err);
      } finally {
        notificationStore.disableLoading();
      }
    },
    async printEKanban(part_rh: string, part_lh: string | null, username: string, qtyOk: number) {
      const notificationStore = useNotificationStore();
      const utilityStore = useUtilityStore();
      const configStore = useConfigStore();

      notificationStore.loading = true;

      try {
        const response = await stampingProdService.printEKanban({
          date: this.params.date,
          shift: this.params.shift,
          part_numbers: [part_rh, part_lh].filter(Boolean) as string[],
          username,
          qty_ok: qtyOk
        });

        notificationStore.disableLoading();

        if (response.data?.status === true) {
          // simpan ke session storage (UNCHANGED)
          sessionStorage.setItem(
            'printData',
            JSON.stringify({
              time: this.params.clock,
              shift: this.params.shift,
              date: this.params.date,
              part_number: [part_rh, part_lh].filter(Boolean),
              username,
              index: qtyOk
            })
          );

          utilityStore.onApiResponse(response, () => {
            window.open(`http://${configStore.apiUrl}/mims/production/print-e-kanban`, '_blank');
            this.fetchDataLineRefreshKanban(this.line_id, this.params.date);
          });
        } else {
          utilityStore.onApiResponse(response);
        }
      } catch (err) {
        configStore.onError(err);
      } finally {
        notificationStore.disableLoading();
      }
    },
    async cancelEkanban(part_rh: string, part_lh: string, username: string, qtyOk: number) {
      const notificationStore = useNotificationStore();
      const utilityStore = useUtilityStore();

      notificationStore.loading = true;

      try {
        const response = await stampingProdService.cancelEkanban({
          date: this.params.date,
          shift: this.params.shift,
          part_rh,
          part_lh,
          username,
          qty_ok: qtyOk
        });

        notificationStore.disableLoading();
        utilityStore.onApiResponse(response);

        await this.fetchDataLineRefreshKanban(this.line_id, this.params.date);
      } catch (error) {
        notificationStore.disableLoading();
        const configStore = useConfigStore();
        configStore.onError(error);
      }
    },
    async onAddLine() {
      const notificationStore = useNotificationStore();

      notificationStore.loading = true;

      try {
        const response = await stampingProdService.addLine({
          date: this.params.date,
          shift: this.params.shift,
          patan: this.patan,
          line_id: this.params.line_id
        });

        notificationStore.onApiResponseToastAlert(response, this.resetForm);

        socket.emit('updateAcievement', this.line_id);
      } catch (error) {
        const configStore = useConfigStore();
        configStore.onError(error);
      }
    },
    async closeForm() {
      const notificationStore = useNotificationStore();

      notificationStore.loading = true;

      try {
        await stampingProdService.closeForm({
          line_id: this.line_id,
          date: this.params.date,
          shift: this.params.shift,
          patan: this.patan
        });
      } catch (error) {
        const configStore = useConfigStore();
        configStore.onError(error);
      } finally {
        notificationStore.loading = false;
      }
    },
    async closeRefreshForm(userNow: string) {
      const notificationStore = useNotificationStore();

      notificationStore.loading = true;

      try {
        await stampingProdService.closeRefreshForm({
          line_id: this.line_id,
          date: this.params.date,
          shift: this.params.shift,
          patan: this.patan,
          user_open: userNow
        });

        this.resetForm();
      } catch (error) {
        const configStore = useConfigStore();
        configStore.onError(error);
      } finally {
        notificationStore.loading = false;
      }
    },
    async fetchDataKanbanSTP() {
      const utilityStore = useUtilityStore();
      const configStore = useConfigStore();

      try {
        const response = await stampingProdService.fetchKanbanSTP(this.params);

        if (response.status) {
          this.lines = response.data.map((data: any) => {
            let total_lkh = 0;
            let total_sap = 0;

            this.patan = data.patan;

            data.detail = data.detail.map((item: any) => {
              const lkh =
                (parseInt(item.total_prod_rh_shift1 || '0') || 0) +
                (parseInt(item.total_prod_rh_shift2 || '0') || 0) +
                (parseInt(item.total_prod_lh_shift1 || '0') || 0) +
                (parseInt(item.total_prod_lh_shift2 || '0') || 0);

              const sap =
                (parseInt(item.SAP_RH_SHIFT1 || '0') || 0) +
                (parseInt(item.SAP_RH_SHIFT2 || '0') || 0) +
                (parseInt(item.SAP_LH_SHIFT1 || '0') || 0) +
                (parseInt(item.SAP_LH_SHIFT2 || '0') || 0);

              total_lkh += lkh;
              total_sap += sap;

              return item;
            });

            return {
              ...data,
              total_lkh,
              total_sap,
              expand: false
            };
          });

          this.dialog.filter = false;
        } else {
          utilityStore.onApiResponse(response);

          this.lines = response.data.map((data: any) => ({
            ...data,
            detail: []
          }));
        }

        configStore.page.name = `Achievement Kanban Stamping (${utilityStore.formatDate(this.params.date)})`;
      } catch (error) {
        utilityStore.onError(error);
      }
    },

    async fetchDataKanbanWLD() {
      const utilityStore = useUtilityStore();
      const configStore = useConfigStore();

      try {
        const response = await stampingProdService.fetchKanbanWLD(this.params);

        if (response.status) {
          this.lines = response.data.map((data: any) => {
            let total_lkh = 0;
            let total_sap = 0;

            data.detail = data.detail.map((item: any) => {
              const lkh = (parseInt(item.ACT_SHIFT1 || '0') || 0) + (parseInt(item.ACT_SHIFT2 || '0') || 0);

              const sap = (parseInt(item.ZQTY_SAP_ZSHIFT1 || '0') || 0) + (parseInt(item.ZQTY_SAP_ZSHIFT2 || '0') || 0);

              total_lkh += lkh;
              total_sap += sap;

              return item;
            });

            return {
              ...data,
              total_lkh,
              total_sap,
              expand: false
            };
          });

          this.dialog.filter = false;
        } else {
          utilityStore.onApiResponse(response);

          this.lines = response.data.map((data: any) => ({
            ...data,
            detail: []
          }));
        }

        configStore.page.name = `Achievement Kanban Welding (${utilityStore.formatDate(this.params.date)})`;
      } catch (error) {
        utilityStore.onError(error);
      }
    },
    // start Achievement Kanban
    loadDataEditSAP(line: any) {
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
        gsph_machine: [],
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
        cm_dt_machines: [],
        cm_dt_dies: [],
        cm_dt_other: [],
        cm_dt_material: [],
        status_dt_machines: [],
        status_dt_dies: [],
        status_dt_other: [],
        status_dt_material: [],
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
        total_lkh: 0
      } as unknown as FormDetail;

      const booleanKeys = new Set(['is_tandem', 'is_trial', 'is_terusan']);

      const arrayKeys = new Set(['keterangan_sap']);

      const summaryKeys = new Set<keyof FormDetail>(['total_sap', 'total_lkh']);

      let loop = 0;
      const maxLoop = item.length > 13 ? item.length : 13;

      while (loop < maxLoop) {
        const row = item[loop];

        (Object.keys(this.formDetail) as Array<keyof FormDetail>).forEach((key) => {
          if (summaryKeys.has(key)) return;

          const formField = this.formDetail[key] as any[];

          if (row) {
            if (booleanKeys.has(key as string)) {
              formField[loop] = row[key] === '1' || row[key] === 1;
            } else if (arrayKeys.has(key as string)) {
              formField[loop] = row[key] ? String(row[key]).split(',') : [];
            } else {
              formField[loop] = row[key] ?? '';
            }
          } else {
            if (booleanKeys.has(key as string)) {
              formField[loop] = false;
            } else if (arrayKeys.has(key as string)) {
              formField[loop] = [];
            } else {
              formField[loop] = '';
            }
          }
        });

        loop++;
      }
      this.countDataActual();
    },
    async fetchDataSAPKBN(TAG: 'LKH-STP' | 'LKH-WLD') {
      const notificationStore = useNotificationStore();
      const utilityStore = useUtilityStore();
      const stampingStore = useStampingAchievementProdStore();

      try {
        notificationStore.loading = true;

        await stampingProdService.fetchDataSAPKBN(TAG, this.params);

        notificationStore.disableLoading();

        if (TAG === 'LKH-STP') {
          stampingStore.fetchDataKanbanSTP();
        } else if (TAG === 'LKH-WLD') {
          stampingStore.fetchDataKanbanWLD();
        }
      } catch (error) {
        notificationStore.disableLoading();
        utilityStore.onError(error);
      }
    },
    // End Achievement Kanban
    // Start Achievement SAP
    async fetchDataSAP() {
      const notificationStore = useNotificationStore();
      const utilityStore = useUtilityStore();

      notificationStore.loading = true;

      try {
        const payload = {
          date: this.params.date,
          shift: String(this.params.shift)
        };

        const response = await stampingProdService.DataSAP(payload);

        if (response.status === 200) {
          await this.fetchDataLineforSAP();
        } else {
          utilityStore.onApiResponse(response);
        }
      } catch (error: any) {
        utilityStore.onError(error);
      } finally {
        notificationStore.disableLoading();
      }
    },
    async onSaveDetailSAP(payload: SaveDetailSAP): Promise<boolean> {
      const notificationStore = useNotificationStore();
      const utilityStore = useUtilityStore();

      this.isLoading = true;
      notificationStore.loading = true;

      const data = new FormData();

      for (const key in payload.formDetail) {
        if (Object.prototype.hasOwnProperty.call(payload.formDetail, key)) {
          const arr = payload.formDetail[key];
          if (Array.isArray(arr)) {
            arr.forEach((val) => {
              if (key === 'is_tandem' || key === 'is_trial' || key === 'is_terusan') {
                // Boolean false tidak boleh terkirim sebagai string "false" (truthy di PHP)
                data.append(`${key}[]`, val === true || val === '1' || val === 1 ? '1' : '0');
              } else {
                data.append(`${key}[]`, val !== null && val !== undefined ? val : '');
              }
            });
          }
        }
      }

      data.append('line_id', payload.line_id);
      data.append('date', payload.date);
      data.append('shift', payload.shift);
      data.append('patan', payload.patan);
      data.append('is_done', String(payload.is_done));

      try {
        const response = await stampingProdService.saveAchievementSAP(data);

        if (response.status === 200) {
          notificationStore.onApiResponseToastAlert(response, () => {
            this.fetchDataLineforSAP();
          });
          return true;
        } else {
          utilityStore.onApiResponse(response);
          return false;
        }
      } catch (error: any) {
        utilityStore.onError(error);
        return false;
      } finally {
        this.isLoading = false;
        notificationStore.disableLoading();
      }
    }
    // End Achievement SAP
  }
});
