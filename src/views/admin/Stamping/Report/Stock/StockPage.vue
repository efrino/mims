<script setup lang="ts">
import { ref, shallowRef, onMounted, computed, reactive, watch } from "vue";
import { storeToRefs } from "pinia";
import { useReportStockStore } from "@/stores/Stamping/Report/Stock";
import { useUtilityStore } from "@/pinia/utility";
import { useNotificationStore } from "@/pinia/notification";
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import TableExcel, { type TableColumn } from '@/components/table/TableExcel.vue';
import * as XLSX from "xlsx";
import { initFlowbite } from "flowbite";

import {
  SearchOutlined,
  SyncOutlined,
  UploadOutlined,
  EditFilled,
  WarningOutlined,
  CheckOutlined,
  SaveOutlined,
  DeleteOutlined,
} from '@ant-design/icons-vue';

// ts type
import type { 
  DataTableUploadRow,
} from "@/types/Stamping/Report/reportStock";

// ===== STORES
const achievementStore = useReportStockStore();
const utilityStore = useUtilityStore();
const notificationStore = useNotificationStore();

const page = ref({ title: 'Achievement Stock Page' });
const breadcrumbs = shallowRef([
  { 
    title: "Report", 
    disabled: false, 
    href: "#" 
  },
  { 
    title: "Stamping", 
    disabled: false, 
    href: "#" 
  },
  { 
    title: "Stock Andon Press", 
    disabled: true, 
    href: "Achievement" 
  },
]);

// REFS dari store
const {
  datatables,
  datatablesPCS,
  datatablesIFP,
  datatablesUpload,
} = storeToRefs(achievementStore);

const {
  permissions,
  dialog,
  filter,
  filterDate,
  formData,
  formIfp,
  params,
} = storeToRefs(achievementStore);

const tab = ref("blank");

// ACTIONS dari store
const {
  fetchReportBlank,
  fetchReportIFP,
  fetchReportAchievementPeriod,
  updateQty,
  filteredItems,
  filteredItemsPCS,
  filteredItemsIFP,
  loadDataStockAwal,
  loadDataStockAwalIfp,
  onUpdate,
  onUpload,
} = achievementStore;
console.log(filteredItems())

const { formatPeriod } = utilityStore;

const pagination = reactive({
  page: 1,
  limit: 8,
});

const totalItems = computed(() => filteredItemsPCS().length);

const startItem = computed(() => {
  return (pagination.page - 1) * pagination.limit + 1;
});

const endItem = computed(() => {
  return Math.min(pagination.page * pagination.limit, totalItems.value);
});

function previousPage() {
  if (pagination.page > 1) pagination.page--;
}

function nextPage() {
  if (pagination.page * pagination.limit < totalItems.value) {
    pagination.page++;
  }
}

const paginatedBlankItems = computed(() => {
  const start = (pagination.page - 1) * pagination.limit;
  const end = pagination.page * pagination.limit;
  return filteredItems().slice(start, end);
});

const paginatedIFPItems = computed(() => {
  const start = (pagination.page - 1) * pagination.limit;
  const end = pagination.page * pagination.limit;
  return filteredItemsIFP().slice(start, end);
});

const paginatedPCSItems = computed(() => {
  const start = (pagination.page - 1) * pagination.limit;
  const end = pagination.page * pagination.limit;
  return filteredItemsPCS().slice(start, end);
});

const stockAkhir = (item: any, day: number) => {
  let sum = 0;
  for (let i = 1; i <= day; i++) {
    const key = 'stock_akhir_' + i.toString().padStart(2, '0');
    sum += parseInt(item[key] || 0);
  }
  return sum;
};

const accumRH = (item: any, day: number) => {
  let sum = 0;
  for (let i = 1; i <= day; i++) {
    const key = 'total_' + i.toString().padStart(2, '0');
    sum += parseInt(item[key] || 0);
  }
  return sum;
};

const accumLH = (item: any, day: number) => {
  let sum = 0;
  for (let i = 1; i <= day; i++) {
    const key = 'total_lh_' + i.toString().padStart(2, '0');
    sum += parseInt(item[key] || 0);
  }
  return sum;
};

const uploadColumns = computed<TableColumn[]>(() =>
  datatablesUpload.value.headers.map((header) => ({
    key: header.key,
    label: header.title,
    align: header.align === 'start' ? 'left' : (header.align as TableColumn['align']),
  }))
);

// LOCAL STATES
const excel = ref<string>("");
const loading = ref<boolean>(false);
const error = ref<number>(0);
const excelInput = ref<HTMLInputElement | null>(null);

// LIFECYCLE
onMounted(() => {
  updateQty();
  fetchReportBlank();
  fetchReportAchievementPeriod();
  fetchReportIFP();
  
  initFlowbite();
});

const fetchActiveData = () => {
  if (tab.value === 'blank') {
    achievementStore.fetchReportBlank()
  } else if(tab.value === 'ifp') {
    achievementStore.fetchReportIFP()
  } else {
    achievementStore.fetchReportAchievementPeriod()
  }
}

// METHODS
function onDelete() {
  if (excelInput.value) excelInput.value.value = "";
  datatablesUpload.value.items = [];
  dialog.value.upload = false;
}

function openFile() {
  excelInput.value?.click();
}

function handleFileUpload(e: Event) {
  loading.value = true;

  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  excel.value = file.name;
  error.value = 0;

  const reader = new FileReader();

  reader.onloadend = () => {
    const buffer = reader.result as ArrayBuffer;
    const read = new Uint8Array(buffer);

    const wb = XLSX.read(read, { type: "array" });
    const wsname = wb.SheetNames[0];
    const ws = wb.Sheets[wsname];

    const data = XLSX.utils.sheet_to_json<(string | number | undefined)[]>(ws, {
      header: 1,
    });

    const keys: (keyof DataTableUploadRow)[] = [
      "part_number",
      "job_number",
      "dn",
      "date_01",
      "date_02",
      "date_03",
      "date_04",
      "date_05",
      "date_06",
      "date_07",
      "date_08",
      "date_09",
      "date_10",
      "date_11",
      "date_12",
      "date_13",
      "date_14",
      "date_15",
      "date_16",
      "date_17",
      "date_18",
      "date_19",
      "date_20",
      "date_21",
      "date_22",
      "date_23",
      "date_24",
      "date_25",
      "date_26",
      "date_27",
      "date_28",
      "date_29",
      "date_30",
      "date_31",
      "total",
    ];

    const items: DataTableUploadRow[] = [];

    data.slice(1).forEach((row) => {
      try {
        const item = {} as DataTableUploadRow;

        item.ERROR = "";
        item.ERROR_UPLOAD = "";

        keys.forEach((key, i) => {
          const value = row[i];
          item[key] = value !== undefined ? String(value) : "";
        });

        // Validasi
        if (!item.part_number) {
          error.value++;
          item.ERROR +=
            (item.ERROR ? ", \n" : "") + "Part Number tidak boleh kosong.";
        }

        if (!item.job_number) {
          error.value++;
          item.ERROR +=
            (item.ERROR ? ", \n" : "") + "Job Number tidak boleh kosong.";
        }

        items.push(item);
      } catch (err) {
        notificationStore.showDialogWarning(
          'Warning' ,"Cek Kembali Data yang akan diupload"
        );
      }
    });

    datatablesUpload.value.items = items;
    dialog.value.upload = true;

    setTimeout(() => {
      loading.value = false;
      if (excelInput.value) {
        excelInput.value.value = "";
      }
    }, 1000);
  };

  reader.readAsArrayBuffer(file);
}

// helper monthpicker
function applyPeriod() {
  if (!filterDate.value.month || !filterDate.value.year) {
    notificationStore.showDialogWarning('Bulan dan Tahun harus dipilih')
    return
  }

  formData.value.period = `${filterDate.value.year}-${filterDate.value.month}`
}

watch(
  () => [filterDate.value.month, filterDate.value.year],
  ([m, y]) => {
    const now = new Date();

    const month = m
      ? String(m).padStart(2, "0")
      : String(now.getMonth() + 1).padStart(2, "0");

    const year = y
      ? String(y)
      : String(now.getFullYear());

    const period = `${year}-${month}`;
    const period2 = `${year}${month}`;

    filterDate.value.month = month;
    filterDate.value.year = (year);

    filterDate.value.period = period;
    filterDate.value.period2 = period2;

    filter.value.period = period;
    formData.value.period = period;
  },
  { immediate: true }
);
</script>

<template>
   <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7"></BaseBreadcrumb>
   <div>
    <div class="w-full">
      <div class="flex items-center justify-between my-3 px-3">
        <div class="flex items-center">
          <!-- Datepicker Filter Button -->
          <div class="flex flex-wrap items-center gap-3 me-2 mb-2">
            <form class="flex w-1/4">
              <select v-model="filterDate.month" id="month" class="bg-gray-100 min-w-[130px] border border-new text-gray-900 text-sm rounded-s-xl focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" required>
                <option value="" disabled>Pilih Bulan</option>
                <option value="01">Januari</option>
                <option value="02">Februari</option>
                <option value="03">Maret</option>
                <option value="04">April</option>
                <option value="05">Mei</option>
                <option value="06">Juni</option>
                <option value="07">Juli</option>
                <option value="08">Agustus</option>
                <option value="09">September</option>
                <option value="10">Oktober</option>
                <option value="11">November</option>
                <option value="12">Desember</option>
              </select>
              <select v-model="filterDate.year" id="year" class="bg-gray-100 min-w-[130px] border border-new text-gray-900 text-sm focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" required>
                <option value="" disabled>Pilih Tahun</option>
                <option
                  v-for="i in 5"
                  :key="i"
                  :value="new Date().getFullYear() - (i - 1)"
                >
                  {{ new Date().getFullYear() - (i - 1) }}
                </option>
              </select>
              <button
                type="button"
                @click="fetchActiveData()"
                class="flex w-auto items-center gap-2 whitespace-nowrap text-white bg-blue-600 hover:bg-blue-800 font-medium rounded-e-xl text-sm px-4 py-2.5 text-center"
              >
              <SyncOutlined />
                Sync Data
              </button>
            </form>
          </div>
          
          <!-- Upload Button -->
          <button 
            type="button"
            @click="openFile"
            class="flex items-center gap-2 text-white bg-green-600 hover:bg-green-800 focus:outline-none focus:ring-4 focus:ring-green-300 font-medium rounded-full text-sm px-5 py-2.5 text-center mb-2"
          >
          <input
            ref="excelInput"
            type="file"
            class="hidden"
            accept="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            @change="handleFileUpload"
          />
            <UploadOutlined :style="{fontSize: '18px'}"/>
            Upload
          </button>
        </div>
        <div>
          <v-row cols="3" elevation="10" class="justify-end">
            <v-tabs v-model="tab" color="primary" density="compact" hide-slider>
              <v-tab :color="tab === 'blank' ? 'primary' : undefined" value="blank" class="mr-1" variant="outlined" rounded="md">Stock Blank</v-tab>
              <v-tab :color="tab === 'ifp' ? 'green-500' : undefined" value="ifp" class="mr-1" variant="outlined" rounded="md">Stock IFP</v-tab>
              <v-tab :color="tab === 'pcs' ? 'yellow-400' : undefined" value="pcs" variant="outlined" rounded="md">Achievement PCS</v-tab>
            </v-tabs>
          </v-row>
        </div>
      </div>


      <v-window v-model="tab">
        <v-window-item value="blank">
          <div class="w-full overflow-x-auto mt-4">
            <table class="min-w-full border-collapse">
              <thead>
                <tr>
                  <th
                    :colspan="36"
                    class="text-center text-4xl font-bold py-4 text-gray-800 bg-blue-100"
                  >
                    Report Stock Blank Period {{ formatPeriod(filter.period) }}
                  </th>
                </tr>

                <!-- Filter Search Row -->
                <tr class="bg-white border-b">
                  <th colspan="3" class="px-4 py-2">
                    <div class="relative">
                      <SearchOutlined class="font-semibold absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />

                      <input
                        v-model="datatables.filters.part_number"
                        type="text"
                        placeholder="Search Part Number..."
                        class="w-full bg-gray-50 pl-8 p-2 border rounded focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                  </th>
                  <th colspan="33"></th>
                </tr>

                <tr class="bg-blue-200">
                  <th class="px-4 py-2 text-left font-semibold text-gray-700 rounded-tl-xl">Action</th>
                  <th class="px-4 py-2 text-left font-semibold text-gray-700">Part Number</th>
                  <th class="px-4 py-2 text-center font-semibold text-gray-700">Stock Awal</th>
                  <th class="px-4 py-2"></th>

                  <!-- Loop tanggal 01–30 -->
                  <th v-for="day in 30" :key="day"
                      class="px-2 py-2 text-center font-semibold text-gray-700">
                    {{ day.toString().padStart(2, '0') }}
                  </th>

                  <!-- Tanggal 31 muncul conditional -->
                  <th
                    v-if="['01','03','05','07','08','10','12'].includes(filter.period.substr(5, 2))"
                    class="px-2 py-2 text-center font-semibold text-gray-700 rounded-tr-xl"
                  >
                    31
                  </th>
                </tr>
              </thead>

              <tbody>
                <template v-for="(item, index) in paginatedBlankItems" :key="item.id">
                  <tr class="border-b bg-white hover:bg-gray-50 transition">
                    <td class="text-center font-semibold p-2 border" rowspan="4">
                      {{ index + 1 }}
                    </td>

                    <!-- Action button -->
                    <td class="p-2 border" rowspan="4">
                      <button
                        @click="loadDataStockAwal('Edit', item)"
                        class="px-3 py-1 rounded bg-green-600 text-white text-sm flex items-center gap-1 hover:bg-green-700"
                      >
                        <EditFilled />
                        Edit
                      </button>
                    </td>

                    <td class="p-2 border font-medium" rowspan="4">
                      {{ item.part_number }}
                    </td>

                    <td class="p-2 border font-medium text-center" rowspan="4">
                      {{ item.stock_awal }}
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </v-window-item>

        <v-window-item value="ifp">
          <div class="w-full overflow-x-auto mt-4">
            <!-- Header Title -->
            <table class="min-w-full border-collapse">
              <thead>
                <tr>
                  <th
                    :colspan="36"
                    class="text-center text-4xl font-bold py-4 text-gray-800 bg-green-100"
                  >
                    Report Stock IFP Period {{ formatPeriod(filter.period) }}
                  </th>
                </tr>

                <!-- Filter Row -->
                <tr class="bg-white border-b">
                  <th colspan="3" class="px-4 py-2">
                    <div class="relative">
                      <SearchOutlined class="font-semibold absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />

                      <input
                        v-model="datatablesIFP.filters.part_number"
                        type="text"
                        placeholder="Search Part Number..."
                        class="w-full bg-gray-50 pl-8 p-2 border rounded focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                  </th>
                  <th colspan="33"></th>
                </tr>

                <!-- Table Header Row -->
                <tr class="bg-green-200">
                  <th class="px-4 py-2 text-left font-semibold text-gray-700">No</th>
                  <th class="px-4 py-2 text-left font-semibold text-gray-700">Action</th>
                  <th class="px-4 py-2 text-left font-semibold text-gray-700">Part Number</th>
                  <th class="px-4 py-2 text-center font-semibold text-gray-700">Stock Awal</th>
                  <th class="px-4 py-2"></th>

                  <!-- Loop 01–29 -->
                  <th
                    v-for="day in 30"
                    :key="day"
                    class="px-2 py-2 text-center font-semibold text-gray-700"
                  >
                    {{ day.toString().padStart(2, "0") }}
                  </th>

                  <!-- Day 30 -->
                  <!-- <th
                    v-if="['01','03','05','07','08','10','12'].includes(filter.period.substring(5, 7))"
                    :class="[
                      !['01','03','05','07','08','10','12'].includes(filter.period.substring(5, 7))
                        ? 'rounded-tr-xl'
                        : ''
                    ]"
                    class="px-2 py-2 text-center font-semibold text-gray-700"
                  >
                    30
                  </th> -->

                  <!-- Day 31 -->
                  <th
                    v-if="['01','03','05','07','08','10','12'].includes(filter.period.substring(5, 7))"
                    class="px-2 py-2 text-center font-semibold text-gray-700"
                  >
                    31
                  </th>
                </tr>
              </thead>

              <tbody>
                <template v-for="(item, index) in paginatedIFPItems" :key="item.id">
                  <tr class="border-b bg-white hover:bg-gray-100 transition">
                    <td class="text-center font-semibold p-2 border border-solid !border-gray-400" rowspan="4">
                      {{ index + 1 }}
                    </td>

                    <!-- Action button -->
                    <td class="p-2 border border-solid !border-gray-400" rowspan="4">
                      <button
                        @click="loadDataStockAwalIfp('Edit', item)"
                        class="px-3 py-1 rounded bg-green-500 text-white text-sm flex items-center gap-1 hover:bg-green-600"
                      >
                        <EditFilled />
                        Edit
                      </button>
                    </td>

                    <td class="p-2 border border-solid !border-gray-400 font-medium" rowspan="4">
                      {{ item.part_number }}
                    </td>

                    <td class="p-2 border border-solid !border-gray-400 font-medium text-center" rowspan="4">
                      {{ item.stock_awal }}
                    </td>
                  </tr>

                  <!-- ROW 2: IN -->
                  <tr class="border-b bg-white hover:bg-gray-100 transition">
                    <td class="p-2 border border-solid !border-gray-400 bg-gray-100 font-semibold text-center">
                      In
                    </td>

                    <!-- Loop tanggal 01–30 -->
                    <td
                      v-for="day in 30"
                      :key="'in-' + day"
                      class="py-2 text-center border"
                      :class="[
                        params.day == day.toString().padStart(2,'0') ? 'bg-green-200 font-semibold !border-green-700 ' : '!border-gray-400',
                      ]"
                    >
                      {{ item['in_' + day.toString().padStart(2,'0')] || 0 }}
                    </td>

                    <!-- Tanggal 31 muncul conditional -->
                    <td
                      v-if="['01','03','05','07','08','10','12'].includes(filter.period.substr(5,2))"
                      class="py-2 text-center border border-solid !border-gray-400"
                      :class="params.day == '31' ? 'bg-green-200 font-semibold border border-solid !border-green-700' : ''"
                    >
                      {{ item.in_31 || 0 }}
                    </td>
                  </tr>

                  <!-- ROW 3: OUT -->
                  <tr class="border-b bg-white hover:bg-gray-100 transition">
                    <td class="p-2 border border-solid !border-gray-400 bg-gray-100 font-semibold text-center">
                      Out
                    </td>

                    <!-- Loop tanggal 01–30 -->
                    <td
                      v-for="day in 30"
                      :key="'out-' + day"
                      class="py-2 text-center border border-solid !border-gray-400"
                      :class="[
                        params.day == day.toString().padStart(2,'0') ? 'bg-green-200 font-semibold border border-solid !border-green-700' : '',
                      ]"
                    >
                      {{ item['out_' + day.toString().padStart(2,'0')] || 0 }}
                    </td>

                    <!-- Tanggal 31 muncul conditional -->
                    <td
                      v-if="['01','03','05','07','08','10','12'].includes(filter.period.substr(5,2))"
                      class="py-2 text-center border border-solid !border-gray-400"
                      :class="params.day == '31' ? 'bg-green-200 font-semibold border border-solid !border-green-700' : ''"
                    >
                      {{ item.out_31 || 0 }}
                    </td>
                  </tr>

                  <!-- ROW 4: STOCK AKHIR -->
                  <tr class="border-b bg-white hover:bg-gray-100 transition">
                    <td class="p-2 border border-solid !border-gray-400 bg-gray-100 font-semibold text-center">
                      Stock Akhir
                    </td>

                    <td
                      v-for="day in 30"
                      :key="'stock_akhir-' + day"
                      class="py-2 text-center border border-solid !border-gray-400 font-semibold"
                      :class="[
                        stockAkhir(item, day) < 0 ? 'text-red-600' : '',
                        params.day == day.toString().padStart(2,'0') ? 'bg-green-200 border border-solid !border-green-700' : '',
                      ]"
                    >
                      {{ stockAkhir(item, day) }}
                    </td>

                    <td
                      v-if="['01','03','05','07','08','10','12'].includes(filter.period.substr(5,2))"
                      class="py-2 text-center border border-solid !border-gray-400 font-semibold"
                      :class="[
                        stockAkhir(item, 31) < 0 ? 'text-red-600' : '',
                        params.day == '31' ? 'bg-green-200 border border-solid !border-green-700' : '',
                      ]"
                    >
                      {{ stockAkhir(item, 31) }}
                    </td>
                  </tr>
                </template>
              </tbody>
              <tfoot class="bg-slate-100 border-t">
                <tr>
                  <td :colspan="36" class="px-4 py-3">

                    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">

                      <!-- LEFT — Rows Per Page -->
                      <div class="flex items-center gap-2">
                        <span class="text-sm text-gray-700">Rows per page:</span>
                        <select
                          v-model="pagination.limit"
                          class="border rounded px-4 py-1 text-sm"
                        >
                          <option :value="8">8</option>
                          <option :value="15">15</option>
                          <option :value="25">25</option>
                          <option :value="50">50</option>
                          <option :value="100">100</option>
                        </select>
                      </div>

                      <!-- CENTER — Showing X to Y of Z -->
                      <div class="text-sm text-gray-600 text-center">
                        Showing
                        <span class="font-semibold">{{ startItem }}</span>
                        to
                        <span class="font-semibold">{{ endItem }}</span>
                        of
                        <span class="font-semibold">{{ totalItems }}</span>
                        entries
                      </div>

                      <!-- RIGHT — Pagination -->
                      <div class="flex items-center gap-1">
                        <button
                          @click="previousPage"
                          :disabled="pagination.page === 1"
                          class="px-3 py-1 border rounded disabled:opacity-40"
                        >
                          Prev
                        </button>

                        <span class="px-3 py-1 border rounded bg-white">
                          {{ pagination.page }}
                        </span>

                        <button
                          @click="nextPage"
                          :disabled="endItem >= totalItems"
                          class="px-3 py-1 border rounded disabled:opacity-40"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </v-window-item>

        <v-window-item value="pcs">
          <div class="w-full overflow-x-auto mt-4">
            <!-- Header Title -->
            <table class="min-w-full border-collapse">
              <thead>
                <tr>
                  <th
                    :colspan="36"
                    class="text-center text-4xl font-bold py-4 text-gray-800 bg-orange-100"
                  >
                    Report Achievement PCS Period {{ formatPeriod(filter.period) }}
                  </th>
                </tr>

                <!-- Filter Search Row -->
                <tr class="bg-white border-b">
                  <th colspan="1" class="px-4 py-2">
                    <div class="relative">
                      <SearchOutlined class="font-semibold absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />

                      <input
                        v-model="datatablesPCS.filters.part_rh"
                        type="text"
                        placeholder="Search Part RH"
                        class="w-full bg-gray-50 pl-8 p-2 border rounded focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                  </th>
                  <th colspan="1" class="px-4 py-2">
                    <div class="relative">
                      <SearchOutlined class="font-semibold absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />

                      <input
                        v-model="datatablesPCS.filters.part_lh"
                        type="text"
                        placeholder="Search Part LH..."
                        class="w-full bg-gray-50 pl-8 p-2 border rounded focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                  </th>
                  <th colspan="33"></th>
                </tr>

                <tr class="bg-orange-200">
                  <th class=" px-4 py-2 text-left font-semibold text-gray-700">Part RH</th>
                  <th class=" px-4 py-2 text-left font-semibold text-gray-700">Part LH</th>
                  <th class="px-4 py-2"></th>

                  <!-- Loop tanggal 01–30 -->
                  <th v-for="day in 30" :key="day"
                      class=" py-2 text-center font-semibold text-gray-700">
                    {{ day.toString().padStart(2, '0') }}
                  </th>

                  <!-- Tanggal 31 muncul conditional -->
                  <th
                    v-if="['01','03','05','07','08','10','12'].includes(filter.period.substr(5, 2))"
                    class="py-2 text-center font-semibold text-gray-700"
                  >
                    31
                  </th>
                </tr>
              </thead>

              <tbody>
                <template v-for="(item) in paginatedPCSItems" :key="item.id">
                  <!-- Row 01 Lot Size RH -->
                  <tr class="border-b">
                    <td rowspan="6" class="px-4 py-2 font-semibold text-gray-800 border border-solid !border-gray-400">
                      {{ item.part_rh }}
                    </td>
                    <td rowspan="6" class="px-4 py-2 font-semibold text-gray-800 border border-solid !border-gray-400">
                      {{ item.part_lh }}
                    </td>

                    <td class="px-4 py-2 font-small text-gray-700 border border-solid !border-gray-400">
                      Lot Size RH
                    </td>

                    <td
                      v-for="day in 30"
                      :key="'lot-rh-' + day"
                      class="py-2 text-center border border-solid !border-gray-400"
                      :class="[
                        params.day == day.toString().padStart(2,'0') ? 'bg-orange-200 border border-solid !border-yellow-700' : '',
                      ]"
                    >
                      {{ item['lot_' + day.toString().padStart(2,'0')] || 0 }}
                    </td>

                    <td
                      v-if="['01','03','05','07','08','10','12'].includes(filter.period.substr(5,2))"
                      class="py-2 text-center border border-solid !border-gray-400"
                      :class="params.day == '31' ? 'bg-orange-200 border border-solid !border-yellow-700' : ''"
                    >
                      {{ item.lot_rh_31 || 0 }}
                    </td>
                  </tr>

                  <!-- Row 02 Act RH -->
                  <tr class="border-b">
                    <td class="hidden"></td>
                    <td class="hidden"></td>

                    <td class="px-4 py-2 font-small text-gray-700 border border-solid !border-gray-400">
                      Actual RH
                    </td>

                    <td
                      v-for="day in 30"
                      :key="'act-rh-' + day"
                      class="py-2 text-center border border-solid !border-gray-400"
                      :class="[
                        params.day == day.toString().padStart(2,'0') ? 'bg-orange-200 border border-solid !border-yellow-700' : '',
                      ]"
                    >
                      {{ item['act_' + day.toString().padStart(2,'0')] || 0 }}
                    </td>

                    <td
                      v-if="['01','03','05','07','08','10','12'].includes(filter.period.substr(5,2))"
                      class="py-2 text-center border border-solid !border-gray-400"
                      :class="params.day == '31' ? 'bg-orange-200 border border-solid !border-yellow-700' : ''"
                    >
                      {{ item.act_31 || 0 }}
                    </td>
                  </tr>

                  <!-- ROW 3 — ACCUM RH -->
                  <tr class="border-b">
                    <td class="hidden"></td>
                    <td class="hidden"></td>

                    <td class="px-4 py-2 font-medium text-gray-700 border border-solid !border-gray-400 bg-[#FAEBD7]">
                      Accumulation RH
                    </td>

                    <td
                      v-for="day in 30"
                      :key="'acc-rh-' + day"
                      class="py-2 text-center border border-solid !border-gray-400 font-semibold"
                      :class="[
                        accumRH(item, day) < 0 ? 'text-red-600' : '',
                        params.day == day.toString().padStart(2,'0') ? 'bg-orange-200 border border-solid !border-yellow-700' : '',
                      ]"
                    >
                      {{ accumRH(item, day) }}
                    </td>

                    <td
                      v-if="['01','03','05','07','08','10','12'].includes(filter.period.substr(5,2))"
                      class="py-2 text-center border border-solid !border-gray-400 font-semibold"
                      :class="[
                        accumRH(item, 31) < 0 ? 'text-red-600' : '',
                        params.day == '31' ? 'bg-orange-200 border border-solid !border-yellow-700' : '',
                      ]"
                    >
                      {{ accumRH(item, 31) }}
                    </td>
                  </tr>

                  <!-- ROW 4 — LOT SIZE LH -->
                  <tr class="border-b">
                    <td class="hidden"></td>
                    <td class="hidden"></td>

                    <td class="px-4 py-2 font-medium text-gray-700 border border-solid !border-gray-400">
                      Lot Size LH
                    </td>

                    <td
                      v-for="day in 30"
                      :key="'lot-lh-' + day"
                      class="py-2 text-center border border-solid !border-gray-400"
                      :class="params.day == day.toString().padStart(2,'0') ? 'bg-orange-200 border border-solid !border-yellow-700' : ''"
                    >
                      {{ item['lot_lh_' + day.toString().padStart(2,'0')] || 0 }}
                    </td>

                    <td
                      v-if="['01','03','05','07','08','10','12'].includes(filter.period.substr(5,2))"
                      class="py-2 text-center border border-solid !border-gray-400"
                      :class="params.day == '31' ? 'bg-orange-200 font-semibold border border-solid !border-yellow-700' : ''"
                    >
                      {{ item.lot_lh_31 || 0 }}
                    </td>
                  </tr>

                  <!-- ROW 5 — ACTUAL LH -->
                  <tr class="border-b">
                    <td class="hidden"></td>
                    <td class="hidden"></td>

                    <td class="px-4 py-2 font-medium text-gray-700 border !border-gray-400">
                      Actual LH
                    </td>

                    <td
                      v-for="day in 30"
                      :key="'act-lh-' + day"
                      class="py-2 text-center border !border-gray-400"
                      :class="params.day == day.toString().padStart(2,'0') ? 'bg-orange-200 border border-solid !border-yellow-700' : ''"
                    >
                      {{ item['act_lh_' + day.toString().padStart(2,'0')] || 0 }}
                    </td>

                    <td
                      v-if="['01','03','05','07','08','10','12'].includes(filter.period.substr(5,2))"
                      class="py-2 text-center border !border-gray-400"
                      :class="params.day == '31' ? 'bg-orange-200 border border-solid !border-yellow-700' : ''"
                    >
                      {{ item.act_lh_31 || 0 }}
                    </td>
                  </tr>

                  <!-- ROW 6 — ACCUM LH -->
                  <tr class="border-b">
                    <td class="hidden"></td>
                    <td class="hidden"></td>

                    <td class="px-4 py-2 font-medium text-gray-700 border !border-gray-400 bg-[#7FFFD4]">
                      Accumulation LH
                    </td>

                    <td
                      v-for="day in 30"
                      :key="'acc-lh-' + day"
                      class="py-2 text-center border !border-gray-400 font-semibold"
                      :class="[
                        accumLH(item, day) < 0 ? 'text-red-600' : '',
                        params.day == day.toString().padStart(2,'0') ? 'bg-orange-200 border border-solid !border-yellow-700' : '',
                      ]"
                    >
                      {{ accumLH(item, day) }}
                    </td>

                    <td
                      v-if="['01','03','05','07','08','10','12'].includes(filter.period.substr(5,2))"
                      class="py-2 text-center border !border-gray-400 font-semibold"
                      :class="[
                        accumLH(item, 31) < 0 ? 'text-red-600' : '',
                        params.day == '31' ? 'bg-orange-200 border border-solid !border-yellow-700' : '',
                      ]"
                    >
                      {{ accumLH(item, 31) }}
                    </td>
                  </tr>
                </template>
              </tbody>
              <tfoot class="bg-slate-100 border-t">
                <tr>
                  <td :colspan="36" class="px-4 py-3">

                    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">

                      <!-- LEFT — Rows Per Page -->
                      <div class="flex items-center gap-2">
                        <span class="text-sm text-gray-700">Rows per page:</span>
                        <select
                          v-model="pagination.limit"
                          class="border rounded px-4 py-1 text-sm"
                        >
                          <option :value="8">8</option>
                          <option :value="15">15</option>
                          <option :value="25">25</option>
                          <option :value="50">50</option>
                          <option :value="100">100</option>
                        </select>
                      </div>

                      <!-- CENTER — Showing X to Y of Z -->
                      <div class="text-sm text-gray-600 text-center">
                        Showing
                        <span class="font-semibold">{{ startItem }}</span>
                        to
                        <span class="font-semibold">{{ endItem }}</span>
                        of
                        <span class="font-semibold">{{ totalItems }}</span>
                        entries
                      </div>

                      <!-- RIGHT — Pagination -->
                      <div class="flex items-center gap-1">
                        <button
                          @click="previousPage"
                          :disabled="pagination.page === 1"
                          class="px-3 py-1 border rounded disabled:opacity-40"
                        >
                          Prev
                        </button>

                        <span class="px-3 py-1 border rounded bg-white">
                          {{ pagination.page }}
                        </span>

                        <button
                          @click="nextPage"
                          :disabled="endItem >= totalItems"
                          class="px-3 py-1 border rounded disabled:opacity-40"
                        >
                          Next
                        </button>
                      </div>

                    </div>

                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </v-window-item>
      </v-window>
    </div>
   </div>

   <!-- Dialog Edit -->
    <div
      v-if="dialog.formIfp"
      class="fixed inset-0 z-9999 flex items-center justify-center bg-black/50"
    >
      <!-- Modal Box -->
      <div class="w-full max-w-2xl bg-white rounded-lg shadow-lg">

        <!-- Header -->
        <div class="flex items-center justify-between px-5 py-3 border-b">
          <h3 class="text-lg font-semibold">
            Edit Stock Awal IFP {{ formIfp.part_number }}
          </h3>

          <button
            @click="dialog.formIfp = false"
            class="text-gray-400 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <!-- Body -->
        <div class="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">

          <!-- Part Number -->
          <div>
            <h1 class="mb-1 font-medium">Part Number</h1>
            <div class="relative">
              <EditFilled
                class="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500"
              />
              <input
                v-model="formIfp.part_number"
                type="text"
                placeholder="Part Number"
                class="w-full bg-gray-50 pl-8 p-2 border rounded focus:ring-2 focus:ring-gray-400"
              />
            </div>
          </div>

          <!-- Stock Awal -->
          <div>
            <h1 class="mb-1 font-medium">Stock Awal</h1>
            <div class="relative">
              <EditFilled
                class="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500"
              />
              <input
                v-model.number="formIfp.stock_awal"
                type="number"
                min="0"
                placeholder="Stock Awal"
                class="w-full bg-gray-50 pl-8 p-2 border rounded focus:ring-2 focus:ring-gray-400"
              />
            </div>
          </div>

        </div>

        <!-- Footer -->
        <div class="flex justify-end gap-2 px-5 py-3 border-t">

          <button
            @click="dialog.formIfp = false"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
          >
            Close
          </button>

          <button
            @click="achievementStore.onUpdate('ifp')"
            class="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  <!-- End Edit -->

   <!-- MODAL UPLOAD -->
  <div
    v-if="dialog.upload"
    class="fixed inset-0 z-9999 flex items-center justify-center bg-black/50"
  >
    <div class="w-full max-w-7xl bg-white rounded-lg shadow-lg">

      <!-- HEADER -->
      <div class="flex items-center justify-between px-5 py-3 border-b">
        <h3 class="text-lg font-semibold">Upload Stock</h3>
        <button
          @click="dialog.upload = false"
          class="text-gray-400 hover:text-gray-700"
        >
          ✕
        </button>
      </div>

      <!-- BODY -->
      <div class="p-5 space-y-4">

        <!-- PERIOD PICKER -->
        <div class="flex flex-wrap items-center gap-3 mb-4">
          <form class="flex">
            <!-- MONTH -->
            <select
              v-model="filterDate.month"
              class="bg-gray-100 min-w-[130px] border border-gray-300 text-gray-900 text-sm rounded-s-xl focus:ring-blue-500 focus:border-blue-500 block p-2.5"
            >
              <option value="" disabled>Pilih Bulan</option>
              <option value="01">Januari</option>
              <option value="02">Februari</option>
              <option value="03">Maret</option>
              <option value="04">April</option>
              <option value="05">Mei</option>
              <option value="06">Juni</option>
              <option value="07">Juli</option>
              <option value="08">Agustus</option>
              <option value="09">September</option>
              <option value="10">Oktober</option>
              <option value="11">November</option>
              <option value="12">Desember</option>
            </select>

            <!-- YEAR -->
            <select
              v-model="filterDate.year"
              class="bg-gray-100 min-w-[130px] border-t border-b border-gray-300 text-gray-900 text-sm focus:ring-blue-500 focus:border-blue-500 block p-2.5"
            >
              <option value="" disabled>Pilih Tahun</option>
              <option
                v-for="i in 5"
                :key="i"
                :value="new Date().getFullYear() - (i - 1)"
              >
                {{ new Date().getFullYear() - (i - 1) }}
              </option>
            </select>

            <!-- APPLY -->
            <button
              type="button"
              @click="applyPeriod"
              class="flex items-center gap-2 text-white bg-blue-600 hover:bg-blue-800 font-medium rounded-e-xl text-sm px-4 py-2.5"
            >
              <SyncOutlined />
              Sync Data
            </button>
          </form>
        </div>

        <!-- TABLE -->
        <div v-if="datatablesUpload.items.length">
          <TableExcel :columns="uploadColumns" :data="(datatablesUpload.items as unknown as Record<string, unknown>[])">
            <template #cell-ERROR="{ row }">
              <span
                v-if="(row as unknown as DataTableUploadRow).ERROR"
                class="inline-flex items-center px-2 py-1 text-xs font-medium text-yellow-800 bg-yellow-100 rounded"
                title="Error"
              >
                <WarningOutlined />
              </span>
              <span
                v-else
                class="inline-flex items-center px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded"
              >
                <CheckOutlined />
              </span>
            </template>
          </TableExcel>
        </div>

      </div>

      <!-- FOOTER -->
      <div class="flex justify-end gap-2 px-5 py-3 border-t">

        <button
          v-if="permissions.create && datatablesUpload.items.length && !error"
          @click="onUpload"
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
        >
        <SaveOutlined />
          Save
        </button>

        <button
          v-if="permissions.create && datatablesUpload.items.length"
          @click="onDelete"
          class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700"
        >
        <DeleteOutlined />
          Reset
        </button>
      </div>
    </div>
  </div>
</template>

<style>
.border {
  border: 1px solid #e5e7eb !important;
}
  /* Flowbite Datepicker Custom Styles */
.datepicker-cell.selected,
.datepicker-cell.selected:hover {
  background-color: #3b82f6 !important;
  color: white !important;
  font-weight: 600;
}

.datepicker-cell.today {
  background-color: #dbeafe;
  font-weight: 600;
}

.datepicker-cell.today.selected {
  background-color: #3b82f6 !important;
  color: white !important;
}

.datepicker-cell:hover {
  background-color: #f3f4f6;
}

.datepicker-cell.focused:not(.selected) {
  background-color: #e5e7eb;
}

.datepicker-cell {
  border-radius: 0.375rem;
  margin: .5px;
}

.datepicker-cell.prev,
.datepicker-cell.next {
  color: #b8b8b8 !important;
}

.datepicker-days {
  display: none !important;
}
</style>