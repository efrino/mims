<script setup lang="ts">
import { onMounted, ref, shallowRef, computed, watch } from 'vue';
import { useRundownStore } from '@/stores/Logistik/IFP/Transaction/RundownExcel';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { storeToRefs } from 'pinia';

const page = ref({ title: 'Rundown IFP-INHOUSE' });
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
    title: 'Transaction',
    disabled: false,
    href: '#'
  },
  {
    title: 'Rundown IFP',
    disabled: true,
    href: '#'
  }
]);

const rundownStore = useRundownStore();

const {
  updateRundownExcelToDB,
  deleteRundownDB,
  fetchPartIFP,
} = rundownStore

const {
  dialog,
  urlExport,
  dataTable,
  customers,
  destination,
  reportUrl,
} = storeToRefs(rundownStore)

const confirmDeleteRundown = async (location: any) => {
  deleteRundownDB(location);
  dialog.value.deleteRundown = false;
};

const searchQuery = ref('');
let isLoading = ref(true);
const currentPage = ref(1);
const rowsPerPage = ref(10);
const rowsOptions = [5, 10, 15, 20, 25];
const sortColumn = ref('');
const sortDirection = ref<'asc' | 'desc'>('asc');
const strengthFilter = ref('');

const sortTable = (columnKey: string) => {
  if (sortColumn.value === columnKey) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortColumn.value = columnKey;
    sortDirection.value = 'asc';
  }
};

const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * rowsPerPage.value;
  const end = start + rowsPerPage.value;
  return filteredItems.value.slice(start, end);
});

const totalPages = computed(() => {
  return Math.ceil(filteredItems.value.length / rowsPerPage.value);
});

const filteredItems = computed(() => {
  let items = Array.isArray(dataTable.value) ? [...dataTable.value] : [];

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    items = items.filter((item: any) => {
      return (
        (item.MATNR && item.MATNR.toString().toLowerCase().includes(query)) ||
        (item.MAKTX && item.MAKTX.toString().toLowerCase().includes(query))
      );
    });
  }

  if (destination.value && destination.value !== '' && destination.value !== 'All') {
    const dest = destination.value;
    items = items.filter((item: any) => {
      return (
        (item.DEST1 && item.DEST1 === dest) ||
        (item.DEST2 && item.DEST2 === dest) ||
        (item.DEST3 && item.DEST3 === dest)
      );
    });
  }

  if (sortColumn.value) {
    items.sort((a: any, b: any) => {
      let valA = a[sortColumn.value];
      let valB = b[sortColumn.value];

      if (valA == null) valA = '';
      if (valB == null) valB = '';

      const isNumber = !isNaN(parseFloat(valA)) && isFinite(valA) && !isNaN(parseFloat(valB)) && isFinite(valB);

      if (isNumber) {
        valA = Number(valA);
        valB = Number(valB);
      } else {
        valA = valA.toString().toLowerCase();
        valB = valB.toString().toLowerCase();
      }

      if (valA < valB) return sortDirection.value === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection.value === 'asc' ? 1 : -1;
      return 0;
    });
  }

  if (strengthFilter.value) {
    const limit = parseFloat(strengthFilter.value);
    items = items.filter((item: any) => {
      const strengthVal = parseFloat(item.ZSTRENGTH || 0);
      return strengthVal < limit;
    });
  }

  return items;
});

watch([searchQuery, destination, rowsPerPage], () => {
  currentPage.value = 1;
});

onMounted(async () => {
  isLoading.value = true;
  try {
    await fetchPartIFP();
  } catch (error) {
    console.error("Error fetching data:", error);
  } finally {
    isLoading.value = false;
  }
});
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7"></BaseBreadcrumb>
  <div class="flex flex-col gap-5 ">
    <!-- Button -->
    <div class="flex gap-6 flex-wrap justify-space-between">
      <!-- Rundown  -->
      <div class="flex gap-6 flex-wrap">
        <button @click.stop="updateRundownExcelToDB('IFP')"
          class="flex items-center gap-2 text-white  bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-full text-sm px-5 py-2.5 text-center"
          type="button">
          <svg class="w-5 h-5 text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
            fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 15v2a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-2M12 4v12m0-12 4 4m-4-4L8 8" />
          </svg>
          Upload Rundown IFP
        </button>

        <button @click="dialog.deleteRundown = true"
          class="flex items-center gap-2 text-white bg-gradient-to-r from-red-400 via-red-500 to-red-600 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-red-300 dark:focus:ring-red-800 font-medium rounded-full text-sm px-5 py-2.5 text-center"
          type="button">
          <svg class="w-5 h-5 text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
            fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M5 7h14m-9 3v8m4-8v8M10 3h4a1 1 0 0 1 1 1v3H9V4a1 1 0 0 1 1-1ZM6 7h12v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7Z" />
          </svg>
          Delete Rundown IFP
        </button>
      </div>

      <div class="flex gap-6 flex-wrap">
        <a :href="urlExport.kritis" target="_blank"
          class="flex items-center gap-2 text-white bg-gradient-to-r from-green-400 via-green-500 to-green-600 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-green-300 dark:focus:ring-green-800 font-medium rounded-full text-sm px-5 py-2.5 text-center decoration-0"
          role="button">
          <svg class="w-5 h-5 text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
            fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M10 3v4a1 1 0 0 1-1 1H5m4 8h6m-6-4h6m4-8v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7.914a1 1 0 0 1 .293-.707l3.914-3.914A1 1 0 0 1 9.914 3H18a1 1 0 0 1 1 1Z" />
          </svg>
          Kritis Items
        </a>

        <a :href="urlExport.over" target="_blank"
          class="flex items-center gap-2 text-white bg-gradient-to-r from-green-400 via-green-500 to-green-600 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-green-300 dark:focus:ring-green-800 font-medium rounded-full text-sm px-5 py-2.5 text-center decoration-0"
          role="button">
          <svg class="w-5 h-5 text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
            fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M10 3v4a1 1 0 0 1-1 1H5m4 8h6m-6-4h6m4-8v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7.914a1 1 0 0 1 .293-.707l3.914-3.914A1 1 0 0 1 9.914 3H18a1 1 0 0 1 1 1Z" />
          </svg>
          Over Items
        </a>
      </div>
    </div>

    <!-- Table -->
    <div class="w-full max-w-10xl mx-auto simple-dt-custom">
      <div class="flex gap-6 flex-wrap justify-space-between pa-4">
        <!-- Search -->
        <div class="relative flex gap-6 flex-wrap">
          <div class="absolute inset-y-0 start-0 flex items-center pl-3 pointer-events-none">
            <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input v-model="searchQuery" type="text" id="table-search"
            class="block p-2.5 pl-10 text-sm text-gray-900 border border-gray-300 rounded-full w-96 bg-gray-50 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Search for part number">
        </div>

        <!-- Select & Button Report -->
        <div class="flex gap-6 flex-wrap">
          <select v-model="destination" class="block w-76 p-2 text-sm border border-gray-300 rounded-lg bg-gray-50
                  focus:ring-blue-500 focus:border-blue-500">
            <!-- Placeholder -->
            <option disabled value="">
              Pilih Customer
            </option>

            <!-- Options -->
            <option v-for="item in customers" :key="item" :value="item">
              {{ item }}
            </option>
          </select>

          <a :href="reportUrl" target="_blank"
            class="flex items-center gap-2 text-white bg-gradient-to-r from-green-400 via-green-500 to-green-600 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-green-300 dark:focus:ring-green-800 font-medium rounded-full text-sm px-5 py-2.5 text-center decoration-0"
            role="button">
            <svg class="w-5 h-5 text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
              fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M10 3v4a1 1 0 0 1-1 1H5m4 8h6m-6-4h6m4-8v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7.914a1 1 0 0 1 .293-.707l3.914-3.914A1 1 0 0 1 9.914 3H18a1 1 0 0 1 1 1Z" />
            </svg>
            Report Excel
          </a>
        </div>
      </div>


      <table id="rundown-table" class="w-full text-sm rtl:text-right text-gray-500 text-center">
        <thead class="text-gray-500 bg-gray-50">
          <tr>
            <th scope="col" class="cursor-pointer transition-colors px-6 py-3" @click="sortTable('MATNR')">
              <div class="flex items-center justify-center">
                Part Number
                <svg v-if="sortColumn === 'MATNR'" class="w-4 h-4 ms-1" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    :d="sortDirection === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'" />
                </svg>
                <svg v-else class="w-4 h-4 ms-1 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M8 15l4 4 4-4m0-6l-4-4-4 4" />
                </svg>
              </div>
            </th>

            <th scope="col" class="cursor-pointer transition-colors px-6 py-3" @click="sortTable('MAKTX')">
              <div class="flex items-center justify-center">
                Part Name
                <svg v-if="sortColumn === 'MAKTX'" class="w-4 h-4 ms-1" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    :d="sortDirection === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'" />
                </svg>
                <svg v-else class="w-4 h-4 ms-1 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M8 15l4 4 4-4m0-6l-4-4-4 4" />
                </svg>
              </div>
            </th>

            <th scope="col" class="cursor-pointer transition-colors px-6 py-3" @click="sortTable('BISMT')">
              <div class="flex items-center justify-center">
                Job Number
                <svg v-if="sortColumn === 'BISMT'" class="w-4 h-4 ms-1" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    :d="sortDirection === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'" />
                </svg>
                <svg v-else class="w-4 h-4 ms-1 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M8 15l4 4 4-4m0-6l-4-4-4 4" />
                </svg>
              </div>
            </th>

            <th scope="col" class="cursor-pointer transition-colors px-6 py-3" @click="sortTable('ZLOC')">
              <div class="flex items-center justify-center">
                Routing
                <svg v-if="sortColumn === 'ZLOC'" class="w-4 h-4 ms-1" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    :d="sortDirection === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'" />
                </svg>
                <svg v-else class="w-4 h-4 ms-1 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M8 15l4 4 4-4m0-6l-4-4-4 4" />
                </svg>
              </div>
            </th>

            <th scope="col" class="cursor-pointer transition-colors px-6 py-3" @click="sortTable('BEHMG')">
              <div class="flex items-center justify-center">
                Qty/Kanban
                <svg v-if="sortColumn === 'BEHMG'" class="w-4 h-4 ms-1" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    :d="sortDirection === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'" />
                </svg>
                <svg v-else class="w-4 h-4 ms-1 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M8 15l4 4 4-4m0-6l-4-4-4 4" />
                </svg>
              </div>
            </th>

            <th scope="col" class="cursor-pointer transition-colors px-6 py-3" @click="sortTable('ZPLNPH')">
              <div class="flex items-center justify-center">
                Plan/Hour
                <svg v-if="sortColumn === 'ZPLNPH'" class="w-4 h-4 ms-1" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    :d="sortDirection === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'" />
                </svg>
                <svg v-else class="w-4 h-4 ms-1 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M8 15l4 4 4-4m0-6l-4-4-4 4" />
                </svg>
              </div>
            </th>

            <th scope="col" class="cursor-pointer transition-colors px-6 py-3" @click="sortTable('LABST')">
              <div class="flex items-center justify-center">
                Stock
                <svg v-if="sortColumn === 'LABST'" class="w-4 h-4 ms-1" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    :d="sortDirection === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'" />
                </svg>
                <svg v-else class="w-4 h-4 ms-1 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M8 15l4 4 4-4m0-6l-4-4-4 4" />
                </svg>
              </div>
            </th>

            <th scope="col" class="px-4 py-3 cursor-pointer min-w-[120px]" @click="sortTable('ZSTRENGTH')">
              <div class="flex flex-col gap-2">
                <div class="flex items-center justify-between">
                  <span class="font-semibold">Strength</span>

                  <span v-if="sortColumn === 'ZSTRENGTH'">
                    <svg v-if="sortDirection === 'asc'" class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M5 10l5-5 5 5H5z" />
                    </svg>
                    <svg v-else class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M5 10l5 5-5-5H5z" />
                    </svg>
                  </span>
                </div>

                <input v-model="strengthFilter" @click.stop type="number" placeholder="Less than"
                  class="w-full px-2 py-1 text-xs rounded font-normal text-gray-700 bg-white border-b border-gray-300 focus:border-blue-500 focus:outline-none placeholder-gray-400" />
              </div>
            </th>

            <th scope="col" class="cursor-pointer transition-colors px-6 py-3" @click="sortTable('DEST1')">
              <div class="flex items-center justify-center">
                Destination I
                <svg v-if="sortColumn === 'DEST1'" class="w-4 h-4 ms-1" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    :d="sortDirection === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'" />
                </svg>
                <svg v-else class="w-4 h-4 ms-1 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M8 15l4 4 4-4m0-6l-4-4-4 4" />
                </svg>
              </div>
            </th>

            <th scope="col" class="cursor-pointer transition-colors px-6 py-3" @click="sortTable('DEST2')">
              <div class="flex items-center justify-center">
                Destination II
                <svg v-if="sortColumn === 'DEST2'" class="w-4 h-4 ms-1" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    :d="sortDirection === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'" />
                </svg>
                <svg v-else class="w-4 h-4 ms-1 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M8 15l4 4 4-4m0-6l-4-4-4 4" />
                </svg>
              </div>
            </th>

            <th scope="col" class="cursor-pointer transition-colors px-6 py-3" @click="sortTable('DEST3')">
              <div class="flex items-center justify-center">
                Destination III
                <svg v-if="sortColumn === 'DEST3'" class="w-4 h-4 ms-1" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    :d="sortDirection === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'" />
                </svg>
                <svg v-else class="w-4 h-4 ms-1 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M8 15l4 4 4-4m0-6l-4-4-4 4" />
                </svg>
              </div>
            </th>
          </tr>
        </thead>
        <tbody class="font-medium">
          <tr v-if="isLoading">
            <td colspan="11" class="px-6 py-10 text-center">
              <div class="flex flex-col items-center justify-center">
                <svg aria-hidden="true" class="w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600"
                  viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                    fill="currentColor" />
                  <path
                    d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                    fill="currentFill" />
                </svg>
                <span class="mt-2 text-gray-500">Loading data...</span>
              </div>
            </td>
          </tr>

          <tr v-else-if="paginatedItems.length > 0" v-for="(value, index) in paginatedItems" :key="index"
            class="odd:bg-white odd:dark:bg-gray-900 even:bg-gray-50 even:dark:bg-gray-800 border-b hover:bg-blue-50! border-gray-200">
            <td class="px-6 py-4 font-medium text-gray-900">
              {{ value.MATNR }}
            </td>
            <td class="px-6 py-4 font-medium text-gray-900">
              {{ value.MAKTX }}
            </td>
            <td class="px-6 py-4 font-medium text-gray-900">
              {{ value.BISMT }}
            </td>
            <td class="px-6 py-4 font-medium text-gray-900">
              {{ value.ZLOC }}
            </td>
            <td class="px-6 py-4 font-medium text-gray-900">
              {{ value.BEHMG }}
            </td>
            <td class="px-6 py-4 font-medium text-gray-900">
              {{ value.ZPLNPH }}
            </td>
            <td class="px-6 py-4 font-medium text-gray-900">
              {{ value.LABST }}
            </td>
            <td class="px-6 py-4 font-medium text-gray-900">
              {{ value.ZSTRENGTH }}
            </td>
            <td class="px-6 py-4 font-medium text-gray-900">
              {{ value.DEST1 }}
            </td>
            <td class="px-6 py-4 font-medium text-gray-900">
              {{ value.DEST2 }}
            </td>
            <td class="px-6 py-4 font-medium text-gray-900">
              {{ value.DEST3 }}
            </td>
          </tr>
          <tr v-else>
            <td colspan="11" class="px-6 py-10 text-center text-gray-500 bg-gray-50">
              <div class="flex flex-col items-center justify-center">
                <svg class="w-10 h-10 mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <p>No data found matching your search.</p>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <!-- Footer Table -->
      <div v-if="!isLoading && filteredItems.length > 0"
        class="flex flex-col md:flex-row items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
        <div class="flex items-center gap-2 mb-4 md:mb-0">
          <span class="text-sm text-gray-700">Rows per page:</span>
          <select v-model="rowsPerPage"
            class="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-3">
            <option v-for="opt in rowsOptions" :key="opt" :value="opt">{{ opt }}</option>
          </select>
        </div>
        <span class="text-sm text-gray-700 mb-4 md:mb-0">
          Showing <span class="font-semibold text-gray-900">{{ (currentPage - 1) * rowsPerPage + 1 }}</span>
          to <span class="font-semibold text-gray-900">{{ Math.min(currentPage * rowsPerPage, filteredItems.length)
          }}</span>
          of <span class="font-semibold text-gray-900">{{ filteredItems.length }}</span> Entries
        </span>

        <div class="flex items-center gap-2">
          <button @click="currentPage--" :disabled="currentPage === 1"
            class="px-3 py-1 text-sm font-medium text-gray-600 border border-gray-300 rounded disabled:text-gray-500 disabled:cursor-not-allowed">
            Prev
          </button>
          <span class="text-sm text-gray-700">Page {{ currentPage }} of {{ totalPages }}</span>
          <button @click="currentPage++" :disabled="currentPage === totalPages"
            class="px-3 py-1 text-sm font-medium text-gray-600 border border-gray-300 rounded disabled:text-gray-500 disabled:cursor-not-allowed">
            Next
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Dialog Confirm Delete -->
  <div v-if="dialog.deleteRundown"
    class="fixed inset-0 z-9999 flex items-center justify-center bg-black/70 p-4 transition-opacity">
    <div class="relative w-full max-w-md max-h-full">
      <div class="relative bg-white rounded-lg shadow dark:bg-gray-700">

        <button @click="dialog.deleteRundown = false" type="button"
          class="absolute top-3 right-2.5 text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ml-auto inline-flex justify-center items-center">
          <svg class="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
          </svg>
          <span class="sr-only">Close modal</span>
        </button>

        <div class="p-6 text-center">
          <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg class="h-10 w-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z">
              </path>
            </svg>
          </div>

          <h3 class="mb-5 text-lg font-normal text-gray-500 dark:text-gray-400">
            Apakah Anda yakin ingin menghapus <br>
            <span class="font-bold text-gray-800">Rundown IFP</span> ini?
          </h3>

          <div class="flex justify-center gap-3">
            <button @click="confirmDeleteRundown('IFP')" type="button"
              class="text-white bg-red-600 hover:bg-red-800 focus:ring-4 focus:outline-none focus:ring-red-300 font-medium rounded-lg text-sm inline-flex items-center px-5 py-2.5 text-center mr-2">
              Yes, I'm sure
            </button>

            <button @click="dialog.deleteRundown = false" type="button"
              class="text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-gray-200 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2.5 hover:text-gray-900 focus:z-10">
              No, cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
:deep(th),
:deep(td) {
  white-space: nowrap !important;      /* ← cegah wrap/bertumpuk */
  word-wrap: normal !important;        /* ← override yang lama */
  font-size: 15px !important;
  font-weight: 500 !important;
  padding: 10px 20px !important;
  vertical-align: middle !important;   /* ← center vertikal */
  text-align: center !important;       /* ← center horizontal */
}

/* Biar tabel bisa scroll horizontal jika layar sempit */
.simple-dt-custom {
  overflow-x: auto;
}
</style>

<style>
.simple-dt-custom .datatable-top {
  display: none !important;
}

.simple-dt-custom .datatable-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 1rem;
}

.datatable-sorter {
  display: flex;
  align-items: center;
  gap: 5px;
}

.simple-dt-custom {
  overflow-x: auto;
}

.border {
  border: 1px solid #e5e7eb !important;
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
  min-width: 0;
  max-width: 160px;
  margin: 10px 10px;
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