<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import { useStockQueueStore } from '@/stores/Public/Welding/stockQueueStore';
import { useQueueRealtime } from '@/composables/useQueueRealtime';
import { useAnimatedNumber } from '@/composables/useAnimatedNumber';
import { urlExportExcel } from '@/services/Public/Welding/stockQueueService';
import type { QueueItem } from '@/types/Public/Welding/stockQueue';

import SummaryCard from '@/components/welding/stock-queue/SummaryCard.vue';
import QueueFilters from '@/components/welding/stock-queue/QueueFilters.vue';
import QueueTable from '@/components/welding/stock-queue/QueueTable.vue';
import ActionBar from '@/components/welding/stock-queue/ActionBar.vue';
import ToastNotif from '@/components/welding/stock-queue/ToastNotif.vue';
import QueueDetailDrawer from '@/components/welding/stock-queue/QueueDetailDrawer.vue';

const router = useRouter();
const store = useStockQueueStore();
const {
  summary,
  pendingAlert,
  failedAlert,
  checkedAt,
  items,
  meta,
  filters,
  selectedDetail,
  autoMode,
  savingAutoMode,
  refreshing,
  loadingList,
  loadingAction,
  loadingDetail,
  errorStatus,
  errorList,
  actionMessage,
  actionSuccess,
  pendingCount,
  processingCount,
  doneCount,
  failedCount,
  summaryMap
} = storeToRefs(store);

const { connected } = useQueueRealtime();

const animatedTotal = useAnimatedNumber(computed(() => Number(meta.value.total)));

onMounted(() => store.init());

async function onSearch() {
  await store.loadList();
}
async function onPageChange(p: number) {
  store.setPage(p);
  await store.loadList();
}
async function onRetryRow(id: number) {
  await store.runRetryFailed([id]);
}

async function onSelectRow(row: QueueItem) {
  await store.loadDetail(row.id);
}

function formatTime(ts: string | null | undefined) {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
</script>

<template>
  <div class="min-h-screen bg-gray-100 text-gray-800" style="font-family: 'DM Sans', 'Segoe UI', sans-serif">
    <!-- ── Header ─────────────────────────────────────────── -->
    <header class="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30">
      <div class="w-full px-4 sm:px-6 h-12 flex items-center justify-between gap-4">
        <div class="flex items-center gap-3 min-w-0">
          <div class="flex items-center justify-center w-7 h-7 rounded bg-blue-600 text-white font-black text-xs shrink-0">TP</div>
          <div class="flex items-center gap-2 min-w-0">
            <span class="font-bold text-gray-800 text-sm whitespace-nowrap">Stok Otomatis Welding</span>
            <span class="text-gray-300 hidden sm:inline">|</span>
            <span class="text-xs text-gray-500 hidden sm:inline truncate">Pemantauan pengurangan stok hasil produksi</span>
          </div>
        </div>

        <div class="flex items-center gap-2 sm:gap-3 shrink-0">
          <!-- Live indicator -->
          <span
            :class="[
              'flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full border',
              connected ? 'text-green-700 bg-green-50 border-green-300' : 'text-gray-500 bg-gray-100 border-gray-300'
            ]"
            :title="connected ? 'Terhubung — data diperbarui otomatis' : 'Koneksi langsung terputus — memakai pembaruan berkala'"
          >
            <span :class="['w-1.5 h-1.5 rounded-full', connected ? 'bg-green-500 animate-pulse' : 'bg-gray-400']" />
            {{ connected ? 'Live' : 'Offline' }}
          </span>

          <!-- Alert pills -->
          <span
            v-if="pendingAlert"
            class="hidden sm:flex items-center gap-1 text-xs text-amber-700 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full animate-pulse"
          >
            ⚠ Antrian menumpuk
          </span>
          <span
            v-if="failedAlert"
            class="hidden sm:flex items-center gap-1 text-xs text-red-700 bg-red-100 border border-red-300 px-2 py-0.5 rounded-full"
          >
            ✗ Ada yang gagal
          </span>

          <span v-if="checkedAt" class="text-xs text-gray-400 font-mono hidden md:block">
            {{ formatTime(checkedAt) }}
          </span>

          <a
            :href="urlExportExcel()"
            class="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-300 rounded px-2.5 py-1.5 hover:bg-emerald-100 transition-colors"
            title="Unduh laporan lengkap (ringkasan, tanpa pergerakan, mapping rusak, backlog) dalam format Excel"
          >
            ⤓ Excel
          </a>

          <button
            @click="router.push('/welding/stock-queue/audit-master')"
            class="text-xs font-semibold text-gray-500 border border-gray-300 rounded px-2.5 py-1.5 hover:bg-gray-100 transition-colors"
            title="Audit pengurang welding vs Master IFPP Inhouse/Outhouse (routing SINGLE dikecualikan)"
          >
            Audit Master →
          </button>

          <button
            @click="router.push('/welding/stock-queue/no-movement')"
            class="text-xs font-semibold text-gray-500 border border-gray-300 rounded px-2.5 py-1.5 hover:bg-gray-100 transition-colors"
            title="Part IFPP berstok yang tidak bergerak — kandidat mapping salah/belum ada"
          >
            Tanpa Pergerakan →
          </button>

          <button
            @click="router.push('/welding/stock-queue/reconcile')"
            class="text-xs font-semibold text-gray-500 border border-gray-300 rounded px-2.5 py-1.5 hover:bg-gray-100 transition-colors"
            title="Audit rekonsiliasi backlog FAILED"
          >
            Rekonsiliasi →
          </button>

          <button
            @click="store.refresh()"
            :disabled="refreshing"
            :class="[
              'w-7 h-7 flex items-center justify-center text-gray-400 hover:text-blue-600 border border-gray-200 rounded hover:border-blue-400 transition-all disabled:opacity-40',
              refreshing ? 'bg-gray-50' : 'bg-white'
            ]"
            title="Segarkan sekarang"
          >
            <svg
              :class="['w-3.5 h-3.5', refreshing ? 'animate-spin' : '']"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
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
      <!-- ── Penjelasan singkat (untuk orang awam) ─────────── -->
      <div class="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
        <div class="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 text-lg shrink-0">ⓘ</div>
        <div class="text-sm text-blue-900 leading-relaxed">
          <p class="font-semibold">Setiap hasil produksi welding otomatis mengurangi stok bahan (IFPP) dan menambah stok hasil (IFPW).</p>
          <p class="text-blue-700 mt-0.5 text-xs">
            Antrian di bawah diproses sistem secara otomatis — Anda <span class="font-semibold">tidak perlu menekan tombol apa pun</span>.
            Tombol di kanan hanya cadangan bila ada yang perlu diproses ulang.
          </p>
        </div>
      </div>

      <!-- Error -->
      <div v-if="errorStatus" class="flex items-center gap-2 bg-red-50 border border-red-300 rounded px-3 py-2.5 text-sm text-red-700">
        <span>⚠</span> {{ errorStatus }}
      </div>

      <!-- ── Summary Cards ──────────────────────────────── -->
      <section class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard
          status="PENDING"
          :count="pendingCount"
          :total-delta="summaryMap['PENDING']?.total_delta"
          :last-processed="summaryMap['PENDING']?.newest"
          :alert="pendingAlert"
        />
        <SummaryCard
          status="PROCESSING"
          :count="processingCount"
          :total-delta="summaryMap['PROCESSING']?.total_delta"
          :last-processed="summaryMap['PROCESSING']?.last_processed"
        />
        <SummaryCard
          status="DONE"
          :count="doneCount"
          :total-delta="summaryMap['DONE']?.total_delta"
          :last-processed="summaryMap['DONE']?.last_processed"
        />
        <SummaryCard
          status="FAILED"
          :count="failedCount"
          :total-delta="summaryMap['FAILED']?.total_delta"
          :last-processed="summaryMap['FAILED']?.newest"
          :alert="failedAlert"
        />
      </section>

      <!-- ── Toolbar ─────────────────────────────────────── -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <h2 class="text-sm font-bold text-gray-700">Daftar Antrian</h2>
          <span class="text-xs text-gray-400 bg-white border border-gray-200 px-2 py-0.5 rounded font-mono">
            {{ animatedTotal.toLocaleString('id-ID') }} baris
          </span>
          <span class="text-xs text-gray-400">— klik baris untuk detail</span>
        </div>
        <ActionBar
          :loading="loadingAction"
          :mode="autoMode"
          :saving-mode="savingAutoMode"
          @update:mode="store.updateAutoMode($event)"
          @manual-process="store.runManualProcess($event)"
          @retry-failed="store.runRetryFailed()"
          @purge-done="store.runPurgeDone($event)"
        />
      </div>

      <!-- ── Filters ─────────────────────────────────────── -->
      <QueueFilters v-model="filters" @search="onSearch" />

      <!-- Error list -->
      <div v-if="errorList" class="flex items-center gap-2 bg-red-50 border border-red-300 rounded px-3 py-2.5 text-sm text-red-700">
        <span>⚠</span> {{ errorList }}
      </div>

      <!-- ── Table ───────────────────────────────────────── -->
      <QueueTable
        :items="items"
        :meta="meta"
        :loading="loadingList"
        @page-change="onPageChange"
        @retry-row="onRetryRow"
        @select-row="onSelectRow"
      />

      <!-- Footer -->
      <p class="text-xs text-gray-400 text-center pb-2 flex items-center justify-center gap-1.5">
        <span :class="['w-1.5 h-1.5 rounded-full', connected ? 'bg-green-500' : 'bg-gray-400']" />
        {{ connected ? 'Diperbarui otomatis secara langsung' : 'Diperbarui berkala otomatis' }}
        <span v-if="refreshing" class="text-blue-400">· menyegarkan…</span>
      </p>
    </main>

    <!-- ── Detail Drawer ─────────────────────────────────── -->
    <QueueDetailDrawer :detail="selectedDetail" :loading="loadingDetail" @close="store.closeDetail()" @retry="onRetryRow" />

    <!-- ── Toast ──────────────────────────────────────────── -->
    <ToastNotif :message="actionMessage" :success="actionSuccess" @close="store.clearActionMessage()" />
  </div>
</template>
