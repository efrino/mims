<script setup lang="ts">
import { computed } from 'vue';
import type { QueueStatus } from '@/types/Public/Welding/stockQueue';
import { STATUS_CONFIG } from '@/types/Public/Welding/stockQueue';
import { useAnimatedNumber } from '@/composables/useAnimatedNumber';
const props = defineProps<{ status: QueueStatus; count: number; totalDelta?: number; lastProcessed?: string | null; alert?: boolean }>();

// Angka "berjalan" (count-up/down) tiap kali count/totalDelta berubah dari
// auto-refresh, supaya kelihatan hidup/real-time alih-alih loncat instan.
const animatedCount = useAnimatedNumber(computed(() => Number(props.count)));
const animatedTotalDelta = useAnimatedNumber(computed(() => Number(props.totalDelta ?? 0)));

function formatTime(ts: string | null | undefined) {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
const ICONS: Record<string, string> = { PENDING: '⏳', PROCESSING: '⚙️', DONE: '✓', FAILED: '✗' };
const DESC: Record<QueueStatus, string> = {
  PENDING: 'Menunggu giliran diproses',
  PROCESSING: 'Sedang diproses sistem',
  DONE: 'Berhasil — stok sudah diperbarui',
  FAILED: 'Gagal — perlu dicek/diproses ulang'
};
</script>
<template>
  <div
    :class="[
      'relative bg-white rounded border-l-4 p-4 shadow-sm transition-all',
      STATUS_CONFIG[status].border,
      alert ? 'ring-2 ring-red-400 ring-offset-1' : ''
    ]"
  >
    <div class="flex items-start justify-between">
      <div class="min-w-0">
        <p class="text-xs text-gray-500 font-semibold uppercase tracking-widest mb-1">{{ STATUS_CONFIG[status].label }}</p>
        <p :class="['text-3xl font-black tabular-nums', STATUS_CONFIG[status].text]">{{ animatedCount.toLocaleString('id-ID') }}</p>
        <p class="text-xs text-gray-400 mt-0.5">{{ DESC[status] }}</p>
      </div>
      <div
        :class="[
          'w-9 h-9 rounded flex items-center justify-center text-base font-bold shrink-0',
          STATUS_CONFIG[status].badgeBg,
          STATUS_CONFIG[status].text
        ]"
      >
        {{ ICONS[status] }}
      </div>
    </div>
    <!-- Bagian bawah selalu dirender (tinggi kartu stabil, anti-jump) -->
    <div class="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between min-h-[1.25rem]">
      <span class="text-xs text-gray-400">Total qty</span>
      <span :class="['font-mono font-bold text-xs', STATUS_CONFIG[status].text]">
        {{ totalDelta !== undefined ? animatedTotalDelta.toLocaleString('id-ID') + ' pcs' : '—' }}
      </span>
    </div>
    <div class="mt-1 min-h-[1rem]">
      <p class="text-xs text-gray-400">
        Terakhir: <span class="font-mono">{{ formatTime(lastProcessed) }}</span>
      </p>
    </div>
  </div>
</template>
