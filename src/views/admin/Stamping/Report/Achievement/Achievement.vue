<script setup lang="ts">
import { ref, shallowRef } from "vue";
import { useConfigStore } from "@/stores/config";
import { useStampingAchievementReportStore } from '@/stores/Stamping/Report/Achievement';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { storeToRefs } from "pinia";
import TableExcel, { type TableColumn } from '@/components/table/TableExcel.vue';
import DateRangePickerSplitButton from '@/components/date/DateRangePickerSplitButton.vue';
import { achievementRowKey, downloadFilteredReport } from '@/utils/tableExcelExport';

const page = ref({ title: 'Report Achievement Stamping' });
const breadcrumbs = shallowRef([
  { title: "Report", disabled: false, href: "#" },
  { title: "Stamping", disabled: false, href: "#" },
  { title: "Achievement", disabled: true, href: "#" },
]);

const achievementStore = useStampingAchievementReportStore();
const configStore = useConfigStore();

const { dataTable, filterDate } = storeToRefs(achievementStore);

const tableKey = ref(0);
const hasLoaded = ref(false);
const isLoading = ref(false);
const tableRef = ref<InstanceType<typeof TableExcel> | null>(null);

const onExcelAchievementClick = (e: MouseEvent) => {
  const table = tableRef.value;
  if (!table?.isAnyFilterActive) return;
  e.preventDefault();
  downloadFilteredReport(`http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/report_filtered`, {
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
    await achievementStore.fetchDataReport();
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
  { key: "urut", label: "Urut" },
  { key: "is_tandem_text", label: "Tandem" },
  { key: "is_trial_text", label: "Trial" },
  { key: "part_rh", label: "Part RH" },
  { key: "part_lh", label: "Part LH" },
  { key: "job_rh", label: "Job RH" },
  { key: "job_lh", label: "Job LH" },
  { key: "combination", label: "Combination Process" },
  { key: "status_plan", label: "Status Plan" },
  { key: "stroke_plan", label: "Stroke Plan" },
  { key: "lot_rh", label: "Qty Finish Plan RH" },
  { key: "lot_lh", label: "Qty Finish Plan LH" },
  { key: "tpt", label: "TPT Plan" },
  { key: "keterangan", label: "Keterangan" },
  { key: "stroke_act", label: "Stroke Actual" },
  { key: "act_rh", label: "Qty OK RH" },
  { key: "act_lh", label: "Qty OK LH" },
  { key: "repair_rh", label: "Repair RH" },
  { key: "repair_lh", label: "Repair LH" },
  { key: "ket_repair_rh", label: "Keterangan Repair RH" },
  { key: "ket_repair_lh", label: "Keterangan Repair LH" },
  { key: "reject_rh", label: "Reject RH" },
  { key: "reject_lh", label: "Reject LH" },
  { key: "ket_reject_rh", label: "Keterangan Reject RH" },
  { key: "ket_reject_lh", label: "Keterangan Reject LH" },
  { key: "total_lotsize_rh", label: "Qty Finish Actual RH" },
  { key: "total_lotsize_lh", label: "Qty Finish Actual LH" },
  { key: "status", label: "Status" },
  { key: "dandori", label: "Dandori" },
  { key: "dt_machines", label: "Down Time Machines" },
  { key: "dt_dies", label: "Down Time Dies" },
  { key: "dt_other", label: "Down Time Other" },
  { key: "ket_dt_machines", label: "Keterangan DT Machines" },
  { key: "ket_dt_dies", label: "Keterangan DT Dies" },
  { key: "ket_dt_other", label: "Keterangan DT Other" },
  { key: "dt_total", label: "Total Down Time" },
  { key: "tpt_actual", label: "TPT Actual" },
  { key: "finish_actual", label: "Finish Actual", filterable: false },
  { key: "gsph", label: "GSPH" },
  { key: "keterangan_all", label: "Keterangan Line" },
  { key: "tipe_palet", label: "Tipe Palet" },
  { key: "act_palet", label: "Act Palet" },
  { key: "total_standard", label: "Total Standard" },
  { key: "total_present", label: "Total Hadir" },
  { key: "total_leave", label: "Total Izin" },
  { key: "total_sick", label: "Total Sakit" },
];
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-2"></BaseBreadcrumb>
  <div>
    <div class="flex flex-wrap">
      <div class="flex items-center justify-between my-3 px-1 w-full">
        <div class="flex items-center gap-2 flex-wrap">

          <!-- Filter date (start + end, dua button) -->
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

          <!-- Excel Achievement Export Button -->
          <a
            type="button"
            v-if="achievementStore.permissions.download"
            :href="`http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/report?start=${achievementStore.filterDate.start}&end=${achievementStore.filterDate.end}`"
            target="_blank"
            @click="onExcelAchievementClick"
            class="mx-2 flex items-center gap-2 text-white bg-green-600 hover:bg-green-800 focus:outline-none focus:ring-4 focus:ring-green-300 font-medium rounded-full text-sm px-5 py-2.5 text-center"
          >
            <svg class="w-5 h-5 text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 15v2a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-2m-8 1V4m0 12-4-4m4 4 4-4"/>
            </svg>
            Excel Achievement
          </a>

          <!-- Excel Stroke Export Button -->
          <a
            type="button"
            v-if="achievementStore.permissions.download"
            :href="`http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/report_stroke?start=${achievementStore.filterDate.start}&end=${achievementStore.filterDate.end}`"
            target="_blank"
            class="mx-2 flex items-center gap-2 text-white bg-green-600 hover:bg-green-800 focus:outline-none focus:ring-4 focus:ring-green-300 font-medium rounded-full text-sm px-5 py-2.5 text-center"
          >
            <svg class="w-5 h-5 text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 15v2a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-2m-8 1V4m0 12-4-4m4 4 4-4"/>
            </svg>
            Excel Stroke
          </a>
        </div>
      </div>
    </div>

    <!-- TableExcel -->
    <div
      v-if="!hasLoaded"
      class="flex flex-col items-center justify-center py-20 text-gray-400 w-full bg-white border border-gray-200 rounded-lg shadow-sm"
    >
      <p class="text-sm">Pilih tanggal <span class="font-semibold text-indigo-500">Start & End Date</span>, lalu tekan <span class="font-semibold text-indigo-500">Load Data</span> untuk menampilkan data.</p>
    </div>
    <TableExcel v-else ref="tableRef" :key="tableKey" :columns="columns" :data="(dataTable as unknown as Record<string, unknown>[])" :loading="isLoading">
      <template #empty>
        <div class="flex flex-col items-center justify-center py-20 text-gray-400 w-full">
          <svg class="w-12 h-12 mb-3 text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p class="text-sm">No Achievement Data Available untuk rentang tanggal yang dipilih.</p>
        </div>
      </template>
    </TableExcel>
  </div>
</template>

<style scoped>
.border {
  border: 1px solid #e5e7eb !important;
}
</style>

<style>
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