<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, watch } from 'vue';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import VueApexCharts from 'vue3-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { storeToRefs } from 'pinia';
import { useUtilityStore } from '@/stores/utility';
import { useWeeklyAchievmentStamping } from '@/stores/PCD/Stamping/WeeklyAchievement';
import 'flowbite';
import { initFlowbite } from 'flowbite';
import DateRangePickerSplitButton from '@/components/date/DateRangePickerSplitButton.vue';
import DatePickerButton from '@/components/date/DatePickerButton.vue';
import TableBasic from '@/components/table/TableBasic.vue';
import type { TableColumn } from '@/components/table/TableBasic.vue';
import TableExcel from '@/components/table/TableExcel.vue';
import * as XLSX from 'xlsx';

const page = ref({ title: 'Weekly Achievement (Stamping)' });
const breadcrumbs = shallowRef([
  { title: 'PCD', disabled: false, href: '#' },
  { title: 'Stamping', disabled: false, href: '#' },
  { title: 'Weekly Achievement', disabled: true, href: '#' }
]);

const weeklyStore = useWeeklyAchievmentStamping();
const { allData, params, rangeDate } = storeToRefs(weeklyStore);
const utilityStore = useUtilityStore();

onMounted(async () => {
  initFlowbite();
  params.value.cutoff = '';
  await weeklyStore.fetchAllData(params.value.start, params.value.end, params.value.cutoff);
});

let cutoffSetByEnd = false;

watch(
  () => params.value.start,
  async (newStart, oldStart) => {
    if (newStart !== oldStart) {
      await weeklyStore.fetchAllData(params.value.start, params.value.end, params.value.cutoff);
    }
  }
);

watch(
  () => params.value.end,
  async (newEnd, oldEnd) => {
    if (newEnd !== oldEnd && newEnd) {
      cutoffSetByEnd = true;
      params.value.cutoff = newEnd;
      await weeklyStore.fetchAllData(params.value.start, params.value.end, params.value.cutoff);
    }
  }
);

watch(
  () => params.value.cutoff,
  async (newCutoff, oldCutoff) => {
    if (cutoffSetByEnd) {
      cutoffSetByEnd = false;
      return;
    }
    if (newCutoff !== oldCutoff) {
      await weeklyStore.fetchAllData(params.value.start, params.value.end, params.value.cutoff);
    }
  }
);

const changeLine = async () => {
  await weeklyStore.fetchAllData(params.value.start, params.value.end, params.value.cutoff);
};

// ── Bottom Table ────────────────────────────────────────────────────
const bottomTableColumns = computed<TableColumn[]>(() => [
  { key: 'line_id', label: 'Line' },
  { key: 'shift', label: 'Shift', align: 'center' },
  { key: 'part_number', label: 'Part Number' },
  { key: 'job_number', label: 'Job Number' },
  { key: 'status', label: 'Status', align: 'center' },
  { key: 'plan', label: 'Plan', align: 'right' },
  { key: 'actual', label: 'Actual', align: 'right' },
  { key: 'diff', label: 'Diff', align: 'right' },
  { key: 'achv', label: 'Achv', align: 'center' },
  ...rangeDate.value.flatMap((date, i) => [
    { key: `d${i}_plan`, label: `${utilityStore.dateMonth(date)} - Plan`, align: 'right' as const, filterable: false, sortable: false },
    { key: `d${i}_act`, label: `${utilityStore.dateMonth(date)} - Act`, align: 'right' as const, filterable: false, sortable: false },
    { key: `d${i}_achv`, label: `${utilityStore.dateMonth(date)} - Achv`, align: 'center' as const, filterable: false, sortable: false }
  ])
]);

const bottomTableData = computed(() => {
  const selectedLine = params.value.line ? String(params.value.line).trim().toLowerCase() : '';
  const isAllLine = !selectedLine || selectedLine === 'all' || selectedLine === 'semua line' || selectedLine.includes('pilih');
  const selectedShift = params.value.shift;

  // 1. Filter baris data berdasarkan Line dan Shift
  let detailList = (allData.value?.detail || []).filter((item) => {
    // Filter Line (substring / contains check)
    if (!isAllLine) {
      const itemLine = String(item.line_id || '').trim().toLowerCase();
      if (!itemLine.includes(selectedLine) && !selectedLine.includes(itemLine)) {
        return false;
      }
    }
    // Filter Shift
    if (selectedShift !== null && selectedShift !== undefined && String(selectedShift) !== '') {
      if (item.shift !== undefined && item.shift !== null && Number(item.shift) !== Number(selectedShift)) {
        return false;
      }
    }
    return true;
  });

  // 2. Sorting prioritas Shift berdasarkan jam saat ini (07:15 - 20:00 => Shift 1 di atas, selain itu Shift 2 di atas)
  const currentShiftPriority = utilityStore.getCurrentShift().shift;
  detailList = [...detailList].sort((a, b) => {
    const shiftA = Number(a.shift) || 0;
    const shiftB = Number(b.shift) || 0;

    const rankA = shiftA === currentShiftPriority ? 1 : shiftA === 0 ? 3 : 2;
    const rankB = shiftB === currentShiftPriority ? 1 : shiftB === 0 ? 3 : 2;

    if (rankA !== rankB) {
      return rankA - rankB;
    }
    return 0;
  });

  // 3. Mapping data ke format tabel (hanya angka shift)
  return detailList.map((value) => {
    const shiftVal =
      value.shift !== undefined && value.shift !== null && String(value.shift).trim() !== ''
        ? String(value.shift).trim()
        : '-';

    const statusVal =
      value.status !== undefined && value.status !== null && String(value.status).trim() !== ''
        ? String(value.status).trim().toUpperCase()
        : '-';

    const row: Record<string, unknown> = {
      line_id: value.line_id ? String(value.line_id).trim() : '-',
      shift: shiftVal,
      part_number: value.part_number ? String(value.part_number).trim() : '-',
      job_number: value.job_number && String(value.job_number).trim() !== '' ? String(value.job_number).trim() : '-',
      status: statusVal,
      plan: utilityStore.formatNumber(value.plan),
      actual: utilityStore.formatNumber(value.actual),
      diff: utilityStore.formatNumber(value.plan - value.actual),
      achv: value.plan != 0 ? `${utilityStore.formatPercentOneZero((value.actual / value.plan) * 100)}%` : '0.0%'
    };
    (value as any).daily.forEach((item: any, i: number) => {
      row[`d${i}_plan`] = utilityStore.formatNumber(item.plan);
      row[`d${i}_act`] = utilityStore.formatNumber(item.actual);
      row[`d${i}_achv`] = item.plan != 0 ? `${utilityStore.formatPercentOneZero((item.actual / item.plan) * 100)}%` : '0.0%';
    });
    return row;
  });
});

const tableExcelRef = ref<InstanceType<typeof TableExcel> | null>(null);

function exportBottomTableToExcel() {
  const sourceData = tableExcelRef.value?.getVisibleRows() ?? bottomTableData.value;
  const rows = sourceData.map((row: any) => {
    const out: Record<string, unknown> = {};
    for (const col of bottomTableColumns.value) {
      out[col.label] = row[col.key] ?? '-';
    }
    return out;
  });
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Weekly Achievement');
  XLSX.writeFile(workbook, `Weekly_Achievement_Stamping_${params.value.start}_${params.value.end}.xlsx`);
}

// ── Left Table ──────────────────────────────────────────────────────
const leftTableColumns = computed<TableColumn[]>(() => [
  { key: 'date', label: 'Tanggal' },
  { key: 'plan', label: 'Plan', align: 'right' },
  { key: 'actual', label: 'Act', align: 'right' },
  { key: 'pct', label: '%', align: 'center' },
  { key: 'cumm_plan', label: 'Cumm Plan', align: 'right' },
  { key: 'cumm_act', label: 'Cumm Act', align: 'right' },
  { key: 'cumm_pct', label: 'Cumm %', align: 'center' }
]);

const leftTableData = computed(() =>
  allData.value.summary.map((value: any) => ({
    date: utilityStore.dateMonth(value.date),
    plan: utilityStore.formatNumber(value.plan),
    actual: utilityStore.formatNumber(value.actual),
    pct: `${value.pct}%`,
    cumm_plan: utilityStore.formatNumber(value.cumm_plan),
    cumm_act: utilityStore.formatNumber(value.cumm_act),
    cumm_pct: `${value.cumm_pct}%`
  }))
);

// ── Right Table ─────────────────────────────────────────────────────
const rightTableColumns = computed<TableColumn[]>(() => [
  { key: 'line', label: 'Line' },
  { key: 'plan', label: 'Plan', align: 'right' },
  { key: 'actual', label: 'Act', align: 'right' },
  { key: 'pct', label: '%', align: 'center' }
]);

const rightTableData = computed(() =>
  allData.value.summary_line.map((value: any) => ({
    line: value.line,
    plan: utilityStore.formatNumber(value.plan),
    actual: utilityStore.formatNumber(value.actual),
    pct: `${value.pct}%`
  }))
);

// ── Left Chart ──────────────────────────────────────────────────────
const categories = computed(() => allData.value.summary.map((e) => utilityStore.dateMonth(e.date)));
const planSeries = computed(() => allData.value.summary.map((e) => e.plan));
const actualSeries = computed(() => allData.value.summary.map((e) => e.actual));
const cummPlanSeries = computed(() => allData.value.summary.map((e) => e.cumm_plan));
const cummActSeries = computed(() => allData.value.summary.map((e) => e.cumm_act));

const chartSeries = computed(() => [
  { name: 'Qty Planning', type: 'column', data: planSeries.value },
  { name: 'Qty Actual', type: 'column', data: actualSeries.value },
  { name: 'Akumulasi Plan', type: 'area', data: cummPlanSeries.value },
  { name: 'Akumulasi Actual', type: 'line', data: cummActSeries.value }
]);

const chartOptions = computed<ApexOptions>(() => ({
  chart: { type: 'line', height: 260, toolbar: { show: false } },
  stroke: { width: [0, 0, 4, 6], curve: 'smooth' },
  fill: {
    type: ['solid', 'solid', 'gradient', 'solid'],
    opacity: [1, 1, 0.1, 1],
    gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.25, stops: [0, 90, 100] },
    colors: [
      '#1E88E5',
      ({ dataPointIndex }: { dataPointIndex: number }) => {
        const plan = planSeries.value[dataPointIndex];
        const actual = actualSeries.value[dataPointIndex];
        if (actual === plan) return '#00E396';
        if (actual > plan) return '#FEB019';
        return '#ff698a';
      },
      '#00E396',
      '#FEB019'
    ]
  },
  markers: { size: [0, 0, 0, 0] },
  plotOptions: { bar: { columnWidth: '80%', borderRadius: 3, borderRadiusApplication: 'end' } },
  dataLabels: { enabled: false },
  colors: [
    '#1E88E5',
    ({ dataPointIndex }: { dataPointIndex: number }) => {
      const plan = planSeries.value[dataPointIndex];
      const actual = actualSeries.value[dataPointIndex];
      if (actual === plan) return '#00E396';
      if (actual > plan) return '#FEB019';
      return '#ff698a';
    },
    '#00E396',
    '#FEB019'
  ],
  xaxis: {
    categories: categories.value,
    title: { text: 'Tanggal Produksi', style: { fontSize: '11px', fontFamily: 'Poppins' } },
    labels: { style: { fontSize: '10px', fontFamily: 'Poppins' } }
  },
  yaxis: [
    {
      seriesName: ['Qty Planning', 'Qty Actual'],
      title: { text: 'Jumlah Produksi', style: { fontSize: '11px', fontFamily: 'Poppins' } },
      axisTicks: { show: true },
      axisBorder: { show: true },
      labels: {
        style: { fontSize: '10px', fontFamily: 'Poppins' },
        formatter: (val) => (Math.abs(val) >= 1000 ? `${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}K` : val.toString())
      }
    },
    {
      opposite: true,
      title: { text: 'Akumulasi Produksi', style: { fontSize: '11px', fontFamily: 'Poppins' } },
      labels: {
        style: { fontSize: '10px', fontFamily: 'Poppins' },
        formatter: (val) => (Math.abs(val) >= 1000 ? `${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}K` : val.toString())
      }
    }
  ],
  tooltip: { shared: true, intersect: false },
  legend: { show: false, position: 'top', horizontalAlign: 'center', floating: false, itemMargin: { horizontal: 10, vertical: 0 } }
}));

// ── Right Chart ─────────────────────────────────────────────────────
const categories_line = computed(() => allData.value.summary_line.map((e) => e.line));
const planSeries_line = computed(() => allData.value.summary_line.map((e) => e.plan));
const actualSeries_line = computed(() => allData.value.summary_line.map((e) => e.actual));
const pctSeries_line = computed(() => allData.value.summary_line.map((e) => e.pct));

const chartSeries_line = computed(() => [
  { name: 'Qty Planning', type: 'column', data: planSeries_line.value },
  { name: 'Qty Actual', type: 'column', data: actualSeries_line.value },
  { name: 'Percentage', type: 'scatter', data: pctSeries_line.value }
]);

const chartOptions_line = computed<ApexOptions>(() => ({
  chart: { type: 'line', height: 260, stacked: false, toolbar: { show: false } },
  stroke: { width: [0, 0, 4], curve: 'smooth' },
  fill: {
    type: ['solid', 'solid', 'solid'],
    opacity: [1, 1, 1],
    gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.25, stops: [0, 90, 100] },
    colors: [
      '#1E88E5',
      ({ dataPointIndex }: { dataPointIndex: number }) => {
        const plan = planSeries_line.value[dataPointIndex];
        const actual = actualSeries_line.value[dataPointIndex];
        if (actual === plan) return '#00E396';
        if (actual > plan) return '#FEB019';
        return '#ff698a';
      },
      '#00E396',
      '#FEB019'
    ]
  },
  markers: { size: [0, 0, 6], strokeWidth: 2 },
  plotOptions: { bar: { columnWidth: '80%', borderRadius: 4, borderRadiusApplication: 'end' } },
  dataLabels: {
    enabled: true,
    enabledOnSeries: [2],
    formatter: (val) => `${val}%`,
    style: { fontSize: '10px', colors: ['#787f88'], fontFamily: 'Poppins' },
    background: { enabled: true, borderRadius: 4, padding: 2 },
    offsetY: -8,
    offsetX: 0
  },
  colors: [
    '#1E88E5',
    ({ dataPointIndex }: { dataPointIndex: number }) => {
      const plan = planSeries_line.value[dataPointIndex];
      const actual = actualSeries_line.value[dataPointIndex];
      if (actual === plan) return '#00E396';
      if (actual > plan) return '#FEB019';
      return '#ff698a';
    },
    '#00E396',
    '#FEB019'
  ],
  xaxis: {
    categories: categories_line.value,
    tickPlacement: 'on',
    labels: { hideOverlappingLabels: false, trim: false, style: { fontSize: '10px', fontFamily: 'Poppins' } },
    title: { text: 'Line', style: { fontSize: '11px', fontFamily: 'Poppins' } }
  },
  grid: { padding: { left: 0, right: 0 } },
  yaxis: [
    {
      seriesName: ['Qty Planning', 'Qty Actual'],
      title: { text: 'Jumlah Produksi', style: { fontSize: '11px', fontFamily: 'Poppins' } },
      axisTicks: { show: true },
      axisBorder: { show: true },
      labels: {
        style: { fontSize: '10px' },
        formatter: (val) => (Math.abs(val) >= 1000 ? `${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}K` : val.toString())
      }
    },
    {
      opposite: true,
      seriesName: 'Percentage',
      min: 0,
      max: 100,
      tickAmount: 5,
      title: { text: 'Achieve (%)', style: { fontSize: '11px', fontFamily: 'Poppins' } },
      labels: { style: { fontSize: '10px', fontFamily: 'Poppins' }, formatter: (val) => `${val}%` },
      axisTicks: { show: true },
      axisBorder: { show: true }
    }
  ],
  tooltip: { shared: true, intersect: false },
  legend: { show: false, position: 'top', horizontalAlign: 'center', floating: false, itemMargin: { horizontal: 10, vertical: 0 } }
}));
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7"></BaseBreadcrumb>
  <div class="flex flex-col gap-5">
    <!-- Button -->
    <div class="flex gap-6 flex-wrap">
      <!-- Date Range -->
      <DateRangePickerSplitButton v-model:start="params.start" v-model:end="params.end" />

      <!-- Line -->
      <div class="">
        <select
          v-model="params.line"
          @change="changeLine()"
          class="bg-gray-50 border-custom border-gray-300 text-gray-900 text-sm rounded-full focus:ring-blue-500 focus:border-blue-500 block px-5 py-2.5 pr-9"
        >
          <option selected disabled>Pilih line</option>
          <option value="All">Semua line</option>
          <option v-for="value in allData.summary_line" :value="value.line">{{ value.line }}</option>
        </select>
      </div>

      <!-- Shift -->
      <div class="">
        <select
          v-model="params.shift"
          @change="changeLine()"
          class="bg-gray-50 border-custom border-gray-300 text-gray-900 text-sm rounded-full focus:ring-blue-500 focus:border-blue-500 block px-5 py-2.5 pr-9"
        >
          <option :value="null">Semua Shift</option>
          <option :value="1">Shift 1</option>
          <option :value="2">Shift 2</option>
        </select>
      </div>

      <!-- CUT OFF -->
      <DatePickerButton v-model="params.cutoff" label="Cut Off" />
    </div>

    <div class="flex justify-center gap-5">
      <div class="flex flex-col w-full max-w-1/2 bg-white rounded-2xl shadow pt-5">
        <!-- Left Chart -->
        <div>
          <h1 class="text-center font-semibold text-gray-600 text-base mb-2">
            Achievement Stamping {{ params.line == 'All' ? params.line + ' Line' : 'Line ' + params.line }} 
            {{ params.shift ? `- Shift ${params.shift}` : '' }}
          </h1>
          <VueApexCharts type="line" height="260" :options="chartOptions" :series="chartSeries" />
        </div>

        <!-- Left Table -->
        <div class="relative p-5 pt-0">
          <TableBasic :columns="leftTableColumns" :data="leftTableData" hide-toolbar hide-pagination :initial-items-per-page="1000">
            <template #cell-pct="{ row }">
              <span
                :class="
                  parseInt(String(row.pct)) > 100
                    ? 'text-yellow-500 font-semibold'
                    : parseInt(String(row.pct)) < 100
                      ? 'text-red-500 font-semibold'
                      : 'text-green-500 font-semibold'
                "
              >
                {{ row.pct }}
              </span>
            </template>
            <template #cell-cumm_pct="{ row }">
              <span
                :class="
                  parseInt(String(row.cumm_pct)) > 100
                    ? 'text-yellow-500 font-semibold'
                    : parseInt(String(row.cumm_pct)) < 100
                      ? 'text-red-500 font-semibold'
                      : 'text-green-500 font-semibold'
                "
              >
                {{ row.cumm_pct }}
              </span>
            </template>
          </TableBasic>
        </div>
      </div>

      <div class="w-full bg-white rounded-2xl shadow pt-5">
        <!-- Right Chart -->
        <div>
          <h1 class="text-center font-semibold text-gray-600 text-base mb-2">
            Achievement Stamping ({{ utilityStore.dateMonth(params.start) }} - {{ utilityStore.dateMonth(params.end) }})
            {{ params.shift ? `Shift ${params.shift}` : '' }}
          </h1>
          <VueApexCharts type="line" height="260" :options="chartOptions_line" :series="chartSeries_line" />
        </div>

        <!-- Right Table -->
        <div class="relative p-5 pt-0">
          <TableBasic :columns="rightTableColumns" :data="rightTableData" hide-toolbar hide-pagination :initial-items-per-page="1000">
            <template #cell-pct="{ row }">
              <span
                :class="
                  parseInt(String(row.pct)) > 100
                    ? 'text-yellow-500 font-semibold'
                    : parseInt(String(row.pct)) < 100
                      ? 'text-red-500 font-semibold'
                      : 'text-green-500 font-semibold'
                "
              >
                {{ row.pct }}
              </span>
            </template>
          </TableBasic>
        </div>
      </div>
    </div>

    <!-- Bottom Table -->
    <div class="shadow-md sm:rounded-2xl bg-white p-5">
      <TableExcel ref="tableExcelRef" :columns="bottomTableColumns" :data="bottomTableData" :initial-items-per-page="25">
        <template #header-actions>
          <button
            type="button"
            @click="exportBottomTableToExcel"
            class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg"
          >
            <i class="mdi mdi-file-excel-outline" />
            Export Excel
          </button>
        </template>
        <template #cell-achv="{ row }">
          <span
            :class="
              parseFloat(String(row.achv)) > 100
                ? 'text-blue-500 font-semibold'
                : parseFloat(String(row.achv)) < 100
                  ? 'text-red-500 font-semibold'
                  : 'text-green-500 font-semibold'
            "
          >
            {{ row.achv }}
          </span>
        </template>
      </TableExcel>
    </div>
  </div>
</template>

<style>
.border-custom {
  border: 1px solid #e5e7eb !important;
}
.border-table {
  border: 1px solid #e5e7eb !important;
}

/* Flowbite Datepicker Custom Styles */
.datepicker-cell.selected,
.datepicker-cell.selected:hover {
  background-color: #3b82f6 !important;
  color: white !important;
  font-weight: 600;
}

.datepicker-cell.today {
  background-color: #dbeafe;
  font-weight: 600;
}

.datepicker-cell.today.selected {
  background-color: #3b82f6 !important;
  color: white !important;
}

.datepicker-cell:hover {
  background-color: #f3f4f6;
}

.datepicker-cell.focused:not(.selected) {
  background-color: #e5e7eb;
}

.datepicker-cell {
  border-radius: 0.375rem;
  margin: 0.5px;
}
</style>
