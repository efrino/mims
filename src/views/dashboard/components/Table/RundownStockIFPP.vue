<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { storeToRefs } from 'pinia';
import moment from 'moment';

import { useUtilityStore } from '@/pinia/utility';

import type { CustomerStock, StockIFPP } from '@/types/Admin/RundownStock';
import { useRundownStock } from '@/stores/Admin/RundownStock';

type RowSpanMap = Record<string, number>;

const rundownStockStore = useRundownStock();
const utilityStore = useUtilityStore();

const { stockIFPPIn, stockIFPPOut, totalStockIFPPIn, totalStockIFPPOut, loading, error, dialog, stockDetail } =
  storeToRefs(rundownStockStore);

const { getRundownStockIFPP, getRundownStockDetailIFPP } = rundownStockStore;
const { formatDecimaltoNumberRoundDown } = utilityStore;

const id = ref('');

const waktu = ref<string>('');
const tanggal = ref<string>('');

const interval = ref<ReturnType<typeof setInterval> | null>(null);
const timer = ref<ReturnType<typeof setInterval> | null>(null);

const customers = ref<CustomerStock[]>([
  {
    name: 'ADM PLANT 1',
    ZCUST: 'ADM1',
    alias: 'SAP',
    group: '1',
    model: 'D40D',
    modelDetail: null,
    carName: ''
  },

  {
    name: 'ADM PLANT 4',
    ZCUST: 'ADM4',
    alias: 'SAP',
    group: '1',
    model: 'D14N',
    modelDetail: null,
    carName: ''
  },
  {
    name: 'ADM PLANT 4',
    ZCUST: 'ADM4',
    alias: 'SAP',
    group: '1',
    model: 'D40D',
    modelDetail: null,
    carName: ''
  },
  {
    name: 'ADM PLANT 5',
    ZCUST: 'ADM5',
    alias: 'KAP',
    group: '1',
    model: 'D26A',
    modelDetail: null,
    carName: ''
  },
  {
    name: 'ADM PLANT 5',
    ZCUST: 'ADM5',
    alias: 'KAP',
    group: '1',
    model: 'D30D',
    modelDetail: null,
    carName: ''
  },
  {
    name: 'ADM PLANT 5',
    ZCUST: 'ADM5',
    alias: 'KAP',
    group: '1',
    model: 'D55L',
    modelDetail: null,
    carName: ''
  },
  {
    name: 'ADM PLANT 5',
    ZCUST: 'ADM5',
    alias: 'KAP',
    group: '1',
    model: 'D74A',
    modelDetail: null,
    carName: ''
  },
  {
    name: 'TMMIN',
    ZCUST: 'TMMIN',
    alias: 'TMMIN',
    group: '1',
    model: 'D26A',
    modelDetail: null,
    carName: ''
  },
  {
    name: 'TMMIN',
    ZCUST: 'TMMIN',
    alias: 'TMMIN',
    group: '1',
    model: 'D03B',
    modelDetail: null,
    carName: ''
  },
  {
    name: 'MMKI',
    ZCUST: 'MMKI',
    alias: 'MMKI',
    group: '2',
    model: 'SL',
    modelDetail: null,
    carName: ''
  },
  {
    name: 'MKM',
    ZCUST: 'MKM',
    alias: 'MKM',
    group: '2',
    model: 'SL',
    modelDetail: null,
    carName: ''
  },
  {
    name: 'MKM',
    ZCUST: 'MKM',
    alias: 'MKM',
    group: '2',
    model: 'TD',
    modelDetail: null,
    carName: ''
  },

  {
    name: 'HMMI',
    ZCUST: 'HMMI',
    alias: 'HMMI',
    group: '2',
    model: 'SU2ID',
    modelDetail: null,
    carName: ''
  },

  {
    name: 'HMMI',
    ZCUST: 'HMMI',
    alias: 'HMMI',
    group: '2',
    model: 'KS',
    modelDetail: null,
    carName: ''
  }
]);

const rowspanMap = ref<RowSpanMap>({});

const props = defineProps({
  location: String
});

function stockInfo(model: string, customer: string, modelDetail: string | null, key: keyof StockIFPP): string {
  const found =
    props.location === 'IN'
      ? stockIFPPIn.value.find((item: StockIFPP) => item.model === model && item.customer.toUpperCase() === customer)
      : stockIFPPOut.value.find(
          (item: StockIFPP) => item.model === model && item.customer.toUpperCase() === customer && item.customer != 'TMMIN'
        );

  return found ? String(found[key] ?? '0') : '0';
}

function shouldDisplayCustomerName(index: number, currentName: string): boolean {
  return index === 0 || customersFiltered.value[index - 1].name !== currentName;
}

function calculateRowSpan(): void {
  const map: RowSpanMap = {};

  customersFiltered.value.forEach((customer, index) => {
    if (shouldDisplayCustomerName(index, customer.name)) {
      let rowCount = 1;

      for (let i = index + 1; i < customersFiltered.value.length; i++) {
        if (customersFiltered.value[i].name === customer.name) {
          rowCount++;
        } else {
          break;
        }
      }

      map[customer.name] = rowCount;
    }
  });

  rowspanMap.value = map;
}

function getRowSpan(customerName: string): number {
  return rowspanMap.value[customerName] ?? 1;
}

function formatSapDate(str: string | null | undefined): string {
  if (!str || str === '00000000') {
    return '';
  }

  return new Date(Number(str.slice(0, 4)), Number(str.slice(4, 6)) - 1, Number(str.slice(6, 8))).toLocaleDateString('id-ID');
}

function formatNumber(num: number | string): string {
  return new Intl.NumberFormat('id-ID').format(Number(num));
}

const customersFiltered = computed(() => {
  if (props.location === 'IN') {
    return customers.value;
  }
  return customers.value.filter((customer) => customer.name !== 'TMMIN');
});

const statusColorClass = (type: string | undefined) => {
  switch (true) {
    case type?.includes('kritis'):
      return 'text-red-500 font-bold';
    case type?.includes('over'):
      return 'text-blue-400 font-bold';
    case type?.includes('safe'):
      return 'text-green-400 font-bold';
    default:
      return 'text-zinc-400';
  }
};
onMounted(async () => {
  interval.value = setInterval(() => {
    waktu.value = moment().format('HH:mm:ss');
    tanggal.value = moment().format('DD MMMM YYYY');
  }, 1000);

  calculateRowSpan();

  await getRundownStockIFPP(props.location);

  timer.value = setInterval(() => {
    getRundownStockIFPP(props.location);
  }, 300000);
});

onBeforeUnmount(() => {
  if (interval.value) {
    clearInterval(interval.value);
  }

  if (timer.value) {
    clearInterval(timer.value);
  }
});
</script>
<template>
  <div class="w-full overflow-x-auto bg-[#031525] text-sm font-sans tracking-wide text-white rounded-lg border border-[#004e72]">
    <table class="w-full min-w-300 border-collapse border border-[#004e72] text-center uppercase">
      <thead>
        <tr class="bg-[#042c44] text-white font-bold border-b border-[#004e72]">
          <th rowspan="2" class="border border-[#004e72] px-2 py-4">CUSTOMER</th>
          <th rowspan="2" class="border border-[#004e72] px-2 py-4">MODEL</th>
          <th rowspan="2" class="border border-[#004e72] px-2 py-4 text-left">CAR NAME</th>
          <th rowspan="2" class="border border-[#004e72] px-2 py-4">&Sigma; ITEM</th>
          <!-- <th rowspan="1" :colspan="location === 'IN' ? 3 : 2" class="border border-[#004e72] px-2 py-4 text-[#4ade80]">STD</th> -->
          <th rowspan="2" class="border border-[#004e72] px-2 py-4">STD</th>
          <th rowspan="2" class="border border-[#004e72] px-2 py-4">OVER</th>
          <th rowspan="2" class="border border-[#004e72] px-2 py-4">KRITIS</th>
          <th rowspan="2" class="border border-[#004e72] px-2 py-4">&Sigma; ITEM</th>
        </tr>

        <!-- <tr class="bg-[#042c44] text-[#7dd3fc] font-bold border-b border-[#004e72]">
          <th v-if="location === 'IN'" rowspan="1" class="border border-[#004e72] px-2 py-2 font-semibold text-[12px]">12 JAM</th>
          <th rowspan="1" class="border border-[#004e72] px-2 py-2 font-semibold text-[12px]">16 JAM</th>
          <th rowspan="1" class="border border-[#004e72] px-2 py-2 font-semibold text-[12px]">20 JAM</th>
        </tr> -->
      </thead>

      <tbody class="divide-y divide-[#003b57] text-gray-50">
        <tr v-for="(customer, index) in customersFiltered" :key="customer.name + '.' + index">
          <td
            v-if="shouldDisplayCustomerName(index, customer.name)"
            :rowspan="getRowSpan(customer.name)"
            class="border border-[#004e72] font-semibold px-2 text-nowrap"
          >
            {{ customer.name }}
          </td>
          <td class="border border-[#004e72] px-2 py-2">{{ customer.model }}</td>
          <td class="border border-[#004e72] px-2 py-2 text-left text-gray-200 text-nowrap max-w-25">
            {{
              stockInfo(customer.model, customer.name, customer.modelDetail, 'model_name') == '0'
                ? customer.carName
                : stockInfo(customer.model, customer.name, customer.modelDetail, 'model_name') +
                  ' ' +
                  (customer.modelDetail ? '(' + customer.modelDetail + ')' : '')
            }}
          </td>
          <td class="border border-[#004e72] px-2">
            <span class="tabular-nums font-family-roboto text-right inline-block mx-auto w-7.5">
              {{ formatNumber(stockInfo(customer.model, customer.name, customer.modelDetail, 'total')) }}
            </span>
          </td>
          <td
            class="border border-[#004e72] px-2 text-[#4ade80] font-bold cursor-pointer hover:bg-gray-300/15"
            @click="getRundownStockDetailIFPP(props.location, customer.name, customer.model, 'safe')"
          >
            <span class="tabular-nums font-family-roboto text-right inline-block mx-auto w-7.5">
              {{ formatNumber(stockInfo(customer.model, customer.name, customer.modelDetail, 'safe')) }}
            </span>
          </td>
          <td
            class="border border-[#004e72] px-2 text-[#38bdf8] cursor-pointer hover:bg-gray-300/15"
            :class="
              formatNumber(stockInfo(customer.model, customer.name, customer.modelDetail, 'over')) === '0'
                ? 'text-gray-400'
                : 'text-[#38bdf8]'
            "
            @click="getRundownStockDetailIFPP(props.location, customer.name, customer.model, 'over')"
          >
            <span class="tabular-nums font-family-roboto text-right inline-block mx-auto w-7.5">
              {{ formatNumber(stockInfo(customer.model, customer.name, customer.modelDetail, 'over')) }}
            </span>
          </td>
          <td
            class="border border-[#004e72] px-2 text-[#ef4444] cursor-pointer hover:bg-gray-300/15"
            :class="
              formatNumber(stockInfo(customer.model, customer.name, customer.modelDetail, 'kritis')) === '0'
                ? 'text-gray-400'
                : 'text-[#ef4444]'
            "
            @click="getRundownStockDetailIFPP(props.location, customer.name, customer.model, 'kritis')"
          >
            <span class="tabular-nums font-family-roboto text-right inline-block mx-auto w-7.5">
              {{ formatNumber(stockInfo(customer.model, customer.name, customer.modelDetail, 'kritis')) }}
            </span>
          </td>
          <td
            class="border border-[#004e72] px-2 cursor-pointer hover:bg-gray-300/15"
            @click="getRundownStockDetailIFPP(props.location, customer.name, customer.model, 'all')"
          >
            <span class="tabular-nums font-family-roboto text-right inline-block mx-auto w-7.5">
              {{ formatNumber(stockInfo(customer.model, customer.name, customer.modelDetail, 'total')) }}
            </span>
          </td>
        </tr>
      </tbody>
      <tfoot>
        <tr class="bg-[#020f1c] font-bold text-white border-t-2 border-[#004e72]">
          <td colspan="3" class="border border-[#004e72] px-4 py-3 text-center tracking-widest text-sm">
            {{ location === 'IN' ? totalStockIFPPIn.customer : totalStockIFPPOut.customer }}
          </td>
          <td class="border border-[#004e72] px-2 text-[#e2e8f0]">
            <span class="text-right inline-block mx-auto w-8">{{
              location === 'IN' ? formatNumber(totalStockIFPPIn.total) : formatNumber(totalStockIFPPOut.total)
            }}</span>
          </td>
          <td class="border border-[#004e72] px-2 text-[#4ade80]">
            <span class="text-right inline-block mx-auto w-8">{{
              location === 'IN' ? formatNumber(totalStockIFPPIn.safe) : formatNumber(totalStockIFPPOut.safe)
            }}</span>
          </td>
          <td class="border border-[#004e72] px-2 text-[#38bdf8]">
            <span class="text-right inline-block mx-auto w-8">{{
              location === 'IN' ? formatNumber(totalStockIFPPIn.over) : formatNumber(totalStockIFPPOut.over)
            }}</span>
          </td>
          <td class="border border-[#004e72] px-2 text-[#f87171]">
            <span class="text-right inline-block mx-auto w-8">{{
              location === 'IN' ? formatNumber(totalStockIFPPIn.kritis) : formatNumber(totalStockIFPPOut.kritis)
            }}</span>
          </td>
          <td class="border border-[#004e72] px-2 text-[#e2e8f0]">
            <span class="text-right inline-block mx-auto w-8">{{
              location === 'IN' ? formatNumber(totalStockIFPPIn.total) : formatNumber(totalStockIFPPOut.total)
            }}</span>
          </td>
        </tr>
      </tfoot>
    </table>
  </div>
  <div v-if="dialog.detailItemIFPP" class="fixed inset-0 z-1200 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
    <div class="flex flex-col w-full max-w-5xl max-h-[90vh] rounded-2xl bg-zinc-900 text-white shadow-2xl border border-zinc-800">
      <div class="p-6 pb-4">
        <h3 class="text-xl font-bold uppercase tracking-wide">
          Stock
          <span :class="statusColorClass(stockDetail.IFPP.type)">
            {{ stockDetail.IFPP.type }}
          </span>
          Model {{ stockDetail.IFPP.model }} Customer {{ stockDetail.IFPP.customer }}
        </h3>
      </div>

      <hr class="border-zinc-700" />

      <div class="p-3 overflow-x-auto flex-1 rounded-md">
        <table class="w-full border-collapse border border-[#004e72] text-center uppercase min-w-200 bg-[#031525]">
          <thead>
            <tr class="bg-[#042c44] text-zinc-300 text-sm font-semibold uppercase">
              <th class="p-1 border border-zinc-700">No</th>
              <th class="p-1 border border-zinc-700">Part Number</th>
              <th class="p-1 border border-zinc-700">Job Number</th>
              <th class="p-1 border border-zinc-700">Keb / day</th>
              <th class="p-1 border border-zinc-700">Stock</th>
              <th class="p-1 border border-zinc-700">Strength</th>
              <th v-if="stockDetail.IFPP.type === 'all'" class="p-1 border border-zinc-700">Status</th>
              <th class="p-1 border border-zinc-700">Min</th>
              <th class="p-1 border border-zinc-700">Max</th>
            </tr>
          </thead>

          <tbody class="text-sm divide-y divide-zinc-700">
            <tr v-if="!stockDetail.IFPP.items || stockDetail.IFPP.items.length === 0">
              <td colspan="9" class="p-8 text-center text-zinc-400 font-medium tracking-wider border border-zinc-700 rounded-b-xl">
                NO DATA
              </td>
            </tr>

            <tr v-for="(item, index) in stockDetail.IFPP.items" :key="index" class="hover:bg-zinc-800/30 transition-colors">
              <td class="p-1 border border-zinc-700 font-medium text-zinc-400">
                {{ index + 1 }}
              </td>
              <td class="p-1 border border-zinc-700">{{ item.part_number }}</td>
              <td class="p-1 border border-zinc-700">{{ item.job_number }}</td>
              <td class="p-1 border border-zinc-700">{{ item.plan_day }}</td>
              <td class="p-1 border border-zinc-700">{{ item.stock_conv }}</td>
              <td class="p-1 border border-zinc-700">
                <b>{{ item.plan_day === 0 && item.strength_conv === 0 ? '-' : item.strength_conv }}</b>
              </td>
              <td
                v-if="stockDetail.IFPP.type === 'all'"
                :class="statusColorClass(item.type)"
                class="p-1 border border-zinc-700 uppercase font-semibold"
              >
                {{
                  item.type
                    ? item.type.includes('kritis')
                      ? 'KRITIS'
                      : item.type.includes('over')
                        ? 'OVER'
                        : item.type.includes('safe')
                          ? 'SAFE'
                          : item.type
                    : '-'
                }}
              </td>
              <td class="p-1 border border-zinc-700">
                {{ item.min }}
              </td>
              <td class="p-1 border border-zinc-700 text-zinc-300">
                {{ item.max }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="py-2 px-4 bg-zinc-800/40 flex justify-end gap-2 rounded-b-2xl">
        <button
          @click="dialog.detailItemIFPP = false"
          class="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-900 text-white text-sm font-medium rounded-lg shadow-md transition-all active:scale-95"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
          Close
        </button>
      </div>
    </div>
  </div>
</template>

<style>
.font-family-roboto {
  font-family: Roboto, 'Segoe UI', sans-serif;
}
</style>
