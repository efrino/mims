<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useGlcSimulationStore } from '@/stores/PCD/Welding/Simulation';
import Highcharts from 'highcharts';
import html2canvas from 'html2canvas';
import logoMaj from '@/assets/images/logo-maj.png';
import logoSlogan from '@/assets/images/logo-slogan.png';
import { decryptId } from '@/utils/cryptoId';

const route = useRoute();
const router = useRouter();
const store = useGlcSimulationStore();

// Loading state
const isLoading = ref(true);
const isFullscreen = ref(false);
const autoRefreshEnabled = ref(false);
let autoRefreshTimer: any = null;

// Container refs
const monitoringContainer = ref<HTMLElement | null>(null);
const highchartContainer = ref<HTMLElement | null>(null);
let hcChart: Highcharts.Chart | null = null;

// Simulation detail data
const simulationData = ref<any>(null);
const headerData = ref<any>(null);
const summaryData = ref<any[]>([]);

// Layout widths for strict vertical alignment between Highcharts and HTML table
const leftColW = ref(190);
const rightColW = ref(70);
const chartPixelWidth = ref(0);
const colWidths = ref<number[]>([]);
const tableKey = ref(0);

// Screen size handling
const isSmallScreen = ref(false);
const SMALL_BREAKPOINT = 1200;
const MIN_COLUMN_WIDTH = 55;

const checkScreenSize = () => {
  isSmallScreen.value = window.innerWidth < SMALL_BREAKPOINT;
};

const monthNamesIndo = [
  'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
  'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'
];

const formatPeriodeBulanTahun = (periode: any): string => {
  if (!periode) return '';
  let str = String(periode).replace(/periode\s*:?|period\s*:?/gi, '').trim();

  // Handle YYYY-MM-DD or YYYY-MM
  if (/^\d{4}-\d{2}(-\d{2})?$/.test(str)) {
    const parts = str.split('-');
    const year = parts[0];
    const monthIdx = parseInt(parts[1], 10) - 1;
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${monthNamesIndo[monthIdx]} ${year}`;
    }
  }

  // Handle YYYYMM (e.g. 202609)
  if (/^\d{6}$/.test(str)) {
    const year = str.substring(0, 4);
    const monthIdx = parseInt(str.substring(4, 6), 10) - 1;
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${monthNamesIndo[monthIdx]} ${year}`;
    }
  }

  // Handle MM-YYYY or MM/YYYY
  const slashDashParts = str.split(/[-/]/);
  if (slashDashParts.length === 2) {
    const [p1, p2] = slashDashParts;
    if (p1.length === 4 && p2.length <= 2) {
      const monthIdx = parseInt(p2, 10) - 1;
      if (monthIdx >= 0 && monthIdx < 12) return `${monthNamesIndo[monthIdx]} ${p1}`;
    } else if (p1.length <= 2 && p2.length === 4) {
      const monthIdx = parseInt(p1, 10) - 1;
      if (monthIdx >= 0 && monthIdx < 12) return `${monthNamesIndo[monthIdx]} ${p2}`;
    }
  }

  return str.toUpperCase();
};

// Title computation matching image header (e.g., GLC WELDING - SEPTEMBER 2026)
const pageTitle = computed(() => {
  if (headerData.value) {
    const area = headerData.value.area || 'GLC WELDING';
    const rawPeriode = headerData.value.periode || '';
    const formattedPeriode = formatPeriodeBulanTahun(rawPeriode);
    if (formattedPeriode) {
      return `${area.toUpperCase()} - ${formattedPeriode}`.trim();
    }
    return area.toUpperCase();
  }
  return 'GLC WELDING SIMULATION';
});

// Helper for effective Weld Time (fallback to prod_time or TPT net)
const getWeldTime = (m: any): number => {
  if (!m) return 0;
  const finalVal = Number(m.prod_time_final);
  const prodVal = Number(m.prod_time);
  if (!isNaN(finalVal) && finalVal > 0) {
    return finalVal;
  }
  if (!isNaN(prodVal) && prodVal > 0) {
    return prodVal;
  }
  const tptVal = Number(m.tpt || 0);
  const dandoriVal = Number(m.dandori || 0);
  const downtimeVal = Number(m.downtime || 0);
  const tcVal = Number(m.tip_change ?? m.tc ?? 0);
  const teiryoVal = Number(m.teiryo || 0);
  const wt = tptVal - dandoriVal - downtimeVal - tcVal - teiryoVal;
  return wt > 0 ? Number(wt.toFixed(2)) : 0;
};

const toHours = (val: any) => Number(val || 0);

// Load Simulation Data
const loadData = async () => {
  isLoading.value = true;
  try {
    const rawParamId = Array.isArray(route.params.id) ? route.params.id[0] : route.params.id;
    const queryId = Array.isArray(route.query.id) ? route.query.id[0] : route.query.id;
    const rawId = rawParamId || queryId;
    const simId = decryptId(rawId);

    if (simId) {
      await store.fetchSimulationDetail(simId);
      if (store.selectedSimulation) {
        simulationData.value = store.selectedSimulation;
        headerData.value = store.selectedSimulation.header || {};
        summaryData.value = [...(store.selectedSimulation.summary || [])].sort((a: any, b: any) =>
          String(a.machine || '').localeCompare(String(b.machine || ''), undefined, { numeric: true, sensitivity: 'base' })
        );
      }
    }
    
    // Fallback to live active summary if empty
    if (!summaryData.value || summaryData.value.length === 0) {
      await store.fetchLiveSummary();
      summaryData.value = [...(store.liveSummaryData || [])].sort((a: any, b: any) =>
        String(a.machine || '').localeCompare(String(b.machine || ''), undefined, { numeric: true, sensitivity: 'base' })
      );
      headerData.value = {
        area: 'GLC WELDING',
        periode: new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
      };
    }
  } catch (err) {
    console.error('Failed to load simulation data for monitoring:', err);
  } finally {
    isLoading.value = false;
    await nextTick();
    setTimeout(() => {
      renderChart();
    }, 50);
  }
};

// Render Highcharts Chart
const renderChart = () => {
  if (!highchartContainer.value || !summaryData.value || summaryData.value.length === 0) return;

  const data = [...summaryData.value].sort((a: any, b: any) =>
    String(a.machine || '').localeCompare(String(b.machine || ''), undefined, { numeric: true, sensitivity: 'base' })
  );
  const categories = data.map((d: any) => d.machine || 'Unknown');

  const downtimeData = data.map((d: any) => toHours(d.downtime));
  const tcData = data.map((d: any) => toHours(d.tip_change ?? d.tc));
  const dandoriData = data.map((d: any) => toHours(d.dandori));
  const teiryoData = data.map((d: any) => toHours(d.teiryo));
  const teikiData = data.map((d: any) => getWeldTime(d));
  const uphData = data.map((d: any) => Number(d.uph || (d.tpt > 0 && d.pcs_day > 0 ? (d.pcs_day / d.tpt) : 0)).toFixed(1)).map(Number);

  if (hcChart) {
    hcChart.destroy();
  }

  hcChart = Highcharts.chart(highchartContainer.value, {
    chart: {
      type: 'column',
      marginTop: 20,
      marginBottom: 0,
      marginLeft: leftColW.value,
      marginRight: rightColW.value,
      animation: false,
      style: {
        fontFamily: 'Arial, Helvetica, sans-serif'
      },
      events: {
        render: function () {
          const chart = this;
          chartPixelWidth.value = chart.chartWidth;
          const xAxis = chart.xAxis[0];
          const newWidths: number[] = [];
          const ticks = xAxis.ticks;
          const tickPositions = xAxis.tickPositions || [];

          if (tickPositions.length > 0) {
            for (let i = 0; i < tickPositions.length - 1; i++) {
              const currentTick = ticks[tickPositions[i]];
              const nextTick = ticks[tickPositions[i + 1]];
              if (currentTick && nextTick && currentTick.mark && nextTick.mark) {
                const currentMark = currentTick.mark.element as any;
                const nextMark = nextTick.mark.element as any;
                if (currentMark && nextMark && typeof currentMark.x === 'number' && typeof nextMark.x === 'number') {
                  const w = nextMark.x - currentMark.x;
                  newWidths.push(Math.abs(w));
                }
              }
            }
            if (newWidths.length > 0) {
              const lastWidth = newWidths[newWidths.length - 1];
              newWidths.push(lastWidth);
            }
          }
          if (newWidths.length > 0 && JSON.stringify(colWidths.value) !== JSON.stringify(newWidths)) {
            colWidths.value = newWidths;
            tableKey.value += 1;
          }
        }
      }
    },
    title: { text: '' },
    tooltip: {
      style: {
        fontFamily: 'Arial, Helvetica, sans-serif'
      }
    },
    xAxis: {
      categories,
      labels: {
        enabled: false // Sumbu X tidak menampilkan nama mesin karena sudah ada di tabel bawahnya
      },
      tickWidth: 1,
      tickLength: 3,
      lineColor: '#0f172a',
      lineWidth: 1.5,
      tickColor: '#0f172a',
      tickmarkPlacement: 'on'
    },
    yAxis: [
      {
        min: 0,
        max: 24,
        tickInterval: 2,
        endOnTick: true,
        maxPadding: 0,
        title: {
          text: 'TPT / DAY (JAM)',
          style: { fontWeight: 'bold', color: '#0f172a', fontSize: '11.5px', fontFamily: 'Arial, Helvetica, sans-serif' }
        },
        lineWidth: 1.5,
        lineColor: '#0f172a',
        tickWidth: 1.5,
        tickColor: '#0f172a',
        labels: {
          style: { color: '#0f172a', fontWeight: 'bold', fontSize: '11px', fontFamily: 'Arial, Helvetica, sans-serif' }
        },
        plotLines: [
          { value: 8, color: '#0f172a', dashStyle: 'Dash', width: 2, zIndex: 5 },
          { value: 11, color: '#f44336', dashStyle: 'Dash', width: 2, zIndex: 5 },
          { value: 16, color: '#0f172a', dashStyle: 'Dash', width: 2, zIndex: 5 },
          { value: 19, color: '#f44336', dashStyle: 'Dash', width: 2, zIndex: 5 },
          { value: 21, color: '#f44336', dashStyle: 'Dash', width: 2, zIndex: 5 }
        ],
        stackLabels: {
          enabled: true,
          useHTML: true,
          style: {
            fontWeight: 'bold',
            color: '#0f172a',
            fontFamily: 'Arial, Helvetica, sans-serif'
          },
          formatter: function (this: any) {
            const val = this.total ? this.total.toFixed(1) : '0.0';
            return `<div class="chart-stack-box">${val}</div>`;
          }
        }
      },
      {
        title: {
          text: 'GSPH',
          style: { fontWeight: 'bold', color: '#0f172a', fontSize: '11.5px', fontFamily: 'Arial, Helvetica, sans-serif' }
        },
        labels: {
          format: '{value}',
          style: { color: '#0f172a', fontWeight: 'bold', fontSize: '11px', fontFamily: 'Arial, Helvetica, sans-serif' }
        },
        opposite: true,
        showEmpty: true,
        lineWidth: 1.5,
        lineColor: '#0f172a',
        tickWidth: 1.5,
        tickColor: '#0f172a',
        gridLineWidth: 0
      }
    ],
    legend: { enabled: false },
    plotOptions: {
      column: {
        stacking: 'normal',
        groupPadding: 0.05,
        pointPadding: 0.02,
        borderWidth: 0
      }
    },
    series: [
      {
        name: 'DOWNTIME',
        data: downtimeData,
        color: '#d50000',
        stack: 'tpt',
        yAxis: 0
      },
      {
        name: 'T/C',
        data: tcData,
        color: '#fbc02d',
        stack: 'tpt',
        yAxis: 0
      },
      {
        name: 'DANDORI',
        data: dandoriData,
        color: '#00a2ff',
        stack: 'tpt',
        yAxis: 0
      },
      {
        name: 'TEIRYO',
        data: teiryoData,
        color: '#800080',
        stack: 'tpt',
        yAxis: 0
      },
      {
        name: 'TEIKI',
        data: teikiData,
        color: '#005db9',
        stack: 'tpt',
        yAxis: 0
      },
      {
        name: 'GSPH',
        type: 'spline',
        yAxis: 1,
        data: uphData,
        lineWidth: 0,
        marker: { enabled: false },
        showInLegend: false,
        enableMouseTracking: false
      }
    ] as any,
    credits: { enabled: false }
  });
};

// Toggle Fullscreen
const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    monitoringContainer.value?.requestFullscreen?.();
    isFullscreen.value = true;
  } else {
    document.exitFullscreen?.();
    isFullscreen.value = false;
  }
};

// Toggle Auto Refresh
const toggleAutoRefresh = () => {
  autoRefreshEnabled.value = !autoRefreshEnabled.value;
  if (autoRefreshEnabled.value) {
    autoRefreshTimer = setInterval(() => {
      loadData();
    }, 30000); // every 30 seconds
  } else if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
  }
};

// Export PNG
const exportPNG = async () => {
  if (!monitoringContainer.value) return;
  try {
    const canvas = await html2canvas(monitoringContainer.value, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff'
    });
    const link = document.createElement('a');
    link.download = `GLC_Monitoring_${pageTitle.value.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (err) {
    console.error('Error exporting PNG:', err);
  }
};

const tableContainerStyle = computed(() => {
  if (isSmallScreen.value) {
    const w = leftColW.value + rightColW.value + (summaryData.value.length * MIN_COLUMN_WIDTH);
    return { minWidth: w + 'px' };
  }
  if (chartPixelWidth.value > 0) {
    return { width: chartPixelWidth.value + 'px' };
  }
  return { width: '100%' };
});

const getColumnStyle = (index: number) => {
  if (isSmallScreen.value) {
    return {
      width: `${MIN_COLUMN_WIDTH}px`,
      flex: `0 0 ${MIN_COLUMN_WIDTH}px`
    };
  }
  return {
    flex: `${colWidths.value[index] || 1} 0 0%`
  };
};

onMounted(async () => {
  checkScreenSize();
  window.addEventListener('resize', () => {
    checkScreenSize();
    if (hcChart) {
      hcChart.reflow();
    }
  });

  await loadData();
});

onUnmounted(() => {
  window.removeEventListener('resize', checkScreenSize);
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
  }
  if (hcChart) {
    hcChart.destroy();
  }
});
</script>

<template>
  <div ref="monitoringContainer" class="monitoring-page bg-white min-h-screen d-flex flex-column justify-space-between position-relative">
    <!-- TOP DYNAMIC ACCENT BAR -->
    <div class="top-accent-wrapper position-relative">
      <div class="top-accent-bar position-relative overflow-hidden">
        <div class="top-blue-gradient"></div>
        <div class="top-red-sharp-blade"></div>
        <div class="top-white-pinstripe"></div>
      </div>
    </div>

    <div class="px-4 pt-1 flex-grow-1 d-flex flex-column overflow-hidden">
      <!-- HEADER BANNER -->
      <header class="d-flex justify-space-between align-center mb-1">
        <!-- Logo Left -->
        <div class="d-flex align-center">
          <img :src="logoMaj" alt="New Armada Logo" class="brand-logo-left" />
        </div>

        <!-- Center Title -->
        <div class="text-center flex-grow-1 px-4">
          <h1 class="text-h5 text-uppercase font-weight-black text-black tracking-wide page-main-title">
            {{ pageTitle }}
          </h1>
        </div>

        <!-- Slogan Right + Action Controls -->
        <div class="d-flex align-center gap-3">
          <!-- Control Buttons (Subtle / Hover-friendly) -->
          <div class="monitoring-controls d-flex align-center gap-1 bg-grey-lighten-4 pa-1 rounded-pill border">
            <v-btn
              icon
              size="x-small"
              variant="text"
              :color="autoRefreshEnabled ? 'success' : 'grey-darken-1'"
              @click="toggleAutoRefresh"
              :title="autoRefreshEnabled ? 'Auto Refresh Aktif (30s)' : 'Aktifkan Auto Refresh'"
            >
              <v-icon size="16">{{ autoRefreshEnabled ? 'mdi-autorenew' : 'mdi-sync-off' }}</v-icon>
            </v-btn>
            <v-btn icon size="x-small" variant="text" color="grey-darken-2" @click="loadData" title="Refresh Sekarang">
              <v-icon size="16">mdi-refresh</v-icon>
            </v-btn>
            <v-btn icon size="x-small" variant="text" color="grey-darken-2" @click="exportPNG" title="Download PNG">
              <v-icon size="16">mdi-download</v-icon>
            </v-btn>
            <v-btn icon size="x-small" variant="text" color="primary" @click="toggleFullscreen" title="Layar Penuh">
              <v-icon size="16">{{ isFullscreen ? 'mdi-fullscreen-exit' : 'mdi-fullscreen' }}</v-icon>
            </v-btn>
            <v-btn icon size="x-small" variant="text" color="error" @click="router.back()" title="Kembali">
              <v-icon size="16">mdi-arrow-left</v-icon>
            </v-btn>
          </div>

          <!-- Slogan Brand (Clean, Crisp, High Contrast on White) -->
          <div class="slogan-wrapper d-flex align-center pr-2">
            <img :src="logoSlogan" alt="Together We Are Strong" class="brand-slogan-right" />
          </div>
        </div>
      </header>

      <!-- LOADING STATE -->
      <div v-if="isLoading" class="d-flex justify-center align-center flex-grow-1 py-8">
        <v-progress-circular indeterminate color="primary" size="48"></v-progress-circular>
      </div>

      <!-- NO DATA STATE -->
      <div v-else-if="!summaryData || summaryData.length === 0" class="d-flex justify-center align-center flex-grow-1 py-8">
        <v-alert type="warning" variant="tonal" max-width="500">
          Tidak ada data simulasi untuk ditampilkan pada mode monitoring.
        </v-alert>
      </div>

      <!-- UNIFIED MONITORING CARD: CHART + TABLE IN ONE BORDERED BOX -->
      <div v-else class="unified-monitoring-card flex-grow-1 d-flex flex-column mb-1 overflow-hidden">
        <!-- Highcharts Chart -->
        <div ref="highchartContainer" class="chart-box flex-grow-1" style="min-height: 220px; height: 35vh; width: 100%;"></div>

        <!-- Aligned Synchronized Table -->
        <div class="table-wrapper overflow-x-auto custom-scrollbar flex-shrink-0">
          <div :style="tableContainerStyle" :key="tableKey" class="table-inner">
            
            <!-- HEADER ROW: MACHINE / LINE NAMES -->
            <div class="table-row d-flex font-weight-black" style="background-color: #f1f5f9 !important; border-bottom: 2px solid #0f172a !important;">
              <div 
                class="flex-shrink-0 d-flex align-center px-2 row-label-cell font-weight-black text-uppercase"
                :style="{ width: leftColW + 'px', minHeight: '24px', backgroundColor: '#f1f5f9 !important', fontSize: '11.5px', color: '#0f172a' }"
              >
                PARAMETER
              </div>
              <div class="d-flex flex-1-1 min-w-0">
                <div
                  v-for="(item, i) in summaryData"
                  :key="'head'+i"
                  class="d-flex align-center justify-center row-data-cell text-center font-weight-black"
                  :style="getColumnStyle(i)"
                  style="font-size: 12px; color: #0f172a; min-height: 24px;"
                >
                  {{ item.machine || `M${i+1}` }}
                </div>
              </div>
              <div class="flex-shrink-0 row-right-spacer" :style="{ width: rightColW + 'px', backgroundColor: '#f1f5f9 !important' }"></div>
            </div>

            <template v-for="(rowConfig, rIdx) in [
              { label: 'DOWNTIME', key: 'downtime', type: 'color', color: '#d50000' },
              { label: 'T/C', key: 'tc', type: 'color', color: '#fbc02d' },
              { label: 'DANDORI', key: 'dandori', type: 'color', color: '#00a2ff' },
              { label: 'TEIRYO', key: 'teiryo', type: 'color', color: '#800080' },
              { label: 'TEIKI', key: 'teiki', type: 'color', color: '#005db9' },
              { label: 'Hour/Day (TPT)', key: 'tpt_jam', type: 'bold' },
              { label: 'WT 1 SHIFT', key: 'wt_1_shift', type: 'dashed', color: '#000000', defaultVal: '8' },
              { label: 'WT 1 SHIFT + PJK', key: 'wt_1_shift_pjk', type: 'dashed', color: '#f44336', defaultVal: '11' },
              { label: 'WT 2 SHIFT', key: 'wt_2_shift', type: 'dashed', color: '#000000', defaultVal: '16' },
              { label: 'WT 2 SHIFT + PJK 1S', key: 'wt_2_shift_pjk1s', type: 'dashed', color: '#f44336', defaultVal: '19' },
              { label: 'WT 2 SHIFT + PJK 2S', key: 'wt_2_shift_pjk2s', type: 'dashed', color: '#f44336', defaultVal: '21' },
              { label: 'GSPH', key: 'uph', type: 'normal' },
              { label: 'W D', key: 'working_day', type: 'normal', defaultVal: '23.0' },
              { label: '∑ M/C', key: 'mc_count', type: 'normal' },
              { label: '∑ MP', key: 'mp', type: 'normal' }
            ]" :key="rIdx">
              <div class="table-row d-flex">
                <!-- Label Column (Left) -->
                <div 
                  class="flex-shrink-0 d-flex align-center px-2 row-label-cell font-weight-bold"
                  :style="{ width: leftColW + 'px', minHeight: '21px' }"
                >
                  <!-- Color Box Icon -->
                  <div
                    v-if="rowConfig.type === 'color'"
                    class="color-indicator-box mr-1"
                    :style="{ background: rowConfig.color }"
                  ></div>
                  <!-- Dashed Line Icon -->
                  <div
                    v-else-if="rowConfig.type === 'dashed'"
                    class="dashed-indicator-line mr-1"
                    :style="{ background: rowConfig.color }"
                  ></div>
                  <span class="label-text" :class="{'font-weight-black text-black': rowConfig.type === 'bold'}">
                    {{ rowConfig.label }}
                  </span>
                </div>

                <!-- Data Columns (Middle - Perfectly Synced With Chart) -->
                <div class="d-flex flex-1-1 min-w-0">
                  <div
                    v-for="(item, i) in summaryData"
                    :key="i"
                    class="d-flex align-center justify-center row-data-cell text-center"
                    :style="getColumnStyle(i)"
                    :class="{'font-weight-black text-black bg-blue-grey-lighten-5': rowConfig.key === 'tpt_jam'}"
                  >
                    <!-- TEIKI (Weld Time) -->
                    <template v-if="rowConfig.key === 'teiki'">
                      {{ getWeldTime(item).toFixed(1) }}
                    </template>
                    <!-- DOWNTIME -->
                    <template v-else-if="rowConfig.key === 'downtime'">
                      {{ toHours(item.downtime).toFixed(1) }}
                    </template>
                    <!-- T/C (Tip Change) -->
                    <template v-else-if="rowConfig.key === 'tc'">
                      {{ toHours(item.tip_change ?? item.tc).toFixed(1) }}
                    </template>
                    <!-- DANDORI -->
                    <template v-else-if="rowConfig.key === 'dandori'">
                      {{ toHours(item.dandori).toFixed(1) }}
                    </template>
                    <!-- TEIRYO -->
                    <template v-else-if="rowConfig.key === 'teiryo'">
                      {{ toHours(item.teiryo).toFixed(1) }}
                    </template>
                    <!-- TPT -->
                    <template v-else-if="rowConfig.key === 'tpt_jam'">
                      {{ Number(item.tpt_jam || item.tpt || 0).toFixed(1) }}
                    </template>
                    <!-- Shift thresholds -->
                    <template v-else-if="['wt_1_shift', 'wt_1_shift_pjk', 'wt_2_shift', 'wt_2_shift_pjk1s', 'wt_2_shift_pjk2s'].includes(rowConfig.key)">
                      {{ item[rowConfig.key] !== undefined && item[rowConfig.key] !== null ? item[rowConfig.key] : rowConfig.defaultVal }}
                    </template>
                    <!-- GSPH / UPH -->
                    <template v-else-if="rowConfig.key === 'uph'">
                      {{ Math.round(Number(item.uph || (item.tpt > 0 && item.pcs_day > 0 ? (item.pcs_day / item.tpt) : 0))) }}
                    </template>
                    <!-- Working Days -->
                    <template v-else-if="rowConfig.key === 'working_day'">
                      {{ Number(item.working_day || item.working_days || headerData?.working_days || 23).toFixed(1) }}
                    </template>
                    <!-- Machine Count (∑ M/C) -->
                    <template v-else-if="rowConfig.key === 'mc_count'">
                      {{ item.mc_count || item.machine_count || item.item || item.total_item || 1 }}
                    </template>
                    <!-- Man Power (∑ MP) -->
                    <template v-else-if="rowConfig.key === 'mp'">
                      {{ item.mp !== undefined ? item.mp : (item.item ? Math.ceil(Number(item.item) * 1.5) : 2) }}
                    </template>
                    <template v-else>
                      {{ item[rowConfig.key] || '-' }}
                    </template>
                  </div>
                </div>

                <!-- Right Spacer (Width matches right Y-Axis margin) -->
                <div class="flex-shrink-0 row-right-spacer" :style="{ width: rightColW + 'px' }"></div>
              </div>
            </template>

          </div>
        </div>
      </div>
    </div>

    <!-- BOTTOM DECORATIVE ACCENT (Sharp, Elegant Aerodynamic Red & Blue Silhouette) -->
    <div class="bottom-brand-accent position-relative overflow-hidden flex-shrink-0">
      <svg viewBox="0 0 1600 36" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-100 h-100" preserveAspectRatio="none" shape-rendering="geometricPrecision">
        <defs>
          <linearGradient id="blueWaveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#001433"/>
            <stop offset="25%" stop-color="#003580"/>
            <stop offset="60%" stop-color="#005db9"/>
            <stop offset="85%" stop-color="#0080ff"/>
            <stop offset="100%" stop-color="#002244"/>
          </linearGradient>
          <linearGradient id="redWaveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#ff1744"/>
            <stop offset="40%" stop-color="#d50000"/>
            <stop offset="80%" stop-color="#b71c1c"/>
            <stop offset="100%" stop-color="#660000"/>
          </linearGradient>
          <linearGradient id="silverAccentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="50%" stop-color="rgba(255,255,255,0.7)"/>
            <stop offset="100%" stop-color="transparent"/>
          </linearGradient>
          <filter id="waveGlow" x="-5%" y="-20%" width="110%" height="150%">
            <feDropShadow dx="0" dy="-1" stdDeviation="1.5" flood-color="#000000" flood-opacity="0.25"/>
          </filter>
        </defs>

        <!-- Base Dark Navy Shadow Flow -->
        <path d="M0 36V24C220 12 480 32 760 18C1040 6 1320 26 1600 8V36H0Z" fill="#000a1a" opacity="0.45"/>

        <!-- Deep Royal Blue Aerodynamic Velocity Wave -->
        <path d="M0 36V14C160 6 360 28 600 14C840 2 1080 24 1340 10C1450 4 1535 14 1600 20V36H0Z" fill="url(#blueWaveGrad)" filter="url(#waveGlow)"/>

        <!-- Sharp Dynamic Crimson Red Racing Blade -->
        <path d="M0 36V26C120 22 260 12 400 6C540 1 680 20 860 12C1040 6 1180 0 1360 14C1460 24 1540 30 1600 32V36H0Z" fill="url(#redWaveGrad)" filter="url(#waveGlow)"/>

        <!-- Silver / White Sharp Pinstripe Highlight Line -->
        <path d="M0 26C120 22 260 12 400 6C540 1 680 20 860 12C1040 6 1180 0 1360 14C1460 24 1540 30 1600 32" stroke="url(#silverAccentGrad)" stroke-width="1.8" stroke-linecap="round" fill="none"/>
      </svg>
    </div>
  </div>
</template>

<style scoped>
.monitoring-page {
  font-family: Arial, Helvetica, sans-serif !important;
  color: #0f172a;
  user-select: none;
  height: 100vh;
  max-height: 100vh;
  overflow: hidden;
}

.monitoring-page * {
  font-family: Arial, Helvetica, sans-serif;
}

/* TOP DYNAMIC ACCENT BAR & ATTACHED TOP WING */
.top-accent-wrapper {
  width: 100%;
  position: relative;
  flex-shrink: 0;
}

.top-accent-bar {
  height: 6px;
  width: 100%;
  background: #011b4e;
  position: relative;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
  z-index: 2;
}

.top-blue-gradient {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, #011845 0%, #004b99 50%, #0066cc 80%, #002b66 100%);
}

.top-red-sharp-blade {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 160px;
  background: linear-gradient(135deg, #ff1744 0%, #d50000 60%, #8a0000 100%);
  clip-path: polygon(25% 0%, 100% 0%, 100% 100%, 0% 100%);
}

.top-white-pinstripe {
  position: absolute;
  right: 115px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #ffffff;
  transform: skewX(-32deg);
  opacity: 0.85;
}

/* HEADER BRANDING */
.brand-logo-left {
  height: 42px;
  width: auto;
  object-fit: contain;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.08));
}

.page-main-title {
  font-family: Arial, Helvetica, sans-serif !important;
  font-size: 1.6rem !important;
  font-weight: 900 !important;
  letter-spacing: 0.8px !important;
  color: #0f172a !important;
  margin: 0 !important;
  line-height: 1.2 !important;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
}

/* SLOGAN BRAND */
.brand-slogan-right {
  height: 32px;
  width: auto;
  object-fit: contain;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.12));
}

/* MONITORING CONTROLS */
.monitoring-controls {
  opacity: 0.35;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}
.monitoring-controls:hover {
  opacity: 1;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

/* UNIFIED MAIN CARD */
.unified-monitoring-card {
  border: 2.5px solid #000000;
  border-radius: 10px;
  overflow: hidden;
  background-color: #ffffff;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  background-clip: padding-box;
  box-sizing: border-box;
}

.chart-box {
  background: #ffffff;
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
}

/* STACK LABEL BOX */
:deep(.chart-stack-box) {
  background: #ffffff !important;
  border: 1.5px solid #000000 !important;
  border-radius: 2px !important;
  padding: 1px 4px !important;
  font-weight: 800 !important;
  font-size: 11.5px !important;
  color: #000000 !important;
  font-family: Arial, Helvetica, sans-serif !important;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2) !important;
}

/* TABLE STYLING */
.table-wrapper {
  border-top: 2px solid #000000;
  border-bottom-left-radius: 8px;
  border-bottom-right-radius: 8px;
  background-color: #ffffff;
}

.table-inner {
  font-size: 12px;
  color: #000000;
  background-color: #ffffff;
  font-family: Arial, Helvetica, sans-serif !important;
  border-bottom-left-radius: 8px;
  border-bottom-right-radius: 8px;
}

.table-row {
  border-bottom: 1px solid #94a3b8;
}
.table-row:last-child {
  border-bottom: none;
}
.table-row:last-child .row-label-cell {
  border-bottom-left-radius: 8px;
}
.table-row:last-child .row-right-spacer {
  border-bottom-right-radius: 8px;
}

.row-label-cell {
  border-right: 1.5px solid #000000;
  background-color: #ffffff;
  font-size: 11.5px;
  font-weight: 700;
  color: #000000;
  white-space: nowrap;
  font-family: Arial, Helvetica, sans-serif !important;
}

.row-data-cell {
  border-right: 1px solid #cbd5e1;
  font-size: 12px;
  font-weight: 700;
  padding: 1px 3px;
  white-space: nowrap;
  color: #000000;
  font-family: Arial, Helvetica, sans-serif !important;
}
.row-data-cell:last-child {
  border-right: 1.5px solid #000000;
}

.row-right-spacer {
  background-color: #ffffff;
}

.color-indicator-box {
  width: 9px;
  height: 9px;
  border: 1px solid #334155;
  border-radius: 1px;
  flex-shrink: 0;
}

.dashed-indicator-line {
  width: 12px;
  height: 3px;
  border-radius: 1px;
  flex-shrink: 0;
}

/* SCROLLBAR */
.custom-scrollbar::-webkit-scrollbar {
  height: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #f1f5f9;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #94a3b8;
  border-radius: 3px;
}

/* BOTTOM ACCENT */
.bottom-brand-accent {
  height: 22px;
  width: 100%;
}
</style>
