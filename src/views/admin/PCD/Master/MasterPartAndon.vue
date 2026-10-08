<script setup lang="ts">
import { onMounted, ref, shallowRef } from 'vue';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { useMasterPartAndonStore } from '@/stores/PCD/Master/MasterPartAndon';
import { storeToRefs } from 'pinia';
import TableExcel, { type TableColumn } from '@/components/table/TableExcel.vue';
import type { dataTable as DataTableRow } from '@/types/PCD/Master/MasterPartAndon';

const page = ref({ title: 'Master Part Andon' });
const breadcrumbs = shallowRef([
  {
    title: 'PCD',
    disabled: false,
    href: '#'
  },
  {
    title: 'Master',
    disabled: false,
    href: '#'
  },
  {
    title: 'Master Part Andon',
    disabled: true,
    href: '#'
  }
]);

const masterPartStore = useMasterPartAndonStore();
const { dataTable, isModalAddOpen, formData, isModalEditOpen } = storeToRefs(masterPartStore);
const isLoading = ref(true);
const tableKey = ref(0);

const columns: TableColumn[] = [
  { key: 'part_number', label: 'Part Number' },
  { key: 'job_number', label: 'Job Number' },
  { key: 'is_active', label: 'Status' }
];

const editRow = (row: Record<string, unknown>) => {
  masterPartStore.editData((row as unknown as DataTableRow).id);
};

const closeModalEdit = () => {
  isModalEditOpen.value = false;
  formData.value = {
    id: '',
    part_number: '',
    job_number: '',
    is_active: ''
  };
};

const closeModalAdd = () => {
  isModalAddOpen.value = false;
};
const openModalAdd = () => {
  isModalAddOpen.value = true;
};

onMounted(async () => {
  isLoading.value = true;
  await masterPartStore.fetchAllData();
  isLoading.value = false;
  tableKey.value++;
});
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7"></BaseBreadcrumb>

  <div class="shadow-md sm:rounded-2xl bg-white">
    <div class="flex justify-between items-center p-2 border-b border-gray-200">
      <h2 class="text-xl font-semibold text-gray-800">Master Data Part Andon</h2>
      <button
        type="button"
        @click="openModalAdd"
        class="flex items-center gap-2 text-white bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center"
      >
        Tambah Data
      </button>
    </div>

    <div class="px-2">
      <div class="relative overflow-x-auto">
        <TableExcel :key="tableKey" :columns="columns" :data="(dataTable as unknown as Record<string, unknown>[])" :loading="isLoading">
          <template #cell-is_active="{ row }">
            <span
              :class="
                (row as any).is_active == '1'
                  ? 'text-green-600 bg-green-100 px-2 py-1 rounded-full text-xs font-medium'
                  : 'text-red-600 bg-red-100 px-2 py-1 rounded-full text-xs font-medium'
              "
            >
              {{ (row as any).is_active == '1' ? 'Active' : 'Inactive' }}
            </span>
          </template>

          <template #actions="{ row }">
            <button type="button" @click="editRow(row)" class="text-blue-600 hover:text-blue-800 inline-flex justify-center">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                ></path>
              </svg>
            </button>
          </template>
        </TableExcel>
      </div>
    </div>
  </div>

  <!-- Modal Add Data-->
  <Transition name="modal">
    <div
      v-if="isModalAddOpen"
      class="fixed inset-0 z-9999 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-gray-900/50"
      @click.self="closeModalAdd"
    >
      <div class="relative p-4 w-lg max-h-full">
        <div class="relative bg-white rounded-lg shadow-lg p-5">
          <div class="flex items-center justify-between p-4 md:p-5 border-b rounded-t border-gray-200">
            <h1 class="text-gray-600 text-xl font-semibold">Add Data Master Part</h1>
            <button
              type="button"
              @click="closeModalAdd"
              class="end-2.5 text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center"
            >
              <svg class="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
                <path
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
                />
              </svg>
              <span class="sr-only">Close modal</span>
            </button>
          </div>
          <div class="p-4 md:p-5">
            <form>
              <div class="mb-5">
                <label for="part_number" class="block mb-2 text-sm font-medium text-gray-900">Part Number</label>
                <input
                  v-model="formData.part_number"
                  type="text"
                  id="part_number"
                  class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  required
                />
              </div>
              <div class="mb-5">
                <label for="job_number" class="block mb-2 text-sm font-medium text-gray-900">Job Number</label>
                <input
                  v-model="formData.job_number"
                  type="text"
                  id="job_number"
                  class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  required
                />
              </div>
              <div class="mb-8">
                <label for="status" class="block mb-2 text-sm font-medium text-gray-900">Status</label>
                <select
                  v-model="formData.is_active"
                  id="status"
                  class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  required
                >
                  <option value="" disabled>Pilih</option>
                  <option value="1">Active</option>
                  <option value="0">Inactive</option>
                </select>
              </div>
              <div>
                <button
                  type="button"
                  @click="masterPartStore.addData()"
                  class="w-full text-white bg-blue-600 hover:bg-blue-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center"
                >
                  Tambah Data
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </Transition>

  <!-- Modal Edit Data-->
  <Transition name="modal">
    <div
      v-if="isModalEditOpen"
      class="fixed inset-0 z-9999 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-gray-900/50"
      @click.self="closeModalEdit"
    >
      <div class="relative p-4 w-lg max-h-full">
        <div class="relative bg-white rounded-lg shadow-lg p-5">
          <div class="flex items-center justify-between p-4 md:p-5 border-b rounded-t border-gray-200">
            <h1 class="text-gray-600 text-xl font-semibold">Edit Data Master Part</h1>
            <button
              type="button"
              @click="closeModalEdit"
              class="end-2.5 text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center"
            >
              <svg class="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
                <path
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
                />
              </svg>
              <span class="sr-only">Close modal</span>
            </button>
          </div>
          <div class="p-4 md:p-5">
            <form>
              <div class="mb-5">
                <label for="part_number" class="block mb-2 text-sm font-medium text-gray-900">Part Number</label>
                <input
                  v-model="formData.part_number"
                  type="text"
                  id="part_number"
                  class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  required
                />
              </div>
              <div class="mb-5">
                <label for="job_number" class="block mb-2 text-sm font-medium text-gray-900">Job Number</label>
                <input
                  v-model="formData.job_number"
                  type="text"
                  id="job_number"
                  class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  required
                />
              </div>
              <div class="mb-8">
                <label for="status" class="block mb-2 text-sm font-medium text-gray-900">Status</label>
                <select
                  v-model="formData.is_active"
                  id="status"
                  class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  required
                >
                  <option value="" disabled>Pilih</option>
                  <option value="1">Active</option>
                  <option value="0">Inactive</option>
                </select>
              </div>
              <div>
                <button
                  type="button"
                  @click="masterPartStore.updateData()"
                  class="w-full text-white bg-blue-600 hover:bg-blue-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center"
                >
                  Edit Data
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style>
.border {
  border: 1px solid #e5e7eb !important;
}
.border-b {
  border-bottom: 1px solid #e5e7eb !important;
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
