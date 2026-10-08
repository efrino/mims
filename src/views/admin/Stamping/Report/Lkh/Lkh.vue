<script setup lang="ts">
import { computed, watch, ref, shallowRef } from "vue";
import { useConfigStore } from "@/stores/config";
import { useLkhStore } from '@/stores/Stamping/Report/LKH';
import { useUtilityStore } from "@/stores/utility";
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { storeToRefs } from "pinia";
import DataTable from '@/components/table/DataTableFilter.vue';
import DatePickerButton from '@/components/date/DatePickerButton.vue';

import {
  FileExcelOutlined,
} from '@ant-design/icons-vue';

const utilityStore = useUtilityStore();
const { formatDate } = utilityStore

const lkhStore = useLkhStore();
const configStore = useConfigStore();

const { 
  tableRowsDaily,
  tableRowsMonthly,
  filterDate
} = storeToRefs(lkhStore);

const page = ref({ title: 'Report Lembar Kerja Harian (LKH) Stamping ' + formatDate(filterDate.value.date) });
const breadcrumbs = shallowRef([
  { title: "Report", disabled: false, href: "#" },
  { title: "Stamping", disabled: false, href: "#" },
  { title: "LKH", disabled: true, href: "#" },
]);

const tab = ref("daily");
const hasLoaded = ref(false);
const isLoading = ref(false);

const onLoadData = async () => {
  if (!filterDate.value.date) {
    alert('Silakan pilih tanggal terlebih dahulu.');
    return;
  }
  isLoading.value = true;
  try {
    await lkhStore.fetchDataReport();
    await lkhStore.generateMonthlyFromDaily();
    hasLoaded.value = true;
    currentPage.value = 1;
  } finally {
    isLoading.value = false;
  }
};

// Search functionality
const searchQuery = ref('');

// Pagination
const currentPage = ref(1);
const itemsPerPage = ref(10);
const itemsPerPageOptions = [10, 25, 50, 100];

// Computed property for filtered data  
const filteredData = computed(() => {
  if (!searchQuery.value) return tableRowsDaily.value;
  const query = searchQuery.value.toLowerCase();
  return tableRowsDaily.value.filter(item => {
    return (
      item.partNumber.toLowerCase().includes(query) ||
      item.jobNumber.toLowerCase().includes(query) ||
      item.lotSize.toString().includes(query) ||
      item.qtyKbn.toString().includes(query)
    );
  });
});

const totalPages = computed(() => Math.ceil(filteredData.value.length / itemsPerPage.value));

const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  return filteredData.value.slice(start, start + itemsPerPage.value);
});

const paginationRange = computed(() => {
  const range = [];
  const delta = 2;
  for (let i = 1; i <= totalPages.value; i++) {
    if (i === 1 || i === totalPages.value || (i >= currentPage.value - delta && i <= currentPage.value + delta)) {
      range.push(i);
    } else if (range[range.length - 1] !== '...') {
      range.push('...');
    }
  }
  return range;
});

const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) currentPage.value = page;
};

const changeItemsPerPage = () => { currentPage.value = 1; };

watch(searchQuery, () => { currentPage.value = 1; });

const columns = [
  { key: "date", label: "Date" },
  { key: "shift", label: "Shift" },
  { key: "model", label: "Model" },
  { key: "jobNumber", label: "Job Number" },
  { key: "partNumber", label: "Part Number" },
  { key: "partName", label: "Part Name" },
  { key: "qty", label: "Qty" },
  { key: "qtySap", label: "Qty SAP" },
  { key: "keterangan", label: "Keterangan" },
];
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7"></BaseBreadcrumb>
  <div>
    <div class="w-full">
      <div class="flex items-center justify-between my-3 px-3">

        <!-- Left: Search + Filter by Date + Load Data + Excel -->
        <div class="flex items-center gap-2 flex-wrap">

          <!-- Search Input -->
          <div class="relative">
            <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              v-model="searchQuery"
              type="text"
              id="table-search"
              class="block p-2.5 pl-10 text-sm text-gray-900 border border-gray-300 rounded-full w-72 bg-gray-50 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Search part number or job number"
            />
          </div>

          <!-- Filter by Date -->
          <DatePickerButton v-model="filterDate.date" label="Tanggal" />

          <!-- Load Data Button -->
          <button
            type="button"
            @click="onLoadData"
            :disabled="isLoading || !filterDate.date"
            class="flex items-center gap-2 text-white bg-indigo-500 hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-300 font-medium rounded-full text-sm px-5 py-2.5 text-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ isLoading ? 'Loading...' : 'Load Data' }}
          </button>

          <!-- Excel Export Button -->
          <a 
            type="button"
            v-if="lkhStore.permissions.downloadReport"
            :href="`http://${configStore.apiUrl}/majsf_rest_api/api/inventory-lkh/lkh-export?tag=${lkhStore.tag}&date=${lkhStore.form.date}`"
            target="_blank"
            class="flex items-center gap-2 text-white bg-green-600 hover:bg-green-800 focus:outline-none focus:ring-4 focus:ring-green-300 font-medium rounded-full text-sm px-5 py-2.5 text-center"
          >
            <FileExcelOutlined />
            Excel
          </a>
        </div>

        <!-- Right: Tabs -->
        <div>
          <v-row cols="3" elevation="10" class="justify-end mt-5">
            <v-tabs v-model="tab" color="primary" density="compact" hide-slider>
              <v-tab :color="tab === 'daily' ? 'primary' : undefined" value="daily" variant="outlined" rounded="md">Daily</v-tab>
              <v-tab :color="tab === 'monthly' ? 'primary' : undefined" value="monthly" class="mx-2" variant="outlined" rounded="md">Monthly</v-tab>
            </v-tabs>
          </v-row>
        </div>
      </div>
    </div>

    <v-window v-model="tab">
      <!-- Daily Tab -->
      <v-window-item value="daily" class="pa-4">

        <!-- Empty state before first load -->
        <div
          v-if="!hasLoaded"
          class="flex flex-col items-center justify-center py-20 text-gray-400 border border-dashed border-gray-300 rounded-lg bg-gray-50"
        >
          <p class="text-sm">Pilih <span class="font-semibold text-indigo-500">Tanggal</span> lalu tekan <span class="font-semibold text-indigo-500">Load Data</span> untuk menampilkan data.</p>
        </div>

        <template v-else>
          <!-- Table -->
          <div class="relative overflow-x-auto shadow-md sm:rounded-lg">
            <table class="w-full text-sm text-left rtl:text-right text-gray-500">
              <thead class="text-xs text-center text-gray-700 bg-gray-50">
                <tr>
                  <th rowspan="2" class="px-6 py-3 border">Part Number</th>
                  <th rowspan="2" class="px-6 py-3 border">Job Number</th>
                  <th rowspan="2" class="px-6 py-3 border">Lot Size</th>
                  <th rowspan="2" class="px-6 py-3 border">Qty / Kbn</th>
                  <th colspan="5" class="px-6 py-3 border bg-blue-100">Shift 1</th>
                  <th colspan="5" class="px-6 py-3 border bg-green-100">Shift 2</th>
                  <th rowspan="2" class="px-6 py-3 border">Total Produksi</th>
                  <th rowspan="2" class="px-6 py-3 border">Total Balance</th>
                  <th rowspan="2" class="px-6 py-3 border">Total %</th>
                  <th rowspan="2" class="px-6 py-3 border">Total NG</th>
                </tr>
                <tr>
                  <th class="px-3 py-3 border bg-blue-50">Plan</th>
                  <th class="px-3 py-3 border bg-blue-50">Actual</th>
                  <th class="px-3 py-3 border bg-blue-50">Balance</th>
                  <th class="px-3 py-3 border bg-blue-50">%</th>
                  <th class="px-3 py-3 border bg-blue-50">NG</th>
                  <th class="px-3 py-3 border bg-green-50">Plan</th>
                  <th class="px-3 py-3 border bg-green-50">Actual</th>
                  <th class="px-3 py-3 border bg-green-50">Balance</th>
                  <th class="px-3 py-3 border bg-green-50">%</th>
                  <th class="px-3 py-3 border bg-green-50">NG</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(item, index) in paginatedData"
                  :key="index"
                  class="bg-white border-b hover:bg-gray-50"
                >
                  <td class="px-6 py-4 font-medium text-gray-900 border">{{ item.partNumber }}</td>
                  <td class="px-6 py-4 border">{{ item.jobNumber }}</td>
                  <td class="px-6 py-4 text-center border">{{ item.lotSize }}</td>
                  <td class="px-6 py-4 text-center border">{{ item.qtyKbn }}</td>
                  <td class="px-6 py-4 text-center border bg-blue-50">{{ item.shift1.plan }}</td>
                  <td class="px-6 py-4 text-center border bg-blue-50">{{ item.shift1.actual }}</td>
                  <td class="px-6 py-4 text-center border bg-blue-50">{{ item.shift1.balance }}</td>
                  <td class="px-6 py-4 text-center border bg-blue-50 whitespace-nowrap">{{ item.shift1.percentage === '-' ? item.shift1.percentage : item.shift1.percentage + '%' }}</td>
                  <td class="px-6 py-4 text-center border bg-blue-50">{{ item.shift1.ng }}</td>
                  <td class="px-6 py-4 text-center border bg-green-50">{{ item.shift2.plan }}</td>
                  <td class="px-6 py-4 text-center border bg-green-50">{{ item.shift2.actual }}</td>
                  <td class="px-6 py-4 text-center border bg-green-50">{{ item.shift2.balance }}</td>
                  <td class="px-6 py-4 text-center border bg-green-50 whitespace-nowrap">{{ item.shift2.percentage === '-' ? item.shift2.percentage : item.shift2.percentage + '%' }}</td>
                  <td class="px-6 py-4 text-center border bg-green-50">{{ item.shift2.ng }}</td>
                  <td class="px-6 py-4 text-center font-semibold border bg-yellow-50">{{ item.totalProduction }}</td>
                  <td class="px-6 py-4 text-center font-semibold border bg-yellow-50">{{ item.totalBalance }}</td>
                  <td class="px-6 py-4 text-center font-semibold border bg-yellow-50">
                    <span v-if="item.totalPercentage === '-'">-</span>
                    <span v-else>{{ item.totalPercentage }}%</span>
                  </td>
                  <td class="px-6 py-4 text-center font-semibold border bg-yellow-50">{{ item.totalNg }}</td>
                </tr>
                <tr v-if="filteredData.length === 0">
                  <td colspan="18" class="px-6 py-8 text-center text-gray-500">No results found</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Table Footer -->
          <div class="mt-4 flex items-center justify-between">
            <!-- Results Counter (left) -->
            <div class="flex items-center gap-4">
              <div class="flex gap-3 text-sm text-gray-600">
                <span>
                  Showing {{ ((currentPage - 1) * itemsPerPage) + 1 }} to {{ Math.min(currentPage * itemsPerPage, filteredData.length) }} of {{ filteredData.length }} results
                </span>
                <span>Page {{ currentPage }} of {{ totalPages }}</span>
              </div>
              <!-- Show entries -->
              <div class="flex items-center gap-1">
                <label for="items-per-page" class="text-sm text-gray-700">Show:</label>
                <select
                  v-model="itemsPerPage"
                  @change="changeItemsPerPage"
                  id="items-per-page"
                  class="border border-gray-300 text-gray-900 text-sm rounded-lg w-16 focus:ring-blue-500 focus:border-blue-500 p-2.5"
                >
                  <option v-for="option in itemsPerPageOptions" :key="option" :value="option">{{ option }}</option>
                </select>
                <span class="text-sm text-gray-700">entries</span>
              </div>
            </div>

            <!-- Pagination Controls (right) -->
            <nav class="flex items-center gap-2" aria-label="Pagination">
              <button
                @click="goToPage(currentPage - 1)"
                :disabled="currentPage === 1"
                class="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <template v-for="(page, index) in paginationRange" :key="index">
                <button
                  v-if="page !== '...'"
                  @click="goToPage(page as number)"
                  :class="[
                    'px-3 py-2 text-sm font-medium rounded-lg',
                    currentPage === page
                      ? 'text-white bg-blue-600 hover:bg-blue-700'
                      : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-100'
                  ]"
                >
                  {{ page }}
                </button>
                <span v-else class="px-2 text-gray-500">...</span>
              </template>
              <button
                @click="goToPage(currentPage + 1)"
                :disabled="currentPage === totalPages"
                class="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </nav>
          </div>
        </template>
      </v-window-item>

      <!-- Monthly Tab -->
      <v-window-item value="monthly" class="pa-4">
        <div
          v-if="!hasLoaded"
          class="flex flex-col items-center justify-center py-20 text-gray-400 border border-dashed border-gray-300 rounded-lg bg-gray-50"
        >
          <p class="text-sm">Pilih <span class="font-semibold text-indigo-500">Tanggal</span> lalu tekan <span class="font-semibold text-indigo-500">Load Data</span> untuk menampilkan data.</p>
        </div>
        <DataTable
          v-else-if="tableRowsMonthly.length"
          :columns="columns" 
          :rows="tableRowsMonthly"
          :no-data-text="'No Achievement Data Available'"
        />
        <div
          v-else
          class="flex flex-col items-center justify-center py-20 text-gray-400 border border-dashed border-gray-300 rounded-lg bg-gray-50"
        >
          <p class="text-sm">No monthly data available untuk tanggal yang dipilih.</p>
        </div>
      </v-window-item>
    </v-window>
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
.datepicker-cell.prev,
.datepicker-cell.next {
  color: #b8b8b8 !important;
}
.relative.overflow-x-auto table td,
.relative.overflow-x-auto table th {
  white-space: nowrap !important;
}

/* Tambahan untuk memastikan tabel bisa di-scroll horizontal */
.relative.overflow-x-auto {
  overflow-x: auto !important;
  overflow-y: visible !important;
}

/* Optional: Atur min-width untuk kolom tertentu jika perlu */
.relative.overflow-x-auto table td {
  min-width: 100px; /* Sesuaikan dengan kebutuhan */
}
</style>