<script setup lang="ts">
import { ref, computed, shallowRef } from 'vue';
import { useNotificationStore } from '@/stores/notification';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { metalFinishService } from '@/services/Stamping/Transaction/MetalFinishService';
import type { MetalFinishReportItem, MetalFinishMonthlyItem, MetalFinishMonthlyNikItem } from '@/types/Stamping/Transaction/MetalFinish';
import { SyncOutlined, FileExcelOutlined } from '@ant-design/icons-vue';
import TableExcel, { type TableColumn } from '@/components/table/TableExcel.vue';
import DateRangePickerSplitButton from '@/components/date/DateRangePickerSplitButton.vue';

const notificationStore = useNotificationStore();

const page = shallowRef({ title: 'Report Metal Finish' });
const breadcrumbs = shallowRef([
  { title: 'Stamping', disabled: false, href: '#' },
  { title: 'Report', disabled: false, href: '#' },
  { title: 'Metal Finish', disabled: true, href: '#' }
]);

// ── Tabs ──────────────────────────────────────────────────────────
const activeTab = ref<'report' | 'monthly'>('report');

// ── Tab 1: Report ─────────────────────────────────────────────────
const reportColumns: TableColumn[] = [
  { key: 'date', label: 'Date' },
  { key: 'shift', label: 'Shift', align: 'center' },
  { key: 'nik', label: 'NIK', align: 'center' },
  { key: 'operator_name', label: 'Nama Operator' },
  { key: 'part_number', label: 'Part Number' },
  { key: 'job_number', label: 'Job Number' },
  { key: 'problems_summary', label: 'Problem' },
  { key: 'repair_summary', label: 'Repair' },
  { key: 'prepare_time', label: 'Prep (Mnt)', align: 'center' },
  { key: 'prod_time', label: 'Prod (Mnt)', align: 'center' },
  { key: 'time_end', label: 'End Time', align: 'center' },
  { key: 'qty_ok', label: 'Qty OK', align: 'center' },
  { key: 'qty_ng', label: 'Qty NG', align: 'center' },
  { key: 'qty_total', label: 'Total', align: 'center' },
  { key: 'gsph', label: 'GSPH', align: 'center' },
  { key: 'cycle_time', label: 'CT (Sec)', align: 'center' }
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

const dateStart = ref(today());
const dateEnd = ref('');
const shiftFilter = ref('');
const loading = ref(false);
const exportLoading = ref(false);
const hasLoaded = ref(false);

const rows = ref<MetalFinishReportItem[]>([]);

async function loadData() {
  if (!dateStart.value) {
    notificationStore.showAlertWarning('Silakan pilih tanggal mulai.');
    return;
  }
  // Tanggal selesai kosong berarti hanya menampilkan tanggal mulai saja.
  const end = dateEnd.value || dateStart.value;
  if (dateStart.value > end) {
    notificationStore.showAlertWarning('Tanggal mulai tidak boleh lebih besar dari tanggal selesai.');
    return;
  }
  loading.value = true;
  try {
    const result = await metalFinishService.fetchReport({
      start: dateStart.value,
      end,
      shift: shiftFilter.value || undefined
    });
    rows.value = result;
    hasLoaded.value = true;
  } finally {
    loading.value = false;
  }
}

async function exportData() {
  if (!dateStart.value) {
    notificationStore.showAlertWarning('Silakan pilih tanggal mulai.');
    return;
  }
  const end = dateEnd.value || dateStart.value;
  exportLoading.value = true;
  try {
    await metalFinishService.exportExcel({
      start: dateStart.value,
      end,
      shift: shiftFilter.value || undefined
    });
  } finally {
    exportLoading.value = false;
  }
}

// ── Tab 2: Monthly Achievement Monitoring ─────────────────────────
function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

const monthFilter = ref(currentMonth());
const monthlyShiftFilter = ref('');
const monthlyLoading = ref(false);
const monthlyHasLoaded = ref(false);
const monthlyGroupMode = ref<'nik' | 'part'>('nik');
const monthlyDataByPart = ref<MetalFinishMonthlyItem[]>([]);
const monthlyDataByNik = ref<MetalFinishMonthlyNikItem[]>([]);
const daysInMonth = ref(31);

interface MetricDef {
  key: 'qty_ok' | 'qty_ng' | 'total_prod_time' | 'gsph' | 'cycle_time';
  label: string;
}

const metrics: MetricDef[] = [
  { key: 'qty_ok', label: 'Qty OK' },
  { key: 'qty_ng', label: 'Qty NG' },
  { key: 'total_prod_time', label: 'Prod Time (Mnt)' },
  { key: 'gsph', label: 'GSPH' },
  { key: 'cycle_time', label: 'CT (Sec)' }
];

async function loadMonthlyData() {
  if (!monthFilter.value) {
    notificationStore.showAlertWarning('Silakan pilih bulan.');
    return;
  }
  monthlyLoading.value = true;
  try {
    if (monthlyGroupMode.value === 'nik') {
      const result = await metalFinishService.fetchMonthlyReportByNik({
        month: monthFilter.value,
        shift: monthlyShiftFilter.value || undefined
      });
      monthlyDataByNik.value = result?.data ?? [];
      daysInMonth.value = result?.days_in_month ?? 31;
    } else {
      const result = await metalFinishService.fetchMonthlyReport({
        month: monthFilter.value,
        shift: monthlyShiftFilter.value || undefined
      });
      monthlyDataByPart.value = result?.data ?? [];
      daysInMonth.value = result?.days_in_month ?? 31;
    }
    monthlyHasLoaded.value = true;
  } finally {
    monthlyLoading.value = false;
  }
}

const monthlyColumns = computed<TableColumn[]>(() => {
  const dayCols: TableColumn[] = Array.from({ length: daysInMonth.value }, (_, i) => ({
    key: `day_${i + 1}`,
    label: String(i + 1),
    align: 'center',
    width: '52px'
  }));
  const groupCols: TableColumn[] =
    monthlyGroupMode.value === 'nik'
      ? [
          { key: 'nik', label: 'NIK', sortable: false },
          { key: 'operator_name', label: 'Nama Operator', sortable: false }
        ]
      : [{ key: 'part_number', label: 'Part Number', sortable: false }];
  return [...groupCols, { key: 'metric', label: 'Metrik', sortable: false }, ...dayCols, { key: 'total', label: 'Total', align: 'center' }];
});

const monthlyRowSpanKey = computed(() => (monthlyGroupMode.value === 'nik' ? 'nik' : 'part_number'));

const monthlyRows = computed<Record<string, unknown>[]>(() => {
  const result: Record<string, unknown>[] = [];
  const items: (MetalFinishMonthlyItem | MetalFinishMonthlyNikItem)[] =
    monthlyGroupMode.value === 'nik' ? monthlyDataByNik.value : monthlyDataByPart.value;

  for (const item of items) {
    for (const metric of metrics) {
      const row: Record<string, unknown> =
        monthlyGroupMode.value === 'nik'
          ? { nik: (item as MetalFinishMonthlyNikItem).nik, operator_name: (item as MetalFinishMonthlyNikItem).operator_name, metric: metric.label }
          : { part_number: (item as MetalFinishMonthlyItem).part_number, metric: metric.label };

      for (let d = 1; d <= daysInMonth.value; d++) {
        const day = item.daily?.[String(d)];
        row[`day_${d}`] = day ? (day[metric.key] ?? null) : null;
      }
      if (metric.key === 'qty_ok') row.total = item.total_qty_ok;
      else if (metric.key === 'qty_ng') row.total = item.total_qty_ng;
      else if (metric.key === 'total_prod_time') row.total = item.total_prod_time;
      else row.total = null;
      result.push(row);
    }
  }
  return result;
});
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-5" />

  <!-- ── Tabs ───────────────────────────────────────────────────── -->
  <div class="flex items-center gap-1 mb-3 border-b border-gray-200">
    <button
      type="button"
      @click="activeTab = 'report'"
      class="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition"
      :class="activeTab === 'report' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
    >
      Report
    </button>
    <button
      type="button"
      @click="activeTab = 'monthly'"
      class="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition"
      :class="activeTab === 'monthly' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
    >
      Monthly Monitoring
    </button>
  </div>

  <!-- ── Tab 1: Report ──────────────────────────────────────────── -->
  <div v-show="activeTab === 'report'">
    <div class="bg-white border border-gray-200 rounded-lg shadow-sm px-5 py-2.5 mb-3">
      <div class="flex flex-wrap items-end gap-4">
        <div>
          <label class="block text-xs font-semibold text-gray-600 mb-1.5">Rentang Tanggal</label>
          <DateRangePickerSplitButton
            v-model:start="dateStart"
            v-model:end="dateEnd"
            start-label="Mulai"
            end-label="Selesai"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-gray-600 mb-1.5">Shift</label>
          <select
            v-model="shiftFilter"
            class="bg-gray-50 border border-gray-300 rounded-lg px-3 pr-8 py-1.5 text-sm focus:ring-2 focus:border-blue-500 focus:bg-white outline-none"
          >
            <option value="">Semua Shift</option>
            <option value="1">Shift 1</option>
            <option value="2">Shift 2</option>
          </select>
        </div>

        <button
          @click="loadData"
          :disabled="loading"
          class="flex items-center gap-2 font-medium rounded-full text-sm px-3 py-1.5 text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          <SyncOutlined :spin="loading" />
          Load Data
        </button>

        <button
          @click="exportData"
          :disabled="exportLoading"
          class="flex items-center gap-2 font-medium rounded-full text-sm px-3 py-1.5 text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          <FileExcelOutlined :spin="exportLoading" />
          Export Excel
        </button>
      </div>
    </div>

    <TableExcel :columns="reportColumns" :data="rows" :loading="loading" thead-class="bg-sky-100">
      <template #empty>
        <div v-if="!hasLoaded" class="w-full">
          <span class="px-5 py-12 text-center text-gray-400 text-sm">
            Pilih rentang tanggal dan klik <strong class="text-gray-500">Load Data</strong> untuk menampilkan data.
          </span>
        </div>
        <div v-else class="w-full">
          <span class="px-5 py-12 text-center text-gray-400 text-sm">Tidak ada data yang cocok dengan filter.</span>
        </div>
      </template>
    </TableExcel>
  </div>

  <!-- ── Tab 2: Monthly Achievement Monitoring ─────────────────────── -->
  <div v-show="activeTab === 'monthly'">
    <div class="bg-white border border-gray-200 rounded-lg shadow-sm px-5 py-2.5 mb-3">
      <div class="flex flex-wrap items-end gap-4">
        <div>
          <label class="block text-xs font-semibold text-gray-600 mb-1.5">Bulan</label>
          <input
            v-model="monthFilter"
            type="month"
            class="bg-gray-50 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:border-blue-500 focus:bg-white outline-none"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-gray-600 mb-1.5">Shift</label>
          <select
            v-model="monthlyShiftFilter"
            class="bg-gray-50 border border-gray-300 rounded-lg px-3 pr-8 py-1.5 text-sm focus:ring-2 focus:border-blue-500 focus:bg-white outline-none"
          >
            <option value="">Semua Shift</option>
            <option value="1">Shift 1</option>
            <option value="2">Shift 2</option>
          </select>
        </div>

        <button
          @click="loadMonthlyData"
          :disabled="monthlyLoading"
          class="flex items-center gap-2 font-medium rounded-full text-sm px-3 py-1.5 text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          <SyncOutlined :spin="monthlyLoading" />
          Load Data
        </button>

        <!-- Group mode toggle: NIK / Part Number -->
        <div>
          <label class="block text-xs font-semibold text-gray-600 mb-1.5">Tampilkan Baris</label>
          <div class="inline-flex rounded-full border border-gray-300 bg-gray-50 p-0.5 text-sm">
            <button
              type="button"
              @click="
                monthlyGroupMode = 'nik';
                loadMonthlyData();
              "
              class="px-3 py-1 rounded-full font-medium transition"
              :class="monthlyGroupMode === 'nik' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:text-gray-800'"
            >
              NIK
            </button>
            <button
              type="button"
              @click="
                monthlyGroupMode = 'part';
                loadMonthlyData();
              "
              class="px-3 py-1 rounded-full font-medium transition"
              :class="monthlyGroupMode === 'part' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:text-gray-800'"
            >
              Part Number
            </button>
          </div>
        </div>
      </div>
    </div>

    <TableExcel
      :columns="monthlyColumns"
      :data="monthlyRows"
      :loading="monthlyLoading"
      :initial-items-per-page="25"
      :row-span-key="monthlyRowSpanKey"
      group-visual="both"
      thead-class="bg-sky-100"
    >
      <template #empty>
        <div v-if="!monthlyHasLoaded" class="w-full">
          <span class="px-5 py-12 text-center text-gray-400 text-sm">
            Pilih bulan dan klik <strong class="text-gray-500">Load Data</strong> untuk menampilkan data.
          </span>
        </div>
        <div v-else class="w-full">
          <span class="px-5 py-12 text-center text-gray-400 text-sm">Tidak ada data yang cocok dengan filter.</span>
        </div>
      </template>
    </TableExcel>
  </div>
</template>
