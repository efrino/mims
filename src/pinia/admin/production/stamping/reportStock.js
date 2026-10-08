import axios from "axios";
import { defineStore } from "pinia";
import { useNotificationStore } from "@/pinia/notification";
import { useAuthStore } from "@/pinia/auth";
import { useConfigStore } from "@/pinia/config";
import { useUtilityStore } from "@/pinia/utility";
import { eachDayOfInterval, format, parseISO } from "date-fns";
import moment from 'moment';
moment.locale('id');

const authStore = useAuthStore();
const configStore = useConfigStore();
const notificationStore = useNotificationStore();
const utilityStore = useUtilityStore();
const date = utilityStore.getCurrentShift();

// --- helpers (module scope) ---
// (Buat Forecast)
function daysInMonth(dateLike) {
  const d = dateLike ? new Date(dateLike) : new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}
function makeDaysArray(n) {
  return Array.from({ length: n }, (_, i) => i + 1);
}
function clampToDays(arr, n) {
  const a = Array.isArray(arr) ? arr.slice(0, n) : [];
  return a.length < n ? a.concat(Array(n - a.length).fill(0)) : a;
}
// (Buat Forecast)

export const useReportStockStore = defineStore({
  id: "report-stock-stamping",
  state() {
    return {
      apiUrl: configStore.apiUrl,
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
            title: "Search Part Number...",
            align: "left",
            value: "part_number",
          },
        ],
        items: [],
        filters: {
          part_number: [],
        },
      },
      datatablesIFP: {
        headers: [
          {
            title: "Search Part Number...",
            align: "left",
            value: "part_number",
          },
        ],
        items: [],
        filters: {
          part_number: [],
        },
      },
      datatablesPCS: {
        headers: [
          { title: "Part RH", align: "left", value: "part_rh" },
          { title: "Part LH", align: "left", value: "part_lh" },
        ],
        items: [],
        filters: {
          part_rh: [],
          part_lh: [],
        },
      },
      dailyAchievWeld: {
        headers: [
          // { text: "Date", align: "left", value: "date" },
          { title: "Line", align: "left", value: "line_id" },
          // { text: "Shift", align: "left", value: "shift" },
          { title: "Part Number", align: "left", value: "part_number" },
          { title: "Plan", align: "left", value: "plan" },
          { title: "Actual", align: "left", value: "actual" },
          { title: "Diff Plan (pcs)", align: "left", value: "" },
          { title: "Diff Plan (%)", align: "left", value: "" },

          // { text: "Action", align: "left", value: "action" },
        ],
        cHeaders: [
          [
            {
              title: "Line",
              align: "left",
              rowspan: 2,
              colspan: 1,
              value: "line_id",
            },
            {
              title: "Part Number",
              align: "left",
              rowspan: 2,
              colspan: 1,
              value: "part_number",
            },
            {
              title: "Status",
              align: "left",
              rowspan: 2,
              colspan: 1,
              value: "status",
            },
            {
              title: "Plan",
              align: "left",
              rowspan: 2,
              colspan: 1,
              value: "plan",
            },
            {
              title: "Actual",
              align: "left",
              rowspan: 2,
              colspan: 1,
              value: "actual",
            },
            {
              title: "Diff",
              align: "left",
              rowspan: 2,
              colspan: 1,
              value: "",
            },
            {
              title: "Achv",
              align: "left",
              rowspan: 2,
              colspan: 1,
              value: "",
            },
          ],
          [],
        ],
        items: [],
        itemsLine: [],
        details: [],
        details_daily: [],
        listDate: [],
        colors: {
          plan: "#4DA8DA",
          actual: "#81E7AF",
          cumm_plan: "#0D5EA6",
          cumm_act: "#06923E",
          minus: "#FF6363",
          over: "#FFD63A",
          balance: "#81E7AF",
        },
        byDate: {
          seriesPlan: [],
          seriesAct: [],
          seriesCummPlan: [],
          seriesCummAct: [],
          categories: [],
        },
        byLine: {
          seriesPlan: [],
          seriesAct: [],
          seriesPercent: [],
          categories: [],
        },
        filters: {
          line_id: [],
          part_number: [],
        },
      },
      colors: {
        plan: "#0070C0",
        actual: "#00B050",
        cumm_plan: "#00B0F0",
        cumm_act: "#00B050",
        minus: "#FF0000",
        over: "#FFFF00",
        balance: "#00B050",
      },
      dailyAchievPress: {
        headers: [
          // { text: "Date", align: "left", value: "date" },
          { title: "Line", align: "left", value: "line_id" },
          // { text: "Shift", align: "left", value: "shift" },
          { title: "Part Number", align: "left", value: "part_number" },
          { title: "Plan", align: "left", value: "plan" },
          { title: "Actual", align: "left", value: "actual" },
          { title: "Diff Plan (pcs)", align: "left", value: "" },
          { title: "Diff Plan (%)", align: "left", value: "" },

          // { text: "Action", align: "left", value: "action" },
        ],
        cHeaders: [
          [
            {
              title: "Line",
              align: "left",
              rowspan: 2,
              colspan: 1,
              value: "line_id",
            },
            {
              title: "Part Number",
              align: "left",
              rowspan: 2,
              colspan: 1,
              value: "part_number",
            },
            {
              title: "Status",
              align: "left",
              rowspan: 2,
              colspan: 1,
              value: "status",
            },
            {
              title: "Plan",
              align: "left",
              rowspan: 2,
              colspan: 1,
              value: "plan",
            },
            {
              title: "Actual",
              align: "left",
              rowspan: 2,
              colspan: 1,
              value: "actual",
            },
            {
              title: "Diff",
              align: "left",
              rowspan: 2,
              colspan: 1,
              value: "",
            },
            {
              title: "Achv",
              align: "left",
              rowspan: 2,
              colspan: 1,
              value: "",
            },
          ],
          [],
        ],
        items: [],
        itemsLine: [],
        details: [],
        details_daily: [],
        listDate: [],
        colors: {
          plan: "#4DA8DA",
          actual: "#81E7AF",
          cumm_plan: "#0D5EA6",
          cumm_act: "#06923E",
          minus: "#FF6363",
          over: "#FFD63A",
          balance: "#81E7AF",
        },
        byDate: {
          seriesPlan: [],
          seriesAct: [],
          seriesCummPlan: [],
          seriesCummAct: [],
          categories: [],
        },
        byLine: {
          seriesPlan: [],
          seriesAct: [],
          seriesPercent: [],
          categories: [],
        },
        filters: {
          line_id: [],
          part_number: [],
        },
      andonChartOptions: {},
      isAndonLoading: true,
      },
      datatablesPress: {
        headers: [
          { title: "Part Number", align: "left", value: "part_number" },
          { title: "Line", align: "left", value: "line_id" },
          { title: "Plan", align: "left", value: "" },
          // { text: "MDFO", align: "left", value: "" },
          { title: "Actual", align: "left", value: "" },
          { title: "Diff Plan (pcs)", align: "left", value: "" },
          { title: "Diff Plan (%)", align: "left", value: "" },
          // { text: "Diff MDFO (pcs)", align: "left", value: "" },
          // { text: "Diff MDFO (%)", align: "left", value: "" },
          { title: "GSPH", align: "left", value: "" },
          { title: "TPT", align: "left", value: "" },
          { title: "Action", align: "left", value: "action" },
        ],
        items: [],
        filters: {
          part_number: [],
          line_id: [],
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
          tipe: "ALL",
        },
      },
      datatablesMutasi: {
        headers: [{ title: "Part Number", align: "left", value: "part_number" }],
        items: [],
        filters: {
          part_number: [],
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
          tipe: "ALL",
        },
      },
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
      filter: {
        period: date.period,
      },
      filterDate: {
        date: date.date,
      },
      formData: {
        period: date.period,
        date: date.date,
        stock_awal: 0,
        part_number: "",
      },
      formIfp: {
        stock_awal: 0,
        part_number: "",
      },
      datatablesUpload: {
        search: "",
        headers: [
          { title: "Part Number", align: "left", value: "part_number" },
          { title: "Job Number", align: "left", value: "job_number" },
          { title: "DN", align: "left", value: "dn" },
          { title: "Tgl 1", align: "left", value: "date_01" },
          { title: "Tgl 2", align: "left", value: "date_02" },
          { title: "Tgl 3", align: "left", value: "date_03" },
          { title: "Tgl 4", align: "left", value: "date_04" },
          { title: "Tgl 5", align: "left", value: "date_05" },
          { title: "Tgl 6", align: "left", value: "date_06" },
          { title: "Tgl 7", align: "left", value: "date_07" },
          { title: "Tgl 8", align: "left", value: "date_08" },
          { title: "Tgl 9", align: "left", value: "date_09" },
          { title: "Tgl 10", align: "left", value: "date_10" },
          { title: "Tgl 11", align: "left", value: "date_11" },
          { title: "Tgl 12", align: "left", value: "date_12" },
          { title: "Tgl 13", align: "left", value: "date_13" },
          { title: "Tgl 14", align: "left", value: "date_14" },
          { title: "Tgl 15", align: "left", value: "date_15" },
          { title: "Tgl 16", align: "left", value: "date_16" },
          { title: "Tgl 17", align: "left", value: "date_17" },
          { title: "Tgl 18", align: "left", value: "date_18" },
          { title: "Tgl 19", align: "left", value: "date_19" },
          { title: "Tgl 20", align: "left", value: "date_20" },
          { title: "Tgl 21", align: "left", value: "date_21" },
          { title: "Tgl 22", align: "left", value: "date_22" },
          { title: "Tgl 23", align: "left", value: "date_23" },
          { title: "Tgl 24", align: "left", value: "date_24" },
          { title: "Tgl 25", align: "left", value: "date_25" },
          { title: "Tgl 26", align: "left", value: "date_26" },
          { title: "Tgl 27", align: "left", value: "date_27" },
          { title: "Tgl 28", align: "left", value: "date_28" },
          { title: "Tgl 29", align: "left", value: "date_29" },
          { title: "Tgl 30", align: "left", value: "date_30" },
          { title: "Tgl 31", align: "left", value: "date_31" },
          { title: "Total", align: "left", value: "total" },
          { title: "Simulate", align: "left", value: "ERROR" },
        ],
        items: [],
      },
      form: [
        "period",
        "job_number",
        "part_number",
        "dn",
        "date_01",
        "date_02",
        "date_03",
        "date_04",
        "date_05",
        "date_06",
        "date_07",
        "date_08",
        "date_09",
        "date_11",
        "date_12",
        "date_13",
        "date_14",
        "date_15",
        "date_16",
        "date_17",
        "date_18",
        "date_19",
        "date_20",
        "date_21",
        "date_22",
        "date_23",
        "date_24",
        "date_25",
        "date_26",
        "date_27",
        "date_28",
        "date_29",
        "date_30",
        "date_31",
        "total",
      ],
      formUpload: {
        period: "",
        job_number: "",
        part_number: "",
        dn: "",
        date_01: "",
        date_02: "",
        date_03: "",
        date_04: "",
        date_05: "",
        date_06: "",
        date_07: "",
        date_08: "",
        date_09: "",
        date_10: "",
        date_11: "",
        date_12: "",
        date_13: "",
        date_14: "",
        date_15: "",
        date_16: "",
        date_17: "",
        date_18: "",
        date_19: "",
        date_20: "",
        date_21: "",
        date_22: "",
        date_23: "",
        date_24: "",
        date_25: "",
        date_26: "",
        date_27: "",
        date_28: "",
        date_29: "",
        date_30: "",
        date_31: "",
        total: "",
      },
      tipeData: ["ALL", "Achieve", "Not Achieve", "Over"],
      detail: [],
      datatablesUploadMDFO: {
        search: "",
        headers: [
          { title: "Part Number", align: "left", value: "part_number" },
          { title: "Status", align: "left", value: "status" },
          { title: "Line", align: "left", value: "line" },
          { title: "Process", align: "left", value: "process" },
          { title: "MDFO", align: "left", value: "mdfo" },
          { title: "GSPH", align: "left", value: "gsph" },
          { title: "Simulate", align: "left", value: "ERROR" },
        ],
        items: [],
      },
      formUploadMDFO: [
        "part_number",
        "mdfo",
        "gsph",
        "process",
        "status",
        "line",
      ],
      // (Buat FORECAST)
      forecastActual: {
        days: [],                 // [1..31]
        modelKey: '',             // 'DN_HMMI' (hasil normalisasi dari route param)
        series: [],               // [{ name, type: 'barchart'|'spline'|'tableOnly', color?, data: number[] }]
        lastUpdated: null,
        isLoading: false
      }
      // (Buat FORECAST)
    };
  },

  // (Buat FORECAST)
  getters: {
    faDays:      s => s.forecastActual.days,
    faSeries:    s => s.forecastActual.series,
    faModelKey:  s => s.forecastActual.modelKey,
    faIsLoading: s => s.forecastActual.isLoading,

    barSeries:   s => s.forecastActual.series.filter(x => x.type === 'barchart'),
    lineSeries:  s => s.forecastActual.series.filter(x => x.type === 'spline'),
    tableOnlySeries: s => s.forecastActual.series.filter(x => x.type === 'tableOnly')
  },
  // (Buat FORECAST)

  actions: {
    async getAndonData() {
      notificationStore.loading = true;
      try {
        const response = await fetch('/localdata/data_api.json'); // Menggunakan fetch yang aman dari proxy
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const apiData = await response.json();

        // Memproses dan menyimpan data ke dalam state store itu sendiri
        // Mirip dengan method fillDailyAchievPress Anda
        this.dailyAchievPress.items = apiData.summary_line.map(summary => {
            const details = apiData.detail_daily.filter(d => d.line_id === summary.line);
            const daily = {};
            details.forEach(det => {
                if(!daily[det.date]) daily[det.date] = { plan: 0, actual: 0};
                daily[det.date].plan += det.plan;
                daily[det.date].actual += det.actual;
            });
            return {
                ...summary,
                daily: daily
            }
        });

        this.dailyAchievPress.itemsLine = apiData.summary_line;
        this.dailyAchievPress.details_daily = apiData.detail_daily;

        notificationStore.disableLoading();
        return { status: "success" };

      } catch (error) {
        console.error("Gagal mengambil data Andon:", error);
        notificationStore.showAlertError(error.message);
        return { status: "error" };
      }
    },

    // (Buat FORECAST)
    _normalizeKey(paramModel) {
      return String(paramModel || '').replace(/-/g, '_').toUpperCase();
    },

    async getForecastActual(modelParam, { baseDate } = {}) {
      this.forecastActual.isLoading = true;
      try {
        const resp = await fetch('/localdata/forecast_actual.json');
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const json = await resp.json();

        // tentukan jumlah hari dari baseDate (default: hari ini)
        const N = daysInMonth(baseDate || new Date());
        const days = makeDaysArray(N);

        const key = this._normalizeKey(modelParam);
        const arr = json[key];
        if (!Array.isArray(arr)) throw new Error(`Model ${key} tidak ditemukan di JSON`);

        const mapped = arr.map(row => ({
          name:  row.header || '',
          type:  row.type ? String(row.type).toLowerCase() : 'tableOnly',
          color: row.color || row.colors,              // fallback kalau masih ada "colors"
          data:  clampToDays(row.dailies_qty, N)       // paksa panjang = N hari
        }));

        this.forecastActual.days     = days;
        this.forecastActual.series   = mapped;
        this.forecastActual.modelKey = key;
        this.forecastActual.lastUpdated = new Date().toISOString();
        return { status: 'success' };
      } catch (e) {
        console.error(e);
        return { status: 'error', message: e.message };
      } finally {
        this.forecastActual.isLoading = false;
      }
    },
    // (Buat FORECAST)

    resetForm() {
      // this.updateQty();
      // this.fetchReportBlank();
      this.fetchReportIFP();
      this.dialog.form = false;
      this.dialog.formIfp = false;
      this.dialog.upload = false;
    },
    fetchReportBlank() {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/report-stock/blank`,
          {
            params: this.filter,
          }
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
    },
    filterItems() {
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

    // IFP
    fetchReportIFP() {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/report-stock/ifp`,
          {
            params: this.filter,
          }
        )
        .then((response) => {
          if (response.status === 200) {
            this.datatablesIFP.items = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },
    filterItemsIFP() {
      return this.datatablesIFP.items.filter((d) => {
        return Object.keys(this.datatablesIFP.filters).every((f) => {
          return (
            this.datatablesIFP.filters[f].length < 1 ||
            d[f]
              .toLowerCase()
              .includes(this.datatablesIFP.filters[f].toLowerCase())
          );
        });
      });
    },

    // Achivement PCS
    fetchReportAchievementPeriod() {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/report-stock/period`,
          {
            params: this.filter,
          }
        )
        .then((response) => {
          if (response.status === 200) {
            this.datatablesPCS.items = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },
    filterItemsPCS() {
      return this.datatablesPCS.items.filter((d) => {
        return Object.keys(this.datatablesPCS.filters).every((f) => {
          return (
            this.datatablesPCS.filters[f].length < 1 ||
            d[f]
              .toLowerCase()
              .includes(this.datatablesPCS.filters[f].toLowerCase())
          );
        });
      });
    },

    filteredItems() {
      return this.datatablesPress.items.filter((d) => {
        return Object.keys(this.datatablesPress.filters).every((f) => {
          return (
            this.datatablesPress.filters[f].length < 1 ||
            d[f]
              .toLowerCase()
              .includes(this.datatablesPress.filters[f].toLowerCase())
          );
        });
      });
    },

    // Achivement PCS
    fetchReportAchievementWeekday(tanggal) {
      notificationStore.loading = true;
      const data = new FormData();
      data.append("start", Array.isArray(tanggal) ? tanggal[0] : tanggal);
      data.append(
        "end",
        Array.isArray(tanggal) ? tanggal[1] ?? tanggal[0] : tanggal
      );
      data.append("tipe", this.datatablesPress.filter.tipe);
      axios
        .post(
          `http://${configStore.apiUrl}/majsf_rest_api/api/report-stock/weekday`,
          // `http://192.168.10.67/majsf_rest_api/api/report-stock/weekday`,
          data
        )
        .then((response) => {
          if (response.status === 200) {
            this.datatablesPress.items = response.data;
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
    fetchReportAchievementRangeDate(
      tanggal,
      line,
      process = "press",
      cutoff = ""
    ) {
      notificationStore.loading = true;
      const start = tanggal[0];
      const end = tanggal[1];
      if (!end || new Date(start) > new Date(end)) {
        notificationStore.showAlertError("Invalid date range selection!");
        notificationStore.disableLoading();
        return;
      }
      if (
        cutoff != "" &&
        (new Date(cutoff) > new Date(end) || new Date(cutoff) < new Date(start))
      ) {
        notificationStore.showAlertError("Invalid date cut off!");
        notificationStore.disableLoading();
        return;
      }
      if (process == "press") {
        axios
          .get(
            // `http://${configStore.apiUrl}/majsf_rest_api/api/report-stock/weekday`,
            `http://192.168.10.67/majsf_rest_api/api/report-stock/range_date?start=` +
              start +
              `&end=` +
              end +
              `&line=` +
              line +
              `&cutoff=` +
              cutoff
          )
          .then((response) => {
            if (response.status === 200) {
              this.dailyAchievPress.items = response.data.summary;
              this.dailyAchievPress.itemsLine = response.data.summary_line;
              this.dailyAchievPress.details = response.data.detail;
              this.dailyAchievPress.details_daily = response.data.detail_daily;
              this.dailyAchievPress.listDate = this.fillListDateInBetween(
                start,
                end
              );

              this.fillDailyAchievPress();

              notificationStore.disableLoading();
            } else {
              utilityStore.onApiResponse(response);
            }
          })
          .catch(utilityStore.onError)
          .finally(() => {
            notificationStore.disableLoading();
          });
      } else if (process == "weld") {
        axios
          .get(
            // `http://${configStore.apiUrl}/majsf_rest_api/api/report-stock/weekday`,
            `http://192.168.10.67/majsf_rest_api/api/report-stock/range_date_weld?start=` +
              start +
              `&end=` +
              end +
              `&line=` +
              line +
              `&cutoff=` +
              cutoff
          )
          .then((response) => {
            if (response.status === 200) {
              this.dailyAchievWeld.items = response.data.summary;
              this.dailyAchievWeld.itemsLine = response.data.summary_line;
              this.dailyAchievWeld.details = response.data.detail;
              this.dailyAchievWeld.details_daily = response.data.detail_daily;
              this.dailyAchievWeld.listDate = this.fillListDateInBetween(
                start,
                end
              );
              this.fillDailyAchievWeld();
              notificationStore.disableLoading();
            } else {
              utilityStore.onApiResponse(response);
            }
          })
          .catch(utilityStore.onError)
          .finally(() => {
            notificationStore.disableLoading();
          });
      }
      setTimeout(() => {
        this.dialog.datePicker = false;
      }, 500);
    },

    fillDailyAchievPress() {
      this.dailyAchievPress.cHeaders[1] = [];
      this.dailyAchievPress.cHeaders[0].length = 7;

      // INITIATE DATA BY LINE
      this.dailyAchievPress.itemsLine.forEach((elem) => {
        this.dailyAchievPress.byLine.seriesAct.push({
          y: elem.actual,
          color:
            elem.plan > elem.actual
              ? this.colors.minus
              : elem.plan == elem.actual
              ? this.colors.balance
              : this.colors.over,
        });
      });

      // SETUP DAILY ACHIEV HEADER
      this.dailyAchievPress.listDate.forEach((elem) => {
        this.dailyAchievPress.cHeaders[0].push({
          text: elem,
          align: "left",
          rowspan: 1,
          colspan: 3,
          value: elem,
        });
        this.dailyAchievPress.cHeaders[1].push(
          {
            text: "Plan",
            align: "left",
            rowspan: 1,
            colspan: 1,
            width: 50,
            value: "plan" + elem,
          },
          {
            text: "Act",
            align: "left",
            rowspan: 1,
            colspan: 1,
            width: 50,
            value: "act" + elem,
          },
          {
            text: "Achv",
            align: "left",
            rowspan: 1,
            colspan: 1,
            width: 60,
            value: "achiev" + elem,
          }
        );
      });

      // ADD DAILY ACHIEV FOR DETAILS
      this.dailyAchievPress.details.forEach((elem, index) => {
        const daily = this.dailyAchievPress.details_daily.filter(
          (val) =>
            val.line_id == elem.line_id && val.part_number == elem.part_number
        );
        const dailyByList = [];
        this.dailyAchievPress.listDate.forEach((elem2) => {
          const compare = daily.filter((val) => val.date == elem2);
          if (compare.length > 0) {
            dailyByList.push({
              line_id: compare[0].line_id,
              shift: compare[0].shift,
              date: elem2,
              part_number: compare[0].part_number,
              plan: compare[0].plan,
              actual: compare[0].actual,
            });
          } else {
            dailyByList.push({
              line_id: elem.line_id,
              shift: 0,
              date: elem2,
              part_number: elem.part_number,
              plan: "0",
              actual: "0",
            });
          }
        });
        this.dailyAchievPress.details[index].daily = dailyByList;
      });
    },

    fillDailyAchievWeld() {
      this.dailyAchievWeld.cHeaders[1] = [];
      this.dailyAchievWeld.cHeaders[0].length = 7;

      // INITIATE DATA BY LINE
      this.dailyAchievWeld.itemsLine.forEach((elem) => {
        this.dailyAchievWeld.byLine.seriesAct.push({
          y: elem.actual,
          color:
            elem.plan > elem.actual
              ? this.colors.minus
              : elem.plan == elem.actual
              ? this.colors.balance
              : this.colors.over,
        });
      });

      // SETUP DAILY ACHIEV HEADER
      this.dailyAchievWeld.listDate.forEach((elem) => {
        this.dailyAchievWeld.cHeaders[0].push({
          text: elem,
          align: "left",
          rowspan: 1,
          colspan: 3,
          value: elem,
        });
        this.dailyAchievWeld.cHeaders[1].push(
          {
            text: "Plan",
            align: "left",
            rowspan: 1,
            colspan: 1,
            width: 50,
            value: "plan" + elem,
          },
          {
            text: "Act",
            align: "left",
            rowspan: 1,
            colspan: 1,
            width: 50,
            value: "act" + elem,
          },
          {
            text: "Achv",
            align: "left",
            rowspan: 1,
            colspan: 1,
            width: 60,
            value: "achiev" + elem,
          }
        );
      });

      // ADD DAILY ACHIEV FOR DETAILS
      this.dailyAchievWeld.details.forEach((elem, index) => {
        const daily = this.dailyAchievWeld.details_daily.filter(
          (val) =>
            val.line_id == elem.line_id && val.part_number == elem.part_number
        );
        const dailyByList = [];
        this.dailyAchievWeld.listDate.forEach((elem2) => {
          const compare = daily.filter((val) => val.date == elem2);
          if (compare.length > 0) {
            dailyByList.push({
              line_id: compare[0].line_id,
              shift: compare[0].shift,
              date: elem2,
              part_number: compare[0].part_number,
              plan: compare[0].plan,
              actual: compare[0].actual,
            });
          } else {
            dailyByList.push({
              line_id: elem.line_id,
              shift: 0,
              date: elem2,
              part_number: elem.part_number,
              plan: "0",
              actual: "0",
            });
          }
        });
        this.dailyAchievWeld.details[index].daily = dailyByList;
      });
    },

    fillListDateInBetween(date1, date2) {
      const start = parseISO(date1);
      const end = parseISO(date2);

      const dates = eachDayOfInterval({ start, end });

      const formattedDates = dates.map((date) => format(date, "yyyy-MM-dd"));

      return formattedDates;
    },

    filteredAchievItems(process = "press") {
      if (process == "press") {
        return this.dailyAchievPress.details.filter((d) => {
          return Object.keys(this.dailyAchievPress.filters).every((f) => {
            return (
              this.dailyAchievPress.filters[f].length < 1 ||
              d[f]
                .toLowerCase()
                .includes(this.dailyAchievPress.filters[f].toLowerCase())
            );
          });
        });
      } else {
        return this.dailyAchievWeld.details.filter((d) => {
          return Object.keys(this.dailyAchievWeld.filters).every((f) => {
            return (
              this.dailyAchievWeld.filters[f].length < 1 ||
              d[f]
                .toLowerCase()
                .includes(this.dailyAchievWeld.filters[f].toLowerCase())
            );
          });
        });
      }
    },

    updateQty() {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/report-stock/update_qty`,
          {
            params: this.filterDate,
          }
        )
        .then((response) => {
          if (response.status === 200) {
            this.fetchReportBlank();
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },
    loadDataStockAwal(action, data) {
      Object.entries(this.formData).map((i) => {
        this.formData[i[0]] = data[i[0]];
      });
      this.action = action;
      this.dialog.form = true;
    },
    loadDataStockAwalIfp(action, data) {
      Object.entries(this.formIfp).map((i) => {
        this.formIfp[i[0]] = data[i[0]];
      });
      this.action = action;
      this.dialog.formIfp = true;
    },
    onUpdate(tipe) {
      notificationStore.loading = true;
      let valid = true;
      const data =
        this.action == "Edit" ? new URLSearchParams() : new FormData();
      if (tipe == "bl") {
        Object.entries(this.formData).map((e) => {
          if (!e[1] && !(e[0] == "part_number" || e[0] == "stock_awal")) {
            valid = false;
          }
          data.append("period", this.filter.period);
          data.append("tipe", tipe);
          data.append(e[0], e[1]);
        });
      } else if (tipe == "ifp") {
        Object.entries(this.formIfp).map((e) => {
          if (!e[1] && !(e[0] == "part_number" || e[0] == "stock_awal")) {
            valid = false;
          }
          data.append("period", this.filter.period);
          data.append("tipe", tipe);
          data.append(e[0], e[1]);
        });
      }

      if (valid) {
        let configHttp = {
          method: "put",
          url: `http://${configStore.apiUrl}/majsf_rest_api/api/report-stock/stock_awal`,
          headers: {
            "Content-Type": "multipart/form-data",
          },
          data,
        };

        axios(configHttp)
          .then((response) =>
            notificationStore.onApiResponseToastAlert(response, this.resetForm)
          )
          .catch(configStore.onError);
      } else {
        notificationStore.showAlertWarning(
          "Data yang anda kirim tidak Lengkap."
        );
        notificationStore.disableLoading();
      }
    },

    onUpload() {
      notificationStore.loading = true;
      if (this.datatablesUpload.items.length) {
        const data = new FormData();
        this.datatablesUpload.items.map((item) => {
          data.append("period", this.formData.period);
          Object.keys(item).map((val) => {
            if (this.form.includes(val)) {
              data.append(val + "[]", item[val]);
            }
          });
        });
        const configHttp = {
          method: "post",
          url: `http://${configStore.apiUrl}/majsf_rest_api/api/master/fix_order`,
          headers: {
            "Content-Type": "multipart/form-data",
          },
          data,
        };
        axios(configHttp)
          .then((response) => {
            if (response.status === 200) {
              let error = true;
              let message = "";
              if (response.data.success) {
                error = false;
                this.resetForm();
                this.dialog.upload = false;
              }
              let tmp = document.createElement("DIV");
              tmp.innerHTML = response.data.messages + message;
              if (error) {
                notificationStore.showAlertWarning(
                  tmp.textContent || tmp.innerText || ""
                );
              } else {
                notificationStore.showAlertSuccess(
                  tmp.textContent || tmp.innerText || ""
                );
              }
            } else {
              notificationStore.showAlertWarning(response.data.status);
            }
            notificationStore.disableLoading();
          })
          .catch(configStore.onError);
      } else {
        notificationStore.showAlertWarning(
          "Data yang anda kirim tidak Lengkap"
        );
      }
    },
    loadDetail(part_number, tanggal) {
      notificationStore.loading = true;
      const data = new FormData();
      data.append("start", Array.isArray(tanggal) ? tanggal[0] : tanggal);
      data.append(
        "end",
        Array.isArray(tanggal) ? tanggal[1] ?? tanggal[0] : tanggal
      );
      data.append("tipe", this.datatablesPress.filter.tipe);
      data.append("part_number", part_number);
      axios
        .post(
          `http://${configStore.apiUrl}/majsf_rest_api/api/report-stock/detail`,
          data
        )
        .then((response) => {
          if (response.data.status === false) {
            utilityStore.onApiResponse(response);
          } else {
            notificationStore.loading = false;
            this.detail = response.data;
            this.dialog.detail = true;
          }
        })
        .catch(utilityStore.onError);
    },
    // Achivement PCS
    fetchMutasiAndon(tanggal) {
      notificationStore.loading = true;
      const data = new FormData();
      data.append("start", tanggal[0]);
      data.append("end", tanggal[1] ?? tanggal[0]);
      axios
        .post(
          `http://${configStore.apiUrl}/majsf_rest_api/api/report-stock/mutasi`,
          data
        )
        .then((response) => {
          if (response.status === 200) {
            this.datatablesMutasi.items = response.data;
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
    filteredItemsMutasi() {
      return this.datatablesMutasi.items.filter((d) => {
        return Object.keys(this.datatablesMutasi.filters).every((f) => {
          return (
            this.datatablesMutasi.filters[f].length < 1 ||
            d[f]
              .toLowerCase()
              .includes(this.datatablesMutasi.filters[f].toLowerCase())
          );
        });
      });
    },
    onUploadMDFO() {
      notificationStore.loading = true;
      if (this.datatablesUploadMDFO.items.length) {
        const data = new FormData();
        this.datatablesUploadMDFO.items.map((item) => {
          data.append("period", this.formData.period);
          Object.keys(item).map((val) => {
            if (this.formUploadMDFO.includes(val)) {
              data.append(val + "[]", item[val]);
            }
          });
        });
        const configHttp = {
          method: "post",
          url: `http://${configStore.apiUrl}/majsf_rest_api/api/master/patan/mdfo`,
          headers: {
            "Content-Type": "multipart/Upload-data",
          },
          data,
        };
        axios(configHttp)
          .then((response) => {
            if (response.status === 200) {
              let error = true;
              let message = "";
              if (response.data.success) {
                error = false;
                this.resetForm();
                this.dialog.upload = false;
              }
              let tmp = document.createElement("DIV");
              tmp.innerHTML = response.data.messages + message;
              if (error) {
                utilityStore.onApiResponse(response);
              } else {
                notificationStore.showAlertSuccess(
                  tmp.textContent || tmp.innerText || ""
                );
              }
            } else {
              utilityStore.onApiResponse(response);
            }
            notificationStore.disableLoading();
          })
          .catch(configStore.onError);
      } else {
        notificationStore.showAlertWarning(
          "Data yang anda kirim tidak Lengkap"
        );
      }
    },
  },
});
