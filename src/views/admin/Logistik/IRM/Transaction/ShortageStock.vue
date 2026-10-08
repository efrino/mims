<script setup lang="ts">
import { ref, shallowRef } from 'vue';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import TableExcel, { type TableColumn } from '@/components/table/TableExcel.vue';
import { useShortageStock } from '@/stores/Logistik/IRM/Transaction/ShortageStock';
import { storeToRefs } from 'pinia';
import DateRangePickerSplitButton from '@/components/date/DateRangePickerSplitButton.vue';

const page = ref({ title: 'Shortage Stock' });
const breadcrumbs = shallowRef([
  {
    title: 'Logistik',
    disabled: false,
    href: '#'
  },
  {
    title: 'IRM',
    disabled: false,
    href: '#'
  },
  {
    title: 'Transaction',
    disabled: false,
    href: '#'
  },
  {
    title: 'Shortage Stock',
    disabled: true,
    href: '#'
  }
]);

const storeStock = useShortageStock();
const { filterDate, dataTable } = storeToRefs(storeStock);
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
    await storeStock.fetchData();
    hasLoaded.value = true;
    tableKey.value++;
  } finally {
    isLoading.value = false;
  }
};

const columns: TableColumn[] = [
  { key: "date", label: "Date" },
  { key: "shift", label: "Shift" },
  { key: "line_id", label: "Line" },
  { key: "part_number", label: "Part Number" },
  { key: "part_number_rm", label: "Material Number" },
  { key: "qty_plan", label: "Qty Plan", align: "center" },
  { key: "qty_plan_rm", label: "Qty Plan RM", align: "center" },
  { key: "stock_sap", label: "Stock SAP", align: "center" },
  { key: "user_create", label: "User Upload" },
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
      :key="tableKey"
      :columns="columns"
      :data="(dataTable as unknown as Record<string, unknown>[])"
    >
      <template #empty>
        <i class="mdi mdi-table-off text-3xl block mb-2 text-gray-300" />
        <span class="text-sm text-gray-400">No Shortage Stock Data Available</span>
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
      <p class="text-sm">No Shortage Stock Data Available untuk rentang tanggal yang dipilih.</p>
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
