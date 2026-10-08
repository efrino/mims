<script setup lang="ts">
import { onMounted, ref, shallowRef, watch, computed } from "vue";
import { useConfigStore } from "@/stores/config";
import { useStampingAchievementReportAndonStore } from '@/stores/Stamping/Report/AchievementAndon';
import { useNotificationStore } from "@/stores/notification";
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { useUtilityStore } from "@/stores/utility";
import { initFlowbite } from "flowbite";
import { storeToRefs } from "pinia";
import * as XLSX from "xlsx";

import type {
  AchievementReportAndonMDFOStmp,
} from "@/types/Stamping/Report/AchievementAndon";

import {
  EyeOutlined,
  UploadOutlined
} from '@ant-design/icons-vue';
import TableExcel, { type TableColumn } from '@/components/table/TableExcel.vue';
import DateRangePickerSplitButton from '@/components/date/DateRangePickerSplitButton.vue';

const page = ref({ title: 'Report Achievement Stamping' });
const breadcrumbs = shallowRef([
  {
    title: "Report",
    disabled: false,
    href: "#",
  },
  {
    title: "Stamping",
    disabled: false,
    href: "#",
  },
  {
    title: "Achievement",
    disabled: true,
    href: "#",
  },
]);

const achievementStore = useStampingAchievementReportAndonStore();
const utilityStore = useUtilityStore();
const configStore = useConfigStore();
const notificationStore = useNotificationStore();

const {
  permissions,
  filterDate,
  tipeData,
  dataTableSummary,
  dataTableMutasi,
  dataTableMDFO,
  dialog,
  formData,
  detail,
} = storeToRefs(achievementStore);

const {
  loadDetail,
  onUploadMDFO,
} = achievementStore;

const {
  formatPercent,
  formatNumberOneDecimal,
  dateMonthFull,
  formatDecimaltoNumber,
} = utilityStore

const summaryColumns: TableColumn[] = [
  { key: 'part_number', label: 'Part Number' },
  { key: 'line_id', label: 'Line' },
  { key: 'plan', label: 'Plan' },
  { key: 'actual', label: 'Actual' },
  { key: 'diff_plan_pcs', label: 'Diff Plan (PCS)', align: 'right' },
  { key: 'diff_plan_persen', label: 'Diff Plan (%)', align: 'right' },
  { key: 'gsph', label: 'GSPH', align: 'right' },
  { key: 'tpt', label: 'TPT', align: 'right', sortable: false, filterable: false },
];

const uploadMDFOColumns: TableColumn[] = [
  { key: 'part_number', label: 'Part Number' },
  { key: 'status', label: 'Status' },
  { key: 'line', label: 'Line' },
  { key: 'process', label: 'Process' },
  { key: 'mdfo', label: 'MDFO' },
  { key: 'gsph', label: 'GSPH' },
  { key: 'ERROR', label: 'Info', align: 'center', sortable: false, filterable: false },
];

const tab = ref<"summary" | "mutasi">("summary");
const n = (v: number | null) => v ?? 0
const excel = ref<File | null>(null)
const loading = ref(false);
const error = ref(0);
const fileInput = ref<HTMLInputElement | null>(null)

const fetchActiveData = () => {
  if (tab.value === 'summary') {
    achievementStore.fetchDataReportSummary()
  } else {
    achievementStore.fetchDataReportMutasi()
  }
}

onMounted(() => {
  initFlowbite()
})

// XLSX helper
function onDelete() {
  excel.value = null
  achievementStore.dataTablesUploadMDFO = []
  achievementStore.dataTableMDFO = []
  achievementStore.dialog.upload = false
}

function openFile() {
  fileInput.value?.click()
}

function handleFileUpload(e: Event) {
  loading.value = true

  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  excel.value = file
  error.value = 0

  const reader = new FileReader()

  reader.onloadend = () => {
    try {
      const buffer = new Uint8Array(reader.result as ArrayBuffer)
      const wb = XLSX.read(buffer, { type: "array" })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 })

      // reset dulu
      achievementStore.dataTablesUploadMDFO = []
      achievementStore.dataTableMDFO = []

      rows.slice(1).forEach((row,) => {
        const raw: AchievementReportAndonMDFOStmp = {
          id: crypto.randomUUID(),
          date: achievementStore.filterDate.start,
          shift: "",
          time_shift: "",
          line_id: row[2] ?? "",
          part_number: row[0] ?? "",
          plan_process: "",
          act_process: row[3] ?? "",
          total_process: row[4] ?? "",
          status: row[1] ?? "",
          gsph_plan: row[5] ?? "",
          information: "",
        }

        // VALIDASI
        if (!raw.part_number) {
          error.value++
          raw.information += "Part Number tidak boleh kosong.\n"
        }
        if (!raw.total_process) {
          error.value++
          raw.information += "MDFO tidak boleh kosong.\n"
        }
        if (!raw.gsph_plan) {
          error.value++
          raw.information += "GSPH tidak boleh kosong.\n"
        }

        achievementStore.dataTablesUploadMDFO.push(raw)
      })

      // mapping untuk table preview
      achievementStore.dataTableMDFO =
        achievementStore.mapMDFOToTable(
          achievementStore.dataTablesUploadMDFO
        )

      achievementStore.dialog.upload = true
    } catch (err) {
      notificationStore.showDialogWarning(
        'Warning' ,"Cek kembali format file Excel yang diupload"
      )
    } finally {
      loading.value = false
      input.value = "" // reset input
    }
  }

  reader.readAsArrayBuffer(file)
}

// mutasi helper
const dayRange = (start: number, end: number): number[] => {
  if (!start || !end || end < start) return []

  return Array.from(
    { length: end - start + 1 },
    (_, index) => start + index
  )
}

const getDay = (date?: string | null): number => {
  return date ? Number(date.split('-')[2]) : 0
}

const getCumulativeTotal = (item: any, day: number): number => {
  let sum = 0

  for (let i = 1; i <= day; i++) {
    const key = `total_${String(i).padStart(2, '0')}`
    sum += Number(item[key] ?? 0)
  }

  return sum
}

// tab changing action helper
const activeDataTable = computed<any[]>(() => {
  return tab.value === 'summary'
    ? dataTableSummary.value ?? []
    : dataTableMutasi.value ?? []
})

// Search functionality
const searchQuery = ref('');

// Pagination
const currentPage = ref(1);
const itemsPerPage = ref(10);
const itemsPerPageOptions = [10, 25, 50, 100];

// Computed property for filtered data  
const filteredData = computed(() => {
  if (!searchQuery.value) return activeDataTable.value

  const query = searchQuery.value.toLowerCase()
  return activeDataTable.value.filter(item => {
    return (
      item.part_number?.toLowerCase().includes(query) ||
      item.line_id?.toLowerCase().includes(query)
    )
  })
})

// Pagination computed properties
const totalPages = computed(() => {
  return Math.ceil(filteredData.value.length / itemsPerPage.value);
});

const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return filteredData.value.slice(start, end);
});

const paginationRange = computed(() => {
  const range = [];
  const delta = 2; // Number of pages to show around current page

  for (let i = 1; i <= totalPages.value; i++) {
    if (
      i === 1 ||
      i === totalPages.value ||
      (i >= currentPage.value - delta && i <= currentPage.value + delta)
    ) {
      range.push(i);
    } else if (range[range.length - 1] !== '...') {
      range.push('...');
    }
  }

  return range;
});

// Pagination methods
const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
  }
};

const changeItemsPerPage = () => {
  currentPage.value = 1; // Reset to first page when changing items per page
};

// Watch search query to reset pagination
const resetPagination = () => {
  currentPage.value = 1;
};

// Watch for search query changes
watch(searchQuery, () => {
  resetPagination();
});

watch(tab, () => {
  currentPage.value = 1
  searchQuery.value = ''
  // TIDAK fetch otomatis saat ganti tab
})

watch(
  () => ({ ...filterDate.value }),
  () => {
    currentPage.value = 1
  }
)
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7"></BaseBreadcrumb>
  <div class="flex flex-wrap">
    <div class="flex items-center justify-between my-3 px-3">
      <!-- Excel Export Button -->
      <button type="button" @click="openFile"
        class="flex items-center gap-2 text-white bg-blue-600 hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300 font-medium rounded-full text-sm px-5 py-2.5 text-center me-2">
        <input ref="fileInput" type="file" class="hidden"
          accept="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" @change="handleFileUpload" />
        <UploadOutlined :style="{ fontSize: '18px' }" />
        Upload
      </button>
      <a type="button" v-if="achievementStore.permissions.download"
        :href="`http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/report?start=${achievementStore.filterDate.start}&end=${achievementStore.filterDate.end}`"
        target="_blank"
        class="flex items-center gap-2 text-white bg-green-600 hover:bg-green-800 focus:outline-none focus:ring-4 focus:ring-green-300 font-medium rounded-full text-sm px-5 py-2.5 text-center">
          <svg class="w-5 h-5 text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 15v2a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-2m-8 1V4m0 12-4-4m4 4 4-4"/>
          </svg>
        Excel
      </a>
    </div>
  </div>

  <div class="bg-blue-600 shadow-lg rounded-xl p-6 mb-6">
    <div class="text-center py-6">
      <h1 class="text-6xl font-bold text-white">
        Report Achievement Press
      </h1>
    </div>

    <div class="flex gap-2">
      <!--` SUMMARY TAB -->
      <button @click="tab = 'summary'" class="px-6 py-2 rounded-t-xl text-sm font-semibold transition" :class="tab === 'summary'
          ? 'bg-white text-blue-600'
          : 'bg-blue-600 text-white hover:bg-blue-400'
        ">
        Summary
      </button>

      <!-- MUTASI TAB -->
      <button @click="tab = 'mutasi'" class="px-6 py-2 rounded-t-xl text-sm font-semibold transition" :class="tab === 'mutasi'
          ? 'bg-white text-blue-600'
          : 'bg-blue-600 text-white hover:bg-blue-400'
        ">
        Mutasi
      </button>
    </div>

    <div v-if="tab === 'summary'" class="mb-10">
      <div class="bg-white shadow-lg rounded-b-lg rounded-tr-lg p-6">
        <!-- Header -->
        <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
          <div>
            <h2 class="text-blue-600 text-xl md:text-3xl font-semibold">
              Summary Achievement Press
            </h2>
          </div>

          <!-- Actions -->
          <div class="flex flex-wrap justify-end items-center gap-4">
            <!-- Select tipe Data -->
            <select v-model="achievementStore.selectedTipe" @change="achievementStore.fetchDataReportSummary()" class="h-9 px-3 text-sm border border-gray-300 rounded-lg bg-gray-50
                    focus:ring-blue-500 focus:border-blue-500">
              <!-- Placeholder -->
              <option disabled value="">
                Select Tipe
              </option>

              <!-- Options -->
              <option v-for="item in tipeData" :key="item" :value="item">
                {{ item }}
              </option>
            </select>            
            <!-- Filter date (start + end, satu button) -->
            <DateRangePickerSplitButton
              v-model:start="filterDate.start"
              v-model:end="filterDate.end"
            />

            <!-- Load Data Button -->
            <button type="button" @click="fetchActiveData"
              class="flex items-center gap-1.5 whitespace-nowrap
text-white bg-blue-600 hover:bg-blue-800
focus:outline-none focus:ring-2 focus:ring-blue-300
font-medium rounded-full text-sm
px-3 h-9">
              Load Data
            </button>
          </div>
        </div>

        <TableExcel :columns="summaryColumns" :data="(dataTableSummary ?? []) as unknown as Record<string, unknown>[]">
          <template #cell-diff_plan_pcs="{ row }">
            <span class="font-bold" :class="n((row as any).diff_plan_pcs) < 0 ? 'text-red-500' : ''">
              {{ (row as any).diff_plan_pcs }}
            </span>
          </template>

          <template #cell-diff_plan_persen="{ row }">
            <span class="font-bold" :class="{
              'text-blue-500': Math.round(n((row as any).diff_plan_persen)) > 100,
              'text-red-500': Math.round(n((row as any).diff_plan_persen)) < 100,
              'text-green-600': Math.round(n((row as any).diff_plan_persen)) === 100
            }">
              {{
                (row as any).diff_plan_persen !== null
                  ? formatPercent((row as any).diff_plan_persen)
                  : "-"
              }}
            </span>
          </template>

          <template #cell-gsph="{ row }">
            {{ formatNumberOneDecimal((row as any).gsph) }}
          </template>

          <template #cell-tpt="{ row }">
            {{
              (row as any).gsph
                ? formatNumberOneDecimal(
                  Math.abs(n((row as any).diff_plan_pcs) / (row as any).gsph)
                )
                : "-"
            }}
          </template>

          <template #actions="{ row }">
            <button class="inline-flex items-center gap-1 px-3 py-1 text-sm
                    text-blue-600 outline-1 outline-offset-1 outline-solid rounded-md"
              @click="loadDetail((row as any).part_number, [filterDate.start, filterDate.end])">
              <EyeOutlined />
              View
            </button>
          </template>

          <template #empty>
            <span class="px-5 py-12 text-center text-gray-400 text-sm">Tidak ada data</span>
          </template>
        </TableExcel>
      </div>
    </div>

    <div v-if="tab === 'mutasi'" class="mb-10">
      <div class="bg-white shadow-lg rounded-lg p-6">
        <!-- Header -->
        <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
          <div>
            <h2 class="text-blue-600 text-xl md:text-3xl font-semibold">
              Mutasi Achievement Press
            </h2>
          </div>

          <!-- Actions -->
          <div class="flex flex-wrap justify-end items-center gap-4">
            <!-- Search Input -->
            <div class="relative">
              <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input v-model="searchQuery" type="text" id="table-search-mutasi"
                class="block h-9 pl-10 pr-3 text-sm text-gray-900 border border-gray-300 rounded-full w-full sm:w-64 bg-gray-50 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Search for part number" />
            </div>
            <!-- Filter date (start + end, satu button) -->
            <DateRangePickerSplitButton
              v-model:start="filterDate.start"
              v-model:end="filterDate.end"
            />

            <!-- Load Data Button -->
            <button type="button" @click="fetchActiveData"
              class="flex items-center gap-1.5 whitespace-nowrap
text-white bg-blue-600 hover:bg-blue-800
focus:outline-none focus:ring-2 focus:ring-blue-300
font-medium rounded-full text-sm
px-3 h-9">
              Load Data
            </button>
          </div>
        </div>

        <div class="relative overflow-x-auto mt-4">
          <table class="w-full text-sm text-left text-gray-500">
            <thead class="text-base text-amber-500 uppercase bg-yellow-100">
              <tr>
                <th rowspan="2" class="px-4 py-3 text-center">Part Number</th>
                <th rowspan="2"></th>
                <th v-for="number in dayRange(
                  filterDate.start ? parseInt(filterDate.start.slice(8, 10)) : 0,
                  filterDate.end ? parseInt(filterDate.end.slice(8, 10)) : 0
                )" :key="number" class="text-center">
                  {{ number }}
                </th>
              </tr>
            </thead>

            <tbody>
              <template v-for="(item, index) in paginatedData" :key="index">

                <tr class="bg-white border-b border">
                  <td rowspan="4" class="px-4 py-2 text-center text-lg font-semibold">
                    {{ item.part_number }}
                  </td>
                </tr>

                <!-- PLAN -->
                <tr class="bg-white border-b border">
                  <td class="px-4 py-2 border">Plan</td>

                  <td v-for="day in dayRange(getDay(filterDate.start), getDay(filterDate.end))" :key="'plan-' + day"
                    class="px-3 py-2 text-center border">
                    {{ item[`plan_${String(day).padStart(2, '0')}`] ?? 0 }}
                  </td>
                </tr>

                <!-- ACTUAL -->
                <tr class="bg-white border-b hover:bg-blue-50 border">
                  <td class="px-4 py-2 border">Actual</td>

                  <td v-for="day in dayRange(getDay(filterDate.start), getDay(filterDate.end))" :key="'act-' + day"
                    class="px-3 py-2 text-center border">
                    {{ item[`act_${String(day).padStart(2, '0')}`] ?? 0 }}
                  </td>
                </tr>

                <!-- DIFF -->
                <tr class="bg-yellow-50 border-b hover:bg-blue-50 border">
                  <td class="px-4 py-2 font-semibold krem border">Diff</td>

                  <td v-for="day in dayRange(getDay(filterDate.start), getDay(filterDate.end))" :key="'diff-' + day"
                    class="px-3 py-2 text-center font-bold krem border" :class="getCumulativeTotal(item, day) < 0
                        ? 'text-red-500 border'
                        : ''
                      ">
                    {{ getCumulativeTotal(item, day) }}
                  </td>
                </tr>

              </template>
            </tbody>
          </table>
        </div>
        <!-- Table Footer -->
        <div class="mt-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <!-- Results Counter -->
            <div class="text-sm text-gray-600">
              Showing {{ ((currentPage - 1) * itemsPerPage) + 1 }} to {{ Math.min(currentPage * itemsPerPage,
              filteredData.length) }} of {{ filteredData.length }} results
            </div>
            <div class="text-sm text-gray-600">
              Page {{ currentPage }} of {{ totalPages }}
            </div>
            <!-- Items Per Page — dipindah ke sini -->
            <div class="flex items-center gap-1">
              <label for="items-per-page-mutasi" class="text-sm text-gray-700">Show:</label>
              <select v-model="itemsPerPage" @change="changeItemsPerPage" id="items-per-page-mutasi"
                class="border border-gray-300 text-gray-900 text-sm rounded-lg w-16 focus:ring-blue-500 focus:border-blue-500 p-2.5">
                <option v-for="option in itemsPerPageOptions" :key="option" :value="option">
                  {{ option }}
                </option>
              </select>
              <span class="text-sm text-gray-700">entries</span>
            </div>
          </div>

          <!-- Pagination Controls -->
          <nav class="flex items-center gap-2" aria-label="Pagination">
            <!-- Previous Button -->
            <button @click="goToPage(currentPage - 1)" :disabled="currentPage === 1"
              class="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
              Previous
            </button>

            <!-- Page Numbers -->
            <template v-for="(page, index) in paginationRange" :key="index">
              <button v-if="page !== '...'" @click="goToPage(page as number)" :class="[
                'px-3 py-2 text-sm font-medium rounded-lg',
                currentPage === page
                  ? 'text-white bg-blue-600 hover:bg-blue-700'
                  : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-100'
              ]">
                {{ page }}
              </button>
              <span v-else class="px-2 text-gray-500">...</span>
            </template>

            <!-- Next Button -->
            <button @click="goToPage(currentPage + 1)" :disabled="currentPage === totalPages"
              class="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
              Next
            </button>
          </nav>
        </div>
      </div>
    </div>
  </div>

  <!-- Detail Dialog -->
  <div v-if="dialog.detail" class="fixed inset-0 z-9999 flex items-center justify-center bg-black/50">
    <!-- Modal Container -->
    <div class="bg-white rounded-lg shadow-xl w-full max-w-[95vw] max-h-[90vh] flex flex-col">

      <!-- Header -->
      <div class="p-4">
        <h2 class="text-lg font-bold text-gray-700">
          Part Number {{ detail[0]?.part_number ?? "" }}
        </h2>
        <p class="text-sm text-gray-600 mt-1">
          Periode
          {{ filterDate.start ? dateMonthFull(filterDate.start) : "" }}
          {{
            filterDate.end && filterDate.end !== filterDate.start
              ? " s.d " + dateMonthFull(filterDate.end)
              : ""
          }}
        </p>
      </div>

      <!-- Table -->
      <div class="p-4 overflow-x-auto grow">
        <table class="min-w-max text-base border-collapse text-center">
          <thead class="text-black">
            <tr>
              <th class="px-2 py-1 bg-green-100 border_dialog" rowspan="3">No</th>
              <th class="px-2 py-1 bg-green-100 border_dialog" rowspan="3">Date</th>
              <th class="px-2 py-1 bg-green-100 border_dialog" rowspan="3">Line</th>
              <th class="px-2 py-1 bg-green-100 border_dialog" rowspan="3">Shift</th>
              <th class="px-2 py-1 bg-green-100 border_dialog" rowspan="3">Patan</th>
              <th class="px-2 py-1 bg-green-100 border_dialog" colspan="2" rowspan="2">Plan</th>
              <th class="px-2 py-1 bg-green-100 border_dialog" rowspan="3">Keterangan</th>
              <th class="px-2 py-1 bg-blue-100 border_dialog" rowspan="2">OK</th>
              <th class="px-2 py-1 bg-blue-100 border_dialog" colspan="2" rowspan="2">Repair</th>
              <th class="px-2 py-1 bg-blue-100 border_dialog" colspan="2" rowspan="2">Reject</th>
              <th class="px-2 py-1 bg-blue-100 border_dialog" colspan="3" rowspan="2">Actual</th>
              <th class="px-2 py-1 bg-blue-100 border_dialog" rowspan="2">Idletime</th>
              <th class="px-2 py-1 bg-blue-100 border_dialog" rowspan="2">Dandori</th>
              <th class="px-2 py-1 bg-blue-100 border_dialog" colspan="8">Downtime</th>
              <th class="px-2 py-1 bg-blue-100 border_dialog" rowspan="3">GSPH</th>
              <th class="px-2 py-1 bg-blue-100 border_dialog" rowspan="3">Keterangan</th>
            </tr>
            <tr>
              <th class="px-2 py-1 bg-blue-100 border_dialog" colspan="2">Machines</th>
              <th class="px-2 py-1 bg-blue-100 border_dialog" colspan="2">Dies</th>
              <th class="px-2 py-1 bg-blue-100 border_dialog" colspan="2">Other</th>
              <th class="px-2 py-1 bg-blue-100 border_dialog" colspan="2">Material</th>
            </tr>
            <tr>
              <th class="px-2 py-1 bg-green-100 border_dialog">Lot Size</th>
              <th class="px-2 py-1 bg-green-100 border_dialog">TPT</th>
              <th class="px-2 py-1 bg-blue-100 border_dialog">PCS</th>
              <th class="px-2 py-1 bg-blue-100 border_dialog">PCS</th>
              <th class="px-2 py-1 bg-blue-100 border_dialog">Keterangan</th>
              <th class="px-2 py-1 bg-blue-100 border_dialog">PCS</th>
              <th class="px-2 py-1 bg-blue-100 border_dialog">Keterangan</th>
              <th class="px-2 py-1 bg-blue-100 border_dialog">Lot Size</th>
              <th class="px-2 py-1 bg-blue-100 border_dialog">TPT</th>
              <th class="px-2 py-1 bg-blue-100 border_dialog">Status</th>
              <th class="px-2 py-1 bg-blue-100 border_dialog">(Menit)</th>
              <th class="px-2 py-1 bg-blue-100 border_dialog">(Menit)</th>
              <th class="px-2 py-1 bg-blue-100 border_dialog">(Menit)</th>
              <th class="px-2 py-1 bg-blue-100 border_dialog">Keterangan</th>
              <th class="px-2 py-1 bg-blue-100 border_dialog">(Menit)</th>
              <th class="px-2 py-1 bg-blue-100 border_dialog">Keterangan</th>
              <th class="px-2 py-1 bg-blue-100 border_dialog">(Menit)</th>
              <th class="px-2 py-1 bg-blue-100 border_dialog">Keterangan</th>
              <th class="px-2 py-1 bg-blue-100 border_dialog">(Menit)</th>
              <th class="px-2 py-1 bg-blue-100 border_dialog">Keterangan</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="(item, index) in detail" :key="index" class="border-b">
              <td class="px-2 py-1 border_dialog">{{ index + 1 }}</td>
              <td class="px-2 py-1 border_dialog whitespace-nowrap">{{ item.date }}</td>
              <td class="px-2 py-1 border_dialog">{{ item.line_id }}</td>
              <td class="px-2 py-1 border_dialog">{{ item.shift }}</td>
              <td class="px-2 py-1 border_dialog">{{ item.patan }}</td>

              <!-- Plan -->
              <td class="px-2 py-1 border_dialog">{{ item.lotsize }}</td>
              <td class="px-2 py-1 border_dialog">{{ item.tpt }}</td>

              <td class="px-2 py-1 border_dialog">{{ item.keterangan }}</td>

              <!-- Result -->
              <td class="px-2 py-1 border_dialog">{{ item.lotsize_actual }}</td>
              <td class="px-2 py-1 border_dialog">{{ item.repair }}</td>
              <td class="px-2 py-1 border_dialog">{{ item.ket_repair }}</td>
              <td class="px-2 py-1 border_dialog">{{ item.reject }}</td>
              <td class="px-2 py-1 border_dialog">{{ item.ket_reject }}</td>

              <!-- Actual total + color -->
              <td class="px-2 py-1 border_dialog font-bold" :class="Number(item.lotsize_actual) + Number(item.repair) + Number(item.reject) < Number(item.lotsize)
                  ? 'text-red-600'
                  : Number(item.lotsize_actual) + Number(item.repair) + Number(item.reject) === Number(item.lotsize)
                    ? 'text-green-600'
                    : 'text-blue-600'
                ">
                {{ Number(item.lotsize_actual) + Number(item.repair) + Number(item.reject) }}
              </td>

              <td class="px-2 py-1 border_dialog">{{ item.tpt_actual }}</td>
              <td class="px-2 py-1 border_dialog">{{ item.status }}</td>

              <!-- Time -->
              <td class="px-2 py-1 border_dialog">{{ item.idletime }}</td>
              <td class="px-2 py-1 border_dialog">{{ item.dandori }}</td>

              <!-- Downtime -->
              <td class="px-2 py-1 border_dialog">{{ item.dt_machines }}</td>
              <td class="px-2 py-1 border_dialog">{{ item.ket_dt_machines }}</td>
              <td class="px-2 py-1 border_dialog">{{ item.dt_dies }}</td>
              <td class="px-2 py-1 border_dialog">{{ item.ket_dt_dies }}</td>
              <td class="px-2 py-1 border_dialog">{{ item.dt_other }}</td>
              <td class="px-2 py-1 border_dialog">{{ item.ket_dt_other }}</td>
              <td class="px-2 py-1 border_dialog">{{ item.dt_material }}</td>
              <td class="px-2 py-1 border_dialog">{{ item.ket_dt_material }}</td>

              <!-- GSPH -->
              <td class="px-2 py-1 border_dialog">
                {{
                  formatDecimaltoNumber(
                    (item.stroke_act /
                      (item.act_process *
                        (item.tpt_actual - item.idletime))) *
                    60
                  )
                }}
              </td>

              <td class="px-2 py-1 border_dialog">{{ item.keterangan_all }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Footer -->
      <div class="p-4 border-t flex justify-end">
        <button @click="dialog.detail = false" class="px-4 py-2 rounded-lg bg-gray-500 text-white hover:bg-gray-600">
          Close
        </button>
      </div>

    </div>
  </div>

  <!-- Upload MDFO Dialog -->
  <div v-if="dialog.upload" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <!-- Modal Box -->
    <div class="bg-white rounded-lg shadow-xl w-full max-w-6xl">

      <!-- Header Warning -->
      <div class="p-6 border-b">
        <p class="text-red-600 text-lg font-semibold">
          Jika menggunakan fitur upload patan, maka akan menghapus seluruh
          patan pada periode yang sesuai dengan patan yang akan di upload,
          dan menggatinya dengan data yang terupload
        </p>
      </div>
      <!-- Content -->
      <div class="p-6 space-y-4">

        <!-- Month Picker -->
        <div class="w-full md:w-1/3">
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Period
          </label>
          <input type="month" v-model="formData.period"
            class="w-full rounded-lg border border-gray-300 p-2.5 focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <!-- Table -->
        <div v-if="dataTableMDFO.length" class="border rounded-lg overflow-hidden">
          <TableExcel :columns="uploadMDFOColumns" :data="(dataTableMDFO as unknown as Record<string, unknown>[])">
            <template #cell-ERROR="{ row, index }">
              <!-- ERROR -->
              <div v-if="row.ERROR">
                <button :data-tooltip-target="`tooltip-${index}`"
                  class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-yellow-400 text-white">
                  ⚠
                </button>

                <div :id="`tooltip-${index}`" role="tooltip"
                  class="absolute z-50 invisible px-3 py-2 text-xs text-white bg-gray-900 rounded-lg shadow opacity-0">
                  <pre class="whitespace-pre-wrap">{{ row.ERROR }}</pre>
                  <div class="tooltip-arrow"></div>
                </div>
              </div>

              <!-- OK -->
              <span v-else
                class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-500 text-white">
                ✓
              </span>
            </template>
          </TableExcel>
        </div>

        <!-- Bottom Warning -->
        <div class="pt-4">
          <p class="text-red-600 text-lg font-semibold">
            Jika menggunakan fitur upload patan, maka akan menghapus seluruh patan
            pada periode yang sesuai dengan patan yang akan di upload dan
            menggatinya dengan data yang terupload.
          </p>
          <p class="text-lg mt-2">
            Tekan save untuk melanjutkan proses upload atau jika ingin
            membatalkan tekan reset
          </p>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex justify-end gap-2 p-4 border-t">
        <button v-if="permissions.create && dataTableMDFO.length" @click="onDelete"
          class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700">
          Reset
        </button>

        <button v-if="permissions.create && dataTableMDFO.length" @click="onUploadMDFO"
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
          Save
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.border {
  border: 1px solid #e5e7eb !important;
}

.border_dialog {
  border: 2px solid #686868 !important;
}

.border-b {
  border-bottom: 1px solid #e5e7eb !important;
}

tbody tr {
  border-bottom: 2px solid #e0e0e0;
  transition: background-color 0.2s ease;
}

tr:nth-child(even) {
  background-color: #fafafa;
}

tbody tr:hover {
  background-color: #eef6ff !important;
}
</style>

<style>
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

.krem {
  background-color: #fffde7;
}
</style>