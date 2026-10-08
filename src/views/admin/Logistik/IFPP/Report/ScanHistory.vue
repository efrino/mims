<script setup lang="ts">
import { ref, shallowRef, computed, onMounted, onUnmounted } from 'vue';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { useScanHistoryIFPPStore } from '@/stores/Logistik/IFPP/Report/ScanHistory';
import { storeToRefs } from 'pinia';
import type { ScanMode } from '@/types/Logistik/IFPP/Report/ScanHistory';
import TableExcel, { type TableColumn } from '@/components/table/TableExcel.vue';

const page = ref({ title: 'History Scan' });
const breadcrumbs = shallowRef([
  { title: 'Logistik', disabled: false, href: '#' },
  { title: 'IFPP', disabled: false, href: '#' },
  { title: 'Report', disabled: false, href: '#' },
  { title: 'History Scan', disabled: true, href: '#' }
]);

const scanHistoryStore = useScanHistoryIFPPStore();
const { dateFilter } = storeToRefs(scanHistoryStore);

const activeMode = ref<ScanMode>('IN');
const scanInItems = ref<any[]>([]);
const scanOutItems = ref<any[]>([]);

const tableKey = ref(0);
const isLoading = ref(true);
const showFilterPanel = ref(false);
const filterButtonRef = ref<HTMLElement | null>(null);

const activeFilterCount = computed(() => {
  return [dateFilter.value.date_from, dateFilter.value.date_to].filter(Boolean).length;
});

const formatShortDate = (value: string | null) => {
  if (!value) return null;
  return new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
};

const filterSummaryLabel = computed(() => {
  const from = formatShortDate(dateFilter.value.date_from);
  const to = formatShortDate(dateFilter.value.date_to);

  if (!from && !to) return 'Filter Tanggal';
  if (from && to) return `${from} - ${to}`;
  return from ? `Sejak ${from}` : `S.d. ${to}`;
});

const shiftOptions = [
  { value: null, label: 'Semua' },
  { value: 1, label: '1' },
  { value: 2, label: '2' }
];

const handleClickOutsideFilter = (event: MouseEvent) => {
  if (filterButtonRef.value && !filterButtonRef.value.contains(event.target as Node)) {
    showFilterPanel.value = false;
  }
};

onMounted(async () => {
  document.addEventListener('click', handleClickOutsideFilter);
  activeMode.value = 'IN';
  await loadScanHistory();
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutsideFilter);
});

const columns = computed<TableColumn[]>(() => {
  const cols: TableColumn[] = [{ key: 'part_number', label: 'Part Number' }];

  if (activeMode.value === 'OUT') {
    cols.push({ key: 'qty_out', label: 'QTY OUT' });
  } else {
    cols.push({ key: 'qty', label: 'QTY IN' });
  }

  cols.push({ key: 'date', label: 'Date' });
  cols.push({ key: 'shift', label: 'Shift' });

  cols.push({
    key: activeMode.value === 'OUT' ? 'scan_out_date' : 'scan_in_date',
    label: activeMode.value === 'OUT' ? 'Scan Out Date' : 'Scan In Date'
  });

  cols.push({
    key: activeMode.value === 'OUT' ? 'scan_out_user' : 'scan_in_user',
    label: activeMode.value === 'OUT' ? 'Scan Out User' : 'Scan In User'
  });

  return cols;
});

const filteredItems = computed(() => {
  return activeMode.value === 'IN' ? scanInItems.value : scanOutItems.value;
});

const handleFilterChange = (mode: ScanMode) => {
  activeMode.value = mode;
  tableKey.value++;
};

const loadScanHistory = async () => {
  isLoading.value = true;
  scanInItems.value = await scanHistoryStore.fetchScanHistoryByCategory('IN');
  scanOutItems.value = await scanHistoryStore.fetchScanHistoryByCategory('OUT');
  isLoading.value = false;
  tableKey.value++;
};

const handleApplyDateFilter = () => {
  showFilterPanel.value = false;
  loadScanHistory();
};

const handleResetDateFilter = () => {
  scanHistoryStore.resetDateFilter();
  showFilterPanel.value = false;
  loadScanHistory();
};

const toNumberCell = (value: unknown): number | string => {
  if (value === null || value === undefined || value === '') return '-';
  const num = Number(value);
  return Number.isNaN(num) ? String(value) : num;
};

const handleExportExcel = () => {
  import('xlsx').then((XLSX) => {
    const isOut = activeMode.value === 'OUT';

    const rows = filteredItems.value.map((item, i) => ({
      No: i + 1,
      'Part Number': item.part_number ?? '-',
      [isOut ? 'QTY OUT' : 'QTY IN']: toNumberCell(isOut ? item.qty_out : item.qty),
      Date: item.date ?? '-',
      Shift: toNumberCell(item.shift),
      [isOut ? 'Scan Out Date' : 'Scan In Date']: (isOut ? item.scan_out_date : item.scan_in_date) ?? '-',
      [isOut ? 'Scan Out User' : 'Scan In User']: (isOut ? item.scan_out_user : item.scan_in_user) ?? '-'
    }));

    const ws = XLSX.utils.json_to_sheet(rows);

    const colWidths = Object.keys(rows[0] || {}).map((key) => ({
      wch: Math.max(key.length, ...rows.map((r) => String(r[key as keyof typeof r]).length)) + 2
    }));
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, isOut ? 'Scan Out' : 'Scan In');

    const filename = `History_Scan_${isOut ? 'OUT' : 'IN'}_${new Date().toISOString().slice(0, 10)}.xlsx`;

    XLSX.writeFile(wb, filename);
  });
};
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7" />

  <div class="flex flex-col gap-5">
    <!-- Toolbar -->
    <div class="flex flex-wrap items-center justify-between gap-3 bg-white rounded-lg border border-gray-200 shadow-sm p-4">
      <!-- Scan IN / OUT Toggle -->
      <div class="inline-flex items-center bg-gray-100 rounded-2xl p-1.5 gap-1.5 shadow-inner">
        <button
          type="button"
          @click="handleFilterChange('IN')"
          :class="activeMode === 'IN'
            ? 'bg-white shadow-sm text-green-600'
            : 'text-gray-500 hover:text-green-600 hover:bg-white/60'"
          class="px-6 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 focus:outline-none"
        >
          Scan IN
        </button>
        <button
          type="button"
          @click="handleFilterChange('OUT')"
          :class="activeMode === 'OUT'
            ? 'bg-white shadow-sm text-red-600'
            : 'text-gray-500 hover:text-red-600 hover:bg-white/60'"
          class="px-6 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 focus:outline-none"
        >
          Scan OUT
        </button>
      </div>

      <!-- Filter & Action -->
      <div class="flex gap-3 flex-wrap items-center">
        <div ref="filterButtonRef" class="relative">
          <button
            type="button"
            @click.stop="showFilterPanel = !showFilterPanel"
            class="group flex items-center gap-2 text-sm font-medium rounded-full pl-4 pr-3 py-2.5 border-2 transition-all"
            :class="activeFilterCount > 0
              ? 'border-blue-300 bg-blue-50 text-blue-700'
              : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400 hover:bg-gray-50'"
          >
            <svg class="w-4 h-4 shrink-0" :class="activeFilterCount > 0 ? 'text-blue-600' : 'text-gray-400'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 8v8m-4-5v5m8-9v9M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <span>{{ filterSummaryLabel }}</span>
            <svg
              class="w-3.5 h-3.5 text-gray-400 transition-transform duration-200"
              :class="{ 'rotate-180': showFilterPanel }"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <!-- Filter Dropdown Panel -->
          <Transition
            enter-active-class="transition duration-150 ease-out"
            enter-from-class="opacity-0 -translate-y-1 scale-95"
            enter-to-class="opacity-100 translate-y-0 scale-100"
            leave-active-class="transition duration-100 ease-in"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
          >
            <div
              v-if="showFilterPanel"
              class="absolute right-0 z-20 mt-2 w-[300px] origin-top-right bg-white rounded-2xl border-2 border-gray-200 shadow-xl overflow-hidden"
            >
              <div class="flex items-center justify-between px-4 pt-4 pb-2">
                <p class="text-sm font-semibold text-gray-800">Filter Periode</p>
                <button
                  type="button"
                  @click="showFilterPanel = false"
                  class="text-gray-400 hover:text-gray-600 rounded-full p-1 -mr-1"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div class="px-4 pb-4 flex flex-col gap-3">
                <div class="flex flex-col gap-1.5">
                  <span class="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Dari</span>
                  <input
                    v-model="dateFilter.date_from"
                    type="date"
                    class="w-full px-3 py-2 text-sm text-gray-900 border border-gray-200 rounded-xl bg-gray-50/70 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-colors"
                  />
                  <div class="inline-flex self-start bg-gray-50 rounded-full p-1 gap-0.5 border-2 border-gray-200">
                    <button
                      v-for="opt in shiftOptions"
                      :key="`start-${opt.value}`"
                      type="button"
                      @click="dateFilter.shift_start = opt.value"
                      :class="dateFilter.shift_start === opt.value
                        ? 'bg-white text-blue-600 border-blue-300 shadow-sm'
                        : 'text-gray-500 border-transparent hover:text-gray-700'"
                      class="px-3 py-1 text-xs font-medium rounded-full border-2 transition-colors"
                    >
                      {{ opt.label === 'Semua' ? 'Semua Shift' : `Shift ${opt.label}` }}
                    </button>
                  </div>
                </div>

                <div class="flex justify-center text-gray-300">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>

                <div class="flex flex-col gap-1.5">
                  <span class="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Sampai</span>
                  <input
                    v-model="dateFilter.date_to"
                    type="date"
                    class="w-full px-3 py-2 text-sm text-gray-900 border border-gray-200 rounded-xl bg-gray-50/70 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-colors"
                  />
                  <div class="inline-flex self-start bg-gray-50 rounded-full p-1 gap-0.5 border-2 border-gray-200">
                    <button
                      v-for="opt in shiftOptions"
                      :key="`end-${opt.value}`"
                      type="button"
                      @click="dateFilter.shift_end = opt.value"
                      :class="dateFilter.shift_end === opt.value
                        ? 'bg-white text-blue-600 border-blue-300 shadow-sm'
                        : 'text-gray-500 border-transparent hover:text-gray-700'"
                      class="px-3 py-1 text-xs font-medium rounded-full border-2 transition-colors"
                    >
                      {{ opt.label === 'Semua' ? 'Semua Shift' : `Shift ${opt.label}` }}
                    </button>
                  </div>
                </div>
              </div>

              <div class="flex items-center justify-between gap-2 px-4 py-3 bg-gray-50 border-t border-gray-100">
                <button
                  type="button"
                  @click="handleResetDateFilter"
                  class="text-gray-500 hover:text-gray-700 font-medium text-sm px-2 py-1.5"
                >
                  Reset
                </button>
                <button
                  type="button"
                  @click="handleApplyDateFilter"
                  class="text-white bg-blue-600 hover:bg-blue-700 font-medium rounded-full text-sm px-5 py-2 shadow-sm shadow-blue-200"
                >
                  Terapkan
                </button>
              </div>
            </div>
          </Transition>
        </div>

        <button
          type="button"
          @click="handleExportExcel"
          :disabled="filteredItems.length === 0"
          class="flex items-center gap-2 text-white bg-gradient-to-r from-green-400 via-green-500 to-green-600 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-green-300 font-medium rounded-full text-sm px-5 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg class="w-5 h-5 text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
            fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M10 3v4a1 1 0 0 1-1 1H5m4 8h6m-6-4h6m4-8v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7.914a1 1 0 0 1 .293-.707l3.914-3.914A1 1 0 0 1 9.914 3H18a1 1 0 0 1 1 1Z" />
          </svg>
          Report Excel
        </button>
      </div>
    </div>

    <!-- Table -->
    <div class="w-full max-w-10xl mx-auto">
      <TableExcel :key="tableKey" :columns="columns" :data="(filteredItems as unknown as Record<string, unknown>[])" :loading="isLoading">
        <template #cell-scan_in_date="{ row }">
          {{ activeMode === 'OUT' ? (row as any).scan_out_date : (row as any).scan_in_date }}
        </template>
        <template #cell-scan_out_date="{ row }">
          {{ activeMode === 'OUT' ? (row as any).scan_out_date : (row as any).scan_in_date }}
        </template>
        <template #cell-scan_in_user="{ row }">
          {{ activeMode === 'OUT' ? (row as any).scan_out_user : (row as any).scan_in_user }}
        </template>
        <template #cell-scan_out_user="{ row }">
          {{ activeMode === 'OUT' ? (row as any).scan_out_user : (row as any).scan_in_user }}
        </template>

        <template #empty>
          <p class="text-gray-500">No data found.</p>
        </template>
      </TableExcel>
    </div>
  </div>
</template>

<style>
.border {
  border: 1px solid #e5e7eb !important;
}
</style>
