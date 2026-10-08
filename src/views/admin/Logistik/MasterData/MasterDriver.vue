<script setup lang="ts">
import { ref, shallowRef, onMounted } from 'vue';
import { useDriverStore } from '@/stores/Logistik/MasterData/MasterDriver';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { storeToRefs } from 'pinia';
import QrcodeVue from 'qrcode.vue';
import TableExcel, { type TableColumn } from '@/components/table/TableExcel.vue';

const page = ref({ title: 'Master Driver' });
const breadcrumbs = shallowRef([
  { title: 'Logistik', disabled: false, href: '#' },
  { title: 'Master Data', disabled: false, href: '#' },
  { title: 'Master Driver', disabled: true, href: '#' }
]);

const driverStore = useDriverStore();
const { uploadExcel } = driverStore;
const fileInput = ref<HTMLInputElement | null>(null);

const triggerFileInput = () => fileInput.value?.click();

const handleFileUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  await uploadExcel(file);
  target.value = '';
};

const { loadFormDriver, onSaveDriver, deleteDriver, confirmDelete, updateFormData } = driverStore;

const { dataTable, formData, action, dialog, deleteData, isDeleting } = storeToRefs(driverStore);

// --- QR Print State ---
interface DriverItem {
  id: number | string;
  nik: string;
  nama_driver: string;
  nama_lp: string;
}

const showQrModal = ref(false);
const qrDriver = ref<DriverItem | null>(null);
const qrValue = ref<string>('');

const openQrModal = (item: DriverItem) => {
  qrDriver.value = item;
  qrValue.value = item.nik;
  showQrModal.value = true;
};

const printQr = () => {
  if (!qrDriver.value) return;
  const d = qrDriver.value;

  const canvas = document.querySelector('#qr-modal-canvas canvas') as HTMLCanvasElement | null;
  const qrImageSrc = canvas ? canvas.toDataURL('image/png') : '';

  const win = window.open('', '_blank', 'width=400,height=520');
  if (!win) return;
  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <title></title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: #fff;
        }
        .card { text-align: center; width: 240px; }
        .qr-img { width: 200px; height: 200px; margin: 0 auto 14px; display: block; }
        .divider { border: none; border-top: 1px dashed #d1d5db; margin: 10px 0; }
        .driver-nik { font-size: 14px; font-weight: 700; color: #111827; letter-spacing: 0.5px; margin-bottom: 3px; }
        .driver-name { font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 2px; }
        .driver-lp { font-size: 12px; color: #6b7280; }
        @media print { body { background: #fff; } }
        @page { margin: 0; size: auto; }
      </style>
    </head>
    <body>
      <div class="card">
        <img src="${qrImageSrc}" class="qr-img" alt="QR Code" />
        <hr class="divider"/>
        <p class="driver-nik">${d.nik || '-'}</p>
        <p class="driver-name">${d.nama_driver || '-'}</p>
        <p class="driver-lp">${d.nama_lp || '-'}</p>
      </div>
      <script>
        window.onload = function() {
          window.print();
          window.onafterprint = function() { window.close(); };
        };
      <\/script>
    </body>
    </html>
  `);
  win.document.close();
};

// --- Table ---
const isLoading = ref(true);
const tableKey = ref(0);

const columns: TableColumn[] = [
  { key: 'nik', label: 'NIK' },
  { key: 'nama_driver', label: 'Nama Driver' },
  { key: 'nama_lp', label: 'Nama LP' }
];

const editRow = (row: Record<string, unknown>) => {
  loadFormDriver('Edit', row);
};

const deleteRow = (row: Record<string, unknown>) => {
  confirmDelete(row.id as string, row.nama_driver as string);
};

const qrRow = (row: Record<string, unknown>) => {
  openQrModal(row as unknown as DriverItem);
};

onMounted(async () => {
  isLoading.value = true;
  await driverStore.fetchMasterDriver();
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
          <h1 class="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight drop-shadow-sm">Master Driver</h1>
        </div>
        <div class="w-full sm:w-auto flex flex-wrap gap-3 justify-center sm:justify-end">
          <button
            type="button"
            @click="loadFormDriver('Create')"
            class="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-cyan-600 bg-white rounded-xl shadow-md hover:bg-cyan-50 focus:outline-none focus:ring-2 focus:ring-white transition-all duration-200"
          >
            Tambah Data
          </button>
          <button
            type="button"
            @click="triggerFileInput"
            :disabled="driverStore.uploading"
            class="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-purple-600 bg-white rounded-xl shadow-md hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all duration-200 disabled:opacity-50"
          >
            <span v-if="driverStore.uploading">Uploading...</span>
            <span v-else>📤 Upload Excel</span>
          </button>
          <input type="file" ref="fileInput" accept=".xlsx,.xls" class="hidden" @change="handleFileUpload" />
        </div>
      </div>
    </div>

    <div class="p-2 sm:p-4 bg-white dark:bg-gray-800">
      <div class="w-full max-w-10xl mx-auto">
        <TableExcel :key="tableKey" :columns="columns" :data="(dataTable as unknown as Record<string, unknown>[])" :loading="isLoading">
          <template #cell-nik="{ row }">{{ (row as any).nik || '-' }}</template>
          <template #cell-nama_driver="{ row }">{{ (row as any).nama_driver || '-' }}</template>
          <template #cell-nama_lp="{ row }">{{ (row as any).nama_lp || '-' }}</template>

          <template #actions="{ row }">
            <div class="flex items-center justify-center space-x-2">
              <!-- Edit -->
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

              <!-- Print QR -->
              <button
                type="button"
                @click="qrRow(row)"
                class="inline-flex items-center justify-center p-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 transition-all duration-200"
                title="Print QR Barcode"
              >
                <svg class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M3 3h6v6H3V3zm2 2v2h2V5H5zm8-2h6v6h-6V3zm2 2v2h2V5h-2zM3 13h6v6H3v-6zm2 2v2h2v-2H5zm10 0h2v2h-2v-2zm-2 2h2v2h-2v-2zm4 0h2v2h-2v-2zm-2-4h2v2h-2v-2zm2 2h2v2h-2v-2z"
                  />
                </svg>
              </button>

              <!-- Delete -->
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
            <p class="text-gray-500">Tidak ada data driver</p>
          </template>
        </TableExcel>
      </div>
    </div>
  </div>

  <!-- ==================== Modal Form Driver ==================== -->
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
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <h1 class="text-gray-600 dark:text-gray-300 text-2xl font-semibold">{{ action }} Master Driver</h1>
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
            </button>
          </div>

          <div class="p-5 space-y-5">
            <div>
              <label for="nik" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">NIK (Nomor Induk Karyawan)</label>
              <input
                type="text"
                id="nik"
                :value="formData.nik"
                @input="updateFormData('nik', ($event.target as HTMLInputElement).value)"
                class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                placeholder="Masukan NIK Driver"
                required
              />
            </div>
            <div>
              <label for="nama_driver" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Nama Driver</label>
              <input
                type="text"
                id="nama_driver"
                :value="formData.nama_driver"
                @input="updateFormData('nama_driver', ($event.target as HTMLInputElement).value)"
                class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                placeholder="Masukan Nama Driver"
                required
              />
            </div>
            <div>
              <label for="nama_lp" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Nama LP</label>
              <input
                type="text"
                id="nama_lp"
                :value="formData.nama_lp"
                @input="updateFormData('nama_lp', ($event.target as HTMLInputElement).value)"
                class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                placeholder="Masukan Nama LP"
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
                @click="onSaveDriver"
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

  <!-- ==================== Modal QR Barcode ==================== -->
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="showQrModal"
        class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4"
        role="dialog"
        aria-modal="true"
        @click.self="showQrModal = false"
      >
        <div class="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden dark:bg-gray-800">
          <div class="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-4 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="p-2 bg-white/20 rounded-lg">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M3 3h6v6H3V3zm2 2v2h2V5H5zm8-2h6v6h-6V3zm2 2v2h2V5h-2zM3 13h6v6H3v-6zm2 2v2h2v-2H5zm10 0h2v2h-2v-2zm-2 2h2v2h-2v-2zm4 0h2v2h-2v-2zm-2-4h2v2h-2v-2zm2 2h2v2h-2v-2z"
                  />
                </svg>
              </div>
              <h2 class="text-white font-bold text-lg">QR Code Driver</h2>
            </div>
            <button
              @click="showQrModal = false"
              class="text-white/80 hover:text-white hover:bg-white/20 rounded-lg w-8 h-8 inline-flex items-center justify-center transition-colors"
            >
              <svg class="w-4 h-4" fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 14">
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
          <div class="p-6 flex flex-col items-center gap-5">
            <div
              id="qr-modal-canvas"
              class="flex items-center justify-center w-52 h-52 rounded-xl border-2 border-gray-200 bg-white shadow-inner"
            >
              <QrcodeVue
                v-if="qrValue"
                :value="qrValue"
                :size="192"
                level="M"
                render-as="canvas"
                :foreground="'#000000'"
                :background="'#ffffff'"
              />
            </div>
            <div class="w-full bg-gray-50 dark:bg-gray-700 rounded-xl p-4 space-y-2 border border-gray-100 dark:border-gray-600">
              <div class="flex items-center gap-2">
                <span class="text-xs font-semibold text-gray-400 uppercase tracking-wide w-24 shrink-0">NIK</span>
                <span class="text-sm font-bold text-gray-800 dark:text-white">{{ qrDriver?.nik || '-' }}</span>
              </div>
              <div class="border-t border-gray-200 dark:border-gray-600" />
              <div class="flex items-center gap-2">
                <span class="text-xs font-semibold text-gray-400 uppercase tracking-wide w-24 shrink-0">Nama Driver</span>
                <span class="text-sm font-semibold text-gray-800 dark:text-white">{{ qrDriver?.nama_driver || '-' }}</span>
              </div>
              <div class="border-t border-gray-200 dark:border-gray-600" />
              <div class="flex items-center gap-2">
                <span class="text-xs font-semibold text-gray-400 uppercase tracking-wide w-24 shrink-0">Nama LP</span>
                <span class="text-sm font-medium text-gray-600 dark:text-gray-300">{{ qrDriver?.nama_lp || '-' }}</span>
              </div>
            </div>
          </div>
          <div class="px-6 pb-6 flex gap-3">
            <button
              @click="showQrModal = false"
              type="button"
              class="flex-1 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 font-medium rounded-xl text-sm px-4 py-2.5 transition-colors dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
            >
              Tutup
            </button>
            <button
              @click="printQr"
              :disabled="!qrValue"
              type="button"
              class="flex-1 flex items-center justify-center gap-2 text-gray-700 bg-gray-100 hover:bg-gray-200 font-semibold rounded-xl text-sm px-4 py-2.5 border border-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2m-2 4H8v-7h8v7z"
                />
              </svg>
              Print QR
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- ==================== Modal Delete Confirmation ==================== -->
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
            Apakah Anda yakin ingin menghapus Driver<br />
            <span class="font-bold text-gray-800">{{ deleteData?.nik }}</span>
          </p>
          <p class="mb-6 text-sm text-gray-500">Tindakan ini tidak dapat dibatalkan.</p>
          <div class="flex justify-center gap-3">
            <button
              @click="deleteDriver"
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

<style scoped>
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
