import axios from "axios";
import { defineStore } from "pinia";
import { useNotificationStore } from "@/stores/notification";
import { useConfigStore } from "@/stores/config";
import { useUtilityStore } from "@/stores/utility";
import shippingAdmTripService from "@/services/Logistik/IFP/Report/ShippingAdmTripService";
import type {
  AdmTripMappedItem,
  AdmTripParams,
} from '@/types/Logistik/IFP/Report/ShippingAdmTrip';
import shippingCycleService from "@/services/Logistik/IFP/Report/ShippingCycleService";
import type {
  ShippingCycleParams,
  ShippingCycleResponse,
} from '@/types/Logistik/IFP/Report/ShippingCycle';

type Nullable<T> = T | null;

interface UploadStatusItem {
  customer?: string;
  date?: string;
  status?: number;
  [key: string]: any;
}

interface TripAllParams {
  plant?: string | null;
  trip?: number | null;
  route?: string | null;
  date?: string | null;
}

interface HourFilterState {
  selectedHour: number | null;
  timeInput: string;
}

interface TripFilterState {
  selectedTrip: number | null;
  selectedRoute: string | null;
}

interface UploadStatusState {
  delivery: UploadStatusItem[];
  sales_order: UploadStatusItem[];
  mdfo: UploadStatusItem[];
}

interface DataTablesState {
  headers: Array<{
    text: string;
    align: string;
    value: string;
  }>;
  p5: any[];
  p4: any[];
  items: any[];
  filters: {
    cycle: string;
    etd: string;
    eta: string;
  };
}

interface DialogState {
  datePicker: boolean;
  form: boolean;
  timePickerForm: boolean;
  timePickerFormStart: boolean;
  filter: boolean;
}

interface FormDataState {
  customer: string;
  cycle: string;
  etd: string;
  eta: string;
}

interface FilterState {
  cycle: number | string;
  date: string;
  customer: string;
  period: string;
}

function normalizeApiList(data: any): any[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (data === 0) return [];
  return [data];
}

export const useControlPrepare = defineStore("control-prepare", {
  state: () => {
    const configStore = useConfigStore();
    const utilityStore = useUtilityStore();
    const date = utilityStore.getCurrentShift();

    return {
      items: [] as any[],
      loading: false,
      error: null as Nullable<string>,
      action: "Add",
      apiUrl: configStore.apiUrl,
      performanceChart: [] as any[],
      performanceKanban: [] as any[],
      dataMieruka: { data: [] } as ShippingCycleResponse,
      data: [] as any[],
      datap4: [] as any[],
      allCycleData: {} as Record<string, any>,
      dataEkspor: [] as any[],
      cycle: 0,
      allCycle: [] as any[],
      totalCycle: [] as any[],
      timecyclep4: 0,
      itemP5: 0,
      itemP4: 0,
      itemEkspor: 0,
      actItemp4: 0,
      listEtd: [] as string[],

      filter: {
        cycle: 0,
        date: "",
        customer: "",
        period: date.period,
      } as FilterState,

      datatables: {
        headers: [
          { text: "Cycle", align: "left", value: "cycle" },
          {
            text: "ETD (Estimated Time of Departure)",
            align: "left",
            value: "etd",
          },
          {
            text: "ETA (Estimated Time of Arrival)",
            align: "left",
            value: "eta",
          },
        ],
        p5: [],
        p4: [],
        items: [],
        filters: {
          cycle: "",
          etd: "",
          eta: "",
        },
      } as DataTablesState,

      dialog: {
        datePicker: false,
        form: false,
        timePickerForm: false,
        timePickerFormStart: false,
        filter: true,
      } as DialogState,

      dataEtdAll: [] as any[],

      hourFilter: {
        selectedHour: null,
        timeInput: "",
      } as HourFilterState,

      speedDial: {
        model: false,
        btn: false,
      },

      formData: {
        customer: "",
        cycle: "",
        etd: "",
        eta: "",
      } as FormDataState,

      list: {
        customer: [
          "ADM PLANT 1",
          "ADM PLANT 4",
          "ADM PLANT 5",
          "TMMIN",
          "GAYA MOTOR",
          "MMKI",
          "MKM",
          "HMMI",
        ],
      },

      form: ["customer", "cycle", "etd", "eta"],

      uploadStatus: {
        delivery: [],
        sales_order: [],
        mdfo: [],
      } as UploadStatusState,

      dataTripAll: [] as AdmTripMappedItem[],
    tripOptions: [] as number[],
    routeOptions: [] as string[],

      tripFilter: {
        selectedTrip: null,
        selectedRoute: null,
      } as TripFilterState,

      dnMap: {
        P4: "DN4",
        P5: "DN5",
      } as Record<string, string>,

      plantLabelByDn: {
        DN4: "ADM PLANT 4",
        DN5: "ADM PLANT 5",
      } as Record<string, string>,

      uploadLoading: false,
    };
  },

  actions: {
    _notification() {
      return useNotificationStore();
    },

    _config() {
      return useConfigStore();
    },

    _utility() {
      return useUtilityStore();
    },

    _normalizeList(data: any) {
      return normalizeApiList(data);
    },

    resetForm() {
      this.fetchMasterCycle();
      this.fetchAllCycle();
      this.formData = {
        customer: "",
        cycle: "",
        etd: "",
        eta: "",
      };
      this.dialog.form = false;
    },

    async fetchDataItemView(
      cycle: string | number | null,
      notification: boolean,
      plant: string,
      date: string | null = null,
    ) {
      const notificationStore = this._notification();
      const configStore = this._config();
      const utilityStore = this._utility();

      notificationStore.loading = notification;

      try {
        const params: Record<string, any> = { dn: plant };
        if (date) params.date = date;

        const c = String(cycle ?? "").trim();
        if (c) params.cycle = c;

        const res = await axios.get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/control_prepare/adm_p5`,
          { params },
        );

        if (res.status === 200) {
          this.data = normalizeApiList(res.data);
        } else {
          utilityStore.onApiResponse(res);
          this.data = [];
        }
      } catch (e) {
        console.error("fetchDataItemView error:", e);
        this.data = [];
      } finally {
        notificationStore.disableLoading();
      }
    },

    async fetchDataItemP4View(
      cycle: string | number | null,
      notification: boolean,
      plant: string,
      date: string | null = null,
    ) {
      const notificationStore = this._notification();
      const configStore = this._config();

      notificationStore.loading = notification;

      try {
        const params: Record<string, any> = { dn: plant, date: date || "" };
        const c = String(cycle ?? "").trim();
        if (c) params.cycle = c;

        const res = await axios.get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/control_prepare/adm_p4`,
          { params },
        );

        if (res.status === 200) {
          this.datap4 = normalizeApiList(res.data);
        }
      } catch (e) {
        console.error("fetchDataItemP4View error:", e);
        this.datap4 = [];
      } finally {
        notificationStore.disableLoading();
      }
    },

    async fetchDataItem(
      cycle: string | number | null,
      notification: boolean,
      plant: string,
      date: string | null = null,
    ) {
      const notificationStore = this._notification();
      const configStore = this._config();
      const utilityStore = this._utility();

      notificationStore.loading = notification;

      try {
        const params: Record<string, any> = { dn: plant };
        if (date) params.date = date;

        const c = String(cycle ?? "").trim();
        if (c) params.cycle = c;

        const res = await axios.get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/control_prepare/adm_p5`,
          { params },
        );

        if (res.status === 200) {
          this.data = normalizeApiList(res.data);
        } else {
          utilityStore.onApiResponse(res);
          this.data = [];
        }
      } catch (e) {
        console.error("fetchDataItem error:", e);
        this.data = [];
      } finally {
        notificationStore.disableLoading();
      }
    },

    fetchDataItemValue(
      cycle: string | number,
      notification: boolean,
      plant: string,
    ) {
      const notificationStore = this._notification();
      const configStore = this._config();
      const utilityStore = this._utility();

      notificationStore.loading = notification;

      return axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/control_prepare/adm_p5?cycle=${cycle}&dn=${plant}`,
        )
        .then((response) => {
          if (response.status === 200) {
            notificationStore.disableLoading();
            return response.data;
          } else {
            utilityStore.onApiResponse(response);
            return null;
          }
        });
    },

    async fetchDataItemP4Report(
      cycle: string | number | null,
      notification: boolean,
      plant: string,
      date: string | null = null,
    ) {
      const notificationStore = this._notification();
      const configStore = this._config();
      const utilityStore = this._utility();

      notificationStore.loading = notification;

      try {
        const params: Record<string, any> = { dn: plant, date: date || "" };
        const c = String(cycle ?? "").trim();
        if (c) params.cycle = c;

        const res = await axios.get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/control_prepare/adm_p4`,
          { params },
        );

        if (res.status === 200) {
          this.datap4 = this._normalizeList(res.data);
        } else {
          utilityStore.onApiResponse(res);
        }
      } catch (e) {
        console.error("fetchDataItemP4Report error:", e);
        this.datap4 = [];
        throw e;
      } finally {
        notificationStore.disableLoading();
      }
    },

    async fetchDataItemP4(
      cycle: string | number | null,
      notification: boolean,
      plant: string,
      date: string | null = null,
    ) {
      const notificationStore = this._notification();
      const configStore = this._config();

      notificationStore.loading = notification;

      try {
        const params: Record<string, any> = { dn: plant, date: date || "" };
        const c = String(cycle ?? "").trim();
        if (c) params.cycle = c;

        const res = await axios.get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/control_prepare/adm_p4`,
          { params },
        );

        if (res.status === 200) {
          this.datap4 = normalizeApiList(res.data);
        }
      } catch (e) {
        console.error("fetchDataItemP4 error:", e);
        this.datap4 = [];
      } finally {
        notificationStore.disableLoading();
      }
    },

    async fetchDataItemP4ViewEtd(
      etdValue: string,
      notification: boolean,
      plant: string,
      date: string | null = null,
    ) {
      const notificationStore = this._notification();
      const configStore = this._config();

      notificationStore.loading = notification;

      try {
        const params = {
          dn: plant,
          date: date || "",
          etd: etdValue,
        };

        const res = await axios.get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/control_prepare/adm_p4_etd`,
          { params },
        );

        if (res.status === 200) {
          this.datap4 = normalizeApiList(res.data);
        }
      } catch (e) {
        console.error("fetchDataItemP4ViewEtd error:", e);
        this.datap4 = [];
      } finally {
        notificationStore.disableLoading();
      }
    },

    async fetchDataItemP4ViewTrip(
      route: string,
      trip: string | number,
      notification: boolean,
      plant: string,
      date: string | null = null,
    ) {
      const notificationStore = this._notification();
      const configStore = this._config();

      notificationStore.loading = notification;

      try {
        const params = {
          route,
          trip,
          dn: plant,
          date: date || "",
        };

        const res = await axios.get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/control_prepare/adm_p4_trip`,
          { params },
        );

        if (res.status === 200) {
          this.datap4 = normalizeApiList(res.data);
        }
      } catch (e) {
        console.error("fetchDataItemP4ViewTrip error:", e);
        this.datap4 = [];
      } finally {
        notificationStore.disableLoading();
      }
    },

    async fetchDataItemP5ViewTrip(
      route: string,
      trip: string | number,
      notification: boolean,
      plant: string,
      date: string | null = null,
    ) {
      const notificationStore = this._notification();
      const configStore = this._config();

      notificationStore.loading = notification;

      try {
        const params = {
          route,
          trip,
          dn: plant,
          date: date || "",
        };

        const res = await axios.get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/control_prepare/adm_p5_trip`,
          { params },
        );

        if (res.status === 200) {
          this.data = normalizeApiList(res.data);
        }
      } catch (e) {
        console.error("fetchDataItemP5ViewTrip error:", e);
        this.data = [];
      } finally {
        notificationStore.disableLoading();
      }
    },

    async getTripDetailP4(
      route: string,
      trip: string | number,
      plant: string,
      date: string | null = null,
    ) {
      const configStore = this._config();

      try {
        const params = {
          route,
          trip,
          dn: plant,
          date: date || "",
        };

        const res = await axios.get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/control_prepare/adm_p4_trip`,
          { params },
        );

        if (res.status !== 200) return [];
        return normalizeApiList(res.data);
      } catch (e) {
        console.error("getTripDetailP4 error:", e);
        return [];
      }
    },

    async getTripDetailP5(
      route: string,
      trip: string | number,
      plant: string,
      date: string | null = null,
    ) {
      const configStore = this._config();

      try {
        const params = {
          route,
          trip,
          dn: plant,
          date: date || "",
        };

        const res = await axios.get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/control_prepare/adm_p5_trip`,
          { params },
        );

        if (res.status !== 200) return [];
        return normalizeApiList(res.data);
      } catch (e) {
        console.error("getTripDetailP5 error:", e);
        return [];
      }
    },

    async fetchDataItemP5ViewEtd(
      etdValue: string,
      notification: boolean,
      plant: string,
      date: string | null = null,
    ) {
      const notificationStore = this._notification();
      const configStore = this._config();

      notificationStore.loading = notification;

      try {
        const params = { dn: plant, date: date || "", etd: etdValue };

        const res = await axios.get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/control_prepare/adm_p5_etd`,
          { params },
        );

        if (res.status === 200) {
          this.data = normalizeApiList(res.data);
        }
      } catch (e) {
        console.error("fetchDataItemP5ViewEtd error:", e);
        this.data = [];
      } finally {
        notificationStore.disableLoading();
      }
    },

    fetchDataItemP4Value(
      cycle: string | number,
      notification: boolean,
      plant: string,
      date: string | null = null,
    ) {
      const notificationStore = this._notification();
      const configStore = this._config();

      notificationStore.loading = notification;

      return axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/control_prepare/adm_p4`,
          {
            params: { cycle, dn: plant, date: date || "" },
          },
        )
        .then((res) => {
          if (res.status === 200) {
            notificationStore.disableLoading();
            return res.data;
          }
          return [];
        })
        .catch(() => {
          notificationStore.disableLoading();
          return [];
        });
    },

    fetchDataItemP4ValueEtd(
      cycle: string | number,
      notification: boolean,
      plant: string,
      date: string | null = null,
    ) {
      const notificationStore = this._notification();
      const configStore = this._config();

      notificationStore.loading = notification;

      return axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/control_prepare/adm_p4`,
          {
            params: { cycle, dn: plant, date: date || "" },
          },
        )
        .then((res) => {
          if (res.status === 200) {
            notificationStore.disableLoading();
            return res.data;
          }
          return [];
        })
        .catch(() => {
          notificationStore.disableLoading();
          return [];
        });
    },

    fetchDataItemValueEtd(
      cycle: string | number,
      notification: boolean,
      plant: string,
      date: string | null = null,
    ) {
      const notificationStore = this._notification();
      const configStore = this._config();
      const utilityStore = this._utility();

      notificationStore.loading = notification;

      return axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/control_prepare/adm_p5etd`,
          {
            params: { cycle, dn: plant, date: date || "" },
          },
        )
        .then((response) => {
          if (response.status === 200) {
            notificationStore.disableLoading();
            return response.data;
          } else {
            utilityStore.onApiResponse(response);
            return null;
          }
        });
    },

    async fetchAllHourSummary(plant: string, date: string | null = null) {
      const configStore = this._config();

      try {
        const params = { dn: plant, date: date || "" };
        const res = await axios.get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/control_prepare/adm_summary_hour`,
          { params },
        );

        if (res.status === 200 && Array.isArray(res.data)) {
          const summaryMap: Record<string, any> = {};
          res.data.forEach((item: any) => {
            summaryMap[item.jam_group] = {
              totalData: Number(item.totalData || 0),
              totalFinish: Number(item.totalFinish || 0),
              displayJam: String(item.jam_group || "").slice(0, 5),
            };
          });

          this.allCycleData = summaryMap;
          return res.data;
        }

        this.allCycleData = {};
        return [];
      } catch (e) {
        console.error("fetchAllHourSummary error:", e);
        this.allCycleData = {};
        return [];
      }
    },

    async fetchAllTripSummary(plant: string, date: string | null = null) {
      const configStore = this._config();

      try {
        const params = { dn: plant, date: date || "" };
        const res = await axios.get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/control_prepare/adm_summary_trip`,
          { params },
        );

        if (res.status === 200 && Array.isArray(res.data)) {
          const groupedData = res.data.reduce(
            (acc: Record<string, any[]>, item: any) => {
              const routeName = item.route || "UNKNOWN";

              if (!acc[routeName]) {
                acc[routeName] = [];
              }

              acc[routeName].push({
                trip: Number(item.trip || 0),
                totalData: Number(item.totalData || 0),
                totalFinish: Number(item.totalFinish || 0),
              });

              return acc;
            },
            {},
          );

          this.allCycleData = groupedData;
          return res.data;
        }

        this.allCycleData = {};
        return [];
      } catch (e) {
        console.error("fetchAllTripSummary error:", e);
        this.allCycleData = {};
        return [];
      }
    },

    async fetchTotalCycleNOW(
      cycle: string | number | null,
      plant: string,
      date: string | null = null,
    ) {
      const configStore = this._config();
      const utilityStore = this._utility();
      const notificationStore = this._notification();

      try {
        const params: Record<string, any> = { dn: plant, date: date || "" };
        const c = String(cycle ?? "").trim();
        if (c) params.cycle = c;

        const res = await axios.get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/control_prepare/total_cycle`,
          { params },
        );

        if (res.status === 200) {
          this.totalCycle = res.data;
        } else {
          utilityStore.onApiResponse(res);
        }
      } catch (e) {
        console.error("fetchTotalCycleNOW error:", e);
        this.totalCycle = [];
        throw e;
      } finally {
        notificationStore.disableLoading();
      }
    },

    async fetchTotalEtdNOW(plant: string, date: string | null = null) {
      const configStore = this._config();

      try {
        const params = { dn: plant, date: date || "" };

        const res = await axios.get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/control_prepare/total_etd`,
          { params },
        );

        if (res.status === 200) {
          this.listEtd = Array.isArray(res.data)
            ? res.data.map((item: any) => item.etd_group)
            : [];
        }
      } catch (e) {
        console.error("fetchTotalEtdNOW error:", e);
        this.listEtd = [];
      }
    },

    fetchDataEkspor(notification: boolean) {
      const notificationStore = this._notification();
      const configStore = this._config();
      const utilityStore = this._utility();

      notificationStore.loading = notification;

      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/control_prepare/ekspor`,
          {
            params: this.filter,
          },
        )
        .then((response) => {
          if (response.status === 200) {
            this.dataEkspor = response.data.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        });
    },

    fetchTotalCycle() {
      const configStore = this._config();
      const notificationStore = this._notification();
      const utilityStore = this._utility();

      axios
        .get(`http://${configStore.apiUrl}/majsf_rest_api/api/control_prepare`, {
          params: this.filter,
        })
        .then((response) => {
          if (response.status === 200) {
            this.allCycle = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        });
    },

    fetchTimeCycleP4() {
      const configStore = this._config();
      const notificationStore = this._notification();
      const utilityStore = this._utility();

      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/control_prepare/time_p4`,
          {
            params: this.filter,
          },
        )
        .then((response) => {
          if (response.status === 200) {
            this.timecyclep4 = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        });
    },

    async fetchTotalItem(cycle: string | number | null, date: string | null = null) {
      const configStore = this._config();
      const utilityStore = this._utility();
      const notificationStore = this._notification();

      try {
        const params: Record<string, any> = { date: date || "" };
        const c = String(cycle ?? "").trim();
        if (c) params.cycle = c;

        const res = await axios.get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/control_prepare/act`,
          { params },
        );

        if (res.status === 200) {
          this.itemP5 = res.data;
        } else {
          utilityStore.onApiResponse(res);
        }
      } catch (e) {
        console.error("fetchTotalItem error:", e);
        this.itemP5 = 0;
        throw e;
      } finally {
        notificationStore.disableLoading();
      }
    },

    fetchTotalItemEkspor() {
      const configStore = this._config();
      const notificationStore = this._notification();
      const utilityStore = this._utility();

      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/control_prepare/act_ekspor`,
        )
        .then((response) => {
          if (response.status === 200) {
            this.itemEkspor = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        });
    },

    fetchTotalItemP4() {
      const configStore = this._config();
      const notificationStore = this._notification();
      const utilityStore = this._utility();

      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/control_prepare/total_p4`,
          {
            params: this.filter,
          },
        )
        .then((response) => {
          if (response.status === 200) {
            this.itemP4 = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        });
    },

    onUpload() {
      const configStore = this._config();
      const notificationStore = this._notification();
      const utilityStore = this._utility();

      notificationStore.loading = true;

      axios
        .post(`http://${configStore.apiUrl}/majsf_rest_api/api/Shipping/`)
        .then((response) => {
          if (response.status === 200) {
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        });
    },

    fetchMasterCycle() {
      const configStore = this._config();
      const notificationStore = this._notification();
      const utilityStore = this._utility();

      axios
        .get(`http://${configStore.apiUrl}/majsf_rest_api/api/control_prepare`)
        .then((response) => {
          if (response.status === 200) {
            this.datatables.p5 = response.data.p5.detail;
            this.datatables.p4 = response.data.p4.detail;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },

    fetchAllCycle() {
      const configStore = this._config();
      const notificationStore = this._notification();
      const utilityStore = this._utility();

      notificationStore.loading = true;

      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/control_prepare/cycle`,
          {
            params: this.filter,
          },
        )
        .then((response) => {
          if (response.data.warning == false) {
            utilityStore.onApiResponse(response);
          } else {
            this.dialog.filter = false;
            this.datatables.items = response.data;
            notificationStore.disableLoading();
          }
        })
        .catch(utilityStore.onError);
    },

    loadDataMasterCycle(action: string, data: Record<string, any>) {
      Object.keys(this.formData).forEach((key) => {
        this.formData[key as keyof FormDataState] = data[key] ?? "";
      });

      this.action = action;
      this.dialog.form = true;
    },

    onUpdate() {
      const configStore = this._config();
      const notificationStore = this._notification();

      notificationStore.loading = true;
      let valid = true;

      const data =
        this.action === "Edit" ? new URLSearchParams() : new FormData();

      Object.entries(this.formData).forEach(([key, value]) => {
        if (!value && !(this.action === "Add" && (key === "customer" || key === "cycle"))) {
          valid = false;
        }
        data.append(key, value);
      });

      if (valid) {
        let configHttp: any = {
          method: "post",
          url: `http://${configStore.apiUrl}/majsf_rest_api/api/control_prepare`,
          headers: {
            "Content-Type": "multipart/form-data",
          },
          data,
        };

        if (this.action === "Edit") {
          configHttp = {
            method: "put",
            url: `http://${configStore.apiUrl}/majsf_rest_api/api/control_prepare`,
            headers: {
              "Content-Type": "multipart/form-data",
            },
            data,
          };
        }

        axios(configHttp)
          .then((response) =>
            notificationStore.onApiResponseToastAlert(response, this.resetForm),
          )
          .catch(configStore.onError);
      } else {
        notificationStore.showAlertWarning("Data yang anda kirim tidak Lengkap.");
        notificationStore.disableLoading();
      }
    },

    filterItems() {
      return this.datatables.items.filter((d: any) => {
        return Object.keys(this.datatables.filters).every((f) => {
          const filterVal = this.datatables.filters[f as keyof typeof this.datatables.filters];
          return (
            filterVal.length < 1 ||
            String(d[f] || "")
              .toLowerCase()
              .includes(filterVal.toLowerCase())
          );
        });
      });
    },

    filterItemsSAP() {
      return this.datatables.p4.filter((d: any) => {
        return Object.keys(this.datatables.filters).every((f) => {
          const filterVal = this.datatables.filters[f as keyof typeof this.datatables.filters];
          return (
            filterVal.length < 1 ||
            String(d[f] || "")
              .toLowerCase()
              .includes(filterVal.toLowerCase())
          );
        });
      });
    },

    deletePart(cycle: string | number, customer: string) {
      const configStore = this._config();
      const notificationStore = this._notification();

      const data = new URLSearchParams();
      data.append("cycle", String(cycle));
      data.append("customer", customer);

      this.loading = true;

      axios
        .delete(
          `http://${configStore.apiUrl}/majsf_rest_api/api/control_prepare`,
          { data },
        )
        .then((response) => {
          if (response.status === 200) {
            notificationStore.showAlertSuccess("Item has been deleted");
            this.resetForm();
          } else {
            notificationStore.showAlertError(response.data.message);
          }
        })
        .catch(configStore.onError);
    },

    async fetchDataMierukaView(
    cycle: string | number | null,
    customer: string,
    tanggal: string | null = null,
    ) {
    const utilityStore = this._utility();
    const notificationStore = this._notification();

    try {
        const result = await shippingCycleService.fetchDataMieruka({
        cycle,
        customer,
        tanggal,
        });

        this.dataMieruka = result;
        return result;
    } catch (err) {
        utilityStore.onError(err);
        notificationStore.showAlertError("Gagal memuat data Mieruka");
        return { data: [] };
    }
    },

    async fetchDataMieruka(
    cycle: string | number | null,
    customer: string,
    tanggal: string | null = null,
    ) {
    return await this.fetchDataMierukaView(cycle, customer, tanggal);
    },

    async fetchDataMierukaCustomer(
      cycle: string | number | null,
      customer: string,
      tanggal: string | null = null,
    ) {
      const configStore = this._config();
      const utilityStore = this._utility();
      const notificationStore = this._notification();

      try {
        const cycleParam = cycle && cycle !== "" ? cycle : "";

        const res = await axios.get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/control_prepare/mieruka_shipping_customer`,
          {
            params: {
              cycle: cycleParam,
              customer,
              tanggal,
            },
          },
        );

        this.dataMieruka = res.data;
        return res.data;
      } catch (err) {
        utilityStore.onError(err);
        notificationStore.showAlertError("Gagal memuat data Mieruka");
      }
    },

    async fetchDataMierukaMmkiValue(
    cycle: string | number | null,
    customer: string,
    tanggal: string | null = null,
    ) {
    const utilityStore = this._utility();

    try {
        return await shippingCycleService.fetchDataMierukaMmkiValue({
        cycle,
        customer,
        tanggal,
        });
    } catch (err) {
        utilityStore.onError(err);
        return [];
    }
    },

    fetchDataSAP() {
      const configStore = this._config();

      axios.get(
        `http://${configStore.apiUrl}/majsf_rest_api/api/report-delivery/delivery_detail`,
      );
    },

    async fetchMierukaAll(customer: string) {
    const utilityStore = this._utility();

    try {
        const result = await shippingCycleService.fetchMierukaAll(customer);
        this.dataMieruka = result;
        return result;
    } catch (err) {
        utilityStore.onError(err);
        return { data: [] };
    }
    },

    async fetchDataMierukaValue(
    cycle: string | number | null,
    customer: string,
    tanggal: string | null = null,
    ) {
    const utilityStore = this._utility();

    try {
        return await shippingCycleService.fetchDataMierukaValue({
        cycle,
        customer,
        tanggal,
        });
    } catch (err) {
        utilityStore.onError(err);
        return [];
    }
    },

    async fetchDataItemP5All(
      notification: boolean,
      plant: string,
      date: string | null = null,
    ) {
      const notificationStore = this._notification();
      const configStore = this._config();

      notificationStore.loading = notification;

      try {
        const res = await axios.get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/control_prepare/adm_p5_all`,
          { params: { dn: plant, date: date || "" } },
        );

        this.data = this._normalizeList(res.data);
      } catch (e) {
        console.error("fetchDataItemP5All error:", e);
        this.data = [];
        throw e;
      } finally {
        notificationStore.disableLoading();
      }
    },

    async fetchDataItemP4All(
      notification: boolean,
      plant: string,
      date: string | null = null,
    ) {
      const notificationStore = this._notification();
      const configStore = this._config();

      notificationStore.loading = notification;

      const base = `http://${configStore.apiUrl}/majsf_rest_api/api/control_prepare`;

      try {
        let res = await axios.get(`${base}/adm_p4`, {
          params: { dn: plant, date: date || "" },
        });

        let list = this._normalizeList(res.data);

        if (!list.length) {
          res = await axios.get(`${base}/adm_p4_all`, {
            params: { dn: plant, date: date || "" },
          });
          list = this._normalizeList(res.data);
        }

        this.datap4 = list;
      } catch (e) {
        console.error("fetchDataItemP4All error:", e);
        this.datap4 = [];
        throw e;
      } finally {
        notificationStore.disableLoading();
      }
    },

    async fetchUploadStatus() {
      const configStore = this._config();
      const notificationStore = this._notification();

      this.uploadLoading = true;

      try {
        const res = await axios.get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/Barcode_Dn/check_today_tomorrow_delivery`,
        );

        if (res.data.status) {
          this.uploadStatus.delivery = res.data.data.delivery || [];
          this.uploadStatus.sales_order = res.data.data.sales_order || [];
          this.uploadStatus.mdfo = res.data.data.mdfo || [];
        } else {
          notificationStore.showAlertError("Gagal mengambil data upload status");
        }
      } catch (err) {
        console.error("fetchUploadStatus error:", err);
        notificationStore.showAlertError("API Upload Status Error");
      } finally {
        this.uploadLoading = false;
      }
    },

    getUploadStatus(customer: string, date: string, type: string) {
      if (type === "SALES_ORDER") {
        const row = this.uploadStatus.sales_order.find(
          (d) => d.customer === customer && d.date === date,
        );
        return row ? row.status : 2;
      }

      if (type === "DELIVERY") {
        const row = this.uploadStatus.delivery.find(
          (d) => d.customer === customer && d.date === date,
        );
        return row ? row.status : 2;
      }

      if (type === "MDFO") {
        const row = this.uploadStatus.mdfo.find((d) => d.customer === customer);
        return row ? row.status : 2;
      }

      return 2;
    },

    async fetchAdmP5EtdAll(notification: boolean, date: string) {
      const notificationStore = this._notification();
      const configStore = this._config();

      notificationStore.loading = notification;
      this.loading = true;

      try {
        const res = await axios.get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/control_prepare/adm_p5_etd_all`,
          { params: { dn: "DN5", date } },
        );

        const arr = normalizeApiList(res.data);

        this.dataEtdAll = arr.map((r) => ({
          ...r,
          etd_hour: parseInt(String(r.etd).split(":")[0], 10),
        }));
      } catch (e) {
        console.error("fetchAdmP5EtdAll error:", e);
        this.dataEtdAll = [];
      } finally {
        this.loading = false;
        notificationStore.disableLoading();
      }
    },

    async fetchAdmP4EtdAll(notification: boolean, date: string) {
      const notificationStore = this._notification();
      const configStore = this._config();

      notificationStore.loading = notification;
      this.loading = true;

      try {
        const res = await axios.get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/control_prepare/adm_p4_etd_all`,
          { params: { dn: "DN4", date } },
        );

        const arr = normalizeApiList(res.data);

        this.dataEtdAll = arr.map((r) => ({
          ...r,
          etd_hour: parseInt(String(r.etd).split(":")[0], 10),
        }));
      } catch (e) {
        console.error("fetchAdmP4EtdAll error:", e);
        this.dataEtdAll = [];
      } finally {
        this.loading = false;
        notificationStore.disableLoading();
      }
    },

    async fetchAdmP1EtdAll(notification: boolean, date: string) {
      const notificationStore = this._notification();
      const configStore = this._config();

      notificationStore.loading = notification;
      this.loading = true;

      try {
        const res = await axios.get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/control_prepare/adm_p1_etd_all`,
          { params: { dn: "DN1", date } },
        );

        const arr = normalizeApiList(res.data);

        this.dataEtdAll = arr.map((r) => ({
          ...r,
          etd_hour: parseInt(String(r.etd).split(":")[0], 10),
        }));
      } catch (e) {
        console.error("fetchAdmP1EtdAll error:", e);
        this.dataEtdAll = [];
      } finally {
        this.loading = false;
        notificationStore.disableLoading();
      }
    },

    plantToDn(plant: string | null | undefined) {
      return this.dnMap[String(plant)] || "DN4";
    },

    normalizeDate(input: string | null | undefined) {
      if (!input) return "";
      if (String(input).includes("/")) {
        return String(input).split("/").reverse().join("-");
      }
      return String(input);
    },

    async fetchAdmTripAll(notification: boolean, payload: AdmTripParams = {}) {
    const notificationStore = this._notification();

    this.loading = true;
    this.error = null;

    if (notification) {
        notificationStore.loading = true;
    }

    try {
        const result = await shippingAdmTripService.fetchAdmTripAll(payload);

        this.dataTripAll = result.dataTripAll;
        this.tripOptions = result.tripOptions;
        this.routeOptions = result.routeOptions;
    } catch (e: any) {
        console.error("fetchAdmTripAll error:", e);
        this.error = e?.message || "Unknown error";
        this.dataTripAll = [];
        this.tripOptions = [];
        this.routeOptions = [];
    } finally {
        this.loading = false;

        if (notification) {
        notificationStore.disableLoading();
        }
    }
    },

    async updateManualStatus(
      kodeCustomer: string,
      date: string,
      column: string,
      status = 2,
    ) {
      const configStore = this._config();
      const notificationStore = this._notification();

      notificationStore.loading = true;

      try {
        const params = new FormData();
        params.append("kode_customer", kodeCustomer);
        params.append("dates", date);
        params.append("column", column);
        params.append("status", String(status));

        const res = await axios.post(
          `http://${configStore.apiUrl}/majsf_rest_api/api/Barcode_Dn/update_status`,
          params,
        );

        if (res.data.status) {
          notificationStore.showAlertSuccess(res.data.message);
          await this.fetchUploadStatus();
        } else {
          notificationStore.showAlertError(res.data.message);
        }

        return res.data;
      } catch (err: any) {
        console.error("updateManualStatus error:", err);
        const errMsg =
          err?.response?.data?.message || "Gagal update status ke server";
        notificationStore.showAlertError(errMsg);
        throw err;
      } finally {
        notificationStore.loading = false;
      }
    },

    async fetchPerformanceCustomer(month: string, customer?: string) {
      this.performanceChart = []; 
      const data = await shippingAdmTripService.getPerformanceCustomer(month, customer);
      this.performanceChart = data;
    },

    async fetchPerformanceKanban(month: string, customer?: string) {
      this.performanceKanban = [];
      const data = await shippingAdmTripService.getPerformanceKanban(
        month,
        customer
      );

      this.performanceKanban = data;
    },
    
  },
});