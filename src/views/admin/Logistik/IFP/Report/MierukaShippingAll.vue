<template>
  <div class="page-wrapper">

    <!-- PERFORMANCE CHART -->
    <v-card class="pa-5 rounded-lg mb-6 elevation-2">
      <div class="d-flex justify-end align-center mb-4 flex-wrap" style="gap:12px">
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

      <div v-if="chartLoading" class="d-flex justify-center align-center" style="height:350px">
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

      <div v-else class="d-flex justify-center align-center text-grey" style="height:350px">
        <div class="text-center">
          <v-icon size="48" color="grey-lighten-1">mdi-chart-bar</v-icon>
          <div class="mt-2">Tidak ada data grafik untuk bulan ini</div>
        </div>
      </div>
    </v-card>

    <!-- FILTER CARD -->
    <v-card class="pa-6 mb-6 rounded-lg elevation-2">
      <div class="d-flex justify-space-between align-center">
        <div>
          <div class="text-h5 font-weight-medium">
            <!-- Judul dinamis sesuai mode -->
            {{ isAdmMode ? `Shipping Preparation – ${selectedPlantLabel}` : 'Mieruka Shipping' }}
          </div>
          <div class="text-medium-emphasis text-body-2 mt-1">
            {{ isAdmMode
              ? `Analisa status scan berdasarkan Trip & Route untuk ${selectedPlantLabel}.`
              : 'Monitoring real-time delivery status & scan progress.'
            }}
          </div>
        </div>
        <img :src="logoMaj" width="120" />
      </div>

      <v-row dense class="mt-4">

       <!-- CUSTOMER -->
  <v-col cols="12" md="2">
    <v-select
      v-model="customer"
      :items="customerList"
      label="Customer"
      variant="outlined"
      density="compact"
      hide-details
      prepend-inner-icon="mdi-account"
    >
      <template #item="{ props, item }">
        <v-list-item
          v-bind="props"
          :title="String(item.raw).toUpperCase()"
        />
      </template>

      <template #selection="{ item }">
        <span>{{ String(item.raw).toUpperCase() }}</span>
      </template>
    </v-select>
  </v-col>

  <!-- PLANT -->
  <v-col v-if="isAdmMode" cols="12" md="2">
    <v-select
      v-model="selectedPlant"
      :items="plantOptions"
      item-title="text"
      item-value="value"
      label="Plant"
      variant="outlined"
      density="compact"
      hide-details
      prepend-inner-icon="mdi-factory"
    />
  </v-col>

  <!-- TANGGAL -->
  <v-col cols="12" md="2">
    <v-text-field
      v-model="filterDate"
      label="Tanggal"
      type="date"
      variant="outlined"
      density="compact"
      hide-details
      prepend-inner-icon="mdi-calendar"
    />
  </v-col>

  <!-- ROUTE -->
  <v-col v-if="isAdmMode" cols="12" md="2">
    <v-select
      v-model="selectedRoute"
      :items="routeSelectItems"
      item-title="text"
      item-value="value"
      label="Route"
      variant="outlined"
      density="compact"
      hide-details
      clearable
      prepend-inner-icon="mdi-map-marker-path"
    />
  </v-col>

  <!-- TRIP -->
  <v-col v-if="isAdmMode" cols="12" md="2">
    <v-select
      v-model="selectedTrip"
      :items="tripSelectItems"
      item-title="text"
      item-value="value"
      label="Trip"
      variant="outlined"
      density="compact"
      hide-details
      clearable
      prepend-inner-icon="mdi-truck-fast"
    />
  </v-col>

       <!-- CYCLE FILTER -->
        <v-col v-if="!isAdmMode" cols="12" md="2">
          <v-text-field
            v-model="cycle"
            label="Cycle"
            type="number"
            variant="outlined"
            density="compact"
            hide-details
            prepend-inner-icon="mdi-repeat"
            :disabled="!customer || !filterDate"
          />
        </v-col>
        <!-- ACTION BUTTONS -->
        <v-col cols="12" class="d-flex align-center flex-wrap" style="gap:8px">
          <v-btn
            color="primary"
            class="px-6"
            :loading="loading"
            :disabled="isAdmMode ? !selectedPlant || !filterDate : !customer || !filterDate"
            @click="loadData"
          >
            <v-icon start>mdi-database-search</v-icon>
            Load Data
          </v-btn>

          <!-- Tombol ADM P4 & P5 hanya tampil jika ADM -->
          <template v-if="isAdmMode">
            <v-btn color="deep-purple" @click="goToDisplaySAP">
              <v-icon start>mdi-monitor-dashboard</v-icon>
              ADM P4
            </v-btn>
            <v-btn color="deep-purple" @click="goToDisplayKAP">
              <v-icon start>mdi-monitor-dashboard</v-icon>
              ADM P5
            </v-btn>
          </template>
        </v-col>

      </v-row>
    </v-card>

    <!-- ============================================================ -->
    <!-- MODE ADM: ROUTE CARDS + TRIP CARDS                          -->
    <!-- ============================================================ -->
    <template v-if="isAdmMode">

      <!-- ROUTE CARDS -->
     <v-card class="route-wrapper elevation-2 mb-6">
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
      <div class="route-title-mini">{{ routeAliasMap[r.route] || r.route }}</div>
      <div class="route-subtitle-mini">{{ r.route }}</div>
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

      <!-- TABLE ADM (pivot by trip) -->
      <v-card class="pa-4 rounded-lg elevation-2">
        <div class="d-flex flex-wrap align-center justify-space-between mb-3">
          <div class="text-h6 font-weight-medium">
            Detail Table ({{ selectedPlantLabel }})
          </div>
          <div class="d-flex flex-wrap align-center" style="gap:12px">
            <v-text-field
              v-model="search"
              label="Search Job / Part / Model"
              prepend-inner-icon="mdi-magnify"
              density="compact"
              variant="outlined"
              hide-details
              clearable
              style="min-width:320px"
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

        <div style="overflow-x:auto">
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
              {{ (tableOptions.itemsPerPage > 0 ? (tableOptions.page - 1) * tableOptions.itemsPerPage : 0) + (index + 1) }}
            </template>

            <template #item.total_scanned_qty="{ item }">
              {{ Number(item.total_scanned_qty || 0).toLocaleString() }}
            </template>

            <template #item.FINISH="{ item }">
              <v-chip :color="Number(item.FINISH) === 1 ? 'green' : 'red'" size="small">
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
                style="cursor:pointer"
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

    </template>

    <!-- ============================================================ -->
    <!-- MODE NON-ADM: CYCLE CARDS + TABLE BY CYCLE                  -->
    <!-- ============================================================ -->
    <template v-else>

      <!-- CYCLE CARDS -->
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
        <div v-else class="text-grey">Tidak ada data cycle.</div>
      </v-card>

      <!-- TABLE NON-ADM (pivot by cycle) -->
      <v-card class="pa-5 rounded-lg mb-6 elevation-2">
        <div class="d-flex flex-wrap justify-space-between align-center mb-4" style="gap:12px">
          <div class="text-h6 text-primary font-weight-medium">
            Detail Table By Cycle
          </div>
          <div class="d-flex flex-wrap align-center" style="gap:12px">
            <v-text-field
              v-model="searchPart"
              label="Search Job / Part / Model"
              prepend-inner-icon="mdi-magnify"
              density="compact"
              variant="outlined"
              clearable
              style="min-width:280px"
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
          Menampilkan data berdasarkan customer <b>{{ customerDisplay }}</b>
          <span v-if="selectedCycleCard"> dan cycle card <b>{{ selectedCycleCard }}</b></span>
          <span v-else-if="cycle"> dan filter cycle <b>{{ cycle }}</b></span>
        </div>

        <div style="overflow-x: auto; width: 100%;">
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
                    {{ (tableOptions.itemsPerPage > 0 ? (tableOptions.page - 1) * tableOptions.itemsPerPage : 0) + (index + 1) }}
                  </template>

                  <template #item.CUSTOMER="{ item }">
                    <span class="font-weight-medium" style="white-space: nowrap;">{{ item.CUSTOMER || "-" }}</span>
                  </template>

                  <template #item.project="{ item }">
                    <span class="font-weight-medium" style="white-space: nowrap;">{{ item.project || "-" }}</span>
                  </template>

                  <template #item.MATNR="{ item }">
                    <span class="font-weight-medium" style="white-space: nowrap;">{{ item.MATNR || "-" }}</span>
                  </template>

                  <template #item.BISMT="{ item }">
                    <span class="font-weight-medium" style="white-space: nowrap;">{{ item.BISMT || "-" }}</span>
                  </template>

                  <template #item.cycles_resume="{ item }">
                    <span style="white-space: nowrap;">{{ item.cycles_resume || "-" }}</span>
                  </template>

                  <template
                    v-for="c in visibleCycleColumns"
                    :key="'cycle-cell-' + c"
                    #[`item.c_${c}`]="{ item }"
                  >
                    <span :class="getCycleValueClass(item[`c_${c}`])" style="white-space: nowrap;">
                      {{ item[`c_${c}`] || "-" }}
                    </span>
                  </template>

                  <template #item.total_plan="{ item }">
                    <span style="white-space: nowrap;">{{ Number(item.total_plan || 0).toLocaleString() }}</span>
                  </template>

                  <template #item.total_actual="{ item }">
                    <span :class="getQtyActualClass(item.total_actual)" style="white-space: nowrap;">
                      {{ Number(item.total_actual || 0).toLocaleString() }}
                    </span>
                  </template>

                  <template #item.qty_diff="{ item }">
                    <span class="text-red font-weight-medium" style="white-space: nowrap;">
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

          </template>

          <!-- ============================================================ -->
          <!-- DIALOG TRIP DETAIL (hanya dipakai mode ADM)                 -->
          <!-- ============================================================ -->
          <v-dialog v-model="dialogTrip" max-width="560">
            <v-card class="rounded-lg">
              <v-card-title class="d-flex justify-space-between align-center">
                <div class="text-h6 font-weight-medium">Detail Trip {{ dialogInfo.trip }}</div>
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
                    <div class="caption text-medium-emphasis">Jumlah KBN (Scanned/Total)</div>
                    <div class="font-weight-medium">{{ dialogInfo.scanned_kbn }} / {{ dialogInfo.total_kbn }}</div>
                  </v-col>
                  <v-col cols="6">
                    <div class="caption text-medium-emphasis">ETD</div>
                    <div class="font-weight-medium">{{ dialogInfo.etd }}</div>
                  </v-col>
                  <v-col cols="12" class="mt-2">
                    <v-alert
                      v-if="dialogInfo.pending_count > 0"
                      density="compact"
                      variant="outlined"
                      type="error"
                    >
                      <div class="font-weight-medium">Pending Scan: {{ dialogInfo.pending_count }} Kanban</div>
                      <div class="mt-1">Cycle: <b>{{ dialogInfo.pending_cycles }}</b></div>
                    </v-alert>
                    <v-alert v-else density="compact" variant="outlined" type="success">
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
import { useControlPrepare } from "@/stores/Logistik/IFP/Report/ControlPrepare";
import * as XLSX from "xlsx";
import VueApexCharts from "vue3-apexcharts";
import logoMaj from "@/assets/images/MAJ-LOGO-3.png";

export default {
  name: "ShippingPreparationGabungan",

  components: {
    VueApexCharts,
  },

  data() {
    return {
      logoMaj,

      // ─── SHARED ───────────────────────────────────────────────
      customer: "",
      filterDate: "",
      loading: false,
      _loadTimer: null,

      customerList: ["ADM", "hmmi", "tmmin", "mmki", "mkm"],

      // ─── ADM MODE ─────────────────────────────────────────────
      selectedPlant: null,
      plantOptions: [
        { text: "PLANT 4", value: "P4" },
        { text: "PLANT 5", value: "P5" },
      ],
      selectedTrip: null,
      selectedRoute: null,
      search: "",
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

      // ─── NON-ADM MODE ─────────────────────────────────────────
      cycle: "",
      searchPart: "",
      selectedCycleCard: null,

      // ─── TABLE SHARED ─────────────────────────────────────────
      tableOptions: {
        page: 1,
        itemsPerPage: 10,
      },

      // ─── CHART SHARED ─────────────────────────────────────────
      chartKey: 0,
      chartSeries: [],
      chartOptions: {},
      chartLoading: false,
      chartMonth: new Date().toISOString().slice(0, 7),


      // Chart customer: ADM default P5, non-ADM default HMMI
      chartCustomer: "HMMI",
      chartCustomerList: [
        { title: "ADM PLANT 4", value: "P4"   },
        { title: "ADM PLANT 5", value: "P5"   },
        { title: "HMMI",        value: "HMMI" },
        { title: "TMMIN",       value: "TMMIN"},
        { title: "MMKI",        value: "MMKI" },
        { title: "MKM",         value: "MKM"  },
      ],
    };
  },

  computed: {
    ...mapState(useControlPrepare, [
      // ADM
      "dataTripAll",
      "tripOptions",
      "routeOptions",
      "performanceKanban",
      // Non-ADM
      "dataMieruka",
      "performanceChart",
    ]),

    getRouteLabel() {
      return (route) => this.routeAliasMap[route] || route;
    },

    routeAliasMap() {
      return {
        // Plant 4
        "DIRECT-MAJ GM": "GAYA MOTOR",
        "MR4-TB1-C":     "SAP 1",
        "MR4-TB2-C":     "SAP 2",
        // Plant 5
        "DR5MAJ-K1":     "DIRECT MAJ KAP 1",
        "MR5BT-K1":      "KAP 1",
        "MR5BT-K2":      "KAP 2",
      };
    },

    // ─── MODE SWITCH ──────────────────────────────────────────────
    isAdmMode() {
      return String(this.customer || "").toUpperCase() === "ADM";
    },

    customerDisplay() {
      return this.customer ? String(this.customer).toUpperCase() : "-";
    },

    // ─── ADM: PLANT LABEL ─────────────────────────────────────────
    selectedPlantLabel() {
      const found = this.plantOptions.find((o) => o.value === this.selectedPlant);
      return found ? found.text : "Pilih Plant Terlebih Dahulu";
    },

    // ─── ADM: ROUTE OPTIONS ───────────────────────────────────────
    routeOptionsByPlant() {
      return {
        P4: ["DIRECT-MAJ GM", "MR4-TB1-C", "MR4-TB2-C"],
        P5: ["DR5MAJ-K1", "MR5BT-K1", "MR5BT-K2"],
      };
    },

    effectiveRouteOptions() {
      const fromStore = (this.routeOptions || []).filter(Boolean);
      if (fromStore.length) return fromStore;
      return this.routeOptionsByPlant[this.selectedPlant] || [];
    },

    routeSelectItems() {
      return this.effectiveRouteOptions.map((r) => ({
        text:  this.routeAliasMap[r] ? `${this.routeAliasMap[r]}` : r,
        value: r,  // value tetap kode asli untuk filter data
      }));
    },

    routeHint() {
      if (!this.selectedPlant) return "Pilih plant dulu";
      if (this.selectedPlant === "P5") return "Route Plant 5 format: DR5MAJ-K1 (dll)";
      if (this.selectedPlant === "P4") return "Route Plant 4 format: DIRECT-MAJ GM (dll)";
      return "Route sesuai plant";
    },

    tripSelectItems() {
      return (this.tripOptions || []).map((t) => ({ text: `TRIP ${t}`, value: t }));
    },

    // ─── ADM: ROUTE LIST (cards) ──────────────────────────────────
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
        if (Number(r.is_scan) === 1) o.finish += 1;
        o.etd = this.pickEarlierEtd(o.etd, r.etd);
      }

      return Array.from(map.values()).sort((a, b) => a.route.localeCompare(b.route));
    },

    // ─── ADM: DATA FILTER ─────────────────────────────────────────
    dataForTripCards() {
      let list = this.dataTripAll || [];
      if (this.selectedRoute) {
        list = list.filter((r) => String(r.route || "") === String(this.selectedRoute));
      }
      return list;
    },

    // ─── ADM: TRIP LIST (cards) ───────────────────────────────────
    tripList() {
      const list = this.dataForTripCards;
      if (!list.length) return [];

      const tripMap = new Map();

      for (const row of list) {
        const trip = Number(row.trip);
        if (!Number.isFinite(trip)) continue;

        if (!tripMap.has(trip)) {
          tripMap.set(trip, { trip, parts: new Map(), etd: null });
        }

        const tripObj = tripMap.get(trip);
        const partKey = row.part_number || "UNKNOWN";

        if (!tripObj.parts.has(partKey)) {
          tripObj.parts.set(partKey, { totalKanban: 0, scannedKanban: 0 });
        }

        const partObj = tripObj.parts.get(partKey);
        partObj.totalKanban += 1;
        if (Number(row.is_scan) === 1) partObj.scannedKanban += 1;
        tripObj.etd = this.pickEarlierEtd(tripObj.etd, row.etd);
      }

      return Array.from(tripMap.values())
        .map((t) => {
          let totalPart = 0;
          let finishPart = 0;
          for (const part of t.parts.values()) {
            totalPart += 1;
            if (part.scannedKanban === part.totalKanban) finishPart += 1;
          }
          return { trip: t.trip, total: totalPart, finish: finishPart, etd: t.etd };
        })
        .sort((a, b) => a.trip - b.trip);
    },

    // ─── ADM: VISIBLE TRIP COLUMNS ────────────────────────────────
    visibleTripColumns() {
      const cols = this.tripOptions || [];
      if (this.selectedTrip == null) return cols;
      const t = Number(this.selectedTrip);
      return cols.includes(t) ? [t] : [];
    },

    // ─── ADM: DATA BY FILTER ──────────────────────────────────────
    dataByFilter() {
      let list = this.dataTripAll || [];
      if (this.selectedRoute) {
        list = list.filter((r) => String(r.route || "") === String(this.selectedRoute));
      }
      if (this.selectedTrip != null) {
        list = list.filter((r) => Number(r.trip) === Number(this.selectedTrip));
      }
      return list;
    },

    // ─── ADM: PIVOT ITEMS ─────────────────────────────────────────
    pivotItems() {
      const rows = this.dataByFilter || [];
      if (!rows.length) return [];

      const trips = this.tripOptions || [];
      const map = {};

      rows.forEach((r) => {
        const job  = r.job_number  || "-";
        const part = r.part_number || "-";
        const key  = `${job}_${part}`;
        const tNum = Number(r.trip);
        if (!Number.isFinite(tNum)) return;

        const qty    = Number(r.qty) || 0;
        const isScan = Number(r.is_scan) === 1;

        if (!map[key]) {
          const base = {
            __key: key,
            project: r.project || "-",
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
          trips.forEach((t) => { base[`t_${t}`] = { scanned: 0, total: 0 }; });
          map[key] = base;
        }

        const cycle = String(r.cycle || "").trim();
        const route = String(r.route || "").trim();
        const jenis = String(r.jenis || "").trim();

        if (cycle) map[key]._cycles.add(cycle);
        if (route) map[key]._routes.add(route);
        if (jenis) map[key]._jenisSet.add(jenis);

        if (!map[key][`t_${tNum}`]) map[key][`t_${tNum}`] = { scanned: 0, total: 0 };
        map[key][`t_${tNum}`].total += qty;
        map[key].total_planned_qty  += qty;

        if (isScan) {
          map[key][`t_${tNum}`].scanned += qty;
          map[key].total_scanned_qty    += qty;
          map[key]._scanned_row         += 1;
        }
        map[key]._total_row += 1;
      });

      return Object.values(map).map((item) => {
        Object.keys(item).forEach((k) => {
          if (k.startsWith("t_") && item[k] && typeof item[k] === "object") {
            item[k] = `${item[k].scanned}/${item[k].total}`;
          }
        });

        item.cycles = Array.from(item._cycles).sort((a, b) => Number(a) - Number(b)).join(",");
        item.jenis  = Array.from(item._jenisSet).sort().join(",");
        item.route  = Array.from(item._routes).sort().join(",");
        item.FINISH = item._total_row > 0 && item._scanned_row === item._total_row ? 1 : 0;

        delete item._total_row;
        delete item._scanned_row;
        delete item._cycles;
        delete item._routes;
        delete item._jenisSet;

        return item;
      });
    },

    // ─── ADM: FILTERED PIVOT ITEMS ────────────────────────────────
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

      return items.filter((item) =>
        String(item.part_number || "").toLowerCase().includes(keyword) ||
        String(item.job_number  || "").toLowerCase().includes(keyword) ||
        String(item.jenis       || "").toLowerCase().includes(keyword)
      );
    },

baseFilteredData() {
  const custFilter   = String(this.customer || "").trim().toLowerCase();
  const dateFilter   = this.filterDate || "";
  const dateNorm     = dateFilter.replace(/\//g, "-");
  const dateStripped = dateNorm.replace(/-/g, "");

  // Deteksi struktur: HMMI pakai reguler+ckd, lainnya pakai .data langsung
  let allData = [];

  if (this.dataMieruka?.reguler || this.dataMieruka?.ckd) {
    // Struktur HMMI
    allData = [
      ...(this.dataMieruka?.reguler?.data || []),
      ...(this.dataMieruka?.ckd?.data     || []),
    ];
  } else {
    // Struktur lama (MMKI, TMMIN, MKM, dll)
    allData = this.dataMieruka?.data || [];
  }

  return allData.filter((item) => {
    const itemCustomer = String(item.CUSTOMER || "").trim().toLowerCase();
    const matchCustomer = !custFilter || itemCustomer === custFilter;

    const matchTanggal =
      !dateFilter ||
      item.BSTDK === dateNorm ||
      item.VDATU === dateStripped;

    return matchCustomer && matchTanggal;
  });
},

    // ─── NON-ADM: VISIBLE CYCLE COLUMNS ──────────────────────────
    visibleCycleColumns() {
      if (this.selectedCycleCard) return [String(this.selectedCycleCard)];

      const set = new Set();
      this.baseFilteredData.forEach((row) => {
        const cycle = row.CYCLE;
        if (cycle !== null && cycle !== undefined && cycle !== "") {
          set.add(String(cycle));
        }
      });

      return Array.from(set).sort((a, b) => Number(a) - Number(b));
    },

    // ─── NON-ADM: CYCLE ETD MAP ───────────────────────────────────
    cycleETDMap() {
      const map = {};
      this.baseFilteredData.forEach((row) => {
        const cycle = String(row.CYCLE || "");
        if (!cycle) return;
        if (!map[cycle]) map[cycle] = row.ETD || "-";
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
            project:  row.project  || "-",
            MATNR:    row.MATNR    || "-",
            BISMT:    row.BISMT    || "-",
            total_plan:   0,
            total_actual: 0,
            qty_diff: 0,
            FINISH:   0,
            _cycles: new Set(),
          };
          this.visibleCycleColumns.forEach((c) => { grouped[key][`c_${c}`] = "-"; });
        }

        const cycle  = String(row.CYCLE || "");
        const plan   = Number(row.KWMENG || 0);
        const actual = Number(row.total_qty_scan || 0);

        grouped[key].total_plan   += plan;
        grouped[key].total_actual += actual;

        if (cycle && this.visibleCycleColumns.includes(cycle)) {
          grouped[key][`c_${cycle}`] = `${actual}/${plan}`;
        }
        if (cycle) {
          grouped[key]._cycles.add(cycle);
        }
      });

      return Object.values(grouped).map((item) => {
        item.qty_diff = item.total_plan - item.total_actual;
        item.FINISH   = item.total_actual >= item.total_plan && item.total_plan > 0 ? 1 : 0;
        item.cycles_resume = Array.from(item._cycles)
          .sort((a, b) => Number(a) - Number(b))
          .join(", ");
        delete item._cycles;
        return item;
      });
    },

    // ─── NON-ADM: FILTERED DATA LIST ─────────────────────────────
    filteredDataList() {
      let result = [...this.pivotCycleItems];

      if (this.searchPart) {
        const keyword = this.searchPart.toLowerCase();
        result = result.filter((row) =>
          String(row.MATNR    || "").toLowerCase().includes(keyword) ||
          String(row.CUSTOMER || "").toLowerCase().includes(keyword) ||
          String(row.project  || "").toLowerCase().includes(keyword)
        );
      }

      return result;
    },

    // ─── NON-ADM: CYCLE CARD LIST ─────────────────────────────────
cycleCardList() {
  // Jika HMMI: gunakan cycle_summary dari API (lebih akurat)
  if (this.dataMieruka?.reguler || this.dataMieruka?.ckd) {
    const regulerSummary = this.dataMieruka?.reguler?.cycle_summary || {};
    const ckdSummary     = this.dataMieruka?.ckd?.cycle_summary     || {};
    const merged = {};

    for (const [cycle, val] of Object.entries(regulerSummary)) {
      merged[cycle] = {
        cycle,
        finish: val.totalFinish,
        total:  val.totalData,
        etd:    val.etd || "-",
      };
    }

    for (const [cycle, val] of Object.entries(ckdSummary)) {
      if (merged[cycle]) {
        merged[cycle].finish += val.totalFinish;
        merged[cycle].total  += val.totalData;
      } else {
        merged[cycle] = {
          cycle,
          finish: val.totalFinish,
          total:  val.totalData,
          etd:    val.etd || "-",
        };
      }
    }

    return Object.values(merged)
      .sort((a, b) => Number(a.cycle) - Number(b.cycle));
  }

  // Struktur lama (MMKI, TMMIN, MKM, dll) — logic lama tetap jalan
  const grouped = {};
  if (!this.baseFilteredData.length) return [];

  this.baseFilteredData.forEach((item) => {
    const cycle = item.CYCLE || "-";
    if (!grouped[cycle]) {
      grouped[cycle] = {
        cycle,
        finish:     0,
        total:      0,
        qty_plan:   0,
        qty_actual: 0,
        etd:        item.ETD || "-",
      };
    }

    const plan   = Number(item.KWMENG)         || 0;
    const actual = Number(item.total_qty_scan)  || 0;

    grouped[cycle].total      += 1;
    grouped[cycle].qty_plan   += plan;
    grouped[cycle].qty_actual += actual;

    if (actual >= plan && plan > 0) grouped[cycle].finish += 1;
  });

  return Object.values(grouped).sort((a, b) => {
    const aNum = Number(a.cycle);
    const bNum = Number(b.cycle);
    if (Number.isNaN(aNum) && Number.isNaN(bNum)) return String(a.cycle).localeCompare(String(b.cycle));
    if (Number.isNaN(aNum)) return 1;
    if (Number.isNaN(bNum)) return -1;
    return aNum - bNum;
  });
},

    // ─── HEADERS (dinamis sesuai mode) ───────────────────────────
headers() {
      if (this.isAdmMode) {
        return [
          { title: "No", key: "index", width: 60, align: "center", sortable: false },
          { title: "Job Number", key: "job_number", width: 140, align: "center" },
          { title: "Part Number", key: "part_number", width: 170, align: "center" },
          { title: "Cycle", key: "cycles", width: 100, align: "center" },
          { title: "Route", key: "route", width: 100, align: "center" },
          { title: "Jenis", key: "jenis", width: 120, align: "center" },
          { title: "Qty (Kbn)", key: "qty", width: 90, align: "center" },
          ...this.visibleTripColumns.map((t) => ({ title: `TRIP ${t}`, key: `t_${t}`, width: 110, align: "center" })),
          { title: "Total Scanned (Qty)", key: "total_scanned_qty", width: 160, align: "center" },
          { title: "Status", key: "FINISH", width: 120, align: "center" },
        ];
      }

      // ─── LEBAR KOLOM NON-ADM BERHASIL DIKUNCI ───────────────────────
      return [
        { title: "No", key: "index", width: 60, align: "center", sortable: false },
        { title: "Customer", key: "CUSTOMER", width: 100, align: "center" },
        { title: "Model", key: "project", width: 100, align: "center" },
        { title: "Part Number", key: "MATNR", width: 250, align: "center" }, // Lebar aman terkunci
        { title: "Job Number", key: "BISMT", width: 250, align: "center" },  // Lebar aman terkunci
        { title: "Resume Cycle", key: "cycles_resume", width: 130, align: "center" },
        ...this.visibleCycleColumns.map((c) => ({ title: `CYCLE ${c}`, key: `c_${c}`, width: 120, align: "center", sortable: false })),
        { title: "Total Plan", key: "total_plan", width: 110, align: "center" },
        { title: "Total Actual", key: "total_actual", width: 110, align: "center" },
        { title: "Qty Diff", key: "qty_diff", width: 110, align: "center" },
        { title: "Status", key: "FINISH", width: 100, align: "center" },
      ];
    },
  },

// ─── WATCH ────────────────────────────────────────────────────────────────────
watch: {
  // Satu handler untuk keduanya — selalu fetch + build
  chartCustomer() {
    this.loadChartDataAuto();
  },

  chartMonth() {
    this.loadChartDataAuto();
  },

  customer() {
    this.selectedCycleCard = null;
    this.selectedTrip      = null;
    this.selectedRoute     = null;
    this.selectedPlant     = null;
    this.cycle             = "";
    this.tableOptions.page = 1;

    if (this.isAdmMode) {
      this.chartCustomer = "P5";
    } else {
      this.chartCustomer = String(this.customer || "HMMI").toUpperCase();
    }
    // chartCustomer watcher di atas akan otomatis trigger loadChartDataAuto()

    this.autoLoad();
  },

  selectedPlant() {
    const validRoutes = this.effectiveRouteOptions || [];
    if (this.selectedRoute && !validRoutes.includes(this.selectedRoute)) {
      this.selectedRoute = null;
    }
    this.scheduleLoadData();
  },

  filterDate() {
    this.selectedCycleCard = null;
    this.tableOptions.page = 1;
    if (this.isAdmMode) {
      this.scheduleLoadData();
    } else {
      this.autoLoad();
    }
  },

  cycle() {
    this.selectedCycleCard = null;
    this.tableOptions.page = 1;
    this.autoLoad();
  },

  searchPart() {
    this.tableOptions.page = 1;
  },
},

// ─── MOUNTED ──────────────────────────────────────────────────────────────────
mounted() {
  this.filterDate    = new Date().toISOString().slice(0, 10);
  this.chartCustomer = "HMMI";   // default non-ADM; ganti "P5" jika halaman dibuka dari ADM
  this.loadChartDataAuto();      // ← chart langsung muncul saat halaman terbuka
},

  beforeUnmount() {
    if (this._loadTimer) clearTimeout(this._loadTimer);
  },

  methods: {
    ...mapActions(useControlPrepare, [
      // ADM
      "fetchAdmTripAll",
      "fetchPerformanceKanban",
      // Non-ADM
      "fetchDataMieruka",
      "fetchPerformanceCustomer",
    ]),

    // ─── LOAD DATA (dispatcher) ───────────────────────────────────
    async loadData() {
      if (this.isAdmMode) {
        await this.loadDataAdm();
      } else {
        await this.loadDataMieruka();
      }
    },

    async autoLoad() {
      if (!this.customer || !this.filterDate) return;
      if (this.isAdmMode && !this.selectedPlant) return;
      await this.loadData();
    },

    // ─── LOAD DATA ADM ────────────────────────────────────────────
    async loadDataAdm() {
      if (!this.selectedPlant) { alert("Pilih Plant Terlebih Dahulu"); return; }
      if (!this.filterDate)    { alert("Tanggal wajib diisi"); return; }

      this.loading = true;
      try {
        await this.fetchAdmTripAll(true, {
          plant: this.selectedPlant,
          date:  this.normalizeDate(this.filterDate),
          trip:  this.selectedTrip,
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

async loadDataMieruka() {
  if (!this.customer || !this.filterDate) return;

  this.loading = true;
  try {
    const cycleParam  = this.cycle ? this.cycle : null;
    const customerUpper = String(this.customer).toUpperCase(); // ← force uppercase di sini

    console.log("[REQUEST] params:", {
      cycle:    cycleParam,
      customer: customerUpper,
      tanggal:  this.filterDate,
    });

    await this.fetchDataMieruka(cycleParam, customerUpper, this.filterDate); // ← pakai customerUpper

    console.log("[DEBUG] dataMieruka raw:", JSON.parse(JSON.stringify(this.dataMieruka)));
    console.log("[DEBUG] baseFilteredData:", this.baseFilteredData);
    console.log("[DEBUG] cycleCardList:", this.cycleCardList);

  } catch (err) {
    console.error("Load Error:", err);
  } finally {
    this.loading = false;
  }
},

    scheduleLoadData() {
      if (!this.selectedPlant || !this.filterDate) return;
      if (this._loadTimer) clearTimeout(this._loadTimer);
      this._loadTimer = setTimeout(() => { this.loadData(); }, 400);
    },

    // ─── CHART ADM ────────────────────────────────────────────────
// ─── METHODS: ganti 4 method chart lama dengan 3 method baru ─────────────────

// HAPUS: loadChartData(), buildChart(), loadPerformanceChart(), rebuildChartFromRaw()
// GANTI dengan ini:

async loadChartDataAuto() {
  if (!this.chartCustomer) return;
  if (this.chartLoading)   return;   // cegah double-fetch saat watcher trigger berurutan

  this.chartLoading = true;
  this.chartSeries  = [];

  try {
    const isAdm = ["P4", "P5"].includes(String(this.chartCustomer).toUpperCase());

    if (isAdm) {
      await this.fetchPerformanceKanban(this.chartMonth, this.chartCustomer);
      this._buildChart(this.performanceKanban, {
        plantName: this.chartCustomer.toUpperCase() === "P5" ? "ADM PLANT 5" : "ADM PLANT 4",
        unit:      "Kanban",
        maxQty:    995,
      });
    } else {
      await this.fetchPerformanceCustomer(this.chartMonth, null);
      this._buildChart(this.performanceChart, {
        plantName: this.chartCustomer.toUpperCase(),
        unit:      "Pcs",
        maxQty:    7010,
      });
    }
  } catch (err) {
    console.error("Chart Error:", err);
  } finally {
    this.chartLoading = false;
  }
},

// Builder tunggal — dipanggil dari loadChartDataAuto setelah fetch selesai
_buildChart(rawData, { plantName, unit}) {
  const filtered = (rawData || []).filter(
    (d) => String(d.CUSTOMER || "").toUpperCase() === String(this.chartCustomer).toUpperCase()
  );

  const [year, month] = this.chartMonth.split("-").map(Number);
  const daysInMonth   = new Date(year, month, 0).getDate();
  const allDays       = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const categories    = allDays.map((d) => String(d));

  const dataMap = {};
  filtered.forEach((d) => {
    const raw    = d.tanggal || "";
    const dayNum = raw.includes("-") ? Number(raw.split("-")[2]) : Number(raw);
    if (dayNum) dataMap[dayNum] = d;
  });

  const planData   = allDays.map((day) => Number(dataMap[day]?.total_plan || 0));
  const actualData = allDays.map((day) => Number(dataMap[day]?.total_scan || 0));
  const pctData    = allDays.map((day) => {
    const val = Number(dataMap[day]?.pct || 0);
    return val > 0 ? Math.round(val) : null;
  });

  const namaBulan     = ["Januari","Februari","Maret","April","Mei","Juni",
                         "Juli","Agustus","September","Oktober","November","Desember"];
  const namaBulanTeks = namaBulan[month - 1];

  this.chartSeries = [
    { name: "Plan", type: "column",  data: planData },
    { name: "Act",  type: "column",  data: actualData },
    { name: "(%)",  type: "scatter", data: pctData },
  ];

const maxActual = Math.max(...planData, 1);  // nilai terbesar actual saja
const maxQty    = Math.floor(maxActual * 1.75);

  this.chartOptions = this._buildChartOptions({
    categories,
    title:         `Scan Performance ${plantName} Bulan ${namaBulanTeks} ${year}`,
    unit,
    maxQty,
    year,
    month,
    namaBulan,
    namaBulanTeks,
  });

  this.chartKey++;
},

// _buildChartOptions tetap sama seperti file asli — tidak perlu diubah

    // ─── SHARED CHART OPTIONS BUILDER ────────────────────────────
    _buildChartOptions({ categories, title, unit, maxQty, year, month, namaBulan, namaBulanTeks }) {
      return {
        chart:  { type: "line", stacked: false, toolbar: { show: true } },
        title:  { text: title, align: "center", style: { fontSize: "16px", fontWeight: "bold", color: "#263238" } },
        stroke: { width: [0, 0, 0] },
        plotOptions: { bar: { columnWidth: "70%", borderRadius: 2 } },
        colors: ["#1E88E5", "#FF5252", "#21da49"],
        xaxis:  { categories, title: { text: "Tanggal" } },
        yaxis: [
          {
            seriesName: "Plan",
            title: { text: `Quantity (${unit})` },
            min: 0, max: maxQty,
            labels: { formatter: (val) => Math.floor(val).toLocaleString() },
          },
          { seriesName: "Plan", show: false },
          {
            opposite: true,
            seriesName: "Achievement (%)",
            min: 0, max: 100,
            title: { text: "Achievement (%)" },
            labels: { formatter: (val) => `${Math.round(val)}%` },
          },
        ],
        dataLabels: {
          enabled: true,
          enabledOnSeries: [2],
          offsetY: -15,
          formatter: (val) => (val ? `${Math.round(val)}%` : ""),
          style: { fontSize: "10px", colors: ["#888383"] },
          background: {
            enabled: true, foreColor: "#ffffff", padding: 1,
            borderRadius: 4, backgroundColor: "#888383",
            borderColor: "#888383", opacity: 1,
          },
        },
        markers: { size: [0, 0, 6], strokeWidth: 0, hover: { size: 6 } },
        legend: {
          show: true, position: "bottom", horizontalAlign: "center",
          floating: false, fontSize: "12px",
          itemMargin: { horizontal: 10, vertical: 5 },
          markers: { width: 12, height: 12, radius: 12 },
        },
        tooltip: {
          shared: true, intersect: false,
          x: {
            formatter: (val) => {
              const dateObj   = new Date(year, month - 1, Number(val));
              const namaHari  = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
              return `${namaHari[dateObj.getDay()]}, ${val} ${namaBulanTeks} ${year}`;
            },
          },
          y: {
            formatter: (val, { seriesIndex }) =>
              seriesIndex === 2 ? `${Math.round(val)}%` : `${val.toLocaleString()} ${unit}`,
          },
        },
      };
    },

    // ─── ADM METHODS ──────────────────────────────────────────────
    selectRoute(route) {
      const next = route ? String(route) : null;
      if (this.selectedRoute && next && this.selectedRoute === next) {
        this.selectedRoute = null;
        this.selectedTrip  = null;
        return;
      }
      this.selectedRoute = next;
      this.selectedTrip  = null;
    },

    selectTrip(trip) {
      if (this.selectedTrip != null && Number(this.selectedTrip) === Number(trip)) {
        this.selectedTrip = null;
        return;
      }
      this.selectedTrip = Number(trip);
    },

    getRouteCardColor(r) {
      if (!r || !r.total) return "route-red";
      return r.finish >= r.total ? "route-green" : "route-red";
    },

    getTripCardColor(t) {
      if (!t || !t.total) return "trip-red";
      return t.finish >= t.total ? "trip-green" : "trip-red";
    },

    getTripClass(value) {
      if (!value) return "";
      const [scanned, total] = String(value).split("/").map(Number);
      if (!total) return "";
      return scanned !== total ? "text-red" : "text-green";
    },

    parseCellValue(val) {
      const [scanned, total] = String(val || "0/0").split("/").map(Number);
      return {
        scanned: Number.isFinite(scanned) ? scanned : 0,
        total:   Number.isFinite(total)   ? total   : 0,
      };
    },

    pickEarlierEtd(a, b) {
      if (!a) return b ? String(b) : null;
      if (!b) return a;
      const toMin = (etd) => {
        const [hh, mm] = String(etd || "").split(":").map(Number);
        return Number.isFinite(hh) && Number.isFinite(mm) ? hh * 60 + mm : Infinity;
      };
      return toMin(a) <= toMin(b) ? a : String(b);
    },

    openTripDetail(item, trip) {
      const val = item[`t_${trip}`] || "0/0";
      const { scanned: scanned_qty, total: total_qty } = this.parseCellValue(val);
      const qty_per_kbn  = Number(item.qty) || 0;
      const total_kbn    = qty_per_kbn > 0 ? Math.floor(total_qty   / qty_per_kbn) : 0;
      const scanned_kbn  = qty_per_kbn > 0 ? Math.floor(scanned_qty / qty_per_kbn) : 0;

      const list    = (this.dataByFilter || []).filter((r) =>
        String(r.job_number  || "-") === String(item.job_number  || "-") &&
        String(r.part_number || "-") === String(item.part_number || "-") &&
        Number(r.trip) === Number(trip)
      );

      const first   = list[0] || {};
      const pending = list
        .filter((r) => Number(r.is_scan) !== 1)
        .map((r) => ({
          no_urut: r.no_urut ?? "",
          cycle:   r.cycle   ?? "",
          trip:    r.trip    ?? "",
          etd:     r.etd     ?? "",
          qty:     r.qty     ?? "",
          barcode: r.barcode ?? "",
          route:   r.route   ?? "",
          plan:    r.plan    ?? "",
        }));

      const cycleSet = new Set(pending.map((x) => String(x.cycle || "").trim()).filter(Boolean));
      const pending_cycles = Array.from(cycleSet).sort((a, b) => Number(a) - Number(b)).join(",");

      this.dialogInfo = {
        trip,
        project:       item.project    || "-",
        job_number:    item.job_number  || "-",
        part_number:   item.part_number || "-",
        cycles:        item.cycles      || "-",
        jenis:         item.jenis       || "-",
        etd:           first.etd        || "-",
        route:         first.route      || "-",
        qty_per_kbn,
        scanned_qty,
        total_qty,
        scanned_kbn,
        total_kbn,
        pending_rows:    pending,
        pending_cycles:  pending_cycles || "-",
        pending_count:   pending.length,
      };

      this.dialogTrip = true;
    },

    goToDisplaySAP() {
      const hour = String(new Date().getHours()).padStart(2, "0");
      this.$router.push({ name: "ifp-inhouse-display-mieruka-sap", params: { hour } });
    },

    goToDisplayKAP() {
      const hour = String(new Date().getHours()).padStart(2, "0");
      this.$router.push({ name: "ifp-inhouse-display-mieruka-kap", params: { hour } });
    },

    normalizeDate(input) {
      if (!input) return "";
      if (String(input).includes("/")) return String(input).split("/").reverse().join("-");
      return String(input);
    },

    // ─── NON-ADM METHODS ──────────────────────────────────────────
    selectCycleCard(cycle) {
      this.selectedCycleCard = String(this.selectedCycleCard) === String(cycle) ? null : cycle;
      this.tableOptions.page = 1;
    },

    getCycleCardColor(item) {
      if (String(this.selectedCycleCard) === String(item.cycle)) return "cycle-card-active";
      return Number(item.finish) === Number(item.total) && Number(item.total) > 0
        ? "cycle-card-finish"
        : "cycle-card-pending";
    },

    getCycleValueClass(value) {
      if (!value || value === "-") return "text-medium-emphasis";
      const [actualStr, planStr] = String(value).split("/");
      return Number(actualStr) < Number(planStr)
        ? "text-red font-weight-bold"
        : "text-green font-weight-bold";
    },

    getQtyActualClass(value) {
      return Number(value) === 0 ? "text-red font-weight-bold" : "";
    },

    // ─── EXPORT EXCEL (dispatcher) ────────────────────────────────
    exportExcel() {
      if (this.isAdmMode) {
        this.exportExcelAdm();
      } else {
        this.exportExcelMieruka();
      }
    },

    exportExcelAdm() {
      const items = this.filteredPivotItems || [];
      if (!items.length) { alert("Data kosong."); return; }

      const trips  = this.tripOptions || [];
      const header = [
        "Model","Job Number","Part Number","Cycle","Route","Jenis","Qty (Kbn)",
        ...trips.map((t) => `TRIP ${t}`),
        "Total Scanned (Qty)","Status",
      ];

      const rows = items.map((r) => {
        const row = [r.project, r.job_number, r.part_number, r.cycles || "", r.route || "", r.jenis || "", Number(r.qty) || 0];
        trips.forEach((t) => row.push(r[`t_${t}`] || "0/0"));
        row.push(Number(r.total_scanned_qty || 0));
        row.push(Number(r.FINISH) === 1 ? "FINISH" : "PENDING");
        return row;
      });

      const sheetName = this.selectedPlant === "P4"
        ? "SHIPPING ADM P4"
        : "SHIPPING ADM P5";

      const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
      const wb = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(wb, ws, sheetName);

      const now = new Date();

      const formattedDate =
        `${now.getFullYear()}.` +
        `${String(now.getMonth() + 1).padStart(2, '0')}.` +
        `${String(now.getDate()).padStart(2, '0')} ` +
        `${String(now.getHours() % 12 || 12).padStart(2, '0')}.` +
        `${String(now.getMinutes()).padStart(2, '0')} ` +
        `${now.getHours() >= 12 ? 'PM' : 'AM'}`;

      XLSX.writeFile(
        wb,
        `${formattedDate}_${sheetName}.xlsx`
      );
    },

exportExcelMieruka() {
  const cycleHeaders = this.visibleCycleColumns.map(
    (c) => `CYCLE ${c} / ETD ${this.cycleETDMap[c] || "-"}`
  );

  const header = [
    "Customer", "Model", "Part Number", "Job Number", "Resume Cycle",
    ...cycleHeaders,
    "Total Plan", "Total Actual", "Qty Diff", "Status",
  ];

  const rows = this.filteredDataList.map((r) => {
    const cycleValues = this.visibleCycleColumns.map((c) => r[`c_${c}`] || "-");

    return [
      r.CUSTOMER ?? "",
      r.project ?? "",
      r.MATNR ?? "",
      r.BISMT ?? "",
      r.cycles_resume ?? "",
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

  const now = new Date();

  const formattedDate =
    `${now.getFullYear()}.` +
    `${String(now.getMonth() + 1).padStart(2, '0')}.` +
    `${String(now.getDate()).padStart(2, '0')} ` +
    `${String(now.getHours() % 12 || 12).padStart(2, '0')}.` +
    `${String(now.getMinutes()).padStart(2, '0')} ` +
    `${now.getHours() >= 12 ? 'PM' : 'AM'}`;

  const customerName = this.customer
  ? this.customer.toUpperCase()
  : "ALL";

  XLSX.writeFile(
    wb,
    `${formattedDate}_SHIPPING ${customerName}.xlsx`
  );
},
  },
};
</script>
<style scoped>
/* ================================================================
   PAGE WRAPPER
   ================================================================ */
.page-wrapper {
  background-color: #f5f7fa;
  min-height: 100vh;
  padding: 20px;
}

/* ================================================================
   SUMMARY BOX
   ================================================================ */
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
  border-color: #5ac960;
}

.summary-box.red {
  background: #ffebee;
  border-color: #ef5350;
}

/* ================================================================
   ROUTE CARDS (ADM MODE)
   ================================================================ */
.route-wrapper {
  padding: 12px;
  border-radius: 10px;
  margin-bottom: 24px;
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

/* Mini route card */
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

/* Full route card */
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

/* Route card state */
.route-green    { background: #0b6b2a; }
.route-red      { background: #b30000; }
.route-all      { background: #2f2f2f; }
.route-dimmed   { opacity: 0.4; filter: grayscale(10%); }
.route-selected { outline: 3px solid rgba(255, 255, 255, 0.55); }

/* ================================================================
   TRIP CARDS (ADM MODE)
   ================================================================ */
.trip-row {
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 6px;
}

/* Mini trip card */
.trip-card-mini {
  width: 125px;
  height: 68px;
  border-radius: 8px;
  padding: 6px 10px;
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

/* Full trip card */
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
  transition: transform 0.12s ease, box-shadow 0.12s ease, opacity 0.12s ease;
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

/* Trip card state */
.trip-green  { background: #0b6b2a; }
.trip-red    { background: #b30000; }
.trip-dimmed { opacity: 0.4; filter: grayscale(15%); }

/* ================================================================
   STICKY HEADER (ADM MODE)
   ================================================================ */
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

.sticky-header .trip-icon   { position: absolute; right: 14px; top: 14px; opacity: 0.85; }
.sticky-header .trip-dimmed { opacity: 0.45; filter: grayscale(15%); }
.sticky-header .trip-green  { background: #0b6b2a; }
.sticky-header .trip-red    { background: #8b0f0f; }
.sticky-header .trip-orange { background: #a85f00; }

/* ================================================================
   CYCLE CARDS (NON-ADM MODE)
   ================================================================ */
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

/* Cycle card state */
.cycle-card-finish  { background: #0b8043; }
.cycle-card-pending { background: #a50e0e; }
.cycle-card-active  { background: #1565c0; box-shadow: 0 0 0 2px rgba(21, 101, 192, 0.35); }

/* ================================================================
   TEXT UTILITIES
   ================================================================ */
.text-red    { color: #d32f2f !important; font-weight: 700; }
.text-green  { color: #2e7d32 !important; }
.text-yellow { color: #f9a825 !important; }

/* ================================================================
   DATA TABLE
   ================================================================ */
:deep(.v-data-table-header th) {
  white-space: pre-line !important;
  vertical-align: middle;
}

.v-data-table th,
.v-data-table td {
  text-align: center !important;
}

/* ================================================================
   SELECT UPPERCASE
   ================================================================ */
:deep(.uppercase-select input),
:deep(.uppercase-select .v-select__selection-text) {
  text-transform: uppercase;
}

/* ================================================================
   APEXCHARTS LEGEND
   ================================================================ */
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

:deep(.apexcharts-legend-series) {
  display: flex !important;
  align-items: center !important;
}
</style>