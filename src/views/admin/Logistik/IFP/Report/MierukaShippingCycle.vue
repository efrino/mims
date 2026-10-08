<template>
  <div class="page-wrapper">
    <!-- PERFORMANCE CHART -->
    <v-card class="pa-5 rounded-lg mb-6 elevation-2">
      <!-- 
        Ganti d-flex justify-space-between menjadi justify-end 
        untuk mendorong semua konten di dalamnya ke kanan 
      -->
      <div class="d-flex justify-end align-center mb-4 flex-wrap" style="gap:12px">
        
        <!-- Filter Customer & Bulan -->
        <!-- 
          Pastikan div pembungkus input juga menggunakan justify-end 
          jika lebar div-nya melebar (width 100%) pada layar kecil
        -->
        <div class="d-flex align-center justify-end" style="gap:12px; flex-wrap:wrap">
        <v-select
          v-model="chartCustomer"
          :items="customerList"
          label="Customer"
          variant="outlined"
          density="compact"
          style="min-width: 160px; max-width: 200px;"
          class="uppercase-select"
          hide-details
          prepend-inner-icon="mdi-account"
        >
          <!-- Tampilan item dropdown -->
          <template #item="{ props, item }">
            <v-list-item
              v-bind="props"
              :title="String(item.raw).toUpperCase()"
            />
          </template>

          <!-- Tampilan selected value -->
          <template #selection="{ item }">
            <span>{{ String(item.raw).toUpperCase() }}</span>
          </template>
        </v-select>

          <v-text-field
            v-model="chartMonth"
            label="Bulan"
            type="month"
            variant="outlined"
            density="compact"
            style="min-width: 180px; max-width: 220px;"
            hide-details
            prepend-inner-icon="mdi-calendar-month"
          />

          <v-btn
            color="primary"
            density="comfortable"
            :loading="chartLoading"
            @click="loadPerformanceChart"
          >
            <v-icon start>mdi-refresh</v-icon>
            Refresh
          </v-btn>
        </div>
      </div

          <!-- Loading state -->
          <div v-if="chartLoading" class="d-flex justify-center align-center" style="height:350px">
            <v-progress-circular indeterminate color="primary" size="48" />
          </div>

          <!-- Chart -->
          <VueApexCharts
            v-else-if="chartSeries.length"
            :key="chartKey"
            type="line"
            height="350"
            :options="chartOptions"
            :series="chartSeries"
          />

          <!-- Empty state -->
          <div
            v-else
            class="d-flex justify-center align-center text-grey"
            style="height:350px"
          >
            <div class="text-center">
              <v-icon size="48" color="grey-lighten-1">mdi-chart-bar-stacked</v-icon>
              <div class="mt-2">Tidak ada data untuk {{ chartCustomer?.toUpperCase() }} bulan ini</div>
            </div>
          </div>
        </v-card>


    <!-- FILTER CARD -->
    <v-card class="pa-6 mb-6 rounded-lg elevation-2">
      <div class="d-flex justify-space-between align-center">
        <div>
          <div class="text-h5 font-weight-medium">Mieruka Shipping</div>
          <div class="text-grey-darken-1 text-body-2 mt-1">
            Monitoring real-time delivery status &amp; scan progress.
          </div>
        </div>
        <img :src="logoMaj" width="120" />
      </div>

      <v-row dense class="mt-4">
        <v-col cols="12" md="3">
          <v-select
            v-model="customer"
            :items="customerList"
            label="Customer"
            variant="outlined"
            density="comfortable"
            prepend-inner-icon="mdi-account"
          >
            <!-- Dropdown list -->
            <template #item="{ props, item }">
              <v-list-item
                v-bind="props"
                :title="String(item.raw).toUpperCase()"
              />
            </template>

            <!-- Selected value -->
            <template #selection="{ item }">
              <span>{{ String(item.raw).toUpperCase() }}</span>
            </template>
          </v-select>
        </v-col>

        <v-col cols="12" md="3">
          <v-text-field
            v-model="tanggal"
            label="Tanggal"
            type="date"
            variant="outlined"
            density="comfortable"
            :rules="[(v) => !!v || 'Tanggal wajib diisi']"
            required
            prepend-inner-icon="mdi-calendar"
          />
        </v-col>

        <v-col cols="12" md="3">
          <v-text-field
            v-model="cycle"
            label="Cycle Filter (kosong = ALL)"
            type="number"
            variant="outlined"
            density="comfortable"
            prepend-inner-icon="mdi-repeat"
            :disabled="!customer || !tanggal"
          />
        </v-col>

        <v-col cols="12" md="3" class="d-flex align-center">
          <v-btn
            color="primary"
            class="px-6 text-white"
            :disabled="!customer || !tanggal"
            @click="loadData"
          >
            <v-icon start>mdi-database-search</v-icon>
            Load Data
          </v-btn>
        </v-col>
      </v-row>
    </v-card>

    <!-- CYCLE STATUS -->
    <v-card class="pa-5 rounded-lg mb-6 elevation-2">
      <div class="text-subtitle-1 font-weight-medium mb-3">
        Cycle Status ({{ customerDisplay }})
      </div>

      <div v-if="cycleCardList.length" class="cycle-row">
        <v-card
          v-for="c in cycleCardList"
          :key="`cycle-${c.cycle}`"
          class="cycle-card-mini"
          elevation="2"
          :class="getCycleCardColor(c)"
          @click="selectCycleCard(c.cycle)"
        >
          <v-icon class="cycle-icon-mini">mdi-truck</v-icon>

          <div class="cycle-title-mini">CYCLE {{ c.cycle }}</div>
          <div class="cycle-value-mini">{{ c.finish }} / {{ c.total }}</div>
          <div class="cycle-sub-mini">ETD : {{ c.etd || "-" }}</div>
        </v-card>
      </div>

      <div v-else class="text-grey">
        Tidak ada data cycle.
      </div>
    </v-card>

    <!-- DETAIL TABLE BY CYCLE -->
    <v-card class="pa-5 rounded-lg mb-6 elevation-2">
      <div
        class="d-flex flex-wrap justify-space-between align-center mb-4"
        style="gap: 12px"
      >
        <div class="text-h6 text-primary font-weight-medium">
          Detail Table By Cycle
        </div>

        <div class="d-flex flex-wrap align-center" style="gap: 12px">
          <v-text-field
            v-model="searchPart"
            label="Search Job / Part / Model"
            prepend-inner-icon="mdi-magnify"
            density="compact"
            variant="outlined"
            clearable
            style="min-width: 280px"
          />

          <v-btn
            color="green"
            class="px-6 text-black"
            :disabled="loading || filteredDataList.length === 0"
            @click="exportExcel"
          >
            <v-icon start>mdi-microsoft-excel</v-icon>
            Export Excel
          </v-btn>
        </div>
      </div>

      <div class="mb-3 text-body-2 text-grey-darken-1">
        Menampilkan data berdasarkan customer
        <b>{{ customerDisplay }}</b>
        <span v-if="selectedCycleCard">
          dan cycle card <b>{{ selectedCycleCard }}</b>
        </span>
        <span v-else-if="cycle">
          dan filter cycle <b>{{ cycle }}</b>
        </span>
      </div>

      <div style="overflow-x: auto">
        <v-data-table
          :headers="headers"
          :items="filteredDataList"
          :loading="loading"
          item-value="__key"
          class="rounded-lg elevation-1 text-center"
          density="compact"
          hover
          :items-per-page="tableOptions.itemsPerPage"
          :page="tableOptions.page"
          @update:options="tableOptions = $event"
        >
          <template #item.index="{ index }">
            {{
              (tableOptions.itemsPerPage > 0
                ? (tableOptions.page - 1) * tableOptions.itemsPerPage
                : 0) + (index + 1)
            }}
          </template>

          <template #item.CUSTOMER="{ item }">
            <span class="font-weight-medium">
              {{ item.CUSTOMER || "-" }}
            </span>
          </template>

          <template #item.project="{ item }">
            <span class="font-weight-medium">
              {{ item.project || "-" }}
            </span>
          </template>

          <template #item.MATNR="{ item }">
            <span class="font-weight-medium">
              {{ item.MATNR || "-" }}
            </span>
          </template>

          <template #item.BISMT="{ item }">
            <span class="font-weight-medium">
              {{ item.BISMT || "-" }}
            </span>
          </template>

          <template
            v-for="c in visibleCycleColumns"
            :key="'cycle-cell-' + c"
            #[`item.c_${c}`]="{ item }"
          >
            <span :class="getCycleValueClass(item[`c_${c}`])">
              {{ item[`c_${c}`] || "-" }}
            </span>
          </template>

          <template #item.total_plan="{ item }">
            {{ Number(item.total_plan || 0).toLocaleString() }}
          </template>

          <template #item.total_actual="{ item }">
            <span :class="getQtyActualClass(item.total_actual)">
              {{ Number(item.total_actual || 0).toLocaleString() }}
            </span>
          </template>

          <template #item.qty_diff="{ item }">
            <span class="text-red font-weight-medium">
              {{ Number(item.qty_diff || 0).toLocaleString() }}
            </span>
          </template>

          <template #item.FINISH="{ item }">
            <v-chip :color="Number(item.FINISH) === 1 ? 'green' : 'red'" size="small">
              {{ Number(item.FINISH) === 1 ? "FINISH" : "PENDING" }}
            </v-chip>
          </template>

          <template #no-data>
            <div class="pa-4 text-grey">
              Tidak ada data. Pilih customer &amp; tanggal lalu klik Load Data.
            </div>
          </template>
        </v-data-table>
      </div>
    </v-card>
  </div>
</template>

<script>
import { mapActions, mapState } from "pinia";
import { useControlPrepare } from "@/stores/Logistik/IFP/Report/ControlPrepare";
import * as XLSX from "xlsx";
import VueApexCharts from "vue3-apexcharts";
import logoMaj from "@/assets/images/MAJ-LOGO-3.png";

export default {
  name: "MierukaShippingAdmTrip",

  components: {
    VueApexCharts // ✅ WAJIB di sini
  },

  data() {
    return {
      logoMaj,
      customer: "",
      cycle: "",
      tanggal: "",
      loading: false,

      customerList: ["hmmi", "tmmin", "mmki", "mkm"],
      searchPart: "",

      selectedCycleCard: null,

      tableOptions: {
        page: 1,
        itemsPerPage: 10,
      },
      chartKey: 0,
      chartSeries: [],   
      chartOptions: {},
      planSeries_line: [],
      actualSeries_line: [],
      accPlanSeries_line: [],
      accActualSeries_line: [],
      percentageSeries_line: [],
      categories_line: [],
      chartCustomer: "HMMI", // default customer
    chartMonth: new Date().toISOString().slice(0, 7), // default bulan ini
    chartLoading: false,  

      footerProps: {
        itemsPerPageOptions: [10, 25, 50, 100, { title: "All", value: -1 }],
        showFirstLastPage: true,
      },
    
    };
  },

  computed: {
    ...mapState(useControlPrepare, ["dataMieruka", "performanceChart"]),

   chartSeries_line() {
    return [
      {
        name: "Qty Planning",
        type: "column",
        data: this.planSeries_line,
      },
      {
        name: "Qty Actual",
        type: "column",
        data: this.actualSeries_line,
      },
      {
        name: "Akumulasi Plan",
        type: "line",
        data: this.accPlanSeries_line,
      },
      {
        name: "Akumulasi Actual",
        type: "line",
        data: this.accActualSeries_line,
      },
      {
        name: "Achievement %",
        type: "line",
        data: this.percentageSeries_line,
      },
    ];

    },

    chartOptions_line() {
      return {
        chart: {
          type: "line",
          height: 400,
          stacked: false,
          toolbar: {
            show: false,
          },
        },

        stroke: {
          width: [0, 0, 3, 3, 2],
          curve: "smooth",
        },

        plotOptions: {
          bar: {
            columnWidth: "60%",
            borderRadius: 6,
          },
        },

        dataLabels: {
          enabled: true,
          enabledOnSeries: [2], // Hanya untuk scatter/performance %

          formatter: (val) => {
            if (val === null || val <= 0) return "";
            return `${Number(val).toFixed(0)}%`; // Pembulatan angka tanpa desimal agar lebih bersih
          },

          style: {
            fontSize: "11px",
            fontWeight: 600,
            colors: ["#FFFFFF"], // Ubah warna teks menjadi putih agar kontras dengan background hitam
          },

          background: {
            enabled: true,
            foreColor: "#FFFFFF",
            borderRadius: 4,
            padding: 4,
            opacity: 0.6, // ✅ Tambahkan transparansi (0.0 - 1.0)

            borderWidth: 0, // ✅ Hilangkan border merah (set ke 0)
            borderColor: "transparent", // Pastikan warna border tidak muncul

            backgroundColor: "#000000", // Background hitam
          },

          offsetY: -14,
        },

        // Bagian markers agar bulatan ungu (scatter) juga sedikit transparan (opsional)
        markers: {
          size: [0, 0, 5],
          strokeWidth: 0,
          fillOpacity: 0.7, // ✅ Membuat bulatan ungu sedikit transparan agar tidak terlalu solid
          hover: {
            size: 7,
          },
        },

        colors: [
          "#1E88E5", // Plan
          "#ff698a", // Actual
          "#00E396", // Acc Plan
          "#FEB019", // Acc Actual
          "#8E44AD", // %
        ],

        xaxis: {
          categories: this.categories_line,
          title: {
            text: "Line / Shift / Date",
          },
        },

        yaxis: [
          {
            title: {
              text: "Qty Production",
            },
          },
          {
            opposite: true,
            min: 0,
            max: 100,
            title: {
              text: "Achievement (%)",
            },
            labels: {
              formatter: (val) => `${val.toFixed(0)}%`,
            },
          },
        ],

        tooltip: {
          shared: true,
          intersect: false,
        },

        legend: {
          position: "top",
        },
      };
    },

    dataList() {
      return this.dataMieruka?.data || [];
    },

    baseFilteredData() {
      return this.dataList.filter((item) => {
        const matchCustomer =
          !this.customer ||
          String(item.CUSTOMER || "").toLowerCase() ===
            String(this.customer || "").toLowerCase();

        const matchTanggal =
          !this.tanggal ||
          item.BSTDK === this.tanggal ||
          item.VDATU === this.tanggal.replace(/-/g, "");

        return matchCustomer && matchTanggal;
      });
    },

    visibleCycleColumns() {
      if (this.selectedCycleCard) {
        return [String(this.selectedCycleCard)];
      }

      const set = new Set();

      this.baseFilteredData.forEach((row) => {
        const cycle = row.CYCLE;
        if (cycle !== null && cycle !== undefined && cycle !== "") {
          set.add(String(cycle));
        }
      });

      return Array.from(set).sort((a, b) => Number(a) - Number(b));
    },

    cycleETDMap() {
      const map = {};

      this.baseFilteredData.forEach((row) => {
        const cycle = String(row.CYCLE || "");
        if (!cycle) return;

        if (!map[cycle]) {
          map[cycle] = row.ETD || "-";
        }
      });

      return map;
    },

    pivotCycleItems() {
      const grouped = {};

      this.baseFilteredData.forEach((row) => {
        const key = `${row.CUSTOMER || ""}__${row.MATNR || ""}`;

        if (!grouped[key]) {
          grouped[key] = {
            __key: key,
            CUSTOMER: row.CUSTOMER || "-",
            project: row.project || "-",
            MATNR: row.MATNR || "-",
            BISMT: row.BISMT || "-",
            total_plan: 0,
            total_actual: 0,
            qty_diff: 0,
            FINISH: 0,
          };

          this.visibleCycleColumns.forEach((cycle) => {
            grouped[key][`c_${cycle}`] = "-";
          });
        }

        const cycle = String(row.CYCLE || "");
        const plan = Number(row.KWMENG || 0);
        const actual = Number(row.total_qty_scan || 0);

        grouped[key].total_plan += plan;
        grouped[key].total_actual += actual;

        if (cycle && this.visibleCycleColumns.includes(cycle)) {
          grouped[key][`c_${cycle}`] = `${actual}/${plan}`;
        }
      });

      return Object.values(grouped).map((item) => {
        item.qty_diff = item.total_plan - item.total_actual;
        item.FINISH =
          item.total_actual >= item.total_plan && item.total_plan > 0 ? 1 : 0;
        return item;
      });
    },

    filteredDataList() {
      let result = [...this.pivotCycleItems];

      if (this.searchPart) {
        const keyword = this.searchPart.toLowerCase();

        result = result.filter((row) => {
          const partNo = String(row.MATNR || "").toLowerCase();
          const customer = String(row.CUSTOMER || "").toLowerCase();
          const project = String(row.project || "").toLowerCase();

          return (
            partNo.includes(keyword) ||
            customer.includes(keyword) ||
            project.includes(keyword)
          );
        });
      }

      return result;
    },

    cycleCardList() {
      const grouped = {};

      this.baseFilteredData.forEach((item) => {
        const cycle = item.CYCLE || "-";

        if (!grouped[cycle]) {
          grouped[cycle] = {
            cycle,
            finish: 0,
            total: 0,
            qty_plan: 0,
            qty_actual: 0,
            etd: item.ETD || "-",
          };
        }

        const plan = Number(item.KWMENG) || 0;
        const actual = Number(item.total_qty_scan) || 0;
        const isFinish = actual >= plan && plan > 0;

        grouped[cycle].total += 1;
        grouped[cycle].qty_plan += plan;
        grouped[cycle].qty_actual += actual;

        if (isFinish) {
          grouped[cycle].finish += 1;
        }
      });

      return Object.values(grouped).sort((a, b) => {
        const aNum = Number(a.cycle);
        const bNum = Number(b.cycle);

        if (Number.isNaN(aNum) && Number.isNaN(bNum)) {
          return String(a.cycle).localeCompare(String(b.cycle));
        }
        if (Number.isNaN(aNum)) return 1;
        if (Number.isNaN(bNum)) return -1;

        return aNum - bNum;
      });
    },

    cycleDisplay() {
      if (this.selectedCycleCard) return `CYCLE ${this.selectedCycleCard}`;
      if (this.cycle) return `CYCLE ${this.cycle}`;
      return "ALL CYCLE";
    },

    customerDisplay() {
      if (this.customer) return this.customer.toUpperCase();
      return "-";
    },

    totalQtyPlanSum() {
      return this.filteredDataList.reduce((acc, row) => {
        return acc + (Number(row.total_plan) || 0);
      }, 0);
    },

    totalQtyActualSum() {
      return this.filteredDataList.reduce((acc, row) => {
        return acc + (Number(row.total_actual) || 0);
      }, 0);
    },

    totalQtyDifference() {
      return this.totalQtyPlanSum - this.totalQtyActualSum;
    },

    headers() {
      const baseHeaders = [
        {
          title: "No",
          key: "index",
          width: 60,
          align: "center",
          sortable: false,
        },
        {
          title: "Customer",
          key: "CUSTOMER",
          width: 100,
          align: "center",
        },
        {
          title: "Model",
          key: "project",
          width: 100,
          align: "center",
        },
        {
          title: "Part Number",
          key: "MATNR",
          width: 170,
          align: "center",
        },
        {
          title: "Job Number",
          key: "BISMT",
          width: 170,
          align: "center",
        },
      ];

      const cycleHeaders = this.visibleCycleColumns.map((cycle) => ({
        title: `CYCLE ${cycle}`,
        key: `c_${cycle}`,
        width: 120,
        align: "center",
        sortable: false,
      }));

      const tailHeaders = [
        {
          title: "Total Plan",
          key: "total_plan",
          width: 110,
          align: "center",
        },
        {
          title: "Total Actual",
          key: "total_actual",
          width: 110,
          align: "center",
        },
        {
          title: "Qty Diff",
          key: "qty_diff",
          width: 110,
          align: "center",
        },
        {
          title: "Status",
          key: "FINISH",
          width: 100,
          align: "center",
        },
      ];

      return [...baseHeaders, ...cycleHeaders, ...tailHeaders];
    },


  },

  watch: {
    customer() {
      this.selectedCycleCard = null;
      this.tableOptions.page = 1;
      this.autoLoad();
    },

    tanggal() {
      this.selectedCycleCard = null;
      this.tableOptions.page = 1;
      this.autoLoad();
    },

    cycle() {
      this.selectedCycleCard = null;
      this.tableOptions.page = 1;
      this.autoLoad();
    },

    searchPart() {
      this.tableOptions.page = 1;
    },

    chartCustomer() {
      this.rebuildChartFromRaw();
    },

    // Ganti bulan → fetch ulang karena data beda bulan
    chartMonth() {
      this.loadPerformanceChart();
    },
  },

  mounted() {
    this.tanggal = new Date().toISOString().slice(0, 10);
     this.loadPerformanceChart();
  },

  methods: {
    ...mapActions(useControlPrepare, ["fetchDataMieruka", "fetchPerformanceCustomer"]),

    buildChartOptions(categories, month) {
      return {
        chart: {
          type: "line", // ← WAJIB "line" untuk mixed column + line
          stacked: false,
          toolbar: { show: true },
        },
        stroke: {
          width: [0, 0, 3], // 0 = column (Plan), 0 = column (Actual), 3 = line (%)
          curve: "smooth",
        },
        plotOptions: {
          bar: {
            columnWidth: "50%", // ← lebih kecil agar Plan & Actual tidak saling timpa
            borderRadius: 3,
          },
        },
        colors: ["#1E88E5", "#ff698a", "#8E44AD"],
        xaxis: {
          categories,
          title: { text: `Tanggal — ${month}` },
          labels: { rotate: 0, style: { fontSize: "11px" } },
        },
        yaxis: [
          {
            title: { text: "Qty Part" },
            min: 0,
            labels: { formatter: (val) => Math.round(val).toLocaleString() },
          },
          {
            opposite: true,
            min: 0,
            max: 100,
            title: { text: "Performance (%)" },
            labels: { formatter: (val) => `${Number(val).toFixed(0)}%` },
          },
        ],
        dataLabels: {
          enabled: true,
          enabledOnSeries: [2], // hanya label di Performance (%)
          formatter: (val) => val > 0 ? `${Number(val).toFixed(0)}%` : "",
        },
        tooltip: {
          shared: true,
          intersect: false,
          x: { formatter: (val) => `Tanggal ${val} — ${month}` },
          y: {
            formatter: (val, { seriesIndex }) =>
              seriesIndex === 2
                ? `${Number(val).toFixed(1)}%`
                : Number(val).toLocaleString(),
          },
        },
        // ✅ Legend 1 baris
        legend: {
          position: "top",
          horizontalAlign: "center",
          itemMargin: { horizontal: 16, vertical: 0 },
        },
      };
    },

    rebuildChartFromRaw() {
      const rawData = this.performanceChart || [];
      const month = this.chartMonth || new Date().toISOString().slice(0, 7);

      const filteredByCustomer = rawData.filter(d =>
        String(d.CUSTOMER || "").toUpperCase() === String(this.chartCustomer || "").toUpperCase()
      );

      const [year, mon] = month.split("-").map(Number);
      const daysInMonth = new Date(year, mon, 0).getDate();
      const allDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

      const dataMap = {};
      filteredByCustomer.forEach(d => {
        const raw = d.tanggal || "";
        const dayNum = raw.length >= 10 ? Number(raw.slice(8, 10)) : Number(raw);
        if (dayNum) dataMap[dayNum] = d;
      });

      const planData   = allDays.map(day => Number(dataMap[day]?.total_plan || 0));
      const actualData = allDays.map(day => Number(dataMap[day]?.total_scan || 0));
      const pctData = allDays.map(day => {
        const val = Number(dataMap[day]?.pct || 0);
        return val > 0 ? Math.round(val) : null;
      });

this.chartSeries = [
  { name: "Plan",            type: "column", data: planData,   yAxisIndex: 0 },
  { name: "Actual",          type: "column", data: actualData, yAxisIndex: 0 },
  { name: "Performance (%)", type: "scatter",   data: pctData,    yAxisIndex: 1 },
];

      this.chartKey++;
    },

    getCycleValueClass(value) {
      if (!value || value === "-") return "text-medium-emphasis";

      const [actualStr, planStr] = String(value).split("/");
      const actual = Number(actualStr || 0);
      const plan = Number(planStr || 0);

      return actual < plan
        ? "text-red font-weight-bold"
        : "text-green font-weight-bold";
    },

    getStatusLabel(item) {
      const plan = Number(item.total_plan) || 0;
      const actual = Number(item.total_actual) || 0;
      return actual >= plan && plan > 0 ? "FINISH" : "PENDING";
    },

    getStatusColor(item) {
      const plan = Number(item.total_plan) || 0;
      const actual = Number(item.total_actual) || 0;
      return actual >= plan && plan > 0 ? "green" : "red";
    },

    getQtyActualClass(value) {
      const qty = Number(value) || 0;
      return qty === 0 ? "text-red font-weight-bold" : "";
    },

    getCycleCardColor(item) {
      if (String(this.selectedCycleCard) === String(item.cycle)) {
        return "cycle-card-active";
      }

      return Number(item.finish) === Number(item.total) &&
        Number(item.total) > 0
        ? "cycle-card-finish"
        : "cycle-card-pending";
    },

    selectCycleCard(cycle) {
      if (String(this.selectedCycleCard) === String(cycle)) {
        this.selectedCycleCard = null;
      } else {
        this.selectedCycleCard = cycle;
      }

      this.tableOptions.page = 1;
    },

    async autoLoad() {
      if (!this.customer || !this.tanggal) return;
      await this.loadData();
    },

    async loadData() {
      if (!this.customer || !this.tanggal) return;

      this.loading = true;

      try {
        const cycleParam = this.cycle ? this.cycle : null;
        await this.fetchDataMieruka(cycleParam, this.customer, this.tanggal);
        // ❌ hapus: await this.loadPerformanceChart();
      } catch (err) {
        console.error("Load Error:", err);
      } finally {
        this.loading = false;
      }
    },

async loadPerformanceChart() {
      try {
        this.chartLoading = true;
        this.chartSeries = [];

        const month = this.chartMonth || new Date().toISOString().slice(0, 7);
        
        // 1. Fetch data dari store
        await this.fetchPerformanceCustomer(month, null);

        const rawData = this.performanceChart || [];

        // 2. Filter data berdasarkan customer yang dipilih
        const filteredByCustomer = rawData.filter(d =>
          String(d.CUSTOMER || "").toUpperCase() === String(this.chartCustomer || "").toUpperCase()
        );

        // 3. Inisialisasi tanggal dalam bulan tersebut (1 - 28/30/31)
        const [year, mon] = month.split("-").map(Number);
        const daysInMonth = new Date(year, mon, 0).getDate();
        const allDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

        // 4. Map data ke tanggal agar tidak tertukar/bergeser
        const dataMap = {};
        filteredByCustomer.forEach(d => {
          const raw = d.tanggal || "";
          // Mengambil digit tanggal dari format "2026-05-04" atau "04"
          const dayNum = raw.includes("-") ? Number(raw.split("-")[2]) : Number(raw);
          if (dayNum) dataMap[dayNum] = d;
        });

        // 5. Build Series Data
        const planData = allDays.map(day => Number(dataMap[day]?.total_plan || 0));
        const actualData = allDays.map(day => Number(dataMap[day]?.total_scan || 0));
        const pctData = allDays.map(day => {
        const val = Number(dataMap[day]?.pct || 0);
        // ✅ Jika 0 atau kurang, beri null agar marker scatter tidak muncul
        return val > 0 ? Math.round(val) : null;
      });

        const categories = allDays.map(day => String(day));

        // 6. Set Series
        this.chartSeries = [
          { name: "Plan", type: "column", data: planData },
          { name: "Act", type: "column", data: actualData },
          { name: "(%)", type: "scatter", data: pctData },
        ];

        // 7. Set Options dengan Y-Axis yang terkunci
        const maxQty = Math.max(
          ...planData,
          ...actualData,
        );

        // dibuat 2x lebih tinggi
        const qtyAxisMax = 7010;
        const namaBulanFull = [
          "Januari", "Februari", "Maret", "April", "Mei", "Juni",
          "Juli", "Agustus", "September", "Oktober", "November", "Desember"
        ];
        const [currentYear, currentMon] = month.split("-").map(Number);
        const namaBulanTerpilih = namaBulanFull[currentMon - 1];
        this.chartOptions = {
          chart: {
            type: "line",
            stacked: false,
            toolbar: { show: true },
          },
          title: {
            text: `Scan Performance ${this.chartCustomer.toUpperCase()} Bulan ${namaBulanTerpilih}`,
            align: 'center',
            style: {
              fontSize: '16px',
              fontWeight: 'bold',
              padding: 1,
              color: '#263238'
              
            }
          },
          stroke: {
            width: [0, 0, 3], // Column (0), Column (0), Line (3)
            curve: "smooth",
          },
          plotOptions: {
            bar: {
              columnWidth: "80%",
              borderRadius: 2,
            },
          },
          colors: ["#1E88E5", "#FF5252", "#21da49"],
          xaxis: {
            categories,
            title: { 
              text: undefined // ✅ Menghilangkan tulisan "Tanggal - Tahun-Bulan"
            },
          },
          yaxis: [
            {
              // SUMBU Y KIRI (Untuk Plan & Actual)
              seriesName: "Plan",
              min: 0,
              max: qtyAxisMax,
              title: { text: "Quantity (Pcs)" },
              labels: {
                formatter: (val) => Math.floor(val).toLocaleString(),
              },
            },
            {
              // SUMBU Y KIRI (Hidden - memaksa Actual ikut skala Plan)
              seriesName: "Plan",
              show: false,
            },
            {
              // SUMBU Y KANAN (Untuk Performance %)
              opposite: true,
              seriesName: "Performance (%)",
              min: 0,
              max: 100, // Dilebihkan dikit agar label tidak terpotong
              title: { text: "Achievement (%)" },
              labels: {
               formatter: (val) => `${Math.round(val)}%`,
              },
            },
          ],
          dataLabels: {
            enabled: true,
            enabledOnSeries: [2],
            offsetY: -20,

            formatter: (val) => {
              if (Number(val) <= 0) return "";
              return `${Math.round(val)}%`; 
            },

            style: {
              fontSize: "11px",
              fontWeight: 600,
              colors: ["#888383"],
              opacity: 0.9,

            },

            background: {
              enabled: true,
              foreColor: "#ffffff",
              borderRadius: 4,
              padding: 2,
              opacity: 1,

              borderWidth: 1,
              borderColor: "#888383",

              backgroundColor: "#FFFFFF",
            },

            offsetY: -14,
          },

          markers: {
            size: [0, 0, 6], // hanya scatter yg punya titik
            strokeWidth: 0,
            hover: {
              size: 6,
            },
          },

          tooltip: {
            shared: true,
            intersect: false,
            // --- TAMBAHKAN FORMTER X DI SINI ---
            x: {
              formatter: (val) => {
                // val adalah angka tanggal (1, 2, 3...)
                const [year, mon] = month.split("-").map(Number);
                const dateObj = new Date(year, mon - 1, Number(val));
                
                const namaHari = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
                const namaBulan = [
                  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
                  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
                ];

                const hari = namaHari[dateObj.getDay()];
                const bulan = namaBulan[dateObj.getMonth()];

                return `${hari}, ${val} ${bulan} ${year}`;
              }
            },
            // -----------------------------------
            y: {
              formatter: (val, { seriesIndex }) => {
                if (seriesIndex === 2) return `${Math.round(val)}%`;
                return val.toLocaleString() + " Pcs"; // Tambahkan satuan jika perlu
              },
            },
          },
          legend: {
            show: true,
            position: "bottom",
            horizontalAlign: "center",
            floating: false,

            fontSize: "12px",

            itemMargin: {
              horizontal: 15,
              vertical: 0,
            },

            markers: {
              width: 10,
              height: 10,
              radius: 12,
            },
          },
        };

        this.chartKey++; // Re-render chart
      } catch (err) {
        console.error("Chart Error:", err);
      } finally {
        this.chartLoading = false;
      }
    },

    setChartData(rawData) {
      // kategori X-axis
      this.categories_line = rawData.map(d => d.line);

      // series utama
      this.planSeries_line = rawData.map(d => d.plan_qty);
      this.actualSeries_line = rawData.map(d => d.actual_qty);

      // akumulasi
      let accPlan = 0;
      let accActual = 0;

      this.accPlanSeries_line = rawData.map(d => {
        accPlan += d.plan_qty;
        return accPlan;
      });

      this.accActualSeries_line = rawData.map(d => {
        accActual += d.actual_qty;
        return accActual;
      });

      // percentage
      this.percentageSeries_line = rawData.map(d => {
        return d.plan_qty
          ? (d.actual_qty / d.plan_qty) * 100
          : 0;
      });
    },

    exportExcel() {
      const cycleHeaders = this.visibleCycleColumns.map(
        (cycle) => `CYCLE ${cycle} / ETD ${this.cycleETDMap[cycle] || "-"}`,
      );

      const header = [
        "Customer",
        "Model",
        "Part Number",
        ...cycleHeaders,
        "Total Plan",
        "Total Actual",
        "Qty Diff",
        "Status",
      ];

      const rows = this.filteredDataList.map((r) => {
        const cycleValues = this.visibleCycleColumns.map(
          (cycle) => r[`c_${cycle}`] || "-",
        );

        return [
          r.CUSTOMER ?? "",
          r.project ?? "",
          r.MATNR ?? "",
          ...cycleValues,
          Number(r.total_plan) || 0,
          Number(r.total_actual) || 0,
          Number(r.qty_diff) || 0,
          Number(r.FINISH) === 1 ? "FINISH" : "PENDING",
        ];
      });

      const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Mieruka Shipping");

      const cycleLabel = this.selectedCycleCard
        ? `cycle-card-${this.selectedCycleCard}`
        : this.cycle
          ? this.cycle
          : "ALL";

      XLSX.writeFile(
        wb,
        `Mieruka_${this.customer || "ALL"}_${cycleLabel}_${this.tanggal}.xlsx`,
      );
    },
  },
};
</script>
<style scoped>
:deep(.v-data-table-header th) {
  white-space: pre-line !important;
  vertical-align: middle;
}

.cycle-row {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 8px;
}

.cycle-row::-webkit-scrollbar {
  height: 8px;
}

.cycle-row::-webkit-scrollbar-thumb {
  background: #9e9e9e;
  border-radius: 10px;
}

.cycle-card-mini {
  min-width: 145px;
  max-width: 145px;
  border-radius: 8px;
  color: white;
  cursor: pointer;
  position: relative;
  padding: 10px 12px;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.cycle-card-mini:hover {
  transform: translateY(-2px);
}

.cycle-icon-mini {
  position: absolute;
  top: 10px;
  right: 10px;
  font-size: 18px;
  opacity: 0.9;
  color: rgba(255, 255, 255, 0.9);
}

.cycle-title-mini {
  font-size: 13px;
  font-weight: 700;
  line-height: 1.2;
}

.cycle-value-mini {
  font-size: 30px;
  font-weight: 800;
  line-height: 1.1;
  margin-top: 4px;
}

.cycle-sub-mini {
  font-size: 11px;
  font-weight: 600;
  margin-top: 4px;
  opacity: 0.95;
}

/* warna status */
.cycle-card-finish {
  background: #0b8043;
}

.cycle-card-pending {
  background: #a50e0e;
}

.cycle-card-active {
  background: #1565c0;
  box-shadow: 0 0 0 2px rgba(21, 101, 192, 0.35);
}

.text-red {
  color: #e53935;
  font-weight: 700;
}

.page-wrapper {
  background-color: #f5f7fa;
  min-height: 100vh;
  padding: 20px;
}

.summary-box {
  background: #fff;
  border-radius: 10px;
  padding: 20px;
  text-align: center;
  border: 1px solid #e3e7ee;
}

.summary-box .label {
  font-size: 13px;
  color: #5e6a75;
}

.summary-box .value {
  font-size: 26px;
  font-weight: 700;
  margin-top: 4px;
}

.summary-box.green {
  background: #e8f5e9;
  border-color: #66bb6a;
}

.summary-box.red {
  background: #ffebee;
  border-color: #ef5350;
}

.v-data-table th,
.v-data-table td {
  text-align: center !important;
}

:deep(.uppercase-select input),
:deep(.uppercase-select .v-select__selection-text) {
  text-transform: uppercase;
}
/* Paksa legend group jadi horizontal (inline-flex) */
:deep(.apexcharts-legend) {
  display: flex !important;
  flex-direction: row !important;
  flex-wrap: wrap !important;
  align-items: center !important;
  justify-content: center !important;
}

:deep(.apexcharts-legend-group) {
  display: flex !important;
  flex-direction: row !important;
  flex-wrap: wrap !important;
}
</style>