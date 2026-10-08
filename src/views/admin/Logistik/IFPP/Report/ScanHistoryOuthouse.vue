<script setup lang="ts">
import { ref, shallowRef, computed, onMounted } from 'vue';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { useScanHistoryIFPPStore } from '@/stores/Logistik/IFPP/Report/ScanHistory';
import { useNotificationStore } from '@/stores/notification';
import { storeToRefs } from 'pinia';
import type { ScanMode } from '@/types/Logistik/IFPP/Report/ScanHistory';

const page = ref({ title: 'History Scan Outhouse' });
const breadcrumbs = shallowRef([
  { title: 'Logistik', disabled: false, href: '#' },
  { title: 'IFPP', disabled: false, href: '#' },
  { title: 'Report', disabled: false, href: '#' },
  { title: 'History Scan Outhouse', disabled: true, href: '#' }
]);

const scanHistoryStore = useScanHistoryIFPPStore();
const notificationStore = useNotificationStore();
const { scanFilter, table } = storeToRefs(scanHistoryStore);

const searchQuery = ref('');
const sortColumn = ref('');
const sortDirection = ref<'asc' | 'desc'>('asc');

const sortTable = (column: string) => {
  if (sortColumn.value === column) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortColumn.value = column;
    sortDirection.value = 'asc';
  }
};

const filteredItems = computed(() => {
  let items = table.value.items;

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    items = items.filter((item) =>
      String(item.part_number ?? '').toLowerCase().includes(query) ||
      String(item.job_number ?? '').toLowerCase().includes(query)
    );
  }

  if (sortColumn.value) {
    items = [...items].sort((a, b) => {
      const valA = String(a[sortColumn.value] ?? '');
      const valB = String(b[sortColumn.value] ?? '');
      return sortDirection.value === 'asc'
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    });
  }

  return items;
});

const rowsPerPage = ref(10);
const currentPage = ref(1);
const rowsOptions = [10, 25, 50, 100];
const totalPages = computed(() => Math.ceil(filteredItems.value.length / rowsPerPage.value));

const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * rowsPerPage.value;
  return filteredItems.value.slice(start, start + rowsPerPage.value);
});

const handleFilterChange = async (mode: ScanMode) => {
  currentPage.value = 1;
  searchQuery.value = '';
  await scanHistoryStore.fetchScanHistoryOuthouse(mode);
};

onMounted(async () => {
  await scanHistoryStore.fetchScanHistoryOuthouse();
});
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7" />

  <div class="flex flex-col gap-5">
    <div class="w-full max-w-10xl mx-auto simple-dt-custom">

      <div class="flex justify-center mb-6">
        <div class="inline-flex items-center bg-gray-100 rounded-2xl p-1.5 gap-1.5 shadow-inner">
          <button
            type="button"
            @click="handleFilterChange('IN')"
            :class="scanFilter === 'IN'
              ? 'bg-gradient-to-r from-emerald-400 to-green-500 text-white shadow-md shadow-green-200'
              : 'text-gray-500 hover:text-green-600 hover:bg-white/60'"
            class="px-6 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 focus:outline-none flex items-center gap-2"
          >
            <span
              :class="scanFilter === 'IN' ? 'bg-white/30' : 'bg-green-100'"
              class="w-2 h-2 rounded-full inline-block"
            />
            Scan IN
          </button>
          <button
            type="button"
            @click="handleFilterChange('OUT')"
            :class="scanFilter === 'OUT'
              ? 'bg-gradient-to-r from-rose-400 to-red-500 text-white shadow-md shadow-red-200'
              : 'text-gray-500 hover:text-red-600 hover:bg-white/60'"
            class="px-6 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 focus:outline-none flex items-center gap-2"
          >
            <span
              :class="scanFilter === 'OUT' ? 'bg-white/30' : 'bg-red-100'"
              class="w-2 h-2 rounded-full inline-block"
            />
            Scan OUT
          </button>
        </div>
      </div>

      <div class="flex gap-4 flex-wrap items-center justify-between mb-4">
        <div class="relative">
          <div class="absolute inset-y-0 start-0 flex items-center pl-3 pointer-events-none">
            <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            v-model="searchQuery"
            @input="currentPage = 1"
            type="text"
            class="block p-2.5 pl-10 text-sm text-gray-900 border border-gray-300 rounded-full w-80 bg-gray-50 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Search part number / job number"
          />
        </div>

        <button
          type="button"
          class="flex items-center gap-2 text-white bg-gradient-to-r from-green-400 via-green-500 to-green-600 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-green-300 font-medium rounded-full text-sm px-5 py-2.5"
        >
          <svg class="w-5 h-5 text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
            fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M10 3v4a1 1 0 0 1-1 1H5m4 8h6m-6-4h6m4-8v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7.914a1 1 0 0 1 .293-.707l3.914-3.914A1 1 0 0 1 9.914 3H18a1 1 0 0 1 1 1Z" />
          </svg>
          Report Excel
        </button>
      </div>

      <table class="w-full text-sm rtl:text-right text-gray-500 text-center">
        <thead class="text-gray-500 bg-gray-50">
          <tr>
            <th scope="col" class="cursor-pointer transition-colors px-6 py-3" @click="sortTable('part_number')">
              <div class="flex items-center justify-center">
                Part Number
                <svg v-if="sortColumn === 'part_number'" class="w-4 h-4 ms-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="sortDirection === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'" />
                </svg>
                <svg v-else class="w-4 h-4 ms-1 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 15l4 4 4-4m0-6l-4-4-4 4" />
                </svg>
              </div>
            </th>

            <th scope="col" class="cursor-pointer transition-colors px-6 py-3" @click="sortTable('job_number')">
              <div class="flex items-center justify-center">
                Job Number
                <svg v-if="sortColumn === 'job_number'" class="w-4 h-4 ms-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="sortDirection === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'" />
                </svg>
                <svg v-else class="w-4 h-4 ms-1 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 15l4 4 4-4m0-6l-4-4-4 4" />
                </svg>
              </div>
            </th>

            <th
              v-if="scanFilter !== 'OUT'"
              scope="col"
              class="cursor-pointer transition-colors px-6 py-3"
              @click="sortTable('qty')"
            >
              <div class="flex items-center justify-center">
                QTY IN
                <svg v-if="sortColumn === 'qty'" class="w-4 h-4 ms-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="sortDirection === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'" />
                </svg>
                <svg v-else class="w-4 h-4 ms-1 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 15l4 4 4-4m0-6l-4-4-4 4" />
                </svg>
              </div>
            </th>

            <th scope="col" class="cursor-pointer transition-colors px-6 py-3" @click="sortTable('qty_out')">
              <div class="flex items-center justify-center">
                QTY OUT
                <svg v-if="sortColumn === 'qty_out'" class="w-4 h-4 ms-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="sortDirection === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'" />
                </svg>
                <svg v-else class="w-4 h-4 ms-1 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 15l4 4 4-4m0-6l-4-4-4 4" />
                </svg>
              </div>
            </th>

            <th
              scope="col"
              class="cursor-pointer transition-colors px-6 py-3"
              @click="sortTable(scanFilter === 'OUT' ? 'scan_out_date' : 'scan_in_date')"
            >
              <div class="flex items-center justify-center">
                {{ scanFilter === 'OUT' ? 'Scan Out Date' : 'Scan In Date' }}
                <svg v-if="sortColumn === (scanFilter === 'OUT' ? 'scan_out_date' : 'scan_in_date')" class="w-4 h-4 ms-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="sortDirection === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'" />
                </svg>
                <svg v-else class="w-4 h-4 ms-1 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 15l4 4 4-4m0-6l-4-4-4 4" />
                </svg>
              </div>
            </th>

            <th
              scope="col"
              class="cursor-pointer transition-colors px-6 py-3"
              @click="sortTable(scanFilter === 'OUT' ? 'scan_out_user' : 'scan_in_user')"
            >
              <div class="flex items-center justify-center">
                {{ scanFilter === 'OUT' ? 'Scan Out User' : 'Scan In User' }}
                <svg v-if="sortColumn === (scanFilter === 'OUT' ? 'scan_out_user' : 'scan_in_user')" class="w-4 h-4 ms-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="sortDirection === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'" />
                </svg>
                <svg v-else class="w-4 h-4 ms-1 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 15l4 4 4-4m0-6l-4-4-4 4" />
                </svg>
              </div>
            </th>
          </tr>
        </thead>

        <tbody class="font-medium">
          <tr v-if="notificationStore.loading">
            <td :colspan="scanFilter === 'OUT' ? 5 : 6" class="px-6 py-10 text-center">
              <div class="flex flex-col items-center justify-center">
                <svg aria-hidden="true" class="w-8 h-8 text-gray-200 animate-spin fill-blue-600" viewBox="0 0 100 101" fill="none">
                  <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor" />
                  <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill" />
                </svg>
                <span class="mt-2 text-gray-500">Loading data...</span>
              </div>
            </td>
          </tr>

          <template v-else-if="paginatedItems.length > 0">
            <tr
              v-for="(item, index) in paginatedItems"
              :key="index"
              class="odd:bg-white even:bg-gray-50 border-b hover:bg-blue-50! border-gray-200"
            >
              <td class="px-6 py-4 font-medium text-gray-900">{{ item.part_number }}</td>
              <td class="px-6 py-4 font-medium text-gray-900">{{ item.job_number }}</td>
              <td v-if="scanFilter !== 'OUT'" class="px-6 py-4 font-medium text-gray-900">{{ item.qty }}</td>
              <td class="px-6 py-4 font-medium text-gray-900">{{ item.qty_out }}</td>
              <td class="px-6 py-4 font-medium text-gray-900">{{ scanFilter === 'OUT' ? item.scan_out_date : item.scan_in_date }}</td>
              <td class="px-6 py-4 font-medium text-gray-900">{{ scanFilter === 'OUT' ? item.scan_out_user : item.scan_in_user }}</td>
            </tr>
          </template>

          <tr v-else>
            <td :colspan="scanFilter === 'OUT' ? 5 : 6" class="px-6 py-10 text-center text-gray-500 bg-gray-50">
              <div class="flex flex-col items-center justify-center">
                <svg class="w-10 h-10 mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>No data found matching your search.</p>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div
        v-if="!notificationStore.loading && filteredItems.length > 0"
        class="flex flex-col md:flex-row items-center justify-between p-4 border-t border-gray-200 bg-gray-50"
      >
        <div class="flex items-center gap-2 mb-4 md:mb-0">
          <span class="text-sm text-gray-700">Rows per page:</span>
          <select
            v-model="rowsPerPage"
            @change="currentPage = 1"
            class="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2"
          >
            <option v-for="opt in rowsOptions" :key="opt" :value="opt">{{ opt }}</option>
          </select>
        </div>

        <span class="text-sm text-gray-700 mb-4 md:mb-0">
          Showing
          <span class="font-semibold text-gray-900">{{ (currentPage - 1) * rowsPerPage + 1 }}</span>
          to
          <span class="font-semibold text-gray-900">{{ Math.min(currentPage * rowsPerPage, filteredItems.length) }}</span>
          of
          <span class="font-semibold text-gray-900">{{ filteredItems.length }}</span> Entries
        </span>

        <div class="flex items-center gap-2">
          <button
            @click="currentPage--"
            :disabled="currentPage === 1"
            class="px-3 py-1 text-sm font-medium text-gray-600 border border-gray-300 rounded disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            Prev
          </button>
          <span class="text-sm text-gray-700">Page {{ currentPage }} of {{ totalPages }}</span>
          <button
            @click="currentPage++"
            :disabled="currentPage === totalPages"
            class="px-3 py-1 text-sm font-medium text-gray-600 border border-gray-300 rounded disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
:deep(th),
:deep(td) {
  white-space: normal !important;
  word-wrap: break-word;
  font-size: 15px !important;
  font-weight: 500 !important;
  padding: 10px 20px !important;
  vertical-align: top;
}
</style>

<style>
.simple-dt-custom {
  overflow-x: auto;
}

.border {
  border: 1px solid #e5e7eb !important;
}
</style>