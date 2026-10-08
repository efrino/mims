<script setup lang="ts">
import { ref, shallowRef, watch, onMounted } from 'vue';
import { useGoodsStore } from '@/stores/Logistik/MasterData/Goods';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { storeToRefs } from 'pinia';
import { useNotificationStore } from '@/stores/notification';
import TableExcel, { type TableColumn } from '@/components/table/TableExcel.vue';

const page = ref({ title: 'Goods Consumable' });
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
    title: 'Goods',
    disabled: true,
    href: '#'
  }
]);

const GoodsStore = useGoodsStore();
const notificationStore = useNotificationStore();

const { loadDataMasterGoods, onUpdateGoods, fetchMasterData, updateFormData, deleteGoods, confirmDelete } = GoodsStore;

const { dataTable, formDataIncoming, action, dialog, urlPreview, deleteData, isDeleting } =
  storeToRefs(GoodsStore);

const filterCategory = ref('CONSUMABLE');

const categories = ref([
  { value: 'CONSUMABLE', label: 'Consumable' },
  { value: 'PLANT SERVICE', label: 'Plant Service' },
  { value: 'TOOLING', label: 'Tooling' }
]);

const isLoading = ref(true);
const tableKey = ref(0);

const columns: TableColumn[] = [
  { key: 'code_material', label: 'Code Material' },
  { key: 'material_description', label: 'Material Description' },
  { key: 'satuan', label: 'Satuan' },
  { key: 'pcs_day', label: 'Keb/Hari' },
  { key: 'photo', label: 'Photo', align: 'center', filterable: false, sortable: false }
];

const editRow = (row: Record<string, unknown>) => {
  loadDataMasterGoods('Edit', row);
  urlPreview.value = null;
};

const deleteRow = (row: Record<string, unknown>) => {
  confirmDelete(row.code_material as string, row.material_description as string);
};

onMounted(async () => {
  isLoading.value = true;
  await fetchMasterData(filterCategory.value);
  isLoading.value = false;
  tableKey.value++;
});

watch(
  () => filterCategory.value,
  async (newCategory) => {
    if (newCategory) {
      isLoading.value = true;
      await fetchMasterData(newCategory);
      isLoading.value = false;
      tableKey.value++;
    }
  }
);

const getImgUrl = (codeMaterial: string, timestamp?: number) => {
  if (!codeMaterial) return '';
  return GoodsStore.getImgUrl(codeMaterial, timestamp);
};

const handleImageUpload = (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      formDataIncoming.value.photoPreview = e.target?.result as string;
    };
    reader.readAsDataURL(file);

    updateFormData('photo', file);
  }
};
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7"></BaseBreadcrumb>

  <div class="w-full bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden dark:bg-gray-800 dark:border-gray-700">
    <div class="relative bg-gradient-to-r from-cyan-400 via-cyan-500 to-cyan-600 py-8 px-4 sm:py-10">
      <div
        class="absolute inset-0 bg-white/5 opacity-30"
        style="background-image: radial-gradient(#ffffff 1px, transparent 1px); background-size: 20px 20px"
      ></div>
      <div class="relative flex flex-col sm:flex-row items-center justify-between gap-4">
        <div class="text-center sm:text-left">
          <h1 class="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight drop-shadow-sm">
            Master Data {{ categories.find((c) => c.value === filterCategory)?.label || 'Consumable' }}
          </h1>
        </div>
        <div class="w-full sm:w-auto">
          <div class="flex justify-center sm:justify-end">
            <div class="relative w-full sm:w-64">
              <select
                v-model="filterCategory"
                id="category"
                class="w-full bg-white/90 backdrop-blur-sm border border-white/30 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-white focus:border-white block p-3 pr-10 shadow-lg"
                required
              >
                <option value="" disabled>Pilih Kategori Barang</option>
                <option v-for="category in categories" :key="category.value" :value="category.value">
                  {{ category.label }}
                </option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="px-2 sm:px-2 bg-white dark:bg-gray-800">
      <div class="w-full max-w-10xl mx-auto">
        <TableExcel :key="tableKey" :columns="columns" :data="(dataTable as unknown as Record<string, unknown>[])" :loading="isLoading">
          <template #cell-photo="{ row }">
            <div class="relative group">
              <div v-if="(row as any).code_material" class="relative">
                <img
                  :src="getImgUrl((row as any).code_material)"
                  :alt="(row as any).material_description || 'Product Image'"
                  class="mx-auto w-20 h-20 object-cover rounded-lg shadow-md transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl"
                  loading="lazy"
                />
                <div
                  class="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                ></div>
              </div>
              <div v-else class="flex items-center justify-center w-20 h-20 mx-auto">
                <div class="text-gray-400">
                  <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="1.5"
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    ></path>
                  </svg>
                </div>
              </div>
            </div>
          </template>

          <template #actions="{ row }">
            <div class="flex items-center justify-center space-x-2">
              <button
                type="button"
                @click="editRow(row)"
                class="group relative inline-flex items-center justify-center p-2 text-sm font-medium text-white bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg hover:from-cyan-600 hover:to-blue-600 focus:ring-4 focus:outline-none focus:ring-cyan-200 dark:focus:ring-cyan-800 transition-all duration-200"
                title="Edit Data"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  ></path>
                </svg>
              </button>

              <button
                type="button"
                @click="deleteRow(row)"
                class="inline-flex items-center justify-center p-2 text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 transition-all duration-200"
                title="Delete Data"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="w-4 h-4 pointer-events-none"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                >
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
            <p class="text-gray-500">Tidak ada data untuk kategori ini</p>
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
      <div class="relative p-4 w-full max-w-4xl max-h-full">
        <div class="relative bg-white rounded-lg shadow-lg dark:bg-gray-800">
          <div class="flex items-center justify-between p-5 border-b rounded-t border-gray-200 dark:border-gray-700">
            <div class="flex items-center space-x-3">
              <div class="p-2 bg-blue-100 rounded-lg dark:bg-blue-900">
                <svg
                  class="w-6 h-6 text-blue-600 dark:text-blue-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  ></path>
                </svg>
              </div>
              <div>
                <h1 class="text-gray-600 dark:text-gray-300 text-2xl font-semibold">
                  {{ action }} Master Data {{ categories.find((c) => c.value === filterCategory)?.label || 'Consumable' }}
                </h1>
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

          <div class="p-5">
            <div class="space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="space-y-5">
                  <div>
                    <label for="code_material" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"> Code Material </label>
                    <input
                      type="text"
                      id="code_material"
                      v-model="formDataIncoming.code_material"
                      :disabled="action === 'Edit'"
                      class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                      placeholder="Masukan Code Material"
                      required
                    />
                  </div>

                  <div>
                    <label for="lokasi" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"> Area </label>
                    <input
                      type="text"
                      id="lokasi"
                      v-model="formDataIncoming.lokasi"
                      class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                      placeholder="Area/Lokasi"
                    />
                  </div>

                  <div>
                    <label for="pcs_day" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"> Keb/Hari </label>
                    <input
                      type="number"
                      id="pcs_day"
                      v-model="formDataIncoming.pcs_day"
                      class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div class="space-y-5">
                  <div>
                    <label for="material_description" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                      Material Description
                    </label>
                    <input
                      type="text"
                      id="material_description"
                      v-model="formDataIncoming.material_description"
                      class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                      placeholder="Deskripsi Material"
                    />
                  </div>

                  <div>
                    <label for="satuan" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"> Satuan </label>
                    <input
                      type="text"
                      id="satuan"
                      v-model="formDataIncoming.satuan"
                      class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                      placeholder="PCS/KG"
                    />
                  </div>

                  <div>
                    <label for="photo" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"> Upload Photo </label>
                    <input
                      type="file"
                      id="photo"
                      accept="image/*"
                      @change="handleImageUpload"
                      class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div class="mt-6">
                <label class="block mb-3 text-sm font-medium text-gray-900 dark:text-white"> Photo Preview </label>

                <div
                  v-if="formDataIncoming.photoPreview || formDataIncoming.code_material"
                  class="relative w-full aspect-[16/9] rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600"
                >
                  <img
                    :src="formDataIncoming.photoPreview || getImgUrl(formDataIncoming.code_material)"
                    :alt="formDataIncoming.material_description || 'Product Image'"
                    class="w-full h-full object-contain p-4"
                  />
                </div>

                <div
                  v-else
                  class="w-full aspect-[16/9] rounded-lg bg-gray-50 dark:bg-gray-700 border border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center p-8"
                >
                  <div class="text-center">
                    <svg
                      class="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="1.5"
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      ></path>
                    </svg>
                    <p class="mt-3 text-sm font-medium text-gray-500 dark:text-gray-400">No Image Preview</p>
                    <p class="mt-1 text-xs text-gray-400 dark:text-gray-500">Upload a photo or existing image will appear here</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between p-5 border-t border-gray-200 dark:border-gray-700">
            <div class="text-sm text-gray-500 dark:text-gray-400">
              <p class="flex items-center">
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
                Fill all required fields before saving
              </p>
            </div>
            <div class="flex items-center space-x-3">
              <button
                @click="dialog.form = false"
                type="button"
                class="text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700"
              >
                Cancel
              </button>
              <button
                @click="onUpdateGoods"
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
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
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
            <svg class="h-10 w-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              ></path>
            </svg>
          </div>

          <h3 class="mb-2 text-xl font-bold text-gray-800">Delete Confirmation</h3>

          <h3 class="mb-5 text-lg font-normal text-gray-500 dark:text-gray-400">
            Apakah Anda yakin ingin menghapus Code Material<br />
            <span class="font-bold text-gray-800">{{ deleteData?.code_material }}</span> ini?
            <br />
            <span class="text-sm text-gray-600 mt-2 block">{{ deleteData?.material_description }}</span>
          </h3>

          <p class="mb-6 text-sm text-gray-500">Tindakan ini tidak dapat dibatalkan.</p>

          <div class="flex justify-center gap-3">
            <button
              @click="deleteGoods"
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
                  d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
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
              class="text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-gray-200 rounded-lg border-button border-gray-200 text-sm font-medium px-5 py-2.5 hover:text-gray-900 focus:z-10"
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
