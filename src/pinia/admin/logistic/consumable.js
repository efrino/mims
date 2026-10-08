import axios from "axios";
import { defineStore } from "pinia";
import { useNotificationStore } from "@/pinia/notification";
import { useConfigStore } from "@/pinia/config";
import { useUtilityStore } from "@/pinia/utility";
import { useAuthStore } from "@/pinia/auth";
import { nextTick } from "vue";
import ChartJSPluginDatalabels from "chartjs-plugin-datalabels";
import { Chart } from "chart.js";

const configStore = useConfigStore();
const utilityStore = useUtilityStore();
const notificationStore = useNotificationStore();
const authStore = useAuthStore();
const date = utilityStore.getCurrentShift();

function createCustomLegendPlugin() {
  return {
    id: "customLegend",
    afterUpdate(chart) {
      const legends = chart.legend.legendItems;
      const alreadyAdded = legends.some((l) => l.text === "Balance");
      if (!alreadyAdded) {
        legends.push({
          text: "Balance",
          fillStyle: "#0072ef",
          hidden: false,
          lineWidth: 0,
        });
      }
    },
  };
}

export const useConsumableStore = defineStore({
  id: "consumable",
  state() {
    return {
      action: "Add",
      apiUrl: configStore.apiUrl,
      permissions: {
        create: authStore.checkAccess("Master.Create.Consumable"),
      },
      shiftNow: utilityStore.getShiftNow(),
      table: {
        items: [],
      },
      cachedMaterial: null,
      datatables: {
        headers: [
          { text: "No", align: "left", value: "" },
          { text: "Code Material", align: "left", value: "code_material" },
          {
            text: "Material Description",
            align: "left",
            value: "material_description",
          },
          { text: "Keb / Hari", align: "left", value: "pcs_day" },
          { text: "Gambar", align: "left", value: "" },
        ],
        items: [],
        filters: {
          code_material: [],
          material_description: [],
          satuan: [],
        },
      },
      datatablesRundown: {
        headers: [
          {
            text: "No",
            align: "center",
            value: "",
            class: "white--text blue darken-1 pt-2",
          },
          {
            text: "Code Material",
            align: "center",
            value: "code_material",
            class: "white--text blue darken-1 pt-2",
          },
          {
            text: "Material Description",
            align: "center",
            value: "material_description",
            class: "white--text blue darken-1",
          },
          // { text: "Satuan", align: "center", value: "satuan", class: "white--text blue darken-1 pt-2" },
          {
            text: "PCS Day",
            align: "center",
            value: "pcs_day",
            class: "white--text blue darken-1 pt-2",
          },
          {
            text: "Stok",
            align: "center",
            value: "stok",
            class: "white--text blue darken-1 pt-2",
          },
          {
            text: "Strength",
            align: "center",
            value: "strength",
            class: "white--text blue darken-1",
          },
        ],
        items: [],
        filters: {
          code_material: [],
          material_description: [],
          satuan: [],
          pcs_day: [],
          stok: [],
          strength: [],
        },
      },

      datatablesUpload: {
        headers: [
          { text: "No", align: "left", value: "" },
          { text: "Code Material", align: "left", value: "code_material" },
          {
            text: "Material Description",
            align: "left",
            value: "material_description",
          },
          { text: "PCS / Day", align: "left", value: "pcs_day" },
          { text: "Stok", align: "left", value: "stok" },
          { text: "Strength", align: "left", value: "strength" },
          { text: "Lokasi", align: "left", value: "lokasi" },
        ],
        items: [],
        filters: {
          code_material: [],
          material_description: [],
          pcs_day: [],
          stok: [],
          strength: [],
          lokasi: [],
        },
      },
      datatablesUploadBudget: {
        headers: [
          { text: "No", align: "left", value: "" },
          { text: "Code Material", align: "left", value: "ZMATL" },
          {
            text: "Material Description",
            align: "left",
            value: "ZDESK",
          },
          { text: "Satuan", align: "left", value: "ZSATUAN" },
          { text: "Press", align: "left", value: "ZPRESS" },
          { text: "Welding", align: "left", value: "ZWELD" },
          { text: "Logistic", align: "left", value: "ZLOG" },
          { text: "Die MTC", align: "left", value: "ZDIEMTC" },
          { text: "Die MFG", align: "left", value: "ZDIEMFG" },
          { text: "PS Press", align: "left", value: "ZPSPRESS" },
          { text: "PS Welding", align: "left", value: "ZPSWELDING" },
          { text: "TOOL JIG", align: "left", value: "ZTOOLJIG" },
          { text: "Quality Control", align: "left", value: "ZQC" },
          { text: "General Affair", align: "left", value: "ZGA" },
          { text: "Validation", align: "left", value: "" },
        ],
        items: [],
        filters: {
          ZMATL: [],
          ZDESK: [],
        },
      },
      datatablesReserv: {
        headers: [
          {
            text: "No",
            align: "center",
            value: "",
            class: "white--text blue darken-1",
          },

          {
            text: "No Reservation",
            align: "center",
            value: "RSNUM",
            class: "white--text blue darken-1",
          },
          {
            text: "Code Material",
            align: "center",
            value: "MATNR",
            class: "white--text blue darken-1",
          },
          {
            text: "Material Description",
            align: "center",
            value: "MAKTX",
            class: "white--text blue darken-1",
          },
          {
            text: "Order",
            align: "center",
            value: "BDMNG",
            class: "white--text blue darken-1",
          },
          {
            text: "Aktual",
            align: "center",
            value: "ENMNG",
            class: "white--text blue darken-1",
          },
          {
            text: "Balance",
            align: "center",
            value: "ZDIFF",
            class: "white--text blue darken-1",
          },
        ],
        items: {
          data: [],
          chart_over: [],
          chart_actual: [],
        },
        filters: {
          RSNUM: [],
          MATNR: [],
          MAKTX: [],
          BDMNG: [],
          ENMNG: [],
        },
        status: "All",
      },
      datatablesReservAllDept: {
        headers: [
          {
            text: "No",
            align: "center",
            value: "",
            class: "white--text blue darken-1",
          },
          {
            text: "Dept",
            align: "center",
            value: "KOSTL",
            class: "white--text blue darken-1",
          },
          {
            text: "No Reservation",
            align: "center",
            value: "RSNUM",
            class: "white--text blue darken-1",
          },
          {
            text: "Code Material",
            align: "center",
            value: "MATNR",
            class: "white--text blue darken-1",
          },
          {
            text: "Material Description",
            align: "center",
            value: "MAKTX",
            class: "white--text blue darken-1",
          },
          {
            text: "Order",
            align: "center",
            value: "BDMNG",
            class: "white--text blue darken-1",
          },
          {
            text: "Aktual",
            align: "center",
            value: "ENMNG",
            class: "white--text blue darken-1",
          },
          {
            text: "Balance",
            align: "center",
            value: "ZDIFF",
            class: "white--text blue darken-1",
          },
        ],
        items: {
          data: [],
          chart_over: [],
          chart_actual: [],
        },
        filters: {
          RSNUM: [],
          MATNR: [],
          MAKTX: [],
          BDMNG: [],
          ENMNG: [],
        },
        status: "All",
      },
      datatablesBudget: {
        headers: [
          {
            text: "No",
            align: "center",
            value: "",
            class: "white--text blue darken-1",
          },
          {
            text: "Code Material",
            align: "center",
            value: "ZMATL",
            class: "white--text blue darken-1",
          },
          {
            text: "Material Description",
            align: "center",
            value: "ZDESK",
            class: "white--text blue darken-1",
          },
          {
            text: "Budget",
            align: "center",
            value: "ZPLAN",
            class: "white--text blue darken-1",
          },
          {
            text: "Aktual",
            align: "center",
            value: "ZQTY",
            class: "white--text blue darken-1",
          },
          {
            text: "Balance",
            align: "center",
            value: "",
            class: "white--text blue darken-1",
          },
        ],
        items: {
          data: [],
          chart_over: [],
          chart_actual: [],
        },
        filters: {
          ZMATL: [],
          ZDESK: [],
          ZPLAN: [],
          ZQTY: [],
        },
        status: "All",
      },
      datatablesBudgetAllDept: {
        headers: [
          {
            text: "No",
            align: "center",
            value: "",
            class: "white--text blue darken-1",
          },
          {
            text: "Department",
            align: "center",
            value: "ZCOST",
            class: "white--text blue darken-1",
          },
          {
            text: "Code Material",
            align: "center",
            value: "ZMATL",
            class: "white--text blue darken-1",
          },
          {
            text: "Material Description",
            align: "center",
            value: "ZDESK",
            class: "white--text blue darken-1",
          },
          {
            text: "Budget",
            align: "center",
            value: "ZPLAN",
            class: "white--text blue darken-1",
          },
          {
            text: "Aktual",
            align: "center",
            value: "ZQTY",
            class: "white--text blue darken-1",
          },
          {
            text: "Balance",
            align: "center",
            value: "",
            class: "white--text blue darken-1",
          },
        ],
        items: {
          data: [],
          chart_actual: [],
        },
        filters: {
          ZCOST: [],
          ZMATL: [],
          ZDESK: [],
          ZPLAN: [],
          ZQTY: [],
        },
        status: "All",
      },
      datatablesIncoming: {
        headers: [
          {
            text: "No",
            align: "center",
            value: "",
            class: "white--text blue darken-1",
          },
          {
            text: "Code Material",
            align: "center",
            value: "ZMATL",
            class: "white--text blue darken-1",
          },
          {
            text: "Material Description",
            align: "center",
            value: "ZDESK",
            class: "white--text blue darken-1",
          },
          {
            text: "Satuan",
            align: "center",
            value: "ZSATUAN",
            class: "white--text blue darken-1",
          },
          {
            text: "Aspek",
            align: "center",
            value: "ZASPEK",
            class: "white--text blue darken-1",
          },
          {
            text: "Planning",
            align: "center",
            value: "ZPLAN",
            class: "white--text blue darken-1",
          },
          {
            text: "Actual",
            align: "center",
            value: "ZQTY",
            class: "white--text blue darken-1",
          },
          {
            text: "Pending",
            align: "center",
            value: "ZPENDING",
            class: "white--text blue darken-1",
          },
        ],
        items: [],
        filters: {
          ZMATL: [],
          ZDESK: [],
          ZSATUAN: [],
          ZASPEK: [],
          ZPLAN: [],
          ZQTY: [],
          ZPENDING: [],
        },
        chart: [],
      },
      datatablesUploadIncoming: {
        headers: [
          { text: "Code Material", align: "left", value: "ZMATL" },
          {
            text: "Material Description",
            align: "left",
            value: "ZDESK",
          },
          { text: "Planning", align: "left", value: "ZPLAN" },
          { text: "Actual", align: "left", value: "ZQTY" },
          { text: "Satuan", align: "left", value: "ZSATUAN" },
          { text: "Aspek", align: "left", value: "ZASPEK" },
        ],
        items: [],
        filters: {
          ZMATL: [],
          ZDESK: [],
          ZPLAN: [],
          ZQTY: [],
          ZSATUAN: [],
          ZASPEK: [],
        },
      },
      form: [
        "code_material",
        "material_description",
        "pcs_day",
        "stok",
        "strength",
        "lokasi",
        "pcs_day",
      ],
      formData: {
        code_material: "",
        material_description: "",
        lokasi: "",
        photo: null,
        satuan: "",
        photo_type: "",
        pcs_day: "",
      },
      formBudget: [
        "ZMATL",
        "ZDESK",
        "ZSATUAN",
        "ZPRESS",
        "ZWELD",
        "ZLOG",
        "ZDIEMTC",
        "ZDIEMFG",
        "ZPSPRESS",
        "ZPSWELDING",
        "ZTOOLJIG",
        "ZQC",
        "ZGA",
      ],
      formDataBudget: {
        ZMATL: "",
        ZDESK: "",
        ZSATUAN: "",
        ZPRESS: "",
        ZWELD: "",
        ZLOG: "",
        ZDIEMTC: "",
        ZDIEMFG: "",
        ZPSPRESS: "",
        ZPSWELDING: "",
        ZTOOLJIG: "",
        ZQC: "",
        ZGA: "",
        ZPLAN: "",
      },
      formIncoming: [
        "ZPERIOD",
        "ZMATL",
        "ZDESK",
        "ZPLAN",
        "ZQTY",
        "ZSATUAN",
        "ZASPEK",
      ],
      formDataIncoming: {
        ZMATL: "",
        ZDESK: "",
        ZPLAN: "",
        ZQTY: "",
        ZSATUAN: "",
        ZASPEK: "",
      },
      balanceStatuses: ["All", "Over", "Minus"],
      balanceStatusesReserv: ["All", "Safe", "Minus"],
      filter: {
        inventaris: "",
        department: "",
        period: date.period,
        date: date.date,
      },
      formDetail: {
        code_material: "",
        material_description: "",
        lokasi: "",
      },
      speedDial: {
        model: false,
        btn: false,
      },
      highlightedArea: null,
      judulMasterData: "",
      judulDataBudget: "",
      chartData: {
        labels: [],
        datasets: [
          {
            data: [],
            backgroundColor: [],
          },
        ],
      },
      chartDataReserv: {
        labels: [],
        datasets: [],
      },
      chartDataIncoming: {
        labels: [],
        datasets: [],
      },
      chartDataOver: {
        labels: [],
        datasets: [],
      },
      chartDataActual: {
        labels: [],
        datasets: [],
      },
      chartDataAllDept: {
        labels: [],
        datasets: [],
      },
      chartOptionsAllDept: null,
      dialog: {
        detail: false,
        masterData: false,
        filter: false,
        form: false,
        upload: false,
        datePickerPeriod: false,
        dataIncoming: false,
        dataBudget: false,
      },
      list: {
        inventaris: ["CONSUMABLE", "PLANT SERVICE", "TOOLING"],
        department: [
          "Press",
          "Welding",
          "Logistic",
          "Dies Maintenance",
          "Dies Manufacture",
          "Plant Service Press",
          "Plant Service Welding",
          "Tooling JIG",
          "Quality Control",
          "General Affair",
        ],
        lokasi: ["A1", "B1", "B2"],
      },
      PPENDING: ["ALL", "MINUS"],
      viewData: false,
      viewReserv: false,
      budgetChart: false,
      pdf: false,
      typeStore: "",
      activeIndex: null,
      allDept: null,
      currentBlcStatus: "ALL",

      // List Judul di bagian paling kanan
      header: [
        { id: "1", name: "SOP IW", children: ["SOP Incoming", "SOP Outgoing"] },
        { id: "2", name: "Consumable", children: [] },
        {
          id: "3",
          name: "Plant Service",
          children: ["Electric", "Mechanic", "Pneumatic", "Hydraulic"],
        },
        { id: "4", name: "Tooling", children: [] },
        { id: "5", name: "Incoming IW", children: [] },
        {
          id: "6",
          name: "Outgoing IW",
          children: [
            "Press",
            "Welding",
            "Logistic",
            "Dies Maintenance",
            "Dies Manufacture",
            "Plant Service Press",
            "Plant Service Welding",
            "Tooling JIG",
            "Quality Control",
            "General Affair",
            "All Dept",
          ],
        },
      ],

      // Setting Grafik Incoming
      chartIncoming: {
        style: [],
        plugins: [ChartJSPluginDatalabels],
        options: {
          responsive: true,
          maintainAspectRatio: false,
          locale: "en-EN",
          plugins: {
            legend: {
              position: "top",
              labels: {
                font: {
                  size: 18,
                },
                padding: 20,
              },
            },
            datalabels: {
              font: {
                weight: "bold",
                size: 20,
              },
              formatter: (value, ctx) => {
                let sum = ctx.chart.data.datasets[0].data.reduce(
                  (acc, data) => acc + data,
                  0
                );

                if (sum === 0) return "0%";

                let percentage = ((value * 100) / sum).toFixed(2) + "%";
                return percentage;
              },
              display: true,
              align: (ctx) => {
                let sum = ctx.chart.data.datasets[0].data.reduce(
                  (acc, data) => acc + data,
                  0
                );
                let percentage = (
                  (ctx.dataset.data[ctx.dataIndex] * 100) /
                  sum
                ).toFixed(2);
                return percentage < 5 ? "start" : "center";
              },
              clip: true,
              padding: { top: 2, bottom: 2 },
              color: "black",
            },
          },
        },
      },

      // Setting Grafik rundown
      chart: {
        style: [],
        plugins: [
          {
            datalabels: {
              anchor: "end",
              align: "top",
              formatter: Math.round,
              font: {
                weight: "bold",
                size: 14,
              },
            },
          },
        ],
        options: {
          responsive: true,
          maintainAspectRatio: false,
          borderRadius: 2,
          indexAxis: "y",
          plugins: {
            legend: {
              display: false,
            },
            datalabels: {
              formatter: Math.round,
              font: {
                weight: "bold",
                size: 14,
              },
              color: "#fff",
            },
          },
          scales: {
            y: {
              display: false,
            },
            x: {
              display: false,
            },
          },
        },
      },

      // Setting Grafik Budget
      chartReserv: {
        style: [],
        plugins: [ChartJSPluginDatalabels, createCustomLegendPlugin()],
        options: {
          responsive: true,
          maintainAspectRatio: false,
          backgroundColor: "#e53935",
          locale: "en-EN",
          plugins: {
            datalabels: {
              anchor: "end",
              align: "top",
              font: {
                weight: "bold",
              },
              formatter: (value) => {
                return new Intl.NumberFormat("id-ID").format(value);
              },
            },
            legend: {
              position: "top",
              labels: {
                generateLabels: (chart) => {
                  const labels =
                    Chart.defaults.plugins.legend.labels.generateLabels(chart);

                  const id = chart?.canvas?.id;

                  if (id && id === "chart-reserv") {
                    const alreadyExists = labels.some(
                      (l) => l.text === "Balance"
                    );
                    if (!alreadyExists) {
                      labels.push({
                        text: "Balance",
                        fillStyle: "#0072ef",
                        strokeStyle: "#0072ef",
                        hidden: false,
                        datasetIndex: null,
                      });
                    }
                  }

                  return labels.map((label) => {
                    if (label.text === "Actual") {
                      return {
                        ...label,
                        fillStyle: "#e53935", // 🩶 abu-abu, bukan biru
                        strokeStyle: "#e53935",
                      };
                    }
                    return label;
                  });
                },
              },
            },
          },
          scales: {
            x: {
              ticks: {
                callback: function (value, index) {
                  let chart = this.chart;
                  let label = chart.data.labels[index] || "";
                  if (/\s/.test(label)) {
                    return label.split(" ");
                  } else {
                    return label;
                  }
                },
                whiteSpace: "pre-line", // Biar newline (\n) diterima
                maxRotation: 0, // Supaya tidak miring
                minRotation: 0,
                autoSkip: false,
              },
            },
            y: {
              beginAtZero: true,
              suggestedMax: 50,
              ticks: {
                stepSize: 5,
              },
              grid: {
                display: true,
              },
            },
          },
        },
      },
      chartBudget: {
        style: [],
        plugins: [ChartJSPluginDatalabels, createCustomLegendPlugin()],
        options: {
          responsive: true,
          maintainAspectRatio: false,
          backgroundColor: "#e53935",
          locale: "en-EN",
          plugins: {
            datalabels: {
              anchor: "end",
              align: "top",
              font: {
                weight: "bold",
              },
              formatter: (value) => {
                return new Intl.NumberFormat("id-ID").format(value);
              },
            },
            legend: {
              position: "top",
              labels: {
                generateLabels: (chart) => {
                  const labels =
                    Chart.defaults.plugins.legend.labels.generateLabels(chart);

                  const id = chart?.canvas?.id;

                  if (id && id === "chart-budget") {
                    const alreadyExists = labels.some(
                      (l) => l.text === "Balance"
                    );
                    if (!alreadyExists) {
                      labels.push({
                        text: "Balance",
                        fillStyle: "#0072ef",
                        strokeStyle: "#0072ef",
                        hidden: false,
                        datasetIndex: null,
                      });
                    }
                  }

                  return labels.map((label) => {
                    if (label.text === "Actual") {
                      return {
                        ...label,
                        fillStyle: "#e53935", // 🩶 abu-abu, bukan biru
                        strokeStyle: "#e53935",
                      };
                    }
                    return label;
                  });
                },
              },
            },
          },
          scales: {
            x: {
              ticks: {
                callback: function (value, index) {
                  let chart = this.chart;
                  let label = chart.data.labels[index] || "";
                  if (/\s/.test(label)) {
                    return label.split(" ");
                  } else {
                    return label;
                  }
                },
                whiteSpace: "pre-line", // Biar newline (\n) diterima
                maxRotation: 0, // Supaya tidak miring
                minRotation: 0,
                autoSkip: false,
              },
            },
            y: {
              beginAtZero: true,
              suggestedMax: 50,
              ticks: {
                stepSize: 5,
              },
              grid: {
                display: true,
              },
            },
          },
        },
      },
      chartBudgetOver: {
        style: [],
        plugins: [ChartJSPluginDatalabels],
        options: {
          responsive: true,
          maintainAspectRatio: false,
          backgroundColor: "#e53935",
          locale: "en-EN",
          plugins: {
            datalabels: {
              anchor: "end",
              align: "top",
              font: {
                weight: "bold",
              },
              formatter: (value) => {
                return new Intl.NumberFormat("id-ID").format(value);
              },
            },
          },
          scales: {
            x: {
              ticks: {
                callback: function (value, index) {
                  let chart = this.chart;
                  let label = chart.data.labels[index] || "";
                  if (/\s/.test(label)) {
                    return label.split(" ");
                  } else {
                    return label;
                  }
                },
                whiteSpace: "pre-line", // Biar newline (\n) diterima
                maxRotation: 0, // Supaya tidak miring
                minRotation: 0,
                autoSkip: false,
              },
            },
            y: {
              beginAtZero: true,
              suggestedMax: 50,
              ticks: {
                stepSize: 5,
              },
              grid: {
                display: true,
              },
            },
          },
        },
      },
      chartBudgetAll: {
        style: [],
        plugins: [ChartJSPluginDatalabels],
        options: {
          responsive: true,
          maintainAspectRatio: false,
          backgroundColor: "#e53935",
          locale: "en-EN",
          plugins: {
            datalabels: {
              anchor: "end",
              align: "top",
              font: {
                weight: "bold",
              },
              formatter: (value) => {
                return new Intl.NumberFormat("id-ID").format(value);
              },
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              suggestedMax: 50,
              ticks: {
                stepSize: 5,
              },
              grid: {
                display: true,
              },
            },
          },
        },
      },
      chartConfig: {
        type: "bar",
        data: {
          labels: ["Red", "Blue", "Yellow"],
          datasets: [
            {
              label: "# of Votes",
              data: [12, 19, 3],
              backgroundColor: [
                "rgba(255, 99, 132, 0.2)",
                "rgba(54, 162, 235, 0.2)",
                "rgba(255, 206, 86, 0.2)",
              ],
              borderColor: [
                "rgba(255,99,132,1)",
                "rgba(54, 162, 235, 1)",
                "rgba(255, 206, 86, 1)",
              ],
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
        },
      },
    };
  },
  actions: {
    resetForm() {
      this.formData = {
        code_material: "",
        material_description: "",
        lokasi: "",
        satuan: "",
      };
      this.formDataBudget = {
        ZMATL: "",
        ZDESK: "",
        ZPLAN: "",
      };
      this.dialog.detail = false;
      this.dialog.form = false;
      // this.fetchMasterDataIncoming()
    },
    fetchMasterConsumable(data) {
      let params = { code_material: data };
      notificationStore.loading = true;
      axios
        .get(`http://${configStore.apiUrl}/majsf_rest_api/api/consumable`, {
          params: params,
        })
        .then((response) => {
          if (response.status === 200) {
            this.datatablesRundown.items = response.data;
            if (data !== "empty" && data && response.data.length > 0) {
              this.datatablesRundown.items = response.data;
              this.formData.lokasi =
                response.data.length > 0 ? response.data[0].lokasi : "";
              this.formDetail.lokasi =
                response.data.length > 0 ? response.data[0].lokasi : "";
              this.formDetail.code_material =
                response.data.length > 0 ? response.data[0].code_material : "";
              this.formData.material_description =
                response.data.length > 0
                  ? response.data[0].material_description
                  : "";
              this.formDetail.material_description =
                response.data.length > 0
                  ? response.data[0].material_description
                  : "";
              this.dialog.detail = true;
            } else {
              this.resetForm();
            }
            notificationStore.disableLoading();
          }
        });
    },

    fetchMasterData(data) {
      let params = { type: data.toUpperCase() };
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/consumable/master_data`,
          {
            params: params,
          }
        )
        .then((response) => {
          if (response.status === 200) {
            this.datatables.items = response.data;
            this.dialog.masterData = true;
            this.judulMasterData = data;
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

    filterItemsRundown() {
      return this.datatablesRundown.items.filter((d) => {
        return Object.keys(this.datatablesRundown.filters).every((f) => {
          return (
            this.datatablesRundown.filters[f].length < 1 ||
            d[f]
              .toLowerCase()
              .includes(this.datatablesRundown.filters[f].toLowerCase())
          );
        });
      });
    },

    onUpdate() {
      notificationStore.loading = true;
      const data = this.action == "Edit" ? new FormData() : new FormData();
      Object.entries(this.formData).map((e) => {
        data.append(e[0], e[1]);
      });
      data.append("type", this.filter.inventaris);
      data.append("action", this.action);

      let configHttp = {
        method: "post",
        url: `http://${configStore.apiUrl}/majsf_rest_api/api/consumable`,
        headers: {
          "Content-Type": "multipart/form-data",
        },
        data,
      };

      axios(configHttp)
        .then((response) =>
          notificationStore.onApiResponseToastAlert(
            response,
            this.resetForm,
            this.fetchMasterData(this.filter.inventaris)
          )
        )
        .catch(configStore.onError);
    },

    getImgUrl(code_material, imageTimestamp) {
      try {
        return (
          `http://192.168.10.67/part/consumable/` +
          code_material +
          `.png?t=${imageTimestamp}`
        );
      } catch (_) {
        return `http://192.168.10.67/part/no-image.png?t=${imageTimestamp}`;
      }
    },

    loadDataMaster(action, data) {
      Object.entries(this.formData).map((i) => {
        this.formData[i[0]] = data[i[0]];
      });
      this.action = action;
      this.dialog.form = true;
    },
    loadDataMasterBudget(action, data) {
      Object.entries(this.formDataBudget).map((i) => {
        this.formDataBudget[i[0]] = data[i[0]];
      });
      this.action = action;
      this.dialog.form = true;
    },
    loadDataMasterIncoming(action, data) {
      Object.entries(this.formDataIncoming).map((i) => {
        this.formDataIncoming[i[0]] = data[i[0]];
      });
      this.action = action;
      this.dialog.form = true;
    },

    onUpload() {
      notificationStore.loading = true;
      if (this.datatablesUpload.items.length) {
        const data = new FormData();
        this.datatablesUpload.items.map((item) => {
          Object.keys(item).map((val) => {
            if (this.form.includes(val)) {
              data.append(val + "[]", item[val]);
            }
          });
          data.append("type", this.filter.inventaris);
        });

        const configHttp = {
          method: "post",
          url: `http://${configStore.apiUrl}/majsf_rest_api/api/consumable/upload`,
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

    syncStockSAP() {
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/consumable/sync_stock`
        )
        .then((response) => {
          if (response.status === 200) {
            // this.fetchMasterConsumable();
          }
        })
        .catch(utilityStore.onError);
    },

    syncBudgetSAP() {
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/consumable/sync_budget`
        )
        .then((response) => {
          if (response.status === 200) {
            this.fetchMasterConsumable();
          }
        })
        .catch(utilityStore.onError);
    },
    syncReservSAP() {
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/consumable/sync_reservation`
        )
        .then((response) => {
          if (response.status === 200) {
            // this.fetchMasterConsumable();
          }
        })
        .catch(utilityStore.onError);
    },

    fetchMasterDataReserv(data) {
      this.filter.department = data;
      if (!this.filter.date) {
        this.filter.date = date.date;
      }

      notificationStore.loading = true;
      axios
        .get(
          // `http://192.168.10.67/majsf_rest_api/api/consumable/master_data_reservation`,
          `http://${configStore.apiUrl}/majsf_rest_api/api/consumable/master_data_reservation`,
          {
            params: this.filter,
          }
        )
        .then((response) => {
          if (response.status === 200) {
            this.datatablesReserv.items = response.data;
            if (data) {
              this.dialog.dataBudget = true;
              this.judulDataBudget = data;
            }

            this.chartDataReserv = {
              labels: this.datatablesReserv.items.data.map(
                (data) => data.MATNR
              ),
              datasets: [
                {
                  type: "bar",
                  label: "Plan",
                  backgroundColor: "#4caf50",
                  borderColor: "#4caf50",
                  borderRadius: 4,

                  data: this.datatablesReserv.items.data.map(
                    (data) => data.BDMNG
                  ),
                },
                {
                  type: "bar",
                  label: "Actual",
                  backgroundColor: this.datatablesReserv.items.data.map(
                    (data) => (data.ENMNG != data.BDMNG ? "#e53935" : "#0072ef")
                  ),
                  borderColor: this.datatablesReserv.items.data.map((data) =>
                    data.ENMNG != data.BDMNG ? "#e53935" : "#0072ef"
                  ),
                  borderRadius: 4,

                  data: this.datatablesReserv.items.data.map(
                    (data) => data.ENMNG
                  ),
                },
              ],
            };
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch((error) => {
          const message =
            error.response?.data?.message || "Terjadi kesalahan jaringan";
          console.log(message);
          configStore.onError();
        });
    },
    fetchMasterDataBudget(data) {
      this.filter.department = data;
      if (!this.filter.period) {
        this.filter.period = `${new Date().getFullYear()}${String(
          new Date().getMonth() + 1
        ).padStart(2, "0")}`;
      }

      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/consumable/master_data_budget`,
          {
            params: this.filter,
          }
        )
        .then((response) => {
          if (response.status === 200) {
            this.datatablesBudget.items = response.data;
            if (data) {
              this.dialog.dataBudget = true;
              this.judulDataBudget = data;
            }

            this.chartData = {
              labels: this.datatablesBudget.items.data.map(
                (data) => data.ZMATL
              ),
              datasets: [
                {
                  label: "Plan",
                  backgroundColor: "#4caf50",
                  borderColor: "#4caf50",
                  borderRadius: 6,
                  barThickness: 60,
                  data: this.datatablesBudget.items.data.map(
                    (data) => data.ZPLAN
                  ),
                },
                {
                  label: "Actual",
                  backgroundColor: this.datatablesBudget.items.data.map(
                    (data) => (data.ZQTY !== data.ZPLAN ? "#e53935" : "#0072ef")
                  ),
                  borderColor: "#e53935",
                  borderRadius: 6,
                  barThickness: 60,
                  data: this.datatablesBudget.items.data.map(
                    (data) => data.ZQTY
                  ),
                },
              ],
            };
            this.chartDataOver = {
              labels: this.datatablesBudget.items.chart_over.map(
                (data) => data.ZNAME
              ),
              datasets: [
                {
                  label: "Plan",
                  backgroundColor: "#4caf50",
                  borderColor: "#4caf50",
                  borderRadius: 6,
                  barThickness: 60,
                  data: this.datatablesBudget.items.chart_over.map(
                    (data) => data.ZPLAN
                  ),
                },
                {
                  label: "Actual",
                  backgroundColor: "#e53935",
                  borderColor: "#e53935",
                  borderRadius: 6,
                  barThickness: 60,
                  data: this.datatablesBudget.items.chart_over.map(
                    (data) => data.ZQTY
                  ),
                },
              ],
            };
            this.chartDataActual = {
              labels: this.datatablesBudget.items.chart_actual.map(
                (data) => data.ZNAME
              ),
              datasets: [
                {
                  label: "Plan",
                  backgroundColor: "#4caf50",
                  borderColor: "#4caf50",
                  borderRadius: 6,
                  barThickness: 60,
                  data: this.datatablesBudget.items.chart_actual.map(
                    (data) => data.ZPLAN
                  ),
                },
                {
                  label: "Actual",
                  backgroundColor: this.datatablesBudget.items.chart_actual.map(
                    (data) => (data.ZQTY !== data.ZPLAN ? "#e53935" : "#0072ef")
                  ),
                  borderColor: "#e53935",
                  borderRadius: 6,
                  barThickness: 60,
                  data: this.datatablesBudget.items.chart_actual.map(
                    (data) => data.ZQTY
                  ),
                },
              ],
            };
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch((error) => {
          const message =
            error.response?.data?.message || "Terjadi kesalahan jaringan";
          console.log(message);
          configStore.onError();
        });
    },

    fetchBudgetAllDept(data) {
      this.filter.department = data;
      if (!this.filter.period) {
        this.filter.period = `${new Date().getFullYear()}${String(
          new Date().getMonth() + 1
        ).padStart(2, "0")}`;
      }
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/consumable/fetch_budget_all_dept`,
          {
            params: this.filter,
          }
        )
        .then((response) => {
          if (response.status === 200) {
            this.datatablesBudgetAllDept.items = response.data;
            if (data) {
              this.allDept = true;
              this.dialog.dataBudget = true;
              this.judulDataBudget = data;

              const chartDataAllDept =
                this.datatablesBudgetAllDept.items?.chart_actual?.data || [];

              const chartDataOverAllDept =
                this.datatablesBudgetAllDept.items?.chart_over?.data || [];

              if (chartDataAllDept.length === 0) {
                notificationStore.disableLoading();
                return; // Stop sampai sini biar gak proses chart
              }
              if (chartDataOverAllDept.length === 0) {
                notificationStore.disableLoading();
                return; // Stop sampai sini biar gak proses chart
              }

              // Simpan chartData ke state Vue biar bisa dipakai di luar (tooltip callback)
              this.chartDataActualRaw = chartDataAllDept;
              this.chartDataOverRaw = chartDataOverAllDept;

              this.chartDataOver = {
                labels: chartDataOverAllDept
                  .map((data) => data.ZNAME)
                  .slice(0, 5),
                datasets: [
                  {
                    label: "Plan",
                    backgroundColor: "#4caf50",
                    borderColor: "#4caf50",
                    borderRadius: 6,
                    barThickness: 30,
                    data: chartDataOverAllDept
                      .map((data) => data.total_plan)
                      .slice(0, 5),
                  },
                  {
                    label: "Actual",
                    backgroundColor: "#e53935",
                    borderColor: "#e53935",
                    borderRadius: 6,

                    data: chartDataOverAllDept
                      .map((data) => data.total_qty)
                      .slice(0, 5),
                  },
                ],
              };
              this.chartDataActual = {
                labels: chartDataAllDept.map((data) => data.ZNAME).slice(0, 5),
                datasets: [
                  {
                    label: "Plan",
                    backgroundColor: "#4caf50",
                    borderColor: "#4caf50",
                    borderRadius: 6,

                    data: chartDataAllDept
                      .map((data) => data.total_plan)
                      .slice(0, 5),
                  },
                  {
                    label: "Actual",
                    backgroundColor: chartDataAllDept.map((data) =>
                      data.total_qty !== data.total_plan ? "#e53935" : "#0072ef"
                    ),
                    borderColor: "#e53935",
                    borderRadius: 6,

                    data: chartDataAllDept
                      .map((data) => data.total_qty)
                      .slice(0, 5),
                  },
                ],
              };

              this.chartOptionsActualAllDept = {
                responsive: true,
                maintainAspectRatio: false,
                backgroundColor: "#e53935",
                locale: "en-EN",
                plugins: {
                  datalabels: {
                    anchor: "end",
                    align: "top",
                    font: {
                      weight: "bold",
                    },
                    formatter: (value) => {
                      return new Intl.NumberFormat("id-ID").format(value);
                    },
                  },
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        const index = context.dataIndex;
                        const datasetIndex = context.datasetIndex;
                        const item = this.chartDataActualRaw?.[index];
                        if (!item || !item.zcost_info)
                          return "Data tidak tersedia";

                        if (datasetIndex === 0) {
                          // Dataset 0 = Total Plan (Hijau)
                          const lines = [
                            `Total Plan: ${item.total_plan}`,
                            "Detail:",
                          ];
                          item.zcost_info.forEach((detail) => {
                            lines.push(`${detail.ZCOST}: ${detail.plan}`);
                          });
                          return lines;
                        } else if (datasetIndex === 1) {
                          // Dataset 1 = Total Qty (Merah)
                          const lines = [
                            `Total Qty: ${item.total_qty}`,
                            "Detail:",
                          ];
                          item.zcost_info.forEach((detail) => {
                            lines.push(`${detail.ZCOST}: ${detail.qty}`);
                          });
                          return lines;
                        } else {
                          return "Dataset tidak dikenali";
                        }
                      },
                    },
                  },
                },
                scales: {
                  x: {
                    ticks: {
                      callback: function (value, index) {
                        let label = this.chart.data.labels[index] || "";
                        return /\s/.test(label) ? label.split(" ") : label;
                      },
                      whiteSpace: "pre-line",
                      maxRotation: 0,
                      minRotation: 0,
                      autoSkip: false,
                    },
                  },
                  y: {
                    beginAtZero: true,
                    suggestedMax: 50,
                    ticks: {
                      stepSize: 5,
                    },
                    grid: {
                      display: true,
                    },
                  },
                },
              };

              this.chartOptionsOverAllDept = {
                responsive: true,
                maintainAspectRatio: false,
                backgroundColor: "#e53935",
                locale: "en-EN",
                plugins: {
                  datalabels: {
                    anchor: "end",
                    align: "top",
                    font: {
                      weight: "bold",
                    },
                    formatter: (value) => {
                      return new Intl.NumberFormat("id-ID").format(value);
                    },
                  },
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        const index = context.dataIndex;
                        const datasetIndex = context.datasetIndex;
                        const item = this.chartDataOverRaw?.[index];
                        if (!item || !item.zcost_info)
                          return "Data tidak tersedia";

                        if (datasetIndex === 0) {
                          // Dataset 0 = Total Plan (Hijau)
                          const lines = [
                            `Total Plan: ${item.total_plan}`,
                            "Detail:",
                          ];
                          item.zcost_info.forEach((detail) => {
                            lines.push(`${detail.ZCOST}: ${detail.plan}`);
                          });
                          return lines;
                        } else if (datasetIndex === 1) {
                          // Dataset 1 = Total Qty (Merah)
                          const lines = [
                            `Total Qty: ${item.total_qty}`,
                            "Detail:",
                          ];
                          item.zcost_info.forEach((detail) => {
                            lines.push(`${detail.ZCOST}: ${detail.qty}`);
                          });
                          return lines;
                        } else {
                          return "Dataset tidak dikenali";
                        }
                      },
                    },
                  },
                },
                scales: {
                  x: {
                    ticks: {
                      callback: function (value, index) {
                        let label = this.chart.data.labels[index] || "";
                        return /\s/.test(label) ? label.split(" ") : label;
                      },
                      whiteSpace: "pre-line",
                      maxRotation: 0,
                      minRotation: 0,
                      autoSkip: false,
                    },
                  },
                  y: {
                    beginAtZero: true,
                    suggestedMax: 50,
                    ticks: {
                      stepSize: 5,
                    },
                    grid: {
                      display: true,
                    },
                  },
                },
              };
            }
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
            notificationStore.disableLoading();
          }
        })
        .catch(utilityStore.onError);
      notificationStore.disableLoading();
    },

    filterItemsBudgetAllDept() {
      // console.log('all');
      return this.datatablesBudgetAllDept.items.data.filter((d) => {
        return Object.keys(this.datatablesBudgetAllDept.filters).every((f) => {
          return (
            this.datatablesBudgetAllDept.filters[f].length < 1 ||
            d[f]
              .toLowerCase()
              .includes(this.datatablesBudgetAllDept.filters[f].toLowerCase())
          );
        });
      });
    },
    filterItemsBudget() {
      let filtered = this.datatablesBudget.items.data.filter((d) => {
        return Object.keys(this.datatablesBudget.filters).every((f) => {
          return (
            this.datatablesBudget.filters[f].length < 1 ||
            d[f]
              .toLowerCase()
              .includes(this.datatablesBudget.filters[f].toLowerCase())
          );
        });
      });
      return filtered;
    },
    filterItemsReservAllDept() {
      let filtered = this.datatablesReservAllDept.items.data.filter((d) => {
        return Object.keys(this.datatablesReservAllDept.filters).every((f) => {
          return (
            this.datatablesReservAllDept.filters[f].length < 1 ||
            d[f]
              .toLowerCase()
              .includes(this.datatablesReservAllDept.filters[f].toLowerCase())
          );
        });
      });
      return filtered;
    },
    filterItemsReserv() {
      let filtered = this.datatablesReserv.items.data.filter((d) => {
        return Object.keys(this.datatablesReserv.filters).every((f) => {
          return (
            this.datatablesReserv.filters[f].length < 1 ||
            d[f]
              .toLowerCase()
              .includes(this.datatablesReserv.filters[f].toLowerCase())
          );
        });
      });
      return filtered;
    },

    filterBalanceReserv(type = "") {
      const status =
        type == "all-dept"
          ? this.datatablesReservAllDept.status
          : this.datatablesReserv.status;
      let filtered =
        type == "all-dept"
          ? this.filterItemsReservAllDept()
          : this.filterItemsReserv();

      switch (status) {
        case "Safe":
          filtered = filtered.filter((d) => Number(d.ZDIFF) >= 0);
          break;
        case "Minus":
          filtered = filtered.filter((d) => Number(d.ZDIFF) < 0);
          break;
        default:
          break;
      }

      return filtered;
    },
    filterBalanceBudget(type = "") {
      const status =
        type == "all-dept"
          ? this.datatablesBudgetAllDept.status
          : this.datatablesBudget.status;
      let filtered =
        type == "all-dept"
          ? this.filterItemsBudgetAllDept()
          : this.filterItemsBudget();
      switch (status) {
        case "Over":
          filtered = filtered.filter(
            (d) => status == "Over" && d.ZQTY - d.ZPLAN > 0
          );

          break;
        case "Minus":
          filtered = filtered.filter(
            (d) => status == "Minus" && d.ZQTY - d.ZPLAN < 0
          );
          break;
        default:
          break;
      }
      return filtered;
    },

    onUploadBudget() {
      notificationStore.loading = true;
      if (this.datatablesUploadBudget.items.length) {
        const data = new FormData();
        this.datatablesUploadBudget.items.map((item) => {
          Object.keys(item).map((val) => {
            if (this.formBudget.includes(val)) {
              data.append(val + "[]", item[val]);
            }
          });
          data.append("period", this.filter.period);
        });

        const configHttp = {
          method: "post",
          url: `http://${configStore.apiUrl}/majsf_rest_api/api/consumable/upload_budget`,
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
                this.fetchMasterDataBudget(this.filter.department);
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
    onUpdateBudget() {
      notificationStore.loading = true;
      let valid = true;
      const data =
        this.action == "Edit" ? new URLSearchParams() : new FormData();

      const hasZDESK = !!this.formDataBudget["ZDESK"];
      const hasZPLAN = !!this.formDataBudget["ZPLAN"];

      if (!hasZDESK || !hasZPLAN) {
        valid = false;
      }

      Object.entries(this.formDataBudget).forEach(([key, value]) => {
        data.append(key, value);
      });

      data.append("department", this.filter.department);
      data.append("period", this.filter.period);

      if (valid) {
        let configHttp = {
          method: "post",
          url: `http://${configStore.apiUrl}/majsf_rest_api/api/consumable/budget`,
          headers: {
            "Content-Type": "multipart/form-data",
          },
          data,
        };
        if (this.action == "Edit") {
          configHttp = {
            method: "put",
            url: `http://${configStore.apiUrl}/majsf_rest_api/api/consumable/budget`,
            headers: {
              "Content-Type": "multipart/form-data",
            },
            data,
          };
        }

        axios(configHttp)
          .then((response) => {
            notificationStore.onApiResponseToastAlert(response, this.resetForm);
            this.fetchMasterDataBudget(this.filter.department);
          })
          .catch(configStore.onError);
      } else {
        notificationStore.showAlertWarning(
          "Data yang anda kirim tidak Lengkap."
        );
        notificationStore.disableLoading();
      }
    },

    onUploadIncoming() {
      notificationStore.loading = true;
      if (this.datatablesUploadIncoming.items.length) {
        const data = new FormData();
        this.datatablesUploadIncoming.items.map((item) => {
          Object.keys(item).map((val) => {
            if (this.formIncoming.includes(val)) {
              data.append(val + "[]", item[val]);
            }
          });
          data.append("period", this.filter.period);
        });

        const configHttp = {
          method: "post",
          url: `http://${configStore.apiUrl}/majsf_rest_api/api/consumable/upload_incoming`,
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

    fetchMasterDataIncoming(value) {
      if (!this.filter.period) {
        this.filter.period = `${new Date().getFullYear()}${String(
          new Date().getMonth() + 1
        ).padStart(2, "0")}`;
      }
      if (value == "static") {
        this.filter.period = this.shiftNow.period;
      }
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/consumable/master_data_incoming`,
          {
            params: this.filter,
          }
        )
        .then((response) => {
          if (response.status === 200) {
            this.datatablesIncoming.items = response.data.data;
            this.datatablesIncoming.chart = response.data.chart;
            notificationStore.disableLoading();
            const warnaAspek = {
              PENDING: "#E57373",
              "ASPEK 1": "#F0E68C",
              "ASPEK 2": "#A7C7E7",
              "ASPEK 3": "#E6E6FA",
              "ASPEK 4": "#98FB98",
              OTHER: "#E6E6FA", // fallback kalau ada yang gak dikenal
            };

            this.chartDataIncoming = {
              labels: response.data.chart.map((data) => data.ZASPEK),
              datasets: [
                {
                  backgroundColor: response.data.chart.map((data) => {
                    return warnaAspek[data.ZASPEK] || "#FFC1CC"; // fallback color
                  }),
                  data: response.data.chart.map(
                    (data) => parseInt(data.persentase) || 0
                  ),
                },
              ],
            };
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },

    filterItemsIncoming() {
      return this.datatablesIncoming.items.filter((d) => {
        return Object.keys(this.datatablesIncoming.filters).every((f) => {
          const filterValue = this.datatablesIncoming.filters[f];

          // Jika filter kosong, langsung lolos
          if (!filterValue || filterValue.length < 1) {
            return true;
          }

          // Khusus filter untuk ZPENDING
          if (f === "ZPENDING") {
            if (filterValue === "ALL") return true; // Jika "ALL", tampilkan semua

            // Hitung ZPENDING dari ZQTY - ZPLAN
            const balance = d.ZQTY - d.ZPLAN;

            // Jika filter "MINUS", cek apakah hasilnya negatif
            return filterValue === "MINUS" ? balance < 0 : true;
          }

          // Filter normal dengan includes() untuk teks biasa
          return d[f]?.toLowerCase().includes(filterValue.toLowerCase());
        });
      });
    },
    onUpdateIncoming() {
      notificationStore.loading = true;
      let valid = true;
      const data = new URLSearchParams();
      Object.entries(this.formDataIncoming).map((e) => {
        if (
          !e[1] &&
          !(this.action == "Add" && e[0] == "ZMATL" && e[0] == "ZPLAN")
        ) {
          valid = false;
        }
        data.append(e[0], e[1]);
      });
      data.append("period", this.filter.period);

      if (valid) {
        let configHttp = {
          method: "put",
          url: `http://${configStore.apiUrl}/majsf_rest_api/api/consumable/incoming`,
          headers: {
            "Content-Type": "multipart/form-data",
          },
          data,
        };

        axios(configHttp).then((response) => {
          notificationStore.onApiResponseToastAlert(response, this.resetForm);
        });
        this.fetchMasterDataIncoming().catch(configStore.onError);
      } else {
        notificationStore.showAlertWarning(
          "Data yang anda kirim tidak Lengkap."
        );
        notificationStore.disableLoading();
      }
    },
    updateChartData(value) {
      if (value !== "") {
        const filteredData = this.datatablesIncoming.items.filter(
          (item) =>
            item.ZASPEK === value && item.ZASPEK !== "0" && item.ZASPEK !== ""
        );

        const totalZQTY = filteredData.reduce(
          (sum, item) => sum + Number(item.ZQTY || 0),
          0
        );
        const totalZPLAN = filteredData.reduce(
          (sum, item) => sum + Number(item.ZPLAN || 0),
          0
        );
        const totalPending = totalZQTY ? Math.abs(totalZQTY - totalZPLAN) : 0;

        this.chartDataIncoming = {
          labels: ["Total Actual", "Total Pending"],
          datasets: [
            {
              backgroundColor: ["#98FB98", "#E57373"],
              data: [totalZQTY, totalPending],
            },
          ],
        };
      } else {
        const labels = this.datatablesIncoming.chart.map((data) => data.ZASPEK);
        const dataValues = this.datatablesIncoming.chart.map(
          (data) => parseInt(data.persentase) || 0
        );

        const warnaAspek = {
          PENDING: "#E57373",
          "ASPEK 1": "#F0E68C",
          "ASPEK 2": "#A7C7E7",
          "ASPEK 3": "#E6E6FA",
          "ASPEK 4": "#98FB98",
          OTHER: "#E6E6FA", // fallback kalau gak cocok
        };

        const backgroundColors = labels.map(
          (label) => warnaAspek[label] || warnaAspek.OTHER
        );

        this.chartDataIncoming = {
          labels: [],
          datasets: [],
        };

        nextTick(() => {
          this.chartDataIncoming = Object.assign(
            {},
            {
              labels: labels.slice(),
              datasets: [
                {
                  backgroundColor: backgroundColors.slice(),
                  data: dataValues.slice(),
                },
              ],
            }
          );
        });
      }
    },

    handleClick(itemName, child) {
      this.viewData = false;
      if (itemName === "Outgoing IW" && child == "All Dept") {
        this.fetchBudgetAllDept(child);
      } else if (itemName === "Outgoing IW") {
        this.allDept = false;
        this.budgetChart = true;
        this.fetchMasterDataBudget(child);
        this.fetchMasterDataReserv(child);
      } else if (itemName == "SOP IW") {
        this.pdf = true;
        this.typeStore = child;
      } else {
        this.fetchMasterData(child);
      }
    },

    handleClickNotChildren(itemName) {
      if (itemName === "Incoming IW") {
        this.dialog.dataIncoming = true;
        this.fetchMasterDataIncoming("static");
      } else {
        this.fetchMasterData(itemName);
      }
    },

    getChartData(item) {
      const normalizedValue = item.stok / item.pcs_day;
      return {
        labels: ["strength"],
        datasets: [
          {
            backgroundColor:
              item.stok / item.pcs_day < 5
                ? "#e53935"
                : item.stok / item.pcs_day > 26
                ? "#42A5F5"
                : "#4caf50",
            data: [normalizedValue, 50],
          },
        ],
      };
    },

    toggleDropdown(index) {
      this.activeIndex = this.activeIndex === index ? null : index;
    },

    filterBalanceStatus() {},
  },
});
