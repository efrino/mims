<script setup lang="ts">
import { ref, shallowRef, watch, onMounted, computed } from 'vue';
import { useCombineStore } from '@/stores/Logistik/MasterData/CombinePallet';
import { useRfidStore } from '@/stores/Logistik/MasterData/MasterRfid';
import { usePalletStore } from '@/stores/Logistik/MasterData/MasterPallet';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { storeToRefs } from 'pinia';
import TableExcel, { type TableColumn } from '@/components/table/TableExcel.vue';

const page = ref({ title: 'Master Combine RFID Pallet' });
const breadcrumbs = shallowRef([
  {
    title: 'Logistik',
    disabled: false,
    href: '#'
  },
  {
    title: 'Master Data',
    disabled: false,
    href: '#'
  },
  {
    title: 'Master RFID Pallet',
    disabled: true,
    href: '#'
  }
]);

const palletStore = useCombineStore();
const { uploadExcel, downloadTemplate } = palletStore;
const fileInput = ref<HTMLInputElement | null>(null);

// ─── Master RFID & Pallet stores for select options ──────────────────────────
const rfidStore = useRfidStore();
const masterPalletStore = usePalletStore();
const { dataTable: rfidOptions } = storeToRefs(rfidStore);
const { dataTable: masterPalletOptions } = storeToRefs(masterPalletStore);

// ─── Searchable Select State ──────────────────────────────────────────────────
const rfidSearch = ref('');
const typeSearch = ref('');
const rfidDropdownOpen = ref(false);
const typeDropdownOpen = ref(false);

const filteredRfidOptions = computed(() => {
  if (!rfidOptions.value) return [];
  const q = rfidSearch.value.trim().toLowerCase();
  if (!q) return rfidOptions.value;
  return rfidOptions.value.filter((r: any) => String(r.no_rfid).toLowerCase().includes(q));
});

const filteredTypeOptions = computed(() => {
  if (!masterPalletOptions.value) return [];
  const q = typeSearch.value.trim().toLowerCase();
  if (!q) return masterPalletOptions.value;
  return masterPalletOptions.value.filter((p: any) => String(p.pallet).toLowerCase().includes(q));
});

const selectRfid = (item: any) => {
  updateFormData('no_rfid', String(item.no_rfid));
  rfidSearch.value = String(item.no_rfid);
  rfidDropdownOpen.value = false;
};

const selectType = (item: any) => {
  updateFormData('type', String(item.pallet));
  typeSearch.value = String(item.pallet);
  typeDropdownOpen.value = false;
};

const openRfidDropdown = () => {
  rfidDropdownOpen.value = true;
};

const openTypeDropdown = () => {
  typeDropdownOpen.value = true;
};

// Close dropdowns on outside click
const onRfidBlur = () => {
  setTimeout(() => {
    rfidDropdownOpen.value = false;
    // Reset search to current value if nothing valid typed
    if (!formData.value.no_rfid) rfidSearch.value = '';
    else rfidSearch.value = String(formData.value.no_rfid);
  }, 150);
};

const onTypeBlur = () => {
  setTimeout(() => {
    typeDropdownOpen.value = false;
    if (!formData.value.type) typeSearch.value = '';
    else typeSearch.value = String(formData.value.type);
  }, 150);
};

const triggerFileInput = () => {
  fileInput.value?.click();
};

const columns: TableColumn[] = [
  { key: 'no_rfid', label: 'RFID' },
  { key: 'name', label: 'NAME' },
  { key: 'no_pallet', label: 'No Pallet' },
  { key: 'type', label: 'Type' },
  { key: 'category', label: 'Category' },
  { key: 'customer', label: 'Customer' }
];

const handleFileUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (!file) return;

  await uploadExcel(file);

  target.value = '';
};
const { loadFormPallet, onSavePallet, deletePallet, confirmDelete, updateFormData } = palletStore;

const { dataTable, formData, action, dialog, deleteData, isDeleting } = storeToRefs(palletStore);

// Sync search fields when modal opens / formData changes
watch(
  () => dialog.value.form,
  (open) => {
    if (open) {
      rfidSearch.value = formData.value.no_rfid ? String(formData.value.no_rfid) : '';
      typeSearch.value = formData.value.type ? String(formData.value.type) : '';
      rfidDropdownOpen.value = false;
      typeDropdownOpen.value = false;
    }
  }
);

const isLoading = ref(true);
const tableKey = ref(0);

const editRow = (row: Record<string, unknown>) => {
  loadFormPallet('Edit', row);
};

const deleteRow = (row: Record<string, unknown>) => {
  confirmDelete(row.id as string, row.no_rfid as string, row.no_pallet as string, row.type as string);
};

onMounted(async () => {
  isLoading.value = true;
  await Promise.all([palletStore.fetchMasterPallet(), rfidStore.fetchMasterRfid(), masterPalletStore.fetchMasterPallet()]);
  isLoading.value = false;
  tableKey.value++;
});
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7" />

  <div class="w-full bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden dark:bg-gray-800 dark:border-gray-700">
    <div class="relative bg-gradient-to-r from-cyan-400 via-cyan-500 to-cyan-600 py-8 px-4 sm:py-10">
      <div
        class="absolute inset-0 bg-white/5 opacity-30"
        style="background-image: radial-gradient(#ffffff 1px, transparent 1px); background-size: 20px 20px"
      />
      <div class="relative flex flex-col sm:flex-row items-center justify-between gap-4">
        <div class="text-center sm:text-left">
          <h1 class="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight drop-shadow-sm">
            Master Combine RFID Pallet
          </h1>
        </div>
        <div class="w-full sm:w-auto flex flex-wrap gap-3 justify-center sm:justify-end">
          <button
            type="button"
            @click="loadFormPallet('Create')"
            class="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-cyan-600 bg-white rounded-xl shadow-md hover:bg-cyan-50 focus:outline-none focus:ring-2 focus:ring-white transition-all duration-200"
          >
            Tambah Data
          </button>
          <button
            type="button"
            @click="palletStore.downloadExcel"
            class="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-blue-600 bg-white rounded-xl shadow-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all duration-200"
          >
            📊 Download Excel
          </button>
          <button
            type="button"
            @click="downloadTemplate"
            class="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-green-600 bg-white rounded-xl shadow-md hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-200 transition-all duration-200"
          >
            📥 Download Template
          </button>

          <button
            type="button"
            @click="triggerFileInput"
            :disabled="palletStore.uploading"
            class="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-purple-600 bg-white rounded-xl shadow-md hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all duration-200 disabled:opacity-50"
          >
            <span v-if="palletStore.uploading">Uploading...</span>
            <span v-else>📤 Upload Excel</span>
          </button>

          <input type="file" ref="fileInput" accept=".xlsx,.xls" class="hidden" @change="handleFileUpload" />
        </div>
      </div>
    </div>

    <div class="px-2 sm:px-2 bg-white dark:bg-gray-800">
      <div class="w-full max-w-10xl mx-auto">
        <TableExcel :key="tableKey" :columns="columns" :data="(dataTable as unknown as Record<string, unknown>[])" :loading="isLoading">
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
              <button
                type="button"
                @click="deleteRow(row)"
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
            <p class="text-gray-500">Tidak ada data</p>
          </template>
        </TableExcel>
      </div>
    </div>
  </div>

  <!-- ── Form Modal ─────────────────────────────────────────────────────────── -->
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
              <h1 class="text-gray-600 dark:text-gray-300 text-2xl font-semibold">{{ action }} Master RFID Pallet</h1>
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
            <!-- ── RFID Searchable Select ───────────────────────────────────── -->
            <div>
              <label for="no_rfid_search" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"> RFID </label>
              <div class="relative">
                <div class="relative">
                  <input
                    id="no_rfid_search"
                    type="text"
                    v-model="rfidSearch"
                    @focus="openRfidDropdown"
                    @blur="onRfidBlur"
                    autocomplete="off"
                    placeholder="Cari atau pilih RFID..."
                    class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 pr-10 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                  />
                  <span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">
                    <svg
                      class="w-4 h-4 transition-transform duration-200"
                      :class="{ 'rotate-180': rfidDropdownOpen }"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </div>

                <!-- Dropdown list -->
                <div
                  v-if="rfidDropdownOpen"
                  class="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg dark:bg-gray-700 dark:border-gray-600 max-h-52 overflow-y-auto"
                >
                  <ul class="py-1 text-sm text-gray-700 dark:text-gray-200">
                    <li
                      v-for="rfid in filteredRfidOptions"
                      :key="rfid.id"
                      @mousedown.prevent="selectRfid(rfid)"
                      class="flex items-center px-4 py-2.5 cursor-pointer hover:bg-blue-50 dark:hover:bg-gray-600 transition-colors duration-100"
                      :class="{
                        'bg-blue-50 font-semibold text-blue-700 dark:bg-gray-600 dark:text-blue-300':
                          String(formData.no_rfid) === String(rfid.no_rfid)
                      }"
                    >
                      <svg class="w-3.5 h-3.5 mr-2 text-blue-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fill-rule="evenodd"
                          d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-3-3a1 1 0 011.414-1.414L10 15.586l6.293-6.293a1 1 0 011.414 0z"
                          clip-rule="evenodd"
                        />
                      </svg>
                      {{ rfid.no_rfid }}
                    </li>
                    <li v-if="filteredRfidOptions.length === 0" class="px-4 py-3 text-center text-gray-400 dark:text-gray-500 select-none">
                      <svg class="w-5 h-5 mx-auto mb-1 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Tidak ada RFID ditemukan
                    </li>
                  </ul>
                </div>
              </div>

              <!-- Hint: selected value -->
              <p v-if="formData.no_rfid" class="mt-1 text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fill-rule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clip-rule="evenodd"
                  />
                </svg>
                Terpilih: <span class="font-semibold">{{ formData.no_rfid }}</span>
              </p>
            </div>

            <!-- ── No Pallet ────────────────────────────────────────────────── -->
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

            <!-- ── Name ────────────────────────────────────────────────────── -->
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

            <!-- ── Type Searchable Select ───────────────────────────────────── -->
            <div>
              <label for="type_search" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"> Type </label>
              <div class="relative">
                <div class="relative">
                  <input
                    id="type_search"
                    type="text"
                    v-model="typeSearch"
                    @focus="openTypeDropdown"
                    @blur="onTypeBlur"
                    autocomplete="off"
                    placeholder="Cari atau pilih Type Pallet..."
                    class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 pr-10 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                  />
                  <!-- chevron icon -->
                  <span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">
                    <svg
                      class="w-4 h-4 transition-transform duration-200"
                      :class="{ 'rotate-180': typeDropdownOpen }"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </div>

                <!-- Dropdown list -->
                <div
                  v-if="typeDropdownOpen"
                  class="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg dark:bg-gray-700 dark:border-gray-600 max-h-52 overflow-y-auto"
                >
                  <ul class="py-1 text-sm text-gray-700 dark:text-gray-200">
                    <li
                      v-for="pallet in filteredTypeOptions"
                      :key="pallet.id"
                      @mousedown.prevent="selectType(pallet)"
                      class="flex items-center px-4 py-2.5 cursor-pointer hover:bg-blue-50 dark:hover:bg-gray-600 transition-colors duration-100"
                      :class="{
                        'bg-blue-50 font-semibold text-blue-700 dark:bg-gray-600 dark:text-blue-300':
                          String(formData.type) === String(pallet.pallet)
                      }"
                    >
                      <svg class="w-3.5 h-3.5 mr-2 text-blue-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fill-rule="evenodd"
                          d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-3-3a1 1 0 011.414-1.414L10 15.586l6.293-6.293a1 1 0 011.414 0z"
                          clip-rule="evenodd"
                        />
                      </svg>
                      {{ pallet.pallet }}
                    </li>
                    <li v-if="filteredTypeOptions.length === 0" class="px-4 py-3 text-center text-gray-400 dark:text-gray-500 select-none">
                      <svg class="w-5 h-5 mx-auto mb-1 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Tidak ada pallet ditemukan
                    </li>
                  </ul>
                </div>
              </div>

              <!-- Hint: selected value -->
              <p v-if="formData.type" class="mt-1 text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fill-rule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clip-rule="evenodd"
                  />
                </svg>
                Terpilih: <span class="font-semibold">{{ formData.type }}</span>
              </p>
            </div>

            <!-- ── Category ────────────────────────────────────────────────── -->
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

            <!-- ── Customer ───────────────────────────────────────────────── -->
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

            <!-- ── Condition Pallet ────────── -->
            <div v-if="action !== 'Create' && action !== 'Edit'">
              <label for="is_active" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"> Condition Pallet </label>
              <select
                id="is_active"
                :value="formData.is_active"
                @change="updateFormData('is_active', ($event.target as HTMLSelectElement).value)"
                class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="2">NC</option>
                <option value="1">OK</option>
                <option value="0">NG</option>
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
              Pastikan data yang anda masukan sudah benar
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

  <!-- ── Delete Modal ───────────────────────────────────────────────────────── -->
  <Teleport to="body">
    <div v-if="dialog.delete" class="fixed inset-0 z-9999 flex items-center justify-center bg-black/70 p-4 transition-opacity">
      <div class="relative w-full max-w-md bg-white rounded-xl shadow-2xl transform transition-all scale-100">
        <button
          @click="dialog.delete = false"
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
          <span class="sr-only">Close modal</span>
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
          <p class="mb-5 text-lg font-normal text-gray-500 dark:text-gray-400">
            Apakah Anda yakin ingin menghapus Pallet<br />
            <span class="font-bold text-gray-800">{{ deleteData?.no_rfid }}</span>
            <span class="font-bold text-gray-800"> No. Pallet {{ deleteData?.no_pallet }}</span>
            dengan Type <span class="font-bold text-gray-800">{{ deleteData?.type }}</span
            >?
          </p>
          <p class="mb-6 text-sm text-gray-500">Tindakan ini tidak dapat dibatalkan.</p>

          <div class="flex justify-center gap-3">
            <button
              @click="deletePallet"
              :disabled="isDeleting"
              type="button"
              class="text-white bg-red-600 hover:bg-red-800 focus:ring-4 focus:outline-none focus:ring-red-300 font-medium rounded-lg text-sm inline-flex items-center px-5 py-2.5 text-center mr-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg
                v-if="isDeleting"
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
              {{ isDeleting ? 'Menghapus...' : 'Ya, Hapus' }}
            </button>
            <button
              @click="dialog.delete = false"
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
