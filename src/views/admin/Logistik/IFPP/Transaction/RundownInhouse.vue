<script setup lang="ts">
import { onMounted, ref, shallowRef, computed, watch } from 'vue';
import { useRundownStore } from '@/stores/Logistik/IFPP/Transaction/RundownIFPP';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import TableExcel, { type TableColumn } from '@/components/table/TableExcel.vue';

const page = ref({ title: 'Rundown IFPP-Inhouse' });
const breadcrumbs = shallowRef([
  {
    title: 'Logistik',
    disabled: false,
    href: '#'
  },
  {
    title: 'IFPP',
    disabled: false,
    href: '#'
  },
  {
    title: 'Transaction',
    disabled: false,
    href: '#'
  },
  {
    title: 'Rundown IFPP Inhouse',
    disabled: true,
    href: '#'
  }
]);

const rundownStore = useRundownStore();

const searchQuery = ref('');
const strengthFilterValue = ref('');
const tableKey = ref(0);

const columns: TableColumn[] = [
  { key: 'part_number', label: 'Part Number' },
  { key: 'job_number', label: 'Job Number' },
  { key: 'project_id', label: 'Project' },
  { key: 'line_process', label: 'Line Process' },
  { key: 'plan_day', label: 'Plan/Day' },
  { key: 'stock', label: 'Stock' },
  { key: 'strength', label: 'Strength', align: 'center' }
];

const handleUploadRundown = async (): Promise<void> => {
  await rundownStore.uploadRundown('IFPP Inhouse');
};

const handleDeleteRundown = async (): Promise<void> => {
  await rundownStore.deleteRundown('IFPP-INHOUSE');
  rundownStore.closeDeleteDialog();
};

const filteredItems = computed(() => {
  let items = Array.isArray(rundownStore.materials) ? [...rundownStore.materials] : [];

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    items = items.filter((item) => {
      return (
        (item.part_number && item.part_number.toString().toLowerCase().includes(query)) ||
        (item.job_number && item.job_number.toString().toLowerCase().includes(query))
      );
    });
  }

  if (rundownStore.destination && rundownStore.destination !== '' && rundownStore.destination !== 'All') {
    const dest = rundownStore.destination;
    items = items.filter((item) => {
      return (
        (item.customer_1 && item.customer_1 === dest) ||
        (item.customer_2 && item.customer_2 === dest)
      );
    });
  }

  if (strengthFilterValue.value) {
    const limit = parseFloat(strengthFilterValue.value);
    items = items.filter((item) => {
      const strengthVal = parseFloat(item.strength?.toString() || '0');
      return strengthVal < limit;
    });
  }

  return items;
});

watch([searchQuery, () => rundownStore.destination, strengthFilterValue], () => {
  tableKey.value++;
});

onMounted(async () => {
  await rundownStore.fetchInventory('IFPP-INHOUSE');
  tableKey.value++;
});
</script>
<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7"></BaseBreadcrumb>
  <div class="flex flex-col gap-5 ">
    <!-- Toolbar -->
    <div class="flex flex-wrap items-center justify-between gap-3 bg-white rounded-lg border border-gray-200 shadow-sm p-4">
      <!-- Actions -->
      <div class="flex gap-3 flex-wrap">
        <button @click.stop="handleUploadRundown"
          class="flex items-center gap-2 text-white bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-full text-sm px-5 py-2.5 text-center"
          type="button">
          <svg class="w-5 h-5 text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
            fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 15v2a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-2M12 4v12m0-12 4 4m-4-4L8 8" />
          </svg>
          Upload Rundown IFPP Inhouse
        </button>

        <button @click="rundownStore.openDeleteDialog()"
          class="flex items-center gap-2 text-white bg-gradient-to-r from-red-400 via-red-500 to-red-600 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-red-300 dark:focus:ring-red-800 font-medium rounded-full text-sm px-5 py-2.5 text-center"
          type="button">
          <svg class="w-5 h-5 text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
            fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M5 7h14m-9 3v8m4-8v8M10 3h4a1 1 0 0 1 1 1v3H9V4a1 1 0 0 1 1-1ZM6 7h12v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7Z" />
          </svg>
          Delete Rundown IFPP Inhouse
        </button>

        <a :href="rundownStore.reportUrl" target="_blank"
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

        <select v-model="rundownStore.destination" class="block w-56 p-2.5 text-sm border border-gray-300 rounded-full bg-gray-50
                focus:ring-blue-500 focus:border-blue-500">
          <option disabled value="">
            Pilih Customer
          </option>
          <option v-for="item in rundownStore.customers" :key="item" :value="item">
            {{ item }}
          </option>
        </select>
      </div>
    </div>

    <!-- Table -->
    <div class="w-full max-w-10xl mx-auto">
      <TableExcel :key="tableKey" :columns="columns" :data="(filteredItems as unknown as Record<string, unknown>[])" :loading="rundownStore.isLoading">
        <template #header-actions>
          <div class="flex items-center gap-2">
            <label class="text-xs font-medium text-gray-600">Strength:</label>
            <input v-model="strengthFilterValue" type="number" placeholder="Less than"
              class="w-32 px-2 py-1 text-xs rounded font-normal text-gray-700 bg-white border-b border-gray-300 focus:border-blue-500 focus:outline-none placeholder-gray-400" />
          </div>
        </template>

        <template #cell-strength="{ row }">
          <span
            :class="[
              'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold',
              parseFloat(String((row as any).strength)) > 0 && strengthFilterValue && parseFloat(String((row as any).strength)) < parseFloat(strengthFilterValue)
                ? 'bg-red-100 text-red-700'
                : 'bg-gray-100 text-gray-700'
            ]"
          >
            {{ (row as any).strength }}
          </span>
        </template>

        <template #empty>
          <p class="text-gray-500">No data found matching your search.</p>
        </template>
      </TableExcel>
    </div>
  </div>

  <div v-if="rundownStore.deleteDialog"
    class="fixed inset-0 z-9999 flex items-center justify-center bg-black/70 p-4 transition-opacity">
    <div class="relative w-full max-w-md max-h-full">
      <div class="relative bg-white rounded-lg shadow dark:bg-gray-700">
        <button @click="rundownStore.closeDeleteDialog()" type="button"
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
            <span class="font-bold text-gray-800">Rundown IFPP-Inhouse?</span>
          </h3>

          <div class="flex justify-center gap-3">
            <button @click="handleDeleteRundown" type="button"
              class="text-white bg-red-600 hover:bg-red-800 focus:ring-4 focus:outline-none focus:ring-red-300 font-medium rounded-lg text-sm inline-flex items-center px-5 py-2.5 text-center mr-2">
              Yes, I'm sure
            </button>

            <button @click="rundownStore.closeDeleteDialog()" type="button"
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
