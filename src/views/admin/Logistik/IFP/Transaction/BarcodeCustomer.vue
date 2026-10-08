<script setup lang="ts">
import axios from "axios";
import { ref, shallowRef, computed } from 'vue';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { useBarcodeDnStore } from '@/stores/Logistik/IFP/Transaction/BarcodeCustomer';
import { useNotificationStore } from '@/stores/notification';
import { useConfigStore } from '@/stores/config';
import { storeToRefs } from 'pinia';

const page = ref({ title: 'Barcode Customer' });
const breadcrumbs = shallowRef([
  { title: 'Logistik', disabled: false, href: '#' },
  { title: 'IFP', disabled: false, href: '#' },
  { title: 'Transaction', disabled: false, href: '#' },
  { title: 'Barcode Customer', disabled: true, href: '#' },
]);

const store = useBarcodeDnStore();
const notificationStore = useNotificationStore();
const { data, loading, uploading } = storeToRefs(store);

const CUSTOMER_OPTIONS = ['HMMI', 'MMKI', 'ADM'] as const;
type CustomerType = typeof CUSTOMER_OPTIONS[number];  

const selectedCustomer = ref('');
const startDate = ref('');
const endDate = ref('');
const hasLoaded = ref(false);
const statusFilter = ref<'all' | 'scanned' | 'unscanned'>('all');

const currentPage = ref(1);
const pageSize = ref(15);
const pageSizeOptions = [15, 25, 50, 100];

const showUploadModal = ref(false);
const uploadCustomer = ref<CustomerType | ''>('');
const uploadFile = ref<File | null>(null);
const uploadPassword = ref('');
const fileInputRef = ref<HTMLInputElement | null>(null);

const filteredData = computed(() => {
  let filtered = data.value;
  
  if (statusFilter.value === 'scanned') {
    filtered = filtered.filter(item => item.is_scan === '1');
  } else if (statusFilter.value === 'unscanned') {
    filtered = filtered.filter(item => item.is_scan === '0');
  }
  
  return filtered;
});

const totalPages = computed(() => Math.max(1, Math.ceil(filteredData.value.length / pageSize.value)));

const pagedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredData.value.slice(start, start + pageSize.value);
});

const pageNumbers = computed(() => {
  const total = totalPages.value;
  const cur = currentPage.value;
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '...')[] = [1];
  if (cur > 3) pages.push('...');
  for (let i = Math.max(2, cur - 1); i <= Math.min(total - 1, cur + 1); i++) pages.push(i);
  if (cur < total - 2) pages.push('...');
  pages.push(total);
  return pages;
});

const do_date_start = ref(new Date().toISOString().split("T")[0]);
const doCustomer = ref('');
const doCustomerOptions = ['MKM', 'TMMIN'];
const loadingDo = ref(false);
const generateResult = ref<any>(null);

const isGenerateDoValid = computed(() => !!do_date_start.value && !!doCustomer.value);

function resetPage() {
  currentPage.value = 1;
}

async function onGenerateDo() {
  loadingDo.value = true;
  const configStore = useConfigStore();
  const dateParam = do_date_start.value.replace(/-/g, "");

  try {
    const url = `http://${configStore.apiUrl}/majsf_rest_api/api/mdfoSalesOrder/generateDo`;
    const res = await axios.post(url, {
      date_start: dateParam,
      date_end: dateParam,
      customer: doCustomer.value,
    });

    generateResult.value = res.data;

    if (res.data.status === "success") {
      notificationStore.showDialogSuccess("Success", res.data.message);
      if (hasLoaded.value) await loadData();
    } else {
      notificationStore.showDialogError("Error", res.data.message);
    }
  } catch (e: unknown) {
    notificationStore.showDialogError(
      "Error",
      e instanceof Error ? "Gagal generate DO: " + e.message : "Server Error"
    );
  } finally {
    loadingDo.value = false;
  }
}

function fmtNumber(val: number | string | null | undefined): string {
  if (val === null || val === undefined || val === "") return "-";
  const num = Number(val);
  if (Number.isNaN(num)) return "-";
  return num.toLocaleString("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

async function loadData() {
  hasLoaded.value = true;
  resetPage();
  await store.fetchBarcode({
    customer: selectedCustomer.value || null,
    start_date: startDate.value || null,
    end_date: endDate.value || null,
  });
}

function openUploadModal() {
  uploadCustomer.value = '';
  uploadFile.value = null;
  uploadPassword.value = '';
  showUploadModal.value = true;
}

function closeUploadModal() {
  if (uploading.value) return;
  showUploadModal.value = false;
}

function onFileChange(e: Event) {
  const target = e.target as HTMLInputElement;
  uploadFile.value = target.files?.[0] ?? null;
}

function onUploadCustomerChange() {
  uploadPassword.value = '';
}

async function submitUpload() {
  if (!uploadCustomer.value) {
    notificationStore.showDialogError('Validasi', 'Pilih customer terlebih dahulu.');
    return;
  } 
  if (!uploadFile.value) {
    notificationStore.showDialogError('Validasi', 'Pilih file Excel terlebih dahulu.');
    return;
  }
  if (uploadCustomer.value === 'ADM' && !uploadPassword.value.trim()) {
    notificationStore.showDialogError('Validasi', 'Password Excel wajib diisi untuk tipe ADM.');
    return;
  }

  try {
    const res = await store.uploadBarcode(
      uploadFile.value,
      uploadCustomer.value,
      uploadCustomer.value === 'ADM' ? uploadPassword.value : null,
    );
    notificationStore.showDialogSuccess('Success', res.message ?? 'Upload berhasil.');
    showUploadModal.value = false;
    if (hasLoaded.value) await loadData();
  } catch (err: unknown) {
    notificationStore.showDialogError('Error', err instanceof Error ? err.message : 'Upload gagal.');
  }
}
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7" />
  <div class="flex flex-col gap-7">
  <!-- Card Generate DO -->
    <div class="bg-white p-6 rounded-xl shadow w-full">
      <h5 class="text-base font-semibold text-gray-900 mb-4">Generate Delivery Order (DO)</h5>

      <div class="flex items-end gap-3">
        <div class="flex flex-col">
          <label class="text-sm font-medium text-gray-700 mb-1">Date Delivery</label>
          <input
            type="date"
            v-model="do_date_start"
            class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        <div class="flex flex-col max-w-xs"> <!-- Membatasi lebar container (max-w-xs = 320px) -->
            <label class="text-sm font-medium text-gray-700 mb-1">Customer</label>
            <select
              v-model="doCustomer"
              class="w-full border border-gray-300 rounded-lg px-8 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="">-- Pilih Customer --</option>
              <option v-for="c in doCustomerOptions" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>

       <button
          v-if="store.permissions.create"
          @click="onGenerateDo"
          :disabled="!isGenerateDoValid || loadingDo"
          class="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
        >
          <svg v-if="loadingDo" class="animate-spin w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <svg v-else class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {{ loadingDo ? 'Memproses...' : 'Generate DO' }}
        </button>
      </div>

      <!-- Result Alert -->
      <div
        v-if="generateResult"
        class="mt-4 flex items-start justify-between gap-3 px-4 py-3 rounded-lg text-sm"
        :class="generateResult.status === 'success'
          ? 'bg-green-50 border border-green-200 text-green-800'
          : 'bg-red-50 border border-red-200 text-red-800'"
      >
        <div>
          <p class="font-semibold">{{ generateResult.message }}</p>
          <p v-if="generateResult.status === 'success'" class="text-xs mt-1 text-green-600">
            Inserted: {{ fmtNumber(generateResult.inserted) }}
            | Skipped: {{ fmtNumber(generateResult.skipped) }}
            | Total: {{ fmtNumber(generateResult.total) }}
          </p>
        </div>
        <button
          @click="generateResult = null"
          class="text-gray-400 hover:text-gray-600 shrink-0"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
    
    <div class="bg-white p-6 rounded-xl shadow w-full">
  <h5 class="text-base font-semibold text-gray-900 mb-4">Data Barcode DN</h5>

  <!-- Row 1: Filters -->
  <div class="flex items-end gap-3">
    <div class="flex flex-col flex-1">
      <label class="text-sm font-medium text-gray-700 mb-1">Customer</label>
      <select
        v-model="selectedCustomer"
        class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none"
      >
        <option value="">-- Semua Customer --</option>
        <option v-for="c in CUSTOMER_OPTIONS" :key="c" :value="c">{{ c }}</option>
      </select>
    </div>

    <div class="flex flex-col flex-1">
      <label class="text-sm font-medium text-gray-700 mb-1">Start Date</label>
      <input
        type="date"
        v-model="startDate"
        class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none"
      />
    </div>

    <div class="flex flex-col flex-1">
      <label class="text-sm font-medium text-gray-700 mb-1">End Date</label>
      <input
        type="date"
        v-model="endDate"
        class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none"
      />
    </div>
  </div>

  <!-- Row 2: Actions -->
  <div class="flex items-center gap-2 mt-3">
    <button v-if="store.permissions.create" 
      @click="openUploadModal"
      class="inline-flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 focus:ring-4 focus:ring-green-300 transition-colors whitespace-nowrap"
    >
      <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
      Upload Excel
    </button>

    <button
      @click="store.downloadFormat('HMMI')"
      class="inline-flex items-center gap-1.5 px-4 py-2 border border-green-600 text-green-700 text-sm font-medium rounded-lg hover:bg-green-50 focus:ring-4 focus:ring-green-200 transition-colors whitespace-nowrap"
    >
      <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      Format HMMI
    </button>

    <button
      @click="store.downloadFormat('MMKI')"
      class="inline-flex items-center gap-1.5 px-4 py-2 border border-green-600 text-green-700 text-sm font-medium rounded-lg hover:bg-green-50 focus:ring-4 focus:ring-green-200 transition-colors whitespace-nowrap"
    >
      <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      Format MMKI
    </button>

    <button
      @click="store.downloadFormat('ADM')"
      class="inline-flex items-center gap-1.5 px-4 py-2 border border-green-600 text-green-700 text-sm font-medium rounded-lg hover:bg-green-50 focus:ring-4 focus:ring-green-200 transition-colors whitespace-nowrap"
    >
      <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      Format ADM
    </button>

    <!-- spacer dorong Load Data ke kanan -->
    <div class="flex-1"></div>

    <button
      @click="loadData"
      :disabled="loading"
      class="inline-flex items-center gap-1.5 px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
    >
      <svg v-if="loading" class="animate-spin w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
      </svg>
      <svg v-else class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      {{ loading ? 'Loading...' : 'Load Data' }}
    </button>
  </div>
</div>



    <div v-if="hasLoaded" class="bg-white rounded-xl shadow w-full overflow-hidden">

      <div class="flex flex-wrap justify-between items-center gap-3 px-6 py-4 border-b border-gray-100">
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-500">Tampilkan</span>
          <select
            v-model="pageSize"
            @change="resetPage"
            class="border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 px-3 py-1.5 outline-none"
          >
            <option v-for="opt in pageSizeOptions" :key="opt" :value="opt">{{ opt }}</option>
          </select>
          <span class="text-sm text-gray-500">entri</span>
        </div>

        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2">
            <span class="text-sm text-gray-500">Filter Status:</span>
            <select
              v-model="statusFilter"
              @change="resetPage"
              class="border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 px-3 py-1.5 outline-none"
>
              <option value="all">Semua</option>
              <option value="scanned">Scanned</option>
              <option value="unscanned">Belum Scan</option>
            </select>
          </div>

        <span class="text-sm text-gray-500">
          Total: <span class="font-semibold text-gray-800">{{ filteredData.length }}</span> data
        </span>
      </div>
    </div>

      <div class="overflow-x-auto">
        <table class="w-full text-sm text-center text-gray-500">
          <thead class="text-xs text-gray-700 uppercase bg-gray-50">
            <tr>
              <th class="px-6 py-3">No</th>
              <th class="px-6 py-3">Customer</th>
              <th class="px-6 py-3">Part Number</th>
              <th class="px-6 py-3">Qty</th>
              <th class="px-6 py-3">Barcode</th>
              <th class="px-6 py-3">Delivery Date</th>
              <th class="px-6 py-3">Status</th>
              <th class="px-6 py-3">Total Scan</th>
            </tr>
          </thead>

          <tbody>
            <template v-if="loading">
              <tr>
                <td colspan="8" class="px-6 py-12 text-center">
                  <div class="flex flex-col items-center gap-3 text-gray-400">
                    <svg class="animate-spin w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    <span class="text-sm font-medium">Memuat data...</span>
                  </div>
                </td>
              </tr>
            </template>

            <template v-else-if="pagedData.length === 0">
              <tr>
                <td colspan="8" class="px-6 py-12 text-center">
                  <div class="flex flex-col items-center gap-2 text-gray-400">
                    <svg class="w-10 h-10 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span class="font-medium text-sm">Tidak ada data ditemukan.</span>
                  </div>
                </td>
              </tr>
            </template>

            <template v-else>
              <tr
                v-for="(row, index) in pagedData"
                :key="row.id"
                class="odd:bg-white even:bg-gray-50 border-b border-gray-200 hover:bg-blue-50 transition-colors duration-150"
              >
                <td class="px-6 py-3 text-gray-500">
                  {{ (currentPage - 1) * pageSize + index + 1 }}
                </td>
                <td class="px-6 py-3">
                  <span
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
                    :class="{
                      'bg-blue-100 text-blue-700': row.customer === 'HMMI',
                      'bg-green-100 text-green-700': row.customer === 'MMKI',
                      'bg-orange-100 text-orange-700': row.customer === 'ADM',
                    }"
                  >
                    {{ row.customer }}
                  </span>
                </td>
                <td class="px-6 py-3 font-mono text-gray-800">{{ row.part_no }}</td>
                <td class="px-6 py-3">{{ row.qty }}</td>
                <td class="px-6 py-3 font-mono text-xs text-gray-700">{{ row.barcode }}</td>
                <td class="px-6 py-3">{{ row.delivery_date?.split('-').reverse().join('-') }}</td>
                <td class="px-6 py-3">
                  <span
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
                    :class="row.is_scan === '1' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'"
                  >
                    {{ row.is_scan === '1' ? 'Scanned' : 'Belum' }}
                  </span>
                </td>
                <td class="px-6 py-3">{{ row.total_scan }}</td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <div v-if="!loading && filteredData.length > 0" class="flex flex-wrap justify-between items-center gap-3 px-6 py-4 border-t border-gray-100">
        <p class="text-sm text-gray-500">
          Menampilkan
          <span class="font-semibold text-gray-800">{{ filteredData.length === 0 ? 0 : (currentPage - 1) * pageSize + 1 }}</span>
          –
          <span class="font-semibold text-gray-800">{{ Math.min(currentPage * pageSize, filteredData.length) }}</span>
          dari
          <span class="font-semibold text-gray-800">{{ filteredData.length }}</span>
          entri
        </p>

        <nav class="inline-flex items-center -space-x-px">
          <button
            class="flex items-center justify-center px-3 h-8 text-sm text-gray-500 bg-white border border-gray-300 rounded-l-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="currentPage === 1"
            @click="currentPage--"
          >‹</button>

          <template v-for="p in pageNumbers" :key="p">
            <button
              v-if="p !== '...'"
              class="flex items-center justify-center px-3 h-8 text-sm border border-gray-300 transition-colors"
              :class="p === currentPage
                ? 'bg-blue-500 text-white border-blue-500 hover:bg-blue-600'
                : 'text-gray-500 bg-white hover:bg-gray-100'"
              @click="currentPage = p as number"
            >{{ p }}</button>
            <span
              v-else
              class="flex items-center justify-center px-3 h-8 text-sm text-gray-500 bg-white border border-gray-300"
            >...</span>
          </template>

          <button
            class="flex items-center justify-center px-3 h-8 text-sm text-gray-500 bg-white border border-gray-300 rounded-r-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="currentPage === totalPages"
            @click="currentPage++"
          >›</button>
        </nav>
      </div>

    </div>

  </div>

  <Transition name="modal">
    <div
      v-if="showUploadModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      @click.self="closeUploadModal"
    >
      <div class="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">

        <div class="flex items-start justify-between p-5 border-b border-gray-100">
          <div>
            <h3 class="text-base font-bold text-gray-900">Upload Barcode Excel</h3>
            <p class="text-xs text-gray-500 mt-0.5">Pilih customer dan file excel untuk diupload.</p>
          </div>
          <button
            class="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition"
            @click="closeUploadModal"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="p-5 space-y-4">

          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1.5">
              Customer <span class="text-red-500">*</span>
            </label>
            <select
              v-model="uploadCustomer"
              @change="onUploadCustomerChange"
              class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none appearance-none bg-white"
            >
              <option value="">-- Pilih Customer --</option>
              <option v-for="c in CUSTOMER_OPTIONS" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>

          <Transition name="slide-down">
            <div v-if="uploadCustomer === 'ADM'">
              <label class="block text-sm font-semibold text-gray-700 mb-1.5">
                Password Excel <span class="text-red-500">*</span>
              </label>
              <input
                v-model="uploadPassword"
                type="password"
                placeholder="Masukkan password untuk membuka file excel ADM"
                class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none"
              />
              <p class="text-xs text-gray-400 mt-1">Contoh: adm123</p>
            </div>
          </Transition>

          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1.5">
              File Excel <span class="text-red-500">*</span>
            </label>
            <label
              class="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-lg cursor-pointer transition-colors"
              :class="uploadFile
                ? 'border-green-400 bg-green-50'
                : 'border-gray-300 bg-gray-50 hover:bg-gray-100'"
            >
              <div v-if="!uploadFile" class="flex flex-col items-center gap-1 text-gray-400">
                <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span class="text-sm">Klik untuk pilih file</span>
                <span class="text-xs">.xlsx, .xls</span>
              </div>
              <div v-else class="flex flex-col items-center gap-1 text-green-600">
                <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span class="text-sm font-medium text-center px-2 break-all">{{ uploadFile.name }}</span>
              </div>
              <input
                ref="fileInputRef"
                type="file"
                accept=".xlsx,.xls"
                class="hidden"
                @change="onFileChange"
              />
            </label>
          </div>

          <div class="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              class="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              @click="closeUploadModal"
            >
              Batal
            </button>
            <button
              type="button"
              :disabled="uploading"
              class="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:ring-4 focus:ring-green-300 disabled:opacity-60 disabled:cursor-not-allowed transition"
              @click="submitUpload"
            >
              <svg v-if="uploading" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              {{ uploading ? 'Mengupload...' : 'Submit' }}
            </button>
          </div>

        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.border {
  border: 0.5px solid #d1d5db !important;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}
.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  max-height: 0;
}
.slide-down-enter-to,
.slide-down-leave-from {
  opacity: 1;
  max-height: 120px;
}
</style>