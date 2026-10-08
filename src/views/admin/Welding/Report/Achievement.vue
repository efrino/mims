<script setup lang="ts">
import { ref, shallowRef } from 'vue';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import TableExcel, { type TableColumn } from '@/components/table/TableExcel.vue';
import { useWeldingAchievementReportStore } from '@/stores/Welding/Report/Achievement';
import { storeToRefs } from 'pinia';
import { useConfigStore } from '@/stores/config';
import DateRangePickerSplitButton from '@/components/date/DateRangePickerSplitButton.vue';
import { achievementRowKey, downloadFilteredReport } from '@/utils/tableExcelExport';

const page = ref({ title: 'Report Achievement Welding' });
const breadcrumbs = shallowRef([
  {
    title: 'Welding',
    disabled: false,
    href: '#'
  },
  {
    title: 'Report',
    disabled: false,
    href: '#'
  },
  {
    title: 'Achievement',
    disabled: true,
    href: '#'
  },
]);

const achievementStore = useWeldingAchievementReportStore();
const { dataTable, filterDate } = storeToRefs(achievementStore);
const configStore = useConfigStore()
const tableKey = ref(0);

const hasLoaded = ref(false);
const isLoading = ref(false);
const tableRef = ref<InstanceType<typeof TableExcel> | null>(null);

const onExcelClick = (e: MouseEvent) => {
  const table = tableRef.value;
  if (!table?.isAnyFilterActive) return;
  e.preventDefault();
  downloadFilteredReport(`http://${configStore.apiUrl}/majsf_rest_api/api/welding-achievement/report_filtered`, {
    start: filterDate.value.start,
    end: filterDate.value.end,
    keys: JSON.stringify(table.filteredData.map(achievementRowKey))
  });
};

const onLoadData = async () => {
  if (!filterDate.value.start) {
    alert('Silakan pilih tanggal mulai terlebih dahulu.');
    return;
  }
  isLoading.value = true;
  try {
    await achievementStore.fetchAchievementReport();
    hasLoaded.value = true;
    tableKey.value++;
  } finally {
    isLoading.value = false;
  }
};

const columns: TableColumn[] = [
  { key: "date", label: "Date" },
  { key: "shift", label: "Shift" },
  { key: "additional_text", label: "Patan" },
  { key: "line_id", label: "Line" },
  { key: "part_number", label: "Part Number" },
  { key: "job_number", label: "Job Number" },
  { key: "status_plan", label: "Status Plan" },
  { key: "stroke_plan", label: "Stroke/Pcs" },
  { key: "stroke_plan_total", label: "Stroke Plan" },
  { key: "lotsize", label: "QTY Finish Plan" },
  { key: "tpt", label: "TPT Plan" },
  { key: "uph_plan", label: "UPH Plan" },
  { key: "keterangan", label: "Keterangan Plan" },
  { key: "stroke_act", label: "Stroke Actual" },
  { key: "lotsize_actual", label: "QTY OK" },
  { key: "repair", label: "QTY Repair" },
  { key: "ket_repair", label: "Keterangan Repair" },
  { key: "reject", label: "QTY Reject" },
  { key: "ket_reject", label: "Keterangan Reject" },
  { key: "total_output", label: "QTY Finish Actual" },
  { key: "status", label: "Status" },
  { key: "idletime", label: "Idle Time" },
  { key: "dandori", label: "Dandori" },
  { key: "dt_machines", label: "Downtime Machines" },
  { key: "ket_dt_machines", label: "Keterangan Downtime Machines" },
  { key: "dt_jig", label: "Downtime Jig" },
  { key: "ket_dt_jig", label: "Keterangan Downtime Jig" },
  { key: "dt_other", label: "Downtime Other" },
  { key: "ket_dt_other", label: "Keterangan Downtime Other" },
  { key: "dt_wip", label: "Downtime Bahan" },
  { key: "ket_dt_wip", label: "Keterangan Downtime Bahan" },
  { key: "dt_total", label: "Total Downtime" },
  { key: "tpt_actual", label: "TPT Actual" },
  { key: "uph_act", label: "UPH Actual" },
];
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-2"></BaseBreadcrumb>
  <div>
    <div class="flex flex-wrap">
      <div class="flex items-center justify-between my-3 px-1">
        <div class="flex items-center mx-2">

          <!-- Filter date (start + end, satu button) -->
          <DateRangePickerSplitButton
            v-model:start="filterDate.start"
            v-model:end="filterDate.end"
          />

          <!-- Load Data Button -->
          <button
            type="button"
            @click="onLoadData"
            :disabled="isLoading || !filterDate.start"
            class="mx-2 flex items-center gap-2 text-white bg-indigo-500 hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-300 font-medium rounded-full text-sm px-5 py-2.5 text-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ isLoading ? 'Loading...' : 'Load Data' }}
          </button>
        </div>

        <!-- Excel Export Button -->
        <a 
          type="button"
          v-if="achievementStore.permissions.download"
          target="_blank"
          :href="`http://${configStore.apiUrl}/majsf_rest_api/api/welding-achievement/report?start=${filterDate.start}&end=${filterDate.end}`"
          @click="onExcelClick"
          class="flex items-center gap-2 text-white bg-green-600 hover:bg-green-800 focus:outline-none focus:ring-4 focus:ring-green-300 font-medium rounded-full text-sm px-5 py-2.5 text-center"
        >
          <svg class="w-5 h-5 text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 15v2a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-2m-8 1V4m0 12-4-4m4 4 4-4"/>
          </svg>
          Excel
        </a>
      </div>
    </div>

    <!-- Empty state before first load -->
    <div
      v-if="!hasLoaded"
      class="flex flex-col items-center justify-center py-20 text-gray-400 border border-dashed border-gray-300 rounded-lg bg-gray-50"
    >
      <p class="text-sm">Pilih tanggal <span class="font-semibold text-indigo-500">Start & End Date</span>, lalu tekan <span class="font-semibold text-indigo-500">Load Data</span> untuk menampilkan data.</p>
    </div>

    <!-- DataTable shown after first load -->
    <TableExcel
      v-else-if="dataTable.length"
      ref="tableRef"
      :key="tableKey"
      :columns="columns"
      :data="(dataTable as unknown as Record<string, unknown>[])"
    >
      <template #empty>
        <i class="mdi mdi-table-off text-3xl block mb-2 text-gray-300" />
        <span class="text-sm text-gray-400">No Achievement Data Available</span>
      </template>
    </TableExcel>

    <!-- No data after load -->
    <div
      v-else
      class="flex flex-col items-center justify-center py-20 text-gray-400 border border-dashed border-gray-300 rounded-lg bg-gray-50"
    >
      <svg class="w-12 h-12 mb-3 text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p class="text-sm">No Achievement Data Available untuk rentang tanggal yang dipilih.</p>
    </div>
  </div>
</template>

<style scoped>
.border {
  border: 1px solid #e5e7eb !important;
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
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-active .relative,
.modal-leave-active .relative {
  transition: transform 0.3s ease;
}
.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: scale(0.9);
}
</style>