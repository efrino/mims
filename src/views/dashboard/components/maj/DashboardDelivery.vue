<template>
  <div class="px-4">
    <div class="flex justify-between items-center">
      <h2 class="text-xl font-semibold text-gray-800 mr-2">Dashboard Delivery</h2>
      <!-- <button 
        @click="isWhiteTheme = !isWhiteTheme" 
        class="px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors"
        :class="isWhiteTheme ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-800 border-gray-300 shadow-sm'"
      >
        Ubah ke Tema {{ isWhiteTheme ? 'Hitam' : 'Putih' }}
      </button> -->
    </div>

    <div v-if="loading" class="flex justify-center items-center py-10">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>

    <div v-else-if="error" class="flex justify-center items-center py-10">
      <div class="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
        <p class="text-red-600">{{ error }}</p>
        <button @click="loadData" class="mt-2 text-sm text-red-700 underline">Coba Lagi</button>
      </div>
    </div>

    <div v-else class="space-y-6">
      <div
        class="border rounded-xl p-5 shadow-lg transition-all duration-300"
        :class="isWhiteTheme ? 'bg-white text-gray-800 border-gray-200' : 'bg-black text-gray-100 border-gray-800'"
      >
        <div class="text-center mb-4">
          <h3 class="text-base font-black tracking-widest uppercase mb-2" :class="isWhiteTheme ? 'text-gray-900' : 'text-white'">
            CIRCLE DELIVERY — {{ dateToday }}
          </h3>
          <div
            class="flex flex-wrap justify-center gap-x-4 gap-y-2 text-[10px] font-bold uppercase select-none"
            :class="isWhiteTheme ? 'text-gray-500' : 'text-gray-400'"
          >
            <div><span class="text-blue-500 mr-1">P :</span> Plan</div>
            <div><span class="text-cyan-500 mr-1">C :</span> Circle</div>
            <div><span class="text-emerald-500 mr-1">AD :</span> Actual</div>
            <div><span class="text-emerald-500 mr-1">&Sigma;I :</span> Total Item</div>
            <div class="flex items-center gap-1">
              <span class="w-2.5 h-2.5 bg-yellow-400 inline-block rounded-sm animate-pulse border border-yellow-500"></span>
              Current Time
            </div>
            <div class="flex items-center gap-1">
              <span class="w-2.5 h-2.5 bg-blue-950 border border-blue-800 inline-block rounded-sm"></span>
              Circle (Past Time)
            </div>
            <div class="flex items-center gap-1">
              <span class="w-2.5 h-2.5 bg-emerald-600 inline-block rounded-sm"></span>
              Delivery Closed
            </div>
            <div class="flex items-center gap-1">
              <span class="w-2.5 h-2.5 bg-red-600 inline-block rounded-sm"></span>
              Delivery Open
            </div>
          </div>
        </div>

        <div class="overflow-x-auto border rounded-lg" :class="isWhiteTheme ? 'border-gray-200' : 'border-gray-800'">
          <table class="w-full text-center border-collapse min-w-300 text-xs font-mono">
            <thead>
              <tr
                class="font-bold tracking-wider border-b"
                :class="isWhiteTheme ? 'bg-gray-100 text-gray-700 border-gray-200' : 'bg-neutral-900 text-gray-300 border-gray-800'"
              >
                <th colspan="2" class="border-r p-2" :class="isWhiteTheme ? 'border-gray-200' : 'border-gray-800'"></th>
                <th
                  colspan="13"
                  class="border-r p-2"
                  :class="isWhiteTheme ? 'bg-blue-50 text-blue-700 border-gray-200' : 'bg-blue-950/20 text-blue-400 border-gray-800'"
                >
                  DAY SHIFT
                </th>
                <th
                  colspan="11"
                  class="border-r p-2"
                  :class="
                    isWhiteTheme ? 'bg-purple-100 text-purple-700 border-gray-200' : 'bg-purple-950/20 text-purple-400 border-gray-800'
                  "
                >
                  NIGHT SHIFT
                </th>
                <th colspan="2" class="border-r p-2" :class="isWhiteTheme ? 'border-gray-200' : 'border-gray-800'"></th>
              </tr>
            </thead>
            <tbody>
              <template v-for="(cust, cIdx) in circleDeliveryMatrix" :key="cust.name">
                <tr class="border-b" :class="isWhiteTheme ? 'border-gray-200' : 'border-gray-900'">
                  <td
                    rowspan="5"
                    class="font-black text-xs tracking-wider border-r p-3 align-middle max-w-35 whitespace-normal"
                    :class="isWhiteTheme ? 'text-cyan-700 bg-gray-50 border-gray-200' : 'text-cyan-400 bg-neutral-950 border-gray-800'"
                  >
                    {{ cust.name }}
                  </td>
                  <td
                    class="font-bold border-r p-1 w-14"
                    :class="isWhiteTheme ? 'bg-gray-50 text-gray-600 border-gray-200' : 'bg-neutral-900 text-gray-300 border-gray-800'"
                  >
                    JAM
                  </td>
                  <td
                    v-for="(slot, sIdx) in cust.slots"
                    :key="sIdx"
                    :class="[
                      'p-1 font-bold border-r',
                      isWhiteTheme ? 'border-gray-200 text-gray-500' : 'border-gray-900 text-gray-400',
                      getCellBgClass(slot.time, 'JAM', slot, cust.slots)
                    ]"
                  >
                    {{ slot.time }}
                  </td>
                  <td class="font-bold p-1 w-16" :class="isWhiteTheme ? 'bg-gray-50 text-gray-600' : 'bg-neutral-900 text-gray-300'">
                    TOTAL
                  </td>
                </tr>

                <tr class="border-b" :class="isWhiteTheme ? 'border-gray-200' : 'border-gray-900'">
                  <td
                    class="font-bold border-r p-1"
                    :class="isWhiteTheme ? 'bg-gray-50 text-cyan-700 border-gray-200' : 'bg-neutral-900 text-cyan-400 border-gray-800'"
                  >
                    C
                  </td>
                  <td
                    v-for="(slot, sIdx) in cust.slots"
                    :key="sIdx"
                    :class="[
                      'p-1 font-medium border-r',
                      isWhiteTheme ? 'border-gray-200' : 'border-gray-900',
                      getCellBgClass(slot.time, 'C', slot, cust.slots)
                    ]"
                  >
                    {{ slot.c || '-' }}
                  </td>
                  <td class="font-bold p-1" :class="isWhiteTheme ? 'text-cyan-700 bg-gray-50' : 'text-cyan-400 bg-neutral-950'">-</td>
                </tr>

                <tr class="border-b" :class="isWhiteTheme ? 'border-gray-200' : 'border-gray-900'">
                  <td
                    class="font-bold border-r p-1"
                    :class="isWhiteTheme ? 'bg-gray-50 text-blue-700 border-gray-200' : 'bg-neutral-900 text-blue-400 border-gray-800'"
                  >
                    P
                  </td>
                  <td
                    v-for="(slot, sIdx) in cust.slots"
                    :key="sIdx"
                    @click="showSlotDetails(cust.name, slot)"
                    class="hover:bg-gray-900/30 cursor-pointer transition-colors duration-100"
                    :class="[
                      'p-1 font-bold border-r',
                      isWhiteTheme ? 'border-gray-200' : 'border-gray-900',
                      getCellBgClass(slot.time, 'P', slot, cust.slots)
                    ]"
                  >
                    {{ slot.p || '' }}
                  </td>
                  <td class="font-bold p-1 text-xs" :class="isWhiteTheme ? 'text-blue-700 bg-gray-50' : 'text-blue-400 bg-neutral-950'">
                    {{ calculateTotal(cust.slots, 'p') }}
                  </td>
                </tr>

                <tr class="" :class="isWhiteTheme ? 'border-gray-300' : 'border-gray-800'">
                  <td
                    class="font-bold border-r p-1"
                    :class="
                      isWhiteTheme ? 'bg-gray-50 text-emerald-700 border-gray-200' : 'bg-neutral-900 text-emerald-400 border-gray-800'
                    "
                  >
                    AD
                  </td>
                  <td
                    v-for="(slot, sIdx) in cust.slots"
                    :key="sIdx"
                    @click="showSlotDetails(cust.name, slot)"
                    class="hover:bg-gray-900/30 cursor-pointer transition-colors duration-100"
                    :class="[
                      'p-1 font-bold border-r',
                      isWhiteTheme ? 'border-gray-200' : 'border-gray-900',
                      getCellBgClass(slot.time, 'AD', slot, cust.slots)
                    ]"
                  >
                    {{ slot.p ? slot.ad || '0' : '' }}
                  </td>
                  <td
                    class="font-bold p-1 text-xs"
                    :class="isWhiteTheme ? 'text-emerald-700 bg-gray-50' : 'text-emerald-400 bg-neutral-950'"
                  >
                    {{ calculateTotal(cust.slots, 'ad') }}
                  </td>
                </tr>
                <tr class="border-b-2" :class="isWhiteTheme ? 'border-gray-300' : 'border-gray-800'">
                  <td
                    class="font-bold border-r p-1"
                    :class="
                      isWhiteTheme ? 'bg-gray-50 text-emerald-700 border-gray-200' : 'bg-neutral-900 text-emerald-400 border-gray-800'
                    "
                  >
                    &Sigma; I
                  </td>
                  <td
                    v-for="(slot, sIdx) in cust.slots"
                    :key="sIdx"
                    @click="showSlotDetails(cust.name, slot)"
                    class="hover:bg-gray-900/30 cursor-pointer transition-colors duration-100"
                    :class="[
                      'p-1 font-bold border-r',
                      isWhiteTheme ? 'border-gray-200' : 'border-gray-900',
                      getCellBgClass(slot.time, 'I', slot, cust.slots)
                    ]"
                  >
                    {{ slot.p ? slot.i || '0' : '' }}
                  </td>
                  <td
                    class="font-bold p-1 text-xs"
                    :class="isWhiteTheme ? 'text-emerald-700 bg-gray-50' : 'text-emerald-400 bg-neutral-950'"
                  >
                    {{ calculateTotal(cust.slots, 'i') }}
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="(item, i) in dashboardDeliveryItems"
          :key="i"
          class="bg-white rounded-xl border border-gray-200 shadow p-4 hover:scale-105 transition-transform duration-200 cursor-pointer"
        >
          <div class="flex justify-between">
            <div class="flex-1">
              <h6 class="text-xl lg:text-2xl text-gray-600 mb-1 ml-2">{{ item.title }}</h6>
              <h4 class="text-4xl lg:text-5xl mb-1 flex items-center ml-2" :class="item.pct < 100 ? 'text-red-500' : 'text-green-600'">
                {{ item.pct }}%
              </h4>
              <div class="flex mt-2 ml-2">
                <div class="flex flex-col text-xs text-gray-500 mr-2 justify-center">
                  <p class="leading-[1.6]">Plan</p>
                  <p class="leading-[1.6]">Actual</p>
                </div>
                <div class="flex flex-col text-xs text-gray-400 mr-2 justify-center">
                  <p class="leading-[1.6]">:</p>
                  <p class="leading-[1.6]">:</p>
                </div>
                <div class="flex flex-col text-sm font-medium whitespace-nowrap">
                  <p class="text-green-600 leading-[1.6]">{{ fmt(item.plan) }} <span class="text-gray-500 font-normal">Items</span></p>
                  <p class="text-green-600 leading-[1.6]">{{ fmt(item.actual) }} <span class="text-gray-500 font-normal">Items</span></p>
                </div>
              </div>
            </div>
            <div class="flex flex-col items-center gap-1">
              <div class="w-15 h-14">
                <img :src="getImage(item.src)" :class="item.customClass" class="w-full h-full object-contain" alt="customer logo" />
              </div>
              <p class="text-sm text-gray-500">{{ dateToday }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="detailDialog" class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-1150 transition-all">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[85vh] flex flex-col m-4 overflow-hidden border border-slate-100">
        <div class="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h3 class="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <span>{{ selectedCustomer }}</span>
            <span class="text-slate-300 font-normal">|</span>
            <span class="text-sm font-medium bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md border border-indigo-100">
              {{ selectedSlot?.time }}
            </span>
          </h3>

          <button
            @click="
              detailDialog = false;
              expandedRows = [];
            "
            class="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-lg transition-colors duration-150 ease-in-out focus:outline-none"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="overflow-auto flex-1 px-6 pb-4">
          <div class="w-full overflow-auto border border-slate-200 rounded-lg shadow-sm">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr
                  class="bg-slate-300 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider text-center"
                >
                  <th class="p-4 w-12 sticky top-0 bg-slate-50 z-10"></th>
                  <th class="p-4 sticky top-0 bg-slate-50 z-10">Delivery Date</th>
                  <th class="p-4 sticky top-0 bg-slate-50 z-10">SO Number</th>
                  <th class="p-4 sticky top-0 bg-slate-50 z-10">DN Number</th>
                  <th class="p-4 sticky top-0 bg-slate-50 z-10">ETD</th>
                  <th class="p-4 sticky top-0 bg-slate-50 z-10">ETA</th>
                  <th class="p-4 sticky top-0 bg-slate-50 z-10">Status</th>
                  <th class="p-4 sticky top-0 bg-slate-50 z-10">Total Item</th>
                </tr>
              </thead>

              <tbody class="divide-y divide-slate-200 text-sm text-slate-700 bg-white">
                <template v-for="(delivery, index) in selectedSlot?.details" :key="delivery.vbeln || index">
                  <tr
                    @click="toggleRow(index)"
                    class="hover:bg-slate-50/70 transition-colors cursor-pointer select-none text-center"
                    :class="delivery.act < delivery.plan ? 'bg-red-50/50' : 'bg-green-50/50'"
                  >
                    <td class="p-2.5 text-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-4 w-4 text-slate-400 transition-transform duration-200"
                        :class="{ 'rotate-180 text-indigo-600': expandedRows.includes(index) }"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </td>

                    <td class="p-2.5 font-mono text-slate-600">
                      {{ delivery.vdatu }}
                    </td>

                    <td class="p-2.5 font-mono font-medium text-slate-900">
                      {{ delivery.vbeln }}
                    </td>
                    <td class="p-2.5 font-mono font-medium text-slate-900">
                      {{ delivery.bstnk }}
                    </td>

                    <td class="p-2.5 text-slate-600">
                      {{ delivery.etd }}
                    </td>

                    <td class="p-2.5 text-slate-600">
                      {{ delivery.eta }}
                    </td>

                    <td class="p-2.5 text-slate-600">
                      <span
                        :class="delivery.act < delivery.plan ? 'text-red-600' : 'text-green-600'"
                        class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800"
                      >
                        {{ delivery.act < delivery.plan ? 'Open' : 'Closed' }}
                      </span>
                    </td>
                    <td class="p-2.5 text-slate-600">
                      {{ delivery.items?.length || 0 }}
                    </td>
                  </tr>

                  <tr v-if="expandedRows.includes(index)" class="bg-slate-50/40">
                    <td colspan="8" class="p-0 border-t border-b border-slate-100">
                      <div class="px-8 py-4 space-y-3 bg-slate-50/60 shadow-inner">
                        <div class="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                            />
                          </svg>
                          <span>Items Details (Total: {{ delivery.items?.length || 0 }})</span>
                        </div>

                        <div class="grid sm:grid-cols-3 lg:grid-cols-4 gap-2">
                          <div
                            v-for="(subItem, subIdx) in delivery.items"
                            :key="subIdx"
                            class="bg-white p-1.5 rounded-lg border border-slate-200/80 shadow-xs flex flex-col gap-1 text-xs"
                          >
                            <div class="flex flex-col border-b border-slate-100 pb-1.5 mb-1.5">
                              <span class="font-mono font-semibold text-slate-700">{{ subItem.MATNR }}</span>
                              <span class="font-mono font-semibold text-slate-500">{{ subItem.BISMT }}</span>
                              <!-- <span class="text-slate-400 font-medium">ETA: {{ subItem.ETA }}</span> -->
                            </div>
                            <div class="text-blue-600">
                              <span class="text-slate-400">ACT / PLAN : </span>
                              <b :class="subItem.LFIMG < subItem.KWMENG ? 'text-red-600' : 'text-green-600'">{{ subItem.LFIMG }}</b>
                              /
                              {{ subItem.KWMENG }}
                            </div>
                            <!-- <div class="text-slate-600" :class="subItem.LFIMG < subItem.KWMENG ? 'text-red-600' : 'text-green-600'">
                              <span class="text-slate-400">ACT QTY:</span> {{ subItem.LFIMG }}
                            </div> -->
                          </div>
                        </div>

                        <div v-if="!delivery.items?.length" class="text-xs text-slate-400 italic py-1">
                          No nested items found inside this delivery reference.
                        </div>
                      </div>
                    </td>
                  </tr>
                </template>

                <tr v-if="!selectedSlot?.details?.length">
                  <td colspan="6" class="p-8 text-center text-slate-400 bg-slate-50/30">No delivery details available.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useDeliveryPlanActualStore } from '@/stores/Admin/DashboardDelivery';
import type { ConvertedDeliveryCustomer, ConvertedDeliveryCycle } from '@/types/Admin/DashboardDelivery';

const store = useDeliveryPlanActualStore();

const loading = computed(() => store.loading);
const error = computed(() => store.error);
const dateToday = ref(new Date().toLocaleDateString('id-ID'));

const currentTime = ref(new Date());
let clockInterval: any = null;

// ==========================================
// 💡 CONFIG OPSI TEMA PUTIH (TRUE = LIGHT MODE, FALSE = DARK MODE TABEL)
// ==========================================
const isWhiteTheme = ref(true);

const selectedCustomer = ref<any>(null);
const customerDetails = ref<any[]>([]);
const detailLoading = ref(false);
const detailError = ref<string | null>(null);
const searchQuery = ref('');
const sortKey = ref<string>('');
const sortOrder = ref<'asc' | 'desc'>('asc');
const selectedSlot = ref<ConvertedDeliveryCycle | null>(null);
const detailDialog = ref(false);
const expandedRows = ref<number[]>([]);

// DUMMY MATRIX DATA - Mengikuti struktur persis image_92649f.png
const circleDeliveryMatrix = ref<ConvertedDeliveryCustomer[]>([]);

// LOGIKA DYNAMIC COLOR MATRIX YANG SUDAH DIPERBAIKI (NEAREST MATCH)
const getCellBgClass = (slotTime: string, type: string, slotItem: any, allSlots: any[]) => {
  const now = currentTime.value;

  const getProductionMinutes = (hours: number, minutes: number) => {
    // Hari produksi dimulai jam 07:00
    if (hours < 7) {
      hours += 24;
    }

    return hours * 60 + minutes;
  };

  const currentTotalMinutes = getProductionMinutes(now.getHours(), now.getMinutes());

  let [slotHours, slotMins] = slotTime.split(':').map(Number);

  const slotTotalMinutes = getProductionMinutes(slotHours, slotMins);

  // Cari slot aktif terakhir yang sudah terlewati
  const activeSlot = allSlots
    .map((s) => {
      const [h, m] = s.time.split(':').map(Number);

      return getProductionMinutes(h, m);
    })
    .filter((minutes) => minutes <= currentTotalMinutes)
    .sort((a, b) => b - a)[0];

  const isCurrentActiveSlot = slotTotalMinutes === activeSlot;

  // ACTIVE SLOT
  if (isCurrentActiveSlot) {
    return 'bg-yellow-400 text-black border-yellow-500 animate-pulse font-extrabold shadow-lg';
  }

  // PAST SLOT
  if (currentTotalMinutes > slotTotalMinutes) {
    if (type === 'C') {
      return 'bg-blue-950 text-blue-300 font-semibold border-blue-900/40';
    }

    if (type === 'P' || type === 'AD' || type === 'I') {
      if (!slotItem.p && !slotItem.ad) {
        return 'bg-transparent';
      }

      if (Number(slotItem.ad) >= Number(slotItem.p) && Number(slotItem.p) > 0) {
        return 'bg-emerald-600 text-white font-bold border-emerald-700';
      }

      if (Number(slotItem.p) > 0) {
        return 'bg-red-600 text-white font-bold border-red-700';
      }
    }

    return isWhiteTheme.value ? 'bg-gray-100 text-gray-400' : 'bg-neutral-900/40 text-gray-500';
  }

  // FUTURE SLOT
  if (type === 'C') {
    return isWhiteTheme.value ? 'text-cyan-600' : 'text-cyan-400';
  }

  if (type === 'P') {
    return isWhiteTheme.value ? 'text-blue-600' : 'text-blue-400';
  }

  if (type === 'AD') {
    return isWhiteTheme.value ? 'text-emerald-600' : 'text-emerald-400';
  }

  if (type === 'I') {
    return isWhiteTheme.value ? 'text-teal-600' : 'text-teal-400';
  }

  return 'bg-transparent';
};

const calculateTotal = (slots: any[], key: string) => {
  return slots.reduce((sum, item) => sum + (Number(item[key]) || 0), 0);
};

// ==========================================
// DATA COMPUTED & FILTERING UTAMA CARD
// ==========================================
const filteredDetails = computed(() => {
  if (!searchQuery.value.trim()) return customerDetails.value;
  const query = searchQuery.value.toLowerCase().trim();
  return customerDetails.value.filter((item) => {
    return (
      item.no_so?.toLowerCase().includes(query) ||
      item.part_number?.toLowerCase().includes(query) ||
      item.model?.toLowerCase().includes(query) ||
      item.job_number?.toLowerCase().includes(query)
    );
  });
});

const sortedAndFilteredDetails = computed(() => {
  const data = [...filteredDetails.value];
  if (!sortKey.value) return data;
  return data.sort((a: any, b: any) => {
    let modifier = sortOrder.value === 'asc' ? 1 : -1;
    let valA = a[sortKey.value];
    let valB = b[sortKey.value];
    if (sortKey.value === 'balance') {
      valA = (Number(a.actual_qty) || 0) - (Number(a.plan_qty) || 0);
      valB = (Number(b.actual_qty) || 0) - (Number(b.plan_qty) || 0);
    } else if (['plan_qty', 'actual_qty', 'cycle'].includes(sortKey.value)) {
      valA = Number(valA) || 0;
      valB = Number(valB) || 0;
    } else {
      valA = valA ? valA.toString().toLowerCase() : '';
      valB = valB ? valB.toString().toLowerCase() : '';
    }
    return valA < valB ? -1 * modifier : valA > valB ? 1 * modifier : 0;
  });
});

function showSlotDetails(customer: string, slot: ConvertedDeliveryCycle) {
  if (!slot.details?.length) return;

  selectedCustomer.value = customer;
  selectedSlot.value = slot;

  detailDialog.value = true;
}
// Toggle expansion state
const toggleRow = (index: number) => {
  if (expandedRows.value.includes(index)) {
    // If already open, close it
    expandedRows.value = expandedRows.value.filter((i) => i !== index);
  } else {
    // Otherwise, add it to open list
    expandedRows.value.push(index);
  }
};

const handleSort = (key: string) => {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortKey.value = key;
    sortOrder.value = 'asc';
  }
};

const sortIcon = (key: string): string => {
  if (sortKey.value !== key) return ' ⇅';
  return sortOrder.value === 'asc' ? ' ▴' : ' ▾';
};

const formatTime = (timeStr: string | null | undefined): string => {
  if (!timeStr) return '-';
  return timeStr.trim().substring(0, 5);
};

const totalPlanQty = computed(() => sortedAndFilteredDetails.value.reduce((sum, item) => sum + (Number(item.plan_qty) || 0), 0));
const totalActualQty = computed(() => sortedAndFilteredDetails.value.reduce((sum, item) => sum + (Number(item.actual_qty) || 0), 0));
const totalBalanceQty = computed(() => totalActualQty.value - totalPlanQty.value);

const customerMappings = [
  {
    displayName: 'ADM SAP',
    apiNames: ['ADM PLANT 1', 'ADM PLANT 4'],
    src: 'customer/adm.png',
    link: '/irm-inhouse-rundown',
    customClass: 'wide-image'
  },
  { displayName: 'ADM KAP', apiNames: ['ADM PLANT 5'], src: 'customer/adm.png', link: '/irm-outhouse-rundown', customClass: 'wide-image' },
  { displayName: 'HMMI', apiNames: ['HMMI'], src: 'customer/hmmi.png', link: '/wip-rundown-inhouse', customClass: 'wide-image' },
  { displayName: 'MKM', apiNames: ['MKM'], src: 'customer/mkm.png', link: '/wip-rundown-outhouse', customClass: 'wide-image' },
  { displayName: 'MMKI', apiNames: ['MMKI'], src: 'customer/mmki.png', link: '/ifp-inhouse-rundown', customClass: 'wide-image' },
  { displayName: 'TMMIN', apiNames: ['TMMIN'], src: 'customer/tmmin.png', link: '/ifp-inhouse-rundown', customClass: 'wide-image' }
];

const dashboardDeliveryItems = computed(() => {
  return customerMappings.map((mapping) => {
    const summary = store.getAggregatedSummary(mapping.apiNames);
    return {
      src: mapping.src,
      title: mapping.displayName,
      apiNames: mapping.apiNames,
      link: mapping.link,
      customClass: mapping.customClass,
      plan: summary.plan,
      actual: summary.actual,
      pct: summary.pct
    };
  });
});

const fmt = (v: number | null | undefined): string => {
  if (v === null || v === undefined) return '-';
  return new Intl.NumberFormat('id-ID').format(v);
};

const getImage = (src: string): string => `${window.location.origin}${import.meta.env.BASE_URL}src/assets/${src}`;

const openDetail = async (item: any) => {
  selectedCustomer.value = item;
  await fetchDetailData(item);
};

const fetchDetailData = async (item: any) => {
  detailLoading.value = true;
  detailError.value = null;
  customerDetails.value = [];
  searchQuery.value = '';
  sortKey.value = '';
  try {
    const namesToFetch = item.apiNames && item.apiNames.length > 0 ? item.apiNames : [item.title];
    const requests = namesToFetch.map((plantName: string) =>
      fetch(`http://192.168.10.67/majsf_rest_api/api/report_delivery/delivery_plan_actual_item?cust=${encodeURIComponent(plantName)}`).then(
        (res) => {
          if (!res.ok) throw new Error(`Gagal mengambil data untuk ${plantName}`);
          return res.json();
        }
      )
    );
    const results = await Promise.all(requests);
    customerDetails.value = results.flat();
  } catch (err: any) {
    detailError.value = err.message || 'Terjadi kesalahan jaringan.';
  } finally {
    detailLoading.value = false;
  }
};

const closeDetail = () => {
  selectedCustomer.value = null;
  customerDetails.value = [];
  detailError.value = null;
};

const loadData = async () => {
  await store.fetchDeliveryPlanActual();
  await store.fetchDeliveryCycles();
  circleDeliveryMatrix.value = store.convertedDeliveryCycles;
};

onMounted(() => {
  loadData();
  clockInterval = setInterval(() => {
    loadData();
    currentTime.value = new Date();
  }, 300000);
  // Setiap 10 detik memperbarui jam internal agar tracking kedap-kedip semakin presisi
  clockInterval = setInterval(() => {
    currentTime.value = new Date();
  }, 10000);
});

onUnmounted(() => {
  if (clockInterval) clearInterval(clockInterval);
});
</script>

<style scoped>
.wide-image {
  width: 100%;
  height: auto;
  object-fit: contain;
}
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
.animate-fade-in {
  animation: fadeIn 0.2s ease-out forwards;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(0.98);
  }
}
.animate-pulse {
  animation: pulse 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>
