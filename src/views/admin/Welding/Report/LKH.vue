<script setup lang="ts">
import { onMounted, ref, shallowRef, computed, watch } from 'vue';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { useLKHStore } from '@/stores/Welding/Report/LKH';
import { storeToRefs } from "pinia";
import { useConfigStore } from '@/stores/config';
import DatePickerButton from '@/components/date/DatePickerButton.vue';

const page = ref({ title: 'Report Lembar Kerja Harian (LKH) Welding' });
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
    title: 'LKH',
    disabled: true,
    href: '#'
  }
]);

const LKHStore = useLKHStore();
const { tableData, filter, line } = storeToRefs(LKHStore);
const configStore = useConfigStore();

// Track whether user has triggered a load
const hasLoaded = ref(false);
const isLoading = ref(false);

const onChangeLine = () => {
  if (hasLoaded.value) {
    LKHStore.fetchDataReport();
  }
};

const onLoadData = async () => {
  if (!filter.value.date) {
    alert('Silakan pilih tanggal terlebih dahulu.');
    return;
  }
  isLoading.value = true;
  try {
    await LKHStore.fetchDataReport();
    hasLoaded.value = true;
    currentPage.value = 1;
  } finally {
    isLoading.value = false;
  }
};

const searchQuery = ref('');

const currentPage = ref(1);
const itemsPerPage = ref(10);
const itemsPerPageOptions = [10, 25, 50, 100];

const filteredData = computed(() => {
  if (!searchQuery.value) return tableData.value;
  
  const query = searchQuery.value.toLowerCase();
  return tableData.value.filter(item => {
    return (
      item.partNumber.toLowerCase().includes(query) ||
      item.jobNumber.toLowerCase().includes(query) ||
      item.lotSize.toString().includes(query) ||
      item.qtyKbn.toString().includes(query)
    );
  });
});

const totalPages = computed(() => {
  return Math.ceil(filteredData.value.length / itemsPerPage.value);
});

const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return filteredData.value.slice(start, end);
});

const paginationRange = computed(() => {
  const range = [];
  const delta = 2;
  
  for (let i = 1; i <= totalPages.value; i++) {
    if (
      i === 1 || 
      i === totalPages.value || 
      (i >= currentPage.value - delta && i <= currentPage.value + delta)
    ) {
      range.push(i);
    } else if (range[range.length - 1] !== '...') {
      range.push('...');
    }
  }
  
  return range;
});

const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
  }
};

const changeItemsPerPage = () => {
  currentPage.value = 1;
};

watch(searchQuery, () => {
  currentPage.value = 1;
});
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7"></BaseBreadcrumb>
  <div class="flex flex-wrap">
    <div class="w-full">
      <!-- Search Input and Items Per Page -->
      <div class="mb-4 flex items-center justify-between">
        <div class="flex flex-wrap items-center gap-4 w-full">
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
              class="block p-2.5 pl-10 text-sm text-gray-900 border border-gray-300 rounded-full w-96 bg-gray-50 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Search for part number or job number"
            />
          </div>

          <!-- Buttons -->
          <div class="flex gap-3">
            <div class="flex">
              <button class="inline-flex items-center px-4 text-sm font-medium text-center text-gray-500 bg-gray-100 border border-gray-300 rounded-s-full cursor-auto" type="button">
                Filter by Line 
              </button>
              <label for="line" class="sr-only">Choose a state</label>
              <select id="line" v-model="LKHStore.filter.line" @change="onChangeLine()" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-e-xl border-s-gray-100 border-s-2 focus:ring-blue-500 focus:border-blue-500 block">
                  <option selected disabled>Pilih Line</option>
                  <option v-for="value in line" :value="value">{{ value }}</option>
              </select>
            </div>

            <DatePickerButton v-model="filter.date" label="Tanggal" />

            <!-- Load Data Button -->
            <button
              type="button"
              @click="onLoadData"
              :disabled="isLoading || !filter.date"
              class="flex items-center gap-2 text-white bg-indigo-500 hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-300 font-medium rounded-full text-sm px-5 py-2.5 text-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isLoading ? 'Loading...' : 'Load Data' }}
            </button>

            <a 
              type="button"
              v-if="LKHStore.permissions.downloadReport"
              :href="`http://${configStore.apiUrl}/majsf_rest_api/api/inventory-lkh/lkh-export?tag=LKH-WLD&date=${LKHStore.filter.date}`"
              target="_blank"
              class="flex items-center gap-2 text-white bg-green-500 hover:bg-green-800 focus:outline-none focus:ring-4 focus:ring-green-300 font-medium rounded-full text-sm px-5 py-2.5 text-center"
            >
              <svg class="w-5 h-5 text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 15v2a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-2m-8 1V4m0 12-4-4m4 4 4-4"/>
              </svg>
              Excel
            </a>
          </div>
        </div>
      </div>

      <!-- Empty state before first load -->
      <div
        v-if="!hasLoaded"
        class="flex flex-col items-center justify-center py-20 text-gray-400 border border-dashed border-gray-300 rounded-lg bg-gray-50"
      >
        <p class="text-sm">Pilih <span class="font-semibold text-indigo-500">Tanggal</span>  dan tekan <span class="font-semibold text-indigo-500">Load Data</span> untuk menampilkan data.</p>
      </div>

      <!-- Table (only shown after first load) -->
      <template v-else>
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
                <!-- Shift 1 -->
                <th class="px-3 py-3 border bg-blue-50">Plan</th>
                <th class="px-3 py-3 border bg-blue-50">Actual</th>
                <th class="px-3 py-3 border bg-blue-50">Balance</th>
                <th class="px-3 py-3 border bg-blue-50">%</th>
                <th class="px-3 py-3 border bg-blue-50">NG</th>

                <!-- Shift 2 -->
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

                <!-- Shift 1 -->
                <td class="px-6 py-4 text-center border bg-blue-50">{{ item.shift1.plan }}</td>
                <td class="px-6 py-4 text-center border bg-blue-50">{{ item.shift1.actual }}</td>
                <td class="px-6 py-4 text-center border bg-blue-50">{{ item.shift1.balance }}</td>
                <td class="px-6 py-4 text-center border bg-blue-50 whitespace-nowrap">{{ item.shift1.percentage === '-' ? item.shift1.percentage : item.shift1.percentage + '%' }}</td>
                <td class="px-6 py-4 text-center border bg-blue-50">{{ item.shift1.ng }}</td>

                <!-- Shift 2 -->
                <td class="px-6 py-4 text-center border bg-green-50">{{ item.shift2.plan }}</td>
                <td class="px-6 py-4 text-center border bg-green-50">{{ item.shift2.actual }}</td>
                <td class="px-6 py-4 text-center border bg-green-50">{{ item.shift2.balance }}</td>
                <td class="px-6 py-4 text-center border bg-green-50 whitespace-nowrap">{{ item.shift2.percentage === '-' ? item.shift2.percentage : item.shift2.percentage + '%' }}</td>
                <td class="px-6 py-4 text-center border bg-green-50">{{ item.shift2.ng }}</td>

                <!-- Totals -->
                <td class="px-6 py-4 text-center font-semibold border bg-yellow-50">{{ item.totalProduction }}</td>
                <td class="px-6 py-4 text-center font-semibold border bg-yellow-50">{{ item.totalBalance }}</td>
                <td class="px-6 py-4 text-center font-semibold border bg-yellow-50">{{ item.totalPercentage }}%</td>
                <td class="px-6 py-4 text-center font-semibold border bg-yellow-50">{{ item.totalNg }}</td>
              </tr>

              <!-- No Results -->
              <tr v-if="filteredData.length === 0">
                <td colspan="18" class="px-6 py-8 text-center text-gray-500">
                  No results found
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Table Footer -->
        <div class="mt-4 flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="text-sm text-gray-600">
              Showing {{ ((currentPage - 1) * itemsPerPage) + 1 }} to {{ Math.min(currentPage * itemsPerPage, filteredData.length) }} of {{ filteredData.length }} results
            </div>
            <div class="text-sm text-gray-600">
              Page {{ currentPage }} of {{ totalPages }}
            </div>
            <div class="flex items-center gap-2">
              <label for="items-per-page" class="text-sm text-gray-700">Show:</label>
              <select
                v-model="itemsPerPage"
                @change="changeItemsPerPage"
                id="items-per-page"
                class="border border-gray-300 text-gray-900 text-sm rounded-lg w-16 focus:ring-blue-500 focus:border-blue-500 p-2.5"
              >
                <option v-for="option in itemsPerPageOptions" :key="option" :value="option">
                  {{ option }}
                </option>
              </select>
              <span class="text-sm text-gray-700">entries</span>
            </div>
          </div>
          
          <!-- Pagination Controls -->
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