<script setup lang="ts">
import { ref, shallowRef, watch, nextTick, onMounted } from 'vue';
import { useRfidStore } from '@/stores/Logistik/MasterData/MasterRfid';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { storeToRefs } from 'pinia';
import { DataTable } from 'simple-datatables';

const page = ref({ title: 'Master Rfid' });
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
    title: 'Master Rfid',
    disabled: true,
    href: '#'
  }
]);

const rfidStore = useRfidStore();
const { uploadExcel } = rfidStore;
const fileInput = ref<HTMLInputElement | null>(null);

const triggerFileInput = () => {
  fileInput.value?.click();
};

const handleFileUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (!file) return;

  await uploadExcel(file);

  target.value = '';
};
const { loadFormRfid, onSaveRfid, deleteRfid, confirmDelete, updateFormData } = rfidStore;

const { dataTable, formData, action, dialog, deleteData, isDeleting } = storeToRefs(rfidStore);

let isLoading = ref(true);
let dataTableInstance: any = null;
const isTableReady = ref(true);

onMounted(async () => {
  await rfidStore.fetchMasterRfid();
});

const initDataTable = () => {
  const tableElement = document.querySelector('#rfid-table') as HTMLTableElement | null;
  if (!tableElement) return;

  tableElement.addEventListener('click', (e: Event) => {
    const target = e.target as HTMLElement;

    const editButton = target.closest('.btn-edit') as HTMLElement | null;
    if (editButton) {
      const rawData = editButton.dataset.item;
      if (rawData) {
        try {
          const data = JSON.parse(rawData);
          loadFormRfid('Edit', data);
        } catch (error) {
          console.error('Gagal parsing data:', error);
        }
      }
    }

    const deleteButton = target.closest('.btn-delete') as HTMLElement | null;
    if (deleteButton) {
      const rawData = deleteButton.dataset.item;
      if (rawData) {
        try {
          const data = JSON.parse(rawData);
          confirmDelete(data.id, data.no_rfid);
        } catch (error) {
          console.error('Gagal parsing data:', error);
        }
      }
    }
  });

  if (typeof DataTable !== 'undefined') {
    dataTableInstance = new DataTable(tableElement, {
      tableRender: (_data, table, type) => {
        if (type === 'print') return table;
        const tHead = table?.childNodes![0];
        const firstRowHeaders = tHead?.childNodes![0]?.childNodes;
        const totalColumns = firstRowHeaders?.length || 0;

        const filterHeaders = {
          nodeName: 'TR',
          attributes: { class: 'search-filtering-row' },
          childNodes: firstRowHeaders?.map((_th, index) => {
            if (index === 0 || index === totalColumns - 1) {
              return { nodeName: 'TH', childNodes: [] };
            }
            return {
              nodeName: 'TH',
              childNodes: [
                {
                  nodeName: 'INPUT',
                  attributes: {
                    class: 'datatable-input',
                    type: 'search',
                    'data-columns': '[' + index + ']'
                  }
                }
              ]
            };
          })
        };
        tHead.childNodes?.push(filterHeaders);
        return table;
      }
    });
  }
};

watch(
  () => dataTable.value,
  async (newValue) => {
    isLoading.value = false;
    if (dataTableInstance) {
      dataTableInstance.destroy();
      dataTableInstance = null;
    }
    isTableReady.value = false;
    await nextTick();
    isTableReady.value = true;
    await nextTick();
    if (newValue && newValue.length > 0) {
      setTimeout(() => {
        initDataTable();
      }, 100);
    }
  },
  { deep: true }
);
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
          <h1 class="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight drop-shadow-sm">Master RFID</h1>
        </div>
        <div class="w-full sm:w-auto flex flex-wrap gap-3 justify-center sm:justify-end">
          <button
            type="button"
            @click="loadFormRfid('Create')"
            class="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-cyan-600 bg-white rounded-xl shadow-md hover:bg-cyan-50 focus:outline-none focus:ring-2 focus:ring-white transition-all duration-200"
          >
            Tambah Data
          </button>
          <button
            type="button"
            @click="triggerFileInput"
            :disabled="rfidStore.uploading"
            class="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-purple-600 bg-white rounded-xl shadow-md hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all duration-200 disabled:opacity-50"
          >
            <span v-if="rfidStore.uploading">Uploading...</span>
            <span v-else>📤 Upload Excel</span>
          </button>

          <input type="file" ref="fileInput" accept=".xlsx,.xls" class="hidden" @change="handleFileUpload" />
        </div>
      </div>
    </div>

    <div class="p-2 sm:p-4 bg-white dark:bg-gray-800">
      <div v-if="!isLoading && isTableReady" class="w-full max-w-10xl mx-auto">
        <table id="pallet-table" class="w-full text-sm text-gray-500 text-center">
          <thead class="text-gray-700 bg-gray-50">
            <tr>
              <th scope="col">
                <span class="flex items-center mt-2"
                  >No
                  <svg
                    class="w-4 h-4 ms-1"
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
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="m8 15 4 4 4-4m0-6-4-4-4 4"
                    />
                  </svg>
                </span>
              </th>
              <th scope="col">
                <span class="flex items-center mt-2"
                  >RFID
                  <svg
                    class="w-4 h-4 ms-1"
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
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="m8 15 4 4 4-4m0-6-4-4-4 4"
                    />
                  </svg>
                </span>
              </th>
              <th scope="col">
                <span class="flex items-center mt-2">Action</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(item, index) in dataTable"
              :key="item.id"
              class="odd:bg-white odd:dark:bg-gray-900 even:bg-gray-50 even:dark:bg-gray-800 border-b hover:bg-blue-50! border-gray-200"
            >
              <td class="px-6 py-4 font-medium text-gray-900">{{ index + 1 }}</td>
              <td class="px-6 py-4 font-medium">{{ item.no_rfid }}</td>
              <td class="px-6 py-4 text-center sticky right-0 z-10 shadow-[-10px_0_15px_-5px_rgba(0,0,0,0.1)]">
                <div class="flex items-center justify-center space-x-2">
                  <button
                    type="button"
                    class="btn-edit group relative inline-flex items-center justify-center p-2 text-sm font-medium text-white bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg hover:from-cyan-600 hover:to-blue-600 focus:ring-4 focus:outline-none focus:ring-cyan-200 dark:focus:ring-cyan-800 transition-all duration-200"
                    :data-item="JSON.stringify(item)"
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
                    class="btn-delete inline-flex items-center justify-center p-2 text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 transition-all duration-200"
                    :data-item="JSON.stringify(item)"
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
              </td>
            </tr>
            <tr v-if="(!dataTable || dataTable.length === 0) && !isLoading">
              <td colspan="6" class="px-6 py-8 text-center text-gray-500">Tidak ada data rfid</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="flex h-full w-full justify-center items-center">
        <p class="text-center font-semibold text-gray-400 my-7">loading ...</p>
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
              <h1 class="text-gray-600 dark:text-gray-300 text-2xl font-semibold">{{ action }} Master Rfid</h1>
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
            <div>
              <label for="no_rfid" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"> Rfid </label>
              <input
                type="text"
                id="rfid"
                :value="formData.no_rfid"
                @input="updateFormData('no_rfid', ($event.target as HTMLInputElement).value)"
                class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
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
                @click="dialog.form = false"
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
            Apakah Anda yakin ingin menghapus RFID<br />
            <span class="font-bold text-gray-800">{{ deleteData?.no_rfid }}</span>
          </p>
          <p class="mb-6 text-sm text-gray-500">Tindakan ini tidak dapat dibatalkan.</p>

          <div class="flex justify-center gap-3">
            <button
              @click="deleteRfid"
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
  border-radius: 0.5rem;
  min-width: 16rem;
  font-size: 0.875rem;
  display: none;
}

.datatable-wrapper .datatable-top .datatable-dropdown .datatable-selector {
  background-color: var(--color-gray-50);
  color: var(--color-gray-900);
  border: 1px solid var(--color-gray-300);
  border-radius: 0.5rem;
  min-width: 4rem;
  margin-right: 0.25rem;
  font-size: 0.875rem;
}

.datatable-wrapper .datatable-table thead {
  color: var(--color-gray-500);
  background-color: var(--color-gray-50);
  font-size: 0.9rem;
}

.datatable-wrapper thead th .datatable-input {
  color: var(--color-gray-900);
  background-color: #fff;
  min-width: 0;
  max-width: 160px;
  margin: 10px 10px;
  font-weight: 400;
  border: 1px solid var(--color-gray-300);
  border-radius: 0.5rem;
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

.datatable-wrapper .datatable-bottom .datatable-pagination .datatable-pagination-list-item-link {
  color: var(--color-gray-500);
  border-top: 1px solid var(--color-gray-300);
  border-bottom: 1px solid var(--color-gray-300);
  border-right: 1px solid var(--color-gray-300);
  align-items: center;
  height: 2rem;
  padding-left: 0.75rem;
  padding-right: 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  display: flex;
}

.datatable-wrapper .datatable-bottom .datatable-pagination .datatable-pagination-list-item-link:hover {
  background-color: var(--color-gray-50);
  color: var(--color-gray-700);
}

.datatable-wrapper .datatable-bottom .datatable-pagination .datatable-pagination-list-item:first-of-type,
.datatable-wrapper .datatable-bottom .datatable-pagination .datatable-pagination-list-item:last-of-type {
  position: relative;
}

.datatable-wrapper
  .datatable-bottom
  .datatable-pagination
  .datatable-pagination-list-item:first-of-type
  .datatable-pagination-list-item-link,
.datatable-wrapper
  .datatable-bottom
  .datatable-pagination
  .datatable-pagination-list-item:last-of-type
  .datatable-pagination-list-item-link {
  color: #0000;
}

.datatable-wrapper
  .datatable-bottom
  .datatable-pagination
  .datatable-pagination-list-item:first-of-type
  .datatable-pagination-list-item-link:after {
  content: url("data:image/svg+xml,%3csvg aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='20' height='20' fill='none' viewBox='0 0 24 24'%3e %3cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m14 8-4 4 4 4'/%3e %3c/svg%3e");
  width: 1.3rem;
  height: 1.3rem;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.datatable-wrapper
  .datatable-bottom
  .datatable-pagination
  .datatable-pagination-list-item:last-of-type
  .datatable-pagination-list-item-link:after {
  content: url("data:image/svg+xml,%3csvg aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='20' height='20' fill='none' viewBox='0 0 24 24'%3e %3cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m10 16 4-4-4-4'/%3e %3c/svg%3e");
  width: 1.3rem;
  height: 1.3rem;
  position: absolute;
  top: 50%;
  right: 50%;
  transform: translate(50%, -50%);
}

.datatable-wrapper
  .datatable-bottom
  .datatable-pagination
  .datatable-pagination-list-item:first-of-type
  .datatable-pagination-list-item-link {
  border-left: 1px solid var(--color-gray-300);
  border-top-left-radius: 0.5rem;
  border-bottom-left-radius: 0.5rem;
}

.datatable-wrapper
  .datatable-bottom
  .datatable-pagination
  .datatable-pagination-list-item:last-of-type
  .datatable-pagination-list-item-link {
  border-left: 0;
  border-top-right-radius: 0.5rem;
  border-bottom-right-radius: 0.5rem;
}
</style>
