<script setup lang="ts">
import { ref, shallowRef } from "vue";
import { useConfigStore } from "@/stores/config";
import { useStampingAchievementReportSumStore } from '@/stores/Stamping/Report/AchievementSum';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { storeToRefs } from "pinia";
import TableExcel, { type TableColumn } from '@/components/table/TableExcel.vue';
import DateRangePickerSplitButton from '@/components/date/DateRangePickerSplitButton.vue';

const page = ref({ title: 'Report Achievement Stamping Summmary' });
const breadcrumbs = shallowRef([
  { title: "Report", disabled: false, href: "#" },
  { title: "Stamping", disabled: false, href: "#" },
  { title: "Achievement Summary", disabled: true, href: "#" },
]);

const achievementStore = useStampingAchievementReportSumStore();
const configStore = useConfigStore();

const { dataTable, filterDate } = storeToRefs(achievementStore);

const tableKey = ref(0);
const hasLoaded = ref(false);
const isLoading = ref(false);

const onLoadData = async () => {
  if (!filterDate.value.start) {
    alert('Silakan pilih tanggal mulai terlebih dahulu.');
    return;
  }
  isLoading.value = true;
  try {
    await achievementStore.fetchDataReportSum();
    hasLoaded.value = true;
    tableKey.value++;
  } finally {
    isLoading.value = false;
  }
};

const columns: TableColumn[] = [
  { key: "date", label: "Date" },
  { key: "shift", label: "Shift" },
  { key: "patan", label: "Patan" },
  { key: "line_id", label: "Line" },
  { key: "status_plan", label: "Status Plan" },
  { key: "gsph_plan", label: "GSPH Plan" },
  { key: "gsph_actual", label: "GSPH Actual" },
  { key: "downtime_plan", label: "Downtime Plan" },
  { key: "downtime_actual", label: "Downtime Actual" },
  { key: "ideltime_plan", label: "Idletime Plan" },
  { key: "ideltime_actual", label: "Idletime Actual" },
  { key: "cycletime_plan", label: "Cycletime Plan" },
  { key: "cycletime_actual", label: "Cycletime Actual" },
  { key: "qty_plan", label: "Qty Plan" },
  { key: "qty_actual", label: "Qty Actual" },
  { key: "good_plan", label: "Good Plan" },
  { key: "good_actual", label: "Good Actual" },
  { key: "repair_plan", label: "Repair Plan" },
  { key: "repair_actual", label: "Repair Actual" },
  { key: "reject_plan", label: "Reject Plan" },
  { key: "reject_actual", label: "Reject Actual" },
];
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-2"></BaseBreadcrumb>
  <div>
    <div class="flex flex-wrap">
      <div class="flex items-center my-3 px-1 w-full gap-2 flex-wrap">

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

        <!-- Excel Export Button -->
        <a
          type="button"
          v-if="achievementStore.permissions.download"
          :href="`http://${configStore.apiUrl}/majsf_rest_api/api/report-stock/report?start=${achievementStore.filterDate.start}&end=${achievementStore.filterDate.end}`"
          target="_blank"
          class="mx-2 flex items-center gap-2 text-white bg-green-600 hover:bg-green-800 focus:outline-none focus:ring-4 focus:ring-green-300 font-medium rounded-full text-sm px-5 py-2.5 text-center"
        >
          <svg class="w-5 h-5 text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 15v2a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-2m-8 1V4m0 12-4-4m4 4 4-4"/>
          </svg>
          Excel
        </a>
      </div>
    </div>

    <!-- Table -->
    <div v-if="!hasLoaded" class="bg-white rounded-lg border border-gray-200 shadow-sm w-full">
      <span class="block px-5 py-12 text-center text-gray-400 text-sm">
        Pilih tanggal <span class="font-semibold text-indigo-500">Start & End Date</span>, lalu tekan <span class="font-semibold text-indigo-500">Load Data</span> untuk menampilkan data.
      </span>
    </div>
    <TableExcel v-else :key="tableKey" :columns="columns" :data="(dataTable as unknown as Record<string, unknown>[])" :loading="isLoading">
      <template #empty>
        <span class="px-5 py-12 text-center text-gray-400 text-sm">No Achievement Data Available untuk rentang tanggal yang dipilih.</span>
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