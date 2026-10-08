<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useGlcSimulationStore } from '@/stores/PCD/Welding/Simulation';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import Highcharts from 'highcharts';

const page = ref({ title: 'Live Dashboard Simulation' });
const breadcrumbs = ref([
  { title: 'Welding', disabled: false, href: '#' },
  { title: 'Transaction', disabled: false, href: '#' },
  { title: 'GLC Simulation', disabled: false, href: '/Transaction/welding/glc-simulation' },
  { title: 'Live Dashboard', disabled: true, href: '#' }
]);

const store = useGlcSimulationStore();
const router = useRouter();

const isLoading = computed(() => store.liveSummaryLoading);
const summaryData = computed(() => {
  const list = store.liveSummaryData || [];
  return [...list].sort((a: any, b: any) =>
    String(a.machine || '').localeCompare(String(b.machine || ''), undefined, { numeric: true, sensitivity: 'base' })
  );
});

const wrapperRef = ref<HTMLElement | null>(null);
const highchartContainer = ref<HTMLElement | null>(null);
let hcChart: Highcharts.Chart | null = null;
const tableKey = ref(0);

// Table syncing
const categories = ref<string[]>([]);
const colWidths = ref<number[]>([]);
const leftColW = ref(150);
const rightColW = ref(75);
const chartPixelWidth = ref(0);

const isSmallScreen = ref(false);
const SMALL_BREAKPOINT = 1366;
const MIN_COLUMN_WIDTH = 50;

const checkScreenSize = () => {
  isSmallScreen.value = window.innerWidth < SMALL_BREAKPOINT;
};

const tableContainerStyle = computed(() => {
  if (isSmallScreen.value) {
    const w = leftColW.value + rightColW.value + (categories.value.length * MIN_COLUMN_WIDTH);
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

const formatNum = (num: any) => {
  if (!num) return '0';
  return Number(num).toLocaleString('id-ID');
};

const toHours = (val: any) => Number(val || 0);

const renderChart = () => {
  if (!highchartContainer.value || !summaryData.value || summaryData.value.length === 0) return;

  const data = summaryData.value;
  categories.value = data.map(d => d.machine);

  // Series
  const downtimeData = data.map(d => toHours(d.downtime));
  const dandoriData = data.map(d => toHours(d.dandori));
  const tcData = data.map(d => toHours(d.tip_change ?? d.tc));
  const teiryoData = data.map(d => toHours(d.teiryo));
  const teikiData = data.map(d => Number(d.prod_time_final > 0 ? d.prod_time_final : (d.prod_time || 0)));
  const uphData = data.map(d => Number(d.uph || (d.tpt > 0 && d.pcs_day > 0 ? (d.pcs_day / d.tpt) : 0)).toFixed(1)).map(Number);

  const series = [
    {
      name: 'DownTime',
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
      name: 'Dandori',
      data: dandoriData,
      color: '#00a2ff',
      stack: 'tpt',
      yAxis: 0
    },
    {
      name: 'Weld Time',
      data: teikiData,
      color: '#005db9',
      stack: 'tpt',
      yAxis: 0
    },
    {
      name: 'Teiryo',
      data: teiryoData,
      color: '#800080',
      stack: 'tpt',
      showInLegend: false,
      yAxis: 0
    },
    {
      name: 'UPH',
      type: 'spline',
      yAxis: 1,
      data: uphData,
      lineWidth: 0,
      marker: { enabled: false },
      showInLegend: false,
      enableMouseTracking: false
    }
  ];

  if (hcChart) {
    hcChart.destroy();
  }

  hcChart = Highcharts.chart(highchartContainer.value, {
    chart: {
      type: 'column',
      marginTop: 40,
      marginBottom: 30,
      marginLeft: leftColW.value,
      marginRight: rightColW.value,
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
    xAxis: {
      categories: categories.value,
      labels: {
        style: { fontSize: '11px', fontWeight: 'bold' }
      },
      tickWidth: 1,
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
          style: { fontWeight: 'bold', color: '#000000' }
        },
        lineWidth: 1.5,
        lineColor: '#000000',
        tickWidth: 1,
        tickColor: '#000000',
        plotLines: [
          { value: 8, color: '#1a237e', dashStyle: 'Dash', width: 2, zIndex: 5, label: { text: '8', style: { color: '#1a237e', fontWeight: 'bold' } } },
          { value: 11, color: '#f44336', dashStyle: 'Dash', width: 2, zIndex: 5, label: { text: '11', style: { color: '#f44336', fontWeight: 'bold' } } },
          { value: 16, color: '#1a237e', dashStyle: 'Dash', width: 2, zIndex: 5, label: { text: '16', style: { color: '#1a237e', fontWeight: 'bold' } } },
          { value: 19, color: '#f44336', dashStyle: 'Dash', width: 2, zIndex: 5, label: { text: '19', style: { color: '#f44336', fontWeight: 'bold' } } },
          { value: 21, color: '#f44336', dashStyle: 'Dash', width: 2, zIndex: 5, label: { text: '21', style: { color: '#f44336', fontWeight: 'bold' } } }
        ],
        stackLabels: {
          enabled: true,
          style: {
            fontWeight: 'bold',
            color: '#333333'
          },
          formatter: function() {
            return this.total ? this.total.toFixed(2) : '';
          }
        }
      },
      {
        title: { text: 'UPH (Pcs / Jam)', style: { fontWeight: 'bold', color: '#000000' } },
        labels: { format: '{value}', style: { color: '#000000', fontWeight: 'bold' } },
        opposite: true,
        showEmpty: true,
        lineWidth: 1.5,
        lineColor: '#000000',
        tickWidth: 1,
        tickColor: '#000000',
        gridLineWidth: 0
      }
    ],
    legend: { enabled: false },
    plotOptions: {
      column: {
        stacking: 'normal'
      }
    },
    series: series as any,
    credits: { enabled: false }
  });
};

onMounted(async () => {
  checkScreenSize();
  window.addEventListener('resize', checkScreenSize);
  
  await store.fetchLiveSummary();
  setTimeout(() => {
    renderChart();
  }, 100);
});

onUnmounted(() => {
  window.removeEventListener('resize', checkScreenSize);
  if (hcChart) {
    hcChart.destroy();
  }
});
</script>

<template>
  <div class="page-wrapper">
    <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7"></BaseBreadcrumb>

    <div v-if="isLoading" class="d-flex justify-center py-10">
      <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
    </div>
    
    <div v-else-if="!summaryData || summaryData.length === 0" class="d-flex justify-center py-10">
      <v-alert type="warning" variant="tonal" max-width="500">
        Tidak ada data simulasi LIVE pada bulan ini.
      </v-alert>
    </div>

    <v-card v-else class="elevation-2 rounded-lg pa-4" ref="wrapperRef">
      <div class="d-flex justify-space-between align-center mb-4">
        <div class="text-h5 text-primary font-weight-bold">
          LIVE Dashboard TPT Mesin
        </div>
        <div class="d-flex align-center gap-2">
          <v-btn color="indigo-darken-2" variant="flat" prepend-icon="mdi-monitor-dashboard" @click="router.push('/welding/monitoring')">
            Fullscreen Monitoring
          </v-btn>
          <v-btn color="secondary" variant="outlined" prepend-icon="mdi-arrow-left" @click="router.push('/Transaction/welding/glc-simulation')">
            Kembali
          </v-btn>
        </div>
      </div>
      
      <!-- Legend -->
      <div class="d-flex justify-center gap-6 mb-2">
        <div class="d-flex align-center gap-2"><div style="width: 12px; height: 12px; background: #d50000"></div> <span class="text-caption font-weight-medium">DOWNTIME</span></div>
        <div class="d-flex align-center gap-2"><div style="width: 12px; height: 12px; background: #fbc02d"></div> <span class="text-caption font-weight-medium">T/C</span></div>
        <div class="d-flex align-center gap-2"><div style="width: 12px; height: 12px; background: #00a2ff"></div> <span class="text-caption font-weight-medium">DANDORI</span></div>
        <div class="d-flex align-center gap-2"><div style="width: 12px; height: 12px; background: #800080"></div> <span class="text-caption font-weight-medium">TEIRYO</span></div>
        <div class="d-flex align-center gap-2"><div style="width: 12px; height: 12px; background: #005db9"></div> <span class="text-caption font-weight-medium">WELD TIME</span></div>
      </div>

      <!-- Chart Container -->
      <div ref="highchartContainer" style="height: 400px; width: 100%;"></div>

      <!-- Data Table Aligned -->
      <div
        v-if="colWidths.length > 0"
        class="mt-1 w-100 overflow-x-auto custom-scrollbar pb-2"
        ref="tableScrollContainer"
      >
        <div :style="tableContainerStyle" class="overflow-hidden border rounded border-grey-lighten-2 text-caption">
          
          <template v-for="(rowConfig, rIdx) in [
            { label: 'DOWNTIME (Jam)', key: 'downtime' },
            { label: 'T/C (Jam)', key: 'tc' },
            { label: 'DANDORI (Jam)', key: 'dandori' },
            { label: 'TEIRYO (Jam)', key: 'teiryo' },
            { label: 'WELD TIME (Jam)', key: 'teiki' },
            { label: 'Hour/Day (TPT)', key: 'tpt_jam' },
            { label: 'UPH', key: 'uph' },
            { label: 'WT 1 SHIFT', key: 'wt_1_shift' },
            { label: 'WT 1 SHIFT + PJK', key: 'wt_1_shift_pjk' },
            { label: 'WT 2 SHIFT', key: 'wt_2_shift' },
            { label: 'WT 2 SHIFT + PJK 1S', key: 'wt_2_shift_pjk1s' },
            { label: 'WT 2 SHIFT + PJK 2S', key: 'wt_2_shift_pjk2s' },
            { label: 'WORKING DAY', key: 'working_day' },
            { label: 'MP', key: 'mp' },
            { label: 'JUMLAH ITEM', key: 'item' }
          ]" :key="rIdx">
            <div class="d-flex border-b border-grey-lighten-2 hover-bg-grey">
              <!-- Label Column -->
              <div 
                class="flex-shrink-0 d-flex align-center px-2 border-r border-grey-lighten-2 font-weight-bold"
                :style="{ width: leftColW + 'px', minHeight: '26px' }"
              >
                <div v-if="rowConfig.key === 'downtime'" style="width: 8px; height: 8px; background: #d50000; margin-right: 4px;"></div>
                <div v-else-if="rowConfig.key === 'tc'" style="width: 8px; height: 8px; background: #fbc02d; margin-right: 4px;"></div>
                <div v-else-if="rowConfig.key === 'dandori'" style="width: 8px; height: 8px; background: #00a2ff; margin-right: 4px;"></div>
                <div v-else-if="rowConfig.key === 'teiki'" style="width: 8px; height: 8px; background: #005db9; margin-right: 4px;"></div>
                <div v-else-if="rowConfig.key === 'teiryo'" style="width: 8px; height: 8px; background: #800080; margin-right: 4px;"></div>
                <div v-else-if="['wt_1_shift', 'wt_2_shift'].includes(rowConfig.key)" style="width: 14px; height: 3px; background: #1a237e; margin-right: 6px; border-radius: 1px; flex-shrink: 0;"></div>
                <div v-else-if="['wt_1_shift_pjk', 'wt_2_shift_pjk1s', 'wt_2_shift_pjk2s'].includes(rowConfig.key)" style="width: 14px; height: 3px; background: #f44336; margin-right: 6px; border-radius: 1px; flex-shrink: 0;"></div>
                {{ rowConfig.label }}
              </div>
              
              <!-- Data Columns -->
              <div class="d-flex flex-1-1 min-w-0">
                <div
                  v-for="(item, i) in summaryData"
                  :key="i"
                  class="d-flex align-center justify-center border-r border-grey-lighten-2 overflow-hidden"
                  :style="getColumnStyle(i)"
                  :class="{'font-weight-bold': rowConfig.key === 'tpt_jam'}"
                >
                  <template v-if="rowConfig.key === 'teiki'">
                    {{ Number(item.prod_time_final > 0 ? item.prod_time_final : (item.prod_time || 0)).toFixed(2) }}
                  </template>
                  <template v-else-if="rowConfig.key === 'downtime'">
                    {{ toHours(item.downtime).toFixed(2) }}
                  </template>
                  <template v-else-if="rowConfig.key === 'tc'">
                    {{ toHours(item.tip_change ?? item.tc).toFixed(2) }}
                  </template>
                  <template v-else-if="rowConfig.key === 'dandori'">
                    {{ toHours(item.dandori).toFixed(2) }}
                  </template>
                  <template v-else-if="rowConfig.key === 'teiryo'">
                    {{ toHours(item.teiryo).toFixed(2) }}
                  </template>
                  <template v-else-if="rowConfig.key === 'tpt_jam'">
                    {{ Number(item.tpt_jam || item.tpt || 0).toFixed(1) }}
                  </template>
                  <template v-else-if="['wt_1_shift', 'wt_1_shift_pjk', 'wt_2_shift', 'wt_2_shift_pjk1s', 'wt_2_shift_pjk2s'].includes(rowConfig.key)">
                    {{ item[rowConfig.key] !== undefined && item[rowConfig.key] !== null ? item[rowConfig.key] : '-' }}
                  </template>
                  <template v-else-if="rowConfig.key === 'working_day'">
                    {{ item.working_day !== undefined ? item.working_day : '-' }}
                  </template>
                  <template v-else-if="rowConfig.key === 'mp'">
                    {{ item.mp !== undefined ? item.mp : '-' }}
                  </template>
                  <template v-else-if="rowConfig.key === 'item'">
                    {{ item.item !== undefined ? item.item : '-' }}
                  </template>
                  <template v-else-if="rowConfig.key === 'uph'">
                    {{ Math.round(Number(item.uph || 0)).toLocaleString('id-ID') }}
                  </template>
                  <template v-else>
                    {{ formatNum(item[rowConfig.key]) }}
                  </template>
                </div>
              </div>

              <!-- Right Spacer -->
              <div class="flex-shrink-0" :style="{ width: rightColW + 'px' }"></div>
            </div>
          </template>

        </div>
      </div>
    </v-card>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  height: 8px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
.hover-bg-grey:hover {
  background-color: #f5f5f5;
}
</style>
