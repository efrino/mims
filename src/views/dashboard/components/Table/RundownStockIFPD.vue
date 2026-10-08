<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { storeToRefs } from 'pinia';
import moment from 'moment';

import { useUtilityStore } from '@/pinia/utility';

import type { CustomerStock, StockIFPD } from '@/types/Admin/RundownStock';
import { useRundownStock } from '@/stores/Admin/RundownStock';

type RowSpanMap = Record<string, number>;

const rundownStockStore = useRundownStock();
const utilityStore = useUtilityStore();

const { stockIFPD, totalStockIFPD, loading, error, dialog, stockDetail } = storeToRefs(rundownStockStore);

const { getRundownStockIFPD, getRundownStockDetailIFPD } = rundownStockStore;
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
    modelDetail: 'PICK UP',
    carName: ''
  },
  {
    name: 'ADM PLANT 1',
    ZCUST: 'ADM1',
    alias: 'SAP',
    group: '1',
    model: 'D40D',
    modelDetail: 'VAN',
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
    modelDetail: 'PICK UP',
    carName: ''
  },
  {
    name: 'ADM PLANT 4',
    ZCUST: 'ADM4',
    alias: 'SAP',
    group: '1',
    model: 'D40D',
    modelDetail: 'VAN',
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
    name: 'ADM SUNTER CKD',
    ZCUST: 'DCWA',
    alias: 'SAP',
    group: '1',
    model: 'D40D',
    modelDetail: 'VAN',
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
    model: 'TD',
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
    name: 'HMMI',
    ZCUST: 'HMMI',
    alias: 'HMMI',
    group: '2',
    model: 'SU2ID',
    modelDetail: 'RHD',
    carName: ''
  },
  {
    name: 'HMMI',
    ZCUST: 'HMMI',
    alias: 'HMMI',
    group: '2',
    model: 'SU2ID',
    modelDetail: 'LHD',
    carName: ''
  },
  {
    name: 'HMMI',
    ZCUST: 'HMMI',
    alias: 'HMMI',
    group: '2',
    model: 'KS',
    modelDetail: 'RHD',
    carName: ''
  },
  {
    name: 'HMMI',
    ZCUST: 'HMMI',
    alias: 'HMMI',
    group: '2',
    model: 'KS',
    modelDetail: 'LHD',
    carName: ''
  }
  // {
  //   name: 'TOTAL',
  //   ZCUST: 'TOTAL',
  //   alias: 'TOTAL',
  //   group: '2',
  //   model: '',
  //   modelDetail: null,
  //   carName: ''
  // }
]);

const rowspanMap = ref<RowSpanMap>({});

function stockInfo(model: string, customer: string, modelDetail: string | null, key: keyof StockIFPD): string {
  const found = stockIFPD.value.find(
    (item) => item.model === model && item.customer.toUpperCase() === customer && item.project_detail === modelDetail
  );

  return found ? String(found[key] ?? '0') : '0';
}

function shouldDisplayCustomerName(index: number, currentName: string): boolean {
  return index === 0 || customers.value[index - 1].name !== currentName;
}

function calculateRowSpan(): void {
  const map: RowSpanMap = {};

  customers.value.forEach((customer, index) => {
    if (shouldDisplayCustomerName(index, customer.name)) {
      let rowCount = 1;

      for (let i = index + 1; i < customers.value.length; i++) {
        if (customers.value[i].name === customer.name) {
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

const statusColorClass = (type: string | undefined) => {
  switch (type) {
    case 'kritis':
      return 'text-red-500 font-bold';
    case 'over':
      return 'text-blue-400 font-bold';
    case 'safe':
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

  await getRundownStockIFPD();

  timer.value = setInterval(() => {
    getRundownStockIFPD();
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
          <th rowspan="3" class="border border-[#004e72] px-2 py-4">CUSTOMER</th>
          <th rowspan="3" class="border border-[#004e72] px-2 py-4">MODEL</th>
          <th rowspan="3" class="border border-[#004e72] px-2 py-4 text-left">CAR NAME</th>
          <th colspan="4" class="border border-[#004e72] px-2 py-1 text-sm">TYPE</th>
          <th rowspan="3" class="border border-[#004e72] px-2 py-4">&Sigma; ITEM</th>
          <th rowspan="3" class="border border-[#004e72] px-2 py-4">STD<br />16 JAM</th>
          <th rowspan="3" class="border border-[#004e72] px-2 py-4">OVER</th>
          <th rowspan="3" class="border border-[#004e72] px-2 py-4">KRITIS<br />&lt; 12 JAM</th>
          <th rowspan="3" class="border border-[#004e72] px-2 py-4">&Sigma; ITEM</th>
          <th rowspan="3" class="border border-[#004e72] px-2 py-4 max-w-25">SHIFT ASSEMBLY CUSTOMER</th>
          <th rowspan="3" class="border border-[#004e72] px-2 py-4">CYCLE DELV</th>
          <th colspan="4" class="border border-[#004e72] px-2 py-1 text-sm">PACKING</th>
        </tr>

        <tr class="bg-[#042c44] text-white font-bold border-b border-[#004e72]">
          <th rowspan="2" class="border border-[#004e72] px-2 py-2 font-semibold text-[12px]">SINGLE</th>
          <th rowspan="2" class="border border-[#004e72] px-2 py-2 font-semibold text-[12px]">SEMI S/A</th>
          <th rowspan="2" class="border border-[#004e72] px-2 py-2 font-semibold text-[12px]">S/A</th>
          <th rowspan="2" class="border border-[#004e72] px-2 py-2 font-semibold text-[12px]">MODULE</th>
          <th colspan="2" class="border border-[#004e72] px-2 py-2">PALLET</th>
          <th colspan="2" class="border border-[#004e72] px-2 py-2">POLLYBOX</th>
        </tr>
        <tr class="bg-[#042c44] text-white font-bold border-b border-[#004e72] text-[12px]">
          <!-- <th colspan="14" class="border-r border-[#004e72]"></th> -->
          <th class="border border-[#004e72] px-2 py-1">PCS</th>
          <th class="border border-[#004e72] px-2 py-1">ITEM</th>
          <th class="border border-[#004e72] px-2 py-1">PCS</th>
          <th class="border border-[#004e72] px-2 py-1">ITEM</th>
        </tr>
      </thead>

      <tbody class="divide-y divide-[#003b57] text-gray-50">
        <tr v-for="(customer, index) in customers" :key="customer.name + '.' + index">
          <td
            v-if="shouldDisplayCustomerName(index, customer.name)"
            :rowspan="getRowSpan(customer.name)"
            class="border border-[#004e72] font-semibold px-2 text-nowrap"
          >
            {{ customer.name }}
          </td>
          <td class="border border-[#004e72] px-2 py-1.5">{{ customer.model }}</td>
          <td class="border border-[#004e72] px-2 py-1.5 text-left text-gray-200 text-nowrap">
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
              {{ formatNumber(stockInfo(customer.model, customer.name, customer.modelDetail, 'ifpd_single')) }}
            </span>
          </td>
          <td class="border border-[#004e72] px-2">
            <span class="tabular-nums font-family-roboto text-right inline-block mx-auto w-7.5">
              {{ formatNumber(stockInfo(customer.model, customer.name, customer.modelDetail, 'ifpd_semi_sa')) }}
            </span>
          </td>
          <td class="border border-[#004e72] px-2">
            <span class="tabular-nums font-family-roboto text-right inline-block mx-auto w-7.5">
              {{ formatNumber(stockInfo(customer.model, customer.name, customer.modelDetail, 'ifpd_sa')) }}
            </span>
          </td>
          <td class="border border-[#004e72] px-2">
            <span class="tabular-nums font-family-roboto text-right inline-block mx-auto w-7.5">
              {{ formatNumber(stockInfo(customer.model, customer.name, customer.modelDetail, 'ifpd_module')) }}
            </span>
          </td>
          <td class="border border-[#004e72] px-2">
            <span class="tabular-nums font-family-roboto text-right inline-block mx-auto w-7.5">
              {{ formatNumber(stockInfo(customer.model, customer.name, customer.modelDetail, 'total')) }}
            </span>
          </td>
          <td
            class="border border-[#004e72] px-2 text-[#4ade80] font-bold cursor-pointer hover:bg-gray-300/15"
            @click="getRundownStockDetailIFPD(customer.name, customer.model, 'safe', customer.modelDetail)"
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
            @click="getRundownStockDetailIFPD(customer.name, customer.model, 'over', customer.modelDetail)"
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
            @click="getRundownStockDetailIFPD(customer.name, customer.model, 'kritis', customer.modelDetail)"
          >
            <span class="tabular-nums font-family-roboto text-right inline-block mx-auto w-7.5">
              {{ formatNumber(stockInfo(customer.model, customer.name, customer.modelDetail, 'kritis')) }}
            </span>
          </td>
          <td
            class="border border-[#004e72] px-2 cursor-pointer hover:bg-gray-300/15"
            @click="getRundownStockDetailIFPD(customer.name, customer.model, 'all', customer.modelDetail)"
          >
            <span class="tabular-nums font-family-roboto text-right inline-block mx-auto w-7.5">
              {{ formatNumber(stockInfo(customer.model, customer.name, customer.modelDetail, 'total')) }}
            </span>
          </td>
          <td class="border border-[#004e72] px-2">
            <span class="tabular-nums font-family-roboto text-right inline-block mx-auto w-3">
              {{ stockInfo(customer.model, customer.name, customer.modelDetail, 'shift') }}
            </span>
          </td>
          <td class="border border-[#004e72] px-2">
            <span class="tabular-nums font-family-roboto text-right inline-block mx-auto w-6">
              {{ stockInfo(customer.model, customer.name, customer.modelDetail, 'cycle_delv') ?? '0' }}
            </span>
          </td>
          <td class="border border-[#004e72] px-2 text-right">
            <span class="tabular-nums font-family-roboto text-right inline-block mx-auto w-13">
              {{ formatNumber(stockInfo(customer.model, customer.name, customer.modelDetail, 'pcs_pallet')) }}
            </span>
          </td>
          <td class="border border-[#004e72] px-2 text-right">
            <span class="tabular-nums font-family-roboto text-right inline-block mx-auto w-10">
              {{ formatNumber(stockInfo(customer.model, customer.name, customer.modelDetail, 'pallet')) }}
            </span>
          </td>
          <td class="border border-[#004e72] px-2 text-right">
            <span class="tabular-nums font-family-roboto text-right inline-block mx-auto w-13">
              {{ formatNumber(stockInfo(customer.model, customer.name, customer.modelDetail, 'pcs_polybox')) }}
            </span>
          </td>
          <td class="border border-[#004e72] px-2 text-right">
            <span class="tabular-nums font-family-roboto text-right inline-block mx-auto w-10">
              {{ formatNumber(stockInfo(customer.model, customer.name, customer.modelDetail, 'pallet')) }}
            </span>
          </td>
        </tr>
      </tbody>
      <tfoot>
        <tr class="bg-[#020f1c] font-bold text-white border-t-2 border-[#004e72]">
          <td colspan="3" class="border border-[#004e72] px-4 py-3 text-center tracking-widest text-sm">{{ totalStockIFPD.customer }}</td>
          <td class="border border-[#004e72] px-2">
            <span class="text-right inline-block mx-auto w-7.5">{{ formatNumber(totalStockIFPD.ifpd_single) }}</span>
          </td>
          <td class="border border-[#004e72] px-2">
            <span class="text-right inline-block mx-auto w-7.5">{{ formatNumber(totalStockIFPD.ifpd_semi_sa) }}</span>
          </td>
          <td class="border border-[#004e72] px-2">
            <span class="text-right inline-block mx-auto w-7.5">{{ formatNumber(totalStockIFPD.ifpd_sa) }}</span>
          </td>
          <td class="border border-[#004e72] px-2">
            <span class="text-right inline-block mx-auto w-7.5">{{ formatNumber(totalStockIFPD.ifpd_module) }}</span>
          </td>
          <td class="border border-[#004e72] px-2 text-[#e2e8f0]">
            <span class="text-right inline-block mx-auto w-8">{{ formatNumber(totalStockIFPD.total) }}</span>
          </td>
          <td class="border border-[#004e72] px-2 text-[#4ade80]">
            <span class="text-right inline-block mx-auto w-8">{{ formatNumber(totalStockIFPD.safe) }}</span>
          </td>
          <td class="border border-[#004e72] px-2 text-[#38bdf8]">
            <span class="text-right inline-block mx-auto w-8">{{ formatNumber(totalStockIFPD.over) }}</span>
          </td>
          <td class="border border-[#004e72] px-2 text-[#f87171]">
            <span class="text-right inline-block mx-auto w-8">{{ formatNumber(totalStockIFPD.kritis) }}</span>
          </td>
          <td class="border border-[#004e72] px-2 text-[#e2e8f0]">
            <span class="text-right inline-block mx-auto w-8">{{ formatNumber(totalStockIFPD.total) }}</span>
          </td>
          <td class="border border-[#004e72] px-2 text-gray-500">-</td>
          <td class="border border-[#004e72] px-2 text-gray-500">-</td>
          <td class="border border-[#004e72] px-2 text-right">
            <span class="text-right inline-block mx-auto w-13">{{ formatNumber(totalStockIFPD.pcs_pallet) }}</span>
          </td>
          <td class="border border-[#004e72] px-2 text-right">
            <span class="text-right inline-block mx-auto w-10">{{ formatNumber(totalStockIFPD.pallet) }}</span>
          </td>
          <td class="border border-[#004e72] px-2 text-right">
            <span class="text-right inline-block mx-auto w-13">{{ formatNumber(totalStockIFPD.pcs_polybox) }}</span>
          </td>
          <td class="border border-[#004e72] px-2 text-right">
            <span class="text-right inline-block mx-auto w-10">{{ formatNumber(totalStockIFPD.pallet) }}</span>
          </td>
        </tr>
      </tfoot>
    </table>
  </div>
  <div v-if="dialog.detailItemIFPD" class="fixed inset-0 z-1200 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
    <div class="flex flex-col w-full max-w-5xl max-h-[90vh] rounded-2xl bg-zinc-900 text-white shadow-2xl border border-zinc-800">
      <div class="p-6 pb-4">
        <h3 class="text-xl font-bold uppercase tracking-wide">
          Stock
          <span :class="statusColorClass(stockDetail.IFPD.type)">
            {{ stockDetail.IFPD.type }}
          </span>
          Model {{ stockDetail.IFPD.model }} Customer {{ stockDetail.IFPD.customer }}
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
              <th v-if="stockDetail.IFPD.type === 'all'" class="p-1 border border-zinc-700">Status</th>
              <th v-if="stockDetail.IFPD.project_detail" class="p-1 border border-zinc-700">Sub Model</th>
              <th class="p-1 border border-zinc-700">Next Process</th>
            </tr>
          </thead>

          <tbody class="text-sm divide-y divide-zinc-700">
            <tr v-if="!stockDetail.IFPD.items || stockDetail.IFPD.items.length === 0">
              <td colspan="9" class="p-8 text-center text-zinc-400 font-medium tracking-wider border border-zinc-700 rounded-b-xl">
                NO DATA
              </td>
            </tr>

            <tr v-for="(item, index) in stockDetail.IFPD.items" :key="index" class="hover:bg-zinc-800/30 transition-colors">
              <td class="p-1 border border-zinc-700 font-medium text-zinc-400">
                {{ index + 1 }}
              </td>
              <td class="p-1 border border-zinc-700">{{ item.MATNR }}</td>
              <td class="p-1 border border-zinc-700">{{ item.BISMT }}</td>
              <td class="p-1 border border-zinc-700">{{ item.ZPLNPH }}</td>
              <td class="p-1 border border-zinc-700">{{ item.LABST }}</td>
              <td class="p-1 border border-zinc-700">
                <b>{{ item.ZPLNPH === 0 && item.ZSTRENGTH === 0 ? '-' : item.ZSTRENGTH }}</b>
              </td>
              <td
                v-if="stockDetail.IFPD.type === 'all'"
                :class="statusColorClass(item.type)"
                class="p-1 border border-zinc-700 uppercase font-semibold"
              >
                {{ item.type }}
              </td>
              <td v-if="stockDetail.IFPD.project_detail" class="p-1 border border-zinc-700">
                {{ item.project_detail }}
              </td>
              <td class="p-1 border border-zinc-700 text-zinc-300">
                {{ item.REMARK }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="py-2 px-4 bg-zinc-800/40 flex justify-end gap-2 rounded-b-2xl">
        <button
          @click="dialog.detailItemIFPD = false"
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
