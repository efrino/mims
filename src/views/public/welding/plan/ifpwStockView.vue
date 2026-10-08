<script setup lang="ts">
// views/IfpwStockView.vue
import { onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useIfpwStockStore } from '@/stores/Public/Welding/ifpwStockStore';
import { useIfpwPolling } from '@/composables/useIfpwPolling';
import type { IfpwStockItem } from '@/types/Public/Welding/ifpwStock';

import IfpwSummaryBar from '@/components/welding/ifpw/ifpwSummaryBar.vue';
import IfpwStockTable from '@/components/welding/ifpw/ifpwStockTable.vue';
import IfpwEditModal from '@/components/welding/ifpw/ifpwEditModal.vue';
import ToastNotif from '@/components/welding/stock-queue/ToastNotif.vue';

const store = useIfpwStockStore();
const { items, summary, meta, filters, loading, loadingUpdate, error, actionMessage, actionSuccess, hasCritical } = storeToRefs(store);

useIfpwPolling(30_000);

onMounted(() => store.loadStock());

// Filter state
const searchPart = ref('');
const statusFilter = ref('ALL');

const STATUS_FILTERS = [
  { label: 'Semua', value: 'ALL' },
  { label: 'Kritis', value: 'CRITICAL' },
  { label: 'Rendah', value: 'LOW' },
  { label: 'Normal', value: 'NORMAL' },
  { label: 'Overstock', value: 'OVERSTOCK' }
];

function applyFilter() {
  store.loadStock({ part_number: searchPart.value || undefined, status_filter: statusFilter.value, page: 1 });
}

function resetFilter() {
  searchPart.value = '';
  statusFilter.value = 'ALL';
  store.loadStock({ page: 1 });
}

// Edit modal
const editItem = ref<IfpwStockItem | null>(null);

function onEdit(item: IfpwStockItem) {
  editItem.value = item;
}

async function onSave(payload: any) {
  await store.updateStock(payload);
  if (store.actionSuccess) editItem.value = null;
}
</script>

<template>
  <div class="min-h-screen bg-gray-100" style="font-family: 'DM Sans', 'Segoe UI', sans-serif">
    <!-- ── Header ─────────────────────────────────────────── -->
    <header class="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30">
      <div class="max-w-screen-xl mx-auto px-4 sm:px-6 h-12 flex items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <div class="flex items-center justify-center w-7 h-7 rounded bg-green-600 text-white font-black text-xs">IW</div>
          <div class="flex items-center gap-2">
            <span class="font-bold text-gray-800 text-sm">IFPW Stock</span>
            <span class="text-gray-300">|</span>
            <span class="text-xs text-gray-500">Welding In-Process Stock Monitor</span>
          </div>
          <!-- Critical alert -->
          <span
            v-if="hasCritical"
            class="flex items-center gap-1 text-xs text-red-700 bg-red-100 border border-red-300 px-2 py-0.5 rounded-full animate-pulse"
          >
            ⚠ {{ summary.critical_count }} Part Kritis
          </span>
        </div>

        <button
          @click="store.loadStock()"
          :disabled="loading"
          :class="[
            'w-7 h-7 flex items-center justify-center text-gray-400 hover:text-green-600 border border-gray-200 rounded hover:border-green-400 transition-all disabled:opacity-40 bg-white'
          ]"
          title="Refresh"
        >
          <svg :class="['w-3.5 h-3.5', loading ? 'animate-spin' : '']" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>
    </header>

    <main class="max-w-screen-xl mx-auto px-4 sm:px-6 py-5 space-y-4">
      <!-- Error -->
      <div v-if="error" class="flex items-center gap-2 bg-red-50 border border-red-300 rounded px-3 py-2.5 text-sm text-red-700">
        <span>⚠</span> {{ error }}
      </div>

      <!-- ── Summary Cards ──────────────────────────────── -->
      <IfpwSummaryBar :summary="summary" :loading="loading" />

      <!-- ── Toolbar ─────────────────────────────────────── -->
      <div class="bg-gray-50 border border-gray-200 rounded p-3">
        <div class="flex flex-col sm:flex-row gap-2">
          <!-- Search -->
          <input
            v-model="searchPart"
            type="text"
            placeholder="Cari part number..."
            @keyup.enter="applyFilter"
            class="flex-1 bg-white border border-gray-300 text-gray-700 text-sm rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-green-400 placeholder:text-gray-400"
          />

          <!-- Status filter pills -->
          <div class="flex gap-1 flex-wrap">
            <button
              v-for="sf in STATUS_FILTERS"
              :key="sf.value"
              @click="
                statusFilter = sf.value;
                applyFilter();
              "
              :class="[
                'px-3 py-1.5 text-xs rounded font-semibold transition-colors border',
                statusFilter === sf.value
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-green-400'
              ]"
            >
              {{ sf.label }}
            </button>
          </div>

          <button
            @click="resetFilter"
            class="px-3 py-1.5 text-xs text-gray-500 border border-gray-300 rounded hover:bg-gray-100 transition-colors whitespace-nowrap"
          >
            Reset
          </button>
        </div>
      </div>

      <!-- ── Table ───────────────────────────────────────── -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <h2 class="text-sm font-bold text-gray-700">
            Daftar Stok IFPW
            <span class="ml-2 text-xs text-gray-400 bg-white border border-gray-200 px-2 py-0.5 rounded font-mono">
              {{ meta.total }} part
            </span>
          </h2>
          <p class="text-xs text-gray-400">Auto-refresh 30 detik</p>
        </div>
        <IfpwStockTable
          :items="items"
          :loading="loading"
          :meta="meta"
          @page-change="
            (p) => {
              store.setPage(p);
              store.loadStock();
            }
          "
          @edit-row="onEdit"
        />
      </div>

      <p class="text-xs text-gray-400 text-center pb-2">
        Sumber: <span class="font-mono">majsf_andon_welding.ms_rundown_ifpw_stock</span> · Backend:
        <span class="font-mono">192.168.10.67/majsf_rest_api/api/</span>
      </p>
    </main>

    <!-- ── Edit Modal ─────────────────────────────────────── -->
    <IfpwEditModal :item="editItem" :loading="loadingUpdate" @close="editItem = null" @save="onSave" />

    <!-- ── Toast ──────────────────────────────────────────── -->
    <ToastNotif :message="actionMessage" :success="actionSuccess" @close="store.clearMessage()" />
  </div>
</template>
