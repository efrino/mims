<script setup lang="ts">
import { ref, shallowRef, onMounted, computed, reactive, watch } from "vue";
import { storeToRefs } from "pinia";
import { useReportStockV2Store } from "@/stores/Stamping/Report/StockV2";
import { useUtilityStore } from "@/pinia/utility";
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';

import {
  SearchOutlined,
  SyncOutlined,
  EditFilled,
} from '@ant-design/icons-vue';

// ===== STORE
const stockStore = useReportStockV2Store();

const page = ref({ title: 'Achievement Stock V2 Page' });
const breadcrumbs = shallowRef([
  { title: "Report", disabled: false, href: "#" },
  { title: "Stamping", disabled: false, href: "#" },
  { title: "Stock IFP V2", disabled: true, href: "Achievement" },
]);

// REFS dari store
const { datatablesIFP, dialog, filterDate, formIfp } = storeToRefs(stockStore);
const { fetchReportIFP, filteredItemsIFP, loadDataStockAwalIfp, onUpdateStockAwal } = stockStore;
const { formatPeriod } = useUtilityStore();

const pagination = reactive({ page: 1, limit: 8 });

const totalItems = computed(() => filteredItemsIFP().length);
const startItem = computed(() => (pagination.page - 1) * pagination.limit + 1);
const endItem = computed(() => Math.min(pagination.page * pagination.limit, totalItems.value));

function previousPage() {
  if (pagination.page > 1) pagination.page--;
}
function nextPage() {
  if (pagination.page * pagination.limit < totalItems.value) pagination.page++;
}

const paginatedIFPItems = computed(() => {
  const start = (pagination.page - 1) * pagination.limit;
  const end = pagination.page * pagination.limit;
  return filteredItemsIFP().slice(start, end);
});

// Stock Akhir kumulatif = stock_awal + akumulasi(in) - akumulasi(out) s/d hari ke-N.
// (Beda dari v1 yang menjumlahkan kolom stock_akhir_XX harian tanpa stock_awal.)
const stockAkhir = (item: any, day: number) => {
  let sum = Number(item.stock_awal || 0);
  for (let i = 1; i <= day; i++) {
    const dd = i.toString().padStart(2, '0');
    sum += Number(item['in_' + dd] || 0) - Number(item['out_' + dd] || 0);
  }
  return sum;
};

const isFullMonth = computed(() =>
  ['01', '03', '05', '07', '08', '10', '12'].includes(filterDate.value.period.substr(5, 2))
);

// LIFECYCLE
onMounted(() => {
  fetchReportIFP();
});

watch(
  () => [filterDate.value.month, filterDate.value.year],
  ([m, y]) => {
    const now = new Date();
    const month = m ? String(m).padStart(2, "0") : String(now.getMonth() + 1).padStart(2, "0");
    const year = y ? String(y) : String(now.getFullYear());

    filterDate.value.month = month;
    filterDate.value.year = year;
    filterDate.value.period = `${year}-${month}`;
    filterDate.value.period2 = `${year}${month}`;
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
                <option v-for="i in 5" :key="i" :value="new Date().getFullYear() - (i - 1)">
                  {{ new Date().getFullYear() - (i - 1) }}
                </option>
              </select>
              <button
                type="button"
                @click="fetchReportIFP()"
                class="flex w-auto items-center gap-2 whitespace-nowrap text-white bg-blue-600 hover:bg-blue-800 font-medium rounded-e-xl text-sm px-4 py-2.5 text-center"
              >
                <SyncOutlined />
                Sync Data
              </button>
            </form>
          </div>
        </div>

        <span class="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 mb-2">
          <SyncOutlined /> V2 — In: Achievement Stamping · Out: Welding Achievement V2
        </span>
      </div>

      <div class="w-full overflow-x-auto mt-4">
        <table class="min-w-full border-collapse">
          <thead>
            <tr>
              <th :colspan="36" class="text-center text-4xl font-bold py-4 text-gray-800 bg-green-100">
                Report Stock IFP V2 Period {{ formatPeriod(filterDate.period) }}
              </th>
            </tr>

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

            <tr class="bg-green-200">
              <th class="px-4 py-2 text-left font-semibold text-gray-700">No</th>
              <th class="px-4 py-2 text-left font-semibold text-gray-700">Action</th>
              <th class="px-4 py-2 text-left font-semibold text-gray-700">Part Number</th>
              <th class="px-4 py-2 text-center font-semibold text-gray-700">Stock Awal</th>
              <th class="px-4 py-2"></th>

              <th v-for="day in 30" :key="day" class="px-2 py-2 text-center font-semibold text-gray-700">
                {{ day.toString().padStart(2, "0") }}
              </th>
              <th v-if="isFullMonth" class="px-2 py-2 text-center font-semibold text-gray-700">31</th>
            </tr>
          </thead>

          <tbody>
            <template v-for="(item, index) in paginatedIFPItems" :key="item.part_number">
              <!-- ROW 1: STOCK AWAL -->
              <tr class="border-b bg-white hover:bg-gray-100 transition">
                <td class="text-center font-semibold p-2 border border-solid !border-gray-400" rowspan="3">
                  {{ index + 1 }}
                </td>
                <td class="p-2 border border-solid !border-gray-400" rowspan="3">
                  <button
                    @click="loadDataStockAwalIfp(item)"
                    class="px-3 py-1 rounded bg-green-500 text-white text-sm flex items-center gap-1 hover:bg-green-600"
                  >
                    <EditFilled />
                    Edit
                  </button>
                </td>
                <td class="p-2 border border-solid !border-gray-400 font-medium" rowspan="3">
                  {{ item.part_number }}
                </td>
                <td class="p-2 border border-solid !border-gray-400 font-medium text-center" rowspan="3">
                  {{ item.stock_awal }}
                </td>
                <td class="p-2 border border-solid !border-gray-400 bg-gray-100 font-semibold text-center">In</td>

                <td v-for="day in 30" :key="'in-' + day" class="py-2 text-center border !border-gray-400">
                  {{ item['in_' + day.toString().padStart(2, '0')] || 0 }}
                </td>
                <td v-if="isFullMonth" class="py-2 text-center border !border-gray-400">
                  {{ item.in_31 || 0 }}
                </td>
              </tr>

              <!-- ROW 2: OUT -->
              <tr class="border-b bg-white hover:bg-gray-100 transition">
                <td class="p-2 border border-solid !border-gray-400 bg-gray-100 font-semibold text-center">Out</td>
                <td v-for="day in 30" :key="'out-' + day" class="py-2 text-center border !border-gray-400">
                  {{ item['out_' + day.toString().padStart(2, '0')] || 0 }}
                </td>
                <td v-if="isFullMonth" class="py-2 text-center border !border-gray-400">
                  {{ item.out_31 || 0 }}
                </td>
              </tr>

              <!-- ROW 3: STOCK AKHIR -->
              <tr class="border-b bg-white hover:bg-gray-100 transition">
                <td class="p-2 border border-solid !border-gray-400 bg-gray-100 font-semibold text-center">Stock Akhir</td>
                <td
                  v-for="day in 30"
                  :key="'stock-akhir-' + day"
                  class="py-2 text-center border !border-gray-400 font-semibold"
                  :class="stockAkhir(item, day) < 0 ? 'text-red-600' : ''"
                >
                  {{ stockAkhir(item, day) }}
                </td>
                <td
                  v-if="isFullMonth"
                  class="py-2 text-center border !border-gray-400 font-semibold"
                  :class="stockAkhir(item, 31) < 0 ? 'text-red-600' : ''"
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
                  <div class="flex items-center gap-2">
                    <span class="text-sm text-gray-700">Rows per page:</span>
                    <select v-model="pagination.limit" class="border rounded px-4 py-1 text-sm">
                      <option :value="8">8</option>
                      <option :value="15">15</option>
                      <option :value="25">25</option>
                      <option :value="50">50</option>
                      <option :value="100">100</option>
                    </select>
                  </div>

                  <div class="text-sm text-gray-600 text-center">
                    Showing
                    <span class="font-semibold">{{ startItem }}</span>
                    to
                    <span class="font-semibold">{{ endItem }}</span>
                    of
                    <span class="font-semibold">{{ totalItems }}</span>
                    entries
                  </div>

                  <div class="flex items-center gap-1">
                    <button @click="previousPage" :disabled="pagination.page === 1" class="px-3 py-1 border rounded disabled:opacity-40">
                      Prev
                    </button>
                    <span class="px-3 py-1 border rounded bg-white">{{ pagination.page }}</span>
                    <button @click="nextPage" :disabled="endItem >= totalItems" class="px-3 py-1 border rounded disabled:opacity-40">
                      Next
                    </button>
                  </div>
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  </div>

  <!-- Dialog Edit Stock Awal -->
  <div v-if="dialog.formIfp" class="fixed inset-0 z-9999 flex items-center justify-center bg-black/50">
    <div class="w-full max-w-2xl bg-white rounded-lg shadow-lg">
      <div class="flex items-center justify-between px-5 py-3 border-b">
        <h3 class="text-lg font-semibold">Edit Stock Awal IFP {{ formIfp.part_number }}</h3>
        <button @click="dialog.formIfp = false" class="text-gray-400 hover:text-gray-700">✕</button>
      </div>

      <div class="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h1 class="mb-1 font-medium">Part Number</h1>
          <div class="relative">
            <EditFilled class="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              v-model="formIfp.part_number"
              type="text"
              placeholder="Part Number"
              class="w-full bg-gray-50 pl-8 p-2 border rounded focus:ring-2 focus:ring-gray-400"
            />
          </div>
        </div>

        <div>
          <h1 class="mb-1 font-medium">Stock Awal</h1>
          <div class="relative">
            <EditFilled class="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
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

      <div class="flex justify-end gap-2 px-5 py-3 border-t">
        <button @click="dialog.formIfp = false" class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded hover:bg-gray-300">
          Close
        </button>
        <button @click="onUpdateStockAwal()" class="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700">
          Save
        </button>
      </div>
    </div>
  </div>
</template>
