<script setup lang="ts">
import { ref, shallowRef, onMounted, watch } from 'vue';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { useScannedSTOStore } from '@/stores/Logistik/IFP/Report/ScannedSTO';
import { storeToRefs } from 'pinia';
import { SyncOutlined, FileExcelOutlined } from '@ant-design/icons-vue';
import { initFlowbite } from 'flowbite';
import TableExcel, { type TableColumn } from '@/components/table/TableExcel.vue';
import DateRangePickerSplitButton from '@/components/date/DateRangePickerSplitButton.vue';

const page = ref({ title: 'Scanned STO' });
const breadcrumbs = shallowRef([
  {
    title: 'Logistik',
    disabled: false,
    href: '#'
  },
  {
    title: 'IFP',
    disabled: false,
    href: '#'
  },
  {
    title: 'Report',
    disabled: false,
    href: '#'
  },
  {
    title: 'Scanned STO',
    disabled: true,
    href: '#'
  }
]);

const scannedSTOStore = useScannedSTOStore();

let isLoading = ref(true);
const tableKey = ref(0);

const {
  validateDateRange,
  fetchScannedSTOData
} = scannedSTOStore;

const {
  scannedTable,
  params,
} = storeToRefs(scannedSTOStore);

const columns: TableColumn[] = [
  { key: "id_tag_ok", label: "ID Tag" },
  { key: "date", label: "Date" },
  { key: "shift", label: "Shift" },
  { key: "line_id", label: "Line" },
  { key: "part_number", label: "Part Number" },
  { key: "job_number", label: "Job Number" },
  { key: "project", label: "Project" },
  { key: "qty", label: "QTY" },
  { key: "scan_in_date", label: "Scanned Date" },
  { key: "scan_in_user", label: "Scanned User" },
];

const handleRefresh = async () => {
  isLoading.value = true;
  try {
    await validateDateRange();
    await fetchScannedSTOData();
    tableKey.value++;
  } catch (error) {
    console.error("Error refreshing data:", error);
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  try {
    initFlowbite();
    await validateDateRange();
    await fetchScannedSTOData();

    setTimeout(() => {
      isLoading.value = false;
    }, 500);
  } catch (error) {
    console.error("Error in onMounted:", error);
    isLoading.value = false;
  }
});

// Replikasi perilaku lama: begitu start & end tanggal lengkap (dari klik kalender),
// otomatis validasi ulang rentang tanggal & fetch data tanpa perlu tombol terpisah.
watch(
  () => [params.value.start, params.value.end],
  async ([start, end]) => {
    if (start) {
      await validateDateRange();
      await fetchScannedSTOData();
      tableKey.value++;
    }
  }
);
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7"></BaseBreadcrumb>

  <div class="flex flex-col gap-5">
    <div class="flex gap-6 flex-wrap">
      <div class="flex">
        <DateRangePickerSplitButton
          v-model:start="params.start"
          v-model:end="params.end"
        />
      </div>

      <a type="button"
        :href="`http://192.168.10.67/majsf_rest_api/api/scan_barcode/export_scan_sto_ifp?start=${params?.start}&end=${params?.end ? params?.end : params?.start}`"
        target="_blank"
        class="flex items-center gap-2 text-white bg-green-600 hover:bg-green-800 focus:outline-none focus:ring-4 focus:ring-green-500 font-medium rounded-full text-sm px-5 py-2.5 text-center">
        <FileExcelOutlined class="text-lg" />
        Download Excel
      </a>

      <button @click="handleRefresh"
        class="flex items-center gap-2 text-white whitespace-nowrap bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 font-medium rounded-full text-sm px-5 py-2.5 text-center hover:opacity-90 transition-opacity"
        type="button" :disabled="isLoading">
        <SyncOutlined class="text-lg" :class="{ 'animate-spin': isLoading }" />
        Refresh Data
      </button>
    </div>

    <div class="w-full max-w-10xl mx-auto">
      <TableExcel :key="tableKey" :columns="columns" :data="(scannedTable as unknown as Record<string, unknown>[])" :loading="isLoading">
        <template #empty>
          <svg class="w-16 h-16 text-gray-400 mb-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p class="text-gray-500 text-lg">No data available</p>
          <p class="text-gray-400 text-sm mt-1">Try adjusting your date range or refresh the data</p>
        </template>
      </TableExcel>
    </div>
  </div>
</template>

<style scoped>
.border-button {
  border: 1px solid #e5e7eb !important;
}

.border:deep(table) {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
}

:deep(th),
:deep(td) {
  white-space: normal !important;
  word-wrap: break-word;
  font-size: 15px !important;
  font-weight: 500 !important;
  padding: 10px 20px !important;
  vertical-align: top;
}

:deep(th:nth-child(1)),
:deep(td:nth-child(1)) {
  width: 70px;
}

:deep(th > div) {
  display: flex;
  flex-direction: column;
  width: 100%;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 4px;
}

:deep(thead input) {
  width: 100% !important;
  box-sizing: border-box;
  min-width: 0px !important;
  font-size: 15px !important;
  padding: 10px 20px !important;
  height: 30px !important;
  line-height: 1 !important;
  margin: 0 !important;
  border-radius: 4px;
  display: block;
}

:deep(th span) {
  text-align: left;
}
</style>

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
  margin: .5px;
}

.datepicker-cell.prev,
.datepicker-cell.next {
  color: #b8b8b8 !important;
}

/* Modal Transition */
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

/* Data table style */
.datatable-wrapper {
  width: 100%;
  margin-top: 1rem;
}

@media (width>=640px) {
  .datatable-wrapper .datatable-top {
    flex-direction: row-reverse;
    align-items: center;
    padding: 0rem 1.5rem;
    margin-bottom: 1rem;
  }
}

.datatable-wrapper .datatable-search .datatable-input {
  color: var(--color-gray-900);
  border: 1px solid var(--color-gray-300);
  background-color: var(--color-gray-50);
  border-radius: .5rem;
  min-width: 16rem;
  font-size: .875rem;
  display: none;
}

.datatable-wrapper .datatable-top .datatable-dropdown .datatable-selector {
  background-color: var(--color-gray-50);
  color: var(--color-gray-900);
  border: 1px solid var(--color-gray-300);
  border-radius: .5rem;
  min-width: 4rem;
  margin-right: .25rem;
  font-size: .875rem;
}

.datatable-wrapper .datatable-table thead {
  color: var(--color-gray-500);
  background-color: var(--color-gray-50);
  font-size: .90rem;
}

.datatable-wrapper thead th .datatable-input {
  color: var(--color-gray-900);
  background-color: #fff;
  width: 100px !important;
  min-width: 100px !important;
  max-width: 100px !important;
  height: 25px !important;
  margin: 5px 5px;
  font-weight: 400;
  border: 1px solid var(--color-gray-300);
  border-radius: .5rem;
}

@media (width>=640px) {
  .datatable-wrapper .datatable-bottom {
    flex-direction: row;
    align-items: center;
  }
}

.datatable-wrapper .datatable-bottom {
  flex-direction: column;
  justify-content: space-between;
  align-items: start;
  gap: 1rem;
  margin-top: 1rem;
  display: flex;
  padding: 1rem 1.5rem;
}

@media (width>=640px) {
  .datatable-wrapper .datatable-bottom {
    flex-direction: row;
    align-items: center
  }
}

.datatable-wrapper .datatable-bottom .datatable-pagination .datatable-pagination-list-item-link {
  color: var(--color-gray-500);
  border-top: 1px solid var(--color-gray-300);
  border-bottom: 1px solid var(--color-gray-300);
  border-right: 1px solid var(--color-gray-300);
  align-items: center;
  height: 2rem;
  padding-left: .75rem;
  padding-right: .75rem;
  font-size: .875rem;
  font-weight: 500;
  display: flex
}

.datatable-wrapper .datatable-bottom .datatable-pagination .datatable-pagination-list-item-link:hover {
  background-color: var(--color-gray-50);
  color: var(--color-gray-700)
}

.datatable-wrapper .datatable-bottom .datatable-pagination .datatable-pagination-list-item:first-of-type,
.datatable-wrapper .datatable-bottom .datatable-pagination .datatable-pagination-list-item:last-of-type {
  position: relative
}

.datatable-wrapper .datatable-bottom .datatable-pagination .datatable-pagination-list-item:first-of-type .datatable-pagination-list-item-link,
.datatable-wrapper .datatable-bottom .datatable-pagination .datatable-pagination-list-item:last-of-type .datatable-pagination-list-item-link,
.dark .datatable-wrapper .datatable-bottom .datatable-pagination .datatable-pagination-list-item:first-of-type .datatable-pagination-list-item-link,
.dark .datatable-wrapper .datatable-bottom .datatable-pagination .datatable-pagination-list-item:last-of-type .datatable-pagination-list-item-link {
  color: #0000
}

.datatable-wrapper .datatable-bottom .datatable-pagination .datatable-pagination-list-item:first-of-type .datatable-pagination-list-item-link:after {
  content: url("data:image/svg+xml,%3csvg aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='20' height='20' fill='none' viewBox='0 0 24 24'%3e %3cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m14 8-4 4 4 4'/%3e %3c/svg%3e");
  width: 1.3rem;
  height: 1.3rem;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%)
}

.datatable-wrapper .datatable-bottom .datatable-pagination .datatable-pagination-list-item:first-of-type .datatable-pagination-list-item-link:hover:after {
  content: url("data:image/svg+xml,%3csvg aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='20' height='20' fill='none' viewBox='0 0 24 24'%3e %3cpath stroke='%23111827' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m14 8-4 4 4 4'/%3e %3c/svg%3e")
}

.datatable-wrapper .datatable-bottom .datatable-pagination .datatable-pagination-list-item:last-of-type .datatable-pagination-list-item-link:after {
  content: url("data:image/svg+xml,%3csvg aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='20' height='20' fill='none' viewBox='0 0 24 24'%3e %3cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m10 16 4-4-4-4'/%3e %3c/svg%3e");
  width: 1.3rem;
  height: 1.3rem;
  position: absolute;
  top: 50%;
  right: 50%;
  transform: translate(50%, -50%)
}

.datatable-wrapper .datatable-bottom .datatable-pagination .datatable-pagination-list-item:last-of-type .datatable-pagination-list-item-link:hover:after {
  content: url("data:image/svg+xml,%3csvg aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='20' height='20' fill='none' viewBox='0 0 24 24'%3e %3cpath stroke='%23111827' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m10 16 4-4-4-4'/%3e %3c/svg%3e")
}

.datatable-wrapper .datatable-bottom .datatable-pagination .datatable-pagination-list-item:first-of-type .datatable-pagination-list-item-link {
  border-left: 1px solid var(--color-gray-300);
  border-top-left-radius: .5rem;
  border-bottom-left-radius: .5rem
}

.datatable-wrapper .datatable-bottom .datatable-pagination .datatable-pagination-list-item:last-of-type .datatable-pagination-list-item-link {
  border-left: 0;
  border-top-right-radius: .5rem;
  border-bottom-right-radius: .5rem
}
</style>