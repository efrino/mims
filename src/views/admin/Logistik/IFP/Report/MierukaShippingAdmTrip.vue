<template>
  <div class="page-wrapper">
    <!-- HEADER / FILTER -->
    <div>

          <!-- PERFORMANCE CHART -->
          <v-card class="pa-5 rounded-lg mb-6 elevation-2">
            <div
              class="d-flex justify-end align-center mb-4 flex-wrap" 
              style="gap:12px"
            >
              <!-- 
                Menggunakan justify-end akan mendorong semua elemen di dalamnya ke kanan.
                Jika Anda ingin ada judul di kiri dan filter di kanan, gunakan justify-space-between 
                dan tambahkan elemen judul di sini.
              -->

              <div class="d-flex align-center" style="gap:12px; flex-wrap:wrap">

                <!-- CUSTOMER -->
                <v-select
                  v-model="chartCustomer"
                  :items="chartCustomerList"
                  item-title="title"
                  item-value="value"
                  label="Customer"
                  variant="outlined"
                  density="compact"
                  hide-details
                  prepend-inner-icon="mdi-domain"
                  style="min-width: 150px"
                />

                <!-- BULAN -->
                <v-text-field
                  v-model="chartMonth"
                  label="Bulan"
                  type="month"
                  variant="outlined"
                  density="compact"
                  style="min-width: 180px"
                  hide-details
                  prepend-inner-icon="mdi-calendar-month"
                />

                <!-- BUTTON -->
                <v-btn
                  color="primary"
                  density="comfortable"
                  :loading="chartLoading"
                  @click="loadChartData"
                >
                  <v-icon start>mdi-refresh</v-icon>
                  Refresh
                </v-btn>

              </div>
            </div>

            <div
              v-if="chartLoading"
              class="d-flex justify-center align-center"
              style="height:350px"
            >
              <v-progress-circular indeterminate color="primary" size="48" />
            </div>

            <VueApexCharts
              v-else-if="chartSeries.length"
              :key="chartKey"
              type="line"
              height="350"
              :options="chartOptions"
              :series="chartSeries"
            />

            <div
              v-else
              class="d-flex justify-center align-center text-grey"
              style="height:350px"
            >
              <div class="text-center">
                <v-icon size="48" color="grey-lighten-1">
                  mdi-chart-bar
                </v-icon>

                <div class="mt-2">
                  Tidak ada data grafik untuk bulan ini
                </div>
              </div>
            </div>
          </v-card>

      <v-card class="pa-6 mb-6 rounded-lg elevation-2">
        <div class="d-flex justify-space-between align-center">
          <div>
            <div class="text-h5 font-weight-medium">
              Shipping Preparation – {{ selectedPlantLabel }}
            </div>
            <div class="text-medium-emphasis text-body-2 mt-1">
              Analisa status scan berdasarkan Trip & Route untuk
              {{ selectedPlantLabel }}.
            </div>
          </div>

          <img :src="logoMaj" width="120" />
        </div>



        <v-row dense class="mt-4">
          <v-col cols="12" md="3">
            <v-select
              v-model="selectedPlant"
              :items="plantOptions"
              item-title="text"
              item-value="value"
              label="Pilih Plant"
              variant="outlined"
              prepend-inner-icon="mdi-factory"
              :rules="[(v) => !!v || 'Plant wajib dipilih']"
              required
            />
          </v-col>

          <v-col cols="12" md="3">
            <v-text-field
              v-model="filterDate"
              label="Tanggal"
              type="date"
              variant="outlined"
              :rules="[(v) => !!v || 'Tanggal wajib diisi']"
              required
            />
          </v-col>

          <v-col cols="12" md="3">
            <v-select
              v-model="selectedRoute"
              :items="routeSelectItems"
              item-title="text"
              item-value="value"
              label="Route (opsional)"
              variant="outlined"
              clearable
              prepend-inner-icon="mdi-map-marker-path"
              persistent-hint
              :hint="routeHint"
            />
          </v-col>

          <v-col cols="12" md="3">
            <v-select
              v-model="selectedTrip"
              :items="tripSelectItems"
              item-title="text"
              item-value="value"
              label="Trip (opsional)"
              variant="outlined"
              clearable
              prepend-inner-icon="mdi-truck-fast"
              persistent-hint
            />
          </v-col>

          <v-col cols="12" class="d-flex align-center">
            <v-btn
              color="primary"
              class="px-6"
              :loading="loading"
              @click="loadData"
            >
              <v-icon start>mdi-database-search</v-icon>
              Load Data
            </v-btn>

            <v-btn
              color="deep-purple"
              class="ml-2"
              @click="goToDisplaySAP"
            >
              <v-icon start>mdi-monitor-dashboard</v-icon>
              ADM P4
            </v-btn>

            <v-btn
              color="deep-purple"
              class="ml-2"
              @click="goToDisplayKAP"
            >
              <v-icon start>mdi-monitor-dashboard</v-icon>
              ADM P5
            </v-btn>
          </v-col>
        </v-row>
      </v-card>
    </div>

    <!-- ROUTE CARDS -->
    <v-card class="route-wrapper elevation-2">
      <div class="route-header">Route Summary ({{ selectedPlantLabel }})</div>

      <div class="route-row">
        <v-card
          v-for="r in routeList"
          :key="r.route"
          class="route-card-mini"
          elevation="2"
          :class="getRouteCardColor(r)"
          @click="selectRoute(r.route)"
        >
          <v-icon class="route-icon-mini">mdi-map-marker-path</v-icon>

          <div class="route-title-mini">
            {{ r.route }}
          </div>
        </v-card>
      </div>
    </v-card>

    <!-- TRIP CARDS -->
    <v-card class="pa-5 rounded-lg mb-6 elevation-2">
      <div class="text-subtitle-1 font-weight-medium mb-3">
        Trip Status ({{ selectedPlantLabel }})
      </div>

      <div v-if="tripList.length" class="trip-row">
        <v-card
          v-for="t in tripList"
          :key="`trip-${t.trip}`"
          class="trip-card-mini"
          elevation="2"
          :class="getTripCardColor(t)"
          @click="selectTrip(t.trip)"
        >
          <v-icon class="trip-icon-mini">mdi-truck</v-icon>

          <div class="trip-title-mini">TRIP {{ t.trip }}</div>
          <div class="trip-value-mini">{{ t.finish }} / {{ t.total }}</div>
          <div class="trip-sub-mini">ETD : {{ t.etd || "-" }}</div>
        </v-card>
      </div>

      <div v-else class="text-medium-emphasis">Tidak ada data Trip.</div>
    </v-card>

    <!-- TABLE -->
    <v-card class="pa-4 rounded-lg elevation-2">
      <div class="d-flex flex-wrap align-center justify-space-between mb-3">
        <div class="text-h6 font-weight-medium">
          Detail Table ({{ selectedPlantLabel }})
        </div>

        <div class="d-flex flex-wrap align-center" style="gap: 12px">
          <v-text-field
            v-model="search"
            label="Search Job / Part / Model"
            prepend-inner-icon="mdi-magnify"
            density="compact"
            variant="outlined"
            hide-details
            clearable
            style="min-width: 320px"
          />

          <v-btn
            color="success"
            class="px-4"
            :disabled="loading || !dataTripAll || dataTripAll.length === 0"
            @click="exportExcel"
          >
            <v-icon start>mdi-file-excel</v-icon>
            Export Excel
          </v-btn>
        </div>
      </div>

      <div style="overflow-x: auto">
        <v-data-table
          :headers="headers"
          :items="filteredPivotItems"
          :loading="loading"
          item-value="__key"
          class="elevation-1"
          :items-per-page="tableOptions.itemsPerPage"
          :page="tableOptions.page"
        >
          <template #item.index="{ index }">
            {{
              (tableOptions.itemsPerPage > 0
                ? (tableOptions.page - 1) * tableOptions.itemsPerPage
                : 0) +
              (index + 1)
            }}
          </template>

          <template #item.total_scanned_qty="{ item }">
            {{ Number(item.total_scanned_qty || 0).toLocaleString() }}
          </template>

          <template #item.FINISH="{ item }">
            <v-chip
              :color="Number(item.FINISH) === 1 ? 'green' : 'red'"
              size="small"
            >
              {{ Number(item.FINISH) === 1 ? "FINISH" : "PENDING" }}
            </v-chip>
          </template>

          <template
            v-for="t in visibleTripColumns"
            :key="`trip-col-${t}`"
            #[`item.t_${t}`]="{ item }"
          >
            <span
              :class="['font-weight-medium', getTripClass(item[`t_${t}`])]"
              style="cursor: pointer"
              @click="openTripDetail(item, t)"
            >
              {{ item[`t_${t}`] }}
            </span>
          </template>

          <template #no-data>
            <div class="pa-4 text-medium-emphasis">
              Tidak ada data. Pilih plant & tanggal lalu klik Load Data.
            </div>
          </template>
        </v-data-table>
      </div>
    </v-card>

    <!-- DIALOG -->
    <v-dialog v-model="dialogTrip" max-width="560">
      <v-card class="rounded-lg">
        <v-card-title class="d-flex justify-space-between align-center">
          <div class="text-h6 font-weight-medium">
            Detail Trip {{ dialogInfo.trip }}
          </div>
          <v-btn icon @click="dialogTrip = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>

        <v-divider />

        <v-card-text>
          <v-row dense>
            <v-col cols="6">
              <div class="caption text-medium-emphasis">Model</div>
              <div class="font-weight-medium">{{ dialogInfo.project }}</div>
            </v-col>

            <v-col cols="6">
              <div class="caption text-medium-emphasis">Job Number</div>
              <div class="font-weight-medium">{{ dialogInfo.job_number }}</div>
            </v-col>

            <v-col cols="6">
              <div class="caption text-medium-emphasis">Part Number</div>
              <div class="font-weight-medium">{{ dialogInfo.part_number }}</div>
            </v-col>

            <v-col cols="6">
              <div class="caption text-medium-emphasis">Cycle</div>
              <div class="font-weight-medium">{{ dialogInfo.cycles }}</div>
            </v-col>

            <v-col cols="6">
              <div class="caption text-medium-emphasis">Jenis</div>
              <div class="font-weight-medium">{{ dialogInfo.jenis }}</div>
            </v-col>

            <v-col cols="6">
              <div class="caption text-medium-emphasis">Route</div>
              <div class="font-weight-medium">{{ dialogInfo.route }}</div>
            </v-col>

            <v-col cols="6">
              <div class="caption text-medium-emphasis">Qty / KBN</div>
              <div class="font-weight-medium">{{ dialogInfo.qty_per_kbn }}</div>
            </v-col>

            <v-col cols="6">
              <div class="caption text-medium-emphasis">
                Jumlah KBN (Scanned/Total)
              </div>
              <div class="font-weight-medium">
                {{ dialogInfo.scanned_kbn }} / {{ dialogInfo.total_kbn }}
              </div>
            </v-col>

            <v-col cols="6">
              <div class="caption text-medium-emphasis">ETD</div>
              <div class="font-weight-medium">{{ dialogInfo.etd }}</div>
            </v-col>

            <v-col cols="6">
              <div class="caption text-medium-emphasis">Route</div>
              <div class="font-weight-medium">{{ dialogInfo.route }}</div>
            </v-col>

            <v-col cols="12" class="mt-2">
              <v-alert
                v-if="dialogInfo.pending_count > 0"
                density="compact"
                variant="outlined"
                type="error"
              >
                <div class="font-weight-medium">
                  Pending Scan: {{ dialogInfo.pending_count }} Kanban
                </div>
                <div class="mt-1">
                  Cycle: <b>{{ dialogInfo.pending_cycles }}</b>
                </div>
              </v-alert>

              <v-alert
                v-else
                density="compact"
                variant="outlined"
                type="success"
              >
                Semua kanban sudah discan ✅
              </v-alert>
            </v-col>
          </v-row>
        </v-card-text>

        <v-divider />

        <v-card-actions class="justify-end">
          <v-btn variant="text" @click="dialogTrip = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
<script>
import { mapActions, mapState } from "pinia";
import { useControlPrepare } from "@/stores/Logistik/IFP/Report/ControlPrepare.ts";
import * as XLSX from "xlsx";
import VueApexCharts from "vue3-apexcharts";
import logoMaj from "@/assets/images/MAJ-LOGO-3.png";

export default {
  name: "ShippingPreparation",
  components: {
  VueApexCharts
},

  data() {
    return {
      logoMaj,
      filterDate: "",
      selectedPlant: null,
      _loadTimer: null,

      plantOptions: [
        { text: "ADM Plant 4 (DN4)", value: "P4" },
        { text: "ADM Plant 5 (DN5)", value: "P5" },
      ],

      loading: false,
      search: "",
      tableOptions: {
        page: 1,
        itemsPerPage: 10,
      },

      selectedTrip: null,
      selectedRoute: null,
      chartKey: 0,
      chartSeries: [],
      chartOptions: {},
      chartLoading: false,
      chartMonth: new Date().toISOString().slice(0, 7), // Default bulan ini
      chartCustomer: "P5",
      chartCustomerList: [
        {
          title: "ADM PLANT 4",
          value: "P4",
        },
        {
          title: "ADM PLANT 5",
          value: "P5",
        },
      ],
      dialogTrip: false,
      dialogInfo: {
        trip: null,
        project: "",
        job_number: "",
        part_number: "",
        cycles: "",
        jenis: "",
        qty_per_kbn: 0,
        scanned_qty: 0,
        total_qty: 0,
        scanned_kbn: 0,
        total_kbn: 0,
        pending_rows: [],
        pending_cycles: "",
        pending_count: 0,
        etd: "",
        route: "",
      },
    };
  },

  computed: {
    ...mapState(useControlPrepare, [
      "dataTripAll",
      "tripOptions",
      "routeOptions",
      "performanceKanban",
    ]),

    routeList() {
      const list = this.dataTripAll || [];
      if (!list.length) return [];

      const map = new Map();

      for (const r of list) {
        const route = String(r.route || "").trim();
        if (!route) continue;

        if (!map.has(route)) {
          map.set(route, { route, total: 0, finish: 0, etd: null });
        }

        const o = map.get(route);
        o.total += 1;

        if (Number(r.is_scan) === 1) {
          o.finish += 1;
        }

        o.etd = this.pickEarlierEtd(o.etd, r.etd);
      }

      return Array.from(map.values()).sort((a, b) =>
        a.route.localeCompare(b.route),
      );
    },

    routeAllStats() {
      const list = this.dataTripAll || [];
      const total = list.length;
      const finish = list.reduce(
        (acc, r) => acc + (Number(r.is_scan) === 1 ? 1 : 0),
        0,
      );

      return { total, finish };
    },

    dataForTripCards() {
      let list = this.dataTripAll || [];

      if (this.selectedRoute) {
        list = list.filter(
          (r) => String(r.route || "") === String(this.selectedRoute),
        );
      }

      return list;
    },

    tripList() {
      const list = this.dataForTripCards;
      if (!list.length) return [];

      const tripMap = new Map();

      for (const row of list) {
        const trip = Number(row.trip);
        if (!Number.isFinite(trip)) continue;

        if (!tripMap.has(trip)) {
          tripMap.set(trip, {
            trip,
            parts: new Map(),
            etd: null,
          });
        }

        const tripObj = tripMap.get(trip);
        const partKey = row.part_number || "UNKNOWN";

        if (!tripObj.parts.has(partKey)) {
          tripObj.parts.set(partKey, {
            totalKanban: 0,
            scannedKanban: 0,
          });
        }

        const partObj = tripObj.parts.get(partKey);
        partObj.totalKanban += 1;

        if (Number(row.is_scan) === 1) {
          partObj.scannedKanban += 1;
        }

        tripObj.etd = this.pickEarlierEtd(tripObj.etd, row.etd);
      }

      return Array.from(tripMap.values())
        .map((t) => {
          let totalPart = 0;
          let finishPart = 0;

          for (const part of t.parts.values()) {
            totalPart += 1;

            if (part.scannedKanban === part.totalKanban) {
              finishPart += 1;
            }
          }

          return {
            trip: t.trip,
            total: totalPart,
            finish: finishPart,
            etd: t.etd,
          };
        })
        .sort((a, b) => a.trip - b.trip);
    },

    selectedPlantLabel() {
      const found = this.plantOptions.find(
        (opt) => opt.value === this.selectedPlant,
      );
      return found ? found.text : "Pilih Plant Terlebih Dahulu";
    },

    routeOptionsByPlant() {
      return {
        P4: ["DIRECT-MAJ GM"],
        P5: ["DR5MAJ-K1"],
        P1: [],
      };
    },

    effectiveRouteOptions() {
      const fromStore = (this.routeOptions || []).filter(Boolean);
      if (fromStore.length) return fromStore;

      return this.routeOptionsByPlant[this.selectedPlant] || [];
    },

    routeSelectItems() {
      return this.effectiveRouteOptions.map((r) => ({
        text: r,
        value: r,
      }));
    },

    routeHint() {
      if (!this.selectedPlant) return "Pilih plant dulu";
      if (this.selectedPlant === "P5") return "Route Plant 5 format: DR5MAJ-K1 (dll)";
      if (this.selectedPlant === "P4") return "Route Plant 4 format: DIRECT-MAJ GM (dll)";
      return "Route sesuai plant";
    },

    tripSelectItems() {
      return (this.tripOptions || []).map((t) => ({
        text: `TRIP ${t}`,
        value: t,
      }));
    },

    visibleTripColumns() {
      const cols = this.tripOptions || [];
      if (this.selectedTrip == null) return cols;

      const t = Number(this.selectedTrip);
      return cols.includes(t) ? [t] : [];
    },

    summaryFilterLabel() {
      const parts = [];
      parts.push(this.selectedRoute ? this.selectedRoute : "ALL ROUTE");
      parts.push(
        this.selectedTrip == null ? "ALL TRIP" : `TRIP ${this.selectedTrip}`,
      );
      return parts.join(" • ");
    },

    dataByFilter() {
      let list = this.dataTripAll || [];

      if (this.selectedRoute) {
        list = list.filter(
          (r) => String(r.route || "") === String(this.selectedRoute),
        );
      }

      if (this.selectedTrip != null) {
        list = list.filter((r) => Number(r.trip) === Number(this.selectedTrip));
      }

      return list;
    },

    totalItem() {
      return this.dataByFilter.length;
    },

    totalAct() {
      return this.dataByFilter.reduce(
        (acc, r) => acc + (Number(r.is_scan) === 1 ? 1 : 0),
        0,
      );
    },

    remaining() {
      return this.totalItem - this.totalAct;
    },

    pivotItems() {
      const rows = this.dataByFilter || [];
      if (!rows.length) return [];

      const trips = this.tripOptions || [];
      const map = {};

      rows.forEach((r) => {
        const model = r.project || "-";
        const job = r.job_number || "-";
        const part = r.part_number || "-";
        const key = `${job}_${part}`;

        const tNum = Number(r.trip);
        if (!Number.isFinite(tNum)) return;

        const qty = Number(r.qty) || 0;
        const isScan = Number(r.is_scan) === 1;

        const cycle = String(r.cycle || "").trim();
        const route = String(r.route || "").trim();
        const jenis = String(r.jenis || "").trim();

        if (!map[key]) {
          const base = {
            __key: key,
            project: model,
            job_number: job,
            part_number: part,
            qty,

            total_scanned_qty: 0,
            total_planned_qty: 0,

            FINISH: 0,

            _total_row: 0,
            _scanned_row: 0,
            _cycles: new Set(),
            _routes: new Set(),
            _jenisSet: new Set(),
          };

          trips.forEach((t) => {
            base[`t_${t}`] = { scanned: 0, total: 0 };
          });

          map[key] = base;
        }

        if (cycle) map[key]._cycles.add(cycle);
        if (route) map[key]._routes.add(route);
        if (jenis) map[key]._jenisSet.add(jenis);

        if (!map[key][`t_${tNum}`]) {
          map[key][`t_${tNum}`] = { scanned: 0, total: 0 };
        }

        map[key][`t_${tNum}`].total += qty;
        map[key].total_planned_qty += qty;

        if (isScan) {
          map[key][`t_${tNum}`].scanned += qty;
          map[key].total_scanned_qty += qty;
          map[key]._scanned_row += 1;
        }

        map[key]._total_row += 1;
      });

      return Object.values(map).map((item) => {
        Object.keys(item).forEach((k) => {
          if (k.startsWith("t_") && item[k] && typeof item[k] === "object") {
            const scanned = Number(item[k].scanned) || 0;
            const total = Number(item[k].total) || 0;
            item[k] = `${scanned}/${total}`;
          }
        });

        item.cycles = Array.from(item._cycles)
          .sort((a, b) => Number(a) - Number(b))
          .join(",");

        item.jenis = Array.from(item._jenisSet).sort().join(",");
        item.route = Array.from(item._routes).sort().join(",");

        item.FINISH =
          item._total_row > 0 && item._scanned_row === item._total_row ? 1 : 0;

        delete item._total_row;
        delete item._scanned_row;
        delete item._cycles;
        delete item._routes;
        delete item._jenisSet;

        return item;
      });
    },

    filteredPivotItems() {
      const keyword = (this.search || "").toLowerCase().trim();
      let items = this.pivotItems;

      if (this.selectedTrip != null) {
        const t = Number(this.selectedTrip);
        items = items.filter((it) => {
          const { total } = this.parseCellValue(it[`t_${t}`]);
          return total > 0;
        });
      }

      if (!keyword) return items;

      return items.filter((item) => {
        return (
          String(item.part_number || "").toLowerCase().includes(keyword) ||
          String(item.job_number || "").toLowerCase().includes(keyword) ||
          String(item.jenis || "").toLowerCase().includes(keyword)
        );
      });
    },

    headers() {
      return [
        { title: "No", key: "index", width: 60, align: "center" },
        {
          title: "Job Number",
          key: "job_number",
          width: 140,
          align: "center",
        },
        {
          title: "Part Number",
          key: "part_number",
          width: 170,
          align: "center",
        },
        { title: "Cycle", key: "cycles", width: 100, align: "center" },
        { title: "Route", key: "route", width: 100, align: "center" },
        { title: "Jenis", key: "jenis", width: 120, align: "center" },
        { title: "Qty (Kbn)", key: "qty", width: 90, align: "center" },

        ...this.visibleTripColumns.map((t) => ({
          title: `TRIP ${t}`,
          key: `t_${t}`,
          width: 110,
          align: "center",
        })),

        {
          title: "Total Scanned (Qty)",
          key: "total_scanned_qty",
          width: 160,
          align: "center",
        },
        { title: "Status", key: "FINISH", width: 120, align: "center" },
      ];
    },
  },

watch: {
  // ✅ selectedPlant hanya untuk load data tabel shipping
  selectedPlant() {
    const validRoutes = this.effectiveRouteOptions || [];
    if (this.selectedRoute && !validRoutes.includes(this.selectedRoute)) {
      this.selectedRoute = null;
    }
    this.scheduleLoadData(); // ← hapus loadChartData() dari sini
  },

  // ✅ chartCustomer → rebuild chart dari data yang ada (tidak fetch ulang)
  chartCustomer() {
    this.buildChart();
  },

  // ✅ chartMonth → fetch ulang karena beda bulan
  chartMonth() {
    this.loadChartData();
  },

  filterDate() {
    this.scheduleLoadData();
  },
},

// ✅ mounted dipindah keluar dari watch — ini bug struktural
mounted() {
  this.filterDate = new Date().toISOString().slice(0, 10);
  this.loadChartData(); // load chart saat halaman pertama dibuka
},

  methods: {
    ...mapActions(useControlPrepare, ["fetchAdmTripAll", "fetchPerformanceKanban"]),

        getNamaBulan(index) {
          const bulan = [
            "Januari", "Februari", "Maret", "April", "Mei", "Juni",
            "Juli", "Agustus", "September", "Oktober", "November", "Desember"
          ];
          return bulan[index];
        },

        async loadChartData() {
          try {
            this.chartLoading = true;

            await this.fetchPerformanceKanban(
              this.chartMonth,
              this.chartCustomer
            );

            console.log("RAW KANBAN:", this.performanceKanban);

            // ✅ Setelah fetch, langsung build chart
            this.buildChart();

          } catch (err) {
            console.error(err);
          } finally {
            this.chartLoading = false;
          }
        },

        buildChart() {
          const rawData = this.performanceKanban || [];

          // 1. Filter data berdasarkan Customer (P4/P5)
          const filtered = rawData.filter(d =>
            String(d.CUSTOMER || "").toUpperCase() === String(this.chartCustomer || "").toUpperCase()
          );

          const [year, month] = this.chartMonth.split("-").map(Number);
          const daysInMonth = new Date(year, month, 0).getDate();
          const allDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
          const categories = allDays.map(day => String(day));

          // 2. Map data ke tanggal
          const dataMap = {};
          filtered.forEach(d => {
            const raw = d.tanggal || "";
            const dayNum = raw.includes("-") ? Number(raw.split("-")[2]) : Number(raw);
            if (dayNum) dataMap[dayNum] = d;
          });

          const planData = allDays.map(day => Number(dataMap[day]?.total_plan || 0));
          const actualData = allDays.map(day => Number(dataMap[day]?.total_scan || 0));
          const pctData = allDays.map(day => {
            const val = Number(dataMap[day]?.pct || 0);
            // Kembalikan null jika 0 agar titik scatter tidak muncul di garis dasar
            return val > 0 ? Math.round(val) : null;
          });

          const namaBulanTerpilih = this.getNamaBulan(month - 1);

          this.chartSeries = [
            { name: "Plan", type: "column", data: planData },
            { name: "Act", type: "column", data: actualData },
            { name: "(%)", type: "scatter", data: pctData }, // Tipe Scatter
          ];
          const plantName = this.chartCustomer.toUpperCase() === 'P5' 
          ? 'ADM PLANT 5' 
          : this.chartCustomer.toUpperCase() === 'P4' 
            ? 'ADM PLANT 4' 
            : this.chartCustomer.toUpperCase();

          this.chartOptions = {
            chart: {
              type: "line",
              stacked: false,
              toolbar: { show: true },
            },
            // JUDUL
            title: {
              text: `Scan Performance ${plantName} Bulan ${namaBulanTerpilih} ${year}`,
              align: 'center',
              style: { fontSize: '16px', fontWeight: 'bold', color: '#263238' }
            },
            stroke: {
              width: [0, 0, 0], // Scatter tidak butuh garis
            },
            plotOptions: {
              bar: { columnWidth: "70%", borderRadius: 2 },
            },
            colors: ["#1E88E5", "#FF5252", "#21da49"], // Biru, Merah, Hijau
            xaxis: {
              categories,
              title: { text: "Tanggal" }
            },
            yaxis: [
              {
                seriesName: "Plan",
                title: { text: "Quantity (Kanban)" },
                min: 0,
                max: 995,
                labels: { formatter: (val) => Math.floor(val).toLocaleString() },
              },
              {
                seriesName: "Plan",
                show: false, // Hidden axis agar Actual mengikuti skala Plan
              },
              {
                opposite: true,
                seriesName: "Achievement (%)",
                min: 0,
                max: 100, // Dilebihkan agar label tidak terpotong
                title: { text: "Achievement (%)" },
                labels: { formatter: (val) => `${Math.round(val)}%` },
              },
            ],
            // PEMBULATAN ANGKA & LABEL
            dataLabels: {
              enabled: true,
              enabledOnSeries: [2], // Hanya muncul di scatter
              offsetY: -15,
              formatter: (val) => val ? `${Math.round(val)}%` : "",
              style: { fontSize: "10px", colors: ["#888383"] },
              background: {
                enabled: true,
                foreColor: "#ffffff",
                padding: 1,
                borderRadius: 4,
                backgroundColor: "#888383",
                borderColor: "#888383",
                opacity: 1,
              }
            },
            markers: {
            size: [0, 0, 6], // hanya scatter yg punya titik
            strokeWidth: 0,
            hover: {
              size: 6,
            },
          },
            // LEGEND DI BAWAH
            legend: {
              show: true,
              position: "bottom",       // Tetap di bawah
              horizontalAlign: "center", // Sejajar di tengah
              floating: false,
              fontSize: "12px",
              
              // KUNCI UTAMA DI SINI
              width: undefined,          // Membiarkan lebar otomatis
              containerMargin: {
                left: 0,
                right: 0
              },
              
              // Mengatur jarak antar item agar tidak terlalu rapat
              itemMargin: {
                horizontal: 10,
                vertical: 5
              },

              // Memastikan marker (simbol warna) sejajar dengan teks
              markers: {
                width: 12,
                height: 12,
                radius: 12,
              },
            },
            tooltip: {
              shared: true,
              intersect: false,
              x: {
                formatter: (val) => {
                  const dateObj = new Date(year, month - 1, Number(val));
                  const namaHari = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
                  return `${namaHari[dateObj.getDay()]}, ${val} ${namaBulanTerpilih} ${year}`;
                }
              },
              y: {
                formatter: (val, { seriesIndex }) => {
                  if (seriesIndex === 2) return `${Math.round(val)}%`;
                  return val.toLocaleString() + " Kanban";
                },
              },
            },
          };

          this.chartKey++; // Re-render chart
        },

        selectRoute(route) {
          const next = route ? String(route) : null;

          if (this.selectedRoute && next && this.selectedRoute === next) {
            this.selectedRoute = null;
            this.selectedTrip = null;
            return;
          }

          this.selectedRoute = next;
          this.selectedTrip = null;
        },

        getRouteCardColor(r) {
          if (!r || !r.total) return "route-red";
          return r.finish >= r.total ? "route-green" : "route-red";
        },

        selectTrip(trip) {
          if (
            this.selectedTrip != null &&
            Number(this.selectedTrip) === Number(trip)
          ) {
            this.selectedTrip = null;
            return;
          }

          this.selectedTrip = Number(trip);
        },

        getTripCardColor(t) {
          if (!t || !t.total) return "trip-red";
          return t.finish >= t.total ? "trip-green" : "trip-red";
        },

        pickEarlierEtd(a, b) {
          if (!a) return b ? String(b) : null;
          if (!b) return a;

          const toMin = (etd) => {
            const [hh, mm] = String(etd || "")
              .split(":")
              .map(Number);

            if (!Number.isFinite(hh) || !Number.isFinite(mm)) return Infinity;
            return hh * 60 + mm;
          };

          return toMin(a) <= toMin(b) ? a : String(b);
        },

        goToDisplaySAP() {
          const hour = String(new Date().getHours()).padStart(2, "0");
          this.$router.push({
            name: "ifp-inhouse-display-mieruka-sap",
            params: { hour },
          });
        },

        goToDisplayKAP() {
          const hour = String(new Date().getHours()).padStart(2, "0");
          this.$router.push({
            name: "ifp-inhouse-display-mieruka-kap",
            params: { hour },
          });
        },

        scheduleLoadData() {
          if (!this.selectedPlant || !this.filterDate) return;

          if (this._loadTimer) {
            clearTimeout(this._loadTimer);
          }

          this._loadTimer = setTimeout(() => {
            this.loadData();
          }, 400);
        },

        normalizeDate(input) {
          if (!input) return "";

          if (String(input).includes("/")) {
            return String(input).split("/").reverse().join("-");
          }

          return String(input);
        },

        async loadData() {
          if (!this.selectedPlant) {
            alert("Pilih Plant Terlebih Dahulu");
            return;
          }

          if (!this.filterDate) {
            alert("Tanggal wajib diisi");
            return;
          }

          this.loading = true;
          const dateParam = this.normalizeDate(this.filterDate);

          try {
            await this.fetchAdmTripAll(true, {
              plant: this.selectedPlant,
              date: dateParam,
              trip: this.selectedTrip,
              route: this.selectedRoute,
            });
          } catch (e) {
            console.error(e);
            alert("Gagal memuat data.");
          } finally {
            this.loading = false;

            if (
              this.selectedTrip != null &&
              !(this.tripOptions || []).includes(Number(this.selectedTrip))
            ) {
              this.selectedTrip = null;
            }

            const validRoutes = this.effectiveRouteOptions || [];
            if (this.selectedRoute && !validRoutes.includes(this.selectedRoute)) {
              this.selectedRoute = null;
            }
          }
        },

        parseCellValue(val) {
          const [scanned, total] = String(val || "0/0").split("/").map(Number);

          return {
            scanned: Number.isFinite(scanned) ? scanned : 0,
            total: Number.isFinite(total) ? total : 0,
          };
        },

        getTripClass(value) {
          if (!value) return "";

          const [scanned, total] = String(value).split("/").map(Number);
          if (!total) return "";

          return scanned !== total ? "text-red" : "text-green";
        },

        openTripDetail(item, trip) {
          const val = item[`t_${trip}`] || "0/0";
          const { scanned: scanned_qty, total: total_qty } =
            this.parseCellValue(val);

          const qty_per_kbn = Number(item.qty) || 0;
          const total_kbn =
            qty_per_kbn > 0 ? Math.floor(total_qty / qty_per_kbn) : 0;
          const scanned_kbn =
            qty_per_kbn > 0 ? Math.floor(scanned_qty / qty_per_kbn) : 0;

          const list = (this.dataByFilter || []).filter((r) => {
            const sameJob =
              String(r.job_number || "-") === String(item.job_number || "-");
            const samePart =
              String(r.part_number || "-") === String(item.part_number || "-");

            return sameJob && samePart && Number(r.trip) === Number(trip);
          });

          const first = list[0] || {};
          const etd = first.etd || "-";
          const route = first.route || "-";

          const pending = list
            .filter((r) => Number(r.is_scan) !== 1)
            .map((r) => ({
              no_urut: r.no_urut ?? "",
              cycle: r.cycle ?? "",
              trip: r.trip ?? "",
              etd: r.etd ?? "",
              qty: r.qty ?? "",
              barcode: r.barcode ?? "",
              route: r.route ?? "",
              plan: r.plan ?? "",
            }));

          const cycleSet = new Set(
            pending.map((x) => String(x.cycle || "").trim()).filter(Boolean),
          );

          const pending_cycles = Array.from(cycleSet)
            .sort((a, b) => Number(a) - Number(b))
            .join(",");

          this.dialogInfo = {
            trip,
            project: item.project || "-",
            job_number: item.job_number || "-",
            part_number: item.part_number || "-",
            cycles: item.cycles || "-",
            jenis: item.jenis || "-",
            etd,
            route,
            qty_per_kbn,
            scanned_qty,
            total_qty,
            scanned_kbn,
            total_kbn,
            pending_rows: pending,
            pending_cycles: pending_cycles || "-",
            pending_count: pending.length,
          };

          this.dialogTrip = true;
        },

        exportExcel() {
          const items = this.filteredPivotItems || [];

          if (!items.length) {
            alert("Data kosong, tidak ada yang bisa diexport.");
            return;
          }

          const trips = this.tripOptions || [];

          const header = [
            "Model",
            "Job Number",
            "Part Number",
            "Cycle",
            "Route",
            "Jenis",
            "Qty (Kbn)",
            ...trips.map((t) => `TRIP ${t}`),
            "Total Scanned (Qty)",
            "Status",
          ];

          const rows = items.map((r) => {
            const row = [
              r.project,
              r.job_number,
              r.part_number,
              r.cycles || "",
              r.route || "",
              r.jenis || "",
              Number(r.qty) || 0,
            ];

            trips.forEach((t) => row.push(r[`t_${t}`] || "0/0"));

            row.push(Number(r.total_scanned_qty || 0));
            row.push(Number(r.FINISH) === 1 ? "FINISH" : "PENDING");

            return row;
          });

          const excelData = [header, ...rows];
          const ws = XLSX.utils.aoa_to_sheet(excelData);
          const wb = XLSX.utils.book_new();

          const sheetName =
            this.selectedPlant === "P1"
              ? "ADM_P1"
              : this.selectedPlant === "P4"
                ? "ADM_P4"
                : "ADM_P5";

          XLSX.utils.book_append_sheet(wb, ws, sheetName);

          const tripLabel =
            this.selectedTrip == null ? "ALL" : String(this.selectedTrip);

          const routeLabel = this.selectedRoute
            ? String(this.selectedRoute).replace(/\s+/g, "_")
            : "ALL_ROUTE";

          const dateLabel = this.normalizeDate(this.filterDate);

          XLSX.writeFile(
            wb,
            `${sheetName}_TRIP_${tripLabel}_${routeLabel}_${dateLabel}.xlsx`,
          );
        },
      },

      beforeUnmount() {
        if (this._loadTimer) {
          clearTimeout(this._loadTimer);
        }
      },
    };
</script>
<style scoped>
.route-wrapper {
  padding: 12px;
  border-radius: 10px;
}

.route-header {
  font-weight: 600;
  margin-bottom: 10px;
  font-size: 16px;
}

.route-row {
  display: flex;
  gap: 12px;
  width: 100%;
}

.route-card-mini {
  flex: 1;
  height: 85px;
  border-radius: 12px;
  cursor: pointer;
  position: relative;
  color: #fff;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  transition: transform 0.15s ease;
}

.route-card-mini:hover {
  transform: translateY(-2px);
}

.route-icon-mini {
  position: absolute;
  right: 12px;
  top: 10px;
  font-size: 24px;
  opacity: 0.8;
  color: #fff !important;
}

.route-title-mini {
  font-weight: 700;
  font-size: 18px;
  margin-bottom: 4px;
}

.route-value-mini {
  font-weight: 800;
  font-size: 22px;
}

.route-green {
  background: #0b6b2a;
}

.route-red {
  background: #b30000;
}

.trip-row {
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 6px;
}

.trip-card-mini {
  width: 125px;
  height: 68px;        /* lebih kecil */
  border-radius: 8px;
  padding: 6px 10px;   /* padding diperkecil */
  cursor: pointer;
  position: relative;
  color: #fff;
  flex-shrink: 0;
  transition: transform 0.1s ease;
}

.trip-card-mini:hover {
  transform: translateY(-2px);
}

.trip-icon-mini {
  position: absolute;
  right: 8px;
  top: 8px;
  font-size: 26px;
  opacity: 0.8;
  color: #fff !important;
}

.trip-title-mini {
  font-weight: 700;
  font-size: 13px;
}

.trip-value-mini {
  font-weight: 800;
  font-size: 18px;
  line-height: 1.1;
}

.trip-sub-mini {
  font-size: 11px;
  margin-top: 2px;
  opacity: 0.9;
}

.trip-green {
  background: #0b6b2a;
}

.trip-red {
  background: #b30000;
}

.route-card-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.route-card {
  width: 300px;
  min-height: 110px;
  border-radius: 10px;
  padding: 14px 16px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  color: #fff;
  transition: transform 0.12s ease, opacity 0.12s ease;
}

.route-card:hover {
  transform: translateY(-2px);
}

.route-icon {
  position: absolute;
  right: 14px;
  top: 14px;
  font-size: 42px;
  opacity: 0.75;
  color: #fff !important;
}

.route-title {
  font-weight: 700;
  font-size: 16px;
  line-height: 1.15;
  margin-bottom: 6px;
  max-width: 240px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.route-value {
  font-weight: 800;
  font-size: 26px;
  line-height: 1.1;
}

.route-sub {
  margin-top: 6px;
  font-size: 14px;
  opacity: 0.95;
}

.route-dimmed {
  opacity: 0.4;
  filter: grayscale(10%);
}

.route-selected {
  outline: 3px solid rgba(255, 255, 255, 0.55);
}

.route-all {
  background: #2f2f2f;
}

.trip-card-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.trip-card {
  width: 260px;
  height: 110px;
  border-radius: 8px;
  padding: 14px 16px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  color: #fff;
  transition:
    transform 0.12s ease,
    box-shadow 0.12s ease,
    opacity 0.12s ease;
}

.trip-card:hover {
  transform: translateY(-2px);
}

.trip-icon {
  position: absolute;
  right: 14px;
  top: 14px;
  font-size: 44px;
  opacity: 0.75;
  color: #fff !important;
}

.trip-title {
  font-weight: 700;
  font-size: 20px;
  line-height: 1.1;
  margin-bottom: 6px;
}

.trip-value {
  font-weight: 800;
  font-size: 26px;
  line-height: 1.1;
}

.trip-sub {
  margin-top: 6px;
  font-size: 14px;
  opacity: 0.95;
}

.trip-dimmed {
  opacity: 0.4;
  filter: grayscale(15%);
}

.sticky-header {
  position: sticky;
  top: 0;
  z-index: 999;
  background: #fff;
  padding-bottom: 16px;
}

.sticky-header .trip-card {
  min-width: 260px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.sticky-header .trip-icon {
  position: absolute;
  right: 14px;
  top: 14px;
  opacity: 0.85;
}

.sticky-header .trip-dimmed {
  opacity: 0.45;
  filter: grayscale(15%);
}

.sticky-header .trip-green {
  background: #0b6b2a;
}

.sticky-header .trip-red {
  background: #8b0f0f;
}

.sticky-header .trip-orange {
  background: #a85f00;
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
  color: #74755e;
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

.text-yellow {
  color: #f9a825 !important;
}

.text-red {
  color: #d32f2f !important;
}

.text-green {
  color: #2e7d32 !important;
}

/* Memaksa container legend untuk tidak membagi grup (flex-row) */
:deep(.apexcharts-legend) {
  display: flex !important;
  flex-direction: row !important;
  justify-content: center !important;
  flex-wrap: nowrap !important; /* Mencegah turun ke baris baru */
}

:deep(.apexcharts-legend-series) {
  display: flex !important;
  align-items: center !important;
}
</style>