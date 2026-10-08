<script setup lang="ts">
import { ref, shallowRef, onMounted } from 'vue';
import { usePalletStore } from '@/stores/Logistik/MasterData/MasterPallet';
import { useRfidStore } from '@/stores/Logistik/MasterData/MasterRfid';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { storeToRefs } from 'pinia';
import TableExcel, { type TableColumn } from '@/components/table/TableExcel.vue';

// ─── Page Meta ───────────────────────────────────────────────────────────────
const page = ref({ title: 'Master Data' });
const breadcrumbs = shallowRef([
  { title: 'Logistik', disabled: false, href: '#' },
  { title: 'Master Data', disabled: false, href: '#' },
  { title: 'Master Pallet & RFID', disabled: true, href: '#' }
]);

// ─── Pallet Store ─────────────────────────────────────────────────────────────
const palletStore = usePalletStore();
const { uploadExcel: uploadPalletExcel } = palletStore;
const palletFileInput = ref<HTMLInputElement | null>(null);

const triggerPalletFileInput = () => palletFileInput.value?.click();

const handlePalletFileUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  await uploadPalletExcel(file);
  target.value = '';
};

const {
  loadFormPallet,
  onSavePallet,
  deletePallet,
  confirmDelete: confirmDeletePallet,
  updateFormData: updatePalletFormData
} = palletStore;

const {
  dataTable: palletDataTable,
  formData: palletFormData,
  action: palletAction,
  dialog: palletDialog,
  deleteData: palletDeleteData,
  isDeleting: isPalletDeleting
} = storeToRefs(palletStore);

// ─── RFID Store ───────────────────────────────────────────────────────────────
const rfidStore = useRfidStore();
const { uploadExcel: uploadRfidExcel } = rfidStore;
const rfidFileInput = ref<HTMLInputElement | null>(null);

const triggerRfidFileInput = () => rfidFileInput.value?.click();

const handleRfidFileUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  await uploadRfidExcel(file);
  target.value = '';
};

const { loadFormRfid, onSaveRfid, deleteRfid, confirmDelete: confirmDeleteRfid, updateFormData: updateRfidFormData } = rfidStore;

const {
  dataTable: rfidDataTable,
  formData: rfidFormData,
  action: rfidAction,
  dialog: rfidDialog,
  deleteData: rfidDeleteData,
  isDeleting: isRfidDeleting
} = storeToRefs(rfidStore);

// ─── Table state ────────────────────────────────────────────────────────────
const isPalletLoading = ref(true);
const isRfidLoading = ref(true);
const palletTableKey = ref(0);
const rfidTableKey = ref(0);

const palletColumns: TableColumn[] = [{ key: 'pallet', label: 'Pallet' }];
const rfidColumns: TableColumn[] = [{ key: 'no_rfid', label: 'RFID' }];

const editPalletRow = (row: Record<string, unknown>) => {
  loadFormPallet('Edit', row);
};

const deletePalletRow = (row: Record<string, unknown>) => {
  confirmDeletePallet(row.id as string, row.pallet as string);
};

const editRfidRow = (row: Record<string, unknown>) => {
  loadFormRfid('Edit', row);
};

const deleteRfidRow = (row: Record<string, unknown>) => {
  confirmDeleteRfid(row.id as string, row.no_rfid as string);
};

// ─── Init ─────────────────────────────────────────────────────────────────────
onMounted(async () => {
  isPalletLoading.value = true;
  isRfidLoading.value = true;
  await Promise.all([palletStore.fetchMasterPallet(), rfidStore.fetchMasterRfid()]);
  isPalletLoading.value = false;
  isRfidLoading.value = false;
  palletTableKey.value++;
  rfidTableKey.value++;
});
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7" />

  <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
    <div
      class="w-full bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden dark:bg-gray-800 dark:border-gray-700 flex flex-col"
    >
      <!-- Header Pallet -->
      <div class="relative bg-gradient-to-r from-cyan-400 via-cyan-500 to-cyan-600 py-6 px-4">
        <div
          class="absolute inset-0 bg-white/5 opacity-30"
          style="background-image: radial-gradient(#ffffff 1px, transparent 1px); background-size: 20px 20px"
        />
        <div class="relative flex flex-col sm:flex-row items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <h1 class="text-2xl sm:text-3xl font-extrabold text-white tracking-tight drop-shadow-sm">Master Pallet</h1>
          </div>
          <div class="flex flex-wrap gap-2 justify-center sm:justify-end">
            <button
              type="button"
              @click="loadFormPallet('Create')"
              class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-cyan-600 bg-white rounded-xl shadow-md hover:bg-cyan-50 focus:outline-none focus:ring-2 focus:ring-white transition-all duration-200"
            >
              Tambah Data
            </button>
            <button
              type="button"
              @click="triggerPalletFileInput"
              :disabled="palletStore.uploading"
              class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-purple-600 bg-white rounded-xl shadow-md hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all duration-200 disabled:opacity-50"
            >
              <span v-if="palletStore.uploading">Uploading...</span>
              <span v-else>Upload Excel</span>
            </button>
            <input type="file" ref="palletFileInput" accept=".xlsx,.xls" class="hidden" @change="handlePalletFileUpload" />
          </div>
        </div>
      </div>

      <!-- Body Pallet -->
      <div class="px-2 sm:px-2 bg-white dark:bg-gray-800 flex-1">
        <TableExcel
          :key="palletTableKey"
          :columns="palletColumns"
          :data="(palletDataTable as unknown as Record<string, unknown>[])"
          :loading="isPalletLoading"
        >
          <template #actions="{ row }">
            <div class="flex items-center justify-center space-x-2">
              <button
                type="button"
                @click="editPalletRow(row)"
                class="group relative inline-flex items-center justify-center p-2 text-sm font-medium text-white bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg hover:from-cyan-600 hover:to-blue-600 focus:ring-4 focus:outline-none focus:ring-cyan-200 transition-all duration-200"
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
              <button
                type="button"
                @click="deletePalletRow(row)"
                class="inline-flex items-center justify-center p-2 text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 transition-all duration-200"
                title="Delete Data"
              >
                <svg class="w-4 h-4 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m2 0H7m2-3h6a1 1 0 011 1v1H8V5a1 1 0 011-1z"
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

    <div
      class="w-full bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden dark:bg-gray-800 dark:border-gray-700 flex flex-col"
    >
      <!-- Header RFID -->
      <div class="relative bg-gradient-to-r from-cyan-400 via-cyan-500 to-cyan-600 py-6 px-4">
        <div
          class="absolute inset-0 bg-white/5 opacity-30"
          style="background-image: radial-gradient(#ffffff 1px, transparent 1px); background-size: 20px 20px"
        />
        <div class="relative flex flex-col sm:flex-row items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <h1 class="text-2xl sm:text-3xl font-extrabold text-white tracking-tight drop-shadow-sm">Master RFID</h1>
          </div>
          <div class="flex flex-wrap gap-2 justify-center sm:justify-end">
            <button
              type="button"
              @click="loadFormRfid('Create')"
              class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-purple-600 bg-white rounded-xl shadow-md hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-white transition-all duration-200"
            >
              Tambah Data
            </button>
            <button
              type="button"
              @click="triggerRfidFileInput"
              :disabled="rfidStore.uploading"
              class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-cyan-600 bg-white rounded-xl shadow-md hover:bg-cyan-50 focus:outline-none focus:ring-2 focus:ring-cyan-200 transition-all duration-200 disabled:opacity-50"
            >
              <span v-if="rfidStore.uploading">Uploading...</span>
              <span v-else>Upload Excel</span>
            </button>
            <input type="file" ref="rfidFileInput" accept=".xlsx,.xls" class="hidden" @change="handleRfidFileUpload" />
          </div>
        </div>
      </div>

      <!-- Body RFID -->
      <div class="px-2 sm:px-2 bg-white dark:bg-gray-800 flex-1">
        <TableExcel
          :key="rfidTableKey"
          :columns="rfidColumns"
          :data="(rfidDataTable as unknown as Record<string, unknown>[])"
          :loading="isRfidLoading"
        >
          <template #actions="{ row }">
            <div class="flex items-center justify-center space-x-2">
              <button
                type="button"
                @click="editRfidRow(row)"
                class="group relative inline-flex items-center justify-center p-2 text-sm font-medium text-white bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg hover:from-cyan-600 hover:to-blue-600 focus:ring-4 focus:outline-none focus:ring-cyan-200 transition-all duration-200"
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
              <button
                type="button"
                @click="deleteRfidRow(row)"
                class="inline-flex items-center justify-center p-2 text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 transition-all duration-200"
                title="Delete Data"
              >
                <svg class="w-4 h-4 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m2 0H7m2-3h6a1 1 0 011 1v1H8V5a1 1 0 011-1z"
                  />
                </svg>
              </button>
            </div>
          </template>

          <template #empty>
            <p class="text-gray-500">Tidak ada data RFID</p>
          </template>
        </TableExcel>
      </div>
    </div>
  </div>

  <Transition name="modal">
    <div
      v-if="palletDialog.form"
      class="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto overflow-x-hidden bg-gray-900/50 p-4"
      role="dialog"
      aria-modal="true"
      @click.self="palletDialog.form = false"
    >
      <div class="relative p-4 w-full max-w-lg max-h-full">
        <div class="relative bg-white rounded-lg shadow-lg dark:bg-gray-800">
          <div class="flex items-center justify-between p-5 border-b rounded-t border-gray-200 dark:border-gray-700">
            <div class="flex items-center space-x-3">
              <div class="p-2 bg-cyan-100 rounded-lg dark:bg-cyan-900">
                <svg class="w-6 h-6 text-cyan-600 dark:text-cyan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <h1 class="text-gray-600 dark:text-gray-300 text-2xl font-semibold">{{ palletAction }} Master Pallet</h1>
            </div>
            <button
              type="button"
              @click="palletDialog.form = false"
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
            </button>
          </div>
          <div class="p-5 space-y-5">
            <div>
              <label for="pallet" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Pallet</label>
              <input
                type="text"
                id="pallet"
                :value="palletFormData.pallet"
                @input="updatePalletFormData('pallet', ($event.target as HTMLInputElement).value)"
                class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                placeholder="Masukan Type Pallet"
                required
              />
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
              Pastikan data yang anda masukan sudah benar
            </div>
            <div class="flex items-center space-x-3">
              <button
                @click="palletDialog.form = false"
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

  <Transition name="modal">
    <div
      v-if="rfidDialog.form"
      class="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto overflow-x-hidden bg-gray-900/50 p-4"
      role="dialog"
      aria-modal="true"
      @click.self="rfidDialog.form = false"
    >
      <div class="relative p-4 w-full max-w-lg max-h-full">
        <div class="relative bg-white rounded-lg shadow-lg dark:bg-gray-800">
          <div class="flex items-center justify-between p-5 border-b rounded-t border-gray-200 dark:border-gray-700">
            <div class="flex items-center space-x-3">
              <div class="p-2 bg-violet-100 rounded-lg dark:bg-violet-900">
                <svg class="w-6 h-6 text-violet-600 dark:text-violet-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"
                  />
                </svg>
              </div>
              <h1 class="text-gray-600 dark:text-gray-300 text-2xl font-semibold">{{ rfidAction }} Master RFID</h1>
            </div>
            <button
              type="button"
              @click="rfidDialog.form = false"
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
            </button>
          </div>
          <div class="p-5 space-y-5">
            <div>
              <label for="rfid" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">RFID</label>
              <input
                type="text"
                id="rfid"
                :value="rfidFormData.no_rfid"
                @input="updateRfidFormData('no_rfid', ($event.target as HTMLInputElement).value)"
                class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-violet-500 focus:border-violet-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                placeholder="Masukan Nomor RFID"
                required
              />
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
              Pastikan data yang anda masukan sudah benar
            </div>
            <div class="flex items-center space-x-3">
              <button
                @click="rfidDialog.form = false"
                type="button"
                class="text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                @click="onSaveRfid"
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

  <Teleport to="body">
    <div v-if="palletDialog.delete" class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4 transition-opacity">
      <div class="relative w-full max-w-md bg-white rounded-xl shadow-2xl transform transition-all scale-100">
        <button
          @click="palletDialog.delete = false"
          type="button"
          class="absolute top-3 right-3 text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 inline-flex justify-center items-center"
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
        </button>
        <div class="p-6 text-center">
          <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg class="h-10 w-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h3 class="mb-2 text-xl font-bold text-gray-800">Delete Confirmation</h3>
          <p class="mb-5 text-lg font-normal text-gray-500">
            Apakah Anda yakin ingin menghapus Pallet<br />
            <span class="font-bold text-gray-800">{{ palletDeleteData?.pallet }}</span>
          </p>
          <p class="mb-6 text-sm text-gray-500">Tindakan ini tidak dapat dibatalkan.</p>
          <div class="flex justify-center gap-3">
            <button
              @click="deletePallet"
              :disabled="isPalletDeleting"
              type="button"
              class="text-white bg-red-600 hover:bg-red-800 focus:ring-4 focus:outline-none focus:ring-red-300 font-medium rounded-lg text-sm inline-flex items-center px-5 py-2.5 text-center mr-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg
                v-if="isPalletDeleting"
                aria-hidden="true"
                role="status"
                class="inline w-4 h-4 me-3 text-white animate-spin"
                viewBox="0 0 100 101"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 50.5908Z"
                  fill="#E5E7EB"
                />
                <path
                  d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                  fill="currentColor"
                />
              </svg>
              {{ isPalletDeleting ? 'Menghapus...' : 'Ya, Hapus' }}
            </button>
            <button
              @click="palletDialog.delete = false"
              type="button"
              class="text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-gray-200 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2.5 hover:text-gray-900 focus:z-10"
            >
              Tidak, batalkan
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>

  <Teleport to="body">
    <div v-if="rfidDialog.delete" class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4 transition-opacity">
      <div class="relative w-full max-w-md bg-white rounded-xl shadow-2xl transform transition-all scale-100">
        <button
          @click="rfidDialog.delete = false"
          type="button"
          class="absolute top-3 right-3 text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 inline-flex justify-center items-center"
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
        </button>
        <div class="p-6 text-center">
          <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg class="h-10 w-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h3 class="mb-2 text-xl font-bold text-gray-800">Delete Confirmation</h3>
          <p class="mb-5 text-lg font-normal text-gray-500">
            Apakah Anda yakin ingin menghapus RFID<br />
            <span class="font-bold text-gray-800">{{ rfidDeleteData?.no_rfid }}</span>
          </p>
          <p class="mb-6 text-sm text-gray-500">Tindakan ini tidak dapat dibatalkan.</p>
          <div class="flex justify-center gap-3">
            <button
              @click="deleteRfid"
              :disabled="isRfidDeleting"
              type="button"
              class="text-white bg-red-600 hover:bg-red-800 focus:ring-4 focus:outline-none focus:ring-red-300 font-medium rounded-lg text-sm inline-flex items-center px-5 py-2.5 text-center mr-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg
                v-if="isRfidDeleting"
                aria-hidden="true"
                role="status"
                class="inline w-4 h-4 me-3 text-white animate-spin"
                viewBox="0 0 100 101"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 50.5908Z"
                  fill="#E5E7EB"
                />
                <path
                  d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                  fill="currentColor"
                />
              </svg>
              {{ isRfidDeleting ? 'Menghapus...' : 'Ya, Hapus' }}
            </button>
            <button
              @click="rfidDialog.delete = false"
              type="button"
              class="text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-gray-200 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2.5 hover:text-gray-900 focus:z-10"
            >
              Tidak, batalkan
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
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
