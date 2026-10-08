<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useRundownStock } from '@/stores/Admin/RundownStock';
import type { SupplyMatRow } from '@/types/Admin/RundownSupplyMat';

const rundownStockStore = useRundownStock();
const { supplyMatLines, supplyMatLoading, supplyMatError } = storeToRefs(rundownStockStore);

// ── Filter ────────────────────────────────────────────────────────────────────
const selectedLines = ref<string[]>([]);

const allLineNames = computed(() => supplyMatLines.value.map(l => l.name));

const filteredLines = computed(() =>
  selectedLines.value.length === 0
    ? supplyMatLines.value
    : supplyMatLines.value.filter(l => selectedLines.value.includes(l.name))
);

const toggleLine = (name: string) => {
  const idx = selectedLines.value.indexOf(name);
  if (idx === -1) selectedLines.value.push(name);
  else selectedLines.value.splice(idx, 1);
};

const selectAll = () => { selectedLines.value = []; };

const isAllSelected = computed(() => selectedLines.value.length === 0);

const shortLineName = (name: string): string =>
  name.replace(/^LINE\s*/i, '');

// ── Color helpers ─────────────────────────────────────────────────────────────
const stockIrmCritical = (row: SupplyMatRow): boolean =>
  row.stockIrm === 0 || (row.qtyRequest - row.qtySupply) > row.stockIrm;

const qtySupplyClass = (row: SupplyMatRow): string => {
  if (row.qtySupply === 0)              return 'text-[#f87171] font-semibold';
  if (row.qtySupply < row.qtyRequest)   return 'text-orange-400 font-semibold';
  if (row.qtySupply === row.qtyRequest) return 'text-[#4ade80] font-semibold';
  return 'text-[#38bdf8] font-semibold';
};

// ── Lifecycle ─────────────────────────────────────────────────────────────────
let timer: ReturnType<typeof setInterval> | null = null;

onMounted(async () => {
  await rundownStockStore.getRundownSupplyMat();
  timer = setInterval(() => rundownStockStore.getRundownSupplyMat(), 30 * 60 * 1000);
});

onBeforeUnmount(() => {
  if (timer) clearInterval(timer);
});
</script>

<template>
  <!-- Loading -->
  <div
    v-if="supplyMatLoading"
    class="flex items-center justify-center py-16 bg-[#031525] rounded-lg border border-[#004e72]"
  >
    <span class="text-[#7dd3fc] text-sm animate-pulse tracking-widest">Memuat data...</span>
  </div>

  <!-- Error -->
  <div
    v-else-if="supplyMatError"
    class="flex items-center justify-center py-16 bg-[#031525] rounded-lg border border-[#004e72]"
  >
    <span class="text-[#f87171] text-sm tracking-widest">Gagal mengambil data dari server.</span>
  </div>

  <!-- Empty -->
  <div
    v-else-if="supplyMatLines.length === 0"
    class="flex items-center justify-center py-16 bg-[#031525] rounded-lg border border-[#004e72]"
  >
    <span class="text-gray-500 text-sm tracking-widest">Tidak ada data supply material.</span>
  </div>

  <!-- Content -->
  <div v-else class="flex flex-col gap-3">

    <!-- Legend + Filter bar -->
    <div class="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg bg-gray-50 border border-gray-200 flex-wrap">

      <!-- Legend -->
      <div class="flex items-center gap-x-2 gap-y-1 flex-wrap text-[11px] text-gray-500">
        <div class="flex items-center gap-1">
          <div class="w-2.5 h-2.5 rounded-sm bg-red-500/50 border border-red-400/60 shrink-0"></div>
          <span>Stock Kritis</span>
        </div>
        <span class="text-gray-300">|</span>
        <div class="flex items-center gap-1">
          <div class="w-2 h-2 rounded-full bg-[#f87171] shrink-0"></div>
          <span>Belum Supply</span>
        </div>
        <div class="flex items-center gap-1">
          <div class="w-2 h-2 rounded-full bg-orange-400 shrink-0"></div>
          <span>Kurang Supply</span>
        </div>
        <div class="flex items-center gap-1">
          <div class="w-2 h-2 rounded-full bg-[#4ade80] shrink-0"></div>
          <span>Sesuai Supply</span>
        </div>
        <div class="flex items-center gap-1">
          <div class="w-2 h-2 rounded-full bg-[#38bdf8] shrink-0"></div>
          <span>Melebihi Supply</span>
        </div>
      </div>

      <!-- Divider -->
      <div class="w-px self-stretch bg-gray-200 shrink-0"></div>

      <!-- Line filter chips -->
      <div class="flex flex-wrap items-center gap-1">
        <span class="text-xs text-gray-500">Pilih Line:</span>
        <!-- All chip -->
        <button
          @click="selectAll"
          :class="[
            'px-2 py-0.5 text-xs rounded-md transition-colors',
            isAllSelected ? 'bg-blue-600 text-white' : 'text-gray-900 hover:bg-gray-200'
          ]"
        >
          Semua
        </button>
        <!-- Per-line chip -->
        <button
          v-for="name in allLineNames"
          :key="name"
          @click="toggleLine(name)"
          :class="[
            'px-2 py-0.5 text-xs rounded-md transition-colors',
            selectedLines.includes(name) ? 'bg-blue-600 text-white' : 'text-gray-900 hover:bg-gray-200'
          ]"
        >
          {{ shortLineName(name) }}
        </button>
      </div>
    </div>

    <!-- Cards -->
    <div
      v-for="line in filteredLines"
      :key="line.name"
      class="w-full rounded-lg border border-[#004e72] overflow-hidden bg-[#031525] text-white font-sans tracking-wide"
    >
      <!-- Card header -->
      <div class="px-4 py-2 bg-[#042c44] border-b border-[#004e72] flex items-center justify-between">
        <span class="text-sm font-bold tracking-widest text-[#7dd3fc] uppercase">{{ line.name }}</span>
        <span class="text-xs text-gray-500">{{ line.rows.length }} item</span>
      </div>

      <!-- Table -->
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-center text-sm uppercase">
          <thead>
            <tr class="bg-[#042c44] text-white font-bold border-b border-[#004e72]">
              <th class="border border-[#004e72] px-3 py-2">NO</th>
              <th class="border border-[#004e72] px-3 py-2">NO RESERVASI</th>
              <th class="border border-[#004e72] px-3 py-2">JOB NO</th>
              <th class="border border-[#004e72] px-3 py-2">PART NO</th>
              <th class="border border-[#004e72] px-3 py-2">STOCK IFRM</th>
              <th class="border border-[#004e72] px-3 py-2">QTY REQUEST</th>
              <th class="border border-[#004e72] px-3 py-2">QTY SUPPLY</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#003b57] text-gray-50">
            <tr
              v-for="(row, rowIdx) in [...line.rows].sort((a, b) => a.qtySupply - b.qtySupply)"
              :key="rowIdx"
              class="hover:bg-white/5 transition-colors"
            >
              <td class="border border-[#004e72] px-3 py-2 text-gray-400 w-12">{{ rowIdx + 1 }}</td>
              <td class="border border-[#004e72] px-3 py-2 whitespace-nowrap">{{ row.noReservasi }}</td>
              <td class="border border-[#004e72] px-3 py-2 whitespace-nowrap">{{ row.jobNo }}</td>
              <td class="border border-[#004e72] px-3 py-2 whitespace-nowrap">{{ row.partNo }}</td>
              <td class="border border-[#004e72] px-3 py-2">
                <span :class="stockIrmCritical(row) ? 'text-[#f87171] font-bold' : 'text-gray-200'">{{ row.stockIrm }}</span>
              </td>
              <td class="border border-[#004e72] px-3 py-2 text-gray-200">{{ row.qtyRequest }}</td>
              <td class="border border-[#004e72] px-3 py-2" :class="qtySupplyClass(row)">{{ row.qtySupply }}</td>
            </tr>
            <tr v-if="line.rows.length === 0">
              <td colspan="7" class="py-6 text-center text-gray-500 text-xs tracking-widest">NO DATA</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

  </div>
</template>
