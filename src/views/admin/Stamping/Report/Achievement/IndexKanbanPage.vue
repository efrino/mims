<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useReportkanbanStampingStore } from "@/stores/Stamping/Report/Kanban";
import { useUtilityStore } from "@/pinia/utility";
import { ref, shallowRef, onMounted, computed } from "vue";
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { initFlowbite } from "flowbite";

import {
  EyeOutlined,
} from '@ant-design/icons-vue';

import VueApexCharts from "vue3-apexcharts";
import TableExcel, { type TableColumn } from '@/components/table/TableExcel.vue';
import DateRangePickerSplitButton from '@/components/date/DateRangePickerSplitButton.vue';

const reportKanbanStore = useReportkanbanStampingStore();
const utilityStore = useUtilityStore();

const page = ref({ title: 'Performance Achievement Kanban Item Stamping' });
const breadcrumbs = shallowRef([
      {
        title: "Report",
        disabled: false,
        href: "#",
      },
      {
        title: "Stamping",
        disabled: false,
        href: "#",
      },
      {
        title: "Achievement Kanban",
        disabled: true,
        href: "achievement-kanban",
      },
    ]);

// REFS dari store
const {
  datatables,
  datatablesIncomplete,
  data,
  dialog,
} = storeToRefs(reportKanbanStore);

// ACTIONS dari store
const {
  fetchAchievementKanbanStamping,
  fetchIncompleteKanbanStamping,
  fetchDataDashboard,
  loadDetail,
  fetchDataChart,
} = reportKanbanStore;

const {
  formatNumber,
  formatPeriod,
  dateMonthFull,
  formatPercentOneZero,
} = utilityStore

onMounted(() => {
  initFlowbite();
  reportKanbanStore.filter.period = today;
});

const fetchAll = (period: string | string[]) => {
  fetchAchievementKanbanStamping(period);
  fetchIncompleteKanbanStamping(period);
  fetchDataChart(period);
  fetchDataDashboard();
};

// Load Data button handler
const onLoadData = () => {
  fetchAll([dates.value[0], dates.value[1] || dates.value[0]]);
};

const today = new Date(
  Date.now() - new Date().getTimezoneOffset() * 60000
)
  .toISOString()
  .substring(0, 10);

const dates = ref<[string, string]>([today, '']);

// Target helper
const dailyItem = computed(() =>
  data.value.dashboard.find(d => d.type === 'Daily')
)

const weeklyItem = computed(() =>
  data.value.dashboard.find(d => d.type === 'Weekly')
)

const monthlyItem = computed(() =>
  data.value.dashboard.find(d => d.type === 'Monthly')
)

const safePercent = (val?: number) =>
  Math.min(100, Math.max(0, Math.round(val ?? 0)))

const remaining = (val?: number) => 100 - safePercent(val)

// chart script
const chartSeries = computed(() => [
  {
    name: "LKH",
    data: [Number(data.value.chart[0]?.act_lkh ?? 0)],
  },
  {
    name: "SAP",
    data: [Number(data.value.chart[0]?.act_sap ?? 0)],
  },
]);

const chartOptions = computed(() => ({
  chart: {
    type: "bar",
    height: 280,
    toolbar: { show: false },
  },

  plotOptions: {
    bar: {
      horizontal: false,
      columnWidth: "45%",
      borderRadius: 8,
      borderRadiusApplication: "end",
    },
  },

  xaxis: {
    categories: ["LKH vs SAP"],
    tickPlacement: "between",
    axisBorder: { show: true },
    axisTicks: { show: false },
    labels: {
      style: {
        fontSize: "12px",
        colors: "#6b7280",
      },
    },
  },

  yaxis: {
    axisBorder: { show: true },
    labels: {
      style: {
        fontSize: "12px",
        colors: "#6b7280",
      },
    },
  },

  grid: {
    borderColor: "#e5e7eb",
    strokeDashArray: 4,
    yaxis: {
      lines: { show: true },
    },
  },

  colors: ["#2563eb", "#16a34a"],

  dataLabels: {
    enabled: true,
    offsetY: -8,
    style: {
      fontSize: "12px",
      fontWeight: 600,
      colors: ["#374151"],
    },
    formatter: (val: number) =>
      val.toLocaleString("id-ID"),
  },

  legend: {
    position: "top",
    horizontalAlign: "right",
    markers: {
      radius: 4,
    },
    labels: {
      colors: "#374151",
    },
  },

  tooltip: {
    y: {
      formatter: (val: number) =>
        val.toLocaleString("id-ID"),
    },
  },
}));

// TableExcel columns (Action column dipisah ke slot #actions)
const mainColumns = computed<TableColumn[]>(() => {
  return datatables.value.headers
    .filter((header) => header.items !== "action")
    .map((header) => {
      let title = header.title;

      // logic khusus SAP Period
      if (
        header.title === "SAP Period" &&
        datatables.value.items.length > 0 &&
        "date" in datatables.value.items[0]
      ) {
        title = `SAP Period ${formatPeriod(
          datatables.value.items[0].date.substring(0, 7)
        )}`;
      }

      return {
        key: header.items,
        label: title,
        align: header.items === "MATNR" ? "left" : "center",
        sortable: header.sortable ?? true,
        filterable: header.filterable ?? true,
      } as TableColumn;
    });
});

const incompleteColumns = computed<TableColumn[]>(() => {
  return datatablesIncomplete.value.headers.map((header) => ({
    key: header.items,
    label: header.title,
    align: "center",
  } as TableColumn));
});
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7"></BaseBreadcrumb>
  <div class="flex gap-4 mb-4">
    <!-- Daily Target -->
    <div class="flex-[2] rounded-xl bg-white shadow-sm border border-gray-200 p-4">
      <div class="text-center text-3xl font-bold text-blue-500 mb-3">
        <h2 class="text-center text-lg font-semibold text-gray-600 mb-2">
          Daily Target
        </h2>
        {{ safePercent(dailyItem?.percentage) }}%
        <div class="text-end text-xs text-gray-400 mb-3">
          of 100% target
        </div>
      </div>

      <div class="text-end text-sm font-bold text-blue-500 mb-3">
        {{ remaining(dailyItem?.percentage) }}% Remaining
      </div>

      <div class="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          class="h-3 bg-blue-500 rounded-full transition-all"
          :style="{ width: safePercent(dailyItem?.percentage) + '%' }"
        ></div>
      </div>
    </div>

    <!-- Weekly Target -->
    <div class="flex-[2] rounded-xl bg-white shadow-sm border border-gray-200 p-4">
      <div class="text-center text-3xl font-bold text-green-500 mb-3">
        <h2 class="text-center text-lg font-semibold text-gray-600 mb-2">
          Weekly Target
        </h2>
        {{ safePercent(weeklyItem?.percentage) }}%
        <div class="text-end text-xs text-gray-400 mb-3">
          of 100% target
        </div>
      </div>

      <div class="text-end text-sm font-bold text-green-500 mb-3">
        {{ remaining(weeklyItem?.percentage) }}% Remaining
      </div>

      <div class="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          class="h-3 bg-green-500 rounded-full transition-all"
          :style="{ width: safePercent(weeklyItem?.percentage) + '%' }"
        ></div>
      </div>
    </div>
    
    <!-- Monthly Target -->
     <div class="flex-[2] rounded-xl bg-white shadow-sm border border-gray-200 p-4">
      <div class="text-center text-3xl font-bold text-purple-500 mb-3">
        <h2 class="text-center text-lg font-semibold text-gray-600 mb-2">
          Monthly Target
        </h2>
        {{ safePercent(monthlyItem?.percentage) }}%
        <div class="text-end text-xs text-gray-400 mb-3">
          of 100% target
        </div>
      </div>

      <div class="text-end text-sm font-bold text-purple-500 mb-3">
        {{ remaining(monthlyItem?.percentage) }}% Remaining
      </div>

      <div class="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          class="h-3 bg-purple-500 rounded-full transition-all"
          :style="{ width: safePercent(monthlyItem?.percentage) + '%' }"
        ></div>
      </div>
    </div>
  </div>

  <div class="flex gap-4 items-start">
    <!-- Achievement Kanban Card -->
    <div class="flex-[3] self-start rounded-xl bg-white shadow-sm border border-gray-200">

      <!-- Header: judul + datefilter + load data sejajar -->
      <div class="px-6 py-4 border-b border-gray-200">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <!-- Judul -->
          <h2 class="text-4xl font-semibold text-gray-700">
            Achievement Kanban
          </h2>

          <!-- Date filter + Load Data -->
          <div class="flex flex-wrap items-center gap-2">
            <DateRangePickerSplitButton v-model:start="dates[0]" v-model:end="dates[1]" />

            <!-- Load Data Button -->
            <button
              type="button"
              @click="onLoadData"
              class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all"
            >
              Load Data
            </button>
          </div>
        </div>
      </div>

      <!-- Table -->
      <div class="px-6 py-4">
        <TableExcel :columns="mainColumns" :data="(datatables.items as unknown as Record<string, unknown>[])">
          <template #cell-ZQTY_LKH="{ value }">
            {{ formatNumber((value as number) || 0) }}
          </template>

          <template #cell-ZQTY_SAP="{ value }">
            {{ formatNumber((value as number) || 0) }}
          </template>

          <template #cell-GAP="{ row, value }">
            <span
              class="font-semibold"
              :class="
                (row as any).ZQTY_LKH > 0 && (row as any).ZQTY_SAP - (row as any).ZQTY_LKH !== 0
                  ? 'text-red-600'
                  : 'text-green-600'
              "
            >
              {{ formatNumber(value as number) }}
            </span>
          </template>

          <template #cell-total_sap="{ value }">
            {{ value ? formatNumber(value as number) : "-" }}
          </template>

          <template #actions="{ row }">
            <button
              class="inline-flex items-center gap-1 px-3 py-1 text-sm
                    text-blue-600 outline-1 outline-offset-1 outline-solid rounded-md"
              @click="loadDetail((row as any).MATNR, dates)"
            >
              <EyeOutlined />
              View
            </button>
          </template>

          <template #empty>
            <span class="px-4 py-6 text-center text-gray-400">No data available</span>
          </template>
        </TableExcel>
      </div>
    </div>
    
    <!-- Report Card -->
    <div class="flex-[1] rounded-xl bg-white shadow-sm border border-gray-200">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-200">
        <h2 class="text-2xl font-bold text-gray-600 text-center">
          Report
        </h2>
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

      <!-- Sub Header -->
      <div class="px-6 py-3 border-t border-gray-100">
        <h3 class="text-md font-semibold text-gray-600 text-center">
          Item Not Achieved
        </h3>
      </div>

      <!-- Table -->
      <div class="px-6 pb-6">
        <TableExcel :columns="incompleteColumns" :data="(datatablesIncomplete.items as unknown as Record<string, unknown>[])">
          <template #cell-gap="{ value }">
            <span
              class="px-2 py-1 text-xs font-semibold rounded-full"
              :class="
                value !== 0
                  ? 'bg-red-100 text-red-700'
                  : 'bg-green-100 text-green-700'
              "
            >
              {{ value }}
            </span>
          </template>

          <template #empty>
            <span class="px-4 py-6 text-center text-gray-400">No data available</span>
          </template>
        </TableExcel>
      </div>
    </div>
  </div>

  <!-- Dialog -->
  <div 
     v-if="dialog.detail"
    class="fixed inset-0 z-9999 flex items-center justify-center bg-black/50"
  >
    <!-- Modal -->
    <div class="relative w-full max-w-7xl bg-white rounded-lg shadow-lg">

      <!-- Header -->
      <div class="flex items-start justify-between p-4 border-b rounded-t">
        <div>
          <h3 class="text-lg font-bold text-gray-900">
            Part Number
            {{ data.detail[0]?.part_number ?? "" }}
          </h3>
          <p class="text-sm text-gray-600">
            Periode
            {{ dateMonthFull(dates[0]) }}
            {{
              dates[1] && dates[1] !== dates[0]
                ? "s.d " + dateMonthFull(dates[1])
                : ""
            }}
          </p>
        </div>

        <button
          @click="dialog.detail = false"
          class="text-gray-400 hover:text-gray-900"
        >
          ✕
        </button>
      </div>

      <!-- Body -->
      <div class="p-4 overflow-x-auto max-h-[70vh] overflow-y-auto">
        <table class="min-w-full text-sm text-center border border-gray-200">
          <thead class="bg-gray-50 text-gray-700">
            <tr>
              <th rowspan="2" class="px-3 py-2 border">No</th>
              <th rowspan="2" class="px-3 py-2 border">Date</th>
              <th rowspan="2" class="px-3 py-2 border">Line</th>
              <th rowspan="2" class="px-3 py-2 border">Shift</th>
              <th rowspan="2" class="px-3 py-2 border">Patan</th>
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
              v-for="(item, index) in data.detail"
              :key="index"
              class="border-t"
            >
              <td class="px-2 py-1 border">{{ index + 1 }}</td>
              <td class="px-2 py-1 border">{{ item.date }}</td>
              <td class="px-2 py-1 border">{{ item.line_id }}</td>
              <td class="px-2 py-1 border">{{ item.shift }}</td>
              <td class="px-2 py-1 border">{{ item.patan }}</td>
              <td class="px-2 py-1 border">{{ item.lkh }}</td>
              <td class="px-2 py-1 border">{{ item.sap }}</td>

              <!-- GAP -->
              <td
                class="px-2 py-1 border font-bold"
                :class="{
                  'text-red-600': item.gap !== 0 && item.gap !== 100,
                  'text-green-600': item.gap === 100
                }"
              >
                {{ item.gap }}
              </td>

              <!-- Percentage -->
              <td
                class="px-2 py-1 border font-bold"
                :class="
                  item.percentage < 100 && item.lkh > 0
                    ? 'text-red-600'
                    : item.percentage === 100
                    ? 'text-green-600'
                    : item.percentage > 100
                    ? 'text-blue-600'
                    : ''
                "
              >
                {{
                  item.percentage
                    ? formatPercentOneZero(item.percentage)
                    : "0 %"
                }}
              </td>

              <td class="px-2 py-1 border">
                {{ item.keterangan_sap }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Footer -->
      <div class="flex justify-end p-4 border-t">
        <button
          @click="dialog.detail = false"
          class="px-4 py-2 text-sm font-medium text-white bg-gray-700 rounded hover:bg-gray-800"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
  /* Table */
.datatable-input{
  justify-content: center;
  align-items: center;
  margin-left: 20px;
}
.border {
  border: 1px solid #e5e7eb !important;
}
.border-foot {
  border-top: 1px solid #e5e7eb !important;
  padding: 4px;
}
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
  margin: .5px;
}

.datepicker-cell.prev,
.datepicker-cell.next {
  color: #b8b8b8 !important;
}
</style>