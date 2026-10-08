import { defineStore } from "pinia";
import { useNotificationStore } from "@/pinia/notification";
import { useAuthStore } from "@/stores/auth";
import { useUtilityStore } from "@/pinia/utility";

// TS type, service & utils
import type 
{ 
  DataTable,
  DataTableIncomplete,
  TableKanbanItem,
  FilterState,
  DialogState,
  DialogKBNState,
  DashboardItem,
  ChartItem,
  DetailItem,
} from "@/types/Stamping/Report/reportKanban";

import { reportKanbanService } from "@/services/Stamping/Report/KanbanService";
import { filterItems } from '@/utils/helpers/filtersItem';

const authStore = useAuthStore();
const notificationStore = useNotificationStore();
const utilityStore = useUtilityStore();
const date = utilityStore.getCurrentShift();

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

export const useReportkanbanStampingStore = defineStore("StampingReportKanban",{
  state: () => ({
      line_id: "",
      patan: "",
      formDetail: {},
      permissions: {
        create: authStore.checkAccess("Report.View.Stock"),
      },
      table_kanban: {
        items: [],
      } as TableKanbanItem,
      params: utilityStore.getCurrentShift(),
      datatables: {
        headers: [
          {
            title: "Part Number",
            items: "MATNR",
            align: "start",
          },
          { title: "Line", items: "line_id", align: "center",},
          { title: "LKH", items: "ZQTY_LKH", align: "center",},
          { title: "SAP", items: "ZQTY_SAP", align: "center",},
          { title: "GAP", items: "GAP", align: "center",},
          { title: "SAP Period", items: "total_sap", align: "center",},
          {
            title: "Action",
            items: "action",
            align: "center",
            sortable: false,
            filterable: false,
          },
        ],
        items: [],
        filters: {
          MATNR: "",
          line_id: "",
          ZQTY_LKH: "",
          ZQTY_SAP: "",
          GAP: "",
          total_sap: "",
        },
      } as DataTable,
      datatablesIncomplete: {
        headers: [
          {
            title: "Part Number",
            items: "part_number",
            align: "start",
          },
          { title: "Line", items: "line_id", align: "center",},
          { title: "GAP", items: "gap", align: "center",},
        ],
        items: [],
        filters: {
          part_number: "",
          line_id: "",
          gap: "",
        },
      } as DataTableIncomplete,
      data: {
        dashboard: [] as DashboardItem[],
        chart: [] as ChartItem[],
        detail: [] as DetailItem[],
      },
      dialogKBN: {
        filter: false,
        datePicker: false,
        datePickerPeriod: false,
        detail: false,
      } as DialogKBNState,
      dialog: {
        filter: false,
        datePicker: false,
        datePickerPeriod: false,
        detail: false,
      } as DialogState,
      filter: {
        period: date.period,
      } as FilterState,
      formData: {
        period: date.period,
        date: date.date,
        stock_awal: 0,
        part_number: "",
      },
      tipeData: ["ALL", "Achieve", "Not Achieve", "Over"],
      detail: [],
  }),
  actions: {
    filteredItems() {
      return filterItems(
        this.datatables.items, 
        this.datatables.filters,
      );
    },

    filteredItemsIncomplete() {
      return filterItems(
        this.datatablesIncomplete.items,
        this.datatablesIncomplete.filters,
      );
    },
    async fetchAchievementKanbanStamping(tanggal: string | string[]) {
      notificationStore.loading = true;

      const payload = new FormData();
      payload.append("start", Array.isArray(tanggal) ? tanggal[0] : tanggal);
      payload.append(
        "end",
        Array.isArray(tanggal) ? tanggal[1] ?? tanggal[0] : tanggal
      );

      try {
        const response = await reportKanbanService.fetchAchievementKanbanStamping(payload);

        if (response.status === 200) {
          this.datatables.items = response.data;
          notificationStore.disableLoading();
        } else {
          utilityStore.onApiResponse(response);
        }
      } catch (error) {
        utilityStore.onError(error);
      }

      setTimeout(() => {
        this.dialog.datePicker = false;
      }, 500);
    },
    async fetchIncompleteKanbanStamping(tanggal: string | string[]) {
      notificationStore.loading = true;

      const payload = new FormData();
      payload.append("start", Array.isArray(tanggal) ? tanggal[0] : tanggal);
      payload.append("end", Array.isArray(tanggal) ? tanggal[1] ?? tanggal[0] : tanggal);

      try {
        const response = await reportKanbanService.fetchIncompleteKanbanStamping(payload);

        if (response.status === 200) {
          this.datatablesIncomplete.items = response.data;
          notificationStore.disableLoading();
        } else {
          utilityStore.onApiResponse(response);
        }
      } catch (error) {
        utilityStore.onError(error);
      }

      setTimeout(() => {
        this.dialog.datePicker = false;
      }, 500);
    },
    async fetchDataDashboard() {
      notificationStore.loading = true;

      try {
        const response = await reportKanbanService.fetchDataDashboard({
          ...this.filter,
          period: this.filter.period as string,
        });


        if (response.status === 200) {
          this.data.dashboard = response.data;
          notificationStore.disableLoading();
        } else {
          utilityStore.onApiResponse(response);
        }
      } catch (error) {
        utilityStore.onError(error);
      }
    },
    async loadDetail(part_number: string, tanggal: string | string[]) {
      notificationStore.loading = true;

      const payload = new FormData();
      payload.append("start", Array.isArray(tanggal) ? tanggal[0] : tanggal);
      payload.append("end", Array.isArray(tanggal) ? tanggal[1] ?? tanggal[0] : tanggal);
      payload.append("part_number", part_number);

      try {
        const response = await reportKanbanService.loadDetail(payload);

        if (response.data.status === false) {
          utilityStore.onApiResponse(response);
        } else {
          notificationStore.loading = false;
          this.data.detail = response.data;
          this.dialog.detail = true;
        }
      } catch (err) {
        utilityStore.onError(err);
      }
    },
    async fetchDataChart(tanggal: string | string[]) {
      notificationStore.loading = true;

      const payload = new FormData();
      payload.append("start", Array.isArray(tanggal) ? tanggal[0] : tanggal);
      payload.append("end", Array.isArray(tanggal) ? tanggal[1] ?? tanggal[0] : tanggal);

      try {
        const response = await reportKanbanService.fetchDataChart(payload);

        if (response.status === 200) {
          this.data.chart = response.data;
          notificationStore.disableLoading();
        } else {
          utilityStore.onApiResponse(response);
        }
      } catch (error) {
        utilityStore.onError(error);
      }
    },
  }
});