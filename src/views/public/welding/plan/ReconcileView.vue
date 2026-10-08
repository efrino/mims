<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import { useStockQueueStore } from '@/stores/Public/Welding/stockQueueStore';
import { useAnimatedNumber } from '@/composables/useAnimatedNumber';
import ReconcileTable from '@/components/welding/stock-queue/ReconcileTable.vue';

const router = useRouter();
const store = useStockQueueStore();
const { reconcileRows, reconcileMeta, loadingReconcile, errorReconcile } = storeToRefs(store);

// Angka "berjalan" (count-up/down) tiap kali reconcileMeta berubah - sama
// seperti SummaryCard di halaman antrian, supaya terasa hidup saat refresh.
const animatedTotalParts = useAnimatedNumber(computed(() => Number(reconcileMeta.value.total_parts)));
const animatedTotalFailedRows = useAnimatedNumber(computed(() => Number(reconcileMeta.value.total_failed_rows)));
const animatedTotalFailedQty = useAnimatedNumber(computed(() => Number(reconcileMeta.value.total_failed_qty)));

onMounted(() => store.loadReconciliation());
</script>

<template>
  <div class="min-h-screen bg-gray-100 text-gray-800" style="font-family: 'DM Sans', 'Segoe UI', sans-serif">
    <!-- ── Header ─────────────────────────────────────────── -->
    <header class="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30">
      <div class="w-full px-4 sm:px-6 h-12 flex items-center justify-between gap-4">
        <div class="flex items-center gap-3 min-w-0">
          <div class="flex items-center justify-center w-7 h-7 rounded bg-blue-600 text-white font-black text-xs shrink-0">TP</div>
          <div class="flex items-center gap-2 min-w-0">
            <span class="font-bold text-gray-800 text-sm whitespace-nowrap">Audit Rekonsiliasi Backlog</span>
            <span class="text-gray-300 hidden sm:inline">|</span>
            <span class="text-xs text-gray-500 hidden sm:inline truncate">Stock Otomatis Welding</span>
          </div>
        </div>

        <div class="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            @click="router.push('/welding/stock-queue')"
            class="text-xs font-semibold text-gray-500 border border-gray-300 rounded px-2.5 py-1.5 hover:bg-gray-100 transition-colors"
          >
            ← Antrian
          </button>
          <button
            @click="store.loadReconciliation()"
            :disabled="loadingReconcile"
            class="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-blue-600 border border-gray-200 rounded hover:border-blue-400 transition-all disabled:opacity-40 bg-white"
            title="Segarkan"
          >
            <svg :class="['w-3.5 h-3.5', loadingReconcile ? 'animate-spin' : '']" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      </div>
    </header>

    <main class="w-full px-4 sm:px-6 py-5 space-y-4">
      <!-- ── Catatan penting ────────────────────────────────── -->
      <div class="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
        <div class="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-600 text-lg shrink-0">⚠</div>
        <div class="text-sm text-amber-900 leading-relaxed">
          <p class="font-semibold">
            <code class="bg-amber-100 px-1 rounded font-mono text-xs">majsf_rundown.ms_rundown_ifpp</code> adalah tabel MyISAM
            (non-transactional) — deduksi stok IFPP untuk baris di bawah ini kemungkinan besar
            <span class="underline">sudah permanen</span> walau statusnya FAILED.
          </p>
          <p class="text-amber-700 mt-1 text-xs">
            Kolom "Qty belum ter-refleksi" adalah estimasi backlog
            <code class="bg-amber-100 px-1 rounded font-mono">wip_stock</code> /
            <code class="bg-amber-100 px-1 rounded font-mono">ms_rundown_ifpw_stock</code> yang belum diperbarui
            (InnoDB, ikut rollback saat trigger error) — <strong>bukan</strong> indikasi IFPP belum dikurangi.
            Jangan retry baris ini tanpa audit stok fisik terlebih dulu.
          </p>
        </div>
      </div>

      <div v-if="errorReconcile" class="flex items-center gap-2 bg-red-50 border border-red-300 rounded px-3 py-2.5 text-sm text-red-700">
        <span>⚠</span> {{ errorReconcile }}
      </div>

      <!-- ── Summary ────────────────────────────────────────── -->
      <section class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div class="bg-white rounded border border-gray-200 shadow-sm p-4">
          <p class="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Part Terdampak</p>
          <p class="text-3xl font-black text-gray-800 tabular-nums">{{ animatedTotalParts.toLocaleString('id-ID') }}</p>
        </div>
        <div class="bg-white rounded border border-gray-200 shadow-sm p-4">
          <p class="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Total Baris FAILED</p>
          <p class="text-3xl font-black text-red-700 tabular-nums">{{ animatedTotalFailedRows.toLocaleString('id-ID') }}</p>
        </div>
        <div class="bg-white rounded border border-gray-200 shadow-sm p-4">
          <p class="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Total Qty Belum Ter-refleksi</p>
          <p class="text-3xl font-black text-amber-700 tabular-nums">{{ animatedTotalFailedQty.toLocaleString('id-ID') }}</p>
        </div>
      </section>

      <ReconcileTable :rows="reconcileRows" :loading="loadingReconcile" />
    </main>
  </div>
</template>
