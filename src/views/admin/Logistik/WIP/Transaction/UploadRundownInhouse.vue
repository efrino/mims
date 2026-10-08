<script setup lang="ts">
import { onMounted, ref, shallowRef, computed, watch } from 'vue';
import { useRundownStore } from '@/stores/Logistik/WIP/Transaction/UploadRundownWIP';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { storeToRefs } from 'pinia';
import TableExcel, { type TableColumn } from '@/components/table/TableExcel.vue';

const page = ref({ title: 'Rundown WIP-Inhouse' });
const breadcrumbs = shallowRef([
  {
    title: 'Logistik',
    disabled: false,
    href: '#'
  },
  {
    title: 'WIP',
    disabled: false,
    href: '#'
  },
  {
    title: 'Transaction',
    disabled: false,
    href: '#'
  },
  {
    title: 'Upload Rundown Inhouse',
    disabled: true,
    href: '#'
  }
]);

const rundownStore = useRundownStore();

const {
  updateRundownExcelToDB,
  deleteRundownDB,
  fetchPartWIP,
} = rundownStore

const {
  dialog,
  // urlExport,
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
const strengthFilter = ref('');
const tableKey = ref(0);

const columns: TableColumn[] = [
  { key: 'MATNR', label: 'Part Number' },
  { key: 'MAKTX', label: 'Part Name' },
  { key: 'BISMT', label: 'Job Number' },
  { key: 'project_id', label: 'Project' },
  { key: 'SORTL', label: 'Vendor' },
  { key: 'ZPLNPH', label: 'PLan/Day' },
  { key: 'LABST', label: 'Stock' },
  { key: 'ZSTRENGTH', label: 'Strength', align: 'center' }
];

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

  if (strengthFilter.value) {
    const limit = parseFloat(strengthFilter.value);
    items = items.filter((item: any) => {
      const strengthVal = parseFloat(item.ZSTRENGTH || 0);
      return strengthVal < limit;
    });
  }

  return items;
});

watch([searchQuery, destination, strengthFilter], () => {
  tableKey.value++;
});

onMounted(async () => {
  isLoading.value = true;
  try {
    await fetchPartWIP();
  } catch (error) {
    console.error("Error fetching data:", error);
  } finally {
    isLoading.value = false;
    tableKey.value++;
  }
});
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7"></BaseBreadcrumb>
  <div class="flex flex-col gap-5 ">
    <!-- Toolbar -->
    <div class="flex flex-wrap items-center justify-between gap-3 bg-white rounded-lg border border-gray-200 shadow-sm p-4">
      <!-- Actions -->
      <div class="flex gap-3 flex-wrap">
        <button @click.stop="updateRundownExcelToDB('IFPP Inhouse')"
          class="flex items-center gap-2 text-white bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-full text-sm px-5 py-2.5 text-center"
          type="button">
          <svg class="w-5 h-5 text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
            fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 15v2a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-2M12 4v12m0-12 4 4m-4-4L8 8" />
          </svg>
          Upload Rundown WIP Inhouse
        </button>

        <button @click="dialog.deleteRundown = true"
          class="flex items-center gap-2 text-white bg-gradient-to-r from-red-400 via-red-500 to-red-600 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-red-300 dark:focus:ring-red-800 font-medium rounded-full text-sm px-5 py-2.5 text-center"
          type="button">
          <svg class="w-5 h-5 text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
            fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M5 7h14m-9 3v8m4-8v8M10 3h4a1 1 0 0 1 1 1v3H9V4a1 1 0 0 1 1-1ZM6 7h12v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7Z" />
          </svg>
          Delete Rundown WIP Inhouse
        </button>

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

      <!-- Search & Filter -->
      <div class="flex gap-3 flex-wrap items-center">
        <div class="relative">
          <div class="absolute inset-y-0 start-0 flex items-center pl-3 pointer-events-none">
            <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input v-model="searchQuery" type="text" id="table-search"
            class="block p-2.5 pl-10 text-sm text-gray-900 border border-gray-200 rounded-full w-[240px] bg-gray-50 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Search for part number">
        </div>

        <select v-model="destination" class="block w-56 p-2.5 text-sm border border-gray-300 rounded-full bg-gray-50
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
      </div>
    </div>

    <!-- Table -->
    <div class="w-full max-w-10xl mx-auto">
      <TableExcel :key="tableKey" :columns="columns" :data="(filteredItems as unknown as Record<string, unknown>[])" :loading="isLoading">
        <template #header-actions>
          <div class="flex items-center gap-2">
            <label class="text-xs font-medium text-gray-600">Strength:</label>
            <input v-model="strengthFilter" type="number" placeholder="Less than"
              class="w-32 px-2 py-1 text-xs rounded font-normal text-gray-700 bg-white border-b border-gray-300 focus:border-blue-500 focus:outline-none placeholder-gray-400" />
          </div>
        </template>

        <template #cell-ZSTRENGTH="{ row }">
          <span
            :class="[
              'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold',
              parseFloat((row as any).ZSTRENGTH) > 0 && strengthFilter && parseFloat((row as any).ZSTRENGTH) < parseFloat(strengthFilter)
                ? 'bg-red-100 text-red-700'
                : 'bg-gray-100 text-gray-700'
            ]"
          >
            {{ (row as any).ZSTRENGTH }}
          </span>
        </template>

        <template #empty>
          <p class="text-gray-500">No data found matching your search.</p>
        </template>
      </TableExcel>
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
            <span class="font-bold text-gray-800">Rundown WIP-Inhouse?</span>
          </h3>

          <div class="flex justify-center gap-3">
            <button @click="confirmDeleteRundown('IFPP Inhouse')" type="button"
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

<style>
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
</style>
