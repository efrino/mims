<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { EyeOutlined } from '@ant-design/icons-vue';
import TableExcel, { type TableColumn } from '@/components/table/TableExcel.vue';
import { useWeldingAchievementReportStore } from '@/stores/Welding/Report/Achievement';
import { storeToRefs } from 'pinia';
import { useUtilityStore } from '@/stores/utility';
import VueApexCharts from "vue3-apexcharts";
import DateRangePickerSplitButton from '@/components/date/DateRangePickerSplitButton.vue';

const page = ref({ title: 'Report Achievement Kanban Welding' });
const breadcrumbs = shallowRef([
  { title: 'Welding', disabled: false, href: '#' },
  { title: 'Report', disabled: false, href: '#' },
  { title: 'Achievement Kanban', disabled: true, href: '#' },
]);

const achievementStore = useWeldingAchievementReportStore();
const { achievementKanbanData, filterDate } = storeToRefs(achievementStore);
const utilityStore = useUtilityStore();

// ─── Date helpers ──────────────────────────────────────────────────────────────
const formatDate = (d: Date) =>
  [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');

const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
  .toISOString()
  .substring(0, 10);

const dates = ref<[string, string]>([today, '']);

// ─── Load Data ─────────────────────────────────────────────────────────────────
const onLoadData = () => {
  filterDate.value.start = dates.value[0];
  filterDate.value.end   = dates.value[1] || dates.value[0];
  achievementStore.fetchAchievementReportKbn();
  achievementStore.fetchIncompleteKanban();
  achievementStore.dashboardAchKanban();
};

// ─── Modal ─────────────────────────────────────────────────────────────────────
const handleCloseModal = () => {
  achievementKanbanData.value.showModal = false;
};

// ─── Dashboard cards ───────────────────────────────────────────────────────────
const safePercent = (val?: number | string) =>
  Math.min(100, Math.max(0, Math.round(Number(val) || 0)));

const remaining = (val?: number | string) => 100 - safePercent(val);

const dailyPercentage   = computed(() => safePercent(achievementKanbanData.value.dashboard[0]?.percentage));
const weeklyPercentage  = computed(() => safePercent(achievementKanbanData.value.dashboard[1]?.percentage));
const monthlyPercentage = computed(() => safePercent(achievementKanbanData.value.dashboard[2]?.percentage));

// ─── Table columns (adapted from previous tableHeaders def) ───────────────────
const tableHeaders: TableColumn[] = [
  { key: 'MATNR', label: 'Part Number', align: 'center' },
  { key: 'line_id', label: 'Line', align: 'center' },
  { key: 'ZQTY_LKH', label: 'LKH', align: 'center' },
  { key: 'ZQTY_SAP', label: 'SAP', align: 'center' },
  { key: 'GAP', label: 'GAP', align: 'center' },
];

const incompleteHeaders: TableColumn[] = [
  { key: 'part_number', label: 'Part Number', align: 'center' },
  { key: 'line_id', label: 'Line', align: 'center' },
  { key: 'gap', label: 'GAP', align: 'center' },
];

// ─── Chart ─────────────────────────────────────────────────────────────────────
const chartSeries = computed(() => [
  { name: 'LKH', data: [Number(achievementKanbanData.value.chart?.act_lkh ?? 0)] },
  { name: 'SAP', data: [Number(achievementKanbanData.value.chart?.act_sap ?? 0)] },
]);

const chartOptions = computed(() => ({
  chart: { type: 'bar', height: 280, toolbar: { show: false } },
  plotOptions: {
    bar: { horizontal: false, columnWidth: '45%', borderRadius: 8, borderRadiusApplication: 'end' },
  },
  xaxis: {
    categories: ['LKH vs SAP'],
    tickPlacement: 'between',
    axisBorder: { show: true },
    axisTicks: { show: false },
    labels: { style: { fontSize: '12px', colors: '#6b7280' } },
  },
  yaxis: {
    axisBorder: { show: true },
    labels: { style: { fontSize: '12px', colors: '#6b7280' } },
  },
  grid: { borderColor: '#e5e7eb', strokeDashArray: 4, yaxis: { lines: { show: true } } },
  colors: ['#00d89e', '#A855F7'],
  dataLabels: {
    enabled: true,
    offsetY: -8,
    style: { fontSize: '12px', fontWeight: 600, colors: ['#374151'] },
    formatter: (val: number) => val.toLocaleString('id-ID'),
  },
  legend: {
    position: 'top',
    horizontalAlign: 'right',
    markers: { radius: 4 },
    labels: { colors: '#374151' },
  },
  tooltip: { y: { formatter: (val: number) => val.toLocaleString('id-ID') } },
}));
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7" />

  <!-- ── Dashboard Cards ─────────────────────────────────────────────────── -->
  <div class="flex gap-4 mb-4">
    <!-- Daily -->
    <div class="flex-[2] rounded-xl bg-white shadow-sm border border-gray-200 p-4">
      <h2 class="text-center text-lg font-semibold text-gray-600 mb-2">Daily Target</h2>
      <div class="text-center text-3xl font-bold text-blue-500 mb-1">
        {{ dailyPercentage }}%
      </div>
      <p class="text-end text-xs text-gray-400 mb-3">of 100% target</p>
      <p class="text-end text-sm font-bold text-blue-500 mb-3">
        {{ remaining(dailyPercentage) }}% Remaining
      </p>
      <div class="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div class="h-3 bg-blue-500 rounded-full transition-all" :style="{ width: dailyPercentage + '%' }" />
      </div>
    </div>

    <!-- Weekly -->
    <div class="flex-[2] rounded-xl bg-white shadow-sm border border-gray-200 p-4">
      <h2 class="text-center text-lg font-semibold text-gray-600 mb-2">Weekly Target</h2>
      <div class="text-center text-3xl font-bold text-green-500 mb-1">
        {{ weeklyPercentage }}%
      </div>
      <p class="text-end text-xs text-gray-400 mb-3">of 100% target</p>
      <p class="text-end text-sm font-bold text-green-500 mb-3">
        {{ remaining(weeklyPercentage) }}% Remaining
      </p>
      <div class="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div class="h-3 bg-green-500 rounded-full transition-all" :style="{ width: weeklyPercentage + '%' }" />
      </div>
    </div>

    <!-- Monthly -->
    <div class="flex-[2] rounded-xl bg-white shadow-sm border border-gray-200 p-4">
      <h2 class="text-center text-lg font-semibold text-gray-600 mb-2">Monthly Target</h2>
      <div class="text-center text-3xl font-bold text-purple-500 mb-1">
        {{ monthlyPercentage }}%
      </div>
      <p class="text-end text-xs text-gray-400 mb-3">of 100% target</p>
      <p class="text-end text-sm font-bold text-purple-500 mb-3">
        {{ remaining(monthlyPercentage) }}% Remaining
      </p>
      <div class="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div class="h-3 bg-purple-500 rounded-full transition-all" :style="{ width: monthlyPercentage + '%' }" />
      </div>
    </div>
  </div>

  <!-- ── Main Content ────────────────────────────────────────────────────── -->
  <div class="flex gap-4 items-start">

    <!-- Achievement Kanban Card -->
    <div class="flex-[3] self-start rounded-xl bg-white shadow-sm border border-gray-200">

      <!-- Header: title + date filter + load data -->
      <div class="px-6 py-4 border-b border-gray-200">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2 class="text-4xl font-semibold text-gray-700">Achievement Kanban</h2>

          <div class="flex flex-wrap items-center gap-2">
            <DateRangePickerSplitButton v-model:start="dates[0]" v-model:end="dates[1]" />

            <!-- Load Data Button -->
            <button
              type="button"
              @click="onLoadData"
              class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white
                     bg-blue-600 hover:bg-blue-700 rounded-full focus:outline-none focus:ring-2
                     focus:ring-blue-300 transition-all"
            >
              Load Data
            </button>
          </div>
        </div>
      </div>

      <!-- Spacer toolbar row -->
      <div class="px-6 py-3 border-b border-gray-100" />

      <!-- Table -->
      <div class="relative px-6 py-4">
        <TableExcel :columns="tableHeaders" :data="(achievementKanbanData.dataTable as unknown as Record<string, unknown>[])">
          <template #cell-MATNR="{ value }">
            <span class="font-medium text-gray-700">{{ value }}</span>
          </template>

          <template #cell-ZQTY_SAP="{ value }">
            {{ value ?? 0 }}
          </template>

          <template #cell-GAP="{ row, value }">
            <span
              class="font-semibold"
              :class="
                parseInt(row.ZQTY_LKH as string) > 0 &&
                parseInt(row.ZQTY_SAP as string) - parseInt(row.ZQTY_LKH as string) !== 0
                  ? 'text-red-600'
                  : 'text-green-600'
              "
            >
              {{ value }}
            </span>
          </template>

          <template #empty>
            <span class="text-sm text-gray-400">No data available</span>
          </template>

          <template #actions="{ row }">
            <button
              class="inline-flex items-center gap-1 px-3 py-1 text-sm text-blue-600
                     outline-1 outline-offset-1 outline-solid rounded-md"
              @click="achievementStore.detailAchievementReportKbn(row.MATNR as string)"
            >
              <EyeOutlined />
              View
            </button>
          </template>
        </TableExcel>
      </div>
    </div>

    <!-- Report Card -->
    <div class="flex-[1] rounded-xl bg-white shadow-sm border border-gray-200">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-200">
        <h2 class="text-2xl font-bold text-gray-600 text-center">Report</h2>
      </div>

      <!-- Chart -->
      <div class="px-6">
        <VueApexCharts
          type="bar"
          :options="chartOptions"
          :series="chartSeries"
          height="400"
        />
      </div>

      <!-- Sub-header -->
      <div class="px-6 py-3 border-t border-gray-100">
        <h3 class="text-md font-semibold text-gray-600 text-center">Item Not Achieved</h3>
      </div>

      <!-- Incomplete table -->
      <div class="relative px-6 pb-6">
        <TableExcel :columns="incompleteHeaders" :data="(achievementKanbanData.incomplete as unknown as Record<string, unknown>[])">
          <template #cell-part_number="{ value }">
            <span class="font-medium text-gray-700">{{ value }}</span>
          </template>

          <template #cell-gap="{ value }">
            <span
              class="px-2 py-1 text-xs font-semibold rounded-full"
              :class="
                parseInt(value as string) <= 0
                  ? 'bg-red-100 text-red-700'
                  : 'bg-green-100 text-green-700'
              "
            >
              {{ value }}
            </span>
          </template>

          <template #empty>
            <span class="text-sm text-gray-400">No data available</span>
          </template>
        </TableExcel>
      </div>
    </div>
  </div>

  <!-- ── Detail Modal ────────────────────────────────────────────────────── -->
  <Transition name="modal">
    <div
      v-if="achievementKanbanData.showModal"
      class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50"
      @click.self="handleCloseModal"
    >
      <div class="relative w-full max-w-7xl bg-white rounded-lg shadow-lg">
        <!-- Header -->
        <div class="flex items-start justify-between p-4 border-b rounded-t border-gray-200">
          <div>
            <h3 class="text-lg font-bold text-gray-900">
              Part Number: {{ achievementKanbanData.detail[0]?.part_number }}
            </h3>
            <p class="text-sm text-gray-600">
              Periode
              {{ utilityStore.dateMonthFull(dates[0]) }}
              {{ dates[1] && dates[1] !== dates[0] ? 's.d ' + utilityStore.dateMonthFull(dates[1]) : '' }}
            </p>
          </div>
          <button
            type="button"
            @click="handleCloseModal"
            class="text-gray-400 hover:text-gray-900 bg-transparent hover:bg-gray-200
                   rounded-lg text-sm w-8 h-8 inline-flex justify-center items-center"
          >
            <svg class="w-3 h-3" fill="none" viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
            </svg>
          </button>
        </div>

        <!-- Body -->
        <div class="p-4 overflow-x-auto max-h-[70vh] overflow-y-auto">
          <table class="min-w-full text-sm text-center border border-gray-200">
            <thead class="bg-gray-50 text-gray-700 text-xs uppercase">
              <tr>
                <th rowspan="2" class="px-3 py-2 border">No</th>
                <th rowspan="2" class="px-3 py-2 border">Date</th>
                <th rowspan="2" class="px-3 py-2 border">Line</th>
                <th class="px-3 py-2 border bg-blue-100">LKH</th>
                <th class="px-3 py-2 border bg-green-100">SAP</th>
                <th class="px-3 py-2 border bg-orange-100">GAP</th>
                <th rowspan="2" class="px-3 py-2 border">Percentage</th>
                <th rowspan="2" class="px-3 py-2 border">Problem Scan</th>
              </tr>
              <tr class="text-xs">
                <th class="px-3 py-1 border bg-blue-50">PCS</th>
                <th class="px-3 py-1 border bg-green-50">PCS</th>
                <th class="px-3 py-1 border bg-orange-50">PCS</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(value, index) in achievementKanbanData.detail"
                :key="index"
                class="border-t hover:bg-gray-50"
              >
                <td class="px-2 py-1 border">{{ index + 1 }}</td>
                <td class="px-2 py-1 border">{{ value.date }}</td>
                <td class="px-2 py-1 border">{{ value.line_id }}</td>
                <td class="px-2 py-1 border">{{ value.lkh }}</td>
                <td class="px-2 py-1 border">{{ value.sap }}</td>
                <td
                  class="px-2 py-1 border font-bold"
                  :class="parseInt(value.gap) <= 0 ? 'text-red-600' : ''"
                >
                  {{ value.gap }}
                </td>
                <td
                  class="px-2 py-1 border font-bold"
                  :class="parseInt(value.gap) < 0 ? 'text-red-600' : 'text-blue-500'"
                >
                  {{ Number(parseFloat(String(value.percentage ?? 0)).toFixed(2)) }}%
                </td>
                <td class="px-2 py-1 border">
                  {{ value.keterangan_sap === '' ? '-' : value.keterangan_sap }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Footer -->
        <div class="flex justify-end p-4 border-t">
          <button
            @click="handleCloseModal"
            class="px-4 py-2 text-sm font-medium text-white bg-gray-700 rounded hover:bg-gray-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
tbody tr {
  border-bottom: 2px solid #e0e0e0;
  transition: background-color 0.2s ease;
}
tr:nth-child(even) {
  background-color: #fafafa;
}
tbody tr:hover {
  background-color: #eef6ff !important;
}
</style>

<style>
/* Flowbite Datepicker */
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
.datepicker-cell:hover { background-color: #f3f4f6; }
.datepicker-cell.focused:not(.selected) { background-color: #e5e7eb; }
.datepicker-cell { border-radius: 0.375rem; margin: 0.5px; }
.datepicker-cell.prev,
.datepicker-cell.next { color: #b8b8b8 !important; }

/* Modal transition */
.modal-enter-active,
.modal-leave-active { transition: opacity 0.3s ease; }
.modal-enter-from,
.modal-leave-to { opacity: 0; }
.modal-enter-active .relative,
.modal-leave-active .relative { transition: transform 0.3s ease; }
.modal-enter-from .relative,
.modal-leave-to .relative { transform: scale(0.9); }
</style>