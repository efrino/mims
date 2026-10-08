<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue';
import { useCombineStore } from '@/stores/Logistik/MasterData/CombinePallet';
import { storeToRefs } from 'pinia';
import TableExcel, { type TableColumn } from '@/components/table/TableExcel.vue';

const combineStore = useCombineStore();
const isDisabled = ref(true);
const { loadFormPallet, onSavePallet, updateFormData } = combineStore;

const { dataTable, formData, dialog } = storeToRefs(combineStore);

const isLoading = ref(true);

onMounted(async () => {
  await combineStore.fetchMasterPallet();
});

const columns: TableColumn[] = [
  { key: 'no_rfid', label: 'ID RFID' },
  { key: 'name', label: 'NAME' },
  { key: 'no_pallet', label: 'No Pallet' },
  { key: 'type', label: 'Type' },
  { key: 'category', label: 'Category' },
  { key: 'customer', label: 'Customer' },
  { key: 'is_active', label: 'condition pallet', align: 'center' }
];

const editRow = (row: Record<string, unknown>) => {
  loadFormPallet('Edit', row);
};

const filteredData = computed(() => {
  return dataTable.value.filter((item) => item.is_active === '0' || item.is_active === '2');
});

watch(
  () => dataTable.value,
  () => {
    isLoading.value = false;
  },
  { deep: true }
);
</script>

<template>
  <div class="w-full bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden dark:bg-gray-800 dark:border-gray-700">
    <div class="relative bg-gray-500 py-8 px-4 sm:py-10">
      <div class="relative flex flex-col sm:flex-row items-center justify-between gap-4">
        <div class="text-center w-full">
          <h1 class="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight drop-shadow-sm">Workshop Data Pallet</h1>
        </div>
      </div>
    </div>

    <div class="p-2 sm:p-4 bg-white dark:bg-gray-800">
      <div class="w-full max-w-10xl mx-auto">
        <TableExcel :columns="columns" :data="(filteredData as unknown as Record<string, unknown>[])" :loading="isLoading">
          <template #cell-is_active="{ row }">
            <span
              :class="
                (row as any).is_active === '1'
                  ? 'bg-green-100 text-green-700'
                  : (row as any).is_active === '2'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-500'
              "
              class="px-2.5 py-1 rounded-full text-xs font-semibold"
            >
              {{ (row as any).is_active === '1' ? 'OK' : (row as any).is_active === '2' ? 'NC' : 'NG' }}
            </span>
          </template>

          <template #actions="{ row }">
            <div class="flex items-center justify-center space-x-2">
              <button
                type="button"
                @click="editRow(row)"
                class="group relative inline-flex items-center justify-center p-2 text-sm font-medium text-white bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg hover:from-cyan-600 hover:to-blue-600 focus:ring-4 focus:outline-none focus:ring-cyan-200 dark:focus:ring-cyan-800 transition-all duration-200"
                title="Edit Data"
              >
                <svg class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
              </button>
            </div>
          </template>

          <template #empty>
            <p class="text-gray-500">Tidak ada data pallet</p>
          </template>
        </TableExcel>
      </div>
    </div>
  </div>

  <Transition name="modal">
    <div
      v-if="dialog.form"
      class="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto overflow-x-hidden bg-gray-900/50 p-4"
      role="dialog"
      aria-modal="true"
      @click.self="dialog.form = false"
    >
      <div class="relative p-4 w-full max-w-lg max-h-full">
        <div class="relative bg-white rounded-lg shadow-lg dark:bg-gray-800">
          <div class="flex items-center justify-between p-5 border-b rounded-t border-gray-200 dark:border-gray-700">
            <div class="flex items-center space-x-3">
              <div class="p-2 bg-blue-100 rounded-lg dark:bg-blue-900">
                <svg class="w-6 h-6 text-blue-600 dark:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
            </div>
            <button
              type="button"
              @click="dialog.form = false"
              class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-white rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center"
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

          <div class="p-5 space-y-5">
            <fieldset :disabled="isDisabled">
              <div>
                <label for="no_rfid" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"> No RFID </label>
                <input
                  type="number"
                  id="no_rfid"
                  :value="formData.no_rfid"
                  @input="updateFormData('no_rfid', ($event.target as HTMLInputElement).value)"
                  class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                  placeholder="Masukan No RFID"
                  required
                />
              </div>

              <div>
                <label for="no_pallet" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"> No Pallet </label>
                <input
                  type="number"
                  id="no_pallet"
                  :value="formData.no_pallet"
                  @input="updateFormData('no_pallet', ($event.target as HTMLInputElement).value)"
                  class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                  placeholder="Masukan No Pallet"
                  required
                />
              </div>

              <div>
                <label for="name" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"> Name </label>
                <input
                  type="text"
                  id="name"
                  :value="formData.name"
                  @input="updateFormData('name', ($event.target as HTMLInputElement).value)"
                  class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                  placeholder="Masukan name (contoh: Universal Palet)"
                  required
                />
              </div>

              <div>
                <label for="type" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"> Type </label>
                <input
                  type="text"
                  id="type"
                  :value="formData.type"
                  @input="updateFormData('type', ($event.target as HTMLInputElement).value)"
                  class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                  placeholder="Masukan Type (contoh: D)"
                  required
                />
              </div>

              <div>
                <label for="category" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"> Category </label>
                <select
                  id="category"
                  :value="formData.category"
                  @change="updateFormData('category', ($event.target as HTMLSelectElement).value)"
                  class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="EKSTERNAL">EKSTERNAL</option>
                  <option value="INTERNAL">INTERNAL</option>
                </select>
              </div>

              <div>
                <label for="customer" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"> Customer </label>
                <input
                  type="text"
                  id="customer"
                  :value="formData.customer"
                  @input="updateFormData('customer', ($event.target as HTMLInputElement).value)"
                  class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                  placeholder="Masukan Customer (contoh: ADM)"
                  required
                />
              </div>
            </fieldset>
            <div>
              <label for="is_active" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"> Condition Pallet </label>
              <select
                id="is_active"
                :value="formData.is_active"
                @change="updateFormData('is_active', ($event.target as HTMLSelectElement).value)"
                class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="0">NG</option>
                <option value="1">OK</option>
                <option value="2">NC</option>
              </select>
            </div>
          </div>

          <div class="flex items-center justify-between p-5 border-t border-gray-200 dark:border-gray-700">
            <div class="text-sm text-gray-500 dark:text-gray-400 flex items-center">
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Pastikan kondisi pallet sudah sesuai
            </div>
            <div class="flex items-center space-x-3">
              <button
                @click="dialog.form = false"
                type="button"
                class="text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                @click="onSavePallet"
                type="button"
                class="flex gap-2 text-white bg-blue-600 hover:bg-blue-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700"
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
