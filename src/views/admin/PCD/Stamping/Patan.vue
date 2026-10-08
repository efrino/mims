<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { usePatanStampStore } from '@/stores/PCD/Stamping/Patan';
import { useUtilityStore } from '@/stores/utility';
import { storeToRefs } from 'pinia';
import { useConfigStore } from '@/stores/config';
import { useRouter } from 'vue-router';
import * as XLSX from 'xlsx';
import { useNotificationStore } from '@/stores/notification';
import axios from 'axios';
import TableExcel, { type TableColumn } from '@/components/table/TableExcel.vue';

const patanColumns: TableColumn[] = [
  { key: 'date', label: 'Date' },
  { key: 'line_id', label: 'Line' },
  { key: 'patan', label: 'Patan' },
  { key: 'combination', label: 'Combination' },
  { key: 'part_rh', label: 'Part RH' },
  { key: 'part_lh', label: 'Part LH' },
  { key: 'stroke_plan', label: 'Stroke Plan' },
  { key: 'lot_rh', label: 'Lot Size RH' },
  { key: 'lot_lh', label: 'Lot Size LH' },
  { key: 'tpt', label: 'TPT (Menit)' },
  { key: 'status_plan', label: 'Status Plan' },
  { key: 'dandori_plan', label: 'Dandori Plan' },
  { key: 'gsph', label: 'GSPH Plan' }
];

const uploadColumns: TableColumn[] = [
  { key: 'period', label: 'Period' },
  { key: 'line', label: 'Line' },
  { key: 'patan', label: 'Patan' },
  { key: 'combination', label: 'Combination' },
  { key: 'value_combination', label: 'Value Combination' },
  { key: 'plan_process', label: 'Jumlah Process' },
  { key: 'part_rh', label: 'Part RH' },
  { key: 'part_lh', label: 'Part LH' },
  { key: 'stroke_plan', label: 'Stroke Plan' },
  { key: 'lot_rh', label: 'Lot Size RH' },
  { key: 'lot_lh', label: 'Lot Size LH' },
  { key: 'tpt', label: 'TPT (Menit)' },
  { key: 'gsph', label: 'GSPH' },
  { key: 'cycletime', label: 'Cycle Time' },
  { key: 'dandori_plan', label: 'Dandori Plan' },
  { key: 'status_plan', label: 'Status Plan' },
  { key: 'raw_matnr', label: 'R/M' },
  { key: 'need_qty', label: 'Qty Plan R/M' },
  { key: 'stock_sap', label: 'Stock SAP R/M' },
  { key: 'ERROR', label: 'Simulate' },
  { key: 'WARNING', label: 'Simulate R/M' }
];

const page = ref({ title: '' });
const breadcrumbs = shallowRef([
  {
    title: 'PCD',
    disabled: false,
    href: '#'
  },
  {
    title: 'Stamping',
    disabled: false,
    href: '#'
  },
  {
    title: 'Patan',
    disabled: true,
    href: '#'
  }
]);

const patanStore = usePatanStampStore();
const {
  filter,
  datatabel,
  listInfo,
  lineCheck,
  isModalFilterOpen,
  isModalAddOpen,
  form,
  isModalPrintOpen,
  isModalUploadOpen,
  errorCount,
  dataTablesUpload,
  permissions,
  action
} = storeToRefs(patanStore);
const utilityStore = useUtilityStore();
const config = useConfigStore();
const router = useRouter();
const excelRef = ref<HTMLInputElement | null>(null);
const notificationStore = useNotificationStore();

onMounted(async () => {
  await patanStore.fetchPatanData();
  await patanStore.getLinePress();

  page.value.title = `Planning Patan Produksi Tanggal ${utilityStore.dateMonthFull(filter.value.date)} Shift ${filter.value.shift}`;
});

const checkLine = (array: string[], array1: string) => {
  if (array) {
    return array.includes(array1);
  }
};

const closeModal = () => {
  isModalFilterOpen.value = false;
  isModalAddOpen.value = false;
  isModalPrintOpen.value = false;
  isModalUploadOpen.value = false;

  action.value = 'add';
};

const filterData = async () => {
  await patanStore.fetchPatanData();
  page.value.title = `Welding Schedule (Periode ${utilityStore.dateMonthFull(filter.value.date)} Shift ${filter.value.shift})`;
};

const previewTagOK = async () => {
  await patanStore.previewTagOk();
  router.push({ name: 'print-tagOK-stamping-patan' });
};

const openFile = () => {
  excelRef.value?.click();
};

const MAX_EMPTY_ROWS = 5;
const uploadProgress = ref({ active: false, processed: 0, total: 0, stoppedEarly: false });
const uploadPercent = computed(() =>
  uploadProgress.value.total > 0 ? Math.round((uploadProgress.value.processed / uploadProgress.value.total) * 100) : 0
);

const missingPartCount = computed(() => (dataTablesUpload.value ?? []).filter((row: any) => !String(row.part_rh ?? '').trim()).length);

const isEmptyRow = (row: any[] | undefined): boolean =>
  !row || row.every((cell) => cell === undefined || cell === null || String(cell).trim() === '');

const handleFileUpload = async (e: Event): Promise<void> => {
  const target = e.target as HTMLInputElement;
  if (!target.files || target.files.length === 0) {
    return;
  }

  uploadProgress.value = { active: true, processed: 0, total: 0, stoppedEarly: false };
  errorCount.value = 0;

  const file: File = target.files[0];

  const reader = new FileReader();

  reader.onloadend = async () => {
    try {
      const read = new Uint8Array(reader.result as ArrayBuffer);
      const wb = XLSX.read(read, { type: 'array' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

      const keys: string[] = [
        'period',
        'line',
        'patan',
        'combination',
        'plan_process',
        'part_rh',
        'part_lh',
        'stroke_plan',
        'lot_rh',
        'lot_lh',
        'tpt',
        'gsph',
        'cycletime',
        'dandori_plan',
        'status_plan',
        'value_combination'
      ];

      const items: any[] = [];
      const dataRows = data.slice(1);
      uploadProgress.value.total = dataRows.length;

      let emptyStreak = 0;

      for (const rows of dataRows) {
        if (isEmptyRow(rows)) {
          emptyStreak++;
          uploadProgress.value.processed++;

          if (emptyStreak >= MAX_EMPTY_ROWS) {
            uploadProgress.value.stoppedEarly = true;
            uploadProgress.value.processed = uploadProgress.value.total;
            break;
          }
          continue;
        }
        emptyStreak = 0;

        const item: any = {
          WARNING: '',
          ERROR: '',
          ERROR_UPLOAD: ''
        };

        keys.forEach((key, i) => {
          item[key] = rows[i] ?? '';
        });

        try {
          const response = await axios.get('http://192.168.10.67/majsf_rest_api/api/master/patan/fetch_data_irm', {
            params: {
              PMATNR: item.part_rh,
              EMENG: item.lot_rh
            }
          });

          if (response.data) {
            item.raw_matnr = response.data.IDNRK ?? '';
            item.need_qty = response.data.MNGLG ?? '';
            item.stock_sap = response.data.LABST ?? '';
          }
        } catch (err) {
          console.error('API Error:', err);
          item.raw_matnr = '';
          item.need_qty = '';
          item.stock_sap = '';
        }

        if (parseInt(item.stock_sap) < parseInt(item.need_qty)) {
          item.WARNING += (item.WARNING ? ', \n' : '') + 'Stock SAP Kurang.';
        }

        // Validasi
        if (!String(item.part_rh).trim()) {
          errorCount.value++;
          item.ERROR += (item.ERROR ? ', \n' : '') + 'Part RH tidak boleh kosong.';
        }

        if (!item.period) {
          errorCount.value++;
          item.ERROR += (item.ERROR ? ', \n' : '') + 'Period tidak boleh kosong.';
        }

        if (!item.line) {
          errorCount.value++;
          item.ERROR += (item.ERROR ? ', \n' : '') + 'Line tidak boleh kosong.';
        }

        if (!item.patan) {
          errorCount.value++;
          item.ERROR += (item.ERROR ? ', \n' : '') + 'Patan tidak boleh kosong.';
        }

        items.push(item);
        uploadProgress.value.processed++;
      }

      dataTablesUpload.value = items;
      isModalUploadOpen.value = true;
    } finally {
      setTimeout(() => {
        uploadProgress.value.active = false;
        if (excelRef.value) {
          excelRef.value.value = '';
        }
      }, 500);
    }
  };

  reader.readAsArrayBuffer(file);
};
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7"></BaseBreadcrumb>
  <div class="flex flex-col w-full gap-1">
    <!-- Line Status -->
    <div class="flex flex-wrap justify-center rounded-xl py-5 gap-5">
      <div v-for="(line, i) in listInfo.line" :key="i" class="flex justify-between w-3xs bg-white shadow-md p-4 rounded-lg">
        <h1 class="text-xl text-gray-500 font-medium">Line {{ line }}</h1>
        <h1 class="text-lg px-3 rounded" :class="checkLine(lineCheck, line) ? 'bg-green-100 text-green-500' : 'bg-red-100 text-red-500'">
          {{ checkLine(lineCheck, line) ? 'ON' : 'OFF' }}
        </h1>
      </div>
    </div>

    <div class="flex flex-col gap-5 bg-white rounded-xl shadow p-5">
      <!-- Button -->
      <div class="flex justify-between w-full py-2">
        <div class="flex gap-5">
          <button
            type="button"
            @click="isModalAddOpen = true"
            class="flex items-center gap-2 text-white bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-full text-sm px-5 py-2.5 text-center"
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
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14m-7 7V5" />
            </svg>
            Tambah Data
          </button>
          <button
            type="button"
            @click="isModalFilterOpen = true"
            class="flex items-center gap-2 text-white bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-full text-sm px-5 py-2.5 text-center"
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
                d="M18.796 4H5.204a1 1 0 0 0-.753 1.659l5.302 6.058a1 1 0 0 1 .247.659v4.874a.5.5 0 0 0 .2.4l3 2.25a.5.5 0 0 0 .8-.4v-7.124a1 1 0 0 1 .247-.659l5.302-6.059c.566-.646.106-1.658-.753-1.658Z"
              />
            </svg>
            Filter Data
          </button>
          <a
            type="button"
            target="_blank"
            :href="`http://${config.apiUrl}/majsf_rest_api/api/master/patan/export?period=${filter.period}`"
            class="flex items-center gap-2 text-white bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-full text-sm px-5 py-2.5 text-center"
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
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 15v2a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-2m-8 1V4m0 12-4-4m4 4 4-4"
              />
            </svg>
            Patan Period
          </a>
          <div>
            <input type="file" ref="excelRef" class="hidden" accept=".xlsx,.xls" @change="handleFileUpload" />
            <button
              type="button"
              @click="openFile"
              :disabled="uploadProgress.active"
              class="flex items-center gap-2 text-white bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-full text-sm px-5 py-2.5 text-center disabled:opacity-60 disabled:cursor-not-allowed"
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
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 15v2a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-2M12 4v12m0-12 4 4m-4-4L8 8"
                />
              </svg>
              Upload Patan
            </button>

            <Teleport to="body">
              <div v-if="uploadProgress.active" class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60">
                <div class="w-full max-w-md mx-4 bg-white rounded-xl shadow-xl p-6">
                  <h2 class="text-base font-semibold text-gray-800 mb-1">Memproses File Patan</h2>
                  <p class="text-sm text-gray-500 mb-4">
                    {{ uploadProgress.processed }} / {{ uploadProgress.total }} baris
                    <span v-if="uploadProgress.stoppedEarly" class="text-amber-600">
                      (berhenti: {{ MAX_EMPTY_ROWS }} baris kosong berturut-turut)
                    </span>
                  </p>
                  <div class="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div class="h-full bg-blue-600 transition-all duration-150" :style="{ width: uploadPercent + '%' }"></div>
                  </div>
                  <p class="mt-2 text-right text-sm font-medium text-gray-700">{{ uploadPercent }}%</p>
                </div>
              </div>
            </Teleport>
          </div>
        </div>

        <!-- <button
          type="button"
          @click="isModalPrintOpen = true"
          class="flex items-center gap-2 text-white bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-full text-sm px-5 py-2.5 text-center"
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
              stroke-linejoin="round"
              stroke-width="2"
              d="M16.444 18H19a1 1 0 0 0 1-1v-5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h2.556M17 11V5a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v6h10ZM7 15h10v4a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-4Z"
            />
          </svg>
          Print Tag OK
        </button> -->
      </div>

      <!-- Table -->
      <TableExcel :columns="patanColumns" :data="(datatabel as unknown as Record<string, unknown>[])" :initial-items-per-page="25">
        <template #cell-date="{ value }">{{ utilityStore.dateIndonesian(value as any) }}</template>
        <template #actions="{ row }">
          <button
            type="button"
            @click="patanStore.viewDetail((row as any).urut)"
            class="inline-flex items-center gap-1 px-3 py-1 text-sm text-blue-600 outline-1 outline-offset-1 outline-solid rounded-md"
          >
            <i class="mdi mdi-pencil-outline" />
            Edit
          </button>
        </template>
      </TableExcel>
    </div>
  </div>

  <!-- Modal Add or Edit Data -->
  <Transition name="modal">
    <div
      v-if="isModalAddOpen"
      class="fixed inset-0 z-9999 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-gray-900/50"
      @click.self="closeModal"
    >
      <div class="relative p-4 w-5xl max-h-full">
        <!-- Modal content -->
        <div class="relative bg-white rounded-lg shadow-lg p-5">
          <!-- Modal header -->
          <div class="flex items-center justify-between p-4 md:p-5 border-b rounded-t border-gray-200 mb-3">
            <h1 class="text-gray-600 text-2xl font-semibold">{{ action == 'add' ? 'Add' : 'Edit' }} Data Patan</h1>
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
          <!-- Modal body -->
          <div class="p-4 md:p-5">
            <form>
              <div class="flex gap-10 mb-5">
                <div class="w-full">
                  <div class="mb-5">
                    <label for="date" class="block mb-2 text-sm font-medium text-gray-900">Date</label>
                    <input
                      type="date"
                      v-model="form.date"
                      id="date"
                      class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      required
                    />
                  </div>
                  <div class="mb-5">
                    <label for="shift" class="block mb-2 text-sm font-medium text-gray-900">Shift</label>
                    <select
                      id="shift"
                      v-model="form.shift"
                      class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      required
                    >
                      <option value="" disabled>Pilih</option>
                      <option value="1">Shift 1</option>
                      <option value="2">Shift 2</option>
                    </select>
                  </div>
                  <div class="mb-5">
                    <label for="plan_process" class="block mb-2 text-sm font-medium text-gray-900">Plan Process</label>
                    <select
                      id="plan_process"
                      v-model="form.plan_process"
                      class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      required
                    >
                      <option value="" disabled>Pilih</option>
                      <option v-for="(value, i) in listInfo.planProcess" :key="i" :value="value">{{ value }}</option>
                    </select>
                  </div>
                  <div class="mb-5">
                    <label for="line" class="block mb-2 text-sm font-medium text-gray-900">Line</label>
                    <select
                      id="line"
                      v-model="form.line"
                      class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      required
                    >
                      <option value="" disabled>Pilih</option>
                      <option v-for="(value, i) in listInfo.line" :key="i" :value="value">{{ value }}</option>
                    </select>
                  </div>
                  <div class="mb-5">
                    <label for="status_plan" class="block mb-2 text-sm font-medium text-gray-900">Status Plan</label>
                    <select
                      id="status_plan"
                      v-model="form.status_plan"
                      class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      required
                    >
                      <option value="" disabled>Pilih</option>
                      <option v-for="(value, i) in listInfo.status_plan" :key="i" :value="value">{{ value }}</option>
                    </select>
                  </div>
                </div>

                <div class="w-full">
                  <div class="mb-5">
                    <label for="part_number_rh" class="block mb-2 text-sm font-medium text-gray-900">Part Number RH</label>
                    <input
                      type="text"
                      id="part_number_rh"
                      v-model="form.part_rh"
                      class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      required
                    />
                  </div>
                  <div class="mb-5">
                    <label for="part_number_lh" class="block mb-2 text-sm font-medium text-gray-900">Part Number LH</label>
                    <input
                      type="text"
                      id="part_number_lh"
                      v-model="form.part_lh"
                      class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      required
                    />
                  </div>
                  <div class="mb-5">
                    <label for="lot_size_rh" class="block mb-2 text-sm font-medium text-gray-900">Lot Size RH</label>
                    <input
                      type="number"
                      id="lot_size_rh"
                      v-model="form.lot_rh"
                      class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      required
                    />
                  </div>
                  <div class="mb-5">
                    <label for="lot_size_lh" class="block mb-2 text-sm font-medium text-gray-900">Lot Size LH</label>
                    <input
                      type="number"
                      id="lot_size_lh"
                      v-model="form.lot_lh"
                      class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      required
                    />
                  </div>
                  <div class="mb-5">
                    <label for="line" class="block mb-2 text-sm font-medium text-gray-900">Status</label>
                    <select
                      id="line"
                      v-model="form.status"
                      class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      required
                    >
                      <option value="" disabled>Pilih</option>
                      <option value="1">Active</option>
                      <option value="0">Inactive</option>
                    </select>
                  </div>
                </div>

                <div class="w-full">
                  <div class="mb-5">
                    <label for="dandori_plan" class="block mb-2 text-sm font-medium text-gray-900">Dandori Plan</label>
                    <input
                      type="number"
                      id="dandori_plan"
                      v-model="form.dandori_plan"
                      class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      required
                    />
                  </div>
                  <div class="mb-5">
                    <label for="gsph" class="block mb-2 text-sm font-medium text-gray-900">GSPH</label>
                    <input
                      type="number"
                      id="gsph"
                      v-model="form.gsph"
                      class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      required
                    />
                  </div>
                  <div class="mb-5">
                    <label for="combination" class="block mb-2 text-sm font-medium text-gray-900">Combination</label>
                    <select
                      id="combination"
                      v-model="form.combination"
                      class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      required
                    >
                      <option value="" disabled>Pilih</option>
                      <option v-for="(value, i) in listInfo.combination" :key="i" :value="value">{{ value }}</option>
                    </select>
                  </div>
                  <div class="mb-5">
                    <label for="TPT" class="block mb-2 text-sm font-medium text-gray-900">TPT (Menit)</label>
                    <input
                      type="number"
                      id="TPT"
                      v-model="form.tpt"
                      class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      required
                    />
                  </div>
                  <div class="mb-5">
                    <label for="stroke_plan" class="block mb-2 text-sm font-medium text-gray-900">Stroke Plan</label>
                    <input
                      type="number"
                      id="stroke_plan"
                      v-model="form.stroke_plan"
                      class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      required
                    />
                  </div>
                </div>
              </div>
              <div class="flex gap-5 justify-end">
                <button
                  type="button"
                  @click="closeModal"
                  class="text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 font-medium rounded-lg text-sm px-5 py-2.5"
                >
                  Cencel
                </button>
                <button
                  type="button"
                  @click="patanStore.addOrEditData()"
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

  <!-- Modal Filter Data -->
  <Transition name="modal">
    <div
      v-if="isModalFilterOpen"
      class="fixed inset-0 z-9999 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-gray-900/50"
      @click.self="closeModal"
    >
      <div class="relative p-4 w-lg max-h-full">
        <!-- Modal content -->
        <div class="relative bg-white rounded-lg shadow-lg p-5">
          <!-- Modal header -->
          <div class="flex items-center justify-between p-4 md:p-5 border-b rounded-t border-gray-200">
            <h1 class="text-gray-600 text-xl font-semibold">Filter Data</h1>
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
          <!-- Modal body -->
          <div class="p-4 md:p-5">
            <form>
              <div class="mb-5">
                <label for="date" class="block mb-2 text-sm font-medium text-gray-900">Date</label>
                <input
                  type="date"
                  id="date"
                  v-model="filter.date"
                  class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  required
                />
              </div>
              <div class="mb-5">
                <label for="shift" class="block mb-2 text-sm font-medium text-gray-900">Shift</label>
                <select
                  id="shift"
                  v-model="filter.shift"
                  class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  required
                >
                  <option value="" disabled>Pilih</option>
                  <option value="1">Shift 1</option>
                  <option value="2">Shift 2</option>
                </select>
              </div>
              <div class="mb-5">
                <label for="line" class="block mb-2 text-sm font-medium text-gray-900">Line</label>
                <select
                  id="line"
                  v-model="filter.line"
                  class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  required
                >
                  <option value="" disabled>Pilih</option>
                  <option v-for="(value, i) in listInfo.line" :key="i" :value="value">{{ value }}</option>
                </select>
              </div>
              <div class="flex gap-5 justify-end mt-10">
                <button
                  type="button"
                  @click="closeModal"
                  class="text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 font-medium rounded-lg text-sm px-5 py-2.5"
                >
                  Cencel
                </button>
                <button
                  type="button"
                  @click="filterData"
                  class="text-white bg-blue-600 hover:bg-blue-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center"
                >
                  Filter Data
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </Transition>

  <!-- Modal Upload XLSX Result -->
  <Transition name="modal">
    <div
      v-if="isModalUploadOpen"
      class="fixed inset-0 z-9999 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-gray-900/50"
      @click.self="closeModal"
    >
      <div class="relative p-4 max-h-full">
        <!-- Modal content -->
        <div class="relative bg-white rounded-lg shadow-lg p-5">
          <!-- Modal header -->
          <div class="flex items-center justify-between p-4 md:p-5 border-b rounded-t border-gray-200">
            <h1 class="text-gray-600 text-2xl font-semibold">Upload Data Patan</h1>
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
          <!-- Modal body -->
          <div class="p-4 md:p-5">
            <div
              v-if="missingPartCount > 0"
              class="flex items-start gap-3 p-4 mb-5 text-sm text-red-800 rounded-lg bg-red-50 border border-red-300"
              role="alert"
            >
              <span class="font-bold">Peringatan!</span>
              <span>
                Terdapat {{ missingPartCount }} baris dengan Part Number (Part RH) kosong. Lengkapi dulu di file Excel lalu upload ulang,
                data tidak dapat disimpan sebelum semua Part Number terisi.
              </span>
            </div>
            <div class="flex flex-col gap-5 mb-5">
              <div class="flex gap-5 w-full">
                <div class="mb-5 w-full">
                  <label for="date" class="block mb-2 text-sm font-medium text-gray-900">Date</label>
                  <input
                    type="date"
                    v-model="form.date"
                    id="date"
                    class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                    required
                  />
                </div>
                <div class="mb-5 w-full">
                  <label for="shift" class="block mb-2 text-sm font-medium text-gray-900">Shift</label>
                  <select
                    id="shift"
                    v-model="form.shift"
                    class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                    required
                  >
                    <option value="" disabled>Pilih</option>
                    <option value="1">Shift 1</option>
                    <option value="2">Shift 2</option>
                  </select>
                </div>
              </div>
              <div class="w-full">
                <div class="lg:max-w-[1100px] 2xl:max-w-[1730px] overflow-auto">
                  <TableExcel :columns="uploadColumns" :data="(dataTablesUpload as unknown as Record<string, unknown>[])" :initial-items-per-page="25">
                    <template #cell-tpt="{ value }">{{ utilityStore.formatDecimaltoNumber(value as any) }}</template>
                    <template #cell-gsph="{ value }">{{ utilityStore.formatDecimaltoNumber(value as any) }}</template>
                    <template #cell-cycletime="{ value }">{{ utilityStore.formatDecimaltoNumber(value as any) }}</template>
                    <template #cell-dandori_plan="{ value }">{{ utilityStore.formatDecimaltoNumber(value as any) }}</template>
                    <template #cell-ERROR="{ row }">
                      <span v-if="row.ERROR" class="whitespace-pre-line text-red-600">{{ row.ERROR }}</span>
                      <i v-else class="mdi mdi-check-circle-outline text-green-500 text-xl" />
                    </template>
                    <template #cell-WARNING="{ row }">
                      <span v-if="row.WARNING" class="whitespace-pre-line text-red-500">{{ row.WARNING }}</span>
                      <i v-else class="mdi mdi-check-circle-outline text-green-500 text-xl" />
                    </template>
                  </TableExcel>
                </div>
              </div>
            </div>
            <div class="flex gap-5 justify-end">
              <button
                type="button"
                @click="closeModal"
                class="text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 font-medium rounded-lg text-sm px-5 py-2.5"
              >
                Cencel
              </button>
              <button
                type="button"
                v-if="permissions.create && dataTablesUpload.length && !errorCount"
                @click="patanStore.uploadData()"
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
              <div v-else class="flex items-center justify-center text-sm text-red-500 border rounded-lg px-3 cursor-not-allowed">
                Perbaiki data yang error terlebih dulu
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>

  <!-- Modal Print Tag OK -->
  <Transition name="modal">
    <div
      v-if="isModalPrintOpen"
      class="fixed inset-0 z-9999 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-gray-900/50"
      @click.self="closeModal"
    >
      <div class="relative p-4 w-lg max-h-full">
        <!-- Modal content -->
        <div class="relative bg-white rounded-lg shadow-lg p-5">
          <!-- Modal header -->
          <div class="flex items-center justify-between p-4 md:p-5 border-b rounded-t border-gray-200">
            <h1 class="text-gray-600 text-xl font-semibold">Pilih Data Untuk di Print</h1>
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
          <!-- Modal body -->
          <div class="p-4 md:p-5">
            <form>
              <div class="mb-5">
                <label for="date" class="block mb-2 text-sm font-medium text-gray-900">Date</label>
                <input
                  type="date"
                  id="date"
                  v-model="filter.date"
                  class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  required
                />
              </div>
              <div class="mb-5">
                <label for="shift" class="block mb-2 text-sm font-medium text-gray-900">Shift</label>
                <select
                  id="shift"
                  v-model="filter.shift"
                  class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  required
                >
                  <option value="" disabled>Pilih</option>
                  <option value="1">Shift 1</option>
                  <option value="2">Shift 2</option>
                </select>
              </div>
              <div class="mb-5">
                <label for="line" class="block mb-2 text-sm font-medium text-gray-900">Line</label>
                <select
                  id="line"
                  v-model="filter.line"
                  class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  required
                >
                  <option value="" disabled>Pilih</option>
                  <option v-for="(value, i) in listInfo.line" :key="i" :value="value">{{ value }}</option>
                </select>
              </div>
              <div class="mb-5">
                <label for="tipe_part" class="block mb-2 text-sm font-medium text-gray-900">Tipe Part</label>
                <select
                  id="tipe_part"
                  v-model="filter.part_type"
                  class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  required
                >
                  <option value="" disabled>Pilih</option>
                  <option v-for="(value, i) in listInfo.tipe_part" :key="i" :value="value">{{ value }}</option>
                </select>
              </div>
              <div class="flex gap-5 justify-end mt-10">
                <button
                  type="button"
                  @click="closeModal"
                  class="text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 font-medium rounded-lg text-sm px-5 py-2.5"
                >
                  Cencel
                </button>
                <button
                  type="button"
                  @click="previewTagOK"
                  class="text-white bg-blue-600 hover:bg-blue-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center"
                >
                  Print Preview
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

/* Modal Transition */
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
