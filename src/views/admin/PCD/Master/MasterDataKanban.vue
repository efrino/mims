<script setup lang="ts">
import { onMounted, ref, shallowRef } from 'vue';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { useMasterDataKanban } from '@/stores/PCD/Master/MasterDataKanban';
import { storeToRefs } from 'pinia';
import TableExcel, { type TableColumn } from '@/components/table/TableExcel.vue';
import type { DataKanban } from '@/types/PCD/Master/MasterDataKanban';

const page = ref({ title: 'Master Data Kanban' });
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
    title: 'Master Data Kanban',
    disabled: true,
    href: '#'
  }
]);

const storeKanban = useMasterDataKanban();
const { dataKanban, isModalOpen, action, form } = storeToRefs(storeKanban);
const isLoading = ref(true);
const tableKey = ref(0);

const columns: TableColumn[] = [
  { key: 'part_number', label: 'Part Number' },
  { key: 'job_number', label: 'Job Number' },
  { key: 'gambar', label: 'Gambar', align: 'center', filterable: false, sortable: false }
];

onMounted(async () => {
  isLoading.value = true;
  await storeKanban.fetchDataPart();
  isLoading.value = false;
  tableKey.value++;
});

const closeModal = () => {
  isModalOpen.value = false;
};

const getImgUrl = (partNumber: string): string => {
  return `http://192.168.10.67/part/${partNumber}.png?t=${Date.now()}`;
};

const onImgError = (e: Event) => {
  const target = e.target as HTMLImageElement;
  target.src = `http://192.168.10.67/part/empty.png?t=${Date.now()}`;
};

const editRow = (row: Record<string, unknown>) => {
  storeKanban.detailData((row as unknown as DataKanban).part_number);
};

const preview = ref('');
const fileName = ref('');
const errorMessage = ref('');

const handleFileChange = (e: any) => {
  const file = e.target.files && e.target.files[0];

  errorMessage.value = '';

  if (file) {
    if (file.type !== 'image/png') {
      errorMessage.value = 'Hanya file PNG yang diperbolehkan!';
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      errorMessage.value = 'Ukuran file maksimal 5MB!';
      return;
    }

    fileName.value = file.name;
    form.value.photo = file;

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        preview.value = reader.result;
      }
    };
    reader.readAsDataURL(file);
  }
};

const handleRemove = () => {
  preview.value = '';
  fileName.value = '';

  const input = document.getElementById('image-input');
  if (input && input instanceof HTMLInputElement) {
    input.value = '';
  }
};
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7"></BaseBreadcrumb>

  <div class="shadow-md sm:rounded-2xl bg-white">
    <div class="flex justify-between items-center p-2 border-b border-gray-200">
      <h2 class="text-xl font-semibold text-gray-800">Master Data Kanban</h2>
      <button
        type="button"
        @click="isModalOpen = true"
        class="flex items-center gap-2 text-white bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center"
      >
        Tambah Data
      </button>
    </div>

    <div class="px-2">
      <div class="relative overflow-x-auto">
        <TableExcel :key="tableKey" :columns="columns" :data="(dataKanban as unknown as Record<string, unknown>[])" :loading="isLoading">
          <template #cell-gambar="{ row }">
            <img
              class="w-[80px] h-[30px] object-contain mx-auto"
              :src="getImgUrl((row as any).part_number)"
              @error="onImgError"
              loading="eager"
            />
          </template>

          <template #actions="{ row }">
            <button type="button" @click="editRow(row)" class="text-blue-600 hover:text-blue-800 inline-flex justify-center">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                ></path>
              </svg>
            </button>
          </template>

          <template #empty>
            <p class="text-gray-500">No data available!</p>
          </template>
        </TableExcel>
      </div>
    </div>
  </div>

  <!-- Modal content remains the same -->
  <Transition name="modal">
    <div
      v-if="isModalOpen"
      class="fixed inset-0 z-9999 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-gray-900/50"
      @click.self="closeModal"
    >
      <div class="relative p-4 w-4xl max-h-full">
        <div class="relative bg-white rounded-lg shadow-lg p-5">
          <div class="flex items-center justify-between p-4 md:p-5 border-b rounded-t border-gray-200 mb-3">
            <h1 class="text-gray-600 text-2xl font-semibold">{{ action == 'add' ? 'Add' : 'Edit' }} Master Data Kanban</h1>
            <button
              type="button"
              @click="closeModal"
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
              <div class="flex flex-col mb-5">
                <div class="mb-5">
                  <label for="part_number" class="block mb-2 text-sm font-medium text-gray-900">Part Number</label>
                  <input
                    type="text"
                    id="part_number"
                    v-model="form.part_number"
                    class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  />
                </div>
                <div class="mb-5">
                  <label for="job_number" class="block mb-2 text-sm font-medium text-gray-900">Job Number</label>
                  <input
                    type="text"
                    id="job_number"
                    v-model="form.job_number"
                    class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  />
                </div>
                <div class="mb-5">
                  <label for="type" class="block mb-2 text-sm font-medium text-gray-900">Tipe</label>
                  <select
                    id="type"
                    v-model="form.tipe"
                    class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  >
                    <option value="" disabled selected>Pilih</option>
                    <option value="WIP">WIP</option>
                    <option value="PRESS">PRESS</option>
                    <option value="WELDING">WELDING</option>
                  </select>
                </div>

                <div class="space-y-3">
                  <label for="img" class="block text-sm font-medium text-gray-900">Gambar Part</label>
                  <div v-if="!preview">
                    <label
                      for="image-input"
                      class="flex flex-col items-center justify-center w-full h-52 border-2 border-dashed border-blue-300 rounded-xl cursor-pointer bg-blue-50 hover:bg-blue-100 transition-colors"
                    >
                      <div class="flex flex-col items-center justify-center pt-5 pb-6">
                        <svg class="w-12 h-12 text-indigo-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                          ></path>
                        </svg>
                        <p class="mb-2 text-sm text-gray-600 font-medium">
                          <span class="text-indigo-600">Klik untuk upload</span> atau drag & drop
                        </p>
                        <p class="text-xs text-gray-500">Harus .png (Max. 5MB)</p>
                      </div>
                      <input id="image-input" type="file" class="hidden" accept="image/png" @change="handleFileChange" />
                    </label>

                    <div v-if="errorMessage" class="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                      <p class="text-sm text-red-600 flex items-center">
                        <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fill-rule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                            clip-rule="evenodd"
                          />
                        </svg>
                        {{ errorMessage }}
                      </p>
                    </div>
                  </div>

                  <div v-else class="relative">
                    <div class="rounded-xl overflow-hidden border-2 border-gray-200">
                      <img :src="preview" alt="Preview" class="w-full h-auto max-h-44 object-contain bg-gray-50" />
                    </div>

                    <button
                      @click="handleRemove"
                      class="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 shadow-lg transition-colors"
                      title="Hapus gambar"
                    >
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                      </svg>
                    </button>

                    <div class="mt-2 p-3 bg-gray-50 rounded-lg">
                      <p class="text-sm p-4 text-gray-600 truncate"><span class="font-medium">File:</span> {{ fileName }}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div class="flex gap-5 justify-end">
                <button
                  type="button"
                  @click="closeModal"
                  class="text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 font-medium rounded-lg text-sm px-5 py-2.5"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  @click="storeKanban.addOrEditData()"
                  class="flex gap-2 text-white bg-blue-600 hover:bg-blue-800 font-medium rounded-lg text-sm px-4 py-2.5 text-center"
                >
                  <svg
                    class="w-5 h-5 text-white"
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke="currentColor"
                      stroke-linecap="round"
                      stroke-width="2"
                      d="M11 16h2m6.707-9.293-2.414-2.414A1 1 0 0 0 16.586 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V7.414a1 1 0 0 0-.293-.707ZM16 20v-6a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v6h8ZM9 4h6v3a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V4Z"
                    />
                  </svg>
                  Save
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
/* Remove the min-height constraints that were causing large spacing */
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
